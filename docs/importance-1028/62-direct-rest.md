# 62 direct 其余 14 文件：会话直建框架的边界（审计）

审计对象：`typescript/tokens/direct/` 下 14 个文件（第 40/50/60/61 篇未覆盖的部分）。判据见 [01-rules.md](01-rules.md)，字节 / 代码行取自 [_facts/typescript-tokens-direct.md](_facts/typescript-tokens-direct.md)，行号以 `read` 返回值为准，14 个文件都读到了物理末行。**只读源码，未改任何源码与 `docs/IMPORTANCE.md`。**

先给本批的总纲，逐文件小节只给证据：

- `direct-*` 不是一层，而是一套**与 shape/possible/end 平行的建造框架**：接口 `DirectSession` → 静态注册表 `DirectBuildRouter.Factories`（9 行 `Register`）→ 指标与开关 `DirectBuildMetrics` → 挂载点 `DirectStatementHook.Attach`（4 处）→ 4 个 session + 4 个装配器 → 收口时 `StatementShape.BuildFromShell` 把已建形状 `splice` 回父单元（`statement-shape.xl.md:371-380`）。
- 它**改写了「谁能建 AST」的边界**：注册无条件发生、`Create` 首次调用即惰性 `Install`（`direct-build-router.xl.md:38-40`），9 个 kind 的语句默认由 session 建树；只有 `Declined` 才退回 `StatementBuilder`（`statement-shape.xl.md:346-349`）。因此这条通路是**默认路径**、不是备选（R04/R21）。
- R21 的产出通道全仓只有**一个未实现的桩**（`typescript/ast/declarations/import-declaration-ast-node.xl.md:28-31`，`throw new Error("…ParseFromShape 未实现")`），所以本批 8 处 `S4` 都是「AST 由会话 / 装配器直建形状」，`possible` 与 `end` 在这些 kind 上不再决定树。

---

### typescript/tokens/direct/direct-variable-session.xl.md（18993B / 404 行代码；VariableStatementDirectSession）

- 结构：会话层（`implements DirectSession`），direct 通道里唯一**真增量**的实现：7 态状态机 `ExpectHead…ExpectType`（`:32-44`）逐单元推进，每到一个可收口点就用形状工厂当场建 `VariableDeclarationShape` / `VariableDeclarationListShape` / `VariableStatementShape` 并 `TryToClose`（`:248`、`:271`、`:465`、`:488`、`:566-577`）。初始化器只是把单元转发给 `DirectExpressionEngine`（`:397`），类型片段转发给 `DirectTypeAssembly`（`:364`）。
- 偏离：
  - `[S4]` ● AST 形状由会话直接 `new` 出来、`TryToClose` 手工关闭，全程没有 possible 收口、也没有 `ParseFromShape` — 证据 `direct-variable-session.xl.md:248`（`this.List = new VariableDeclarationListShape(this.Template);`）、`:271`（`const declaration = new VariableDeclarationShape(this.Template);`）、`:567`（`const statement = new VariableStatementShape(this.Template);`）、`:577`（`statement.TryToClose(context);`）。R21。
  - `[X2]` ● 旁路且是默认：`Decline` 是公开的回退闸门，被注册给 `ShellVariable` 后**无条件**接管 `let/const/var` 语句，只有拒建才由 `StatementShape.BuildFromShell` 落回 `StatementBuilder` — 证据 `:151-165`（`this.Declined = true; … DirectBuildMetrics.NoteDecline(reason, category);`）、`:522`（`this.Decline("语句内出现无法接续的单元 idx=" + String(this.StoppedAt), "var.stopped");`），注册点 `direct-build-plugins.xl.md:46`，回退点 `statement-shape.xl.md:350`（`if (direct !== null && !direct.Declined) {`）。
  - `[B4]` ○ H1 喂给引擎的是**整壳 `Data`**，会话只能事后用 `var.coverage` 把「引擎多吃」的部分减掉，等于把「不看 `tokenIndex` 之后」这条判据变成事后校验 — 证据 `:437-442`（`// 初始化器必须精确覆盖**本声明的最后一个代码单元**。H1 喂给引擎的是整壳 Data，引擎可能多吃`）、`:444-459`（反向扫 `for (let index = high - 1; index > this.EqualAt; index--)` 求 `expectedEnd` 再比对）。R22 的语义被换成「先看后验」。
  - `[B1]` ○ `Finish` 末尾裸取 `this.Units[endIndex]`，没有 `endIndex < Units.length` 的守卫；`Ingest(upTo)` 只会把 `Ingested` 推到 `Units.length`，`endIndex` 越界时这里直接解引用 — 证据 `:573-575`（`const endUnit = this.Units[endIndex]; if (endUnit.SourceRange.EndIndex >= 0) {`）。R25。
  - `[X1]` ○ 第二份**保留字黑白名单**：本文件自带 `IsReservedName`（`:121-148`，60 余个词的 `||` 链），与 `DirectTokenUtil` 的 `reserved` 数组（`direct-token-util.xl.md:91-95`）同职责但**内容不一致**（本表含 `true/false/null/this/super/enum/let/const/var`，`DirectTokenUtil` 表把它们分别归到「关键字字面量」与「运算符位」）。两份表各自演化的机制，IMPORTANCE 无对应物。
- 结论：偏离（5 条）。

### typescript/tokens/direct/direct-expression-session.xl.md（14044B / 252 行代码；ExpressionStatementDirectSession）

