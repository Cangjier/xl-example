# 30 declarations 大文件：类声明 shape 与 export 声明候选（审计）

审计对象：`typescript/tokens/declarations/class-declaration-shape.xl.md`、`typescript/tokens/declarations/export-declaration-possible-shape.xl.md`。判据见 [01-rules.md](01-rules.md)，行号以 `read` 返回值为准（每个文件都读到了结尾）。

### typescript/tokens/declarations/class-declaration-shape.xl.md（59227B / 1314 行；ClassDeclarationShape extends ShapeToken）

- 结构：shape 层 + 手写解析器。`ClassDeclarationShape` 只承载字段（`NameToken` / `DeclareKeyword` / `AbstractKeyword` / `HeritageClauses` / `Members` / `BodyBracket`）与静态工厂 `FromUnits` → `BuildFromUnits` → `BuildFromCode`；成员与参数各由本类的 `BuildMembers` / `BuildParameters` 逐格解析。类体括号在 `OnBracketCreatedEvent` 里装目录（9 个成员 possible）+ 终结候选 `ClassDeclarationEndPossibleShape`。文件不定义 basic token，也不产出 AST 节点。
- 偏离：

#### 类体括号与候选目录

- `[X1]` ● 类体目录走设计外的「早建成员壳」通道 `MemberShellCatalog`，连角色名都以字符串 `"MemberList"` 传入；成员壳的建/换/回滚、四个计数器全在这一族里，IMPORTANCE 没有对应机制 — 证据 `class-declaration-shape.xl.md:112`（`MemberShellCatalog.InstallBodyCatalog(body, ClassDeclarationShape.CreateBodyPossibleShapes(), "MemberList", this, context);`）、`:113`（`this.CatalogGuide = new CatalogGuide([], new ClassDeclarationEndPossibleShape());`）、`member-shell-catalog.xl.md:89-99`（`Open` 表与 `CreatedCount/FinalizedCount/UnwrappedCount/PrunedCount`）。
- `[P4]` ○ 类体括号 create 时只装目录与终结候选，**没有任何 `HandleCloseDispatch` 配置**；类体收口靠 `BuildFromCode` 里手工调一次 `FinalizeAll`，而不是 close 派发 — 证据 `class-declaration-shape.xl.md:104-113`（只有 `IsBodyBracket` 判定 + `InstallBodyCatalog` + `CatalogGuide`）、`:352-354`（`MemberShellCatalog.FinalizeAll(host, bodyUnit as Bracket, context);`）。R15/R16。
- `[S2]` ○ 九个成员 possible 装上了，却只起「判定/让位」作用；成员形状最终仍由本类的手写 `BuildMembers` 产出，R04–R05 的「每个成员由自己的 possible 收敛成形状」在成员层不成立 — 证据 `class-declaration-shape.xl.md:118-136`（`new PropertyDeclarationPossibleShape() … new ClassMemberCatchAllPossibleShape()`）、`:355`（`BodyGuideUtil.CollectBodyMembers(host, bodyUnit as Bracket, context, ClassDeclarationShape.BuildMembers)`）、`member-shell-catalog.xl.md:742`（成员收口时 `members = ClassDeclarationShape.BuildMembers(host, view, context);`）。

#### 静态工厂：FromUnits / BuildFromUnits / BuildFromCode

