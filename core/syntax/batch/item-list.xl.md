# dependencies
```xl
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

# interface ItemRule

## method Classify:(code:Array<Token>)=>Array<int>

读前缀判型：返回命中的规则内部 kind 号；空数组 = 未知（不抛）。

## method Extend:(state:ItemScanState, units:Array<Token>, tokenIndex:int)=>void

只推进新 unit（`[Checked, To)`），不改已算过的结论。

## method Analyze:(state:ItemScanState)=>void

置 `Complete` / `End`（收口判定）。

## method Build:(host:Token, state:ItemScanState, context:SyntaxContext)=>Token | null

只调既有建造器；返回 `null` 表示建不出（走 raw 回退）。

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

## method Feed:(host:Token, batch:BasicTokenBatch, context:SyntaxContext)=>void

消费一个批次：**只处理 `[batch.From, batch.To)` 的新 unit**（INV-1/INV-2/INV-4）。

```ts
if (batch.To <= batch.From) {
  return;
}
this.Cache.Begin(batch.From);
for (let i = batch.From; i < batch.To; i++) {
  const unit = host.Data[i];
  if (unit === undefined) {
    continue;
  }
  if (this.State.Start < 0) {
    this.State.Start = i;
  }
  if (unit.IsTriviaToken) {
    this.State.Checked = i + 1;
    this.State.HasLineBreak = this.State.HasLineBreak || this.LineBreakAt(host, unit);
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
    this.BuildItem(host, context);
    return;
  }
}
this.Cache.End(batch.To);
```

## method Flush:(host:Token, context:SyntaxContext, rawFallback:RawFallback)=>Array<Token>

硬边界收口：能建就建，建不出就记 raw 回退，然后复位。

```ts
const items: Token[] = [];
if (this.State.Start < 0) {
  this.ResetState();
  return items;
}
const rule = this.CurrentRule >= 0 ? this.Rules[this.CurrentRule] : null;
let item: Token | null = null;
if (rule !== null && this.State.Complete) {
  item = rule.Build(host, this.State, context);
}
if (item !== null) {
  item.Parent = host;
  host.Data.splice(this.State.Start, Math.max(0, this.State.Checked - this.State.Start), item);
  items.push(item);
} else if (this.State.Code.length > 0 && !rawFallback.IsArmed()) {
  rawFallback.From = this.State.Start;
  rawFallback.To = this.State.Checked;
  rawFallback.Reason = "incomplete";
}
this.ResetState();
this.Cache.Reset();
return items;
```

## method Reset:()=>void

复位整台引擎（换宿主 / 卸载时）。

```ts
this.CurrentRule = -1;
this.ResetState();
this.Cache.Reset();
```

## private method BuildItem:(host:Token, context:SyntaxContext)=>void

建造一个已收口的 item：调用 `ItemRule.Build`，成功就从右向左替换成 item（INV-3）。

```ts
if (this.CurrentRule < 0) {
  this.ResetState();
  return;
}
const rule = this.Rules[this.CurrentRule];
const item = rule.Build(host, this.State, context);
if (item !== null) {
  item.Parent = host;
  const from = this.State.Start;
  const to = this.State.Checked;
  if (from >= 0 && to > from) {
    host.Data.splice(from, to - from, item);
  }
}
this.ResetState();
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

只复位当前 item 的扫描状态。

```ts
this.CurrentRule = -1;
this.State.Reset(-1);
```
