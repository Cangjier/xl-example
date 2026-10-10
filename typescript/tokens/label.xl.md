# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../core/syntax/close-rule.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { IsDeclarationModifier } from "./declaration-common.xl.md"
import { CommentsIn, IsStatementStart, IsSwitchLabelColon, SkipNextTrivia, SkipPreviousTrivia } from "../text-common-util.xl.md"
import { ParsePipeline } from "../parse-pipeline.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Identifier } from "./identifier.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

标签：把 `outer:` 这个「名字 + 冒号」的前缀收成一个 `Label` 单元，名字记进 `label`。

**为什么只收前缀、不收它标的语句。** TypeScript 的 `name:` 与类型标注共用同一个冒号，
而 `TypeDefineCloseRule` 在通用队列里排得很前——它会把 `name: while (...) {...}` 里的
`: while (...) {...}` 整段当成一个类型标注收走。所以标签必须在**它之前**跑，那时后面那条语句
（`while` + 条件括号 + 循环体）还散着，认不出边界。等 `WhileCloseRule` 把语句收好时，
这一轮重组已经过去了。

**产物是「标签包住它标的那条语句」一格**（第 929 轮改）：

    <Label label="outer"><While>…</While></Label>

也就是 TypeScript 的 `LabeledStatement`（`label` + `statement`）那个形状。
从前这里是**两个平级单元**（`<Label label="outer" /><While>…</While>`），
与 TS 不是一个形状；`label` 那一层于是只是**前缀标记**，投影得靠两处「把标签与它右边那一格合并」
的补丁（`print-ast-common.xl.md` 的 `projectEach` / `projectStatement` 各一处）才拼得回来。

**为什么不是在这里包。** `LabelCloseRule` 跑在这一刻，被标的语句**还没成形**
（`while` 那一格还是散单元）——上面那条时序限制照样成立。所以本规则只收前缀（`名字 + 冒号`），
**包那一步排在容器的规则跑完之后**：`Statement.AbsorbLabels`（见 `statement.xl.md`），
它扫的是**容器自己的子单元列表**，那时标签后面那一格已经是一条成形语句。

`Statement.IsStatementUnit` 把 `Label` 也算作语句级结构，所以两者不会被折进同一个 `Statement`。

形状限制：只认**循环/分支类**的标签（冒号后面是 `for` / `foreach` / `while` / `do` / `switch` / `try` / `if`）。
放宽到「任意语句」会把对象字面量里的 `default:` 之类也当成标签，而那里没有规则队列兜底。

`LabelCloseRule` 写在 `Label` **之前**。

**冒号后面换行 / 夹注释时，换行处不收语句壳**（第 835 轮）：`lbl:` 换行 `for (;;) { … }`
在 TypeScript 里是**一条** `LabeledStatement`，而解析期的 `StatementBranch` 在换行那一刻
会问「这一行写完了没有」，看到上一格是 `:` 就答「写完了」⇒ 收壳 ⇒ `lbl` 与 `:` 被关进一个壳、
`for` 另起一条 ⇒ 标签规则再也看不到那一对（实测 `gap-sweep-{newline,linecomment}-label-0{1,2}`
四条：`LabeledStatement` 整条缺、`Label` 与循环体一起降级）。判据是 `IsPendingLabelHead`。

# class LabelCloseRule extends CloseRule

## static readonly field Instance:LabelCloseRule = new LabelCloseRule()

唯一的实例，注册进通用规则队列时用。

## static readonly field LoopStatementWords:Array<string> = ["for", "foreach", "while", "do", "switch", "try", "if", "function", "class", "enum", "interface", "namespace", "module", "type"]

能带标签的循环 / 分支词。**只有这一份**：`IsLabeledStatement`（收尾期认已成形的那一格）
与 `Statement.IsPendingLabelHead`（解析期认还散着的那一格）问的是同一张表。

