# 设计偏离审计 — `typescript/tokens/declarations/forms`

审计对象：本批 8 个文件，91683B / 1907 代码行。只读源码，未改动任何源码或 `docs/IMPORTANCE.md`。

阅读约定：

- 证据行号一律是 `read` 工具的全文行号（本批文件总行数：933 / 584 / 483 / 166 / 139 / 95 / 89 / 58）。
- 标题里的「代码行」取事实表 `_facts/typescript-tokens-declarations-forms.md` 的口径（只数代码行，故小于全文行数）。
- 判据编号见 `01-rules.md` 的 `R01–R36` / `S1…D1`；`●` 明确偏离，`○` 疑似。

本层共性（先说结论，下面各节只给证据）：

IMPORTANCE 的语法层只有 shape / possible / end / catalog guide 四件套（`IMPORTANCE.md:19-20`、`docs/importance-1028/01-rules.md:24`），
本批 8 个文件整体却是「装配 / 委派 / 挂载 / 判界」层——设计里没有这一层的对应物。其中 5 个是挂载器（在关键字那一格直接把整族壳 `splice` 进 `Data` 并置 `MountedUnit`），
1 个是委派器（占位壳 + `Replace`），1 个是判界器（ASI 的第二份实现），只有 1 个（`declare-variable-possible-shape`）是真 possible。
挂载器之所以能绕过设计，靠的是各族的 possible 在自己的 `BuildByIndex` 里把建树责任转交给它们
（`typescript/tokens/statements/declaration-statement-possible-shape.xl.md:177-197`、`typescript/tokens/declarations/import-equals-declaration-possible-shape.xl.md:256-257`），
以及一个全局布尔位 `StatementRouteUtil.EnableIncrementalShapes`（`typescript/tokens/statements/statement-route-util.xl.md:83-89`）作为总闸。

---

### typescript/tokens/declarations/forms/import-export-legacy-declaration-mount.xl.md（32481B / 739行；ImportExportLegacyDeclarationMount、ImportExportLegacyEndScan、ImportExportLegacyEndPossibleShape、ImportEqualsReferenceScan、ImportEqualsReferencePossibleShape、ExportAssignmentValueScan、ExportAssignmentValuePossibleShape、NamespaceExportNameScan、NamespaceExportNamePossibleShape）

- 结构：会话/挂载层 + possible 层混合体。3 个 `Kind` 常量 + 1 个按 kind 分派的 `TryBuild` 负责在关键字格挂 3 种族壳（`ImportEqualsDeclarationShape` / `ExportAssignmentShape` / `NamespaceExportDeclarationShape`），另带 4 组「扫描状态类 + possible/end」逐格推进引用与名字。名字里的 **legacy 指 TS 的遗留声明形态**（`import x = require("m")` / `export =` / `export as namespace`），**不是解析器的 legacy 回退路径，也不是整段 raw 重建旁路**：`Ready` 只在 `tokenIndex` 之前数代码单元（`Ready` 里 `CodeUnits(units, start, tokenIndex)` 由 `:56` 的 `at <= tokenIndex` 定界），`TryBuild` 也只搬 `start..tokenIndex` 这一段前缀（`:153`）。
- 偏离：
  - `[X1]` ● 按 kind 整数分派的单一挂载器，替三个族各自完成「在关键字格挂壳」——设计里只有 shape/possible/end，没有分支转发器 — 证据 `typescript/tokens/declarations/forms/import-export-legacy-declaration-mount.xl.md:41-45`（`## static field KindImportEquals:int = 1` … `KindNamespaceExport:int = 3`）与 `:156-162`（`if (kind === … ) shape = new ImportEqualsDeclarationShape(host.Template)` 三分支）
  - `[X2]` ● 本文件是「整文件回退」这条旁路的供给端：20 处 `throw new Error("增量变量形状未支持：…")`，被上层捕获后以 `shell=false` 重解析整个文件 — 证据 `:445`（`throw new Error("增量变量形状未支持：declaration import-equals 括号")`）、`:459`、`:739`，回收点 `typescript/run/source-file-runner.xl.md:23-29`（`catch (error) { … ParseCore(text, filePath, false) … LastFileFallback = true }`）
  - `[B4]` ● `IsBuildable` 直接读 `tokenIndex` 之后的单元来决定「继续等」 — 证据 `:651-659`（`[W5:IMPORT-EQUALS-CHAIN]` 注释后 `for (let at = last + 1; at < units.length; at++) { … return !(units[at] … Is(".")) }`）与 `:812-829`（`[W5:EXPORT-EQUALS-VALUE] 后面还跟着 . 时继续等`）
  - `[C2]` ● 三处把整段 raw 一次性重建，而不是在已建形状上收口 — 证据 `:536-616`（`// 整条链在这里**一次**建出` + `:571` `for (let step = 0; step < codeUnits.length; step += 2)` 重建整条 `A.B.C`）、`:797-799`（`const builder = new ExpressionBuilder(host.Template, context); builder.Load(expressionUnits, equalEnd); const expression = builder.ParseExpression();`）
  - `[C3]` ○ 手写 `Checked` 水位线复位与 `CatalogGuide.Reset` 的 cache 清空构成两套复位机制 — 证据 `:291-294`（`if (state.Checked > tokenIndex + 1) { state.Checked = 0; state.LastCode = -1; }`）、`:413-417`、`:690-694`、`:858-862`，对照 `core/syntax/catalog-guide.xl.md:117`（`this.PossibleShapesComputeCache.Clear()`）；`GetState/SetState` 本身是合规的（`:286-289`）
  - `[X1]` ○ 自建续接词表与续接符号表，与唯一实现并列第二份 — 证据 `:245-260`（`IsOpenTail` 判 `=` `.` `,` `:` `+` `-` `*` `/` 加 `OpenTailWords`）与 `:260`（`["import", "export", "as", "namespace", "type", "from", "require", "default"]`），唯一实现在 `typescript/tokens/statements/statement-token-sets.xl.md:40-107`
  - `[X1]` ○ 指标计数器 — 证据 `:47`（`## static field MountCount:int = 0`）、`:181`（`ImportExportLegacyDeclarationMount.MountCount += 1;`）
