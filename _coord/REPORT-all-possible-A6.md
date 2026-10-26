# REPORT-all-possible-A6 — 解构/多声明/`;`/definite-assignment/ASI

## 0. 身份与环境

| 项 | 值 |
| --- | --- |
| 任务 | `task-16` — WP-A6（解构/多声明/`;`/definite-assignment/ASI，约 22 条） |
| 分支 | `feat/a6`（只提交本地分支，**未 push**） |
| 克隆 | `C:\Users\Admin\Documents\GitHub\xl-example-set\a6-bindings`（`node_modules` 是指向 canonical 的 junction） |
| base | `base-int` = `_integration` 的 `integration/all-possible` @ `fe66b997`（含 E0a + E0b + B2 + B5；`tts` 305 条 / `tts-impl` 120 条） |
| 构建产物 | `dist/ts/**`（`xl_build` 默认 out）+ `build/ts/**`（`tsc`），均 gitignored；`tmp/**` 为 gitignored 证据目录 |
| 基线快照 | `tmp/base-a6.json`（改动前 305 条的 `--json`，用于 `diff-report`） |

**own 文件**

1. 新增 `typescript/tokens/declarations/variable-declaration-list-possible-shape.xl.md`（本 WP 唯一新增代码文件）
2. 修改 `typescript/tokens/declarations/variable-declaration-possible-shape.xl.md`（终结候选换成 WP-A6 的 list 候选，2 处）
3. 本报告
4. `git mv` 7 条目标 case（class 目录 → `tts-impl/cases/<area>/`，内容逐字节不变）

**没有碰**：`variable-declaration-shape.xl.md`（A5 own）、`expression-shape-catalog.xl.md`（E0a/form 注册区）、
`statement-route-util` / `statement-shape` / `direct-*` / `core/**`、别人的 case 内容、INDEX（A7/B7 收口）。

## 1. 验收读数（全部实测）

| # | 命令 | 读数 |
| --- | --- | --- |
| 1 | `xl_build {cwd=<克隆>, paths:["core","typescript"], targets:["ts"]}`（不传 out） | **0 error**，3 warning（既有 `E1107` 三处重名） |
| 2 | `node node_modules/typescript/bin/tsc -p .` | **exit 0** |
| 3 | `node typescript/cases/tts/run.mjs` | **PASS 298 / FAIL 0 / 298**（305 − 7 迁出） |
| 4 | `node typescript/cases/tts-impl/run.mjs --quiet` | **PASS 127 / FAIL 0 / 127**（120 + 7） |
| 5 | `node typescript/cases/tts/tools/diff-report.mjs tmp/base-a6.json tmp/final-a6.json --allow <7 个目标 id>` | **一致 298 / 允许变化 7 / 不允许变化 0** → PASS |
| 6 | 两次独立进程 `--json`（tts / tts-impl 各一对） | **逐字节相同**（SHA-256 相等） |
| 7 | 开关 false（legacy） | **逐字节不变**：WP-A6 只替换了增量路径专用的终结候选，`EnableIncrementalVariableShapes=false` 时 `IncrementalVariableStatementBuilder.Build` 一次都不执行（E0b 的机械门控），legacy 建树路径不经过本 WP 任何代码 |

## 2. 目标 case 前后分类（`--show` 实测）

| # | case | 基线 | 完成后 | 迁移去向 |
| --- | --- | --- | --- | --- |
| 1 | `throw/declarations/let-semicolon-binding`（`let x;`） | throw | **incremental** steps=8 | `tts-impl/cases/declarations/` |
| 2 | `throw/declarations/let-semicolon-number`（`let x = 1;`） | throw | **incremental** steps=12 | 同上 |
| 3 | `throw/declarations/let-two-declarations`（`let x, y;`） | throw | **incremental** steps=11 | 同上 |
| 4 | `throw/declarations/var-two-initialized`（`var a = 1, b = 2;`） | throw | **incremental** steps=19 | 同上 |
| 5 | `throw/lexical/let-init-multi-decl`（`let x = 1, y = 2\n`） | throw | **incremental** steps=18 | `tts-impl/cases/lexical/` |
| 6 | `throw/lexical/let-init-semicolon`（`let x = 1;`） | throw | **incremental** steps=12 | 同上 |
| 7 | `throw/statements/if-block-let-semicolon`（块内 `let y = 1;`） | throw | **incremental** steps=23 | `tts-impl/cases/statements/` |

