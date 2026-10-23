# basic token / GC 还剩多少可优化空间（2026-10-23 实测）

STATUS: **分析报告（2026-10-23）。§6 的推荐 1、2 已于同日落地**（窗口 32→128 + `BasicDispatch` 分类表），
落地报告 = [`docs/opt-window128-and-class-table.md`](opt-window128-and-class-table.md)（含以 TypeScript 为基准的前后对照）。
本页保留“分析当时”的判断与证据；落地后的实际读数（8 份 d.ts A/B **+10.1%**）与预估值一致。
对象 = HEAD `9e13943d`（run-batching 已落地）的 `build/` 产物；
机器 = Windows 10.0.19044 / Node v24.21.0 / 单进程、单机、默认 GC；语料 = `node_modules/typescript/lib` 下最大的 8 份 `.d.ts`
（4,056,233 B / 4.07 M 字符，与 `parse-perf --dts 8`、`buffer-ab --dts 8` 同一批）。

三路并行取证（每个都是**独立重跑**，不是照抄旧文档）：T1 画像（profile + GC 账本）、T2 `BasicDispatch` 残余分派原型、
T3 分配/GC 原型；外加 Lead 的「驱动窗口大小」实验。证据原件见文末 §9。

---

## 1. 一页纸结论

1. **「每字符一帧」已经解决，不再是问题。** run-batching 之后：`AreaAnnotation.Default` = **0 次**、
   `SourceRange.At` = **0.152 次/字符**（旧版 3.07）、`Bracket.*` 只剩 **0.63%** self。
2. **basic token 层现在真正的钱是三块**（窗口 32，8 份 d.ts，折算基数 684.9 ms）：
   `BasicDispatch.Transit` **9.23%（63 ms）** + 三个 token ctor **13.69%（94 ms）** + GC **7.44%（51 ms）** = **30.4%（208 ms）**。
3. **最大的一条低风险优化不在 basic-token 代码里，而在驱动窗口大小**：`BufferSize 32 → 128`，
   8 份 d.ts 同进程 A/B **+7.0% ~ +9.5%**（三组独立运行），全语料 **4,497 文件 XML 逐字节等价**、**七道门全绿**；
   改动只有一处参数（不改任何 token 语义）。原因是 run-batching 把成本集中到了「每窗口一次」的批处理入口上。
4. **`BasicDispatch` 分类表**（T2 候选 A：128 项 ASCII 分类位表 + plain 快速出口）：
   窗口 32 下 **+2% ~ +5%（中心 +3.5~4%）**，在窗口 128 上再叠 **+2.9% ~ +5.1%**；全语料 4,556 文件 xml+digest 等价 PASS。
   代价是 core 两个文件（+~120 行）和一条「建表后模板分类必须冻结」的契约。
5. **GC 没有低风险收益。** GC 只占 **7.5%（53 ms）**，其中 **92% 是 scavenge**；scavenge 的暂停由
   「存活形状树复制/晋升」决定，不由垃圾量决定。实测把分配砍 **−8.1%**（叶子共享空 `Data`）/ **−25%**（+注释 `Tmp` chunk），
   GC 暂停只动 −0% / −3.8%（噪声内），**墙钟 0**（−1.30% / −0.47%，符号为负）。两个原型都**不值得写回**。
6. **推荐顺序**：① 窗口 128（+7~9.5%，低风险，先落）→ ② dispatch 分类表（+3~4%，中风险，单独 commit）
   → ③ **不做** GC/分配削减 → ④ 再往下的大块在形状层（`typescript/tokens` **29.8%~32.2%**，已大于 basic-token 窄口径），不属本题。
   两者叠加实测：**8 份 d.ts 609.0 → 538.9 ms（在同一进程 A/B 里 +11.5% 逐文件 / +9.7% 每轮）**。

---

## 2. 现状画像（窗口 32，8 份 d.ts）

干净基线：`parse-perf --dts 8 --repeat 3` 两次 **679.86 / 689.97 ms**（差 1.5%，折算基数 **684.9 ms**）。
profile：3 趟共 2,915.9 ms，有效采样间隔 885 µs；**绝对 ms 一律用「self% × 干净基线」折算**。

### 2.1 目录占比（self）

