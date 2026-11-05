# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { PostfixUnaryExpressionShape } from "../statements/postfix-unary-expression-shape.xl.md"
import { ExpressionUtil } from "./expression-util.xl.md"
import { MinusMinusTokenShape, PlusPlusTokenShape } from "./unary-token-shapes.xl.md"
import { TokenIndex } from "../../../core/syntax/token-index.xl.md"
```

# namespace cangjie

# class PostfixUnaryPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = index.At(tokenIndex);
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (!unit.Closed) {
  return ShapeStates.Uncertain;
}
if (!(unit instanceof Symbol) || !unit.IsAny(["++", "--"])) {
  return ShapeStates.Reject;
}
if (!PostfixUnaryPossibleShape.ShouldBuild(units, tokenIndex)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
return PostfixUnaryPossibleShape.ShouldBuild(units, tokenIndex);
```

## static method ShouldBuild:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length || tokenIndex !== units.length - 1) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed || !unit.IsAny(["++", "--"])) {
  return false;
}
const operandIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (operandIndex < 0) {
  return false;
}
return ExpressionUtil.IsClosedOperand(units[operandIndex]);
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
const operator = index.At(tokenIndex) as Symbol;
const operandIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (operandIndex < 0) {
  throw new Error("PostfixUnaryPossibleShape: 缺操作数");
}
const operand = units[operandIndex];
const pos = ExpressionUtil.OperatorPosition(units, tokenIndex);
const token = operator.Is("++")
  ? PlusPlusTokenShape.FromSymbol(operator, pos)
  : MinusMinusTokenShape.FromSymbol(operator, pos);
const shape = new PostfixUnaryExpressionShape(host.Template);
shape.Pos = ExpressionUtil.PosOf(operand);
shape.SignIn(operand.SourceRange.Start);
shape.Operator = token;
shape.Add(operand);
shape.SourceRange.End = operator.SourceRange.End;
shape.Closed = true;
units.splice(operandIndex, tokenIndex - operandIndex + 1, shape);
shape.Parent = host;
return this.StampCreated(shape, context);
```
