# opt/buffer-v2 之后的性能分析：还剩什么可做

STATUS: **分析完成（无代码改动）** — 在 `7e8bf943`（四项优化合并后的 v2）上重做 profile、
取调用计数、并对三个候选做**端到端实测**。结论是：**v2 已接近局部最优**，
剩下的大头是**结构性的**（每字符驱动循环 + 分派探针链），
微优化大多落在测量噪声里（`parse-perf` 单跑波动约 ±3%）。

本文所有数字都可复现：profile 命令、计数命令、微基准脚本见 §7。

---

## 1. 现在的钱花在哪（HEAD `7e8bf943`，8 份 d.ts，`--cpu-prof`）

按**函数名**聚合 self time（V8 会把同一函数拆成多个 node，必须聚合后再看）：

| self | 函数 | 位置 |
|------|------|------|
| **14.78%** | `Process` | `core/syntax/unit-token.js:34` |
| **13.21%** | `Transit` | `core/syntax/templates/basic-dispatch.js:20` |
| 5.17% | *(GC)* | — |
| 4.25% | `Transit` | `core/syntax/basic-tokens/common.js:444` |
| 3.26% | `BlockToken`（ctor） | `core/syntax/block-token.js:13` |
| 3.08% | `ComputePossibleShapesByIndex` | `core/syntax/catalog-guide.js:25` |
| 2.61% | `ExitOrPre` | `core/syntax/basic-tokens/area-annotation.js:54` |
| 2.52% | `Token`（ctor） | `core/syntax/token.js:10` |
| 2.44% | `UnitToken`（ctor） | `core/syntax/unit-token.js:28` |
| 2.33% | `IsAppend` | `core/syntax/basic-tokens/common.js:18` |
| 1.99% | `ExitOrPre` | `core/syntax/basic-tokens/bracket.js:53` |
| 1.73% | `Transit` | `core/syntax/basic-tokens/wrap-symbol.js:23` |
| 1.38% | `AppendAndSignOut` | `core/syntax/block-token.js:19` |
| 1.23% | `ParsePrimaryType` | `typescript/tokens/types/type-builder.js:499` |
| 1.01% | `IsUnicodeEscapeStart` | `core/syntax/basic-tokens/common.js:44` |

模块聚合：`core/syntax` 46.9%、`typescript/tokens` 21.4%、`core/basic-tokens` 18.2%、GC 5.2%。
（`internalModuleStat` 1.08% 是 bench 自身 require，不是解析。）

**怎么读**：O4 把「十条分派」合成一条之后，`BasicDispatch.Transit` 自己成了第二大项，
`Process` 仍是第一。两者合计 **28%**，而 GC + 三个构造函数合计 **13.4%** —— 也就是
**「每字符走一遍驱动循环 + 建对象 + 回收」占掉四成**。

---

## 2. 调用计数：热路径到底被调了多少次（8 份 d.ts，4,067,441 字符）

| 次数 | 每字符 | 调用 |
|------|--------|------|
| 17,309,917 | 4.26 | `SourceRange.Has` |
| 13,265,059 | 3.26 | `SourceRange.At` |
| 2,395,796 | **0.59** | `AreaAnnotation.Default` |
| 1,628,920 | 0.40 | `BasicDispatch.Transit` |
| 1,610,268 | 0.40 | `BlockToken.SignOut` |
| 1,132,850 | 0.28 | `Common.Transit` |
| 1,013,726 | 0.25 | `Common.IsAppend` |
| 533,951 | 0.13 | `UnitToken.Process` |
| 435,737 | 0.11 | `PossibleShapeCache.GetState` |

两条最有信息量的：

1. **`AreaAnnotation.Default` 每字符 0.59 次** —— 语料里 **59% 的字符位于块注释内**，
   每个这样的字符做一次 `this.Tmp += buffer.At(index)`（见 §4.1 实测：这**没有**想象中贵）。
2. **`At` 3.26 次/字符、`Has` 4.26 次/字符** —— 其中 13.27M 次 `Has` 来自 `At` 内部的守卫，
   剩下的约 4.05M 是调用点自己先 `Has` 再 `At`（`At` 里又查一次 `Has`）。

---

## 3. 单次操作成本（微基准，本机实测）

