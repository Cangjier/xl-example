# basic token 的「逐字符消费」改「整段收」：实测 +33.6% ~ +37.5%

STATUS: **已落地（4 个 `.xl.md` + 重新生成 `dist/`/`build/`），等价 + 七道门全绿。**
原型先在 `build/` 副本上按 E4 → E5 → E6 → E7 逐级实测（`build-e4` / `build-e45` / `build-e456` / `build-e7`，均 gitignore），
然后写回源码：`area-annotation.xl.md`、`wrap-symbol.xl.md`、`basic-dispatch.xl.md`、`unit-token.xl.md`。
落地后按「源码构建版」重跑等价与门禁，读数见 §0.1。

一句话：上一份 `opt-basic-token-source-range.md` 说「再省读字符收益已经很小」——这句在 **SourceRange 上成立**，
但在 **basic token 的「每字符一帧」上不成立**。把「块注释正文 / 空白段 / Common（标识符·数字）正文」这三类
连续字符从「逐字符 Process + 逐字符分派」改成「窗口内一次扫完」，8 份 d.ts 从 **939 ms 降到 599 ms（+35.7%，4 次原型测量 +33.6% ~ +37.5%）**，
等价性与七道门全绿。

修正点：旧文档 §5 的 P2 把「注释整体扫描」估成 **2~4%**，实测 **+9~11%**（E4 三次 A/B：+11.01 / +13.25 / +9.18）。
低估的原因见 §2.1：当时只数了 callee（`ExitOrPre` 2.4M + `Default` 2.37M + `Tmp +=`），
漏掉了每字符的**驱动帧**（Process 的父单元检查 / 消息检查 / `ValueAt` / 下标簿记 / while 开销）——
删掉整帧比删 callee 贵得多。

## 0.1 落地后复核（源码构建版，`build-e1`（E1）vs `build`（E1+本轮））

| 项 | 读数 |
|---|---|
| 等价（4556 文件 / 7,837,812 字符，xml+digest） | **PASS 4504 / FAIL 0 / ERROR 0 / 同错 52**；字节 34,109,694 一致、token 797,790 一致 |
| 8 份 d.ts，`buffer-ab --repeat 11` | 基线 931.840 ms → 实验 599.450 ms；逐文件中位之和 **+35.67%**、每轮合计中位 **+34.98%** |
| 逐文件提升 | `lib.dom` +33.98%、`lib.webworker` +34.74%、`typescript.d.ts` +41.02%、`lib.es5` +38.39%、其余 +26.57% ~ +35.27% |
| `xl_build`（core+typescript → ts） | **0 error** / 2439 warning（与 E1 后基线同）；`xl_orphans` 0；`tsc -p tsconfig.json` **0 error** |
| validate | 1719 条，**0 不合格** |
| ast-json / ast-json-diff | 6167/6167、cj-fail 0；结构/位置/字段差 **0** |
| real-dts | 226/226 成功，崩溃 0，AST 差异 **0** |
| token-ast | total 1715 / ok 1705 / crash **0** / diff **0** / ts-invalid 10 |
| body-guide | 35/35、25/25、23/23、16/16、util 10/10，fail 0 |

与 §3 的原型测量（+33.6% ~ +37.5%）一致：收益来自源码实现，不是补丁方式或生成物差异。


---

## 1. 起点：钱到底花在哪（8 份 d.ts，4,067,441 字符）

用 `tmp/count-classes.mjs`（只数调用，不测时间，与 A/B 同一批 8 份语料）量出的字符构成：

