# 70 设计偏离审计 — typescript/tokens/files 三文件

审计对象：`typescript/tokens/files/` 的 3 个文件（文件级候选：根 shape、文件级终结候选、Bundle 壳）。判据取自 `01-rules.md`（R01–R36 与偏离编号表），设计出处一律写 `docs/IMPORTANCE.md`；行号是 `read` 工具返回的真实行号。本次只读源码与 `docs/IMPORTANCE.md`，未改动任何源码。

### typescript/tokens/files/bundle-shape.xl.md（396B / 1 代码行（全文 19 行）；BundleShape）

- 结构：**shape 层，且只有壳**。`BundleShape extends ShapeToken`（`bundle-shape.xl.md:9`），全文只有一个构造函数（`15-19`），方法体是 `super(template);`；无字段、无 `Close` 覆盖、无 `CatalogGuide`、无 possible/end，也不被任何候选目录引用（源码里除本文件的类声明外无第二处 `BundleShape` 命中，另一处命中是 `docs/importance-1028/_facts/typescript-tokens.md:217` 的事实行）。
- 偏离：

  - `[X1]` ● 设计外的容器：IMPORTANCE 里 shape 的唯一形态是「继承 `ShapeToken` + 由 catalog guide 关联 possible/end」（`IMPORTANCE.md:19-20`），本类既无 guide 也无候选，`Data` 只能由外部直接 `Add`，进来之后也没有任何 `Close` 会收口 — 证据 `bundle-shape.xl.md:15-19`（`## constructor:(template:Template)=>void` → 只有 `super(template);`，类体到此结束）。
  - `[X1]` ○ 它自述是「API 合成」的产物，而设计里没有「由 API 旁路合成 shape」这条通道 — 证据 `bundle-shape.xl.md:11-13`（txt 围栏：「无源码形态：多文件打包（Bundle）由 API 合成，源码里写不出来。」）。
  - `[S3]` ○ 留壳类：若真被挂进形状树，它既无子形状也无收口，`Token.ToAstLine` 会把它当普通节点打印出来（`core/syntax/token.xl.md:257-273`），而 TS 的 `Bundle.children` 是 `SourceFile[]`，层级与子节点无从保证 — 证据 `bundle-shape.xl.md:9`（`# class BundleShape extends ShapeToken`，其下无任何子节点装配代码）。

- 结论：**偏离（3 条：`X1`×2、`S3`×1）**。它的偏离是「多余」而不是「越权」：无 compute/build，故 `B1`–`B4`/`C1`–`C3` 不涉及；无 possible/end，故 `S2`/`P1`–`P4` 不涉及；围栏外 0 行散文（`D1` 0，`11-13` 的说明在 txt 围栏内，按 `IMPORTANCE.md:4` 不算散文）；无 tsx/JSX 形状（`X3` 0）。

### typescript/tokens/files/source-file-shape.xl.md（13660B / 159 代码行（全文 238 行）；SourceFileShape）

- 结构：**shape 层 + 文件级装配点**。它是形状树的根（`ShapeToken`→`UnitToken`→`Token`），在构造函数里（`52-100`）创建 `new CatalogGuide(SourceFileShape.CreatePossibleShapes(), new SourceFileEndPossibleShape())`（`62`），并顺带做一批**全局装配与开关翻转**；`Close`（`102-124`）负责收口全部子单元并过滤；`OnBracketCreatedEvent`（`126-142`）在括号创建事件里手工触发一次 possible；`Process`（`144-171`）处理 EOF（造 `EndOfFileTokenShape` 哨兵并触发收口）；`CreatePossibleShapes`（`177-238`）返回两份静态目录缓存之一。全文无 `ExitOrPre`/`ComputePossibleShapes` 覆盖，无 `catch`，所有可能的创建/淘汰都交给 `CatalogGuide`。

#### SourceFileShape — 两套根目录

