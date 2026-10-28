# 60 设计偏离审计 — typescript/tokens/direct/direct-expression-engine.xl.md

审计对象为本批 1 个文件；判据取自 `01-rules.md`（R01–R36，编号 `S1…D1`），事实表取自 `_facts/typescript-tokens-direct.md`，行号为 `read` 返回的真实行号（全文 **2714 行**，已读到物理末行 `2714`；事实表的「代码行 2173」是代码行口径，不含空行与围栏外内容）。只读源码，未改任何源码与 `docs/IMPORTANCE.md`。

### typescript/tokens/direct/direct-expression-engine.xl.md（101545B / 2173 代码行（全文 2714 行）；DirectExpressionEngine）

- 结构：**会话层之下的「表达式引擎」**——不是 basic token、不继承 `ShapeToken`、不实现 `PossibleShape`、没有 `end`。`# class DirectExpressionEngine`（`:68`）是一个 2173 行代码的**流式表达式状态机**：`IngestAll`（`:219`）按 `Ingested` 游标逐格喂 `IngestUnit`（`:241`），`IngestCode`（`:257`）先分流 7 个「挂起位」再分「等操作数 / 等运算符」两态（`Expect`，`:128`）；运算符用**四个平行数组**（`Frames`/`FramePrecs`/`FrameStages`/`FramePending`，`:116-122`）做优先级栈，节点由引擎 `new XxxShape` + `Add` 当场拼、`TryToClose` 当场关。全文 `ParseFromShape` **0** 处、`GetRaw` **0** 处、`Scan*` **0** 处、`ComputeByIndex`/`BuildByIndex`/`tokenIndex`/`PossibleShape`/`CatalogGuide`/`GetState`/`SetState`/`Share` 各 **0** 处；`new XxxShape(` **37** 处（31 个不同形状类）、`new DirectExpressionEngine(` **3** 处（自嵌套）、`TryToClose(` **24** 处、`this.Fail(` **80** 处、`catch` **3** 处。它是 `direct-*` 这条「新路径优先、失败再 legacy」管线在**表达式位置**的唯一建树者（`typescript/tokens/statements/statement-shape.xl.md:346-353`）。

- 偏离：

  - `[S2]` ● 三件套不成立：本类不 import 也不实现 `PossibleShape`/`CatalogGuide`，无 `ComputeByIndex`/`IsBuildable`/`BuildByIndex`、无 `tokenIndex` 形参（全 0），入口是 `IngestAll`/`IngestUnit`/`Finish` 三个自造方法 — 证据 `direct-expression-engine.xl.md:219`（`## method IngestAll:(units:Array<Token>)=>void`）、`:241`（`## method IngestUnit:(unit:Token, pos:int)=>void`）、`:352`（`## method Finish:()=>Token | null`）

  - `[X1]` ● 顶层容器是一个**裸 `ShapeToken` 当 holder**：`Root` 不是 AST 节点，只是把顶层操作数 / 括号 / 二元 frame 挂在一起，`Finish` 再返回它唯一的子节点 — 证据 `:214-215`（`// `Root` 是**容器**（holder）：顶层操作数、括号、二元 frame 都挂在它下面；` / `this.Root = new ShapeToken(template);`）、`:442-446`（`if (this.Root === null || this.Root.Data.length !== 1) { ... return this.Root.Data[0];`）
  - `[X1]` ● 运算符栈是设计外的自造状态机：四个**平行数组**当栈（`Frames`/`FramePrecs`/`FrameStages`/`FramePending`），配 4 个自造阶段常量 `StageDone/StageOperand/StageColon/StageFalse`（`88-94`）与 2 个期望态 `ExpectOperand/ExpectOperator`（`84-86`） — 证据 `:116-122`（`## field Frames:Array<Token> = []` / `## field FramePrecs:Array<int> = []` / `## field FrameStages:Array<int> = []` / `## field FramePending:Array<bool> = []`）、`:1820-1823`（`this.Frames.push(shape); this.FramePrecs.push(precedence); this.FrameStages.push(DirectExpressionEngine.StageOperand); this.FramePending.push(true);`）
  - `[X1]` ● 「无前瞻」是靠 **7 个挂起位 + 下一格重放**实现的，等于把前瞻改成跨格暂停：`PostfixWait`(`150`)、`AsPending`(`156`)、`ParamWait`(`170`)、`ArrowPending`(`176`)、`AsyncPending`(`180`)、`AngleWaitUnit`(`190`)、`ClassPending`(`194`) — 证据 `:264-293`（`if (this.ParamWait) { this.IngestAfterParams(unit, pos); return; }` 起连续 6 个 `return` 型分流）、`:277-280`（`if (this.AngleWaitUnit !== null) { this.IngestAfterAngleWait(unit, pos); return; }`）
  - `[C3]` ● cache 语义完全未落地：`GetState`/`SetState`/`GetShare`/`SetShare` 各 0 次，全部中间态存在自己的 **52 个实例字段**里（其中 4 个平行栈数组 + `Inserts` 计数器 `:134`），既不是 possible 的 `state` 也不是 `share`，也没有「build 后 reset」的口径 — 证据 `:104-206`（52 个 `## field` 连续声明）、`:134`（`## field Inserts:int = 0`，只增不减）

