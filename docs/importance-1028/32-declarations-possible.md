# 设计偏离审计 · 32 · declarations possible / end 与两个 declaration shape

范围：`typescript/tokens/declarations/` 下本批 8 个文件（6 个 possible 族 + 2 个 declaration shape）。
判据：`docs/importance-1028/01-rules.md`（R01–R36，编号 S1…D1）；事实表：`_facts/typescript-tokens-declarations.md`。
只读源码；`docs/IMPORTANCE.md` 未改动。行号以 `read` 返回为准。

---

### typescript/tokens/declarations/variable-declaration-end-possible-shape.xl.md（28934B / 468行；VariableDeclarationEndPossibleShape extends PossibleShape）

- 结构：possible（**终结候选**，无 shape、无 end 类）。它是 `VariableDeclarationShape` 的终结候选，正文只有 `ComputeByIndex` + 12 个只读静态判据；「这一格会不会收口」的大部分判定被拆给 6 个外部 judge / catalog。
- 偏离：
  - `[B1]` ● 越界返回 `Reject` 而不是 `Nothing`，把「数据未就绪」直接判成「不匹配」（`Reject` 在 R26 里是淘汰候选）— 证据 `variable-declaration-end-possible-shape.xl.md:33`（`if (tokenIndex < 0 || tokenIndex >= units.length) { return ShapeStates.Reject; }`）
  - `[B4]` ● `ComputeByIndex` 经四个静态判据扫到 `units.length`，即看 `tokenIndex` 之后 — 证据 `variable-declaration-end-possible-shape.xl.md:421`（`for (let at = equalAt + 1; at < units.length; at++)`）、`:343`（`for (let at = 0; at < units.length; at++)`）、`:440`、`:511`
  - `[B4]` ○ 「收口判据」本身天生前看：`DeclarationAsiBoundary.CanCloseAtLineBreak` 的语义是「本格后面换行且下一行首个字符不续接」— 证据 `variable-declaration-end-possible-shape.xl.md:50`（`if (!angleOpen && DeclarationAsiBoundary.CanCloseAtLineBreak(units, tokenIndex))`）、`:216`
  - `[C1]` ● 每一格都从零重扫 `units`：`EqualIndex` 从头扫、且被同一格内的多个判据各调一次 — 证据 `variable-declaration-end-possible-shape.xl.md:392`（`for (let at = 0; at < units.length; at++) { ... Is("=")`）、`:453`（`HasAnnotationColon` 同样从 0 起）、`:343-385`（`HasTypeArgumentCall` 双层循环）
  - `[C3]` ● `cache` / `source` 形参完全未使用，全文 0 次 `GetState/SetState/GetShare/SetShare` — 证据 `variable-declaration-end-possible-shape.xl.md:30`（`ComputeByIndex:(units, tokenIndex, cache:PossibleShapeCache, source:PossibleSource)`，方法体再无 `cache`/`source` 出现）
  - `[P2]` ● 在候选表之外自建「这一格由谁认领」的续表来决定继续/不继续 — 证据 `variable-declaration-end-possible-shape.xl.md:72`（`if (ExpressionContinuationCatalog.Claims(units, tokenIndex)) { return ShapeStates.Reject; }`）、`:228`
  - `[P2]` ○ 用三个复合初始化器 judge 的「族命中」代替候选判定 — 证据 `variable-declaration-end-possible-shape.xl.md:89`（`CompositeInitializerFormsJudge.Family(units) !== ""`）、`:241`、`:248`、`:253`、`:258`
  - `[X1]` ● 两个 IMPORTANCE 未定义的指标计数器 — 证据 `variable-declaration-end-possible-shape.xl.md:124`（`StatementLegacyMetrics.DeclarationAngleWaitCount += 1;`）、`:276`（`DeclarationBracketWaitCount += 1;`）、`:283`、`:297`
  - `[X2]` ● 大量格子的正式出口是「继续等，由收口格的 legacy `ExpressionBuilder` 整段重建初始化器」— 证据 `variable-declaration-end-possible-shape.xl.md:167-171`（注释：`收口格（; / EOF / 换行 ASI）的原子建树会用 legacy ExpressionBuilder 从 = 之后整段重建`）、`:268-270`
