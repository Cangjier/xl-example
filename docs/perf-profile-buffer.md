# buffer 驱动之后的剩余阻塞点（profile + 计数 + 单次成本）

> 交付分支 `integration-buffer`（tip `f5a525c3`），本文件只做测量与排序，**不改业务源码**。
> 所有数字都在下面「环境与命令」一节给出的命令下可复现；仓库里新增的只有
> `tests/bench/dts-alloc-probe.mjs`、`tests/bench/dts-micro-buffer.mjs` 与本文。

## 0. 结论摘要

总耗时 1424.8 ms（8 份 .d.ts，repeat=3 中位，warmup=1）。**67.5% 的 self 时间在 `core/syntax` + `core/basic-tokens` 两个目录里**，
而其中 43.8 个百分点集中在两件事上：**逐字符的 basic `Transit` 分派**（10 个 `static Transit` 合计 22.26%）
与**驱动循环 `UnitToken.Process`**（19.48%）。`typescript/tokens`（形状构建侧）只占 19.6%。

| # | 阻塞点 | self% | 折算 ms / 8 份 | 预估可省 | 置信度 |
|---|--------|------:|---------------:|---------:|--------|
| 1 | **basic `Transit` 逐字符分派**（10 个 `static Transit`，3.17 次/字符） | **22.26%** | 317 | 80–125 ms（5.6–8.8%） | 高（测得）／中（可达性） |
| 2 | **驱动层每字符帧 `UnitToken.Process`**（循环 + 挂载/重放判定） | **19.48%** | 277 | 55–83 ms（3.9–5.8%） | 中 |
| 3 | **`SourceRange.At` 读字符被重复 6.28 次/字符** | 内含于 1、2 | 156–242 | 60–100 ms（4.2–7.0%） | 中高 |
| 4 | **分配与 GC**（`SourceRange.Whole` 1.40 M 次/份 lib.dom，其中 80.4% 来自一处） | GC 4.14% | 59 + ~40 | 30–50 ms（2.1–3.5%） | **高**（机械、低风险） |
| 5 | **成员边界扫描** `FindMemberBoundary` → `HasBetween`（每相邻 token 对一次整文档区间） | 2.75% | 39 + ~30（分配） | 25–40 ms（1.8–2.8%） | 高（机制）／中（收益） |
| 6 | **shape / token 构建**（`Token`+`BlockToken`+`UnitToken` 构造） | 7.36% | 105 | 25–40 ms（1.8–2.8%） | 中 |
| 7 | **候选判定** `ComputePossibleShapesByIndex` + `PossibleShapeCache.GetState` | 2.63% | 47 | 10–15 ms（0.7–1.1%） | 高（便宜）／低（收益） |

一句话：**瓶颈已经从「形状缓存/候选链」搬到了「每字符的驱动与分派」**。改造前的画像是 `UnitToken.Process` 20% self 一家独大；
现在它仍然是 19.48%，但它身边多了 22.26% 的 `Transit` 分派——两者合起来 41.7%，而 `typescript/tokens` 只剩 19.6%。
下一步的收益主要不在「少建形状」，而在「每字符少做几次分派、少读几次字符、少分配几个区间对象」。

---

## 1. 环境与命令

```
OS          Windows 10.0.26100（win32-x64）
CPU         Intel Xeon Platinum 8378C @ 2.80 GHz × 16
Node        v24.21.0
V8          13.6.233.17-node.53
clone       C:\Users\Admin\Documents\GitHub\xl-example-set\perf-profile
tip         f5a525c3  docs: buffer 最终合并验收（含 exc-fix）+ 异常散文对齐
```

搭建（与任务书一致）：

```powershell
git clone "C:\Users\Admin\Documents\GitHub\xl-example" "C:\Users\Admin\Documents\GitHub\xl-example-set\perf-profile"
cd perf-profile; git checkout integration-buffer
Copy-Item -Recurse "C:\Users\Admin\Documents\GitHub\xl-example\node_modules" .
```

构建：`xl_build`（`paths=["core","typescript"]`, `targets=["ts"]`）→ **871 written, 0 error**（2440 条 W3102/W3103 文档告警），
随后 `node_modules\.bin\tsc.cmd -p tsconfig.json` → **exit 0**。

四条测量命令：

```powershell
# 1) 基线
node tests/bench/parse-perf.mjs --dts 8 --repeat 3

# 2) CPU profile（8 份）+ 汇总 + lib.dom 单独一次
node --cpu-prof --cpu-prof-dir=tmp/prof --cpu-prof-interval=100 tests/bench/parse-perf.mjs --dts 8 --repeat 1
node tests/bench/prof-summary.mjs tmp/prof/CPU.*.cpuprofile --top 20
node --cpu-prof --cpu-prof-dir=tmp/prof-dom --cpu-prof-interval=100 tests/bench/dts-profile.mjs --file node_modules/typescript/lib/lib.dom.d.ts --repeat 3 --warmup 1
node tests/bench/prof-summary.mjs tmp/prof-dom/CPU.*.cpuprofile --top 25

# 3) 每字符计数 / 分配归因
node tests/bench/dts-cost-probe.mjs --count --files 1
node tests/bench/dts-alloc-probe.mjs --files 1 --attribute

# 4) 单次成本
node tests/bench/dts-micro-buffer.mjs --trials 5
```

### 1.1 两条会影响结论读法的环境事实

**(a) Windows 上 `--cpu-prof-interval=100` 实际只有 ≈1 ms 采样间隔。**
任务书要求 `--cpu-prof-interval=100`（100 µs）。实测请求值与**有效值**对不上，用一份固定工作量的小脚本量了四档：

