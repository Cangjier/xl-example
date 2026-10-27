# M-R2 合并报告 · feature/r2-regex

- 主仓库：`C:\Users\Admin\Documents\GitHub\xl-example`（`feature/all-possible`）
- BASE：`70692d2d`（合并前工作树干净）
- 合入：`refs/merge/r2` = `68161da2`（`feature/r2-regex` @ `...\xl-example-set\r2-regex`）
- merge-base = BASE，`--no-ff` 合并，**0 冲突**，改动 5 文件 +400/-48
- 合并提交：`7da75fe9`（`git merge --no-ff` 产出 `50c5bdf2`；随后一次空 index 的 `--amend` 重写了该提交，树与信息不变，故 hash 变为 `7da75fe9`） —— `merge(r2): general regex-vs-division operand predicate`
- 最终 HEAD：`7da75fe99236ee4571ca08c1dca30275ba5c5343`

## 改动
| 文件 | 内容 |
| --- | --- |
| `typescript/run/typescript-template.xl.md` | `CanStartAt` 重排：`super` **之前**先问 `CanEndOperand`（能结束表达式 ⇒ 除号）；新增 `CanEndOperand` / `IsOperandShape`，抽出 `IsControlHeadTail` / `IsArrowBodyTail` |
| `typescript/tokens/expressions/right-operand-possible-shape.xl.md` | BigInt 当二元右操作数（`IsBigInt()` + `BigIntLiteralShape`） |
| `typescript/tokens/expressions/forms/operator/binary-operator-possible-shape.xl.md` | BigInt + `this`/`super`/`true`/`false`/`null` 关键字字面量当左操作数 |
| `tests/cases/token/expressions/expr-division-after-comment.ts` | 回归家族扩到 **29 个除号**（`xl:expect BinaryOperator:29`） |
| `_reports/R2.md` | 特性侧报告（随分支带入） |

## 验收（全绿，两档）
| 检查 | 结果 |
| --- | --- |
| `xl_build`（core + typescript → ts） | 3 written / 631 skipped / **0 error**（3 条既有 E1107 重复类型警告，与本改动无关） |
| `tsc -p .` | **exit 0** |
| `tests/gates/run.mjs`（默认 incremental） | **4 PASS / 0 FAIL / 7 N/A**（墙钟 8.2s） |
| `tests/gates/run.mjs --legacy` | **4 PASS / 0 FAIL / 7 N/A**（墙钟 6.6s） |
| `wide-ast`（默认 incremental） | **PASS / 崩溃 0 · 差异 26 · fallback 93** |
| `wide-ast --legacy` | **PASS / 崩溃 0 · 差异 0 · fallback 2** |
| `real-dts-ast`（226 文件） | **PASS** 226/226，差异 0/33 |
| `typescript/cases/tts/run.mjs` | **PASS 429 / FAIL 0**（throw 期望 3/实测 3 · incremental 426/426） |
| `tshape-judge.mjs ts-all` | 429 total / **426 ok** / 3 failures（`throw/composite/{class-ball,expression-zoo,generic-container}.ts`，与基线同源的预期 throw） |
| `tshape-judge.mjs ts tmp/diff-bigint.ts` | **ok**（structural/moved/fields 全空） |
| `tshape-judge.mjs ts tests/cases/token/expressions/expr-division-after-comment.ts` | **ok** |

### 逐门（两档一致）
- 4 PASS：`direct:lint`（0 违反）、`cases:check`（1720 条 0 不合格）、`wide-ast`（PASS）、`real-dts-ast`（全量一致）
- 0 FAIL
- 7 N/A：`runtime:check` · `runtime:cli` · `cases:tsast` · `cases:direct` · `samples` · `coverage` · `cpp:check`（依赖的源/产物本仓库不存在）

## 已知基线未修（不 reset）
`if (/re/.test(x)) { }` 仍是 `incremental-error`：失败在控制头括号 + 块体收口那一层，不是 `/` 起点判定，基线同一份同样失败（`_reports/R2.md` §5）。

## 清理
- 已解 `...\r2-regex\node_modules` junction，并删除 `r2-regex` 工作副本（父目录现只剩 `_reports`）
- 已 `git update-ref -d refs/merge/r2`
- 未 push / pull origin，未新建分支，未改源码（无冲突），未重生成 INDEX/README（留后续统一）
- 最终 `git status --short`：空