| bucket | self % | 折算 ms |
|---|---:|---:|
| `core/syntax`（不含 basic-tokens） | 40.96 | 280 |
| `typescript/tokens`（形状层） | 29.82 | 204 |
| **`core/basic-tokens`（窄口径）** | **10.21** | **70** |
| **GC** | **7.44** | **51** |
| `core/syntax` 其余（unit-token/token/block-token…） | — | — |
| **basic-token 宽口径**（窄 + dispatch + unit-token + token/block-token ctor + symbol-template） | **42.5** | **291** |

> 扣掉 7.27% 的模块装载/读语料后，分母 2,704 ms：GC 8.03%、basic-tokens 11.01%、`core/syntax` 55.18%、`typescript/tokens` 32.16%。

### 2.2 剩余热点（top，按名字聚合）

| 项 | self % | 折算 ms | 说明 |
|---|---:|---:|---|
| `BasicDispatch.Transit` | **9.23** | **63.2** | **470,903 次**/8 份 = 0.116/字符（run-batching 前 1,628,920 次） |
| `UnitToken.Process` | 5.61 | 38.4 | 窗口驱动帧，次数已随窗口大小线性下降 |
| `Token` ctor / `BlockToken` ctor / `UnitToken` ctor | 5.72 / 4.27 / 3.70 | 94（合计） | 每 token 一个对象 + 一个 `Data=[]` + 一个 `SourceRange` |
| `WrapSymbol.Transit` | 2.62 | 17.9 | 空白整段收（已批处理） |
| `AreaAnnotation.Process` | 2.36 | 16.2 | 注释整段收，**每窗口一次** `GetRaw + indexOf + Tmp +=` |
| `Symbol.Transit` | 1.18 | 8.1 | |
| `Common.*` | 1.42 | 9.7 | |
| `Bracket.*` | **0.63** | 4.3 | 已冷 |
| `ComputePossibleShapes(ByIndex)` | 5.21 | 35.7 | 形状层（不属 basic-token） |

调用/对象量（插桩计数，确定性）：`SourceRange.At` 616,755（0.152/字符）、`Has` 626,875、`ValueAt` 914,682、
`new SourceRange` **777,197**（0.191/字符，其中 622,905 是 token 字段初始化、154,284 是窗口形态）、
`SourceRange.Whole` 465,489（**已缓存，0 分配**）、`Document.GetValue` 1.53 M、`AppendAndSignOut` 422,763。

### 2.3 GC 账本（两条独立口径互证）

| 口径 | 读数 |
|---|---|
| profile `(garbage collector)` self | 7.44%（第二次 7.13%）→ 折算 **51 ms** |
| `PerformanceObserver('gc')` 实测（9 轮 × 8 份） | **7 次 Scavenge / parse，0 次 major**；总暂停中位 **53.1 ms**，占墙钟 **8.45%**（范围 6.3%–9.7%）；p50 6.6–7.5 ms、p90 10–15 ms |
| 10 轮长跑复核（Lead） | 每 parse GC **6–8 次**、暂停 **35–67 ms**（中位 ~48 ms ≈ 7.8% 墙钟），**没有随轮次变差**；老年代每轮 +85 MB 由后续 major 兜底 |
| 堆 | warmup 后 heapUsed 82.8 MB；每 parse 峰值 179.7 → 277.0 → 344.0 MB；强制 GC 后**存活堆 19.0 MB** |
| warmup | 首轮 953–1,011 ms，21 Scavenge + 2 Mark-Compact（semi-space 16→128 MB），约稳态 3 倍，**不计入** |

---

## 3. basic token：剩余项逐条判定

### 3.1 采纳：`BasicDispatch` 128 项字符分类表（T2 候选 A）

**改法**（只改 `template.xl.md` + `basic-dispatch.xl.md`，+~120 行）：第一次 `Transit` 时为模板懒建一张
**128 字符的 string 表**（xl 中立类型里没有 `Uint8Array`，用「第 i 个字符的码点低 7 位 = 7 个分类位」编码），
7 位分别对应 ① BOM / ② Shebang 首字符 / ④ Quotes / ⑤ 开括号 / ⑥ IsWhiteSpace / ⑦ IsSymbol / ⑧ plain。
每次调用 `value.charCodeAt(0)` 查表后按**原队列顺序**处置；`code >= 128` 全回退原 ①–⑧ 链（本语料非 ASCII 仅 114 字符）。
每一位都是建表时用**模板自己的谓词**问出来的，不写死 ASCII 假设。

