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
| exec | **565 / 577** | 97.9% |
| stdlib | **850 / 888** | 95.7% |
| e2e | **225 / 225** | **100%** |
| **合计（加权）** | **2235 / 2285** | **98.3%** |

那 50 条过不了的是**真缺口**，都登了台账（写清根子）：
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
（1 条在下一轮就收掉了），读数 99.5% → 99.4% → **99.3%**，同一个道理；
**第 678 轮**把「按名字逐个点名」那条路**做成生成器**（见下节）：名单不再手写，
而是在裁判上把每个内建的成员名枚举出来再生成探针，一次收 28 条、量出 23 条缺口，
读数 99.3% → **98.7%**——**分母再一次变诚实**，不是倒退；
同一轮（其二）又换了个问法问**同一层**：名字装上了、**行为对不对**（原型与描述符、
枚举、数组的洞、`instanceof`、盒子对象、ToPrimitive），21 条里 15 条 pass、量出 **4 个根**
（6 条），读数 98.7% → **98.4%**，同一个道理；
（其三）顺着那两批指出的位置问**符号键与私有名**那一族（19 条），17 条 pass、
量出 well-known symbol 缺的那 7 格，读数 98.4% → **98.3%**，同一个道理。

### 第 678 轮：**名字逐个点名**做成生成器——28 条一次进矩阵，量出 23 条缺口

第 677 轮（其二）那条路是**手写**探针：想得到哪个名字就问哪个名字，所以「漏」是必然的
（想不起来的那一族就没人问）。这一轮把它反过来：**名单由裁判枚举**。

做法在 `tmp-r678-gen.mjs`（临时生成器，不进仓）：

1. 在**裁判**（node）上对每个内建取 `Object.getOwnPropertyNames`——静态成员与
   `X.prototype` 的成员各一份，于是「node 说有哪些」就是探针的名单；
2. 过滤掉**读一下就会抛**的那些（`Map.prototype.size` 这类访问器、`Function.prototype.caller`
   这类毒药属性）——它们会让探针自己变成 `nodefail`，量出来的东西与「装了没有」无关；
3. 生成「逐名字取一次、把 `typeof` 印出来」的探针（**字符串键**，第 676 轮量过的那条），
   再按实测结果剪成用例：**只留缺的那些名字**。

量出来 23 条缺口，其中最值钱的是**一整类同一根子**：`length` / `name` / `constructor`
这三格从来没人装过（12 条读数指向它）——
`Object.length` / `Array.length` / `String.length` … 这些**静态函数对象**本该有 `length`（形参个数），
`Function.prototype.name` 本该是函数名，每个 `X.prototype` 本该有 `constructor`。
台账里早先那条「函数的 `length` / `name`」只量了**用户写的**函数（那是闭包那条路），
内建走的是宿主里原生值那条路，两个根。其余独立缺口：

| 用例 | 根子 |
| --- | --- |
| `r678-names-weakmap-proto` / `weakset-proto` | `WeakMap` / `WeakSet` 的**原型表整张没装**（`get` / `set` / `has` / `delete` / `add` 取一下直接抛）；而 `Map.prototype` / `Set.prototype` 是**全齐**的，所以这是补两张表，不是补某个成员 |
| `r678-names-promise-proto` | `Promise.prototype` 的 `then` / `catch` / `finally` 三格没装（`Promise` 静态那一族是全齐的） |
| `r678-names-date-proto` | `Date.prototype` 缺 11 格：`setTime` / `getYear` / `setYear` / `toGMTString` / `getTimezoneOffset` / `toDateString` / `toTimeString` / `toLocaleDateString` / `toLocaleTimeString` / `toLocaleString` / `toUTCString`——比第 676 轮点到的三格多得多 |
| `r678-names-string-proto` | `String.prototype` 缺 19 格：`match` / `search` / `matchAll`（第 676 轮已知）+ **HTML 包装族 13 个**（`anchor` / `big` / `blink` / `bold` / `fixed` / `fontcolor` / `fontsize` / `italics` / `link` / `small` / `strike` / `sub` / `sup`）+ `trimLeft` / `trimRight` |
| `r678-names-console` | `console` 缺 30 格（`warn` / `error` / `debug` / `info` / `dir` / `table` / `time` / `group` … 一格都没装）——而 `console.log` 是好的 |
| `r678-names-symbol-proto` / `symbol` | `Symbol.prototype` 的 `toString` / `valueOf` / `constructor` 都没装；well-known symbol 里缺 `iterator` / `asyncIterator` / `toPrimitive` / `toStringTag` 等 |
| `r678-names-object-proto` | `__proto__` 及 `__defineGetter__` / `__lookupSetter__` 等四个遗留访问器、`toLocaleString` |
| `r678-names-math` / `json` / `number-proto` / `error` | 各自的零星几格：`Math.f16round`、`JSON.rawJSON` / `isRawJSON`、`Number.prototype.toLocaleString`、`Error.captureStackTrace` / `prepareStackTrace` / `stackTraceLimit` |

**两处口径上的收口**：

1. **`Math.random` 不许进矩阵**（矩阵的硬规矩：输出要确定）。它在量出来的缺口里，
   所以那一格只问**名字在不在**（`typeof`），**不调它**——用例正文里写明了这一句。
2. `r678-names-globalthis` 量出的 97 个名字**绝大多数是 v1 非目标**
   （`docs/runtime-architecture.md` §15：`BigInt` / `Reflect` / `Proxy` / `Intl` / `RegExp` /
   定时器一族 / 各种 Web 平台对象）。它进矩阵是为了**看得见**，**不是**「还差 97 格要做」。

### 第 678 轮（其二）：换一个问法问**同一层**——名字装上了，**行为对不对**

