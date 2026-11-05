# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { TokenIndex } from "../../../core/syntax/token-index.xl.md"
import { OperandUtil } from "../expressions/operand-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { VariableDeclarationShape } from "../declarations/variable-declaration-shape.xl.md"
import { CatchClauseShape } from "./catch-clause-shape.xl.md"
import { CatchCloseParenPossibleShape } from "./catch-close-paren-possible-shape.xl.md"
```

# namespace cangjie

# class CatchNamePossibleShape extends PossibleShape


## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
if (!(host instanceof CatchClauseShape) || host.Parameter !== null) {
  return ShapeStates.Reject;
}
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = index.At(tokenIndex);
if (!(unit instanceof Common) || !unit.Closed || !OperandUtil.CanStartExpression(unit)) {
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
return unit instanceof Common && unit.Closed && OperandUtil.CanStartExpression(unit);
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
const clause = host as CatchClauseShape;
const common = index.At(tokenIndex) as Common;
const identifier = IdentifierShape.FromCommon(common, common.SourceRange.Start);
const declaration = new VariableDeclarationShape(host.Template);
declaration.Pos = common.SourceRange.Start;
declaration.SignIn(identifier.SourceRange.Start);
declaration.Add(identifier);
declaration.SignOut(identifier.SourceRange.End);
declaration.TryToClose(context);
units.splice(tokenIndex, 1, declaration);
declaration.Parent = clause;
clause.Parameter = declaration;
clause.CatalogGuide = new CatalogGuide([new CatchCloseParenPossibleShape()], null);
clause.MountedUnit = null;
return this.StampCreated(declaration, context);
```
