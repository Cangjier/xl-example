# REPORT-all-possible-A4 — 复合字面量/函数式/箭头/三元/逗号（阶段交付：对象字面量族）

## 0. 身份与环境

| 项 | 值 |
| --- | --- |
| 任务 | `task-14` — WP-A4（依赖 E0b） |
| 分支 | `feat/a4`（只提交本地分支，**未 push**） |
| 克隆 | `C:\Users\Admin\Documents\GitHub\xl-example-set\a4-composite`（`node_modules` 是 canonical 的 junction） |
| base | `base-e0b` = E0b `feat/e0b` @ `f62730b0`（含 E0a + E0b） |
| commit | `d85acc56` — `feat(a4): object-literal initializers build incrementally at bracket close` |
| 报告 | 本文件（第二个 commit） |
| 构建产物 | `dist/ts/**` + `build/ts/**`，均 gitignored；`tmp/**` 为 gitignored 证据目录 |

**改动文件（`git status` 逐条）**

- 新增 `typescript/tokens/expressions/forms/primary/composite-initializer-judge.xl.md`（判据 + 建树）
- 新增 `typescript/tokens/expressions/forms/primary/composite-initializer-possible-shape.xl.md`（候选）
- 改 `typescript/tokens/expressions/expression-shape-catalog.xl.md`：**1 行注册** `CompositeInitializerPossibleShape.AppendTo(shapes); // [A4]`（锚点 `// [E-CAT:FRAGMENTS]`）+ 1 行 import
- 改 `typescript/tokens/declarations/variable-declaration-end-possible-shape.xl.md`：**A4 形态放行判据**（见 §4 的写域说明）
- `git mv` 7 条 case：6 条 `throw/expressions/*` + 1 条 `throw/lexical/let-init-object-literal` → `tts-impl/cases/{expressions,lexical}/`

**没碰**：`statement-route-util` / `statement-shape` / `root-expression-statement-possible-shape` / `variable-declaration-shape` / `variable-declaration-possible-shape` / `direct-*` / `operator-table` / `operator-shape-map` / `shape-operator-stack` / 其它 form 文件 / `INDEX.md` / `tts/README.md` / `tts-impl/README.md` / `run.mjs`。

## 1. 验收读数（可复算）

| # | 命令 | 读数 |
| --- | --- | --- |
| 1 | `xl_build {cwd=<克隆>, paths:["core","typescript"], targets:["ts"]}`（不传 out） | **0 error**，3 warning（既有 `E1107` 三处，与基线逐条相同）；新增 2 文件 + 2 个被改文件重生成 |
| 2 | `node node_modules/typescript/bin/tsc -p .` | **exit 0** |
| 3 | `node typescript/cases/tts/run.mjs --quiet --json tmp/final1.json` | **exit 0**（373 条，全部与标注一致；迁出的 7 条已不在账本） |
| 4 | `node typescript/cases/tts-impl/run.mjs` | **PASS 52 / FAIL 0 / 52**（`incremental 52`，45 + 7） |
| 5 | `node typescript/cases/tts/tools/diff-report.mjs tmp/base.json tmp/final1.json --allow <7 条迁移 id>` | **`380 个 id：一致 373 / 允许变化 7 / 不允许变化 0` → PASS**（变化列表 = 恰好这 7 条「删除」，即迁移；**非目标零漂移**） |
| 6 | 同一命令两次 `--json` 的 SHA-256 | **逐字节相同**（确定性保持） |
| 7 | `expr-probe --both` 对 6 个对象字面量样本：**legacy 逐字符树** vs E0b 工作区（= 本分支 base 的构建产物） | **6/6 一致**（开关 false 逐字符逐字节不变）；同一批样本 incremental 之前 `stopped=true`（throw），现在是完整树 |

迁移后的 `--show`（7 条全部 `actual=incremental`）：

```text
throw/expressions/obj-literal          -> incremental（迁移后 id: expressions/obj-literal）
throw/expressions/spread-object        -> incremental
throw/expressions/computed-key         -> incremental
throw/expressions/method-shorthand     -> incremental
throw/expressions/getter               -> incremental
throw/expressions/setter               -> incremental
throw/lexical/let-init-object-literal  -> incremental（迁移后 id: lexical/let-init-object-literal）
```

## 2. 机制（这次真正做成了什么）

### 2.1 端到端路径

