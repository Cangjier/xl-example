# dependencies
```xl
import { Bracket } from "../../../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../../../core/syntax/shape-token.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { CallExpressionShape } from "../../call-expression-shape.xl.md"
import { ExpressionBuilder } from "../../expression-builder.xl.md"
import { IdentifierShape } from "../../../names/identifier-shape.xl.md"
import { ImportKeywordShape } from "../../../keywords/import-keyword-shape.xl.md"
import { IncrementalItemPosition } from "../../numeric-literal-possible-shape.xl.md"
import { ItemUtil } from "../../../item-util.xl.md"
import { NewPossibleShape } from "./new-possible-shape.xl.md"
import { CompositeInitializerFormsJudge } from "../primary/composite-initializer-forms-judge.xl.md"
import { ExpressionAtomRegistry } from "../shared/expression-atom-registry.xl.md"
```

# namespace cangjie

```
char 8  `f`   → 本候选（与 A1 的标识符候选同时存活，但都不建——`(` 不在 A1 的续接白名单）
char 9  `(`   → 括号建立，括号里的 basic token 归括号自己；父层没有新格子
char 10 `)`   → 括号关闭格：A1 的候选在 Bracket 格 Reject，本候选是本格唯一活口 ⇒ 建 CallExpressionShape
EOF           → FinishIncremental 收下唯一根（E0b 契约）
```

# class CallPossibleShape extends PossibleShape

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

```ts
shapes.push(new CallPossibleShape());
```

## static method IsInitializerHead:(units:Array<Token>, tokenIndex:int)=>bool

```ts
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previous < 0) {
  return false;
}
const unit = units[previous];
if (!(unit instanceof Symbol)) {
  return false;
}
return (unit as Symbol).Is("=");
```

## static method IsCallHead:(units:Array<Token>, tokenIndex:int)=>bool

```ts
const unit = units[tokenIndex];
if (!(unit instanceof Common)) {
  return false;
}
if (!CallPossibleShape.IsInitializerHead(units, tokenIndex)) {
  return false;
}
return CompositeInitializerFormsJudge.NextSignificantChar(unit) === "(";
```

## static method CanBeCallee:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (NewPossibleShape.IsNewItem(units, tokenIndex)) {
  return false;
}
const leftIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (leftIndex < 0) {
  return false;
}
const left = units[leftIndex];
if (left instanceof ShapeToken) {
  return true;
}
return left instanceof Common;
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
if (unit instanceof Symbol && (unit as Symbol).Is("=")) {
  return ShapeStates.Uncertain;
}
if (unit instanceof Bracket) {
  if ((unit as Bracket).StartBracketChar !== "(") {
    return ShapeStates.Reject;
  }
  if (!CallPossibleShape.CanBeCallee(units, tokenIndex)) {
    return ShapeStates.Reject;
  }
  return ShapeStates.Accept;
}
if (CallPossibleShape.IsCallHead(units, tokenIndex)) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method ContinuationClaim:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Bracket)) {
  return false;
}
if ((unit as Bracket).StartBracketChar !== "(") {
  return false;
}
return CallPossibleShape.CanBeCallee(units, tokenIndex);
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Bracket)) {
  return false;
}
if ((unit as Bracket).StartBracketChar !== "(") {
  return false;
}
const bracket = unit as Bracket;
if (!bracket.Closed && bracket.SourceRange.EndIndex < 0) {
  return false;
}
return CallPossibleShape.CanBeCallee(units, tokenIndex);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const data = host.Data;
const bracket = data[tokenIndex];
if (!(bracket instanceof Bracket) || (bracket as Bracket).StartBracketChar !== "(") {
  throw new Error("增量变量形状未支持：expression 调用括号");
}
const leftIndex = ItemUtil.PreviousCode(data, tokenIndex - 1);
if (leftIndex < 0) {
  throw new Error("增量变量形状未支持：expression 调用缺被调用者");
}
const callee = CallPossibleShape.Operand(host, leftIndex, context);
const builder = new ExpressionBuilder(host.Template, context);
const args = builder.ParseBracketArguments(bracket as Bracket);
const shape = new CallExpressionShape(host.Template);
shape.Add(callee);
for (const arg of args) {
  shape.Add(arg);
}
shape.Pos = (callee as ShapeToken).Pos;
const start = callee.SourceRange.StartIndex;
if (start < 0) {
  throw new Error("增量变量形状未支持：expression 调用被调用者没有起点");
}
shape.SignIn(start);
const end = (bracket as Bracket).SourceRange.EndIndex;
if (end < 0) {
  throw new Error("增量变量形状未支持：expression 调用括号没有终点");
}
shape.SignOut(end);
shape.TryToClose(context);
// [T12:CALL-POSTFIX] 只登记「增量候选自己建出的调用形状」：收口格据此把它当操作数消费（`HasNode`），
// 后缀由 legacy `ExpressionBuilder.ParsePostfixSuffix` 接上。
ExpressionAtomRegistry.RegisterNode(shape);
data.splice(leftIndex, tokenIndex - leftIndex + 1, shape);
shape.Parent = host;
host.MountedUnit = null;
return shape;
```

## static method Operand:(host:Token, index:int, context:SyntaxContext)=>Token

```ts
const unit = host.Data[index];
if (unit instanceof ShapeToken) {
  return unit;
}
if (!(unit instanceof Common)) {
  throw new Error("增量变量形状未支持：expression 调用被调用者");
}
// [W5:IMPORT-CALLEE] `import("m")` 的被调用者是 `ImportKeyword`，不是 `Identifier`
// （与 `ExpressionBuilder.ParsePrimary` 的 `text === "import"` 分支同一口径）。
// 少了这一支，`const p = import("m")` 的树会多一个 `Identifier`、少一个 `ImportKeyword`
// （`mod-import-dynamic-expression.ts` / `am-import-type-call.ts` 两条差异）。
if ((unit as Common).Is("import")) {
  const keyword = new ImportKeywordShape(host.Template);
  if (unit.SourceRange.StartIndex >= 0) {
    keyword.SignIn(unit.SourceRange.Start);
  }
  if (unit.SourceRange.EndIndex >= 0) {
    keyword.SignOut(unit.SourceRange.End);
  }
  keyword.Pos = IncrementalItemPosition.AfterPreviousCode(host.Data, index);
  keyword.TryToClose(context);
  (unit as Common).Replace(keyword);
  return keyword;
}
const identifier = IdentifierShape.FromBasicToken(unit as Common, context);
identifier.Pos = IncrementalItemPosition.AfterPreviousCode(host.Data, index);
(unit as Common).Replace(identifier);
return identifier;
```