| 字符去向 | 字符数 | 占比 | 现在每个字符要付什么 |
|---|---:|---:|---|
| `AreaAnnotation.Default`（块注释正文） | **2,395,796** | **58.9%** | 一帧 `UnitToken.Process`（父单元/消息/Mounted 检查 + `ValueAt` + 下标更新）+ `ExitOrPre` + `Tmp +=` |
| `AppendAndSignOut:Common`（标识符/数字正文） | **1,132,850** | **27.8%** | 一帧 + `BasicDispatch.Transit` ①–⑦ 全部判定 + `Common.Transit` + `IsAppend` + `AppendAndSignOut`（`SignOut` + `Temp +=`） |
| `AppendAndSignOut:WrapSymbol`（空白） | 334,489 | 8.2% | 一帧 + ①–⑥ 判定 + `WrapSymbol.Transit` + `AppendAndSignOut` |
| `AppendAndSignOut:Symbol`（符号） | 113,441 | 2.8% | 一帧 + ①–⑦ 判定 + `Symbol.Transit` |
| `String.Default`（字符串） | 29,526 | 0.7% | 独立 `String.Process` 循环 |
| 其余（括号字符、注释/字符串开闭） | ~61,000 | 1.6% | 括号帧（`Bracket.Process` + `ExitOrPre`） |

同一语料上的调用计数（每 parse 一次 8 份，`build` = E1 落地版）：

| 调用 | 次数 | 每字符 |
|---|---:|---:|
| `SourceRange.ValueAt` | 5,636,542 | 1.386 |
| `AreaAnnotation.Default` | 2,395,796 | 0.589 |
| `BasicDispatch.Transit` | 1,628,920 | 0.400 |
| `Bracket.ExitOrPre` | 1,464,333 | 0.360 |
| `AppendAndSignOut:Common` | 1,132,850 | 0.279 |
| `SourceRange.Has` / `At` | 757,207 / 681,921 | 0.186 / 0.168 |

结论：**basic token 层的钱几乎全在「每字符走一遍 JavaScript 帧」上**，不在 `SourceRange` 的微调用上。
把「一段连续字符」改成一次原生扫描（`GetRaw` + `indexOf`/`charCodeAt`/`substring`），
一能删掉整帧，二能把 2.4M 次 `ValueAt`（`SourceRange.ValueAt → Document.GetValue` 闭包）换成每窗口一次切片。

---

## 2. 四个候选（都只在 `build/` 副本上做，逐个叠加）

### 2.1 E4：块注释正文整段收（`AreaAnnotation` 覆写 `Process`）

做法：挂载后本单元只吃字符到 `*/`。在一个窗口内直接
`const raw = document.GetRaw(index, buffer.End)`，
`raw.indexOf("*/")` 命中就把 `raw.substring(0, close)` 一次追加进 `Tmp`、`SignOut(slash+1)`、`TryToClose`、`Quit`；
没命中就把整窗剩余一次追加、`context.Index = buffer.End`。
结束序列跨窗口时（窗口以 `*` 收尾）用 `this.Tmp.endsWith("*") && document.GetValue(index) === "/"` 收口，
把原来「每个 `/` 回看前一个字符 + 用 `Undo` 删掉 `*`」合并成「切片本来就不含结尾的 `*`」。

为什么等价：
- 注释挂载期间没有任何其它单元会在同一窗口里插进来，驱动帧里的父单元/消息检查一窗做一次就够；
- 唯一的状态是 `Tmp`，逐字符追加与整段追加只在「中间态」不同，`Tmp` 的终值一致；
- 结尾 `*` 原本是「先追加、再由 `Undo` 删掉」，切片从构造上就不追加它；
- 跨窗口的 `*` 由 `Tmp.endsWith("*")` 精确识别（`Tmp` 末尾就是 `index-1` 那一格）。

读数（`buffer-ab`，8 份 d.ts，`--repeat 7`，两列分别是「逐文件中位之和」「每轮合计中位」的提升）：

| 轮次 | E4 vs build |
|---|---:|
| #1 | **+11.01% / +10.07%** |
| #2 | **+13.25% / +10.28%** |
| #3 | **+9.18% / +9.32%** |

### 2.2 E5：空白段整段收（`WrapSymbol.Transit`）

做法：`value` 是空白时，从 `index+1` 扫到窗口尾（`IsWhiteSpace`），一次 `AppendAndSignOut(runText, at-1)`，
`context.Index = at`；新建 `WrapSymbol` 时同样一次收完整段。
配套：`UnitToken.Process` 的 Done 分支把 `this.LastIndex = index` 改成 `this.LastIndex = context.Index - 1`
（单字符时等价；批量跳多格时才是对的）。

