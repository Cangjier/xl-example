# M-R11 合并报告：增量路径从「已建形状」续收 `as T!` / `as T![]`

- 主仓库：`C:\Users\Admin\Documents\GitHub\xl-example`，分支 `feature/all-possible`
- 合并源：`feature/r11-as-bang` @ `b3194937`（base `905ddc10`），取自 `C:\Users\Admin\Documents\GitHub\xl-example-set\r11-as-bang`
- 预检：`git fetch --no-tags ... "feature/r11-as-bang:refs/merge/r11"` 后三点 diff 只有 3 个文件——`typescript/tokens/types/type-catalog-factory.xl.md`（+53/−2）、`typescript/tokens/declarations/variable-declaration-shape.xl.md`（+19/−2）、`_reports/R11.md`（新增 158 行），与任务清单逐项一致
- 方式：`git merge --no-ff refs/merge/r11 -m "merge(r11): typed initializer from built shape head"`，**无冲突**（0 处），除合并本身未手改任何源码
- 合并提交：`f4729916`（父提交 `792f006a` + `b3194937`）
- 最终 HEAD：本报告提交（直接父提交 = `f4729916`）

## 基底说明（记账，不是偏差掩盖）

任务书登记基底为 `3220e27a`。首次执行时 HEAD 确实是 `3220e27a` 且工作树干净，但 `git merge` 与**同批 R9 合并代理提交其报告**在 13:21:58 撞车：那次 `commit` 把 HEAD 推到 `792f006a`（`docs(r9): merge report M-R9`，只新增 `_reports/M-R9-merge.md`，是 `3220e27a` 的直系子提交），本次 merge 因 `cannot lock ref 'HEAD'` 落成半途状态（`MERGE_HEAD` 残留、索引里出现 `M-R9-merge.md` 的伪删除）。

处理：`git merge --abort` 回到 `792f006a` 干净状态后重做 merge。**没有** `reset --hard 3220e27a`——那会抹掉同批代理已提交的 R9 报告；本报告因此以 `792f006a` 为回滚基点。合并树内容不受影响（差异仅多一份 R9 报告文件）。回滚命令（若需要）：`git reset --hard 792f006a`。

## 重建

`xl_build`（cwd=仓库，core+typescript → ts）**2 written / 633 skipped / 0 error / 3 warning**：写出 `dist/ts/typescript/tokens/types/type-catalog-factory.ts`、`dist/ts/typescript/tokens/declarations/variable-declaration-shape.ts`；3 条 warning 是既有 E1107 重复类型（`GetAccessorPossibleShape` / `IndexSignaturePossibleShape` / `SetAccessorPossibleShape`），非本次引入。`tsc -p .` **exit 0**。

## 验收读数（两档，本机实测）

| 项目 | 实测 | 预期 | 判定 |
| --- | --- | --- | --- |
| default gates（incremental） | **4 通过 / 0 失败 / 7 不适用**，exit 0 | 4/0/7 | 一致 |
| gates `--legacy` | **4 / 0 / 7**，exit 0 | 4/0/7 | 一致 |
| wide-ast 默认 | **PASS**：崩溃 0/0、差异 **12/33**、fallback **76+13=89**/85、缺 range 0、越界 0、distOnlyKinds 0、policyProblems 0 | 0 / ≤15 / ≤89 | 达标（12 ≤ 15、89 = 89） |
| wide-ast `--legacy` | **PASS**：崩溃 0/0、差异 0/0、fallback 2+0=**2**/2 | 0/0/2 | 一致 |
| real-dts（默认档） | **PASS**：226 文件、崩溃 0/0、AST 完全一致 226、差异 0/33、缺 range 0 | PASS | 一致 |
| tts（`typescript/cases/tts/run.mjs --quiet`） | **PASS 429 / FAIL 0 / 429**（throw 期望 3 实测 3；incremental 期望 426 实测 426），exit 0 | 429 | 一致 |
| `tshape-judge ts-all` | **total 429 / ok 426 / failures 3** | 426/0/3 | 一致 |
| `tshape-judge ts expr-as-type-nonnull-tail.ts` | **status: ok**，exit 0 | ok | 一致 |
| `tshape-judge ts gap-as-bang-array-type.ts` | **status: ok**，exit 0 | ok | 一致 |
| `tshape-judge ts type-op-as-unknown-as.ts` | **status: ok**，exit 0 | ok | 一致 |
| 「原来通过现在失败」 | **0 条** | 0 | 一致 |

