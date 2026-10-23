# HANDOFF — impl-wp2-3（WP-2 第三波：语句 item 表 / 对拍资产 / AtEof 收窄）

STATUS: PARTIAL
BRANCH: impl-wp2-3 @ 14c0c1ad
BASE: impl-wp2-2 @ a964c0c2（起于 refactor-integration @ a5e31a54 + 契约 G0–G6 + WP-1 enum 试点）

## 做了什么

1. **建 clone**：`C:\Users\Admin\Documents\GitHub\xl-example-set\impl-wp2-3`，branch `impl-wp2-3`，
   实际执行 `.\tools\new-member.ps1 -Name impl-wp2-3 -From impl-wp2-2 -Base impl-wp2-2`（脚本支持该参数），
   base = `impl-wp2-2/impl-wp2-2`，node_modules junction OK。
2. **构建转绿（本波第一件事，已完成）**：前任最后一次编辑（删掉非法尾节）已经修好 E1002，
   本波**没有改任何 `.xl.md` 就复现了绿**：
   - `xl_build(cwd=<clone>, paths=["core","typescript"], targets=["ts"], out="dist")` → **886 written / 0 error / 2435 warning**；
   - `node .\node_modules\typescript\bin\tsc -p tsconfig.json` → **exit 0**（前任担心的两个风险点都不成立：
     `host.Template` 在 `Token` 上有（`Token.Template`），`StatementScanner.AtEOF` 是普通静态字段可写）；
   - `..\tools\gates.ps1 -Tier quick` → **PASS**（tsc 3.96s / ast 0.84s / ast-diff 0.16s / body-guide 0.63s）。
3. **新增 `tests/body-drive/item-oracle.mjs`（验收资产 1，绿）**：
   逐前缀对拍 `StatementItemScan.Run` 与 `StatementScanner.ScanRoot` 的 `Status`/`End`（口径见文件头注释）。
   语料取自真实解析（运行时打桩 `StatementBuilder.prototype.Load` 捕获每段语句代码单元，
   不改任何源码；13 份语料里 12 份解析成功）→ **51 段代码 / 422 个前缀 / 0 分叉**，exit 0。
   `--verbose` 逐段打印，`--max-code` 控制单段上限（默认 200）。
4. **新增 `tests/body-drive/batch-split.mjs`（验收资产 2，绿）**：
   族无关骨架 + `FAMILIES` 配置（当前只有 `statement`，`makeHost/contextOf/runWhole/runSplit` 由族给），
   断言 INV-6 批次无关性：整段一次喂完 vs 在 `k = 1 / N/2 / N-1` 切两批，**整份 `host.Data` 签名**
   （构造器名 + XML）必须逐字一致 → **15 段 / 114 次断言 / 0 失败**。
   以后加 enum / members / module-block 族只追加配置，不改驱动。
5. **`StatementItemScan.AtContainerEnd` + `AtEof` 收窄（本波唯一的引擎侧修复，见下「关键设计决定」）**：
   `typescript/tokens/items/statement-item-scan.xl.md` 的 `Run` 现在把文档级 `AtEof` 收窄成
   「文档到末尾 **且** 本 item 最后一个代码单元就是容器的最后一个非 trivia 单元」。
   **这是 `batch-split` 抓出来的真实缺陷**：整段一次喂完时，`return i;` 里的裸 `return` 因为 `AtEof=true`
   被 `ScanReturnOrThrow` 判成空 return（建出空 `ReturnStatementShape`），切两批时反而正确。
   收窄只可能把 `true` 变成 `false`，所以 oracle 的 `AtEof = (n === N)` 口径不受影响（`n < N` 时本来就是 `false`），
   对拍仍然 422/422 全绿。
6. **`tests/bench/statement-scaling.mjs`**：前任拷入的文件**已跑**（读数见下表；`--rounds 15`）。

## 关键设计决定（下一任必须先读）

### G7 仍然存在：没有「块 `{` 创建时」的合法挂载点

本波按要求先做了挂载点调研（`Bracket.Transit` / `UnitToken.OnBracketCreatedEvent` / `BatchAdapter`），结论：

- `Bracket.Transit`（core）在建出括号后只通知**父单元** `OnBracketCreatedEvent`；父单元是「当前正在吃内容的那个 token」。
  语句块 `{` 的父单元是 **`Root`（core）或外层 `Bracket`（core）**，两者都不认「这是语句块」——
  它们没有 `CatalogGuide` 能区分块体与对象字面量，也没有语句族可挂的钩子。