| 请求间隔 | samples | 有效间隔 |
|---------:|--------:|---------:|
| 50 µs | 1579 | **969.7 µs** |
| 100 µs | 1618 | **946.3 µs** |
| 500 µs | 1455 | 1051.9 µs |
| 1000 µs | 929 | 1651.6 µs |

V8 的采样线程在 Windows 上被计时器分辨率压到 ≈1 ms，**100 µs 拿不到 10 倍分辨率**。所以 profile 的样本数只能到
「≈1 样本/毫秒」：8 份那次 4236 个样本、lib.dom 那次 4163 个，单条 0.7% 以下的差异不可信，但排序（>1%）是稳的。
下面两张 profile 表（8 份 / lib.dom 单份）互相印证了同一个排序，可以当作交叉验证。

**(b) 计数脚本打印的 ms 不能用。** `dts-cost-probe --count` 与 `dts-alloc-probe` 都会给每个被观察的方法多套一层调用，
实测把 lib.dom 从 805 ms 抬到 1709 ms / 1218 ms。这两个脚本只产出**计数**，耗时一律以 `parse-perf` 为准。

---

## 2. 基线

`node tests/bench/parse-perf.mjs --dts 8 --repeat 3`（warmup=1，取 3 次中位）：

| 文件 | bytes | stmts | median ms | samples |
|------|------:|------:|----------:|---------|
| lib.dom.d.ts | 2349483 | 2805 | **804.6** | 922.9 / 804.6 / 795.8 |
| lib.webworker.d.ts | 787076 | 1149 | 288.7 | 284.9 / 305.3 / 288.7 |
| typescript.d.ts | 588452 | 2 | 319.4 | 338.7 / 319.4 / 295.5 |
| lib.es5.d.ts | 218972 | 147 | 61.7 | 64.1 / 59.6 / 61.7 |
| lib.es2023.array.d.ts | 40197 | 13 | 8.7 | 8.7 / 8.7 / 8.8 |
| lib.es2020.bigint.d.ts | 38258 | 12 | 10.3 | 10.3 / 10.7 / 10.2 |
| lib.es2015.core.d.ts | 22824 | 21 | 5.8 | 5.8 / 5.8 / 5.7 |
| lib.es2015.symbol.wellknown.d.ts | 10971 | 33 | 4.3 | 4.3 / 4.8 / 4.3 |
| **合计** | 4056233 | | **1424.8** | |

同一台机器同一份代码第一次跑出 1503.6 ms、第二次 1424.8 ms——**±5% 的机器抖动**存在，所以本文所有「折算 ms」都是
**占比 × 1424.8**（用同一份 profile 的比例乘回干净基线），不是直接读 profile 里的毫秒。

lib.dom 单份：`805 ms / 2,349,323 字符 = 342.5 ns/字符`。这是后面所有「每字符预算」的分母。

---

## 3. CPU profile

### 3.1 Top 15 self time（8 份，`--dts 8 --repeat 1`，含 warmup 共 2 遍）

`samples=4236  total=3924.6 ms  GC 4.14%  program 0.53%  idle 0.03%`

| # | self% | ms | 函数 | 位置 | 直接调用者 |
|---|------:|---:|------|------|-----------|
| 1 | **19.48** | 764.4 | `Process` | `core/syntax/unit-token.js:34` | `Process` ← `Process`（递归挂载） |
| 2 | **4.62** | 181.4 | `Transit` | `core/syntax/basic-tokens/symbol.js:65` | `Process` |
| 3 | **4.39** | 172.4 | `Transit` | `core/syntax/basic-tokens/wrap-symbol.js:23` | `Process` |
| 4 | **3.71** | 145.6 | `Transit` | `core/syntax/basic-tokens/common.js:444` | `Process` |
| 5 | **3.24** | 127.3 | `Transit` | `core/syntax/basic-tokens/shebang.js:49` | `Process` |
| 6 | 2.75 | 107.9 | `FindMemberBoundary` | `typescript/tokens/types/member-boundary.js:55` | `ParseTypeBounded` ← `ParseTypeMember` |
| 7 | 2.68 | 105.1 | `Token`（构造） | `core/syntax/token.js:10` | `Token` ← `BlockToken` |
| 8 | 2.24 | 88.1 | `ComputePossibleShapesByIndex` | `core/syntax/catalog-guide.js:25` | `ComputePossibleShapes` ← `UnitToken` |
| 9 | 2.24 | 87.9 | `BlockToken`（构造） | `core/syntax/block-token.js:13` | `Symbol` ← `Transit` |
| 10 | 2.08 | 81.7 | `IsAppend` | `core/syntax/basic-tokens/common.js:18` | `Transit` |
| 11 | 1.97 | 77.3 | `Transit` | `.../string/string-guide.js:14` | `Process` |
| 12 | 1.92 | 75.5 | `UnitToken`（构造） | `core/syntax/unit-token.js:28` | `AreaAnnotation` ← `Transit` |
| 13 | 1.79 | 70.3 | `ExitOrPre` | `basic-tokens/area-annotation.js:54` | `Process` |
| 14 | 1.57 | 61.7 | `internalModuleStat` | (native) | `stat` ← cjs loader（**启动期，非解析**） |
| 15 | 1.24 | 48.8 | `wrapSafe` | `node:internal/modules/cjs/loader:1819` | cjs loader（**启动期**） |

把同名函数按「名字 + 文件 + 行」再合并一次（top 120 里能拿到的）：