- `[C2]` ● 类声明整条在体括号关闭那一刻才从 raw 整段重建：`BuildFromUnits` 把 `host.Data[start..tokenIndex]` 全部复制成 `code`，`BuildFromCode` 再从这段 raw 重建装饰器、修饰词、名字、类型参数、heritage、成员，最后才 `TryToClose` — 证据 `class-declaration-shape.xl.md:189-208`（`:192-197` `for (let at = start; at <= tokenIndex; at++) { if (!host.Data[at].IsTriviaToken) code.push(host.Data[at]); }`）、`:211-233`（装饰器重新 `new ExpressionBuilder(...).ParseExpression()`）、`:247-296`（修饰词/名字）、`:296-337`（类型参数）、`:338-355`（heritage + 成员收口）、`:409-413`（`shape.TryToClose(context); return shape;`）。R06/R07，且违反 R12（名字在 `class C` 那一格就已确定，形状却要等到 `}`）。
- `[C1]` ● 每次调用都重扫，寻找结果不进 cache：`BuildFromUnits` 两遍扫 `host.Data`（`class-declaration-shape.xl.md:193-207`）；`BuildFromCode` 里装饰器、修饰词、类型参数、成员各自再扫一遍；`BuildParameters` 每次 `inner.Load(bracket.Data, base)` 后整表重走（`:527-533`）；`BuildMembers` 每次重建 `code` 数组并 `while (at < code.length)` 全量走（`:809-814`）。唯一的缓存只有目录实例 `CreateBodyPossibleShapesCache`（`:116-136`）。R08。
- `[B1]` ○ `BuildFromUnits` 直接下标取 `host.Data[at]`，不设越界保护，越界时是抛异常而不是返回 `Nothing` — 证据 `class-declaration-shape.xl.md:194`、`:200`（`if (!host.Data[at].IsTriviaToken) {`，`at` 由 `start..tokenIndex` 直接给出）。R25。
- `[U4]` ○ 静态工厂只读不消费：`FromUnits` 把 basic 单元复制进 `code` 后既不 `splice` 也不过滤，丢弃完全交给调用方，工厂自身不落实 R19「build 那一刻取出并丢弃」 — 证据 `class-declaration-shape.xl.md:192-197`、`:208`；对照调用方 `export-declaration-possible-shape.xl.md:697`（`host.Data.splice(start, tokenIndex - start + 1, built);`）。
- `[U1]` ○ `BodyBracket` 只在 bracket 创建钩子里赋值，经 `FromUnits`/`BuildFromCode` 建出的类 shape 该字段恒为 `null`（两条构造路径给出不同字段值） — 证据 `class-declaration-shape.xl.md:87`（`## field BodyBracket:Bracket | null = null`）、`:108`（`this.BodyBracket = body;` 是唯一赋值）、`:355-413`（build 路径全程未赋值）。

#### 成员手写解析：BuildMembers

- `[X1]` ● 类成员由一个 660 行手写扫描器逐格分派：`;`、static 块、`[` 索引签名与计算名、`#` 私有名、字符串名、数字名、方法/`get`/`set`/`constructor`/属性、ASI 收尾，全部在这一个函数里判 — 证据 `class-declaration-shape.xl.md:806-1472`（主环 `:818` `while (at < code.length) {`）、`:820-834`（`;` → `SemicolonClassElementShape`）、`:951-982`（`hasStatic` + `{` → `ClassStaticBlockDeclarationShape`）、`:991-1012`（`[k: T]` 判索引签名并 `ParseIndexParameter`）、`:1013-1039`（计算名 → `ComputedPropertyNameShape`）、`:1040-1061`（`#` → `PrivateIdentifierShape`）、`:1072-1102`（名字分派与可选方法 `?`）、`:1260-1269`（按 `accessorKind` / `nameText` 直接 `new GetAccessorShape / SetAccessorShape / ConstructorShape / MethodDeclarationShape`）、`:1423-1442`（索引签名成员）、`:1444-1470`（属性成员）。
- `[X1]` ● 参数表同样由本 shape 的 `BuildParameters` 手写遍历并手工 `new ParameterShape`，只有部分分支委托 `TypeBuilder.ParseParameter` — 证据 `class-declaration-shape.xl.md:505-764`、`:557-609`（带修饰词的参数属性，逐字段 `parameter.Add(...)`）、`:650-693`（带装饰器的普通参数）、`:752-761`（裸标识符参数 `new ParameterShape(host.Template)` + `IdentifierShape.FromBasicToken`）。

#### 探测式重建：BuildMemberFromCode

- `[X2]` ● 造一个假 `Bracket`（`view.Data = span`）再调 `BuildMembers` 试探重建，末位/`Pos` 不符就返回 `null`——整段 raw 重建旁路 + 失败即放弃 — 证据 `class-declaration-shape.xl.md:430-437`（`const view = new Bracket(host.Template); view.Data = span; … members = ClassDeclarationShape.BuildMembers(host, view, context);`）、`:441-453`（`members.length !== 1` / `Pos` / 尾端三重校验后 `return built;`）。
- `[B2]` ● 上述路径 `catch` 掉 `BuildMembers` 的异常并返回 `null`，构建诊断被吞 — 证据 `class-declaration-shape.xl.md:436-440`（`try { members = … } catch (error) { return null; }`）。R23。

