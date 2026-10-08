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

## 当前的读数

**这一节的表只列覆盖度自己的四层**；`npm run gates` 的读数合起来放在根目录
[README](../../README.md) 的「当前状态」，不在这里再抄一遍。

| 层 | 条数 | 覆盖度 |
| --- | --- | --- |
| runtime | **595 / 595** | **100%** |
| exec | **532 / 537** | 99.1% |
| stdlib | **846 / 860** | 98.4% |
| e2e | **225 / 225** | **100%** |
| **合计（加权）** | **2198 / 2217** | **99.3%** |

那 19 条过不了的是**真缺口**，都登了台账（写清根子）：
对象字面量的值是一对圆括号里的二元表达式、宿主 ABI 的 `setTimeout`、
`Date.prototype.getTimezoneOffset` 与 `toDateString` / `toTimeString` / `toUTCString` 没装、
`String.prototype.matchAll` 没装（六条 `blocked`）、
`using` / `await using` 的降级、`new Object(null)` 该造 `{}`、
`Object.groupBy` 的分组表该是 null 原型、多分量 `new Date(y, m, d, …)` 没做本地时区换算、
`String.prototype` 的 `match` / `search` / `matchAll` 三个成员没装、
`String.prototype.includes` 忽略 `fromIndex`（九条 `differ`）。
**第 670 / 671 / 672 / 675 轮起它们陆续进了矩阵**（`gap-*`，用户口径：凡是缺口的全部进语料）——
原来只写在本文档与根 README 的「没有进矩阵」那几段里（还有一条只写在
`typescript-exec/builtins/globals.xl.md` 的正文里），于是「还差多少」在读数里看不见，
而**分母是活的、它比分子重要**：藏起来的那几条只会让百分比虚高。
读数从 100% 掉到 99.8% 是**分母变诚实**，不是倒退；**第 676 轮**又加宽了 34 条
（`r676-*`，同一轮普查量出的缺口另立 7 条 `gap-r676-*`，另有 1 条同族的另算），
读数再掉到 99.5%，同一个道理；**第 677 轮**换了一条语料来源：不写新片段，
而是把 **AST 语料**（`tests/parse/cases/**`，见下节）里凡是会打印的那 57 份整批量一遍，
再按**名字逐个点名**把内建族扫一遍——两批一共收 41 条（36 + 13 条 pass）与 5 条缺口
（1 条在下一轮就收掉了），读数 99.5% → 99.4% → **99.3%**，同一个道理。

### 第 677 轮（其一）：**AST 语料**当候选池——1407 份解析用例里量出 3 条

解析语料（`tests/parse/cases/**`，1411 条）是为 token 层写的，但其中 **57 份**带
`console.log`——它们同时也是**普通 `.ts`**，正好能整批交给 `sweep.mjs` 量一遍
（口径不变：`node` 当裁判、stdout 逐字节 + 退出码）。余额是**代码复用**：
这些文件每个都已经被逐节点对拍过，形状是现成的，不必再手写片段。
36 份 pass 的照原样进矩阵（`l677-*`，exec 层），另量出 3 条：

| 用例 | 症状 | 根子 |
| --- | --- | --- |
| `l677-declarations-cls-semicolon-member` | 类体里单独一个 `;`（TS 的 `SemicolonClassElement`）⇒ `unimplemented: class member SemicolonClassElement` | 降级层的成员遍历只认 Field / MethodDeclaration，无名成员直接抛；空成员没有运行期效果，跳过即可 |
| `l677-declarations-decl-obj-destructure-computed-key` | `const { [k]: v } = o` ⇒ `ast node ComputedPropertyName has no text (at 109..112)` | 投影出的计算名节点**在自己的区间里取不到文本**——与 `import { "a-b" as c }` 那一族同一个根子：投影这一层按区间再取一次文本，而 `[k]` 的区间口径不一致 |
| `l677-expressions-expr-template-nested-spaced` | 嵌套模板 `` `a${ `b${1}` }c` `` 该给 `ab1c`，本仓给 `ab1}c` | **已在「第 677 轮（其三）」收掉**：投影里 `TemplateTail` 的 `text` 起点算错 |

另 **18 份**是 `nodefail`（片段不完整：`ReferenceError: xs is not defined` 之类），
**没有进矩阵**——裁判都跑不动的那一档就是「用例自己不合法」，收进去只会污染分母。

### 第 677 轮（其二）：**按名字逐个点名**——内建族再扫一遍，又量出 3 格

与第 676 轮（其三）同一条路（「不问构造、问名字」），这一批把面铺到还没点名过的几族：
String 的非正则成员、Array 的非变异成员（`toSorted` / `with` 族）、Object 的检查与原型族、
Number / Math 的现代成员、JSON 的 space / replacer、Set / Map 的迭代、`eval`。
量出来的是（用例在 `cases/stdlib.mjs` 的 `l677p-*` 那一段）：

