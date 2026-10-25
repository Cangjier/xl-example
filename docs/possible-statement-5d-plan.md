# possible-statement 5d 计划：legacy 退场（度量 → 逐族判界 → 声明壳 → raw 尾巴 → 死代码）

分支 `feature/possible-statement-5d1a`，基线 `b5f844ae`（第 31 轮转正 + gap 阶段修复后：`EnableDeclarationShell=true`）。
本文档是 **5d-1a（度量与计划）** 的产物：先给「当前事实」的四个指标与全量基线，再给逐阶段退场顺序与验收口径。

**本阶段零行为变化**：只新增 `StatementLegacyMetrics` 的静态整数自增与探针 / 文档，不改任何判据、分支、顺序。
证据见 §6（默认全门读数与基线逐项相同）。

---

## 0. 结论先行

| 判据 | 当前读数（默认解析） | 目标 |
| --- | --- | --- |
| `LegacyStatementDispatchCount` | **4471** | 0 |
| `ScanRootCallCount` | **32414** | 0 |
| `RawTailBuildCount` | **292** | 0 |
| `ShapeAstDeclinedCount` | **328** | 0 |
| `FileFallbackCount`（既有台账） | **50** | 0 |
| `KnownGap`（harness） | **0** | 0 |

三条**从数字里读出来的判断**（不是估计，是实测）：

1. **legacy 面 ≈ 除表达式语句 / 变量语句 / 函数声明 / 类声明之外的全部语句**。
   语料一共 **11083** 条 TS 语句：表达式语句 2993、变量语句 1758、函数声明 834、类声明 1016，
   剩下 **4482** 条里 **4471** 条走 legacy 分派（差 11 条是被其它 possible 候选接住的情形，0.25%）。
   所以「完整重构」的剩余工作量可以按**语句族**摊销：声明族 2369 条（53%）、控制流 / 分支 / 块 / 标签 2113 条（47%）。
2. **`ScanRoot` 的成本几乎不来自壳，而来自「根 legacy 候选逐格判界」**。
   把壳全关（`--legacy-only`，`EnableShellExpressions=false`）量同一个语料：`ScanRoot` = **32661**，
   默认态 **32414** —— 两者只差 **247**（0.76%）。也就是说 `ScanRoot` 调用是**每格一次**的固有成本
   （`let x = 1;` 一条语句 5 次、`try {…}` 一条 8 次），壳的存在只是把同一批调用换成自己的。
   **推论**：`ScanRootCallCount = 0` 不可能只靠「把壳里的调用点换掉」达成，它必须等
   `statement-possible-shape`（根 legacy 候选）退出根目录——那是 5d-5 的收尾，前面各阶段只能把它**逐族压低**。
3. **raw 尾巴与形状树拒绝已经是小面**：`RawTailBuildCount` 292（万分之一量级）、`ShapeAstDeclinedCount` 328
   且与既有 `StatementShapeAst.TotalDeclined` **逐用例完全相等**（328 = 328），说明新计数器与既有台账同口径、
   没有漏记。这两项适合放在 5d-4 收口。

---

## 1. 指标定义（`StatementLegacyMetrics`，零行为变化）

文件：`typescript/tokens/statements/statement-legacy-metrics.xl.md`（新，无依赖）。四个静态 `int` + `Reset()`，
**只自增，不读、不参与任何判断、不改任何顺序**。计数点：

| 指标 | 计数点（file:method） | 语义 |
| --- | --- | --- |
| `LegacyStatementDispatchCount` | `statement-shape.xl.md:162-164`，`StatementShape.BuildFromShell` 的 `built = builder.BuildStatement()` 分支 | 语句壳收口时退回 legacy「整段 raw 分派建树」 |
| `ScanRootCallCount` | `statement-scanner.xl.md:177`，`StatementScanner.ScanRoot` 入口 | 判界仍在问 legacy 扫描器 |
| `RawTailBuildCount` | `statement-builder.xl.md:1349`（`BuildBlock` 整段 raw 递归）、`1407` / `1437`（`CollectBodyStatements` 的两段 raw） | 块体里逐条 `Load` + `BuildStatement()` 的 raw 尾巴 |
| `ShapeAstDeclinedCount` | `statement-shape.xl.md:161`，`BuildFromShell` 里形状路径落到 `null` 的出口 | 表达式语句本该由形状树建 AST、实际拒绝了（含形状路径抛错） |

两个**交叉校验量**（读既有台账的增量，用来证伪「新计数器漏记」）：

| 量 | 来源 | 已知差异 |
| --- | --- | --- |
| `totalDeclined` | `StatementShapeAst.TotalDeclined` 的用例内增量 | 形状路径**抛错**时它不动而 `shapeAstDeclined` +1；其余应逐用例相等（基线 328 = 328 已验证） |
| `fileFallbacks` | `StatementRouteUtil.FileFallbackCount` 的用例内增量 | 无 |

**为什么 `ShapeAstDeclinedCount` 的计数点不在 `StatementShapeAst.Decline` 里**：`Decline` 在
`statement-shape-ast.xl.md`，5d-1a 的可改文件面不含它；而「表达式语句由形状树建 AST」的尝试**只有一个入口**
（`BuildFromShell` 里 `builder.BuildExpressionStatementFromShapes`），拒绝与抛错都让 `built` 停在 `null`。
计数放在那次尝试对应的 fallback 出口，计的是「整条表达式语句拒绝形状树」的次数（一次尝试至多 +1），
与 `TotalDeclined` 语义一致但更严格（抛错也算）。**这是本轮刻意选的方案：不新增对
`statement-shape-ast.xl.md` 的依赖，也不动既有计数。**

---

## 2. 基线读数（默认解析，`tests/statement-possible/legacy-retirement.mjs`）

### 2.1 语料（固定，不抽样）

