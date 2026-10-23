# buffer 驱动之后的性能结论页（合并 + 独立复核）

> 本文是三条性能分支的**合并结论**：`perf/vs-ts` @ `d74165a4`、`perf/buffer-sweep` @ `2fbaec7f`、
> `perf/profile` @ `837c76c9`，全部基于 `integration-buffer` @ `f5a525c3`。
> 合成分支 `perf/buffer-analysis`；合并提交 `ba6837f3` / `ede3e423` / `b94bc74b`，三个分支只新增
> `tests/bench/*` 与 `docs/*`，**业务源码一行未改**。
>
> 下面每个数字都分开标注来源：**[作者]** = 原分支文档里的读数，**[复核]** = 合并后在本 clone 上自己重跑的读数。
> 两者同量级即视为复核通过；不一致处写在 §4。

- 交付分支：`perf/buffer-analysis`（本次新增仅 `docs/perf-summary.md`）
- 构建门禁：`xl_build`（core, typescript → ts）= 871 written / **0 error**；`tsc -p tsconfig.json` = **0 error**；
  `xl_check core,typescript` = **0 error**（2440 条 W3102/W3103 文档告警，与作者分支同量）
- 复核环境：同机 Intel Xeon Platinum 8378C @ 2.80 GHz / 16 核 / 32 GB，Windows 10.0.19044 x64，
  Node v24.21.0，TypeScript 6.0.3，2026-10-23 14:38–14:46 (+08:00)

---

## 1. 一页纸结论

### ① 对 TypeScript 官方解析器的倍数

| 口径 | ours | ts-np | ours/ts-np | ts-par | ours/ts-par |
|---|---:|---:|---:|---:|---:|
| **8 份最大 d.ts**（4,629 KB / 4.74 M 字符）**[复核]** | 1,696.5 ms | 178.4 ms | **9.51×** | 231.7 ms | **7.32×** |
| 同口径 **[作者]** | 1,659.1 ms | 187.3 ms | 8.86× | 241.2 ms | 6.88× |
| **226 份全语料**（6,928 KB / 7.09 M 字符）**[复核]** | 2,492.2 ms | 285.8 ms | **8.72×** | 347.0 ms | **7.18×** |
| 同口径 **[作者]** | 2,441–2,535 ms | 281.6–289.6 ms | 8.43–9.00× | 350.5–360.7 ms | 6.97–7.03× |

- **结论**：shape 树解析对 `ts.createSourceFile` 的差距是 **≈9×（无 parent 指针）/ ≈7×（有 parent 指针）**，
  8 份与 226 份给出同一量级 → 差距是解析路径本身的，不是语料挑选造成的。
- 每字符成本：ours **358.0 ns**、ts-np **37.6 ns**、ts-par **48.9 ns**（8 份，[复核]）；作者为 350.0 / 39.5 / 50.9。
- `ts-par/ts-np` ≈ 1.23–1.30×（[复核] 231.7/178.4 = 1.30）→ **"ours 少填 parent" 解释不了 9 倍**，差距在 shape/模板层。
- ⚠ 不可比点：ours 产物是 shape 树（**不含** AST 投影），TS 产物是 AST。倍数只能当**量级参照**，
  不能换算成"ours = N 份 TS"，也不能外推类型检查阶段。

### ② BufferSize 曲线与推荐值

| size | 8 | 16 | 32 | 64 | 128 |
|---|---:|---:|---:|---:|---:|
| Δ%（对 32）**[复核]**（单会话，repeat 5） | **+2.80** | +0.92 | 0 | −0.95 | **−1.09** |
| Δ%（对 32）**[作者]**（三次会话均值） | +3.67 | +0.80 | 0 | −0.48 | −1.24 |
| TOTAL ms **[复核]** | 3,759.2 | 3,690.3 | 3,656.7 | 3,621.9 | 3,617.0 |
| ns/字符 **[复核]** | 537.4 | 527.6 | 522.8 | 517.8 | 517.1 |