| 聚合 | n | 合计 ms | 合计 % |
|------|---:|--------:|-------:|
| `Transit`（全部 10 个 basic transit） | 10 | **874.3** | **22.26** |
| `Token`（构造，含两个位置） | 2 | 125.4 | 3.20 |
| `ExitOrPre`（area-annotation + bracket） | 2 | 104.4 | 2.66 |
| `BlockToken`（构造） | 1 | 87.9 | 2.24 |
| `ComputePossibleShapesByIndex` | 1 | 88.1 | 2.24 |
| `UnitToken`（构造） | 1 | 75.5 | 1.92 |
| `AppendAndSignOut` | 1 | 48.5 | 1.24 |
| `ParseTypeMember` | 1 | 36.1 | 0.92 |
| `ComputePossibleShapes` | 1 | 20.2 | 0.51 |
| `TryToClose` | 2 | 17.2 | 0.44 |
| `GetState` | 1 | 15.3 | 0.39 |
| `Add` | 1 | 11.7 | 0.30 |
| `SignIn` / `SignOut` / `Close` | 3 | 16.8 | 0.43 |

`Transit` 一个聚合就 22.26%：**它不是某一个热点函数，而是十个小函数各 0.7–4.6% 的集合**。
这解释了为什么单看 top 15 会觉得「除了 Process 都不高」——真正的第二块成本被摊平在十个函数里。

### 3.2 目录占比（self）

| 目录 | 8 份 | lib.dom 单份 |
|------|-----:|-------------:|
| `build/ts/core/syntax` | **36.7%** (1440.2 ms) | **36.2%** (1422.2 ms) |
| `build/ts/core/basic-tokens` | **30.8%** (1207.7 ms) | **34.0%** (1336.9 ms) |
| `build/ts/typescript/tokens` | 19.6% (767.8 ms) | 18.3% (718.8 ms) |
| (garbage collector) | 4.1% (162.4 ms) | 3.2% (124.2 ms) |
| node-internals（cjs loader） | 3.6% (139.9 ms) | 3.9% (153.4 ms) |
| pseudo/native | 3.3% (127.7 ms) | 2.7% (107.0 ms) |
| `build/ts/typescript/run` | 1.2% (47.3 ms) | 1.3% (51.5 ms) |
| (program) / bench / (idle) | 0.5% / 0.3% / 0.0% | 0.4% / 0.0% / 0.0% |

`core/syntax` + `core/basic-tokens` = **67.5%**。形状构建侧（`typescript/tokens`）19.6%，已经明显不是主要成本。

**扣掉启动开销后的占比**：把 cjs loader（node-internals 139.9）+ native 里的装载部分（`internalModuleStat` 61.7 +
`readFileUtf8` 30.8）+ program 18.4 + bench 12.1 + idle 1.2 从 3924.6 ms 里去掉，剩 **3661 ms（93.3%）是解析本身**。
在这个口径下：

- `UnitToken.Process` = 764.4 / 3661 = **20.9%**
- 10 个 `Transit` = 874.3 / 3661 = **23.9%**
- 两者合计 **44.8%**

### 3.3 lib.dom 单份 profile 独立验证

`dts-profile.mjs --file lib.dom --repeat 3 --warmup 1`：`samples=4163 total=3932.4 ms GC 3.16%`。
排序与 8 份那次**同序**，只是 basic-tokens 更重（34.0% vs 30.8%）、GC 更轻（3.2% vs 4.1%，因为只解析一个文件、老年代压力小）：

```
18.72%  Process(unit-token)        4.82% Transit(symbol)      4.62% Transit(wrap-symbol)
 4.40%  Transit(common)            3.29% Transit(shebang)     2.81% BlockToken(ctor)
 2.58%  ComputePossibleShapesByIndex  2.36% ExitOrPre(area)   2.19% Token(ctor)
 2.18%  IsAppend                   1.96% Transit(string-guide) 1.61% UnitToken(ctor)
 1.59%  FindMemberBoundary         1.57% Transit(bracket)      1.30% ExitOrPre(bracket)
```

十个 `Transit` 在 lib.dom 里合计 **24.21%**（比 8 份口径还高），说明**这不是小文件拉高/拉低的假象**：
越是大文件、越是大段空白与注释，逐字符分派占比越高。

---

## 4. 每字符计数

`dts-cost-probe.mjs --count`（包装原型方法，数调用次数）。lib.dom 2,349,323 字符：

