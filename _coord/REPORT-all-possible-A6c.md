# REPORT-all-possible-A6c — 解构绑定 + `!` definite assignment + 初始化器收口

## 0. 身份与环境

| 项 | 值 |
| --- | --- |
| 任务 | `task-27` — WP-A6c（解构/`!`/初始化器收口续任） |
| 分支 | `feat/a6c`（本地，**未 push**） |
| 克隆 | `C:\Users\Admin\Documents\GitHub\xl-example-set\a6-bindings` |
| base | `feat/a6b` @ `865b058d` merge `base-int` = `integration/all-possible` @ `ace605e3`（含 A1/A2/A4/A4b/A5/A5b 等） |
| commit | `00418ed0`（代码 + 迁移；本报告随后的 docs commit） |
| 基线快照 | `tmp/base-a6c.json`（merge 后、改动前 tts 的 `--json`，用于 diff-report） |

## 1. 结论

| 项 | 基线（merge 后） | 本 WP 完成后 |
| --- | --- | --- |
| `tts` | 80 条，其中 `let-arrow-init` 已是 `partial`（**基线自身 FAIL 1**，见 §4） | **PASS 71 / FAIL 1 / 72**（8 条迁出；剩余 1 = 基线遗留） |
| `tts-impl` | 345 条，**FAIL 1**（`types/generic-call-type-args`，见 §4） | **PASS 352 / FAIL 1 / 353**（+8 迁入；剩余 1 = 基线遗留） |
| 目标达成 | — | **6 / 7**：解构 5 条 + `let-definite-assignment` 达成并迁出；`if-block-let-destructuring` 未达成（§3） |
| 额外迁移 | — | A5 报告 §7 交接的 `destructure-array-annotation`、`destructure-object-annotation`（解构形状一开就转 incremental，按 A5 的交接说明由本 WP 一并迁） |
| `xl_build` | — | **0 error** / 3 warning（既有 E1107） |
| `tsc -p .` | — | **exit 0** |
| 确定性 | — | tts / tts-impl 两次独立进程 `--json` **逐字节相同** |

## 2. 关键修复（根因与改法）

### 2.1 解构绑定：Build 发生在括号关闭那一拍，挂载被 `Quit()` 摘掉（A6b 未解决的真根因）

`let [a] = arr;` 的增量 Build 在 `]` 关闭时触发（此时 `Bracket` 才作为一格进入宿主 `Data`）。`Bracket.ExitOrPre`
在 `SignOut → TryToClose（父目录判格 → 我们的 Build）→ Quit()`：`Quit()` 执行 `this.Parent.MountedUnit = null`，
把 Build 刚设好的 `host.MountedUnit = statement` 清掉，于是 `= arr;` 全部落到**根层**，EOF 由 legacy
`ExpressionBuilder` 兜底 → 报「不支持的表达式起点」（A6b 报告里的现象）。

修法（`variable-declaration-possible-shape.xl.md`，own）：Build 完成挂载后，对解构绑定把 `Bracket` 的 `Parent` 置空
（`(binding as Bracket).Parent = null`）—— 让这次 `Quit()` 变成 no-op，挂载链保持到 `=` / 初始化器 / `;`。
实测 5 条解构立刻全部 `incremental`，且 EOF 树与 legacy 同树（`ArrayBindingPatternShape` / `BindingElementShape` /
`IdentifierShape` 的 Pos/src 来自 legacy `FromBracket`，天然同源）。

### 2.2 definite assignment：`!` → `ExclamationTokenShape` + A5 类型注解

- `VariableDeclarationListEndPossibleShape.ComputeByIndex`：`!` 且**此前没有 `=`**（`HasEqualBefore` 为假）时 `Accept`；
  `BuildByIndex` 交给 `BuildDefinite`：`ExclamationTokenShape`（`Pos` = 前一个代码单元 `EndIndex`，`src` = 符号自身区间，
  legacy `pos=5 src=[5,6)`），`token.Replace(shape)` 就地替换。
- `DeclarationCellGuard` 在 `!` 格上替所有表达式候选 `Reject`（避免「终结候选与其它候选同时成立」）。
- `VariableDeclarationShape.TryBuildAnnotation`：落地类型节点时保留「绑定与 `:` 之间的修饰形状」（即 `!`），
  `Data` 变成 `[IdentifierShape, ExclamationTokenShape, TypeNode]`（与 legacy 同形）；`FinishIncremental` 的扫描
  允许 `ExclamationTokenShape` 在注解之前。
- 限制条件很关键：`!` 只在**没有 `=`** 时接管，否则 `let x = a!`（A3 非空断言）会被误建 → 实测未加限制时
  `ref-nonnull` / `unary-not` / `nonnull-assertion` 从 `throw` 变 `divergent`（已修回）。

### 2.3 块内解构（未完全达成）