```text
let x = { a: 1 }
  ↑ IncrementalVariableStatementBuilder.Build（E0b 已接通）
  declaration.CatalogGuide = new CatalogGuide(ExpressionShapeCatalog.CreateDeclarationInitializer(), endPossible)
      候选 = [NumericLiteral, Binary(* +), CompositeInitializer(A4)]   ← 注册区第 3 个
  char 8  '{' 打开 Bracket（声明层看不到括号内容）
  char 16 '}' 关闭 → 声明层被问一次（tokenIndex = 那只 Bracket 单元）
      NumericLiteral → Reject，Binary → Reject，CompositeInitializer → Accept（Claims 成立）
      EndPossible → Reject（A4 放行判据，见 §2.2）
      ⇒ Candidates 恰好剩 1 个 → IsBuildable（括号已关闭）→ BuildByIndex
      ⇒ ExpressionBuilder.ParseExpression（**legacy 同一个入口**）→ ObjectLiteralExpressionShape
      ⇒ bracket.Replace(expression)：原位替换，Pos/src/子节点全部由 legacy builder 给出
  EOF → VariableDeclarationShape.FinishIncremental（E0b 收口）→ 唯一根 TryToClose → 收下
```

**为什么 EOF 树与 legacy 逐位相同**：建树用的是 legacy 自己的 `ExpressionBuilder.ParseExpression`
（`ParsePrimary` 再分派 `ParseObjectLiteral`），不是重写的形状工厂；`Positions` 首格取 `=` 的
`EndIndex`（C1），与 `FinishIncremental` 降级分支同口径。账本 identity = `(类名,pos)` 因此逐点一致，
只是**首次出现的步号提前**（`}` 关闭 vs 语句收口/EOF）——这正是 `incremental` 的判据。

### 2.2 两个 gate 点

1. **候选的 claims 判据**（`CompositeInitializerJudge.SoleCompositeUnit`）：`=` 之后（跳过 trivia）
   **恰好一个**代码单元、且是 `{...}` 的 `Bracket`。所以 `y satisfies { a: number }`、`a[0]`、
   `[1] as const` 都不接管（`=` 之后不止一个单元 / 首单元不是 `{`）。
2. **声明终结候选的放行**（`variable-declaration-end-possible-shape.xl.md`）：`Bracket` 命中
   `Claims(units)` 时返回 `Reject`（等候选建树），否则仍是原来的
   `throw 增量变量形状未支持：declaration 括号`（C10 不变）。

### 2.3 一个必须记住的坑（已修）

建完后**不能**把 `host.MountedUnit` 指向建出来的表达式：后续单元（`;` / `,` / `as`）会流进表达式形状
的 `Data`，声明层再也看不到它们 ⇒ EOF 静默产错树（实测 `let x = [1] as const` 一度变 `divergent`）。
现在 `CompositeInitializerJudge.Build` 建完把 `host.MountedUnit = null`，后缀单元仍归声明层——
它们要么被对应 WP 支持，要么按 C10 显式 throw。

## 3. 目标盘点：7 / 29 交付，其余逐条交接（都有实测原因）

| 目标 | 状态 | 原因 / 交接 |
| --- | --- | --- |
| `obj-literal` `spread-object` `computed-key` `method-shorthand` `getter` `setter` `let-init-object-literal` | ✅ **incremental + 已迁 tts-impl**（7 条） | 本报告交付 |
| `arr-literal` `spread-array` `let-array-init` | ⛔ 仍是 throw（**故意不接管**） | `[...]` 在 `]` 关闭那一格无法区分「初始化器到此结束」与「后面还有后缀代码」：`let x = [1] as const`（A5 的 case）会因此从 throw 变成 divergent / 文案漂移。A5 的 `as-const` 与本形态**同一碰撞点**，需要一条「括号关闭后仍有代码则回退」的判据（建议 A5/Lead 定），或等 E-base 的括号内候选回调做逐元素增量 |
| `let-arrow-init` `let-parenthesized-init` `paren-nested` `arrow-async` `arrow-block` `arrow-default` `arrow-destructure` `arrow-multi` `arrow-rest` `arrow-single` `class-expr` `func-expr` `ternary` `comma-expr` `seq-three` `let-array-init` | ⛔ 仍是 throw | ① `;` 结尾的（`let-arrow-init` / `let-parenthesized-init` / `let-array-init`）**必须等 A6 的 `;` 收口**；② `(`/`=>`/`?`/`class`/`function` 形态的 claim 判据会与 A5（`(a: number) => a`、`(y as T)`、`as`/`satisfies`）和 A2（`?`/`:` 归约）**共享同一格**；`Bracket` 内容在声明层不可见 ⇒ 区分「带类型注解的箭头参数」需要递归检查 Bracket 子单元（可做但本轮预算不够），③ 全部走同一条 `CompositeInitializerJudge.Build` 即可复用，不需要新机制 |
| `while-block-let-close-brace` `function-body-let-close-brace` | ⛔ 仍是 throw | 不是初始化器问题：`符号 }`（块体收口），属 B1/B2 的块级逐字符路径；Lead 已允许跳过 |
| `await-expr` `yield-expr` | ⛔ 仍是 throw | 依赖 `statement-route-util` 的 await/yield 路由（同样的 `符号 }` 阶段），不可达，交接给 B 阶段 |
| `yield-expr` | 跳过 | 按 Lead 指示归 B3 |

