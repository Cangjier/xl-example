# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
```

# namespace cangjie

# class ConditionShape extends ShapeToken

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
for (const item of this.Data) {
  if (!item.Closed) {
    item.TryToClose(context);
  }
}
for (let index = 0; index < this.Data.length; index++) {
  const item = this.Data[index];
  if (item.IsTriviaToken) {
    continue;
  }
  if (item.IsBasicToken) {
    throw new Error("ConditionShape: basic token 未被消费：" + item.AstText() + "（下标 " + index + "）");
  }
}
this.Data = this.Data.filter((item) => !item.IsTriviaToken);
this.Closed = true;
return CloseStates.Nothing;
```
