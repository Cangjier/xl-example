# 25 语句小文件（收口壳）设计偏离审计

审计对象：`typescript/tokens/statements/` 下 24 个小文件（16 个纯空壳 `XxxStatementShape` + 8 个带逻辑的类，后者含 `BlockShape` / `ExpressionStatementShape` 两个语句形状与 6 个机制/工具类）。判据取自 [01-rules.md](01-rules.md)（R01–R36、编号 S1…D1）；行号为 `read` 返回的真实行号。字节 / 代码行取 [_facts/typescript-tokens-statements.md](_facts/typescript-tokens-statements.md)（任务开始时该表尚未生成，成文时已落地 48 文件版；代码行 = 围栏内代码行数）。只读源码，未跑 gates。

**本批共性**（每节仍逐条给证据）：16 个语句壳的类体只有 `constructor`（`super(template)` 一行），**没有字段、没有 `Close`、没有 `ParseFromShape`**；连 `Kind` 都不在它们身上——`Kind` 是 `StatementShape` 独有的形态标记（`direct-statement-assembly.xl.md:92-93`）。节点由三处直接 `new`：legacy `StatementBuilder`、`direct-*-session`、`StatementShellCatalog.Attach`（按 `constructor.name` 字符串匹配的提前占位，`statement-shell-catalog.xl.md:83-99`、`:249-254`）。全仓库 `ParseFromShape` 只有 1 处且是未实现桩（`typescript/ast/declarations/import-declaration-ast-node.xl.md:28-31`）；等价的形状→AST 桥 `StatementShapeAst.Build` 只接表达式体（`statement-shape-ast.xl.md:64-79`），不接语句壳。24 个文件围栏外均 0 行散文（与 facts 表 `prose=0` 一致），故 `D1` 全批未出现。

### typescript/tokens/statements/statement-token-sets.xl.md（3873B / 80 行；StatementTokenSets）

- 结构：工具类（无状态、纯静态谓词），不属于 basic token / shape / possible / end。两张文本闭集：受限后缀（`:14-27`）与「换行后仍接得上」的单元（`:40-107`），供 ASI 边界层与表达式语句候选调用。
- 偏离：
  - `[X1]` ● 「换行后能否续接上一条表达式」由一张手写符号/关键字白名单决定，并自称是唯一实现——语法层把这一判定让给了词法文本表，IMPORTANCE 没有这一层定义 — 证据 `statement-token-sets.xl.md:43-45`（`// 这是 ExpressionStatementPossibleShape.IsContinuation 的唯一实现`）；调用点 `expression-statement-possible-shape.xl.md:281-284`、`statement-boundary-util.xl.md:1082-1085`；闭集枚举 `statement-token-sets.xl.md:53-100`（`+ - * / … ?. , ? : => ...` 逐条）与 `:25-26`（`++ -- ! ~ typeof as satisfies`）。
- 结论：偏离（1 条）。符合面：纯判定、无状态、无 cache、无副作用、无越界解引用（不触 C1/C3/B1/B2）。

### typescript/tokens/statements/incremental-stuck-shell-recovery.xl.md（2945B / 69 行；IncrementalStuckShellRecovery）

- 结构：设计外的恢复器 + 计数器集合（全静态），不是 shape/possible/end；提供「语句起始词」表、卡死壳判据、EOF 残留计数与残留文本提取。
- 偏离：
  - `[X1]` ● 给 R28 的 `Waiting` 出口加了一条强制收口旁路：连续 `RecoveryCells=2` 格 `Waiting` 且末单元是声明跟随边界 ⇒ 计数后可 `BuildFromShell` + `FinishShell`；IMPORTANCE 只定义「零候选且 `EndPossible` 非空 ⇒ `Waiting`」，没有「等久了就替它收口」— 证据 `incremental-stuck-shell-recovery.xl.md:52-65`（`ShouldRecover` 四道判据）、`:14-24`（`RecoveryCells=2`、`ForceClose=false`）、`:32-37`（24 个起始词的硬编码表）；调用侧 `statement-shape.xl.md:121-139`。
  - `[U3]` ● EOF 残留语句只登记计数，未走 R17④ 的 `Reload Message`；连返回值都被调用方丢掉 — 证据 `incremental-stuck-shell-recovery.xl.md:79-102`（首个 basic 是语句起始词就 `EofDiscardedStatementCount += 1; return true;`）、`source-file-end-possible-shape.xl.md:213`（`IncrementalStuckShellRecovery.CountEofLeftover(host.Data);`），同处注释把这类残留自认作「到 EOF 被静默清掉」`:205-212`。
