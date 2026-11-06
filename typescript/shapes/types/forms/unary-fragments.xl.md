# dependencies
```xl
import { CatalogGuide } from "../../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../../core/syntax/shape-states.xl.md"
import { SourceRange } from "../../../../core/syntax/source-range.xl.md"
import { String } from "../../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { TokenIndex } from "../../../../core/syntax/token-index.xl.md"
import { ItemUtil } from "../../item-util.xl.md"
import { OperandUtil } from "../../expressions/operand-util.xl.md"
import { IdentifierShape } from "../../names/identifier-shape.xl.md"
import { StringLiteralShape } from "../../literals/string-literal-shape.xl.md"
import { ArrayTypeShape } from "../type-node-shapes.xl.md"
import { ImportTypeShape } from "../type-node-shapes.xl.md"
import { LiteralTypeShape } from "../type-node-shapes.xl.md"
import { ParenthesizedTypeShape } from "../type-node-shapes.xl.md"
import { TypeOperatorShape } from "../type-node-shapes.xl.md"
import { TypeQueryShape } from "../type-node-shapes.xl.md"
import { TypeReferenceShape } from "../type-node-shapes.xl.md"
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

# class UnaryFragments

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

```ts
// T1：一元与叶子族（type-operator / type-query / literal / import-type / parenthesized）。
shapes.push(new TypeOperatorStartPossibleShape());
shapes.push(new TypeQueryStartPossibleShape());
shapes.push(new LiteralTypePossibleShape());
shapes.push(new ImportTypePossibleShape());
shapes.push(new ParenthesizedTypePossibleShape());
```

## static method ReleaseSticky:(hoster:TypeAliasDeclarationShape)=>void

```ts
// 唯一候选不变量：只有「其它候选都 Reject」时 guide 才会让剩下那一个 IsBuildable 的候选构建。
// 而 TypeAliasChainPossibleShape（在等 `extends ? :`）与 TypeFunctionArrowPossibleShape（只管 `=>` 之后的返回类型）
// 对「不是它们形态、但 body 已经存在」的输入一律返回 Uncertain，会一直占着候选位：实测 `type A = keyof Foo`
// 在 keyof 闭合后只剩 Chain 一个候选，之后永远不会构建。这两个文件不属于 T1，不能改它们的判定；
// 因此本形态在自己的 body 起始位被确认之后，只把这两个粘性候选从**本 alias 的 guide.Candidates** 里移出，
// 不碰它们的形状、不碰其它宿主的 guide。别名结束时若本形态仍无法构建，最终仍走 Close 兜底，树与基线一致。
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

## static method KeywordAtom:(unit:Token, pos:int)=>Token | null

```ts
if (!(unit instanceof Common) || !unit.Closed) {
  return null;
}
return TypeKeywordUtil.KeywordTypeOf(unit as Common, pos);
```

## static method ReferenceAtom:(unit:Token, pos:int)=>Token | null

```ts
if (!(unit instanceof Common) || !unit.Closed) {
  return null;
}
const text = unit.TempToString();
if (OperandUtil.IsKeyword(text) || !OperandUtil.IsIdentifier(text)) {
  return null;
}
const identifier = IdentifierShape.FromCommon(unit as Common, pos);
TypeRevisionUtil.SetRevision(identifier, unit.SourceRange.End);
const reference = new TypeReferenceShape(unit.Template);
reference.Pos = identifier.Pos;
reference.SignIn(unit.SourceRange.Start);
reference.Add(identifier);
reference.SignOut(unit.SourceRange.End);
TypeRevisionUtil.MarkRevision(reference, unit.SourceRange.Start, unit.SourceRange.End);
reference.Closed = true;
return reference;
```

## static method Atom:(unit:Token, pos:int)=>Token | null

```ts
const keyword = UnaryFragments.KeywordAtom(unit, pos);
if (keyword !== null) {
  return keyword;
}
return UnaryFragments.ReferenceAtom(unit, pos);
```

## static method Filled:(node:Token, pos:int, start:int, end:int, children:Array<Token>)=>Token

```ts
TypeShape.Finish(node as TypeShape, pos, start, end, children);
TypeRevisionUtil.MarkRevision(node as TypeShape, start, end);
return node;
```

