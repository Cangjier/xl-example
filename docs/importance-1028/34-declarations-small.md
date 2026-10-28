# 34 declarations 小文件批（shape 壳 / possible / end / 工具）（审计）

审计对象：`typescript/tokens/declarations/` 下 25 个小文件。判据见 [01-rules.md](01-rules.md)，事实行（字节 / 代码行）取自 [_facts/typescript-tokens-declarations.md](_facts/typescript-tokens-declarations.md)，证据行号以 `read` 返回值为准。只读源码，未改任何源码与 `docs/IMPORTANCE.md`。

### typescript/tokens/declarations/import-attributes-possible-shape.xl.md（3994B / 80 行；ImportAttributesScan、ImportAttributesPossibleShape）
- 结构：possible 层。一个候选 + 每候选一份增量扫描 state（`Checked/LastCode/PreviousCode/HasShape`）；Build 走 `ImportAttributesShape.FromBracket` 静态工厂（工厂内 `SignIn`/`SignOut`/`TryToClose`），属 R31 的「立即关闭」去向。
- 偏离：
  - `[B1]` ○ BuildByIndex 直接解引用 `host.Data[index]`（`index` 即 `tokenIndex`），只守了下界没守上界，调用方按旧长度遍历时会解引用 `undefined` — 证据 `import-attributes-possible-shape.xl.md:98-102`（`let index = tokenIndex; while (index >= 0 && host.Data[index].IsTriviaToken)`）。
  - `[C3]` ○ state 只有「`Checked > tokenIndex + 1` 就回退」这一种复位，Build 之后既不 reset 也不清缓存，下一次复用只能靠回退分支整段重扫 — 证据 `import-attributes-possible-shape.xl.md:46-51`、`:61`（`state.Checked = tokenIndex + 1;`，无 build 后 reset）。
  - `[P3]` ○ Accept 之后 Build 找不到括号或关键字就静默 `return host`，一个形状都不产出，也没有任何诊断 — 证据 `import-attributes-possible-shape.xl.md:102-104`、`:110-112`（`return host;`）。
- 结论：偏离（3 条）。补充：compute 越界返回 `Uncertain`、无 `try/catch`（无 `B2`）、只读到 `tokenIndex`（无 `B4`）、只跳 trivia（无 `B3`）；`with`/`assert` 与括号在 build 时被换成形状、basic token 用后即丢（`R19`/`R35` 成立）。

### typescript/tokens/declarations/import-specifier-shape.xl.md（3443B / 72 行；ImportSpecifierShape）
- 结构：leaf shape + 静态工厂 `FromTokens(units, context, pos)`，由 `NamedImportsShape.FromBracket` 在括号关闭时调用；工厂末尾 `SignIn`/`SignOut`/`TryToClose`（R31）。
- 偏离：无（符合：R31 立即关闭；R19 全组 basic token 在 build 那一刻转成 `IdentifierShape`/`StringLiteralShape` 并只把形状放进 `Data`，`type`/`as` 与 trivia 用后即丢；R20 关闭后 `Data` 只剩子形状；`pos` 由调用方给出，组内看不到括号那一格，本形状自身不越界读数据）。
- 结论：符合。补注：`:73`（`shape.PropertyName = firstShape as IdentifierShape;`）在字符串字面量分支上是把 `StringLiteralShape` 强转成 `IdentifierShape`，字段类型本已是联合类型，属类型说谎而非设计偏离。

### typescript/tokens/declarations/variable-declaration-scan-util.xl.md（3298B / 108 行；VariableDeclarationScan、VariableDeclarationUtil）
- 结构：工具层（不是 shape / possible / end）。一个声明扫描状态机 `VariableDeclarationScan`（`Stage/AngleDepth/NameSeen/TypeStarted/InitializerStarted/Rejected/Done/DoneAt`）+ 两个静态方法 `Advance`（逐 token 推进）、`VerifyItems`（数出这条语句里有几条声明）。
- 偏离：
  - `[X1]` ● 设计外的「声明判界 + 条目计数」扫描器：声明到哪里结束、有几个声明、`<`/`>`/`>>` 的角度深度、`!` 断言、`,`/`;` 边界全由这套状态机判，IMPORTANCE 里没有这层机制 — 证据 `variable-declaration-scan-util.xl.md:11-29`（8 个状态字段 + `class VariableDeclarationUtil`）、`:31-33`（`Advance` 签名）、`:58-107`（`Stage` 迁移 + `AngleDepth` 加减）。
  - `[B4]` ○ 接口没有 `tokenIndex` 概念，整段 `units` 都在视野内（含当前判定格之后的数据），判界天然越过 R22 的「只看之前」 — 证据 `variable-declaration-scan-util.xl.md:110-118`（`VerifyItems:(units:Array<Token>)=>int`、`for (let at = 0; at < units.length; at++)`）。
  - `[C3]` ○ state 不落户 possible cache，每次调用都 `new VariableDeclarationScan()` 从零开始，重复调用即整段重来 — 证据 `variable-declaration-scan-util.xl.md:117`、`:138`（`state = new VariableDeclarationScan();`）。