- 符合：`[B2]` 无 try/catch，未支持形态直接 `throw`（`:205` `throw new Error("增量变量形状未支持：declaration 符号 " + text);`）；`[R1]`/`[R2]` 未覆盖 `ExitOrPre`、未覆盖 `ComputePossibleShapes`（全文仅 `:232` 注释提及）。
- 结论：偏离（9 条；其中 ● 7、○ 2）

---

### typescript/tokens/declarations/variable-declaration-list-possible-shape.xl.md（21862B / 401行；VariableDeclarationListEndPossibleShape / DeclarationCellGuard / BindingIdentifierPossibleShape / IncrementalVariableDeclarationListBuilder）

- 结构：possible 族 + 一个 static builder。① `VariableDeclarationListEndPossibleShape` 继承父终结候选、只补列表分隔符；② `DeclarationCellGuard` 是**转发器 possible**（包住表达式目录的每个候选）；③ `BindingIdentifierPossibleShape`；④ `IncrementalVariableDeclarationListBuilder` 是一个手工装配器（本批唯一「builder 直建」）。
- 偏离：
  - `[B1]` ● 三处越界全部不是 `Nothing`，且三种语义并存：列表终结候选 `Reject`、绑定候选 `Uncertain`、守卫把越界下标原样转发给内层候选 — 证据 `variable-declaration-list-possible-shape.xl.md:31-33`（`return ShapeStates.Reject;`）、`:209-211`（`return ShapeStates.Uncertain;`）、`:129`（`if (tokenIndex >= 0 && tokenIndex < units.length) { ... }` 之后 `:172` 无条件 `return inner.ComputeByIndex(...)`）
  - `[B4]` ● `AngleJudge.IsGroupMember` 判「配对的 `>`」必然向后找配对；`ItemUtil.IsCompoundTernaryAhead` 从当格往后扫；ASI 判据看下一行 — 证据 `variable-declaration-list-possible-shape.xl.md:47`（`if (AngleJudge.IsGroupMember(units, tokenIndex))`）、`:67`、`:159`（`if (ItemUtil.IsCompoundTernaryAhead(unit))`）、`:166-171`
  - `[B4]` ● 两处 `super.ComputeByIndex` 委托让越界 / 前看问题原封继承父类 — 证据 `variable-declaration-list-possible-shape.xl.md:36`、`:74`（`return super.ComputeByIndex(units, tokenIndex, cache, source);`）
  - `[C3]` ● `cache` 只作为形参原样转发，本文件 0 次 `GetState/SetState` — 证据 `variable-declaration-list-possible-shape.xl.md:28`（签名）、`:36`、`:74`、`:172`（`return inner.ComputeByIndex(units, tokenIndex, cache, source);`）
  - `[P2]` ● `DeclarationCellGuard` 用自己的一套前置拒判改写候选语义（`;`/`,`/`}`、定值 `!`、复合三目、ASI 格），并让内层候选只在剩下的格子里跑 — 证据 `variable-declaration-list-possible-shape.xl.md:131-142`、`:159-161`、`:166-171`
  - `[C1]` ● `GuardedCatalog()` 每次调用都重建整张候选表（`for` + 新对象），`BuildNext` 每遇到一个 `,` 就重跑一遍 — 证据 `variable-declaration-list-possible-shape.xl.md:262-268`（`for (const shape of ExpressionCatalogFactory.Create()) { ... shapes.push(guard); }`）、`:384`
  - `[P3]` ● `BuildByIndex` 在非 `,`/`!`/`}`/`;` 的格上把 basic token 原样返回：既不 build，也不 `SignOut` / `TryToClose` / `Quit` — 证据 `variable-declaration-list-possible-shape.xl.md:95-97`（`if (!(token instanceof Symbol)) { return token; }`）、`:108-110`（`if (text !== ";") { return token; }`）
  - `[P3]` ● 挂载 / 卸载在 static builder 里手工做，不经 shape 的 close — 证据 `variable-declaration-list-possible-shape.xl.md:457`（`host.MountedUnit = null;`）、`:474`、`:499`、`:529`；挂载侧 `:296`（`list.MountedUnit = next;`）、`:387`
  - `[X1]` ● `IncrementalVariableDeclarationListBuilder` 是 IMPORTANCE 没有的装配层：自己 `new VariableDeclarationShape`、自己装 `CatalogGuide`、自己调 `TryToClose` — 证据 `variable-declaration-list-possible-shape.xl.md:288-296`、`:370-388`、`:283`、`:331`、`:340`
  - `[U2]` ● ASI 收口把尾巴从 `Data` 切下来再手工塞回宿主逐格重放，而不是回挂 parent + `Reclose` — 证据 `variable-declaration-list-possible-shape.xl.md:485-486`（`const tail = data.slice(tokenIndex); data.length = tokenIndex;`）、`:503-511`（`host.Data.splice(at + 1 + index, 0, tail[index]); DeclarationAsiBoundary.ReplayLeftover(host, tail, context);`）
  - `[U4]` ○ `IsPatternBinding` 用 `constructor.name` 字符串比较判形态，只看第一个非 trivia 单元，且全文无调用者 — 证据 `variable-declaration-list-possible-shape.xl.md:411-412`（`const name = unit.constructor.name; return name === "ArrayBindingPatternShape" || ...`）