- 偏离：

  - `[X1]` ● 文件级候选挂了**两套根目录**并按开关切换：两个静态字段各存一份候选数组（`173`/`175`），legacy 那份是用 `slice()` + `splice(3, 0, new StatementPossibleShape())` 在原第 4 位插回 legacy 根语句候选拼出来的（`226-231`），最后按 `StatementRouteUtil.EnableShellExpressions` 二选一返回（`235-237`） — 证据 `source-file-shape.xl.md:235-237`（`return StatementRouteUtil.EnableShellExpressions ? SourceFileShape.CreatePossibleShapesCache : SourceFileShape.CreateLegacyPossibleShapesCache;`），拼接见 `:229`（`withRootLegacyStatement.splice(3, 0, new StatementPossibleShape());`）。
  - `[X2]` ● 这份 legacy 目录存在的唯一用途是「整文件回退重解析」这条旁路：调用方在默认档抛错后整体换成 legacy 档再解析一遍（`typescript/run/source-file-runner.xl.md:23-30` 的 `catch` → `ParseCore(text, filePath, false)`），本文件的注释把它写成目标（「文件级 fallback 逐位不变」）— 证据 `source-file-shape.xl.md:197`（`// （CreateLegacyPossibleShapesCache），文件级 fallback 逐位不变。`）。
  - `[X2]` ○ 两套目录**共用同一个终结候选实例**：`new SourceFileEndPossibleShape()` 在构造目录时无条件创建（`62`），与选哪份候选表无关，于是 legacy 档同样走同一条 EOF 整段重建兜底（见 `source-file-end-possible-shape.xl.md:213`、`:247-346`），「legacy 逐位不变」在 end 这一侧并不由目录隔离保证 — 证据 `source-file-shape.xl.md:62`（`this.CatalogGuide = new CatalogGuide(SourceFileShape.CreatePossibleShapes(), new SourceFileEndPossibleShape());`）。

#### SourceFileShape — 构造函数里的全局装配

- 偏离：

  - `[X1]` ● 构造函数做了一批设计外的全局装配，并在解析期**改写全局开关**：清静态身份表、条件注册目录，然后直接把 `StatementRouteUtil.EnableBracketRoleCatalog` 置 `true`（`89`、`93`），最后装钩子（`99`） — 证据 `source-file-shape.xl.md:87-93`（`if (StatementRouteUtil.EnableExprBracketCatalog && StatementRouteUtil.IsIncrementalShapesEnabled()) { ExpressionBracketPossibleShape.EnsureRegistered(); StatementRouteUtil.EnableBracketRoleCatalog = true; }`），另见 `:79`（`ControlHeadPossibleShape.ResetAtoms();`）、`:85-86`（`ExpressionAtomRegistry.Reset();` / `ExpressionBracketPossibleShape.Reset();`）、`:99`（`BracketRoleCatalogHook.EnsureInstalled();`）。
  - `[X1]` ○ 分支转发器：用模板算出的队列顶替基类在 `ShapeToken` 构造函数里设好的 `Template.BasicBranchQueue()` — 证据 `source-file-shape.xl.md:58-61`（`const queue = template.BranchTemplate.Get(this.constructor); if (queue !== null) { this.ProcessQueue = queue; }`），被顶替的一侧在 `core/syntax/shape-token.xl.md:21`（`this.ProcessQueue = Template.BasicBranchQueue();`）。
  - `[X1]` ○ 括号监听用静态字段装配：把 `Bracket.ChildBracketCreatedHook` 换成 `BlockBodyChildBracketHook` 实例，并直接调 `BlockPossibleShape.TryMountFunctionBody` 把函数体括号挂进块体目录 — 证据 `source-file-shape.xl.md:129-135`（`if (Bracket.ChildBracketCreatedHook === null) { Bracket.ChildBracketCreatedHook = new BlockBodyChildBracketHook(); }` / `BlockPossibleShape.TryMountFunctionBody(this, bracket, context);`）。

#### SourceFileShape — 括号创建时的自造触发点

