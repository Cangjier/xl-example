# REPORT-all-possible-A4b — A4 续任：数组 / 箭头 / 函数 / 类 / 括号 / 逗号（阶段交付 13 条）

- **任务**：`task-22`（WP-A4b，A4 续任；依据 `_coord/PLAN-all-possible.md` §4.1 A4 / §5.1 / §6，A4 报告 §5 的三步接入法）
- **分支**：`feat/a4b`（只提交本地分支，**未 push**）
- **克隆**：`C:\Users\Admin\Documents\GitHub\xl-example-set\a4b-composite`（`node_modules` 是 canonical 的 junction）
- **base**：`base-a4` = A4 `feat/a4` @ `c98556bb`，随后 `git merge base-int`（`_integration/integration/all-possible` @ `aafb6188`）。
  实测 **fast-forward**：`git merge-base --is-ancestor base-a4 base-int` = 0 ⇒ 无冲突可解，本分支树 == `base-int` tip。
  因此本分支已含 A1 / A2 / A4 / B1 / B2 / B3 / B5 等已合内容；**A5 / A6 尚未合入**（tree 里没有 `types/type-catalog-factory.xl.md`，也没有 A5/A6 报告）。
- **commit**：检查点 `ac62b578`（实现 + 13 条迁移）→ 最终 commit 见文末（本报告与最终代码同一 commit）
- **构建产物**：`dist/ts/**` + `build/ts/**`（gitignored）；`tmp/**` 为 gitignored 证据目录。

## 0. ⚠️ 基线状态（必须先读：集成分支本身是红的，非本 WP 引入）

在本分支（= `base-int` tip）上、**改动之前**跑 `node typescript/cases/tts-impl/run.mjs` 的读数：

```text
[tts-impl] 228 条 case：throw 0 · atomic 0 · partial 15 · incremental 213
[tts-impl] PASS 213 / FAIL 15 / 228        （exit 1）
```

15 条 FAIL 全部是 **A1 的原子 case**（`actual=partial`）：`declarations/let-identifier-init`、
`expressions/{bin-instanceof,lit-bigint,lit-false,lit-null,lit-tagged,lit-true,lit-undefined,ref-ident,ref-this}`、
`lexical/let-init-{bigint,identifier,template-tagged}`、`statements/{const,let}-identifier-init`。

归因（**只读了 A1 报告与代码，未改 A1/A2 文件**）：A1 的原子候选用 `PrimaryAtomGuard` 把「建」的判据放在
`IsBuildable` 里，但候选在 `ComputeByIndex` 里仍是 `Accept`（`Candidates` 里仍存活）；与 A2 的
`BinaryOperatorPossibleShape`（以及 A4/A4b 的复合候选）同目录共存后，`CatalogGuide` 的
`Candidates.size === 1` 永远不成立 ⇒ 候选建不出来，只能在 EOF 兜底 → `partial`。
`tts` 账本本身是绿的（197 PASS），所以这是**迁移面（tts-impl）**的问题，且早于本 WP 存在。

本 WP 的验收因此按「**集成基线 213/15 + 本 WP 的 N**」给出：**PASS 226 / FAIL 15**，**FAIL 集合与基线逐条相同**
（本 WP 没有新增、也没有改动这 15 条）。修复建议已发给 Lead：让 A1×A2 的候选在「后面没有运算符」时收敛
（`Reject`），或把 A1 的 `AppendTo` 从 `CreatePrimary` 目录里拆到独立目录——那是 A1/A2 的写域，本 WP 不越权。

## 1. 结论先行

| 项 | 基线（= base-int） | 本 WP 完成后 |
| --- | --- | --- |
| 目标 case（19 条，`--show` 实测） | 全部 `throw` | **13 条 `incremental` 并已迁 tts-impl**；6 条按实测原因交接（§4） |
| `tts` 账本 | PASS 197 / FAIL 0 | **PASS 184 / FAIL 0**（197 − 13 迁出） |
| `tts-impl` | PASS 213 / FAIL 15（基线红，§0） | **PASS 226 / FAIL 15**（+13；FAIL 集合 = 基线集合） |
| 非目标分类漂移 | — | **0**（197 条逐 id 比对 baseline `--json`，只有 13 个目标变化；已迁走的 13 条在 `--allow` 意义下是「删除」） |
| `xl_build`（core+typescript→ts） | 585 written / 0 error / 3 warning | **0 error / 3 warning（同一批既有 E1107）** |
| `tsc -p .` | exit 0 | **exit 0** |
| 开关 false（legacy） | — | 13 条目标 case 的 **legacy EOF 树全文（含 basic 行与 src）逐字节不变** |
| 确定性 | — | 两次独立进程 `--json` 逐字节相同（tts / tts-impl） |

