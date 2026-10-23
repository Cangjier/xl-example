# tokens 层性能优化战役报告（wave1–wave3，2026-10-23）

STATUS: **已收口**。基线 = `opt/tokens-opt-integrated` @ **`c455d2b3`**（M3），含三轮共 **12 个分支
（13 个分支名，`opt/tokens-kinds` 被 `opt/tokens-kinds-fix` 取代）/ 17 个落地 commit**。
另有 1 个用户点名的实验分支 `opt/throttle-cps`：结论**不可行**、**不合并**（§6.2）。
判定标准全是测试：`buffer-equivalence` 逐字节等价（xml PASS 4504 / FAIL 0）+ 门禁 + `xl_check` 0 error；
性能结论一律以**同场 A/B** 为准：tokens 层累计 **≈ −7% ~ −9%（中心 ≈ −8%）**，`typescript.d.ts` 单文件 **≈ −14% ~ −16.7%**。
跨进程 `parse-perf` 的 −11.07% 只作历史线，**不与 A/B 混用**（见 §0.3 / §4.6）。

只读结论看 §0–§1；要知道谁改了什么看 §3；要复现跑 §8；要接续看 §7。
**本提交只新增本文件**，未改任何源码、测试或配置。

---

## TL;DR（一页纸）

1. **墙钟**：8 份 `.d.ts` 同场 A/B，BASE（`opt/buffer-v2` `5751c651`）→ M3 累计 **≈ −7% ~ −9%，中心 ≈ −8%**
   （focused 31 轮正反向交叉 **−7.4%**；buffer-ab `--repeat 21` **−6.84% / −7.34%**；`--repeat 41` **−8.0% ~ −8.4%**）。
   `typescript.d.ts` **≈ −14% ~ −16.7%**、`lib.dom` **≈ −6% ~ −8%**、其余小文件 −3% ~ −6%；
   `lib.es5.d.ts` **无可判定变化**（该文件的 A/A 地板就有 ±10–14%）。
2. **判定标准没动过**：全程 `buffer-equivalence` 逐字节等价（xml 4504/4504，字节两侧 **34,109,694**）+ 门禁 + `xl_check` 0 error。
   没有为跑通测试放宽任何测试或期望值；每轮合并后都用回归守门确认没有回退前序 wave。
3. **唯一的结构性成果**：class 成员判定 O(L²) → 增量（§5）。档 B 的 T=2000 单档 **488.0 ms → 7.11 ms**，
   门禁判据 class/interface 从 **6.2×→74.3×** 压到 **1.42 / 0.91 / 1.13 / 1.21**；装饰器长成员再补一档 **153.3 ms → 8.29 ms**。
   **但在当前 `.d.ts` 语料上收益是 0**（8 份里 2,954 interface / 10 class / 0 装饰器成员）——
   它的价值是消除**潜伏的**二次复杂度，并装上一条以后能抓到它的门禁，不是这轮的墙钟。
4. **同等重要的是否证**：6 项候选被实测或计数判定否决/不做（§6.1）。其中「减分配换墙钟」在本仓已被**两次**实测否决；
   `IsDefinitelyBodyBracket` 的 O(n²) 嫌疑也被证伪（扫的是接口自己的头部）。
   此外，用户单独点名的 `ComputePossibleShapes` **节流实验已证不可行**（§6.2：调用链决定消费流、N=2 就破 58 个文件、N=2 实测反而慢 25.8%）。
5. **剩余空间不在 tokens 层**：token 层剩余候选各自 <0.3%/pass；大头在 `core/**`
   （构造 ≈88 ms/pass、`BasicDispatch` ≈41 ms/pass、`CatalogGuide` ≈34 ms/pass、GC ≈38 ms/pass），**需用户单独批准**（§7）。

### 总账

| 指标 | 读数 | 口径 |
| --- | --- | --- |
| 累计墙钟（8 份 d.ts，BASE→M3） | **≈ −7% ~ −9%（中心 ≈ −8%）** | 同场 A/B |
| 分段 wave1 / wave2 / wave3 | **≈ −6.0%** / **≈ 0 ~ −2.8%** / **≈ −1.2%** | 同场 A/B，各段只对前一段 |
| `typescript.d.ts` | **≈ −14% ~ −16.7%** | 同场 A/B（BASE→M3） |
| `lib.dom.d.ts` | **≈ −6% ~ −8%** | 同场 A/B（BASE→M3） |
| `ours/ts-np` | **3.37× → 3.13×（−7%）** | `perf-vs-ts` 同场 |
| `ours/ts-par` | **2.52× → 2.355×** | `perf-vs-ts` 同场 |
| token 层占纯解析 CPU | **38.3% → 34.8%** | profile（M2 画像），非墙钟 |
| 语义等价 | xml **PASS 4504 / FAIL 0**，字节两侧 **34,109,694** | 门禁读数 |
| 跨进程 parse-perf | 586.5 → 521.6 ms（−11.07%） | **历史线，不与其它各行混用** |

---

## 0. 口径声明（读数字前必读）

### 0.1 三种口径，回答三个不同的问题

| 口径 | 是什么 | 能回答 | 不能回答 |
| --- | --- | --- | --- |
| **门禁读数** | `buffer-equivalence` / 六道门 / `xl_check` | 语义是否逐字节等价、有没有崩 | 快了多少 |
| **同场 A/B**（`buffer-ab` / `focused-ab`） | 同一进程内分别 `require` 两份 build，逐轮交替计时，取中位 | 两份 build 谁快、快多少 | 跨机器/跨进程的绝对耗时 |
| **profile**（`parse-perf` / CPU profile） | 跨进程墙钟或采样归因 | 时间花在哪个函数、占比怎么变 | 小幅度收益的判定（噪声大） |