- 偏离：

  - `[P1]` ○ 自己造了一个 possible 触发点，并把来源标成 `Close`：在括号创建事件里手工调 `ComputePossibleShapesByIndex(..., PossibleSource.Close)`；框架自带的括号创建触发点在 `Bracket.Transit` 里，用的来源是 `BracketCreate`（`core/syntax/basic-tokens/bracket.xl.md:178-183`） — 证据 `source-file-shape.xl.md:136-141`（`if (... StartBracketChar === "{" && StatementRouteUtil.Decide(this.Data, this.Data.length - 1) === StatementRoute.ShellBlock) { this.ComputePossibleShapesByIndex(this.Data.length - 1, context, PossibleSource.Close); }`）。
  - `[P4]` ○ 括号的「关闭时晋升」不走 `bracket.HandleCloseDispatch`（该机制全库 0 处，`grep` 无命中），而是靠上面那条静态监听 + `Bracket.Transit` 的 `ChildBracketCreatedHook` 补调用（`core/syntax/basic-tokens/bracket.xl.md:149-157`） — 证据 `source-file-shape.xl.md:131-134`（`Bracket.ChildBracketCreatedHook = new BlockBodyChildBracketHook();` 紧接 `BlockPossibleShape.TryMountFunctionBody(...)`）。

#### SourceFileShape.Close — 收口与过滤

- 偏离：

  - `[U4]` ● `Close` 只丢弃 trivia 与 EOF 哨兵，**不丢弃也不提取**残留的非 trivia basic token（`Common`/`Symbol`/`Bracket`），于是关闭后 `Data` 不一定等于 AST 的 children — 证据 `source-file-shape.xl.md:122`（`this.Data = this.Data.filter((item) => !item.IsTriviaToken && !(item instanceof EndOfFileTokenShape));`）。这种残留确实会出现：end 侧承认「未认领的尾单元在 EOF 丢弃、不抛错」（`source-file-end-possible-shape.xl.md:322-325`）并为此设了计数器（`:213`），但那条路径不从 `Data` 里移除任何单元。
  - `[S3]` ○ 因为交付的「AST」就是 shape 树本身（`Root.ToAstLine(0)`，`core/syntax/token.xl.md:257-273`、`cjcli.xl.md:57`），上面那些残留 basic token 会作为 `Common`/`Symbol` 节点行出现在 AST 里，形状树与 TS AST 因此不同构 — 证据 `source-file-shape.xl.md:122`（过滤条件只覆盖 trivia/EOF），渲染一侧 `core/syntax/token.xl.md:264-267`（`const block = this.Data[i].ToAstLine(depth + 1).split("\n");`，对 `Data` 全量递归）。
  - `[X1]` ○ 收口用「两轮 `TryToClose` + 第三轮抛错」的自造收敛策略（第一轮遍历副本、第二轮遍历 `Data`、第三轮才断言），设计里的 close 没有这个重试语义 — 证据 `source-file-shape.xl.md:106-120`（`for (const item of this.Data.slice()) { if (!item.Closed) { item.TryToClose(context); } }` 之后又 `for (const item of this.Data) { ... }`，最后 `throw new Error("SourceFileShape.Close: 有子单元无法关闭");`）。

- 结论：**偏离（11 条：`X1`×5、`X2`×2、`P1`×1、`P4`×1、`U4`×1、`S3`×1）**。本文件是「文件级候选」的装配总闸：一条主线（默认目录 18 个候选 + 一个终结候选）加一条 legacy 旁线（第 4 位插回 `StatementPossibleShape`），线上挂着 20 余个开关位与一批全局钩子。合规项同样需要记明，以免误读：`ExitOrPre` 未覆盖（`R1` 无）、`ComputePossibleShapes` 未覆盖（`R2` 无，`140` 只是调 `CatalogGuide` 的转发方法 `UnitToken.ComputePossibleShapesByIndex:31-38`）；`CreatePossibleShapes` 只建一次就进静态缓存（`180`/`226`），不存在每轮重扫（`C1` 无）；目录缓存不是 possible cache，故 `C3` 不涉及；`Close` 里的 `TryToClose` 不是 compute/build，故 `B2` 无（全文 0 处 `catch`）；越界有兜底（`140` 的 `Data.length - 1` 可能为 `-1`，但 `CatalogGuide:58-61` 对 `undefined` 返回 `Nothing`），故 `B1` 无；围栏外 0 行散文（`D1` 0）；无 tsx/JSX（`X3` 0）。

