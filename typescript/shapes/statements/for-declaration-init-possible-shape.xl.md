# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { TokenIndex } from "../../../core/syntax/token-index.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { VariableDeclarationShape } from "../declarations/variable-declaration-shape.xl.md"
import { VariableDeclarationListShape } from "../declarations/variable-declaration-list-shape.xl.md"
import { ForHeadShape } from "./for-head-shape.xl.md"
import { ForDeclarationValuePossibleShape } from "./for-declaration-value-possible-shape.xl.md"
import { ForDeclarationEndPossibleShape } from "./for-declaration-end-possible-shape.xl.md"
```

# namespace cangjie

# class ForDeclarationInitPossibleShape extends PossibleShape


## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
if (!(host instanceof ForHeadShape) || !(host.Init instanceof VariableDeclarationListShape) || host.Mode !== "") {
  return ShapeStates.Reject;
}
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = index.At(tokenIndex);
if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is("=")) {
  return ShapeStates.Reject;
}
const prevIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (prevIndex < 0 || units[prevIndex] !== host.Init) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = index.At(tokenIndex);
return unit instanceof Symbol && unit.Closed && unit.Is("=");
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const tokenIndex = index.Index;
const head = host as ForHeadShape;
const list = head.Init as VariableDeclarationListShape;
const shapeIndex = head.DropTriviaBefore(tokenIndex);
const equals = head.Data[shapeIndex] as Symbol;
head.Data.splice(shapeIndex, 1);
const declaration = list.Last() as VariableDeclarationShape;
declaration.CatalogGuide = new CatalogGuide(
  [new ForDeclarationValuePossibleShape()],
  new ForDeclarationEndPossibleShape(),
);
list.MountedUnit = declaration;
head.MountedUnit = list;
return this.StampCreated(equals, context);
```
