# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { DeclareKeywordShape } from "../keywords/declare-keyword-shape.xl.md"
import { ExportKeywordShape } from "../keywords/export-keyword-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { StringLiteralShape } from "../literals/string-literal-shape.xl.md"
import { ModuleBlockShape } from "./module-block-shape.xl.md"
import { DecoratorShape } from "../types/decorator-shape.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
```

# namespace cangjie

# class ModuleDeclarationShape extends ShapeToken

```txt
namespace N {}
module M {}
module "m" {}
declare module "m" {}
declare global {}
export namespace N {}
```

## field Body:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromUnits:(code:Array<Token>, positions:Array<int>, context:SyntaxContext)=>ModuleDeclarationShape

```ts
let decoratorBase = positions.length > 0 ? positions[0] : 0;
const decorators:Array<Token> = [];
let decoratorEnd = decoratorBase;
let decoratorCount = 0;
while (decoratorCount < code.length
  && code[decoratorCount] instanceof Symbol && (code[decoratorCount] as Symbol).Is("@")) {
  const atUnit = code[decoratorCount];
  const decoratorPos = decoratorEnd;
  const expressionBase = atUnit.SourceRange.EndIndex < 0 ? decoratorPos : atUnit.SourceRange.EndIndex;
  const builder = new ExpressionBuilder(code[0].Template, context);
  builder.Load(code.slice(decoratorCount + 1), expressionBase);
  if (builder.Units.length === 0) {
    throw new Error("decorator expression is empty");
  }
  const decoratorExpression = builder.ParseExpression();
  if (builder.At === 0) {
    throw new Error("decorator expression was not read");
  }
  const consumed = builder.At;
  for (let cursor = decoratorCount + 1; cursor < decoratorCount + 1 + consumed; cursor++) {
    const cursorEnd = code[cursor].SourceRange.EndIndex;
    if (cursorEnd >= 0) {
      decoratorEnd = cursorEnd;
    }
  }
  decoratorCount += 1 + consumed;
  decorators.push(DecoratorShape.FromParts(atUnit, decoratorExpression, decoratorPos, context));
}
let at = decoratorCount;
const modifiers:Array<ShapeToken> = [];
for (const decorator of decorators) {
  modifiers.push(decorator as ShapeToken);
}
while (at < code.length && code[at] instanceof Common) {
  const unit = code[at] as Common;
  if (!(unit.Is("export") || unit.Is("declare"))) {
    break;
  }
  let modifier:ShapeToken;
  if (unit.Is("export")) {
    modifier = ExportKeywordShape.FromBasicToken(unit, context);
  } else {
    modifier = DeclareKeywordShape.FromBasicToken(unit, context);
  }
  modifier.Pos = positions[at];
  modifiers.push(modifier);
  at++;
}
if (at >= code.length) {
  throw new Error("模块声明缺少 namespace / module 关键字");
}
const headUnit = code[at];
if (headUnit instanceof Common && (headUnit as Common).Is("global")) {
  // `declare global { … }`：名字就是 `global`，没有 namespace/module 关键字。
  // 也允许不带 declare 的 `global { … }`：这是 ambient module 体里的 global augmentation
  // （`declare module "buffer" { global { interface BufferConstructor { … } } }`），TS 合法。
} else {
  at++;
}
const nameIndices:Array<number> = [];
const nameShapes:Array<ShapeToken> = [];
let bodyIndex = -1;
let terminatorIndex = -1;
if (at >= code.length) {
  throw new Error("模块声明缺少名字");
}
nameIndices.push(at);
at++;
while (at < code.length) {
  const unit = code[at];
  if (unit instanceof Symbol && (unit as Symbol).Is(".")) {
    if (at + 1 >= code.length) {
      throw new Error("模块限定名在 . 之后结束");
    }
    nameIndices.push(at + 1);
    at += 2;
    continue;
  }
  if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{") {
    bodyIndex = at;
    break;
  }
  // 无体 ambient module：最后一个是分号
  if (unit instanceof Symbol && (unit as Symbol).Is(";")) {
    terminatorIndex = at;
    break;
  }
  throw new Error("模块声明里出现无法识别的单元");
}
// **Stage 5d-8c：文件末尾的无体 ambient module**（`declare module "m"` 后面既没有 `;` 也没有体）。
// TS 对这种恢复形给的就是「修饰词 + 名字」的 ModuleDeclaration（区间到名字为止），与带 `;` 的
// 无体形只差一个终止符。原来的判据在这里抛「模块声明缺少模块体」→ 整条文件级 fallback；
// 现在按「代码读完了」等同于「没有终止符」处理，终止单元取最后一个代码单元。
if (bodyIndex < 0 && terminatorIndex < 0) {
  if (nameIndices.length !== 1) {
    throw new Error("无体模块声明不支持限定名");
  }
  terminatorIndex = code.length - 1;
}
if (bodyIndex < 0) {
  // declare module "m";：没有体，children 只有修饰词 + 名字；区间到分号为止（AST 的 End 含分号）。
  if (nameIndices.length !== 1) {
    throw new Error("无体模块声明不支持限定名");
  }
  const bodyless = new ModuleDeclarationShape(code[0].Template);
  for (const item of modifiers) {
    bodyless.Add(item);
  }
  const bodylessUnit = code[nameIndices[0]];
  let bodylessName:ShapeToken;
  if (bodylessUnit instanceof String) {
    bodylessName = StringLiteralShape.FromBasicToken(bodylessUnit as String, context);
  } else if (bodylessUnit instanceof Common) {
    bodylessName = IdentifierShape.FromBasicToken(bodylessUnit as Common, context);
  } else {
    throw new Error("无体模块声明的名字不是标识符或字符串");
  }
  bodylessName.Pos = positions[nameIndices[0]];
  bodyless.Add(bodylessName);
  const bodylessStart = code[0].SourceRange.Start;
  if (bodylessStart !== null) {
    bodyless.SignIn(bodylessStart);
  }
  const bodylessEnd = code[terminatorIndex].SourceRange.End;
  if (bodylessEnd !== null) {
    bodyless.SignOut(bodylessEnd);
  }
  bodyless.Pos = positions[0];
  bodyless.TryToClose(context);
  return bodyless;
}
for (const index of nameIndices) {
  const unit = code[index];
  let name:ShapeToken;
  if (unit instanceof String) {
    name = StringLiteralShape.FromBasicToken(unit as String, context);
  } else if (unit instanceof Common) {
    name = IdentifierShape.FromBasicToken(unit as Common, context);
  } else {
    throw new Error("模块名不是标识符或字符串");
  }
  name.Pos = positions[index];
  nameShapes.push(name);
}
const body = ModuleBlockShape.FromBracket(code[bodyIndex] as Bracket, positions[bodyIndex], context);
return ModuleDeclarationShape.BuildLevel(code, positions, nameIndices, nameShapes, 0, body, modifiers, context);
```

## static method BuildLevel:(code:Array<Token>, positions:Array<int>, nameIndices:Array<int>, nameShapes:Array<ShapeToken>, level:int, body:ModuleBlockShape, modifiers:Array<ShapeToken>, context:SyntaxContext)=>ModuleDeclarationShape

```ts
const declaration = new ModuleDeclarationShape(code[0].Template);
if (level === 0) {
  for (const item of modifiers) {
    declaration.Add(item);
  }
}
declaration.Add(nameShapes[level]);
if (level + 1 < nameShapes.length) {
  const nested = ModuleDeclarationShape.BuildLevel(code, positions, nameIndices, nameShapes, level + 1, body, modifiers, context);
  declaration.Add(nested);
  declaration.Body = nested;
} else {
  declaration.Add(body);
  declaration.Body = body;
}
const head = level === 0 ? code[0] : nameShapes[level];
if (head.SourceRange.StartIndex >= 0) {
  declaration.SignIn(head.SourceRange.Start);
}
if (body.SourceRange.EndIndex >= 0) {
  declaration.SignOut(body.SourceRange.End);
}
declaration.Pos = level === 0 ? positions[0] : positions[nameIndices[level]];
declaration.TryToClose(context);
return declaration;
```