- 符合：`[B2]` 无 try/catch（全部错误直接 `throw`）；`[R1]`/`[R2]` 未覆盖 `ExitOrPre`／`ComputePossibleShapes`。
- 结论：偏离（11 条；其中 ● 10、○ 1）

---

### typescript/tokens/declarations/function-declaration-possible-shape.xl.md（21839B / 433行；FunctionDeclarationScan / FunctionDeclarationPossibleShape extends PossibleShape）

- 结构：possible + 一个 11 字段的手写扫描器 `FunctionDeclarationScan`（Stage 0/1/2/3/4/5/6/7/8）。壳不在本文件，由 `BodyGuideUtil.MountShell` 挂出，终结候选在 `function-declaration-end-possible-shape`。
- 偏离：
  - `[B1]` ● 越界返回 `Uncertain`（「还活着」），不是 `Nothing` — 证据 `function-declaration-possible-shape.xl.md:90-92`（`if (tokenIndex < 0 || tokenIndex >= units.length) { return ShapeStates.Uncertain; }`）
  - `[B4]` ○ 让位判据前看：`NextCode(units, b3cHeadAt + 1)` 的读数可能越过 `tokenIndex` — 证据 `function-declaration-possible-shape.xl.md:81-83`（`const b3cHeadAt = ItemUtil.NextCode(units, b3cStart); const b3cSecondAt = b3cHeadAt < 0 ? -1 : ItemUtil.NextCode(units, b3cHeadAt + 1);`）
  - `[C3]` ○ cache 用了（`GetState`/`SetState`），但 build 后不 reset；且同一份 state 有两个读入口（`cache` 与 `catalog.PossibleShapesComputeCache`）— 证据 `function-declaration-possible-shape.xl.md:94`（`let state = cache.GetState<FunctionDeclarationScan>(name);`）、`:99`（`cache.SetState(name, state);`）、`:448`、`:459`（`catalog.PossibleShapesComputeCache.GetState<FunctionDeclarationScan>(this.Slot())`）
  - `[C1]` ○ 扫描本身是游标增量（`state.Checked`），但每格都重跑路由判定 `ShouldYieldToDeclarationShell` — 证据 `function-declaration-possible-shape.xl.md:115`（`for (let at = state.Checked; at <= tokenIndex; at++)`，符合 R08 的一半）、`:74`（`if (StatementRouteUtil.ShouldYieldToDeclarationShell(units, tokenIndex))`）
  - `[X1]` ● 全局开关位 + 路由让位机制是 IMPORTANCE 未定义的机制 — 证据 `function-declaration-possible-shape.xl.md:73`（`DeclarationIncrementalRoute.Arm();`）、`:84`（`if (!(StatementRouteUtil.IsIncrementalShapesEnabled() && b3cOwns))`）、`:449`、`:467`
  - `[X1]` ● `FunctionDeclarationScan` 的 Stage 状态机与 `SplitAt`/`SplitDeclare`/`Angle` 等字段是一个内嵌扫描器 — 证据 `function-declaration-possible-shape.xl.md:33-57`（11 个 field）、`:124-357`（Stage 分支全表）
  - `[X2]` ● legacy 分支整段 raw 重建并把宿主 `Data` 换成建好的 shape — 证据 `function-declaration-possible-shape.xl.md:535-537`（`const built = FunctionDeclarationShape.FromUnits(host, start, tokenIndex, context); host.Data.splice(start, tokenIndex - start + 1, built);`）、`:492`、`:507`
  - `[P3]` ● build 去向两套并存：增量走 `MountShell`（符合 R32），legacy 走 `host.Data.splice` 替换 raw 单元（既非 R31 也非 R32）— 证据 `function-declaration-possible-shape.xl.md:488`（`return BodyGuideUtil.MountShell(host, start, tokenIndex, shell, context);`）、`:536`
  - `[P3]` ● 在 `BuildByIndex` 里直接调 `StatementBuilder` 建兄弟语句 — 证据 `function-declaration-possible-shape.xl.md:524-526`（`const trailingBuilder = new StatementBuilder(host.Template, context); trailingBuilder.Load(...); trailing = trailingBuilder.BuildStatement();`）
  - `[S3]` ○ 一次 build 产出两个兄弟节点（`declare` 的 ExpressionStatement + 声明），形状树靠 `splice` 拼 — 证据 `function-declaration-possible-shape.xl.md:495`（`host.Data.splice(start, tokenIndex - start + 1, expression, declaration);`）、`:530`
