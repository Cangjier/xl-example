# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { ExpressionStatementPossibleShape } from "../statements/expression-statement-possible-shape.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { ExportAssignmentShape } from "./export-assignment-shape.xl.md"
import { StatementRoute } from "../statements/statement-route-util.xl.md"
import { StatementRouteUtil } from "../statements/statement-route-util.xl.md"
import { ImportExportLegacyDeclarationMount } from "./forms/import-export-legacy-declaration-mount.xl.md"
```

# namespace cangjie

# class ExportAssignmentScan

## field Start:int = -1

## field Checked:int = 0

## field Stage:int = 0

## field Parts:int = 0

## field Done:bool = false

## field DoneAt:int = -1

## field Rejected:bool = false

## field Asi:bool = false

# class ExportAssignmentPossibleShape extends PossibleShape

```txt
export = x;
export = f;
export = a.b;
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (ImportExportLegacyDeclarationMount.Ready(ImportExportLegacyDeclarationMount.KindExportAssignment, units, tokenIndex, cache)) {
  // [XL-B5] 增量模式：本格正好是族判定格 ⇒ 立刻建族形状；开关 false 时 Ready 恒 false，逐字走原路径。
  return ShapeStates.Accept;
}

if (StatementRouteUtil.ShouldYieldToDeclarationShell(units, tokenIndex)) {
  // Stage 4x：与壳的晚建守卫同一判据（route 命中 && 壳这一格不会建壳）才让位。
  // 只看 route 会让「上一条语句已收口」的格子（`}` ⏎ `export`）两边都退 → 文件级 fallback。
  return ShapeStates.Reject;
}
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.Slot();
let state = cache.GetState<ExportAssignmentScan>(name);
if (state === null) {
  state = new ExportAssignmentScan();
  state.Start = ItemUtil.ItemStartCached(units, cache);
  state.Checked = state.Start;
  cache.SetState(name, state);
}
if (state.Checked > tokenIndex + 1) {
  state.Start = ItemUtil.ItemStartCached(units, cache);
  state.Checked = state.Start;
  state.Stage = 0;
  state.Parts = 0;
  state.Done = false;
  state.DoneAt = -1;
  state.Rejected = false;
  state.Asi = false;
}
for (let at = state.Checked; at <= tokenIndex; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof EndOfFileTokenShape) {
    // 文件到头了：本条声明不可能再补 `;`。
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 0) {
    state.Stage = unit instanceof Common && (unit as Common).Is("export") ? 1 : -1;
    if (state.Stage < 0) {
      state.Rejected = true;
    }
    continue;
  }
  if (state.Stage === 1) {
    state.Stage = unit instanceof Symbol && (unit as Symbol).Is("=") ? 2 : -1;
    if (state.Stage < 0) {
      state.Rejected = true;
    }
    continue;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is(";")) {
    if (state.Parts > 0) {
      state.Done = true;
      if (state.DoneAt < 0) {
        state.DoneAt = at;
      }
    } else {
      state.Rejected = true;
    }
    continue;
  }
  if (state.Parts > 0 && ExpressionStatementPossibleShape.IsStatementBoundaryAfterExpression(units, at)) {
    // 无分号收口：下一条语句的第一个代码单元到了——这一条在它前面的换行处结束。
    state.Done = true;
    state.DoneAt = tokenIndex;
    state.Asi = true;
    break;
  }
  state.Parts++;
}
state.Checked = tokenIndex + 1;
if (state.Rejected) {
  return ShapeStates.Reject;
}
if (state.Done) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (ImportExportLegacyDeclarationMount.Ready(ImportExportLegacyDeclarationMount.KindExportAssignment, units, tokenIndex, cache)) {
  return true;
}

const state = cache.GetState<ExportAssignmentScan>(this.Slot());
return state !== null && state.Done && !state.Rejected && state.DoneAt === tokenIndex;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
if (ImportExportLegacyDeclarationMount.Ready(ImportExportLegacyDeclarationMount.KindExportAssignment, host.Data, tokenIndex, catalog.PossibleShapesComputeCache)) {
  const mounted = ImportExportLegacyDeclarationMount.TryBuild(ImportExportLegacyDeclarationMount.KindExportAssignment, host, tokenIndex, context);
  if (mounted !== null) {
    return mounted;
  }
}

const state = catalog.PossibleShapesComputeCache.GetState<ExportAssignmentScan>(this.Slot());
const start = state === null ? ItemUtil.ItemStart(host.Data) : state.Start;
if (start > tokenIndex) {
  return host;
}
if (state !== null && state.Asi) {
  // 换行收口：建到边界之前，边界单元（下一条语句的第一个代码单元）留在根里。
  const last = tokenIndex - 1;
  if (last < start) {
    return host;
  }
  const asiBuilt = ExportAssignmentShape.FromUnits(host, start, last, context, false);
  host.Data.splice(start, tokenIndex - start, asiBuilt);
  asiBuilt.Parent = host;
  return asiBuilt;
}
const built = ExportAssignmentShape.FromUnits(host, start, tokenIndex, context);
host.Data.splice(start, tokenIndex - start + 1, built);
built.Parent = host;
return built;
```
