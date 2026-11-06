# dependencies
```xl
import { CatalogGuide } from "../../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../../core/syntax/shape-states.xl.md"
import { String } from "../../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { TokenIndex } from "../../../../core/syntax/token-index.xl.md"
import { ItemUtil } from "../../item-util.xl.md"
import { OperandUtil } from "../../expressions/operand-util.xl.md"
import { IdentifierShape } from "../../names/identifier-shape.xl.md"
import { NumericLiteralShape } from "../../literals/numeric-literal-shape.xl.md"
import { StringLiteralShape } from "../../literals/string-literal-shape.xl.md"
import { TypeAliasDeclarationShape } from "../type-alias-declaration-shape.xl.md"
import { TypeBodyUtil } from "../type-body-util.xl.md"
import { TypeParameterListShape } from "../type-parameter-list-shape.xl.md"
import { TypeParserApi } from "../type-parser-api.xl.md"
import { TypeRevisionUtil } from "../type-revision-util.xl.md"
import { TypeShape } from "../type-shape.xl.md"
import { QuestionTokenShape } from "../type-token-shapes.xl.md"
import { ReadonlyKeywordShape } from "../type-token-shapes.xl.md"
import { CallSignatureShape } from "../type-node-shapes.xl.md"
import { ConstructSignatureShape } from "../type-node-shapes.xl.md"
import { IndexSignatureShape } from "../type-node-shapes.xl.md"
import { MethodSignatureShape } from "../type-node-shapes.xl.md"
import { NamedTupleMemberShape } from "../type-node-shapes.xl.md"
import { OptionalTypeShape } from "../type-node-shapes.xl.md"
import { ParameterShape } from "../type-node-shapes.xl.md"
import { PropertySignatureShape } from "../type-node-shapes.xl.md"
import { RestTypeShape } from "../type-node-shapes.xl.md"
import { TupleTypeShape } from "../type-node-shapes.xl.md"
import { TypeLiteralShape } from "../type-node-shapes.xl.md"
```


# namespace cangjie

# class LiteralBuilder

## static method NextCode:(units:Array<Token>, from:int, limit:int)=>int

```ts
let at = from;
while (at >= 0 && at <= limit && at < units.length && units[at].IsTriviaToken) {
  at++;
}
if (at < 0 || at > limit || at >= units.length) {
  return -1;
}
return at;
```

## static method PrevCode:(units:Array<Token>, from:int, limit:int)=>int

```ts
let at = from;
while (at >= limit && at >= 0 && at < units.length && units[at].IsTriviaToken) {
  at--;
}
if (at < limit || at < 0) {
  return -1;
}
return at;
```

## static method IsSymbol:(unit:Token, text:string)=>bool

```ts
return unit instanceof Symbol && unit.Closed && unit.Is(text);
```

## static method IsCommon:(unit:Token, text:string)=>bool

```ts
return unit instanceof Common && unit.TempToString() === text;
```

## static method IsCloser:(unit:Token)=>bool

```ts
return LiteralBuilder.IsSymbol(unit, "}")
  || LiteralBuilder.IsSymbol(unit, ";")
  || LiteralBuilder.IsSymbol(unit, ",");
```

## static method DepthBefore:(units:Array<Token>, limit:int)=>int

```ts
let depth = 0;
for (let at = 0; at < limit && at < units.length; at++) {
  const unit = units[at];
  if (!(unit instanceof Symbol)) {
    continue;
  }
  const text = unit.TempToString();
  if (text === "(" || text === "[" || text === "{") {
    depth++;
  } else if (text === ")" || text === "]" || text === "}") {
    depth--;
  }
}
return depth;
```

## static method PendingStart:(units:Array<Token>, limit:int)=>int

```ts
// 待建区间的起点（含前导 trivia）：最后一个已建成员之后；没有待建代码时返回 -1。
let lastBuilt = -1;
for (let at = limit - 1; at >= 0; at--) {
  if (units[at] instanceof TypeShape) {
    lastBuilt = at;
    break;
  }
}
const start = lastBuilt + 1;
for (let at = start; at < limit; at++) {
  if (!units[at].IsTriviaToken) {
    return start;
  }
}
return -1;
```

## static method PendingForm:(units:Array<Token>, start:int, limit:int)=>string

```ts
const first = LiteralBuilder.NextCode(units, start, limit - 1);
if (first < 0) {
  return "";
}
const last = LiteralBuilder.PrevCode(units, limit - 1, start);
if (LiteralBuilder.IsSymbol(units[first], "...")) {
  return "rest";
}
if (last >= 0 && LiteralBuilder.IsSymbol(units[last], "?")) {
  return "optional";
}
return "plain";
```

## static method MatchParen:(units:Array<Token>, openIndex:int, limit:int)=>int

```ts
let depth = 0;
for (let at = openIndex; at <= limit && at < units.length; at++) {
  const unit = units[at];
  if (!(unit instanceof Symbol)) {
    continue;
  }
  const text = unit.TempToString();
  if (text === "(") {
    depth++;
  } else if (text === ")") {
    depth--;
    if (depth === 0) {
      return at;
    }
  }
}
return -1;
```

