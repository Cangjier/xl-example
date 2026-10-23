# BasicDispatch 残余分派的 A/B 原型（T2）

STATUS: **完成**。结论：**A（128 项 ASCII 分类表 + plain 快速出口）值得落地，约 +2% ~ +5%（中心 +3.5~4%）；B 单独无稳定收益；C/D1 无可测收益，否决。** 三个候选的 build 副本都在 `build-p*`（gitignore），读数文件在 `tmp/team/dispatch-opt/`。

- 基线：HEAD 9e13943d，`build`（run-batching 已落地），8 份 d.ts 约 599 ms
- 语料：`node_modules/typescript/lib` 下最大的 8 份 `*.d.ts`（4,056,011 字符；非 ASCII 仅 **114 字符 / 0.0028%**）
- 工作副本：`build-p1`（B）/ `build-p2`（A+B）/ `build-p3`（A+B+C+D1）/ `build-p4`（A+B+C）/ `build-p5`（A+B+D1）/ `build-p6`（A+B，写回形态：表用 128 字符 string 而不是 Uint8Array）/ `build-aa`（A/A 对照）
- 归一化：`build`、`build-aa` 与 `build-*.xl.md` 源码都**未改**；只改 build 副本里的 `ts/core/syntax/templates/basic-dispatch.js`（p4/p5 各 1–2 行，p1/p2/p6 重写了该文件）。

---

## 0. 一句话结论

| 候选 | 做法 | 结论 | 估计收益（8 份 d.ts） |
|---|---|---|---|
| **A** | 128 项 ASCII 字符分类位表（懒建在模板实例上），替换 ①④⑤⑥⑦ 的 includes/switch/虚方法调用；非 ASCII 回退原链 | **采纳** | **+2% ~ +5%，中心 +3.5~4%** |
| B | plain 字符在 ③ 之后直接进 ⑧（补 ⑥/⑦ 收尾副作用） | 单独不采纳（并入 A 的 no-class 快速出口） | 落在 A/A 带内（−1.9% ~ +2.9% 摆动） |
| C | ⑧ 的 `raw.substring(0, offset)` 在整段=窗口剩余时复用 raw | 否决 | +0.2% / −1.5%（配对）＝噪声内 |
| D1 | ③ 的 `ValueAt`/`Whole(document).At` 三元换成 `document.GetValue(preIndex)` | 否决 | −0.4% / −1.0%（配对）＝噪声内 |
| C+D1 | 两处一起 | 否决 | 首轮 −3.5~−4%，复测 +0.5~1.3% → 无稳定收益 |

---

## 1. 方法（为什么不用 `buffer-ab` 单跑）

`tests/bench/buffer-ab.mjs` 本会话的 A/A 噪声明显大于文档的 ±2.4%：**A/A（`build` vs 未改副本）单跑读数 +1.30%/+2.73%（repeat 11）**，且小文件逐文件摆动 ±5% ~ ±26%。因此另写 `tmp/team/dispatch-opt/ab-multi.mjs`，与 `buffer-ab` 同语料、同进程、同「逐文件 A/B 交替、顺序随轮旋转」，但：

1. **A/A 对照在同一进程同一轮里跑**，噪声带可比；
2. 一次可比多个候选（`build` + `build-aa` + 候选们）；
3. 多报一个**逐轮配对比值**统计量：每轮 `sum(候选)/sum(基线)` 再取中位/均值 —— 同一轮内两侧相邻测量，机器漂移大部分被约掉；
4. `warmup 3`（`buffer-ab` 默认 1，实测前 2–3 轮明显偏慢）。

三个口径都报，只有三者同向才认。

### 1.1 A/A 噪声带（本会话实测）

| 对照 | repeat | 逐文件中位之和 | 每轮合计中位 | 逐轮配对比值 中位 / 均值 |
|---|---:|---:|---:|---:|
| `build` vs `build-aa`（2-dir） | 15 | +0.54% | −0.10% | — |
| `build` vs `build-aa`（2-dir） | 21 | +0.07% | −1.36% | −2.70% / −0.90% |
| `build` vs `build-aa`（2-dir） | 31 | −1.79% | −0.09% | −0.40% / −1.14% |
| `build` vs 未改副本（buffer-ab） | 11 | +1.30% | +2.73% | — |
| 4-way（A/A 在第 2 个加载的副本） | 15 | +2.94% | +2.95% | — |

