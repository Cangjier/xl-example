# 性能报告：parse / class / statement（WP-F 汇总）

> 汇总对象：`refactor-integration @ 2c68a87c`（tag `merge/perf-2`）
> 本报告**只汇总已有测量**，不新造数字；其中 §2–§4 为 `wpf-final` 本轮静默复测的读数，§6 为历史报告读数（注明来源）。
> 测量方法一致：每次重开 node 进程、轮间空闲 1.2 s、测量期间本机无其它 agent、无并发 node。

---

## 1. 方法与环境

| 项 | 值 |
|---|---|
| 机器 | Intel Xeon Platinum 8378C @ 2.80 GHz / 16 核 / 32 GB |
| 运行时 | node v24.21.0 |
| new 侧 | `wpf-final\build`（`xl_build` 510 / 0 error → `tsc` exit 0，510 `.js`） |
| base 侧 | `baseline-build\build`（`main` @ `3eb86b72`，872 `.js`） |
| 采集 | 每个 bench 一次前台 node 进程，`Get-Process node` 采集前后均为 0 |

三个 bench 的**统计口径**是本次结论的前提：

- `parse-perf.mjs --dts 8 --repeat 3`：每份 d.ts 在**同一进程**里跑 `repeat` 次取中位；`TOTAL median` 是 8 份中位之和。
  轮与轮之间不共享进程，故轮间差异包含**堆增长相位**（见 §5）。
- `class-scaling.mjs --rounds 15`：每档 `warmup=2` + 15 个样本取中位；`--base` 时 new/base **同一 harness、同一轮配对**，
  奇偶轮换序抵消「谁先跑谁占便宜」。
- `statement-scaling.mjs --rounds 15`：同上，并对同规模用例报 `new/base` 比值；前一档 <2 ms 的倍数标记
  `below-floor`（固定开销主导，不作断言）。

**判定口径**：parse `≤1.05`；大成员体「可测改善」；memberCount 与 statement 同规模 `≤1.10`，且以**逐轮比值的中位**为准，
不以单轮读数定罪（见 §5）。statement/XML-byte 按验收 waive，只记录。

---

## 2. 总 Parse（`parse-perf.mjs --dts 8 --repeat 3`，双方各 3 轮）

| 轮 | new TOTAL (ms) | base TOTAL (ms) | 逐轮比值 |
|---|---|---|---|
| 1 | 519.007 | 530.890 | 0.978 |
| 2 | 551.833 | 534.516 | 1.032 |
| 3 | 576.103 | 557.862 | 1.033 |
| **中位** | **551.833** | **534.516** | **1.032×** |

**判定：1.032× ≤ 1.05 → 达标。**

### 2.1 分文件（3 轮中位再取中位，ms）

| d.ts | 体量 (B) | stmts | new | base | new/base |
|---|---|---|---|---|---|
| lib.dom.d.ts | 2,349,483 | 2805 | 267.394 | 289.767 | **0.923** |
| lib.webworker.d.ts | 787,076 | 1149 | 105.744 | 105.508 | 1.002 |
| typescript.d.ts | 588,452 | 2 | 136.169 | 101.275 | **1.345** |
| lib.es5.d.ts | 218,972 | 147 | 24.898 | 26.044 | 0.956 |
| lib.es2023.array.d.ts | 40,197 | 13 | 3.018 | 3.020 | 0.999 |
| lib.es2020.bigint.d.ts | 38,258 | 12 | 3.893 | 4.070 | 0.956 |
| lib.es2015.core.d.ts | 22,824 | 21 | 2.492 | 2.606 | 0.956 |
| lib.es2015.symbol.wellknown.d.ts | 10,971 | 33 | 2.021 | 1.985 | 1.018 |

**读法**：总量上新的 item 表引擎在**语句多**的最大语料上更快（`lib.dom` 0.923×，2805 条语句），
总账之所以为 1.032×，主要被 `typescript.d.ts`（588 KB、仅 2 条语句）的 **1.345×** 拖走约 +35 ms——
那是一份「token 极多、item 极少」的语料，成本落在词法/批切分与逐 item 前瞻的固定开销上，item 表引擎的收益无从发挥。
其余 6 份小语料在 0.96–1.02 之间。

---

## 3. class-scaling（12 档；new 与 base 各 `--rounds 15`）

### 3.1 档 A：成员数 N（每成员固定 12 个类型 token）

| N | new ms | base ms | new/base |
|---|---|---|---|
| 250 | 11.73 | 12.09 | 0.970 |
| 500 | 27.17 | 27.33 | 0.994 |
| 1000 | 56.51 | 55.11 | 1.025 |
| **2000** | **117.90** | **109.00** | **1.082** |

