# basic token / SourceRange 的剩余性能空间（buffer-v2 之后，实测）

STATUS: **已落地（写回 19 个 `.xl.md`，重新生成后门禁全绿）**。
先在 `opt/buffer-v2` @ `39571e10` 上重做基线、profile / 调用计数 / 采样栈归因，
并用 `build/` 级临时补丁对三个候选做端到端实测（E1 采纳 / E2 不可判 / E3 暂不做）；
随后把 E1 写回 `.xl.md`、由 `xl_build` + `tsc` 重新生成，再跑全量门禁与源码构建版 A/B。

**落地读数**：`xl check` 0 error（2439 warning，基线 2444）；`tsc` 0 error；
validate 1719 条 0 不合格；ast-json 6167/6167（cj-fail 0）、ast-json-diff 6167/6167 全一致；
real-dts 226/226、0 崩溃 0 差异；token-ast total 1715（ok 1705 / crash 0 / diff 0 / ts-invalid 10）；
body-guide 5 组全绿（35/25/23/16/10）；xml+digest 等价 PASS（4556 文件、字节 34,109,694 一致）。
源码构建版 A/B 三轮：**+4.16% / +7.20% / +6.37%**（逐文件中位之和），
调用数 **30.57M → 7.08M（−76.9%）**、字符读取 **13.27M → 6.32M（−52.4%）**。

| 候选 | 结果 | 判定 |
|---|---|---|
| **E1** `value` 穿透 + `ValueAt` 直读 + `AreaAnnotation` 判定重排（19 个 `.xl.md`） | 等价 PASS；补丁版 6 次 A/B 全为正（+2.8% ~ +9.2%），落地后源码版 3 次 A/B **+4.2% ~ +7.2%**（A/A 噪声带 +0.7% ~ +2.2%）；调用数 **30.6M → 7.1M（−76.9%）** | **已落地** |
| **E2** `SourceRange.At` 内联 `Has` 守卫 | 两轮方向相反（−2.8% / +5.6%），**不可判**；且 E1 之后 `At` 只剩 0.68M 次，上限 ≈0.1% | **不做**（E1 之后已无意义） |
| **E3** `BasicDispatch` 字符类表（旧文档 §6 的 P1） | 按新计数重估：净收益 **0.7~1.5%**，**低于本机噪声带**，未做端到端实测 | **暂不做**（先把噪声降下来再说） |

一句话：**这条线上的一刀已经落地（E1，约 3~9%），剩下的都掉进噪声里了**；
本轮之后「每字符读一次字符」这件事已经从 3.26 次 `At` 降到 1.56 次读取。

本文所有数字都可复现：命令见 §6。落地前的实验是 `build/` 上的临时补丁（`build-base` / `build-aa` 均 gitignore）；
落地后 `build/` 由 `.xl.md` 重新生成，读数见 §3.6；仓库改动是 19 个 `.xl.md` + 本文。

---

## 1. 现在的钱花在哪

### 1.1 基线（重新构建，与旧文档可比）

起点是「`dist/`、`build/` 都是过期产物」：源码在 `core/syntax/source-range.xl.md` 里已经是
「`Document` + 两个 int」的新模型，而 `dist/ts`、`build/ts` 还是旧的 `Source`/`End` 模型。
用 `xl_build`（paths=core,typescript，target=ts）→ `xl_orphans --prune`（清掉 5 个已删源码的残留：
`source.ts` / `branch.ts` / `add-result.ts` / `branch-condition-result.ts` / `process-source.ts`）
→ `tsc -p tsconfig.json` 重建后，基线读数：

```
node tests/bench/parse-perf.mjs --dts 8 --repeat 3
  TOTAL median 1056.572 ms   （8 份 d.ts，4,067,441 字符）
```

与 `docs/opt-buffer-v3-analysis.md` 的 1072.7 ms 在噪声内，环境可比。

### 1.2 profile（`--cpu-prof`，按函数名聚合 self time）

