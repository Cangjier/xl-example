# dependencies
```xl
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ComputePossibleShapesStates } from "../../../core/syntax/compute-possible-shapes-states.xl.md"
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { DirectSession } from "../direct/direct-build-session.xl.md"
import { DirectBuildMetrics } from "../direct/direct-build-metrics.xl.md"
import { DirectBuildRouter } from "../direct/direct-build-router.xl.md"
import { StatementBuilder } from "./statement-builder.xl.md"
import { StatementFamilyDispatch } from "./statement-family-dispatch.xl.md"
import { StatementBoundaryUtil } from "./statement-boundary-util.xl.md"
import { StatementScanner } from "./statement-scanner.xl.md"
import { StatementLegacyMetrics } from "./statement-legacy-metrics.xl.md"
import { StatementOperatorBody } from "./statement-operator-body.xl.md"
import { StatementShapeAst } from "./statement-shape-ast.xl.md"
import { StatementRoute } from "./statement-route-util.xl.md"
import { StatementRouteUtil } from "./statement-route-util.xl.md"
import { VariableStatementThreeLayer } from "./variable-statement-three-layer.xl.md"
import { BlockPossibleShape } from "./block-possible-shape.xl.md"
import { IncrementalStuckShellRecovery } from "./incremental-stuck-shell-recovery.xl.md"
```

# namespace cangjie

# class StatementShape extends ShapeToken

```txt
let x = 1;
const y = a + b;
let a = 1
let b = 2
```

## field Pos:int = -1

## field ShellId:int = 0

## field Kind:int = 0

## field BodyKind:int = 0

## field OperatorBody:StatementOperatorBody | null = null

## field DirectSession:DirectSession | null = null

## field WaitingCells:int = 0

## field IncrementalMounted:Token | null = null

## field IncrementalRaw:Array<Token> = []

## static field BodyKindBlock:int = 1

## static field BodyKindObjectLiteral:int = 2

## constructor:(template:Template)=>void

```ts
super(template);
```

## method ComputePossibleShapes:(context:SyntaxContext, source:PossibleSource)=>ComputePossibleShapesStates