- **形状**：单调下降后饱和。`8 → 32` 省 2.8%–3.7%；`32 → 128` 只再省约 1.1%–1.2%，`128 → 256` 再省 0.19%（[作者]）→ **128 之后曲线已平**。
- **推荐：保持 `BufferSize = 32`（不动）。** 64/128 的收益（−0.5% / −1.2%）都落在 **3% 噪声带内**；
  虽然三次会话符号一致（效应真实），但幅度不足以改一个已验收的常量（`SourceFileRunner.Parse` 也写死 32，一改要同步两处）。
  > **（2026-10-23 更新：此条已作废。）** run-batching（`9e13943d`）之后重测，`32 → 128` 在 8 份 d.ts 上是
  > **+7% ~ +9.5%**（同进程 A/B），全语料 XML 逐字节等价、七道门全绿；落地方式改为**运行层显式传 128**
  > （`SourceFileRunner.Parse`），core 的 `SyntaxContext.BufferSize` 默认值仍是 32。见
  > [`docs/opt-window128-and-class-table.md`](opt-window128-and-class-table.md)。
- **不要往下调**：8 比 32 慢约 3%，相当于 7 M 字符多 100–150 ms；"窗口小一点更省内存"在时间上不是免费的。
- **噪声说明**：TOTAL 级轮间极差 3.2%–6.2%（[复核]，5 轮）；逐文件中位极差 23%（P90 72%），所以只有"全量求和 + 中位数"这一级
  的百分比有意义。这次 `8`（+2.80）恰好**压**在 3% 边界内侧、作者三次里有两次出带——因此正确说法是
  **"8 慢 ~3%（2.8%–4.1%），三次同号"**，不要说成 3.7% 的精确值。
- **语义等价**：**[复核] XML 逐字节 PASS 4497 / FAIL 0 / ERROR 0 / 同错 9**，各 size 字节总量均为 **34,046,403 B**；
  9 个在参照 size 下就解析失败的文件在所有 size 下抛同一个错。→ **窗口大小不改变语义**（与作者一致）。
- 机制：窗口只改变 `Root.Process` 的调度次数，约 **0.2–0.3 µs/窗口**；真成本在每字符 ~520–530 ns 的 token 链上。

### ③ 剩余阻塞点 top 5（按折算收益排序）

| # | 阻塞点 | 证据数字 |
|---:|---|---|
| 1 | **basic `Transit` 逐字符分派** | 10 个 `static Transit` self **22.3%[作者] / 23.5%[复核]**（64 个调用点节点聚合）；**3.37 次/字符**（8 份 13.7 M 次）；反推 **23.1 ns/次 → 每字符固定 78 ns** |
| 2 | **`UnitToken.Process` 每字符帧** | self **19.5%[作者] / 18.4%[复核]**；**0.1313 帧/字符**（533,951 次/8 份）＝ 520 ns/帧、**68 ns/字符**；纯读字符下限仅 6.1 ns/字符 → **约 62 ns/字符 是循环内重复判定**（`Messages`/`Replaying`/`MountedUnit`/`ProcessQueue`） |
| 3 | **`SourceRange.At` / `Has` 冗余读** | `At` **6.28 次/字符**、`Has` **8.06 次/字符**（作者计数，本页未复核）；`At` 只占 profile 0.72% self 是**内联假象**——它被算进 `Process`/`Transit`；按 6.11–9.47 ns/次折算 **156–242 ms（11%–17%）**，驱动循环其实每字符只需 1 次 |
| 4 | **`SourceRange.Whole` 分配 / GC** | **1,397,874 次/份 lib.dom**（占全部分配 77.4%），其中 **80.4% 出自 `HasBetween` 一行**；GC self **4.1%[作者] / 4.0%[复核]**；单价 15.84 ns → ≈38 ms/8 份 + GC ≈30 ms |
| 5 | **成员边界扫描 `FindMemberBoundary`** | self **2.75%[作者] / 2.99%[复核]**；对**每一对相邻 token** 建一个整文档区间并逐字符找换行 → ~1.12 M 次/份 lib.dom，结构上对超大 interface **近似平方** |

一句话：**瓶颈已经从"形状缓存/候选链"搬到"每字符的驱动与分派"**——#1+#2 合计 **≈42% self**[复核]，
`core/syntax`+`core/basic-tokens` 占 **67.1%**，而形状构建侧 `typescript/tokens` 只剩 **20.3%**。

---

## 2. 口径与限制（读数字前必须一起读）

1. **产物不同，倍数不是等价比值**：ours = `SourceFileRunner.Parse` 产出的 **shape 树**（template + possible-shape），
   **不含 AST 投影**；ts-np/ts-par = `ts.createSourceFile`（不建 Program、不绑符号、不做类型检查）。
   同一段源码两边建出的对象数量与字段都不同，**9× 不表示"ours 等于 9 份 TS"**。