**本文的规则**：收益一律用**同场 A/B**；份额/归因用 **profile**；等价用**门禁读数**。三者不互相换算、不相加。

### 0.2 三档可信度（每个数字都带档）

| 档 | 含义 | 本文里的例子 |
| --- | --- | --- |
| **已实测** | 同场 A/B 双口径（buffer-ab 与 focused）方向一致，且幅度大于 A/A 地板 | 累计 −7% ~ −9%；`typescript.d.ts` −14% ~ −16.7%；class 档 B 的 T=2000：488→7.11 ms |
| **区间估计** | 只有单口径或单次，幅度与噪声同量级，只能给方向与区间 | wave2 的 0 ~ −2.8%；`lib.webworker` −3% ~ −11% |
| **测不出** | A/A 地板大于信号，或计数上就没有东西可省 | `lib.es5.d.ts`；interface `CollectBodyMembers`；`ParsePrimaryType` 首字符分派 |

**不要把「测不出」写成收益**：标「测不出」的条目在 §3/§6 里明确写了 unmeasurable，
它们保留的理由是**可读性/一致性/减少代码**，不是墙钟。

### 0.3 口径说明：本文档里几处**刻意没有合并**的数字

这几处如果强行对齐就会得到自相矛盾的结论，所以按口径分开记，读的人不要把它们相加或互证。

1. **分段与累计不能相加。** wave1 ≈ −6.0%、wave2 ≈ −2.8%、wave3 ≈ −1.2%，三段相乘约 **−9.7%**，
   落在累计带（−7% ~ −9%）的外侧。原因：每段都是「对前一段」的小差值，单段幅度已接近 A/A 地板，
   偏置方向不固定。**累计只认同一场 BASE→M3 的 A/B**，分段只用于看「哪一波贡献大」。
2. **跨进程 `parse-perf` 不与同场 A/B 混用。** `parse-perf` 是**另起进程**各跑一次，同一条历史线上前后可比，
   但跨进程噪声 **±5–10%**；本轮记录里就有一个已知离群点（M2）。因此本报告**不复述、不引用**波次级 parse-perf 读数，
   §4.6 只保留 BASE→M3 那一条历史线并标明「不可与 §4.1 的 A/B 互证」。
3. **逐文件只取「双向一致档」。** `buffer-ab` 与 `focused-ab` 两份读数方向一致的才写进 §4.3 的区间；
   只在一份里出现的大差值（如小文件被单轮 GC 命中）不写。
4. **`perf-vs-ts` 的倍数不能跨文档混用。** 仓内 [`docs/perf-vs-ts.md`](perf-vs-ts.md) 记录的是它成文时的基线
   （`integration-buffer` tip `f5a525c3`）的 **8.5–9.0×**；本战役的 **3.37×** 是 M3 附近另一次同场重测。
   两者**不是同一时点**，本文只引用后者，并在此声明不要跨文档拿倍数做前后对比。
5. **`focused-ab.cjs` 未入库。** 它和 `count-probe.mjs` 等一样是分析阶段脚本，放在主仓工作树
   `tmp/perf-analysis/`（`tmp` 在 `.gitignore` 内）。所以「focused 31 轮 −7.4%」这条最常引用的读数
   **无法用本仓 commit 直接重跑**；复核用 §8 的 `buffer-ab --repeat 21/41`（同口径、同进程、只是轮数不同）。
6. **§5 的 `−98.4% / 62×` 与原始 ms 的直算有细微出入。** 按表里的原始 ms（488.0 → 7.11）直算是 **−98.5% / 68.6×**。
   本文**保留任务口径的结论档**（约 −98%、两个数量级、≥60×），原始 ms 原样列出以便复核；差异来自取整与采样轮次，
   不影响结论。
7. **§7 的 ms/pass 与百分比的分母是 profile 总时长，不是 §4.6 的 parse-perf 墙钟。**
   所以会出现「88 ms/pass 记作 17%，而 88/521.6≈16.9%」这种细节差；**不要拿 §7 的百分比去加 §4 的 A/B 百分比**。

---

## 1. 目标与用户批准的边界

### 1.1 目标

优化 **`typescript/tokens` 层**的解析耗时。判断标准是**测试**，不是某个自报数字：

- `buffer-equivalence --mode both`：两份 build 的 XML 与 digest 逐字节等价；
- 六道门（仓内口径，见 §8 实际列了 7 条命令）+ `xl_check` 0 error；
- 每条改动单独跑 A/B 看**方向**，幅度由独立合并者在空闲机上统一复测。

### 1.2 用户明确批准的范围

| 允许 | 不允许（未经单独批准） |
| --- | --- |
| `typescript/tokens/**` 内的局部、低风险优化 | `core/syntax/**` 的任何改动 |
| class 成员判定的 O(n²) 改造 | 装载期架构（178.8 ms / 328 模块那条轴） |
| 新增**门禁脚本**（如 `tests/bench/class-scaling.mjs`） | 改既有测试/期望值来「跑通」 |
| 推进集成分支 `opt/tokens-opt-integrated` | 改动主仓的 `opt/buffer-v2` |

**最终只推集成分支**，主仓 `opt/buffer-v2` 不动（它保持 `5751c651` 作为本战役的 BASE）。

### 1.3 一个例外：用户单独点名的 `core/syntax` 节流实验