**两条方法论结论**：
- 2-dir 协议的 A/A 带 ≈ **±2%**，与文档 §3 的 ±2.4% 同量级；单轮偶发到 ±4pp（见 §3 C+D1 首轮）。
- **同进程里「后加载的 build 副本」有 ~+3% 的系统优势**（4-way 的 A/A 是 +2.94%，而 2-dir 是 ~0）。所以多候选同进程混测的读数（例如 P2 的 +9.49/+8.01）会**高估**；本轮最终数字一律以 **2-dir、候选第 2 个加载** 为准（`build` vs `build-*` 单跑）。

---

## 2. 候选 A：128 项字符分类表（+ 把 B 的 plain 快速出口并进去）

### 2.1 改法

`BasicDispatch.Transit` 改成：

1. `const code = value.charCodeAt(0)`；`code >= 128` → **原 ①–⑧ 全链原样**（`Fallback`）。
2. 否则取模板上的 128 项表（懒建，第一次 Transit 时建）：7 个独立位
   `1 BOM / 2 Shebang 标记首字符 / 4 Quotes / 8 开括号 / 16 IsWhiteSpace / 32 IsSymbol / 64 plain`。
   **每一位都是建表时用模板自己的谓词问出来的**。
3. 按原队列顺序处置：`BOM`→`Bom.Transit`；`MARKER`→`Shebang.Transit`（Undo 继续）；**③ 照旧逐个字符回看**（语义雷区，不跳）；
   - `QUOTE|OPEN|WS|SYM` 四位全 0 的字符（plain 和其它 ASCII）→ 只剩 ⑥/⑦ 的「收掉上一个未闭合 WrapSymbol / Symbol」两处副作用，
     照原样调 `WrapSymbol.Transit` / `Symbol.Transit`（Undo 才继续），然后 ⑧：plain → `PlainOrCommon` 整段收，其余 → `Common.Transit`；
   - 否则按位走 ④ `StringGuide` → ⑤ `Bracket`（Undo 继续）→ ⑥ `WrapSymbol` → ⑦ `Symbol`（含「上一个未闭合 Symbol」副作用）→ ⑧。

原文件 141 行 → 副本 263 行（其中 `Fallback` 是原 ①–⑧ 整段搬过去，`PlainOrCommon` 是原 ⑧ 整段搬出来）。
### 2.2 等价性论证

- **表位 = 「建表那一刻」模板谓词的答案**：`boms.includes(ch)`、`ch === marker[0]`、`quotes.includes(ch)`、
  `ch` 是否 `(`/`{`/`[`、`IsWhiteSpace(ch)`、`IsSymbol(ch)`、`IsPlainCode(ch)`。没有一处写死 ASCII 假设，
  所以模板把 `"x"` 配进 BomChars/Quotes、或 `AllowedSymbol.push("a")`、或 ts 覆写 `IsWhiteSpace`（25 个 case）都照样对。
- **处置顺序 = 原队列顺序**：① 在 ② 前，③ 对所有字符都跑，④ 在 ⑤/⑥/⑦ 前，⑤ 只在三个开括号上且 Undo 继续，⑥ 在 ⑦ 前。
- **⑥/⑦ 的副作用必须保留**（B 的语义难点）：非空白字符也要收掉「上一个未闭合 WrapSymbol」（`TryToClose` 可能 `Built`→`Reload`），
  非符号字符也要收掉「上一个未闭合 Symbol」。P2 的 no-class 分支把这两段显式抄了回来；`WrapSymbol.Transit` 返回 `Undo` 后还按原文
  **重新取 `unit.Last()`**（它可能已把空白块关闭），`Symbol.Transit` 之后则**不重取**（与原代码一致）。
- **非 ASCII 全回退原链**：BOM 默认就是非 ASCII、ts 的空白表也含非 ASCII（NBSP/U+0085/…），所以 `code >= 128` 一律走 `Fallback`。
  本语料非 ASCII 仅 114 / 4,056,011 字符，回退路径成本可忽略；对 CJK 标识符语料则等于无收益（本仓只有 ts）。
