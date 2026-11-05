# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { OperandUtil } from "../expressions/operand-util.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { IndexedAccessTypeShape } from "./type-node-shapes.xl.md"
import { QualifiedNameShape } from "./type-node-shapes.xl.md"
import { TypeAliasDeclarationShape } from "./type-alias-declaration-shape.xl.md"
import { TypeConditionalScan } from "./type-conditional-scan-util.xl.md"
import { TypeParameterListShape } from "./type-parameter-list-shape.xl.md"
import { TypeParserApi } from "./type-parser-api.xl.md"
import { TypeRevisionUtil } from "./type-revision-util.xl.md"
import { TypeShape } from "./type-shape.xl.md"
```

# namespace cangjie

# class TypeAliasMemberPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof TypeAliasDeclarationShape)) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
if (TypeParameterListShape.IsHeaderOpen(units, tokenIndex)) {
  return ShapeStates.Reject;
}
const equals = TypeConditionalScan.TopLevelEquals(units, tokenIndex);
if (equals < 0) {
  return ShapeStates.Uncertain;
}
const member = units[tokenIndex];
if (member instanceof Symbol && member.TempToString() === ".") {
  const leftIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
  if (leftIndex > equals && units[leftIndex] instanceof TypeShape) {
    return ShapeStates.Uncertain;
  }
  return ShapeStates.Reject;
}
if (!(member instanceof Common)) {
  return ShapeStates.Reject;
}
if (!member.Closed) {
  return ShapeStates.Uncertain;
}
const text = member.TempToString();
if (!OperandUtil.IsIdentifier(text) || OperandUtil.IsKeyword(text)) {
  return ShapeStates.Reject;
}
const dotIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (dotIndex <= equals) {
  return ShapeStates.Reject;
}
const dot = units[dotIndex];
if (!(dot instanceof Symbol) || !dot.Is(".")) {
  return ShapeStates.Reject;
}
const baseIndex = ItemUtil.PreviousCode(units, dotIndex - 1);
if (baseIndex <= equals) {
  return ShapeStates.Reject;
}
return units[baseIndex] instanceof TypeShape ? ShapeStates.Accept : ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const equals = TypeConditionalScan.TopLevelEquals(units, tokenIndex);
if (equals < 0) {
  return false;
}
const member = units[tokenIndex];
if (!(member instanceof Common) || !member.Closed) {
  return false;
}
const dotIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (dotIndex <= equals) {
  return false;
}
if (!(units[dotIndex] instanceof Symbol)) {
  return false;
}
const baseIndex = ItemUtil.PreviousCode(units, dotIndex - 1);
return baseIndex > equals && units[baseIndex] instanceof TypeShape;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const alias = host as TypeAliasDeclarationShape;
const units = alias.Data;
const member = units[tokenIndex] as Common;
const dotIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
const baseIndex = ItemUtil.PreviousCode(units, dotIndex - 1);
const base = units[baseIndex] as TypeShape;
const pos = ItemUtil.PositionOf(units, tokenIndex);
const right = IdentifierShape.FromCommon(member, pos);
TypeRevisionUtil.SetRevision(right, member.SourceRange.End);
const inner = base.Data.length > 0 ? base.Data[0] : null;
if (inner === null) {
  throw new Error("TypeAliasMemberPossibleShape: 限定名缺少左半");
}
const children:Array<Token> = [inner];
const qualified = new QualifiedNameShape(alias.Template);
TypeShape.Finish(qualified, TypeShape.PosOfNode(inner), inner.SourceRange.Start, right.SourceRange.End, children);
qualified.Add(right);
base.Data.splice(0, 1, qualified);
qualified.Parent = base;
base.SourceRange.End = right.SourceRange.End;
base.Closed = true;
units.splice(baseIndex, tokenIndex - baseIndex + 1, base);
base.Parent = alias;
return this.StampCreated(base, context);
```

