# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { DotDotDotTokenShape } from "../punctuation/dot-dot-dot-token-shape.xl.md"
import { MinusTokenShape } from "../punctuation/minus-token-shape.xl.md"
import { PlusTokenShape } from "../punctuation/plus-token-shape.xl.md"
import { QuestionTokenShape } from "../punctuation/question-token-shape.xl.md"
import { AnyKeywordShape } from "../keywords/any-keyword-shape.xl.md"
import { BigIntKeywordShape } from "../keywords/big-int-keyword-shape.xl.md"
import { BooleanKeywordShape } from "../keywords/boolean-keyword-shape.xl.md"
import { FalseKeywordShape } from "../keywords/false-keyword-shape.xl.md"
import { NeverKeywordShape } from "../keywords/never-keyword-shape.xl.md"
import { NullKeywordShape } from "../keywords/null-keyword-shape.xl.md"
import { NumberKeywordShape } from "../keywords/number-keyword-shape.xl.md"
import { ObjectKeywordShape } from "../keywords/object-keyword-shape.xl.md"
import { AbstractKeywordShape } from "../keywords/abstract-keyword-shape.xl.md"
import { ConstKeywordShape } from "../keywords/const-keyword-shape.xl.md"
import { InKeywordShape } from "../keywords/in-keyword-shape.xl.md"
import { OutKeywordShape } from "../keywords/out-keyword-shape.xl.md"
import { AssertsKeywordShape } from "../keywords/asserts-keyword-shape.xl.md"
import { ReadonlyKeywordShape } from "../keywords/readonly-keyword-shape.xl.md"
import { StringKeywordShape } from "../keywords/string-keyword-shape.xl.md"
import { SymbolKeywordShape } from "../keywords/symbol-keyword-shape.xl.md"
import { TrueKeywordShape } from "../keywords/true-keyword-shape.xl.md"
import { UndefinedKeywordShape } from "../keywords/undefined-keyword-shape.xl.md"
import { UnknownKeywordShape } from "../keywords/unknown-keyword-shape.xl.md"
import { VoidKeywordShape } from "../keywords/void-keyword-shape.xl.md"
import { ConstString } from "../../../core/syntax/basic-tokens/string/const-string.xl.md"
import { InterpolationString } from "../../../core/syntax/basic-tokens/string/interpolation-string.xl.md"
import { BigIntLiteralShape } from "../literals/big-int-literal-shape.xl.md"
import { NoSubstitutionTemplateLiteralShape } from "../literals/no-substitution-template-literal-shape.xl.md"
import { TemplateHeadShape } from "../literals/template-head-shape.xl.md"
import { TemplateMiddleShape } from "../literals/template-middle-shape.xl.md"
import { TemplateTailShape } from "../literals/template-tail-shape.xl.md"
import { NumericLiteralShape } from "../literals/numeric-literal-shape.xl.md"
import { StringLiteralShape } from "../literals/string-literal-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { ArrayTypeShape } from "./array-type-shape.xl.md"
import { CallSignatureShape } from "./call-signature-shape.xl.md"
import { ConstructSignatureShape } from "./construct-signature-shape.xl.md"
import { ConditionalTypeShape } from "./conditional-type-shape.xl.md"
import { ConstructorTypeShape } from "./constructor-type-shape.xl.md"
import { FunctionTypeShape } from "./function-type-shape.xl.md"
import { IndexSignatureShape } from "./index-signature-shape.xl.md"
import { ImportTypeShape } from "./import-type-shape.xl.md"
import { ImportAttributeShape } from "../members/import-attribute-shape.xl.md"
import { ImportAttributesShape } from "../members/import-attributes-shape.xl.md"
import { IndexedAccessTypeShape } from "./indexed-access-type-shape.xl.md"
import { InferTypeShape } from "./infer-type-shape.xl.md"
import { IntersectionTypeShape } from "./intersection-type-shape.xl.md"
import { LiteralTypeShape } from "./literal-type-shape.xl.md"
import { MethodSignatureShape } from "./method-signature-shape.xl.md"
import { ParameterShape } from "./parameter-shape.xl.md"
import { ParenthesizedTypeShape } from "./parenthesized-type-shape.xl.md"
import { PropertySignatureShape } from "./property-signature-shape.xl.md"
import { QualifiedNameShape } from "./qualified-name-shape.xl.md"
import { ThisTypeShape } from "./this-type-shape.xl.md"
import { TupleTypeShape } from "./tuple-type-shape.xl.md"
import { RestTypeShape } from "./rest-type-shape.xl.md"
import { OptionalTypeShape } from "./optional-type-shape.xl.md"
import { NamedTupleMemberShape } from "./named-tuple-member-shape.xl.md"
import { MappedTypeShape } from "./mapped-type-shape.xl.md"
import { TemplateLiteralTypeShape } from "./template-literal-type-shape.xl.md"
import { TemplateLiteralTypeSpanShape } from "./template-literal-type-span-shape.xl.md"
import { TypeLiteralShape } from "./type-literal-shape.xl.md"
import { TypeOperatorShape } from "./type-operator-shape.xl.md"
import { TypeParameterShape } from "./type-parameter-shape.xl.md"
import { TypePredicateShape } from "./type-predicate-shape.xl.md"
import { TypeQueryShape } from "./type-query-shape.xl.md"
import { TypeReferenceShape } from "./type-reference-shape.xl.md"
import { UnionTypeShape } from "./union-type-shape.xl.md"
import { DecoratorShape } from "./decorator-shape.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
import { GetAccessorShape } from "./get-accessor-shape.xl.md"
import { SetAccessorShape } from "./set-accessor-shape.xl.md"
```

# namespace cangjie

# class TypeBuilder

类型的手写递归下降解析器。与 `ExpressionBuilder` 同一套约定：`Load` 收一段**已按 AST 顺序排好的非 trivia 单元**，
`At` 是当前下标，解析方法读完自己那一段后把 `At` 停在**下一个单元的起点**上。

调用方约定（expressions / declarations 后续消费）：

- 造：`new TypeBuilder(host.Template, context)`；
- 装：`builder.Load(units, basePos)`，`basePos` = 本段第一个单元前一个非 trivia 单元的 `End.Index + 1`
  （没有就 `0`）——与 `ExpressionBuilder.Load` 同口径，`Positions` 因此与 TS 的 `pos`（含前导 trivia）一致；
- 读：`ParseType()` 读一个完整类型（union 层）；`ParseTypeArguments()` 在 `At` 停在 `<` 上时读 `<A, B>` 并返回实参数组；
- 校验：读完后 `builder.At === builder.Units.length`，否则「类型没有读完」；
- 对齐 `ExpressionBuilder`：两者的 `Units` / `Positions` / `At` 语义完全相同，
  所以「表达式读到一半开始读类型」时，把剩下的单元原样传给新的 `TypeBuilder`、`basePos` 取
  `ExpressionBuilder.Units[ExpressionBuilder.At - 1].SourceRange.End.Index + 1` 即可；
  反之（类型里要嵌表达式，如后续 template literal type）同理用 `ExpressionBuilder.Load` 接续。

本块支持的文法（TS 口径）：

```txt
type T = A;
type T = A.B;
type T = A<B, C>;
type T = any | unknown | never | void | undefined | boolean | number | string | bigint | symbol | object | this;
type T = A | B;
type T = A & B;
type T = (A | B);
type T = A[][];
type T = [A, B];
type T = "a" | 1 | true | false | 1n | null;
type T = {};
```

## field Units:Array<Token> = []

## field Positions:Array<int> = []

## field At:int = 0

## field Template:Template

## field Context:SyntaxContext

## field MappedNameType:Token | null = null

## constructor:(template:Template, context:SyntaxContext)=>void

```ts
this.Template = template;
this.Context = context;
```

## method Load:(units:Array<Token>, basePos:int)=>void

把一段单元装进来：跳过 trivia，记下每个单元**含前导 trivia 的起点**（`Positions[i]`），`At` 归零。

`>>` / `>>>` 这种连续闭合尖括号在基本 token 层是一个 `Symbol`；这里按字符拆成若干个只含一个 `>` 的虚拟符号单元
（`Document.At` 取那个字符的 `Source`，各占一个字符区间），这样嵌套泛型实参的区间才能与 TS 对齐
（`A<B<C>>` 的内层 `TypeReference` 结束在第一个 `>`，外层结束在第二个）。

```ts
this.Units = [];
this.Positions = [];
this.At = 0;
let pos = basePos;
for (const unit of units) {
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Symbol) {
    const text = (unit as Symbol).TempToString();
    if (this.IsSplitClose(text) && unit.SourceRange.Start !== null) {
      const head = unit.SourceRange.Start;
      for (let index = 0; index < text.length; index++) {
        const pieceSource = head.Document.At(head.Index + index);
        const piece = new Symbol(unit.Template);
        piece.AppendAndSignOut(pieceSource);
        piece.SignIn(pieceSource);
        this.Units.push(piece);
        this.Positions.push(pos);
        pos = pieceSource.Index + 1;
      }
      continue;
    }
  }
  this.Units.push(unit);
  this.Positions.push(pos);
  if (unit.SourceRange.End !== null) {
    pos = unit.SourceRange.End.Index + 1;
  }
}
```

## method Peek:(offset:int)=>Token | null

```ts
const index = this.At + offset;
if (index < 0 || index >= this.Units.length) {
  return null;
}
return this.Units[index];
```

## method TextOf:(unit:Token)=>string

```ts
if (unit instanceof Common) {
  return (unit as Common).TempToString();
}
if (unit instanceof Symbol) {
  return (unit as Symbol).TempToString();
}
return "";
```

## method IsText:(unit:Token, text:string)=>bool

```ts
return this.TextOf(unit) === text;
```

## method IsBracket:(unit:Token, start:string, end:string)=>bool

```ts
if (!(unit instanceof Bracket)) {
  return false;
}
return (unit as Bracket).Is(start, end);
```

## method HasCode:(units:Array<Token>)=>bool

```ts
for (const unit of units) {
  if (!unit.IsTriviaToken) {
    return true;
  }
}
return false;
```

## method SpanLeaf:(shape:ShapeToken, index:int)=>ShapeToken

以 `Units[index]` 这一个单元给叶子签区间：`SourceRange` 取该单元的范围，`Pos` 取含前导 trivia 的 `Positions[index]`。

```ts
const unit = this.Units[index];
if (unit.SourceRange.Start !== null) {
  shape.SignIn(unit.SourceRange.Start);
}
if (unit.SourceRange.End !== null) {
  shape.SignOut(unit.SourceRange.End);
}
shape.Pos = this.Positions[index];
shape.TryToClose(this.Context);
return shape;
```

## method SpanNode:(shape:ShapeToken, first:int, last:int)=>ShapeToken

以 `Units[first..last]` 给节点签区间；子节点必须已经 `Add` 进来。

```ts
const head = this.Units[first];
const tail = this.Units[last];
if (head.SourceRange.Start !== null) {
  shape.SignIn(head.SourceRange.Start);
}
if (tail.SourceRange.End !== null) {
  shape.SignOut(tail.SourceRange.End);
}
shape.Pos = this.Positions[first];
shape.TryToClose(this.Context);
return shape;
```

## method ParseType:()=>Token

类型的最外层：**条件类型**（`A extends B ? C : D`）。`extends` / `?` / `:` 都不进 AST，
children 依次是 checkType / extendsType / trueType / falseType；trueType 与 falseType 都按 `ParseType` 读，
所以 falseType 自然右结合（`D extends E ? F : G`）。没有 `extends` 时退回 union 层。

```ts
const start = this.At;
const checkType = this.ParseUnionType();
const extendsUnit = this.Peek(0);
if (extendsUnit === null || !this.IsText(extendsUnit, "extends")) {
  return checkType;
}
this.At++;
const extendsType = this.ParseUnionType();
const questionUnit = this.Peek(0);
if (questionUnit === null || !this.IsText(questionUnit, "?")) {
  throw new Error("条件类型缺少 ?");
}
this.At++;
const trueType = this.ParseType();
const colonUnit = this.Peek(0);
if (colonUnit === null || !this.IsText(colonUnit, ":")) {
  throw new Error("条件类型缺少 :");
}
this.At++;
const falseType = this.ParseType();
const shape = new ConditionalTypeShape(this.Template);
shape.CheckType = checkType;
shape.ExtendsType = extendsType;
shape.TrueType = trueType;
shape.FalseType = falseType;
shape.Add(checkType);
shape.Add(extendsType);
shape.Add(trueType);
shape.Add(falseType);
return this.SpanNode(shape, start, this.At - 1);
```

## method ParseUnionType:()=>Token

`A | B | …`：条件类型两侧的分支各要能读 union，所以从 `ParseType` 里单独拆出一层。

```ts
const start = this.At;
const first = this.ParseIntersection();
const members:Array<Token> = [first];
while (true) {
  const unit = this.Peek(0);
  if (unit === null) {
    break;
  }
  if (!this.IsText(unit, "|")) {
    break;
  }
  this.At++;
  members.push(this.ParseIntersection());
}
if (members.length === 1) {
  return first;
}
const shape = new UnionTypeShape(this.Template);
shape.Types = members;
for (const member of members) {
  shape.Add(member);
}
return this.SpanNode(shape, start, this.At - 1);
```

## method ParseIntersection:()=>Token

`A & B`：优先级比 union 高、比数组后缀低。

```ts
const start = this.At;
const first = this.ParsePostfixType();
const members:Array<Token> = [first];
while (true) {
  const unit = this.Peek(0);
  if (unit === null) {
    break;
  }
  if (!this.IsText(unit, "&")) {
    break;
  }
  this.At++;
  members.push(this.ParsePostfixType());
}
if (members.length === 1) {
  return first;
}
const shape = new IntersectionTypeShape(this.Template);
shape.Types = members;
for (const member of members) {
  shape.Add(member);
}
return this.SpanNode(shape, start, this.At - 1);
```

## method ParsePostfixType:()=>Token

后缀两种，都在主类型之后、都靠方括号单元区分：

- **空** `[ ]` → 数组类型（可叠加 `A[][]`），区间与元素同起点、终点是 `]`，`Pos` 取元素的 `Pos`；
- **非空** `[B]` → 索引访问类型（`A[B]`、`A[B][C]`），children = 对象类型 + 索引类型；
  索引类型在里面按 `ParseType` 读（括号内容从 `[` 之后起算），`Pos` 仍取对象的 `Pos`（实测 `IndexedAccessType[8,13)`）。

```ts
let type = this.ParsePrimaryType();
while (true) {
  const unit = this.Peek(0);
  if (unit === null) {
    break;
  }
  if (!this.IsBracket(unit, "[", "]")) {
    break;
  }
  const bracket = unit as Bracket;
  this.At++;
  if (!this.HasCode(bracket.Data)) {
    const arrayShape = new ArrayTypeShape(this.Template);
    arrayShape.ElementType = type;
    arrayShape.Add(type);
    if (type.SourceRange.Start !== null) {
      arrayShape.SignIn(type.SourceRange.Start);
    }
    if (bracket.SourceRange.End !== null) {
      arrayShape.SignOut(bracket.SourceRange.End);
    }
    arrayShape.Pos = (type as ShapeToken).Pos;
    arrayShape.TryToClose(this.Context);
    type = arrayShape;
    continue;
  }
  const inner = new TypeBuilder(this.Template, this.Context);
  let base = 0;
  if (bracket.SourceRange.Start !== null) {
    base = bracket.SourceRange.Start.Index + 1;
  }
  inner.Load(bracket.Data, base);
  if (inner.Units.length === 0) {
    throw new Error("索引访问类型缺少索引");
  }
  const indexType = inner.ParseType();
  if (inner.At !== inner.Units.length) {
    throw new Error("索引访问类型的索引没有读完");
  }
  const shape = new IndexedAccessTypeShape(this.Template);
  shape.ObjectType = type;
  shape.IndexType = indexType;
  shape.Add(type);
  shape.Add(indexType);
  if (type.SourceRange.Start !== null) {
    shape.SignIn(type.SourceRange.Start);
  }
  if (bracket.SourceRange.End !== null) {
    shape.SignOut(bracket.SourceRange.End);
  }
  shape.Pos = (type as ShapeToken).Pos;
  shape.TryToClose(this.Context);
  type = shape;
}
return type;
```

## method ParsePrimaryType:()=>Token

原子类型与前缀类型：括号家族（`( )` / `[ ]` / `{ }`）、字符串 / 模板 / 数字 / 布尔 / null 字面量、
原始类型关键字、`this`、`infer`、`asserts`（类型谓词）、`keyof` / `readonly` / `unique`（`TypeOperator`）、
`typeof`（`TypeQuery`）、`new` / `abstract new`（`ConstructorType`）、`import("m").A`（`ImportType`）、
最后是类型引用（限定名 / 泛型实参）。

```ts
const start = this.At;
const unit = this.Peek(0);
if (unit === null) {
  throw new Error("类型意外结束");
}
if (unit instanceof Bracket) {
  const bracket = unit as Bracket;
  if (bracket.Is("(", ")")) {
    this.At++;
    const after = this.Peek(0);
    if (after !== null && this.IsText(after, "=>")) {
      return this.ParseFunctionType(bracket, start);
    }
    return this.ParseParenthesizedType(bracket, start);
  }
  if (bracket.Is("[", "]")) {
    this.At++;
    return this.ParseTupleType(bracket, start);
  }
  if (bracket.Is("{", "}")) {
    this.At++;
    return this.ParseTypeLiteral(bracket, start);
  }
  throw new Error("类型里出现了不支持的括号");
}
if (unit instanceof Symbol && this.IsText(unit, "<")) {
  return this.ParseGenericFunctionType(start);
}
if (unit instanceof String) {
  this.At++;
  if (this.IsTemplateToken(unit as String)) {
    return this.ParseTemplateType(unit as String, start);
  }
  return this.ParseStringLiteralType(unit as String, start);
}
if (unit instanceof Common) {
  const token = unit as Common;
  const text = token.TempToString();
  if (token.CanStartNumber()) {
    this.At++;
    return this.ParseNumericLiteralType(token, start);
  }
  if (text === "true" || text === "false" || text === "null") {
    this.At++;
    return this.ParseBooleanOrNullLiteralType(text, start);
  }
  if (text === "keyof" || text === "readonly" || text === "unique") {
    this.At++;
    const operand = this.ParsePostfixType();
    const shape = new TypeOperatorShape(this.Template);
    shape.Operand = operand;
    shape.Add(operand);
    if (unit.SourceRange.Start !== null) {
      shape.SignIn(unit.SourceRange.Start);
    }
    if (operand.SourceRange.End !== null) {
      shape.SignOut(operand.SourceRange.End);
    }
    shape.Pos = this.Positions[start];
    shape.TryToClose(this.Context);
    return shape;
  }
  if (text === "typeof") {
    this.At++;
    return this.ParseTypeQuery(start);
  }
  if (text === "infer") {
    this.At++;
    return this.ParseInferType(start);
  }
  if (text === "asserts") {
    return this.ParseTypePredicate(start);
  }
  if (text === "new" || text === "abstract") {
    return this.ParseConstructorType(start);
  }
  if (text === "import") {
    return this.ParseImportType(start);
  }
  if (text === "any") {
    this.At++;
    return this.SpanLeaf(new AnyKeywordShape(this.Template), start);
  }
  if (text === "unknown") {
    this.At++;
    return this.SpanLeaf(new UnknownKeywordShape(this.Template), start);
  }
  if (text === "never") {
    this.At++;
    return this.SpanLeaf(new NeverKeywordShape(this.Template), start);
  }
  if (text === "void") {
    this.At++;
    return this.SpanLeaf(new VoidKeywordShape(this.Template), start);
  }
  if (text === "undefined") {
    this.At++;
    return this.SpanLeaf(new UndefinedKeywordShape(this.Template), start);
  }
  if (text === "boolean") {
    this.At++;
    return this.SpanLeaf(new BooleanKeywordShape(this.Template), start);
  }
  if (text === "number") {
    this.At++;
    return this.SpanLeaf(new NumberKeywordShape(this.Template), start);
  }
  if (text === "string") {
    this.At++;
    return this.SpanLeaf(new StringKeywordShape(this.Template), start);
  }
  if (text === "bigint") {
    this.At++;
    return this.SpanLeaf(new BigIntKeywordShape(this.Template), start);
  }
  if (text === "symbol") {
    this.At++;
    return this.SpanLeaf(new SymbolKeywordShape(this.Template), start);
  }
  if (text === "object") {
    this.At++;
    return this.SpanLeaf(new ObjectKeywordShape(this.Template), start);
  }
  if (text === "this") {
    this.At++;
    const thisType = ThisTypeShape.FromBasicToken(token, this.Context);
    thisType.Pos = this.Positions[start];
    return thisType;
  }
  return this.ParseTypeReference();
}
throw new Error("不支持的类型起点");
```

## method ParseParenthesizedType:(bracket:Bracket, start:int)=>Token

`( A )`：括号里的内容交给同级的子 `TypeBuilder`，括号本身是区间端点、不进 AST。

```ts
const inner = new TypeBuilder(this.Template, this.Context);
let base = 0;
if (bracket.SourceRange.Start !== null) {
  base = bracket.SourceRange.Start.Index + 1;
}
inner.Load(bracket.Data, base);
if (inner.Units.length === 0) {
  throw new Error("括号内没有类型");
}
const type = inner.ParseType();
if (inner.At !== inner.Units.length) {
  throw new Error("括号内的类型没有读完");
}
const shape = new ParenthesizedTypeShape(this.Template);
shape.Type = type;
shape.Add(type);
if (bracket.SourceRange.Start !== null) {
  shape.SignIn(bracket.SourceRange.Start);
}
if (bracket.SourceRange.End !== null) {
  shape.SignOut(bracket.SourceRange.End);
}
shape.Pos = this.Positions[start];
shape.TryToClose(this.Context);
return shape;
```

## method ParseTupleType:(bracket:Bracket, start:int)=>Token

`[ A, B ]`：逗号不进 AST；空括号 `[ ]` 是空 tuple（没有子节点）。

```ts
const inner = new TypeBuilder(this.Template, this.Context);
let base = 0;
if (bracket.SourceRange.Start !== null) {
  base = bracket.SourceRange.Start.Index + 1;
}
inner.Load(bracket.Data, base);
const shape = new TupleTypeShape(this.Template);
while (inner.At < inner.Units.length) {
  const unit = inner.Units[inner.At];
  if (inner.IsText(unit, ",")) {
    inner.At++;
    continue;
  }
  const elementStart = inner.At;
  let restToken:Token | null = null;
  if (inner.IsText(unit, "...")) {
    restToken = inner.SpanLeaf(new DotDotDotTokenShape(inner.Template), inner.At);
    inner.At++;
  }
  const nameUnit = inner.At < inner.Units.length ? inner.Units[inner.At] : null;
  const afterName = inner.At + 1 < inner.Units.length ? inner.Units[inner.At + 1] : null;
  const afterMark = inner.At + 2 < inner.Units.length ? inner.Units[inner.At + 2] : null;
  const named = nameUnit !== null && nameUnit instanceof Common && afterName !== null
    && (inner.IsText(afterName, ":")
      || (inner.IsText(afterName, "?") && afterMark !== null && inner.IsText(afterMark, ":")));
  if (named) {
    // [name: A] / [name?: A] / [...name: A[]] -- TS children: DotDotDotToken?, Identifier, QuestionToken?, Type.
    const member = new NamedTupleMemberShape(inner.Template);
    if (restToken !== null) {
      member.Add(restToken);
    }
    member.Add(inner.ParseName());
    const questionUnit = inner.Peek(0);
    if (questionUnit !== null && inner.IsText(questionUnit, "?")) {
      member.Add(inner.SpanLeaf(new QuestionTokenShape(inner.Template), inner.At));
      inner.At++;
    }
    const colonUnit = inner.Peek(0);
    if (colonUnit === null || !inner.IsText(colonUnit, ":")) {
      throw new Error("labeled tuple member 缺少冒号");
    }
    inner.At++;
    member.Add(inner.ParseType());
    shape.Add(inner.SpanNode(member, elementStart, inner.At - 1));
    continue;
  }
  if (restToken !== null) {
    // [...A] / [...A[]] -- RestType 的 child 就是元素类型（`...` 不投影）。
    const rest = new RestTypeShape(inner.Template);
    rest.Add(inner.ParseType());
    shape.Add(inner.SpanNode(rest, elementStart, inner.At - 1));
    continue;
  }
  const elementType = inner.ParseType();
  const markUnit = inner.Peek(0);
  if (markUnit !== null && inner.IsText(markUnit, "?")) {
    // [A?] -- OptionalType 的 child 是元素类型（`?` 不投影），区间含 `?`。
    inner.At++;
    const optional = new OptionalTypeShape(inner.Template);
    optional.Add(elementType);
    shape.Add(inner.SpanNode(optional, elementStart, inner.At - 1));
    continue;
  }
  shape.Add(elementType);
}
shape.Elements = shape.Data;
if (bracket.SourceRange.Start !== null) {
  shape.SignIn(bracket.SourceRange.Start);
}
if (bracket.SourceRange.End !== null) {
  shape.SignOut(bracket.SourceRange.End);
}
shape.Pos = this.Positions[start];
shape.TryToClose(this.Context);
return shape;
```

## method ParseTypeLiteral:(bracket:Bracket, start:int)=>Token

对象类型：空花括号没有 children；非空时先判断是不是 **mapped type**（第一个成员是 `[K in …]`），
是就按 `MappedType` 建（整个花括号节点是 MappedType，不是 TypeLiteral），否则逐个解析成员签名。

```ts
if (this.HasMappedMember(bracket)) {
  return this.ParseMappedType(bracket, start);
}
const shape = new TypeLiteralShape(this.Template);
if (this.HasCode(bracket.Data)) {
  const inner = new TypeBuilder(this.Template, this.Context);
  let base = 0;
  if (bracket.SourceRange.Start !== null) {
    base = bracket.SourceRange.Start.Index + 1;
  }
  inner.Load(bracket.Data, base);
  while (inner.At < inner.Units.length) {
    const unit = inner.Units[inner.At];
    if (inner.IsText(unit, ";") || inner.IsText(unit, ",")) {
      inner.At++;
      continue;
    }
    shape.Add(inner.ParseTypeMember());
  }
  shape.Members = shape.Data;
}
if (bracket.SourceRange.Start !== null) {
  shape.SignIn(bracket.SourceRange.Start);
}
if (bracket.SourceRange.End !== null) {
  shape.SignOut(bracket.SourceRange.End);
}
shape.Pos = this.Positions[start];
shape.TryToClose(this.Context);
return shape;
```

## method ParseTypeMember:()=>Token

对象类型的一个成员：可选的 `readonly` 之后分四种形态——`(` 调用签名、`[` 索引签名、
`名字(` 方法签名、`名字[?]` 属性签名。children 顺序都按 TS。

成员区间**含它后面的 `;` / `,` 分隔符**（实测 `{ a: A; b: B }` 的 `PropertySignature` 是 `[10,16)`，
`;` 在 15，所以末尾要把分隔符吃进区间；最后一个没有分隔符的成员不含）。

```ts
const start = this.At;
const modifiers:Array<Token> = [];
while (true) {
  const unit = this.Peek(0);
  if (unit === null || !this.IsText(unit, "readonly")) {
    break;
  }
  const index = this.At;
  this.At++;
  modifiers.push(this.SpanLeaf(new ReadonlyKeywordShape(this.Template), index));
}
const abstractCandidate = this.Peek(0);
if (abstractCandidate !== null && this.IsText(abstractCandidate, "abstract")) {
  const abstractNext = this.Peek(1);
  if (abstractNext !== null && this.IsText(abstractNext, "new")) {
    const abstractIndex = this.At;
    this.At++;
    modifiers.push(this.SpanLeaf(new AbstractKeywordShape(this.Template), abstractIndex));
  }
}
const unit = this.Peek(0);
if (unit === null) {
  throw new Error("对象类型成员意外结束");
}
if (unit instanceof Common && this.IsText(unit, "new")) {
  const newNextUnit = this.Peek(1);
  const isConstructSignature = newNextUnit !== null && (this.IsText(newNextUnit, "<") || (newNextUnit instanceof Bracket && (newNextUnit as Bracket).StartBracketChar === "("));
  if (isConstructSignature) {
    const newIndex = this.At;
    if (modifiers.length > 0) {
      // TS recovery for `abstract new (...)`: MethodSignature named "new" with AbstractKeyword child.
      const newUnit = this.Peek(0) as Common;
      this.At++;
      const methodName = IdentifierShape.FromBasicToken(newUnit, this.Context);
      methodName.Pos = this.Positions[newIndex];
      const methodBracket = this.Peek(0);
      if (methodBracket === null || !(methodBracket instanceof Bracket) || !(methodBracket as Bracket).Is("(", ")")) {
        throw new Error("construct signature missing parameter list");
      }
      this.At++;
      const methodParameters = this.ParseParameterList(methodBracket as Bracket);
      const methodColon = this.Peek(0);
      if (methodColon === null || !this.IsText(methodColon, ":")) {
        throw new Error("construct signature missing return type");
      }
      this.At++;
      const methodReturnType = this.ParseType();
      const recoveryShape = new MethodSignatureShape(this.Template);
      recoveryShape.SignatureName = methodName;
      recoveryShape.Parameters = methodParameters;
      recoveryShape.ReturnType = methodReturnType;
      for (const existingModifier of modifiers) {
        recoveryShape.Add(existingModifier);
      }
      recoveryShape.Add(methodName);
      for (const methodParameter of methodParameters) {
        recoveryShape.Add(methodParameter);
      }
      recoveryShape.Add(methodReturnType);
      return this.SpanTypeMember(recoveryShape, start);
    }
    this.At++;
    let typeParameters:Array<Token> = [];
    const typeMark = this.Peek(0);
    if (typeMark !== null && this.IsText(typeMark, "<")) {
      typeParameters = this.ParseTypeParameterList();
    }
    const paramBracket = this.Peek(0);
    if (paramBracket === null || !(paramBracket instanceof Bracket) || !(paramBracket as Bracket).Is("(", ")")) {
      throw new Error("construct signature missing parameter list");
    }
    this.At++;
    const constructParameters = this.ParseParameterList(paramBracket as Bracket);
    const returnColon = this.Peek(0);
    if (returnColon === null || !this.IsText(returnColon, ":")) {
      throw new Error("construct signature missing return type");
    }
    this.At++;
    const constructReturnType = this.ParseType();
    const constructShape = new ConstructSignatureShape(this.Template);
    constructShape.TypeParameters = typeParameters;
    constructShape.Parameters = constructParameters;
    constructShape.ReturnType = constructReturnType;
    for (const typeParameter of typeParameters) {
      constructShape.Add(typeParameter);
    }
    for (const constructParameter of constructParameters) {
      constructShape.Add(constructParameter);
    }
    constructShape.Add(constructReturnType);
    return this.SpanTypeMember(constructShape, start);
  }
}
if (unit instanceof Bracket) {
  const bracket = unit as Bracket;
  if (bracket.Is("(", ")")) {
    this.At++;
    const parameters = this.ParseParameterList(bracket);
    const colon = this.Peek(0);
    if (colon === null || !this.IsText(colon, ":")) {
      throw new Error("调用签名缺少返回类型");
    }
    this.At++;
    const returnType = this.ParseReturnType();
    const shape = new CallSignatureShape(this.Template);
    shape.Parameters = parameters;
    shape.ReturnType = returnType;
    for (const parameter of parameters) {
      shape.Add(parameter);
    }
    shape.Add(returnType);
    return this.SpanTypeMember(shape, start);
  }
  if (bracket.Is("[", "]")) {
    this.At++;
    const parameter = this.ParseIndexParameter(bracket);
    const colon = this.Peek(0);
    if (colon === null || !this.IsText(colon, ":")) {
      throw new Error("索引签名缺少类型");
    }
    this.At++;
    const type = this.ParseType();
    const shape = new IndexSignatureShape(this.Template);
    shape.Parameter = parameter;
    shape.Type = type;
    shape.MemberModifiers = modifiers;
    for (const modifier of modifiers) {
      shape.Add(modifier);
    }
    shape.Add(parameter);
    shape.Add(type);
    return this.SpanTypeMember(shape, start);
  }
  throw new Error("对象类型里出现了不支持的括号");
}
if (!(unit instanceof Common)) {
  throw new Error("不支持的对象类型成员");
}
// get / set 访问器：TS 节点是 GetAccessor / SetAccessor（children = 名字 + [参数] + [返回类型]）。
const accessorText = this.TextOf(unit);
if (accessorText === "get" || accessorText === "set") {
  const accessorNameUnit = this.Peek(1);
  const accessorBracketUnit = this.Peek(2);
  if (accessorNameUnit !== null && accessorNameUnit instanceof Common
    && accessorBracketUnit !== null && accessorBracketUnit instanceof Bracket
    && (accessorBracketUnit as Bracket).Is("(", ")")) {
    this.At++;
    const accessorName = this.ParseName();
    const accessorBracket = this.Peek(0) as Bracket;
    this.At++;
    const accessorParameters = this.ParseParameterList(accessorBracket);
    let accessorReturn:Token | null = null;
    const accessorColon = this.Peek(0);
    if (accessorColon !== null && this.IsText(accessorColon, ":")) {
      this.At++;
      accessorReturn = this.ParseReturnType();
    }
    let accessor:ShapeToken;
    if (accessorText === "get") {
      accessor = new GetAccessorShape(this.Template);
    } else {
      accessor = new SetAccessorShape(this.Template);
    }
    accessor.Add(accessorName);
    for (const accessorParameter of accessorParameters) {
      accessor.Add(accessorParameter);
    }
    if (accessorReturn !== null) {
      accessor.Add(accessorReturn);
    }
    return this.SpanTypeMember(accessor, start);
  }
}
const name = this.ParseName();
let next = this.Peek(0);
// 可选方法 `m?()`：`?` 紧跟参数表（或泛型参数表）时是 MethodSignature 的 QuestionToken。
let questionToken:Token | null = null;
if (next !== null) {
  const markText = this.TextOf(next);
  if (markText === "?" || markText === "?:") {
    const afterMark = this.Peek(1);
    if (afterMark !== null
      && ((afterMark instanceof Bracket && (afterMark as Bracket).Is("(", ")")) || this.IsText(afterMark, "<"))) {
      questionToken = this.ParseOptionalMark();
      next = this.Peek(0);
    }
  }
}
// 泛型方法 `m<T>(x: T): T`：TypeParameter 们在名字之后、参数之前。
let methodTypeParameters:Array<Token> = [];
if (next !== null && this.IsText(next, "<")) {
  methodTypeParameters = this.ParseTypeParameterList();
  next = this.Peek(0);
}
if (next !== null && this.IsBracket(next, "(", ")")) {
  const bracket = next as Bracket;
  this.At++;
  const parameters = this.ParseParameterList(bracket);
  const colon = this.Peek(0);
  let returnType:Token | null = null;
  if (colon !== null && this.IsText(colon, ":")) {
    this.At++;
    returnType = this.ParseReturnType();
  }
  const shape = new MethodSignatureShape(this.Template);
  shape.SignatureName = name;
  shape.Parameters = parameters;
  shape.ReturnType = returnType;
  shape.MemberModifiers = modifiers;
  for (const modifier of modifiers) {
    shape.Add(modifier);
  }
  shape.Add(name);
  if (questionToken !== null) {
    shape.Add(questionToken);
  }
  for (const typeParameter of methodTypeParameters) {
    shape.Add(typeParameter);
  }
  for (const parameter of parameters) {
    shape.Add(parameter);
  }
  if (returnType !== null) {
    shape.Add(returnType);
  }
  return this.SpanTypeMember(shape, start);
}
const markUnit = this.Peek(0);
let question:Token | null = null;
let colonNeeded = true;
if (markUnit !== null) {
  const markText = this.TextOf(markUnit);
  if (markText === "?" || markText === "?:") {
    question = this.ParseOptionalMark();
    colonNeeded = markText === "?";
  }
}
if (colonNeeded) {
  const colon = this.Peek(0);
  if (colon === null || !this.IsText(colon, ":")) {
    throw new Error("属性签名缺少类型");
  }
  this.At++;
}
const type = this.ParseType();
const shape = new PropertySignatureShape(this.Template);
shape.SignatureName = name;
shape.QuestionToken = question;
shape.Type = type;
shape.MemberModifiers = modifiers;
for (const modifier of modifiers) {
  shape.Add(modifier);
}
shape.Add(name);
if (question !== null) {
  shape.Add(question);
}
shape.Add(type);
return this.SpanTypeMember(shape, start);
```

## method SpanTypeMember:(shape:ShapeToken, start:int)=>Token

按成员签区间，并把紧跟其后的 `;` / `,` 一并算进区间（TS 的成员节点包含自己的分隔符）。

```ts
let last = this.At - 1;
const separator = this.Peek(0);
if (separator !== null && (this.IsText(separator, ";") || this.IsText(separator, ","))) {
  last = this.At;
  this.At++;
}
return this.SpanNode(shape, start, last);
```

## method ParseOptionalMark:()=>Token | null

可选标记 `?`。注意基本 token 会把连写的 `?:` 收成一个 `Symbol`（`SymbolTemplate` 的组合符号表里有 `?:`），
所以这里同时认 `?` 与 `?:`：`?:` 时问号形状只覆盖 `?` 那一个字符（TS 的 `QuestionToken` 是 `[12,13)`），
冒号算已经被它一并消费。

```ts
const unit = this.Peek(0);
if (unit === null) {
  return null;
}
const text = this.TextOf(unit);
if (text !== "?" && text !== "?:") {
  return null;
}
const index = this.At;
this.At++;
const shape = new QuestionTokenShape(this.Template);
if (unit.SourceRange.Start !== null) {
  shape.SignIn(unit.SourceRange.Start);
  shape.SignOut(unit.SourceRange.Start);
}
shape.Pos = this.Positions[index];
shape.TryToClose(this.Context);
return shape;
```

## method ParseGenericFunctionType:(start:int)=>Token

泛型函数类型：`<const U>(x: U) => U` / `<U extends A>(x: U) => U`。`At` 停在 `<` 上；
children 顺序与 TS 一致 = 每个 `TypeParameter` → 每个 `Parameter` → 返回类型（`=>` 不进 AST）。
函数类型形状本身不新加字段，TypeParameter 直接 `Add` 进 Data（`Parameters` / `ReturnType` 仍指向参数表和返回类型）。

```ts
const typeParameters = this.ParseTypeParameterList();
const bracketUnit = this.Peek(0);
if (bracketUnit === null || !(bracketUnit instanceof Bracket) || !(bracketUnit as Bracket).Is("(", ")")) {
  throw new Error("泛型函数类型缺少参数表");
}
const bracket = bracketUnit as Bracket;
this.At++;
const parameters = this.ParseParameterList(bracket);
const arrowUnit = this.Peek(0);
if (arrowUnit === null || !this.IsText(arrowUnit, "=>")) {
  throw new Error("泛型函数类型缺少 =>");
}
this.At++;
const returnType = this.ParseReturnType();
const shape = new FunctionTypeShape(this.Template);
for (const typeParameter of typeParameters) {
  shape.Add(typeParameter);
}
for (const parameter of parameters) {
  shape.Add(parameter);
}
shape.Parameters = parameters;
shape.ReturnType = returnType;
shape.Add(returnType);
return this.SpanNode(shape, start, this.At - 1);
```

## method ParseFunctionType:(bracket:Bracket, start:int)=>Token

函数类型：参数表来自 `(`…`)` 那个括号单元，然后 `=>`，然后返回类型。
返回类型可以是**类型谓词**（`x is B` / `asserts x is B`），由 `ParseReturnType` 分流；`=>` 不进 AST。

```ts
const shape = new FunctionTypeShape(this.Template);
const parameters = this.ParseParameterList(bracket);
for (const parameter of parameters) {
  shape.Add(parameter);
}
const arrow = this.Peek(0);
if (arrow === null || !this.IsText(arrow, "=>")) {
  throw new Error("函数类型缺少 =>");
}
this.At++;
const returnType = this.ParseReturnType();
shape.Parameters = parameters;
shape.ReturnType = returnType;
shape.Add(returnType);
return this.SpanNode(shape, start, this.At - 1);
```

## method ParseParameterList:(bracket:Bracket)=>Array<Token>

参数表：括号单元里允许空表，否则 `参数 (, 参数)*`，末尾逗号忽略。

```ts
const parameters:Array<Token> = [];
const inner = new TypeBuilder(this.Template, this.Context);
let base = 0;
if (bracket.SourceRange.Start !== null) {
  base = bracket.SourceRange.Start.Index + 1;
}
inner.Load(bracket.Data, base);
while (inner.At < inner.Units.length) {
  const unit = inner.Units[inner.At];
  if (inner.IsText(unit, ",")) {
    inner.At++;
    continue;
  }
  parameters.push(inner.ParseParameter());
}
return parameters;
```

## method ParseDecorators:()=>Array<Token>

参数装饰器前缀：`@` + 表达式，复用 `DecoratorShape`（与类成员装饰器同一形态，`@` 不进 children）。
只在 `At` 停在 `@` 上时消费，否则返回空数组；表达式用 `ExpressionBuilder` 读（支持 `dec` / `dec()` / `a.b`）。

```ts
const decorators:Array<Token> = [];
while (true) {
  const unit = this.Peek(0);
  if (unit === null || !(unit instanceof Symbol) || !(unit as Symbol).Is("@")) {
    break;
  }
  const atIndex = this.At;
  const atToken = unit as Symbol;
  const decoratorPos = this.Positions[atIndex];
  this.At++;
  const expressionBase = atToken.SourceRange.End === null ? decoratorPos : atToken.SourceRange.End.Index + 1;
  const decoratorBuilder = new ExpressionBuilder(this.Template, this.Context);
  decoratorBuilder.Load(this.Units.slice(this.At), expressionBase);
  if (decoratorBuilder.Units.length === 0) {
    throw new Error("参数装饰器缺少表达式");
  }
  const expression = decoratorBuilder.ParseExpression();
  if (decoratorBuilder.At === 0) {
    throw new Error("参数装饰器的表达式没有读完");
  }
  this.At += decoratorBuilder.At;
  decorators.push(DecoratorShape.FromParts(atToken, expression, decoratorPos, this.Context));
}
return decorators;
```

## method ParseParameter:()=>Token

一个参数：`[...] 名字 [?] : 类型`。children 顺序与 TS 一致（可选 DotDotDotToken、Identifier、可选 QuestionToken、类型）。

基本 token 会把连写的 `?:` 收成一个 `Symbol`，所以 `?` 与 `?:` 都认：`?:` 时冒号已随符号消费。
rest 的 `...` 是一个 `Symbol`（`SymbolTemplate` 组合符号表里有 `...`），它进 children 成为 `DotDotDotToken`。

```ts
const paramStart = this.At;
// Parameter decorators come first in TS Parameter children (`@dec x: A`; TS parser accepts them on
// class/constructor parameters and on plain function parameters). Reuses DecoratorShape.
const decorators:Array<Token> = this.ParseDecorators();
let rest:Token | null = null;
const restUnit = this.Peek(0);
if (restUnit !== null && this.IsText(restUnit, "...")) {
  const restIndex = this.At;
  this.At++;
  rest = this.SpanLeaf(new DotDotDotTokenShape(this.Template), restIndex);
}
const name = this.ParseName();
const markUnit = this.Peek(0);
let question:Token | null = null;
let colonNeeded = true;
if (markUnit !== null) {
  const markText = this.TextOf(markUnit);
  if (markText === "?" || markText === "?:") {
    question = this.ParseOptionalMark();
    colonNeeded = markText === "?";
  }
}
if (colonNeeded) {
  const colon = this.Peek(0);
  if (colon === null || !this.IsText(colon, ":")) {
    throw new Error("参数缺少类型标注");
  }
  this.At++;
}
const type = this.ParseType();
const parameter = new ParameterShape(this.Template);
parameter.ParameterName = name;
parameter.QuestionToken = question;
parameter.Type = type;
// TS Parameter children order: Decorator(s), DotDotDotToken?, Identifier, QuestionToken?, Type.
for (const decorator of decorators) {
  parameter.Add(decorator);
}
if (rest !== null) {
  parameter.RestToken = rest;
  parameter.Add(rest);
}
parameter.Add(name);
if (question !== null) {
  parameter.Add(question);
}
parameter.Add(type);
return this.SpanNode(parameter, paramStart, this.At - 1);
```

## method ParseIndexParameter:(bracket:Bracket)=>Token

索引签名的参数：方括号单元里只有一个 `名字 : 类型`，复用 `ParseParameter` 的口径。

```ts
const inner = new TypeBuilder(this.Template, this.Context);
let base = 0;
if (bracket.SourceRange.Start !== null) {
  base = bracket.SourceRange.Start.Index + 1;
}
inner.Load(bracket.Data, base);
if (inner.Units.length === 0) {
  throw new Error("索引签名缺少参数");
}
return inner.ParseParameter();
```

## method ParseStringLiteralType:(token:String, start:int)=>Token

字符串字面量类型：里层 `StringLiteral` 的 `pos` 与 `LiteralType` 同口径、都含前导 trivia
（实测 `type T = "a";` 是 `LiteralType[8,13) → StringLiteral[8,12)`；`/* c */` 夹在中间时字面量的 `pos` 退到 `=` 之后）。

```ts
const literal = StringLiteralShape.FromBasicToken(token, this.Context);
literal.Pos = this.Positions[start];
return this.MakeLiteralType(literal, start);
```

## method ParseNumericLiteralType:(token:Common, start:int)=>Token

数字 / BigInt 字面量类型：里层的字面量 `pos` 与前导 trivia 同口径（`NumericLiteral[8,10)` for `type T = 1;` 实测）。

```ts
let literal:ShapeToken;
if (token.IsBigInt()) {
  literal = BigIntLiteralShape.FromBasicToken(token, this.Context);
} else {
  literal = NumericLiteralShape.FromBasicToken(token, this.Context);
}
literal.Pos = this.Positions[start];
return this.MakeLiteralType(literal, start);
```

## method ParseBooleanOrNullLiteralType:(text:string, start:int)=>Token

`true` / `false` / `null` 是 `LiteralType` 里挂一个关键字叶子（与 `type T = true;` 的 TS AST 一致）。

```ts
let leaf:ShapeToken;
if (text === "true") {
  leaf = this.SpanLeaf(new TrueKeywordShape(this.Template), start);
} else if (text === "false") {
  leaf = this.SpanLeaf(new FalseKeywordShape(this.Template), start);
} else {
  leaf = this.SpanLeaf(new NullKeywordShape(this.Template), start);
}
return this.MakeLiteralType(leaf, start);
```

## method MakeLiteralType:(literal:Token, index:int)=>Token

把已建好的字面量叶子包成 `LiteralType`；区间与 `Pos` 都取字面量那一个单元（含前导 trivia 的 `Positions[index]`）。

```ts
const shape = new LiteralTypeShape(this.Template);
shape.Literal = literal;
shape.Add(literal);
return this.SpanNode(shape, index, index);
```

## method ParseTypeReference:()=>Token

类型引用：`A` / `A.B` / `A.B.C` / `A<B, C>`。限定名是**左结合嵌套**的 `QualifiedNameShape`（TS 的 AST 也是嵌套：
`A.B.C` = `QualifiedName(QualifiedName(A,B),C)`）。

```ts
const start = this.At;
let typeName = this.ParseName();
while (true) {
  const unit = this.Peek(0);
  if (unit === null) {
    break;
  }
  if (!this.IsText(unit, ".")) {
    break;
  }
  this.At++;
  const right = this.ParseName();
  typeName = this.MakeQualifiedName(typeName, right);
}
const typeArguments = this.ParseTypeArguments();
const shape = new TypeReferenceShape(this.Template);
shape.TypeName = typeName;
shape.TypeArguments = typeArguments;
shape.Add(typeName);
for (const argument of typeArguments) {
  shape.Add(argument);
}
return this.SpanNode(shape, start, this.At - 1);
```

## method ParseTypeArguments:()=>Array<Token>

在 `At` 停在 `<` 上时读泛型实参：返回实参类型数组，`At` 前进到 `>` 之后。没有 `<` 时返回空数组、`At` 不动。

给 expressions / declarations 直接复用（`f<T>(a)` / `as T` / `A<B>`）；调用方先 `Peek` 判断，或直接拿返回值的长度。

```ts
const result:Array<Token> = [];
const head = this.Peek(0);
if (head === null || !this.IsText(head, "<")) {
  return result;
}
this.At++;
while (true) {
  const unit = this.Peek(0);
  if (unit === null) {
    throw new Error("泛型实参缺少 >");
  }
  if (this.IsText(unit, ">")) {
    this.At++;
    break;
  }
  if (this.IsText(unit, ",")) {
    this.At++;
    continue;
  }
  result.push(this.ParseType());
}
return result;
```

## method ParseName:()=>Token

读一个标识符叶子，`Pos` 取含前导 trivia 的起点。

```ts
const unit = this.Peek(0);
if (unit === null || !(unit instanceof Common)) {
  throw new Error("缺少标识符");
}
const index = this.At;
this.At++;
const shape = IdentifierShape.FromBasicToken(unit as Common, this.Context);
shape.Pos = this.Positions[index];
return shape;
```

## method MakeQualifiedName:(left:Token, right:Token)=>Token

把 `left` 与 `.right` 合成一个 `QualifiedName`：区间从 `left` 的起点到 `right` 的终点，`Pos` 取 `left` 的 `Pos`。

```ts
const shape = new QualifiedNameShape(this.Template);
shape.Left = left;
shape.Right = right;
shape.Add(left);
shape.Add(right);
if (left.SourceRange.Start !== null) {
  shape.SignIn(left.SourceRange.Start);
}
if (right.SourceRange.End !== null) {
  shape.SignOut(right.SourceRange.End);
}
shape.Pos = (left as ShapeToken).Pos;
shape.TryToClose(this.Context);
return shape;
```

## method IsSplitClose:(text:string)=>bool

是不是「连续闭合尖括号」：长度 ≥ 2 且每个字符都是 `>`（`>>` / `>>>`）。这种 `Symbol` 要拆成多个单元。

```ts
if (text.length < 2) {
  return false;
}
for (const item of text) {
  if (item !== ">") {
    return false;
  }
}
return true;
```

## method ParseTypeQuery:(start:int)=>Token

`typeof a` / `typeof a.b`：`typeof` 不进 AST，children 只有一个实体名（Identifier 或限定名）。

`typeof import("m")` 例外：TS 的节点**就是 `ImportType`**（没有再包一层 TypeQuery），children = `LiteralType`（模块字符串）
＋可选限定名；`typeof` / `import` / `(` / `)` / `.` 都不进 AST。所以这里直接建 `ImportTypeShape` 返回。
实测 `typeof a` → `TypeQuery[8,17) → Identifier[15,17)`（标识符 `pos` 是 `typeof` 之后）。

调用前 `At` 已越过 `typeof`。

```ts
const operatorUnit = this.Units[start];
// typeof import("m")：TS AST 是 ImportType（Argument + 可选 Qualifier），不是 TypeQuery。
const importUnit = this.Peek(0);
if (importUnit !== null && this.IsText(importUnit, "import")) {
  this.At++;
  const bracketUnit = this.Peek(0);
  if (bracketUnit === null || !this.IsBracket(bracketUnit, "(", ")")) {
    throw new Error("typeof import 缺少参数表");
  }
  const bracket = bracketUnit as Bracket;
  this.At++;
  let pathToken:String | null = null;
  for (const item of bracket.Data) {
    if (!item.IsTriviaToken && item instanceof String) {
      pathToken = item as String;
      break;
    }
  }
  if (pathToken === null) {
    throw new Error("typeof import 缺少模块字符串");
  }
  let pathPos = 0;
  if (bracket.SourceRange.Start !== null) {
    pathPos = bracket.SourceRange.Start.Index + 1;
  }
  const stringShape = StringLiteralShape.FromBasicToken(pathToken, this.Context);
  stringShape.Pos = pathPos;
  const argument = new LiteralTypeShape(this.Template);
  argument.Literal = stringShape;
  argument.Add(stringShape);
  if (pathToken.SourceRange.Start !== null) {
    argument.SignIn(pathToken.SourceRange.Start);
  }
  if (pathToken.SourceRange.End !== null) {
    argument.SignOut(pathToken.SourceRange.End);
  }
  argument.Pos = pathPos;
  argument.TryToClose(this.Context);
  const typeofAttributes = this.ParseImportTypeAttributes(bracket);
  let qualifier:Token | null = null;
  const dot = this.Peek(0);
  if (dot !== null && this.IsText(dot, ".")) {
    this.At++;
    qualifier = this.ParseEntityName();
  }
  const imported = new ImportTypeShape(this.Template);
  imported.Argument = argument;
  imported.AssertClause = typeofAttributes;
  imported.Qualifier = qualifier;
  imported.Add(argument);
  if (typeofAttributes !== null) {
    imported.Add(typeofAttributes);
  }
  if (qualifier !== null) {
    imported.Add(qualifier);
  }
  if (operatorUnit.SourceRange.Start !== null) {
    imported.SignIn(operatorUnit.SourceRange.Start);
  }
  const lastUnit = this.Units[this.At - 1];
  if (lastUnit.SourceRange.End !== null) {
    imported.SignOut(lastUnit.SourceRange.End);
  }
  imported.Pos = this.Positions[start];
  imported.TryToClose(this.Context);
  return imported;
}
const name = this.ParseEntityName();
const shape = new TypeQueryShape(this.Template);
shape.ExprName = name;
shape.Add(name);
if (operatorUnit.SourceRange.Start !== null) {
  shape.SignIn(operatorUnit.SourceRange.Start);
}
if (name.SourceRange.End !== null) {
  shape.SignOut(name.SourceRange.End);
}
shape.Pos = this.Positions[start];
shape.TryToClose(this.Context);
return shape;
```

## method ParseInferType:(start:int)=>Token

`infer U`：children 只有一个 `TypeParameter`（`infer` 不进 AST）。
实测 `(infer U)` 里：`InferType[20,27) → TypeParameter[25,27) → Identifier[25,27)`。

调用前 `At` 已越过 `infer`。

```ts
const nameIndex = this.At;
const name = this.ParseName();
const parameter = new TypeParameterShape(this.Template);
parameter.TypeParameterName = name;
parameter.Add(name);
let last = nameIndex;
// TS 4.7 constrained infer: `infer R extends A` -- the constraint type is the TypeParameter's
// second child (Identifier, Constraint); `extends` itself is not projected.
const extendsUnit = this.Peek(0);
if (extendsUnit !== null && this.IsText(extendsUnit, "extends")) {
  this.At++;
  const constraint = this.ParseType();
  parameter.Type = constraint;
  parameter.Add(constraint);
  last = this.At - 1;
}
this.SpanNode(parameter, nameIndex, last);
const shape = new InferTypeShape(this.Template);
shape.TypeParameter = parameter;
shape.Add(parameter);
return this.SpanNode(shape, start, this.At - 1);
```

## method ParseEntityName:()=>Token

`typeof` 后面的实体名：标识符，或 `a.b` 这样的限定名（左结合嵌套，复用 `MakeQualifiedName`）。

```ts
let name = this.ParseName();
while (true) {
  const unit = this.Peek(0);
  if (unit === null || !this.IsText(unit, ".")) {
    break;
  }
  this.At++;
  const right = this.ParseName();
  name = this.MakeQualifiedName(name, right);
}
return name;
```

## method ParseConstructorType:(start:int)=>Token

`new (参数) => 返回类型` 或 `abstract new (参数) => 返回类型`：`new` / `=>` 不进 AST；
`abstract` 进 children 成为 `AbstractKeyword`（TS 的反查名是别名 `FirstContextualKeyword`）。
children = 可选的抽象修饰、参数们、返回类型。实测 `new () => A` 没有参数孩子。

调用前 `At` 停在 `new` 或 `abstract` 上。

```ts
let abstractToken:Token | null = null;
const firstUnit = this.Peek(0);
if (firstUnit !== null && this.IsText(firstUnit, "abstract")) {
  const index = this.At;
  this.At++;
  abstractToken = this.SpanLeaf(new AbstractKeywordShape(this.Template), index);
}
const newUnit = this.Peek(0);
if (newUnit === null || !this.IsText(newUnit, "new")) {
  throw new Error("构造类型缺少 new");
}
this.At++;
// Generic constructor type: `new <U>(a: U) => A` -- TypeParameter[] sits before the parameter list
// (TS children: AbstractKeyword?, TypeParameter[], Parameter[], Type; `new` / `=>` are not projected).
let typeParameters:Array<Token> = [];
const angleUnit = this.Peek(0);
if (angleUnit !== null && this.IsText(angleUnit, "<")) {
  typeParameters = this.ParseTypeParameterList();
}
const bracketUnit = this.Peek(0);
if (bracketUnit === null || !this.IsBracket(bracketUnit, "(", ")")) {
  throw new Error("构造类型缺少参数表");
}
const bracket = bracketUnit as Bracket;
this.At++;
const parameters = this.ParseParameterList(bracket);
const arrowUnit = this.Peek(0);
if (arrowUnit === null || !this.IsText(arrowUnit, "=>")) {
  throw new Error("构造类型缺少 =>");
}
this.At++;
const returnType = this.ParseReturnType();
const shape = new ConstructorTypeShape(this.Template);
shape.AbstractToken = abstractToken;
shape.Parameters = parameters;
shape.ReturnType = returnType;
if (abstractToken !== null) {
  shape.Add(abstractToken);
}
for (const typeParameter of typeParameters) {
  shape.Add(typeParameter);
}
for (const parameter of parameters) {
  shape.Add(parameter);
}
shape.Add(returnType);
return this.SpanNode(shape, start, this.At - 1);
```

## method ParseReturnType:()=>Token

函数类型的返回类型：`asserts x is B`、`x is B` 走 `TypePredicate`，其余走 `ParseType`。

```ts
const unit = this.Peek(0);
if (unit !== null && unit instanceof Common) {
  const text = (unit as Common).TempToString();
  if (text === "asserts") {
    return this.ParseTypePredicate(this.At);
  }
  const next = this.Peek(1);
  if (next !== null && this.IsText(next, "is")) {
    return this.ParseTypePredicate(this.At);
  }
}
return this.ParseType();
```

## method ParseTypePredicate:(start:int)=>Token

类型谓词：`[asserts] 名字 is 类型`。`asserts` / `is` 都是节点或关键字：`asserts` 进 children 成为 `AssertsKeyword`，
`is` 不进 AST。实测 `(x: A) => x is B` 是 `TypePredicate[18,25) → [Identifier[18,20) x, TypeReference[23,25) B]`。

```ts
const firstUnit = this.Units[start];
let asserts:Token | null = null;
if (this.IsText(firstUnit, "asserts")) {
  this.At++;
  asserts = this.SpanLeaf(new AssertsKeywordShape(this.Template), start);
}
const nameUnit = this.Peek(0);
let name:Token;
if (nameUnit !== null && this.IsText(nameUnit, "this")) {
  const thisIndex = this.At;
  this.At++;
  name = this.SpanLeaf(new ThisTypeShape(this.Template), thisIndex);
} else {
  name = this.ParseName();
}
// "x is A" has IsKeyword + Type; "asserts x" has neither (TS allows the bare assertion form).
let type:Token | null = null;
const isUnit = this.Peek(0);
if (isUnit !== null && this.IsText(isUnit, "is")) {
  this.At++;
  type = this.ParseType();
}
if (type === null && asserts === null) {
  throw new Error("类型谓词缺少 is");
}
const shape = new TypePredicateShape(this.Template);
shape.AssertsToken = asserts;
shape.ParameterName = name;
shape.Type = type;
if (asserts !== null) {
  shape.Add(asserts);
}
shape.Add(name);
if (type !== null) {
  shape.Add(type);
}
return this.SpanNode(shape, start, this.At - 1);
```

## method ParseImportTypeAttributes:(bracket:Bracket)=>Token | null

`typeof import("m", { with: { type: "json" } })` / `import("m", { with: { … } }).X`：attributes 在**参数括号的 Data 里**
（`"m" , { with: { … } }`）。`with` / `assert` 之后的花括号是 TS 的 `ImportAttributes`（反查名 `AssertClause`），
children 是若干 `ImportAttribute`（反查名 `AssertEntry`，key + 字符串值）。没有 attributes 时返回 `null`。
Pos：Attributes 从 `with` 的 `End+1` 算，Attribute 从内层 `{` 或 `,` 的 `End+1` 算。

```ts
const code:Array<Token> = [];
for (const item of bracket.Data) {
  if (!item.IsTriviaToken) {
    code.push(item);
  }
}
if (code.length < 3) {
  return null;
}
if (!(code[1] instanceof Symbol) || !(code[1] as Symbol).Is(",")) {
  return null;
}
const objectUnit = code[2];
if (!(objectUnit instanceof Bracket) || (objectUnit as Bracket).StartBracketChar !== "{") {
  throw new Error("import 类型 attributes 缺少对象参数");
}
const objectBracket = objectUnit as Bracket;
let withUnit:Token | null = null;
let innerUnit:Token | null = null;
for (const item of objectBracket.Data) {
  if (item.IsTriviaToken) {
    continue;
  }
  if (withUnit === null) {
    if (item instanceof Common && (this.TextOf(item) === "with" || this.TextOf(item) === "assert")) {
      withUnit = item;
      continue;
    }
    throw new Error("import 类型 attributes 缺少 with / assert");
  }
  if (item instanceof Bracket && (item as Bracket).StartBracketChar === "{") {
    innerUnit = item;
    break;
  }
}
if (withUnit === null || innerUnit === null) {
  throw new Error("import 类型 attributes 不完整");
}
const inner = innerUnit as Bracket;
const attributes = new ImportAttributesShape(this.Template);
attributes.Token = this.TextOf(withUnit);
let attributesPos = 0;
if (withUnit.SourceRange.End !== null) {
  attributesPos = withUnit.SourceRange.End.Index + 2;
}
let group:Array<Token> = [];
let pos = inner.SourceRange.Start === null ? 0 : inner.SourceRange.Start.Index + 1;
for (const item of inner.Data) {
  if (!item.IsTriviaToken && item instanceof Symbol && (item as Symbol).Is(",")) {
    const entry = this.BuildImportTypeAttribute(group, pos);
    if (entry !== null) {
      attributes.Elements.push(entry);
    }
    group = [];
    pos = item.SourceRange.End === null ? 0 : item.SourceRange.End.Index + 1;
    continue;
  }
  group.push(item);
}
const tail = this.BuildImportTypeAttribute(group, pos);
if (tail !== null) {
  attributes.Elements.push(tail);
}
for (const entry of attributes.Elements) {
  entry.Parent = attributes;
  attributes.Data.push(entry);
}
attributes.Pos = attributesPos;
if (inner.SourceRange.Start !== null) {
  attributes.SignIn(inner.SourceRange.Start);
}
if (inner.SourceRange.End !== null) {
  attributes.SignOut(inner.SourceRange.End);
}
attributes.TryToClose(this.Context);
return attributes;
```
## method BuildImportTypeAttribute:(units:Array<Token>, pos:int)=>ImportAttributeShape | null

把 `key : "value"` 一组建成 `ImportAttribute`：children = key（Identifier / StringLiteral）+ 字符串值。

```ts
const code:Array<Token> = [];
for (const item of units) {
  if (!item.IsTriviaToken) {
    code.push(item);
  }
}
if (code.length === 0) {
  return null;
}
if (code.length < 3) {
  throw new Error("import 类型 attribute 不完整");
}
const attribute = new ImportAttributeShape(this.Template);
const keyUnit = code[0];
let key:IdentifierShape | StringLiteralShape;
if (keyUnit instanceof Common) {
  key = IdentifierShape.FromBasicToken(keyUnit as Common, this.Context);
} else if (keyUnit instanceof String) {
  key = StringLiteralShape.FromBasicToken(keyUnit as String, this.Context);
} else {
  throw new Error("import 类型 attribute 的键不是标识符或字符串");
}
key.Pos = pos;
attribute.Key = key;
attribute.Data.push(key);
key.Parent = attribute;
const valueUnit = code[2];
if (!(valueUnit instanceof String)) {
  throw new Error("import 类型 attribute 的值不是字符串");
}
const value = StringLiteralShape.FromBasicToken(valueUnit as String, this.Context);
value.Pos = code[1].SourceRange.End === null ? 0 : code[1].SourceRange.End.Index + 1;
attribute.Value = value;
attribute.Data.push(value);
value.Parent = attribute;
attribute.Pos = pos;
if (keyUnit.SourceRange.Start !== null) {
  attribute.SignIn(keyUnit.SourceRange.Start);
}
if (valueUnit.SourceRange.End !== null) {
  attribute.SignOut(valueUnit.SourceRange.End);
}
attribute.TryToClose(this.Context);
return attribute;
```

## method ParseImportType:(start:int)=>Token

`import("m").A`：`import` 与 `.` 不进 AST，children = 模块字符串（`LiteralType → StringLiteral`）、
限定名（Identifier / QualifiedName）、以及可选泛型实参。实测 `ImportType[8,22) → [LiteralType[16,19), Identifier[21,22)]`。

```ts
const importUnit = this.Units[start];
this.At++;
const bracketUnit = this.Peek(0);
if (bracketUnit === null || !this.IsBracket(bracketUnit, "(", ")")) {
  throw new Error("import 类型缺少参数表");
}
const bracket = bracketUnit as Bracket;
this.At++;
let pathToken:String | null = null;
for (const item of bracket.Data) {
  if (!item.IsTriviaToken && item instanceof String) {
    pathToken = item as String;
    break;
  }
}
if (pathToken === null) {
  throw new Error("import 类型缺少模块字符串");
}
let pathPos = 0;
if (bracket.SourceRange.Start !== null) {
  pathPos = bracket.SourceRange.Start.Index + 1;
}
const stringShape = StringLiteralShape.FromBasicToken(pathToken, this.Context);
stringShape.Pos = pathPos;
const argument = new LiteralTypeShape(this.Template);
argument.Literal = stringShape;
argument.Add(stringShape);
if (pathToken.SourceRange.Start !== null) {
  argument.SignIn(pathToken.SourceRange.Start);
}
if (pathToken.SourceRange.End !== null) {
  argument.SignOut(pathToken.SourceRange.End);
}
argument.Pos = pathPos;
argument.TryToClose(this.Context);
const attributes = this.ParseImportTypeAttributes(bracket);
const dot = this.Peek(0);
if (dot === null || !this.IsText(dot, ".")) {
  throw new Error("import 类型缺少限定名");
}
this.At++;
const qualifier = this.ParseEntityName();
const typeArguments = this.ParseTypeArguments();
const shape = new ImportTypeShape(this.Template);
shape.Argument = argument;
shape.AssertClause = attributes;
shape.Qualifier = qualifier;
shape.TypeArguments = typeArguments;
shape.Add(argument);
if (attributes !== null) {
  shape.Add(attributes);
}
shape.Add(qualifier);
for (const argumentType of typeArguments) {
  shape.Add(argumentType);
}
if (importUnit.SourceRange.Start !== null) {
  shape.SignIn(importUnit.SourceRange.Start);
}
const lastUnit = this.Units[this.At - 1];
if (lastUnit.SourceRange.End !== null) {
  shape.SignOut(lastUnit.SourceRange.End);
}
shape.Pos = this.Positions[start];
shape.TryToClose(this.Context);
return shape;
```

## method IsTemplateToken:(token:String)=>bool

是不是「引号内式内插」的模板串单元（与 `ExpressionBuilder.IsTemplateToken` 同口径）：开了内插且引号属于模板配置的
`InterpolationQuoteChars`（ts 只有反引号）。

```ts
if (!token.IsSupportInterpolation) {
  return false;
}
const config = this.Template.StringTemplate;
return config.HasInterpolationQuoteChars && config.InterpolationQuoteChars.includes(token.StringChar);
```

## method SourceAfter:(source:Source, offset:int)=>Source

同一文档里 `source` 之后第 `offset` 个位置（模板 span 的起点要用它）。

```ts
return source.Document.At(source.Index + offset);
```

## method ParseTemplateType:(token:String, start:int)=>Token

模板字面量类型：`String` 的 `Data` 里 `ConstString` / `InterpolationString` 交替。
没有 `InterpolationString` → `LiteralType → NoSubstitutionTemplateLiteral`（`` `a` `` 是字面量类型）；
有 → `TemplateLiteralType` = `TemplateHead` + 若干 `TemplateLiteralTypeSpan`（每个 span = 插值类型 + `TemplateMiddle` / `TemplateTail`）。
插值里按 `ParseType` 读（不是表达式）。区间口径与 `ExpressionBuilder.ParseTemplateToken` 相同。

```ts
const texts:Array<string> = [];
const interps:Array<Token> = [];
let current = "";
for (const part of token.Data) {
  if (part instanceof ConstString) {
    current += (part as ConstString).TempToString();
    continue;
  }
  if (part instanceof InterpolationString) {
    texts.push(current);
    current = "";
    interps.push(part);
  }
}
texts.push(current);
if (interps.length === 0) {
  const literal = NoSubstitutionTemplateLiteralShape.FromBasicToken(token, this.Context);
  literal.Pos = this.Positions[start];
  const shape = new LiteralTypeShape(this.Template);
  shape.Literal = literal;
  shape.Add(literal);
  return this.SpanNode(shape, start, start);
}
const expression = new TemplateLiteralTypeShape(this.Template);
const head = new TemplateHeadShape(this.Template);
head.Text = texts[0];
if (token.SourceRange.Start !== null) {
  head.SignIn(token.SourceRange.Start);
}
if (interps[0].SourceRange.Start !== null) {
  head.SignOut(interps[0].SourceRange.Start);
}
head.Pos = this.Positions[start];
head.TryToClose(this.Context);
expression.Add(head);
for (let index = 0; index < interps.length; index++) {
  const interp = interps[index];
  const inner = new TypeBuilder(this.Template, this.Context);
  let base = 0;
  if (interp.SourceRange.Start !== null) {
    base = interp.SourceRange.Start.Index + 1;
  }
  inner.Load(interp.Data, base);
  if (inner.Units.length === 0) {
    throw new Error("模板类型插值里没有类型");
  }
  const value = inner.ParseType();
  if (inner.At !== inner.Units.length) {
    throw new Error("模板类型插值里的类型没有读完");
  }
  let tailPos = 0;
  if (value.SourceRange.End !== null) {
    tailPos = value.SourceRange.End.Index + 1;
  } else if (interp.SourceRange.End !== null) {
    tailPos = interp.SourceRange.End.Index;
  }
  let tail:ShapeToken;
  if (index + 1 < interps.length) {
    const middle = new TemplateMiddleShape(this.Template);
    middle.Text = texts[index + 1];
    middle.Pos = tailPos;
    if (interp.SourceRange.End !== null) {
      middle.SignIn(interp.SourceRange.End);
    }
    const nextInterp = interps[index + 1];
    if (nextInterp.SourceRange.Start !== null) {
      middle.SignOut(nextInterp.SourceRange.Start);
    }
    middle.TryToClose(this.Context);
    tail = middle;
  } else {
    const lastTail = new TemplateTailShape(this.Template);
    lastTail.Text = texts[index + 1];
    lastTail.Pos = tailPos;
    if (interp.SourceRange.End !== null) {
      lastTail.SignIn(interp.SourceRange.End);
    }
    if (token.SourceRange.End !== null) {
      lastTail.SignOut(token.SourceRange.End);
    }
    lastTail.TryToClose(this.Context);
    tail = lastTail;
  }
  const span = new TemplateLiteralTypeSpanShape(this.Template);
  span.Type = value;
  span.Tail = tail;
  span.Add(value);
  span.Add(tail);
  if (interp.SourceRange.Start !== null) {
    span.SignIn(this.SourceAfter(interp.SourceRange.Start, 1));
    span.Pos = interp.SourceRange.Start.Index + 1;
  }
  if (tail.SourceRange.End !== null) {
    span.SignOut(tail.SourceRange.End);
  }
  span.TryToClose(this.Context);
  expression.Add(span);
}
if (token.SourceRange.Start !== null) {
  expression.SignIn(token.SourceRange.Start);
}
if (token.SourceRange.End !== null) {
  expression.SignOut(token.SourceRange.End);
}
expression.Pos = this.Positions[start];
expression.TryToClose(this.Context);
return expression;
```

## method HasMappedMember:(bracket:Bracket)=>bool

花括号里的第一个**成员**是「可选修饰 + 方括号、且方括号里第二个代码单元是 `in`」→ 这是 mapped type
（`{ [K in A]: B }`、`{ readonly [K in …]?: … }`、`{ -readonly [K in …]-?: … }`），否则是普通类型字面量。

```ts
const codes:Array<Token> = [];
for (const item of bracket.Data) {
  if (!item.IsTriviaToken) {
    codes.push(item);
  }
}
let index = 0;
if (codes.length > 0 && codes[0] instanceof Common && (codes[0] as Common).Is("readonly")) {
  index = 1;
} else if (codes.length > 0 && codes[0] instanceof Symbol
  && ((codes[0] as Symbol).Is("-") || (codes[0] as Symbol).Is("+"))) {
  index = 1;
  if (index < codes.length && codes[index] instanceof Common && (codes[index] as Common).Is("readonly")) {
    index++;
  }
}
if (index >= codes.length) {
  return false;
}
const first = codes[index];
if (!(first instanceof Bracket) || !(first as Bracket).Is("[", "]")) {
  return false;
}
let seenName = false;
for (const item of (first as Bracket).Data) {
  if (item.IsTriviaToken) {
    continue;
  }
  if (!seenName) {
    seenName = true;
    continue;
  }
  return item instanceof Common && (item as Common).Is("in");
}
return false;
```

## method ParseMappedType:(bracket:Bracket, start:int)=>Token

mapped type：`{ [readonly|+/-readonly] [K in 约束] [?|+?|-?] [as 名字] : 值类型 }`。
children 顺序与 TS 一致：只读修饰 token（`ReadonlyKeyword` / `MinusToken` / `PlusToken`）、`TypeParameter`、
可选标记 token（`QuestionToken` / `MinusToken` / `PlusToken`）、可选的 `as` 名字类型、值类型。

实测两点：
- `-readonly` / `+readonly` 在 TS 里只留一个 `MinusToken` / `PlusToken` 子节点（`readonly` 关键字本身不进 AST）；
  `-?` / `+?` 同理。
- 连写的 `]?:` / `]-?:` 里 `?:` 是一个 `Symbol`，可选标记 token 只覆盖 `?` 那一个字符（复用 `ParseOptionalMark`）。

```ts
const inner = new TypeBuilder(this.Template, this.Context);
let base = 0;
if (bracket.SourceRange.Start !== null) {
  base = bracket.SourceRange.Start.Index + 1;
}
inner.Load(bracket.Data, base);
let readonlyToken:Token | null = null;
const firstUnit = inner.Peek(0);
if (firstUnit !== null) {
  const firstText = inner.TextOf(firstUnit);
  if (firstText === "readonly") {
    const index = inner.At;
    inner.At++;
    readonlyToken = inner.SpanLeaf(new ReadonlyKeywordShape(this.Template), index);
  } else if (firstText === "-" || firstText === "+") {
    const index = inner.At;
    inner.At++;
    if (firstText === "-") {
      readonlyToken = inner.SpanLeaf(new MinusTokenShape(this.Template), index);
    } else {
      readonlyToken = inner.SpanLeaf(new PlusTokenShape(this.Template), index);
    }
    const afterReadonly = inner.Peek(0);
    if (afterReadonly !== null && inner.IsText(afterReadonly, "readonly")) {
      inner.At++;
    }
  }
}
const paramUnit = inner.Peek(0);
if (paramUnit === null || !inner.IsBracket(paramUnit, "[", "]")) {
  throw new Error("mapped type 缺少 [K in …]");
}
const paramBracket = paramUnit as Bracket;
inner.At++;
const parameter = inner.ParseMappedTypeParameter(paramBracket);
let questionToken:Token | null = null;
let colonNeeded = true;
const questionUnit = inner.Peek(0);
if (questionUnit !== null) {
  const questionText = inner.TextOf(questionUnit);
  if (questionText === "-" || questionText === "+") {
    const index = inner.At;
    inner.At++;
    if (questionText === "-") {
      questionToken = inner.SpanLeaf(new MinusTokenShape(this.Template), index);
    } else {
      questionToken = inner.SpanLeaf(new PlusTokenShape(this.Template), index);
    }
    const markUnit = inner.Peek(0);
    if (markUnit !== null) {
      const markText = inner.TextOf(markUnit);
      if (markText === "?") {
        inner.At++;
      } else if (markText === "?:") {
        inner.At++;
        colonNeeded = false;
      }
    }
  } else if (questionText === "?" || questionText === "?:") {
    questionToken = inner.ParseOptionalMark();
    colonNeeded = questionText === "?";
  }
}
if (colonNeeded) {
  const colon = inner.Peek(0);
  if (colon === null || !inner.IsText(colon, ":")) {
    throw new Error("mapped type 缺少冒号");
  }
  inner.At++;
}
const valueType = inner.ParseType();
while (inner.At < inner.Units.length) {
  const tailUnit = inner.Units[inner.At];
  if (inner.IsText(tailUnit, ";") || inner.IsText(tailUnit, ",")) {
    inner.At++;
    continue;
  }
  break;
}
if (inner.At !== inner.Units.length) {
  throw new Error("mapped type 没有读完");
}
const shape = new MappedTypeShape(this.Template);
shape.ReadonlyToken = readonlyToken;
shape.TypeParameter = parameter;
shape.QuestionToken = questionToken;
shape.NameType = inner.MappedNameType;
shape.Type = valueType;
if (readonlyToken !== null) {
  shape.Add(readonlyToken);
}
shape.Add(parameter);
if (questionToken !== null) {
  shape.Add(questionToken);
}
if (inner.MappedNameType !== null) {
  shape.Add(inner.MappedNameType);
}
shape.Add(valueType);
if (bracket.SourceRange.Start !== null) {
  shape.SignIn(bracket.SourceRange.Start);
}
if (bracket.SourceRange.End !== null) {
  shape.SignOut(bracket.SourceRange.End);
}
shape.Pos = this.Positions[start];
shape.TryToClose(this.Context);
return shape;
```

## method ParseMappedTypeParameter:(bracket:Bracket)=>Token

mapped type 的 `[K in 约束 as 名字]`：`TypeParameter` 的 children 是 `Identifier` + 约束类型，区间也**只到约束结束**
（`as` 后面的名字类型不属于 TypeParameter，单独挂在 MappedType 上，存进 `MappedNameType`）。

```ts
const inner = new TypeBuilder(this.Template, this.Context);
let base = 0;
if (bracket.SourceRange.Start !== null) {
  base = bracket.SourceRange.Start.Index + 1;
}
inner.Load(bracket.Data, base);
const nameIndex = inner.At;
const name = inner.ParseName();
const inUnit = inner.Peek(0);
if (inUnit === null || !inner.IsText(inUnit, "in")) {
  throw new Error("mapped type 参数缺少 in");
}
inner.At++;
const constraint = inner.ParseType();
const constraintEnd = inner.At - 1;
inner.MappedNameType = null;
const asUnit = inner.Peek(0);
if (asUnit !== null && inner.IsText(asUnit, "as")) {
  inner.At++;
  inner.MappedNameType = inner.ParseType();
}
if (inner.At !== inner.Units.length) {
  throw new Error("mapped type 参数没有读完");
}
const parameter = new TypeParameterShape(this.Template);
parameter.TypeParameterName = name;
parameter.Type = constraint;
parameter.Add(name);
parameter.Add(constraint);
this.MappedNameType = inner.MappedNameType;
return inner.SpanNode(parameter, nameIndex, constraintEnd);
```

## method ParseTypeParameterList:()=>Array<Token>

泛型参数表：`At` 停在 `<` 上时读 `<U, V, …>`，返回 `TypeParameter` 数组，`At` 推到 `>` 之后。
`>>` 已在 `Load` 里拆成两个单字符 `>`，所以嵌套泛型约束（`U extends A<B>`）的闭合也能逐个消费。

```ts
const parameters:Array<Token> = [];
const open = this.Peek(0);
if (open === null || !this.IsText(open, "<")) {
  return parameters;
}
this.At++;
while (true) {
  const unit = this.Peek(0);
  if (unit === null) {
    throw new Error("类型参数表缺少 >");
  }
  if (this.IsText(unit, ">")) {
    this.At++;
    break;
  }
  if (this.IsText(unit, ",")) {
    this.At++;
    continue;
  }
  parameters.push(this.ParseTypeParameter());
}
return parameters;
```

## method ParseTypeParameter:()=>Token

一个泛型参数：`[in] [out] [const] 名字 [extends 约束] [= 默认值]`。
children 顺序与 TS 一致：variance / const 关键字（`InKeyword` / `OutKeyword` / `ConstKeyword`）、
`Identifier`、可选约束类型、可选默认类型。`extends` / `=` 不进 AST。

实测 `type T<in out U>` 是 `TypeParameter[7,15) → [InKeyword[7,9), OutKeyword[9,13), Identifier[13,15)]`；
`type T<U extends A = B>` 是 `TypeParameter[7,22) → [Identifier[7,8), A[16,18), B[20,22)]`。

```ts
const start = this.At;
const modifiers:Array<Token> = [];
while (true) {
  const unit = this.Peek(0);
  if (unit === null) {
    break;
  }
  const text = this.TextOf(unit);
  if (text !== "in" && text !== "out" && text !== "const") {
    break;
  }
  const index = this.At;
  this.At++;
  if (text === "in") {
    modifiers.push(this.SpanLeaf(new InKeywordShape(this.Template), index));
  } else if (text === "out") {
    modifiers.push(this.SpanLeaf(new OutKeywordShape(this.Template), index));
  } else {
    modifiers.push(this.SpanLeaf(new ConstKeywordShape(this.Template), index));
  }
}
const name = this.ParseName();
let constraint:Token | null = null;
const extendsUnit = this.Peek(0);
if (extendsUnit !== null && this.IsText(extendsUnit, "extends")) {
  this.At++;
  constraint = this.ParseType();
}
let defaultValue:Token | null = null;
const equalUnit = this.Peek(0);
if (equalUnit !== null && this.IsText(equalUnit, "=")) {
  this.At++;
  defaultValue = this.ParseType();
}
const shape = new TypeParameterShape(this.Template);
shape.TypeParameterName = name;
shape.Type = constraint;
shape.DefaultType = defaultValue;
shape.VarianceTokens = modifiers;
for (const modifier of modifiers) {
  shape.Add(modifier);
}
shape.Add(name);
if (constraint !== null) {
  shape.Add(constraint);
}
if (defaultValue !== null) {
  shape.Add(defaultValue);
}
return this.SpanNode(shape, start, this.At - 1);
```