## static method MatchBracket:(units:Array<Token>, openIndex:int, limit:int)=>int

```ts
let depth = 0;
for (let at = openIndex; at <= limit && at < units.length; at++) {
  const unit = units[at];
  if (!(unit instanceof Symbol)) {
    continue;
  }
  const text = unit.TempToString();
  if (text === "[") {
    depth++;
  } else if (text === "]") {
    depth--;
    if (depth === 0) {
      return at;
    }
  }
}
return -1;
```

## static method MatchAngle:(units:Array<Token>, openIndex:int, limit:int)=>int

```ts
let depth = 0;
for (let at = openIndex; at <= limit && at < units.length; at++) {
  const unit = units[at];
  if (!(unit instanceof Symbol)) {
    continue;
  }
  const text = unit.TempToString();
  if (text === "<") {
    depth++;
  } else if (text === ">") {
    depth--;
  } else if (text === ">>") {
    depth -= 2;
  } else if (text === ">>>") {
    depth -= 3;
  }
  if (depth <= 0) {
    return at;
  }
}
return -1;
```

## static method IsReadonlyModifier:(units:Array<Token>, at:int, limit:int)=>bool

```ts
const next = LiteralBuilder.NextCode(units, at + 1, limit);
if (next < 0) {
  return true;
}
const unit = units[next];
if (unit instanceof Symbol) {
  const text = unit.TempToString();
  if (text === ":" || text === "?" || text === "(") {
    return false;
  }
}
return true;
```

## static method BuildType:(units:Array<Token>, from:int, lastCode:int, template:Template)=>Token

```ts
// 类型段：from 允许带前导 trivia（Pos 由它决定），lastCode 是类型最后一个代码单元。
if (lastCode < 0 || from < 0 || from > lastCode) {
  throw new Error("LiteralBuilder: 类型段为空");
}
if (LiteralBuilder.NextCode(units, from, lastCode) < 0) {
  throw new Error("LiteralBuilder: 类型缺失");
}
const slice = units.slice(from, lastCode + 1);
return TypeParserApi.ParseCompleteType(slice, slice.length, template);
```

## static method BuildParameterList:(units:Array<Token>, openIndex:int, limit:int, template:Template)=>Array<Token>

```ts
const close = LiteralBuilder.MatchParen(units, openIndex, limit);
if (close < 0) {
  throw new Error("LiteralBuilder: 参数表没有闭合");
}
const slice = units.slice(openIndex, close + 1);
return TypeParserApi.ParseParameterPrefix(slice, 0, slice.length, template);
```

## static method BuildTypeParameterList:(units:Array<Token>, openIndex:int, limit:int, template:Template)=>Array<Token>

```ts
const close = LiteralBuilder.MatchAngle(units, openIndex, limit);
if (close < 0) {
  throw new Error("LiteralBuilder: 类型参数没有闭合");
}
const slice = units.slice(openIndex, close + 1);
return TypeParserApi.ParseTypeParameterList(slice, slice.length, template);
```

## static method BuildPropertyName:(units:Array<Token>, at:int)=>Token

```ts
const unit = units[at];
const pos = ItemUtil.PositionOf(units, at);
if (unit instanceof Common) {
  if (unit.IsNumber()) {
    const numeric = NumericLiteralShape.FromCommon(unit, pos);
    TypeRevisionUtil.SetRevision(numeric, unit.SourceRange.End);
    return numeric;
  }
  const identifier = IdentifierShape.FromCommon(unit, pos);
  TypeRevisionUtil.SetRevision(identifier, unit.SourceRange.End);
  return identifier;
}
if (unit instanceof String) {
  const literal = StringLiteralShape.FromString(unit, pos);
  TypeRevisionUtil.SetRevision(literal, unit.SourceRange.End);
  return literal;
}
throw new Error("LiteralBuilder: 成员名缺失");
```

## static method BuildMember:(units:Array<Token>, start:int, endIndex:int, host:TypeLiteralShape)=>Token

