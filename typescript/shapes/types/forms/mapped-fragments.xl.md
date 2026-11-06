# dependencies
```xl
import { Common } from "../../../../core/syntax/basic-tokens/common.xl.md"
import { InterpolationString } from "../../../../core/syntax/basic-tokens/string/interpolation-string.xl.md"
import { String } from "../../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../../core/syntax/basic-tokens/symbol.xl.md"
import { CatalogGuide } from "../../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { TokenIndex } from "../../../../core/syntax/token-index.xl.md"
import { ItemUtil } from "../../item-util.xl.md"
import { OperandUtil } from "../../expressions/operand-util.xl.md"
import { IdentifierShape } from "../../names/identifier-shape.xl.md"
import { StringLiteralShape } from "../../literals/string-literal-shape.xl.md"
import { MinusTokenShape } from "../../punctuation/binary-operator-token-shapes.xl.md"
import { PlusTokenShape } from "../../punctuation/plus-token-shape.xl.md"
import { IndexedAccessTypeShape } from "../type-node-shapes.xl.md"
import { LiteralTypeShape } from "../type-node-shapes.xl.md"
import { MappedTypeShape } from "../type-node-shapes.xl.md"
import { TemplateHeadShape } from "../type-node-shapes.xl.md"
import { TemplateLiteralTypeShape } from "../type-node-shapes.xl.md"
import { TemplateLiteralTypeSpanShape } from "../type-node-shapes.xl.md"
import { TemplateMiddleShape } from "../type-node-shapes.xl.md"
import { TemplateTailShape } from "../type-node-shapes.xl.md"
import { TypeOperatorShape } from "../type-node-shapes.xl.md"
import { TypeParameterShape } from "../type-node-shapes.xl.md"
import { TypeReferenceShape } from "../type-node-shapes.xl.md"
import { QuestionTokenShape } from "../type-token-shapes.xl.md"
import { ReadonlyKeywordShape } from "../type-token-shapes.xl.md"
import { ShapeToken } from "../../../../core/syntax/shape-token.xl.md"
import { TypeShape } from "../type-shape.xl.md"
import { TypeAliasDeclarationShape } from "../type-alias-declaration-shape.xl.md"
import { TypeAliasChainPossibleShape } from "../type-conditional-chain.xl.md"
import { TypeFunctionArrowPossibleShape } from "../type-function-incremental.xl.md"
import { TypeBodyUtil } from "../type-body-util.xl.md"
import { TypeConditionalScan } from "../type-conditional-scan-util.xl.md"
import { TypeKeywordUtil } from "../type-keyword-util.xl.md"
import { TypeParameterListShape } from "../type-parameter-list-shape.xl.md"
import { TypeRevisionUtil } from "../type-revision-util.xl.md"
```


# namespace cangjie

# class MappedFragments

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