- 结构：会话层（`implements DirectSession`）。逐单元喂 `DirectExpressionEngine`（`:207-210`），`Finish` 用 `new ExpressionStatementShape` 收口（`:296-321`）。本文件比其它会话多出一整套**语句切点机制**：`CanRecoverAt`（`:118-180`）判定引擎的 `Held` 是不是「下一条语句的开头」，成立就记 `StopAt`（`:219-223`），由壳按 `StopAt` 缩短 `consumed` 并把尾巴续建成新语句（`statement-shape.xl.md:374-412`）。
- 偏离：
  - `[S4]` ● 语句 AST 由会话直建，`TryToClose` 手工调，不走 possible/end — 证据 `direct-expression-session.xl.md:296-298`（`const shape = new ExpressionStatementShape(this.Template); shape.Expression = expression; shape.Add(expression);`）、`:321`（`shape.TryToClose(context);`）。R21。
  - `[X1]` ● 设计外的**语句边界裁决权**：一条壳能否被切成多条语句，由会话的 `CanRecoverAt` 四条准入 + 三条否决决定，并把切点以 `StopAt` 报给壳；IMPORTANCE 里语句边界只由 possible/end 与 ASI 层决定，没有「会话报切点、壳按切点 splice」这一机制 — 证据 `:124-128`（`if (!this.AllowRecovery) { … return false; }`）、`:139-143`（`if (LineTerminator.HasBefore(this.Units, at)) { return false; }`）、`:149-157`（`;` / EOF / 模板串三条否决）、`:274-280`（`cut = this.StopAt - 1;`），壳侧成对不变式 `statement-shape.xl.md:375-379`（`consumed = host.Data.slice(0, stopAt); tailFrom = stopAt;`）。这是一条**只在会话里存在**的语法判定。
  - `[X1]` ○ 为了问「前缀是否完整」，临时改写引擎的持久字段再做只读求值：`engine.Held = false; … engine.IsComplete(); … finally { engine.Held = heldFlag; }` — 证据 `:169-178`。用别的组件内部状态当查询接口（注释自承「临时清位、只读求值、立刻还原」）。
  - `[B2]` ○ `catch { prefixComplete = false; }` 无参数、无记录的裸吞，异常被降级成「前缀不完整」这一个布尔量 — 证据 `:172-176`（`try { prefixComplete = engine.IsComplete(); } catch { prefixComplete = false; } finally { … }`）。R23：诊断信息在此丢失。
  - `[B4]` ○ 同变量会话：引擎拿到的是整壳 `Data`，多吃 / 提前收层只能靠 `expr.coverage` 事后发现 — 证据 `:322-327`（`// 引擎在 H1 拿到的是**整个壳的 Data**（而不是 consumed），因此它可能多吃语句外的单元`）、`:328-343`（扫到 `cut` 求 `expectedUnit` 再比 `SourceRange.EndIndex`）。R22。
- 结论：偏离（5 条）。

### typescript/tokens/direct/direct-class-session.xl.md（12945B / 187 行代码；ClassDeclarationDirectSession）

- 结构：会话层（`implements DirectSession`）。**名义增量、实际全量**：`Ingest` 只推进游标、一个判定都不做（`:102-105` 的注释明说，`:113-115` 的实现就是 `this.Ingested = this.Ingested + 1;`），真正建树全部发生在 `Finish`：折 `code`/`codeAt`（`:145-153`）→ `ClassDeclarationShape.BuildFromCode`（`:180`）→ `CoverageOk` 比终点（`:194-199`）。另外自带一条装饰器转发分支（`:159-172`、`:226-269`）。
- 偏离：
  - `[S4]` ● 类 AST 由会话在收口期一次性交给形状工厂用**整段 raw code** 建，`possible` 与 `end` 完全不参与 — 证据 `:180`（`shape = ClassDeclarationShape.BuildFromCode(this.Owner as Token, code, this.BasePos, context, allowAnonymous);`）、`:200-205`（`this.Finished = true; … return shape;`）。R21。
  - `[C2]` ● 增量只是壳：`Ingest` 不建形状、不判定（`:102-105`「**Ingest 期不做任何判定**」），`Finish` 再把 `Units` 从头折一遍（`:147-153` 的 `for (let at = 0; at <= endIndex …)`）并把整段交给全量 `BuildFromCode`。即「能用增量却用全量」，且增量通道被保留成空转（只有游标在动）— 证据 `:113-115`（`while (this.Ingested < units.length) { this.Ingested = this.Ingested + 1; }`）。R06/R07，同时也消掉了 R12 的「第 n 个字符已定 ⇒ 树已建」。
  - `[X1]` ● 一条 **kind 双职**的转发通道：kind 10（`ShellDecoratedDeclaration`）同时承载 `@dec class` 与 `@dec function`，判据是本文件自写的 `HasDecoratedFunctionHead`（顶格扫 `"function"`，`:217-223`）＋ `TryDecoratedFunction` 转调 `FunctionDeclarationShape.FromUnits`（`:245`）——这两件在 IMPORTANCE 里没有对应物：class 会话里长出「函数声明该怎么建」的第二份分派表 — 证据 `:159-172`（`if (code[0] instanceof Symbol && (code[0] as Symbol).Is("@") && this.HasDecoratedFunctionHead(code)) {`）、`:219`（`if (unit instanceof Common && (unit as Common).TempToString() === "function") {`）。R04 的三件套之外多出一条「谁建哪种声明」的判定。
  - `[X1]` ○ 自造收口判据 `CoverageOk`：只比 `SourceRange.EndIndex` 是否等于末个代码单元终点，不等就整段放弃（「绝不建半棵树」）— 证据 `:271-279`（`// 只比上界，不比内容` + `return built.SourceRange.EndIndex === expectedEnd;`）、`:194-199`。设计里收口是 `SignOut` → `TryToClose()` 的语义闭合，没有「建完再比终点」这一关。
  - `[B2]` ○ 两处 catch：`BuildFromCode` 抛错整段放弃（`:181-187`，转 `Decline("类声明形状失败: …", "decl.shape")`）、`FromUnits` 抛错静默降级（`:246-252`，只记一条 `Trace` 后 `return null`，再由上层的 `ForwardHandled` 分流）。R23：异常被转成回退信号，其中第二处连计数都没有。
- 结论：偏离（5 条）。

### typescript/tokens/direct/direct-statement-assembly.xl.md（12615B / 205 行代码；DirectStatementAssembly）