```ts
const template = host.Template;
const end = units[endIndex].SourceRange.End;
let contentEnd = endIndex;
if (LiteralBuilder.IsSymbol(units[endIndex], ";") || LiteralBuilder.IsSymbol(units[endIndex], ",")) {
  contentEnd = ItemUtil.PreviousCode(units, endIndex - 1);
}
let at = LiteralBuilder.NextCode(units, start, contentEnd);
if (at < 0) {
  throw new Error("LiteralBuilder: 成员为空");
}
const pos = ItemUtil.PositionOf(units, at);
const nodeStart = units[at].SourceRange.Start;
const children:Array<Token> = [];
if (LiteralBuilder.IsCommon(units[at], "readonly") && LiteralBuilder.IsReadonlyModifier(units, at, contentEnd)) {
  const modifier = ReadonlyKeywordShape.FromUnit(units[at], ItemUtil.PositionOf(units, at));
  TypeRevisionUtil.SetRevision(modifier, units[at].SourceRange.End);
  children.push(modifier);
  at = LiteralBuilder.NextCode(units, at + 1, contentEnd);
}
if (at < 0) {
  throw new Error("LiteralBuilder: 成员在 readonly 之后结束");
}
if (LiteralBuilder.IsSymbol(units[at], "(")) {
  const params = LiteralBuilder.BuildParameterList(units, at, contentEnd, template);
  for (const parameter of params) {
    children.push(parameter);
  }
  const close = LiteralBuilder.MatchParen(units, at, contentEnd);
  const colon = LiteralBuilder.NextCode(units, close + 1, contentEnd);
  if (colon < 0 || !LiteralBuilder.IsSymbol(units[colon], ":")) {
    throw new Error("LiteralBuilder: 调用签名缺少返回类型");
  }
  children.push(LiteralBuilder.BuildType(units, colon + 1, contentEnd, template));
  const call = new CallSignatureShape(template);
  TypeShape.Finish(call, pos, nodeStart, end, children);
  return call;
}
const afterNew = LiteralBuilder.NextCode(units, at + 1, contentEnd);
if (LiteralBuilder.IsCommon(units[at], "new") && afterNew >= 0 && LiteralBuilder.IsSymbol(units[afterNew], "(")) {
  at = afterNew;
  const params = LiteralBuilder.BuildParameterList(units, at, contentEnd, template);
  for (const parameter of params) {
    children.push(parameter);
  }
  const close = LiteralBuilder.MatchParen(units, at, contentEnd);
  const colon = LiteralBuilder.NextCode(units, close + 1, contentEnd);
  if (colon < 0 || !LiteralBuilder.IsSymbol(units[colon], ":")) {
    throw new Error("LiteralBuilder: 构造签名缺少返回类型");
  }
  children.push(LiteralBuilder.BuildType(units, colon + 1, contentEnd, template));
  const construct = new ConstructSignatureShape(template);
  TypeShape.Finish(construct, pos, nodeStart, end, children);
  return construct;
}
if (LiteralBuilder.IsSymbol(units[at], "[")) {
  const close = LiteralBuilder.MatchBracket(units, at, contentEnd);
  if (close < 0) {
    throw new Error("LiteralBuilder: 索引签名没有闭合");
  }
  const nameIndex = LiteralBuilder.NextCode(units, at + 1, close - 1);
  if (nameIndex < 0 || !(units[nameIndex] instanceof Common)) {
    throw new Error("LiteralBuilder: 索引签名缺少参数名");
  }
  const nameUnit = units[nameIndex] as Common;
  if (!OperandUtil.IsIdentifier(nameUnit.TempToString())) {
    throw new Error("LiteralBuilder: 索引签名参数名非法");
  }
  const name = IdentifierShape.FromCommon(nameUnit, ItemUtil.PositionOf(units, nameIndex));
  TypeRevisionUtil.SetRevision(name, nameUnit.SourceRange.End);
  const colonIndex = LiteralBuilder.NextCode(units, nameIndex + 1, close - 1);
  if (colonIndex < 0 || !LiteralBuilder.IsSymbol(units[colonIndex], ":")) {
    throw new Error("LiteralBuilder: 索引签名缺少类型");
  }
  const keyType = LiteralBuilder.BuildType(units, colonIndex + 1, close - 1, template);
  const parameter = new ParameterShape(template);
  TypeShape.Finish(parameter, name.Pos, name.SourceRange.Start, keyType.SourceRange.End, [name, keyType]);
  children.push(parameter);
  const returnColon = LiteralBuilder.NextCode(units, close + 1, contentEnd);
  if (returnColon < 0 || !LiteralBuilder.IsSymbol(units[returnColon], ":")) {
    throw new Error("LiteralBuilder: 索引签名缺少返回类型");
  }
  children.push(LiteralBuilder.BuildType(units, returnColon + 1, contentEnd, template));
  const indexed = new IndexSignatureShape(template);
  TypeShape.Finish(indexed, pos, nodeStart, end, children);
  return indexed;
}
const name = LiteralBuilder.BuildPropertyName(units, at);
children.push(name);
at = LiteralBuilder.NextCode(units, at + 1, contentEnd);
if (at >= 0 && LiteralBuilder.IsSymbol(units[at], "?")) {
  const question = QuestionTokenShape.FromUnit(units[at], ItemUtil.PositionOf(units, at));
  TypeRevisionUtil.SetRevision(question, units[at].SourceRange.End);
  children.push(question);
  at = LiteralBuilder.NextCode(units, at + 1, contentEnd);
}
if (at >= 0 && LiteralBuilder.IsSymbol(units[at], "<")) {
  const params = LiteralBuilder.BuildTypeParameterList(units, at, contentEnd, template);
  for (const parameter of params) {
    children.push(parameter);
  }
  const close = LiteralBuilder.MatchAngle(units, at, contentEnd);
  at = LiteralBuilder.NextCode(units, close + 1, contentEnd);
}
if (at >= 0 && LiteralBuilder.IsSymbol(units[at], "(")) {
  const params = LiteralBuilder.BuildParameterList(units, at, contentEnd, template);
  for (const parameter of params) {
    children.push(parameter);
  }
  const close = LiteralBuilder.MatchParen(units, at, contentEnd);
  const colon = LiteralBuilder.NextCode(units, close + 1, contentEnd);
  if (colon < 0 || !LiteralBuilder.IsSymbol(units[colon], ":")) {
    throw new Error("LiteralBuilder: 方法签名缺少返回类型");
  }
  children.push(LiteralBuilder.BuildType(units, colon + 1, contentEnd, template));
  const method = new MethodSignatureShape(template);
  TypeShape.Finish(method, pos, nodeStart, end, children);
  return method;
}
if (at < 0 || !LiteralBuilder.IsSymbol(units[at], ":")) {
  throw new Error("LiteralBuilder: 属性签名缺少类型");
}
children.push(LiteralBuilder.BuildType(units, at + 1, contentEnd, template));
const property = new PropertySignatureShape(template);
TypeShape.Finish(property, pos, nodeStart, end, children);
return property;
```