| 项 | 值 |
| --- | --- |
| 语料根 | `tests/cases/token/**/*.ts` 全量 + `typescript/cases/*.ts` 全量 |
| 文件 | **1763**（1716 + 47） |
| 用例 | **6300** = 1706 个 token 文件 + 6 个整文件合法的 `typescript/cases/*.ts` + 4588 条逐行用例 |
| 整文件 TS 非法（跳过并计数） | **10**（与 `token-ast.mjs` 的 `ts-invalid=10` **同一个数**、同一批文件） |
| 逐行用例 TS 非法（跳过并计数） | **1269**（`typescript/cases` 里带 `\n` 转义的行，本探针**不做** `ast-json.mjs` 那种解码，见 §7） |
| 用例清单指纹 | `c6d9890f…f13ed23`（`--write-baseline` 里存） |
| 基线文件 | `tests/statement-possible/legacy-baseline.json`（407 KB；`perFile` 一用例一行，可 diff） |

### 2.2 总计（基线 = 当前事实）

| 指标 | 合计 | 有读数的用例 |
| --- | --- | --- |
| `LegacyStatementDispatchCount` | **4471** | 6297 / 6300 |
| `ScanRootCallCount` | **32414** | —— |
| `RawTailBuildCount` | **292** | —— |
| `ShapeAstDeclinedCount` | **328** | —— |
| （交叉校验）`StatementShapeAst.TotalDeclined` | **328** | —— |
| （交叉校验）`FileFallbackCount` | **50** | —— |

分半：`tests/cases/token` 半边 legacy **1891** / scanRoot **19846** / rawTail **94** / declined **187**；
`typescript/cases` 逐行半边 legacy **2580** / scanRoot **12568** / rawTail **198** / declined **141**。

按 token 语料子目录分（legacy）：`statements` 583、`types` 478、`expressions` 317、`declarations` 251、
`modules` 166、根 46、`lexical` 37、`ambiguous` 13。

### 2.3 逐构造读数（`--snippets`，42 条最小源码；最后一列 = `--legacy-only` 底座）

| 构造 | legacy | scanRoot | rawTail | declined | scanRoot 底座（壳全关） |
| --- | --- | --- | --- | --- | --- |
| empty-statement | 1 | 2 | 0 | 0 | 2 |
| expr-binary | 0 | 1 | 0 | 0 | 2 |
| expr-call | 0 | 1 | 0 | 0 | 2 |
| let-decl | 0 | 5 | 0 | 0 | 5 |
| const-decl | 0 | 5 | 0 | 0 | 5 |
| var-decl | 0 | 5 | 0 | 0 | 5 |
| block | 2 | 3 | 0 | 0 | 2 |
| if | 1 | 4 | 0 | 0 | 4 |
| if-else | 1 | 6 | 0 | 0 | 6 |
| while | 1 | 4 | 0 | 0 | 4 |
| do-while | 1 | 5 | 0 | 0 | 6 |
| for | 1 | 4 | 0 | 0 | 4 |
| for-in | 1 | 4 | 0 | 0 | 4 |
| for-of | 1 | 4 | 0 | 0 | 4 |
| switch | 4 | 4 | 0 | 0 | 4 |
| try | 1 | 8 | 0 | 0 | 8 |
| with | 1 | 4 | 0 | 0 | 4 |
| label | 1 | 5 | 1 | 0 | 6 |
| break-continue | 3 | 8 | 0 | 0 | 4 |
| return | 1 | 5 | 0 | 0 | 2 |
| throw | 1 | 3 | 0 | 0 | 4 |
| debugger | 1 | 2 | 0 | 0 | 3 |
| function-decl | 0 | 6 | 0 | 0 | 2 |
| async-function-decl | 1 | 5 | 0 | 0 | 2 |
| class-decl | 1 | 5 | 0 | 0 | 2 |
| class-fields | 0 | 2 | 0 | 0 | 2 |
| import-named | 1 | 2 | 0 | 0 | 2 |
| import-default | 1 | 2 | 0 | 0 | 2 |
| export-list | 1 | 2 | 0 | 0 | 2 |
| export-default | 1 | 2 | 0 | 0 | 2 |
| export-const | 1 | 2 | 0 | 0 | 2 |
| interface | 1 | 2 | 0 | 0 | 2 |
| type-alias | 1 | 2 | 0 | 0 | 2 |
| enum | 1 | 2 | 0 | 0 | 2 |
| namespace | 1 | 2 | 0 | 0 | 2 |
| declare-global | 1 | 2 | 0 | 0 | 3 |
| block-function | 1 | 3 | 1 | 0 | 2 |
| block-class | 2 | 6 | 0 | 0 | 2 |
| arrow-block-body | 0 | 11 | 0 | 0 | 7 |
| object-method-body | 0 | 9 | 0 | 0 | 5 |
| multi-statement-body | 3 | 13 | 0 | 0 | 2 |
| decorated-class | 0 | 2 | 0 | 0 | 2 |

**读法**：「底座」= 把壳全关后同一段源码的 `ScanRoot` 次数，也就是**纯 legacy 的固有成本**。
`scanRoot` 比底座**高**的行，差额就是壳自己加的调用（例如 `return` 5 vs 2、`multi-statement-body` 13 vs 2、
`function-decl` 6 vs 2）；比底座**低**的行说明壳把 legacy 候选的一部分调用也压掉了
（`expr-binary` 1 vs 2、`debugger` 2 vs 3）。

### 2.4 语料级对照（诊断，`--legacy-only`，不参与基线校验）

| 量 | 默认解析 | 壳全关 | 差 |
| --- | --- | --- | --- |
| `ScanRootCallCount` | 32414 | 32661 | **−247（壳净省 0.76%）** |
| `RawTailBuildCount` | 292 | 1369 | **−1077（块体目录/收集通道省 79%）** |
| `LegacyStatementDispatchCount` | 4471 | 0（壳不存在，按定义不计数） | —— |
| `ShapeAstDeclinedCount` | 328 | 0（形状路径不存在） | —— |

**结论**：`ScanRoot` 是「根 legacy 候选逐格判界」的固有成本，**不是壳的成本**；`RawTail` 才是壳已经大幅改善的面
（1077 → 292），所以 5d-4 只要处理**剩下 292 条**与 §3.6 的 16 处 legacy 体建树即可。

---

## 3. 当前 legacy 入口清单（文件:方法 + 调用点 + 退场阶段）

### 3.1 建树（整段 raw 分派）：`StatementShape.BuildFromShell` → `StatementBuilder.BuildStatement`

