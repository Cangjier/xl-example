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
import { DeclarationSpan } from "../items/module-item-rule.xl.md"
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

模块声明（`namespace` / `module` / `declare module "m"`）。

**它的 `Data` 就是 AST children，不另立 `Name` / `Modifiers` 字段**：`ast-json` 的投影字段里没有模块名的 `name`
（TS 侧对 `ModuleDeclaration` 不比 `name`），多一个 `Name` 字段会凭空多出「字段差」。所以：

- `[ExportKeywordShape | DeclareKeywordShape]…` —— 修饰词，`Data` 最前；
- 名字：`IdentifierShape`（`namespace N` / `module N`）或 `StringLiteralShape`（`module "m"`）；
- 体：`ModuleBlockShape`；限定名 `namespace A.B {}` 时 TS 的结构是**嵌套 `ModuleDeclaration`**
  （`A` 的 children 是 `Identifier A` + `ModuleDeclaration B`，中间**没有** `ModuleBlock`），
  所以 `Data` 的第二个节点是嵌套声明，只有最内层挂 `ModuleBlock`。

`Body` 是给后续（augmentation / `global`）留的字段：它不在 `ast-json` 的投影字段表里，不参与对拍。

## field Body:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromUnits:(code:Array<Token>, positions:Array<int>, context:SyntaxContext, requireTerminator?:bool)=>ModuleDeclarationShape

把一条到齐的模块声明（非 trivia 单元 + 每个单元的 `Pos`）建成形状树。

`requireTerminator` 默认 `true`：无体 ambient 模块（`declare module "m";`）必须以 `;` 收口。
无分号收口（EOF / ASI）时传 `false`，最后一个单元就是名字，`End` 取名字单元的 `End`
（**End 重锚**：不取 `;`、更不取后面的 trivia）。

`code` 的第一格是第一个修饰词或模块关键字（`namespace` / `module`），最后一格是闭合的 `{ … }` 括号单元。
`positions[i]` 是 `code[i]` 的 `Pos`（含前导 trivia 的半开区间起点，与 TS 同口径），由候选算好传进来。

```ts
const hasTerminator = requireTerminator ?? true;
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
if (bodyIndex < 0 && terminatorIndex < 0) {
  if (hasTerminator) {
    throw new Error("模块声明缺少模块体");
  }
  // 无分号 ASI 收口：最后一个单元就是名字，End 落在名字末尾（End 重锚）。
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

建一层（`level` 是第几段名字）：从最外层递归到最内层，内层当外层的第二（或第三）个 children 返回。

- `level == 0`：先按顺序 `Add` 修饰词，`Pos` 取第一格（修饰词 / 关键字）的 `Pos`，签入也从第一格起；
- 其余层：`Pos` 取本段名字的 `Pos`，签入从名字起；
- 每层都 `SignOut` 到模块体结尾（所以 `end` 都是整条声明右边界，与 TS 一致）；
- 最内层 `Add` 的是 `ModuleBlockShape`，`Body` 记体；中间层 `Add` 的是下一层 `ModuleDeclarationShape`（TS 的限定名结构）。

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

## static method BuildDirect:(host:Token, start:int, end:int, context:SyntaxContext)=>ModuleDeclarationShape | null

**直接建造入口**（WP-3 根级用）：`host.Data[start, end)` 恰好是一条模块声明
（`namespace N { … }` / `module N { … }` / `declare module "m" { … }` / `declare global { … }` /
无体 `declare module "m";`；`end` 不含）。

`declare module` 的 **End 重锚**在 `FromUnits` 里已经成立：带体时 `End` 取体括号（`}`）的 `End`，
无体时取 `;`（有分号）或名字单元（ASI）的 `End`——两条路径都不看尾随 trivia，所以直接入口不需要再修一次。

- 不依赖 `BuildByIndex` / `MountShell` / `ShapeCatalog`；
- **不改 `host.Data`**（体括号是闭合单元，`ModuleBlockShape.FromBracket` 只在它自己的 `Data` 上工作）；
- 返回 `null` = 这一片不是模块声明或不是完整声明；不抛异常。

```ts
if (start < 0 || end <= start) {
  return null;
}
const code = DeclarationSpan.Slice(host, start, end);
if (code.length === 0) {
  return null;
}
const head = code[0];
if (!(head instanceof Common)) {
  return null;
}
const headText = (head as Common).TempToString();
if (headText !== "namespace" && headText !== "module" && headText !== "global"
  && headText !== "export" && headText !== "declare") {
  return null;
}
const last = code[code.length - 1];
const hasTerminator = DeclarationSpan.EndsWithSemicolon(code)
  || (last instanceof Bracket && (last as Bracket).StartBracketChar === "{");
const positions = DeclarationSpan.Positions(code, DeclarationSpan.PosBefore(host, start));
try {
  return ModuleDeclarationShape.FromUnits(code, positions, context, hasTerminator);
} catch {
  return null;
}
```
