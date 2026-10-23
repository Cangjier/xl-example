# O4：basic token 的十条 `Transit` 融合成一个分派函数（task-23，branch `opt/dispatch`）

把 `Template.BasicBranchQueue()` 里**十条逐字符 `Transit`** 收成**一条**融合分派 `BasicDispatch.Transit`：
`UnitToken.Process` 每个位置只问一次「谁来接手」，认下之后的收尾 / 新开仍走原来那十条实现。

- 工作目录：`C:\Users\Admin\Documents\GitHub\xl-example-set\opt-dispatch`（独立 clone）
- 分支：`opt/dispatch`，base `opt/base-v2` @ `eee317c7`（已含 O1 `Document.WholeRange` 缓存与 O2 `value` 第 5 参）
- 环境：Windows 10 LTSC / Xeon 8378C / Node v24.21.0
- 改动文件：`core/syntax/templates/basic-dispatch.xl.md`（新增）+ `core/syntax/templates/template.xl.md`（队列只装一条）
- 未动：`unit-token.xl.md`（O3 并行）、`basic-tokens/**`（判据与副作用一处未改）、`typescript/**`

---

## 1. 读数与动机

base 的 profile（`docs/perf-profile-buffer.md`）：basic 分派占 self 22.3%，**每字符 3.37 次 `Transit`**；
`SourceRange.At` 6.28 次/字符、`Has` 8.06 次/字符是热路径上最贵的两项。

原因不是「十条都很贵」，而是**十条是串行问过去的**：一个字符要问 3.37 条才有人接手，而其中三条
（`AreaAnnotation` / `LineAnnotation` / `RegexToken`）为了判「前一个字符是不是 `/`」**各自回看一次 `index - 1`**——
每次回看是 `Has` + `At` 两次调用。于是同一个「前一个字符」被读了三遍。

融合分派做两件事：

1. **一次回看、三条共用**：三条注释 / 正则的前提都是 `pre === "/" && unit.IsUndo(preIndex)`，读一次就够；
2. **用最便宜的判据先筛掉不可能接手的**：`Bom` / `Shebang` / 字符串 / 括号这类只看当前字符就能判死的，先判死再决定要不要调用；
3. **判据与副作用仍只有一份实现**：筛过去之后原样转交给对应 `Transit`，本层**不复制**任何收尾 / 新开逻辑。

验收标准不是「变快」，而是「**可观测行为逐字节等价**」——所以下面每一条跳过都写了依据。

---

## 2. 分派规则表

`BasicDispatch.Transit(context, unit, buffer, index, value)` 的段落顺序与原队列**完全一致**。
「筛法」一列写的是**跳过**条件；不满足筛法就转交给对应 `Transit`，`Undo` 则继续落到下一段（与原队列继续问下一条同义）。

