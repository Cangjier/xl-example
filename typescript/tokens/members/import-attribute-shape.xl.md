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
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
```

# namespace cangjie

# class ImportAttributeShape extends ShapeToken

```txt
with { type: "json" }
```

## field Key:IdentifierShape | StringLiteralShape | null = null

## field Value:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromTokens:(units:Array<Token>, context:SyntaxContext, pos:int)=>ImportAttributeShape | null

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
// pos 由调用方给：它前面那个非 trivia 单元（`{` 或 `,`）的 End+1，组内看不到那一格。
shape.Pos = pos;
if (code[0] instanceof Common) {
  const key = IdentifierShape.FromBasicToken(code[0] as Common, context);
  key.Pos = pos;
  shape.Key = key;
  shape.Data.push(key);
  key.Parent = shape;
} else if (code[0] instanceof String) {
  const key = StringLiteralShape.FromBasicToken(code[0] as String, context);
  key.Pos = pos;
  shape.Key = key;
  shape.Data.push(key);
  key.Parent = shape;
}
// 值：TS 把 `:` 之后当**表达式**解析（`"json"` 是 StringLiteral；恢复形里也会是
// Identifier / NumericLiteral / 对象 / 数组 / 二元表达式，甚至模板串 NoSubstitutionTemplateLiteral）。
// 旧口径只认 `String` basic token，非字符串值整段丢掉 → AST 少了 value 子树，模板串还被错建成 StringLiteral。
if (code.length >= 3 && code[1] instanceof Symbol && (code[1] as Symbol).Is(":")) {
  const colonEnd = code[1].SourceRange.End;
  const valuePos = colonEnd !== null ? colonEnd.Index + 1 : -1;
  const valueUnits:Array<Token> = code.slice(2);
  const valueBuilder = new ExpressionBuilder(code[2].Template, context);
  valueBuilder.Load(valueUnits, valuePos);
  const value = valueBuilder.ParseAssign();
  if (valueBuilder.At !== valueBuilder.Units.length) {
    throw new Error("import attribute 的值没有读完");
  }
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