- 结论：偏离（3 条）。补充：`Advance` 单趟逐格推进、无 for/while 回扫（本文件无 `C1`）；无 `try/catch`（无 `B2`）；`VerifyItems` 只返回数量，不产出任何形状（不涉及 `P3`）。

### typescript/tokens/declarations/export-specifier-shape.xl.md（3296B / 68 行；ExportSpecifierShape）
- 结构：leaf shape + 静态工厂 `FromTokens(units, context, pos)`，由 `NamedExportsShape.FromBracket` 在括号关闭时调用；工厂末尾 `SignIn`/`SignOut`/`TryToClose`（R31）。
- 偏离：无（符合：R31 立即关闭；R19 在 build 那一刻把 `type` 修饰、`as`、逗号 trivia 全部消化掉，只把 `IdentifierShape`/`StringLiteralShape` 放进 `Data`（`:49-92`）；R20 关闭后 `Data` 与 AST 的 children 同构（无 `as` 时把 `PropertyName` 移到 `Name`，`:93-96`）；R35 用后即丢）。
- 结论：符合。补注：两个字段声明成 `Token | null`（`:23`、`:25`），比 import 侧的联合类型弱，AST 侧属性类型无从约束。

### typescript/tokens/declarations/export-assignment-shape.xl.md（3295B / 66 行；ExportAssignmentShape）
- 结构：shape + build 期工厂 `FromUnits(host, start, tokenIndex, ...)`；`Data` 只收一个 `Expression`，`export`/`=`（或 `default`）/`;` 全部不进 `Data`。
- 偏离：
  - `[S4]` ● 表达式子树由 `ExpressionBuilder` 在工厂里直接建 AST 再 `Add` 进 shape，AST 不由关闭后的 shape 产出，也不经过 possible/形状收敛 — 证据 `export-assignment-shape.xl.md:72-81`（`const builder = new ExpressionBuilder(host.Template, context); builder.Load(...); const expression = builder.ParseExpression(); ... shape.Add(expression);`）。
  - `[B1]` ● `host.Data[at]` 在 `start..tokenIndex` 上没有任何上界检查，`tokenIndex` 超出 `Data` 长度时直接解引用 `undefined` — 证据 `export-assignment-shape.xl.md:35-36`（`for (let at = start; at <= tokenIndex; at++) { if (!host.Data[at].IsTriviaToken)`）。
- 结论：偏离（2 条）。补充：声明不完整时抛错外露、不 catch（`R23` 合规，`:42`/`:48`/`:53`/`:56`）；只读到 `tokenIndex`（无 `B4`）；`TryToClose` 覆写只裁尾 trivia（`:94-102`，不碰 `ExitOrPre`，无 `R1`）。

### typescript/tokens/declarations/named-exports-possible-shape.xl.md（3220B / 61 行；NamedExportsScan、NamedExportsPossibleShape）
- 结构：possible 层。一个候选 + 增量扫描 state（`Checked/HasShape/LastCode/PreviousCode`）；Build 走 `NamedExportsShape.FromBracket`（工厂内立即关闭），再把 `{…}` 那一格 splice 成形状。
- 偏离：
  - `[B1]` ○ BuildByIndex 从 `tokenIndex` 起解引用 `host.Data[index]`，只有 `index >= 0` 的下界守卫 — 证据 `named-exports-possible-shape.xl.md:89-93`（`while (index >= 0 && host.Data[index].IsTriviaToken)`）。
  - `[P3]` ○ Accept 之后若那一格不是 `{` 括号就静默 `return host`，不建形状也无诊断 — 证据 `named-exports-possible-shape.xl.md:93-95`。
  - `[C3]` ○ state 仅靠回退分支复位（`Checked > tokenIndex + 1`），Build 之后无 reset — 证据 `named-exports-possible-shape.xl.md:47-51`、`:62`。
- 结论：偏离（3 条）。补充：增量扫描（`for (let at = state.Checked; ...)`，无 `C1`）、越界返回 `Uncertain`、无 `B2`；把 `with`/`assert` 后的 `{…}` 判给 ImportAttributes（`:78-82`），避免两个目录抢同一括号。

