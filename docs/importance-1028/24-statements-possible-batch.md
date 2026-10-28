# 24 语句：possible / end 批次（审计）

审计对象：`typescript/tokens/statements/` 下 14 个文件。判据见 [01-rules.md](01-rules.md)，行号以 `read` 返回值为准。

事实表说明：任务指定的 `docs/importance-1028/_facts/typescript-tokens-statements.md` 不存在；statements 段在 `docs/importance-1028/_facts/typescript-tokens.md`（行 447–494），本批 14 个文件的字节数与该表逐项一致。代码行 = 围栏内非空行，含中文注释。

---

### typescript/tokens/statements/statement-end-possible-shape.xl.md（27720B / 510 代码行；StatementEndScan、StatementEndPossibleShape）

- 结构：**end 层（终结候选）+ 它的增量扫描状态**。`StatementEndScan` 是 `{Start, Checked, Status, End, Code, CodeAt}` 的状态类，`StatementEndPossibleShape extends PossibleShape` 继承基类默认 `IsBuildable`（恒 true）。它唯一的职责是回答「这一格能不能收口」，`BuildByIndex` 是收口的执行者。
- 偏离：
  - `[P3]` ● `BuildByIndex` 不执行 R27 规定的三步（`SignOut` → `TryToClose()` → `Quit()`）：全文 0 处 `SignOut`/`TryToClose`/`Quit`/`MountedUnit`，收口被整段外包给 `StatementShape` 的两个静态方法 — 证据 `statement-end-possible-shape.xl.md:581-583`（`const built = StatementShape.BuildFromShell(host, endIndex, context); StatementShape.FinishShell(host, built, context); return built;`）
  - `[X1]` ● 终结候选内建了一张 9 路「族 → 判据」分派表，自己承担族判定：空语句壳 / 表达式族 / 子句头 / 声明族 / 根层声明 / 短语句族 / 控制流族 / 带体声明 / yield / await，再加 `ScanRoot` 兜底 — 证据 `statement-end-possible-shape.xl.md:99`（`} else if (this.StatementKind === StatementRoute.ShellPlainExpression) {`）、`:110`（`ShellCaseClauseHead`）、`:120`（`ShellDeclarationFamily`）、`:139-141`（根层 function/class/装饰器）、`:155`（`IsShortFamilyCode`）、`:166`（`IsControlFlowFamilyCode`）、`:177`（`IsDeclarationBodyHead`）、`:187`（`IsYieldFamilyCode`）、`:196`（`IsAwaitFamilyCode`）、`:207`（`const result = StatementScanner.ScanRoot(state.Code);`）
  - `[B4]` ● 判 EOF 时读 `tokenIndex` 之后的原文：取当前单元的 `Parent.SourceRange.EndIndex`，再让 `StatementScanner.NextChar` 从当前单元结束位置往后扫原文 — 证据 `statement-end-possible-shape.xl.md:79-82`（`const owner = units[tokenIndex].Parent; const unitEnd = units[tokenIndex].SourceRange.EndIndex; StatementScanner.AtEOF = (owner !== null && owner.SourceRange.EndIndex >= 0) || (unitEnd >= 0 && StatementScanner.NextChar(units[tokenIndex].SourceRange.Document, unitEnd) === "");`）
  - `[B4]` ● `BuildByIndex` 的 EOF 分支按**整个** `host.Data` 折 `code`/`codeAt`（含 tokenIndex 之后所有单元），并用整表判界 — 证据 `statement-end-possible-shape.xl.md:408`（`for (let at = 0; at < host.Data.length; at++) {`）、`:423`（`StatementBoundaryUtil.DeclarationShellEndCode(host.Data, codeAt, …)`，把整表交给判据）
  - `[B1]` ○ 越界返回的是 `Uncertain` 而不是 R25 要求的 `Nothing`（不崩、但语义是「还活着」，与「没有数据」不可区分） — 证据 `statement-end-possible-shape.xl.md:44-46`（`if (tokenIndex < 0 || tokenIndex >= units.length) { return ShapeStates.Uncertain; }`）
  - `[C1]` ● `Code`/`CodeAt` 确实只追加（R08 的一半做到了），但**每格**都拿累积出的整个 `state.Code` 重跑一遍族判据：`IsShortFamilyCode` / `ControlFlowFamilyEndCode` / `IsYieldFamilyCode` / `IsAwaitFamilyCode` 各自从头扫，上一轮已判过的前缀结论没有落盘 — 证据 `statement-end-possible-shape.xl.md:72`（`for (let at = from; at <= tokenIndex; at++)`，只增量收单元）、`:155`、`:161`、`:166`、`:172`、`:191`、`:199`（同一轮里对 `state.Code` 的多次全扫）
  - `[C3]` ○ `state` 走的是 `GetState`/`SetState`（R09 合规），但 build 后**从不 reset**：没有 `SetState(name, null)`，只靠 `state.Start !== itemStart` 换条目；`share` 全文 0 处 — 证据 `statement-end-possible-shape.xl.md:53-59`（`let state = cache.GetState<StatementEndScan>(name); if (state === null || state.Start !== itemStart) { … cache.SetState(name, state); }`）、`:223`（`state.Checked = tokenIndex + 1;`，此后无人清）
- 结论：偏离（7 条）。R27/R28 的语义**在 CatalogGuide 一侧**是成立的（本候选被装进 `new CatalogGuide([], endShape)`，`Candidates` 恒为 0；有 `End` 才 Accept，无 `End` 返回 `Uncertain` ⇒ `Waiting`，不会误抛），偏离在于「收口动作」没有按 R27 的三步做、而是转交 `BuildFromShell`/`FinishShell`。文件内合规项需记明：全文 0 处 `catch`（0 条 `B2`）、0 处 `ExitOrPre`/`ComputePossibleShapes` 覆盖（0 条 `R1`/`R2`）、围栏外 0 行散文（0 条 `D1`）。

### typescript/tokens/statements/control-flow-statement-possible-shape.xl.md（15994B / 279 代码行；ControlFlowStatementPossibleShape）

