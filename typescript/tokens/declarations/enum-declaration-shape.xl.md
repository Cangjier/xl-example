# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { DeclareKeywordShape } from "../keywords/declare-keyword-shape.xl.md"
import { ConstKeywordShape } from "../keywords/const-keyword-shape.xl.md"
import { DecoratorShape } from "../types/decorator-shape.xl.md"
import { EnumMemberShape } from "../members/enum-member-shape.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { NumericLiteralShape } from "../literals/numeric-literal-shape.xl.md"
import { StringLiteralShape } from "../literals/string-literal-shape.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class EnumDeclarationShape extends ShapeToken

```txt
enum E {}
enum E { A }
enum E { A, B }
enum E { A = 1, B = 2 }
enum E { A = "x" }
enum E { A = `x` }
enum E { "a" = 1 }
enum E { 1 = 1 }
declare enum E {}
const enum E { A = 1 }
declare const enum E { A = 1 }
```

`enum E { A }` 的 TS children 是 [Identifier E, EnumMember A]；EnumMember 自己是 [Identifier A]，
带初始化器时是 [Identifier A, 字面量/表达式]；成员名还可以是 StringLiteral（`"a"`）或 NumericLiteral（`1`）。
修饰词按书写顺序进 Data（`declare` / `const` 都支持，`declare const enum` 两个都在）；
`enum` / 花括号 / 逗号 / 等号都不进 Data。

枚举成员由 `EnumMemberShape`（members 家族，构造函数已就绪）就地建：
名字的 `Pos` = 枚举成员 `Pos` = 前一个单元（`{` 或 `,`）`End.Index + 1`，与 TS 的 `EnumMember.pos` 同口径；
初始化器用 `ExpressionBuilder.ParseAssign()` 解析，区间到初始化器终点为止（`enum E { A }` 的成员区间不含 `}` 前的空间）。

区间：从修饰符（没有就从 `enum`）的起点到 `}`；`Pos` 口径同 ClassDeclarationShape。

## field EnumName:Token | null = null

## field Members:Array<Token> = []

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromUnits:(host:Token, start:int, tokenIndex:int, context:SyntaxContext)=>EnumDeclarationShape

```ts
const code:Array<Token> = [];
for (let at = start; at <= tokenIndex; at++) {
  if (!host.Data[at].IsTriviaToken) {
    code.push(host.Data[at]);
  }
}
// 装饰器前缀（块 / 体里 `@dec enum E { A }`；TS 的 Decorator 是 EnumDeclaration children 的第一项）。
// 与 InterfaceDeclarationShape.FromUnits 的 decorator 扫描同口径：逐个 `@` 用 ExpressionBuilder
// 吃掉装饰器表达式，装饰器形状由 DecoratorShape.FromParts 建。
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
  const builder = new ExpressionBuilder(host.Template, context);
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
    const cursorEnd = code[cursor].SourceRange.End;
    if (cursorEnd !== null) {
      decoratorEnd = cursorEnd.Index + 1;
    }
  }
  decoratorCount += 1 + consumed;
  decorators.push(DecoratorShape.FromParts(atUnit, decoratorExpression, decoratorPos, context));
}
let index = decoratorCount;
const modifierUnits:Array<Token> = [];
while (index < code.length && code[index] instanceof Common) {
  const text = (code[index] as Common).TempToString();
  if (text === "declare" || text === "const") {
    modifierUnits.push(code[index]);
    index++;
    continue;
  }
  break;
}
if (index >= code.length) {
  throw new Error("枚举声明不完整");
}
const keyword = code[index];
index++;
if (!(keyword instanceof Common) || !(keyword as Common).Is("enum")) {
  throw new Error("枚举声明缺少 enum 关键字");
}
if (index >= code.length) {
  throw new Error("枚举声明缺少名字");
}
const nameUnit = code[index];
index++;
if (!(nameUnit instanceof Common)) {
  throw new Error("枚举声明的名字不是标识符");
}
if (index >= code.length) {
  throw new Error("枚举声明缺少枚举体");
}
const bodyUnit = code[index];
index++;
if (!(bodyUnit instanceof Bracket) || (bodyUnit as Bracket).StartBracketChar !== "{") {
  throw new Error("枚举声明的枚举体不是花括号");
}
if (index !== code.length) {
  throw new Error("枚举声明有多余单元");
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
const members = EnumDeclarationShape.BuildMembers(host, bodyUnit as Bracket, context);
const shape = new EnumDeclarationShape(host.Template);
shape.EnumName = name;
shape.Members = members;
let modifierPos = decorators.length === 0 ? pos : decoratorEnd;
for (const decorator of decorators) {
  shape.Add(decorator);
}
for (const unit of modifierUnits) {
  if ((unit as Common).Is("declare")) {
    const modifier = DeclareKeywordShape.FromBasicToken(unit as Common, context);
    modifier.Pos = modifierPos;
    shape.Add(modifier);
  } else {
    const modifier = new ConstKeywordShape(host.Template);
    modifier.SignInToken(unit);
    modifier.SignOutToken(unit);
    modifier.Pos = modifierPos;
    modifier.TryToClose(context);
    shape.Add(modifier);
  }
  modifierPos = unit.SourceRange.End === null ? modifierPos : unit.SourceRange.End.Index + 1;
}
shape.Add(name);
for (const member of members) {
  shape.Add(member);
}
if (decorators.length > 0) {
  shape.SignInToken(code[0]);
} else if (modifierUnits.length > 0) {
  shape.SignInToken(modifierUnits[0]);
} else {
  shape.SignInToken(keyword);
}
shape.SignOutToken(bodyUnit);
shape.Pos = pos;
shape.TryToClose(context);
return shape;
```