#### Data 与字段

- `[S4]` ○ 本文件止于 `shape.TryToClose(context)`，没有任何 shape→AST 出口；全仓唯一 `ParseFromShape` 是 `ImportDeclarationAstNode.ParseFromShape` 且直接抛「未实现」 — 证据 `class-declaration-shape.xl.md:409-413`、`typescript/ast/declarations/import-declaration-ast-node.xl.md:28-31`（`throw new Error("ImportDeclarationAstNode.ParseFromShape 未实现");`）。R21。
- `[R20]` ● **符合**：`Close` 之后 `Data` 只剩子形状——`Data` 只 `Add` 装饰器/修饰词/名字/类型参数/heritage/成员，类体括号只进字段不 `Add`，basic token 一个都不进 `Data` — 证据 `class-declaration-shape.xl.md:355-408`（`shape.Add(decorator) … shape.Add(member)`）、`:108`（括号只进 `BodyBracket`）。字段提取也在 build 那一刻完成：`:356-358`（`NameToken` / `HeritageClauses` / `Members`）、`:385`、`:390`（`DeclareKeyword` / `AbstractKeyword`），故 R19 的字段侧成立。
- 结论：偏离（13 条）；另有 1 条标 **符合**（`[R20]`，不计入）。`R33`/`R34` 未违反——全文无 `ExitOrPre`、无 `ComputePossibleShapes` 覆盖；`R13` 成立——目录在 bracket create 时就装上了。

### typescript/tokens/declarations/export-declaration-possible-shape.xl.md（54749B / 1336 行；ExportDeclarationScan、ExportDeclarationPossibleShape extends PossibleShape）

- 结构：possible + 一个状态机 + 一个分派器。`ExportDeclarationScan` 是十个字段（`Start/At/Head/Second/Stage/Kind/DoneAt/LastBodyCode` 八个整型 + `Done/Asi` 两个布尔）的扫描游标；`ComputeByIndex` 按 `Stage` 逐档推进并给出 Accept/Reject/Uncertain；`BuildByIndex` 按 `Kind` 分二十余支，调别的形状的 `FromUnits` 或 `StatementBuilder/ExpressionBuilder/TypeBuilder` 重建整条声明并 `splice` 替换。候选的淘汰/终结/零候选/多候选仍由 `CatalogGuide` 负责，本文件不自建候选表。
- 偏离：

#### 状态机与入口

- `[X1]` ● 一个 possible 里塞进 35 档 `Stage` × 24 种 `Kind` 的数值状态机，导出各形态靠 `if (state.Stage === N)` 逐档判，IMPORTANCE 的三件套里没有这种「分支转发器 + 开关位」 — 证据 `export-declaration-possible-shape.xl.md:44-62`（`ExportDeclarationScan` 字段）、`:152-224`（首格一次分派 Stage 0/1/2/3/10/11/12/13/14/16/20/24/27/29/34）、`:227-559`（其余档位）、`:561-570`（按 Stage 给 Reject/Accept/Uncertain）。
- `[X1]` ● 判定入口先让位给外部「声明壳路由」，注释自称 Stage 4x — 证据 `export-declaration-possible-shape.xl.md:125-129`（`if (StatementRouteUtil.ShouldYieldToDeclarationShell(units, tokenIndex)) { … return ShapeStates.Reject; }`）；同一判据也出现在类声明候选 `class-declaration-possible-shape.xl.md:69-73`，说明这是一层跨族的仲裁开关。
- `[X1]` ○ `OwnsExportInner` 用原文 `NextWord` 判归属（`export declare const enum` 归 enum 族），是自造的归属判据 — 证据 `export-declaration-possible-shape.xl.md:84-120`（`:105-114` `declare` 分支、`:110-111` 调 `StatementScanner.NextWord`）。

#### BuildByIndex：整段重建与手工拼 children