| 方法 | 次数 | /字符 | 备注 |
|------|-----:|------:|------|
| `SourceRange.Has` | 16,964,703 | **7.2211** | 读字符范围判定的第一跳 |
| `SourceRange.At` | 13,072,109 | **5.5642** | 读字符主路径 |
| `Document.GetValue` | 13,072,109 | **5.5642** | 与 `At` **完全相等** → 解析路径上每 At 恰好一次，别无他调 |
| `AreaAnnotation.Default` | 1,542,377 | 0.6565 | 琐碎字符（空白/注释）逐字符 `Tmp += At(i)` |
| `BlockToken.SignOut` | 773,754 | 0.3294 | |
| 10 个 `static *.Transit` 合计 | 7,407,524 | **3.1530** | 见下表 |
| `Bom.Transit` / `Shebang.Transit` / `AreaAnnotation.Transit` | 785,458 each | 0.3343 each | |
| `LineAnnotation.Transit` / `RegexToken.Transit` / `StringGuide.Transit` | 779,3xx each | 0.3317 each | |
| `Bracket.Transit` | 777,440 | 0.3309 | |
| `WrapSymbol.Transit` | 769,004 | 0.3273 | |
| `Symbol.Transit` | 612,405 | 0.2607 | |
| `Common.Transit` | 554,411 | 0.2360 | |
| `Common.IsAppend` | 495,316 | 0.2108 | 内部再读 2–4 次 `At` |
| `Token.SignIn` | 314,183 | 0.1337 | ≈ token 创建数 |
| `UnitToken.Process` | 313,503 | **0.1334** | 每个 Process 帧平均吃掉 7.5 个字符 |
| `Token.Add` | 313,490 | 0.1334 | |
| `Token.TryToClose` | 298,222 | 0.1269 | |
| `PossibleShapeCache.GetState` | 293,815 | 0.1251 | 键是 `this.constructor.name` |
| `Token.SignOut` | 126,073 | 0.0537 | |
| `UnitToken.ComputePossibleShapes` | 119,092 | 0.0507 | |
| `ShapeToken.TryToClose` / `ShapeToken.Close` | 109,6xx each | 0.0467 | |
| `SourceFileShape.Process` | 91,815 | 0.0391 | 每窗口一次 + 递归 |
| `SyntaxContext.DrainMessages` | 79,455 | 0.0338 | |
| `CatalogGuide.ComputePossibleShapes(ByIdx)` | 69,267 | 0.0295 | 候选判定入口（单价很高，见 §6） |
| `Token.TrySignOut` | 59,768 | 0.0254 | |
| **`SyntaxContext.ProcessRange`** | **0** | **0** | **Parse 路径上从未被调用**（驱动走 `Process`→`Root.Process`） |

8 份合计（4,067,441 字符，取「最大的 8 份」；`parse-perf --dts 8` 是「4 份必选 + 4 份最大」，语料略有差异）：

| 方法 | 8 份合计次数 | /字符 |
|------|-------------:|------:|
| `SourceRange.Has` | 32,801,743 | **8.0645** |
| `SourceRange.At` | 25,529,241 | **6.2765** |
| `AreaAnnotation.Default` | 2,395,796 | 0.5890 |
| 10 个 `Transit` 合计 | 13,718,096 | **3.3725** |
| `BlockToken.SignOut` | 1,610,268 | 0.3959 |
| `Common.IsAppend` | 1,013,726 | 0.2492 |
| `Token.SignIn` / `Token.Add` | 619,647 / 618,316 | 0.1523 / 0.1520 |
| `UnitToken.Process` | 533,951 | 0.1313 |
| `PossibleShapeCache.GetState` | 435,737 | 0.1071 |

### 4.1 两个读法上的关键点

**（i）`Process` 的 self 高，不代表它「循环得多」。** 每 7.5 个字符才进一次 `UnitToken.Process`，
所以 19.48% 的 self 平摊到字符上是 `277.5 ms / 4.07 M ≈ 68 ns/字符`，而**纯读字符的下限是 6.1 ns/字符**（§5）。
中间那 ~62 ns/字符是**每一次循环迭代都要重做的判定**：
`this.Parent !== null && this.Parent.MountedUnit !== this`、`context.Replaying`、`context.Messages.length > 0`、
`this.MountedUnit !== null`、`this.ProcessQueue !== null` 加上 `for (const item of this.ProcessQueue.Data)`。

**（ii）`At` 6.28 次/字符，但驱动循环只需要 1 次。** `At` 在 profile 里只有 0.72% self（28.2 ms），
**不是因为它便宜，而是因为它被内联进了 `Process` 与 `Transit`**——它的成本已经记在那两位身上了。
`Has` 同理（7.22 次/字符，profile 里根本进不了 top 120）。所以「At/Has 便宜」是 profile 的假象，
真实成本要靠 §5 的 ns/次乘回去。

---

## 5. 单次成本（ns/次）

`node tests/bench/dts-micro-buffer.mjs --trials 5`，文档 = 真实 `lib.dom.d.ts` 前 262,144 字符，5 轮取中位：

| 操作 | ns/次 | 扣掉 noop |
|------|------:|----------:|
| noop（循环 + 闭包调用基线） | 1.39 | — |
| `new SourceRange(doc,i,i+1)` | 18.51 | 17.12 |
| `new Token(null)` | 37.17 | 35.78 |
| `new BlockToken(null)` | 57.82 | 56.43 |
| `SourceRange.Whole(doc)` | 15.84 | 14.45 |
| `window.At(i)` 窗口内 | 9.47 | 8.08 |
| `window.Has(i)` 窗口内（真） | 6.60 | 5.21 |
| `window.Has(i)` 窗口外（假） | 5.63 | 4.24 |
| `doc.GetValue(i)` 直调 | 8.80 | 7.41 |
| `whole.At(i)` 全文档 | 8.37 | 6.98 |
| `token.SignIn(i)` | 6.24 | 4.85 |
| `token.SignOut(i)` | 7.01 | 5.62 |
| `cache.GetState(this.constructor.name)` | 33.74 | 32.35 |
| `this.constructor.name`（单取这个字符串） | 26.47 | 25.08 |
| **驱动下限** `while (i<End) { whole.At(i++) }` | **6.11 /字符** | 4.72 |
| **驱动下限** `按 32 字符窗口 while (i<buffer.End)` | **5.33 /字符** | 3.94 |

**必须注意的坑（第一版踩到了）**：`new Token(null) !== null` 这种写法里对象没人用，V8 会把整个分配消掉，
量出来 `new Token` 只有 5.25 ns、`new SourceRange` 5.72 ns——比 `new BlockToken` 的 47 ns 低一个数量级，明显不合理。
改成**把对象写进一个长期存活的环形槽**（`KEEP[i & 1023] = obj`）强迫落地后，才是上表的 37.17 / 18.51 ns。
两个数的关系也才对得上：`BlockToken` 多两层构造 + 3 个字段，比 `Token` 贵 20 ns。

