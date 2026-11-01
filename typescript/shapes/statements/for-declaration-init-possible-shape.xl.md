# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
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


## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof ForHeadShape) || !(host.Init instanceof VariableDeclarationListShape) || host.Mode !== "") {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is("=")) {
  return ShapeStates.Reject;
}
const prevIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (prevIndex < 0 || units[prevIndex] !== host.Init) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
return unit instanceof Symbol && unit.Closed && unit.Is("=");
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const head = host as ForHeadShape;
const list = head.Init as VariableDeclarationListShape;
const index = head.DropTriviaBefore(tokenIndex);
const equals = head.Data[index] as Symbol;
head.Data.splice(index, 1);
const declaration = list.Last() as VariableDeclarationShape;
declaration.CatalogGuide = new CatalogGuide(
  [new ForDeclarationValuePossibleShape()],
  new ForDeclarationEndPossibleShape(),
);
list.MountedUnit = declaration;
head.MountedUnit = list;
return this.StampCreated(equals, context);
```
