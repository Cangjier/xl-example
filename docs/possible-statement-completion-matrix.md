# possible-statement：完成度证据矩阵（Stage 5d 收尾）

> 对照用户目标的四条，逐条给「已达成 / 部分 / 未达成」+ **可核对**证据（测试名、读数、文件）。
> 基线 `feature/possible-statement` @ **`fa3d32af`**（转正 + gap 清零 + Stage 5d 全部合并）；本文件读数来自
> **Stage 5d-10b 最终树**实跑（`HANDOFF-5d10b.md` §5 有同一批命令），并与 `legacy-retirement.mjs` 的
> 官方基线 `0 / 46 / 4 / 2 / 2 / 4` 对齐。
> 纪律：**不把「全表绿」当成「完整重构达成」**。全表绿说明「行为与基线逐位一致」，不说明「legacy 已退场」；
> 目标四的判定看的是**退场指标**（§5），不是全表绿。

---

## 1. 结论摘要

| # | 用户目标 | 判定 | 一句话理由 |
| --- | --- | --- | --- |
| 1 | 语句体自带 statement-shape，由 `;`/ASI 结束 | **已达成**（覆盖面有边界） | 表达式/变量/控制流/块/标签/空语句/块体语句/子句语句的起点与收口都由 `StatementShape` + `StatementEndPossibleShape` 完成，`;`/EOF/ASI 走 `StatementBoundaryUtil`（唯一判据）；默认态矩阵 38/38 的壳计数与 AST 全等 |
| 2 | `let/const` 等声明有对应 possible | **已达成** | `let/const/var` 三层 possible 默认开（`ShellVariable`）；**声明族**（`interface/type/enum/namespace/module/declare/import/export/using`）语句壳 5d 起也默认开：`declaration-statement-takeover` **33/33**（takeover=27、knownGap=0）、`declaration-shell-boundary` **74/74** |
| 3 | 操作符 possible + 优先级插入 shape | **已达成**（3 个边界见 §4） | `op-ast-proof` **94/94**、`op-proof` 40/40、`harness operators-live` 全绿；优先级唯一来源 `OperatorTable`（lint 证明），插入用 `ShapeInsertUtil.InsertBetween`（9/9） |
| 4 | 完整重构（legacy 退场） | **已达成**（残余 4/2/4 见 §5） | legacy 派发 **0**；默认态 `ScanRoot` **0**（6300 用例，`root-retirement`）；根 legacy 语句候选默认目录里已不注册；`ScanRoot` 仅剩 **46** 次，全部来自 4 个文件级 fallback 的 legacy 重解析；RawTail 4 / Declined 2 / FileFallback 4 逐条留档 |

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

1. **建树仍经 `StatementBuilder`**：壳负责判界 / 挂载 / 搬单元，收口时把这段 raw 交给 `StatementBuilder`
   原子建树（§5）。这是「判界层退场」，不是「建树层重写」。
2. **残余 4 条 RawTail / 2 条 Declined / 4 个文件级 fallback**：逐条登记在 §5，且都在
   `legacy-retirement.mjs` 的基线里可见（`--top=40`）。
3. **case 子句有一个已知缺口**：嵌套 switch 内层子句不接管（`final-matrix` 的 `knownGap=1`，
   `clause-nested-known-gap`），XML/AST 仍与 legacy 一致。
4. **`yield` / `await` / `return` 等族的「族判定」在 `StatementBoundaryUtil`**，但根层 `yield` 的建树仍是
   legacy 原子建（`Decide` 判 `Legacy`），块内走壳——同一族两条通道，行为逐位一致。

---

## 3. 目标二：`let/const` 等声明有对应 possible —— 部分达成

### 3.1 已达成的一半：`let/const/var` 三层

| 层 | 证据 | 读数 |
| --- | --- | --- |
| 语句级（`ShellVariable`） | `variable-statement-possible-shape.xl.md`、路由 `Decide` | `var-simple` / `var-list` / `var-destructure` 三条 AST 全等、XML==legacy |
| 列表级（声明列表与逗号） | `variable-statement-three-layer.xl.md`（`ListCount`） | 原语由三层文件计数；`let a = 1, b = 2;` 全等 |
| 单条声明（`Name`/`!`/`=`/`:`/解构） | 同上（`DeclarationCount`） | `const { a, b: c } = o;` 全等 |

**结论**：用户目标里「let/const 等声明有对应 possible」在**变量声明**上成立，且不是单层而是三层。

### 3.2 声明族（`interface/type/enum/namespace/module/declare/import/export/using`）—— Stage 5d 起已达成

