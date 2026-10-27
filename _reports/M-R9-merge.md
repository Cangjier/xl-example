# M-R9 合并报告：无体函数声明在文件末尾收口

- 主仓库：`C:\Users\Admin\Documents\GitHub\xl-example`，`feature/all-possible` @ `0c9a70a3`（R10 已合入 `606bcd6d`，其上再叠一条 R10 报告提交；工作树干净）
- 合并源：`C:\Users\Admin\Documents\GitHub\xl-example-set\r9-declare-fn`，分支 `feature/r9-declare-fn` @ `9c7a5b31`（base `905ddc10`）
- 预检：`git fetch --no-tags ... "feature/r9-declare-fn:refs/merge/r9"` 后三点 diff 只有 2 个文件——`typescript/tokens/declarations/function-declaration-shape.xl.md`（+77）与 `_reports/R9.md`（新增 219 行），与任务清单逐项一致；主仓自 `905ddc10` 起只动了 `core/syntax/basic-tokens/bom.xl.md` 与两份 R10 报告，无重叠
- 方式：`git merge --no-ff refs/merge/r9`，**无冲突**（0 处），除合并本身未手改任何源码
- 合并提交：`3220e27a` `merge(r9): close no-body function declarations at EOF`
- 最终 HEAD：本报告提交（直接父提交 = `3220e27a`）
- 重建：`xl_build`（cwd=仓库，core+typescript → ts）**1 written**（`function-declaration-shape.xl.md` → `dist/ts/.../function-declaration-shape.ts`）/ 634 skipped / **0 error** / 3 warning（3 条既有 E1107 重复类型，非本次引入）；`tsc -p .` **exit 0**

## 验收读数（两档）

| 项目 | 实测 | 预期 |
| --- | --- | --- |
| default gates（incremental） | **4 通过 / 0 失败 / 7 不适用**，exit 0 | 4/0/7 |
| gates `--legacy` | **4 / 0 / 7**，exit 0 | 4/0/7 |
| wide-ast 默认 | **PASS**：崩溃 0/0、差异 **15/33**、fallback 79+13=**92**/85、缺 range 0、越界 0、distOnlyKinds 0、policyProblems 0 | 0/≤15/92 |
| wide-ast `--legacy` | **PASS**：崩溃 0/0、差异 0/0、fallback 2+0=**2**/2 | 0/0/2 |
| real-dts（默认档） | **PASS**：崩溃 0/0、AST 差异 0/33、缺 range 0 | PASS |
| tts（`typescript/cases/tts/run.mjs`） | **PASS 429 / FAIL 0**，exit 0 | 429 |
| `tshape-judge ts-all` | **total 429 / ok 426 / failures 3** | 426/0/3 |
| 7 条 declare function 片段（R9 §2.3 隔离矩阵复建） | **7/7 `status: ok`**（structural / moved / fields 全空） | ≥6 ok |
| `type-mapped-modifier-in-generic.ts` | **仍 diff**（已知残项，非本次引入） | 已知残项 |

关于 `ts-all` 的 exit code：3 条 failure 为登记在案的 `throw/composite/*`；`tshape-judge` 只要有 failure 即 exit 1，属基线行为，`ok` 数未减一条。

## 清理

- `xl-example-set\r9-declare-fn`：先解 `node_modules` junction，再清只读位、整目录删除，已确认不存在
- 父目录 `xl-example-set` 仍有其他条目（r10-bom、r11-as-bang、r8-audit、_reports），按「不删非空目录」保留
- `refs/merge/r9` 已 `update-ref -d` 删除；本仓未新建分支、未删除其他分支
- 未 push、未改源码（除合并本身）、未重生成 INDEX / README
- 本报告以 `git add -f` 提交：`_reports/` 在 `.gitignore` 中，与既有 `M-*-merge.md` 同例

## 结论

R9 在主仓库成立：`FunctionDeclarationShape` 覆写 `TryToClose`，在 EOF 这一次收口里补建整棵 `FunctionDeclaration`（与 TS 的 `node.end` 对齐，不再多 1 字节）。wide-ast 差异由 R10 后的 21 降到 **15**（−6），其余读数全部持平；7 条隔离片段全绿，仅 `type-mapped-modifier-in-generic` 一条既有残项未动。
