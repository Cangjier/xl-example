# REPORT-all-possible-A4c — 表达式收尾：尖括号断言 / 数组 as 断言 / 泛型箭头（阶段交付 4 条）

- **任务**：`task-28`（WP-A4c，表达式收尾；依据 `_coord/PLAN-all-possible.md` §4.1 A4 / §5.1 / §6，A4b 报告 §3/§6）
- **分支**：`feat/a4c`（只提交本地分支，**未 push**）
- **克隆**：`C:\Users\Admin\Documents\GitHub\xl-example-set\a4c-tail`（`node_modules` 是 canonical 的 junction）
- **base**：`base-int` = `_integration/integration/all-possible` @ `b06b3104`（已含 A5 的 26 条迁入 + A4b 的 13 条迁入；**A2c / A3b 尚未合入**）
- **commit**：检查点 `01db3a93`（实现 + 4 条迁移）→ 最终 commit 见文末（本报告与最终代码同一 commit）
- **构建产物**：`dist/ts/**` + `build/ts/**`（gitignored）；`tmp/**` 为 gitignored 证据目录。

## 1. 结论先行

| 项 | 基线（= base-int） | 本 WP 完成后 |
| --- | --- | --- |
| 目标 case（9 条，`--show` 实测） | throw 6 + partial 2 + 1 条属 A3b 待合入 | **4 条 `incremental` 并已迁 tts-impl**；5 条按实测原因交接（§4） |
| `tts` 账本 | PASS 89 / FAIL 0 | **PASS 85 / FAIL 0**（89 − 4 迁出） |
| `tts-impl` | **PASS 335 / FAIL 1**（**基线红 1 条，§0**） | **PASS 339 / FAIL 1**（+4；FAIL 仍是基线那 1 条） |
| 非目标分类漂移 | — | **0**（89 条逐 id 比对 baseline `--json`，只有 4 个目标变化） |
| `xl_build`（core+typescript→ts） | 591 个产物 / 0 error / 3 warning | **0 error / 3 warning（同一批既有 E1107）** |
| `tsc -p .` | exit 0 | **exit 0** |
| 开关 false（legacy） | — | 4 条目标 case 的 **legacy EOF 树全文（含 basic 行与 src）逐字节不变** |
| 确定性 | — | 两次独立进程 `--json` 逐字节相同（tts / tts-impl） |

## 0. ⚠️ 基线红（非本 WP 引入）

在本分支（= `base-int` tip `b06b3104`）上、**改动之前**的读数：

```text
[tts-impl] 336 条 case：incremental 335 / 非 incremental 1
FAIL  types/generic-call-type-args.ts   actual=throw
      reason: CatalogGuide: 没有候选形状可以构成（宿主 BinaryExpressionShape，下标 2）
```

`types/generic-call-type-args`（`const x = f<string>()`，A5 已迁入）在**集成态**增量路径抛
「`CatalogGuide: 没有候选形状可以构成（宿主 BinaryExpressionShape，下标 2）`」——legacy 正常、增量抛错 ⇒
分类 `throw`（不该在 tts-impl）。归因方向：A5 的 typed-arg 早建路径与 A2 的 `BinaryExpressionShape` 宿主目录
在同一批单元上撞车（`BinaryExpressionShape` 被当成宿主、其 `CatalogGuide` 0 候选且无 endPossible）。
**该文件（`expressions/binary-expression-shape` / `binary-expression-possible-shape`）不在 A4c 写域**
（A4c 写域是 `expressions/forms/**` + `expression-shape-catalog` + `variable-declaration-end-possible-shape`），
本 WP 不越权修；已随本报告上报 Lead。**本 WP 完成后 `tts-impl` = PASS 339 / FAIL 1，FAIL 仍是这一条。**

## 2. 目标 case 前后分类（`--show` 实测）

**4 条达成（throw → incremental，已 `git mv`，内容逐字节不变）**