## static method BuildTupleElement:(units:Array<Token>, start:int, contentEnd:int, host:TupleTypeShape)=>Token

```ts
// 元组元素不吞分隔符（与 TS/legacy 一致：`,` 归元组本身，元素 end 到类型末尾）。
const template = host.Template;
const end = units[contentEnd].SourceRange.End;
let at = LiteralBuilder.NextCode(units, start, contentEnd);
if (at < 0) {
  throw new Error("LiteralBuilder: 元组元素为空");
}
const pos = ItemUtil.PositionOf(units, at);
const nodeStart = units[at].SourceRange.Start;
if (LiteralBuilder.IsSymbol(units[at], "...")) {
  const inner = LiteralBuilder.BuildType(units, at + 1, contentEnd, template);
  const rest = new RestTypeShape(template);
  TypeShape.Finish(rest, pos, nodeStart, inner.SourceRange.End, [inner]);
  return rest;
}
const next = LiteralBuilder.NextCode(units, at + 1, contentEnd);
let namedEnd = -1;
if (next >= 0 && LiteralBuilder.IsSymbol(units[next], ":")) {
  namedEnd = next;
} else if (next >= 0 && LiteralBuilder.IsSymbol(units[next], "?")) {
  const afterQuestion = LiteralBuilder.NextCode(units, next + 1, contentEnd);
  if (afterQuestion >= 0 && LiteralBuilder.IsSymbol(units[afterQuestion], ":")) {
    namedEnd = afterQuestion;
  }
}
const nameUnit = units[at];
if (namedEnd >= 0
    && nameUnit instanceof Common
    && OperandUtil.IsIdentifier(nameUnit.TempToString())
    && !OperandUtil.IsKeyword(nameUnit.TempToString())
    && !TypeBodyUtil.IsKeywordTypeText(nameUnit.TempToString())) {
  const name = IdentifierShape.FromCommon(nameUnit, ItemUtil.PositionOf(units, at));
  TypeRevisionUtil.SetRevision(name, nameUnit.SourceRange.End);
  const children:Array<Token> = [name];
  let colonIndex = next;
  if (!LiteralBuilder.IsSymbol(units[next], ":")) {
    const question = QuestionTokenShape.FromUnit(units[next], ItemUtil.PositionOf(units, next));
    TypeRevisionUtil.SetRevision(question, units[next].SourceRange.End);
    children.push(question);
    colonIndex = LiteralBuilder.NextCode(units, next + 1, contentEnd);
  }
  const type = LiteralBuilder.BuildType(units, colonIndex + 1, contentEnd, template);
  children.push(type);
  const named = new NamedTupleMemberShape(template);
  TypeShape.Finish(named, name.Pos, name.SourceRange.Start, type.SourceRange.End, children);
  return named;
}
const optional = LiteralBuilder.IsSymbol(units[contentEnd], "?");
const typeEnd = optional ? ItemUtil.PreviousCode(units, contentEnd - 1) : contentEnd;
const type = LiteralBuilder.BuildType(units, start, typeEnd, template);
if (!optional) {
  return type;
}
const question = QuestionTokenShape.FromUnit(units[contentEnd], ItemUtil.PositionOf(units, contentEnd));
TypeRevisionUtil.SetRevision(question, units[contentEnd].SourceRange.End);
const shape = new OptionalTypeShape(template);
TypeShape.Finish(shape, TypeShape.PosOfNode(type), type.SourceRange.Start, question.SourceRange.End, [type]);
return shape;
```

## static method FinishMember:(host:TypeLiteralShape, limit:int, inclusive:bool, context:SyntaxContext)=>void

