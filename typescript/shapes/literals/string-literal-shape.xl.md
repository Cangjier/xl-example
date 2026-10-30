# dependencies
```xl
import { ConstString } from "../../../core/syntax/basic-tokens/string/const-string.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class StringLiteralShape extends ShapeToken

## field Text:string = ""

## static method FromString:(string:String, pos:int)=>StringLiteralShape

```ts
const shape = new StringLiteralShape(string.Template);
shape.Pos = pos;
shape.Text = StringLiteralShape.ValueOf(string);
shape.SignIn(string.SourceRange.Start);
shape.SignOut(string.SourceRange.End);
shape.Closed = true;
return shape;
```

## static method ValueOf:(string:String)=>string

```ts
// 引号串的内容由 ConstString 按转义解码后保存；TS 的 StringLiteral.text 也是解码后的值。
for (const item of string.Data) {
  if (item instanceof ConstString) {
    return item.Temp;
  }
}
return "";
```
