# HANDOFF — impl-wp2-2（WP-2 第二波：语句状态机 + block 表）

STATUS: PARTIAL（扫描状态机 + ItemRule 已落盘；block 表未接线；轮次用尽在「xl_build 复跑」这一步停下）
BRANCH: impl-wp2-2 @ 见 `git log -1`
BASE: refactor-integration @ a5e31a54（含 WP-0 + 契约 G0–G6 + WP-1 enum 试点）

## 做了什么

1. 建 clone：`C:\Users\Admin\Documents\GitHub\xl-example-set\impl-wp2-2`，branch `impl-wp2-2`，
   node_modules junction OK（`Test-Path .\node_modules\typescript\lib\typescript.js` 为 True，未复测但 junction 已建）。
2. 核对契约：`docs/refactor/batch-contract-amendment.md` 与 `core/syntax/batch/*` **已落地 G0–G6**
   （`ItemScanState.AtEof`、`BasicTokenBatch.Cursor/AtEof`、`ItemListEngine.Built`、`PendingBuild`、
   整批消费 `[Cursor,To)`、`ItemEnd = End+1`、起点跳 trivia、批末右向左 splice、`Flush` 写 `RawFallback`）。
   前任 HANDOFF 的 G0–G6 **全部不再是缺口**；G7（BlockShape 无挂表钩子）仍然存在。
3. 新增 `typescript/tokens/items/statement-item-scan.xl.md`：
   `StatementItemScan`（显式状态号 0–21，与前任交接的 13 组映射表逐行对应；字段 `AtEof` / `Watermark` /
   `PendingEnd` / `State` / `Entry` / `Result`；`Run` 前缀驱动 + `Decide` 头分派 + `BasePos`）。
4. 新增 `typescript/tokens/items/statement-item-rule.xl.md`：
   `StatementItemRule implements ItemRule`（`Classify` 用首单元判型、`Analyze` 把 `Status/End` 翻成
   `Complete` + **宿主下标** `End`、`Build` 调既有 `StatementBuilder.Load + BuildStatement`、
   `IncludesSeparator` 为 true）+ `StatementBodyItemHost implements IBatchHost`（`ItemListEngine` +
   `RawFallback`，`OnBasicTokens` 按 `Engine.Built` 增量回 `Done`/`NeedMore`，`CloseBatch` 调 `Flush`）。
