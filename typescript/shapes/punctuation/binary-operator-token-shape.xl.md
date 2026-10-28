# dependencies
```xl
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class BinaryOperatorTokenShape extends ShapeToken

## field Op:string = ""

## static method FromSymbol:(symbol:Symbol, pos:int)=>BinaryOperatorTokenShape

```ts
const shape = new this(symbol.Template);
shape.Pos = pos;
shape.SignIn(symbol.SourceRange.Start);
shape.SignOut(symbol.SourceRange.End);
shape.Closed = true;
return shape;
```