### typescript/tokens/declarations/named-imports-possible-shape.xl.md（3141B / 55 行；NamedImportsScan、NamedImportsPossibleShape）
- 结构：possible 层。一个候选 + 增量扫描 state（`Checked/HasShape/LastCode`）；Build 走 `NamedImportsShape.FromBracket` 并 splice 那一格。
- 偏离：
  - `[B1]` ○ BuildByIndex 解引用 `host.Data[index]` 时只守下界 — 证据 `named-imports-possible-shape.xl.md:79-83`。
  - `[P3]` ○ 不是 `{` 括号就静默 `return host` — 证据 `named-imports-possible-shape.xl.md:83-85`。
  - `[C3]` ○ 无 build 后 reset，只有回退分支复位 — 证据 `named-imports-possible-shape.xl.md:44-48`、`:57`。
- 结论：偏离（3 条）。补充：增量扫描、无 `C1`；末位是逗号时返回 `Uncertain` 等子句继续长（`:69-72`），属候选语义的合理细化而非 `P2` 偏离。

### typescript/tokens/declarations/namespace-export-declaration-possible-shape.xl.md（5514B / 106 行；NamespaceExportDeclarationScan、NamespaceExportDeclarationPossibleShape）
- 结构：possible 层 + 设计外的「族级 mount 转发」。自带 5 阶段扫描 state（`Start/Checked/Stage/Done/DoneAt/Rejected`），但 compute / `IsBuildable` / build 三个入口都先问 `ImportExportLegacyDeclarationMount.Ready/TryBuild`。
- 偏离：
  - `[X1]` ● 形状由一个「legacy 声明 mount」直接建：`Ready` 命中时 compute 直接 `Accept`、`IsBuildable` 直接 true、build 交给 `TryBuild` 返回现成形状，绕开本候选自己的扫描 state 与 `NamespaceExportDeclarationShape.FromUnits` — 证据 `namespace-export-declaration-possible-shape.xl.md:45-48`、`:134-136`、`:145-150`。
  - `[P2]` ○ 候选在第三个关键字格（`export as namespace`）就 `Accept`，判定粒度是「族前缀」而不是一条完整声明，终结语义不再由完整收敛决定 — 证据 `namespace-export-declaration-possible-shape.xl.md:45-48`（`if (...Ready(...)) { return ShapeStates.Accept; }`，位于 `state` 扫描之前）、`:55`（越界检查在其后才出现）。
  - `[P1]` ○ 该族的候选收敛点被改成一个「族判定格」+ mount，IMPORTANCE 的触发点只有 bracket create / 字符推进两种 — 证据 `namespace-export-declaration-possible-shape.xl.md:45`、`:146`（`TryBuild(...)`）。
  - `[C1]` ○ 正常路径下 build 在 state 缺失时用 `ItemUtil.ItemStart(host.Data)` 从头扫一段 — 证据 `namespace-export-declaration-possible-shape.xl.md:152-153`。
- 结论：偏离（4 条）。补充：本路径越界有 `start > tokenIndex` 守卫（`:154-156`，无 `B1`）；声明正文的分阶段扫描仍按 `state.Checked` 增量推进；无 `try/catch`。

### typescript/tokens/declarations/type-alias-literal-start-possible-shape.xl.md（3033B / 48 行；TypeAliasLiteralStartPossibleShape）
- 结构：挂在 `{` 括号上的 possible，实际充当「目录安装器」：Compute 判括号里是不是映射类型，Build 只把宿主的 `CatalogGuide` 换成接口体目录并原样返回宿主。
- 偏离：
  - `[C1]` ● ComputeByIndex 每次调用都把整个 `units` 全扫两遍（先找首个 code 单元，再逐个 `[` 括号找 `in`），没有任何 state/cache — 证据 `type-alias-literal-start-possible-shape.xl.md:35-40`、`:56-68`。
  - `[B4]` ● 两次全扫都直接遍历整个 `units`，越过 `tokenIndex` 去看后面尚未就绪的数据 — 证据 `type-alias-literal-start-possible-shape.xl.md:35`、`:56`（`for (const unit of units)`）。
  - `[P3]` ● Accept 之后 build 一个形状都不产出：只写宿主 `CatalogGuide` 再 `return host` — 证据 `type-alias-literal-start-possible-shape.xl.md:75-82`。
  - `[P1]` ● 用 possible 的 build 当「安装目录」的触发点，并另配一个静态 `Install` 入口，等于自造第二、第三个触发点，而 R13/R14 的安装点只有 bracket create — 证据 `type-alias-literal-start-possible-shape.xl.md:22-26`、`:75-77`。
  - `[X1]` ○ 向宿主外壳回写 `MemberCatalogInstalled` 开关位以告知「目录已装」 — 证据 `type-alias-literal-start-possible-shape.xl.md:78-81`（`(shell as TypeAliasDeclarationShape).MemberCatalogInstalled = true;`）。
- 结论：偏离（5 条）。补充：越界有 `tokenIndex` 守卫并返回 `Uncertain`；无 `try/catch`。

