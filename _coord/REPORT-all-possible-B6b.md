# REPORT-all-possible-B6b — 块体 `}` 收尾 + ASI 多语句（收尾 WP）

## 0. 身份与环境

| 项 | 值 |
| --- | --- |
| 任务 | `task-34` — WP-B6b（块体 `}` / ASI 收尾） |
| 分支 | `feat/b6b`（本地，**未 push**） |
| 克隆 | `C:\Users\Admin\Documents\GitHub\xl-example-set\a6-bindings` |
| base | `feat/a6c` @ `40141c57` merge `base-int` = `integration/all-possible` @ `187768ce` |
| commit | 本报告所在 commit（checkpoint） |
| 基线快照 | `tmp/base-b6b.json`（merge 后、改动前 tts 60 条，全绿） |

## 1. 结论

| 项 | 基线 | 完成后 |
| --- | --- | --- |
| `tts` | PASS 60 / FAIL 0 | **PASS 59 / FAIL 0**（1 条迁出） |
| `tts-impl` | PASS 365 / FAIL 0 | **PASS 366 / FAIL 0**（+1） |
| 目标达成 | — | **1 / 8**：`while-block-let-close-brace` |
| 非目标漂移 | — | **0**（diff-report：59 一致 / 1 允许 / 0 不允许 → PASS） |
| `xl_build` | — | **0 error** / 3 既有 warning |
| `tsc -p .` | — | **exit 0** |

## 2. 达成项与实现

### 2.1 `while-block-let-close-brace`（`while (a) { let y = 1 }`）

块体 `}` 到达时，增量声明还挂在块体括号的挂载链上；A6c 的 list 终结候选只对「首单元是绑定形状」的 `}`
`Accept`，普通声明直接委托 A2/A4 扩过的基类 → 基类对 `}` 显式 throw「declaration 符号 }」。

修法（`variable-declaration-list-possible-shape.xl.md`，本 WP own）：

1. `VariableDeclarationListEndPossibleShape.ComputeByIndex`：`Symbol("}")` 一律 `Accept`
   （`DeclarationCellGuard` 已经在 `}` 格替所有表达式候选 `Reject`，所以不会「终结候选与其它候选同时成立」）；
2. `BuildByIndex` 的 `}` 分支走新增 `IncrementalVariableDeclarationListBuilder.CloseAtBoundary`：
   - `declaration.TryToClose(context)` → `FinishIncremental` 收下唯一初始化器根（末尾没有 `;`，`src` 终点 = 最后一个子节点）；
   - `list.TryToClose(context)`；`statement.TryToClose(context)`（statement 终点由最后一个子节点补，**不**用 `}` 签出）；
   - 清 `statement.Parent.MountedUnit` / `list.MountedUnit`，让闭合括号的 `Quit()` 不会再关一次。

实测 `--show` → `incremental steps=25`；EOF 树与 legacy 一致（`WhileStatementShape → BlockShape → VariableStatementShape →
VariableDeclarationListShape → VariableDeclarationShape[IdentifierShape y, NumericLiteralShape 1]`，Pos 全部对齐）。
已 `git mv` 到 `tts-impl/cases/statements/`。

## 3. 未达成 7 条（逐条归属，全部已在 base 分支上复现，不是本 WP 引入）