| 项 | 读数 | 证据 |
| --- | --- | --- |
| 默认态 | `EnableDeclarationShell=true`（`statement-route-util.xl.md`） | `declaration-statement-takeover.mjs`：**33/33**、takeover=27、knownGap=0、`actualDefault=true` |
| 判界 | 声明壳的 `;` / EOF / ASI / 声明跟随边界 / 体括号 / 类型别名跨行切分，全部读 `StatementBoundaryUtil` 一份实现 | `declaration-shell-boundary.mjs` **74/74**（migrated=55、counterfactualSensitive=55）；`eof-last-token-close` 13/13、`export-no-semicolon-eof` 13/13、`declaration-shell-call-position` 24/24 |
| 建树 | 壳收口后仍交 `StatementBuilder`（§5 的同一句读法） | `final-matrix` 38/38；ast-json 6171/6171 |
| 4af-a 之后 | 原「开档 2 条组合回归」（`interface I {}` ⏎ `const`、`type T = 1;` ⏎ `enum` ⏎ `export`）已随声明跟随边界 / 体括号判据修掉 | `declaration-shell-boundary` 的 `interface-then-const` / `type-enum-export` 用例全绿 |

**判定口径**：目标二在「变量声明三层 + 声明族语句壳默认接管」两半上都已达成；残余只剩 §5 的 4/2/4 台账。

---

## 4. 目标三：操作符 possible + 优先级插入 shape —— 已达成（带 3 个边界）

### 4.1 证据

| 主张 | 证据 | 读数 |
| --- | --- | --- |
| 操作符由 possible 候选驱动 | `typescript/tokens/expressions/*-possible-shape.xl.md`（二元/前缀/后缀/赋值/条件/`as`/`satisfies`/调用/成员/new/await/yield…） | `op-ast-proof.mjs` **94/94**；`op-proof.mjs` **40/40**；`harness --all` 的 `operators-live` 全绿 |
| 优先级唯一来源 | `operator-table.xl.md`；`ExpressionBuilder` 三个方法已单行委托 | `harness --lint` PASS：**优先级数字条目=12，只在 `operator-table`**；ASI 实现唯一 |
| 高优先级插进父子之间 | `shape-insert-util.xl.md:InsertBetween`（冻结，不改） | `tests/feas-operator/insert-between.test.mjs` **9/9** |
| 形状树 → AST 一致 | `final-matrix.mjs` 的 `expr-*`（`-a+b*c**d**e`、`x?y:z`、`x=y=1`、`a?.b?.[0]`、`import.meta`、`import("m")`、类/箭头表达式） | `shapeAst=38/38`、`astEqTS=38/38` |
| 分阶段证据 | `HANDOFF-s3*` / s4 系列 | `--all` groups run=8 skipped=3（skip 为 Stage 5 声明体） |

### 4.2 三个边界（因此不能说「操作符全部完成」）

1. **逗号（已修，保留为边界说明）**：`S3n` 起 `(a, b);` / `f((a, b));` 由形状树建
   （`op-ast-proof` 的 `s3n-comma-paren` / `s3n-comma-nested-call` 全绿，形状文本 `(a,b)` / `call(f)`）；
   这条边界从 5d 起不再成立，留着是为了记住它曾经是边界。
2. **赋值形状命名**：`FirstAssignment` vs `EqualsToken`——`final-matrix` 的 `x=y=1` 已 astEqTS，
   但「节点 kind 名」这一层的口径仍以 `ast-kind-names.mjs` 为准（**PASS**：`= / += / ^= / ,` 四类硬断言）。
3. **case 子句 / 声明族成员体的残余**：见 §5 的 RawTail 4（其中之一是「装饰器成员 + 条件类型返回类型」
   的方法体 `{` 没挂上体目录）。

---

## 5. 目标四：完整重构 —— 已达成（残余 4/2/4 台账在下面）

「完整重构」在本项目里的判据是：**legacy 派发与根 legacy 语句候选退场，`ScanRoot` 不再参与默认解析的判界，
剩余 legacy 只出现在文件级 fallback 与登记在册的残余形态上**。Stage 5d 收尾读数（`legacy-retirement.mjs`
官方基线 `0 / 46 / 4 / 2 / 2 / 4`，`HANDOFF-5d10b.md` §5）：

| 指标 | 读数 | 读法 |
| --- | --- | --- |
| `LegacyStatementDispatch` | **0** | 默认解析里没有任何语句走 `StatementRoute.Legacy` 的派发 |
| `ScanRootCalls` | **46** | 全部来自 **4 个文件级 fallback** 的 legacy 重解析；默认态全语料 **0** 次（`root-retirement`：6300 用例） |
| `RawTailBuildCount` | **4** | 4 个文件的段尾仍由 legacy 逐条建（3 族，见下） |
| `ShapeAstDeclined` | **2** | 形状树拒绝、退回 `StatementBuilder` 的 2 条（见下） |
| `FileFallbackCount` | **4** | 文件级 fallback 4 个文件（原因聚类在 `file-fallback-attribution.mjs` 台账内） |