### typescript/tokens/declarations/module-declaration-end-possible-shape.xl.md（2600B / 50 行；ModuleDeclarationEndPossibleShape）
- 结构：end possible（终结候选）。Compute 只看当前格（`{` 闭合 / `;` 闭合 / EOF）；Build 把外壳 `Data` 整段重拼后交给 `ModuleDeclarationShape.FromUnits` 重建，再由 `BodyGuideUtil.FinishShell` 收口。
- 偏离：
  - `[C2]` ● 能增量收口却走全量重建：Build 从头遍历整个外壳 `Data`、拼出 `code`/`positions` 两数组，一次性 `FromUnits` 重新建形状 — 证据 `module-declaration-end-possible-shape.xl.md:56-73`。
  - `[B4]` ○ Build 遍历 `shell.Data` 到 `lastCode = shell.Data.length - 1`，不受 `tokenIndex` 截断，close 那一刻之后挂在壳上的单元也被读进来 — 证据 `module-declaration-end-possible-shape.xl.md:44-52`、`:59-69`。
  - `[P3]` ○ 没有可收的 code 时（`lastCode < 0` 或 `code.length === 0`）静默 `return shell`，候选已 Accept 却什么都没收口 — 证据 `module-declaration-end-possible-shape.xl.md:53-55`、`:70-72`。
- 结论：偏离（3 条）。补充：Compute 是逐格无状态判定、越界返回 `Uncertain`（无 `B1`/`C1`/`C3`）；无 `try/catch`。

### typescript/tokens/declarations/import-clause-end-possible-shape.xl.md（2568B / 49 行；ImportClauseEndScan、ImportClauseEndPossibleShape）
- 结构：end possible。Compute 增量记最后一个 code 单元，在 `from` 上 Accept；Build 对宿主 `UnitToken` 做 `SignOut → TryToClose → Quit`，并用 `ReloadMessage` 把 `from` 还给父级（R17④）。
- 偏离：
  - `[B1]` ● BuildByIndex 无守卫地解引用 `host.Data[tokenIndex]` — 证据 `import-clause-end-possible-shape.xl.md:66-68`（`const fromUnit = host.Data[tokenIndex]; if (fromUnit.SourceRange.Start !== null ...`）。
  - `[C3]` ○ state 只在回退分支复位，Build 之后无 reset/清理 — 证据 `import-clause-end-possible-shape.xl.md:42-45`、`:51`。
  - `[X1]` ○ 用 `as any` 绕过类型直接改父单元的挂载位来卸载自己，生命周期不走统一的收口工具 — 证据 `import-clause-end-possible-shape.xl.md:83-85`（`(unit.Parent as any).MountedUnit = null;`）。
- 结论：偏离（3 条）。补充：`ReloadMessage.FromRange` 是 R17④ 允许的通道（`:69`），不是 `U3`；Compute 增量、越界返回 `Uncertain`、无 `B2`。

### typescript/tokens/declarations/named-exports-shape.xl.md（2129B / 36 行；NamedExportsShape）
- 结构：shape。`FromBracket` 在 `{…}` 关闭后按逗号把 `bracket.Data` 切成组，逐组调 `ExportSpecifierShape.FromTokens` 建子形状，然后 `SignIn`/`SignOut`/`TryToClose` 立即关闭（R31）。
- 偏离：无（符合：R31 立即关闭；R19/R35 逗号与 trivia 用后不进 `Data`，`Data` 只装 `ExportSpecifierShape`（`:55-59`）；R20 关闭后 `Data` 等价于 AST children；空尾组返回 `null` 被跳过，不产生空壳）。
- 结论：符合。补注：分组切法（`:33-54`）与 `named-imports-shape.xl.md:32-53` 逐行重复，属重复实现而非判据偏离。

### typescript/tokens/declarations/named-imports-shape.xl.md（2116B / 36 行；NamedImportsShape）
- 结构：shape。`FromBracket` 在 `{…}` 关闭后按逗号切组、逐组 `ImportSpecifierShape.FromTokens`，随后立即关闭（R31）。
- 偏离：无（符合：R31 立即关闭；R19/R35 逗号与 trivia 不进 `Data`（`:54-58`）；R20 `Data` 只剩 specifier 形状；`pos` 由括号/逗号右边界推出，子形状不自行回看宿主）。
- 结论：符合。

### typescript/tokens/declarations/import-clause-shape.xl.md（2109B / 23 行；ImportClauseShape）
- 结构：shape。构造时装目录：`CatalogGuide([NamedImportsPossibleShape, NamespaceImportPossibleShape], ImportClauseEndPossibleShape)`（`:37`），终结候选非空（R28 前提成立）；`Close` 里把 `Data` 过滤成子形状并按类型落进 `Name`/`NamedBindings`。
- 偏离：无（符合：R19/R20 —— `Close` 只保留 `IdentifierShape`/`NamedImportsShape`/`NamespaceImportShape` 并 `this.Data = kept`（`:44-57`），随后再校验 `Data` 里没有 basic token（`:58-62`）；`IsTypeOnly`/`PhaseModifier` 由 `import-clause-possible-shape.xl.md:279-280` 写入，不是死字段）。
- 结论：符合。补注：`Close` 自己 `this.Closed = true; ... return CloseStates.Nothing`（`:43`、`:63`）与基类 `shape-token.xl.md:58-62` 同义，覆写只为过滤，没动 `ExitOrPre`/`ComputePossibleShapes`。

