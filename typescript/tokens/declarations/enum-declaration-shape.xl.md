# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { DeclareKeywordShape } from "../keywords/declare-keyword-shape.xl.md"
import { EnumMemberShape } from "../members/enum-member-shape.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
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
declare enum E {}
```

`enum E { A }` 的 TS children 是 [Identifier E, EnumMember A]；EnumMember 自己是 [Identifier A]，
带初始化器时是 [Identifier A, 字面量/表达式]。`enum` / `declare` / 花括号 / 逗号 / 等号都不进 Data。

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
let index = 0;
let declareUnit:Token | null = null;
if (code.length > 0 && code[0] instanceof Common && (code[0] as Common).Is("declare")) {
  declareUnit = code[0];
  index++;
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
if (declareUnit !== null) {
  const modifier = DeclareKeywordShape.FromBasicToken(declareUnit as Common, context);
  // 与 ClassDeclarationShape 同口径：modifier 的 pos 含前导 trivia。
  modifier.Pos = pos;
  shape.Add(modifier);
}
shape.Add(name);
for (const member of members) {
  shape.Add(member);
}
if (declareUnit !== null) {
  shape.SignInToken(declareUnit);
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
if (!(nameUnit instanceof Common)) {
  throw new Error("枚举成员的名字不是标识符");
}
const name = IdentifierShape.FromBasicToken(nameUnit as Common, context);
name.Pos = pos;
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
