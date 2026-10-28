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
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { TypeBuilder } from "../types/type-builder.xl.md"
import { CallSignaturePossibleShape } from "../types/call-signature-possible-shape.xl.md"
import { ConstructSignaturePossibleShape } from "../types/construct-signature-possible-shape.xl.md"
import { GetAccessorPossibleShape } from "../types/get-accessor-possible-shape.xl.md"
import { IndexSignaturePossibleShape } from "../types/index-signature-possible-shape.xl.md"
import { MethodSignaturePossibleShape } from "../types/method-signature-possible-shape.xl.md"
import { PropertySignaturePossibleShape } from "../types/property-signature-possible-shape.xl.md"
import { MemberShellCatalog } from "../types/member-shell-catalog.xl.md"
import { SetAccessorPossibleShape } from "../types/set-accessor-possible-shape.xl.md"
```

# namespace cangjie

# class InterfaceDeclarationShape extends ShapeToken

```txt
interface I { a: number; }
interface I { a?: number; readonly b: string; }
interface I { m(): void; }
interface I { [k: string]: A; }
```

## field NameToken:Token | null = null

## field DeclareKeyword:Token | null = null

## field HeritageClauses:Array<Token> = []

## field Members:Array<Token> = []

## field BodyBracket:Bracket | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```

## private static field CreateBodyPossibleShapesCache:Array<PossibleShape> | null = null

## static method CreateBodyPossibleShapes:()=>Array<PossibleShape>

```ts
if (InterfaceDeclarationShape.CreateBodyPossibleShapesCache === null) {
  InterfaceDeclarationShape.CreateBodyPossibleShapesCache = [
    new PropertySignaturePossibleShape(),
    new MethodSignaturePossibleShape(),
    new IndexSignaturePossibleShape(),
    new CallSignaturePossibleShape(),
    new ConstructSignaturePossibleShape(),
    new GetAccessorPossibleShape(),
    new SetAccessorPossibleShape(),
  ];
}
return InterfaceDeclarationShape.CreateBodyPossibleShapesCache;
```

## static method FromUnits:(host:Token, start:int, tokenIndex:int, context:SyntaxContext)=>InterfaceDeclarationShape

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
return InterfaceDeclarationShape.BuildFromCode(host, code, pos, context);
```

## static method BuildFromCode:(host:Token, code:Array<Token>, pos:int, context:SyntaxContext)=>InterfaceDeclarationShape

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
      if (cursorEnd >= 0) {
        decoratorEnd = cursorEnd;
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
let heritageBasePos = nameUnit.SourceRange.End < 0 ? 0 : nameUnit.SourceRange.EndIndex;
const typeParameters:Array<Token> = [];
if (index < code.length && code[index] instanceof Symbol && (code[index] as Symbol).Is("<")) {
  const typeParameterBuilder = new TypeBuilder(host.Template, context);
  typeParameterBuilder.LoadFrom(code, index, code.length, heritageBasePos);
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
    if (lastTypeEnd >= 0) {
      heritageBasePos = lastTypeEnd;
    }
  }
}
const heritageUnits:Array<Token> = code.slice(index, code.length - 1);
const bodyUnit = code[code.length - 1];
if (!(bodyUnit instanceof Bracket) || (bodyUnit as Bracket).StartBracketChar !== "{") {
  throw new Error("接口声明的接口体不是花括号");
}
const name = IdentifierShape.FromBasicToken(nameUnit as Common, context);
name.Pos = keyword.SourceRange.End < 0 ? pos : keyword.SourceRange.EndIndex;
const heritageBase = heritageBasePos;
const clauses:Array<Token> = heritageUnits.length === 0
  ? []
  : HeritageClauseShape.BuildClauses(host, heritageUnits, heritageBase, context);
const members = InterfaceDeclarationShape.CollectBodyMembers(host, bodyUnit as Bracket, context);
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
  if (exportUnit.SourceRange.End >= 0) {
    modifierPos = exportUnit.SourceRange.EndIndex;
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

```ts
const members:Array<Token> = [];
const builder = new TypeBuilder(host.Template, context);
let base = 0;
if (bracket.SourceRange.Start >= 0) {
  base = bracket.SourceRange.StartIndex + 1;
}
builder.Load(bracket.Data, base);
while (builder.At < builder.Units.length) {
  members.push(builder.ParseTypeMember());
}
return members;
```

## static method CollectBodyMembers:(host:Token, bracket:Bracket, context:SyntaxContext)=>Array<Token>

```ts
// 单趟：按序收集已建成员，同时记住第一段 raw 代码的位置；成员次序即 XML 次序，不得改动。
// [B2] 收口前先把还没到边界的成员外壳（没有分隔符的最后一个成员）换成正品。
MemberShellCatalog.FinalizeAll(host, bracket, context);
const members:Array<Token> = [];
let hasBuiltMember = false;
let at = 0;
for (; at < bracket.Data.length; at++) {
  const unit = bracket.Data[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit.IsBasicToken) {
    if (unit instanceof Symbol && ((unit as Symbol).Is(";") || (unit as Symbol).Is(","))) {
      continue;
    }
    break;
  }
  hasBuiltMember = true;
  members.push(unit);
}
// raw 尾巴上可能还有已建成员（异常摆放时才出现）：补齐探测，保持「整段有无已建成员」的原判据。
if (at < bracket.Data.length) {
  for (let probe = at + 1; probe < bracket.Data.length; probe++) {
    const probeUnit = bracket.Data[probe];
    if (probeUnit.IsTriviaToken) {
      continue;
    }
    if (!probeUnit.IsBasicToken) {
      hasBuiltMember = true;
      break;
    }
  }
}
if (!hasBuiltMember) {
  return InterfaceDeclarationShape.BuildMembers(host, bracket, context);
}
if (at >= bracket.Data.length) {
  return members;
}
let base = 0;
if (bracket.SourceRange.Start >= 0) {
  base = bracket.SourceRange.StartIndex + 1;
}
for (let previous = at - 1; previous >= 0; previous--) {
  if (!bracket.Data[previous].IsTriviaToken) {
    const previousEnd = bracket.Data[previous].SourceRange.End;
    if (previousEnd >= 0) {
      base = previousEnd;
    }
    break;
  }
}
const builder = new TypeBuilder(host.Template, context);
builder.LoadFrom(bracket.Data, at, bracket.Data.length, base);
while (builder.At < builder.Units.length) {
  const codeUnit = builder.Units[builder.At];
  if (codeUnit.IsTriviaToken) {
    builder.At++;
    continue;
  }
  if (codeUnit instanceof Symbol && ((codeUnit as Symbol).Is(";") || (codeUnit as Symbol).Is(","))) {
    builder.At++;
    continue;
  }
  members.push(builder.ParseTypeMember());
}
return members;
```
