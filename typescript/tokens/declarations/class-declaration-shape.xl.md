# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { AbstractKeywordShape } from "../keywords/abstract-keyword-shape.xl.md"
import { AsyncKeywordShape } from "../keywords/async-keyword-shape.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ComputedPropertyNameShape } from "../types/computed-property-name-shape.xl.md"
import { ClassStaticBlockDeclarationShape } from "../types/class-static-block-declaration-shape.xl.md"
import { ConstructorShape } from "../types/constructor-shape.xl.md"
import { DeclareKeywordShape } from "../keywords/declare-keyword-shape.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
import { GetAccessorShape } from "../types/get-accessor-shape.xl.md"
import { HeritageClauseShape } from "../members/heritage-clause-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { MethodDeclarationShape } from "../types/method-declaration-shape.xl.md"
import { OverrideKeywordShape } from "../keywords/override-keyword-shape.xl.md"
import { ParameterShape } from "../types/parameter-shape.xl.md"
import { PrivateKeywordShape } from "../keywords/private-keyword-shape.xl.md"
import { PropertyDeclarationShape } from "../types/property-declaration-shape.xl.md"
import { ProtectedKeywordShape } from "../keywords/protected-keyword-shape.xl.md"
import { PublicKeywordShape } from "../keywords/public-keyword-shape.xl.md"
import { ReadonlyKeywordShape } from "../keywords/readonly-keyword-shape.xl.md"
import { SetAccessorShape } from "../types/set-accessor-shape.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { StatementBuilder } from "../statements/statement-builder.xl.md"
import { StaticKeywordShape } from "../keywords/static-keyword-shape.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { TypeBuilder } from "../types/type-builder.xl.md"
```

# namespace cangjie

# class ClassDeclarationShape extends ShapeToken

```txt
class C { x = 1; }
class C { readonly x = 1; }
class C { m(a: A): B { return a; } }
class C { constructor() {} }
class C { get x() { return 1; } }
class C { [k] = 1; }
```

TS 的 children 顺序：修饰符 → 名字 → 每个 `Parameter` →（可选）返回类型 → `Block` 函数体；
`class` 关键字、参数表括号、`:`、`=`、`;` 都不进 Data。成员由 `BuildMembers` 从类体 `Bracket.Data` 逐个建：
PropertyDeclaration / MethodDeclaration / Constructor / GetAccessor / SetAccessor，名字可以是 Identifier 或
ComputedPropertyName（`[k]`，内部再装一个表达式）。`constructor` 的名字**不投影**（TS 的 Constructor 只有参数与函数体）。

区间：从第一个修饰符（没有就从 `class`）的起点到 `}`；`Pos` = 前面那个非 trivia 单元 `End.Index + 1`。
成员的 `Pos` = 前一个成员（或 `{`）的 `End.Index + 1`，`end` = 函数体 `}` / 属性末尾的 `;`。

## field NameToken:Token | null = null

## field DeclareKeyword:Token | null = null

## field AbstractKeyword:Token | null = null

## field HeritageClauses:Array<Token> = []

## field Members:Array<Token> = []

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromUnits:(host:Token, start:int, tokenIndex:int, context:SyntaxContext)=>ClassDeclarationShape

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
const members = ClassDeclarationShape.BuildMembers(host, bodyUnit as Bracket, context);
const shape = new ClassDeclarationShape(host.Template);
shape.NameToken = name;
shape.HeritageClauses = clauses;
shape.Members = members;
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
for (const member of members) {
  shape.Add(member);
}
shape.SignInToken(code[0]);
shape.SignOutToken(bodyUnit);
shape.Pos = pos;
shape.TryToClose(context);
return shape;
```

## static method BuildModifier:(template:Template, text:string, unit:Token, pos:int, context:SyntaxContext)=>Token

```ts
let shape:ShapeToken;
if (text === "readonly") {
  shape = new ReadonlyKeywordShape(template);
} else if (text === "static") {
  shape = new StaticKeywordShape(template);
} else if (text === "private") {
  shape = new PrivateKeywordShape(template);
} else if (text === "public") {
  shape = new PublicKeywordShape(template);
} else if (text === "protected") {
  shape = new ProtectedKeywordShape(template);
} else if (text === "abstract") {
  shape = new AbstractKeywordShape(template);
} else if (text === "declare") {
  shape = new DeclareKeywordShape(template);
} else if (text === "override") {
  shape = new OverrideKeywordShape(template);
} else {
  shape = new AsyncKeywordShape(template);
}
shape.SignInToken(unit);
shape.SignOutToken(unit);
shape.Pos = pos;
shape.TryToClose(context);
return shape;
```

## static method BuildParameters:(host:Token, bracket:Bracket, context:SyntaxContext)=>Array<Token>

