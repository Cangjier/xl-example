# dependencies
```xl
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { BinaryExpressionShape } from "./binary-expression-shape.xl.md"
import { ConditionalExpressionShape } from "./conditional-expression-shape.xl.md"
import { OperatorTable } from "./operator-table.xl.md"
```

# namespace cangjie

# class ShapeOperatorStack

## static field ConditionalPrecedence:int = 1

## field Template:Template

## field Nodes:Array<Token> = []

## field Frames:Array<Token> = []

## field FramePrecs:Array<int> = []

## field FramePending:Array<bool> = []

## field Open:Token | null = null

## field LastReduced:Token | null = null

## constructor:(template:Template)=>void

```ts
this.Template = template;
```

## method Top:()=>Token | null

```ts
if (this.Frames.length === 0) {
  return null;
}
return this.Frames[this.Frames.length - 1];
```

## method IsPending:()=>bool

```ts
if (this.Frames.length === 0) {
  return false;
}
return this.FramePending[this.FramePending.length - 1];
```

## method IsEmpty:()=>bool

```ts
return this.Frames.length === 0 && this.Nodes.length === 0;
```

## method NodeCount:()=>int

```ts
return this.Nodes.length;
```

## method Root:()=>Token | null

```ts
if (this.Frames.length > 0) {
  return this.Frames[0];
}
if (this.Nodes.length === 0) {
  return null;
}
return this.Nodes[this.Nodes.length - 1];
```

## method PushOperand:(shape:Token)=>void

```ts
this.Open = shape;
if (this.IsPending()) {
  this.AttachRight(shape);
  return;
}
this.Nodes.push(shape);
```

## method AttachRight:(shape:Token)=>void

```ts
if (this.Frames.length === 0) {
  throw new Error("增量变量形状未支持：expression 右操作数没有挂载点");
}
if (!this.FramePending[this.FramePending.length - 1]) {
  throw new Error("增量变量形状未支持：expression 右操作数重复");
}
this.MoveInto(this.Frames[this.Frames.length - 1], shape);
this.FramePending[this.FramePending.length - 1] = false;
this.Open = shape;
```

## method PushOperator:(opShape:Token, text:string)=>void

```ts
if (text === "?") {
  this.StartConditional(opShape);
  return;
}
if (text === ":") {
  this.CloseConditional(opShape);
  return;
}
let precedence = OperatorTable.Precedence(text);
if (OperatorTable.IsAssignmentOperator(text)) {
  precedence = OperatorTable.AssignmentPrecedence;
}
if (precedence < 0) {
  throw new Error("增量变量形状未支持：expression 运算符 " + text);
}
const rightAssoc = OperatorTable.IsRightAssociative(text) || OperatorTable.IsAssignmentOperator(text);
this.Open = null;
this.Reduce(precedence, rightAssoc);
const parent = this.Top();
const left = this.NextLeft(text);
let leftHost: Token | null = null;
if (parent === null) {
  leftHost = left.Parent;
}
const operatorHost = opShape.Parent;
this.CheckOperatorPos(opShape, left, text);
const binary = BinaryExpressionShape.FromLeftAndOperator(left, opShape, precedence, this.Template);
this.Mount(binary, left, leftHost, opShape, operatorHost);
if (parent !== null) {
  parent.Add(binary);
}
this.Frames.push(binary);
this.FramePrecs.push(precedence);
this.FramePending.push(true);
```

## method Reduce:(precedence:int, rightAssoc:bool)=>Token|null

```ts
let reduced: Token | null = null;
while (this.Frames.length > 0) {
  const top = this.Frames.length - 1;
  if (this.FramePending[top]) {
    break;
  }
  if (this.FramePrecs[top] === ShapeOperatorStack.ConditionalPrecedence) {
    break;
  }
  if (!(this.FramePrecs[top] > precedence || (this.FramePrecs[top] === precedence && !rightAssoc))) {
    break;
  }
  reduced = this.ReduceTop();
}
return reduced;
```

## method Drain:()=>Token|null

```ts
this.Open = null;
this.LastReduced = null;
while (this.Frames.length > 0) {
  this.ReduceTop();
}
if (this.Nodes.length > 1) {
  throw new Error("增量变量形状未支持：expression 归约后残留 " + String(this.Nodes.length) + " 个操作数");
}
if (this.Nodes.length === 1) {
  return this.Nodes[0];
}
return this.LastReduced;
```

## private method StartConditional:(questionShape:Token)=>void

```ts
this.Open = null;
this.Reduce(ShapeOperatorStack.ConditionalPrecedence, true);
const parent = this.Top();
const condition = this.NextLeft("?");
let leftHost: Token | null = null;
if (parent === null) {
  leftHost = condition.Parent;
}
const operatorHost = questionShape.Parent;
this.CheckOperatorPos(questionShape, condition, "?");
const conditional = new ConditionalExpressionShape(this.Template);
if (condition.SourceRange.Start >= 0) {
  conditional.SignIn(condition.SourceRange.Start);
}
const conditionPos = this.PosOf(condition);
if (conditionPos >= 0) {
  conditional.Pos = conditionPos;
}
conditional.Add(condition);
conditional.Add(questionShape);
this.Mount(conditional, condition, leftHost, questionShape, operatorHost);
if (parent !== null) {
  parent.Add(conditional);
}
this.Frames.push(conditional);
this.FramePrecs.push(ShapeOperatorStack.ConditionalPrecedence);
this.FramePending.push(true);
```

