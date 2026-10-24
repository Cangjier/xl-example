# HANDOFF — Stage 4c：控制流 / 声明族语句壳化

分支：`feature/possible-statement-s4c`（从 `origin/feature/possible-statement` @ `35379fd4` 切出）
基线：Stage 4b（变量 / 表达式 / 块三种壳、块体目录 `EnableBlockBodyCatalog=true`）

## 1. 完成度

| 项 | 结果 |
|---|---|
| 通用控制流壳 | `ControlFlowStatementPossibleShape`（单一候选 + `StatementRoute.ShellStatementFamily` 分族） |
| 根目录 | `SourceFileShape.CreatePossibleShapes` 注册 |
| 块体目录 | `BlockPossibleShape.CreateBodyPossibleShapes` 注册（块内控制流同样建壳、由 `CollectBodyStatements` 收集） |
| 判界 | 壳的终结候选 `StatementEndPossibleShape`（`StatementKind = ShellStatementFamily`）复用 `StatementScanner.ScanRoot` |
| 建树 | `StatementShape.BuildFromShell` → `StatementBuilder.BuildStatement`，与 legacy 同一建造器 / 同一段 raw 单元 / 同一 `Pos` 口径 |
| 覆盖族 | `if` / `else`（作为 if 的一部分）/ `while` / `do-while` / `for` / `for-in` / `for-of` / `switch` / `try` / `catch` / `finally` / `with` / `return` / `throw` / `break` / `continue` / `debugger`（`else`/`catch`/`finally` 不做语句首起点，见 §6） |
| 未接管（安全回退） | 标签、空语句（两个默认关的开关）、声明族/导入导出族、块内嵌套块、函数/类体内部（见 §6） |
| 全表 | 见 §5，全部绿 |

## 2. 通用壳设计（一个候选，不做一族一个）

新增 `typescript/tokens/statements/control-flow-statement-possible-shape.xl.md`：

1. `ComputeByIndex`：只在**首代码单元那一格** `Accept`，判据只有 `StatementRouteUtil.Decide() ===
   StatementRoute.ShellStatementFamily` 一处（不写第二份关键字表）。
2. `BuildByIndex`：与 `VariableStatementPossibleShape` / `BlockPossibleShape` **逐字同构**——搬 raw 单元、
   `Pos` 取「前一个非 trivia 单元 `EndIndex`」（块体宿主 `{` 的首句取 `StartIndex + 1`）、原位插回
   `StatementShape`、`Parent` / `MountedUnit` 显式设置、`Kind = ShellStatementFamily`、
   终结候选 `StatementEndPossibleShape` 且 `StatementKind = ShellStatementFamily`（→ `ScanRoot` 分支）。
3. 计数：`StatementRouteUtil.ControlFlowShellCount`（只增不减），接管证据不靠 XML/AST 猜。

路由（`statement-route-util.xl.md`）：

- 新增 `StatementRouteUtil.IsControlFlowHead(text)`（12 个能起一条语句的控制流关键字）；
- `DecideCommon` 在 `let/const/var` 之后、`IsLegacyKeyword` 之前分流；
- 新开关 `EnableControlFlowShell = true`、`EnableControlFlowLabel = false`、`EnableControlFlowEmpty = false`；
- **熔断**：`EnableShellExpressions == false`（文件级 fallback 与 harness 的 legacy 对拍）时全部重新判成
  `Legacy`，行为逐位回到 Stage 4b 之前；
- 互斥：`StatementPossibleShape` 原本就对「非 Legacy 且非 None」路由 `Reject`，本候选只接
  `ShellStatementFamily`，两边永不同格 `Accept`（`--double-accept` 冲突 0）。

## 3. 覆盖族与块内控制流

- 根层与块体目录共用同一个候选；块内 `if/while/for/switch/try/...` 建壳后由
  `StatementBuilder.CollectBodyStatements` 按序收集（`BlockBodyStatementCount` 增加）。