- 结论：偏离（7 条：X1×3、X2×1、B4×1、C2×1、C3×1）。**不构成 P2**——候选收敛仍在 `CatalogGuide` 里（`core/syntax/catalog-guide.xl.md:66-107`），本文件只是被各族 possible 的 `BuildByIndex` 调用；**不构成 S4**——AST 仍由形状关闭后产出。

### typescript/tokens/declarations/forms/declaration-asi-boundary.xl.md（19178B / 462行；DeclarationAsiBoundary）

- 结构：工具层（静态判界器），不是 shape/possible/end。设计里「一条声明在哪一格收口」属于 end 候选 + 候选收敛的职责；本类是它之外的一份独立实现，已被声明族的至少 10 处调用（`typescript/tokens/declarations/variable-declaration-shape.xl.md:139-140`、`typescript/tokens/declarations/variable-declaration-list-possible-shape.xl.md:68`、`typescript/tokens/declarations/variable-declaration-end-possible-shape.xl.md:50`、`typescript/tokens/declarations/function-declaration-end-possible-shape.xl.md:100`、`typescript/tokens/expressions/forms/primary/arrow-possible-shape.xl.md:204`）。
- 偏离：
  - `[X1]` ● 判界器本体 + 5 个专用放行支，设计无对应物 — 证据 `:51-60`（`[A2-D2:BLOCK-HOST]` 把宿主块体 `}` 并进边界判据）、`:106-124`（`shapeTail` / `yieldTail` / `arrowBlockTail` 三支并成一条早收口判据）
  - `[X1]` ● 第二份 ASI 词法：自建字符扫描与自带词表，而「唯一实现」的声明就在隔壁文件里 — 证据 `:301-343`（`NextCodeChar` 手工跳空白/`//`/`/* */`）、`:387-459`（`NextLineWord`）、`:377-385`（`StartsNewStatementLine`）、`:371-375`（`ContinuationWords` 四个词），对照 `typescript/tokens/statements/statement-token-sets.xl.md:44-45`（`这是 ExpressionStatementPossibleShape.IsContinuation 的唯一实现（R5-C2：原来 boundary 层还有一份 IsContinuationToken 手工副本，随同一清理项删除）`）
  - `[X1]` ○ 与 `statement-boundary-util` 的判界**漂移**：`CanClose` 一支复用了 `CanEndStatement`（`:53-58`），但 `CanCloseAtLineBreak` 整支绕过它，改用自己那 4 词表 + 字符判定；两边词集不等价（符号续接 ~50 项在 `statement-token-sets.xl.md:46-101`，本类完全没有），且 `NextLineWord` 遇非字母返回 `""` 而调用方把 `""` 当「不是新语句行」 — 证据 `:106-124`、`:133-135`（`return DeclarationAsiBoundary.StartsNewStatementLine(current) || …IsBlockHostBoundary(…) || …ArrowBodyCloseStartsStatement(…)`）对照 `typescript/tokens/statements/statement-boundary-util.xl.md:22-229`（`IsAsiBoundary` 含语句起点回走 / 调用位 / 后缀 `++` / 声明头词表）、`:444-446`（`if (!isLetter && first !== "_" && first !== "$") { return ""; }`）
  - `[B4]` ● 读 `tokenIndex` 之后的数据 — 证据 `:77`（`LastCodeIndex(units, units.length) !== tokenIndex`）、`:126`（`HasClosableShape(units, units.length)`，其循环 `:522` 是 `at < tokenIndex`）、`:107` + `:465`（`HasAnnotationShape` 的 `for (let at = 0; at < units.length; at++)`）、`:151`（`for (let at = tokenIndex + 1; at < units.length; at++)`）
  - `[B2]` ● compute 路径里 catch 吃掉异常 — 证据 `:575-579`（`try { guide.ComputePossibleShapesByIndex(host, at, context, PossibleSource.Close); } catch { break; }`）
  - `[C1]` ● 每格从头/从尾重扫且无 cache（本类拿不到 `PossibleShapeCache`） — 证据 `:465-477`（`HasAnnotationShape` 全表扫）、`:522-546`（`HasClosableShape` 两趟扫）、`:363-369`（`LastCodeIndex` 反向扫）、`:401-458`（`NextLineWord` 逐字符扫）
  - `[X1]` ○ 递归守卫开关位 `ReplayDepth`，深度 > 0 时重放静默不做 — 证据 `:21-25`（`## static field ReplayDepth:int = 0`）、`:561-563`（`if (DeclarationAsiBoundary.ReplayDepth > 0) { return; }`）、`:582`（`finally { … ReplayDepth -= 1 }`）
  - `[P1]` ○ 自造触发点：以任意 `at` 直接驱动目录，绕过 `CatalogGuide` 的唯一入口（以 `Data.length - 1` 驱动） — 证据 `:576`（`guide.ComputePossibleShapesByIndex(host, at, …)`）对照 `core/syntax/catalog-guide.xl.md:44-48`
