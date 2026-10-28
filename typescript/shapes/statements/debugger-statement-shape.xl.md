# dependencies
```xl
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class DebuggerStatementShape extends ShapeToken

## static method FromKeywordAndSemicolon:(keyword:Common, semicolon:Symbol, pos:int)=>DebuggerStatementShape

```ts
const shape = new DebuggerStatementShape(keyword.Template);
shape.Pos = pos;
shape.SignIn(keyword.SourceRange.Start);
shape.SignOut(semicolon.SourceRange.End);
shape.Closed = true;
return shape;
```
