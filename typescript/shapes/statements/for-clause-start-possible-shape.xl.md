# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { OperandUtil } from "../expressions/operand-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { StatementUtil } from "./statement-util.xl.md"
import { ConditionOperatorPossibleShape } from "../conditions/condition-operator-possible-shape.xl.md"
import { ForClauseShape } from "./for-clause-shape.xl.md"
import { ForClauseEndPossibleShape } from "./for-clause-end-possible-shape.xl.md"
import { ForHeadShape } from "./for-head-shape.xl.md"
import { PostfixPossibleShape } from "./postfix-possible-shape.xl.md"
```

# namespace cangjie

# class ForClauseStartPossibleShape extends PossibleShape

经典 `for` 的一个子句以操作数开头：把它装进解析期的 ForClauseShape，
后面接运算符（含 `=`）或后缀 `++`/`--`，由 ForClauseEndPossibleShape 在 `;` / `)` 收口。

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof ForHeadShape)) {
  return ShapeStates.Reject;
}
if (host.Mode !== "" && host.Mode !== "classic") {
  return ShapeStates.Reject;
}
if (host.Segment >= 3) {
  return ShapeStates.Reject;
}
const units = host.Data;
const start = StatementUtil.StartIndex(units);
if (tokenIndex < start) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (!(unit instanceof Common)) {
  return ShapeStates.Reject;
}
if (!unit.Closed) {
  return ShapeStates.Uncertain;
}
if (tokenIndex !== start || !OperandUtil.CanStartExpression(unit)) {
  return ShapeStates.Reject;
}
// 初始化子句与 `for (v of …)` / `for (k in …)` 共用同一个起点：后者归 ForBinding，
// 这里按前瞻让位（ComputeByIndex 拿不到 context，走 ForHeadShape.IsWordAhead 的文档指针）。
if (host.Segment === 0 && host.Init === null) {
  if (ForHeadShape.IsWordAhead(unit.SourceRange.End, "of") || ForHeadShape.IsWordAhead(unit.SourceRange.End, "in")) {
    return ShapeStates.Reject;
  }
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const start = StatementUtil.StartIndex(units);
if (tokenIndex !== start || tokenIndex !== units.length - 1) {
  return false;
}
const unit = units[tokenIndex];
return unit instanceof Common && unit.Closed && OperandUtil.CanStartExpression(unit);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const head = host as ForHeadShape;
const units = head.Data;
const common = units[tokenIndex] as Common;
const pos = ItemUtil.PositionOf(units, tokenIndex);
const clause = new ForClauseShape(host.Template);
clause.Role = head.Segment;
clause.Pos = pos;
clause.SignIn(common.SourceRange.Start);
const operand = OperandUtil.FromCommon(common, pos);
units.splice(tokenIndex, 1, clause);
clause.Add(operand);
clause.Parent = head;
// 右边界先落在操作数上：后面可能是空白，未定右边界会被 WrapSymbol 当未闭合单元收尾。
clause.SignOut(operand.SourceRange.End);
clause.CatalogGuide = new CatalogGuide(
  [new ConditionOperatorPossibleShape(), new PostfixPossibleShape()],
  new ForClauseEndPossibleShape(),
);
head.MountedUnit = clause;
return this.StampCreated(clause, context);
```