| 用例 | 症状 | 根子 |
| --- | --- | --- |
| `l677p-eval-forms` | `eval(...)` ⇒ `name is not a local or a capture: eval` | `eval` 这个全局名没登记；它要的是「字符串 → 程序」那条入口（`RunSources` 同形）再把内联作用域传进去 |
| `gap-l677p-regex-literal` | 正则字面量 ⇒ `unimplemented: expression RegularExpressionLiteral`（整份文件进不来） | `RegExp` 是 v1 非目标，但**裁判跑得动这一条** ⇒ 按仓库口径记**缺口**，不记 `skip` |
| `l677p-obj-lock-difference` | `preventExtensions` 之后 `defineProperty`：本仓抛、`node` 静默 | **口径边界**（本仓一律抛 = 严格模式的选择；`node` 把 `.ts` 当 CJS 跑是松散模式）——与 `freeze` 那一族同档，**不算缺口**，留在矩阵里看得见 |

**一条口径上的收口**：`skip` 只留给「**裁判都给不出来**」那一档（多文件加载、装饰器运行期语义）；
「裁判跑得动、这边过不了」的一律进台账记 `blocked` / `differ`——
`gap-l677p-regex-literal` 第一版写成 `skip` 时被 `run.mjs` 当场判成 `REGRESSION`
（`skip` 让这条避开台账，而它其实是断的），这一轮按口径改回 `blocked`。

### 第 677 轮（其三）：收掉两格——嵌套模板的段文本、类体里的空成员

**一、类体里的空成员**（单独一个 `;`，TS 的 `SemicolonClassElement`）：降级层的成员遍历
只按名字处理 Field / MethodDeclaration，无名成员直接落进最后那句 `throw`
（`unimplemented: class member SemicolonClassElement`）——**整个类都进不来**，而这只是一种
排版习惯。空成员在运行期什么都不产生，跳过它即可（`typescript-exec/lowering.xl.md`）；
回归哨放在 `runtime:cli` 的 `tests/runtime/cases/05-classes.ts`（类体最前面那个 `;`）。

**二、嵌套模板里内插与 `}` 之间的空白**：第 677 轮（其一）从 AST 语料里量到的那条 `differ`
（`` `a${ `b${1}` }c` `` 该给 `ab1c`、本仓给 `ab1}c`）。根子不在 token 层而在**投影**这一层：
`TemplateTail` / `TemplateMiddle` 的 `text` 按「表达式的终点 + 1」起算，而内插与 `}` 之间带空白时
表达式终点落在**反引号之后一格**（那个空格上），`+1` 就把 `}` 自己算进了段文本；
位置那一格第 623 轮已经按「`}` 的右边一格」算了（`pos: endOf(interps[i]) - 1`）——
文本这一格漏了同一处。修法是两格同一个起点（`typescript/print-ast-common.xl.md` 的 `stringProject`）。

### 第 676 轮（其三）：**系统性点名**——把内建表面逐个问一遍

上一批（`k9-*`）是「随手挑构造」；这一批换了一条更有产出的路：**不问构造，问名字**。
顺序是三层——全局名（`globalThis` 上有哪些）→ 静态成员（`Object.is` / `Array.from` /
`Math.trunc` … 逐个取一次）→ 原型成员（`Array.prototype.at` / `String.prototype.padStart` /
`Date.prototype.toISOString` …），把 `undefined` 的那些打印出来，与 `node` 各跑一遍比。
量出来的三格（都登了台账，用例也在矩阵里）：

| 名字 | 症状 | 根子 |
| --- | --- | --- |
| `String.prototype.match` / `search` / `matchAll` | `node` 上是函数，这边 `undefined` | 成员表里没有那三格（与 `RegExp` 非目标是两件事：非正则参数那一支是可做的，`replaceAll` / `split` 现在就是好的） |
| `Date.prototype.toUTCString` | 调用报 `cannot call a non-closure value` | 成员表里没有那一格。它要的是**固定英文**的 UTC 文本，不需要宿主给本地时区名 |
| `String.prototype.includes` 的 `fromIndex` | `"banana".includes("nan", 3)` 给 `true`（该 `false`） | 方法体把第二实参丢了；同一条用例里 `indexOf` / `lastIndexOf` 的 `fromIndex` 是**对的** |

**两个注意**：一、`.` 取法与 `["成员名"]` 取法在产物里是**两条路**，所以探针一律用**字符串键**
（`obj[key]`）——`.` 取法撞上没装的成员会直接抛，量出来的东西会混进「取法」本身的差异。
二、留在全局名清单里的 `BigInt` / `Reflect` / `Proxy` / `Intl` / `RegExp` / `WeakRef` /
`FinalizationRegistry` 与定时器那一族**不是缺口**：它们是 `docs/runtime-architecture.md` §15
点名的 v1 非目标，探针只把它们印出来「看得见」，不进台账。

