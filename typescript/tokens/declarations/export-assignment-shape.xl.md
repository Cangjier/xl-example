# dependencies
```xl
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
import { DeclarationSpan } from "../items/module-item-rule.xl.md"
```

# namespace cangjie

# class ExportAssignmentShape extends ShapeToken

```txt
export = x;
export = f;
```

measurement 载体：`export = <表达式>;`。TS 的 children 只有表达式一个，`export` / `=` / `;` 都不是节点
（`export = x;` → `ExportAssignment → [Identifier x]`），所以 `Data` 只装表达式。
`isExportEquals` 不在 `ast-json.mjs` 的比较字段里（那边只比 `text` / `name` / `isTypeOnly`），不用造字段。
区间从 `export` 起点到 `;`；`Pos` = 前一个非 trivia 单元 `EndIndex`。

## field Expression:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromUnits:(host:Token, start:int, tokenIndex:int, context:SyntaxContext, requireSemicolon?:bool)=>ExportAssignmentShape

`tokenIndex` 落在 `;` 上时要求最后一块是 `;`；初始化式交给 `ExpressionBuilder`（`export = 1;` / `export = a.b;` 同一套）。
终结候选在无分号收口（EOF / ASI）时传 `requireSemicolon = false`：最后一个代码单元就是表达式的末尾，
`End` 取它的 `End`（`;` 不是 `export =` 的节点，本就不该进区间）。

```ts
const hasSemicolon = requireSemicolon ?? true;
const code:Array<Token> = [];
for (let at = start; at <= tokenIndex; at++) {
  if (!host.Data[at].IsTriviaToken) {
    code.push(host.Data[at]);
  }
}
const minimum = hasSemicolon ? 4 : 3;
if (code.length < minimum) {
  throw new Error("export = 声明不完整");
}
const keyword = code[0];
const separator = code[1];
const last = code[code.length - 1];
if (!(keyword instanceof Common) || !(keyword as Common).Is("export")) {
  throw new Error("export = 声明缺少 export 关键字");
}
// 两种形态：`export = <expr>;`（等号）与 `export default <expr>;`（default 关键字）。
const isDefault = separator instanceof Common && (separator as Common).Is("default");
if (!isDefault && (!(separator instanceof Symbol) || !(separator as Symbol).Is("="))) {
  throw new Error("export = 声明缺少等号");
}
if (hasSemicolon && (!(last instanceof Symbol) || !(last as Symbol).Is(";"))) {
  throw new Error("export = 声明缺少分号");
}
let pos = 0;
for (let at = start - 1; at >= 0; at--) {
  if (!host.Data[at].IsTriviaToken) {
    const end = host.Data[at].SourceRange.EndIndex;
    if (end !== null) {
      pos = end;
    }
    break;
  }
}
let expressionPos = 0;
if (separator.SourceRange.EndIndex >= 0) {
  expressionPos = separator.SourceRange.EndIndex;
}
const expressionUnits:Array<Token> = hasSemicolon ? code.slice(2, code.length - 1) : code.slice(2);
const builder = new ExpressionBuilder(host.Template, context);
builder.Load(expressionUnits, expressionPos);
const expression = builder.ParseExpression();
if (builder.At !== builder.Units.length) {
  throw new Error("export = 声明的表达式没有读完");
}
const shape = new ExportAssignmentShape(host.Template);
shape.Expression = expression;
shape.Add(expression);
if (keyword.SourceRange.StartIndex >= 0) {
  shape.SignIn(keyword.SourceRange.Start);
}
const endUnit = hasSemicolon ? last : code[code.length - 1];
if (endUnit.SourceRange.EndIndex >= 0) {
  shape.SignOut(endUnit.SourceRange.End);
}
shape.Pos = pos;
shape.TryToClose(context);
return shape;
```

## static method BuildDirect:(host:Token, start:int, end:int, context:SyntaxContext)=>ExportAssignmentShape | null

**直接建造入口**（WP-3 根级用）：`host.Data[start, end)` 恰好是一条 `export = <expr>` /
`export default <expr>`（`end` 不含）。

`export default` / `export =` 的 **ASI 口径**由 `hasSemicolon = DeclarationSpan.EndsWithSemicolon(code)` 决定：
无分号时 `FromUnits(…, false)` 取最后一个代码单元（表达式末尾）作 `End`——`;` 不是本节点的 children，
本就不该进区间。有分号时按原口径把 `;` 计入区间。

- 不依赖 `BuildByIndex` / `MountShell` / `CatalogGuide`；
- **不改 `host.Data`**；
- 返回 `null` = 这一片不是 export-assignment（`export default class …` 这类「default + 声明」是
  声明族，不是本形态）或不是完整声明；不抛异常。

```ts
if (start < 0 || end <= start) {
  return null;
}
const code = DeclarationSpan.Slice(host, start, end);
if (code.length < 3) {
  return null;
}
const keyword = code[0];
if (!(keyword instanceof Common) || !(keyword as Common).Is("export")) {
  return null;
}
const separator = code[1];
const isDefault = separator instanceof Common && (separator as Common).Is("default");
const isEquals = separator instanceof Symbol && (separator as Symbol).Is("=");
if (!isDefault && !isEquals) {
  return null;
}
if (isDefault) {
  const afterDefault = code[2];
  if (afterDefault instanceof Common) {
    const afterText = (afterDefault as Common).TempToString();
    if (afterText === "class" || afterText === "function" || afterText === "interface"
      || afterText === "enum" || afterText === "abstract" || afterText === "async") {
      return null;
    }
  }
}
const hasSemicolon = DeclarationSpan.EndsWithSemicolon(code);
const units:Array<Token> = [];
for (const unit of code) {
  units.push(unit);
}
const hostLike:any = { Data: units, Template: host.Template };
const pos = DeclarationSpan.PosBefore(host, start);
const shape = ExportAssignmentShape.FromUnits(hostLike, 0, units.length - 1, context, hasSemicolon);
shape.Pos = pos;
return shape;
```
