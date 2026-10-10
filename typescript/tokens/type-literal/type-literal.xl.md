# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../../core/syntax/close-rule.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { SkipNextWrapSymbol, SkipPreviousWrapSymbol, SkipPreviousTrivia, IsArrowReturnTypeBracket, IsSwitchLabelColon, IsTriviaUnit, BraceInExpression, EnclosingBraceToken, IsBindingPatternBrace, IsImportExportTypeClauseBrace } from "../../text-common-util.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Identifier } from "../identifier.xl.md"
import { Keyword } from "../keyword.xl.md"
import { GenericType } from "../generic-type.xl.md"
import { ObjectLiteral } from "../json/object-literal.xl.md"
import { LineAnnotation } from "../line-annotation.xl.md"
import { AreaAnnotation } from "../area-annotation.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
import { TypeLiteralBody } from "./type-literal-body.xl.md"
import { MappedType } from "./mapped-type.xl.md"
import { Statement } from "../statement.xl.md"
import { LineWrap } from "../line-wrap.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

类型字面量：把**类型位**的 `{ … }` 收成一个 `TypeLiteral`（里面是一段 `TypeLiteralBody`）。

**它必须排在 `JsonObjectCloseRule` 之前**：重组是**按规则轮询**的（每条规则扫一遍所有下标），
`ObjectLiteral` 排在前面时会把类型位的 `{ … }` 先收成对象字面量，成员从此只能平铺成 `Identifier` / `SymbolToken`。
类型位的判定没用「看括号前面是不是 `:` / `=`」这一条就完事——那样会把三元表达式的分支
（`cond ? {} : {}` 的第二个括号）也判成类型位，所以 `:` 还要再确认「同一层没有 `?`」。

`TypeLiteralCloseRule` 写在 `TypeLiteral` **之前**。

# class TypeLiteralCloseRule extends CloseRule

## static readonly field Instance:TypeLiteralCloseRule = new TypeLiteralCloseRule()

唯一的实例，注册进通用规则队列时用。

## private method HasTernaryQuestion:(units:Array<Token>, index:int)=>bool

`index` 处的 `:` 是不是**三元表达式的那个冒号**（往前找到第一个符号，是 `?` 就是）。

往前扫时跳过软换行、注释与整段括号（括号单元是原子的，它的内容不参与本层判定）；
遇到第一个**符号**就下结论：是 `?` 就说明这个 `:` 属于三元表达式，否则不是。

`cond ? {} : {}` 的第二个 `{}` 前面正是这种 `:`：不排除的话它会被当成类型字面量，
把对象字面量错收成 `Field` 成员。

**但 `?` 还要再看一眼它前面有没有 `extends`**：有就是**条件类型**
（`typeof globalThis extends { … } ? T` 换行 `: { prototype: …; readonly X: 1; … }`），
它两个分支都是**类型**——那个 `:` 后面正是类型字面量。
少了这一条，条件类型的假分支整段收不成 `TypeLiteral`，
里面几十个成员一起丢（实测 `@types/node/web-globals/domexception.d.ts` 的
`var DOMException: … ? T : { … }` 一处就丢 28 个，crypto / typescript 等文件里同类形状更多）。

```ts
// **不能只看「第一个符号是不是 `?`」**（第 127 轮修）：左嵌套的三元
// `A ? B ? C : D : E` 里，从**外层**那个 `:` 回扫时先撞上的是**内层**的 `:`
// （TypeLiteral 排在 TernaryOperator 之前，那一刻它还只是一个符号），
// 于是判出「不是三元冒号」——后面那个对象字面量被收成 `TypeLiteral`
// （实测 `dist/ts/typescript/ts-ast.ts` 的
// `computed === undefined ? … ? a : b : { kind: … }` 一族）。
//
// 改成**配对计数**：往左数，`:` 加一、`?` 减一；`?` 在计数为 0 时出现 ⇒ 它就是我们这个
// `:` 的另一半（同一个表达式里，左边只要还有一个没配对的 `?`，我们的 `:` 就是配它的）。
// 操作数与普通运算符一律透明；只有 `;` / `,` / `=>` / 赋值符号是硬边界——
// 越过它们就出了这条表达式。
let depth = 0;
for (let i = index - 1; i >= 0; i--) {
  const item = Get(units, i);
  if (item === null) {
    break;
  }
  if (item instanceof LineWrap || item instanceof Bracket) {
    continue;
  }
  if (item instanceof LineAnnotation || item instanceof AreaAnnotation) {
    continue;
  }
  if (item instanceof SymbolToken) {
    if (item.Is("?")) {
      if (depth === 0) {
        return this.HasExtendsMarker(units, i) === false;
      }
      depth--;
      continue;
    }
    if (item.Is(":")) {
      depth++;
      continue;
    }
    const text = item.TempToString();
    if (text === ";" || text === "," || text === "=>" || item.Template.SymbolTemplate.IsAssignmentSymbol(text)) {
      break;
    }
    continue;
  }
}
return false;
```

## private method HasExtendsMarker:(units:Array<Token>, index:int)=>bool

`index`（一个 `?`）**往前**有没有条件类型的标志 `extends`。

条件类型写作 `T extends U ? A : B`，两个分支都是**类型**；
判出这个标志，`?` 后面的 `{` 与 `:` 后面的 `{` 就都能按类型字面量收。

`?` 与 `extends` 之间可以隔着换行与括号（`{ … }` 这样的约束体是**原子**的括号单元），
遇到别的符号（`;` / `=` / 语句边界）就停。

