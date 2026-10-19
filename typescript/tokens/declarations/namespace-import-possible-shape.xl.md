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
const name = this.constructor.name;
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
if (state.Star < 0 || state.As < 0) {
  return ShapeStates.Reject;
}
const last = state.LastCode;
if (last <= state.As) {
  return ShapeStates.Uncertain;
}
if (units[last] instanceof Common) {
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
host.Data.splice(star, tokenIndex - star + 1, shape);
shape.Parent = host;
return shape;
```
