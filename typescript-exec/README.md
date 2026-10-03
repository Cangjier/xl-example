# typescript-exec —— TypeScript 的降级层与标准库（本语言专有）

与 `typescript/`（TS 的 token 层）配对：**token 层负责「读成树」，本目录负责「树 → IR」**，
并携带这门语言的标准库。多语言的落点在这里——新增一门语言就是新增一个 `xxx-exec/`，
[runtime/](../runtime/README.md) 一行都不用动。

契约：[docs/runtime-architecture.md](../docs/runtime-architecture.md)（IR、槽、帧、GC 安全点都在那边）。

## 离「直接跑完整 TS 文件」还有多远（第 129 轮读数）

**口径**：目标不是「支持某种方言」，而是**一份普通的、没为这个运行器改过的 `.ts`
交给 `tsrun`，stdout 与 `node` 逐字节相同**。按这个口径分三层看：

| 层 | 进度 | 说明 |
| --- | --- | --- |
| **引擎**（`runtime/`） | **~92%** | 值 / 堆 / GC / 帧 / IR / 装载验证 / 执行器 / 宿主 ABI 都在跑；**线形态从第 129 轮起承载 f64**（升 v2，载荷是十进制文本）✓；缺 wasm 执行器（P3）、特化与内联缓存（P4） |
| **降级层**（本目录） | **~84%** | 语句 / 表达式 / 类 / 闭包 / 生成器 / `for..of` / `try` / 解构（名字那一半）都在跑；**数字字面量的全形态**（小数 / 指数 / 十六·八·二进制 / 分隔符）第 129 轮补齐 ✓；缺**展开与剩余**（`...`）、参数里的解构、正则、`export default` |
| **标准库**（`builtins/`） | **~72%** | `Array` / `String` / `Object` / `Math` / `Number` / `JSON` / `Error` / `Map` / `Set` / `Symbol` / `Date` 的常用那一半；第 130 轮补上 `findIndex` · `Array.from` · `Object.assign` · `String.fromCharCode` · `String.replace` · `new Map(键值对)` · `new Set(数组)` ✓；**第 131 轮补上 `console.log` 的 `util.inspect` 形状**（`builtins/inspect.xl.md`）✓；缺 `reduce` / `sort`（回调通道只带一个实参）、原始值原型（数字与布尔上的方法）、`Promise` 的组合子 |
| **端到端**（普通 `.ts` 文件） | **~84%** | 23 份语料逐字节一致（含类、继承、集合、生成器、`await`、标准库、类字段与 `static`、数字字面量全形态、标准库第三批、**`console.log` 的容器形状**）；**已知的三个拦路虎（浮点字面量、`[x in y]`、`console.log` 容器）都关掉了** ✓，下一个是**展开与剩余**（`...`：语料里十五条日常写法**全部**抛 ✗，见「下一步」） |

**这三个百分数是估计，不是读数**——它们是按「这一层要做的事还剩多少」折算的，
每轮按实测的新缺口与新补上的构造更新；**唯一硬读数**是下面这两条判据的条数
与语料数（`runtime:check` 173 条 / `runtime:cli` 23 份 ✓）。

**下一步（第 131 轮量出来的）**：拿十五条日常写法逐条问「Node 给什么、tsrun 给什么」，
**全部十五条都抛** ✗——`...rest` 参数、`f(...xs)`、`[...xs]`、`{...o}`、
参数与声明里的解构（`function f({a})` / `const [x=9] = []` / `const {a,...r} = o`）✓。
它们是**同一个家族**（展开与剩余 + 绑定模式的默认值）✓，
而**每一条都要动引擎** ✓：`Op.Call` 收的是**定长**的连续参数窗口 ✗，
`FunctionInfo.ParamCount` 也是定长 ✗——「把多出来的实参收成一个数组」
与「按一个数组铺开实参」都要新的算子与帧侧支持 ✓。
那是**下一轮（或下两轮）的主线** ✓。