#### 量化事实（逐项 grep 复核，与 `_facts` 表一致）

| 指标 | 值 | 说明 |
| --- | --- | --- |
| 规模 | 1 类 / 62 字段（10 `static` 常量 + 52 实例）/ 1 构造 / **66** 方法 / 2173 代码行 | 单类承担表达式的全部形态与优先级 |
| `new XxxShape(` | **37** 处 | 31 个不同形状类；`CallExpression`/`ElementAccess`/`PropertyAccess`/`Arrow`/`Parameter`/`AsyncKeyword` 各 2 次 |
| `new DirectExpressionEngine(` | **3** 处 | `875`（括号内）、`1256`（值位切片）、`2593`（箭头体）——每进一层就新起一台引擎 |
| `new TypeBuilder(` | **1** 处 | `1991`：`as` 之后的类型交给另一套解析器 |
| `.slice(` | **8** 处 | `956` `972` `1049` `1149` `1160` `1309`（切给 `BuildSlice`）、`2017-2018`（`as` 类型未读完的余量重放） |
| `.splice(` | **1** 处 | `1167`：把 `=` 的运算符形状**插入** `shorthand.Data`（插入，不是丢弃） |
| `TryToClose(` | **24** 处 | 关闭权全在引擎一侧 |
| `.SignIn(` / `.SignOut(` | **25** / **21** 处 | 区间由引擎逐节点手签 |
| `.Pos = ` | **48** 处 | Pos 由「首个 = `BasePos`、其后 = 上一代码单元 `EndIndex`」自己推（`232-235`） |
| `this.Fail(` | **80** 处 | 失败一律降级为「置位 + 记原因」，不抛（`:449-459`） |
| `catch` | **3** 处 | `833` `842` `1996`，全部吞成 `Fail` |
| `ParseFromShape` / `GetRaw` / `Scan*` | **0** / **0** / **0** | R21、R19 的产出与回读通道均不经过本层 |
| `PossibleShape` / `ComputeByIndex` / `BuildByIndex` / `tokenIndex` / cache 四式 / `ExitOrPre` / `ComputePossibleShapes` | 全 **0** | 三件套与 cache 在本层完全缺席 |
| `MountedUnit` | **2** 处 | `2315-2316`：只做「把父容器的挂载点从被顶替的 `<` frame 换成实例化表达式」的**转交** |
| `while (` / `for (` | **19** / **15** 处 | 括号内容、逗号切段、`bracket.Data` 全扫循环 |
| `DirectBuildMetrics.*` | **7** 处 | 6 处 `Trace` + 1 处 `NoteDecline`（`1185`） |

#### 建树（AST 由引擎直接建）

  - `[S4]` ● AST 不由关闭后的 shape 产出：全文 **0** 处 `ParseFromShape`，**37** 处 `new XxxShape` 直接建节点并 `Add` 子节点，节点身份、父子顺序、区间全由引擎决定 — 证据 `:1816-1818`（`const shape = new BinaryExpressionShape(this.Template); ShapeInsertUtil.InsertBetween(parent, child, shape); shape.Add(DirectTokenUtil.OperatorToken(unit, pos, this.Template, this.Context));`）、`:1003`（`const shape = new ObjectLiteralExpressionShape(this.Template);`）、`:2449`（`const arrow = new ArrowFunctionShape(this.Template);`）
  - `[S4]` ● 关闭权内联在引擎：唯一通用收口函数 `SpanFromTo` 自己 `SignIn`/`SignOut`/`TryToClose`，栈顶出栈时 `CompleteTop` 再补一次「封终点 + 关闭」 — 证据 `:485-497`（`if (shape.SourceRange.StartIndex < 0 && first.SourceRange.StartIndex >= 0) { shape.SignIn(...); } ... shape.TryToClose(this.Context);`）、`:2142-2150`（`if (frame.SourceRange.EndIndex < 0 && frame.Data.length > 0) { const last = frame.Data[frame.Data.length - 1]; ... frame.SignOut(last.SourceRange.EndIndex); } if (frame.SourceRange.EndIndex >= 0) { frame.TryToClose(this.Context); }`）
  - `[S4]` ● 「挂载」被自造的 `PendingOperand` + `AttachOperand` 取代：操作数先停在引擎字段里，再由 `AttachOperand` 决定挂进栈顶 frame 还是 holder，`host.MountedUnit` 全程不参与 — 证据 `:2095-2125`（`if (stage === DirectExpressionEngine.StageOperand || stage === DirectExpressionEngine.StageFalse) { const frame = ...; frame.Add(operand); ... }` / `top.Add(operand);`）、`:473-478`（`this.PendingOperand = operand; this.Expect = DirectExpressionEngine.ExpectOperator;`）
  - `[P3]` ○ 自造「替换已挂载单元」一步，设计里没有对应动作：`a<b>` 后面跟 `as` 时把 `<` 那个二元 frame 出栈、用 `ExpressionWithTypeArguments` **原地顶替**它在父容器里的位置，并把父容器的 `MountedUnit` 一起改指 — 证据 `:2311-2317`（`const at = parent.Data.length - 1; parent.Data[at] = instantiation; instantiation.Parent = parent; ... if (parent.MountedUnit === frame) { parent.MountedUnit = instantiation; }`）
  - `[S3]` 合规 — 树的形态与 TS children 同口径：运算符 token 在该进 `Data` 的节点里做子节点（`1818`/`1854`/`1884`/`2556`），在 TS 不列运算符的节点里只落字段（`(prefix as any).OperatorToken = unit`，`:632`；`:657`/`:677`/`:2048` 同款）；`Root` 是 holder 但在 `Finish` 里被剥掉（`:442-446`），未见壳类残留进树。

