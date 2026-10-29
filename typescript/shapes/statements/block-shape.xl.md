# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
```

# namespace cangjie

# class BlockShape extends ShapeToken

## field EndedByBrace:bool = false

## static method FromOpen:(open:Symbol, pos:int)=>BlockShape

```ts
const shape = new BlockShape(open.Template);
shape.Pos = pos;
shape.SignIn(open.SourceRange.Start);
shape.SignOut(open.SourceRange.End);
return shape;
```

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
for (const item of this.Data) {
  if (!item.Closed) {
    item.TryToClose(context);
  }
}
// `}` 已经给过右边界（BlockEndPossibleShape 设好 End 再关）；EOF 没有 `}`，
// 右边界取最后一个代码子单元的 End，不把尾随 trivia 算进来。
if (!this.EndedByBrace) {
  for (let at = this.Data.length - 1; at >= 0; at--) {
    const unit = this.Data[at];
    if (unit.IsTriviaToken) {
      continue;
    }
    if (unit.SourceRange.End >= 0) {
      this.SourceRange.End = unit.SourceRange.End;
    }
    break;
  }
}
this.Data = this.Data.filter((item) => !item.IsTriviaToken && !item.IsBasicToken);
this.Closed = true;
return CloseStates.Nothing;
```
