# 设计偏离审计 · 33 · declarations 余下 18 个文件（import-equals / enum / export / module / 壳目录）

范围：`typescript/tokens/declarations/` 下本批 18 个文件（12 个 possible/end、4 个 declaration shape、1 个 util（壳目录辅助）、1 个 builder（变量语句装配器））。
判据：`docs/importance-1028/01-rules.md`（R01–R36，编号 S1…D1）；事实表：`_facts/typescript-tokens-declarations.md`。
只读源码；`docs/IMPORTANCE.md` 未改动。行号以 `read` 工具返回为准。

先记一条贯穿本批的类型事实：`ShapeStates` 只有 `Reject` / `Accept` / `Uncertain` 三个分支（`core/syntax/shape-states.xl.md:5-7`），**没有 `Nothing`**；`Nothing` 只存在于 `ComputePossibleShapesStates`（`core/syntax/catalog-guide.xl.md:58-64` 用它表达「这一格没有单元」）。因此 R25 要求的「越界返回 `Nothing`」在 possible 的返回类型上不可表达，本批 12 个 possible 一律退化成 `Uncertain`（= 按 R26「还活着」，与「数据未就绪」被合并）。

---

### typescript/tokens/declarations/import-equals-declaration-possible-shape.xl.md（12673B / 332行；ImportEqualsDeclarationScan / ImportEqualsDeclarationPossibleShape）

- 结构：possible 层。一个 8 字段手写扫描器 `ImportEqualsDeclarationScan`（Stage 0/1/2/3/4/5/6/7/30）+ 一个族候选；收口时 `BuildByIndex` 调 `ImportEqualsDeclarationShape.FromUnits` 立即建树并 `splice` 回 `Data`（R31 的立即关闭形态）。
- 偏离：
  - `[B4]` ● 用 `NextAfterName(unit.SourceRange)` 从当前单元的 `EndIndex` 往后逐字符扫**原始文档**来读「名字后面是不是 `=`」，直接读本格之后的字符 — 证据 `import-equals-declaration-possible-shape.xl.md:124`（`if (ImportEqualsDeclarationPossibleShape.NextAfterName(unit.SourceRange) !== "=") {`）、`:284-339`（`let at = last.EndIndex; ... while (at < count) { const ch = whole.At(at); ...`）
  - `[B4]` ● 另外用 token 数组向前扫「后面还有没有代码单元」，再回退到 `NextChar` 读原始文本 — 证据 `import-equals-declaration-possible-shape.xl.md:155-160`（`for (let later = at + 1; later < units.length; later++) { ... hasLaterCode = true; break; }`）、`:161`（`if (!hasLaterCode && ... NextChar(unit.SourceRange) !== "=")`）
  - `[B1]` ● 越界返回 `Uncertain` 而不是 `Nothing` — 证据 `import-equals-declaration-possible-shape.xl.md:63-65`（`if (tokenIndex < 0 || tokenIndex >= units.length) { return ShapeStates.Uncertain; }`）；且该检查排在 `Ready`/让位判定之后（`:53-62`）
  - `[P1]` ● 触发点由 `ImportExportLegacyDeclarationMount.Ready` 自行创造：`Ready` 为真就直接 `Accept`，同格 `IsBuildable`/`BuildByIndex` 再问一次 `Ready` 并直接挂壳；R13/R14 只允许 bracket create 时 install catalog，这里在「`=` 那一格」自建形状 — 证据 `import-equals-declaration-possible-shape.xl.md:53-56`（`if (...Ready(...)) { ... return ShapeStates.Accept; }`）、`:245-247`、`:256-261`（`const mounted = ...TryBuild(...); if (mounted !== null) { return mounted; }`）
  - `[X1]` ● `ImportExportLegacyDeclarationMount` 是与 `CatalogGuide` 并列的第二套候选目录 + 挂载器（自带 `ChildCandidates`、终结候选、`host.MountedUnit = shape`） — 证据 `import-equals-declaration-possible-shape.xl.md:256`（`ImportExportLegacyDeclarationMount.TryBuild(KindImportEquals, host, tokenIndex, context)`）→ `forms/import-export-legacy-declaration-mount.xl.md:175-181`（`shape.CatalogGuide = new CatalogGuide(ChildCandidates(kind), new ImportExportLegacyEndPossibleShape()); host.MountedUnit = shape;`）
  - `[X1]` ○ 候选存活与否还受一条全局路由判据 `ShouldYieldToDeclarationShell` 支配（IMPORTANCE 未定义的「让位」机制） — 证据 `import-equals-declaration-possible-shape.xl.md:58-62`（`if (StatementRouteUtil.ShouldYieldToDeclarationShell(units, tokenIndex)) { return ShapeStates.Reject; }`）
  - `[C1]` ○ 每一格都重跑一次 `Ready`，而 `Ready` 内部从 item 起点重扫到本格（`ItemStartCached` + `CodeUnits(start..tokenIndex)`），没有把「本格是不是族判定格」记进 cache — 证据 `import-equals-declaration-possible-shape.xl.md:53`、`forms/import-export-legacy-declaration-mount.xl.md:73-74`（`const start = ItemUtil.ItemStartCached(units, cache); const codeAt = CodeUnits(units, start, tokenIndex);`）
- 符合：`[C3]` state 走 `cache.GetState`/`SetState`（`:67-73`），build 后由 `CatalogGuide.Reset()` → `PossibleShapesComputeCache.Clear()` 复位（`core/syntax/catalog-guide.xl.md:106,113-117`）；`[B2]` 无 try/catch；`[U4]`/`[R19]` 被消费的 basic token 由 `host.Data.splice(start, end - start + 1, built)` 整体换成形状（`:278-281`）；`[R1]`/`[R2]` 未覆盖 `ExitOrPre`、未覆盖 `ComputePossibleShapes`。
- 结论：偏离（7 条；其中 ● 5、○ 2）

---

### typescript/tokens/declarations/enum-declaration-shape.xl.md（11847B / 244行；EnumDeclarationShape extends ShapeToken）