#### 读取范围（沿 tokenIndex 的等价物：整段 bracket.Data）

  - `[C2]` ● 每个**值位**都整段重建：`BuildSlice` 把一段子单元当成完整表达式**新开一台引擎**再从头喂一遍，10 个调用点覆盖数组元素 / 数组展开 / 对象属性值 / 对象属性默认值 / 对象展开 / 计算属性名 / 调用实参 / 模板插值 / 下标 / 可选链下标 — 证据 `:1249-1257`（`// 把一段**子单元**当成一个完整表达式来建：新开一层引擎，`IngestAll` 吃完 ...` / `const inner = new DirectExpressionEngine(this.Template, this.Context, basePos); inner.IngestAll(units);`）、调用点 `:956` `:972` `:1049` `:1149` `:1160` `:1200` `:1309` `:1367` `:1631` `:1691`
  - `[C2]` ● 括号与箭头体同样整段重来：`IngestParen` 把 `bracket.Data`（已闭合括号的全部单元）一次喂给新引擎，箭头体则把之后**每一格**转给子引擎自己重跑同一套规则 — 证据 `:875-878`（`const inner = new DirectExpressionEngine(this.Template, this.Context, base); ... inner.IngestAll(bracket.Data);`）、`:2593-2596`（`this.ArrowBody = new DirectExpressionEngine(this.Template, this.Context, pos); ... bodyEngine.IngestUnit(unit, pos);`）
  - `[C2]` ● 容器成员按逗号二次切段后再逐段建：数组 / 对象 / 实参表各自用「找下一个顶层逗号」的内层循环切出 `[at, end)`，再交给 `BuildSlice` 或 `DirectObjectMemberAssembly.MemberFrom` — 证据 `:947-953`（`while (end < data.length) { const scan = data[end]; if (!scan.IsTriviaToken && DirectTokenUtil.TextOf(scan) === ",") { break; } end += 1; }`，同款 `:1018-1024`、`:1298-1304`）、`:1121-1122`（`DirectObjectMemberAssembly.MemberFrom(data, from, to, nameIndex, accessorKind, ...)`）
  - `[B4]` ○ 本层无 `tokenIndex`，等价形态是「在某一格就全扫完整个 `bracket.Data`」：判断 `(` 有没有可能是箭头参数表时把括号里**所有**单元遍历一遍；建箭头块体时再遍历一遍；`IngestAll` 一开始就把整个 `units` 收进 `this.Units` — 证据 `:2174-2189`（`for (const unit of bracket.Data) { if (unit.IsTriviaToken) { continue; } if (unit instanceof Common) { if ((unit as Common).CanStartNumber()) { return false; } continue; } ... return false; }`）、`:2679-2700`（`for (const unit of bracket.Data) { ... }`）、`:225-226`（`this.Units = units; while (this.Ingested < units.length && !this.Declined && !this.Held && !this.LayerEnded) {`）
  - `[B4]` ○ 同一处还读「已经建好的后续子节点」当判据：`TryInstantiationExpression` 直接检查 `frame.Data[0..2]` 的类型与 `>` 的跨度来认实例化表达式，而不是看尚未到达的单元 — 证据 `:2254-2272`（`if (frame.Data.length !== 3) { return false; } ... const name = frame.Data[0]; if (!(name instanceof IdentifierShape) && !(name instanceof PropertyAccessExpressionShape) ...`）
  - `[C1]` ○ 每轮重扫且无任何缓存复用：19 个 `while` + 15 个 `for`，`CouldBeArrowParameters` 与 `BuildArrowBlock` 每次调用都从 `bracket.Data[0]` 重扫，`IngestColon` 每次从栈顶往回线性找条件 frame，`Finish`/`IsComplete` 每次都遍历整栈 — 证据 `:1870-1875`（`for (let index = this.Frames.length - 1; index >= 0; index--) { if (this.FrameStages[index] === DirectExpressionEngine.StageColon) { target = index; break; } }`）、`:341-345`（`for (const stage of this.FrameStages) { if (stage !== DirectExpressionEngine.StageDone) { return false; } }`）
  - `[B3]` 合规 — 没有跳过未消费单元：每格要么被 `IngestOperand`/`IngestOperator` 消费，要么 `Hold()` 停层（`:1540`/`:1551`），要么整段进缓冲（`AsUnits`，`:1949-1950`）；`FlushAs` 之后余量按**原顺序**重放（`:2015-2021`）
  - `[B1]` 合规 — 下标都有守卫：取父容器最后一个子节点前先查 `parent.Data.length === 0`（`:1802`）、取 `frame.Data[i]` 前先查 `frame.Data.length !== 3`（`:2254`）、切段循环都带 `at/end/cursor < to` 或 `< data.length`（`:1004`、`:1094-1097`、`:1287`）