5. `tests/bench/statement-scaling.mjs`：从 `..\design-gates\tests\bench\` 拷入（354 行原样），
   CLI 与判据见其文件头；**未跑**（依赖 build，见下）。

## 关键设计决定（下一任必须先读这段，否则会走回头路）

`StatementScanner` 的 `Scan*` **本身是 `code:Array<Token>` 的纯函数**（无 host、无绝对下标），
而 `ItemRule.Analyze` 拿到的正是「本条 item 的代码前缀」。因此阶段 1 的状态机这样落地：

- **族内判据不复制**：`StatementItemScan.Decide` 只在 `ScanRoot` 里**独占**的分支（块 `{`、空语句 `;`、
  `if`、`while`/`switch`/`with`、`for`、`try`、`do`、`return`/`throw`、`break`/`continue`、`debugger`）
  直接调用同一族的 `StatementScanner.ScanX(code, at)`——与 `ScanRoot` 那一分支逐字同一个调用；
- **有歧义的头整条交回 `ScanRoot`**：`declare` / `const`（`const enum` lookahead）/ `var` / `let`
  （绑定 vs 标签 vs 表达式）/ `using`（同一行绑定判据）/ `await using` / 标签 / 标识符起头。
  这些分支在 `ScanRoot` 内部会落到 `ScanToSemicolon`、`ScanBody(at+2)` 或 `Mismatch`，
  重写一遍就是第二套判据（违反 INV-2 与「共享纯谓词不复制」）。
- **`Watermark` = 代码前缀长度**：`Run` 在前缀未变时直接复用 `Result`（lookahead 判定可重算，
  但只在文档真的变了时重算）；`AtEof` 从 `state.AtEof` 抄入，保存-恢复 `StatementScanner.AtEOF` 静态字段。
- `End` 一律经 `state.CodeAt[PendingEnd]` 映射成**宿主下标**（契约 §5.2 的要求）。
- `Build` 用 `StatementItemScan.BasePos(host, state.Start)` 作 `basePos`（与 `BuildBlock` 的
  `bracket.SourceRange.StartIndex + 1` 同口径），不碰 `host.Data`。

**代价（必须写清楚）**：阶段 1 每条 item 每次 `Analyze` 是 O(前缀长度)（不是 O(1)/unit），
`statement-scaling` 的「单条长表达式 / 长 if / 深嵌套」三档会因此**不达标**（档 1/2 的「语句数」维度仍然线性）。
阶段 2 的逐 unit 直译接法已经写进 `statement-item-scan.xl.md` 末尾「下一包接法（逐 unit 直译）」：
Semi(4)/IfHead(9)/DeclBody(3)/DoBody(14)/TryBlock(17) 五个状态各自拆成驻留状态，
每步只消费一个 unit，`PendingEnd`+`Watermark` 承担 lookahead 重算。

## 门禁读数（本分支实测）

| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| xl_build | `xl_build(cwd=…\impl-wp2-2, paths=["core","typescript"], targets=["ts"], out="dist")` | **1 error**：`statement-item-scan.xl.md:292: error[E1002]: unknown section keyword "下一包接法（逐 unit 直译）"` | 红（**已在最后一次编辑里删掉该尾部小节，未复跑**） |
| tsc | `node .\node_modules\typescript\bin\tsc -p tsconfig.json` | 未跑（xl_build 未产出） | — |
| quick | `..\tools\gates.ps1 -Tier quick` | 未跑 | — |
| ORACLE | `node .\tests\body-drive\item-oracle.mjs` | **文件未创建** | — |
| SPLIT | `node .\tests\body-drive\batch-split.mjs` | **文件未创建** | — |
| AST | `node .\typescript\cases\ast-json.mjs statements` / `ast-json-diff statements` | 未跑（无 build） | — |
| XLC | `xl_check(paths=["core","typescript"])` | 未跑 | — |
| STMT | `node .\tests\bench\statement-scaling.mjs --rounds 15 --base ..\baseline-build\build` | 文件已拷入，未跑 | — |

> **AST 零影响**：`StatementBodyItemHost` **没有**接到任何括号上（无 `Bracket.BatchAdapter` 赋值），
> 新增代码不在解析路径上，因此即使编译通过，`ast-json` 也不可能因本包变红。

## 未完成项（逐条，带精确下一步）

1. **`xl_build` 复跑**（第一件事）：报错行已删除，若仍报错，最可能是文件末尾残留第二个
   `# namespace cangjie`（一次文件只应有一个）——`Select-String` 数一下，删掉它即可。
   然后 `node .\node_modules\typescript\bin\tsc -p tsconfig.json`，修 `tsc` 的类型错。
   **两个已知高风险点**（xl 能过、tsc 可能报）：
   - `StatementItemRule.Build` 里 `host.Template`：若 `Token` 没有 `Template` 字段，改用
     `(host as Bracket).Template` 或从 `context` 取；
   - `StatementScanner.AtEOF` 静态字段的赋值（xl 生成 TS 的静态字段可写，但若被修饰成只读会报错）。
2. **block 表接线（G7，未做）**：`BlockShape` 只有 constructor（20 行），`{` 的创建点在 basic-token
   模板而不是 `BlockShape`，所以没有「按语句形态区分」的创建钩子。三条候选落点（按可行性排序）：
   a) `StatementBuilder.BuildBlock`（`statement-builder.xl.md:1216`）里，`bracket.Data` 已经就绪时
      先跑一遍 `StatementBodyItemHost`（`Feed` 一个覆盖全 `Data` 的 `BasicTokenBatch`，再 `CloseBatch`），
      再让 `BuildBlock` 用**改造后的** `Data` 建块——这是最小改动，但需要新增
      `StatementBuilder.BuildFromItems(units, items, basePos)`（Q7）：把 `Data` 里已建好的语句形状
      直接当子节点、其余 unit 仍走 `BuildStatement`，**不改 `BuildBlock` 的其它语义**；
   b) `Bracket` 创建时的模板层（`typescript/tokens/trivia/**` 或 `UnitToken` 的括号模板），
      只有 `{` 且父形态是语句容器时挂 `BatchAdapter`（需要在创建时就知道「这是语句块」——当前没有这个信息，
      所以这条要么加形态提示，要么留到 WP-3）；
   c) `BlockShape` 构造函数里挂（太晚：那时 `Data` 已经建完）。
   **推荐 a)**：不需要在创建期区分形态，且能复用同一个建造器集合。
3. **`StatementBuilder.BuildFromItems`（未建）**：签名建议
   `BuildFromItems:()=>Token`（`Units`/`Positions` 已由 `Load` 装好，额外的 `items` 用
   `host.Data` 判断 `Data[i]` 已是 `StatementShape` 就直接 `Add`）。
4. **`typescript/run/line-terminator.xl.md` 未改**：仍是逐字符扫全文。接法：`BasicTokenBatch.HasLineBreak`
   已由 `Recompute` 一次算出（代码区间内是否有 `\n`），把 `HasBetween` / `HasBefore` 改成读批元信息；
   `StatementScanner` 的 `EndsAtLineBreak` / `HasLineBreakBefore` 是它的下游，改完要重跑 AST statements。
