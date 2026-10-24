# HANDOFF — Stage 4e：嵌套块内层接管 / 陈旧注释 / 标签根因收口

分支：`feature/possible-statement-s4e`，基线 `origin/feature/possible-statement` @ `92581fe6`。

## 1. 完成度

| 项 | 结果 |
|---|---|
| 1 标签壳接管（重开 `EnableControlFlowLabel=true`） | **未完成，开关保持 `false`**。根因已定位（§3）：`DecideCommon` 在第二代码单元未到时返回 `None`，而表达式根候选在头格对非 `ShellPlainExpression` 直接 `Reject`（被 `CatalogGuide` 永久删除）→ 晚建壳通道到不了 → op-ast-proof 11/62。修复需改表达式候选/终结候选的建壳时机，本轮预算内无安全方案，**不伪造绿**。标签继续走 4c 已验收的表达式壳：XML/AST 正确、`label=0`。 |
| 2 嵌套块内层 | **部分完成（深度 1）**：块体目录加入 `BlockPossibleShape`，内层 `{` 建壳并由外层 `CollectBodyStatements` 收集。`{ { a; } }` = 2 壳 / 1 条收集，XML==legacy、AST==TS、无 fallback。第 3 层起内层块仍 legacy（`{ { { a; } } }` = 2 壳），内层块体里的语句仍走 legacy raw 递归（body 计数 0）。证据与边界见 §2、§4，用例见 `block-body-takeover.mjs`。 |
| 3 函数 / 方法 / 构造器体 | **未做**：`BodyGuideUtil` 仍只挂成员目录；需新建「语句体目录 + `CollectBodyStatements`」通路，风险高，全部安全回退 legacy。 |
| 4 陈旧注释 | **已修**：`control-flow-statement-possible-shape.xl.md:35`（空语句默认开）、`statement-route-util.xl.md:311`（`;` 默认归壳）、`tests/statement-possible/control-flow-takeover.mjs:53`（空语句已接管）。`route-util` §`EnableControlFlowEmpty` 的历史读数保留为历史。 |
| 5 声明族 / import-export | **未纳入**，保持 legacy（与 4c-2/4d 同）；`s4c2-fallback-*`、ast-json、token-ast 全绿证明不吞不错树。 |
| 6 专用 cases + 集成收敛 | 完成：`block-body-takeover.mjs` 扩到 21 条（改 1、新增 4 条嵌套块读数），全表见 §4。 |
| 7 全表 | 全绿（§4），四步 ast-json 严格。 |

## 2. 嵌套块修法（一行 + 测试）

`BlockPossibleShape.CreateBodyPossibleShapes()` 的工厂从

```ts
() => [new VariableStatementPossibleShape(), new RootExpressionStatementPossibleShape(), new ControlFlowStatementPossibleShape()]
```

改为在末尾追加 `new BlockPossibleShape()`。其余机制全部复用、**没有新判据**：

- 内层 `{` 与外层块语句走同一个 `StatementRouteUtil.Decide`（`ShellBlock`），只是宿主从 `SourceFileShape` 换成外层块体 `{` 括号；
- 内层壳的体括号同样由 `BlockPossibleShape.BuildByIndex` 挂块体目录（`EnableBlockBodyCatalog`）；
- 内层壳在 `}` 闭合时由 `StatementShape.TryToClose` 的括号分支收口，外层块在 `CollectBodyStatements` 里按序收到内层 `BlockShape`；
- 候选实例无状态（判定状态在 `CatalogGuide.PossibleShapesComputeCache`），工厂里不调用 `CreateBodyPossibleShapes()`，因此不会递归建目录；目录仍只建一份。

**深度边界（实测）**：

| 源码 | 壳数 | 块体收集数 | XML/AST |
|---|---|---|---|
| `{ { a; } }` | 2 | 1（外层收到内层块） | 一致 |
| `{ { let x = 1; } }` | 2 | 1 | 一致 |
| `{ { { a; } } }` | 2（第 3 层未建壳） | 1 | 一致 |
| `{ { a; } b; }` | 2 | 2 | 一致 |
| `{ { f(); } { g(); } }` | 3 | 2 | 一致 |

内层块体（第二层 `{` 里的语句）没有被块体目录接管：字符按 `宿主括号 → 块壳 → 内层括号` 两级 `MountedUnit` 路由，内层括号的 `CatalogGuide` 在这一层没有拿到语句起点；内层块收口时 `HasBuiltBodyStatements` 为假，`BuildBlock` 走 legacy raw 递归。AST/XML 因此与 legacy 逐字节一致，计数只反映外层收集。**这是已知边界，不是错误树。**

## 3. 标签根因（为什么本轮没重开）

`EnableControlFlowLabel=true` 时 `DecideCommon` 对「语句首 ident + 第二代码单元未到」返回 `None`（等 `:`，4c-2 的设计）。问题在表达式根候选：

- `RootExpressionStatementPossibleShape.ComputeByIndex` 在**头格**要求 `Decide === ShellPlainExpression`，否则 `Reject`；
- `CatalogGuide` 把 `Reject` 的候选**永久删除**，于是头格被删后，晚建壳通道（`tokenIndex > headAt` 那段「头格被上一条语句吞掉」的补建）永远轮不到；
- 典型受影响形态是「单标识符/首个运算符还没到时头格就求值」的表达式，op-ast-proof 掉到 11/62、op-proof 8/40、block-body 11/17。