### 5.1 「计数 × 单次成本 ≈ ms」

分母用 §2 的干净基线 1424.8 ms / 8 份。**注意 `At`/`Has` 与 `Process`/`Transit` 有重叠**（前者被内联进后者），
所以这两段不能相加，只能分别看。

| 项 | 计数（8 份/遍） | × 单价 | = ms | 占 1424.8 |
|----|----------------:|-------:|-----:|----------:|
| `SourceRange.At` | 25,529,241 | 6.11 ns（内联后的实测下限） | **156** | 10.9% |
| 同上，用孤立单价 9.47 ns | 25,529,241 | 9.47 ns（上界，含未内联的闭包边界） | 242 | 17.0% |
| `SourceRange.Has`（At 之外多出的） | 7,272,502 | 5.6 ns | 41 | 2.9% |
| `new SourceRange`（实测 407,865/份 lib.dom，按 8 份 ≈ 1.7 倍） | ~700,000 | 18.51 ns | 13 | 0.9% |
| `SourceRange.Whole`（1,397,874/份 lib.dom ×1.7） | ~2,380,000 | 15.84 ns | **38** | 2.6% |
| `new Token`（316,050/份 ×1.7） | ~537,000 | 37.17 ns | 20 | 1.4% |
| `new BlockToken`（其中一部分） | ~250,000 | 57.82 ns | 14 | 1.0% |
| `PossibleShapeCache.GetState` | 435,737 | 33.74 ns | 15 | 1.0% |
| 十个 `Transit`（从 profile 反推） | 13,718,096 | **23.1 ns/次** | 317 | 22.3% |

`Transit` 那一行的单价是**反推**的：profile 里 10 个 `Transit` 合计 22.26% × 1424.8 ms = 317 ms，
除以 13,718,096 次 = 23.1 ns/次。这个数很关键——**每次 basic `Transit` 只要 23 ns，但每字符要付 3.37 次**，
于是每字符固定支出 ≈78 ns（占 342.5 ns/字符的 22.7%）。

`Process` 同理：19.48% × 1424.8 = 277.5 ms，除以 533,951 次 = **520 ns/帧**；除以 4.067 M 字符 = **68 ns/字符**。

---

## 6. 分配归因

`node tests/bench/dts-alloc-probe.mjs --files 1 --attribute`（lib.dom，**一次** Parse）。

它替换的是**模块导出**而不是原型方法：`exports.SourceRange` 换成计数子类、`Whole`/`Of` 包一层、
`exports.TextDocument` 换成在 `super()` 之后包住 `this.GetValue` 的子类。
（`SourceFileRunner.Parse` 内部是 `new text_document_1.TextDocument(...)`，模块对象上的属性查找，所以替换生效；
脚本自带断言：`documents` 计数必须 >0，否则直接报错而不是安静地数出 0。）

```
窗口数 73,417（ceil(chars/32)），每窗口分配 5.555 个 SourceRange
SourceRange（经子类可见的）407,865 = 0.1736/char
   空构造（Token 字段初始化） 316,050  0.1345/char
   窗口形态 (0<宽≤32)          91,814  0.0391/char   ← 窗口 73,417 + 其它同宽区间 18,397
   宽区间 (>32)                     0  0/char        ← token 的跨度是**改字段**得来的，不重新分配
   空区间 (Start===End)             1
SourceRange.Whole()        1,397,874  0.595/char   19.04/窗口
SourceRange.Of()                   0
Document.GetValue()       13,072,109  5.5642/char
全部 SourceRange 分配 ≈ 1,805,739 = 0.769/char
```

**`SourceRange.Whole` 是最大的一股，而且 80.4% 来自同一处。** 抽样归因（每 200 次抽 1 帧，占比为估算）：

| 占比 | 次数 | 调用链 |
|-----:|-----:|--------|
| **80.4%** | 1,123,800 | `line-terminator.js:39 HasBetween` ← **`typescript/tokens/types/member-boundary.js:197 HasLineBreakBetween`** |
| 3.3% | 46,400 | `area-annotation.js:58 ExitOrPre` ← `unit-token.js:55 Process` |
| 3.0% | 42,200 | `area-annotation.js:78 Transit` ← `unit-token.js:71 Process` |
| 3.0% | 41,400 | `line-annotation.js:92 Transit` ← `Process` |
| 2.9% | 40,600 | `regex-token.js:88 Transit` ← `Process` |
| 2.4% | 34,200 | `property-signature-possible-shape.js:129 NextChar` ← `:389 Analyze` |
| 1.7% | 23,600 | `line-terminator.js:39 HasBetween` ← `HasBefore` |
| 1.2% | 16,200 | `line-terminator.js:39 HasBetween` ← `statement-scanner.js:769 NoLineBreakBetween` |

机制（`line-terminator.js:31`）：

```js
static HasBetween(left, right) {
    ...
    const whole = source_range_1.SourceRange.Whole(document);   // ← 每次都新建一个整文档区间
    let at = left.EndIndex;
    while (at < right.StartIndex) { if (IsLineTerminator(whole.At(at))) return true; at++; }
    return false;
}
```

而 `member-boundary.js:55 FindMemberBoundary(code, from)` 是

```js
for (let at = from + 1; at < code.length; at++) {
    if (!MemberBoundary.HasLineBreakBetween(code[at - 1], code[at])) continue;   // ← 每个相邻 token 对一次
    ...
}
```