读数（E4+E5 vs E4）：

| 轮次 | E5 增量 |
|---|---:|
| #1 | **+3.92% / +4.32%** |

空白段在 d.ts 里平均只有 2.35 个字符（缩进 + 换行），所以收益明显小于注释。

### 2.3 E6：Common（标识符/数字）正文整段收（`BasicDispatch.Transit` ⑧ 前）

做法：走到 ⑧ 兜底 Common 之前，若当前字符是「plain 字符」（ASCII 字母/数字/下划线）：
- `last` 是未闭合 `Common` 且 `!last.HasBackslash` → 扫到窗口尾，一次 `AppendAndSignOut(runText, at-1)`；
- 否则（run 起点）且 `at > index+1`、`last` 不是未闭合 `Symbol`/`Common` → 先按原逻辑 `TryToClose`（可能 `Reload`），
  再新建 `Common` 一次收完整段。

**为什么放在 ⑧ 而不是函数最开头（很重要）**：③「前一个字符是 `/`」的判定必须先跑。
- `/` 后面可能是块注释、行注释或正则，这三条都挂在 ③；
- **不能**把 ③ 的判据换成廉价的「上一个单元是未闭合 `Symbol "/"`」：`unit.IsUndo` 走
  `WhichUnitRangeContains`，当 `Data` 里已经没有子单元覆盖那一格时它返回 `true` ——
  `/` 已经被形状消费（例如 `if (x) /re/`）时正则仍然要能起。这个坑是 E6 的第一版实测出来的，
  换了判据之后 7 个 unicode 转义用例 + 1 个 XML 用例立即红。