## private method CloseConditional:(colonShape:Token)=>void

```ts
this.Open = null;
while (this.Frames.length > 0) {
  const top = this.Frames.length - 1;
  if (this.FramePrecs[top] === ShapeOperatorStack.ConditionalPrecedence) {
    break;
  }
  if (this.FramePending[top]) {
    throw new Error("增量变量形状未支持：expression 条件表达式真分支缺少右操作数");
  }
  this.ReduceTop();
}
if (this.Frames.length === 0) {
  throw new Error("增量变量形状未支持：expression 冒号没有对应的条件表达式");
}
const top = this.Frames.length - 1;
if (this.FramePrecs[top] !== ShapeOperatorStack.ConditionalPrecedence) {
  throw new Error("增量变量形状未支持：expression 冒号没有对应的条件表达式");
}
if (this.FramePending[top]) {
  throw new Error("增量变量形状未支持：expression 条件表达式缺少真分支");
}
const conditional = this.Frames[top];
const branch = conditional.Data[conditional.Data.length - 1];
this.CheckOperatorPos(colonShape, branch, ":");
conditional.Add(colonShape);
this.FramePending[top] = true;
```

## private method NextLeft:(text:string)=>Token

```ts
if (this.Frames.length > 0) {
  const top = this.Frames.length - 1;
  if (this.FramePending[top]) {
    throw new Error("增量变量形状未支持：expression 新运算符缺少右操作数（运算符 " + text + "）");
  }
  const node = this.Frames[top];
  const lastIndex = node.Data.length - 1;
  if (lastIndex < 2) {
    throw new Error("增量变量形状未支持：expression 栈顶节点缺少右操作数（运算符 " + text + "）");
  }
  const right = node.Data[lastIndex];
  node.Data.splice(lastIndex, 1);
  return right;
}
if (this.Nodes.length === 0) {
  throw new Error("增量变量形状未支持：expression 缺少左操作数（运算符 " + text + "）");
}
return this.Nodes.pop()!;
```

## private method ReduceTop:()=>Token|null

```ts
if (this.Frames.length === 0) {
  return null;
}
const top = this.Frames.length - 1;
if (this.FramePending[top]) {
  throw new Error("增量变量形状未支持：expression 归约时栈顶运算符缺少右操作数");
}
const node = this.Frames[top];
this.Seal(node);
this.Frames.pop();
this.FramePrecs.pop();
this.FramePending.pop();
this.LastReduced = node;
if (node.Parent === null) {
  this.Nodes.push(node);
}
return node;
```

## private method Mount:(node:Token, left:Token, leftHost:Token|null, operator:Token, operatorHost:Token|null)=>void

```ts
if (operatorHost !== null && operatorHost !== node) {
  const operatorIndex = operatorHost.Data.indexOf(operator);
  if (operatorIndex >= 0) {
    if (operatorHost.MountedUnit === operator) {
      operatorHost.MountedUnit = null;
    }
    operatorHost.Data.splice(operatorIndex, 1);
  }
}
if (leftHost === null) {
  return;
}
const leftIndex = leftHost.Data.indexOf(left);
if (leftIndex < 0) {
  return;
}
if (leftHost.MountedUnit === left) {
  leftHost.MountedUnit = node;
}
leftHost.Data.splice(leftIndex, 1);
leftHost.Data.splice(leftIndex, 0, node);
node.Parent = leftHost;
```

## private method MoveInto:(node:Token, shape:Token)=>void

```ts
if (shape.Parent !== null && shape.Parent !== node) {
  const parent = shape.Parent;
  const index = parent.Data.indexOf(shape);
  if (index >= 0) {
    parent.Data.splice(index, 1);
  }
  if (parent.MountedUnit === shape) {
    parent.MountedUnit = node;
  }
}
if (shape.Parent !== node) {
  node.Add(shape);
}
```

## private method PosOf:(shape:Token)=>int

```ts
if (!(shape instanceof ShapeToken)) {
  return -1;
}
return (shape as ShapeToken).Pos;
```

## private method CheckOperatorPos:(operator:Token, previous:Token, text:string)=>void

```ts
const end = previous.SourceRange.End;
if (end < 0) {
  return;
}
if (!(operator instanceof ShapeToken)) {
  throw new Error("增量变量形状未支持：expression 运算符不是形状（" + text + "）");
}
const operatorShape = operator as ShapeToken;
if (operatorShape.Pos < 0) {
  operatorShape.Pos = end;
  return;
}
if (operatorShape.Pos !== end) {
  throw new Error("增量变量形状未支持：expression 运算符 Pos 与左操作数不一致（" + text + "）");
}
```

## private method Seal:(node:Token)=>void

```ts
if (node.SourceRange.End >= 0) {
  return;
}
if (node.Data.length === 0) {
  return;
}
const last = node.Data[node.Data.length - 1];
if (last.SourceRange.End >= 0) {
  node.SignOut(last.SourceRange.End);
}
```