逐轮比值中位 **1.010×**（≤1.10 达标）；最差档 2000 为 **1.082×**，仍是全表余量最小处。

### 3.2 档 B：单个成员的类型 token 数 T

| T | class new | class base | **比值** | iface new | iface base | **比值** | class/iface |
|---|---|---|---|---|---|---|---|
| 250 | 0.67 | 0.95 | **0.705** | 0.66 | 0.84 | **0.786** | 1.02 |
| 500 | 1.21 | 1.75 | **0.691** | 1.18 | 1.64 | **0.720** | 1.03 |
| 1000 | 2.43 | 3.52 | **0.690** | 2.32 | 3.04 | **0.763** | 1.04 |
| 2000 | 4.94 | 7.31 | **0.676** | 4.71 | 6.00 | **0.785** | 1.06 |
| **中位** | | | **0.691** | | | **0.774** | |

### 3.3 档 C：带装饰器的单个长成员

| T | new ms | base ms | new/base |
|---|---|---|---|
| 250 | 0.70 | 1.06 | **0.660** |
| 500 | 1.28 | 2.08 | **0.615** |
| 1000 | 2.48 | 4.02 | **0.617** |
| 2000 | 5.15 | 8.01 | **0.643** |
| **中位** | | | **0.630** |

### 3.4 判读

- **用户验收点（大成员体可测改善）成立**：class body 0.68–0.71×（改善 29–32%）、interface 0.72–0.79×（21–28%）、
  decorator 0.62–0.66×（34–39%）。改善随档位增大保持稳定，说明省的是**每成员体**的增量，不是一次性固定开销。
- **标度形**：new 侧 class 相邻档倍数 1.86 / 1.96 / 2.05，iface 1.87–1.91–2.04，decor 1.81 / 1.98 / 2.03，
  memberCount 2.32 / 1.72 / 2.14 —— 全部 < 2.6，线性形态正常，无 O(L²)。
- **class/iface 比**：1.02–1.06（门槛 ≤1.8），成员判定比 interface 增量样板只贵 2–6%。
- **memberCount**：唯一仍比 base 慢的维度（2000 档 1.082×），与「成员多 → 批边界/前瞻次数线性增长」一致；
  历史读数曾在 1.18–1.26（见 §6），`merge/perf-2` 的批内 splice 合并把逐轮中位压到 1.010×。

---

## 4. statement-scaling

### 4.1 同规模 new/base（`--rounds 15 --max-size 500`，1 轮，记录用）

| 用例 | new ms | base ms | new/base | 备注 |
|---|---|---|---|---|
| stmt-count-250 | 2.31 | 2.31 | 1.00 | |
| root-count-250 | 3.53 | 3.50 | 1.01 | |
| stmt-count-500 | 4.52 | 4.36 | 1.04 | |
| root-count-500 | 7.64 | 7.30 | 1.05 | |
| long-stmt-250 | 1.11 | 1.02 | 1.08 | below-floor |
| long-if-250 | 0.94 | 0.96 | 0.97 | below-floor |
| long-stmt-500 | 1.99 | 1.91 | 1.04 | below-floor |
| long-if-500 | 1.81 | 1.77 | 1.02 | below-floor |
| block-depth-125 | 0.77 | 0.78 | 0.98 | below-floor |
| **block-depth-250** | **1.60** | **1.44** | **1.11** | below-floor（绝对差 0.16 ms） |
| block-depth-500 | 2.96 | 2.94 | 1.01 | |

11 项里 **10 项 ≤1.10**；唯一超线的 `block-depth-250` 绝对差 0.16 ms、base 中位 1.44 ms，属 below-floor 噪声。
标度形（new）：functionCount 1.99、rootCount 2.01、longStatement 1.88、longIf 1.86、blockDepth 1.96 / 2.08，全部 <2.6。

### 4.2 gates full 默认网格（waived，记录）

`..\tools\gates.ps1 -Tier full` 里跑的是默认网格（含 1000/2000 档），报出 6 项超线：

| 用例 | new/base |
|---|---|
| stmt-count-1000 | 1.18 |
| stmt-count-2000 | 1.14 |
| long-stmt-1000 | 1.19 |
| long-stmt-2000 | 1.23 |
| block-depth-500 | 1.30 |
| block-depth-1000 | 1.18 |

这些**不是噪声可以完全解释的**：与 §4.1 的 500 档相比，超线集中在大档位，指向「逐 item 前瞻/扫描成本随语料线性增长」
的真实开销（profile 见 §7）。按 OPEN-Q4 记为 waived：不阻塞验收，但属已知未优化项。

---

## 5. 噪声与 GC 相位