- 类型侧的枚举试点能挂，是因为 `EnumDeclarationShape` 是**壳**（自己吃 `enum` 头再吃枚举体括号），
  天然是那个括号的父单元。语句没有对应的壳：块体括号的父单元永远是 core 的 `Root`/`Bracket`。
  `block-possible-shape.xl.md` / `block-shape.xl.md` 都是空实现/constructor，`BlockShape` 只在
  `StatementBuilder.BuildBlock` 里 new（那时 `Data` 已经建完）。
- 因此**不改 `core/syntax/batch/**`、不改 core 其它文件的约束下，没有流式挂载点**。
  本波**没有**复制第二套引擎，也**没有**越权改 core。

**采用的路线**（= 前任建议的务实路径 a，仍未落地，见「未完成项」）：
`StatementBuilder.BuildBlock` 里对**已闭合**块的 `Data` 跑一遍 `StatementBodyItemHost`
（`Feed` 覆盖全 `Data` 的 `BasicTokenBatch` + `CloseBatch`），再用新增 `BuildFromItems` 建块。
`tests/body-drive/batch-split.mjs` 已经把这条路径的**前半段**（引擎吃整块 `Data`）跑通并证明批次无关，
所以剩下的只有「引擎 splice 后的 `Data` 怎么变成 `BlockShape` 的 children」这一步（`BuildFromItems`）。

### 为什么 `AtEof` 必须收窄（契约级发现，建议写进 WP-3/契约补丁）

`ItemScanState.AtEof` 按 G0 是**文档级事实**，但 `StatementScanner` 的 EOF 规则假设「本层没有后续内容」
（旧路径里那个 `AtEOF` 是根级终结候选算出来的，只在根级成立）。语句 item 在**容器中间**时两者不同：
`function f() { return i; }` 里 `return` 的 `NextChar` 还是 `i`，但文档/宿主已签出 → `AtEof=true`。
不收窄就会把 `return i;` 建丢 `i`（batch-split 的 split@5 用例就是这件事）。
收窄的判据只看 `code[last].Parent.Data` 的**尾部**（先遇到 last → 到头；先遇到别的非 trivia → 没到头；
容器已 splice / 找不到 last 时保守返回 `true`），所以代价是 O(尾随 trivia)，不是每次 O(n)。

### 性能代价（如实记录，**没有**达标）

阶段 1 的 `StatementItemScan` 仍是**每条 item 每次 `Analyze` O(前缀长度)**：
`Run` 命中 `Watermark` 只复用「同长度前缀」的结果，而 `ItemListEngine.Feed` 每吃一个 unit 就调一次
`Extend + Analyze`，所以一条 item 的前缀长度从 1 涨到 L，总计 O(L²) per item。
`statement-scaling` 的档 3（单条长表达式）/ 档 4（长 if 头）/ 档 5（深嵌套）因此会退化
（档 1/2 的「语句数」维度是线性的，因为每条 item 短）。
**要达到 O(1)/unit 需要阶段 2 的逐 unit 直译**：`Semi(4)/IfHead(9)/DeclBody(3)/DoBody(14)/TryBlock(17)`
五个状态各自拆成驻留状态，每步只消费一个 unit，`PendingEnd` + `Watermark` 承担 lookahead 重算。
本波轮次用尽，未做。

## 门禁读数（本分支实测）

| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| xl_build | `xl_build(cwd=…\impl-wp2-3, paths=["core","typescript"], targets=["ts"], out="dist")` | 886 written / **0 error** / 2435 warning | 绿 |
| tsc | `node .\node_modules\typescript\bin\tsc -p tsconfig.json` | exit 0 | 绿 |
| quick | `..\tools\gates.ps1 -Tier quick` | PASS（5.6s；tsc 3.96 / ast 0.84 / ast-diff 0.16 / body-guide 0.63） | 绿 |
| ORACLE | `node .\tests\body-drive\item-oracle.mjs` | 51 段 / 422 前缀 / **0 分叉** / exit 0 | 绿 |
| SPLIT | `node .\tests\body-drive\batch-split.mjs` | 15 段 / 114 断言 / **0 失败** / exit 0 | 绿 |
| AST | `node .\typescript\cases\ast-json.mjs statements` 等 | quick 的子集三构造 1214/1214 一致（0 结构/位置/字段差） | 绿（子集） |
| STMT | `node .\tests\bench\statement-scaling.mjs --rounds 15 --base ..\baseline-build\build` | **跑不动**：档 1 语料解析崩溃（见下「statement-scaling 为什么没有读数」），**baseline build 同样崩** | 红（非本波引入） |

### statement-scaling 为什么没有读数（已定位，如实记录）

命令与报错原文：

