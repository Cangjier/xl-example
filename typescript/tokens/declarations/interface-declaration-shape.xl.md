# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { DeclareKeywordShape } from "../keywords/declare-keyword-shape.xl.md"
import { HeritageClauseShape } from "../members/heritage-clause-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class InterfaceDeclarationShape extends ShapeToken

```txt
interface I {}
declare interface I {}
```

`interface I {}` 的 TS children 只有名字：InterfaceDeclaration → [Identifier I]；
`declare interface I {}` 多一个修饰符子节点：InterfaceDeclaration → [DeclareKeyword, Identifier I]。
`extends` 先不做（要 HeritageClauseShape + ExpressionWithTypeArguments，见 docs/coverage-declarations.md）；
接口体是 basic token `Bracket`，本批只收空体。

区间：从修饰符（没有就从 `interface`）的起点到 `}`；`Pos` 与名字 `Pos` 的口径同 ClassDeclarationShape。

## field NameToken:Token | null = null

## field DeclareKeyword:Token | null = null

## field HeritageClauses:Array<Token> = []

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromUnits:(host:Token, start:int, tokenIndex:int, context:SyntaxContext)=>InterfaceDeclarationShape

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
  throw new Error("接口声明不完整");
}
const keyword = code[index];
index++;
if (!(keyword instanceof Common) || !(keyword as Common).Is("interface")) {
  throw new Error("接口声明缺少 interface 关键字");
}
if (index >= code.length) {
  throw new Error("接口声明缺少名字");
}
const nameUnit = code[index];
index++;
if (!(nameUnit instanceof Common)) {
  throw new Error("接口声明的名字不是标识符");
}
if (index >= code.length) {
  throw new Error("接口声明缺少接口体");
}
const heritageUnits:Array<Token> = code.slice(index, code.length - 1);
const bodyUnit = code[code.length - 1];
if (!(bodyUnit instanceof Bracket) || (bodyUnit as Bracket).StartBracketChar !== "{") {
  throw new Error("接口声明的接口体不是花括号");
}
for (const item of (bodyUnit as Bracket).Data) {
  if (!item.IsTriviaToken) {
    throw new Error("接口体非空：接口成员未实现");
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
const heritageBase = nameUnit.SourceRange.End === null ? name.Pos : nameUnit.SourceRange.End.Index + 1;
const clauses:Array<Token> = heritageUnits.length === 0
  ? []
  : HeritageClauseShape.BuildClauses(host, heritageUnits, heritageBase, context);
const shape = new InterfaceDeclarationShape(host.Template);
shape.NameToken = name;
shape.HeritageClauses = clauses;
if (declareUnit !== null) {
  const modifier = DeclareKeywordShape.FromBasicToken(declareUnit as Common, context);
  // 与 ClassDeclarationShape 同口径：modifier 的 pos 含前导 trivia。
  modifier.Pos = pos;
  shape.DeclareKeyword = modifier;
  shape.Add(modifier);
}
shape.Add(name);
for (const clause of clauses) {
  shape.Add(clause);
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