- 符合：`[R22]` 扫描循环只读到 `tokenIndex`（`:115`）；`[B2]` 无 catch；`[R1]`/`[R2]` 未覆盖。
- 结论：偏离（10 条；其中 ● 6、○ 4）

---

### typescript/tokens/declarations/type-alias-declaration-possible-shape.xl.md（16523B / 366行；TypeAliasDeclarationScan / TypeAliasDeclarationPossibleShape extends PossibleShape）

- 结构：possible + 内嵌扫描器 `TypeAliasDeclarationScan`（12 字段，Stage 0/1/2/3/6 + ASI 分支）。壳与建树全在 `TypeAliasDeclarationShape`，本文件只判「到齐没有」。
- 偏离：
  - `[B1]` ● 越界返回 `Uncertain`，不是 `Nothing` — 证据 `type-alias-declaration-possible-shape.xl.md:72-74`（`if (tokenIndex < 0 || tokenIndex >= units.length) { return ShapeStates.Uncertain; }`）
  - `[C3]` ○ `GetState`/`SetState` 有、回退重置也有，但 build 后不 reset；`IsBuildable` 从 `cache` 读、`BuildByIndex` 从 `catalog.PossibleShapesComputeCache` 读 — 证据 `type-alias-declaration-possible-shape.xl.md:76`、`:81`、`:83-95`、`:445`、`:452`
  - `[C1]` ○ 回退到更早的 `tokenIndex` 时从 `ItemStart` 整段重扫（`state.Checked > tokenIndex + 1` 分支），且 `state.Done`/`state.Rejected` 后仍逐格空转 — 证据 `type-alias-declaration-possible-shape.xl.md:83-95`、`:101-103`（`if (state.Rejected || state.Done) { continue; }`）
  - `[X1]` ● Stage 状态机 + 两张 ASI 词表（`IsAsiBoundary` / `CanEndTypeAt`）是 IMPORTANCE 未定义的机制 — 证据 `type-alias-declaration-possible-shape.xl.md:109-245`、`:273-325`、`:374-398`
  - `[X1]` ● 路由开关位；另 `StatementRoute` 导入后未使用（用的是 `StatementRouteUtil`）— 证据 `type-alias-declaration-possible-shape.xl.md:67`（`if (StatementRouteUtil.ShouldYieldToDeclarationShell(units, tokenIndex))`）、`:20`（`import { StatementRoute } ...`）
  - `[X2]` ● build 走 `TypeAliasDeclarationShape.FromUnits` 整段重建并替换宿主 `Data` — 证据 `type-alias-declaration-possible-shape.xl.md:464-466`（`const built = TypeAliasDeclarationShape.FromUnits(host, start, end, context); host.Data.splice(start, end - start + 1, built);`）
  - `[P3]` ○ `end < start` 时直接 `return host`：Accept 却零产物 — 证据 `type-alias-declaration-possible-shape.xl.md:461-463`（`if (end < start) { return host; }`）
