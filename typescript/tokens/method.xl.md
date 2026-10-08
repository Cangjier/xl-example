# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../core/syntax/close-rule.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Identifier } from "./identifier.xl.md"
import { GenericType } from "./generic-type.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
import { SkipPreviousWrapSymbol } from "../text-common-util.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

方法调用单元：由重组把「方法名 + `(...)` 括号单元」合成一个 `Method`，括号里的内容原样搬进来当自己的子单元。它的 XML 是 `<Method name="名字">…</Method>`。

方法名 + 括号能合并，靠的是 `MethodCloseRule`：它只在「前一个单元是个能当方法名的 `Identifier`」且「当前单元是 `(` 开头的 `Bracket`」时成立。

**泛型方法（`func f<T>(x: T)`）**：方法名和 `(` 之间会多出一个 `GenericType`（`<T>`）。判定与执行都靠 `NameIndex` —— 它在跳软换行之外**再跳一个** `GenericType` 去找名字，所以「名字 + 可选泛型实参段 + `(`」仍然合成一个 `Method`；那段泛型实参会被搬进 `Method` 的 `Data`（**必须搬**，否则 `<T>` 的字符会从 XML 里消失）。不涉及泛型时 `NameIndex` 就等于 `SkipPreviousWrapSymbol`，`Process` 里那个循环一次都不转。

`MethodCloseRule` 写在 `Method` 之前。

# class MethodCloseRule extends CloseRule

它永远不进 `Data`、不进 XML。

## static readonly field Instance:MethodCloseRule = new MethodCloseRule()

唯一的实例。

## private method NameIndex:(units:Array<Token>, index:int)=>int

找 `index` 处那个括号对应的方法名下标：先跳过软换行，若落在一个 `GenericType`（泛型实参段）上就再跳一次。

`Previous` 与 `Process` 共用它，两边的「名字在哪」必须一致——`Previous` 认下之后，`Process` 要按同一个下标去取名字、也要按同一个下标去替换。