# class TypeOperatorStartPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const tokenIndex = index.Index;
if (!(host instanceof TypeAliasDeclarationShape)) {
  return ShapeStates.Reject;
}
// 类型参数表头（`type A<T>` 的 `<` 之后）这一格由 TypeParameterListOpenPossibleShape 独占；
// 其它候选（含本形态）都必须让位，否则表头那一格的唯一候选不变量被破坏，表头就建不出来。
if (TypeParameterListShape.IsHeaderOpen(host.Data, tokenIndex)) {
  return ShapeStates.Reject;
}
const units = host.Data;
const bodyIndex = UnaryFragments.BodyIndex(units, tokenIndex, cache);
if (bodyIndex < 0) {
  return ShapeStates.Uncertain;
}
const keyword = units[bodyIndex];
if (!(keyword instanceof Common)) {
  return ShapeStates.Reject;
}
if (!keyword.Closed) {
  return ShapeStates.Uncertain;
}
const text = keyword.TempToString();
if (text !== "keyof" && text !== "readonly" && text !== "unique") {
  return ShapeStates.Reject;
}
UnaryFragments.ReleaseSticky(host as TypeAliasDeclarationShape);
return TypeOperatorStartPossibleShape.IsReady(units, bodyIndex, tokenIndex) ? ShapeStates.Accept : ShapeStates.Uncertain;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const bodyIndex = UnaryFragments.BodyIndex(units, index.Index, cache);
if (bodyIndex < 0) {
  return false;
}
return TypeOperatorStartPossibleShape.IsReady(units, bodyIndex, index.Index);
```

## private static method IsReady:(units:Array<Token>, bodyIndex:int, tokenIndex:int)=>bool

```ts
if (tokenIndex !== units.length - 1) {
  return false;
}
const keyword = units[bodyIndex];
if (!(keyword instanceof Common) || !keyword.Closed) {
  return false;
}
const text = keyword.TempToString();
const operandIndex = UnaryFragments.NextCode(units, bodyIndex + 1);
if (operandIndex < 0) {
  return false;
}
if (text === "readonly") {
  const openIndex = UnaryFragments.NextCode(units, operandIndex + 1);
  const closeIndex = openIndex < 0 ? -1 : UnaryFragments.NextCode(units, openIndex + 1);
  if (closeIndex !== tokenIndex || UnaryFragments.NextCode(units, closeIndex + 1) >= 0) {
    return false;
  }
  const operand = units[operandIndex];
  const open = units[openIndex];
  const close = units[closeIndex];
  return operand instanceof Common
    && operand.Closed
    && UnaryFragments.KeywordAtom(operand, 0) !== null
    && open instanceof Symbol && open.Closed && open.Is("[")
    && close instanceof Symbol && close.Closed && close.Is("]");
}
if (operandIndex !== tokenIndex) {
  return false;
}
return UnaryFragments.ReferenceAtom(units[operandIndex], 0) !== null;
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const alias = host as TypeAliasDeclarationShape;
const units = alias.Data;
const tokenIndex = index.Index;
const bodyIndex = UnaryFragments.BodyIndex(units, tokenIndex, catalog.PossibleShapesComputeCache);
if (bodyIndex < 0 || bodyIndex >= units.length) {
  throw new Error("TypeOperatorStartPossibleShape: 找不到别名正文起点");
}
const keyword = units[bodyIndex] as Common;
const text = keyword.TempToString();
const keywordPos = ItemUtil.PositionOf(units, bodyIndex);
const operandIndex = UnaryFragments.NextCode(units, bodyIndex + 1);
if (operandIndex < 0) {
  throw new Error("TypeOperatorStartPossibleShape: 缺少操作数");
}
const operator = new TypeOperatorShape(alias.Template);
operator.Keyword = text;
if (text === "readonly") {
  const openIndex = UnaryFragments.NextCode(units, operandIndex + 1);
  const closeIndex = openIndex < 0 ? -1 : UnaryFragments.NextCode(units, openIndex + 1);
  if (closeIndex < 0) {
    throw new Error("TypeOperatorStartPossibleShape: readonly 缺少数组下标");
  }
  const operand = units[operandIndex] as Common;
  const close = units[closeIndex] as Symbol;
  const atom = UnaryFragments.KeywordAtom(operand, ItemUtil.PositionOf(units, operandIndex));
  if (atom === null) {
    throw new Error("TypeOperatorStartPossibleShape: readonly 操作数不是关键字类型");
  }
  const array = new ArrayTypeShape(alias.Template);
  UnaryFragments.Filled(array, TypeShape.PosOfNode(atom), atom.SourceRange.Start, close.SourceRange.End, [atom]);
  UnaryFragments.Filled(operator, keywordPos, keyword.SourceRange.Start, close.SourceRange.End, [array]);
  units.splice(bodyIndex, closeIndex - bodyIndex + 1, operator);
  operator.Parent = alias;
  return this.StampCreated(operator, context);
}
const operand = units[operandIndex] as Common;
const reference = UnaryFragments.ReferenceAtom(operand, ItemUtil.PositionOf(units, operandIndex));
if (reference === null) {
  throw new Error("TypeOperatorStartPossibleShape: 操作数不是类型名");
}
UnaryFragments.Filled(operator, keywordPos, keyword.SourceRange.Start, operand.SourceRange.End, [reference]);
units.splice(bodyIndex, operandIndex - bodyIndex + 1, operator);
operator.Parent = alias;
return this.StampCreated(operator, context);
```

# class TypeQueryStartPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const tokenIndex = index.Index;
if (!(host instanceof TypeAliasDeclarationShape)) {
  return ShapeStates.Reject;
}
// 类型参数表头（`type A<T>` 的 `<` 之后）这一格由 TypeParameterListOpenPossibleShape 独占；
// 其它候选（含本形态）都必须让位，否则表头那一格的唯一候选不变量被破坏，表头就建不出来。
if (TypeParameterListShape.IsHeaderOpen(host.Data, tokenIndex)) {
  return ShapeStates.Reject;
}
const units = host.Data;
const bodyIndex = UnaryFragments.BodyIndex(units, tokenIndex, cache);
if (bodyIndex < 0) {
  return ShapeStates.Uncertain;
}
const keyword = units[bodyIndex];
if (!(keyword instanceof Common)) {
  return ShapeStates.Reject;
}
if (!keyword.Closed) {
  return ShapeStates.Uncertain;
}
if (keyword.TempToString() !== "typeof") {
  return ShapeStates.Reject;
}
UnaryFragments.ReleaseSticky(host as TypeAliasDeclarationShape);
return TypeQueryStartPossibleShape.IsReady(units, bodyIndex, tokenIndex) ? ShapeStates.Accept : ShapeStates.Uncertain;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const bodyIndex = UnaryFragments.BodyIndex(units, index.Index, cache);
if (bodyIndex < 0) {
  return false;
}
return TypeQueryStartPossibleShape.IsReady(units, bodyIndex, index.Index);
```