- 符合：`[R22]` 扫描与全部判据只回看（`:96` 循环上界 `tokenIndex`；`:336`、`:411` 反向扫）；`[B2]` 无 catch；`[R1]`/`[R2]` 未覆盖。
- 结论：偏离（7 条；其中 ● 4、○ 3）

---

### typescript/tokens/declarations/import-clause-possible-shape.xl.md（15859B / 409行；ImportClauseScan / ImportClausePossibleShape extends PossibleShape）

- 结构：possible（`import` 子句候选）+ 状态 `ImportClauseScan`。特征是它**绕过 token 层直接读原始文档字符**来判 `type` / `defer` 是不是相位修饰词。
- 偏离：
  - `[B1]` ● 越界返回 `Uncertain`，不是 `Nothing` — 证据 `import-clause-possible-shape.xl.md:45-47`
  - `[B4]` ● 用 `NextCode` 从 `state.Start` 一路向后跳 `export`/`declare`，`start` 可越过 `tokenIndex` 并读 `units[start]` — 证据 `import-clause-possible-shape.xl.md:74-77`（`let start = ItemUtil.NextCode(units, state.Start); while (start < units.length && ...) { start = ItemUtil.NextCode(units, start + 1); }`）、`:90`（`const candidate = units[start];`）
  - `[B4]` ● 直接读整份文档字符（`document.GetCount()` / `SourceRange.Whole(document)`），连 token 边界都不在，前看范围无上限 — 证据 `import-clause-possible-shape.xl.md:298-300`（`const count = document.GetCount(); const whole = SourceRange.Whole(document); let at = range.EndIndex;`）、`:350-352`、`:340`（`return !(word === "from");`）
  - `[C3]` ● 回退时把 `state.Checked` 置 0 而不是 `state.Start`（同批其余文件都置 `Start`），状态复位口径不一致；`BuildByIndex` 又改用 `catalog.PossibleShapesComputeCache` — 证据 `import-clause-possible-shape.xl.md:55-60`（`if (state.Checked > tokenIndex + 1) { state.Checked = 0; ... }`）、`:154`
  - `[C1]` ○ 上述复位导致回退后从文件第 0 格重扫 — 证据 `import-clause-possible-shape.xl.md:56`、`:61`（`for (let at = state.Checked; at <= tokenIndex; at++)`）
  - `[X1]` ● 两个 `*PhaseModifier` 判据在 possible 里重写了一遍词法器（跳空白、跳行注释、跳块注释、读词），是 basic token 层职责的旁路 — 证据 `import-clause-possible-shape.xl.md:301-339`、`:353-445`
  - `[P2]` ○ 用「`type` 之后第一个词是不是 `from`」从原文决定 `type` 是修饰词还是默认导入名，取代候选判定 — 证据 `import-clause-possible-shape.xl.md:171-172`（`if (... Is("type") && ImportClausePossibleShape.IsTypePhaseModifier(host.Data[cursor]))`）、`:399-401`
  - `[P3]` ● build 同时做两件事：把宿主 `Data` 的一段换成 clause（splice），再 `host.MountedUnit = clause`（挂载）——R31 与 R32 两种去向混用 — 证据 `import-clause-possible-shape.xl.md:284-286`（`host.Data.splice(cursor, tokenIndex - cursor + 1, clause); clause.Parent = host; host.MountedUnit = clause;`）
- 符合：`[B2]` 无 catch；`[R1]`/`[R2]` 未覆盖。
- 结论：偏离（8 条；其中 ● 6、○ 2）

---

### typescript/tokens/declarations/module-declaration-possible-shape.xl.md（14626B / 310行；ModuleDeclarationScan / ModuleDeclarationPossibleShape extends PossibleShape）