# class TypeAliasIndexPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof TypeAliasDeclarationShape)) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
if (TypeParameterListShape.IsHeaderOpen(units, tokenIndex)) {
  return ShapeStates.Reject;
}
const equals = TypeConditionalScan.TopLevelEquals(units, tokenIndex);
if (equals < 0) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit instanceof Symbol && unit.TempToString() === "[") {
  const leftIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
  if (leftIndex > equals && units[leftIndex] instanceof TypeShape) {
    return ShapeStates.Uncertain;
  }
  return ShapeStates.Reject;
}
if (unit instanceof Symbol && unit.Closed && unit.Is("]")) {
  const openIndex = TypeAliasIndexPossibleShape.MatchOpen(units, tokenIndex, equals);
  if (openIndex < 0 || tokenIndex - openIndex <= 1) {
    return ShapeStates.Reject;
  }
  const baseIndex = ItemUtil.PreviousCode(units, openIndex - 1);
  if (baseIndex <= equals) {
    return ShapeStates.Reject;
  }
  return units[baseIndex] instanceof TypeShape ? ShapeStates.Accept : ShapeStates.Reject;
}
return TypeAliasIndexPossibleShape.OpenDepth(units, equals, tokenIndex) > 0
  ? ShapeStates.Uncertain
  : ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const close = units[tokenIndex];
if (!(close instanceof Symbol) || !close.Closed || !close.Is("]")) {
  return false;
}
const equals = TypeConditionalScan.TopLevelEquals(units, tokenIndex);
if (equals < 0) {
  return false;
}
const openIndex = TypeAliasIndexPossibleShape.MatchOpen(units, tokenIndex, equals);
if (openIndex < 0 || tokenIndex - openIndex <= 1) {
  return false;
}
const baseIndex = ItemUtil.PreviousCode(units, openIndex - 1);
return baseIndex > equals && units[baseIndex] instanceof TypeShape;
```

## static method OpenDepth:(units:Array<Token>, from:int, to:int)=>int

```ts
let depth = 0;
for (let at = from + 1; at <= to && at < units.length; at++) {
  const unit = units[at];
  if (!(unit instanceof Symbol)) {
    continue;
  }
  const text = unit.TempToString();
  if (text === "[") {
    depth++;
  } else if (text === "]") {
    depth--;
  }
}
return depth;
```

## static method MatchOpen:(units:Array<Token>, closeIndex:int, from:int)=>int

```ts
let depth = 0;
for (let at = closeIndex - 1; at > from; at--) {
  const unit = units[at];
  if (!(unit instanceof Symbol)) {
    continue;
  }
  const text = unit.TempToString();
  if (text === "]") {
    depth++;
    continue;
  }
  if (text !== "[") {
    continue;
  }
  if (depth === 0) {
    return at;
  }
  depth--;
}
return -1;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const alias = host as TypeAliasDeclarationShape;
const units = alias.Data;
const close = units[tokenIndex] as Symbol;
const equals = TypeConditionalScan.TopLevelEquals(units, tokenIndex);
const openIndex = TypeAliasIndexPossibleShape.MatchOpen(units, tokenIndex, equals);
if (openIndex < 0) {
  throw new Error("TypeAliasIndexPossibleShape: 找不到配对的 [");
}
const baseIndex = ItemUtil.PreviousCode(units, openIndex - 1);
const base = units[baseIndex];
const indexType = TypeParserApi.ParseCompleteType(units.slice(openIndex + 1, tokenIndex), tokenIndex - openIndex - 1, alias.Template);
const children:Array<Token> = [base, indexType];
const indexed = new IndexedAccessTypeShape(alias.Template);
TypeShape.Finish(indexed, TypeShape.PosOfNode(base), base.SourceRange.Start, close.SourceRange.End, children);
TypeRevisionUtil.MarkRevision(indexed, base.SourceRange.Start, close.SourceRange.End);
units.splice(baseIndex, tokenIndex - baseIndex + 1, indexed);
indexed.Parent = alias;
return this.StampCreated(indexed, context);
```
