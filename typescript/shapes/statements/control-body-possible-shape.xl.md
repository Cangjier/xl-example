# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { OperandUtil } from "../expressions/operand-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { BinaryExpressionPossibleShape } from "../expressions/binary-expression-possible-shape.xl.md"
import { ControlStatementShape } from "./control-statement-shape.xl.md"
import { ControlBodyEndPossibleShape } from "./control-body-end-possible-shape.xl.md"
import { ExpressionStatementShape } from "./expression-statement-shape.xl.md"
import { BlockShape } from "./block-shape.xl.md"
import { BlockPossibleShape } from "./block-possible-shape.xl.md"
import { BlockEndPossibleShape } from "./block-end-possible-shape.xl.md"
import { StatementGuide } from "./statement-guide.xl.md"
```

# namespace cangjie

# class ControlBodyPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof ControlStatementShape) || host.Condition === null) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit instanceof Symbol) {
  if (!unit.Closed) {
    return ShapeStates.Uncertain;
  }
  if (!unit.Is("{")) {
    return ShapeStates.Reject;
  }
  const prevIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
  if (prevIndex < 0 || units[prevIndex] !== host.Condition) {
    return ShapeStates.Reject;
  }
  return ShapeStates.Accept;
}
if (!(unit instanceof Common)) {
  return ShapeStates.Reject;
}
if (!unit.Closed) {
  return ShapeStates.Uncertain;
}
if (!OperandUtil.CanStartExpression(unit)) {
  return ShapeStates.Reject;
}
const prevIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (prevIndex < 0 || units[prevIndex] !== host.Condition) {
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
if (unit instanceof Symbol) {
  if (!unit.Closed || !unit.Is("{")) {
    return false;
  }
  const prevIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
  return prevIndex >= 0 && ControlBodyPossibleShape.IsOperand(units[prevIndex]);
}
if (!(unit instanceof Common) || !unit.Closed || !OperandUtil.CanStartExpression(unit)) {
  return false;
}
const prevIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (prevIndex < 0 || !ControlBodyPossibleShape.IsOperand(units[prevIndex])) {
  return false;
}
// 条件必须是本条语句的第一个代码单元，body 才排在它后面。
let first = -1;
for (let at = 0; at <= tokenIndex; at++) {
  if (!units[at].IsTriviaToken) {
    first = at;
    break;
  }
}
return first === prevIndex;
```

## static method IsOperand:(unit:Token)=>bool

```ts
const name = unit.constructor.name;
return unit.Closed && (name === "IdentifierShape" || name === "NumericLiteralShape" || name === "BinaryExpressionShape");
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const control = host as ControlStatementShape;
const unit = units[tokenIndex];
if (unit instanceof Symbol && unit.Is("{")) {
  const pos = ItemUtil.PositionOf(units, tokenIndex);
  const block = BlockShape.FromOpen(unit, pos);
  block.CatalogGuide = StatementGuide.Create(new BlockEndPossibleShape(), [new BlockPossibleShape()]);
  units.splice(tokenIndex, 1, block);
  block.Parent = host;
  control.Body = block;
  host.MountedUnit = block;
  return block;
}
const common = unit as Common;
const pos = OperandUtil.PositionOf(units, tokenIndex);
const operand = OperandUtil.FromCommon(common, pos);
const body = new ExpressionStatementShape(host.Template);
body.Pos = pos;
body.SignIn(common.SourceRange.Start);
body.Add(operand);
body.CatalogGuide = new CatalogGuide(
  [new BinaryExpressionPossibleShape()],
  new ControlBodyEndPossibleShape(),
);
units.splice(tokenIndex, 1, body);
body.Parent = host;
control.Body = body;
host.MountedUnit = body;
return body;
```
