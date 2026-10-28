# 99 — 分类总结：IMPORTANCE 设计偏离全景

> 本文件是 35 篇区域审计的归纳。逐文件证据在各篇里（见 [`00-overview.md`](00-overview.md) 的文档地图）；这里只回答「偏离分成哪几类、根因是什么、哪些最要命、哪些其实没错」。

## 1. 一句话结论

IMPORTANCE 的三件套（shape / possible / end）与 cache 语义**是照着写出来的**：`CatalogGuide` 的候选判定五条几乎逐字对得上，`PossibleShapeCache` 的 state/share 语义完全正确。但**形状树没有承担 AST 的产出**——`ParseFromShape`、`Reclose`、`HandleCloseDispatch` 这三个设计动作，在全仓分别是「1 处且未实现」「0 个调用点」「0 处引用」。于是在主干之外长出**三套并行建树管线**（legacy builder、成员/语句壳目录、direct session），由它们用整段 raw 重建 AST。**整套偏离几乎是这三套旁路的副产物**，而不是「某几条规则没实现」。

## 2. 关键数字（全仓机械读数，可复算）

| 读数 | 值 | 含义 |
| --- | --- | --- |
| 审计文件 | 638（`core/` 53 + `typescript/` 584 + 根 1） | 2 954 601 B / 58 559 代码行 |
| `ParseFromShape` | **1** 处，且方法体是 `throw new Error("…未实现")` | R21 的唯一入口是空壳 |
| `Reclose` 调用点 | **0** | R17③「回挂并重关」从未执行 |
| `HandleCloseDispatch` | **0** | R15/R16 的 bracket 晋升机制不存在 |
| 覆盖 `ExitOrPre` 的文件 | **24**（其中 TS shape 16） | R33「禁止覆盖」失效 |
| 覆盖 `ComputePossibleShapes` 的文件 | **18**（其中 TS shape 16） | R34「禁止覆盖」失效 |
| compute/build 里 `catch` 的文件 | **7**（compute 4 次 / build 9 次） | R23「禁止吃掉异常」失效 |
| compute 里出现循环的文件 | **33**（65 处） | R08 质量判据的直接来源 |
| compute 里预读 `tokenIndex+N` 的文件 | **34** | R22「禁止看之后」失效 |
| 使用 possible cache 的文件 | **46**（`GetState` 99 / `SetState` 36 / `GetShare` 5 / `SetShare` 3） | cache 在状态机里用对了，但只覆盖少数文件 |
| 无方法体（除构造）的 shape 类 | **330 / 524（63%）** | 形状多是空标记，数据与 AST 都在壳外 |
| 符号级零引用的 shape 主类 | **165 / 461 个文件（36%）** | 死类：没人 `new` 它们（口径：每个文件取首个类，按类名全仓检索，自身文件不计） |
| `Enable*` 开关字段 | **38**（7 个文件） | 解析路径由「谁先跑」决定 |
| 指标计数器类 | 3（`DirectBuildMetrics`、`StatementLegacyMetrics`、`CountShape`） | 设计外可观测点 |
| 围栏外散文（严格按 R01 只豁免 ```txt） | **1** 处（`declaration-asi-boundary` 用了无标注围栏）；若按「围栏内即非散文」则 **0** | R01 基本合规 |
| 审计覆盖面 | **638 / 638 个文件**（脚本核对：每个 `.xl.md` 都出现在某篇的小节标题或表格行里；1 个文件被两篇同时覆盖，已在两篇里互相注明） | 无漏审 |
| 偏离条目总数 | **1 660 条**（其中 381 个文件的小节结论为「偏离」） | 平均每文件 2.6 条 |

### 2.1 偏离编号分布（同一文件对同一编号只计一次，逐文件条目自动汇总）

| 编号 | 含义 | 涉及文件数 |
| --- | --- | --- |
| `X1` | 设计外机制（转发器/扫描器/壳目录/direct session/开关位/计数器/注册表） | **249** |
| `S4` | AST 不由 shape 产出（`ParseFromShape` 缺失，改由 builder/session 直建） | **145** |
| `B1` | 越界未返回 `Nothing`（`ShapeStates` 无 `Nothing`，类型上不可表达） | **120** |
| `C1` | 每轮重扫（不看 cache） | **118** |
| `B4` | 查看 `tokenIndex` 之后（含读未 token 化原文） | **107** |
| `C3` | cache 语义偏离（未用 / 未 reset / 把 share 当 state） | **82** |
| `X2` | legacy/fallback 旁路（整段 raw 重建、整文件回退重解析） | **71** |
| `P3` | build 去向偏离（`return host`、不 `SignOut`/`TryToClose`、挂载关系错） | **68** |
| `U1` | 应消费未消费（build 时没提取字段；AST 阶段回读原文） | **65** |
| `C2` | 能用增量却用全量（整段重建） | **57** |
| `P2` | 候选判定语义偏离（在 `CatalogGuide` 之外先判/僵尸候选） | **55** |
| `B2` | compute/build（或等价的会话）里 `catch` 掉异常 | **51** |
| `S3` | shape 树与 TS AST 不同构 | **42** |
| `P1` | possible 触发时机/来源偏离 | **31** |
| `U4` | basic token 用后未丢弃（`Data` ≠ AST children） | **28** |
| `R1` | 覆盖 `ExitOrPre`（R33 禁止） | **21** |
| `R2` | 覆盖 `ComputePossibleShapes`（R34 禁止） | **17** |
| `P4` | bracket 晋升偏离 | **10** |
| `S1` | basic token 层越权 | **10** |
| `U2` | 该回挂并 `Reclose` 却丢弃 | **6** |
| `S2` | 语法层三件套不成立 | **6** |
| `U3` | 未消费 token 不走 `Reload Message` | **6** |
| `B3` | 跳跃式处理 | **3** |
| `X3` | tsx/JSX 形状存在 | **3** |
| `D1` | 散文 | **1** |

完整的「编号 → 文件清单」见 [`98-deviation-index.md`](98-deviation-index.md)。

## 3. 偏离的九个族

每族给：判据、机制、代表证据、后果。族内文件可按证据索引回查。

### F1 — 形状树不再承载 AST（`S3`/`S4`/`S2`）

**判据**：R18（shape 树与 TS AST 同构）、R20（`Close` 后 `Data` = AST children）、R21（AST 由 `ParseFromShape` 产出）。

**机制**：`ParseFromShape` 全仓只有一个未实现桩（`import-declaration-ast-node.xl.md:28-32`）。524 个 shape 类里 330 个没有任何方法体，节点身份只靠类名；AST 的字段、层级、`Pos/End` 由建造器在外部拼出来。

**证据**：
- 16 个语句壳（`if`/`for`/`while`/`return`/`switch`/`try` …）连 `Kind` 都没有，`Kind` 只在 `statement-shape.xl.md` 上（[`25-statements-small.md`](25-statements-small.md)）。
- `statement-shape-ast.xl.md` 按 `Kind` 整数码逐分支 `new` 节点、子节点数与 AST children 数不一致（[`22-statements-shape-ast-route.md`](22-statements-shape-ast-route.md)）。
- `statement-shape.xl.md:316` 的 `BuildFromShell` 三选一（直建 session / 形状桥 / legacy），**没有一条走 `ParseFromShape`**（[`23-statements-scanner-shape-bracket.md`](23-statements-scanner-shape-bracket.md)）。
- 形状树里出现「占位节点」：`StatementShellCatalog` 以 `IsTriviaToken=true` 混入 `Data`，收口时倒灌 children 再改回 false（[`24-statements-possible-batch.md`](24-statements-possible-batch.md)）。

**后果**：R18 的「同构」只能靠 `StatementShapeAst` 之类的转换器近似，而转换器一旦 `Decline` 就退回 legacy——同构不是结构保证，是运气。

### F2 — 三套并行建树管线（`X2`/`X1`/`C2`）

**判据**：设计里从 token 到 AST 只有一条路：possible 收敛 → `BuildByIndex` 建 shape → `ParseFromShape` 出 AST。

**机制**（三者互不隶属，各自都能独立产出 AST）：
1. **legacy builder**：`StatementBuilder`（2206 行 / 71 方法）、`ExpressionBuilder`（100 806 B / 2231 代码行 / 65 方法 / 124 处 `new XxxShape` / 被 34 个文件 110 处调用 / `ParseFromShape` 0 处）、`TypeBuilder`（93 597 B / 2335 行 / 89 处 `new XxxShape` / 0 处 `ParseFromShape`），收 `Array<Token>` 直接递归下降建节点，随后自己 `TryToClose` 签范围（[`20-statements-builder.md`](20-statements-builder.md)、[`50-expressions-builder.md`](50-expressions-builder.md)、[`40-types-builder.md`](40-types-builder.md)）。
2. **壳目录**：`StatementShellCatalog`、`MemberShellCatalog`、`BodyGuideUtil.MountShell`、四个 `*DeclarationMount`——先建壳、稍后由 legacy 建正品（[`24-statements-possible-batch.md`](24-statements-possible-batch.md)、[`35-declarations-forms.md`](35-declarations-forms.md)、[`33-declarations-rest.md`](33-declarations-rest.md)）。
3. **direct session**：`DirectSession.Ingest/Finish` + `DirectBuildRouter` 工厂表，按 kind 起一个会话吃 token（[`60-direct-engine.md`](60-direct-engine.md)、[`61-direct-sessions.md`](61-direct-sessions.md)、[`62-direct-rest.md`](62-direct-rest.md)）。

**证据（最硬的三处）**：
- `source-file-end-possible-shape.xl.md:247-346`、`:497-1540`：终结候选里 1044 行 `BuildTrailingDeclaration` + `BuildStatementSegments`，零处读已建形状（[`70-files.md`](70-files.md)）。
- `statement-shape.xl.md:487-505`：形状桥 `Decline` 后落 legacy `BuildStatement()`。
- `type-alias-declaration-shape.xl.md:205-212`：`ExitOrPre` 里用 `FinishAt` 结束自己并返回 `Reload`，收口靠 `FromUnits` 把整段 raw 重建成新产品再替换自身（[`31-declarations-shape.md`](31-declarations-shape.md)）。

**后果**：R06/R07「增量是主方案、全量是备选」被反过来——**全量重建是正式出口**，增量只决定「什么时候重来一遍」。同一语义因此有 2–4 份实现（`IsAsiBoundary` 三份、`Chain 判据`两份、`Pos` 三份、`ASI` 两份，且已漂移）。

### F3 — 候选收敛被自造判据取代（`P1`/`P2`/`X1`）

**判据**：R26–R30——淘汰、终结、零候选、多候选、唯一候选五条，必须由 `CatalogGuide` 收敛。

**机制**：`CatalogGuide` 本身是合格的（见 §4），但很多地方在它之外先判一遍「这是什么」：
- `StatementRouteUtil.Decide`：11 族码 + 9 分类码的全函数分流（[`22-statements-shape-ast-route.md`](22-statements-shape-ast-route.md)）；
- `BracketRoleResolver`：18 值角色 + 四态，决定 bracket 装哪个目录，`Deferred`/`Fallback` 直接不装（[`23-statements-scanner-shape-bracket.md`](23-statements-scanner-shape-bracket.md)）；
- `StatementScanner`：三态 `NeedMore/Complete/Mismatch` 扫描器（[`23-statements-scanner-shape-bracket.md`](23-statements-scanner-shape-bracket.md)）；
- `declaration-asi-boundary`：ASI 判界的第二份实现，`ContinuationWords` 4 词 vs `StatementTokenSets.IsExpressionContinuation` ~60 项，已漂移（[`35-declarations-forms.md`](35-declarations-forms.md)）；
- `type-alias-literal-start-possible-shape`：形式上是候选，`Build` 不建任何形状，只换宿主 `CatalogGuide` 并写 `MemberCatalogInstalled` 开关（[`34-declarations-small.md`](34-declarations-small.md)）；
- **运算符解析有 4 套并存**：`ExpressionBuilder.ParseBinaryFrom`、`shape-operator-stack`（shunting-yard 栈机）、`feas-operator-parser`（4 数组 precedence climbing，**未接入**——三个 feas 候选的 `BuildByIndex` 反而 `throw`）、`binary-operator-possible` + `reassociation-possible`；`direct-expression-engine` 是**第 3 份完整的表达式解析器**。漂移可直接核对：**条件表达式优先级在三处是 1 / 2 / 4**（`statement-operator-body.xl.md:194` = 1、`direct-expression-engine.xl.md:102` = 2、`expression-builder.xl.md:352` = 4，而 `operator-table.xl.md:41-43` 根本没有 `?:` 这一级）；`operator-shape-map` 的运算符清单是 `MakeOperatorToken` 的真子集（43 ⊂ 47）（[`50-expressions-builder.md`](50-expressions-builder.md)、[`60-direct-engine.md`](60-direct-engine.md)）。

**后果**：R30 的「唯一候选才问 `IsBuildable`」在语义上被绕过——真正的裁决发生在进入 `CatalogGuide` 之前；同一格出现两个 Accept 时会撞 R27 的抛错，于是又长出「让位启发式」（`source-file-end-possible-shape.xl.md:63-77` 的 `HasDecoratorPrefix`/`HasLabelPrefix`）。更极端的是反向利用：`class-member-catch-all-possible` 刻意恒返回 `Uncertain`，只为**堵住 R28 的零候选抛错出口**（[`41-types-possible.md`](41-types-possible.md)）。

### F4 — bracket 晋升机制整体缺失（`P4`）

**判据**：R13–R16——create 时 install catalog possible；create 时配置 `HandleCloseDispatch`；close 时若它非空则直接晋升、且不再触发原 close 逻辑。

**证据**：
- `HandleCloseDispatch` **全仓 0 处**（`grep` + 机械扫描双重确认）。
- close 侧仍在触发 possible，而且反方向加了一次补判：`bracket.xl.md:85-93` 的 `[B3:FLUSH]`（`FlushOnClose` 默认 false）。
- 晋升改由两条静态钩子完成：`Bracket.ChildBracketCreatedHook`（`:122-130`）与 `BracketRoleHook.Current`（`:163-165`），都是进程级单例（[`11-core-basic-tokens.md`](11-core-basic-tokens.md)）。
- `SourceFileShape.OnBracketCreatedEvent` 自己另造了一个触发点，并把来源标成 `Close`（[`70-files.md`](70-files.md)）。
- 尾部替代品：`WaitingEndPossible`（永不 Accept）顶掉 R27/R28 的抛错出口（[`25-statements-small.md`](25-statements-small.md)）。

**后果**：括号的「创建—收敛—晋升」链条被角色分类器 + 静态钩子 + 补判别取代；R16 的「close 不再触发 possible」变成「close 还会再问一次」。

### F5 — 「禁止覆盖」被普遍违反（`R1`/`R2`）

**判据**：R33（shape 禁止覆盖 `ExitOrPre`）、R34（shape 禁止覆盖 `ComputePossibleShapes`）。

**证据**：24 个文件覆盖 `ExitOrPre`、18 个覆盖 `ComputePossibleShapes`，其中 TS shape 各 16 个。典型：
- `enum-member-shape`、`method-declaration-shape`：两个都覆盖，转给 `MemberShellCatalog`（[`85-members-bindings.md`](85-members-bindings.md)、[`42-types-small.md`](42-types-small.md)）；
- `type-alias-declaration-shape`：`ExitOrPre` 里结束自己 + `ComputePossibleShapes` 里直接返回 `Built`（[`31-declarations-shape.md`](31-declarations-shape.md)）；
- `block-shape`：覆盖 `ComputePossibleShapes` 转调父单元（[`25-statements-small.md`](25-statements-small.md)）；
- `statement-shape`：两个都覆盖，`ExitOrPre` 里建树 + `FinishShell` + `return Reload`（[`23-statements-scanner-shape-bracket.md`](23-statements-scanner-shape-bracket.md)）。

需要注意的边界：`ShapeToken` 基类自己就带一份 `ExitOrPre` 默认实现（`shape-token.xl.md:65-69`），所以「禁止覆盖」在代码里从一开始就没有被当成硬约束；而 basic token（`Bracket`/注释/正则/`String`）覆盖 `ExitOrPre` 不属 R33 的字面范围（R33 只约束 shape），那一类记在 F8。

**后果**：possible 计算与关闭动作被搬进 shape 内部，`CatalogGuide` 失去唯一裁决权。

### F6 — 未消费 token 与 `Data` 清理没有骨架保障（`U1`/`U2`/`U3`/`U4`）

**判据**：R17（四种去向）、R19（build 时提取、用完丢弃）、R20（close 后 `Data` = AST children）、R35（消费即丢）。

**证据**：
- `ShapeToken.Close` 只置 `Closed = true`，不过滤、不丢弃（`shape-token.xl.md:58-63`）→ R20 全靠子类自觉。
- `Reclose` 全仓 **0 个调用点**：R17③ 的「回挂重关」写了但没人用。
- `SourceFileShape.Close` 只过滤 trivia 与 EOF，非 trivia 残留 basic token 不丢不提取（[`70-files.md`](70-files.md)）。
- 「应消费未消费」被降级成计数器：`CountEofLeftover` 只计数不抛错（`source-file-end-possible-shape.xl.md:205-213`），`IncrementalStuckShellRecovery` 在 EOF 只统计残留、不走 `Reload Message`（[`25-statements-small.md`](25-statements-small.md)）。
- `AstOperator` 在 AST 阶段回读源码（`shape-token.xl.md:84-106`）；`ItemUtil.IsCompoundTernaryAhead` 直接扫未 token 化的原文（`item-util.xl.md:90-197`）。

**后果**：R17 的四条去向在实现里退化成「挂载 / 计数 / 重放 / 之后再说」，而「丢弃」只发生在 `Data.splice` 恰好覆盖的地方（236 处 splice 是这一事实的正面：机制存在，但不统一）。

### F7 — 行为规范：越界的类型缺口、catch、预读、重扫（`B1`/`B2`/`B4`/`C1`/`C2`/`C3`）

**`B1` 越界**：R25 要求 `host.Data[tokenIndex]` 不存在时返回 `Nothing`。**类型上不可表达**——候选返回的是 `ShapeStates`，只有 `Reject/Accept/Uncertain`；`Nothing` 只存在于 `ComputePossibleShapesStates`（`shape-states.xl.md:5-7`）。于是所有候选的越界分支只能返回 `Uncertain`（还活着）或 `Reject`（判死），「数据未就绪」与「不匹配」被合并。这一条在 12/12 个声明 possible 上一致复现（[`33-declarations-rest.md`](33-declarations-rest.md)），说明它是**契约缺口**而不是逐个文件写错。

**`B2` catch**：7 个文件在 compute/build 里 `catch`，最重的三处：`source-file-end-possible-shape`（13 处）、`enum-member-possible-shape`（`BuildByIndex` 里 `catch { built = null }`）、`function-declaration-shape`（`TryToClose` 里 `catch {}` 直接吞掉）。

**`B4` 预读**：34 个文件在 compute 里读 `tokenIndex+N`；更硬的是「读未 token 化原文」：`NextChar` 家族（`enum-member-possible`、`statement-scanner`、`import-equals`…）、`SourceRange.Whole(document).At(...)`、`ItemUtil.IsCompoundTernaryAhead`。

**`C1` 重扫**：33 个文件在 compute 里带循环，典型是 `statement-scanner`（每格从 `code[0]` 重扫）、`variable-declaration-end-possible`（`cache`/`source` 形参完全未用，一格内 `ComputeByIndex` 被调 6 次）。

**`C2` 全量**：`class/interface/enum/module` 四个 end possible 收口一律整段 `shell.Data → BuildFromCode/FromUnits` 全量重建（[`34-declarations-small.md`](34-declarations-small.md)）。

**`C3` cache 语义**：多数声明 possible 的 build 后没有 reset（只有 `Checked > tokenIndex+1` 的回退复位），`expression-statement-possible-shape` 的 state 在 build 后不 reset（[`23-statements-scanner-shape-bracket.md`](23-statements-scanner-shape-bracket.md)）。

### F8 — 词法层越权与回溯（`S1`/`X1`）

IMPORTANCE 把 basic token 的职责限定为「把字符串切成词组」（R02–R03）。实际：
- **正则 vs 除号**在 `RegexToken.Transit` 里判，读前两个代码 token + 模板 + `context.RegexStartAfter`（`regex-token.xl.md:127-156`）；
- **注释开头靠回溯**：第二个 `/` 到达时 `unit.Undo(preIndex)` 把已产出的 `/` 抹掉（`line-annotation.xl.md:114-134`），`AreaAnnotation` 用整段 `GetRaw` 一次吞完并直接改 `context.Index`；
- **`\u{…}` 转义**的 `}` 由括号层裁决（`bracket.xl.md:111`、`:138-140`）；
- **字符串层有 5 个 `GuideToken` 子类**（`StringGuide`/`RawQuoteExitGuide`/`InterpolationGuide`/`InterpolationExitGuide`/`VerbatimQuoteGuide`）+ 3 个开关位派生 6 条分支（[`12-core-basic-tokens-string.md`](12-core-basic-tokens-string.md)）；
- **`Common.Transit` 会把前一个已产出的 `Symbol` 替换成 `Common`**（`common.xl.md:534-544`）——词法不再是单向流。

### F9 — 「设计与仓库形态」的空转（`X1`/`X3`）

- **165 个 shape 类符号级零引用**（占 461 个的 36%）：`jsdoc` 42/43、`jsx` 12/12、`synthetic` 7/7、`aliases` 31/32、`trivia` 8/9、`keywords` 44/84、`punctuation` 15/61。
- **`aliases/` 32 个 `First*/Last*Shape` 把 TS 的 `SyntaxKind` 区间哨兵实现成了 shape 类**——区间标量不是 AST 节点，没有 shape 语义（[`83-jsdoc-and-shims.md`](83-jsdoc-and-shims.md)）。
- **14 个 JSX 形状**与 `LessThanSlashTokenShape` 与「不支持 tsx」相悖（`X3`）。
- **38 个 `Enable*` 开关**、3 个指标计数器、若干进程级静态单例（`BracketRoleHook.Current`、`StatementScanner.AtEOF/ContentText`、`DirectBuildRouter.Factories`）——解析结果依赖「谁先跑」。
- `MessageTypes` 只有 `None`，`ReloadMessage.Type` 返回 `None`：消息类型系统空转（[`14-core-misc.md`](14-core-misc.md)）。

## 4. 合规面（不是全灰，这一节必须留住）

| 项 | 证据 |
| --- | --- |
| **R26–R30 五条候选判定**几乎逐字实现 | `catalog-guide.xl.md:66-107`：只对 `Reject` 删候选、`PossibleShapes` 只读、终结候选 `Accept` 且候选非零才抛错、零候选无 end 抛错、多候选 `Waiting`、唯一候选先 `IsBuildable` |
| **R09–R11 cache 语义正确** | `possible-shape-cache.xl.md`：`GetState/SetState` 与 `GetShare/SetShare` 分开，`Clear()` 只清 `Values` 不动 `Share` |
| **增量扫描的正确样板** | `binding-element-possible`、`string-literal-possible`、`enum-member-possible`、`array/object-binding-pattern-possible`：`state.Checked` 只往前推，`ItemStartCached` 复用起点 |
| **R31「立即关闭」的标准写法** | `PropertyAssignmentShape.FromParts`、`ShorthandPropertyAssignmentShape.FromParts`、`SpreadAssignmentShape.FromExpression`、`ImportAttributesShape.FromBracket`（`IMPORTANCE.md:80` 点名的样板）、`IdentifierShape.FromBasicToken`、`NumericLiteralShape.FromBasicToken`、`AbstractKeywordShape.FromBasicToken` |
| **R19 数据提取的正确样板** | `IdentifierShape.AstText` 直接返回 build 时算好的 `EscapedText`，不回读源码 |
| **`Close` 侧过滤并抛错的样板** | `ExportDeclarationShape.Close` 显式过滤、残留 basic token 时 `throw`（[`33-declarations-rest.md`](33-declarations-rest.md)） |
| **R19/R20 全满足的声明 shape** | `VariableDeclarationShape.TryToClose` 先 `FinishIncremental` 取字段、`Data.length = 0` 后只放子形状（[`31-declarations-shape.md`](31-declarations-shape.md)） |
| **R12 逐字口径的样板** | `cjcli.xl.md:55-58`：每字符 `ProcessRange(..., index, index+1)` 后打印 `ToAstLine` |
| **R01 基本合规** | 严格口径只有 1 处无标注围栏；其余 637 个文件围栏外无说明文字 |

## 5. 最要命的十二条（跨文件排序）

排序标准：它一坏，IMPORTANCE 的哪条**结构性承诺**就整体失效。

| # | 偏离 | 判据 | 位置 | 为什么排这么前 |
| --- | --- | --- | --- | --- |
| 1 | `ParseFromShape` 唯一实现是 `throw` | R21 | `import-declaration-ast-node.xl.md:28-32` | 「AST 由关闭后的 shape 产出」在主干上是断的，F1/F2 全部由此派生 |
| 2 | `Reclose` 0 调用 | R17③ | `token.xl.md:75-80` | 「回挂重关」通道写了不用，未消费 token 只能靠重建 |
| 3 | `HandleCloseDispatch` 0 引用 | R15/R16 | `bracket.xl.md:81-103` | bracket 晋升被角色分类器 + 静态钩子取代 |
| 4 | 终结候选把 Accept 下调到语句 ASI 边界 | R27 | `source-file-end-possible-shape.xl.md:63-77` | 终结候选兼当「语句收口器 + EOF 兜底重建器」，1044 行重建旁路由此而来 |
| 5 | 24 个文件覆盖 `ExitOrPre`（其中 16 个 TS shape）/ 18 个覆盖 `ComputePossibleShapes`（16 个 TS shape） | R33/R34 | 见 F5 | 两条明令禁止的覆盖被系统性违反，`CatalogGuide` 失去唯一性 |
| 6 | compute/build 内 `catch` | R23 | 7 个文件（`enum-member`、`source-file-end`、`function-declaration` 等） | 诊断被吞，possible 的错误变成「偶发少建」 |
| 7 | 预读未 token 化原文 | R22 | `item-util:90-197`、`enum-member:80-118`、`statement-scanner:1090-1131` | 违反「之后的数据不一定就绪」的前提，是偶发失败的来源 |
| 8 | 整段 raw 重建作为正式出口；`direct-*` 甚至**抢在 `new StatementBuilder` 之前**（默认路径，不是备选） | R06/R07 | `statement-builder`、`expression-builder`、`type-builder`、`type-alias`、四个 end possible、`direct-*` | 「增量为主」被反转，性能与一致性都随重建次数线性劣化 |
| 9 | `Data` 清理无骨架保障 | R19/R20/R35 | `shape-token.xl.md:58-63` + `source-file-shape.xl.md:122` | 形状树与 AST 的对应关系无法从 `Data` 直接读出 |
| 10 | 越界语义的类型缺口 | R25 | `shape-states.xl.md:5-7` | `Nothing` 不可表达，34 个文件的预读分支与 12/12 声明候选全部退回 `Uncertain` |
| 11 | 进程级开关与静态单例 | 设计外 | 38 个 `Enable*`、`BracketRoleHook.Current`、`StatementScanner.AtEOF`、`DirectBuildRouter.Factories` | 解析结果不可从输入推断，回归只能靠全量门禁 |
| 12 | 165 个符号级零引用的 shape 主类 + 32 个区间哨兵被当 shape + 14 个 JSX | R18/R36 | 见 F9 | 形状目录与真实能力脱节，读者无法从目录判断「什么被支持」 |

## 6. 按 IMPORTANCE 自己的「问题分类」对号入座

IMPORTANCE 末尾把问题预分成七类（`IMPORTANCE.md:98-106`）。本次审计的落点：

| 设计的问题分类 | 本次命中 | 落点 |
| --- | --- | --- |
| basic token 存在问题 | 有（且需用户裁决） | 正则起点、注释回溯、`\u{}` 越界、字符串 GuideToken/开关位（F8） |
| 缺少 possible | 有 | 16 个语句壳无自己的 possible（由 `StatementShellCatalog` 顶替）；`interface-declaration-shape` 的 `CatalogGuide` 为 null，挂壳到 `{` 之间没有候选在跑 |
| 缺少 end | 有 | 只有 15 个 `*EndPossibleShape`；语句层的 end 被 `WaitingEndPossible`（永不 Accept）顶掉 |
| possible compute 不对 | 有 | `B1`（越界语义）、`B4`（预读）、`C1`（每轮重扫）、`P1`（自造触发点） |
| possible build 不对 | 有 | `P3`（`return host` 僵尸候选）、`U1`（splice 换入但不提取字段）、`B2`（catch 吞异常） |
| end compute 不对 | 有 | `source-file-end` 把 Accept 下沉到 ASI 边界；两套根目录按开关切换 |
| end build 不对 | 有 | `BuildTrailingDeclaration` 1044 行整段重建；四个声明族 end 的 `BuildFromCode/FromUnits` |

## 7. 建议（按「先主干、后枝节」）

1. **先把三个空动作接上**：`ParseFromShape`（至少让 `Close` 之后能从 `Data` 走出一份 AST）、`Reclose`（把 R17③ 用在「回挂重关」，替换掉 `[T2:GUARD]` 的静默跳过）、`HandleCloseDispatch`（把 bracket 晋升从静态钩子搬回来）。
2. **把 `Nothing` 补进候选契约**：`ShapeStates` 加 `Nothing`，或在 `CatalogGuide` 里统一把「数据未就绪」与「不匹配」分开——否则 R25 永远不可满足。
3. **收编三套旁路**：legacy builder / 壳目录 / direct session 至少要在代码里标明「哪条是默认路径」，并把同一语义的多份判据（`IsAsiBoundary` 三份、`Pos` 三份、`Chain` 两份）合并成一份。
4. **给 `Data` 清理定一条硬规则**：`Close` 统一过滤 basic token（可照 `ExportDeclarationShape.Close` 的写法），残留即抛错——这样 R20 变成可检查的，而不是靠自觉。
5. **消灭「读原文」入口**：把 `ItemUtil.IsCompoundTernaryAhead`、`NextChar` 家族、`SourceRange.Whole(...).At(...)` 这类「反向 token 化」的入口收进诊断工具，禁止在 compute/build 里调用。
6. **开关与指标从解析路径里移出**：`Enable*` 改为构造参数（一次决定，不在解析期翻转），静态单例改实例字段。
7. **清理死类**：165 个零引用 shape、32 个区间哨兵、14 个 JSX、42 个 JSDoc 节点——要么接上产出路径，要么删掉，否则目录与能力会持续背离。

## 8. 复现方式

- 机械读数：`node docs/importance-1028/_tools/importance-scan.mjs`（重写 `_facts/` 与 `tmp/importance-facts.json`）、`node docs/importance-1028/_tools/aggregate.mjs`、`node docs/importance-1028/_tools/cross-stats.mjs`、`node docs/importance-1028/_tools/refs.mjs <目录>`、`node docs/importance-1028/_tools/zero-all.mjs`。
- 逐篇统计汇总：`node docs/importance-1028/_tools/summary-counts.mjs`（读 35 篇的「本批统计」行）。
- 编号索引：`node docs/importance-1028/_tools/deviation-index.mjs` → `98-deviation-index.md`。
- 覆盖面自检：`node docs/importance-1028/_tools/verify-coverage.mjs`（应为 638/638、0 漏）。
- 所有结论的行号以 `read` 工具返回的行号为准；`tests/gates` 按要求未运行。
