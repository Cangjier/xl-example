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
| **引擎**（`runtime/`） | **~95%** | 值 / 堆 / GC / 帧 / IR / 装载验证 / 执行器 / 宿主 ABI 都在跑；线形态从第 129 轮起承载 f64（升 v2）✓；第 133 轮加了第 22 个算子 `call_array` 与函数表上的 `HasRest` ✓；第 136 轮 `iter_new` / `iter_next` 认字符串 ✓、字符串下标读 ✓、空值上的属性读会抛 ✓；**第 137 轮加了「内建构造函数 → 原型」登记表**（`instanceof` 靠它认 `Array` / `Error` ✓）与三格错误原型 ✓；缺 wasm 执行器（P3）、特化与内联缓存（P4） |
| **降级层**（本目录） | **~95%** | 语句 / 表达式 / 类 / 闭包 / 生成器 / `for..of` / `try` / 解构都在跑；数字字面量的全形态（第 129 轮）✓；展开与剩余的两半（第 132 / 133 轮）✓；解构形参（第 134 轮）✓；`for..of` 头部的解构 · `var` 提升 · 对象剩余（第 135 轮）✓；缺 `new C(...xs)` 与 `super(...xs)`、正则、`export default` |
| **标准库**（`builtins/`） | **~75%** | `Array` / `String` / `Object` / `Math` / `Number` / `JSON` / `Map` / `Set` / `Symbol` / `Date` 的常用那一半；第 130 轮的 `findIndex` · `Array.from` · `Object.assign` · `String.fromCharCode` · `String.replace` ✓；第 131 轮的 `console.log` 形状 ✓；**第 137 轮的 `Error` / `TypeError` / `RangeError` 三个构造函数 + 三格原型 + `constructor` 链** ✓；缺 `reduce` / `sort`、原始值原型、`Object.prototype` 上的方法（`hasOwnProperty` 那些）、`Map` / `Set` / `Date` 自己的原型格 |
| **端到端**（普通 `.ts` 文件） | **~97%** | 29 份语料逐字节一致（含类、继承、集合、生成器、`await`、标准库、类字段与 `static`、数字字面量全形态、标准库第三批、`console.log` 的容器形状、展开与剩余的两半、函数的两条形状、解构形参、`for..of` 解构与 `var` 提升、字符串可迭代与空值读抛、**`instanceof` 与错误家族**）；**已知的九个拦路虎都关掉了** ✓，下一个是 **`Map` / `Set` / `Date` 自己的原型格**与**错误「种类」的引擎那一侧**（见「下一步」） |

**这三个百分数是估计，不是读数**——它们是按「这一层要做的事还剩多少」折算的，
每轮按实测的新缺口与新补上的构造更新；**唯一硬读数**是下面这两条判据的条数
与语料数（`runtime:check` 187 条 / `runtime:cli` 29 份 ✓）。

**下一步（第 137 轮收尾时看着的）**：

1. **`Map` / `Set` / `Date` 自己的原型格** ✗：`new Map() instanceof Map` 还抛
   「the right side of instanceof has no prototype object」✓——它们**没有那一格** ✗
   （实例今天挂的是 `Object.prototype` ✓）。做法与 `Error` 那三格**一模一样** ✓：
   `Protos` 加三格 ✓、`map.xl.md` / `set.xl.md` / `Date` 造实例时挂上去 ✓、
   `BuildGlobals` 里 `RegisterConstructorProto` ✓。**登记表那一格已经在了** ✓，这一条是纯体力 ✓。
2. **错误「种类」的引擎那一侧** ✗：`try { null.y } catch (e) { e instanceof TypeError }` 现在是
   `false` ✗（Node 是 `true` ✓）——引擎抛的走错误工厂 ✓、**接得住** ✓，
   但工厂**只带一句话、不带种类** ✗。候选是把 `Guard` 与 `ErrorFactory` 都加一格
   **失败的类别** ✓（引擎知道「这是一次类型失败」✓，语言层知道「它叫 `TypeError`」✓——
   与 `PrototypeKey` 同一条分界 ✓）。
