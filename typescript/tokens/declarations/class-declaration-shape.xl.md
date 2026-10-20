# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { AbstractKeywordShape } from "../keywords/abstract-keyword-shape.xl.md"
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

# class ClassDeclarationShape extends ShapeToken

```txt
class C {}
declare class C {}
abstract class C {}
abstract declare class C {}
```

`class C {}` 的 TS children 只有名字（`modifiers` 为空时）：ClassDeclaration → [Identifier C]。
修饰符会按源码顺序出现在名字前面：`declare` → DeclareKeyword，`abstract` → AbstractKeyword
（TS 的 SyntaxKind 反查把 `abstract` 印成 FirstContextualKeyword，harness 别名归一到 AbstractKeyword）。
类体是 basic token `Bracket`（`{…}` 整块），本批只收空体；关键字本身不进 Data。

区间：从第一个修饰符（没有就从 `class`）的起点到 `}`；`Pos` = 前面那个非 trivia 单元 `End.Index + 1`（没有就是 `0`）。
修饰符与名字的 `Pos` 都含前导 trivia（与 TS 一致）。

字段不叫 `Name`：`cjAst` 会把 `Name` 读成 AST 的 `name`，而尺子里 ClassDeclaration 只比 children。

## field NameToken:Token | null = null

## field DeclareKeyword:Token | null = null

## field AbstractKeyword:Token | null = null

## field HeritageClauses:Array<Token> = []

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
let abstractUnit:Token | null = null;
while (index < code.length && code[index] instanceof Common) {
  const text = (code[index] as Common).TempToString();
  if (text === "declare" && declareUnit === null) {
    declareUnit = code[index];
    index++;
    continue;
  }
  if (text === "abstract" && abstractUnit === null) {
    abstractUnit = code[index];
    index++;
    continue;
  }
  break;
}
if (index >= code.length) {
  throw new Error("类声明不完整");
}
const modifierCount = index;
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
const heritageUnits:Array<Token> = code.slice(index, code.length - 1);
const bodyUnit = code[code.length - 1];
if (!(bodyUnit instanceof Bracket) || (bodyUnit as Bracket).StartBracketChar !== "{") {
  throw new Error("类声明的类体不是花括号");
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
const heritageBase = nameUnit.SourceRange.End === null ? name.Pos : nameUnit.SourceRange.End.Index + 1;
const clauses:Array<Token> = heritageUnits.length === 0
  ? []
  : HeritageClauseShape.BuildClauses(host, heritageUnits, heritageBase, context);
const shape = new ClassDeclarationShape(host.Template);
shape.NameToken = name;
shape.HeritageClauses = clauses;
// 修饰符按源码顺序建（`declare` / `abstract` 任意顺序、可只出现一个）。
// Pos 口径：第一个修饰符 = 整个声明的 Pos（含前导 trivia），后面的 = 前一个修饰符的 End+1。
let modifierPos = pos;
for (let at = 0; at < modifierCount; at++) {
  const modifierUnit = code[at];
  if (!(modifierUnit instanceof Common)) {
    continue;
  }
  if ((modifierUnit as Common).Is("declare")) {
    const modifier = DeclareKeywordShape.FromBasicToken(modifierUnit as Common, context);
    modifier.Pos = modifierPos;
    shape.DeclareKeyword = modifier;
    shape.Add(modifier);
  } else {
    const modifier = AbstractKeywordShape.FromBasicToken(modifierUnit as Common, context);
    modifier.Pos = modifierPos;
    shape.AbstractKeyword = modifier;
    shape.Add(modifier);
  }
  if (modifierUnit.SourceRange.End !== null) {
    modifierPos = modifierUnit.SourceRange.End.Index + 1;
  }
}
shape.Add(name);
for (const clause of clauses) {
  shape.Add(clause);
}
shape.SignInToken(code[0]);
shape.SignOutToken(bodyUnit);
shape.Pos = pos;
shape.TryToClose(context);
return shape;
```
