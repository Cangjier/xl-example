# 21 语句：操作符体与边界判定（审计）

审计对象：`typescript/tokens/statements/statement-operator-body.xl.md`、`typescript/tokens/statements/statement-boundary-util.xl.md`。判据见 [01-rules.md](01-rules.md)，行号以 `read` 返回值为准。

### typescript/tokens/statements/statement-operator-body.xl.md（71574B / 2125 行；StatementOperandShape、StatementOperatorBody）

- 结构：shape 层 + 手写解析器。`StatementOperandShape extends ShapeToken` 承载 Kind 标记与子节点（`Data` 里只有形状），`StatementOperatorBody` 是驱动它的逐单元状态机（`Expect` 状态 + 运算符栈），二者都不是 possible 或 end；文件不定义 basic token。
- 偏离：
  - `[S4]` ● 最终 AST 不由关闭后的 shape 产出，shape 只留 `Kind` 标记与一段可渲染文本，`<` 之后仍交回 legacy 表达式构造器建树 — 证据 `statement-operator-body.xl.md:259`（「AST 由收口器把 `<` 之后交给 legacy `ExpressionBuilder.ParsePostfixSuffix`」）、`:293`（`const text = this.Text(); ... this.Publish(text);`）、`:1468`（`return StatementOperatorBody.Render(this.Root.Data[0]);`）；收口侧确实是 `new BinaryExpressionShape(...)` 直建（`statement-shape-ast.xl.md:378-402`）。
  - `[X2]` ● 状态机判不出就 `Fail` 并整条退回 legacy 重建，属整段旁路而非形状增量收敛 — 证据 `statement-operator-body.xl.md:534`（`this.Fail(text === "" ? "单元" : "操作数 " + text)`）、`:675`（`this.Fail(... "运算符 " + text)`）、`:260`（`判否就保持原样…保守方向不变：少接管一条，legacy 仍对`）、`:736-743`（括号内容判不完整就只留一个 `params` 空壳，交回 legacy 箭头分支）。
  - `[S2]` ● 操作符体这一层只有 shape，没有对应的 possible 候选与 end 终结候选，也没有 catalog guide：形状由状态机直接 `Add` / 插入 — 证据 `statement-operator-body.xl.md:234-251`（`IngestAll` 逐单元 `this.Ingest(units[at], template)`）、`:977`（`this.Top().Add(shape)`）、`:1014`（`ShapeInsertUtil.InsertBetween(parent, child, shape)`）。
  - `[X1]` ● 自造 Pratt 解析器（期望状态机 + 优先级栈 + 右结合判定 + 待定帧），IMPORTANCE 的三层机制里没有这一层 — 证据 `statement-operator-body.xl.md:178-192`（`ExpectOperand/ExpectOperator/ExpectName/…/ExpectPrivateName` 八态）、`:995-1021`（`PushOperator` 按 `FramePrecs` 弹栈、压帧、置 `FramePending`）。
  - `[X1]` ● 设计外的族码、计数器与跨实例发布槽：34 个 `Kind` 族码、`TotalBodies/TotalInserts/TotalIncomplete` 指标、`ShapeTexts/Slot/LastText/LastComplete` 全局发布通道 — 证据 `statement-operator-body.xl.md:30-110`（`KindHolder`…`KindYield`）、`:196-206`（`TotalBodies/TotalInserts/TotalIncomplete/ShapeTexts/LastText/LastComplete`）、`:368-377`（`this.Slot = StatementOperatorBody.ShapeTexts.length; … ShapeTexts[this.Slot] = text`）、`:1333-1338`（`TotalIncomplete++` 并回退发布槽）。
  - `[C2]` ● 判定失败时整体重置再从 0 重放到 `<`（整段重放），类型实参判据也用全数组扫描而非增量收敛 — 证据 `statement-operator-body.xl.md:1430-1437`（`this.ResetState(); if (!this.ReplayUntil(tailIndex, template))`）、`:1951-1957`（每次调用重建 `code` 数组）、`:1882`（`for (let index = at + 1; index < units.length; index++)`）、`:1819`（`for (let scan = at + 1; scan < units.length; scan++)`）。
  - `[B4]` ● 读到了尚未消费的尾部单元：`IngestAll` 收下调用方的**全部** raw 单元再整段判，`<` 那一格就用整条 `Units` 判类型实参 — 证据 `statement-operator-body.xl.md:237`（`this.Units = units;`）、`:255-256`（`this.SawLessThan && … && StatementOperatorBody.HasTypeArgumentCall(this.Units)`）、`:266`（同一判据再问一次）、`:282-284`（`Finish` 里 `this.TryTypeArgumentTail(this.Template)`）；喂入点即全量 raw（`statement-shape.xl.md:247` `shadow.IngestAll(this.Data, …)`，其 `:241-243` 自述 `Data` 末尾还躺着未喂给主状态机的新单元）。
  - `[U4]` ○ build 后 basic token 未丢弃：`Raw` / `Args` / `Colon` / `TailEnd` 以字段形式长期持有整颗 token（`Data` 本身只含形状，故不判 `●`） — 证据 `statement-operator-body.xl.md:34-40`（`Raw:Token | null`、`Args:Token | null`、`Colon:Token | null`、`TailEnd:Token | null`）、`:686`（`keyword.Raw = unit`）、`:926`（`shape.Raw = bracket`）、`:440`（`(last as StatementOperandShape).TailEnd = unit`）。
  - `[C1]` ○ 无任何 cache，同一判断每轮从头扫：每次 `Ingest` 到 `<`、每次 `Finish` 都重新滤 trivia 建 `code` 数组并重扫 — 证据 `statement-operator-body.xl.md:1399-1405`（`for (let index = 0; index < units.length; index++)`）、`:1952-1957`、`:1966`（每次重新跑 `AmbiguousTypeArguments(code, index) && AngleJudge.CanStart(code, index)`）。