- 结构：**possible 层（建壳候选）**。三条方法：`ComputeByIndex` 决定「这一格是否 Accept」、`IsBuildable` 决定「唯一候选时能不能建」、`BuildByIndex` 把 `[start..tokenIndex]` 搬进一个 `StatementShape` 壳并挂上只含 `endShape` 的目录。候选由 `source-file-shape.xl.md:218` / `block-possible-shape.xl.md:78` 装进 `CatalogGuide`，收敛路径本身是设计的。
- 偏离：
  - `[X1]` ● 设计外的开关位直接决定候选存活：`EnableShellExpressions` / `EnableControlFlowShell` 为假就 `Reject`（永久删除），`IsIncrementalShapesEnabled()` 为假就整段让位逻辑不执行 — 证据 `control-flow-statement-possible-shape.xl.md:36-38`（`if (!StatementRouteUtil.EnableShellExpressions || !StatementRouteUtil.EnableControlFlowShell) { return ShapeStates.Reject; }`）、`:78`（`if (StatementRouteUtil.IsIncrementalShapesEnabled()) {`）、`:288`
  - `[X1]` ● 候选之间互相判生死：本候选在 `ComputeByIndex` 里直接读**别的候选的**静态判据（`DeclareVariablePossibleShape.Owns` / `FunctionDeclarationPossibleShape.Owns` / `EnumDeclarationPossibleShape.Owns`）来自我 `Reject`，同一段判据在三个文件里各写一遍 — 证据 `control-flow-statement-possible-shape.xl.md:96`（`if (DeclareVariablePossibleShape.Owns(units, headAt, b3fSecondAt)) {`）、`:101`（`FunctionDeclarationPossibleShape.Owns`）、`:111`（`EnumDeclarationPossibleShape.Owns`）
  - `[X1]` ● 建壳后立刻挂设计外的「早期占位节点」，让 legacy 子树在收口时搬进来 — 证据 `control-flow-statement-possible-shape.xl.md:297`（`StatementShellCatalog.Attach(shell, headUnit, route);`）、`:288-299`（整段 `IsIncrementalShapesEnabled()` 门控）
  - `[X1]` ● 6 个按族分开的指标计数器被建树路径直接写，另接一个设计外的直建 session 挂载点 — 证据 `control-flow-statement-possible-shape.xl.md:261-273`（`StatementRouteUtil.LabelShellCount += 1;` … `StatementRouteUtil.ControlFlowShellCount += 1;`）、`:285`（`DirectStatementHook.Attach(shell, context);`）
  - `[B4]` ● 用 `ItemUtil.NextCode(units, headAt + 1)` 的**返回下标**（可能已经越过 `tokenIndex`）判定本格 Accept 还是 Reject，即「晚建窗口」完全由后文的存在性决定 — 证据 `control-flow-statement-possible-shape.xl.md:65`（`if (tokenIndex !== ItemUtil.NextCode(units, headAt + 1)) { return ShapeStates.Reject; }`）、`:131`（同款用于声明族）
  - `[B4]` ○ 族判定整体交 `StatementRouteUtil.Decide`，而 `Decide` 自身会读当前 token 之后的原文（同行前瞻）来区分 `type T = 1` 与 `type` 标识符，候选「只看 tokenIndex」的承诺因此在被调方被打破 — 证据 `control-flow-statement-possible-shape.xl.md:53`（`const route = StatementRouteUtil.Decide(units, tokenIndex);`）；被调方证据 `statement-route-util.xl.md:691-693`（`let at = range.EndIndex; while (at < count) { const ch = document.GetValue(at);`）
  - `[B1]` ○ 越界返回 `Uncertain`（非 `Nothing`）；`BuildByIndex` 里 `start > tokenIndex` 直接抛 `Error`，把「无可搬单元」当异常而不是返回 — 证据 `control-flow-statement-possible-shape.xl.md:33-35`、`:175-177`（`if (start > tokenIndex) { throw new Error("控制流语句候选没有可搬的单元"); }`）
  - `[C1]` ● 同一格同一 item 被重复全扫：`ComputeByIndex` 至少调一次 `ItemStartCached` + `NextCode` + `Decide`（`Decide` 内部还用**未缓存**的 `ItemUtil.ItemStart`），`IsBuildable` 把同一套再跑一遍，中间结论不落 cache — 证据 `control-flow-statement-possible-shape.xl.md:42-53`（`const start = ItemUtil.ItemStartCached(units, cache); const headAt = ItemUtil.NextCode(units, start); … const route = StatementRouteUtil.Decide(units, tokenIndex);`）、`:144-152`（`IsBuildable` 重跑同一串）
  - `[C3]` ● `state`/`share` 全未用：0 处 `GetState`/`SetState`/`GetShare`/`SetShare`，`cache` 只被用来读 `ItemStart` — 证据 `control-flow-statement-possible-shape.xl.md:42`（唯一一处 `cache` 使用）、`:138`（`cache` 形参在 `IsBuildable` 里同样只用于 `ItemStartCached`）
- 结论：偏离（9 条）。骨架是合规的：候选经 `CatalogGuide` 收敛（R26/R29/R30）、建壳后 `host.MountedUnit = shell` 且**不** `SignOut`/`TryToClose`（R32 逐条满足，`:230-260`）、壳的关联通过 `new CatalogGuide([], endShape)` 表达（R04）。偏离集中在「设计外的东西被塞进了候选」：开关位、让位矩阵、占位节点、计数器、直建挂载。

### typescript/tokens/statements/statement-family-dispatch.xl.md（11778B / 318 代码行；StatementFamilyDispatch）

- 结构：**设计外的分派器（既不是 shape 也不是 possible/end）**。它接一个 `StatementBuilder`（legacy 递归下降建造器）与一个 `kind`，按首单元文本分 30 余个分支，直接调该建造器的族方法建树，返回 legacy 节点。调用点只有一处：`statement-shape.xl.md:502`（`built = StatementFamilyDispatch.Build(builder, shell.Kind);`），而那一处正是语句壳收口的建树入口。
- 偏离：
  - `[S4]` ● 语句 AST 的事实来源在这里：`Build` 返回的是 `StatementBuilder` 建出的 legacy 节点，形状树只负责在此之前攒单元、在此之后被 `FinishShell` 换掉；全文 0 处 `ParseFromShape` — 证据 `statement-family-dispatch.xl.md:28`（`const built = StatementFamilyDispatch.BuildByHead(builder, kind);`）、`:151`（`return builder.BuildFunctionDeclaration();`）、`:219`（`return builder.BuildIf();`）
  - `[X1]` ● 「分支转发器」机制本身是设计外挂：以首单元文本为键的 30 余路 `if (text === …)` 链，把形状语义还原成字符串比较 — 证据 `statement-family-dispatch.xl.md:134`（`const text = (head as Common).TempToString();`）、`:150-268`（`function`/`class`/`async`/`declare`/`abstract`/`const`/`let`/`interface`/`enum`/`type`/`namespace`/`if`/`while`/`do`/`for`/`switch`/`try`/`with`/`return`/`throw`/`break`/`continue`/`debugger`/`using`/`await` 全链）
  - `[X1]` ● 建完再把 legacy 节点换成「早期占位节点」，节点身份由占位表决定 — 证据 `statement-family-dispatch.xl.md:32-37`（`if (built !== null && StatementRouteUtil.IsIncrementalShapesEnabled()) { const early = StatementShellCatalog.Take(built); if (early !== null) { return early; } }`）
  - `[X1]` ● `KindAllows` 自建「族 → 首单元许可」表，成为候选侧 `StatementRoute` 分派之外的第二份族判据（两处必须人工保持一致） — 证据 `statement-family-dispatch.xl.md:44`（`if (kind === StatementRoute.ShellLabel) {`）、`:58`（`ShellCaseClauseHead`）、`:67`（`ShellVariable`/`None`）、`:74`（`ShellDeclarationFamily`）
  - `[X1]` ○ 族判据重复实现：`IsTypeAliasHead`、`DeclareIsAmbientVariable` 与 possible 侧的同名判定（`EnumDeclarationPossibleShape.Owns` / `StatementRouteUtil.DeclareIsAmbientVariable` 语义）各写一份，`declare const enum` 的排除规则就分散在三处 — 证据 `statement-family-dispatch.xl.md:281-301`（`DeclareIsAmbientVariable`，含 `third !== null && builder.IsText(third, "enum")` → false）、`:304-316`（`IsTypeAliasHead`，看 `Peek(1)`/`Peek(2)` 是否为 `=`/`<`）
  - `[B4]` ● build 路径大量读 `At` 之后的单元：`Peek(1)`/`Peek(2)` 决定分派（`async function`、`const enum`、`abstract class`、`let` 的绑定位） — 证据 `statement-family-dispatch.xl.md:157-158`（`const afterAsync = builder.Peek(1); if (afterAsync !== null && builder.IsText(afterAsync, "function"))`）、`:186`、`:194-195`、`:296`、`:314`
  - `[B1]` ○ 越界只在最外层 `Build` 判一次（返回 `null`），内层方法直接 `builder.Units[builder.At]` / `Peek` 混用，「没有数据」与「不是这一族」两种情形无法区分 — 证据 `statement-family-dispatch.xl.md:21-23`（`if (builder.At < 0 || builder.At >= builder.Units.length) { return null; }`）、`:112`（`const head = builder.Units[builder.At];`，此后不再判界）
