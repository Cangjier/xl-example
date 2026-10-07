# tests/coverage —— **场景覆盖度**判据（exec / runtime / 标准库 / 端到端）

这条判据回答的是**唯一**一个进度问题：

> 「一份普通的、没为本运行器改过的 `.ts` 交给 `tsrun`，能跑对多少？」

它不猜、不折算：**矩阵里每一条就是一个真跑的 `.ts` 文件**，分别交给
`node`（裁判）与 `build/ts/tsrun.js`（被测），比 **stdout 逐字节 + 退出码**。
覆盖度 = **过关的条数 / 矩阵条数**（按层加权）。

**分母是活的，而且它比分子重要**：矩阵只装「**普通 `.ts` 里会出现什么**」，
不装「我们碰巧实现了什么」——所以加宽语料时读数掉下来是**分母变诚实**，不是倒退。
真正的红只有一种：`REGRESSION`（台账记 pass、现在过不了）。

## 跑一次

```bash
npm run coverage                                # 全矩阵 + 覆盖度报告（写 report.json）
node tests/coverage/run.mjs --layer stdlib      # 只看一层
node tests/coverage/run.mjs --filter array-     # 只看 id 里带这个子串的
node tests/coverage/run.mjs --list              # 只列 id
node tests/coverage/run.mjs --verbose           # 每条一行（含耗时）
node tests/coverage/run.mjs --strict            # 只要有一条不是 pass 就红
node tests/coverage/run.mjs --emit-expectations # 按现状打一份台账骨架（给人改）
```

全矩阵实测墙钟 **~22s**（16 核；读数的瓶颈是**进程启动**，不是 CPU）。

## 三条纪律

1. **不许给 coverage 加缓存**：判定必须**只**由「今天的源码 + 今天的 node + 今天的 tsrun」决定，
   没有第二份状态参与。加速的路是下面第 2 条，不是记住上一趟的答案。
2. **跑 case 必须走批**：被测侧 `tsrun --batch 清单.json`、裁判侧 `judge-batch.mjs`。
   「一条一个进程」只允许出现在两个地方——`--no-batch`（与批那一轮**逐条对拍**的权威口径）
   与「批里没交回结果的那几条按单条重跑」。判据是**进程启动 ≈ 100ms 且并发不省**，
   所以唯一的出路是**少起进程**。
3. **每个实例一个工作目录**（`tests/coverage/.work-<pid>`）：共用一份时，
   两个实例并行会互相 `rm -rf` 掉对方的输入，症状是「找不到输入文件」——
   看起来像用例坏了，实则是工具串了。

**「把多条小用例拼成一个大 case」这条路没走**：用例是**独立模块**，
两条各自 `const s = …` 拼进一个文件就是重复声明，顶层函数 / `var` / 模块语义也都会变
⇒ 拼接**不是保语义的变换**，拿它当读数等于换了一把尺子。

## 四层与权重

| 层 | 目录 | 权重 | 量什么 |
| --- | --- | --- | --- |
| `runtime` | `cases/runtime.mjs` | 25% | 引擎：值 / 堆 / GC / 帧 / IR / 执行器 / 宿主 ABI |
| `exec` | `cases/exec.mjs` | 30% | 降级层（含 token / 投影）：TS 形状 → 运行期语义 |
| `stdlib` | `cases/stdlib.mjs` | 25% | 标准库：内建成员与标准形状 |
| `e2e` | `cases/e2e.mjs` | 20% | 端到端：几族合起来的**完整程序** |

## 台账（`expectations.mjs`）

矩阵是**场景**，台账是**现状**——两份分开，是因为它们的寿命不一样：
场景一旦写下来就不该改（它是「普通 `.ts` 里会出现什么」），而现状每修一格就变。

```js
"ex-labeled-block": { expect: "blocked", why: "带标签的块：标签该挂在块上（现在只收循环与 `switch`）" },
```

- `expect: "blocked"` —— 进不了门（降级 / 装载 / 求值那一步就断了）；
- `expect: "differ"` —— 跑得出来，但 stdout 或退出码不同（**多数是静默错值**）；
- 没登记的按 `pass` 算。

**台账不是免检单**：登记过的照样每次真跑。五种判决：

| 判决 | 含义 | 红不红 |
| --- | --- | --- |
| `ok` | 台账 pass、现在 pass | — |
| `known` | 台账 blocked/differ、现在还是 | —（**还差多少由覆盖度那一栏说**） |
| `MOVED` | 原来进不了门、现在跑得出来但还不对 | —（提示改台账） |
| `NEWLY-PASSING` | 台账记没过、现在过了 | —（提示删掉那一行） |
| `REGRESSION` | 台账记 pass、现在过不了 | **红** |
| `BAD-CASE` | `node` 自己都跑不动（用例写错了） | **红** |

