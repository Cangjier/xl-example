# dependencies
```xl
import { ConstString } from "../../../core/syntax/basic-tokens/string/const-string.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class StringLiteralShape extends ShapeToken

```txt
"s"
```

## field Text:string = ""

## field IsUnterminated:bool = false

## field HasExtendedUnicodeEscape:bool = false

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromBasicToken:(token:String)=>StringLiteralShape

```ts
const shape = new StringLiteralShape(token.Template);
if (token.SourceRange.Start !== null) {
  shape.SignIn(token.SourceRange.Start);
}
if (token.SourceRange.End !== null) {
  shape.SignOut(token.SourceRange.End);
}
let text = "";
for (const part of token.Data) {
  if (part instanceof ConstString) {
    text += (part as ConstString).TempToString();
  }
}
shape.Text = text;
shape.IsUnterminated = !token.Closed;
shape.TryToClose();
return shape;
```
