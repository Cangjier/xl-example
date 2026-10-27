# M-T13 合并报告

- 主仓库：`C:\Users\Admin\Documents\GitHub\xl-example`
- 目标分支：`feature/all-possible-1027`
- 合入：`refs/merge/t13` = `08a8ddbe`（base `5f5267ff`）
- 合并前 HEAD：`5f5267ff`（与任务书一致），工作树干净
- 合并方式：`git merge --no-ff`，**冲突 0 处**
- 合并提交信息：`merge(t13): register new expression atom for postfix`
- 合并提交：`6f306f5f`
- 最终 HEAD：本报告提交（`docs(t13): merge report`）之上

## 预检

| 项 | 结果 |
| --- | --- |
| 合并前 HEAD | `5f5267ff`（一致） |
| 工作树 | 干净（`git status --porcelain` 空） |
| merge-base | `59361531`（T12 在自己的分支线上另有一次 merge(t12)，故与 `5f5267ff` 不同） |
| 三点 diff（`5f5267ff...refs/merge/t13`） | 2 文件：`_reports/T13.md`(A) + 1 个 `xl.md`(M)，与任务书一致 |

两点 diff 另会显示 `_reports/M-T12-merge.md`(D)，这是**两点比较的假象**：该报告只存在于主线
`5f5267ff`，不在 merge-base `59361531` 上，故不属于本次合并范围 —— 实际合并结果中该文件
完好保留（合并报告 2 文件、0 删除已证实）。

`new-possible-shape.xl.md`：+10 / −0 —— 依赖 +1（`ExpressionAtomRegistry`）、
`BuildByIndex` 内 `ExpressionAtomRegistry.RegisterNode(shape)` +1 行、`[T13:NEW-POSTFIX]`
文档与注释若干。未改任何判据（`IsBuildable` / `ComputeByIndex` / 收口格一字未动）。

## 验证（未跑 gates）

| 检查 | 期望 | 实测 |
| --- | --- | --- |
| `xl_build(core,typescript → ts)` | 0 error | **1 written / 636 skipped / 0 error / 3 warning**（3 条 E1107 为既有重复类型告警） |
| `tsc -p .` | exit 0 | **exit 0**，无诊断 |
| `node tmp/target-cases.mjs` | 30/30、fallback=0 | **cases=30 ok=30 moved=0 diff=0 error=0 fallback=0 \| LastFileFallback=0 \| pin-miss=1** |
| `const n = new A(1).b(2);` judge | ok | **status=ok**（`structural=[] moved=[] fields=[]`） |
| 同一条首跳 / 默认路径 | 无 fallback | **fallbackCount=0、fallbackFiles=0** |
| 全语域 fallback（1716 文件） | 46（允许不变） | **46 → 46**（`fallbackFiles=45`，`threw=1` 为既有） |
| 5 smoke `ts.json` SHA256 前 16 位 | 不变 `BB07DA2201FC5087` | **5/5 `BB07DA2201FC5087`**（smoke-if / smoke-add / smoke-call / smoke-class / smoke-obj） |

`pin-miss=1` 为既有现象（026 的 `// xl:expect fallback` 按要求未改），与本轮无关。

## fallback 46 不变（已知，允许）

本行登记**只影响「声明初始化器的根是 `new` 形状 + 后面还有后缀」这一格**。语域（1716 条）里
不存在这种文件：所有 `new X(...)` 之后带 `.`/`[`/`!`/`(` 的行都在**表达式语句**里
（`new A().b;`、`console.log(new C().x + new C().m());` …），这些条目改前就 ok，登记与否
不影响（0 条首跳指纹变化已证实）。语域里仅剩的 3 条 `new` 族 fallback 首跳都在**建树格之前**
（`new (getCtor())()`、`new (a!.b)()`、`new /* c */ (A)(2)`），属另一缺口，本轮按
「不改其它判据」未碰。

即：`fallback 46 → ≤45` 本轮**未达成**（46 → 46），但 **case 本身已修**（judge ok、无 fallback），
且无回归、30 target 无变化、5 smoke 指纹不变。

## 收尾

- 清理：`tmp/mt13-fallback.mjs`、`tmp/mt13-judge/`、`tmp/t13-c14.ts`、`tmp/t13-c14.txt`
- `update-ref -d refs/merge/t13`，最终 `git status --porcelain` 为空
- 未 push、未改源码、未建分支、未跑 gates
