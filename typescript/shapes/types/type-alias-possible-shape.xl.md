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
import { ItemUtil } from "../item-util.xl.md"
import { OperandUtil } from "../expressions/operand-util.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { StatementUtil } from "../statements/statement-util.xl.md"
import { TypeAliasDeclarationShape } from "./type-alias-declaration-shape.xl.md"
import { TypeAliasEndPossibleShape } from "./type-alias-end-possible-shape.xl.md"
import { TypeFunctionArrowPossibleShape } from "./type-function-incremental.xl.md"
import { TypeAliasChainPossibleShape } from "./type-conditional-chain.xl.md"
import { TypeConditionalUtil } from "./type-conditional-chain.xl.md"
import { TypeReferenceShape } from "./type-node-shapes.xl.md"
import { ArrayTypeShape } from "./type-node-shapes.xl.md"
import { UnionTypeShape } from "./type-node-shapes.xl.md"
import { IntersectionTypeShape } from "./type-node-shapes.xl.md"
import { TypeShape } from "./type-shape.xl.md"
import { TypeParser } from "./type-parser.xl.md"
import { TypeParameterListShape } from "./type-parameter-list-shape.xl.md"
import { TypeParameterListOpenPossibleShape } from "./type-parameter-list-shape.xl.md"
```

# namespace cangjie

# class TypeAliasPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
const start = StatementUtil.StartIndex(units);
if (start >= units.length) {
  return ShapeStates.Uncertain;
}
const head = units[start];
if (!(head instanceof Common) || head.TempToString() !== "type") {
  return ShapeStates.Reject;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
// 语句头是 `type`，且名称标识符刚刚关闭、是这一格的最后一个单元。
const start = StatementUtil.StartIndex(units);
if (start >= units.length) {
  return false;
}
const head = units[start];
if (!(head instanceof Common) || head.TempToString() !== "type") {
  return false;
}
const nameIndex = StatementUtil.NextCode(units, start + 1);
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

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const start = StatementUtil.StartIndex(units);
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
  [
    new TypeParameterListOpenPossibleShape(),
    new TypeAliasBodyPossibleShape(),
    new TypeAliasBodyKeywordPossibleShape(),
    new TypeAliasArraySuffixPossibleShape(),
    new TypeAliasOperatorMemberPossibleShape(),
    new TypeFunctionArrowPossibleShape(),
    new TypeAliasChainPossibleShape(),
  ],
  new TypeAliasEndPossibleShape(),
);
units.splice(start, nameIndex - start + 1, alias);
alias.Parent = host;
host.MountedUnit = alias;
return this.StampCreated(alias, context);
```