3. **`class X extends Error` 还抛** ✗（**响亮地** ✓，第 137 轮特意加的 ✓）：
   `super(m)` 落在内建构造函数上时，那一族是「自己造一个新对象返回」那一款 ✓，
   于是新对象被丢掉 ✓、`this` 上一个属性都没写 ✗（**症状是 `e.message` 空着** ✓）。
   要真做得让内建构造函数支持「往传进来的 `this` 上初始化」✓。
4. **`new C(...xs)` / `super(...xs)`** ✗：给 `CallArray` 补「构造目标」那一个操作数 ✓。

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
新增 `builtins/inspect`）✓，第 132 轮动两个（`builtins/install` · `lowering`）✓，
第 133 轮动**四个**（`ir` · `ir-verify` · `vm` · `link` + `lowering`）✓，
而 C++ 是**计划通道**（产物由 `xl_plan` / `xl_context` / `xl_emit` 生成 ✓）——
指纹一改，那些源的全部部件都判「陈旧」✓。这三轮**只做了 TS 那一条出口** ✓，
所以 C++ 那一份**欠着** ✗：按 [docs/xl-to-cpp.md](../docs/xl-to-cpp.md) 逐源重发
（**没改动的部件照抄旧产物** ✓，真要改写的只有几十处 ✓）。
**它不影响「直接跑 .ts」那条判据** ✓（那是 TS 出口的事 ✓），所以它排在「能跑更多普通程序」后面 ✓。

## 第 137 轮的账（`instanceof` 认内建构造函数 · 错误家族）

第 136 轮把「错误种类（`TypeError`）」列成下一步 ✓，一进门量它——
发现**整族 `instanceof` 都是红的** ✓：

```
[] instanceof Array              → the right side of instanceof has no prototype object
new Map() instanceof Map         → 同一句
new Error("x") instanceof Error  → 同一句
```

**根因**：内建构造函数是 **`HostRef` 值** ✓、**没有属性表** ✗——
`GetProperty(它, "prototype")` 永远是 `undefined` ✗，而 `instanceof` 正是靠读那个属性找目标的 ✓。

**修法是「引擎给一格、语言层填」** ✓（第 137 轮）：

| 谁 | 做什么 |
| --- | --- |
| **引擎** | `Vm.ConstructorProtos`（**扁平的成对数组** ✓：号 → 原型句柄 ✓）+ `RegisterConstructorProto` ✓ + `ConstructorProtoOf` ✓；`instanceof` 那一支**先看右边是不是 `HostRef`** ✓，是就查登记表 ✓，不是就照旧读 `prototype` 属性 ✓ |
| **语言层** | `BuildGlobals` 里 `vm.RegisterConstructorProto(ErrorCtor, protos.Error)` ✓ 等等；`Array` / `Object` / `String` 是**普通对象** ✓，直接挂 `prototype` 属性就行 ✓（不需要登记表 ✓） |

**引擎仍然不认识 `ErrorCtor` = 280** ✓（那是建库层的约定 ✓）——
与 `SetErrorFactory` ✓、`PrototypeKey`（名字由语言层给 ✓）是**同一条分界** ✓。

**三处「一半对一半错」的坑**（都当场量到了 ✓）：

1. **`Array.prototype` 那一格必须正好是 `Protos.Array`** ✗：挂一个新对象的话
   `[] instanceof Array` 给 `false` ✓，而链上其它判断又都对 ✓；
2. **原型链要接** ✗：`Array.prototype` / `String.prototype` / `Function.prototype`
   自己的原型是 `Object.prototype` ✓——不接的话 `[1] instanceof Object` 给 `false` ✗
   （而 `[] instanceof Array` 是对的 ✓，又是同一个形状 ✓）；
3. **键要按内容比** ✗：`PrototypeKey` 那格字符串与源码里写的 `prototype` 是
   **两个堆对象** ✓（字符串不去重 ✓），第一版**比句柄**，于是 `class X extends Error`
   照样报同一句话 ✓——改成 `RtCmpEqStrict` ✓（按内容 ✓）才对 ✓。

