# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
```

# namespace cangjie

# class NamespaceExportShape extends ShapeToken

```txt
export * as ns from "m";
```

## field Name:IdentifierShape | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromTokens:(units:Array<Token>, context:SyntaxContext)=>NamespaceExportShape | null

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
const shape = new NamespaceExportShape(code[0].Template);
const lastUnit = code[code.length - 1];
if (lastUnit instanceof Common) {
  const identifier = IdentifierShape.FromBasicToken(lastUnit as Common, context);
  // 名字的 Pos 取它前面那个非 trivia 单元（`as`）的 End+1。
  if (code.length >= 2) {
    const previous = code[code.length - 2];
    if (previous.SourceRange.End !== null) {
      identifier.Pos = previous.SourceRange.End.Index + 1;
    }
  }
  shape.Name = identifier;
  shape.Data.push(identifier);
  identifier.Parent = shape;
}
if (code[0].SourceRange.Start !== null) {
  shape.SignIn(code[0].SourceRange.Start);
}
if (lastUnit.SourceRange.End !== null) {
  shape.SignOut(lastUnit.SourceRange.End);
}
shape.TryToClose(context);
return shape;
```
