# dependencies
```xl
import { BlockToken } from "../../../core/syntax/block-token.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { InterpolationString } from "../../../core/syntax/basic-tokens/string/interpolation-string.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { NumericLiteralShape } from "../literals/numeric-literal-shape.xl.md"
import { StringLiteralShape } from "../literals/string-literal-shape.xl.md"
import { OperandUtil } from "../expressions/operand-util.xl.md"
import { MinusTokenShape } from "../punctuation/binary-operator-token-shapes.xl.md"
import { PlusTokenShape } from "../punctuation/plus-token-shape.xl.md"
import { TypeShape } from "./type-shape.xl.md"
import { AbstractKeywordShape } from "./type-token-shapes.xl.md"
import { AssertsKeywordShape } from "./type-token-shapes.xl.md"
import { DotDotDotTokenShape } from "./type-token-shapes.xl.md"
import { QuestionTokenShape } from "./type-token-shapes.xl.md"
import { ReadonlyKeywordShape } from "./type-token-shapes.xl.md"
import { UniqueKeywordShape } from "./type-token-shapes.xl.md"
import { KeywordTypeShape } from "./keyword-type-shapes.xl.md"
import { AnyKeywordShape } from "./keyword-type-shapes.xl.md"
import { BigIntKeywordShape } from "./keyword-type-shapes.xl.md"
import { BooleanKeywordShape } from "./keyword-type-shapes.xl.md"
import { FalseKeywordShape } from "./keyword-type-shapes.xl.md"
import { NeverKeywordShape } from "./keyword-type-shapes.xl.md"
import { NullKeywordShape } from "./keyword-type-shapes.xl.md"
import { NumberKeywordShape } from "./keyword-type-shapes.xl.md"
import { ObjectKeywordShape } from "./keyword-type-shapes.xl.md"
import { StringKeywordShape } from "./keyword-type-shapes.xl.md"
import { SymbolKeywordShape } from "./keyword-type-shapes.xl.md"
import { TrueKeywordShape } from "./keyword-type-shapes.xl.md"
import { UndefinedKeywordShape } from "./keyword-type-shapes.xl.md"
import { UnknownKeywordShape } from "./keyword-type-shapes.xl.md"
import { VoidKeywordShape } from "./keyword-type-shapes.xl.md"
import { ArrayTypeShape } from "./type-node-shapes.xl.md"
import { CallSignatureShape } from "./type-node-shapes.xl.md"
import { ConditionalTypeShape } from "./type-node-shapes.xl.md"
import { ConstructSignatureShape } from "./type-node-shapes.xl.md"
import { ConstructorTypeShape } from "./type-node-shapes.xl.md"
import { FunctionTypeShape } from "./type-node-shapes.xl.md"
import { ImportTypeShape } from "./type-node-shapes.xl.md"
import { IndexSignatureShape } from "./type-node-shapes.xl.md"
import { IndexedAccessTypeShape } from "./type-node-shapes.xl.md"
import { InferTypeShape } from "./type-node-shapes.xl.md"
import { IntersectionTypeShape } from "./type-node-shapes.xl.md"
import { LiteralTypeShape } from "./type-node-shapes.xl.md"
import { MappedTypeShape } from "./type-node-shapes.xl.md"
import { MethodSignatureShape } from "./type-node-shapes.xl.md"
import { NamedTupleMemberShape } from "./type-node-shapes.xl.md"
import { OptionalTypeShape } from "./type-node-shapes.xl.md"
import { ParameterShape } from "./type-node-shapes.xl.md"
import { ParenthesizedTypeShape } from "./type-node-shapes.xl.md"
import { PropertySignatureShape } from "./type-node-shapes.xl.md"
import { QualifiedNameShape } from "./type-node-shapes.xl.md"
import { RestTypeShape } from "./type-node-shapes.xl.md"
import { TemplateHeadShape } from "./type-node-shapes.xl.md"
import { TemplateLiteralTypeShape } from "./type-node-shapes.xl.md"
import { TemplateLiteralTypeSpanShape } from "./type-node-shapes.xl.md"
import { TemplateMiddleShape } from "./type-node-shapes.xl.md"
import { TemplateTailShape } from "./type-node-shapes.xl.md"
import { ThisTypeShape } from "./type-node-shapes.xl.md"
import { TupleTypeShape } from "./type-node-shapes.xl.md"
import { TypeLiteralShape } from "./type-node-shapes.xl.md"
import { TypeOperatorShape } from "./type-node-shapes.xl.md"
import { TypeParameterShape } from "./type-node-shapes.xl.md"
import { TypePredicateShape } from "./type-node-shapes.xl.md"
import { TypeQueryShape } from "./type-node-shapes.xl.md"
import { TypeReferenceShape } from "./type-node-shapes.xl.md"
import { UnionTypeShape } from "./type-node-shapes.xl.md"
```

# namespace cangjie

# class TypeAliasParsed

## field Name:Token | null = null

## field TypeParameters:Array<Token> = []

## field Type:Token | null = null

# class TypeParser

## field Units:Array<Token>

## field Index:int = 0

## field Limit:int = 0

## field Template:Template

## constructor:(units:Array<Token>, limit:int, template:Template)=>void

```ts
this.Units = units;
this.Limit = limit;
this.Template = template;
```

## static method ParseAlias:(units:Array<Token>, limit:int, template:Template)=>TypeAliasParsed

```ts
const parser = new TypeParser(units, limit, template);
return parser.Alias();
```

## static method ParseCompleteType:(units:Array<Token>, limit:int, template:Template)=>Token

```ts
// 模板字面量类型的每个 `${…}` 是一个独立的 token 序列：在这里单独把它解析成一个类型节点。
const parser = new TypeParser(units, limit, template);
const type = parser.ParseType();
parser.SkipTrivia();
if (parser.Index < parser.Limit) {
  throw parser.MakeError("模板插值里的类型之后仍有多余单元");
}
return type;
```

## static method ParseCompleteReturnType:(units:Array<Token>, limit:int, template:Template)=>Token

```ts
// 函数返回类型多一层 `asserts x is T` / `x is T` 的谓词文法。
const parser = new TypeParser(units, limit, template);
const type = parser.ParseTypeReturn();
parser.SkipTrivia();
if (parser.Index < parser.Limit) {
  throw parser.MakeError("返回类型之后仍有多余单元");
}
return type;
```