`\` 转义态（`last.HasBackslash`）一律退出批量、按原逐字符路径走，所以 `\u0061bc` / `\u{65}scaped`
这类输入行为不变（`tests/cases` 里的 7 条 unicode 用例在等价语料里）。

读数（E4+E5+E6 vs E4+E5）：

| 轮次 | E6 增量 |
|---|---:|
| #1 | **+26.88% / +26.30%** |

这是最大的一刀：Common 正文占 27.8% 的字符，而每个字符要付 `BasicDispatch` 的 ①–⑦ 全链 + 一次 `Common.Transit`。

### 2.4 E7：窗口内扫描改用切片（`GetRaw` + `charCodeAt/substring`）

E5/E6 的扫描原来逐字符 `document.GetValue(at)`（又是一次闭包调用），改成先 `GetRaw(index, end)` 一次，
再用 `charCodeAt(offset)` / `substring` 扫，窗口内直接复用同一个字符串。

读数（e7 vs e456，`--repeat 9`）：

| 轮次 | E7 增量 |
|---|---:|
| #1 | **+3.62% / +4.78%** |

这一刀合并测量时已掉进噪声（见 §3），但成对 A/B 是正向的，且实现只有几行，建议随 E5/E6 一起落。

---

## 3. 合并读数

`node tests/bench/buffer-ab.mjs --base build --new build-e7 --repeat 11`（8 份 d.ts，4 次独立运行）：

| 运行 | 基线（逐文件中位之和） | 实验 | 逐文件之和提升 | 每轮合计中位提升 |
|---|---:|---:|---:|---:|
| #1 | 988.731 | 665.528 | +32.69% | +33.30% |
| #2 | 939.136 | 600.320 | +36.08% | +36.82% |
| #3 | 938.876 | 587.000 | +37.48% | +36.09% |
| #4 | 926.767 | 615.661 | +33.57% | +34.02% |
| #5（代表） | 919.254 | 595.656 | **+35.20%** | **+35.98%** |

中位约 **+35.6% / +36.0%**，范围 **+33.6% ~ +37.5%**。A/A 对照（`build` vs `build` 的复制 `build-aa`）
是 **−0.39% / −2.40%**，即本机噪声带约 ±2.4%——所有读数都在噪声带之外一个数量级。

代表运行的逐文件读数（#5）：

| 文件 | bytes | 基线中位 | 实验中位 | 提升% |
|---|---:|---:|---:|---:|
| `lib.dom.d.ts`（2.35MB） | 2,349,483 | 485.803 | 323.752 | **33.36** |
| `lib.webworker.d.ts`（787KB） | 787,076 | 178.283 | 122.790 | **31.13** |
| `typescript.d.ts`（588KB） | 588,452 | 189.990 | 108.178 | **43.06** |
| `lib.es5.d.ts`（219KB） | 218,972 | 45.236 | 26.757 | **40.85** |
| `lib.es2023.array.d.ts` | 40,197 | 6.163 | 4.114 | 33.26 |
| `lib.es2020.bigint.d.ts` | 38,258 | 6.885 | 4.955 | 28.02 |
| `lib.es2015.core.d.ts` | 22,824 | 4.072 | 2.892 | 28.98 |
| `lib.es2015.symbol.wellknown.d.ts` | 10,971 | 2.822 | 2.218 | 21.42 |

另一种口径（`buffer-equivalence` 的 4556 文件 / 7,837,812 字符语料，单次 parse 墙钟）：
**5,464.7 ms → 4,130.1 ms（−24.4%）**。语料里代码占比高于注释，所以比 d.ts 档低是正常的。

---

## 4. 调用计数（与计时噪声无关）

同 `tmp/count-reads.mjs` / `tmp/count-classes.mjs` 口径，8 份 d.ts：

| 口径 | build（E1） | e7（E4+E5+E6+E7） | 变化 |
|---|---:|---:|---:|
| `BasicDispatch.Transit` | 1,628,920 | 470,903 | **−71.1%** |
| `Bracket.ExitOrPre` | 1,464,333 | 431,793 | **−70.5%** |
| `AreaAnnotation.Default` | 2,395,796 | **0** | **−100%** |
| `AppendAndSignOut:Common` | 1,132,850 | 149,986 | **−86.8%** |
| `AppendAndSignOut:WrapSymbol` | 334,489 | 159,336 | −52.4% |
| `AppendAndSignOut:Symbol` | 113,441 | 113,441 | 不变 |
| `SourceRange.ValueAt` | 5,636,542 | 914,682 | **−83.8%** |
| `SourceRange.At` | 681,921 | 616,755 | −9.6% |
| `SourceRange.Has` | 757,207 | 626,875 | −17.2% |
| 字符读取（At+ValueAt） | 6,318,463 | 1,531,437 | **−75.8%** |

> 注：E6 的批内扫描走 `Document.GetValue`/`GetRaw`，不再经 `SourceRange`，所以**真实字符读取降幅还大于表里的 −75.8%**。
> 每字符的 `At` 从 E1 后的 0.168 次降到 0.152 次，剩下的 90% 已经不在 basic token 层（见 §8）。

---

## 5. profile 前后（self time，同一批 8 份 d.ts）

| 函数 | E1（`build`） | E4–E7（`build-e456`） |
|---|---:|---:|
| `UnitToken.Process` | **15.86%** | **5.47%** |
| `BasicDispatch.Transit` | **13.21%** | **8.79%** |
| `Common.Transit` | 4.48% | 掉出前 35 |
| `AreaAnnotation.Default` | 2.98%（E1 之前口径；E1 后已不在前 45） | 0（被批处理取代） |
| `BlockToken` ctor | 4.38% | 4.61% |
| `Token` ctor | 2.00% | 3.56% |
| `UnitToken` ctor | 2.94% | 3.56% |
| `IsAppend` | 1.91% | 掉出前 35 |
| `GC` | 5.5% | **8.0%** |
| `WrapSymbol.Transit` | 1.50% | 2.90% |
| `AreaAnnotation.Process`（新） | — | 2.76% |
| `ComputePossibleShapesByIndex` / `ComputePossibleShapes` | 2.14% / 1.08% | 3.60% / 1.83% |

两次 profile 的 pass 数不同（3 vs 4 趟），只能比份额不能比绝对值：basic token 层从 ~40% 份额降到 ~25%，
**形状层与分配/GC 变成新的主角**。

---

## 6. 等价性证据（这一轮最硬的部分）

最终补丁集上跑了 `buffer-equivalence` + 仓库的七道门（把 `build-e7` 临时换到 `build` 位置跑完再换回）：

| 门 | 命令 | 结果 |
|---|---|---|
| 等价（xml+digest） | `node tests/bench/buffer-equivalence.mjs --mode both --base build --new build-e7 --quiet` | 语料 4556 文件 / 7,837,812 字符；xml PASS 4504 / FAIL 0 / ERROR 0 / 同错 52，字节 34,109,694 一致；digest PASS 4504，token 797,790 一致 |
| validate | `node tests/parse/validate.mjs` | 1719 条，**0 不合格** |
| ast-json-diff | `node typescript/cases/ast-json-diff.mjs` | 6167/6167 完全一致，结构/位置/字段差 **0** |
| real-dts | `node typescript/cases/real-dts-ast.mjs` | 226/226 解析成功，崩溃 0，AST 差异 **0** |
| token-ast | `node typescript/cases/token-ast.mjs --quiet` | total 1715 / ok 1705 / crash **0** / diff **0** / ts-invalid 10 |
| body-guide | `node tests/body-guide/harness.mjs --all` | 35/35、25/25、23/23、16/16、util 10/10，fail 0 |

「同错 52」是两版对同一输入抛同一个异常（含文本与 `^` 位置），属于等价。

---

## 7. 落地内容（已在本提交实施）

四刀落在 4 个 `.xl.md`：

| 文件 | 改动 |
|---|---|
| `core/syntax/basic-tokens/area-annotation.xl.md` | 新增 `## method Process` 覆写：窗口内 `GetRaw` + `indexOf("*/")` 整段收；跨窗口用 `Tmp.endsWith("*")` + 当前字符收口。文档写清 §2.1 的等价论证 |
| `core/syntax/basic-tokens/wrap-symbol.xl.md` | `static Transit`：空白段一次扫到窗口尾，`context.Index = at`；新建/续接两种路径都要整段 `AppendAndSignOut` |
| `core/syntax/templates/basic-dispatch.xl.md` | ⑧ 兜底前加 plain 字符整段收（E6），**位置必须在 ③ 之后**；`import CloseStates`（生成代码要用） |
| `core/syntax/unit-token.xl.md` | Done 分支 `LastIndex = context.Index - 1`（批量跳格后 `LastIndex` 才正确；单字符时与原值等价），并在文档里写清不变量 |

