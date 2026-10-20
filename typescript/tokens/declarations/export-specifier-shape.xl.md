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

TS 4.5 起导出名可以是字符串字面量：`export { "a-b" as c }` 的 children 是 `[StringLiteral "a-b", Identifier c]`，
`export { a as "b-c" }` 是 `[Identifier a, StringLiteral "b-c"]`。所以两个位置都接受 `Common`（Identifier 叶子）
或 `String`（StringLiteral 叶子）；`text` / `name` 字段由叶子自己给出。

## field PropertyName:Token | null = null

## field Name:Token | null = null

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
let first:ShapeToken;
if (code[0] instanceof Common) {
  first = IdentifierShape.FromBasicToken(code[0] as Common, context);
} else if (code[0] instanceof String) {
  first = StringLiteralShape.FromBasicToken(code[0] as String, context);
} else {
  return null;
}
first.Pos = pos;
shape.PropertyName = first;
shape.Data.push(first);
first.Parent = shape;
let last:Token = code[0];
if (code.length >= 3 && code[1] instanceof Common && (code[1] as Common).Is("as")) {
  let second:ShapeToken | null = null;
  if (code[2] instanceof Common) {
    second = IdentifierShape.FromBasicToken(code[2] as Common, context);
  } else if (code[2] instanceof String) {
    second = StringLiteralShape.FromBasicToken(code[2] as String, context);
  }
  if (second === null) {
    return null;
  }
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
