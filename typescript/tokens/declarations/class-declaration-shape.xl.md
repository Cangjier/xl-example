# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { DeclareKeywordShape } from "../keywords/declare-keyword-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class ClassDeclarationShape extends ShapeToken

```txt
class C {}
declare class C {}
```

`class C {}` 的 TS children 只有名字（`modifiers` 为空时）：ClassDeclaration → [Identifier C]。
`declare class C {}` 的 `declare` 是 modifier，会作为子节点出现：ClassDeclaration → [DeclareKeyword, Identifier C]。
类体是 basic token `Bracket`（`{…}` 整块），本批只收空体；`class` / `declare` 关键字本身不进 Data。

区间：从修饰符（没有就从 `class`）的起点到 `}`；`Pos` = 前面那个非 trivia 单元 `End.Index + 1`（没有就是 `0`）。
名字的 `Pos` 是 `class` 关键字之后，和 TS 的 `Identifier.pos` 同口径（含前导 trivia）。

字段不叫 `Name`：`cjAst` 会把 `Name` 读成 AST 的 `name`，而尺子里 ClassDeclaration 只比 children。

## field NameToken:Token | null = null

## field DeclareKeyword:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromUnits:(host:Token, start:int, tokenIndex:int, context:SyntaxContext)=>ClassDeclarationShape

从根单元 `host.Data[start..tokenIndex]` 建一条类声明；`tokenIndex` 必须落在类体那个 `Bracket` 上。

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
  throw new Error("类声明不完整");
}
const keyword = code[index];
index++;
if (!(keyword instanceof Common) || !(keyword as Common).Is("class")) {
  throw new Error("类声明缺少 class 关键字");
}
if (index >= code.length) {
  throw new Error("类声明缺少名字");
}
const nameUnit = code[index];
index++;
if (!(nameUnit instanceof Common)) {
  throw new Error("类声明的名字不是标识符");
}
if (index >= code.length) {
  throw new Error("类声明缺少类体");
}
const bodyUnit = code[index];
index++;
if (!(bodyUnit instanceof Bracket) || (bodyUnit as Bracket).StartBracketChar !== "{") {
  throw new Error("类声明的类体不是花括号");
}
if (index !== code.length) {
  throw new Error("类声明有多余单元");
}
for (const item of (bodyUnit as Bracket).Data) {
  if (!item.IsTriviaToken) {
    throw new Error("类体非空：类成员未实现");
  }
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
const shape = new ClassDeclarationShape(host.Template);
shape.NameToken = name;
if (declareUnit !== null) {
  const modifier = DeclareKeywordShape.FromBasicToken(declareUnit as Common, context);
  // TS 的 modifier 也带前导 trivia：`/* c */ declare class C {}` 里 DeclareKeyword 的 pos 是 0 而不是 `declare` 的起点。
  modifier.Pos = pos;
  shape.DeclareKeyword = modifier;
  shape.Add(modifier);
}
shape.Add(name);
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
