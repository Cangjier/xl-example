# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
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

# class StatementPossibleShape extends PossibleShape

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

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.constructor.name;
const itemStart = ItemUtil.ItemStart(units);
let state = cache.GetState<StatementScan>(name);
if (state === null || state.Start !== itemStart) {
  state = new StatementScan();
  state.Start = itemStart;
  state.Checked = -1;
  cache.SetState(name, state);
}
if (state.Checked !== tokenIndex + 1) {
  const code:Array<Token> = [];
  const codeAt:Array<number> = [];
  for (let at = state.Start; at <= tokenIndex; at++) {
    if (!units[at].IsTriviaToken) {
      code.push(units[at]);
      codeAt.push(at);
    }
  }
  const owner = units[tokenIndex].Parent;
  StatementScanner.AtEOF = owner !== null && owner.SourceRange.End !== null;
  const result:StatementScanResult = StatementScanner.ScanRoot(code);
  state.Status = result.Status;
  if (result.Status === 1 && result.End >= 0 && result.End < codeAt.length) {
    state.End = codeAt[result.End];
  } else {
    state.End = -1;
  }
  state.Checked = tokenIndex + 1;
}
if (state.Status === 2) {
  return ShapeStates.Reject;
}
if (state.Status === 1) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const state = cache.GetState<StatementScan>(this.constructor.name);
return state !== null && state.Status === 1 && state.End >= 0;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const state = catalog.PossibleShapesComputeCache.GetState<StatementScan>(this.constructor.name);
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
    const previousEnd = host.Data[at].SourceRange.End;
    if (previousEnd !== null) {
      pos = previousEnd.Index + 1;
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