**根 legacy 候选退场**：默认目录不再注册 `StatementPossibleShape`；false 态（`ParseCore(..., false)`）逐位
仍是「默认目录 + 在原第 4 位插回根候选」，11 个用例逐节点 AST 与默认态一致、`ScanRoot` 69 次、永不兜底
（`root-retirement.mjs` PASS）。

**残余逐条**（全部在 `legacy-retirement.mjs --json` 的 `perFile` 里可查，没有假绿）：

| 类 | 数 | 文件 / 形态 | 根因（仍待做） |
| --- | --- | --- | --- |
| RawTail | 1 | `stmt-asi-return-newline-object.ts` | `return` 受限产生式之后的裸块目录归属 |
| RawTail | 1 | `stmt-r1235-bare-block-tail.ts` | 语句位裸块之后的尾巴重放 |
| RawTail | 1 | `type-combination-adversarial.ts` | 装饰器成员 + 条件类型返回类型的方法体 `{` |
| RawTail | 1 | `module-blocks.ts:L9` | 模块体括号没有语句目录 |
| Declined | 1 | `expression.ts:L107`（`new new A()()`） | `KindNew` 整格委派 `ParseNew()`，形状树覆盖区间不足 |
| Declined | 1 | `expression.ts:L704` | 箭头参数表带类型标注 + 返回类型谓词（需 `KindParams`） |
| FileFallback | 4 | `type-fn-return-typeliteral.ts` / `gap-r1244-ctor-signature-generic-return-type.ts` / `dts-types.ts:L68` / `types.ts:L430` | 函数 / 构造签名返回类型字面量的 `{` 归属（块目录抢在类型位之前） |

**「全表绿」的正确读法**：它证明「新路径没有改变结果」；目标四的判定靠的是上表的**退场指标**。两者都对，
但说的不是同一件事——`StatementBuilder` 仍是建树者（判界层退场，不是建树层重写），这一条如实留在
`docs/possible-statement-final-inventory.md` 与 `HANDOFF-5d10b.md`。

---

## 6. 最终读数总表（Stage 5d-10b，默认态，`HANDOFF-5d10b.md` §5 同源）

| # | 门 | exit | 读数 |
| --- | --- | --- | --- |
| 1 | `xl_build`（core+typescript → ts） | 0 | 2 written / 892 skipped / 0 error |
| 2 | `tsc -p tsconfig.json` | 0 | — |
| 3 | `harness --all` | 0 | **pass=102 fail=0 known=0**；fallback 0；double-accept 0 |
| 4 | `harness --double-accept` | 0 | 冲突 0；cases=120 failed=0 |
| 5 | `declaration-statement-takeover`（默认） | 0 | **33/33**；takeover=27、knownGap=0、decl=0 |
| 6 | `final-matrix` | 0 | shapeAst 38/38、xmlEqLegacy 38/38、astEqTS 38/38（knownGap=1 既有 `clause-nested-known-gap`） |
| 7 | `ast-json` / `ast-json-diff` | 0 / 0 | **6171/6171**；结构差 0 / 位置差 0 / 字段差 0 |
| 8 | `token-ast --quiet` | 0 | total=1716 **ok=1706**、crash=0、diff=0、ts-invalid=10、known-gap=0 |
| 9 | `real-dts` | 0 | **226/226**，崩溃 0、差异 0 |
| 10 | `validate` | 0 | **1720 条 / 0 条不合格** |
| 11 | `op-ast-proof` / `op-proof` | 0 / 0 | **94/94** / **40/40** |
| 12 | `ast-kind-names` | 0 | **PASS**（live 5/5、self-test 4/4、fixtures 47、运算符节点 262、fail=0） |
| 13 | `shape-ast-coverage` | 0 | cases=50 pass=46 known=4 fail=0 |
| 14 | `legacy-retirement` / `root-retirement` / `raw-tail` / `file-fallback` | 0 / 0 / 0 / 0 | 0/46/4/2/2/4 与基线逐用例一致；默认态 ScanRoot=0；RawTail 3 族 4 次；fallback 4 ≤ 13 台账内 |
| 15 | 5d 家族探针（short/cf/decl-shell/cf-takeover/block/dec/eof/export-eof/callpos/import/comma/tail-residual/yield） | 全 0 | 46/46、85/85（knownGap=1）、74/74、46/0、21/0、14/14、13/13、13/13、24/24、9/9、16/16、24/24、**56/56**（正对照已按 5d-10b 语义更新） |
| 16 | `gap-edge2`（`--file=gap-edge2-cases.json`） | 0 | **pass=46 fail=0 known=7**（合法组 45/45，含本轮新增的 `module` / `namespace` 跨行 3 条） |

`git status --porcelain typescript/cases` 在 `ast-json` / `ast-json-diff` 之后为空（产物已 checkout）。