| self | 函数 | 位置 |
|------|------|------|
| **14.49%** | `Process` | `core/syntax/unit-token.js:34` |
| **12.71%** | `Transit` | `core/syntax/templates/basic-dispatch.js:20` |
| 5.40% | *(GC)* | — |
| 4.76% | `Transit` | `core/syntax/basic-tokens/common.js:444` |
| 3.77% | `BlockToken`（ctor） | `core/syntax/block-token.js:13` |
| 2.98% | `ExitOrPre` | `core/syntax/basic-tokens/area-annotation.js:54` |
| 2.96% | `Token`（ctor） | `core/syntax/token.js:10` |
| 2.86% | `UnitToken`（ctor） | `core/syntax/unit-token.js:28` |
| 2.86% | `ComputePossibleShapesByIndex` | `core/syntax/catalog-guide.js:25` |
| 2.66% | `IsAppend` | `core/syntax/basic-tokens/common.js:18` |
| 1.28% | `Transit` | `core/syntax/basic-tokens/wrap-symbol.js:23` |
| 1.24% | `ExitOrPre` | `core/syntax/basic-tokens/bracket.js:53` |
| 1.23% | `Transit` | `core/syntax/basic-tokens/symbol.js:65` |

模块聚合：`core/syntax` 47.7%、`typescript/tokens` 20.7%、`core/basic-tokens` 18.0%、GC 5.4%。

**怎么读**：`Process` + `BasicDispatch.Transit` 合计 27%，三个构造函数 + GC 合计 15.5%——
本轮 E1 动的是前两者里「字符读取」那一半；构造函数/分配（§5 P4）本轮没动。

### 1.3 调用计数（8 份 d.ts，4,067,441 字符）

`node tests/bench/dts-cost-probe.mjs --count --files 8`，聚合后的一行是「每字符次数」：

| 次数 | 每字符 | 调用 |
|------|--------|------|
| 17,309,917 | 4.256 | `SourceRange.Has` |
| 13,265,059 | 3.261 | `SourceRange.At` |
| 2,395,796 | 0.589 | `AreaAnnotation.Default` |
| 1,628,920 | 0.400 | `BasicDispatch.Transit` |
| 1,610,268 | 0.396 | `BlockToken.SignOut` |
| 1,132,850 | 0.279 | `Common.Transit` |
| 1,013,726 | 0.249 | `Common.IsAppend` |
| 619,647 | 0.152 | `Token.SignIn` |
| 618,316 | 0.152 | `Token.Add` |
| 591,567 | 0.145 | `Token.TryToClose` |
| 533,951 | 0.131 | `UnitToken.Process` |
| 480,729 | 0.118 | `WrapSymbol.Transit` |
| 60,378 | 0.015 | `Token.WhichUnitRangeContains` |
| 40,273 | 0.010 | `SourceRange.IsInRange` |

两条先排除掉的：

- **`Undo` / `IsInRange` / `WhichUnitRangeContains` 不是热点**（0.015 / 0.010 / 0.015 每字符）——
  回退链不要投资。
- **`SourceRange.Whole` 已无空间**（O1 已按 Document 缓存；30 个调用点都在循环外或冷分支）。

### 1.4 `At` 的 13.27M / 外层 `Has` 的 4.03M 来自哪里（采样栈，7 个站点覆盖 94.6%）

用临时脚本给 `At` / `Has` 包一层、每 200 次取一次调用栈（**只做归因，不改源码**）：

| 站点（生成物） | 每 parse 次数 | 占 At | 说明 |
|---|---:|---:|---|
| `area-annotation.js:58` | **2.40 M** | 18.1% | `ExitOrPre` 回看前一个字符 |
| `area-annotation.js:52` | **2.37 M** | 17.9% | `Default` 读当前字符 |
| `common.js:39` | **2.04 M** | 15.4% | `IsAppend` 尾部 `IsSymbol(At) ‖ IsWhiteSpace(At)` |
| `unit-token.js:78` | **1.63 M** | 12.3% | `Process` 读 `value` |
| `basic-dispatch.js:44` | **1.63 M** | 12.3% | ③ 回看前一个字符 |
| `bracket.js:54` | **1.45 M** | 10.9% | `Bracket.ExitOrPre` 读当前字符 |
| `common.js:48` | **1.03 M** | 7.8% | `IsUnicodeEscapeStart` 复读当前字符 |
| 小计 | **12.55 M** | **94.6%** | |