- **实测等价**：`node tests/bench/buffer-equivalence.mjs --mode both --base build --new build-p2 --quiet`
  → 语料 **4556 文件 / 7,837,812 字符**；`xml PASS 4504 / FAIL 0 / ERROR 0 / 同错 52`，字节 34,109,694 一致；
  `digest PASS 4504 / FAIL 0 / ERROR 0 / 同错 52`，token 797,790 一致。**结论: 等价**。
  写回形态 `build-p6` 同样 PASS（见 §2.4）。

### 2.3 读数

| 运行 | repeat | vs build 逐文件中位之和 | 每轮合计中位 | 逐轮配对比值 中位/均值 |
|---|---:|---:|---:|---:|
| 2-dir #1（`build-p2`） | 21 | **+4.38%** | +3.55% | +4.12% / +3.07% |
| 2-dir #2（`build-p2`） | 21 | +0.19% | +0.87% | —（该轮整体偏快：基线合计 ~579ms，比其它轮低 ~4%，判为异常轮） |
| 2-dir #3（`build-p2`） | 31 | +2.16% | **+5.30%** | **+5.20% / +2.91%** |
| 同会话 A/A（repeat 31，用于对照 #3） | 31 | −1.79% | −0.09% | −0.40% / −1.14% |
| 2-dir（`build-p2`） | 15 | — | +4.28% | — |
| 4-way（`build` / `build-aa` / `p1` / `p2`） | 15 | +9.49% | +8.01% | —（含 §1.1 的 ~+3% 加载序偏差，**作废，不作证据**） |
| 反向 2-dir（base=p2，cand=build；p2 先加载） | 15 | — | build 比 p2 慢 1.16~1.88% ⇒ p2 ≈ +1.2~1.9% | — |

**判定**：repeat 21/31 的 `build-p2` 与同会话 A/A 相比，四个统计量全部偏正；最干净的一组（repeat 31）是
「A/A −0.4% 对 P2 +4.2~5.3%」。跨运行幅度 **+1.2% ~ +5.3%**，中心 **+3.5~4%**，明显大于 2-dir A/A 带（±2%），
但小于 4-way 的虚高读数（+8~9%）。**采纳。**

### 2.4 写回形态验证（表用 128 字符 string，而不是 Uint8Array）

xl 的中立类型表里没有 `Uint8Array`（`core/**.xl.md` 全仓没用过；`docs/` 里只是建议）。所以写回形态改成
**一个 128 字符的 `string`**：第 i 个字符的码点低 7 位 = 第 i 个 ASCII 字符的 7 个分类位，取值用 `table.charCodeAt(code)`。
`build-p6` = P2 只把 `Uint8Array` 换成这个 string 编码：

| 对照 | repeat | 逐文件中位之和 | 每轮合计中位 | 逐轮配对比值 中位/均值 |
|---|---:|---:|---:|---:|
| `build-p6` vs `build-p2`（编码差） | 21 | +0.59% | +0.26% | −0.66% / +0.34% → **无差** |
| **`build-p6` vs `build`（最终形态）** | 21 | **+2.23%** | **+4.17%** | **+4.24% / +3.80%** |

等价：`build-p6` 全语料 xml+digest 也 PASS（4556 文件，同错 52，字节/token 一致）。**写回就按 string 形态。**

---

## 3. 候选 B：plain 快速出口（单独测）

**改法**：③ 之后、④ 之前判 `plain`（ASCII 字母/数字/下划线）；另加一个**每模板一次的自审**（`BuildPlainFast`）——
对 63 个 plain 字符逐个问模板谓词（BomChars / ShebangMarker / Quotes / `IsWhiteSpace` / `IsSymbol`），
**任何一个不是 false 就整体关闭快速出口、退回原路径**（所以不写死 ASCII 假设）。自审通过时补上 ⑥/⑦ 两处收尾副作用，
然后直接进 ⑧ 整段收；其它字符 ④–⑦ 原封不动。`build-p1` 141 → 170 行。

**等价性**：全语料 xml+digest **PASS**（4556 文件 / 7,837,812 字符，同错 52，字节/token 一致）。
（B 的快速出口逻辑是 A 的 no-class 分支的严格子集，A 的等价 PASS 也覆盖它。）

