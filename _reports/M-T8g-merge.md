# M-T8g 合并报告：`feature/all-possible-1027-t8g` → `feature/all-possible-1027`

| 项 | 值 |
|---|---|
| 基座 HEAD | `e4907d74`（工作树干净） |
| 合并来源 | `all-possible-1027-t8g` @ `70cfde64`（base `e4907d74`） |
| 合并方式 | `git merge --no-ff refs/merge/t8g`，`merge-base` = `e4907d74` |
| 冲突 | **0**（上限 2） |
| 合并后 HEAD | `66abdc4dd4c93778cd14415f5e8515da6656d970` |
| 最终 status | 空 |

## 三点 diff 预检（`HEAD...refs/merge/t8g`）

```
 _reports/T8g.md                                    | 162 +++++++++++++++++++++
 typescript/tokens/types/type-catalog-factory.xl.md |  77 +++++++++-
 2 files changed, 238 insertions(+), 1 deletion(-)
```

1 个 `xl.md` + `_reports`，与任务书一致。

## 验证（不跑 gates）

| 项 | 要求 | 实测 |
|---|---|---|
| `xl_build(core, typescript → ts)` | 0 error | **1 written / 636 skipped / 0 error / 3 warning**（3 条均为既存 E1107 重复类型声明） |
| `node node_modules/typescript/bin/tsc -p .` | exit 0 | **exit 0** |
| `node tmp/target-cases.mjs` | 30/30、fallback=0 | **cases=30 ok=30 moved=0 diff=0 error=0 fallback=0 \| LastFileFallback=0 \| pin-miss=1** |
| 目标 case `type-cond-in-annotation.ts` judge | status=ok、无 fallback | **`{"status":"ok","structural":[],"moved":[],"fields":[]}`** |
| 全语料 fallback（1716 条） | 61 → 60 | **60**（`last="true"` 59 + THREW 1） |
| 5 smoke `ts.json` SHA16 | `BB07DA2201FC5087` | **5/5 `BB07DA2201FC5087`** |

`pin-miss=1` 是 026 的 `// xl:expect fallback` 既存现象，与本轮无关。

## 口径备注

- `tmp/fallback-list.mjs` 的行首判定有真值 bug：`String(after.last)` 恒为真，所以它把 1716 条全部打成 `FALLBACK`。
  本轮改按行内 `last="true"` 计数（59），再加 1 条 `THREW`，合计 **60**，与预期一致。
- fallback 探针、target、judge、smoke 各跑一遍，未修改任何源码；`tmp/` 产物为临时文件（已清理），未入库。

## 清理

- 临时目录 `tmp/m-t8g-*` 已删除；`refs/merge/t8g` 已 `update-ref -d`；`git for-each-ref refs/merge` 为空。
- 未 push、未建分支、未改源码。
