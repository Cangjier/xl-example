# dependencies
```xl
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { TokenField } from "../../../core/syntax/token-field.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
import { Bracket } from "../bracket.xl.md"
import { IfSet } from "./if-set.xl.md"
import { IfBody } from "./if-body.xl.md"
import { IfCondition } from "./if-condition.xl.md"
import { IfStatement } from "./if-statement.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`if` 结构里的一段：一个关键字（`if` / `else if` / `else`）、一个可选的条件、一个可选的语句体。它由 `IfSet` 在**读的时候逐段建出来** ✓（`IfSetBranch` 在 `(` 处认下 ✓、`IfSet.Begin` 建第一段 ✓、看到关上的 `else` 再起下一段 ✓）。

# class IfSegment extends UnitToken

`if` / `else if` / `else` 的一段。

它覆写了 `ToXmlString`——这一步直接决定 XML 产物，是本文件的核心。

## field key:string = ""

这一段的原始关键字：`if` / `else`（`else if` 记的是 `if`）。

## field IfWordAt:int = -1

`else if` 里那个 `if` 的绝对偏移；不是 `else if` 这一档就是 `-1`。

**为什么让 token 记着**（用户口径：token 出字段、投影直读）：投影原来用
`ctx.source.indexOf("if", at + 4)` **回原文里找**——那是**第二份位置答案**，
`else /* if */ if (b)` 这种写法会命中注释里的那个 `if`。而 `IfSet` 造这一段时
**那个 `if` 就在手上**（`last` / `tail` 那个 `Identifier`）⇒ 当场记下来，投影只读这一格。

段的 `SourceRange.Start` 是 **`else` 的位置**（`NextSegment("if", start)` 签的是 `else` 的起点，
`else if` 里 `if` 的位置只有这一格说得出来）。

## property Condition:IfCondition | null

条件子单元：子单元列表里**第一个** `IfCondition`。

### get

找不到 `IfCondition` 时给 `null`。

```ts
for (const item of this.Data) {
  if (item instanceof IfCondition) {
    return item;
  }
}
return null;
```

### set

只在非空时 `Add(value)`；给 `null` 是**无操作**，不会移除已有的条件。

```ts
if (value !== null) {
  this.Add(value);
}
```

## protected method Close:()=>void

关闭：先标记自己，再把**最后一个子单元**（体 ✓）也关掉。

**为什么需要它**（本轮量出来的）：这一族的收尾靠**下一个字符** ✓（ASI 要「回头问」✓），
而**输入到头**时后面没有字符了 ✗ ⇒ 体一直开着 ✗ ⇒ 那一趟语句重组从来没跑过 ✗。
根单元收尾时一路 `TryToClose` 下来 ✓（`Root.Close` → `IfSet.Close` → 这里 ✓），
所以每一级只要**往下传一格** ✓。

**两个端点都要有才敢关** ✗：`TryToClose` 在区间不全时当场抛 ✓。

```ts
this.Closed = true;
const last = this.Last();
if (last !== null && last.Closed === false && last.SourceRange.Start !== null && last.SourceRange.End !== null) {
  last.TryToClose();
}
// **输入到头**那一档也收一次 ✓：这一族平时靠「下一个字符」退场 ✓，
// 到头时走的是这里 ✓ ⇒ 两条路都要把体那一对括号记下来 ✓。
this.CaptureBodyBrace();
```

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

**恒 `Undo`** ✓——本段没有「见到某个字符就收尾」这回事 ✗：
它什么时候完事，是看**自己 `Data` 里两格填满了没有** ✓（条件 ✓、体 ✓）。

```ts
return BranchStates.Undo;
```
## protected method Default:(context:SyntaxContext, source:Source)=>void

兜底处理：**空实现** ✓（与 `Bracket.Default` 同款 ✓）。不写方法体，打印器产出空方法。

## method Process:(context:SyntaxContext, source:Source)=>void

**先把字符交给正在吃的那一级** ✓；它一关上就说明「条件吃完了」✓
⇒ 由本段请父单元（`IfSet` ✓）把**体**挂上来 ✓。

**为什么这里能知道该挂体了** ✓：看自己的 `Data` ✓——里面已经有一个 `IfCondition` ✓
（`else` 段没有条件，那第一格就是体 ✓，由父单元在建段时直接挂 ✗，不经过这里 ✓）。
**不需要 `Stage` 之类的字段** ✓：答案就在树里 ✓。

```ts
// **这一格进来之前我就空着吗** ✓——不是的话，说明刚才有单元在吃，
// 而这一格正是它的**收尾符**（条件在 `)` 上含地收尾 ✓）：那不属于本段要挂的体 ✗，
// 直接放行，等下一个字符再判 ✓。
const idle = this.MountedUnit === null;
super.Process(context, source);
if (idle === false) {
  return;
}
if (this.MountedUnit !== null) {
  return;
}
const hasBody = this.Data.some((item) => item instanceof IfBody || item instanceof IfStatement);
if (hasBody) {
  // **本段干完了 ⇒ 连着往上退** ✓（用户口径：`IfBody` / `IfStatement` 根据情况连续 quit ✓）：
  // 体已经在自己的收尾符上退过一次 ✓，控制权到本段手里 ✓ ⇒ 本段也退 ✓，
  // 于是下一个字符直接落到 `IfSet` ✓，由它按 `Data` 判尾巴 ✓。
  //
  // **退之前必须给自己签出终点** ✗：不签的话，后面只要有一个新单元在本段之后出生 ✓
  // （`else` 那个 Identifier 就是 ✓），`AddAndCloseLast` 就会顺手关本段 ✗
  // ⇒ `TryToClose` 因 `End` 为空当场抛 ✓（第 44 轮实测：抛在 `[Set] Navigate("e")` ✓）。
  // 终点取**本段最后一个子单元的终点** ✓——它就是这一段写到哪儿为止 ✓。
  const tail = this.Data[this.Data.length - 1];
  if (tail !== undefined && tail.SourceRange.End !== null && this.SourceRange.End === null) {
    this.SignOut(tail.SourceRange.End);
  }
  // **体那一对括号就在这一刻收进字段** ✓：段的 `Data` 已经成形 ✓、`IfBody` 那个括号两头都签好了 ✓
  // ⇒ 投影画 `else {}` 的空 `Block` 时两格都直读 ✓，不必回原文重扫 ✓。
  this.CaptureBodyBrace();
  this.Quit();
  return;
}
// **空白不属于体** ✓：`if (a) {}` 里 `)` 与 `{` 之间那个空格要跨过去，
// 不然体会从空格开始签入 ✗、随后那个 `{` 就变成体**内部**的括号 ✗ ⇒ 它再也见不到配对的 `}` ✗。
if (source.Value === " " || source.Value === "\t" || source.Value === "\r" || source.Value === "\n") {
  return;
}
if (this.Data.length === 0) {
  return;
}
if (!(this.Data[0] instanceof IfCondition)) {
  return;
}
const parent = this.Parent;
if (parent !== null && parent.constructor.name === "IfSet") {
  (parent as IfSet).MountBodyOrStatement(context, source);
}
```

## method CreateCondition:()=>IfCondition

造一个条件子单元并挂到自己下面，返回它。

```ts
return this.Add(new IfCondition(this.Template));
```

## property Statement:IfStatement | null

语句体子单元：子单元列表里**第一个** `IfStatement`。

### get

找不到 `IfStatement` 时给 `null`。

```ts
for (const item of this.Data) {
  if (item instanceof IfStatement) {
    return item;
  }
}
return null;
```

### set

同 `Condition`：只在非空时 `Add(value)`。

```ts
if (value !== null) {
  this.Add(value);
}
```

## property Body:IfStatement | IfBody | null

本段的**体**：花括号体（`IfBody`）或单语句体（`IfStatement`）里先出现的那个。

`IfBody` 是本轮加的 ✓（花括号体由它自己吃 `{ … }` ✓）——所以在它出现之后，
「这一段的体是哪一个」不能只问 `IfStatement` ✗：`if (a) { … }` 的体是一个 `IfBody` ✓，
只问 `IfStatement` 会给 `null` ✗ ⇒ 那一段的体**根本不进 `ToDictionary`** ✗
⇒ 投影侧收到的是一个**没有** `statement` 段的段 ✓ ⇒ `Block.statements` 是空的 ✗
（实测：整个 `ReturnStatement` 子树凭空消失 ✓，全语料 7.6 万个节点挂在这一条上 ✓）。

### get

```ts
for (const item of this.Data) {
  if (item instanceof IfBody || item instanceof IfStatement) {
    return item;
  }
}
return null;
```

## method CreateStatement:()=>IfStatement

造一个语句体子单元并挂到自己下面，返回它。

```ts
return this.Add(new IfStatement(this.Template));
```

## method ToXmlString:()=>string

产出 XML：`<IfSegment key="关键字">子单元的 XML</IfSegment>`。

标签名取 `this.constructor.name`，子单元逐个 `ToXmlString()` 后拼在一起，关键字作为 `key` 属性**原样**写进标签，不做转义。

**这一处直接决定 XML 产物**：属性名是 `key`（大写 K），属性值两侧是双引号，且子单元之间**没有任何分隔符**——与 `Bracket` 那种 `startBracket="…"` 的写法同款。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} key="${this.key}">${temp.join("")}</${name}>`;
```

## field BodyBraceAt:int = -1

**体那个 `{` 的下标**；体不是花括号块（单语句 / 空语句 / 没有体）时是 `-1`。

**为什么让 token 记着**（用户口径：token 出字段、投影直读）：`MountBodyOrStatement`
就是判「`{` 还是别的」的那一处 ⇒ **括号正在手上** ⇒ 当场记下来。
投影画**空的 `else {}`** 时原来用 `indexOf("{", else 的位置 + 4)` **回原文里找** ✗——
那是**第二份位置答案**（`else /* { */ {}` 会命中注释里那个假括号），
而空块的终点照旧由 `MatchingBrace` 从这一格配出来。

## field BodyBrace:TokenField<number> = new TokenField<number>(-1)

**体那一对花括号**：值取开括号的下标，`Range` 是**整对括号**。

与 `BodyBraceAt`（一个裸下标 ✓）的分工：那一格说「`{` 在哪」✓，这一格把**配对的那个 `}`** 也带上 ✓
——与 `Try.TryBrace` / `While.BodyBrace` 同一条口径 ✓。

**为什么补这一格** ✗：投影画 `else {}` 那个空 `Block` 时 ✓，右端原来要
`MatchingBrace(ctx.source, brace)` **回原文重扫一遍** ✓ ⇒ 缩到那一格还得再扫 ✓
（见 `if-set.xl.md` 的 `PrintAst` 里「位置读字段」那一段 ✓）。可这一段**打包那一刻括号就在段里** ✓
（`IfBody` 就是那个 `Bracket` ✓，它自己的区间两头都签好了 ✓）⇒ 当场收下来 ✓，投影两格都直读 ✓。

`Range` 为空（体不是花括号块）时值也是 `-1` ✓——用 `IsSet` 判 ✓。

## method CaptureBodyBrace:()=>void

体那一格就是 `{` 时，把它的**整对区间**记进 `BodyBrace`；否则不动。

只在 `Data` 已经成形之后调（`IfSegment.Process` 里「本段干完了」那一刻 ✓）：
那时 `IfBody` 那个括号的 `Start` / `End` 都签好了 ✓。

```ts
for (const item of this.Data) {
  if (!(item instanceof IfBody)) {
    continue;
  }
  const brace = item.Data.find((x) => x instanceof Bracket && x.startBracket === "{");
  if (brace !== undefined && brace.SourceRange.Start !== null && brace.SourceRange.End !== null) {
    this.BodyBrace.Set(brace.SourceRange.Start!.Index, brace.SourceRange);
  }
  return;
}
```

## method BraceRangeText:()=>string

体那一对括号的**两格下标**，写成 `"起,止"`；没记过时给空串。

**为什么是字符串而不是两个数字** ✗：`ToDictionary` 的数组一律被当成**子单元列表** ✓
（`WithRangeOf` 会拿它们与 token 逐格配对 ✓）⇒ 一对坐标混进去会被当成一个子节点 ✗。
一个标量字符串没有这个问题 ✓，而投影拆一次就还原成两格 ✓。

```ts
if (!this.BodyBrace.IsSet || this.BodyBrace.Range === null ||
    this.BodyBrace.Range.Start === null || this.BodyBrace.Range.End === null) {
  return "";
}
// **不写成 `A.B!.C + "," + A.B.D`**（第 638 轮 ✓）：那个形状还开着一条缺口 ✓
//（见 `docs/typescript-parsing-gaps.md` 的「`!` 断言的成员链再接二元运算符」✓）——
// 规范源码自己就是 `cases:tsast` 的语料 ✓，踩上它这一整个文件就不过 ✓。
const from = String(this.BodyBrace.Range.Start!.Index);
const to = String(this.BodyBrace.Range.End!.Index);
return from + "," + to;
```

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + `key`，外加两个可选段。

`key` 与 XML 的 `key` 属性同源，取的都是这个字段（`if` / `else`；`else if` 记的是 `if`）。

`condition` 与 `statement` 都**只在对应的 getter 不是 `null` 时才写**：`else` 段没有条件、
`else` 之后没有体时这两个属性给 `null`，此时不写这个键——与 XML 里「没有那个子单元」同一件事。

两段的值取 `ToList()`：条件与体各是**一批**子单元，而 `Condition` / `Statement` 正是按类型从 `Data`
里挑出来的那一个段节点；摊成扁平的 `children` 会把「哪一段是条件、哪一段是体」抹掉，
而这两段本来就是靠类型（而不是位置）认出来的。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
result.set("key", this.key);
// **`else if` 那个 `if` 的位置**：只有这一档才写这一格（其余段是 `-1`，写进去只是噪声）。
if (this.IfWordAt >= 0) {
  result.set("ifWordAt", this.IfWordAt);
}
// **体那个 `{` 的位置也写出去**（与 `While` / `For` 的 `bodyBraceAt` 同一条口径）：
// 投影画空 `Block` 时直读，不再回原文重扫。
if (this.BodyBraceAt >= 0) {
  result.set("bodyBraceAt", this.BodyBraceAt);
}
// **整对括号也写出去**（第 637 轮）：投影画 `else {}` 的空 `Block` 时右端直读它 ✓
//（原来要靠 `MatchingBrace` 回原文重扫那一趟 ✓）。标量字符串，见 `BraceRangeText`。
const braceRange = this.BraceRangeText();
if (braceRange !== "") {
  result.set("bodyBraceRange", braceRange);
}
if (this.Condition !== null) {
  result.set("condition", this.Condition.ToList());
}
// **体那一格问 `Body`** ✓（`IfBody` / `IfStatement` 都认 ✓），不能只问 `IfStatement` ✗——
// 只问它的话花括号体整段不进字典 ✓，投影侧那个 `Block` 就是空的 ✗。
if (this.Body !== null) {
  result.set("statement", this.Body.ToList());
}
return result;
```

## method Clone:()=>Token

克隆自身。

新建一个、**先把 `key` / `IfWordAt` / `BodyBraceAt` 复制过去**（漏了它克隆体就丢掉关键字、`else if` 与体的位置）、`Sign(this)`、把子单元逐个克隆后 `AddRange`、最后 `TryToClose()`。

```ts
const result = new IfSegment(this.Template);
result.key = this.key;
result.IfWordAt = this.IfWordAt;
result.BodyBraceAt = this.BodyBraceAt;
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