- 结论：偏离（2 条）。`ForceClose=false` 使其默认只计数、不改行为，但机制已经挂在收口路径上。

### typescript/tokens/statements/expression-statement-shape.xl.md（2662B / 62 行；ExpressionStatementShape）

- 结构：shape 层（`extends ShapeToken`），实为静态工厂 + 收口壳：`FromUnits` 截取 `host.Data[start..tokenIndex]`，交给 `ExpressionBuilder` 建表达式，再 `Add` 成节点并 `TryToClose`；类内无 possible/end。
- 偏离：
  - `[S4]` ● AST 不由关闭后的 shape 产出：工厂把原始 basic token 直接喂 `ExpressionBuilder`，表达式节点与 children 由 builder 决定，本类无 `ParseFromShape`（全仓库唯一那处是未实现桩，不接语句壳）— 证据 `expression-statement-shape.xl.md:65-73`（`builder.Load(expressionUnits, pos); ... builder.ParseExpression(); ... shape.Expression = expression; shape.Add(expression);`）。
  - `[B1]` ○ `host.Data[at]` 从 `start` 到 `tokenIndex` 直接下标、不判越界，越界会先拿 `undefined` 再崩在 `IsTriviaToken` — 证据 `expression-statement-shape.xl.md:36-40`（`for (let at = start; at <= tokenIndex; at++) { if (!host.Data[at].IsTriviaToken) ...`）。
- 结论：偏离（2 条）。符合项：`Close` 主动把 basic token 过滤掉（`:88-100`），关闭后 `Data == [expression]`，不触 U4；静态工厂里立即 `TryToClose`（`:82`）正是 R31 的「立即关闭」形态。

### typescript/tokens/statements/variable-statement-three-layer.xl.md（2331B / 38 行；VariableStatementThreeLayer）

- 结构：设计外的三层判词闸门 + 指标计数器（全静态），不是 shape/possible/end；`TryBuild` 先判词，通过后调 `builder.BuildStatement()`。
- 偏离：
  - `[B2]` ● `Judge` 抛出的异常被 `catch` 吃掉，转成 `FallbackCount += 1` + `null`，异常作为 possible 诊断被抹掉（R23）— 证据 `variable-statement-three-layer.xl.md:56-61`（`try { verdict = VariableDeclarationListUtil.Judge(consumed); } catch { ...FallbackCount + 1; return null; }`）；调用点在建树路径 `statement-shape.xl.md:468`。
  - `[X1]` ● 设计外的开关 + 四计数器 + 「判词失败即回落」：`Enabled`、`StatementCount/ListCount/DeclarationCount/FallbackCount/MismatchCount`；`MismatchCount` 只计不纠（`:71-74`），全文件没有读方 — 证据 `variable-statement-three-layer.xl.md:13-23`、`:51-53`。
- 结论：偏离（2 条）。`CountDeclarations` 只读 `built.Data[0].Data.length`（`:35-46`），不建树、不抛错。

### typescript/tokens/statements/bracket-role-catalog-hook.xl.md（2024B / 24 行；BracketRoleCatalogHook）