**未达成 11 条**（仍在 `tts`，分类保持 `throw`，零漂移）：

| case | 仍 throw 的原因 | 依赖 |
| --- | --- | --- |
| 5 条解构（`let-array-destructure[-rest]`、`let-object-destructure[-default|-nested]`） | `IncrementalVariableStatementBuilder.Build` 的绑定只认 `Common` 单标识符，读到 `[` / `{` 抛「declaration 解构绑定」；解构还要 `ArrayBindingPatternShape` / `ObjectBindingPatternShape` / `BindingElementShape` 的逐字符候选，以及初始化器标识符（`arr` / `obj`）的 primary 候选 | A1（primary 表达式）+ 本 WP 的 bindings 候选 |
| `if-block-let-destructuring` | 同上 | 同上 |
| `let-definite-assignment`（`let x!: number;`） | `!` 终结候选仍显式 throw；且 `: number` 需要类型目录 | A5（类型面）+ A2/本 WP 的 `!` 形状 |
| `let-init-bang`（`let x = !1`） | `=` 后的 `!` 是前缀一元运算符，需要运算符候选 | A2 |
| `asi-two-declarations`（2 条） | 第二条语句要在语句层重新路由；当前增量声明只建一条语句，第二条单元落进第一条的 `Data`，收口报「初始化器未读完」 | B1/B2（语句层路由） |
| `asi-postfix-newline` | `x++` 是表达式语句 + update 运算符 | A2 + B2 |

## 3. 实现结构

### 3.1 为什么必须替换终结候选

WP-E0b 的 `VariableDeclarationEndPossibleShape`（`variable-declaration-end-possible-shape.xl.md`）**只认识目标路径上的符号**：
`=` / 二元运算符返回 `Reject`，**其它符号（`;` / `,` / `!` / `:` …）一律显式 throw**。所以 `let x = 1;` 在分号那一格直接抛
「declaration 符号 ;」，任何列表层的建造逻辑都没有机会执行。该文件不在 A6 的写域，因此本 WP 用**自己的终结候选**替换它
（接线点只有 `variable-declaration-possible-shape.xl.md` 里构造 `CatalogGuide` 的那一行，属 own 文件）。

### 3.2 新增文件 `variable-declaration-list-possible-shape.xl.md`

| 类 | 职责 |
| --- | --- |
| `VariableDeclarationListEndPossibleShape` | 增量声明的终结候选：`;` / `,` → `Accept`；`=` / 二元运算符 → `Reject`；EOF → `Accept`；`!` / `:` / 其它符号 → 与原候选**同一条** `throw` 文案（因此非目标 case 结论零漂移） |
| `BindingIdentifierPossibleShape` | 多声明后一条声明的绑定标识符候选：`Common` → `IdentifierShape.FromBasicToken`（`Pos` = 声明 `Pos`，C1），建完即 `Done` 退场。**只挂在 WP-A6 新建的声明上（目录里只有它），不进 `ExpressionCatalogFactory`**，所以不会与 A1 的 primary 候选抢 `Common` 格（B5 §5.1 坑 4：必须实现 `IsBuildable`，否则 `Uncertain` 也会被建） |
| `IncrementalVariableDeclarationListBuilder.OpenNext` | `,` 上收口当前声明（摘逗号 → `TryToClose`），建下一条 `VariableDeclarationShape`（`Pos` = 逗号终点），挂载链最深一层切到新声明 |
| `IncrementalVariableDeclarationListBuilder.CloseAtSemicolon` | `;` 上收口：摘分号、按 `,` 切段（兜底）、第一段留在原声明、后续段 `BuildNext`、`list.TryToClose`、statement 补分号终点并 `TryToClose`、卸载挂载回块/根层 |
| `IncrementalVariableDeclarationListBuilder.BuildNext` | 用一段已闭合单元建后续声明：绑定就地物化，其余单元（`=` / 初始化器 basic / trivia）原样进 `Data`，`TryToClose` 时由 `FinishIncremental` 的 `ExpressionBuilder` 降级原子建树（与 legacy 同源） |

**设计要点（写给接续者）**：

