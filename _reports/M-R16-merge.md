# M-R16 · 合并 `feature/r16-decl-shell`（函数声明 ASI：下一行语句头处收口）

- 主仓库：`C:\Users\Admin\Documents\GitHub\xl-example`，`feature/all-possible`
- 基线：`ed9399a0`（`$BASE`，合并前 HEAD，工作树干净）
- 合入：`b7622137`（`feature/r16-decl-shell`，base = `$BASE`），经 `git fetch --no-tags <set>\r16-decl-shell "feature/r16-decl-shell:refs/merge/r16"`
- 方式：`git merge --no-ff refs/merge/r16`，**无冲突**（2 文件 +212/−8，0 处冲突，未做任何手工改源码）
- 合并提交：**`ea42bac4`** `merge(r16): function declaration ASI on next-line statement head`
- 未 push、未建新分支、未重生成 INDEX/README、未 `Start-Sleep`

## 1. 三点 diff 预检

`git merge-base HEAD refs/merge/r16` = `ed9399a0`（= HEAD）⇒ 纯快进可成，按要求走 `--no-ff`。
改动 2 件：`_reports/R16.md`（新）+ `typescript/tokens/declarations/function-declaration-end-possible-shape.xl.md`（+55/−8，
新增 `DeclarationAsiBoundary.StartsNewStatementLine`，并由 `HeadContinuationWords` 否决多行头）。

## 2. 构建

| 项 | 读数 |
|---|---|
| `xl_build`（cwd=repo，ts） | 1 written / 635 skipped / **0 error** / 3 warning（3 条既存 `E1107` 重复声明，未动） |
| `tsc -p .` | **exit 0** |

注：本仓库无本地 `xl` 可执行文件（`node_modules/.bin` 只有 `tsc`，无 `xl` 包），`npm run build` 的
`xl build` 一步在本机不可用；构建走 `xl_build` 工具，编译走仓库自带 `tsc`。

## 3. 验收（两档并列）

| 项 | 期望 | 实测（default） | 实测（`--legacy`） |
|---|---|---|---|
| `tests/gates/run.mjs` | 4/0/7 | **4 通过 / 0 失败 / 7 N/A** exit 0 | **4 / 0 / 7** exit 0 |
| `tests/parse/wide-ast.mjs` | 0/2/75（legacy 0/0/2） | **崩溃 0 / 差异 2 / fallback 75**（+外部 13），PASS | **0 / 0 / 2**，PASS |
| `real-dts-ast` | PASS | **PASS**（226 文件、崩溃 0/0、差异 0/33） | — |
| `typescript/cases/tts/run.mjs` | PASS 429 | **PASS 429 / FAIL 0**（throw 3/3、incremental 426/426） | — |
| `tshape-judge ts-all` | 426/0/3 | **total 429 / ok 426 / failures 3** | — |

default wide-ast 的 2 条 DIFF：`ex-await-yield`（structural 12）、`stmt-r1236-value-word-brace`（structural 6）。
`expr-generic-inst-statement` 已从 DIFF 清单消失。
`ts-all` 的 3 条失败与基线逐字相同：`throw/composite/{class-ball,expression-zoo,generic-container}.ts`
（均 `incremental-error`，`??` / 泛型实参形状未支持）。

## 4. 目标用例

| 用例 | 结果 |
|---|---|
| `tshape-judge ts tests/cases/token/statements/expr-generic-inst-statement.ts` | **ok**（structural 0 / moved 0 / fields 0） |

## 5. 「0 条原来通过现在失败」

- default wide-ast 差异 3 → 2：消失的正是 `expr-generic-inst-statement`，**没有一条新出现的文件名**。
- 三条不变量守住：崩溃 0/0 不变、`ts-all` ok 恒为 **426**、`tts` PASS 恒为 **429**；`--legacy` 仍 0/0/2。
- `FileFallbackCount` 75（天花板 85；`tests/cases/token`=74 + `samples/declarations.ts`=1），按族与基线一致，无增删。
- `ExternalFallbackCount` 13（白名单登记 13，命中 13）。

结论：**无净负**，接受合并；未触发 `git reset --hard $BASE`。

## 6. 清理

- `C:\Users\Admin\Documents\GitHub\xl-example-set\r16-decl-shell\node_modules` 是指向主仓库 `node_modules` 的
  junction：先 `rmdir` 解链（不跟进目标，退出 0）→ 复检无 ReparsePoint 残留 → 删整棵 `r16-decl-shell` 目录。
  主仓库 `node_modules` 删前/删后均存在。`xl-example-set\{r18-await,r19-value...,r8-audit,_reports}` 保留（非本趟产物）。
- 分支 / ref：`refs/merge/r16` 已 `update-ref -d`（`refs/merge/` 现为空，0 条）；`feature/r16-decl-shell`
  随 set 目录一并移除，主仓库无同名分支。
- 最终 `git status --short` **为空**。

## 7. 最终 HEAD

- 合并提交：`ea42bac4`（本报告随后以独立提交落盘，`--oneline` 顶部即最新 HEAD）。