**错误家族**（第 137 轮）：`Error` / `TypeError` / `RangeError` 三个构造函数 ✓ +
`Protos` 里三格原型 ✓（后两者的原型是 `Error.prototype` ✓，
`Error.prototype` 的原型是 `Object.prototype` ✓）、
每个原型上 `name` / `message` / `constructor` 三格 ✓、
造出来的错误挂在**各自那一格**上 ✓（`NewErrorLike` ✓）——
于是 `new TypeError("t") instanceof Error` 成立 ✓、`e.name` 正确 ✓。

语料 [tests/runtime/cases/29-instanceof-and-errors.ts](../tests/runtime/cases/29-instanceof-and-errors.ts)
**7 行 stdout 与 `node` 逐字节相同** ✓。

**一处特意留下来的「响亮」** ✗：`class MyErr extends Error { constructor(m) { super(m) } }`
现在**抛** ✓（「unimplemented: super(...) on a builtin constructor」✓）——
`super(m)` 落在内建构造函数上时，那一族是「自己造一个新对象返回」那一款 ✓，
于是新对象被丢掉 ✓、`this` 上一个属性都没写 ✗（**症状是 `e.message` 空着，
而 `e.name` 被派生类自己写了、看着一切正常** ✓）。**静默的错值比抛糟得多** ✓，
所以这一轮选择抛 ✓，把真正做它列进「下一步」✓。

## 第 136 轮的账（字符串可迭代 · 字符串下标 · 空值上的属性读）

第 135 轮收尾量出「字符串不是可迭代物」✓，这一轮修它——而顺着它又找出**同一件事的另一半** ✓。
三处改动**都在引擎** ✓（`runtime/vm.xl.md` + `runtime/props.xl.md` ✓）。

| 改哪 | 原来 | 现在 |
| --- | --- | --- |
| **`iter_new` / `iter_next` 认字符串** | `for (const c of "ab")` 报 `iterating a non-object` ✗ | 一次一个**码元** ✓ |
| **字符串下标读** | `"xy"[0]` 给 `undefined` ✗ | 给 `"x"` ✓（越界仍是 `undefined` ✓） |
| **空值上的属性读** | `null.y` 给 `undefined` ✗，`try` 接不住 ✗ | **抛** ✓，而且脚本的 `try` 接得住 ✓ |

**① 那一支必须排在 `IsObject` 之前** ✗：字符串**不是对象** ✓（`ValueTag.String` ✓），
排在后面就永远走不到 ✓——报的还是那句 `iterating a non-object` ✓（第一版就是这么红的 ✓）。
**按码元拆** ✓——与 `.length` / 下标 / `charAt` / `spread_into` **同一条口径** ✓。
JS 那边字符串迭代是**按码点**的 ✗（`for (const c of "😀")` 只给一个 ✓，而 `"😀".length` 是 2 ✓）：
**这是一处已知差** ✓，记在「下一步」里 ✓——**单独让迭代按码点会更糟** ✗
（同一种东西两种答案，比一起偏更难查 ✓）。

**② 是「同一件事两处答案」** ✓，不是顺手补的：规范里原本写着
「字符串接收者仍然给 `undefined`——那是一块**已知的语义差**，写在规范里，不在这里顺手猜一个」✗，
可 `props.xl.md` 的 `GetIndex` **早就写着**「字符串给一个码元的字符串」✓——
只是 `vm.xl.md` 那一层对字符串**先给 `undefined`** ✗、根本没走到它 ✓。**删掉错的那一处** ✓。
它顺带修掉 `const [a, b] = "xy"` ✓（数组模式的解构**按下标读** ✓）。

