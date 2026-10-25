# HANDOFF — Stage 5d（legacy 面盘点 + 完成度证据矩阵 + 探针修复）

分支 `feature/possible-statement-s5d`，基线 `feature/possible-statement` @ **`fa6ecbc1`**。
工作目录 `C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-s5d`（`node_modules` 为 junction）。
**未改任何生产 `.xl.md`，未手改 `dist/`，未改 `StatementBoundaryUtil.IsAsiBoundary`。**

## 0. 结论先行

| 目标 | 状态 | 产物 |
| --- | --- | --- |
| 1. legacy 面盘点（语句级 / 表达式级 / 开关矩阵 / gap 清单） | **已交付** | `docs/possible-statement-final-inventory.md` |
| 2. 完成度证据矩阵（对照用户目标四条） | **已交付** | `docs/possible-statement-completion-matrix.md` |
| 3. 修 declaration 探针（默认关不再红门；`--open` 给开档证据） | **已交付** | `tests/statement-possible/declaration-statement-takeover.mjs` 双模式 |
| 4. 可执行 gate 汇总 | **已交付** | `tests/statement-possible/final-matrix.mjs`（38 条能力矩阵） |
| 5. 全表读数 | **已跑**（主门全跑；专用探针/validate/feas/perf 未跑，见 §5） | §4 |
| 6. 预算 | 9 轮硬顶下完成 1+2+3+4+5 | — |

**核心判断（不夸大）**：`;`/ASI 收口的语句壳**已达成**（默认态 38/38 shapeAst、AST 全等、无 fallback）；
`let/const/var` 三层 possible **已达成**；操作符 possible + 优先级插入 **已达成**；
但**「完整重构」未达成**——`StatementBuilder.BuildStatement` 仍是唯一建树者、`ScanRoot` 仍是
`ShellStatementFamily` 的判界器，声明族与块内 `class` 默认关，逗号/赋值命名/对象方法返回类型等既有缺陷未修。

## 1. 探针修复（目标 3）

### 1.1 问题

`declaration-statement-takeover.mjs` 第 84-90 行硬断言出厂
`EnableDeclarationShell === true`，而基线 ship `false`（`statement-route-util.xl.md:250`，Stage 4r 回退）。
于是该脚本**长期 exit=1**：一条稳定的红门会把真实回归掩盖在「已知失败」里。

### 1.2 改法（只改测试脚本，不改生产代码）

1. **默认模式**（无参数）：先读**实际**默认值（`EnableShellExpressions` / `EnableControlFlowShell` /
   `EnableDeclarationShell` / `DeclarationShellCount`），只断言基础不变量（前两者 true、计数器存在、开关是 bool）
   并打印 `actualDefault`；然后断言**默认态不接管**：每条用例 `DeclarationShellCount` 增量 = 0，
   同时仍断言 XML==legacy、AST==TS、无文件级 fallback、`BlockBodyStatementCount` 增量 = 0。
2. **`--open` 模式**：进程内 `R.EnableDeclarationShell = true`（不改源码、不改产物），断言每条用例的
   接管增量 = 用例声明的 `declarationShells`，其余断言相同。
3. **已知缺陷**：Stage 4r 记录的 2 条组合（`interface I { }` ⏎ `const a = 1;`、
   `type T = 1;` ⏎ `enum E { A }` ⏎ `export { T, E };`）在 `--open` 下只打印
   `KNOWN-GAP` + 实测增量 + 全部问题项，**不计入失败**；默认模式不会触发它们。
   已知缺口用脚本内 `KNOWN_GAP_SOURCES` 常量表达，**未改 `declaration-statement-cases.json`**（测试数据保持原样）。

### 1.3 读数

```
# 默认模式（出厂态）
[declaration-statement-takeover] mode=default actualDefault=false expectedTakeover=false
  cases=27 pass=27 knownGap=0 failed=0 takeover=0 totalShell=0        exit=0

# 开档模式（--open）
[declaration-statement-takeover] mode=open actualDefault=false expectedTakeover=true
  cases=27 pass=25 knownGap=2 failed=0 takeover=21 totalShell=23      exit=0
KNOWN-GAP "interface I { }\nconst a = 1;"  decl=2  gap=Stage 4r 已知组合缺陷
   ~ AST != TS：#0 InterfaceDeclaration range: TS=[0,15) CJ=[0,28)
KNOWN-GAP "type T = 1;\nenum E { A }\nexport { T, E };"  decl=2  gap=Stage 4r 已知组合缺陷
   ~ XML != legacy：第 210 个字符起不同
   ~ AST != TS：#4 EnumDeclaration range: TS=[11,24) CJ=[11,41)
   ~ DeclarationShellCount 增量=2 期望=3（开档接管）
```

**意义**：默认关现在是**可解释的绿**（`decl=0` + AST/XML 全等 + 无 fallback），开档是**有证据的 25/27**，
两条已知红被显式命名而不是消失。

## 2. Gate 汇总脚本（目标 4）

`tests/statement-possible/final-matrix.mjs`：38 条能力用例，一次打印

- **每类的计数增量**：`BlockShellCount` / `BlockBodyStatementCount` / `ControlFlowShellCount` /
  `LabelShellCount` / `AwaitShellCount` / `DeclarationShellCount` / `SwitchCaseClauseMountCount` /
  `SwitchCaseClauseShellCount` / `*BodyMountCount`；
- **shapeAst**：AST 与 `ts.createSourceFile` 逐节点一致的条数（默认 `38/38`）；
- **xmlEqLegacy**：`ToXmlString()` 与 `EnableShellExpressions=false` 档逐字节一致的条数（`38/38`）；
- **开关矩阵**：每个 `Enable*` 的出厂默认 + 本轮覆盖（`--decl` / `--class`）；
- **已知缺口**：`clause-nested-known-gap` 等打印 `KNOWN-GAP`（带原因），不判失败。