两条可行的下一步（都未实施）：

1. **文档级 lookahead**：`Decide` 不只看已到单元，还看 `SourceRange.Document` 里 ident 之后的下一个非空白字符；不是 `:` 就立即判 `ShellPlainExpression`。需要新的字符级 API 与对注释的处理，改 `Decide` 单点但影响面大。
2. **早建表达式壳 + 在 `:` 改判**：头格照旧建表达式壳（`None` 也 Accept），在壳的终结候选里检测「壳内只有 ident + 当前单元是 `:`」时把 `Kind` 改成 `ShellLabel`、换 `ScanRoot` 终结候选并 `LabelShellCount += 1`。需要终结候选在 `ComputeByIndex` 里改壳字段/换目录，是本轮不敢动的状态机改动。

在修好之前 `EnableControlFlowLabel` 保持 `false`（安全回退），标签的 XML/AST 由表达式壳 + 建造器标签分派保证，`control-flow-takeover` 的 7 条标签读数（`cf=0 label=0`）继续守正确性。

## 4. 全表读数（本次改动后）

```
xl_build         887 written / 0 error（2510 warning，基线同量级）
tsc              exit=0
ast-json         6167 / 6167（四步：重生成 → status 0 行 → diff 0 结构差 / 0 位置差 / 0 字段差 → checkout）
token-ast        1716 total / 1706 ok / 0 crash / 0 diff / 10 ts-invalid
real-dts         226 / 226 完全一致
all              101 pass / 0 fail / known 1（stage4/stage5 两个 SKIP 为既定）
double-accept    120 cases / 0 failed（互斥冲突 0）
lint             PASS
op-ast-proof     62/62（形状树 62、TS 逐节点 62）
op-proof         40/40（InsertBetween 38）
takeover         33/33（标签读数 cf=0 label=0，空语句已接管）
block-body       21/21（默认 flag=true；新增嵌套块 5 条）
stage4b          17/17
stage4c          42/42
stage4c2         33/33
stage4-block     12/12
dev              22/22（file-fallback 4 / distinct 2，均为既有 `en:`+enum / `--` 形态，未新增）
operators-live   40/40
validate         1720 / 0
comma-import     11/11
feas-operator    6/6；insert-between 9/9
perf             n=400 median 3.43ms；ratio 200/100=2.08、400/200=2.22（线性，无超线性退化）
```

## 5. 未覆盖清单（全部安全回退 legacy）

| 构造 | 现状 | 下一步 |
|---|---|---|
| 标签 `lbl: stmt` | 表达式壳（XML/AST 正确）；`EnableControlFlowLabel=false` | §3 的两条路线之一；必须先让 op-ast-proof/op-proof 回到 62/62、40/40 |
| 嵌套块第 3 层及更深内层 | 只建到深度 1（内层块壳），更内层 legacy | 需要内层括号 `CatalogGuide` 的二级路由方案（或让块壳把字符继续转发给内层括号） |
| 嵌套块内层块体语句 | 内层块体内容 legacy raw 递归（body 计数 0） | 同上，先解决二级 `MountedUnit` 路由 |
| 函数 / 方法 / 构造器 / 箭头体 | 各自 legacy 递归，XML/AST 零差异 | 新建「语句体目录」挂到函数体 `{`（复用 `OnBracketCreatedEvent` + `CollectBodyStatements`） |
| 声明族 / import-export | 完全 legacy | 与各 `*-end-possible-shape` 对账后再并入 |
| `else`/`catch`/`finally`/`case`/`default` 作语句首 | legacy | 非法输入，不接管 |

## 6. 风险

| id | 风险 | 兜底 |
|---|---|---|
| R1 | 块体目录含 `BlockPossibleShape`，块内出现 `{` 时多一次候选判定（perf 已读数：n=400 median 3.43ms，ratio 线性） | 单点回退：从工厂数组删掉 `new BlockPossibleShape()`，行为回到 92581fe6 |
| R2 | 嵌套块只建到深度 1，深层仍 legacy | 深度 2 起不建壳、XML/AST 与 legacy 一致；用例 `{ { { a; } } }` 固定 2 壳读数 |
| R3 | 标签仍默认关 | 开关与路由代码都在；打开前必须先修 §3 的表达式壳时机，否则 op-ast 回归 |
| R4 | 函数体 / 声明族仍未覆盖 | 全部 legacy，全表 ast-json 6167/6167 守 |

## 7. 文件

修改：
- `typescript/tokens/statements/block-possible-shape.xl.md`（块体目录加入 `BlockPossibleShape` + 设计说明）
- `typescript/tokens/statements/control-flow-statement-possible-shape.xl.md`（空语句默认开 + 标签仍默认关的说明/根因指引）
- `typescript/tokens/statements/statement-route-util.xl.md`（`Decide` 的 `;` 注释）
- `tests/statement-possible/block-body-takeover.mjs`（嵌套块 5 条读数）
- `tests/statement-possible/control-flow-takeover.mjs`（空语句注释）
- `HANDOFF-s4e.md`（本文件）