> **状态：已开始。** `lowering.xl.md` + `scope.xl.md` 落地了**最小构造集 + 提升 + 闭包捕获**，
> 并跑通了 **P0 的形状**：同一份 `.ts` 交给 Node 与交给「真解析器 → 降级 → IR → VM」，
> **逐值一致**（判据 `npm run runtime:check` 的最后二十几节，共 165 条全绿）。
> 收了：变量声明（`let`/`const` 块作用域、`var` 函数作用域，含**对象与数组解构**——**不退水位**，
> 见台账第 119 轮）、**`class`（构造函数 + 原型上的方法 + 访问器；`extends` / `super(...)` / `super.m()`；
> 字段初始化与 `static` 仍抛）**、
> 表达式语句 / `return` / `throw`（**含 `throw { … }`**）/ `if` / `while` / **`for(;;)`** / **`for..in`** /
> **`for..of`（走迭代协议，含遍历生成器）** / **`try`/`catch`/`finally`（三条路，`catch` 也能解构）** /
> **`switch`/`break`/`continue`** / 块 / 函数声明；
> 数字·字符串·布尔·`null`·`this`（**只有箭头沿环境链取，见第 119 轮**）·标识符 /
> 二元（**含 `&&` / `||` 短路与 `in`**）/ 赋值 / **复合赋值（名字、属性、下标三种左值）** /
> **字符串拼接（`ToString`）** / 调用 / **方法调用**（`obj.m()`，`this` 落在接收者上）/
> 属性与下标（含 **`?.`**）/ **`??`** / **对象与数组字面量**（含洞、计算键、方法、访问器）/
> **箭头函数与函数表达式** / **默认参数与可选参数**（第 119 轮）/ **`new`** / **`typeof`** /
> **`yield`** / **`await`**，以及**提升**（函数声明与 `var`）与**闭包捕获**（环境记录 + 深度 +
> 宿主按导出闭包调用）。
> **`.ts` 已经能直接执行**：仓库根的 [tsrun.xl.md](../tsrun.xl.md) 是运行器 +
> 命令行（`node build/ts/tsrun.js <文件.ts>`），stdout 与 `node <文件.ts>` **逐字节相同**
> （判据 `npm run runtime:cli`，语料 `tests/runtime/cases/*.ts`，裁判是真 Node）。
> **还差**（按已知的次序）：**token 层的一条**——`[x in y]`（**数组字面量里放 `in` 表达式**）
> 被读成映射键的 `TypeParameter` ✗，降级层拿到的是一个认不出的节点，报
> `unimplemented: expression TypeParameter` ✓（复现：`function f(o) { return ["a" in o]; }` ✓——
> `"a" in o` 单独写、放在 `const r = …` 里、或直接写在模块顶层都对 ✓，**只有套在 `[…]` 里**才歪 ✓；
> `cases:tsast` 全语料 1427 份都是绿的 ✓，所以它是**语料之外**的一条 ✓）；
> `Array.from` / `Object.assign` 那一类静态方法、解构的默认值与剩余、
> `TDZ` 的动态那一半、正则、**大整数字面量**（含 `BigInt`）仍装不进线形态（P2）。
>
> **数字字面量第 129 轮补齐了**（`tests/runtime/cases/21-numeric-literals.ts` ✓）：
> 小数 / 指数 / 十六·八·二进制 / 数字分隔符全认 ✓。做法**分成两半** ✓——
> **收不收**由 `ScanNumber` 自己扫 ✓（不认的形态**响亮地抛**，`BigInt` 还**指名道姓** ✓），
> **舍入成什么数**交给宿主的转换器 ✓。理由是实测的：老版本
> `sign * (whole + fraction / scale)` 在 20 万个「整.小数」里**错 2 个**
> （`43.695449` 自算给 `43.695448999999996` ✓）——两次舍入不是一次舍入 ✗，
> 而那正是 `rt.xl.md` 说的「不许静默给个近似值」✗。
> 那一处借用搬到了引擎的 [runtime/host-text.xl.md](../runtime/host-text.xl.md) ✓，
> 与第 124 轮那条「浮点 → 文本」合成一处 ✓。
>
> **线形态升到 v2**：常量池的 `Float64` 档从「编码侧直接拒」变成**承载十进制文本**
> （`runtime/ir-verify.xl.md` ✓）。选文本而不是 IEEE 位模式的理由、以及「最短往返 ⇒ 不丢位」这条
> 依据，都写在那两个文件里 ✓；解码侧还多一步**正向重算自检** ✓
> （字节里的文本不是这个格式写的就返回 `null` ✓）。
>
> **顺路修掉一处潜伏 bug**（`runtime/rt.xl.md`）：`===` 原来**先比档位** ✗，
> 于是 `-0 === 0` 给 `false` ✗。`Int32` 与 `Float64` 是**同一个 JS 类型的两种表示** ✓，
> 运算符不许看见表示 ✗——`<` / `<=` / `>` / `>=` 那四条一直是对的 ✓，只有 `===` 漏了 ✓。
>
> **字符串拼接会挑路**（第 125 轮）：`+` 里有一边是**字符串字面量**时，降级层把它落成
> 语言内建 `StringConcat`（另一边走「任意值 → 文本」，所以 `"x=" + obj` / `"n=" + 5 / 2`
> 都对 ✓）；两边都是变量时照旧走引擎的 `rt_call add`（热路径不动）。
> **模板串走同一条**（`` `${obj}` `` 也不再抛）。
>
> **浮点与对象/数组的文本形态已经有了**（第 124 轮，`builtins/text.xl.md`）：
> `console.log` / `join` / `JSON` / `Error` 的消息都走「任意值 → 文本」——
> 浮点是**最短往返十进制**（借用宿主的转换器：那是 IEEE 754 的活儿），
> 对象给 `[object Object]`，数组按 `,` 连（**洞 / `null` / `undefined` 渲染成空串**，每一层都成立）。
>
> **标准库这一层已经有了**：`Array`（push / pop / join / indexOf / slice / forEach / map / filter /
> find / some / every / concat / reverse / includes，以及静态的 `Array.isArray`——**`new Array(n)` 不支持**）、
> `String`（charAt / charCodeAt / indexOf / slice / split / toUpperCase / toLowerCase / trim /
> includes / startsWith / endsWith / substring / repeat / padStart / padEnd——
> **大小写与 trim 只做 ASCII**，非 ASCII 响亮地抛）、
> `Object`（keys / values / entries——**后两个跳过访问器**）、
> `JSON`（stringify + **parse**，第 122 轮；坏输入是**脚本接得住**的异常）、
> `Math`（floor / abs / max / min / round / ceil / trunc / sign / **sqrt / pow**）、
> `Number`（**isInteger / isNaN**，只认不转）与全局的 **`parseInt` / `parseFloat`**（第 126 轮）、
> `Error`（`message` + `name`，**没有 `stack`、没有 `instanceof`**）、`Map` / `Set`（含 `forEach` 与直接迭代）、
> `Symbol`、`Date`（`new Date(ms)` + UTC 日历那一族，**时钟由宿主回答**）。
> **已知没做的**：原始值原型（`(1e3).toString()` 报 `calling a non-closure value` ✓）——
> 那是本仓记着的下一条缺口 ✓，不是这一轮要验的东西 ✓。
>
> **类这一层也补齐了一批**（第 128 轮）：**实例字段初始化**（`x = 1`；光写名字的字段
> 也真的存在 ✓）、**`static` 字段 / 方法 / 访问器**、**`static { … }` 静态块**。
> 顺序照 JS：静态成员在**类声明的位置按源码顺序**求值 ✓、实例字段在**构造函数体之前**
> （参数默认值之后）✓、派生类里**跟在 `super(...)` 之后** ✓（`super` 落在语句中部也对 ✓）。
> **两处写在明处的差异**：① 字段写入走**赋值**（`set_prop`），JS 的类字段走
> `[[DefineOwnProperty]]` ——**原型上有同名 setter** 时行为不同（JS 不调它，这里会调）；
> ② `extends` 一个表达式（`class B extends mixin(A) {}`）仍抛。
>
> **第 128 轮还修掉两处顺路暴露的老缺口**（都不是新写出来的，是这一轮的新判据踩到的）：
> ① **全局名在内层函数里看不见** ✗——`class A { constructor() { console.log(1) } }` 在
> **降级期**就报 `name is not a local or a capture: console` ✓（`Math` 同理 ✓；此前每条判据
> 都恰好只在**方法**里用过全局名，所以一直没露）；
> ② **构造函数不算「内层函数」** ✗——捕获分析看不见「构造函数体里引用了模块作用域的名字」✓，
> 于是模块那一层不为它留格子 ✗。两条都在 `lowering.xl.md` 与 `scope.xl.md` 里写清了根因。
>
> **失败的口径**（第 121 / 127 轮）：内建抛的仍然是**宿主异常** ✓，两处各抬一半 ✓——
> **宿主通道**那一层（`install.xl.md` 的 `RaiseFromHost`）管**宿主函数**的失败 ✓，
> **引擎的 `Guard`**（`runtime/vm.xl.md` 的 `SetErrorFactory`）管 **rt 层**的失败 ✓。
> 于是 `try { JSON.parse(t) } catch` 与 `try { a + b } catch` **都成立** ✓
> （在此之前那两个 `catch` **走不到** ✗：异常直接冒出 `Run()`）。
> **接法写在明处**：宿主接内建时把兜底包在调用外面、并给机器装一个错误工厂
> （`tsrun` 与判据都这么接）。