```ts
for (let k = index - 1; k >= 0; k--) {
  const before = Get(units, k);
  if (before instanceof LineWrap || before instanceof Bracket) {
    continue;
  }
  if (before instanceof LineAnnotation || before instanceof AreaAnnotation) {
    continue;
  }
  if (before instanceof Identifier) {
    if (before.Is("extends")) {
      return true;
    }
    continue;
  }
  if (before instanceof SymbolToken) {
    return false;
  }
}
return false;
```

## private method IsTypePosition:(units:Array<Token>, index:int)=>bool

`index` 处的 `{` 是不是处在**类型位**。

**关于括号上的 `Context` 字段（方案 A，已铺好但暂未启用）**：`Bracket.Context` 是**开括号那一刻**
算好的（见 `../text-common-util.xl.md` 的 `DecideBracketContext`），与重组时序无关。
本方法**曾经**改成「先读 `Context`、只有它是 `""` 时才落到下面这段老走法」，
测试立刻报出 5 条用例失败 + **2 个语料文件解析失败** —— 根因是：

> 词法阶段是**平列表**，它分不出「`outer: { … }` 这种**标签的冒号**」与「`x: { … }` 这种**类型标注的冒号**」
> —— 那正是**后来的规则**（`LabelCloseRule` 在 `TypeLiteralCloseRule` 之前跑）才带来的区分，
> 老走法能对，是因为它跑的时候冒号已经被 `Label` 收走了。

所以启用它之前，`DecideBracketContext` 还得把这个区分补上（判据在**宿主**的形态上：
宿主是参数括号 → 类型标注；宿主是语句列表且冒号前是一个裸露的名字 → 标签）。
在那之前这段老走法继续当家。

两条入口：

1. 父单元是 `GenericType`——泛型实参段里的 `{ }` 一定是类型（`Array<{ a: 1 }>`）；
2. 括号里的**第一个** `{ }`——本层看不到左边，递归问括号自己那一格（见代码里的注释）；
3. 否则从 `{` 往前找最近的边界：
   - `?` → **条件类型真分支**的起点：往后看有没有 `extends` 标志（`HasExtendsMarker`），
     有就说明这是 `T extends U ? { … } : …` 里的那个类型字面量
     （`util.d.ts` 的 `type PreciseTokenForOptions<…> = O["type"] extends "string" ? { … }` 就是它，
     两处真分支一共 12 个成员）；
     `?:` 必须一起认：**可选**参数 / 可选属性的类型标注就是它
     （`toBase64(options?: { alphabet?: string })` 里的 `{ … }`，只认 `:` 时那个类型字面量收不成、
     里面 6 个成员一起丢 —— `lib.esnext.typedarrays.d.ts` 就是这么丢的）；
   - **已经跨过 `=` 之后再遇到 `:` 就是值位**：`const options: CliOptions = { Input: "" }` 里
     那个 `{` 往前扫会先跨过 `=`、再撞上变量标注的 `:`——题面看它像「冒号后面的类型」，
     其实 `=` 之后的那个花括号是**值**（对象字面量）。
     不加这一条，对象字面量会被收成 `TypeLiteral`，它的成员接着被 `FieldCloseRule`
     当成字段收走（实测 `dist/ts/cjcli.ts`：一个 `CliOptions` 类型别名 5 个成员，
     外加一处 `const options: CliOptions = { … }` 的 4 个成员，产物里 **9 个 `Field`**，
     差分账上 `Field` 多出的 20 个正是这种形状）；
   - **`import` / `export` 后面的 `type` 不算类型位**：`import type { A } from "m"` 里那个 `{`
     往前扫会撞到 `type`（在关键字表里）→ 被当成类型字面量，于是导入列表被收成
     `TypeLiteral`，里面每个名字还成了一个 `Field`（实测产物：`<Import><Identifier>type</Identifier>
     <TypeLiteral><TypeLiteralBody><Field fieldName="A" />`）——**AST 那边一个属性都没有**，
     这正是差分账上 `Field` 长期「多出来」的一个来源。
     **判据要两条齐全**：`type` 前面是 `import` / `export`，**而且 `type` 后面紧跟一个 `{` 括号**。
     只看前一条会把 `export type CliOptions = { … }` 也挡掉（测试跑出来 `cjcli.ts`
     的 5 个 `Field` 全丢、5 条 type-only 用例报 `缺 TypeLiteral`）——那种写法里 `type` 后面是
     **别名**，花括号在 `=` 之后，属于正常的类型字面量。
     **两条都要走 trivia 口径**（第 875 轮）：`import /*c*/ type { A }` 与
     `import type /*c*/ { A }` 里 `type` 的左右各可能夹一条注释，只跳软换行时
     「后面紧跟一个 `{`」当场答否 ⇒ 导入列表又被收成 `TypeLiteral`。
     这一句**只写一份**（`text-common-util.xl.md` 的 `IsImportExportTypeClauseBrace`），
     `DecideBracketContext` 在开括号那一刻问的是同一句；
   - `=>` → **箭头**：先记下「正在跨箭头」，等把它的形参表也跨过去之后，再按形参表**左边**是什么下结论
     （见下一条）；
   - `|` / `&` → 类型位（联合 / 交叉类型的一项）；
   - `=` → 记下「跨过赋值」继续往前：再遇到 `type` 就是类型位（`type X = { … }`），
     遇到 `let` / `var` / `const` 则是值位（`const x = { … }`）；
   - 类型位关键字（`as` / `satisfies` / `extends` / `readonly` / `keyof` / `typeof` / `infer` / `new` …）→ 类型位；
   - 括号 → 值位（实参、下标、语句边界都不保证期望类型）；
   - 一路找到头没有边界 → 值位（保守：宁可保持 `ObjectLiteral` 的既有行为）。