**为什么等价**：处置顺序 = 原队列顺序；③「前一字符是 `/`」仍对每个字符跑（run-batching 的语义雷区，不跳）；
⑥/⑦ 的「收掉上一个未闭合 WrapSymbol / Symbol」副作用显式保留（`TryToClose` 可能 `Built → Reload`）。
全语料 `buffer-equivalence --mode both`：**4,556 文件 / 7,837,812 字符；xml PASS 4504 / FAIL 0 / 同错 52；digest 同；字节 34,109,694、token 797,790 一致**。

**读数**（8 份 d.ts，同进程 A/B，2-dir 协议；A/A 同会话 −1.79% / −0.09% / 配对 −0.40%）：

| 运行 | 逐文件中位之和 | 每轮合计中位 | 逐轮配对比值 中位 |
|---|---:|---:|---:|
| 写回形态 `build-p6` vs `build`，repeat 21 | **+2.23%** | **+4.17%** | **+4.24%** |
| `build-p2` vs `build`，repeat 31 | +2.16% | +5.30% | +5.20% |
| 叠在窗口 128 之上（Lead，repeat 15 / 4-way 派生） | +3.03% ~ +4.1% | +2.9% ~ +5.1% | — |

判定：**中心 +3.5~4%（单独）/ +3~4%（窗口 128 之上）**，大于本会话 ±2% 的 A/A 带，**采纳**。

**风险（必须写进契约）**：

1. **表是建表时模板谓词的快照**——建表后运行期再改 `BomChars` / `Quotes` / `SymbolTemplate.Ban|Allow` / 覆写
   `IsSymbol|IsWhiteSpace`，表会静默过期，最坏是「字符没人接手 → `Default` 吞掉、产出错树」。缓解：`Template.Initialize()` 清表
   + 文档写死冻结契约（本仓唯一用法满足：每次 `new Template()`、parse 期间只读）。
2. 只覆盖 ASCII：CJK 标识符语料等于无收益（本仓只有 ts 模板，可接受）。
3. ③ 的顺序与 ⑥/⑦ 的副作用不能「顺手简化」，这是等价性 PASS 的前提。
4. 建表成本 ~0.1–0.3 ms/轮（已含在读数的正收益里）。

### 3.2 否决：其余 `BasicDispatch` / 注释微优化

| 候选 | 读数（同进程 A/B，vs 窗口 32 或 vs P2） | 判定 |
|---|---|---|
| B：plain 字符在 ③ 后直接进 ⑧（单独） | 三轮 **+2.9% ~ −1.9%**，落在 A/A 带 | 单独不采纳（已并入 A 的 no-class 分支） |
| C：⑧ 的 `raw.substring` 在整段=窗口剩余时复用 `raw` | +0.22% / +0.24% / 配对 −1.47% | 噪声内，否决 |
| D1：③ 的 `ValueAt`/`Whole().At` 换成 `document.GetValue(preIndex)` | +0.02% / −0.44% / 配对 −1.21% | 略负，否决 |
| 注释 `Tmp` 改 chunk（作为 g2 的一部分） | 分配 −16%，墙钟 −0.47% / −0.33% | 否决（见 §4） |
| 继续抠 `SourceRange` / `Bracket` | `At` 0.152 次/字符、`Bracket.*` 0.63% | 已冷，<1% |

> 方法论警告：本会话的单轮 A/B 波动可达 **±2~4pp**；多候选同进程混测还有 **~+3% 加载序偏差**（后加载的副本占便宜）。
> 任何 <2% 的候选都不值得加代码；写回后必须用 repeat≥21 + 同会话 A/A 复测。

---

## 4. GC / 分配：有量，但没有低风险收益

### 4.1 分配账本（8 份 d.ts / 每 parse，模型 ±25%）

