# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class BlockShape extends ShapeToken

## static method FromBracket:(bracket:Bracket, pos:int)=>BlockShape

```ts
const shape = new BlockShape(bracket.Template);
shape.Pos = pos;
shape.SignIn(bracket.SourceRange.Start);
shape.SignOut(bracket.SourceRange.End);
shape.Closed = true;
return shape;
```