上一批量的是**名字齐不齐**（成员表装修得怎么样）。这一批 21 条换一个问法：
**名字装上了，行为对不对**——原型读取与设置、描述符（数据 / 访问器 / 默认标志位）、
`in` 与 `hasOwnProperty`、`delete`、`for-in` 的枚举、数组的洞与显式 `undefined`、
`Object.keys` 的整数键次序、`instanceof` 与 `Symbol.hasInstance`、盒子对象、
`Object.is` 与 SameValueZero、`assign` / spread 对 symbol 键与访问器的处理、
`freeze` / `seal`、ToPrimitive 的先后、加减法里的 `ToNumber` / `ToString`。

**15 条 pass**——这一层的基本盘是对的（`getPrototypeOf` 走链、描述符五个标志位、
`for-in` 只走可枚举、洞与显式 `undefined` 在 `keys` / `in` / `forEach` / `join` 上的差别、
`Object.keys` 的整数键在前、数组去重里 NaN 与 -0 的处理、`assign` 连 symbol 键一起拷……）。
**6 条缺口，其实是 4 个根**：

| 用例 | 根子 |
| --- | --- |
| `r678-beh-setproto-change` + `r678-beh-proto-accessor` | **`[[Prototype]]` 没有「改它」的那条路**：`Object.setPrototypeOf` 被当成普通属性写（读回来还是旧原型），`__proto__` 这个访问器根本没装（与第 678 轮（其一）在 `Object.prototype` 名单里量到的一致）。**读**那一半是好的（`getPrototypeOf` 走链那条 pass），缺的是**写** |
| `r678-beh-defineproperty-symbol-key` + `r678-beh-instanceof-hasinstance` | `Object.defineProperty` **只收字符串键**：symbol 键直接抛 `unimplemented: … needs (object, string key, descriptor object)`。于是「用 symbol 键装一格」这一族整条断——`Symbol.hasInstance` / `Symbol.toPrimitive` 这类自定义协议全在这条路上，而 `instanceof` 自己走原型链那一半是对的 |
| `r678-beh-boxed-primitives` | **盒子对象没有内部标签**：`Object.prototype.toString.call(new Number(3))` 给 `[object Object]`，该给 `[object Number]`。盒子本身造得出来（`typeof` / `valueOf` / 加法都对），缺的是「这个值是哪种内建」那一格——而 `toString` 的标签表本来就是按它分档的 |
| `r678-beh-tostring-valueof-order` | `String(new Date(0))` 打的是 **UTC** 墙上时间，`node` 打的是**宿主本地时区**——与 `gap-r676-std-date-local-time` / `r676-std-date-iso` **同一个根**（本地分量与本地时区名都还没有），这是那一族的**第三个出口**（前两个是 `getTime` 与 `toISOString`） |

**一条经验**：这一批的产出密度（21 条里 6 条缺口、4 个根）比上一批（28 条里 23 条缺口）
低得多——**名字那一层是「没装修」，行为那一层是「装修得不错、缝在几个结构性的地方」**。
两批一起看，缺口的位置很集中：**`[[Prototype]]` 的写、symbol 键的属性、内建的内部标签、
本地时区**——都不是「少装一个成员」，而是「缺一条机制」。

### 第 678 轮（其三）：顺着前两批指出的位置问**符号键与私有名**那一族

前两批把缺口聚到一处：`Symbol` 的 well-known 只装了一半、`Symbol.prototype` 三格全缺、
`defineProperty` 只收字符串键。于是这一批 19 条把 **symbol 当属性键**用一遍：
计算成员、`in`、`keys` 与 `getOwnPropertySymbols` 的分家、展开与 `assign` 保不保留符号键、
`Symbol.for` / `keyFor` 的全局注册表、自定义 `Symbol.iterator` / `toPrimitive` / `toStringTag`、
`delete` 一个符号键、符号当 `Map` / `Set` 的键（身份而不是名字）、`JSON.stringify` 丢掉符号、
类里的计算成员名，以及类里的私有名（`#x in o`、私有静态成员、私有方法）。

**17 条 pass** —— 这一族的基本盘是对的（这是最有用的读数：缺口不是「symbol 没做」，
而是「symbol 的成员表缺七格」）。**2 条缺口**：

| 用例 | 根子 |
| --- | --- |
| `r678-sym-wellknown-presence` | well-known symbol **只装了一半**：13 个里 `iterator` / `asyncIterator` / `toPrimitive` / `toStringTag` / `species` / `hasInstance` 在，缺 `isConcatSpreadable` / `unscopables` 与 `match` / `replace` / `search` / `split` / `matchAll` 五个。后五个正对 `RegExp` 协议那一族（`RegExp` 是非目标），但 **`isConcatSpreadable` / `unscopables` 与 `RegExp` 无关**——它们是 `Array.prototype.concat` 与 `with` 语句那两个协议的名字，属于「少装两格」 |
| `r678-sym-getownpropertydescriptor-symbol` | 同（其二）那一格：`defineProperty` 只收字符串键 ⇒「用符号键装一格再读回来」整条链**从第一步就断**，量不到描述符那一半（`getOwnPropertyDescriptor` 自己收字符串键是好的） |

**一条探针自己的教训**：`r678-sym-private-accessor` 被判 `nodefail` —— `#n in d` 写在类**外面**
是**语法错误**（私有名只在声明它的类体里可见），`node` 自己就报 `SyntaxError`。
这就是 README 里那条规矩的实例：**`nodefail` 的不要进矩阵**（那是用例自己不合法），
所以那一条**没有**收进来。私有名本身是好的（同批里 `#x in o` 与私有方法那几条都 pass）。

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