- `[B4]` ● 读到 `tokenIndex` 之后的原始字符：归属判定直接扫当前 token 结束位置之后的文档文本找 `enum` — 证据 `export-declaration-possible-shape.xl.md:111`（`&& StatementScanner.NextWord(third.SourceRange.Document, third.SourceRange.EndIndex) === "enum"`）。R22。
- `[C2]` ● 每个 `Kind` 分支都从整段单元重建整条声明，再整段 `splice` 替换：调 `ClassDeclarationShape.FromUnits` / `InterfaceDeclarationShape.FromUnits` / `EnumDeclarationShape.FromUnits` / `FunctionDeclarationShape.FromUnits` / `TypeAliasDeclarationShape.FromUnits`，或直接 `StatementBuilder.BuildStatement` / `ExpressionBuilder.ParseExpression` / `TypeBuilder.ParseType` — 证据 `:685-700`、`:701-740`、`:742-796`、`:798-824`、`:1043-1062`（匿名 default 函数先 `new FunctionDeclarationShape` 再手工塞 `Body`）、`:1226-1236`、`:1325-1360`、`:1369-1407`，替换点 `:636` / `:697` / `:738` / `:794` / `:822` / `:854` / `:906` / `:928` / `:949` / `:1077` / `:1219` / `:1234` / `:1358` / `:1396` / `:1405`。R06/R07。
- `[C1]` ● `ComputeByIndex` 已经把下标记进 `state.Head` / `state.Second`（`:47-50`，写入点 `:165`、`:177`），`BuildByIndex` 全部丢掉，只用二十多个 `for (…; at <= tokenIndex; …)` 重新找同一个下标 — 证据 `:643-648`、`:650-655`、`:660-668`、`:678-683`、`:751-756`、`:807-812`、`:862-875`、`:958-993`、`:1024-1030`、`:1086-1112`、`:1146-1157`、`:1164-1169`、`:1226-1229`、`:1247-1284`、`:1298-1307`。R08。
- `[X1]` ● children 顺序由本 possible 手工 `unshift` 拼到别的形状的 `Data` 最前面，修饰词靠外部插入而不是形状自己闭合产出 — 证据 `:694-696`、`:735-739`、`:789-797`、`:817-823`、`:829-834`、`:849-856`、`:891-908`、`:923-930`、`:944-951`、`:1072-1079`、`:1214-1221`、`:1231-1236`；同族分派已开始腐化：`:1298-1307` 的 `break` 落在 `if` 之外，循环实际只看第一个非 trivia 单元。R18/R20 的同构性全靠这些手插顺序正确。
- `[P3]` ○ Accept 之后建不出来时一律 `return host`：既不 `SignOut`、不 `TryToClose`、也不挂载，raw 原样留在 `host.Data` 里 — 证据 `:578-580`、`:656-658`、`:757-759`、`:813-815`、`:876-878`、`:971-973`、`:1019-1021`、`:1031-1033`、`:1092-1094`、`:1103-1105`、`:1113-1115`、`:1160-1173`、`:1268-1270`。R27/R31–R32。
- `[P2]` ○ `Done` 之后对任意后续单元一律 `Accept`（`Stage = 4` 没有任何分支，落到 `if (state.Done) return ShapeStates.Accept`），候选永不淘汰；配合上一条的 `return host` 就会变成僵尸候选并触发「终结候选与其它候选同时成立」 — 证据 `:567-569`、`:170-176`（注释记录了该故障与停用闸）、`core/syntax/catalog-guide.xl.md:74-76`（`throw new Error("CatalogGuide: 终结候选与其它候选同时成立…")`）。
- `[U4]` ○ `Kind === 0` 把整段 raw 单元 `built0.Add(unit)` 塞进 `ExportDeclarationShape.Data`，然后只 `host.MountedUnit = built0` 就返回：basic token 的转化与丢弃全押在另一文件的目录和 `Close` 断言上 — 证据 `:583-587`、`:636-639`；`export-declaration-shape.xl.md:239-298`（`Close` 只认 `NamedExports` / `NamespaceExport` / `StringLiteral` / `Parenthesized` / `ImportAttributes` / `type`，收尾 `:292-297` 对残留 basic token 直接抛错）。R19–R20；挂载本身符合 R32。
- `[B1]` ○ 越界返回 `Uncertain` 而不是 `Nothing`，且越界检查排在 `ShouldYieldToDeclarationShell(units, tokenIndex)` 之后（helper 先跑） — 证据 `:125`、`:130-132`。R25。
- `[S4]` ○ 本 possible 只产出 shape（`:697-699`、`:1358-1360` 等 `return built`），没有任何 `ParseFromShape` 出口 — 证据 `typescript/ast/declarations/import-declaration-ast-node.xl.md:28-31`（全仓唯一实现且抛「未实现」）。R21。