**声明头也要在这张表里**（第 900 轮，片段普查当场逮到的）：`lbl: function f() {}` /
`lbl: class C {}` / `lbl: enum E {}` / `lbl: interface I {}` 在 TypeScript 里都是**一条**
`LabeledStatement`，而标签只认循环 / 分支词的那一版**一条都收不出来**——
`function` 那一格判据给否 ⇒ `lbl` 与 `:` 留在原地 ⇒ 更晚的 `TypeDefineCloseRule` 顺手把
`:` 与整个函数声明收成一个类型标注，产物是
`Statement > [Identifier(lbl), TypeDefine > Function]`（实测：四族各缺
`LabeledStatement` + 声明本身 + 名字 + 体，多一个 `ExpressionStatement`）。
**这四格与循环那七格是同一档**：冒号后面那一格能起一条语句，这一对就是标签。
`type` 也在名单里（`lbl: type T = 1` 同理）——它同样是「冒号后面起一条语句」的形状。
**加宽这张表不会误伤类型标注**：`let x: T` / `a ? b : c` 那一关挡在
`IsStatementStart` 上（名字前面不是语句开头），与这里认哪些词无关。

## static method StatementStartsHere:(units:Array<Token>, index:int)=>bool

`index` 处这一格**能不能起一条语句**（不看它左右那两格，只看它自己）。
`IsLabeledStatement` 与 `IsPendingLabelHead` 共用这一份：一处写成「词表」、另一处写成
「类名表」就是第二份会漂的答案。

```ts
const item = Get(units, index);
if (item === null) {
  return false;
}
if (item instanceof SymbolToken && item.Is("{")) {
  return true;
}
if (item instanceof Bracket) {
  return item.startBracket === "{";
}
// **已经成形的语句单元也要认**（第 392 轮）——名单与 `LoopStatementWords` **一一对应**，
// 所以往后每把一条控制流规则改成向导，这里一个字都不用动。
//
// 按**类名**判而不是 `instanceof`：`statement.xl.md` 自己 import 本文件，
// 反过来 import 会绕出环（与 `statement.xl.md` 用类名认 `StaticBlock` / `Namespace` 同一条理由）。
const formed = item.constructor.name;
if (
  formed === "IfSet" ||
  formed === "For" ||
  formed === "Foreach" ||
  formed === "While" ||
  formed === "DoWhile" ||
  formed === "Switch" ||
  formed === "Try" ||
  // **声明那几格也要认**（第 900 轮）：`lbl: function f() {}` 走到这里时冒号后面
  // 已经是一个成形的 `Function`（函数 / 类 / 枚举 / 接口 / 命名空间的收尾规则
  // 都排在 `LabelCloseRule` 前面），而这一串原来只有控制流那七个类名 ⇒ 判据给否
  // ⇒ 标签收不出来、更晚的 `TypeDefineCloseRule` 把 `:` 与整个声明收成类型标注
  // （实测四族各缺 `LabeledStatement` + 声明本身 + 名字 + 体，多一个 `TypeDefine`）。
  // 名单与上面 `LoopStatementWords` 里新加的那几个词**一一对应**。
  formed === "Function" ||
  formed === "Class" ||
  formed === "Enum" ||
  formed === "Interface" ||
  formed === "Namespace"
) {
  return true;
}
if (!(item instanceof Identifier)) {
  return false;
}
if (item.IsAny(LabelCloseRule.LoopStatementWords)) {
  return true;
}
// 表达式语句（`done: f()`），或又一个标签（`a: b: for(;;) { … }`）。
return true;
```

## static method IsPendingLabelHead:(data:Array<Token>)=>bool

`data` 这一段的**末尾**是不是一个标签头——即 `… <名字> <:>` 收尾，而那个名字是**一条语句的开头**。

**问它的是解析期的 `Statement.LineCannotEnd`**（`statement.xl.md`）：那一刻软换行还没进
`Data`，所以 `data.length` 就是那个虚拟下标，判据只往左看。