- 结论：偏离（8 条：X1×4、B4×1、B2×1、C1×1、P1×1）。它是「end 候选 + 候选收敛」之外的第二份判界实现，且已被 10 处依赖，事实上成了本族的标准判据；漂移风险落在词表与符号闭集上。

### typescript/tokens/declarations/forms/export-inner-declaration-delegate.xl.md（17835B / 355行；ExportInnerDeclarationShape、ExportInnerStartPossibleShape、ExportInnerFunctionEndPossibleShape、ExportInnerDelegate）

- 结构：委派层 + 占位壳。`ExportInnerDeclarationShape` 是空壳，`ExportInnerStartPossibleShape` 判「内层是 `declare const|let|var` 还是 `default function`」，收口时 `ExportInnerDelegate` 用 `Replace` 把占位壳换成真正的族形状（`:460`、`:479`）。它替 `ExportDeclarationPossibleShape.OwnsExportInner`（`typescript/tokens/declarations/export-declaration-possible-shape.xl.md:84-113`）与本族的 shape build 做了「内层声明族是哪一个、由谁建、树序怎么排」。
- 偏离：
  - `[X1]` ● 空占位壳：一个没有任何字段与目录的 ShapeToken，唯一用途是被换掉 — 证据 `:56-62`（`# class ExportInnerDeclarationShape extends ShapeToken` 只有 `super(template)`），对照 R18「形状树与 TS AST 同构」；被换点 `:460`（`placeholder.Replace(built)`）、`:479`（`placeholder.Replace(shell)`）
  - `[X1]` ● 自建「文档字符前瞻」扫描器判形态，而现成工具已有两个 — 证据 `:262-337`（从 `range.EndIndex` 起逐字符跳空白/行终止/`//`/`/* */`，`while (words.length < 2 && at < count)` 收词），对照 `typescript/tokens/statements/statement-scanner.xl.md:1121`（`NextWord`）与 `typescript/tokens/statements/statement-route-util.xl.md:679`（`IsSameLineWordAhead`）
  - `[B4]` ● 以内层关键字之后的文本来定形态，只对 `secondAt` 做 `tokenIndex` 短路，前瞻本身不受约束 — 证据 `:346`（`if (secondAt < 0 || secondAt > tokenIndex || secondAt >= host.Data.length)`）与 `:349`（`ProbeKind(host.Data, secondAt)` 内部读 `range.EndIndex` 之后的字符）
  - `[C2]` ● `BuildFunction` 把整条函数声明交给 `FromUnits` 从 raw 单元重建，挂载期间逐格喂进来的单元被再解析一遍 — 证据 `:207`（`const built = FunctionDeclarationShape.FromUnits(shell, functionAt, lastCode, context, false, true, shell.Pos)`）
  - `[X1]` ● builder 直建 + 手工排树序：`unshift` 修饰词、手工 `Parent`、手工装空候选目录 — 证据 `:225-229`（`built.Data.unshift(defaultModifier)` … `built.Data.unshift(exportModifier)`）、`:458-460`（`built.Data.unshift(exportModifier); … placeholder.Replace(built)`）、`:469`（`shell.CatalogGuide = new CatalogGuide([], new ExportInnerFunctionEndPossibleShape())`）
  - `[P2]` ○ 同一判据两份实现（字符 vs 单元），不一致时会把候选判死成零候选并抛错 — 证据 `:324-337`（`ProbeKind` 的字符判据）对照 `:94`、`:115`、`:428`（`ExportDeclarationPossibleShape.OwnsExportInner(units, headAt, secondAt, thirdAt)`）；零候选的后果见 `core/syntax/catalog-guide.xl.md:86-89`（`throw new Error("CatalogGuide: 没有候选形状可以构成…")`）⇒ 整文件回退（X2）
  - `[C1]` ● 每轮从 0 开始找首代码单元，不看 cache — 证据 `:79`（`const headAt = ItemUtil.NextCode(units, 0);`）、`:103`（同句，`IsBuildable` 再来一遍）
  - `[C3]` ○ `cache` 形参收了却从未使用（`GetState/SetState` 全文件 0 处） — 证据 `:70`（`ComputeByIndex:(units, tokenIndex, cache, source)`）、`:100`（`IsBuildable:(units, tokenIndex, cache, context)`），方法体无 `cache` 引用；可用实现 `typescript/tokens/item-util.xl.md:78-88`（`ItemStartCached`）
  - `[X1]` ○ 用索引算术补偿自己改过的数组：摘掉 `export` 单元后把 `tokenIndex` 减一传下去 — 证据 `:443-444`（`units.splice(exportAt, 1); const built = IncrementalVariableStatementBuilder.Build(placeholder, tokenIndex - 1, context, true)`）
