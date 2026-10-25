# dependencies
```xl
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { LineTerminator } from "../../run/line-terminator.xl.md"
import { ExpressionStatementShape } from "../statements/expression-statement-shape.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { DirectSession } from "./direct-build-session.xl.md"
import { DirectBuildMetrics } from "./direct-build-metrics.xl.md"
import { DirectExpressionEngine } from "./direct-expression-engine.xl.md"
import { DirectTokenUtil } from "./direct-token-util.xl.md"
```

# namespace cangjie

表达式语句的直建 session：整个壳的代码单元逐格喂给 `DirectExpressionEngine`，`;` 由引擎按「本层结束」吞掉；
收口时建 `ExpressionStatementShape`（`Data=[expr]`、字段 `Expression=expr`），不调用
`StatementBuilder` / `StatementBuilder.BuildExpressionStatementFromShapes`。引擎 `Held`（接不上的单元，
多半是下一条语句）只记 `StoppedAt`；`Finish(endIndex)` 判断它是否落在语句区间内才 Decline。

**R7-A1（missing-semicolon 恢复，R7-CONTRACT §1.1.3）**：`Held` 除了「本轮不支持」还有第二种解释 ——
**它就是下一条语句的第一个单元**（`a b` 的 `b`、`as b` 的 `b`、`f() g()` 的 `g`）。`AllowRecovery` 打开时，
`CanRecoverAt` 的**四条准入**（代码单元 / 前缀非空 / **同一行** / 引擎 Hold 且前缀完整）与**三条否决**
（切点是 `;` / EOF / 模板串、会话非语句级、壳非 `ShellPlainExpression`）全过，就把这次 Hold 记成
**恢复切点 `StopAt`**：`Units[0..StopAt-1]` 是本条语句，剩下的由壳的 `BuildFromShell` 按切点取 `consumed`
（落点 B）后逐条续建。
**关掉 `AllowRecovery` ⇒ `StopAt` 恒 -1 ⇒ 本文件逐字节是 R1–R6 的行为**（R7 的一级回退点）。

# class ExpressionStatementDirectSession implements DirectSession

```txt
2*3+1        -> ExpressionStatementShape(BinaryExpression(+))
2            -> ExpressionStatementShape(NumericLiteral)
2*3+1;       -> `;` 不进 Data，语句 end 含 `;`
a ⏎ b        -> 第一条在 `a` 收口；`b` 由 Held 留给下一条（不 Decline）
f()          -> 调用属范围外：engine Fail → session Decline（计数），走旧路径
a b          -> Held@1 过准入 ⇒ StopAt=1 ⇒ 本条只建 `a`，`b` 由壳按切点续建（R7-A1）
a satisfies b; -> engine Fail（不认 satisfies）⇒ 不是 Held ⇒ 仍 Decline(expr.decline)
a`t`;        -> Held@1 但切点是模板串（否决 ⑤）⇒ 仍 Decline(expr.stopped)
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

## field StopAt:int = -1

## field AllowRecovery:bool = false

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
// R7-A1（否决 ⑥ / ⑦ 的承载点）：**只有语句级表达式会话**置 `AllowRecovery`。本类只由
// `DirectBuildPlugins` 注册给 `StatementRoute.ShellPlainExpression`（`direct-build-plugins` 一行），
// 变量初始化器 / 调用实参 / 箭头体 / `new` 实参走的是 `DirectExpressionEngine` 本体或
// `DirectVariableSession`，**不经过这个会话** ⇒ 变量族不会切（`let x = a b` 的 tsc 是 1 条语句）。
// 一级回退 = 把这一行改成 `false`：`StopAt` 恒 -1，三个落点全部成为空操作。
this.AllowRecovery = true;
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

## method CanRecoverAt:(at:int)=>bool

```ts
// R7-A1（R7-CONTRACT §1.1.3）：`at` 这一格的 Held 能不能当「语句到此为止」。
// 四条准入全真 + 三条否决全不命中才恢复；语义 = 「tsc 在这里也接受这个断点」。
// **不新增 token 级 ASI 谓词**：这里只读既有判据（`LineTerminator` / `DirectTokenUtil` / 引擎自述）。
if (!this.AllowRecovery) {
  // ⑥ 会话不是语句级表达式会话（变量初始化器 / 调用实参 / 箭头体 / `new` 实参）。
  // ⑦ 壳的族不是 `ShellPlainExpression` —— 由注册点承载：本类只被注册给 ShellPlainExpression。
  return false;
}
if (at < 0 || at >= this.Units.length) {
  return false;                                   // ① 没得切
}
const unit = this.Units[at];
if (unit.IsTriviaToken) {
  return false;                                   // ① 切点必须是代码单元
}
if (at <= this.FirstCodeAt) {
  return false;                                   // ② 前缀非空（`a b` 的 `b` 不能是第一条语句）
}
if (LineTerminator.HasBefore(this.Units, at)) {
  // ③ **同一行**。换行类 ASI 已由 C1 / 边界层处理（`a⏎!b` / `a⏎++b` / `let x = a⏎as;⏎b;` 实测已正确），
  // 恢复若接管它们会把这些**已经对**的读数改坏 —— 这是 244 条不回归的主保险。
  return false;
}
// ⑤ 否决：切点是 `;` / EOF / 模板串。
// `;`：语句到此为止由既有 `SawSemicolon` / 边界层处理，不走恢复。
// EOF：文件末尾没有「下一条语句」可建。
// 模板串：标识符后接模板串是 TaggedTemplate（`a`t`` / `f`t``），**不是**两条语句；引擎目前没有
// tagged-template 收口能力（R7-D7 不做）⇒ 必须保持 `expr.stopped` 的 Decline（R6-HD-neg-02 的读数不动）。
if (unit instanceof Symbol && (unit as Symbol).Is(";")) {
  return false;
}
if (unit instanceof EndOfFileTokenShape) {
  return false;
}
if (DirectTokenUtil.IsTemplateUnit(unit, this.Template)) {
  return false;
}
const engine = this.Engine;
if (engine === null) {
  return false;                                   // ④ 没有引擎就没有前缀
}
// ④ 引擎在 `at` 处是 Hold（本方法只在 `Held` 分支里被调用，这句是防误用的自检），
// 且**前缀是完整表达式**。`IsComplete()` 的语义是「再 Finish 一次会不会成功」，它在 `Held` 为真时
// 直接返回 false（引擎自己的守卫），所以这里**临时清位、只读求值、立刻还原**：问的正是
// 「把 Held 摘掉之后前缀完整不完整」，用的仍是引擎自己的定义，不改引擎任何一个持久字段。
if (!engine.Held || engine.Declined) {
  return false;
}
const heldFlag = engine.Held;
engine.Held = false;
let prefixComplete = false;
try {
  prefixComplete = engine.IsComplete();
} catch {
  prefixComplete = false;
} finally {
  engine.Held = heldFlag;
}
return prefixComplete;
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
    // R7-A1（落点 A）：Held 的第二种解释 —— 这个单元是**下一条语句的首单元**。
    // 过准入 / 否决就记切点并正常返回（不 Decline、不 Incomplete）：壳随后按 `StopAt` 取 `consumed`。
    if (this.CanRecoverAt(at)) {
      this.StopAt = at;
      DirectBuildMetrics.Trace("expression recover at idx=" + String(at) + " units=" + String(units.length));
      return;
    }
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
// 接口契约（`direct-build-session` 的 `Finish`：「先把自己补齐到 `endIndex`（用 `Owner.Data`）」）：
// 正常路径上 H1 已经喂过壳的 Data（`HasUnits` 为真），这里只兜「壳是刚建的、还没走 H1」的格子——
// R7-A1 的续建（`statement-shape` 的 `BuildFromShell` 在切点之后临时建新壳 + 新会话）正是这种格子。
if (!this.HasUnits && this.Owner !== null) {
  this.Ingest(this.Owner.Data as Array<Token>, context);
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
  + " units=" + String(this.Units.length) + " stoppedAt=" + String(this.StoppedAt)
  + " stopAt=" + String(this.StopAt));
