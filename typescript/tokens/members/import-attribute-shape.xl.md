# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { StringLiteralShape } from "../literals/string-literal-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
```

# namespace cangjie

# class ImportAttributeShape extends ShapeToken

```txt
with { type: "json" }
```

## field Key:IdentifierShape | StringLiteralShape | null = null

## field Value:StringLiteralShape | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromTokens:(units:Array<Token>, context:SyntaxContext)=>ImportAttributeShape | null

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
const shape = new ImportAttributeShape(code[0].Template);
if (code[0] instanceof Common) {
  const key = IdentifierShape.FromBasicToken(code[0] as Common, context);
  shape.Key = key;
  shape.Data.push(key);
  key.Parent = shape;
} else if (code[0] instanceof String) {
  const key = StringLiteralShape.FromBasicToken(code[0] as String, context);
  shape.Key = key;
  shape.Data.push(key);
  key.Parent = shape;
}
if (code.length >= 3 && code[1] instanceof Symbol && code[2] instanceof String) {
  const value = StringLiteralShape.FromBasicToken(code[2] as String, context);
  shape.Value = value;
  shape.Data.push(value);
  value.Parent = shape;
}
const last = code[code.length - 1];
if (code[0].SourceRange.Start !== null) {
  shape.SignIn(code[0].SourceRange.Start);
}
if (last.SourceRange.End !== null) {
  shape.SignOut(last.SourceRange.End);
}
shape.TryToClose(context);
return shape;
```