**`=>` 后面的 `{` 不能一律当类型位**（实测缺口）：`=>` 有两种含义——**函数类型**的返回类型
（`let f: (a: A) => { b: string }`，这里的 `{` 是类型）与**箭头函数**的体
（`const f = (a) => { return a }`，这里的 `{` 是**块**）。
原来一见 `=>` 就返回 true，于是**箭头函数的块体被收成类型字面量**：
`const f = (a) => { return a }` 的产物是 `<LamdaBody><Statement><TypeLiteral><TypeLiteralBody>
<Statement><Keyword>return</Keyword><Field name="a" /></Statement>…`——`return a` 这条语句
退化成一个 `Field`，`g(a)` 这样的调用还退化成 `MethodDeclaration`。
八把尺子一把都看不见（节点计数、名字、括号归属、语句边界全都还对，只是**语义换了**），
是「产物标签 ↔ TS AST 构造」的对齐探针抓到的。

判据不能停在 `=>` 上，要继续跨过**形参表**（它与 `=>` 之间还可能夹着返回类型标注 `: T`），
按形参表左边那一个实义单元决定：

- 左边是 `:` → **函数类型**（`let f: (a: A) => { … }`）⇒ 类型位；
- 左边是 `=`（或再往左的 `type X =` 之类）→ 走本方法既有的「跨过赋值」那一套：
  落到 `type` 就是类型别名，落到 `let` / `var` / `const` 就是值位（箭头函数）；
- 左边是别的（`(` / `,` / `return` / 列表开头…）→ 值位（箭头函数）。

跨箭头期间遇到的那个 `:` 是**箭头函数自己的返回类型标注**（`const f = (a): T => { … }`），
一律跳过、继续往左（`(a: A): T => B` 不是合法的函数类型写法，所以这一条不会误伤类型位）。
`const f = (a): { x: number } => ({ x: 1 })` 里 `=>` 左边那个 `{ x: number }` 于是被当成形参表跨过去，
再往左撞上 `:` 就判成类型位——判对了（它是**返回类型**），而 `=>` 右边那个表达式体
由上面那条「括号紧跟 `=>` ⇒ 值位」挡住。

判定与 `../generic-type.xl.md` 的 `IsTypePosition` 同源（那边判的是 `<` 处在类型位还是表达式位）；
这里独立实现一份，因为两边看的是不同字符、也允许不同的保守程度。