- 块内混合（表达式 + 变量 + 控制流）由收集器按序处理，已建形状与 raw 段交替，`Pos` 口径与 legacy
  `BuildBlock` 一致。
- 块内未覆盖构造（嵌套块、`;`、声明族）仍是 raw 段，交回 legacy 递归；`BlockBodyWaitingPossibleShape`
  保证目录不会「无候选」。

## 4. 本轮修掉的两个真实缺陷（都不是新壳的「预期行为」）

1. **`FinishShell` 的 leftover 没有重放**：`statement-shape.xl.md` 的文档说有重放，代码里没有
   （`LeftoverReplayCount` 从未自增）。ASI 边界留在壳里的下一条语句起点，在 EOF 时没人建
   （`throw` ⏎ `a` 的 `a`）。
2. **EOF 收口一律消费到 `lastCode`**：受限产生式 ASI（`throw` / `debugger` / `if (a) b` ⏎ `c`）在壳里
   留的是**两条语句**，`BuildStatement` 读到第二条就 `At !== Units.length` 抛错 → 拆壳 → 根终结候选
   只建回第一条。
   修法：`StatementShape.TryToClose` 与 `StatementEndPossibleShape.BuildByIndex` 的 EOF 分支，对
   **非表达式族壳**先用 `StatementScanner.ScanRoot` 求 `End`，只消费到那里，剩下的单元由
   `FinishShell` 退回父单元、再按原有 EOF 路径建。表达式族（`ShellPlainExpression`）行为逐位不变。

这两处修完：`ast-json` 的 `dts-recovery`（`throw\na` / `throw\na;`）恢复 6167/6167，
`token-ast` 恢复 1706/0/0/0/10。

## 5. 专用 cases 与全表读数

### 专用 cases

- `tests/statement-possible/control-flow-cases.json` — `stage4c` 组 **42 条**：
  12 个关键字族 + 嵌套 + 注释 + ASI（含 `throw\na` / `debugger\nf` / `if (a) b\nc` 三个 EOF 变体）+
  块内含控制流 + 块内混合 + 标签正确性。断言：XML == legacy（逐字节）、AST == `ts.createSourceFile`
  （逐节点）、两次解析确定性、形状树无壳泄漏。
- `tests/statement-possible/control-flow-takeover.mjs` — **20 条**接管证明：默认开关为 true、
  无文件级 fallback、`ControlFlowShellCount` 增量逐条对账、块内样例 `BlockBodyStatementCount` 增量、
  XML == legacy、AST == TS、确定性。
- `block-body-takeover.mjs` 的 4 条期望按新事实更新（块内控制流现在真的被接管了）：
  `{ if (a) b; }` body 0→1、`{ ; }` 0→1（后因空语句回到 legacy 又改回 0）、
  `{ if (a) b; while (c) d; }` 0→2、`{ a; if (b) c; d; }` 1→3。

### 全表（最终一轮）

```
xl_build            887 written / 0 error（新增 1 个 .xl.md）
tsc                 0
validate            1720 条，0 不合格
ast-json            6167/6167（cj-ok）；重生成后 git status 空；diff 6167/6167 完全一致（0/0/0）
token-ast           1716 / ok 1706 / crash 0 / diff 0 / ts-invalid 10
real-dts            226/226 解析成功、AST 全一致
harness --all       101 pass / 0 fail / 1 known / 0 uncovered；double-accept 0；lint PASS
stage4c             42/42
stage4-block        12/12
stage4b             17/17
block-body-takeover 17/17
control-flow-takeover 20/20
dev                 22/22
operators-live      40/40
op-ast-proof        62/62
op-proof            40/40
feas-operator       6/6；insert-between 9/9
perf                long 5.63ms（基线 6.57）；many 28.73ms（基线 30.50）；scale ratio 1.96 / 2.14
```

## 6. 未覆盖清单（全部有安全回退，不是失败）