- 结构：设计外的全局单例钩子（`extends BracketRoleHook`），由 `Bracket.Transit` 在括号创建时回调；只做「控制头 → 表达式括号 → 参数表」三线分派，每条线自己 `InstallAtBracketCreated`。
- 偏离：
  - `[X1]` ● 设计外的全局单例钩子 + **三个全局开关的乘积**决定它做什么：`SourceFileShape` 构造时在 `EnableExprBracketCatalog`（默认 true）且 `IsIncrementalShapesEnabled()`（默认 true）下把 `EnableBracketRoleCatalog` 置 true，legacy 模式（增量关）则不置；`EnsureInstalled` 又因 `EnableBracketCreatePossible=true`（默认）把钩子装上——于是「括号创建时是否解析角色 / 装目录」由开关乘积决定，同一份语法在增量 / legacy 两种模式下行为不同；另有 `FunctionDeclarationShape.OpenParameterList` 在简单参数表处再置 true，legacy 模式下由此退化成「文件前缀是否出现过简单参数表」的依赖 — 证据 `bracket-role-catalog-hook.xl.md:22-35`、`:44-46`；`statement-route-util.xl.md:1031,1039`、`source-file-shape.xl.md:87-93`、`function-declaration-shape.xl.md:162`。
  - `[P1]` ○ 触发时机随模式分叉：增量模式下该开关在文件级装配时已为 true，`OnBracketCreated` 会在 create 时 install（与 R13 方向一致）；legacy 模式下开关保持 false，`OnBracketCreated` 首句 `return`，create 侧不触发——同一判据在两种模式下的结论相反 — 证据 `bracket-role-catalog-hook.xl.md:44-46`、`source-file-shape.xl.md:87-93`。
  - `[P4]` ● 只有 create 侧、没有 close 侧：全仓库 grep `HandleCloseDispatch` 0 命中；bracket 关闭仍走 `Bracket.Close` 的 `FlushOnClose` + 父单元 `ComputePossibleShapes`，R16 的「直接调用 `HandleCloseDispatch`、possible 与 end 都不再触发」不成立 — 证据 `bracket-role-catalog-hook.xl.md:37-55`（只有 `OnBracketCreated`）、`core/syntax/basic-tokens/bracket.xl.md:81-103`（`Close` 里 `FlushOnClose` 与父单元转调）。
- 结论：偏离（3 条）。三线分派本身只装目录、不改 AST（`:49-55`），且对 `bracket` 做了 null/instanceof 守卫（`:40-43`），不触 B1。

### typescript/tokens/statements/block-shape.xl.md（1263B / 10 行；BlockShape）

- 结构：shape 层（`extends ShapeToken`），块体节点；唯一行为是 `ComputePossibleShapes`：挂载的括号闭合就 `TryToClose`，随后把通知转给父单元。类内无 basic token、无 possible/end、无 catalog。
- 偏离：
  - `[R2]` ● 覆盖 `ComputePossibleShapes`（R34 明令禁止），方法体只是「关自己 + 转父单元」— 证据 `block-shape.xl.md:27-38`（`:35-37` `return (parent as unknown as IComputePossibleShapes).ComputePossibleShapes(context, source);`）。
  - `[S4]` ● 无 `ParseFromShape`、无任何 AST 产出入口；节点由 builder / 直建 session 直接 `new` 再 `Add` 子语句 — 证据 `block-shape.xl.md:14-24`（类体只有 constructor）、`statement-builder.xl.md:1209`、`direct-statement-assembly.xl.md:158`。
  - `[U4]` ○ 关闭走继承的 `ShapeToken.Close`（只置 `Closed`，不清 `Data`）；函数体挂载把 `{` 括号作为 basic token 留在 `Data`，关闭后 `Data` 仍含 basic token——只因最终树由 `FunctionDeclarationShape.FromUnits` 整段重建把壳换掉，才没进 AST — 证据 `block-shape.xl.md:14`（无 Close 覆写）、`function-declaration-shape.xl.md:186`（`block.Add(body);`）、`core/syntax/shape-token.xl.md:58-63`。
  - `[S3]` ○ 同一个类有三种 `Data` 约定：语句块不加括号（`statement-builder.xl.md:1209-1225`）、函数体加括号（`function-declaration-shape.xl.md:186`）、直建明确「括号 / trivia 不进」（`direct-statement-assembly.xl.md:138,165-174`）；关闭后 `Data` 是否等于 AST children 取决于走哪条路。
- 结论：偏离（4 条）。`ComputePossibleShapes` 内无 catch、无越界解引用（`:30-36` 先判 null 与 instanceof），不触 B1/B2。

### typescript/tokens/statements/waiting-end-possible.xl.md（988B / 2 行；WaitingEndPossible）

