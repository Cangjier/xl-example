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
import { AnyKeywordShape } from "../keywords/any-keyword-shape.xl.md"
import { BigIntKeywordShape } from "../keywords/big-int-keyword-shape.xl.md"
import { BooleanKeywordShape } from "../keywords/boolean-keyword-shape.xl.md"
import { FalseKeywordShape } from "../keywords/false-keyword-shape.xl.md"
import { NeverKeywordShape } from "../keywords/never-keyword-shape.xl.md"
import { NullKeywordShape } from "../keywords/null-keyword-shape.xl.md"
import { NumberKeywordShape } from "../keywords/number-keyword-shape.xl.md"
import { ObjectKeywordShape } from "../keywords/object-keyword-shape.xl.md"
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
import { IntersectionTypeShape } from "./intersection-type-shape.xl.md"
import { LiteralTypeShape } from "./literal-type-shape.xl.md"
import { ParenthesizedTypeShape } from "./parenthesized-type-shape.xl.md"
import { QualifiedNameShape } from "./qualified-name-shape.xl.md"
import { ThisTypeShape } from "./this-type-shape.xl.md"
import { TupleTypeShape } from "./tuple-type-shape.xl.md"
import { TypeLiteralShape } from "./type-literal-shape.xl.md"
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

```ts
this.Units = [];
this.Positions = [];
this.At = 0;
let pos = basePos;
for (const unit of units) {
  if (unit.IsTriviaToken) {
    continue;
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

类型的最外层：**union 优先级**。读 `A | B | …`，成员交给 `ParseIntersection`；只有一个成员就原样返回。

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

后缀 `[]`：只认**空**的 `[ ]` 括号单元（非空的那个是 tuple，只在主表达式位置出现）。可叠加（`A[][]`）。

区间口径：`ArrayType` 与它的元素同起点，终点是 `]`；`Pos` 取元素的 `Pos`（TS 也是这个口径）。

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
  if (this.HasCode(bracket.Data)) {
    break;
  }
  this.At++;
  const shape = new ArrayTypeShape(this.Template);
  shape.ElementType = type;
  shape.Add(type);
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

原子类型：括号家族（`( )` / `[ ]` / `{ }`）、字符串字面量、关键字体 / 字面量体、类型引用（含 `A.B` 限定名与 `A<B>` 泛型实参）。

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

`{ }`：本块只支持**空**对象类型（成员见 chunk 2）；非空时报错而不是静默错树。

```ts
if (this.HasCode(bracket.Data)) {
  throw new Error("对象类型成员暂未实现");
}
const shape = new TypeLiteralShape(this.Template);
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
