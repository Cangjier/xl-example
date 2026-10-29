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
import { ConditionCreatePossibleShape } from "../conditions/condition-create-possible-shape.xl.md"
import { ControlStatementShape } from "./control-statement-shape.xl.md"
import { ControlBodyEndPossibleShape } from "./control-body-end-possible-shape.xl.md"
import { ExpressionStatementShape } from "./expression-statement-shape.xl.md"
import { IfStatementShape } from "./if-statement-shape.xl.md"
import { BlockShape } from "./block-shape.xl.md"
import { BlockPossibleShape } from "./block-possible-shape.xl.md"
import { BlockEndPossibleShape } from "./block-end-possible-shape.xl.md"
import { StatementGuide } from "./statement-guide.xl.md"
```

# namespace cangjie

# class ControlBodyPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof ControlStatementShape)) {
  return ShapeStates.Reject;
}
// 普通控制语句（if / while / for）的 body 跟在条件之后；`do` 是 body 先来（BodyFirst）。
if (!host.BodyFirst && host.Condition === null) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
// 注释（AreaAnnotation / LineAnnotation）也是 trivia：body 还没到，候选必须留着等。
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (unit instanceof Symbol) {
  if (!unit.Closed) {
    return ShapeStates.Uncertain;
  }
  if (!unit.Is("{")) {
    return ShapeStates.Reject;
  }
  if (!ControlBodyPossibleShape.FollowsHead(host, units, tokenIndex)) {
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
if (!ControlBodyPossibleShape.FollowsHead(host, units, tokenIndex)) {
  return ShapeStates.Reject;
}
// body 本身可以是另一条 `if`（`if (a) if (b) c` 的 then 分支、`else if` 的 else 分支）。
// 关键字在这里先建形状，它自己的条件候选接着吃 `(`：所以这里只看「头之后紧跟 if」。
if (unit.Is("if")) {
  return ShapeStates.Accept;
}
if (!OperandUtil.CanStartExpression(unit)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## static method FollowsHead:(host:ControlStatementShape, units:Array<Token>, tokenIndex:int)=>bool

```ts
// body 的左边只能是本语句的头部：条件表达式（then body）或 `else` 关键字（else body）。
// `else` 建在这一步之前，所以两者都是已归档的子单元。
const prevIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
// `do` 的 body 是这条语句的第一个代码单元：左侧没有头部可言。
if (prevIndex < 0) {
  return host.BodyFirst;
}
const prev = units[prevIndex];
if (prev === host.Condition) {
  return true;
}
return host.ElseKeyword !== null && prev === host.ElseKeyword;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
// 这里拿不到 host：两类前驱都放行（操作数 = 条件，已收口的 `else` 关键字 = else body），
// 与 host 的绑定在 ComputeByIndex 里已经按对象身份核对过。
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
const prevIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
const prev = prevIndex >= 0 ? units[prevIndex] : null;
const isElseHead = prev !== null && prev instanceof Common && prev.Closed && prev.Is("else");
// 没有前驱只可能是 `do` 的 body（host 绑定已在 Compute 里核对过）。
if (prev !== null && !ControlBodyPossibleShape.IsOperand(prev) && !isElseHead) {
  return false;
}
if (unit instanceof Symbol) {
  return unit.Closed && unit.Is("{");
}
if (unit instanceof Common && unit.Closed && unit.Is("if")) {
  return true;
}
return unit instanceof Common && unit.Closed && OperandUtil.CanStartExpression(unit);
```

## static method IsOperand:(unit:Token)=>bool

```ts
const name = unit.constructor.name;
return unit.Closed && (name === "IdentifierShape" || name === "NumericLiteralShape" || name === "BinaryExpressionShape" || name === "PostfixUnaryExpressionShape");
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const control = host as ControlStatementShape;
const isElseBody = ControlBodyPossibleShape.IsElseHead(control, units, tokenIndex);
const unit = units[tokenIndex];
if (unit instanceof Symbol && unit.Is("{")) {
  const pos = ItemUtil.PositionOf(units, tokenIndex);
  const block = BlockShape.FromOpen(unit, pos);
  block.CatalogGuide = StatementGuide.Create(new BlockEndPossibleShape(), [new BlockPossibleShape()]);
  units.splice(tokenIndex, 1, block);
  block.Parent = host;
  if (isElseBody) {
    control.ElseBody = block;
  } else {
    control.Body = block;
  }
  host.MountedUnit = block;
  return block;
}
// 嵌套 `if` 当 body：建内层 if，挂成本语句的 then / else 分支，后续字符流进它的条件候选。
if (unit instanceof Common && unit.Is("if")) {
  const pos = ItemUtil.PositionOf(units, tokenIndex);
  const statement = new IfStatementShape(host.Template);
  statement.Kind = "if";
  statement.Pos = pos;
  statement.SignIn(unit.SourceRange.Start);
  statement.CatalogGuide = new CatalogGuide([new ConditionCreatePossibleShape()], null);
  units.splice(tokenIndex, 1, statement);
  statement.Parent = host;
  if (isElseBody) {
    control.ElseBody = statement;
  } else {
    control.Body = statement;
  }
  host.MountedUnit = statement;
  return statement;
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
if (isElseBody) {
  control.ElseBody = body;
} else {
  control.Body = body;
}
host.MountedUnit = body;
return body;
```

## static method IsElseHead:(host:ControlStatementShape, units:Array<Token>, tokenIndex:int)=>bool

```ts
const prevIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (prevIndex < 0) {
  return false;
}
return host.ElseKeyword !== null && units[prevIndex] === host.ElseKeyword;
```
