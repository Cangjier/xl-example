# M-T4 — T4 目标用例矩阵合入

- 主仓库：`C:\Users\Admin\Documents\GitHub\xl-example`
- 集成分支：`feature/all-possible-1027`
- 合并前 HEAD：`70c3d63247709db495acbc9807735d10a9834142`（工作树干净）
- 来源：`xl-example-set/all-possible-1027-cases` 分支 `feature/all-possible-1027-cases` @ `8a4b479bd0274c341a189a5c41bb3053ce8b4a73`（base 70c3d632）
- 方式：`git fetch --no-tags ... "feature/all-possible-1027-cases:refs/merge/t4"` → `git merge --no-ff`
- 冲突：0（ort 自动合并）
- 合并后 HEAD：`640da03ac762ea4d202ddbfe6008ca667718ded4`（父提交 70c3d632 + 8a4b479b）

## 三点 diff 预检

`git diff --name-only HEAD...refs/merge/t4` 共 32 个文件，全部落在允许范围内：

| 顶层目录 | 文件数 |
| --- | --- |
| `tests/`（`tests/cases/all-possible-1027/` 30 条用例） | 30 |
| `tmp/`（`tmp/target-cases.mjs`，源分支已 `-f` 入库） | 1 |
| `_reports/`（`T4-baseline.md`） | 1 |

合计 +655 行，0 删除，无源码改动。

## 验证（未跑 gates）

`node tmp/target-cases.mjs` 正常退出（exit 0）：

```
REPO:      C:\Users\Admin\Documents\GitHub\xl-example
BUILD:     build/ts
CASES-DIR: tests/cases/all-possible-1027
FLAGS:     shell=true bracketRoleCatalog=true fileFallback=true controlFlowShell=true
SELECTED:  30/30
...
SUMMARY: cases=30 ok=29 moved=0 diff=0 error=0 fallback=1 | LastFileFallback=1（其中回退后 AST 仍 ok=1） | pin-miss=0
```

- 用例数：30（`tests/cases/all-possible-1027/001..030` 全部在库）
- 读数：**29 ok / 1 fallback / 0 diff / 0 error**，与预期一致
- 唯一 fallback：`026-if-regex-test`（整条文件回退 legacy，AST 仍逐字一致；首跳：缺少标识符）
- pin-miss = 0
- 探针文件在提交里（`git ls-files tmp/` → `tmp/target-cases.mjs`），无需另保留拷贝

## 清理

- 解 `node_modules` junction（`[System.IO.Directory]::Delete($nm, $false)`，指向主仓库 `node_modules`，解链后主仓库依赖完好）后删除 `xl-example-set/all-possible-1027-cases` 整个目录。
- `git update-ref -d refs/merge/t4` 已执行，`git show-ref refs/merge/t4` 为空（exit 1 = 不存在）。

## 最终状态

- HEAD：`640da03ac762ea4d202ddbfe6008ca667718ded4`
- `git status --short`：空（本报告提交前为空；提交后仅本文件所在提交）
- 未 push、未改源码、未建新分支。