| 操作 | ns/次 | 对照 | ns/次 |
|------|-------|------|-------|
| `range.At(i)`（含 Has 守卫） | **5.15** | `doc.GetValue(i)` 直接取 | **1.77** |
| `range.Has(i)` | 1.59 | — | — |
| `s += ch`（逐字符拼接） | **30.78** | `substring(start,end)` 一次 | 0.0012 |
| `array.push(ch)` 累积 | 41.91 | — | — |
| `"\"'`".includes(ch)`（String） | 9.62 | 码点表查询 | 3.94 |
| `x instanceof WrapSymbol`（多态） | 5.44 | 布尔字段 `x.IsWrapSymbol` | 5.89 |
| `new SourceRange()` | 6.38 | `new []` | 22.28 |

---

## 4. 三个候选的**端到端实测**（都做了，两个是负结果）

### 4.1 注释文本逐字符累积 —— 实测**没有收益**（负结果）

想法：把 `AreaAnnotation.Default` 的 `this.Tmp += buffer.At(index)` 换成块缓冲（每 256 字符 join 一次）。
理由：59% 的字符走这条路，微基准说逐字符拼接 30.78 ns/次。

| 变体 | `parse-perf --dts 8 --repeat 3` TOTAL | 相对基线 |
|------|--------------------------------------|----------|
| 基线（未改） | 1072.7 ms（另一次 1073.4） | — |
| 每 256 字符 join（语义等价） | **1092.8 ms** | **更慢** |
| `Default` 直接空转 + 关闭时 `GetRaw(start,end)` 一次切片（**上界实验，不等价**） | 1040.4 ms | −3.0% |

结论：**上界只有 3%，而且这 3% 落在噪声里**（见 §5）。原因：`Tmp` 是实例字段上的连续追加，
V8 走的是 ConsString 路径，成本远低于微基准里"每字符新建字符串"的写法；
而块缓冲反而多了 push + 边界判断 + join。**该方向不值得做**，除非先解决噪声问题。

### 4.2 `includes` → 码点表 —— **前提不成立**（负结果）

profile 的行级热点把 `template.BomChars.includes(value)` 和
`template.StringTemplate.Quotes.includes(value)` 标成热点，我按"String.includes 9.62 ns"去优化。
实测发现：**两者都是数组**（`BomChars = ["\uFEFF","\uFFFE"]`、`Quotes = ['"', "'", "`"]`），
走的是 `Array.prototype.includes`（2~3 元素线性扫），不是 `String.includes`。
按表改写会让 `value.charCodeAt` 在数组上抛 `TypeError`（`s.charCodeAt is not a function`）。
**该方向作废**；行级热点归因于 `template` 链式属性加载（`template.StringTemplate.Quotes` 两次加载）。

### 4.3 `At` 的守卫 —— 估算 **~2%**，未端到端验证

`At(i)` = `Has(i)` + `GetValue(i)`，实测 5.15 ns vs 1.77 ns。
13.27M 次 `At` 里，若把"已知在界内"的调用点改成直接 `GetValue`，理论上省
`13.27M × (5.15−1.77) ≈ 45 ms`（≈ 4%）；
但守卫是 `E_SOURCE_RANGE_OUT_OF_RANGE` 的唯一来源，且调用点分散在几十处 `.xl.md` 里。
**现实口径 ~2%**，风险是"哪一处真的可能越界"要逐点证明，收益配不上代价。

---

## 5. 测量噪声：任何 <3% 的改动都不该用单跑结论

同一份未改动的 build，`parse-perf --dts 8 --repeat 3` 的 TOTAL 三次读数：
**1073.4 / 1072.7 / 1042.9 ms**（≈ ±1.5%，极差 3%）。
`buffer-ab.mjs --repeat 7` 两轮交替的基线漂移在 `docs/opt-cache-slot.md` 也记录过同款现象。

所以：**候选改动必须走 `buffer-ab --repeat 7` 两轮交替**，并且两轮同向才算数；
单跑 `parse-perf` 只能看"有没有爆炸"，看不出 1~2%。

---

## 6. 建议（按性价比排序）

### P1（推荐，结构性的、收益最大）：把分派探针链换成"字符类表"
`BasicDispatch.Transit` 13.21%，1.63M 次调用，每次要依次探：
`BomChars.includes` → `value === marker[0]` → `preIndex` 的 `Has`/`At` → `Quotes.includes`
→ 三个括号 `===` → `IsWhiteSpace(...)` → …。
每次调用约 175 ns（2 遍/8 文件口径），而它做的事只是"这个字符归谁"。

