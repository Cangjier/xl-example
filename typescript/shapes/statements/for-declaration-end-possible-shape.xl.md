# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
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

`for (const i = 0; …)` 初始化子句的 `;`：收口 declaration → list，再推进到条件子句。

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof VariableDeclarationShape)) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const unit = units[tokenIndex];
if (unit instanceof Symbol && unit.Closed && unit.Is(";")) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
return unit instanceof Symbol && unit.Closed && unit.Is(";");
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const declaration = host as VariableDeclarationShape;
const semicolon = declaration.Data[tokenIndex] as Symbol;
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