## 2. 目标 case 前后分类（`--show` 实测）

**13 条达成（throw → incremental，已 `git mv` 至 `tts-impl/cases/expressions/`，内容逐字节不变）**

| # | case | 源码 | legacy EOF 根（形状） |
| --- | --- | --- | --- |
| 1 | `arr-literal` | `let x = [1, 2]` | `ArrayLiteralExpressionShape` + 2×`NumericLiteralShape` |
| 2 | `spread-array` | `let x = [...a]` | `ArrayLiteralExpressionShape` → `SpreadElementShape` |
| 3 | `arrow-async` | `let x = async () => 1` | `ArrowFunctionShape` + `AsyncKeywordShape` |
| 4 | `arrow-block` | `let x = () => { return 1; }` | `ArrowFunctionShape` → `BlockShape` → `ReturnStatementShape` |
| 5 | `arrow-default` | `let x = (a = 1) => a` | `ArrowFunctionShape` → `ParameterShape`（默认值）+ `=>` + body |
| 6 | `arrow-destructure` | `let x = ({ a }) => a` | `ArrowFunctionShape` → `ParameterShape` → `ObjectBindingPatternShape` |
| 7 | `arrow-multi` | `let x = (a, b) => a` | `ArrowFunctionShape` → 2×`ParameterShape` |
| 8 | `arrow-rest` | `let x = (...a) => a` | `ArrowFunctionShape` → `ParameterShape` → `DotDotDotTokenShape` |
| 9 | `class-expr` | `let x = class {}` | `ClassExpressionShape` |
| 10 | `comma-expr` | `let x = (a, b)` | `ParenthesizedExpressionShape` → `BinaryExpressionShape`（`CommaTokenShape`） |
| 11 | `func-expr` | `let x = function () {}` | `FunctionExpressionShape` → `BlockShape` |
| 12 | `paren-nested` | `let x = ((1))` | 2×`ParenthesizedExpressionShape` |
| 13 | `seq-three` | `let x = (1, 2, 3)` | `ParenthesizedExpressionShape` → 嵌套 `BinaryExpressionShape`（逗号链） |

**6 条未达成（仍留原目录 / 原标注，见 §4）**：`arrow-single`、`ternary`、`await-expr`、
`let-array-init`、`let-arrow-init`、`let-parenthesized-init`。

## 3. 机制（在 A4 的 composite-initializer 上续任）

### 3.1 端到端路径（以 `let x = () => { return 1; }` 为例）

```text
IncrementalVariableStatementBuilder.Build（E0b 已接通）
  declaration.CatalogGuide = CreateDeclarationInitializer()（E0a 目录）
    候选 = [Numeric, Binary, A1 原子×8, A2 BinaryOperator, A4 Composite({...}), A4b CompositeForms] ← 注册区最后一个
  char 8  '(' 打开 Bracket（声明层只看到括号这一个单元）
  char 10 ')' 关闭 → 候选轮：A4b 见 Family="paren"、CanBuild=false（还没 =>）→ Uncertain；EndPossible：
      A4 的 Claims=false、A4b 的 Claims=false，但 **ContinuationAllowed=true**（`(...)` 之后是 `=`）→ Reject（等）
  char 11-13 '=>' 关闭 → EndPossible：Symbol("=>") 且 Family≠"" → Reject（等）
  char 14 '{' 打开函数体 Bracket；char 28 '}' 关闭函数体 →
      A4b：Family="paren"、CanBuild=true（legacy ExpressionBuilder 整段吃完 + 之后只剩输入结束）→ Accept
      EndPossible：Claims=true → Reject
      ⇒ Candidates 只剩 A4b 一个 → IsBuildable → BuildByIndex
      ⇒ ExpressionBuilder.ParseExpression（**legacy 同一个入口**）→ ArrowFunctionShape（含 BlockShape / ReturnStatement）
      ⇒ 用表达式替换 `=` 之后的全部 raw 单元；`host.MountedUnit = null`（A4 报告 §2.3 的坑）
  EOF → VariableDeclarationShape.FinishIncremental（E0b 收口）→ 唯一表达式根 TryToClose → 收下
```

