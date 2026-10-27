# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { StatementScanner } from "./statement-scanner.xl.md"
```

# namespace cangjie

# class StatementRoute

```ts
0 = None                  // 还没判出（只有 trivia / 首代码单元未到）：谁都不许据此 Reject
1 = ShellPlainExpression  // 普通表达式起点 → RootExpressionStatementPossibleShape 建壳
2 = ShellVariable         // let/const/var + 能起绑定 → VariableStatementPossibleShape 建壳
3 = Legacy                // 其余全部：留给 legacy 候选（import/export/声明/控制流/`;`/`{`）
4 = ShellStatementFamily  // Stage 4：控制流语句族壳化，本阶段留空
```

## static field None:int = 0

## static field ShellPlainExpression:int = 1

## static field ShellVariable:int = 2

## static field Legacy:int = 3

## static field ShellStatementFamily:int = 4

## static field ShellBlock:int = 5

## static field ShellLabel:int = 6

## static field ShellDeclarationFamily:int = 7

## static field ShellFunctionDeclaration:int = 8

## static field ShellClassDeclaration:int = 9

## static field ShellDecoratedDeclaration:int = 10

## static field ShellCaseClauseHead:int = 11

[WP-S1] `switch` 子句头壳（`case <表达式> :` / `default :`）。与 `ShellStatementFamily` 并列的一族：
候选是 `CaseClauseHeadPossibleShape`，终结候选 `StatementEndPossibleShape` 的 `StatementKind` 也取本值
（`ClauseHeadEndCode`：三元深度 0 的 `:`），建树走 `StatementFamilyDispatch.BuildByHead` →
`StatementBuilder.BuildCaseClauseHead`。子句**语句**仍是 `CaseClauseStatementPossibleShape` 那一族，
两者各管冒号的**前 / 后**，不重叠。

# class StatementClass

## static field Unknown:int = 0

## static field OperandStart:int = 1

## static field BinaryOperator:int = 2

## static field PrefixOperator:int = 3

## static field Postfix:int = 4

## static field MemberAccess:int = 5

## static field Separator:int = 6

## static field Semicolon:int = 7

## static field Eof:int = 8

## static field StatementStart:int = 9

# class StatementRouteUtil

## static field EnableShellExpressions:bool = true

## static field EnableIncrementalVariableShapes:bool = true

**「basic tokens → shape」增量重构的唯一静态开关。默认 `true`（D7 波翻转；此前是 `false`）。**

打开后只影响 `let` / `const` / `var` 声明族的建形状过程（`VariableStatementShape` /
`VariableDeclarationListShape` / `VariableDeclarationShape` 及其子形状的逐单元签发与收口）；
关掉（`false`）时这几种形状仍走「壳 + `StatementBuilder` 原子建树」的 legacy 路径。

**为什么现在默认开**（D7 决策，接 W4 / W5 / W6 的三道读数）：

- 增量路径的已知缺口已经收窄到可验收的量：宽语料下崩溃 **0** 条（预期清单已清空；原先 5 条全是外部 vendor
  `lib.*.d.ts`（`INCREMENTAL_CRASH_EXPECTED` 逐字登记）、差异 33（天花板 33）、fallback 85 + 外部白名单 13 = 98，
  且 `policyProblems` 0 条 —— 再让它躺在默认开关后面，等于「修好的路径没人走」。
- 未支持的后续形态仍按 C10 全有或全无：**显式抛错**，由 `SourceFileRunner.Parse` 的
  整文件 legacy 重解析兜底（`ParseCore(shell=false)` 在 `finally` 里把本字段与
  `EnableIncrementalShapes` 一起压 `false`，见 `source-file-runner.xl.md`）。
- 要复核 legacy 读数不需要改产物：`tests/parse/wide-ast.mjs --legacy`（0/0/≤2）与
  `tests/gates/run.mjs --legacy` 会在进程内把两个开关压回 `false`。
- 它只做「选哪条建形状通道」这一件事，不携带任何跨次状态，所以同一进程里两种模式可以交替出现。

## static method IsIncrementalVariableShapesEnabled:()=>bool

读本开关的**唯一入口**：调用方不再直接读字段，翻开关只写字段（默认 `false`）。

```ts
return StatementRouteUtil.EnableIncrementalVariableShapes;
```

## static field EnableIncrementalShapes:bool = true

**「全场景逐字符形状路径」的一级开关。默认 `true`（D7 波与
`EnableIncrementalVariableShapes` 一起翻转；此前是 `false`）。**

打开后新路径才允许为语句 / 表达式 / 声明等**所有**语句族逐字符签发 shape；`false` 时新路径一步不走，
所有形状仍走默认的「壳 + Builder 原子建树」路径，既有产物逐字节不变。

它和 `EnableIncrementalVariableShapes` **相互独立**：后者只控制变量声明族的增量建形状（基础实现），
本字段是把同一套机制推广到全场景的总闸（全场景重构的 bootstrap）。harness 在增量模式下两者同时打开、
legacy 下同时关闭（`--legacy`）；`SourceFileRunner.ParseCore(shell=false)` 的整文件兜底也把两者一起压 `false`。

## static method IsIncrementalShapesEnabled:()=>bool

读本开关的**唯一入口**：调用方不再直接读字段，翻开关只写字段（默认 `false`）。

```ts
return StatementRouteUtil.EnableIncrementalShapes;
```

## static field EnableFileFallback:bool = true

## static field FileFallbackCount:int = 0

## static field LastFileFallback:bool = false

## static field EnableBlockBodyCatalog:bool = true

## static field EnableArrowBodyCatalog:bool = true

## static field EnableObjectMethodBodyCatalog:bool = true

## static field BlockShellCount:int = 0

## static field BlockBodyStatementCount:int = 0

## static field LeftoverReplayCount:int = 0

## static field LeftoverReplayFailed:int = 0

## static field EnableControlFlowShell:bool = true

## static field EnableControlFlowLabel:bool = true

## static field EnableControlFlowEmpty:bool = true

## static field ControlFlowShellCount:int = 0

## static field LabelShellCount:int = 0

## static field EnableAwaitStatement:bool = true

## static field AwaitShellCount:int = 0

## static field EnableYieldStatement:bool = true

## static field YieldShellCount:int = 0

## static field ControlFlowBodyBraceCount:int = 0

## static field EnableLabelBodyCatalog:bool = true

## static field LabelBodyMountCount:int = 0

## static field EnableDeclarationShell:bool = true

## static field DeclarationShellCount:int = 0

## static field EnableRootDeclarationShell:bool = true

## static field EnableBlockDeclarationShell:bool = true

## static field BlockDeclarationShellCount:int = 0

## static field FunctionDeclarationShellCount:int = 0

## static field ClassDeclarationShellCount:int = 0

## static field DecoratedDeclarationShellCount:int = 0

## static field EnableSwitchCaseClause:bool = true

## static field SwitchCaseClauseMountCount:int = 0

## static field SwitchCaseClauseShellCount:int = 0

## static field EnableSwitchCaseClauseHead:bool = true

[WP-S1] 子句**头**候选（`case-clause-head-possible-shape.xl.md`）的总开关，与 `EnableSwitchCaseClause`
同一行同源判定：两者必须同开同关，只开一处就是「开关后面只接了一条腿」（挂载侧关了则 mount=0、
壳计数永远是 0）。默认 `true`，与既有 `EnableSwitchCaseClause` 一致。

[S6] **它之外还有一道模式闸**：`BlockPossibleShape.OnShellBracketCreated` 把子句头候选挂进子句块目录时
还要求 `IsIncrementalShapesEnabled()` 为真（见该文件的 `[S6]` 注释）。本开关默认 `true` 只表示
「增量路径的这条腿开着」，**不表示 legacy 解析也走子句头**——legacy 解析（wide-ast / `tts` 的 legacy
半程）在子句块上逐字节回到「只挂 `CaseClauseStatementPossibleShape`」的 S1 之前形态。两道闸分开的理由：
`EnableSwitchCaseClauseHead` 是功能开关，关掉它 S1 的增量能力（control-flow / switch-fallthrough）就没了；
模式闸关掉的只是「增量壳出现在 legacy 口子下」这一条错配。

## static field SwitchCaseClauseHeadShellCount:int = 0

[WP-S1] 只读计数：子句头壳（`CaseClauseHeadPossibleShape.BuildByIndex`）建出的次数。

## static field EnableBlockClassShell:bool = true

## static field EnableFunctionBodyCatalog:bool = true

[WP-S1] 根层 `function` 声明体的**块体语句目录**开关（`function-declaration-shape.xl.md` 的
`OnBracketCreatedEvent`）。关闭时根层函数体逐字节回到「整段 raw 建树」（WP-S1 之前的行为）。

为什么必须挂：根层 `function` 由 `FunctionDeclarationPossibleShape` 在关键字格 `MountShell`，壳的
`CatalogGuide` 只有终结候选、**没有体目录挂载点**；`Bracket.Transit` 通知宿主时走的是
`UnitToken.OnBracketCreatedEvent`（空实现），`ChildBracketCreatedHook` 那段对「宿主不是括号」的
补通知因此永远进不来。于是函数体 `{` 的 `CatalogGuide` 恒为 `null`，体内**一条语句都拿不到格子**——
`switch` / `case` 在 `control-flow` 里 0 次、`BlockBodyStatementCount` 恒 0，都是这一条的后果。
挂上之后体内语句与控制流块体走**同一条**「语句壳 + `BuildBlock` 收集通道」
（`StatementBuilder.CollectBodyStatements`），建树路径不新增。

## static field FunctionBodyShellCatalogCount:int = 0

[WP-S1] 只读计数：根层函数体挂上块体语句目录的次数。

## static field EnableStuckShellRecovery:bool = true

[S2:STUCK-SHELL] 卡死壳检测（`incremental-stuck-shell-recovery.xl.md`）的总开关。开着只代表
「可以检测、可以计数」（`StuckShellRecoveryCount`），**不代表可以强制收口**——强制收口另有
`IncrementalStuckShellRecovery.ForceClose`，默认 `false`。与 EOF 那条「先计数、后翻行为」同一条纪律。

```ts
true
```

## static field StuckShellRecoveryCount:int = 0

只读计数：检测到「壳连续 ≥ `RecoveryCells` 格 `Uncertain`、而下一条语句的起始词已经到达」的次数。
当前语料上应为 **0**（根因已在 `variable-declaration-shape.xl.md` 的 `[S2:CLOSE-TYPED]` 修掉）。

```ts
0
```

## static field EofDiscardedStatementCount:int = 0

只读计数：EOF 收口时残留的 basic 代码单元里**以语句起始词开头**（`for` / `if` / `switch` / `while` /
`try` / `function` / `class` / `const` …）的文件数。`class-inheritance` 在修复前为 1、修复后应为 0。
**只计数、不抛错**：翻成显式抛错是后续独立提交（保护 195 条「仅 `src` +1」基线）。

```ts
0
```

## static field EnableNamespaceBodyDeclarations:bool = true

**[S3:NAMESPACE-BODY]** 模块体（`namespace` / `module` / `declare global` 的 `{`…`}`）内的**声明族**开关。

打开后 `namespace-body-declaration-mount.xl.md` 才会给模块体括号挂声明目录，`IsDeclarationHost` 才把
「模块块」与「根层」并列为声明宿主。`false` 时模块体括号不挂目录，体内一切逐字节回到本 WP 之前的
「整段 raw 建树」形态（`ts-all` 的 429 条基线因此不可能被本开关误伤）。

## static field NamespaceBodyDeclarationMountCount:int = 0

**[S3:NAMESPACE-BODY]** 只读计数：模块体括号挂上声明目录的次数（每个 `{`…`}` 体 +1）。

## static method IsDeclarationHost:(host:Token | null)=>bool

**[S3:NAMESPACE-BODY] 声明宿主的唯一判据（本方法与 WP-S3 的 `IsDeclarationHost` 一一对应）。**

「声明族能在这里挂壳」的宿主只有两种：

1. **根层**：宿主是文件单元（`SourceFileShape`），`Parent === null`；
2. **模块块**：宿主是 `{` 括号，且这个括号的父单元是 `ModuleDeclarationShape`
   （`namespace N { … }` / `module M { … }` / `declare global { … }` 的体）。

**为什么模块体必须看「括号的父单元」而不是看括号自己**：增量路径里模块体在整条 trace 期间都是
`Bracket`（`ModuleBlockShape` 只在 legacy 收口时由 `ModuleDeclarationShape.FromUnits` 建出来），
所以「宿主是不是模块体」只能由 `ModuleDeclarationPossibleShape` 提前挂出的
`ModuleDeclarationShape` 壳回答。这也是本判据不需要 import `ModuleDeclarationShape` 的原因——
按类名比对（与 `DecideCaseClauseHead` 里 `shape.constructor.name === "CaseClauseHeadPossibleShape"`
同一手法），避免 `statement-route-util ↔ module-declaration-shape` 的循环依赖。

**刻意不认「所有块体」**：`{` 语句块 / 函数体 / 箭头体里的 `interface` / `type` 是**块级声明**，
它们的建树通道由块体目录（`ControlFlowStatementPossibleShape` 的 `ShellDeclarationFamily`）负责；
把它们也算成声明宿主会让声明族候选与块体语句壳同格双 Accept（`CatalogGuide` 抛「终结候选与其它
候选同时成立」），这正是 WP-S3 §风险第一条要求避免的事故。

```ts
if (host === null) {
  return false;
}
if (host.Parent === null) {
  return true;
}
if (!(host instanceof Bracket) || (host as Bracket).StartBracketChar !== "{") {
  return false;
}
const owner = host.Parent;
if (owner === null) {
  return false;
}
return owner.constructor.name === "ModuleDeclarationShape";
```

## static method IsRootDeclarationHost:(host:Token | null)=>bool

**[S3:NAMESPACE-BODY] 根层限定判据（`IsDeclarationHost` 的另一半，两者刻意**分成两个**）。**

`import` / `export` 这一族在模块体里的**合法面比根层窄**：`import x from "m"` / `export =` /
`export as namespace N` 在 `namespace` 体内非法（TS 报 1148 / 1063），`import()` / `import.meta`
则根本是表达式位。所以「导入导出族的专用候选」（`ImportExportDeclarationMount` /
`ImportExportLegacyDeclarationMount` / `ImportDeclarationPossibleShape` /
`ExportDeclarationPossibleShape` / `ImportEqualsDeclarationPossibleShape` /
`ExportAssignmentPossibleShape`）**只能留在根层**——把它们放进模块体目录会与声明族的通用语句壳
抢同一格。判据本体就是原来的 `host.Parent === null`，一个字都不新写。

```ts
if (host === null) {
  return false;
}
return host.Parent === null;
```

## static method IsDeclarationHead:(text:string)=>bool

```ts
return text === "interface" || text === "enum" || text === "type" || text === "namespace"
  || text === "module" || text === "declare" || text === "import" || text === "export"
  || text === "using";
```

## static method DeclinesDeclarationHead:(units:Array<Token>)=>bool

```ts
const itemStart = ItemUtil.ItemStart(units);
if (itemStart < 0 || itemStart >= units.length) {
  return false;
}
const headAt = ItemUtil.NextCode(units, itemStart);
if (headAt >= units.length) {
  return false;
}
const head = units[headAt];
if (!(head instanceof Common)) {
  return false;
}
const text = (head as Common).TempToString();
if (text !== "type" && text !== "module" && text !== "namespace") {
  return false;
}
const nextAt = ItemUtil.NextCode(units, headAt + 1);
if (nextAt >= units.length) {
  return false;
}
const next = units[nextAt];
if (!(next instanceof Common || next instanceof String)) {
  return false;
}
return !StatementScanner.NoLineBreakBetween(head, next);
```

## static method DecideDeclaration:(units:Array<Token>, headAt:int, text:string)=>int

```ts
if (!StatementRouteUtil.EnableDeclarationShell || !StatementRouteUtil.EnableShellExpressions
  || !StatementRouteUtil.EnableControlFlowShell) {
  return StatementRoute.None;
}
if (!StatementRouteUtil.IsDeclarationHead(text)) {
  return StatementRoute.None;
}
const nextAt = ItemUtil.NextCode(units, headAt + 1);
if (nextAt >= units.length) {
  // 第二个代码单元还没到：继续等（判死会让这一格之后没人能接管这条语句）。
  return StatementRoute.None;
}
const next = units[nextAt];
if (next instanceof EndOfFileTokenShape) {
  // 裸关键字（`type` / `interface` 后直接 EOF）：不是声明，交回 legacy。
  return StatementRoute.None;
}
if (text === "import") {
  // 表达式位的 `import`：`import(...)` / `import.meta`。判据与 `DecideCommon` 逐字同源。
  if (next instanceof Bracket && (next as Bracket).StartBracketChar === "(") {
    return StatementRoute.None;
  }
  if (next instanceof Symbol && (next as Symbol).Is(".")) {
    return StatementRoute.None;
  }
  if (next instanceof Common) {
    // `import x = require("m")` 是 import-equals 声明，留给 legacy；`import x from` 才是本族。
    // 第二个代码单元之后的那格还没到时返回 None（= 等待，由 `IsDeclarationPending` 放行）。
    const afterAt = ItemUtil.NextCode(units, nextAt + 1);
    if (afterAt >= units.length) {
      return StatementRoute.None;
    }
    if (units[afterAt] instanceof Symbol && (units[afterAt] as Symbol).Is("=")) {
      return StatementRoute.None;
    }
  }
  return StatementRoute.ShellDeclarationFamily;
}
// `export * from "m"` 的 `*` 是声明位；其余符号说明这个关键字被当成标识符用了。
if (next instanceof Symbol) {
  if ((next as Symbol).Is("*")) {
    return StatementRoute.ShellDeclarationFamily;
  }
  return StatementRoute.None;
}
// **Stage 5d-8c：`declare` 与后继之间换行 ⇒ `declare` 是标识符，不是声明修饰词**。
// TS 的修饰词解析要求 `!scanner.hasPrecedingLineBreak()`，所以 `declare` ⏎ `const x = 1;` /
// `declare` ⏎ `module "m" {}` / `declare` ⏎ `class C {}` 一律是「ExpressionStatement(declare) +
// 下一条声明」（12 种后继逐一实测，含块注释里的换行）。本族若在这一格建壳，壳会把两条都吞进去
// （`BuildFromShell` 读到两条 → 「语句没有读完」→ 文件级 fallback）；`IsAsiBoundary` 的条件 5 又把
// `declare` 当声明头、不给 ASI 边界，所以表达式壳也收不了口。唯一正确的做法是**不建壳**：交回
// `DecideCommon`（`declare` 是普通标识符 → `ShellPlainExpression`），根表达式候选按 ASI 收在
// `declare` 上，下一条声明各走各的壳。行终止符判据读 `StatementScanner.NoLineBreakBetween`
// ——与 `DeclareIsAmbientVariable` 判 `declare const` 同一行用的是**同一个**函数，不新写第二套。
if (text === "declare" && !StatementScanner.NoLineBreakBetween(units[headAt], next)) {
  return StatementRoute.None;
}
// **Stage 5d-9a：`type` / `module` / `namespace` 与名字之间换行 ⇒ 该词是标识符，不是声明头**
// （TS `nextTokenIsOnSameLineAndCanFollowModifier`）：`type` ⏎ `T = 1` 是两条 ExpressionStatement，
// `module` ⏎ `"m" { }` 是表达式 + 块。与上面 `declare` 那条**同一个**行终止符判据
//（`NoLineBreakBetween`），只是「名字」可以是标识符或字符串字面量。
// `enum` / `interface` / `global` 刻意不在这一列：TS 对它们**不**要求同行
//（`enum` ⏎ `E { A }` 仍是 EnumDeclaration，`global` ⏎ `{ }` 仍是 ModuleDeclaration）。
if (StatementRouteUtil.DeclinesDeclarationHead(units)) {
  return StatementRoute.None;
}
// `export as namespace N`（UMD）留给 legacy：它不是普通导出声明，建造器没有这条分派。
if (next instanceof Common && (next as Common).Is("as")) {
  return StatementRoute.None;
}
return StatementRoute.ShellDeclarationFamily;
```

## static method IsDeclarationPending:(units:Array<Token>, headAt:int, text:string)=>bool

```ts
if (!StatementRouteUtil.EnableDeclarationShell || !StatementRouteUtil.EnableShellExpressions
  || !StatementRouteUtil.EnableControlFlowShell) {
  return false;
}
if (!StatementRouteUtil.IsDeclarationHead(text)) {
  return false;
}
const nextAt = ItemUtil.NextCode(units, headAt + 1);
if (nextAt >= units.length) {
  return true;
}
if (units[nextAt] instanceof EndOfFileTokenShape) {
  return false;
}
if (text === "import" && units[nextAt] instanceof Common) {
  return ItemUtil.NextCode(units, nextAt + 1) >= units.length;
}
return false;
```

## static method IsControlFlowHead:(text:string)=>bool

```ts
return text === "if" || text === "while" || text === "do" || text === "for"
  || text === "switch" || text === "try" || text === "return" || text === "throw"
  || text === "break" || text === "continue" || text === "debugger" || text === "with";
```

## static method IsLegacyKeyword:(text:string)=>bool

```ts
return text === "import" || text === "export" || text === "using" || text === "type"
  || text === "interface" || text === "class" || text === "enum" || text === "namespace"
  || text === "module" || text === "declare" || text === "abstract" || text === "function"
  || text === "async" || text === "await" || text === "yield"
  || text === "if" || text === "else" || text === "for" || text === "while" || text === "do"
  || text === "switch" || text === "try" || text === "catch" || text === "finally"
  || text === "return" || text === "throw" || text === "break" || text === "continue"
  || text === "debugger" || text === "with";
```

## static method IsPrefixSymbol:(symbol:Symbol)=>bool

```ts
return symbol.Is("!") || symbol.Is("~") || symbol.Is("+") || symbol.Is("-")
  || symbol.Is("++") || symbol.Is("--");
```

## static method IsBinarySymbol:(symbol:Symbol)=>bool

```ts
return symbol.Is("+") || symbol.Is("-") || symbol.Is("*") || symbol.Is("/") || symbol.Is("%")
  || symbol.Is("**") || symbol.Is("<<") || symbol.Is(">>") || symbol.Is(">>>")
  || symbol.Is("<") || symbol.Is(">") || symbol.Is("<=") || symbol.Is(">=")
  || symbol.Is("==") || symbol.Is("!=") || symbol.Is("===") || symbol.Is("!==")
  || symbol.Is("&") || symbol.Is("|") || symbol.Is("^") || symbol.Is("&&") || symbol.Is("||")
  || symbol.Is("??") || symbol.Is("=") || symbol.Is("+=") || symbol.Is("-=") || symbol.Is("*=")
  || symbol.Is("/=") || symbol.Is("%=") || symbol.Is("**=") || symbol.Is("<<=") || symbol.Is(">>=")
  || symbol.Is(">>>=") || symbol.Is("&=") || symbol.Is("|=") || symbol.Is("^=")
  || symbol.Is("&&=") || symbol.Is("||=") || symbol.Is("??=");
```

## static method IsLabelColonAhead:(units:Array<Token>, headAt:int)=>bool

```ts
if (headAt < 0 || headAt >= units.length) {
  return false;
}
const range = units[headAt].SourceRange;
if (range.Document === null || range.EndIndex < 0) {
  return false;
}
const document = range.Document!;
const count = document.GetCount();
let at = range.EndIndex;
while (at < count) {
  const ch = document.GetValue(at);
  at += 1;
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v") {
    continue;
  }
  if (ch === "/" && at < count) {
    const next = document.GetValue(at);
    if (next === "/") {
      at += 1;
      while (at < count && document.GetValue(at) !== "\n") {
        at += 1;
      }
      continue;
    }
    if (next === "*") {
      at += 1;
      let previous = "";
      let closed = false;
      while (at < count) {
        const inside = document.GetValue(at);
        at += 1;
        if (previous === "*" && inside === "/") {
          closed = true;
          break;
        }
        previous = inside;
      }
      if (!closed) {
        return false;
      }
      continue;
    }
    return false;
  }
  return ch === ":";
}
return false;
```

## static method DecideCaseClauseHead:(units:Array<Token>, headAt:int, text:string)=>int

[WP-S1] `case` / `default` 起语句的唯一判据。**必须早于标签判据**（`case 0:` 的 `0:` 满足
`IsLabelColonAhead` 的形态，判晚了 `case` 就落进表达式壳、数字被建 `LabeledStatementShape`）。

四道闸，缺一不可：

1. 三个开关（`EnableShellExpressions` / `EnableSwitchCaseClause` / `EnableSwitchCaseClauseHead`）全开；
2. 首词是 `case` 或 `default`（**只在本方法里出现一次**，不写第二份关键字表）；
3. 宿主是**子句块目录**（`{` 括号且 `CatalogGuide` 里挂着 `CaseClauseHeadPossibleShape`）。这一条把
   「`case` / `default` 当标识符 / 属性名」的形态挡在外面——那些形态的宿主不是我们挂的目录；
   该目录**只在增量模式挂载**（[S6]，`block-possible-shape.xl.md` 的 `IsIncrementalShapesEnabled()` 闸），
   所以 legacy 解析里本方法恒返回 `None`，路由与 S1 之前逐字节一致。
4. **不等第二个代码单元**。宿主是子句块目录时 `case` / `default` 在这个位置只可能是子句头；等下去会让
   表达式族在同一格把 `case` 判成 `ShellPlainExpression`，而 `Reject` 被 `CatalogGuide` 永久删除，
   子句头候选一被拒就再没有候选能建壳。`default` 的「冒号必须紧跟」由终结候选
   `StatementEndPossibleShape.ClauseHeadEndCode` 与 `StatementBuilder.BuildCaseClauseHead` 各自把住。

```ts
if (!StatementRouteUtil.EnableShellExpressions || !StatementRouteUtil.EnableSwitchCaseClause
  || !StatementRouteUtil.EnableSwitchCaseClauseHead) {
  return StatementRoute.None;
}
if (text !== "case" && text !== "default") {
  return StatementRoute.None;
}
const owner = units[headAt].Parent;
if (!(owner instanceof Bracket) || (owner as Bracket).StartBracketChar !== "{") {
  return StatementRoute.None;
}
const ownerGuide = (owner as Bracket).CatalogGuide;
if (ownerGuide === null) {
  return StatementRoute.None;
}
let ownsClauseHead = false;
for (const shape of ownerGuide.PossibleShapes) {
  if (shape.constructor.name === "CaseClauseHeadPossibleShape") {
    ownsClauseHead = true;
    break;
  }
}
if (!ownsClauseHead) {
  return StatementRoute.None;
}
const secondAt = ItemUtil.NextCode(units, headAt + 1);
if (secondAt >= units.length) {
  // 第二个代码单元还没到。**这里刻意不等待**：宿主已经是子句块目录（上面第 3 条），`case` / `default`
  // 在这个宿主里只可能是子句头，等下去只会让表达式族在同一格把 `case` 判成 `ShellPlainExpression`，
  // 而 `CatalogGuide` 的 `Reject` 是**永久删除**——子句头候选一被拒就再也回不来（实测首格就此丢壳）。
  // `default` 的「冒号必须紧跟」由终结候选 `ClauseHeadEndCode` 与 `BuildCaseClauseHead` 各自把住。
  return StatementRoute.ShellCaseClauseHead;
}
return StatementRoute.ShellCaseClauseHead;
```

## static method DecideCommon:(text:string, units:Array<Token>, headAt:int)=>int

```ts
// [WP-S1] `case` / `default` 起语句先问一次子句头（`None` = 本族不管，落回下面既有判据）。
// 位置必须在变量词 / 表达式 / **标签**三处判据之前：`case 0:` 的 `0:` 满足标签形态。
const clauseHead = StatementRouteUtil.DecideCaseClauseHead(units, headAt, text);
if (clauseHead !== StatementRoute.None) {
  return clauseHead;
}
if (text === "let" || text === "const" || text === "var") {
  const bindingAt = ItemUtil.NextCode(units, headAt + 1);
  if (bindingAt >= units.length) {
    return StatementRoute.None;
  }
  if (StatementScanner.StartsBinding(units, bindingAt)) {
    return StatementRoute.ShellVariable;
  }
  // [A2-D4:CONST-ENUM] `const` + 同一行的 `enum` 是**枚举声明**，不是变量声明、也不是表达式语句
  //（`enum` 是关键字而不是绑定，上面 `StartsBinding` 已经把它排除）。这一格必须判回声明族：
  // 若落 `Legacy` / `ShellPlainExpression`，根表达式候选会与 `EnumDeclarationPossibleShape` 一起活到
  // 枚举体 `}`，枚举壳永远等不到唯一候选，而 legacy 半程的 raw 枚举壳（`BuildByIndex` 的 legacy 分支
  // 只挂壳、不挂终结目录）与增量半程的 `EnumDeclarationShape.BuildFromCode` 树不同 ⇒ 只能 divergent。
  // 判回 `ShellDeclarationFamily` 之后：legacy 由声明壳在 EOF 用 `StatementBuilder.BuildEnumDeclaration`
  // 建树，增量半程由枚举族候选提前挂壳（本 WP 的 `[A2-D4:CONST-ENUM]` 两处 Reject + `b3cOwns` 让位）。
  // 判据与块体 5d-8a 的同一条（`const` + `NoLineBreakBetween` 的 `enum`）逐字同源，不新写关键字表。
  if (text === "const") {
    const enumAt = ItemUtil.NextCode(units, headAt + 1);
    if (enumAt < units.length && units[enumAt] instanceof Common
      && (units[enumAt] as Common).Is("enum")
      && StatementScanner.NoLineBreakBetween(units[headAt], units[enumAt])) {
      return StatementRoute.ShellDeclarationFamily;
    }
  }
  // [A2-D5:ROUTE] `let` / `const` / `var` 之后**不是绑定** ⇒ 这个词是标识符，本条是**表达式语句**
  // （`let = 1` / `let = 1;`）。原判 `Legacy` 会让根表达式候选在头格 `Reject`，整条只剩 legacy 原子建树。
  // 改判 `ShellPlainExpression`：根表达式候选在头格建 `StatementShape`，表达式体由 `StatementOperatorBody`
  // 建 `IdentifierShape("let")` + `=`——两处能力都已存在，这里只改「归哪一族」。
  // 只在既有的 `EnableShellExpressions` 开关内生效；开关 false 时逐字节回到 `Legacy`（legacy 半程不变）。
  if (StatementRouteUtil.EnableShellExpressions) {
    return StatementRoute.ShellPlainExpression;
  }
  return StatementRoute.Legacy;
}
if (StatementRouteUtil.EnableShellExpressions) {
  // **表达式位的 `import`**（S3k-3）：只有 `import(` 与 `import.meta` 是表达式语句；
  // `import x` / `import {` / `import *` / `import "m"` / `import type` 都是声明，留在 legacy。
  // 第二个代码单元还没到时必须 `None`（继续等）：`Reject` 被 `CatalogGuide` 永久删除，
  // 首格判死之后 `.` / `(` 那一格就再没有候选能建壳（s3k2 HANDOFF 里定位到的首格死锁）。
  if (text === "import") {
    const nextAt = ItemUtil.NextCode(units, headAt + 1);
    if (nextAt >= units.length) {
      return StatementRoute.None;
    }
    const next = units[nextAt];
    if (next instanceof Bracket && (next as Bracket).StartBracketChar === "(") {
      return StatementRoute.ShellPlainExpression;
    }
    if (next instanceof Symbol && (next as Symbol).Is(".")) {
      return StatementRoute.ShellPlainExpression;
    }
    return StatementRoute.Legacy;
  }
  // [A2-D5B:AWAIT] `await` 作**表达式语句头**（`await f();`）⇒ 普通表达式语句壳，而不是 `Legacy`。
  // 根因与 D5 的 `let = 1` 是同一处（见上面的 `[A2-D5:ROUTE]`）：`await` 只出现在 `IsLegacyKeyword`
  //（本方法末尾）⇒ 根表达式候选在头格 `Reject`，整条只剩 legacy 原子建树。这里只改「归哪一族」：
  // `IsLegacyKeyword` 本体一字不动（声明族 / 标签语句还在用它），表达式体由 `StatementOperatorBody`
  // 的 `StartAwaitYield` 当一元前缀、`f()` 由 P2 的调用候选建——两处能力都已存在。
  // 判据刻意保守，四道闸：
  // ① 宿主是块体 `{` 括号时**不接管**：那里 `AwaitStatementPossibleShape`（`EnableAwaitStatement`）
  //    本来就有专用语句壳，本分支只在根层补表达式语句这一族，块内逐字节保持原路径；
  // ② 下一格是 `using` ⇒ `await using <绑定>` 是声明，维持原路由；
  // ③ 下一格是 `;` / `}` / `:` / EOF ⇒ 维持原路由（`await;` 没有操作数、`await: 1` 是标签位）；
  // ④ 下一格还没到时 `None`（继续等）：`Reject` 被 `CatalogGuide` 永久删除，首格判死之后整条语句
  //    再没有候选能建壳（与下面 `import` / `async` 两支同一手法）。
  if (text === "await" && StatementRouteUtil.EnableAwaitStatement) {
    const awaitOwner = units[headAt].Parent;
    const awaitInBlock = awaitOwner instanceof Bracket
      && (awaitOwner as Bracket).StartBracketChar === "{";
    if (!awaitInBlock) {
      const awaitNextAt = ItemUtil.NextCode(units, headAt + 1);
      if (awaitNextAt >= units.length) {
        return StatementRoute.None;
      }
      const awaitNext = units[awaitNextAt];
      if (awaitNext instanceof EndOfFileTokenShape) {
        return StatementRoute.Legacy;
      }
      if (awaitNext instanceof Common && (awaitNext as Common).Is("using")) {
        return StatementRoute.Legacy;
      }
      if (awaitNext instanceof Symbol) {
        const awaitNextText = (awaitNext as Symbol).TempToString();
        if (awaitNextText === ";" || awaitNextText === "}" || awaitNextText === ":") {
          return StatementRoute.Legacy;
        }
      }
      return StatementRoute.ShellPlainExpression;
    }
  }
  // S3m: statement-start async arrows only. `async function ...` is a declaration and stays legacy.
  // Return None while the deciding unit has not arrived: Reject is permanent in CatalogGuide.
  if (text === "async") {
    const nextAt = ItemUtil.NextCode(units, headAt + 1);
    if (nextAt >= units.length) {
      return StatementRoute.None;
    }
    const next = units[nextAt];
    if (next instanceof Common && (next as Common).Is("function")) {
      return StatementRoute.Legacy;
    }
    if (next instanceof Bracket && (next as Bracket).StartBracketChar === "(") {
      const arrowAt = ItemUtil.NextCode(units, nextAt + 1);
      if (arrowAt >= units.length) {
        return StatementRoute.None;
      }
      if (units[arrowAt] instanceof Symbol && (units[arrowAt] as Symbol).Is("=>")) {
        return StatementRoute.ShellPlainExpression;
      }
      return StatementRoute.Legacy;
    }
    if (next instanceof Common && !(next as Common).CanStartNumber()) {
      const arrowAt = ItemUtil.NextCode(units, nextAt + 1);
      if (arrowAt >= units.length) {
        return StatementRoute.None;
      }
      if (units[arrowAt] instanceof Symbol && (units[arrowAt] as Symbol).Is("=>")) {
        return StatementRoute.ShellPlainExpression;
      }
      return StatementRoute.Legacy;
    }
    return StatementRoute.Legacy;
  }  if (StatementRouteUtil.EnableControlFlowShell && StatementRouteUtil.IsControlFlowHead(text)) {
    return StatementRoute.ShellStatementFamily;
  }
  // 标签语句：标识符之后的下一个代码单元是 `:`（`lbl: f();`）。`a ? b : c` 的头是 `a`、下一格是 `?`，
  // 不会命中；对象字面量的 `a: 1` 不在语句首。所以「语句首 ident + `:`」只可能是标签。
  // **第二个代码单元还没到时必须 `None`（继续等）**：此时 `:` / `?` / `=` / `(` 还不可区分。
  // 判成表达式语句会把标签锁进表达式壳；判死更不行——`Reject` 被 `CatalogGuide` 永久删除，
  // `:` 到达那一格就再没有候选能建标签壳（Stage 4c 默认关的根因，4c-2 在这里修掉）。
  if (StatementRouteUtil.EnableControlFlowLabel && !StatementRouteUtil.IsLegacyKeyword(text)) {
    const colonAt = ItemUtil.NextCode(units, headAt + 1);
    if (colonAt >= units.length) {
      // **Stage 4f**：第二个代码单元还没到 → 只问文档字符（`IsLabelColonAhead`），**不再返回 `None`**。
      // 4c-2/4d/4e 在这里返回 `None`，表达式根候选于是在头格 Uncertain、到下一格（`;` / EOF / ASI 边界）
      // 走「不能补建」分支被 `CatalogGuide` 永久 `Reject`，整条表达式语句拿不到壳 —— op-ast-proof 11/62。
      // 现在这一格就能判：`:` → 标签；否则 → 表达式（与标签关闭时的判据逐位一致）。
      if (StatementRouteUtil.IsLabelColonAhead(units, headAt)) {
        return StatementRoute.ShellLabel;
      }
      return StatementRoute.ShellPlainExpression;
    }
    if (units[colonAt] instanceof Symbol && (units[colonAt] as Symbol).Is(":")) {
      return StatementRoute.ShellLabel;
    }
  }
}
if (StatementRouteUtil.IsLegacyKeyword(text)) {
  return StatementRoute.Legacy;
}
return StatementRoute.ShellPlainExpression;
```

## static method ShouldYieldToDeclarationShell:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (!StatementRouteUtil.EnableDeclarationShell || !StatementRouteUtil.EnableShellExpressions) {
  return false;
}
const route = StatementRouteUtil.Decide(units, tokenIndex);
// Stage 5d-3：根层 `function` / `class` / 装饰器声明也是「本条语句归壳」——落回 legacy 候选就会同格
// 双建（legacy class / function 候选是**提前挂载**的，Accept 得比语句壳更早）。让位仍只看 route，
// 保持 S4z 的单调性：壳在哪一格建、搬多少单元由壳自己决定，不在这里预判。
return route === StatementRoute.ShellDeclarationFamily
  || route === StatementRoute.ShellFunctionDeclaration
  || route === StatementRoute.ShellClassDeclaration
  || route === StatementRoute.ShellDecoratedDeclaration;
```
## static method IsSameLineWordAhead:(units:Array<Token>, headAt:int, expected:string)=>bool

```ts
if (headAt < 0 || headAt >= units.length) {
  return false;
}
const range = units[headAt].SourceRange;
if (range.Document === null || range.EndIndex < 0) {
  return false;
}
const document = range.Document!;
const count = document.GetCount();
let at = range.EndIndex;
while (at < count) {
  const ch = document.GetValue(at);
  if (ch === " " || ch === "\t" || ch === "\f" || ch === "\v") {
    at += 1;
    continue;
  }
  if (ch === "\r" || ch === "\n" || ch === "\u2028" || ch === "\u2029") {
    return false;
  }
  if (ch === "/" && at + 1 < count) {
    const next = document.GetValue(at + 1);
    if (next === "/") {
      return false;
    }
    if (next === "*") {
      at += 2;
      let closed = false;
      while (at < count) {
        const inside = document.GetValue(at);
        if (inside === "\r" || inside === "\n" || inside === "\u2028" || inside === "\u2029") {
          return false;
        }
        at += 1;
        if (inside === "*" && at < count && document.GetValue(at) === "/") {
          at += 1;
          closed = true;
          break;
        }
      }
      if (!closed) {
        return false;
      }
      continue;
    }
    return false;
  }
  break;
}
let word = "";
while (at < count) {
  const ch = document.GetValue(at);
  if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")
    || (ch >= "0" && ch <= "9") || ch === "_" || ch === "$") {
    word += ch;
    at += 1;
    continue;
  }
  break;
}
return word === expected;
```

## static method Decide:(units:Array<Token>, tokenIndex:int)=>int

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return StatementRoute.None;
}
const itemStart = ItemUtil.ItemStart(units);
if (itemStart < 0 || itemStart >= units.length) {
  return StatementRoute.None;
}
const headAt = ItemUtil.NextCode(units, itemStart);
if (headAt >= units.length || headAt > tokenIndex) {
  // 首代码单元还没到（只有 trivia）：不许判成任何一族，调用方只能继续等。
  return StatementRoute.None;
}
const head = units[headAt];
if (head.IsTriviaToken || head instanceof EndOfFileTokenShape) {
  return StatementRoute.None;
}
if (head instanceof Common) {
  // Stage 4q：声明 / 导入导出族先问一次（`None` = 本族不管，落回 `DecideCommon` 的既有判据）。
  const headText = (head as Common).TempToString();
  // **Stage 4y：块内 class 声明壳**（默认关）。只认宿主是块体 `{` 括号的 `class`：根层 `class` 仍走
  // legacy（体语句的括号事件与根级声明候选都按原路径走），本分支不改变根层任何一个字节。
  // 判成 `ShellStatementFamily` 而不是 `ShellDeclarationFamily`：带体声明的边界是 `}`，
  // 与 `if` / `while` 同一条 `ScanRoot` 判界；声明族的 `;` / EOF / ASI 边界不适用于它。
  if (StatementRouteUtil.EnableBlockClassShell && headText === "class") {
    const classOwner = head.Parent;
    if (classOwner instanceof Bracket && (classOwner as Bracket).StartBracketChar === "{") {
      return StatementRoute.ShellStatementFamily;
    }
  }
  // **Stage 5d-3：根层 function / class / 装饰器声明的语句壳**。5d-3 只认**根层**：语句首的 `Parent`
  // 不是括号（根目录的宿主是 `SourceFileShape`）。块体里的 `class` 已由上一分支判成
  // `ShellStatementFamily`；块体里的 `function` / 装饰器声明 5d-3 时**不动**——当时块体目录里没有
  // 对应候选，路由一改就是「零候选」等待，不是接管（安全回退的唯一正确形态是逐位保持 legacy）。
  //
  // **Stage 5d-8a：块体里也判**（`EnableBlockDeclarationShell`，默认开）。块体目录里现在挂着
  // `ControlFlowStatementPossibleShape`，而它认的正是这三个 `Kind`（`declarationShell` 集合），所以块内
  // 这些起点从「没有候选」变成「与根层同一条建壳 / 收口 / 建树通道」。判据一个字不新写：下面这一段
  // 对根层与块体逐字相同，只有「宿主是不是块体 `{` 括号」这一格决定要不要进。
  const headOwner = head.Parent;
  const ownerIsBracket = headOwner instanceof Bracket;
  const blockDeclarationShell = StatementRouteUtil.EnableBlockDeclarationShell
    && StatementRouteUtil.EnableShellExpressions
    && ownerIsBracket && (headOwner as Bracket).StartBracketChar === "{";
  if (StatementRouteUtil.EnableRootDeclarationShell && StatementRouteUtil.EnableShellExpressions
    && (!ownerIsBracket || blockDeclarationShell)) {
    if (headText === "function") {
      if (blockDeclarationShell) {
        StatementRouteUtil.BlockDeclarationShellCount += 1;
      }
      return StatementRoute.ShellFunctionDeclaration;
    }
    if (headText === "class") {
      return StatementRoute.ShellClassDeclaration;
    }
    if (headText === "abstract") {
      const nextAt = ItemUtil.NextCode(units, headAt + 1);
      if (nextAt >= units.length) {
        // 第二个代码单元还没到：文档级前瞻（同一行下一个词是 `class`）→ 本族；否则等待
        // （判死会让这一格之后没人能接管；`abstract` 当标识符的形态下落回 `DecideCommon` 的 `Legacy`）。
        if (StatementRouteUtil.IsSameLineWordAhead(units, headAt, "class")) {
          if (blockDeclarationShell) {
            StatementRouteUtil.BlockDeclarationShellCount += 1;
          }
          return StatementRoute.ShellClassDeclaration;
        }
        return StatementRoute.None;
      }
      const next = units[nextAt];
      if (next instanceof Common && (next as Common).Is("class")
        && StatementScanner.NoLineBreakBetween(head, next)) {
        if (blockDeclarationShell) {
          StatementRouteUtil.BlockDeclarationShellCount += 1;
        }
        return StatementRoute.ShellClassDeclaration;
      }
      // `abstract` ⏎ `class` 是 TS 的两条语句（修饰词自成 ExpressionStatement），落回 `DecideCommon`。
    }
    if (headText === "async") {
      const nextAt = ItemUtil.NextCode(units, headAt + 1);
      if (nextAt >= units.length) {
        // 同 `abstract`：`async` 之后同一行的下一个词是 `function` 就是本族。
        if (StatementRouteUtil.IsSameLineWordAhead(units, headAt, "function")) {
          if (blockDeclarationShell) {
            StatementRouteUtil.BlockDeclarationShellCount += 1;
          }
          return StatementRoute.ShellFunctionDeclaration;
        }
        return StatementRoute.None;
      }
      const next = units[nextAt];
      // **同一行**的 `async function` 才是本族；换行时 TS 的 ASI 把它拆成「async 表达式语句 +
      // function 声明」，那条拆分由 legacy 候选按原路径做（`DecideCommon` 也是这个判据）。
      if (next instanceof Common && (next as Common).Is("function")
        && StatementScanner.NoLineBreakBetween(head, next)) {
        if (blockDeclarationShell) {
          StatementRouteUtil.BlockDeclarationShellCount += 1;
        }
        return StatementRoute.ShellFunctionDeclaration;
      }
      // 其余 `async` 形态（箭头 / 标识符 / 换行拆分）逐位交回 `DecideCommon`。
    }
  }
  // **Stage 5d-8a：块内 `export` 一律是声明**。`export =` / `export as namespace` 这两条恢复形在
  // `DecideDeclaration` 里被让给 legacy（根层有 `ExportAssignmentPossibleShape` / `NamespaceExportDeclarationPossibleShape`
  // 两个专用候选），但**块体目录里没有 legacy 候选**，让出去只会整段留 raw。`export` 是保留字，
  // 块内不可能起一条表达式语句，所以这一格可以在**首格**就判族，不必等第二个代码单元。
  if (blockDeclarationShell && StatementRouteUtil.EnableDeclarationShell && headText === "export") {
    return StatementRoute.ShellDeclarationFamily;
  }
  // **Stage 5d-8a：块内 `const enum`**。`const` 在 `DecideCommon` 里先问「下一格能不能起绑定」，
  // `enum` 不是绑定（它是关键字），于是整条被让回 legacy——根层有 `EnumDeclarationPossibleShape` 接住，
  // **块体目录里没有 legacy 候选**，只能整段留 raw（5d-8a 归因里 `const enum` 的 4 条）。
  // 这里在块体里补一条：`const` + 同一行的 `enum` 判成 `ShellVariable`（`StatementFamilyDispatch` 的
  // `KindAllows` 接受 `const`、`BuildByHead` 的 `const` 分支本来就建 enum），不新写关键字表。
  if (blockDeclarationShell && StatementRouteUtil.EnableShellExpressions && headText === "const") {
    const nextAt = ItemUtil.NextCode(units, headAt + 1);
    if (nextAt < units.length) {
      const next = units[nextAt];
      if (next instanceof Common && (next as Common).Is("enum")
        && StatementScanner.NoLineBreakBetween(head, next)) {
        return StatementRoute.ShellVariable;
      }
    }
  }
  // **Stage 5d-8a：块内 `import` 声明**。`DecideDeclaration` 对 `import x = require("m")`（import-equals）
  // 与 `import x from "m"` 的态度不同：前者被让给 legacy（根层有 `ImportEqualsDeclarationPossibleShape`），
  // 后者判声明族。块体目录里没有 legacy 候选，让出去只会整段留 raw（归因里 `import x = require` 1 条）。
  // 这里只补**表达式位以外**的形态：`import(` / `import.meta` 仍交回 `DecideCommon`（与那里同一份判据）。
  if (blockDeclarationShell && StatementRouteUtil.EnableDeclarationShell && headText === "import") {
    const nextAt = ItemUtil.NextCode(units, headAt + 1);
    if (nextAt < units.length) {
      const next = units[nextAt];
      const expressionPosition = (next instanceof Bracket && (next as Bracket).StartBracketChar === "(")
        || (next instanceof Symbol && (next as Symbol).Is("."));
      if (!expressionPosition) {
        return StatementRoute.ShellDeclarationFamily;
      }
    }
  }
  const declaration = StatementRouteUtil.DecideDeclaration(units, headAt, headText);
  if (declaration !== StatementRoute.None) {
    return declaration;
  }
  // Stage 4r：上下文关键字的判据要等下一个代码单元（`type T` / `declare const` / `import x from`）。
  // 这一格必须 None（等待）：落回 DecideCommon 会把 `declare` 判成 Legacy，专用候选当场被永久 Reject。
  if (StatementRouteUtil.IsDeclarationPending(units, headAt, headText)) {
    return StatementRoute.None;
  }
  return StatementRouteUtil.DecideCommon(headText, units, headAt);
}
if (head instanceof Symbol) {
  const symbol = head as Symbol;
  if (symbol.Is(";")) {
    // 空语句：默认归壳（`EnableControlFlowEmpty = true`；4d 的父目录重放已修好 `;` 的失管）。
    if (StatementRouteUtil.EnableShellExpressions && StatementRouteUtil.EnableControlFlowShell
      && StatementRouteUtil.EnableControlFlowEmpty) {
      return StatementRoute.ShellStatementFamily;
    }
    return StatementRoute.Legacy;
  }
  if (StatementRouteUtil.IsPrefixSymbol(symbol)) {
    return StatementRoute.ShellPlainExpression;
  }
  // **Stage 5d-8a：私有名起点**（`#x in obj;` / `#p in this;`）。`#` 只可能出现在表达式里（私有名），
  // 不可能起声明 / 标签 / 控制流，所以这一格是确定的表达式语句起点。5d-8a 之前它落 `None`，
  // 块体目录里没有候选能接（legacy 候选只在根目录），于是体内这条语句整段 raw（归因里 `#` 2 条）。
  // 判据只看符号本身；建树仍走 `StatementFamilyDispatch` → `BuildExpressionStatement`（同一条 builder）。
  if (symbol.Is("#")) {
    return StatementRoute.ShellPlainExpression;
  }
  // **装饰器声明起点（Stage 4af-E）**：`@dec class C {}` / `@a @b interface I {}` 的语句首是
  // 装饰器前缀的 `@`（Symbol），既不是表达式、也不是语句关键字。4af-E 时它归 `Legacy`：legacy 的声明
  // 候选（class / interface / enum / module / type / function）自己认装饰器前缀，`state.Start`
  // 落在 `@` 上，建出的声明 children 最前就是 Decorator。**Stage 5d-3 起根层改判
  // `ShellDecoratedDeclaration`**（见下面的分支），块体里仍归 `Legacy`。
  //
  // 判成 `None`（本方法原来的落点）会让声明族 / 控制流族 / 表达式根候选在 `@` 这一格一直
  // `Uncertain`：装饰器声明要到 `class` 之后才能让 legacy 声明候选变成唯一候选，而 `@` 格活着的
  // 那几个候选不改判、拖到 EOF 与根终结候选撞「同时成立」——`@dec class C {}` 单独一个文件因此
  // 只能靠**文件级 fallback** 建对（HANDOFF-s4af-E §2）。归 `Legacy` 后这一格只有 legacy 声明
  // 候选还活着，装饰器声明在 root 目录里就能建出来（也是声明壳收口后 leftover replay 能建出
  // 装饰器类的前提：重放把 `@` 这一格送回 root 时，必须有候选能认下它）。
  //
  // 只改「这一格归哪一族」，不新写任何装饰器判据：`@` 之后是不是一条声明仍由各 legacy 候选
  // （以及声明壳收口后的 `SourceFileEndPossibleShape.BuildTrailingDeclaration`）判。
  if (symbol.Is("@")) {
    // **Stage 5d-3**：根层的装饰器声明改由语句壳驱动（`ShellDecoratedDeclaration`）。装饰器前缀后面是
    // 哪一种声明要到表达式吃完才知道，所以本族只负责「先建壳、体括号 / `;` / EOF 收口」，判型留给
    // 收口时的 `StatementBuilder.ScanDecoratedHead`（与 `BuildDecoratedStatement` 同一个判型点）。
    // **Stage 5d-8a**：块体里也判（`EnableBlockDeclarationShell`），判据与根层逐字相同——块体目录里
    // `ControlFlowStatementPossibleShape` 认这个 `Kind`，收口 / 建树走同一条通道。
    const atOwner = head.Parent;
    const atOwnerIsBracket = atOwner instanceof Bracket;
    const atBlockShell = StatementRouteUtil.EnableBlockDeclarationShell
      && StatementRouteUtil.EnableShellExpressions
      && atOwnerIsBracket && (atOwner as Bracket).StartBracketChar === "{";
    if (StatementRouteUtil.EnableRootDeclarationShell && StatementRouteUtil.EnableShellExpressions
      && (!atOwnerIsBracket || atBlockShell)) {
      if (atBlockShell) {
        StatementRouteUtil.BlockDeclarationShellCount += 1;
      }
      return StatementRoute.ShellDecoratedDeclaration;
    }
    return StatementRoute.Legacy;
  }
  return StatementRoute.None;
}
if (head instanceof Bracket) {
  const startChar = (head as Bracket).StartBracketChar;
  if (startChar === "(" || startChar === "[") {
    return StatementRoute.ShellPlainExpression;
  }
  if (startChar === "{") {
    // 语句首的 `{` 一律是块语句：对象字面量只可能出现在表达式位置（`({ a: 1 });` / `x = { a: 1 }`），
    // 语句首不存在「从 `{` 起一条表达式语句」的写法。二义的裁决点就在这里，不在 Bracket 里另起判据。
    return StatementRoute.ShellBlock;
  }
  // `{`：块体 / 对象字面量二义，Stage 4 才裁；其余括号也不可能起语句。
  return StatementRoute.Legacy;
}
// 字符串 / 正则 / 模板 / 数字等字面量：确定的普通表达式起点。
return StatementRoute.ShellPlainExpression;
```

## static method ClassOf:(units:Array<Token>, tokenIndex:int)=>int

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return StatementClass.Unknown;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return StatementClass.Unknown;
}
if (unit instanceof EndOfFileTokenShape) {
  return StatementClass.Eof;
}
if (unit instanceof Symbol) {
  const symbol = unit as Symbol;
  if (symbol.Is(";")) {
    return StatementClass.Semicolon;
  }
  if (symbol.Is(",") || symbol.Is(":") || symbol.Is("?") || symbol.Is(")")) {
    return StatementClass.Separator;
  }
  if (symbol.Is(".")) {
    return StatementClass.MemberAccess;
  }
  if (symbol.Is("++") || symbol.Is("--")) {
    return StatementClass.Postfix;
  }
  if (symbol.Is("!") || symbol.Is("~")) {
    return StatementClass.PrefixOperator;
  }
  if (StatementRouteUtil.IsBinarySymbol(symbol)) {
    return StatementClass.BinaryOperator;
  }
  return StatementClass.Unknown;
}
if (unit instanceof Bracket) {
  const startChar = (unit as Bracket).StartBracketChar;
  if (startChar === "(" || startChar === "[" || startChar === "{") {
    return StatementClass.OperandStart;
  }
  return StatementClass.Separator;
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  if (StatementRouteUtil.IsLegacyKeyword(text)) {
    return StatementClass.StatementStart;
  }
  if (text === "typeof" || text === "void" || text === "delete" || text === "new") {
    return StatementClass.PrefixOperator;
  }
  if (text === "instanceof" || text === "in" || text === "as" || text === "satisfies"
    || text === "of") {
    return StatementClass.BinaryOperator;
  }
  return StatementClass.OperandStart;
}
// 字符串 / 正则 / 模板 / 数字等字面量。
return StatementClass.OperandStart;
```

## static field EnableBracketCreatePossible:bool = false

**[T2:CREATE] 括号创建触发的 possible 重算（`PossibleSource.BracketCreate`）的开关。默认 `false`。**

`false`（默认）时 `BracketRoleCatalogHook` 里的 `BracketCreate` 触发段立即返回（角色目录开关仍可独立打开），
`Bracket.Transit` 只多一次 `null` 比较：**不触发任何 BracketCreate 判定**，`Bracket.OnBracketCreatedEvent`
里的旧窄触发逐字节仍是 T2 之前的行为。

`true` 时 `SourceFileShape` 的构造器把 `BracketRoleCatalogHook` 装到 `BracketRoleHook.Current`（幂等）；
角色目录 `Install` / `Register` 之后，同一个实例对新括号自己（若已挂目录）与父宿主（若挂了带终结候选的向导）
各问一次，来源显式传 `PossibleSource.BracketCreate`。
同一格由双 build 守卫（`CatalogGuide.LastBuildTokenIndex` / `LastBuildDataLength`）保证只建一次。

**为什么默认关**：T2 只接线，不改 117 个候选的判据。候选还不会按来源改变行为，所以打开时读数应与关闭时相同；
T3 的目标用例再打开它，并让 statement / block / control-flow 的候选读第 4 参。

## static field BracketCreatePossibleCount:int = 0

[T2:CREATE] 只读计数：`BracketCreate` 触发段被调用（= 建出一只新括号且开关打开）的次数。

## static field BracketCreateSelfCount:int = 0

[T2:CREATE] 只读计数：新括号自己**已挂目录**、因此真的问了一次自身候选的次数（`Data` 为空时通常直接 `Nothing`）。

## static field BracketCreateParentCount:int = 0

[T2:CREATE] 只读计数：父宿主挂了「带终结候选」的向导、因此真的问了一次父层候选的次数。

## static field EnableBracketRoleCatalog:bool = false

**[B0:ROLE] 通用括号角色目录（`bracket-role-resolver` / `bracket-catalog-installer` /
`deferred-bracket-catalog` / `waiting-end-possible`）的一级开关。默认 `false`。**

`false` 时：

- `SourceFileShape` 的构造器不装配 `BracketRoleHook.Current`（保持 `null`），`Bracket.Transit` 里那一行
  只是 `null` 比较 ⇒ **不解析角色、不装任何目录、不登记任何延迟括号**，既有产物逐字节不变；
- 下面四个计数恒为 `0`。

`true` 时**也不一定改变产物**：角色解析只对「注册过目录的角色」返回 `Known`，而注册表（
`BracketRoleResolver.Catalogs`）默认是空的。所以本开关打开、但没有任何 `RegisterCatalog` 时，
每一个 `{` 走的是「族已装 ⇒ `AlreadyInstalled` ⇒ `SetEndPossible`（已有终结候选则保留）」
这条零改动路径。B1/B2 的接线是「打开开关 + `RegisterCatalog` 一行」两件事，**可分开验证**。

为什么默认关（与 `EnableIncrementalShapes` 同一条纪律）：B0 只建机制、不迁 site；任何一格提前挂目录
都会改 step 表与 `moved` 基线，而 B0 的验收要求是**逐项不变**。

## static field BracketRoleKnownCount:int = 0

[B0:ROLE] 只读计数：`BracketRoleResolver.Resolve` 返回 `Known` 的次数（每只括号最多 +1）。

两种来源：① 族已经在该括号上装好目录（`Reason === "family-installed"`，安装器只会返回
`AlreadyInstalled`）；② 角色目录已注册、由 `BracketCatalogInstaller` 第一次装上去。
A1 的验收口径 `BracketRoleKnownCount == 既有 MountCount 之和` 对的是第 ① 种。

## static field BracketRoleDeferredCount:int = 0

[B0:ROLE] 只读计数：`Resolve` 返回 `Deferred` 的次数。默认（注册表为空、开关关）为 `0`；
B2 打开开关后，声明族与「语句族未判」的 `{` 会走到这里（**只登记、不装目录**）。

## static field BracketRoleFallbackCount:int = 0

[B0:ROLE] 只读计数：`Resolve` 返回 `Fallback` 的次数。A1/WP-BF 的审计口径要求最终只允许
`TypeLiteral`（返回类型里的对象字面量）与 `ObjectLiteralMethodBody`（对象字面量方法体）两个 site，
其余任何 `Fallback` 都必须由 `Reason` 说明（`no-host-rule:*` / `catalog-not-registered:*` 是机制缺件，
不是 site 漏网）。

## static field BracketRoleReplayCount:int = 0

[B0:ROLE] 只读计数：`DeferredBracketCatalog.Replay` 成功 replay 的括号数（`DeferredBracketCatalog.ReplayCount`
同一口径的镜像；B0 默认恒为 `0`，WP-B2 之后应当等于「声明族延迟括号数」）。

## static field BracketRoleReplayFailureCount:int = 0

[B0:ROLE] 只读计数：replay 被拒绝 / 中途失败的次数（R2 非 raw、R4 终结候选会 Accept、R5 丢 context、
R6 循环内抛错）。**非 0 就是缺陷**：A1 的七条硬规则里每一条都不应该被触发。

## static field BracketRoleReplayDropCount:int = 0

[B0c:ROLE] 只读计数：`DeferredBracketCatalog.Drop` 真正摘掉条目的次数（成功 replay 的一次性消费 +
失败 / `Abandon` 的显式丢弃；`DeferredBracketCatalog.ReplayDropCount` 同一口径的镜像）。
它与 `BracketRoleReplayCount` 的差就是失败出口：**`ReplayCount == 0 && ReplayDropCount > 0` 说明条目
全在失败出口被消费**，不允许当绿。

## static field EnableArrowParenCatalog:bool = false

**[B0:PAREN] A4b `(` 格「箭头参数」前瞻（`"arrowparen"`）的开关。默认 `false`；由 B3b 打开。**

`true` 时 `CompositeInitializerFormsJudge.Family` 在「`=` 之后的 `(` 括号、内部没有类型注解 / `as` /
`satisfies`、且 `)` 之后紧跟 `=>`」这一格返回 `"arrowparen"` 而不是 `"paren"`——把「分组 / 箭头参数」
的裁定从 `(` 格推迟到 `=>` 到达那一格（A2 §7 R4：`(` 格所有权从 A4b 交给 B3b）。

`false`（默认）时那个分支**不进**：`Family` 的返回值、`CanBuild` / `ClaimsForEndPossible` /
`OperatorContinuation` 的每一条判据都与 B0 之前逐字节相同，`bin-paren-mul` 的现状不受影响。

**为什么必须默认关**：`arrowparen` 一旦提前生效，`(a) + b` 这类「分组后接二元运算符」的括号会被
判成箭头候选族、`OperatorContinuation` 随之失效，而 B3b 的 `ArrowParamsCatalog` 还没注册——
那正是 A2 §7 R4 说的「所有权切换」事故。开关 + 目录注册必须同一个 WP 一起翻（B3b）。

## static field EnableExprBracketCatalog:bool = true

**[B4] 表达式括号内容目录的开关（`expression-bracket-possible-shape.xl.md`）。B4b 起默认 `true`。**

`true` 且增量模式时 `SourceFileShape` 的构造器在装配 `BracketRoleHook` 之前
`ExpressionBracketPossibleShape.EnsureRegistered()`：把 `ObjectLiteral` / `ArrayLiteral` /
`CallArgs` / `ParenExpression` 四个角色目录注册进 `BracketRoleResolver`，并打开 B0 的总闸。
之后 `= { … }` / `= [ … ]` / `f( … )` / `( … )` 的括号里每建出一个标识符 / 数字 / 对象成员，
都会登记到 `ExpressionAtomRegistry`，由 legacy 收口路径（`ParsePrimary` / `ParseName` /
`ParseObjectLiteral`）**消费**，不重建。

`false` 时一格都不建：登记表恒空，`ParsePrimary` / `ParseName` / `ParseObjectLiteral`
的三处 `Has` 恒为 `false`，两档逐字节回到 B4 之前（实测见 `_reports/B4.md` §2）。

**[B4b] 为什么现在能默认 `true`**：打开后原先 12 条崩溃全部落在「消费分支只吃 basic token」这一族，
B4b 在 `ExpressionBracketPossibleShape.IsBuildable` / `SealMember` / `SealPendingShorthand` 与
`BracketRoleResolver.Classify` 里补齐了类型位 / 返回值位 / 函数名位 / 箭头形参位 / 成员值完整性
五类判据（逐条对应见 `_reports/B4b.md` §1）。默认档四道门与 base 逐位相同：
`wide-ast` 0/33/98、`--legacy` 0/0/2、`real-dts` PASS、`tts` 429、`ts-all` 426/3、`gates` 4/0/7。

**为什么默认关（B4 实测，不是保守）**：打开它以后宽尺子从 `0/33/98` 变成
**`227 崩溃 / 75 差异 / 131 fallback`**、`tts` 从 `429 PASS` 变成 `406 / 23 FAIL`——
每一处崩溃都是 A2 §7 R8 预言的同一件事：legacy 的参数表 / 数组元素 / 计算名入口
（`ClassDeclarationShape.BuildParameters`、`ParseArrayLiteral` 的元素段、`ParseComputedPropertyName`）
**只吃 basic token**，括号里先垫出的原子它们读不到（首跳 `缺少标识符` / `不支持的类型起点`）。
这些入口的「消费已建子节点」分支不在 B4 的写域（`parameter-*` / `class-declaration-*` /
`type-builder` / `variable-declaration-*`），所以开关默认关、机制与探针照常交付。
逐族读数与最小复现写在 `_reports/B4.md` §3 / §4。

## static field ExprBracketGuideCount:int = 0

**只读计数**：表达式括号目录真正装上（`ExpressionBracketScan.Enabled === true`）的括号数。

## static field ExprBracketAtomCount:int = 0

**只读计数**：表达式括号里逐字建出的原子数（`IdentifierShape` / `NumericLiteralShape`）。

## static field ExprBracketMemberCount:int = 0

**只读计数**：表达式括号里逐字收口的成员数（`PropertyAssignmentShape` / 短写 / 展开）。

## static field EnableControlHeadCatalog:bool = true

**[B3] 控制流头 `(` 的头目录开关（`control-head-possible-shape.xl.md`）。默认 `true`。**
**[B3b] 它只在增量模式生效**：装配点同时要求 `StatementRouteUtil.IsIncrementalShapesEnabled()` 为真，
legacy 下本开关等于关闭，产物逐字节回到 B3 之前（理由见下一段）。

`true` 且增量模式时 `SourceFileShape` 的构造器在装配 `BracketRoleHook` 之前先做两件事：
`ControlHeadPossibleShape.EnsureRegistered()`（把 `ControlHead` 角色目录注册进
`BracketRoleResolver`）与 `StatementRouteUtil.EnableBracketRoleCatalog = true`（打开 B0 的总闸）。

`false`（或 legacy 模式）时两件事都不做，`ControlHead` 角色回到 B0 的默认状态：
`Resolve` 对控制流头的 `(` 返回 `Fallback("catalog-not-registered:ControlHead")`（只计数），
括号内容逐字节保持 raw，legacy 在收口格照旧一次性建——即 B3 之前的产物。

**为什么必须有增量闸**：打开头目录顺带打开的是 B0 的**总闸**，legacy 里没人需要它。
B3 最初只读本字段，于是 `--legacy` 档也装配了头目录：`FileFallbackCount` 从 2 涨到 11
（`tests/cases/token` 10 件 + `samples/declarations.ts` 1 件），
`stmt-if-multiline-condition.ts` 多 1 条 moved，`gates --legacy` 从 4/0/7 掉到 3/1/7。
闸加在装配套之后，`CatalogGuide.FlushOnClose`（默认 `false`）、`ParsePrimary` 的 `IsAtom`
（另有显式模式闸）、`BracketRoleResult.FlushOnClose`（默认 `false`）三条透传在 legacy 下
都保持默认值，一个字节不改。默认档读数不变（B3b 复测同上）。

**为什么可以与 B1 的总闸分开翻**：B1 的总闸是在**第一只函数形参括号**上打开的
（`function-declaration-shape.xl.md` 的 `OpenParameterList`），所以「文件里没有函数声明」时 B0 一次都不跑
（`for (…)` 开头的文件就是这种）。B3 的控制流头出现在**任何**文件里，所以它自己把总闸打开；
打开之后每个 `{` / `(` 都多走一次角色解析，族已装目录的一律 `AlreadyInstalled` +
`SetEndPossible(null)`（一个字节都不改），没有目录的只计数。

## static field ControlHeadGuideCount:int = 0

[B3] 只读计数：**装上了头目录并且真的建出了头原子**的控制流头括号数
（`ControlHeadPossibleShape.States` 里 `Enabled === true` 的条目数，每只括号最多 +1）。

口径说明：没有可建原子的头（`if ()`、`while (/**/)`）不会产生状态条目，因此不计数——
本计数是「这只头的逐字建真的发生了」的读数，不是「装了几只向导」的读数。

## static field ControlHeadAtomCount:int = 0

[B3] 只读计数：控制流头里**逐字建出**的头原子总数（每建一个 `IdentifierShape` /
`NumericLiteralShape` +1）。它是 `for-classic.ts` 那条验收
（`i` / `0` / `3` 各自在 token 关闭格成 shape）的机械读数。

## static field EnableContainerShape:bool = true

**B4i / K1：容器 shape 在括号关闭格出现（`container-shape-catalog.xl.md`）。默认 `true`。**

`true` 且增量模式时 `SourceFileShape` 的构造器装上 `ContainerShapeCloseHook`：
`{` / `[` / `(` 关闭的那一拍（`Bracket.Close` 里 `BracketClosedHook` 的位置），角色为
`ObjectLiteral` / `ArrayLiteral` / `CallArgs` / `ParenExpression` 的四类括号**就地**被 legacy
`ExpressionBuilder` 建成 `ObjectLiteralExpressionShape` / `ArrayLiteralExpressionShape` /
`CallExpressionShape` / `ParenthesizedExpressionShape`，并**顶替父单元 `Data` 里的那只括号**
（位置是括号原来的槽位；`CallArgs` 连同它的 callee 一起被吞进 `CallExpressionShape`，
槽位前移到 callee 的第一格）。`src` / `pos` 由同一份 legacy `Positions` 口径给出，因此
`pos` 与 TS 的 `node.pos`（前一个 token 的终点）逐位相同。

**所有权切换（B4i 补齐）**：容器建出来以后，收口侧只**消费**、不重建——
① `ExpressionBuilder.ParsePrimary` 认 `ExpressionAtomRegistry.HasContainer` 并直接消费；
② `VariableDeclarationShape.FinishIncremental`：容器是唯一根时直接收下；容器之外还有前缀 / 后缀
（`.b` / `(1)` / `[0]` / `!` / `/ 2` …）时从**整段 raw 的第一格** `ParseExpression`，并用源区间
验覆盖（截断即显式抛错）；`as` / `satisfies` 的类型槽（`[] as number[]` 的 `[`）走
`TypeCatalogFactory.ParseInitializer` 并验覆盖；
③ 带 `as` / `satisfies` 的初始化器由 `TypeCatalogFactory.StartsTypedInitializer` 认容器头；
④ 语句尾判据（`ExpressionStatementPossibleShape.CanEndExpression`）把容器认成**已结束的操作数**
（ASI / 行尾收口不再以为「最后一个单元是形状 ⇒ 收不住」）；
⑤ 正则起点（`TypeScriptRegexTemplate.CanStartAt`）把容器之后的 `/` 认成**除号**。

`false` 时不装钩子（`BracketClosedHook.Current` 保持 `null`），`{` / `[` / `(` 仍只在
legacy 收口格由 A4 / A4b / P1 / P4 建出，读数与 B4d 逐位相同（`ExprBracketCatalog` 那套不变）。

**为什么现在能默认打开（B4i 实测）**：B4e 打开时宽尺子是 `0/43/99+13`（10 条新 structural、
14 件新 fallback）。B4i 把收口侧的消费补齐之后，打开与关闭**逐位相同**：`0/29/82+13=95`、
`legacy 0/0/2`、`gates 4/0/7`、`ts-all 429/426/3`（`_reports/B4i.md`）。残留的是**位置闸**
（`ArrowAhead` / `SequelAllowsBuild` / `InsideArrowTail` / `InsideNewExpression` /
`RoleMatchesBracket` / 后缀 `[`）：这些位置的所有权归 legacy，本机制**不建**（`RefusedCount`
计数），不是静默降级。

**增量闸**：钩子只在该开关与 `IsIncrementalShapesEnabled()` 同时为真时装配；实现里再检查一次
（同一进程里两种模式可以交替）。legacy 档 `--legacy` 因此逐字节回到 B4d 之前；开关置 `false`
则四道门与 base 逐位相同。

## static field ContainerShapeBuildCount:int = 0

[B4e] 只读计数：关闭格上真正被容器 shape 顶替掉的括号数（一次成功的「创建格建树」+1）。
按角色分类的读数见 `ContainerShapeCatalog` 的静态计数；本计数是四族合计。

