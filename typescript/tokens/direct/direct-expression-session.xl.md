# dependencies
```xl
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ExpressionStatementShape } from "../statements/expression-statement-shape.xl.md"
import { DirectSession } from "./direct-build-session.xl.md"
import { DirectBuildMetrics } from "./direct-build-metrics.xl.md"
import { DirectExpressionEngine } from "./direct-expression-engine.xl.md"
```

# namespace cangjie

表达式语句的直建 session：整个壳的代码单元逐格喂给 `DirectExpressionEngine`，`;` 由引擎按「本层结束」吞掉；
收口时建 `ExpressionStatementShape`（`Data=[expr]`、字段 `Expression=expr`），不调用
`StatementBuilder` / `StatementBuilder.BuildExpressionStatementFromShapes`。引擎 `Held`（接不上的单元，
多半是下一条语句）只记 `StoppedAt`；`Finish(endIndex)` 判断它是否落在语句区间内才 Decline。

# class ExpressionStatementDirectSession implements DirectSession

```txt
2*3+1        -> ExpressionStatementShape(BinaryExpression(+))
2            -> ExpressionStatementShape(NumericLiteral)
2*3+1;       -> `;` 不进 Data，语句 end 含 `;`
a ⏎ b        -> 第一条在 `a` 收口；`b` 由 Held 留给下一条（不 Decline）
f()          -> 调用属范围外：engine Fail → session Decline（计数），走旧路径
```

## field Owner:Token | null

## field Declined:bool = false

## field Reason:string = ""

## field Finished:bool = false

## field Template:Template

## field Context:SyntaxContext

## field BasePos:int

## field Ingested:int = 0

## field Engine:DirectExpressionEngine | null = null

## field StoppedAt:int = -1

## field Units:Array<Token> = []

## field HasUnits:bool = false

## field PrevEnd:int = -1

## field FirstCodeAt:int = -1

## field SawSemicolon:bool = false

## constructor:(template:Template, context:SyntaxContext, basePos:int, owner:Token)=>void

```ts
this.Template = template;
this.Context = context;
this.BasePos = basePos;
this.Owner = owner;
```

## method TextOf:(unit:Token)=>string

```ts
if (unit instanceof Symbol) {
  return (unit as Symbol).TempToString();
}
return "";
```

## method Decline:(reason:string, category:string)=>void

```ts
if (this.Declined) {
  return;
}
this.Declined = true;
this.Reason = reason;
DirectBuildMetrics.Declined += 1;
DirectBuildMetrics.NoteDecline(reason, category);
if (DirectBuildMetrics.Strict) {
  DirectBuildMetrics.StrictViolations += 1;
  throw new Error("DirectBuild strict: " + reason + " [" + this.Summary() + "]");
}
```

## method Incomplete:(reason:string)=>void

```ts
this.Reason = reason;
DirectBuildMetrics.IncompleteFallback += 1;
DirectBuildMetrics.Trace("expression session incomplete: " + reason);
if (DirectBuildMetrics.Strict) {
  DirectBuildMetrics.StrictViolations += 1;
  throw new Error("DirectBuild strict(incomplete): " + reason + " [" + this.Summary() + "]");
}
```

## method Ingest:(units:Array<Token>, context:SyntaxContext)=>void

```ts
if (this.Declined || this.Finished || this.StoppedAt >= 0) {
  return;
}
if (!this.HasUnits) {
  this.HasUnits = true;
  this.Units = units;
}
while (this.Ingested < units.length && !this.Declined && this.StoppedAt < 0) {
  const at = this.Ingested;
  this.Ingested = at + 1;
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (this.SawSemicolon) {
    this.StoppedAt = at;
    return;
  }
  const pos = this.PrevEnd < 0 ? this.BasePos : this.PrevEnd;
  if (this.FirstCodeAt < 0) {
    this.FirstCodeAt = at;
  }
  if (this.Engine === null) {
    this.Engine = new DirectExpressionEngine(this.Template, this.Context, pos);
  }
  this.Engine.IngestUnit(unit, pos);
  if (this.Engine.Declined) {
    this.Decline("表达式范围外: " + this.Engine.Reason, "expr.decline");
    return;
  }
  if (this.Engine.Held) {
    this.StoppedAt = at;
    DirectBuildMetrics.Trace("expression held at idx=" + String(at) + " units=" + String(units.length));
    return;
  }
  if (unit.SourceRange.EndIndex >= 0) {
    this.PrevEnd = unit.SourceRange.EndIndex;
  }
  if (this.TextOf(unit) === ";") {
    this.SawSemicolon = true;
  }
}
```

