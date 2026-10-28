# dependencies
```xl
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../../../core/syntax/shape-token.xl.md"
import { SourceRange } from "../../../../../core/syntax/source-range.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { ItemUtil } from "../../../item-util.xl.md"
import { IdentifierShape } from "../../../names/identifier-shape.xl.md"
import { IncrementalItemPosition, NumericLiteralPossibleShape } from "../../numeric-literal-possible-shape.xl.md"
import { BinaryExpressionShape } from "../../binary-expression-shape.xl.md"
import { OperatorShapeMap } from "../../operator-shape-map.xl.md"
import { EqualsGreaterThanTokenShape } from "../../../punctuation/equals-greater-than-token-shape.xl.md"
import { InitializerTailJudge } from "../shared/initializer-tail-judge.xl.md"
```

# namespace cangjie

```txt
BinaryExpressionShape  pos=7  src=[8,13)
├─ IdentifierShape  pos=7   src=[8,9)   text="y"
├─ EqualsTokenShape  pos=9   src=[10,11)  op="="
└─ NumericLiteralShape  pos=11  src=[12,13)  text="1"
```

```text
char 8  "y"   NumericLiteral / BinaryExpression / BinaryOperator / Conditional … 全部 Reject
char 10 "="   IdentifierPrimary / Arrow / Assignment 还在（Uncertain）
char 12 "1"   IdentifierPrimary Reject（数字）、Arrow Reject（不是标识符）⇒ 只剩 Assignment
```

# class AssignmentPossibleShape extends PossibleShape

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

```ts
shapes.push(new AssignmentPossibleShape());
```

## static method IsSymbolText:(unit:Token, text:string)=>bool

```ts
return unit instanceof Symbol && (unit as Symbol).Is(text);
```

## static method IsIdentifierWord:(unit:Token)=>bool

```ts
if (!(unit instanceof Common)) {
  return false;
}
const common = unit as Common;
if (common.IsBigInt() || common.IsNumber()) {
  return false;
}
if (common.IsAny(["true", "false", "null", "this", "in", "instanceof"])) {
  return false;
}
return common.TempToString().length > 0;
```

## static method IsLValue:(unit:Token)=>bool

```ts
if (unit instanceof IdentifierShape) {
  return true;
}
return AssignmentPossibleShape.IsIdentifierWord(unit);
```

## static method IsRValue:(unit:Token)=>bool

```ts
if (!(unit instanceof Common)) {
  return false;
}
if ((unit as Common).IsNumber()) {
  return true;
}
return AssignmentPossibleShape.IsIdentifierWord(unit);
```

## static method RawAfter:(unit:Token, length:int)=>string

```ts
const range = unit.SourceRange;
let document = range.Document;
if (document === null) {
  document = SourceRange.CurrentDocument;
}
if (document === null || range.EndIndex < 0) {
  return "";
}
let text = "";
const count = document.GetCount();
let at = range.EndIndex;
while (at < count && text.length < length) {
  const ch = document.GetValue(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v") {
    at += 1;
    continue;
  }
  text += ch;
  at += 1;
}
return text;
```

## static method LooksLikeAssignmentAfter:(unit:Token)=>bool

```ts
const pair = AssignmentPossibleShape.RawAfter(unit, 2);
if (pair.length === 0 || pair[0] !== "=") {
  return false;
}
if (pair.length >= 2 && (pair[1] === "=" || pair[1] === ">")) {
  return false;
}
return true;
```

## static method EqualIndexes:(units:Array<Token>, tokenIndex:int)=>Array<int>

```ts
const result:Array<number> = [];
for (let at = 0; at < tokenIndex && at < units.length; at++) {
  if (units[at].IsTriviaToken) {
    continue;
  }
  if (AssignmentPossibleShape.IsSymbolText(units[at], "=")) {
    result.push(at);
  }
}
return result;
```

## static method IsAssignmentEqualAt:(units:Array<Token>, equalAt:int)=>bool