```ts
const current = Get(units, index);
if (current === null) {
  return false;
}
if (current.Parent instanceof GenericType) {
  return true;
}
// **父单元已经是 ObjectLiteral 时一定是对象字面量**（实测补的）：
// `JsonObjectCloseRule` 排在 `TypeLiteralCloseRule` 之前，外层对象先成形，
// 内层那个 `{` 于是已经是 `ObjectLiteral` 的子单元——`const o = { a: { b: 1 } }` 里
// 内层往前扫会撞上 `a:` 的冒号，按类型位判就变成 `TypeLiteral`（实测产物确实如此，
// 内层 `b` 还成了一个 `Field`）。对象字面量的冒号是**键分隔符**，不是类型标注。
if (current.Parent instanceof ObjectLiteral) {
  return false;
}
// **括号里的第一个 `{`**：本层回扫什么也看不到（左边的单元在**括号外面**），
// 于是 `type T = ({ a: 1 } | { b: 2 })` 里第一个 `{` 被判成值位、第二个靠 `|` 判对——
// 同一个联合类型里出现 `ObjectLiteral` + `TypeLiteral` 混排（实测：
// `typescript.d.ts` 的 `ImportSpecifier & ({ readonly isTypeOnly: true } | { … })`、
// `util.d.ts` 的 `{ [LongOption in keyof T["options"]]: … }`）。
// 括号自己那一格问的是**外层列表**（括号是外公列表里的一项），所以递归问一次它：
// `type T = ({ … })` 回扫 → `=` → `T` → `type` ⇒ 类型位；
// `f({ … })` 回扫 → `Method` ⇒ 值位；`({ a, b }) => x` 回扫 → 列表开头 ⇒ 值位；
// `(a) => ({ x: 1 })` 的括号紧跟 `=>`（箭头函数的体）⇒ 值位。
//
// **「第一个」是「第一个实义单元」**（第 849 轮）：`(/* c */{ … })` 里那个注释在本层
// 占了一格，照 `index === 0` 判就整条跳过 ⇒ 回扫撞上 `(` ⇒ 判成**值位**，
// 于是同一个联合类型里第一个 `{` 是 `ObjectLiteral`、第二个是 `TypeLiteral`
//（实测 `mut-type-union-paren-object-162`）。判据与 `IsBindingPatternBrace` /
// `IsObjectLiteralBrace` 那两处的「跳过 trivia 再问」同源。
// **`[` 括号不走这条递归，走它自己那一档**（第 868 轮收掉；第 849 / 855 轮试过两版都撤回）：
// `type T = [{ a: 1 }]` 是元组类型、`const a = [{ b: 1 }]` 是数组字面量，
// 分开它们确实是「括号自己那一格」的事——而这一支问的是**外层列表**
// （括号是外公列表里的一项），`f([{ a: 1 }])` 里那个 `[` 前面是 `(`、
// `const o = { b: [{ c: 1 }] }` 里前面是 `:` ⇒ 按前文判恰好给反。
// 直接读 `Bracket.Context` 那一版当年也不成立，**因为它本身是错的**：
// `DecideBracketContext` 的冒号那一支不看「已经跨过 `=`」，于是
// `const tree: Tree = { …, kids: [{ value: 2 }] }` 里那个 `[` 是 `"type"`
//（27 条 e2e 当场报 `unimplemented: expression TypeLiteral`）。
// 第 868 轮把那半修好（冒号那一支 + `typeof` 那一支 + 绑定模式那道闸），
// `[` 这一档才立得住——判据、遮断与实测见下面那一段。
if (current.Parent instanceof Bracket && current.Parent.startBracket === "[") {
  // **索引签名 / 映射类型的键括号不归这一支管**（第 868 轮实测撞到的）：`{ [K in T]: … }` /
  // `{ [k: string]: X }` 里那个 `[` 是**键那一格**，它里面还可能装着别的 `{`——
  // `O[K]["default"] extends {} ? K : never` 这种 `as` 子句里就有（实测
  // `@types/node/util.d.ts` 一处 `TypeLiteral` 被这我一支抢成 `ObjectLiteralExpression`）。
  // 判据：这个 `[` 是**外面那个花括号的第一个实义单元**（键括号只有这一个落点）。
  // 不抢之后落回下面那段老走法（`extends` 那一档本来就判得对）。
  const squareHolder:Token | null = current.Parent.Parent;
  const isKeyBracket = squareHolder !== null && squareHolder instanceof Bracket &&
    squareHolder.startBracket === "{" &&
    SkipPreviousTrivia(squareHolder.Data, squareHolder.Data.indexOf(current.Parent)) < 0;
  if (isKeyBracket === false) {
    // **绑定模式那一档先挡掉**：`const { x: [{ y }] } = o` 里那个 `[` 的 `Context` 是 `"type"`
    //（它往回撞上的是重命名那个 `:`，而 `DecideBracketContext` 撞冒号时 `crossedAssignment`
    // 还是假）。判据用现成的 `IsBindingPatternBrace`（`text-common-util.xl.md` 第 825 轮：
    // 「`{` 前面是 `const` / `let` / `var`，或者自己在另一个模式括号里」），
    // 沿括号链往上问——撞到**表达式花括号**（对象字面量 / 类型字面量）就停。
    let node:Token | null = current.Parent;
    while (node !== null && node instanceof Bracket) {
      const holder:Token | null = node.Parent;
      if (holder === null) {
        break;
      }
      const atNode = holder.Data.indexOf(node);
      if (atNode >= 0 && IsBindingPatternBrace(holder.Data, atNode)) {
        return false;
      }
      if (node.startBracket === "{" && BraceInExpression(node)) {
        break;
      }
      node = holder;
    }
    const brace = EnclosingBraceToken(current.Parent);
    if (brace !== null && BraceInExpression(brace) === false) {
      return false;
    }
    // **这一档不要求「自己是第一个实义单元」**（第 868 轮实测补）：`type T = [{ a: 1 }, { b: 2 }]`
    // 的第二个元素往回撞上的是 `,`（「其它符号 ⇒ 值位」当场判死）——
    // 而元组元素的类型位由**外层那个 `[`** 决定，与自己在第几格无关。
    return current.Parent.Context === "type";
  }
}
if (SkipPreviousTrivia(units, index) < 0 && current.Parent instanceof Bracket &&
    current.Parent.startBracket === "(") {
  const owner = current.Parent.Parent;
  if (owner !== null) {
    const at = owner.Data.indexOf(current.Parent);
    if (at > 0) {
      const beforeBracket = Get(owner.Data, SkipPreviousWrapSymbol(owner.Data, at));
      // 括号紧跟 `=>` ⇒ 它是**箭头函数的体**（值位），不要拿外层那一格去判类型。
      // 少了这一条，`const f = (a): { x: number } => ({ x: 1 })` 的表达式体会被收成 `TypeLiteral`
      // （用例 `expr-arrow-return-object-type` 钉住：体必须仍是 `ObjectLiteral`）。
      if (!(beforeBracket instanceof SymbolToken && beforeBracket.Is("=>"))) {
        return this.IsTypePosition(owner.Data, at);
      }
    }
  }
  return false;
}
let crossedAssignment = false;
let crossingArrow = false;
// **正在跨的那条箭头左边还叠着几条箭头**（第 927 轮）：只有**最外面那一条**的形参表
// 才结束「跨箭头」——见下面 `Bracket` 那一支与 `=>` 那一支的说明。
let arrowsCrossed = 0;
// **「这一格与那个 `new` 之间跨过实义单元没有」**（第 375 轮）——
// 与 `text-common-util.xl.md` 的 `DecideBracketContext` 里那个 `sawUnit` **同一条判据**
//（两处是同一个判断的两份实现，本文件那一段注释里写着为什么不合并）。
// 它只为 `new` 那一档服务（见下面 `text === "new"` 那一段）。
let crossedUnit = false;
for (let i = index - 1; i >= 0; i--) {
  const item = Get(units, i);
  if (item instanceof LineWrap) {
    // **语句边界就是终点**（第 67 轮修）：`type H = number` 换行 `try { } catch { }` 里，
    // `try` 后面那个 `{` 往回扫时会**跨过换行、跨过 `try`**，一路撞上 `type` ⇒ 被判成类型位，
    // 于是 `try` 的语句体被收成一个 `TypeLiteral`；`TryCloseRule` 拿到它当场抛
    // 「next is not Bracket」，**整份文件解析失败**（三片段组合探针抓到的形状）。
    //
    // 判据复用 ASI 那一条（`Statement.IsLineBreakBoundary`），不另写近似：
    // 换行前是 `=` / `:` / `|` / `&` / `=>` 这些「还要操作数」的形状时它给「不是边界」，
    // 多行类型的排版（`type T =` 换行 `{ … }`、联合成员换行）照旧成立。
    //
    // **声明头还没写完时它也不是边界**（第 947 轮（三））：`type Y` 换行 `<T> = { a: T }`
    // 在 TS 那边是**一条** `TypeAliasDeclaration`（类型参数表可以另起一行）。
    // **解析期那一半本来就问过这一句**：`StatementBranch.Condition` 把
    // `IsDeclarationHeadAwaitingParameters` 排在 ASI 判据**之前**，所以壳一直开着
    //（这也是为什么这一格只坏在类型位判定上、语句本身没被切开）；这一趟是**收尾期**、
    // 手里有列表 —— 问**同一句**，不另判一遍：`IsLineBreakBoundary` 只看形状
    //（`Y` 不要操作数、`<T>` 也不在它的续接表里）⇒ 答「是边界」⇒
    // `=` 右边那个 `{` 被收成对象字面量（实测缺 `TypeLiteral` / `PropertySignature` /
    // `TypeReference` 各一、多 `ObjectLiteralExpression` / `PropertyAssignment` 各一）。
    // **参数是「已经读到的那些单元」**（`units.slice(0, i)`）——那个方法看的是列表的**尾巴**。
    if (Statement.IsLineBreakBoundary(units, i)) {
      if (Statement.IsDeclarationHeadAwaitingParameters(units.slice(0, i))) {
        continue;
      }
      return false;
    }
    continue;
  }
  if (item instanceof GenericType) {
    // **泛型实参段算「跨过一个实义单元」**（`new Box<number>({ … })` 里那一段）——
    // 它就在被构造者与实参表之间。
    crossedUnit = true;
    continue;
  }
  if (item instanceof LineAnnotation || item instanceof AreaAnnotation) {
    continue;
  }
  if (item instanceof SymbolToken) {
    const text = item.TempToString();
    if (text === ":" || text === "?:") {
      if (crossingArrow) {
        continue;
      }
      if (crossedAssignment) {
        return false;
      }
      // **`case` / `default` 的标签冒号是值位**（第 553 轮）：`case 1: { … }` 里那个 `{`
      // 往前扫先撞上标签冒号，按类型位判就把整段语句体收成 `TypeLiteral`
      // （实测 `st-switch-block-case.ts`：段里只剩一个冒号，`Block` 与里面的语句全丢）。
      // 判据与 `type-define.xl.md` / `label.xl.md` 那两处是**同一句**
      // （`text-common-util.xl.md` 的 `IsSwitchLabelColon`）。
      if (IsSwitchLabelColon(units, i)) {
        return false;
      }
      return this.HasTernaryQuestion(units, i) === false;
    }
    if (text === "?") {
      return this.HasExtendsMarker(units, i);
    }
    if (text === "|" || text === "&") {
      // **正在跨箭头时，`|` / `&` 属于那个返回类型**（第 375 轮）：
      // `const check = (a: string): string | null => { … }` 从**块体**那个 `{` 回扫——
      // `=>` 记下「正在跨箭头」 ⇒ `null` ⇒ `|`。
      // 少了这一条：`|` 在 `crossingArrow` 还亮着的时候就返回了**类型位**
      // ⇒ 箭头的块体被收成 `TypeLiteral`（与 `number[]` 那个 `[` **同一个形状的第二半**——
      // 那一半是「返回类型是数组」，这一半是「返回类型是联合」）。
      // **判据与 `:` 那一支对称**（那里也先问 `crossingArrow`）。
      if (crossingArrow) {
        continue;
      }
      // **已经跨过 `=` 之后，`|` / `&` 说的是左边那份标注**（第 290 轮）：
      // `const x: number | string = { a: 1 }` 从值位那个 `{` 回扫 ⇒ `=`（记住跨过赋值）
      // ⇒ `string` ⇒ `|`——`|` 属于**变量标注**、与这个 `{` 是值位还是类型位**无关**。
      // 原来在 `|` 处直接判「类型位」 ⇒ 对象字面量被收成 `TypeLiteral`，
      // 整份文件报 `unimplemented: expression TypeLiteral`
      // （实测：`const x: number | string = { a: 1 } as any`、
      //  `const x: { a: number } | number = { a: 1 }`、`let m: { n: number } | null = { n: 1 }`
      //  ——**三条都是普通 `.ts` 里遍地都是的写法**）。
      // **判据是「跨过 `=` 之后」**：`type X = A | { … }` 那一格回扫**先撞上 `|`**
      // （`=` 还在它更左边），`crossedAssignment` 还是假 ⇒ 照旧判类型位。
      if (crossedAssignment) {
        continue;
      }
      return true;
    }
    if (text === "=>") {
      // **跨箭头那一段要数箭头**（第 927 轮）：`const f = (): () => void => { … }` 里
      // 返回类型**自己**是一段函数类型，于是从体那个 `{` 回扫会先撞上**外层** `=>`、
      // 再撞上内层那一个。原来两个都只把状态**置真**、而下面那个 `(` 见到 `(` 就把状态清掉
      // ⇒ 丢掉的是**外层**箭头的形参表（它更左）⇒ 回扫接着撞上外层箭头的**返回类型冒号**
      // ⇒ 判成类型位 ⇒ 体被收成 `TypeLiteral`
      //（实测：缺 `Block`、多一个 `TypeLiteral`；`const f = (): () => void => { return; };`）。
      // 数下来之后，内层那个 `(` 只把计数减一、状态继续亮着。
      crossingArrow = true;
      arrowsCrossed = arrowsCrossed + 1;
      continue;
    }
    if (text === "=" && crossedAssignment === false) {
      crossedAssignment = true;
      continue;
    }
    return false;
  }
  if (item instanceof Bracket) {
    if (crossingArrow) {
      // **只有形参表那个 `(` 才收掉「正在跨箭头」这个状态**（第 375 轮）。
      //
      // 返回类型本身也可能是括号：`(): number[] => { … }`（数组类型）、
      // `(): [number, string] => { … }`（元组）、`(): { a: number } => { … }`（类型字面量）。
      // 原来**不分种类一律收掉** ⇒ `number[]` 那个 `[` 先把状态吃掉
      // ⇒ 回扫再往前撞上的是**返回类型的冒号** ⇒ 走到 `:` 那一支时 `crossingArrow` 已经是假
      // ⇒ 判成**类型位** ⇒ 箭头函数的**块体被收成一个 `TypeLiteral`**
      //（`constructing === undefined ? … : { kind: … }` 那种形状同理）。
      //
      // **实测的现场**：`const build = (list: number[]): number[] => { … }`
      // ⇒ 降级层报 `unimplemented: expression TypeLiteral`（**整份文件进不来**，
      // 判据 `c371-e2e-coordinate-geometry` / `c371-e2e-sudoku-validator` 两条）。
      // **对照**：`(): number => { … }` 与 `(): Array<number> => { … }` 一直是好的——
      // 它们没有那个 `[`（`Array<…>` 是一个 `GenericType`，在更上面那一支里 `continue`）。
      //
      // **叠着箭头时只减一层**（第 927 轮）：这一对括号属于**返回类型里那个函数类型**时
      // （它自己也有 `=>`，见上面那个计数），它不该结束「跨箭头」——要继续往左找
      // **最外面那条箭头**的形参表。
      //
      // **返回类型那一格不是形参表**（第 928 轮）：`const k = (): (() => void) => { return; };`
      // 从体那个 `{` 回扫——先撞上外层 `=>`（计数 1）、再撞上**返回类型**那个括号；
      // 它也是 `(`，照原来那句就把「跨箭头」收掉了 ⇒ 接着撞上返回类型的冒号 ⇒ 判成类型位
      // ⇒ 体被收成 `TypeLiteral`（实测缺 `Block` / `ReturnStatement`）。
      // 两处的分法与 `FindParameters` / `IsFunctionTypeArrow` **共用一份**：
      // `IsArrowReturnTypeBracket`（括号里装的是类型、且冒号左边是形参表）。
      if (item.startBracket === "(" && IsArrowReturnTypeBracket(units, i) === false) {
        if (arrowsCrossed > 1) {
          arrowsCrossed = arrowsCrossed - 1;
        } else {
          crossingArrow = false;
          arrowsCrossed = 0;
        }
      }
      continue;
    }
    return false;
  }
  if (item instanceof Identifier) {
    const text = item.TempToString();
    // **成员名不是关键词**（第 125 轮）：`node.type = { … }` 里那个 `type` 是**属性名**，
    // 不是类型别名的 `type`——不回看一格的话右边的**对象字面量**会被收成类型字面量
    // （实测 `dist/ts/typescript/ts-ast.ts` 的 `node.type = { kind: …, types, pos: … }`
    // 整块投成 `TypeLiteral` + `PropertySignature`，缺一整个 `ObjectLiteralExpression` 子树）。
    // 判据与 `text-common-util.xl.md` 的 `IsTypeAliasAssignment` 用的是同一条。
    const beforeWord = Get(units, SkipPreviousWrapSymbol(units, i));
    if (beforeWord instanceof SymbolToken && (beforeWord.Is(".") || beforeWord.Is("?."))) {
      continue;
    }
    // **`import` / `export` 后面那个 `type` 词**（`import type { A } from "m"`）：
    // 判据只写一份，住在 `text-common-util.xl.md` 的 `IsImportExportTypeClauseBrace`
    //（`DecideBracketContext` 问的是同一句，两处的差别只有第三个参数）。
    if (text === "type" && IsImportExportTypeClauseBrace(units, i, true)) {
      return false;
    }
    // **`of` / `in` 右边是值**（第 589 轮）：`for (const v of { … })` 往回扫会跨过
    // `of`、`v` 撞上 `const` ⇒ 这个对象字面量被收成 `TypeLiteral` ⇒ 降级层报
    // `unimplemented: expression TypeLiteral`（整份文件进不来）。
    // **两处扫描各写一份**（见上面 `crossedUnit` 那一段写的理由），所以这条要补两处。
    if (text === "of" || text === "in") {
      return false;
    }
    if (
      text === "type" ||
      text === "as" ||
      text === "satisfies" ||
      text === "extends" ||
      text === "implements" ||
      text === "readonly" ||
      text === "keyof" ||
      text === "typeof" ||
      text === "infer" ||
      text === "declare" ||
      text === "asserts" ||
      text === "is"
    ) {
      // **`typeof` 是个例外：它也是值位的一元运算符**（第 233 轮）。
      //
      // 上面那张名单里别的词**只出现在类型位**（`keyof T`、`infer U`、`readonly`），
      // 而 `typeof` **两处都有**：类型位是**类型查询**（`type T = typeof x`），
      // 值位是**一元运算符**（`typeof x`）——而这里要判的是「**这个 `{` 是不是类型的开头**」。
      //
      // **怎么分**：`typeof x` 这个**类型查询**后面永远跟一个**标识符或一个成员链**
      //（`typeof globalThis`、`typeof x.y`）——**它从来不直接跟一个 `{`**；
      // 而紧跟 `{` 的那种只出现在**条件类型**里
      //（`typeof x extends { a: 1 } ? T : F`——那正是这一段最早要保的形状）。
      // 所以判据是「**往前有没有一个 `extends`**」（`HasExtendsMarker`，同一个文件里现成的）。
      //
      // **实测的现场**：`console.log(typeof {a: 1})` 与 `typeof {a: 1}` 都被收成
      // `TypeLiteral`，投影于是给出一个**孤零零的 `TypeOfKeyword`**
      //（对象那一整棵子树**根本不在产物里**）——判据 `op-typeof-forms` /
      // `ex-typeof-value-expression` 现场红的，一句话指向投影，
      // 而根子在这里（**`{` 走错了那一条重组**）。
      //
      // **`index` 是那个 `{`、不是 `typeof`**：`HasExtendsMarker` 从 `index` 往左扫，
      // 中间隔着 `typeof`（一个 `Identifier`，它那一支是 `continue`）——正好。
      if (text === "typeof") {
        return this.HasExtendsMarker(units, index);
      }
      return true;
    }
    if (text === "let" || text === "var" || text === "const") {
      return crossedAssignment === false;
    }
    // **`new` 要分两种**（第 375 轮）——它原来在上面那张类型位名单里，
    // 因为**构造签名** `new (a: string) => B` 是真的类型；
    // 而它在**值位**上也遍地都是：`new Box({ n: 1 })` 里那个 `{` 是**对象字面量**。
    //
    // **判据**：`new` 与这个 `{` 之间**跨过实义单元**（`crossedUnit`）就说明
    // 它是**`new` 表达式**（被构造者 + 实参表）⇒ **值位**；
    // 括号**紧跟在 `new` 后面**才是构造签名 ⇒ 类型位。
    //
    // **实测的现场**：`new Box({ n: 3 })` 的 `{` 走到这里——它是括号里的**第一个**单元
    // ⇒ 上面那条递归（`index === 0` 那一支）问的是**括号自己**在不在类型位，
    // 回扫一路跨过 `Box`、撞上 `new` ⇒ 判成类型位 ⇒ 收成 `TypeLiteral`
    // ⇒ 降级层报 `unimplemented: expression TypeLiteral`（**整份文件进不来**，
    // 判据 `c371-e2e-sudoku-validator` / `c371-e2e-coordinate-geometry` /
    // `c371-rt-class-static-and-instance-isolation` / `c371-ex-new-expression-type-args` 四条）。
    // **为什么只有第一个实参中招**：第二个实参前面隔着一个 `,`，而符号那一支
    // 「其它符号 → 值位」先把它接住了（实测 `new Box(1, { n: 3 })` 一直是好的）。
    if (text === "new") {
      return crossedUnit === false;
    }
    // **跨过了一个实义单元**（被构造者那个名字、或者类型标注里别的名字）——
    // 记下来给上面那一档用，然后照旧继续往前扫。
    crossedUnit = true;
    continue;
  }
  return false;
}
return false;
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个类型字面量的开头。

**`for (const { x, y } of items)` 那一格不是**（第 547 轮）：这条规则跑在
**根那一层**（`Foreach` 还没成形），`( … )` 的内容是**根那个括号的 `Data`**、
`for` 在括号外面 ⇒ 回扫撞到的第一个实义词是 `const`，而 `const` 那一支答的是
`crossedAssignment === false` ⇒ **真** ⇒ `{ x, y }` 被收成 `TypeLiteral`
（实测产物是 `<TypeLiteral><TypeLiteralBody><Field name="x">…`）。
判据见下面 `IsForeachDeclareHead`：**左边是 `const` / `let` / `var`、右边是 `of` / `in`**
⇒ 这一格是**循环头里的声明段** ⇒ 绑定模式、不是类型。

```ts
const current = Get(units, index);
if (!(current instanceof Bracket) || current.startBracket !== "{") {
  return false;
}
if (current.Parent instanceof TypeLiteralBody) {
  return false;
}
if (this.IsForeachDeclareHead(units, index)) {
  return false;
}
return this.IsTypePosition(units, index);
```

## private method IsForeachDeclareHead:(units:Array<Token>, index:int)=>bool

`index` 处的 `{` 是不是 `for (const { … } of …)` 那个**循环头**里的绑定模式（第 547 轮）。

**判据挂在右侧**（第 547 轮实测之后改的）：这一格回扫**看不到 `for`** ——
规则跑在根那一层时，`for` 与 `( … )` 的内容**不在同一张表里**（`( … )` 是根的一个括号，
它的 `Data` 才是 `const { … } of items`），所以「回扫找 `for`」这条初版判据**从来答否**。
能看见的是**右边**：

1. 从 `{` 往左找第一个 `let` / `var` / `const` 那一格；
2. 从 `{` 往右跳过它配对的 `}`（`SkipNextWrapSymbol`），下一格是不是 `of` / `in`。
   两个都成立 ⇒ **循环头里的声明段**。

**为什么「右边是 `of` / `in`」不会误伤类型位**：类型位的对象类型后面只可能是
`=` / `)` / `;` / `,` / `:` / `|` / `&` / `>` 这些 —— `of` / `in` 是**词**，
在类型里它们只能是属性名（那需要一个 `.` 或者前面是 `,` / `{`），两种都过不了第 1 步。

```ts
let wordAt = -1;
for (let at = index - 1; at >= 0; at--) {
  const one = Get(units, at);
  if (one === null || one instanceof LineWrap || one instanceof LineAnnotation || one instanceof AreaAnnotation) {
    continue;
  }
  if (one instanceof Identifier) {
    const text = one.TempToString();
    if (text === "const" || text === "let" || text === "var") {
      wordAt = at;
      break;
    }
  }
  return false;
}
if (wordAt < 0) {
  return false;
}
const afterAt = SkipNextWrapSymbol(units, index);
const after = Get(units, afterAt);
return after instanceof Identifier && (after.TempToString() === "of" || after.TempToString() === "in");
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把一个类型字面量收成一个 `TypeLiteral`，**返回新的下标**。

括号的内容整体搬给 `TypeLiteralBody`，括号本身不再留在树里；搬完要 `TryToClose()` 一次，
让体内那一轮成员重组跑起来（这一步与 `Interface.Process` 处理接口体完全一致）。

**内容是映射类型时改收 `MappedType`**（见 `./mapped-type.xl.md`）：判定 `IsMappedTypeBrace`——
第一个实义单元是 `[` 括号、且那个括号里有顶层的 `in`。区别只在产出的节点与「内容放哪」：
映射类型只有一个成员，直接装在节点身上（不再套一层 `TypeLiteralBody`）。

```ts
const current = Get(units, index);
if (!(current instanceof Bracket)) {
  throw new Error("类型字面量不满足格式要求：{ ... }");
}
if (this.IsMappedTypeBrace(current)) {
  const mapped = new MappedType(template);
  mapped.Parent = current.Parent;
  mapped.SignIn(current.SourceRange.Start!);
  mapped.SignOut(current.SourceRange.End!);
  current.MoveDataTo(mapped);
  mapped.TryToClose();
  return ReplaceCountAt(units, index, 1, mapped);
}
const result = new TypeLiteral(template);
result.Parent = current.Parent;
result.SignIn(current.SourceRange.Start!);
result.SignOut(current.SourceRange.End!);
const body = result.CreateBody();
current.MoveDataTo(body);
body.Sign(current);
body.TryToClose();
result.TryToClose();
return ReplaceCountAt(units, index, 1, result);
```

## private method IsMappedTypeBrace:(bracket:Bracket)=>bool

这对花括号的内容是不是**映射类型**的成员（`{ [K in T]: X }`）。

判据：第一个实义单元是 `[` 括号，**而且那个括号里有 `in` 标记**（`HasInMarker`）。
`{ [key: string]: number }`（索引签名）没有 `in`，仍然走 `TypeLiteral`。

括号**前面**的 `readonly` / `+` / `-` 修饰词要跳过：`{ readonly [K in T]: X }`、
`{ -readonly [K in T]-?: X }` 都是映射类型（少了这一跳，带修饰词的映射类型整片认不出来）。

```ts
for (const item of bracket.Data) {
  // **注释也跳过**（第 666 轮）：`{ /*a*/ [K in B]: C }` 里第一个实义单元仍是那个 `[`，
  // 只跳软换行时撞上的是注释 ⇒ 整片映射类型退化成 `TypeLiteral`
  //（实测缺 `MappedType`、多出 `TypeLiteral` / `PropertySignature` / `ComputedPropertyName`）。
  if (IsTriviaUnit(item)) {
    continue;
  }
  if (item instanceof Identifier && item.Is("readonly")) {
    // `{ readonly [K in T]: X }`：`readonly` 在括号**前面**
    continue;
  }
  if (item instanceof SymbolToken && (item.Is("+") || item.Is("-"))) {
    // `{ -readonly [K in T]: X }` / `{ +readonly … }` 的修饰前缀
    continue;
  }
  if (!(item instanceof Bracket) || item.startBracket !== "[") {
    return false;
  }
  return this.HasInMarker(item);
}
return false;
```

## private method HasInMarker:(unit:Token)=>bool

`[K in T]` 里那个 `in` 在不在这个单元（及其容器子单元）里。

**三种形态都要认**（实测逐一看过）：

- `Identifier`：`[K in T]` 刚收上来、关键词还没升级时；
- `Keyword`：括号内容已经跑过一趟、`in` 升成关键词之后
  （`{ [K in keyof U]: U[K] }` 就是这一形态——`in` 后面跟着 `keyof`，没被折成二元运算）；
- `BinaryOperator`：`in` **被折成了二元运算**时（`{ [K in T]: X }` 的 `[K in T]` 是这一形态）。
  它用**类名**判定，本文件 import 它只为看一眼子单元，不值得绕出更深的环
  （与 `statement.xl.md` 里 `Let` 那条同一个理由）。

**还要往容器里递归看一眼**：`type-union.xl.md` 的联合规则已经把 `in` 排除出操作数，
但历史产物里它可能还被更外层的节点包着（`UnionType` / `BinaryOperator` / `ArrayLiteral`），
所以子单元不是叶子时继续往里找——映射类型的判定不能因为包了一层就失效。

```ts
for (const item of unit.Data) {
  if (item instanceof LineWrap) {
    continue;
  }
  if (item instanceof Identifier && item.Is("in")) {
    return true;
  }
  if (item instanceof Keyword && item.Value === "in") {
    return true;
  }
  if (item.Data.length > 0 && this.HasInMarker(item)) {
    return true;
  }
}
return false;
```

# class TypeLiteral extends IndependentToken

类型字面量。

**类名必须与产物的标签名一致**：`constructor.name` 就是它的 XML 标签名。

## constructor:(template:Template)=>void

以模板创建，并把本类型的收尾规则挂上来（模板里没有专门给 `TypeLiteral` 注册就用通用队列）。

```ts
super(template);
this.CloseRuleQueue = template.CloseRuleTemplate.Get(this.constructor);
```

## method CreateBody:()=>TypeLiteralBody

新建类型字面量体并挂到自己名下，返回新单元。

```ts
return this.Add(new TypeLiteralBody(this.Template));
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new TypeLiteral(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