- 结构：shape 层（声明形状）。`{` 创建时 `OnBracketCreatedEvent` 装成员目录 + 终结候选；收口时 `BuildFromCode` 从收集到的 basic token 一次重建名字 / 成员 / 初始化器。
- 偏离：
  - `[C2]` ● 成员与初始化器在收口时**整段重建**：`FromUnits` 先把 `start..tokenIndex` 的非 trivia 单元收成 `code`，`BuildFromCode` 再逐条 `if/else` 重判（`enum` 关键字、名字、`{`），`BuildMembers` 又把 `bracket.Data` 重新按 `,` 切段，初始化器交给 `ExpressionBuilder.ParseAssign` — 证据 `enum-declaration-shape.xl.md:91-96`（`for (let at = start; at <= tokenIndex; at++) { if (!host.Data[at].IsTriviaToken) { code.push(...) } }`）、`:181`（`CollectBodyMembers(host, bodyUnit, context)`）、`:230-256`、`:322-324`（`builder.Load(valueUnits, valuePos); const value = builder.ParseAssign();`）
  - `[X1]` ○ 成员块目录不是直接 `bracket.CatalogGuide = ...`，而是先包一层角色目录再转 `BracketCatalogInstaller`（`MemberShellCatalog.InstallBodyCatalog` → `BracketRoleCatalog` + `BracketRoleResult.Known`） — 证据 `enum-declaration-shape.xl.md:73`（`MemberShellCatalog.InstallBodyCatalog(body, EnumDeclarationShape.CreateBodyPossibleShapes(), "MemberList", this, context)`）→ `types/member-shell-catalog.xl.md:176-183`
- 符合：`[P1]` 目录装在 bracket **create** 时（`OnBracketCreatedEvent`，`:58-75`），是 R13/R14 允许的路径；`[U4]`/`[R19]`/`[R20]` `Data` 只有 `Decorator` / 静态修饰词 / `IdentifierShape` / `EnumMemberShape`，`enum`、`,`、`=` 从不进 `Data`（`:186-207`），`SignInToken/SignOutToken` 只签范围不 `Add`（`:209-215`）；`[R33]`/`[R34]` 未覆盖 `ExitOrPre`、未覆盖 `ComputePossibleShapes`。
- 结论：偏离（2 条；其中 ● 1、○ 1）

---

### typescript/tokens/declarations/export-declaration-shape.xl.md（11380B / 226行；ExportDeclarationShape extends ShapeToken）

- 结构：shape 层 + 自带候选目录（`constructor` 里 `new CatalogGuide(CreatePossibleShapes(), new ExportDeclarationEndPossibleShape())`，`:53`）；两条建树入口：静态工厂 `FromUnits` 与「根级挂载壳」路径，`Close` 负责二次投影。
- 偏离：
  - `[U1]` ○ `IsTypeOnly` 在 `Close` 里才从 basic token `type` 提取，不在 build 那一刻 — 证据 `export-declaration-shape.xl.md:288-290`（`} else if (item instanceof Common && (item as Common).Is("type")) { this.IsTypeOnly = true; }`）
  - `[X2]` ○ `Close` 内保留一份「根级挂载壳路径」的全量修补：把承载括号化 moduleSpecifier 的 `Bracket` 重新投影成 `ParenthesizedExpressionShape`，逻辑与 `FromUnits` 里那段逐行重复 — 证据 `export-declaration-shape.xl.md:254-280`（`} else if (item instanceof Bracket && (item as Bracket).StartBracketChar === "(" ...` → `parenthesized.TryToClose(context);`）vs `:162-189`
  - `[C2]` ○ `FromUnits` 从 raw 单元整段解析（`export` / `type` / 子句 / `from` / with-assert），与 `CreatePossibleShapes` 的增量子句路径并存 — 证据 `export-declaration-shape.xl.md:94-99`、`:110-236`
- 符合：`[U4]`/`[R20]` 本批最干净的一处 —— `Close` 只把子形状放进 `kept` 并 `this.Data = kept`，basic token（`export`、`type`、`from`、`;`、括号）全部丢弃，且事后显式复查 `if (item.IsBasicToken) { throw ... }`（`:243-297`）；`[R19]` `ExportClause` / `ModuleSpecifier` / `Attributes` 在 build 那一刻已由 `FromUnits` 取到（`:140-142`、`:194-196`、`:211-212`）；`[R33]`/`[R34]` 未覆盖 `ExitOrPre`、未覆盖 `ComputePossibleShapes`；`[M]` `TryToClose` 覆写只是补 `SourceRange.End`（`:56-73`），不是 `ExitOrPre`。
- 结论：偏离（3 条；其中 ○ 3）

---

### typescript/tokens/declarations/variable-declaration-possible-shape.xl.md（11257B / 197行；IncrementalVariableStatementBuilder）

- 结构：builder 层（不是 `PossibleShape`，由变量语句候选在 build 期调用）。一次调用直建 `VariableStatementShape` → `VariableDeclarationListShape` → `VariableDeclarationShape` 三层并挂载。
- 偏离：
  - `[X1]` ● 用改 `Parent` 的方式绕开 `Token.Quit()` 无条件清 `Parent.MountedUnit` 的行为：闭括号被改挂到绑定模式形状上（无模式时置 `null`） — 证据 `variable-declaration-possible-shape.xl.md:218-223`（`const bracketBinding = binding as Bracket; if (pattern !== null) { bracketBinding.Parent = pattern; } else { bracketBinding.Parent = null; }`），注释自承 `Quit() clears Parent.MountedUnit`（`:204-217`）
  - `[X1]` ○ 形状上带 `Incremental` 开关位（IMPORTANCE 未定义该状态，只用来标记「走的是增量路径」） — 证据 `variable-declaration-possible-shape.xl.md:144`（`statement.Incremental = true;`）、`:160`（`declaration.Incremental = true;`）
  - `[P3]` ○ 手工搭三层挂载链 `host → statement → list → declaration`，并依赖「父括号的 `Quit()` 不会打断这条链」这一时序假设 — 证据 `variable-declaration-possible-shape.xl.md:198-202`（`host.MountedUnit = statement; statement.MountedUnit = list; list.MountedUnit = declaration;`）