#### 异常（不抛，只置位）

  - `[B2]` ● 三处 `catch` 全部吞掉异常并转成 `Fail`，其中 `as` 类型那一处连 `error` 都不读 — 证据 `:1994-1998`（`try { type = builder.ParseType(); } catch (error) { type = null; }`）、`:831-837`（`try { clauses = HeritageClauseShape.BuildClauses(...); } catch (error) { const message = ...; this.Fail("类表达式的继承子句无法解析: " + message); return; }`）、`:840-846`（同款，成员体）
  - `[X1]` ● 异常通道被**结构性取消**：`Fail` 明确只置 `Declined`/`Reason` 并写一条 metric，注释自陈「**不抛**；strict 由 session 在 Decline 时统一处理」，于是 80 处 `this.Fail` 全部是「返回空」而非错误传播，诊断信息只剩字符串 `Reason` — 证据 `:451-458`（`// 显式 Decline（范围外构造 / 不完整）：只置位 + 记原因，**不抛**；strict 由 session 在 Decline 时统一处理。` / `this.Declined = true; this.Reason = reason; DirectBuildMetrics.Trace("engine-decline: " + reason);`）

#### 设计外机制

  - `[X2]` ● 本层是**默认路径**而不是备选：`statement-shape` 在 `new StatementBuilder` **之前**就把收口交给直建会话，直建成功时 builder 一次都不建；引擎由 4 个文件、6 处构造（本文件 3 处自嵌套 + `direct-expression-session.xl.md:208`、`direct-statement-assembly.xl.md:193`、`direct-variable-session.xl.md:290`） — 证据 `typescript/tokens/statements/statement-shape.xl.md:346-350`（`// H2（CONTRACT §4.1）：直建的唯一收口点。session 已把 AST 形状树建好时，在 `new StatementBuilder` **之前**直接交回 ... if (direct !== null && !direct.Declined) {`）、`:349`（`所以只需要这一个分支。直建成功时 builder 一次都不创建（验收口径 A6：builder.Load 调用数 == 0）。`）、`typescript/tokens/direct/direct-build-router.xl.md:46`（`const session = new (factory as any)(shell.Template, context, (shell as ShapeToken).Pos, shell) as DirectSession;`）
  - `[X2]` ● 失败即整段回落另一条管线：引擎每次 `Fail` 都由会话记成 `expr.decline`/`expr.stopped`，旧路径用 `ExpressionBuilder` + `StatementBuilder.BuildBlock` 重建同一段 raw，注释把这条兜底写成显式纪律 — 证据 `typescript/tokens/direct/direct-expression-session.xl.md:281-285`（`// 没有恢复切点（准入 / 否决任一不成立）⇒ 逐字节保持 R1–R6 的行为：`expr.stopped` 的 Decline，旧路径接管建树。` / `this.Decline("语句内出现无法接续的单元 idx=" ...);`）、`:2676`（`// 按「本引擎不代建」的纪律 Decline（Fail + null），由上层换 `ExpressionBuilder` + `StatementBuilder.BuildBlock` 的 raw 分支去建`）
  - `[X1]` ● 指标与追踪通道：6 处 `Trace`（含把 `owner=Holder`/`parent.constructor.name` 拼进 trace 行）+ 1 处 `NoteDecline`，全部落在 `DirectBuildMetrics` 的静态计数器上 — 证据 `:1825`（`DirectBuildMetrics.Trace("insert(" + text + ") prec" + precedence + " owner=" + (parent === this.Root ? "Holder" : parent.constructor.name));`）、`:1185`（`DirectBuildMetrics.NoteDecline(reason, "expr.member");`）、`:2320`（`DirectBuildMetrics.Trace("instantiation-expr: <...> + " + DirectTokenUtil.TextOf(gtUnit));`）
  - `[X1]` ● 树中间插入包装节点：`ShapeInsertUtil.InsertBetween` 直接改 `parent.Data`（`splice` 掉原 child、塞进 wrapper、再 `wrapper.Add(child)`）并同步 `parent.MountedUnit`，被引擎用于二元 / 条件 / `as` 三个新节点 — 证据 `:1817`（`ShapeInsertUtil.InsertBetween(parent, child, shape);`）、`:1853`、`:1926`；实现见 `typescript/tokens/shape-insert-util.xl.md:32-39`（`parent.Data.splice(index, 1); wrapper.Parent = parent; parent.Data.splice(index, 0, wrapper); wrapper.Add(child); if (parent.MountedUnit === child) { parent.MountedUnit = wrapper; wrapper.MountedUnit = child; }`）；全仓 16 处调用点：本层 3 处、`StatementOperatorBody` 12 处、`feas-operator-parser` 1 处
  - `[X1]` ● 在形状实例上打**动态标记字段**当跨格信使：`OperatorToken`（一元 / 后缀 / await / 关键字前缀）与 `DirectNewWithArgs`（区分 `new X()` 与 `new X()()`）都是 `as any` 现挂，随后按字段值改判 — 证据 `:742`（`(shape as any).DirectNewWithArgs = true;`）、`:1672-1674`（`if ((operand as any).DirectNewWithArgs === true) { this.Fail("new 表达式之后的调用不在本轮范围"); return; }`）、`:632`（`(prefix as any).OperatorToken = unit;`）
  - `[X1]` ● 一个父可写、子只读的**开关位**：`AllowClass` 默认 `true`，只有父引擎把括号内子引擎置 `false`（`(class {})` 留待后续轮次），开关在 `IngestOperand` 里直接决定建不建类表达式 — 证据 `:206`（`## field AllowClass:bool = true`）、`:877`（`inner.AllowClass = false;`）、`:519-523`（`if (text === "class") { if (!this.AllowClass) { this.Fail("括号内的类表达式留 R8"); return; }`）
  - `[X1]` ○ 自定两处运算符语义而不回写共用表：条件表达式优先级写死 `CondPrecedence = 2`（`OperatorTable` 里没有 `?:` 这一级），右结合判定自行拼成「`**` 或赋值」而不直接用 `IsRightAssociative` — 证据 `:102`（`## static field CondPrecedence:int = 2`）、`:1745`（`return OperatorTable.IsRightAssociative(text) || OperatorTable.IsAssignmentOperator(text);`）、对照 `typescript/tokens/expressions/operator-table.xl.md:50`（`return text === "**";`）
  - `[X1]` ○ 鸭子类型判据：箭头块体里靠「有数值型 `Kind` 字段」识别未收口的语句壳，而不是类型判断 — 证据 `:2687-2691`（`// 未收口的语句壳（`StatementShape` 有 `Kind`，其它形状没有）：与 `BuiltChildren` 同一条判据。` / `if (typeof (unit as any).Kind === "number") { this.Fail("箭头块体内还有未收口的语句"); return null; }`）