| 项 | 数量 | MB | 说明 |
|---|---:|---:|---|
| Token 对象 | **622,277** | 74.7 | 其中 **basic 叶子 379,418**（WrapSymbol 141,792 / Common 119,164 / Symbol 105,248 / AreaAnnotation 10,018…），**全部「造了又合并掉」的年轻垃圾** |
| `Data = []` 数组 | 622,277 | 19.9 | 每个 Token 一个空数组 |
| `SourceRange` 对象 | **776,344** | 31.1 | token 字段初始化 622,277 + 窗口 154,067 |
| 字符串 | — | 18.7 | 最大一笔是注释 `Tmp +=`：82,343 窗 × 平均已 146 字符 ⇒ **12.0 MB 复制/parse** |
| **合计** | | **144.3** | 与「6.6 次 scavenge/parse」自洽 |
| parse 后仍存活 | **217,363** | ~30–40 | **全是形状 token**（basic token 不进最终树） |

### 4.2 两个削减原型（build 副本，xml 等价均 PASS 34,109,694 字节）

| 原型 | 分配 | GC 暂停 | 墙钟 A/B（repeat 11） | 判定 |
|---|---|---|---|---|
| g1：叶子 basic token 共享空 `Data`（COW） | −11.6 MB / **−8.1%** | 无变化 | **−1.30% / −0.84%**（噪声，方向为负） | 不写回 |
| g2：g1 + 注释 `Tmp` chunk 数组 | −35.6 MB / **−25%** | −2.0 ms / −3.8%（噪声内） | **−0.47% / −0.33%** | 不写回 |

**机理**：scavenge 的暂停 = 把**存活对象**从 from-space 复制到 to-space / 晋升，而 parse 中存活的是**正在长大的形状树**（每 parse 217k 形状 token）。
垃圾多只增加 GC **次数**，不增加单次暂停；砍 25% 分配只把 scavenge 次数从 6.63 压到 6.00，暂停自然只降 ~4%。
GC 总上限只有 7.5%，按比例「砍 25% 分配」只对应 ~1.3%——本来就在噪声带里。这与旧文档 O1「分配 −81% 没转成墙钟」是同一机制。

### 4.3 真要动 GC 的话（都不属本轮）

1. **减存活形状树 / 晋升量**（每 parse 217k 形状 token，约 30–40 MB 晋升）：这是形状层的对象数问题，不是 basic-token micro-opt。
2. **把 `SourceRange` 内联进 Token**（622k 对象 = 31 MB，占分配 22%）：结构改动，碰所有 `.SourceRange.X` 访问点，风险高。
3. 让形状层少造 token（380k basic token/parse 的「造了又合并掉」）：换实现级改动。

---

## 5. 新发现：驱动窗口 `BufferSize 32 → 128`（本轮最大低风险项）

### 5.1 机制

run-batching 把「注释正文 / 空白段 / Common 正文」从「每字符一帧」压成「每窗口一次」之后，
**每窗口的固定成本（`Root.Process` 进入 + `try/catch` + 批处理入口 `GetRaw/indexOf` + dispatch 一次 + 索引簿记）**
从「占大头」变成「相对更贵」：窗口 32 时 8 份 d.ts 有 **127,108** 个窗口，窗口 128 只有 ~31.8 K。
profile 直接印证：窗口 128 后 `AreaAnnotation.Process` **−60%**（2.36%→0.98%）、`basic-tokens` 目录 −20%（10.21%→8.90%）、
`BasicDispatch` 9.23%→8.48%、profile 总时长 **−7.8%**；而三个 ctor（13.69%→13.93%）与 GC（7.44%→7.73%）**不动**。

### 5.2 窗口扫描（全语料 4,497 个可解析文件 / 6.99 M 字符；XML 逐字节等价）

| size | TOTAL ms | Δ% vs 32 | `lib/*.d.ts` 分组 Δ% | ns/字符 |
|---:|---:|---:|---:|---:|
| 32 | 2,475.4 | 0 | 0 | 353.9 |
| 64 | 2,443.8 | −2.07 | −4.18 | 349.4 |
| 128 | 2,383.3 | **−3.72** | **−8.81** | 340.7 |
| 256 | 2,377.4 | −3.96 | −8.61 | 339.9 |
| 512 | 2,360.1 | −4.66 | −10.51 | 337.4 |

全部 size 的 XML 字节量都是 **34,046,403 B**、PASS 4,497 / FAIL 0 / 同错 9 ⇒ **窗口大小不改变语义**。
（旧结论「推荐保持 32」是 run-batching 之前测的：当时 32→128 只有 −1.09%，落在 3% 噪声带；batching 之后同一改动值 ~−9%。）

