# dependencies
```xl
import { ShapeToken } from "../shape-token.xl.md"
import { SyntaxContext } from "../syntax-context.xl.md"
import { Token } from "../token.xl.md"
import { BasicTokenBatch } from "./basic-token-batch.xl.md"
import { ItemScanState } from "./item-scan-state.xl.md"
import { ItemStateCache } from "./item-state-cache.xl.md"
import { RawFallback } from "./raw-fallback.xl.md"
```

# namespace cangjie

item 表引擎：**判定增量、建造整体**。每个容器一个引擎，规则由语言侧以 `ItemRule` 注入。
引擎不新建 AST（INV-7），只调用既有建造器；不完整时留 raw 回退。

契约修正（见 `docs/refactor/batch-contract-amendment.md`，按 WP-2 的 G0–G6）：
① 整批消费（一批内可连续建出多个 item）；② 先记 `PendingBuild`、消费完整批后一次压实替换（INV-3）；
③ item 右界用 `State.End + 1`（`End >= 0`），否则 `Checked`；④ item 起点取首个**非 trivia** unit；
⑤ `batch.AtEof` 且无新增 unit 时也调一次 `Analyze`；⑥ `Flush` 把未收口尾巴写进 `RawFallback`；
⑦ 引擎**从未消费过任何 unit**（`Start < 0` 且 `Checked < 0`）时，批次起点之前那段连续的非形状 unit
（例如 `const` 还没关闭就被 BOM 抢走了字符，它永远等不到自己的 `Close`）也并进本批：它们没有别的批次会喂，
漏掉就等于整条 item 从起点就丢了。

# class PendingBuild

批内一次**推迟的建造**：`Feed` 消费完整批后一次性压实替换（INV-3）。
`From` / `To` 都是**替换之前**的宿主 `Data` 坐标（压实只在被替换点右侧改变下标，
因此待处理点左侧的下标在整个批内保持有效）。

## field From:int = -1

item 区间起点（宿主 `Data` 下标，含）。

## field To:int = -1

item 区间终点（宿主 `Data` 下标，不含）。**不是** `Checked`：这里是 `State.End + 1`。

## field Item:Token | null = null

已经建好的 item（`ItemRule.Build` 的返回值），splice 时替换 `[From, To)`。

## constructor:(from:int, to:int, item:Token)=>void

```ts
this.From = from;
this.To = to;
this.Item = item;
```

# interface ItemRule

## method Classify:(code:Array<Token>)=>Array<int>

读前缀判型：返回命中的规则内部 kind 号；空数组 = 未知（不抛）。

## method Extend:(state:ItemScanState, units:Array<Token>, tokenIndex:int)=>void

只推进新 unit（`[Checked, To)`），不改已算过的结论。签名不变：EOF 事实走 `ItemScanState.AtEof`。

## method Analyze:(state:ItemScanState)=>void

置 `Complete` / `End`（收口判定）。

`End` 是 item 最后一个代码 unit 的**宿主 `Data` 下标**（PLAN §1.2）；规则内部若用 `Code` 下标，
自己经 `state.CodeAt[index]` 映射后再写 `End`。`End` 允许早于 `state.Checked - 1`（lookahead 已读、
但不属于本 item），引擎按 `End + 1` 切，剩余 unit 留给下一条 item。

## method Build:(host:Token, state:ItemScanState, context:SyntaxContext)=>Token | null

只调既有建造器；返回 `null` 表示建不出（走 raw 回退）。

引擎在调用前已把 `state.Code` / `state.CodeAt` **裁到 `[Start, End + 1)`**（`TrimTo`），
因此 `Build` 看不到 `End` 之后的 lookahead unit，直接按 `state.Code` 建即可。

**不得修改 `host.Data`**：splice 由引擎在整批消费完后统一做，建造时看到的宿主下标仍是 splice 前坐标。

## method IncludesSeparator:()=>bool

`;` / `,` 是否进 item 区间（逐族声明）。

# class ItemListEngine

## field Rules:Array<ItemRule> = []

本容器的规则表（顺序即判定顺序）。

## field Cache:ItemStateCache = new ItemStateCache()

判定缓存。

## field State:ItemScanState = new ItemScanState()

当前 item 的扫描状态。

## field CurrentRule:int = -1

当前 item 命中的规则下标；`-1` 表示还没判出。

## field Built:int = 0

本引擎累计建出的 item 数（单调递增）。适配器用 `Feed` 前后的差值判断「本批建出了 item」
（决定返回 `BatchStates.Done` 还是 `NeedMore`），不必读 `host.Data`。

## field RawFrom:int = -1

