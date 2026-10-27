# M-T10 合并报告

- 主仓库：`C:\Users\Admin\Documents\GitHub\xl-example`
- 目标分支：`feature/all-possible-1027`
- 合入：`refs/merge/t10` = `da19f37c`（base `40b30049`）
- 合并方式：`git merge --no-ff`，**冲突 0 处**
- 合并提交：`merge(t10): arrow body continuation and block-body ASI boundary`
- 合并后 HEAD：`bce56719`

## 预检

| 项 | 结果 |
| --- | --- |
| 合并前 HEAD | `40b30049`（一致） |
| 工作树 | 干净 |
| 三点 diff（base → t10） | 3 文件：`_reports/T10.md` + 2 个 `xl.md`，与任务书一致 |

## 验证（未跑 gates）

| 检查 | 期望 | 实测 |
| --- | --- | --- |
| `xl build` | 0 error | **2 文件写出、636 跳过、0 error**（3 条 E1107 为既有重复类型告警） |
| `tsc` | exit 0 | **exit 0**，无诊断 |
| 选中 case `expr-arrow-body-nested-ternary` | judge ok + 无 fallback | `{"status":"ok","structural":[],"moved":[],"fields":[]}`，`fallback=false` |
| 选中 case `gap-r1231-decl-newline-operator` | judge ok + 无 fallback | 同上 |
| 选中 case `stmt-adversarial-shapes` | judge ok + 无 fallback | 同上 |
| 全语料 fallback（`tmp/t9-digest.mjs`） | 57 → 54 | **57 → 54（−3）**，`files=1716`，掉出 fallback 的正是上述 3 条 |
| 1716 AST 指纹 | 不变 | **changed=0**（与 T10-base、T10-final 逐条比对均 0 差异） |
| 30 target（`node tmp/target-cases.mjs`） | 30/30、fallback=0 | **cases=30 ok=30 moved=0 diff=0 error=0 fallback=0 \| LastFileFallback=0 \| pin-miss=1** |
| 5 smoke `ts.json` SHA256 前 16 位 | 不变 `BB07DA2201FC5087` | **5/5 `BB07DA2201FC5087`**，body 均 `status=ok` |

`pin-miss=1` 为既有现象（026 的 `// xl:expect fallback` 按要求未改），与本轮无关。

## 内容落地

- `type-catalog-factory.xl.md`：`CanEndInitializer` 不把 `=>` 当作初始化器的终点。
- `declaration-asi-boundary.xl.md`：`ArrowBodyCloseStartsStatement` —— 块体 `}` 收口后，跨行 `/` 起始新语句。

## 收尾

- `tmp/m-t10/`、`tmp/t9-digest.mjs`、`tmp/t9-smoke.mjs`、`tmp/smoke-cases/`、`tmp/t9-smoke/` 临时产物已清理；最终 `git status` 空。
- `refs/merge/t10` 已删除。未 push、未改源码、未建分支。
