# HANDOFF — Stage 5d-1b2：语句壳收口建树所有权迁到 possible 层

分支 `feature/possible-statement-5d1b2`，起点 `49209483`（= `b5f844ae` + 5d-1a 退场指标/仪器 + 5d-2a 短语句族判界迁出 `ScanRoot`）。
本步**只搬「谁来选建树方法」**，判据实现（`StatementScanner` / `StatementBoundaryUtil` / `IsAsiBoundary` / `StatementBuilder.BuildStatement` 的函数体）**一字未动**。

---

## 0. 结论先行

| 项 | 读数 |
| --- | --- |
| `LegacyStatementDispatchCount` | **4471 → 78**（−4393，**−98.3%**；目标 < 1000 达成） |
| `ScanRootCallCount` | **22467 → 22467**（不变） |
| `RawTailBuildCount` | **292 → 292**（不变） |
| `ShapeAstDeclinedCount` | **328 → 328**（不变；交叉校验 `TotalDeclined` 328、`FileFallbackCount` 50 均不变） |
| 全门 | **零回归**（§5 逐项读数） |
| 剩余 78 的构成 | **100% 同一形态**：`declare const|let|var|using` 的 ambient 变量语句（69 个用例 / 78 次） |
| 提交 | `0fdaae65` 源码 · `277ea014` 基线 · `0abc4b1c` 计划文档；基线探针 **PASS** |

一句话：**语句壳收口（`StatementShape.BuildFromShell`）不再先落到 `StatementBuilder.BuildStatement()` 的整段 raw 分派**，
改由 possible 层新增的 `StatementFamilyDispatch` 按壳 `Kind` 与首代码单元直接调用建造器的 family 方法；
`BuildStatement()` 只剩两个用途——ambient 变量语句（本阶段唯一未迁形态）与未建壳的语句（根 legacy 候选 / 文件级 fallback）。

---

## 1. 分派设计

### 1.1 文件与调用点

- 新增：`typescript/tokens/statements/statement-family-dispatch.xl.md` → `class StatementFamilyDispatch`
- 改动：`typescript/tokens/statements/statement-shape.xl.md`
  - `# dependencies` 加一行 import；
  - `BuildFromShell` 的 `built === null` 分支：`built = StatementFamilyDispatch.Build(builder, shell.Kind)`，
    仅当它返回 `null` 才 `StatementLegacyMetrics.LegacyStatementDispatchCount++` 并 `built = builder.BuildStatement()`。
- 计数语义不变：`LegacyStatementDispatchCount` 仍然只统计**真的**退回 `BuildStatement()` 的次数；
  `ShapeAstDeclinedCount` 仍在同一位、同一条件自增（328 不变）。

### 1.2 为什么 `Kind` 不能当唯一主键（三个反例，读代码实测）

| 现象 | 事实 | 后果 |
| --- | --- | --- |
| Wave1 变量壳 | `VariableStatementPossibleShape.BuildByIndex` 建壳时**不设 `Kind`**（保持 `0`） | `Kind == 0` 与 `ShellVariable` 同义（`let` / `const` / `var`） |
| case 子句壳 | `CaseClauseStatementPossibleShape` 对非带体子句语句复用 `Kind = ShellBlock` + `BodyKindBlock` | `ShellBlock` 的壳里可能是 `f();`（`Data` 没有 `{` 前缀） |
| 标签兼容通道 | 标签壳可能在 `:` 那一格才建（`Kind = ShellLabel`，`Data` = `ident` + `:`） | 仍要按首单元判 |

所以本类分两层：

1. **`KindAllows`（门控）**：`Kind` 只负责「这一族允许哪些首单元」。只有三个族是**完备**的——
   `ShellVariable` / `0`（`let|const|var|using`）、`ShellDeclarationFamily`（`StatementRouteUtil.IsDeclarationHead`，
   与 `DecideDeclaration` 判族**同一个函数**）、`ShellLabel`（标识符 + 下一个代码单元 `:`）；
   其余 `Kind`（`ShellPlainExpression` / `ShellStatementFamily` / `ShellBlock`）**不设门控**——
   它们的首单元分布已由 `Decide` 与各候选保证，多一道门只会白白少迁（门控只会让语句**回落**，不会建错树）。
2. **`BuildByHead`（首单元 → family 方法）**：复制 `BuildStatement` 的**调用点**与每个调用的**前置条件**，
   直接调 `BuildBlock` / `BuildEmpty` / `BuildVariableStatement` / `BuildIf` / `BuildInterfaceDeclaration` /
   `BuildExportStatement` / `BuildDecoratedStatement` …（同一批工厂方法，`this` 还是同一个 builder）。

### 1.3 行为逐位一致的构造性理由

