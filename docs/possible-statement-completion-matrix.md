# possible-statement：完成度证据矩阵（Stage 5d）

> 对照用户目标的四条，逐条给「已达成 / 部分 / 未达成」+ **可核对**证据（测试名、读数、文件）。
> 基线 `feature/possible-statement` @ **`fa6ecbc1`**；本文件所有读数来自 Stage 5d 分支实跑（见 §6 与
> `docs/possible-statement-final-inventory.md` §7）。
> 纪律：**不把「全表绿」当成「完整重构达成」**。全表绿说明「行为与基线逐位一致」，不说明「legacy 已退场」。

---

## 1. 结论摘要

| # | 用户目标 | 判定 | 一句话理由 |
| --- | --- | --- | --- |
| 1 | 语句体自带 statement-shape，由 `;`/ASI 结束 | **已达成**（覆盖面有边界） | 表达式/变量/控制流/块/标签/空语句/块体语句/子句语句的起点与收口都由 `StatementShape` + `StatementEndPossibleShape` 完成，`;`/EOF/ASI 走 `StatementBoundaryUtil`（唯一判据）；默认态矩阵 38/38 的壳计数与 AST 全等 |
| 2 | `let/const` 等声明有对应 possible | **部分达成** | `let/const/var` 三层 possible 已落地且默认开（`ShellVariable`）；但**声明族**（`interface/type/enum/namespace/module/declare/import/export/using`）语句壳默认关，开档有 2 条组合回归 |
| 3 | 操作符 possible + 优先级插入 shape | **已达成**（3 个边界见 §4） | `op-ast-proof` 90/90、`op-proof` 40/40、`harness operators-live` 40 条全绿；优先级唯一来源 `OperatorTable`（lint 证明），插入用 `ShapeInsertUtil.InsertBetween`（9/9） |
| 4 | 完整重构（legacy 退场） | **未达成** | `StatementBuilder.BuildStatement` 仍是唯一建树者；`ScanRoot` 仍是 `ShellStatementFamily` 的判界器；声明族/块内 class 默认关；逗号/赋值命名/对象方法返回类型/`do b⏎{}` 未修；case 子句有 fallback gap |

---

## 2. 目标一：语句体自带 statement-shape，由 `;`/ASI 结束 —— 已达成

### 2.1 机制证据

| 主张 | 证据（文件 / 读数） |
| --- | --- |
| 语句起点建壳、壳自带「体候选目录 + 终结候选」 | `statement-shape.xl.md`（`BuildFromShell` / `FinishShell` / `DetachShell`）、`statement-end-possible-shape.xl.md`（`ExpressionEndCode` / `CanEndStatement`） |
| `;` / EOF / ASI 判据唯一 | `statement-boundary-util.xl.md:IsAsiBoundary`（`ExpressionStatementPossibleShape` 只留一行委托）；`harness --lint` PASS |
| 收口时壳不进 AST | 每条用例 XML 无 `StatementShape`/`PossibleShape`/`CatalogGuide` 泄漏（探针与矩阵都断言）；`ast-json-diff` 结构差 0 |
| 收口失败安全回退 | `StatementShape.DetachShell`（A 的 token-ast 4 diff 根因修复，保留）；`token-ast crash=0 diff=0` |

### 2.2 覆盖面读数（默认开关，`final-matrix.mjs`）

| 语句族 | 壳/体计数读数 | AST | XML==legacy |
| --- | --- | --- | --- |
| 表达式语句（11 条形态：调用/优先级/条件/赋值/逗号实参/可选链/箭头/async 箭头/类/`import.meta`/动态 `import`） | 无专用计数器（按族只记 XML/AST） | 全等 | 是 |
| 变量声明（简单/列表/解构） | `ShellVariable`（三层计数另见 `variable-statement-three-layer`） | 全等 | 是 |
| 块（单层/嵌套） | `BlockShellCount +1/+2`、`BlockBodyStatementCount +1/+2` | 全等 | 是 |
| 控制流（if/while/for/for-of/try/do/return） | `ControlFlowShellCount +1` 每条；体 `BlockBodyStatementCount +1~+2` | 全等 | 是 |
| 空语句（根 / 块体） | `ControlFlowShellCount +1` / `BlockShell+1, cf+1` | 全等 | 是 |
| 标签 | `LabelShellCount +1` | 全等 | 是 |
| 块体 `await` | `AwaitShellCount +1`、`FunctionBodyMountCount +1` | 全等 | 是 |
| 函数体 / 箭头体 / 对象方法体 | `FunctionBodyMountCount` / `ArrowBodyMountCount` + `BlockBodyStatementCount` | 全等 | 是 |
| switch 子句级（单条/两条/带 case 体） | `SwitchCaseClauseMountCount +1`、`SwitchCaseClauseShellCount +1/+2`、case 体 `SwitchCaseBodyMountCount +1` | 全等 | 是 |

