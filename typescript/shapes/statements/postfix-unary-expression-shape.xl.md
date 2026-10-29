# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
```

# namespace cangjie

# class PostfixUnaryExpressionShape extends ShapeToken

`i++` / `i--`：TS 的 PostfixUnaryExpression，children 只有操作数（运算符不进 children）。

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
for (const item of this.Data) {
  if (!item.Closed) {
    item.TryToClose(context);
  }
}
if (this.SourceRange.End < 0) {
  const last = this.Last();
  if (last !== null && last.SourceRange.End >= 0) {
    this.SourceRange.End = last.SourceRange.End;
  }
}
this.Data = this.Data.filter((item) => !item.IsTriviaToken && !item.IsBasicToken);
this.Closed = true;
return CloseStates.Nothing;
```