两条**精确闭合**的恒等式（用来确认计数、语料、实现是同一套口径）：

1. `Has` 17.31M = `At` 内部的 13.27M + **外层 4.03M**；外层 4.03M = `area-annotation:58` 的 2.40M
   + `basic-dispatch:44` 的 1.63M，**相加正好闭合**。
2. `AreaAnnotation.Default` 2,395,796 = 块注释字符 2,425,886 − 3 × 注释条数 10,030，
   差值 30,090 精确相等（每条块注释固定 3 个字符不进 `Default`：`/*` 两个 + `*/` 的 `*`）。

**结论**：`At` 的 70% 是「同一个字符在同一个字符帧里被读第二、第三次」——
驱动层已经在上游把 `value` 读出来了，下游却又各自 `buffer.At(index)` 一遍；
`AreaAnnotation` 的前字符回看则占了外层 `Has` 的 60%。这就是 E1 的全部出发点。

---

## 2. E1：把已读好的字符传下去，并删掉重复读取

### 2.1 补丁（7 个生成物文件、18 处字符串替换，实验补丁只打在 `build/`）

| # | 文件 | 改动 |
|---|------|------|
| 1 | `core/syntax/source-range.js` | 新增 `ValueAt(index)`：`return this.Document.GetValue(index)`（**不做范围校验**；`At` 保持原样，仍是唯一带校验的公开入口） |
| 2 | `core/syntax/unit-token.js` | `Process` 在 `ExitOrPre` 之前读一次 `const value = buffer.ValueAt(index)`（可证界内，见 §2.2），把它传给 `ExitOrPre(...)` 与 `Default(...)`；删掉队列里原来的 `const value = buffer.At(index)` |
| 3 | `core/syntax/basic-tokens/bracket.js` | `ExitOrPre(context, buffer, index, value)`：用传入的 `value` 比较结束括号，不再自读当前字符 |
| 4 | `core/syntax/basic-tokens/area-annotation.js` | `Default(..., value)`：`this.Tmp += value`；`ExitOrPre` **先判当前字符**：`if (value !== "/") return Undo;`，只有 `/` 才回看前一个字符（原来**每个注释字符**都要回看一次） |
| 5 | `core/syntax/basic-tokens/common.js` | `IsAppend(buffer, index, value)` / `IsUnicodeEscapeStart(buffer, index, template, value)`：用 `value` 替掉内部 4 处 `buffer.At(index)`；两个调用点（`Common.Transit`、`Symbol.Transit`）传入已有的 `value` |
| 6 | `core/syntax/basic-tokens/symbol.js` | `Symbol.IsAppend(buffer, index, value)`：3 处 `buffer.At(index)` → `value` |
| 7 | `core/syntax/templates/basic-dispatch.js` | ③ 的前字符回看：`buffer.Has(preIndex) ? buffer.At(preIndex) : …` → `preIndex >= buffer.Start ? buffer.ValueAt(preIndex) : …`（`preIndex < buffer.End` 由 `preIndex = index - 1 < end` 保证） |

### 2.2 为什么等价（四条，全部有界证明）

1. **`value` 与 `buffer.At(index)` 恒等**：`value` 就是在同一个 `index` 上读的；
   basic token 的 `Transit` 一直用它做判定（O4 起），本轮只是把同一份值再往下传一层。
   所有被替换的读取都发生在**同一个字符帧、同一个下标**上，不跨字符、不跨窗口。
2. **`Bracket.ExitOrPre` 的判定只依赖当前字符**：`buffer.At(index) === this.EndBracketChar`，
   换成传入的 `value` 是同一个值。
3. **`AreaAnnotation` 的判定重排**：原判据是 `pre === "*" && buffer.At(index) === "/"`，
   交换两个合取项后先算 `value !== "/"` 短路——**纯读重排，无副作用**，且把「每个注释字符回看一次」
   降成「只有 `/` 才回看」。注释结束序列仍是 `*/`，行为逐字节不变。
