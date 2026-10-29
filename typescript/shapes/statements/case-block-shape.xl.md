# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
```

# namespace cangjie

# class CaseBlockShape extends ShapeToken

`switch (…) { … }` 里那个花括号块：children 是 CaseClause / DefaultClause。

## field EndedByBrace:bool = false

## static method FromOpen:(open:Symbol, pos:int)=>CaseBlockShape

```ts
const shape = new CaseBlockShape(open.Template);
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
if (!this.EndedByBrace) {
  for (let at = this.Data.length - 1; at >= 0; at--) {
    const unit = this.Data[at];
    if (unit.IsTriviaToken || unit.IsBasicToken) {
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