- 调用点：`typescript/tokens/statements/statement-shape.xl.md:162-164`（`built === null` 的 fallback）。
- 什么时候走：`shell.Kind` 不是表达式族（形状树没接住）也不是变量族三层 possible 时；
  今天是**声明族（`ShellDeclarationFamily`）的绝大多数**与**控制流族**的壳收口。
- 量：`LegacyStatementDispatchCount = 4471`（占 11083 条语句的 40%）。
- 退场阶段：**5d-3**（声明族语句壳自建树）+ **5d-4**（控制流 / 分支族的语句形状建树）。

### 3.2 判界（`StatementScanner.ScanRoot` 的三个壳侧调用点 + 一个根侧调用点）

| 调用点 | 位置 | 谁在问 | 量级（逐构造） |
| --- | --- | --- | --- |
| ① | `statement-end-possible-shape.xl.md:171`（`ComputeByIndex`，非表达式 / 非声明族分支） | 变量族（Wave1）、控制流族、标签族、块壳 | `let` 5、`if` 4、`try` 8 |
| ② | `statement-end-possible-shape.xl.md:363`（`BuildByIndex`，EOF 分支） | 同上 | 随语句尾格 |
| ③ | `statement-end-possible-shape.xl.md:401`（`BuildByIndex`，普通格） | 同上（空语句壳除外） | 随语句每格 |
| ④ | `statement-shape.xl.md:407`（`TryToClose`，非声明 / 非表达式族） | 文件末尾兜底 | 每条无分号末语句 1 次 |
| ⑤ | `statement-possible-shape.xl.md:131`（根 legacy 候选 `ComputeByIndex`） | **根目录里还没被新候选接管的语句** | 整个语料 32661 次的大部分 |

- 退场阶段：①②③④ 属 **5d-1b（短族）** 与 **5d-2（bracket-chain 族）**；⑤ 只能在
  根 legacy 候选退出根目录时消失，属 **5d-5**（在此之前 `ScanRootCallCount` 到不了 0，见 §0-2）。

### 3.3 块体 raw 尾巴（`StatementBuilder`）

| 位置 | 方法 | 语义 |
| --- | --- | --- |
| `statement-builder.xl.md:1349` | `BuildBlock` | `HasBuiltBodyStatements == false` 时整段 raw 递归建块体 |
| `statement-builder.xl.md:1407` | `CollectBodyStatements` | 已建语句**之间**的 raw 段 |
| `statement-builder.xl.md:1437` | `CollectBodyStatements` | 块体**尾部**的 raw 段 |

- 量：`RawTailBuildCount = 292`（块体目录已把 1369 → 292）。
- 退场阶段：**5d-4**。

### 3.4 表达式语句的形状树拒绝（`StatementShapeAst.Decline`）

- 拒绝入口：`statement-shape-ast.xl.md:92`（`Decline`），调用方 `statement-shape.xl.md:142`。
- 量：`ShapeAstDeclinedCount = 328`，与 `TotalDeclined` 328 相等。
- 退场阶段：**5d-4**（按 `LastDeclineReason` 逐条补覆盖；`op-ast-proof` 的 94 条是既有覆盖面的证据）。

### 3.5 文件级兜底（整条文件重解析）

- 位置：`typescript/run/source-file-runner.xl.md`（`Parse` 的 `catch` → `ParseCore(..., false)` + `FileFallbackCount++`）。
- 量：`FileFallbackCount = 50`（默认解析这套语料时的次数）。
- 退场阶段：**5d-4 / 5d-5**（先把抛错修掉；兜底通道本身在「新路径不再抛错」后才可能删）。

### 3.6 其它 legacy 建树（`this.BuildStatement()` 的 16 处，**不计入** `RawTailBuildCount`）

| 方法 | 行 | 方法 | 行 |
| --- | --- | --- | --- |
| `BuildExportedStatement` | 720 | `BuildLabeled` | 2330 |
| `BuildDefaultModifierStatement` | 764 | `BuildCaseBlock` | 2487 / 2511 |
| `BuildIf` | 1912 / 1918 | `BuildTry` | 2535 / 2546 |
| `BuildWhile` | 1934 | `BuildCatchClause` | 2633 |
| `BuildDo` | 1954 | `BuildWith` | 2652 |
| `BuildFor` | 2096 | `BuildForInOrOf` | 2143 |

- 语义：控制流语句的**体**、标签体、`case` 子句体、`catch` / `finally` 体仍由建造器逐条建。
- 它们不产生 `RawTailBuildCount`（口径只覆盖块体 raw 尾巴），但**它们是 `LegacyStatementDispatchCount` 之外
  仍然存在的 legacy 建树面**：语句形状接管控制流（5d-2/5d-4）时必须一起换成「体由目录收集」。
- 退场阶段：**5d-4**。

---

## 4. 逐阶段退场顺序

验收口径统一为四条（每阶段都必须全绿）：

```powershell
node node_modules/typescript/bin/tsc -p tsconfig.json          # 必须先 tsc exit 0（历史上有 0 error 但 TS2304 的假绿）
node tests/statement-possible/legacy-retirement.mjs            # 指标与基线一致 / 阶段收口后重写基线
node tests/statement-possible/legacy-retirement.mjs --snippets # 目标族逐构造读数
node tests/statement-possible/legacy-retirement.mjs --legacy-only   # 底座，用来算「壳侧还剩多少」
```

全门（每阶段收口都跑，读数见 §6）：`ast-json` / `ast-json-diff` / `token-ast` / `real-dts` /
`harness --all` / `harness --double-accept` / `declaration-statement-takeover` / `final-matrix` /
`validate` / `op-ast-proof` / `ast-kind-names`。

### 4.1 5d-1b —— 短族判界（**另一成员正在进行；本阶段不改这些文件**）

- **目标**：`statement-end-possible-shape` 的 `ComputeByIndex` / `BuildByIndex` 与 `statement-shape.TryToClose`
  不再为**短族**（变量族、空语句、标签、`break` / `continue` / `return` / `throw` / `debugger`）
  调用 `StatementScanner.ScanRoot`，改读 `StatementBoundaryUtil.StatementEndCode`
  （表达式族 / 声明族已在用的同一份 `;` / ASI / EOF 判据，**不新写第二套 ASI**）。