也就是说：**红只红在「比昨天差」，不红在「还差多少」**。

## 怎么**加宽**矩阵

分母比分子重要，所以「加语料」不是随手往 `cases/*.mjs` 里塞——先**普查**：

```bash
# 1. 候选写在一个临时 .mjs 里（形状与 cases/*.mjs 一样：导出几个数组、每项 { id, title, src }）
# 2. 先量一遍：只留下裁判跑得动的，同时把缺口一次看全
node tests/coverage/sweep.mjs tmp-cand.mjs
node tests/coverage/sweep.mjs tmp-cand.mjs --json tmp-sweep.json   # 逐条读数落成 JSON
# 3. 把候选整批收进 cases/{runtime,exec,stdlib,e2e}.mjs（pass 的照原样、缺口的也收）
npm run coverage
node tests/coverage/run.mjs --emit-expectations                    # 按现状打一份台账骨架
# 4. 把骨架贴进 expectations.mjs——why 那一栏要**人写**（写根子，不是抄 stderr）
```

**为什么加宽要单独一个工具**：`run.mjs` 量的是**矩阵**，它要求每条都有账，
没登记的没过就是 `REGRESSION`（红）；而加宽的第一步恰好**还不知道哪些会过**——
拿 `run.mjs` 去试会得到一片红，红里混着「真坏了」与「本来就还没做」，读不出东西。
`sweep.mjs` 的口径与它**完全相同**（stdout 逐字节 + 退出码 + 真 `node` 当裁判），
只是**不写读数、不看台账、不红**。

## 一条用例的规矩

1. **一条只考一件事**，短、能读懂、**必须打印**（一行都不打印的「通过」等于没验）。
2. 输出要**确定**：不许 `Math.random` / `Date.now` / 无实参 `new Date()`。
3. 语料必须是**裁判跑得动的**普通 `.ts`：
   - `enum` / `namespace` / 构造函数参数属性 → `nodeArgs: ["--experimental-transform-types"]`
     （它们有**运行期语义**，类型剥离只认能擦掉的语法）；
   - 装饰器 → 裁判给不出来（明确不做的那一档）⇒ 记 `skip`，不记 `expect`。
4. `skip` 只用于**口径外**（多文件模块加载、装饰器运行期语义）：它们不算进分母，
   但**要在报告里看得见**——不然「没测」会被读成「过了」。
5. **产物新鲜度**：规范比产物新就直接红（与 `runtime:check` / `runtime:cli` 同一条规矩）——
   判据读的是 `build/**/*.js`，跳过 `xl build` 量的是上一版。

## 当前的读数与缺口

| 层 | 条数 | 覆盖度 |
| --- | --- | --- |
| runtime | 495 / 502 | 98.6% |
| exec | 409 / 411 | 99.5% |
| stdlib | 622 / 634 | 98.1% |
| e2e | 165 / 166 | 99.4% |
| **合计（加权）** | **1691 / 1713** | **98.9%** |

`report.json` 是**最后一次整跑**的完整清单：`blocked` 1 条（进不了门）、`differ` 21 条
（跑得出来但结果不同），每一条带一句症状与最小复现；`bad` 是裁判自己都跑不动的用例，
必须为 0。下一轮从哪儿下手就看这一份，**逐轮的账**在
[typescript-exec/README.md](../../typescript-exec/README.md) 的「当前的缺口」那一节。

**两处「口径边界」不算缺口**（它们**注定**逐字节对不上，进了缺口单只会让百分比不可信）：
`Object.freeze` 之后写属性 / 只读访问器上赋值（本仓一律抛，那是**严格模式**的选择；
`node` 把 `.ts` 当 CJS 跑是**松散模式**，静默失败）、
`console.log(new Error("x"))`（Node 打的是**栈**，路径与行号由宿主决定）。
这几条留在矩阵里**看得见**，但不当作「还差多少」。

## 与另外几条判据的分工

| 判据 | 量什么 | 现在 |
| --- | --- | --- |
| `npm run runtime:check` | 引擎的**机制**（IR / 堆 / GC / 帧 / 宿主） | 242 条 |
| `npm run runtime:cli` | **必须全过**的端到端语料（过不了的进不去） | 79 份 |
| `npm run cases:tsast` | token 层与真 TS 的 **AST 对拍** | 1472 份逐文件一致 |
| `npm run cases:check` | 用例文件本身合不合格（`xl:expect` 里的标签名有没有写错） | 1071 条 |
| **`npm run coverage`** | **场景覆盖面**（含「现在过不了」的那些） | **1713 条** |

前四条是**门**（过不了就红），这一条是**尺**——它把「还差多少」变成可复现的读数，
并把每一格的缺口写成一张**带原因的清单**（`report.json`）。