**③ 要两处一起改** ✗：`props.xl.md` 的 `GetProperty` 抛 ✓，而**调用方也要包 `Guard`** ✓——
不包的话抛出来的是**引擎的**异常 ✓，整份程序照样挂 ✗（判据现场看到的是「脚本抛出」
而不是「caught」✗）。这与第 127 轮 `str + obj` 那条是**同一条纪律** ✓：
rt 层的失败要走**错误工厂**才变成「脚本接得住的值」✓。
**顺带量到一条编译期的坑** ✗：`this.Protos` 是**可变字段** ✓，
所以 `=== null` 的收窄**进不了闭包** ✓——要先落一个局部常量 ✓。

语料 [tests/runtime/cases/28-strings-and-nullish.ts](../tests/runtime/cases/28-strings-and-nullish.ts)
**8 行 stdout 与 `node` 逐字节相同** ✓。

## 第 135 轮的账（`for..of` 解构 · `var` 提升 · 对象剩余）

第 134 轮收尾列了三条待办 ✓，这一轮做掉前两条、顺路抓到**一条一直是死代码的判据** ✓。

| 做什么 | 怎么落 |
| --- | --- |
| **`for (const [k, v] of …)`** | 把绑定模式那一路**原样接进来** ✓——`Destructure` 里默认值、数组剩余、嵌套都已经在（第 132 / 134 轮）✓，这一处**一行新语义都没有** ✓ |
| **`var` 提升** | 判据从 `"Var"` 改成 **`"None"`** ✓（见下 ✓），并且**三种承载形状**都要认 ✓ |
| **对象剩余** | 新的语言内建号 **`rest_object(源, 已拆走的键数组)`**（`RestObjectId = 705` ✓，与 `spread_into` / `array_rest` 同一个写法 ✓）——名单在**编译期**就知道 ✓（同一份模式里前面那几个成员的键 ✓） |

语料 [tests/runtime/cases/27-forof-destructuring-and-var.ts](../tests/runtime/cases/27-forof-destructuring-and-var.ts)
**10 行 stdout 与 `node` 逐字节相同** ✓。

**这一轮最值钱的一处：`var` 提升一直是死代码** ✗。
`CollectHoistedVars` 判的是 `flags === "Var"` ✗——而 `var` 在 TS 的 `NodeFlags` 里
**没有标志**（`NodeFlags.None` ✓，只有 `let` / `const` 才有标志位 ✓），投影写成 `"None"` ✓，
**那个 `"Var"` 根本不存在** ✗。所以**一个名字都收不到** ✓
（判据现场：直接调 `CollectHoistedVars` 返回 `[]` ✓，连最简单的形状也是 ✓）。

**为什么一直没露** ✗：`var` 的**简单形状**（声明在前、用在后 ✓）**恰好与 `let` 同形** ✓——
按 `let` 办也对 ✓。一旦「用在前、声明在后」（`console.log(typeof z); var z = 1;` ✓）
或「声明在块里、用在外面」（`if (true) { var y = 3; } return y;` ✓），
差别就是**报错**（`name used before its declaration` ✓）或**错值** ✓。

**三种承载形状**（三种都漏过 ✓，前两种是这一轮补的 ✓）：

| 形状 | 为什么原来收不到 |
| --- | --- |
| `var y = 3;` | 判据本身错了（`"Var"`）✓ |
| `for (var i = 0; …)` | 列表**没有 `VariableStatement` 那层壳** ✗，而代码只在 `VariableStatement` 里找 ✓ |
| `var {a} = o;` | 名字在**绑定模式**里 ✓，而代码只认 `Identifier` ✗ |

**顺带量出来的两条**（都记进「下一步」了 ✓）：**字符串不是可迭代物** ✗
（`for (const c of "ab")` 报 `iterating a non-object` ✓——而 `[...'ab']` / `Array.from('ab')`
**早就通了** ✓，它们走 `spread_into` / `ArrayFromValues` ✓，那一层自己拆字符串 ✓）；
**解构 `null`** ✗（JS 给 `TypeError` ✓，本仓给 `undefined` ✓）。

## 第 134 轮的账（函数的两条形状 + 解构形参）

第 133 轮收尾时量出两条「普通代码里遍地都是」的缺口 ✓。这一轮修掉它们 ✓——
而**前两条都不在降级层** ✗，**在 token / 投影层** ✓：

