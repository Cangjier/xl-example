# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { CallExpressionShape } from "./call-expression-shape.xl.md"
```

# namespace cangjie

# class NewExpressionShape extends ShapeToken

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
for (const item of this.Data) {
  if (!item.Closed) {
    item.TryToClose(context);
  }
}
let callIndex = -1;
for (let at = this.Data.length - 1; at >= 0; at--) {
  const item = this.Data[at];
  if (item.IsTriviaToken) {
    continue;
  }
  if (item instanceof CallExpressionShape) {
    callIndex = at;
  }
  break;
}
if (callIndex >= 0) {
  const call = this.Data[callIndex] as CallExpressionShape;
  const children = call.Data.slice();
  this.Data.splice(callIndex, 1);
  for (let at = 0; at < children.length; at++) {
    const child = children[at];
    child.Parent = this;
    this.Data.splice(callIndex + at, 0, child);
  }
  this.SourceRange.End = call.SourceRange.End;
}
this.Data = this.Data.filter((item) => !item.IsTriviaToken && !item.IsBasicToken);
const last = this.Last();
if (this.SourceRange.End < 0 && last !== null && last.SourceRange.End >= 0) {
  this.SourceRange.End = last.SourceRange.End;
}
this.Closed = true;
return CloseStates.Nothing;
```
