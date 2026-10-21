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
import { DecoratorShape } from "../types/decorator-shape.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
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

从根单元 `host.Data[start..tokenIndex]` 建一条类型别名声明。`tokenIndex` 落在 `;` 上，或（无分号 ASI 收口时）落在类型末单元上。

```ts
const code:Array<Token> = [];
for (let at = start; at <= tokenIndex; at++) {
  const unit = host.Data[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  // 同一源区间出现多个单元 = 重放副本（`>>` 被拆分后宿主 `Data` 变长，reload 把同一个字符
  // 又压了一次；实测 `class C<T, U extends X<T>> {}` 后的 `;` 会以相同 [start..end] 出现两遍）。
  // 只保留第一份，否则第二个 `;` 会落进类型单元切片，TypeBuilder 读不完。
  const previous = code.length > 0 ? code[code.length - 1] : null;
  const unitStart = unit.SourceRange.Start;
  const unitEnd = unit.SourceRange.End;
  if (previous !== null && unitStart !== null && unitEnd !== null) {
    const previousStart = previous.SourceRange.Start;
    const previousEnd = previous.SourceRange.End;
    if (previousStart !== null && previousEnd !== null
      && previousStart.Index === unitStart.Index && previousEnd.Index === unitEnd.Index) {
      continue;
    }
  }
  code.push(unit);
}
if (code.length < 4) {
  throw new Error("类型别名声明不完整");
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
let decoratorBase = 0;
for (let at = start - 1; at >= 0; at--) {
  if (!host.Data[at].IsTriviaToken) {
    const end = host.Data[at].SourceRange.End;
    if (end !== null) {
      decoratorBase = end.Index + 1;
    }
    break;
  }
}
const decorators:Array<Token> = [];
let decoratorEnd = decoratorBase;
let decoratorCount = 0;
while (decoratorCount < code.length
  && code[decoratorCount] instanceof Symbol && (code[decoratorCount] as Symbol).Is("@")) {
  const atUnit = code[decoratorCount];
  const decoratorPos = decoratorEnd;
  const expressionBase = atUnit.SourceRange.End === null ? decoratorPos : atUnit.SourceRange.End.Index + 1;
  let decoratorExpression:Token;
  {
    const builder = new ExpressionBuilder(host.Template, context);
    builder.Load(code.slice(decoratorCount + 1), expressionBase);
    if (builder.Units.length === 0) {
      throw new Error("decorator expression is empty");
    }
    decoratorExpression = builder.ParseExpression();
    if (builder.At === 0) {
      throw new Error("decorator expression was not read");
    }
    const consumed = builder.At;
    for (let cursor = decoratorCount + 1; cursor < decoratorCount + 1 + consumed; cursor++) {
      const cursorEnd = code[cursor].SourceRange.End;
      if (cursorEnd !== null) {
        decoratorEnd = cursorEnd.Index + 1;
      }
    }
    decoratorCount += 1 + consumed;
  }
  decorators.push(DecoratorShape.FromParts(atUnit, decoratorExpression, decoratorPos, context));
}
let cursor = decoratorCount;
let exportUnit:Token | null = null;
if (cursor < code.length && code[cursor] instanceof Common && (code[cursor] as Common).Is("export")) {
  exportUnit = code[cursor];
  cursor++;
}
let declareUnit:Token | null = null;
if (cursor < code.length && code[cursor] instanceof Common && (code[cursor] as Common).Is("declare")) {
  declareUnit = code[cursor];
  cursor++;
}
if (code.length < cursor + 4) {
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
  // 无分号收口（ASI）：tokenIndex 就是类型末单元，末单元不是 `;` 是合法的。
  if (code.length <= equalIndex + 1) {
    throw new Error("类型别名声明的类型为空");
  }
} else if (code.length <= equalIndex + 1) {
  throw new Error("类型别名声明的类型为空");
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
let typeTail = code.length;
if (last instanceof Symbol && (last as Symbol).Is(";")) {
  typeTail = code.length - 1;
}
const typeUnits:Array<Token> = code.slice(equalIndex + 1, typeTail);
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
for (const decorator of decorators) {
  shape.Add(decorator);
}
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
if (decoratorCount > 0) {
  let modifierPos = decoratorEnd;
  for (const child of shape.Data) {
    if (child instanceof ExportKeywordShape || child instanceof DeclareKeywordShape) {
      (child as ShapeToken).Pos = modifierPos;
      if (child.SourceRange.End !== null) {
        modifierPos = child.SourceRange.End.Index + 1;
      }
    }
  }
}
shape.Add(name);
for (const parameter of parameters) {
  shape.Add(parameter);
}
shape.Add(type);
if (decoratorCount > 0) {
  if (code[0].SourceRange.Start !== null) {
    shape.SignIn(code[0].SourceRange.Start);
  }
} else if (exportUnit !== null) {
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