| 缺口 | 根因 | 修在哪 |
| --- | --- | --- |
| `(function () { function f() { … } })()` 报 `unimplemented: statement FunctionExpression` | `ctx.expressionPosition` 是「**这一个**节点在表达式位」的标记 ✓，而它**漏进了子树** ✗——匿名 IIFE 只有一个子单元 ✓，于是 `kids.length === 1` 那条一路漏到体里 ✓，把体里那条**声明**投成了表达式 ✗。带名字的函数有两个子单元，所以这条一直没露 ✓ | `print-ast-common.xl.md`：**用完就还回去** ✓ |
| `console.log(f()())` 只投出**一个** `f()` | `Method` 那两条判据只认「前一单元是标识符」与「前一单元是括号」✓，而 `f()` 收成一个 `Method` 之后**两者都不是** ✗ | `tokens/method.xl.md`：`Previous` / `Process` / `PrintAst` **各补一支** ✓ |

**两条都有同一个教训** ✓：**它们一直没露，是因为判据的语料恰好绕开了那个形状** ✗——
① 的语料里「声明套声明」都是**带名字**的 ✓；② 的语料里 `f()()` 只出现在**语句位** ✓
（而语句位走另一条重组规则、一直是对的 ✓）。所以这一轮**把它们收进了语料** ✓：
`tests/parse/cases/statements/stmt-fn-decl-in-function-expression.ts` 与
已经在那儿的 `expressions/expr-call-of-call.ts` ✓——`cases:tsast` 语料 1429 份、
**四个方向与三个「地基」栏全 0** ✓。

**第二条的修法是三段，一处都不能少** ✓（少一段的表现都不同 ✗）：
`Previous` 补「前一单元是 `Method`」✓（不然第二个 `(` 谁也不认 ✓）、
`Process` 把它当**子单元**收进去 ✓（不然那一格是空的 ✓）、
`PrintAst` 补一支「名字为空、第一个子单元是 `Method`」✓——
**而且外层那对括号不在树里** ✓（与 IIFE 一字不差 ✓），所以终点要**从被调用者之后重新配对** ✓
（不补这一段，外层调用的区间只到 `f()` 为止 ✓）。

**第三条在降级层** ✓：**解构形参**（`function f({a})` / `function f([a, b])`）✓——
`FunctionParams` 给解构形参一个**合成的槽名** ✓（它占一格 ✓，而那个名字里带 `<`，
**不可能是源码里的标识符** ✓——撞上的症状是「两个形参共用一个槽」✗），
真正拆开的是 `LowerFunctionBody` 里那一趟 `Destructure` ✓。

**参数那一段必须按「从左到右」走一趟** ✗（这一轮顺手改的）：默认值与解构都是
**被调方的开场代码** ✓，而 JS 的规矩是**按参数顺序**求值 ✓——
`function f({a}, b = a * 2)` 里 `b` 看得见 `a` ✓。分成两趟（先所有默认值、再所有解构）
会让 `b` **读到还没拆的那个槽** ✗。**同一趟里默认值在解构之前** ✓（`{a} = {}` 是先补再拆 ✓）。

**解构形参里的名字要进「这一层声明了什么」** ✗：`CollectDeclaredNames` 扫的是**函数体** ✓，
而模式里的名字**只出现在形参表上** ✓——漏了它们，「本层变量」会被当成「未知名字」✗，
而且**被内层函数引用时不算捕获** ✗（那是**静默错值** ✗）。走 `ExtraDeclared` 这条既有通道 ✓。

语料 [tests/runtime/cases/26-function-shapes.ts](../tests/runtime/cases/26-function-shapes.ts)
**6 行 stdout 与 `node` 逐字节相同** ✓。

## 第 133 轮的账（展开与剩余：函数那一半）

上一轮做掉了字面量那一半 ✓，这一轮做**函数那一半** ✓——而它**要动引擎** ✓
（这正是上一轮写在「下一步」里的那两条 ✓）。

**两处改动，各解决一半** ✓：