### 5.3 同进程 A/B（8 份 d.ts，build 为基线，候选第 2 个加载）

| 运行 | 逐文件中位之和 | 每轮合计中位 | 备注 |
|---|---:|---:|---|
| repeat 11（与其它 bench 并行，噪声较大） | **+8.71%** | **+7.31%** | 128 vs 32 |
| repeat 15（空闲会话） | **+9.51%** | **+9.02%** | 128 vs 32 |
| 4-way repeat 21（含 A/A） | **+7.70%** | **+6.99%** | A/A 同轮 +0.90% / −0.66%；paired 中位 +8.55% |

判定：**+7.0% ~ +9.5%，中心 ~+8%**；512 vs 32 在扫描里略好（−10.5%），但 A/B 无法与 128 区分（差异在噪声内）→ **先取 128**。

### 5.4 七道门（把 `build-b128` 临时换到 `build` 位置实跑，跑完还原）

| 门 | 结果 |
|---|---|
| `validate.mjs` | 1719 条 / **0 不合格** |
| `ast-json-diff.mjs` | **6167 / 6167**，结构/位置/字段差 0 |
| `real-dts-ast.mjs` | 226 文件：解析成功 **226**、崩溃 0、AST 一致 **226** |
| `token-ast.mjs --quiet` | total 1715 / ok 1705 / crash **0** / diff **0** / ts-invalid 10 |
| `body-guide/harness.mjs --all` | 35/35、25/25、23/23、16/16、util 10/10，fail 0 |
| XML 等价（`buffer-equivalence`） | 4,497 PASS / 0 FAIL / 同错 9 |

### 5.5 落点（一行参数，不是语义）

- `core/syntax/syntax-context.xl.md:25/73`：`field BufferSize:int = 32` 与构造器 `bufferSize ?? 32`；
- `typescript/run/source-file-runner.xl.md:35`：`new SyntaxContext(root)` → `new SyntaxContext(root, 128)`
  （**只改 typescript 层，core 默认不动**也能拿到全部收益——`parse-perf` / `buffer-ab` / 七道门都走 `SourceFileRunner.Parse`）。
- 若要统一口径再改 core 默认（需用户批准）；`README`/`docs` 里「`SourceFileRunner.Parse` 也写死 32，一改要同步两处」要一并更新。

---

## 6. 叠加读数与推荐

**窗口 128 + dispatch 分类表（`build-b128p6`）vs 当前 `build`**：

| 运行 | 逐文件中位之和 | 每轮合计中位 | 逐轮配对比值 中位 |
|---|---:|---:|---:|
| 4-way repeat 21（A/A 同轮 +0.90% / −0.66%） | **+11.52%** | **+9.71%** | **+9.68%** |
| repeat 15（该轮基线整体偏快，判为保守下沿） | +7.00% | +8.81% | — |

绝对量（4-way 同一进程）：8 份 d.ts 逐文件中位之和 **609.0 → 538.9 ms**；每轮合计中位 **619.7 → 559.5 ms**。
折算到 `parse-perf` 口径（684.9 ms 基线）≈ **606 ms** 量级（换算值，不是独立读数）。

### 推荐顺序

| 顺序 | 动作 | 收益 | 风险 | 改动面 |
|---:|---|---:|---|---|
| 1 | **`BufferSize` 32 → 128** | **+7~9.5%**（8 份 d.ts）；全语料 −3.7% | **低**（XML 等价 + 七道门全绿；只是调用粒度） | `source-file-runner.xl.md` 一行（+可选 core 默认同步） |
| 2 | **`BasicDispatch` 128 项分类表（候选 A）** | **+3~4%**（单独 +3.5~4%） | 中（模板冻结契约；core 两文件 +~120 行） | `template.xl.md`(+8) + `basic-dispatch.xl.md`(+110) |
| 3 | ~~GC / 分配削减~~ | **0** | —（两个原型否决） | — |
| 4 | 形状层（`typescript/tokens`，30~32%） | 待立项 | 高 | 不在本报告范围 |

**落地纪律**（沿用仓内既有口径）：每一步单独 commit、单独跑七道门 + 全语料等价；A/B 用 repeat≥21 并带**同会话 A/A**；
1 是参数改动可直接做（建议先只改 typescript 层），2 动 core，按 `IMPORTANCE §3.1` 需要用户发起/批准。