- 结论：偏离（9 条：X1×4、B4×1、C2×1、P2×1、C1×1、C3×1）。C2 明确；**S4 不成立**（AST 仍由形状关闭后产出）；P2 是「判据副本诱发零候选」而非候选语义被改写。合规项：`:375-377`、`:405-406` 用 `ReloadMessage.FromRange` 走 R17④ 的正规通道。

### typescript/tokens/declarations/forms/import-export-declaration-mount.xl.md（7467B / 129行；ImportExportDeclarationMount）

- 结构：挂载层。在「第 2 个代码单元」那一格直接把 `ImportDeclarationShape` / `ExportDeclarationShape` 挂上来，再把剩下的单元按字符区间卸下重放。它替 `ImportDeclarationShape` / `ExportDeclarationShape` 自己的目录做了「前缀搬运」，这两个壳的目录本来是要逐格消费字符的（`typescript/tokens/declarations/import-declaration-shape.xl.md:61`）。
- 偏离：
  - `[X1]` ● 「前缀搬运 + 卸单元 + 按字符区间重放」机制，设计里没有这一件 — 证据 `:114-146`（`// 把它们**卸下来、按字符区间重放**回父单元`；`:139` `host.Data.splice(start, leftover.length)`）、`:162-164`（`context.Messages.push(ReloadMessage.FromRange(host, replayStart, replayEnd))`）
  - `[X1]` ● 第二份根层宿主判据 — 证据 `:35-37`（`if (host.Parent !== null) { return null; }`），现成实现是 `typescript/tokens/statements/statement-route-util.xl.md:208-215`（`IsRootDeclarationHost`）；同批 interface/type-alias 用的是 `IsDeclarationHost`（`interface-declaration-mount.xl.md:31`）
  - `[X1]` ○ 悬空指针补丁：卸下来的单元不树化，但要把 `Parent` 改到本形状，否则 `Quit()` 会把刚挂上的形状摘掉 — 证据 `:140-145`（`// 被卸下来的单元不进树，但**要把它们的 Parent 改到本形状**` + `item.Parent = shape;`），机制来源 `core/syntax/token.xl.md:251-252`（`if (this.Parent.MountedUnit === this) { … this.Parent.MountedUnit = null; }`）
  - `[P1]` ○ 自造触发点：挂载后从外部补一次目录计算 — 证据 `:161`（`shape.ComputePossibleShapes(context, PossibleSource.Close);`）
  - `[C1]` ○ 「Pos = 前一个非 trivia 单元 EndIndex」的反向扫第三份拷贝 — 证据 `:104-113`，同一段还有 `typescript/tokens/declarations/body-guide-util.xl.md:41-54`（`BasePos`）和 `interface-declaration-mount.xl.md:61-70`
  - `[P3]` ○ build 产物换身份：本候选不建自己的壳，改为把族形状 `splice` 进 `Data` 并置 `MountedUnit`，调用方把它当作「本候选已建」返回 — 证据 `:156-159`（`host.Data.splice(start, 0, shape); shape.Parent = host; host.MountedUnit = shape;`）对照 `typescript/tokens/statements/declaration-statement-possible-shape.xl.md:177-182`（`const mounted = ImportExportDeclarationMount.TryBuild(…)` 直接 `return mounted`）