- 结论：偏离（7 条）。这是本批最重的一处：它不建形状、不管候选、不参与 cache，却**独占**「语句壳收口时由谁产出 AST」这一权力，且产物身份还被占位表二次替换。设计里 `ParseFromShape(shape)` 这一环在语句族因此不存在（全文 0 处），S4 成立。

### typescript/tokens/statements/declaration-statement-possible-shape.xl.md（11491B / 172 代码行；DeclarationStatementPossibleShape）

- 结构：**possible 层（声明族建壳候选）**，`extends ControlFlowStatementPossibleShape` 并覆写全部三个方法。它认 `StatementRoute.ShellDeclarationFamily`，build 时先尝试三条「挂族形状」的旁路，未命中才 `super.BuildByIndex` 建通用声明壳。
- 偏离：
  - `[X1]` ● 与 control-flow 同款的让位矩阵与开关位：`IsIncrementalShapesEnabled()` 门控 + 读三个族候选的 `Owns` 自判让位 — 证据 `declaration-statement-possible-shape.xl.md:88`（`if (StatementRouteUtil.IsIncrementalShapesEnabled()) {`）、`:108`（`DeclareVariablePossibleShape.Owns`）、`:114`（`FunctionDeclarationPossibleShape.Owns`）、`:126`（`EnumDeclarationPossibleShape.Owns`）
  - `[X1]` ● `BuildByIndex` 里三条设计外的「挂别人的形状」旁路：非建壳而是把建树权交给 `ImportExportDeclarationMount` / `InterfaceDeclarationMount` / `TypeAliasDeclarationMount`，本候选只做转发 — 证据 `declaration-statement-possible-shape.xl.md:177-181`（`if (StatementRouteUtil.IsRootDeclarationHost(host)) { const mounted = ImportExportDeclarationMount.TryBuild(host, tokenIndex, context); if (mounted !== null) { return mounted; } }`）、`:187-190`、`:194-197`
  - `[B4]` ● 用 `ItemUtil.NextCode(units, headAt + 1)` 的返回下标（可能越过 `tokenIndex`）决定 Reject — 证据 `declaration-statement-possible-shape.xl.md:97-98`（`const b3fSecondAt = ItemUtil.NextCode(units, headAt + 1); if (b3fSecondAt >= 0 && b3fSecondAt < units.length && b3fSecondAt <= tokenIndex) {`，`<=` 守卫说明作者知道它会越界）、`:124-126`
  - `[C1]` ● `LateOnUnclosedBracket` 用**未缓存**的 `ItemUtil.ItemStart(units)` 每次从头扫，而它被 `ComputeByIndex` 与 `IsBuildable` 各调一次（同一格两次） — 证据 `declaration-statement-possible-shape.xl.md:31-32`（`const start = ItemUtil.ItemStart(units); const headAt = ItemUtil.NextCode(units, start);`）、`:52`（`ComputeByIndex` 调用点）、`:142`（`IsBuildable` 调用点）
  - `[C3]` ● `state`/`share` 全未用（0 处 `GetState`/`SetState`/`GetShare`/`SetShare`），`cache` 仅用于 `ItemStartCached` — 证据 `declaration-statement-possible-shape.xl.md:58`（`const start = ItemUtil.ItemStartCached(units, cache);`，全文唯一 cache 使用）、`:146`
  - `[B1]` ○ 越界返回 `Uncertain`（非 `Nothing`） — 证据 `declaration-statement-possible-shape.xl.md:43-45`
- 结论：偏离（6 条）。候选收敛、`IsBuildable` 与 `ComputeByIndex` 的同源守卫（`:142-145` 与 `:52-57` 一致）都是合规的；偏离在于「候选自称只判族、实则自己决定让位与挂载」，把设计里 catalog guide 的淘汰语义搬进了候选内部。

### typescript/tokens/statements/statement-shell-catalog.xl.md（10910B / 218 代码行；StatementShellCatalog）

- 结构：**设计外的全局占位节点登记表（不是 catalog guide，也不是 possible/end）**。三个平行静态数组 `Shells` / `ShellIds` / `Lists` 记录「壳 → 它预先挂的占位节点」，`Attach` 建占位、`Take` 在收口时把 legacy 节点搬进占位节点。
- 偏离：
  - `[X1]` ● 全局可变登记表 + 自增身份号，是 IMPORTANCE 里没有的机制：壳的「身份」靠 `NextShellId` 现发，不靠形状树位置 — 证据 `statement-shell-catalog.xl.md:35-41`（`static field Shells:Array<Token> = []` / `Lists` / `ShellIds` / `NextShellId:int = 0`）、`:167-172`（`StatementShellCatalog.NextShellId += 1; … (shell as any).ShellId = shellId;`）
  - `[X1]` ● 用**字符串类名**做类型分派并 `new` 出 17 个具体 shape 占位，`for` 一次挂三个候选类名（classic/in/of）让收口时按类名取匹配 — 证据 `statement-shell-catalog.xl.md:83`（`if (typeName === "IfStatementShape") { made = new IfStatementShape(template); }`）、`:142-148`（`make("ForStatementShape"); make("ForInStatementShape"); make("ForOfStatementShape");`）、`:104-106`（`throw new Error("增量变量形状未支持：statement 占位节点类型 " + typeName);`）
  - `[X1]` ○ 5 个计数器（`ShellTakeByIdentityCount` / `ShellTakeFallbackCount` / `ShellTakeMissCount` / `ShellTakeOutOfOrderCount`）参与「是否走了降级路径」的判定与报告 — 证据 `statement-shell-catalog.xl.md:43-49`、`:212-231`
  - `[S4]` ● AST 节点不是 shape 关闭的产物：占位节点先被造出来，收口时把 legacy 节点 `built` 的 children 切片**倒灌**进占位节点，节点身份与字段都由 legacy 决定 — 证据 `statement-shell-catalog.xl.md:249-254`（`const children:Array<Token> = built.Data.slice(); built.Data.length = 0; for (const child of children) { child.Parent = matched; matched.Data.push(child); }`）
  - `[S3]` ● 占位节点 `IsTriviaToken = true` 混在 `Data` 里假装 trivia，收口时再改回 `false`：形状树的成员语义与 AST 不一致（树里有一类「假 trivia」节点） — 证据 `statement-shell-catalog.xl.md:107`（`made.IsTriviaToken = true;`）、`:264`（`matched.IsTriviaToken = false;`）
  - `[P3]` ● 收口动作绕过 `SignIn`/`SignOut`：直接改 `SourceRange.Start` / `SourceRange.End` 字段，并把 legacy 节点的 `Data` 清空 — 证据 `statement-shell-catalog.xl.md:257-262`（`matched.SourceRange.Start = source.Start; … matched.SourceRange.End = source.End;`）、`:250`（`built.Data.length = 0;`）
  - `[C1]` ● 每次 `Take` 都从尾到头线性扫全部历史壳（壳表只在成功时 `splice`，miss 时保留），加上内层再扫一遍 `Lists[at]`，一格一次 O(n) — 证据 `statement-shell-catalog.xl.md:185`（`for (let at = shells.length - 1; at >= 0; at--) {`）、`:189-193`（内层 `for (const shape of lists[at])`）、`:235-240`（第三层再扫）
  - `[B1]` ○ 没有「表为空 / 未命中」之外的空值协议：`Lists.length === 0` 才返回 `null`，其余靠类名匹配失败退化；越界与「不是本壳」不可区分 — 证据 `statement-shell-catalog.xl.md:204-206`（`if (StatementShellCatalog.Lists.length === 0) { return null; }`）、`:226-230`（`if (!fallbackHit) { … return null; }`）
