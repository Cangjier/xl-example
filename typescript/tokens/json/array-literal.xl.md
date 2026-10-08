# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../../core/syntax/close-rule.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, GetSkipPrevious } from "../../../core/extensions/list-extension.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Identifier } from "../identifier.xl.md"
import { Method } from "../method.xl.md"
import { NullConditionalOperator } from "../null-conditional-operator.xl.md"
import { String } from "../string/string.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
import { LineWrap } from "../line-wrap.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

Json 数组：把 `[...]` 这种字面量从「一个方括号 + 里面的内容」重组成单个 `ArrayLiteral` 单元。

`JsonArrayCloseRule` 写在 `ArrayLiteral` **之前**（与同目录其它 token 一致）。

# class JsonArrayCloseRule extends CloseRule

它只做两件事：判断 `[` 是不是「Json 数组的开头」，是就把它连同内容收成一个 `ArrayLiteral`。

## static readonly field Instance:JsonArrayCloseRule = new JsonArrayCloseRule()

唯一的实例，注册进通用规则队列时用。

## method IsArrayAt:(units:Array<Token>, index:int)=>bool

`index` 处的 `[` 是不是一个 Json 数组的开头。

它与单参数版同名，所以多参数的这个叫 `IsArrayAt`（单参数版仍叫 `IsArray`）。

判定链条（任一条命中就**不是**数组）：父单元是 `NullConditionalOperator` 且 `index == 0`（那是 `?.[` 空条件索引）；上一个跳过软换行的单元是 `Identifier` 且不属于 `return` / `typeof` / `of` / `in`；是 `Bracket`；是 `ArrayLiteral`；是 `String`；是 `Method`；是 `PropertyAccess`；是 `=>` 符号。

**`PropertyAccess` 必须也在名单里**（成员访问链那一轮补）：`logicalOperator.Data[0]` 里那个 `[`
前面本来是 `Identifier`（`Data`） 判成元素访问；链在 token 层折成一个 `PropertyAccess`
之后「前一个单元」换了一种类型，第一条就命不中了——
`[0]` 于是被收成 `ArrayLiteral`（下标访问变成数组字面量）。
它按**类名**判而不是 `instanceof`：与 `binary-operator.xl.md` 里那几处同款
（`constructor.name` 就是 XML 标签名，判它等价于判类型，且不必为一个判据多一条 import）。

