# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { NamespaceImportShape } from "./namespace-import-shape.xl.md"
```

# namespace cangjie

# class NamespaceImportPossibleShape extends PossibleShape

```txt
import * as ns from "m";
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
for (const unit of units) {
  if (unit instanceof NamespaceImportShape) {
    return ShapeStates.Reject;
  }
}
let star = -1;
let as = -1;
for (let at = 0; at < units.length; at++) {
  const unit = units[at];
  if (unit instanceof Symbol && (unit as Symbol).Is("*")) {
    star = at;
  } else if (star >= 0 && as < 0 && unit instanceof Common && (unit as Common).Is("as")) {
    as = at;
  }
}
if (star < 0 || as < 0) {
  return ShapeStates.Reject;
}
const last = ItemUtil.LastCodeInItem(units);
if (last <= as) {
  return ShapeStates.Uncertain;
}
if (units[last] instanceof Common) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide)=>Token

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
const shape = NamespaceImportShape.FromTokens(host.Data.slice(star, tokenIndex + 1));
if (shape === null) {
  return host;
}
host.Data.splice(star, tokenIndex - star + 1, shape);
shape.Parent = host;
return shape;
```