参数表按逗号切组；带 `:` / `?:` 的组交给 `TypeBuilder.ParseParameter()`，不带类型的组只建 `Identifier`。

```ts
const parameters:Array<Token> = [];
const inner = new TypeBuilder(host.Template, context);
let base = 0;
if (bracket.SourceRange.Start !== null) {
  base = bracket.SourceRange.Start.Index + 1;
}
inner.Load(bracket.Data, base);
while (inner.At < inner.Units.length) {
  if (inner.IsText(inner.Units[inner.At], ",")) {
    inner.At++;
    continue;
  }
  const nameIndex = inner.At;
  let typed = false;
  if (nameIndex + 1 < inner.Units.length) {
    const next = inner.TextOf(inner.Units[nameIndex + 1]);
    if (next === "?:") {
      typed = true;
    } else if (next === "?") {
      typed = nameIndex + 2 < inner.Units.length && inner.TextOf(inner.Units[nameIndex + 2]) === ":";
    } else if (next === ":") {
      typed = true;
    }
  }
  if (typed) {
    parameters.push(inner.ParseParameter());
    continue;
  }
  const nameUnit = inner.Units[nameIndex];
  if (!(nameUnit instanceof Common)) {
    throw new Error("类成员参数不是标识符");
  }
  inner.At++;
  const parameter = new ParameterShape(host.Template);
  const name = IdentifierShape.FromBasicToken(nameUnit as Common, context);
  name.Pos = inner.Positions[nameIndex];
  parameter.ParameterName = name;
  parameter.Add(name);
  parameter.SignInToken(nameUnit);
  parameter.SignOutToken(nameUnit);
  parameter.Pos = inner.Positions[nameIndex];
  parameter.TryToClose(context);
  parameters.push(parameter);
}
return parameters;
```

## static method BuildMembers:(host:Token, bracket:Bracket, context:SyntaxContext)=>Array<Token>

类体逐个成员：先吃修饰符（readonly/static/private/public/protected/abstract/declare/override/async 进 Data，
`get`/`set` 只作访问器标志不进 Data），再名字（Identifier 或 `[expr]` ComputedPropertyName），
然后按后面的单元分派：`(` → 方法 / 构造 / 访问器（可带 `: 返回类型` 与 `{…}` 函数体）；
`:` / `=` / `;` → 属性。

