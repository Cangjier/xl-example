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
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { NumericLiteralShape } from "../literals/numeric-literal-shape.xl.md"
import { ForClauseShape } from "./for-clause-shape.xl.md"
import { PostfixUnaryExpressionShape } from "./postfix-unary-expression-shape.xl.md"
import { TokenIndex } from "../../../core/syntax/token-index.xl.md"
```

# namespace cangjie

# class PostfixPossibleShape extends PossibleShape


## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
if (!(host instanceof ForClauseShape)) {
  return ShapeStates.Reject;
}
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = index.At(tokenIndex);
if (!(unit instanceof Symbol) || !unit.Closed || !unit.IsAny(["++", "--"])) {
  return ShapeStates.Reject;
}
const leftIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (leftIndex < 0) {
  return ShapeStates.Reject;
}
return PostfixPossibleShape.IsOperand(units[leftIndex]) ? ShapeStates.Accept : ShapeStates.Reject;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = index.At(tokenIndex);
if (!(unit instanceof Symbol) || !unit.Closed || !unit.IsAny(["++", "--"])) {
  return false;
}
const leftIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
return leftIndex >= 0 && PostfixPossibleShape.IsOperand(units[leftIndex]);
```

## static method IsOperand:(unit:Token)=>bool

```ts
return unit.Closed && (unit instanceof IdentifierShape || unit instanceof NumericLiteralShape);
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
const operator = index.At(tokenIndex) as Symbol;
const leftIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
const operand = units[leftIndex];
const shape = new PostfixUnaryExpressionShape(host.Template);
if (operand instanceof ShapeToken) {
  shape.Pos = operand.Pos;
}
shape.SignIn(operand.SourceRange.Start);
shape.Add(operand);
shape.SourceRange.End = operator.SourceRange.End;
shape.Closed = true;
units.splice(leftIndex, tokenIndex - leftIndex + 1, shape);
shape.Parent = host;
return this.StampCreated(shape, context);
```
