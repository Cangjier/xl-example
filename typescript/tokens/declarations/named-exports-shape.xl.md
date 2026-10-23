# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { ExportSpecifierShape } from "./export-specifier-shape.xl.md"
```

# namespace cangjie

# class NamedExportsShape extends ShapeToken

```txt
export { a };
export { a, b as c };
```

## field Elements:Array<ExportSpecifierShape> = []

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromBracket:(bracket:Bracket, context:SyntaxContext)=>NamedExportsShape

```ts
const shape = new NamedExportsShape(bracket.Template);
const elements:Array<ExportSpecifierShape> = [];
let group:Array<Token> = [];
// 每个 specifier 的 Pos 是它前面那个非 trivia 单元（`{` 或 `,`）的 End+1：
// 括号与逗号都在 bracket.Data 里，从这里算得出，组内自己算不出。
let pos = bracket.SourceRange.StartIndex < 0 ? -1 : bracket.SourceRange.StartIndex + 1;
for (const item of bracket.Data) {
  if (item instanceof Symbol && (item as Symbol).Is(",")) {
    const specifier = ExportSpecifierShape.FromTokens(group, context, pos);
    if (specifier !== null) {
      elements.push(specifier);
    }
    group = [];
    pos = item.SourceRange.EndIndex < 0 ? -1 : item.SourceRange.EndIndex;
    continue;
  }
  group.push(item);
}
const tail = ExportSpecifierShape.FromTokens(group, context, pos);
if (tail !== null) {
  elements.push(tail);
}
shape.Elements = elements;
for (const item of elements) {
  item.Parent = shape;
  shape.Data.push(item);
}
if (bracket.SourceRange.StartIndex >= 0) {
  shape.SignIn(bracket.SourceRange.Start);
}
if (bracket.SourceRange.EndIndex >= 0) {
  shape.SignOut(bracket.SourceRange.End);
}
shape.TryToClose(context);
return shape;
```