**一条已知边界**：异步可迭代物那一档是**收完再迭代**（与自定义**同步**迭代器那条路同一取舍），
所以「无穷异步可迭代物」会一直收下去——口径外的写法，不设第二份上限。

### 第 670 轮量出的一处**工具**缺口：排宏任务的用例不能进裁判批

`judge-batch.mjs` 一个进程跑一批，每条 `import()` 返回之后只让两个 `setImmediate` tick 就收工。
**定时器还没到点** ⇒ 它的输出会落进**下一条**的缓冲。第 670 轮把 `setTimeout` 那条收进矩阵时
当场撞上：排在它后面的 `e2e-event-emitter` 被记成
`stdout 不同：第 5 行：node «timer» vs tsrun «»` —— 看起来是它**倒退**了，
其实那行 `timer` 是上一条**迟到的输出**。

修法是 `run.mjs` 的 `judgeGroup`：`setTimeout` / `setInterval` / `setImmediate`
与 `process.exit` / `require(` 一样**不进批**（一条一进程）。
判据按**源码**认、不按台账认——台账说的是「现在过不过」，它管的是「能不能进批」，
一条用例修好了照样会排定时器。

### 第 666 轮普查：59 条全过，另量出 2 条真缺口

一次 59 条的加宽普查（候选留在 `tmp/`，不进仓库）里 59 条**全部 pass**——它们已经整批收进矩阵
（`k9-*`，与第 658 轮的 `k7-*` / 第 665 轮的 `k8-*` 同一批号规矩）。普查过程中另量出 **2 条真缺口**，
当时**没有进矩阵**（进去了这一层就不再是 100%）。**第 670 轮它们进矩阵了**（`gap-*`，
用户口径：凡是缺口的全部进语料），根子照旧记在这里：

| 根子 | 症状 |
| --- | --- |
| **对象字面量的值是一对圆括号里的二元表达式** | `{ x: (a.x + b.x) / 2 }` 投影出来是 `BinaryExpression(a.x, +, b)` + **散着的** `.` / `x`，`PropertyAccessExpression(b.x)` 整条缺。降级层于是把属性名 `x` 当变量读，报 `name is not a local or a capture: x`。**同一段写法放进数组元素里是好的**（`[ (a.x + b.x) / 2 ]` 逐位置一致），所以缺口只在「对象字面量的值」这一格——链折叠没有在括号内容上先跑一趟 |
| **`setTimeout` 这个全局名没登记** | `name is not a local or a capture: setTimeout`。定时器是宿主 ABI 的事（`runtime-architecture.md` 的宿主层），单文件 `tsrun` 现在只给微任务那一档 |

`report.json` 是**最后一次整跑**的完整清单：`blocked` **2** 条（就是上表那两条，台账里登着）、
`differ` **0** 条、`bad`（裁判自己都跑不动的用例）**0** 条。

**加宽的历史不进这里**（在 git 历史里）。只有一条经验值得留着：**分母是活的**，
所以加宽之前先普查（上一节）、加宽之后要 `--emit-expectations` 重打台账骨架——
读数掉下来是**分母变诚实**，不是倒退。

**两处「口径边界」不算缺口**（它们**注定**逐字节对不上，进了缺口单只会让百分比不可信）：
`Object.freeze` 之后写属性 / 只读访问器上赋值（本仓一律抛，那是**严格模式**的选择；
`node` 把 `.ts` 当 CJS 跑是**松散模式**，静默失败）、
`console.log(new Error("x"))`（Node 打的是**栈**，路径与行号由宿主决定）。
这几条留在矩阵里**看得见**，但不当作「还差多少」。

## 与另外几条判据的分工

| 判据 | 量什么 |
| --- | --- |
| `npm run runtime:check` | 引擎的**机制**（IR / 堆 / GC / 帧 / 宿主） |
| `npm run runtime:cli` | **必须全过**的端到端语料（过不了的进不去） |
| `npm run cases:tsast` | token 层与真 TS 的 **AST 对拍** |
| `npm run cases:check` | 用例文件本身合不合格（`xl:expect` 里的标签名有没有写错） |
| `npm run cases:tags` | 用例自带的期望（`xl:expect` / `xl:absent`）对产物核实 |
| **`npm run coverage`** | **场景覆盖面**（含「现在过不了」的那些） |

前四条是**门**（过不了就红），这一条是**尺**——它把「还差多少」变成可复现的读数，
并把每一格的缺口写成一张**带原因的清单**（`report.json`）。各条的当前读数见根目录
[README](../../README.md) 的「当前状态」。