| # | 原 case | 源码 | 迁移后 | legacy EOF 根 |
| --- | --- | --- | --- | --- |
| 1 | `throw/expressions/angle-assert` | `let x = <number>y` | `tts-impl/cases/expressions/angle-assert.ts` | `TypeAssertionExpressionShape` → `NumberKeywordShape` + `IdentifierShape` |
| 2 | `throw/expressions/as-const` | `let x = [1] as const` | `tts-impl/cases/expressions/as-const.ts` | `AsExpressionShape` → `ArrayLiteralExpressionShape` + `TypeReferenceShape`(const) |
| 3 | `throw/types/angle-assertion` | `const x = <T>y` | `tts-impl/cases/types/angle-assertion.ts` | `TypeAssertionExpressionShape` → `TypeReferenceShape` + `IdentifierShape` |
| 4 | `throw/types/generic-arrow-typed-param` | `const f = <T>(a: T) => a` | `tts-impl/cases/types/generic-arrow-typed-param.ts` | `ArrowFunctionShape` → `TypeParameterShape` + `ParameterShape` + `=>` + body |

**5 条未达成（留原目录 / 原标注，逐条原因见 §4）**：`arrow-single`、`ternary`、`assignment`、`ref-new-no-parens`、
`nonnull-assertion`（最后一条按 Lead 约定「A3b 合入后再做」，本分支 A3b 未合入）。

## 3. 实现（2 个新文件 + 3 处接线，全部在 task-28 写域内）

### 3.1 新增 `typescript/tokens/expressions/forms/primary/composite-initializer-tail-judge.xl.md`

`class CompositeInitializerTailJudge` —— A4b 机制（「在初始化器长完那一格整棵建出」）的两种尾形扩展：

| 方法 | 作用 |
| --- | --- |
| `Family(units)` | `=` 之后第一个代码单元决定族：`Symbol("<")` → `"angle"`（尖括号断言 / 泛型箭头）；`[` 括号且 `HasAssertSuffix` → `"as-assert"`（`[1] as const`）。**判据跨步稳定**（不能只看「最后一格的前瞻」，否则 `as` 到达后族会消失、候选被永久 `Reject`）。 |
| `CanWait(units)` | 终结候选的放行判据（无 context/template）：族命中就继续等，不要在 `<`/`>`/括号格按 C10 抛。 |
| `CanBuild(units, template, context)` | 完成闸门：族命中 + legacy `ExpressionBuilder.ParseExpression` **整段吃完** + 最后一个代码单元之后 `NextSignificantChar === ""`。 |
| `Build(host, context)` | 用 legacy 建造器整棵建出，替换 `=` 之后的全部 raw 单元，`host.MountedUnit = null`（A4 报告的坑）。 |

复用 A4b 的 `FirstSignificant` / `LastSignificant` / `RawAfter` / `NextSignificantChar` 与 A4 的 `EqualIndex`
（同一份判据来源，不复制第二套）。

### 3.2 新增 `composite-initializer-tail-possible-shape.xl.md`

候选三入口：`ComputeByIndex`（`=`/trivia → `Uncertain`；族不命中 → `Reject`；命中 → `Accept`）、
`IsBuildable`（`CanBuild`，模板从 `context.Root.Template` 取——`PossibleShape` 没有模板字段）、
`BuildByIndex`（转 `TailJudge.Build`）。

### 3.3 接线（3 处）