## static method ParseParameterPrefix:(units:Array<Token>, from:int, limit:int, template:Template)=>Array<Token>

```ts
// 增量路径在 `=>` 到达时才把 `( … )` 一次解析成参数列表：只消费到 limit 为止。
const parser = new TypeParser(units, limit, template);
parser.Index = from;
const items = parser.ParseParameterList();
parser.SkipTrivia();
if (parser.Index < parser.Limit) {
  throw parser.MakeError("参数列表之后仍有多余单元");
}
return items;
```

## static method KeywordTypeOf:(common:Common, pos:int)=>KeywordTypeShape | null

```ts
switch (common.TempToString()) {
  case "string":
    return StringKeywordShape.FromCommon(common, pos);
  case "number":
    return NumberKeywordShape.FromCommon(common, pos);
  case "boolean":
    return BooleanKeywordShape.FromCommon(common, pos);
  case "any":
    return AnyKeywordShape.FromCommon(common, pos);
  case "unknown":
    return UnknownKeywordShape.FromCommon(common, pos);
  case "never":
    return NeverKeywordShape.FromCommon(common, pos);
  case "void":
    return VoidKeywordShape.FromCommon(common, pos);
  case "object":
    return ObjectKeywordShape.FromCommon(common, pos);
  case "symbol":
    return SymbolKeywordShape.FromCommon(common, pos);
  case "bigint":
    return BigIntKeywordShape.FromCommon(common, pos);
  case "undefined":
    return UndefinedKeywordShape.FromCommon(common, pos);
  default:
    return null;
}
```

## static method IsBalanced:(units:Array<Token>, limit:int)=>bool

```ts
// 只用来判断「当前 `;` 是语句结束还是类型字面量里的成员分隔符」：括号配平就停在类型内部。
let braces = 0;
let parens = 0;
let brackets = 0;
let angles = 0;
for (let at = 0; at < limit; at++) {
  const unit = units[at];
  if (!(unit instanceof Symbol)) {
    continue;
  }
  const text = unit.TempToString();
  if (text === "{") {
    braces++;
  } else if (text === "}") {
    braces--;
  } else if (text === "(") {
    parens++;
  } else if (text === ")") {
    parens--;
  } else if (text === "[") {
    brackets++;
  } else if (text === "]") {
    brackets--;
  } else if (text === "<") {
    angles++;
  } else if (text === ">") {
    angles--;
  } else if (text === ">>") {
    angles -= 2;
  } else if (text === ">>>") {
    angles -= 3;
  }
  if (braces < 0 || parens < 0 || brackets < 0 || angles < 0) {
    return false;
  }
}
return braces === 0 && parens === 0 && brackets === 0 && angles === 0;
```

## public method Alias:()=>TypeAliasParsed

```ts
this.Index = 0;
this.SkipTrivia();
if (this.Index >= this.Limit) {
  throw this.MakeError("类型别名缺少名称");
}
const name = this.Units[this.Index];
if (!(name instanceof IdentifierShape)) {
  throw this.MakeError("类型别名缺少名称标识符");
}
this.Index++;
const parameters = this.ParseTypeParametersIfPresent();
this.ExpectSymbol("=");
const type = this.ParseType();
this.SkipTrivia();
if (this.Index < this.Limit) {
  throw this.MakeError("类型之后仍有多余单元");
}
const parsed = new TypeAliasParsed();
parsed.Name = name;
parsed.TypeParameters = parameters;
parsed.Type = type;
return parsed;
```

## private method MakeError:(message:string)=>Error

```ts
return new Error("TypeParser: " + message + "（下标 " + this.Index + "）");
```

## private method SkipTrivia:()=>void

```ts
while (this.Index < this.Limit && this.Units[this.Index].IsTriviaToken) {
  this.Index++;
}
```

## private method Peek:()=>Token | null

```ts
this.SkipTrivia();
if (this.Index >= this.Limit) {
  return null;
}
return this.Units[this.Index];
```

## private method PeekText:()=>string

```ts
const unit = this.Peek();
if (unit instanceof Common || unit instanceof Symbol) {
  return unit.TempToString();
}
return "";
```

## private method PeekSymbol:()=>string

```ts
const unit = this.Peek();
return unit instanceof Symbol ? unit.TempToString() : "";
```

## private method PeekCommon:()=>string

```ts
const unit = this.Peek();
return unit instanceof Common ? unit.TempToString() : "";
```

## private method NextCodeIndex:(from:int)=>int

```ts
let at = from;
while (at < this.Limit && this.Units[at].IsTriviaToken) {
  at++;
}
return at < this.Limit ? at : -1;
```

## private method PosOf:(index:int)=>int

```ts
return ItemUtil.PositionOf(this.Units, index);
```

## private method ExpectSymbol:(text:string)=>Symbol

```ts
this.SkipTrivia();
if (this.Index >= this.Limit) {
  throw this.MakeError("期望 " + text + "，但类型已结束");
}
const unit = this.Units[this.Index];
if (!(unit instanceof Symbol) || unit.TempToString() !== text) {
  throw this.MakeError("期望符号 " + text);
}
this.Index++;
return unit;
```

## private method ConsumeSymbolIf:(text:string)=>Symbol | null

```ts
const unit = this.Peek();
if (unit instanceof Symbol && unit.TempToString() === text) {
  this.Index++;
  return unit;
}
return null;
```

## private method ExpectCommon:(text:string)=>Common

```ts
this.SkipTrivia();
if (this.Index >= this.Limit) {
  throw this.MakeError("期望 " + text + "，但类型已结束");
}
const unit = this.Units[this.Index];
if (!(unit instanceof Common) || unit.TempToString() !== text) {
  throw this.MakeError("期望关键字 " + text);
}
this.Index++;
return unit;
```

## private method Node:(node:TypeShape, pos:int, start:int, end:int, children:Array<Token>)=>TypeShape

```ts
TypeShape.Finish(node, pos, start, end, children);
return node;
```

## private method ExpectTypeAngleClose:()=>int

```ts
// 词法层把 `>>` / `>>>` 合成一个 Symbol；类型实参的右尖括号必须拆开逐个收。
this.SkipTrivia();
if (this.Index >= this.Limit) {
  throw this.MakeError("期望 >，但类型已结束");
}
const unit = this.Units[this.Index];
if (!(unit instanceof Symbol)) {
  throw this.MakeError("期望符号 >");
}
const text = unit.TempToString();
if (text === ">") {
  this.Index++;
  return unit.SourceRange.End;
}
if (text === ">>" || text === ">>>") {
  const start = unit.SourceRange.Start;
  unit.Temp = text.substring(1);
  unit.SourceRange.Start = start + 1;
  return start + 1;
}
throw this.MakeError("期望符号 >");
```