做法：在 template 上预建一张 128（或 65536）项的表，把**首字符 → 分派类别**一次查表得到，
再用 `switch` 直接进对应分支；只有"类别为 Common"时才落到原来那条慢链。
这是 O4「十 → 一」的下一步（**一 → 表**），语义是纯粹的"同一套判定，换一种查找结构"。
预估 **+3~6%**，风险中等（判定顺序必须逐条保住），验证靠等价 0 FAIL + 全门禁。

### P2（推荐，收益确定、风险低）：`ComputePossibleShapesByIndex` 的候选集迭代
3.08%（133 ms），69,267 次调用。内层 `for (const index of this.Candidates)` 走 `Set` 迭代，
每次还要 `PossibleShapes[index].ComputeByIndex(...)` 虚调用；候选集收敛到 1 个之后仍在迭代集合。
做法：把 `Set` 换成数组 + 原地压缩（写指针），并对 `size === 1` 的常见情形短路。
预估 **+1~2%**，风险低（纯容器替换）。

### P3（可选，收益中等、风险高）：每字符驱动循环与挂载链
`Process` 14.78% + `SourceFileShape.Process` 0.94%。每个字符要重新走
`parent.MountedUnit !== this` 守卫、`mountedUnit.Process(...)` 递归下钻、再逐层回填 `LastIndex`。
嵌套深时，一个字符会把整条挂载链走一遍。
做法：在驱动层维护"当前最内层单元"指针（或 `Process` 入口先 trampoline 到最深挂载单元），
把逐层下钻压成一次跳转。预估 **+4~8%**，但这是架构级改动，
必须单独一支 + 全量等价 + 六门禁，不能和别的改动混在一个 commit 里。

### P4（可选，收益确定但小）：对象分配
三个构造函数合计 8.22%，GC 5.17%（≈13.4%）。每个 token 至少 3 个对象
（`Token` + `SourceRange` + `Data[]`），lib.dom 一个文件约 100 万对象。
可做的：`Data` 懒建（无子节点时不分配）、`SourceRange` 懒建（`SignIn` 时再建）。
预估 **+2~4%**，风险中等（`Data`/`SourceRange` 的判空语义遍布全代码，容易引入 `null` 分支）。

### 不做
- **`instanceof` → 布尔字段**：实测 5.44 ns vs 5.89 ns，**字段反而更慢**（多态加载）。
  `last instanceof WrapSymbol` 那条热点不该动。
- **`includes` → 码点表**：前提不成立（是数组不是字符串），见 §4.2。
- **注释文本改成切片**：上界 3%，落在噪声里，见 §4.1。

---

## 7. 复现

```powershell
cd opt-final

# profile + 函数聚合
node --cpu-prof --cpu-prof-dir=tmp/prof tests/bench/parse-perf.mjs --dts 8 --repeat 2
node tests/bench/prof-summary.mjs tmp/prof/<file>.cpuprofile --top 35

# 调用计数（8 份 d.ts）
node tests/bench/dts-cost-probe.mjs --count --files 8 > tmp/count8.json

# 端到端（注意噪声，见 §5）
node tests/bench/parse-perf.mjs --dts 8 --repeat 3
node tests/bench/buffer-ab.mjs --base build-v1 --new build --repeat 7
```

**关于微基准脚本**：§3/§4 的微基准是本次分析的临时脚本（放在 `tmp/`，`tmp/` 已 gitignore，**未入库**），
它们只做三件事：`range.At(i)` vs `doc.GetValue(i)`、`s += ch` vs `substring`、
`includes` vs 码点表 / `instanceof` vs 布尔字段。要复现只需对 `build/ts` 的对应类
`require` 出来跑一个 N 次循环——不依赖任何框架。

§4.1/§4.2 的补丁实验是**直接改 `build/`（gitignored，不入库）再 `restore`** 做的，
实验后已用 `buffer-equivalence --base build-base` 复核：`PASS 4504 / FAIL 0 / ERROR 0 / 同错 52`，
字节 `34,109,694 = 34,109,694`，**当前 `build/` 与实验前逐字节相同**。

---

## 8. 一句话结论

**v2 之后没有"低垂的果实"了。** 剩下的收益集中在两处结构性改造：
分派探针链换字符类表（P1，+3~6%）和驱动循环/挂载链扁平化（P3，+4~8%，高风险）；
P2/P4 各 1~4%。而单跑 `parse-perf` 的噪声就有 3%，
所以**任何后续优化都必须用 `buffer-ab --repeat 7` 两轮交替来判定**，否则测到的只是噪声。
