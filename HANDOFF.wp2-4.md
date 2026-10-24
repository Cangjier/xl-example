# HANDOFF — impl-wp2-4（WP-2 第四波：块表接线落盘 + 标度读数）

STATUS: PARTIAL
BRANCH: impl-wp2-4 @ HEAD（见 git log）
BASE: impl-wp2-3 @ 63ea8e02（起于 refactor-integration @ a5e31a54 + 契约 G0–G6 + WP-1 enum 试点）

## 做了什么

1. **建 clone**：`C:\Users\Admin\Documents\GitHub\xl-example-set\impl-wp2-4`，branch `impl-wp2-4`，
   执行 `.\tools\new-member.ps1 -Name impl-wp2-4 -From impl-wp2-3 -Base impl-wp2-3`，node_modules junction OK。
2. **起点基线复现绿**：`xl_build(core+typescript → dist)` = 886 written / 0 error / 2435 warning；
   `tsc` exit 0；`gates -Tier quick` PASS（5.7s）。
3. **A. 块表接线落盘（本波主交付）**：`typescript/tokens/statements/statement-builder.xl.md`
   - 新增 `import { BasicTokenBatch }`、`import { StatementBodyItemHost } from "../items/statement-item-rule.xl.md"`；
   - `BuildBlock` 在 `Context.BatchMode !== 0` 时先调新方法 `DriveBodyItems(bracket)`，
     再把 splice 后的**非 basic、非 trivia 单元**直接当块子节点；残留 basic 单元（引擎 raw 回退区间）
     仍走原来的逐条 `BuildStatement`；`BatchMode === 0` 走逐字未改的 legacy 路径；
   - 新增 `DriveBodyItems`：`new StatementBodyItemHost(bracket, CreateRules())` + `BasicTokenBatch.Reset(bracket, 0, true)`
     + `Sealed = true` + `Recompute()` + `OnBasicTokens` + `CloseBatch`，即 HANDOFF.wp2-3 §未完成项 1 的待落盘代码；
   - **不改 `host.Data` 口径**（splice 由引擎批末统一做），不改 `BuildBlock` 其它语义（`Finish(shape, first, first)` 原样）。
4. **B. line-terminator：本波未做**（见未完成项 2，附接法与一个语义陷阱）。
5. **C. statement-scaling 解锁 + 读数**：`tests/bench/statement-scaling.mjs`
   - `ident()` 从 bijective base-26 改成数值后缀（`v0`、`v1` …）+ 注释写明原因；
   - 新增 `--max-size`（默认 2000）收小网格，让慢机器/中间态也能拿到读数；
   - 拿到读数（见下表 §标度）——**不达标项就是阶段 1 的 O(L²)**，如实记录。

## 关键设计决定（下一任必须先读）

### D1 语句 item 表已经在解析路径上（这是与前三波最大的语义变化）

`BuildBlock` 是**唯一的接线点**，其余路径（`BuildCaseBlock`、`if`/`while`/`for` 体）仍是旧循环，
里面每条语句仍走 `BuildStatement`——它们不受影响，AST 因此只可能在「块体」这一层分叉。
**证据：AST statements 412/412、全量 6167/6167，结构/位置/字段差各 0**（见门禁表）。
`StatementBodyItemHost` 现在**同时被单测与真实解析路径使用**：
`item-oracle` 的语料从 51 段/422 前缀涨到 **88 段/450 前缀**（`StatementItemRule.Build` 里那句
`builder.Load(units, basePos)` 也被打桩抓到），`batch-split` 从 15 段/114 断言涨到 **19 段/170 断言**——
两条资产从此覆盖真实建造调用，不再是纯离线单测。

### D2 `statement-builder` ↔ `statement-item-rule` 是**循环 import**，xl 与 tsc 都接受

