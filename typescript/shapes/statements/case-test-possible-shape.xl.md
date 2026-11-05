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
import { ItemUtil } from "../item-util.xl.md"
import { ExpressionUtil } from "../expressions/expression-util.xl.md"
import { OperandUtil } from "../expressions/operand-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { CaseClauseShape } from "./case-clause-shape.xl.md"
import { CaseColonPossibleShape } from "./case-colon-possible-shape.xl.md"
import { ConditionalPossibleShape } from "../expressions/conditional-possible-shape.xl.md"
import { PostfixUnaryPossibleShape } from "../expressions/postfix-unary-possible-shape.xl.md"
import { PrefixUnaryPossibleShape } from "../expressions/prefix-unary-possible-shape.xl.md"
import { SuffixAccessPossibleShape } from "../expressions/suffix-access-possible-shape.xl.md"
import { CallPossibleShape } from "../expressions/call-possible-shape.xl.md"
```

# namespace cangjie

# class CaseTestPossibleShape extends PossibleShape


## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof CaseClauseShape) || host.Test !== null) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
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
if (tokenIndex < 0 || tokenIndex >= units.length) {
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
const clause = host as CaseClauseShape;
const unit = units[tokenIndex];
const pos = ItemUtil.PositionOf(units, tokenIndex);
const guide = new CatalogGuide(
  [new SuffixAccessPossibleShape(), new CallPossibleShape(), new ConditionalPossibleShape(), new PostfixUnaryPossibleShape(), new CaseColonPossibleShape()],
  null,
);
clause.CatalogGuide = guide;
clause.MountedUnit = null;
if (ExpressionUtil.IsPrefixOperator(unit)) {
  const built = new PrefixUnaryPossibleShape().BuildByIndex(clause, tokenIndex, guide, context);
  if (built instanceof ShapeToken) {
    built.Pos = pos;
  }
  clause.Test = built;
  return this.StampCreated(built, context);
}
const operand = OperandUtil.FromCommon(unit as Common, pos);
units.splice(tokenIndex, 1, operand);
operand.Parent = clause;
clause.Test = operand;
return this.StampCreated(operand, context);
```