#### 与其它层的关系（第 3 份表达式实现）

- 就「把一段 raw 单元变成**完整表达式子树**」这一件事，本仓库有 **3 份**实现，本文件是第 3 份，与第 1、2 份**并列**（不是包装关系，前两份也未被移除）；更细一层的「运算符归约」另有 4 套并存（见第 50 篇 `50-expressions-builder.md:199`，含本层与 `StatementOperatorBody` 的栈机）：

| # | 实现 | 形态 | 调用面 |
| --- | --- | --- | --- |
| 1 | `ExpressionBuilder`（`typescript/tokens/expressions/expression-builder.xl.md`，见第 50 篇） | 递归下降，吃 `Array<Token>` 后从 `At=0` 整段重跑 | 67 处 `new ExpressionBuilder(`，跨 **34** 个文件（含本层失败后的兜底） |
| 2 | `StatementOperatorBody`（`typescript/tokens/statements/statement-operator-body.xl.md`） | 增量 `IngestAll` + 平行栈 + `CondPrecedence`（`194`） | 语句壳的 `OperatorBody`（`statement-shape.xl.md:51`、`:330-332`） |
| 3 | `DirectExpressionEngine`（本文件） | 增量 `IngestAll` + 平行栈 + 挂起位 | 4 个文件 6 处构造；`direct-*` 唯一表达式建树者 |

  - `[X1]` ● 与第 1 份（`ExpressionBuilder`）的关系是**替代而非包装**：注释明写「这一层永远不 new `ExpressionBuilder`」，但同一句把「不许 new」写成了纪律，而不是把 `ExpressionBuilder` 换掉——它在失败路径上仍是同一语义的另一份实现 — 证据 `:1249-1251`（`// 也是 A6 口径的关键：这一层永远不 new `ExpressionBuilder`。`）、`:1330`（`// 插值内部**用嵌套 DirectExpressionEngine**（A6：不许 new ExpressionBuilder）`）
  - `[X1]` ● 与第 2 份的关系由注释自陈为「同构」：`IngestAll` 的循环被描述成与 `StatementOperatorBody.IngestAll` 同构的增量循环，两套栈机各自维护自己的 `Frames`/`FramePrecs`/`CondPrecedence` — 证据 `:222`（`// 与 `StatementOperatorBody.IngestAll` 同构的增量循环：幂等（只处理 `Ingested` 之后的新单元）、`）、对照 `typescript/tokens/statements/statement-operator-body.xl.md:194`（`## static field CondPrecedence:int = 1`）
  - `[X1]` ● 漂移已具体化：条件表达式优先级在三份实现里是 **1 / 2 / 4** 三个值（`statement-operator-body:194` = 1、本文件 `:102` = 2、`expression-builder.xl.md:352` 的 `ParseBinary(4)` = 4），三处各自与 `OperatorTable` 的关系也各不相同（`OperatorTable` 无 `?:` 级，`??` = 4，`operator-table.xl.md:41-43`）
  - `[X1]` ● 跨层借用了被判为「设计外第四套解析器」的 `TypeBuilder` 来读 `as` 之后的类型（`as` 缓冲 → 一次 `Load` + `ParseType` + `OriginalConsumed` 三段），类型语法因此不经过本层的任何形状 — 证据 `:1991-1993`（`const builder = new TypeBuilder(this.Template, this.Context); builder.Load(units, basePos); let type:Token | null = null;`）、`:2003`（`const consumed = builder.OriginalConsumed();`）
  - `[X1]` ● 类表达式又反向依赖声明层静态工厂：继承子句与成员体各交给一个公开静态工厂（`HeritageClauseShape.BuildClauses` / `BodyGuideUtil.CollectBodyMembers` + `ClassDeclarationShape.BuildMembers`），失败仍退回 `Fail` — 证据 `:753-756`（`// 收口时**只复用公开静态工厂**（与 `expression-builder.ParseClassExpression` 同源）：` / `//   `HeritageClauseShape.BuildClauses` / `BodyGuideUtil.CollectBodyMembers` + `ClassDeclarationShape.BuildMembers``）、`:832`、`:841`
  - `[X1]` ○ 两处「复刻」写在同一文件里并自陈原因（循环依赖）：箭头块体复刻 `DirectStatementAssembly.BlockFrom` 的口径，箭头参数表复刻 `FunctionDeclarationShape.BuildParameters` 的裸标识符判据——三处判据靠注释声明「必须同步」，无机制保证 — 证据 `:2663-2671`（`// **口径与 `DirectStatementAssembly.BlockFrom` 完全一致**（那边是 canonical 实现）...` / `// **为什么在这里复刻一份**：`direct-statement-assembly` 已经 import 本引擎（assembly → engine），反向 import 就是循环依赖`）、`:2172-2173`（`// 判据与 `FunctionDeclarationShape.BuildParameters` 的「裸标识符」分支同一张表`）
  - `[X1]` ○ 对象成员的方法体交给另一套装配器（`DirectObjectMemberAssembly.MemberFrom`，其内部再走 `DirectStatementAssembly.BlockFrom`），失败原因靠静态字段 `LastReason` 传回，没有返回值契约 — 证据 `:1121-1125`（`const member = DirectObjectMemberAssembly.MemberFrom(...); if (member === null) { this.MemberFail(DirectObjectMemberAssembly.LastReason); return false; }`）
  - `[U4]` ○ basic token 在本层「用后不丢」：全文 0 处删除型 `splice`、0 处 `Data.length = 0`，唯一的 `splice` 是**插入**一个 `=` 运算符形状；raw 单元由调用方（壳/语句装配）在语句级丢弃 — 证据 `:1167`（`shorthand.Data.splice(1, 0, DirectTokenUtil.OperatorToken(nextUnit, name.SourceRange.EndIndex, this.Template, this.Context));`）、对照 `typescript/tokens/statements/statement-shape.xl.md:345`（`let consumed:Array<Token> = host.Data.slice(0, endIndex + 1);`）与 `:377`（`consumed = host.Data.slice(0, stopAt);`）——丢弃发生在壳一侧
  - `[X1]` ○ 与语句壳之间是「先喂全部、再回头校验」的接口：会话把整个壳的 `Data` 喂给引擎（可能多吃），`Finish` 之后再用「表达式终点 == 语句最后一个代码单元」的覆盖校验兜住，不一致即 `expr.coverage` Decline — 证据 `typescript/tokens/direct/direct-expression-session.xl.md:322-327`（`// C1 覆盖校验（R2-CONTRACT §3.3.3）：引擎在 H1 拿到的是**整个壳的 Data**（而不是 `consumed`），因此它可能多吃语句外的单元`）、`:339-342`（`if (expectedUnit !== undefined && expression.SourceRange.EndIndex !== expectedUnit.SourceRange.EndIndex) { this.Decline(...);`）

