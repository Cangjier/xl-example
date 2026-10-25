# dependencies
```xl
import { ConstString } from "../../../core/syntax/basic-tokens/string/const-string.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
```

# namespace cangjie

# class NoSubstitutionTemplateLiteralShape extends ShapeToken

```txt
`t`
```

## field Text:string = ""

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromBasicToken:(token:String, context:SyntaxContext)=>NoSubstitutionTemplateLiteralShape

```ts
const shape = new NoSubstitutionTemplateLiteralShape(token.Template);
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
shape.TryToClose(context);
return shape;
```
