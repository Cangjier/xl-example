# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { DotDotDotTokenShape } from "../punctuation/dot-dot-dot-token-shape.xl.md"
import { QuestionTokenShape } from "../punctuation/question-token-shape.xl.md"
import { AnyKeywordShape } from "../keywords/any-keyword-shape.xl.md"
import { BigIntKeywordShape } from "../keywords/big-int-keyword-shape.xl.md"
import { BooleanKeywordShape } from "../keywords/boolean-keyword-shape.xl.md"
import { FalseKeywordShape } from "../keywords/false-keyword-shape.xl.md"
import { NeverKeywordShape } from "../keywords/never-keyword-shape.xl.md"
import { NullKeywordShape } from "../keywords/null-keyword-shape.xl.md"
import { NumberKeywordShape } from "../keywords/number-keyword-shape.xl.md"
import { ObjectKeywordShape } from "../keywords/object-keyword-shape.xl.md"
import { ReadonlyKeywordShape } from "../keywords/readonly-keyword-shape.xl.md"
import { StringKeywordShape } from "../keywords/string-keyword-shape.xl.md"
import { SymbolKeywordShape } from "../keywords/symbol-keyword-shape.xl.md"
import { TrueKeywordShape } from "../keywords/true-keyword-shape.xl.md"
import { UndefinedKeywordShape } from "../keywords/undefined-keyword-shape.xl.md"
import { UnknownKeywordShape } from "../keywords/unknown-keyword-shape.xl.md"
import { VoidKeywordShape } from "../keywords/void-keyword-shape.xl.md"
import { BigIntLiteralShape } from "../literals/big-int-literal-shape.xl.md"
import { NumericLiteralShape } from "../literals/numeric-literal-shape.xl.md"
import { StringLiteralShape } from "../literals/string-literal-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { ArrayTypeShape } from "./array-type-shape.xl.md"
import { CallSignatureShape } from "./call-signature-shape.xl.md"
import { ConditionalTypeShape } from "./conditional-type-shape.xl.md"
import { ConstructorTypeShape } from "./constructor-type-shape.xl.md"
import { FunctionTypeShape } from "./function-type-shape.xl.md"
import { IndexSignatureShape } from "./index-signature-shape.xl.md"
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
import { TypeLiteralShape } from "./type-literal-shape.xl.md"
import { TypeOperatorShape } from "./type-operator-shape.xl.md"
import { TypeParameterShape } from "./type-parameter-shape.xl.md"
import { TypeQueryShape } from "./type-query-shape.xl.md"
import { TypeReferenceShape } from "./type-reference-shape.xl.md"
import { UnionTypeShape } from "./union-type-shape.xl.md"
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

原子类型与前缀类型：括号家族（`( )` / `[ ]` / `{ }`）、字符串 / 数字 / 布尔 / null 字面量、
原始类型关键字、`this`、`infer`、`keyof` / `readonly` / `unique`（`TypeOperator`）、`typeof`（`TypeQuery`）、
`new (…) => R`（`ConstructorType`）、最后是类型引用（限定名 / 泛型实参）。

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
if (unit instanceof String) {
  this.At++;
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
  if (text === "new") {
    return this.ParseConstructorType(start);
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
  shape.Add(inner.ParseType());
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

对象类型：空花括号没有 children；非空时逐个解析成员（`;` / `,` 是分隔符，不进 AST）。

```ts
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
const unit = this.Peek(0);
if (unit === null) {
  throw new Error("对象类型成员意外结束");
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
    const returnType = this.ParseType();
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
const name = this.ParseName();
const next = this.Peek(0);
if (next !== null && this.IsBracket(next, "(", ")")) {
  const bracket = next as Bracket;
  this.At++;
  const parameters = this.ParseParameterList(bracket);
  const colon = this.Peek(0);
  let returnType:Token | null = null;
  if (colon !== null && this.IsText(colon, ":")) {
    this.At++;
    returnType = this.ParseType();
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

## method ParseFunctionType:(bracket:Bracket, start:int)=>Token

函数类型：参数表来自 `(`…`)` 那个括号单元，然后 `=>`（`Symbol`，不进 AST），返回类型按 `ParseType` 读（右结合）。

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
const returnType = this.ParseType();
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

## method ParseParameter:()=>Token

一个参数：`[...] 名字 [?] : 类型`。children 顺序与 TS 一致（可选 DotDotDotToken、Identifier、可选 QuestionToken、类型）。

基本 token 会把连写的 `?:` 收成一个 `Symbol`，所以 `?` 与 `?:` 都认：`?:` 时冒号已随符号消费。
rest 的 `...` 是一个 `Symbol`（`SymbolTemplate` 组合符号表里有 `...`），它进 children 成为 `DotDotDotToken`。

```ts
const paramStart = this.At;
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
实测 `typeof a` → `TypeQuery[8,17) → Identifier[15,17)`（标识符 `pos` 是 `typeof` 之后）。

调用前 `At` 已越过 `typeof`。

```ts
const operatorUnit = this.Units[start];
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
this.SpanNode(parameter, nameIndex, nameIndex);
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

`new (参数) => 返回类型`：`new` 不进 AST，children = 参数们 + 返回类型。
实测 `new () => A` 没有参数孩子；`new (a: A) => B` 的 `Parameter` 从 `(` 之后起算。
`abstract new` 暂缓（TS 侧会多一个 `FirstContextualKeyword` 修饰节点，需要单独的别名与形状）。

调用前 `At` 停在 `new` 上。

```ts
this.At++;
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
const returnType = this.ParseType();
const shape = new ConstructorTypeShape(this.Template);
shape.Parameters = parameters;
shape.ReturnType = returnType;
for (const parameter of parameters) {
  shape.Add(parameter);
}
shape.Add(returnType);
return this.SpanNode(shape, start, this.At - 1);
```