- 结构：装配层（静态工具类，无状态）。四件事：把 legacy 的 `Positions` 表复刻成 `CodeAt`/`PositionAt`（`:28-56`）；`Span` 复刻 `StatementBuilder.Finish` 的 `SignIn/SignOut/Pos/TryToClose`（`:70-84`）；`BlockFrom` / `RawStatement` 直接 `new BlockShape` / `EmptyStatementShape` / `ExpressionStatementShape` 并 `Add` 已建好的子句（`:134-177`、`:232-281`）；`ExpressionOf` 把一段单元区间喂进 `DirectExpressionEngine`（`:179-219`）。
- 偏离：
  - `[S4]` ● 语句 / 块的 AST 由装配器当场 `new` 并 `Add` 子节点、`TryToClose` 关闭，没有 possible 收口 — 证据 `direct-statement-assembly.xl.md:158`（`const shape = new BlockShape(template);`）、`:274-276`（`const shape = new ExpressionStatementShape(template); shape.Expression = expression; shape.Add(expression);`）、`:83`（`shape.TryToClose(context);`）。R21。
  - `[C2]` ● 体内语句**不是收集就是整段放弃**，收集不到就把整块交给上层从 raw 重建 — 证据 `:105-111`（`// ④ **[D4b:RAW-BODY] 有 raw 代码、却一条已收口语句都没有 → 返回 null**（不静默建空块）` + `Decline 之后由上层换 ExpressionBuilder.ParseObjectLiteral → StatementBuilder.BuildBlock 的 raw 分支逐条建`）、`:127-130`（`if (raw && collected.length === 0) { return null; }`）。R06/R07：能增量收的就收，收不到就整段重来。
  - `[X2]` ● 上面那条 `return null` 的实际效果是**旁路回退**：调用方（`DirectControlSession.BuildBlock` 等）据此 `Decline`，语句壳退回 `StatementBuilder.BuildBlock` 的 raw 分支逐条建树 — 证据 `:141-144`（`const children = DirectStatementAssembly.BuiltChildren(bracket); if (children === null) { return null; }`）、回退点 `statement-shape.xl.md:502-506`（`built = StatementFamilyDispatch.Build(builder, shell.Kind); … built = builder.BuildStatement();`）。
  - `[U3]` ○ 未消费的 raw 单元走的是自造通道：`{…}` 体里存在 basic token 时既不回挂父级 `Reclose`、也不发 `Reload Message`，而是把「这一层建不了」这个结论传给上层去换一条完全不同的建造路径 — 证据 `:118-121`（`if (unit.IsBasicToken) { raw = true; continue; }`）、`:96-104`（`// 收口时由各自的 H2 换成了建好的形状。这里只做「收集 + 校验」`）。R17③/④ 的四种去向之外。
  - `[X1]` ○ 用 duck-type 判「这是不是一个未收口语句壳」：`typeof (unit as any).Kind === "number"` 依赖「只有 `StatementShape` 有 `Kind` 字段」这一仓库约定，而不是类判定 — 证据 `:86-93`（`// 故意不 import statement-shape.xl.md（XLD-MD-GUIDE §3）` + `return typeof (unit as any).Kind === "number";`）。为了避免循环依赖而把类型系统换成字段嗅探。
  - `[X1]` ○ 第二份 `Positions` 表：`PositionAt` 逐字复刻 `StatementBuilder.Load` 的推位规则（`pos = 前一代码单元的 EndIndex`），每个会话再各调一次 — 证据 `:44-56`（`// 复刻 StatementBuilder.Load（statement-builder.xl.md:97-114）` + `for (let at = 0; at < index && at < codeAt.length; at++) { … pos = end; }`）、调用点 `:99`、`:155-157`、`:192`、`:260`、`:279`。同一张表被算了 N 次，且与 `ItemUtil` 的 `NextCode/LastCodeInItem` 是同类能力的两套实现。
- 结论：偏离（6 条）。

### typescript/tokens/direct/direct-module-session.xl.md（12419B / 181 行代码；ModuleFamilyDirectSession）

- 结构：会话层（`implements DirectSession`），module 族（`import` / `export` / `namespace` / `module` / `declare` / `using`）的**薄分派器**：`Ingest` 只记第一个代码单元的文本（`:133-143`），判定与建树全在 `Build`（`:193-226`）→四路转发给 `DirectExportAssembly`（`:233`、`:248`、`:265`、`:286`、`:303`）。文件头 38 行 `txt` 围栏是形态清单（R01 允许）。
- 偏离：
  - `[S4]` ● 声明 AST 由会话转调装配器直接产出形状并返回，`possible` / `end` 不参与 — 证据 `:177-190`（`const shape = this.Build(code, codeAt); … this.Finished = true; … return shape;`）、`:265`（`const shape = DirectExportAssembly.BuildModuleShape(code, this.BasePos, this.Context);`）。R21。
  - `[C2]` ● 增量同样只是壳：`Ingest` 除记头文本外不做任何判定（注释自承「module 族的判定全在收口期」，`:122-125`），`Finish` 把 `Units` 从头折成 `code`/`codeAt`（`:166-172`）再全量 `Build`。R06/R07。
  - `[X1]` ● 「不写第二份关键字表」的注释与实现相反：文件里既有 5 个 `Head*` 字符串常量（`:42-52`）＋ `Handles` 的五路 `||`（`:90-94`），又有 `Build` 里五段同构的 `if (head === ModuleFamilyDirectSession.Head*)`（`:207-223`）——这就是与 `DecideDeclaration` 并行的**第二份族头分派表** — 证据 `:88-89`（`// 入口判据**不新写第二份关键字表**：这五个头就是 DecideDeclaration 已经证明的 kind 7 头集合`）对照 `:207-210`（`if (head === ModuleFamilyDirectSession.HeadImport) { return this.BuildImport(code, codeAt); }`）。R04 之外新增「头 → 建造器」的独立判定。
  - `[X1]` ○ 同一覆盖判据挂三处：`BuildModule` 自己比一次 `EndIndex`（`:270-275`），`Finish` 再比一次（`:181-186`），调用方 `DeclarationFamilyDirectSession` 还有一次 — 证据 `:270-274`（`const expectedEnd = code[code.length - 1].SourceRange.EndIndex; if (shape.SourceRange.EndIndex !== expectedEnd) {`）。设计外的「建后校验」被复制成三层。
  - `[X2]` ● 失败一律返回 `null` 且**不置 Decline**（「本方法**不**置 Decline」，`:198`），把回退决定权外抛给调用方 `Decline(…, "decl.module")` — 证据 `:196-198`（`// 失败一律返回 null 并写 this.Reason，由调用方 Decline(…, "decl.module") —— 本方法**不**置 Decline`）、`:235-237`（`if (shape === null) { this.Reason = DirectExportAssembly.LastReason; return null; }`）。旁路的回退形状被拆成「谁拒建」与「谁决定回退」两处。
