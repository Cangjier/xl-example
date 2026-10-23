# 落地：驱动窗口 32→128 + `BasicDispatch` 分类表（2026-10-23）

STATUS: **已落地**（3 个 `.xl.md`，重新生成 `dist/` + `build/`，+292/−38 行）；等价 + 七道门全绿；
8 份 d.ts 同进程 A/B **+10.1%（逐文件中位之和）/ +10.2%（每轮合计中位）**。
本页同时给出**以 TypeScript 官方解析器为基准**的前后对照（§4）。

取舍依据见 [`docs/opt-basic-token-gc-analysis.md`](opt-basic-token-gc-analysis.md)（分析报告）与
`docs/opt-basic-token-gc-evidence/`（画像/原型原始读数）。

---

## 1. 改了什么

| 文件 | 改动 | 性质 |
|---|---|---|
| `typescript/run/source-file-runner.xl.md` | `new SyntaxContext(root)` → `new SyntaxContext(root, 128)`（+ 说明窗口只影响调度粒度） | 运行层一行；**core 默认 `BufferSize` 仍是 32** |
| `core/syntax/templates/template.xl.md` | 新增 `field BasicClassTable:string = ""`（128 项 ASCII 分类表，懒建）+ `Initialize` 回调前清表 + 冻结契约说明 | core，+19 行 |
| `core/syntax/templates/basic-dispatch.xl.md` | `Transit` 重写为「查表 + 按原队列顺序处置」；新增 `Fallback`（原 ①–⑧ 全链，非 ASCII 用）、`BatchPlain`（原 ⑧ 整段收）、`BuildClassTable`、`IsPlainCode` 与 8 个位常量 | core，+~270 行 |

**等价性论证（写进 `.xl.md` 文档里）**：

- 分类表的每一位都是**建表时用模板自己的谓词**问出来的（`BomChars.includes`、`ShebangMarker` 首字符、
  `Quotes.includes`、三个开括号、`IsWhiteSpace`、`IsSymbol`、plain），没有写死 ASCII 假设；
  `code >= 128` 整条回退 `Fallback`（BOM 默认就是非 ASCII，ts 的空白表也含 NBSP/U+0085）。
- **判定顺序不变**：③「前一个字符是 `/`」仍对每个位置跑（run-batching 的语义雷区，不能跳）；
  ④⑤⑥⑦ 的相对次序不变；⑥/⑦ 的「收掉上一个未闭合 `WrapSymbol` / `Symbol`」副作用显式保留
  （`TryToClose` 可能 `Built → Reload`）。
- 表的缓存挂在**模板实例**上（`Template.BasicClassTable`），不挂静态字段；模板在 parse 期只读，
  `Initialize` 会清表重建——契约写在 `Template.BasicClassTable` 与 `BuildClassTable` 的文档段。
- `basic-dispatch` 对 `Template` 只有类型引用，tsc 把 import 擦除，**没有引入 `template ↔ basic-dispatch` 的运行时循环**。

## 2. 构建、等价与门禁

| 步骤 | 命令 | 结果 |
|---|---|---|
| 静态检查 | `xl_check`（core + typescript → ts） | 872 file / **0 error** / 2439 warning（与落地前同数） |
| 生成 | `xl_build` | **3 written / 869 skipped / 0 error** |
| 孤儿 | `xl_orphans` | **0** |
| 编译 | `tsc -p tsconfig.json` | **0 error** |
| 等价（xml+digest） | `buffer-equivalence --mode both --base build-pre --new build` | 语料 **4,556 文件 / 7,837,812 字符**：xml PASS 4504 / FAIL 0 / ERROR 0 / **同错 52**，字节 **34,109,694 一致**；digest PASS 4504，token **797,790 一致** |
| 用例校验 | `tests/parse/validate.mjs` | 1719 条 / **0 不合格** |
| AST 逐节点 | `typescript/cases/ast-json-diff.mjs` | **6167 / 6167**，结构/位置/字段差 **0** |
| 真实 .d.ts | `typescript/cases/real-dts-ast.mjs` | 226 文件：解析成功 **226**、崩溃 0、AST 一致 **226** |
| token AST | `typescript/cases/token-ast.mjs --quiet` | total 1715 / ok 1705 / crash **0** / diff **0** / ts-invalid 10 |
| body-guide | `tests/body-guide/harness.mjs --all` | 35/35、25/25、23/23、16/16、util 10/10，fail 0 |
| 冒烟 | `SourceFileRunner.Parse(samples/hello.ts)` | 正常产出 XML（1,638 B） |

