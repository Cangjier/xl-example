# M-R13 合并报告：函数声明末尾 code 单元判 `{` 为体（ambient body detection）

- 主仓库：`C:\Users\Admin\Documents\GitHub\xl-example`，分支 `feature/all-possible`
- 合并源：`feature/r13-mapped` @ `bd51db99`（base `71109ea2`），取自 `C:\Users\Admin\Documents\GitHub\xl-example-set\r13-mapped`
- 预检：`git fetch --no-tags ... "feature/r13-mapped:refs/merge/r13"`；`git merge-base` = `71109ea2`（正是 `$BASE`）；三点 diff 只有 2 个文件——`typescript/tokens/declarations/function-declaration-end-possible-shape.xl.md`（+15/−12，27 行）、`_reports/R13.md`（新增 167 行）
- 方式：`git merge --no-ff refs/merge/r13 -m "merge(r13): ambient body detection from last code unit"`，**无冲突，0 处**，除合并本身未手改任何源码
- 合并提交：`27a07b39`（父提交 `71109ea2` + `bd51db99`）
- 最终 HEAD：本报告提交（直接父提交 = `27a07b39`）
- 改动内容：`hasBody/ambient` 判据只认末尾 code 单元的 `{`，且 `TypeBuilder.IsBodyBrace` 认作体；未动 R9 `TryToClose`，未动 mapped / type-builder

## 重建

`xl_build`（cwd=仓库，`core` + `typescript` → `ts`）：**1 written / 634 skipped / 0 error / 3 warning**。唯一写出的是 `function-declaration-end-possible-shape.ts`，正是本趟唯一改动的源页；3 条 warning 是既有的 E1107 重复类型（`GetAccessorPossibleShape` / `IndexSignaturePossibleShape` / `SetAccessorPossibleShape`），与 R11/R12 逐字相同，非本趟引入。`tsc -p .` **exit 0**。

## 验收读数（两档，本机实测）

| 项目 | 实测 | 预期 | 判定 |
| --- | --- | --- | --- |
| default gates（incremental） | **4 通过 / 0 失败 / 7 不适用**，exit 0 | 4/0/7 | 一致 |
| gates `--legacy` | **4 / 0 / 7**，exit 0 | 4/0/7 | 一致 |
| wide-ast 默认 | **PASS**：崩溃 0/0、差异 **9/33**、fallback **76+13=89**/85、缺 range 0、越界 0、distOnlyKinds 0、policyProblems 0 | 0 / 9 / 89 | 一致 |
| wide-ast `--legacy` | **PASS**：崩溃 0/0、差异 0/0、fallback 2+0=**2**/2、缺 range 0、越界 0 | 0/0/2 | 一致 |
| real-dts（默认档） | **PASS**：226 文件、崩溃 0/0、AST 完全一致 226、差异 0/33、缺 range 0 | PASS | 一致 |
| tts（`typescript/cases/tts/run.mjs --quiet`） | **`[tts] PASS 429 / FAIL 0 / 429`**，exit 0 | 429 | 一致 |
| `tshape-judge ts-all` | **total 429 / ok 426 / failures 3** | 426/0/3 | 一致 |
| `tshape-judge ts tests/cases/token/types/type-mapped-modifier-in-generic.ts` | **`status: ok`**（structural / moved / fields 全空），exit 0 | ok | 一致 |
| 「原来通过现在失败」 | **0 条** | 0 | 一致 |

三条 failure 逐条核对，仍是登记在案的 `throw/composite` 三条 `incremental-error`：`class-ball.ts`、`expression-zoo.ts`、`generic-container.ts`（直接读 `tmp/tshape-judge/ts-all.json` 的 `details`，三件 `status` 全为 `incremental-error`，与 R12 名单逐字相同；`tshape-judge` 只要有 failure 就 exit 1，属基线行为）。

## 「0 条原来通过现在失败」的证据口径

default wide-ast 的 9 条 DIFF 逐文件：`gap-sweep-linecomment-clsmod-01`、`gap-sweep-newline-clsmod-01`、`ex-await-yield`、`ex-unary-ops`、`expr-lambda-then-compound-assign`、`expr-tagged-template-nested-tag`、`expr-generic-inst-statement`、`stmt-adversarial-shapes`、`stmt-r1236-value-word-brace`。这正是 R12 的 10 条**减去** `type-mapped-modifier-in-generic` 一条（本趟修好的目标），**没有一条新出现的文件名**。差异数 10 → 9 为单向下行；同时三条不变量守住：崩溃 0/0 不变、`ts-all` ok 恒为 426、`tts` PASS 恒为 429、`--legacy` 仍是 0/0/2。故不存在「OK→DIFF 被别处改坏掩盖」的净负情形。

## 代码落地自证

合并后 `dist/ts` 重建产物 `dist/ts/typescript/tokens/declarations/function-declaration-end-possible-shape.ts` 里可直接读到：`hasBody/ambient` 只在末尾 code 单元为 `{` 时成立，并经 `TypeBuilder.IsBodyBrace` 认作体；`type-mapped-modifier-in-generic.ts` 由 DIFF 变为 `ok` 正是该判据生效的对外证据。

## 清理

- `C:\Users\Admin\Documents\GitHub\xl-example-set\r13-mapped`：`node_modules` 是指向主仓库 `node_modules` 的 junction，先解链（`Directory.Delete(..., false)`，不跟进目标）再删整棵目录
- 分支：set 仓库内 `feature/r13-mapped` 已删；主仓库 `refs/merge/r13` 已 `update-ref -d`
- `xl-example-set\r8-audit` 保留（非本趟产物）

## 验收后状态

- 未重生成 INDEX / README；未 push；未新建分支；未改源码（除合并本身）
- 本报告以 `git add -f` 提交：`_reports/` 在 `.gitignore` 中，与既有 `M-*-merge.md` 同例
- 最终 `git status --short` 为空

## 结论

R13 在主仓库成立：函数声明末尾的 `{` 只有作为末尾 code 单元时才被当作 body，`declare`/ambient 形式的空体判定与 `TypeBuilder.IsBodyBrace` 对齐。目标用例 `type-mapped-modifier-in-generic.ts` 转为 **ok**，default wide-ast 差异 10 → **9**（= 上限 9），fallback **89 = 89**，`--legacy` 0/0/2，gates 双档 4/0/7，real-dts / tts / ts-all 与登记值逐字一致，**0 条回归**。