用户后来**单独点名**了一个 `core/syntax` 的节流实验，分支 `opt/throttle-cps` @ **`fcc99a0a`**（基线 `7ae82328`，即 M2）。
结论：**不可行**（三条独立理由见 **§6.2**）。该实验**不合并**——默认 `ComputeInterval = 1`，只有 `XL_CPS_INTERVAL` 才打开，
集成分支上不含这段代码。

---

## 2. 流程（本轮的工程方法）

这套流程是这轮最有复用价值的部分：并行成员只写自己那一个文件，合并、计时、判断都由一个**独立合并者**做。

1. **每个成员一个独立 clone**：`C:\Users\Admin\Documents\GitHub\xl-example-set\<分支名，斜杠换连字符>`，
   从集成分支（或 BASE）开自己的分支，只允许改任务书 scope 内的文件。
   多人并行时「一人一个 worktree + 一人一个分支」把合并冲突降到「同一文件的语义冲突」。
2. **成员自己跑关键门禁**：等价必须 PASS 才允许 push；**等价不 PASS 不 push**。
3. **独立合并者**（不写业务代码）用 `--no-ff` 合并，**亲自重跑**全部门禁，并在**空闲机**上做权威计时。
4. **每轮回归守门**：合并 M2 之前先确认 M1 的收益没丢、等价没破；M3 同理。三轮分别是：

| 轮 | 合并 commit | 分支数 | 内容 |
| --- | --- | --- | --- |
| M1（wave1） | `0eee3830` | 5 | 标识符快路径、TextOf/Load、possible-scan、module-block、interface |
| M2（wave2） | `7ae82328` | 4 | primary 分派、class O(n²)、kinds（+fix）、NextChar |
| M3（wave3） | `c455d2b3` | 3 | class 门禁硬化 + 装饰器残余、b3numeric、b5stmt |

**硬规矩**：等价不 PASS 不 push；红灯不合并；每轮回归守门确认没回退前序 wave。
（本轮实际发生过一次「对抗语料抓出崩溃」——`opt/tokens-kinds` 未修复版有 11 条解析崩溃，
被 `opt/tokens-kinds-fix` 修掉后才合并，见 §3.2。这条规矩就是这么来的。）

---

## 3. 落地清单（分支 / 关键 commit / 一句话效果）

> 分支 tip 与合并 commit 都在 §9 的索引表里；本节只写「改了什么、效果是哪一档」。

### 3.1 wave1（M1 @ `0eee3830`）