- **指标目标**：下面这些逐构造行的 `scanRoot` 必须**回到 `--legacy-only` 底座或更低**：
  `return` 5→≤2、`break-continue` 8→≤4、`debugger` 2→≤3（已达标）、`empty-statement` 2→≤2（已达标）、
  `label` 5→≤6（已达标）、`let/const/var` 5→≤5（已达标，变量族底座就是 5）。
  全局 `ScanRootCallCount` **不得高于 32414**，`LegacyStatementDispatchCount` **不得高于 4471**。
- **涉及文件**：`statement-end-possible-shape.xl.md`（5d-1b 成员）、`statement-shape.xl.md`（`TryToClose` 的变量族分支）、
  `statement-boundary-util.xl.md`（判据提供方，**本轮只读**）。
- **验收命令**：§4 的四条 + `--quiet` 总计 + 全门。
- **回退**：单文件 `git checkout -- <file>` 即可（判界来源换回 `ScanRoot`，判据实现没动过）。
- **风险**：把表达式族的边界规则误用到标签 / 受限产生式（`yield`、`throw` ⏎ `a`、`debugger` ⏎ `a`）——
  靠 `tests/statement-possible/gap-*`、`harness --all` 的 102 条与逐构造行兜住；`IsAsiBoundary` 函数体不得改。

### 4.1b —— 5d-1b2：语句壳收口建树所有权迁到 possible 层（**已完成**）

- **目标**：`StatementShape.BuildFromShell` 的 `built === null` 分支不再直接调 `StatementBuilder.BuildStatement()`，
  改由 possible 层的 `StatementFamilyDispatch`（`typescript/tokens/statements/statement-family-dispatch.xl.md`）
  **按壳 `Kind` 与首代码单元**直接调用建造器的 family 方法（`BuildBlock` / `BuildIf` / `BuildVariableStatement` /
  `BuildInterfaceDeclaration` / `BuildExportStatement` …，与 legacy 分派是同一批工厂方法）。
  `BuildStatement()` 只保留给两处：**ambient 变量语句**（`declare const|let|var|using`）与**未建壳的语句**
  （根 legacy 候选 / 文件级 fallback）。
- **指标读数**（`tests/statement-possible/legacy-retirement.mjs`，同一语料 6300 用例）：
  `LegacyStatementDispatchCount` **4471 → 78**（−4393，−98.3%）；`ScanRootCallCount` **22467（不变）**、
  `RawTailBuildCount` **292（不变）**、`ShapeAstDeclinedCount` **328（不变）**、`FileFallbackCount` **50（不变）**。
  逐构造 42 条全部 `legacy = 0`（5d-1a 基线里 31 条为 1、`break-continue` 3、`switch` 4、`multi-statement-body` 3）。
- **剩余 78 的构成（全部同一形态）**：`declare const|let|var` 的 **ambient 变量语句**——它要在建造器内部
  `At++`、建变量语句、把 `DeclareKeywordShape` 插回 `Data` 最前、把 `Pos` 倒回 `declare` 起点，属于
  建造器内部状态改写（`Positions` / `Data` 的直接改写），本阶段刻意不搬。分布：**69 个用例 / 78 次**
  = 57 个整文件用例（66 次）+ 12 条 `typescript/cases` 逐行用例（12 次）；`--top` / `--json` 可逐个查。
- **全门零回归**：`ast-json 6171/6171`、`ast-json-diff 0/0/0`、`token-ast 1706/0`、`real-dts 226/226`、
  `harness --all 102/0/known=0`、`--double-accept 120/0`、`declaration-statement-takeover 33/33`、
  `final-matrix 38/38`、`validate 1720/0`、`op-ast-proof 94/94`、`short-family-boundary 44/44`、`ast-kind-names PASS`。
- **回退**：`git revert` 该 commit 即可（新增一个文件 + `statement-shape.xl.md` 的一处分支）；
  判据实现（`StatementScanner` / `StatementBoundaryUtil` / `BuildStatement`）一字未动。

### 4.2 5d-2 —— bracket-chain 族判界

- **目标**：控制流族（`if` / `else` / `while` / `do` / `for` / `for-in` / `for-of` / `switch` / `try` / `with` / 块 / 标签体）
  的收界改由「**括号已闭合 + `;` / ASI / EOF**」的 bracket-chain 判据回答，不再逐格问 `ScanRoot`。
  判据仍只有一份：`StatementBoundaryUtil.StatementEndCode` + 已有的 `Bracket` 闭合状态
  （`BlockPossibleShape` / `CaseClauseStatementPossibleShape` 已在用）。
- **指标目标**：`if` 4、`if-else` 6、`while` 4、`do-while` 5、`for` 4、`for-in` 4、`for-of` 4、`switch` 4、
  `try` 8、`with` 4、`block` 3 这些行的 `scanRoot` 必须**严格下降**（目标是 ≤1，即只剩根 legacy 候选那一层），
  全局 `ScanRootCallCount` **严格小于 5d-1b 收口后的读数**（预期量级：数千）。
- **涉及文件**：`statement-end-possible-shape.xl.md`、`statement-scanner.xl.md`（只提供 `ScanDeclarationBody` 等既有判据）、
  `block-possible-shape.xl.md` / `case-clause-statement-possible-shape.xl.md`（判据调用方）。
- **验收命令**：§4 四条 + 全门（尤其 `ast-json-diff` 0/0/0 与 `token-ast` 1716 全量）。
- **回退**：同上，逐文件 revert；判据实现（`StatementScanner`）不改，所以回退不需要重建语义。
- **风险**：`switch` 的 `case`/`default` 子句与 `do…while` 的 `;` 是两个历史坑（`gap-SW` 刚修过），
  改判界来源时**最容易在这里**出现「语句没有读完」；`harness --all` 的 `stage1-mixed` /
  `gap-as1` / `gap-sw` 组是这类回归的第一道网。

### 4.3 5d-3 —— 声明族语句壳自建树（`function` / `class` 为一等目标，但**同族必须一起收口**）