#### 方法分布（66 方法 / 9 组，起始行）

| 组 | 职责 | 方法:行 |
| --- | --- | --- |
| 入口 / 游标 / 收口 | 增量喂格、两态分派、收尾、失败与停层 | `IngestAll:219` `IngestUnit:241` `IngestCode:257` `IsComplete:302` `Finish:352` `Fail:449` `IsRestrictedPostfix:461` `TakeOperand:473` `SpanFromTo:480` `EndLayer:2053` `Hold:2066` |
| 操作数与字面量 | 关键字 / 字面量 / 模板串 / 前缀族 | `KeywordOrLiteral:500` `IngestOperand:507` `IngestKeywordPrefix:640` `IngestAwaitPrefix:662` `ParseTemplate:1326` |
| 括号与容器 | 括号 / 数组 / 对象 / 属性名 / 值位切片 / 实参 | `IngestParen:866` `IngestArray:911` `IngestObject:992` `BuildObjectMember:1041` `MemberFail:1179` `BuildPropertyName:1189` `BuildSlice:1246` `ParseArguments:1278` |
| `new` 与类表达式 | 被构造者链、类表达式的名字 / 继承 / 体 | `StartNew:682` `CloseNew:705` `CloseNewWithArgs:725` `StartClassExpression:746` `IngestClassExpressionPart:772` `CloseClassExpression:821` |
| 后缀链 | `.` / `?.` / `()` / `[]` / `!` / `++` | `StartMemberAccess:1554` `StartQuestionDot:1567` `IngestPostfixPart:1580` `IngestBracketSuffix:1658` `IngestNonNull:1705` `IngestPostfix:2026` |
| 二元 / 条件 / `as` | 优先级栈、条件 frame、类型断言缓冲 | `IngestOperator:1429` `IngestBinary:1721` `PrecedenceOf:1728` `IsRightAssocOf:1741` `PushOperator:1748` `StartConditional:1828` `IngestColon:1864` `StartAs:1891` `IngestAsPart:1937` `FlushAllAs:1953` `FlushAs:1966` |
| 栈与挂载 | 冲操作数、挂到 frame/holder、出栈封口 | `FlushOperand:2073` `AttachOperand:2095` `Top:2127` `CompleteTop:2136` `CompleteAllFrames:2157` |
| 尖括号 | 参数表试探、`>` 挂起、比较链重放、实例化表达式 | `CouldBeArrowParameters:2165` `IngestAfterAngleWait:2192` `ResolveAngleCloseAsComparison:2211` `TryInstantiationExpression:2228` |
| 箭头 / `async` | 挂起参数表、裸参数、体子引擎、块体 | `IngestAfterAsyncHead:2324` `IngestAfterParams:2381` `StartArrowFromParams:2438` `StartArrow:2494` `StartArrowBody:2551` `IngestArrowPart:2562` `CloseArrowLayer:2608` `FinishArrowBody:2618` `CompleteArrow:2641` `BuildArrowBlock:2660` |