| 分支 | 关键 commit | 改了什么 | 效果（档） |
| --- | --- | --- | --- |
| `opt/tokens-idfast` | `8d36cb5a` | `identifier-shape.FromBasicToken` 用 `HasBackslash` 做零分配快路径：无 `\` 时直接返回 `Temp`，不再逐字符解码 | 已实测。8 份 d.ts 每次 pass **74,571 次**调用、**0 个**含 `\`；省掉逐字符 `text[at]` + 建串 |
| `opt/tokens-textof` | `552517f3` + `30d7eb13` | `type-builder.TextOf` 加**单元级记忆化**；`Load` 的 `instanceof Symbol` 判定前面加 `Temp` 末字符预筛 | 已实测（合计计入 wave1）。**A3 预分配放弃**：`new Array(n)` 退化成 HOLEY_ELEMENTS，三轮 A/B **+1.12% / +0.64% / +3.23%**（是变慢） |
| `opt/tokens-possiblescan` | `5d3c9ac8` | property-signature 的 `Scan` 去掉 4 处重复初始化 + `MPU.TextOf` 单格记忆 | 已实测（计入 wave1） |
| `opt/tokens-moduleblock` | `413dadca` | `BuildMember` 的 `bracket.Data.indexOf` → **单调 Data 游标** + 失配回退 | 已实测；**`typescript.d.ts` 的主收益**（该文件有唯一超大 module body） |
| `opt/tokens-interface` | `529f2a04` | `CollectBodyMembers` 两遍扫描合一 | **测不出**（unmeasurable）。保留理由是少一遍扫描 + 删掉未使用的 `hasRawCode` |

### 3.2 wave2（M2 @ `7ae82328`）

| 分支 | 关键 commit | 改了什么 | 效果（档） |
| --- | --- | --- | --- |
| `opt/tokens-primary` | `24d0dcfb` | `ParsePrimaryType` 的 22 个 `===` 关键字判据 → `switch(text.charCodeAt(0))` | **测不出**；净 **−23 行**（可读性收益） |
| `opt/tokens-class` | `fb168c84` | class 成员判定 O(n²) → 增量；**新增门禁** `tests/bench/class-scaling.mjs` | 结构性（§5）：在 `.d.ts` 语料上 **0**，但在合成语料上 T=2000 **−98%** 量级 |
| `opt/tokens-kinds` → `opt/tokens-kinds-fix` | `78695d40` → **`2673f4ae`** | `Kinds` 改整型位掩码 + head 结论按成员缓存 | **对抗语料抓出未修复版的 11 条解析崩溃**（3+ 修饰词、构造/索引签名）；修复为「语义终局 + `PendingBit`」后 **374/374 逐字节一致**。先红后绿的典型 |
| `opt/tokens-nextchar` | `7377cfd9` | `StatementScanner.NextChar` 注释整段跳 + 全文单条缓存 | 已实测（该成员口径）：**1.4 → 0.42 ms/pass**；14,784 次调用零不一致 |

### 3.3 wave3（M3 @ `c455d2b3`）

| 分支 | 关键 commit | 改了什么 | 效果（档） |
| --- | --- | --- | --- |
| `opt/tokens-class2` | `4be412bf` + `5902a318` + `ee7ac736` | ①class 门禁**抗噪硬化**（15 轮逐轮交错配对、门限 **2.6 / 1.8**）；②装饰器长成员残余 O(L²) → **anchored 增量**；③semicolon 类成员候选 splice 后补 `UpdateItemStartAfterBuild`（与其余 8 个候选一致） | 结构性（§5）：装饰器 T=2000 **153.3 → 8.29 ms**；门禁从「抓不到」变成「稳定抓到」 |
| `opt/tokens-b3numeric` | `6506a0ee` | `TypeBuilder.LoadFrom` 去掉 `host.Data.slice`（该分支 10 个调用点）；numeric 经**计数判定**不做 | 已实测（计入 wave3）。numeric 被否证：见 §6 |
| `opt/tokens-b5stmt` | `f4dc9c4c` + `bba2d8a2` | `MemberPossibleScan` 放进 **Share 槽**跨成员复用（整体重置，含 `HeadSettled`）；statement 的 `code`/`codeAt` 放进 `StatementScan` **只追加** | 已实测（计入 wave3） |

---

## 4. 最终读数（以 A/B 为准）

### 4.1 累计（权威）

| 轮次/口径 | 读数 | 备注 |
| --- | --- | --- |
| focused 31 轮，正反向交叉 | **−7.4%** | 最稳的一条；`focused-ab.cjs` 是分析脚本，未入库（§0.3-5） |
| buffer-ab `--repeat 21` | **−6.84% / −7.34%** | 两次独立跑 |
| buffer-ab `--repeat 41` | **−8.0% ~ −8.4%** | 轮数最多 |
| **累计（取以上）** | **≈ −7% ~ −9%，中心 ≈ −8%** | 幅度由合并者在空闲机复测 |

### 4.2 分段（只用于看哪一波贡献大，**不可相加**，见 §0.3-1）

| wave | 合并点 | 相对前一段 | 档 |
| --- | --- | --- | --- |
| wave1 | M1 `0eee3830` | **≈ −6.0%** | 已实测 |
| wave2 | M2 `7ae82328` | **≈ 0 ~ −2.8%**（取 focused 的 −2.8%） | 区间估计 |
| wave3 | M3 `c455d2b3` | **≈ −1.2%** | 区间估计 |

> 读法：wave1 承担了大部分收益（标识符快路径 + module-block 游标都在这一波）；wave2/wave3 是**收尾**，
> 单段幅度已经接近噪声地板，只能给区间。

### 4.3 逐文件（BASE→M3，只取 buffer-ab/focused **双向一致**的档，见 §0.3-3）

| 文件 | 变化 | 档 | 说明 |
| --- | --- | --- | --- |
| `typescript.d.ts` | **≈ −14% ~ −16.7%** | 已实测 | 超大 module body，module-block 游标收益集中在这里 |
| `lib.dom.d.ts` | **≈ −6% ~ −8%** | 已实测 | 标识符数量最多（36,271 个） |
| `lib.webworker.d.ts` | ≈ −3% ~ −11% | 区间估计 | 双向一致但带宽大 |
| 其余小文件 | −3% ~ −6% | 区间估计 | 单文件抖动大，只看量级 |
| `lib.es5.d.ts` | **无可判定变化** | 测不出 | 该文件 A/A 地板就有 **±10–14%** |

### 4.4 与 TypeScript 官方解析器

| 指标 | 前 | 后 | 变化 | 口径 |
| --- | --- | --- | --- | --- |
| `ours/ts-np` | **3.37×** | **3.13×** | **−7%** | `perf-vs-ts` 同场（`setParentNodes:false`） |
| `ours/ts-par` | **2.52×** | **2.355×** | ≈ −6.6% | `perf-vs-ts` 同场（`setParentNodes:true`） |

> **产物不同**：`ours` 只到 shape 树（不含 AST 投影），`ts-np` 是 TS AST。倍数只作**量级参照**，
> 不能当等价实现的比值用。且不要与 [`docs/perf-vs-ts.md`](perf-vs-ts.md) 里的 8.5–9.0× 混用（§0.3-4）。

### 4.5 token 层占纯解析 CPU（profile 口径，非墙钟）

| 指标 | 前 | 后 | 口径 |
| --- | --- | --- | --- |
| token 层占纯解析 CPU | **38.3%** | **34.8%** | profile（M2 画像） |
| 纯解析 profile ms | 2,176 | 2,078 | profile（M2 画像） |
| GC 份额 | 7.1% | 7.1% | 不变 |

> 这是**采样归因**，不是墙钟。token 层份额降了，说明这轮挖对了地方；但墙钟收益要看 §4.1，
> 两者不能互相换算（profile ms 与 parse-perf 墙钟不同源，见 §0.3-7）。

### 4.6 跨进程 `parse-perf`（历史线，**不与 A/B 混用**）

| 项 | 值 |
| --- | --- |
| 命令 | `node tests/bench/parse-perf.mjs --dts 8 --repeat 5` |
| buffer-v2（BASE） | **586.5 ms** |
| M3 | **521.6 ms** |
| 差值 | **−11.07%** |
| 噪声 | 跨进程 **±5–10%**；本轮另有一个已知离群点（M2） |
| 用途 | **只作历史线**：同一条线上前后可比；**不可**与 §4.1 的 −8% 互证，也不可相加 |

> 为什么单列：这是本文最容易误用的一条。−11.07% 比同场 A/B 的中心 −8% 大，看上去像是「A/B 低估了」，
> 但两者是**不同的测量**（跨进程 vs 同进程交替），差值落在跨进程噪声里。**判断收益只认同场 A/B。**

---

## 5. class O(n²) 专项（本轮唯一的结构性成果）

### 5.1 问题是什么

`ClassMemberPossibleUtil.Scan` 原先对**每个 token** 都做 `ItemUtil.ItemStart` 倒扫、并从 Start 开始
**重建整个 `code` 数组**；`Analyze` 每轮还要 `AngleDepth` + `FindMemberBoundary` **全量重扫** ——
于是**单个成员内是 O(L²)**（L = 成员长度），整体随成员长度平方增长。

**为什么既有门禁抓不到**：`.d.ts` 语料里几乎没 class（8 份里 **2,954 interface / 10 class / 0 装饰器成员**），
所有既有门禁在这条路径上都是「很快、很干净」。所以这轮**先补门禁**（`tests/bench/class-scaling.mjs`），再修。

### 5.2 修前 / 修后标度（档 B：单成员长度 T，单位 ms）

| T（成员长度） | 修前 class ms | 修后 class ms | 修后 class/interface |
| --- | ---: | ---: | ---: |
| 250 | 7.62 | 1.72 | 1.42× |
| 500 | 29.15 | 2.37 | 0.91× |
| 1000 | 120.3 | 5.56 | 1.13× |
| 2000 | **488.0** | **7.11** | 1.21× |

- **修前**：相邻档翻倍耗时倍数 **×3.83 / ×4.13 / ×4.06**（超线性，二次形态）；class/interface 从 **6.2×** 一路涨到 **74.3×**。
- **修后**：结构断言 class ≤ interface **×1.8** 全部成立（1.42 / 0.91 / 1.13 / 1.21）；相邻档倍数回落到线性量级。
- **T=2000 单档**：**488.0 → 7.11 ms**，任务口径记 **−98.4%（62×）**。
  > 口径提示：按上表原始 ms 直算是 **−98.5% / 68.6×**，与任务口径有取整/轮次差异，结论档不变 —— 见 §0.3-6。

### 5.3 装饰器长成员的残余 O(L²)（wave3 补）

修完 class 成员边界后，**装饰器长成员**还剩一段二次项（成员边界被 anchored 之前每轮重算）。

| T（成员长度） | 修前 ms | 修后 ms | 变化 |
| --- | ---: | ---: | ---: |
| 2000 | **153.3** | **8.29** | **−94.6%（18.5×）** |

修后与**同规模非装饰器成员**同量级 —— 说明残余二次项被清掉了，不是换了个常数。

### 5.4 门禁硬化：从「抓不到」到「稳定抓到」

抗噪硬化的做法：**15 轮逐轮交错配对采样**，门限 **2.6**（相邻档翻倍倍数）/ **1.8**（class ÷ interface）。

| 被测 build | 结果 |
| --- | --- |
| **M3 build** | **10/10 PASS** |
| 改前 M1 build（class 全量重扫那版） | **10/10 FAIL（每次 10 项）** |
| 改前 M2 build（装饰器残余那版） | **10/10 FAIL（每次 3 项，全为装饰器档）** |

> 这条门禁的**回归验证**是「拿改前产物跑必须稳定 FAIL」。它现在能区分二次形态与线性形态，
> 且不会因为单轮抖动误报（旧版 flaky 的根源就是单轮采样）。

### 5.5 边界：这些收益在**当前语料上是 0**

必须写清楚，否则会误以为这轮墙钟里有一块来自 class：

- 8 份 `.d.ts` 里 **10 个 class、0 个装饰器成员** → §5.2–5.3 的收益在**当前语料上计为 0**；
- 它的价值：①消除**潜伏的**二次复杂度（真实 `.ts` 工程里 class 密集时才会显形）；
  ②装上一条**能抓到它**的门禁，以后谁再把增量改回全量重扫，CI 会红。
- 所以本轮累计 −8% **不含** class 专项的贡献。

---

## 6. 否证 / 不做清单

同样重要：这些是**已经花过时间、有读数支撑**的结论，避免后来人重复踩。

### 6.1 汇总（6 项）

| # | 候选 | 读数 / 理由 | 结论 |
| --- | --- | --- | --- |
| 1 | **A3：`Load` 预分配**（`new Array(n)` 代替逐 push） | V8 里预分配会退化成 **HOLEY_ELEMENTS**，比 packed 更慢；三轮 A/B **+1.12% / +0.64% / +3.23%**（变慢） | **否决**（实测） |
| 2 | **numeric-literal** 优化 | 4,777 次/pass × 577 ns ≈ **2.76 ms/pass** 总量看着可观，但**可安全移除的部分只有 0.1–0.3 ms/pass**，低于 **0.3** 门槛 | **不做**（计数判定） |
| 3 | `IsDefinitelyBodyBracket` 的 O(n²) 嫌疑 | 它扫的是 **interface 自己的头部 `Data`**（mean **9** 条、每次 **3.32** 个元素），与体大小**无关**，总量线性于接口数；占比 **0.13–0.33%** | **不是 O(n²)，不改**（证伪） |
| 4 | `ParseTypeMember` 540 行重构；`TypeBuilder` 彻底持 Data 视图；`ExpressionBuilder`/`StatementBuilder` 的 Load 去切片；`ClassDeclarationShape.BuildMemberFromCode` 改签名 | 收益/风险不划算，或需要改公共签名（跨文件，属「重大变更」） | **不做** |
| 5 | 「减分配换墙钟」 | 本仓已**两次**实测否决（分配 **−25% → 墙钟 0**） | **否决**（实测） |
| 6 | 装载期 **178.8 ms / 328 模块** | 属**独立轴**（模板装载），不在本轮 `typescript/tokens` 范围 | **不做**（超范围） |

> 另外 §0.3-4 的 `perf-vs-ts` 倍数、§3 里标「测不出」的两项（interface 两遍扫描合一、primary 首字符分派）
> 也属于「做了、但别当成墙钟收益」的范畴。

### 6.2 专项：`ComputePossibleShapes` 节流实验（用户点名，**结论：不可行**）

用户单独点名了这个 `core/syntax` 实验：分支 `opt/throttle-cps` @ **`fcc99a0a`**（基线 `7ae82328` / M2）。
它**不进集成分支**：默认 `ComputeInterval = 1`，只有 `XL_CPS_INTERVAL` 才打开。
本节完整记录结论——「省调用次数」这个方向以后还会有人想到，而它在这里是**错的方向**。

#### 6.2.1 为什么不能跳过：调用链决定「当前字符归谁消费」

```
Token.TryToClose
  → basic token 的 Close（core/syntax/basic-tokens/{symbol,bracket,common,string}.xl.md）
    → parent.ComputePossibleShapes(context)
      → UnitToken.ComputePossibleShapes
        → CatalogGuide.ComputePossibleShapesByIndex