- 结论：偏离（5 条）。

### typescript/tokens/direct/direct-object-member-assembly.xl.md（12412B / 222 行代码；DirectObjectMemberAssembly）

- 结构：装配层（静态工具类）。把对象字面量按顶层逗号切出的一个成员片段建成 `MethodDeclarationShape` / `GetAccessorShape` / `SetAccessorShape`（`:126-133`），子节点顺序按 tsc：前缀（`async` / `*`）→ 名字 → 参数 → 体（`:138-165`），区间与 `Pos` 手工 `SignInToken/SignOutToken` 后 `TryToClose`（`:168-171`）。参数表只做**准入判定**（`:211-278`），真正的建仍交 `ClassDeclarationShape.BuildParameters`（`:118`）。
- 偏离：
  - `[S4]` ● 成员 AST 由装配器 `new` 出来并 `Add` 子形状、`TryToClose` 关闭，无 possible 收口 — 证据 `:128-132`（`member = new GetAccessorShape(this.Template); … member = new MethodDeclarationShape(this.Template);`）、`:165-171`（`member.Add(block); … member.TryToClose(context);`）。R21。
  - `[X1]` ● 第二份**参数表语法判据**：自写 `ClassifyParameters` 的 `mode 0/1/2` 状态机只为了「能不能交给 `BuildParameters`」——允许纯标识符 / 类型注解 / `?` / rest，拒绝 `=`、`@`、解构；`TypeBuilder.ParseParameter` 本来就有这套判据。注释自承有已知缺口（泛型实参里的 `,` 会误判） — 证据 `:223-224`（`// 类型区里遇到顶层逗号就回到「等名字」… 这一条是**已知缺口**，R6 可换成 TypeBuilder 的角括号深度。`）、`:234-277`（`while (at < units.length) { … if (mode === 0) { … } if (text === ",") { mode = 0; … } … }`）。设计外的第二份文法判定，且已知不完整。
  - `[X1]` ○ 手工复刻 R31 的「静态工厂三件套」：前缀关键字不走任何 `From*` 工厂，而是 `new AsyncKeywordShape` → `SignInToken` / `SignOutToken` → 手写 `Pos` → `TryToClose` — 证据 `:141-146`（`const asyncKeyword = new AsyncKeywordShape(template); asyncKeyword.SignInToken(data[prefixIndex]); … asyncKeyword.Pos = memberPos; asyncKeyword.TryToClose(context);`）、`:150-155`（`*` 同构）。工厂位置从形状类搬到了装配器里（`keywords/` 下只有 `declare`/`abstract`/`export` 三个 shape 带 `FromBasicToken`，`async` / `*` 没有，所以这里成了**唯一**实现点）。
- 结论：偏离（3 条）。

### typescript/tokens/direct/direct-declaration-assembly.xl.md（9577B / 154 行代码；DirectDeclarationAssembly）

- 结构：装配层（静态工具类），只服务 `for (let …)` 头部：`ListFrom` 逐条重建 `VariableDeclarationListShape`（`:68-206`），内部复刻 legacy `BuildVariableDeclarationList` 的「名字 → `:` 类型 → `=` 初始化器 → `,` 分隔」四段，但**只保留 Identifier 子集**（`:70-76` 注释列出被砍掉的四类）。类型段交 `DirectTypeAssembly.TypeOf`（`:147`），初始化器交 `DirectStatementAssembly.ExpressionOf`（`:171`）。
- 偏离：
  - `[S4]` ● 声明列表 AST 由装配器直接 `new` 形状并 `Add`、`Span` 收口 — 证据 `direct-declaration-assembly.xl.md:87`（`const list = new VariableDeclarationListShape(template);`）、`:106-107`（`const declaration = new VariableDeclarationShape(template); declaration.Add(name);`）、`:183-184`（`DirectStatementAssembly.Span(declaration, …)`）。R21。
  - `[X1]` ● 与 legacy **并行的第二份** `BuildVariableDeclarationList`（legacy 是 `StatementBuilder` 的 157 行），而且是它的一个**带缺口子集**：解构 / `!` / 非标识符名三类直接 `Decline`，`using` 头直接排除 — 证据 `:71-76`（`// 逐条对齐 BuildVariableDeclarationList(keywordIndex, endExclusive)（statement-builder.xl.md:1610-1767），**只保留 Identifier 子集**`）、`:93-98`（`if (nameUnit instanceof Bracket) { … LastCategory = "stmt.binding"; return null; }`）、`:111-115`（`!` → `stmt.type`）。同一段文法被实现两遍、口径靠注释人工对齐。
  - `[X1]` ○ 第三份**类型边界扫描**（`:` 之后扫到尖括号深度 0 的 `=` / `,` 为止）：`VariableStatementDirectSession.IngestType` 一份（`direct-variable-session.xl.md:331-340`）、legacy `BuildVariableDeclarationList` 的内联写法一份，这里是第三份 — 证据 `:118-136`（`if (typeDepth === 0) { … if (typeText === "=" || typeText === ",") { break; } } typeDepth = AngleJudge.ScanDepth(typeUnit, typeDepth);`）。
  - `[C1]` ○ `ListFrom` 每调用一次就从 `keywordIndex` 重新走完整个 `for` 头（`while (at < endExclusive)`），每个成员片段再各查一次 `codeAt.indexOf(nameIndex)` 式的反查（`DirectObjectMemberAssembly` 同款）；两处都没有跨调用的缓存 — 证据 `:90`（`while (at < endExclusive) {`）、`:128`（`while (typeEnd < endExclusive) {`）、`:162-165`（`while (initializerEnd < endExclusive …)`）。R08。
- 结论：偏离（4 条）。

### typescript/tokens/direct/direct-token-util.xl.md（7082B / 113 行代码；DirectTokenUtil）