| 改哪 | 解决什么 |
| --- | --- |
| **`Op.CallArray`**（第 22 个算子，追加在 `caught` 之后 ✓） | `f(...xs)`：`Op.Call` 收的是「一段连续槽 + 一个**定长**个数」✗，而展开的个数只有运行期才知道 ✗。这一条把**实参数组**整个交给调用机制，由它按数组长度铺进新帧 ✓ |
| **`FunctionInfo.HasRest`**（借 flags 字节的第 3 位 ✓） | `function f(a, ...rest)`：多出来的实参在**被调方自己的帧里没有格子** ✗（`SlotCount` 定长 ✓、调用方传几个编译期不知道 ✓），所以由**开帧的人**顺手收成一个数组放进最后一格 ✓——**一条新算子都不用加** ✓ |

语料 [tests/runtime/cases/25-rest-and-spread-calls.ts](../tests/runtime/cases/25-rest-and-spread-calls.ts)
**11 行 stdout 与 `node` 逐字节相同** ✓。

**一处结构性教训（这一轮实测踩到的）** ✗：`HasRest` 加好之后，`...rest` **仍然拿到
`undefined`** ✓——因为 `link.xl.md` **另建**了一份函数表 ✓，而它只抄了
`IsGenerator` / `IsAsync` ✓。**它不是「忘了一行」那么简单** ✗：`FunctionInfo` 现在有 7 个字段，
而「重建函数表」的地方有 **2** 处（`Decode` 与 `link`）——**加字段时只有一处会被提醒** ✗
（`Decode` 编译得过是因为它按位读 ✓，`link` 那一处**谁都不提醒** ✗）。
**那条注释就写在 `link.xl.md` 漏掉的那一行旁边** ✓，判据量的是**结果**
（链接之后再跑，`...rest` 必须是数组 ✓）。

**同一轮修掉的一处真 bug**（旧判据当场点出来的 ✓）：`FillParameters` 第一版把
「拷几个形参」夹到了 `SlotCount` ✗——于是 `function f(a = 1, b = a + 10)` 的 `f(2)`
会把**调用方第 1 格之后的垃圾**抄进 `b` ✗（`b` 不再是 `undefined` ✓，默认值判定成「传了」✗，
`f(2)` 给 **200** 而不是 **212** ✓）。**夹的应该是 `count`（实际传了几个）** ✓，
不是 `SlotCount`（帧有多长）✓——两条限制都在，漏一条就错 ✓。

**四处仍然不做、且各自**降级期**响亮地抛** ✓（脚本里的 `try` 一个字都拦不住它们 ✓）：

| 形态 | 为什么 |
| --- | --- |
| `new C(...xs)` | `CallArray` 没有「构造目标」那个操作数 ✗（`Op.New` 要先造对象、接原型、再拿它当 `this` ✓） |
| `super(...xs)` | 同上（要「拿当前实例当父类构造的 `this`」✓） |
| `super.m(...xs)` | 这一支本来就用不了 `call_method` ✓（「在谁身上找」与「谁是 `this`」要分开 ✓），展开要另配一条形状 ✓ |
| `能力名(...xs)`（没声明过、直接登记为能力的名字） | 它的窗口 `[号, 参数…]` 是定长的 ✓ |

**顺带量出来的一条老缺口**（与这一轮无关，但**普通代码里遍地都是** ✗）：
**函数声明写在函数表达式 / 箭头函数的体里** ✓——
`(() => { function f() { return 1; } return f(); })()` 报
`unimplemented: statement FunctionExpression` ✓。它在**投影层**就歪了 ✓
（一条声明被投成了表达式 ✓），**不是这一轮改出来的** ✗
（这一轮的语料因此把辅助函数一律写成顶层函数声明 ✓）。它是**下一步的头一条** ✓。

## 第 132 轮的账（展开与剩余：字面量那一半）

上一轮量出来「十五条日常写法**全部**抛」✗。这一轮先啃**不需要动引擎**的那一半 ✓：