### typescript/tokens/files/source-file-end-possible-shape.xl.md（73435B / 1461 代码行（全文 1570 行）；SourceFileEndPossibleShape）

- 结构：**终结候选（end）层，但体量上是一座建造器**。一个 `ComputeByIndex`（`51-79`，只判「到齐了吗」）、一个 `BuildByIndex`（`201-359`）、5 个静态判定 helper（`81-199`），其余全是建树：`BuildStatementSegments`（`361-478`）、`BuildTrailingDeclaration`（`497-1540`，单方法 1044 行、14 个 `const isXxx` 关键字分支）、`BuildModuleDeclaration`（`1542-1570`）。静态统计：13 处 `try/catch`、42 处 `splice`、35 处 `FromUnits(`、9 处 `new StatementBuilder`（`235/273/388/423/548/573/829/857/892`）、1 处 `new ExpressionBuilder`（`1138`）、29 处 `for`、28 处 `while`、0 处 `Quit(`；`cache` 与 `source` 两个形参 0 处使用。

#### SourceFileEndPossibleShape.ComputeByIndex — 终结候选的判定

- 偏离：

  - `[P2]` ● Accept 的条件是「**语句**到齐」而不是「**文件形状**完成」：只要 `CanEndStatement` 成立且当前单元不是 `;`，就 `Accept`，于是终结候选在每个语句的换行/ASI 边界都判 Accept — 证据 `source-file-end-possible-shape.xl.md:63-77`（`if (StatementBoundaryUtil.CanEndStatement(units, tokenIndex, false) && !StatementBoundaryUtil.IsSemicolon(units[tokenIndex])) { ... return ShapeStates.Accept; }`）。
  - `[P2]` ● 靠两条「让位」启发式避免 `CatalogGuide` 抛「终结候选与其它候选同时成立」，而不是等候选集合收敛到 0（`IMPORTANCE.md:72-74` 要求 `Candidates == 0` 才 build）：装饰器前缀 → `Uncertain`（`67-69`），被标语句前缀 → `Uncertain`（`73-75`）；两条的注释直接写出了撞车原因 — 证据 `source-file-end-possible-shape.xl.md:66`（`// 类候选还在吃这串装饰器时，终结候选不许 Accept，否则 CatalogGuide 会报「终结候选与其它候选同时成立」。`）与 `:72`（`// ... 于是终结候选 Accept 时普通候选还活着 → CatalogGuide 抛「终结候选与其它候选同时成立」。这里让位给语句候选。`）。
  - `[P2]` ○ 非 EOF 分支在 Accept 之后**只建一条表达式语句就 `return host`**（既不 `SignOut` 也不关闭文件），终结候选的「结束」语义被替换成「建一条语句」 — 证据 `source-file-end-possible-shape.xl.md:214-246`（`if (!(host.Data[tokenIndex] instanceof EndOfFileTokenShape)) { ... const built = ExpressionStatementShape.FromUnits(host, asiStart, end, context, false); host.Data.splice(asiStart, end - asiStart + 1, built); ... return host; }`）。

#### SourceFileEndPossibleShape.BuildByIndex — 结束动作

