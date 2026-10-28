# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
```

# namespace cangjie

# class VariableDeclarationShape extends ShapeToken

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
for (const item of this.Data) {
  if (!item.Closed) {
    item.TryToClose(context);
  }
}
// Close 之后 Data 就是 AST 的 children：trivia 与 `=` 这类 basic token 全部退场。
this.Data = this.Data.filter((item) => !item.IsTriviaToken && !item.IsBasicToken);
// 声明范围到最后一个代码子单元为止（不含 `;` 与尾随 trivia）。
const last = this.Last();
if (last !== null && last.SourceRange.End >= 0) {
  this.SourceRange.End = last.SourceRange.End;
}
this.Closed = true;
return CloseStates.Nothing;
```
