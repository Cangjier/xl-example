# M-T5b1 合并报告：declarations A–M 的 `source:PossibleSource`

日期：2026-10-27 · 合并智能体：M-T5b1 · 仓库：xl-example（feature/all-possible-1027）

## 合并

| 项 | 值 |
| --- | --- |
| 基线 $BASE | `1e35bfd7d69bd8fb0218b616926995e6dd2f270d` |
| 源分支 | `feature/all-possible-1027-t5b1` @ `7688e5f9927e1fcd06135f42251fdd97c9c27308`（base `c1e64c03`） |
| 源工作副本 | `xl-example-set/all-possible-1027-t5b1` |
| 合并提交 | `bbcced46d2ce67de2adf59bb6b81baed447149a8` |
| 合并方式 | `git merge --no-ff refs/merge/t5b1`，**零冲突**（0 文件需手工保双侧） |
| 改动规模 | 22 源文件 + 1 报告，+203 / −26 |

落地：`typescript/tokens/declarations/` 顶层 19 文件（`class-*` … `module-*`）+ `forms/` 3 文件
（`declare-variable-possible-shape`、`export-inner-declaration-delegate`、
`import-export-legacy-declaration-mount`），共 26 个 `ComputeByIndex` 候选全部加第 4 形参
`source:PossibleSource`。纯机械签名迁移：只加形参与 import，不改判据、不改调用顺序。

三点预检：`git diff --name-status 1e35bfd7...refs/merge/t5b1` = 22 M + 1 A，与工单范围一致。

## 验收

| 项 | 结果 |
| --- | --- |
| `xl_build`（ts） | **22 written / 616 skipped / 0 error**，3 条 E1107 既有告警（`class-get/index-signature/set-accessor-possible-shape` 重复类型声明，与本族无关） |
| `tsc` | **exit 0** |
| `node tmp/target-cases.mjs`（OFF） | cases=30 **ok=29 / fallback=1 / moved=0 / diff=0 / error=0**；fallback 为 `026-if-regex-test`（回退 legacy 后 AST 仍 ok），pin-miss=0 |
| 本族 26/26 | 22 文件 · `^#\s+class\s+\w+PossibleShape\s+extends` = **26** · `^##\s+method\s+ComputeByIndex:` = **26** · 签名行含 `source:PossibleSource` = **26**；逐文件 `cls == sig == src`，0 失配 |

## 清理

- 解 junction：`xl-example-set/all-possible-1027-t5b1/node_modules`（→ 主仓 `node_modules`）以
  非递归方式删除，**未跟随到目标**；主仓 `node_modules/typescript` 复核仍在。
- 删除工作副本目录：`exists=False`。
- `git update-ref -d refs/merge/t5b1` 已执行，ref 不可解析。
- 未 push、未 pull、未建分支、未改源码；未重生成 INDEX/README。

## 最终状态

- 最终 HEAD：**`bbcced46`**（合并提交）。
- `git status --short`：**空**。
