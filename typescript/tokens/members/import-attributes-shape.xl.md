# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { ImportAttributeShape } from "./import-attribute-shape.xl.md"
```

# namespace cangjie

# class ImportAttributesShape extends ShapeToken

```txt
import a from "m" with { type: "json" };
```

## field Token:string = "with"

## field Elements:Array<ImportAttributeShape> = []

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromBracket:(bracket:Bracket, token:string, context:SyntaxContext)=>ImportAttributesShape

```ts
const shape = new ImportAttributesShape(bracket.Template);
shape.Token = token;
const elements:Array<ImportAttributeShape> = [];
let group:Array<Token> = [];
for (const item of bracket.Data) {
  if (item instanceof Symbol && (item as Symbol).Is(",")) {
    const attribute = ImportAttributeShape.FromTokens(group, context);
    if (attribute !== null) {
      elements.push(attribute);
    }
    group = [];
    continue;
  }
  group.push(item);
}
const tail = ImportAttributeShape.FromTokens(group, context);
if (tail !== null) {
  elements.push(tail);
}
shape.Elements = elements;
for (const item of elements) {
  item.Parent = shape;
  shape.Data.push(item);
}
if (bracket.SourceRange.Start !== null) {
  shape.SignIn(bracket.SourceRange.Start);
}
if (bracket.SourceRange.End !== null) {
  shape.SignOut(bracket.SourceRange.End);
}
shape.TryToClose(context);
return shape;
```