## private static method IsReady:(units:Array<Token>, bodyIndex:int, tokenIndex:int)=>bool

```ts
if (tokenIndex !== units.length - 1) {
  return false;
}
const nameIndex = UnaryFragments.NextCode(units, bodyIndex + 1);
if (nameIndex < 0 || nameIndex !== tokenIndex) {
  return false;
}
const name = units[nameIndex];
if (!(name instanceof Common) || !name.Closed) {
  return false;
}
return OperandUtil.IsIdentifier(name.TempToString());
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const alias = host as TypeAliasDeclarationShape;
const units = alias.Data;
const tokenIndex = index.Index;
const bodyIndex = UnaryFragments.BodyIndex(units, tokenIndex, catalog.PossibleShapesComputeCache);
if (bodyIndex < 0) {
  throw new Error("TypeQueryStartPossibleShape: 找不到别名正文起点");
}
const nameIndex = UnaryFragments.NextCode(units, bodyIndex + 1);
if (nameIndex < 0) {
  throw new Error("TypeQueryStartPossibleShape: typeof 缺少名字");
}
const keyword = units[bodyIndex] as Common;
const name = units[nameIndex] as Common;
const namePos = ItemUtil.PositionOf(units, nameIndex);
const identifier = IdentifierShape.FromCommon(name, namePos);
TypeRevisionUtil.SetRevision(identifier, name.SourceRange.End);
const shape = new TypeQueryShape(alias.Template);
shape.Keyword = keyword.TempToString();
UnaryFragments.Filled(shape, ItemUtil.PositionOf(units, bodyIndex), keyword.SourceRange.Start, name.SourceRange.End, [identifier]);
units.splice(bodyIndex, nameIndex - bodyIndex + 1, shape);
shape.Parent = alias;
return this.StampCreated(shape, context);
```