- 结论：偏离（6 条：X1×3、P1×1、C1×1、P3×1）。合规项：`:40-55` 全部以 `tokenIndex` 为界（R22 ✓）；`:57-86` 把 `import(` / `import.meta` / `import x =` / `export =` / `export as` 明确让回 legacy 通道（`:59`、`:62`、`:66`、`:73`、`:76`）；0 处 `throw`，不喂 X2。

### typescript/tokens/declarations/forms/declare-variable-possible-shape.xl.md（6051B / 92行；DeclareVariablePossibleShape extends PossibleShape）

- 结构：**本批唯一的真 possible**。`Owns` 是静态判据，被别族直接复用（`typescript/tokens/statements/declaration-statement-possible-shape.xl.md:108`、`control-flow-statement-possible-shape.xl.md:96`），另有一处以注释声明与本判据同源（`export-declaration-possible-shape.xl.md:109`）；`ComputeByIndex` / `IsBuildable` / `BuildByIndex` 齐备，候选语义由 `CatalogGuide` 的五条承担（`core/syntax/catalog-guide.xl.md:66-107`）。
- 偏离：
  - `[B4]` ● `ComputeByIndex` 在 `secondAt > tokenIndex` 时仍然读 `units[secondAt]`，且与同文件 `IsBuildable` 的守卫不对称 — 证据 `:95-100`（`const secondAt = ItemUtil.NextCode(units, headAt + 1); … Owns(units, headAt, secondAt)`，守卫只有 `:96` 的 `secondAt >= units.length`）对照 `:120-121`（`if (secondAt >= units.length || secondAt > tokenIndex) { return false; }`）。本格就是 `declare` 时 `secondAt` 必然大于 `tokenIndex`
  - `[B1]` ○ 越界返回 `Uncertain` 而不是 `Nothing` — 证据 `:32-34`、`:73-75`（`if (tokenIndex < 0 || tokenIndex >= units.length) { return ShapeStates.Uncertain; }`）；`ShapeStates` 只有三个值（`core/syntax/shape-states.xl.md:1-7`），无法表达 `Nothing`，故此条记疑似
  - `[C1]` ○ 同一组位置算三遍、结果从不入 cache — 证据 `:65-67` 与 `:79-81`（两处 `ItemStartCached` + `NextCode` + `NextCode`）、`:126-127`（第三次求 `bindingAt`）；cache 只被 `ItemStartCached` 用来缓存 item start（`typescript/tokens/item-util.xl.md:78-88`）
  - `[C3]` ○ `state` / `share` 全未使用（R09–R11） — 证据 全文件 `cache` 只作为 `ItemStartCached` 的实参出现（`:65`、`:79`、`:111`），无 `GetState` / `SetState` / `GetShare`
  - `[X1]` ● build 把三层建造整段交给 builder 直建，而不是由本 possible 装配形状 — 证据 `:138`（`return IncrementalVariableStatementBuilder.Build(host, tokenIndex, context, true);`），被调方一次性建出三层并手工串 `MountedUnit`：`typescript/tokens/declarations/variable-declaration-possible-shape.xl.md:143-202`（`const statement = new VariableStatementShape(…)` … `statement.Add(list)` … `statement.MountedUnit = list; list.MountedUnit = declaration;`）
  - `[X1]` ○ 与 builder 各判一次 `const enum` 排除 — 证据 `:51-54`（`secondText === "const" && StatementScanner.NextWord(…) === "enum"`）对照 `variable-declaration-possible-shape.xl.md:77-79`（`if (declared !== true && headText === "const" && bindingText === "enum") { throw … }`）
  - `[D1]` ○ 示例放在无语言标注的围栏里（三个反引号后无 `txt`），同批其余文件都用了 `txt` 围栏（R01 只承认 `txt` 围栏内的示例） — 证据 `:20-25`（空标注围栏包住 `declare const x: number;` / `declare let x` / `declare var x` / `declare const sym: unique symbol`）
