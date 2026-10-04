# tests/coverage —— **场景覆盖度**判据（exec / runtime / 标准库 / 端到端）

这条判据回答的是**唯一**一个进度问题：

> 「一份普通的、没为本运行器改过的 `.ts` 交给 `tsrun`，能跑对多少？」

它不猜、不折算：**矩阵里每一条就是一个真跑的 `.ts` 文件**，分别交给
`node`（裁判）与 `build/ts/tsrun.js`（被测），比 **stdout 逐字节 + 退出码**。
覆盖度 = **过关的条数 / 矩阵条数**（按层加权）。

```bash
npm run coverage                  # 全矩阵 + 覆盖度报告（写 report.json）
node tests/coverage/run.mjs --layer stdlib      # 只看一层
node tests/coverage/run.mjs --filter array-     # 只看 id 里带这个子串的
node tests/coverage/run.mjs --list              # 只列 id
node tests/coverage/run.mjs --verbose           # 每条一行（含耗时）
node tests/coverage/run.mjs --strict            # 只要有一条不是 pass 就红
node tests/coverage/run.mjs --emit-expectations # 按现状打一份台账骨架（给人改）
```

## 四层与权重

权重与 [`typescript-exec/README.md`](../../typescript-exec/README.md) 那张加权表**同一份**——
所以「覆盖率」与那边的「机制估计」可以直接对着看：一个量的是**场景过没过**，
一个量的是**机器还剩多少没造**。

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

**台账不是免检单**：登记过的照样每次真跑。四种判决：

| 判决 | 含义 | 红不红 |
| --- | --- | --- |
| `ok` | 台账 pass、现在 pass | — |
| `known` | 台账 blocked/differ、现在还是 | —（**还差多少由覆盖度那一栏说**） |
| `MOVED` | 原来进不了门、现在跑得出来但还不对 | —（提示改台账） |
| `NEWLY-PASSING` | 台账记没过、现在过了 | —（提示删掉那一行） |
| `REGRESSION` | 台账记 pass、现在过不了 | **红** |
| `BAD-CASE` | `node` 自己都跑不动（用例写错了） | **红** |

也就是说：**红只红在「比昨天差」，不红在「还差多少」**。

## 一条用例的规矩（写新用例时照着办）

1. **一条只考一件事**，短、能读懂、**必须打印**（一行都不打印的「通过」等于没验）。
2. 输出要**确定**：不许 `Math.random` / `Date.now` / 无实参 `new Date()`。
3. 语料必须是**裁判跑得动的**普通 `.ts`：
   - `enum` / `namespace` / 构造函数参数属性 → `nodeArgs: ["--experimental-transform-types"]`
     （它们有**运行期语义**，类型剥离只认能擦掉的语法）；
   - 装饰器 → 裁判给不出来（明确不做的那一档）⇒ 记 `skip`，不记 `expect`。
4. `skip` 只用于**口径外**（多文件模块加载、装饰器运行期语义）：
   它们不算进分母，但**要在报告里看得见**——不然「没测」会被读成「过了」。
5. **产物新鲜度**：规范比产物新就直接红（与 `runtime:check` / `runtime:cli` 同一条规矩）——
   判据读的是 `build/**/*.js`，跳过 `xl build --force` 量的是上一版。

## 与另外三条判据的分工

| 判据 | 量什么 | 现在 |
| --- | --- | --- |
| `npm run runtime:check` | 引擎的**机制**（IR / 堆 / GC / 帧 / 宿主） | 241 条 |
| `npm run runtime:cli` | **必须全过**的端到端语料（过不了的进不去） | 79 份 |
| `npm run cases:tsast` | token 层与真 TS 的 **AST 对拍** | 1442 条 |
| **`npm run coverage`** | **场景覆盖面**（含「现在过不了」的那些） | 251 条 |

前三条是**门**（过不了就红），这一条是**尺**——它把「还差多少」变成可复现的读数，
并把每一格的缺口写成一张**带原因的清单**（`report.json`）。
