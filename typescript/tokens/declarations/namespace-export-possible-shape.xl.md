# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { NamespaceExportShape } from "./namespace-export-shape.xl.md"
```

# namespace cangjie

# class NamespaceExportScan

## field Start:int = -1

## field Checked:int = 0

## field HasShape:bool = false

## field Star:int = -1

## field As:int = -1

## field LastCode:int = -1

# class NamespaceExportPossibleShape extends PossibleShape

```txt
export * as ns from "m";
export type * as ns from "m";
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.constructor.name;
let state = cache.GetState<NamespaceExportScan>(name);
if (state === null) {
  state = new NamespaceExportScan();
  state.Start = ItemUtil.ItemStart(units);
  cache.SetState(name, state);
}
if (state.Checked > tokenIndex + 1) {
  state.Checked = 0;
  state.HasShape = false;
  state.Star = -1;
  state.As = -1;
  state.LastCode = -1;
}
for (let at = state.Checked; at <= tokenIndex; at++) {
  const unit = units[at];
  if (!unit.IsTriviaToken) {
    state.LastCode = at;
  }
  if (unit instanceof NamespaceExportShape) {
    state.HasShape = true;
  } else if (unit instanceof Symbol && (unit as Symbol).Is("*")) {
    state.Star = at;
  } else if (state.Star >= 0 && state.As < 0 && unit instanceof Common && (unit as Common).Is("as")) {
    state.As = at;
  }
}
state.Checked = tokenIndex + 1;
if (state.HasShape) {
  return ShapeStates.Reject;
}
const last = state.LastCode;
if (last < 0) {
  return ShapeStates.Uncertain;
}
const tail = units[last];
if (tail instanceof Common && (tail as Common).Is("from")) {
  // 走到 from：只剩 `*` / `* as` 骨架说明它不是命名空间导出。
  return ShapeStates.Reject;
}
if (state.Star < 0) {
  return ShapeStates.Reject;
}
if (state.As < 0) {
  // 只有 `*` 这一格还等着 `as`：到此为止还可能是命名空间导出。
  if (tail instanceof Symbol && (tail as Symbol).Is("*")) {
    return ShapeStates.Uncertain;
  }
  return ShapeStates.Reject;
}
if (last <= state.As) {
  // `* as` 的骨架到了、名字还没到：不能定案（见 IsBuildable）。
  return ShapeStates.Uncertain;
}
if (tail instanceof Common) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const state = catalog.PossibleShapesComputeCache.GetState<NamespaceExportScan>(this.constructor.name);
const start = state === null || state.Start < 0 ? 0 : state.Start;
let star = -1;
for (let at = start; at <= tokenIndex; at++) {
  const unit = host.Data[at];
  if (unit instanceof Symbol && (unit as Symbol).Is("*")) {
    star = at;
  }
}
if (star < 0) {
  return host;
}
const shape = NamespaceExportShape.FromTokens(host.Data.slice(star, tokenIndex + 1), context);
if (shape === null) {
  return host;
}
// Pos 是 `*` 前面那一格（`export` / `type`）的 End+1——`*` 之前那格只有宿主看得见。
let previous = -1;
for (let at = star - 1; at >= 0; at--) {
  if (!host.Data[at].IsTriviaToken) {
    previous = at;
    break;
  }
}
if (previous >= 0) {
  const previousEnd = host.Data[previous].SourceRange.EndIndex;
  if (previousEnd >= 0) {
    shape.Pos = previousEnd;
  }
} else if (shape.SourceRange.StartIndex >= 0) {
  shape.Pos = shape.SourceRange.StartIndex;
}
host.Data.splice(star, tokenIndex - star + 1, shape);
shape.Parent = host;
return shape;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>bool

```ts
const state = cache.GetState<NamespaceExportScan>(this.constructor.name);
if (state === null) {
  return false;
}
const last = state.LastCode;
if (last < 0) {
  return false;
}
if (units[last] instanceof Common && (units[last] as Common).Is("from")) {
  return false;
}
if (state.Star < 0) {
  return false;
}
if (state.As < 0 || last <= state.As) {
  // `*` / `* as` 都已到、名字还没到：现在建出来只会得到一个残缺的命名空间导出。
  return false;
}
return true;
```