参数：`--decl`（声明族开档）、`--class`（块内 class 开档）、`--json`（额外写 `final-matrix.json`）。
退出码：任何 AST/XML/fallback/计数断言失败 → 1。

读数：默认 / `--decl` / `--class` 三档均 `cases=38 shapeAst=38/38 xmlEqLegacy=38/38 astEqTS=38/38 knownGap=2 failed=0`。
（`--class` 档 `knownGap=1`：`block-class` 转为接管。）

## 3. 盘点要点（详见两份文档）

1. **语句级**：8 个 Route 常量里 6 个已有默认打开的实现（`ShellPlainExpression` / `ShellVariable` /
   `ShellStatementFamily` / `ShellBlock` / `ShellLabel` / `ShellDeclarationFamily`），`Legacy` 仍是**声明族默认档**
   与**一切未路由起点**的兜底。
2. **表达式级**：操作数/二元/一元/赋值/条件/`as`/`satisfies`/调用/成员/new/箭头/类表达式/`await`/`yield`/
   `import.meta`/动态 `import` 均由形状树驱动；**逗号（BinaryExpression vs SequenceExpression）、
   赋值形状命名（FirstAssignment vs EqualsToken）、对象方法+对象返回类型、`do b⏎{}`/`()=>1⏎{}` 仍 legacy**。
3. **开关矩阵**：14 个 `Enable*` + `VariableStatementThreeLayer.Enabled`，逐个给默认/作用/回退/证据（inventory §5）。
   唯一结构风险：`EnableSwitchCaseClause` 同名两份（`StatementRouteUtil` 与 `BlockPossibleShape`），必须同开同关。
4. **gap**：11 条，含声明族开档 2 条回归、赋值 DIFF、逗号、块内 class、case 子句 3 条、`do/arrow` 换行、
   对象方法返回类型、声明体语句、`StatementBuilder`/`ScanRoot` 仍是最终裁判、harness known=1。

## 4. 全表读数（默认态）

`xl_build`（paths=`core`,`typescript`，targets=`ts`）：**51 written / 841 skipped / 0 error**（2526 warning 为既有 W3102/W3103）。
产物树从主仓库同步后按指纹增量重写 51 个；**源码未改**（`git status` 只有本轮的 docs/tests）。

| 项 | exit | 读数 |
| --- | --- | --- |
| `tsc -p tsconfig.json` | 0 | — |
| `harness --all` | 0 | groups run=8 skipped=3；cases pass=101 fail=0 known=1 uncovered=0；fallback total=0；double-accept 冲突 0 |
| `harness --double-accept` | 0 | cells=825 candidateCalls=5511 endCalls=822 acceptCells=191；冲突 0；cases=120 failed=0 |
| `harness --lint` | 0 | PASS（ASI 唯一 / 优先级数字表只在 `operator-table`，条目 12） |
| `declaration-statement-takeover`（默认） | 0 | 27/27；decl=0；takeover=0 |
| `declaration-statement-takeover --open` | 0 | pass=25 knownGap=2 failed=0；takeover=21；totalShell=23 |
| `final-matrix` | 0 | 38/38 shapeAst、38/38 xmlEqLegacy、38/38 astEqTS、failed=0 |
| `final-matrix --decl` | 0 | 同上（声明族 3 条 `DeclarationShellCount=+1`） |
| `final-matrix --class` | 0 | 同上（`block-class` cf=+1，knownGap=1） |
| `ast-json` | 0 | 6167/6167，cj-fail=0 |
| `git status typescript/cases` | — | 0 行（等价） |
| `ast-json-diff` | 0 | 6167/6167；结构差 0、位置差 0、字段差 0 |
| `token-ast` | 0 | total=1716 ok=1706 crash=0 diff=0 ts-invalid=10 |
| `real-dts` | 0 | 226 文件 / 成功 226 / 崩溃 0 / AST 全等 226 |

## 5. 未覆盖 / 不伪造

1. **未跑**：`tests/statement-possible/` 下各 Stage 专用探针（`control-flow-body-takeover`、`control-flow-takeover`、
   `block-body-takeover`、`s4j`、`s4l`、`s4y-case-clause-takeover`、`r1-repro` 等）、`stage4b/4c/4c2/4w/4aa/dev`
   分组单独重跑、`tests/parse/validate.mjs`、`tests/feas-operator/*`、`perf.mjs`。它们上一轮读数在
   `HANDOFF-s4aa.md` §4；本轮**没有新增独立证据**，两份文档里也不把这些当成本轮读数。
2. **未复核**：逗号（`a, b;`）、赋值形状命名、对象方法+对象返回类型、`do b⏎{}`、`()=>1⏎{}` —— 这四条在文档里
   标为「基线记录 / 本轮未复核」，没有用推断冒充读数。
3. **块内 class 开档全表未跑**（仅 `final-matrix --class` 38/38）。
4. **声明族开档全表未跑**（仅 27 条专用用例 + `final-matrix --decl`）。
5. 未改 `StatementBoundaryUtil.IsAsiBoundary`、未合并同名双开关、未改 `typescript/cases`（跑完已 checkout）。

## 6. 提交

1. `test(possible-statement): declaration 探针双模式 + final-matrix gate 汇总`
2. `docs(possible-statement): Stage 5d legacy 面盘点 + 完成度证据矩阵`
3. `docs(possible-statement): HANDOFF-s5d（读数/未覆盖）`
