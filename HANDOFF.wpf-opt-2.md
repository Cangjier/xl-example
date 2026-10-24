# HANDOFF — wpf-opt-2（WP-F 性能收口第二轮）

STATUS: COMPLETE（批内 splice 合并已落地；AST/门禁全绿；memberCount 目标读数达标但该档噪声大）
BRANCH: wpf-opt-2
BASE: wpf-opt-final @ bf176538
CLONE: C:\Users\Admin\Documents\GitHub\xl-example-set\wpf-opt-2
COMMITS: 2ec4c9ac（批末一次压实）、bbae1e5a（压实从首个替换区间起点开始）

## 实现了什么

### (d) `ItemListEngine.ApplyBuilds`：逐 item `splice` → 批末一次压实
`core/syntax/batch/item-list.xl.md`

原实现对每个 `PendingBuild` 调一次 `host.Data.splice(from, to - from, item)`：每次搬 `Data` 的
剩余尾巴 O(剩余)，一批建出 k 个 item 时是 k 次搬移叠加（memberCount 多时 item 数与尾巴同时增长）。
批内替换区间互不重叠且从左到右（`Feed` 顺序产出），因此改成**一次从左到右「读 src / 写 dst」压实**：

- 每个区间写进 item、区间外的 unit 原序复制，`dst <= src` 恒成立（区间至少换掉一格、只写一个 item），
  前向复制不会覆盖未读 unit；**不替换数组对象**（`data.length = dst` 截尾），别名安全。
- `cursor = batch.To - 净压缩量`（所有区间都在 `batch.To` 左侧），与逐 build 从右向左计数等价。
- `State.Start/Checked/End/LastCode` 的 `Rebase` 与 `CodeAt` 的双指针重定位原样保留（上一轮成果）。
- 压实从**首个有效区间的 `From`** 开始，前缀一格不动（上一版从 `Data[0]` 起空转）。
- 与「从右向左逐个 `splice`」逐位等价：同样的区间、同样的 item、同样的剩余 unit 顺序。
- INV-3 语义保持：被替换点左侧的下标在整批内始终有效（`PendingBuild.From/To` 仍是替换前坐标）。
- 相关注释/文档一并改成「批末一次压实」，不再说「从右向左 splice」。

### 未做（如实记录）
- `Feed` 里 `LineBreakAt` 对每个 trivia unit 调一次 `Document.GetRaw` 分配子串，未合并成段扫描：
  合并需要跨 unit 读一段区间，若相邻 trivia 的源码区间有缝，会把缝隙文本也读进来，改变
  `HasLineBreak` 的判据（ASI 语义）。收益不抵风险，留作剩余项。

## 门禁读数（bbae1e5a 实测）

| 项 | 命令 | 结果 |
|---|---|---|
| xl_build | `core+typescript → dist` | 510 written / 0 skipped / 0 error（首次全量）；改动后 1 written / 61 skipped / 0 error |
| xl_check | 同上 | **0 error** / 1274 warning（与基线同量） |
| tsc | `node node_modules/typescript/bin/tsc -p tsconfig.json` | exit 0 |
| AST 全量 | `ast-json.mjs` | 6167/6167 cj-ok |
| AST diff | `ast-json-diff.mjs` | 6167/6167；结构 0 / 位置 0 / 字段 0 |
| real-dts | `real-dts-ast.mjs` | 226 解析成功 / 崩溃 0 / 逐节点一致 226 |
| item-oracle | `item-oracle.mjs` | PASS（454 前缀逐前缀一致） |
| batch-split | `batch-split.mjs` | PASS 70 段 / 837 断言 / 0 失败 |
| stream-proof | `stream-proof.mjs` | PASS 146 / FAIL 0 |
| standard | `..\tools\gates.ps1 -Tier standard` | **PASS**（12.3s；RED* 仅基线已知红的 tests/gates/run.mjs；xl_check SKIP 用工具替跑） |
| full | `..\tools\gates.ps1 -Tier full` | **PASS**（36.6s；buffer-equivalence waived 等价 PASS；class/statement-scaling 全 PASS；OPEN-Q4 记录不阻塞） |

