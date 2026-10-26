# M-B4d 合并 `feature/b4d-arrow-params` 入主仓库 — 合并报告

| 项 | 值 |
| --- | --- |
| 状态 | **合并完成 + 验收通过**（零冲突、未 reset、未 push） |
| 主仓库 | `C:\Users\Admin\Documents\GitHub\xl-example`，`feature/all-possible` @ `c641266b`（`$BASE`） |
| 合并源 | `C:\Users\Admin\Documents\GitHub\xl-example-set\b4d-arrow-params`，`feature/b4d-arrow-params` @ `90677d63`（含 `92f96f61` code+probe + `90677d63` report，base `c641266b`） |
| 三点 diff | 7 文件，+720 / −4（`git merge-base` = `c641266b`，源分支正基于 `$BASE`，无分叉） |
| 合并提交 | `04a7c3ac` `merge(b4d): arrow parameter deferred replay`（`--no-ff`，**0 冲突**） |
| push / pull origin | **未执行** |

---

## 1. 合并内容

| 文件 | 改动 |
| --- | --- |
| `typescript/tokens/expressions/forms/primary/arrow-params-catalog.xl.md` | 新增 228 行：箭头形参的 deferred 重放目录 |
| `typescript/tokens/statements/deferred-bracket-catalog.xl.md` | +69：`Bind(owner, narrow?)` 早建 + `UpgradePlan` |
| `typescript/tokens/expressions/arrow-function-shape.xl.md` | +39：`BindParameterBracket` 消费已建 `ParameterShape` |
| `typescript/tokens/expressions/expression-builder.xl.md` | +16：`ParseFunctionParameters` 消费已建形参 |
| `typescript/tokens/statements/bracket-role-resolver.xl.md` | +32：`IsAsyncArrowPrefix` |
| `typescript/cases/tts/tools/arrow-param-probe.mjs` | 新增 156 行：13 项探针 |
| `_reports/B4d.md` | 源报告（随合并入库） |

**冲突**：0 条（`git merge-tree` 预检与实合并均为 0；合并基即 `$BASE`，`--no-ff` 一次完成）。未手工改任何源码。

---

## 2. 重建

| 项 | 结果 |
| --- | --- |
| `xl_build`（cwd=repo，paths core+typescript，target ts）| **5 written / 628 skipped / 0 planned / 0 error**，3 warning |
| 3 条 warning | `E1107`：`GetAccessor/SetAccessor/IndexSignature PossibleShape` 同名声明（B2c 既有，非本轮新增） |
| `tsc -p .` | **exit 0** |

写入的 5 份即本合并改动的 5 个源页产物（含新增 `arrow-params-catalog.ts`）。

---

## 3. 验收读数（合并后实测）

| 套件 | 期望 | 实测 | 结论 |
| --- | --- | --- | --- |
| `tests/gates/run.mjs`（默认 incremental）| 4 / 0 / 7 | **4 PASS / 0 FAIL / 7 N/A**，exit 0 | PASS |
| `tests/gates/run.mjs --legacy` | 4 / 0 / 7 | **4 / 0 / 7**，exit 0 | PASS |
| `tests/parse/wide-ast.mjs`（默认）| 0 / 33 / 83+13=96 | **崩溃 0/0、差异 33/33、fallback 83+13=96/85**、缺 range 0、越界 0、distOnlyKinds 0、policyProblems 0 | PASS |
| `tests/parse/wide-ast.mjs --legacy` | 0 / 0 / 2 | **0 / 0 / 2**，exit 0 | PASS |
| `typescript/cases/real-dts-ast.mjs`（默认）| PASS | **崩溃 0/0、差异 0/33、缺 range 0**，exit 0 | PASS |
| `typescript/cases/tts/run.mjs --quiet` | PASS 429 | **`[tts] PASS 429 / FAIL 0 / 429`**，exit 0 | PASS |
| `typescript/cases/tts/tools/tshape-judge.mjs ts-all` | 426 / 0 / 3 | **total 429 / ok 426 / failures 3**（同基线三条，零新增） | 基线一致 |
| `typescript/cases/tts/tools/arrow-param-probe.mjs` | 13 PASS | **13 项 `=== OK` 全过，`ARROW-PARAM-PROBE PASS`**，exit 0 | PASS |

逐项与任务预期**完全吻合**（fallback 由 85 回到 83+外部 13=96），无偏移、无需 reset。

> 说明：`real-dts-ast` 的实际路径是 `typescript/cases/real-dts-ast.mjs`（门内登记于
> `tests/gates/run.mjs:137`），不是早前报告里写的 `tests/parse/real-dts-ast.mjs`。

---

## 4. 已知残项（R1 / R2 / R3，不 reset）

R1、R2、R3 为已登记残项，`tshape-judge ts-all` 的 3 条 failure 即其投影，与 `$BASE` 逐条相同，本次合并未新增也未修复。

---

## 5. 收尾

- **未**重生成 INDEX / README（默认读数无索引项变动；后续统一处理）。
- 合并临时 ref `refs/merge/b4d` 已删除（`git update-ref -d`，已复核 `rev-parse --verify` 失败即不存在）。
- 源目录 `xl-example-set\b4d-arrow-params` 已**先解 `node_modules` junction**（`cmd /c rmdir`，只删链接）再整目录删除；解链后主仓库 `node_modules\typescript\bin\tsc` 仍在（已复核 True）。
- 未建新分支、未 push、未改源码（零冲突，无手工合并）。
- 最终 `git status --short` 为空。

---

## 6. 复算命令

```powershell
$repo = "C:\Users\Admin\Documents\GitHub\xl-example"
Set-Location $repo
node node_modules/typescript/bin/tsc -p .
node tests/gates/run.mjs                                    # 4 / 0 / 7
node tests/gates/run.mjs --legacy                           # 4 / 0 / 7
node tests/parse/wide-ast.mjs                               # 0 崩溃 / 33 差异 / 83(+13)=96
node tests/parse/wide-ast.mjs --legacy                      # 0 / 0 / 2
node typescript/cases/real-dts-ast.mjs                      # PASS
node typescript/cases/tts/run.mjs --quiet                   # PASS 429 / FAIL 0
node typescript/cases/tts/tools/tshape-judge.mjs ts-all     # 429 / 426 / 3
node typescript/cases/tts/tools/arrow-param-probe.mjs       # 13 PASS
```
