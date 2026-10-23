# TypeScript 官方解析器基准对照（perf-vs-ts）

> 一句话：同一进程、同一批次内，shape 树解析（`SourceFileRunner.Parse`，不含 AST 投影）约为
> `ts.createSourceFile` 的 **8.5–9.0 倍**（`setParentNodes:false`）／**6.9–7.1 倍**（`setParentNodes:true`）；
> 按字符折算 ours ≈ **344–357 ns/char**，TS ≈ **38–41 / 48–51 ns/char**。
> **两者产物不同（shape 树 vs TS AST），倍数只作量级参照，不能当等价实现的比值用。**

- 提交：`integration-buffer` tip `f5a525c3`（本文档与 `tests/bench/perf-vs-ts.mjs` 是唯一新增文件，未改业务源码）
- 测量脚本：`tests/bench/perf-vs-ts.mjs`
- 语料：`node_modules` 下全部 `*.d.ts`（**226 份 / 6,928 KB / 7,093,846 字符**），默认取其中最大的 8 份

---

## 1. 环境与批次

| 项 | 值 |
|---|---|
| 机器 | Intel Xeon Platinum 8378C @ 2.80 GHz，Node 可见 16 逻辑核；32 GB 内存 |
| 系统 | Windows 10 企业版 LTSC（win32 x64） |
| Node | v24.21.0 |
| TypeScript | 6.0.3（`node_modules/typescript`，`tsc` 同版本） |
| 代码 | `integration-buffer` @ `f5a525c317d1d3c29f60a1dbee01d5c6dccebd6c` |
| 构建 | `xl_build`（core, typescript → ts）：871 written / 0 error；`tsc -p tsconfig.json`：0 error |
| 时间 | 2026-10-23 14:19–14:21（+08:00），四个批次连续跑完，中间无其他负载 |

> 纪律：本页所有数字来自**同一批次**（同机、同进程启动方式、数分钟内）。**不同时间批次的数字不要直接相减**；
> 想比较请重跑脚本，用当次同时测出的 ours / ts 对照。

---

## 2. 口径（必须和数字一起读）

| 标签 | 实际调用 | 产物 |
|---|---|---|
| **ours** | `SourceFileRunner.Parse(text, filePath)`，`build/ts/typescript/run/source-file-runner.js` | shape 树（`SourceFileShape`，含 template / possible-shape 机制）；**不含**后续 AST 投影 |
| **ts-np** | `ts.createSourceFile(name, text, ts.ScriptTarget.Latest, /*setParentNodes*/ false)` | TS AST，`parent` 指针未设置 |
| **ts-par** | 同上，`setParentNodes = true` | TS AST，带 `parent` 指针（建树时多一趟填 parent） |

口径的三个含义：

1. **ours 只到 shape 树**。项目里把 shape 树投影成 AST 的那一步不计入，因此本表回答的是"拿 shape 树"的成本，
   不是"拿一份完整 AST"的成本。若要和 TS 的 AST 逐节点对比，需要另加一次投影测量。
2. **TS 只解析、不建 Program、不做类型检查**。`createSourceFile` 是三者的公共下界（词法 + 语法 + 建节点）。
3. **产物不同**：shape 树是"可能的 shape + 模板"结构，TS AST 是语法节点树。同样一句 `interface X { a: string }`，
   两边建出的对象数量、字段、复用策略都不同。**倍数只能说明量级差距，不能说明"ours 等价于 N 份 TS"。**

---

## 3. 方法（脚本怎么做，为什么这样做）

- **同进程、逐轮交替**：一个进程里加载 ours 与 TS 两份实现，同一个文件在**相邻位置**依次测三个实现；每一轮轮换
  三个实现的先后顺序（`(round + slot) % 3`），抵消"总是第一个测 / 总是最后测"的偏置。
- **warmup 1 + repeat 5**：先整份语料三实现各跑一遍（不计时，让 JIT 与模板缓存进入稳态），再重复 5 轮计时。
- **每文件取 median**：5 个样本取中位数，抑制 GC 尖峰；**TOTAL = 各文件 median 之和**（不是"每轮总和的 median"），
  这样 TOTAL 与逐文件数字是同一套聚合口径。