- 符合：`[U4]` 被搬走的 basic token 用 `data.splice(start, moved.length)` 整体摘掉（`:142`），之后的 `:` / `;` 按 R17② 留在 `declaration.Data` 等子候选消费（`:176-182`）；`[B2]` 全文无 catch，未支持形态一律 `throw`（`:32`、`:48`、`:105`）；`[B1]` 每次取 `data[...]` 前都先算 `start`/`NextCode` 并检查是否越界（`:31-33`、`:36-38`）。
- 结论：偏离（3 条；其中 ● 1、○ 2）

---

### typescript/tokens/declarations/enum-declaration-possible-shape.xl.md（10844B / 222行；EnumDeclarationScan / EnumDeclarationPossibleShape）

- 结构：possible 层（8 字段扫描器 + 族候选）。`ComputeByIndex` 逐格步进到 `enum` 关键字即 `Done`，`BuildByIndex` 挂出 `EnumDeclarationShape` 空壳，收口交给 `EnumDeclarationEndPossibleShape`。
- 偏离：
  - `[B1]` ● 越界返回 `Uncertain`，不是 `Nothing` — 证据 `enum-declaration-possible-shape.xl.md:114-116`（`if (tokenIndex < 0 || tokenIndex >= units.length) { return ShapeStates.Uncertain; }`），且排在 `Arm()` 与让位判定之后（`:90-113`）
  - `[X1]` ● `ComputeByIndex` 首行 `DeclarationIncrementalRoute.Arm()` 直接改写全局开关 `StatementRouteUtil.EnableRootDeclarationShell = false`，`IsBuildable` 里再改一次 — 证据 `enum-declaration-possible-shape.xl.md:90`（`DeclarationIncrementalRoute.Arm();`）、`:275`（`DeclarationIncrementalRoute.Arm();`）→ `declaration-incremental-route.xl.md:41`（`StatementRouteUtil.EnableRootDeclarationShell = false;`）
  - `[B4]` ○ `ItemUtil.NextCode(units, ...)` 从 item 起点向 `units.length` 扫，没有以 `tokenIndex` 为上界（本格之前全为 trivia 时会取到本格之后的单元） — 证据 `enum-declaration-possible-shape.xl.md:94-95`（`const b3cStart = ItemUtil.ItemStartCached(units, cache); const b3cHeadAt = ItemUtil.NextCode(units, b3cStart);`）、`:102`（`ItemUtil.NextCode(units, b3cHeadAt + 1)`）→ `item-util.xl.md:26-30`
  - `[P1]` ○ 「跳过让位、自己提前挂壳」的判据（route 命中 + 本族 `Owns`）是自造触发点：R13 说的是 bracket create，这里在关键字格建形状 — 证据 `enum-declaration-possible-shape.xl.md:93-113`（`if (!(StatementRouteUtil.IsIncrementalShapesEnabled() && b3cOwns)) { return ShapeStates.Reject; }`）
  - `[X1]` ○ `BuildByIndex` 的「增量」与「legacy」两分支**同体**（都只调 `BodyGuideUtil.MountShell`），差别仅是是否额外装一个空候选目录 — 证据 `enum-declaration-possible-shape.xl.md:289-297`（`if (StatementRouteUtil.IsIncrementalShapesEnabled()) { ... MountShell(...); shell.CatalogGuide = new CatalogGuide([], new EnumDeclarationEndPossibleShape()); return shell; } return BodyGuideUtil.MountShell(host, start, tokenIndex, shell, context);`）
  - `[C1]` ○ 每格都重跑 `ShouldYieldToDeclarationShell`（内部 `Decide` 重新判路由），没有把路由结果记进 cache — 证据 `enum-declaration-possible-shape.xl.md:93`（`if (StatementRouteUtil.ShouldYieldToDeclarationShell(units, tokenIndex)) {`）
- 符合：`[C3]` `cache.GetState`/`SetState`（`:118-123`），build 后由 `CatalogGuide.Reset` 清 state；`[P3]` `MountShell` 设 `host.MountedUnit`（`body-guide-util.xl.md:117`）→ R32 挂载；`[B2]` 无 catch；`[R1]`/`[R2]` 未覆盖。
- 结论：偏离（6 条；其中 ● 2、○ 4）

---

### typescript/tokens/declarations/function-declaration-end-possible-shape.xl.md（9916B / 149行；FunctionDeclarationEndPossibleShape extends PossibleShape）