### typescript/tokens/declarations/variable-declaration-list-util.xl.md（2039B / 60 行；VariableListVerdict、VariableDeclarationListUtil）
- 结构：工具层（设计外的「整条变量语句判官」）。`Judge(units)` 回答「是不是 `let/const/var` 声明列表、几条声明、末位有没有 `;`」，裁决结果被 `VariableStatementThreeLayer.TryBuild` 用来决定要不要走 legacy 全量建树。
- 偏离：
  - `[X1]` ● 判界与计数在设计外完成：正扫取头、正扫取绑定、反扫取末位、交给扫描器数条目，最后由 `State=0/1/2` 三态告诉调用方「可以全量建 / 放弃」 — 证据 `variable-declaration-list-util.xl.md:22-24`、`:39-49`、`:61-64`、`:76-86`。
  - `[C1]` ○ 一次 `Judge` 对同一 `units` 遍历四趟（头、绑定、末位、尾部再交给 `VerifyItems`），全程无 cache，重复调用整段重来 — 证据 `variable-declaration-list-util.xl.md:29`、`:51`、`:66`、`:79`。
  - `[B2]` ○ 本判官没有「判不了」的返回值，只能靠调用点 `try/catch` 兜底，异常诊断被吞成 fallback 计数 — 证据 `variable-declaration-list-util.xl.md:80-83`（失败一律 `State = 2`）、`variable-statement-three-layer.xl.md:56-61`（`try { verdict = VariableDeclarationListUtil.Judge(consumed); } catch { ... return null; }`）。
  - `[B4]` ○ 签名没有 `tokenIndex`，整段 `units`（含当前判定格之后）都在视野内 — 证据 `variable-declaration-list-util.xl.md:24`、`:79`（`units.slice(bindingAt)`）。
- 结论：偏离（4 条）。补充：本文件不建形状、不涉 `P3`；无 tsx 形状（无 `X3`）；无围栏外散文（无 `D1`）。

### typescript/tokens/declarations/class-declaration-end-possible-shape.xl.md（2000B / 20 行；ClassDeclarationEndPossibleShape）
- 结构：end possible。Compute 只看当前格（`{` 且 `Closed` 就 Accept）；Build 把外壳 `Data` 全部 code 取出，交给 `ClassDeclarationShape.BuildFromCode` 重建，再 `BodyGuideUtil.FinishShell`。
- 偏离：
  - `[C2]` ● 能增量收口却全量重建：Build 从 `shell.Data` 重拼 `code` 后一次性 `BuildFromCode(shell, code, shell.Pos, context, true)` — 证据 `class-declaration-end-possible-shape.xl.md:41-47`。
  - `[B4]` ○ Build 遍历整个 `shell.Data`，不受 `tokenIndex` 截断 — 证据 `class-declaration-end-possible-shape.xl.md:42-46`（`for (const unit of shell.Data)`）。
  - `[X2]` ○ 收口走的是 legacy 全量建树函数（`BuildFromCode` 内部还会对装饰器再起 `ExpressionBuilder`）而不是增量收敛 — 证据 `class-declaration-end-possible-shape.xl.md:47`、`class-declaration-shape.xl.md:211-235`。
- 结论：偏离（3 条）。补充：Compute 逐格无状态、越界返回 `Uncertain`（无 `B1`/`C1`/`C3`）；无 `try/catch`。

### typescript/tokens/declarations/declaration-incremental-route.xl.md（1986B / 21 行；DeclarationIncrementalRoute）
- 结构：路由开关类（不是 shape / possible / end）。一个全局静态位 `Armed`，加一个把 `StatementRouteUtil.EnableRootDeclarationShell` 打开/关掉的布置函数，另一个 `IsDeclarationHost` 只是转发。
- 偏离：
  - `[X1]` ● 设计外的全局开关位 + 跨子系统改写：`Arm()` 直接翻转另一模块的路由开关，按「增量模式是否开启」决定根层声明的壳走哪条路 — 证据 `declaration-incremental-route.xl.md:18`、`:34-42`（`StatementRouteUtil.EnableRootDeclarationShell = false; DeclarationIncrementalRoute.Armed = true;`）。
  - `[X1]` ● 该开关是在 possible 的 compute 里被调用的（「布置路由」成了候选的副作用），IMPORTANCE 的候选只允许淘汰/不定案/建形状 — 证据 `declaration-incremental-route.xl.md:20-22`、调用点 `class-declaration-possible-shape.xl.md:68`、`:200`（`DeclarationIncrementalRoute.Arm();`）。
  - `[C3]` ○ 用全局静态位代替 possible 的 `state`/`share`：状态既不按候选归属，也没有 build 后 reset 的语义，只是「本类改过」的记账 — 证据 `declaration-incremental-route.xl.md:18`、`:35-38`。