4. **`ValueAt` 只在可证界内使用**：
   - `UnitToken.Process` 的循环不变量：`index` 从 `buffer.Start` 起只增，循环条件 `index < buffer.End`，
     因此 `buffer.Start <= index < buffer.End`；`buffer.Document` 构造时必非空。
   - `basic-dispatch` ③：`preIndex >= buffer.Start` 已判，`preIndex = index - 1 < index < buffer.End`。
   越界错误码 `E_SOURCE_RANGE_OUT_OF_RANGE` 的唯一来源仍是 `At`，`ValueAt` 只服务「调用方自证界内」的热路径。

### 2.3 计数证据（噪声无关）

同一个 `tmp/count-reads.mjs` 口径（只数方法调用，不测时间），8 份 d.ts：

| 口径 | 基线 `build-base` | E1 `build` | 变化 |
|---|---:|---:|---:|
| `SourceRange.Has` | 17,309,917 | 822,912 | −95.2% |
| `SourceRange.At` | 13,265,059 | 747,626 | −94.4% |
| `SourceRange.ValueAt` | 0（不存在） | 5,603,496 | 新增 |
| **At+Has 方法调用合计** | **30,574,976** | **7,174,034** | **−76.5%** |
| **字符读取（At+ValueAt）** | **13,265,059** | **6,351,122** | **−52.1%** |

即：每字符的 `At` 从 **3.26 次降到 1.56 次**，方法调用从 **7.5 次/字符降到 1.76 次/字符**。
这是本轮最硬的证据——它不依赖计时噪声。
（§3.6 是落地后源码构建版的同一口径读数：At+Has 30.57M → 7.08M，字符读取 13.27M → 6.32M。）

### 2.4 落地清单（已写回 `.xl.md`）

以下清单**已实施**（实际改动 19 个 `.xl.md`，下表是热路径那一半；另外还同步了 `block-token` 的 `Process` / `IsAppend` 与 9 处 `ExitOrPre`、10 处 `Default` 的签名文档）。
改动后由 `xl_build` 重新生成 `dist/`、`tsc` 编译出 `build/`，门禁与读数见 §3.6。

| 文件 | 改动 |
|---|---|
| `core/syntax/source-range.xl.md` | 新增 `## method ValueAt:(index:int)=>string`，文档写清「调用方必须先自证 `Start <= index < End`；本方法不校验、不抛 `SourceRangeIndexOutOfRange`，只用于热路径」 |
| `core/syntax/token.xl.md:96` | `Default` 抽象签名加 `value:string`（`ExitOrPre` 的抽象在 `unit-token.xl.md`） |
| `core/syntax/unit-token.xl.md:147/163/183` | 读一次 `value`、传 `ExitOrPre` / `Default`；`## protected method ExitOrPre` 签名加 `value` |
| `core/syntax/basic-tokens/area-annotation.xl.md:101/109` | 判定重排 + `Default` 用 `value` |
| `core/syntax/basic-tokens/bracket.xl.md:111` | `ExitOrPre` 用 `value` |
| `core/syntax/basic-tokens/common.xl.md:41-69 / 81-134 / 648` | `IsAppend` / `IsUnicodeEscapeStart` 加 `value` 参数与调用点 |
| `core/syntax/basic-tokens/symbol.xl.md:59-65 / 172` | `IsAppend` 加 `value` 参数与调用点 |
| `core/syntax/templates/basic-dispatch.xl.md:82` | ③ 用 `preIndex >= buffer.Start` + `ValueAt` |

签名涟漪需要逐处过一遍的 override（TS 允许子类方法少参数，但文档口径应保持一致）：
`ExitOrPre` 9 处（`shape-token` / `bom` / `area-annotation` / `bracket` / `regex-token` / `line-annotation` /
`shebang` / `string` / `interpolation-string`），`Default` 10 处（`independent-token` / `guide-token` /
`shape-token` / `bom` / `area-annotation` / `bracket` / `line-annotation` / `shebang` / `string` / `interpolation-string`）。
`string` / `interpolation-string` 也有自己的 `Process` 循环，值穿透已一并处理（这两个文件同样在落地清单里）。

---

## 3. 实测

### 3.1 A/A 对照（噪声带）

同一份未改动的 build 复制成 `build-aa`，与 `build-base` 跑同进程 A/B——两版**逐字节相同**，
读数就是噪声本底：