返回值：ComputingStates.Built → CloseStates.Built → BranchStates.Reload
```

关键在最后一步：`Reload` **决定「当前字符归谁消费」**。所以「少调一次」不是「算晚一点」，
而是**改变消费流**——跳过调用 = 让本来该被收进子形状的 token 以 raw 落进 `Data`。
这不是性能取舍，是语义变更；也正因如此，它在 §6.2.2 的等价扫描里**必然破等价**（而不是「偶尔差一点」）。

#### 6.2.2 等价扫描（核心证据）

| N（跳过的间隔） | 破坏文件数 | 备注 |
| --- | ---: | --- |
| **1（控制）** | **0** | 与基线全语料一致（证明实验装置本身没改语义） |
| **2** | **58** | 官方 `buffer-equivalence`：**PASS 4451 / FAIL 10 / ERROR 48 / 同错 47**（4,556 文件） |
| 4 | 678 | 同口径 XML 扫描器（4,556 文件） |
| 8 | 722 | 同上 |
| 16 | 723 | 同上；**N≥4 后饱和** |

读法：
- **N=1 干净** → 装置本身正确（默认关掉时与基线逐字节一致）；
- **N=2 就破 58 个文件** → 不是「调得不够少」的精度问题，而是**一开始就错**；
- **N≥4 后失败数饱和（678 → 722 → 723）** → 错法是系统性的，不是随机抖动，加码也救不回来。

#### 6.2.3 两个最小反例（附机制）

| 反例 | 触发 | 现象 | 机制 |
| --- | --- | --- | --- |
| `import a from "m";`（73 B） | N≥2 | 抛 `ImportDeclarationShape.Close: 缺少模块说明符` | 跳过让 `from` 与字符串**以 raw 落进 `Data`**，而 `Close` 要求子形状齐全 |
| `interface I { a: A; }` | N=4 | XML 直接多出 raw token | 成员没在 **token 关闭时**建出；**容器收口不会补建**，raw 就留在那里 |

第二个反例值得特别注意：它说明「晚一点建」并**不等价于**「收口时再统一建」——
**容器收口不补建**，所以错过「token 关闭」这个时机就没有第二次机会。这是 §6.2.1 那条调用链的具体形态。

#### 6.2.4 经济性：即使只看能跑完的 N=2，也是负收益

| 指标 | 基线（N=1） | N=2 节流 | 变化 |
| --- | ---: | ---: | ---: |
| 目录实跑调用次数 | **518,680** | **414,070** | **−20.2%** |
| 单文件 parse 中位 | **16.2 ms** | **20.3 ms** | **+25.8%** |

调用次数确实降了 20.2%，但墙钟**反而慢 25.8%**。原因：每次关闭都要多付
「白名单字符扫描 + `.size` + 计数」的**固定开销**，而**可跳过的那些调用本来就很便宜**；
真正值得跳的恰恰是**白名单命中的**——也就是唯一不能跳的。节流在这里收的是「便宜的那部分」，
成本却付在「每一次」上。

#### 6.2.5 结论与启示

- **结论：节流在当前语义下不可行。** 三条独立理由（互相不依赖，任一条单独成立即可否决）：
  1. **语义不可动**：调用链的返回值决定消费流（§6.2.1）；
  2. **等价不可守**：N=2 即破 58 个文件，N≥4 饱和（§6.2.2），最小反例两条（§6.2.3）；
  3. **经济性为负**：即使只看能跑完的 N=2，也慢 25.8%（§6.2.4）。
- **启示**：要省的从来不是「调用次数」，而是**每次调用里候选的固定开销**——那是 candidates 层 / 缓存层的事。
  这也正好解释了 wave1–3 的收益来源：**每个候选自身趋近 O(1)**（`GetState` 增量、Share 槽复用、head 缓存），
  而不是「少调几次」。§6.1 的 #3（`IsDefinitelyBodyBracket` 证伪）是同一道理的另一面：
  判断一个热点值不值得改，先看它**总量**是不是「次数 × 有下界的单价」，而不是只看次数。

---

## 7. 剩余空间（下一步若要继续）

### 7.1 token 层：已见底

剩余候选**各自 <0.3%/pass**，都在 §6 的门槛以下。继续在 `typescript/tokens` 里抠，投入产出已经不成立。

### 7.2 大头在 `core/**` —— **需用户单独批准**

| 热点 | 量 | 占纯解析 profile 比 | 口径 |
| --- | ---: | ---: | --- |
| `Token`/`BlockToken`/`UnitToken` 构造 | **≈ 88 ms/pass** | ≈ **17%** | profile |
| `BasicDispatch` | **≈ 41 ms/pass** | ≈ **7.6%** | profile |
| `CatalogGuide` 三个函数 | **≈ 34 ms/pass** | ≈ **6.3%** | profile |
| GC | **≈ 38 ms/pass** | ≈ **7.1%** | profile |

> 份额的分母是 profile 总时长，不是 parse-perf 墙钟（§0.3-7）。这四项合计约占纯解析 CPU 的 **38%**，
> 是 token 层见底后唯一的量级来源。**但 `core/syntax` 在本轮是明确禁改区**（§1.2），要动必须用户单独批准。

### 7.3 用户点名的节流实验：已做，结论**不可行**

分支 `opt/throttle-cps`（`ComputePossibleShapes` 节流）@ `fcc99a0a`。**实验完毕，结论：不可行**（三条独立理由见 §6.2）。
实验代码**不合并**（默认 `ComputeInterval = 1`，只有 `XL_CPS_INTERVAL` 打开）。

这条也反过来支持 §7.1 的判断：**再往 `core/syntax` 走，方向不该是「少调几次」**，
而是压每次调用的固定开销（构造、`BasicDispatch`、`CatalogGuide` 的单价），那才是 §7.2 里那 38%。

---

## 8. 复现

### 8.1 前置

- Node **≥ 22.3**（`package.json` 的 `engines`）；
- 构建工具 `xl`：在 agent harness 里是 `xl_build` 工具；在本仓 `package.json` 里是 `xl` CLI，对应 `npm run build`（`xl build && tsc`）。
- 工作树建议按 §2 的方式独立 clone，避免与其他分支的 `build/` 互相污染。

### 8.2 生成 + 编译 + 基线快照（**A/B 的前提**）

```powershell
$repo = "C:\Users\Admin\Documents\GitHub\xl-example"          # 只读事实来源
$wt   = "C:\Users\Admin\Documents\GitHub\xl-example-set\opt-tokens-campaign-doc"
git clone $repo $wt
cd $wt
git checkout -b my/branch origin/opt/tokens-opt-integrated
Copy-Item -Recurse "$repo\node_modules" .\node_modules

# 规范 → dist/ts/**/*.ts
xl build                       # 或 harness 里的 xl_build(paths=["core","typescript"], targets=["ts"])
# dist/ts → build/ts/**/*.js
node node_modules\typescript\lib\tsc.js -p tsconfig.json