- **同一个 builder、同一段 `consumed`、同一个 `Pos`**：`BuildFromShell` 里 `builder.Load(consumed, shell.Pos)` 没变，
  分派只是「谁来喊第一个 `BuildX()`」，不新建 builder、不改 `consumed`、不改 `Pos`；
- **同一个方法**：分派调的是 `BuildStatement` 里那同一个 `return this.BuildX()`，所以节点 / `SignIn`/`SignOut` / `Pos` / `End` 由同一份代码产出；
- **漏判只减少迁移量**：所有「本类不管」的形态都走两条既有出口之一——`BuildTail`（`BuildStatement` 全部分支落空后的
  「`:` → `BuildLabeled`，否则 `BuildExpressionStatement`」）或 `null`（原样回 `BuildStatement`，与 5d-1a 逐位相同）。
  因此本类的任何判据写错都**不可能**建出与 legacy 不同的树，只可能让指标回升（这一点由全门 + 探针兜住）。

### 1.4 分派顺序

与 `BuildStatement` 的分支顺序一致：`Bracket` → `Symbol`（`;` / `@` / 其它）→ `Common` 的
`import` / `export` / `default` / `function` / `class` / `async` / `declare` / `abstract` / `const|var` / `let` /
`interface` / `enum` / `type` / `namespace|module|global` / 控制流 12 个关键字 / `using` / `await` → 尾出口。

---

## 2. 逐族迁移清单（全部迁成功）

| 族 | 首代码单元（前置条件与 `BuildStatement` 逐字相同） | 迁移后直接调用 |
| --- | --- | --- |
| 块 | `Bracket` 且 `StartBracketChar == "{"` | `BuildBlock` |
| 空语句 | `Symbol` 且 `Is(";")` | `BuildEmpty` |
| 表达式语句 | 其余 `Bracket`（`(` / `[`）、任意其它 `Symbol`、字面量等非 `Common` 单元 | `BuildExpressionStatement` |
| 变量 | `let`（`StatementScanner.StartsBinding`）、`const` / `var`、`const enum`（`enum` 同行） | `BuildVariableStatement` / `BuildEnumDeclaration` |
| `using` / `await using` | `StartsUsingDeclaration`（`await` 还要 `Units[At+1] == "using"`） | `BuildVariableStatement` |
| 标签 | `Common` + 下一个代码单元 `:` | `BuildLabeled` |
| 控制流 | `if` / `while` / `do` / `for` / `switch` / `try` / `with` | `BuildIf` / `BuildWhile` / `BuildDo` / `BuildFor` / `BuildSwitch` / `BuildTry` / `BuildWith` |
| 跳转 / 调试 | `return` / `throw` / `break` / `continue` / `debugger` | `BuildReturnOrThrow(false/true)` / `BuildBreakOrContinue(false/true)` / `BuildDebugger` |
| 函数 / 类 | `function`、`class`、`async` + `function`、`abstract` + `class`（同行） | `BuildFunctionDeclaration` / `BuildClassDeclaration` |
| 类型声明 | `interface` / `enum` / `type`（名字同行 + 第三格 `=`/`<`） | `BuildInterfaceDeclaration` / `BuildEnumDeclaration` / `BuildTypeAliasDeclaration` |
| 模块 | `namespace` / `module` / `global`（`IsModuleDeclarationHead`） | `BuildModuleDeclaration` |
| 导入导出 | `import`（`IsImportStatementHead`）/ `export` / `default`（`IsDefaultDeclarationHead`） | `BuildImportStatement` / `BuildExportStatement` / `BuildDefaultModifierStatement` |
| `declare` 子族 | `declare` + `class|interface|enum|function|type|namespace|module|global`；`declare const enum` / `declare abstract class` / `declare async function`（第三格） | 对应 `Build*Declaration` |
| 装饰器声明 | `Symbol` `@` | `BuildDecoratedStatement`（返回 `null` 时 `BuildExpressionStatement`，与 `BuildStatement` 同款） |
| 尾出口 | 上下文关键字落空（`import(` / `import.meta`、`module.exports`、`type` 当标识符、`let` 不能起绑定、`using` 非声明、`await` 非 `await using`、`abstract` 非 `class`、`async` 非 `function`、`export default` 非声明头） | `BuildTail`：`:` → `BuildLabeled`，否则 `BuildExpressionStatement` |

**逐构造证据**（`--snippets`，42 条最小源码）：42 条 `legacy` **全部 0**（迁移前：32 条为 1、`break-continue` 3、`switch` 4、`multi-statement-body` 3，合计 41）。
`scanRoot` / `rawTail` / `declined` 逐构造与 5d-2a 基线**逐条相同**（未因本步变化）。