2. **"8 份" 在两个口径下不是同一批文件**（详见 §4）：`perf-vs-ts` 取 `node_modules` 全库最大 8 份
   （含 `@types/node/*`，4,629 KB / 4.74 M 字符）；`parse-perf --dts 8` / `buffer-size-sweep --dts 8`
   取 `typescript/lib` 下最大 8 份（4,056,233 B）。**跨文档的绝对 ms 不能直接相减。**
3. **Windows CPU profiler 实际采样 ≈1 ms**：请求 `--cpu-prof-interval=100`（100 µs），实测有效间隔
   **922–1052 µs**（[复核] 本次 4,131 样本 / 3,809.3 ms → **≈922 µs**；作者四档实测 946–970 µs @50/100 µs）。
   V8 采样线程在 Windows 被计时器分辨率压到 ~1 ms，**拿不到 10 倍分辨率**。
   → 单条 **<0.7% 的差异不可信**，排序（>1%）稳定；本次 top5 内部 0.3–0.7pp 的名次交换即属此列。
4. **单次噪声 ±3–5%**：TOTAL 级（同配置跨会话）抖动 ±0.7%（buffer 32）、±5%（profile 基线）；
   单文件级 ±15–20% 常见。**结论按两位有效数字引用（≈9× / ≈7× / ~3%）**，不要拿小数点后两位做文章。
5. **profiler 会改变成本结构**：带 `--cpu-prof` 的 parse-perf 本次 1,663.3 ms，同一构建干净跑是 1,465.9 ms（+13%）。
   所以 **ms 一律用干净基线折算、百分比用 profile**，两者不能混用。
6. **单机、单进程、未绑核、默认 GC**；未做内存/GC 随窗口大小的归因；未跨机复现。
7. 本页只做测量与排序，**没有改任何业务源码**，也没有验证任何优化建议的落地效果。

---

## 3. 下一步建议排序（低风险 → 高风险）

| 顺序 | 动作 | 预估收益 | 风险 | 为什么在这个位置 |
|---:|---|---:|---|---|
| 1 | **`HasBetween` 把 `SourceRange.Whole(document)` 提出循环**（或直接 `document.GetValue(i)`） | ~30 ms（2.1%）＋ GC 下降 | **低** | 纯函数、`At ≡ GetValue` 在 `[0,count)` 上成立；一处改动消掉 1.12 M 对象/份。只注意 `document===null \|\| EndIndex<0` 的守卫别一起提掉 |
| 2 | **一次分派内只读一次字符，顺链传给 `Transit/ExitOrPre/IsAppend`（char 缓存）** | 60–100 ms（4.2%–7.0%） | **低–中** | 把 `At` 从 6.28 次/字符压到 ~1.5–2；只改 `BranchTransiter` 签名 + 十来个调用点，不动分派次序 |
| 3 | **`Transit` 分派表：按首字符 O(1) 预筛候选集** | 80–125 ms（5.6%–8.8%） | **中** | 只加"首字符 → 候选集"的**预筛**，不重排队列（队列序有语义：前一个返回 `Done` 就短路）。必须 `dts-ab.mjs` / `buffer-equivalence.mjs` 门禁 |
| 4 | **`Process` 帧瘦身**：`Messages`/`Replaying`/`MountedUnit` 改成"状态变更后才重查"，`ProcessQueue` 按下标遍历脱离 `for...of` | 55–83 ms（3.9%–5.8%） | **中** | 收益大但碰推进语义（`context.Index` 的 `no progress` 守卫容易被破坏），要 parse-perf + 等价性双向门禁 |
| 5 | **建造层 / 候选记忆化**：相邻 token 换行判定按 `tokenIndex` 记忆化、`ComputePossibleShapesByIndex` 的候选结果复用、`GetState` 键换静态 id | 30–55 ms（2%–4%） | **高（改动面）/ 低（单项）** | 涉及多份近似循环（`FindMemberBoundary` / `FindTypeMemberBoundary`）与 `constructor.name` 键语义；建议拆成单项小步做 |

**推进建议**：`1 → 2 → 4 → 3 → 5`。先吃掉两件低风险的（1、2 合计 ≈6%–9%，且不改分词语义），
再动 4 与 3（这两项必须配等价性门禁），建造层记忆化放最后。