```ts
// T4：映射 / 模板 / 索引族。只有两个「body 起始位」候选需要进目录：
//   `{` → MappedTypeStartPossibleShape（映射类型 `{ [K in T]: ... }`）
//   `` ` `` → TemplateLiteralTypePossibleShape（带插值的模板字面量类型）
// 其余四个类是本族的分片构造器（key / modifier / remap / indexed-access），
// 由上面两个候选在构建整棵子树时按顺序调用，不占候选位——它们若也占位，
// 会与已增量的 `alias-indexed-access` / `alias-template-infer` 抢唯一候选位。
shapes.push(new MappedTypeStartPossibleShape());
shapes.push(new TemplateLiteralTypePossibleShape());
```

## static field SlotCloseBracket:int = 0

## static field SlotPrefix:int = 1

## static field SlotName:int = 2

## static field SlotConstraintFrom:int = 3

## static field SlotConstraintTo:int = 4

## static field SlotRemapFrom:int = 5

## static field SlotRemapTo:int = 6

## static field SlotSuffix:int = 7

## static field SlotValueFrom:int = 8

## static field SlotValueTo:int = 9

## static method ReleaseSticky:(hoster:TypeAliasDeclarationShape)=>void

```ts
// 唯一候选不变量：只有「其它候选都 Reject」时 guide 才会让剩下那一个 IsBuildable 的候选构建。
// TypeAliasChainPossibleShape（在等 `extends ? :`）与 TypeFunctionArrowPossibleShape（只管 `=>` 之后的返回类型）
// 对「不是它们形态、但 body 已经存在」的输入恒返回 Uncertain，会永久占着候选位：实测
// `type A<T> = { [K in keyof T]: T[K] }` 在最后的 `}` 处候选只剩 Chain 一个，guide 永远不构建。
// 这两个文件不属于 T4、不能改它们的判定；因此本族在**确认 body 形态之后**，只把这两个粘性候选
// 从本 alias 的 guide.Candidates 里移出，不碰它们的形状、不碰其它宿主的 guide。
// 若最终本族仍无法构建（映射没闭合），别名结束时照旧走 Close 兜底，树与基线一致。
const guide = hoster.CatalogGuide;
if (guide === null) {
  return;
}
for (let at = 0; at < guide.PossibleShapes.length; at++) {
  const shape = guide.PossibleShapes[at];
  if (shape instanceof TypeAliasChainPossibleShape || shape instanceof TypeFunctionArrowPossibleShape) {
    guide.Candidates.delete(at);
  }
}
```

## static method BodyIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>int

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return -1;
}
// 类型参数表头（`type A<T>` 的 `<` 之后）那一格由 TypeParameterListOpenPossibleShape 独占，本族让位。
if (TypeParameterListShape.IsHeaderOpen(units, tokenIndex)) {
  return -1;
}
return TypeBodyUtil.BodyStart(units, tokenIndex, cache);
```

## static method NextCode:(units:Array<Token>, from:int)=>int

```ts
if (from < 0 || from >= units.length) {
  return -1;
}
return TypeConditionalScan.FirstCodeIndex(units, from, units.length);
```

## static method Filled:(node:Token, pos:int, start:int, end:int, children:Array<Token>)=>Token

```ts
// 与 TypeParser.Node 同义：Finish + MarkRevision，保证 CreatedRevisionAt 与兜底路径逐字一致。
TypeShape.Finish(node as TypeShape, pos, start, end, children);
TypeRevisionUtil.MarkRevision(node as TypeShape, start, end);
return node;
```

## static method PrefixState:(units:Array<Token>, bodyIndex:int)=>int

```ts
// 0 = 确定不是映射类型（可以永久 Reject）；1 = 仍是映射类型的前缀（Uncertain）；2 = 映射头已确认。
// 只在 body 起始是 `{` 时调用。
let at = MappedFragments.NextCode(units, bodyIndex + 1);
if (at < 0) {
  return 1;
}
const first = units[at];
if (first instanceof Symbol && first.Closed && (first.Is("+") || first.Is("-"))) {
  at = MappedFragments.NextCode(units, at + 1);
  if (at < 0) {
    return 1;
  }
  const readonly = units[at];
  if (readonly instanceof Common && readonly.Closed && readonly.TempToString() === "readonly") {
    at = MappedFragments.NextCode(units, at + 1);
    if (at < 0) {
      return 1;
    }
  }
} else if (first instanceof Common && first.Closed && first.TempToString() === "readonly") {
  at = MappedFragments.NextCode(units, at + 1);
  if (at < 0) {
    return 1;
  }
}
const open = units[at];
if (!(open instanceof Symbol)) {
  return 0;
}
if (!open.Closed) {
  return 1;
}
if (!open.Is("[")) {
  return 0;
}
at = MappedFragments.NextCode(units, at + 1);
if (at < 0) {
  return 1;
}
const name = units[at];
if (!(name instanceof Common)) {
  return 0;
}
if (!name.Closed) {
  return 1;
}
if (!OperandUtil.IsIdentifier(name.TempToString())) {
  return 0;
}
at = MappedFragments.NextCode(units, at + 1);
if (at < 0) {
  return 1;
}
const inUnit = units[at];
if (!(inUnit instanceof Common)) {
  return 0;
}
if (!inUnit.Closed) {
  return 1;
}
if (inUnit.TempToString() !== "in") {
  return 0;
}
return 2;
```

## static method AtomEnd:(units:Array<Token>, from:int, limit:int)=>int

```ts
// 单原子类型的最后一个码位（limit 为开区间上界）；不认识 → -1（于是整条映射不构建，留给 Close 兜底）。
if (from < 0 || from >= limit) {
  return -1;
}
const unit = units[from];
if (unit instanceof String) {
  return unit.Closed ? from : -1;
}
if (!(unit instanceof Common) || !unit.Closed) {
  return -1;
}
const text = unit.TempToString();
if (text === "keyof" || text === "readonly" || text === "unique") {
  const operand = MappedFragments.NextCode(units, from + 1);
  if (operand < 0 || operand >= limit) {
    return -1;
  }
  return MappedFragments.AtomEnd(units, operand, limit);
}
if (TypeBodyUtil.IsKeywordTypeText(text)) {
  return from;
}
if (OperandUtil.IsKeyword(text) || !OperandUtil.IsIdentifier(text)) {
  return -1;
}
return from;
```

## static method ValueEnd:(units:Array<Token>, from:int, limit:int)=>int

```ts
// 映射类型的值类型：一个原子，后面可以跟任意多个 `[原子]`（IndexedAccess 后缀）。
let end = MappedFragments.AtomEnd(units, from, limit);
if (end < 0) {
  return -1;
}
while (true) {
  const open = MappedFragments.NextCode(units, end + 1);
  if (open < 0 || open >= limit) {
    break;
  }
  const bracket = units[open];
  if (!(bracket instanceof Symbol) || !bracket.Closed || !bracket.Is("[")) {
    break;
  }
  const inner = MappedFragments.NextCode(units, open + 1);
  if (inner < 0 || inner >= limit) {
    return -1;
  }
  const innerEnd = MappedFragments.AtomEnd(units, inner, limit);
  if (innerEnd < 0) {
    return -1;
  }
  const close = MappedFragments.NextCode(units, innerEnd + 1);
  if (close < 0 || close >= limit) {
    return -1;
  }
  const closeUnit = units[close];
  if (!(closeUnit instanceof Symbol) || !closeUnit.Closed || !closeUnit.Is("]")) {
    return -1;
  }
  end = close;
}
return end;
```

## static method Atom:(units:Array<Token>, from:int, to:int)=>Token

```ts
// 把 [from,to] 这一段单原子类型构造出来（与 TypeParser.ParseType 对同一段输入的产物逐字一致）。
if (from < 0 || to < from || to >= units.length) {
  throw new Error("MappedFragments: 原子类型区间不合法");
}
const unit = units[from];
const template = unit.Template;
if (unit instanceof String) {
  if (!unit.Closed) {
    throw new Error("MappedFragments: 字符串字面量类型未闭合");
  }
  if (!unit.IsSupportInterpolation) {
    const literal = StringLiteralShape.FromString(unit, ItemUtil.PositionOf(units, from));
    TypeRevisionUtil.SetRevision(literal, unit.SourceRange.End);
    const shape = new LiteralTypeShape(template);
    MappedFragments.Filled(shape, literal.Pos, unit.SourceRange.Start, unit.SourceRange.End, [literal]);
    return shape;
  }
  return TemplateLiteralTypePossibleShape.Build(unit, ItemUtil.PositionOf(units, from));
}
const common = unit as Common;
const text = common.TempToString();
if (text === "keyof" || text === "readonly" || text === "unique") {
  const operandIndex = MappedFragments.NextCode(units, from + 1);
  if (operandIndex < 0 || operandIndex > to) {
    throw new Error("MappedFragments: 类型运算符缺少操作数");
  }
  const operand = MappedFragments.Atom(units, operandIndex, to);
  const operator = new TypeOperatorShape(template);
  operator.Keyword = text;
  MappedFragments.Filled(operator, ItemUtil.PositionOf(units, from), common.SourceRange.Start, operand.SourceRange.End, [operand]);
  return operator;
}
if (TypeBodyUtil.IsKeywordTypeText(text)) {
  const keyword = TypeKeywordUtil.KeywordTypeOf(common, ItemUtil.PositionOf(units, from));
  if (keyword === null) {
    throw new Error("MappedFragments: 关键字类型无法构造");
  }
  return keyword;
}
const identifier = IdentifierShape.FromCommon(common, ItemUtil.PositionOf(units, from));
TypeRevisionUtil.SetRevision(identifier, common.SourceRange.End);
const reference = new TypeReferenceShape(template);
MappedFragments.Filled(reference, identifier.Pos, common.SourceRange.Start, common.SourceRange.End, [identifier]);
return reference;
```

## static method EmptySlots:()=>Array<int>

```ts
// 布局槽位的空表（`Array<int>` 只能出现在签名里：函数体里的类型注记不参与目标语言映射）。
return [];
```

## static method Scan:(units:Array<Token>, openIndex:int, closeIndex:int)=>Array<int>

```ts
// 把 `{ ... }` 整段扫成一份布局；返回空数组 = 这一段不是可构建的映射类型。
// 槽位见 Slot* 常量：closeBracket / prefix / name / constraint[from,to] / remap[from,to] / suffix / value[from,to]。
const out = MappedFragments.EmptySlots();
if (openIndex < 0 || closeIndex <= openIndex || closeIndex >= units.length) {
  return out;
}
if (MappedFragments.PrefixState(units, openIndex) !== 2) {
  return out;
}
let at = MappedFragments.NextCode(units, openIndex + 1);
let prefixIndex = -1;
const first = units[at];
if (first instanceof Symbol && first.Closed && (first.Is("+") || first.Is("-"))) {
  prefixIndex = at;
  at = MappedFragments.NextCode(units, at + 1);
  if (at < 0) {
    return out;
  }
  const readonly = units[at];
  if (readonly instanceof Common && readonly.Closed && readonly.TempToString() === "readonly") {
    at = MappedFragments.NextCode(units, at + 1);
  }
} else if (first instanceof Common && first.Closed && first.TempToString() === "readonly") {
  prefixIndex = at;
  at = MappedFragments.NextCode(units, at + 1);
}
if (at < 0) {
  return out;
}
const openBracket = at;
const open = units[at];
if (!(open instanceof Symbol) || !open.Closed || !open.Is("[")) {
  return out;
}
const nameIndex = MappedFragments.NextCode(units, at + 1);
if (nameIndex < 0) {
  return out;
}
const name = units[nameIndex];
if (!(name instanceof Common) || !name.Closed || !OperandUtil.IsIdentifier(name.TempToString())) {
  return out;
}
const inIndex = MappedFragments.NextCode(units, nameIndex + 1);
if (inIndex < 0) {
  return out;
}
const inUnit = units[inIndex];
if (!(inUnit instanceof Common) || !inUnit.Closed || inUnit.TempToString() !== "in") {
  return out;
}
const constraintFrom = MappedFragments.NextCode(units, inIndex + 1);
if (constraintFrom < 0 || constraintFrom >= closeIndex) {
  return out;
}
// 找与 openBracket 配对的 `]`（限定在 closeIndex 之前）。
let depth = 0;
let closeBracket = -1;
for (let at2 = openBracket; at2 < closeIndex; at2++) {
  const unit = units[at2];
  if (!(unit instanceof Symbol) || !unit.Closed) {
    continue;
  }
  if (unit.Is("[")) {
    depth++;
    continue;
  }
  if (unit.Is("]")) {
    depth--;
    if (depth === 0) {
      closeBracket = at2;
      break;
    }
  }
}
if (closeBracket < 0) {
  return out;
}
const constraintTo = MappedFragments.AtomEnd(units, constraintFrom, closeBracket);
if (constraintTo < 0) {
  return out;
}
const afterConstraint = MappedFragments.NextCode(units, constraintTo + 1);
let remapFrom = -1;
let remapTo = -1;
if (afterConstraint >= 0 && afterConstraint < closeBracket) {
  const asUnit = units[afterConstraint];
  if (!(asUnit instanceof Common) || !asUnit.Closed || asUnit.TempToString() !== "as") {
    return out;
  }
  remapFrom = MappedFragments.NextCode(units, afterConstraint + 1);
  if (remapFrom < 0 || remapFrom >= closeBracket) {
    return out;
  }
  remapTo = MappedFragments.AtomEnd(units, remapFrom, closeBracket);
  if (remapTo < 0) {
    return out;
  }
  if (MappedFragments.NextCode(units, remapTo + 1) !== closeBracket) {
    return out;
  }
} else if (afterConstraint !== closeBracket) {
  return out;
}
let after = MappedFragments.NextCode(units, closeBracket + 1);
if (after < 0) {
  return out;
}
let suffixIndex = -1;
const suffix = units[after];
if (suffix instanceof Symbol && suffix.Closed && suffix.Is("?")) {
  suffixIndex = after;
  after = MappedFragments.NextCode(units, after + 1);
} else if (suffix instanceof Symbol && suffix.Closed && (suffix.Is("+") || suffix.Is("-"))) {
  suffixIndex = after;
  after = MappedFragments.NextCode(units, after + 1);
  if (after < 0) {
    return out;
  }
  const question = units[after];
  if (question instanceof Symbol && question.Closed && question.Is("?")) {
    after = MappedFragments.NextCode(units, after + 1);
  }
}
if (after < 0) {
  return out;
}
const colon = units[after];
if (!(colon instanceof Symbol) || !colon.Closed || !colon.Is(":")) {
  return out;
}
const valueFrom = MappedFragments.NextCode(units, after + 1);
if (valueFrom < 0 || valueFrom >= closeIndex) {
  return out;
}
const valueTo = MappedFragments.ValueEnd(units, valueFrom, closeIndex);
if (valueTo < 0) {
  return out;
}
if (MappedFragments.NextCode(units, valueTo + 1) !== closeIndex) {
  return out;
}
out.push(closeBracket, prefixIndex, nameIndex, constraintFrom, constraintTo, remapFrom, remapTo, suffixIndex, valueFrom, valueTo);
return out;
```

## static method BuildMapped:(units:Array<Token>, openIndex:int, closeIndex:int)=>Token

```ts
const slots = MappedFragments.Scan(units, openIndex, closeIndex);
if (slots.length === 0) {
  throw new Error("MappedFragments: 映射类型不完整，无法构建");
}
const open = units[openIndex] as Symbol;
const close = units[closeIndex] as Symbol;
const template = open.Template;
const children:Array<Token> = [];
const prefixIndex = slots[MappedFragments.SlotPrefix];
if (prefixIndex >= 0) {
  children.push(MappedModifierPossibleShape.Prefix(units, prefixIndex));
}
children.push(MappedKeyPossibleShape.Build(
  units,
  slots[MappedFragments.SlotName],
  slots[MappedFragments.SlotConstraintFrom],
  slots[MappedFragments.SlotConstraintTo],
));
const remapFrom = slots[MappedFragments.SlotRemapFrom];
if (remapFrom >= 0) {
  children.push(MappedRemapPossibleShape.Build(units, remapFrom, slots[MappedFragments.SlotRemapTo]));
}
const suffixIndex = slots[MappedFragments.SlotSuffix];
if (suffixIndex >= 0) {
  children.push(MappedModifierPossibleShape.Suffix(units, suffixIndex));
}
children.push(IndexedAccessPossibleShape.Build(units, slots[MappedFragments.SlotValueFrom], slots[MappedFragments.SlotValueTo]));
const mapped = new MappedTypeShape(template);
MappedFragments.Filled(mapped, ItemUtil.PositionOf(units, openIndex), open.SourceRange.Start, close.SourceRange.End, children);
return mapped;
```

# class MappedTypeStartPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const tokenIndex = index.Index;
if (!(host instanceof TypeAliasDeclarationShape)) {
  return ShapeStates.Reject;
}
const units = host.Data;
// 类型参数表头（`type A<T>` 的 `<` 那一格）由 TypeParameterListOpenPossibleShape 独占：
// 本族在这一格必须 Reject（而不是 Uncertain），否则表头不是唯一候选、表头永远建不出来。
if (TypeParameterListShape.IsHeaderOpen(units, tokenIndex)) {
  return ShapeStates.Reject;
}
const bodyIndex = MappedFragments.BodyIndex(units, tokenIndex, cache);
if (bodyIndex < 0) {
  return ShapeStates.Uncertain;
}
const open = units[bodyIndex];
if (!(open instanceof Symbol) || !open.Is("{")) {
  return ShapeStates.Reject;
}
if (!open.Closed) {
  return ShapeStates.Uncertain;
}
const state = MappedFragments.PrefixState(units, bodyIndex);
if (state === 0) {
  return ShapeStates.Reject;
}
if (state === 2) {
  MappedFragments.ReleaseSticky(host as TypeAliasDeclarationShape);
}
return MappedTypeStartPossibleShape.IsReady(units, bodyIndex, tokenIndex) ? ShapeStates.Accept : ShapeStates.Uncertain;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
const bodyIndex = MappedFragments.BodyIndex(units, tokenIndex, cache);
if (bodyIndex < 0) {
  return false;
}
return MappedTypeStartPossibleShape.IsReady(units, bodyIndex, tokenIndex);
```

## private static method IsReady:(units:Array<Token>, bodyIndex:int, tokenIndex:int)=>bool

```ts
if (tokenIndex !== units.length - 1) {
  return false;
}
const close = units[tokenIndex];
if (!(close instanceof Symbol) || !close.Closed || !close.Is("}")) {
  return false;
}
return MappedFragments.Scan(units, bodyIndex, tokenIndex).length > 0;
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const alias = host as TypeAliasDeclarationShape;
const units = alias.Data;
const tokenIndex = index.Index;
const bodyIndex = MappedFragments.BodyIndex(units, tokenIndex, catalog.PossibleShapesComputeCache);
if (bodyIndex < 0) {
  throw new Error("MappedTypeStartPossibleShape: 找不到别名正文起点");
}
const mapped = MappedFragments.BuildMapped(units, bodyIndex, tokenIndex);
units.splice(bodyIndex, tokenIndex - bodyIndex + 1, mapped);
mapped.Parent = alias;
return this.StampCreated(mapped, context);
```

# class TemplateLiteralTypePossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const tokenIndex = index.Index;
if (!(host instanceof TypeAliasDeclarationShape)) {
  return ShapeStates.Reject;
}
const units = host.Data;
// 同 MappedTypeStartPossibleShape：表头那一格必须让位给 TypeParameterListOpenPossibleShape。
if (TypeParameterListShape.IsHeaderOpen(units, tokenIndex)) {
  return ShapeStates.Reject;
}
const bodyIndex = MappedFragments.BodyIndex(units, tokenIndex, cache);
if (bodyIndex < 0) {
  return ShapeStates.Uncertain;
}
const unit = units[bodyIndex];
if (!(unit instanceof String)) {
  return ShapeStates.Reject;
}
// 无插值的普通字符串字面量归 T1 的 LiteralTypePossibleShape，本形态不抢。
if (!unit.IsSupportInterpolation) {
  return ShapeStates.Reject;
}
MappedFragments.ReleaseSticky(host as TypeAliasDeclarationShape);
return TemplateLiteralTypePossibleShape.IsReady(units, bodyIndex, tokenIndex) ? ShapeStates.Accept : ShapeStates.Uncertain;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
const bodyIndex = MappedFragments.BodyIndex(units, tokenIndex, cache);
if (bodyIndex < 0) {
  return false;
}
return TemplateLiteralTypePossibleShape.IsReady(units, bodyIndex, tokenIndex);
```

## private static method IsReady:(units:Array<Token>, bodyIndex:int, tokenIndex:int)=>bool

```ts
if (tokenIndex !== units.length - 1 || bodyIndex !== tokenIndex) {
  return false;
}
const unit = units[bodyIndex];
if (!(unit instanceof String) || !unit.Closed || !unit.IsSupportInterpolation) {
  return false;
}
return TemplateLiteralTypePossibleShape.IsBuildableString(unit);
```

## private static method IsBuildableString:(string:String)=>bool

```ts
// 每个插值里必须正好一个「单原子」类型；更复杂的插值交回 Close 兜底。
let count = 0;
for (const item of string.Data) {
  if (!(item instanceof InterpolationString)) {
    continue;
  }
  count++;
  const tokens = item.Data;
  let first = -1;
  for (let at = 0; at < tokens.length; at++) {
    if (tokens[at].IsTriviaToken) {
      continue;
    }
    if (first >= 0) {
      return false;
    }
    first = at;
  }
  if (first < 0) {
    return false;
  }
  if (MappedFragments.AtomEnd(tokens, first, tokens.length) !== first) {
    return false;
  }
}
return count > 0;
```

## static method Build:(string:String, pos:int)=>Token

```ts
// 与 TypeParser.ParseTemplateLiteralType 逐字一致：Head + 每个插值一个 Span(inner, Tail/Middle)。
const interpolations:Array<InterpolationString> = [];
for (const item of string.Data) {
  if (item instanceof InterpolationString) {
    interpolations.push(item);
  }
}
if (interpolations.length === 0) {
  throw new Error("TemplateLiteralTypePossibleShape: 没有插值");
}
const template = string.Template;
const headEnd = interpolations[0].SourceRange.Start + 1;
const head = new TemplateHeadShape(template);
MappedFragments.Filled(head, pos, string.SourceRange.Start, headEnd, []);
const children:Array<Token> = [head];
for (let at = 0; at < interpolations.length; at++) {
  const interpolation = interpolations[at];
  const tokens = interpolation.Data;
  let first = -1;
  for (let index = 0; index < tokens.length; index++) {
    if (!tokens[index].IsTriviaToken) {
      first = index;
      break;
    }
  }
  if (first < 0) {
    throw new Error("TemplateLiteralTypePossibleShape: 插值为空");
  }
  const inner = MappedFragments.Atom(tokens, first, first);
  const tailStart = interpolation.SourceRange.End - 1;
  let segmentEnd = string.SourceRange.End;
  let tail:Token;
  if (at + 1 < interpolations.length) {
    segmentEnd = interpolations[at + 1].SourceRange.Start + 1;
    const middle = new TemplateMiddleShape(template);
    MappedFragments.Filled(middle, tailStart, tailStart, segmentEnd, []);
    tail = middle;
  } else {
    const last = new TemplateTailShape(template);
    MappedFragments.Filled(last, tailStart, tailStart, segmentEnd, []);
    tail = last;
  }
  const span = new TemplateLiteralTypeSpanShape(template);
  MappedFragments.Filled(span, interpolation.SourceRange.Start + 1, inner.SourceRange.Start, segmentEnd, [inner, tail]);
  children.push(span);
}
const literal = new TemplateLiteralTypeShape(template);
MappedFragments.Filled(literal, pos, string.SourceRange.Start, string.SourceRange.End, children);
return literal;
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const alias = host as TypeAliasDeclarationShape;
const units = alias.Data;
const tokenIndex = index.Index;
const bodyIndex = MappedFragments.BodyIndex(units, tokenIndex, catalog.PossibleShapesComputeCache);
if (bodyIndex < 0) {
  throw new Error("TemplateLiteralTypePossibleShape: 找不到别名正文起点");
}
const string = units[bodyIndex] as String;
const literal = TemplateLiteralTypePossibleShape.Build(string, ItemUtil.PositionOf(units, bodyIndex));
units.splice(bodyIndex, 1, literal);
literal.Parent = alias;
return this.StampCreated(literal, context);
```

# class MappedKeyPossibleShape

## static method Build:(units:Array<Token>, nameIndex:int, constraintFrom:int, constraintTo:int)=>Token

```ts
// `[K in <约束>]` → TypeParameter{ Identifier K, <约束类型> }，pos 取名字的 Pos（与兜底一致）。
const nameUnit = units[nameIndex] as Common;
const name = IdentifierShape.FromCommon(nameUnit, ItemUtil.PositionOf(units, nameIndex));
TypeRevisionUtil.SetRevision(name, nameUnit.SourceRange.End);
const constraint = MappedFragments.Atom(units, constraintFrom, constraintTo);
const parameter = new TypeParameterShape(nameUnit.Template);
MappedFragments.Filled(parameter, name.Pos, nameUnit.SourceRange.Start, constraint.SourceRange.End, [name, constraint]);
return parameter;
```

# class MappedModifierPossibleShape

## static method Prefix:(units:Array<Token>, index:int)=>Token

```ts
// `readonly` / `+readonly` / `-readonly`：`+`/`-` 建 Plus/MinusToken，rest 中的 `readonly` 被吞掉（与兜底一致）。
const unit = units[index];
if (unit instanceof Common) {
  const keyword = ReadonlyKeywordShape.FromUnit(unit, ItemUtil.PositionOf(units, index));
  TypeRevisionUtil.SetRevision(keyword, unit.SourceRange.End);
  return keyword;
}
return MappedModifierPossibleShape.SymbolModifier(unit, ItemUtil.PositionOf(units, index));
```

## static method Suffix:(units:Array<Token>, index:int)=>Token

```ts
// `?` / `+?` / `-?`：`+?` 只建 PlusToken，`?` 被吞掉（与兜底一致）。
const unit = units[index];
if (unit instanceof Symbol && unit.Is("?")) {
  const question = QuestionTokenShape.FromUnit(unit, ItemUtil.PositionOf(units, index));
  TypeRevisionUtil.SetRevision(question, unit.SourceRange.End);
  return question;
}
return MappedModifierPossibleShape.SymbolModifier(unit, ItemUtil.PositionOf(units, index));
```

## private static method SymbolModifier:(unit:Token, pos:int)=>Token

```ts
if (unit instanceof Symbol && unit.Is("+")) {
  const plus = PlusTokenShape.FromSymbol(unit, pos);
  TypeRevisionUtil.SetRevision(plus, unit.SourceRange.End);
  return plus;
}
if (unit instanceof Symbol && unit.Is("-")) {
  const minus = MinusTokenShape.FromSymbol(unit, pos);
  TypeRevisionUtil.SetRevision(minus, unit.SourceRange.End);
  return minus;
}
throw new Error("MappedModifierPossibleShape: 不是映射修饰符");
```

# class MappedRemapPossibleShape

## static method Build:(units:Array<Token>, from:int, to:int)=>Token

```ts
// `as <类型>`：重映射类型同样走单原子构造（本 WP 的目标形态是模板字面量 `` `get${K}` ``）。
return MappedFragments.Atom(units, from, to);
```

# class IndexedAccessPossibleShape

## static method Build:(units:Array<Token>, from:int, to:int)=>Token

```ts
// 映射类型的值类型 `T[K]`（可链式 `T[K]["x"]`）：与 TypeParser.ParsePostfix 的 IndexedAccess 逐字一致。
const template = units[from].Template;
let end = MappedFragments.AtomEnd(units, from, to + 1);
if (end < 0) {
  throw new Error("IndexedAccessPossibleShape: 值类型不合法");
}
let node = MappedFragments.Atom(units, from, end);
while (end < to) {
  const open = MappedFragments.NextCode(units, end + 1);
  const openUnit = open < 0 ? null : units[open];
  if (openUnit === null || !(openUnit instanceof Symbol) || !openUnit.Closed || !openUnit.Is("[")) {
    throw new Error("IndexedAccessPossibleShape: 期望索引访问的下标");
  }
  const inner = MappedFragments.NextCode(units, open + 1);
  if (inner < 0) {
    throw new Error("IndexedAccessPossibleShape: 索引访问缺下标");
  }
  const innerEnd = MappedFragments.AtomEnd(units, inner, to + 1);
  if (innerEnd < 0) {
    throw new Error("IndexedAccessPossibleShape: 下标类型不合法");
  }
  const closeIndex = MappedFragments.NextCode(units, innerEnd + 1);
  if (closeIndex < 0) {
    throw new Error("IndexedAccessPossibleShape: 索引访问缺右括号");
  }
  const close = units[closeIndex] as Symbol;
  const indexType = MappedFragments.Atom(units, inner, innerEnd);
  const indexed = new IndexedAccessTypeShape(template);
  MappedFragments.Filled(indexed, TypeShape.PosOfNode(node), node.SourceRange.Start, close.SourceRange.End, [node, indexType]);
  node = indexed;
  end = closeIndex;
}
if (end !== to) {
  throw new Error("IndexedAccessPossibleShape: 值类型之后仍有多余单元");
}
return node;
```