## 输入是「TS 形状」，不是 token 树

降级层吃 token 树的**第三个出口**（`Token.PrintAst`，规格见 [docs/ts-ast.md](../docs/ts-ast.md)），
理由有三条：

1. 它与 `ts.createSourceFile` **逐节点一致**（语料 1407 份全绿）——这是本工程最硬的一条判据；
2. 它按 TS 的划分出节点，**已经修掉 token 树那几处结构口径**
   （例如「块与后一条语句并进同一个 `<Statement>`」，投影层是按 TS 拆的）；
3. 它是纯数据、有文档、有判据，降级层因此不必依赖 token 层的内部细节。

**代价与待办**：投影目前跑在 `Map<string, any>` / JSON 形状上，会分配。
是否给 token 层加一个**同逻辑、不 JSON 化**的紧凑 AST 出口，等 P0 的实测数据说话
（已记在 [design-notes §五](../docs/runtime-design-notes.md)）。

## 文件计划

```
typescript-exec/
  lowering.xl.md        ✔ 已落地（最小构造集 + 槽分配 + 函数表 + 导出闭包表
                         + 类字段 / `static` / 静态块，第 128 轮）
  scope.xl.md           ✔ 已落地（捕获分析 + 环境链与深度；`Constructor` 也算一层，第 128 轮）
  statements.xl.md      语句与声明（提升、`for`/`for..of`、`try`）
  expressions.xl.md     表达式与运算符（`&&` / `||` / `??` / `?.` 展开成控制流，不进 id 表）
  modules.xl.md         import/export → 宿主的模块解析回调
  async.xl.md           async/generator → suspend/resume + 微任务队列
  bindings.xl.md       ✔ 已落地（`.d.ts` 能力名 → 能力号；查号回调交给降级层）
  builtins/             标准库：Object / Function / Array / String / Number / Math /
                        JSON / Error / Promise / Symbol / Map / Set / Date
    array.xl.md         ✔ 已落地（push / pop / join / indexOf / slice + 谓词族与 forEach/map/filter）
    string.xl.md        ✔ 已落地（charAt / charCodeAt / indexOf / slice）
    map.xl.md           ✔ 已落地（构造 / set / get / has / delete / size / keys / values / entries / clear / forEach）
    set.xl.md           ✔ 已落地（同上那一族）
    install.xl.md       ✔ 已落地（装库入口 + 按号段总分派 + 语言内部辅助号）
    globals.xl.md       ✔ 已落地（全局名名单 + Math / console / Object / JSON / Symbol / Date，日志交宿主回调）
    inspect.xl.md       ✔ 已落地（`console.log` 的 `util.inspect` 形状，第 131 轮）
  builtins/             标准库：Object / Function / Array / String / Number / Math /
                        JSON / Error / Promise / Symbol / Map / Set / Date
```

