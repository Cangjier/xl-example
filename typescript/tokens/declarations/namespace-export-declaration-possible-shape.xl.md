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
import { ItemUtil } from "../item-util.xl.md"
import { NamespaceExportDeclarationShape } from "./namespace-export-declaration-shape.xl.md"
import { StatementRoute } from "../statements/statement-route-util.xl.md"
import { StatementRouteUtil } from "../statements/statement-route-util.xl.md"
import { ImportExportLegacyDeclarationMount } from "./forms/import-export-legacy-declaration-mount.xl.md"
```

# namespace cangjie

# class NamespaceExportDeclarationScan

## field Start:int = -1

## field Checked:int = 0

## field Stage:int = 0

## field Done:bool = false

## field DoneAt:int = -1

## field Rejected:bool = false

# class NamespaceExportDeclarationPossibleShape extends PossibleShape

```txt
export as namespace NS;
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (ImportExportLegacyDeclarationMount.Ready(ImportExportLegacyDeclarationMount.KindNamespaceExport, units, tokenIndex, cache)) {
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
let state = cache.GetState<NamespaceExportDeclarationScan>(name);
if (state === null) {
  state = new NamespaceExportDeclarationScan();
  state.Start = ItemUtil.ItemStartCached(units, cache);
  state.Checked = state.Start;
  cache.SetState(name, state);
}
if (state.Checked > tokenIndex + 1) {
  state.Start = ItemUtil.ItemStartCached(units, cache);
  state.Checked = state.Start;
  state.Stage = 0;
  state.Done = false;
  state.DoneAt = -1;
  state.Rejected = false;
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
    state.Stage = unit instanceof Common && (unit as Common).Is("as") ? 2 : -1;
    if (state.Stage < 0) {
      state.Rejected = true;
    }
    continue;
  }
  if (state.Stage === 2) {
    state.Stage = unit instanceof Common && (unit as Common).Is("namespace") ? 3 : -1;
    if (state.Stage < 0) {
      state.Rejected = true;
    }
    continue;
  }
  if (state.Stage === 3) {
    state.Stage = unit instanceof Common ? 4 : -1;
    if (state.Stage < 0) {
      state.Rejected = true;
    }
    continue;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is(";")) {
    state.Done = true;
    if (state.DoneAt < 0) {
      state.DoneAt = at;
    }
  } else {
    state.Rejected = true;
  }
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
if (ImportExportLegacyDeclarationMount.Ready(ImportExportLegacyDeclarationMount.KindNamespaceExport, units, tokenIndex, cache)) {
  return true;
}

const state = cache.GetState<NamespaceExportDeclarationScan>(this.Slot());
return state !== null && state.Done && !state.Rejected && state.DoneAt === tokenIndex;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
if (ImportExportLegacyDeclarationMount.Ready(ImportExportLegacyDeclarationMount.KindNamespaceExport, host.Data, tokenIndex, catalog.PossibleShapesComputeCache)) {
  const mounted = ImportExportLegacyDeclarationMount.TryBuild(ImportExportLegacyDeclarationMount.KindNamespaceExport, host, tokenIndex, context);
  if (mounted !== null) {
    return mounted;
  }
}

const state = catalog.PossibleShapesComputeCache.GetState<NamespaceExportDeclarationScan>(this.Slot());
const start = state === null ? ItemUtil.ItemStart(host.Data) : state.Start;
if (start > tokenIndex) {
  return host;
}
const built = NamespaceExportDeclarationShape.FromUnits(host, start, tokenIndex, context);
host.Data.splice(start, tokenIndex - start + 1, built);
built.Parent = host;
return built;
```
