# tests/coverage —— **场景覆盖度**判据

这条判据回答的是**唯一**一个进度问题：

> 「一份普通的、没为本运行器改过的 `.ts`，**跑得对多少**、**读得对多少**？」

它不猜、不折算：**矩阵里每一条就是一个真跑的 `.ts` 文件**，五类各有各的尺子，
覆盖度 = 过关条数 / 条数（按类加权）。**逐轮的现场在 git 历史里**，这里只留今天的口径。

## 五类与两种尺子

| 类别 | 目录 | 权重 | 尺子 |
| --- | --- | --- | --- |
| `token` | `tests/cases/token/<功能域>/` | 15% | **AST 尺子**：逐节点对 `ts.createSourceFile` |
| `exec` | `tests/cases/exec/<功能域>/` | 25% | **执行尺子**：`node` 与 `tsrun` 各跑一遍，比 stdout 逐字节 + 退出码 |
| `runtime` | `tests/cases/runtime/<功能域>/` | 25% | 同上 |
| `stdlib` | `tests/cases/stdlib/<功能域>/` | 20% | 同上 |
| `e2e` | `tests/cases/e2e/<功能域>/` | 15% | 同上 |

**两种尺子、两套口径，都摆在这里**：

1. **执行尺子**（`exec` / `runtime` / `stdlib` / `e2e`）：裁判是**真 Node**——两个进程、
   两条完整链路、中间没有打桩；比 **stdout 逐字节 + 退出码**。`xl:args` 那一档
   给有运行期语义、类型剥离拒收的语法（`enum` / `namespace`）换 `--experimental-transform-types`。
   **裁判侧的源码每次现写**到 `.work-<pid>/src/<下标>.ts`（跑完就删），那一份目录里带一个
   `package.json`，**但它故意不写 `type`**（第 686 轮；原来写的是 `type: commonjs`）——
   `.ts` 的执行形态由**最近的** `package.json` 决定，而「最近的」对**入口点**与对
   **`import()` 进来的模块**是两回事：`node <文件>.ts` 拿 `type: commonjs` 先按 CJS 解析、
   失败再**按语法探测重试成 ESM**，批里那句 `await import()` **没有那一步重试**。
   于是显式 `type: commonjs` 会把 `export` / `import` / 顶层 `await` 的用例在批那一档判成
   语法错 ⇒ `nodefail` / `bad`。**不写 `type` ⇒ 两档都走语法探测、落到同一个模式**，
   而这一层仍在仓根那份 `type: commonjs` 之内，**松散模式那一半原样保住**
   （实测：同一条用例在两档下的 `this` / 冻结写 / `delete` 三个读数逐字相同）。
   **实测**（同一趟全矩阵，哨兵从 `type: commonjs` 改成不写 `type`）：
   `bad 3 → 0`（那 3 条各自回到真实判决：`006-module-export` pass、`007-module-import` differ、
   `056-l677p-dynamic-import` blocked），通过 **3520 → 3521**、`blocked 239 → 240`、
   `differ 40 → 41`，`regressions` 0。
   **第 687 轮全矩阵**（在那一轮加进来的 4 份新语料之上）：通过 **3521 → 3527**、
   `differ 41 → 43`、`bad` 仍是 **0**、`regressions` 0——那一轮收掉的是
   `Map` / `Set` / `Array` 三族**「长度被快照一次」**的七处静默错值
   （见根目录 README 第 687 轮那一段）。
   **第 688 轮全矩阵**（3 份新语料）：通过 **3527 → 3536**、`differ 43 → 37`、
   `blocked` 仍是 240、`bad` 0、`regressions` 0——收掉的是**内建构造自己的 `length`**
   那一格（十四格一起）与**函数 `length` / `name` 的描述符**那一条路
   （原来对函数是「响亮地抛」，一句异常带走整份文件）。
   反过来**写成 `type: module`**也要不得：ESM 一律严格模式，而这一层语料的期望值全是照
   松散模式写的（`Object.freeze` 之后写属性静默、`delete` 不可配置属性该静默、
   非严格调用里 `this` 指向全局）——实测 `bad 3 → 12`、`differ 40 → 50`、通过掉到 3500、
   加权 **95.9% → 95.1%**。所以这里要的是**「没有显式 type」**，不是「显式换成另一个 type」。
   （`tests/cases/package.json` 那一份是给「直接 `node <用例>.ts`」用的，实测改它**不影响**读数
   ——判据跑的是 `.work-<pid>/src/` 里现写的那一份。）
2. **AST 尺子**（`token`）：裁判是 `ts.createSourceFile`，比**逐节点的 kind / 区间 / 字段名**，
   外加未映射 / 缺 range / 区间越界。它**不开进程**，而且借的是 `cases:tsast` 的**同一份实现**
   （`compareSource`）——两份实现就是两个口径。