- 结论：偏离（8 条）。它把「先出现的节点与 EOF 树逐节点一致」这件事用一张旁表做出来了，代价是形状树里多了假 trivia 节点、AST 反被 legacy 节点填充。文件里唯一的空值返回（`:204-206`）是干净的。

### typescript/tokens/statements/root-expression-statement-possible-shape.xl.md（10760B / 186 代码行；RootExpressionStatementPossibleShape）

- 结构：**possible 层（根表达式语句建壳候选）**。`ComputeByIndex` 只在首代码单元 Accept（并带一个「头格被吞掉时补建」的分支），`BuildByIndex` 建 `StatementShape` 壳、挂 `StatementEndPossibleShape` 目录、接直建 session。
- 偏离：
  - `[B2]` ● `BuildByIndex` 里 `try/catch` 把 `Ingest` 抛出的异常吃掉：catch 后只记 `DirectBuildMetrics.Errors`/`LastError` 再继续返回壳，不上抛（R23 明令禁止） — 证据 `root-expression-statement-possible-shape.xl.md:179-194`（`try { ingestSession.Ingest(shell.Data, context); } catch (error) { … DirectBuildMetrics.Errors += 1; DirectBuildMetrics.LastError = message; … }`）
  - `[X1]` ● 设计外的直建 session 接线：建壳后立刻 `DirectBuildRouter.Create` 再喂一次 `Data`，本候选的 build 因此承担了「启动另一条建树路径」的职责 — 证据 `root-expression-statement-possible-shape.xl.md:169`（`shell.DirectSession = DirectBuildRouter.Create(StatementRoute.ShellPlainExpression, shell, context);`）、`:180`（`ingestSession.Ingest(shell.Data, context);`）
  - `[X1]` ● 设计外的「晚建补建 + 预热」：`tokenIndex > start` 时在 build 里再跑一次 `shell.ComputePossibleShapes(...)`，否则调 `PrimeIncremental`，两种补建手法都不在 IMPORTANCE 里 — 证据 `root-expression-statement-possible-shape.xl.md:198-199`（`if (tokenIndex > start) { shell.ComputePossibleShapes(context, PossibleSource.Close);`）、`:205`（`shell.PrimeIncremental(context);`）
  - `[B4]` ● 补建判据读 `tokenIndex` 之后的原文：`units[tokenIndex].Parent.SourceRange.EndIndex` + `NextChar(Document, …)` 判 EOF，再用 `CanEndStatement` 决定「这一格要不要补建」 — 证据 `root-expression-statement-possible-shape.xl.md:75-79`（`const lateOwner = units[tokenIndex].Parent; const lateEnd = units[tokenIndex].SourceRange.EndIndex; … StatementBoundaryUtil.CanEndStatement(units, tokenIndex, lateAtEof)`）
  - `[P3]` ○ build 与 close 在同一格里发生：晚建分支在 `BuildByIndex` 内部直接驱动壳的候选求值，壳刚挂上就可能被自己的终结候选收口，R32 的「后续字符继续流进它」被跳过 — 证据 `root-expression-statement-possible-shape.xl.md:199`（`shell.ComputePossibleShapes(context, PossibleSource.Close);`）
  - `[B1]` ○ 越界返回 `Uncertain`（非 `Nothing`）；`BuildByIndex` 的 `start > tokenIndex` 直接抛错 — 证据 `root-expression-statement-possible-shape.xl.md:31-33`、`:110-112`
  - `[C1]` ● 每格重复全扫：`ItemStartCached` + `ItemUtil.NextCode` + `StatementRouteUtil.Decide`（后者内部又用未缓存的 `ItemStart`），`ComputeByIndex`/`IsBuildable` 两处各跑一遍，中间结论不落 cache — 证据 `root-expression-statement-possible-shape.xl.md:40-55`、`:95-103`（`IsBuildable` 重跑同一串）
  - `[C3]` ● `state`/`share` 全未用：0 处 `GetState`/`SetState`/`GetShare`/`SetShare`，`cache` 只服务 `ItemStartCached` — 证据 `root-expression-statement-possible-shape.xl.md:40`（`const start = ItemUtil.ItemStartCached(units, cache);`）、`:95`
- 结论：偏离（8 条）。建壳与挂载本身合规（`:163-165` `host.Data.splice` + `host.MountedUnit = shell`，不 `SignOut`/`TryToClose`），偏离在于 build 里塞了第二条建树通道（直建 session）并用 catch 把它包成「尽力而为」。

### typescript/tokens/statements/variable-statement-possible-shape.xl.md（9663B / 193 代码行；VariableStatementPossibleShape）

- 结构：**possible 层（let/const/var/using 语句建壳候选）**。除三个必需方法外还有三个私有判据 `HeadText` / `BindingAt` / `IsConstEnumHead`，都用 `ItemUtil.NextCode` 从 item 起点现扫。
- 偏离：
  - `[B2]` ● `BuildByIndex` 里 `try/catch`：`Declined` 为真就把异常吞掉（不上抛、不记错误），非 `Declined` 才重抛（R23 禁止在 build 里吃掉异常） — 证据 `variable-statement-possible-shape.xl.md:221-227`（`try { shell.DirectSession.Ingest(shell.Data, context); } catch (error) { if (!shell.DirectSession.Declined) { throw error; } }`）
  - `[X1]` ● 增量模式开关直接改写 build 的去向：为真时整段旁路到 `IncrementalVariableStatementBuilder.Build`，本候选不再建壳 — 证据 `variable-statement-possible-shape.xl.md:145-147`（`if (StatementRouteUtil.IsIncrementalVariableShapesEnabled()) { return IncrementalVariableStatementBuilder.Build(host, tokenIndex, context); }`）
  - `[X1]` ● 设计外的直建 session 接线（同 root-expression） — 证据 `variable-statement-possible-shape.xl.md:213`（`shell.DirectSession = DirectBuildRouter.Create(StatementRoute.ShellVariable, shell, context);`）、`:222`
  - `[B1]` ○ 越界判在**后面**：`ShouldYieldToDeclarationShell(units, tokenIndex)` 先于 `tokenIndex < 0 || tokenIndex >= units.length` 被调用，能否安全全看被调方 `Decide` 自带的守卫 — 证据 `variable-statement-possible-shape.xl.md:82`（`if (StatementRouteUtil.ShouldYieldToDeclarationShell(units, tokenIndex)) {`）、`:87-89`（其后的越界判断）；被调方守卫 `statement-route-util.xl.md:747-749`
  - `[B4]` ● 判「是不是声明」时越过 `tokenIndex` 取后面的绑定单元 / `enum` 单元：`BindingAt` 与 `IsConstEnumHead` 都用 `NextCode` 从首单元往后找，返回值可 > tokenIndex — 证据 `variable-statement-possible-shape.xl.md:52`（`return ItemUtil.NextCode(units, headAt + 1);`）、`:70`（`const nextAt = ItemUtil.NextCode(units, headAt + 1);`）、`:105`（`const bindingAt = this.BindingAt(units, start);`）、`:113`（`if (!StatementScanner.StartsBinding(units, bindingAt)) {`）
  - `[C1]` ● 三个私有判据各自从 item 起点重扫（`HeadText` 一次、`BindingAt` 两次 `NextCode`、`IsConstEnumHead` 三次），`ComputeByIndex` 里串起来调一遍、`IsBuildable` 里再来一遍，全无 state/share — 证据 `variable-statement-possible-shape.xl.md:102`（`if (this.HeadText(units, start) === "") {`）、`:105`、`:117`（`if (!this.IsConstEnumHead(units, start)) {`）、`:131-137`（`IsBuildable` 重跑三判据）
  - `[C3]` ● `state`/`share` 全未用（0 处 `GetState`/`SetState`/`GetShare`/`SetShare`） — 证据 `variable-statement-possible-shape.xl.md:95`（`if (ItemUtil.NextCode(units, ItemUtil.ItemStartCached(units, cache)) >= units.length) {`，`cache` 仅用于 ItemStart）
  - `[U1]` ○ build 那一刻不提取字段：把 raw 单元整段 `Add` 进 `StatementShape` 壳，由 legacy builder 之后再去读，basic token 因此在「build 之后」仍留在 `Data` 里 — 证据 `variable-statement-possible-shape.xl.md:193-195`（`for (const item of moved) { shell.Add(item); }`）