- 结论：**偏离（34 条：`S2`×1、`S4`×3、`P3`×1、`C1`×1、`C2`×3、`C3`×1、`U4`×1、`B2`×1、`B4`×2、`X1`×18、`X2`×2；其中 ● 24 条、○ 10 条）**。它是 `direct-*` 会话体系里表达式的**唯一建树者**，同时是「`ParseFromShape` 缺席 + `new XxxShape` 直建 + 引擎自签范围自关闭」这一形态在表达式位置上的完整落点；与 `ExpressionBuilder`（第 50 篇）、`StatementOperatorBody` 构成同一语义的 **3 份并列实现**，条件表达式优先级的三值（1 / 2 / 4）是本批可直接核对的漂移证据。合规项：围栏外 0 行散文（`D1`=0，唯一 `txt` 围栏 `70-82` 是示例）；0 处 tsx/JSX（`X3`=0）；0 处 `ExitOrPre` 覆盖（`R1`=0）、0 处 `ComputePossibleShapes` 覆盖（`R2`=0）；0 处跳跃式处理（`B3`）；受限后缀闭集**不另抄**而是共用 `StatementTokenSets.IsRestrictedPostfixText`（`:470`），赋值/逗号/二元优先级也不另抄而是共用 `OperatorTable`（`:1732-1738`），这两点是本文件与 `expression-builder`（手抄 16 个赋值符）相反的取舍。

## 本批统计

- 文件数 **1**；有偏离文件 **1**；偏离条数 **34**（● **24** / ○ **10**）；另有 **3** 条 `—` 合规项（`S3`、`B3`、`B1`）只作记录，不计入偏离条数。
- 按编号计数：`S2:1 S4:3 P3:1 C1:1 C2:3 C3:1 U4:1 B2:1 B4:2 X1:18 X2:2`（合计 **34** 条）。`S1`/`U1`/`U2`/`U3`/`P1`/`P2`/`P4`/`R1`/`R2`/`X3`/`D1` 本文件均未出现。

