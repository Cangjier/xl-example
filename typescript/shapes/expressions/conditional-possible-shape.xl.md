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
import { BinaryExpressionPossibleShape } from "./binary-expression-possible-shape.xl.md"
import { BinaryExpressionShape } from "./binary-expression-shape.xl.md"
import { CallPossibleShape } from "./call-possible-shape.xl.md"
import { ConditionalEndPossibleShape } from "./conditional-end-possible-shape.xl.md"
import { ConditionalExpressionShape } from "./conditional-expression-shape.xl.md"
import { ConditionalOperandPossibleShape } from "./conditional-operand-possible-shape.xl.md"
import { ExpressionUtil } from "./expression-util.xl.md"
import { ParenthesizedPossibleShape } from "./parenthesized-possible-shape.xl.md"
import { PostfixUnaryPossibleShape } from "./postfix-unary-possible-shape.xl.md"
import { PrefixUnaryPossibleShape } from "./prefix-unary-possible-shape.xl.md"
import { QuestionTokenShape } from "../types/type-token-shapes.xl.md"
import { SuffixAccessPossibleShape } from "./suffix-access-possible-shape.xl.md"
```

# namespace cangjie

# class ConditionalPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (!unit.Closed) {
  return ShapeStates.Uncertain;
}
if (!(unit instanceof Symbol)) {
  return ShapeStates.Reject;
}
if (!unit.Is("?")) {
  return ShapeStates.Reject;
}
if (!ConditionalPossibleShape.ShouldBuild(units, tokenIndex)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return ConditionalPossibleShape.ShouldBuild(units, tokenIndex);
```

## static method ShouldBuild:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is("?")) {
  return false;
}
const conditionIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (conditionIndex < 0) {
  return false;
}
return ExpressionUtil.IsClosedOperand(units[conditionIndex]);
```

## static method Guide:()=>CatalogGuide

```ts
return new CatalogGuide(
  [
    new ConditionalOperandPossibleShape(),
    new BinaryExpressionPossibleShape(),
    new SuffixAccessPossibleShape(),
    new CallPossibleShape(),
    new ConditionalPossibleShape(),
    new PrefixUnaryPossibleShape(),
    new PostfixUnaryPossibleShape(),
    new ParenthesizedPossibleShape(),
  ],
  new ConditionalEndPossibleShape(),
);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const conditionIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (conditionIndex < 0) {
  throw new Error("ConditionalPossibleShape: 缺条件操作数");
}
const question = units[tokenIndex] as Symbol;
const questionToken = QuestionTokenShape.FromUnit(question, ExpressionUtil.OperatorPosition(units, tokenIndex));
if (host instanceof BinaryExpressionShape && host.Precedence > 2) {
  const container = host.Parent;
  if (container === null) {
    throw new Error("ConditionalPossibleShape: 条件式没有父单元，无法提升");
  }
  units.splice(tokenIndex, 1);
  if (!host.Closed) {
    host.TryToClose(context);
  }
  const shape = new ConditionalExpressionShape(host.Template);
  shape.Pos = ExpressionUtil.PosOf(host);
  shape.SignIn(host.SourceRange.Start);
  shape.Add(host);
  shape.Add(questionToken);
  shape.Condition = host;
  shape.QuestionToken = questionToken;
  shape.AwaitingColon = true;
  shape.AwaitingOperand = true;
  const at = container.Data.indexOf(host);
  if (at >= 0) {
    container.Data.splice(at, 1, shape);
    shape.Parent = container;
    container.MountedUnit = shape;
  }
  shape.CatalogGuide = ConditionalPossibleShape.Guide();
  return this.StampCreated(shape, context);
}
const condition = units[conditionIndex];
const shape = new ConditionalExpressionShape(host.Template);
shape.Pos = ExpressionUtil.PosOf(condition);
shape.SignIn(condition.SourceRange.Start);
shape.Add(condition);
shape.Add(questionToken);
shape.Condition = condition;
shape.QuestionToken = questionToken;
shape.AwaitingColon = true;
shape.AwaitingOperand = true;
units.splice(conditionIndex, tokenIndex - conditionIndex + 1, shape);
shape.Parent = host;
host.MountedUnit = shape;
shape.CatalogGuide = ConditionalPossibleShape.Guide();
return this.StampCreated(shape, context);
```
