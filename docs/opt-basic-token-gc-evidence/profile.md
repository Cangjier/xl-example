# T1 当前 build 的 basic-token / GC 画像

- 对象：`C:\Users\Admin\Documents\GitHub\xl-example`，HEAD `9e13943d`（run-batching 已落地）的**已编译产物 `build/`**（`xl_build` 生成的 `build/ts/...`）。
- 机器 / 运行时：Windows 10.0.19044 x64，Node **v24.21.0**，未绑核、单进程、默认 GC（`--max-semi-space-size` 未设置，实测 new_space 上限 128 MB）。测量窗口 2026-10-23 17:41–18:05 (+08:00)。
- 约束遵守：只读 `build/`、源码与 `node_modules/typescript/lib` 语料；只写 `tmp/team/profiler/`；未改 tracked 文件、未做 git 写操作、未 npm install。
- 本报告只给**当前状态的客观画像**，不做优化原型。

---

## ① 一页结论

### 1) basic token 层的占比（CPU profile self time，窗口 32，8 份 d.ts）

| 口径 | self 占比 | 折算 ms / 每 parse 8 份（× 684.9 ms 干净基线） |
|---|---:|---:|
| `core/basic-tokens/` 目录（窄口径） | **10.21%** | **69.9 ms** |
| 窄口径 + `templates/basic-dispatch.js` | 19.44% | 133.1 ms |
| 宽口径（+ `unit-token` / `token` / `block-token` / `shape-token` / `symbol-template`） | **42.5%** | **291 ms** |

构成（self，b32）：
- **`BasicDispatch.Transit` 9.23%**（269.1 ms profile / 折算 63.2 ms），仍是 basic-token 层最大单项，470,903 次/8 份 = **0.116 次/字符**（run-batching 前是 1,628,920 次）。
- **token 帧与分配**：`UnitToken.Process` 5.61% + `Token` ctor 5.72% + `BlockToken` ctor 4.27% + `UnitToken` ctor 3.70% = **19.3%**；三个 ctor 合计 13.69%（折算 93.8 ms）。
- **basic-tokens 目录内部**：`WrapSymbol.Transit` 2.62%、`AreaAnnotation.Process` 2.36%、`Symbol.Transit` 1.18%、`Common.*` 1.42%、**`Bracket.*` 仅 0.63%**。
- 形状层（`typescript/tokens`）29.82%，其中 `ComputePossibleShapesByIndex` 3.90% + `ComputePossibleShapes` 1.31% = 5.21%。
- 无关项：profile 里 **7.27% 是模块装载 + 读语料**（`internalModuleStat` 1.96、`wrapSafe` 1.73、`readFileUtf8` 1.20、`lstat` 0.99 …），不属于 parse，折算时要扣。

### 2) GC 的占比（两条独立口径互相印证）

| 口径 | 读数 |
|---|---|
| CPU profile `(garbage collector)` self | **7.44%**（第二次 profile 7.13%），折算 **51.0 ms** / 每 parse 8 份 |
| `PerformanceObserver('gc')` 实测暂停 | **7 次 Scavenge / 次 parse，0 次 Mark-Sweep/Compact 全停顿**；总暂停 **51.6–61.4 ms**（9 轮），中位 **53.1 ms**，占 parse 墙钟 **6.31%–9.65%，中位 8.45%** |
| 一致性 | 51.0（profile 折算）vs 53.1（观察器中位）→ 差 4%，**两条独立口径对上了** |

- 暂停形态：p50 **6.6–7.5 ms**、p90 **10.2–14.9 ms**、max 同 p90 量级（每次 parse 只有 7 次 GC，样本少）。
- 堆：warmup 后 heapUsed **82.8 MB**；每 parse 内 heap 峰值 **179.7 → 277.0 → 344.0 MB**（**逐轮 +85 MB**，老年代垃圾靠后续 major/incremental GC 兜底）；强制 gc 后存活堆 **19 MB**；3 轮内没有出现完整 Mark-Compact（第 3 轮只有 1 次 IncrementalMarking，回收了老年代）。
- **warmup 轮不计入**：首轮（进程内第一次 parse 8 份）≈ **953–1011 ms**，其间有 **21 次 Scavenge + 2 次 Mark-Compact**（new_space 从 16 MB 长到 128 MB 的过程），稳态每 parse 只有 7 次。所以「冷启动第一次 parse」的 GC 成本约为稳态的 3 倍。

### 3) 「还有多少优化空间」的一句话

basic token 层的钱**已经从「每字符一帧」搬到「分配 + 每个 run 边界的一次分派 + GC」**：`Transit` 9.23% + 三个 ctor 13.69% + GC 7.44% = **30.4%**（折算 208 ms），而 `Bracket`/`SourceRange` 一线已经冷了（0.63% / `At` 0.152 次每字符）。**还有空间，但上限远小于 run-batching 那一刀**：单一最大的可做项（dispatch 快速出口）按剩余量估 2–3%，分配/GC 一线按旧文档 O1 教训实际转化率未知，**不宜再承诺 >5%**。

