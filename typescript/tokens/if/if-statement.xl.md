# dependencies
```xl
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { ReloadMessage } from "../../../core/syntax/messages/reload-message.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
import { Statement } from "../statement.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`if` / `else` 后面的**单语句体**：`<IfStatement>…</IfStatement>`。花括号体由 `IfBody` 承担 ✓。

# class IfStatement extends UnitToken

`if` / `else if` / `else` 的单语句体。

## field BodyEnded:bool = false

体已经写完了 ✓——下一个字符按「不含地」交回 ✓。

## field BodyEndIndex:int = -1

体真正结束在 `Data` 的哪一格 ✓（分号或软换行的下标 ✓）——收尾时靠它把**后面多吃的**摘掉 ✓。

## constructor:(template:Template)=>void

创建体单元，并挂上语句重组队列 ✓。

```ts
super(template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor);
ParsePipeline.InitialStatementReorganizationQueue(this);
```

## protected method Close:()=>void

关闭：先标记自己，再把**最后一个子单元**也关掉。

**为什么需要它**（本轮量出来的）：本体的收尾本来就靠**下一个字符** ✓ ——
`ExitOrPre` 要等下一个字符到了才「回头问」`IsLineBreakBoundary` ✓（ASI 只能这么问 ✓，
在换行那一格问不出结论 ✓）。可**输入到头**时后面没有字符了 ✗ ⇒ 体一直是开着的 ✗
⇒ 它那一趟语句重组从来没跑过 ✗。

实测（`tests/parse/cases/statements/stmt-if-no-block.ts`：`if (a) f()` 后面什么都没有 ✓）：
`<IfStatement>` 里是散的 `Identifier(f)` + `Bracket(())` ✓ ⇒ 投影出来的 `thenStatement`
是一个**包着 `f()` 的假 `Block`** ✗（缺 `ExpressionStatement` + 缺 `CallExpression` ✓）。

根单元收尾时会一路往下 `TryToClose` ✓（`Root.Close` 起头 ✓），所以这里只要**往下传一格** ✓。
**两个端点都要有才敢关** ✗：`TryToClose` 在区间不全时当场抛 ✓，
而「输入到头」那一趟 `SignOut` 已经把整条链的两个端点都递归签好了 ✓。

```ts
this.Closed = true;
const last = this.Last();
if (last !== null && last.Closed === false && last.SourceRange.Start !== null && last.SourceRange.End !== null) {
  last.TryToClose();
}
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

兜底处理：空实现 ✓（字符全交给跳转队列造子单元 ✓）。

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

花括号体：终止符含地退出 ✓。单语句体：标记立起来 ⇒ 不含地退出 ✓。

**收尾时要把多吃的字还回去** ✓——体可能截止在**非最后一格** ✓，
所以要把**截止之后的每一个字**重新发出去（走消息 ✓，交给 `ReloadOwner` ✓）：

- 次序是**先发消息、再摘单元、最后退** ✓（反过来会把字送回自己手里 ⇒ 死循环 ✓）；
- 发的是**字**（逐个位置 ✓），不是把单元搬走 ✗——外层要重新词法化它们 ✓。

```ts
// **外层块的收尾符也要认**（本轮量出来的）：`if` 的单语句体可以一直写到**外层那个 `}`** 为止
//（`else break label1 }` —— JS 里 `}` 就把这条语句收住了，根本不需要分号 / 换行）。
// 本工程本来就有这条契约：`Token.Owns` 问的就是「这个字符归不归你」，
// `Bracket` 覆写了它（`source.Value === this.endBracket`）—— 只是**没人问过**。
// 不问的后果：那个 `}` 被当成体里的一个 `SymbolToken` 吃掉 ✗
// ⇒ 整条 `for` / 标签语句一直拖到下一个 `}` ✓
//（实测 `stmt-adversarial-shapes.ts`：`LabeledStatement` 从 `[586,658)` 变成 `[586,1105)` ✗）。
if (this.OwnedByAncestor(source)) {
  this.CloseBody(context, source, this.Data.length - 1);
  return BranchStates.Done;
}
if (this.BodyEnded) {
  const data = this.Data;
  // **体真正写到哪一格**：`BodyEndIndex` 那两处语义**不一样** ——
  // 分号那一支（`if (a) f();`）里 `;` **是体的终结符** ⇒ 含它；
  // 软换行那一支（ASI）里那个换行**是边界、不属于体** ⇒ 止于它**前面**那一格。
  // 原来一律 `slice(BodyEndIndex + 1)`、再「签出到当前字符的前一格」✗ ⇒
  // 体的终点被**多签**一格、而**当前这一个字符被吃掉**✗
  //（实测 `if (a) f()` 换行 `if (b) g()`：第二条 `if` 的 `i` 与 `f` 被吞进第一条的体里，
  //  第二条整个消失 ✗）。
  const boundary = this.BodyEndIndex >= 0 && this.BodyEndIndex < data.length ? data[this.BodyEndIndex] : null;
  const bodyLast = boundary instanceof SymbolToken && boundary.Is(";") ? this.BodyEndIndex : this.BodyEndIndex - 1;
  this.CloseBody(context, source, bodyLast);
  return BranchStates.Done;
}
return BranchStates.Undo;
```