- 结构：工具层（静态），`direct/` 的**token 分类与取文本**：`OperatorToken`（借 `ExpressionBuilder.MakeOperatorToken` 造运算符，`:34-42`）、`StartsNumber`（`:44-57`）、`TextOf`（`:59-69`）、`IsIdentifierOperand`（操作数白名单，`:71-100`）、`IsKeywordLiteral`（`:102-107`）、`IsStringUnit` / `IsTemplateUnit`（`:109-131`）、`LiteralOperand`（字面量 → 形状，`:133-185`）。
- 偏离：
  - `[X1]` ● **第二套「取文本」工具**：`TextOf` 在 `direct/` 内一共 **9 份**（本文件 `:59`、`direct-statement-assembly.xl.md:58`、`direct-export-assembly.xl.md:69`、`direct-variable-session.xl.md:103`、`direct-expression-session.xl.md:81`、`direct-module-session.xl.md:97`、`direct-control-session.xl.md:121`、`direct-declaration-session.xl.md:101`、`direct-function-session.xl.md:86`），其中 `direct-expression-session.xl.md:84-87` 只认 `Symbol`（不认 `Common`），与其它 8 份语义不同。仓库既有的 token 工具 `ItemUtil`（`typescript/tokens/item-util.xl.md:12-88`）只有 `ItemStart/NextCode/PreviousCode/LastCodeInItem`，**没有** `TextOf` ⇒ direct 通道自造了一套取文本能力并各自复制。
  - `[X1]` ● 第二份**保留字白名单**，与同批的 `VariableStatementDirectSession.IsReservedName` 互相矛盾：本表排除 `true/false/null/this`（按关键字字面量处理）与 `typeof/void/delete/new/…`，而 `direct-variable-session.xl.md:121-148` 把 `true/false/null/this/super` 与 `let/const/var` 一并列为「不能当变量名」 — 证据 `direct-token-util.xl.md:91-95`（`const reserved:Array<string> = ["true", "false", "null", "undefined", "this", "super", "typeof", "void", "delete", "new", "function", "class", "await", "yield", "import", "instanceof", "in", "of",];`）、注释自认「只写在这一处（CONTRACT §3.4「别散落」）」（`:83`）与事实不符。
  - `[X1]` ● 第三份**数字起始判据**（注释自认）：`StartsNumber` 与 `ExpressionBuilder.StartsNumber` / `Common.CanStartNumber` 同源 — 证据 `:47-48`（`// 与 ExpressionBuilder.StartsNumber / Common.CanStartNumber 同一条判据（三处同源，别各写一份）`）、`:49-56`（`const ch = text[0]; if (ch >= "0" && ch <= "9") { … } return ch === "." && …`）。`IsTemplateUnit` 同样是照抄（`:120` `// 判据照抄 ExpressionBuilder.IsTemplateToken`，`:122-130`）。
  - `[X1]` ○ 手工复刻 R31 的静态工厂：四个关键字字面量不用任何 `From*`，而是 `new XxxKeywordShape` + 按 `common.SourceRange` 手签 `SignIn`/`SignOut` + 手写 `Pos` + `TryToClose` — 证据 `:150-170`（`if (text === "true") { keyword = new TrueKeywordShape(template); } … keyword.SignIn(common.SourceRange.StartIndex); … keyword.TryToClose(context);`）。这是 util 层承担了形状工厂的职责（`keywords/` 下这四个 shape 没有 `FromBasicToken`）。
  - `[X1]` ○ 造一个运算符 token 要 `new ExpressionBuilder` + `Load` 单元素再 `MakeOperatorToken`：把 builder 当无状态的静态能力借用 — 证据 `:39-41`（`const builder = new ExpressionBuilder(template, context); builder.Load([unit], pos); return builder.MakeOperatorToken(unit, 0);`）。每次调用都建一个完整 builder 实例。
- 结论：偏离（5 条）。

### typescript/tokens/direct/direct-type-assembly.xl.md（4448B / 83 行代码；DirectTypeAssembly）

- 结构：装配层（静态工具类），direct 通道里**类型片段的唯一入口**：`TypeOf` / `ReturnTypeOf` 把一段单元 `Load` 进 `TypeBuilder` 调用 `ParseType` / `ParseReturnType`（`:35-39`、`:73-77`），再用「`consumed === lastCode+1` 且 `EndIndex` 相等」双校验收口（`:47-57`、`:85-95`）。`LastCodeAt` 求最后一个非 trivia 单元（`:109-119`）。
- 偏离：
  - `[B2]` ● 两处**静默** catch：`catch (error) { type = null; }`，不记原因、不计数、连 `LastReason` 都只写「类型无法解析」 — 证据 `direct-type-assembly.xl.md:40-42`（`} catch (error) { type = null; }`）、`:78-80`（同构的第二处）。R23：`TypeBuilder` 抛的 54 种诊断（见 40 篇）在这里全部丢失，调用方只看到「null」。
  - `[S4]` ○ 类型 AST 不是由可能的形状收口产出，而是由本类的静态方法从 raw 单元直建后当 `Token` 返回（`TypeBuilder` 内部 `new XxxShape` 直建，见 40 篇）— 证据 `:35-39`（`const builder = new TypeBuilder(template, context); builder.Load(units, basePos); … type = builder.ParseType();`）、`:58`（`return type;`）。R21 在本仓已无实现（全仓唯一 `ParseFromShape` 是未实现桩），故按 ○ 记。
  - `[C2]` ○ 每个类型片段都**整段** `Load` + 从头跑一遍文法，不复用外层任何已解析结果（变量会话给的是缓冲好的 `TypeUnits`，`for` 头部给的是切好的 `typeUnits`）— 证据 `:36`（`builder.Load(units, basePos);`）、`:74`；对比 `direct-variable-session.xl.md:364`（`DirectTypeAssembly.TypeOf(this.TypeUnits, this.TypeStart, …)`）。R06/R07 的方向：类型这一层没有增量。
  - `[X1]` ○ 自造收口判据「双校验」：既要求 `OriginalConsumed()` 等于代码单元数，又要求节点终点等于末单元终点 — 证据 `:47-52`（`const consumed = builder.OriginalConsumed(); if (consumed !== lastCode + 1) { … return null; }`）、`:102-106`（`// 防 TypeBuilder 提前收层：类型节点的区间终点必须等于最后一个类型单元的终点`）。设计里收口的判据是 `TryToClose`，这里另立一条外部判定。
