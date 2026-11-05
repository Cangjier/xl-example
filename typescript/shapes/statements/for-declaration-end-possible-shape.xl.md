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
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { VariableDeclarationShape } from "../declarations/variable-declaration-shape.xl.md"
import { VariableDeclarationListShape } from "../declarations/variable-declaration-list-shape.xl.md"
import { ForClauseStartPossibleShape } from "./for-clause-start-possible-shape.xl.md"
import { ForClosePossibleShape } from "./for-close-possible-shape.xl.md"
import { ForHeadShape } from "./for-head-shape.xl.md"
import { ForSemicolonPossibleShape } from "./for-head-opening.xl.md"
```

# namespace cangjie

# class ForDeclarationEndPossibleShape extends PossibleShape


## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
if (!(host instanceof VariableDeclarationShape)) {
  return ShapeStates.Reject;
}
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const unit = index.At(tokenIndex);
if (unit instanceof Symbol && unit.Closed && unit.Is(";")) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = index.At(tokenIndex);
return unit instanceof Symbol && unit.Closed && unit.Is(";");
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const tokenIndex = index.Index;
const declaration = host as VariableDeclarationShape;
const semicolon = index.At(tokenIndex) as Symbol;
declaration.Data.splice(tokenIndex, 1);
declaration.SourceRange.End = semicolon.SourceRange.Start;
declaration.TryToClose(context);
const list = declaration.Parent as VariableDeclarationListShape;
list.SourceRange.End = declaration.SourceRange.End;
list.TryToClose(context);
const head = list.Parent as ForHeadShape;
declaration.Quit();
list.Quit();
head.Mode = "classic";
head.Init = list;
head.Segment = 1;
head.CatalogGuide = new CatalogGuide(
  [new ForClauseStartPossibleShape(), new ForSemicolonPossibleShape(), new ForClosePossibleShape()],
  null,
);
head.MountedUnit = null;
return this.StampCreated(semicolon, context);
```
