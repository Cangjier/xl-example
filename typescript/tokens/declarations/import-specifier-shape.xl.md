# dependencies
```xl
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { StringLiteralShape } from "../literals/string-literal-shape.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
```

# namespace cangjie

# class ImportSpecifierShape extends ShapeToken

```txt
import { a as b } from "m";
```

## field PropertyName:IdentifierShape | StringLiteralShape | null = null

## field Name:IdentifierShape | null = null

## field IsTypeOnly:bool = false

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromTokens:(units:Array<Token>, context:SyntaxContext)=>ImportSpecifierShape | null

```ts
const code:Array<Token> = [];
for (const item of units) {
  if (!item.IsTriviaToken) {
    code.push(item);
  }
}
if (code.length === 0) {
  return null;
}
let at = 0;
const shape = new ImportSpecifierShape(code[0].Template);
if (code[at] instanceof Common && (code[at] as Common).Is("type")) {
  shape.IsTypeOnly = true;
  at++;
}
if (at >= code.length || !(code[at] instanceof Common)) {
  return null;
}
const first = IdentifierShape.FromBasicToken(code[at] as Common, context);
shape.PropertyName = first;
shape.Data.push(first);
first.Parent = shape;
let last = code[at];
at++;
if (at + 1 < code.length && code[at] instanceof Common && (code[at] as Common).Is("as") && code[at + 1] instanceof Common) {
  const second = IdentifierShape.FromBasicToken(code[at + 1] as Common, context);
  shape.Name = second;
  shape.Data.push(second);
  second.Parent = shape;
  last = code[at + 1];
}
if (shape.Name === null && shape.PropertyName !== null) {
  shape.Name = shape.PropertyName;
  shape.PropertyName = null;
}
if (code[0].SourceRange.Start !== null) {
  shape.SignIn(code[0].SourceRange.Start);
}
if (last.SourceRange.End !== null) {
  shape.SignOut(last.SourceRange.End);
}
shape.TryToClose(context);
return shape;
```