## method Finish:(endIndex:int, context:SyntaxContext)=>Token | null

```ts
if (this.Finished) {
  return null;
}
if (this.Declined) {
  return null;
}
if (endIndex < 0) {
  this.Incomplete("endIndex 非法");
  return null;
}
if (!this.HasUnits || this.Units.length === 0) {
  this.Incomplete("壳里没有单元");
  return null;
}
if (this.StoppedAt < 0 && this.Ingested <= endIndex) {
  const upTo:Array<Token> = this.Units.slice(0, endIndex + 1);
  this.Ingest(upTo, context);
}
DirectBuildMetrics.Trace("expression finish: endIndex=" + String(endIndex) + " ingested=" + String(this.Ingested)
  + " units=" + String(this.Units.length) + " stoppedAt=" + String(this.StoppedAt));
if (this.Declined) {
  return null;
}
if (this.StoppedAt >= 0 && this.StoppedAt <= endIndex) {
  this.Decline("语句内出现无法接续的单元 idx=" + String(this.StoppedAt), "expr.stopped");
  return null;
}
if (this.Engine === null) {
  this.Incomplete("没有表达式单元");
  return null;
}
const expression = this.Engine.Finish();
if (expression === null) {
  this.Incomplete("表达式不完整: " + this.Engine.Reason);
  return null;
}
const shape = new ExpressionStatementShape(this.Template);
shape.Expression = expression;
shape.Add(expression);
shape.Pos = this.BasePos;
if (this.FirstCodeAt >= 0 && this.FirstCodeAt < this.Units.length) {
  const first = this.Units[this.FirstCodeAt];
  if (first.SourceRange.StartIndex >= 0) {
    shape.SignIn(first.SourceRange.StartIndex);
  }
}
const endUnit = this.Units[endIndex];
if (endUnit.SourceRange.EndIndex >= 0) {
  shape.SignOut(endUnit.SourceRange.EndIndex);
}
shape.TryToClose(context);
// C1 覆盖校验（R2-CONTRACT §3.3.3）：引擎在 H1 拿到的是**整个壳的 Data**（而不是 `consumed`），
// 因此它可能多吃语句外的单元（`a⏎++b` 的 `++` 被当后缀）或提前收层（未实现逗号时的 `a, b`）。
// 两种都会**静默错建**（built 计数照加，AST 却与 tsc 不一致），所以收口前必须要求
// 「表达式精确覆盖语句的最后一个代码单元」。判据只用 token：`;` 属语句但不属表达式，
// 期望终点退到它之前的那个代码单元。不一致 = 本层没收住 → Decline（category=expr.coverage），
// 让旧路径接管（逐字节不变）。引擎侧的行终止符 Hold 守卫（feat-r2-expr）落地后本校验仍保留作安全网。
let expectedUnit:Token | undefined = undefined;
for (let at = 0; at <= endIndex && at < this.Units.length; at++) {
  const candidate = this.Units[at];
  if (candidate.IsTriviaToken) {
    continue;
  }
  if (at === endIndex && this.TextOf(candidate) === ";") {
    continue;
  }
  expectedUnit = candidate;
}
if (expectedUnit !== undefined && expression.SourceRange.EndIndex !== expectedUnit.SourceRange.EndIndex) {
  this.Decline("表达式终点与语句终点不一致: exprEnd=" + String(expression.SourceRange.EndIndex)
    + " stmtEnd=" + String(expectedUnit.SourceRange.EndIndex), "expr.coverage");
  return null;
}
this.Finished = true;
DirectBuildMetrics.StatementsBuilt += 1;
DirectBuildMetrics.Trace("expression built: " + expression.constructor.name);
return shape;
```

## method Summary:()=>string

```ts
return "Expression expect=" + (this.Engine === null ? "none" : String(this.Engine.Expect))
  + " ingested=" + String(this.Ingested)
  + (this.Declined ? " declined(" + this.Reason + ")" : "");
```