`statement-builder` 需要 `StatementBodyItemHost`，而 `statement-item-rule` 需要 `StatementBuilder`。
实测 `xl_build` 0 error、tsc exit 0、AST 全绿：两边的类只在**方法体内**互相引用，
没有 `extends`、没有模块求值期的静态初始化依赖，所以 ESM 循环安全。
**若以后有人给这两个文件加「顶层 `new` / 静态字段初始化」类引用，会变成 TDZ 崩溃**——
要么保持方法体内引用，要么把 host 拆到第三个文件（本波没拆，因为拆了也还是同一个环）。

### D3 `AtEof` 在块批里直接置 `true`

`DriveBodyItems` 用 `batch.Reset(bracket, 0, true)`：块是自足的，`StatementItemScan.AtContainerEnd`
（wp2-3 的收窄）负责把「块内最后一条语句」认成容器末尾。**不要**把它改成 `false`：
那会让块末的 `return`/裸`return` 判成 NeedMore 而在 `CloseBatch` 里走 raw 回退。

## 门禁读数（本分支实测）

| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| xl_build（全量） | `xl_build(cwd=…, paths=["core","typescript"], targets=["ts"], out="dist")` | 886 written / **0 error** / 2435 warning | 绿 |
| xl_build（增量） | 同上 `paths=["typescript"]` | 1 written / 821 skipped / 0 error | 绿 |
| tsc | `node .\node_modules\typescript\bin\tsc -p tsconfig.json` | exit 0 | 绿 |
| quick | `..\tools\gates.ps1 -Tier quick` | **PASS 5.5s**（tsc 3.81 / ast 0.85 / ast-diff 0.12 / body-guide 0.67） | 绿 |
| standard | `..\tools\gates.ps1 -Tier standard` | **PASS 10.4s**；8 道门 1/8 = KNOWN-RED（基线） | 绿（含已知红） |
| AST statements | `node .\typescript\cases\ast-json.mjs statements` + `ast-json-diff.mjs statements` | **412/412**，结构 0 / 位置 0 / 字段 0 | 绿 |
| AST 全量 | `node .\typescript\cases\ast-json.mjs` + `ast-json-diff.mjs` | **6167/6167（47 构造）**，结构 0 / 位置 0 / 字段 0 | 绿 |
| ORACLE | `node .\tests\body-drive\item-oracle.mjs` | 88 段 / **450 前缀** / **0 分叉** | 绿 |
| SPLIT | `node .\tests\body-drive\batch-split.mjs` | 19 段 / **170 断言** / **0 失败** | 绿 |
| STMT | `node .\tests\bench\statement-scaling.mjs --rounds 15 --base ..\baseline-build\build --max-size 500` | **FAIL 2 项**（见下）；XML 等价 31/31 PASS | 红（既有 O(L²)，非接线引入） |
| xl_check | 未在本波重跑（工具调用输出过大）；`xl_build` 的 warning 计数与前任 2435 完全一致、error 0 | — |

## statement-scaling 读数（`--rounds 15 --max-size 500`，2026-10-24）

```
## 档 1：函数体语句数 N        250→2.62ms   500→5.74ms   x1.96   ✓
## 档 2：module 根级语句数 N   250→3.69ms   500→7.76ms   x2.05   ✓
## 档 3：单条长表达式语句 T     250→8.69ms   500→32.64ms  x3.80   ✗（门限 < 2.6）
## 档 4：长 if 头 T            250→1.12ms   500→2.09ms   x1.83   ✓
## 档 5：嵌套块深度 D     125→0.88  250→1.73  500→3.53   x1.94/x2.04 ✓
## 同规模 new/base（门限 <= 1.10）
  stmt-count-250 x0.97   root-count-250 x0.97   stmt-count-500 x1.06   root-count-500 x1.02
  long-stmt-250  x7.83   long-stmt-500  x7.47   long-if-250 x0.96   long-if-500 x0.99
  block-depth-125 x1.02  block-depth-250 x0.92  block-depth-500 x0.97
FAIL 2 项：档 3 T=250→500 倍数 3.80；同规模 long-stmt-500 x7.47
```