- 结构：possible 层，但只作 `CatalogGuide.EndPossible` 的占位终结候选：`ComputeByIndex` 恒 `Uncertain`，`BuildByIndex` 必抛。
- 偏离：
  - `[X1]` ● 设计外的「永不 Accept 的终结候选」：它同时顶掉 R27 的「`Candidates>0` ⇒ 终结 Accept 抛错」与 R28 的「零候选且 `EndPossible===null` ⇒ 抛错」两条出口，把「没东西可收口」改成永久 `Waiting` — 证据 `waiting-end-possible.xl.md:18-26`；安装点 `bracket-catalog-installer.xl.md:65-69`（计划里的 End 不是它就替换成它）、`:127-131`、`deferred-bracket-catalog.xl.md:245`。
  - `[P2]` ○ 名为终结候选却永不终结：`Candidates` 永远 ≥1，R26 的 Reject/Accept 二分在它身上退化为恒定 `Uncertain` — 证据 `waiting-end-possible.xl.md:18-20`。
- 结论：偏离（2 条）。`BuildByIndex` 显式抛错且不 catch（`:22-26`），R23 方向正确。

### typescript/tokens/statements/statement-legacy-metrics.xl.md（843B / 7 行；StatementLegacyMetrics）

- 结构：纯静态计数器（7 个 int + `Reset`），不属于任何层；被 builder / scanner / statement-shape / variable-declaration-* 直接 `+= 1`。
- 偏离：
  - `[X1]` ● 设计外的指标通道：7 个计数器只写不读（`Reset` 也只清零，无任何读方），IMPORTANCE 没有这套设施；`ScanRootCallCount` / `RawTailBuildCount` / `ShapeAstDeclinedCount` 等把「走了 legacy 路」变成运行期状态 — 证据 `statement-legacy-metrics.xl.md:9-21`、`:25-33`；写入点 `statement-builder.xl.md:1221`、`statement-scanner.xl.md:149`、`statement-shape.xl.md:493,504`、`variable-declaration-shape.xl.md:572`。
- 结论：偏离（1 条）。无逻辑、无副作用，不触其它判据。

### typescript/tokens/statements/for-of-statement-shape.xl.md（397B / 1 行；ForOfStatementShape）

- 结构：`for…of` 的语句节点空壳（`extends ShapeToken`），类体只有 `constructor`；语义（binding / collection / `for await`）全在 builder / session 侧。
- 偏离：
  - `[S4]` ● 节点只承载类身份（无字段、连 `Kind` 都没有），AST 由 `StatementBuilder` / 直建 session 直接 `new` 后 `Add` 子节点；本类没有 `ParseFromShape` 或等价的「从关闭后的 shape 取 AST」入口 — 证据 `for-of-statement-shape.xl.md:9-21`（`# class ForOfStatementShape extends ShapeToken` + 唯一 `super(template);`）、`statement-builder.xl.md:1965`（`shape = new ForOfStatementShape(this.Template);`）、`direct-control-session.xl.md:870`。
- 结论：偏离（1 条）。`Data` 只由 builder 塞入形状子节点（binding、collection），无 basic token，不触 U4；无 `Close`/possible/`ExitOrPre` 覆写。

### typescript/tokens/statements/try-statement-shape.xl.md（380B / 1 行；TryStatementShape）

- 结构：`try` 语句节点空壳，类体只有 `constructor`；children 约定为 `[Block, CatchClause?, Block?]`，由 builder 拼。
- 偏离：
  - `[S4]` ● 空壳只承载类身份，children 由 `StatementBuilder`（`:2470-2481`）或直建 session（`direct-control-session.xl.md:1180-1181`）直接 `Add`；无 `ParseFromShape` / 等价入口 — 证据 `try-statement-shape.xl.md:9-21`、`statement-builder.xl.md:2470`（`const shape = new TryStatementShape(this.Template);`）。
- 结论：偏离（1 条）。`Data` 只含 `BlockShape` / `CatchClauseShape` 形状节点，无 basic token（`try`/`catch`/`finally` 关键字不进 `Data`），不触 U4。

### typescript/tokens/statements/switch-statement-shape.xl.md（378B / 1 行；SwitchStatementShape）