**为什么 EOF 树与 legacy 逐位相同**：建树用的是 legacy 自己的 `ExpressionBuilder.ParseExpression`
（不是重写的形状工厂），`Positions` 首格取 `=` 的 `EndIndex`（C1），与 `FinishIncremental` 的降级分支同口径；
账本 identity = `(类名,pos)` 因此逐点一致，只是**首次出现的步号提前**（表达式末尾单元关闭 vs 语句收口/EOF）。

### 3.2 两个闸门（本 WP 的核心，解决 A4 报告 §3 的 «`]` 关闭后仍有续接» 碰撞）

新增 `CompositeInitializerFormsJudge`：

1. **形态闸门 `Family(units)`**（只看 `=` 之后第一个代码单元）：
   - `[` → `"array"`；
   - `(` → `"paren"`，但**括号内顶层有 `:` 或 `as`/`satisfies` 时返回 `""`**（`(a: number) => a` / `(y as T)` 是 A5 的形态，保持原 throw）；
   - `function` / `async` → 关键字族，但**参数括号带 `:` 时返回 `""`**（A5 的 typed-param 形态）；
   - `class` → `"class"`；
   - 标识符后紧跟 `=>` / `?` → 本 WP **不认领**（见 §4：被 A2 候选卡住，返回 `""` 保持原 throw）。
2. **完成闸门 `CanBuild(units, template, context)`**：形态命中 + 把 `=` 之后的 raw 单元整段交给 legacy
   `ExpressionBuilder.ParseExpression` 并**整段吃完** + 最后一个代码单元之后 `NextSignificantChar === ""`
   （只剩输入结束）。`;` / `as` / `+` / `,` 等后缀一律判「还没长完」。
3. **续接闸门 `ContinuationAllowed(units)`**（给终结候选用，无 context）：括号关闭后仍是本族合法续接时
   继续等——`(...)` 之后是 `=>` 的 `=`、`function (...)` 之后是函数体的 `{`。`let x = [1] as const` 在 `]`
   关闭格上前瞻是 `a`，不满足 ⇒ 终结候选仍按原样显式 throw（**账本不变**，这正是 A4 报告担心的碰撞点）。

### 3.3 接线点（3 处，全部在 task-22 写域内）

| 文件 | 改动 |
| --- | --- |
| `typescript/tokens/expressions/forms/primary/composite-initializer-forms-judge.xl.md`（新增） | 判据 + 建树唯一实现（`Family` / `CanBuild` / `ContinuationAllowed` / `ClaimsForEndPossible` / `Build`） |
| `typescript/tokens/expressions/forms/primary/composite-initializer-forms-possible-shape.xl.md`（新增） | 候选三入口 + `AppendTo`；`IsBuildable` 用 `context.Root.Template`（`PossibleShape` 没有模板字段） |
| `typescript/tokens/expressions/expression-shape-catalog.xl.md` | **1 行注册** `CompositeInitializerFormsPossibleShape.AppendTo(shapes); // [A4b]`（锚点 `// [E-CAT:FRAGMENTS]`，在 A4 行之后）+ 1 行 import |
| `typescript/tokens/declarations/variable-declaration-end-possible-shape.xl.md` | 括号格：`ClaimsForEndPossible` → `Reject`、`ContinuationAllowed` → `Reject`（否则原 throw）；Symbol 格：`=>` / `?` / `:` 在 `Family ≠ ""` 时 `Reject` |

**没有碰**：`statement-route-util` / `statement-shape` / `root-expression-statement-possible-shape` /
`variable-declaration-shape` / `variable-declaration-possible-shape` / A4 的两个 `composite-initializer-*` 文件 /
A1 的 `forms/primary/*-primary-possible-shape` 与 `primary-atom-guard` / A2 的 `forms/operator/*` /
`operator-table` / `operator-shape-map` / `shape-operator-stack` / `direct-*` / `INDEX.md` / `tts/README.md` /
`tts-impl/README.md` / `run.mjs`。

> 写域说明：`variable-declaration-end-possible-shape.xl.md` 是 A4 报告 §4 已声明「无主」的**唯一 throw 点**
> （`declaration 括号` 就来自这里），task-22 把它明确列进了写域；本 WP 只做**最小放行**（判据命中才 `Reject`，
> 其余逐字节不变，197 条非目标 case 的 diff 读数可证）。A4 的两个文件一行未改。