| 文件 | 改动 |
| --- | --- |
| `typescript/tokens/expressions/expression-shape-catalog.xl.md` | 注册区 **1 行** `CompositeInitializerTailPossibleShape.AppendTo(shapes); // [A4c]`（在 A4b 行之后）+ 1 行 import |
| `typescript/tokens/expressions/forms/primary/composite-initializer-forms-judge.xl.md`（A4b own） | `Family` 的 `array` 分支：**`]` 之后接 `as`/`satisfies` 时返回 `""`**（新增跨步稳定的 `HasAssertSuffix`），把这一族让给 A4c。否则 A4b 候选在 `as` 到达后重新变回 `array`、与 A4c 候选同格并存，`CatalogGuide` 永远等不到唯一候选（实测：`as-const` 会停在 partial）。 |
| `typescript/tokens/declarations/variable-declaration-end-possible-shape.xl.md` | Symbol 格：`<` / `>` 且 `TailJudge.Family ≠ ""` → `Reject`（等）；括号格：`TailJudge.CanWait` → `Reject`（等）。其余格子逐字不变。 |

**没有碰**：`statement-route-util` / `statement-shape` / `root-expression-statement-possible-shape` /
`variable-declaration-shape`（A5 own）/ `variable-declaration-possible-shape` / A4 的两个 judge/possible 文件 /
A1 的 `forms/primary/*-primary-possible-shape` 与 `primary-atom-guard` / A2 的 `forms/operator/*` 与
`binary-expression-*` / A3 的成员链文件 / `operator-table` / `operator-shape-map` / `shape-operator-stack` /
`direct-*` / `INDEX.md` / `tts/README.md` / `tts-impl/README.md` / `run.mjs`。

### 3.4 端到端路径（`const f = <T>(a: T) => a`）

```text
`=` 之后第一个单元是 Symbol("<") ⇒ TailJudge.Family = "angle"
  `<` / `T` / `>` 各格：EndPossible 在 <,> 上放行（Family 命中）→ 等
  `(a: T)` 参数括号关闭：EndPossible 括号格放行（CanWait）→ 等；A4b 候选 Family="" → Reject（不抢）
  参数里出现 `:` 时 A5 的 type-mode 也会参与（StartsTypedInitializer 命中）——本候选与 A5 都在等，谁先到「长完」
  由 `CanBuild` 判：A5 的 TryBuildTypedInitializer 在参数括号关闭格就能用 legacy ExpressionBuilder 吃完
  ⇒ 实际由谁建都可以，树同源
  `=>` 格：A4b 的 Symbol 分支（Family≠""）放行 → 等
  body `a` 关闭：TailJudge.CanBuild = true（ExpressionBuilder 整段吃完 + 之后只剩输入结束）→ Accept
      EndPossible 在 Common 上 Reject；Candidates 只剩本候选 → IsBuildable → BuildByIndex
      ⇒ legacy ExpressionBuilder.ParseExpression → ArrowFunctionShape（TypeParameter/Parameter/=>/body）
      ⇒ 替换 `=` 之后全部 raw 单元；host.MountedUnit = null
  EOF → VariableDeclarationShape.FinishIncremental（A5 版收口）→ 唯一表达式根收下
```

## 4. 未达成 5 条：实测原因与交接

| 目标 | 现状 | 实测原因 / 交接 |
| --- | --- | --- |
| `arrow-single`（`y => y`） | throw（`declaration 符号 =>`） | A4b 报告 §4 已定位：**A2 的 `BinaryOperatorPossibleShape` 在最后一个 `y` 那格仍存活**（把标识符当可能的左操作数、等一个不存在的运算符），`Candidates.size === 1` 永不成立。A4c 未改 A2 文件；**交 A2c（task-26，正在做「候选互斥修复」）**。修好后在 `Family` 里开回 `arrow` 分支 + 迁 case。 |
| `ternary`（`a ? b : c`） | throw（`declaration 符号 ?`） | 同上（最后一格也是被 A2 候选占住）。同一个 A2c 交接点。 |
| `assignment`（`let x = y = 1`） | partial | 实测：`=` 格上 **A1 的 `NumericLiteralPossibleShape` 与 `IdentifierPrimaryPossibleShape` 都保持存活**（两者对 `Symbol("=")` 都返回 `Uncertain`——那是 E0b 实测定下的约束），到 `1` 那格 numeric 又 `Accept`；`Candidates` 永远 ≥2 ⇒ 候选建不出来、只能 EOF 兜底。**交 A1b/A2c 的候选收敛修复**（task-25/26）：让「不是本候选形态」的原子在续接单元处 `Reject`（或 E-base 提供候选收敛钩子）。 |
| `ref-new-no-parens`（`let x = new C`） | partial | 实测：`new` 是普通 Common，**A1 的 `IdentifierPrimaryPossibleShape` 在 `new` 与 `C` 两格都 `Accept`**（`PrimaryAtomGuard` 只让 `IsBuildable` 收敛、候选仍存活）⇒ `Candidates.size` 永远 ≥2。**交 A1b/A2c 的同一处收敛修复**。 |
| `nonnull-assertion`（`const x = y!`） | throw（`declaration 符号 !`） | 按 Lead 约定「A3b 合入后再做」；本分支 A3b（task-25）**未合入**，`!` 仍由 EndPossible 显式 throw。A4c 已把「尾形候选 + EndPossible 放行」的骨架搭好，A3b 合入后按 §6 第 3 步加一条 `Family` 分支（`first Common + lookahead "!"`）即可。 |