- 结构：`switch` 语句节点空壳，类体只有 `constructor`；children 约定为 `[condition, CaseBlock]`，case 子句由另一个类 `CaseBlockShape` 承载。
- 偏离：
  - `[S4]` ● 空壳只承载类身份，children 由 builder（`:2271-2274`）或直建 session（`direct-control-session.xl.md:1268`）直接 `Add`；无 `ParseFromShape` / 等价入口 — 证据 `switch-statement-shape.xl.md:9-20`、`statement-builder.xl.md:2271`。
- 结论：偏离（1 条）。`Data` 只含条件形状与 `CaseBlockShape`，无 basic token，不触 U4；`case`/`default` 子句头不在本类。

### typescript/tokens/statements/for-statement-shape.xl.md（377B / 1 行；ForStatementShape）

- 结构：classic `for` 语句节点空壳，类体只有 `constructor`；children 约定为 `[init?, cond?, incr?, body]`。
- 偏离：
  - `[S4]` ● 空壳只承载类身份，children 由 builder（`:1910-1954`）或直建 session（`direct-control-session.xl.md:813`）直接 `Add`；无 `ParseFromShape` / 等价入口。同一 `for` 还会被 `StatementShellCatalog` 按类名三挂（`for`/`for-in`/`for-of` 各先造一个占位，`statement-shell-catalog.xl.md:143-147`），收口时只按 `constructor.name` 留一个——进一步说明本类只是身份标记 — 证据 `for-statement-shape.xl.md:9-21`、`statement-builder.xl.md:1910`。
- 结论：偏离（1 条）。占位壳的 `Data` 为空、最终壳的 `Data` 只含形状子节点，均无 basic token，不触 U4。

### typescript/tokens/statements/for-in-statement-shape.xl.md（375B / 1 行；ForInStatementShape）

- 结构：`for…in` 语句节点空壳，类体只有 `constructor`；children 约定为 `[binding, collection]`。
- 偏离：
  - `[S4]` ● 空壳只承载类身份，children 由 builder（`:1963`）或直建 session（`direct-control-session.xl.md:868`）直接 `Add`；无 `ParseFromShape` / 等价入口，且与 `ForOfStatementShape` 二选一靠 builder 里的 `keywordText === "in"` 字符串判据 — 证据 `for-in-statement-shape.xl.md:9-21`、`statement-builder.xl.md:1961-1966`。
- 结论：偏离（1 条）。`Data` 只含 binding / collection 形状，无 basic token，不触 U4。

### typescript/tokens/statements/if-statement-shape.xl.md（367B / 1 行；IfStatementShape）

- 结构：`if` 语句节点空壳，类体只有 `constructor`；children 约定为 `[condition, then, else?]`；`else` 的悬挂归属由 builder / session 递归决定。
- 偏离：
  - `[S4]` ● 空壳只承载类身份，children 由 `StatementBuilder`（`:1781-1787`）或直建 session（`direct-control-session.xl.md:517-519`）直接 `Add`；无 `ParseFromShape` / 等价入口（全仓库语句壳均无）— 证据 `if-statement-shape.xl.md:9-21`、`statement-builder.xl.md:1781`（`const shape = new IfStatementShape(this.Template); shape.Add(condition); shape.Add(thenStatement);`）。
- 结论：偏离（1 条）。`Data` 只含 expression / 子语句形状，无 basic token，不触 U4。

### typescript/tokens/statements/labeled-statement-shape.xl.md（352B / 1 行；LabeledStatementShape）

- 结构：带标签语句节点空壳，类体只有 `constructor`；children 约定为 `[IdentifierShape, statement]`。
- 偏离：
  - `[S4]` ● 空壳只承载类身份，children 由 builder（`:2183-2185`）或直建 session（`direct-control-session.xl.md:1431`）直接 `Add`；标签名是 builder 用 `IdentifierShape.FromBasicToken` 现造的 — 证据 `labeled-statement-shape.xl.md:9-20`、`statement-builder.xl.md:2175-2186`。
- 结论：偏离（1 条）。`Data` 只含标识符形状与被标记语句，无 basic token，不触 U4。

### typescript/tokens/statements/do-statement-shape.xl.md（348B / 1 行；DoStatementShape）

