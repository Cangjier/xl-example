# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { DeclareKeywordShape } from "../keywords/declare-keyword-shape.xl.md"
import { ExportKeywordShape } from "../keywords/export-keyword-shape.xl.md"
import { DecoratorShape } from "../types/decorator-shape.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
import { HeritageClauseShape } from "../members/heritage-clause-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { TypeBuilder } from "../types/type-builder.xl.md"
```

# namespace cangjie

# class InterfaceDeclarationShape extends ShapeToken

```txt
interface I { a: number; }
interface I { a?: number; readonly b: string; }
interface I { m(): void; }
interface I { [k: string]: A; }
```

TS 的 children 顺序：名字 → 每个成员。成员就是**对象类型成员**的同一套语法
（PropertySignature / MethodSignature / IndexSignature / CallSignature / 可选的 readonly 修饰符），
所以这里直接复用 `TypeBuilder.ParseTypeMember()`：接口体 `Bracket.Data` 与类型字面量 `{…}` 的内容同口径，
成员区间（含其后的 `;` / `,`）与 `Pos` 都由 TypeBuilder 算好。

区间：从修饰符（没有就从 `interface`）的起点到 `}`；`Pos` 与名字 `Pos` 的口径同 ClassDeclarationShape。

## field NameToken:Token | null = null

## field DeclareKeyword:Token | null = null

## field HeritageClauses:Array<Token> = []

## field Members:Array<Token> = []

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
let index = decoratorCount;
let exportUnit:Token | null = null;
if (index < code.length && code[index] instanceof Common && (code[index] as Common).Is("export")) {
  exportUnit = code[index];
  index++;
}
let declareUnit:Token | null = null;
if (index < code.length && code[index] instanceof Common && (code[index] as Common).Is("declare")) {
  declareUnit = code[index];
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
let heritageBasePos = nameUnit.SourceRange.End === null ? 0 : nameUnit.SourceRange.End.Index + 1;
const typeParameters:Array<Token> = [];
if (index < code.length && code[index] instanceof Symbol && (code[index] as Symbol).Is("<")) {
  const typeParameterBuilder = new TypeBuilder(host.Template, context);
  typeParameterBuilder.Load(code.slice(index), heritageBasePos);
  const parsedTypeParameters = typeParameterBuilder.ParseTypeParameterList();
  for (const parsedTypeParameter of parsedTypeParameters) {
    typeParameters.push(parsedTypeParameter);
  }
  // Load 会把 `>>` / `>>>` 拆成多个只含 `>` 的虚拟单元：At 是虚拟单元数，要按原 code 还原宽度
  // （`>>` 计 2、`>>>` 计 3）再映射回原始下标。
  let consumedUnits = 0;
  let mappedIndex = index;
  while (consumedUnits < typeParameterBuilder.At && mappedIndex < code.length) {
    const mappedUnit = code[mappedIndex];
    let width = 1;
    if (mappedUnit instanceof Symbol) {
      const mappedText = (mappedUnit as Symbol).TempToString();
      if (mappedText.length > 1) {
        let allClose = true;
        for (let ci = 0; ci < mappedText.length; ci++) {
          if (mappedText[ci] !== ">") {
            allClose = false;
            break;
          }
        }
        if (allClose) {
          width = mappedText.length;
        }
      }
    }
    consumedUnits += width;
    mappedIndex++;
  }
  index = mappedIndex;
  if (index > 0) {
    const lastTypeUnit = code[index - 1];
    const lastTypeEnd = lastTypeUnit.SourceRange.End;
    if (lastTypeEnd !== null) {
      heritageBasePos = lastTypeEnd.Index + 1;
    }
  }
}
const heritageUnits:Array<Token> = code.slice(index, code.length - 1);
const bodyUnit = code[code.length - 1];
if (!(bodyUnit instanceof Bracket) || (bodyUnit as Bracket).StartBracketChar !== "{") {
  throw new Error("接口声明的接口体不是花括号");
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
const heritageBase = heritageBasePos;
const clauses:Array<Token> = heritageUnits.length === 0
  ? []
  : HeritageClauseShape.BuildClauses(host, heritageUnits, heritageBase, context);
const members = InterfaceDeclarationShape.BuildMembers(host, bodyUnit as Bracket, context);
const shape = new InterfaceDeclarationShape(host.Template);
shape.NameToken = name;
shape.HeritageClauses = clauses;
shape.Members = members;
let modifierPos = decoratorCount === 0 ? pos : decoratorEnd;
for (const decorator of decorators) {
  shape.Add(decorator);
}
if (exportUnit !== null) {
  const exportModifier = new ExportKeywordShape(host.Template);
  exportModifier.SignInToken(exportUnit);
  exportModifier.SignOutToken(exportUnit);
  exportModifier.Pos = modifierPos;
  exportModifier.TryToClose(context);
  shape.Add(exportModifier);
  if (exportUnit.SourceRange.End !== null) {
    modifierPos = exportUnit.SourceRange.End.Index + 1;
  }
}
if (declareUnit !== null) {
  const modifier = DeclareKeywordShape.FromBasicToken(declareUnit as Common, context);
  modifier.Pos = modifierPos;
  shape.DeclareKeyword = modifier;
  shape.Add(modifier);
}
shape.Add(name);
for (const typeParameter of typeParameters) {
  shape.Add(typeParameter);
}
for (const clause of clauses) {
  shape.Add(clause);
}
for (const member of members) {
  shape.Add(member);
}
if (decoratorCount > 0) {
  shape.SignInToken(code[0]);
} else if (exportUnit !== null) {
  shape.SignInToken(exportUnit);
} else if (declareUnit !== null) {
  shape.SignInToken(declareUnit);
} else {
  shape.SignInToken(keyword);
}
shape.SignOutToken(bodyUnit);
shape.Pos = pos;
shape.TryToClose(context);
return shape;
```

## static method BuildMembers:(host:Token, bracket:Bracket, context:SyntaxContext)=>Array<Token>

接口体成员逐个交给 `TypeBuilder.ParseTypeMember()`（`readonly` / 可选 `?` / 方法签名 / 索引签名 / 调用签名都覆盖）。

```ts
const members:Array<Token> = [];
const builder = new TypeBuilder(host.Template, context);
let base = 0;
if (bracket.SourceRange.Start !== null) {
  base = bracket.SourceRange.Start.Index + 1;
}
builder.Load(bracket.Data, base);
while (builder.At < builder.Units.length) {
  members.push(builder.ParseTypeMember());
}
return members;
```