| 轮次 | TOTAL（逐文件中位之和） | TOTAL（每轮合计的中位） |
|---|---:|---:|
| A/A #1 | **+2.24%** | +0.97% |
| A/A #2 | **+0.73%** | +1.30% |

**本机噪声带 ≈ +0.7% ~ +2.2%**（且有 0.7~2.2% 的「新 build 偏快」系统偏置）。
旧文档的 ±1.5% 是空闲机器的口径；本轮测量期间同机还有两个只读分析 agent 在工作，噪声更大。

### 3.2 E1 端到端（6 次，全部同向）

`node tests/bench/buffer-ab.mjs --base build-base --new build --repeat 7`（8 份 d.ts）：

| 轮次 | 基线中位 | 实验中位 | 提升% | 每轮合计中位的提升% |
|---|---:|---:|---:|---:|
| E1 #1 | 1055.187 | 1021.623 | **+3.18%** | +5.29% |
| E1 #2 | 1014.594 | 930.786 | **+8.26%** | +8.78% |
| E1 #3 | 1024.787 | 930.304 | **+9.22%** | +12.33% |
| E1 #4 | 1026.499 | 948.622 | **+7.59%** | +7.07% |

再用「6 份 d.ts、repeat 15」压小文件噪声（`--dts 1` 会被夹到 6 份）跑了两轮：

| 轮次 | 基线中位 | 实验中位 | 提升% | 每轮合计中位的提升% |
|---|---:|---:|---:|---:|
| E1 #5 | 976.001 | 909.449 | **+6.82%** | +6.30% |
| E1 #6 | 976.876 | 943.666 | **+3.40%** | +2.82% |

**6/6 同向，最低 +2.8%（仍高于 A/A 带的 2.24%），中位约 +7%**。
按旧文档的「profile self 只有一部分能转成墙钟」的教训，本文建议口径写 **+3% ~ +9%**，
不宣称单一数字。

### 3.3 逐文件（E1 #4）

| 文件 | 基线中位 | 实验中位 | 提升% |
|---|---:|---:|---:|
| `lib.dom.d.ts`（2.35MB） | 545.243 | 505.508 | **+7.29%** |
| `lib.webworker.d.ts`（787KB） | 200.277 | 184.959 | **+7.65%** |
| `typescript.d.ts`（588KB） | 212.581 | 191.775 | **+9.79%** |
| `lib.es5.d.ts`（219KB） | 45.982 | 45.855 | +0.28% |
| `lib.es2023.array.d.ts` | 6.910 | 6.277 | +9.16% |
| `lib.es2020.bigint.d.ts` | 7.850 | 7.242 | +7.75% |
| `lib.es2015.core.d.ts` | 4.479 | 4.047 | +9.63% |
| `lib.es2015.symbol.wellknown.d.ts` | 3.177 | 2.960 | +6.83% |

大文件（dom/webworker/typescript.d.ts）稳定 +7% 左右；`lib.es5.d.ts` 是单文件 +0.28% 的例外——
46 ms 量级的单文件抖动本来就有 ±10% 级（E1 #1 里它读数是 **−12.08%**，E1 #4 是 +0.28%），不构成反例。

### 3.4 等价性（逐字节）

```
node tests/bench/buffer-equivalence.mjs --mode both --base build-base --new build --quiet
  语料 4556 个文件，7,837,812 字符
  xml:    PASS 4504 / FAIL 0 / ERROR 0 / 同错 52（字节 基线 34,109,694 = 实验 34,109,694）
  digest: PASS 4504 / FAIL 0 / ERROR 0 / 同错 52（token 基线 797,790 = 实验 797,790）
  结论: 等价（xml+digest 通道全部 PASS）
```

`同错 52` 是两版对同一输入抛同一个异常（含错误文本与 `^` 位置），属于等价。

### 3.5 单价证据（微基准，1.28M 字符的真实 `TextDocument`、32 字符窗口、每档 2e7 次）

| 操作 | 单价（两次） |
|---|---:|
| `window.At(index)`（带 `Has` 守卫） | **5.37 / 6.21 ns** |
| `window.Has(index)` | 1.45 / 1.64 ns |
| `doc.GetValue(index)`（`At` 的主体） | 3.44 / 4.00 ns |
| `window.ValueAt(index)`（E1 新增） | 3.95 / 3.95 ns |
| 手写内联守卫 + `GetValue` | 4.43 / 4.08 ns |
| `content[index]` 直取 | 3.72 / 3.78 ns |