```ts
if (equalAt < 0 || equalAt >= units.length) {
  return false;
}
if (!AssignmentPossibleShape.IsSymbolText(units[equalAt], "=")) {
  return false;
}
const earlier = AssignmentPossibleShape.EqualIndexes(units, equalAt);
if (earlier.length !== 1) {
  // 0 个：这是声明的初始化 `=`；≥2 个：嵌套赋值（不在本候选范围）。
  return false;
}
const leftAt = ItemUtil.NextCode(units, earlier[0] + 1);
if (leftAt < 0 || leftAt >= equalAt) {
  return false;
}
if (!AssignmentPossibleShape.IsLValue(units[leftAt])) {
  return false;
}
return ItemUtil.NextCode(units, leftAt + 1) === equalAt;
```

## static method IsBodyAssignmentEqualAt:(units:Array<Token>, equalAt:int)=>bool

```ts
if (equalAt < 0 || equalAt >= units.length) {
  return false;
}
if (!AssignmentPossibleShape.IsSymbolText(units[equalAt], "=")) {
  return false;
}
const leftAt = ItemUtil.PreviousCode(units, equalAt - 1);
if (leftAt < 0) {
  return false;
}
if (!(units[leftAt] instanceof ShapeToken)) {
  return false;
}
const beforeAt = ItemUtil.PreviousCode(units, leftAt - 1);
if (beforeAt < 0) {
  return false;
}
return units[beforeAt] instanceof EqualsGreaterThanTokenShape;
```

## static method LastEqualBefore:(units:Array<Token>, tokenIndex:int)=>int

```ts
const indexes = AssignmentPossibleShape.EqualIndexes(units, tokenIndex);
if (indexes.length === 0) {
  return -1;
}
return indexes[indexes.length - 1];
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (unit instanceof Symbol) {
  // `=` 是所有原子候选的 Uncertain 格（E0b 约束 1）；本候选也保持在场，等右值那一格再整条建。
  if ((unit as Symbol).Is("=")) {
    return ShapeStates.Uncertain;
  }
  return ShapeStates.Reject;
}
if (!(unit instanceof Common)) {
  return ShapeStates.Reject;
}
const equalAt = AssignmentPossibleShape.LastEqualBefore(units, tokenIndex);
if (equalAt < 0) {
  // 还没见到声明的 `=`：保持在场（与 E0b 的 `=` / trivia 口径一致）。
  return ShapeStates.Uncertain;
}
if (!AssignmentPossibleShape.IsAssignmentEqualAt(units, equalAt)) {
  // 这个 `=` 是声明的初始化 `=`：当前格是初始化器首单元。只有「后面还有一个赋值 `=`」才保持在场，
  // 否则 Reject，把这一格完整让给 A1 / A2 / A4（`let x = a` 之类的既有 incremental 不许退化）。
  if (!AssignmentPossibleShape.IsLValue(unit)) {
    return ShapeStates.Reject;
  }
  return AssignmentPossibleShape.LooksLikeAssignmentAfter(unit) ? ShapeStates.Uncertain : ShapeStates.Reject;
}
// 赋值 `=` 之后：只认**紧挨着它的右值那一格**，且整条初始化器到这里就长完了。
if (ItemUtil.PreviousCode(units, tokenIndex - 1) !== equalAt) {
  return ShapeStates.Reject;
}
if (!AssignmentPossibleShape.IsRValue(unit)) {
  return ShapeStates.Reject;
}
if (!InitializerTailJudge.IsInitializerEnd(units, tokenIndex)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method ContinuationClaim:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
if (!AssignmentPossibleShape.IsSymbolText(units[tokenIndex], "=")) {
  return false;
}
return AssignmentPossibleShape.IsAssignmentEqualAt(units, tokenIndex);
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return false;
}
if (!(unit instanceof Common)) {
  return false;
}
const equalAt = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (equalAt < 0 || !AssignmentPossibleShape.IsSymbolText(units[equalAt], "=")) {
  return false;
}
return AssignmentPossibleShape.IsAssignmentEqualAt(units, equalAt);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext, bodyMode?:bool)=>Token

```ts
if (!OperatorShapeMap.IsRightAssociative("=")) {
  throw new Error("增量变量形状未支持：expression 赋值运算符结合性");
}
const data = host.Data;
let rightAt = ItemUtil.NextCode(data, tokenIndex);
if (rightAt < 0 || rightAt >= data.length) {
  rightAt = tokenIndex;
}
if (rightAt < 0 || rightAt >= data.length) {
  throw new Error("增量变量形状未支持：expression 赋值右值");
}
const rightUnit = data[rightAt];
if (!AssignmentPossibleShape.IsRValue(rightUnit)) {
  throw new Error("增量变量形状未支持：expression 赋值右值");
}
const equalAt = ItemUtil.PreviousCode(data, rightAt - 1);
if (equalAt < 0 || !AssignmentPossibleShape.IsSymbolText(data[equalAt], "=")) {
  throw new Error("增量变量形状未支持：expression 赋值缺等号");
}
if (!AssignmentPossibleShape.IsAssignmentEqualAt(data, equalAt)
  && !(bodyMode === true && AssignmentPossibleShape.IsBodyAssignmentEqualAt(data, equalAt))) {
  throw new Error("增量变量形状未支持：expression 赋值等号不是赋值");
}
const leftAt = ItemUtil.PreviousCode(data, equalAt - 1);
if (leftAt < 0) {
  throw new Error("增量变量形状未支持：expression 赋值缺左值");
}
const leftUnit = data[leftAt];
let leftShape: ShapeToken;
if (leftUnit instanceof IdentifierShape) {
  leftShape = leftUnit as IdentifierShape;
} else if (leftUnit instanceof Common) {
  if (!AssignmentPossibleShape.IsLValue(leftUnit)) {
    throw new Error("增量变量形状未支持：expression 赋值左值");
  }
  const identifier = IdentifierShape.FromBasicToken(leftUnit as Common, context);
  identifier.Pos = IncrementalItemPosition.AfterPreviousCode(data, leftAt);
  (leftUnit as Common).Replace(identifier);
  leftShape = identifier;
} else {
  throw new Error("增量变量形状未支持：expression 赋值左值");
}
const equalUnit = data[equalAt];
const equalsShape = OperatorShapeMap.Create("=", OperatorShapeMap.PositionBinary, host.Template,
  equalUnit.SourceRange.Start, equalUnit.SourceRange.End, context);
