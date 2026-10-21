# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { DeclareKeywordShape } from "../keywords/declare-keyword-shape.xl.md"
import { ExportKeywordShape } from "../keywords/export-keyword-shape.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { TypeBuilder } from "../types/type-builder.xl.md"
```

# namespace cangjie

# class TypeAliasDeclarationShape extends ShapeToken

```txt
type T = number;
type T<U> = U;
type T<U extends A = B, V = C> = [U, V];
```

measurement 载体：`type T[<U, …>] = <type>;`。TS 的 children 是 `Identifier` + 泛型参数（`TypeParameter`，可无）
+ 类型；`type` 关键字、`<` / `>` / `=` / `;` 都是 basic token，建完就丢。

区间：从 `type` 的起点到 `;`；`Pos` = 前一个非 trivia 单元 `End.Index + 1`（没有就 `0`），与 TS 一致。
`type` 与名字之间的 trivia 体现在名字的 `Pos` 上（`type /* c */ T` 的名字 `Pos` 仍是 `type` 之后）。

字段不叫 `Name`：`cjAst` 会把 `Name` 读成 AST 的 `name`，而 TS 的 `TypeAliasDeclaration` 在尺子里只比 children。

`export type …` / `declare type …` 暂缓：它们与 export/declare 声明候选抢同一格，需要先让根候选放行修饰词。

## field AliasName:Token | null = null

## field AliasParameters:Array<Token> = []

## field AliasType:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FindTypeParameterClose:(code:Array<Token>, start:int)=>int

从 `start` 的 `<` 开始，按 `<` / `>` 深度找类型参数表的闭合 `>`；`>>` / `>>>` 是一个 `Symbol`，按 2 / 3 个闭合算。
找不到返回 `-1`。

```ts
let depth = 0;
for (let at = start; at < code.length; at++) {
  const unit = code[at];
  if (!(unit instanceof Symbol)) {
    continue;
  }
  const text = (unit as Symbol).TempToString();
  if (text === "<") {
    depth++;
    continue;
  }
  let closeCount = 0;
  if (text === ">") {
    closeCount = 1;
  } else if (text === ">>") {
    closeCount = 2;
  } else if (text === ">>>") {
    closeCount = 3;
  }
  if (closeCount > 0) {
    depth -= closeCount;
    if (depth <= 0) {
      return at;
    }
  }
}
return -1;
```

## static method FromUnits:(host:Token, start:int, tokenIndex:int, context:SyntaxContext)=>TypeAliasDeclarationShape

从根单元 `host.Data[start..tokenIndex]` 建一条类型别名声明。`tokenIndex` 必须落在 `;` 上。

```ts
const code:Array<Token> = [];
for (let at = start; at <= tokenIndex; at++) {
  if (!host.Data[at].IsTriviaToken) {
    code.push(host.Data[at]);
  }
}
if (code.length < 5) {
  throw new Error("类型别名声明不完整");
}
let cursor = 0;
let exportUnit:Token | null = null;
if (code[0] instanceof Common && (code[0] as Common).Is("export")) {
  exportUnit = code[0];
  cursor = 1;
}
let declareUnit:Token | null = null;
if (code[cursor] instanceof Common && (code[cursor] as Common).Is("declare")) {
  declareUnit = code[cursor];
  cursor++;
}
if (code.length < cursor + 5) {
  throw new Error("类型别名声明不完整");
}
const keyword = code[cursor];
const nameUnit = code[cursor + 1];
const third = code[cursor + 2];
if (!(keyword instanceof Common) || !(keyword as Common).Is("type")) {
  throw new Error("类型别名声明缺少 type 关键字");
}
if (!(nameUnit instanceof Common)) {
  throw new Error("类型别名声明的名字不是标识符");
}
if (!(third instanceof Symbol)) {
  throw new Error("类型别名声明缺少等号或类型参数");
}
let equalIndex = cursor + 2;
let paramsUnits:Array<Token> = [];
if ((third as Symbol).Is("<")) {
  const closeIndex = TypeAliasDeclarationShape.FindTypeParameterClose(code, cursor + 2);
  if (closeIndex < 0) {
    throw new Error("类型参数表缺少 >");
  }
  paramsUnits = code.slice(cursor + 2, closeIndex + 1);
  equalIndex = closeIndex + 1;
}
const equal = code[equalIndex];
const last = code[code.length - 1];
if (!(equal instanceof Symbol) || !(equal as Symbol).Is("=")) {
  throw new Error("类型别名声明缺少等号");
}
if (!(last instanceof Symbol) || !(last as Symbol).Is(";")) {
  throw new Error("类型别名声明缺少分号");
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
let namePos = 0;
if (keyword.SourceRange.End !== null) {
  namePos = keyword.SourceRange.End.Index + 1;
}
const name = IdentifierShape.FromBasicToken(nameUnit, context);
name.Pos = namePos;
let typePos = 0;
if (equal.SourceRange.End !== null) {
  typePos = equal.SourceRange.End.Index + 1;
}
const typeUnits:Array<Token> = code.slice(equalIndex + 1, code.length - 1);
const builder = new TypeBuilder(host.Template, context);
builder.Load(typeUnits, typePos);
const type = builder.ParseType();
if (builder.At !== builder.Units.length) {
  throw new Error("类型别名声明的类型没有读完");
}
let parameters:Array<Token> = [];
if (paramsUnits.length > 0) {
  const paramsBuilder = new TypeBuilder(host.Template, context);
  let paramsPos = 0;
  if (nameUnit.SourceRange.End !== null) {
    paramsPos = nameUnit.SourceRange.End.Index + 1;
  }
  paramsBuilder.Load(paramsUnits, paramsPos);
  parameters = paramsBuilder.ParseTypeParameterList();
  if (paramsBuilder.At !== paramsBuilder.Units.length) {
    throw new Error("类型别名声明的类型参数没有读完");
  }
}
const shape = new TypeAliasDeclarationShape(host.Template);
shape.AliasName = name;
shape.AliasParameters = parameters;
shape.AliasType = type;
if (exportUnit !== null) {
  const modifier = ExportKeywordShape.FromBasicToken(exportUnit as Common, context);
  modifier.Pos = pos;
  shape.Add(modifier);
}
if (declareUnit !== null) {
  const modifier = DeclareKeywordShape.FromBasicToken(declareUnit as Common, context);
  // TS 的 pos：export 之后的 declare 取 export 末尾 + 1（`export declare type` 的 declare 是 [6,14)）。
  if (exportUnit === null) {
    modifier.Pos = pos;
  } else {
    const exportEnd = exportUnit.SourceRange.End;
    modifier.Pos = exportEnd === null ? pos : exportEnd.Index + 1;
  }
  shape.Add(modifier);
}
shape.Add(name);
for (const parameter of parameters) {
  shape.Add(parameter);
}
shape.Add(type);
if (exportUnit !== null) {
  if (exportUnit.SourceRange.Start !== null) {
    shape.SignIn(exportUnit.SourceRange.Start);
  }
} else if (declareUnit !== null) {
  if (declareUnit.SourceRange.Start !== null) {
    shape.SignIn(declareUnit.SourceRange.Start);
  }
} else if (keyword.SourceRange.Start !== null) {
  shape.SignIn(keyword.SourceRange.Start);
}
if (last.SourceRange.End !== null) {
  shape.SignOut(last.SourceRange.End);
}
shape.Pos = pos;
shape.TryToClose(context);
return shape;
```