- 结论：偏离（3 条）。补充：`IsDeclarationHost` 是纯转发（`:45-49`），本身不引入新机制；无围栏外散文。

### typescript/tokens/declarations/interface-declaration-end-possible-shape.xl.md（1926B / 28 行；InterfaceDeclarationEndPossibleShape）
- 结构：end possible。Compute 只看当前格（`{` 且 `Closed`）；Build 从外壳 `Data` 重拼 `code` 后 `InterfaceDeclarationShape.BuildFromCode` 重建，再手写 splice 收口。
- 偏离：
  - `[C2]` ● 能增量收口却全量重建 — 证据 `interface-declaration-end-possible-shape.xl.md:40-46`（`for (const unit of shell.Data)` → `InterfaceDeclarationShape.BuildFromCode(shell, code, shell.Pos, context)`）。
  - `[B4]` ○ 遍历整个 `shell.Data`，不受 `tokenIndex` 截断 — 证据 `interface-declaration-end-possible-shape.xl.md:41-45`。
  - `[X1]` ○ 收口通道自造：手写 `parent.Data.indexOf(shell)` + `splice` + 清 `MountedUnit`，绕开 class/enum 两档共用的 `BodyGuideUtil.FinishShell` — 证据 `interface-declaration-end-possible-shape.xl.md:47-57`（对照 `class-declaration-end-possible-shape.xl.md:50`、`enum-declaration-end-possible-shape.xl.md:50`）。
- 结论：偏离（3 条）。补充：Compute 逐格无状态、越界返回 `Uncertain`；无 `try/catch`。

### typescript/tokens/declarations/enum-declaration-end-possible-shape.xl.md（1781B / 21 行；EnumDeclarationEndPossibleShape）
- 结构：end possible。Compute 只看当前格；Build 重拼外壳 `code` 后 `EnumDeclarationShape.BuildFromCode`，再由 `BodyGuideUtil.FinishShell` 收口。
- 偏离：
  - `[C2]` ● 全量重建 — 证据 `enum-declaration-end-possible-shape.xl.md:41-47`。
  - `[B4]` ○ 遍历整个 `shell.Data` — 证据 `enum-declaration-end-possible-shape.xl.md:42-46`。
  - `[X2]` ○ 收口走 legacy 全量建树函数而不是增量收敛 — 证据 `enum-declaration-end-possible-shape.xl.md:47`（`EnumDeclarationShape.BuildFromCode(...)`）、`enum-declaration-shape.xl.md:110`。
- 结论：偏离（3 条）。补充：Compute 逐格无状态、越界返回 `Uncertain`；无 `try/catch`。

### typescript/tokens/declarations/namespace-export-shape.xl.md（1702B / 33 行；NamespaceExportShape）
- 结构：leaf shape + 静态工厂 `FromTokens`；只收 `export * as ns` 里的 `ns` 一个子形状，然后 `SignIn`/`SignOut`/`TryToClose`（R31）。
- 偏离：无（符合：R31 立即关闭；R19/R35 `*`、`as` 与 trivia 用后即丢，`Data` 只装 `IdentifierShape`（`:50-53`）；R20 关闭后 `Data` 等价于 children；`export`/`from`/模块串的归属在 `ExportDeclarationShape`（`export-declaration-shape.xl.md:135` 用 `[starUnit, code[index], aliasUnit]` 调本工厂），本形状不越权）。
- 结论：符合。补注：`Name` 取「最后一个 `Common`」，若组内混入别的 `Common`（`as` 之外的）会静默取错，属输入契约而非判据偏离。

### typescript/tokens/declarations/namespace-import-shape.xl.md（1702B / 33 行；NamespaceImportShape）
- 结构：leaf shape + 静态工厂 `FromTokens`；收 `import * as ns` 里的 `ns`，随后立即关闭（R31）。
- 偏离：无（符合：R31；R19/R35 只把 `IdentifierShape` 放进 `Data`（`:50-53`），`*`/`as`/trivia 不进；R20 `Data` 与 children 同构；`Data` 之外无残留 basic token）。
- 结论：符合。

### typescript/tokens/declarations/variable-declaration-list-shape.xl.md（618B / 3 行；VariableDeclarationListShape）
- 结构：容器 shape，只有 `TryToClose` 覆写：先 `TrimEndToLastCode()` 再 `super.TryToClose`。
- 偏离：无（符合：R19/R20 —— 声明形状由增量 builder 逐个挂进 `Data`，关闭时只裁掉尾部 trivia，不清空也不留 basic token；`:25-27`；无 possible/end 覆写，不碰 `ExitOrPre`/`ComputePossibleShapes`）。
- 结论：符合。