## private method ParseType:()=>Token

```ts
const check = this.ParseUnion();
this.SkipTrivia();
if (this.PeekCommon() === "extends") {
  this.Index++;
  const extendsType = this.ParseUnion();
  this.ExpectSymbol("?");
  const trueType = this.ParseType();
  this.ExpectSymbol(":");
  const falseType = this.ParseType();
  const children:Array<Token> = [check, extendsType, trueType, falseType];
  const pos = TypeShape.PosOfNode(check);
  return this.Node(new ConditionalTypeShape(this.Template), pos, check.SourceRange.Start, falseType.SourceRange.End, children);
}
return check;
```

## private method ParseUnion:()=>Token

```ts
const members:Array<Token> = [this.ParseIntersection()];
while (this.ConsumeSymbolIf("|") !== null) {
  members.push(this.ParseIntersection());
}
if (members.length === 1) {
  return members[0];
}
const first = members[0];
const last = members[members.length - 1];
return this.Node(new UnionTypeShape(this.Template), TypeShape.PosOfNode(first), first.SourceRange.Start, last.SourceRange.End, members);
```

## private method ParseIntersection:()=>Token

```ts
const members:Array<Token> = [this.ParseTypeOperator()];
while (this.ConsumeSymbolIf("&") !== null) {
  members.push(this.ParseTypeOperator());
}
if (members.length === 1) {
  return members[0];
}
const first = members[0];
const last = members[members.length - 1];
return this.Node(new IntersectionTypeShape(this.Template), TypeShape.PosOfNode(first), first.SourceRange.Start, last.SourceRange.End, members);
```

## private method ParseTypeOperator:()=>Token

```ts
this.SkipTrivia();
const unit = this.Peek();
if (unit instanceof Common) {
  const text = unit.TempToString();
  if (text === "keyof" || text === "readonly" || text === "unique") {
    const startIndex = this.Index;
    this.Index++;
    const operand = this.ParseTypeOperator();
    const children:Array<Token> = [operand];
    return this.Node(new TypeOperatorShape(this.Template), this.PosOf(startIndex), unit.SourceRange.Start, operand.SourceRange.End, children);
  }
}
return this.ParsePostfix();
```

## private method ParsePostfix:()=>Token

```ts
let node = this.ParsePrimary();
while (true) {
  this.SkipTrivia();
  if (this.PeekSymbol() !== "[") {
    break;
  }
  const open = this.Units[this.Index];
  this.Index++;
  this.SkipTrivia();
  if (this.PeekSymbol() === "]") {
    this.Index++;
    const close = this.Units[this.Index - 1];
    const children:Array<Token> = [node];
    node = this.Node(new ArrayTypeShape(this.Template), TypeShape.PosOfNode(node), node.SourceRange.Start, close.SourceRange.End, children);
    continue;
  }
  const indexType = this.ParseType();
  const close = this.ExpectSymbol("]");
  const children:Array<Token> = [node, indexType];
  node = this.Node(new IndexedAccessTypeShape(this.Template), TypeShape.PosOfNode(node), node.SourceRange.Start, close.SourceRange.End, children);
}
return node;
```

## private method ParsePrimary:()=>Token

```ts
this.SkipTrivia();
if (this.Index >= this.Limit) {
  throw this.MakeError("类型表达式意外结束");
}
const unit = this.Units[this.Index];
if (unit instanceof Symbol) {
  const text = unit.TempToString();
  if (text === "(") {
    if (this.IsArrowAhead()) {
      return this.ParseFunctionType();
    }
    return this.ParseParenthesizedType();
  }
  if (text === "<") {
    return this.ParseGenericFunctionType();
  }
  if (text === "{") {
    if (this.IsMappedTypeAhead()) {
      return this.ParseMappedType();
    }
    return this.ParseTypeLiteral();
  }
  if (text === "[") {
    return this.ParseTupleType();
  }
  throw this.MakeError("无法识别的类型符号 " + text);
}
if (unit instanceof String) {
  if (unit.IsSupportInterpolation) {
    return this.ParseTemplateLiteralType(unit);
  }
  return this.ParseStringLiteralType(unit);
}
if (!(unit instanceof Common)) {
  throw this.MakeError("无法识别的类型单元");
}
const text = unit.TempToString();
if (unit.IsNumber()) {
  return this.ParseNumberLiteralType(unit);
}
if (unit.IsBigInt()) {
  throw this.MakeError("暂不支持 bigint 字面量类型");
}
if (text === "typeof") {
  return this.ParseTypeQuery();
}
if (text === "import") {
  return this.ParseImportType();
}
if (text === "infer") {
  return this.ParseInferType();
}
if (text === "abstract" && this.PeekNextCommonText() === "new") {
  return this.ParseConstructorType();
}
if (text === "new") {
  return this.ParseConstructorType();
}
if (text === "this") {
  return this.ParseThisType(unit);
}
if (text === "null" || text === "true" || text === "false") {
  return this.ParseLiteralKeywordType(unit);
}
if (this.IsKeywordTypeName(text)) {
  return this.ParseKeywordType(unit);
}
if (!OperandUtil.IsKeyword(text) && OperandUtil.IsIdentifier(text)) {
  return this.ParseTypeReference();
}
throw this.MakeError("无法识别的类型起始单元 " + text);
```

## private method PeekNextCommonText:()=>string

```ts
const next = this.NextCodeIndex(this.Index + 1);
if (next < 0) {
  return "";
}
const unit = this.Units[next];
return unit instanceof Common ? unit.TempToString() : "";
```

## private method IsKeywordTypeName:(text:string)=>bool

```ts
switch (text) {
  case "string":
  case "number":
  case "boolean":
  case "any":
  case "unknown":
  case "never":
  case "void":
  case "object":
  case "symbol":
  case "bigint":
  case "undefined":
    return true;
  default:
    return false;
}
```

## private method ParseKeywordType:(common:Common)=>Token