**读数（vs `build`）**：

| 运行 | 逐文件中位之和 | 每轮合计中位 | 逐轮配对比值 中位/均值 |
|---|---:|---:|---:|
| `buffer-ab` repeat 11 | +2.41% | +2.24% | — |
| 2-dir repeat 15 | +2.90% | +2.23% | — |
| 2-dir repeat 21 | −1.85% | −0.57% | +1.74% / +0.04% |

**结论：单独不采纳。** 三轮在 +2.9% ~ −1.9% 之间摆动，落在 A/A 带内，**不能证明有收益**。
机制上也讲得通：plain 字符只占 dispatch 调用的约 1/3（Common run ≈ 15 万 / 470,903 次），而它跳过的 ④⑤⑥ 里，
⑥ `IsWhiteSpace` 对 plain 字符本来就要一路问到 ts 的 25-case 覆写才返回 false —— 省的是这部分，量级只有 1~2%。
A 的增益主要来自**空白/符号**这两类（约 6 成调用）：直接位路由，不再付 `IsWhiteSpace`+`IsSymbol` 的几十次字符串比较。

---

## 4. 候选 C / D1：⑧ 的分配与 ③ 的取字符

### C：`raw.substring(0, offset)` → `offset === raw.length ? raw : raw.substring(...)`
- 改 1 行。等价（整段恰好等于窗口剩余时，substring 结果就是 raw）。`build-p4` = P2 + 这一行。
- 读数 vs P2（repeat 21）：逐文件 **+0.22%**、每轮 **+0.24%**、配对 中位 **−1.47%** / 均值 **−0.37%** → **噪声内，否决**。
- 原因：窗口只有 32 字符，`GetRaw` 最多分配 ~64B；且 run 恰好吃满窗口剩余的比例不高（run 平均 ~7 字符 → ~20%）。
  省掉的那点 substring 分配不足以出噪声带。

### D1：③ 的 `preIndex >= buffer.Start ? buffer.ValueAt(preIndex) : SourceRange.Whole(buffer.Document).At(preIndex)` → `document.GetValue(preIndex)`
- 改 2 行。等价：`ValueAt` = `Document.GetValue`；`Whole(document).At` 在 `Has` 通过后也是 `Document.GetValue`，
  而 `preIndex >= 0` 且 `preIndex < index < buffer.End <= GetCount` 保证界内。`build-p5` = P2 + 这一处。
- 读数 vs P2（repeat 21）：逐文件 **+0.02%**、每轮 **−0.44%**、配对 中位 **−1.21%** / 均值 **−0.98%** → **噪声内/略负，否决**。
- 解读：`buffer.ValueAt` 是单态原型方法（V8 好内联），直接读 `buffer.Document` 再调字段闭包并不更快；这条线的
  剩余成本在 `unit.IsUndo`（只在前一字符是 `/` 时才走到），不在取字符。

### C+D1 组合（`build-p3`）
- 首轮 vs P2（repeat 21）：逐文件 **−4.05%**、每轮 **−3.54%**、配对 −3.25% / −4.08%；
- 复测 vs P2（repeat 21）：逐文件 **+1.28%**、每轮 **+0.54%**、配对 +0.14% / −0.21%。
- **结论：无稳定收益，否决。** 首轮的 −4% 反过来是本报告最重要的噪声证据：**这套测量的单轮波动可达 ±4pp**，
  所以任何 <2% 的候选都不值得为它增加代码（写回后必须用 repeat≥21 复测）。

---

## 5. 写回 .xl.md 的精确落点

### 5.1 `core/syntax/templates/template.xl.md`（+~8 行）

在 `## field BomChars`（现 L67–70）之后加字段，并在 `Initialize`（L131–137）里清表：

```md
## field BasicClassTable:string = ""

BasicDispatch 的 ASCII 字符分类表（懒建）：空串 = 未建；否则是 128 个字符，
第 i 个字符的码点低 7 位是第 i 个 ASCII 字符的分类位：
1 = ① BOM、2 = ② Shebang 标记首字符、4 = ④ Quotes、8 = ⑤ 开括号、16 = ⑥ IsWhiteSpace、32 = ⑦ IsSymbol、64 = ⑧ plain。
每一位都是建表时用本模板自己的谓词问出来的。**建表之后本模板的分类必须冻结**；改了 BomChars / Quotes /
SymbolTemplate.Ban|Allow / 覆写 IsSymbol|IsWhiteSpace 之后要清空本字段才会重建（Initialize 会清）。
```