```ts
const current = Get(units, index);
if (current instanceof Bracket && current.startBracket === "[") {
  const parent = current.Parent;
  if (parent instanceof NullConditionalOperator && index === 0) {
    return false;
  }
  const previous = GetSkipPrevious(units, index, (item) => item instanceof LineWrap);
  // **声明词后面那个 `[` 是解构模式，不是下标访问**（第 533 轮）：
  // `const [a = 1, b = a] = …` 的方括号要照旧收成 `ArrayLiteral` ——
  // 投影侧的 `projectLetFrom` 正是拿它当绑定模式用的
  //（`print-ast-common.xl.md` 那一段注释写着「解构声明的名字用产物自己的那个
  // `ArrayLiteral` / `ObjectLiteral`」，`projectBindingPattern` 会把 kind 换成
  // `ArrayBindingPattern`）。
  //
  // 判据与下面那一句**同源**：那一句说的是「上一个实义单元是 `Identifier` 且**不属于**
  // `return` / `typeof` / `of` / `in` ⇒ 这是下标访问」 —— 这里把**声明词**也加进豁免名单。
  // 豁免名单里的词都不是操作数（`return [1]` / `typeof [1]` / `const [a]` 里那个 `[`
  // 只能是别的东西），所以没有副作用。
  const declarationWords = ["let", "const", "var", "using"];
  if (
    previous instanceof Identifier &&
    previous.IsAny(["return", "typeof", "of", "in"]) === false &&
    previous.IsAny(declarationWords) === false
  ) {
    return false;
  } else if (previous instanceof Bracket) {
    return false;
  } else if (previous instanceof ArrayLiteral) {
    return false;
  } else if (previous instanceof String) {
    return false;
  } else if (previous instanceof Method) {
    return false;
  } else if (previous !== null && previous.constructor.name === "New") {
    // **`new C()["m"]` 里那个 `[` 是下标**（第 191 轮）：`New` 已经是一个**操作数**，
    // 判据与 `Method` / `PropertyAccess` 那两条**同源**。
    // **漏了它症状很隐蔽**：`new C()["m"]()` 里那个 `["m"]` 被收成 `ArrayLiteral`，
    // 链（`PropertyAccess`）于是**没有起点** —— 运行期报
    // `unimplemented: calling a non-closure value`（**整份文件进不来**，实测）。
    // 而 `new C().m()` 与 `(new C() as any)["m"]()` 都是好的 ——
    // 差别只在「**裸 new 表达式当接收者**」这一格。
    return false;
  } else if (previous !== null && previous.constructor.name === "PropertyAccess") {
    return false;
  } else if (previous !== null && previous.constructor.name === "ObjectLiteral") {
    // **对象字面量后面的 `[` 是**下标访问**（第 125 轮）：`{ typeof: 1 }[k]` 里那个
    // `[k]` 原来是 `ArrayLiteral`——TS 那边整段是 `ElementAccessExpression`
    // （`expression` 是对象字面量、`argumentExpression` 是 `k`）。
    // 判据与 `PropertyAccess` 那一条同源：`[` 前面已经是一个**操作数**时，它只能是下标。
    return false;
  } else if (
    previous !== null &&
    previous.constructor.name === "Keyword" &&
    ["this", "super"].includes((previous as any).Value)
  ) {
    // `this[0]` / `super[0]`：`this` / `super` 是 `Keyword`，同样只能是下标访问。
    return false;
  } else if (previous instanceof SymbolToken) {
    if (previous.Is("=>")) {
      return false;
    }
  }
  return true;
}
return false;
```

## method IsArray:(unit:Token | null)=>bool

某个单元本身是不是 `ArrayLiteral`；不是的话，回头看它所在的列表中它所在的位置是不是一个数组开头。

类型判定用 `instanceof`，`Data.IndexOf` 落成 `indexOf`（找不到同样是 `-1`）。

```ts
if (unit === null) {
  return false;
}
if (unit instanceof ArrayLiteral) {
  return true;
}
if (unit.Parent === null) {
  return false;
}
return this.IsArrayAt(unit.Parent.Data, unit.Parent.Data.indexOf(unit));
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是本次重组的起点——直接问 `IsArrayAt`。

```ts
return this.IsArrayAt(units, index);
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把 `index` 处的 `[` 连同内容收成一个 `ArrayLiteral`，**返回新的下标**。

它不推进下标，直接原样返回入参。

`Parent` 在造出单元之后单独赋值。

**拿不到父单元时早退**（`current.Parent === null`，第 67 轮补）：与
`object-literal.xl.md` 里 `JsonObjectCloseRule.Process` 那一条**同一个形状、同一个理由**——
`Replace` 要求「自己还在父单元的子单元里」，没有父单元就抛「没有父单元」，
**整份文件解析失败**。这条路只在「重组改短了列表、而下标还是旧扫描留下的」时才走到
（那个 `[` 已经被别的规则挪成了孤儿），属于输入本来就很怪的兜底：**先保住内容再让步**，
产物里那个 `[]` 仍然是一个 `Bracket`、里面的东西一个不少，只是少一层 `ArrayLiteral` 标签。

**为什么这一条是第 67 轮才补上的**：同一族的守卫第 52 轮只加到了**对象**那一支，
数组这一支漏了——而触发它需要的形状更刁：三片段组合探针抓到的
`{` 换行 `x => x` 换行 `[1, 2, 3]` 换行 `a += 1` 换行 `}`（块里的箭头体续上数组字面量，
再跟一条复合赋值）当场抛「没有父单元」。两两拼接的 `fuzz.mjs` 抓不到它。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("ArrayLiteral.CloseRule.Process: current is null");
}
if (current.Parent === null) {
  return index;
}
const result = new ArrayLiteral(template);
result.Parent = current.Parent;
result.SignIn(current.SourceRange.Start!);
result.SignOut(current.SourceRange.End!);
// `Context` 必须**在 `TryToClose()` 之前**抄过来：本单元自己那一趟重组
// 就发生在 `TryToClose` 里面，而 `BinaryOperatorCloseRule` 要靠这个字段判断
// 「这个 `[` 是映射类型还是元素访问」。原来不抄，映射类型 `{ [K in T]: V }` 的
// `in` 会被折成 `<BinaryOperator op="in">`（全语料 9 处误折）。
if (current instanceof Bracket) {
  result.Context = current.Context;
}
current.MoveDataTo(result);
result.TryToClose();
current.Replace(result);
return index;
```

# class ArrayLiteral extends IndependentToken

Json 数组。

它**没有**覆写 `ToXmlString`，XML 由基类 `Token.ToXmlString` 产出：`<ArrayLiteral>子单元的 XML 串接</ArrayLiteral>`（标签名即运行时类名）。

## method PrintAst:(ctx:any, v:any)=>any

值位数组字面量 `[a, b, ...c]` → `ArrayLiteralExpression`（元素走**表达式位**投影）。

**从 `ts-ast.xl.md` 的 `projectArrayLiteral` 整体搬来**（第 181 轮的第一步搬迁）：
判据、注释、形状一字未改，只把跨模块的东西换成 `ctx` 上那几个出口
（`Kids` / `Expression` / `StartOf` / `EndOf` / `Node`）——那一层不能 import `ts-ast`，
否则 token → ts-ast → token 成环。搬完 `ts-ast.xl.md` 里对应的 `case` 与 `projectArrayLiteral`
一起删掉，产物逐字节不变（`cases:tsast` 全量对拍仍然是逐文件完全一致）。

要点（原文照录）：

- **一律走 `ctx.Expression`**（第 125 轮）：`group.length === 1` 时走 `Project` 会把元素位的
  **括号**投成一个未映射的 `<Bracket>`——`[(x), y]` 缺 `ParenthesizedExpression` + 多出 `Bracket`；
- **数组里的洞是零宽 `OmittedExpression`**（第 176 轮）：位置是**第一个逗号之后那一格**；
- **尾随逗号不是洞**（`[1, 2,]` 只有两个元素）：末组为空时什么都不补。

```ts
  const elements: Array<any> = [];
  let group: Array<any> = [];
  const list = ctx.Kids(v);
  let lastEnd = ctx.StartOf(v) + 1;
  const flush = (separator: any) => {
    if (group.length === 0) {
      elements.push({ kind: "OmittedExpression", pos: lastEnd + 1, end: lastEnd + 1 });
    } else {
      const one = ctx.Expression(group);
      if (one !== undefined) {
        elements.push(one);
      }
      lastEnd = ctx.EndOf(group[group.length - 1]);
    }
    group = [];
  };
  for (const item of list) {
    if (item.get("type") === "SymbolToken" && ctx.TextOf(item) === ",") {
      flush(item);
      continue;
    }
    group.push(item);
  }
  if (group.length > 0) {
    flush(undefined);
  }
  const props = elements.length === 0 ? {} : { elements };
  return ctx.NodeHead("ArrayLiteralExpression", props, v);
```

## field Context:string = ""

本单元是从哪个 `[` 括号收来的、那个括号当时处在**类型位**还是**值位**
（`"type"` / `"value"` / `""`）——直接抄自 `Bracket.Context`（见 `../bracket.xl.md`）。

**为什么 ArrayLiteral 也要带这个字段**：映射类型 `{ [K in keyof T]: T[K] }` 的那个 `[`
会在 `JsonArrayCloseRule` 里被换成 `ArrayLiteral`，于是**括号单元本身没了**。
`BinaryOperatorCloseRule` 的守卫要判断「这个 `[` 是映射类型还是元素访问」，
没有这个字段就只能退回「父单元是不是 `[` 括号」，而那条判据挡不住已经变成 `ArrayLiteral` 的映射类型
（实测 `type X = { [K in "a" | "b"]: number }` 会误产出一个
`<BinaryOperator op="in">`，全语料 9 处）。

## constructor:(Template:Template)=>void

转调基类构造器，然后从规则模板里取出「本类」对应的一组收尾规则。

`CloseRuleQueue` 从模板里取：键是 `this.constructor`（`SequenceTemplate` 以类的构造器对象为键）。

```ts
super(Template);
this.CloseRuleQueue = Template.CloseRuleTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 搬入全部克隆出来的子单元 → `TryToClose()`；`Add` 收到的是一批子单元，所以这里用 `AddRange`。

```ts
const result = new ArrayLiteral(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