- 结构：possible 层（**终结候选**）。判「函数体闭合 / `;` / EOF / 行尾 ASI 起新语句」四种收口，`BuildByIndex` 用 legacy `FromUnits` 把壳换成正品。
- 偏离：
  - `[B1]` ● 越界返回 `Uncertain`，不是 `Nothing`（对终结候选而言 `Uncertain` 等于「还不收口」） — 证据 `function-declaration-end-possible-shape.xl.md:36-38`（`if (tokenIndex < 0 || tokenIndex >= units.length) { return ShapeStates.Uncertain; }`）
  - `[C2]` ● 收口时用 legacy `FunctionDeclarationShape.FromUnits(shell, 0, lastCode, ...)` 从壳内的 basic token **整段重建**整条声明，增量只负责「什么时候建」 — 证据 `function-declaration-end-possible-shape.xl.md:175`（`const built = FunctionDeclarationShape.FromUnits(shell, 0, lastCode, context, !hasBody, false, shell.Pos);`）
  - `[X1]` ● 收口后回扫父单元 `Data` 删除「同名 + 零宽」的 `;` 残片来修树，是一处 IMPORTANCE 未定义的修补通道 — 证据 `function-declaration-end-possible-shape.xl.md:182-201`（`if (start >= 0 && end >= 0 && start === end) { parent.Data.splice(at, 1); break; }`）
  - `[U2]` ○ 边界单元（下一条语句的第一个单元）不是「回挂 parent 后 `Reclose`」，而是手工 `splice` 进父 `Data` 再调自造重放 — 证据 `function-declaration-end-possible-shape.xl.md:203-213`（`parent.Data.splice(builtAt + 1 + index, 0, leftover[index]); parent.MountedUnit = null; DeclarationAsiBoundary.ReplayLeftover(parent, leftover, context);`）
  - `[B2]` ○ 上述重放内部 `catch { break; }` 把重跑 compute 时的异常吃掉 — 证据 `forms/declaration-asi-boundary.xl.md:575-579`（`try { guide.ComputePossibleShapesByIndex(host, at, context, PossibleSource.Close); } catch { break; }`），调用点 `function-declaration-end-possible-shape.xl.md:211`
  - `[B4]` ○ 收口判据 `StartsNewDeclarationLine` → `DeclarationAsiBoundary.NextLineWord(unit)` 从单元末尾读原始文档的下一行（越过 `tokenIndex`） — 证据 `function-declaration-end-possible-shape.xl.md:94-111`、`forms/declaration-asi-boundary.xl.md:387-459`
  - `[C1]` ○ `StartsNewDeclarationLine` 每格重判（含跳注释、跨行找词），结果不进 cache — 证据 `function-declaration-end-possible-shape.xl.md:59-71`（`for (let at = tokenIndex - 1; at >= 0; at--) { ... } if (previous >= 0 && !IsOpenTail(...) && StartsNewDeclarationLine(...))`）
- 符合：`[P3]` 走 `BodyGuideUtil.FinishShell` 换壳（`:177`），壳被正品替换后清 `MountedUnit`（`body-guide-util.xl.md:212-217`），树里不留壳 → `[S3]` 不违反；`[R1]`/`[R2]` 未覆盖。
- 结论：偏离（7 条；其中 ● 3、○ 4）

---

### typescript/tokens/declarations/module-declaration-shape.xl.md（8592B / 176行；ModuleDeclarationShape extends ShapeToken）

- 结构：shape 层。`{` 创建时 `OnBracketCreatedEvent` 装 module 体声明目录（`NamespaceBodyDeclarationMount.Install`）；静态工厂 `FromUnits` 从 `code`/`positions` 建树，限定名 `A.B.C` 由 `BuildLevel` 递归成嵌套声明。
- 偏离：
  - `[C2]` ○ `FromUnits` 是从 raw 单元一次性重建：先把 `code` 逐单元判修饰词 / 装饰器 / `namespace`/`module`/`global` 关键字 / 限定名 / 体括号，无体形（`declare module "m";`）再单独一支建 —— 证据 `module-declaration-shape.xl.md:51-53`（`static method FromUnits:(code:Array<Token>, positions:Array<int>, ...)`）、`:58-101`、`:147-184`（`if (bodyIndex < 0) { ... bodyless.TryToClose(context); return bodyless; }`）、`:198-199`
- 符合：`[P1]` 目录在 bracket **create** 时装（`:42-49`，`NamespaceBodyDeclarationMount.Install(bracket)` 内部 `body.CatalogGuide = new CatalogGuide(...)`，`forms/namespace-body-declaration-mount.xl.md:89`）→ R13/R14 允许路径；`[U4]`/`[R20]` `Data` 只有修饰词形状 / 名字形状 / `ModuleBlockShape`（`:207-218`），`namespace`、`module`、`.`、`;` 等 basic token 从不 `Add`；`[R19]` 名字与 `Body` 字段在 build 那一刻已取齐（`:34`、`:211-219`）；`[R33]`/`[R34]` 未覆盖。
- 结论：偏离（1 条；○ 1）

---

### typescript/tokens/declarations/interface-declaration-possible-shape.xl.md（7854B / 179行；InterfaceDeclarationScan / InterfaceDeclarationPossibleShape）

- 结构：possible 层（7 字段扫描器 + 族候选）；`BuildByIndex` 在关键字格把已到达单元搬进 `InterfaceDeclarationShape` 并挂载。
- 偏离：
  - `[B1]` ● 越界返回 `Uncertain`，不是 `Nothing`，且排在让位判定之后 — 证据 `interface-declaration-possible-shape.xl.md:66-73`（`if (StatementRouteUtil.ShouldYieldToDeclarationShell(...)) { return ShapeStates.Reject; } ... return ShapeStates.Uncertain;`）
  - `[X1]` ○ `BuildByIndex` 手抄了一份 `MountShell`（slice → 逐个 `Add` → `SignIn` → 取 `Pos` → `splice` → `Parent` → `MountedUnit`），既不用 `BodyGuideUtil.MountShell`，也不用现成的 `InterfaceDeclarationMount` — 证据 `interface-declaration-possible-shape.xl.md:221-244`（`const consumed = host.Data.slice(start, tokenIndex + 1); ... host.Data.splice(start, consumed.length, shell); shell.Parent = host; host.MountedUnit = shell;`）vs `body-guide-util.xl.md:99-119`、`forms/interface-declaration-mount.xl.md:84`
  - `[C1]` ○ 每格重跑 `ShouldYieldToDeclarationShell` 路由判定，结果不进 cache — 证据 `interface-declaration-possible-shape.xl.md:66`（`if (StatementRouteUtil.ShouldYieldToDeclarationShell(units, tokenIndex)) {`）
- 符合：`[P3]` 设 `host.MountedUnit = shell`（`:243`）→ R32；`[C3]` `cache.GetState`/`SetState`（`:75-80`），build 后由 `CatalogGuide.Reset` 清；`[B2]` 无 catch；`[R1]`/`[R2]` 未覆盖。
- 结论：偏离（3 条；其中 ● 1、○ 2）

---

### typescript/tokens/declarations/body-guide-util.xl.md（7775B / 159行；BodyGuideUtil）

