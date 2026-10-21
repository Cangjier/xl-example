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
import { DecoratorShape } from "../types/decorator-shape.xl.md"
import { AsteriskTokenShape } from "../punctuation/asterisk-token-shape.xl.md"
import { SemicolonClassElementShape } from "../expressions/semicolon-class-element-shape.xl.md"
import { ExclamationTokenShape } from "../punctuation/exclamation-token-shape.xl.md"
import { QuestionTokenShape } from "../punctuation/question-token-shape.xl.md"
import { DeclareKeywordShape } from "../keywords/declare-keyword-shape.xl.md"
import { ExportKeywordShape } from "../keywords/export-keyword-shape.xl.md"
import { DefaultKeywordShape } from "../keywords/default-keyword-shape.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
import { GetAccessorShape } from "../types/get-accessor-shape.xl.md"
import { IndexSignatureShape } from "../types/index-signature-shape.xl.md"
import { HeritageClauseShape } from "../members/heritage-clause-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { MethodDeclarationShape } from "../types/method-declaration-shape.xl.md"
import { MemberBoundary } from "../types/member-boundary.xl.md"
import { OverrideKeywordShape } from "../keywords/override-keyword-shape.xl.md"
import { ParameterShape } from "../types/parameter-shape.xl.md"
import { PrivateIdentifierShape } from "../names/private-identifier-shape.xl.md"
import { AccessorKeywordShape } from "../keywords/accessor-keyword-shape.xl.md"
import { PrivateKeywordShape } from "../keywords/private-keyword-shape.xl.md"
import { PropertyDeclarationShape } from "../types/property-declaration-shape.xl.md"
import { ProtectedKeywordShape } from "../keywords/protected-keyword-shape.xl.md"
import { PublicKeywordShape } from "../keywords/public-keyword-shape.xl.md"
import { ReadonlyKeywordShape } from "../keywords/readonly-keyword-shape.xl.md"
import { SetAccessorShape } from "../types/set-accessor-shape.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { StatementBuilder } from "../statements/statement-builder.xl.md"
import { StatementScanner } from "../statements/statement-scanner.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { StringLiteralShape } from "../literals/string-literal-shape.xl.md"
import { NumericLiteralShape } from "../literals/numeric-literal-shape.xl.md"
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
return ClassDeclarationShape.BuildFromUnits(host, start, tokenIndex, context, false);
```

## static method FromUnitsAllowAnonymous:(host:Token, start:int, tokenIndex:int, context:SyntaxContext)=>ClassDeclarationShape

```ts
// Used by the export-declaration family: `export default class {}` / `export default class<T> {}` are
// anonymous ClassDeclarations in TS (no Identifier child), so the name is optional there.
return ClassDeclarationShape.BuildFromUnits(host, start, tokenIndex, context, true);
```

## private static method BuildFromUnits:(host:Token, start:int, tokenIndex:int, context:SyntaxContext, allowAnonymous:bool)=>ClassDeclarationShape

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
    if (end !== null) {
      pos = end.Index + 1;
    }
    break;
  }
}
const decorators:Array<Token> = [];
let decoratorEnd = pos;
let index = 0;
while (index < code.length && code[index] instanceof Symbol && (code[index] as Symbol).Is("@")) {
  const atUnit = code[index];
  const decoratorPos = decoratorEnd;
  const expressionBase = atUnit.SourceRange.End === null ? decoratorPos : atUnit.SourceRange.End.Index + 1;
  index++;
  const decoratorBuilder = new ExpressionBuilder(host.Template, context);
  decoratorBuilder.Load(code.slice(index), expressionBase);
  if (decoratorBuilder.Units.length === 0) {
    throw new Error("decorator expression is empty");
  }
  const decoratorExpression = decoratorBuilder.ParseExpression();
  if (decoratorBuilder.At === 0) {
    throw new Error("decorator expression was not read");
  }
  const consumed = decoratorBuilder.At;
  for (let cursor = index; cursor < index + consumed; cursor++) {
    const cursorEnd = code[cursor].SourceRange.End;
    if (cursorEnd !== null) {
      decoratorEnd = cursorEnd.Index + 1;
    }
  }
  index += consumed;
  decorators.push(DecoratorShape.FromParts(atUnit, decoratorExpression, decoratorPos, context));
}
const decoratorUnitCount = index;
const decoratorCount = decorators.length;
let exportUnit:Token | null = null;
let defaultUnit:Token | null = null;
let declareUnit:Token | null = null;
let abstractUnit:Token | null = null;
while (index < code.length && code[index] instanceof Common) {
  const text = (code[index] as Common).TempToString();
  if (text === "export" && exportUnit === null) {
    // `@dec export class C {}` is legal TS: decorators precede `export` inside the same ClassDeclaration.
    exportUnit = code[index];
    index++;
    continue;
  }
  if (text === "default" && defaultUnit === null && exportUnit !== null) {
    // `@dec export default class C {}`: DefaultKeyword follows ExportKeyword in the same ClassDeclaration.
    defaultUnit = code[index];
    index++;
    continue;
  }
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
const modifierCount = index - decoratorUnitCount;
const keyword = code[index];
index++;
if (!(keyword instanceof Common) || !(keyword as Common).Is("class")) {
  throw new Error("类声明缺少 class 关键字");
}
let nameUnit:Token | null = null;
if (index < code.length && code[index] instanceof Common
  && !(code[index] as Common).Is("extends") && !(code[index] as Common).Is("implements")) {
  nameUnit = code[index];
  index++;
} else if (!allowAnonymous) {
  throw new Error("class declaration requires a name");
}
if (index >= code.length) {
  throw new Error("class declaration is incomplete");
}
let heritageBasePos = nameUnit === null
  ? (keyword.SourceRange.End === null ? pos : keyword.SourceRange.End.Index + 1)
  : (nameUnit.SourceRange.End === null ? 0 : nameUnit.SourceRange.End.Index + 1);
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
  throw new Error("类声明的类体不是花括号");
}
let name:IdentifierShape | null = null;
if (nameUnit !== null) {
  const builtName = IdentifierShape.FromBasicToken(nameUnit as Common, context);
  builtName.Pos = keyword.SourceRange.End === null ? pos : keyword.SourceRange.End.Index + 1;
  name = builtName;
}const heritageBase = heritageBasePos;
const clauses:Array<Token> = heritageUnits.length === 0
  ? []
  : HeritageClauseShape.BuildClauses(host, heritageUnits, heritageBase, context);
const members = ClassDeclarationShape.BuildMembers(host, bodyUnit as Bracket, context);
const shape = new ClassDeclarationShape(host.Template);
shape.NameToken = name;
shape.HeritageClauses = clauses;
shape.Members = members;
let modifierPos = decoratorUnitCount === 0 ? pos : decoratorEnd;
for (const decorator of decorators) {
  shape.Add(decorator);
}
for (let at = decoratorUnitCount; at < decoratorUnitCount + modifierCount; at++) {
  const modifierUnit = code[at];
  if (!(modifierUnit instanceof Common)) {
    continue;
  }
  if ((modifierUnit as Common).Is("export")) {
    const modifier = new ExportKeywordShape(host.Template);
    modifier.SignInToken(modifierUnit);
    modifier.SignOutToken(modifierUnit);
    modifier.Pos = modifierPos;
    modifier.TryToClose(context);
    shape.Add(modifier);
  } else if ((modifierUnit as Common).Is("default")) {
    const modifier = new DefaultKeywordShape(host.Template);
    modifier.SignInToken(modifierUnit);
    modifier.SignOutToken(modifierUnit);
    modifier.Pos = modifierPos;
    modifier.TryToClose(context);
    shape.Add(modifier);
  } else if ((modifierUnit as Common).Is("declare")) {
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
if (name !== null) {
  shape.Add(name);
}
for (const typeParameter of typeParameters) {
  shape.Add(typeParameter);
}
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
} else if (text === "accessor") {
  shape = new AccessorKeywordShape(template);
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
  // Parameter decorators come before modifiers: `constructor(@dec private x: A) {}`. The prefix is
  // consumed here (reusing TypeBuilder.ParseDecorators -> DecoratorShape) so both the property-parameter
  // path and the plain parameter path see a clean head.
  const groupStart = inner.At;
  const decorators:Array<Token> = inner.ParseDecorators();
  const headText = inner.TextOf(inner.Units[inner.At]);
  if (headText === "public" || headText === "private" || headText === "protected" || headText === "readonly") {
    const firstIndex = inner.At;
    const modifiers:Array<Token> = [];
    while (inner.At < inner.Units.length) {
      const modifierText = inner.TextOf(inner.Units[inner.At]);
      if (modifierText !== "public" && modifierText !== "private" && modifierText !== "protected" && modifierText !== "readonly") {
        break;
      }
      const modifierIndex = inner.At;
      const modifierUnit = inner.Units[modifierIndex];
      inner.At++;
      modifiers.push(ClassDeclarationShape.BuildModifier(host.Template, modifierText, modifierUnit, inner.Positions[modifierIndex], context));
    }
    const parameter = new ParameterShape(host.Template);
    for (const decorator of decorators) {
      parameter.Add(decorator);
    }
    for (const modifier of modifiers) {
      parameter.Add(modifier);
    }
    const propertyName = inner.ParseName();
    parameter.ParameterName = propertyName;
    parameter.Add(propertyName);
    const mark = inner.Peek(0);
    const markText = mark === null ? "" : inner.TextOf(mark);
    let parameterColonConsumed = false;
    if (markText === "?" || markText === "?:") {
      const questionShape = inner.ParseOptionalMark();
      if (questionShape !== null) {
        parameter.QuestionToken = questionShape;
        parameter.Add(questionShape);
        parameterColonConsumed = markText === "?:";
      }
    }
    const colonMark = inner.Peek(0);
    let hasParameterType = parameterColonConsumed;
    if (!hasParameterType && colonMark !== null && inner.IsText(colonMark, ":")) {
      inner.At++;
      hasParameterType = true;
    }
    if (hasParameterType) {
      const typeShape = inner.ParseType();
      parameter.Type = typeShape;
      parameter.Add(typeShape);
    }
    const initializerMark = inner.Peek(0);
    if (initializerMark !== null && inner.IsText(initializerMark, "=")) {
      inner.At++;
      const initializerPos = inner.Positions[inner.At];
      const initializerBuilder = new ExpressionBuilder(host.Template, context);
      initializerBuilder.Load(inner.Units.slice(inner.At), initializerPos);
      const initializer = initializerBuilder.ParseAssign();
      parameter.Add(initializer);
      inner.At += initializerBuilder.At;
    }
    parameters.push(inner.SpanNode(parameter, groupStart, inner.At - 1));
    continue;
  }
  if (decorators.length > 0) {
    // Decorated plain parameter: children = Decorator(s), Identifier, [QuestionToken], Type;
    // the Parameter range starts at the first `@` (TS口径).
    const parameter = new ParameterShape(host.Template);
    for (const decorator of decorators) {
      parameter.Add(decorator);
    }
    const name = inner.ParseName();
    parameter.ParameterName = name;
    parameter.Add(name);
    const mark = inner.Peek(0);
    let colonConsumed = false;
    if (mark !== null) {
      const markText = inner.TextOf(mark);
      if (markText === "?" || markText === "?:") {
        const question = inner.ParseOptionalMark();
        if (question !== null) {
          parameter.QuestionToken = question;
          parameter.Add(question);
        }
        colonConsumed = markText === "?:";
      }
    }
    if (!colonConsumed) {
      const colonMark = inner.Peek(0);
      if (colonMark === null || !inner.IsText(colonMark, ":")) {
        throw new Error("装饰过的类成员参数缺少类型标注");
      }
      inner.At++;
    }
    const typeShape = inner.ParseType();
    parameter.Type = typeShape;
    parameter.Add(typeShape);
    parameters.push(inner.SpanNode(parameter, groupStart, inner.At - 1));
    continue;
  }
  const headUnit = inner.Units[inner.At];
  if (headUnit instanceof Symbol && (headUnit as Symbol).Is("@")) {
    parameters.push(inner.ParseParameter());
    continue;
  }
  // rest 参数（`...args: any[]`）：直接交给 TypeBuilder.ParseParameter —— 它已经会建 DotDotDotToken。
  const restHead = inner.Units[inner.At];
  if (restHead instanceof Symbol && (restHead as Symbol).Is("...")) {
    parameters.push(inner.ParseParameter());
    continue;
  }
  const nameIndex = inner.At;
  const headPatternUnit = nameIndex < inner.Units.length ? inner.Units[nameIndex] : null;
  const headIsPattern = headPatternUnit instanceof Bracket
    && ((headPatternUnit as Bracket).StartBracketChar === "{" || (headPatternUnit as Bracket).StartBracketChar === "[");
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
  if (typed || headIsPattern) {
    const parameter = inner.ParseParameter() as ParameterShape;
    ClassDeclarationShape.TakeParameterInitializer(host, inner, parameter, context);
    if (headIsPattern && parameter.ParameterName !== null) {
      let groupPos = 0;
      if (nameIndex > 0) {
        const previousUnit = inner.Units[nameIndex - 1];
        if (previousUnit.SourceRange.End !== null) {
          groupPos = previousUnit.SourceRange.End.Index + 1;
        }
      } else if (bracket.SourceRange.Start !== null) {
        groupPos = bracket.SourceRange.Start.Index + 1;
      }
      (parameter.ParameterName as ShapeToken).Pos = groupPos;
    }
    parameters.push(parameter);
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

## static method TakeParameterInitializer:(host:Token, inner:TypeBuilder, parameter:ParameterShape, context:SyntaxContext)=>void

形参默认值 `= Expr`：`ParseParameter` 之后若紧跟 `=`，把默认值段交给表达式构建器并延长参数区间。

```ts
if (inner.At >= inner.Units.length || !inner.IsText(inner.Units[inner.At], "=")) {
  return;
}
const equalsUnit = inner.Units[inner.At];
let initPos = 0;
if (equalsUnit.SourceRange.End !== null) {
  initPos = equalsUnit.SourceRange.End.Index + 1;
}
inner.At++;
const initStart = inner.At;
let initEnd = initStart;
while (initEnd < inner.Units.length && !inner.IsText(inner.Units[initEnd], ",")) {
  initEnd++;
}
const initUnits:Array<Token> = [];
for (let cursor = initStart; cursor < initEnd; cursor++) {
  initUnits.push(inner.Units[cursor]);
}
if (initUnits.length === 0) {
  return;
}
const initBuilder = new ExpressionBuilder(host.Template, context);
initBuilder.Load(initUnits, initPos);
const initializer = initBuilder.ParseAssign();
if (initBuilder.At !== initBuilder.Units.length) {
  throw new Error("参数默认值没有读完");
}
parameter.Add(initializer);
if (initEnd > initStart) {
  const initTail = inner.Units[initEnd - 1].SourceRange.End;
  if (initTail !== null) {
    parameter.SourceRange.End = initTail;
  }
}
inner.At = initEnd;
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
    // Bare semicolon in a class body is a SemicolonClassElement node (TS AST kind, no children).
    // Its range starts right after the previous token (leading trivia) and ends after the `;`.
    const semicolonShape = new SemicolonClassElementShape(host.Template);
    semicolonShape.SignInToken(unit);
    semicolonShape.SignOutToken(unit);
    semicolonShape.Pos = previousEnd + 1;
    semicolonShape.TryToClose(context);
    members.push(semicolonShape);
    if (unit.SourceRange.End !== null) {
      previousEnd = unit.SourceRange.End.Index;
    }
    at++;
    continue;
  }
  const startPos = previousEnd + 1;
  const firstIndex = at;
  const firstUnit = code[firstIndex];
  const decorators:Array<Token> = [];
  while (at < code.length && code[at] instanceof Symbol && (code[at] as Symbol).Is("@")) {
    const atUnit = code[at];
    const decoratorPos = previousEnd + 1;
    const expressionBase = atUnit.SourceRange.End === null ? decoratorPos : atUnit.SourceRange.End.Index + 1;
    if (atUnit.SourceRange.End !== null) {
      previousEnd = atUnit.SourceRange.End.Index;
    }
    at++;
    let expressionLimit = at;
    while (expressionLimit < code.length) {
      if (code[expressionLimit] instanceof Symbol && (code[expressionLimit] as Symbol).Is("*")) {
        break;
      }
      expressionLimit++;
    }
    const decoratorBuilder = new ExpressionBuilder(host.Template, context);
    decoratorBuilder.Load(code.slice(at, expressionLimit), expressionBase);
    if (decoratorBuilder.Units.length === 0) {
      throw new Error("decorator expression is empty");
    }
    const decoratorExpression = decoratorBuilder.ParseExpression();
    if (decoratorBuilder.At === 0) {
      throw new Error("decorator expression was not read");
    }
    const consumed = decoratorBuilder.At;
    for (let cursor = at; cursor < at + consumed; cursor++) {
      const cursorEnd = code[cursor].SourceRange.End;
      if (cursorEnd !== null) {
        previousEnd = cursorEnd.Index;
      }
    }
    at += consumed;
    decorators.push(DecoratorShape.FromParts(atUnit, decoratorExpression, decoratorPos, context));
  }
  let asteriskToken:Token | null = null;
  const modifiers:Array<Token> = [];
  let hasStatic = false;
  let accessorKind = "";
  while (at < code.length && code[at] instanceof Common) {
    const text = (code[at] as Common).TempToString();
    if (text !== "readonly" && text !== "static" && text !== "private" && text !== "public"
      && text !== "protected" && text !== "abstract" && text !== "declare" && text !== "override"
      && text !== "async" && text !== "accessor" && text !== "get" && text !== "set") {
      break;
    }
    // 这一格也可能是成员名（`readonly() {}` / `private` ⏎ `m() {}`）：只有下一格确实是
    // 「被修饰的成员」时才算修饰词。判据二选一：
    // ① 与下一格之间没有换行 —— TS 的 ASI：换行（块注释里的换行也算）之后该词已收成只有名字的字段；
    // ② 下一格不是名字后才会跟的单元（`(` `<` `?` `=` `;` `!` `:` 等）。
    const modifierNext = at + 1 < code.length ? code[at + 1] : null;
    if (modifierNext === null) {
      break;
    }
    let isModifier = true;
    // 下一格本身还是修饰词时，换行不改变它（`public static` ⏎ `readonly a` 仍是一条成员）；
    // 只有「下一格是普通名字」时，换行才按 ASI 把当前词收成字段名。
    let nextIsModifierWord = false;
    if (modifierNext instanceof Common) {
      const nextWord = (modifierNext as Common).TempToString();
      nextIsModifierWord = nextWord === "readonly" || nextWord === "static" || nextWord === "private"
        || nextWord === "public" || nextWord === "protected" || nextWord === "abstract"
        || nextWord === "declare" || nextWord === "override" || nextWord === "async"
        || nextWord === "accessor" || nextWord === "get" || nextWord === "set";
    }
    if (!nextIsModifierWord && MemberBoundary.HasLineBreakBetween(code[at], modifierNext)) {
      isModifier = false;
    }
    if (isModifier && modifierNext instanceof Bracket && (modifierNext as Bracket).StartBracketChar === "(") {
      isModifier = false;
    }
    if (isModifier && modifierNext instanceof Symbol) {
      const nextText = (modifierNext as Symbol).TempToString();
      if (nextText === "<" || nextText === "?" || nextText === "?:" || nextText === "="
        || nextText === ";" || nextText === "!" || nextText === ")" || nextText === ","
        || nextText === ":") {
        isModifier = false;
      }
    }
    if (!isModifier) {
      break;
    }
    if (text === "static") {
      hasStatic = true;
    }
    if (text === "get" || text === "set") {
      // `get` / `set` 只有后面跟名字（或计算名 `[`）时才是访问器关键字；
      // `get(...)` / `get: A` 是名为 get 的方法 / 属性。
      const afterAccessor = at + 1 < code.length ? code[at + 1] : null;
      const accessorHasName = afterAccessor !== null
        && (afterAccessor instanceof Common
          || (afterAccessor instanceof Bracket && (afterAccessor as Bracket).StartBracketChar === "[")
          || (afterAccessor instanceof Symbol && (afterAccessor as Symbol).Is("#")));
      if (!accessorHasName) {
        break;
      }
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
  if (at < code.length && code[at] instanceof Symbol && (code[at] as Symbol).Is("*")) {
    const asteriskUnit = code[at];
    const asteriskPos = previousEnd + 1;
    if (asteriskUnit.SourceRange.End !== null) {
      previousEnd = asteriskUnit.SourceRange.End.Index;
    }
    at++;
    const asteriskShape = new AsteriskTokenShape(host.Template);
    asteriskShape.SignInToken(asteriskUnit);
    asteriskShape.SignOutToken(asteriskUnit);
    asteriskShape.Pos = asteriskPos;
    asteriskShape.TryToClose(context);
    asteriskToken = asteriskShape;
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
    // TS children: Decorator(s), then the non-`static` modifiers (Public/Protected/Private/Declare...),
    // then Block. The bare `static` keyword itself is not projected.
    for (const decorator of decorators) {
      staticShape.Add(decorator);
    }
    for (const modifier of modifiers) {
      if (modifier instanceof StaticKeywordShape) {
        continue;
      }
      staticShape.Add(modifier);
    }
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
  let indexSignatureParameter:Token | null = null;
  const nameUnit = code[at];
  if (nameUnit instanceof Bracket && (nameUnit as Bracket).StartBracketChar === "[") {
    // 索引签名 `[k: T]` 与计算名 `[expr]` 在同一格分派：括号内容是「名字 + `:`」时判为索引签名，
    // 复用 TypeBuilder 的索引参数口径（与 interface / 类型字面量侧同一套提取），而不是交给表达式。
    const indexCandidate = nameUnit as Bracket;
    const indexCode:Array<Token> = [];
    for (const item of indexCandidate.Data) {
      if (!item.IsTriviaToken) {
        indexCode.push(item);
      }
    }
    if (indexCode.length >= 3 && indexCode[0] instanceof Common
      && indexCode[1] instanceof Symbol && (indexCode[1] as Symbol).Is(":")) {
      const parameterBuilder = new TypeBuilder(host.Template, context);
      parameterBuilder.Load([indexCandidate], previousEnd + 1);
      indexSignatureParameter = parameterBuilder.ParseIndexParameter(indexCandidate);
    }
  }
  if (indexSignatureParameter !== null) {
    if (nameUnit.SourceRange.End !== null) {
      previousEnd = nameUnit.SourceRange.End.Index;
    }
    at++;
  } else if (nameUnit instanceof Bracket && (nameUnit as Bracket).StartBracketChar === "[") {
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
    // TS 的 ComputedPropertyName.Pos 在有修饰词时是修饰词之后（`readonly [x]`），不是成员起点。
    computed.Pos = previousEnd + 1;
    computed.TryToClose(context);
    nameShape = computed;
    if (nameUnit.SourceRange.End !== null) {
      previousEnd = nameUnit.SourceRange.End.Index;
    }
    at++;
  } else if (nameUnit instanceof Symbol && (nameUnit as Symbol).Is("#")) {
    const hashUnit = nameUnit;
    const privatePos = previousEnd + 1;
    if (hashUnit.SourceRange.End !== null) {
      previousEnd = hashUnit.SourceRange.End.Index;
    }
    at++;
    if (at >= code.length || !(code[at] instanceof Common)) {
      throw new Error("private member name is not an identifier");
    }
    const privateNameUnit = code[at];
    const privateIdentifier = new PrivateIdentifierShape(host.Template);
    privateIdentifier.SignInToken(hashUnit);
    if (privateNameUnit.SourceRange.End !== null) {
      previousEnd = privateNameUnit.SourceRange.End.Index;
    }
    privateIdentifier.SignOutToken(privateNameUnit);
    privateIdentifier.Pos = privatePos;
    privateIdentifier.TryToClose(context);
    nameShape = privateIdentifier;
    nameText = "#" + (privateNameUnit as Common).TempToString();
    at++;
  } else if (nameUnit instanceof String) {
    // 字符串字面量成员名（`"foo"(): void`）：TS 的 name 是 StringLiteral，Text 不带引号。
    const literalName = StringLiteralShape.FromBasicToken(nameUnit as String, context);
    literalName.Pos = previousEnd + 1;
    nameShape = literalName;
    nameText = literalName.Text;
    if (nameUnit.SourceRange.End !== null) {
      previousEnd = nameUnit.SourceRange.End.Index;
    }
    at++;
  } else if (nameUnit instanceof Common) {
    const namePos = previousEnd + 1;
    let nameToken:ShapeToken;
    if ((nameUnit as Common).CanStartNumber()) {
      // 数字成员名（`class A { 0 = 1 }`）：TS 的 name 是 NumericLiteral。
      nameToken = NumericLiteralShape.FromBasicToken(nameUnit as Common, context);
    } else {
      nameToken = IdentifierShape.FromBasicToken(nameUnit as Common, context);
    }
    nameToken.Pos = namePos;
    nameShape = nameToken;
    nameText = (nameUnit as Common).TempToString();
    if (nameUnit.SourceRange.End !== null) {
      previousEnd = nameUnit.SourceRange.End.Index;
    }
    at++;
  } else {
    throw new Error("类成员名字不是标识符");
  }
  if (nameShape === null && indexSignatureParameter === null) {
    throw new Error("类成员缺少名字");
  }
  // 可选方法 `m?()` / `[X.y]?<K>(...)`：`?` 后跟 `<` 或 `(` 时是 MethodDeclaration 的 QuestionToken。
  let methodQuestionToken:QuestionTokenShape | null = null;
  if (at < code.length && code[at] instanceof Symbol
    && ((code[at] as Symbol).Is("?") || (code[at] as Symbol).Is("?:"))) {
    const markUnit = code[at];
    const afterMark = at + 1 < code.length ? code[at + 1] : null;
    let optionalMethod = false;
    if (afterMark !== null) {
      if (afterMark instanceof Symbol && (afterMark as Symbol).Is("<")) {
        optionalMethod = true;
      } else if (afterMark instanceof Bracket && (afterMark as Bracket).StartBracketChar === "(") {
        // `?(` 也可能是可选属性 + 括号/函数类型（`trace?: (s: string) => void`）：
        // 只有参数表 `)` 后跟返回类型 `:` 时才是方法。
        const afterParams = at + 2 < code.length ? code[at + 2] : null;
        optionalMethod = afterParams !== null && afterParams instanceof Symbol && (afterParams as Symbol).Is(":");
      }
    }
    if (optionalMethod) {
      const markPos = previousEnd + 1;
      methodQuestionToken = new QuestionTokenShape(host.Template);
      if (markUnit.SourceRange.Start !== null) {
        methodQuestionToken.SignIn(markUnit.SourceRange.Start);
        methodQuestionToken.SignOut(markUnit.SourceRange.Start);
      }
      methodQuestionToken.Pos = markPos;
      methodQuestionToken.TryToClose(context);
      if (markUnit.SourceRange.End !== null) {
        previousEnd = markUnit.SourceRange.End.Index;
      }
      at++;
    }
  }
  // 泛型方法 `m<T>(x: T): T`：名字之后的 `<...>` 是 TypeParameter 列表（TS children 在名字与参数之间）。
  let methodTypeParameters:Array<Token> = [];
  if (at < code.length && code[at] instanceof Symbol && (code[at] as Symbol).Is("<")) {
    const angleUnit = code[at];
    const angleStart = angleUnit.SourceRange.Start === null ? 0 : angleUnit.SourceRange.Start.Index;
    const angleBuilder = new TypeBuilder(host.Template, context);
    angleBuilder.Load(code.slice(at), angleStart);
    methodTypeParameters = angleBuilder.ParseTypeParameterList();
    if (methodTypeParameters.length === 0) {
      throw new Error("类成员的泛型参数为空");
    }
    // `>>` / `>>>` 在 Load 里是虚拟拆分，按原 code 还原消费的原始单元数。
    let consumedUnits = 0;
    let mappedIndex = at;
    while (consumedUnits < angleBuilder.At && mappedIndex < code.length) {
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
    for (let cursor = at; cursor < mappedIndex; cursor++) {
      const cursorEnd = code[cursor].SourceRange.End;
      if (cursorEnd !== null) {
        previousEnd = cursorEnd.Index;
      }
    }
    at = mappedIndex;
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
      if (at >= code.length) {
        throw new Error("方法的返回类型为空");
      }
      // 贪心读返回类型，但先截到「下一个成员起点」为止，避免把下一成员的 `[计算名]` 当成索引访问。
      const typeBoundary = MemberBoundary.FindMemberBoundary(code, at);
      const typeBuilder = new TypeBuilder(host.Template, context);
      typeBuilder.Load(code.slice(at, typeBoundary), typePos);
      returnType = typeBuilder.ParseReturnType();
      // Load 把 `>>` / `>>>` 拆成虚拟单元，At 是虚拟编号：按原 code 还原消费的原始单元数。
      let consumedUnits = 0;
      let mappedIndex = at;
      while (consumedUnits < typeBuilder.At && mappedIndex < code.length) {
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
      for (let cursor = at; cursor < mappedIndex; cursor++) {
        const cursorEnd = code[cursor].SourceRange.End;
        if (cursorEnd !== null) {
          previousEnd = cursorEnd.Index;
        }
      }
      at = mappedIndex;
    }
    let body:Token | null = null;
    let bodyUnit:Token | null = null;
    let signatureEnd:Token | null = null;
    if (at < code.length && code[at] instanceof Bracket && (code[at] as Bracket).StartBracketChar === "{"
      && TypeBuilder.IsBodyBrace(code, at)) {
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
    } else if (at >= code.length || !StatementScanner.NoLineBreakBetween(code[at - 1], code[at])) {
      // 无分号的 ambient 成员（`.d.ts` 常态：`m(): void` 换行接下一个成员）：
      // 签名在换行处结束，成员区间止于最后一个代码单元（换行不进成员）。
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
    for (const decorator of decorators) {
      memberShape.Add(decorator);
    }
    for (const modifier of modifiers) {
      memberShape.Add(modifier);
    }
    if (asteriskToken !== null) {
      memberShape.Add(asteriskToken);
    }
    if (!(memberShape instanceof ConstructorShape)) {
      if (nameShape !== null) {
        memberShape.Add(nameShape);
      }
      if (methodQuestionToken !== null) {
        memberShape.Add(methodQuestionToken);
      }
      for (const typeParameter of methodTypeParameters) {
        memberShape.Add(typeParameter);
      }
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
  let questionToken:Token | null = null;
  let questionColonConsumed = false;
  if (at < code.length && code[at] instanceof Symbol && ((code[at] as Symbol).Is("?") || (code[at] as Symbol).Is("?:"))) {
    const questionUnit = code[at];
    const questionText = (questionUnit as Symbol).TempToString();
    const questionPos = previousEnd + 1;
    const questionShape = new QuestionTokenShape(host.Template);
    if (questionUnit.SourceRange.Start !== null) {
      questionShape.SignIn(questionUnit.SourceRange.Start);
      questionShape.SignOut(questionUnit.SourceRange.Start);
    }
    questionShape.Pos = questionPos;
    questionShape.TryToClose(context);
    questionToken = questionShape;
    questionColonConsumed = questionText === "?:";
    if (questionUnit.SourceRange.End !== null) {
      previousEnd = questionUnit.SourceRange.End.Index;
    }
    at++;
  }
  let exclamationToken:Token | null = null;
  if (at < code.length && code[at] instanceof Symbol && (code[at] as Symbol).Is("!")) {
    const exclamationUnit = code[at];
    const exclamationPos = previousEnd + 1;
    if (exclamationUnit.SourceRange.End !== null) {
      previousEnd = exclamationUnit.SourceRange.End.Index;
    }
    at++;
    const exclamationShape = new ExclamationTokenShape(host.Template);
    exclamationShape.SignInToken(exclamationUnit);
    exclamationShape.SignOutToken(exclamationUnit);
    exclamationShape.Pos = exclamationPos;
    exclamationShape.TryToClose(context);
    exclamationToken = exclamationShape;
  }
  if (questionColonConsumed || (at < code.length && code[at] instanceof Symbol && (code[at] as Symbol).Is(":"))) {
    let typePos = previousEnd + 1;
    if (!questionColonConsumed) {
      const colon = code[at];
      if (colon.SourceRange.End !== null) {
        previousEnd = colon.SourceRange.End.Index;
      }
      at++;
      typePos = previousEnd + 1;
    }
    if (at >= code.length) {
      throw new Error("属性的类型为空");
    }
    // 贪心读类型，但先截到「下一个成员起点」为止（理由同方法返回类型）。
    const typeBoundary = MemberBoundary.FindMemberBoundary(code, at);
    const typeBuilder = new TypeBuilder(host.Template, context);
    typeBuilder.Load(code.slice(at, typeBoundary), typePos);
    typeShape = typeBuilder.ParseType();
    // Load 把 `>>` / `>>>` 拆成虚拟单元，At 是虚拟编号：按原 code 还原消费的原始单元数。
    let consumedUnits = 0;
    let mappedIndex = at;
    while (consumedUnits < typeBuilder.At && mappedIndex < code.length) {
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
    for (let cursor = at; cursor < mappedIndex; cursor++) {
      const cursorEnd = code[cursor].SourceRange.End;
      if (cursorEnd !== null) {
        previousEnd = cursorEnd.Index;
      }
    }
    at = mappedIndex;
  }
  if (at < code.length && code[at] instanceof Symbol && (code[at] as Symbol).Is("=")) {
    const equal = code[at];
    const valuePos = equal.SourceRange.End === null ? 0 : equal.SourceRange.End.Index + 1;
    if (equal.SourceRange.End !== null) {
      previousEnd = equal.SourceRange.End.Index;
    }
    at++;
    const valueBoundary = MemberBoundary.FindMemberBoundary(code, at);
    const valueBuilder = new ExpressionBuilder(host.Template, context);
    valueBuilder.Load(code.slice(at, valueBoundary), valuePos);
    initializer = valueBuilder.ParseAssign();
    for (let cursor = at; cursor < at + valueBuilder.At; cursor++) {
      const cursorEnd = code[cursor].SourceRange.End;
      if (cursorEnd !== null) {
        previousEnd = cursorEnd.Index;
      }
    }
    at += valueBuilder.At;
  }
  let endUnit:Token = code[at - 1];
  if (at < code.length && code[at] instanceof Symbol && (code[at] as Symbol).Is(";")) {
    endUnit = code[at];
    if (endUnit.SourceRange.End !== null) {
      previousEnd = endUnit.SourceRange.End.Index;
    }
    at++;
  } else if (at < code.length && StatementScanner.NoLineBreakBetween(code[at - 1], code[at])) {
    throw new Error("类成员之间缺少分隔符");
  }
  if (indexSignatureParameter !== null) {
    // 索引签名成员的 children 顺序与 TS 一致：修饰词、Parameter、值类型；`[`…`]`、`:` 不进 Data。
    const signature = new IndexSignatureShape(host.Template);
    for (const modifier of modifiers) {
      signature.Add(modifier);
    }
    signature.Add(indexSignatureParameter);
    if (typeShape !== null) {
      signature.Add(typeShape);
    }
    signature.Parameter = indexSignatureParameter;
    signature.Type = typeShape;
    signature.MemberModifiers = modifiers;
    // 与属性同口径：尾随 `;` 存在时 TS 的 IndexSignature end 也包含它。
    signature.SignInToken(firstUnit);
    signature.SignOutToken(endUnit);
    signature.Pos = startPos;
    signature.TryToClose(context);
    members.push(signature);
    continue;
  }
  const property = new PropertyDeclarationShape(host.Template);
  for (const decorator of decorators) {
    property.Add(decorator);
  }
  for (const modifier of modifiers) {
    property.Add(modifier);
  }
  if (nameShape !== null) {
    property.Add(nameShape);
  }
  if (exclamationToken !== null) {
    property.Add(exclamationToken);
  }
  if (questionToken !== null) {
    property.Add(questionToken);
  }
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