| # | Transit | 原接手判据 | 本层筛法（满足即跳过） | 跳过依据 |
| --- | --- | --- | --- | --- |
| ① | `Bom` | `value ∈ Template.BomChars` | `value ∉ BomChars` | 判据**只有**这一个（不看位置、不看树）；`Undo` 路径只读 |
| ② | `Shebang` | `value === marker[0]` 且 `index` 是文件头允许位、`marker.length === 2`、`whole[index+1] === marker[1]` | `value !== marker[0]` | 其余判据只会让结论更不成立；`Undo` 路径只读。先比字符还省掉它每次都取的 `unit.Data[0]` |
| ③ | `AreaAnnotation` | `pre === "/"` 且 `IsUndo(pre)` 且 `value === "*"` | `pre !== "/"` 或 `!IsUndo(pre)`（与 ④⑤ 共用一次回看） | 判据全在 `return Undo` 之前读完；`Undo` 不写树 |
| ④ | `LineAnnotation` | 同上，`value === "/"` | 同上 | 同上 |
| ⑤ | `RegexToken` | 同上，`value !== "/"`，**再加**起点判据（跳过 trivia 取前一个代码单元 + `RegexTemplate.CanStart`） | 前提不成立 | 起点判据不复制：前提成立就原样调用，它自己可能 `Undo`，那就继续往下 |
| ⑥ | `StringGuide` | `value ∈ StringTemplate.Quotes` | `value ∉ Quotes` | 判据就是那一次 `includes`；`Undo` 路径只读 |
| ⑦ | `Bracket` | `value ∈ "(" "{" "["` | 不在三者 | `{` 在 `\u{…}` 转义里会让位（`Undo`），所以认下也必须走「`Undo` 就继续」的链式语义 |
| ⑧ | `WrapSymbol` | `IsWhiteSpace(value)`；**或**非空白且 `last` 是未关闭的 `WrapSymbol`（它要收尾那个空白块） | 两者都不成立 | 非空白时它唯一的写操作就是「收尾上一个空白块」，那件事只可能发生在 `last instanceof WrapSymbol && !last.Closed` |
| ⑨ | `Symbol` | `IsSymbol(value)`；**或** `last` 是未关闭的 `Symbol`（它要收尾那个符号块，可能 `Reload`） | 两者都不成立 | 两个条件都不成立时它整条路径只读纯判据（`IsInUnicodeBraceEscape` / 指数前缀 / 转义起点 / 组合符号表）后 `Undo`，无副作用 |
| ⑩ | `Common` | 兜底（标识符 / 数字 / 布尔） | **不筛** | 它含「转义标识符起点」这类跨位置判定，本层不复制，原样调用 |

### 2.1 为什么「转交」而不是「重写」

`AreaAnnotation` / `LineAnnotation` / `RegexToken` / `Bracket` / `StringGuide` / `WrapSymbol` / `Symbol` / `Common` 的
接手路径都要**写树**：`unit.Undo(preIndex)` 退回已吃掉的 `/`、`TryToClose` 关闭上一个单元、`Add` 新单元、`SignIn`/`SignOut`、
`OnBracketCreatedEvent` 通知父单元……这些逻辑一旦复制就是第二份实现，两份必然漂移。
所以本层只做**判定**（纯读），**动作**全部留在原 `Transit` 里：

```ts
if (符号类判据成立) {
  const state = Symbol.Transit(context, unit, buffer, index, value);
  if (state !== BranchStates.Undo) return state;   // Done / Reload 原样上报
}
// Undo → 落到下一段，等价于原队列「继续问下一条」
```

这也是本项为什么是「中高风险但保守」：融合的是**调度**，不是语义。

### 2.2 两个容易做错的地方（都按「宁可少省」处理）

1. **`Undo` 不是「什么都不做」。** `WrapSymbol` 在非空白字符上会收尾上一个空白块、`Symbol` 在非符号字符上会收尾上一个符号块
   （还可能建出形状返回 `Reload`）。所以这两条的筛法把「`last` 是未关闭的同类块」也放进「必须调用」的一侧，而不是只看字符类。
2. **`Undo` 之后必须落到下一段。** 被转交的 `Transit` 仍可能 `Undo`：`Shebang` 的位置判据、`RegexToken` 的起点判据、
   `Bracket` 的 `\u{…}` 让位、`Symbol` 的指数符号 / 转义让位、`WrapSymbol` 的空块收尾。
   每一段都是「不是 `Undo` 就返回，是 `Undo` 就继续」，与原来队列里继续问下一条完全一致。

### 2.3 一个已知但不影响的遗留

`template.xl.md` 仍保留那十条 basic token 的 `import`，生成的 `template.ts` 里因此有十条未使用的 import。
它们不改变行为（`BasicDispatch` 本来就要装载这些模块），保留是为了不额外改变模块装载顺序；
`tsc` 未开 `noUnusedLocals`，不产生诊断。

---

## 3. 正确性验证

### 3.1 重建

| 步骤 | 命令 | 结果 |
| --- | --- | --- |
| 生成 | `xl build`（core + typescript，target ts） | **871 written / 0 error**；本次改动只重生成 2 个文件 |
| 编译 | `tsc -p tsconfig.json` | **exit 0** |