`ItemRule.Build` 返回 `null` 的区间起点（宿主 `Data` 下标，含）；`-1` 表示没有这样的区间。
交给下一次 `Flush` 写进 `RawFallback`（`Reason = "build-null"`）。

## field RawTo:int = -1

上述区间终点（不含）。

## method Feed:(host:Token, batch:BasicTokenBatch, context:SyntaxContext)=>void

消费一个批次的**全部**未消费 unit `[batch.Cursor, batch.To)`（INV-1/INV-2/INV-4）。
批内可以连续建出多个 item；建造立即发生（与 legacy 逐 token 建出的时机一致），
替换推迟到批末、一次压实（INV-3）。

**批首之前的补读（契约 ⑦）**：宿主给的批次起点是「刚关闭的那个 unit」，前提是它之前的 unit 都被喂过。
这个前提在「basic token 没等到自己的关闭就被另一个 basic token 抢走字符」时会破（`const` 后紧跟 BOM：
`Bom.Transit` 直接吞掉字符并关闭，`const` 一直开着，`Common.Transit` 再也不会替它 `TryToClose`），
于是 `const` 留在 `Data` 里、不属于任何批次，`Start` 永远等不到它，整条语句从起点被切掉、只能落进 raw 段。
本引擎从未消费过任何 unit 时（`Start < 0 && Checked < 0`）没有历史结论要保护，
因此把 `from` 往前推到最近的形状 unit 之后，把这些「没人喂」的 unit 并进本批。
已消费过时不动：那时 `Checked` 就是权威边界，往前后退会重读已经算过的 unit。

```ts
if (batch.Cursor < batch.From) {
  batch.Cursor = batch.From;
}
let from = batch.Cursor;
if (from > 0 && this.State.Start < 0 && this.State.Checked < 0) {
  let back = from;
  while (back > 0 && !(host.Data[back - 1] instanceof ShapeToken)) {
    back = back - 1;
  }
  from = back;
}
if (from >= batch.To && !batch.AtEof) {
  this.Cache.End(batch.To);
  return;
}
this.State.AtEof = batch.AtEof;
this.Cache.Begin(from);
const builds: Array<PendingBuild> = [];
let i = from;
while (i < batch.To) {
  const unit = host.Data[i];
  if (unit === undefined) {
    i = i + 1;
    continue;
  }
  if (this.State.Start < 0 && !unit.IsTriviaToken) {
    this.State.Start = i;
  }
  if (unit.IsTriviaToken) {
    this.State.Checked = i + 1;
    this.State.HasLineBreak = this.State.HasLineBreak || this.LineBreakAt(host, unit);
    i = i + 1;
    continue;
  }
  this.State.Code.push(unit);
  this.State.CodeAt.push(i);
  this.State.LastCode = i;
  this.State.Checked = i + 1;
  if (this.CurrentRule < 0) {
    this.CurrentRule = this.ClassifyFirst();
  }
  if (this.CurrentRule >= 0) {
    const rule = this.Rules[this.CurrentRule];
    rule.Extend(this.State, [unit], i);
    rule.Analyze(this.State);
  }
  if (this.State.Complete) {
    const to = this.ItemEnd();
    this.RecordBuild(host, context, to, builds);
    i = to;
    continue;
  }
  i = i + 1;
}
if (batch.AtEof && this.State.Start >= 0 && this.CurrentRule >= 0 && !this.State.Complete) {
  const rule = this.Rules[this.CurrentRule];
  rule.Analyze(this.State);
  if (this.State.Complete) {
    this.RecordBuild(host, context, this.ItemEnd(), builds);
  }
}
this.ApplyBuilds(host, batch, builds);
this.Cache.End(host.Data.length);
```

## method Flush:(host:Token, context:SyntaxContext, rawFallback:RawFallback)=>Array<Token>

硬边界收口：能建就建（右界同样用 `ItemEnd`），建不出或「item 已建、尾巴未建」时把区间写进
`rawFallback`，然后复位。尾巴区间是 splice 之后的坐标，宿主可直接交给 raw 建造器。

