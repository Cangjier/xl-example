# HANDOFF — impl-wp3-3（WP-3 第三波：build-only 入口 / RootItemRule / root family）

STATUS: PARTIAL
BRANCH: impl-wp3-3 @ 本提交
BASE: impl-wp3-2 @ 3584b95b（含 tail builder 机械搬迁、files/*possible* 删除、Close 单次遍历）

## 做了什么

1. 建 clone：`.\tools\new-member.ps1 -Name impl-wp3-3 -From impl-wp3-2 -Base impl-wp3-2`，node_modules junction OK，起点 `3584b95b`。
2. **恢复了可构建的绿基线（本波唯一的实质交付）**：
   - `xl_build(cwd=clone, paths=["core","typescript"], targets=["ts"], out="dist")` → **884 written / 0 error / 2429 warning**
     （与 impl-wp3 交接的读数**逐项相同**，证明 impl-wp3-2 分支源码与 impl-wp3 逐字节等价，接任者不需要回退任何东西）。
   - `node .\node_modules\typescript\bin\tsc -p tsconfig.json` → exit 0。
   - `..\tools\gates.ps1 -Tier quick` → **PASS 5.7s**（tsc 4.05 / ast 子集 1214/1214 / diff 结构0 位置0 字段0 / body-guide interface 全通过）。
   - `dist/` 与 `build/` 已生成（两者都被 .gitignore 忽略，不进提交，但接任者可以直接跑门禁，不必再花一轮构建）。
3. 定点回读并**核实**了接线所需的三个契约（下面「本波核实的事实」），这是上一棒没有写下来、直接影响 C 的做法的部分。
4. **未改动任何源文件**：A/B/C/D 一行未写（轮次预算用在建 clone + 构建 + 读契约上）。分支在源码层面与 impl-wp3-2 等价，只多了本文件。

## 门禁读数（本分支实测）

| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| xl_build | paths=["core","typescript"] out="dist" | 884 written / 0 error / 2429 warning | 绿（= impl-wp3 基线） |
| tsc | `node .\node_modules\typescript\bin\tsc -p tsconfig.json` | exit 0，872 个 .js | 绿 |
| quick | `..\tools\gates.ps1 -Tier quick` | PASS 5.7s | 绿 |
| AST 子集 | `ast-json` + `ast-json-diff` expression statements members | 1214/1214，结构 0 / 位置 0 / 字段 0 | 绿 |
| AST 全量 | 未跑（轮次） | — | 待跑（起点应 = 6167/6167 0/0/0） |
| real-dts / full / xl_check / batch-split root | 未跑 | — | 待跑 |

> `ast-json.mjs` 会重写 `typescript/cases` 快照；跑完全量后 `git checkout -- typescript/cases`。

## 本波核实的事实（照这个做，别再重读大文件）

### 1. `ItemRule.Build` 绝对不许动 `host.Data`（core 契约，已逐行读 `core/syntax/batch/item-list.xl.md`）

- `ItemListEngine.Feed`（110–173）在**整批**消费完后调 `ApplyBuilds`（262–316），从右向左 `splice`；
- `Flush`（175–217）**自己**在内部 `host.Data.splice(start, to - start, item)`（194 行）；
- 所以 `RootItemRule.Build` 只返回 Token，落盘全由引擎做。**这正是 A 存在的理由**：
  `SourceFileTailBuilder` 的旧三入口自己 splice，直接塞进 `Build` 会双重 splice（INV-3/INV-7）。
- **回退/尾巴不走 Build**：`Flush` 把建不出的区间写进 `RawFallback`（`From/To/Reason`），
  raw 的**实际建造**要由 host 的 `FinishBody` 自己调 `BuildTrailingItems`/`BuildSegmentItems` 完成。

### 2. `Feed` 已经处理了 EOF

`item-list.xl.md:164-170`：`batch.AtEof && State.Start >= 0 && CurrentRule >= 0 && !Complete` 时**补调一次 `Analyze`**，
完成就 `RecordBuild`。所以 `FinishBody` 不需要再自己「喂 EOF 哨兵」，只需要：
`FlushBatch`（把最后一条没建完的交 `Engine.Flush` → raw 口袋）→ 处理 raw 区间 → `SignOut` + `TryToClose`。

### 3. `StatementBodyItemHost` 是可直接照抄的模板（`typescript/tokens/items/statement-item-rule.xl.md:134-236`）

字段四个：`Host:Token|null`、`Engine:ItemListEngine = new ItemListEngine()`、`Fallback:RawFallback`、`BatchPolicy:BatchPolicy|null`。
方法五个：`OnBasicTokens`（用 `Engine.Built` 前后差判 `Done`/`NeedMore`，**不读 host.Data**）、
`OnChildCreated`（空）、`OnBasicTokenClosed`（`CloseStates.Nothing`）、`CloseBatch`（`Engine.Flush` + `Fallback.Reset`）、`Reset`。
`CreateRules` 返回单元素规则表。root 版只需把 `Fallback` 换成「交给 tail builder」的那条路径。

### 4. 上一棒的行号清单**不可信**，必须重新定位

`HANDOFF.wp3-2.md:44` 把 `BuildModuleDeclaration` 标成「1498–1532」，却把 1395 / 1406 / 1415 / 1439 / 1450 / 1475 / 1484 / 1493
这些**小于 1498** 的行号列在它名下；`BuildTrailingDeclaration` 标「440–1497」而 1497 > 1532 也自相矛盾。
→ 区间整体错位。定位方式只有一种：

```powershell
Select-String -Path .\typescript\tokens\items\source-file-tail-builder.xl.md -Pattern 'host\.Data\.splice|## (static )?method Build'
```
（实测该文件 1532 行、`extends PossibleShape` 的外壳仍在，类头 40–66 行就是迁移状态说明。）

### 5. `SourceFileTailBuilder` 的导入面已包含 journal 需要的一切

`Token` / `UnitToken` / `ShapeToken` / `CatalogGuide` / `EndOfFileTokenShape` 都已在 `# dependencies`（1–36 行）里，
新增 journal 方法**不需要**任何新 import。`Token.Data` 可赋值（`SourceFileShape.Close` 里有同样的 `this.Data = ...filter(...)` 先例）。

## 未完成项（逐条）

1. **A（0 行）**：`SourceFileTailBuilder` 加三个 build-only 入口。
   签名（按 wp3-2 结论 1，两个 bool 入口必须返回 `Array<Token>`）：
   `static BuildTrailingItems:(host:Token, start:int, at:int, context:SyntaxContext)=>Array<Token>`、
   `static BuildSegmentItems:(host:Token, start:int, at:int, context:SyntaxContext)=>Array<Token>`、
   `static BuildModuleItem:(host:Token, start:int, at:int, context:SyntaxContext)=>Token | null`。
   实现＝Data journal（`const before = host.Data.slice()` → 调旧入口 → `CollectNewShapes(host, before)` → `host.Data = before` → 返回），
   旧三入口签名与行为一字不动。**只加方法不改调用点**，判据是 AST 全量仍 6167/6167 0/0/0。
2. **B（未创建）**：`typescript/tokens/items/root-item-rule.xl.md`。
   `RootItemRule implements ItemRule`（kind：import=1 / export=2 / declaration=3 / module=4 / statement=5）+
   `SourceFileBodyItemHost implements IBatchHost`。statement 组复用 `StatementItemScan`（`AtEof=false` 判型、
   `Status===2` 返回空数组让别的规则接），声明组复用 `LeadingDeclarationKeyword` / `BodyDeclarationKeyword`。
3. **C（未接线）**：`SourceFileShape.BatchAdapter` 仍是 `null`，`CatalogGuide` + 根终结候选仍在跑。
4. **D（未加）**：`tests/body-drive/batch-split.mjs` 的 root family 未加。
5. AST 全量 / real-dts / full `-BaseBuild` / xl_check / parse-perf 全部未跑。

## 下一步的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp3-4 -From impl-wp3-3 -Base impl-wp3-3
cd impl-wp3-4
# 0) dist/build 已由上一棒构建，但新 clone 没有 —— 先构建
#    xl_build(cwd=<clone>, paths=["core","typescript"], targets=["ts"], out="dist")
node .\node_modules\typescript\bin\tsc -p tsconfig.json
..\tools\gates.ps1 -Tier quick
# 1) A：三个 build-only 入口（journal，见上）→ xl_build → tsc → AST 全量 0/0/0 → commit
node .\typescript\cases\ast-json.mjs; node .\typescript\cases\ast-json-diff.mjs; git checkout -- typescript\cases
# 2) B：root-item-rule.xl.md（先 grep 每个 shape 的 FromUnits 静态入口签名）→ xl_build → quick → commit
# 3) D：batch-split --family=root（Adapter 仍 null）→ 绿 → commit
# 4) C：挂 BatchAdapter + FinishBody（FlushBatch → raw 区间交 BuildTrailingItems → SignOut + TryToClose）→
#        AST 全量 → 红就摘回 null → commit 绿的 A+B
# 5) ..\tools\gates.ps1 -Tier full -BaseBuild ..\baseline-build\build ; node .\typescript\cases\real-dts-ast.mjs
```

## 阻塞点

无外部阻塞。本波轮次预算（10 轮）在建 clone、一轮全量 xl_build（370KB 日志）与读三个 core 契约上用完，
**没有源文件改动**，因此没有把任何红灯留给接任者：分支是绿的（quick PASS）、可直接开工。

## 踩过的坑

- **xl_build 的全量日志会把上下文一次吃掉**（本次 372KB 被截断落盘）：增量时用 `paths=["typescript"]`，
  或直接看结果的头部一行（`884 written, 0 error`）就够，不要展开。
- **一轮只做一件事**：本轮 10 条消息里有 6 条是单次 read/单次 pwsh。把「构建 + tsc + quick」放进**同一条** pwsh
  命令、把多个 read 放进**同一条**消息，能省下 3–4 轮（上一棒就是被阅读吃光的，本棒仍然重犯了）。
- 上一棒的行号清单有整体错位（见「本波核实的事实」§4），**不要照着行号回读**，用 grep 自己定位。
- `Get-Content` 读中文 `.xl.md` 乱码是控制台编码问题，判据只看 `xl_build` 是否 0 error。