---

## ② 每项命令 + 原始读数

### 2.1 干净基线（折算基数）

```powershell
node tests/bench/parse-perf.mjs --dts 8 --repeat 3 --json
```

口径：`--dts 8` = `node_modules/typescript/lib` 下最大的 8 份 d.ts（**4,056,233 B**，含 `lib.es2015.symbol.wellknown.d.ts`）；每份 1 次 warmup 后计时 3 次取中位；`totalMedianMs` = **逐文件中位之和**（脚本 line 206 明确如此），不是「一轮墙钟」。

| 文件 | bytes | run#1 中位 ms | run#2 中位 ms | run#1 samples |
|---|---:|---:|---:|---|
| lib.dom.d.ts | 2,349,483 | 370.145 | 374.837 | 451.828 / 370.145 / 336.678 |
| lib.webworker.d.ts | 787,076 | 131.151 | 134.452 | 122.385 / 131.151 / 143.058 |
| typescript.d.ts | 588,452 | 132.918 | 133.980 | 148.076 / 132.918 / 127.543 |
| lib.es5.d.ts | 218,972 | 29.283 | 30.951 | 41.265 / 29.283 / 27.594 |
| lib.es2023.array.d.ts | 40,197 | 4.142 | 3.791 | 4.332 / 3.587 / 4.142 |
| lib.es2020.bigint.d.ts | 38,258 | 6.893 | 6.436 | 6.893 / 5.436 / 11.188 |
| lib.es2015.core.d.ts | 22,824 | 2.989 | 2.759 | 2.989 / 2.968 / 3.054 |
| lib.es2015.symbol.wellknown.d.ts | 10,971 | 2.339 | 2.763 | 2.339 / 2.509 / 2.260 |
| **合计（折算基数）** | **4,056,233** | **679.86** | **689.97** | — |

- 两次会话合计差 **+1.49%**（679.86 vs 689.97）→ 本机当前 TOTAL 级噪声带约 **±1.5%**，单文件级可到 ±20%（dom 首样本 451.8 vs 336.7）。
- 与文档 §0.1 的 599 ms 不可直接比（那是 `buffer-ab` 口径、且是当时机器状态）；**本报告一律以 679.86–689.97 ms 为折算基数（取均值 684.9 ms）**。

### 2.2 CPU profile（窗口 32 = 当前 build）

```powershell
node --cpu-prof --cpu-prof-dir=tmp/team/profiler/prof --cpu-prof-interval=100 tmp/prof-run.mjs build 2
node tests/bench/prof-summary.mjs tmp/team/profiler/prof/CPU.<...>.cpuprofile --top 40 --json
node tmp/team/profiler/prof-aggregate.mjs  tmp/team/profiler/prof/CPU.<...>.cpuprofile > prof-agg.json
node tmp/team/profiler/prof-files.mjs      tmp/team/profiler/prof/CPU.<...>.cpuprofile 30 > files32.txt
```

`prof-run.mjs` = 1 轮 warmup + 2 轮计时（共 3 趟 × 8 份，语料同 2.1，4,056,233 B）。

- **samples 3296，total 2915.9 ms，有效采样间隔 885 µs**（请求 100 µs；Windows 上仍是 ~1 ms，与旧文档一致）。
- profile 总时长 / 3 趟 = **972 ms/趟**；同一命令不带 profiler 跑两次墙钟 **2.608 s / 2.751 s**（含 node 启动 ~60 ms、读语料 ~10 ms）→ profiler 开销约 **+6% ~ +12%**，与旧文档 +13% 同量级。**ms 一律用「百分比 × 干净基线」折算**。

**bucket（prof-summary 口径）**：

| bucket | self % | ms |
|---|---:|---:|
| core/syntax | 40.96 | 1194.2 |
| typescript/tokens | 29.82 | 869.5 |
| core/basic-tokens | **10.21** | 297.7 |
| (garbage collector) | **7.44** | 217.0 |
| pseudo/native | 4.34 | 126.5 |
| node-internals | 4.10 | 119.5 |
| typescript/run | 2.11 | 61.5 |
| (program) | 0.62 | 18.1 |
| bench-harness | 0.32 | 9.5 |
| (idle) | 0.09 | 2.5 |

- **loader 估算 7.27%**（`internalModuleStat` 1.96 + `wrapSafe` 1.73 + `readFileUtf8` 1.20 + `lstat` 0.99 + 其它 node 内置），不属于 parse。
- 扣掉 loader 后的 parse 分母 2704 ms → **GC 8.03%、basic-tokens 11.01%、core/syntax（含 basic-tokens）55.18%、typescript/tokens 32.16%、三个 ctor 14.76%**。

**top 30 self（折叠 ms = pct × 684.9）**：

