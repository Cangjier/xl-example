# HANDOFF — Stage 5d-1a：legacy 退场指标与仪器（零行为变化）

分支 `feature/possible-statement-5d1a`，基线 / 本轮 HEAD 前 `b5f844ae`。
工作目录 `C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-5d1a`（`node_modules` junction）。
**未改 `core/**`，未改 `statement-boundary-util.xl.md` / `statement-end-possible-shape.xl.md` / `IsAsiBoundary`，
未手改 `dist/`、`build/`，未 push / 未合并 / 未切开关。**

## 0. 结论先行

| 交付 | 状态 |
| --- | --- |
| 四个指标 + 探针 + 基线（`legacy-baseline.json`） | **已交付**，可重复（两次运行逐用例一致） |
| 计划文档 `docs/possible-statement-5d-plan.md` | **已交付**（指标定义 / 基线 / 入口清单 / 5d-1b…5d-5 逐阶段目标、验收、回退、风险） |
| 默认全门零回归 | **是**（§3，11 道门读数与转正基线逐项相同） |
| 行为变化 | **零**（只加静态整数自增；`ast-json-diff` 6171 条逐字节相同、`harness` file-fallback=0） |

**四个指标（默认解析，6300 个用例）**：

| 指标 | 基线 | 目标 |
| --- | --- | --- |
| `LegacyStatementDispatchCount` | **4471** | 0 |
| `ScanRootCallCount` | **32414** | 0 |
| `RawTailBuildCount` | **292** | 0 |
| `ShapeAstDeclinedCount` | **328** | 0 |
| （交叉校验）`StatementShapeAst.TotalDeclined` | **328** | —— |
| （交叉校验）`FileFallbackCount` | **50** | 0 |

## 1. 指标定义与计数点

新文件 `typescript/tokens/statements/statement-legacy-metrics.xl.md`（**无依赖**，四个静态 `int` + `Reset()`）。
它们只自增：不读、不参与判断、不改顺序。

| 指标 | 计数点 | 语义 |
| --- | --- | --- |
| `LegacyStatementDispatchCount` | `statement-shape.xl.md` `BuildFromShell` 的 `built = builder.BuildStatement()` 分支（fallback） | 语句壳退回 legacy「整段 raw 分派建树」 |
| `ScanRootCallCount` | `statement-scanner.xl.md` `ScanRoot` 入口 | 判界仍在问 legacy 扫描器 |
| `RawTailBuildCount` | `statement-builder.xl.md` `BuildBlock` 的整段 raw 递归 + `CollectBodyStatements` 的两段 raw（3 处 `shape.Add(inner.BuildStatement())`） | 块体 raw 尾巴逐条建树 |
| `ShapeAstDeclinedCount` | `statement-shape.xl.md` `BuildFromShell`：表达式族 + 有 `OperatorBody` 但 `built` 仍为 `null` 的出口 | 表达式语句拒绝「由形状树建 AST」（含形状路径抛错） |

**`ShapeAstDeclinedCount` 的「二选一」选了第二个（探针读差值）的变体，说明如下**：
任务允许「`Decline` 处 +1」或「探针读 `TotalDeclined` 差值」。两者都要动别人的文件或让探针做减法；
本轮选了**第三条更干净的路**：计数点放在 `BuildFromShell` 里「形状路径没接住」的**唯一出口**。
理由：

1. `StatementShapeAst.Decline` 在 `statement-shape-ast.xl.md`，**不在本阶段可改文件面**内；
2. 「表达式语句由形状树建 AST」只有**一个入口**（`builder.BuildExpressionStatementFromShapes`，全仓 1 处调用），
   拒绝与抛错都落在同一个 `built === null` 上，所以这个出口计的正是「整条表达式语句拒绝形状树」的次数；
3. 它比 `TotalDeclined` 更严格：形状路径**抛错**时 `TotalDeclined` 不动，这里仍 +1；没抛错时两者**逐用例相等**
   （基线 328 = 328，探针把两个数都记进基线，任何漂移都会红）；
4. 不需要新增对 `statement-shape-ast.xl.md` 的 import，不引入循环依赖，也不动既有计数。

**`# dependencies` 已补齐**：`statement-shape` / `statement-scanner` / `statement-builder` 各加一条
`import { StatementLegacyMetrics } from "./statement-legacy-metrics.xl.md"`；`xl_build` 0 error + `tsc` exit 0
（本轮实跑：`xl_build` 写 4 个文件 0 error；`tsc` exit 0，`build/ts/.../statement-legacy-metrics.js` 已生成）。

## 2. 改动文件