1. **多声明在 `,` 上重开，而不是在 `;` 上一次性切**：`let-init-multi-decl` 是**没有分号**的 EOF 收口形态；若把 `,` 留到
   `;` 再切，EOF 路径会让第二条声明的单元掉进第一条声明的 `Data`，`FinishIncremental` 静默丢掉 → `divergent`（实测踩到过：
   第一版实现下 `tts` 多出 1 条 FAIL）。`,` 上重开 + 绑定候选立刻物化标识符，EOF 与 `;` 两条路都与 legacy 同树。
2. **第二条声明的目录里不放表达式候选**：绑定候选物化之后 `Done` 退场，初始化器 basic 单元留在 `Data`，由 EOF 收口降级
   `ExpressionBuilder` 原子建树 —— 树与 legacy 同源，且避免与 A1 表达式候选在同一条声明里抢格。
3. **statement 终点 = 分号终点**（legacy `VariableStatementShape.src` 口径）；`list.src` 终点由最后一个声明子节点决定；
   收口后 `statement.Parent.MountedUnit = null` / `list.MountedUnit = null`，后续字符回到块 / 根层（块内 case 已实测通过）。
4. **`!` / `:` 仍显式 throw**（原候选同文案），保持 18 条目标里未达成者仍是 `throw`、`diff-report` 零漂移。

## 4. 证据

### 4.1 零漂移（机械可复算）

```text
node typescript/cases/tts/run.mjs --json tmp/final-a6.json --quiet
node typescript/cases/tts/tools/diff-report.mjs tmp/base-a6.json tmp/final-a6.json --allow <7 个目标 id>
→ 298 个 id：一致 298 / 允许变化 7 / 不允许变化 0
```

即：305 条基线里，只有本 WP 的 7 个目标从 `throw` 变成 `incremental`（已迁出），其余 298 条逐条完全一致。

### 4.2 开关 false（legacy）

WP-A6 的接线只发生在 `IncrementalVariableStatementBuilder.Build` 内部（该 builder 只在
`StatementRouteUtil.IsIncrementalVariableShapesEnabled()` 为真时由 `VariableStatementPossibleShape.BuildByIndex` 调用）；
新增类不覆写任何 basic token 的 `ExitOrPre` / `Process`，也不在 legacy 建树路径上被 import 使用（仅被增量 builder 构造）。
因此开关 false 时新路径**一步不走**，legacy EOF 树逐字节不变。全量基线 `diff-report` 的一致 298 条是另一重旁证。

### 4.3 确定性

两次独立进程 `--json`（`tts` 与 `tts-impl` 各一对）SHA-256 相等 → 输出逐字节相同。

## 5. 风险与未竟项

1. **未达成 11 条**（见 §2 表）：解构/ASI/`!`/`:` 分别依赖 A1（primary 表达式）、A2（一元/update 运算符）、A5（类型面）、
   B1/B2（语句层路由）。建议 Lead 按 PLAN 的波次合并后，由 A7/后续 WP 在这些依赖到位后继续：
   - 解构：在本 WP 的 `OpenNext` / `BuildNext` 旁边加 `ArrayBindingPatternPossibleShape` / `ObjectBindingPatternPossibleShape`
     候选（`bindings/forms/`），把 `Build` 的「绑定必须 Common」分支改成「`Common` 或 `Bracket[`/`{` → 绑定形状」；
     初始化器标识符交给 A1 候选，不要自己注册 primary。
   - `let-definite-assignment`：在终结候选里把 `!` 从 throw 改成 Accept + `ExclamationTokenShape`（`Pos` = 前一个代码单元
     `EndIndex`，legacy pos=5），剩下的 `: number` 交 A5。
   - `asi-two-declarations` / `asi-postfix-newline`：需要语句层「一条语句收口后重开下一条」，属 B1/B2，不应在 A6 里硬做。
2. **`if-block-let-semicolon` 的块卸载**：收口后把 `statement.Parent.MountedUnit` 置空；块闭合那一拍由 `Bracket.ExitOrPre`
   再做一次 `TryToClose`（已关闭的形状幂等）。若 B1 后续改块闭合逻辑，需要回归这条 case。
3. **INDEX.md 未重生成、README 现状表未改**：按 PLAN §5.1 属 A7/B7 收口；当前事实是 `tts` 298 / `tts-impl` 127。
4. **未跑既有 gates / samples / coverage / ast:\***（按纪律）；未 push；克隆目录保留。
5. **确定性/零漂移的复算入口**：`tmp/base-a6.json`（改动前）与 `tmp/final-a6.json`（改动后）已留在 gitignored 的 `tmp/`。