if (equalsShape instanceof ShapeToken) {
  (equalsShape as ShapeToken).Pos = IncrementalItemPosition.AfterPreviousCode(data, equalAt);
}
(equalUnit as Symbol).Replace(equalsShape);
const rightCurrent = data[rightAt];
let rightShape: ShapeToken;
if (rightCurrent instanceof Common && (rightCurrent as Common).IsNumber()) {
  rightShape = NumericLiteralPossibleShape.BuildLiteral(rightCurrent as Common, host, rightAt, context);
} else if (rightCurrent instanceof Common) {
  if (!AssignmentPossibleShape.IsIdentifierWord(rightCurrent)) {
    throw new Error("增量变量形状未支持：expression 赋值右值正文 " + (rightCurrent as Common).TempToString());
  }
  const identifier = IdentifierShape.FromBasicToken(rightCurrent as Common, context);
  identifier.Pos = IncrementalItemPosition.AfterPreviousCode(data, rightAt);
  (rightCurrent as Common).Replace(identifier);
  rightShape = identifier;
} else {
  throw new Error("增量变量形状未支持：expression 赋值右值");
}
const precedence = OperatorShapeMap.PrecedenceOf("=");
const binary = BinaryExpressionShape.FromLeftAndOperator(leftShape, equalsShape, precedence, host.Template);
// 右值必须是 `Binary` 的子节点（legacy 的 `BinaryExpressionShape.Data` 就是「左值 / `=` / 右值」三格）；
// 它此刻还留在宿主 `Data` 里，`Add` 只设父指针 + 进 `Binary` 的 `Data`，随后由下面的 `splice` 从宿主摘掉。
binary.Add(rightShape);
data.splice(rightAt, 1);
data.splice(equalAt, 1);
data.splice(leftAt, 1, binary);
binary.Parent = host;
host.MountedUnit = binary;
binary.SealRightOperand(context);
return binary;
```