读法：`At` 比 `ValueAt` 贵 **1.4~2.2 ns**（= 一次 `Has` 调用 + 一层调用开销），与旧文档的 5.15/1.77 同量级。
E1 删掉的是 **9.29M 次 `At` + 4.03M 次外层 `Has`**，按单价理论省 **≈30~45 ms（3~4%）**；
实测 +3~9% 略高，说明真实热路径里这些调用**没有被内联**（比微基准更贵），删掉它们比单价推算更值。
（`Has` 的删除量按 4.03M 计：其中 2.40M 是彻底删掉，1.63M 是换成一次整数比较 `preIndex >= buffer.Start`。）

### 3.6 落地后复核（源码构建版，19 个 `.xl.md`）

写回源码、`xl_build`（0 error）+ `tsc`（0 error）之后，`build/` 不再是补丁产物而是重新生成的。
按 HANDOFF 的七道门口径复跑：

| 门 | 命令 | 结果 |
| --- | --- | --- |
| xl check | `xl check`（core, typescript, target ts） | 872 文件 / **0 error** / 2439 warning（基线 2444） |
| validate | `node tests/parse/validate.mjs` | 1719 条，**0 不合格** |
| ast-json | `node typescript/cases/ast-json.mjs` | 6167/6167，cj-fail **0** |
| ast-json-diff | `node typescript/cases/ast-json-diff.mjs` | 6167 条**完全一致**；结构/位置/字段差 **0** |
| real-dts | `node typescript/cases/real-dts-ast.mjs` | 226/226 解析成功、崩溃 **0**、AST 差异 **0** |
| token-ast | `node typescript/cases/token-ast.mjs --quiet` | total 1715 / ok 1705 / crash **0** / diff **0** / ts-invalid 10 |
| body-guide | `node tests/body-guide/harness.mjs --all` | 35/35、25/25、23/23、16/16、util 10/10、**fail 0** |
| 等价性 | `buffer-equivalence --mode both --base build-base --new build` | xml+digest PASS 4504 / FAIL 0 / ERROR 0 / 同错 52；字节 34,109,694 一致 |

> 备注：`npm run gates`（聚合 runner）在本分支上**本来就是红的**——它引用的 `tests/parse/ts-shape.mjs`
> 需要 `build/ts/typescript/print-ast-common.js`，而本分支 `typescript/print-ast-common.xl.md` 不存在
> （`git log` 查不到该路径），与本次改动无关。本分支的口径是上表七道门 + 等价性。

调用计数（8 份 d.ts，同 §2.3 口径）：

| 口径 | 基线 `build-base` | 落地版 `build` | 变化 |
| --- | ---: | ---: | ---: |
| `SourceRange.Has` | 17,309,917 | 757,207 | −95.6% |
| `SourceRange.At` | 13,265,059 | 681,921 | −94.9% |
| `SourceRange.ValueAt` | 0（不存在） | 5,636,542 | 新增 |
| **At+Has 方法调用合计** | **30,574,976** | **7,075,670** | **−76.9%** |
| **字符读取（At+ValueAt）** | **13,265,059** | **6,318,463** | **−52.4%** |

源码构建版 A/B（`build-base` vs `build`，8 份 d.ts，`--repeat 7`）：

| 轮次 | 基线中位 | 实验中位 | 逐文件中位之和 | 每轮合计中位 |
| --- | ---: | ---: | ---: | ---: |
| #1 | 999.986 | 958.398 | **+4.16%** | +4.84% |
| #2 | 1006.516 | 934.017 | **+7.20%** | +4.58% |
| #3 | 999.596 | 935.882 | **+6.37%** | +6.46% |

三轮同向、量级与 §3.2 的补丁版一致 → **收益来自源码实现，不是生成物或补丁方式的差异**。

---

## 4. E2：`At` 内联 `Has` 守卫（负/不可判结果）

想法：`At` 里 `if (!this.Has(index)) throw …` 改成内联的 `if (this.Start >= 0 && index >= this.Start && index < this.End)`，
省一层方法调用（13.27M 次）。