```ts
const items: Array<Token> = [];
const rule = this.CurrentRule >= 0 ? this.Rules[this.CurrentRule] : null;
const start = this.State.Start;
const checked = this.State.Checked;
let item: Token | null = null;
let to = checked;
if (rule !== null && start >= 0 && this.State.Complete) {
  to = this.ItemEnd();
  this.TrimTo(to);
  item = rule.Build(host, this.State, context);
}
if (item !== null && to > start) {
  item.Parent = host;
  host.Data.splice(start, to - start, item);
  items.push(item);
  this.Built = this.Built + 1;
  if (!rawFallback.IsArmed() && checked > to) {
    rawFallback.From = start + 1;
    rawFallback.To = checked - (to - start - 1);
    rawFallback.Reason = "incomplete";
  }
} else if (!rawFallback.IsArmed() && start >= 0 && checked > start) {
  rawFallback.From = start;
  rawFallback.To = checked;
  rawFallback.Reason = rule === null ? "classify-failed" : "incomplete";
}
if (!rawFallback.IsArmed() && this.RawFrom >= 0 && this.RawTo > this.RawFrom) {
  rawFallback.From = this.RawFrom;
  rawFallback.To = this.RawTo;
  rawFallback.Reason = "build-null";
}
this.RawFrom = -1;
this.RawTo = -1;
this.ResetState();
this.Cache.Reset();
return items;
```

## method Reset:()=>void

复位整台引擎（换宿主 / 卸载时）。

```ts
this.CurrentRule = -1;
this.Built = 0;
this.RawFrom = -1;
this.RawTo = -1;
this.ResetState();
this.Cache.Reset();
```

## private method RecordBuild:(host:Token, context:SyntaxContext, to:int, builds:Array<PendingBuild>)=>void

建出当前 item（或记 raw），把状态复位到下一条 item 的起点 `to`。
`[End + 1, Checked)` 的 unit 不并入本 item：`i = to` 让它们被下一条 item 重新读一次（lookahead 代价）。

```ts
if (to < 0) {
  this.ResetState();
  return;
}
const rule = this.CurrentRule >= 0 ? this.Rules[this.CurrentRule] : null;
let item: Token | null = null;
if (rule !== null && this.State.Start >= 0) {
  this.TrimTo(to);
  item = rule.Build(host, this.State, context);
}
if (item !== null) {
  item.Parent = host;
  builds.push(new PendingBuild(this.State.Start, to, item));
  this.Built = this.Built + 1;
} else if (this.State.Start >= 0 && to > this.State.Start) {
  if (this.RawFrom < 0) {
    this.RawFrom = this.State.Start;
    this.RawTo = to;
  }
}
this.ResetState();
this.State.Checked = to;
```

## private method ApplyBuilds:(host:Token, batch:BasicTokenBatch, builds:Array<PendingBuild>)=>void

**批末一次压实**：把逐 item 的 `splice` 合成一次从左到右的线性搬移，然后把批次视图与 `State`
的宿主下标重定位到压实之后。`batch.Cursor` = 下一个未消费的宿主下标；宿主据此续喂（`NeedMore`）
或清批（`Done`）。

逐 item `splice` 每次都要搬 `Data` 的剩余尾巴，item 多时叠加成 O(n²)；而批内替换区间互不重叠
且从左到右（`Feed` 的顺序产出），所以一次「读 src / 写 dst」压实与「从右向左逐个 `splice`」
得到逐位相同的数组：区间位置换成 item，区间外的 unit 保持原序。`dst <= src` 恒成立
（每个区间至少换掉一格、只写入一个 item），前向复制不会覆盖还没读到的 unit，数组对象本身
也不被替换。INV-3 的语义仍然成立：被替换点左侧的下标在整个批内始终有效。

