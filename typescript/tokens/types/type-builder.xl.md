# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { LineTerminator } from "../../run/line-terminator.xl.md"
import { AngleJudge } from "./angle-judge.xl.md"
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
import { PrefixUnaryExpressionShape } from "../expressions/prefix-unary-expression-shape.xl.md"
import { ObjectBindingPatternShape } from "../bindings/object-binding-pattern-shape.xl.md"
import { ArrayBindingPatternShape } from "../bindings/array-binding-pattern-shape.xl.md"
import { MemberBoundary, MemberBoundaryCache } from "./member-boundary.xl.md"
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
import { IntrinsicKeywordShape } from "../keywords/intrinsic-keyword-shape.xl.md"
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
import { ComputedPropertyNameShape } from "./computed-property-name-shape.xl.md"
import { JSDocNonNullableTypeShape } from "../jsdoc/jsdoc-non-nullable-type-shape.xl.md"
```

# namespace cangjie

# class TypeBuilder

类型的手写递归下降解析器。与 `ExpressionBuilder` 同一套约定：`Load` 收一段**已按 AST 顺序排好的非 trivia 单元**，
`At` 是当前下标，解析方法读完自己那一段后把 `At` 停在**下一个单元的起点**上。

调用方约定（expressions / declarations 后续消费）：

- 造：`new TypeBuilder(host.Template, context)`；
- 装：`builder.Load(units, basePos)`，`basePos` = 本段第一个单元前一个非 trivia 单元的 `EndIndex`
  （没有就 `0`）——与 `ExpressionBuilder.Load` 同口径，`Positions` 因此与 TS 的 `pos`（含前导 trivia）一致；
- 读：`ParseType()` 读一个完整类型（union 层）；`ParseTypeArguments()` 在 `At` 停在 `<` 上时读 `<A, B>` 并返回实参数组；
- 校验：读完后 `builder.At === builder.Units.length`，否则「类型没有读完」；
- 对齐 `ExpressionBuilder`：两者的 `Units` / `Positions` / `At` 语义完全相同，
  所以「表达式读到一半开始读类型」时，把剩下的单元原样传给新的 `TypeBuilder`、`basePos` 取
  `ExpressionBuilder.Units[ExpressionBuilder.At - 1].SourceRange.EndIndex` 即可；
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

## field SourceIndexes:Array<int> = []

## field At:int = 0

## field Template:Template

## field Context:SyntaxContext

## field MappedNameType:Token | null = null

## field InConditionalExtends:bool = false

## field TextCacheUnit:Token | null = null

## field TextCacheValue:string = ""

## field BoundaryCache:MemberBoundaryCache = new MemberBoundaryCache()

成员边界判定的记忆化宿主（`MemberBoundary.FindMemberBoundary` 的第三个参数）。

**生命周期**：一个 `TypeBuilder` 实例一份，`Load` 时归零；只对当前 `Units` 数组对象有效。
`ParseTypeBounded` / `ParseReturnTypeBounded` 把 `Units` 换成 `slice` 解析时，先保存并清空条目，
切回原数组后再恢复——切片里的 `At` 下标与外部不是同一套，不能共用条目。

## constructor:(template:Template, context:SyntaxContext)=>void

```ts
this.Template = template;
this.Context = context;
```

## method Load:(units:Array<Token>, basePos:int)=>void

把一段单元装进来：跳过 trivia，记下每个单元**含前导 trivia 的起点**（`Positions[i]`），`At` 归零。

`>>` / `>>>` 这种连续闭合尖括号在基本 token 层是一个 `Symbol`；这里按字符拆成若干个只含一个 `>` 的虚拟符号单元
（以该 `Symbol` 的 `SourceRange.StartIndex` 为底、每个字符各占一个半开区间 `[i, i+1)`），这样嵌套泛型实参的区间才能与 TS 对齐
（`A<B<C>>` 的内层 `TypeReference` 结束在第一个 `>`，外层结束在第二个）。
展开后第 `i` 格来自传入数组的哪一格记在 `SourceIndexes[i]`；`OriginalConsumed()` 用它把 `At` 折回**原单元数**。

```ts
this.Units = [];
this.Positions = [];
this.SourceIndexes = [];
this.At = 0;
this.TextCacheUnit = null;
this.TextCacheValue = "";
this.BoundaryCache.Code = null;
this.BoundaryCache.From = -1;
this.BoundaryCache.Boundary = -1;
let pos = basePos;
for (let sourceIndex = 0; sourceIndex < units.length; sourceIndex++) {
  const unit = units[sourceIndex];
  if (unit.IsTriviaToken) {
    continue;
  }
  const temp: string | undefined = (unit as Common).Temp;
  if (temp !== undefined && temp.length > 1 && temp.charCodeAt(temp.length - 1) === 62 /* > */) {
    if (unit instanceof Symbol) {
      const text = (unit as Symbol).TempToString();
      if (AngleJudge.IsSplitClose(text) && unit.SourceRange.StartIndex >= 0) {
        const head = unit.SourceRange.StartIndex;
        for (let index = 0; index < text.length; index++) {
          const pieceIndex = head + index;
          const piece = new Symbol(unit.Template);
          piece.AppendAndSignOut(text[index], pieceIndex);
          piece.SignIn(pieceIndex);
          this.Units.push(piece);
          this.Positions.push(pos);
          this.SourceIndexes.push(sourceIndex);
          pos = pieceIndex + 1;
        }
        continue;
      }
    }
  }
  this.Units.push(unit);
  this.Positions.push(pos);
  this.SourceIndexes.push(sourceIndex);
  if (unit.SourceRange.EndIndex >= 0) {
    pos = unit.SourceRange.EndIndex;
  }
}
```

## method OriginalConsumed:()=>int

`At` 数的是 `Load` **展开后**的单元（`>>` / `>>>` 拆成多格）；本方法把它折回传入数组的原单元数（含被跳过的 trivia 占位），
供调用方（如 `ExpressionBuilder.ParseFollowingType`）按本层自己的下标推进。

```ts
if (this.At <= 0) {
  return 0;
}
return this.SourceIndexes[this.At - 1] + 1;
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
if (unit === this.TextCacheUnit) {
  return this.TextCacheValue;
}
let value = "";
if (unit instanceof Common) {
  value = (unit as Common).TempToString();
} else if (unit instanceof Symbol) {
  value = (unit as Symbol).TempToString();
}
this.TextCacheUnit = unit;
this.TextCacheValue = value;
return value;
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
if (unit.SourceRange.StartIndex >= 0) {
  shape.SignIn(unit.SourceRange.StartIndex);
}
if (unit.SourceRange.EndIndex >= 0) {
  shape.SignOut(unit.SourceRange.EndIndex);
}
shape.Pos = this.Positions[index];
shape.TryToClose(this.Context);
return shape;
```

## method ParseTypeBounded:()=>Token

对象类型成员的类型是贪心的，但下一个成员的 `[计算名]` 会被误当成索引访问后缀
（`{ m(): string\n['a']: A }`）。这里把解析范围截到 `MemberBoundary.FindMemberBoundary`。

成员边界走 `BoundaryCache` 记忆化：同一段 `Units` 上 `At` 只会变大，已经算过的边界直接复用；
切出 `[startAt, boundary)` 切片解析时，切片的下标是另一套，条目先保存并清零，回到原数组再恢复。

```ts
const boundary = MemberBoundary.FindMemberBoundary(this.Units, this.At, this.BoundaryCache);
if (boundary >= this.Units.length) {
  return this.ParseType();
}
const savedUnits = this.Units;
const savedPositions = this.Positions;
const savedCacheCode = this.BoundaryCache.Code;
const savedCacheFrom = this.BoundaryCache.From;
const savedCacheBoundary = this.BoundaryCache.Boundary;
const startAt = this.At;
this.Units = savedUnits.slice(startAt, boundary);
this.Positions = savedPositions.slice(startAt, boundary);
this.BoundaryCache.Code = null;
this.BoundaryCache.From = -1;
this.BoundaryCache.Boundary = -1;
this.At = 0;
const parsed = this.ParseType();
const consumed = this.At;
this.Units = savedUnits;
this.Positions = savedPositions;
this.At = startAt + consumed;
this.BoundaryCache.Code = savedCacheCode;
this.BoundaryCache.From = savedCacheFrom;
this.BoundaryCache.Boundary = savedCacheBoundary;
return parsed;
```

## method ParseReturnTypeBounded:()=>Token

`ParseTypeBounded` 的返回类型版本（含类型谓词分流）；同样走 `BoundaryCache` 记忆化，切片期间条目保存并清零。

```ts
const boundary = MemberBoundary.FindMemberBoundary(this.Units, this.At, this.BoundaryCache);
if (boundary >= this.Units.length) {
  return this.ParseReturnType();
}
const savedUnits = this.Units;
const savedPositions = this.Positions;
const savedCacheCode = this.BoundaryCache.Code;
const savedCacheFrom = this.BoundaryCache.From;
const savedCacheBoundary = this.BoundaryCache.Boundary;
const startAt = this.At;
this.Units = savedUnits.slice(startAt, boundary);
this.Positions = savedPositions.slice(startAt, boundary);
this.BoundaryCache.Code = null;
this.BoundaryCache.From = -1;
this.BoundaryCache.Boundary = -1;
this.At = 0;
const parsed = this.ParseReturnType();
const consumed = this.At;
this.Units = savedUnits;
this.Positions = savedPositions;
this.At = startAt + consumed;
this.BoundaryCache.Code = savedCacheCode;
this.BoundaryCache.From = savedCacheFrom;
this.BoundaryCache.Boundary = savedCacheBoundary;
return parsed;
```

## method SpanNode:(shape:ShapeToken, first:int, last:int)=>ShapeToken

以 `Units[first..last]` 给节点签区间；子节点必须已经 `Add` 进来。

```ts
const head = this.Units[first];
const tail = this.Units[last];
if (head.SourceRange.StartIndex >= 0) {
  shape.SignIn(head.SourceRange.StartIndex);
}
if (tail.SourceRange.EndIndex >= 0) {
  shape.SignOut(tail.SourceRange.EndIndex);
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
this.InConditionalExtends = true;
const extendsType = this.ParseUnionType();
this.InConditionalExtends = false;
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
TS 允许**前导** `|`（`type T = | A | B`），而且单成员也仍是 `UnionType`：只要见过前导 `|` 就包一层。

```ts
const start = this.At;
let hasLeading = false;
const leadingUnit = this.Peek(0);
if (leadingUnit !== null && this.IsText(leadingUnit, "|")) {
  hasLeading = true;
  this.At++;
}
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
if (members.length === 1 && !hasLeading) {
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

`A & B`：优先级比 union 高、比数组后缀低。同 union，TS 允许**前导** `&`，单成员仍包一层 `IntersectionType`。

```ts
const start = this.At;
let hasLeading = false;
const leadingUnit = this.Peek(0);
if (leadingUnit !== null && this.IsText(leadingUnit, "&")) {
  hasLeading = true;
  this.At++;
}
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
if (members.length === 1 && !hasLeading) {
  return first;
}
const shape = new IntersectionTypeShape(this.Template);
shape.Types = members;
for (const member of members) {
  shape.Add(member);
}
return this.SpanNode(shape, start, this.At - 1);
```

## static method IsBodyBrace:(units:Array<Token>, braceIndex:int)=>bool

越过 `:` 之后，判断一个 `{…}` 括号单元是**函数体**还是**返回类型里的对象字面量**（或类型的一部分）。
判据只看前一个代码单元：类型内部还等着操作数的位置（`:` / `|` / `&` / `<` / `,` / `=` / `=>` / `?` / `-` / `+`，
以及 `extends` / `keyof` / `typeof` / `infer` / `new` / `abstract` / `readonly` / `unique` / `is` / `asserts` /
`in` / `of` / `as` / `satisfies`）后面出现的 `{` 是类型；其余（前一个单元能收住一个类型）时是函数体。

```ts
let previous = braceIndex - 1;
while (previous >= 0 && units[previous].IsTriviaToken) {
  previous--;
}
if (previous < 0) {
  return true;
}
const unit = units[previous];
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  if (text === ":" || text === "|" || text === "&" || text === "<" || text === ","
    || text === "=" || text === "=>" || text === "?" || text === "-" || text === "+") {
    return false;
  }
  return true;
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  if (text === "extends" || text === "keyof" || text === "readonly" || text === "unique"
    || text === "typeof" || text === "infer" || text === "new" || text === "abstract"
    || text === "asserts" || text === "is" || text === "in" || text === "of"
    || text === "as" || text === "satisfies") {
    return false;
  }
  return true;
}
return true;
```

## method HasLineBreakBeforeCurrent:()=>bool

当前单元与上一个 code 单元之间是否隔着换行（TS 的 `parsePostfixTypeOrHigher` 只在**同一行**吃 `[`，
`parseTypeArgumentsOfTypeReference` 也要求 `<` 与类型名同一行）。行终止符口径交给 `LineTerminator`
（LF / CR / U+2028 / U+2029，cover8-A；CRLF 算一次）：本方法以前只认 `"\n"`，CR / LS / PS 会被当成
「同一行」而把下一行的 `<` / `[` 吞进类型。

```ts
const current = this.Peek(0);
if (current === null) {
  return false;
}
let previousIndex = this.At - 1;
while (previousIndex >= 0 && this.Units[previousIndex].IsTriviaToken) {
  previousIndex--;
}
if (previousIndex < 0) {
  return false;
}
// token 的 SourceRange 只带下标：扫描用的文档取单元自己的，没有就退回驱动层的当前文档。
const document = current.SourceRange.Document !== null
  ? current.SourceRange.Document
  : this.Context.CurrentDocument;
if (document === null) {
  return false;
}
const previousEnd = this.Units[previousIndex].SourceRange.EndIndex;
const currentStart = current.SourceRange.StartIndex;
if (previousEnd < 0 || currentStart < 0) {
  return false;
}
const whole = SourceRange.Whole(document);
for (let at = previousEnd; at < currentStart; at++) {
  if (LineTerminator.IsLineTerminator(whole.At(at))) {
    return true;
  }
}
return false;
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
  if (this.IsText(unit, "!")) {
    // JSDocNonNullableType：`!` 是类型后缀（TS 6 仍产出该 kind），包一层形状，`!` 不进 children。
    const bang = unit;
    this.At++;
    const nonNullable = new JSDocNonNullableTypeShape(this.Template);
    nonNullable.Add(type);
    if (type.SourceRange.StartIndex >= 0) {
      nonNullable.SignIn(type.SourceRange.StartIndex);
    }
    if (bang.SourceRange.EndIndex >= 0) {
      nonNullable.SignOut(bang.SourceRange.EndIndex);
    }
    nonNullable.Pos = (type as ShapeToken).Pos;
    nonNullable.TryToClose(this.Context);
    type = nonNullable;
    continue;
  }
  if (!this.IsBracket(unit, "[", "]")) {
    break;
  }
  if (this.HasLineBreakBeforeCurrent()) {
    // TS 的 parsePostfixTypeOrHigher 只在同一行吃 `[`；换行后的方括号不是下标访问（映射类型值之后那条成员）。
    break;
  }
  const bracket = unit as Bracket;
  this.At++;
  if (!this.HasCode(bracket.Data)) {
    const arrayShape = new ArrayTypeShape(this.Template);
    arrayShape.ElementType = type;
    arrayShape.Add(type);
    if (type.SourceRange.StartIndex >= 0) {
      arrayShape.SignIn(type.SourceRange.StartIndex);
    }
    if (bracket.SourceRange.EndIndex >= 0) {
      arrayShape.SignOut(bracket.SourceRange.EndIndex);
    }
    arrayShape.Pos = (type as ShapeToken).Pos;
    arrayShape.TryToClose(this.Context);
    type = arrayShape;
    continue;
  }
  const inner = new TypeBuilder(this.Template, this.Context);
  let base = 0;
  if (bracket.SourceRange.StartIndex >= 0) {
    base = bracket.SourceRange.StartIndex + 1;
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
  if (type.SourceRange.StartIndex >= 0) {
    shape.SignIn(type.SourceRange.StartIndex);
  }
  if (bracket.SourceRange.EndIndex >= 0) {
    shape.SignOut(bracket.SourceRange.EndIndex);
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
// 负数字面量类型 `-1`：TS 是 LiteralType → PrefixUnaryExpression → NumericLiteral（`-` 不进 children）。
if (unit instanceof Symbol && (unit as Symbol).Is("-")) {
  this.At++;
  const numberUnit = this.Peek(0);
  if (numberUnit === null || !(numberUnit instanceof Common) || !(numberUnit as Common).CanStartNumber()) {
    throw new Error("负数字面量类型缺少数字");
  }
  const numberIndex = this.At;
  this.At++;
  const numeric = NumericLiteralShape.FromBasicToken(numberUnit as Common, this.Context);
  numeric.Pos = this.Positions[numberIndex];
  const prefix = new PrefixUnaryExpressionShape(this.Template);
  prefix.Add(numeric);
  const spannedPrefix = this.SpanNode(prefix, start, this.At - 1);
  // LiteralType 的区间要盖住 `-1` 两个单元（`MakeLiteralType` 只按单单元签，负号会被截掉）。
  const negativeLiteral = new LiteralTypeShape(this.Template);
  negativeLiteral.Literal = spannedPrefix;
  negativeLiteral.Add(spannedPrefix);
  if (unit.SourceRange.StartIndex >= 0) {
    negativeLiteral.SignIn(unit.SourceRange.StartIndex);
  }
  if (spannedPrefix.SourceRange.EndIndex >= 0) {
    negativeLiteral.SignOut(spannedPrefix.SourceRange.EndIndex);
  }
  negativeLiteral.Pos = this.Positions[start];
  negativeLiteral.TryToClose(this.Context);
  return negativeLiteral;
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
    if (unit.SourceRange.StartIndex >= 0) {
      shape.SignIn(unit.SourceRange.StartIndex);
    }
    if (operand.SourceRange.EndIndex >= 0) {
      shape.SignOut(operand.SourceRange.EndIndex);
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
  if (text === "intrinsic") {
    this.At++;
    return this.SpanLeaf(new IntrinsicKeywordShape(this.Template), start);
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
if (bracket.SourceRange.StartIndex >= 0) {
  base = bracket.SourceRange.StartIndex + 1;
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
if (bracket.SourceRange.StartIndex >= 0) {
  shape.SignIn(bracket.SourceRange.StartIndex);
}
if (bracket.SourceRange.EndIndex >= 0) {
  shape.SignOut(bracket.SourceRange.EndIndex);
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
if (bracket.SourceRange.StartIndex >= 0) {
  base = bracket.SourceRange.StartIndex + 1;
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
      || inner.IsText(afterName, "?:")
      || (inner.IsText(afterName, "?") && afterMark !== null && inner.IsText(afterMark, ":")));
  if (named) {
    // [name: A] / [name?: A] / [...name: A[]] -- TS children: DotDotDotToken?, Identifier, QuestionToken?, Type.
    const member = new NamedTupleMemberShape(inner.Template);
    if (restToken !== null) {
      member.Add(restToken);
    }
    member.Add(inner.ParseName());
    const questionUnit = inner.Peek(0);
    let colonConsumed = false;
    if (questionUnit !== null) {
      const questionText = inner.TextOf(questionUnit);
      if (questionText === "?" || questionText === "?:") {
        // `?:` 是组合 Symbol：QuestionToken 只覆盖 `?` 一个字符，冒号算已被它消费。
        const question = inner.ParseOptionalMark();
        if (question !== null) {
          member.Add(question);
        }
        colonConsumed = questionText === "?:";
      }
    }
    if (!colonConsumed) {
      const colonUnit = inner.Peek(0);
      if (colonUnit === null || !inner.IsText(colonUnit, ":")) {
        throw new Error("labeled tuple member 缺少冒号");
      }
      inner.At++;
    }
    const memberTypeStart = inner.At;
    const memberType = inner.ParseType();
    const memberMark = inner.Peek(0);
    if (memberMark !== null && inner.IsText(memberMark, "?")) {
      // `name: D?`：TS 的 NamedTupleMember 里 `?` 与类型合成一个 OptionalType（不是 QuestionToken）。
      inner.At++;
      const optionalType = new OptionalTypeShape(inner.Template);
      optionalType.Add(memberType);
      member.Add(inner.SpanNode(optionalType, memberTypeStart, inner.At - 1));
    } else {
      member.Add(memberType);
    }
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
if (bracket.SourceRange.StartIndex >= 0) {
  shape.SignIn(bracket.SourceRange.StartIndex);
}
if (bracket.SourceRange.EndIndex >= 0) {
  shape.SignOut(bracket.SourceRange.EndIndex);
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
  if (bracket.SourceRange.StartIndex >= 0) {
    base = bracket.SourceRange.StartIndex + 1;
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
if (bracket.SourceRange.StartIndex >= 0) {
  shape.SignIn(bracket.SourceRange.StartIndex);
}
if (bracket.SourceRange.EndIndex >= 0) {
  shape.SignOut(bracket.SourceRange.EndIndex);
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
  // `readonly` 也可能是成员名（`interface TupleType { readonly: boolean }`）：
  // 只有后面跟着名字 / 字符串名 / 计算名时才是修饰词。
  const afterReadonly = this.Peek(1);
  // `readonly` 换行后接**任何**代码单元：TS 的成员修饰词只认「同一行」的下一个 token
  //（parseModifiers → nextTokenIsOnSameLineAndCanFollowModifier），换行时 `readonly` 收成
  // **无类型 PropertySignature**（名字就是 readonly），下一行另起成员。
  // 同一行的 `readonly [k: string]` / `readonly x: A` 仍是修饰词。
  const readonlyUnit = this.Peek(0);
  if (readonlyUnit !== null && afterReadonly !== null
    && MemberBoundary.HasLineBreakBetween(readonlyUnit, afterReadonly)) {
    // 当场收掉 readonly 成员，不能只 break：物化成名字后，下一行的 `[` / `(` / 名字会被
    // 当成类型的索引访问 / 调用 / 续接后缀（`readonly` ⏎ `[k: string]` 的 `[` 是下一个
    // IndexSignature 成员，不是上一成员类型的索引访问）。
    const readonlyNameIndex = this.At;
    this.At++;
    const readonlyName = IdentifierShape.FromBasicToken(unit as Common, this.Context);
    readonlyName.Pos = this.Positions[readonlyNameIndex];
    const readonlyShape = new PropertySignatureShape(this.Template);
    readonlyShape.SignatureName = readonlyName;
    readonlyShape.Add(readonlyName);
    return this.SpanTypeMember(readonlyShape, start);
  }
  const hasNameAfter = afterReadonly !== null
    && (afterReadonly instanceof Common
      || afterReadonly instanceof String
      || (afterReadonly instanceof Bracket && (afterReadonly as Bracket).StartBracketChar === "["));
  if (!hasNameAfter) {
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
  // `new` 换行后接下一个成员（`new` ⏎ `new(): void`）：TS 把这一格的 new 收成
  // **无类型 PropertySignature**（名字就是 new），构造签名是下一行的 `new()`。
  // 构造签名判据本身不看换行（`new` ⏎ `(` / `<` 仍是构造签名，G13/G14 已绿），
  // 所以只在「下一格不是 `(` / `<` 且与 new 之间有换行」时按成员名收口；
  // 否则通用名字路径会把下一行的 `new` 当成上一格 new 的类型（`new` 走构造类型、缺 `=>` 崩）。
  if (!isConstructSignature && newNextUnit !== null
    && MemberBoundary.HasLineBreakBetween(unit, newNextUnit)) {
    const newNameIndex = this.At;
    this.At++;
    const newName = IdentifierShape.FromBasicToken(unit as Common, this.Context);
    newName.Pos = this.Positions[newNameIndex];
    const newShape = new PropertySignatureShape(this.Template);
    newShape.SignatureName = newName;
    newShape.Add(newName);
    return this.SpanTypeMember(newShape, start);
  }
}
if (unit instanceof Symbol && this.IsText(unit, "<")) {
  // 泛型调用签名：`<T>(x: T): T`。TS 的 CallSignature children = 每个 TypeParameter，
  // 然后每个 Parameter，最后返回类型；`<` `>` `(` `)` `:` 都不进 AST。
  const typeParameters = this.ParseTypeParameterList();
  const callBracket = this.Peek(0);
  if (callBracket === null || !(callBracket instanceof Bracket) || !(callBracket as Bracket).Is("(", ")")) {
    throw new Error("调用签名缺少参数表");
  }
  this.At++;
  const callParameters = this.ParseParameterList(callBracket as Bracket);
  const callColon = this.Peek(0);
  let callReturnType:Token | null = null;
  if (callColon !== null && this.IsText(callColon, ":")) {
    this.At++;
    callReturnType = this.ParseReturnTypeBounded();
  }
  const callShape = new CallSignatureShape(this.Template);
  callShape.Parameters = callParameters;
  callShape.ReturnType = callReturnType;
  callShape.MemberModifiers = modifiers;
  for (const callModifier of modifiers) {
    callShape.Add(callModifier);
  }
  for (const callTypeParameter of typeParameters) {
    callShape.Add(callTypeParameter);
  }
  for (const callParameter of callParameters) {
    callShape.Add(callParameter);
  }
  if (callReturnType !== null) {
    callShape.Add(callReturnType);
  }
  return this.SpanTypeMember(callShape, start);
}
if (unit instanceof Bracket) {
  const bracket = unit as Bracket;
  if (bracket.Is("(", ")")) {
    this.At++;
    const parameters = this.ParseParameterList(bracket);
    const colon = this.Peek(0);
    let returnType:Token | null = null;
    if (colon !== null && this.IsText(colon, ":")) {
      this.At++;
      returnType = this.ParseReturnTypeBounded();
    }
    const shape = new CallSignatureShape(this.Template);
    shape.Parameters = parameters;
    shape.ReturnType = returnType;
    for (const parameter of parameters) {
      shape.Add(parameter);
    }
    if (returnType !== null) {
      shape.Add(returnType);
    }
    return this.SpanTypeMember(shape, start);
  }
  if (bracket.Is("[", "]")) {
    const innerCode:Array<Token> = [];
    for (const innerItem of bracket.Data) {
      if (!innerItem.IsTriviaToken) {
        innerCode.push(innerItem);
      }
    }
    let indexSignature = false;
    if (innerCode.length >= 2 && this.TextOf(innerCode[1]) === ":") {
      indexSignature = true;
    }
    if (!indexSignature) {
      if (innerCode.length === 0) {
        // 换行后的空方括号：TS 的 parseMappedType 在值类型之后 parseTypeMembers()，读成**无形参的** IndexSignature。
        this.At++;
        const emptySignature = new IndexSignatureShape(this.Template);
        for (const emptyModifier of modifiers) {
          emptySignature.Add(emptyModifier);
        }
        return this.SpanTypeMember(emptySignature, start);
      }
      // 计算属性名成员：`[s]: A` / `[s]?: A` / `[s](): A`，name 是 ComputedPropertyName([ … ])。
      // 方括号里的内容按表达式读（`Symbol.iterator` / `a.b` / 字符串 / 数字都能进），不再只认单标识符。
      const inner = new ExpressionBuilder(this.Template, this.Context);
      let expressionBase = 0;
      if (bracket.SourceRange.StartIndex >= 0) {
        expressionBase = bracket.SourceRange.StartIndex + 1;
      }
      inner.Load(bracket.Data, expressionBase);
      if (inner.Units.length === 0) {
        throw new Error("计算属性名是空的");
      }
      const expression = inner.ParseExpression();
      if (inner.At !== inner.Units.length) {
        throw new Error("计算属性名没有读完");
      }
      const computed = new ComputedPropertyNameShape(this.Template);
      computed.Add(expression);
      expression.Parent = computed;
      if (bracket.SourceRange.StartIndex >= 0) {
        computed.SignIn(bracket.SourceRange.StartIndex);
      }
      if (bracket.SourceRange.EndIndex >= 0) {
        computed.SignOut(bracket.SourceRange.EndIndex);
      }
      computed.Pos = this.Positions[this.At];
      computed.TryToClose(this.Context);
      this.At++;
      let computedQuestion:Token | null = null;
      let computedColonConsumed = false;
      const computedMark = this.Peek(0);
      if (computedMark !== null) {
        const computedMarkText = this.TextOf(computedMark);
        if (computedMarkText === "?" || computedMarkText === "?:") {
          computedQuestion = this.ParseOptionalMark();
          computedColonConsumed = computedMarkText === "?:";
        }
      }
      const computedAfterMark = this.Peek(0);
      // 计算名的泛型方法：`[sym]?<K>(…): R` —— 名字后先 `<...>` 类型参数，再参数表。
      let computedTypeParameters:Array<Token> = [];
      let computedParamMark = computedAfterMark;
      if (computedParamMark !== null && this.IsText(computedParamMark, "<")) {
        computedTypeParameters = this.ParseTypeParameterList();
        computedParamMark = this.Peek(0);
      }
      if (computedParamMark !== null && computedParamMark instanceof Bracket
        && (computedParamMark as Bracket).Is("(", ")")) {
        this.At++;
        const computedParameters = this.ParseParameterList(computedParamMark as Bracket);
        const computedColon = this.Peek(0);
        if (computedColon === null || !this.IsText(computedColon, ":")) {
          throw new Error("计算属性方法缺少返回类型");
        }
        this.At++;
        const computedReturnType = this.ParseReturnTypeBounded();
        const computedMethod = new MethodSignatureShape(this.Template);
        computedMethod.SignatureName = computed;
        computedMethod.Parameters = computedParameters;
        computedMethod.ReturnType = computedReturnType;
        computedMethod.MemberModifiers = modifiers;
        for (const computedModifier of modifiers) {
          computedMethod.Add(computedModifier);
        }
        computedMethod.Add(computed);
        if (computedQuestion !== null) {
          computedMethod.Add(computedQuestion);
        }
        for (const computedTypeParameter of computedTypeParameters) {
          computedMethod.Add(computedTypeParameter);
        }
        for (const computedParameter of computedParameters) {
          computedMethod.Add(computedParameter);
        }
        computedMethod.Add(computedReturnType);
        return this.SpanTypeMember(computedMethod, start);
      }
      let computedType:Token | null = null;
      if (!computedColonConsumed) {
        const computedTypeColon = this.Peek(0);
        if (computedTypeColon !== null && this.IsText(computedTypeColon, ":")) {
          this.At++;
        }
      }
      const computedTypeHead = this.Peek(0);
      if (computedTypeHead !== null && !this.IsText(computedTypeHead, ";") && !this.IsText(computedTypeHead, ",")) {
        computedType = this.ParseTypeBounded();
      }
      const computedProperty = new PropertySignatureShape(this.Template);
      computedProperty.SignatureName = computed;
      computedProperty.QuestionToken = computedQuestion;
      computedProperty.Type = computedType;
      computedProperty.MemberModifiers = modifiers;
      for (const computedModifier of modifiers) {
        computedProperty.Add(computedModifier);
      }
      computedProperty.Add(computed);
      if (computedQuestion !== null) {
        computedProperty.Add(computedQuestion);
      }
      if (computedType !== null) {
        computedProperty.Add(computedType);
      }
      return this.SpanTypeMember(computedProperty, start);
    }
    this.At++;
    const parameter = this.ParseIndexParameter(bracket);
    const colon = this.Peek(0);
    if (colon === null || !this.IsText(colon, ":")) {
      throw new Error("索引签名缺少类型");
    }
    this.At++;
    const type = this.ParseTypeBounded();
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
if (!(unit instanceof Common) && !(unit instanceof String)) {
  throw new Error("不支持的对象类型成员");
}
// get / set 访问器：TS 节点是 GetAccessor / SetAccessor（children = 名字 + [参数] + [返回类型]）。
// 名字可以是标识符，也可以是计算名 `get [k](): T`（TS 的 name 是 ComputedPropertyName）。
const accessorText = this.TextOf(unit);
if (accessorText === "get" || accessorText === "set") {
  const accessorNameUnit = this.Peek(1);
  const accessorBracketUnit = this.Peek(2);
  const accessorNameIsComputed = accessorNameUnit !== null && accessorNameUnit instanceof Bracket
    && (accessorNameUnit as Bracket).StartBracketChar === "[";
  if (accessorNameUnit !== null && (accessorNameUnit instanceof Common || accessorNameIsComputed)
    && accessorBracketUnit !== null && accessorBracketUnit instanceof Bracket
    && (accessorBracketUnit as Bracket).Is("(", ")")) {
    this.At++;
    let accessorName:Token;
    if (accessorNameIsComputed) {
      // 计算名：方括号内容按表达式读，包成 ComputedPropertyName（与计算属性成员同一读取口径）。
      const accessorNameBracket = accessorNameUnit as Bracket;
      const accessorNameIndex = this.At;
      this.At++;
      const accessorInner = new ExpressionBuilder(this.Template, this.Context);
      let accessorBase = 0;
      if (accessorNameBracket.SourceRange.StartIndex >= 0) {
        accessorBase = accessorNameBracket.SourceRange.StartIndex + 1;
      }
      accessorInner.Load(accessorNameBracket.Data, accessorBase);
      if (accessorInner.Units.length === 0) {
        throw new Error("访问器计算名是空的");
      }
      const accessorExpression = accessorInner.ParseExpression();
      if (accessorInner.At !== accessorInner.Units.length) {
        throw new Error("访问器计算名没有读完");
      }
      const accessorComputed = new ComputedPropertyNameShape(this.Template);
      accessorComputed.Add(accessorExpression);
      accessorExpression.Parent = accessorComputed;
      if (accessorNameBracket.SourceRange.StartIndex >= 0) {
        accessorComputed.SignIn(accessorNameBracket.SourceRange.StartIndex);
      }
      if (accessorNameBracket.SourceRange.EndIndex >= 0) {
        accessorComputed.SignOut(accessorNameBracket.SourceRange.EndIndex);
      }
      accessorComputed.Pos = this.Positions[accessorNameIndex];
      accessorComputed.TryToClose(this.Context);
      accessorName = accessorComputed;
    } else {
      accessorName = this.ParseName();
    }
    const accessorBracket = this.Peek(0) as Bracket;
    this.At++;
    const accessorParameters = this.ParseParameterList(accessorBracket);
    let accessorReturn:Token | null = null;
    const accessorColon = this.Peek(0);
    if (accessorColon !== null && this.IsText(accessorColon, ":")) {
      this.At++;
      accessorReturn = this.ParseReturnTypeBounded();
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
// 成员名：标识符或字符串字面量（`interface I { "abort": Event }` / `"m"(): void`）。
const nameHead = this.Peek(0);
let name:Token;
if (nameHead instanceof String) {
  const nameIndex = this.At;
  this.At++;
  const literalName = StringLiteralShape.FromBasicToken(nameHead as String, this.Context);
  literalName.Pos = this.Positions[nameIndex];
  name = literalName;
} else if (nameHead instanceof Common && (nameHead as Common).CanStartNumber()) {
  // 数字成员名（`interface RegExpMatchArray { 0: string }`）：TS 的 name 是 NumericLiteral。
  const nameIndex = this.At;
  this.At++;
  const numericName = NumericLiteralShape.FromBasicToken(nameHead as Common, this.Context);
  numericName.Pos = this.Positions[nameIndex];
  name = numericName;
} else {
  name = this.ParseName();
}
let next = this.Peek(0);
// 可选方法 `m?()`：`?` 紧跟参数表（或泛型参数表）时才是 MethodSignature 的 QuestionToken。
// `?(` 有两种读法：`m?(): T` 是可选方法，`a?: (A | B)` / `a?: () => void` 是**可选属性**＋括号类型。
// TS 的判据是参数表 `)` 之后是不是 `:`（返回类型）；不是就退回属性那条路。
let questionToken:Token | null = null;
if (next !== null) {
  const markText = this.TextOf(next);
  if (markText === "?" || markText === "?:") {
    const afterMark = this.Peek(1);
    let optionalMethod = false;
    if (afterMark !== null && this.IsText(afterMark, "<")) {
      optionalMethod = true;
    } else if (afterMark !== null && afterMark instanceof Bracket && (afterMark as Bracket).Is("(", ")")) {
      const afterParams = this.Peek(2);
      optionalMethod = afterParams !== null && this.IsText(afterParams, ":");
    }
    if (optionalMethod) {
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
    returnType = this.ParseReturnTypeBounded();
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
let type:Token | null = null;
if (colonNeeded) {
  const colon = this.Peek(0);
  if (colon !== null && this.IsText(colon, ":")) {
    this.At++;
  }
}
const typeHead = this.Peek(0);
if (typeHead !== null && !this.IsText(typeHead, ";") && !this.IsText(typeHead, ",")) {
  type = this.ParseTypeBounded();
}
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
if (type !== null) {
  shape.Add(type);
}
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
if (unit.SourceRange.StartIndex >= 0) {
  shape.SignIn(unit.SourceRange.StartIndex);
  shape.SignOut(unit.SourceRange.StartIndex + 1);
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
if (bracket.SourceRange.StartIndex >= 0) {
  base = bracket.SourceRange.StartIndex + 1;
}
inner.Load(bracket.Data, base);
while (inner.At < inner.Units.length) {
  const unit = inner.Units[inner.At];
  if (inner.IsText(unit, ",")) {
    inner.At++;
    continue;
  }
  const parameter = inner.ParseParameter();
  // 签名参数的默认值：`interface I { m(a = 1): void }`。TS 的 Parameter children 末尾是 Initializer，
  // `=` 不进 children。class / 对象方法由各自的 BuildParameters + TakeParameterInitializer 收，
  // 签名路径原先漏了这一步：`=` 留给下一轮 ParseParameter 继续 ParseName → 「缺少标识符」。
  const initializerMark = inner.Peek(0);
  if (initializerMark !== null && inner.IsText(initializerMark, "=")) {
    inner.At++;
    const initializerPos = inner.Positions[inner.At];
    const initializerBuilder = new ExpressionBuilder(this.Template, this.Context);
    initializerBuilder.Load(inner.Units.slice(inner.At), initializerPos);
    const initializer = initializerBuilder.ParseAssign();
    inner.At += initializerBuilder.At;
    parameter.Add(initializer);
    const initializerTail = inner.Units[inner.At - 1];
    const initializerEnd = initializerTail.SourceRange.EndIndex;
    if (initializerEnd >= 0) {
      parameter.SourceRange.End = initializerEnd;
    }
  }
  parameters.push(parameter);
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
  const expressionBase = atToken.SourceRange.EndIndex < 0 ? decoratorPos : atToken.SourceRange.EndIndex;
  // 装饰器表达式按 TS 的 decorator context 口径截断：`@a` 后面**顶层**的 `[` 不是 element access，
  // 而是参数名（解构模式）的起点（`m(@a [x]: T)` 的 TS AST 是 Decorator(`a`) + ArrayBindingPattern）。
  // `@a()` / `@a.b` / `@a(b)` 仍正常；`(...)` 是整块 Bracket，里面的 `[` 不在本层，不受影响。
  const decoratorUnits:Array<Token> = [];
  for (const item of this.Units.slice(this.At)) {
    if (item instanceof Bracket && (item as Bracket).StartBracketChar === "[") {
      break;
    }
    decoratorUnits.push(item);
  }
  const decoratorBuilder = new ExpressionBuilder(this.Template, this.Context);
  decoratorBuilder.Load(decoratorUnits, expressionBase);
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
// 参数名可以是标识符，也可以是解构模式（`...{a}: A` / `[a]: A`）：TS 的 Parameter children 里
// 直接是 ObjectBindingPattern / ArrayBindingPattern。
let name:Token;
const paramNameUnit = this.Peek(0);
if (paramNameUnit !== null && paramNameUnit instanceof Bracket && (paramNameUnit as Bracket).StartBracketChar === "{") {
  const patternBracket = paramNameUnit as Bracket;
  this.At++;
  name = ObjectBindingPatternShape.FromBracket(patternBracket, this.Context);
} else if (paramNameUnit !== null && paramNameUnit instanceof Bracket && (paramNameUnit as Bracket).StartBracketChar === "[") {
  const patternBracket = paramNameUnit as Bracket;
  this.At++;
  name = ArrayBindingPatternShape.FromBracket(patternBracket, this.Context);
} else {
  name = this.ParseName();
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
// 类型位置的参数可以没有类型标注（TS: `new (a) => b` / `(a) => void` / `(...a) => b` 都合法，
// 无标注参数在 AST 里只有 Identifier）。有冒号才解析类型。
let type:Token | null = null;
if (!colonNeeded) {
  type = this.ParseType();
} else {
  const colon = this.Peek(0);
  if (colon !== null && this.IsText(colon, ":")) {
    this.At++;
    type = this.ParseType();
  }
}
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
if (type !== null) {
  parameter.Add(type);
}
return this.SpanNode(parameter, paramStart, this.At - 1);
```

## method ParseIndexParameter:(bracket:Bracket)=>Token

索引签名的参数：方括号单元里只有一个 `名字 : 类型`，复用 `ParseParameter` 的口径。

```ts
const inner = new TypeBuilder(this.Template, this.Context);
let base = 0;
if (bracket.SourceRange.StartIndex >= 0) {
  base = bracket.SourceRange.StartIndex + 1;
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
// TS 的 `parseTypeArgumentsOfTypeReference` 要求 `!scanner.hasPrecedingLineBreak()`：
// **类型实参必须与类型名同一行**。换行后的 `<` 是关系运算符，不是类型实参——
// `a as T` ⏎ `<b>c` 是 `(a as T) < b > c`（一条比较表达式语句，不是 ASI）。
// `<` 在同一行、只有实参内部换行（`A<` ⏎ `B>`）时不受影响：判据看的是 `<` 前有没有换行。
let typeArguments:Array<Token> = [];
if (!this.HasLineBreakBeforeCurrent()) {
  typeArguments = this.ParseTypeArguments();
}
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
if (left.SourceRange.StartIndex >= 0) {
  shape.SignIn(left.SourceRange.StartIndex);
}
if (right.SourceRange.EndIndex >= 0) {
  shape.SignOut(right.SourceRange.EndIndex);
}
shape.Pos = (left as ShapeToken).Pos;
shape.TryToClose(this.Context);
return shape;
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
  if (bracket.SourceRange.StartIndex >= 0) {
    pathPos = bracket.SourceRange.StartIndex + 1;
  }
  const stringShape = StringLiteralShape.FromBasicToken(pathToken, this.Context);
  stringShape.Pos = pathPos;
  const argument = new LiteralTypeShape(this.Template);
  argument.Literal = stringShape;
  argument.Add(stringShape);
  if (pathToken.SourceRange.StartIndex >= 0) {
    argument.SignIn(pathToken.SourceRange.StartIndex);
  }
  if (pathToken.SourceRange.EndIndex >= 0) {
    argument.SignOut(pathToken.SourceRange.EndIndex);
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
  if (operatorUnit.SourceRange.StartIndex >= 0) {
    imported.SignIn(operatorUnit.SourceRange.StartIndex);
  }
  const lastUnit = this.Units[this.At - 1];
  if (lastUnit.SourceRange.EndIndex >= 0) {
    imported.SignOut(lastUnit.SourceRange.EndIndex);
  }
  imported.Pos = this.Positions[start];
  imported.TryToClose(this.Context);
  return imported;
}
const name = this.ParseEntityName();
const shape = new TypeQueryShape(this.Template);
shape.ExprName = name;
shape.Add(name);
// `typeof x.y<Z>`：TS 6 允许类型实参（InstantiationExpression 的 `x.y<Z>` 作为 typeof 的实体），
// TypeQuery children = 实体名 + 每个 TypeArgument。
// 与 `ParseTypeReference` 同一条同口径：类型实参必须与实体名**同一行**（`parseTypeArgumentsOfTypeReference`
// 的 `!scanner.hasPrecedingLineBreak()`）。换行后的 `<` 是关系运算符——`a as typeof f` ⏎ `<T>(1)`
// 是 `(a as typeof f) < T > (1)` 一条比较表达式，不是 TypeQuery 的类型实参（cover9 B15/B16）。
let typeArguments:Array<Token> = [];
if (!this.HasLineBreakBeforeCurrent()) {
  typeArguments = this.ParseTypeArguments();
}
for (const typeArgument of typeArguments) {
  shape.Add(typeArgument);
}
if (operatorUnit.SourceRange.StartIndex >= 0) {
  shape.SignIn(operatorUnit.SourceRange.StartIndex);
}
// 有类型实参时 TS 的 TypeQuery 区间含末尾的 `>`（`typeof X<A>`），按最后消费的单元签出。
const lastConsumed = this.Units[this.At - 1];
if (lastConsumed.SourceRange.EndIndex >= 0) {
  shape.SignOut(lastConsumed.SourceRange.EndIndex);
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
  const extendsIndex = this.At;
  this.At++;
  const constraint = this.ParseType();
  const afterConstraint = this.Peek(0);
  // TS 的 tryParseConstraintOfInferType：不在条件类型的 extends 子句里时，
  // 约束之后紧跟 `?` 说明这个 `extends` 属于外层条件类型，约束要回退（InferType 只到名字）。
  if (!this.InConditionalExtends && afterConstraint !== null && this.IsText(afterConstraint, "?")) {
    this.At = extendsIndex;
  } else {
    parameter.Type = constraint;
    parameter.Add(constraint);
    last = this.At - 1;
  }
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
if (withUnit.SourceRange.EndIndex >= 0) {
  attributesPos = withUnit.SourceRange.EndIndex + 1;
}
let group:Array<Token> = [];
let pos = inner.SourceRange.StartIndex < 0 ? 0 : inner.SourceRange.StartIndex + 1;
for (const item of inner.Data) {
  if (!item.IsTriviaToken && item instanceof Symbol && (item as Symbol).Is(",")) {
    const entry = this.BuildImportTypeAttribute(group, pos);
    if (entry !== null) {
      attributes.Elements.push(entry);
    }
    group = [];
    pos = item.SourceRange.EndIndex < 0 ? 0 : item.SourceRange.EndIndex;
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
if (inner.SourceRange.StartIndex >= 0) {
  attributes.SignIn(inner.SourceRange.StartIndex);
}
if (inner.SourceRange.EndIndex >= 0) {
  attributes.SignOut(inner.SourceRange.EndIndex);
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
value.Pos = code[1].SourceRange.EndIndex < 0 ? 0 : code[1].SourceRange.EndIndex;
attribute.Value = value;
attribute.Data.push(value);
value.Parent = attribute;
attribute.Pos = pos;
if (keyUnit.SourceRange.StartIndex >= 0) {
  attribute.SignIn(keyUnit.SourceRange.StartIndex);
}
if (valueUnit.SourceRange.EndIndex >= 0) {
  attribute.SignOut(valueUnit.SourceRange.EndIndex);
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
if (bracket.SourceRange.StartIndex >= 0) {
  pathPos = bracket.SourceRange.StartIndex + 1;
}
const stringShape = StringLiteralShape.FromBasicToken(pathToken, this.Context);
stringShape.Pos = pathPos;
const argument = new LiteralTypeShape(this.Template);
argument.Literal = stringShape;
argument.Add(stringShape);
if (pathToken.SourceRange.StartIndex >= 0) {
  argument.SignIn(pathToken.SourceRange.StartIndex);
}
if (pathToken.SourceRange.EndIndex >= 0) {
  argument.SignOut(pathToken.SourceRange.EndIndex);
}
argument.Pos = pathPos;
argument.TryToClose(this.Context);
const attributes = this.ParseImportTypeAttributes(bracket);
// 限定名在 TS 侧是可选的：`type T = import("m")` / `import("m", { with: … })` 都合法，
// 此时 ImportType children 只有 LiteralType（+ ImportAttributes），没有 Identifier/TypeArguments。
// 原先这里强制要求 `.`（抛「import 类型缺少限定名」）。
let qualifier:Token | null = null;
let typeArguments:Array<Token> = [];
const dot = this.Peek(0);
if (dot !== null && this.IsText(dot, ".")) {
  this.At++;
  qualifier = this.ParseEntityName();
  typeArguments = this.ParseTypeArguments();
}
const shape = new ImportTypeShape(this.Template);
shape.Argument = argument;
shape.AssertClause = attributes;
shape.Qualifier = qualifier;
shape.TypeArguments = typeArguments;
shape.Add(argument);
if (attributes !== null) {
  shape.Add(attributes);
}
if (qualifier !== null) {
  shape.Add(qualifier);
}
for (const argumentType of typeArguments) {
  shape.Add(argumentType);
}
if (importUnit.SourceRange.StartIndex >= 0) {
  shape.SignIn(importUnit.SourceRange.StartIndex);
}
const lastUnit = this.Units[this.At - 1];
if (lastUnit.SourceRange.EndIndex >= 0) {
  shape.SignOut(lastUnit.SourceRange.EndIndex);
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
if (token.SourceRange.StartIndex >= 0) {
  head.SignIn(token.SourceRange.StartIndex);
}
if (interps[0].SourceRange.StartIndex >= 0) {
  head.SignOut(interps[0].SourceRange.StartIndex + 1);
}
head.Pos = this.Positions[start];
head.TryToClose(this.Context);
expression.Add(head);
for (let index = 0; index < interps.length; index++) {
  const interp = interps[index];
  const inner = new TypeBuilder(this.Template, this.Context);
  let base = 0;
  if (interp.SourceRange.StartIndex >= 0) {
    base = interp.SourceRange.StartIndex + 1;
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
  if (value.SourceRange.EndIndex >= 0) {
    tailPos = value.SourceRange.EndIndex;
  } else if (interp.SourceRange.EndIndex >= 0) {
    tailPos = interp.SourceRange.EndIndex - 1;
  }
  let tail:ShapeToken;
  if (index + 1 < interps.length) {
    const middle = new TemplateMiddleShape(this.Template);
    middle.Text = texts[index + 1];
    middle.Pos = tailPos;
    if (interp.SourceRange.EndIndex >= 0) {
      middle.SignIn(interp.SourceRange.EndIndex - 1);
    }
    const nextInterp = interps[index + 1];
    if (nextInterp.SourceRange.StartIndex >= 0) {
      middle.SignOut(nextInterp.SourceRange.StartIndex + 1);
    }
    middle.TryToClose(this.Context);
    tail = middle;
  } else {
    const lastTail = new TemplateTailShape(this.Template);
    lastTail.Text = texts[index + 1];
    lastTail.Pos = tailPos;
    if (interp.SourceRange.EndIndex >= 0) {
      lastTail.SignIn(interp.SourceRange.EndIndex - 1);
    }
    if (token.SourceRange.EndIndex >= 0) {
      lastTail.SignOut(token.SourceRange.EndIndex);
    }
    lastTail.TryToClose(this.Context);
    tail = lastTail;
  }
  const span = new TemplateLiteralTypeSpanShape(this.Template);
  span.Type = value;
  span.Tail = tail;
  span.Add(value);
  span.Add(tail);
  if (interp.SourceRange.StartIndex >= 0) {
    span.SignIn(interp.SourceRange.StartIndex + 1);
    span.Pos = interp.SourceRange.StartIndex + 1;
  }
  if (tail.SourceRange.EndIndex >= 0) {
    span.SignOut(tail.SourceRange.EndIndex);
  }
  span.TryToClose(this.Context);
  expression.Add(span);
}
if (token.SourceRange.StartIndex >= 0) {
  expression.SignIn(token.SourceRange.StartIndex);
}
if (token.SourceRange.EndIndex >= 0) {
  expression.SignOut(token.SourceRange.EndIndex);
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
if (bracket.SourceRange.StartIndex >= 0) {
  base = bracket.SourceRange.StartIndex + 1;
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
const mappedMembers:Array<Token> = [];
while (inner.At < inner.Units.length) {
  const tailUnit = inner.Units[inner.At];
  if (inner.IsText(tailUnit, ";") || inner.IsText(tailUnit, ",")) {
    inner.At++;
    continue;
  }
  // 值类型之后 TS 的 parseMappedType 仍会 parseTypeMembers()：`[X]: A` / `[K]` 都是成员。
  mappedMembers.push(inner.ParseTypeMember());
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
if (inner.MappedNameType !== null) {
  shape.Add(inner.MappedNameType);
}
if (questionToken !== null) {
  shape.Add(questionToken);
}
shape.Add(valueType);
for (const mappedMember of mappedMembers) {
  shape.Add(mappedMember);
}
if (bracket.SourceRange.StartIndex >= 0) {
  shape.SignIn(bracket.SourceRange.StartIndex);
}
if (bracket.SourceRange.EndIndex >= 0) {
  shape.SignOut(bracket.SourceRange.EndIndex);
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
if (bracket.SourceRange.StartIndex >= 0) {
  base = bracket.SourceRange.StartIndex + 1;
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