if (this.Declined) {
  return null;
}
// R7-A1：本条语句的终点 = 切点前一位（恢复态）/ 壳的最后一个代码单元（默认）。
// **切点只能在这之后知道**：EOF 收口时壳的最后几格还没喂过会话，所以「缩 endIndex」只能在这里做，
// 由壳（落点 B `BuildFromShell`）按 `StopAt` 取 `consumed` 的长度 —— 两处读同一个 `StopAt`，
// 这就是成对不变式（会话报切点 + 壳按切点 splice），单向提交会让形状终点与语句终点不一致。
let cut = endIndex;
if (this.StopAt >= 0 && this.StopAt <= endIndex) {
  // R7-A1 恢复：本条语句到**切点前一位**为止；壳（落点 B）按同一个 `StopAt` 取 `consumed` 的长度。
  cut = this.StopAt - 1;
  if (cut < 0) {
    this.Decline("恢复切点之前没有代码单元", "expr.coverage");
    return null;
  }
} else if (this.StoppedAt >= 0 && this.StoppedAt <= endIndex) {
  // 没有恢复切点（准入 / 否决任一不成立）⇒ 逐字节保持 R1–R6 的行为：`expr.stopped` 的 Decline，
  // 旧路径接管建树。**这一格是 244 条不回归的兜底**。
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
// 语句终点：默认是壳的最后一个代码单元（`;` 属语句、含在 End 里，与 legacy 同口径）。
// R7-A1：恢复态下 `cut` 是**切点前一位**，它可能是 trivia（`a b` 的 `b` 前面那个空格）——
// 此时终点必须退到切点之前的**最后一个代码单元**（与下面 C1 覆盖校验的 `expectedUnit` 同一判据），
// 否则 `a b` 的第一条语句会多吃一个空格（End=2 而不是 tsc 的 1，A1 立刻红）。
let endUnit:Token = this.Units[cut];
if (this.StopAt >= 0) {
  let last = cut;
  while (last > 0 && this.Units[last].IsTriviaToken) {
    last--;
  }
  endUnit = this.Units[last];
}
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
for (let at = 0; at <= cut && at < this.Units.length; at++) {
  const candidate = this.Units[at];
  if (candidate.IsTriviaToken) {
    continue;
  }
  if (at === cut && this.TextOf(candidate) === ";") {
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
