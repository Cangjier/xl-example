# M-R10 合并报告：BOM 先收尾上一单元再挂载

- 主仓库：`C:\Users\Admin\Documents\GitHub\xl-example`，基底分支 `feature/all-possible` @ `905ddc10`（工作树干净）
- 合并源：`feature/r10-bom` @ `ecb70396`（base `905ddc10`），取自 `C:\Users\Admin\Documents\GitHub\xl-example-set\r10-bom`
- 预检：`git fetch --no-tags ... "feature/r10-bom:refs/merge/r10"` 之后的三点 diff 只有 2 个文件——`core/syntax/basic-tokens/bom.xl.md`（+15/−1）与 `_reports/R10.md`（新增 177 行），与任务清单逐项一致
- 方式：`git merge --no-ff refs/merge/r10`，**无冲突**（0 处），除合并本身未手改任何源码
- 合并提交：`606bcd6d` `merge(r10): BOM closes previous unit before mounting`
- 最终 HEAD：本报告提交（直接父提交 = `606bcd6d`）
- 重建：`xl_build`（cwd=仓库，core+typescript → ts）**1 written**（`core/syntax/basic-tokens/bom.xl.md` → `dist/ts/core/syntax/basic-tokens/bom.ts`）/ 634 skipped / **0 error** / 3 warning（3 条既有 E1107 重复类型，非本次引入）；`tsc -p .` **exit 0**

## 验收读数（两档）

| 项目 | 实测 | 预期 |
| --- | --- | --- |
| default gates（incremental） | **4 通过 / 0 失败 / 7 不适用**，exit 0 | 4/0/7 |
| gates `--legacy` | **4 / 0 / 7**，exit 0 | 4/0/7 |
| wide-ast 默认 | **PASS**：崩溃 0/0、差异 **21/33**、fallback 79+13=**92**/85、缺 range 0、越界 0、policyProblems 0 | 0/21/92 |
| wide-ast `--legacy` | **PASS**：崩溃 0/0、差异 0/0、fallback 2+0=**2**/2 | 0/0/2 |
| real-dts（默认档） | **PASS**：226 文件、崩溃 0/0、AST 差异 0/33、缺 range 0 | PASS |
| tts（`typescript/cases/tts/run.mjs --quiet`） | **PASS 429**，exit 0 | 429 |
| `tshape-judge ts-all` | **total 429 / ok 426 / failures 3** | 426/0/3 |
| `tshape-judge ts tests/cases/token/lexical/lex-bom-midcode.ts` | **status: ok**（structural / moved / fields 全空），exit 0 | ok |
| 「原来通过现在失败」 | **0** | 0 |

关于 `ts-all` 的 exit code：那 3 条 failure 是登记在案的 `throw/composite/*`；`tshape-judge` 只要有 failure 就返回 **exit 1**，属基线行为，读数 426/0/3 与登记值逐字一致，`ok` 数未减一条。

## 清理

- `xl-example-set\r10-bom`：先解 `node_modules` junction，再清只读位、整目录删除，已确认不存在
- 父目录 `xl-example-set` 仍有其他条目（r10-bom, r11-as-bang, r8-audit, r9-declare-fn, _reports），按「不删非空目录」保留
- `refs/merge/r10` 已 `update-ref -d` 删除；本仓未新建分支、未删除其他分支
- 未 push、未改源码（除合并本身）、未重生成 INDEX / README
- 本报告以 `git add -f` 提交：`_reports/` 在 `.gitignore` 中，与既有 `M-*-merge.md` 同例

## 结论

R10（R8 审计 #13，类 3）在主仓库成立：`Bom.Transit` 先 `last.TryToClose` 上一单元、`Built` 时 `Reload`，BOM 重新作为根的 trivia 落到新语句之后；`lex-bom-midcode` 由 diff 转为 **ok**，wide-ast 差异由 22 降到 **21**，其余读数全部持平。