# class LiteralTypePossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const tokenIndex = index.Index;
if (!(host instanceof TypeAliasDeclarationShape)) {
  return ShapeStates.Reject;
}
// 类型参数表头（`type A<T>` 的 `<` 之后）这一格由 TypeParameterListOpenPossibleShape 独占；
// 其它候选（含本形态）都必须让位，否则表头那一格的唯一候选不变量被破坏，表头就建不出来。
if (TypeParameterListShape.IsHeaderOpen(host.Data, tokenIndex)) {
  return ShapeStates.Reject;
}
const units = host.Data;
const bodyIndex = UnaryFragments.BodyIndex(units, tokenIndex, cache);
if (bodyIndex < 0) {
  return ShapeStates.Uncertain;
}
const unit = units[bodyIndex];
if (!(unit instanceof String)) {
  return ShapeStates.Reject;
}
if (!unit.Closed) {
  return ShapeStates.Uncertain;
}
if (unit.IsSupportInterpolation) {
  return ShapeStates.Reject;
}
if (tokenIndex !== units.length - 1 || bodyIndex !== tokenIndex) {
  return ShapeStates.Uncertain;
}
UnaryFragments.ReleaseSticky(host as TypeAliasDeclarationShape);
return ShapeStates.Accept;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
const bodyIndex = UnaryFragments.BodyIndex(units, tokenIndex, cache);
if (bodyIndex < 0 || bodyIndex !== tokenIndex || tokenIndex !== units.length - 1) {
  return false;
}
const unit = units[bodyIndex];
return unit instanceof String && unit.Closed && !unit.IsSupportInterpolation;
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const alias = host as TypeAliasDeclarationShape;
const units = alias.Data;
const tokenIndex = index.Index;
const bodyIndex = UnaryFragments.BodyIndex(units, tokenIndex, catalog.PossibleShapesComputeCache);
if (bodyIndex < 0) {
  throw new Error("LiteralTypePossibleShape: 找不到别名正文起点");
}
const string = units[bodyIndex] as String;
const literal = StringLiteralShape.FromString(string, ItemUtil.PositionOf(units, bodyIndex));
TypeRevisionUtil.SetRevision(literal, string.SourceRange.End);
const shape = new LiteralTypeShape(alias.Template);
UnaryFragments.Filled(shape, literal.Pos, string.SourceRange.Start, string.SourceRange.End, [literal]);
units.splice(bodyIndex, 1, shape);
shape.Parent = alias;
return this.StampCreated(shape, context);
```

# class ImportTypePossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const tokenIndex = index.Index;
if (!(host instanceof TypeAliasDeclarationShape)) {
  return ShapeStates.Reject;
}
// 类型参数表头（`type A<T>` 的 `<` 之后）这一格由 TypeParameterListOpenPossibleShape 独占；
// 其它候选（含本形态）都必须让位，否则表头那一格的唯一候选不变量被破坏，表头就建不出来。
if (TypeParameterListShape.IsHeaderOpen(host.Data, tokenIndex)) {
  return ShapeStates.Reject;
}
const units = host.Data;
const bodyIndex = UnaryFragments.BodyIndex(units, tokenIndex, cache);
if (bodyIndex < 0) {
  return ShapeStates.Uncertain;
}
const keyword = units[bodyIndex];
if (!(keyword instanceof Common)) {
  return ShapeStates.Reject;
}
if (!keyword.Closed) {
  return ShapeStates.Uncertain;
}
if (keyword.TempToString() !== "import") {
  return ShapeStates.Reject;
}
UnaryFragments.ReleaseSticky(host as TypeAliasDeclarationShape);
return ImportTypePossibleShape.IsReady(units, bodyIndex, tokenIndex) ? ShapeStates.Accept : ShapeStates.Uncertain;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const bodyIndex = UnaryFragments.BodyIndex(units, index.Index, cache);
if (bodyIndex < 0) {
  return false;
}
return ImportTypePossibleShape.IsReady(units, bodyIndex, index.Index);
```

