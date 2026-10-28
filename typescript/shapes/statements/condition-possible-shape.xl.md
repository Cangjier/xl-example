# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { OperandUtil } from "../expressions/operand-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { BinaryExpressionShape } from "../expressions/binary-expression-shape.xl.md"
import { BinaryExpressionPossibleShape } from "../expressions/binary-expression-possible-shape.xl.md"
import { BinaryOperatorInfo, BinaryOperatorTable } from "../expressions/binary-operator-table.xl.md"
import { ControlStatementShape } from "./control-statement-shape.xl.md"
import { ControlBodyPossibleShape } from "./control-body-possible-shape.xl.md"
```

# namespace cangjie

# class ConditionPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (!(unit instanceof Bracket)) {
  return ShapeStates.Reject;
}
if (!unit.Closed) {
  return ShapeStates.Uncertain;
}
if (!unit.Is("(", ")")) {
  return ShapeStates.Reject;
}
return ConditionPossibleShape.CanBuildExpression(unit) ? ShapeStates.Accept : ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Bracket) || !unit.Closed || !unit.Is("(", ")")) {
  return false;
}
return ConditionPossibleShape.CanBuildExpression(unit);
```

## static method CanBuildExpression:(bracket:Bracket)=>bool

```ts
let expectOperand = true;
let count = 0;
for (const item of bracket.Data) {
  if (item.IsTriviaToken) {
    continue;
  }
  if (expectOperand) {
    if (!(item instanceof Common) || !OperandUtil.CanStartExpression(item)) {
      return false;
    }
  } else {
    if (!(item instanceof Symbol) || !BinaryOperatorTable.Contains(item.TempToString())) {
      return false;
    }
  }
  expectOperand = !expectOperand;
  count++;
}
return count > 0 && !expectOperand;
```

## static method BuildExpression:(bracket:Bracket, context:SyntaxContext)=>Token

```ts
const values:Array<Token> = [];
const infos:Array<BinaryOperatorInfo> = [];
const operators:Array<Token> = [];
for (let at = 0; at < bracket.Data.length; at++) {
  const item = bracket.Data[at];
  if (item.IsTriviaToken) {
    continue;
  }
  if (item instanceof Common) {
    if (!item.Closed) {
      item.TryToClose(context);
    }
    values.push(OperandUtil.FromCommon(item, ItemUtil.PositionOf(bracket.Data, at)));
    continue;
  }
  if (!(item instanceof Symbol)) {
    throw new Error("ConditionPossibleShape: 条件里出现不支持的单元");
  }
  if (!item.Closed) {
    item.TryToClose(context);
  }
  const info = BinaryOperatorTable.Find(item.TempToString());
  if (info === null) {
    throw new Error("ConditionPossibleShape: 不支持的运算符 " + item.TempToString());
  }
  while (infos.length > 0) {
    const top = infos[infos.length - 1];
    const pop = top.Precedence > info.Precedence
      || (top.Precedence === info.Precedence && !info.RightAssociative);
    if (!pop) {
      break;
    }
    ConditionPossibleShape.Combine(values, infos, operators, bracket.Template, context);
  }
  infos.push(info);
  operators.push(BinaryOperatorTable.Create(item, ItemUtil.PositionOf(bracket.Data, at)));
}
while (infos.length > 0) {
  ConditionPossibleShape.Combine(values, infos, operators, bracket.Template, context);
}
if (values.length !== 1) {
  throw new Error("ConditionPossibleShape: 条件表达式不完整");
}
return values[0];
```

## private static method Combine:(values:Array<Token>, infos:Array<BinaryOperatorInfo>, operators:Array<Token>, template:Template, context:SyntaxContext)=>void

```ts
const info = infos.pop();
const operator = operators.pop();
const right = values.pop();
const left = values.pop();
if (info === undefined || operator === undefined || right === undefined || left === undefined) {
  throw new Error("ConditionPossibleShape: 条件表达式栈不完整");
}
const binary = BinaryExpressionShape.FromLeftAndOperator(left, operator, info.Precedence, template);
binary.Pos = BinaryExpressionPossibleShape.PosOf(left);
binary.Add(right);
binary.TryToClose(context);
values.push(binary);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const bracket = units[tokenIndex] as Bracket;
const expression = ConditionPossibleShape.BuildExpression(bracket, context);
const control = host as ControlStatementShape;
control.Condition = expression;
units.splice(tokenIndex, 1, expression);
expression.Parent = host;
control.CatalogGuide = new CatalogGuide([new ControlBodyPossibleShape()], null);
host.MountedUnit = null;
return expression;
```