```ts
const units = host.Data;
const start = LiteralBuilder.PendingStart(units, limit);
if (start < 0) {
  if (inclusive) {
    units.splice(limit, 1);
  }
  return;
}
let endIndex = limit;
if (!inclusive) {
  endIndex = LiteralBuilder.PrevCode(units, limit - 1, start);
  if (endIndex < start) {
    return;
  }
}
const member = LiteralBuilder.BuildMember(units, start, endIndex, host);
const removeCount = inclusive ? limit - start + 1 : limit - start;
units.splice(start, removeCount, member);
member.Parent = host;
PossibleShape.StampAll(member, context.Index);
```

## static method FinishElement:(host:TupleTypeShape, limit:int, inclusive:bool, context:SyntaxContext)=>void

```ts
const units = host.Data;
const start = LiteralBuilder.PendingStart(units, limit);
if (start < 0) {
  if (inclusive) {
    units.splice(limit, 1);
  }
  return;
}
const contentEnd = LiteralBuilder.PrevCode(units, limit - 1, start);
if (contentEnd < start) {
  return;
}
const element = LiteralBuilder.BuildTupleElement(units, start, contentEnd, host);
const removeCount = inclusive ? limit - start + 1 : limit - start;
units.splice(start, removeCount, element);
element.Parent = host;
PossibleShape.StampAll(element, context.Index);
```

## static method Dispose:(host:TypeShape, closeText:string)=>void

```ts
const units = host.Data;
let closeIndex = -1;
for (let at = units.length - 1; at >= 0; at--) {
  if (LiteralBuilder.IsSymbol(units[at], closeText)) {
    closeIndex = at;
    break;
  }
}
if (closeIndex < 0) {
  throw new Error("LiteralBuilder: 找不到收口符号 " + closeText);
}
const close = units[closeIndex] as Symbol;
units.splice(closeIndex, 1);
host.Data = host.Data.filter((item) => !item.IsTriviaToken && !item.IsBasicToken);
for (const item of host.Data) {
  item.Parent = host;
}
host.SignOut(close.SourceRange.End);
host.Closed = true;
host.Quit();
```

## static method Claim:(host:Token, self:PossibleShape)=>void