- 结论：偏离（7 条：B4×1、B1×1、C1×1、C3×1、X1×2、D1×1）。合规项要说清：R26（`:100-105` 先 `Reject` 再 `Accept`，注释 `:104` 明写「`Accept` = 不淘汰，建不建由 `IsBuildable` 决定」）、R30（`:126-129` 绑定到齐才 `true`）、R23（0 处 `catch`）、R22 的其余路径都以 `tokenIndex` 为界（`:81`、`:113`、`:120`）。C2 只在「整段前缀一次建三层」这层成立，记在 X1 条目里；**S4 不成立**——builder 建出来的仍是 shape，三层各自带目录（`variable-declaration-possible-shape.xl.md:186-187`），AST 由形状关闭产出。

### typescript/tokens/declarations/forms/namespace-body-declaration-mount.xl.md（3254B / 41行；NamespaceBodyDeclarationMount）

- 结构：目录装配层，**本批唯一踩准了设计时机的文件**：在 bracket create 时给模块体括号装上目录（R13/R14 ✓），只装目录不建形状，并带 end 候选 `BlockBodyWaitingPossibleShape`（`:89-91`）。调用点在模块声明壳的括号创建事件里（`typescript/tokens/declarations/module-declaration-shape.xl.md:42-48`）。
- 偏离：
  - `[X1]` ○ 目录候选表硬编码，代替「关联通过 catalog guide 表达」（R04） — 证据 `:40-50`（六个声明候选并列 + `for (const shape of BlockPossibleShape.CreateBodyPossibleShapes()) { shapes.push(shape); }`）
  - `[X1]` ○ 第二份「目录只建一份」的缓存实现 — 证据 `:36-54`（`CreatePossibleShapesCache` + `if (…=== null) { … }`），同一功能已有 `typescript/tokens/declarations/body-guide-util.xl.md:220-232`（`CreateShapesCache`）
  - `[X1]` ○ 三重开关门控且跨族耦合：壳表达式总开关会顺带关掉 namespace 体声明 — 证据 `:58-62`（`return StatementRouteUtil.IsIncrementalShapesEnabled() && StatementRouteUtil.EnableShellExpressions && StatementRouteUtil.EnableNamespaceBodyDeclarations;`）
  - `[X1]` ○ 静默让位：谁的目录先装谁赢，且调用方不检查返回值 — 证据 `:86-88`（`if (body.CatalogGuide !== null) { return false; }`），调用处 `module-declaration-shape.xl.md:48`（`NamespaceBodyDeclarationMount.Install(bracket);` 丢弃返回值）
- 结论：偏离（4 条，全部 ○ 级 X1）。核心时机（bracket create 装目录、end 候选、`Install` 只装目录不建壳）与 R13/R14/R15 一致，是本批最贴近设计的文件；偏离集中在「装配表 + 开关 + 计数器（`:32`、`:92-93`）」这类设计外挂上。

### typescript/tokens/declarations/forms/interface-declaration-mount.xl.md（3165B / 59行；InterfaceDeclarationMount）

- 结构：挂载层。`interface` 关键字关闭格把 `InterfaceDeclarationShape` 直接 `splice` 进宿主 `Data`，并让名字/成员从下一格起由壳自己吃。它替 `InterfaceDeclarationPossibleShape` 的 `BuildByIndex` 做了本该由 possible 收敛后统一做的事。
- 偏离：
  - `[X1]` ● 与既有 possible 的建壳路径逐行重复，而公共挂载器就在手边却没用 — 证据 `:61-88`（反向扫 Pos、`host.Data.slice(start, tokenIndex + 1)`、`Add`、`SignIn`、`splice`、`Parent`、`MountedUnit`）对照 `typescript/tokens/declarations/interface-declaration-possible-shape.xl.md:213-244`（同一段逻辑，逐行等价），公共实现 `typescript/tokens/declarations/body-guide-util.xl.md:41-54`（`BasePos`）与 `:99-118`（`MountShell`）
  - `[X1]` ● 空驱动：这一格 `CatalogGuide` 还是 `null`，`ComputePossibleShapes` 落到基类的 `Nothing` 分支，注释宣称的「让接口体 / heritage 从这一格起建」不会发生 — 证据 `:86-87`（`// 补一次目录计算，让接口体 / heritage 从这一格起建。` + `shape.ComputePossibleShapes(context, PossibleSource.Close);`）；`InterfaceDeclarationShape` 没有 `ComputePossibleShapes` 覆盖（该文件只有 `:33` 一行 `# class`），目录只在括号创建时装（`typescript/tokens/declarations/interface-declaration-shape.xl.md:78` `this.CatalogGuide = new CatalogGuide([], new InterfaceDeclarationEndPossibleShape())`），基类实现见 `core/syntax/unit-token.xl.md:22-29`（`if (this.CatalogGuide !== null) { … } return ComputePossibleShapesStates.Nothing;`）
  - `[P1]` ○ 自造触发点（上一条的机制面）：设计里没有「挂载后由外部补一次目录计算」这个动作 — 证据 `:87`
  - `[P3]` ○ build 换身份：本候选不建自己的壳，返回值被语句候选当作「已建」返回 — 证据 `:54-55`（`const shape = new InterfaceDeclarationShape(host.Template); return InterfaceDeclarationMount.Mount(host, shape, …);`）对照 `typescript/tokens/statements/declaration-statement-possible-shape.xl.md:187-190`
  - `[X1]` ○ 指标计数器 — 证据 `:20`（`## static field MountCount:int = 0`）、`:85`