> 这 5 条都**不是** A4c 判据本身的问题：3 条（assignment / new / arrow-single·ternary 的一部分）的根因是
> **同一目录里的其它候选在该格仍存活**，需要 A1b/A2c 的「候选互斥/收敛」修复（task-25/26 正在做）；
> 另 1 条是 A3b 未合入。A4c 保持它们原来的账本分类（throw/partial），零漂移。

## 5. 证据

### 5.1 EOF 树一致性（identity=(类名,pos)）

- 探针 `tmp/probe.mjs`（gitignored）：同一进程跑 legacy / incremental 两遍（逐字符 + EOF），输出「EOF shape
  行（剥 `src`）是否一致」与每个非 basic 节点的**首次出现步号**。
- 4 条达成 case：`EOF shape 行一致: true` ×4；形状根首次出现步号全部 `EARLIER`
  （例：`as-const` 的 `AsExpressionShape@pos=7` legacy=21 → incremental=20；`angle-assert` 的
  `TypeAssertionExpressionShape@pos=7` 提前到 `y` 关闭格；`generic-arrow-typed-param` 的
  `ArrowFunctionShape@pos=9`/`TypeParameterShape@pos=11` 等全部早于 legacy 的 EOF 格）。
- 一致性来源是构造性的：形状由 **legacy `ExpressionBuilder`** 建，Positions 首格 = `=` 的 `EndIndex`（C1）。

### 5.2 开关 false 逐字节不变

- 改动前对 9 条目标跑探针（`tmp/probe-baseline.txt`），改动后对迁入 tts-impl 的 4 条再跑
  （`tmp/probe-final.txt`），用 `tmp/legacy-diff.mjs` 按 **case 源码**对齐、抽出 **legacy EOF 树全文
  （含 basic 行与 `src`，不剥）** 逐字节比较 → **`ALL LEGACY EOF TREES BYTE-IDENTICAL`**（4/4，exit 0）。
- 机械门控：新候选/判据只在 `VariableDeclarationShape` 的 `CatalogGuide`（增量路径）里被调用；
  开关 false 时 `IncrementalVariableStatementBuilder.Build` 不执行 ⇒ `ExpressionCatalogFactory.Create()`、
  A4c 候选一次都不实例化，legacy 的 `StatementBuilder` 原子建树逐字节不变。

### 5.3 验收命令读数（最终）

```text
xl_build { cwd:<克隆>, paths:["core","typescript"], targets:["ts"] }  → 0 error / 3 warning（同一批既有 E1107）
node node_modules/typescript/bin/tsc -p .                             → exit 0
node typescript/cases/tts/run.mjs                                      → [tts] PASS 85 / FAIL 0 / 85（exit 0）
node typescript/cases/tts-impl/run.mjs                                 → [tts-impl] PASS 339 / FAIL 1 / 340
                                                                        （FAIL = 基线既有的 types/generic-call-type-args，§0）
两次独立进程 --json：tts / tts-impl 各自逐字节相同
```