```ts
// 本形态一旦确定（body 就是 `{` / `[`），把同一目录里其它形态从「本轮候选集」摘掉：
// CatalogGuide 要求恰一候选；Reset() 会在建成后自动恢复，别的形态不受影响。
const guide = (host as any).CatalogGuide;
if (guide === null || guide === undefined) {
  return;
}
const shapes = guide.PossibleShapes as Array<PossibleShape>;
const own = shapes.indexOf(self);
for (let at = 0; at < shapes.length; at++) {
  if (at !== own) {
    guide.Candidates.delete(at);
  }
}
```

## static method AliasName:(units:Array<Token>)=>string

```ts
for (let at = 0; at < units.length; at++) {
  const unit = units[at];
  if (!(unit instanceof Symbol) || !unit.Is("=")) {
    continue;
  }
  const before = ItemUtil.PreviousCode(units, at - 1);
  if (before >= 0 && units[before] instanceof IdentifierShape) {
    return (units[before] as IdentifierShape).Text;
  }
  return "";
}
return "";
```

## static method HasNameReference:(units:Array<Token>, name:string)=>bool

```ts
if (name.length === 0) {
  return false;
}
for (const unit of units) {
  if (unit instanceof Common && unit.TempToString() === name) {
    return true;
  }
}
return false;
```

## static method IsMappedBody:(units:Array<Token>, openIndex:int, lastCode:int)=>bool

```ts
// `{ [K in T]: ... }` / `{ +readonly [K in T]: ... }` 是映射类型（T4 的形态），不归本片段。
let at = LiteralBuilder.NextCode(units, openIndex + 1, lastCode);
if (at < 0) {
  return false;
}
if (LiteralBuilder.IsCommon(units[at], "readonly")) {
  at = LiteralBuilder.NextCode(units, at + 1, lastCode);
} else if (LiteralBuilder.IsSymbol(units[at], "+") || LiteralBuilder.IsSymbol(units[at], "-")) {
  at = LiteralBuilder.NextCode(units, at + 1, lastCode);
  if (at >= 0 && LiteralBuilder.IsCommon(units[at], "readonly")) {
    at = LiteralBuilder.NextCode(units, at + 1, lastCode);
  }
}
if (at < 0 || !LiteralBuilder.IsSymbol(units[at], "[")) {
  return false;
}
const nameIndex = LiteralBuilder.NextCode(units, at + 1, lastCode);
if (nameIndex < 0 || !(units[nameIndex] instanceof Common)) {
  return false;
}
const inIndex = LiteralBuilder.NextCode(units, nameIndex + 1, lastCode);
return inIndex >= 0 && LiteralBuilder.IsCommon(units[inIndex], "in");
```

# class TypeLiteralStartPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const tokenIndex = index.Index;
if (!(host instanceof TypeAliasDeclarationShape)) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
if (TypeParameterListShape.IsHeaderOpen(units, tokenIndex)) {
  return ShapeStates.Reject;
}
const bodyStart = TypeBodyUtil.BodyStart(units, tokenIndex, cache);
if (bodyStart < 0 || bodyStart >= units.length) {
  return ShapeStates.Uncertain;
}
if (!LiteralBuilder.IsSymbol(units[bodyStart], "{")) {
  return ShapeStates.Reject;
}
if (!LiteralBuilder.IsCloser(index.At(tokenIndex))) {
  return ShapeStates.Uncertain;
}
if (LiteralBuilder.DepthBefore(units, tokenIndex) !== 1) {
  return ShapeStates.Uncertain;
}
if (LiteralBuilder.IsMappedBody(units, bodyStart, tokenIndex)) {
  return ShapeStates.Reject;
}
const name = LiteralBuilder.AliasName(units);
if (LiteralBuilder.HasNameReference(units.slice(bodyStart + 1, tokenIndex), name)) {
  return ShapeStates.Reject;
}
LiteralBuilder.Claim(host, this);
return ShapeStates.Accept;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const host = index.Host;
const tokenIndex = index.Index;
if (!(host instanceof TypeAliasDeclarationShape)) {
  return false;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
if (TypeParameterListShape.IsHeaderOpen(units, tokenIndex)) {
  return false;
}
const bodyStart = TypeBodyUtil.BodyStart(units, tokenIndex, cache);
if (bodyStart < 0 || bodyStart >= units.length) {
  return false;
}
if (!LiteralBuilder.IsSymbol(units[bodyStart], "{")) {
  return false;
}
if (!LiteralBuilder.IsCloser(index.At(tokenIndex))) {
  return false;
}
if (LiteralBuilder.DepthBefore(units, tokenIndex) !== 1) {
  return false;
}
if (LiteralBuilder.IsMappedBody(units, bodyStart, tokenIndex)) {
  return false;
}
return !LiteralBuilder.HasNameReference(units.slice(bodyStart + 1, tokenIndex), LiteralBuilder.AliasName(units));
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host as TypeAliasDeclarationShape;
const units = host.Data;
const tokenIndex = index.Index;
const bodyStart = TypeBodyUtil.BodyStart(units, tokenIndex, catalog.PossibleShapesComputeCache);
if (bodyStart < 0) {
  throw new Error("TypeLiteralStartPossibleShape: 找不到类型体起点");
}
const open = units[bodyStart] as Symbol;
const literal = new TypeLiteralShape(host.Template);
literal.Pos = ItemUtil.PositionOf(units, bodyStart);
literal.SignIn(open.SourceRange.Start);
const inner = units.splice(bodyStart + 1);
units.splice(bodyStart, 1, literal);
literal.Parent = host;
for (const item of inner) {
  literal.Add(item);
}
host.MountedUnit = literal;
literal.CatalogGuide = new CatalogGuide([new TypeLiteralMemberPossibleShape()], new TypeLiteralEndPossibleShape());
const close = literal.Data.length - 1;
if (LiteralBuilder.IsSymbol(literal.Data[close], "}")) {
  LiteralBuilder.FinishMember(literal, close, false, context);
  LiteralBuilder.Dispose(literal, "}");
} else {
  LiteralBuilder.FinishMember(literal, close, true, context);
}
return this.StampCreated(literal, context);
```

# class TypeLiteralMemberPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const tokenIndex = index.Index;
if (!(host instanceof TypeLiteralShape)) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = index.At(tokenIndex);
if (LiteralBuilder.IsSymbol(unit, "}") && LiteralBuilder.DepthBefore(units, tokenIndex) === 0) {
  return ShapeStates.Reject;
}
if (!LiteralBuilder.IsCloser(unit)) {
  return ShapeStates.Uncertain;
}
if (LiteralBuilder.DepthBefore(units, tokenIndex) !== 0) {
  return ShapeStates.Uncertain;
}
return LiteralBuilder.PendingStart(units, tokenIndex) >= 0 ? ShapeStates.Accept : ShapeStates.Uncertain;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const host = index.Host;
const tokenIndex = index.Index;
if (!(host instanceof TypeLiteralShape)) {
  return false;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!LiteralBuilder.IsCloser(unit)) {
  return false;
}
if (LiteralBuilder.IsSymbol(unit, "}")) {
  return false;
}
if (LiteralBuilder.DepthBefore(units, tokenIndex) !== 0) {
  return false;
}
return LiteralBuilder.PendingStart(units, tokenIndex) >= 0;
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host as TypeLiteralShape;
const tokenIndex = index.Index;
LiteralBuilder.FinishMember(host, tokenIndex, true, context);
return this.StampCreated(host, context);
```

# class TypeLiteralEndPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const tokenIndex = index.Index;
if (!(host instanceof TypeLiteralShape)) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
if (!LiteralBuilder.IsSymbol(index.At(tokenIndex), "}")) {
  return ShapeStates.Uncertain;
}
return LiteralBuilder.DepthBefore(units, tokenIndex) === 0 ? ShapeStates.Accept : ShapeStates.Uncertain;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const host = index.Host;
const tokenIndex = index.Index;
if (!(host instanceof TypeLiteralShape)) {
  return false;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
if (!LiteralBuilder.IsSymbol(units[tokenIndex], "}")) {
  return false;
}
return LiteralBuilder.DepthBefore(units, tokenIndex) === 0;
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host as TypeLiteralShape;
const tokenIndex = index.Index;
const close = host.Data[tokenIndex] as Symbol;
LiteralBuilder.FinishMember(host, tokenIndex, false, context);
LiteralBuilder.Dispose(host, "}");
return this.StampCreated(close, context);
```

# class TupleStartPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const tokenIndex = index.Index;
if (!(host instanceof TypeAliasDeclarationShape)) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
if (TypeParameterListShape.IsHeaderOpen(units, tokenIndex)) {
  return ShapeStates.Reject;
}
const bodyStart = TypeBodyUtil.BodyStart(units, tokenIndex, cache);
if (bodyStart < 0 || bodyStart >= units.length) {
  return ShapeStates.Uncertain;
}
if (!LiteralBuilder.IsSymbol(units[bodyStart], "[")) {
  return ShapeStates.Reject;
}
if (!LiteralBuilder.IsCloser(index.At(tokenIndex)) && !LiteralBuilder.IsSymbol(index.At(tokenIndex), "]")) {
  return ShapeStates.Uncertain;
}
if (LiteralBuilder.DepthBefore(units, tokenIndex) !== 1) {
  return ShapeStates.Uncertain;
}
LiteralBuilder.Claim(host, this);
return ShapeStates.Accept;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const host = index.Host;
const tokenIndex = index.Index;
if (!(host instanceof TypeAliasDeclarationShape)) {
  return false;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
if (TypeParameterListShape.IsHeaderOpen(units, tokenIndex)) {
  return false;
}
const bodyStart = TypeBodyUtil.BodyStart(units, tokenIndex, cache);
if (bodyStart < 0 || bodyStart >= units.length) {
  return false;
}
if (!LiteralBuilder.IsSymbol(units[bodyStart], "[")) {
  return false;
}
const unit = index.At(tokenIndex);
if (!LiteralBuilder.IsCloser(unit) && !LiteralBuilder.IsSymbol(unit, "]")) {
  return false;
}
return LiteralBuilder.DepthBefore(units, tokenIndex) === 1;
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host as TypeAliasDeclarationShape;
const units = host.Data;
const tokenIndex = index.Index;
const bodyStart = TypeBodyUtil.BodyStart(units, tokenIndex, catalog.PossibleShapesComputeCache);
if (bodyStart < 0) {
  throw new Error("TupleStartPossibleShape: 找不到类型体起点");
}
const open = units[bodyStart] as Symbol;
const tuple = new TupleTypeShape(host.Template);
tuple.Pos = ItemUtil.PositionOf(units, bodyStart);
tuple.SignIn(open.SourceRange.Start);
const inner = units.splice(bodyStart + 1);
units.splice(bodyStart, 1, tuple);
tuple.Parent = host;
for (const item of inner) {
  tuple.Add(item);
}
host.MountedUnit = tuple;
tuple.CatalogGuide = new CatalogGuide(
  [new TupleElementPossibleShape(), new TupleRestPossibleShape(), new TupleOptionalPossibleShape()],
  new TupleEndPossibleShape(),
);
const close = tuple.Data.length - 1;
if (LiteralBuilder.IsSymbol(tuple.Data[close], "]")) {
  LiteralBuilder.FinishElement(tuple, close, false, context);
  LiteralBuilder.Dispose(tuple, "]");
} else {
  LiteralBuilder.FinishElement(tuple, close, true, context);
}
return this.StampCreated(tuple, context);
```

# class TupleElementPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const tokenIndex = index.Index;
if (!(host instanceof TupleTypeShape)) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = index.At(tokenIndex);
if (LiteralBuilder.IsSymbol(unit, "]") && LiteralBuilder.DepthBefore(units, tokenIndex) === 0) {
  return ShapeStates.Reject;
}
if (!LiteralBuilder.IsCloser(unit)) {
  return ShapeStates.Uncertain;
}
if (LiteralBuilder.DepthBefore(units, tokenIndex) !== 0) {
  return ShapeStates.Uncertain;
}
const start = LiteralBuilder.PendingStart(units, tokenIndex);
if (start < 0) {
  return ShapeStates.Uncertain;
}
return LiteralBuilder.PendingForm(units, start, tokenIndex) === "plain"
  ? ShapeStates.Accept
  : ShapeStates.Reject;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const host = index.Host;
const tokenIndex = index.Index;
if (!(host instanceof TupleTypeShape)) {
  return false;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!LiteralBuilder.IsCloser(unit)) {
  return false;
}
if (LiteralBuilder.IsSymbol(unit, "]")) {
  return false;
}
if (LiteralBuilder.DepthBefore(units, tokenIndex) !== 0) {
  return false;
}
const start = LiteralBuilder.PendingStart(units, tokenIndex);
return start >= 0 && LiteralBuilder.PendingForm(units, start, tokenIndex) === "plain";
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host as TupleTypeShape;
LiteralBuilder.FinishElement(host, index.Index, true, context);
return this.StampCreated(host, context);
```

# class TupleRestPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const tokenIndex = index.Index;
if (!(host instanceof TupleTypeShape)) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = index.At(tokenIndex);
if (LiteralBuilder.IsSymbol(unit, "]") && LiteralBuilder.DepthBefore(units, tokenIndex) === 0) {
  return ShapeStates.Reject;
}
if (!LiteralBuilder.IsCloser(unit)) {
  return ShapeStates.Uncertain;
}
if (LiteralBuilder.DepthBefore(units, tokenIndex) !== 0) {
  return ShapeStates.Uncertain;
}
const start = LiteralBuilder.PendingStart(units, tokenIndex);
if (start < 0) {
  return ShapeStates.Uncertain;
}
return LiteralBuilder.PendingForm(units, start, tokenIndex) === "rest"
  ? ShapeStates.Accept
  : ShapeStates.Reject;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const host = index.Host;
const tokenIndex = index.Index;
if (!(host instanceof TupleTypeShape)) {
  return false;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!LiteralBuilder.IsCloser(unit)) {
  return false;
}
if (LiteralBuilder.IsSymbol(unit, "]")) {
  return false;
}
if (LiteralBuilder.DepthBefore(units, tokenIndex) !== 0) {
  return false;
}
const start = LiteralBuilder.PendingStart(units, tokenIndex);
return start >= 0 && LiteralBuilder.PendingForm(units, start, tokenIndex) === "rest";
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host as TupleTypeShape;
LiteralBuilder.FinishElement(host, index.Index, true, context);
return this.StampCreated(host, context);
```

# class TupleOptionalPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const tokenIndex = index.Index;
if (!(host instanceof TupleTypeShape)) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = index.At(tokenIndex);
if (LiteralBuilder.IsSymbol(unit, "]") && LiteralBuilder.DepthBefore(units, tokenIndex) === 0) {
  return ShapeStates.Reject;
}
if (!LiteralBuilder.IsCloser(unit)) {
  return ShapeStates.Uncertain;
}
if (LiteralBuilder.DepthBefore(units, tokenIndex) !== 0) {
  return ShapeStates.Uncertain;
}
const start = LiteralBuilder.PendingStart(units, tokenIndex);
if (start < 0) {
  return ShapeStates.Uncertain;
}
return LiteralBuilder.PendingForm(units, start, tokenIndex) === "optional"
  ? ShapeStates.Accept
  : ShapeStates.Reject;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const host = index.Host;
const tokenIndex = index.Index;
if (!(host instanceof TupleTypeShape)) {
  return false;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!LiteralBuilder.IsCloser(unit)) {
  return false;
}
if (LiteralBuilder.IsSymbol(unit, "]")) {
  return false;
}
if (LiteralBuilder.DepthBefore(units, tokenIndex) !== 0) {
  return false;
}
const start = LiteralBuilder.PendingStart(units, tokenIndex);
return start >= 0 && LiteralBuilder.PendingForm(units, start, tokenIndex) === "optional";
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host as TupleTypeShape;
LiteralBuilder.FinishElement(host, index.Index, true, context);
return this.StampCreated(host, context);
```

# class TupleEndPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const tokenIndex = index.Index;
if (!(host instanceof TupleTypeShape)) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
if (!LiteralBuilder.IsSymbol(index.At(tokenIndex), "]")) {
  return ShapeStates.Uncertain;
}
return LiteralBuilder.DepthBefore(units, tokenIndex) === 0 ? ShapeStates.Accept : ShapeStates.Uncertain;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const host = index.Host;
const tokenIndex = index.Index;
if (!(host instanceof TupleTypeShape)) {
  return false;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
if (!LiteralBuilder.IsSymbol(units[tokenIndex], "]")) {
  return false;
}
return LiteralBuilder.DepthBefore(units, tokenIndex) === 0;
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host as TupleTypeShape;
const tokenIndex = index.Index;
const close = host.Data[tokenIndex] as Symbol;
LiteralBuilder.FinishElement(host, tokenIndex, false, context);
LiteralBuilder.Dispose(host, "]");
return this.StampCreated(close, context);
```

# class LiteralFragments

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

```ts
// T2：复合字面量族（object literal 全变体 + tuple 全变体）。
// 两个「body 起始位」候选挂在 alias 目录里；元素/成员候选由容器自己的 CatalogGuide 持有。
shapes.push(new TypeLiteralStartPossibleShape());
shapes.push(new TupleStartPossibleShape());
shapes.push(new TupleElementPossibleShape());
shapes.push(new TupleRestPossibleShape());
shapes.push(new TupleOptionalPossibleShape());
```