- 结论：偏离（5 条：X1×3、P1×1、P3×1）。合规项：`:25-27` 开关门控、`:31` 用 `IsDeclarationHost` 参数化宿主、`:36-53` 全部以 `tokenIndex` 为界（R22 ✓）、0 处 `throw`。

### typescript/tokens/declarations/forms/type-alias-declaration-mount.xl.md（2252B / 30行；TypeAliasDeclarationMount）

- 结构：挂载层，走的是 `BodyGuideUtil.MountShell`（`:53`）这条公共路径，比 interface 干净。它替 `TypeAliasDeclarationPossibleShape.BuildByIndex` 做了同一件事（那条路也在建壳：`typescript/tokens/declarations/type-alias-declaration-possible-shape.xl.md:449-465`）。
- 偏离：
  - `[X1]` ● 用一个布尔位改写 shape 的字节级行为，而这个位打开的分支里包含**覆盖 `ExitOrPre`** — 证据 `:52`（`shell.Incremental = true;`），被打开的分支：`typescript/tokens/declarations/type-alias-declaration-shape.xl.md:91`、`:151`、`:188`、`:205`（`if (this.Incremental && !this.Finished && parent !== null && parent instanceof Bracket …)` 位于 `## protected method ExitOrPre`，行号 `:201`）。R33/R1 明令 shape 禁止覆盖 `ExitOrPre`——本文件正是这个覆盖的启用者
  - `[X1]` ● 双入口：同一族既走 possible 的 `BuildByIndex`，又走本挂载器，两条路的建壳代码不共享 — 证据 `:51-53`（`new TypeAliasDeclarationShape(host.Template)` + `shell.Incremental = true` + `BodyGuideUtil.MountShell(…)`）对照 `type-alias-declaration-possible-shape.xl.md:464`（`const built = TypeAliasDeclarationShape.FromUnits(host, start, end, context);`）
  - `[P1]` ○ 自造触发点：挂载后从外部补一次逐格驱动 — 证据 `:56`（`shell.ComputePossibleShapes(context, PossibleSource.Close);`）；这次是有效的（该 shape 覆盖了 `ComputePossibleShapes` 并按 `Incremental` 分支，`type-alias-declaration-shape.xl.md:148-183`），但驱动路线与 `CatalogGuide` 那条不同源：同一族两套驱动
  - `[X1]` ○ 指标计数器 — 证据 `:23`（`## static field MountCount:int = 0`）、`:54`
- 结论：偏离（4 条：X1×3、P1×1）。合规项：`:36-50` 两处 `> tokenIndex` 守卫（R22 ✓）、`:28-33` 开关门控、`:31` 复用 `IsDeclarationHost`、`:19-21` 示例在 `txt` 围栏内（R01 ✓）、0 处 `throw`。

---

## 本批统计

按文件：

