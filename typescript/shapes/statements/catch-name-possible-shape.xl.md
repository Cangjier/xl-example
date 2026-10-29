# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { OperandUtil } from "../expressions/operand-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { VariableDeclarationShape } from "../declarations/variable-declaration-shape.xl.md"
import { CatchClauseShape } from "./catch-clause-shape.xl.md"
import { CatchCloseParenPossibleShape } from "./catch-close-paren-possible-shape.xl.md"
```

# namespace cangjie

# class CatchNamePossibleShape extends PossibleShape

`catch (e)` 里的 `e`：落成 VariableDeclaration + Identifier（catch 的参数声明没有 `let` 关键字）。

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
if (!(unit instanceof Common) || !unit.Closed || !OperandUtil.CanStartExpression(unit)) {
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
return unit instanceof Common && unit.Closed && OperandUtil.CanStartExpression(unit);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const clause = host as CatchClauseShape;
const units = clause.Data;
const common = units[tokenIndex] as Common;
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
return declaration;
```
