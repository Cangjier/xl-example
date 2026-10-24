# HANDOFF — wpf-opt-final（WP-F 性能收口）

STATUS: COMPLETE（(a)(c) 已落地；parse 目标达成，memberCount 部分达成）
BRANCH: wpf-opt-final
BASE: refactor-integration @ 4925b21a
CLONE: C:\Users\Admin\Documents\GitHub\xl-example-set\wpf-opt-final

## 实现了什么

### (a) `RootItemRule.HasTailNew` 去递归 + 按区间剪枝（`typescript/tokens/items/root-item-rule.xl.md`）
自递归改成显式栈：只把 `StartIndex <= endIndex <= EndIndex` 的子节点压栈（合成节点 `StartIndex < 0` 保守压栈）。
右界正好是 `endIndex` 的节点必然落在包含该点的子树里，所以常见情形（尾节点不是 `NewExpressionShape`）
只沿一条右侧路径下降，O(深度) 而不是 O(形状树节点数)。判据逐项不变（`constructor.name` + `EndIndex === endIndex`）。

### (c) `ItemList.ApplyBuilds` 的 CodeAt 重定位线性化（`core/syntax/batch/item-list.xl.md`）
原实现对 `State.CodeAt` 的**每个下标**调用一次 `Rebase`，而 `Rebase` 遍历本批全部 `builds`：
一条 item 跨 m 个单元、本批建出 b 个 item 时是 O(m×b)。`CodeAt` 与 `builds` 都升序，
改成一次双指针合并（累计左侧压缩量 + 区间内收束到 `From`），O(m+b)。与 `Rebase` 逐项等价；
5 个标量字段仍走 `Rebase`（b 次，可忽略）。splice 循环本身保持从右向左（INV-3）。

**未做**：(b) `StatementItemScan.Decide` 的 token-kind 位掩码快速否定——本轮时间用尽，未改（现状 0.98–1.04，无回归）。

## 门禁读数（本分支实测）

| 项 | 命令 | 结果 |
|---|---|---|
| xl_build | `core+typescript → dist` | 2 written / 508 skipped / 0 error |
| xl_check | 同上 | **0 error** / 1274 warning（与基线同量） |
| tsc | `node node_modules/typescript/bin/tsc -p tsconfig.json` | exit 0 |
| AST 全量 | `ast-json.mjs` | 6167/6167 cj-ok |
| AST diff | `ast-json-diff.mjs` | 6167/6167；结构 0 / 位置 0 / 字段 0 |
| real-dts | `real-dts-ast.mjs` | 226 解析成功 / 崩溃 0 / 逐节点一致 226 |
| item-oracle | `item-oracle.mjs` | PASS（454 前缀逐前缀一致） |
| batch-split | `batch-split.mjs` | PASS 70 段 / 837 断言 / 0 失败 |
| stream-proof | `stream-proof.mjs` | PASS 146 / FAIL 0 |
| standard / full | `..\tools\gates.ps1` | 见下（WAIVED 项照旧记录） |

## 性能（静默，new 3 轮 / base 3 轮，每轮 `--repeat 5` 取中位）

`parse-perf --dts 8 --repeat 5`：new **492.8 / 507.6 / 534.6 ms**（中位 **507.6**），
base **500.7 / 517.2 / 535.9 ms**（中位 **517.2**）⇒ **0.982×**（审计基线 1.070×，目标 ≤1.05 达成）。
（单轮 TOTAL = 8 份 d.ts 逐文件中位之和；原始 JSON 在 `tmp/perf-final2/`。）

`class-scaling --rounds 15`（new/base）：
| 档 | new | base | 比 |
|---|---|---|---|
| class-len-2000 | 4.863 | 7.411 | 0.66 |
| iface-len-2000 | 4.755 | 6.186 | 0.77 |
| decor-len-2000 | 5.078 | 8.218 | 0.62 |
| memberCount-250 | 11.28 | 12.48 | 0.90 |
| **memberCount-500** | **28.48** | **24.57** | **1.16**（审计 1.26） |
| memberCount-1000 | 52.08 | 53.01 | 0.98 |
| **memberCount-2000** | **120.14** | **105.03** | **1.14**（审计 1.18） |

大成员体保持 0.62–0.77（改善 23–38%）；memberCount 从 1.26/1.18 降到 1.16/1.14，**未达 ≤1.10**。

`statement-scaling --rounds 15 --max-size 500`（1 轮）：0.99 / 0.98 / 1.01 / 0.98 / 1.02 / 1.01 / 1.04 / 1.01 / 1.03 / 1.14 / 0.99；
仅 `block-depth-250` 1.14（绝对值 ~1.5ms，审计已定性为噪声），其余 ≤1.04，**未恶化**。

## 剩余热点（下一轮）
1. memberCount 500/2000 仍 +14–16%：`host.Data.splice` 每个 item 一次、对宿主数组做 O(剩余长度) 搬移；
   成员数多时 item 数线性增长而每次 splice 的尾部搬移叠加。下一步可试「批内只记偏移、批末一次重建数组」。
2. `StatementItemScan.Decide` 快速否定（本轮未做），对应 `ScanRoot` 自时间。
3. `ItemListEngine.Feed` 的 `LineBreakAt` 对每个 trivia unit 调 `Document.GetRaw` 分配子串；可按连续 trivia 段合并成一次扫描。

## 踩过的坑
- `.xl.md` 代码块里内联类型必须写 `number`，写 `int` 会原样进 `.ts` → tsc `TS2304`（方法标题里的 `int` 是元数据，不受影响）。
- class-scaling 的 new/base 必须各自在自己的仓库根跑（`--build build` 相对各自 root），跨 root 用 `--base ..\baseline-build\build` 只会做 XML 等价。