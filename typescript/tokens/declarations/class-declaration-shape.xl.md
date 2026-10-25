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
import { DotDotDotTokenShape } from "../punctuation/dot-dot-dot-token-shape.xl.md"
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
import { BodyGuideUtil } from "./body-guide-util.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { ClassDeclarationEndPossibleShape } from "./class-declaration-end-possible-shape.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PropertyDeclarationPossibleShape } from "../types/property-declaration-possible-shape.xl.md"
import { MethodDeclarationPossibleShape } from "../types/method-declaration-possible-shape.xl.md"
import { ClassMemberCatchAllPossibleShape } from "../types/class-member-catch-all-possible-shape.xl.md"
import { SemicolonClassElementPossibleShape } from "../expressions/semicolon-class-element-possible-shape.xl.md"
import { ConstructorPossibleShape } from "../types/constructor-possible-shape.xl.md"
import { GetAccessorPossibleShape } from "../types/class-get-accessor-possible-shape.xl.md"
import { SetAccessorPossibleShape } from "../types/class-set-accessor-possible-shape.xl.md"
import { ClassStaticBlockDeclarationPossibleShape } from "../types/class-static-block-declaration-possible-shape.xl.md"
import { IndexSignaturePossibleShape } from "../types/class-index-signature-possible-shape.xl.md"
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

## field NameToken:Token | null = null

## field DeclareKeyword:Token | null = null

## field AbstractKeyword:Token | null = null

## field HeritageClauses:Array<Token> = []

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
if (!BodyGuideUtil.IsBodyBracket(this, bracket as Bracket, ["extends", "implements", ","])) {
  return;
}
const body = bracket as Bracket;
this.BodyBracket = body;
BodyGuideUtil.MountBodyGuide(body, ClassDeclarationShape.CreateBodyPossibleShapes());
this.CatalogGuide = new CatalogGuide([], new ClassDeclarationEndPossibleShape());
```

## private static field CreateBodyPossibleShapesCache:Array<PossibleShape> | null = null

## static method CreateBodyPossibleShapes:()=>Array<PossibleShape>

```ts
const cached = BodyGuideUtil.CreateShapesCache(
  ClassDeclarationShape.CreateBodyPossibleShapesCache,
  () => [
    new PropertyDeclarationPossibleShape(),
    new MethodDeclarationPossibleShape(),
    new ConstructorPossibleShape(),
    new GetAccessorPossibleShape(),
    new SetAccessorPossibleShape(),
    new ClassStaticBlockDeclarationPossibleShape(),
    new SemicolonClassElementPossibleShape(),
    new IndexSignaturePossibleShape(),
    new ClassMemberCatchAllPossibleShape(),
  ]);
ClassDeclarationShape.CreateBodyPossibleShapesCache = cached;
return cached;
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

## static method HasNoName:(units:Array<Token>, start:int, end:int)=>bool

```ts
let keyword = -1;
for (let at = start; at < end; at++) {
  const unit = units[at];
  if (unit instanceof Common && (unit as Common).Is("class")) {
    keyword = at;
    break;
  }
}
if (keyword < 0) {
  return false;
}
let next = keyword + 1;
while (next < end && units[next].IsTriviaToken) {
  next++;
}
// `next == end` 就是类体括号本身（`class {}`）：同样是没有名字。
if (next > end || next >= units.length) {
  return false;
}
const candidate = units[next];
if (candidate instanceof Bracket) {
  return true;
}
if (candidate instanceof Symbol && (candidate as Symbol).Is("<")) {
  // `class<T> …`：名字位直接是类型参数表 → TS 的无名字类恢复形。
  return true;
}
if (candidate instanceof Common) {
  const text = (candidate as Common).TempToString();
  return text === "extends" || text === "implements";
}
return false;
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
    if (end >= 0) {
      pos = end;
    }
    break;
  }
}
return ClassDeclarationShape.BuildFromCode(host, code, pos, context, allowAnonymous);
```

## static method BuildFromCode:(host:Token, code:Array<Token>, pos:int, context:SyntaxContext, allowAnonymous:bool)=>ClassDeclarationShape

