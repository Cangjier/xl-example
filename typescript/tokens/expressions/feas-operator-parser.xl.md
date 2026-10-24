# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeInsertUtil } from "../shape-insert-util.xl.md"
import { BinaryExpressionShape } from "./binary-expression-shape.xl.md"
import { ExpressionBuilder } from "./expression-builder.xl.md"
import { FeasBinaryOperatorPossibleShape } from "./feas-binary-operator-possible-shape.xl.md"
import { FeasOperandPossibleShape } from "./feas-operand-possible-shape.xl.md"
import { FeasPrefixUnaryPossibleShape } from "./feas-prefix-unary-possible-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { NumericLiteralShape } from "../literals/numeric-literal-shape.xl.md"
import { OperatorTable } from "./operator-table.xl.md"
import { ParenthesizedExpressionShape } from "./parenthesized-expression-shape.xl.md"
import { PrefixUnaryExpressionShape } from "./prefix-unary-expression-shape.xl.md"
```

# namespace cangjie

# class FeasOperatorParser

```txt
1*2+3   ->  +( *(1,2), 3 )
a+b*c   ->  +( a, *(b,c) )
a-b-c   ->  - ( -(a,b), c )
a*(b+c) ->  *( a, (b+c) )
```

可行性原型 B 的**增量表达式解析器**：按真实 basic token 单元逐格推进，遇操作数建叶子、遇二元操作符**立刻**建 `BinaryExpressionShape`，遇更高优先级操作符时用 `ShapeInsertUtil.InsertBetween` 把新 shape 插进当前父子之间（已建好的子表达式变成新 shape 的左操作数）。

只覆盖 `+ - * /`、圆括号、数字 / 标识符，且**只用于对拍与可行性验证**：主解析路径一行都不接（见 `HANDOFF.md`）。位置 / 文本 / 运算符单元 / span 全部复用 `ExpressionBuilder` 的公开入口，保证与基线逐字节同口径；增量建树与插入是本类自己的逻辑。

## field Template:Template

## field Context:SyntaxContext

## field Builder:ExpressionBuilder

## field Units:Array<Token> = []

## field Positions:Array<int> = []

## field At:int = 0

## field Cache:PossibleShapeCache = new PossibleShapeCache()

## field OperandPossible:FeasOperandPossibleShape = new FeasOperandPossibleShape()

## field BinaryPossible:FeasBinaryOperatorPossibleShape = new FeasBinaryOperatorPossibleShape()

## field PrefixPossible:FeasPrefixUnaryPossibleShape = new FeasPrefixUnaryPossibleShape()

## constructor:(template:Template, context:SyntaxContext)=>void

```ts
this.Template = template;
this.Context = context;
this.Builder = new ExpressionBuilder(template, context);
```

## method Load:(units:Array<Token>, basePos:int)=>void

```ts
this.Builder.Load(units, basePos);
this.Units = this.Builder.Units;
this.Positions = this.Builder.Positions;
this.At = 0;
```

## method ParseExpression:()=>Token

```ts
const frames:Array<Token> = [];
const precs:Array<number> = [];
const pending:Array<boolean> = [];
const starts:Array<number> = [];
const ends:Array<number> = [];
const rightStarts:Array<number> = [];
const prefixShapes:Array<Token> = [];
const prefixStarts:Array<number> = [];
let left:Token | null = null;
let leftStart = 0;
let leftEnd = 0;
while (this.At < this.Units.length) {
  const index = this.At;
  const unit = this.Units[index];
  if (left === null && this.IsOperandStart(index)) {
    let built = this.BuildOperand(unit, index);
    let start = index;
    const end = index;
    this.At++;
    while (prefixShapes.length > 0) {
      const shape = prefixShapes.pop()!;
      const shapeStart = prefixStarts.pop()!;
      shape.Add(built);
      this.FinishNode(shape, shapeStart, end);
      built = shape;
      start = shapeStart;
    }
    if (frames.length > 0) {
      const top = frames[frames.length - 1];
      top.Add(built);
      pending[frames.length - 1] = false;
      ends[frames.length - 1] = end;
      rightStarts[frames.length - 1] = start;
      this.FinishNode(top, starts[frames.length - 1], end);
    } else {
      left = built;
      leftStart = start;
      leftEnd = end;
    }
    continue;
  }
  if (this.IsBinaryOperator(index) && (left !== null || this.HasCompleteFrame(frames, pending))) {
    const text = this.TextOf(unit);
    const precedence = OperatorTable.Precedence(text);
    const rightAssoc = OperatorTable.IsRightAssociative(text);
    while (frames.length > 0 && !pending[frames.length - 1]
      && (precs[precs.length - 1] > precedence
        || (precs[precs.length - 1] === precedence && !rightAssoc))) {
      const completed = frames.pop()!;
      precs.pop();
      pending.pop();
      const completedStart = starts.pop()!;
      const completedEnd = ends.pop()!;
      rightStarts.pop();
      left = completed;
      leftStart = completedStart;
      leftEnd = completedEnd;
    }
    if (left === null) {
      if (frames.length === 0 || pending[frames.length - 1]) {
        throw new Error("FeasOperatorParser: 二元运算符前缺少表达式");
      }
    }
    const shape = new BinaryExpressionShape(this.Template);
    let shapeStart = leftStart;
    if (frames.length > 0) {
      const top = frames[frames.length - 1];
      const operand = top.Data[top.Data.length - 1];
      ShapeInsertUtil.InsertBetween(top, operand, shape);
      shapeStart = rightStarts[rightStarts.length - 1];
    } else {
      shape.Add(left!);
    }
    shape.Add(this.Builder.MakeOperatorToken(unit, index));
    this.At++;
    frames.push(shape);
    precs.push(precedence);
    pending.push(true);
    starts.push(shapeStart);
    ends.push(leftEnd);
    rightStarts.push(0);
    left = null;
    continue;
  }
  if (left === null && this.IsPrefixOperator(index)) {
    prefixShapes.push(new PrefixUnaryExpressionShape(this.Template));
    prefixStarts.push(index);
    this.At++;
    continue;
  }
  throw new Error("FeasOperatorParser: 无法处理的单元（下标 " + String(index) + "）");
}
if (left === null && frames.length === 0) {
  throw new Error("FeasOperatorParser: 表达式意外结束");
}
while (frames.length > 0) {
  if (pending[frames.length - 1]) {
    throw new Error("FeasOperatorParser: 表达式在运算符处意外结束");
  }
  const completed = frames.pop()!;
  precs.pop();
  pending.pop();
  const completedStart = starts.pop()!;
  const completedEnd = ends.pop()!;
  rightStarts.pop();
  left = completed;
  leftStart = completedStart;
  leftEnd = completedEnd;
}
if (prefixShapes.length > 0) {
  throw new Error("FeasOperatorParser: 前缀运算符缺少操作数");
}
if (this.At !== this.Units.length) {
  throw new Error("FeasOperatorParser: 单元没有读完");
}
return left!;
```

## method HasCompleteFrame:(frames:Array<Token>, pending:Array<bool>)=>bool

```ts
if (frames.length === 0) {
  return false;
}
return !pending[frames.length - 1];
```

## method IsOperandStart:(index:int)=>bool

```ts
return this.OperandPossible.ComputeByIndex(this.Units, index, this.Cache) === ShapeStates.Accept;
```

## method IsBinaryOperator:(index:int)=>bool

```ts
return this.BinaryPossible.ComputeByIndex(this.Units, index, this.Cache) === ShapeStates.Accept;
```

## method IsPrefixOperator:(index:int)=>bool

```ts
return this.PrefixPossible.ComputeByIndex(this.Units, index, this.Cache) === ShapeStates.Accept;
```

## method TextOf:(unit:Token)=>string

```ts
if (unit instanceof Common) {
  return (unit as Common).TempToString();
}
if (unit instanceof Symbol) {
  return (unit as Symbol).TempToString();
}
return "";
```

## method FinishNode:(shape:Token, startIndex:int, endIndex:int)=>void

与 `ExpressionBuilder.SpanNode` 同一个 span 口径，只多一条保护：**起点已经签过的形状（被 `InsertBetween` 从子节点继承过范围）不再重签**——`SourceRange` 写一次就锁死，重签会抛 `SourceRangeStartIsSetted`。

```ts
if (!(shape instanceof ShapeToken)) {
  return;
}
const node = shape as ShapeToken;
const head = this.Units[startIndex];
const tail = this.Units[endIndex];
if (node.SourceRange.Start < 0 && head.SourceRange.StartIndex >= 0) {
  node.SignIn(head.SourceRange.StartIndex);
}
if (node.SourceRange.End < 0 && tail.SourceRange.EndIndex >= 0) {
  node.SignOut(tail.SourceRange.EndIndex);
}
node.Pos = this.Positions[startIndex];
```

## method BuildOperand:(unit:Token, index:int)=>Token

```ts
if (unit instanceof Bracket) {
  const bracket = unit as Bracket;
  if (bracket.StartBracketChar !== "(") {
    throw new Error("FeasOperatorParser: 只支持圆括号操作数");
  }
  let base = 0;
  if (bracket.SourceRange.StartIndex >= 0) {
    base = bracket.SourceRange.StartIndex + 1;
  }
  const inner = new FeasOperatorParser(this.Template, this.Context);
  inner.Load(bracket.Data, base);
  const expression = inner.ParseExpression();
  const shape = new ParenthesizedExpressionShape(this.Template);
  shape.Add(expression);
  this.FinishNode(shape, index, index);
  return shape;
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  let shape:ShapeToken;
  if (this.Builder.StartsNumber(text)) {
    shape = NumericLiteralShape.FromBasicToken(unit as Common, this.Context);
  } else {
    shape = IdentifierShape.FromBasicToken(unit as Common, this.Context);
  }
  shape.Pos = this.Builder.Positions[index];
  return shape;
}
throw new Error("FeasOperatorParser: 不是操作数起点");
```