每步的验收门禁（沿用作者口径）：
- 时间：`node tests/bench/parse-perf.mjs --dts 8 --repeat 3`（**至少 repeat 3 并看 samples**，单次抖 ±10%）
- 计数：`node tests/bench/dts-cost-probe.mjs --count --files 1`（看 `At`/`Has` 每字符次数是否下降）
- 分配：`node tests/bench/dts-alloc-probe.mjs --files 1 --attribute`（`Whole` 应从 1.40 M 掉到 ~0.27 M）
- 等价：`tests/bench/buffer-equivalence.mjs`、`tests/bench/dts-ab.mjs`

---

## 4. 合并者复核（独立重跑，不照抄作者结论）

**复核做了四件事**：① 8 份 TS 对照 ② 226 份全语料 ③ buffer 5 档扫描（含 XML 等价）④ 自己抓一份 cpuprofile 并汇总
（作者未提交 `.cpuprofile`：`tmp/` 在 `.gitignore` 里，属预期，已按文档命令重抓）。

### 4.1 三组读数对照

| 项 | 作者 | 复核（本次） | 偏差 | 判定 |
|---|---:|---:|---:|---|
| TS 8 份 ours/ts-np | 8.86× | **9.51×** | +7.3% | 同量级（作者自报轮间漂移 ±6.3%，单文件 ±15–20%） |
| TS 8 份 ours/ts-par | 6.88× | **7.32×** | +6.4% | 同量级 |
| TS 226 份 ours/ts-np | 8.43–9.00× | **8.72×** | 落在作者区间内 | 一致 |
| TS 226 份 ours/ts-par | 6.97–7.03× | **7.18×** | +2.6% | 一致 |
| buffer 8 → Δ% | +3.67%（均值） | **+2.80%** | −0.87pp | 同号、同量级；本次在 3% 带内缘 |
| buffer 128 → Δ% | −1.24%（均值） | **−1.09%** | +0.15pp | 一致 |
| buffer XML 等价 | PASS 4497 / FAIL 0 / 同错 9 | **完全相同**（34,046,403 B × 5 档） | 0 | **完全一致** |
| profile top1 `UnitToken.Process` | 19.48% | **18.41%** | −1.07pp | 一致（≈1 ms 采样下 ~1pp 属噪声） |
| profile 10 个 `Transit` 合计 | 22.26% | **23.47%**（64 节点聚合） | +1.2pp | 一致（分母/口径略有差别，见下） |
| 干净基线 parse-perf --dts 8 | 1,424.8 ms | **1,465.9 ms** | +2.9% | 一致（作者自报机器抖动 ±5%） |

**profile top5 对照**（`order` 一致性的唯一分歧点）：

| # | 作者 | 复核 |
|---|---|---|
| 1 | `Process` (unit-token:34) 19.48% | `Process` (unit-token:34) **18.41%** |
| 2 | `Transit` (symbol:65) 4.62% | `Transit` (wrap-symbol:23) **4.84%** |
| 3 | `Transit` (wrap-symbol:23) 4.39% | `Transit` (common:444) **4.76%** |
| 4 | `Transit` (common:444) 3.71% | `Transit` (symbol:65) **4.11%** |
| 5 | `Transit` (shebang:49) 3.24% | `Transit` (shebang:49) **3.34%** |

- **top5 的函数集合完全相同**（`Process` + 4 个 basic `Transit`），#1 与 #5 名次一致；
  中间三个 Transit 互换了位置（`symbol`/`wrap-symbol`/`common`，彼此差 0.3–0.7pp）。
  在 **≈0.92 ms 采样间隔**下，这个交换量级就是单样本噪声，**排序结论（Process 一家独大 + Transit 摊平在十个小函数里）成立**。
- 作者 22.26% 是"top-120 里 10 个 basic `Transit`"；复核 23.47% 是"全部 64 个名为 `Transit` 的节点"，
  分母略宽，两者不是同一分子，**差值 1.2pp 不构成矛盾**。
- 目录占比也对得上：`core/syntax` 34.9%[复核] vs 36.7%[作者]、`core/basic-tokens` 32.2% vs 30.8%、
  `typescript/tokens` 20.3% vs 19.6%、GC 4.0% vs 4.1%。

### 4.2 发现的口径问题（不影响结论，但影响跨文档引用）