```ts
const pos = this.PosOf(this.Index);
this.Index++;
const text = common.TempToString();
switch (text) {
  case "string":
    return StringKeywordShape.FromCommon(common, pos);
  case "number":
    return NumberKeywordShape.FromCommon(common, pos);
  case "boolean":
    return BooleanKeywordShape.FromCommon(common, pos);
  case "any":
    return AnyKeywordShape.FromCommon(common, pos);
  case "unknown":
    return UnknownKeywordShape.FromCommon(common, pos);
  case "never":
    return NeverKeywordShape.FromCommon(common, pos);
  case "void":
    return VoidKeywordShape.FromCommon(common, pos);
  case "object":
    return ObjectKeywordShape.FromCommon(common, pos);
  case "symbol":
    return SymbolKeywordShape.FromCommon(common, pos);
  case "bigint":
    return BigIntKeywordShape.FromCommon(common, pos);
  case "undefined":
    return UndefinedKeywordShape.FromCommon(common, pos);
  default:
    throw this.MakeError("未知关键字类型 " + text);
}
```

## private method ParseLiteralKeywordType:(common:Common)=>Token

```ts
const pos = this.PosOf(this.Index);
this.Index++;
const text = common.TempToString();
let child:Token;
if (text === "null") {
  child = NullKeywordShape.FromCommon(common, pos);
} else if (text === "true") {
  child = TrueKeywordShape.FromCommon(common, pos);
} else {
  child = FalseKeywordShape.FromCommon(common, pos);
}
const children:Array<Token> = [child];
return this.Node(new LiteralTypeShape(this.Template), pos, common.SourceRange.Start, common.SourceRange.End, children);
```

## private method ParseNumberLiteralType:(common:Common)=>Token

```ts
const pos = this.PosOf(this.Index);
this.Index++;
const literal = NumericLiteralShape.FromCommon(common, pos);
const children:Array<Token> = [literal];
return this.Node(new LiteralTypeShape(this.Template), pos, common.SourceRange.Start, common.SourceRange.End, children);
```

## private method ParseStringLiteralType:(string:String)=>Token

```ts
const pos = this.PosOf(this.Index);
this.Index++;
const literal = StringLiteralShape.FromString(string, pos);
const children:Array<Token> = [literal];
return this.Node(new LiteralTypeShape(this.Template), pos, string.SourceRange.Start, string.SourceRange.End, children);
```

## private method ParseThisType:(common:Common)=>Token

```ts
const pos = this.PosOf(this.Index);
this.Index++;
return ThisTypeShape.FromCommon(common, pos);
```

## private method ParseTemplateLiteralType:(string:String)=>Token