- 结构：possible + 内嵌 `Scan`（返回 `StatementScanResult(Status, End)` 三态扫描器）。增量模式挂 `ModuleDeclarationShape` 壳，收口交终结候选。
- 偏离：
  - `[B1]` ● 越界返回 `Uncertain`，不是 `Nothing` — 证据 `module-declaration-possible-shape.xl.md:175-177`
  - `[C1]` ● 只要 `tokenIndex` 前进一格（`state.Checked !== tokenIndex + 1`）就从 `state.Start` 到 `tokenIndex` **重建整个 `code` 数组并重跑 `Scan`**，逐字符驱动下等于每格全量重扫 — 证据 `module-declaration-possible-shape.xl.md:187-195`（`if (state.Checked !== tokenIndex + 1) { ... for (let at = state.Start; at <= tokenIndex; at++) { code.push(units[at]); ... }`）、`:252`（`const result:StatementScanResult = this.Scan(scanCode);`）
  - `[C3]` ● state 只当「上次检查到哪」的等值标记，`Status`/`End` 每轮被重算覆盖，cache 不承载任何结论（R09 的 set→复用不成立）— 证据 `module-declaration-possible-shape.xl.md:253`（`state.Status = result.Status;`）、`:272-276`、`:307`（`state.Checked = tokenIndex + 1;`）
  - `[B4]` ○ 让位判据用 `NextCode(units, b3cHeadAt + 1)` / `NextCode(units, b3cHeadAt + 2 格)` 前看 — 证据 `module-declaration-possible-shape.xl.md:147`、`:154`、`:162`
  - `[X1]` ● 开关位 + 路由判据（`ShouldYieldToDeclarationShell` / `IsIncrementalShapesEnabled` / `DeclinesDeclarationHead`）IMPORTANCE 未定义 — 证据 `module-declaration-possible-shape.xl.md:141`、`:145`、`:169`、`:283`、`:291`
  - `[X1]` ● 内嵌 `Scan` 自己拼 `StatementScanResult(1/2/0, End)` 三态，把「语句到没到齐」的判定搬进 possible — 证据 `module-declaration-possible-shape.xl.md:52-135`、`:309-315`
  - `[P3]` ● `MountShell` **之后**才给壳装终结候选目录，挂载瞬间壳还没有任何候选可跑 — 证据 `module-declaration-possible-shape.xl.md:342-343`（`BodyGuideUtil.MountShell(host, start, tokenIndex, shell, context); shell.CatalogGuide = new CatalogGuide([], new ModuleDeclarationEndPossibleShape());`）
  - `[X2]` ○ legacy 分支 `module-declaration-shape.xl.md` 的 `FromUnits(code, positions, context)` 整段重建 + `host.Data.splice` — 证据 `module-declaration-possible-shape.xl.md:376-378`
- 符合：`[R22]` 重扫范围只到 `tokenIndex`（`:190`）；`[B2]` 无 catch；`[R1]`/`[R2]` 未覆盖。
- 结论：偏离（8 条；其中 ● 6、○ 2）

---

### typescript/tokens/declarations/interface-declaration-shape.xl.md（13835B / 313行；InterfaceDeclarationShape extends ShapeToken）