步骤（实际已执行，读数见 §0.1）：
1. 改 `.xl.md` → `xl_build`（core+typescript，target ts，**0 error / 2439 warning**）→ `xl_orphans`（0）→ `tsc -p tsconfig.json`（0 error）；
2. 复跑 §6 的等价 + 七道门（全绿）；
3. `buffer-ab --base build-e1 --new build --repeat 11`（+35.67% / +34.98%）；
4. 单独一个 commit（只含这 4 个 `.xl.md` + 本文档 + 旧文档的修正说明）。

风险点（都已实测过）：
- **③ 的前一字符判定不能省/不能换廉价判据**（§2.3），这是本改动唯一的语义雷区；
- 跨窗口：注释 `*/` 拆窗（`Tmp.endsWith("*")`）、空白/Common 段拆窗（扫到 `buffer.End`，下一窗续接）都必须保留；
- `Document.GetRaw` 现在是批量扫描的依赖：`TextDocument` 有实现，未来任何 `Document` 子类也必须实现；
- 真实 `.d.ts` 之外的长字符串/模板串没有改（`String.Process` 仍是逐字符），这是本轮的边界。

---

## 8. 还剩下什么（这一节回答「还有没有」）

按性价比排序，且都**不再建议继续投资 SourceRange 微调用**：

1. **`BasicDispatch.Transit` 还剩 8.79% self**（470,903 次）。E6 的批处理在 ⑧，每次 run 起点/边界仍要走完 ①–⑦。
   可在 **③ 之后**加「plain 字符快速出口」：plain 且 `StringTemplate.Quotes` 不含该字符 → 直接进 ⑧ 批处理，
   跳过 ④⑤⑥⑦。粗估 **2–4%**。注意 ①`BomChars` / ④`Quotes` 都是模板可配置的，不能写死 ASCII 假设。