| 编号 | ● | ○ | 落在哪 |
| --- | --- | --- | --- |
| `S2` | 1 | 0 | 三件套不成立（`219`/`241`/`352`） |
| `S4` | 3 | 0 | 0 处 `ParseFromShape` + 37 处直建（`1816`）；关闭权在引擎（`480-497`、`2136-2150`）；挂载被 `PendingOperand`/`AttachOperand` 取代（`2095-2125`） |
| `P3` | 0 | 1 | 实例化表达式原地顶替父容器子节点（`2311-2317`） |
| `C1` | 0 | 1 | 括号 / 块体 / frame 栈每轮重扫（`1870`、`2174`、`341`） |
| `C2` | 3 | 0 | `BuildSlice` 值位整段重建（`1249-1257`，10 个调用点）；括号与箭头体整段重建（`875-878`、`2593`）；容器成员按逗号二次切段（`947-953`、`1018-1024`、`1298-1304`） |
| `C3` | 1 | 0 | cache 四式全 0，52 字段自存状态（`104-206`） |
| `U4` | 0 | 1 | 0 处删除型 `splice`，唯一 `splice` 是插入（`1167`） |
| `B2` | 1 | 0 | 3 处 `catch` 吞异常（`833`、`842`、`1996`） |
| `B4` | 0 | 2 | 全扫 `bracket.Data`（`2174`、`2679`）；读已建 frame 子节点当前瞻（`2254-2272`） |
| `X1` | 13 | 5 | ● holder（`215`）、平行栈（`116-122`）、7 挂起位（`264-293`）、`Fail` 不抛（`451-458`）、指标（`1825`）、插入节点（`1817`）、动态标记（`742`）、`AllowClass`（`206`/`877`）、第 3 份并列实现（`1249-1251`）、与第 2 份同构（`222`）、优先级三值漂移（`102`）、`TypeBuilder` 复用（`1991`）、类表达式静态工厂（`832`/`841`）；○ 自定优先级/结合性（`1745`）、鸭子类型判据（`2688`）、复刻 `BlockFrom`（`2663-2671`）、`MemberFrom` + `LastReason` 旁路（`1121-1125`）、先喂全部再回头校验（`direct-expression-session.xl.md:322-327`） |
| `X2` | 2 | 0 | 直建先于 `new StatementBuilder`（`statement-shape.xl.md:346-350`）；失败即回落 `ExpressionBuilder` + `StatementBuilder`（`2676`、`direct-expression-session.xl.md:281-285`） |

- 本批最重的 5 条（按影响面排序）：
  1. `[S4]`/`[X2]` 表达式 AST 由引擎直建且这是默认路径：101545B / 2173 代码行 / 66 方法 / 37 处 `new XxxShape` / **0** 处 `ParseFromShape`，在 `new StatementBuilder` 之前交回收口（`direct-expression-engine.xl.md:68`、`:1816`、`:1249-1251`；接口 `typescript/tokens/statements/statement-shape.xl.md:346-350`）。
  2. `[X1]` 同一语义的第 3 份实现，且三份的条件表达式优先级是 **1 / 2 / 4** 三个值（`statement-operator-body.xl.md:194`、本文件 `:102`、`expression-builder.xl.md:352`；`OperatorTable` 无 `?:` 级，`operator-table.xl.md:41-43`）。
  3. `[C2]` 每个值位（数组元素 / 数组展开 / 对象属性值 / 对象默认值 / 对象展开 / 计算属性名 / 调用实参 / 模板插值 / 下标 / 可选链下标）都切出子段再**新开一台引擎**从头喂（`:1249-1257`，10 个 `BuildSlice` 调用点；括号与箭头体同款 `:875-878`、`:2593`）。
  4. `[X1]` 「无前瞻」用 7 个挂起位 + 下一格重放实现，等于把前瞻改成跨格暂停；换来的判据之一是 `CouldBeArrowParameters` 对 `bracket.Data` 的**全量预扫**（`:264-293`、`:2174-2189`）。
  5. `[B2]`/`[X1]` 错误通道被取消：3 处 `catch` 全吞（`1996` 连 message 都丢），`Fail` 只置位不抛，80 处失败点只留一个字符串 `Reason`（`:449-459`、`:833`、`:842`、`:1996`）。
- 本批合规面（防止误读）：`D1`=0（围栏外无散文，中文注释全在 `ts` 围栏内）；`X3`=0；`R1`=0；`R2`=0；`B3`=0；`GetRaw`=0（不回读文档原文，与 `expression-builder` 的逐字符回扫相反）；受限后缀与优先级**共用同一张表**（`StatementTokenSets.IsRestrictedPostfixText` `:470`、`OperatorTable` `:1732-1745`），未出现 `expression-builder` 式的手抄表。