- 偏离：

  - `[P3]` ○ 结束动作不完整：全文 0 处 `Quit()`，`SignOut` 只在宿主尚未签出时条件性执行，`TryToClose` 落在方法最末 — 证据 `source-file-end-possible-shape.xl.md:351-357`（`if (tail >= 0 && unit.SourceRange.EndIndex < 0) { ... unit.SignOut(end); }` / `unit.TryToClose(context);`）。判 ○ 而非 ● 的原因：根节点的 `SignOut` 已由 `core/syntax/syntax-context.xl.md:97`（`this.Root.SignOut(count);`）完成，而 `Quit` 只清父节点的 `MountedUnit`（`core/syntax/token.xl.md:109-116`），根没有父，缺 `Quit` 无实际后果。
  - `[P3]` ○ 建出的语句走了设计外的第三条去向：既不 `MountedUnit` 挂载（`IMPORTANCE.md:81`），也不是在静态工厂里当场收口（`IMPORTANCE.md:80`），而是由本方法 `splice` 进 `host.Data` 再手工 `Parent = host` — 证据 `source-file-end-possible-shape.xl.md:224-227`（`const built = ExpressionStatementShape.FromUnits(...); host.Data.splice(asiStart, end - asiStart + 1, built); built.Parent = host;`），同款 `:276-277`、`:339-340`、`:437-438`、`:519-520`。
  - `[X1]` ● 指标计数器接管了错误语义：收口前先把「剩下的 basic 代码单元里有没有一条语句被整段吞掉」记进计数器，注释明说**只计数不抛错** — 证据 `source-file-end-possible-shape.xl.md:205-213`（`// **这里只计数，不抛错**：... 计数落在 StatementRouteUtil.EofDiscardedStatementCount。` / `IncrementalStuckShellRecovery.CountEofLeftover(host.Data);`），计数器本体在 `typescript/tokens/statements/incremental-stuck-shell-recovery.xl.md:79-102`（`:100` `StatementRouteUtil.EofDiscardedStatementCount += 1;`）。

#### SourceFileEndPossibleShape.BuildTrailingDeclaration — 关键字文本枚举

- 偏离：

  - `[X1]` ● 终结候选兼任语句/声明建造器：`BuildTrailingDeclaration` 用 14 个 `const isXxx` 按**代码单元文本**把整段尾料分派到 `ClassDeclarationShape.FromUnits` / `FunctionDeclarationShape.FromUnits` / `StatementBuilder` / `ExpressionBuilder` 等入口（`export` 变量、`export` 默认、`export =`、`export as namespace`、无体 module、`declare type`、`import x = require` …），并手工补零宽 `;` 再造形状 — 证据 `source-file-end-possible-shape.xl.md:1447-1455`（`const semi = new Symbol(host.Template); semi.SignIn(lastEnd); semi.AppendValueAndSignOut(";", lastEnd - 1); host.Data.splice(at + 1, 0, semi); ... TypeAliasDeclarationShape.FromUnits(host, start, at + 1, context);`），分支枚举见 `:804-817`、`:866-877`、`:995-1001`、`:1159-1168`、`:1172-1176`、`:1197-1204`、`:1322-1330`。
  - `[X2]` ● 整段 raw 重建即旁路：从 `ItemUtil.ItemStart(host.Data)` 到最后一个代码单元整段重建，注释自称「EOF 兜底」「能建几条建几条」，且明确知道它在替代正常候选 — 证据 `source-file-end-possible-shape.xl.md:322-325`（`// 建不出来就交给 EOF 收尾——与 IncrementalStuckShellRecovery.CountEofLeftover 同一条既有口径（未认领的尾单元在 EOF 丢弃、不抛错）。`）。
  - `[C2]` ● 全量替代增量：整段重建的输入是 raw basic token（`host.Data` 的切片），**不读任何已建形状的 `Data`**，也不问任何候选；`BuildStatementSegments` 每条语句都新起一个 `StatementBuilder` 从头解析 — 证据 `source-file-end-possible-shape.xl.md:388-389`（`const builder = new StatementBuilder(host.Template, context); builder.Load(host.Data.slice(cursor, limit + 1), basePos);`），同款 `:273-274`、`:548-549`、`:829-830`、`:857-858`、`:1138-1139`。
  - `[C1]` ● 每轮重扫：一个 8 轮循环里每轮重算 `ItemStart`、`LastCodeIndex` 再整段重建，退出条件只看数组长度是否变化 — 证据 `source-file-end-possible-shape.xl.md:298-301`（`for (let round = 0; round < 8 && host.Data.length !== previousLength; round++) { previousLength = host.Data.length; const roundStart = ItemUtil.ItemStart(host.Data); const roundAt = SourceFileEndPossibleShape.LastCodeIndex(host);`）；helper 内部同样是线性扫描，例如 `:369`、`:379`、`:411`、`:502`、`:631-642`、`:881`、`:961`、`:1223`。
  - `[C3]` ● cache 语义完全缺席：`cache` 与 `source` 只出现在签名里（全文仅 `11` 的 import 与 `51` 的形参列表两处），0 处 `GetState`/`SetState`/`GetShare`/`SetShare`；库本来提供了 `GetItemStart`/`SetItemStart`（`core/syntax/possible-shape-cache.xl.md:51-65`）与 `ItemUtil.ItemStartCached`（`typescript/tokens/item-util.xl.md:78-88`），这里一次没用 — 证据 `source-file-end-possible-shape.xl.md:51`（`## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates`，其后 0 处引用 `cache`）。

