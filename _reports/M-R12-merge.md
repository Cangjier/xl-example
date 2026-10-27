# M-R12 合并报告：`async` 换行 ASI 拆分 + 裸露 `yield` 保持上下文

- 主仓库：`C:\Users\Admin\Documents\GitHub\xl-example`，分支 `feature/all-possible`
- 合并源：`feature/r12-async` @ `bd8d4a20`（`9d3fb9bc` + `bd8d4a20`，base `99a70d93`），取自 `C:\Users\Admin\Documents\GitHub\xl-example-set\r12-async`
- 预检：`git fetch --no-tags ... "feature/r12-async:refs/merge/r12"`，`git merge-base` = `99a70d93`（正是 `$BASE`）；三点 diff 只有 5 个文件——`function-declaration-possible-shape.xl.md`（±103 行）、`variable-declaration-end-possible-shape.xl.md`（+8）、`variable-declaration-shape.xl.md`（+24）、`identifier-primary-possible-shape.xl.md`（+29）、`_reports/R12.md`（新增 177 行），与任务清单逐项对应
- 方式：`git merge --no-ff refs/merge/r12 -m "merge(r12): async ASI split + contextual yield"`，**无冲突**（0 处），除合并本身未手改任何源码
- 合并提交：`ea0d46a8`（父提交 `99a70d93` + `bd8d4a20`）
- 最终 HEAD：本报告提交（直接父提交 = `ea0d46a8`）

## 基底记账（开工时的脏文件）

开工复核 HEAD 确为 `99a70d93`，但工作树有一处**非本趟**的未提交改动：`typescript/IMPORTANCE.md` 少了一行只有空格的空 bullet（`1 file changed, 1 deletion`）。这是前序代理留下的空白噪音、与 R12 无关，按「不改源码」处理：先把 `git diff` 备份到 `%TEMP%\r12-importantmd-backup.diff`，再 `git checkout --` 还原，使 `$BASE` 处的树逐字等于 `99a70d93`。回滚脚本因此不需要额外账目。

## 重建

`xl_build`（cwd=仓库，`core` + `typescript` → `ts`）**4 written / 631 skipped / 0 error / 3 warning**：写出 `function-declaration-possible-shape.ts`、`variable-declaration-end-possible-shape.ts`、`variable-declaration-shape.ts`、`identifier-primary-possible-shape.ts` 四件产物（正是本趟改动的四个源页，其余 631 件命中缓存）。3 条 warning 是既有 E1107 重复类型（`GetAccessorPossibleShape` / `IndexSignaturePossibleShape` / `SetAccessorPossibleShape`），与 R11 记录逐字相同，非本趟引入。`tsc -p .` **exit 0**。

## 验收读数（两档，本机实测）

| 项目 | 实测 | 预期 | 判定 |
| --- | --- | --- | --- |
| default gates（incremental） | **4 通过 / 0 失败 / 7 不适用**，exit 0 | 4/0/7 | 一致 |
| gates `--legacy` | **4 / 0 / 7**，exit 0 | 4/0/7 | 一致 |
| wide-ast 默认 | **PASS**：崩溃 0/0、差异 **10/33**、fallback **76+13=89**/85、缺 range 0、越界 0、distOnlyKinds 0、policyProblems 0 | 0 / 10 / 89 | 一致 |
| wide-ast `--legacy` | **PASS**：崩溃 0/0、差异 0/0、fallback 2+0=**2**/2 | 0/0/2 | 一致 |
| real-dts（默认档） | **PASS**：226 文件、崩溃 0/0、AST 完全一致 226、差异 0/33、缺 range 0 | PASS | 一致 |
| tts（`typescript/cases/tts/run.mjs`） | **[tts] PASS 429 / FAIL 0 / 429**（throw 期望 3 实测 3；incremental 期望 426 实测 426），exit 0 | 429 | 一致 |
| `tshape-judge ts-all` | **total 429 / ok 426 / failures 3** | 426/0/3 | 一致 |
| `tshape-judge ts gap-sweep-linecomment-async-01.ts` | **status: ok**，exit 0 | ok | 一致 |
| `tshape-judge ts gap-sweep-newline-async-01.ts` | **status: ok**，exit 0 | ok | 一致 |
| `tshape-judge ts ex-await-yield.ts` | **incremental-error** @ `line 9: const d = yield 1`，exit 1 | 已知未完成 | 一致 |
| 「原来通过现在失败」 | **0 条** | 0 | 一致 |

