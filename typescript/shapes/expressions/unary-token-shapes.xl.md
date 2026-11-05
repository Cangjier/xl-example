# dependencies
```xl
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { BinaryOperatorTokenShape } from "../punctuation/binary-operator-token-shape.xl.md"
```

# namespace cangjie

# class ExclamationTokenShape extends BinaryOperatorTokenShape

## field Op:string = "!"

# class TildeTokenShape extends BinaryOperatorTokenShape

## field Op:string = "~"

# class ColonTokenShape extends BinaryOperatorTokenShape

## field Op:string = ":"

# class PlusPlusTokenShape extends BinaryOperatorTokenShape

## field Op:string = "++"

# class MinusMinusTokenShape extends BinaryOperatorTokenShape

## field Op:string = "--"

# class PrefixKeywordTokenShape extends ShapeToken

## field Text:string = ""

## static method FromCommon:(common:Common, pos:int, text:string)=>PrefixKeywordTokenShape

```ts
const shape = new PrefixKeywordTokenShape(common.Template);
shape.Pos = pos;
shape.Text = text;
shape.SignIn(common.SourceRange.Start);
shape.SignOut(common.SourceRange.End);
shape.Closed = true;
return shape;
```