## 3. 性能（8 份 d.ts，同进程 A/B：`build-pre`（落地前） vs `build`（落地后））

`node tests/bench/buffer-ab.mjs --base build-pre --new build --repeat 15`（warmup 1，逐文件 A/B 交替）：

| 文件 | bytes | 落地前中位 ms | 落地后中位 ms | 提升% |
|---|---:|---:|---:|---:|
| `lib.dom.d.ts` | 2,349,483 | 323.190 | 291.086 | **9.93** |
| `lib.webworker.d.ts` | 787,076 | 121.743 | 107.167 | **11.97** |
| `typescript.d.ts` | 588,452 | 113.691 | 106.540 | **6.29** |
| `lib.es5.d.ts` | 218,972 | 31.406 | 25.899 | **17.53** |
| `lib.es2023.array.d.ts` | 40,197 | 3.954 | 3.388 | 14.33 |
| `lib.es2020.bigint.d.ts` | 38,258 | 5.096 | 4.465 | 12.38 |
| `lib.es2015.core.d.ts` | 22,824 | 2.978 | 2.668 | 10.42 |
| `lib.es2015.symbol.wellknown.d.ts` | 10,971 | 2.137 | 1.972 | 7.69 |
| **TOTAL（逐文件中位之和）** | | **604.195** | **543.186** | **+10.10%** |
| **TOTAL（每轮合计的中位）** | | **606.197** | **544.174** | **+10.23%** |

profile 对照（同语料 3 趟，profile 总时长 **2,915.9 → 2,627.6 ms，−9.9%**）：

| 项 | 落地前（窗口 32） | 落地后（窗口 128 + 表） |
|---|---:|---:|
| `BasicDispatch.Transit` self | 9.23% | **6.87%**（≈63 → 37 ms 折算；新增 `BatchPlain` 1.64% 是原 ⑧ 的主体） |
| `core/basic-tokens` 目录 | 10.21% | **8.88%** |
| `core/syntax`（不含 basic-tokens） | 40.96% | 39.54% |
| `typescript/tokens`（形状层） | 29.82% | 31.19%（份额上升=分母变小） |
| GC | 7.44% | 7.59% |
| 三个 token ctor 合计 | 13.69% | 约 13.0%（BlockToken 5.22 + UnitToken 3.95 + Token 3.80） |

> profile 的绝对 ms 不能当基线（profiler 开销 +6%~+12%）；上表只比 self 份额，折算 ms 用干净 A/B 基线。

## 4. 以 TypeScript 为性能基准

`node tests/bench/perf-vs-ts.mjs`：同进程逐轮交替，`ours = SourceFileRunner.Parse`（shape 树），
`ts-np = ts.createSourceFile(setParentNodes=false)`、`ts-par = ...true`；TOTAL = 各文件 median 之和。
**口径限制不变**：ours 产物是 shape 树（不含 AST 投影），TS 产物是 AST，倍数只作量级参照。

### 4.1 8 份（全 `node_modules` 最大的 8 份 `.d.ts`：4,629 KB / 4.74 M 字符）

| 口径 | 落地前 | 落地后 | 变化 |
|---|---:|---:|---:|
| ours 总时间 | 713.89 / 719.55 ms | **651.70 / 626.83 ms**（两次样本） | **−8.7% ~ −12.9%** |
| ours 每字符 | 150.6 / 151.8 ns | **137.5 / 132.3 ns** | −9% ~ −13% |
| ts-np | 190.4 / 191.6 ms | 210.1 / 194.2 ms（TS 侧会话噪声 ±10%） | 40–44 ns/字符 |
| ts-par | 235.2 / 236.6 ms | 237.4 / 244.8 ms | 50–52 ns/字符 |
| **ours / ts-np** | **3.75× / 3.75×** | **3.10× / 3.23×** | 比值降 14% ~ 17% |
| **ours / ts-par** | **3.03× / 3.04×** | **2.56× / 2.75×** | 比值降 9% ~ 16% |

### 4.2 226 份（`node_modules` 下全部 `.d.ts`：6,928 KB / 6.99 M 字符）