1. **两处"8 份"不是同一批文件。** `perf-vs-ts` 说"8 份最大 d.ts = 4,629 KB / 4.74 M 字符"（扫全 `node_modules`，含 `@types/node/*`）；
   `parse-perf`/`buffer-size-sweep` 的 `--dts 8` 是"`typescript/lib` 下最大 8 份 = 4,056,233 B"。
   两份文档都写作"最大 8 份"，实际是**两个语料**。→ 引用绝对 ms 时必须带脚本名与参数，
   **`perf-profile-buffer.md` §2 的 1,424.8 ms 与 `perf-vs-ts.md` 的 1,659.1 ms 不可相减**（作者在其 §4 已注明语料有差异，但标题仍易误读）。
2. **`8 → +3.7%` 应降级为"~3%"**。作者三次会话为 +2.91 / +4.04 / +4.07（均值 3.67），本次 +2.80；
   四次里有一次在 3% 带内。符号一致（8 更慢）是稳的，**幅度只能报"2.8%–4.1%，约 3%"**。
   本页 §1② 已按这个措辞写；作者文档的 "+3.67%" 作为均值本身没错，但不宜当作单次可复现的精确值。
3. **`profile` 的绝对 ms 不能直接引用**：同一构建干净跑 1,465.9 ms、带 profiler 1,663.3 ms（+13%）。
   作者已把"折算 ms = 占比 × 干净基线"写进口径，复核确认这个做法必要；但作者用的基线是 1,424.8，
   本次同机构建下是 1,465.9（+2.9%），所以**作者表里"折算 ms"整体偏低约 3%**，属机器抖动，可接受。
4. **未复核项（如实标注）**：`At` 6.28 次/字符、`Has` 8.06 次/字符、`Whole` 1.40 M 次/份、
   `SourceRange` 1.81 M 个/份、各条 ns/次单价——这些需要跑 `dts-cost-probe --count` / `dts-alloc-probe --attribute` /
   `dts-micro-buffer --trials 5`（instrument 后单次 20–40 s），本次未跑，**本页按"作者读数、未复核"引用**。
   复核确认成立的是：profile 占比与排序、TS 倍数、buffer 曲线与 XML 等价、三处构建门禁。

### 4.3 合并本身

- 三次 `git merge --no-ff` 全部 **无冲突、无文件重叠**（三份 docs + 四个 bench 脚本，两两不相交）。
- 合并后 `xl_build` 871 written / 0 error、`tsc` 0 error、`xl_check` 0 error → **合并没有引入任何构建回归**。
- 三个分支都没有改业务源码，因此三条结论彼此独立，不存在"后合并的分支覆盖前一个分支读数"的问题。

---

## 5. 复现（本页全部读数）

```powershell
git clone "C:\Users\Admin\Documents\GitHub\xl-example" "C:\Users\Admin\Documents\GitHub\xl-example-set\perf-merge"
cd perf-merge; git checkout integration-buffer; git checkout -b perf/buffer-analysis
Copy-Item -Recurse "C:\Users\Admin\Documents\GitHub\xl-example\node_modules" .
# xl_build（cwd=本目录，paths ["core","typescript"]，targets ["ts"]）→ 0 error
node_modules\.bin\tsc.cmd -p tsconfig.json

# ① TS 对照（8 份 / 226 份）
node tests/bench/perf-vs-ts.mjs --repeat 5
node tests/bench/perf-vs-ts.mjs --corpus --repeat 5

# ② buffer 曲线 + XML 等价
node tests/bench/buffer-size-sweep.mjs --dts 8 --sizes 8,16,32,64,128 --repeat 5

# ③ profile（作者未入库 .cpuprofile，需自己抓）
node --cpu-prof --cpu-prof-dir=tmp/prof --cpu-prof-interval=100 tests/bench/parse-perf.mjs --dts 8 --repeat 1
node tests/bench/prof-summary.mjs tmp/prof/CPU.<...>.cpuprofile --top 20

# ④ 干净基线
node tests/bench/parse-perf.mjs --dts 8 --repeat 3
```

- `tmp/` 与 `build/` 都在 `.gitignore` 里：**`.cpuprofile` 本就不会入库**，复核必须自己抓一次。
- PowerShell 5.1 的 `>` 会写 UTF-16LE，落盘请用 `| Out-File -Encoding utf8`。