```ts
const pos = this.PosOf(this.Index);
this.Index++;
const interpolations:Array<InterpolationString> = [];
for (const item of string.Data) {
  if (item instanceof InterpolationString) {
    interpolations.push(item);
  }
}
if (interpolations.length === 0) {
  throw this.MakeError("无插值的模板字面量类型暂不支持");
}
// TemplateHead 从反引号到第一个 `${` 的 `{`，Tail/Middle 从 `}` 到下一段开头。
const headEnd = interpolations[0].SourceRange.Start + 1;
const head = this.Node(new TemplateHeadShape(this.Template), pos, string.SourceRange.Start, headEnd, []);
const children:Array<Token> = [head];
for (let at = 0; at < interpolations.length; at++) {
  const interpolation = interpolations[at];
  const inner = TypeParser.ParseCompleteType(interpolation.Data, interpolation.Data.length, this.Template);
  const tailStart = interpolation.SourceRange.End - 1;
  let segmentEnd = string.SourceRange.End;
  let tail:Token;
  if (at + 1 < interpolations.length) {
    segmentEnd = interpolations[at + 1].SourceRange.Start + 1;
    tail = this.Node(new TemplateMiddleShape(this.Template), tailStart, tailStart, segmentEnd, []);
  } else {
    tail = this.Node(new TemplateTailShape(this.Template), tailStart, tailStart, segmentEnd, []);
  }
  const spanChildren:Array<Token> = [inner, tail];
  const span = this.Node(new TemplateLiteralTypeSpanShape(this.Template), interpolation.SourceRange.Start + 1, inner.SourceRange.Start, segmentEnd, spanChildren);
  children.push(span);
}
return this.Node(new TemplateLiteralTypeShape(this.Template), pos, string.SourceRange.Start, string.SourceRange.End, children);
```

## private method ParseTypeReference:()=>Token

```ts
const name = this.ParseEntityName();
const children:Array<Token> = [name];
let end = name.SourceRange.End;
this.SkipTrivia();
if (this.PeekSymbol() === "<") {
  this.Index++;
  this.SkipTrivia();
  if (this.PeekSymbol() === ">") {
    this.Index++;
    end = this.Units[this.Index - 1].SourceRange.End;
  } else {
    while (true) {
      children.push(this.ParseType());
      if (this.ConsumeSymbolIf(",") === null) {
        break;
      }
    }
    end = this.ExpectTypeAngleClose();
  }
}
return this.Node(new TypeReferenceShape(this.Template), TypeShape.PosOfNode(name), name.SourceRange.Start, end, children);
```

## private method ParseEntityName:()=>Token

```ts
this.SkipTrivia();
if (this.Index >= this.Limit) {
  throw this.MakeError("期望标识符");
}
const firstIndex = this.Index;
const first = this.Units[firstIndex];
if (!(first instanceof Common) || !OperandUtil.IsIdentifier(first.TempToString())) {
  throw this.MakeError("期望标识符");
}
this.Index++;
let node:Token = IdentifierShape.FromCommon(first, this.PosOf(firstIndex));
while (true) {
  this.SkipTrivia();
  if (this.PeekSymbol() !== ".") {
    break;
  }
  this.Index++;
  this.SkipTrivia();
  if (this.Index >= this.Limit) {
    throw this.MakeError("限定名缺少右半");
  }
  const rightIndex = this.Index;
  const right = this.Units[rightIndex];
  if (!(right instanceof Common) || !OperandUtil.IsIdentifier(right.TempToString())) {
    throw this.MakeError("限定名缺少右半");
  }
  this.Index++;
  const rightNode = IdentifierShape.FromCommon(right, this.PosOf(rightIndex));
  const children:Array<Token> = [node, rightNode];
  node = this.Node(new QualifiedNameShape(this.Template), TypeShape.PosOfNode(node), node.SourceRange.Start, rightNode.SourceRange.End, children);
}
return node;
```

## private method ParseTypeQuery:()=>Token

```ts
const startIndex = this.Index;
this.Index++;
const name = this.ParseEntityName();
const children:Array<Token> = [name];
return this.Node(new TypeQueryShape(this.Template), this.PosOf(startIndex), this.Units[startIndex].SourceRange.Start, name.SourceRange.End, children);
```

## private method ParseImportType:()=>Token

```ts
const startIndex = this.Index;
this.Index++;
this.ExpectSymbol("(");
this.SkipTrivia();
if (this.Index >= this.Limit) {
  throw this.MakeError("import 类型缺少模块名");
}
const moduleIndex = this.Index;
const moduleUnit = this.Units[moduleIndex];
if (!(moduleUnit instanceof String)) {
  throw this.MakeError("import 类型的模块名必须是字符串");
}
this.Index++;
const literal = StringLiteralShape.FromString(moduleUnit, this.PosOf(moduleIndex));
const literalChildren:Array<Token> = [literal];
const literalType = this.Node(new LiteralTypeShape(this.Template), literal.Pos, moduleUnit.SourceRange.Start, moduleUnit.SourceRange.End, literalChildren);
this.ExpectSymbol(")");
this.ExpectSymbol(".");
const name = this.ParseEntityName();
const children:Array<Token> = [literalType, name];
return this.Node(new ImportTypeShape(this.Template), this.PosOf(startIndex), this.Units[startIndex].SourceRange.Start, name.SourceRange.End, children);
```

## private method ParseInferType:()=>Token

```ts
const startIndex = this.Index;
this.Index++;
this.SkipTrivia();
if (this.Index >= this.Limit) {
  throw this.MakeError("infer 缺少类型参数");
}
const nameIndex = this.Index;
const nameUnit = this.Units[nameIndex];
if (!(nameUnit instanceof Common) || !OperandUtil.IsIdentifier(nameUnit.TempToString())) {
  throw this.MakeError("infer 缺少类型参数");
}
this.Index++;
const name = IdentifierShape.FromCommon(nameUnit, this.PosOf(nameIndex));
const parameterChildren:Array<Token> = [name];
let parameterEnd = name.SourceRange.End;
this.SkipTrivia();
if (this.PeekCommon() === "extends") {
  this.Index++;
  const constraint = this.ParseUnion();
  parameterChildren.push(constraint);
  parameterEnd = constraint.SourceRange.End;
}
const parameter = this.Node(new TypeParameterShape(this.Template), name.Pos, name.SourceRange.Start, parameterEnd, parameterChildren);
const children:Array<Token> = [parameter];
return this.Node(new InferTypeShape(this.Template), this.PosOf(startIndex), this.Units[startIndex].SourceRange.Start, parameterEnd, children);
```

## private method ParseConstructorType:()=>Token

```ts
const startIndex = this.Index;
const first = this.Units[startIndex];
const children:Array<Token> = [];
this.SkipTrivia();
if (this.PeekCommon() === "abstract") {
  const abstractIndex = this.Index;
  this.Index++;
  children.push(AbstractKeywordShape.FromUnit(this.Units[abstractIndex], this.PosOf(abstractIndex)));
}
this.ExpectCommon("new");
const parameters = this.ParseTypeParametersIfPresent();
for (const parameter of parameters) {
  children.push(parameter);
}
for (const item of this.ParseParameterList()) {
  children.push(item);
}
this.ExpectSymbol("=>");
const returnType = this.ParseType();
children.push(returnType);
return this.Node(new ConstructorTypeShape(this.Template), this.PosOf(startIndex), first.SourceRange.Start, returnType.SourceRange.End, children);
```

## private method ParseFunctionType:()=>Token

```ts
const startIndex = this.Index;
const first = this.Units[startIndex];
const children:Array<Token> = [];
for (const item of this.ParseParameterList()) {
  children.push(item);
}
this.ExpectSymbol("=>");
const returnType = this.ParseTypeReturn();
children.push(returnType);
return this.Node(new FunctionTypeShape(this.Template), this.PosOf(startIndex), first.SourceRange.Start, returnType.SourceRange.End, children);
```

## private method ParseGenericFunctionType:()=>Token

```ts
const startIndex = this.Index;
const first = this.Units[startIndex];
const children:Array<Token> = [];
for (const item of this.ParseTypeParametersIfPresent()) {
  children.push(item);
}
for (const item of this.ParseParameterList()) {
  children.push(item);
}
this.ExpectSymbol("=>");
const returnType = this.ParseTypeReturn();
children.push(returnType);
return this.Node(new FunctionTypeShape(this.Template), this.PosOf(startIndex), first.SourceRange.Start, returnType.SourceRange.End, children);
```

## private method IsArrowAhead:()=>bool

```ts
let depth = 0;
let at = this.Index;
while (at < this.Limit) {
  const unit = this.Units[at];
  if (unit instanceof Symbol) {
    const text = unit.TempToString();
    if (text === "(") {
      depth++;
    } else if (text === ")") {
      depth--;
      if (depth === 0) {
        const next = this.NextCodeIndex(at + 1);
        if (next < 0) {
          return false;
        }
        const after = this.Units[next];
        return after instanceof Symbol && after.TempToString() === "=>";
      }
    }
  }
  at++;
}
return false;
```

## private method ParseParenthesizedType:()=>Token

```ts
const openIndex = this.Index;
this.Index++;
const inner = this.ParseType();
const close = this.ExpectSymbol(")");
const children:Array<Token> = [inner];
return this.Node(new ParenthesizedTypeShape(this.Template), this.PosOf(openIndex), this.Units[openIndex].SourceRange.Start, close.SourceRange.End, children);
```

## private method ParseTypeParametersIfPresent:()=>Array<Token>

```ts
this.SkipTrivia();
if (this.PeekSymbol() !== "<") {
  return [];
}
this.Index++;
const items:Array<Token> = [];
this.SkipTrivia();
if (this.PeekSymbol() === ">") {
  this.ExpectTypeAngleClose();
  return items;
}
while (true) {
  items.push(this.ParseTypeParameter());
  if (this.ConsumeSymbolIf(",") === null) {
    break;
  }
}
this.ExpectTypeAngleClose();
return items;
```

## private method ParseTypeParameter:()=>Token

```ts
this.SkipTrivia();
if (this.Index >= this.Limit) {
  throw this.MakeError("类型参数意外结束");
}
const nameIndex = this.Index;
const nameUnit = this.Units[nameIndex];
if (!(nameUnit instanceof Common) || !OperandUtil.IsIdentifier(nameUnit.TempToString()) || OperandUtil.IsKeyword(nameUnit.TempToString())) {
  throw this.MakeError("类型参数缺少名称");
}
this.Index++;
const name = IdentifierShape.FromCommon(nameUnit, this.PosOf(nameIndex));
const children:Array<Token> = [name];
let end = name.SourceRange.End;
this.SkipTrivia();
if (this.PeekCommon() === "extends") {
  this.Index++;
  const constraint = this.ParseType();
  children.push(constraint);
  end = constraint.SourceRange.End;
}
this.SkipTrivia();
if (this.PeekSymbol() === "=") {
  this.Index++;
  const type = this.ParseType();
  children.push(type);
  end = type.SourceRange.End;
}
return this.Node(new TypeParameterShape(this.Template), name.Pos, name.SourceRange.Start, end, children);
```

## private method ParseParameterList:()=>Array<Token>

```ts
this.ExpectSymbol("(");
const items:Array<Token> = [];
this.SkipTrivia();
if (this.PeekSymbol() === ")") {
  this.Index++;
  return items;
}
while (true) {
  items.push(this.ParseParameter());
  if (this.ConsumeSymbolIf(",") === null) {
    break;
  }
}
this.ExpectSymbol(")");
return items;
```

## private method ParseParameter:()=>Token

```ts
this.SkipTrivia();
const startIndex = this.Index;
const children:Array<Token> = [];
if (this.PeekSymbol() === "...") {
  const dotsIndex = this.Index;
  this.Index++;
  children.push(DotDotDotTokenShape.FromUnit(this.Units[dotsIndex], this.PosOf(dotsIndex)));
}
this.SkipTrivia();
if (this.Index >= this.Limit) {
  throw this.MakeError("参数缺少名称");
}
const nameIndex = this.Index;
const nameUnit = this.Units[nameIndex];
if (!(nameUnit instanceof Common) || !OperandUtil.IsIdentifier(nameUnit.TempToString())) {
  throw this.MakeError("参数缺少名称");
}
this.Index++;
children.push(IdentifierShape.FromCommon(nameUnit, this.PosOf(nameIndex)));
this.SkipTrivia();
if (this.PeekSymbol() === "?") {
  const questionIndex = this.Index;
  this.Index++;
  children.push(QuestionTokenShape.FromUnit(this.Units[questionIndex], this.PosOf(questionIndex)));
}
this.SkipTrivia();
if (this.PeekSymbol() === ":") {
  this.Index++;
  children.push(this.ParseType());
}
const last = children[children.length - 1];
return this.Node(new ParameterShape(this.Template), this.PosOf(startIndex), this.Units[startIndex].SourceRange.Start, last.SourceRange.End, children);
```

## private method ParseTypeReturn:()=>Token

```ts
this.SkipTrivia();
if (this.PeekCommon() === "asserts") {
  const startIndex = this.Index;
  this.Index++;
  const children:Array<Token> = [AssertsKeywordShape.FromUnit(this.Units[startIndex], this.PosOf(startIndex))];
  this.SkipTrivia();
  const nameIndex = this.Index;
  const nameUnit = this.Units[nameIndex];
  if (!(nameUnit instanceof Common) || !OperandUtil.IsIdentifier(nameUnit.TempToString())) {
    throw this.MakeError("asserts 缺少参数名");
  }
  this.Index++;
  children.push(IdentifierShape.FromCommon(nameUnit, this.PosOf(nameIndex)));
  this.ExpectCommon("is");
  const type = this.ParseType();
  children.push(type);
  return this.Node(new TypePredicateShape(this.Template), this.PosOf(startIndex), this.Units[startIndex].SourceRange.Start, type.SourceRange.End, children);
}
const unit = this.Peek();
if (unit instanceof Common && OperandUtil.IsIdentifier(unit.TempToString()) && !OperandUtil.IsKeyword(unit.TempToString())) {
  const next = this.NextCodeIndex(this.Index + 1);
  if (next >= 0) {
    const after = this.Units[next];
    if (after instanceof Common && after.TempToString() === "is") {
      const startIndex = this.Index;
      const nameIndex = this.Index;
      this.Index++;
      const children:Array<Token> = [IdentifierShape.FromCommon(unit, this.PosOf(nameIndex))];
      this.SkipTrivia();
      this.Index++;
      const type = this.ParseType();
      children.push(type);
      return this.Node(new TypePredicateShape(this.Template), this.PosOf(startIndex), this.Units[startIndex].SourceRange.Start, type.SourceRange.End, children);
    }
  }
}
return this.ParseType();
```

## private method ParseTupleType:()=>Token

```ts
const openIndex = this.Index;
this.Index++;
const elements:Array<Token> = [];
while (true) {
  this.SkipTrivia();
  if (this.PeekSymbol() === "]") {
    this.Index++;
    break;
  }
  if (this.Index >= this.Limit) {
    throw this.MakeError("元组类型未闭合");
  }
  elements.push(this.ParseTupleElement());
  if (this.ConsumeSymbolIf(",") === null) {
    this.ExpectSymbol("]");
    break;
  }
}
const close = this.Units[this.Index - 1];
return this.Node(new TupleTypeShape(this.Template), this.PosOf(openIndex), this.Units[openIndex].SourceRange.Start, close.SourceRange.End, elements);
```

## private method ParseTupleElement:()=>Token

```ts
this.SkipTrivia();
const startIndex = this.Index;
if (this.PeekSymbol() === "...") {
  this.Index++;
  const inner = this.ParseType();
  const children:Array<Token> = [inner];
  return this.Node(new RestTypeShape(this.Template), this.PosOf(startIndex), this.Units[startIndex].SourceRange.Start, inner.SourceRange.End, children);
}
const unit = this.Peek();
if (unit instanceof Common && OperandUtil.IsIdentifier(unit.TempToString()) && !OperandUtil.IsKeyword(unit.TempToString()) && !this.IsKeywordTypeName(unit.TempToString())) {
  const nameIndex = this.Index;
  this.Index++;
  const name = IdentifierShape.FromCommon(unit, this.PosOf(nameIndex));
  this.SkipTrivia();
  const children:Array<Token> = [name];
  if (this.PeekSymbol() === "?") {
    const questionIndex = this.Index;
    this.Index++;
    children.push(QuestionTokenShape.FromUnit(this.Units[questionIndex], this.PosOf(questionIndex)));
  }
  this.ExpectSymbol(":");
  const type = this.ParseType();
  children.push(type);
  return this.Node(new NamedTupleMemberShape(this.Template), name.Pos, name.SourceRange.Start, type.SourceRange.End, children);
}
const type = this.ParseType();
this.SkipTrivia();
if (this.PeekSymbol() === "?") {
  const questionIndex = this.Index;
  this.Index++;
  const question = QuestionTokenShape.FromUnit(this.Units[questionIndex], this.PosOf(questionIndex));
  const children:Array<Token> = [type];
  return this.Node(new OptionalTypeShape(this.Template), TypeShape.PosOfNode(type), type.SourceRange.Start, question.SourceRange.End, children);
}
return type;
```

## private method IsMappedTypeAhead:()=>bool

```ts
let at = this.NextCodeIndex(this.Index + 1);
if (at < 0) {
  return false;
}
let unit = this.Units[at];
if (unit instanceof Common && unit.TempToString() === "readonly") {
  at = this.NextCodeIndex(at + 1);
} else if (unit instanceof Symbol && (unit.TempToString() === "+" || unit.TempToString() === "-")) {
  at = this.NextCodeIndex(at + 1);
  if (at >= 0) {
    unit = this.Units[at];
    if (unit instanceof Common && unit.TempToString() === "readonly") {
      at = this.NextCodeIndex(at + 1);
    }
  }
}
if (at < 0) {
  return false;
}
unit = this.Units[at];
if (!(unit instanceof Symbol) || unit.TempToString() !== "[") {
  return false;
}
at = this.NextCodeIndex(at + 1);
if (at < 0) {
  return false;
}
unit = this.Units[at];
if (!(unit instanceof Common) || !OperandUtil.IsIdentifier(unit.TempToString())) {
  return false;
}
at = this.NextCodeIndex(at + 1);
if (at < 0) {
  return false;
}
unit = this.Units[at];
return unit instanceof Common && unit.TempToString() === "in";
```

## private method ParseMappedType:()=>Token

```ts
const openIndex = this.Index;
this.Index++;
const children:Array<Token> = [];
this.SkipTrivia();
if (this.PeekCommon() === "readonly") {
  const index = this.Index;
  this.Index++;
  children.push(ReadonlyKeywordShape.FromUnit(this.Units[index], this.PosOf(index)));
} else if (this.PeekSymbol() === "+" || this.PeekSymbol() === "-") {
  const index = this.Index;
  const unit = this.Units[index] as Symbol;
  this.Index++;
  if (unit.TempToString() === "+") {
    children.push(PlusTokenShape.FromSymbol(unit, this.PosOf(index)));
  } else {
    children.push(MinusTokenShape.FromSymbol(unit, this.PosOf(index)));
  }
  this.SkipTrivia();
  if (this.PeekCommon() === "readonly") {
    this.Index++;
  }
}
this.ExpectSymbol("[");
this.SkipTrivia();
const nameIndex = this.Index;
const nameUnit = this.Units[nameIndex];
if (!(nameUnit instanceof Common) || !OperandUtil.IsIdentifier(nameUnit.TempToString())) {
  throw this.MakeError("映射类型缺少键名");
}
this.Index++;
const name = IdentifierShape.FromCommon(nameUnit, this.PosOf(nameIndex));
this.ExpectCommon("in");
const constraint = this.ParseType();
const parameterChildren:Array<Token> = [name, constraint];
const parameter = this.Node(new TypeParameterShape(this.Template), name.Pos, name.SourceRange.Start, constraint.SourceRange.End, parameterChildren);
children.push(parameter);
this.SkipTrivia();
if (this.PeekCommon() === "as") {
  this.Index++;
  children.push(this.ParseType());
}
this.ExpectSymbol("]");
this.SkipTrivia();
if (this.PeekSymbol() === "?") {
  const index = this.Index;
  this.Index++;
  children.push(QuestionTokenShape.FromUnit(this.Units[index], this.PosOf(index)));
} else if (this.PeekSymbol() === "+" || this.PeekSymbol() === "-") {
  const index = this.Index;
  const unit = this.Units[index] as Symbol;
  this.Index++;
  if (unit.TempToString() === "+") {
    children.push(PlusTokenShape.FromSymbol(unit, this.PosOf(index)));
  } else {
    children.push(MinusTokenShape.FromSymbol(unit, this.PosOf(index)));
  }
  // `+?` / `-?`：`?` 不是子节点，只跟在这个符号后面。
  this.SkipTrivia();
  if (this.PeekSymbol() === "?") {
    this.Index++;
  }
}
this.ExpectSymbol(":");
children.push(this.ParseType());
const close = this.ExpectSymbol("}");
return this.Node(new MappedTypeShape(this.Template), this.PosOf(openIndex), this.Units[openIndex].SourceRange.Start, close.SourceRange.End, children);
```

## private method IsReadonlyModifier:()=>bool

```ts
// `readonly` 既可能是成员修饰符，也可能自己就是属性名（`{ readonly: string }`）。
// 只有紧跟着 `:` / `?` / `(` 时才是名字。
const next = this.NextCodeIndex(this.Index + 1);
if (next < 0) {
  return true;
}
const unit = this.Units[next];
if (unit instanceof Symbol) {
  const text = unit.TempToString();
  if (text === ":" || text === "?" || text === "(") {
    return false;
  }
}
return true;
```

## private method ParseTypeLiteral:()=>Token

```ts
const openIndex = this.Index;
this.Index++;
const members:Array<Token> = [];
while (true) {
  this.SkipTrivia();
  if (this.PeekSymbol() === "}") {
    this.Index++;
    break;
  }
  if (this.Index >= this.Limit) {
    throw this.MakeError("类型字面量未闭合");
  }
  members.push(this.ParseTypeMember());
}
const close = this.Units[this.Index - 1];
return this.Node(new TypeLiteralShape(this.Template), this.PosOf(openIndex), this.Units[openIndex].SourceRange.Start, close.SourceRange.End, members);
```

## private method ParseTypeMember:()=>Token

```ts
this.SkipTrivia();
const startIndex = this.Index;
const modifiers:Array<Token> = [];
if (this.PeekCommon() === "readonly" && this.IsReadonlyModifier()) {
  const index = this.Index;
  this.Index++;
  modifiers.push(ReadonlyKeywordShape.FromUnit(this.Units[index], this.PosOf(index)));
  this.SkipTrivia();
}
if (this.PeekSymbol() === "(") {
  return this.ParseCallSignature(startIndex, modifiers);
}
if (this.PeekCommon() === "new") {
  return this.ParseConstructSignature(startIndex, modifiers);
}
if (this.PeekSymbol() === "[") {
  return this.ParseIndexSignature(startIndex, modifiers);
}
const name = this.ParsePropertyName();
this.SkipTrivia();
let question:Symbol | null = null;
let questionIndex = -1;
if (this.PeekSymbol() === "?") {
  questionIndex = this.Index;
  question = this.Units[this.Index] as Symbol;
  this.Index++;
}
this.SkipTrivia();
if (this.PeekSymbol() === "(" || this.PeekSymbol() === "<") {
  const parameters = this.ParseTypeParametersIfPresent();
  return this.ParseMethodSignature(startIndex, modifiers, name, question, questionIndex, parameters);
}
this.ExpectSymbol(":");
const type = this.ParseType();
const children:Array<Token> = [];
for (const modifier of modifiers) {
  children.push(modifier);
}
children.push(name);
if (question !== null) {
  children.push(QuestionTokenShape.FromUnit(question, this.PosOf(questionIndex)));
}
children.push(type);
let end = type.SourceRange.End;
const separator = this.ConsumeMemberSeparator();
if (separator !== null) {
  end = separator.SourceRange.End;
}
return this.Node(new PropertySignatureShape(this.Template), this.PosOf(startIndex), this.Units[startIndex].SourceRange.Start, end, children);
```

## private method ConsumeMemberSeparator:()=>Symbol | null

```ts
const unit = this.Peek();
if (unit instanceof Symbol && (unit.TempToString() === ";" || unit.TempToString() === ",")) {
  this.Index++;
  return unit;
}
return null;
```

## private method ParsePropertyName:()=>Token

```ts
this.SkipTrivia();
if (this.Index >= this.Limit) {
  throw this.MakeError("类型成员缺少名称");
}
const index = this.Index;
const unit = this.Units[index];
if (unit instanceof Common) {
  this.Index++;
  if (unit.IsNumber()) {
    return NumericLiteralShape.FromCommon(unit, this.PosOf(index));
  }
  return IdentifierShape.FromCommon(unit, this.PosOf(index));
}
if (unit instanceof String) {
  this.Index++;
  return StringLiteralShape.FromString(unit, this.PosOf(index));
}
throw this.MakeError("类型成员缺少名称");
```

## private method ParseMethodSignature:(startIndex:int, modifiers:Array<Token>, name:Token, question:Symbol | null, questionIndex:int, parameters:Array<Token>)=>Token

```ts
const children:Array<Token> = [];
for (const modifier of modifiers) {
  children.push(modifier);
}
children.push(name);
if (question !== null) {
  children.push(QuestionTokenShape.FromUnit(question, this.PosOf(questionIndex)));
}
for (const parameter of parameters) {
  children.push(parameter);
}
for (const item of this.ParseParameterList()) {
  children.push(item);
}
this.ExpectSymbol(":");
const returnType = this.ParseTypeReturn();
children.push(returnType);
let end = returnType.SourceRange.End;
const separator = this.ConsumeMemberSeparator();
if (separator !== null) {
  end = separator.SourceRange.End;
}
return this.Node(new MethodSignatureShape(this.Template), this.PosOf(startIndex), this.Units[startIndex].SourceRange.Start, end, children);
```

## private method ParseCallSignature:(startIndex:int, modifiers:Array<Token>)=>Token

```ts
const parameters = this.ParseTypeParametersIfPresent();
const children:Array<Token> = [];
for (const parameter of parameters) {
  children.push(parameter);
}
for (const item of this.ParseParameterList()) {
  children.push(item);
}
this.ExpectSymbol(":");
const returnType = this.ParseTypeReturn();
children.push(returnType);
let end = returnType.SourceRange.End;
const separator = this.ConsumeMemberSeparator();
if (separator !== null) {
  end = separator.SourceRange.End;
}
return this.Node(new CallSignatureShape(this.Template), this.PosOf(startIndex), this.Units[startIndex].SourceRange.Start, end, children);
```

## private method ParseConstructSignature:(startIndex:int, modifiers:Array<Token>)=>Token

```ts
this.ExpectCommon("new");
const parameters = this.ParseTypeParametersIfPresent();
const children:Array<Token> = [];
for (const parameter of parameters) {
  children.push(parameter);
}
for (const item of this.ParseParameterList()) {
  children.push(item);
}
this.ExpectSymbol(":");
const returnType = this.ParseTypeReturn();
children.push(returnType);
let end = returnType.SourceRange.End;
const separator = this.ConsumeMemberSeparator();
if (separator !== null) {
  end = separator.SourceRange.End;
}
return this.Node(new ConstructSignatureShape(this.Template), this.PosOf(startIndex), this.Units[startIndex].SourceRange.Start, end, children);
```

## private method ParseIndexSignature:(startIndex:int, modifiers:Array<Token>)=>Token

```ts
this.ExpectSymbol("[");
this.SkipTrivia();
const nameIndex = this.Index;
const nameUnit = this.Units[nameIndex];
if (!(nameUnit instanceof Common) || !OperandUtil.IsIdentifier(nameUnit.TempToString())) {
  throw this.MakeError("索引签名缺少参数名");
}
this.Index++;
const name = IdentifierShape.FromCommon(nameUnit, this.PosOf(nameIndex));
this.ExpectSymbol(":");
const parameterType = this.ParseType();
this.ExpectSymbol("]");
this.ExpectSymbol(":");
const returnType = this.ParseType();
const parameterChildren:Array<Token> = [name, parameterType];
const parameter = this.Node(new ParameterShape(this.Template), name.Pos, name.SourceRange.Start, parameterType.SourceRange.End, parameterChildren);
const children:Array<Token> = [];
for (const modifier of modifiers) {
  children.push(modifier);
}
children.push(parameter);
children.push(returnType);
let end = returnType.SourceRange.End;
const separator = this.ConsumeMemberSeparator();
if (separator !== null) {
  end = separator.SourceRange.End;
}
return this.Node(new IndexSignatureShape(this.Template), this.PosOf(startIndex), this.Units[startIndex].SourceRange.Start, end, children);
```