### 3.2 双通道等价（`tests/bench/buffer-equivalence.mjs --mode both`）

| 通道 | PASS | FAIL | ERROR | 同错（基线也错） | 规模 |
| --- | --- | --- | --- | --- | --- |
| xml（逐字节） | 4504 | **0** | **0** | 52 | 4556 文件 / 7,837,812 字符；基线 34,109,694 B = 实验 34,109,694 B |
| digest（构造器 + `[Start,End)` + Temp） | 4504 | **0** | **0** | 52 | token 数 797,790 = 797,790 |

附带读数：整轮解析 **6233.6 ms → 5362.4 ms**（同一进程内两侧各跑一遍，−14.0%）。

### 3.3 T3a 798 组 A/B（`T3a-ab-basic.cjs` 的改写版）

原脚本两侧是「旧逐字符 `Source` 模型（主仓 build）vs 新 buffer 模型（本仓 build）」，本仓的 `build-base` 与 `build`
属于**同一代 API**，所以直接把两侧都指到新版实现：参考侧 `build-base`（十条队列）、实验侧 `build`（融合分派）。

- 改写脚本落在 `tmp/T3a-ab-dispatch.cjs`（`tmp/` 入 gitignore，不入库）；沿用原文件的 57 条输入、2 种模板配置、7 种窗口大小
- 比较口径：XML 逐字节 + 逐节点 `[构造器名, StartIndex, EndIndex]` + `root.Unclaimed`
- 结果：**798/798 comparisons identical**（FAIL 0）

覆盖到的正是本次最危险的几类字符：`/* */`、`//`、`#!`、BOM（含 mid-code）、`/` 正则与除号、`\u{…}` 转义标识符、
组合符号、`.5` / `1.e5`、空白块、括号。

### 3.4 六道门禁

| # | 门禁 | 目标 | 实测 | 判定 |
| --- | --- | --- | --- | --- |
| 1 | `tests/parse/validate.mjs` | 1719 / 0 | **1719 条 / 0 不合格** | PASS |
| 2 | `ast-json.mjs` + `ast-json-diff.mjs` | 6167 / 6167，位置差 0 | **6167/6167**，结构差 0 / 位置差 0 / 字段差 0 | PASS |
| 3 | `real-dts-ast.mjs` | 226 / 0 / 0 | **226 解析成功、崩溃 0、AST 差异 0** | PASS |
| 4 | `token-ast.mjs` | 1715 / 1705 / 0 / 0 / 10 | **total 1715、ok 1705、crash 0、diff 0、ts-invalid 10** | PASS |
| 5 | `body-guide/harness.mjs --all` | 109 / 109 | **35+25+23+16+10 = 109 pass / 0 fail** | PASS |
| 6 | `cache-share/check.mjs` | 5 / 5 | **5/5 PASS** | PASS |

---

## 4. 性能

### 4.1 `tests/bench/buffer-ab.mjs --repeat 7`（同进程交替，两轮）

| 轮次 | TOTAL（逐文件中位之和） | 提升 | TOTAL（每轮合计中位） | 提升 |
| --- | --- | --- | --- | --- |
| 第一轮 | 1435.96 → 1150.12 ms | **+19.91%** | 1424.97 → 1152.73 ms | **+19.11%** |
| 第二轮 | 1338.09 → 1112.17 ms | **+16.88%** | 1360.30 → 1120.44 ms | **+17.63%** |

两轮逐文件（中位，ms）：

| 文件 | 第一轮 基线 → 实验 | 第二轮 基线 → 实验 |
| --- | --- | --- |
| `lib.dom.d.ts`（2.35 MB） | 756.81 → 591.84（+21.8%） | 709.52 → 573.89（+19.1%） |
| `lib.webworker.d.ts` | 294.83 → 238.28（+19.2%） | 265.97 → 226.45（+14.9%） |
| `typescript.d.ts` | 292.47 → 238.76（+18.4%） | 278.88 → 233.15（+16.4%） |
| `lib.es5.d.ts` | 60.62 → 56.63（+6.6%） | 55.47 → 55.03（+0.8%） |