- 结论：偏离（9 条）。

### typescript/tokens/statements/statement-boundary-util.xl.md（54832B / 1441 行；StatementBoundaryUtil）

- 结构：工具类。全部为 `static` 谓词与「终点码」计算（ASI 边界、声明尾巴、族分类、各语句族的收口位置），供 end 候选与 builder 调用；文件内无 shape/possible/end 类，无状态字段。
- 偏离：
  - `[X1]` ● 用一套族码分派表 + 终点码表决定「语句到哪一格结束」，把 end 候选的收敛替换成静态查表（`Short/Yield/Await/ControlFlow` 四族 + 每族的 `…EndCode`） — 证据 `statement-boundary-util.xl.md:884-944`（`IsShortFamilyCode` / `ShortFamilyEndCode` 的 `return/throw/break/continue/let|const|var` 分派）、`:1162-1243`（`IsControlFlowFamilyCode` / `ControlFlowFamilyEndCode`）、`:623-686`（`StatementEndCode` 依次问 `IsSemicolon`/`IsAsiBoundary`/`IsInstantiationTailAsiBoundary`/`IsDeclarationFollowBoundary`/`IsTypeAliasLineBreakCut` 抢答）。
  - `[X1]` ● `IsInstantiationTailAsiBoundary` 是 `IsAsiBoundary` 的逐行副本且已与本体漂移（副本缺 `++`/`--` 与闭合 `{}` 两支），同一判据存在两份实现 — 证据 `statement-boundary-util.xl.md:265-344`（与 `:83-164` 逐条对应）、`:335-336`（自称「仍按同一顺序问一次」）、`:51-56` 与 `:64-65` 的本体分支在副本中不存在。
  - `[C2]` ● 判界靠整段线性扫描而非候选收敛：`ScanToSemicolonIncremental` 从 `from` 一路扫到 `code.length`，`IsAsiBoundary` 先回走到段首再前探，类型别名分支把 `head..units.length` 全部代码单元装进数组 — 证据 `statement-boundary-util.xl.md:1030-1068`（`for (let at = from; at < code.length; at++)`）、`:89-96`（`let head = prev; while (head > lowerBound && units[head - 1].IsBasicToken) head--;`）、`:149-157`（`for (let at = head; at < units.length; at++) headCode.push(units[at])`）。
  - `[B4]` ● 判界读取 `tokenIndex` 之后的位置：类型别名分支扫到 `units.length`；`NextChar`/`NextWord` 直接读当前 token 结束位置之后的原文（尚未变成 token 的数据）；`IsLateAtEof` 读 `tokenIndex` 后一个字符判 EOF — 证据 `statement-boundary-util.xl.md:151`（`for (let at = head; at < units.length; at++)`）、`:902`（`StatementScanner.NextWord(head.SourceRange.Document, head.SourceRange.EndIndex)`）、`:1205`（`NextChar(head.SourceRange.Document, head.SourceRange.EndIndex)`）、`:1438-1440`（`const end = units[tokenIndex].SourceRange.EndIndex; … NextChar(…, end) === ""`）。
  - `[C1]` ● 每轮重新查找、无 cache：一次 `StatementEndCode` 内连问四个判据，每个判据都各自从段首/当前位置重扫一遍，文件里没有任何 state/share 复用 — 证据 `statement-boundary-util.xl.md:651-653`（连续 `IsAsiBoundary(units, lastAt) || IsInstantiationTailAsiBoundary(units, lastAt)`，两遍同形扫描）、`:664`（`IsDeclarationFollowBoundary(units, lastAt)` 再回走一次）、`:676`（`IsTypeAliasLineBreakCut` 第三次装 `code` 数组）、`:770-774` 与 `:800-803`（为同一判定各自重建 `code`）。
  - `[B1]` ○ 越界不设防：`EndsAtLineBreak` 直接下标取 `code[previousIndex]` / `code[nextIndex]`，正确性完全依赖调用方先判长度，函数自身不返回安全值 — 证据 `statement-boundary-util.xl.md:350-351`（`const previous = code[previousIndex]; const next = code[nextIndex];`）、`:977` 与 `:1015`（调用方先做 `>= code.length` 守卫）；其余公开入口（`:25-27`、`:234-236`、`:420-422`、`:1434-1436`）都返回 `false`，未踩 `●`。
  - `[X1]` ○ 设计外的开关与调用方约定：`limit`（段首必须由调用方传入，否则回走会越过语句边界）、`declarationShell`、`decorated`、`atEof` 一路透传，构成三组分支行为 — 证据 `statement-boundary-util.xl.md:22`（`limit?:int`）、`:87-89`（`limit 是「本条语句所在段的起点」：… 调用方必须传段首`）、`:52`（`operatorStart < (limit ?? 0)`）、`:623`（`declarationShell?:bool`）、`:642`/`:664`/`:676` 三处 `declarationShell === true` 分支、`:835`（`decorated?:bool`）、`:849-851`。
