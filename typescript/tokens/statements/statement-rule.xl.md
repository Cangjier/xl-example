# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { ShapeCatalog } from "../../../core/syntax/shape-catalog.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { ShapeRule } from "../../../core/syntax/shape-rule.xl.md"
import { ItemSlotCache } from "../../../core/syntax/item-slot-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { StatementScanResult } from "./statement-scanner.xl.md"
import { StatementScanner } from "./statement-scanner.xl.md"
import { StatementBuilder } from "./statement-builder.xl.md"
```

# namespace cangjie

# class StatementScan

## field Start:int = -1

## field Checked:int = -1

## field Status:int = 0

## field End:int = -1

## field Code:Array<Token> = []

本条目已扫过的**代码单元**（非 trivia），下标与 `CodeAt` 一一对应。只追加：`Checked` 推进时把新单元 push 进来，换条目（`Start` 变化、状态重建）时才随状态一起从空开始。

## field CodeAt:Array<int> = []

代码单元下标 → 宿主 `Data` 下标的映射（`End` 折算用）。

# class StatementRule extends ShapeRule

根级语句候选（块 / 空语句 / 变量 / if / while / do / for / for-in / for-of / return / break / continue / throw / debugger）。
只认本族起点（`{`、`;` 与固定关键字），其它起点一律 `Reject`，把位置留给 import / export / expression 候选。

```txt
;
{ }
let x = 1;
if (a) b; else c;
while (a) b;
do b; while (a);
for (let i = 0; i < 3; i++) { b; }
for (x in o) b;
for (x of o) b;
return a;
break lbl;
throw e;
debugger;
```

建树时机由 `StatementScanner` 回答：`Status == 1`（到齐）且 `End` 已知时建；`End` 可能小于当前下标（`if (a) b;` 后面来了新的代码单元才确定没有 `else`），这时只消费到 `End`，剩下的单元留给下一条语句。

**EOF 哨兵上的让位**：`ItemStart > 0`（前面已经建出过语句）时，最后一段的边界 token 留给根终结候选在 EOF 建——上一条语句在 ASI 边界收口时会把边界 token 原样留下（`type T = A` ⏎ `return` / `debugger` / `{ a: 1 }`），它不再有自己的判定格；本候选若在哨兵上 Accept，两边同时成立，ShapeCatalog 抛错（C04–C06）。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:ItemSlotCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.Slot();
const itemStart = ItemUtil.ItemStart(units);
let state = cache.GetState<StatementScan>(name);
if (state === null || state.Start !== itemStart) {
  state = new StatementScan();
  state.Start = itemStart;
  state.Checked = -1;
  cache.SetState(name, state);
}
if (state.Checked !== tokenIndex + 1) {
  // `Code` / `CodeAt` 放在状态里**只追加**：`Checked` 已经扫过的前缀不再重建，只 push 新单元。
  // 只有「换条目」（状态刚重建、数组本来就是空）或防御性的回退越界才清空重扫——
  // 那两种情况下状态里攒的前缀对不上当前下标。
  let from = state.Checked;
  if (from < state.Start) {
    from = state.Start;
  }
  if (from > tokenIndex + 1) {
    state.Code.length = 0;
    state.CodeAt.length = 0;
    from = state.Start;
  }
  for (let at = from; at <= tokenIndex; at++) {
    if (!units[at].IsTriviaToken) {
      state.Code.push(units[at]);
      state.CodeAt.push(at);
    }
  }
  const owner = units[tokenIndex].Parent;
  // 「本层到头」有两条证据：宿主已签出（旧判据），或**当前单元之后文档里已经没有内容**
  // （`NextChar` 跳过空白与注释后是空串）。后者让「文件最后一条无分号语句」在它的最后一个
  // 代码单元上就收口，而不是拖到 EOF 哨兵上——拖到 EOF 时终结候选会与它同时成立（§6 B 组）。
  // 有 `;` 的语句不受影响（走各自老路径）；变量语句走 `stopAtEof` 也不受影响。
  const unitEnd = units[tokenIndex].SourceRange.EndIndex;
  StatementScanner.AtEOF = (owner !== null && owner.SourceRange.EndIndex >= 0)
    || (unitEnd >= 0 && StatementScanner.NextChar(units[tokenIndex].SourceRange.Document, unitEnd) === "");
  const result:StatementScanResult = StatementScanner.ScanRoot(state.Code);
  state.Status = result.Status;
  if (result.Status === 1 && result.End >= 0 && result.End < state.CodeAt.length) {
    state.End = state.CodeAt[result.End];
  } else {
    state.End = -1;
  }
  state.Checked = tokenIndex + 1;
}
if (state.Status === 2) {
  return ShapeStates.Reject;
}
if (state.Status === 1) {
  // 已经建出过上一条语句（`ItemStart > 0`）、剩下的这一段又只在 **EOF 哨兵**这一格才判完：
  // 这一段是「上一条语句在 ASI 边界收口时留下的边界 token」（`type T = A` ⏎ `return` /
  // `debugger` / `{ a: 1 }`、`a` ⏎ `return`）。边界 token 不会再有自己的判定格，根终结候选
  // 会在 EOF 这一格用 `BuildTrailingDeclaration` 把它建出来；本候选若在这里 Accept，
  // ShapeCatalog 就抛「终结候选与其它候选同时成立」（C04–C06）。
  if (state.Start > 0 && units[tokenIndex] instanceof EndOfFileTokenShape) {
    return ShapeStates.Reject;
  }
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:ItemSlotCache, context:SyntaxContext)=>bool

```ts
const state = cache.GetState<StatementScan>(this.Slot());
return state !== null && state.Status === 1 && state.End >= 0;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:ShapeCatalog, context:SyntaxContext)=>Token

```ts
const state = catalog.SlotCache.GetState<StatementScan>(this.Slot());
const start = state === null ? ItemUtil.ItemStart(host.Data) : state.Start;
let end = state === null ? tokenIndex : state.End;
if (end < start) {
  end = tokenIndex;
}
if (end > tokenIndex) {
  end = tokenIndex;
}
let pos = 0;
for (let at = start - 1; at >= 0; at--) {
  if (!host.Data[at].IsTriviaToken) {
    const previousEnd = host.Data[at].SourceRange.EndIndex;
    if (previousEnd >= 0) {
      pos = previousEnd;
    }
    break;
  }
}
const consumed:Array<Token> = host.Data.slice(start, end + 1);
const builder = new StatementBuilder(host.Template, context);
builder.Load(consumed, pos);
const built = builder.BuildStatement();
if (builder.At !== builder.Units.length) {
  throw new Error("语句没有读完");
}
host.Data.splice(start, end - start + 1, built);
built.Parent = host;
return built;
```