- 结构：工具层（「壳目录」辅助）。6 个静态入口：体括号判定 / 给 bracket 装目录 / 挂壳 / 取成员 / 换壳 / 目录缓存，另定义 `BodyShapesFactory`、`BodyMembersFallback` 两个函数类型。
- 偏离：
  - `[X1]` ● 定义了 IMPORTANCE 之外的「壳」生命周期：`MountShell` 把宿主已到达的单元整体搬进一个**未关闭**形状并挂成 `MountedUnit`，`FinishShell` 再用正品把它从父 `Data` 里换掉并清 `MountedUnit` — 证据 `body-guide-util.xl.md:99-119`（`host.Data.splice(start, consumed.length, shell); shell.Parent = host; host.MountedUnit = shell;`）、`:186-218`（`parent.Data.splice(at, 1, built); ... shell.MountedUnit = null;`）；R31/R32 只规定「立即关闭」与「未关闭 + 挂载」两种去向，没有「壳被替换」这一状态转换。
  - `[X1]` ○ `IsBodyBracket` 用扫 `shell.Data` + `AngleJudge.ScanDepth` + 关键词黑名单的方式自己判「这个 `{` 是不是体括号」，与 `BracketRoleResolver` 的角色判定并行 — 证据 `body-guide-util.xl.md:56-89`（`for (const unit of shell.Data) { ... depth = AngleJudge.ScanDepth(unit, depth); previous = unit; } ... for (const word of blocked) { if (text === word) { return false; } }`）
  - `[X1]` ○ `CollectBodyMembers` 在「一个成员形状都没建出来」时改走 raw 兜底：造一个临时 `Bracket` 视图把尾巴整段交给 `rawFallback` — 证据 `body-guide-util.xl.md:124-141`（`if (!hasBuiltMember) { return rawFallback(host, bracket, context); }`）、`:163-182`（`const tail = new Bracket(host.Template); tail.Data = bracket.Data.slice(at); ... const tailMembers = rawFallback(host, tail, context);`）
  - `[C2]` ○ 上述兜底就是整段 raw 重建（`rawFallback` 即各族的 `BuildMembers`，逐条重新 `new XxxMember`） — 证据 `body-guide-util.xl.md:139-140`、`enum-declaration-shape.xl.md:226-227`
  - `[P2]` ○ `MountBodyGuide` 装的 `CatalogGuide` 只有候选、**没有终结候选**（`new CatalogGuide(shapes)`），与 `InstallBodyCatalog` 默认补 `WaitingEndPossible` 的做法不一致：同一件事两套安装器，前者零候选即按 R28 抛错 — 证据 `body-guide-util.xl.md:91-97`（`const guide = new CatalogGuide(shapes); bracket.CatalogGuide = guide;`）vs `types/member-shell-catalog.xl.md:179-181`、`core/syntax/catalog-guide.xl.md:86-90`
- 符合：`[U4]` `MountShell` 搬走的单元仍在壳内（没丢），`FinishShell` 用 `built` 原地替换并清 `MountedUnit`（`:196-217`），树里不留壳 → `[S3]` 不违反；`[B1]`/`[B2]` 本文件不跑 compute、无 catch；`[R33]`/`[R34]` 不适用。
- 结论：偏离（5 条；其中 ● 1、○ 4）

---

### typescript/tokens/declarations/import-declaration-end-possible-shape.xl.md（7404B / 187行；ImportDeclarationEndScan / ImportDeclarationEndPossibleShape）

- 结构：possible 层（**终结候选**，2 字段游标）。判 `;` / EOF / 行尾 ASI 三种收口；`BuildByIndex` 自己 `SignOut` → `TryToClose` → `Quit` 并卸壳。
- 偏离：
  - `[B1]` ● 越界返回 `Uncertain`，不是 `Nothing` — 证据 `import-declaration-end-possible-shape.xl.md:36-38`（`if (tokenIndex < 0 || tokenIndex >= units.length) { return ShapeStates.Uncertain; }`）
  - `[B4]` ● `CanEndAt` 从最后一个代码单元的 `EndIndex` 起逐字符读原始文档（跳空白 / 行注释 / 块注释），并读下一行首词判续接 — 证据 `import-declaration-end-possible-shape.xl.md:102-152`（`let at = lastRange.EndIndex; while (at < count) { const ch = whole.At(at); ...`）、`:155-179`（`IsContinuationWordAt`：`return word === "with" || word === "assert" || word === "from" || word === "as" || word === "defer";`）
  - `[U2]` ○ 边界单元被 `host.Data.splice(tokenIndex, 1)` 摘出后手工插回父 `Data`，没有 `Reclose`（父单元的下一次 compute 依赖后续字符自然触发） — 证据 `import-declaration-end-possible-shape.xl.md:216-226`（`parent.Data.splice(shellAt + 1, 0, boundary); boundary.Parent = parent;`）
- 符合：`[P3]` 立即关闭 + 卸载（`:218-219`、`:239-240`，`unit.TryToClose(context); unit.Quit();`）对应 R31/R27 的 `SignOut`→`TryToClose`→`Quit` 链；`[C1]` 游标 `state.Checked` 增量（`:49-54`）；`[C3]` `cache.GetState`/`SetState`（`:40-44`）；`[B2]` 无 catch；`[R1]`/`[R2]` 未覆盖。
- 结论：偏离（3 条；其中 ● 2、○ 1）

---

### typescript/tokens/declarations/class-declaration-possible-shape.xl.md（7383B / 148行；ClassDeclarationScan / ClassDeclarationPossibleShape）