## 4. 未达成 6 条：逐条实测原因与交接

| 目标 | 现状 | 实测原因 / 交接 |
| --- | --- | --- |
| `arrow-single`（`y => y`） | throw（`declaration 符号 =>`） | 判据与建树都已验证可行（`Family="arrow"` + `CanBuild` 在最后 `y` 那格成立），但**同一格 A2 的 `BinaryOperatorPossibleShape` 仍存活**（它把标识符当可能的左操作数、等一个不存在的运算符），`CatalogGuide` 的 `Candidates.size === 1` 永远不成立 ⇒ 只能在 EOF 兜底、分类停在 partial。为保持账本零漂移，`Family` 对该形态返回 `""`（保持原 throw）。**交接：** A2 在「后面没有运算符」时 `Reject`（或 E-base 提供候选收敛钩子）后，把 `Family` 的 `arrow` 分支开回来即可（代码里有注释标出位置），随后迁 case。 |
| `ternary`（`a ? b : c`） | throw（`declaration 符号 ?`） | 同上——最后一格 `c` 上 `BinaryOperatorPossibleShape` 仍存活。同一个 A2 交接点。 |
| `await-expr`（`async function f() { let x = await p }`） | throw（`declaration 符号 }`） | 不是初始化器问题：声明在**函数体块内**，卡在块体收口（A4 报告 §3 同一结论）。依赖 B 阶段的 await / 块级逐字符路由，**交接给 B**。 |
| `let-array-init`（`let x = [1, 2];`） | throw（`declaration 括号`） | 形态本身已由 A4b 覆盖（与 `arr-literal` 同一判据），但**尾部 `;` 尚未支持**：本分支 `variable-declaration-shape` 仍是 E0b 版，`FinishIncremental` 遇到 `;` 显式 throw（A4 报告 §3 第①条）。**交接：** A6 的 `;` 收口落地后，这三条应自动变 incremental，只需 `git mv` + 用 `diff-report --allow` 记录。 |
| `let-arrow-init`（`let x = () => 1;`） | throw（`declaration 符号 ;`） | 同上（A4b 已把「`() => 1` 长完」判出来，只差 `;` 那一格）。 |
| `let-parenthesized-init`（`let x = (1);`） | throw（`declaration 括号`） | 同上。 |

## 5. 证据

### 5.1 EOF 树一致性（identity=(类名,pos)）

- 探针 `tmp/probe.mjs`（gitignored）：同一进程跑 legacy / incremental 两遍（逐字符 + EOF），输出「EOF shape 行
  （剥 `src`）是否一致」与每个非 basic 节点的**首次出现步号**。
- 13 条达成 case：`EOF shape 行一致: true` ×13，`divergent 文件数: 0`；表达式根节点首次出现步号全部 `EARLIER`
  （例：`arrow-block` 的 `ArrowFunctionShape` 在 `}` 关闭格出现，比 legacy 的 EOF 早；`comma-expr` / `seq-three`
  的 `ParenthesizedExpressionShape` 在 `)` 关闭格出现）。
- 一致性来源是构造性的：表达式由 **legacy `ExpressionBuilder`** 建，Positions 首格 = `=` 的 `EndIndex`。

### 5.2 开关 false 逐字节不变

- 方法：改动前跑一次探针（`tmp/probe-baseline.txt`，19 条目标的源码 + 双模式树），改动后对迁入 tts-impl 的
  13 条再跑一次（`tmp/probe-final.txt`），用 `tmp/legacy-diff.mjs` 按**case 源码**对齐、抽出 **legacy EOF 树全文
  （含 basic 行与 `src`，不剥）** 逐字节比较。
- 读数：`ALL LEGACY EOF TREES BYTE-IDENTICAL`（13/13，exit 0）。
- 机械门控：新候选与判据只在 `VariableDeclarationShape` 的 `CatalogGuide`（增量路径）里被调用；开关 false 时
  `IncrementalVariableStatementBuilder.Build` 不执行 ⇒ `ExpressionCatalogFactory.Create()` / A4b 候选一次都不被
  实例化，legacy 的 `StatementBuilder` 原子建树逐字节不变。

### 5.3 回归与确定性