## 6. 给后续 WP 的接入指引

1. **尾形扩展的固定三步**（A4b → A4c 已验证两遍）：
   (a) 在 `Family` 里加一个**跨步稳定**的族判据（不能只看「最后一格的前瞻」，否则中间格会丢族）；
   (b) 在 `CanBuild` 里沿用「legacy 建造器整段吃完 + 之后只剩输入结束」；
   (c) 在终结候选 `variable-declaration-end-possible-shape` 的 Symbol/括号分支各加一条 `CanWait` 放行。
2. **同格候选共存是唯一的硬约束**：`CatalogGuide` 只在 `Candidates.size === 1` 时建——新形态要么与同族候选
   **互斥**（A4b×A4c 用 `HasAssertSuffix` 划清边界），要么先修共存候选（A1b/A2c 的收敛修复）。
3. **A3b 合入后做 `nonnull-assertion`**：`Family` 加 `first Common && RawAfter(first,1)=="!"` → `"nonnull"`；
   EndPossible 的 Symbol 分支对 `!` 在族命中时放行；`CanBuild` 用同一个 `ExpressionBuilder`（legacy 里
   `y!` → `NonNullExpressionShape`，`Pos` = 前一个非 trivia 单元 `EndIndex`）。
4. **A2c 合入后开回 `arrow-single` / `ternary`**：把 A4b `Family` 里被注释掉的 `arrow`/`ternary` 分支开回
   （A4c 未改动这两族，只在报告里保留交接），然后 `--show` 确认 `incremental` 再迁 case。
5. **`assignment` / `new` 不要在 A4c/A6 里做**：根因在 A1 原子候选的存活判据（对 `Symbol("=")` / 续接单元仍
   `Accept`），先修 A1b/A2c 的互斥，再回来用尾形机制接管（届时应只剩「最后一个单元不是原子」的形态）。

## 7. 风险与未竟项

| 风险 / 未竟项 | 说明 / 处置 |
| --- | --- |
| **基线红 1 条**（`types/generic-call-type-args`） | 非本 WP 引入（§0）；修复点在 A5×A2 的 `BinaryExpressionShape` 宿主目录，A4c 写域之外；已报告 Lead。 |
| `arrow-single` / `ternary` / `assignment` / `ref-new-no-parens` / `nonnull-assertion` | 5 条全部有逐条实测交接（§4）；均依赖 task-25/26/27 或 A2c 的候选收敛/A3b 合入，不是 A4c 判据缺口。 |
| 两处 `INDEX.md` / 两个 `README` 的「现状」表 | 按 `PLAN` §5.1 归 A7/B7 重跑 `--write-index`；本 WP 未改。 |
| `src` 尾随 trivia（缺陷 4） | 未修；增量 EOF 树的声明/语句 `src` 右端比 legacy 多尾随换行（与既有 `rangeOnlyDifference` 同源），账本不比较 `src`，B6 收口。 |
| `Family` 的文档前瞻与注释 | `NextSignificantChar` 跳过空白与两种注释；注释出现在「结尾判定」位置时按非空字符处理（保守：不提前建树 → 落回原 throw，不会 divergent）。 |

## 8. 最终状态

- 分支 `feat/a4c`；工作区干净（`tmp/` 全 gitignored，未提交）；**未 push**；目录保留。
- 检查点 `01db3a93`；最终 commit = 本文件所在 commit。
- 最终读数：`xl_build` 0 error / `tsc` exit 0 / `tts` PASS 85 FAIL 0 / `tts-impl` PASS 339 FAIL 1（= 基线既有 1 条）
  / 4 条 legacy EOF 树逐字节一致 / 非目标漂移 0 / 两次 `--json` 相同。