- 结构：possible 层（7 字段扫描器 + 族候选）；`BuildByIndex` 只有一句 `BodyGuideUtil.MountShell`。
- 偏离：
  - `[B1]` ● 越界返回 `Uncertain`，不是 `Nothing`，且排在 `Arm()` 与让位判定之后 — 证据 `class-declaration-possible-shape.xl.md:68-76`（`DeclarationIncrementalRoute.Arm(); if (ShouldYield...) { return ShapeStates.Reject; } ... return ShapeStates.Uncertain;`）
  - `[X1]` ● `ComputeByIndex` 与 `IsBuildable` 各调一次 `DeclarationIncrementalRoute.Arm()`，把全局开关 `EnableRootDeclarationShell` 改成 `false` — 证据 `class-declaration-possible-shape.xl.md:68`、`:200` → `declaration-incremental-route.xl.md:41-42`
  - `[P1]` ○ 候选是否活下来由全局路由 `ShouldYieldToDeclarationShell` 决定，而壳的建立时机被提前到 `class` 关键字格 — 证据 `class-declaration-possible-shape.xl.md:69-73`、`:213-214`
  - `[C1]` ○ 每格重跑路由判定，结果不进 cache — 证据 `class-declaration-possible-shape.xl.md:69`
- 符合：`[P3]` `return BodyGuideUtil.MountShell(...)`（`:214`）设 `MountedUnit` → R32；`[C3]` `cache.GetState`/`SetState`（`:78-83`）；`[B2]` 无 catch；`[R1]`/`[R2]` 未覆盖。
- 结论：偏离（4 条；其中 ● 2、○ 2）

---

### typescript/tokens/declarations/export-declaration-end-possible-shape.xl.md（7314B / 178行；ExportDeclarationEndScan / ExportDeclarationEndPossibleShape）

- 结构：possible 层（**终结候选**，2 字段游标）。与 import 侧同构：`;` / EOF / 行尾 ASI，收口时 `SignOut`→`TryToClose`→`Quit`。
- 偏离：
  - `[B1]` ● 越界返回 `Uncertain`，不是 `Nothing` — 证据 `export-declaration-end-possible-shape.xl.md:37-39`（`if (tokenIndex < 0 || tokenIndex >= units.length) { return ShapeStates.Uncertain; }`）
  - `[B4]` ● `CanEndAt` 从最后代码单元的 `EndIndex` 起扫原始文档到「下一行首词」，含行注释 / 块注释的跳过 — 证据 `export-declaration-end-possible-shape.xl.md:103-165`（`let at = lastRange.EndIndex; ... if (word === "with" || word === "assert" || word === "from" || word === "as") { return false; }`）
  - `[U2]` ○ 边界单元摘出后手工插回父 `Data`，无 `Reclose` — 证据 `export-declaration-end-possible-shape.xl.md:204-213`（`parent.Data.splice(shellAt + 1, 0, boundary); boundary.Parent = parent;`）
- 符合：`[P3]` 立即关闭 + 卸载（`:205-206`、`:226-227`）；`[C1]` 游标增量（`:50-55`）；`[C3]` `cache.GetState`/`SetState`（`:41-45`）；`[B2]` 无 catch；`[R1]`/`[R2]` 未覆盖。
- 结论：偏离（3 条；其中 ● 2、○ 1）

---

### typescript/tokens/declarations/import-equals-declaration-shape.xl.md（7273B / 171行；ImportEqualsDeclarationShape extends ShapeToken）

- 结构：shape 层（无 `CatalogGuide`、无 possible）。静态工厂 `FromUnits` 从 `host.Data[start..tokenIndex]` 建 `IdentifierShape` + `ExternalModuleReferenceShape` / 左结合 `QualifiedNameShape` 链，末了 `TryToClose`（R31 的立即关闭形态）。
- 偏离：
  - `[C2]` ○ `FromUnits` 是手写解析器：先收 `code` 数组，再按 `import` / `type` / 名字 / `=` / `require(...)` / `A.B.C` 逐段建形状，与增量路径并存 — 证据 `import-equals-declaration-shape.xl.md:43-48`（`for (let at = start; at <= tokenIndex; at++) { if (!host.Data[at].IsTriviaToken) { code.push(...) } }`）、`:105-183`（`if (target instanceof Common && (target as Common).Is("require")) ... else { while (at < code.length - 1) { ... } }`）
- 符合：`[U4]`/`[R19]`/`[R20]` `import` / `type` / `=` / `require` / `.` / `;` 等 basic token 只用来取字段与算 `Pos`，`Data` 最终只有 [`ExportKeywordShape`? , `IdentifierShape`, 引用形状]（`:99-100`、`:184-194`）；字段在 build 那一刻取齐（`LocalName`/`Reference`/`IsTypeOnly`，`:184-186`）；`[R31]` 末尾 `shape.TryToClose(context)`（`:205`），无 `MountedUnit`；`[B1]`/`[B2]` 不跑 compute、无 catch；`[R33]`/`[R34]` 未覆盖（只覆写 `TryToClose` 做尾部 trivia 修剪，`:209-218`）。
- 结论：偏离（1 条；○ 1）

---

### typescript/tokens/declarations/import-declaration-possible-shape.xl.md（7030B / 134行；ImportDeclarationScan / ImportDeclarationPossibleShape）

- 结构：possible 层（3 字段扫描器 + 族候选）。`BuildByIndex` 手工装配 `ImportDeclarationShape`（修饰词换形状、余下单元原样入 `Data`），挂成 `MountedUnit` 后再补一次 `ComputePossibleShapes(context, Close)` 让子句候选长出来。
- 偏离：
  - `[B1]` ● 越界返回 `Uncertain`，不是 `Nothing`，且排在让位判定之后 — 证据 `import-declaration-possible-shape.xl.md:47-54`（`if (ShouldYield...) { return ShapeStates.Reject; } ... return ShapeStates.Uncertain;`）
  - `[X1]` ○ 又一份手写「挂壳」：slice → 逐个 `Add` → 修饰词就地换成 `ExportKeywordShape`/`DeclareKeywordShape` → `SignIn`/`Pos` → `splice` → `MountedUnit` → 手动 `ComputePossibleShapes(Close)`，与 `BodyGuideUtil.MountShell` 平行 — 证据 `import-declaration-possible-shape.xl.md:124-183`（`host.Data.splice(start, consumed.length, built); built.Parent = host; host.MountedUnit = built; ... built.ComputePossibleShapes(context, PossibleSource.Close);`）
  - `[P1]` ○ 建壳发生在 `import` 关键字格而非 bracket create：`IsBuildable` 只要求 `state.Stage !== 0`，即阶段 1（已见 `import`）就已可建 — 证据 `import-declaration-possible-shape.xl.md:186-191`（`return state !== null && state.Stage !== 0;`）
  - `[C1]` ○ 每格重跑 `ShouldYieldToDeclarationShell`，结果不进 cache — 证据 `import-declaration-possible-shape.xl.md:47`