#### SourceFileEndPossibleShape — 异常与未消费 token

- 偏离：

  - `[B2]` ● 13 处 `try/catch` 全部把异常吃掉（`IMPORTANCE.md:66` 明令禁止）：建不出来就 `built = false` / `statement = null` / `return false`，用户拿不到任何诊断 — 证据 `source-file-end-possible-shape.xl.md:306-310`（`try { built = SourceFileEndPossibleShape.BuildTrailingDeclaration(...); } catch (trailError) { built = false; }`），同款 `:312-316`、`:335-343`、`:391-395`、`:400-404`、`:576-582`、`:585-589`、`:791-793`、`:1026-1059`、`:1210-1248`、`:1476-1489`、`:1492-1500`、`:1526-1534`。
  - `[U1]` ● 应消费未消费（整条语句被壳吞到 EOF）被降级成计数而不是 build 错误，且注释说明了不报错的理由是「抛错会把整份文件打成崩溃」 — 证据 `source-file-end-possible-shape.xl.md:211-212`（`// 把这一格翻成显式抛错会同时翻转「增量路径 0 抛错」这个全局卖点`），与 `:324-325`（`抛错只会把整份文件打成崩溃；而尾段兜底存在的意义就是「能建几条建几条」。`）。
  - `[U3]` ○ 未消费 token 不走 `Reload Message`（`IMPORTANCE.md:42`），而是走 `StatementBuilder`/`ExpressionBuilder`/`FromUnits` 的直建通道 — 证据 `source-file-end-possible-shape.xl.md:1138-1140`（`const builder = new ExpressionBuilder(host.Template, context); builder.Load(host.Data.slice(codeAt[2], at + 1), basePos); const expression = builder.ParseExpression();`），同款 `:273`、`:388`、`:423`、`:548`、`:1503`。
  - `[U4]` ○ 未消费的 basic token 既不进 build 产出，也不从 `host.Data` 移除：`CountEofLeftover` 只遍历读取（`incremental-stuck-shell-recovery.xl.md:82-93`，无删除），最终由 `SourceFileShape.Close` 的过滤器决定去留，而那个过滤器只认 trivia 与 EOF — 证据 `source-file-end-possible-shape.xl.md:213`（`IncrementalStuckShellRecovery.CountEofLeftover(host.Data);`，其后到 `357` 只有 `splice` 已建语句、没有删除残留 basic token 的逻辑）。

#### SourceFileEndPossibleShape — 越界与读取范围

- 偏离：

  - `[B1]` ○ 越界返回 `Uncertain` 而不是 `Nothing`（`IMPORTANCE.md:70`）：不抛错也不解引用，但在「调用方按旧长度遍历」的场景里，`Uncertain` 的含义是「还活着、继续等」，与「这一格没有数据」不同 — 证据 `source-file-end-possible-shape.xl.md:54-56`（`if (tokenIndex < 0 || tokenIndex >= units.length) { return ShapeStates.Uncertain; }`）。注：`Nothing` 这条返回值在 `CatalogGuide` 一侧（`core/syntax/catalog-guide.xl.md:58-61`），候选的 `ComputeByIndex` 返回类型是 `ShapeStates`，故只判疑似。
  - `[B4]` ○ 读取范围不以 `tokenIndex` 为界：以 `host.Data.length - 1`（`LastCodeIndex`）为右端，并在每轮 `splice` 之后继续读同一个数组 — 证据 `source-file-end-possible-shape.xl.md:191-198`（`let at = host.Data.length - 1; while (at >= 0 && (host.Data[at].IsTriviaToken || host.Data[at] instanceof EndOfFileTokenShape)) { at--; }`），使用点 `:301`、`:327`、`:347-350`。