| 构造 | 现状 | 理由 |
|---|---|---|
| `function` / `class` / `interface` / `enum` / `namespace` / `module` / `type` / `declare` / `abstract` / `using` / 装饰器 / `async` | 完全 legacy | 声明族与导入导出族，各自的 legacy 候选已接管；Stage 4c 不动 |
| `import` / `export` 及其变体 | 完全 legacy | 同上 |
| 标签语句 `lbl: stmt` | 走表达式壳（`BuildStatement` 的标签分派），XML/AST 正确 | 壳在首代码单元建，`:` 还没到，lookahead 不确定；`EnableControlFlowLabel=false`。`s4c-label` / `s4c-label-loop` 守正确性，不声称接管 |
| 空语句 `;` | legacy `StatementPossibleShape` → `BuildEmpty` | 重放回来的 `;` 会因旧 `ItemStart` 失管（实测少一条 `EmptyStatement`）；壳建与 legacy 建是同一个 `BuildEmpty`，收益为零。`EnableControlFlowEmpty=false` |
| `else` / `catch` / `finally` / `case` / `default` 作为语句首 | legacy / 文件级 fallback | 只能出现在上一条语句内部，语句首出现即非法输入 |
| 函数 / 方法 / 构造器体里的控制流 | 仍由各自的声明形状递归建（legacy 路径） | 那些体不是块体目录的宿主，本阶段不挂 |
| 块体内的嵌套块 `{ {...} }` | raw（块体目录无 `BlockPossibleShape`） | 收起在 Stage 4a 的范围之外，保持 legacy |
| `for await` | 随 `for` 接管，但只在能到达本候选的位置（根 / 块体目录） | 函数体里的 `for await` 走 legacy |

## 7. 风险

1. **`FinishShell` 的 leftover 仍然没有通用重放**：本轮用「EOF 前用 `ScanRoot` 切分」绕开了实际出现的
   两类（`throw` / `debugger` / 无分号 if），但 `LeftoverReplayCount` 仍是 0、文档与代码不一致。
   后续任何在壳里留下**新语句起点**的族都可能再撞上；建议 Stage 4d 把重放真正实现（`ItemStart`
   在 `FinishShell` 后已经指向 leftover，补一次父目录求值即可）。
2. **`TryToClose` 的切分依赖 `ScanRoot` 在 EOF 给出 `Status == 1`**：给不出时退回 `lastCode`（旧行为），
   仍可能拆壳后只建回第一条；这类输入会走文件级 fallback，AST 与 legacy 一致但会记一次 fallback。
3. **块体目录里的控制流壳**：`ExitOrPre`（块末句在 `}` 前收口）仍用 `lastCode`，未做 `ScanRoot` 切分；
   目前只有「块内最后一条控制流语句没有 `;`」会走到，实测 17 条块体用例全绿，但没有专门覆盖
   `{ if (a) b }` 之外的复杂形态。
4. **开关默认值**：`EnableControlFlowShell=true` 是默认接管；出问题时可只关它（单开关，`Decide`
   立即回到 `Legacy`，行为逐位回到 Stage 4b）。
5. `xl_build` 的 2510 条 warning 是基线既有（缺描述），本轮未新增/未减少。

## 8. 文件

新增：

- `typescript/tokens/statements/control-flow-statement-possible-shape.xl.md`
- `tests/statement-possible/control-flow-cases.json`
- `tests/statement-possible/control-flow-takeover.mjs`

修改：

- `typescript/tokens/statements/statement-route-util.xl.md`（路由值、开关、计数、关键字集）
- `typescript/tokens/statements/block-possible-shape.xl.md`（块体目录挂载）
- `typescript/tokens/files/source-file-shape.xl.md`（根目录注册）
- `typescript/tokens/statements/statement-shape.xl.md`（EOF 切分；`StatementScanner` 依赖）
- `typescript/tokens/statements/statement-end-possible-shape.xl.md`（EOF 分支按 `ScanRoot` 求 `End`）
- `tests/statement-possible/block-body-takeover.mjs`（4 条期望随接管事实更新）