- **I/O 不计时**：文件在计时前一次性读入（UTF-8 文本），计时窗口内只有解析调用；文本常驻内存（全语料 7.1 M 字符，可忽略）。
- **计时**：`process.hrtime.bigint()` 包住单次调用，毫秒保留 2 位小数。**不用 profiler 计时**（profiler 的插桩会改变
  各实现相对成本，只用它看热点，不用它出数）。
- **稳定性自检**：同一批次把 8 份与 226 份各跑两遍（见 §6）。脚本每次运行是独立进程，不复用上一轮堆状态。
- **8 份的选取规则**：`node_modules/**/*.d.ts` 按字节降序取前 8（脚本自动排序，不写死文件名）。因此 8 份里有
  `typescript/lib/*` 也有 `@types/node/*`，是 226 份语料的"头部"，不是只挑 TS 自带 lib。
- **失败处理**：某实现某文件抛错则记录并跳过该文件（不进 TOTAL）；本次两轮均 0 失败、0 跳过。
- **可复现**：`--repeat/--warmup/--top/--corpus/--filter` 均可调；`--json` 输出机器可读结果（含 commit、时间、耗时）。

---

## 4. 8 份最大 d.ts（Run A，2026-10-23 14:19:48 +08:00）

| 文件 | KB | ours ms | ours ms/KB | ts-np ms | ts-np ms/KB | ours/ts-np | ts-par ms | ts-par ms/KB | ours/ts-par |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `typescript/lib/lib.dom.d.ts` | 2,294.4 | 721.99 | 0.315 | 84.55 | 0.037 | **8.54×** | 103.30 | 0.045 | **6.99×** |
| `typescript/lib/lib.webworker.d.ts` | 768.6 | 297.11 | 0.387 | 30.43 | 0.040 | **9.76×** | 40.05 | 0.052 | **7.42×** |
| `typescript/lib/typescript.d.ts` | 574.7 | 310.09 | 0.540 | 28.58 | 0.050 | **10.85×** | 41.52 | 0.072 | **7.47×** |
| `@types/node/inspector.generated.d.ts` | 223.0 | 101.64 | 0.456 | 9.50 | 0.043 | **10.70×** | 12.85 | 0.058 | **7.91×** |
| `@types/node/crypto.d.ts` | 222.7 | 64.68 | 0.290 | 8.57 | 0.038 | **7.55×** | 10.63 | 0.048 | **6.09×** |
| `typescript/lib/lib.es5.d.ts` | 213.8 | 60.70 | 0.284 | 10.09 | 0.047 | **6.02×** | 11.33 | 0.053 | **5.36×** |
| `@types/node/fs.d.ts` | 198.8 | 49.09 | 0.247 | 9.20 | 0.046 | **5.34×** | 14.18 | 0.071 | **3.46×** |
| `@types/node/http2.d.ts` | 132.6 | 53.76 | 0.405 | 6.35 | 0.048 | **8.46×** | 7.29 | 0.055 | **7.37×** |
| **TOTAL（8 份）** | **4,629** | **1,659.05** | **0.358** | **187.27** | **0.040** | **8.86×** | **241.15** | **0.052** | **6.88×** |

- 8 份合计 4,739,479 字符；ours ≈ **350.0 ns/char**，ts-np ≈ **39.5 ns/char**，ts-par ≈ **50.9 ns/char**。
- 逐文件倍数散布 **5.3×–10.9×**（ts-np）／**3.5×–7.9×**（ts-par）。文件越"声明密集"（`typescript.d.ts`、
  `inspector.generated.d.ts`）倍数越高；`lib.es5.d.ts`、`fs.d.ts` 偏低。**不要用单文件倍数代表整体**。
- `fs.d.ts` 的 ts-par 14.18 ms 是本轮离群点（另一轮 11.3 ms，−20%）；它是 198 KB 档里 `setParentNodes` 的抖动，
  不是 ours 变了（ours 两轮 49.09 / 48.96 ms，差 0.2%）。

