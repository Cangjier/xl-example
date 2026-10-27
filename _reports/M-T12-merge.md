# M-T12 合并报告

- 主仓库：`C:\Users\Admin\Documents\GitHub\xl-example`
- 目标分支：`feature/all-possible-1027`
- 合入：`refs/merge/t12` = `69ceae6b`（base `5318d46a`）
- 合并前 HEAD：`5318d46a`（与任务书一致），工作树干净
- 合并方式：`git merge --no-ff`，**冲突 0 处**
- 合并提交信息：`merge(t12): call atom registration + conditional branch fallback`
- 合并后 HEAD：`593615316ce54ae625241485bc06977e5f753571`

## 预检

| 项 | 结果 |
| --- | --- |
| 合并前 HEAD | `5318d46a`（一致） |
| 工作树 | 干净（`git status --porcelain` 空） |
| merge-base | `5318d46a`（快进基线正确） |
| 三点 diff | 3 文件：`_reports/T12.md`(A) + 2 个 `xl.md`(M)，与任务书一致 |

2 个 `xl.md`：`tokens/expressions/forms/postfix/call-possible-shape.xl.md`（+18）、
`tokens/expressions/forms/operator/conditional-possible-shape.xl.md`（+258/−9）。

## 验证（未跑 gates）

| 检查 | 期望 | 实测 |
| --- | --- | --- |
| `xl build`（core+typescript → ts） | 0 error | **2 written / 635 skipped / 0 error / 3 warning**（3 条 E1107 为既有重复类型告警） |
| `tsc -p .` | exit 0 | **exit 0**，无诊断 |
| 4 条目标 judge | ok、无 fallback | **4/4 `status=ok`**，`FIRSTHOP: ok`、`LastFileFallback=false FileFallbackCount=0` |
| 30 target（`node tmp/target-cases.mjs`） | 30/30、fallback=0 | **cases=30 ok=30 moved=0 diff=0 error=0 fallback=0 \| LastFileFallback=0 \| pin-miss=1** |
| 全语料 fallback（1716 文件） | 50 → 46 | **50 → 46（−4）** |
| 1716 逐文件 AST 指纹 | 不变 | **files=1716 两边一致，changed=0**；fallback 标记仅 4 条目标 true→false |
| 5 smoke `ts.json` SHA256 前 16 位 | 不变 `BB07DA2201FC5087` | **5/5 `BB07DA2201FC5087`**（smoke-if-block / smoke-bin-add / smoke-call / smoke-class / smoke-object） |

4 条目标（fallback 标记翻转、AST 指纹不变）：

| 文件 | judge | 首跳 / 默认路径 |
| --- | --- | --- |
| `modules/im-dynamic.ts` | ok | ok / 无 fallback |
| `statements/stmt-r1242-label-body-literal-head.ts` | ok | ok / 无 fallback |
| `statements/stmt-ternary-statement-boundary.ts` | ok | ok / 无 fallback |
| `expressions/expr-assert-kernel-member-chain.ts` | ok | ok / 无 fallback |

`pin-miss=1` 为既有现象（026 的 `// xl:expect fallback` 按要求未改），与本轮无关。

AST 不变的做法：以 T12 基点盘（`5318d46a` 上的 1716 条 `cjAst` 指纹）与本树合并后重跑同一
脚本（`t9-digest`）逐文件比 `d` 字段，`changed=0`，两盘 fallback 分别为 50 与 46，
差的 4 条正是上表 4 条 —— 即**增量路径产出 ≡ legacy 树，只有 fallback 计数下降**。

## 内容落地

- `call-possible-shape.xl.md`：`BuildByIndex` 建完 `CallExpressionShape` 后
  `ExpressionAtomRegistry.RegisterNode(shape)`，让 `f("y").then(...)` 一类的调用形状成为
  收口格可带后缀的操作数（与 [T9]/[R15] 同一条 postfix 通路）。
- `conditional-possible-shape.xl.md`：`IsBuildable` 闸门由 `HasArrowBranch` 扩为
  `HasLegacyBranch`（= `HasArrowBranch` + `UnbuildableBranchHead`），新增
  `UnbuildableBranchHead` / `ParenArrowAt` / `WordArrowAt` / `IsBuildableHeadChar`，
  中段与右段一起判「字面量 / 箭头分支头 ⇒ 整条交 legacy」。

## 收尾

- 临时产物已清理：`tmp/m-t12-*`（探针 json / log / cmp 脚本 / judge 输出）、
  本轮为跑探针复制的 `tmp/t9-digest.mjs`、`tmp/t9-smoke.mjs`、`tmp/t8d-one.mjs` 及
  `tmp/t9-smoke/`、`tmp/smoke-cases/`；最终 `git status` 空。
- `refs/merge/t12` 已删除。未 push、未改源码、未建分支、未跑 gates。
