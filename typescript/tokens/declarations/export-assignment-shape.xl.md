# dependencies
```xl
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
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
区间从 `export` 起点到 `;`；`Pos` = 前一个非 trivia 单元 `End.Index + 1`。

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
    const end = host.Data[at].SourceRange.End;
    if (end !== null) {
      pos = end.Index + 1;
    }
    break;
  }
}
let expressionPos = 0;
if (separator.SourceRange.End !== null) {
  expressionPos = separator.SourceRange.End.Index + 1;
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
if (keyword.SourceRange.Start !== null) {
  shape.SignIn(keyword.SourceRange.Start);
}
const endUnit = hasSemicolon ? last : code[code.length - 1];
if (endUnit.SourceRange.End !== null) {
  shape.SignOut(endUnit.SourceRange.End);
}
shape.Pos = pos;
shape.TryToClose(context);
return shape;
```