---

## 5. 226 份语料（`--corpus`）

| 批次 | 文件 | KB | 字符 | ours ms | ours ms/KB | ts-np ms | ts-np ms/KB | ours/ts-np | ts-par ms | ts-par ms/KB | ours/ts-par |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| A（14:20:16） | 226 | 6,928 | 7,093,846 | 2,535.04 | 0.366 | 281.61 | 0.041 | **9.00×** | 360.73 | 0.052 | **7.03×** |
| B（14:20:37） | 226 | 6,928 | 7,093,846 | 2,441.42 | 0.352 | 289.57 | 0.042 | **8.43×** | 350.52 | 0.051 | **6.97×** |

- 每字符：A 轮 ours **357.4 ns** / ts-np **39.7 ns** / ts-par **50.9 ns**；B 轮 ours **344.2** / ts-np **40.8** / ts-par **49.4**。
- 语料从 8 份扩到 226 份，TOTAL 倍数基本不变（8.86× → 9.00× / 8.43×），说明倍数不是"只挑大文件"造成的；
  小文件的单文件倍数更抖（±20% 常见），但合计后互相抵消。
- 两轮 226 份合计 ours 2,441–2,535 ms，即 **单份平均约 10.8–11.2 ms**；TS 约 1.25–1.28 ms/份。

---

## 6. 两次稳定性（同批次）

同一命令连跑两遍，比较逐文件 median 与 TOTAL（Run A 14:19–14:20，Run B 14:20–14:20，间隔约 14 秒）：

| 文件 | ours A | ours B | Δ | ts-np A | ts-np B | Δ | ts-par A | ts-par B | Δ | 倍数 A | 倍数 B |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `lib.dom.d.ts` | 722.0 | 723.7 | +0.2% | 84.5 | 83.8 | −0.9% | 103.3 | 101.5 | −1.8% | 8.54× | 8.63× |
| `lib.webworker.d.ts` | 297.1 | 290.8 | −2.1% | 30.4 | 29.2 | −3.9% | 40.1 | 39.3 | −1.8% | 9.76× | 9.94× |
| `typescript.d.ts` | 310.1 | 303.2 | −2.2% | 28.6 | 29.6 | +3.4% | 41.5 | 35.1 | −15.4% | 10.85× | 10.26× |
| `inspector.generated.d.ts` | 101.6 | 98.1 | −3.5% | 9.5 | 8.1 | −14.9% | 12.8 | 12.5 | −2.8% | 10.70× | 12.13× |
| `crypto.d.ts` | 64.7 | 61.9 | −4.2% | 8.6 | 8.2 | −4.8% | 10.6 | 10.9 | +2.5% | 7.55× | 7.60× |
| `lib.es5.d.ts` | 60.7 | 57.9 | −4.6% | 10.1 | 9.3 | −8.1% | 11.3 | 11.1 | −2.1% | 6.02× | 6.25× |
| `fs.d.ts` | 49.1 | 49.0 | −0.2% | 9.2 | 8.7 | −5.2% | 14.2 | 11.3 | −20.3% | 5.34× | 5.62× |
| `http2.d.ts` | 53.8 | 48.8 | −9.3% | 6.4 | 5.5 | −13.4% | 7.3 | 7.1 | −2.5% | 8.46× | 8.86× |
| **TOTAL（8 份）** | **1,659.1** | **1,633.4** | **−1.5%** | **187.3** | **182.4** | **−2.6%** | **241.2** | **228.8** | **−5.1%** | **8.86×** | **8.96×** |

| 批次 | TOTAL 倍数（ts-np） | 漂移 | TOTAL 倍数（ts-par） | 漂移 |
|---|---:|---:|---:|---:|
| 8 份 A → B | 8.86× → 8.96× | +1.1% | 6.88× → 7.14× | +3.8% |
| 226 份 A → B | 9.00× → 8.43× | −6.3% | 7.03× → 6.97× | −0.9% |

读法：