| 通了 | 怎么落 |
| --- | --- |
| `[...xs]` · `[...a, ...b]` | 数组字面量里的 `SpreadElement` → 一条 **`spread_into` 语言内建调用**（号段 700..799，新号 `SpreadIntoId = 703`）✓ |
| `[...'ab']` · `[...set]` · `[...map]` | 同一个 `spread_into`：字符串逐**码元** ✓、`Map` / `Set` 先过 `GetIterator` ✓（与 `for..of` 同一条路 ✓） |
| `{...o}` | 对象字面量里的 `SpreadAssignment` → 一条 **`Object.assign` 调用**（复用既有号 `ObjectAssign` ✓）✓ |
| `const [x = 9] = []` · `const {a = 7} = {}` | 「读出来那一格**严格等于 `undefined`** 才用默认值」✓——**不能用 `is_nullish`** ✗（`{a: null}` 里 `a` 是 `null` ✓） |
| `const [a, ...r] = xs` | 一条 **`array_rest` 语言内建调用**（新号 `ArrayRestId = 704`）✓——**不走 `Array.prototype.slice`** ✗（解构是**语法**，不该依赖某个方法装没装 ✓） |

语料 [tests/runtime/cases/24-spread-and-defaults.ts](../tests/runtime/cases/24-spread-and-defaults.ts)
**17 行 stdout 与 `node` 逐字节相同** ✓。

**这一轮抓到的一处真 bug（潜伏了很久）** ✓：`LowerNew` 收尾写的是 `Release(ctor)` ✗，
而 `Op.New` 的结果写在 `base` 上、`base` 在 `ctor` **上面** ✓——水位一退，
**下一个分配就盖掉刚造出来的那个对象** ✗。它一直潜伏，是因为紧接着那次分配
（`const s = new Set(...)` 里的变量格 ✓）恰好落在**同一格**上 ✓，`Move` 到自己是空操作，
值反而活了下来 ✓。一旦中间多一次分配就露出来 ✓——判据现场：
`[...new Set([1, 2])]` 接出来是**空的** ✗，而 `[...s]`（先存变量）是对的 ✓。
`LowerCall` 那一条一直是 `Release(base + 1)` ✓，现在两边对齐 ✓。

**两处「看起来一样、其实不一样」的复制**（判据现场量出来的 ✓，各自写在注里、谁也不抄谁 ✓）：

| 谁 | 洞怎么处理 | 为什么 |
| --- | --- | --- |
| `Array.prototype.slice`（以及 `concat`） | **洞跟着走** ✓ | 逐下标复制 |
| `Array.from`、`[...xs]`、`const [a, ...r] = xs` | **洞填成 `undefined`** ✓ | 走**迭代器** ✓ |

**这一条第一版就写错了** ✗：`array_rest` 照 `slice` 的口径写了「洞跟着走」，
判据当场给 `0 in r` = **假** ✗（JS 给**真** ✓）。

**三处仍然不做、且各自响亮地抛** ✓（前两条是**降级期**的错 ✓，脚本里的 `try` 一个字都拦不住 ✓）：

| 形态 | 为什么 |
| --- | --- |
| `[...xs, , 3]`（**展开之后**的洞） | 要让洞也带上**动态下标** ✓，引擎得给一条 `set_hole` 算子 ✗；静默填成 `undefined` 会让 `1 in a` 从假变真 ✗ |
| `const {a, ...r} = o`（对象剩余） | 要一份**排除名单** ✓（已经拆走的那几个键），引擎侧没有这条路 ✗ |
| `for (const [k, v] of …)`（for..of 头部里的解构） | 「声明一次、每轮只写」那套要跟绑定模式接起来 ✓——**另一条**待办 ✓ |

**顺带把一处名单写清楚了**：`InstallBuiltins` 里那张「登记哪些辅助号」的名单
原来是四个 ✓，这一轮要加三个（两个新号 + `ObjectAssign`）✓——
**不加的症状是 `capability is not registered: 703`** ✗（那句话一个「名单」字都没提 ✗），
所以注释就写在名单**正上方** ✓。

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
