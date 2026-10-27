# M-R5 合并报告：语句拥有尾随分号

- 主仓库：`xl-example`，合并前 `feature/all-possible` @ `e11272f3`（工作树干净）
- 待合并：`fd5a8fdd`（base `e11272f3`，线性祖先）
- 来源异常（如实记录）：`C:\Users\Admin\Documents\GitHub\xl-example-set\r5-semicolon` 已不存在，
  `git fetch` 报 `fatal: does not appear to be a git repository`（exit 128）。该 commit 已在本仓库内，
  挂在本地分支 `feature/r5-semicolon` 上（reflog：`11:00:26 checkout → 11:09:13 commit fd5a8fdd`）。
  因此合并按 commit 哈希进行，等价于“取来源 commit → 合入”。`refs/merge/r5` 未能建立（来源不可 fetch）。
- 三点 diff 预检：`e11272f3...fd5a8fdd` = 3 文件 / +346 / -12，merge-base == `e11272f3`
- 合并：`git merge --no-ff fd5a8fdd -m "merge(r5): statement owns trailing semicolon"` → **0 冲突**，
  merge commit `44f70c6c35ff9790477d7d23c4e895168bea0e64`（父：`e11272f3` + `fd5a8fdd`）；合并结果树与 `fd5a8fdd` 完全一致（`git diff fd5a8fdd HEAD` 为空）

## 合并内容

| 类型 | 文件 |
| --- | --- |
| 新增 | `_reports/R5.md` |
| 修改 | `typescript/tokens/declarations/variable-declaration-shape.xl.md`（`TrailingSemicolon` / `TakeTrailingSemicolon`） |
| 修改 | `typescript/tokens/statements/variable-statement-shape.xl.md`（`AdoptTrailingSemicolon` / `TrimEndToLastCodeUnlessSemicolon`） |

## 结构

- `xl_build`（cwd=repo，paths=`core`+`typescript`，target=`ts`）：**0 written / 635 skipped / 0 error / 3 warning**
  （`E1107` 重复类型声明，合并前既有：`class-get-accessor` / `class-index-signature` / `class-set-accessor`）
- `tsc -p .`：**exit 0**

## 验收（两档读数）

| 项目 | 期望 | 实测 | 结论 |
| --- | --- | --- | --- |
| `gates`（default） | 4/0/7 | 4 通过 / 0 失败 / 7 不适用 | 一致 |
| `gates --legacy` | 4/0/7 | 4 通过 / 0 失败 / 7 不适用 | 一致 |
| `wide-ast`（default） | 0/23/92 | 崩溃 0 / 差异 23 / fallback 92 | PASS |
| `wide-ast --legacy` | 0/0/2 | 崩溃 0 / 差异 0 / fallback 2 | PASS |
| `real-dts` | PASS | 226 文件、崩溃 0、差异 0/33、缺 range 0 | PASS |
| `tts`（429 条） | PASS 429 | PASS 429 / FAIL 0 / 429；throw 3 / incremental 426 | 一致 |
| `tshape-judge ts-all` | 426/0/3 | total 429 / ok 426 / failures 3 | 一致（3 条既有 `throw/composite/*`） |
| `tshape-judge ts tmp/diff-eof.ts` | ok | `status: ok`，structural/moved/fields 全空 | ok |
| `tshape-judge ts tests/cases/token/lexical/lex-no-trailing-newline.ts` | ok | `status: ok`，全空 | ok |
| step 11 / 12 | 语句最终 `[0,12)` | step 11 `;` 挂语句名下；step 12 只封区间 `[0,12)`、不新增 shape、不裁 `;` | 一致 |

### 原始读数

```
[tsc] exit=0（无输出）
[gates default] 11 道门：4 道通过、0 道失败、7 道不适用；墙钟 8.3s（incremental 档）
[gates --legacy] 11 道门：4 道通过、0 道失败、7 道不适用；墙钟 6.3s（legacy 对照档）
[wide-ast default] PASS：崩溃 0/0、差异 23/33、fallback 79+13=92/85、缺 range 0、越界 0、distOnlyKinds 0
[wide-ast --legacy] PASS：崩溃 0/0、差异 0/0、fallback 2+0=2/2、缺 range 0
[real-dts] PASS：226 文件、崩溃 0/0、AST 完全一致 226、差异 0/33、缺 range 0
[tts] 429 条 case：throw 3 / incremental 426；PASS 429 / FAIL 0 / 429
[ts-all] total 429 / ok 426 / failures 3
[steps tmp/diff-eof.ts --from 10 --to 12] step 11 的 VariableStatementShape 下含 Symbol src=[11,12) ";"；step 12 语句 src=[0,12)、list [0,11)、declaration [6,11)
```

差异 23（较 R4 的 24 少 1）即 `lex-no-trailing-newline.ts`，本 WP 修掉的那条；`ts-all` 3 条为既有基线。

## 收尾

- 删除本地分支 `feature/r5-semicolon`（`fd5a8fdd` 已由 merge commit 收编）；`git update-ref -d refs/merge/r5`（未建立，no-op）
- `C:\Users\Admin\Documents\GitHub\xl-example-set\r5-semicolon` 已不存在；`xl-example-set` 仅剩 `_reports/`（不属于本合并的删除范围）
- 未重生成 `INDEX` / `README`；未 push、未改源码（除合并本身）、未建新分支
- 最终 `git status --short` 为空

## 最终 HEAD

合并提交 `44f70c6c35ff9790477d7d23c4e895168bea0e64`；本报告为其后的 docs 提交，最终 HEAD 见下。