```ts
const code:Array<Token> = [];
for (const item of bracket.Data) {
  if (!item.IsTriviaToken) {
    code.push(item);
  }
}
const members:Array<Token> = [];
let at = 0;
let previousEnd = bracket.SourceRange.Start === null ? -1 : bracket.SourceRange.Start.Index;
while (at < code.length) {
  const unit = code[at];
  if (unit instanceof Symbol && (unit as Symbol).Is(";")) {
    if (unit.SourceRange.End !== null) {
      previousEnd = unit.SourceRange.End.Index;
    }
    at++;
    continue;
  }
  const startPos = previousEnd + 1;
  const firstIndex = at;
  const firstUnit = code[firstIndex];
  const modifiers:Array<Token> = [];
  let hasStatic = false;
  let accessorKind = "";
  while (at < code.length && code[at] instanceof Common) {
    const text = (code[at] as Common).TempToString();
    if (text !== "readonly" && text !== "static" && text !== "private" && text !== "public"
      && text !== "protected" && text !== "abstract" && text !== "declare" && text !== "override"
      && text !== "async" && text !== "get" && text !== "set") {
      break;
    }
    if (text === "static") {
      hasStatic = true;
    }
    if (text === "get" || text === "set") {
      accessorKind = text;
      const accessorUnit = code[at];
      if (accessorUnit.SourceRange.End !== null) {
        previousEnd = accessorUnit.SourceRange.End.Index;
      }
      at++;
      continue;
    }
    const modifierPos = previousEnd + 1;
    const modifierUnit = code[at];
    if (modifierUnit.SourceRange.End !== null) {
      previousEnd = modifierUnit.SourceRange.End.Index;
    }
    at++;
    modifiers.push(ClassDeclarationShape.BuildModifier(host.Template, text, modifierUnit, modifierPos, context));
  }
  if (hasStatic && at < code.length && code[at] instanceof Bracket && (code[at] as Bracket).StartBracketChar === "{") {
    const staticBody = code[at] as Bracket;
    const staticBodyPos = previousEnd + 1;
    if (staticBody.SourceRange.End !== null) {
      previousEnd = staticBody.SourceRange.End.Index;
    }
    at++;
    const staticBuilder = new StatementBuilder(host.Template, context);
    staticBuilder.Load([staticBody], staticBodyPos);
    const staticBlock = staticBuilder.BuildStatement();
    if (staticBuilder.At !== staticBuilder.Units.length) {
      throw new Error("static 块没有读完");
    }
    const staticShape = new ClassStaticBlockDeclarationShape(host.Template);
    staticShape.Add(staticBlock);
    staticShape.SignInToken(firstUnit);
    staticShape.SignOutToken(staticBody);
    staticShape.Pos = startPos;
    staticShape.TryToClose(context);
    members.push(staticShape);
    continue;
  }
  if (at >= code.length) {
    throw new Error("类成员不完整");
  }
  let nameShape:Token | null = null;
  let nameText = "";
  const nameUnit = code[at];
  if (nameUnit instanceof Bracket && (nameUnit as Bracket).StartBracketChar === "[") {
    const computedBracket = nameUnit as Bracket;
    const inner = new ExpressionBuilder(host.Template, context);
    let innerBase = 0;
    if (computedBracket.SourceRange.Start !== null) {
      innerBase = computedBracket.SourceRange.Start.Index + 1;
    }
    inner.Load(computedBracket.Data, innerBase);
    if (inner.Units.length === 0) {
      throw new Error("computed 成员名是空的");
    }
    const expression = inner.ParseExpression();
    if (inner.At !== inner.Units.length) {
      throw new Error("computed 成员名没有读完");
    }
    const computed = new ComputedPropertyNameShape(host.Template);
    computed.Add(expression);
    computed.SignInToken(computedBracket);
    computed.SignOutToken(computedBracket);
    computed.Pos = startPos;
    computed.TryToClose(context);
    nameShape = computed;
    if (nameUnit.SourceRange.End !== null) {
      previousEnd = nameUnit.SourceRange.End.Index;
    }
    at++;
  } else if (nameUnit instanceof Common) {
    const namePos = previousEnd + 1;
    const ident = IdentifierShape.FromBasicToken(nameUnit as Common, context);
    ident.Pos = namePos;
    nameShape = ident;
    nameText = (nameUnit as Common).TempToString();
    if (nameUnit.SourceRange.End !== null) {
      previousEnd = nameUnit.SourceRange.End.Index;
    }
    at++;
  } else {
    throw new Error("类成员名字不是标识符");
  }
  if (nameShape === null) {
    throw new Error("类成员缺少名字");
  }
  if (at < code.length && code[at] instanceof Bracket && (code[at] as Bracket).StartBracketChar === "(") {
    const paramBracket = code[at] as Bracket;
    if (paramBracket.SourceRange.End !== null) {
      previousEnd = paramBracket.SourceRange.End.Index;
    }
    at++;
    const parameters = ClassDeclarationShape.BuildParameters(host, paramBracket, context);
    let returnType:Token | null = null;
    if (at < code.length && code[at] instanceof Symbol && (code[at] as Symbol).Is(":")) {
      const colon = code[at];
      const typePos = colon.SourceRange.End === null ? 0 : colon.SourceRange.End.Index + 1;
      if (colon.SourceRange.End !== null) {
        previousEnd = colon.SourceRange.End.Index;
      }
      at++;
      const typeStart = at;
      while (at < code.length) {
        const probe = code[at];
        if (probe instanceof Bracket && (probe as Bracket).StartBracketChar === "{") {
          break;
        }
        if (probe instanceof Symbol && (probe as Symbol).Is(";")) {
          break;
        }
        if (probe.SourceRange.End !== null) {
          previousEnd = probe.SourceRange.End.Index;
        }
        at++;
      }
      const typeUnits:Array<Token> = code.slice(typeStart, at);
      if (typeUnits.length === 0) {
        throw new Error("方法的返回类型为空");
      }
      const typeBuilder = new TypeBuilder(host.Template, context);
      typeBuilder.Load(typeUnits, typePos);
      returnType = typeBuilder.ParseType();
      if (typeBuilder.At !== typeBuilder.Units.length) {
        throw new Error("方法的返回类型没有读完");
      }
    }
    let body:Token | null = null;
    let bodyUnit:Token | null = null;
    let signatureEnd:Token | null = null;
    if (at < code.length && code[at] instanceof Bracket && (code[at] as Bracket).StartBracketChar === "{") {
      bodyUnit = code[at] as Bracket;
      const bodyPos = previousEnd + 1;
      if (bodyUnit.SourceRange.End !== null) {
        previousEnd = bodyUnit.SourceRange.End.Index;
      }
      at++;
      const bodyBuilder = new StatementBuilder(host.Template, context);
      bodyBuilder.Load([bodyUnit], bodyPos);
      body = bodyBuilder.BuildStatement();
      if (bodyBuilder.At !== bodyBuilder.Units.length) {
        throw new Error("类成员函数体没有读完");
      }
    } else if (at < code.length && code[at] instanceof Symbol && (code[at] as Symbol).Is(";")) {
      signatureEnd = code[at];
      if (signatureEnd.SourceRange.End !== null) {
        previousEnd = signatureEnd.SourceRange.End.Index;
      }
      at++;
    } else {
      throw new Error("类成员缺少函数体");
    }
    let memberShape:ShapeToken;
    if (accessorKind === "get") {
      memberShape = new GetAccessorShape(host.Template);
    } else if (accessorKind === "set") {
      memberShape = new SetAccessorShape(host.Template);
    } else if (accessorKind === "" && nameText === "constructor" && nameShape instanceof IdentifierShape) {
      memberShape = new ConstructorShape(host.Template);
    } else {
      memberShape = new MethodDeclarationShape(host.Template);
    }
    for (const modifier of modifiers) {
      memberShape.Add(modifier);
    }
    if (!(memberShape instanceof ConstructorShape)) {
      memberShape.Add(nameShape);
    }
    for (const parameter of parameters) {
      memberShape.Add(parameter);
    }
    if (returnType !== null) {
      memberShape.Add(returnType);
    }
    if (body !== null) {
      memberShape.Add(body);
    }
    let memberEnd:Token | null = bodyUnit;
    if (memberEnd === null) {
      memberEnd = signatureEnd;
    }
    if (memberEnd === null) {
      memberEnd = code[at - 1];
    }
    memberShape.SignInToken(firstUnit);
    memberShape.SignOutToken(memberEnd);
    memberShape.Pos = startPos;
    memberShape.TryToClose(context);
    members.push(memberShape);
    continue;
  }
  let typeShape:Token | null = null;
  let initializer:Token | null = null;
  if (at < code.length && code[at] instanceof Symbol && (code[at] as Symbol).Is(":")) {
    const colon = code[at];
    const typePos = colon.SourceRange.End === null ? 0 : colon.SourceRange.End.Index + 1;
    if (colon.SourceRange.End !== null) {
      previousEnd = colon.SourceRange.End.Index;
    }
    at++;
    const typeStart = at;
    while (at < code.length) {
      const probe = code[at];
      if (probe instanceof Symbol && ((probe as Symbol).Is("=") || (probe as Symbol).Is(";"))) {
        break;
      }
      if (probe.SourceRange.End !== null) {
        previousEnd = probe.SourceRange.End.Index;
      }
      at++;
    }
    const typeUnits:Array<Token> = code.slice(typeStart, at);
    if (typeUnits.length === 0) {
      throw new Error("属性的类型为空");
    }
    const typeBuilder = new TypeBuilder(host.Template, context);
    typeBuilder.Load(typeUnits, typePos);
    typeShape = typeBuilder.ParseType();
    if (typeBuilder.At !== typeBuilder.Units.length) {
      throw new Error("属性的类型没有读完");
    }
  }
  if (at < code.length && code[at] instanceof Symbol && (code[at] as Symbol).Is("=")) {
    const equal = code[at];
    const valuePos = equal.SourceRange.End === null ? 0 : equal.SourceRange.End.Index + 1;
    if (equal.SourceRange.End !== null) {
      previousEnd = equal.SourceRange.End.Index;
    }
    at++;
    const valueStart = at;
    while (at < code.length) {
      const probe = code[at];
      if (probe instanceof Symbol && (probe as Symbol).Is(";")) {
        break;
      }
      if (probe.SourceRange.End !== null) {
        previousEnd = probe.SourceRange.End.Index;
      }
      at++;
    }
    const valueUnits:Array<Token> = code.slice(valueStart, at);
    if (valueUnits.length === 0) {
      throw new Error("属性初始化器为空");
    }
    const valueBuilder = new ExpressionBuilder(host.Template, context);
    valueBuilder.Load(valueUnits, valuePos);
    initializer = valueBuilder.ParseAssign();
    if (valueBuilder.At !== valueBuilder.Units.length) {
      throw new Error("属性初始化器没有读完");
    }
  }
  let endUnit:Token = code[at - 1];
  if (at < code.length && code[at] instanceof Symbol && (code[at] as Symbol).Is(";")) {
    endUnit = code[at];
    if (endUnit.SourceRange.End !== null) {
      previousEnd = endUnit.SourceRange.End.Index;
    }
    at++;
  }
  const property = new PropertyDeclarationShape(host.Template);
  for (const modifier of modifiers) {
    property.Add(modifier);
  }
  property.Add(nameShape);
  if (typeShape !== null) {
    property.Add(typeShape);
  }
  if (initializer !== null) {
    property.Add(initializer);
  }
  property.SignInToken(firstUnit);
  property.SignOutToken(endUnit);
  property.Pos = startPos;
  property.TryToClose(context);
  members.push(property);
}
return members;
```