#### 符合项（凭据）

- `[R09]/[R11]` ● **符合**：`cache.GetState` / `cache.SetState` 按 `this.Slot()` 按键存取（`:133-140`、`:576`、`:1435`），`state` 面向单个 possible；build 后的 reset 由 `CatalogGuide.Reset()` 的 `PossibleShapesComputeCache.Clear()` 承担（`core/syntax/catalog-guide.xl.md:110-118`），故不判 `C3`。
- `[P2]` ● **符合（结构侧）**：`Candidates` 之外没有自建候选表，淘汰（`Reject` 删除）、终结（`Candidates === 0`）、零候选、多候选、唯一候选 + `IsBuildable` 全部在 `CatalogGuide`（`catalog-guide.xl.md:66-107`）里；本文件只提供 `ComputeByIndex` / `IsBuildable`（`:1432-1443`）/ `BuildByIndex`。
- `[B2]` ● **符合**：全文无 `try` / `catch`（计数 0），异常不会被吞。
- 结论：偏离（12 条）；另有 3 条标 **符合**（`[R09]/[R11]`、`[P2]` 结构侧、`[B2]`，均不计入）。`P1` 成立——候选由 catalog 触发，非本文件自造触发点；`D1` 成立——围栏外无散文，事实表 prose 计数为 0。

## 本批统计

- 文件数：2；有偏离文件数：2（共读到文件末尾，分别为 1473 行与 1443 行的物理行）。
- 按编号计数（共 25 条偏离；正文里标 **符合** 的 4 条 `[R20]`/`[R09]/[R11]`/`[P2]`/`[B2]` 不计入）：`X1` 7（●6/○1）、`C2` 2（●）、`C1` 2（●）、`B1` 2（○）、`U4` 2（○）、`S4` 2（○）、`X2` 1（●）、`B2` 1（●）、`B4` 1（●）、`P2` 1（○）、`P3` 1（○）、`P4` 1（○）、`S2` 1（○）、`U1` 1（○）；`B3`/`P1`/`R1`/`R2`/`U2`/`U3`/`C3`/`X3`/`D1` 未出现（两文件均无 `ExitOrPre`/`ComputePossibleShapes` 覆盖、无 tsx、围栏外无散文；`export` 侧无 `try/catch`；`cache` 的 get/set/reset 链完整，故不计 `C3`）。
- 每条偏离都同时是一处「增量 → 全量」的退让：`BuildFromCode`(≈200 行) + `BuildMembers`(≈666 行) + `BuildParameters`(≈259 行) + `BuildByIndex`(≈835 行) ≈ 1960 行，全是「拿一段 raw 单元当场重建」。
- 最严重 3 条：
  1. `[X1]` ●（`class-declaration-shape.xl.md`）类体 9 个成员 possible 装上了却不承担形状构建，成员 AST 由本 shape 内 660 行手写扫描器 `BuildMembers` 产出（`member-shell-catalog.xl.md:742` 也在收口时回调它）——R04–R05 的「一类成员一个 possible 收敛」在类成员层整体失效。
  2. `[C2]` ●（`export-declaration-possible-shape.xl.md`）`BuildByIndex` 按 `Kind` 二十余分支、每支都调别的形状的 `FromUnits` 或 Builder 从整段单元重建整条声明再 `splice` 替换，配套 20+ 个 `for` 重找下标（`C1`）——R06/R08 的「增量为主、结果入 cache」被完全绕开。
  3. `[P2]`+`[P3]` ○（`export-declaration-possible-shape.xl.md`）`Done` 后对任意单元持续 `Accept` 且建不出时 `return host`，候选成为不淘汰的僵尸并能撞出「终结候选与其它候选同时成立」抛错——这是候选语义（R26–R27）与 build 去向（R31–R32）同时失守的组合故障。