**总计**：`shapeAst=38/38`、`xmlEqLegacy=38/38`、`astEqTS=38/38`、`failed=0`（`HANDOFF-s5d.md` 附录 A）。

### 2.3 这条目标的边界（不能算「全语句」）

1. **声明族不在内**：`EnableDeclarationShell=false` → 根层声明/导入导出仍 `Legacy`（§3）。
2. **块内 `class` 不在内**：`EnableBlockClassShell=false`（开档可验证，但不默认）。
3. **判界≠建树**：壳收口后仍把同一份 raw 切片交给 `StatementBuilder`（§5）。
4. **case 子句有已知缺口**：嵌套 switch 内层子句不接管；两条形态会触发文件级 fallback（`HANDOFF-s4aa` §5）。

---

## 3. 目标二：`let/const` 等声明有对应 possible —— 部分达成

### 3.1 已达成的一半：`let/const/var` 三层

| 层 | 证据 | 读数 |
| --- | --- | --- |
| 语句级（`ShellVariable`） | `variable-statement-possible-shape.xl.md`、路由 `Decide` | `var-simple` / `var-list` / `var-destructure` 三条 AST 全等、XML==legacy |
| 列表级（声明列表与逗号） | `variable-statement-three-layer.xl.md`（`ListCount`） | 原语由三层文件计数；`let a = 1, b = 2;` 全等 |
| 单条声明（`Name`/`!`/`=`/`:`/解构） | 同上（`DeclarationCount`） | `const { a, b: c } = o;` 全等 |

**结论**：用户目标里「let/const 等声明有对应 possible」在**变量声明**上成立，且不是单层而是三层。

### 3.2 未达成的一半：声明族（`interface/type/enum/namespace/module/declare/import/export/using`）

| 项 | 读数 | 证据 |
| --- | --- | --- |
| 默认关 | `EnableDeclarationShell=false`（`statement-route-util.xl.md:250`） | 探针默认档 **27/27 PASS**、`actualDefault=false`、`takeover=0` |
| 开档覆盖 | 27 条里 **25 条接管**（`totalShell=23`，含 0-壳对照）、2 条 KNOWN-GAP | `declaration-statement-takeover.mjs --open`：pass=25 knownGap=2 failed=0 |
| 开档缺陷 1 | `interface I { }` ⏎ `const a = 1;` → decl=2（期望 1），AST range：`InterfaceDeclaration` TS=[0,15) CJ=[0,28) | 探针 `--open` 的 KNOWN-GAP 输出；`HANDOFF-s4r` |
| 开档缺陷 2 | `type T = 1;` ⏎ `enum E { A }` ⏎ `export { T, E };` → decl=2（期望 3），`EnumDeclaration` range 吞到下一句 | 同上 |
| 开档全表 | **未跑**（4aa 已记录：开档态 22-25/27 且 token-ast 4 / real-dts 1 回归） | `HANDOFF-s4aa` §0 目标 4「未做」 |

**判定口径**：这一条不能写成「已达成」——默认态下声明族根本没有 possible 语句壳；开档态还有 2 条组合红与
未跑的全表。**诚实判定：部分。**

---

## 4. 目标三：操作符 possible + 优先级插入 shape —— 已达成（带 3 个边界）

### 4.1 证据

| 主张 | 证据 | 读数 |
| --- | --- | --- |
| 操作符由 possible 候选驱动 | `typescript/tokens/expressions/*-possible-shape.xl.md`（二元/前缀/后缀/赋值/条件/`as`/`satisfies`/调用/成员/new/await/yield…） | `op-ast-proof.mjs` **90/90**；`op-proof.mjs` **40/40**；`harness --all` 的 `operators-live` 全绿 |
| 优先级唯一来源 | `operator-table.xl.md`；`ExpressionBuilder` 三个方法已单行委托 | `harness --lint` PASS：**优先级数字条目=12，只在 `operator-table`**；ASI 实现唯一 |
| 高优先级插进父子之间 | `shape-insert-util.xl.md:InsertBetween`（冻结，不改） | `tests/feas-operator/insert-between.test.mjs` **9/9** |
| 形状树 → AST 一致 | `final-matrix.mjs` 的 `expr-*`（`-a+b*c**d**e`、`x?y:z`、`x=y=1`、`a?.b?.[0]`、`import.meta`、`import("m")`、类/箭头表达式） | `shapeAst=38/38`、`astEqTS=38/38` |
| 分阶段证据 | `HANDOFF-s3*` / s4 系列 | `--all` groups run=8 skipped=3（skip 为 Stage 5 声明体） |

### 4.2 三个边界（因此不能说「操作符全部完成」）

