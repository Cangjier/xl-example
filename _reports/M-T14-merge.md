# M-T14 合并报告

- 主仓库：`C:\Users\Admin\Documents\GitHub\xl-example`
- 目标分支：`feature/all-possible-1027`
- 合入：`refs/merge/t14` = `e4212f21`（base `20ec6586`）
- 合并方式：`git merge --no-ff`，**冲突 0 处**（上限 2）
- 合并提交：`merge(t14): new parenthesized callee group`

## 预检

| 项 | 结果 |
| --- | --- |
| 合并前 HEAD | `20ec6586`（一致，工作树干净） |
| 三点 diff（base → t14） | 2 文件：`_reports/T14.md` + 1 个 `xl.md`（+345/−5），与任务书一致 |
| merge-base | `20ec6586`（HEAD 未越过 base） |

## 验证（未跑 gates）

| 检查 | 要求 | 实测 |
| --- | --- | --- |
| `xl_build(core, typescript → ts)` | 0 error | **1 written / 636 skipped / 0 error / 3 warning**（既有 3 条 E1107 重复类型声明，与 T13 同） |
| `node node_modules/typescript/bin/tsc -p .` | exit 0 | **exit 0**，无诊断 |
| 三条 case 首跳 / 默认路径 | 无首跳、无 fallback | **`FIRSTHOP=ok`、`LastFileFallback=false`（三条全部）** |
| 三条 case `tshape-judge ts` | status=ok | **`structural=[] moved=[] fields=[]`（三条全部，exit 0）** |
| 全语域 fallback（1716 条） | 46 → 43 | **46 → 43** |
| 1716 条 AST 指纹 | 只允许被修 case 变化 | **`digest changed=0`**；`fallback changed=3`、`firstHop changed=3`（正是三条），`added=0 removed=0` |
| 30 target（`node tmp/target-cases.mjs`） | 30/30、fallback=0 | **cases=30 ok=30 moved=0 diff=0 error=0 fallback=0 \| LastFileFallback=0 \| pin-miss=1**（既有 026 的 `// xl:expect fallback`，与 T13 同） |
| 5 smoke `ts.json` SHA256 前 16 位 | 不变 `BB07DA2201FC5087` | **5 份全 `BB07DA2201FC5087`**，status 全 ok |

翻转的三条（fallback 与首跳同源）：

| 文件 | fallback | 首跳 |
| --- | --- | --- |
| `tests/cases/token/expressions/ex-new-variants.ts` | true → false | `增量变量形状未支持：expression new 关键字` → 无 |
| `tests/cases/token/expressions/expr-new-callee-postfix-assert.ts` | true → false | 同上 → 无 |
| `tests/cases/token/expressions/expr-new-comment-callee.ts` | true → false | 同上 → 无 |

即：只有被修的三条 flip，其余 1713 条的 AST 指纹、fallback 标记、首跳逐条不变。

## 内容落地

- `typescript/tokens/expressions/forms/postfix/new-possible-shape.xl.md`（+122/−5）
- 新判据 `IsCalleeGroup`（`(` 前一个代码单元是 `new` 关键字本身）
- `IsBuildable` / `BuildByIndex` 的括号组分支（括号组格让给实参括号，`""`/`;` 前瞻时在括号组格建树）
- `Operand` 的 `Bracket → CalleeGroup`；`CalleeGroup` 复用 `ParenthesizedExpressionShape` + legacy `ExpressionBuilder.ParseExpression`

## 收尾

- 临时探针与产物（`tmp/m-t14-*`、`tmp/t9-*` 副本、`tmp/m-t14-judge`、`tmp/smoke-cases`、`tmp/t9-smoke`）已清理。
- 工作副本 `xl-example-set\all-possible-1027-t14` 已删除；`refs/merge/t14` 已 `update-ref -d`。
- 未 push、未建分支、未改源码；最终 `git status` 为空。
