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
import { TokenIndex } from "../../../core/syntax/token-index.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { ExpressionUtil } from "../expressions/expression-util.xl.md"
import { OperandUtil } from "../expressions/operand-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { StatementUtil } from "./statement-util.xl.md"
import { ConditionOperatorPossibleShape } from "../conditions/condition-operator-possible-shape.xl.md"
import { ConditionalPossibleShape } from "../expressions/conditional-possible-shape.xl.md"
import { PostfixUnaryPossibleShape } from "../expressions/postfix-unary-possible-shape.xl.md"
import { PrefixUnaryPossibleShape } from "../expressions/prefix-unary-possible-shape.xl.md"
import { SuffixAccessPossibleShape } from "../expressions/suffix-access-possible-shape.xl.md"
import { CallPossibleShape } from "../expressions/call-possible-shape.xl.md"
import { ForClauseShape } from "./for-clause-shape.xl.md"
import { ForClauseEndPossibleShape } from "./for-clause-end-possible-shape.xl.md"
import { ForHeadShape } from "./for-head-shape.xl.md"
import { ForOfInKeywordPossibleShape } from "./for-of-in-keyword-possible-shape.xl.md"
```

# namespace cangjie

# class ForClauseStartPossibleShape extends PossibleShape


## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
if (!(host instanceof ForHeadShape)) {
  return ShapeStates.Reject;
}
if (host.Mode !== "" && host.Mode !== "classic") {
  return ShapeStates.Reject;
}
if (host.Segment >= 3) {
  return ShapeStates.Reject;
}
const start = StatementUtil.StartIndex(units, tokenIndex, cache);
if (tokenIndex < start) {
  return ShapeStates.Uncertain;
}
const unit = index.At(tokenIndex);
if (!unit.Closed) {
  return ShapeStates.Uncertain;
}
if (tokenIndex !== start) {
  return ShapeStates.Reject;
}
if (unit instanceof Common && OperandUtil.CanStartExpression(unit)) {
  return ShapeStates.Accept;
}
if (ExpressionUtil.IsPrefixOperator(unit)) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
const start = StatementUtil.StartIndex(units, tokenIndex, cache);
if (tokenIndex !== start || tokenIndex !== units.length - 1) {
  return false;
}
const unit = index.At(tokenIndex);
if (!unit.Closed) {
  return false;
}
if (unit instanceof Common && OperandUtil.CanStartExpression(unit)) {
  return true;
}
return ExpressionUtil.IsPrefixOperator(unit);
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
const head = host as ForHeadShape;
const unit = index.At(tokenIndex);
const pos = ItemUtil.PositionOf(units, tokenIndex);
const clause = new ForClauseShape(host.Template);
const guide = new CatalogGuide(
  [new ConditionOperatorPossibleShape(), new SuffixAccessPossibleShape(), new CallPossibleShape(), new ConditionalPossibleShape(), new PostfixUnaryPossibleShape(), new ForOfInKeywordPossibleShape()],
  new ForClauseEndPossibleShape(),
);
clause.Role = head.Segment;
clause.Pos = pos;
clause.SignIn(unit.SourceRange.Start);
clause.CatalogGuide = guide;
units.splice(tokenIndex, 1, clause);
if (ExpressionUtil.IsPrefixOperator(unit)) {
  clause.Add(unit);
  clause.Parent = head;
  head.MountedUnit = clause;
  const built = new PrefixUnaryPossibleShape().BuildByIndex(new TokenIndex(clause, 0), guide, context);
  if (built instanceof ShapeToken) {
    built.Pos = pos;
  }
  return this.StampCreated(clause, context);
}
const operand = OperandUtil.FromCommon(unit as Common, pos);
clause.Add(operand);
clause.Parent = head;
clause.SignOut(operand.SourceRange.End);
head.MountedUnit = clause;
return this.StampCreated(clause, context);
```
