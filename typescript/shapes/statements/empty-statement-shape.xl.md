# dependencies
```xl
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class EmptyStatementShape extends ShapeToken

## static method FromSemicolon:(semicolon:Symbol, pos:int)=>EmptyStatementShape

```ts
const shape = new EmptyStatementShape(semicolon.Template);
shape.Pos = pos;
shape.SignIn(semicolon.SourceRange.Start);
shape.SignOut(semicolon.SourceRange.End);
shape.Closed = true;
return shape;
```
