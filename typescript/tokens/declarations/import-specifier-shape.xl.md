# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { StringLiteralShape } from "../literals/string-literal-shape.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
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

## static method FromTokens:(units:Array<Token>, context:SyntaxContext, pos:int)=>ImportSpecifierShape | null

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
// pos 由调用方给：它前面那个非 trivia 单元（`{` 或 `,`）的 End+1，组内看不到那一格。
shape.Pos = pos;
if (code[at] instanceof Common && (code[at] as Common).Is("type")) {
  shape.IsTypeOnly = true;
  at++;
}
// 具名导入的名字可以是字符串字面量（TS 4.5）：`import { "a-b" as c }` 的
// children 是 `[StringLiteral "a-b", Identifier c]`，与 export specifier 同一口径。
let firstShape:ShapeToken | null = null;
if (at < code.length && code[at] instanceof Common) {
  firstShape = IdentifierShape.FromBasicToken(code[at] as Common, context);
} else if (at < code.length && code[at] instanceof String) {
  firstShape = StringLiteralShape.FromBasicToken(code[at] as String, context);
}
if (firstShape === null) {
  return null;
}
// 带 `type` 修饰时，标识符的前导 trivia 起点在 `type` 之后，形状的 Pos 仍在 `type` 之前。
let firstPos = pos;
if (shape.IsTypeOnly) {
  const typeEnd = code[at - 1].SourceRange.EndIndex;
  if (typeEnd >= 0) {
    firstPos = typeEnd;
  }
}
firstShape.Pos = firstPos;
shape.PropertyName = firstShape as IdentifierShape;
shape.Data.push(firstShape);
firstShape.Parent = shape;
let last = code[at];
at++;
if (at + 1 < code.length && code[at] instanceof Common && (code[at] as Common).Is("as")) {
  let second:ShapeToken | null = null;
  if (code[at + 1] instanceof Common) {
    second = IdentifierShape.FromBasicToken(code[at + 1] as Common, context);
  } else if (code[at + 1] instanceof String) {
    second = StringLiteralShape.FromBasicToken(code[at + 1] as String, context);
  }
  if (second === null) {
    return null;
  }
  const asEnd = code[at].SourceRange.EndIndex;
  second.Pos = asEnd >= 0 ? asEnd : -1;
  shape.Name = second as IdentifierShape;
  shape.Data.push(second);
  second.Parent = shape;
  last = code[at + 1];
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