- 结构：`do…while` 语句节点空壳，类体只有 `constructor`；children 约定为 `[body, condition]`，恢复形态的「无条件」由 builder 塞一个零宽 `IdentifierShape`（`:1846-1858`）。
- 偏离：
  - `[S4]` ● 空壳只承载类身份，builder 里有两处独立构造（正常形态 `:1827`、缺 `while` 的恢复形态 `:1842`），直建 session 一处（`direct-control-session.xl.md:677`）；children 全由调用方 `Add`，无 `ParseFromShape` / 等价入口 — 证据 `do-statement-shape.xl.md:9-20`、`statement-builder.xl.md:1827-1829`。
- 结论：偏离（1 条）。`Data` 只含 body / condition 形状，无 basic token，不触 U4。

### typescript/tokens/statements/throw-statement-shape.xl.md（348B / 1 行；ThrowStatementShape）

- 结构：`throw` 语句节点空壳，类体只有 `constructor`；正常 children 为 `[expression]`，恢复形态由 builder 塞一个零宽 `IdentifierShape`。
- 偏离：
  - `[S4]` ● 空壳只承载类身份，builder 有两处构造（换行 ASI `:2033`、常规 `:2066`），children 由调用方 `Add`；无 `ParseFromShape` / 等价入口。缺操作数时的零宽占位节点也是 builder 手工造的（`:2036-2043`），不是 shape 产出 — 证据 `throw-statement-shape.xl.md:9-20`、`statement-builder.xl.md:2066-2071`。
- 结论：偏离（1 条）。`Data` 只含表达式或零宽 `IdentifierShape`，无 basic token，不触 U4。

### typescript/tokens/statements/continue-statement-shape.xl.md（344B / 1 行；ContinueStatementShape）

- 结构：`continue` 语句节点空壳，类体只有 `constructor`；children 为 `[label]` 或空。
- 偏离：
  - `[S4]` ● 空壳只承载类身份，builder 有两处构造（无标签 ASI `:2117`、带标签 `:2142`），直建 session 一处（`direct-control-session.xl.md:1072`）；children 由调用方 `Add`，无 `ParseFromShape` / 等价入口 — 证据 `continue-statement-shape.xl.md:9-20`、`statement-builder.xl.md:2115-2127`。
- 结论：偏离（1 条）。`Data` 只含 `IdentifierShape` 标签或为空，无 basic token，不触 U4。

### typescript/tokens/statements/while-statement-shape.xl.md（343B / 1 行；WhileStatementShape）

- 结构：`while` 语句节点空壳，类体只有 `constructor`；children 约定为 `[condition, body]`。
- 偏离：
  - `[S4]` ● 空壳只承载类身份，children 由 builder（`:1803-1806`）或直建 session（`direct-control-session.xl.md:617`）直接 `Add`；无 `ParseFromShape` / 等价入口 — 证据 `while-statement-shape.xl.md:9-20`、`statement-builder.xl.md:1803`（`const shape = new WhileStatementShape(this.Template);`）。
- 结论：偏离（1 条）。`Data` 只含 condition / body 形状，无 basic token，不触 U4。

### typescript/tokens/statements/with-statement-shape.xl.md（340B / 1 行；WithStatementShape）

- 结构：`with` 语句节点空壳，类体只有 `constructor`；children 约定为 `[expression, body]`。
- 偏离：
  - `[S4]` ● 空壳只承载类身份，children 由 builder（`:2584-2586`）或直建 session（`direct-control-session.xl.md:1121`）直接 `Add`；无 `ParseFromShape` / 等价入口 — 证据 `with-statement-shape.xl.md:9-20`、`statement-builder.xl.md:2584`。
- 结论：偏离（1 条）。`Data` 只含括号内表达式与 body 形状，无 basic token，不触 U4。

### typescript/tokens/statements/return-statement-shape.xl.md（336B / 1 行；ReturnStatementShape）

- 结构：`return` 语句节点空壳，类体只有 `constructor`；children 为 `[expression]` 或空。
- 偏离：
  - `[S4]` ● 空壳只承载类身份，builder 有两处构造（换行 ASI `:2031`、常规 `:2068`），children 由调用方 `Add`；无 `ParseFromShape` / 等价入口 — 证据 `return-statement-shape.xl.md:9-20`、`statement-builder.xl.md:2030-2031`（`return this.Finish(new ReturnStatementShape(this.Template), first, tail);`）。