```ts
// Initialize 的方法体
this.BasicClassTable = "";
onInitialize(this);
return this;
```

### 5.2 `core/syntax/templates/basic-dispatch.xl.md`（+~110 行，改 1 个方法、新增 4 个成员）

1. 新增 7 个位常量（`## private static field BitBom:int = 1` … `BitPlain:int = 64`）。
2. 新增 `## private static method BuildClassTable:(template:Template)=>string`
   —— 128 次 `String.fromCharCode(bits)` 拼接；每字符问一次模板谓词；写完 `template.BasicClassTable`，返回它。
3. 新增 `## private static method PlainOrCommon:(context:SyntaxContext, unit:Token, buffer:SourceRange, index:int, last:Token | null)=>BranchStates`
   —— 原 ⑧ 的整段收整段搬过来；不接手时方法内部 `return Common.Transit(...)`（这样不需要 `BranchStates | null` 返回类型）。
4. 新增 `## private static method Fallback:(context, unit, buffer, index, value)=>BranchStates`
   —— **现在 `Transit` 的 ①–⑧ 原文整体搬到这里**，只在非 ASCII 时调用。
5. 重写 `## static method Transit`：查表 + §2.1 的处置顺序；文档段补三条依据：
   表冻结契约、非 ASCII 回退、⑥/⑦ 副作用为何必须保留（即原 `basic-dispatch.xl.md` L116–142 的论证）。
6. 不新增依赖（不用 `Uint8Array`，仍只用现有 13 个 import）。

### 5.3 预计收益与验收

- 8 份 d.ts：**599 ms → ~575–587 ms（+2% ~ +5%，中心 +3.5~4%）**。改动只在 `basic-dispatch` 的每次调用内部：
  每个位置省掉 ① `BomChars.includes`、④ `Quotes.includes`、⑤ 三次比较、⑥ `IsWhiteSpace`（ts 覆写：super 4-case + 21-case）、
  ⑦ `IsSymbol`（禁用表 + 30-case + 允许表）中的绝大多数；`Transit` 调用次数不变（仍 470,903 次/8 份），
  变的是每次的判定成本。⑥/⑦ 的整段收（E4–E7）不受影响。
- 建表成本：每份模板 128 次 `fromCharCode` + 128×(2 includes + 2 长 switch) ≈ 数十 µs；8 份 8 个模板 ≈ 0.1–0.3 ms/轮，已含在上面的读数里。
- 验收门禁（写回后）：`xl_build` 0 error → `tsc -p tsconfig.json` 0 error → `xl_orphans` 0 →
  `buffer-equivalence --base build-e1 --new build --mode both`（或对落地前快照）→ `buffer-ab --repeat 11/21` →
  validate / ast-json-diff / real-dts / token-ast / body-guide 七道门。
  **A/B 的 A/A 对照必须同协议重跑**（本会话 2-dir A/A ≈ ±2%；多候选混测有 ~+3% 加载序偏差）。

---

## 6. 风险

1. **模板冻结契约（主要风险）**：表是「第一次 Transit 时」的模板谓词快照。之后若运行期改
   `BomChars` / `StringTemplate.Quotes` / `SymbolTemplate.Ban|Allow` / 覆写 `IsSymbol|IsWhiteSpace` 依赖的状态，
   表会过期，而且**过期方向可能静默改变分词**：例如模板后来把 `"` 加进 Quotes，表仍说「不是引号」→ `StringGuide` 不被调用，
   `Common` 又拒绝符号/引号 → 该字符没人接手，落 `Default` 被吞（不报错，产出错树）。
   缓解：`Template.Initialize` 清表；文档把契约写死；本仓唯一用法满足（`SourceFileRunner.Parse` 每次 `new Template()`、
   Parse 前配好、parse 期间只读）。要更强保证需给 `SymbolTemplate.Ban/Allow/Remove` 加 revision（无 Template 反向引用，需额外设计，本轮不做）。
