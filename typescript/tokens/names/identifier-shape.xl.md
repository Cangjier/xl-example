# dependencies
```xl
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class IdentifierShape extends ShapeToken

## field Text:string = ""

## static method FromCommon:(common:Common, pos:int)=>IdentifierShape

```ts
const shape = new IdentifierShape(common.Template);
shape.Pos = pos;
shape.Text = common.TempToString();
shape.SignIn(common.SourceRange.Start);
shape.SignOut(common.SourceRange.End);
shape.Closed = true;
return shape;
```