- **目标**：`ShellDeclarationFamily` 的壳收口不再调 `BuildStatement()`，改由「声明族语句形状 + 体由目录收集」建树。
  **注意范围**：`LegacyStatementDispatchCount` 的 4471 里有 **2369 条（53%）** 是声明族语句
  （`TypeAlias` 944 / `Module` 390 + `NamespaceExport` 21 / `Interface` 347 / `Enum` 160 / `Import` 189 /
  `ExportDeclaration` 176 / `ImportEquals` 74 / `ExportAssignment` 68）。
  只做 `function` / `class`（834 + 1016 条，且它们今天**大多不走** legacy 分派）**不会让这个指标下降**；
  5d-3 必须把 `interface` / `type` / `enum` / `namespace` / `import` / `export` 六族一起接住。
- **指标目标**：逐构造行 `interface` / `type-alias` / `enum` / `namespace` / `declare-global` /
  `import-named` / `import-default` / `export-list` / `export-default` / `export-const` 的 `legacy` 从 **1 → 0**；
  `async-function-decl` / `class-decl` 的 1 → 0；全局 `LegacyStatementDispatchCount` 必须**下降约 2369**
  （目标 ≤ 2102，即只剩控制流 / 分支族）。
- **涉及文件**：`statement-shape.xl.md`（`BuildFromShell` 的声明族分支）、`statement-builder.xl.md`
  （`BuildInterface` / `BuildTypeAlias` / `BuildEnum` / `BuildModule` / `BuildImport` / `BuildExport` 的形状化入口）、
  `declaration-statement-possible-shape.xl.md` / 各 `*-declaration-possible-shape.xl.md`。
- **验收命令**：§4 四条 + 全门；另加 `declaration-statement-takeover.mjs`（默认态 33/33）。
- **回退**：按「一个族一个 commit」推进，单族 revert 不影响其它族。
- **风险**：声明族今天靠 `BuildStatement()` 的**标签分派**决定建哪种声明形状（`interface` vs `enum` vs `type`），
  形状化时若把「判型」搬进 possible 候选，会与 `DecideDeclaration` 形成第二份判据——**判型必须仍只有一份**
  （沿用 `StatementRouteUtil.DecideDeclaration`）。另外声明族的 ASI / `;` 边界已经在用表达式族同一份判据，
  不要顺手改。

### 4.4 5d-4 —— raw 尾巴消除 + 控制流 / 分支族语句形状

- **目标**：
  1. `RawTailBuildCount` 292 → 0：块体里不再有「已建语句之间的 raw 段」，让块体目录覆盖全部语句族；
  2. §3.6 的 16 处 `this.BuildStatement()`（控制流体 / 标签体 / `case` 体 / `catch` / `finally`）换成「体由目录收集」；
  3. 控制流 / 分支族的**语句形状**接管（`if` 157 / `while` 63 / `do` 48 / `for` 89 / `for-of` 83 / `for-in` 23 /
     `try` 83 / `switch` 108 / `with` 14 / `labeled` 155 / `block` 591 / `empty` 66 / `break` 128 / `continue` 25 /
     `return` 443 / `throw` 28 / `debugger` 9 = **2113 条**）；
  4. `ShapeAstDeclinedCount` 328 → 0（按 `LastDeclineReason` 逐条补形状树覆盖，`op-ast-proof` 同步加用例）。
- **指标目标**：`RawTailBuildCount = 0`；`ShapeAstDeclinedCount = 0`；`LegacyStatementDispatchCount` **≤ 2113 → 0**
  （严格说本阶段结束时它应 ≈ 0，剩多少 = 未接管的族数 × 该族用例数）。
- **涉及文件**：`statement-builder.xl.md`（两处 raw 段 + 16 处体建树）、`block-possible-shape.xl.md`（块体目录挂全部族）、
  `control-flow-statement-possible-shape.xl.md` / `*-statement-shape.xl.md`、`statement-shape-ast.xl.md`（补覆盖）。
- **验收命令**：§4 四条 + 全门 + `op-ast-proof.mjs`（94 条，补覆盖后应上升）。
- **回退**：按族推进；块体收集通道（`CollectBodyStatements`）有「安全回退」抛错路径，raw 段删除后该路径也可删。
- **风险**：这是**最大的一步**（2113 条语句 + 16 处建树入口）。`BlockPossibleShape` 的挂载判据一旦放宽，
  会和 `SourceFileShape` 的括号事件、`TryMountFunctionBody` 双挂载（HANDOFF-s4 记过同类坑）。

### 4.5 5d-5 —— 死代码删除 / 文档 / 最终验证

- **目标**：
  1. 删掉根 legacy 候选（`statement-possible-shape.xl.md` 的语句候选入口）→ **`ScanRootCallCount = 0`**；
  2. 删掉 `StatementScanner.ScanRoot` 与其调用点、`StatementShape.BuildFromShell` 的 fallback 分支
     （`StatementLegacyMetrics.LegacyStatementDispatchCount` 随之只能为 0）；
  3. 删掉文件级兜底（`EnableFileFallback` / `FileFallbackCount`）——前置条件是「新路径不再抛错」，即 `FileFallbackCount = 0`；
  4. 删除 `StatementLegacyMetrics` 本身（指标退役，探针改为断言「这四个符号不存在」或直接删除探针）；
  5. 文档：`HANDOFF.md` / `docs/possible-statement-*.md` 收口，`legacy` 字样只保留在历史文档里。
- **指标目标**：四个指标 **全部 0**、`FileFallbackCount = 0`、`KnownGap = 0`，全门读数与今天**相同或更好**
  （`ast-json` 6171/6171、`token-ast` 1706/0、`real-dts` 226/226、`harness` 102/0、`validate` 1720/0、
  `final-matrix` 38/38、`op-ast` ≥94、`ast-kind-names` PASS）。
- **涉及文件**：`statement-scanner.xl.md`、`statement-possible-shape.xl.md`、`statement-shape.xl.md`、
  `statement-builder.xl.md`、`source-file-runner.xl.md`、`statement-route-util.xl.md`（开关与计数）、测试与文档。