也就是说：**为了在成员扫描里判断「相邻两个 token 之间有没有换行」，它对每一对相邻 token 都新建一个覆盖整个文档的
`SourceRange`，再用 `At` 逐字符找换行**。lib.dom 里 1.12 M 次/份，占全部分配的 62%（1.12 M / 1.81 M）。

窗口分配本身**很小**：73,417 个窗口、每窗口 5.555 个 SourceRange、只占全部分配的 18%。
所以「buffer 32 字符窗口」不是分配问题的大头——**大头是窗口外的兜底 `SourceRange.Whole`**。
这跟 `task` 里「窗口分配数 ≈ chars/32」的预期不同，值得写进结论。

GC self 4.14%（59 ms 折算）与「1.81 M 个短命 `SourceRange`/份」是同一件事的两面：
一个 `SourceRange` 是 `{Document, Start, End}` 三个字段，堆上约 40 B，1.81 M 个 ≈ **70 MB/份**的新生代分配
（这些对象几乎全部早死，所以不进 `used_heap_size`；`dts-profile --file lib.dom` 报的 15.2 → 161.9 MB
是**留存的 shape 树**，与这里不是同一个量）。

---

## 7. 阻塞点排序

排序依据：**折算 ms 与可省空间**，不是纯 self%。

### #1 basic `Transit` 逐字符分派 —— 22.26%（317 ms），预估可省 80–125 ms

**证据**
- 10 个 `static *.Transit` 合计 874.3 ms / 2 遍 = **22.26% self**；lib.dom 单份口径 24.21%。
- 13,718,096 次/遍（8 份，**3.37 次/字符**）；lib.dom 7,407,524 次（3.15 次/字符）。
- 反推单价 **23.1 ns/次** → 每字符固定支出 78 ns（占 342.5 ns/字的 22.7%）。
- 全部由 `UnitToken.Process` 的 `for (const item of this.ProcessQueue.Data)` 派发（调用者链 100% 是 `Process`）。

**为什么贵**：不是单个函数贵（每个 23 ns 已经很便宜），而是**每个字符都要把整条队列走一遍**直到有人返回 `Done`。
而且每个 `Transit` 的第一件事几乎都是重新 `buffer.At(index)`：
`Common.Transit` 读了 1 次，跟着调 `last.IsAppend(buffer, index)` 又在里面读了 2–4 次（`Common.IsUnicodeEscapeStart`
读 1 次、`buffer.At(index) === "{"`、`IsSymbol(buffer.At(index))`、`IsWhiteSpace(buffer.At(index))`）。
这就是 `At` 到 6.28 次/字符的直接原因。

**预估收益**：把「每字符读一次、把字符传给 transit」＋「按首字符做一次 O(1) 分派而不是顺序试」，
能砍掉 25–40% 的 transit 成本 → **80–125 ms（5.6–8.8%）**。只做「传字符」这一项风险很低。

**置信度**：测得的 22.26% 与 3.37 次/字符是硬的；能省多少取决于队列结构的改动幅度，属中等。

### #2 驱动层每字符帧 `UnitToken.Process` —— 19.48%（277 ms），预估可省 55–83 ms

**证据**
- 19.48% self（764.4 ms / 2 遍），lib.dom 单份 18.72%；`Process ← Process ← Process` 递归挂载是它的主要调用者链。
- 533,951 次/遍（0.1313/字符）→ **520 ns/帧**；平摊到字符 68 ns/字符。
- 纯读字符下限只有 6.11 ns/字符（§5），所以 **~62 ns/字符是循环里的判定开销**，不是读字符。
- 内层循环体每个字符都要重做 5 组判定：`Parent.MountedUnit !== this`、`!Replaying && Messages.length > 0`、
  `MountedUnit !== null`、`ProcessQueue !== null`（＋ `for...of` 迭代器）、`context.Index === index`。

**预估收益**：把「每个字符都查一遍 Messages/Replaying/MountedUnit」改成「进窗口时查一次、字符内只在状态可能变化的
分支后重查」，并让 `ProcessQueue` 的遍历脱离 `for...of`（`Sequence.Data` 直接按下标走），
可省 20–30% → **55–83 ms（3.9–5.8%）**。

**置信度**：中。递归挂载的语义（`MountedUnit`/`LastIndex`/`context.Index` 三者互相改写）容易在改写时破坏推进保证，
`SyntaxContext.Process` 里那句 `no progress at index` 的守卫就是给这种改动准备的。

### #3 `SourceRange.At` 读字符被重复 6.28 次/字符 —— 内含于 #1/#2，156–242 ms

**证据**
- `At` 25,529,241 次/遍 = **6.2765/字符**；`Has` 32,801,743 = 8.0645/字符（At 之外还多 1.79 次/字符）。
- `Document.GetValue` 13,072,109 次（lib.dom）= **与 `At` 完全相等** → 解析路径上 `GetValue` 只被 `At` 调用，
  一次 `At` 一次 `GetValue`，没有别的读字符路径。所以「`At` 的次数」就是「`GetValue` 的次数」。
- `At` 的实现是 `Has` + `this.Document!.GetValue(index)`，而 `GetValue` 是**构造时赋进去的闭包属性**
  （`TextDocument` 传 `(index) => content[index]`），不是原型方法——孤立量 8.80 ns，`At` 整体 9.47 ns。
- 驱动循环每字符只需要 1 次 `At`（实测 6.11 ns/字符），6.28 次里**有 5.28 次是同一个字符被反复读**。

**预估收益**：一次分派内把 `At(index)` 读出的 `char` 顺着 `Transit/ExitOrPre/IsAppend` 传下去、
`SourceRange.Has` 的 `Start >= 0` 前提在窗口生命周期内提出来，可把 6.28 降到 1.5–2 次 →
**60–100 ms（4.2–7.0%）**。