- 结构：shape（声明形状）。特征：`constructor` 只 `super(template)`，**不建 CatalogGuide**；候选集 `CreateBodyPossibleShapes` 由 shape 自己持有并在 `{` 出现时安装；建树由 `FromUnits → BuildFromCode` 的 160 行手写解析器完成。
- 偏离：
  - `[S2]` ● `constructor` 不建 `CatalogGuide`，而 `UnitToken.CatalogGuide` 默认 `null` 时 `ComputePossibleShapes` 直接返回 `Nothing`（`core/syntax/unit-token.xl.md:25-28`）：从挂壳到 `{` 之间（名字 / 类型参数 / heritage）**没有任何候选在跑**，形状只吞单元 — 证据 `interface-declaration-shape.xl.md:52-56`（`## constructor:(template:Template)=>void` 方法体只有 `super(template);`）
  - `[P2]` ● 候选集由 shape 自己建、自己替换：`CreateBodyPossibleShapes` 返回成员候选表，`OnBracketCreatedEvent` 里把 `this.CatalogGuide` 整个换成一个「零候选 + 终结候选」的目录 — 证据 `interface-declaration-shape.xl.md:108-125`、`:77-78`（`MemberShellCatalog.InstallBodyCatalog(...); this.CatalogGuide = new CatalogGuide([], new InterfaceDeclarationEndPossibleShape());`）
  - `[X1]` ● `MemberShellCatalog`（`InstallBodyCatalog` / `FinalizeAll`）是 IMPORTANCE 未定义的「成员外壳安装器」— 证据 `interface-declaration-shape.xl.md:77`、`:340`（`MemberShellCatalog.FinalizeAll(host, bracket, context);`）
  - `[X1]` ○ `IsDefinitelyBodyBracket` 以「Data 里尖括号深度为 0 且前一单元不是 `extends`/`implements`/`,`」这一启发式猜 `{` 是不是接口体 — 证据 `interface-declaration-shape.xl.md:81-106`（`:93` `depth = AngleJudge.ScanDepth(unit, depth);`、`:105` `return text !== "extends" && text !== "implements" && text !== ",";`）
  - `[C2]` ● `FromUnits` 把 `[start, tokenIndex]` 的全部 raw 单元收进数组，交给 `BuildFromCode` 从零重解析（装饰器 / export / declare / 名字 / 类型参数 / heritage / 成员），与增量无关 — 证据 `interface-declaration-shape.xl.md:130-135`（`for (let at = start; at <= tokenIndex; at++) { if (!host.Data[at].IsTriviaToken) { code.push(host.Data[at]); } }`）、`:149-316`
  - `[X2]` ● 成员收集在「已建成员外壳之间」发现 raw 尾巴就 `TypeBuilder.LoadFrom` 重解析；一个已建成员都没有时整段回退 `BuildMembers` — 证据 `interface-declaration-shape.xl.md:359-369`（探测循环）、`:371-373`（`if (!hasBuiltMember) { return InterfaceDeclarationShape.BuildMembers(...); }`）、`:390-403`
  - `[S3]` ○ type parameter 与 heritage clause 都平铺进 `Data`（`:295-300`），靠 builder 再分组，形状树的中间层与 AST 不对齐 — 证据 `interface-declaration-shape.xl.md:294-303`
- 符合：`[R19]`/`[R20]` `Data` 里只 `Add` 形状（`:275`、`:283`、`:292`、`:294-303`），basic token 的值在 build 那一刻读进 `NameToken`/`DeclareKeyword`/`HeritageClauses`/`Members`（`:270-272`）；未覆盖 `Close`，因此无需过滤，`Data` 天然只剩子形状；`[R31]` `BuildFromCode` 末尾 `shape.TryToClose(context)`（`:315`），`FromUnits` 只是薄包装；`[R33]`/`[R34]` 未覆盖 `ExitOrPre`、未覆盖 `ComputePossibleShapes`。
- 结论：偏离（7 条；其中 ● 5、○ 2）

---

### typescript/tokens/declarations/import-declaration-shape.xl.md（13435B / 270行；ImportDeclarationShape extends ShapeToken）