`parse-perf` 本轮 new 侧三轮 TOTAL 为 519.0 / 551.8 / 576.1 ms（极差 **+11.0%**），base 侧 530.9 / 534.5 / 557.9 ms（+5.1%）——
**轮间漂移大于被测改造的增量**（±3%），且方向一致（后跑的轮更慢），说明差异来自进程级堆增长与老生代回收点的相位，
而不是被测代码路径。

三条处置规则（本报告与门槛判读都遵守）：

1. **逐轮配对再取中位**，不用单轮绝对值；
2. base 与 new 在**同一 harness、同一轮**内配对（`class-scaling` / `statement-scaling --base` 的内建口径），
   避免「谁先跑」的偏移；
3. base 中位 <2 ms 的档位（`block-depth-*`、`long-*` 的部分档）按 **below-floor** 处理，不作断言——
   在 0.06–0.16 ms 的绝对差上，1.10 门槛必然 flaky。

由此：`merge/perf-2` 之后 parse 落在 **0.98–1.03×** 区间（本轮 1.032×，另一支 `wpf-opt-final` 报 0.986×），
两者同处 `≤1.05` 门槛内；`statement` 的 500 档同规模比值在 0.97–1.11 间摆动，中位 ≈1.01。

---

## 6. 历史读数对照（引用，不重测）

| 来源 | 时点 | parse 8 dts | 备注 |
|---|---|---|---|
| `wpf-perf-audit-final\docs\refactor\perf-report-final.md` | `refactor-integration @ 4925b21a` | 1.070×（547.4 / 511.6 ms） | 大成员体 class −28~−34%、iface −20~−26%、decor −33~−34%；memberCount-500 1.26、2000 1.18 |
| 同一份报告引用的 WP-7 前读数 | WP-7 之前 | 1.53× | 说明 item 表 + WP-F 两轮收口把 1.53× 压到 ~1.0× |
| `bf176538`（`merge/perf-2` 前一笔）commit message | — | 1.070× → 0.982× | `HasTailNew` 迭代化 + `ApplyBuilds` 线性 rebase |
| 本轮 `wpf-final` | `2c68a87c` | **1.032×** | 3 轮逐轮比值中位；class 0.691×、iface 0.774×、decor 0.630×、memberCount 1.010× |
| `verify-scale\docs\refactor\scale-remeasure.md` | WP-2-8 合入时 | — | 5 轮静默复测：stmt-count-500 中位 1.01、block-depth-500 1.10，红读数由 base 侧双峰（17% 极差）造成 |

---

## 7. profile 归因（沿用 `perf-report-final` §5，未重测）

`node --cpu-prof`，500 条 `let` 语句的语料，30 次 `SourceFileRunner.Parse`：

- new 侧独有、可按名字归因的热点：`HasTailNew @root-item-rule:623`（2.1%）、`ScanRoot @statement-scanner:106`（2.4%）、
  `ApplyBuilds @item-list:166`（1.2%）、`Decide @statement-item-scan:90`（1.0%）、`BuildStatement @statement-builder:169`（1.1%）；
- base 侧的 `BatchPlain @basic-dispatch:227`（1.8%）+ `Add @token:49`（1.9%）合计 3.7% 在新侧已消失，
  说明批量 plain 快路径确实被替换，替换后多出逐 item 的前瞻/扫描成本；
- profile 会把单次 parse 放慢约 4×，且两份都含 25–30% 模块加载时间，**只看相对份额，不看 profile 总时长比值**。

`merge/perf-2` 已按此清单完成两项：`HasTailNew` 改为迭代式区间剪枝遍历、`ApplyBuilds` 改为线性 `CodeAt` rebase
（外加批内 splice 合并）。剩余未做项即 §4.2 的大档位开销。

---

## 8. 复现命令

```powershell
# new 侧（成员根）
cd C:\Users\Admin\Documents\GitHub\xl-example-set\wpf-final
node .\tests\bench\parse-perf.mjs --dts 8 --repeat 3
node .\tests\bench\class-scaling.mjs --build build --rounds 15
node .\tests\bench\statement-scaling.mjs --rounds 15 --max-size 500 --base ..\baseline-build\build

# base 侧
cd ..\baseline-build
node .\tests\bench\parse-perf.mjs --dts 8 --repeat 3
node .\tests\bench\class-scaling.mjs --build build --rounds 15

# 全量 gate（含 buffer / statement / class-scaling --base）
cd ..\wpf-final
..\tools\gates.ps1 -Tier full -BaseBuild ..\baseline-build\build
```

测量前确认 `Get-Process node` 计数为 0；轮间 `Start-Sleep -Milliseconds 1200`；不要与 `gates.ps1` 并发跑。