---

## 7. 明确不做

- 继续抠 `SourceRange` 微调用（`At` 0.152 次/字符、`Bracket.*` 0.63%：已冷，收益 <1%）；
- 「分配 −N%」类工程（`Data` 共享 / `Tmp` chunk / `SourceRange` 懒建）：实测转换率 0，O1 已先证一次；
- 为 <2% 的候选加代码（本机单轮波动 ±2~4pp，证明不了）；
- 加大窗口到 256/512 作为第一步：没有可判定的额外收益，先落 128 再看。

---

## 8. 口径与未复核（引用前必读）

1. **绝对 ms 不可跨会话相减**：不同进程/轮次 8 份 d.ts 合计在 538–690 ms 间漂移（±10%），只有**同进程 A/B 的 Δ%**可信。
   `parse-perf` 的 `totalMedianMs` 是「逐文件中位之和」，不是一轮墙钟；`buffer-ab`/`gc-observe` 的墙钟又是另一个口径。
2. **profile 绝对 ms 不能当基线**：profiler 开销 +6%~+12%；本次折算一律 `self% × 684.9 ms`。
3. **单轮 A/B 波动 ±2~4pp**；4-way 混测有 ~+3% 加载序偏差（本轮已作废该口径的读数）。
4. **GC p50/p90 置信度低**（每轮 7 个样本）；可靠的是「7 次/parse、暂停 38–61 ms、占比 6.3%–9.7%」这个量级。
5. **未复核**：dispatch 分类表写回后没有 profiler 复核 `Transit` self 的下降（只有 A/B 与等价）；226 份全语料只做等价没做 A/B；
   b128 的 226 份 A/B 没做（只做了 8 份 A/B 与全语料等价+七道门）；512 窗口只做了扫描，没做正式 A/B。

---

## 9. 证据原件与复现

本轮所有原始读数（T1/T2/T3 报告的完整版、cpuprofile、GC 账本 JSON、A/B 输出）都在 `tmp/team/` 下（`tmp/` 在 `.gitignore`），
已一并抄进 `docs/opt-basic-token-gc-evidence/` 备查：

| 文件 | 内容 |
|---|---|
| `docs/opt-basic-token-gc-evidence/profile.md` | T1：画像、GC 账本、窗口 128 画像（完整版） |
| `docs/opt-basic-token-gc-evidence/dispatch.md` | T2：候选 A/B/C/D 的全部读数、写回落点、风险（完整版） |
| `docs/opt-basic-token-gc-evidence/gc-alloc.md` | T3：分配账本、GC 实测、g1/g2 原型（完整版） |

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example

# 0) 基线（不带动 build/、dist/ 时先重建：xl_build [core,typescript]→ts，再 tsc -p tsconfig.json）
node tests/bench/parse-perf.mjs --dts 8 --repeat 3

# 1) 画像 + GC 账本
node --cpu-prof --cpu-prof-dir=tmp/prof --cpu-prof-interval=100 tmp/prof-run.mjs build 2
node tests/bench/prof-summary.mjs tmp/prof/<CPU>.cpuprofile --top 40
node --expose-gc tmp/team/profiler/gc-observe.mjs build 8 3

# 2) 窗口扫描（只改构造窗口，不改语义）
node tests/bench/buffer-size-sweep.mjs --sizes 32,64,128,256,512 --dts 8 --repeat 5

# 3) 窗口 128 A/B（把 build 复制成 build-b128，只把 SyntaxContext 构造默认 32 改 128）
node tests/bench/buffer-ab.mjs --base build --new build-b128 --repeat 15

# 4) dispatch 分类表 A/B + 全语料等价（原型副本 build-p2/build-p6 在 tmp 报告里可重建）
node tmp/team/dispatch-opt/ab-multi.mjs build build-aa --repeat 21 --warmup 3
node tmp/team/dispatch-opt/ab-multi.mjs build build-p6 --repeat 21 --warmup 3
node tests/bench/buffer-equivalence.mjs --mode both --base build --new build-p6 --quiet

# 5) 叠加（窗口 128 + 分类表）
node tmp/team/dispatch-opt/ab-multi.mjs build build-aa2 build-b128 build-b128p6 --repeat 21 --warmup 3
```