- 结论：偏离（4 条）。

### typescript/tokens/direct/direct-build-metrics.xl.md（4330B / 47 行代码；DirectBuildMetrics）

- 结构：框架层（纯静态计数器 + 环形 trace）。11 个计数器字段（`:9-31`，含 `Sessions` / `StatementsBuilt` / `Declined` / `IncompleteFallback` / `Errors` / `StrictViolations`）、`DeclineReasons` 分类表（`:23`）、`Trace` 的 256 条环形缓冲（`:83-92`）、`Reset` 全清（`:33-46`）。IMPORTANCE 里没有任何指标机制。
- 偏离：
  - `[X1]` ● 整套**指标体系**是设计外挂：计数、分类键闭集、最后原因、trace 缓冲，全部由 `direct/` 内部自行定义与自增（`Sessions += 1` 在路由器、`StatementsBuilt += 1` 在 5 个 session、`Declined/NoteDecline` 在 5 个 `Decline` 实现里各写一遍）— 证据 `direct-build-metrics.xl.md:9-31`（11 个 `static field`）、`:76-80`（`DirectBuildMetrics.DeclineReasons.set(key, …); DirectBuildMetrics.LastDeclineReason = reason;`）、`:90-92`（`if (DirectBuildMetrics.Traces.length > 256) { … splice(0, … - 256); }`）；计数点 `direct-build-router.xl.md:47`、`direct-variable-session.xl.md:580`。
  - `[X1]` ● **开关位改变控制流**：`Strict` 不是指标，它让 `Decline` / `Incomplete` 从「普通回退」变成抛异常，而异常又被上层 catch 成计数 — 证据 `:27`（`## static field Strict:bool = false`）、`direct-variable-session.xl.md:161-164`（`if (DirectBuildMetrics.Strict) { DirectBuildMetrics.StrictViolations += 1; throw new Error("DirectBuild strict: " + reason + …); }`）、接收端 `statement-shape.xl.md:354-368`（`} catch (error) { … if (!direct.Declined && message.indexOf("DirectBuild strict") !== 0) {`）。用一条全局布尔在解析器里制造异常通道，设计里没有对应物。
  - `[X1]` ○ `TraceEnabled` 是默认关闭的第二个开关，`Trace` 的早退让 `TraceEnabled` 之外的 20 余处 `Trace(...)` 调用点全部成为热路径上的空调用 — 证据 `:29`（`## static field TraceEnabled:bool = false`）、`:86-88`（`if (!DirectBuildMetrics.TraceEnabled) { return; }`）、调用点 `direct-variable-session.xl.md:250`、`:280`、`:313`、`:372`、`:471`、`:494`、`:581`。
- 结论：偏离（3 条）。

### typescript/tokens/direct/direct-build-plugins.xl.md（4199B / 25 行代码；DirectBuildPlugins）

- 结构：框架层（静态注册表内容）。**唯一注册点**（注释 `:30` 与 `:38` 自述「CONTRACT §3.3」）：9 行 `DirectBuildRouter.Register(StatementRoute.X, SomeSession)` 把 9 个 kind 映射到 6 个 session 类（`:46-54`），文件头 25 行 `txt` 是 kind → session 对照表（R01 允许）。
- 偏离：
  - `[X1]` ● 这张表就是「**谁能建 AST**」的白名单：`ShellVariable(2)`、`ShellPlainExpression(1)`、`ShellStatementFamily(4)`、`ShellBlock(5)`、`ShellLabel(6)`、`ShellFunctionDeclaration(8)`、`ShellDeclarationFamily(7)`、`ShellClassDeclaration(9)`、`ShellDecoratedDeclaration(10)` 全部转给会话，IMPORTANCE 的 R04 三件套（shape / possible / end + catalog guide）里没有「按 kind 选一个建造器类」这一格 — 证据 `direct-build-plugins.xl.md:46-54`（`DirectBuildRouter.Register(StatementRoute.ShellVariable, VariableStatementDirectSession); … DirectBuildRouter.Register(StatementRoute.ShellDecoratedDeclaration, ClassDeclarationDirectSession);`）、消费端 `direct-build-router.xl.md:41-46`。
  - `[X2]` ● 注册**无条件**发生、没有任何开关门控：`Install` 只有 9 行 `Register`，没有 `if (enabled)`；调用它的也只有路由器的惰性安装。于是「直建」是默认路径、「legacy」才是回退 — 证据 `:27`（`## static method Install:()=>void`）、`:46`（`DirectBuildRouter.Register(StatementRoute.ShellVariable, VariableStatementDirectSession);`，前面没有任何 `if`/开关读取）、`:24`（`// 其它未注册的 kind → Router.Create 返回 null（旧路径，行为不变）`）对照 `direct-build-router.xl.md:38-40`（`if (!DirectBuildRouter.Installed) { DirectBuildRouter.Install(); }`）。
  - `[X1]` ○ 为了这套分层，两个框架文件必须互相 `require`：注释明说「router ↔ plugins 是 CommonJS 循环 require」，注册行必须留在方法体内才拿得到半初始化之外的 exports — 证据 `:30-32`（`// 唯一注册点（CONTRACT §3.3）。五行必须留在本方法体内：router ↔ plugins 是 CommonJS 循环 require`）、`:3`（`import { DirectBuildRouter } from "./direct-build-router.xl.md"`）、`direct-build-router.xl.md:8`（`import { DirectBuildPlugins } from "./direct-build-plugins.xl.md"`）。设计外的框架带来的结构性代价。
- 结论：偏离（3 条）。

### typescript/tokens/direct/direct-statement-hook.xl.md（3483B / 37 行代码；DirectStatementHook）