- 结论：偏离（7 条）。

## 本批统计

- 文件数：2；有偏离文件数：2。
- 按编号计数（共 16 条）：`X1` 5（●4/○1）、`S4` 1、`S2` 1、`X2` 1、`C1` 2（●1/○1）、`C2` 2、`B4` 2、`U4` 1、`B1` 1；`B2`/`B3`/`P1`/`P2`/`P3`/`R1`/`R2`/`X3`/`D1` 均未出现（两文件无 `try/catch`、无 `ExitOrPre`/`ComputePossibleShapes` 覆盖、无 tsx、围栏外无散文；跳跃只跳过 trivia）。
- 最严重 3 条：
  1. `[S4]` ●（`statement-operator-body.xl.md`）shape 只留 Kind 标记与可渲染文本，AST 由收口器 + legacy `ExpressionBuilder` 直建，逐字 AST 的增量可验证链被整段旁路。
  2. `[S2]` ●（`statement-operator-body.xl.md`）操作符体这一层只有 shape，没有 possible/end/catalog guide，候选收敛被自制状态机取代。
  3. `[X1]` ●（`statement-boundary-util.xl.md`）族码表 + 终点码表成为 end 候选的实际判据，且 `IsInstantiationTailAsiBoundary` 副本已与 `IsAsiBoundary` 本体漂移，同一语义存在两份可分歧实现。