**置信度**：中高。收益计算依赖「内联后 6.11 ns/字符」这个下限；若改用孤立 9.47 ns 则上界到 242 ms，
但那个数含未内联的闭包边界，偏悲观。风险是 `GetValue` 换成原型方法会改变 `Document` 子类的约定
（`TextDocument` 现在是把 `content` 闭进构造器，改成方法就要新增字段），属于契约级改动。

### #4 分配与 GC —— GC 4.14%（59 ms）＋ ~40 ms 分配成本，预估可省 30–50 ms

**证据**
- 1,805,739 个 `SourceRange`/份 lib.dom = **0.769/字符**，其中 **1,397,874（77.4%）是 `SourceRange.Whole`**。
- `Whole` 的 **80.4% 来自 `FindMemberBoundary → HasLineBreakBetween → HasBetween` 一行**（§6）。
- `SourceRange.Whole` 单价 15.84 ns，1.40 M 次 ≈ 22 ms/份 lib.dom，8 份 ≈ 38 ms。
- GC self 4.14%（59 ms 折算）；`used_heap_size` 15.2 → 161.9 MB。
- 窗口分配只占全部分配的 18%（73,417/407,865）——**buffer 窗口不是分配主因**。

**预估收益**：`HasBetween` 里把 `SourceRange.Whole(document)` 提出来（或改成 `document.GetValue(i)` 直读，
连区间对象都不要）→ 一次消掉 1.12 M 个对象/份 = **~18 ms/份、8 份 ≈ 30 ms**，同时把 GC 压下来。
**这是全部候选里最机械、风险最低的一项**：`HasBetween` 是纯函数，`whole` 只是读字符的载体，
`At` 与 `GetValue` 在 `[0, count)` 上等价。

**置信度**：高。唯一要注意的是 `HasBetween` 在 `document === null` / `EndIndex < 0` 时提前返回，
提出 `Whole` 时不能把这个守卫一起提掉。

### #5 成员边界扫描 `FindMemberBoundary` / `HasBetween` —— 2.75%（39 ms）＋ ~30 ms 分配

**证据**
- `FindMemberBoundary` self 107.9 ms / 2 遍 = **2.75%**；调用链是
  `FindMemberBoundary ← ParseTypeBounded ← ParseTypeMember ← BuildByIndex`，即**形状构建侧**的成本，不是驱动层。
- 1.12 M 次 `HasBetween`/份 lib.dom（0.478/字符），占全部分配的 62%；按 8 份折算 ≈ 30 ms 的纯分配成本。
- 结构上是 `for (at = from+1; at < code.length; at++)` 的**逐对相邻 token 扫描**，每对都建区间 + 扫字符间隔；
  对 lib.dom 这种超大 interface，成员扫描是**近似平方**的。

**预估收益**：把「相邻 token 之间有没有换行」按 `tokenIndex` **记忆化**（一个 `Uint8Array` 或
「本行是否已确认有换行」的游标），配 #4 的 `Whole` 提升，可省 25–40 ms（1.8–2.8%）。

**置信度**：机制清楚（1.12 M 次实测 + O(n²) 形状）；收益中等，因为 `ParseTypeMember` 家族自身还有 36 ms（0.92%）。

### #6 shape / token 构建 —— 7.36%（105 ms），预估可省 25–40 ms

**证据**
- `Token` 构造 125.4 ms（3.20%）＋ `BlockToken` 87.9 ms（2.24%）＋ `UnitToken` 75.5 ms（1.92%）＝ **288.8 ms = 7.36%**。
- 316,050 个 Token 对象/份 lib.dom（由「空构造的 SourceRange」计数得出，与 `Token.SignIn` 314,183 吻合）。
- 单价：`new Token` 37.17 ns、`new BlockToken` 57.82 ns；**每个 Token 的字段初始化里都含一次 `new SourceRange()`**。
- `AppendAndSignOut` 48.5 ms（1.24%）、`Add` 11.7 ms、`SignIn`/`SignOut`/`Close` 合计 16.8 ms。

**预估收益**：`Token.SourceRange` 改成惰性（`SignIn` 时才建）或把 `Start/End/Document` 三个数摊到 Token 本体上，
可省 25–40 ms（1.8–2.8%）。

**置信度**：中。`SourceRange` 被大量代码当作**可变对象**传递（`Parent.MountedUnit.SignIn(preIndex)` 之类），
去掉它要改调用面的形状；`Token.SourceRange` 也出现在 `WhichUnitRangeContains` / `Undo` 的判定里。

### #7 候选判定 —— 2.63%（47 ms），预估可省 10–15 ms

**证据**
- `ComputePossibleShapesByIndex` 88.1 ms / 2 遍 = **2.24%**，但只被调用 69,267 次/份 lib.dom（0.0295/字符）
  → **单价 ≈ 635 ns/次**：它每次进去都要 `BuildByIndex → ParseTypeMember → FindMemberBoundary`（即 #5）。
  次数少、单价高，属于「每次判定很贵」而不是「判定很多」。
- `PossibleShapeCache.GetState` 15.3 ms（0.39%），435,737 次/遍；键是 `this.constructor.name`，
  而**单独取一次 `constructor.name` 就要 26.47 ns**（`GetState` 整体 33.74 ns，其中 78% 花在造键上）。

**预估收益**：把 `constructor.name` 换成预置的符号键/静态 id，可省 **10–15 ms（0.7–1.1%）**。
便宜但收益小。

**置信度**：高（机械），收益低。

### 不在上表但值得记一笔