- 结论：偏离（1 条）。`Data` 只含表达式形状或为空，无 basic token，不触 U4。

### typescript/tokens/statements/break-statement-shape.xl.md（335B / 1 行；BreakStatementShape）

- 结构：`break` 语句节点空壳，类体只有 `constructor`；children 为 `[label]` 或空。
- 偏离：
  - `[S4]` ● 空壳只承载类身份，builder 有两处构造（无标签 ASI `:2119`、带标签 `:2144`），直建 session 一处（`direct-control-session.xl.md:1073`）；children 由调用方 `Add`，无 `ParseFromShape` / 等价入口 — 证据 `break-statement-shape.xl.md:9-20`、`statement-builder.xl.md:2106-2127`。
- 结论：偏离（1 条）。`Data` 只含 `IdentifierShape` 标签或为空，无 basic token，不触 U4。

### typescript/tokens/statements/debugger-statement-shape.xl.md（330B / 1 行；DebuggerStatementShape）

- 结构：`debugger` 语句节点空壳，类体只有 `constructor`；无 children。
- 偏离：
  - `[S4]` ● 节点身份与区间完全由调用方决定（builder `Finish` / session `Span`），本类没有 `ParseFromShape`，也没有任何「从关闭后的 shape 取 AST」的入口；因本类无子节点，转换面为空，偏离只体现在节点来源上 — 证据 `debugger-statement-shape.xl.md:9-19`、`statement-builder.xl.md:2160-2164`、`direct-control-session.xl.md:1093`。
- 结论：偏离（1 条）。`Data` 恒空，不触 U4；无 `Close`/possible 覆写。

### typescript/tokens/statements/empty-statement-shape.xl.md（319B / 1 行；EmptyStatementShape）

- 结构：空语句（`;`）节点空壳，类体只有 `constructor`；无 children。
- 偏离：
  - `[S4]` ● 与 `DebuggerStatementShape` 同型：节点由 builder（`:1306-1307`）、直建装配（`direct-statement-assembly.xl.md:258`）或直建 session（`direct-control-session.xl.md:326`）直接 `new` + 签区间，本类无 `ParseFromShape` / 等价入口 — 证据 `empty-statement-shape.xl.md:9-19`。
- 结论：偏离（1 条）。`Data` 恒空（`;` 是语句终点、不是子节点），不触 U4。

## 本批统计

- 文件数：24；有偏离文件数：24。
- 按编号计数（共 33 条）：`S4` 18（●18）、`X1` 6（●6）、`U3` 1（●1）、`B2` 1（●1）、`P4` 1（●1）、`R2` 1（●1）、`B1` 1（○1）、`P1` 1（○1）、`U4` 1（○1）、`S3` 1（○1）、`P2` 1（○1）。
- 未出现：`S1`/`S2`/`P3`/`B3`/`B4`/`R1`/`X2`/`X3`/`D1`/`C1`/`C2`/`C3`。24 个文件围栏外 0 行散文（D1=0，与 facts 表 `prose=0` 一致）；无 tsx/JSX 形状（X3=0）；除 `BlockShape` 的 `R2` 外无 `ExitOrPre`/`ComputePossibleShapes` 覆写；只有 `variable-statement-three-layer` 有 `catch`；语句壳自身的 `Data` 只装形状子节点，故 U4 只落在 `BlockShape` 的括号残留上（○）。
- 最严重 3 条：
  1. `[S4]` 16 个语句壳全是「类身份空壳」，18 处无 `ParseFromShape`：AST 由 builder / 直建 session 直接拼，R21 的「关闭后 shape → AST 节点」被类身份合并抹掉（`if-statement-shape.xl.md:9-21`、`statement-builder.xl.md:1781-1788`）。
  2. `[U3]`/`[X1]` 收口壳的两条兜底：卡死壳强制收口与 EOF 残留只计数，分别绕开 R28 的 `Waiting` 出口与 R17④ 的 `Reload Message`（`incremental-stuck-shell-recovery.xl.md:52-65`、`:79-102`）。
  3. `[R2]` `BlockShape` 覆盖 `ComputePossibleShapes` 并转调父单元，另带 `{` 括号残留导致的 `Data` 约定分歧（`block-shape.xl.md:27-38`、`:14`）。