---

## 3. 谁还走 `BuildStatement`（唯一清单，全部原因同一）

| 形态 | 次数 | 用例 | 为什么本阶段不迁 |
| --- | --- | --- | --- |
| `declare const x: number` / `declare let y` / `declare var z` / `declare using`（ambient 变量语句） | **78** | 69（57 个整文件用例 66 次 + 12 条 `typescript/cases` 逐行用例 12 次） | 它要 `At++`、调 `BuildVariableStatement`、把 `DeclareKeywordShape` 插回 `Data` 最前、再把语句 `Pos` 倒回 `declare` 起点——这是**建造器内部状态**（`Positions` / `Data` 直接改写），在 possible 层复制它等于开第二份内部改写点。正确做法是给 `StatementBuilder` 加一个「ambient 变量语句」族方法后再迁（留给 5d-3/5d-4）。 |

**另外两类不经过本分派，不属于「未迁」**：

1. 未建壳的语句（根 legacy 候选 `statement-possible-shape`、文件级 fallback 整文件重解析）——它们从来不走 `BuildFromShell`；
2. `VariableStatementThreeLayer.TryBuild` 成功时的 `builder.BuildStatement()`（三层 possible 内部，与 5d-1a 相同，不计入本指标）。

复现清单：`node tests/statement-possible/legacy-retirement.mjs --top=40`，或 `--json` 里 `perFile` 第 0 列 > 0 的 69 个键。

---

## 4. 指标前后（同一语料：1763 文件 / 6300 用例 / 固定清单指纹）

| 指标 | 迁移前（`49209483`） | 迁移后（本 HEAD） | 差 |
| --- | --- | --- | --- |
| `LegacyStatementDispatchCount` | **4471** | **78** | **−4393（−98.3%）** |
| `ScanRootCallCount` | 22467 | 22467 | 0 |
| `RawTailBuildCount` | 292 | 292 | 0 |
| `ShapeAstDeclinedCount` | 328 | 328 | 0 |
| （交叉）`StatementShapeAst.TotalDeclined` | 328 | 328 | 0 |
| （交叉）`FileFallbackCount` | 50 | 50 | 0 |

分半（逐用例六元组求和）：

| 半边 | legacy | scanRoot | rawTail | declined | fileFallback |
| --- | --- | --- | --- | --- | --- |
| `tests/cases/token`（1706 文件） | **1845 → 66** | 12130 → 12130 | 91 → 91 | 177 → 177 | 11 → 11 |
| `typescript/cases`（整文件 + 逐行，共 4594 用例） | **2626 → 12** | 10337 → 10337 | 201 → 201 | 151 → 151 | 39 → 39 |

逐构造（`--snippets` 42 条）legacy 合计：**41 → 0**（有 legacy 读数的构造：32 → 0）。

> 读数口径、语料与跳过规则与 5d-1a 完全一致（探针未改一行）。基线用 `--write-baseline` 重写
> （`tests/statement-possible/legacy-baseline.json`，3368 行逐用例变更，单独 commit `277ea014`），
> 重写后再跑一次探针：`verdict: PASS`。

---

## 5. 全门读数（全部在最终源码上实跑）

| 门 | 读数 |
| --- | --- |
| `typescript/cases/ast-json.mjs` | **6171 / 6171**（47 构造，cj-fail 0） |
| `typescript/cases/ast-json-diff.mjs` | **6171 / 6171**；结构差 0 / 位置差 0 / 字段差 0（无 gap） |
| `typescript/cases/token-ast.mjs --quiet` | total=1716 **ok=1706 crash=0 diff=0** ts-invalid=10（gap-now-passing=0） |
| `typescript/cases/real-dts-ast.mjs` | **226 / 226**，崩溃 0、差异 0 |
| `harness.mjs --all` | **102 pass / 0 fail / known=0 / uncovered=0 / file-fallback=0** |
| `harness.mjs --double-accept` | **120 / 0**，冲突 0 |
| `declaration-statement-takeover.mjs` | **33 / 33**，knownGap=0、takeover=27、totalShell=33 |
| `final-matrix.mjs` | **38 / 38**（shapeAst 38/38、xmlEqLegacy 38/38、astEqTS 38/38；knownGap=1 既有 `clause-nested-known-gap`） |
| `tests/parse/validate.mjs` | **1720 条 / 0 条不合格** |
| `op-ast-proof.mjs` | **94 / 94**（形状树接管计数已核 94、TS 逐节点已核 89） |
| `short-family-boundary.mjs` | **44 / 44**（迁出族 31 / 对照 13） |
| `ast-kind-names.mjs` | **PASS**（live 5/5、self-test 4/4、fixtures 47、运算符节点 262、fail=0） |
| `legacy-retirement.mjs`（默认） | **PASS**（78 / 22467 / 292 / 328，与重写后的基线逐用例一致） |