# 基线快照（比较的对象永远是「改之前」的 build）
Copy-Item -Recurse build build-base
```

期望：`xl build` **0 error**（warning 数量在 2,440 左右是既有噪声，不是本轮引入的）；
`tsc` **0 error**。

### 8.3 语义等价（**最强门禁，必须 PASS**）

```powershell
node tests\bench\buffer-equivalence.mjs --mode both --base build-base --new build
```

期望形态（本轮实测）：**xml PASS 4504 / FAIL 0 / ERROR 0 / 同错 52**，字节 基线 **34,109,694** / 实验 **34,109,694**；
digest 同 PASS/FAIL，token 两侧均 **797,790**。**不等价就不许 push。**

### 8.4 门禁

仓内 PLAYBOOK 称「六道门」，实际列出的是下面 **7 条命令 + `xl_check`**（本报告按实际列出）：

```powershell
node tests\parse\validate.mjs                 # 1719 条用例 / 0 条不合格
node typescript\cases\ast-json.mjs            # 6167 个构造 / cj-fail 0
node typescript\cases\ast-json-diff.mjs       # 6167/6167 完全一致，结构/位置/字段差 0
node typescript\cases\real-dts-ast.mjs        # 226 文件：成功 226 / 崩溃 0 / AST 一致 226
node typescript\cases\token-ast.mjs --quiet   # total 1715 / ok 1705 / crash 0 / diff 0 / ts-invalid 10
node tests\body-guide\harness.mjs --all       # 35+25+23+16+10 = 109 / 109
node tests\cache-share\check.mjs              # 7 / 7
# xl_check：paths=["core","typescript"], targets=["ts"] → 0 error（warning ~2439）
```

> `samples/check.mjs` 在当前 HEAD **跑不起来**（`cjcli.xl.md` 还依赖已删除的 `dawn/**`），**不要**把它当门禁，
> 也不要为了它改代码。

### 8.5 性能（**同场 A/B，判断收益只认这一节**）

```powershell
# 跨进程历史线（只作参考，不要当收益）
node tests\bench\parse-perf.mjs --dts 8 --repeat 5

# 同场 A/B：同进程内交替计时，取中位
node tests\bench\buffer-ab.mjs --repeat 21 --dts 8 --base build-base --new build

# A/A 地板：把基线再拷一份当实验组，用同一命令跑 —— 这是「噪声有多大」的唯一诚实的答案
Copy-Item -Recurse build-base build-aa
node tests\bench\buffer-ab.mjs --repeat 21 --dts 8 --base build-base --new build-aa

# 聚焦 A/B（更灵敏：两份产物对拷 + 逐轮换序；脚本未入库，见 §0.3-5）
Copy-Item "$repo\tmp\perf-analysis\focused-ab.cjs" .\tmp\
$env:AB_BASE="build-base"; $env:AB_EXP="build"
node tmp\focused-ab.cjs lib.dom.d.ts typescript.d.ts lib.es5.d.ts
```

**判读规则**：
- 先看 **A/A 地板**。若改动 Δ 与 A/A Δ 同量级，就是**测不出**（不代表没用，见 §0.2）；
- 逐文件中位之和与每轮合计中位**两个口径方向一致**才算数；
- 小文件（`lib.es5.d.ts`）的单文件读数不可判定（A/A 地板 ±10–14%）。

### 8.6 class 标度门禁

```powershell
# 只跑标度（测 ./build）
node tests\bench\class-scaling.mjs
# 额外做 XML 等价 + 改前/改后 ms 对照（需先把一份改前产物拷成 build-class-before）
node tests\bench\class-scaling.mjs --base build-class-before
# 抗噪硬化后的采样参数
node tests\bench\class-scaling.mjs --rounds 15 --warmup 2 --json
```

判据：相邻档翻倍耗时 ≤ **2.6**、每档 class ≤ interface **×1.8**。
**回归验证**：拿改前产物（class 全量重扫那版）跑必须**稳定 FAIL**（实测 10/10）——这是这条门禁「真的能抓」的证据。

### 8.7 与 TypeScript 对照

```powershell
node tests\bench\perf-vs-ts.mjs                 # 默认 8 份最大 .d.ts
node tests\bench\perf-vs-ts.mjs --corpus        # 全部 226 份
node tests\bench\perf-vs-ts.mjs --repeat 7 --json
```

> 倍数只作量级参照（产物不同，§4.4）；且**同一份文档内**前后对比，不要跨文档拿倍数比（§0.3-4）。

---

## 9. 分支与 commit 索引表

> 全部 commit 均已在 `opt/tokens-opt-integrated` 的祖先里验证存在。按 wave 分组，**合并顺序即表内顺序**。

| wave | 分支 | 分支 tip | 落地 commit | 合并 commit | 一句话效果 |
| --- | --- | --- | --- | --- | --- |
| 1 | `opt/tokens-idfast` | `8d36cb5a` | `8d36cb5a` | `0b18c0fe` | 标识符零分配快路径（74,571 次/pass、0 个含 `\`） |
| 1 | `opt/tokens-textof` | `30d7eb13` | `552517f3`, `30d7eb13` | `aeb14fc2` | `TextOf` 单元级记忆化 + `Load` 末字符预筛（A3 预分配放弃） |
| 1 | `opt/tokens-possiblescan` | `5d3c9ac8` | `5d3c9ac8` | `6074e6a6` | `Scan` 去 4 处重复初始化 + `MPU.TextOf` 记忆化 |
| 1 | `opt/tokens-moduleblock` | `413dadca` | `413dadca` | `c43b28c1` | `Data.indexOf` → 单调游标（`typescript.d.ts` 主收益） |
| 1 | `opt/tokens-interface` | `529f2a04` | `529f2a04` | `0eee3830` | 两遍扫描合一（测不出） |
| **M1** | — | — | — | **`0eee3830`** | **wave1 合并点** |
| 2 | `opt/tokens-primary` | `24d0dcfb` | `24d0dcfb` | `f73797d2` | 22 个 `===` → 首字符 `switch`（测不出，净 −23 行） |
| 2 | `opt/tokens-class` | `fb168c84` | `fb168c84` | `7955ecef` | class 成员判定 O(L²) → 增量 + 新增标度门禁 |
| 2 | `opt/tokens-kinds-fix` | `2673f4ae` | `78695d40`, `2673f4ae` | `c7f41f85` | `Kinds` 位掩码 + head 缓存；修复 11 条崩溃后 374/374 一致 |
| 2 | `opt/tokens-nextchar` | `7377cfd9` | `7377cfd9` | `7ae82328` | `NextChar` 注释整段跳（1.4 → 0.42 ms/pass） |
| **M2** | — | — | — | **`7ae82328`** | **wave2 合并点** |
| 3 | `opt/tokens-class2` | `ee7ac736` | `4be412bf`, `5902a318`, `ee7ac736` | `b1b7db87` | 门禁抗噪硬化 + 装饰器残余 O(L²) + semicolon 候选一致性 |
| 3 | `opt/tokens-b3numeric` | `6506a0ee` | `6506a0ee` | `2483dc44` | `LoadFrom` 去 `host.Data.slice`；numeric 计数判定不做 |
| 3 | `opt/tokens-b5stmt` | `bba2d8a2` | `f4dc9c4c`, `bba2d8a2` | `c455d2b3` | `MemberPossibleScan` Share 槽复用 + statement `code` 增量 |
| **M3** | — | — | — | **`c455d2b3`** | **wave3 合并点 / 本轮最终基线** |

**补充说明**

- `opt/tokens-kinds`（`78695d40`）保留为历史分支：它的内容被 `opt/tokens-kinds-fix`（`2673f4ae`）修正后
  才合并，合并信息里写的是 `opt/tokens-kinds-fix`。
- BASE = 主仓 `opt/buffer-v2` @ **`5751c651`**（本战役未改动它）。
- 本轮共 **12 个分支（13 个分支名）/ 17 个落地 commit**（不含合并 commit）。
- **未合并且不计入上表**的实验分支见 §9.1。

### 9.1 未合并的实验分支（不计入上表，也不在集成分支祖先里）

| 分支 | 分支 tip | 基线 | 状态 | 说明 |
| --- | --- | --- | --- | --- |
| `opt/throttle-cps` | `fcc99a0a` | `7ae82328`（M2） | **实验，不合并** | `ComputePossibleShapes` 按间隔节流；结论**不可行**（§6.2）。默认 `ComputeInterval = 1`，只有 `XL_CPS_INTERVAL` 才打开 |