- 结论：偏离（8 条）。壳的挂载与目录安装合规（`:207-210`），`const enum` 的族标记在搬单元**之前**读取（`:155`）这一处细节是对的；偏离在于 build 里两条旁路（增量建造器、直建 session）与三处无缓存重扫。

### typescript/tokens/statements/control-head-possible-shape.xl.md（9289B / 204 代码行；ControlHeadScan、ControlHeadPossibleShape）

- 结构：**bracket 角色目录的「原子」possible**（不在语句族里）：`EnsureRegistered` 把本候选装进一个 `BracketRoleCatalog(BracketRole.ControlHead, …)`，`InstallAtBracketCreated` 在 `(` 创建时安装目录，`BuildByIndex` 把控制头括号里的标识符/数字换成 `IdentifierShape`/`NumericLiteralShape`。
- 偏离：
  - `[S2]` ● 这个 possible 不参与候选淘汰：`ComputeByIndex` 恒返回 `Uncertain`，真正的判定全在 `IsBuildable`（「这一格是不是原子」），R26 的「逐个活候选 ComputeByIndex → Reject 淘汰」对它形同虚设 — 证据 `control-head-possible-shape.xl.md:270-274`（`## method ComputeByIndex:… { return ShapeStates.Uncertain; }`）、`:276-283`（`IsBuildable` 里 `ControlHeadPossibleShape.AtomKind(units[tokenIndex]) !== ""`）
  - `[X1]` ● 用 4 个静态全局字段当 cache 与注册表（`States` / `Atoms` / `CatalogRegistered` / `CreatePossibleShapesCache`），配 `ResetAtoms()` 手工清空，设计里应是 `get state`/`set state` 与 `share` — 证据 `control-head-possible-shape.xl.md:38-44`（`static field States:Array<ControlHeadScan> = []` … `CreatePossibleShapesCache:Array<PossibleShape> | null = null`）、`:71-76`（`ControlHeadPossibleShape.Atoms = new Set(); ControlHeadPossibleShape.States = [];`）
  - `[X1]` ● `BracketRole` / `BracketRoleCatalog` / `BracketRoleResolver.Resolve` 是设计外的「括号角色」分类体系：设计的 bracket 晋升是「install catalog possible」（R13/R14），这里先让角色解析器判角色再装 — 证据 `control-head-possible-shape.xl.md:66-68`（`const catalog = new BracketRoleCatalog(BracketRole.ControlHead, ControlHeadPossibleShape.Shapes(), null); … BracketRoleResolver.RegisterCatalog(catalog);`）、`:262-266`（`const plan = BracketRoleResolver.Resolve(host, shape, context); if (!plan.IsKnown() || plan.Role !== BracketRole.ControlHead) { return false; } BracketCatalogInstaller.Install(shape, plan, context);`）
  - `[P1]` ○ 触发点是对的（bracket create 时 `Install`，符合 R13），但装进去的是「角色目录」而非形状自己的 possible，R14 的「形状可能确定、data 不完整 ⇒ 只 install catalog 由 data 收敛」被替换成「角色判对了才装」 — 证据 `control-head-possible-shape.xl.md:251-268`（`InstallAtBracketCreated` 整个方法体）、`:258`（只认 `StartBracketChar === "("`）
  - `[B1]` ● 越界时 `return token`，而此刻 `token` 就是 `undefined`：以 `undefined` 充当 `Nothing`，且返回类型声明为 `Token`，调用方拿到后无处可判 — 证据 `control-head-possible-shape.xl.md:288-291`（`const token = host.Data[tokenIndex]; if (token === undefined) { return token; }`）
  - `[B4]` ● `Decide` 的缓存键是**整个 `bracket.Data` 数组身份**、与 `tokenIndex` 无关：第一次被问时就把该括号 `Data` 的首个代码单元与整段内容读完（`FirstCode` 全扫、`HeadKeyword` 回看父单元），此后各格复用该结论 — 证据 `control-head-possible-shape.xl.md:163-170`（`const units = bracket.Data; const known = …FindState(units); … state.Keyword = ControlHeadPossibleShape.HeadKeyword(bracket);`）、`:176`（`const first = ControlHeadPossibleShape.FirstCode(units);`，`for (const unit of units)` 全扫）、`:130`
  - `[C1]` ● `FindState` 每次线性扫全部历史条目，`States` 只 `push` 从不清理（`ResetAtoms` 才清），每次 `Decide` 先扫一遍再决定是否新建 — 证据 `control-head-possible-shape.xl.md:97-102`（`for (const state of ControlHeadPossibleShape.States) { if (state.Host === units) { return state; } }`）、`:184`（`ControlHeadPossibleShape.States.push(state);`）
  - `[C3]` ● `state`/`share` 全未用（0 处 `GetState`/`SetState`/`GetShare`/`SetShare`），`ComputeByIndex` 甚至连 `cache` 形参都不读 — 证据 `control-head-possible-shape.xl.md:270-274`（方法体只有 `return ShapeStates.Uncertain;`）
- 结论：偏离（8 条）。它是本批唯一「possible 只做 `IsBuildable` 守卫」的文件，候选语义与设计最远；但 `Install` 发生在 bracket create 这一时机本身与 R13 一致。

### typescript/tokens/statements/case-clause-statement-possible-shape.xl.md（9126B / 187 代码行；CaseClauseStatementPossibleShape）