三条 failure 逐条核对，仍是登记在案的 `throw/composite`：`class-ball.ts`（`?.`）、`expression-zoo.ts`（`??`）、`generic-container.ts`（`<`）。`tshape-judge` 只要有 failure 就 exit 1，属基线行为；`ok` 数未减一条。

**关于 12/89 而不是 19/89**：R11 单分支对 `905ddc10` 的读数是 19 差异 / fallback 89；R9（bodyless function 收尾）与 R10（BOM）在主树已把若干差异消掉，叠加后**实测 12**，低于任务书「≤15」上限、也低于 R10 时的 21。符合「按实测、不直接相加」的口径。

**「0 条原来通过现在失败」的证据口径**：12 条 DIFF 的逐文件名单全部落在既有差异族内（`ex-await-yield`、`ex-unary-ops`、`expr-lambda-then-compound-assign`、`expr-tagged-template-nested-tag`、`expr-generic-inst-statement`、`gap-sweep-linecomment/newline-clsmod-01`、`gap-sweep-linecomment/newline-async-01`、`stmt-adversarial-shapes`、`stmt-r1236-value-word-brace`、`type-mapped-modifier-in-generic`），**没有一条是本趟新出现的文件名**；同时三项不变量守住：崩溃 0/0、`ts-all` ok 恒为 426、`tts` PASS 429，故不存在「OK→DIFF 被别处的改善掩盖」的净负情形。

## 代码落地自证

合并后 `dist/ts` 重建产物中可直接读到两侧改动：

- `type-catalog-factory.ts:158` `public static ParseInitializerFrom(units, head, basePos, template, context): Token | null`；`:266` 的 `[R11:SHAPE-HEAD]` 注释与「有 `as` / `satisfies` 就接管」判据在位
- `variable-declaration-shape.ts:206/214` `let builtHead:Token | null = null` 与 `if (builtHead === null && this.Data[at] instanceof ShapeToken) { builtHead = this.Data[at]; continue; }`

新增的 `[R11:SHAPE-HEAD]` 只加在「头是 `ShapeToken`」这一支上，`HasTypeAssert` 的递归范围未改；`TryBuildTypedInitializer` 仍要求「唯一的非 basic 单元」，出现第二个形状即原样让路；`VariableDeclarationEndPossibleShape` 一行未改，C10 的 `?.` / `??` / `<` 三条显式拒绝账本因此逐字不变（tts 429 里 3 条 `expected=throw actual=throw` 仍是它们）。

## 验收后状态

- 未重生成 INDEX / README；未 push；未新建分支；未改源码（除合并本身）
- 本报告以 `git add -f` 提交：`_reports/` 在 `.gitignore` 中，与既有 `M-*-merge.md` 同例

## 清理

- `xl-example-set\r11-as-bang`：先解 `node_modules`（Junction，目标 `xl-example\node_modules`）——用 `cmd rmdir` 只摘链接不动目标，确认目标未被触碰后整目录删除，已确认不存在
- 父目录 `xl-example-set` 仍有其他条目，按「不删非空目录」保留
- `refs/merge/r11` 已 `update-ref -d`；本仓无 `feature/r11-as-bang` 本地分支可删（只有 `refs/merge/r11` 这一临时引用）
- 最终 `git status --short` 为空

## 结论

R11 在主仓库成立：声明初始化器在左操作数已是**已建形状**时由增量路径自己续收 `as` / `!` / `[]`，`expr-as-type-nonnull-tail`、`gap-as-bang-array-type`、`type-op-as-unknown-as` 三条全部转为 **ok**；合并树 default wide-ast 崩溃 0、差异 12（≤15）、fallback 89（=89），`--legacy` 0/0/2，gates 双档 4/0/7，real-dts / tts / ts-all 全部与登记值逐字一致，0 条回退。