- **验收命令**：§4 四条（此时 `legacy-baseline.json` 全 0）+ 全门 + `git grep -n "ScanRoot\|BuildStatement()"` 人工过一遍。
- **回退**：删代码前先打 tag；`git revert` 单 commit 可回。
- **风险**：**删根 legacy 候选是唯一能让 `ScanRoot` 归零的动作**，但它同时是「AST 与 legacy 逐字节一致」的最后一道网。
  删除前必须让 5d-4 的形状化覆盖全部 6300 个用例（`ast-json-diff` 0/0/0、`token-ast` diff=0 已经是强证据，
  但 `ast-json` 只测 47 个构造的 6171 条、`token-ast` 只测 1716 个文件，语料外的形态仍可能只被 legacy 建对）。

---

## 5. 指标目标总表

| 阶段 | LegacyDispatch | ScanRoot | RawTail | ShapeAstDeclined | FileFallback |
| --- | --- | --- | --- | --- | --- |
| 基线（b5f844ae） | 4471 | 32414 | 292 | 328 | 50 |
| 5d-1b 短族判界 | ≤4471 | ≤32414（短族逐构造行回到底座） | ≤292 | ≤328 | ≤50 |
| 5d-1b2 建树所有权转移（已完成） | **78** | **22467**（不变） | 292（不变） | 328（不变） | 50（不变） |
| 5d-2 bracket-chain 判界 | ≤4471 | **严格下降**（控制流族逐构造行 ≤1） | ≤292 | ≤328 | ≤50 |
| 5d-3 声明族自建树 | ≤2102 | ≤5d-2 读数 | ≤292 | ≤328 | ≤50 |
| 5d-4 raw 尾巴 + 控制流形状 | 0 | ≤5d-3 读数 | **0** | **0** | **0** |
| 5d-5 死代码 | **0** | **0** | **0** | **0** | **0** |

> 每一阶段收口时用 `--write-baseline` 把当前读数写成新基线（阶段目标达成后基线就是新地板），
> 并把「阶段末读数」写进该阶段 HANDOFF；**不允许**为了变好看而改语料或改指标口径。

---

## 6. 本轮（5d-1a）实测全门读数（零回归）

| 门 | 读数 |
| --- | --- |
| `typescript/cases/ast-json.mjs` | **6171 / 6171**（47 构造，cj-fail 0） |
| `typescript/cases/ast-json-diff.mjs` | **6171 / 6171**，结构差 0 / 位置差 0 / 字段差 0；`git status --porcelain typescript/cases` 空 |
| `typescript/cases/token-ast.mjs --quiet` | total=1716 **ok=1706 crash=0 diff=0** ts-invalid=10 |
| `typescript/cases/real-dts-ast.mjs` | **226 / 226**，崩溃 0、差异 0 |
| `harness.mjs --all` | **102 pass / 0 fail / known=0 / uncovered=0 / file-fallback=0** |
| `harness.mjs --double-accept` | **120 / 0**，冲突 0 |
| `declaration-statement-takeover.mjs` | **33 / 33**，knownGap=0、takeover=27、totalShell=33 |
| `final-matrix.mjs` | **38 / 38**（shapeAst / xmlEqLegacy / astEqTS 全 38/38，knownGap=1 既有 `clause-nested-known-gap`） |
| `tests/parse/validate.mjs` | **1720 条 / 0 条不合格** |
| `op-ast-proof.mjs` | **94 / 94**（形状树接管计数已核 94） |
| `ast-kind-names.mjs` | **PASS**（live 5/5、self-test 4/4、fixtures 47、运算符节点 262、fail=0） |
| `legacy-retirement.mjs`（新） | **PASS**，两次运行逐用例一致；总计 4471 / 32414 / 292 / 328 |

---

## 7. 未覆盖与风险（诚实清单）

1. **`typescript/cases` 的 1269 条逐行用例未测**：那些行在 `ast-json.mjs` 里会先做 `\n` 转义解码再解析；
   本探针**不做**解码（解码会把一行展开成多条语句，量的是另一个程序），因此带转义的行按字面解析失败、只计数。
   语料的可测面因此是 **6300** 个用例，而不是两棵目录的全部物理行。
2. **10 个 token 语料文件未测**：TS 自己解析失败（与 `token-ast` 的 `ts-invalid=10` 同一批、同一个判定），
   本探针跳过并计数。若将来这些文件被修成合法 TS，用例数会变，必须 `--write-baseline`。
3. **指标是「调用次数」，不是「语句数」**：`ScanRoot` 对一条语句会调用多次（逐格），所以 32414 不能与 11083 条语句直接相除；
   逐构造表已经把「一族的次数」摊开，跨阶段比较请用同一族同一行。
4. **`FileFallbackCount = 50` 是这套语料上的实测值**，它说明默认解析仍有 50 次「新路径抛错 → 整条文件改走 legacy」。
   这不是本阶段引入的（`ast-json` / `token-ast` 两条门都是全绿，说明兜底后的 AST 正确），但它是 5d-4/5d-5 必须清掉的面。
5. **`--legacy-only` 与 `--snippets` 是诊断模式**，不参与基线校验；它们的作用是把「纯 legacy 底座」量出来，
   让每阶段的「壳侧还剩多少」有分母。改这两个模式**不改变**默认读数。
6. **本轮没有验证「语料外形态」**：`ast-json` 6171 条 + `token-ast` 1716 文件仍是既有覆盖面，
   指标归零不等于「TS 全语法都建对了」——5d-5 的风险 5 已写明这一点。

---

## 8. 阶段执行记录

### 8.1 5d-3（根层声明语句壳化）——已交付

分支 `feature/possible-statement-5d3`，基线 `49209483`。详见 `HANDOFF-5d3.md`，要点：

- **新族码**：`StatementRoute.ShellFunctionDeclaration = 8` / `ShellClassDeclaration = 9` /
  `ShellDecoratedDeclaration = 10`；开关 `EnableRootDeclarationShell = true`（关掉逐位回到 5d-2a）。
- **路由**：`Decide` 首格识别 `function` / 同一行 `async function` / `class` / 同一行 `abstract class` /
  语句首 `@`；**只认根层**（语句首 `Parent` 不是块体括号），块内 `class` 仍 `ShellStatementFamily`、
  块内 `function` / 装饰器声明仍 `Legacy`（未迁）。