- 结构：shape（声明形状）+ 静态工厂 `FromUnits`。`constructor` 装 `CatalogGuide`（符合 R04/R26 的方向），但真正的建树走 `FromUnits` 的手写解析器；`Close` 负责把 `Data` 过滤成只剩形状。
- 偏离：
  - `[C2]` ● `FromUnits` 是 190 行手写解析器：自建 `code` 数组、逐 token `if/else` 建 clause / specifier / attributes，与 `CreatePossibleShapes` 的增量路径并存 — 证据 `import-declaration-shape.xl.md:101-106`（`for (let at = start; at <= end; at++) { ... code.push(host.Data[at]); }`）、`:134-254`
  - `[X2]` ● 本入口是打开态的全量旁路（注释自承 `StatementBuilder` 走这里），与默认态的增量子句路径分叉 — 证据 `import-declaration-shape.xl.md:147-149`（`把 defer 当名字… 打开态由 StatementBuilder 走本入口时就是这样多出一个 Identifier（C1，仅打开态；默认态的增量子句路径已走该判据）`）
  - `[P2]` ● 在 shape 里第二次判 `defer` 相位修饰词，并把 possible 的判据**补全**——候选判定被复制到 shape 层 — 证据 `import-declaration-shape.xl.md:150-163`（`const afterDefer = index + 1 < code.length ? code[index + 1] : null; deferPhaseModifier = !(... Is(",") || ... Is("="));`）
  - `[S3]` ○ `Close` 把 `ExportKeywordShape` / `DeclareKeywordShape` **壳**留在 `Data`，而 TS AST 的 modifier 是关键字 token — 证据 `import-declaration-shape.xl.md:311-316`（`} else if (item instanceof ExportKeywordShape) { this.Modifiers.push(item); kept.push(item); }`）
  - `[X1]` ● `IsLegalResidue` 是一张「哪些 basic token 允许留到 close」的白名单，IMPORTANCE 没有这个概念 — 证据 `import-declaration-shape.xl.md:299`（`if (item.IsBasicToken && !this.IsLegalResidue(item)) { throw ...`）、`:341-355`
  - `[X1]` ○ 覆盖 `TryToClose`，在关闭时扫 `Data` 尾部补 `SourceRange.End` — 证据 `import-declaration-shape.xl.md:66-81`（`const mounted = ...; while (at >= 0 && (this.Data[at].IsTriviaToken || ...)) { at--; }`）
  - `[C1]` ○ `Close` 里对 `Data` 做了三遍全扫（校验 / 过滤 / 复查），`FromUnits` 也是先全收再解析 — 证据 `import-declaration-shape.xl.md:298`、`:304`、`:333`
  - `[B4]` ○ `code[index + 1]` 前看一单元（此处是对已建好的 `code` 数组，不属 R22 管辖，但记录该写法）— 证据 `import-declaration-shape.xl.md:154`
- 符合：`[R31]` `FromUnits` 签范围 + 取字段 + `shape.TryToClose(context)`（`:273-278`、`:291`），无 `MountedUnit` 挂载；`[R19]`/`[R20]` `Close` 之后 `Data` 只剩子形状（`:303-326`），并在 `:333-336` 显式复查「`Data` 里还有 basic token」；`[R33]`/`[R34]` 未覆盖 `ExitOrPre`、未覆盖 `ComputePossibleShapes`（`CreatePossibleShapes` 是静态候选工厂，不是 R34 的覆盖）。
- 结论：偏离（8 条；其中 ● 4、○ 4）

---

## 本批统计

- 文件数 8；`filesWithDeviations` 8；偏离条目 68。
- 按编号：`B1` 6、`B4` 9、`C1` 7、`C2` 2、`C3` 6、`P2` 6、`P3` 7、`S2` 1、`S3` 3、`U2` 1、`U4` 1、`X1` 13、`X2` 6；`S1`/`S4`/`P1`/`P4`/`B2`/`B3`/`R1`/`R2`/`U1`/`U3`/`D1`/`X3`/`N` 0。
- 强度：● 48 条、○ 20 条。
- 贯穿全批的三条主因：
  1. `[B1]` 6/6 个 possible 的越界返回都不是 `Nothing`（4 处 `Uncertain`、2 处 `Reject`），「数据未就绪」与「不匹配」在语义上被合并。
  2. `[X1]` 13 条：`DeclarationIncrementalRoute` 开关位、`StatementRouteUtil` 路由判据、`StatementLegacyMetrics` 计数器、内嵌 Stage 扫描器、`MemberShellCatalog`、`IsLegalResidue`、`IncrementalVariableDeclarationListBuilder` 等，都是 IMPORTANCE 未定义的机制。
  3. `[X2]` 6 条 + `[C2]` 2 条：6 个 possible/shape 里都能找到「整段 raw 交 legacy `FromUnits` / `ExpressionBuilder` 重建」的正式出口，增量路径与其并存。
- 单文件最重：`variable-declaration-list-possible-shape.xl.md`（11 条，含 builder 直建与手工挂载链）与 `variable-declaration-end-possible-shape.xl.md`（10 条，`cache` 完全未用）。