- 结构：**possible 层（`case`/`default` 冒号之后那条子句语句的建壳候选）**，与 `CaseClauseHeadPossibleShape` 同目录（`block-possible-shape.xl.md:613-620` 一起装进 case 块目录）。
- 偏离：
  - `[B1]` ● `BuildByIndex` 越界直接抛 `Error`，不返回安全值 — 证据 `case-clause-statement-possible-shape.xl.md:73-76`（`const start = tokenIndex; if (start < 0 || start >= host.Data.length) { throw new Error("case 子句语句候选没有可搬的单元"); }`）
  - `[C1]` ● 每格三层嵌套重扫、无任何 cache：`IsClauseStatementStart` 往回扫找前一个非 trivia；`IsInsideClause` 再往回扫到最近的 `case`/`default`；`ClauseColonAt` 再从那里往后扫到冒号 — 证据 `case-clause-statement-possible-shape.xl.md:171-176`（`for (let at = tokenIndex - 1; at >= 0; at--)`）、`:186`（`for (let cursor = at; cursor >= 0; cursor--)`）、`:210`（`for (let at = from; at < units.length; at++)`）
  - `[B4]` ● `ClauseColonAt(units, cursor + 1)` 从更早的 `case` 往后扫，可能越过 `tokenIndex` 取尚未到达的单元，其返回值决定本格是否 Accept — 证据 `case-clause-statement-possible-shape.xl.md:198-199`（`const colonAt = CaseClauseStatementPossibleShape.ClauseColonAt(units, cursor + 1); return colonAt >= 0 && colonAt <= at;`）
  - `[C3]` ● `state`/`share` 全未用（0 处 `GetState`/`SetState`/`GetShare`/`SetShare`），`ComputeByIndex` 的 `cache` 形参未被读 — 证据 `case-clause-statement-possible-shape.xl.md:25-52`（整段方法体只用 `units`/`tokenIndex`）
  - `[X1]` ○ 按 `constructor.name` 字符串判型：`IsInsideClause` 用类名比较认子句壳，形状身份靠字符串 — 证据 `case-clause-statement-possible-shape.xl.md:191-192`（`const name = item.constructor.name; if (name === "CaseClauseShape" || name === "DefaultClauseShape") {`）
  - `[X1]` ○ 建壳时二次分族：按首单元是否为带体关键字，把终结候选的 `StatementKind` 在 `ShellStatementFamily` / `ShellPlainExpression` 之间二选一 — 设计里族标记应由建壳候选的 route 决定，不应由壳内首词再判一次 — 证据 `case-clause-statement-possible-shape.xl.md:97-98`（`const statementFamily = moved.length > 0 && CaseClauseStatementPossibleShape.IsStatementFamilyHead(moved[0]);`）、`:127-129`（`endShape.StatementKind = statementFamily ? StatementRoute.ShellStatementFamily : StatementRoute.ShellPlainExpression;`）
- 结论：偏离（6 条）。候选的淘汰语义是对的（让位子句头候选用 `Reject`，`:46-48`；建壳后 `host.MountedUnit = shell` 不关壳，`:133`），偏离集中在「判界靠三层回溯扫描」与两处设计外的判型手法。

### typescript/tokens/statements/statement-possible-shape.xl.md（8672B / 165 代码行；StatementScan、StatementPossibleShape）

- 结构：**possible 层（legacy 族的兜底建壳候选）**。`StatementScan` 与 `statement-end-possible-shape` 的扫描状态同构（`Start`/`Checked`/`Status`/`End`/`Code`/`CodeAt`），`StatementPossibleShape` 只认 `StatementRoute.Legacy`。
- 偏离：
  - `[S4]` ● build 直接起一个 `StatementBuilder` 用递归下降建 AST，形状树在整条路径上不参与产出（全文 0 处 `ParseFromShape`） — 证据 `statement-possible-shape.xl.md:195`（`const builder = new StatementBuilder(host.Template, context);`）、`:196-197`（`builder.Load(consumed, pos); const built = builder.BuildStatement();`）
  - `[P3]` ● build 去向是第三种形态：既不 `SignOut`/`TryToClose`，也不 `host.MountedUnit = shape`，而是把 `host.Data` 的 `[start..end]` 直接 splice 成 legacy 节点 — 证据 `statement-possible-shape.xl.md:201`（`host.Data.splice(start, end - start + 1, built);`）、`:202`（`built.Parent = host;`）
  - `[C1]` ● `Code`/`CodeAt` 只追加（`:120-125`），但每格都拿整个 `state.Code` 重跑 `StatementScanner.ScanRoot`，上一轮的扫描进度没有复用 — 证据 `statement-possible-shape.xl.md:120`（`for (let at = from; at <= tokenIndex; at++)`）、`:134`（`const result:StatementScanResult = StatementScanner.ScanRoot(state.Code);`）
  - `[C3]` ● `state` 用了 `GetState`/`SetState`，但 build 后不 reset（无 `SetState(name, null)`），`share` 全未用；且 `IsBuildable` 直接读同一个 state 槽做判据，把 state 当 share 用 — 证据 `statement-possible-shape.xl.md:100-106`（`let state = cache.GetState<StatementScan>(name); … cache.SetState(name, state);`）、`:168-169`（`const state = cache.GetState<StatementScan>(this.Slot()); return state !== null && state.Status === 1 && state.End >= 0;`）
  - `[B4]` ● 判 EOF 读 `tokenIndex` 之后的原文（`Parent.SourceRange.EndIndex` + `NextChar`） — 证据 `statement-possible-shape.xl.md:126-133`（`const owner = units[tokenIndex].Parent; const unitEnd = units[tokenIndex].SourceRange.EndIndex; StatementScanner.AtEOF = … NextChar(units[tokenIndex].SourceRange.Document, unitEnd) === "";`）
  - `[B1]` ○ 越界返回 `Uncertain`（非 `Nothing`）；`BuildByIndex` 在 `state === null` 时退回 `ItemUtil.ItemStart` 全扫，等于失败后改变判据 — 证据 `statement-possible-shape.xl.md:57-59`、`:176`（`const start = state === null ? ItemUtil.ItemStart(host.Data) : state.Start;`）
  - `[X1]` ○ 熔断双路并存：`EnableShellExpressions` 为假时保留 Wave1 的内联 `let`/`const`/`var` 分流（与 `Decide` 判据重复），两条判据必须人工保持一致 — 证据 `statement-possible-shape.xl.md:85-99`（`} else { … if (headText === "let" || headText === "const" || headText === "var") { … return ShapeStates.Reject; } }`）
- 结论：偏离（7 条）。它本是「legacy 族仍走 possible」的设计内安排（`source-file-shape.xl.md:229` 的 `withRootLegacyStatement`），但 build 把 AST 生产整个交回 builder，使这条 possible 只剩「决定在哪里切段」的职责。

### typescript/tokens/statements/deferred-bracket-catalog.xl.md（8615B / 211 代码行；DeferredBracketEntry、DeferredBracketCatalog）

