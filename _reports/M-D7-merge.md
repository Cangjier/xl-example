# M-D7 合并报告：`feature/d7-default` → `feature/all-possible`

**状态：完成。** 合入 `d7-default`（`4f2ace60`，base `ab2a429b`）到主仓库，0 冲突，全部验收读数符合预期；未 push、未改源码（本次无冲突）、未新建分支。

## 1. 合并

| 项目 | 值 |
| --- | --- |
| 主仓库 | `xl-example`，`feature/all-possible` |
| `$BASE` | `ab2a429b5d1ec0dd89e71cb49e4c4ef9a9a292c1`（工作树干净） |
| 待合并 | `xl-example-set/d7-default` @ `4f2ace60`（`feature/d7-default`） |
| fetch | `git fetch --no-tags <path> "feature/d7-default:refs/merge/d7"` → `4f2ace60` |
| merge-base | `ab2a429b`（三点 diff 预检：6 文件 +369 −107，与任务单一致） |
| 合并方式 | `git merge --no-ff refs/merge/d7 -m "merge(d7): enable incremental shapes by default + policy gates"` |
| 冲突 | **0**（ort 策略，无需手工保双侧） |
| 合并提交 | `5a0d63f2` |

改动文件：`_reports/D7.md`（新增）、`tests/gates/run.mjs`、`tests/parse/incremental-crash-expected.mjs`（新增）、`tests/parse/wide-ast.mjs`、`typescript/cases/real-dts-ast.mjs`、`typescript/tokens/statements/statement-route-util.xl.md`。

## 2. 重建

| 命令 | 结果 |
| --- | --- |
| `xl_build`（cwd=repo，`core` + `typescript` → `ts`） | **1 written / 627 skipped / 0 error / 3 warning**（既有 E1107 重复声明，与本次无关）；唯一写入是 `dist/ts/typescript/tokens/statements/statement-route-util.ts` |
| `tsc -p .` | **exit 0** |

## 3. 验收（默认档 = incremental）

| 检查 | 预期 | 实测 | 判定 |
| --- | --- | --- | --- |
| `node tests/gates/run.mjs` | 4 PASS / 0 FAIL / 7 N/A，exit 0 | **4 / 0 / 7**，墙钟 7.3s，exit 0 | ✅ |
| `node tests/gates/run.mjs --legacy` | 4 / 0 / 7，exit 0 | **4 / 0 / 7**，墙钟 7.0s，exit 0；`wide-ast` PASS 0/0/2、`real-dts` PASS 0/0 | ✅ |
| `node tests/parse/wide-ast.mjs` | PASS 5/32/94，policyProblems 0 | **PASS**：崩溃 **5/5**（全在 `lib.es2015.proxy` / `lib.es2017.object` / `lib.es2019.object` / `lib.es2024.sharedmemory` / `lib.esnext.typedarrays` 清单）、差异 **32/87**、fallback **78+16=94/94**、缺 range 0、越界 0、distOnlyKinds 0、`policyProblems` **0**，exit 0 | ✅ |
| `node tests/parse/wide-ast.mjs --legacy` | PASS 0/0/2 | **PASS** 崩溃 0/0、差异 0/0、fallback 2/2，exit 0 | ✅ |
| `node typescript/cases/real-dts-ast.mjs` | PASS，5 崩溃全清单、差异 0 | **PASS**：226 件、解析成功 221、崩溃 **5/5**、AST 完全一致 221、差异 **0/87**、缺 range 0，exit 0 | ✅ |
| `node typescript/cases/tts/run.mjs --quiet` | PASS 429 | **PASS 429 / FAIL 0**（throw 3/3、incremental 426/426），exit 0 | ✅ |
| `node typescript/cases/tts/tools/tshape-judge.mjs ts-all` | 426 / 0 / 3 / 0 / 0 | **total 429 / ok 426 / failures 3**；`tmp/tshape-judge/ts-all.json` | ✅（口径见下） |

> `tshape-judge` 的 **exit 1 是既有的**，不是本波引入：那 3 条是 `cases/throw/**` 的**预期 throw**（`?.` / `??` / `<` 的增量变量形状未支持），judge 在 `tshape-judge.mjs:488` 把它们计入 `failures` 后 `exit 1`；且 judge 自己（`:151-152`）把两个开关置位、恒走增量，与默认值无关。W4 / M-W6 记的「426/0/3」就是这个读数，D7 未改变它，也未为了让退出码变绿去改 judge。

**没有触发回滚**：`git reset --hard $BASE` 未使用。

## 4. 清理

| 动作 | 结果 |
| --- | --- |
| 解 junction | `d7-default\node_modules` → `xl-example\node_modules`，`rmdir` 先解链（目标完好） |
| 删除目录 | 剩余 reparse point 0 后 `Remove-Item -Recurse -Force`，`C:\Users\Admin\Documents\GitHub\xl-example-set\d7-default` 已不存在 |
| 删除 ref | `git update-ref -d refs/merge/d7`（`git show-ref` 已无输出） |
| INDEX / README | **未重生成**（留给 B5） |

## 5. 备注

- 验收跑测（`tts` / `tshape-judge`）的副作用会改写 `typescript/cases/tts/INDEX.md` 与若干文档页；这些改动已全部还原到 HEAD，未进入合并提交。
- 未 push、未 pull origin、未新建分支；工作树最终干净（`git status --short` 为空）。

## 6. 复现

```
node node_modules/typescript/bin/tsc -p .
node tests/gates/run.mjs                 # 4 / 0 / 7，exit 0
node tests/gates/run.mjs --legacy        # 4 / 0 / 7，exit 0
node tests/parse/wide-ast.mjs            # PASS 5/32/94，exit 0
node tests/parse/wide-ast.mjs --legacy   # PASS 0/0/2，exit 0
node typescript/cases/real-dts-ast.mjs   # PASS 5/0，exit 0
node typescript/cases/tts/run.mjs --quiet                 # PASS 429
node typescript/cases/tts/tools/tshape-judge.mjs ts-all   # 429 / 426 / 3
```