### typescript/tokens/declarations/missing-declaration-shape.xl.md（431B / 1 行；MissingDeclarationShape）
- 结构：纯壳（`extends ShapeToken`，只有一个 `super(template)` 构造）。
- 偏离：
  - `[X1]` ● 设计外产物：全仓只有类声明本身，没有任何构造点或引用（`grep MissingDeclarationShape` 只命中本文件），txt 里自称「解析出错恢复时的占位声明」，但恢复/Reload 通道并不用它 — 证据 `missing-declaration-shape.xl.md:9-19`。
  - `[S3]` ○ 即便被建出来，也没有字段、没有 `Close`、没有子节点约定，形状树里只会是一个空壳，与 AST 不同构（TS 侧也没有对应的 `MissingDeclaration` 节点类） — 证据 `missing-declaration-shape.xl.md:9-19`（类体只有构造）。
- 结论：偏离（2 条）。补充：无围栏外散文（`txt` 围栏内的说明不算 `D1`，`:11-13`）。

### typescript/tokens/declarations/external-module-reference-shape.xl.md（351B / 1 行；ExternalModuleReferenceShape）
- 结构：纯壳（`extends ShapeToken`，只有构造），`import x = require("m")` 的 `require(...)` 节点。
- 偏离：
  - `[S4]` ○ 没有字段也没有 `Close`：`require("m")` 的字符串子节点由调用方 `new ExternalModuleReferenceShape(...)` 后 `external.Add(literal)` 塞进来、由调用方 `TryToClose`，AST 侧没有对应节点类，收口后只能按 `Data[0]` 序号取 `expression` — 证据 `external-module-reference-shape.xl.md:9-19`、`import-equals-declaration-shape.xl.md:130-140`。
  - `[X1]` ○ 唯一构造点都在 legacy/直建侧（`import-equals-declaration-shape.xl.md:130`、`forms/import-export-legacy-declaration-mount.xl.md:522`），设计中「由 possible build 产出形状」的位置没有它，形状归属由调用方决定 — 证据 `forms/import-export-legacy-declaration-mount.xl.md:522`、`:422`（`units[at] instanceof ExternalModuleReferenceShape`）。
- 结论：偏离（2 条）。

### typescript/tokens/declarations/case-block-shape.xl.md（342B / 1 行；CaseBlockShape）
- 结构：纯壳（`extends ShapeToken`，只有构造），`switch` 的 `{…}` 块容器。
- 偏离：
  - `[X1]` ● 设计外直建通道的目标类：由建树器 `statement-builder` 与直建会话 `direct-control-session` 直接 `new CaseBlockShape`，然后手工 `Add` 子句，不经过 possible 收敛 — 证据 `case-block-shape.xl.md:9-19`、`statement-builder.xl.md:2338`、`direct-control-session.xl.md:1285`。
  - `[S3]` ○ 空壳容器：无字段、无 `Close`，子句顺序只能按 `Data` 的序号读（同一条直的 case/default 判定靠 `constructor.name` 字符串比较），形状 → AST 的映射没有落点 — 证据 `case-block-shape.xl.md:9-19`、`statement-builder.xl.md:2351`（`unit.constructor.name !== "CaseClauseShape"`）。
- 结论：偏离（2 条）。

### typescript/tokens/declarations/namespace-export-declaration-shape.xl.md（3082B / 101 行；`NamespaceExportDeclarationShape`）
- 结构：`export as namespace NS;` 的 shape——`FromUnits` 按固定下标取 `export`/`as`/`namespace`/名字/`;`，`TryToClose` 覆盖成「收尾后把范围裁到最后一个代码单元」。
- 偏离：
  - `[X1]` ● `FromUnits` 用**位置硬编码**认语法：`code[0]=export`、`code[1]=as`、`code[2]=namespace`、`code[3]=name`、`last=';'`，五处 `throw` 校验 — 证据 `namespace-export-declaration-shape.xl.md:41-60`。设计里「哪些 token 属于这个声明」应由候选收敛给出，而不是固定下标。
  - `[S4]` ○ AST 由这个 shape 从 raw 单元直建：唯一子节点 `IdentifierShape` 也是在工厂里 `IdentifierShape.FromBasicToken` 现造 — 证据 `namespace-export-declaration-shape.xl.md:71-80`，全文无 `ParseFromShape`。
  - `[P3]` ○ 它改写别人已签好的范围：把名字的 `Pos` 硬设成 `namespaceKeyword.EndIndex`，并在名字范围未签时补一次 `SignOut` — 证据 `namespace-export-declaration-shape.xl.md:72-77`。
