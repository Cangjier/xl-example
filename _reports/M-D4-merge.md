# M-D4 合并报告：`feature/d4-fallback` → `feature/all-possible`

## 1. 合并事实

| 项 | 值 |
| --- | --- |
| 主仓库 | `C:\Users\Admin\Documents\GitHub\xl-example`，分支 `feature/all-possible` |
| `$BASE`（合并前 HEAD） | `9734f51419655fd7bf78e8dea38f78cb1479f763` |
| 待合并 | `...\xl-example-set\d4-fallback` 的 `feature/d4-fallback` @ `63587da4946490ce52692344063a00f47f799bee`（`fix 1905651d` + 两条 docs） |
| 取回方式 | `git fetch --no-tags <clone> "feature/d4-fallback:refs/merge/d4"`（不 push / 不 pull origin） |
| 合并提交 | `609f5526323144466ae0d6041f5d9328b9d0405c`，`merge --no-ff -m "merge(d4): make file fallback truly legacy"` |
| 冲突 | **0 处**（合并基正是 `$BASE`，无并行改动） |

改动面（`git diff --name-status $BASE...63587da4`）：

```
A  _reports/D4.md
M  typescript/run/source-file-runner.xl.md   (+25 / -2)
```

语义：`SourceFileRunner.ParseCore(shell=false)` 除了切 `EnableShellExpressions`，再把
`EnableIncrementalVariableShapes` 与 `EnableIncrementalShapes` 一起压成 `false`；三个开关在同一个
`finally` 里逐位恢复。

## 2. 重建

| 步骤 | 期望 | 实测 | 判定 |
| --- | --- | --- | --- |
| `xl_build { paths:["core","typescript"], targets:["ts"] }` | 0 error | **1 written / 627 skipped / 0 error / 3 warning** | PASS |
| `npx tsc -p .` | exit 0 | **exit 0**（无输出） | PASS |

- 1 written 即 `typescript/run/source-file-runner.xl.md → dist/ts/typescript/run/source-file-runner.ts`，其余 627 页 fingerprint 未变，说明 D4 只动这一页。
- 3 条 warning 是既有 `E1107`（`GetAccessorPossibleShape` / `IndexSignaturePossibleShape` / `SetAccessorPossibleShape` 重名），与 D4 无关。
- **注（既有环境噪声，非本次引入）**：不带 `paths` 的全目录 `xl_build` 会先报 1 条 `E1001`：`tmp/canonical-stray-type-catalog-factory.xl.md: file is empty`（0 字节、`tmp/` 被 `.gitignore` 忽略、mtime 2026/10/26 18:06，早于本次合并）。该文件是前序 agent 的探针残留，使全目录构建在计划阶段即中止（0 planned）。故按历史各合并报告（M-B2/M-D3a/M-D3e 等）同一口径，把构建限定在受版本控制的 `core` + `typescript` 两棵树，得到 0 error。

## 3. 验收读数（default 关增量形状 + ON 强制开）

| 套件 | 期望 | 实测 | 判定 |
| --- | --- | --- | --- |
| `tshape-judge.mjs ts-all`（默认关） | 426 / 0 / 3 | **total 429 / ok 426 / failures 3** | PASS |
| `typescript/cases/tts/run.mjs` | PASS 429 | **PASS 429 / FAIL 0**；throw 3/3、atomic 0/0、partial 0/0、incremental 426/426 | PASS |
| `tests/gates/run.mjs` | 4 PASS / 0 FAIL / 7 N/A | **4 通过 / 0 失败 / 7 不适用**；wide-ast `FileFallbackCount 2`（基线 2） | PASS |
| `tmp/wide-on.mjs`（两开关强制 ON） | 崩溃 26 / 差异 103 / FileFallback 213 | **崩溃 26 / 有差异 103 / 缺 range 0 / 越界 0**，`FileFallbackCount 213`、`FileFallbackAttempts 239` | PASS |

- judge 的 3 条 failures 与基线完全同源，均为 `throw/composite/{class-ball,expression-zoo,generic-container}.ts` 的 `status=incremental-error`（既有 throw 用例，非新失败）；`ok 426 = 429 - 3`，即 **diff 0 / crash 0**。
- gates 的 7 N/A 是仓库本身缺源/缺产物（`runtime/`、`print-ast-common.xl.md`、`dawn/`、`dist/cpp` 不在本仓库），与 D3a/D3e 基线一致。
- **ON 的 2 条 ok→diff 是已知回归，未回滚 D4**：
  `tests/cases/token/expressions/expr-yield-await-context.ts`、`tests/cases/token/statements/st-comment-holds-brace.ts`。
  两者在 ON 下由「原来通过」变为有差异，D4 §4 已归因（`EnableIncrementalShapes` 一并压掉后这两处走 legacy 目录），是本次「让 file fallback 真正 legacy」的代价，按指令保留。
- ON 的 FileFallback 213 比基线 167 多 46（脚本的 WARN，不判红），与 D4 §4 记录的 135→213 同向。

## 4. 边界守则

- 未重生成 `INDEX` / `README`（留给 B5）。
- 未 push、未 pull origin、未建新分支、未改源码（零冲突，无需手工保双侧）。
- `git reset --hard $BASE` **未启用**（全部验收通过）。

## 5. 目录清理

- 克隆 `...\xl-example-set\d4-fallback` 中的 `node_modules` 是 **Junction → `C:\Users\Admin\Documents\GitHub\xl-example\node_modules`**：先用 `Directory.Delete(path,false)` 只解链（主仓 `node_modules` 复核仍在），再 `Remove-Item -Recurse -Force` 删整棵克隆树。删除后 `Test-Path` 为 False。
- `git update-ref -d refs/merge/d4` 已执行，`refs/merge/` 剩 0 条。
- `xl-example-set` 下现存：`d0-default-on`、`d3-triage`、`d3a2-member-chain`、`d3c-angle`、`_reports`（D4 克隆不再保留）。

## 6. 复现命令

```
git merge --no-ff refs/merge/d4 -m "merge(d4): make file fallback truly legacy"
xl_build { paths: ["core","typescript"], targets: ["ts"] }   # 1 written / 0 error / 3 warning
npx tsc -p .                                                  # exit 0
node typescript/cases/tts/tools/tshape-judge.mjs ts-all        # 429 / ok 426 / failures 3
node typescript/cases/tts/run.mjs                             # PASS 429 / FAIL 0
node tests/gates/run.mjs                                      # 4 PASS / 0 FAIL / 7 N/A, FileFallback 2
node tmp/wide-on.mjs                                          # 崩溃 26 / 差异 103 / FileFallback 213
```