- 符合：`[P3]` 挂载形态正确（`host.MountedUnit = built`，`:177`）→ R32；`[C3]` `cache.GetState`/`SetState`（`:56-61`）；`[B2]` 无 catch；`[U4]` 被搬单元的归属靠 `splice` 保证不重复（`:175`）；`[R1]`/`[R2]` 未覆盖。
- 结论：偏离（4 条；其中 ● 1、○ 3）

---

### typescript/tokens/declarations/export-assignment-possible-shape.xl.md（6093B / 116行；ExportAssignmentScan / ExportAssignmentPossibleShape）

- 结构：possible 层（10 字段扫描器 + 族候选）。两种收口：`;` 与行尾 ASI；`BuildByIndex` 用 `ExportAssignmentShape.FromUnits` 立即建树并 `splice` 回宿主。
- 偏离：
  - `[B1]` ● 越界返回 `Uncertain`，不是 `Nothing`，且排在 `Ready` 与让位判定之后 — 证据 `export-assignment-possible-shape.xl.md:52-64`（`if (...Ready(...)) { return ShapeStates.Accept; } if (ShouldYield...) { return ShapeStates.Reject; } ... return ShapeStates.Uncertain;`）
  - `[P1]` ● 触发点由 `ImportExportLegacyDeclarationMount.Ready` 自造（`export` + `=` 恰好到达的那一格即 `Accept` 并在 build 里挂壳），不是 bracket create 触发的 install catalog — 证据 `export-assignment-possible-shape.xl.md:52-55`、`:151-156`（`const mounted = ...TryBuild(KindExportAssignment, host, tokenIndex, context); if (mounted !== null) { return mounted; }`）
  - `[X1]` ○ 同一套 `ImportExportLegacyDeclarationMount` 旁路（自带候选目录 + `MountedUnit` 挂载）在 export-assignment 上复用，与 `CatalogGuide` 并行 — 证据 `export-assignment-possible-shape.xl.md:151` → `forms/import-export-legacy-declaration-mount.xl.md:175-181`
  - `[C1]` ○ 每格重跑 `Ready`，其内部从 item 起点重扫到本格，结果不进 cache — 证据 `export-assignment-possible-shape.xl.md:52`、`forms/import-export-legacy-declaration-mount.xl.md:73-74`
- 符合：`[P3]` 非 `Ready` 路径走 `FromUnits` + `splice`（形状内部已 `TryToClose`）→ R31 立即关闭（`:169-177`）；`[C3]` `cache.GetState`/`SetState`（`:66-71`）；`[B2]` 无 catch；`[R1]`/`[R2]` 未覆盖。
- 结论：偏离（4 条；其中 ● 2、○ 2）

---

### typescript/tokens/declarations/namespace-export-declaration-possible-shape.xl.md（5514B / 106行；NamespaceExportDeclarationScan / NamespaceExportDeclarationPossibleShape）

- 结构：possible 层（6 字段扫描器 + 族候选）。扫 `export` → `as` → `namespace` → 名字 → `;`，`BuildByIndex` 调 `NamespaceExportDeclarationShape.FromUnits` 立即建树。
- 偏离：
  - `[B1]` ● 越界返回 `Uncertain`，不是 `Nothing`，且排在 `Ready` 与让位判定之后 — 证据 `namespace-export-declaration-possible-shape.xl.md:45-57`（`if (...Ready(...)) { return ShapeStates.Accept; } ... return ShapeStates.Uncertain;`）
  - `[P1]` ● 触发点同样由 `Ready` 自造（`export as namespace` 三词到齐那一格），build 里再问一次 `Ready` 并直接挂壳 — 证据 `namespace-export-declaration-possible-shape.xl.md:45-48`、`:145-150`
  - `[X1]` ○ `ImportExportLegacyDeclarationMount` 旁路（第三处复用），与 `CatalogGuide` 并行的第二套目录/挂载 — 证据 `namespace-export-declaration-possible-shape.xl.md:145` → `forms/import-export-legacy-declaration-mount.xl.md:175-181`
  - `[C1]` ○ 每格重跑 `Ready`（内部从 item 起点重扫），结果不进 cache — 证据 `namespace-export-declaration-possible-shape.xl.md:45`
- 符合：`[P3]` 非 `Ready` 路径 `FromUnits` + `host.Data.splice(start, tokenIndex - start + 1, built)`（`:157-158`）→ R31；`[C3]` `cache.GetState`/`SetState`（`:59-64`）；`[B2]` 无 catch；`[U4]` 消费掉的 `export`/`as`/`namespace`/`;` 由 `splice` 一次性移除。
- 结论：偏离（4 条；其中 ● 2、○ 2）

---

### typescript/tokens/declarations/namespace-export-possible-shape.xl.md（4809B / 115行；NamespaceExportScan / NamespaceExportPossibleShape）