## private static method IsReady:(units:Array<Token>, bodyIndex:int, tokenIndex:int)=>bool

```ts
if (tokenIndex !== units.length - 1) {
  return false;
}
const openIndex = UnaryFragments.NextCode(units, bodyIndex + 1);
const moduleIndex = openIndex < 0 ? -1 : UnaryFragments.NextCode(units, openIndex + 1);
const closeIndex = moduleIndex < 0 ? -1 : UnaryFragments.NextCode(units, moduleIndex + 1);
const dotIndex = closeIndex < 0 ? -1 : UnaryFragments.NextCode(units, closeIndex + 1);
const nameIndex = dotIndex < 0 ? -1 : UnaryFragments.NextCode(units, dotIndex + 1);
if (nameIndex !== tokenIndex || UnaryFragments.NextCode(units, nameIndex + 1) >= 0) {
  return false;
}
const open = units[openIndex];
const module = units[moduleIndex];
const close = units[closeIndex];
const dot = units[dotIndex];
const name = units[nameIndex];
return open instanceof Symbol && open.Closed && open.Is("(")
  && module instanceof String && module.Closed && !module.IsSupportInterpolation
  && close instanceof Symbol && close.Closed && close.Is(")")
  && dot instanceof Symbol && dot.Closed && dot.Is(".")
  && name instanceof Common && name.Closed && OperandUtil.IsIdentifier(name.TempToString());
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const alias = host as TypeAliasDeclarationShape;
const units = alias.Data;
const tokenIndex = index.Index;
const bodyIndex = UnaryFragments.BodyIndex(units, tokenIndex, catalog.PossibleShapesComputeCache);
if (bodyIndex < 0) {
  throw new Error("ImportTypePossibleShape: 找不到别名正文起点");
}
const openIndex = UnaryFragments.NextCode(units, bodyIndex + 1);
const moduleIndex = openIndex < 0 ? -1 : UnaryFragments.NextCode(units, openIndex + 1);
const closeIndex = moduleIndex < 0 ? -1 : UnaryFragments.NextCode(units, moduleIndex + 1);
const dotIndex = closeIndex < 0 ? -1 : UnaryFragments.NextCode(units, closeIndex + 1);
const nameIndex = dotIndex < 0 ? -1 : UnaryFragments.NextCode(units, dotIndex + 1);
if (nameIndex < 0) {
  throw new Error("ImportTypePossibleShape: import 类型不完整");
}
const keyword = units[bodyIndex] as Common;
const module = units[moduleIndex] as String;
const name = units[nameIndex] as Common;
const literal = StringLiteralShape.FromString(module, ItemUtil.PositionOf(units, moduleIndex));
TypeRevisionUtil.SetRevision(literal, module.SourceRange.End);
const literalShape = new LiteralTypeShape(alias.Template);
UnaryFragments.Filled(literalShape, literal.Pos, module.SourceRange.Start, module.SourceRange.End, [literal]);
const identifier = IdentifierShape.FromCommon(name, ItemUtil.PositionOf(units, nameIndex));
TypeRevisionUtil.SetRevision(identifier, name.SourceRange.End);
const shape = new ImportTypeShape(alias.Template);
UnaryFragments.Filled(shape, ItemUtil.PositionOf(units, bodyIndex), keyword.SourceRange.Start, name.SourceRange.End, [literalShape, identifier]);
units.splice(bodyIndex, nameIndex - bodyIndex + 1, shape);
shape.Parent = alias;
return this.StampCreated(shape, context);
```

