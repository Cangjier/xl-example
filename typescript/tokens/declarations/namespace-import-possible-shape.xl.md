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
import { NamespaceImportShape } from "./namespace-import-shape.xl.md"
```

# namespace cangjie

# class NamespaceImportScan

## field Checked:int = 0

## field HasShape:bool = false

## field Star:int = -1

## field As:int = -1

## field LastCode:int = -1

# class NamespaceImportPossibleShape extends PossibleShape

```txt
import * as ns from "m";
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.Slot();
let state = cache.GetState<NamespaceImportScan>(name);
if (state === null) {
  state = new NamespaceImportScan();
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
  if (unit instanceof NamespaceImportShape) {
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
  // 子句已经走到 from：只剩 `* as` 骨架说明它不是这个子句，别在收口处还活着。
  return ShapeStates.Reject;
}
if (state.Star < 0) {
  // 还没见到 `*`：只有逗号后面才可能轮到我（默认导入之后的第二段），`{` / 名字都判死。
  if (tail instanceof Symbol && (tail as Symbol).Is(",")) {
    return ShapeStates.Uncertain;
  }
  return ShapeStates.Reject;
}
if (state.As < 0 || last <= state.As) {
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
let star = -1;
for (let at = 0; at <= tokenIndex; at++) {
  const unit = host.Data[at];
  if (unit instanceof Symbol && (unit as Symbol).Is("*")) {
    star = at;
  }
}
if (star < 0) {
  return host;
}
const shape = NamespaceImportShape.FromTokens(host.Data.slice(star, tokenIndex + 1), context);
if (shape === null) {
  return host;
}
// Pos 是 `*` 前面那一格（默认导入后是逗号）的 End+1——`*` 之前那格只有宿主看得见。
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
const state = cache.GetState<NamespaceImportScan>(this.Slot());
if (state === null) {
  return false;
}
const last = state.LastCode;
if (last < 0) {
  return false;
}
const tail = units[last];
if (tail instanceof Common && (tail as Common).Is("from")) {
  return false;
}
if (state.Star < 0) {
  return false;
}
if (state.As < 0 || last <= state.As) {
  // `*` / `* as` 都已到、名字还没到：现在建出来只会得到一个残缺的命名空间导入。
  return false;
}
return true;
```
