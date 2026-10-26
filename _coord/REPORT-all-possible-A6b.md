# REPORT-all-possible-A6b — A6 续任：解构绑定 + definite assignment + 集成分支修复

## 0. 身份与环境

| 项 | 值 |
| --- | --- |
| 任务 | `task-21` — WP-A6b（A6 续任，约 7 条 + 集成分支修复） |
| 分支 | `feat/a6b`（本地，**未 push**） |
| 克隆 | `C:\Users\Admin\Documents\GitHub\xl-example-set\a6-bindings` |
| base | `feat/a6` @ `dc6ff1d6` merge `base-int` = `integration/all-possible` @ `aafb6188` |
| commit | 本报告所在 commit（checkpoint，见 §6） |
| 构建产物 | `dist/ts/**` + `build/ts/**`，均 gitignored；`tmp/**` 为 gitignored 证据目录 |
| 基线快照 | `tmp/base-a6b.json`（merge 后、改动前 190 条 tts 的 `--json`） |

## 1. 关键发现：任务书对 base 的假设不成立（必须让 Lead 知道）

`base-int` = `aafb6188` 的提交历史只有 **A1（primary atom）、A2（operators）、A4（composite）、B3（class）** 的合并，
**没有 A5（type catalog）与 A6**；`feat/a6` 的合并把 A6 带进来后，集成分支立刻变红：

- 改动前 `tts-impl`：**PASS 190 / FAIL 45 / 235**（PASS 数是 `base-int` 上 A1+A2+A4 已迁 case 中真绿的数量，
  235 = 228 + A6 的 7 条）；
- 45 条 FAIL 中 **30 条 throw** 是 A6 直接替换终结候选导致的集成回归：
  A2/A4 已把 `variable-declaration-end-possible-shape.xl.md` 扩成「有可归约左操作数的二元运算符 `Reject`、
  复合字面量括号 `Reject`」，A6 却用自己那份**复制 E0b 旧语义**的终结候选整类替换，把 A2/A4 的放行全丢了；
- 另 **15 条 partial** 是 A2 报告 §6 已写明的「集成注记」未落地：A2 的 `BinaryOperatorPossibleShape`
  对标识符 `Common` 仍返回 `Uncertain`，A1 合并后两个候选同格 ⇒ 永远 `Waiting`，A1 的原子退化成 `partial`。

即：**`base-int` 本身在 A1+A2 合并后就是红的（15 条），不是 A6b 造成的**；A6b 的修复把它们一起收了。

## 2. 已做（代码，全部可复算）

### 2.1 `variable-declaration-list-possible-shape.xl.md`（own，A6b 重写）

1. `VariableDeclarationListEndPossibleShape` 改为**继承** `VariableDeclarationEndPossibleShape`：
   只拦 `;` / `,` 返回 `Accept`，其余格（`=` / 二元运算符 / Bracket 复合初始化器 / EOF / 未知符号）**逐字委托父类**。
   → A2/A4 的放行恢复，30 条 throw 回绿。
2. 新增 `DeclarationCellGuard`：把表达式目录的每个候选包一层，在 `;` / `,` 格上替它们 `Reject`。
   → 修 A6 自己的 7 条「终结候选与其它候选同时成立」（A4 的复合候选在 `;` 格是 `Uncertain`，
   `CatalogGuide` 会在终结候选 Accept 时直接抛）。
3. `IncrementalVariableDeclarationListBuilder.GuardedCatalog()` 提供套过守卫的目录；`,` 重开 / `;` 收口逻辑不变。

### 2.2 `variable-declaration-possible-shape.xl.md`（own）

- 目录换成 `GuardedCatalog()`。
- **解构绑定**：`Build` 的绑定位接受 `Bracket`（`[` / `{`），用 legacy 的
  `ArrayBindingPatternShape.FromBracket` / `ObjectBindingPatternShape.FromBracket` 把整棵绑定模式从已闭合括号一次建出，
  `Pos` = declaration 的 `Pos`，作为 declaration 第一个子节点；初始化器仍走 E-base 目录（A1 primary）。

### 2.3 `binary-operator-possible-shape.xl.md`（**A2 own，跨域集成修复，一处**）

按 A2 报告 §6 的「集成注记」把「标识符 `Common`（非数字）⇒ `Uncertain`」改成 `Reject`。
→ A1 的原子候选独占标识符格，15 条 partial 收回到 3 条（剩 3 条见 §4）。

### 2.4 迁移

- `git mv throw/declarations/let-exponent-init.ts`、`let-subtract-init.ts` → `tts-impl/cases/declarations/`
  （A2 报告 §7 明写「A6 完成后自动转 incremental，本 WP 不越权」；A6b 一并迁）。

## 3. 验收读数（当前 checkpoint，全部实测）