`git status --porcelain` 在两次提交后为空；`dist/`、`build/` 未提交（`.gitignore`）。

---

## 6. 未迁族与风险（诚实清单）

1. **ambient 变量语句（78 次）**：本阶段**刻意**不迁，理由见 §3。它占 `LegacyStatementDispatchCount` 的
   **100%**，所以 78 就是这一步的**地板**，除非给建造器加族方法（不要在 possible 层复制那 10 行内部状态改写）。
2. **判据是「照抄」的，存在漂移风险**：`BuildByHead` 的每个前置条件都是从 `BuildStatement` **复制**过来的
   （本阶段的取舍：调用点在 possible 层、扫描/判界实现仍只有一份）。若将来有人给 `BuildStatement` 加一个新的 head 分支
   而本类不知道，那个 head 会**安静地回落 legacy**——不会建错树，但指标回升。守点：
   `legacy-retirement.mjs` 的 legacy 读数（78 是当前地板，回升就红）+ `--snippets` 42 条全 0 + 全门。
   5d-5 删 `BuildStatement` 时，本类就是它的替代品，届时两份判据自然合一。
3. **`Kind` 门控的边界**：只有三个族完备（§1.2）。`ShellBlock` 与 `ShellPlainExpression` / `ShellStatementFamily`
   不设门控是**故意的**（case 子句壳复用 `Kind = ShellBlock`、Wave1 是 `Kind = 0`）。新增壳族时必须确认它的首单元
   能被 `BuildByHead` 识别，否则会静默回落（安全，但不迁移）。
4. **`ScanRootCallCount` 不变是预期**：`ScanRoot` 的成本在「根 legacy 候选逐格判界」（5d 计划 §0-2），
   不在壳收口建树；本阶段不碰判界，所以 22467 逐位不变。它的归零属于 5d-5。
5. **没有删任何 legacy 代码**：`BuildStatement` 仍是 fallback、`StatementScanner.ScanRoot` 的四个壳侧调用点一个没动。
   本步只搬「所有权」，可回退性最好（见 §7）。
6. **未覆盖形态**：语料外的语句形态仍只由全门（6171 + 1716 + 226 + 102 + 120 + 44）兜住；指标 78 说的是这套语料，不是「TS 全语法」。

---

## 7. 复现与回退命令

```powershell
# 0) 环境：本目录（node_modules 已 junction；dist/ + build/ 已从基线复制）
cd C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-5d1b2

# 1) 生成 + 编译（顺序不可省：xl 0 error 仍可能 tsc TS2304）
#    用 DSH 的 xl_build 工具：cwd=本目录, paths=["core","typescript"], targets=["ts"]
node node_modules/typescript/bin/tsc -p tsconfig.json      # 必须 exit 0

# 2) 退场指标（默认 = 逐用例与基线比对）
node tests/statement-possible/legacy-retirement.mjs          # verdict: PASS（78 / 22467 / 292 / 328）
node tests/statement-possible/legacy-retirement.mjs --snippets   # 42 条逐构造（legacy 全 0）
node tests/statement-possible/legacy-retirement.mjs --top=40     # 还剩哪些用例（全部 ambient declare）
node tests/statement-possible/legacy-retirement.mjs --quiet      # 只打总计

# 3) 全门
node typescript/cases/ast-json.mjs && node typescript/cases/ast-json-diff.mjs
node typescript/cases/token-ast.mjs --quiet
node typescript/cases/real-dts-ast.mjs
node tests/statement-possible/harness.mjs --all
node tests/statement-possible/harness.mjs --double-accept
node tests/statement-possible/declaration-statement-takeover.mjs
node tests/statement-possible/final-matrix.mjs
node tests/parse/validate.mjs
node tests/statement-possible/op-ast-proof.mjs
node tests/statement-possible/short-family-boundary.mjs
node tests/statement-possible/ast-kind-names.mjs

# 4) 回退（三选一）
git revert --no-edit $(git rev-list --reverse 49209483..HEAD)   # 回退本步的全部 commit（源码 / 基线 / 文档）
# 或只回退源码与基线（HANDOFF / 计划文档保留）
git revert --no-edit 0fdaae65 277ea014
# 或
git reset --hard 49209483                          # 回到本步起点（会丢掉本步全部改动）
# 回退后必须重跑：xl_build（core+typescript）→ tsc → legacy-retirement（应回到 4471/22467/292/328）
# 说明：判据实现未动，所以回退不需要重建语义；基线文件随它的 commit 一起回退。
```
