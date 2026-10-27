# M-T5d2 合并报告 — `feature/all-possible-1027-t5d2` → `feature/all-possible-1027`

- 合并成员：M-T5d2
- 目标分支：`feature/all-possible-1027`，合并前 HEAD `fbdd0621`
- 来源：`xl-example-set/all-possible-1027-t5d2`，分支 `feature/all-possible-1027-t5d2` @ `a8132975`（base `357fa91f`）
- 合并后 HEAD：`b6aa47ea158de89029ac71fd5ff5c66ac8afc548`
- 合并提交：`b6aa47ea`，parents `fbdd0621` + `a8132975`，`--no-ff`，**冲突 0（≤2）**

## 1. 合并前预检

| 项 | 结果 |
|---|---|
| 主仓库 HEAD | `fbdd0621` ✅ |
| 主仓库工作树 | `git status --porcelain` 空 ✅ |
| fetch | `refs/merge/t5d2` = `a8132975` ✅ |
| merge-base | `357fa91f`（与声明的 base 一致）✅ |
| 三点 diff | 3 文件：2 个源 + `_reports/T5d2.md`，源文件 +3 / −2 ✅ 与声明完全一致 |

## 2. 合并

`git merge --no-ff refs/merge/t5d2 -m "merge(t5d2): source param for control-flow/declaration statements"`

`Merge made by the 'ort' strategy`，无冲突，无手工解冲突。

`git diff --numstat fbdd0621 b6aa47ea`：

| 文件 | +/− |
|---|---|
| `_reports/T5d2.md` | +52 / −0 |
| `typescript/tokens/statements/control-flow-statement-possible-shape.xl.md` | +1 / −1 |
| `typescript/tokens/statements/declaration-statement-possible-shape.xl.md` | +2 / −1 |

合计 3 files changed, 55 insertions(+), 2 deletions(-)——源文件部分正是 +3 / −2，与预期一致；未触碰任何其它源码。

## 3. 验收证据

| 项 | 命令 | 结果 |
|---|---|---|
| xl build | `xl_build { paths:["core","typescript"], targets:["ts"] }` | **0 error**；2 written（正是本次两个 `control-flow` / `declaration` 文件）、636 skipped、0 planned，3 warning（均为既有 `E1107`：`class-get/index/set-accessor-possible-shape`，与本次无关） |
| 类型检查 | `node node_modules/typescript/bin/tsc -p .` | **exit 0** ✅ |
| 目标用例 | `node tmp/target-cases.mjs` | `cases=30 ok=29 moved=0 diff=0 error=0 fallback=1`，**exit 0** ✅ 与预期 29/1/0/0 一致；fallback 仅 `LastFileFallback=1`（回退后 AST 仍 ok），pin-miss=0 |
| statements 8/8 | `^## method ComputeByIndex:.*source:PossibleSource` | **8/8 台账全中** ✅（`case-clause-head`、`case-clause-statement`、`expression-statement`、`root-expression-statement`、`statement-end`、`variable-statement`、`waiting-end-possible`、`declaration-statement`） |
| 附带 | 同上 grep | `control-flow-statement-possible-shape` 亦命中，故 `statements/` 共 **9** 个文件带 `source:PossibleSource`（8/8 台账 + control-flow 补齐项） |

说明：`statements/` 下 `^## method ComputeByIndex` 共 15 行，带 source 的 9 个；其余仍为 T3 写域的 3 参版本，留待后续，本次未动。

## 4. 清理

| 项 | 结果 |
|---|---|
| 解 junction | `all-possible-1027-t5d2\node_modules` → `xl-example\node_modules`，用 `cmd /c rmdir`（不递归）仅解链，**主仓库 node_modules 完好**（`typescript` 仍可解析）✅ |
| 删除目录 | `all-possible-1027-t5d2` 整棵删除，`Test-Path` = False ✅ |
| 删除 ref | `git update-ref -d refs/merge/t5d2`，`rev-parse --verify` 返回 128（不存在）✅ |

## 5. 合规

不 push、不改源码、不建分支；最终 `git status --porcelain` 空（本报告 `git add -f` 后提交）。

**最终 HEAD：`b6aa47ea158de89029ac71fd5ff5c66ac8afc548`**
