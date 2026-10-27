# M-T5b2 · 合入 `feature/all-possible-1027`

- 合并成员：M-T5b2
- 目标分支：`feature/all-possible-1027`，合并前 HEAD `c990a69f`
- 来源：`xl-example-set/all-possible-1027-t5b2` @ `72623d89`（base `c1e64c03`），经 `git fetch ... :refs/merge/t5b2` 取得
- 提交：`merge(t5b2): source param for declarations N-Z`
- **最终 HEAD：`e689db569b4a98064789a4e7c10d69402784886c`**

## 1. 前置检查

| 项 | 结果 |
|---|---|
| 合并前 HEAD = `c990a69f` | ✓ |
| 工作树干净 | ✓（`git status --porcelain` 空） |
| 合并基点 `git merge-base` | `c1e64c03` = 契约中的 base |
| fetch `refs/merge/t5b2` | `72623d890ec8...` ✓ |

## 2. 三点 diff 预检（`c990a69f...refs/merge/t5b2`）

10 个文件，`+135 / -11`，与契约的「9 源 + _reports」逐项一致：

- `A _reports/T5b2.md`
- `M` 9 个 `typescript/tokens/declarations/*-possible-shape.xl.md`：`named-exports`、`named-imports`、
  `namespace-export-declaration`、`namespace-export`、`namespace-import`、`type-alias-declaration`、
  `type-alias-literal-start`、`variable-declaration-end`、`variable-declaration-list`

关键边界已逐行核对：`VariableDeclarationListEndPossibleShape` 的**恰好 2 处**
`super.ComputeByIndex(units, tokenIndex, cache)` → `super.ComputeByIndex(units, tokenIndex, cache, source)`，
签名加 `source:PossibleSource`；全 diff 中 `Super.ComputeByIndex` 改动行 = 2（无多余透传点）。

## 3. 合并

```
git merge --no-ff refs/merge/t5b2 -m "merge(t5b2): source param for declarations N-Z"
```

`ort` 策略自动合并，**冲突 0**（上限 2）。10 files changed, 135 insertions(+), 11 deletions(-)。

## 4. 验证

| 项 | 结果 |
|---|---|
| `xl_build { paths:["core","typescript"], targets:["ts"] }` | **0 error**，9 written / 629 skipped；3 warning 均为既有 `E1107` 重复类型（`types/class-*-possible-shape`），与本族无关 |
| `node node_modules/typescript/bin/tsc -p .` | **exit 0** |
| `node tmp/target-cases.mjs` | **cases=30 ok=29 fallback=1 diff=0 error=0**，`LastFileFallback=1`（回退后 AST 仍 ok=1）、`pin-miss=0` — 与基线逐字一致 |
| 本族 grep `source:PossibleSource` | **9/9** 文件命中 |
| 本族 `## method ComputeByIndex(..., source:PossibleSource)` | **11/11**（`variable-declaration-list` 独占 3 个候选，其余 8 文件各 1） |

## 5. 清理

- `xl-example-set/all-possible-1027-t5b2`：先 `rmdir` 解开 `node_modules` junction（指向主仓库
  `node_modules`），确认主仓库 `node_modules/.bin/tsc` 完好后，才 `Remove-Item -Recurse` 删除整树。
  该目录为独立克隆（自带 `.git` 目录），非 `git worktree` 注册项，故无需 `git worktree remove`。
- 已删：目录不存在 ✓；主仓库依赖完好 ✓
- `git update-ref -d refs/merge/t5b2` ✓（`show-ref` 已无该项）

## 6. 收尾状态

- 最终 HEAD：`e689db569b4a98064789a4e7c10d69402784886c`
- `git status --porcelain`：**空**
- 未 push、未改源码、未建分支；本报告按契约 `git add -f` 入库（`_reports/` 被忽略）