| # | 文件（代码行） | 偏离数 | 编号分布 | 结论 |
| --- | --- | --- | --- | --- |
| 1 | `import-export-legacy-declaration-mount`（739） | 7 | X1×3 / X2×1 / B4×1 / C2×1 / C3×1 | 偏离 |
| 2 | `declaration-asi-boundary`（462） | 8 | X1×4 / B4×1 / B2×1 / C1×1 / P1×1 | 偏离 |
| 3 | `export-inner-declaration-delegate`（355） | 9 | X1×4 / B4×1 / C2×1 / P2×1 / C1×1 / C3×1 | 偏离 |
| 4 | `import-export-declaration-mount`（129） | 6 | X1×3 / P1×1 / C1×1 / P3×1 | 偏离 |
| 5 | `declare-variable-possible-shape`（92） | 7 | X1×2 / B4×1 / B1×1 / C1×1 / C3×1 / D1×1 | 偏离 |
| 6 | `namespace-body-declaration-mount`（41） | 4 | X1×4 | 偏离（轻） |
| 7 | `interface-declaration-mount`（59） | 5 | X1×3 / P1×1 / P3×1 | 偏离 |
| 8 | `type-alias-declaration-mount`（30） | 4 | X1×3 / P1×1 | 偏离 |
| — | 合计（1907） | **50** | — | 8/8 有偏离 |

按编号：

| 编号 | 次数 | 强度 | 主要落点 |
| --- | --- | --- | --- |
| `X1` | 26 | ●13 / ○13 | 挂载器/委派器/判界器本身、开关位（`Incremental`、`ReplayDepth`、三重 `Enable*`）、手工排树序、索引算术补偿、指标计数器 |
| `X2` | 1 | ● | `import-export-legacy-declaration-mount` 的 20 处 `throw` 供 `source-file-runner` 整文件回退 |
| `B4` | 4 | ● | 4 条：legacy 的两处 `IsBuildable`、`declaration-asi-boundary` 多处传 `units.length`、`ProbeKind` 的文本前瞻、`declare-variable` 的 `ComputeByIndex` |
| `B2` | 1 | ● | `DeclarationAsiBoundary.ReplayLeftover` 的 `catch { break; }` |
| `B1` | 1 | ○ | `declare-variable-possible-shape` 越界退 `Uncertain` |
| `C1` | 4 | ● | 每格重扫（ASI 判据、`NextCode(units, 0)`、Pos 反向扫、位置三遍求值） |
| `C2` | 2 | ● | 整条实体名链一次重建、`ExpressionBuilder` 整段解析、`FunctionDeclarationShape.FromUnits` 整条重建 |
| `C3` | 3 | ○ | 手写 `Checked` 水位线、`cache` 形参未用、`state`/`share` 全未用 |
| `P1` | 4 | ○ | 四处「挂载后从外部补一次 `ComputePossibleShapes`」/ 直驱目录 |
| `P2` | 1 | ○ | `ProbeKind`（字符）与 `OwnsExportInner`（单元）两份判据，失配即零候选抛错 |
| `P3` | 2 | ○ | build 产物换身份（不建本候选的壳，挂族形状并交由调用方当「已建」返回） |
| `D1` | 1 | ○ | `declare-variable-possible-shape:20` 无标注围栏 |

本批三条主线：

1. **设计外挂是本层的主体，不是个别**：8/8 文件有 X1；6 个挂载/委派器（`import-export-legacy`、`import-export`、`interface`、`type-alias`、`namespace-body` 五个挂载器 + `export-inner` 委派器）里有 4 个不是自己决定何时被调用，而是靠别族 possible 在 `BuildByIndex` 里把建树责任转交过来（`declaration-statement-possible-shape.xl.md:177-197`、`import-equals-declaration-possible-shape.xl.md:256-257`、`export-assignment-possible-shape.xl.md:151-152`、`namespace-export-declaration-possible-shape.xl.md:145-146`）。也就是说：候选收敛（设计里唯一允许决定「建什么」的地方）被保留，但**建什么被挂载器改写**。
2. **P2/S4/C2 的实际归属**：没有一处是完整意义上的 P2（没有改写 `Reject` / `Accept` / 零候选 / 多候选 / 唯一候选 / `IsBuildable` 的次序——`CatalogGuide` 五条本身完好）；**没有一处构成 S4**（AST 仍由形状关闭产出）；C2 在 2 个文件、3 处局部成立（`:536-616`、`:797-799`、`:207`），都是「把一段 raw 一次性重建」而不是整文件重建。唯一真正的整文件重建旁路是 X2（`source-file-runner.xl.md:23-29`），本批的 `throw` 是它的供给端。
3. **两套判据已并成事实标准**：`DeclarationAsiBoundary` 的字符级判界已被 10 处调用（含 `variable-declaration-shape` 的三个层），而设计里对应的 `IsAsiBoundary` / `CanEndDeclarationTail` 只在 `CanClose` 一支被复用；`ContinuationWords`（4 词）与 `StatementTokenSets.IsExpressionContinuation`（~60 项）是两个来源，正是 `statement-token-sets.xl.md:44-45` 记录过、已被清理过一次的重复型缺陷的复现。
