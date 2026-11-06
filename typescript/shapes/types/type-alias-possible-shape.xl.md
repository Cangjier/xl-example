# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { TokenIndex } from "../../../core/syntax/token-index.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { OperandUtil } from "../expressions/operand-util.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { StatementUtil } from "../statements/statement-util.xl.md"
import { TypeAliasDeclarationShape } from "./type-alias-declaration-shape.xl.md"
import { TypeAliasEndPossibleShape } from "./type-alias-end-possible-shape.xl.md"
import { TypeCatalogFactory } from "./type-catalog-factory.xl.md"
import { TypeFunctionArrowPossibleShape } from "./type-function-incremental.xl.md"
import { TypeAliasChainPossibleShape } from "./type-conditional-chain.xl.md"
import { TypeAliasIndexPossibleShape } from "./type-alias-member-possible-shape.xl.md"
import { TypeAliasMemberPossibleShape } from "./type-alias-member-possible-shape.xl.md"
import { TypeReferenceShape } from "./type-node-shapes.xl.md"
import { ArrayTypeShape } from "./type-node-shapes.xl.md"
import { UnionTypeShape } from "./type-node-shapes.xl.md"
import { IntersectionTypeShape } from "./type-node-shapes.xl.md"
import { TypeShape } from "./type-shape.xl.md"
import { TypeParameterListShape } from "./type-parameter-list-shape.xl.md"
import { TypeParameterListOpenPossibleShape } from "./type-parameter-list-shape.xl.md"
import { TypeConditionalScan } from "./type-conditional-scan-util.xl.md"
import { TypeBodyUtil } from "./type-body-util.xl.md"
import { TypeKeywordUtil } from "./type-keyword-util.xl.md"
```


# namespace cangjie

# class TypeAliasPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
const start = StatementUtil.StartIndex(units, tokenIndex, cache);
if (start >= units.length) {
  return ShapeStates.Uncertain;
}
const head = units[start];
if (!(head instanceof Common) || head.TempToString() !== "type") {
  return ShapeStates.Reject;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
const start = StatementUtil.StartIndex(units, tokenIndex, cache);
if (start >= units.length) {
  return false;
}
const head = units[start];
if (!(head instanceof Common) || head.TempToString() !== "type") {
  return false;
}
const nameIndex = StatementUtil.NextCode(units, start + 1, tokenIndex + 1);
if (nameIndex < 0 || nameIndex !== tokenIndex || nameIndex !== units.length - 1) {
  return false;
}
const name = units[nameIndex];
if (!(name instanceof Common) || !name.Closed) {
  return false;
}
const text = name.TempToString();
return OperandUtil.IsIdentifier(text) && !OperandUtil.IsKeyword(text);
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
const start = StatementUtil.StartIndex(units, tokenIndex, catalog.PossibleShapesComputeCache);
const keywordIndex = start;
const nameIndex = StatementUtil.NextCode(units, keywordIndex + 1);
if (keywordIndex < 0 || nameIndex < 0) {
  throw new Error("TypeAliasPossibleShape: 缺 type 或名称");
}
const keyword = units[keywordIndex] as Common;
const name = units[nameIndex] as Common;
const identifier = IdentifierShape.FromCommon(name, ItemUtil.PositionOf(units, nameIndex));
const alias = new TypeAliasDeclarationShape(host.Template);
alias.Pos = ItemUtil.PositionOf(units, keywordIndex);
alias.SignIn(keyword.SourceRange.Start);
alias.Add(identifier);
alias.CatalogGuide = new CatalogGuide(
  // [T-CAT:BUILD] 候选目录由 TypeCatalogFactory 统一提供（顺序与原内联数组逐项一致）；本文件此后冻结。
  TypeCatalogFactory.CreateBody(),
  new TypeAliasEndPossibleShape(),
);
units.splice(start, nameIndex - start + 1, alias);
alias.Parent = host;
host.MountedUnit = alias;
return this.StampCreated(alias, context);
```