**结论（这是本波最重要的性能结论）**：

- **普通语句体（档 1/2/4/5）与基线持平**（0.92–1.06），接线本身**没有**引入退化；
- **单条长语句（档 3）比基线慢 7.5–7.8 倍，且每翻倍 3.8 倍** —— 正是 wp2-3 记录的阶段 1 缺陷：
  `StatementItemScan.Run` 每次 `Analyze` 都在**整个前缀**上重算，`ItemListEngine.Feed` 每 unit 调一次，
  一条 item 的前缀从 1 涨到 L → O(L²)。**阶段 2（逐 unit 直译）不是优化项，是档 3 达标的前提**。
- 完整网格（N=T=D=2000）在本机**跑不完**（>10 分钟无输出，档 3 的 O(L²) 主导）；
  `--max-size 500` 就是为了先拿到可比的读数。下一任要么先做阶段 2，要么给 bench 加单用例墙钟上限。

## 既有缺陷的定位（C 的证据，**推翻了 wp2-3 的「≥41 语句体」结论**）

同一份语料用 **`..\baseline-build\build`（重构前 main 的构建）** 与本构建并排跑，
每个 shape 两侧同 OK / 同 ERR、XML 逐字节一致（见探针输出）：

| shape | 本构建 | baseline | 判定 |
|---|---|---|---|
| `function f(){ let vX = X; }`，X = bijective 名（`va`…`vz`、`vaa`…），N=42 | OK 10270B | OK 10270B | XML-SAME |
| 同上 N=43 | OK 10511B | OK 10511B | XML-SAME |
| 同上 N=44 / 45 / … / 49 / 50 / 249 | **ERR** | **ERR（同一句）** | 既有缺陷 |
| 同上但名字是数值（`v0`…`v1999`），N=250 | OK 60398B | OK 60398B | XML-SAME |
| **同上 N=2000（一个函数体 2000 条语句）** | **OK 482148B / 64ms** | OK 482148B | XML-SAME |
| `let vs = 1;` 单条 / 3 条语句 | OK | OK | — |

报错原文（两侧一致）：

```
SyntaxException: throw by line 0 ---> at file: stmt-count-250.ts:0
  InnerException: Error: 表达式没有读完
    at StatementBuilder.BuildExpressionRange (statement-builder.js:146)
    at StatementBuilder.BuildExpressionStatement (statement-builder.js:1023)
    at StatementBuilder.BuildStatement (statement-builder.js:395)
    at StatementBuilder.BuildBlock (statement-builder.js:969)
    at FunctionDeclarationShape.FromUnits (function-declaration-shape.js:291)
```

**结论**：

1. **不是本重构引入**（baseline 构建崩在同一处、同一句；能解析的 shape 两侧 XML 逐字节一致）。
2. **也不是「函数体语句数 ≥ ~41」**（wp2-3 的结论）：数值名字下 **2000 条语句** 的函数体两侧都解析成功。
   触发条件是**标识符形态 × 语句数的交互**：`let vs = 1;` 单条、3 条都 OK，把 bijective 名字铺到 44 条就崩。
   具体根因没定位到（在表达式/基本 token 层，**不在本包写范围**）。
3. **本波的处理**：语料改用数值名字（`v0`…），标度因此可测；**没有**为了让它跑起来去改 scanner / 判据阈值，
   也**没有**硬修解析器。
4. **建议**：把「bijective 名字 × 44 条语句」这个最小复现单独开一个缺陷包（写范围在
   `typescript/tokens/expressions/**` 或 basic token），不要塞进 WP-2。

## 未完成项（逐条，带精确下一步）