| 轮次 | 提升% |
|---|---:|
| E2 #1（8 文件 r7） | **−2.77%**（更慢） |
| E2 #2（8 文件 r7） | **+5.55%** |

两轮**方向相反**，都在噪声带附近 → **不可判**。单价上看内联确实比 `At` 快 1~2 ns，
但 13.27M × 1.5 ns ≈ 20 ms（1.9%）本来就在噪声边缘；而 **E1 之后 `At` 只剩 0.68M 次**，
E2 的剩余上限 ≈ 1.0 ms（0.1%）——**采纳 E1 后 E2 自动变成无意义项，不做**。

---

## 5. 其余候选与判定

### P2（未做，上限最高的下一刀）：`AreaAnnotation` 专用扫描

现状：59.6% 的字符在块注释里，每个注释字符要付 `UnitToken.Process` 一帧 + `AreaAnnotation.ExitOrPre`
（E1 后只剩 `value !== "/"` 一次比较）+ `Default`（`Tmp += value` 一次字符串追加）。
上限：把整段注释用一次 `GetRaw(start, end)` 切片扫完，吃掉 2.4M 次 `ExitOrPre` + 2.37M 次 `Default`
+ 2.37M 次 `Tmp +=`；按本轮单价粗算 **2~4%**。
代价：需要单独分支 + 全量等价（注释的 `Undo` / 窗口边界 / Reload 重放语义都要保住），风险中-高。
**建议**：E1 落地并观察一轮之后再单独做，不和 E1 混在一个 commit。

### P3（暂不做）：`BasicDispatch` 字符类表

旧文档 §6 P1 估计 +3~6%，本轮按新计数重估后下调：dispatch 每次调用平均 6.74 个判定段
（含两跳 `instanceof`），按「每段 1~2 ns」是 **6~13 ns/调用 = 2.4~5.2 ns/字符 ≈ 0.7~1.5%**
（旧估计把 `IsSymbol` / `IsWhiteSpace` 当成贵的，实际都是 switch + 空数组 `includes`，很便宜）。
0.7~1.5% **落在 +0.7~2.2% 的噪声带里**，端到端无法证明。**先不做**；
若要做，方案要点：表挂在 `Template` 实例的缓存槽（不能静态，模板每上下文一份）、
128 项位集 + 非 ASCII 逐字符现算、**不重排任何判定段**（`pre === "/"` 的 ③ 必须在 ④⑤⑥⑦ 之前，
⑥b/⑦b 的 `last` 副作用必须保留）。

### P4（未做）：对象分配与 GC

三个构造函数 ctor self 合计 **9.6%**（`BlockToken` 3.77% + `Token` 2.96% + `UnitToken` 2.86%），GC 5.4%。
每个 basic token 至少 `Token` + `SourceRange` + `Data[]` 三个对象；lib.dom 每份 40.8 万个 `SourceRange`
（O1 之前 180 万，已砍 77%）。可做的是 `Data` / `SourceRange` 懒建（旧文档 P4，估计 2~4%），
但 **O1 的教训是「分配下降 81% 没有转成墙钟」**，且 `SourceRange` 的判空语义遍布全代码。
**建议**：先用 `--trace-gc` 量本轮 E1 前后的 GC 暂停；若无变化，本方向暂缓。

### P5（可选，小）：签名链的局部缓存

`Token.SignIn` / `SignOut` / `TrySignOut`、`BlockToken.SignOut`、`ShapeToken.TryToClose`
合计 ≈3.6M 次调用，每次重复读 2~4 次多态 `this.SourceRange.*`。局部 `const range = this.SourceRange` 估计 0.2~0.5%。
收益小、改动散，**不单独做**；如果做 P2 顺带。

### 明确不做

