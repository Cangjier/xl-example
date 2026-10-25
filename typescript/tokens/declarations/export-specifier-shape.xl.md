# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { StringLiteralShape } from "../literals/string-literal-shape.xl.md"
```

# namespace cangjie

# class ExportSpecifierShape extends ShapeToken

```txt
export { a as b };
export { "a-b" as c } from "m";
export { a as "b-c" } from "m";
```

## field PropertyName:Token | null = null

## field Name:Token | null = null

## field IsTypeOnly:bool = false

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromTokens:(units:Array<Token>, context:SyntaxContext, pos:int)=>ExportSpecifierShape | null

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
const shape = new ExportSpecifierShape(code[0].Template);
// pos 由调用方给：它前面那个非 trivia 单元（`{` 或 `,`）的 End+1，组内看不到那一格。
shape.Pos = pos;
// inline type-only specifier: `export { type T } ...` — leading `type` is the isTypeOnly modifier
// when another name follows; a lone `{ type }` still exports an identifier literally named `type`.
let base = 0;
let typeUnit:Token | null = null;
if (code.length >= 2 && code[0] instanceof Common && (code[0] as Common).Is("type")) {
  typeUnit = code[0];
  shape.IsTypeOnly = true;
  base = 1;
}
let first:ShapeToken;
if (code[base] instanceof Common) {
  first = IdentifierShape.FromBasicToken(code[base] as Common, context);
} else if (code[base] instanceof String) {
  first = StringLiteralShape.FromBasicToken(code[base] as String, context);
} else {
  return null;
}
if (typeUnit !== null && typeUnit.SourceRange.EndIndex >= 0) {
  first.Pos = typeUnit.SourceRange.EndIndex;
} else {
  first.Pos = pos;
}
shape.PropertyName = first;
shape.Data.push(first);
first.Parent = shape;
let last:Token = code[base];
if (code.length >= base + 3 && code[base + 1] instanceof Common && (code[base + 1] as Common).Is("as")) {
  let second:ShapeToken | null = null;
  if (code[base + 2] instanceof Common) {
    second = IdentifierShape.FromBasicToken(code[base + 2] as Common, context);
  } else if (code[base + 2] instanceof String) {
    second = StringLiteralShape.FromBasicToken(code[base + 2] as String, context);
  }
  if (second === null) {
    return null;
  }
  const asEnd = code[base + 1].SourceRange.EndIndex;
  second.Pos = asEnd >= 0 ? asEnd : -1;
  shape.Name = second;
  shape.Data.push(second);
  second.Parent = shape;
  last = code[base + 2];
}
if (shape.Name === null && shape.PropertyName !== null) {
  shape.Name = shape.PropertyName;
  shape.PropertyName = null;
}
if (code[0].SourceRange.StartIndex >= 0) {
  shape.SignIn(code[0].SourceRange.Start);
}
if (last.SourceRange.EndIndex >= 0) {
  shape.SignOut(last.SourceRange.End);
}
shape.TryToClose(context);
return shape;
```