```ts
if (builds.length === 0) {
  if (batch.Cursor < batch.To) {
    batch.Cursor = batch.To;
  }
  return;
}
const data = host.Data;
// 第一个有效替换点左侧的 unit 一个都不搬：从它开始压实，省掉每批扫一遍前缀。
let start = 0;
for (let i = 0; i < builds.length; i++) {
  const from = builds[i].From;
  const to = builds[i].To;
  if (from >= 0 && to > from && from <= data.length) {
    start = from;
    break;
  }
}
let src = start;
let dst = start;
let removed = 0;
for (let i = 0; i < builds.length; i++) {
  const from = builds[i].From;
  const to = builds[i].To;
  if (from < 0 || to <= from) {
    continue;
  }
  while (src < from) {
    if (dst !== src) {
      data[dst] = data[src];
    }
    src = src + 1;
    dst = dst + 1;
  }
  data[dst] = builds[i].Item as Token;
  dst = dst + 1;
  src = to;
  removed = removed + (to - from - 1);
}
const oldLength = data.length;
while (src < oldLength) {
  if (dst !== src) {
    data[dst] = data[src];
  }
  src = src + 1;
  dst = dst + 1;
}
if (dst < oldLength) {
  data.length = dst;
}
// 本批所有替换都在 `batch.To` 左侧：一次减掉净压缩量，与逐 build 的从右向左计数等价。
let cursor = batch.To - removed;
if (cursor > dst) {
  cursor = dst;
}
if (this.State.Start >= 0) {
  this.State.Start = this.Rebase(this.State.Start, builds);
}
if (this.State.Checked >= 0) {
  this.State.Checked = this.Rebase(this.State.Checked, builds);
}
if (this.State.End >= 0) {
  this.State.End = this.Rebase(this.State.End, builds);
}
if (this.State.LastCode >= 0) {
  this.State.LastCode = this.Rebase(this.State.LastCode, builds);
}
// CodeAt 是**升序**的，`builds` 也是升序的（Feed 从左到右产出）：把「逐下标 × 逐 build」的
// O(单元数 × 本批 item 数) 重定位换成一次双指针合并 O(单元数 + 本批 item 数)。
// 与 `Rebase` 逐项等价：左侧 build（`To <= value`）累计压缩量；落在 `(From, To)` 内部的点收束到 `From`。
const codeAt = this.State.CodeAt;
let buildAt = 0;
let shift = 0;
for (let i = 0; i < codeAt.length; i++) {
  let value = codeAt[i];
  if (value < 0) {
    continue;
  }
  while (buildAt < builds.length) {
    const from = builds[buildAt].From;
    const to = builds[buildAt].To;
    if (to <= from) {
      buildAt = buildAt + 1;
      continue;
    }
    if (value < to) {
      break;
    }
    shift = shift + (to - from - 1);
    buildAt = buildAt + 1;
  }
  if (buildAt < builds.length) {
    const from = builds[buildAt].From;
    const to = builds[buildAt].To;
    if (value > from && value < to) {
      codeAt[i] = from;
      continue;
    }
  }
  codeAt[i] = value - shift;
}
const length = host.Data.length;
if (cursor > length) {
  cursor = length;
}
if (cursor < 0) {
  cursor = 0;
}
batch.From = cursor;
batch.To = length;
batch.Cursor = cursor;
batch.Sealed = false;
batch.Recompute();
```

## private method TrimTo:(to:int)=>void

把 `state.Code` / `state.CodeAt` 截到 `[Start, to)`：`End` 之后的 lookahead unit 不属于本 item，
建造器不应看到它们。裁剪只影响 `Build` 的输入，`Checked` 仍是已消费边界（尾巴要重放）。

```ts
const codeAt = this.State.CodeAt;
let keep = codeAt.length;
while (keep > 0 && codeAt[keep - 1] >= to) {
  keep = keep - 1;
}
if (keep === codeAt.length) {
  return;
}
this.State.Code = this.State.Code.slice(0, keep);
this.State.CodeAt = codeAt.slice(0, keep);
this.State.LastCode = keep > 0 ? this.State.CodeAt[keep - 1] : -1;
```

## private method ItemEnd:()=>int

item 的右界（宿主 `Data` 下标，不含）：`End + 1`（`End >= 0`），否则 `Checked`。

```ts
let end = this.State.Checked;
if (this.State.End >= 0) {
  end = this.State.End + 1;
}
if (end <= this.State.Start) {
  end = this.State.Checked;
}
if (end > this.State.Checked) {
  end = this.State.Checked;
}
return end;
```

## private method Rebase:(value:int, builds:Array<PendingBuild>)=>int

把一个 splice 之前的宿主下标映射到 splice 之后。落在被替换区间内部的点收束到 item 位置
（正常路径不会发生：待处理 item 的起点总在被替换区间的右侧）。

```ts
if (value < 0) {
  return value;
}
let result = value;
for (let i = 0; i < builds.length; i++) {
  const from = builds[i].From;
  const to = builds[i].To;
  if (to <= from) {
    continue;
  }
  if (value >= to) {
    result = result - (to - from - 1);
  } else if (value > from) {
    result = from;
  }
}
return result;
```

## private method ClassifyFirst:()=>int

首 token 一级判型：第一条认领的规则获胜。

```ts
const code = this.State.Code;
for (let i = 0; i < this.Rules.length; i++) {
  if (this.Rules[i].Classify(code).length > 0) {
    return i;
  }
}
return -1;
```

## private method LineBreakAt:(host:Token, unit:Token)=>bool

单元文本里有没有换行（trivia 也算，用于 ASI 判据的批元信息）。

```ts
const document = host.SourceRange.Document;
if (document === null || unit.SourceRange.Start < 0 || unit.SourceRange.End < 0) {
  return false;
}
return document.GetRaw(unit.SourceRange.Start, unit.SourceRange.End).indexOf("\n") >= 0;
```

## private method ResetState:()=>void

只复位当前 item 的扫描状态（`AtEof` 是文档级事实，不在这里清；每次 `Feed` 入口覆盖）。

```ts
this.CurrentRule = -1;
this.State.Reset(-1);
```