**为什么非有它**：`lbl:` 换行 `for (;;) { … }` 里，上一格是 `:` ⇒
`LineCannotEnd` 走到「`:` 收尾 ⇒ 这一行写完了」那一支 ⇒ 收壳 ⇒ 标签那一对与 `for`
分家（`Label` 规则是**收尾期**跑的，那时 `lbl` 已经在壳里、`for` 已经在另一个壳里）。
这与 `IsPendingImportHead` / `IsPendingDecoratorHead` 是同一档：**头还没写完，换行不是语句边界**。

**判据只看左边**（实测踩出来的）：一开始还想在这里问一句「冒号后面那一格能不能起一条语句」
（`StatementStartsHere`），可解析期**同一行后面的单元还不在 `Data` 里** ——
`SkipNextTrivia(data, colonIndex)` 直接落到 `data.length` 上、`Get` 给 `null`
⇒ 那一问恒为假（探针实测：`[lbl, :, LineWrap]` 那一趟 `nextAt=5`、`data.length=5`）。
这也是**不必**问它：右边那一格如果是运算符 / `.` / `(` / `[` 之类的续接符，
`Condition` 里后面那两条（`IsLineBreakIncompleteOnLeft` 之后的 `ContinuesExpression`
与原始字符版的 `NextLineContinuesExpression`）本来就不收壳。

**「这个名字是不是语句开头」那一问不能省**：`let a:` 换行 `B` 的行尾也是 `:`，
可 `a` 在产物里住在 `Statement` 壳里（`let` 与它是同一个壳）⇒ `IsStatementStart` 答否
⇒ 这一格不生效（类型标注照旧交给 `TypeDefineCloseRule`）。`a ? b :` 换行 `c` 同理。

```ts
const colonIndex = SkipPreviousTrivia(data, data.length);
const colon = Get(data, colonIndex);
if (!(colon instanceof SymbolToken) || colon.Is(":") === false) {
  return false;
}
const nameIndex = SkipPreviousTrivia(data, colonIndex);
if (!(Get(data, nameIndex) instanceof Identifier)) {
  return false;
}
// **「这个名字是不是语句开头」那一问要顺着标签链往左走**（第 929 轮片段普查量到的）：
// `a : b :` 换行 `for (…)` 里末尾那个名字是 `b`，而它前面是 `a :` ⇒ 只问第一格
// （`IsStatementStart(data, nameIndex)`）给否 ⇒ 换行处按 ASI 收壳 ⇒ 两个标签各成一条
// `LabeledStatement`（TS 那边是一条**嵌套**的）。链上任意一个名字在语句开头，
// 这一串就都是标签头——所以一格一格地往左问，不再只问末尾那一格。
let at = nameIndex;
for (;;) {
  if (IsStatementStart(data, at)) {
    break;
  }
  const earlierColonAt = SkipPreviousTrivia(data, at);
  const earlierColon = Get(data, earlierColonAt);
  if (!(earlierColon instanceof SymbolToken) || earlierColon.Is(":") === false) {
    return false;
  }
  const earlierNameAt = SkipPreviousTrivia(data, earlierColonAt);
  if (!(Get(data, earlierNameAt) instanceof Identifier)) {
    return false;
  }
  at = earlierNameAt;
}
// **`switch` 段头里的冒号不是标签冒号**（`case 1:` / `default:`）：判据与
// `Previous` 那一处问的是同一句（`text-common-util.xl.md`）。
return IsSwitchLabelColon(data, colonIndex) === false;
```

## private method IsLabeledStatement:(units:Array<Token>, index:int)=>bool

`index` 处是不是一条「可以带标签的语句」的开头。

三种都算：

- **循环 / 分支关键字**：`for` / `foreach` / `while` / `do` / `switch` / `try` / `if`。
  **第 392 轮起，其中 `if` 那一支要改成「认已经成形的语句单元」**：`if` 现在是**解析期向导**
  （`tokens/if/if-set.xl.md`）造出来的，它比本规则**更早**成形
  ⇒ `outer: if (...) {...}` 走到这里时，冒号后面已经是一个 `IfSet`，不再是散着的 `Identifier`
  （实测漏了这一格时 `decl-label-if` 报「缺 8 个节点、多出 `TypeDefine`」——
  冒号被更晚的 `TypeDefineCloseRule` 当成类型标注收走了）。