- 结构：**挂载点**（单方法 `Attach`）。对壳做 duck-type 读取（`DirectSession` / `Kind` / `Data`），幂等判重后 `DirectBuildRouter.Create(shell.Kind, …)` 造 session 并写回 `statement.DirectSession`（`:30-38`），随即把壳的 `Data` 一次性喂进会话 `Ingest`（`:47`），异常只记指标（`:46-59`）。它不是会话、不是形状、也不是 possible，却是整个直建通道的**入口**。
- 偏离：
  - `[P1]` ● **在 possible 之前抢管**：4 个调用点全在「壳刚建好」的那一格——`ControlFlowStatementPossibleShape.BuildByIndex`、`BlockPossibleShape.BuildByIndex`、`AwaitStatementPossibleShape.BuildByIndex`、`YieldStatementPossibleShape.BuildByIndex`；每次都在 `shell.CatalogGuide = new CatalogGuide([], endShape)` 刚装完、壳的候选一次都还没算的时候就把整壳 raw `Data` 喂进会话 — 证据 `direct-statement-hook.xl.md:34`（`const created = DirectBuildRouter.Create(statement.Kind, shell, context);`）、`:47`（`created.Ingest(statement.Data as Array<Token>, context);`）；调用点 `control-flow-statement-possible-shape.xl.md:285`（在 `:257` 装 catalog、`:260` `host.MountedUnit = shell` 之后）、`block-possible-shape.xl.md:193`、`:1070`、`:1207`。R13–R14 的「possible 该由 catalog 触发」在这里被换成「会话在壳诞生当格自行接管喂入」。
  - `[X1]` ● 用一个**字段**把建树器挂到壳上：`statement.DirectSession = created;`——壳因此多出一个 IMPORTANCE 未定义的成员，`StatementShape` 侧也要为它加字段与喂入/收口分支（`statement-shape.xl.md:53`、`:91-110`、`:344-380`）。「谁能建 AST」的答案从 catalog guide 变成「壳上有没有挂 session」— 证据 `direct-statement-hook.xl.md:38`（`statement.DirectSession = created;`）、`:30-31`（`const statement = shell as any; if (statement.DirectSession !== null && …)`）。
  - `[X1]` ○ **与 `StatementShellCatalog` 是双轨**，分工证据在同两处相邻代码里：catalog 的挂载被 `StatementRouteUtil.IsIncrementalShapesEnabled()` 门控（`block-possible-shape.xl.md:196-206`、`control-flow-statement-possible-shape.xl.md:288-298`），且只提供**占位 AST 节点**供 `StatementFamilyDispatch.Build` 收口时搬运；hook 的挂载**无门控**，提供的是**建树行为**（一个 `DirectSession` 实例）。两条挂载点物理相邻但开关语义相反 — 证据 `block-possible-shape.xl.md:193`（`DirectStatementHook.Attach(shell, context);`，无条件）紧邻 `:196`（`if (StatementRouteUtil.IsIncrementalShapesEnabled()) {`）、`control-flow-statement-possible-shape.xl.md:285` 紧邻 `:288`。谁在「建 AST」上优先，取决于开关，而非取决于设计。
  - `[B2]` ○ `Ingest` 外面套 try/catch：异常按「是否已计数」分流成 `Errors` / `Trace`，然后**照原样返回**（注释自承「不是空 catch」，但也确实不再上抛）— 证据 `:46-59`（`try { created.Ingest(statement.Data as Array<Token>, context); } catch (error) { … DirectBuildMetrics.Trace("direct ingest error: " + message); }`）。R23：possible 阶段（本方法就运行在 `BuildByIndex` 里）的异常应当上抛做诊断，这里被就地消化成计数。
  - `[X1]` ○ 注释与代码已经脱节：文件头写「调用点（2 个，逐行限定，R3-CONTRACT §3.2）」（`:23`），实际有 4 处（`block-possible-shape.xl.md:193`、`:1070`、`:1207`、`control-flow-statement-possible-shape.xl.md:285`）。挂载点从 2 处扩散到 4 处而自述没跟上，说明这个机制的边界已无人维护 — 证据 `:23-24`（`// 调用点（2 个，逐行限定，R3-CONTRACT §3.2）：ControlFlowStatementPossibleShape.BuildByIndex 与 BlockPossibleShape.BuildByIndex 的 return shell; 前一行。`）。
- 结论：偏离（4 条）。

### typescript/tokens/direct/direct-build-router.xl.md（1397B / 17 行代码；DirectBuildRouter）

- 结构：框架层（静态路由表）。`Factories:Map<int, any>`（`:15`）+ `Installed:bool`（`:17`）+ `Install`（`:19-27`，只有一句转调 `DirectBuildPlugins.Install()`）+ `Register`（`:29-33`）+ `Create`（`:35-49`，按 kind 取工厂并 `new` 出 session、`Sessions += 1`）。
- 偏离：
  - `[X1]` ● 「**按 kind `new` 一个建造器**」本身就是设计外机制：`Create` 用 `new (factory as any)(shell.Template, context, (shell as ShapeToken).Pos, shell)` 直接造对象，返回 `DirectSession`；IMPORTANCE 里语法层只有 shape / possible / end，catalog guide 表达关联，没有任何「kind → 建造器」的查找表 — 证据 `direct-build-router.xl.md:41-47`（`const factory = DirectBuildRouter.Factories.get(kind); … const session = new (factory as any)(shell.Template, context, (shell as ShapeToken).Pos, shell) as DirectSession; DirectBuildMetrics.Sessions += 1;`）、`:15`（`## static field Factories:Map<int, any> = new Map()`）。R04：三件套之外多出一层「会话工厂」。
  - `[X1]` ● 安装是**惰性且不可关闭**：仓库里没有任何一处显式调 `DirectBuildRouter.Install`，它只在 `Create` 的首次调用里被触发并把 `Installed` 置真，之后永不检查开关 — 证据 `:38-40`（`if (!DirectBuildRouter.Installed) { DirectBuildRouter.Install(); }`）、`:22-25`（`if (DirectBuildRouter.Installed) { return; } DirectBuildRouter.Installed = true;`）；全仓 `DirectBuildRouter.Install` 仅此一处调用（`direct-build-plugins` 只被它调用）。
  - `[X1]` ○ 构造函数签名被写死成 4 元且**不传 kind**，于是每个 session 都得到壳上去 duck-type 抠 `Kind` — 证据 `:46`（`new (factory as any)(shell.Template, context, (shell as ShapeToken).Pos, shell)`）、`:45`（`// factory 是 session 类对象本身；Pos 由壳的 ShapeToken 口径给出，session 不反向 import statement-shape。`）、落地 `direct-class-session.xl.md:68`（`this.Kind = (owner as any).Kind === undefined ? 0 : (owner as any).Kind;`）。路由键在交付时丢失，只能靠反向嗅探找回。