| 文件 | 改动 |
| --- | --- |
| `typescript/tokens/statements/statement-legacy-metrics.xl.md` | **新增**：四个静态计数 + `Reset()` + 口径说明（无依赖） |
| `typescript/tokens/statements/statement-shape.xl.md` | 加 import；`BuildFromShell` 的 fallback 分支加两个自增（表达式族 + `null` 时 `ShapeAstDeclinedCount`，其余 `LegacyStatementDispatchCount`） |
| `typescript/tokens/statements/statement-scanner.xl.md` | 加 import；`ScanRoot` 入口 `ScanRootCallCount++`（在空数组判断之前） |
| `typescript/tokens/statements/statement-builder.xl.md` | 加 import；3 处 raw 尾巴循环各加 `RawTailBuildCount++` |
| `tests/statement-possible/legacy-retirement.mjs` | **新增**探针：全量语料 + 42 条逐构造诊断 + 基线校验 / `--write-baseline` / `--json` / `--top=N` / `--quiet` / `--snippets` / `--legacy-only` |
| `tests/statement-possible/legacy-baseline.json` | **新增**基线（407 KB）：总计 + 语料元信息 + `perFile`（6297 个有用例，一行一条）+ `snippets`（42 条） |
| `docs/possible-statement-5d-plan.md` | **新增**计划文档 |

**diff 规模**：三个 `.xl.md` 各 +1 行 import 与 3–8 行注释 + 自增，没有任何分支 / 顺序改动。

## 3. 全门读数（`xl_build` + `tsc` exit 0 之后实跑，全部默认态）

| 门 | 读数 | 与转正基线 |
| --- | --- | --- |
| `typescript/cases/ast-json.mjs` | **6171 / 6171**（cj-fail 0，47 构造） | 相同 |
| `typescript/cases/ast-json-diff.mjs` | **6171 / 6171**，结构差 0 / 位置差 0 / 字段差 0 | 相同 |
| `git status --porcelain typescript/cases` | **空**（测完已 `git checkout -- typescript/cases`） | 相同 |
| `typescript/cases/token-ast.mjs --quiet` | total=1716 **ok=1706 crash=0 diff=0** ts-invalid=10 | 相同 |
| `typescript/cases/real-dts-ast.mjs` | **226 / 226**，崩溃 0、差异 0 | 相同 |
| `harness.mjs --all` | **102 pass / 0 fail / known=0 / uncovered=0 / file-fallback=0** | 相同 |
| `harness.mjs --double-accept` | **120 / 0**，冲突 0 | 相同 |
| `declaration-statement-takeover.mjs` | **33 / 33**，knownGap=0、takeover=27、totalShell=33 | 相同 |
| `final-matrix.mjs` | **38 / 38**（shapeAst / xmlEqLegacy / astEqTS 全 38/38，knownGap=1 为既有 `clause-nested-known-gap`） | 相同 |
| `tests/parse/validate.mjs` | **1720 条 / 0 条不合格** | 相同 |
| `op-ast-proof.mjs` | **94 / 94** | 相同 |
| `ast-kind-names.mjs` | **PASS**（live 5/5、self-test 4/4、fixtures 47、运算符节点 262） | 相同 |
| `legacy-retirement.mjs`（新） | **PASS**；两次运行逐用例一致（`--quiet` 只差 elapsed） | 新增门 |

## 4. 从数字里读出来的三件事（下一阶段必须知道）

1. **legacy 面 = 除表达式 / 变量 / 函数声明 / 类声明之外的全部语句**。
   语料 11083 条语句：表达式 2993、变量 1758（`FirstStatement`）、函数声明 834、类声明 1016；
   剩下的 **4482** 条里 **4471** 条走 legacy 分派（差 11 条 = 被其它 possible 候选接住）。
   按族摊销：**声明族 2369（53%）**、**控制流 / 分支 / 块 / 标签 2113（47%）**。
2. **`ScanRoot` 的 32414 次几乎全是「根 legacy 候选逐格判界」的固有成本**：
   把壳全关（`--legacy-only`）量同一语料是 **32661**，只差 **247（0.76%）**。
   所以 `ScanRootCallCount = 0` **不能**靠换掉壳里的三个调用点达成，它必须等
   `statement-possible-shape`（⑤ 号调用点）退出根目录（5d-5）。前面阶段只能逐族压低，
   **验收要看逐构造行，不要只看全局总数**（全局被根 legacy 候选压着）。
3. **`RawTail` 已经是小面**：块体目录/收集通道把它从 1369 压到 292（−79%），5d-4 只需处理剩下 292 条
   与 §3.6 的 16 处 legacy 体建树（`BuildIf` / `BuildWhile` / `BuildTry` / `BuildCaseBlock` … 的 `this.BuildStatement()`），
   后者**不**计入 `RawTailBuildCount`（口径只覆盖块体 raw 尾巴）——这是刻意的，别把它当成漏计。

## 5. 未覆盖与风险（诚实清单）

1. **语料是 6300 个用例，不是 1763 个文件的全部物理行**：`tests/cases/token` 有 **10** 个整文件 TS 非法
   （与 `token-ast` 的 `ts-invalid=10` 同一批、同一判据）→ 跳过并计数；
   `typescript/cases/*.ts` 有 **41** 个整文件是「一行一例」的集合（整文件 TS 非法）→ 退化成逐行用例，
   其中 **1269** 行本身也不合法（多为带 `\n` 转义的行）→ 跳过并计数。
   **本探针不做 `ast-json.mjs` 的 `\n` 转义解码**：解码会把一行展开成多条语句，量的是另一个程序。
   如果将来要覆盖那 1269 行，应新增「解码后语料」而不是改这里的口径（否则基线会整体漂移）。