## token 那两个数

`token` 原来只有一把**布尔门**（`cases:tsast`：八项全 0 才退出码 0），于是「还剩多少」在读数里看不见。
这里把它折成百分比，**两个数都报**：

- **A 逐文件完全一致**：每个文件的四方向 + 三栏地基都为 0（口径最严，含已登记缺口）。
- **B 没登记缺口的用例里全对的**：A 再排除 `xl:known-gap` 的用例。**加权用的是 B。**

**为什么要 B**：`xl:known-gap` 那 219 条是**已经量出来的缺口**，门把它们排除在八项之外
（否则门永远红，红里分不出「新坏了」与「本来就还没做」）。可「还差多少」不该跟着消失——
B 把分母定成「本来该全对的用例」，缺口另立一行报（**收掉一条涨一格**）。
这与执行尺子的台账（`xl:want`）同一精神。

`xl:ts-invalid`（故意写非法 TS，9 份）与 `.tsx`（4 份）**不进任何一边的分母**：
AST 尺子的裁判对它们没有基准。它们照样在语料里、照样被 `cases:check` / `cases:tags` 盯着。

## 跑一次

```bash
npm run coverage                                 # 五类全跑 + 覆盖度报告（写 report.json）
node tests/coverage/run.mjs --category stdlib    # 只看一类
node tests/coverage/run.mjs --filter array-      # 只看 id 里带这个子串的
node tests/coverage/run.mjs --list               # 只列 id（一类一行）
node tests/coverage/run.mjs --verbose            # 每条一行；配 XL_COVERAGE_SELFCHECK=1 另印自查
node tests/coverage/run.mjs --strict             # 只要有一条不是 pass 就红
node tests/coverage/run.mjs --no-batch           # 一条一个进程（权威口径）
node tests/coverage/run.mjs --emit-ledger        # 按现状打一份台账骨架（给人改，写进用例文件头）
```

全矩阵实测墙钟 **~20s**（16 核）。

## 三条纪律

1. **不许给 coverage 加缓存**：判定必须**只**由「今天的源码 + 今天的 node + 今天的 tsrun」决定，
   没有第二份状态参与。加速的路是下面第 2 条，不是记住上一趟的答案。
2. **跑 case 必须走批**：被测侧 `tsrun --batch 清单.json`、裁判侧 `judge-batch.mjs`。
   「一条一个进程」只允许出现在两个地方——`--no-batch`（权威口径）与
   「批里没交回结果的那几条按单条重跑」。判据是**进程启动 ≈ 100ms 且并发不省**，
   所以唯一的出路是**少起进程**。
3. **每个实例一个工作目录**（`tests/coverage/.work-<pid>`，跑完自删）：共用一份时，
   两个实例并行会互相 `rm -rf` 掉对方的输入，症状是「找不到输入文件」——
   看起来像用例坏了，实则是工具串了。

## 台账（写在**每个用例文件头**）

台账不另立文件：`xl:want` / `xl:skip` / `xl:why` / `xl:known-gap` **就在那一条用例自己的文件头**，
与它同生共死（第 685 轮从 `expectations.mjs` 搬进来的——那份 1481 行的清单与语料分开住，
改一条要记得改两处）。文件头文法见 [tests/cases/README.md](../cases/README.md)。

- `xl:want blocked` —— 进不了门（降级 / 装载 / 求值那一步就断了）；
- `xl:want differ` —— 跑得出来，但 stdout 或退出码不同（**多数是静默错值**）；
- 没登记的按 `pass` 算；
- `xl:skip <人话>` —— **口径外**（不进分母）。**只剩「裁判给不出来」那一档**
  （今天 1 条：装饰器，`node` 三种模式都拒收，没有基准可比）。

**台账不是免检单**：登记过的照样每次真跑。五种判决：

| 判决 | 含义 | 红不红 |
| --- | --- | --- |
| `ok` | 台账 pass、现在 pass | — |
| `known` | 台账 blocked/differ、现在还是 | —（还差多少由覆盖度那一栏说） |
| `MOVED` | 原来进不了门、现在跑得出来但还不对 | —（提示改台账） |
| `NEWLY-PASSING` | 台账记没过、现在过了 | —（提示删掉那一行） |
| `REGRESSION` | 台账记 pass、现在过不了 | **红** |
| `BAD-CASE` | `node` 自己都跑不动（用例写错了） | **红** |

也就是说：**红只红在「比昨天差」，不红在「还差多少」**。

token 那一侧的「登记」是 `xl:known-gap`，语义与 `xl:want blocked` 相同：
**登记过的照样每次真跑**，对上了就报「收掉了」并红，逼你去删那行指令。

## 怎么**加宽**矩阵