- **`AreaAnnotation.Default` 逐字符拼字符串**：1,542,377 次/份（0.6565/字符），`this.Tmp += buffer.At(index)`。
  单次 `Temp += ch` 约 15.6 ns（`dts-cost-probe --micro`），折算 ~24 ms/份。但 profile 里它进不了 top 120，
  说明实际单价远低于 15.6 ns（V8 对短字符串追加有快路径）。**不作为阻塞点**，但在改 #1 时可以顺手把它改成
  「记 Start/End 跨度、需要时再 `GetRaw`」。
- **`SyntaxContext.ProcessRange` 在 Parse 路径上 0 次调用**——如果文档/契约里还把它写成驱动入口，需要更正。
- **启动开销不是本任务的瓶颈**：cjs loader + 原生装载 ≈ 232 ms，占 profile 总时间的 5.9%，但它在
  `parse-perf` 的单次 Parse 计时之外，不影响 1424.8 ms 这个口径；只在直接读 profile 百分比时会造成稀释。

---

## 8. 下一步优化清单（按性价比，含风险）

| 顺序 | 动作 | 预估收益 | 风险 | 备注 |
|-----:|------|---------:|------|------|
| 1 | `LineTerminator.HasBetween` 把 `SourceRange.Whole(document)` 提出循环外，或直接 `document.GetValue(i)` | 30 ms（2.1%）＋ GC 下降 | **低**：纯函数，`At`≡`GetValue` 在 `[0,count)` 上；别把 `document===null \|\| EndIndex<0` 的守卫一起提掉 | 一处改动，1.12 M 对象/份消失。**建议先做这个** |
| 2 | 一次分派内把字符读一次、顺链传给 `Transit/ExitOrPre/IsAppend` | 60–100 ms（4.2–7.0%） | 中：要改 `BranchTransiter` 的签名（`(context, unit, buffer, index)` → 多一个 `char`），十来个 `Transit` 逐个改 | 直接把 `At` 从 6.28 降到 ~1.5/字符 |
| 3 | `Transit` 分派从「顺序试队列」改成「按首字符 O(1) 选」 | 80–125 ms（5.6–8.8%） | **高**：`BranchTemplate.Get` 的队列序有语义（前一个返回 `Done` 就短路），重排会改分词结果 | 用 `dts-ab.mjs` / `buffer-equivalence.mjs` 守住等价性；建议先加「首字符 → 候选集」的**预筛**而不是重排 |
| 4 | 循环内 `Messages/Replaying/MountedUnit` 判定改为「状态变更后才重查」 | 55–83 ms（3.9–5.8%） | 中高：`context.Index` 的推进保证（`no progress` 守卫）容易被破坏 | 需要 `parse-perf` + 等价性双向门禁 |
| 5 | 相邻 token 换行判定按 tokenIndex 记忆化 | 25–40 ms（1.8–2.8%） | 中：`FindMemberBoundary` 有多种调用方（`FindTypeMemberBoundary` 等多份近似循环） | 与 #1 同一片代码，可以一起做 |
| 6 | `Token.SourceRange` 惰性化 / 摊平为字段 | 25–40 ms（1.8–2.8%） | 中高：`SourceRange` 是可变对象，被 `Undo`/`WhichUnitRangeContains` 大量使用 | 影响面大，放最后 |
| 7 | `GetState` 的键从 `constructor.name` 换成静态 id | 10–15 ms（0.7–1.1%） | 低：`PossibleShapeCache` 是纯缓存 | 顺手做 |

**建议的推进顺序**：`1 → 2 → 5 → 4 → 3 → 6 → 7`。
先做 1（几乎零风险、25–30 ms），再做 2（收益最大且不碰分派次序），
3 与 4 都会动分派/推进语义，必须配等价性门禁。

### 8.1 门禁与验证方式

- 时间：`node tests/bench/parse-perf.mjs --dts 8 --repeat 3`（本机噪声 ±5%，**至少 repeat=3 并看 samples**，
  单次 `repeat=1` 的抖动可达 ±10%）。
- 计数不回退：`node tests/bench/dts-cost-probe.mjs --count --files 1`，重点看 `At`/`Has` 的每字符次数是否按预期下降。
- 分配不回退：`node tests/bench/dts-alloc-probe.mjs --files 1 --attribute`，重点看 `SourceRange.Whole` 是否从 1.40 M 掉到 ~0.27 M。
- 等价性：`tests/bench/buffer-equivalence.mjs` 与 `tests/bench/dts-ab.mjs`（本次未改业务源码，未运行它们）。

---

## 9. 复现清单

`tmp/` 与 `build/` 都在 `.gitignore` 里，profile 产物不入库；按 §1 的命令重跑即可得到同样的 `.cpuprofile`。
本文用到的四份原始读数（都已核对过一致性）：

| 产物 | 命令 | 关键读数 |
|------|------|---------|
| 基线 | `parse-perf --dts 8 --repeat 3` | 1424.8 ms |
| 8 份 profile | `--cpu-prof ... parse-perf --dts 8 --repeat 1` | samples=4236, total=3924.6 ms, GC 4.14% |
| lib.dom profile | `--cpu-prof ... dts-profile --file lib.dom --repeat 3 --warmup 1` | samples=4163, total=3932.4 ms, GC 3.16% |
| 计数 / 分配 / 单价 | `dts-cost-probe --count --files 1`、`dts-alloc-probe --files 1 --attribute`、`dts-micro-buffer --trials 5` | §4 / §5 / §6 |

三个新增脚本的 header 里都写了「这个数为什么可信、为什么不能用来比时间」，改动它们时请一并维护那几行注释。