| # | 函数 | 位置 | self % | 折算 ms |
|---:|---|---|---:|---:|
| 1 | `Transit` | templates/basic-dispatch.js:21 | **9.23** | **63.2** |
| 2 | `Process` | syntax/unit-token.js:34 | **5.61** | 38.4 |
| 3 | `Token` (ctor) | syntax/token.js:10 | 4.60 | 31.5 |
| 4 | `BlockToken` (ctor) | syntax/block-token.js:13 | 4.27 | 29.2 |
| 5 | `ComputePossibleShapesByIndex` | syntax/catalog-guide.js:25 | 3.90 | 26.7 |
| 6 | `UnitToken` (ctor) | syntax/unit-token.js:28 | 3.42 | 23.4 |
| 7 | `Transit` | basic-tokens/wrap-symbol.js:23 | **2.62** | 17.9 |
| 8 | `Process` | basic-tokens/area-annotation.js:21 | **2.36** | 16.2 |
| 9 | `internalModuleStat` | (native) | 1.96 | 13.4（loader） |
| 10 | `wrapSafe` | node:internal/modules/cjs/loader | 1.73 | 11.8（loader） |
| 11 | `ParseTypeMember` | tokens/types/type-builder.js:824 | 1.55 | 10.6 |
| 12 | `ParsePrimaryType` | tokens/types/type-builder.js:499 | 1.46 | 10.0 |
| 13 | `BuildMember` | tokens/declarations/module-block-shape.js:55 | 1.44 | 9.9 |
| 14 | `Scan` | tokens/types/property-signature-possible-shape.js:475 | 1.32 | 9.0 |
| 15 | `ComputePossibleShapes` | syntax/catalog-guide.js:22 | 1.31 | 9.0 |
| 16 | `readFileUtf8` | (native) | 1.20 | 8.2（loader） |
| 17 | `Transit` | basic-tokens/symbol.js:65 | **1.18** | 8.1 |
| 18 | `DecodeIdentifierEscapes` | tokens/names/identifier-shape.js:26 | 1.18 | 8.1 |
| 19 | `Token` (ctor #2) | syntax/token.js:21 | 1.12 | 7.7 |
| 20 | `ProcessLineStartOffsets` | typescript/run/text-document.js:18 | 1.12 | 7.7 |
| 21 | `lstat` | (native) | 0.99 | 6.8（loader） |
| 22 | `ClassifyHead` | tokens/types/property-signature-possible-shape.js:170 | 0.94 | 6.4 |
| 23 | `Reset` | syntax/catalog-guide.js:70 | 0.90 | 6.2 |
| 24 | `AppendAndSignOut` | syntax/block-token.js:19 | 0.89 | 6.1 |
| 25 | `Analyze` | tokens/types/property-signature-possible-shape.js:354 | 0.85 | 5.8 |
| 26 | `Load` | tokens/types/type-builder.js:107 | 0.84 | 5.8 |
| 27 | `BuildByIndex` | tokens/types/property-signature-possible-shape.js:549 | 0.75 | 5.1 |
| 28 | `BuildByIndex` | tokens/types/method-signature-possible-shape.js:34 | 0.69 | 4.7 |
| 29 | `SpanNode` | tokens/types/type-builder.js:251 | 0.69 | 4.7 |
| 30 | `ParseTypeReference` | tokens/types/type-builder.js:1628 | 0.62 | 4.2 |

补充（top40 内、题目点名或与「分配/字符串」有关）：`ShapeToken` ctor 0.58%、`HasBetween` 0.57%、`TryToClose` 0.57%、`CanStartNumber` 0.55%、`IsText` 0.52%、`IsSymbol` 0.52%、`Process`(syntax-context) 0.51%、`ParseName` 0.50%。

**点名函数清单（整份 profile 按名聚合，非仅 top40）**：

| 项 | self %（b32） |
|---|---:|
| `BasicDispatch.Transit` | **9.23** |
| 全部 basic-tokens 的 `Transit`（wrap-symbol+symbol+…） | 4.31 |
| `WrapSymbol.Transit` | 2.62 |
| `Symbol.Transit` | 1.18 |
| `AreaAnnotation.Process` | 2.36 |
| `AreaAnnotation.*`（文件合计，含 `Process`） | 2.55 |
| `Common.*`（文件合计） | 1.42 |
| `Bracket.*`（文件合计，`ExitOrPre`+`Add`+`Process`） | **0.63** |
| `UnitToken.Process` | 5.61 |
| `UnitToken.*`（文件合计） | 9.32 |
| `Token` ctor（token.js 两处） | 5.72 |
| `BlockToken` ctor | 4.27 |
| `UnitToken` ctor | 3.70 |
| 三个 ctor 合计 | **13.69** |
| `ComputePossibleShapes*` | 5.21 |
| `AppendAndSignOut` | 0.89 |

**按文件聚合（top 12，b32）**：`type-builder.js` 10.66%、`unit-token.js` 9.32%、`basic-dispatch.js` 9.23%、`token.js` 7.13%、`catalog-guide.js` 6.41%、`block-token.js` 5.76%、`property-signature-possible-shape.js` 5.18%、`(native)` 4.34%、`wrap-symbol.js` 2.72%、`area-annotation.js` 2.55%、`node:.../cjs/loader` 2.30%、`symbol.js` 2.20%。

**profile 第二次（同命令、同构建，用于噪声带）**：samples 3386、total 2965.2 ms、GC **7.13%**、core/syntax 40.44%、typescript/tokens 29.79%、basic-tokens **11.58%**；top：`Transit` 9.80、`Process`(unit-token) 5.57、`BlockToken` ctor 4.30、`Token` ctor 3.48、`ComputePossibleShapesByIndex` 3.44、`UnitToken` ctor 3.31、`Process`(area) 3.29、`Transit`(wrap) 2.15。
→ **两次 profile 的偏差：GC ±0.31pp、basic-tokens ±1.37pp、dispatch ±0.57pp、area-annotation ±0.93pp**。单条 <1pp 的差异不可信。

### 2.3 GC 账本

脚本：`tmp/team/profiler/gc-observe.mjs`（本次新写，约 200 行，只读 build/ 与语料）

```powershell
node --expose-gc tmp/team/profiler/gc-observe.mjs build 8 3
#        buildDir ↑        ↑8 份  ↑3 个计时轮（warmup 1 轮固定、不计入账本）
```

做法：`perf_hooks.PerformanceObserver` 监听 `'gc'`（entry 的 `startTime`/`duration` 是 perf 时间轴 ms）；每轮用 `performance.now()` 记 `[t0,t1)`，GC 事件按 `startTime` 归轮；等 `setImmediate`+30 ms 冲干净批量回调再统计。`kind`：1=Scavenge、2=MarkSweepCompact、4=IncrementalMarking、8=ProcessWeakCallbacks；暂停只算 1+2。堆：`v8.getHeapStatistics()`/`getHeapSpaceStatistics()` 在 warmup 前、每轮首尾、强制 `global.gc()`×2 后各采一次；强制 gc 在全部计时轮之后执行，不影响计时。

**三次独立运行、共 9 个计时轮（每轮 = 一次 parse 8 份）**：

| 运行 | 轮 | 墙钟 ms | GC 次数 | minor | major | 总暂停 ms | 占墙钟 | p50 ms | p90 ms |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| #1 | 1 | 652.91 | 7 | 7 | 0 | 59.06 | 9.05% | 6.67 | 12.38 |
| #1 | 2 | 632.85 | 7 | 7 | 0 | 51.55 | 8.15% | 6.25 | 10.21 |
| #1 | 3 | 612.11 | 7 | 6 | 0（+1 次 IncrementalMarking） | 38.62 | 6.31% | 6.76 | 7.73 |
| #2 | 1 | 690.74 | 7 | 7 | 0 | 61.42 | 8.89% | 6.65 | 13.88 |
| #2 | 2 | 611.50 | 7 | 7 | 0 | 53.13 | 8.69% | 6.65 | 10.36 |
| #2 | 3 | 623.58 | 7 | 6 | 0（+1 次 IncrementalMarking） | 39.20 | 6.29% | 6.69 | 8.19 |
| #3 | 1 | 716.22 | 7 | 7 | 0 | 60.55 | 8.45% | 7.50 | 13.69 |
| #3 | 2 | 633.45 | 7 | 7 | 0 | 61.12 | 9.65% | 7.94 | 14.86 |
| #3 | 3 | 597.79 | 7 | 6 | 0（+1 次 IncrementalMarking） | 37.89 | 6.34% | 6.32 | 7.38 |

- **GC 次数：每 parse 恒定 7 次**（9/9 轮），全部是 Scavenge；**0 次 Mark-Sweep/Mark-Compact 全停顿**（第 3 轮出现的 1 次 IncrementalMarking 是并发标记，暂停≈0）。
- **总暂停中位 53.13 ms**，9 轮范围 **37.89–61.42 ms**；**占墙钟中位 8.45%**，范围 6.29%–9.65%。
- 轮次内规律：第 1 轮最贵（8.45–9.65%），第 3 轮最便宜（6.29–6.34%）——墙钟在缩短而暂停也在降，**不是同一个稳态**；引用时报「中位 53 ms / 8.4%，首轮偏重」。
- warmup（不计入）：墙钟 **1011 / 958 / 953 ms**。

**堆（`--expose-gc`）**：

（下表为 gc-2 / gc-3 两次三次轮运行的读数；两次几乎一致，取 gc-2）

| 时点 | heapUsed | heapTotal | new_space(used/size) | old_space(used) | rss |
|---|---:|---:|---|---:|---:|
| warmup 前 | 16.9 MB | 33.9 MB | 0.4 / 16 MB | 7.0 MB | 61 MB |
| warmup 后（第 1 轮前） | 82.8 MB | 207.4 MB | 23.7 / 128 MB | 45.8 MB | 273 MB |
| 3 轮后、强制 gc 前 | 86.5 MB | 216.8 MB | 40.2 / 128 MB | 32.5 MB | 479 MB |
| 强制 gc ×2 后（**存活堆**） | **19.0 MB** | 151.4 MB | 0 / 128 MB | 7.8 MB | 473 MB |

- 每 parse 内 heapUsed 峰值（每解完一份采一次的最大值）：**179.7 → 277.0 → 344.0 MB**，即 **~+85 MB/轮**；而每轮末 heapUsed 是 165.9 → 257.0 → 86.2 MB（第 3 轮的 IncrementalMarking 回收了老年代）。**存活堆始终 19 MB**。
- 机制：new_space 上限 128 MB 时每 parse 只有 7 次 Scavenge，但单次 6.6–7.9 ms（比小 semi-space 时贵），总账 53 ms。**如果只看 Scavenge 次数会误判 GC 很便宜**。
- 注意：本基准每轮把 shape 树丢弃；老年代 +85 MB/轮的垃圾只靠后续 major GC 回收。**长驻进程里会看到周期性 Mark-Compact**，本次 3 轮里没有 → 「每 parse 0 次 major」只在短时基准成立。

**`--trace-gc` 交叉验证（同进程同窗口对照，`tmp/team/profiler/diag.out`）**：

```powershell
node --expose-gc --trace-gc tmp/team/profiler/gc-observe.mjs build 8 1 > diag.out 2>&1
node tmp/team/profiler/diag.mjs diag.out
```

```json
{ "traceTotal": 32,
  "window": { "t0": 1294.66, "t1": 1953.28 },
  "beforeWindow": { "count": 23, "kinds": { "Scavenge": 21, "Mark-Compact": 2 } },
  "inWindow":     { "count": 7,  "kinds": { "Scavenge": 7 } },
  "afterWindow":  { "count": 2,  "kinds": { "Mark-Compact": 2 } } }
```

结论：在计时窗口内 trace-gc 数到 **7 次 Scavenge、0 次 Mark-Compact**，与观察器**逐条一致**；窗口前的 21 次 Scavenge + 2 次 Mark-Compact 全是「进程启动 + warmup」（semi-space 从 16 MB 长到 128 MB 的过程）；窗口后的 2 次 Mark-Compact 是我们自己调用的 `global.gc()`。另跑的 `node --trace-gc tmp/prof-run.mjs build 1`（warmup+1 趟）总计 28 Scavenge + 2 Mark-Compact，与 21+7 / 2+0 完全对得上。
> 口径坑（已踩过、写下来）：`--trace-gc` 输出到 **stdout**，与 JSON 混流时 trace 行会把 `{` 拼到上一行末尾；对照要用「文件名/`stdout` 分流 + 时间窗过滤」，不能只按行首过滤。

### 2.4 调用 / 对象量（b32，8 份 = 4,067,441 字符）

```powershell
node tmp/count-classes.mjs build 8      # → count-classes.txt
node tmp/count-reads.mjs build 8        # → count-reads.txt
node tests/bench/dts-alloc-probe.mjs --files 8 --json   # → alloc-probe.json
```

> 语料注意：这三个脚本按「size 降序取 8」，与 `parse-perf --dts 8`/`prof-run` 的 8 份差一份（含 `lib.es2020.intl.d.ts` 22,399 B、不含 `lib.es2015.symbol.wellknown.d.ts` 10,971 B），**4,067,441 字符 vs 4,056,233 B，差 0.28%**；每字符比率因此有 ~0.3% 的系统差，量级不受影响。

**调用计数（`count-classes` / `count-reads`，每 parse 一次 8 份）**：

| 调用 | 次数 | 每字符 |
|---|---:|---:|
| `SourceRange.ValueAt` | 914,682 | 0.225 |
| `SourceRange.Has` | 626,875 | 0.154 |
| `SourceRange.At` | 616,755 | 0.152 |
| `BasicDispatch.Transit` | **470,903** | **0.116** |
| `Bracket.ExitOrPre` | 431,793 | 0.106 |
| `Add:Bracket` / `Process:Bracket` | 347,764 / 185,263 | 0.085 / 0.046 |
| `AppendAndSignOut:WrapSymbol` | 159,336 | 0.039 |
| `AppendAndSignOut:Common` | 149,986 | 0.037 |
| `SignIn:WrapSymbol` | 141,987 | 0.035 |
| `SignIn:Common` | 119,124 | 0.029 |
| `AppendAndSignOut:Symbol` | 113,441 | 0.028 |
| `AppendAndSignOut` 合计（三类） | 422,763 | 0.104 |
| `AreaAnnotation.Default` | **0**（已被 `Process` 批处理取代） | 0 |
| `String.Default` | 29,526 | 0.007 |
| `LineAnnotation.Default` | 1,413 | 0.0003 |
| `BasicDispatch.Transit`（对照：文档 §4 的 E1 版） | （1,628,920） | （0.400） |

**分配计数（`dts-alloc-probe`，8 份合计）**：

| 计数 | 次数 | 每字符 |
|---|---:|---:|
| `newSourceRange`（全部 `new SourceRange`） | **777,197** | **0.191** |
| ├ `srNullDocument`（Token 字段初始化，每 token 一次） | 622,905 | 0.153 |
| ├ `srWindowShaped`（宽 ≤ BufferSize，窗口形态 + 少量同宽区间） | 154,284 | 0.038 |
| └ `srWide` | 0 | 0 |
| `SourceRange.Whole` | **465,489** | 0.114 |
| `SourceRange.Of` | **0** | 0 |
| `SourceRange.FromRanges` | 0 | 0 |
| `Document.GetValue` | 1,533,283 | 0.377 |
| `documents` | 8 | — |
| 窗口数（`ceil(chars/32)` 合计） | 127,108 | — |

- 每窗口 `newSourceRange` 5.55–8.36 个（`sourceRangePerWindow`），窗口形态只占全部 SourceRange 的 **~20%**；**80% 是 `srNullDocument`（每个 token 一个空区间字段）**，即分配压力主要来自 token 数而不是窗口数。
- 与旧 `perf-summary` 的「`Whole` 1.40 M 次/份 lib.dom」相比，当前 lib.dom 的 `Whole` 已是 **257,520 次**（0.110/字符）——跨文档比要注意那是合并前分支的读数。

---

## ③ 窗口 128 之后的画像（Lead 追加项）

对象：仓库根目录的 `build-b128`（= `build` 副本，只把 `SyntaxContext` 默认窗口 32→128），语料同 2.2（4,056,233 B）。

```powershell
node --cpu-prof --cpu-prof-dir=tmp/team/profiler/prof128 --cpu-prof-interval=100 tmp/prof-run.mjs build-b128 2
node tests/bench/prof-summary.mjs tmp/team/profiler/prof128/CPU.<...>.cpuprofile --top 40 --json
node tmp/team/profiler/prof-aggregate.mjs tmp/team/profiler/prof128/CPU.<...>.cpuprofile > prof128-agg.json
node tmp/team/profiler/prof-files.mjs     tmp/team/profiler/prof128/CPU.<...>.cpuprofile 30 > files128.txt
node --expose-gc tmp/team/profiler/gc-observe.mjs build-b128 8 3 > gc-b128.json
```

> `prof-summary.mjs` 的目录分桶把路径硬编码成 `/build/ts/...`，对 `build-b128` 会全部落进 `other`（本次 b128 的 bucket 显示 `other=81.83%`）——**b128 的目录占比必须用我另写的 `prof-aggregate.mjs`（按 `includes("core/syntax/")` 等匹配）**。`prof-summary` 的 GC%/函数行不受影响。

**并排对比（self %；b32 为两次 profile 范围，b128 为单次）**：

| 项 | b32 | b128 | Δ |
|---|---:|---:|---:|
| profile 总时长（3 趟） | 2915.9 ms | **2688.6 ms** | **−7.8%** |
| `(garbage collector)` | 7.44%（7.13–7.44） | **7.73%** | +0.3~+0.6pp |
| **core/basic-tokens 目录** | 10.21%（10.21–11.58） | **8.90%** | **−1.3~−2.7pp** |
| core/syntax（不含 basic-tokens） | 40.96%（40.44–40.96） | 39.40% | −1.0~−1.6pp |
| typescript/tokens | 29.82%（29.79–29.82） | 31.52% | +1.7pp |
| `BasicDispatch.Transit` | 9.23%（9.23–9.80） | **8.48%** | −0.75~−1.3pp |
| `AreaAnnotation.Process` | 2.36%（2.36–3.29） | **0.98%** | **−1.4~−2.3pp（≈ −60%）** |
| `WrapSymbol.Transit` | 2.62%（2.15–2.62） | 2.83% | +0.2~+0.7pp |
| `Symbol.Transit` | 1.18% | 1.38% | +0.2pp |
| `Common.*` | 1.42%（0.99–1.42） | 0.99% | −0.4pp |
| `Bracket.*` | 0.63% | 0.87% | +0.24pp |
| `UnitToken.Process` | 5.61% | 4.96% | −0.65pp |
| `Token` ctor | 5.72%（3.48–5.72） | 4.38% | −1.3pp |
| `BlockToken` ctor | 4.27%（4.27–4.30） | 5.48% | +1.2pp |
| `UnitToken` ctor | 3.70%（3.31–3.70） | 4.07% | +0.4pp |
| **三个 ctor 合计** | **13.69%** | **13.93%** | ≈不变 |
| `ComputePossibleShapes*` | 5.21% | 5.54% | +0.3pp |
| **basic-token 宽口径合计** | **42.5%** | **39.5%** | **−3.0pp** |

**GC 账本（b128，3 个计时轮）**：墙钟 642.5 / 597.6 / 580.2 ms，GC **6 / 7 / 6 次**（全 Scavenge），总暂停 **46.05 / 65.26 / 40.49 ms**，占墙钟 **7.17% / 10.92% / 6.98%**（中位 7.17%）；p50 7.31/8.47/8.79 ms；heap 峰值 174.5 → 271.1 → 327.6 MB，存活堆 19 MB。**每 parse GC 次数 6–7 次、暂停占比 ~7–11%，与 b32 同量级（b32 中位 8.45%）**。

**折算 ms（b128 的干净基线没另跑，用 Lead 的 buffer-ab +8.71% 折算 ≈ 625 ms；标注为估算）**：

| 项 | b32 折算 ms | b128 折算 ms（估） | Δ |
|---|---:|---:|---:|
| `AreaAnnotation.Process` | 16.2 | 6.1 | −62% |
| `BasicDispatch.Transit` | 63.2 | 53.0 | −16% |
| core/basic-tokens 目录 | 69.9 | 55.6 | −20% |
| 三个 ctor | 93.8 | 87.1 | −7% |
| GC | 51.0 | 48.3 | −5% |
| basic-token 宽口径 | 291 | 247 | −15% |
| **profile 总量/3 趟** | 972 ms | **896 ms** | −7.8% |

**本节一句话结论**：**窗口 32→128 的收益主要落在「每窗口的驱动/切片开销」上**（`AreaAnnotation.Process` −60%、basic-tokens 目录 −20%、dispatch −16%），**basic-token 的帧与分配几乎不动**（三个 ctor 合计 13.69%→13.93%，占比不变），**GC 占比不变（7.4%→7.7%，暂停中位 53→46 ms 与墙钟同比例降）**。所以窗口 128 之后 basic-token 层仍占宽口径 **~39.5%**（折算 ~247 ms / 8 份），GC 仍 ~7–8%；**basic-token / GC 都还有量，但都不是「加大窗口」能继续吃掉的**。

---

## ④ 口径与噪声（引用前必读）

1. **折算规则**：profile 的绝对 ms 不可当基线（本次 profiler 开销 +6%~+12%，实测同命令不带 profiler 墙钟 2.608/2.751 s vs profile 总 2.9159 s）。**折算 ms = profile self% × 干净基线**，本报告用 684.9 ms（= 两次 `parse-perf --dts 8 --repeat 3` 的 679.86 / 689.97 均值）。
2. **基线噪声**：两次会话合计 +1.49%；单文件 ±15–20%。`parse-perf` 的 `totalMedianMs` 是「逐文件中位之和」，不是一轮墙钟；`gc-observe` 量到的「一轮 8 份」墙钟是 597–716 ms（中位 ~623 ms），两者口径不同，不能互减。
3. **profile 噪声**：同一构建两次 profile，GC ±0.31pp、basic-tokens ±1.37pp、`AreaAnnotation.Process` ±0.93pp。**<1pp 的单条差异不可信**（Windows 有效采样间隔 885 µs）。
4. **profile 的 passes**：`prof-run.mjs` 固定 1 轮 warmup + N 轮计时；本次 3 趟（含 warmup）合计 2915.9 ms，别把它当「1 次 parse」。百分比本身与 pass 数无关，但绝对 ms 与 warmup 混在一起。
5. **GC 账本**：每轮 7 次 GC，`p50/p90` 只基于 7 个样本，**分布量化的置信度低**；可靠的数字是「每 parse 7 次、总暂停 38–61 ms、占比 6.3%–9.7%」。
6. **GC 非稳态**：首轮（warmup）有 21 Scavenge + 2 Mark-Compact（semi-space 16→128 MB），是稳态的 3 倍；每轮老年代 +85 MB。**「每 parse 0 次 major GC」只在 ≤3 轮的短基准成立**。
7. **语料差 0.28%**：`parse-perf`/`prof-run` 的 8 份（4,056,233 B）与 `count-*`/`dts-alloc-probe`/`gc-observe` 的 8 份（4,067,441 字符）差一份小文件（`lib.es2020.intl.d.ts` 22,399 B ↔ `lib.es2015.symbol.wellknown.d.ts` 10,971 B）。每字符比率因此有 ~0.3% 系统差。
8. **b128 的 bucket 需用 `prof-aggregate.mjs`**：`prof-summary.mjs` 的路径匹配写死 `/build/ts/`，对 `build-b128` 失效（本次显示 `other=81.83%`）。
9. **b128 折算基线是估算**（625 ms = 679.86/1.0871，来自 Lead 的 buffer-ab +8.71%）；我没有单独跑 b128 的 parse-perf。
10. **未复核项**：`gc-observe` 只在 b32 下做过与 `--trace-gc` 的同窗口逐条对照，b128 只做了观察器统计（未做 trace 对照）；`count-*`/`dts-alloc-probe` 的计数是插桩计数（确定性，不随时间漂移），未做第二次独立运行。

---

## ⑤ 哪些数字足以支撑 / 否定「还有优化空间」

**足以支撑「还有空间」**：
- `BasicDispatch.Transit` 仍 **9.23% / 63 ms**、**470,903 次**（0.116/字符，约 134 ns/次折算）。run-batching 把次数砍了 71%，但每个 run 边界仍要完整走 ①–⑦；这是**唯一一个「结构性、单点、有明确改法」的剩余项**（文档 §8 第 1 条），按剩余份额估 2–3%。
- 三个 ctor **13.69% / 93.8 ms** + GC **7.44% / 51 ms** = **21.1% / 145 ms** 是「分配 + 回收」总账。按每字符 0.191 个 SourceRange、0.153 个 srNullDocument、0.104 次 AppendAndSignOut 计，**分配量确实还在**，但旧文档 O1 的教训（分配 −81% 没转成墙钟）说明这条线的**实际转化率不可预期**。
- `AreaAnnotation.Process` 2.36% / 16.2 ms 是纯残余窗口开销；窗口 128 直接砍掉 62% → 该项**上限只有 16 ms（2.4%）**，且加大窗口已在 b128 里验证。

**足以否定「还能靠这几条路吃大块」**：
- **`Bracket.*` 0.63% / 4.3 ms**、`SourceRange.At` 0.152 次/字符：SourceRange/括号一线**已经冷了**，「继续抠 SourceRange」的收益 <1%——这一条现在是**测量结果**，不只是旧文档的判断。
- `Common.*` 1.42%、`WrapSymbol.Transit` 2.62%（且 b128 下升到 2.83%）——批处理已到位，剩下的就是每 run 一次的分派，**没有「再删一帧」的空间**。
- GC 次数已经到 **7 次/parse**、全 Scavenge；想降 GC 只能降分配（回到 ctor 那一线），**没有「调 GC 参数」的独立收益**（未实测；机制上 semi-space 已自动长到 128 MB，再调大一般只会让单次暂停变长）。
- 形状层 `typescript/tokens` 29.8%（`ComputePossibleShapes*` 5.21%、`type-builder` 10.66%）现在是**比 basic-token 窄口径更大的板块**——如果目标真是墙钟，投资顺序应排在 basic-token 残余之前，但它**不属于本 T1 的题目**。

**一句话**：basic-token 层的「每字符一帧」问题**已经被测量确认解决**（`AreaAnnotation.Default` 0 次、`At` 0.152/字符、`Bracket` 0.63%）；剩下的 30.4%（dispatch 9.23 + ctor 13.69 + GC 7.44）里，**只有 dispatch 快速出口是低风险的结构性收益（估 2–3%）**，分配/GC 一线（21%）理论大、实测转化率不可保证。

---

## ⑥ 未完成 / 未复核

- **b128 的干净基线未独立测量**（用 Lead 的 buffer-ab +8.71% 折算 625 ms）；b128 的 `count-*`/`alloc-probe` 未跑（计数与窗口无关，判断为不需要）。
- **b128 的 GC 未做 `--trace-gc` 逐条交叉验证**（只跑了观察器）。
- **GC p50/p90 的置信度低**（每轮仅 7 个样本）；未做多轮累计（>10 轮）的分布统计。
- 未测「长驻进程 / 多轮（≥10）parse」的 major GC 行为（本次 3 轮内老年代 +255 MB 未回收，**长基线下 GC 占比会更高**，这是本报告最需要补的一项）。
- 未做任何优化原型（按任务要求）。

## ⑦ 产物与复现

```
tmp/team/profiler/
├─ REPORT.md                 ← 本文
├─ gc-observe.mjs            ← GC 账本（新写；node --expose-gc gc-observe.mjs [buildDir] [dtsCount] [passes]）
├─ prof-aggregate.mjs        ← 按函数名/文件/具名组聚合 cpuprofile（新写；解决 b128 路径分桶失效）
├─ prof-files.mjs            ← 按文件聚合 cpuprofile（新写）
├─ diag.mjs                  ← trace-gc 行 vs PerformanceObserver 窗口对照（新写）
├─ baseline-1.json / baseline-2.json
├─ prof/                     ← b32 cpuprofile + prof-summary.json + prof-agg.json + files32.txt
├─ prof2/                    ← b32 第二次 cpuprofile + prof-summary-2.json
├─ prof128/                  ← b128 cpuprofile + prof-summary.json + prof-agg.json + files128.txt
├─ gc-1.json / gc-2.json / gc-3.json / gc-b128.json
├─ trace-gc.out / diag.out / mini-*.txt / explicit-*.txt（诊断用）
├─ count-classes.txt / count-reads.txt / alloc-probe.json
└─ prof128-run.txt / prof2-run.txt
```

全部命令见 §2.1–§2.4、§3；本次所有读数均来自 `build/`（b32）与 `build-b128/`（Lead 提供的副本），未修改任何 tracked 文件。