## private static method BuildMembers:(host:Token, bracket:Bracket, context:SyntaxContext)=>Array<Token>

按顶层逗号切枚举成员（括号是整块 `Bracket`，所以成员初始化器里的逗号不在本层），逐个建 `EnumMemberShape`。
尾随逗号（`enum E { A, }`）产生的空组跳过，与 TS 一致。

```ts
const members:Array<Token> = [];
let group:Array<Token> = [];
let memberPos = bracket.SourceRange.Start === null ? 0 : bracket.SourceRange.Start.Index + 1;
for (const item of bracket.Data) {
  if (item.IsTriviaToken) {
    continue;
  }
  if (item instanceof Symbol && (item as Symbol).Is(",")) {
    const member = EnumDeclarationShape.BuildMember(host, group, memberPos, context);
    if (member !== null) {
      members.push(member);
    }
    group = [];
    memberPos = item.SourceRange.End === null ? 0 : item.SourceRange.End.Index + 1;
    continue;
  }
  group.push(item);
}
const tail = EnumDeclarationShape.BuildMember(host, group, memberPos, context);
if (tail !== null) {
  members.push(tail);
}
return members;
```

## private static method BuildMember:(host:Token, group:Array<Token>, pos:int, context:SyntaxContext)=>Token | null

```ts
if (group.length === 0) {
  return null;
}
const nameUnit = group[0];
let name:Token;
if (nameUnit instanceof Common) {
  if ((nameUnit as Common).IsNumber()) {
    // `enum E { 1 = 1 }`: TS 的名字是 NumericLiteral，不是 Identifier。
    const numeric = NumericLiteralShape.FromBasicToken(nameUnit as Common, context);
    numeric.Pos = pos;
    name = numeric;
  } else {
    const identifier = IdentifierShape.FromBasicToken(nameUnit as Common, context);
    identifier.Pos = pos;
    name = identifier;
  }
} else if (nameUnit instanceof String) {
  // `enum E { 'a' = 1 }`: TS 的名字是 StringLiteral。
  const stringLiteral = StringLiteralShape.FromBasicToken(nameUnit as String, context);
  stringLiteral.Pos = pos;
  name = stringLiteral;
} else {
  throw new Error("枚举成员的名字不是标识符、字符串或数字");
}
const member = new EnumMemberShape(host.Template);
member.Add(name);
let endToken:Token = nameUnit;
if (group.length > 1) {
  const equal = group[1];
  if (!(equal instanceof Symbol) || !(equal as Symbol).Is("=")) {
    throw new Error("枚举成员缺少等号");
  }
  const valueUnits:Array<Token> = group.slice(2);
  if (valueUnits.length === 0) {
    throw new Error("枚举成员的初始化器为空");
  }
  const valuePos = equal.SourceRange.End === null ? 0 : equal.SourceRange.End.Index + 1;
  const builder = new ExpressionBuilder(host.Template, context);
  builder.Load(valueUnits, valuePos);
  const value = builder.ParseAssign();
  if (builder.At !== builder.Units.length) {
    throw new Error("枚举成员的初始化器没有读完");
  }
  member.Add(value);
  endToken = valueUnits[valueUnits.length - 1];
}
member.SignInToken(nameUnit);
member.SignOutToken(endToken);
member.Pos = pos;
member.TryToClose(context);
return member;
```
