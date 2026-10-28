# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class BinaryExpressionShape extends ShapeToken

## field Left:Token | null = null

## field Operator:Token | null = null

## field Precedence:int = 0

## static method FromLeftAndOperator:(left:Token, operator:Token, precedence:int, template:Template)=>BinaryExpressionShape

```ts
const shape = new BinaryExpressionShape(template);
shape.SignIn(left.SourceRange.Start);
shape.Add(left);
shape.Add(operator);
shape.Left = left;
shape.Operator = operator;
shape.Precedence = precedence;
return shape;
```

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
for (const item of this.Data) {
  if (!item.Closed) {
    item.TryToClose(context);
  }
}
this.Data = this.Data.filter((item) => !item.IsTriviaToken);
this.Closed = true;
return CloseStates.Nothing;
```
