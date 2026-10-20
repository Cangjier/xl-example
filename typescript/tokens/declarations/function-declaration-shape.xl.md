# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { ParameterShape } from "../types/parameter-shape.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { StatementBuilder } from "../statements/statement-builder.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { TypeBuilder } from "../types/type-builder.xl.md"
```

# namespace cangjie

# class FunctionDeclarationShape extends ShapeToken

```txt
function f() {}
function f(a) {}
function f(a: A) {}
function f(a?: A) {}
function f(a: A, b: B): C { return a; }
function f(): void {}
```

TS 的 children 顺序：名字 → 每个 `Parameter` →（可选）返回类型 → `Block` 函数体；
`function` 关键字、参数表的括号、`:`、`=>` 之外的分隔符都不进 Data。

参数表由 `Bracket.Data` 逐组建：带类型标注的组交给 `TypeBuilder.ParseParameter()`（与函数类型同一口径），
不带类型标注的组只建 `Identifier` 叶子（`function f(a)` 的 TS Parameter 只有 Identifier 一个子节点）。
函数体交给 `StatementBuilder`：`{…}` 是整块括号单元，`BuildStatement()` 会走到 `BuildBlock()`，
里面诸如 `return a;` 的语句由 statement 家族负责。

区间：从 `function` 起点到函数体 `}`；`Pos` = 前面那个非 trivia 单元 `End.Index + 1`（没有就是 `0`）。
名字 `Pos` = `function` 之后；参数 `Pos` = `(` 或 `,` 之后；返回类型 `Pos` = `:` 之后；函数体 `Pos` = `)` 或返回类型之后。

## field FunctionName:Token | null = null

## field Parameters:Array<Token> = []

## field ReturnType:Token | null = null

## field Body:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromUnits:(host:Token, start:int, tokenIndex:int, context:SyntaxContext)=>FunctionDeclarationShape

```ts
const code:Array<Token> = [];
for (let at = start; at <= tokenIndex; at++) {
  if (!host.Data[at].IsTriviaToken) {
    code.push(host.Data[at]);
  }
}
if (code.length < 3) {
  throw new Error("函数声明不完整");
}
const keyword = code[0];
if (!(keyword instanceof Common) || !(keyword as Common).Is("function")) {
  throw new Error("函数声明缺少 function 关键字");
}
const nameUnit = code[1];
if (!(nameUnit instanceof Common)) {
  throw new Error("函数声明的名字不是标识符");
}
const paramUnit = code[2];
if (!(paramUnit instanceof Bracket) || (paramUnit as Bracket).StartBracketChar !== "(") {
  throw new Error("函数声明缺少参数表");
}
let index = 3;
let returnType:Token | null = null;
const bodyUnit = code[code.length - 1];
if (!(bodyUnit instanceof Bracket) || (bodyUnit as Bracket).StartBracketChar !== "{") {
  throw new Error("函数声明缺少函数体");
}
if (code.length > 4) {
  const colon = code[3];
  if (!(colon instanceof Symbol) || !(colon as Symbol).Is(":")) {
    throw new Error("函数声明的返回类型缺少冒号");
  }
  const typeUnits:Array<Token> = code.slice(4, code.length - 1);
  if (typeUnits.length === 0) {
    throw new Error("函数声明的返回类型为空");
  }
  const typePos = colon.SourceRange.End === null ? 0 : colon.SourceRange.End.Index + 1;
  const typeBuilder = new TypeBuilder(host.Template, context);
  typeBuilder.Load(typeUnits, typePos);
  returnType = typeBuilder.ParseType();
  if (typeBuilder.At !== typeBuilder.Units.length) {
    throw new Error("函数声明的返回类型没有读完");
  }
  index = code.length - 1;
}
if (index !== code.length - 1) {
  throw new Error("函数声明有多余单元");
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
const name = IdentifierShape.FromBasicToken(nameUnit as Common, context);
name.Pos = keyword.SourceRange.End === null ? pos : keyword.SourceRange.End.Index + 1;
const parameters = FunctionDeclarationShape.BuildParameters(host, paramUnit as Bracket, context);
const bodyPos = FunctionDeclarationShape.PreviousEnd(code[code.length - 2]);
const bodyBuilder = new StatementBuilder(host.Template, context);
bodyBuilder.Load([bodyUnit], bodyPos);
const body = bodyBuilder.BuildStatement();
if (bodyBuilder.At !== bodyBuilder.Units.length) {
  throw new Error("函数体没有读完");
}
const shape = new FunctionDeclarationShape(host.Template);
shape.FunctionName = name;
shape.Parameters = parameters;
shape.ReturnType = returnType;
shape.Body = body;
shape.Add(name);
for (const parameter of parameters) {
  shape.Add(parameter);
}
if (returnType !== null) {
  shape.Add(returnType);
}
shape.Add(body);
shape.SignInToken(keyword);
shape.SignOutToken(bodyUnit);
shape.Pos = pos;
shape.TryToClose(context);
return shape;
```

## private static method PreviousEnd:(unit:Token | null)=>int

`)` 或返回类型之后那一格，也就是函数体 `Pos` 的取值。

```ts
if (unit === null || unit.SourceRange.End === null) {
  return 0;
}
return unit.SourceRange.End.Index + 1;
```

## private static method BuildParameters:(host:Token, bracket:Bracket, context:SyntaxContext)=>Array<Token>

参数表按逗号切组；带 `:` / `?:` 的组交给 `TypeBuilder.ParseParameter()`，不带类型的组只建 `Identifier`。
`ParseParameter` 抛错（参数缺类型标注）本来就不该在这里发生——组里有没有冒号在调用前已经判过。

```ts
const parameters:Array<Token> = [];
const inner = new TypeBuilder(host.Template, context);
let base = 0;
if (bracket.SourceRange.Start !== null) {
  base = bracket.SourceRange.Start.Index + 1;
}
inner.Load(bracket.Data, base);
while (inner.At < inner.Units.length) {
  if (inner.IsText(inner.Units[inner.At], ",")) {
    inner.At++;
    continue;
  }
  const nameIndex = inner.At;
  let typed = false;
  if (nameIndex + 1 < inner.Units.length) {
    const next = inner.TextOf(inner.Units[nameIndex + 1]);
    if (next === "?:") {
      typed = true;
    } else if (next === "?") {
      typed = nameIndex + 2 < inner.Units.length && inner.TextOf(inner.Units[nameIndex + 2]) === ":";
    } else if (next === ":") {
      typed = true;
    }
  }
  if (typed) {
    parameters.push(inner.ParseParameter());
    continue;
  }
  const nameUnit = inner.Units[nameIndex];
  if (!(nameUnit instanceof Common)) {
    throw new Error("函数参数不是标识符");
  }
  inner.At++;
  const parameter = new ParameterShape(host.Template);
  const name = IdentifierShape.FromBasicToken(nameUnit as Common, context);
  name.Pos = inner.Positions[nameIndex];
  parameter.ParameterName = name;
  parameter.Add(name);
  parameter.SignInToken(nameUnit);
  parameter.SignOutToken(nameUnit);
  parameter.Pos = inner.Positions[nameIndex];
  parameter.TryToClose(context);
  parameters.push(parameter);
}
return parameters;
```