2. **分配与 GC ≈ 20%**：`BlockToken`+`Token`+`UnitToken` ctor 合计 11.7% + GC 8.0%。
   每个 basic token 至少 `Token` + `SourceRange` + `Data[]` 三个对象；8 份 d.ts 每 parse 约 36.6 万个 block token。
   可做 `Data`/`SourceRange` 懒建（旧文档 P4），但 **O1 的教训是「分配 −81% 没转成墙钟」**；
   建议先用 `--trace-gc` 量本轮之后的 GC 暂停再决定，估计上限 **2–4%**，风险中-高。
3. **注释批处理残量 2.76%**：每 32 字符窗口一次 `GetRaw` + `indexOf` + `Tmp +=` 切片。
   再要降只能加大驱动窗口（`SyntaxContext.BufferSize`，牵动全部窗口语义）或跨窗口扫，**不建议**为 <1% 动。
4. **SourceRange：已冷**。剩余 `At` 616,755 / `Has` 626,875 里 basic token 层只占 ~5%
   （dispatch ③ 回看、注释收口）；其余 90% 在形状层——`statement-scanner`（11.6% 的 `Has`）、
   `member-boundary`、`line-terminator`、`property-signature` 等，属于「每 token 几次」的量级，
   不在「basic token / SourceRange」这个题里。**这一线到此为止，继续抠 SourceRange 的收益 <1%。**

---

## 9. 复现

本轮改动**已写回源码**（`core/syntax/basic-tokens/area-annotation.xl.md`、`wrap-symbol.xl.md`、
`core/syntax/templates/basic-dispatch.xl.md`、`core/syntax/unit-token.xl.md`）。
`build-e1` 是落地前的 E1 构建快照（gitignore），用来做落地后的等价与 A/B 基线；
`build-e4` / `build-e45` / `build-e456` / `build-e7` 是原型阶梯（gitignore），`tmp/` 下是临时脚本。

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example

# 0) 落地后的产物（已由 xl_build + tsc 生成；重来一遍）
#    xl_build: paths=[core,typescript], targets=[ts] → dist；再 tsc -p tsconfig.json → build
node_modules\.bin\tsc.cmd -p tsconfig.json

# 1) 等价（基线 = 落地前的 E1 构建快照）
node tests/bench/buffer-equivalence.mjs --mode both --base build-e1 --new build --quiet

# 2) A/B（8 份 d.ts）
node tests/bench/buffer-ab.mjs --base build-e1 --new build --repeat 11      # +34.98% ~ +35.67%

# 3) 门禁（直接对 build 跑）
node tests/parse/validate.mjs
node typescript/cases/ast-json.mjs
node typescript/cases/ast-json-diff.mjs
node typescript/cases/real-dts-ast.mjs
node typescript/cases/token-ast.mjs --quiet
node tests/body-guide/harness.mjs --all

# 4) 计数复核（§4）
node tmp/count-reads.mjs build-e1 8; node tmp/count-reads.mjs build 8
node tmp/count-classes.mjs build-e1 8
```

临时脚本（`tmp/` 均 gitignore）：`count-classes.mjs`（字符/单元工作量）、`count-reads.mjs`（At/Has/ValueAt，
已有）、`at-attrib.mjs`（At/Has 调用来源采样）、`prof-run.mjs`（指定 build 目录跑 profile）。

---

## 10. 一句话结论

**basic token 层的剩余性能空间不在 `SourceRange`，在「每字符一帧」**：把注释正文、空白段、Common 正文改成窗口内整段收，
等价 + 七道门全绿，8 份 d.ts **932ms → 599ms（+35%）**，`BasicDispatch` 调用 −71%、字符读取 −76%；
落地只动 4 个 `.xl.md`，代价是那一处「③ 的前一字符判定不能省」的语义雷区。