## 4. 写域说明（**需要 Lead 确认**）

`typescript/tokens/declarations/variable-declaration-end-possible-shape.xl.md` **不在 task-14 声明的
写域里**，但它是 A4 所有括号形态的**唯一 throw 点**（`declaration 括号` 就来自这里）；不改它，
任何 form 候选都收不到那一格（`EndPossible` 在候选建树之前 throw）。该文件在
`PLAN-all-possible.md` §5.1 的文件所有权表里**没有列给任何 WP**，因此按「无主」处理，只做**最小放行**
（`Claims` 命中才 `Reject`，其余逐字节不变；diff-report 里 373 条非目标 case 逐字段相同可证）。

如果 Lead 认为它属于 A5/A6 或想自己接管，改动可以整段回退（只有 `import` + 一个 `if` 分支）。

## 5. 给后续 WP 的接入指引（同机制可复用）

新增一个「初始化器 = 单个括号/关键字形态」时，三步：

1. **判据**：扩 `CompositeInitializerJudge.SoleCompositeUnit`（或加一个并列的 judge），返回「本形态认领的
   那个单元」；**必须只看 `host.Data` 的单元结构**（禁 `ctx.Text` 等）。
2. **候选**：照 `CompositeInitializerPossibleShape` 写 `ComputeByIndex`（`=`/trivia → `Uncertain`；
   claim 成立 → `Accept`；其余 `Reject`）、`IsBuildable`（形态真的完整了吗）、`BuildByIndex`
   （调 judge 的 build，**建完 `host.MountedUnit = null`**）；注册区加 1 行。
3. **终结候选放行**：在 `variable-declaration-end-possible-shape.xl.md` 的对应 `throw` 前加
   `if (Judge.Claims(units)) return ShapeStates.Reject;`。

四条硬约束（E0b 报告 + 本轮实测补充）：

- `=` / trivia 必须 `Uncertain`（`Reject` 在本条目内永不回来）；
- 目录里始终 ≥2 个活候选（只剩 1 个时 `CatalogGuide` 会在 `=` 处直接建）；
- 同一候选类不得注册两次（否则 `Candidates.size > 1` 永远 Waiting）；
- 建完的状态要能被 `FinishIncremental` 的「唯一表达式根」收口；多根会显式 throw。

## 6. 未竟项 / 风险

1. **INDEX / README 未重生成**：`typescript/cases/tts/INDEX.md` 与 `tts/README.md`（370/45 的计数）、
   `tts-impl/README.md`（45）仍是迁移前数字。按 `PLAN-all-possible.md` §5.1，`INDEX.md` 只由 A7/B7 重生成；
   README 也不在 task-14 写域。迁移契约要求的两处 `--write-index` 留给 A7（本 WP 已按 `git mv` 原样搬家，
   case 内容逐字节未变）。
2. **`git mv` 未产生新目录残留**：`typescript/cases/tts/cases/throw/lexical/` 仍有其它 case，
   `throw/expressions/` 减少 6 条——账本自然从 380 变 373。
3. **数组形态的 `as-const` 碰撞**是后续做 `[...]` 前必须先解决的判据问题（§3 第 2 行）。
4. **未跑既有 gates**（按纪律）；**未 push**；工作目录保留。
5. **`src` 前缀/尾随 trivia 缺陷（缺陷 4）未修**：`let x = { a: 1 }` 的增量 EOF 树里声明/语句 `src`
   右端比 legacy 多出尾随换行（`[4,17)` vs `[4,16)`）——与既有 94 条 `rangeOnlyDifference` 同源，
   B6 收口；账本不比较 `src`，分类不受影响。