- 结构：possible 层（6 字段游标 + 子句候选）。判 `export * as ns` 这一段是否成形，`BuildByIndex` 把 `*` 之后整段交给 `NamespaceExportShape.FromTokens`。
- 偏离：
  - `[B1]` ● 越界返回 `Uncertain`，不是 `Nothing` — 证据 `namespace-export-possible-shape.xl.md:42-44`（`if (tokenIndex < 0 || tokenIndex >= units.length) { return ShapeStates.Uncertain; }`）
  - `[C1]` ○ `BuildByIndex` 从 `start` 到 `tokenIndex` 重扫找 `*` 的下标，而 `state.Star` 本来就在同一次扫描里记过了 — 证据 `namespace-export-possible-shape.xl.md:110-116`（`let star = -1; for (let at = start; at <= tokenIndex; at++) { ... if (unit instanceof Symbol && (unit as Symbol).Is("*")) { star = at; } }`）vs `:66-67`（`state.Star = at;`）
  - `[C2]` ○ 子句由 `NamespaceExportShape.FromTokens(host.Data.slice(star, tokenIndex + 1))` 从 raw 单元整段重建 — 证据 `namespace-export-possible-shape.xl.md:120`
- 符合：`[C3]` `cache.GetState`/`SetState`（`:46-50`），build 后由 `CatalogGuide.Reset` 清；`[B2]` 无 catch；`[P3]` 子形状原地替换 `Data` 的一段（`:140-142`），不需要 `MountedUnit`；`[B4]` 所有判据只读 `units[0..tokenIndex]`（`:59-101`）；`[R1]`/`[R2]` 未覆盖。
- 结论：偏离（3 条；其中 ● 1、○ 2）

---

### typescript/tokens/declarations/namespace-import-possible-shape.xl.md（4535B / 110行；NamespaceImportScan / NamespaceImportPossibleShape）

- 结构：possible 层（5 字段游标 + 子句候选）。判 `import * as ns` 这一段，`BuildByIndex` 把 `*` 之后整段交给 `NamespaceImportShape.FromTokens`。
- 偏离：
  - `[B1]` ● 越界返回 `Uncertain`，不是 `Nothing` — 证据 `namespace-import-possible-shape.xl.md:38-40`（`if (tokenIndex < 0 || tokenIndex >= units.length) { return ShapeStates.Uncertain; }`）
  - `[C1]` ○ `BuildByIndex` 从 **0** 扫到 `tokenIndex` 找 `*`，既不从 `state.Start` 起，也不用已经记下的 `state.Star` — 证据 `namespace-import-possible-shape.xl.md:101-106`（`let star = -1; for (let at = 0; at <= tokenIndex; at++) { ... if (unit instanceof Symbol && (unit as Symbol).Is("*")) { star = at; } }`）vs `:61-62`（`state.Star = at;`）
  - `[C2]` ○ 子句由 `NamespaceImportShape.FromTokens(host.Data.slice(star, tokenIndex + 1))` 从 raw 单元整段重建 — 证据 `namespace-import-possible-shape.xl.md:110`
- 符合：`[C3]` `cache.GetState`/`SetState`（`:42-46`）；`[B2]` 无 catch；`[P3]` 子形状原地替换 `Data` 的一段并设 `Parent`（`:130-132`），无需 `MountedUnit`；`[B4]` 判据只读 `units[0..tokenIndex]`（`:54-94`）；`[R1]`/`[R2]` 未覆盖。
- 结论：偏离（3 条；其中 ● 1、○ 2）

---

## 本批统计

- 文件数 18；`filesWithDeviations` 18；偏离条目 66（每文件 1–7 条，无「无偏离」文件）。
- 按编号：`B1` 12、`B4` 6、`C1` 10、`C2` 8、`P1` 6、`P2` 1、`P3` 1、`U1` 1、`U2` 3、`B2` 1、`X1` 16、`X2` 1；`S1`/`S2`/`S3`/`S4`/`P4`/`B3`/`C3`/`U3`/`U4`/`R1`/`R2`/`X3`/`D1`/`N` 0。
- 强度：● 27 条、○ 39 条。
- 四条贯穿本批的主因：
  1. `[B1]` 12/12 个 possible 的越界返回都是 `Uncertain`（不是 `Nothing`），其中 7 处还把越界检查排在外部机制（`Ready` / 让位 / `Arm`）之后 —— 根因是 `ShapeStates` 类型里没有 `Nothing` 分支，「数据未就绪」与「候选还活着」被合并。
  2. `[X1]` 16 条：同一件「挂壳 / 装目录 / 判角色」被写了多套 —— `BodyGuideUtil.MountShell`、`MemberShellCatalog.InstallBodyCatalog`（角色目录层）、`InterfaceDeclarationMount`、`ImportExportLegacyDeclarationMount`（自带候选目录），再加上各 possible 里手抄的 slice→splice→`MountedUnit` 片段（`import-declaration-possible-shape:124-183`、`interface-declaration-possible-shape:221-244`）。
  3. `[C1]` 10 条 + `[B4]` 6 条：每格重跑路由判定 / `Ready` 重扫本条目，以及「从单元 `EndIndex` 读原始文档下一行」（`NextAfterName`、`CanEndAt`、`NextLineWord`、`NextChar`）成为收口判据的常规手段。
  4. `[C2]` 8 条：声明族的收口一律回到 legacy 全量重建 —— `FromUnits` / `BuildFromCode` / `BuildMembers` / `FromTokens` 从 raw 单元重解析，增量壳只决定「什么时候建」。
- 正向证据（本批不是全灰）：`[U4]`/`[R19]`/`[R20]` 在 4 个 declaration shape 上全部成立 —— `EnumDeclarationShape`、`ModuleDeclarationShape`、`ImportEqualsDeclarationShape` 从不把 basic token 放进 `Data`；`ExportDeclarationShape.Close` 甚至显式过滤并 `throw` 残留 basic token（`export-declaration-shape.xl.md:243-297`）。`[C3]` 12 个 possible 全部走 `GetState`/`SetState` 且由 `CatalogGuide.Reset` 复位；`[R1]`/`[R2]`（`ExitOrPre` / `ComputePossibleShapes`）本批 18 个文件无一处覆盖。
- 单文件最重：`import-equals-declaration-possible-shape.xl.md`（7 条，`NextAfterName` 直读原始文档 + `Ready` 自造触发点）、`function-declaration-end-possible-shape.xl.md`（7 条，legacy 整段重建 + 零宽残片修补 + 自造重放）。
