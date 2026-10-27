# M-T5e 合并报告

- 目标分支：`feature/all-possible-1027`
- 合并前 HEAD：`08a87d15`（工作树干净）
- 合并源：`refs/merge/t5e` = `aca8a3e5`（base `c1e64c03`）
- 合并方式：`git merge --no-ff refs/merge/t5e`
- 合并提交：`01571ff9a26a1ac062e6069ce56b03afa3a3784b`
- 冲突：0（ort 策略，7 文件：6 源文件 + `_reports/T5e.md`）

## 预检（三点 diff）
`git diff --stat c1e64c03 refs/merge/t5e` = 7 文件 / +62 −6：
`_reports/T5e.md`、bindings ×3、literals ×1、members ×1、files ×1。
主分支侧自 base 以来只改 `forms/` 等文件，与 T5e 无路径重叠，故无冲突。

## 验证
| 项目 | 结果 |
|---|---|
| `xl_build` | 0 error，6 written / 633 skipped，3 warning（既有 E1107 重复类型声明，与本次无关） |
| `npx tsc -p .` | exit 0，无输出 |
| `node tmp/target-cases.mjs` | `cases=30 ok=29 moved=0 diff=0 error=0 fallback=1`（026 文件级 legacy 回退，AST 仍逐字一致） |
| 四目录 grep `source:PossibleSource` | bindings=3、literals=1、members=1、files=1 → 合计 6/6 ✅ |

## 清理
- `xl-example-set\all-possible-1027-t5e`：先 `rmdir` 解除 `node_modules` junction（指向主仓库 node_modules），再整树删除；主仓库 node_modules 未受影响。
- `git update-ref -d refs/merge/t5e` 已执行，`show-ref` 返回 1（引用已不存在）。

## 最终状态
- HEAD：`01571ff9a26a1ac062e6069ce56b03afa3a3784b`
- `git status --porcelain`：存在 1 个非本次合并产生的改动
  `M typescript/tokens/statements/control-head-possible-shape.xl.md`（内容为 T3 `IsMemberName` / 成员名位让位改动，文件 mtime 15:53:12 落在本次合并验证期间，系并行成员写入）。按「不改源码」规则未触碰、未回退，交由该文件所属成员 / 父级处理。
