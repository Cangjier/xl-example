# dependencies
```xl
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class QuestionDotTokenShape extends ShapeToken

## static method FromSymbol:(symbol:Symbol, pos:int)=>QuestionDotTokenShape

```ts
const shape = new QuestionDotTokenShape(symbol.Template);
shape.Pos = pos;
shape.SignIn(symbol.SourceRange.Start);
shape.SignOut(symbol.SourceRange.End);
shape.Closed = true;
return shape;
```
