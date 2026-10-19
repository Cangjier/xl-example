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

# class ExportSpecifierShape extends ShapeToken

```txt
export { a as b };
```

## field PropertyName:IdentifierShape | null = null

## field Name:IdentifierShape | null = null

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
if (!(code[0] instanceof Common)) {
  return null;
}
const first = IdentifierShape.FromBasicToken(code[0] as Common, context);
first.Pos = pos;
shape.PropertyName = first;
shape.Data.push(first);
first.Parent = shape;
let last = code[0];
if (code.length >= 3 && code[1] instanceof Common && (code[1] as Common).Is("as") && code[2] instanceof Common) {
  const second = IdentifierShape.FromBasicToken(code[2] as Common, context);
  const asEnd = code[1].SourceRange.End;
  second.Pos = asEnd !== null ? asEnd.Index + 1 : -1;
  shape.Name = second;
  shape.Data.push(second);
  second.Parent = shape;
  last = code[2];
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