- **一个 `{` 括号**（块语句）：`outer: { … }` / `block: { … }`。
- **任意 `Identifier`**（表达式语句，或又一个标签）：`done: f()` / `a: b: for(;;) { … }`。

第 2、3 条是后加的：只认关键字时，块语句上的标签与「标签 + 表达式语句」都认不出来，
`outer:` 会被更晚的 `TypeDefineCloseRule` 当成类型标注收走
（产物里出现 `TypeDefine` 里面套 `TypeLiteral`——一个标签加一个块，被读成了「变量名 + 对象类型」）。

放宽不会误伤类型标注：`Previous` 里的「语句开头」那一关（`IsStatementStart`）已经把
`let x: T` / `a ? b : c` 这类同形写法挡在外面。

```ts
return LabelCloseRule.StatementStartsHere(units, index);
```

## static method SkipLabelHeads:(units:Array<Token>, from:int)=>int

`from` 起**一连串标签头**（`名字` + `:`）之后那一格的下标：`from` 处不是标签头就原样返回。

**为什么要有它**（第 930 轮）：`iface: interface I` 换行 `{ … }` 是**一条** `LabeledStatement`
（被标的是那条接口声明），而解析期认「声明头里的换行不是语句边界」的那一支
（`statement.xl.md` 的 `StatementBranch.Condition`）是**从段首**看第一个词的 ——
段首是 `iface` 这个名字 ⇒ 词表问不到 `interface` ⇒ 换行处收壳 ⇒
声明头与它的体分家（实测 `gap-r929-label-body-brace-newline`：缺 7 漂 2 多 11）。
标签头是**前缀**、不是这一段内容的开头，所以那一支要先跳过它。

判据与 `Previous` 同源（名字在语句开头 / 跳过 trivia / 段头冒号不算 / 冒号后面能起一条语句），
只是这里**不解**、只把游标挪过去；一处写「认一个标签」、另一处写「跳过一串标签」就是第二份会漂的答案。

```ts
let at = from;
for (;;) {
  const name = Get(units, at);
  if (!(name instanceof Identifier) || IsDeclarationModifier(name)) {
    return at;
  }
  if (IsStatementStart(units, at) === false) {
    return at;
  }
  const colonAt = SkipNextTrivia(units, at);
  const colon = Get(units, colonAt);
  if (!(colon instanceof SymbolToken) || colon.Is(":") === false) {
    return at;
  }
  if (IsSwitchLabelColon(units, colonAt)) {
    return at;
  }
  const next = SkipNextTrivia(units, colonAt);
  if (LabelCloseRule.StatementStartsHere(units, next) === false) {
    return at;
  }
  at = next;
}
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个标签：一个 `Identifier` 名字，紧跟（跨过 trivia）一个 `:` 符号，
再往后（跨过 trivia）是一条可以带标签的语句。

**注释与软换行一视同仁**（第 661 轮）：`outer/* c */: while (…)` 与 `outer:/* c */ while (…)`
都是合法排法，而只跳软换行时名字后面那一格看到的是注释 ⇒ 整条标签认不出来
（实测两种写法各把 `LabeledStatement` / `WhileStatement` / `Block` / `BreakStatement` 一起丢掉）。

名字不能是修饰词——`default:` / `case:` 那类前缀在 `../declaration-common.xl.md` 里有各自的归宿，
这里用 `IsDeclarationModifier` 把它们排掉（`default` 正在那张表里）。

```ts
const current = Get(units, index);
if (!(current instanceof Identifier) || IsDeclarationModifier(current)) {
  return false;
}
if (IsStatementStart(units, index) === false) {
  return false;
}
const colonIndex = SkipNextTrivia(units, index);
const colon = Get(units, colonIndex);
if (!(colon instanceof SymbolToken) || !colon.Is(":")) {
  return false;
}
// **`switch` 段头里的冒号不是标签冒号**（第 553 轮）：`case 1: { … }` 里
// 「`1` + `:` + `{`」三条全中 ⇒ 被收成 `<Label label="1" />` + 块 ——
// `case` 段的体于是整段丢掉（实测 `st-switch-block-case.ts` 从 7 缺变成 8 缺）。
// 判据在 `text-common-util.xl.md`（`type-define.xl.md` / `type-literal.xl.md` 问的是同一句）。
if (IsSwitchLabelColon(units, colonIndex)) {
  return false;
}
const statementIndex = SkipNextTrivia(units, colonIndex);
return this.IsLabeledStatement(units, statementIndex);
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把「名字 + 冒号」换成一个 `Label`，**返回新的下标**。

