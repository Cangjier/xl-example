# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { StatementUtil } from "./statement-util.xl.md"
import { ExpressionUtil } from "../expressions/expression-util.xl.md"
import { OperandUtil } from "../expressions/operand-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { BinaryExpressionPossibleShape } from "../expressions/binary-expression-possible-shape.xl.md"
import { ConditionalPossibleShape } from "../expressions/conditional-possible-shape.xl.md"
import { PostfixUnaryPossibleShape } from "../expressions/postfix-unary-possible-shape.xl.md"
import { PrefixUnaryPossibleShape } from "../expressions/prefix-unary-possible-shape.xl.md"
import { SuffixAccessPossibleShape } from "../expressions/suffix-access-possible-shape.xl.md"
import { CallPossibleShape } from "../expressions/call-possible-shape.xl.md"
import { AsiPossibleShape } from "./asi-possible-shape.xl.md"
import { ExpressionStatementEndPossibleShape } from "./expression-statement-end-possible-shape.xl.md"
import { ExpressionStatementShape } from "./expression-statement-shape.xl.md"
```

# namespace cangjie

# class ExpressionStatementPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
const start = StatementUtil.StartIndex(units, tokenIndex, cache);
if (start >= units.length || tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
if (tokenIndex !== start) {
  return ShapeStates.Reject;
}
const unit = units[tokenIndex];
if (!unit.Closed) {
  return ShapeStates.Uncertain;
}
if (unit instanceof Common && OperandUtil.CanStartExpression(unit)) {
  return ShapeStates.Accept;
}
if (ExpressionUtil.IsPrefixOperator(unit)) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const start = StatementUtil.StartIndex(units, tokenIndex, cache);
if (start >= units.length || tokenIndex !== start || tokenIndex !== units.length - 1) {
  return false;
}
const unit = units[tokenIndex];
if (!unit.Closed) {
  return false;
}
if (unit instanceof Common && OperandUtil.CanStartExpression(unit)) {
  return true;
}
return ExpressionUtil.IsPrefixOperator(unit);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const unit = units[tokenIndex];
const pos = OperandUtil.PositionOf(units, tokenIndex);
const statement = new ExpressionStatementShape(host.Template);
const guide = new CatalogGuide(
  [new BinaryExpressionPossibleShape(), new SuffixAccessPossibleShape(), new CallPossibleShape(), new ConditionalPossibleShape(), new PostfixUnaryPossibleShape(), new AsiPossibleShape()],
  new ExpressionStatementEndPossibleShape(),
);
statement.Pos = pos;
statement.SignIn(unit.SourceRange.Start);
statement.CatalogGuide = guide;
units.splice(tokenIndex, 1, statement);
if (ExpressionUtil.IsPrefixOperator(unit)) {
  statement.Add(unit);
  statement.Parent = host;
  host.MountedUnit = statement;
  const built = new PrefixUnaryPossibleShape().BuildByIndex(statement, 0, guide, context);
  if (built instanceof ShapeToken) {
    built.Pos = pos;
  }
  return this.StampCreated(statement, context);
}
const operand = OperandUtil.FromCommon(unit as Common, pos);
statement.Add(operand);
statement.Parent = host;
host.MountedUnit = statement;
return this.StampCreated(statement, context);
```