```
node .\tests\bench\statement-scaling.mjs --rounds 15 --base ..\baseline-build\build
→ SyntaxException: throw by line 0 ---> at file: stmt-count-250.ts:0
  InnerException: Error: 表达式没有读完
    at StatementBuilder.BuildExpressionRange (statement-builder.js:146)
    at StatementBuilder.BuildExpressionStatement (statement-builder.js:1023)
    at StatementBuilder.BuildStatement (statement-builder.js:395)
    at StatementBuilder.BuildBlock (statement-builder.js:969)
    at FunctionDeclarationShape.FromUnits (function-declaration-shape.js:291)
```

- **不是本波引入**：把同一条命令换成 `--build ..\baseline-build\build`（基线分支构建）**崩在同一处**。
- **也不是保留字**：档 1 的 `ident(i)` 在 i=248 会生成 `in`（`let in = 248;`），本波已给标识符加 `v` 前缀
  （`return "v" + s;`，改的是允许写范围内的 `tests/bench/statement-scaling.mjs`），崩点不变。
- **定位（只解析、不测速的最小复现）**：`function f() { let vX = k; … }` 在 N=1/2/10/40 解析成功，
  N=50/100/200/250/500 **全部失败**（阈值在 41–49 之间）；`xN` 形式标识符同样如此。
  四个语句的普通块（`let a = 1; let b = 2; a = 3;`）正常。
  所以这是**当前解析器在「函数体语句数 ≥ ~41」上的既有缺陷**，与本重构无关，但让 `statement-scaling`
  的五个档（N/T/D = 250 起）全部无法运行。
- **下一步**：先用 `N = 41..49` 逐值二分找到确切阈值，把那一份源码交给 `ast-json` 的对照，
  定位是 `BuildExpressionStatement` 的 ASI 判据还是 `Root`/`ExpressionStatementPossibleShape` 的收口；
  修好之后 `statement-scaling` 才有读数，才能判断阶段 2 的标度目标。
  （**不要**为了让 bench 跑起来去改 `StatementScanner` 或 bench 的判据阈值 —— 崩溃在解析器，不在测量。）

> **AST 零影响**：本波**没有**把 `StatementBodyItemHost` 接到任何括号上（没有 `Bracket.BatchAdapter` 赋值），
> 也没有改 `BuildBlock`。`StatementItemScan.AtContainerEnd` 只是 `Run` 内部把 `AtEof` 收窄，
> 而 `Run` 的唯一调用点是 `StatementItemRule` / `StatementItemScan` 自身，两者都还没进解析路径。
> 因此 `ast-json` / `buffer-equivalence` 不可能因本包变红（quick 的 `ast-json-diff` 三构造 1214/1214 已复测）。

## 未完成项（逐条，带精确下一步）

1. **`StatementBuilder.BuildFromItems`（未建）** —— 落点：`typescript/tokens/statements/statement-builder.xl.md`
   （允许写范围）。`BuildBlock`（:1216）改成：

   ```ts
   const first = this.At;
   const bracket = this.Units[this.At] as Bracket;
   this.At++;
   const shape = new BlockShape(this.Template);
   if (this.Context.BatchMode !== 0) {
     const host = new StatementBodyItemHost(bracket as unknown as Token, StatementBodyItemHost.CreateRules());
     const batch = new BasicTokenBatch();
     batch.Reset(bracket as unknown as Token, 0, true);
     batch.Sealed = true;
     batch.Recompute();
     host.OnBasicTokens(batch, this.Context);
     host.CloseBatch(this.Context);
   }
   const inner = new StatementBuilder(this.Template, this.Context);
   let base = 0;
   if (bracket.SourceRange.StartIndex >= 0) { base = bracket.SourceRange.StartIndex + 1; }
   inner.Load(bracket.Data, base);
   while (inner.At < inner.Units.length) {
     const unit = inner.Units[inner.At];
     // 引擎已经建好的语句（splice 进来的非 basic、非 trivia 单元）直接当子节点
     if (!unit.IsBasicToken && !unit.IsTriviaToken) { shape.Add(unit); inner.At++; continue; }
     shape.Add(inner.BuildStatement());
   }
   return this.Finish(shape, first, first);
   ```

   （= `BuildFromItems` 的全部内容；`statement-item-rule` 的 import 要加进 statement-builder 的依赖表。
   `StatementItemRule.Build` 已经跑通整条建造路径 —— `batch-split` 的 15 段就是它建的。）
   **注意**：`StatementBuilder.Load` **已经跳过 trivia**，所以 item 路径（只喂非 trivia）与旧路径的
   `Positions` 口径一致（`StatementItemScan.BasePos` 与旧 `base` 同口径），这是本波验证过的前提。