`if (a) { let [b] = xs }` 走块体壳：`}` 到达时声明仍挂着。给 list 终结候选加了「`}` 且首单元是绑定形状
（`IsPatternBinding`）→ `Accept`，Build 里只 `declaration.TryToClose` 并返回（不越权关 statement/list）。
现状：`--show` 从「declaration 解构绑定」推进到 **「declaration 初始化器未读完」**（EOF 兜底仍在 ExpressionBuilder
路径上），块体壳的收口时机还要与 `BlockPossibleShape` 对齐，留给续任（见 §5）。

## 3. 目标 case 前后（`--show` 实测）

| # | case | 基线 | 完成后 | 迁移 |
| --- | --- | --- | --- | --- |
| 1 | `let-array-destructure-rest` | throw | **incremental** steps=22 | `tts-impl/cases/declarations/` |
| 2 | `let-array-destructure` | throw | **incremental** steps=16 | 同上 |
| 3 | `let-object-destructure-default` | throw | **incremental** steps=22 | 同上 |
| 4 | `let-object-destructure-nested` | throw | **incremental** steps=25 | 同上 |
| 5 | `let-object-destructure` | throw | **incremental** steps=18 | 同上 |
| 6 | `let-definite-assignment`（`let x!: number;`） | throw | **incremental** steps=17 | 同上 |
| 7 | `if-block-let-destructuring` | throw | throw（reason 推进为「初始化器未读完」） | 未迁移 |
| 附 1 | `destructure-array-annotation`（`let [a]: T = xs`） | throw | **incremental** | `tts-impl/cases/types/`（A5 交接） |
| 附 2 | `destructure-object-annotation` | throw | **incremental** | 同上 |

## 4. 验收读数（当前 checkpoint）

```text
xl_build {cwd=<克隆>, paths:["core","typescript"], targets:["ts"]}  → 0 error / 3 warning（既有 E1107）
node node_modules/typescript/bin/tsc -p .                           → exit 0
node typescript/cases/tts/run.mjs                                    → PASS 71 / FAIL 1 / 72
node typescript/cases/tts-impl/run.mjs --quiet                       → PASS 352 / FAIL 1 / 353
diff-report tmp/base-a6c.json tmp/final-a6c.json --allow <8 个迁出 id> → 一致 / 8 条允许（删除）/ 不允许 1
两次独立进程 --json：tts / tts-impl 均逐字节相同
```

**两条 FAIL 都是本 WP 开始前的基线遗留，不是 A6c 引入**（可用 `tmp/base-a6c.json` 复算）：

1. `tts/throw/declarations/let-arrow-init`：基线记录 `actual=partial pass=false`（A1b/A4b 合入后的 **NOW-SUPPORTED
   但未迁移**问题——它已不是 `throw`，需其属主（A4b）决定是继续做到 incremental 还是回退；A6c 不越权改它）。
2. `tts-impl/types/generic-call-type-args`：基线 `tts-impl` 就是 `PASS 344 / FAIL 1`（A5 交接的「泛型调用实参」
   提前落地与候选目录冲突），A6c 未触碰该形态。

diff-report 唯一「不允许变化」是 `if-block-let-destructuring` 的 `throw -> throw`（reason 变了、分类未变），
即 §2.3 的未完成项。

## 5. 未竟项与交接

1. **`if-block-let-destructuring`（块内解构）**：现状 reason「declaration 初始化器未读完」。根因是块体壳
   （`BlockPossibleShape` / 控制流壳）在 `}` 一拍先收口，`= xs` 之后的初始化器被 legacy `ExpressionBuilder` 兜底且读不完。
   交接点：`VariableDeclarationShape.FinishIncremental` 的「唯一根 / 降级」分支在块体路径上被谁先调用；
   建议在块体壳的 `TryToClose` 顺序上对齐（`block-possible-shape.xl.md`），或让 `}` 的 Accept 也走
   `CloseAtSemicolon` 式的「先补 statementEnd 再关 list/statement」。
2. **`let-arrow-init`（基线遗留）**：A4b 的初始化器收口已让它变 `partial`；属主应决定迁移/回退。
3. **`types/generic-call-type-args`（基线遗留）**：A5 的 `HasTypeArgumentCall` 路径与表达式目录冲突，需 A5b/B4b 收口。
4. `let-init-bang` / `asi-postfix-newline` 仍 `throw`（A2b/B1/B2 依赖），本 WP 未越界；`let-array-init` /
   `let-parenthesized-init` 仍 `throw`（reason 由 A4b 的复合初始化器判据与 `;` 收口的交互决定，属 A4b/A4c 边界）。
5. INDEX / README 未重生成（A7/B7 收口）；未跑 gates；未 push；克隆保留。

## 6. 提交

- 代码 + 迁移：`00418ed0`（`feat(a6c): destructuring bindings, definite assignment, and A5 annotation-destructure handoff`）。
- 本报告随后以 docs commit 落盘；工作树干净。