- **判界**：唯一实现点 `StatementBoundaryUtil.DeclarationShellEndCode`（体括号 `TypeBuilder.IsBodyBrace` /
  `;` / 声明跟随边界 / EOF；装饰器族不认 ASI），终结候选与 `StatementShape.TryToClose` 读同一份，
  **不调 `ScanRoot`**。
- **建树**：`StatementShape.BuildFromShell` 直接调 `BuildFunctionDeclaration()` / `BuildClassDeclaration()` /
  `BuildDecoratedStatement()`（不经过 `BuildStatement()`）。
- **指标**：全量 `ScanRootCallCount` **22467 → 21164**；族作用域 ScanRoot（文件半边）**427 → 0**；
  legacy 根候选 `BuildByIndex`（shell 模式主路径，文件半边）**477 → 3**；`RawTailBuild` **292 → 288**；
  `LegacyStatementDispatch` **4471 → 4470**；`FileFallback` **50 → 50**；`Declined` **328 → 328**。
- **全门**：ast-json 6171/6171、diff 0/0/0、token-ast 1706/0、real-dts 226/226、harness 102/0/known=0、
  double-accept 120/0、takeover 33/33、final-matrix 38/38、validate 1720/0、op-ast 94/94；新探针
  `declaration-shell-boundary` 74/74（含 55 条反事实敏感性）。
- **未迁**：`declare` / `export` 前缀（声明族壳）、块内 `function` / 装饰器声明、`async` ⏎ `function` /
  `abstract` ⏎ `class`（TS 的 ASI 拆分）、装饰器 + 变量 + 无分号（本族不认 ASI 的已知边界）。
- **既有红（不是本轮引入）**：`control-flow-body-takeover.mjs` 的 `{ enum E { A } }` /
  `{ declare const x: number; }` 两条（`BlockBodyStatementCount` 期望 0、实测 1）；在 HEAD 上复现同样两条。

## 9. Stage 5d-4 指标收尾（实测，2026-10-25，HEAD=9794534a 之上）

### 9.1 四项指标前后（默认解析，`legacy-retirement.mjs`，语料 6300 用例不变）

| 指标 | 5d-1b/2b 基线 | 5d-4 之后 | 差 |
| --- | --- | --- | --- |
| `LegacyStatementDispatchCount` | 78 | **0** | −78（**达标**） |
| `ScanRootCallCount` | 19243 | 19427 | **+184**（`yield` 壳的判界仍由 `ScanRoot` 说，见 8.3） |
| `RawTailBuildCount` | 292 | 218 | −74 |
| `ShapeAstDeclinedCount` | 328 | 328 | 0（本轮未动） |
| `FileFallbackCount`（交叉校验） | 50 | 50 | 0（**没有把 fallback 当接管**） |

### 9.2 `LegacyStatementDispatchCount = 0` 的做法

`declare const|let|var|using` 的 ambient 变量语句原先在 `StatementFamilyDispatch` 里返回 `null` 交回
`StatementBuilder.BuildStatement()`（它要 `At++`、把语句 `Pos` 倒回 `declare`、把 `DeclareKeywordShape`
插进 `Data` 最前）。5d-4 把那段实现**逐字搬进** `StatementBuilder.BuildDeclareVariableStatement()`——
仍是同一个 `this` / `At` / `Positions` / `Pos`，所以壳收口可以直接调它，`BuildStatement` 的同一格也调它。
外部分派从此**没有任何形态**退回整段 raw 分派（剩下的只是未建壳的根层 / 文件级 fallback）。

### 9.3 `RawTailBuildCount 292 → 218`：新族 `yield` 语句壳

`CreateBodyPossibleShapes` 多注册一个 `YieldStatementPossibleShape`（与 Stage 4l 的
`AwaitStatementPossibleShape` 逐字同构，门控 `StatementRouteUtil.EnableYieldStatement`、计数 `YieldShellCount`）。
它是 raw 尾巴里最大的一族（`yield 1;` / `yield;` / `yield* h();` 合计 ~57 条），补上之后生成器体内这些语句由壳建、
`CollectBodyStatements` 按序收，raw 段只剩它们旁边仍未接管的语句（`break` / 函数声明 / 标签体等）。

**代价（诚实记录）**：判界仍走 `StatementScanner.ScanRoot`（与 legacy 根候选同一份），所以
`ScanRootCallCount` +184。改成表达式族判据（`ShellPlainExpression` + `CanEndStatement`）实测会把
`yield⏎(x)` 这类受限产生式收进同一个壳、建造器只建 `yield` → 「语句没有读完」→ **4/20 条探针走文件级重解析**，
因此**不采用**。归零办法是在 boundary 层补 `yield` 族判界（像 5d-2a/2b 的短族 / 控制流族），需要新增
`StatementKind` / 专用终结形状，留待下一阶段。

### 9.4 `ShapeAstDeclinedCount` 仍为 328（本轮未动，剩余清单）

按文件聚类的 Top（`--json` 的 `perFile`，194 个文件有读数）：

| 类别 | 代表用例 | 计数 |
| --- | --- | --- |
| **带 `as` / `!` / `[0]` 尾巴的标签模板**（非常规被标宿主：`a!`t``、`(a)`t``、`new C()`t``） | `expr-r1225-template-as.ts` 20、`expr-r1213-optional-chain-member-as.ts` 7 | ~35 |
| **非标识符宿主的标签模板**（`[a,b]`t``、`/re/g`t``、`import.meta`t``、`new.target`t``） | `expr-r1229-regex-meta-tag.ts` 21、`expr-r1228-array-tag.ts` 18 | ~45 |
| **类型实参 + 可选调用链 + 标签模板**（`a<b>?.(1)`t`` / `as` / `satisfies`） | `expr-r1222-instantiation-optional.ts` 16、`expr-r1227-opt-tagged-template.ts` 14 | ~38 |
| `super` 调用 / `new.target` 成员族 | `decl-class-super.ts`、`expr-call-super.ts` | ~6 |
| 其它零散（`angle.ts` 7、`string.ts` 2 …） | — | 余下 |