2. **块接线未开**：上面的 `BuildBlock` 改动**没有落盘**（本波轮次用尽，且它直接改解析路径，
   必须配一次 `ast-json statements` + `ast-json-diff statements` + `buffer-equivalence` 才能提交）。
   建议下一任**先接 `BuildBlock`，只接这一处**（`BuildCaseBlock`(:2127) / if·while·for 体是另外的
   循环，先不动；它们里的语句仍走旧路径，AST 一定等价）。
3. **`typescript/run/line-terminator.xl.md` 未改**：仍是逐字符扫全文。接法：`BasicTokenBatch.HasLineBreak`
   已由 `Recompute` 一次算出（代码区间内是否有 `\n`），把 `HasBetween` / `HasBefore` 改成读批元信息；
   `StatementScanner.EndsAtLineBreak` / `HasLineBreakBefore` 是它的下游，改完必须重跑 AST statements。
4. **`StatementScanner` 降为 oracle（未做）**：仍被 `statement-possible-shape.xl.md`（root 在用，**不要删**）
   与 `statement-item-scan` 引用。删除路径：先 grep `StatementScanner` 的所有引用点，
   确认只剩 `statement-item-scan` / 测试后再逐个替换（`statement-possible-shape` 保持不动）。
   **本波没有删除任何 possible 文件**。
5. **阶段 2 逐 unit 直译（未做）**：见「性能代价」；这是 `statement-scaling` 达标的前提。
6. **`tests/bench/statement-scaling.mjs` 的语料修复已落盘但不足以让它跑起来**：`ident()` 加了 `v` 前缀
   （避开保留字），崩点仍在「函数体语句数 ≥ ~41」这个既有解析器缺陷上（见门禁读数下面的定位）。

## 下一步的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp2-4 -From impl-wp2-3 -Base impl-wp2-3
cd impl-wp2-4
# 0) 先确认起点是绿的
#    xl_build(cwd=<clone>, paths=["core","typescript"], targets=["ts"], out="dist")
node .\node_modules\typescript\bin\tsc -p tsconfig.json
..\tools\gates.ps1 -Tier quick
node .\tests\body-drive\item-oracle.mjs      # 必须仍是 0 分叉
node .\tests\body-drive\batch-split.mjs      # 必须仍是 0 失败
# 1) 接 BuildBlock（未完成项 1/2），然后**立刻**证明 AST 没动：
node .\typescript\cases\ast-json.mjs statements
node .\typescript\cases\ast-json-diff.mjs statements
git checkout -- typescript/cases            # ast-json 会重写 snapshots，跑完必须还原
..\tools\gates.ps1 -Tier standard
# 2) line-terminator 读批元信息（未完成项 3）→ 重跑 AST statements → gates standard
# 3) 阶段 2 逐 unit 直译（未完成项 5）→ 再跑标度
node .\tests\bench\statement-scaling.mjs --rounds 15 --base ..\baseline-build\build
```

## 阻塞点

无外部阻塞。**唯一没验证的是 `BuildBlock` 接线**（本波没改，见未完成项 1/2）：
它是唯一会动 AST 的一步，必须在同一轮里用 `ast-json-diff statements` + `gates -Tier standard` 证明。

## 踩过的坑（让接任者少花一轮）

- **`xl_build` 只传 `paths=["typescript"]` 会「1 written / 821 skipped」**（增量，正常）；要全量就传 `["core","typescript"]`。
- **`BatchStates.Done = 0`、`NeedMore = 1`**（不是 `Done=1`）：写批次断言时别把 `NeedMore` 当失败——
  「本批没建出 item」是正常路径（宿主保留批次继续喂）。
- **`item-oracle` / `batch-split` 都用运行时打桩 `StatementBuilder.prototype.Load` 取真实 token**，
  不改源码、退出即还原。语料里放「缺分号的恢复形」会让 `SourceFileRunner.Parse` 抛
  `表达式没有读完`（本波 13 份里 1 份如此），脚本会把它记成「解析失败」而不是崩。
- **`Engine.Feed` 在批末会把 `batch.From/To/Cursor` 重定位到 splice 之后**，所以「切两批」只需要
  把 `batch.To` 设小一点调用一次、再把 `To = Data.length` + `AtEof = true` 调用第二次；不要手工算下标。
- **不要给 `Bracket` 找「创建钩子」**：`Bracket.Transit` 只通知父单元，语句块的父单元永远是 core 的
  `Root`/`Bracket`；给 core 加判别就是越权。流式挂载点不存在这件事本身要作为 WP-3/WP-6 或契约补丁的输入。
- `Get-Content` 读本仓库的中文 `.xl.md` 会显示乱码（文件是 UTF-8，控制台不是），**不影响内容**；
  判断编码只看 `xl_build`。