- 结论：**偏离（17 条：`P2`×3、`P3`×2、`X1`×2、`X2`×1、`C1`×1、`C2`×1、`C3`×1、`B1`×1、`B2`×1、`B4`×1、`U1`×1、`U3`×1、`U4`×1）**。这是本批最重的一处：R27 的「`Candidates == 0` 才 `BuildByIndex`，`Candidates > 0` 抛错」在 `CatalogGuide` 一侧是成立的（`core/syntax/catalog-guide.xl.md:71-85`），但本文件的 `ComputeByIndex` 把 Accept 下调到**每个语句的 ASI 边界**，于是终结候选实际上被当成「语句收口器 + EOF 兜底重建器」使用，`BuildByIndex` 里那 1044 行的 `BuildTrailingDeclaration` 就是第二条建树管线（与 `StatementBuilder`、`StatementPossibleShape`、`DeclarationStatementPossibleShape` 的职责重叠）。R28（零候选且无 end 抛错）与本文件无关，由 `CatalogGuide:86-91` 保证，未偏离。合规项：候选形态正确（`extends PossibleShape`，只有 `ComputeByIndex`/`BuildByIndex`，未覆盖 `ExitOrPre`（`R1` 0）、未覆盖 `ComputePossibleShapes`（`R2` 0））；同一格内不跳跃处理（`B3` 未成立：它整段重建，不在未消费 token 之前跨格取后面的形状）；围栏外 0 行散文（`D1` 0）；无 tsx/JSX（`X3` 0）。**附注（不计入偏离条目）**：`:865` 与 `:986` 两行注释是 UTF-8 乱码（`// export const x = 1` 之后的汉字被解成「鏃犲垎鍙峰埌 EOF…」），位于 ts 围栏内，不构成 `D1`，但已经不可读。

## 本批统计

- 文件数：3
- 有偏离文件数：3（`bundle-shape` 3 条、`source-file-shape` 11 条、`source-file-end-possible-shape` 17 条）
- 按编号计数：`X1:9 X2:3 P2:3 P3:2 S3:2 U4:2 P1:1 P4:1 C1:1 C2:1 C3:1 B1:1 B2:1 B4:1 U1:1 U3:1`（合计 31 条）
- 本批未出现的编号：`S1`、`S2`、`S4`、`R1`、`R2`、`B3`、`U2`、`X3`、`D1`、`N`
- 本批最严重 4 条：
  1. `[P2]` 文件级终结候选把 Accept 下调到每个语句的 ASI 边界，再用两条「让位」启发式躲开「终结候选与其它候选同时成立」，而不是等候选收敛到 0（`source-file-end-possible-shape.xl.md:63-77`）。
  2. `[C2]`+`[X2]` `BuildByIndex` 就是一条整段 raw 重建旁路：1044 行的 `BuildTrailingDeclaration` + `BuildStatementSegments` 从 basic token 重新建语句，不读任何已建形状（`source-file-end-possible-shape.xl.md:247-346`、`:497-1540`）。
  3. `[X1]`+`[X2]` 文件级候选挂了两套根目录、由 `EnableShellExpressions` 切换，legacy 那份只为整文件回退重解析保留，且两套共用同一个终结候选（`source-file-shape.xl.md:226-237`、`:62`；`typescript/run/source-file-runner.xl.md:23-30`）。
  4. `[B2]`+`[U1]` 13 处 `try/catch` 把建树失败全部吃掉，「应消费未消费」只记计数器不抛错，与 `IMPORTANCE.md:66`、`:38-39` 直接相反（`source-file-end-possible-shape.xl.md:205-213`、`:306-316`）。
