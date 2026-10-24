# HANDOFF — Stage 4d：FinishShell leftover 重放 / 空语句接管

分支：`feature/possible-statement-s4d`，基线 `origin/feature/possible-statement` @ `cc15323c`。

## 1. 完成度

| 项 | 结果 |
|---|---|
| 1 FinishShell leftover 重放 | **完成**（`statement-shape.xl.md`：`LeftoverReplayDepth` + 收口后按父目录重判 leftover） |
| 2 `EnableControlFlowEmpty` | **默认打开**；`;` / `;;` / `a;\n;\nb;` / `{ ; }` / `{ ; ; }` 全部由壳接管，计数与 AST 同步 |
| 3 `EnableControlFlowLabel` | **未重开**（保持 `false`）。「推迟一格建壳」的回归（op-ast-proof 11/62）需改表达式候选的建壳通道，本轮预算内未做；F1 注释已改成与默认值一致 |
| 4 嵌套块内层 `{ { a; } }` | **未覆盖**：块体目录候选集不含 `BlockPossibleShape`，内层 `{` 仍 legacy；body=0 / 1 壳，XML/AST 与 legacy 一致 |
| 5 函数 / 方法 / 构造器体 | **未覆盖**：`BodyGuideUtil` 挂的是成员目录，不是语句目录，需新建「语句体目录 + CollectBodyStatements」通路；本轮未动，全部安全回退 legacy |
| 6 声明族 / import-export | **未纳入**，保持 legacy（与 4c-2 同）；`s4c2-fallback-*` / stage4c / ast-json 全绿证明不吞不错树 |
| 7 F1 注释 | **已修**：`control-flow-statement-possible-shape.xl.md:38` 改为「默认关」 |
| 8 专用 cases + 集成收敛 | 空语句读数写进 `control-flow-takeover.mjs`（33 条）与 `block-body-takeover.mjs`（17 条）；全表见 §4 |

## 2. leftover 重放设计（`StatementShape.FinishShell`）

收口仍是三步：原位 `splice` 顶替壳、清 `MountedUnit`、把 leftover 按原顺序插回父单元。第 4 步是新增的**父目录重放**：

- 取收口前的 leftover **快照**（对象数组），逐个非 trivia 单元按它在父单元里的**当前下标** `indexOf` 查；
- `indexOf < 0` 说明这一格已被前一次重放建进某条形状 → 跳过；否则调
  `parent.CatalogGuide.ComputePossibleShapesByIndex(parent, at, context)`，父目录自己决定归谁（根目录 / 块体目录 / 块壳）；
- **不写第二份判据**：重放只把格子送回父目录，接管与否仍由 `Decide` + 候选淘汰决定。

**防递归 / 幂等**：
- `StatementShape.LeftoverReplayDepth`：只有最外层收口重放；重放里建出的壳自己收口时深度 > 0，跳过重放（否则递归）。
- 它跳过的不是「格子」而是「重放动作」：那些格子仍是同一批对象、仍在父单元 `Data` 里，外层快照循环会继续扫到，
  所以既不会漏，也不会重复建（已被消费的 `indexOf < 0`）。
- 重放抛错 = 立即停 + `LeftoverReplayFailed += 1`，交回原有 EOF / 文件级 fallback：重放只增加接管机会，不让本来能过的解析失败。
- `context === null`（legacy 对拍 / 文件级 fallback）或父单元无 `CatalogGuide` 时完全不重放，行为逐位回到基线。

计量：`LeftoverReplayCount`（成功重放的格数）/ `LeftoverReplayFailed`（失败格数），均由 route-util 既有字段承担。

## 3. 空语句证据（`EnableControlFlowEmpty = true`）

| 源码 | 基线（关） | 现在 |
|---|---|---|
| `if (a) {}\n;\nwhile (b) {}\n;` | cf=2，**丢一条 EmptyStatement**（4c-2 §2） | cf=**4**，`EmptyStatement` 数与 TS 相等 |
| `;` / `;;` / `;\n;` | cf=0（legacy BuildEmpty） | cf=1 / 2 / 2，全部壳接管 |
| `a;\n;\nb;` | cf=0（行首 `;` 失管） | cf=1，接管且 AST 不变 |
| `{ ; }` / `{ ; ; }` | 0 / 0，第二格失管 | body=1 / 2，块体目录接管 |