两个单元（名字与冒号）都被这个单元吸收掉，所以产物是自闭合的 `<Label label="outer" />`——
与 `Let` 吸收掉 `let` 与字段名是同一种做法。

**被标的语句是 `{` 块时要给它补一条语句队列、并且当场跑一遍**：`{` 括号一律不带队列（对象字面量的内容保持平铺），
而块里装的是语句——不补的话 `outer: { break outer }` 里的 `break` 会退化成散着的
`Identifier`，块里一个节点都收不到。补队列的时机在这里是安全的：块括号早就关闭了，
但它此刻还没有跑过任何重组（没有队列就不会跑），`TryToClose` 之后这一条队列才生效。

**收尾规则那次显式调用不能省**（与 `BlockCloseRule` 同款，第 561 轮从 `Reorganize()` 换成 `ApplyCloseRules()`）：
装队列只是装，「谁来跑」得自己叫——原来少了这一句，
块里的内容全靠后面某趟的**顺带**（那时块还是个 `ObjectLiteral`）才成形，
一旦块正确地保持成 `Bracket`（见 `text-common-util.xl.md` 的 `IsStatementList` 那一节），
里面的 `let` / `break` 就全成了散单元。实测三条标签块的用例（`decl-label-block` /
`st-label-block` / `stmt-label-block`）正是这样报出来的。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("current 为空");
}
const colonIndex = SkipNextTrivia(units, index);
const statementIndex = SkipNextTrivia(units, colonIndex);
const statement = Get(units, statementIndex);
if (statement instanceof Bracket && statement.startBracket === "{") {
  ParsePipeline.InitialCloseRuleQueue(statement);
  statement.ApplyCloseRules();
}
// **名字与冒号之间的注释在替换之前先收出来**（第 661 轮）：它们落在
// `[index, colonIndex]` 那一段里，而那一段马上整段折成 `Label` ⇒ 不收就消失
//（与 `LetBranch` / `switch` 一族同一条口径：注释照旧进树，只是不挡住相邻判断）。
//
// **位置放在 `Label` 左边**（实测）：放在右边（`<Label/><AreaAnnotation/>{…}`）会把
// 「`{` 前面那一格是标签」这条相邻判断挡掉 ⇒ 块被当成对象字面量、体里的语句整段散架
//（实测 `block /* c */: { let x = 1; console.log(x); }` 少 5 个节点）。`Label` 是自闭合的，
// 装不下子单元，所以只能待在它左边。
const kept = CommentsIn(units, index, colonIndex + 1);
const result = new Label(template);
result.Parent = current.Parent;
result.label = (current as Identifier).TempToString();
result.SignIn(current.SourceRange.Start!);
result.SignOut(Get(units, colonIndex)!.SourceRange.End!);
result.TryToClose();
const nextIndex = ReplaceCountAt(units, index, colonIndex - index + 1, result);
for (let i = 0; i < kept.length; i++) {
  units.splice(nextIndex + i, 0, kept[i]);
  kept[i].Parent = result.Parent;
}
return nextIndex + kept.length;
```

# class Label extends IndependentToken

标签前缀。

它由重组造出来、自己不消费字符，所以只继承 `IndependentToken` 的空 `Process`。

## field label:string = ""

标签名。

## method ToXmlString:()=>string

产出标签：`<Label label="outer">…</Label>`；**还没包住语句时**是自闭合的 `<Label label="outer" />`。

自闭合与 `Let` / `LineWrap` 同款：内容进了属性。第 929 轮起它**还能有子单元**
（被标的那条语句，由 `Statement.AbsorbLabels` 挂进来）——所以两种形态都要能出：
`Data` 为空是自闭合、非空是成对标签。子单元那一侧照旧逐个 `ToXmlString` 拼起来。

```ts
const name = this.constructor.name;
if (this.Data.length === 0) {
  return `<${name} label="${this.label}" />`;
}
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} label="${this.label}">${temp.join("")}</${name}>`;
```

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + `label`（+ 有子单元时的 `children`）。

