# M-R15 · 合并 `feature/r15-in-tagged`（ASI shape-tail 边界 + 标签模板原子重建）

- 主仓库：`C:\Users\Admin\Documents\GitHub\xl-example`，`feature/all-possible`
- 基线：`ffe0e0c8`（`$BASE`，合并前 HEAD，工作树干净）
- 合入：`00b73568`（`feature/r15-in-tagged`，base = `$BASE`），经 `git fetch --no-tags <set>\r15-in-tagged "feature/r15-in-tagged:refs/merge/r15"`
- 方式：`git merge --no-ff refs/merge/r15`，**无冲突**（7 文件 +335/−14，0 处冲突，未做任何手工改源码）
- 合并提交：**`cda4ae07`** `merge(r15): ASI shape-tail boundary + tagged template atom rebuild`
- 未 push、未建新分支、未重生成 INDEX/README、未 `Start-Sleep`

## 1. 三点 diff 预检

`git merge-base HEAD refs/merge/r15` = `ffe0e0c8`（= HEAD）⇒ 纯快进可成，按要求走 `--no-ff`。
改动 7 件：`_reports/R15.md`(新) + 6 个源页（`declaration-asi-boundary`、`variable-declaration-shape`、
`expression-builder`、`binary-operator-possible-shape`、`tagged-template-primary-possible-shape`、
`expression-atom-registry`），与任务书列项逐条对应。

## 2. 构建

| 项 | 读数 |
|---|---|
| `xl_build core,typescript → ts` | 6 written / 629 skipped / **0 error** / 3 warning（3 条既存 `E1107` 重复声明，未动） |
| `tsc -p .` | **exit 0** |

## 3. 验收（两档并列）

| 项 | 期望 | 实测（default） | 实测（`--legacy`） |
|---|---|---|---|
| `tests/gates/run.mjs` | 4/0/7 | **4 通过 / 0 失败 / 7 N/A** exit 0 | **4 / 0 / 7** exit 0 |
| `tests/parse/wide-ast.mjs` | 0/3/75（legacy 0/0/2） | **崩溃 0 / 差异 3 / fallback 75**（+外部 13），PASS | **0 / 0 / 2**，PASS |
| `real-dts-ast` | PASS | **PASS**（226 文件、崩溃 0/0、差异 0/33） | — |
| `typescript/cases/tts/run.mjs` | PASS 429 | **PASS 429 / FAIL 0**（throw 3/3、incremental 426/426） | — |
| `tshape-judge ts-all` | 426/0/3 | **total 429 / ok 426 / failures 3** | — |

`ts-all` 的 3 条失败身份与基线逐字相同：`throw/composite/{class-ball,expression-zoo,generic-container}.ts`（均 `incremental-error`）。
default wide-ast 的 3 条 DIFF 逐文件：`ex-await-yield`(12)、`expr-generic-inst-statement`(4)、`stmt-r1236-value-word-brace`(6)。

## 4. 四条目标用例

| 用例 | 结果 |
|---|---|
| `ex-unary-ops` | **ok**（structural 0 / moved 0） |
| `expr-tagged-template-nested-tag` | **ok** |
| `expr-lambda-then-compound-assign` | **ok** |
| `stmt-adversarial-shapes` | **自 default wide-ast 的 DIFF 清单消失**（= 该尺子上的「转绿」）；但 `tshape-judge ts` 单文件仍报 `incremental-error`（step 585，line 10 `const g2: <T>(x: T) => T = (x) => x;`，`增量变量形状未支持：declaration 符号 <`） |
| `expr-generic-inst-statement` | 仍 **diff**（structural 4，已知 #19，与任务书一致） |

**关于第 4 条的口径**：该文件在基线上是 **DIFF**（R12/R13/R14 均记 `5+2`，从未 `ok`），本趟并不是「把它判成 ok」，
而是 `FinishIncremental` 的显式失败（C10：不再静默错树）让它**抛出 → 文件级 fallback → fallback 树与 TS 一致**，
于是从 wide-ast 的 DIFF 清单里消失。严格增量的单文件判据因此仍记 `incremental-error`——这是 R15 §6.4 记载的
设计后果，不是合并引入的回归。

## 5. 「0 条原来通过现在失败」

- default wide-ast 差异 7 → 3：消失的 4 条正是任务书预期转绿的 4 条，**没有一条新出现的文件名**；
  剩下的 3 条是基线 7 条的子集（`ex-await-yield`、`expr-generic-inst-statement`、`stmt-r1236-value-word-brace`）。
- 三条不变量守住：崩溃 0/0 不变、`ts-all` ok 恒为 **426**、`tts` PASS 恒为 **429**；`--legacy` 仍 0/0/2。
- `FileFallbackCount` 75（天花板 85，`tests/cases/token`=74 + `samples/declarations.ts`=1），未越界。

结论：**无净负**，接受合并；未触发 `git reset --hard $BASE`。

## 6. 清理

- `C:\Users\Admin\Documents\GitHub\xl-example-set\r15-in-tagged\node_modules` 是指向主仓库 `node_modules` 的
  junction：先 `rmdir` 解链（不跟进目标）→ 复检无 ReparsePoint 残留 → 删整棵 `r15-in-tagged` 目录。
  主仓库 `node_modules` 删前/删后均存在。`xl-example-set\r8-audit`、`xl-example-set\_reports` 保留（非本趟产物）。
- 分支：`refs/merge/r15` 已 `update-ref -d`（`refs/merge/` 现为空）；`feature/r15-in-tagged` 随 set 目录一并移除。
- 最终 `git status --short` **为空**。

## 7. 最终 HEAD

- 合并提交：`cda4ae07`（本报告随后以独立提交落盘，`--oneline` 顶部即最新 HEAD）。
