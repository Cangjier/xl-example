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

## protected method Default:(context:SyntaxContext, source:Source)=>void

兜底处理：空实现 ✓（字符全交给跳转队列造子单元 ✓）。

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

花括号体：终止符含地退出 ✓。单语句体：标记立起来 ⇒ 不含地退出 ✓。

**收尾时要把多吃的字还回去** ✓——体可能截止在**非最后一格** ✓，
所以要把**截止之后的每一个字**重新发出去（走消息 ✓，交给 `ReloadOwner` ✓）：

- 次序是**先发消息、再摘单元、最后退** ✓（反过来会把字送回自己手里 ⇒ 死循环 ✓）；
- 发的是**字**（逐个位置 ✓），不是把单元搬走 ✗——外层要重新词法化它们 ✓。

```ts
if (this.BodyEnded) {
  const previous = source.Pre();
  if (previous === null) {
    this.SignOut(source);
    this.TryToClose();
    this.Quit();
    return BranchStates.Done;
  }
  const over = this.Data.slice(this.BodyEndIndex + 1);
  for (const item of over) {
    const start = item.SourceRange.Start;
    const end = item.SourceRange.End;
    item.RemoveSelf();
    if (start === null || end === null) {
      continue;
    }
    const owner = this.ReloadOwner ?? this.Parent;
    if (owner === null) {
      continue;
    }
    for (let i = start.Index; i <= end.Index; i++) {
      context.Messages.push(new ReloadMessage(owner, this, start.Document.At(i)));
    }
  }
  this.SignOut(previous);
  this.TryToClose();
  this.Quit();
  this.QuitOuter();
  return BranchStates.Done;
}
return BranchStates.Undo;
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