- 结构：**设计外的「延迟安装」登记表（不是 catalog guide）**。bracket 创建时先把「括号 + 所有者 + 计划 + context」登记进静态 `Pending`，等外部 `Bind(...)` 时再逐条 `Replay` 才是真正装目录 + 逐格求值。
- 偏离：
  - `[P1]` ● 自行造了触发点：R13 要求 bracket **create 时**就 install catalog possible，这里 create 只 `Register`，真正安装推迟到 `Bind`；时序由调用方决定而非由括号生命周期决定 — 证据 `deferred-bracket-catalog.xl.md:54-62`（`## static method Register:(bracket, owner, context, plan)` → `RegisterWithKey`）、`:109-111`（`## static method Bind:(owner:Token | string, narrow?:Token | null)=>Array<Token>`）、`:166`（`const replayed = DeferredBracketCatalog.Replay(bracket, context, plan);`）
  - `[B2]` ● `Replay` 的 `try/catch` 吃掉异常：catch 后把 `CatalogGuide` 撤回 `null`、`RoleState = 0`、`Role = ""`、记账，然后正常返回 `-1`，不上抛（R23） — 证据 `deferred-bracket-catalog.xl.md:254-274`（`try { … } catch (error) { shape.CatalogGuide = null; shape.RoleState = 0; shape.Role = ""; replayed = -1; … } finally { DeferredBracketCatalog.Replaying = false; }`）
  - `[C2]` ● 全量重放：`Replay` 对 `shape.Data` 从头到尾逐格调 `ComputePossibleShapesByIndex`，把已存在的 raw 单元整段重跑一遍（不是从断点续算） — 证据 `deferred-bracket-catalog.xl.md:255-259`（`const total = shape.Data.length; for (let at = 0; at < total; at++) { shape.ComputePossibleShapesByIndex(at, context, PossibleSource.Close); replayed += 1; }`）
  - `[X1]` ● 静态全局待办表 + 6 个计数器 + 重入开关 `Replaying` + `Report()` 字符串指标，全是 IMPORTANCE 未定义的机制 — 证据 `deferred-bracket-catalog.xl.md:31-41`（`static field Pending:Array<DeferredBracketEntry> = []` … `Replaying:bool = false`）、`:289-297`（`return "pending=" + … + " dropped=" + …`）
  - `[C1]` ● 每条通路都全扫待办表、无索引：`Find` 线性找、`RegisterWithKey` 先 `Find`、`Drop` 线性删、`Bind` 全表匹配、`IsRaw` 全扫括号 `Data` — 证据 `deferred-bracket-catalog.xl.md:46-51`（`for (const entry of DeferredBracketCatalog.Pending) { if (entry.Bracket === bracket) { return entry; } }`）、`:99-106`、`:132-145`、`:198-205`（`for (const unit of bracket.Data) {`）
  - `[P2]` ○ 候选判定的语义被「计划升级」取代：`UpgradePlan` 把 Deferred 计划直接升成 `Known`（补空 `Shapes`），再由 `BuildGuide` 装目录 —— 也就是说这一格的「能不能建」由计划对象的状态决定，不经过候选淘汰 — 证据 `deferred-bracket-catalog.xl.md:190-192`（`const upgraded = BracketRoleResult.Known(catalog, null, plan.Role, entry.Owner, plan.OwnerKey); upgraded.Reason = "deferred-catalog-upgrade";`）、`:239-244`（`const guide = BracketCatalogInstaller.BuildGuide(effective); if (guide === null) { … return -1; }`）
  - `[X2]` ○ 设计外的一次性 / 重入语义：`shape.ReplayCount > 0` 直接返回、「replay 栈内再 replay」直接返回，这两个守卫是旁路的前置条件而非设计机制 — 证据 `deferred-bracket-catalog.xl.md:219-226`（`if (DeferredBracketCatalog.Replaying) { … return 0; } if (shape.ReplayCount > 0) { … return 0; }`）
  - `[U3]` ○ 未消费 token 的处理走了自造通道：这里把「括号里的 raw 单元还没被消费」这件事交给 `Replay` 重放，而不是设计规定的 `Reload Message` — 证据 `deferred-bracket-catalog.xl.md:209`（`## static method Replay:(bracket:Token, context:SyntaxContext, plan?:BracketRoleResult | null)=>int`）、`:227-232`（`if (!DeferredBracketCatalog.IsRaw(shape)) { … return -1; }`，用「是否全 raw」当可否重放的判据）
- 结论：偏离（8 条）。它确实提供了 R13 的一条实现路径（「create 时装目录」这件事最终会发生），但把「何时装」变成了一张可以被外部随意 `Bind` 的待办表，并为此引入重入/一次性/全量重放三套语义。

### typescript/tokens/statements/case-clause-head-possible-shape.xl.md（6487B / 133 代码行；CaseClauseHeadPossibleShape）

- 结构：**possible 层（`case <表达式> :` / `default :` 子句头的建壳候选）**，与 `CaseClauseStatementPossibleShape` 同目录、按 `Decide` 的 route 分工。
- 偏离：
  - `[B1]` ● `BuildByIndex` 越界直接抛错 — 证据 `case-clause-head-possible-shape.xl.md:94-97`（`let start = ItemUtil.ItemStart(host.Data); if (start < 0 || start > tokenIndex) { throw new Error("case 子句头候选没有可搬的单元"); }`）
  - `[X1]` ● 建壳后挂设计外的「早期占位节点」（`CaseClauseShape` / `DefaultClauseShape`，收口时由 `StatementShellCatalog.Take` 搬入 legacy 子树） — 证据 `case-clause-head-possible-shape.xl.md:145-155`（`if (StatementRouteUtil.IsIncrementalShapesEnabled()) { … StatementShellCatalog.Attach(shell, headUnit, StatementRoute.ShellCaseClauseHead); }`）
  - `[C1]` ● 同一格重复全扫：`ItemStartCached` + `NextCode` + `Decide` 在 `ComputeByIndex` 与 `IsBuildable` 各跑一遍；`BuildByIndex` 又用未缓存的 `ItemUtil.ItemStart` 重扫一次 — 证据 `case-clause-head-possible-shape.xl.md:49-54`（`const start = ItemUtil.ItemStartCached(units, cache); const headAt = ItemUtil.NextCode(units, start); … const route = StatementRouteUtil.Decide(units, tokenIndex);`）、`:82-88`（`IsBuildable` 重跑）、`:94`（`ItemUtil.ItemStart(host.Data)`，无缓存版本）
  - `[C3]` ● `state`/`share` 全未用（0 处 `GetState`/`SetState`/`GetShare`/`SetShare`），`cache` 只用于 `ItemStartCached` — 证据 `case-clause-head-possible-shape.xl.md:49`、`:82`
  - `[B4]` ○ 族判定交 `StatementRouteUtil.Decide`，而 `Decide` 自身用原文前瞻区分上下文关键字，候选「只看 tokenIndex」的边界因此在被调方被打破 — 证据 `case-clause-head-possible-shape.xl.md:54`、`:88`；被调方 `statement-route-util.xl.md:691-693`
- 结论：偏离（5 条）。收口侧的族标记与判据同源（`:126` `shell.Kind` 与 `:135` `endShape.StatementKind` 都取 `ShellCaseClauseHead`，判界交 `ClauseHeadEndCode`），建壳后只挂不关（`:139` 合规于 R32）；偏离在于越界抛错、占位节点与无缓存重扫。

### typescript/tokens/statements/variable-statement-shape.xl.md（4498B / 88 代码行；VariableStatementShape）