5. **`StatementScanner` 降为 oracle**（未做）：目前它仍被 `statement-possible-shape` 等运行期引用
   （`statement-possible-shape.xl.md` 仍被 root 使用，**不要删**）。删除路径：先 grep
   `StatementScanner` 的所有引用点，确认只剩 `statement-item-scan` / 测试，再逐个替换。
6. **`tests/body-drive/item-oracle.mjs`（未建）**：契约是——对每个语料，逐前缀 `n = 1..N`：
   a) 用 `new StatementItemScan()`（`AtEof = (n === N)`）跑 `Run(code[0..n])`，记第一次 `Status===1`
      的 `(n, End)`；b) 与 `StatementScanner.ScanRoot(code[0..n])`（同样设 `AtEOF`）逐前缀比对
      `Status`/`End`，必须**完全一致**（不一致就是分叉，先修状态机不要改 scanner）。
   语料需要的 token 宿主：复用 `tests/body-guide/harness.mjs` 的解析入口（它已经能把源码变成宿主 bracket），
   或用 `build/ts/typescript/run/source-file-runner.js` 直接解析整份 `.ts` 再在块上取 `Data`。
7. **`tests/body-drive/batch-split.mjs`（未建）**：骨架 + `family` 钩子（`statement` 组；其它族后续只追加配置），
   每族给 `{ name, rules: () => [...], corpus: [...] }`，断言「整批喂」与「切在任意中间位置分两批喂」
   建出的 item 序列一致（INV-6 批次无关性）。`tests/body-drive/batch-contract-selftest.mjs` 已有 fake host
   可照抄。
8. **`statement-scaling` 达标**：阶段 1 的设计决定了档 3/4/5 不达标（见上「代价」）。达标要阶段 2 的逐 unit 直译。

## 下一步的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp2-3 -From impl-wp2-2 -Base impl-wp2-2
cd impl-wp2-3
# 0) 先让构建变绿（见上「未完成项 1」）
#    xl_build(cwd=<clone>, paths=["core","typescript"], targets=["ts"], out="dist")
node .\node_modules\typescript\bin\tsc -p tsconfig.json
..\tools\gates.ps1 -Tier quick
# 1) 写 item-oracle（未完成项 6）→ 必须全绿才继续
node .\tests\body-drive\item-oracle.mjs
# 2) 接 block 表（未完成项 2/3，推荐落点 a）
node .\typescript\cases\ast-json.mjs statements
node .\typescript\cases\ast-json-diff.mjs statements
git checkout -- typescript/cases            # ast-json 会重写 snapshots
# 3) line-terminator 读批元信息（未完成项 4）→ 重跑 AST statements
# 4) statement-scaling（未完成项 8）
node .\tests\bench\statement-scaling.mjs --rounds 15 --base ..\baseline-build\build
```

## 阻塞点

无外部阻塞。**唯一未验证项**是 `xl_build` 的最终状态：最后一次编辑删掉了报错的尾部小节
（`# 下一包接法（逐 unit 直译）` → E1002 `unknown section keyword`），但轮次用尽，没有复跑。

## 踩过的坑（让接任者少花一轮）

- `xl_build` 的**尾部小节必须是已知 section keyword**：`# class` / `# namespace` / `# interface` / `# enum` /
  `# struct` / `# function`（顶层）。写 `# 下一包接法` 会 E1002 **整份构建 0 输出**（不是只报这一处）。
  设计备注写在 `## method` 的说明文字里，或写成 namespace 下的普通段落。
- `xl_build` 的输出巨大（2435 warning，240 KB），**不要整段看**：它会把完整结果存到
  `C:\Users\Admin\AppData\Local\Temp\dsh-spill-*\...\*-xl_build.txt`，
  用 `Select-String -Pattern 'error\[' <该文件>` 一条就够。
- `core/syntax/batch/**` 的 G0–G6 **已经修好**，不要去改，也不要自己补第二套引擎状态；
  `ItemScanState` 没有 `ScanState` 之类字段可放状态机状态，所以 `StatementItemScan` 是**每次 Analyze 新建的值对象**
  （规则实例无状态 → 所有容器可共用一份，嵌套块不会互相踩）。
- `ScanRoot` / `ScanBody` / `ScanIf` … 的签名**都没有 host 参数**，全部是 `(code, at)` 纯函数；
  这是本包能「不复制判据」的前提，别把它改成收 host 的版本。
- 拷 bench 用 `Copy-Item ..\design-gates\tests\bench\statement-scaling.mjs .\tests\bench\`；
  它要求 `--rounds ≥ 15` 且 `--base` 目录必须含 `ts\typescript\run\source-file-runner.js`。
- `Get-Content` 读本仓库的中文 `.xl.md` 会显示乱码（文件是 UTF-8，控制台不是），
  **不影响内容**；判断编码问题只看 `xl_build`，不要因为乱码去改文件。