```ts
// [E-SHAPE:MOUNT] WP-B2：`EnableIncrementalShapes=true` 时，表达式体（`OperatorBody`）归约出的形状要
// **物化并挂进壳的可见 `Data`**——否则形状只活在体的 `Frames` 里，`ToAstLine` 看不到，账本永远判 `atomic`。
// 做法（与 PLAN §1.3 等价的实现）：每一步先把上一格挂上去的形状**卸回原始单元**（让壳的 `CatalogGuide`
// / 终结候选 / 收口路径看到的始终是 raw `Data`，行为与 legacy 逐字节一致），喂完表达式体、跑完既有候选
// 计算之后，若体已经归约到「完整表达式」，就用 S3c 的同一个形状→AST 桥（`StatementShapeAst.Build`）
// 把当前前缀物化成 AST 形状并原地挂进 `Data`。于是账本在**归约发生的那一格**就看到最终树里的节点。
// 开关 false 时本段不执行（逐字节 legacy）。
if (StatementRouteUtil.IsIncrementalShapesEnabled() && this.OperatorBody !== null) {
  this.UnpackIncremental();
}
// H1（CONTRACT §4.1）：直建的唯一喂入点——子单元关闭事件先喂 session，再走既有候选计算。
// 不改返回值、不建形状、不碰 CatalogGuide；`DirectSession === null` 时本句是空操作。
// **R3-S（R3-CONTRACT §4.4）**：`--strict` 时 `Decline` / `Incomplete` **在 Ingest 期**就会抛
// （`Decline`：`Declined+=1` → `NoteDecline` → `StrictViolations+=1` → `throw`）。不在这里接住，
// 异常会穿出 `Parse`（R2 审计 §7 R2 条：`let {a} = b` 在 Strict 下抛穿）。计数语义与 H2 完全一致：
// 已计数的 Decline 不再计 `Errors`；接住之后**继续走** `super.ComputePossibleShapes(context, source)`，
// 由 H2 的 `!direct.Declined` 拦下 Finish ⇒ 旧路径建树（AST 不变）。
if (this.DirectSession !== null) {
  const ingestSession = this.DirectSession;
  try {
    ingestSession.Ingest(this.Data, context);
  } catch (error) {
    // R4（R4-CONTRACT §1.5 / R4-Q2）：`--strict` 的两处抛错点在抛出**之前**都已经计数
    // （Decline ⇒ `Declined`+`StrictViolations`；Incomplete ⇒ `IncompleteFallback`+`StrictViolations`），
    // 所以这一类异常不是「异常兜底」，**不得**再记 `Errors`（R4-S-01/02 要 `errors==0 &&
    // strictViolations>=1`）。判据 = 抛错前缀，与 session 的两个抛错点一一对应；非 strict 的真异常照旧
    // 计 `Errors` + `LastError`。这不是放宽：`StrictViolations` 仍然是 `>=1` 的硬断言。
    const message = error instanceof Error ? error.message : String(error);
    if (!ingestSession.Declined && message.indexOf("DirectBuild strict") !== 0) {
      DirectBuildMetrics.Errors += 1;
      DirectBuildMetrics.LastError = message;
      DirectBuildMetrics.Trace("direct ingest error: " + message);
    } else {
      DirectBuildMetrics.Trace("direct ingest strict (already counted): " + message);
    }
  }
}
if (this.OperatorBody !== null) {
  this.OperatorBody.IngestAll(this.Data, this.Template);
}
const state = super.ComputePossibleShapes(context, source);
// [S2:STUCK-SHELL] **卡死壳检测**（`incremental-stuck-shell-recovery.xl.md`）：壳连续
// `RecoveryCells`（= 2）格答 `Waiting`、而当前末单元已经是声明跟随边界 ⇒ 下一条语句的起始词到了、
// 壳却不收口。这一格**先只计数**（`StatementRouteUtil.StuckShellRecoveryCount`），强制执行收口要
// `IncrementalStuckShellRecovery.ForceClose` 显式打开（默认 `false`，与 EOF 那条「先计数、后翻行为」
// 同一条纪律）。默认路径 = 计数 + 同一份返回值，逐字节与基线一致。
// 收口走的是壳自己的收口路径（`BuildFromShell` + `FinishShell`），不新写建树；失败一律不抛错。
if (StatementRouteUtil.EnableStuckShellRecovery) {
  if (state === ComputePossibleShapesStates.Waiting) {
    this.WaitingCells += 1;
    if (IncrementalStuckShellRecovery.ShouldRecover(this.Data, this.WaitingCells)) {
      IncrementalStuckShellRecovery.NoteRecovery();
      if (IncrementalStuckShellRecovery.CanForceClose()) {
        const stuckLast = ItemUtil.LastCodeInItem(this.Data);
        if (stuckLast >= 0) {
          let forced:Token | null = null;
          try {
            forced = StatementShape.BuildFromShell(this, stuckLast, context);
          } catch {
            forced = null;
          }
          if (forced !== null) {
            StatementShape.FinishShell(this, forced, context);
          }
        }
      }
    }
  } else {
    this.WaitingCells = 0;
  }
}
// 候选计算（含终结候选收口）之后才挂：壳若已在本格收口，`FinishShell` 已把壳换出、`Data` 已清空，
// 下面的存活判据会把它挡掉——收口路径永远只看 raw `Data`。
this.TryMountIncremental(context);
return state;
```

## method UnpackIncremental:()=>void

```ts
// 把上一格挂上去的物化形状**卸回原始单元**。壳的 `Data` 在增量模式下有两种态：
//   * 未挂载：`Data` 就是 raw 单元序列（与 legacy 同一个数组对象、同一批 Token）；
//   * 已挂载：`Data = [挂载形状, ...挂载之后新流入的 raw 单元]`，被形状覆盖的 raw 单元保存在
//     `IncrementalRaw` 里（**同一批 Token 对象、同一个顺序**）。
// 卸回时必须把挂载之后的尾巴先并回 `IncrementalRaw`，再把 `Data` 原地还原成 raw 序列——数组对象不换，
// `OperatorBody.Ingested` 的下标语义才继续有效（`IngestAll` 只从 `Ingested` 往后追加）。
const mounted = this.IncrementalMounted;
if (mounted === null) {
  return;
}
const raw = this.IncrementalRaw;
const at = this.Data.indexOf(mounted);
if (at >= 0) {
  for (let index = at + 1; index < this.Data.length; index++) {
    raw.push(this.Data[index]);
  }
} else {
  // 挂载形状被别的路径摘掉了（防御）：把当前 `Data` 里除它以外的单元并回去。
  for (const unit of this.Data) {
    if (unit !== mounted) {
      raw.push(unit);
    }
  }
}
this.IncrementalMounted = null;
this.Data.length = 0;
for (const unit of raw) {
  this.Data.push(unit);
}
this.IncrementalRaw = [];
```

## method TryMountIncremental:(context:SyntaxContext)=>void

```ts
// 表达式体已归约到一个**完整**表达式时，把当前前缀物化成 AST 形状挂进壳的 `Data`（PLAN §1.3 的「形状
// 物化 + 挂载」）。物化用的是收口路径的**同一个**桥 `StatementShapeAst.Build`，所以挂出来的节点类名 /
// `Pos` / 层级与 EOF 树逐节点一致，账本按 `(类名, pos)` 能对上；EOF 收口前会先 `UnpackIncremental`
// 卸回 raw，走的仍是既有 S3c 路径，最终树不受影响。
// 建不出来（未覆盖 / 不完整 / 桥拒绝）就**不挂**：本格照旧显示 raw 单元，绝不假装增量。
if (!StatementRouteUtil.IsIncrementalShapesEnabled()) {
  return;
}
if (this.Kind !== StatementRoute.ShellPlainExpression) {
  return;
}
if (this.IncrementalMounted !== null) {
  return;
}
const body = this.OperatorBody;
if (body === null) {
  return;
}
// 壳必须还活着（本格没有收口 / 拆壳）：`FinishShell` 换出后壳不在父单元里、`DetachShell` 后 `Parent`
// 为 null；这两种情况下都不得再挂，否则会往一个已死形状里塞单元。
if (this.Parent === null || this.Data.length === 0) {
  return;
}
if (this.Parent.Data.indexOf(this) < 0) {
  return;
}
let built:Token | null = null;
// 物化单元 = 「表达式单元」：壳里可能已经收着终结符 `;`（`"s";` / `/re/g;` 这类字面量在 `;` 那一格
// 才关闭），桥会因「形状树没覆盖整段表达式单元」拒绝。把尾随的 `;` 与 trivia 从**参与覆盖核对的那份
// 单元**里去掉即可；壳真实的 raw 序列（`IncrementalRaw`）仍然包含它们，收口时原样还原。
let unitEnd = this.Data.length - 1;
while (unitEnd >= 0 && this.Data[unitEnd].IsTriviaToken) {
  unitEnd--;
}
if (unitEnd >= 0 && this.Data[unitEnd] instanceof Symbol && (this.Data[unitEnd] as Symbol).Is(";")) {
  unitEnd--;
}
if (unitEnd < 0) {
  return;
}
const units:Array<Token> = this.Data.slice(0, unitEnd + 1);
if (!body.Incomplete && body.IsComplete() && body.Root !== null && body.Root.Data.length === 1
  && body.Expect !== StatementOperatorBody.ExpectTypeTail && body.TypeTailUnits === 0) {
  // `as` / `satisfies` 的类型尾部（`ExpectTypeTail`）归 Phase A / 类型目录（A5 / B4b-*），本 WP 不接管：
  // 那些形态在 legacy 里同样是语句收口时一次建完，物化会让它们提前变绿、跨 WP 的 case 布局漂移。
  try {
    built = StatementShapeAst.Build(body, units, this.Pos, this.Template, context);
  } catch {
    built = null;
  }
}
if (built === null) {
  // **影子体**：壳的 `ComputePossibleShapes` 只在「上一个单元关闭」时被调用，`Data` 末尾常常还躺着
  // 尚未喂给主状态机的新单元（`a.b` 的 `b`、`a[b]` 的 `]` 之后那格）。用同一个状态机在**当前全量
  // raw 单元**上重放一遍，就能在本格判断「这已经是一个完整表达式」并把形状提前物化出来。影子体只读
  // raw 单元、只写自己的 Frames，不碰主状态机（`Ingested` / `Units` / `Root` 全不动）。
  const shadow = new StatementOperatorBody(this.Template);
  try {
    shadow.IngestAll(this.Data, this.Template);
    shadow.Finish();
  } catch {
    return;
  }
  if (shadow.Incomplete || !shadow.IsComplete() || shadow.Root === null || shadow.Root.Data.length !== 1
    || shadow.Expect === StatementOperatorBody.ExpectTypeTail || shadow.TypeTailUnits > 0) {
    return;
  }
  try {
    built = StatementShapeAst.Build(shadow, units, this.Pos, this.Template, context);
  } catch {
    built = null;
  }
}
if (built === null) {
  return;
}
this.IncrementalRaw = this.Data.slice();
this.IncrementalMounted = built;
this.Data.length = 0;
this.Add(built);
```

## method PrimeIncremental:(context:SyntaxContext)=>void

```ts
// 壳刚建好（`RootExpressionStatementPossibleShape.BuildByIndex`）时喂一次表达式体并尝试物化。
// 为什么需要：壳的 `ComputePossibleShapes` 由「上一个单元关闭」触发，首格之后往往要等下一格才跑；
// 而像 `f()` / `[...a]` 这种**首格就是一个完整括号单元**的形态，壳建出来那一刻表达式体其实已经是
// 完整表达式，等到下一次 `ComputePossibleShapes` 就已经和收口撞在同一格了。这里只做「喂 + 挂」，
// **不跑终结候选**（不调 `super.ComputePossibleShapes`），所以收口时机与 legacy 逐字节一致；
// 开关 false 时整段不执行。
if (!StatementRouteUtil.IsIncrementalShapesEnabled()) {
  return;
}
if (this.Kind !== StatementRoute.ShellPlainExpression) {
  return;
}
if (this.IncrementalMounted !== null) {
  return;
}
this.UnpackIncremental();
if (this.OperatorBody !== null) {
  this.OperatorBody.IngestAll(this.Data, this.Template);
}
this.TryMountIncremental(context);
```

## method Process:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

```ts
// [E-SHAPE:MOUNT] 逐字符驱动从根单元把窗口交给**挂载单元**（`UnitToken.Process` → `MountedUnit.Process`），
// 语句壳就是其中一层。`super.Process` 里每次 `Transit` 都会把新单元 `Add` 进 `Data`，但新单元的
// `Close`（也就是父单元的 `ComputePossibleShapes`）要等到**下一格**；而 `a.b` / `-a` 这类形态的最后一格
// 恰好就是「表达式完成」和「语句收口」同一格。所以在本窗口处理完之后再尝试一次物化：新单元已经在
// `Data` 里，影子体能看见它，形状因此能提前一格出现在可见树上。
// 收口路径不受影响：`TryMountIncremental` 只挂形状、不跑终结候选；下一次 `ComputePossibleShapes` /
// `TryToClose` / `ExitOrPre` 会先 `UnpackIncremental` 还原 raw 单元。开关 false 时整段不执行。
super.Process(context, buffer, index);
if (!StatementRouteUtil.IsIncrementalShapesEnabled()) {
  return;
}
if (this.Kind !== StatementRoute.ShellPlainExpression || this.OperatorBody === null) {
  return;
}
this.TryMountIncremental(context);
```

## static method BuildFromShell:(host:Token, endIndex:int, context:SyntaxContext)=>Token

```ts
const shell = host as StatementShape;
// [E-SHAPE:MOUNT] 收口前必须先把上一格物化挂载的形状卸回 raw 单元：下面的 `IngestAll` / `builder.Load`
// / legacy 分派读的都是「壳里收着的原始单元」，两种模式的 `consumed` 与 `Pos` 才逐位相同。
shell.UnpackIncremental();
if (endIndex < 0) {
  throw new Error("语句壳没有可建的代码单元");
}
// S3c：收口前把壳里**还没喂过**的单元补齐给表达式体。壳的 `ComputePossibleShapes` 只在「有新单元流进来」
// 时被调用，因此「本条目最后一格」之后不再有格子来喂它（`a;` / 文件末尾的 `a+b`），体就会停在
// `Ingested == 0`、`IsComplete()` 永远假——那不是「形状树不支持」，而是「状态机没吃到单元」。
// `IngestAll` 只从 `Ingested` 往后追加、遇 `Closed` / `Incomplete` 即停，所以这一步对已经喂完的体是空操作。
if (shell.OperatorBody !== null) {
  shell.OperatorBody.IngestAll(shell.Data, host.Template);
  shell.OperatorBody.Finish();
}
// R7-A1（落点 B，R7-CONTRACT §1.1.3）：直建会话在语句内报了**恢复切点** `StopAt`（壳 `Data` 下标，
// `Units[0..StopAt-1]` 是本条语句）⇒ 本条目只消费到切点**前一位**，切点之后的单元**在同一个壳里续建**
// （见下面的续建块），从而得到与 tsc 一致的「两条语句」。
// **切点只能在 `Finish` 之后读**：EOF 收口时壳的最后几格还没喂过会话（与上面 S3c 的
// `OperatorBody.IngestAll` 同一个滞后），`Finish` 自己会补齐到 `endIndex` 并发现切点。所以在直建
// 成功之后才取 `StopAt` 决定 `consumed` 的长度 —— 不是「先缩再建」，而是「建完按实际消费量 splice」，
// 结果与「先缩 endIndex」逐位相同（语句只到切点前一位、剩下的属于下一条语句）。
// **一级回退点**：`AllowRecovery=false` ⇒ `StopAt` 恒 -1 ⇒ `consumed` 就是整条 `endIndex` 切片，
// 本段逐字节是 `55b207da` 的行为（R7-CONTRACT §1.1.5）。
// 会话类型是 `DirectSession` 接口，`StopAt` 只在其实现类上（接口本轮只读 ⇒ 这里按鸭子类型读）。
const direct = shell.DirectSession;
let consumed:Array<Token> = host.Data.slice(0, endIndex + 1);
// H2（CONTRACT §4.1）：直建的唯一收口点。session 已把 AST 形状树建好时，在 `new StatementBuilder` **之前**
// 直接交回：`host.Data.splice` 与旧路径末尾同源，`FinishShell` / leftover 重放照旧。覆盖范围外的语句
// （session 为 null，或已 Decline）逐字节走下面的旧路径；三条收口路径（`;`/ASI、EOF、`}`）都经过这里，
// 所以只需要这一个分支。直建成功时 builder 一次都不创建（验收口径 A6：builder.Load 调用数 == 0）。
if (direct !== null && !direct.Declined) {
  let directBuilt:Token | null = null;
  try {
    directBuilt = direct.Finish(endIndex, context);
  } catch (error) {
    // C4（R2-CONTRACT §3.2）：直建 `Finish` 抛错 = 「直建没收住」，必须计数后再回落旧路径
    // （绝不静默变成绿）。若异常来自已计数的 Decline（`--strict` 的 StrictViolations 抛错），
    // `Declined` 已为真，不重复计入 Errors —— 判据始终是计数器，不是「有没有抛异常」。
    // R4（R4-CONTRACT §1.5）：`--strict` 的 **Incomplete** 抛错同理——`IncompleteFallback` 与
    // `StrictViolations` 在抛出前都已 +1（`a +` / `a as` 的读数就是 `incomplete=1 strictViolations=1`），
    // 它是「解析器自己的拒绝」，不是异常兜底，因此也不记 `Errors`（R4-S-01/02 的 `errors==0`）。
    const message = error instanceof Error ? error.message : String(error);
    if (!direct.Declined && message.indexOf("DirectBuild strict") !== 0) {
      DirectBuildMetrics.Errors += 1;
      DirectBuildMetrics.LastError = message;
      DirectBuildMetrics.Trace("direct finish error: " + message);
    } else {
      DirectBuildMetrics.Trace("direct finish strict (already counted): " + message);
    }
    directBuilt = null;
  }
  if (directBuilt !== null) {
    const recovery:any = direct;
    const stopAt:any = recovery.StopAt;
    let tailFrom = -1;
    if (stopAt !== undefined && stopAt !== null && stopAt >= 0 && stopAt - 1 < endIndex) {
      // 只消费到切点前一位：切点及其后属于**下一条语句**。
      consumed = host.Data.slice(0, stopAt);
      tailFrom = stopAt;
    }
    host.Data.splice(0, consumed.length);
    if (tailFrom >= 0) {
      // **续建（R7-A1 落点 B 的第二半）**：为什么不能只靠 `FinishShell` 的 leftover 重放？
      // 重放是「把 raw 单元原位插回父单元、再按父目录逐格判定」——它假定后面还有**字符流**把新壳喂满。
      // 恢复的切点几乎总在**文件末尾**（`a b` / `as b` / `1 2` / `x = 1 y = 2` / `a b;`），此时字符流已经
      // 结束：第二格之后的单元（`f() g()` 的 `()`、`x = 1 y = 2` 的 `= 2`、`a b;` 的 `;`）永远进不了新壳，
      // 实测会得到「碎片语句」（`a b;` → 多余 EmptyStatement、`a b c` → 第三条 Pos=0）或直接抛错。
      // 所以在这里按**同一条恢复规则**把尾巴逐条建完：每条一个新壳 + 一个新会话（同一批判据、同一批否决），
      // 建好的语句按序插回父单元，壳的 `Data` 清空 ⇒ `FinishShell` 的 leftover 为空、不再重放。
      // 只有「壳已挂在父单元里」时才这么做；递归调用（下面的 tailShell，`Parent === null`）不插手，
      // 它的剩余单元由本循环接着建 —— 这就是 `a b c` 的三条语句。
      const tailParent = host.Parent;
      const tailAt = tailParent === null ? -1 : tailParent.Data.indexOf(host);
      if (tailParent !== null && tailAt >= 0) {
        let pending:Array<Token> = host.Data.slice();
        const extras:Array<Token> = [];
        let lastEnd = directBuilt.SourceRange.EndIndex;
        while (pending.length > 0) {
          let first = 0;
          while (first < pending.length && pending[first].IsTriviaToken) {
            first++;
          }
          if (first >= pending.length) {
            break;
          }
          const tailShell = new StatementShape(host.Template);
          tailShell.Kind = StatementRoute.ShellPlainExpression;
          tailShell.Pos = lastEnd < 0 ? 0 : lastEnd;
          tailShell.OperatorBody = new StatementOperatorBody(tailShell.Template);
          for (const item of pending) {
            tailShell.Add(item);
          }
          tailShell.DirectSession = DirectBuildRouter.Create(StatementRoute.ShellPlainExpression, tailShell, context);
          let tailBuilt:Token | null = null;
          try {
            const tailLast = ItemUtil.LastCodeInItem(tailShell.Data);
            if (tailLast >= 0) {
              tailBuilt = StatementShape.BuildFromShell(tailShell, tailLast, context);
            }
          } catch (tailError) {
            // 续建失败：尾巴原样留在本壳里，交回旧的重放通道（不吞错、不假装建好）。
            host.Data.length = 0;
            for (const item of pending) {
              host.Data.push(item);
            }
            throw tailError;
          }
          if (tailBuilt === null) {
            break;
          }
          extras.push(tailBuilt);
          if (tailBuilt.SourceRange.EndIndex >= 0) {
            lastEnd = tailBuilt.SourceRange.EndIndex;
          }
          pending = tailShell.Data.slice();
        }
        if (extras.length > 0) {
          host.Data.length = 0;
          for (let at = 0; at < extras.length; at++) {
            extras[at].Parent = tailParent;
            tailParent.Data.splice(tailAt + 1 + at, 0, extras[at]);
          }
        }
      }
    }
    return directBuilt;
  }
}
const builder = new StatementBuilder(host.Template, context);
builder.Load(consumed, shell.Pos);
// S3c（设计 §4.4）：**有完整 OperatorBody 的表达式语句**先用形状树建 AST；形状树拒绝（未覆盖构造 /
// 覆盖不全 / 不完整）时 `built` 仍是 null，`builder.At` 未被消费，下面照旧走 legacy `BuildStatement()`——
// 两条路读的是同一份 `consumed` 与同一个 `Pos`，所以「接管与否」不改变任何其它语句的行为。
// 捕获异常只用于「形状路径自己出错」这一种情形（记录后回 legacy，绝不吞掉成假绿：
// `StatementShapeAst.TotalShapeAst` 不会因此增加，op-ast-proof 会红）。
let built:Token | null = null;
if (shell.Kind === StatementRoute.ShellPlainExpression && shell.OperatorBody !== null) {
  try {
    built = builder.BuildExpressionStatementFromShapes(shell.OperatorBody);
  } catch {
    built = null;
  }
}
if (built === null && (shell.Kind === StatementRoute.ShellVariable || shell.Kind === 0)) {
  // Stage 5c：三层 possible（列表级 / 声明级只判型，语句级复用同一建造器）先决定这一条是不是
  // `let` / `const` / `var` 声明列表。不成立时 `TryBuild` 返回 null 且零副作用，下面逐字节走基线；
  // 成立时它执行的仍是同一句 `builder.BuildStatement()`（同一 `builder`、同一 `consumed`、同一
  // `shell.Pos`），因此接管不改变任何节点 / Pos / End——AST 相等由构造保证，不是靠测试兜住。
  built = VariableStatementThreeLayer.TryBuild(builder, consumed);
}
// **Stage 5d-3：根层声明语句壳直接调 family builder**（不经过 `BuildStatement()` 的整段 raw 分派）。
// 三个族都只把**同一段** `consumed` 交给同一个 `FromUnits` / 声明建造器，所以节点 / Pos / End 与 legacy
// 逐位相同；接管的证据只看 `FunctionDeclarationShellCount` / `ClassDeclarationShellCount` 与
// `LegacyStatementDispatchCount` 的差值，别的计数器一个都不动。
//
// 装饰器族的判型**不新写**：`BuildDecoratedStatement` 用 `ScanDecoratedHead` 认出装饰器之后的声明关键字
// 再分派到对应声明 builder（`class` / `abstract` → Class，`function` → Function，`interface` / `enum` /
// `type` / `namespace` 走各自声明建造器，变量族走 `BuildDecoratedVariableStatement`）。它与
// `BuildStatement()` 里 `@` 分支调用的是**同一个方法**，所以接管不改变分派判据；返回 null（`@` 后面
// 不是声明，TS 侧本就非法）时照旧落回下面的 `BuildStatement()`。
if (built === null && shell.Kind === StatementRoute.ShellFunctionDeclaration) {
  built = builder.BuildFunctionDeclaration();
} else if (built === null && shell.Kind === StatementRoute.ShellClassDeclaration) {
  built = builder.BuildClassDeclaration();
} else if (built === null && shell.Kind === StatementRoute.ShellDecoratedDeclaration) {
  built = builder.BuildDecoratedStatement();
}
if (built === null) {
  // Stage 5d-1a（零行为变化）：这一格是 legacy「整段 raw 分派建树」的唯一入口——形状树与三层 possible 都没接住时，
  // 整条语句交回 `StatementBuilder.BuildStatement()`。两个计数器只记录事实，不改变任何分支 / 顺序 / 状态：
  //   `ShapeAstDeclinedCount`：本格**本可以**由形状树建 AST（表达式族 + 有 `OperatorBody`）却停在 `null`（拒绝或抛错）；
  //   `LegacyStatementDispatchCount`：本格确实退回了 legacy 分派（含非表达式族的壳）。
  if (shell.Kind === StatementRoute.ShellPlainExpression && shell.OperatorBody !== null) {
    StatementLegacyMetrics.ShapeAstDeclinedCount++;
  }
  // Stage 5d-1b：**语句壳收口的建树所有权**已迁到 possible 层——`StatementFamilyDispatch` 按壳 `Kind`
  // 与首代码单元直接调用 `StatementBuilder` 的 family 方法（`BuildBlock` / `BuildIf` / `BuildInterfaceDeclaration`
  // …，与 legacy 分派是**同一批工厂方法**）。返回 `null` 只表示「调用点越界」这一种退化情形，
  // 此时才原样退回 `BuildStatement()`：同一个 `builder`、同一段 `consumed`、同一个 `shell.Pos`。
  // Stage 5d-4 起连 `declare const|let|var|using` 也由 possible 层直接调
  // `StatementBuilder.BuildDeclareVariableStatement()`（同一格逐字同源），因此默认解析下
  // `LegacyStatementDispatchCount` = 0：`BuildStatement()` 只剩「未建壳的根层语句 / 文件级 fallback」在用。
  built = StatementFamilyDispatch.Build(builder, shell.Kind);
  if (built === null) {
    StatementLegacyMetrics.LegacyStatementDispatchCount++;
    built = builder.BuildStatement();
  }
}
if (builder.At !== builder.Units.length) {
  throw new Error("语句没有读完");
}
host.Data.splice(0, consumed.length);
return built;
```

## static field LeftoverReplayDepth:int = 0

## static method FinishShell:(shell:Token, built:Token, context:SyntaxContext | null)=>void

```ts
const parent = shell.Parent;
if (parent === null) {
  throw new Error("语句壳没有父单元，无法收口");
}
const index = parent.Data.indexOf(shell);
if (index < 0) {
  throw new Error("语句壳不在父单元里，无法收口");
}
const leftover:Array<Token> = shell.Data.slice();
shell.Data.length = 0;
parent.Data.splice(index, 1, built);
built.Parent = parent;
if (parent.MountedUnit === shell) {
  parent.MountedUnit = null;
}
for (let at = 0; at < leftover.length; at++) {
  leftover[at].Parent = parent;
  parent.Data.splice(index + 1 + at, 0, leftover[at]);
}
if (context !== null && leftover.length > 0 && StatementShape.LeftoverReplayDepth === 0) {
  const host = parent as unknown as ShapeToken;
  const guide = host.CatalogGuide;
  if (guide !== null) {
    StatementShape.LeftoverReplayDepth += 1;
    try {
      for (const unit of leftover) {
        if (unit.IsTriviaToken) {
          continue;
        }
        const at = parent.Data.indexOf(unit);
        if (at < 0) {
          // 这一格已经被前一次重放建进某条形状里（父目录消费了它），跳过。
          continue;
        }
        try {
          guide.ComputePossibleShapesByIndex(parent, at, context, PossibleSource.Close);
          StatementRouteUtil.LeftoverReplayCount += 1;
        } catch {
          // 尽力而为：父目录拒收 / 抛错就停在这里，后续格子交回 EOF / fallback 路径。
          StatementRouteUtil.LeftoverReplayFailed += 1;
          break;
        }
      }
    } finally {
      StatementShape.LeftoverReplayDepth -= 1;
    }
  }
}
```

## static method DetachShell:(shell:Token)=>bool

```ts
const shape = shell as StatementShape;
const parent = shell.Parent;
if (parent === null) {
  return false;
}
const index = parent.Data.indexOf(shell);
if (index < 0) {
  return false;
}
const raw:Array<Token> = shell.Data.slice();
shell.Data.length = 0;
parent.Data.splice(index, 1);
for (let at = 0; at < raw.length; at++) {
  raw[at].Parent = parent;
  parent.Data.splice(index + at, 0, raw[at]);
}
if (parent.MountedUnit === shell) {
  parent.MountedUnit = null;
}
shape.Parent = null;
shape.Closed = true;
return true;
```

## protected method ExitOrPre:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>BranchStates

```ts
// [E-SHAPE:MOUNT] 块体 `}` 收口前同样先卸回 raw 单元（`lastCode` / `BuildFromShell` 都按 raw 下标算）。
this.UnpackIncremental();
if (this.Closed) {
  return BranchStates.Undo;
}
const parent = this.Parent;
if (parent === null || !(parent instanceof Bracket)) {
  return BranchStates.Undo;
}
const bracket = parent as Bracket;
if (bracket.StartBracketChar !== "{" || value !== bracket.EndBracketChar) {
  return BranchStates.Undo;
}
const lastCode = ItemUtil.LastCodeInItem(this.Data);
if (lastCode < 0) {
  return BranchStates.Undo;
}
let built:Token | null = null;
try {
  built = StatementShape.BuildFromShell(this, lastCode, context);
} catch {
  built = null;
}
if (built !== null) {
  StatementShape.FinishShell(this, built, context);
  return BranchStates.Reload;
}
if (StatementShape.DetachShell(this)) {
  return BranchStates.Reload;
}
return BranchStates.Undo;
```

## method OnBracketCreatedEvent:(bracket:Token, context:SyntaxContext)=>void

```ts
BlockPossibleShape.OnShellBracketCreated(this, bracket, context);
```

## method TryToClose:(context:SyntaxContext)=>CloseStates

```ts
// [E-SHAPE:MOUNT] EOF / 父单元收口前先卸回 raw 单元：下面的 `lastCode` / 边界判据 / `BuildFromShell`
// 全部按 raw `Data` 下标定位，两种模式的收口位必须逐位相同。
this.UnpackIncremental();
if (!this.Closed) {
  const lastCode = ItemUtil.LastCodeInItem(this.Data);
  if (lastCode >= 0) {
    // Stage 4c：EOF 收口也要先问一次扫描器 / 判据的 `End`（变量族 / 声明族；表达式壳仍消费到末单元）。
    // 受限产生式的 ASI 会在壳里留下**下一条语句**（`throw` ⏎ `a` 的 `a`、`if (a) b` ⏎ `c` 的 `c`）：
    // 一律消费到 `lastCode` 会让 `BuildStatement` 读到两条语句（`At !== Units.length` → 拆壳 →
    // 根终结候选只建回第一条），后一条就丢了（ast-json `dts-recovery` 的 `throw\na` 结构差）。
    let endIndex = lastCode;
    if (this.Kind === StatementRoute.ShellDeclarationFamily) {
      // Stage 4af-F：声明族的 EOF 收口与终结候选读同一份判据（`StatementBoundaryUtil.StatementEndCode`）。
      // `atEof` 传 `true`（这里就是文件末尾）；声明跟随边界在它**之前**判，所以
      // `type T = A` ⏎ `a` 收在 `A` 而不是吞掉 `a`。
      const codeAt:Array<number> = [];
      for (let at = 0; at < this.Data.length; at++) {
        if (!this.Data[at].IsTriviaToken) {
          codeAt.push(at);
        }
      }
      const end = StatementBoundaryUtil.StatementEndCode(this.Data, codeAt, true, true);
      if (end >= 0) {
        endIndex = end;
      }
    } else if (this.Kind === StatementRoute.ShellFunctionDeclaration
      || this.Kind === StatementRoute.ShellClassDeclaration
      || this.Kind === StatementRoute.ShellDecoratedDeclaration) {
      // **Stage 5d-3**：根层声明语句壳的 EOF 兜底与终结候选读**同一份**判据
      // （`StatementBoundaryUtil.DeclarationShellEndCode`：体括号 / `;` / 声明跟随边界 / EOF），
      // 不再走 `ScanRoot`。壳里若已收着体括号，收在它身上；ambient 无体签名收在末代码单元。
      const codeAt:Array<number> = [];
      for (let at = 0; at < this.Data.length; at++) {
        if (!this.Data[at].IsTriviaToken) {
          codeAt.push(at);
        }
      }
      const end = StatementBoundaryUtil.DeclarationShellEndCode(this.Data, codeAt, true,
        this.Kind === StatementRoute.ShellDecoratedDeclaration);
      if (end >= 0) {
        endIndex = end;
      }
    } else if (this.Kind === StatementRoute.ShellPlainExpression) {
      // R4-C2（R4-CONTRACT §1.3 / §4.1，审批 A-2）：表达式壳在 EOF 收口时也必须先问一次**同一份**
      // ASI 判据（`StatementBoundaryUtil.StatementEndCode` → `IsAsiBoundary`，其中包含 C2 新增的
      // 「行首操作数起点」分支）。这一支原来把 `endIndex` 直接钉在 `lastCode` 上：`a⏎b` 整段被吞进
      // 一条壳，壳里明明已经是 ASI 边界、直建 session 却只能在 Finish 里 Decline(`expr.stopped`)。
      // 现在与声明族/控制流族同一口径：判据先答在哪收口，`endIndex` 跟着判据走。
      // 只接 ShellPlainExpression 这一支——其它族一位不动（R3 的 5d-2a/2b/3 各自分支保持原样）。
      const code:Array<Token> = [];
      const codeAt:Array<number> = [];
      for (let at = 0; at < this.Data.length; at++) {
        if (!this.Data[at].IsTriviaToken) {
          code.push(this.Data[at]);
          codeAt.push(at);
        }
      }
      const end = StatementBoundaryUtil.StatementEndCode(this.Data, codeAt, true, false);
      if (end >= 0) {
        endIndex = end;
      }
    } else if (this.Kind !== StatementRoute.ShellPlainExpression) {
      const code:Array<Token> = [];
      const codeAt:Array<number> = [];
      for (let at = 0; at < this.Data.length; at++) {
        if (!this.Data[at].IsTriviaToken) {
          code.push(this.Data[at]);
          codeAt.push(at);
        }
      }
      StatementScanner.AtEOF = true;
      if (StatementBoundaryUtil.IsControlFlowFamilyCode(code)) {
        // Stage 5d-2b：带体 / 链式控制流族的 EOF 兜底与终结候选读**同一份**判据
        // （`ControlFlowFamilyEndCode`），不再经 `ScanRoot`。这里只加这一条同源分支，
        // 其余族逐位不变。
        const controlEnd = StatementBoundaryUtil.ControlFlowFamilyEndCode(code);
        if (controlEnd >= 0 && controlEnd < codeAt.length) {
          endIndex = codeAt[controlEnd];
        }
      } else if (StatementBoundaryUtil.IsSemicolon(code[0])) {
        // **Stage 5d-5**：空语句壳（首代码单元就是 `;`）——`ScanRoot` 对它答 `Complete(0)`，
        // 这里读同一条事实（`IsSemicolon` 是 `ScanRoot` 那一条判据的唯一实现点）。
        endIndex = codeAt[0];
      } else if (StatementBoundaryUtil.IsShortFamilyCode(code)) {
        // **Stage 5d-5**：短语句族（`return` / `throw` / `break` / `continue` / `debugger` /
        // `let`·`const`·`var`）的 EOF 兜底与终结候选读**同一份**判据（`ShortFamilyEndCode`，
        // `atEof = true` 与这里刚设的 `StatementScanner.AtEOF` 是同一个事实），不再经 `ScanRoot`。
        // 迁移前它是本方法唯一的 `ScanRoot` 调用点（全语料 522 次，占默认解析残余的四成）。
        const shortEnd = StatementBoundaryUtil.ShortFamilyEndCode(code, true);
        if (shortEnd >= 0 && shortEnd < codeAt.length) {
          endIndex = codeAt[shortEnd];
        }
      } else if (StatementBoundaryUtil.IsYieldFamilyCode(code)) {
        // Stage 5d-6：`yield` 族的 EOF 兜底与终结候选读**同一份**判据（`YieldFamilyEndCode`，
        // `atEof` 传 `true`——这里就是块体 / 文件末尾），不再经 `ScanRoot`。
        const yieldEnd = StatementBoundaryUtil.YieldFamilyEndCode(code, true);
        if (yieldEnd >= 0 && yieldEnd < codeAt.length) {
          endIndex = codeAt[yieldEnd];
        }
      } else if (StatementBoundaryUtil.IsAwaitFamilyCode(code)) {
        // Stage 5d-6：`await` 族同一条 EOF 兜底（`AwaitFamilyEndCode`），同样不再经 `ScanRoot`。
        const awaitEnd = StatementBoundaryUtil.AwaitFamilyEndCode(code, true);
        if (awaitEnd >= 0 && awaitEnd < codeAt.length) {
          endIndex = codeAt[awaitEnd];
        }
      } else {
        // 兜底：未知族起点（语料 0 次；留着让「不在上面任何一族」的形态仍走今天的行为，
        // 而不是悄悄换一条收口规则）。出现即说明有族没归位——指标里会直接看到 `ScanRoot > 0`。
        const result = StatementScanner.ScanRoot(code);
        if (result.Status === 1 && result.End >= 0 && result.End < codeAt.length) {
          endIndex = codeAt[result.End];
        }
      }
    }
    let built:Token | null = null;
    try {
      built = StatementShape.BuildFromShell(this, endIndex, context);
    } catch {
      built = null;
    }
    if (built !== null) {
      StatementShape.FinishShell(this, built, context);
      return CloseStates.Nothing;
    }
    // 兜底：壳里这一段建不出来（例如 `satisfies` / 类型实参这种扫描器给不出 Status==1 的形态），
    // 就把 raw 单元按原位退回父单元、把自己摘掉，让根终结候选按基线口径建剩下的语句。
    // 不这么做时壳会以「未建树的形状」留在根里，AST 少整条语句（4 个 diff 的根因）。
    if (StatementShape.DetachShell(this)) {
      return CloseStates.Nothing;
    }
  }
}
return super.TryToClose(context);
```
