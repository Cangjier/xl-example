# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class NumericLiteralShape extends ShapeToken

```txt
1
1.5
0x1f
```

## field Text:string = ""

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromBasicToken:(token:Common, context:SyntaxContext)=>NumericLiteralShape

```ts
if (!token.IsNumber()) {
  throw new Error("不是数字字面量: " + token.TempToString());
}
const shape = new NumericLiteralShape(token.Template);
if (token.SourceRange.Start !== null) {
  shape.SignIn(token.SourceRange.Start);
}
if (token.SourceRange.End !== null) {
  shape.SignOut(token.SourceRange.End);
}
const body = token.NumberBody();
let raw = "";
for (const item of body) {
  if (item !== "_") {
    raw += item;
  }
}
shape.Text = String(Number(raw));
shape.TryToClose(context);
return shape;
```