2. **指标是调用次数**：`ScanRoot` 对一条语句调用多次（`let x = 1;` 5 次、`try{…}` 8 次），
   不能与语句数相除。跨阶段比较请对**同一族的同一行**比。
3. **`FileFallbackCount = 50` 是这套语料上的实测值**（不是 0）：默认解析仍有 50 次「新路径抛错 → 整条文件改走 legacy」。
   这不是本轮引入的（`ast-json` / `token-ast` 全绿说明兜底后 AST 正确），但它是 5d-4/5d-5 要清掉的面。
4. **基线会随阶段重写**：每个阶段收口（目标达成）后用 `--write-baseline` 重写 `legacy-baseline.json`。
   重写时**只允许**因为指标变了，不允许改语料 / 改口径来让数字好看（改语料必须同时说明并重算 §0 的 6300）。
5. **`--legacy-only` / `--snippets` 是诊断模式**，不参与基线校验，也不改默认行为；
   它们的作用是给出「纯 legacy 底座」，让每阶段的「壳侧还剩多少」有分母。
6. **指标归零 ≠ 全语法建对**：`ast-json` 6171 + `token-ast` 1716 + `real-dts` 226 是既有覆盖面；
   5d-5 删根 legacy 候选前必须把 6300 个用例都推进到「形状建树」，否则语料外形态会失去最后一道网。

## 6. 复现与回退

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-5d1a

# 1) 构建（无 xl CLI，用工具/脚本两段）
#    xl_build: cwd = 本目录, paths = ["core","typescript"], targets = ["ts"]
node node_modules/typescript/bin/tsc -p tsconfig.json

# 2) 指标（默认解析；先写基线，之后只校验）
node tests/statement-possible/legacy-retirement.mjs --write-baseline   # 阶段收口时才用
node tests/statement-possible/legacy-retirement.mjs                    # PASS/FAIL + Top-N
node tests/statement-possible/legacy-retirement.mjs --quiet            # 只出总计与判决
node tests/statement-possible/legacy-retirement.mjs --snippets         # 42 条逐构造读数
node tests/statement-possible/legacy-retirement.mjs --legacy-only      # 诊断：壳全关的底座
node tests/statement-possible/legacy-retirement.mjs --json             # 机器可读

# 3) 全门
node typescript/cases/ast-json.mjs
node typescript/cases/ast-json-diff.mjs
git status --porcelain typescript/cases ; git checkout -- typescript/cases
node typescript/cases/token-ast.mjs --quiet
node typescript/cases/real-dts-ast.mjs
node tests/statement-possible/harness.mjs --all
node tests/statement-possible/harness.mjs --double-accept
node tests/statement-possible/declaration-statement-takeover.mjs
node tests/statement-possible/final-matrix.mjs
node tests/parse/validate.mjs
node tests/statement-possible/op-ast-proof.mjs
node tests/statement-possible/ast-kind-names.mjs
```

**回退整个 5d-1a**（仪器是新加的自增与三个新文件，回退不影响语义）：

```powershell
git revert <本阶段 commit>          # 或
git checkout b5f844ae -- typescript/tokens/statements/statement-shape.xl.md `
                          typescript/tokens/statements/statement-scanner.xl.md `
                          typescript/tokens/statements/statement-builder.xl.md
Remove-Item typescript/tokens/statements/statement-legacy-metrics.xl.md
Remove-Item tests/statement-possible/legacy-retirement.mjs, tests/statement-possible/legacy-baseline.json
node node_modules/typescript/bin/tsc -p tsconfig.json
```

## 7. 给下一阶段（5d-1b）的具体数字目标

1. 逐构造行（`--snippets`）必须**回到或低于 `--legacy-only` 底座**（括号内为底座值）：
   `return` 5 → **≤2**、`break-continue` 8 → **≤4**、`throw` 3 → **≤4（已达标）**、
   `debugger` 2 → **≤3（已达标）**、`empty-statement` 2 → **≤2（已达标）**、
   `label` 5 → **≤6（已达标）**、`let/const/var` 各 5 → **≤5（已达标）**。
2. 全局 `ScanRootCallCount` **不得高于 32414**、`LegacyStatementDispatchCount` **不得高于 4471**、
   `RawTailBuildCount` **≤292**、`ShapeAstDeclinedCount` **≤328**、`FileFallbackCount` **≤50**。
   （任务书要求的「`ScanRoot` 不再被 `statement-end-possible-shape` / `statement-shape.TryToClose` 调用」
   在 5d-1b 只覆盖**短族分支**；`statement-possible-shape` 那一处属 5d-5。）
3. 全门读数必须与 §3 **逐项相同**（`harness` file-fallback=0 是关键：它同时证明没有新增抛错）。
4. 收口时 `--write-baseline` 重写基线，并在 HANDOFF 里写下「阶段末四个数字」与「逐构造行变化」。