共同点：**标签模板的被标表达式形状**只覆盖了简单标识符 / 成员链，`!` / `as` / `satisfies` / 数组字面量 /
正则 / `import.meta` / `new.target` / 类型实参 + `?.()` 这些「先当被标宿主」的形态仍由形状树拒绝、
退回 legacy 表达式重解析。补一类要动 `expression-statement-possible-shape` 的被标宿主判据（一处一处放行），
本轮预算不够，**没有动**。

### 9.5 本轮未做

1. `break` / `continue` 与标签体 raw 段（~24 条）：它们的宿主 `{` 是标签语句的体、根本没挂块体目录，
   要动「标签体挂目录」机制，属结构性改动。
2. 块内函数 / `async function` 声明留下的 raw 段（~20 条）：块体目录不含声明族候选，需要声明壳 + 体挂载一起动。

---

## 10. Stage 5d-5 根扫描退场（实测，2026-10-25，HEAD=09ce8d8e 之上）

本阶段只做 §4.5 的**第 1 项**（根 legacy 候选退场 → 默认解析 `ScanRootCallCount = 0`）。§4.5 的第 2–4 项
（删 `ScanRoot` / 删文件级兜底 / 删 `StatementLegacyMetrics`）的前置条件都还没成立，**本轮不动**：
最重要的一个是 `FileFallbackCount = 50`，它说明「新路径不再抛错」这条前置**还不满足**，兜底必须留着。

### 10.1 四项指标前后（默认解析，`legacy-retirement.mjs`，语料 6300 用例不变）

| 指标 | 5d-4 之后 | 5d-5 之后 | 差 |
| --- | --- | --- | --- |
| `LegacyStatementDispatchCount` | 0 | **0** | 0 |
| `ScanRootCallCount` | 19427 | **388** | **−19039** |
| `RawTailBuildCount` | 215 | **215** | 0 |
| `ShapeAstDeclinedCount` | 328 | **328** | 0 |
| `FileFallbackCount`（交叉校验） | 50 | **50** | 0（**没有用兜底换数字**） |

`ScanRootCallCount = 388` 里的 **100% 是文件级 fallback 的 legacy 重解析**（专用探针
`root-retirement.mjs` 按调用发生时的 `EnableShellExpressions` 分桶：默认态 **0**、fallback 态 **388**）。
即：**默认解析的根 legacy 候选退场已完成**，剩下的这个数只在 `EnableShellExpressions === false` 时出现。

### 10.2 门控点：根候选从默认目录里退出（两份缓存，按态取）

`SourceFileShape.CreatePossibleShapes()` 现在有**两份缓存**：

| 缓存 | 何时用 | 内容 |
| --- | --- | --- |
| `CreatePossibleShapesCache` | `EnableShellExpressions === true`（默认解析） | 17 个候选，**不含** `StatementPossibleShape` |
| `CreateLegacyPossibleShapesCache` | `=== false`（文件级 fallback / harness 的 legacy 对拍） | 上面那份 + 在原第 4 位（下标 3）插回 `StatementPossibleShape` = 18 个 |

**为什么必须是两份**：`CatalogGuide` 长期持有这个数组（`PossibleShapes` 构造后一字不改），而同一个进程里
两种态会交替出现（文件级 fallback 就是同一次 `Parse` 里的第二次装配）。只用一份、按调用时的开关决定
放不放根候选，会让「先跑过一次默认解析」把 false 态的目录永久钉成壳目录。两份缓存各自建一次、永久复用，
false 态那份是壳目录 `slice()` 后插回根候选，**同一批候选、同一个顺序**。

`StatementPossibleShape` 类的 `ComputeByIndex` / `BuildByIndex` **一字未改**：false 态走的就是这两条。

### 10.3 判界残余的三处调用点（522 + 440 + 33）

根候选退场后剩下的 `ScanRoot` 调用点按调用方归因（`tmp/scanroot-probe.mjs`）：

| 调用方 | 次数 | 迁到哪里 |
| --- | --- | --- |
| `StatementPossibleShape.ComputeByIndex` | 17129 | 随根候选退场 → **0**（只剩 fallback 态 388） |
| `StatementShape.TryToClose`（EOF 兜底） | 522 | 首格 `;` → `IsSemicolon`；短语句族 → `ShortFamilyEndCode(code, true)` |
| `StatementEndPossibleShape.ComputeByIndex` | 440 | `class`/`function` → `DeclarationBodyEndCode`；`await` → `AwaitUsingEndCode`；`yield` → 不收口 |
| `StatementEndPossibleShape.BuildByIndex` | 33 | 同上（两处 `else` 分支） |

**等价性不是推测**（`tmp/scanroot-plan.mjs`：对全语料每一次调用逐条比对旧判据与新判据）：
`TryToClose` 的 522 次**全部**给出同一个 `End`（0 不一致）；`End.Compute` 里 `yield` 184 次**从不 `Accept`**
（`ScanRoot` 对它本来就是 `Mismatch`/`NeedMore`），`await` 211 次里只有 11 次 `Accept`、且全是
`await using x = …;`——所以 `await` 迁到 `AwaitUsingEndCode`（`ScanRoot` 的 `await` 分支逐字搬迁，
`End` 逐条相同）；`class`/`function` 那 45 次 `ScanRoot` 一律 `Mismatch`，分支的真实判据本来就是
`DeclarationBodyEndCode`，去掉的是白问的那一次。

三处都留了一条**不可达的兜底**（未知族起点仍走 `ScanRoot`）：语料 0 次；若某天有族没归位，指标会直接看到
`ScanRoot > 0`，而不是悄悄换一条收口规则。

### 10.4 本轮未做（与 §4.5 的差异，如实）

1. 不删 `StatementScanner.ScanRoot`：`TryToClose` / `StatementEndPossibleShape` 仍各留一条兜底分支，
   且 false 态（fallback）本来就靠它。
2. 不删文件级兜底：`FileFallbackCount = 50`，前置条件（新路径不抛错）没满足。
3. `RawTailBuildCount`（215）与 `ShapeAstDeclinedCount`（328）本轮**没有动**。