**运行器与命令行在仓库根**：`tsrun.xl.md`（`RunSources` + `RunMain`）——
它是**唯一允许同时 import 三层**的那一层（`runtime/` + `typescript-exec/` + `typescript/`），
所以与 `cjcli.xl.md` 并列放在根上。判据 `tests/runtime/run-cli.mjs`
（`npm run runtime:cli`）拿真 Node 当裁判逐字节对拍。

**标准库为什么在这里而不在 `runtime/`**：`Object` / `Array` / `String` / 原型链 / 迭代协议
是 **JS 家族的语义**，与「引擎」无关——换一门语言一套都用不上。
`runtime/` 只放引擎（值 / 堆 / GC / 帧 / IR / VM / 验证 / 宿主 ABI / wasm 执行器）。
将来若还要加 JS 家族的第二门语言，再把 `builtins/` 提成顶层的 `js-builtins/` 共享。
**唯一的例外是 [runtime/host-text.xl.md](../runtime/host-text.xl.md)**（第 129 轮）：
「码元 ↔ 字符串」「十进制 ↔ 双精度」的语义分别由 `value.xl.md` 与 IEEE 754 定死，
四个目标给同一个答案，所以它住在引擎里；借的是**转换**，不是**格式**。

## 第 129 轮的账（数字字面量 · f64 线形态）