```ts
const previousIndex = SkipPreviousWrapSymbol(units, index);
if (Get(units, previousIndex) instanceof GenericType) {
  return SkipPreviousWrapSymbol(units, previousIndex);
}
return previousIndex;
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是「方法名 + `(`」这个形状。

判定是一整句合取：前一单元是合法方法名的 `Identifier`、当前单元是 `(` 开头的 `Bracket`。`Get` 与 `GetSkipPreviousWrapSymbol` 都写成模块级函数。

注意判定顺序：**先看前一个单元是不是合法方法名，再看当前单元是不是括号**——`template.MethodNameTemplate` 会挡掉 `if` / `for` 这类关键字，避免把控制流误判成方法。名字的取法换成了 `NameIndex`（多跳一个 `GenericType`），判定顺序不变。

```ts
const nameIndex = this.NameIndex(units, index);
const nameUnit = Get(units, nameIndex);
const current = Get(units, index);
if (current instanceof Bracket === false || current.startBracket !== "(") {
  return false;
}
if (current.Parent instanceof GenericType) {
  return false;
}
// **方法声明里残留的「名字 + 括号」不许再收一次**（第 66 轮补）：
// `MethodDeclarationCloseRule` 会把参数表括号与（私有名的）名字留在自己的 `Data` 里，
// 而它挂的是通用队列——本规则那一趟于是把 `#m()` 里的 `m()` 又收成一个调用节点，
// 产物变成 `<MethodDeclaration name="#m"><SymbolToken>#</SymbolToken><Method name="m"/>…`，
// TS 那边一个 `CallExpression` 都没有（`cases:align` 实测 12 处，全是私有方法 / 计算名方法）。
// 调用**不会**直接住在声明节点里：它要么在方法体（父单元是语句），要么在形参默认值（父单元是括号）。
if (current.Parent !== null && current.Parent.constructor.name === "MethodDeclaration") {
  return false;
}
if (nameUnit instanceof Bracket && nameUnit.startBracket === "(") {
  const beforeIndex = SkipPreviousWrapSymbol(units, nameIndex);
  const before = Get(units, beforeIndex);
  if (before instanceof Identifier && before.IsAny(["if", "for", "foreach", "while", "switch", "catch", "function", "with"])) {
    // **`.` 后面那个关键字是成员名，不是控制结构**（第 189 轮修）：
    // `p.catch(cb)` / `p.finally(cb)`——`catch` / `finally` 这些字**既是关键字、
    // 又是合法的属性名**。这一条原来只看「前一个单元是不是那几个字」，
    // 于是在成员位上**把调用挡掉了**：`Promise.resolve(1).catch(cb).then(cb2)` 的
    // 产物里那一整个 `.catch(cb).then(cb2)` **整段消失**（实测：语句只剩
    // `Promise.resolve(1).catch` 一个 `PropertyAccessExpression`），
    // 运行期于是**一句话都不跑、也不报错**（第 187 / 188 轮量到的两条链式形状）。
    // **判据补一格就够**：关键字前面是 `.`（或 `?.`）时**放行**。
    const dotIndex = SkipPreviousWrapSymbol(units, beforeIndex);
    const dot = Get(units, dotIndex);
    let isMemberName = false;
    if (dot instanceof SymbolToken) {
      const dotText = dot.TempToString();
      isMemberName = dotText === "." || dotText === "?.";
    }
    if (!isMemberName) {
      return false;
    }
  }
  return true;
}
// **前一单元已经是一次调用**（第 134 轮补）：`f()()`——**调用结果照样可以被调用**。
//
// **为什么原来漏了**：这一条只认「前一单元是 `Identifier`」与「前一单元是 `(` 括号」，
// 而 `f()` 收成 `Method` 之后**两者都不是**——于是第二个 `(` 谁也不认，
// 投影里**少了一整个调用**（实测：`console.log(f()())` 只投出一个 `f()`，
// 而 `const a = f()();` 却是对的——那条路走的是另一个收尾规则，
// 所以这个缺口只在**实参位**露出来，`cases:tsast` 的语料里恰好没有这个形状）。
// **带括号的 `(f())()` 一直是对的**（前一单元是括号）——差别只在括号在不在。
if (nameUnit instanceof Method) {
  return true;
}
// **`.` 后面的名字永远是成员名**（第 189 轮）：`p.catch(cb)` / `p.finally(cb)`——
// `catch` / `finally` / `with` / `function` 这些字**既是关键字、又是合法属性名**，
// 而 `MethodNameTemplate.IsMethodName` 那一张表是给**语句位**准备的
// （它要挡的是 `if (x)` / `catch (e)` 这类控制结构）——**成员位不该受它管**。
//
// **漏了这一格的症状很远**：`Promise.resolve(1).catch(cb).then(cb2)` 里
// `catch` 后面的那对括号**谁也不认**（`Previous` 不成立 → 不收成 `Method`）→
// 属性访问链在 `.catch` 处**收尾** → 投影出来的语句只剩 `Promise.resolve(1).catch`
// 一个 `PropertyAccessExpression`，**整个 `.catch(cb).then(cb2)` 消失**
// （实测），运行期于是**一句话都不跑、也不报错**（第 187 / 188 轮量到的两条链式形状）。
if (nameUnit instanceof Identifier) {
  const dotIndex = SkipPreviousWrapSymbol(units, nameIndex);
  const dot = Get(units, dotIndex);
  if (dot instanceof SymbolToken) {
    const dotText = dot.TempToString();
    if (dotText === "." || dotText === "?.") {
      return true;
    }
  }
}
return nameUnit instanceof Identifier && template.MethodNameTemplate.IsMethodName(nameUnit.TempToString());
```

**类型实参段里没有调用**：父单元是 `GenericType` 时一律不成立。
类型参数列表里到处都是「名字 + 括号」——`<T extends (a: any) => any>` 里的 `extends(a: any)`
会被当成一次调用收成 `Method`，接着把类型的尾巴（`=> any`）搅散，
**整条声明跟着塌**（`lib.es5.d.ts` 的 `Parameters` / `ReturnType`、`lib.decorators.d.ts` 的
`…DecoratorContext`、`typescript.d.ts` 的 `visitNodes` 全是这个形状，实测 23 处）。

**括号作被调用者**（`(function () { … })()` / `(() => 1)()` / `f(a)(b)`）：
前一单元是 `(` 开头的括号时也算——**括号表达式的结果可以被调用**
（括号单元记的是**起始**字符，所以判的是 `startBracket === "("`，不是 `)`）。
`name` 留空（没有名字），被调用者那个括号作为子单元留在 `Method` 里。

但**控制结构的头要挡掉**：`if (x) (y)` 里第二个括号前面也是 `)` 括号，
那对括号是 `if` 的条件表，不是被调用者。判据是「再往前一个实义单元是不是控制流关键字」
（`if` / `for` / `while` / `switch` / `catch` / `function` / `with`）。
本规则排在 `IfSet` / `For` / `While` 这些**之前**（它们最后兜底），
不挡的话 `if` 的条件表会被当成一次调用，整条 `if` 跟着塌。

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把「`index` 处的括号单元」和「它前一个方法名单元」（以及夹在中间的泛型实参段）合并成一个 `Method`，**返回新的下标**。

把 `nameIndex` 起的 `index - nameIndex + 1` 个单元替换成一个 `Method`，替换的返回值（其实就是 `nameIndex`）成为新的下标。带 `count` 的那个重载叫 `ReplaceCountAt`。

范围两头直接写 `nameUnit.SourceRange.Start!` 与 `bracketUnit.SourceRange.End!`——`Start` / `End` 本身就是 `Source | null`，**不要再取 `.Value`**。

名字与括号之间的单元（那个 `GenericType`）先按原顺序搬进 `Method`，再搬括号里的实参——顺序即文档顺序，产物里 `<T>` 排在实参之前。没有泛型时这个循环是空的（`nameIndex + 1 === index`）。

```ts
const bracketUnit = Get(units, index)! as Bracket;
const nameIndex = this.NameIndex(units, index);
const nameUnit = Get(units, nameIndex)!;
const method = new Method(nameUnit.Template);
method.SignIn(nameUnit.SourceRange.Start!);
method.SignOut(bracketUnit.SourceRange.End!);
if (nameUnit instanceof Identifier) {
  method.name = nameUnit.TempToString();
}
// **实参表那个 `(` 的位置当场记下**（用户口径：token 出字段、投影直读）：
// 它就是触发本规则的那一格（`bracketUnit`），这一刻就在手上。
method.ParenAt = bracketUnit.SourceRange.Start!.Index;
if (nameUnit instanceof Bracket) {
  method.AddAndCloseLast(nameUnit);
}
// **被调用者本身是一次调用**（`f()()`）：与上面那条括号同一条路——
// 它作为**子单元**留在新的 `Method` 里，投影时成为那个调用节点的 `expression`。
if (nameUnit instanceof Method) {
  method.AddAndCloseLast(nameUnit);
}
for (let i = nameIndex + 1; i < index; i++) {
  method.AddAndCloseLast(Get(units, i)!);
}
for (const item of bracketUnit.Data) {
  method.AddAndCloseLast(item);
}
method.TryToClose();
index = ReplaceCountAt(units, nameIndex, index - nameIndex + 1, method);
return index;
```

# class Method extends IndependentToken

方法调用。

构造器里把 `CloseRuleTemplate` 的规则取出来当自己的 `CloseRuleQueue`；单元值类型是单字符的 `string`。

它由重组造出来、自己不消费字符，因此 `Process` 沿用 `IndependentToken` 的空实现。

## static method CommaOperator:(ctx:any, kid:any)=>bool

**这一格是不是「顶层逗号」**（第 302 轮）：类型是 `BinaryOperator`、且它里面有一枚 `,` 符号。

**为什么要问「里面」而不是问原文**：这个单元的区间是**整段** `1, 2`
（实测 `ctx.TextOf` 给的就是 `"1, 2"`），拿原文比 `","` 永远为假。

```ts
if (kid.get("type") !== "BinaryOperator") return false;
for (const inner of ctx.Kids(kid)) {
  if (inner.get("type") === "SymbolToken" && ctx.TextOf(inner) === ",") return true;
}
return false;
```

## static method ArgumentGroups:(ctx:any, kids:Array<any>)=>Array<Array<any>>

**实参按顶层逗号切组**（第 302 轮）——切在**两种**逗号上：

1. 一个独立的 `SymbolToken(",")`（绝大多数形状，与 `ctx.Split(kids, ",")` 一致）；
2. **一个「逗号算子单元」**——即 `BinaryOperator` 类型、里面那枚符号是 `,`。

**为什么第 2 种非有不可**：逗号什么时候已经被折成**算子单元** 取决于**队列时序**——
`h(1, 2)` 里那对括号被 `MethodCloseRule` 收走时 逗号还是**独立的符号**；
而 `(h)(1, 2)` / `arr[0](1, 2)` / `((a, b) => a + b)(1, 2)` 这些**括号或成员链当被调用者**的形状，
`Previous` 要等**前一个括号先闭合**才成立 ⇒ 那对实参括号里的逗号**先被折成了算子**。

**症状**（判据 `rt-iife-forms` / `ex-arrow-immediately-invoked-typed`）：
`((a, b) => a + b)(1, 2)` 投出来的 `arguments` **只有一格**
（那一格是 `BinaryExpression(left:1, right:2)` 带着 `CommaToken`），
降级层于是只铺**一个**实参 ⇒ 形参 `a` 拿到**最后一个**实参、`b` 是 `undefined` ⇒ `NaN`
——**一句异常都没有**。

**那个算子单元要「摊开」而不是「当成一个分隔符」**（第一版就是后者）：
它的区间是**整段** `1, 2`，按分隔符切只会切出两个**空组**
（实测 `groups` 给 `[[], []]`、`arguments` 给 `[]`——**比原来还少**）。
所以要把它**换成它的子单元**（摊开）之后再切，而且**要摊到没有为止**
（`1, 2, 3` 可能一层层折）。

**为什么这一刀是安全的**：实参表里的**顶层**逗号**永远**是分隔符——
真正的逗号运算符必须先有自己的括号（`f((1, 2))` 给**一个**实参 `2`，
而那一格是**嵌套的括号单元**，摊不到这里）。

```ts
let pending: any[] = [];
for (const kid of kids) pending.push(kid);
while (true) {
  let expanded = false;
  const next: any[] = [];
  for (const kid of pending) {
    if (Method.CommaOperator(ctx, kid)) {
      for (const inner of ctx.Kids(kid)) next.push(inner);
      expanded = true;
      continue;
    }
    next.push(kid);
  }
  pending = next;
  if (!expanded) break;
}
const groups: any[] = [];
let current: any[] = [];
for (const kid of pending) {
  if (kid.get("type") === "SymbolToken" && ctx.TextOf(kid) === ",") {
    groups.push(current);
    current = [];
    continue;
  }
  current.push(kid);
}
groups.push(current);
return groups.filter((group) => group.length > 0);
```
## method PrintAst:(ctx:any, v:any)=>any

调用 `f(a)` → `CallExpression`（`expression` + `arguments` + 可选 `typeArguments`；
**从 `ts-ast.xl.md` 的 `projectCall` 整块搬来**，第 193 轮）。

六处要点（都是实测修出来的）：

1. **IIFE `(function () { … })()`**（第 141 轮）：产物把整个 IIFE 收成一个 `Method(name="")`，
   里面那**一对括号是「被调用者」的**，而调用自己的 `()` 根本不在树里（要**从被调用者那对
   括号之后再配对一次**才对得上终点）。原来投出一个**零宽的 `Identifier("")`**，整条调用链跟着塌；
2. **名字为空时第一个子单元就是被调用者**（第 179 轮）：`b!()` 的产物只有那个 `NotNull`；
3. **实参自己可能就是一个括号表达式**（第 163 轮）：`f(a, ([x]))`——只滤「落在被调用者范围内、
   或是空括号」的那一个，别把所有 `Bracket` 都滤掉；
4. **被调用者本身带着可选链**（第 107 轮）：`x?.y?.(1)` 里 `?.y` / `?.(1)` 两格都在 `Method` 里面，
   顺着接上去（`ctx.ChainWithOptional`）；
5. **动态 `import("m")` 的被调用者是 `ImportKeyword`**（第 142 轮）；
6. **实参要按顶层逗号切组、每组折成一个表达式**（第 113 轮）：一格的实参在产物里可能是好几个
   平级单元；**调用上的类型实参**（第 95 轮）走类型位投；**被调用者后面还跟着一对空括号**
   （第 168 轮）是「对调用结果再调一次」，外面再套一层 `CallExpression`。

```ts
  const kids = ctx.Kids(v);
  const rawName = v.attrs.get("name");
  const calleeText = typeof rawName === "string" ? rawName : "";
  const calleeEnd = v.start + calleeText.length;
  // **可选链子单元要在最前面数出来**：下面「名字为空」那两条支路（IIFE / 链）
  // 在「名字为空 + 第一个子单元是括号」上长得一模一样，唯一的区别就是这一格。
  const ncos = kids.filter((k: any) => k.get("type") === "NullConditionalOperator");
  if (calleeText === "") {
    // **被调用者本身是一次调用**（`f()()`，第 134 轮）：产物把外面那次调用收成
    // `Method(name="")`，而**里面那次调用是它的第一个子单元**——与 IIFE 那条
    // （子单元是一对括号）是同一个形状，只是「被调用者」换成了另一个 `Method`。
    // **外层那对括号不在树里**（与 IIFE 一字不差）：终点要**从被调用者之后重新配对**，
    // 否则 `f()()` 的区间只到 `f()` 为止（实测：投出来的外层调用终点短一截）。
    const innerCall = kids.find((k: any) => k.get("type") === "Method");
    // **有 NCO 子单元时这一支也要让开**（第 630 轮）：`f()?.m?.()` 的第一个子单元
    // 正是内层那次调用（`Method(name="f")`），可它不是「对调用结果再调一次」——
    // 整条 `?.m?.()` 才是这次调用的内容。让开之后落到下面那条链的支路，
    // 由 `beforeNco`（那一格 Method）投出被调用者，再逐格接 `?.m` / `?.(…)`。
    if (ncos.length === 0 && innerCall !== undefined) {
      const rest = kids.filter(
        (k: any) => k !== innerCall && k.get("type") !== "GenericType",
      );
      let end = ctx.StmtEndOf(v);
      let at = ctx.EndOf(innerCall);
      while (at < ctx.source.length && /\s/.test(ctx.source[at])) at++;
      if (ctx.source[at] === "(") {
        const argsClose = ctx.MatchingParen(ctx.source, at);
        if (argsClose >= 0) end = Math.max(end, argsClose + 1);
      }
      return {
        kind: "CallExpression",
        expression: ctx.Expression([innerCall]),
        arguments: Method.ArgumentGroups(ctx, rest)
      .map((group: any) => (group.length === 0 ? undefined : ctx.Expression(group)))
      .filter((a: any) => a !== undefined),
        pos: v.start,
        end,
      };
    }
    const brace = kids.find(
      (k: any) => k.get("type") === "Bracket" && k.get("startBracket") === "(",
    );
    // **有 NCO 子单元就不是 IIFE**（第 630 轮）：`(x as T)?.m?.()` / `f()?.m?.()` /
    // `(a.b)?.c?.()` 的被调用者也是「名字为空 + 第一个子单元是括号」，但从
    // `OptionalCallCloseRule` 出来时**整条链都塞在 `Method` 里**
    // （`[被调用者, NCO(?.m), NCO(?.(…))]`）。原先这一支抢在下面那条链的支路前面，
    // 于是把两个 NCO **当成实参**、投出一个 `(x as T)(?.m, ?.())`（实测：缺
    // `PropertyAccessExpression` + 两个 `QuestionDotToken`，多出 `NullConditionalOperator`）。
    // IIFE（`(function () {})()`）的产物里只有那一对括号**一个**子单元，撞不到这里。
    if (ncos.length === 0 && brace !== undefined && ctx.Kids(brace).length > 0) {
      const rest = kids.filter((k: any) => k !== brace && k.get("type") !== "GenericType");
      let end = ctx.StmtEndOf(v);
      const calleeClose = ctx.MatchingParen(ctx.source, ctx.StartOf(brace));
      if (calleeClose >= 0) {
        let at = calleeClose + 1;
        while (at < ctx.source.length && /\s/.test(ctx.source[at])) at++;
        if (ctx.source[at] === "(") {
          const argsClose = ctx.MatchingParen(ctx.source, at);
          if (argsClose >= 0) end = Math.max(end, argsClose + 1);
        }
      }
      return {
        kind: "CallExpression",
        expression: ctx.ParenthesizedOf(brace),
        arguments: Method.ArgumentGroups(ctx, rest)
          .map((group: any) => (group.length === 0 ? undefined : ctx.Expression(group)))
          .filter((a: any) => a !== undefined),
        pos: v.start,
        end,
      };
    }
  }
  const anonymousCallee =
    calleeText === "" ? kids.find((k: any) => k.get("type") === "NotNull") : undefined;
  // **空括号只有「被调用者自己那一对」才要滤掉**（第 179 轮修）：
  // 原来凡空括号一律滤，于是 **`f(xs[0]())` 里那个 `()` 被当成空实参表丢掉**——
  // 实参于是只剩一个 `xs[0]`，投影出来是 `CallExpression(console.log, [ElementAccess])`，
  // **内层那次调用整个不见了**（Node 给 `1`、本仓给**函数本身**——**静默错值**）。
  //
  // **零实参的调用本身不贡献括号**（实测：`f()` / `o.m()` 的产物是
  // `<Method name="f"></Method>`，**一个子单元都没有**）——所以一个 `(` 括号出现在
  // `kids` 里，只可能是**实参自己那一段里的调用**（`xs[0]()` 的 `()`），
  // 或者是**被调用者自己那一对**（IIFE / `f()()` 那些形状——它们在**上面两条分支**里
  // 就已经返回了，走到这里的是「名字非空 / 没找到 IIFE 括号」的那些）。
  // **后者永远在第一位**（`(function () {})()` 的括号是 `kids[0]`），
  // 所以判据是「**空括号且不是第一个子单元** ⇒ 它是实参那一段的」。
  //
  // **还有一格：`b!()`**（第 179 轮实测，判据当场抓住）——它的产物是
  // `<Method name="">[NotNull(b, !), Bracket(空)]</Method>`：
  // 被调用者是那个 `NotNull`（`anonymousCallee`），**那一对空括号是这次调用自己的实参表**
  // ——按「不是第一格」放过去会凭空多出一个 `ParenthesizedExpression(空)` 实参
  //（实测 `expr-nonnull-callee.ts` / `expr-optional-call-nodes.ts` 各一处）。
  // 所以「被调用者是 `NotNull`」这一支里，空括号照旧滤掉。
  // **「第一个 `GenericType` 就是类型实参」这条要加一道判据**（第 379 轮）。
  //
  // 真泛型调用里那个 `<T>` 坐在**被调用者与 `(` 之间**（第 95 轮那条口径，
  // 与第 23 / 160 行那两句一致）。可**实参自己**也可能是尖括号断言 `<T>x`——
  // token 层同样把它收成一个 `GenericType`（表达式开头那个 `<` 本来就在
  // `IsTypePosition` 的白名单里，见 `print-ast-common.xl.md` 第 1833 行那一段）。
  // 两者在产物里**长得一模一样**，位置才是判据：
  // `calleeEnd` 与 `StartOf(generic)` 之间**有没有 `(`**——
  // 有 ⇒ 这个 `<T>` 已经在**实参表里面**了（它是第一个实参的开头）；
  // 没有 ⇒ 它是调用自己的类型实参段。
  //
  // **少了这一条会怎样**：`console.log(<number>a + <number>b)` 里**第一个** `<number>`
  // 被当成调用的类型实参、从实参里**滤掉**（下面那个 `filter`）——
  // 于是投影出来的是 `CallExpression{ typeArguments: [number], arguments: [a + <number>b] }`，
  // 而剩下那个 `<number>` 已经没机会成形了 ⇒ 它被读成**两个比较** `(a < number) > b`
  //（判据 `c371-ex-type-assertions-in-operands`：Node 给 `3`、本仓降级期就报
  //  `name is not a local or a capture: number`）。
  const generic = kids.find((k: any) => k.get("type") === "GenericType");
  // **实参表那个 `(` 的位置读字段**（`ParenAt`，`MethodCloseRule` 认下这次调用时当场记的）：
  // 原来这句是 `ctx.source.indexOf("(", calleeEnd)` **回原文里找**——`o.m /* ( */ ()`
  // 会先命中注释里那个假括号，于是判据把类型实参段与实参里的尖括号断言认反。
  const parenAfterCallee = this.ParenAt;
  const typeArgumentGeneric =
    generic !== undefined && parenAfterCallee >= 0 && ctx.StartOf(generic) < parenAfterCallee
      ? generic
      : undefined;
  const args = kids.filter(
    (k: any) =>
      k !== anonymousCallee &&
      k !== typeArgumentGeneric &&
      (k.get("type") !== "Bracket" ||
        (ctx.StartOf(k) >= calleeEnd && (ctx.Kids(k).length > 0 || (kids[0] !== k && anonymousCallee === undefined)))),
  );
  // **这一支只认「被调用者自己带着可选链」那一形状**（第 147 轮修）：
  // 判据是**第一个子单元就是被调用者自己**——`x?.y?.(1)` 的 `Identifier(x)` 与
  // `name="x"` 同名，`f(g?.(1))` 里内层那个 `Method(name="g")` 也一样
  //（两处的产物形状都在判据里钉着）。
  //
  // **`f(o?.a)` 不同名**：它的第一个子单元是**实参** `o`，而 `name` 是 `f`。
  // 原来这里不看这一格，于是把**实参那条链**当成整条调用的投影返回——
  // `f(o?.a)` 投出来只剩一个 `o?.a`，`CallExpression` **整格没了**
  //（`cases:tsast` 就是这么报的：缺 `CallExpression` + `Identifier(f)` 漂移，
  //  而 XML 产物一直是对的——只有投影这一层断了）。
  //
  // 让开之后它落到下面那条路：实参按顶层逗号切组 →
  // `projectExpression([o, NCO(a)])` → `print-ast-common.xl.md` 的 **0a0** 支
  // 把基名接回链上（第 143 轮写的正是它，只是被这一支抢在前面了）。
  const calleeKid = kids.length > 0 ? kids[0] : undefined;
  const calleeComesFirst =
    calleeText === "" ||
    (calleeKid !== undefined && ctx.TextOf(calleeKid) === calleeText);
  if (ncos.length > 0 && calleeComesFirst) {
    const firstNco = kids.findIndex((k: any) => k.get("type") === "NullConditionalOperator");
    const beforeNco = firstNco > 0 ? kids.slice(0, firstNco) : [];
    let node =
      beforeNco.length === 0
        ? {
            kind: ctx.LeafKind(calleeText),
            text: calleeText,
            pos: v.start,
            end: v.start + calleeText.length,
          }
        : ctx.Expression(beforeNco);
    for (const nco of ncos) node = ctx.ChainWithOptional(node, nco);
    if (node !== undefined) return node;
  }
  const props: any = {
    expression:
      calleeText === "import"
        ? { kind: "ImportKeyword", text: "import", pos: v.start, end: v.start + "import".length }
        : anonymousCallee !== undefined
          ? ctx.Project(anonymousCallee)
          : { kind: ctx.LeafKind(calleeText), text: calleeText, pos: v.start, end: calleeEnd },
    arguments: Method.ArgumentGroups(ctx, args)
      .map((group: any) => (group.length === 0 ? undefined : ctx.Expression(group)))
      .filter((a: any) => a !== undefined),
    pos: v.start,
    end: ctx.StmtEndOf(v),
  };
  if (typeArgumentGeneric !== undefined) {
    const typeArguments = [];
    for (const group of ctx.Split(ctx.Kids(typeArgumentGeneric), ",")) {
      const one = ctx.TypeExpression(group);
      if (one !== undefined) typeArguments.push(one);
    }
    if (typeArguments.length > 0) props.typeArguments = typeArguments;
  }
  const trailingCall = kids.find(
    (k: any) =>
      k.get("type") === "Bracket" &&
      k.get("startBracket") === "(" &&
      ctx.StartOf(k) >= calleeEnd &&
      ctx.Kids(k).length === 0,
  );
  const callNode = { kind: "CallExpression", ...props };
  if (trailingCall !== undefined && callNode.end < ctx.EndOf(trailingCall)) {
    return {
      kind: "CallExpression",
      expression: callNode,
      arguments: [],
      pos: callNode.pos,
      end: ctx.EndOf(trailingCall),
    };
  }
  return callNode;
```

## field name:string = ""

方法名。

## field ParenAt:int = -1

**实参表那个 `(` 的下标**。

**为什么要有这一格**：投影判「第一个 `GenericType` 是类型实参段还是实参里的尖括号断言」时，
要看**实参表那个 `(` 与 `GenericType` 的先后**（见下面 `PrintAst`）。原来用
`ctx.source.indexOf("(", calleeEnd)` **回原文里找**——那是**第二份位置答案**：
`o.m /* ( */ ()` 会命中注释里那个假括号。而触发本规则的那一刻（`Process`）
那对括号就是 `bracketUnit`，当场记下来即可，投影只读这一格。

## constructor:(template:Template)=>void

以模板创建，并把本类型的规则队列取出来。

取运行时类型用 `this.constructor`。

```ts
super(template);
this.CloseRuleQueue = template.CloseRuleTemplate.Get(this.constructor);
```

## method ComputeArgumentsCount:()=>int

算参数个数：数子单元里的 `,` 符号，再加一。

空参数表（`Data` 为空）直接给 `0`；否则符号个数加一。注意它数的是**任何位置**的 `,`，包括嵌套括号里的。

```ts
if (this.Data.length === 0) {
  return 0;
}
let count = 0;
for (const item of this.Data) {
  if (item instanceof SymbolToken && item.Is(",")) {
    count++;
  }
}
return count + 1;
```

## method ToXmlString:()=>string

产出 XML：标签名是运行时类型名，**开标签上带 `name` 属性**，内容是子单元的 XML 串接。

标签名取 `this.constructor.name`；子单元的 XML 用数组原生的 `join("")` 串接。

这一处直接决定最终 XML。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} name="${this.name}">${temp.join("")}</${name}>`;
```

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + 方法名 + 实参。

`name` 与 XML 的 `name` 属性同源。名字为空（无名的调用）时**照样写 `name`**——
这里与 XML 一致：`<Method name="">` 与 `"name": ""` 都表示「这个名字是空的」，
而「没有这个键」在 JSON 里是另一种意思。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
result.set("name", this.name);
if (this.Data.length !== 0) {
  const children: Array<any> = [];
  for (const item of this.Data) {
    children.push(item.ToDictionary());
  }
  result.set("children", children);
}
return result;
```

## method Clone:()=>Token

克隆自身。

顺序是：`Sign(this)` → 抄 `name` → 把 `Data` 里每个子单元克隆后整批加入 → `TryToClose()`；批量加入用 `AddRange`。

```ts
const result = new Method(this.Template);
result.Sign(this);
result.name = this.name;
result.ParenAt = this.ParenAt;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