# class TypeAliasBodyPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const tokenIndex = index.Index;
if (!(host instanceof TypeAliasDeclarationShape)) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (TypeParameterListShape.IsHeaderOpen(units, tokenIndex)) {
  return ShapeStates.Reject;
}
if (TypeBodyUtil.IsBodyName(units, tokenIndex, cache)) {
  return ShapeStates.Accept;
}
return TypeBodyUtil.HasBodyCode(units, tokenIndex, cache) ? ShapeStates.Reject : ShapeStates.Uncertain;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
return TypeBodyUtil.IsBodyName(units, tokenIndex, cache);
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const tokenIndex = index.Index;
const alias = host as TypeAliasDeclarationShape;
const units = alias.Data;
const unit = index.At(tokenIndex) as Common;
const pos = ItemUtil.PositionOf(units, tokenIndex);
const identifier = IdentifierShape.FromCommon(unit, pos);
const reference = new TypeReferenceShape(alias.Template);
reference.Pos = pos;
reference.SignIn(unit.SourceRange.Start);
reference.Add(identifier);
reference.SignOut(unit.SourceRange.End);
reference.Closed = true;
units.splice(tokenIndex, 1, reference);
reference.Parent = alias;
return this.StampCreated(reference, context);
```

# class TypeAliasBodyKeywordPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const tokenIndex = index.Index;
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
const bodyIndex = TypeBodyUtil.BodyStart(units, tokenIndex, cache);
if (bodyIndex < 0 || bodyIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[bodyIndex];
if (!(unit instanceof Common)) {
  return ShapeStates.Reject;
}
if (!unit.Closed) {
  return ShapeStates.Uncertain;
}
if (!TypeBodyUtil.IsKeywordTypeText(unit.TempToString())) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
if (tokenIndex !== units.length - 1) {
  return false;
}
const bodyIndex = TypeBodyUtil.BodyStart(units, tokenIndex, cache);
if (bodyIndex < 0 || bodyIndex >= units.length) {
  return false;
}
const unit = units[bodyIndex];
return unit instanceof Common
  && unit.Closed
  && TypeBodyUtil.IsKeywordTypeText(unit.TempToString());
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const tokenIndex = index.Index;
const alias = host as TypeAliasDeclarationShape;
const units = alias.Data;
const equals = TypeConditionalScan.TopLevelEquals(units, tokenIndex);
if (equals < 0 || !TypeConditionalScan.Balanced(units, 0, equals)) {
  throw new Error("TypeAliasBodyKeywordPossibleShape: 别名正文没有开始");
}
const bodyIndex = StatementUtil.NextCode(units, equals + 1);
if (bodyIndex < 0 || bodyIndex >= units.length) {
  throw new Error("TypeAliasBodyKeywordPossibleShape: 找不到正文第一个代码单元");
}
const unit = units[bodyIndex] as Common;
const atom = TypeKeywordUtil.KeywordTypeOf(unit, ItemUtil.PositionOf(units, bodyIndex));
if (atom === null) {
  throw new Error("TypeAliasBodyKeywordPossibleShape: 不支持的关键字类型 " + unit.TempToString());
}
units.splice(bodyIndex, 1, atom);
atom.Parent = alias;
return this.StampCreated(atom, context);
```

# class TypeAliasArraySuffixPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const tokenIndex = index.Index;
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
if (TypeBodyUtil.BodyStart(units, tokenIndex, cache) < 0) {
  return ShapeStates.Uncertain;
}
const bodyIndex = TypeBodyUtil.BodyStart(units, tokenIndex, cache);
if (bodyIndex >= units.length || !(units[bodyIndex] instanceof TypeShape)) {
  return ShapeStates.Reject;
}
if (TypeBodyUtil.IsPostfixArrayClose(units, tokenIndex, cache)) {
  return ShapeStates.Accept;
}
const lastCode = ItemUtil.PreviousCode(units, tokenIndex);
if (lastCode >= 0) {
  const last = units[lastCode];
  if (last instanceof Symbol && last.Is("[")) {
    return ShapeStates.Uncertain;
  }
}
return ShapeStates.Reject;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
return TypeBodyUtil.IsPostfixArrayClose(units, tokenIndex, cache);
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const tokenIndex = index.Index;
const alias = host as TypeAliasDeclarationShape;
const units = alias.Data;
const closeIndex = ItemUtil.PreviousCode(units, tokenIndex);
if (closeIndex < 0) {
  throw new Error("TypeAliasArraySuffixPossibleShape: 找不到 `]`");
}
const close = units[closeIndex] as Symbol;
const equals = TypeConditionalScan.TopLevelEquals(units, tokenIndex);
if (equals < 0 || !TypeConditionalScan.Balanced(units, 0, equals)) {
  throw new Error("TypeAliasArraySuffixPossibleShape: 别名正文没有开始");
}
const bodyIndex = StatementUtil.NextCode(units, equals + 1);
if (bodyIndex < 0 || bodyIndex >= units.length) {
  throw new Error("TypeAliasArraySuffixPossibleShape: 找不到正文第一个代码单元");
}
const type = units[bodyIndex];
const array = new ArrayTypeShape(alias.Template);
array.Pos = TypeShape.PosOfNode(type);
array.SignIn(type.SourceRange.Start);
array.SignOut(close.SourceRange.End);
array.Add(type);
type.Parent = array;
array.Closed = true;
units.splice(bodyIndex, closeIndex - bodyIndex + 1, array);
array.Parent = alias;
return this.StampCreated(array, context);
```

# class TypeAliasOperatorMemberPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const tokenIndex = index.Index;
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
if (TypeBodyUtil.BodyStart(units, tokenIndex, cache) < 0) {
  return ShapeStates.Uncertain;
}
if (TypeBodyUtil.IsOperatorMember(units, tokenIndex, cache)) {
  return ShapeStates.Accept;
}
const lastCode = ItemUtil.PreviousCode(units, tokenIndex);
if (lastCode >= 0) {
  const last = units[lastCode];
  if (last instanceof Symbol && (last.Is("|") || last.Is("&"))) {
    return ShapeStates.Uncertain;
  }
  if (last instanceof Common && !last.Closed) {
    return ShapeStates.Uncertain;
  }
}
return ShapeStates.Reject;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
return TypeBodyUtil.IsOperatorMember(units, tokenIndex, cache);
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const tokenIndex = index.Index;
const alias = host as TypeAliasDeclarationShape;
const units = alias.Data;
const equals = TypeConditionalScan.TopLevelEquals(units, tokenIndex);
if (equals < 0 || !TypeConditionalScan.Balanced(units, 0, equals)) {
  throw new Error("TypeAliasOperatorMemberPossibleShape: 别名正文没有开始");
}
const bodyIndex = StatementUtil.NextCode(units, equals + 1);
const memberIndex = ItemUtil.PreviousCode(units, tokenIndex);
const opIndex = ItemUtil.PreviousCode(units, memberIndex - 1);
if (bodyIndex < 0 || memberIndex < 0 || opIndex < 0) {
  throw new Error("TypeAliasOperatorMemberPossibleShape: 找不到成员或运算符");
}
const member = units[memberIndex] as Common;
const operator = units[opIndex] as Symbol;
const left = units[bodyIndex];
const memberPos = ItemUtil.PositionOf(units, memberIndex);
const keyword = TypeKeywordUtil.KeywordTypeOf(member, memberPos);
let atom:Token;
if (keyword !== null) {
  atom = keyword;
} else {
  const identifier = IdentifierShape.FromCommon(member, memberPos);
  const reference = new TypeReferenceShape(alias.Template);
  reference.Pos = memberPos;
  reference.SignIn(member.SourceRange.Start);
  reference.Add(identifier);
  reference.SignOut(member.SourceRange.End);
  reference.Closed = true;
  atom = reference;
}
const sameKind = (operator.Is("|") && left instanceof UnionTypeShape)
  || (operator.Is("&") && left instanceof IntersectionTypeShape);
if (sameKind) {
  units.splice(opIndex, memberIndex - opIndex + 1);
  atom.Parent = left;
  left.Add(atom);
  left.SourceRange.End = atom.SourceRange.End;
  left.Closed = true;
  return left;
}
const folded = operator.Is("|")
  ? new UnionTypeShape(alias.Template)
  : new IntersectionTypeShape(alias.Template);
folded.Pos = TypeShape.PosOfNode(left);
folded.SignIn(left.SourceRange.Start);
folded.SignOut(atom.SourceRange.End);
folded.Add(left);
left.Parent = folded;
folded.Add(atom);
atom.Parent = folded;
folded.Closed = true;
units.splice(bodyIndex, memberIndex - bodyIndex + 1, folded);
folded.Parent = alias;
return this.StampCreated(folded, context);
```