```ts
const decorators:Array<Token> = [];
let decoratorEnd = pos;
let index = 0;
while (index < code.length && code[index] instanceof Symbol && (code[index] as Symbol).Is("@")) {
  const atUnit = code[index];
  const decoratorPos = decoratorEnd;
  const expressionBase = atUnit.SourceRange.End < 0 ? decoratorPos : atUnit.SourceRange.EndIndex;
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
    if (cursorEnd >= 0) {
      decoratorEnd = cursorEnd;
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
  ? (keyword.SourceRange.End < 0 ? pos : keyword.SourceRange.EndIndex)
  : (nameUnit.SourceRange.End < 0 ? 0 : nameUnit.SourceRange.EndIndex);
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
  throw new Error("类声明的类体不是花括号");
}
let name:IdentifierShape | null = null;
if (nameUnit !== null) {
  const builtName = IdentifierShape.FromBasicToken(nameUnit as Common, context);
  builtName.Pos = keyword.SourceRange.End < 0 ? pos : keyword.SourceRange.EndIndex;
  name = builtName;
}const heritageBase = heritageBasePos;
const clauses:Array<Token> = heritageUnits.length === 0
  ? []
  : HeritageClauseShape.BuildClauses(host, heritageUnits, heritageBase, context);
const members = BodyGuideUtil.CollectBodyMembers(host, bodyUnit as Bracket, context, ClassDeclarationShape.BuildMembers);
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
  if (modifierUnit.SourceRange.End >= 0) {
    modifierPos = modifierUnit.SourceRange.EndIndex;
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

## static method BuildMemberFromCode:(host:Token, code:Array<Token>, start:int, end:int, pos:int, context:SyntaxContext)=>Token | null

```ts
if (start < 0 || end < start || end >= code.length) {
  return null;
}
const span:Array<Token> = code.slice(start, end + 1);
if (span.length === 0) {
  return null;
}
const headStart = span[0].SourceRange.Start;
if (headStart < 0) {
  return null;
}
const view = new Bracket(host.Template);
view.Data = span;
if (pos > 0) {
  view.SignIn(pos - 1);
}
let members:Array<Token> = [];
try {
  members = ClassDeclarationShape.BuildMembers(host, view, context);
} catch (error) {
  return null;
}
if (members.length !== 1) {
  return null;
}
const built = members[0];
if ((built as ShapeToken).Pos !== pos) {
  return null;
}
const spanTail = span[span.length - 1].SourceRange.End;
const builtTail = built.SourceRange.End;
if (spanTail < 0 || builtTail < 0 || builtTail !== spanTail) {
  return null;
}
return built;
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

## static method CanFollowModifier:(unit:Token)=>bool

```ts
if (unit instanceof Bracket) {
  const bracketChar = (unit as Bracket).StartBracketChar;
  return bracketChar === "[" || bracketChar === "{";
}
if (unit instanceof Symbol) {
  const symbolText = (unit as Symbol).TempToString();
  return symbolText === "*" || symbolText === "..." || symbolText === "#";
}
if (unit instanceof Common) {
  return true;
}
return unit instanceof String;
```

## static method BuildParameters:(host:Token, bracket:Bracket, context:SyntaxContext)=>Array<Token>