# class TypeAliasBodyPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof TypeAliasDeclarationShape)) {
  return ShapeStates.Reject;
}
const units = host.Data;
// 头部 `<` 只能是类型参数表：让位给 TypeParameterListOpenPossibleShape（它只在这一格 Accept）。
if (TypeParameterListShape.IsHeaderOpen(units, tokenIndex)) {
  return ShapeStates.Reject;
}
// 正文第一个代码单元是刚收口的名字：这一刻就建类型引用，不等 `.` / `<` / `[` / `extends` 来证明。
if (TypeConditionalUtil.IsBodyName(units, tokenIndex, cache)) {
  return ShapeStates.Accept;
}
// 正文还没开始就一直等；已经开始了（第一个单元不是名字，或已经长成形状）就让位给条件类型 / 函数类型。
// 让位以后这个候选就退出 Candidate，直到下一次 build 的 Reset 才回来：正文以 `{` / `[` / `(` 开头时
// 只在第一个代码单元上算一遍，不会每格重扫（trivia 关闭不触发 compute）。
return TypeConditionalUtil.HasBodyCode(units, tokenIndex, cache) ? ShapeStates.Reject : ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return TypeConditionalUtil.IsBodyName(units, tokenIndex, cache);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
// 名字这一格就把 TypeReference 建出来（`CreatedAt` = 名字收口格）。后面的 `.` / `<` 在它身上继续长，
// `extends` 由 TypeAliasChainPossibleShape 收成 ConditionalType 并复用这颗引用；
// 其余写法在别名收口时走 ParseAlias，ParsePrimary 认这颗已建好的引用，不会重建。
const alias = host as TypeAliasDeclarationShape;
const units = alias.Data;
const unit = units[tokenIndex] as Common;
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

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof TypeAliasDeclarationShape)) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
// 头部 `<` 只能是类型参数表：让位给 TypeParameterListOpenPossibleShape（它只在这一格 Accept）。
if (TypeParameterListShape.IsHeaderOpen(units, tokenIndex)) {
  return ShapeStates.Reject;
}
const bodyIndex = TypeConditionalUtil.BodyStart(units, tokenIndex, cache);
if (bodyIndex < 0 || bodyIndex >= units.length) {
  // 正文还没开始：先活着，等 `=` 之后的那一格（Reject 会把它从候选里摘掉，直到下一次 build）。
  return ShapeStates.Uncertain;
}
const unit = units[bodyIndex];
if (!(unit instanceof Common)) {
  return ShapeStates.Reject;
}
if (!unit.Closed) {
  return ShapeStates.Uncertain;
}
if (!TypeConditionalUtil.IsKeywordTypeText(unit.TempToString())) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex !== units.length - 1) {
  return false;
}
const bodyIndex = TypeConditionalUtil.BodyStart(units, tokenIndex, cache);
if (bodyIndex < 0 || bodyIndex >= units.length) {
  return false;
}
const unit = units[bodyIndex];
return unit instanceof Common
  && unit.Closed
  && TypeConditionalUtil.IsKeywordTypeText(unit.TempToString());
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
// `string` / `number` 这类关键字类型在它收口后的那一格就建出来，CreatedAt = 收口格；
// 别名收口时 ParsePrimary 认这颗已建好的关键字类型，不会在 EOF 重建。
const alias = host as TypeAliasDeclarationShape;
const units = alias.Data;
const equals = TypeConditionalUtil.TopLevelEquals(units, tokenIndex);
if (equals < 0 || !TypeConditionalUtil.Balanced(units, 0, equals)) {
  throw new Error("TypeAliasBodyKeywordPossibleShape: 别名正文没有开始");
}
const bodyIndex = StatementUtil.NextCode(units, equals + 1);
if (bodyIndex < 0 || bodyIndex >= units.length) {
  throw new Error("TypeAliasBodyKeywordPossibleShape: 找不到正文第一个代码单元");
}
const unit = units[bodyIndex] as Common;
const atom = TypeParser.KeywordTypeOf(unit, ItemUtil.PositionOf(units, bodyIndex));
if (atom === null) {
  throw new Error("TypeAliasBodyKeywordPossibleShape: 不支持的关键字类型 " + unit.TempToString());
}
units.splice(bodyIndex, 1, atom);
atom.Parent = alias;
return this.StampCreated(atom, context);
```

# class TypeAliasArraySuffixPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof TypeAliasDeclarationShape)) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
// 头部 `<` 只能是类型参数表：让位给 TypeParameterListOpenPossibleShape（它只在这一格 Accept）。
if (TypeParameterListShape.IsHeaderOpen(units, tokenIndex)) {
  return ShapeStates.Reject;
}
// 正文还没开始：和关键字候选一样先活着（Reject 会被摘掉，直到下一次 build）。
if (TypeConditionalUtil.BodyStart(units, tokenIndex, cache) < 0) {
  return ShapeStates.Uncertain;
}
const bodyIndex = TypeConditionalUtil.BodyStart(units, tokenIndex, cache);
if (bodyIndex >= units.length || !(units[bodyIndex] instanceof TypeShape)) {
  return ShapeStates.Reject;
}
if (TypeConditionalUtil.IsPostfixArrayClose(units, tokenIndex, cache)) {
  return ShapeStates.Accept;
}
// 只有正文后面刚跟了一个 `[` 时才继续活着（等 `]` 收口）；其它格 Reject 让位给
// 条件类型 / 函数类型等真正的正文候选，否则它会一直占着候选位置、挡掉它们的 build。
const lastCode = ItemUtil.PreviousCode(units, tokenIndex);
if (lastCode >= 0) {
  const last = units[lastCode];
  if (last instanceof Symbol && last.Is("[")) {
    return ShapeStates.Uncertain;
  }
}
return ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return TypeConditionalUtil.IsPostfixArrayClose(units, tokenIndex, cache);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
// `string[]` 的 `]` 收口那一格：把正文那颗类型就地包成 ArrayType，CreatedAt = `]` 收口格。
const alias = host as TypeAliasDeclarationShape;
const units = alias.Data;
const closeIndex = ItemUtil.PreviousCode(units, tokenIndex);
if (closeIndex < 0) {
  throw new Error("TypeAliasArraySuffixPossibleShape: 找不到 `]`");
}
const close = units[closeIndex] as Symbol;
const equals = TypeConditionalUtil.TopLevelEquals(units, tokenIndex);
if (equals < 0 || !TypeConditionalUtil.Balanced(units, 0, equals)) {
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
if (TypeConditionalUtil.BodyStart(units, tokenIndex, cache) < 0) {
  return ShapeStates.Uncertain;
}
if (TypeConditionalUtil.IsOperatorMember(units, tokenIndex, cache)) {
  return ShapeStates.Accept;
}
// 正文后面刚跟 `|` / `&`、或成员还在输入：先活着，等成员收口那一格再 Accept。
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

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return TypeConditionalUtil.IsOperatorMember(units, tokenIndex, cache);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
// `string | number` / `A1 & A2`：成员收口那一格就地建出成员，再折成 Union/Intersection。
const alias = host as TypeAliasDeclarationShape;
const units = alias.Data;
const equals = TypeConditionalUtil.TopLevelEquals(units, tokenIndex);
if (equals < 0 || !TypeConditionalUtil.Balanced(units, 0, equals)) {
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
const keyword = TypeParser.KeywordTypeOf(member, memberPos);
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
  // 三元以上：并到已有的联合/交叉里，保持 TS 的扁平成员表。
  units.splice(opIndex, memberIndex - opIndex + 1);
  atom.Parent = left;
  left.Add(atom);
  left.SourceRange.End = atom.SourceRange.End;
  left.Closed = true;
  // 扩展已有形状：CreatedAt 留在它第一次建出的那一格，不在这里重盖。
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