| 口径 | 落地前 | 落地后 | 变化 |
|---|---:|---:|---:|
| ours 总时间 | 1,140.38 / 1,139.58 ms | **1,019.78 / 973.20 ms** | **−10.6% ~ −14.6%** |
| ours 每字符 | 160.8 / 160.6 ns | **143.8 / 137.2 ns** | −11% ~ −15% |
| **ours / ts-np** | **3.96× / 3.73×** | **3.42× / 3.34×** | 比值降 8% ~ 14% |
| **ours / ts-par** | **3.14× / 3.31×** | **2.68× / 2.81×** | 比值降 15% ~ 19% |

**怎么读：**

1. **不比旧文档的 9.51× / 7.32×**（`docs/perf-summary.md` §1）：那份是 **run-batching 之前**的树
   （同语料 1,696.5 ms）。当前树在落地前就已经是 **713.9~719.6 ms（快 2.36×）**，落地后 **626.8~651.7 ms（快 2.60~2.71×）**；
   9.51× → 3.75× 的差主要是 run-batching（`9e13943d`）的贡献，本轮两刀只占其中的 +10%~+11%。
2. **TS 侧读数在会话间有 ±10% 抖动**（8 份 ts-np 190 → 210 ms），所以「比值」的降幅区间宽；
   ours 的 ns/字符 更稳（150.6 → 132~138、160.7 → 137~144），以它为准更可靠。
3. **剩余差距的构成**（落地后 profile）：形状层 `typescript/tokens` **31.2%**、token ctor **~13%**、
   `BasicDispatch` 6.9%、GC 7.6%。也就是说 basic token 层已经不再是主要成本，**再往下的大块在形状层**；
   继续压到 2× 以内需要动形状构建（另一条线，不在本轮范围）。
4. **产物不同**：ours 少建 AST、TS 多建 parent 指针；`ts-par/ts-np ≈ 1.2×` 说明 parent 指针只解释一小部分，
   但两棵树的字段/后处理本就不同，**比值不能换算成等价实现的工作量**。

## 5. 风险与不变量

- **模板分类冻结**（主要契约）：表是第一次 `Transit` 时模板谓词的快照；建表后再改
  `BomChars` / `Quotes` / `SymbolTemplate.Ban|Allow` 会静默错分词。`Template.Initialize` 清表重建；
  本仓唯一用法满足「parse 前配置、parse 期间只读」。要更强保证需给 `SymbolTemplate` 的 mutator 加 revision（本轮不做）。
- **非 ASCII 全回退**：CJK 标识符语料没有加速（本仓只有 ts 模板）。
- **③ 与 ⑥/⑦ 副作用不能简化**：等价性 PASS 的前提；已在 `.xl.md` 文档里逐条写明。
- 窗口 128 只改调度粒度：全语料 XML 逐字节等价（4,556 文件）、七道门全绿；core 默认值保持 32，
  其它语言的装配不受影响。

## 6. 复现

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example

# 0) 产物（本次已生成；重来一遍：xl_build [core,typescript]→ts，再 tsc）
node_modules\.bin\tsc.cmd -p tsconfig.json

# 1) 等价 + 门禁（build-pre = 落地前快照，gitignore；没有就按上一 commit 重建一份）
node tests/bench/buffer-equivalence.mjs --mode both --base build-pre --new build --quiet
node tests/parse/validate.mjs
node typescript/cases/ast-json-diff.mjs
node typescript/cases/real-dts-ast.mjs
node typescript/cases/token-ast.mjs --quiet
node tests/body-guide/harness.mjs --all

# 2) 性能 A/B（8 份 d.ts）
node tests/bench/buffer-ab.mjs --base build-pre --new build --repeat 15

# 3) 以 TS 为基准（8 份 / 226 份）
node tests/bench/perf-vs-ts.mjs --repeat 7
node tests/bench/perf-vs-ts.mjs --corpus --repeat 3

# 4) profile（可选）
node --cpu-prof --cpu-prof-dir=tmp/prof --cpu-prof-interval=100 tmp/prof-run.mjs build 2
node tests/bench/prof-summary.mjs tmp/prof/<CPU>.cpuprofile --top 45
```

原始读数：`tmp/lead-ab-landed.txt`、`tmp/lead-equiv-new.txt`、`tmp/lead-ts-before*.txt`、`tmp/lead-ts-after*.txt`、
`tmp/lead-prof-after/`（`tmp/` 在 `.gitignore`）。