## 性能（本机；class-scaling `--rounds 15`，同会话；memberCount 档噪声大，见下）

### memberCount（档 A）
| 档 | 本轮 new | 审计基线 `..\baseline-build\build` | 比 |
|---|---|---|---|
| 250 | 11.37 ms | 12.53 | 0.91 |
| **500** | **22.57 ms**（另两次 26.24 / 29.78） | 25.24（另两次 24.8 / 23.96~25.64） | **0.89**（首轮）；交错 A/B 0.96 / 1.07 |
| 1000 | 57.83 | 59.06 | 0.98 |
| **2000** | **113.0 ms** | 111.5 | **1.01** |

> 500 档跨进程抖动 22.6–31.4 ms（同样抖动的 parent 23.4–30.8 ms），单次读数不可判。
> 与 parent `bf176538` 的三次交错 A/B（每次 3 轮取中位）：
> - 第一组：500 = 26.24 / 27.32 = **0.96**；2000 = 110.3 / 110.8 = **0.995**
> - 第二组（加前缀跳过后）：500 = 29.78 / 27.83 = **1.07**；2000 = 113.5 / 114.4 = **0.992**
>
> 结论：没有超过 ≤1.10 的判据（交错中位最差 1.07），但 500 档的改动量级被噪声盖住，
> 不能声称有明确提速；2000 档与基线持平。

### 大成员体（保持 <1.0）
| 档 | new | 审计基线 | 比 |
|---|---|---|---|
| class-len-2000 | 4.65 | 6.94 | 0.67 |
| iface-len-2000 | 4.79 | 6.02 | 0.80 |
| decor-len-2000 | 4.92 | 7.80 | 0.63 |

### parse（`parse-perf --dts 8 --repeat 5` 3 轮，TOTAL 中位）
- new：522.41 / 494.145 / 560.882 → 中位 **522.41 ms**（前缀跳过版另 3 轮 517.469 / 587.546 / 470.708 → 中位 **517.47**）
- 审计基线：541.595 / 513.72 / 523.067 → 中位 **523.07 ms**
- **0.999×**（≤1.05 保持）

### statement-scaling（`--rounds 15 --max-size 500`，1 轮）
PASS 6 对；与 parent 同档差 ≤10%（档 2：3.94/8.48 vs 3.70/8.44；档 3：1.18/2.26 vs 1.40/2.34；
档 4：1.08/2.05 vs 1.08/2.09；档 5：1.81/3.54 vs 1.72/3.66），绝对值均 <9 ms，未恶化。
full 档的 statement-scaling 也全 PASS（15 对 / 40 项等价）。

## 剩余项（下一轮）
1. **memberCount-500 的判定噪声**：该档在 22.6–31.4 ms 间摆（同一构建、同一会话），
   下一次要判定 ≤1.10 应固定 CPU 频率、或用「同进程内交替加载两份 build」的 A/B，避免跨进程抖动。
2. **前缀已跳过，尾部仍是 O(尾巴)**：压实每批只处理 `[首个 From, Data.length)`；若某批 item 极少
   而 `Data` 很长，仍有空转。可进一步只压到最后一个区间之后。
3. `LineBreakAt` 的 `GetRaw` 合并（见上，语义风险）。
4. `StatementItemScan.Decide` 的 token-kind 位掩码快速否定（上轮未做）。

## 踩过的坑
- `let shift` 在 `ApplyBuilds` 的 `CodeAt` 块里已存在，新增同名变量会 `TS2451`；本轮改成 `removed`。
- `.xl.md` 代码块里 `[IO.File]::ReadAllBytes('相对路径')` 相对的是**进程** cwd 而不是 pwsh 的 `cd`，
  校验 BOM/CRLF 要用绝对路径。
- class-scaling 的 `--build ..\other\build` 可以跨仓库跑，但**同一 build 在不同 clone 根里读数也会差
  20–30%**（500 档：27.24 vs 22.34）；跨进程比较只能用同批交错的中位。