三条 failure 逐条核对，仍是登记在案的 `throw/composite`：`class-ball.ts`、`expression-zoo.ts`、`generic-container.ts`（本次直接读了 `tmp/tshape-judge/ts-all.json` 的 `details`，三件的 `status` 全是 `incremental-error`，与 R11 名单逐字相同）。`tshape-judge` 只要有 failure 就 exit 1，属基线行为；`ok` 数未减一条（426 = 426）。

`ex-await-yield.ts` 仍是 `incremental-error`，且**行号与列位置与基线逐字相同**（`line 9: const d = yield 1`，插入符指向 `yield`），不是本趟引入的退步，见 `_reports/R12.md` §6 的卡点说明。

## 「0 条原来通过现在失败」的证据口径

- default wide-ast 的 10 条 DIFF 逐文件：`gap-sweep-linecomment-clsmod-01`、`gap-sweep-newline-clsmod-01`、`ex-await-yield`、`ex-unary-ops`、`expr-lambda-then-compound-assign`、`expr-tagged-template-nested-tag`、`expr-generic-inst-statement`、`stmt-adversarial-shapes`、`stmt-r1236-value-word-brace`、`type-mapped-modifier-in-generic`。这正是 R11 的 12 条**减去** `gap-sweep-linecomment-async-01` 与 `gap-sweep-newline-async-01` 两条（本趟转绿、整条从清单消失），**没有一条新出现的文件名**。
- 差异数 10 < R11 的 12，方向为单向下行；同时三条不变量守住：崩溃 0/0 不变、`ts-all` ok 恒为 426、`tts` PASS 恒为 429、`--legacy` 仍 0/0/2。故不存在「OK→DIFF 被别处改善掩盖」的净负情形。
- 两条目标 `gap-sweep-*-async-01` 已在 `tshape-judge ts` 下各得 `status: ok`（exit 0），wide-ast 清单里也已不再出现，两处读数互相印证。

## 代码落地自证

合并后 `dist/ts` 重建产物中可直接读到两侧改动：

- `dist/ts/typescript/tokens/declarations/function-declaration-possible-shape.ts`：`BuildAsiSplitModifier`（`async` / `declare` 与 `function` 之间是注释或换行时按 ASI 拆分），来自 9d3fb9bc
- `dist/ts/typescript/tokens/expressions/forms/primary/identifier-primary-possible-shape.ts`：`ContextualExpressionWords = ["yield"]`，让裸露的 `yield` 留在上下文关键字一侧而不是被当成标识符
- `dist/ts/typescript/tokens/declarations/variable-declaration-end-possible-shape.ts` 与 `variable-declaration-shape.ts`：两处 `[R12:BLOCK-CLOSE]` 判据——裸 `}` 视为外层块体括号的收口符、不当初始化器的续接（`function* gen()` ⏎ `const c = yield` ⏎ `}` 的收尾）
- `dist/ts/typescript/tokens/expressions/expression-builder.ts:479`：`const yieldExpression = this.ParseYield();`，`ParseYield` 的 generator 分支是裸露 `yield` 的生成侧

## 验收后状态

- 未重生成 INDEX / README；未 push；未新建分支；未改源码（除合并本身）
- 本报告以 `git add -f` 提交：`_reports/` 在 `.gitignore` 中，与既有 `M-*-merge.md` 同例
- 最终 `git status --short` 为空

## 结论

R12 在主仓库成立：增量路径补回了 legacy 本来就有、增量分支漏掉的 `async` ⏎ `function` / `async` //c ⏎ `function` 的 ASI 拆分，且裸露 `yield` 不再被原子里候选当成标识符。两条 `gap-sweep-*-async-01` 转为 **ok**，default wide-ast 差异 12 → **10**（≤ 上限）、fallback **89 = 89**，`--legacy` 0/0/2，gates 双档 4/0/7，real-dts / tts / ts-all 与登记值逐字一致，**0 条回退**；`ex-await-yield` 仍是同一行同一列的 `incremental-error`（已知未完成，非本趟引入）。