- 结论：偏离（3 条）。

### typescript/tokens/direct/direct-build-session.xl.md（705B / 0 行代码；DirectSession）

- 结构：**接口契约**（无方法体）。4 个属性 `Owner` / `Declined` / `Reason` / `Finished`（`:16-22`）+ 3 个方法 `Ingest` / `Finish` / `Summary`（`:24-28`）；文件头 14 行 `txt` 围栏是两条 kind → session 的对照（R01 允许，事实表 prose = 0）。它是整套直建框架的「类型」：`Finish:(endIndex, context)=>Token | null` 把「一次会话的产物」定义成 **一个已建好的形状**，而不是候选状态。
- 偏离：
  - `[X1]` ● 本文件就是设计外机制的**契约**：IMPORTANCE 的产出路径只有「关闭后的 shape → AST」，而这里把产出物写成「会话 → `Token`」，并规定会话自己要负责 `Owner`（壳）、`Declined`（拒建）、`Reason`（原因）三个概念——这些都是 IMPORTANCE 未定义的 — 证据 `direct-build-session.xl.md:26`（`## method Finish:(endIndex:int, context:SyntaxContext)=>Token | null`）、`:24`（`## method Ingest:(units:Array<Token>, context:SyntaxContext)=>void`）、`:16`（`## property Owner:Token | null`）。X1 的「builder/session 直建」在这一行被定义；R21 的通道由此被绕开。
  - `[X2]` ○ 接口把「回退」写成了协议的一部分：`Declined` / `Reason` 两个属性存在的唯一用途是让上层换旧路径（`statement-shape.xl.md:350` 的 `!direct.Declined`），而 `Declined` 是**默认值 false**、即默认接管 — 证据 `:18`（`## property Declined:bool`）、`:20`（`## property Reason:string`）、消费端 `statement-shape.xl.md:344`（`const direct = shell.DirectSession;`）与 `:350`。旁路与回退被固化成同一份契约的两面。
- 结论：偏离（2 条）。

---

## 本批统计

- 文件：14 个（合计 118649B / 1927 行代码）；**14 个全部有偏离**，共 **57 条**（`●` 31 条 / `○` 26 条）。
- 按编号：

| 编号 | 名称 | ● | ○ | 小计 | 出现文件 |
| --- | --- | --- | --- | --- | --- |
| `X1` | 设计外挂（会话/路由表/指标/开关/第二份工具） | 15 | 15 | 30 | 全 14 个文件 |
| `S4` | `ParseFromShape` 缺失，AST 由会话/装配器直建 | 7 | 1 | 8 | variable、expression、class、statement-assembly、object-member、declaration、type（○）、module |
| `X2` | legacy / fallback 旁路（且为默认） | 4 | 1 | 5 | plugins、variable、statement-assembly、module、build-session（○） |
| `C2` | 能用增量却用全量 | 3 | 1 | 4 | class、statement-assembly、module、type（○） |
| `B2` | compute/build 里 catch 掉异常 | 1 | 3 | 4 | type（●，静默两处）、hook、expression、class（○） |
| `B4` | 查看 `tokenIndex` 之后的数据（改成事后覆盖校验） | 0 | 2 | 2 | variable、expression |
| `P1` | possible 触发时机/来源偏离（自造挂载点，抢在候选之前） | 1 | 0 | 1 | statement-hook |
| `U3` | 未消费 token 走非 `Reload Message` 的自造通道 | 0 | 1 | 1 | statement-assembly |
| `C1` | 每轮重扫（含跨调用不缓存） | 0 | 1 | 1 | declaration-assembly |
| `B1` | 越界未返回 `Nothing` | 0 | 1 | 1 | variable |

- 本批无 `S1` / `S2` / `S3` / `P2` / `P3` / `P4` / `R1` / `R2` / `U1` / `U2` / `U4` / `C3` / `B3` / `X3` / `D1`：14 个文件的围栏外散文为 0（示例一律收在 `txt` 围栏内，`txt` 内的中文注释按 R01 不算散文）；没有一个文件覆盖 `ExitOrPre` 或 `ComputePossibleShapes`；建出的形状 `Data` 只装子形状、没有残留 basic token（`SignOut` + `TryToClose` 之后由 `statement-shape.xl.md:380` 的 `host.Data.splice(0, consumed.length)` 丢弃 raw 单元），故 `U1`/`U4` 不成立。
- 三条最重的结论：
  1. **注册 + 指标 + 插件装成了「可插拔解析框架」**（`build-session`/`build-router`/`build-plugins`/`build-metrics` 四件，11 条），它确实改写了「谁能建 AST」的边界（R04/R21）：9 个 kind 无条件注册、首次 `Create` 即惰性安装、`Strict` 还能把回退变成异常通道，`Declined` 只是逃生口。
  2. **`DirectStatementHook` 让直建通道抢在 possible 之前**（`P1`）：4 个 `BuildByIndex` 里、catalog 刚装完候选未算时就接管整壳 raw 单元；与之物理相邻的 `StatementShellCatalog` 挂在 `IsIncrementalShapesEnabled()` 门控下且只搬占位节点——同一位置两条轨、开关语义相反，优先权由开关而非设计决定。
  3. **「增量」在 class / module 两个 session 上名存实亡**（`C2`）：`Ingest` 一个判定都不做（class 只推游标、module 只记头文本），全部建树压到 `Finish` 的整段全量 `BuildFromCode` / `Build`；只有 variable / expression 两个会话是真增量（逐单元状态机 / 逐单元喂引擎）。
