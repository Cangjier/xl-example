# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { ImportSpecifierShape } from "./import-specifier-shape.xl.md"
```

# namespace cangjie

# class NamedImportsShape extends ShapeToken

```txt
import { a } from "m";
```

## field Elements:Array<ImportSpecifierShape> = []

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromBracket:(bracket:Bracket)=>NamedImportsShape

```ts
const shape = new NamedImportsShape(bracket.Template);
const elements:Array<ImportSpecifierShape> = [];
let group:Array<Token> = [];
for (const item of bracket.Data) {
  if (item instanceof Symbol && (item as Symbol).Is(",")) {
    const specifier = ImportSpecifierShape.FromTokens(group);
    if (specifier !== null) {
      elements.push(specifier);
    }
    group = [];
    continue;
  }
  group.push(item);
}
const tail = ImportSpecifierShape.FromTokens(group);
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
shape.TryToClose();
return shape;
```