`control-flow-takeover.mjs` 的 7 条空语句读数已按新口径更新（期望值就是上表），XML==legacy、AST==TS 逐条仍然通过。

## 4. 全表读数（本次改动后）

```
xl_build         887 written / 0 error
tsc              exit=0
stage4c2         33/33
stage4c          42/42
stage4b          17/17
stage4-block     12/12
operators-live   40/40
all              101 pass / 0 fail / known 1
double-accept    120 cases / 0 failed（互斥冲突 0）
lint             PASS
op-ast-proof     62/62（形状树 62、TS 逐节点 62）
op-proof         40/40（InsertBetween 38）
takeover         33/33
block-body       17/17
validate         1720 / 0
ast-json         6167 / 6167（四步：status 空、diff 0/0/0，已 checkout）
token-ast        1716 total / 1706 ok / 0 crash / 0 diff / 10 ts-invalid
real-dts         226 / 226 完全一致
feas-operator    6/6；insert-between 9/9
perf             n=400 median 3.54ms；ratio 2.06 / 2.37（线性≈2.0，2.37 接近 2.5 告警线，未退化到超线性）
```

## 5. 未覆盖清单（全部安全回退 legacy）

| 构造 | 现状 | 下一步 |
|---|---|---|
| 标签 `lbl: stmt` | 表达式壳（4c 行为，XML/AST 正确）；`EnableControlFlowLabel=false` | 需「先建表达式壳、`:` 格改标标签」或把首格一并喂给 `OperatorBody`，否则 op-ast-proof 回归 |
| 嵌套块内层 | 外层块 1 壳 / body 0，内层 `{` 由 `BuildBlock` legacy 递归 | 把 `BlockPossibleShape` 加进 `CreateBodyPossibleShapes`，并让块壳收口也走父目录重放 |
| 函数 / 方法 / 构造器体 | 各自 legacy 递归，XML/AST 零差异 | 新建「语句体目录」挂到函数体 `{` 上（复用 `OnBracketCreatedEvent` + `CollectBodyStatements`） |
| 声明族 / import-export | 完全 legacy | 与各 `*-end-possible-shape` 对账后再并入 |
| `else`/`catch`/`finally`/`case`/`default` 作语句首 | legacy | 非法输入，不接管 |

## 6. 风险

| id | 风险 | 兜底 |
|---|---|---|
| R1 | 重放调用父目录可能改变块的候选状态（已用快照 + 深度 + indexOf 幂等；全表 6167 条 ast-json 无差） | 单点回退：删掉 `FinishShell` 末尾重放块，行为回到 cc15323c |
| R2 | 空语句默认打开后，任何「壳吃掉下一格」的构造都依赖重放 | `EnableControlFlowEmpty=false` 单开关即时回退；`s4c2-empty*` 守 XML/AST |
| R3 | 标签仍默认关（F1 注释已一致） | 开关与路由代码都在；打开前必须解决推迟建壳的表达式体回归 |
| R4 | 嵌套块 / 函数体 / 声明族仍未覆盖 | 全部 legacy，`s4c2-fallback-*`、stage4 系列、ast-json 全绿 |

## 7. 文件

修改：
- `typescript/tokens/statements/statement-shape.xl.md`（`LeftoverReplayDepth` + FinishShell 重放与设计说明）
- `typescript/tokens/statements/statement-route-util.xl.md`（`EnableControlFlowEmpty=true` 与证据；旧读数保留为历史）
- `typescript/tokens/statements/control-flow-statement-possible-shape.xl.md`（F1 注释）
- `tests/statement-possible/control-flow-takeover.mjs`（空语句 7 条读数）
- `tests/statement-possible/block-body-takeover.mjs`（`{ ; }` body=1）