**关掉的那一条**：`3.14` 这种字面量原来在**降级期**就抛 ✗
（`unimplemented: only integer literals (the wire form has no float payload)`）——
它是「一份普通 `.ts` 直接跑」的**第一个拦路虎** ✓。现在语料
[tests/runtime/cases/21-numeric-literals.ts](../tests/runtime/cases/21-numeric-literals.ts)
15 行 stdout 与 `node` 逐字节相同 ✓。

**这一轮真正的取舍有两个**，都写在明处：

1. **十进制 → 双精度的舍入借给宿主**（`runtime/host-text.xl.md`）✓。
   摆过的候选与实测证据都在那个文件里：手写版在 20 万个「整.小数」里错 2 个 ✓，
   而「正确舍入是 IEEE 754 的活儿」这条理由与第 124 轮「浮点 → 文本」是同一句 ✓。
   代价是**引擎里出现了宿主 API** ✓——所以同一轮把它收成**一处**，并加了判据扫产物 ✓
   （除 `host-text.js`，`build/ts/runtime/**` 里不许有那三个标记 ✓）。
2. **线形态用十进制文本承载 f64，而不是 IEEE 位模式** ✓。
   位模式要**位重解释** ✗（`value.xl.md` 明说 xl 表达不了、也不该表达 ✓），
   而且它只解决线形态 ✗。文本的关键依据是**最短往返与双精度一一对应** ✓，所以不丢位 ✓；
   代价是体积 ✓（一个常量十来个码元 vs 4 字节 ✓）。解码侧多一步**正向重算自检** ✓。

**顺路修掉的两处**（都不是新写的，是这一轮的判据踩出来的）：

- **`===` 先比档位** ✗（`runtime/rt.xl.md`）：`Int32` 与 `Float64` 是**同一个 JS 类型的两种表示** ✓，
  运算符不许看见表示 ✗，于是 `-0 === 0` 原来给 `false` ✗。`<` / `<=` / `>` / `>=` 一直是对的 ✓。
- **`MakeNumber` 把 `-0` 收成 `Int32`** ✗（同一个文件）：收窄成 `int` 之后**符号位就没了** ✗，
  而 ts 的 `number` 恰好还留着 ✓——于是两个目标**分歧** ✓。现在 `-0` 走 `Float64` ✓。

**仍然记着的缺口**（这一轮**没**做，别当成漏测）：

- **`console.log(-0)` 的渲染差一格** ✓：Node 用 `util.inspect`，它印 `-0` ✓；
  本层 `console.log` 走的是 `String` 语义（`String(-0)` 是 `"0"` ✓）——所以 tsrun 印 `0` ✗。
  `1 / -0`（`-Infinity` ✓）、`"" + -0`（`"0"` ✓）两边的**值**都对 ✓，
  差的只是 `console.log` 那一行文本 ✓。（`console.log(obj)` 那一类也一样是 `util.inspect` 的口径 ✓，
  本仓一直印 `[object Object]` ✓——所以这一格属于**已经记着的那一类** ✓，不是新缺口 ✗。）
- **十六 / 八 / 二进制超过 2^53 会响亮地抛** ✓（十进制多长都能算 ✓，因为那一段交给宿主 ✓）。
  理由与修法（P2 的类型层要 i64 / 多精度）写在 `ScanNumber` 那条注释里 ✓。
- **`(1e3).toString()`** 报 `calling a non-closure value` ✓：原始值的原型链还没做 ✓。