# class ParenthesizedTypePossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const tokenIndex = index.Index;
if (!(host instanceof TypeAliasDeclarationShape)) {
  return ShapeStates.Reject;
}
// 类型参数表头（`type A<T>` 的 `<` 之后）这一格由 TypeParameterListOpenPossibleShape 独占；
// 其它候选（含本形态）都必须让位，否则表头那一格的唯一候选不变量被破坏，表头就建不出来。
if (TypeParameterListShape.IsHeaderOpen(host.Data, tokenIndex)) {
  return ShapeStates.Reject;
}
const units = host.Data;
const bodyIndex = UnaryFragments.BodyIndex(units, tokenIndex, cache);
if (bodyIndex < 0) {
  return ShapeStates.Uncertain;
}
const open = units[bodyIndex];
if (!(open instanceof Symbol) || !open.Closed || !open.Is("(")) {
  return ShapeStates.Reject;
}
const innerIndex = UnaryFragments.NextCode(units, bodyIndex + 1);
if (innerIndex < 0) {
  return ShapeStates.Uncertain;
}
const inner = units[innerIndex];
if (!(inner instanceof Common) && !(inner instanceof String)) {
  return ShapeStates.Reject;
}
if (!inner.Closed) {
  return ShapeStates.Uncertain;
}
const closeIndex = UnaryFragments.NextCode(units, innerIndex + 1);
if (closeIndex < 0) {
  return ShapeStates.Uncertain;
}
const close = units[closeIndex];
if (!(close instanceof Symbol) || !close.Closed || !close.Is(")")) {
  if (tokenIndex <= closeIndex && !close.Closed) {
    return ShapeStates.Uncertain;
  }
  return ShapeStates.Reject;
}
if (tokenIndex < closeIndex) {
  return ShapeStates.Uncertain;
}
if (tokenIndex > closeIndex) {
  return ShapeStates.Reject;
}
if (ParenthesizedTypePossibleShape.ArrowAhead(close)) {
  return ShapeStates.Uncertain;
}
if (UnaryFragments.Atom(inner, ItemUtil.PositionOf(units, innerIndex)) === null) {
  return ShapeStates.Reject;
}
UnaryFragments.ReleaseSticky(host as TypeAliasDeclarationShape);
return ShapeStates.Accept;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
const bodyIndex = UnaryFragments.BodyIndex(units, tokenIndex, cache);
if (bodyIndex < 0) {
  return false;
}
const open = units[bodyIndex];
if (!(open instanceof Symbol) || !open.Closed || !open.Is("(")) {
  return false;
}
const innerIndex = UnaryFragments.NextCode(units, bodyIndex + 1);
if (innerIndex < 0) {
  return false;
}
const closeIndex = UnaryFragments.NextCode(units, innerIndex + 1);
if (closeIndex !== tokenIndex || tokenIndex !== units.length - 1) {
  return false;
}
const close = units[closeIndex];
if (!(close instanceof Symbol) || !close.Closed || !close.Is(")")) {
  return false;
}
return UnaryFragments.Atom(units[innerIndex], ItemUtil.PositionOf(units, innerIndex)) !== null;
```

## private static method ArrowAhead:(close:Symbol)=>bool

```ts
const range = close.SourceRange;
const document = range.Document !== null ? range.Document : SourceRange.CurrentDocument;
if (document === null) {
  return false;
}
const count = document.GetCount();
let at = range.End;
while (at < count) {
  const ch = document.GetRaw(at, at + 1);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
    at++;
    continue;
  }
  break;
}
if (at + 1 >= count) {
  return false;
}
return document.GetRaw(at, at + 2) === "=>";
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const alias = host as TypeAliasDeclarationShape;
const units = alias.Data;
const tokenIndex = index.Index;
const bodyIndex = UnaryFragments.BodyIndex(units, tokenIndex, catalog.PossibleShapesComputeCache);
if (bodyIndex < 0) {
  throw new Error("ParenthesizedTypePossibleShape: 找不到别名正文起点");
}
const open = units[bodyIndex] as Symbol;
const innerIndex = UnaryFragments.NextCode(units, bodyIndex + 1);
const closeIndex = innerIndex < 0 ? -1 : UnaryFragments.NextCode(units, innerIndex + 1);
if (closeIndex < 0) {
  throw new Error("ParenthesizedTypePossibleShape: 括号不完整");
}
const close = units[closeIndex] as Symbol;
const inner = UnaryFragments.Atom(units[innerIndex], ItemUtil.PositionOf(units, innerIndex));
if (inner === null) {
  throw new Error("ParenthesizedTypePossibleShape: 括号内不是可建原子");
}
const shape = new ParenthesizedTypeShape(alias.Template);
UnaryFragments.Filled(shape, ItemUtil.PositionOf(units, bodyIndex), open.SourceRange.Start, close.SourceRange.End, [inner]);
units.splice(bodyIndex, closeIndex - bodyIndex + 1, shape);
shape.Parent = alias;
return this.StampCreated(shape, context);
```