小文件（es2023.array / es2020.bigint / es2015.core / symbol.wellknown）两轮在 +11%～+29% 之间，绝对量小、抖动大。

### 4.2 `tests/bench/parse-perf.mjs`（实验侧绝对值）

| 档 | 读数 |
| --- | --- |
| `--dts` 默认 8 份（4,056,233 B） | TOTAL median **1180.1 ms**；复跑一次 **1155.8 ms** |
| `--single` N=4000 | 17.24 ms（4.31 µs/token） |
| `--multi` n=1000 | 11.75 ms（11.75 µs/member） |

### 4.3 `tests/bench/dts-cost-probe.mjs --count`（分派次数，改前 / 改后）

| 指标（每字符） | `lib.dom.d.ts` | `lib.webworker.d.ts` | `typescript.d.ts` |
| --- | --- | --- | --- |
| **`static:*.Transit` 合计** | **3.153 → 0.697（−77.9%）** | **3.742 → 0.825（−78.0%）** | **6.946 → 1.531（−78.0%）** |
| 其中 `BasicDispatch.Transit`（新） | — → 0.334 | — → 0.396 | — → 0.740 |
| 其中 `Common.Transit`（保留） | 0.236 → 0.236 | 0.282 → 0.282 | 0.503 → 0.503 |
| 其中 `WrapSymbol.Transit`（只在空白 / 空块收尾） | 0.327 → 0.094 | 0.389 → 0.110 | 0.731 → 0.239 |
| 其中 `Symbol.Transit`（只在符号 / 符号块收尾） | 0.261 → 0.025 | 0.311 → 0.030 | 0.542 → 0.041 |
| 其中 `Bom` / `Shebang` / `AreaAnnotation` / `LineAnnotation` / `RegexToken` / `StringGuide` / `Bracket` | 各 0.33 左右 → **0.001～0.006** | 各 0.39 左右 → **0.001～0.006** | 各 0.74 左右 → **0.001～0.006** |
| `SourceRange.At` | 4.014 → 3.353（−16.5%） | 4.826 → 4.042（−16.2%） | 6.110 → 4.636（−24.1%） |
| `SourceRange.Has` | 5.670 → 4.349（−23.3%） | 6.604 → 5.036（−23.7%） | 8.572 → 5.624（−34.4%） |
| 探针内单次 parse | 1525.8 → 1149.8 ms | 527.4 → 398.7 ms | 637.5 → 411.1 ms |

`BasicDispatch.Transit` 的 0.334 / 0.396 / 0.740 正好等于原来 `Bom.Transit` 的计数——即「队列被问到的字符数」没有变，
变的是**每个这样的字符只问一次**，其余约 2.4 次调用被筛掉了。

---

## 5. 风险与回滚

| 风险 | 处置 |
| --- | --- |
| 某条筛法在某类字符上不成立 | 筛法只做「纯读判定」，且**筛过去就一定转交原实现**；最坏情况是多调一次或少调一次纯查询，不改变树。等价与门禁是最终判据 |
| 原 `Transit` 的 `Undo` 路径未来新增写操作 | 本层筛法依赖「`Undo` 不写树」；以后再给那些 `Transit` 加副作用时，必须同步复核 `basic-dispatch.xl.md` 的注释与筛法 |
| 回滚点 | 只动两个文件：`Template.BasicBranchQueue()` 改回十条 `Sequence` 构造即完整回滚（`basic-dispatch.xl.md` 可留可删，无引用） |

单文件回滚：

```ts
// template.xl.md
Template.BasicBranchQueueCache = new Sequence<BranchTransiter>([
  Bom.Transit, Shebang.Transit, AreaAnnotation.Transit, LineAnnotation.Transit, RegexToken.Transit,
  StringGuide.Transit, Bracket.Transit, WrapSymbol.Transit, Symbol.Transit, Common.Transit,
]);
```