**欠着的一笔：C++ 目标（`npm run cpp:check` 现在是红的）。**
第 129 轮动了五个 `*.xl.md`（`runtime/ir` · `runtime/ir-verify` · `runtime/rt` ·
`typescript-exec/builtins/text` · 新增 `runtime/host-text`）✓，
第 130 轮又动了六个 `builtins/*.xl.md` ✓，第 131 轮再动两个（`builtins/globals` ·
新增 `builtins/inspect`）✓，而 C++ 是**计划通道**（产物由 `xl_plan` / `xl_context` / `xl_emit` 生成 ✓）——
指纹一改，那些源的全部部件都判「陈旧」✓。这三轮**只做了 TS 那一条出口** ✓，
所以 C++ 那一份**欠着** ✗：按 [docs/xl-to-cpp.md](../docs/xl-to-cpp.md) 逐源重发
（**没改动的部件照抄旧产物** ✓，真要改写的只有几十处 ✓）。
**它不影响「直接跑 .ts」那条判据** ✓（那是 TS 出口的事 ✓），所以它排在「能跑更多普通程序」后面 ✓。

## 第 131 轮的账（`console.log` 的形状：`util.inspect` 那一份）

**这是端到端最大的一格，这一轮关掉了** ✓。Node 的 `console.log` **不走 `ToString`** ✗，
走的是 `util.inspect` ✓：`console.log([1,2])` 印 `[ 1, 2 ]` ✓、`console.log({a:1})` 印 `{ a: 1 }` ✓、
数组里的字符串带**单引号** ✓、`Map` / `Set` / `Date` / 函数各有各的写法 ✓。
在此之前本层印的是 `1,2` / `[object Object]` / 裸的 `a` ✗——
**任何 `console.log(数组 / 对象)` 的普通程序都对不齐 stdout** ✗，
前 22 份语料全是**绕开它**写的 ✓（那不是「已经对了」✗）。

新增 [builtins/inspect.xl.md](builtins/inspect.xl.md)（**纯语言层，`runtime/` 一行未动** ✓），
语料 [tests/runtime/cases/23-console-log-shapes.ts](../tests/runtime/cases/23-console-log-shapes.ts)
**61 行 stdout 与 `node` 逐字节相同** ✓。

**这一轮的方法值得记下来：每一个常数都是量出来的，不是猜的** ✓。