2. **只覆盖 ASCII**：非 ASCII 全回退原链（等价但零收益）；本仓只有 ts 模板，其它语言（CJK 标识符）不会被加速。
3. **顺序/副作用不能走样**：③ 仍必须对每个字符跑（§2.3 的语义雷区，`unit.IsUndo` 的 `WhichUnitRangeContains` 空 = true 那个坑）；
   ⑥/⑦ 的 `TryToClose` 副作用必须显式保留，且 `WrapSymbol.Transit` 返回 `Undo` 后要重取 `unit.Last()`。
   这两条是等价性 PASS 的前提，抽取代码时不能「顺手简化」。
4. **读数风险**：本会话噪声比文档大（单轮 ±2~4pp，A/A 带 ±2%）；+2%~+5% 的效应必须 repeat≥21 并带同会话 A/A 才能判定。
   4-way 混测的 +9.49%/+8.01% 是加载序偏差，**不要引用**。
5. **不是「免费」**：`Transit` 多一次 `template.BasicClassTable` 属性读 + `charCodeAt` + 一次表读；在 p6 的读数里已包含，仍为正。
6. **未验证项**：写回后没有跑 profiler 复核 `BasicDispatch.Transit` self 是否从 8.79% 降下来（时间不够）；
   226 份全语料只做等价、没做 A/B。

---

## 7. 复现

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example

# 副本（gitignore）
Copy-Item -Recurse build build-aa      # A/A
Copy-Item -Recurse build build-p1      # B
Copy-Item -Recurse build build-p2      # A+B（Uint8Array 表）
Copy-Item -Recurse build build-p6     # A+B（写回形态：128 字符 string 表）

# 多候选同进程 A/B（本轮所有读数的主协议；repeat 21/31，warmup 3）
node tmp/team/dispatch-opt/ab-multi.mjs build build-aa --repeat 21 --warmup 3     # A/A 带
node tmp/team/dispatch-opt/ab-multi.mjs build build-p2 --repeat 31 --warmup 3     # A
node tmp/team/dispatch-opt/ab-multi.mjs build build-p6 --repeat 21 --warmup 3     # 写回形态
node tmp/team/dispatch-opt/ab-multi.mjs build build-p1 --repeat 21 --warmup 3     # B
node tmp/team/dispatch-opt/ab-multi.mjs build-p2 build-p4 --repeat 21 --warmup 3  # C
node tmp/team/dispatch-opt/ab-multi.mjs build-p2 build-p5 --repeat 21 --warmup 3  # D1

# 等价（全语料 4556 文件 / 7,837,812 字符）
node tests/bench/buffer-equivalence.mjs --mode both --base build --new build-p2 --quiet
node tests/bench/buffer-equivalence.mjs --mode both --base build --new build-p6 --quiet
node tests/bench/buffer-equivalence.mjs --mode both --base build --new build-p1 --quiet
```

读数原始文件：`tmp/team/dispatch-opt/{p2-r31,aa-r31,p1-equivalence,p6-equivalence,p6-vs-build}.txt`。

---

## 8. 未做 / 待定

- **profiler 复核**（`BasicDispatch.Transit` self 8.79% → ?）——建议写回后用 `tmp/prof-run.mjs` + `prof-summary` 补一次。
- **226 份全语料 A/B**——本轮只做了等价；d.ts 8 份的收益能否外推，需 `parse-perf --corpus` 或 `buffer-ab` 的 8 份以外语料确认。
- **D 类其它候选**：`BomChars`/`Quotes` 预编译 `Set`（2/3 项，无意义，且已被表覆盖）；减少 `unit.Last()`（plain 字符必须调一次来判 ⑥/⑦ 副作用，
  没有安全的删法）；`③` 的进一步削减（`pre === "/"` 已经短路 `IsUndo`，剩余成本在每字符一次 `Document.GetValue`，D1 已证没赚）。
- **更强的失效保护**：给 `SymbolTemplate` 的 mutator 加 revision + `Template.BasicClassTable` 校验，代价是每次调用多几次属性读
  （估计 ~0.5–1%；本轮 D1 的实测说明这类「省一次调用/加几次读」的微调都在噪声带内，故不做）。