- 符合项：`FromUnits` 末尾签范围 + `TryToClose`（`:81-88`）= R31；`Data` 只有名字一个子形状（R20）。
- 结论：偏离（3 条，1 条明确）。

## 本批统计

- 文件数：25（本批任务 25 个）。本文件共 26 节：`namespace-export-declaration-shape` 为补审（原批漏审），`namespace-export-declaration-possible-shape` 与第 33 篇重复（该文件归第 33 篇，此处一节作交叉参照）。
- 有偏离文件数：18；无偏离文件数：8（import-specifier-shape、export-specifier-shape、named-exports-shape、named-imports-shape、import-clause-shape、namespace-export-shape、namespace-import-shape、variable-declaration-list-shape）。
- 偏离条目共 54 条（其中 `namespace-export-declaration-shape` 的 3 条为补审）。按编号计数：
  - `X1` 12（●8 / ○4）：3 处工具/开关（`variable-declaration-scan-util`、`variable-declaration-list-util`、`declaration-incremental-route`）、3 处转发/安装通道（`namespace-export-declaration-possible-shape`、`type-alias-literal-start-possible-shape`、`interface-declaration-end-possible-shape`）、3 处壳类直建（`missing-declaration-shape`、`external-module-reference-shape`、`case-block-shape`）、`namespace-export-declaration-shape` 的位置硬编码、2 处实现细节（`import-clause-end-possible-shape` 的 `as any` 卸载、`type-alias-literal-start-possible-shape` 的 `MemberCatalogInstalled`）。
  - `C2` 4（●4）：`class` / `interface` / `enum` / `module` 四个 end possible 全部用 legacy `BuildFromCode` / `FromUnits` 全量重建外壳。
  - `B4` 7（●1 / ○6）：`type-alias-literal-start` 整段全扫（●）与六个 build 里遍历整个 `shell.Data` / 无 `tokenIndex` 契约的候选（○）。
  - `C3` 6（○6）：状态只靠回退分支复位、build 后无 reset 的六个 possible/开关。
  - `B1` 5（●2 / ○3）：`export-assignment-shape`、`import-clause-end-possible-shape` 无守卫解引用 `host.Data[tokenIndex]`（●）；三个 `BuildByIndex` 只守下界（○）。
  - `P3` 5（●1 / ○4）：`type-alias-literal-start` 的 build 不产出形状（●）；四个 build 在前提不成立时静默 `return host`（○）。
  - `C1` 3（●1 / ○2）：`type-alias-literal-start` 每轮全扫两遍（●）；两个工具/判官无 cache 多趟遍历（○）。
  - `P1` 2（●1 / ○1）、`S4` 2（●1 / ○1）、`S3` 2（○2）、`X2` 2（○2）、`P2` 1（○1）、`B2` 1（○1）。
  - 未出现：`S1`、`S2`、`U1`–`U4`、`R1`、`R2`、`B3`、`P4`、`X3`、`D1`、`N`（本批无 basic token 层文件、无 `ExitOrPre`/`ComputePossibleShapes` 覆写、无 tsx，围栏外无散文）。
- 最严重 5 条：
  1. `[X1]` ●（`declaration-incremental-route.xl.md:34-42`）：一个全局静态开关在 possible 的 compute 里翻转另一子系统的路由开关，「候选」因此带上了改写解析路径的副作用，这是本批最靠上的设计外机制。
  2. `[C2]` ● ×4（`class` / `interface` / `enum` / `module` 的 end possible）：四个声明族收口一律「整段 code → legacy `BuildFromCode`/`FromUnits` 重建」，与「增量创建形状是主要方案」（R06/R07）正好相反，且重建时读的是整个 `shell.Data`（`B4`）。
  3. `[C1]`+`[B4]`+`[P3]` ●（`type-alias-literal-start-possible-shape.xl.md:35-82`）：一个 possible 每轮全扫整段数据、越过 `tokenIndex`，build 却一个形状都不建，只把宿主 `CatalogGuide` 换掉并写一个开关位——候选三件套的形式对、语义全空。
  4. `[X1]` ● ×3（`variable-declaration-scan-util`、`variable-declaration-list-util`、`variable-statement-three-layer` 的 try/catch）：变量声明「到哪里结束、有几条」的判界完全在 possible/shape 之外完成，异常靠调用点 catch 成 fallback（`B2`），R19 的「build 那一刻提取」在这条链上没有对应的形状。
  5. `[S4]` ●（`export-assignment-shape.xl.md:72-81`）：`export =` 的表达式子树在 shape 工厂里由 `ExpressionBuilder` 直建 AST 并 `Add` 进 shape，逐字 AST 的增量可验证链在这里断开（同一批的 `external-module-reference` / `case-block` 壳类则由调用方手工 `Add` 子节点）。