| # | 命令 | 读数 |
| --- | --- | --- |
| 1 | `xl_build {cwd=<克隆>, paths:["core","typescript"], targets:["ts"]}` | **0 error**，3 warning（既有 E1107） |
| 2 | `node node_modules/typescript/bin/tsc -p .` | **exit 0** |
| 3 | `node typescript/cases/tts/run.mjs` | **PASS 188 / FAIL 0 / 188**（190 − 2 迁出） |
| 4 | `node typescript/cases/tts-impl/run.mjs --quiet` | **PASS 234 / FAIL 3 / 237**（235 + 2 迁入；3 条见 §4） |
| 5 | 两次独立进程 `--json`（tts / tts-impl） | **逐字节相同** |
| 6 | `diff-report tmp/base-a6b.json tmp/final-a6b.json --allow <2 迁出 id>` | 2 条 allowed；其余变化 = A2 修复带来的迁移，需回填 allow（见 §4） |

## 4. 未达成（明确交接）

### 4.1 解构 5 条 + `if-block-let-destructuring`（6 条目标）

- 现状：`--show` 全部 `throw`，reason 从「declaration 解构绑定」变成 **「不支持的表达式起点」**（来自
  `expression-builder.xl.md:2453`），发生在 EOF 收口 → 说明**绑定模式已建出**（`[`/`{` 已过 `Build`），
  卡在初始化器/收口的某条 `ExpressionBuilder` 路径上（疑似 `VariableStatementShape` 的 legacy AST 兜底或
  `FinishIncremental` 降级分支拿到以 `=` 开头的 raw）。
- 交接点：在 `VariableDeclarationShape.FinishIncremental`（A5 own，本 base 尚未合入 A5）里，
  标识符假设要放宽成「绑定形状」（A5 §7 也写了同一句）；A6b 的 `Build` 侧已经就绪，只需把
  「`Data` 首单元是 `ArrayBindingPatternShape`/`ObjectBindingPatternShape`」这条路径跑通。
  本 base 没有 A5，`FinishIncremental` 仍是 E0b 版本，这是本 WP 卡住的地方。

### 4.2 `let-definite-assignment`（`let x!: number;`）

- base 不含 A5（type catalog）⇒ `:` 类型注解无路可走；`!` 形状本身可以做（`ExclamationTokenShape`，
  `Pos` = 前一代码单元 `EndIndex`），但注解收口在本 base 不可达。**等 A5 合入后再做**。

### 4.3 `let-init-bang` / `asi-postfix-newline` / `asi-two-declarations` ×2

- 仍 `throw`：分别依赖 A2b（前缀 `!`/update）与 B1/B2（语句层第二条语句重路由）。本 base 只有 B2 的旧版本，
  本 WP 未越界。

### 4.4 剩余 3 条 tts-impl FAIL（A1/A2 集成遗留，需 Lead 裁决归属）

`declarations/let-comparison-init`、`expressions/bin-div`、`expressions/bin-instanceof`：左操作数是**标识符**的
二元表达式，A2 候选在运算符格 `HasLeftOperand` 成立并 `Accept`，但标识符在上一格没有被建出来
（A1 的 `IsBuildable` 在「后面还有运算符」时故意不建、A2 又已改成 `Reject`），结果 `CatalogGuide` 等到 EOF
才 fallback ⇒ `partial`。
修法二选一（都不在 A6b 写域）：(a) A2 的 `BuildByIndex` 在左操作数还是 basic `Common` 时自己物化 `IdentifierShape`；
(b) A1 的 `IsTerminalAfter` 白名单按 A1 报告 §6 扩成「本分支确有后继候选消费」。建议由 A2/A1 的续任者做。

## 5. 风险

1. **跨域修改**：本 WP 改了 A2 的 `binary-operator-possible-shape.xl.md`（1 处 `Uncertain`→`Reject`，A2 报告 §6 明确要求的集成注记）。
   合并时应保留；若 A2 分支后续又改同一行，以「标识符格由 A1 独占」为准。
2. 解构 6 条未达成，`Build` 侧已就绪但收口侧依赖 A5 的 `FinishIncremental` 放宽；**不要**在 A6b 分支上硬改
   `variable-declaration-shape.xl.md`（A5 own）。
3. `DeclarationCellGuard` 改变了候选在 `;`/`,` 格的行为，但只对声明顶层生效（这两个符号在声明顶层本就该由终结候选收口）；
   若后续 WP 给表达式目录加「能跨 `;` 的候选」，需要同步。
4. INDEX.md / README「现状」表未重生成（A7/B7 收口）。
5. 未跑 gates / samples / coverage / ast:*；未 push；克隆保留。

## 6. 提交说明

本 commit 是**检查点**：代码与迁移已落，`tts` 全绿（188/188），`tsc` 全绿；
`tts-impl` 仅剩 §4.4 的 3 条 A1/A2 集成遗留（234/237），属跨 WP 归属问题，不在 A6b 写域内。