- 结构：**shape 层（变量语句的最终形状）**，`extends ShapeToken`，覆写 `TryToClose` 以处理「增量三层挂载链」（statement → list → declaration）与结尾分号。
- 偏离：
  - `[X1]` ● 设计外的开关字段 `Incremental`：为真才走三层收口，为假直接交基类，两条收口路径并存 — 证据 `variable-statement-shape.xl.md:30`（`## field Incremental:bool = false`）、`:43`（`if (this.Incremental && !this.Closed) {`）
  - `[X1]` ● `TryToClose` 里手工递归关闭 `MountedUnit` 链（先最内层 `VariableDeclarationShape`，再 `VariableDeclarationListShape`，最后基类关自己）：设计里一个形状只关自己，这条「三层挂载协议」是新增的 — 证据 `variable-statement-shape.xl.md:47-57`（`if (list !== null && list instanceof VariableDeclarationListShape) { … declaration.TryToClose(context); list.TryToClose(context); }`）、`:41-42`（注释自述「基类 `TryToClose` 只关自己、不递归」）
  - `[X1]` ● 跨 shape 的侧信道字段：从声明形状的 `TrailingSemicolon` 字段取回分号再 `Add` 到语句，字段被读后立即置 `null` — 证据 `variable-statement-shape.xl.md:82-87`（`const semicolon = declaration.TrailingSemicolon; if (semicolon === null) { return; } declaration.TrailingSemicolon = null;`）、`:92`（`this.Add(semicolon);`）
  - `[X1]` ● 收口时直接改 `SourceRange.End`，绕开 `SignOut` 的范围签出 — 证据 `variable-statement-shape.xl.md:110-115`（`if (last !== null && last instanceof Symbol && (last as Symbol).Is(";")) { const end = last.SourceRange.EndIndex; if (end >= 0 && this.SourceRange.End > end) { this.SourceRange.End = end; } return; }`）、`:118`（`this.TrimEndToLastCode();`）
  - `[S3]` ○ 形状树比 AST 多一层：三层里只有 `VariableDeclarationShape` 持有字段与 `Data`（`:41-42` 自述），语句层是空壳，靠 `AdoptTrailingSemicolon` 与 `TrimEnd` 把壳对齐到 AST 的 `VariableStatement` — 证据 `variable-statement-shape.xl.md:41-42`（`// 增量模式：挂载链是 statement → list → declaration。基类 TryToClose 只关自己、不递归`）、`:61-63`（`if (declaration !== null) { this.AdoptTrailingSemicolon(declaration, context); }`）
- 结论：偏离（5 条）。`TryToClose` 这条出口本身是 R31 的合法「立即关闭」（`CloseStates` 返回、`this.Closed` 守卫在 `:73-76`），偏离在于它被迫承担了设计外的三层挂载协议与三处字段直写。

### typescript/tokens/statements/bracket-catalog-installer.xl.md（4206B / 83 代码行；BracketInstallResult、BracketCatalogInstaller）

- 结构：**bracket 晋升的安装器（工具层）**：`InstallAtBracketCreated` 调它把 `BracketRoleResult` 变成 `CatalogGuide` 装到括号上。它是 R13「install catalog possible」的一条实现路径。
- 偏离：
  - `[P2]` ● 把计划给的终结候选**替换成** `WaitingEndPossible`：该类的 `ComputeByIndex` 恒 `Uncertain`（`waiting-end-possible.xl.md:19`），于是这条路径上的括号永远不会因「终结候选 Accept」而 build —— R27 的「`Candidates == 0` ⇒ `BuildByIndex`」与 R28 的「零候选且无 end ⇒ 抛错」被整体关掉 — 证据 `bracket-catalog-installer.xl.md:65-69`（`let end:PossibleShape | null = plan.End; if (end === null || !(end instanceof WaitingEndPossible)) { DoubleAcceptGuardCount += 1; end = new WaitingEndPossible(); }`）、`:127-131`（`let waiting:PossibleShape = end; if (!(end instanceof WaitingEndPossible)) { waiting = new WaitingEndPossible(); }`）
  - `[X1]` ● 设计外的安装协议：4 态返回码 `BracketInstallResult`（Installed / AlreadyInstalled / RefusedConflict / RefusedFallback）+ 6 个计数器，安装结果由返回值编码而不是由目录状态表达 — 证据 `bracket-catalog-installer.xl.md:19-41`（`static field Installed:int = 0` … `RefusedEmptyCount:int = 0`）、`:82`（`return BracketInstallResult.RefusedFallback;`）、`:92`（`return BracketInstallResult.RefusedConflict;`）
  - `[X1]` ○ 目录构造之后仍可改结构：`SetEndPossible` 直接写 `guide.EndPossible`，幂等分支只「补终结候选、不替换 PossiblyShapes」，即目录的可变面被扩大了 — 证据 `bracket-catalog-installer.xl.md:95-98`（`if (bracket.CatalogGuide !== null) { … BracketCatalogInstaller.SetEndPossible(bracket, plan.End); return BracketInstallResult.AlreadyInstalled; }`）、`:132`（`guide.EndPossible = waiting;`）
  - `[P1]` ○ 装目录的时机落在 bracket create（符合 R13），但 `BuildGuide` 在 `plan.Shapes.length === 0` 时直接拒绝并计数（`RefusedEmptyCount`），于是「形状还没定」的括号 create 时**装不上任何东西**，与 R14「create 时只 install catalog、由 data 增量收敛」相反 — 证据 `bracket-catalog-installer.xl.md:61-64`（`if (plan.Shapes.length === 0) { BracketCatalogInstaller.RefusedEmptyCount += 1; return null; }`）、`:100-104`（`const guide = BracketCatalogInstaller.BuildGuide(plan); if (guide === null) { … return BracketInstallResult.RefusedFallback; }`）
- 结论：偏离（4 条）。`IsInstalled` 的判据（`CatalogGuide !== null`）与 `Install` 的幂等、冲突保留先装者（`:89-93`）都是合理的工程处理，但把终结候选换成「永不 Accept」的桩件改变了 R27/R28 的语义，是本批第二处影响全局的行为偏离。

---

## 本批统计

- 文件数：14
- 有偏离文件数：14
- 按编号计数（共 96 条）：`X1:31 S4:3 P3:4 P1:3 P2:2 B4:12 B1:11 C1:11 C3:9 B2:3 S3:2 S2:1 C2:1 U1:1 U3:1 X2:1`
  - 未出现：`B3`、`U2`、`U4`、`R1`、`R2`、`X3`、`D1`（14 个文件围栏外 0 行散文；0 处 `ExitOrPre` / `ComputePossibleShapes` 覆盖；无 tsx/JSX 形状；跳跃只跳 trivia）
  - 强度分布：● 71 / ○ 25
- 本批最严重 3 条：
  1. `[S4]` `StatementFamilyDispatch` 成为语句 AST 的唯一来源：它按首单元文本 30 余路分派给 `StatementBuilder` 的 legacy 建造器，`statement-shape.xl.md:502` 的收口点只负责把它塞回父 `Data`；`ParseFromShape` 在语句族全文 0 处（`statement-family-dispatch.xl.md:28`、`:151`、`statement-possible-shape.xl.md:195-201`）。
  2. `[X1]`/`[S3]` `StatementShellCatalog` + `StatementFamilyDispatch.Take` 的「早期占位节点」机制：占位节点以 `IsTriviaToken = true` 混在 `Data` 里（`statement-shell-catalog.xl.md:107`），收口时把 legacy 节点的 children 倒灌进来再把 `IsTriviaToken` 改回 false（`:249-264`），形状树与 AST 因此不同构，节点身份也不由形状树决定。
  3. `[P2]`/`[P3]` 终结候选的语义被两处改写：`statement-end-possible-shape.xl.md:581-583` 把 R27 的 `SignOut`→`TryToClose()`→`Quit()` 换成 `BuildFromShell`/`FinishShell`；`bracket-catalog-installer.xl.md:65-69`、`:127-131` 把 bracket 目录的终结候选替换成永不 Accept 的 `WaitingEndPossible`，等于对这条路径关掉 R27/R28。