```text
node typescript/cases/tts/run.mjs --quiet --json tmp/after3.json   → exit 0（184 条）
node typescript/cases/tts-impl/run.mjs --quiet                     → PASS 226 / FAIL 15（FAIL 集合 = 基线 15 条，§0）
diff-report（baseline vs after3）：只有 13 个目标 id 变化，非目标漂移 0
两次独立进程 --json：tts / tts-impl 各自逐字节相同
```

### 5.4 验收命令读数（最终）

```text
xl_build { cwd:<克隆>, paths:["core","typescript"], targets:["ts"] }  → 0 error / 3 warning（同一批既有 E1107）
node node_modules/typescript/bin/tsc -p .                             → exit 0
node typescript/cases/tts/run.mjs                                      → [tts] PASS 184 / FAIL 0 / 184（exit 0）
node typescript/cases/tts-impl/run.mjs                                 → [tts-impl] PASS 226 / FAIL 15 / 241（FAIL = 基线）
```

## 6. 给后续 WP 的接入指引（同机制可复用）

1. **形态闸门**：在 `CompositeInitializerFormsJudge.Family` 加一个族分支；**判据只看 `host.Data` 的单元结构与
   文档前瞻**（禁 `ctx.Text`）。任何「与别 WP 共享同一格」的形态要显式排除（`as`/`satisfies`/参数 `:` 是 A5 的）。
2. **完成闸门**：把 `=` 之后的 raw 单元交给 legacy 建造器整段吃完 + `NextSignificantChar === ""`；**半截不建**。
   这是解决「`]`/`)` 关闭后还有续接」的唯一干净办法（A4 报告 §3 的碰撞点）。
3. **终结候选放行**：括号格加 `ClaimsForEndPossible`（真要建的那一格）与 `ContinuationAllowed`（合法续接，
   如 `(...)` 后的 `=`、`function (...)` 后的 `{`）；Symbol 格对 `=>`/`?`/`:` 在 `Family ≠ ""` 时 `Reject`。
4. **建完 `host.MountedUnit = null`**（A4 报告 §2.3）：后续单元仍归声明层，要么被对应 WP 支持，要么按 C10 抛。
5. **候选共存的红线**：`CatalogGuide` 只在 `Candidates.size === 1` 时建。若同目录里有候选在该格仍 `Accept`
   （A1 原子 / A2 binary 在标识符上的行为），你的候选就永远等不到唯一候选——**先确认同格候选集合再实现**
   （`arrow-single`/`ternary` 就是被 A2 卡在这一条）。

## 7. 风险与未竟项

| 风险 / 未竟项 | 说明 / 处置 |
| --- | --- |
| **集成基线红（15 条 A1 atom case）** | 非本 WP 引入；已报 Lead（§0）。本 WP 完成后 `tts-impl` = PASS 226 / FAIL 15，FAIL 集合与基线逐条相同。若 Lead 要求绿基线验收，需先在 `_integration` 修 A1×A2 候选收敛后 rebase。 |
| `arrow-single` / `ternary` | 判据已实现、被 A2 候选卡住；代码里保留注释与开关点，A2 修好后一行开回（`Family` 的 `arrow` 分支）+ 迁 2 条即可。 |
| `;` 收口的 3 条 | A6 落地后自动达成，只需迁 case；`diff-report --allow` 记录。 |
| `await-expr` | 依赖 B 的块级/await 路由，交接。 |
| 两处 `INDEX.md` / 两个 `README` 的「现状」表 | 按 `PLAN` §5.1 归 A7/B7 重跑 `--write-index`；本 WP 未改。 |
| `src` 尾随 trivia（缺陷 4） | 未修；增量 EOF 树的语句/声明 `src` 右端比 legacy 多尾随换行（与既有 `rangeOnlyDifference` 同源），账本不比较 `src`，B6 收口。 |
| `Family` 的文档前瞻与注释 | `NextSignificantChar` 跳过空白与两种注释；注释出现在「结尾判定」位置时按非空字符处理（保守：不提前建树，落回原 throw，不会 divergent）。 |

## 8. 最终状态

- 分支 `feat/a4b`；工作区干净（`tmp/` 全 gitignored，未提交）；**未 push**；目录保留。
- 检查点 `ac62b578`；最终 commit = 本文件所在 commit。
- 最终读数：`xl_build` 0 error / `tsc` exit 0 / `tts` PASS 184 FAIL 0 / `tts-impl` PASS 226 FAIL 15（= 基线 FAIL 集合）
  / 13 条 legacy EOF 树逐字节一致 / 非目标漂移 0 / 两次 `--json` 相同。