- 删/全局绕过 `At` 守卫：`E_SOURCE_RANGE_OUT_OF_RANGE` 的唯一来源，回看点确实会越窗（`preIndex < buffer.Start`）。
- `Has` 与 `IsInRange` 合并、`WhichUnitRangeContains` 优化：每字符 0.01 次，纯冷。
- 值语义 API（`Clone` / `Same` / `Different` / `Of` / `FromRanges` / `Length` / `IsEmpty`）：全仓 **0 调用点**。
- `instanceof` → 布尔字段、`includes` → 码点表：旧文档已实测否掉（前提不成立 / 更慢）。
- 块注释 `Tmp` 改块缓冲或切片：旧文档实测负结果（−3% 落在噪声内）。
- 重排 `BasicDispatch` 探针顺序、用 `Process` 状态记「上一格是 `/`」：语义风险 > 收益。
- 65536 项全量静态表：建表成本 + GC，且模板每 parse 一份。

---

## 6. 复现

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example      # 分支 opt/buffer-v2 @ 39571e10

# 0) 重建基线（dist/build 是 gitignore 的过期产物；xl 用 xl_build / xl_orphans 工具）
#    xl_build: paths=[core,typescript], targets=[ts]  → dist/ts
#    xl_orphans --prune                                → 清 5 个已删源码的残留
node_modules\.bin\tsc.cmd -p tsconfig.json           # dist → build，0 error
Copy-Item build build-base -Recurse                  # 基线快照（A/B 用）

# 1) 基线读数
node tests/bench/parse-perf.mjs --dts 8 --repeat 3
node --cpu-prof --cpu-prof-dir=tmp/prof tests/bench/parse-perf.mjs --dts 8 --repeat 2
node tests/bench/prof-summary.mjs tmp/prof/<file>.cpuprofile --top 40
node tests/bench/dts-cost-probe.mjs --count --files 8 > tmp/count8.json

# 2) E1 实验（临时补丁只改 build/；脚本见附录 A）
node tmp\apply-patch.mjs value-thread                  # 7 个文件 / 18 处替换
node tmp\count-reads.mjs build-base 8; node tmp\count-reads.mjs build 8   # 调用计数对比
node tests/bench/buffer-equivalence.mjs --mode both --base build-base --new build --quiet
node tests/bench/buffer-ab.mjs --base build-base --new build --repeat 7   # 跑两轮以上
node tmp\restore-build.mjs                             # 从 build-base 还原

# 3) A/A 噪声带
Copy-Item build-base build-aa -Recurse
node tests/bench/buffer-ab.mjs --base build-base --new build-aa --repeat 7

# 4) 落地版复核（改完 .xl.md 之后：重新生成 + 全量门禁）
#    xl_build: paths=[core,typescript], targets=[ts]；tsc -p tsconfig.json
node tests/bench/buffer-equivalence.mjs --mode both --base build-base --new build --quiet
node tests/parse/validate.mjs
node typescript/cases/ast-json.mjs
node typescript/cases/ast-json-diff.mjs
node typescript/cases/real-dts-ast.mjs
node typescript/cases/token-ast.mjs --quiet
node tests/body-guide/harness.mjs --all
```

---

## 附录 A：实验脚本（临时，未入库）

`tmp/apply-patch.mjs` 以字符串替换把 §2.1 的 18 处替换打到 `build/ts` 的生成物上，
每处替换都断言「恰好命中一次」（找不到或命中多次就报错），因此补丁内容就是 §2.1 那张表的逐字实现。
`tmp/count-reads.mjs` 只包 `SourceRange.At/Has/ValueAt` 的原型方法计数，不改行为。
`tmp/unit-price.mjs` 用真实 `TextDocument` 与 32 字符窗口做显式循环的单价测量。
`tmp/restore-build.mjs` 从 `build-base` 还原 `build`。
四个脚本都在 `tmp/`（gitignore），**没有提交**；要入库请按 §2.4 改 `.xl.md` 并重新生成。

---

## 7. 一句话结论

**这一刀已经落地**：把「驱动层已经读出来的字符」继续往下传、删掉下游 9.29M 次重复 `At` 与 2.40M 次前字符回看——
等价 PASS、七道门全绿，源码构建版 3 次 A/B **+4.2% ~ +7.2%**，调用数 −76.9%、字符读取 −52.4%。
其余候选（注释整体扫描 2~4%、字符类表 0.7~1.5%、分配 2~4%）要么风险更高，要么已经落在本机 ±2% 的噪声带里；
`At` 已从 3.26 次/字符降到 1.56 次，再谈「省读字符」收益已经很小。
