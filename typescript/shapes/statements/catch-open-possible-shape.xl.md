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
import { CatchClauseShape } from "./catch-clause-shape.xl.md"
import { CatchNamePossibleShape } from "./catch-name-possible-shape.xl.md"
```

# namespace cangjie

# class CatchOpenPossibleShape extends PossibleShape

`catch (`：括号只是语法记号，参数本身是 VariableDeclaration 子节点。

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof CatchClauseShape) || host.Parameter !== null) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is("(")) {
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
return unit instanceof Symbol && unit.Closed && unit.Is("(");
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const clause = host as CatchClauseShape;
const open = clause.Data[tokenIndex] as Symbol;
clause.Data.splice(tokenIndex, 1);
clause.CatalogGuide = new CatalogGuide([new CatchNamePossibleShape()], null);
clause.MountedUnit = null;
return this.StampCreated(open, context);
```
