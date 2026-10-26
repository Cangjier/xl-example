# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { DeclareKeywordShape } from "../keywords/declare-keyword-shape.xl.md"
import { ConstKeywordShape } from "../keywords/const-keyword-shape.xl.md"
import { DecoratorShape } from "../types/decorator-shape.xl.md"
import { EnumMemberShape } from "../members/enum-member-shape.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
import { ComputedPropertyNameShape } from "../types/computed-property-name-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { NumericLiteralShape } from "../literals/numeric-literal-shape.xl.md"
import { StringLiteralShape } from "../literals/string-literal-shape.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { MemberShellCatalog } from "../types/member-shell-catalog.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { BodyGuideUtil } from "./body-guide-util.xl.md"
import { EnumDeclarationEndPossibleShape } from "./enum-declaration-end-possible-shape.xl.md"
import { EnumMemberPossibleShape } from "../members/enum-member-possible-shape.xl.md"
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

## field EnumName:Token | null = null

## field Members:Array<Token> = []

## field BodyBracket:Bracket | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```

## method OnBracketCreatedEvent:(bracket:Token, context:SyntaxContext)=>void

```ts
if (this.BodyBracket !== null) {
  return;
}
if (!(bracket instanceof Bracket)) {
  return;
}
if (!BodyGuideUtil.IsBodyBracket(this, bracket as Bracket, [])) {
  return;
}
const body = bracket as Bracket;
this.BodyBracket = body;
// [B2] 成员块目录走 B0 安装器（`Known` + `WaitingEndPossible`）：早建成员外壳之后块里不再有新单元。
MemberShellCatalog.InstallBodyCatalog(body, EnumDeclarationShape.CreateBodyPossibleShapes(), "MemberList", this, context);
this.CatalogGuide = new CatalogGuide([], new EnumDeclarationEndPossibleShape());
```

## private static field CreateBodyPossibleShapesCache:Array<PossibleShape> | null = null

## static method CreateBodyPossibleShapes:()=>Array<PossibleShape>

```ts
EnumDeclarationShape.CreateBodyPossibleShapesCache = BodyGuideUtil.CreateShapesCache(
  EnumDeclarationShape.CreateBodyPossibleShapesCache,
  () => [new EnumMemberPossibleShape()]);
return EnumDeclarationShape.CreateBodyPossibleShapesCache;
```

## static method FromUnits:(host:Token, start:int, tokenIndex:int, context:SyntaxContext)=>EnumDeclarationShape

```ts
const code:Array<Token> = [];
for (let at = start; at <= tokenIndex; at++) {
  if (!host.Data[at].IsTriviaToken) {
    code.push(host.Data[at]);
  }
}
let pos = 0;
for (let at = start - 1; at >= 0; at--) {
  if (!host.Data[at].IsTriviaToken) {
    const end = host.Data[at].SourceRange.End;
    if (end >= 0) {
      pos = end;
    }
    break;
  }
}
return EnumDeclarationShape.BuildFromCode(host, code, pos, context);
```

## static method BuildFromCode:(host:Token, code:Array<Token>, pos:int, context:SyntaxContext)=>EnumDeclarationShape

```ts
const decoratorBase = pos;
const decorators:Array<Token> = [];
let decoratorEnd = decoratorBase;
let decoratorCount = 0;
while (decoratorCount < code.length
  && code[decoratorCount] instanceof Symbol && (code[decoratorCount] as Symbol).Is("@")) {
  const atUnit = code[decoratorCount];
  const decoratorPos = decoratorEnd;
  const expressionBase = atUnit.SourceRange.End < 0 ? decoratorPos : atUnit.SourceRange.EndIndex;
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
    if (cursorEnd >= 0) {
      decoratorEnd = cursorEnd;
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
const name = IdentifierShape.FromBasicToken(nameUnit as Common, context);
name.Pos = keyword.SourceRange.End < 0 ? pos : keyword.SourceRange.EndIndex;
const members = EnumDeclarationShape.CollectBodyMembers(host, bodyUnit as Bracket, context);
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
  modifierPos = unit.SourceRange.End < 0 ? modifierPos : unit.SourceRange.EndIndex;
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

## static method CollectBodyMembers:(host:Token, bracket:Bracket, context:SyntaxContext)=>Array<Token>

```ts
// [B2] 收口前先把还没到边界的成员外壳（没有逗号的最后一个成员）换成正品；整棵 AST 仍由
// `BuildMembers` 产出，这里只决定「什么时候」。
MemberShellCatalog.FinalizeAll(host, bracket, context);
return BodyGuideUtil.CollectBodyMembers(host, bracket, context, EnumDeclarationShape.BuildMembers);
```

## static method BuildMembers:(host:Token, bracket:Bracket, context:SyntaxContext)=>Array<Token>

```ts
const members:Array<Token> = [];
let group:Array<Token> = [];
let memberPos = bracket.SourceRange.Start < 0 ? 0 : bracket.SourceRange.StartIndex + 1;
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
    memberPos = item.SourceRange.End < 0 ? 0 : item.SourceRange.EndIndex;
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

## static method BuildMember:(host:Token, group:Array<Token>, pos:int, context:SyntaxContext)=>Token | null

```ts
if (group.length === 0) {
  return null;
}
const nameUnit = group[0];
let name:Token;
if (nameUnit instanceof Bracket && (nameUnit as Bracket).StartBracketChar === "[") {
  // 计算名 `enum E { [k] }` / `[f()] = 1`：TS 的成员名是 ComputedPropertyName（内部装表达式），
  // 与 class 成员计算名同一形态；`[` `]` 不进 children，区间覆盖整个方括号。
  const computedBracket = nameUnit as Bracket;
  const inner = new ExpressionBuilder(host.Template, context);
  let innerBase = 0;
  if (computedBracket.SourceRange.Start >= 0) {
    innerBase = computedBracket.SourceRange.StartIndex + 1;
  }
  inner.Load(computedBracket.Data, innerBase);
  if (inner.Units.length === 0) {
    throw new Error("枚举成员的计算名是空的");
  }
  const expression = inner.ParseExpression();
  if (inner.At !== inner.Units.length) {
    throw new Error("枚举成员的计算名没有读完");
  }
  const computed = new ComputedPropertyNameShape(host.Template);
  computed.Add(expression);
  computed.SignInToken(computedBracket);
  computed.SignOutToken(computedBracket);
  computed.Pos = pos;
  computed.TryToClose(context);
  name = computed;
} else if (nameUnit instanceof Common) {
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
  const valuePos = equal.SourceRange.End < 0 ? 0 : equal.SourceRange.EndIndex;
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