1. **逗号不是形状树**：`a, b;` 仍由 legacy 建 `BinaryExpression`（TS 是 `SequenceExpression`）。
   `expr-comma` 只覆盖调用实参，**未覆盖该路径**（`docs/possible-statement-final-inventory.md` §4）。
2. **赋值形状命名**：`FirstAssignment` vs `EqualsToken`，语句级「AST 全等」门在赋值上必然 DIFF（基线记录，本轮未复核）。
3. **对象方法 + 对象返回类型**：既有缺陷未修（基线记录，本轮未复核）。

---

## 5. 目标四：完整重构 —— 未达成，剩余项逐条

「完整重构」在本项目里的判据应是：**语句/表达式全部由 possible 形状树增量建成，legacy 扫描与整段建树退场**。
当前仍不满足，具体剩余项（按影响排序）：

| # | 剩余项 | 为什么它挡着「完整重构」 | 证据 |
| --- | --- | --- | --- |
| 1 | **`StatementBuilder.BuildStatement` 仍是唯一建树者** | 每个壳收口都调它原子建整条语句；「接管」只发生在判界/挂载/建壳层，不是建树层 | `statement-builder.xl.md:BuildStatement`；`statement-shape.xl.md:BuildFromShell` |
| 2 | **`StatementScanner.ScanRoot` 仍是 `ShellStatementFamily` 的判界器** | 控制流族/块内 class/await/标签体仍用 legacy 扫描判 `;`/`}` 到齐 | `statement-scanner.xl.md:ScanRoot`、`statement-end-possible-shape.xl.md:ComputeByIndex` 的 `0` 分派 |
| 3 | **声明族默认关 + 开档 2 条回归** | `interface/type/enum/namespace/module/declare/import/export/using` 未接管；开档有双建壳与 enum 退化 | 探针 `--open` KNOWN-GAP 2；`HANDOFF-s4r`/`s4aa` |
| 4 | **块内 `class` 默认关** | 块内 class 不建壳（树对、接管少）；开档全表未跑 | `statement-route-util.xl.md:297`；`final-matrix --class` |
| 5 | **声明体语句不由壳驱动** | 类/命名空间/枚举体的语句仍走既有体指南与 `StatementBuilder` 递归 | `typescript/tokens/declarations/*`、`body-guide-util.xl.md` |
| 6 | **逗号 / 赋值命名 / 对象方法返回类型 / `do b⏎{}` / `()=>1⏎{}`** | 表达式与边界形态的既有缺陷，形状树未覆盖 | 基线记录（本轮未复核，明确标「未复核」） |
| 7 | **case 子句 gap** | 嵌套 switch 内层不接管；`case 1: if(x){y;} b;` 与 `case 1: ; case 2: ;` 触发文件级 fallback | `HANDOFF-s4aa` §5.1-5.3；`final-matrix` `clause-nested-known-gap` |
| 8 | **switch 子句双开关未合并** | 只开一处 = 假空转（mount=0 / shell=0） | `statement-route-util.xl.md:270` / `block-possible-shape.xl.md:633` |

> 「全表绿」的正确读法：**行为与基线逐位一致**（ast-json 6167/6167、token-ast 1716/1706/0/0/10、real-dts 226/226），
> 它证明的是「新路径没有改变结果」，**不证明**「legacy 已退场」。第 1/2 项就是两者的分界线。

---

## 6. 本轮读数总表（Stage 5d，默认态）

| # | 门 | exit | 读数 |
| --- | --- | --- | --- |
| 1 | `xl_build` | 0 | 51 written / 841 skipped / 0 error |
| 2 | `tsc -p tsconfig.json` | 0 | — |
| 3 | `harness --all` | 0 | pass=101 fail=0 known=1；fallback 0；double-accept 0 |
| 4 | `harness --double-accept` | 0 | 冲突 0；cases=120 failed=0 |
| 5 | `harness --lint` | 0 | PASS |
| 6 | `declaration-statement-takeover`（默认） | 0 | 27/27；decl=0 |
| 7 | `declaration-statement-takeover --open` | 0 | pass=25 knownGap=2 failed=0；takeover=21 |
| 8 | `final-matrix` / `--decl` / `--class` | 0 / 0 / 0 | 38/38 shapeAst；xmlEqLegacy 38/38；astEqTS 38/38 |
| 9 | `ast-json` / `ast-json-diff` | 0 / 0 | 6167/6167；0/0/0 |
| 10 | `token-ast` | 0 | 1716/1706、crash=0、diff=0、ts-invalid=10 |
| 11 | `real-dts` | 0 | 226/226 |

未跑（预算）：`harness` 的 `stage4w/stage4aa/stage4s` 分组单独重跑、`cf-body-takeover` 等专用探针、
`tests/parse/validate.mjs`、`feas-operator` 两项、`perf`。这些在 `HANDOFF-s4aa.md` §4 有上一轮读数，
本轮**未新增独立证据**，不在本文件里当成新读数引用。