| case | 现状 reason | 归属 / 根因 |
| --- | --- | --- |
| `do-while-let-call-init`（`do { let y = f() } while (a)`） | `declaration 括号` | **A3**（调用表达式 `CallExpressionShape` 未合入；初始化器目录没有 call 候选） |
| `if-block-let-member-init`（`if (a) { let y = b.c }`） | `declaration 符号 .` | **A3**（成员访问未合入） |
| `label-block-let-unary-init`（`l: { let y = -1 }`） | `declaration 符号 -` | **A2b**：前缀一元候选未在声明初始化器目录里接手——`CatalogGuide` 先问候选、后问终结候选，基类终结候选在 `-` 格直接 throw；需要 A2b 在终结候选侧加「前缀运算符格 Reject」的让位（与 A2 的 `HasReducibleLeft` 同一模式），B6b 写域不含该文件 |
| `try-block-let-type-annotation`（`try { let y: number = 1 } catch {}`） | `declaration 符号 :` | **A5**：`VariableDeclarationShape.ComputePossibleShapes` 的 TypeMode 只在**根层**启用（A5 报告 §3.2 明确块体不接管），块内 `:` 无路可走；该文件不在 B6b 写域 |
| `asi-two-declarations`（statements + lexical 各一） | `declaration 初始化器未读完` | **缺陷 1**（增量声明后第二条语句丢失，PLAN §2.3 / B6 主目标）：需要「首条声明在换行处按 ASI 收口 + 第二条语句回根层重路由」。设计已在 §4 记录，本轮未实现（会改动 SourceFile/ASI 收口链，超出本轮可安全验证范围） |
| `if-block-let-destructuring`（`if (a) { let { a } = o }`） | `declaration 初始化器未读完` | A6c 交接项；`}` 通用收口只解决了普通声明，解构绑定在块体里初始化器仍落到 legacy `ExpressionBuilder` 兜底且读不完（块体壳先收口 / 解构绑定括号与块体括号的收口顺序耦合），需在块壳收口路径上继续 |

## 4. 给 ASI（缺陷 1）续任的设计草案

目标：`let x = a ⏎ b` / `let x = "s" ⏎ let y = 1` 变成两条语句、且第一条增量树与 legacy 一致。

1. **收口时机**：list 终结候选在「含换行的 trivia」格 `Accept`；`BuildByIndex` 调 `TryCloseAsi`。
2. **判据**（必须保守，否则会把跨行表达式切开）：
   - `Data` 里已有 `=`；
   - `=` 之后的 raw 全部是 basic 单元（候选没接管），且 `ExpressionBuilder.Load(raw)` + `ParseExpression()` 能**读完**；
   - 换行之后的下一个非空白字符**不是**续接字符（`+ - * / % < > = ! & | ^ ? . , ( [ \`` 等），否则不关（跨行表达式）。
3. **收口动作**：同 `CloseAtBoundary`（declaration → list → statement，终点取最后一个子节点），清挂载；
   第二条语句的单元回根层，由 `SourceFileEndPossibleShape` 的 leftover 分段逻辑建 legacy `ExpressionStatementShape` / 第二条 `VariableStatementShape`。
4. **风险（本轮没做的原因）**：`Accept` 发生在 `CatalogGuide` 里，若同格还有候选活着会抛「终结候选与其它候选同时成立」；
   要么给这些格也加 guard（会把未完成初始化器的候选杀掉、影响跨行形态），要么把判据搬到 `SourceFile` 侧的 ASI 收口链——
   两条路都要重跑全量 60+366 条做零漂移验证，超出本轮剩余轮次。

## 5. 验收读数

```text
xl_build {cwd=<克隆>, paths:["core","typescript"], targets:["ts"]}  → 0 error / 3 warning（既有 E1107）
node node_modules/typescript/bin/tsc -p .                           → exit 0
node typescript/cases/tts/run.mjs                                    → PASS 59 / FAIL 0 / 59
node typescript/cases/tts-impl/run.mjs --quiet                       → PASS 366 / FAIL 0 / 366
diff-report tmp/base-b6b.json tmp/final-b6b.json --allow <1 迁出 id>  → 59 一致 / 1 允许 / 0 不允许 → PASS
```

- 开关 false：本 WP 只改 `VariableDeclarationListEndPossibleShape`（增量 builder 专用，`EnableIncrementalVariableShapes`
  为 false 时一次都不构造）与其 `BuildByIndex` 分支；legacy 建树路径不经过本类，逐字节不变。
- 目标 8 条里其余 7 条在改动前后均保持 `throw`，diff-report 证明非目标零漂移。
- INDEX / README 未重生成（A7/B7 收口）；未跑 gates；未 push；克隆保留。

## 6. 提交

- 代码 + 迁移：见本 commit（`feat(b6b): close incremental declarations at block '}' + migrate while-block-let-close-brace`）。