| 量出来的东西 | 读数 |
| --- | --- |
| 折行宽度 | **80**（Node 文档写的是 128 ✗，实测是 80 ✓） |
| 平铺的余量 | **9** ⇒ 单行 ≤ **71** 平铺 ✓，72 折行 ✓ |
| 深度 | 收口判据是 `level > 2` 而**不是** `>= 2` ✓（量出来差一层 ✓） |
| 分组列数上限 | **12**（`[0..n]` 扫出来的：`7, 9, 10, 11, 12, 12, …` ✓） |
| 引号 | 没单引号给 `'` ✓、有单引号没双引号给 `"` ✓、两种都有给 `` ` `` ✓ |
| 属性名加不加引号 | **窄规则**（`a$b` 与 `中` 都加 ✓——不是 JS 标识符那一套 ✗） |
| 洞 | 连着两个洞是**一条** `<2 empty items>` ✓，不是两条 ✓ |
| 列对齐 | **右对齐** ✓（数字与字符串都是 ✓） |

**分组那一段照抄了 Node 的算法**（含那个 `sqrt` 的启发式 ✓）：
`列数 = min(round(sqrt(2.5·项数 / biasedMax)), floor((80 - 缩进) / 每项宽), 12, 项数)` ✓。
三条折行规则（**超过 6 项不许平铺** ✓、单行 ≤ 71 ✓、至多 12 列 ✓）都有判据钉着 ✓——
它们变了会红 ✓。

**三处已知差写在 `inspect.xl.md` 的表里，并且各自有判据钉住** ✓（不是「顺便没做」✗）：

1. **折行预算在嵌套里 Node 更宽** ✗：顶层 `[ 'x'*65 ]`（71 字符）平铺 ✓、72 折行 ✓，
   边界正好 71 ✓；可是同一个数组放进对象里当下属（缩进 2）时，**140 甚至 1000 字符都还平铺** ✓。
   这一层**统一用顶层那条规则** ✓，于是嵌套的容器比 Node 更容易折 ✗。
   **这一条是量出来的、不是没量** ✓——所以它记着，而不是假装一样 ✗。
2. **循环引用**：Node 给 `<ref *1> { … [Circular *1] }` ✓，这一层靠**深度上限**收口 ✓
   （`{ self: { self: { self: [Object] } } }` ✓）——**不转圈** ✓（宿主栈溢出不可捕获 ✗）。
3. **整数样式的键的次序**：JS 把 `{ 2: … }` 这类键排到最前 ✓，本层一律按插入顺序 ✗
   ——那是**更早就记着**的一条 ✓（`for..in` 那一轮就写了 ✓）。

**还有一条够不着的** ✗：`console.log(err)` 在 Node 里印的是**调用栈** ✓，
而这一层拿不到那个栈 ✗（`Error` 上没有 `stack` ✓）——那一格只能记着差异 ✓。

## 第 130 轮的账（标准库第三批）

**这一批是「按实测挑的」** ✓：拿十几条日常写法逐条问「Node 给什么、tsrun 给什么」✓，
把各自独立的缺口按「一条一条都验得动」的标准收成一批 ✓：
`findIndex` · `Array.from` · `Object.assign` · `String.fromCharCode` ·
`String.replace`（字符串找字符串）· `new Map([[k, v], …])` · `new Set([…])`。
语料 [tests/runtime/cases/22-stdlib-third-batch.ts](../tests/runtime/cases/22-stdlib-third-batch.ts)
13 行 stdout 与 `node` 逐字节相同 ✓。

**这一批里唯一「不写新东西」的那一处是刻意的** ✗：`new Map(键值对)` / `new Set(数组)`
**复用各自的 `set` / `add`** ✓——同一个键覆盖、`size` 跟着涨、重复值不进去 ✓，
这些规矩都只有一处实现 ✓，写第二遍就是第二处会走偏的判据 ✗。

**一条从判据现场量出来的形状差** ✓：`Array.from` **不能**拿 `AppendSlot` 铺格子 ✗。
`AppendSlot` 的规矩是「洞跟着走」✓（`concat` / `slice` 要的就是这个 ✓），
而 JS 的 `Array.from` 是**逐下标读** ✓——洞读出来是 `undefined` ✓，
于是 `1 in Array.from([1, , 3])` 在 JS 里是**真** ✓。用错会**静默改形状** ✗
（判据当场报的就是这一格 ✓）。**两个「看起来一样」的复制，语义可以不同** ✓——
所以那两条各自写在注里，谁也不抄谁 ✓。

**三条故意不做、且必须「响亮地抛」的形态** ✓（判据逐条钉住了消息里说的是**哪一个** ✓）：

| 形态 | 为什么不做 |
| --- | --- |
| `Array.from(生成器)` | 走完一个生成器要发 `iter_next` ✓，那是**指令**、不是建库层能调的函数 ✗ |
| `String.replace(正则 / 函数, …)` | 两样都还没有 ✓；**静默当字面量会给出看起来对的错答案** ✗（`"a-a".replace(/a/g,"b")` 在 JS 里是 `"b-b"` ✗） |
| `Object.assign(原始值, …)` | JS 会**装箱** ✗，本仓没有那一层 ✓ |

**一条量清楚、但这一轮没动的引擎级限制** ✓：`reduce` 与 `sort` 做不出来，
不是「没排上」✗，是**回调通道只带一个实参** ✓（`NativeCall` 的签名 ✓，与 `Map.forEach`
不传 `key` / `map` 是同一条 ✓）。`findIndex` 只要一个 ✓，所以它做得出来 ✓。
扩展那条通道牵动**全部调用点** ✓，单独立一轮 ✓——**这条限制现在有了实测的边界** ✓。

**顺带补上的一处**：`String` 这一轮才第一次作为**全局名**存在 ✓（此前只有 `String.prototype` 上的方法 ✓），
所以 `GlobalNames` 多了它 ✓。**它只是「静态方法之家」** ✗：`String(x)` 这种**当函数调**
还不通 ✓——那要求一个值**既是对象又是可调用的** ✓，而值模型今天只有两半里的各一半 ✓
（`vm.xl.md` 的 `DoNew` 把这条缺口写在明处 ✓，`Number(x)` / `Boolean(x)` 同一条 ✓）。

## 两条口径

1. **类型位一律擦除**：不做类型检查，`let x: number = "s"` 照跑。
   全量 TS 指的是**语法全支持**，不是**类型语义全实现**。
2. **语言专有的语法糖在降级期展开**，不进 runtime 的 id 表——
   id 表是多语言共用的契约（`a ?? b` → 控制流 + `jmp_if_not_nullish`）。