分母比分子重要，所以「加语料」不是随手往里塞——先**普查**：

```bash
# 1. 候选写在一个临时 .mjs 里（形状与用例一样：导出数组、每项 { id, title, src }）
# 2. 先量一遍：只留下裁判跑得动的，同时把缺口一次看全
npm run coverage:sweep -- tmp/cand.mjs
npm run coverage:sweep -- tmp/cand.mjs --json tmp/sweep.json   # 逐条读数落成 JSON
# 3. 把候选收进 tests/cases/<类别>/<功能域>/，元数据写成文件头
#    （xl:title / xl:want / xl:why / xl:round / xl:end）
npm run coverage
node tests/coverage/run.mjs --emit-ledger        # 按现状打一份台账骨架
# 4. 把骨架里那几行贴进**对应用例的文件头**——why 那一栏要**人写**（写根子，不是抄 stderr）
```

**为什么加宽要单独一个工具**：`run.mjs` 量的是**矩阵**，它要求每条都在台账里**有账**，
没登记的没过就是 `REGRESSION`（红）；而加宽的第一步恰好**还不知道哪些会过**——
拿 `run.mjs` 去试会得到一片红，红里混着「真坏了」与「本来就还没做」，读不出东西。
`sweep.mjs` 的口径与它**完全相同**（stdout 逐字节 + 退出码 + 真 `node` 当裁判），
只是**不写读数、不看台账、不红**。

## 一条用例的规矩

1. **一条只考一件事**，短、能读懂、**必须打印**（一行都不打印的「通过」等于没验）。
2. 输出要**确定**：不许 `Math.random` / `Date.now` / 无实参 `new Date()`。
3. 语料必须是**裁判跑得动的**普通 `.ts`：
   - `enum` / `namespace` / 构造函数参数属性 → `xl:args --experimental-transform-types`
     （它们有**运行期语义**，类型剥离只认能擦掉的语法）；
   - 装饰器 → 裁判给不出来 ⇒ 记 `xl:skip`，不记 `xl:want`。
4. `xl:skip` 只用于**口径外**（**裁判给不出来**）。「裁判跑得动、这边过不了」的一律进台账记
   `blocked` / `differ`——**`RegExp` / `BigInt` / 多文件加载 / 动态 `import()` 都是待做项**，
   不许写成 `skip`（第 685 轮已经把它们从 `skip` 拉回台账）。
5. **产物新鲜度**：规范比产物新就直接红（与 `runtime:check` / `runtime:cli` 同一条规矩）——
   判据读的是 `build/**/*.js`，跳过 `xl build` 量的是上一版。

## 与另外几条判据的分工

| 判据 | 量什么 |
| --- | --- |
| `npm run runtime:check` | 引擎的**机制**（IR / 堆 / GC / 帧 / 宿主） |
| `npm run runtime:cli` | **必须全过**的端到端语料（过不了的进不去） |
| `npm run cases:tsast` | token 层与真 TS 的 **AST 对拍**（**八条**全 0 的**门**） |
| `npm run cases:check` | 用例文件本身合不合格（文件头指令有没有写错） |
| `npm run cases:tags` | 用例自带的期望（`xl:expect` / `xl:absent`）对产物核实 |
| `npm run cases:shapes` | 用例**覆盖了哪些形状** |
| **`npm run coverage`** | **场景覆盖面**（含「现在过不了」的那些） |

前四条是**门**（过不了就红），这一条是**尺**——它把「还差多少」变成可复现的读数，
并把每一格的缺口写成一张**带原因的清单**（每条用例文件头的 `xl:why`，以及 `report.json`）。
各条的当前读数见根目录 [README](../../README.md) 的「当前状态」。

## 已知的账（**不是口径**，是待做项）

**口径外只剩「裁判给不出来」那一档**：装饰器 1 条、`xl:ts-invalid` 9 条、`.tsx` 4 条。
其余一律进分母，`RegExp` 族 7 条、`BigInt` 族 4 条、多文件导入 1 条、动态 `import()` 1 条、
`eval` 1 条、`Error` 的栈 1 条都记 `xl:want blocked|differ` + `xl:why`（写着「要做」）。

**3 条 `bad` 是运行形态问题，不是配置问题**：`exec/enums-namespaces/006-module-export`、
`007-module-import`、`stdlib/globals/056-l677p-dynamic-import` 都用 `import` / `export`，
而裁判侧显式是 `type: commonjs`（见上文）⇒ `node` 把它们当 CJS 跑、`export` 是语法错。
要修它得让裁判**按每个用例的形态选模式**——而那件事的代价已经量过了：
整层改成 ES 模块会连带把 20 条照松散模式写的期望值一起打掉（见上文那份实测），
所以这是个**要一起想清楚**的改动，不是改一个字段。