键名与 `ToXmlString` 的属性同名、值同源（都是那个标签名）。
子单元（被标的那条语句）与 XML 那一侧一一对应：**为空时不写这个键**，
与基类那一份「空节点只留 `type`」同一条口径。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
result.set("label", this.label);
if (this.Data.length !== 0) {
  const children: Array<any> = [];
  for (const item of this.Data) {
    children.push(item.ToDictionary());
  }
  result.set("children", children);
}
return result;
```

## method PrintAst:(ctx:any, v:any)=>any

标签 + 被它标的语句 → `LabeledStatement`（`label` 是那个 `Identifier`，`statement` 是整条语句）。

**被标的那一段当作「一条语句」投**（与 `print-ast-common.xl.md` 里那一份**共用**：
经 `ctx.StatementOfList` 交回 `projectStatement`）——不能只投第一个单元：
`lbl: s += "1"` 里 `Data` 是 `[Identifier(s), SymbolToken(=), BinaryOperator]` 三个平铺单元，
只投第一个会把整条语句换成那个孤零零的 `Identifier`
（老形状下这一条正是实测撞出来的，见 `projectStatement` 里那段说明）。

**标签名那个 `Identifier` 的区间不含冒号**：`Label` 自己的区间从名字起（`[0,5)`），
而 TS 的 `Identifier(outer)` 也是 `[0,5)`——所以按**名字宽度**切，不从单元区间直接抄。

```ts
  const text = String(v.attrs.get("label") ?? "");
  const props: any = {
    label: { kind: "Identifier", text, pos: v.start, end: v.start + text.length },
  };
  const kids = ctx.Kids(v);
  if (kids.length === 0) {
    return ctx.Node("LabeledStatement", props, v);
  }
  const statement = ctx.StatementOfList(kids);
  if (statement === undefined) {
    return ctx.Node("LabeledStatement", props, v);
  }
  props.statement = statement;
  // **终点由被标的那条语句给**（第 929 轮，实测）：标签自己那一格区间到「搬进来的最后一格」
  // 为止，而**尾分号不在任何单元里**——`a: b: c: d/* c */ ();` 的 `;` 属于那条表达式语句
  // （TS 的 `ExpressionStatement` 含它），于是三个 `LabeledStatement` 的终点各差 1（漂 3 多 3）。
  // 投影终点那一套口径（`stmtEndOf` + 尾分号归属）已经在 `projectStatement` 里，
  // 这里**直读它的答案**，不再自己算第二份。
  if (typeof statement.end !== "number") {
    return ctx.Node("LabeledStatement", props, v);
  }
  return ctx.Node("LabeledStatement", props, { ...v, end: statement.end });
```

## method Clone:()=>Token

克隆自身（子单元一起克隆——第 929 轮起它可能包着被标的语句）。

```ts
const result = new Label(this.Template);
result.Sign(this);
result.label = this.label;
for (const item of this.Data) {
  result.Add(item.Clone());
}
result.TryToClose();
return result;
```