1. **B. `typescript/run/line-terminator.xl.md` 仍是逐字符扫全文**（`HasBetween` / `HasAfter` 里的
   `while` + `whole.At(at)`）。接法：`BasicTokenBatch.HasLineBreak` 由 `Recompute` 一次算出，
   但**它只认 `\n`**（`GetRaw(...).indexOf("\n") >= 0`），而本文件的判据是 ECMAScript 的四个行终止符
   （`\n`/`\r`/`U+2028`/`U+2029`）——直接改读 `HasLineBreak` 会**改变语义**（CR-only 文件不再断句），
   AST 可能变。正确做法：在 `LineTerminator` 里加一个「区间是否有行终止符」的判据走
   `document.GetRaw(from, to)` + 四个字符的 `indexOf`（消掉逐字符 `At()`），短区间（≤8 字符）保留内联循环
   避免分配；改完**必须**重跑 `ast-json statements` + `ast-json-diff statements` + `gates -Tier quick`。
2. **阶段 2：`StatementItemScan` 的五个驻留状态**（Semi/IfHead/DeclBody/DoBody/TryBlock）改成每 unit O(1)
   单调推进——档 3 达标（< 2.6 倍/翻倍、new/base ≤ 1.10）的唯一路线。当前 `Run` 靠 `Watermark` 只复用同长度前缀。
3. **`StatementScanner` 降为 oracle**：仍被 `statement-possible-shape.xl.md`（root 在用，**不要删**）
   与 `statement-item-scan` 引用；本波没有删除任何 possible 文件。
4. **bench 完整网格**（N=T=D=2000）在本机 >10 分钟，需要单用例墙钟上限或先做阶段 2。
5. **块以外**的语句容器（`BuildCaseBlock`、`if`/`while`/`for` 体）还没接 item 表——AST 一定等价，属后续波。

## 下一步的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp2-5 -From impl-wp2-4 -Base impl-wp2-4
cd impl-wp2-5
# 0) 起点自检（应当全绿）
#    xl_build(cwd=<clone>, paths=["core","typescript"], targets=["ts"], out="dist")
node .\node_modules\typescript\bin\tsc -p tsconfig.json
..\tools\gates.ps1 -Tier quick
node .\tests\body-drive\item-oracle.mjs      # 88 段 / 450 前缀 / 0 分叉
node .\tests\body-drive\batch-split.mjs      # 19 段 / 170 断言 / 0 失败
# 1) 阶段 2（最高价值）：statement-item-scan.xl.md 逐 unit 直译 → 重跑
node .\tests\bench\statement-scaling.mjs --rounds 15 --base ..\baseline-build\build --max-size 500
#    达标判据：档 3 倍数 < 2.6 且 long-stmt-500 new/base <= 1.10
# 2) line-terminator（见未完成项 1）→ ast-json statements → gates standard
```

## 阻塞点

无外部阻塞。本波**没有**改动 `core/**`、`typescript/tokens/files/**`、module-block/declarations/members、
`tools/**`、`TEAM.md`；没有 merge / push。

## 踩过的坑（让接任者少花一轮）

- **`statement-scaling.mjs` 的 `--rounds` 下限是 15**，传 3 会直接 throw；跑不动就用 `--max-size`。
- **完整网格真的跑不完**：N=T=D=2000 的 5 个 series × 17 次 + sameScale 18 用例 × 17 × 2 份 build，
  在阶段 1 的 O(L²) 下 >10 分钟；**别以为它挂了**（脚本只在最后统一打印，中途没有任何输出）。
- **`xl_build` 的增量模式（`paths=["typescript"]`）只写改动的文件**，日志短很多；全量（`["core","typescript"]`）
  会打印 ~380KB 日志，迭代时用增量。
- **`ast-json.mjs` 会重写 `typescript/cases` 下的 snapshot**：跑完必须 `git checkout -- typescript/cases`，
  否则 `git status` 会多出上千个改动。
- **循环 import 在 xl 里不报错**（见 D2），但只对「方法体内引用」安全。
- `Get-Content` 读本仓库的中文 `.xl.md` 显示乱码是控制台编码问题，不影响 `xl_build`；判断编码只看 build 是否 0 error。