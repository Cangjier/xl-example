# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ComputePossibleShapesStates } from "../../../core/syntax/compute-possible-shapes-states.xl.md"
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
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
import { StatementRoute } from "./statement-route-util.xl.md"
import { StatementRouteUtil } from "./statement-route-util.xl.md"
import { VariableStatementThreeLayer } from "./variable-statement-three-layer.xl.md"
import { BlockPossibleShape } from "./block-possible-shape.xl.md"
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

## field Kind:int = 0

## field BodyKind:int = 0

## field OperatorBody:StatementOperatorBody | null = null

## field DirectSession:DirectSession | null = null

## static field BodyKindBlock:int = 1

## static field BodyKindObjectLiteral:int = 2

## constructor:(template:Template)=>void

```ts
super(template);
```

## method ComputePossibleShapes:(context:SyntaxContext)=>ComputePossibleShapesStates

```ts
// H1（CONTRACT §4.1）：直建的唯一喂入点——子单元关闭事件先喂 session，再走既有候选计算。
// 不改返回值、不建形状、不碰 CatalogGuide；`DirectSession === null` 时本句是空操作。
// **R3-S（R3-CONTRACT §4.4）**：`--strict` 时 `Decline` / `Incomplete` **在 Ingest 期**就会抛
// （`Decline`：`Declined+=1` → `NoteDecline` → `StrictViolations+=1` → `throw`）。不在这里接住，
// 异常会穿出 `Parse`（R2 审计 §7 R2 条：`let {a} = b` 在 Strict 下抛穿）。计数语义与 H2 完全一致：
// 已计数的 Decline 不再计 `Errors`；接住之后**继续走** `super.ComputePossibleShapes(context)`，
// 由 H2 的 `!direct.Declined` 拦下 Finish ⇒ 旧路径建树（AST 不变）。
if (this.DirectSession !== null) {
  const ingestSession = this.DirectSession;
  try {
    ingestSession.Ingest(this.Data, context);
  } catch (error) {
    if (!ingestSession.Declined) {
      DirectBuildMetrics.Errors += 1;
      DirectBuildMetrics.LastError = error instanceof Error ? error.message : String(error);
      DirectBuildMetrics.Trace("direct ingest error: " + DirectBuildMetrics.LastError);
    }
  }
}
if (this.OperatorBody !== null) {
  this.OperatorBody.IngestAll(this.Data, this.Template);
}
return super.ComputePossibleShapes(context);
```

## static method BuildFromShell:(host:Token, endIndex:int, context:SyntaxContext)=>Token

```ts
const shell = host as StatementShape;
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
const consumed:Array<Token> = host.Data.slice(0, endIndex + 1);
// H2（CONTRACT §4.1）：直建的唯一收口点。session 已把 AST 形状树建好时，在 `new StatementBuilder` **之前**
// 直接交回：`host.Data.splice` 与旧路径末尾同源，`FinishShell` / leftover 重放照旧。覆盖范围外的语句
// （session 为 null，或已 Decline）逐字节走下面的旧路径；三条收口路径（`;`/ASI、EOF、`}`）都经过这里，
// 所以只需要这一个分支。直建成功时 builder 一次都不创建（验收口径 A6：builder.Load 调用数 == 0）。
const direct = shell.DirectSession;
if (direct !== null && !direct.Declined) {
  let directBuilt:Token | null = null;
  try {
    directBuilt = direct.Finish(endIndex, context);
  } catch (error) {
    // C4（R2-CONTRACT §3.2）：直建 `Finish` 抛错 = 「直建没收住」，必须计数后再回落旧路径
    // （绝不静默变成绿）。若异常来自已计数的 Decline（`--strict` 的 StrictViolations 抛错），
    // `Declined` 已为真，不重复计入 Errors —— 判据始终是计数器，不是「有没有抛异常」。
    if (!direct.Declined) {
      DirectBuildMetrics.Errors += 1;
      DirectBuildMetrics.LastError = error instanceof Error ? error.message : String(error);
      DirectBuildMetrics.Trace("direct finish error: " + DirectBuildMetrics.LastError);
    }
    directBuilt = null;
  }
  if (directBuilt !== null) {
    host.Data.splice(0, consumed.length);
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
          guide.ComputePossibleShapesByIndex(parent, at, context);
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