- **TOTAL 级**：两次复跑 ours 差 ≤ 3.7%，TS 差 ≤ 2.8%，倍数差 ≤ 6.3%。结论按两位有效数字引用（≈9× / ≈7×）是安全的。
- **单文件级**：10 ms 以下的小文件受 JIT/GC 影响，±15–20% 的抖动正常（`fs.d.ts` 的 ts-par 就是例子）。
  因此逐文件倍数只报到整数位（5×、9×），不要拿单文件第二位小数做文章。
- 本轮未固定 CPU 频率、未关后台进程、未用 `--expose-gc`；这些都会影响绝对值，但**同一轮内 ours/TS 相邻测量**，
  比值比绝对值稳。

---

## 7. 结论

1. **量级**：以 TS 解析器为基准，shape 树解析的差距是 **约 9 倍**（对 `setParentNodes:false`）、**约 7 倍**
   （对 `setParentNodes:true`）。8 份大文件与 226 份全语料给出同一量级（8.43×–9.00× / 6.97×–7.14×），
   说明这个差距是解析路径本身的，不是语料选择造成的。
2. **单位成本**：ours ≈ **0.35–0.37 ms/KB**（344–357 ns/char）；TS ≈ **0.039–0.042 ms/KB**（38–41 ns/char，无 parent）
   或 **0.049–0.052 ms/KB**（48–51 ns/char，有 parent）。即每 KB 多花约 0.31 ms。
3. **parent 的代价**：TS 自己开 `setParentNodes` 只贵约 25–30%（`ts-par/ts-np` ≈ 1.25×）。也就是说，
   ours 与 ts-np 的差距不是"少填了 parent"能解释的——差距在 shape/模板这一层。
4. **不可比点（必须一起引用）**：
   - ours 的产物是 shape 树，**不含 AST 投影**；TS 的产物是 AST。两者节点语义不同，倍数**不能**换算成
     "ours 等于几份 TS"，也不能用来推断类型检查阶段的成本。
   - TS 侧只调 `createSourceFile`：不建 Program、不绑符号、不做类型检查；ours 侧也没有这些阶段。
   - 这是**单线程、冷进程、默认 GC** 的口径；没有做多轮交叉的内存/GC 归因。

### 后续可以量什么（不在本次交付内）

- ours 加上 AST 投影后的成本（才是与 ts-par 产物最接近的口径）；
- 同一批语料下 ours 的 GC/分配量（需 `--expose-gc` + `v8.getHeapStatistics`，另开测量口径）；
- 把 226 份按"声明密度/泛型密度"分组，定位 §4 里 5.3×–10.9× 散布的来源。

---

## 8. 复现

```bat
git clone "C:\Users\Admin\Documents\GitHub\xl-example" "C:\Users\Admin\Documents\GitHub\xl-example-set\perf-vs-ts"
cd perf-vs-ts
git checkout integration-buffer
Copy-Item -Recurse "C:\Users\Admin\Documents\GitHub\xl-example\node_modules" .
:: xl_build（cwd=本 clone，paths ["core","typescript"]，targets ["ts"]）→ 0 error
node_modules\.bin\tsc.cmd -p tsconfig.json

node tests/bench/perf-vs-ts.mjs                :: 8 份最大 d.ts
node tests/bench/perf-vs-ts.mjs --corpus       :: 226 份
node tests/bench/perf-vs-ts.mjs --json         :: 机器可读
node tests/bench/perf-vs-ts.mjs --repeat 7 --warmup 2 --top 12
```

- 脚本要求 `build/ts/typescript/run/source-file-runner.js` 与 `node_modules/typescript` 同时存在，缺任一以退出码 2
  说明缺什么（这是"前置未满足"，不是脚本坏了）。
- **PowerShell 5.1 的 `>` 重定向写出 UTF-16LE**，`--json` 落盘请用
  `node tests/bench/perf-vs-ts.mjs --json | Out-File -Encoding utf8 tmp\perf.json`，否则其他工具读不了。
- 输出列：`KB`（文件字节/1024）、`ms`（该文件 median）、`ms/KB`、`x np` / `x par`（ours ÷ TS），末行 TOTAL。