## private method OwnedByAncestor:(source:Source)=>bool

当前字符是不是**某个祖先单元的收尾符**（`}` 之类）。

往上走一遍，问每一级的 `Owns` ✓——`Bracket` 覆写了它 ✓，`IfBody` 也覆写 ✓
（`if (a) { if (b) f() }` 里内层那条单语句体，就是被外层 `IfBody` 的 `}` 收住的 ✓）。

**为什么不在这一层做聚合** ✗：`Owns` 的语义是「**你自己**的收尾符」✓，
聚合到这一层就变成「祖先里有没有人在等这个字符」的**第二份答案** ✗
（`core/syntax/token.xl.md` 的 `Owns` 那一节写着这条口径 ✓）。

```ts
let node: Token | null = this.Parent;
while (node !== null) {
  if (node.Owns(source)) {
    return true;
  }
  node = node.Parent;
}
return false;
```

## private method CloseBody:(context:SyntaxContext, source:Source, bodyLast:int)=>void

体收在 `bodyLast` 那一格：把**多吃的字**（`bodyLast` 之后每一个单元、**外加当前这一格**）
按原序还给宿主 ✓，签出到体的最后一格 ✓，关自己 ✓、再连退两级 ✓。

- 次序是**先发消息、再摘单元、最后退** ✓（反过来会把字送回自己手里 ⇒ 死循环 ✓）；
- 发的是**字**（逐个位置 ✓），不是把单元搬走 ✗——外层要重新词法化它们 ✓；
- **入队要倒着来** ✗：`SyntaxContext.DrainMessages` 把每条 `ReloadMessage` 都**插在队首** ✓，
  所以「先 push 的」反而「后处理」✓ —— 正序 push 会把字符次序颠倒 ✓。

```ts
const data = this.Data;
const owner = this.ReloadOwner ?? this.Parent;
const returning: Source[] = [];
for (const item of data.slice(bodyLast + 1)) {
  const start = item.SourceRange.Start;
  const end = item.SourceRange.End;
  item.RemoveSelf();
  if (start === null || end === null) {
    continue;
  }
  for (let i = start.Index; i <= end.Index; i++) {
    returning.push(start.Document.At(i));
  }
}
returning.push(source);
if (owner !== null) {
  for (let i = returning.length - 1; i >= 0; i--) {
    context.Messages.push(new ReloadMessage(owner, this, returning[i]));
  }
}
const lastBody = bodyLast >= 0 && bodyLast < data.length ? data[bodyLast] : null;
if (this.SourceRange.End === null) {
  if (lastBody !== null && lastBody.SourceRange.End !== null) {
    this.SignOut(lastBody.SourceRange.End);
  } else {
    const previous = source.Pre();
    if (previous !== null) {
      this.SignOut(previous);
    } else {
      this.SignOut(source);
    }
  }
}
this.TryToClose();
this.Quit();
this.QuitOuter();
```

## method Process:(context:SyntaxContext, source:Source)=>void

**先把字符交给队列** ✓，然后**回头看** ✓——这是 ASI 在解析期唯一合法的问法 ✓。

**为什么不往前看** ✗：`Statement.IsStatementEnd` 与 `IsLineBreakBoundary` 那一族是 **reorg 期**的判据 ✓
（它们在完整的平列表上「往后跨过软换行看下一个单元」✓）；解析期在换行那一格**看不到后面** ✗，
它只会落进「列表末尾 ⇒ 断句」✓ ⇒ **静默错值** ✗。

**改成回头问** ✓：队列刚刚可能造出一个新单元 ✓ ⇒ 此刻「换行」与「下一行的第一个单元」都在 `Data` 里 ✓
⇒ 问 `IsLineBreakBoundary(data, 换行下标)` 两端俱全 ✓，判据一个字不改 ✓。

```ts
super.Process(context, source);
if (this.Closed || this.BodyEnded) {
  return;
}
const data = this.Data;
const last = data.length - 1;
if (last < 1) {
  return;
}
const newest = data[last];
if (newest instanceof SymbolToken && newest.Is(";")) {
  this.BodyEnded = true;
  this.BodyEndIndex = last;
  return;
}
const before = data[last - 1];
if (before instanceof SymbolToken && before.Is(";")) {
  this.BodyEnded = true;
  this.BodyEndIndex = last - 1;
  return;
}
if (before.constructor.name === "LineWrap") {
  if (Statement.IsLineBreakBoundary(data, last - 1)) {
    this.BodyEnded = true;
    this.BodyEndIndex = last - 1;
  }
}
```

## method QuitOuter:()=>void

体收尾时把**段**也退掉（连续 quit），并顺手给段自签终点（不签的话它被关时会抛）。

于是尾巴的**第一个字符**直接落到 IfSet 手里，整词（else 之类）在那边正常词法化。

```ts
const outer = this.Parent;
if (outer !== null && outer.constructor.name === "IfSegment") {
  const tail = outer.Data[outer.Data.length - 1];
  if (tail !== undefined && tail.SourceRange.End !== null && outer.SourceRange.End === null) {
    outer.SignOut(tail.SourceRange.End);
  }
  outer.Quit();
}
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new IfStatement(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