```ts
const parameters:Array<Token> = [];
const inner = new TypeBuilder(host.Template, context);
let base = 0;
if (bracket.SourceRange.Start >= 0) {
  base = bracket.SourceRange.StartIndex + 1;
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
    // 参数属性的 rest（`constructor(private ...a: A[])`）：parseDiagnostics=0，TS children 顺序是
    // [修饰词, DotDotDotToken, Identifier, Type]。旧口径在修饰词后直接 ParseName，`...` 当名字 → 「缺少标识符」。
    const propertyRestUnit = inner.Peek(0);
    if (propertyRestUnit !== null && inner.IsText(propertyRestUnit, "...")) {
      const propertyRestIndex = inner.At;
      inner.At++;
      const propertyRest = inner.SpanLeaf(new DotDotDotTokenShape(host.Template), propertyRestIndex);
      parameter.RestToken = propertyRest;
      parameter.Add(propertyRest);
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
    // 装饰器之后也可以是解构模式（`m(@a { x }: T)`）或 rest（`m(@a ...x: A[])`）：
    // 这两种形态 TypeBuilder.ParseParameter 本来就会建，装饰器前缀上面已经吃过，这里补挂回最前。
    const decoratedHead = inner.At < inner.Units.length ? inner.Units[inner.At] : null;
    const decoratedIsPattern = decoratedHead instanceof Bracket
      && ((decoratedHead as Bracket).StartBracketChar === "{" || (decoratedHead as Bracket).StartBracketChar === "[");
    const decoratedIsRest = decoratedHead instanceof Symbol && (decoratedHead as Symbol).Is("...");
    if (decoratedIsPattern || decoratedIsRest) {
      const decoratedNameIndex = inner.At;
      const decoratedParameter = inner.ParseParameter() as ParameterShape;
      for (let i = decorators.length - 1; i >= 0; i--) {
        decorators[i].Parent = decoratedParameter;
        decoratedParameter.Data.unshift(decorators[i]);
      }
      const headDecorator = decorators[0];
      if (headDecorator.SourceRange.Start >= 0) {
        decoratedParameter.SourceRange.Start = headDecorator.SourceRange.StartIndex;
      }
      decoratedParameter.Pos = (headDecorator as ShapeToken).Pos;
      ClassDeclarationShape.TakeParameterInitializer(host, inner, decoratedParameter, context);
      if (decoratedIsPattern && decoratedParameter.ParameterName !== null) {
        // 解构模式名的 Pos 含前导 trivia：取装饰器之后那一格（最后一个装饰器的 End+1）。
        let groupPos = 0;
        if (decoratedNameIndex > 0) {
          const previousUnit = inner.Units[decoratedNameIndex - 1];
          if (previousUnit.SourceRange.End >= 0) {
            groupPos = previousUnit.SourceRange.EndIndex;
          }
        } else if (bracket.SourceRange.Start >= 0) {
          groupPos = bracket.SourceRange.StartIndex + 1;
        }
        (decoratedParameter.ParameterName as ShapeToken).Pos = groupPos;
      }
      parameters.push(decoratedParameter);
      continue;
    }
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
    // `@` 装饰的参数 TS 侧同样允许缺类型标注 / 带默认值（parseDiagnostics=0）：
    //   m(@dec p)      -> Parameter children = Decorator + Identifier
    //   m(@dec p = 1)  -> Decorator + Identifier + 默认值表达式（`=` 不进 children）
    // 原先这里强制要求 `:`（抛「装饰过的类成员参数缺少类型标注」），且完全不吃 `= 1`。
    const colonMark = inner.Peek(0);
    if (colonConsumed || (colonMark !== null && inner.IsText(colonMark, ":"))) {
      if (!colonConsumed) {
        inner.At++;
      }
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
  // 有默认值的形参（`m(a = 1)` / `constructor(a = 1)` / 对象字面量方法 `{ m(a = 1) {} }`）也必须
  // 进 ParseParameter：TS 的 Parameter 是 name + Initializer（默认值不是名字的一部分）。旧口径只认
  // `:` / `?` / 解构模式，于是 `a` 走裸标识符分支、`=` 留给下一轮 → 「类成员参数不是标识符」。
  const headIsDefault = nameIndex + 1 < inner.Units.length
    && inner.TextOf(inner.Units[nameIndex + 1]) === "=";
  let typed = false;
  if (nameIndex + 1 < inner.Units.length) {
    const next = inner.TextOf(inner.Units[nameIndex + 1]);
    if (next === "?:") {
      typed = true;
    } else if (next === "?") {
      // 同 FunctionDeclarationShape.BuildParameters：`m(a?)` / `constructor(a?)` / `set x(v?)` 的
      // `?` 是可选的 QuestionToken，不是「后面没冒号所以裸标识符」。交给 ParseParameter 一次建对。
      typed = true;
    } else if (next === ":") {
      typed = true;
    }
  }
  if (typed || headIsPattern || headIsDefault) {
    const parameter = inner.ParseParameter() as ParameterShape;
    ClassDeclarationShape.TakeParameterInitializer(host, inner, parameter, context);
    if (headIsPattern && parameter.ParameterName !== null) {
      let groupPos = 0;
      if (nameIndex > 0) {
        const previousUnit = inner.Units[nameIndex - 1];
        if (previousUnit.SourceRange.End >= 0) {
          groupPos = previousUnit.SourceRange.EndIndex;
        }
      } else if (bracket.SourceRange.Start >= 0) {
        groupPos = bracket.SourceRange.StartIndex + 1;
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

```ts
if (inner.At >= inner.Units.length || !inner.IsText(inner.Units[inner.At], "=")) {
  return;
}
const equalsUnit = inner.Units[inner.At];
let initPos = 0;
if (equalsUnit.SourceRange.End >= 0) {
  initPos = equalsUnit.SourceRange.EndIndex;
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
  if (initTail >= 0) {
    parameter.SourceRange.End = initTail;
  }
}
inner.At = initEnd;
```

## static method BuildMembers:(host:Token, bracket:Bracket, context:SyntaxContext)=>Array<Token>

```ts
const code:Array<Token> = [];
for (const item of bracket.Data) {
  if (!item.IsTriviaToken) {
    code.push(item);
  }
}
const members:Array<Token> = [];
let at = 0;
let previousEnd = bracket.SourceRange.Start < 0 ? 0 : bracket.SourceRange.StartIndex + 1;
while (at < code.length) {
  const unit = code[at];
  if (unit instanceof Symbol && (unit as Symbol).Is(";")) {
    // Bare semicolon in a class body is a SemicolonClassElement node (TS AST kind, no children).
    // Its range starts right after the previous token (leading trivia) and ends after the `;`.
    const semicolonShape = new SemicolonClassElementShape(host.Template);
    semicolonShape.SignInToken(unit);
    semicolonShape.SignOutToken(unit);
    semicolonShape.Pos = previousEnd;
    semicolonShape.TryToClose(context);
    members.push(semicolonShape);
    if (unit.SourceRange.End >= 0) {
      previousEnd = unit.SourceRange.EndIndex;
    }
    at++;
    continue;
  }
  const startPos = previousEnd;
  const firstIndex = at;
  const firstUnit = code[firstIndex];
  const decorators:Array<Token> = [];
  while (at < code.length && code[at] instanceof Symbol && (code[at] as Symbol).Is("@")) {
    const atUnit = code[at];
    const decoratorPos = previousEnd;
    const expressionBase = atUnit.SourceRange.End < 0 ? decoratorPos : atUnit.SourceRange.EndIndex;
    if (atUnit.SourceRange.End >= 0) {
      previousEnd = atUnit.SourceRange.EndIndex;
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
      if (cursorEnd >= 0) {
        previousEnd = cursorEnd;
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
    // 「被修饰的成员」时才算修饰词。判据对齐 TS 的 parseModifiers（三档）：
    //   · `static` 走 nextTokenCanFollowModifier()：只看下一格能否接名字，**不看换行**
    //     （`static` ⏎ `m() {}` 仍是一条静态方法、`static` ⏎ `readonly a` 仍在修饰词链里）；
    //   · `get` / `set` 走 canFollowGetOrSetKeyword()：同样不看换行，交下面访问器分支再核；
    //   · 其余修饰词走 nextTokenIsOnSameLineAndCanFollowModifier()：换行（块注释里的换行也算）
    //     或下一格不能接名字，当前词就按 ASI 收成只有名字的字段。
    // 旧实现把「下一格还是修饰词」当成不看换行的例外，于是 `public` ⏎ `static readonly a = 1`
    // 被并成一条成员（TS 实测是「字段 public + 静态字段 a」两条）。
    const modifierNext = at + 1 < code.length ? code[at + 1] : null;
    if (modifierNext === null) {
      break;
    }
    let isModifier = true;
    if (text === "static") {
      isModifier = ClassDeclarationShape.CanFollowModifier(modifierNext);
    } else if (text !== "get" && text !== "set") {
      isModifier = !MemberBoundary.HasLineBreakBetween(code[at], modifierNext)
        && ClassDeclarationShape.CanFollowModifier(modifierNext);
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
      if (accessorUnit.SourceRange.End >= 0) {
        previousEnd = accessorUnit.SourceRange.EndIndex;
      }
      at++;
      continue;
    }
    const modifierPos = previousEnd;
    const modifierUnit = code[at];
    if (modifierUnit.SourceRange.End >= 0) {
      previousEnd = modifierUnit.SourceRange.EndIndex;
    }
    at++;
    modifiers.push(ClassDeclarationShape.BuildModifier(host.Template, text, modifierUnit, modifierPos, context));
  }
  if (at < code.length && code[at] instanceof Symbol && (code[at] as Symbol).Is("*")) {
    const asteriskUnit = code[at];
    const asteriskPos = previousEnd;
    if (asteriskUnit.SourceRange.End >= 0) {
      previousEnd = asteriskUnit.SourceRange.EndIndex;
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
    const staticBodyPos = previousEnd;
    if (staticBody.SourceRange.End >= 0) {
      previousEnd = staticBody.SourceRange.EndIndex;
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
      parameterBuilder.Load([indexCandidate], previousEnd);
      indexSignatureParameter = parameterBuilder.ParseIndexParameter(indexCandidate);
    }
  }
  if (indexSignatureParameter !== null) {
    if (nameUnit.SourceRange.End >= 0) {
      previousEnd = nameUnit.SourceRange.EndIndex;
    }
    at++;
  } else if (nameUnit instanceof Bracket && (nameUnit as Bracket).StartBracketChar === "[") {
    const computedBracket = nameUnit as Bracket;
    const inner = new ExpressionBuilder(host.Template, context);
    let innerBase = 0;
    if (computedBracket.SourceRange.Start >= 0) {
      innerBase = computedBracket.SourceRange.StartIndex + 1;
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
    computed.Pos = previousEnd;
    computed.TryToClose(context);
    nameShape = computed;
    if (nameUnit.SourceRange.End >= 0) {
      previousEnd = nameUnit.SourceRange.EndIndex;
    }
    at++;
  } else if (nameUnit instanceof Symbol && (nameUnit as Symbol).Is("#")) {
    const hashUnit = nameUnit;
    const privatePos = previousEnd;
    if (hashUnit.SourceRange.End >= 0) {
      previousEnd = hashUnit.SourceRange.EndIndex;
    }
    at++;
    if (at >= code.length || !(code[at] instanceof Common)) {
      throw new Error("private member name is not an identifier");
    }
    const privateNameUnit = code[at];
    const privateIdentifier = new PrivateIdentifierShape(host.Template);
    privateIdentifier.SignInToken(hashUnit);
    if (privateNameUnit.SourceRange.End >= 0) {
      previousEnd = privateNameUnit.SourceRange.EndIndex;
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
    literalName.Pos = previousEnd;
    nameShape = literalName;
    nameText = literalName.Text;
    if (nameUnit.SourceRange.End >= 0) {
      previousEnd = nameUnit.SourceRange.EndIndex;
    }
    at++;
  } else if (nameUnit instanceof Common) {
    const namePos = previousEnd;
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
    if (nameUnit.SourceRange.End >= 0) {
      previousEnd = nameUnit.SourceRange.EndIndex;
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
    const markText = (markUnit as Symbol).TempToString();
    let optionalMethod = false;
    if (afterMark !== null) {
      if (afterMark instanceof Symbol && (afterMark as Symbol).Is("<")) {
        optionalMethod = true;
      } else if (afterMark instanceof Bracket && (afterMark as Bracket).StartBracketChar === "(") {
        const afterParams = at + 2 < code.length ? code[at + 2] : null;
        if (markText === "?") {
          // `?` 单独成格、下一格就是参数表：一定是可选方法（属性的类型必须先有 `:`，
          // `trace?: (s) => void` 的 `?` 后面那一格是 `:`，不会走到这里）。原来只认「参数表后跟 `:`」，
          // 于是 `a?() {}` / `a?();` / `m?()` 都掉进属性路径 → 「类成员之间缺少分隔符」crash。
          optionalMethod = true;
        } else {
          // `?:` 合并格：`(` 可能是属性类型（`trace?: (s: string) => void`），只有后跟 `:` 才是方法。
          optionalMethod = afterParams !== null && afterParams instanceof Symbol && (afterParams as Symbol).Is(":");
        }
      }
    }
    if (optionalMethod) {
      const markPos = previousEnd;
      methodQuestionToken = new QuestionTokenShape(host.Template);
      if (markUnit.SourceRange.Start >= 0) {
        methodQuestionToken.SignIn(markUnit.SourceRange.StartIndex);
        methodQuestionToken.SignOut(markUnit.SourceRange.StartIndex + 1);
      }
      methodQuestionToken.Pos = markPos;
      methodQuestionToken.TryToClose(context);
      if (markUnit.SourceRange.End >= 0) {
        previousEnd = markUnit.SourceRange.EndIndex;
      }
      at++;
    }
  }
  // 泛型方法 `m<T>(x: T): T`：名字之后的 `<...>` 是 TypeParameter 列表（TS children 在名字与参数之间）。
  let methodTypeParameters:Array<Token> = [];
  if (at < code.length && code[at] instanceof Symbol && (code[at] as Symbol).Is("<")) {
    const angleUnit = code[at];
    const angleStart = angleUnit.SourceRange.Start < 0 ? 0 : angleUnit.SourceRange.StartIndex;
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
      if (cursorEnd >= 0) {
        previousEnd = cursorEnd;
      }
    }
    at = mappedIndex;
  }
  if (at < code.length && code[at] instanceof Bracket && (code[at] as Bracket).StartBracketChar === "(") {
    const paramBracket = code[at] as Bracket;
    if (paramBracket.SourceRange.End >= 0) {
      previousEnd = paramBracket.SourceRange.EndIndex;
    }
    at++;
    const parameters = ClassDeclarationShape.BuildParameters(host, paramBracket, context);
    let returnType:Token | null = null;
    if (at < code.length && code[at] instanceof Symbol && (code[at] as Symbol).Is(":")) {
      const colon = code[at];
      const typePos = colon.SourceRange.End < 0 ? 0 : colon.SourceRange.EndIndex;
      if (colon.SourceRange.End >= 0) {
        previousEnd = colon.SourceRange.EndIndex;
      }
      at++;
      if (at >= code.length) {
        throw new Error("方法的返回类型为空");
      }
      // 贪心读返回类型，但先截到「下一个成员起点」为止，避免把下一成员的 `[计算名]` 当成索引访问。
      const typeBoundary = MemberBoundary.FindMemberBoundary(code, at);
      const typeBuilder = new TypeBuilder(host.Template, context);
      typeBuilder.LoadFrom(code, at, typeBoundary, typePos);
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
        if (cursorEnd >= 0) {
          previousEnd = cursorEnd;
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
      const bodyPos = previousEnd;
      if (bodyUnit.SourceRange.End >= 0) {
        previousEnd = bodyUnit.SourceRange.EndIndex;
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
      if (signatureEnd.SourceRange.End >= 0) {
        previousEnd = signatureEnd.SourceRange.EndIndex;
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
    const memberEnd:Token = bodyUnit !== null ? bodyUnit : (signatureEnd !== null ? signatureEnd : code[at - 1]);
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
    const questionPos = previousEnd;
    const questionShape = new QuestionTokenShape(host.Template);
    if (questionUnit.SourceRange.Start >= 0) {
      questionShape.SignIn(questionUnit.SourceRange.StartIndex);
      questionShape.SignOut(questionUnit.SourceRange.StartIndex + 1);
    }
    questionShape.Pos = questionPos;
    questionShape.TryToClose(context);
    questionToken = questionShape;
    questionColonConsumed = questionText === "?:";
    if (questionUnit.SourceRange.End >= 0) {
      previousEnd = questionUnit.SourceRange.EndIndex;
    }
    at++;
  }
  let exclamationToken:Token | null = null;
  if (at < code.length && code[at] instanceof Symbol && (code[at] as Symbol).Is("!")) {
    const exclamationUnit = code[at];
    const exclamationPos = previousEnd;
    if (exclamationUnit.SourceRange.End >= 0) {
      previousEnd = exclamationUnit.SourceRange.EndIndex;
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
    let typePos = previousEnd;
    if (!questionColonConsumed) {
      const colon = code[at];
      if (colon.SourceRange.End >= 0) {
        previousEnd = colon.SourceRange.EndIndex;
      }
      at++;
      typePos = previousEnd;
    }
    if (at >= code.length) {
      throw new Error("属性的类型为空");
    }
    // 贪心读类型，但先截到「下一个成员起点」为止（理由同方法返回类型）。
    const typeBoundary = MemberBoundary.FindMemberBoundary(code, at);
    const typeBuilder = new TypeBuilder(host.Template, context);
    typeBuilder.LoadFrom(code, at, typeBoundary, typePos);
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
      if (cursorEnd >= 0) {
        previousEnd = cursorEnd;
      }
    }
    at = mappedIndex;
  }
  if (at < code.length && code[at] instanceof Symbol && (code[at] as Symbol).Is("=")) {
    const equal = code[at];
    const valuePos = equal.SourceRange.End < 0 ? 0 : equal.SourceRange.EndIndex;
    if (equal.SourceRange.End >= 0) {
      previousEnd = equal.SourceRange.EndIndex;
    }
    at++;
    const valueBoundary = MemberBoundary.FindMemberBoundary(code, at);
    const valueBuilder = new ExpressionBuilder(host.Template, context);
    valueBuilder.Load(code.slice(at, valueBoundary), valuePos);
    initializer = valueBuilder.ParseAssign();
    for (let cursor = at; cursor < at + valueBuilder.At; cursor++) {
      const cursorEnd = code[cursor].SourceRange.End;
      if (cursorEnd >= 0) {
        previousEnd = cursorEnd;
      }
    }
    at += valueBuilder.At;
  }
  let endUnit:Token = code[at - 1];
  if (at < code.length && code[at] instanceof Symbol && (code[at] as Symbol).Is(";")) {
    endUnit = code[at];
    if (endUnit.SourceRange.End >= 0) {
      previousEnd = endUnit.SourceRange.EndIndex;
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
