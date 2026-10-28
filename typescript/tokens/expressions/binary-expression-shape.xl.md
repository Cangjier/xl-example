# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { OperatorTable } from "./operator-table.xl.md"
```

# namespace cangjie

# class BinaryExpressionShape extends ShapeToken

```txt
a + b;
```

## field OperatorPrecedence:int = -1

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromLeftAndOperator:(left:Token, operator:Token, precedence:int, template:Template, trivia?:Array<Token> | null)=>BinaryExpressionShape

```ts
const shape = new BinaryExpressionShape(template);
if (left.SourceRange.Start >= 0) {
  shape.SignIn(left.SourceRange.Start);
}
if (!(left instanceof ShapeToken)) {
  throw new Error("增量变量形状未支持：expression 左操作数不是形状");
}
const leftShape = left as ShapeToken;
if (leftShape.Pos < 0) {
  throw new Error("增量变量形状未支持：expression 左操作数没有 Pos");
}
shape.Pos = leftShape.Pos;
shape.OperatorPrecedence = precedence;
shape.Add(left);
if (trivia !== undefined && trivia !== null) {
  for (const item of trivia) {
    shape.Add(item);
  }
}
shape.Add(operator);
return shape;
```

## static method NeedsReassociation:(left:Token, precedence:int, text:string)=>bool

```ts
if (!(left instanceof BinaryExpressionShape)) {
  return false;
}
const leftBinary = left as BinaryExpressionShape;
const leftPrecedence = leftBinary.OperatorPrecedence;
if (leftPrecedence < 0) {
  return false;
}
if (leftPrecedence < precedence) {
  return true;
}
return leftPrecedence === precedence && OperatorTable.IsRightAssociative(text);
```

## method SealRightOperand:(context:SyntaxContext)=>void

```ts
this.TryToClose(context);
if (this.Parent !== null && this.Parent.MountedUnit === this) {
  this.Quit();
}
```

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
for (const item of this.Data.slice()) {
  if (!item.Closed) {
    item.TryToClose(context);
  }
}
this.Closed = true;
return CloseStates.Nothing;
```
