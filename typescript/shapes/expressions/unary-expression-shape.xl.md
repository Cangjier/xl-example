# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class UnaryExpressionShape extends ShapeToken

## field Operator:Token | null = null

## field AwaitingOperand:bool = false

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
for (const item of this.Data) {
  if (!item.Closed) {
    item.TryToClose(context);
  }
}
this.Data = this.Data.filter((item) => !item.IsTriviaToken);
const last = this.Last();
if (last !== null && last.SourceRange.End >= 0) {
  this.SourceRange.End = last.SourceRange.End;
}
this.Data = this.Data.filter((item) => !item.IsBasicToken);
this.Closed = true;
return CloseStates.Nothing;
```
