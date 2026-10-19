# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { RegexToken } from "../../../core/syntax/basic-tokens/regex-token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class RegularExpressionLiteralShape extends ShapeToken

```txt
/re/g
```

## field Text:string = ""

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromBasicToken:(token:RegexToken, context:SyntaxContext)=>RegularExpressionLiteralShape

```ts
const shape = new RegularExpressionLiteralShape(token.Template);
if (token.SourceRange.Start !== null) {
  shape.SignIn(token.SourceRange.Start);
}
if (token.SourceRange.End !== null) {
  shape.SignOut(token.SourceRange.End);
}
shape.Text = token.ToText();
shape.TryToClose(context);
return shape;
```
