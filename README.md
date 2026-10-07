# xl-example

用 xl 写成的一套语言前端：**`*.xl.md` 是唯一的事实来源**，同一份规范可以生成多种目标语言。

它解析 TypeScript 风格的源码——把字符流啃成一棵 token 树，再把树打印成 XML。
产物里带一个命令行入口 `cjcli`，可以直接拿一个源文件跑出这棵树。

## 目录结构

规范按「**与语言无关**」和「**某种语言的 token 层**」分成两棵并列的树——多语言的落点就在这里：
新增一门语言就是新增一个与 `typescript/` 平级的目录，`core/` 一行都不用动。

```
core/                    与语言无关的语法层骨架（多语言共用）
  common-util.xl.md        全局工具：XmlDecode / FormatXml
  exceptions/              SyntaxException / SourceException / RuntimeException
  extensions/              列表辅助函数（SkipNext / ReplaceAt …）
  syntax/                  Token / Branch / Reorganization / Source / Document …
    templates/              跳转与重组模板（Template / Sequence / SymbolTemplate …）
  syntax/messages/         插队消息

typescript/              TypeScript 的 token 层（本语言专有）
  text-document.xl.md      值来自字符串的 Document 实现
  text-context.xl.md       解析入口：装配流水线并驱动根单元
  parse-pipeline.xl.md     ★ 跳转优先级与重组优先级（顺序即语义）
  text-common-util.xl.md   跳过软换行的取值器
  list-extensions.xl.md    跳过透明单元的相邻查找
  tokens/                  逐构造的 token：
    identifier.xl.md         <Identifier>  标识符 / 数字 / 布尔字面量的文本块
    symbol-token.xl.md       <SymbolToken> 符号块
    line-wrap.xl.md          <LineWrap>    软换行（不是符号）
    bracket.xl.md            <Bracket>     三种括号共用一个类
    keyword.xl.md            <Keyword>     关键字兜底身份
    class/ function/ if/ for/ foreach/ while/ …   各构造族各占一个目录
    json/                    <ObjectLiteral> / <ArrayLiteral>（值位的两种字面量）
    string/                  <String> / <ConstString> 与四个转义向导

runtime/                 ★ 与语言无关的执行层（多语言共用）——值模型 / 对象表与 GC / 帧 / IR / 内建库 / 宿主 ABI
typescript-exec/         ★ TypeScript 的降级层（本语言专有）——AST → runtime 的 IR

cjcli.xl.md              命令行入口（不属于语法层本体）
```

执行侧的两棵树（`runtime/` ↔ `typescript-exec/`）是上面这两棵的镜像：`runtime/` 与语言无关，
`typescript-exec/` 是 TS 专有的降级层——**新增一门语言就是新增 `xxx/` + `xxx-exec/`，
`core/` 与 `runtime/` 一行都不用动**。
**这两棵树已经在跑**：引擎（值 / 堆 / GC / 帧 / IR / 装载验证 / 执行器 / 宿主 ABI）落地，
降级层收下了 P0 的形状 + 类 / 继承 / 集合 / 生成器 / 默认参数、一批标准库
与**数字字面量的全形态**（第 129 轮，线形态随之升到 v2 并开始承载 `Float64` 常量）
+ **标准库第三批**（第 130 轮：`findIndex` · `Array.from` · `Object.assign` · `String.fromCharCode`
· `String.replace` · `new Map(键值对)` · `new Set(数组)`）
+ **`console.log` 的形状**（第 131 轮：容器走 `util.inspect` 那一份——
`console.log([1, 2])` 印 `[ 1, 2 ]`，与 Node 逐字节相同）
+ **展开与剩余的字面量那一半**（第 132 轮：`[...xs]` · `{...o}` ·
绑定模式的默认值与数组剩余 `const [a, ...r] = xs`）
+ **展开与剩余的函数那一半**（第 133 轮：`function f(a, ...rest)` · `f(...xs)`——
引擎加了第 22 个算子 `call_array`，函数表加了「最后一个形参是剩余参数」那一位）
+ **函数的两条形状**（第 134 轮：函数声明写在函数表达式体里 · `f()()` 连着两次调用 ·
解构形参 `function f({a})`——前两条在 **token / 投影层**，
第 134 轮也把它们收进了 `cases:tsast` 的语料）
+ **`for..of` 头部里的解构 · `var` 提升 · 对象剩余**（第 135 轮——
其中 `var` 提升**一直是死代码**：判据比的是 `"Var"`，而投影给的是 `"None"`）
+ **字符串可迭代 · 字符串下标 · 空值上的属性读**（第 136 轮：
`for (const c of "ab")` 一次一个码元 · `"xy"[0]` 是 `"x"` · `null.y` 抛且 `try` 接得住）
+ **`instanceof` 认内建构造函数 · 错误家族**（第 137 轮：
`[] instanceof Array` · `e instanceof Error` / `TypeError` / `RangeError` ·
`Array.prototype.constructor` 那三条链——原来**整族 `instanceof` 都是红的**）
+ **`Map` / `Set` / `Date` 的原型格**（第 138 轮：`new Map() instanceof Map` ·
`new Date() instanceof Date` · `new Map().constructor === Map`）
+ **引擎抛的也是 `TypeError`**（第 139 轮：`Guard` 与 `ErrorFactory` 各加一格**失败类别**——
引擎报「哪一类失败」、语言层翻成名字，于是 `try { null.y } catch (e) { e instanceof TypeError }` 与 Node 一致）
+ **`super(m)` 落在内建构造函数上**（第 140 轮：`class MyErr extends Error { constructor(m) { super(m) } }`——
内建错误构造函数往**传进来的 `this`** 上初始化并返回它，于是自定义错误类通了）
+ **派生类的默认构造函数 · `super(...xs)`**（第 141 轮：`class E extends Error {}` 合成 JS 那个
`constructor(...args) { super(...args) }`，「父类有没有构造函数」还要**递归**问）
+ **回调要两个实参的那一族**（第 142 轮：`NativeCall` 的实参表从「一个值」开宽成**一整个数组**，
于是 `sort((a, b) => …)` · `reduce((acc, x) => …)` · `map((v, i) => …)` · `Map.forEach((v, k) => …)`
一起通了；顺带铺上 `shift` / `fill` / `flat`）、
+ **实参位的可选链**（第 143 轮：`f(o?.a)` / `console.log(o?.a)` / `[o?.a]` / `` `${o?.a}` ``——
产物把「基名」与「`?.`」记成**两个平级单元**，投影层的通用支**只取第一格**，
于是 `?.a` 整格丢掉、降级层报 `unimplemented: expression NullConditionalOperator`。
修在**渲染侧**：`projectExpression` 多一条「基名与 `?.` 平级」的判据，
把基名接回 `chainWithOptional`——**token 层那一版试过、被语料打回来了**
（11 个文件变红，理由记在 [typescript-exec 的账](typescript-exec/README.md)里）），
+ **真假只有一个定义**（第 144 轮：`if ("")` 走了**真**那一支——`Value.AsBool` 看不到码元长度，
于是**五个调用点**（`jmp_if_false` / `!` / `Boolean(x)` / `filter` / 谓词族）在**空串**上一起歪，
而且**不报错**（静默错值）。修法：`rt.xl.md` 新增 `TruthyOf(table, value)`，
改一处、五条构造一起对；`AsBool` 留作「不带堆的那一半」）、
+ **既是对象又可调用**（第 145 轮：`String(1)` / `Number("7")` / `Boolean(0)` 原来一律报
`calling a non-closure value`——`String`/`Date`/`Array` 是**对象**（挂得住静态方法与 `prototype`），
却**不能被调**；而 `Boolean` 连全局名都不是。两条候选修法里选了「**对象带一格可调用载荷**」
（`heap.xl.md` 的 `AttachCallable`：`Charge`/`Clear` 早就按 `Host !== null` 判过，一处结构都不用加），
判定收成一句 `IsHostCallable`（调用 / 构造 / 重入三条路共用）。于是 `new Date(ms)` 那条
「只有直接写 `Date` 才认」的降级层特例**撤掉了**（`const D = Date; new D(0)` 也对），
`typeof String === "function"`、`new Array(3)` 的洞、`[1,2,3].map(String)` 一起通了）、
+ **解构赋值**（第 146 轮：`[a, b] = [b, a]` 原来报 `assignment to a non-identifier`——
左边的 `[a, b]` 在 TS 的 AST 里是 `ArrayLiteralExpression`，而 `=` 只认名字 / `o.x` / `o[k]`
三种左值。补的是**另一半**：读法与声明那一半**一个字都不差**（对象按属性名 / 数组按下标 /
`...剩余` 走同一个内建 / 默认值只在严格 `undefined` 时求），为此把 `DestructureDefault`、
`PropertyKeyNodeOf` 两段共用规矩提了出来；写法人各一半，因为两半的**水位纪律相反**
（声明那半会留变量格所以一律不退，赋值这半一个变量都不声明）。顺带收下计算键
`({[k]: v} = o)`——走 `get_index` 而不是 `get_prop`，因为 `({[1]: n} = …)` 的键是一个数）、
+ **位运算七条**（第 147 轮：`flags |= 4` 原来在降级期就报 `unimplemented: binary operator |=`。
算子表里 `BitAnd` / `BitOr` / `BitXor` / `Shl` / `Shr` 是设计期就留好的号（**声明了、没实现**），
`BitNot` / `UShr` 这一轮**追加在表尾**（只追加、不改号）。语义落在两个共用判据上：
`ToInt32Of`（`NaN`/`±Infinity` → 0、小数**向零截断**、按 2³² 取模再折回有符号）与
`ShiftCountOf`（低 5 位）；整段用算术写、不写 `n | 0`（那一步四个目标写法不同）。
判据抓到两处「静默给一个看起来成立的整数」：截断与取模的**顺序**（`-1.9 | 0` 给过 `-2`）、
`>>>` 的高位该补 0 而不是 1（`-1 >>> 28` 给过 `4294967295`）。顺带修了两处 token 层缺口：
`(n) => (n | 0)` 的**体**被判成类型位（`IsTypeBracketPosition` 的 `=>` 那一格，改为问
`LamdaReorganization.IsLambdaParameters`）、以及 `Method` 投影的可选链那一支把 `f(o?.a)` 的
**实参链**当成整条调用返回（第 143 轮那条 `0a0` 支被它抢在前面了））、
+ **类型位的声明一个运行期指令都不产生**（第 148 轮：`type X = …` / `interface I { … }` 原来让
**整份文件降级不出来**——不是在运行期失败。口径是现成的「**类型位一律擦除**」：它们只描述形状、
不产生任何运行期东西，所以整条跳过。同一条判据顺手关掉两处**同形状**的：`declare` 那一族
（`function` / `const` / `class` / `module "x" {}` / `global {}` / `namespace D {}`）、以及
**没有体的函数与方法声明**（重载签名、`abstract m(): void;`）。判据收在「有没有体」与
「有没有 `declare`」两句上，`Hoist` 与 `LowerStatement`、类成员那一圈**都要**——插桩把两处都点出来过。
顺带把 `CollectDeclaredNames` 里环境声明的名字排掉：报的话从「用在声明之前」改成
「name is not a local or a capture」——**环境值根本没有**，不是顺序问题）、
+ **数值常量与幂**（第 149 轮：选题口径换成「**Node 跑得动、而我们跑不了**」——`enum` 与运行期
`namespace` 被 Node 自己拒跑（type stripping 不做变换），所以在「与 Node 逐字节相同」这条判据下
没有意义，因此降级。这一轮做掉四个口子：`NaN`/`Infinity`（原来让整份文件在降级期失败）、
`**`/`**=`（走**语言建内建**而不进通用算子表——幂的舍入没有标准定死，各目标的 `pow` 可能差最后一位，
而 host-text 那条规矩是「借的必须是结果被标准定死的东西」；`RtOp.Pow` 那一格留着不删）、
`typeof` 未声明的名字（JS 里唯一不抛的未声明读法，给**字符串** `"undefined"`；只在这一格），
以及被它带出来的两处**静默**不一致：`globalThis`（指向那个环境对象自己）与
`isNaN`/`isFinite` vs `Number.isNaN`/`Number.isFinite`（**转与不转**是两对））、
+ **逻辑赋值与原始值方法**（第 150 轮：先做了一次**普查**——32 条普通写法分别交给 `node` 与
`tsrun`，只留「node 跑得动、我们跑不了」的当选题目录，开工 14/32、收工 22/32。收掉的是
最大那一簇**「方法不在那儿」**：引擎侧 `Protos` 添了 `Number`/`Boolean` 两格，
`GetProperty` 对原始值接收者从「只认字符串」变成「三格同一条路」，于是
`(1.5).toFixed(2)`、`(255).toString(16)`、`true.toString()` 通了；外加 `at` / `splice` /
`replaceAll`（与 `replace` 共用一段实现）与三条逻辑赋值 `||=`/`&&=`/`??=`（糖：合成
`a || (a = b)` 交给短路那三条本来就有的路）。顺手修掉一处**静默**不一致：`typeof` 一个内建方法
原来给 `"object"`（本仓「可调用」有三种表示，两个 `typeof` 出口都只认前两种）。
判据当场抓到两处：`replaceAll("")` **不是**「只插一次」，以及新号 `ArrayAt=22` **撞上了**
本来就有的 `ArrayFlat=22`（`flat()` 于是静默给 `undefined`——是普查抓回来的））、
+ **数组解构接上迭代协议**（第 151 轮：`const [a, b] = new Set([1, 2])` 原来按位置读，
**静默**给 `undefined undefined`（JS 给 `1 2`）。修法只是接上**早就有的那条口径**——
`for..of` 与 `[...xs]` 的第一步都是 `GetIterator`（它把 `Map`/`Set` 物化成数组、对数组原样返回），
于是两半各加一行 `MaterializeIterable`；普通数组解构的指令一条都没变。
第 146 轮那条判据当时写着「改成迭代协议的那一天这一条会当场变红」——这一轮它真的红了，
于是改成正面断言。生成器那一档**够不着**（`iter_next` 是指令，建库层调不到），
连同「可选调用那两处」一起把**实测读数**记进台账，留给下一轮）、
+ **`?.` 有两种**（第 152 轮：`o?.n?.()` 的空值在**接收者**上、`o.n?.()` 的空值在**取出来的方法**上，
两者该守的不是同一样东西。原来只有「守接收者」一条（判据 `ChainHasOptional` 分不出这两层），
于是 `o.n?.()` 在 `n` 是 `null` 时**照样去调**、报 `calling a non-closure value`。
修法是换一条本来就在的形状：先把方法当值取出来、守一道、再用 `Op.Call` 带着 `this` 调；
判据用 `OptionalChild(call, "questionDotToken")` 而**不是** `optional`——因为 `o?.n()`
在 JS 里是 TypeError，拿 `optional` 顶替就会把它**静默**变成 `undefined`。
另一半 `o.m?.().k` 量准了但**没动**：根因在**投影**（XML 实测 `.k` 被折进 `NullConditionalOperator`
里面），带括号时反而对——连同 `o.m?.(1, 2)`、`o.m?.().k + 1` 一起记进台账）、
**`.ts` 已经能直接执行**（`node build/ts/tsrun.js <文件.ts>`，stdout 与 `node <文件.ts>` 逐字节相同）——
判据见 `npm run runtime:check`（241 条）与 `npm run runtime:cli`（79 份语料）；
**场景覆盖度**是 `npm run coverage`（第 586 轮读数：**1666 / 1713，progressPercent 96.9**，
其中**引擎 97.6%** ✓、**降级层 96.8%** ✓、标准库 **97.8%** ✓、**端到端 95.2%** ✓；
matrix 是**活的分母** ✓——第 370 轮它只有 1343 条、四层满格 ✓，第 371 轮起按用户口径
「先加宽语料、再收账」铺到 1713 条 ✓，读数掉下来是**分母变诚实** ✓、不是倒退 ✓），
**六道门一次成批跑**是 `npm run gates` ✓，第 326–340 轮实测**墙钟 28.7s → 39.3s 之间** ✓
（第 323 轮是 29.3s ✓、第 320 轮是 62s ✓），**整矩阵 8.2s** ✓、**普查（`sweep`）39 条 2.3s** ✓——
第 318 轮之前整矩阵是 **600s** ✓、第 324 轮之前 `sweep` 是 **~40s** ✓。
**第 340 轮**收掉 **1 格** ✓（分子 1318 → 1319 ✓、矩阵 1340 → 1341 ✓）：
**`for..in` 沿原型链** ✓（`Object.forInKeys` 那一格 ✓——`Object.keys` 的口径是**自有** ✓，
借错了 ✓）＋ 同一条根上的**两块枚举性** ✓（数组原型的方法 ✓、**类的方法与 `constructor`** ✓、
**类里的访问器** ✓——后者给 `EmitDefineAccessor` 加了第六格 `enumerable` ✓）；
顺带 `set_hidden` 收**符号键** ✓（类成员的计算键 ✓）。
**另外**：**`runtime:cli` 的裁判侧也成批** ✓（用户口径「所有 gate 默认 batch」✓）——
换成 `judge-batch.mjs` ✓、异步那 6 份仍一条一进程 ✓、`--no-batch` 仍是权威口径 ✓，
**11.6s → 5.1s** ✓（门里 12.1s → 6.2s ✓）。
**第 339 轮**收掉 **3 格** ✓（分子 1314 → 1317 ✓、矩阵 1339 → 1340 ✓）：
**数组 `join` 的每一格走它自己的 `toString`** ✓（新增 `JsElementUnits` ✓——
先 `ToPrimitive(v, "string")` 再当文本 ✓，`ToPrimitive` 自己会走到自定义 `toString` ✓ /
数组的 `toString` ✓ / `Object.prototype.toString` ✓ 三档 ✓）、
**`structuredClone`** ✓（深拷贝 ✓：环要认 ✓、`Map` / `Set` / `Date` **顺手带上** ✓、
洞要保住 ✓、函数与符号**响亮地抛** ✓）；
**顺带量到一处结构差** ✗：本仓的 `Map` / `Set` / `Date` 把方法挂在**每个实例自己**身上 ✓
（Node 挂在原型上 ✓）——那一处记在注释里 ✓。
**第 337 轮**收掉 **3 格** ✓（分子 1287 → 1290 ✓、矩阵 1317 → 1318 ✓）：
**`return` 出 `for..of` 也要 IteratorClose** ✓（上一轮刚量到的那一处 ✓——`LoopContext` 多一格
`IteratorSlot` ✓，`ReturnStatement` 那一支先收迭代器、再跑 `finally` ✓）；
**非严格 `this`** ✓（普通函数调用与摘下来的方法收**全局对象** ✓——`Protos.Global` ✓，
与那张知名符号表**同一条机制** ✓：结构由引擎提供、内容由语言层给 ✓；
`DoCallValue` 与 `CallNative` 两处各兜一次 ✓，**`null` 与 `undefined` 是同一档** ✓
——第一版只写了 `undefined`，新加的语料当场红 ✓）。
**第 336 轮**收掉 **3 格** ✓（分子 1282 → 1286 ✓、矩阵 1315 → 1317 ✓）：
**生成器的 `return()` 与 `for..of` 的收尾** ✓——`generator.return(v)` 跑 `finally` 链 ✓
（引擎只把「叫停」+「值」带到挂起点 ✓、**新增一条 `check_generator_return`** ✓、
降级层在每个 `yield` 后面问一句 ✓——**`finally` 那几段逻辑一个字都没新写** ✓），
`for..of` 提前退出调 `iterator.return()` ✓（**迭代到头不调、`break` 要调** ✓，两条出口原来在同一个 pc 上 ✓）；
**顺带**：引擎自测里两条硬编码跟着挪 ✓（指令条数 24 → 25 ✓、「未知指令码」那条改成「表尾 + 1」✓），
**并且加宽语料时又量到一处缺口** ✗（`return` 从 `for..of` 里出去也要 IteratorClose ✓，
这一轮只接了 `break` ✓——已登记 ✓、修法也写着 ✓）。
**第 335 轮**收掉 **3 格** ✓（分子 1277 → 1282 ✓、矩阵 1313 → 1315 ✓）：
**类数组那一簇** ✓——`class X extends Array` 的实例真的是数组 ✓
（**顺带修掉一处真 bug** ✗：`DoReturn` 用 `Value.FromObject(constructTarget)` 重建实例 ✓，
**把 `Tag` 丢掉了** ✓——同一个值进去是数组、出来是对象 ✓）、
`[].slice.call(类数组)` 走**通用那一档** ✓（新增 `ArrayLikeLength` / `ArrayLikeAt` ✓，
只接 `slice` ✓，其余写在明处 ✗）；
另外**补上了「号撞车」那道自动检查** ✓（两轮之内被咬两次 ✗：
第 332 轮 `queueMicrotask` 撞 `SymbolCtor` ✓、第 334 轮 `FunctionToString` 撞 `BoundCall` ✓）——
判据是「同一个文件里不许重复」✓，三处已知的「同文件、不同段」写进名单 ✓，
**并且实测证明它会响** ✓（临时造一处撞号 → 门红、报出两个名字 → 撤回逐字节相同 ✓），
`runtime:check` 因此从 241 条变成 **242 条** ✓。
**第 334 轮**收掉 **2 格 + 三处顺带** ✓（分子 1273 → 1277 ✓、矩阵 1311 → 1313 ✓）：
**`Function.prototype.toString` / `String(fn)`** ✓（闭包上多一格 `Source` ✓——
降级层按节点区间从源码里切 ✓，一处实现、三处用户 ✓），
外加**三处实测撞到的** ✗：号撞车（`FunctionToString` 第一版取 `344` ✓，
而那是 `BoundCall` ✓ ⇒ `bound(2)` 报「绑定对象坏了」✓）、
`props.xl.md` 那条「函数那一类先从 `protos.Function` 找」的补丁**遮住了
`Object.prototype.toString`** ✓（六条判据一起红 ✓）、
`X.prototype.constructor` 该是**不可枚举**的 ✓（15 处一起改 ✓）。
**第 333 轮**收掉 **14 格** ✓（分子 1259 → 1273 ✓、矩阵 1309 → 1311 ✓）：
**非空断言那条链** ✓（`!` 右边那一格判「**以一次下标开头**」✓，`NotNull` 那一档先下标再断言 ✓
——那一处「先/后」只有 `cases:tsast` 看得见 ✓）、
**写屏障分两档** ✓（赋值静默 ✓ / 内建方法抛 ✓；「不可扩展」从语言层的隐藏属性搬上堆 ✓，
顺着删掉 `SealedMarkName` 那一整套绕路 ✓）、
**模板串那一路** ✓（`String.raw` + 标签模板的 `raw` ✓，并**顺手修掉一处矩阵没量到的静默错值** ✗：
带内插的模板串每一段没「熟」✓ —— `` `a\nb${1}`.length `` 给 `5` ✓、Node 给 `4` ✓）。
**第 332 轮**收掉 **12 格** ✓（分子 1243 → 1259 ✓、矩阵 1305 → 1309 ✓）：**具名函数 / 类表达式的名字**
✓（**给这个闭包单开一层环境** ✓：`env_new` → `new_closure` 捕获它 → `env_set` → `env_leave` ✓，
于是体内读那个名字走的是**普通的捕获那条路** ✓，槽与作用域那几套一个字都没改 ✓）、
**`arguments`** ✓（隐含绑定 ⇒ 一格 + 一个来源 + 一张名单 ✓：值是**开帧的人**收的 ✓，
与剩余参数同一个位置、同一条理由 ✓）、**`normalize`** ✓（借宿主的 Unicode 表 ✓，
与浮点那两处同一条规矩 ✓）、**`queueMicrotask`** ✓（源那一格给 `undefined` ⇒
引擎直接排队、不接任何值 ⇒ 回调收到零个实参 ✓）。
**这一轮最贵的一课** ✗：**号撞车是静默的** ✓——`queueMicrotask` 的号第一版取 `250`，
而 `250` 是 `SymbolCtor` ⇒ 那五个号被承诺段截走 ⇒ **21 条判据当场红** ✓，
而报的话**一句都没提号** ✗（`typeof` 给 `undefined` / `Symbol.keyFor needs a symbol` /
`invalid handle: 0` 三种 ✓）。
**第 331 轮**加宽 39 条 ✓ + 收掉 4 格 ✓ + 修**三处引擎级静默错值** ✓（一个根三条 ✓）：
`new Promise(() => { throw … })` 在 **async 函数里、且它前面有过一次 `await`** 时
**整段停住** ✓（**同一句话去掉 `await` 就对** ✓，退出码还是 0 ✗）——根子三处**缺一不可** ✓：
`RejectPromise` 那句「帧那一档不动」只管住了「已经结清的那一瞬」✗、
`DoThrow` 的展开把「不在栈上」当成「死了」✗（`await` 摘下去的帧一会儿还要回来 ✓）、
还有两处「状态放回哪一档」写成了 `Finished` ✗（**微任务那一趟**里它已经是真 ✓、
可那一趟**仍有帧要跑** ✓ ⇒ `Halted` ⇒ 分派循环停 ✓ ⇒ 那一帧**停在半句话上** ✓）。
顺带：**`map.keys().next()`** ✓（那一族的六个方法一个都没接线 ✓——抽成
`AttachArrayIterator` ✓，**一处实现、四个用户** ✓）、**`Promise.try`** ✓（ES2025 ✓，
号段上界**第三次**跟着挪 ✓）、**`try` 当属性名** ✓（`{ try: 1 }` / `o.try` /
`typeof Promise.try` 原来**整份文件进不来** ✓——`TryReorganization` 没有位置闸 ✓，
闸就架在「这条规则自己要求紧跟一个 `{` 块」上 ✓）。
**第 330 轮**先铺语料再收账 ✓（**加宽 64 条** ✓ + **收掉 2 格** ✓ + **修一条引擎级静默错值** ✓）：
`async function f() { await null; throw new Error("x") }` 之后
`try { await f() } catch { … }` 里 **`catch` 一行都不跑** ✓、**退出码还是 0** ✗。
**第 328 轮**收掉 **`typeof class { }`** ✓（1 条 ✓）：**名单里少了那个 kind** ✗——
第 233 轮修的是 `typeof {}` ✓，这一条是**同一个根** ✓（`IsOperand` 少一个 kind ✓），
`typeof` 折不起来 ⇒ 投影只吐一个孤零零的 `TypeOfKeyword` ✓；
**一处改动、两个文件** ✓（两份 `IsOperand` **必须对齐** ✗——`x + class { }` 是合法 JS ✓）。
**第 327 轮**收掉 **B 簇**里那两格 ✓（4 条 ✓）：`Promise.withResolvers` ✓（三样东西装到一起 ✓，
**号段的上界跟着挪一格** ✗——上界与「这一段有多少个号」是同一件事 ✓）与
`Map.groupBy` ✓（**卡点不在分组，而在 `Map` 的壳** ✗：它是宿主引用值、没有属性表 ✓ ⇒
修法与第 183 轮 `Symbol` 一字不差 ✓；**改壳的两处风险都验过** ✓——`new Map()` 照旧 ✓，
而 `instanceof Map` **真的红过一次** ✗（那个分支走「读右边的 `prototype` 属性」✓），
修法与 `Date` 那一行同形 ✓）。
**第 326 轮**收掉 **C 簇**（写那一半没有对应的入口）✓（3 条 ✓）：`super.x = v` 报
`assigning a property on a primitive receiver` ✗（其实是**接收者根本没算出来** ✓）——
第 243 轮给读那一半补了 `get_prop_from` ✓，写那一半一直缺 ✗。四处改动 ✓：
引擎 `SetPropertyFrom`（从 `start` 起找、接收者另给 ✓，与读那一半**对称** ✓）·
顺手把 `SetProperty` 拆成「两个入口 + 一处规矩」✓（`SetPropertySearched` ✓——
所有写属性都走它，**回归风险最大**，所以六道门一起跑 ✓）·
IR 追加 `set_prop_from` ✓（号 41 ✓、**必须在表尾** ✗）·
降级层把 `super` 的**起点抽成一处** ✓（`SuperStartSlot` ✓，读与写**必须同一个起点** ✗）
+ 写那一半单开一条 ✓（值只求一次 ✓、求在写之前 ✓）。
**三种排布一起转绿** ✓（父类是访问器 ✓ / 父类是 setter ✓ / 父类只有数据字段 ✓）。
**第 325 轮**收掉 5 格 ✓：
**① `f?.()`：可选链的第三格** ✓（3 条 ✓）——第 152 轮分过「空值在接收者上」与
「空值在取出来的方法上」✓，这一格是**空在「被调的那个值自己」身上** ✓；
守卫要排在**实参求值之前** ✓（JS 里 `f?.(a())` 在 `f` 空值时连 `a()` 都不求 ✓），
那一小段抽成 `PatchOptionalCall` ✓（与 `LowerAccess` 的可选链同一个形状 ✓）；
**② 函数与命名空间合并** ✓（2 条 ✓）——量出来的根子**不是**「那一格没造」✗，
而是「有就复用」**只看了本层的槽** ✗：`function make(){}` 的名字在捕获分析里被算成
「内层函数里的引用」✓ ⇒ 它住在**环境格**里 ✓ ⇒ `Scope.Resolve` 给 `-1` ✓ ⇒
另造一个对象把**函数盖掉** ✓（**静默错值** ✓）；修法是复用判据加 `CellOf` 一格 ✓
（读的时候按本帧第 0 层 ✓，与 `DeclareLocal` 写它的那一句对称 ✓）。
**第 324 轮**收掉 **B 簇**里**「复用现成答案」**的那两格 ✓：
**① `Object.getOwnPropertyDescriptors`（复数）** ✓（3 条 ✓）——单数那一格第 276 轮就有 ✓，
做法是**递归调同一张分派** ✓（键那一趟走 `getOwnPropertyNames` / `getOwnPropertySymbols` ✓、
每格走**单数**那一条 ✓）⇒ 「描述符长什么样」**只有一处答案** ✓
（数组元素三个标志全真 ✓、字符串下标不可写 ✓、`length` 是第三种 ✓、访问器没有 `value` ✓
——第 276 / 304 轮全是**实测**出来的 ✓，再抄一遍就是第二处会漂的答案 ✗）；
**② `Set` 的集合运算族** ✓（1 条 ✓，ES2025 那六个方法）——号 `620..625` ✓、
与那八个方法**同一个循环挂** ✓、实参物化照 `new Set(生成器)` 的老路 ✓
（少了那一趟就是「把 Set 当数组读」✗，静默给一个空集 ✓）。
**顺带把 `sweep.mjs` 也批起来** ✓（用户口径：「sweep 为什么 40 多秒」✓）：
它是这一族里**唯一没批的那个** ✗（一条两个进程 + **同步**的 `spawnSync` ✓，
与第 318 轮 `run.mjs` 那条是**同一个根子** ✓）⇒ **40s → 3.4s** ✓，
并且与 `--no-batch`（权威口径 ✓）**87 条逐条对拍一致** ✓。
**第 323 轮**先铺语料再加宽之后**收掉 5 格** ✓：
**① 计算类字段名**（4 条 ✓）——**计算方法名**第 229 轮就通了 ✓，而**字段**那一格一直抛
`unimplemented: computed class field name` ✗ ⇒ `class Box { [KEY] = 1 }` 让**整个类**进不来 ✗；
修法两处 ✓（`EmitFieldInit` 认下 `ComputedPropertyName`、键走 `SetPropertyValue` ✓、
**键在前值在后** ✓；`scope.xl.md` 补「**计算名也是内层代码**」✓——
**第二处是第一版跑出来的** ✗：只改前者报 `name is not a local or a capture: KEY` ✓，
因为实例字段那一段跑在**构造函数那一帧**里 ✓）；
**② `yield*` 的返回值**（1 条 ✓）——`const r = yield* inner()` 里 `r` 拿到**上一轮产出的值** ✗
（**静默错值** ✓）：根子是**次序** ✗，「抄下这一轮的值」排在 `done` 判据**之后** ✓，
而**恰好 `done` 那一趟** `pair[0]` 才是内层的返回值 ✓（`yield* [1,2]` 看不出来 ✓）。
**这一轮的 18 条新缺口按根子分四簇** ✓（名字只在该在的那一层里可见 4 条 ✓ ·
标准库成员不在那儿 7 条 ✓ · 写那一半没有入口 2 条 ✓ · 同一个形状只认了一半 2 条 ✓），
逐条写在 `tests/coverage/expectations.mjs` 里 ✓。
**第 320 轮**收了两格 ✓：
**① 异步函数经重入调时没有承诺** ✗——`DoCallValue` 里那条 `IsAsync` 分支只长在**调用路** ✗，
而**重入路**（`CallNative`：`Array.prototype.map` 那种回调）没有它 ✗ ⇒ 体里的 `await`
把帧摘下栈、调用者立刻拿到 `NativeResult` 里**还没写过的空格** ✗（**静默错值** ✓；
实测 `[1,2].map(async (x) => { await null; return x * 10 })` 给 `[,]` ✓，Node 给 `10,20` ✓）
——**同一个语义长在两条路上** ✓（第 307 / 312 / 313 / 318 轮各踩过一次 ✓）；
**② 生成器那两族的接口** ✓（`Symbol.iterator` / `Symbol.asyncIterator` 原来没人挂 ✓，
与第 308 轮 `Array.prototype[Symbol.iterator]` 一模一样 ✓——`for await` 走指令、不问这一格 ✓）；
**关键的一步是「两格原型」** ✗：异步生成器**不能**继承同步那一格 ✓（会顺带得到
`Symbol.iterator` ✗，而 JS 里异步生成器**没有**它 ✓）——**第一版就是继承的** ✓，
**新补的判据当场把它拦下来** ✓，改成「同三个方法挂两处原型」✓。
**覆盖度这一轮也定版了** ✓（用户口径「一个进程多个 case」✓）：
这台机器**瓶颈是进程启动**（实测 16 路并发与 1 路**每次都是 ~100ms** ✓；
而纯 CPU 能到 **6.1 核** ✓）⇒ **两侧都做成「一个进程跑一批」** ✓
（被测 `tsrun --batch` ✓、裁判 `judge-batch.mjs` ✓）
⇒ **裁判：32 个进程跑 1113 条（每进程约 35 条）、按单条跑的 0 条** ✓、**7.8s** ✓；
**判定只由「今天的源码 + 今天的 node + 今天的 tsrun」决定** ✓——**coverage 里不许有任何缓存** ✗
（第 318 轮那一版已彻底移除 ✓：代码、选项、文档都不在 ✓）；
**与权威口径逐条对拍一致** ✓（`--no-batch` 跑一整轮 ✓，1113 条逐条一致 ✓）。
**第 319 轮**收的是**异步生成器**那一格 ✓：体里写 `yield await x`（或 `await` 之后再 `yield` ✓）时，
帧会在 **`await`** 上离开栈 ✓，而**这一帧还没有产出** ✗——原来两种挂起在帧上**一模一样** ✗
⇒ 推进的那一侧分不出「产出了一个值」与「还在等一个承诺」✗
（实测 `await it.next()` 给 `{"done":true}` ✓，Node 给 `{"value":2,"done":false}` ✗；`for await` 一行都不出 ✗）。
**做法**：帧上补一格 `SuspendedInAwait` ✓（`DoAwait` 写 ✓、`resume` **清** ✓——
**只写不清就是下一次误判** ✗），`DoIterNext` 在它上面**把微任务排空再接着推进** ✓。
**第一版判据写错了一次** ✗：循环条件带了 `State === Suspended` ✓，而 `await` 摘下来的帧
**仍然是 `Running`** ✗（只有 `yield` 会把它改回 `Suspended` ✓）⇒ 那个循环**一次都不进** ✓
——**实测「改完什么都不变」才定位到** ✓（与第 318 轮那条「写了却没生效」是同一类 ✓）。
**顺带按用户口径把覆盖度跑快了** ✓：**一次 `tsrun`、一个进程跑多个 case** ✓
（`--batch 清单.json` ✓，每条 stdout 逐条捕获 ✓、JSON 一行一条交回 ✓），
调用方起 `min(核数, 16)` 个进程、批与批并行 ✓ ⇒ **114s → 4.5s** ✓；
**每一条仍是独立的一次 `RunSources`** ✓（新的机器、新的表 ✓）⇒ 语义与读数都没变 ✓；
**没交回结果的按单条重跑** ✓（批量不许改变判定 ✓）；另加 `.lock` ✓
（两个实例会互相删工作目录 ✗，实测被记成**三条假回归** ✓）。
**第 318 轮**修的是上一轮**撤回**的那一条 ✓：`new Promise(执行器)` 递出来的 `resolve` / `reject` ✓
——**判据本身的形状写错了** ✗（`if (callee.Tag !== ValueTag.Object) return 0;` ✓，
而这两格是 **`HostRef`**、不是 `Object` ✗ ⇒ 整条路**从不执行** ✓）。
**定位手法** ✓：把判据**改成无条件抛** ✓、看抛出来的是谁 ✓——它**确实**在跑 ✓，
只是从没在那一支上停过 ✓ ⇒ 问题在判据不在调用路 ✓（上一轮「走的是第三条路」的结论是错的 ✗，
这一轮纠正 ✓）。**教训**：**判据的形状照 `IsCallable` 那一处现成的抄** ✓
（两种壳都要认 ✓）——比凭印象写一个快 ✓。
**顺带把覆盖度跑快了 5 倍**（600s → **114s** ✓）：① 并发池里用的是**同步**的 `spawnSync` ✗
⇒ 事件循环被堵住 ⇒ **`--jobs` 形同虚设** ✓（CPU 只有 12% ✓、`--jobs 8` 与 `--jobs 16` 只差 6s ✓），
换成 `spawn` + Promise ⇒ 227s ✓；② **裁判那一半可以缓存** ✓（同一份源码交给 `node` 的结果 ✓，
**被测侧一次都不缓存** ✓，所以「runtime / 降级 / token / 标准库都在变」不影响它 ✓）⇒ 114s ✓。
**「把小用例拼成大 case」没走** ✗（拼接不是**保语义**的变换 ✓：两条各自 `const s` 拼一起就是
重复声明 ✗——拿它当读数等于换一把尺子 ✓，理由写在 `tests/coverage/README.md` ✓）。
**第 317 轮**收的是**承诺的「采纳」** ✓：JS 的解决过程有一条
「**兑现值本身是承诺就跟随它**」✓（`p.then(() => Promise.resolve(1))` 的结果承诺兑现为 **`1`** ✓）。
**本仓引擎里早就有这一条** ✓（`SettleAsync` ✓，第 285 轮 ✓），
可它只长在**async 帧的 `return v`** 那一条支路上 ✗，而走 `ResolvePromise` 的路**不止一条** ✗
（`.then` 回调的返回值 ✓、执行器里的 `resolve(x)` ✓、`Promise.all` 收的值 ✓）
⇒ `async` 那一半对 ✓、`.then(() => Promise.resolve(v + 1))` 那一半**把承诺对象当值** ✗
（实测：后面那个 `.then` 收到的是**一个带 `then` / `catch` / `finally` 的对象** ✓，Node 收到 `3` ✓）。
**修法一句话** ✓：判据收进 `ResolvePromise` **最上面** ✓（`IsPromiseValue` ⇒ `AdoptInto` ✓）
——**同一个语义一处实现** ✓、四条路一起受益 ✓。**顺手补的另一格** ✓：
`AdoptInto` 的 pending 那一支把**外层承诺的句柄**推进内层承诺的反应表 ✓，
而 `ResolvePromise` 的反应循环**原来只按「帧」处理** ✗（`AsFrame().ResumeValue = …` ✓）
⇒ 对一个承诺对象那样写是**静默错值** ✗；判据是「这一格自己有没有承诺载荷」✓，
`RejectPromise` 那一侧**对称补一格** ✓（帧那一档仍不动 ✗）。
**试过又撤回的那一条** ✗：`new Promise(执行器)` 那两条差的是执行器递出的 `resolve` / `reject` ✓
（脚本**当普通函数**调 ✓、**没有接收者** ✗）——按生成器那三格的办法插进**两处**宿主调用点 ✓，
**实测两处都没被这一步经过** ✗（把判据改成无条件抛，抛的是**别的**可调用值
⇒ `res(1)` 走的是**第三条路** ✗）；**撤回是对的** ✗（留着就是一段**从不执行**的判据 ✓，
比没有更坏 ✓），诊断手法与结论都写进了台账那一行 ✓。
补的语料 `c317-rt-promise-adoption-chain` ✓ 写成**一条顺序链** ✗
（四个独立链在本仓与 Node 的**微任务次序**不同 ✓，实测过 ✓，不塞进这条判据 ✓）。
**引擎 92.8% → 93.1%** ✓、**标准库 94.2% → 94.5%** ✓、**整体 93.9% → 94.1%** ✓。
**第 316 轮**做的是第 315 轮文末写清的「**没修的那半个面**」✗：
循环体里的 `const` 每一轮要一个新格 ✓，而**块根本不建环境** ✓
（降级期只有**函数入口**与**两个循环**会发 `EnvNew` ✓）⇒ 块里声明的捕获名落在**外面同一格**里 ✓
⇒ 闭包读到的不是「它被造出来那一刻」的值 ✓
（`for (let i …) { const j = i * 10; fns.push(() => j) }` 给 `,,` ✗，Node 给 `0,10,20` ✓，
**静默错值** ✗）。做法：**给块也开一层** ✓（`OpenBlockEnv` / `CloseBlockEnv` 一块一对 ✓，
与 `env_new` / `env_leave` 一一对应 ✓）——**判据是「有没有被捕获」** ✓
（没有被捕获的声明就**一个环境都不开** ✓，**多开只是慢 ✓、少开就是错值** ✗）；
`CloseBlockEnv` 那一句不能省 ✗（`EnvNew` 会改当前帧的 `Env` ✓），
它**与循环出口那条 `EnvLeave` 是两层、两条指令** ✓（`break` 只退循环那一层 ✓）。
**名字只收 `let`/`const`/`class`/`enum` 四种、只走这一层** ✗：`var` 不收 ✓（函数作用域 ✓）、
**`function` 也不收** ✗（函数声明在本仓里**提升到函数作用域** ✓、名字写的是外面那一格 ✓）
——**这一条是实测撞出来的** ✗：第一版连 `function` 一起收 ✓，判据 `ex-function-decl-in-block`
与 `ex-function-decl-in-block-scope` **当场红** ✓（报 `in block undefined` ✓），改掉之后两条都回来了 ✓
（**矩阵当场拦下，没有放过去** ✓）。补的语料 `c316-rt-block-scope-env` ✓：
两次进入同一个块（两个同名 `const` 各是各的 ✓）+ 循环体里那个 `const` ✓。
**引擎 92.5% → 92.8%** ✓。**第 315 轮**修的是**上一轮顺手量到**的那条 ✓：
**`env_leave`——环境那条链的一对，原来只做了一半** ✗。
`EnvNew` 会**改当前帧的 `Env`** ✓，而**离开那一层**这条路上一条指令都没有 ✗
⇒ 一个顶层 `for (let i…)` 跑完，`frame.Env` 停在**最后那一轮多出来的环境**上 ✓
⇒ 循环**之后**的代码按**词法深度**读环境时链**少了一层** ✓
（症状两种：**只印第一行、后面那行丢了**（一句异常都没有 ✗）或报
`environment index out of range` ✓）。**两条判据一起转绿** ✓
（`c314-rt-top-level-env-after-let-loop` ✓ / `rt-loop-capture-let-vs-var` ✓），
**引擎 91.9% → 92.5%** ✓。三处改动 ✓：**① IR 追加 `env_leave`** ✓——**必须追加在表尾** ✗
（各目标按**位置**编号 ✓，插在中间会把后面每个算子的号都挪一格 ✗；
**第一版就是插在 `env_set` 后面的** ✓，**两道闸当场拦下来** ✓：
`tests/runtime/check.mjs` 的「编号只追加」✓ 与验证层的 `unknown opcode: 23` ✓；
**同一条规矩的第二种代价** ✓：那个检查里「拿号算出来的假指令」`Op.Resume + 5` 原来等于 23 ✓、
追加后**恰好成了合法指令** ✗ ⇒ 改成 `Op.EnvLeave + 1` ✓）；
**② 每轮的新环境改成「以外层为父」** ✓（JS 的 `CreatePerIterationEnvironment` ✓——
原来「直接 `EnvNew`、父亲自动取当前」✗ ⇒ **环境链每轮长一层** ✗，跑一千轮就是一千层 ✓）；
**③ 出口也 `EnvLeave`** ✓（`break` 与「条件为假」都落在那里 ✓；这一步不做，
「循环之后」就永远是错的 ✗）。**没修的那半个面写在明处** ✗：
体内 `const` 每轮一格**不是**同一条根 ✗——循环变量那层已修好 ✓，而**块**今天**根本不建环境** ✗
（降级期只有函数入口与那两个循环会发 `EnvNew` ✓）⇒ 写与读一旦不在同一层上就静默给 `undefined` ✓；
`EnvLeave` 已经有了 ✓，缺的是**块那一侧**的调用点 ✓。
**第 314 轮**收的是 **`for..of` 的每轮一格** ✓：`LowerFor` 从第 201 轮起就有
「`for (let i = …)` 每轮一个新环境」✓，而 **`LowerIterationLoop`
（`for..of` / `for..in` 共用的那一段）没有** ✗ ⇒ 绑定落在**同一格**里 ✓
⇒ 体里造出来的闭包都读到最后那个值 ✓（`for (const n of [1,2,3]) fns.push(() => n)`
给 `3,3,3` ✗，Node 给 `1,2,3` ✓，**一句异常都没有** ✗）。
**补法与 `LowerFor` 一字不差** ✓（三条闸照抄 ✓），**但少一段** ✗：
`for..of` **不需要**「从上一轮拷进新一轮」✓（它的值每轮都是**新赋**的 ✓），
而上一轮那些闭包抓着的是**上一轮那个环境** ✓（新环境是另一个 ✓）⇒ 它们读到的仍是旧值 ✓
——**正是 JS 的语义** ✓；**`EnvNew` 排在续跳点** ✓（与 `LowerFor` 同一条 `continue` 坑 ✓）。
**顺手量到的另一条（当天没修 ✗、已钉进台账）**：顶层 `for (let i…)` 造过闭包之后，
**循环之后再出现任何读环境格的代码**就错 ✓——本仓**只印第一行、后面那行丢了**
（**一句异常都没有** ✗）或报 `environment index out of range: 1` ✗（同一副面孔两种表现 ✓）。
根子是那个「每轮一个新环境」在**循环出口**把 `frame.Env` 留在最后多出来的那个环境上 ✓，
而 **IR 里没有「退回上一层环境」那条指令** ✗（只有 `env_new` / `env_get` / `env_set` ✓）
⇒ 之后的代码按**词法深度**读环境时链少了一层 ✓。**它不是角落形状** ✗：
一个普通文件里**两个循环**就能撞上 ✓（判据 `rt-loop-capture-let-vs-var` 的第三条失败就是它 ✓）。
修法两条（加一条与 `env_new` 对称的算子 ✓，或改每轮环境的建立点 ✓）都要动引擎与降级期两处 ✓，
本轮余下的时间不够连同六道门验完 ✓——**不做半截** ✗。
**矩阵 1106 → 1107 条** ✓：这一条是**加宽**不是收口 ✗，所以加权从 93.79 摊回 **93.72** ✓
（**摊薄是记账，不是退步** ✓：红的没有多一条 ✓）。
**第 313 轮**接着第 312 轮那个根往下做 ✓：同组还剩**另外两个方向**（`it.return(v)` ✓ /
`it.throw(e)` ✓），这一轮先做**做得了的那一个** ✓——**往生成器里 `throw`** ✓。
**它为什么做得了** ✓：语义是「**在挂起点抛一个值**」✓，而引擎恢复生成器时**只差一格判据** ✗——
`Op.Resume` 一直是「把 `ResumeValue` 写进 `yield` 那一格」✓，
先看一眼这是不是一次「抛」✓（是就 `DoThrow(那个值)` ✓）就行 ✓
（体内 `try { yield } catch { }` 于是接得住 ✓，因为那一帧**正在栈上** ✓、异常表条目也**还算数** ✓）。
三处改动 ✓：**一个瞬时格** ✓（`ResumeRaises` ✓——只在恢复那一瞬有效 ✓，**读完必须清** ✗，
否则下一次 `yield` **凭空抛一次** ✓，**静默错值** ✓）、**三个方向收成一个判据** ✓
（`GeneratorStepKind` ✓：`0` 不是 / `1` `next` / `2` `return` / `3` `throw` ✓——
分成三个 `Is…` 就是**六个调用点** ✗）、**登记入口合成一个** ✓（`RegisterGeneratorMethods` ✓）。
**「没接住的那一抛」的收尾也是语义** ✓：JS 让这个生成器**就此结束** ✓
（此后 `next()` 恒给 `{ value: undefined, done: true }` ✓）、那个值**抛给调用者** ✓——
引擎没有「抛一个脚本值」的入口 ✗ ⇒ 走 `Raise` 那条兜底 ✓（与内建失败**一模一样** ✓）。
**没做的那一半写在明处** ✗：`it.return(v)` 要**送一次「完成」进去** ✓
（那个 `yield` 点上跑 `finally` 链 ✓），而那条链是**降级期**的构造 ✓、
**引擎手里没有「这个帧欠哪些 `finally`」那张表** ✗ ⇒ 今天**响亮地抛** ✓
（挂上去比空着好 ✗：空着报 `cannot call a non-closure value` ✓，听起来像脚本写错了 ✗）；
`for..of` 提前 `break` 那条卡在同一处 ✓。**引擎 91.6% → 91.9%** ✓。
**第 312 轮**收的是「生成器回去的那几格」那一组里**最便宜的三条** ✓
（`rt-generator-next-sends-value` ✓ / `rt-generator-next-arg-ignored-first` ✓ /
`c291-rt-generator-forms` ✓），而三条只有**一个根** ✗：
**「第一个实参要送进挂起点」那半条路，引擎两处都写死了 `Value.Undefined()`** ✗——
两处就是**两条调用路** ✓（脚本自己 `it.next(10)` 走 `DoCallValue` ✓、
当成回调传出去（`xs.map(it.next)`）走 `CallNative` ✓）——
与第 307 轮那条教训**是同一个形状** ✓（同一个语义长在两条路上 ✓）。
于是 `const got = yield 1` 里的 `got` **永远是 `undefined`** ✗（**静默错值** ✗）。
**修法各按自己的签名取「第 0 个实参」** ✓（一条从**槽**里取 ✓、一条从**实参表**取 ✓，
两处的「第 0 个」是同一件事 ✓）。**「第一次 `next(v)` 的实参要丢掉」不用专门写** ✓：
第一趟帧从**函数头**开始跑 ✓，根本不会执行到 `Resume` ✓。**引擎 90.7% → 91.6%** ✓。
**同组没做的那一半写在明处** ✗：`return()` / `throw()` 要的不是「送一个值进去」✗
而是**送一次「完成」进去** ✓（`return()` 让那个 `yield` 点上跑 `finally` 链 ✓、
`throw()` 在那一格抛出 ✓），要接上引擎里已有的 abrupt-completion 机关 ✓，留给下一轮 ✓。
**第 311 轮**收的是**两张标准定死的表** ✓（同一个形状：**结果由标准定死** ✓，
而本仓要么**只做了一半** ✗、要么**干脆没有** ✗——与 `Math.pow` 那类
「各目标可能差最后一位」**不是**一回事 ✓）：**① `trim` 的空白表** ✓——
原来只认 ASCII 六格 ✓、扫到 > 127 的边缘码元就**抛** ✓（「认不出来就不猜」✓），
可这张表**不用猜** ✗（`String.prototype.trim` 的 white space 就是
`WhiteSpace ∪ LineTerminator` ✓）；补的是二十来个码元 ✓（NBSP ✓ ZWNBSP ✓ U+1680 ✓
**`Zs`：U+2000..U+200A 写成区间** ✓ U+202F ✓ U+205F ✓ U+3000 ✓ LS/PS ✓），
**三头共用一个 `blank`** ✓（第 275 轮把三个半边收成一支的成果没白费 ✓）。
**② `encodeURI` 那一族四个名字** ✓：它们是「**同一件事的两个参数**」✗
（两张表合起来只差**十一个保留字符** ✓），所以**四个名字一次做完** ✓。
三处值得记 ✓：**按码点走** ✗（`encodeURIComponent("😀")` 是 `%F0%9F%98%80` ✓
——**四个字节** ✓，拆成两个码元去编码会得到两串三字节 ✓，**静默错值** ✓）；
**解码用算术不用位运算** ✓（这一段是 `cases:tsast` 的语料 ✓，位运算只是多一层风险 ✓）；
**坏输入响亮地抛** ✓（本仓**没有 `URIError`** 那一族 ✗，抛普通 `Error` 并点名 ✓）。
**一处已知差写在明处** ✗：`decodeURI("%2f")` 在 JS 里原样保留那两个字符的大小写 ✓，
本仓吐的是**大写** ✓。**标准库 93.3% → 94.2%** ✓、**整体 93.2% → 93.4%** ✓。
**第 310 轮**做的是缺口清单里**剩下最大的一簇**：**包装对象那一族** ✓
（`new Number(5)` ✓ / `new String("ab")` ✓ / `new Boolean(false)` ✓ / `Object(1)` ✓，
连着两条第 291 轮的老账 ✓）——**7 条判据一起转绿** ✓、**标准库 91.8% → 93.3%** ✓。
**本仓原来有什么** ✗：`BooleanCtor` 第 232 轮就造了箱 ✓，可那个箱**没有自己的原型** ✗
（`b.valueOf()` 于是落到 `Object.prototype.valueOf` 上给回**箱自己** ✓）；
`Number` / `String` 两族**连箱都没有** ✗（`typeof new Number(5)` 给 `"number"` ✗）；
`Object(1)` 则**响亮地抛** ✓（写着「本仓没有包装对象」✓）。
**做法是两句话** ✓：**一个箱子** ✓（`MakeBox` ✓：普通对象 + 一格隐藏原值 +
**原型显式指到那一族自己的** ✓——不换原型 `(new Number(5)).toFixed(2)` 就找不到那一格 ✗，
报的还是「`toFixed` 没做」✗ 而它**早就有了** ✓）+ **一处脱箱** ✓
（`text.xl.md` 的 `UnwrapBox` ✓，三个调用点共用 ✓：数值/布尔的方法 ✓、
`String` 那一大家族 ✓、`JSON.stringify` ✓——它落在 `text.xl.md` 是因为
`globals` 与 `string` **互相不能 import** ✗，而两边都要它 ✓）。
**字符串对象是奇异对象** ✓：另外铺下标格与 `length` ✓（`s[0]` ✓、
`Object.keys(new String("ab"))` 给 `["0","1"]` ✓——那两格是**可枚举的自有属性** ✓）。
**JSON 那一步的位置是语义** ✓：脱箱排在「取值 → `toJSON` → replacer」**之后** ✓
（`JSON.stringify(new Number(5))` 原来给 `"{}"` ✗，Node 给 `"5"` ✓，**静默错值** ✗）。
**第 309 轮**收的是**前两轮当场收进矩阵的那 3 条语料** ✓（用户口径那句「发现新问题就补语料」✓：
**上一轮补的、这一轮收的** ✓），**两个根** ✗：
**① 展开位里的调用把接收者丢了** ✓——`LowerCall` 的三条分支判的是 `NodeKind(callee)` ✓，
而展开位里那个孩子是 **`SpreadElement`** ✗ ⇒ 三条一条都不命中 ⇒ 落到通用路 ⇒ `this` 是 `undefined` ✗
（症状两副面孔：`[...o["m"]()]` 报 `cannot read properties of undefined` ✓、
`a[Symbol.iterator]()` 报 `this method needs an array receiver` ✓）；
修法是**选分支之前**把 `SpreadElement` 剥掉 ✓（`LowerExpression` 本来就会剥 ✓
——差别正是**在哪一步剥** ✗）。**为什么一直没露** ✗：那种写法大多是**箭头函数** ✓（不看 `this` ✓），
`{ m: () => [1, 2] }` 恰好全对 ✓，换成 `{ xs: [1, 2], m() { return this.xs } }` 当场现形 ✓。
**② 调用括号没被吃进操作数** ✓：`UnaryOperator.Process` 只往后吃**一个**单元 ✓
⇒ `typeof o["m"]()` 的那对 `()` 留在外面平级 ✓（`.m()` 能对 ✗，是因为 `(` 被折进了**同一条成员链** ✓，
而下标那一格不在链的定义里 ✗）；投影那边另有一处 ✓——链循环里**调用括号也是链上的一格** ✓，
少了它循环就 `break` ✓ ⇒ 只剩 `ElementAccessExpression`、**那次调用整格消失** ✗
（这正是「同一个形状摆在实参表第一格对、第二格错」的那一半 ✓）。
`cases:tsast` **1444 条四方向全 0** ✓（token 层与投影各动一处，它是唯一看得见的尺子 ✓）。
**第 308 轮**收的是「标准库成员不在那儿」那一组里**一处带三条判据**的那一格 ✓：
**`Array.prototype[Symbol.iterator]` 一直没人挂** ✗。**为什么一直没量到** ✗：
引擎的迭代（`for..of` ✓、展开 ✓、`Array.from` ✓）走的是**指令**那条路 ✓
（`iter_new` / `iter_next` ✓），**根本不问这一格** ✓——于是 `[...xs]` 一直是对的 ✓、
而**显式取出来自己调**（`xs[Symbol.iterator]()` ✓）报 `cannot call a non-closure value` ✗
（听起来像「迭代器这一套还没做」✗，真相是**只是没人往那一格挂东西** ✓）。
修法：在挂 `Symbol.toStringTag` 的**同一处** ✓、用**同一张**知名符号表 ✓，
把那一格指到 **`ArrayValues` 那一格能力号** ✓——JS 里它就是 `values` ✓（同一个函数对象 ✓），
**同一件事不写第二份实现** ✓。**收掉 4 格** ✓（三条转 pass ✓、一条走了一半 ✓）：
`c291-rt-iteration-protocol-forms` ✓ / `c291-array-iterator-protocol-manual` ✓ /
`c305-std-array-iterator-symbol-method` ✓，以及 `c304-std-symbol-iterator-manual` ✓——
**它只走了一半** ✗：数组那半好了 ✓、**字符串那半还缺** ✗（`"ab"[Symbol.iterator]()` ✓），
而字符串迭代要**按码点** ✓（那条规矩今天只在引擎里 ✓、`InvokeString` 拿不到 `drain` ✗）
——先把「码点」收成一处再做 ✓。**顺手量到、当场收进矩阵的新面** ✓：
`[...a[Symbol.iterator]()]` 报 `this method needs an array receiver` ✓——
产物里那个 `()` **逃出了 `Spread`** ✗（`<Spread>...a[Symbol.iterator]</Spread>`
加一个**平级**的 `<Bracket>(</Bracket>` ✓），与第 307 轮那两条 `typeof` 判据**同一个族** ✓
（「调用括号没被吃进操作数」✓），矩阵 **1100 → 1102** 条 ✓。
**第 307 轮**收的是第 306 轮**留下的那一格** ✓（判据没变 ✓，根子从投影挪到了**引擎** ✓）：
**两条调用路少了一支** ✗——脚本自己发起的调用（`Op.Call` / `Op.CallMethod` → `DoCallValue` ✓）
**有**「生成器」那一档 ✓（第 229 轮补的 ✓），而**重入**那条
（`call` 通道 → `CallNative` ✓：访问器 ✓、内建回调 ✓、**迭代协议** ✓都走它 ✓）**没有** ✗
⇒ 生成器函数经重入被调时按普通函数压帧跑 ✓、体里第一条 `suspend` 报
`suspend outside a generator` ✗。**症状很会骗人** ✗：`const it = a[Symbol.iterator](); it.next()` **全对** ✓，
而 `[...a]` / `Array.from(a)` / `for (const v of a)` **全抛** ✗（**同一条判据两种结局** ✓）——
因为前者是脚本自己发的 `Op.CallMethod` ✓、后三条都由引擎经 `call` 通道去调 ✓。
修法与 `DoCallValue` 那一支**一字不差** ✓（开一帧但**不上栈** ✓、实参铺进去 ✓、
包成生成器对象 ✓、把**对象**交回去 ✓），并且排在那几件重入记账**之前** ✓
（这一趟根本不进分派循环 ✓）。**收掉 2 格** ✓：`c305-e2e-linked-list-ops` ✓（**端到端 88.0% → 92.0%** ✓）
与 `c291-symbol-wellknown-custom-iterator` ✓（从第 291 轮起拖着同一个根 ✓）。
**顺手量到、当场补进矩阵的 2 条** ✓（用户口径那句「发现新问题就补语料」✓），
都在 `typeof` 的**操作数位**上 ✓：`console.log("x", typeof (o["m"]()))` 给 `function` ✓
（**静默错值** ✓，而**同一个形状摆在实参表第一格就是对的** ✓ ⇒ 是**位置**决定的 ✗）、
`typeof o["m"]()` 报 `cannot call a non-closure value` ✓
（`b["m"]` 被收进 `UnaryOperator(typeof)` 里面 ✓、那个 `()` 留在外面平级 ✓）——
两条都与缺口清单 #9 那一族同源 ✓，矩阵 **1098 → 1100** 条 ✓。
**第 306 轮**是**收账轮** ✓（不再铺分母 ✓，照第 305 轮量出来的根子收 ✓）：
**收掉 3 格 + token 层 2 处** ✓，**引擎那一层 89.8% → 90.4%** ✓、**标准库 90.8% → 91.1%** ✓，
**红的一栏 0** ✓（`bad` 0 ✓、`REGRESSION` 0 ✓）。三格**同一个根** ✗——
**「取属性」有两条路，而其中一条没有访问器那一档** ✓：
`{ ...{ get x() { … } } }` 展开**不调 getter** ✓（判据 `c305-rt-object-spread-triggers-getter` ✓，
**静默错值** ✗）、对象剩余**丢掉符号键** ✓（`c305-rt-object-rest-keeps-symbol` ✓）、
`Object.prototype.toString` **不认 getter 提供的 `Symbol.toStringTag`** ✓
（`c305-std-symbol-tostringtag-custom` ✓）。修法是把那一支接到 `GetProperty` 上 ✓——
**取值那一刻才读** ✓（getter 的结果不属于任何对象 ✓，不能跨越一次分配 ✗）、
`call === null` 时退回老口径 ✓（宁可少一格，也不凭空给一个 `undefined` ✗）。
**token 层那两处**是判据 `c305-e2e-linked-list-ops` 牵出来的 ✓，**与 `ts.createSourceFile` 逐节点对过** ✓：
`*[Symbol.iterator]()` 在 TS 那边是 `MethodDeclaration(asteriskToken) > name: ComputedPropertyName` ✓，
本仓却把 `*` 折成了**乘法** ✓（左操作数是**计算名那个方括号** ✓——它排到了 `*` **后面** ✗）。
修法是**次序判据** ✓（左操作数的终点不得晚于运算符的起点 ✓）+ **名字那一格不要收两遍** ✓；
`cases:tsast` **1444 条四方向全 0** ✓（节点集合与区间一个都没动 ✓）。
**这一条判据还是没过** ✗，但卡的地方**深了一层** ✓：现在是运行期
`suspend outside a generator` ✓——**直接调那个生成器方法是对的** ✓，
**由迭代协议 / 展开去调它就丢了生成器那一档** ✗（与 `c291-symbol-wellknown-custom-iterator` 同一个根 ✓）。
**第 305 轮**照旧先做用户那句「**先增加 exec / runtime / 标准库 cases，尽量覆盖所有场景**」✓：
候选分四层写了 **169 条** ✓（引擎 53 ✓ / 降级层 44 ✓ / 标准库 60 ✓ / **端到端 12** ✓——
端到端那一层此前只有 13 条 ✓，这一轮**按「一份完整的 `.ts` 程序」**补了 12 份 ✓），
先过 `sweep.mjs` 普查 ✓（**136 条当场通过** ✓、**33 条是新量到的缺口** ✗、`nodefail` **0 条** ✓），
**当场收掉 4 格** ✓：
`a["1"] = 20` ✓（**读得到、写不了** ✗：`set_index` 那一支把键原样递给 `props.SetIndex` ✓，
而它只认数字键 ✓ ⇒ 报 `non-numeric index needs ToString` ✓——修法是把 `get_index` 第 190 / 191 轮
那套「字符串化 + 判下标」**照搬到写这一侧** ✓，顺带 `arr[1.5] = v` / `arr["length"] = 2` 也一起对了 ✓）、
`{ [Color.Red]: "red" }` ✓（**计算键是一个数** ⇒ 原来把数直接当键交给引擎 ✓、
报 `property keys must be strings or symbols` ✓——`SetPropertyValue` 改走 `set_index` ✓，
`ToPropertyKey` 那一套于是**只有一处** ✓）、`JSON.stringify(循环引用)` 抛的**族** ✓
（裸 `Error` → **`TypeError`** ✓，与第 275 / 288 轮 `fromCodePoint` / `repeat` 同一条口径 ✓）、
类方法的 `fn.name` ✓（`"C.m"` → **`"m"`** ✓——同一格同时是 `fn.name` 与 `console.log` 的显示名 ✓）。
**本轮量到的新缺口按根子分十组** ✓（写在 `expectations.mjs` 里 ✓）：异步生成器里 `await` 之后再 `yield` ✓、
`for await..of` 一个**承诺数组** ✓、`queueMicrotask` ✓、`Map.groupBy` ✓、`Promise.withResolvers` ✓、
`Object.getOwnPropertyDescriptors` ✓、**包装对象那一族**（`new Number` / `new String` / `new Boolean` ✓）、
**取属性那条路上没有访问器**（`{...o}` 展开 getter ✓ 与 `Symbol.toStringTag` 的 getter ✓ **同源** ✓）、
**数组 `length` 不可写时 `push` 拦不住** ✓、**每个迭代开一格环境**（经典 `for` 与 `for..of` 都缺 ✓）。
矩阵 929 → **1098 条** ✓（**分母 +18%** ✓），读数因此从 94.9% **落到 91.6%** ✓
——**分母变诚实** ✓ 不是倒退 ✓（与第 273 / 287 / 290 / 291 / 304 轮同一条口径 ✓），
**标准库那一层掉了 3.0 个点** ✓（93.8% → 90.8% ✓：新收的 60 条里有 **17 条**过不去 ✓——
这一轮正好把「标准库还没做的那一片」量了出来 ✓）。

**第 304 轮**做的是用户那句「**先把 exec / runtime / 标准库的语料铺满**」✓ 加上新的一条
「**发现新问题就补语料、与 TS 的 AST 比、然后解决**」✗：候选分三层写了 **150 条** ✓，
先过 `sweep.mjs` 普查 ✓（**135 条当场通过** ✓、**15 条是新量到的缺口** ✗、`nodefail` **0 条** ✓），
**当场收掉 9 格** ✓：`Array.prototype.toSpliced` ✓（顺手把 `splice` 那一段抽成 `SpliceArray` ✓——
那里面有**三处写错了不出声**的地方 ✓）、`Object.setPrototypeOf` ✓（走引擎**早就有的** `RtSetProto` ✓）、
`Object.preventExtensions` ✓、`Object.prototype.isPrototypeOf` ✓（落回 `RtChainHas` ✓）、
`"abc".toString()` / `valueOf()` ✓（不装的话查找会落到 `Object.prototype.toString` ✓
⇒ `"[object String]"` ✓，**静默错值** ✗）、`getOwnPropertyDescriptor` 的**访问器**那一格 ✓
（第 276 轮抛的理由是「门还没有」✓——**量了一下门早就在** ✗）、
`Object.assign` 的**字符串源** ✓（按码元展开 ✓）、`reduce` 回调的**下标 / 数组**两格 ✓
（`acc + i` 原来给 `NaN` ✓）。
**本轮发现的新问题** ✗：`Object.isSealed` 只问了「不可扩展」那个标记 ✓ ⇒
`preventExtensions({ x: 1 })` 之后答**真** ✗（Node 答假 ✓——那一格还可配置 ✓）——
`seal` 是**两件事** ✓，修完**补了语料守着它** ✓（`c304-std-object-issealed-after-preventextensions` ✓）。
**量准但没做的一格** ✗：`arr![0]![0]` 投影出来是 `NonNullExpression(arr)` ✓
（与 `ts.createSourceFile` 对过 ✓：TS 是 `ElementAccess(NonNull(ElementAccess(NonNull(arr), 0)), 0)` ✓）
——第 303 轮账里「没做的两格」之一 ✓，这一轮**把它收进了矩阵** ✓。
矩阵 779 → **929 条** ✓（**分母 +19%** ✓），读数因此从 95.4% **落到 94.9%** ✓
——**分母变诚实** ✓ 不是倒退 ✓（与第 287 / 290 / 291 轮同一条口径 ✓），
而**标准库那一层是唯一往上走的一层** ✓（93.6% → 93.8% ✓）。
**第 303 轮**收的是**非空断言后面直接跟下标**（2 条转绿 + 矩阵加宽 1 条 ✓）：
`o.b![1]` 的产物是 `<NotNull(o.b, !)>` 与 `<ArrayLiteral(1)>` **两个平级单元** ✓——
`!` 只把**左边**包起来 ✓，于是那个方括号**按「数组字面量」成形** ✗、投影的链分支进不来 ✓
⇒ `[1]` **整个丢掉** ✗（给的是**那个数组本身** ✓，**静默错值** ✗）。
**修法两处**：投影把「链上出现过非空断言之后的方括号」当**下标** ✓；
token 那边把 `ArrayLiteral` 也认成**可以被断言的东西** ✓
（`arr[0]!` 的产物就是 `<ArrayLiteral>` ✓——不认它，后面那个 `!` 会被收成**前缀取反** ✗）。
**第 302 轮**收的是**实参表里的逗号**（2 条转绿 + 矩阵加宽 1 条 ✓），而且是**同一件事两种时序** ✗：
「实参按**顶层逗号**切组」这条规矩一直在 ✓，可**逗号什么时候已经折成「算子单元」**
取决于**队列时序** ✗——`h(1, 2)` 里逗号还是独立的符号 ✓，而 `(h)(1, 2)` / `((a, b) => a + b)(1, 2)`
这些**括号当被调用者**的形状要等**前一个括号先闭合** ✓ ⇒ 逗号先被折成了算子 ✓ ⇒ 切不开 ✓
⇒ `arguments` 只剩**一格** ✓ ⇒ 形参 `a` 拿到**最后一个**实参、`b` 是 `undefined` ✓ ⇒ `NaN` ✓
——**一句异常都没有** ✗。**修法**：切组时**再认一种逗号** ✓，而且要把那个单元**摊开**
（**第一版按「分隔符」处理它 ⇒ 比原来还少** ✗：它的区间是**整段** `1, 2` ✓，切出两个**空组** ✓）。
**第 301 轮**由一条红条牵出**一格投影** ✓：`const K: Ctor = class { n: number; constructor(n) { this.n = n } }`
之后 `new K(4).n` 给 `undefined` ✓（Node 给 `4` ✓），而 `class { n = 1; constructor(v) { this.n = v } }`
给 **`1`** ✓（Node 给 `7` ✓）——**字段初始化式把构造函数的赋值盖掉了** ✓，**一句异常都没有** ✗。
**根子**：投影里 `constructor` → `Constructor` 那条规矩只认 `parentKind === "ClassDeclaration"` ✗，
类**表达式**的成员于是留成 `MethodDeclaration` ✓；降级层按 `NodeKind === "Constructor"` 找显式构造函数 ✓，
找不到就**合成一个空的** ✓（写着的那个整条不跑 ✗）。
**TS 两种都投 `Constructor`** ✓ ⇒ 是**投影漏了一格** ✗，补上之后 `cases:tsast` **1444/1444 照旧全绿** ✓
（它本来就不该红 ✓，而语料里**没有**这一格 ✗——按口径补了一条判据 ✓）。
**第 300 轮把端到端那一层清了** ✓（13/13 ✓，这一条从第 296 轮起红了两轮 ✓，
而两轮的红**不是同一个病** ✓）。**根子**：`CallFailed` 的两格（`NativeFailed` / `NativeEscaped`）
是**重入**的账本 ✓，只在 `CallNative` 里按趟归零 ✓——而**能力调用那一条路不经过 `CallNative`** ✗
⇒ 一次**早就被 `.catch` 接住**的展开把 `NativeEscaped` 留在**真**上 ✗ ⇒ 后面**每一次**问
`failed()` 的内建都以为「上一次重入没跑完」✗。**实测那行**：
`CALLFAILED -> true NativeFailed false NativeEscaped true Status 0` ✓——状态是 `Ready` ✓，
**只有那一格在说谎** ✗。症状是 `[...g()]` 与 `[...\"ab\"]` 都给**空数组** ✓
（而 `drain` **明明收齐了 2 项** ✓，紧接着 `if (failed()) return undefined;` 整批丢掉 ✓），
**一句异常都没有** ✗、**退出码还是 0** ✗。**红的为什么正好是那两格** ✗：
`Array.from` 那条路**不问 `failed()`** ✓、`[...[1,2]]` 走数组那一支（也不问 ✓）✓——
**「谁问了那句话」才是把这几格串起来的那条线** ✓。
**第 299 轮**收的是**描述符那一簇**（3 条转绿 ✓），三条**同一个形状** ✗：
**引擎里的门早就造好了，只是这一层没把描述符接上去** ✓。
`Object.defineProperty` 的 **`get` / `set` 整支抛** ✗（理由写「这一层还没有那两格的门」✓，
而 `DefineAccessor` **第 98 轮**就在用 ✓——对象字面量与类方法一直走它 ✓）；
`Object.create` 的**第二格整格丢掉** ✗（`o.a` 给 `undefined` ✓、`Object.keys(o)` 给空 ✓）；
`Object.create(null)` **响亮地抛** ✗。**最值得记的是第三条**：第 209 轮那句
「『没有原型』与『`Object.prototype`』长得一样」✓——**量了一下：不一样** ✗
（`FindProperty` 判的是 `current > 0` ✓，所以 `Proto = 0` 天然就是「到此为止」✓），
那句担心说的是**另一件事**（`NewPlainObject` 填的是 `protos.Object` ✓）——
**「没试过」与「长得一样」在纸上分不开** ✓。
**第 298 轮**按权重挑活 ✓（`e2e` 只有 13 条、一条值 1.5 个点 ✓）：
**类字段初始化式里的全局名** ✓（`class E { private handlers = new Map<…>() }` ✓）——
症状是 `cannot call a non-closure value` ✓（**听起来像调用写错了** ✗），
真相是**字段初始化式里的全局名读成了 `undefined`** ✓。根子是「**算捕获用的名单里混着全局名**」✗：
全局名的**值**住在**入口那一帧** ✓，而内层帧**永远不会声明它们** ✗ ⇒ 那一帧 `EnvNew` 开一格 ✓、
**而 `EnvSet` 永远不来** ✗。**最刺眼的是「两边都没说谎」** ✗：编译期 `Env.Resolve("Map")` 给
`Depth 0, Cell 0` ✓（那一帧确实留了一格 ✓），运行期那一格**就是**空的 ✓——
断的是「**谁负责给它写值**」这一环 ✗。修法是**算捕获用另一份名单** ✓（不含全局名 ✓，
**只有入口那一帧例外** ✓——那一条捕获兑现得了 ✓）。
**第 297 轮**收的又是「**同一件规矩写在几处**」那一族（3 条转绿 + 矩阵加宽 1 条 ✓）：
「一个字符串怎么迭代」原先写在**三处** ✓（引擎的 `iter_next` ✓、`Array.from` ✓、`[...s]` ✓），
三处各自都说自己是对的 ✓，而把第一处改成**按码点**之后，另外两处立刻**分了岔** ✗ ——
`for (const c of "😀")` 给一个 ✓、`[...\"😀\"]` 给两个 ✓（**同一种东西两种答案** ✓、**一句异常都没有** ✓）。
**第 136 轮那条「已知差」的理由本身不成立** ✗：它说「单独让迭代按码点会让 `[...s]` 与 `for..of` 不一样」✓——
可那一支**就是**四者共用的迭代器 ✓；**JS 自己就是两种口径** ✓（`"😀".length` 是 2 ✓、`for..of` 给 1 ✓），
原来那一版是把「同一个东西的两种视角」当成了「同一种东西的两种答案」✓。
修法是**收口**：两处语言层的字符串分支都走引擎那张 `drain` ✓（一条规矩只有一处 ✓）。
**顺手量到一条新的** ✓：`JSON.stringify("\uD800")` 原来原样吐出一个**落单的代理** ✓，
而 Node 按 ES2019 写 `\"\\ud800\"` ✓（**静默**：本仓打出来看着「就是那个字符」✓）——
按用户的「发现新问题就加对应语料」补了判据 ✓（`c297-string-codepoint-iteration` ✓）。
**第 296 轮**收的是红条里最贵的那一类：**静默错值**（5 条转绿 ✓），
而且两处都在**同一个形状**上 ✗——**一条规矩写在一个出口上，另一个出口自己另写了一遍** ✓。
**① 属性枚举的整数键优先序** ✗：`JSON.stringify` 走 `Props` 的**纯插入序** ✓，
而 JS 的次序是**语义** ✓（整数样的键升序在前 ✓、其余按创建顺序 ✓）；
它藏得住是因为 **`Object.keys` 从第 210 轮起就是对的** ✓ ⇒ **同一个对象两个出口两个次序** ✓。
修法是新增 `JsonKeyOrder` ✓（三趟遍历走同一张下标表 ✓，判据与 `Object.keys` **共用** `IsIndexKeyText` ✓）。
**② `String.replace` 的另一半** ✗：**替换值是函数** ✓ 与**替换文本里的记号** ✓
（`$$` / `$&` / `` $` `` / `$'` ✓，而 **`$1` 那一类原样留着** ✓——换成空串就是静默错值 ✓）。
**最要留意的一处**：长度原来是「每一处一样长」那个乘法 ✓ ⇒ 记号与函数都让**逐处不一样长** ✓，
改成逐处累加 ✓；而 `` $` `` / `$'` 取的是**当前这一处**的前后 ✓（写成整个串的前后在 `replaceAll` 上每处都一样 ✗）。
**第 295 轮**收的是标准库红条里最便宜的一簇「**一个名字或一格表**」✓（9 条转绿 ✓，
标准库 88.7% → **91.4%** ✓）：**`WeakMap` / `WeakSet`** ✓（值就是 `Map` / `Set` 那两个构造 ✓，
两处已知差异写在明处 ✓）、**`ReferenceError`** ✓（第 277 轮「等有判据了再补」那条规矩兑现 ✓）、
**`AggregateError`** ✓（**实参次序与别的族相反** ✗）、**`Object.groupBy`** ✓、
**`Array.prototype.toLocaleString`** ✓、**`Promise.allSettled` / `Promise.any`** ✓
（**四步回调分两个号** ✗：引擎只把结清值接在实参后面 ✓，**不告诉回调这是哪一档** ✗）。
**最值钱的两处都是「上界 / 映射写窄了」** ✗：`install.xl.md` 那个窄段的上界要跟着挪 ✓
（少挪一格报的是 `unimplemented: global builtin 243` ✓），
以及 `any` 的兑现步第一版**指到了 `allSettled` 的那一个** ✓ ⇒ 兑现出 `undefined` ✓（**静默错值** ✓，
而 `allSettled` 一字不差是对的 ✓）。
**第 294 轮**收的是上一轮留下的那一条根（`JSON.stringify` 不调 `toJSON` ✓），做成之后
**顺手把 replacer 两条也收了** ✓（5 条转绿 ✓，标准库 87.2% → **88.7%** ✓）。
`JsonText` 从第 122 轮起是个**纯查询** ✓（刻意不调脚本 ✓），这一轮接上**两条调用通道** ✓：
**`toJSON`** ✓ 与 **replacer** ✓（函数逐格改写 ✓ / 数组当**键的白名单** ✓，且**按数组的顺序** ✗）。
**次序是语义** ✗（JS 是「取值 → `toJSON` → replacer」✓，两支都只**换值、不递归** ✓——
写成「换完递归一遍」会让 replacer 对同一格跑两次 ✓）。**最费事的是根保护** ✗：
回调里会再跑脚本 ✓，产物**只有宿主变量指着** ✓——锚挂在 `protos.WellKnownSymbols` 上 ✓、
**按递归深度分格** ✓（一层一格 ✓：内层再调一次时挤不掉**外层正在遍历的那个容器** ✓）。
**第 293 轮**收的是**标准库那一层里最大的一组**：**`Date` 那一族**（5 条转绿 ✓，
标准库 85.6% → **87.2%** ✓）。装上四件事 ✓：**`Date.parse` / `new Date(字符串)`** ✓（ISO 8601 的
最小子集，**其余一律 `NaN`** ✓——与 JS 自己一致 ✓）、**多实参构造** ✓（含 `0..99` 的年份加 1900 ✓）、
**本地那七个 getter + `getDay`** ✓（与 UTC 那七个**共用同一个能力号** ✓）、
**`Date.prototype.toString`** ✓（**只做 `Invalid Date` 那一档** ✓）。
**最值钱的一处不在这些格里** ✗：`ToPrimitiveOf` 里那条「`Date` 的 `default` 当 `string` 用」的
路障原来**整族抛** ✓（`toString` 根本不存在 ✗）——装上之后**必须把 hint 翻过来** ✓，
否则按「`default` 先 `valueOf`」走 ⇒ `new Date(0) + 1` 给 **`1`** ✗（**静默错值** ✓），
而 `runtime:check` 第 198 轮那条判据**当场把它抓回来了** ✓。
**一处已知差异写在明处** ✗：本仓没有时区库 ⇒ **本地时间口径就是 UTC** ✓
（构造与读取自洽 ✓，而**混用**本地与 UTC 的程序会差一个偏移 ✓）——
所以 `Date.prototype.toString` 的**合法日期那一档仍旧响亮地抛** ✓。
**第 292 轮**收的是缺口清单 #4 那一整簇：**`namespace` / `module`** ✓（矩阵里 8 条里 **7 条转绿** ✓，
**降级层一次加 3.8 个点** ✓）。它落成「**造一个对象 + 开一帧跑体 + 把导出的名字挂上去**」✓
（与 TS 自己的变换 `(function (N) { … })(N)` 同一个形状 ✓）。**为什么必须开一帧** ✗：
体内的名字属于**命名空间自己那一层** ✓（`CollectDeclaredNames` 从第 231 轮起就写着
「命名空间是作用域边界」✓）——塞进外层只有两种错法 ✗：**泄漏到外面** ✓（静默错值 ✓）
或者体内函数读到**别的帧的槽号** ✓（垃圾值 ✓）。**对象按形参进去** ✗（不能靠捕获 ✓：
`CapturedNames` 的定义是「进了内层函数才算」✓）。**顺带收口一处重复** ✓：
造闭包那一段原先在函数值与函数声明**各写一遍** ✓（第 291 轮加第四格时要改两处 ✓），
这一轮收成 `EmitClosure` ✓。**另外量到并退回一处 token 层的** ✗：
把 `Namespace` 收进 `IsStatementUnit` 能修好「一行里命名空间后面再跟一句」✓，
但它同时把外层 `ModuleBlock` 的产物从 `statements` 改成 `body` ✓ ⇒ 嵌套那一档从
「报错」变成**静默错值** ✓——**收益 1 条、代价是静默错值** ✗，所以退回来了 ✓。
**第 291 轮**做的是用户那一句「**先把 exec / runtime / 标准库 的语料铺满**」✓：
**加宽 126 条（648 → 774）** ✓，候选先过 `sweep.mjs` 普查 ✓（97 条当场通过 ✓、29 条是新量到的缺口 ✗），
**并且当场收掉 11 条** ✓——四簇 ✓：**标准库最日常的四格**（`String.prototype.substr` ✓ ·
`Math.LN2` / `Math.SQRT2` 那一族六个常量 ✓ · `Number.prototype.toExponential` ✓ ·
`Object.isExtensible` ✓）、
**函数自己的 `name` / `length`**（**7 条判据** ✓——`HeapClosure` 的 `Arity` 与 `Name` 两格
**留了四十几轮没人读** ✗，补上读取之后一格拖七条 ✓）、
**命名位置的收窄**（`const arr = [function () {}]` 里那个函数原来也叫 `arr` ✓）、
以及**具名函数表达式的名字优先** ✓（`const expr = function named() {}` 该给 `"named"` ✓）。
**分母 +19%** ✓，读数从 88.1% **落到 87.8%** ✓（**分母变诚实** ✓，不是倒退 ✓）；
不加宽的话这一轮是 **584 / 648 = 90.1%** ✓，**红的一栏是 0** ✓。
**第 289 轮**收的是**「静默错值」那一批**（4 条转绿 ✓，红的一栏没动 ✓）：
`delete xs[1]` **什么都没做** ✓（元素不住在 `Props` 里 ✓，而 `DeleteProperty` 只扫 `Props` ✗）·
内层 `const n = 2` **改写了外层的 `n`** ✓（`CellOf` 看的是 `Env.Last()` ✗——本函数**没开环境**时
链尾是**外层函数**的 ✓）· `a as number + 1` 里 **`+ 1` 整个没了** ✓
（`AsReorganization` 把 `+ 1` **当成类型的一部分吞了** ✗——TS 是 `(a as number) + 1` ✓）·
`` `${o}` `` 印出 `5` ✓（Node 印 `"T"` ✓——模板串是 `ToString` ⇒ hint **`string`** ✓ **先问 `toString`** ✓，
而 `StringConcat` 是 `default` ✓ **先问 `valueOf`** ✓）。
**四条里三条的根子不在引擎** ✗（在降级层与 token 层 ✓）。
**顺带量出并修掉两条 token 层的** ✗（都由 `cases:tsast` 当场点名 ✓）：
`if` 体与 `else` 之间夹一条注释 ⇒ `IfSet` 断成两条 ✓（续段判定用 `SkipNextWrapSymbol` ✗，
它**只跳软换行** ✓，而注释是**另一档 trivia** ✓）；
`as` 的收工位置 ✓（收工后 `+` 前面站着折好的 `As` ✓，而两份 `IsOperand` 名单**都没有 `As`** ✗
⇒ `+` 被读成**前缀一元加** ✗）。两条都**补了语料** ✓ ⇒ `cases:tsast` **1444 / 1444** ✓。
**第 288 轮**收的是**标准库「表里挂一格」那一批**（8 条转绿 ✓，红的一栏没动 ✓）：
`Math` **三角七格**（`sin`/`cos`/`tan`/`asin`/`acos`/`atan`/`atan2` ✓——号 `360..366` ✓）、
`Number.isSafeInteger` ✓（与 `isInteger` **共用同一支** ✓）、
`Object.getOwnPropertySymbols` ✓（`getOwnPropertyNames` 的**镜像** ✓）、
`Math.hypot()` **空实参**给 `0` ✓、`Math.min(0, -0)` 的 **±0 次序** ✓、
`Map`/`Set` 的 `forEach` **第三格实参** ✓。
**那一轮最值钱的一处不在那些格里** ✗：`"a".repeat(2.9)` 给空串 ✓ 的根子在**共用的取值器 `ArgOr`** ✓
——它原来对 `Float64` 走 `AsInt()` ✓ ⇒ **每一个小数实参都静默变成 `0`** ✗
（`fill(9, 1.5)` / `at(1.5)` / `slice(1.5)` 一起歪 ✓）。改一处、**十几个内建一起对** ✓；
同一条判据当场抓到第二处 ✗：`repeat(-1)` 抛的是**裸 `Error`** ✓，
而 `install.xl.md` 那一支按**宿主异常的类**翻族 ✓ ⇒ 脚本里 `e.name` 给 `"Error"` ✗
（Node 给 `"RangeError"` ✓）。
**第 288 轮还量出一条 token 层的缺口** ✗：改 `Math.min` / `Math.max` 的判据时顺手在 `if` 体与
`else` 之间写了一行注释 ✓ ⇒ `npm run cases:tsast` 当场报 **1441 / 1442** ✓——
`IfSet` 的续段判定用的是 `SkipNextWrapSymbol` ✓（**只跳软换行** ✗），
而注释是**另一档 trivia** ✓（`SkipNextTrivia` 那一对**早就有了** ✓、
`conditional-type.xl.md` 也在用 ✓）。**同一个形状在两种 trivia 上只做了一半** ✗，
而语料里此前**没有一条**这种排版 ✓。修法是**换两个调用** ✓，
并按第 273 轮的规矩**补语料守着它** ✓（`tests/parse/cases/statements/if-else-with-comment.ts` ✓）
⇒ **1443 / 1443 完全一致** ✓、四方向全 0 ✓。
**第 287 轮**做的是**加宽矩阵**（397 → **556** 条 ✓）：用户的选题是
「**先把 exec / runtime / 标准库 的语料铺满，再照读数决定下一步**」✓，
所以那一轮**只加宽、不修** ✗。候选 159 条先过 `sweep.mjs` 普查 ✓：
**120 条当场通过** ✓、**39 条是新量到的缺口** ✗ ⇒ 读数从 92.1% **落到 88.5%** ✓
——**分母 +40%** ✓，与第 273 轮同一条口径 ✓（**分母变诚实** ✓，不是倒退 ✓）。
顺带**修掉了 `sweep.mjs` 一处崩溃** ✗：`--json` 那一支引用了不存在的 `passed` ✓
（普查读数一直是打不出来的 ✗）。39 条按根子分八组 ✓，最值钱的是
**组 A：引擎的六条静默错值** ✗——`delete xs[1]` 不删 ✓、内层 `const` 覆盖外层 ✓、
`o!.a!.b![1]` 丢尾 ✓、`{ valueOf }` 不参与 `+` ✓、`"a".repeat(2.9)` 给空串 ✓、
带类型标注的箭头立即调用给 `NaN` ✓——**一句异常都没有** ✓，
只能靠与 `node` 逐字节对拍才看得见 ✓（其中**五条是降级层 / token 层的活** ✓，不是引擎 ✗）。
缺口清单与入口见 [tests/coverage/README.md](tests/coverage/README.md) ✓。
**第 286 轮**收的是 **`async` 那一整族**（台账里 9 条收掉 6 条 ✓）——
三条语义差一起做 ✓：调用者**立刻**拿到承诺 ✓（承诺在**开帧那一刻**就造好 ✓、
写进调用者那一格 ✓，而体照常压帧跑 ⇒ **同步跑到第一个 `await`** ✓）、
`return v` / 体里抛的错 = 那个承诺**兑现 / 拒绝** ✓、`await` 一个**不是承诺**的值
⇒ 包一个已兑现的承诺 ✓、**照样让出一个 tick** ✓。
顺带四处「只有这个形状才现形」的 ✗（**实参被承诺盖掉** ✓——结果格与参数基址**是同一格** ✓；
**`DoIterNext` 清掉机器级的 `Finished`** ✓；**`DoThrow` 拒绝之后必须收摊** ✓；
**引擎自己造的承诺也要带三个方法** ✓），以及一处 **token 层的** ✗：
`await` 被当成二元运算符的**右操作数** ✓ ⇒ `total += await f(n)` 里 `+` 把 `await` 整格吃掉 ✓
（而 `yield` 早就排掉了 ✓，同一个形状的另一个词 ✓）。
**前面几轮的格子**里与本轮缺口相邻的那几个：
**第 284 轮**收的是**对象字面量的计算键访问器** ✓（1 条 ✓）+ **矩阵加宽 1 条** ✓
（`ex-object-literal-key-order` ✓）。根子是**同一个形状在同一个函数里写了三遍** ✗：
`PropertyAssignment` ✓ 与 `MethodDeclaration` ✓ 第 183 轮就收下了计算键 ✓，
**访问器那一条漏了** ✗（它无条件走 `KeyUnitsOf` ✓，最后落在 `TextOf` 上 ✓）——
**漏的那一遍隔了 100 轮才被量到** ✓。
顺带把那一族的**求值顺序**改对了 ✓：三条计算键的路原来都是**值在前、键在后** ✗
（第 183 轮自己把它记成了「已知差」✓），而 JS 的规范是**键在前** ✓——
**只有键 / 值里带副作用才看得出来** ✓，所以也一直没被量到 ✓；
**新加的那条判据就是为它立的** ✓（`ex-object-literal-key-order`：拿一个会往数组里推标记的
`next()` 当键与值，打印出来的次序就是答案 ✓）。
**第 283 轮**收的是**枚举反向映射的口径** ✓（1 条 ✓）——**而当初那条理由本身是多余的** ✗：
第 230 轮写的是「它要在运行期才知道是不是数 ✓，真要做就得先问一次 `typeof`」✓，
于是判据只认「没有初始化式」与「数值字面量」两档 ✗。
**问错了问题** ✓：要证的不是「值是不是数」✓，而是**「TS 会不会挂这一格」** ✓——
而 TS 的判据是**语法上的** ✓（`emitEnumMember` 只看「初始化式是不是字符串字面量」✓），
**一条编译期判据就够了** ✓（原来那层运行期 `typeof` 根本不需要 ✓）。
新口径：`initializer === null` 或**不是字符串字面量** ⇒ 挂 ✓，
判据**复用 `IsTextLiteral`** ✓（`+` 那条换路用的同一个 ✓，认三种字符串形态 ✓）——
不另写一份 ✗（第二份迟早与第一份走偏 ✓）。
**第 282 轮**收的是**枚举名在内层作用域里可见** ✓（1 条 ✓），顺带**把矩阵加宽 1 条** ✓
（`ex-enum-in-nested-scopes` ✓：函数 / 箭头 / 立即调用 / 类方法四种内层各一个 ✓，
外加反向映射 `N[1]` ✓——它证明进环境格的是**真那个枚举对象** ✓，不是一个只带正向格子的影子 ✓）。
根子只有一处 ✗：`CollectDeclaredNames` 那张 **`kind` 名单漏了 `EnumDeclaration`** ✓——
与 `Hoist` **无关** ✗（枚举像 `let` ✓，按书写位置降级 ✓）。
**症状很窄** ✓：顶层用枚举是好的 ✓（那时 `BindName` 已经把名字放进当前作用域 ✓），
只在内层函数里报 `name is not a local or a capture` ✓。
**为什么不能顺手收「所有带 `name` 的节点」** ✗：`InterfaceDeclaration` / `TypeAliasDeclaration`
带 `name` 却**不产生运行期东西** ✓，收进来会把「类型名当值用」从**响亮地报错** ✓
变成「读到一个空槽」✓（**静默错值** ✗）——那一格是**按 kind 一个一个点名** ✓，
不是按字段约定 ✓。
**第 281 轮**收的是 **`implements` 那一族** ✓（2 条，同一个根 ✓）——**而且原来的诊断是错的** ✗
（第 273 轮记的是「只认了 `extends` 那一格」✓）：真相是 `SuperClassNameOf` 取的是
**第一条能找到名字的子句** ✗——而 `class C implements I` **只有一条** ✓，
于是它把 `Named`（一个**接口** ✓）当成了父类 ✓。
**难点不在降级层** ✗：两条子句投影出来**形状完全一样** ✓（都只有 `types` ✓），
所以「哪一条是 `extends`」在那一层**无从回答** ✗——信息在**投影那一头**丢了 ✗
（`PrintAst` 按 TS 的 `forEachChild` 口径把子句词滤掉了 ✓，
可它也只保留了 `types` ✓，于是 `token` 那一格——TS 里明明有 ✓——没了 ✗）。
修法是把子句词作为 **`token` 属性**收进投影 ✓（不进 `types` ✓ ⇒ **节点集合一个都没变** ✓、
`cases:tsast` 四方向仍全 0 ✓），降级层再按 `token === "extends"` 过滤 ✓。
顺带补了夹具：`samples/declarations.expected.tsast.json` 钉着旧的投影形状 ✓，跟着补了两处 ✓。
**第 280 轮**收的是 **`Date` 的九个日历格** ✓（`toISOString` ✓ / `toJSON` ✓ / `Date.UTC` ✓ /
七个 `setUTC*` ✓）。最值钱的一格是**逆变换** ✓（`DateDaysFromCivil` ✓，Hinnant 的
`days_from_civil` ✓）：`DateParts` 从第 138 轮起就给了**正向** ✓，而逆变换一直没有 ✗
⇒ `Date.UTC` 与七个 setter **全都落不下来** ✓。逆变换的 `Math.floor` 那三处是**路障** ✓
（负年份上写成截断会整整挪一个 400 年的纪元 ✓，而它只在「年份 ≤ 0」时才现形 ✗）。
**那一轮撞出一条静默的** ✗：第一版把这九格排在 `273..281` ✗，而 `280`/`281` 已经是
`ErrorCtor`/`TypeErrorCtor` ✓ ⇒ `Date.UTC(…)` 返回了一个 `TypeError` **对象** ✓
（分派表先问错误构造器那一支 ✓）——**号撞车是静默的** ✓，与第 150 轮
`ArrayAt = 22` 撞上 `ArrayFlat = 22` 是同一个形状 ✓。改到 `284..292` ✓ 就绕开了。
**第 279 轮**收的两条都是「**差最后一步**」✓：**数组迭代器的 `next()`** ✓
（**表示没动** ✗——返回的仍然是数组 ✓，改成「对象 + `next`」会把 `[...]` / `for..of` /
`Array.from` 一起弄坏 ✓；接上的办法是在那个数组上挂两格**隐藏属性** ✓：
游标 `__i` ✓ 与 `next` ✓）与 **`JSON.parse` 的 reviver** ✓（那一趟**自底向上** ✓，
顺带接上一条更基础的：**整棵树在这一次调用期间要锚住** ✓——回调里会分配 ✓，
锚在 `protos.WellKnownSymbols` 上并**存旧恢复** ✓，因为回调里再调一次 `JSON.parse` 是合法的 ✓）。
**第 278 轮**收的是**静态成员随继承走**（2 条，同一个根 ✓）：JS 的 `extends` 是**两步** ✓
（`B.prototype` 的链 ✓ **加** `B` 自己的链 ✓），本仓只做了前一步 ✗；
而静态成员里的 `super.x` 该从**父类构造函数**起读 ✓，本仓照实例那一支从父原型起 ✓。
**那一轮红过一次** ✗：`class E extends Error {}` 里父类是**宿主引用值** ✓
（`IsObject()` 是假 ✗），而 `set_proto` 原来**两边都要求是对象** ✓
⇒ 一条完全合法的 `extends` 被挡住 ✓（`runtime:check` 1 条 ✓、`runtime:cli` 2 条 ✓、
矩阵 3 条 ✓——**同一个根，四处同时报** ✓）。修法是把那两格**分开** ✓：
接收者仍然抛 ✓、原型不是对象时**不做事** ✓（JS 的口径 ✓）。
**第 277 轮**收的是 **`Symbol` 注册表 + `SyntaxError` 一族 + `Error.cause`** ✓：
`Symbol.for` / `keyFor`（注册表挂在 `protos.WellKnownSymbols` 上 ✓，键带 `for:` 前缀 ✓
——前缀就是「注册过」的判据 ✓）、`Symbol.prototype.toString`（**引擎特判那一支
第一次要交出一个可调用值** ✗ ⇒ 多一格 `DeclareSymbolToString` ✓）、
`SyntaxError`（第四个错误原型 ✓ + `GlobalNames` 补一个名字 ✓）、
`Error(msg, { cause })`（判据是「描述符里有没有 `cause` 这一格」✗，不是「第二个实参在不在」✓）。
**顺带量到一条更普遍的教训** ✗：**属性读有两条路** ✓——`a.x`（取值 ✓）与
`a.x()`（调用 ✓，那一处直呼 `GetProperty` ✓）——**一条判据写两遍就会一半对一半错** ✓。
**第 276 轮**收的是**描述符那一族五格** ✓（`Object.getOwnPropertyDescriptor` ✓ /
`defineProperties` ✓ / `seal` ✓ / `isSealed` ✓ / `isFrozen` ✓）。那一轮的账里有一处
**一条判据也推不出来、只能实测**的东西 ✗：**同一种「下标」在三种接收者上的描述符标志不一样** ✓
（数组元素三个全真 ✓、字符串下标不可写不可配置 ✓、`length` 又是第三种 ✓）——
所以规范里那三套标志都标着「实测」✓。
**第 275 轮**收的是 `Object.is`（**第三张判等表** `SameValue` ✓——与 `===` 差 `NaN` ✓、
与 `SameValueZero` 差 `±0` ✓，**两处都翻** ✓）· `Math` 十格 ✓ ·
`trimStart` / `trimEnd`（与 `trim` **共用一支** ✓）· `String.fromCodePoint` ✓
——标准库 84.4% → **87.7%** ✓。
**第 274 轮**收的是 **Array 那一族七格** ✓
（`findLast`/`findLastIndex` · `reduceRight` · `copyWithin` · `toSorted`/`toReversed`/`with` ✓）
外加**三处静默错值** ✗（`includes` 丢掉第二格实参 ✓、`flat(0)` 掉进 `depth || 1` ✓、
`Math.abs(-0)` 给 `-0` ✓）——标准库那一层 79.9% → **84.4%** ✓，**红的一栏没动** ✓。
**第 273 轮把矩阵从 275 条加宽到 395 条**：用户口径是「先按『普通 `.ts` 里会出现什么』
把 exec / runtime / 标准库 的语料铺满，再照覆盖度读数决定下一步」，所以那一天做的是
**先普查、再收编**——候选先逐条交给 `node`（裁判）与 `tsrun` 各跑一遍，只留裁判跑得动的；
**120 条里 83 条当场通过、37 条是新量到的缺口**，读数因此从 90.7% **落到 84.3%**
——那是**分母变诚实** ✓ 不是倒退 ✓（分母 +44%）。37 条按**根子**分成 15 组记在
[tests/coverage/expectations.mjs](tests/coverage/expectations.mjs)。
**后面每修好一处就顺手把它钉进矩阵** ✓（第 282 / 284 轮各加了一条就是 ✓）——
**修好的形状要有判据守着** ✓，否则下一次重构会静默地把它弄回去 ✗。
**前面几轮的格子**照旧：
第 246 轮补上了**「调一个不是函数的东西」要能被脚本接住**（那一抛带上 `TypeError` 类别 ✓）；
第 243 轮补上了 **`super.v`**（`RtOp.GetPropFrom`：起点 / 键 / 接收者三格 ✓）；
第 241 轮补上了 **`s.description`**（符号没有原型那一格 ⇒ 由 `get_prop` 特判 ✓）；
第 239 轮补上了**参数属性**（`constructor(public x: number)` ✓——原来是**静默错值** ✓））——
契约见 [docs/runtime-architecture.md](docs/runtime-architecture.md) 与
[docs/runtime-design-notes.md](docs/runtime-design-notes.md)——把 TypeScript 降级成 IR 执行，
同一份 `runtime/` 规范转成 C++ 就能嵌进客户的程序（不必依赖 wasm，也不必依赖 JS 引擎）。

**目录名不是命名空间**：`# namespace` 仍然是扁平的单个 `cangjie`，子层级只用目录表达——
所以 `typescript/tokens/class/class.xl.md` 里的类就叫 `Class`，不带 `Typescript.Tokens.Class` 这样的前缀。

## 构建链路

```
*.xl.md  --xl build-->  dist/ts/**/*.ts  --tsc-->  build/ts/**/*.js  --node-->  运行
```

```bash
npm install          # 只需要 @types/node 与 typescript
xl build             # 规范 → dist/ts/**/*.ts（增量；无改动时 skipped）
npm run compile      # dist/ts/**/*.ts → build/ts/**/*.js（tsc，strict）
npm run samples      # 三个样本与各自 *.expected.tsast.json 逐字节对照（命令行 = 库 API）
node build/ts/cjcli.js samples/hello.ts
node build/ts/tsrun.js tests/runtime/cases/01-values-and-operators.ts   # **直接执行 .ts**
```

**第二个命令行是 `tsrun`**：它把一份 `.ts` 装进执行侧那条真链路
（真解析器 → 降级 → IR → VM）跑一遍，**stdout 与 `node <文件.ts>` 逐字节相同**——
判据 `npm run runtime:cli` 就是这么比的（裁判是真 Node，语料在 `tests/runtime/cases/`）。
用法与约定见 [tsrun.xl.md](tsrun.xl.md) 的 `RunUsage`。

`npm run build` 是前两步的串联（`xl build && tsc`）。

**产物路径镜像规范路径**：`typescript/tokens/class/class.xl.md` → `dist/ts/typescript/tokens/class/class.ts`。

**打印出来的 XML 是缩进形态**：`cjcli` 走 `CommonUtil.FormatXml`——每个元素一行、按嵌套缩进两格，
只有文本没有子元素的**叶子**留在同一行（否则每个标识符都要占三行，反而更难读）。
缩进只动空白、不动任何标签或属性值；`Root.ToString()` 仍然返回**紧凑单行**形态，
测试与差分脚本用它。`samples/check.mjs` 比对前会把标签之间的空白去掉，所以两边的缩进怎么排都不影响判定。

**第二个出口是 AST JSON**（`cjcli <文件> --ast-json`）：形状照上游 Cangjie 的
`Token.ToDictionary` / `ToList`——顶层是数组、每个节点 `{ type, … , children? }`，
用 `ToList()` 装出来的节点（根那一层、以及 `For` / `Switch` 那些段数组里的）带 `[起始, 结束]` 的 `range`；
叶子写 `value`、有分段的节点（`For` / `Try` / `IfSegment` …）按段名给数组。
键名与值**一律以 XML 属性为准**（同名同值），所以两个出口说的一定是同一棵树；
规格与逐 token 字段表见 [docs/ast-json.md](docs/ast-json.md)。

**第三个出口是 TS 形状**（`cjcli <文件> --ts-ast`）：把同一棵树投成 **`ts.createSourceFile` 的形状**——
`kind` 用**名字**（`"VariableStatement"` / `"Block"`…）、每个节点带 `pos` / `end`、字段名按 TS 的叫法
（`statements` / `members` / `parameters`…），顶层就是那个 `SourceFile` 节点，可以直接和
`ts.createSourceFile` 的转储对拍 / `diff`。投影写在
[typescript/ts-ast.xl.md](typescript/ts-ast.xl.md)（模块级 `# const` / `# method`，逐个函数可读），
`unmapped`（投影没覆盖、原样透传的产物标签）走 **stderr**，所以 stdout 里只有形状本身。
规格见 [docs/ts-ast.md](docs/ts-ast.md)。
**第 77 轮起这个出口是逐节点的**（与另外两个出口同构）：`Token.PrintAst(ctx, v)` 是基类挂钩，
各 token 覆写自己那一格（`ToXmlString` / `ToDictionary` 是同一个组织方式），没覆写的走语言层的
通用支（换名 + 提层 + 字段名三张表）——**两条路的产物逐字节相同**，见 README 的「第 77 轮」。

**三个出口同源**：`CjcliParse` 造出根单元之后才分叉，XML / AST JSON / TS 形状看的是同一棵树，
结构上没有第二条解析路径。

改完规范之后，验收是这几步：

```bash
xl check                   # 结构与规则检查
npm run build              # xl build && tsc
npm run cases:check        # 用例体检（用例本身合不合格）
npm run samples            # 三份样本的 TS 形状夹具逐字节对照
npm run cases:tsast        # **主判据**：全语料逐文件与 ts.createSourceFile 对拍
npm run cases:tsast:cli    # 发布路径：真的开 cjcli 进程再对拍（慢，按需跑）
npm run runtime:check      # 执行侧：值模型 / 堆 / GC / IR / 执行器 / 降级层 的判据（快）
npm run runtime:cli        # **直接执行 .ts**：tsrun 与 node 逐字节对拍（真进程）
npm run coverage           # **场景覆盖度**：exec / runtime / 标准库 / 端到端，一格一条（尺子，不是门）
npm run coverage:sweep -- tmp-cand.mjs   # **加宽矩阵的第一步**：候选先普查（不写读数、不看台账、不红）
npm run cpp:check          # C++ 目标的产物自检（指纹 / include / 成员名 / 字面量）
```

**第 200 轮起测试集只留 AST 相关的这些**（用户口径）：

| 判据 | 命令 | 口径 |
| --- | --- | --- |
| TS 形状（库路径） | `npm run cases:tsast` | 逐节点对 `ts.createSourceFile`：kind / 区间 / 字段名 + 未映射 / 缺 range / 越界，**七条全 0 才绿** |
| TS 形状（发布路径） | `npm run cases:tsast:cli` | 每个文件跑一次 `cjcli --ts-ast`，拿 stdout 的 JSON 对拍（进程数 = 语料数） |
| 字节稳定性 | `npm run samples` | `samples/*.expected.tsast.json` 逐字节比（键序 / 坐标 / 序列化），并断言「命令行 = 库 API」 |
| 用例体检 | `npm run cases:check` | 用例文件本身合不合格（`xl:expect` 里的标签名有没有写错） |

原来的另外十七把尺子与探针（`diff` / `dashboard` / `matrix` / `lossless` / `structure` /
`boundaries` / `noise` / `astjson` / `shapelint` / `sweep` / `recon` / `recon2` / `fuzz` / `fuzz3` /
`align` 与 `tests/parse/` 下的调试脚本）**已删除**——它们量的是 XML 出口与 token 树的质量，
不属于「PrintAst 与 TS 的 AST 完全一致」这条判据。逐轮的读数与它们的口径留在
[docs/typescript-parsing-gaps.md](docs/typescript-parsing-gaps.md)（本 README 的轮次只记到第 82 轮）
与 git 历史里；那些**本轮之前**的章节引用到它们时，指的就是这些已删的脚本。

`tsconfig.json` 的 `include` 是 `dist/**/*.ts`、`rootDir` 是 `dist`，所以 `dist/ts/cjcli.ts` 落在
`build/ts/cjcli.js`——产物路径里的 `ts/` 来自**目标语言目录**，不是 `rootDir` 多出来的一层。
`exclude: ["dist/cpp"]` 是必要的：`dist/cpp/build/CMakeFiles/**/compiler_depend.ts` 是 CMake 的时间戳文件、
不是 TypeScript，`tsc` 一读它就报 `TS1127`。

生成物：`dist/ts/` 与 `build/ts/`，都在 `.gitignore` 里。

### 多目标

同一份规范同时面向多个目标语言，分工是：

| 目标 | 通道 | 谁生成 |
| --- | --- | --- |
| `ts` | 直出 | xl 的打印器，离线、确定性、字节稳定 |
| 其它（cpp / csharp / …） | 计划 | 生成器按 `xl_plan` / `xl_context` 给出的路径与结构契约产出，`xl_emit` 负责校验、盖产物头、归档旧版 |

- [docs/xl-to-cpp.md](docs/xl-to-cpp.md)：C++ 目标的生成规范（映射规则、部件划分、必读的编译陷阱）。
- [docs/cpp-design-notes.md](docs/cpp-design-notes.md)：C++ 目标上那些「只能这么写」的结构性取舍。
- [docs/ast-json.md](docs/ast-json.md)：token 树的**第二个出口**（AST JSON）的规格：形状、逐 token 字段表、
  与上游 Cangjie 的逐条差异，以及验收它的尺子。

## 类型约定

规范里的签名只用**中立类型**：`int` / `string` / `bool` / `void` / `Array<T>` / `Map<K, V>` / `T | null` /
函数类型（`(item:T)=>bool`）/ 类类型 / 泛型参数。不放任何目标语言专有的写法——签名是要喂给多个打印器的。

两条具体的克制：

- **`# type` 的等号右侧是原文**，会被原样搬进产物。所以它只用来写**函数类型别名**
  （`# type ItemModifier = (item:any)=>void`）。不要用它写对象字面量或字符串字面量联合——
  那种写法等于把某个目标语言的语法钉进规范里。
- **`any` 是唯一的例外**，只出现在「宿主环境的动态值」这一类位置：异常的内层异常、
  `RuntimeObject` 的值、`SyntaxContext` 的变量表、`cjcli` 里取 Node 内建模块的返回值。
  语言层的结构一律用具体类型或 `T | null`。
- **token 树的第二个出口是 AST JSON**（`ToDictionary` / `ToList`，见 [docs/ast-json.md](docs/ast-json.md)）。
  这一条**改掉了原先「token 树只产出 XML」的口径**：上游 Cangjie 的 `Token` 本来就同时有
  `ToXmlString` 与 `ToDictionary` / `ToList`，而下游（IDE、工具链）要的是 JSON。
  代价如实记在这里：这两个方法返回 `Map<string, any>` / `Array<any>`，
  对多语言目标是负担（C++ / C# 侧要么用 `std::any` / `object`，要么就是「另一个目标的活儿」）。
  换来的是两个出口**同源**——`ToDictionary` 就是「这个节点在 XML 里的标签名与属性，加上子单元」，
  而 `Map` → 普通对象那一步由 `Token.ToJsonString` 收在一处（`JSON.stringify` 对 `Map` 静默给 `{}`，
  这是必须显式处理的一步，不是风格问题）。
- **token 树的第三个出口是 TS 形状**（`typescript/ts-ast.xl.md` 的 `projectRoot` / `ToJsonText`，
  见 [docs/ts-ast.md](docs/ts-ast.md)）。这一条**改掉了原先「除此之外的运行时代码里不再有别的投影」**
  这句口径：投影原来只活在测试侧（`tests/parse/ts-shape.mjs` 那 2464 行 JS），
  于是「投影的账」与「运行时的账」可以各算各的；现在投影搬进规范、只有一份实现，
  `cjcli --ts-ast`、`cases:tsast` 与 `samples` 的第三份夹具量的都是它。
  这份实现是**逐字搬家**（连空白都一样），等价性用一次性尺子在全语料上逐字节对拍过
  （1399 个文件、0 处不一致，见台账第 75 轮），它的类型标注是文档、产物带 `// @ts-nocheck`
  ——理由写在规范文件里（`strict` 下那一百多处报错都是「把 JS 的写法改成 TS 的写法」，
  那是改写，不是搬家）。
  代价与 AST JSON 那一支同源：投影层是 `Map<string, any>` / `any` 上跑的，
  C++ 目标要面对同一笔账（比如 `NUMERIC_LITERAL` 的 `RegExp`）。

## 解析优先级在哪

token 层的公共契约——**跳转优先级**与**重组优先级**——只在
[typescript/parse-pipeline.xl.md](typescript/parse-pipeline.xl.md) 里：

- `ParsePipeline.CreateGeneralQueue()`：每处理一个字符，按这个顺序问每个 `Branch` 要不要接手；
- `ParsePipeline.GeneralReorganize`：每个单元关闭时，按这个顺序把子单元合并成更高层结构；
- `ParsePipeline.Install(template)`：往模板上装这两张表**与语言配置**（关键字表、禁用方法名表）。
  `TextContext` 构造时调它，所以调用方只需要 `new Template()`。

要看「这个语言的解析优先级是什么」，读这一个文件就够了；新增 token 的改动点也在这里。
队首是声明层、队尾是关键字兜底，**顺序本身就是语义**：

```text
Decorator → Class → Function → Enum → MethodDeclaration → Label → Let → Field → New → Method → …
… → TypeAssign → Lamda → TypeDefine → Ternary → Try → Switch → IfSet → For → Foreach → While → …
… → LineWrap → CompoundAssignment → NotNull → Keyword
```

## 支持的语法构造

产物是 XML，**标签名就是 token 的类名**（`ToXmlString` 取 `this.constructor.name`），属性名一律 lowerCamelCase，
且与规范里那个 class 属性**同名**。

| 构造 | 产物 | 属性 |
| --- | --- | --- |
| `class A<T = {}> extends B implements C, D { … }` | `<Class>` + `<ClassBody>` | `name` `extends` `implements` `modifiers` |
| `interface I<T = {}> extends A, B { … }` | `<Interface>` + `<InterfaceBody>` | `name` `extends` `export` |
| `namespace N { … }` / `module M { … }` / `declare global { … }` | `<Namespace>` + `<NamespaceBody>` | `namespace` `modifiers`（`export` / `declare`） |
| `function f<T>(x: T): U { … }` / `declare function f(): void` | `<Function>` + `<FunctionBody>` | `name` `modifiers` |
| 类/对象成员 `m<T>(x): U { … }` | `<MethodDeclaration>` + `<MethodBody>` | `name` `modifiers` |
| `class A { m<T>(x): U { … } }` / 接口与类里的成员签名 `m?(x): U;` | `<MethodDeclaration>`（**签名没有 `<MethodBody>`**） | `name` `modifiers` |
| 成员字段 `private n = 1` / `readonly name: string` / `count?: T[]` | `<Field>` | `name` `modifiers` |
| 返回类型段（`function` / 方法 / 箭头函数） | `<ReturnType>` | — |
| `enum Color { … }` / `const enum Flag { … }` | `<Enum>` + `<EnumBody>` | `name` `modifiers` |
| `switch (x) { case 1: … default: … }` | `<Switch>` `<SwitchCompare>` `<SwitchSegment key>` `<SwitchCase>` `<SwitchStatement>` | — |
| `@Component({…})` | `<Decorator>` | `name` |
| `outer:` | `<Label>`（自闭合） | `label` |
| `let` / `const` / `var`（含解构，绑定名**递归**收集） | `<Let>`（自闭合） | `fieldName` / `arrayPattern` / `objectPattern` |
| `if` / `for` / `foreach` / `while` / `do…while` / `try` | `<IfSet>` `<For>` `<Foreach>` `<While>` `<DoWhile>` `<Try>` 及各自的分段 | 见各自文件 |
| `name(...)`（调用）/ `name: Type`（类型标注） | `<Method>` / `<TypeDefine>` | `name` |
| `expr as T` / `expr satisfies T`（同级左结合的两种类型运算） | `<As>` / `<Satisfies>`（运算符后面的类型装在里面，运算符词本身不进产物——与 `<As>` 既有口径一致） | — |
| **函数类型**（类型位的 `(a: A) => B` / `new () => A` / `abstract new () => A` / `<T>(a: A) => B`） | `<FunctionType>`（形参括号 + `=>` + 返回类型；`new` / `abstract new` 也装在里面） | — |
| **条件类型**（`T extends U ? A : B`） | `<ConditionalType>`（条件、`extends`、真分支、`?`、假分支、`:` 全在里面；**类型位**的它不会落成 `<TernaryOperator>`） | — |
| **联合 / 交叉类型**（`A \| B`、`A & B`，含前导 `\|` 的多行写法） | `<UnionType>` / `<IntersectionType>`（`&` 比 `\|` 紧：`A & B \| C` 收成 `UnionType(IntersectionType(A & B) \| C)`） | — |
| **数组 / 元组 / 下标访问类型**（`T[]`、`[A, B]`、`T[K]`） | `<ArrayType>` / `<TupleType>` / `<IndexedAccessType>`（那对方括号本身不进产物，与 `ObjectLiteral` / `ArrayLiteral` 同一口径） | — |
| **类型运算符**（类型位的 `keyof T` / `readonly T[]` / `unique symbol`） | `<TypeOperator>`（运算符词与它的操作数都在里面，与 `UnionType` 里那个 `\|` 符号同一口径） | — |
| **类型参数**（`<T extends X = Y>`、映射键 `[K in T]`、`infer X` 里的那个名字） | `<TypeParameter>`（名字 + `extends` 约束 + `=` 默认值都在里面；泛型段的外层仍是 `<GenericType>`） | — |
| **推断类型**（条件类型里的 `infer X` / `infer X extends Y`） | `<InferType>`（里面配一个 `<TypeParameter>`——与 TS 的 `InferType > TypeParameter` 一对一） | — |
| **类型谓词**（`x is T` / `this is T` / `asserts x is T` / `asserts x`） | `<TypePredicate>`（`asserts`、参数名、`is`、类型都在里面；谓词里的类型照常成形） | — |
| **元组成员**（`[A?, ...B, name: D?, ...rest: E[]]`） | 可选元素 `<OptionalType>` / 变长元素 `<RestType>` / 具名元素 `<NamedTupleMember>`（**普通元素不给节点**——与 TS 一致） | — |
| **枚举成员**（`enum E { A = 1, B }`） | `<EnumMember>`（名字与初始化式都在里面；逗号留在外面、属于枚举声明） | — |
| **索引签名**（`{ [k: string]: T }` / `readonly [k: symbol]: T`） | `<IndexSignature>`（参数名、参数类型、值类型都在里面；方括号按 `ArrayType` 的先例消费掉，参数那一截收成一个 `<Parameter>`） | — |
| **形参**（`function f(a: A)` / `m(a: A)` / `(a: A) => B` / `(a: A): T` / `new (a: A): I` / 箭头函数的 `(a, b)`） | `<Parameter>`（与 TS 一致：形参一律同一个标签，不分函数 / 方法 / 箭头 / 签名；索引签名里的参数也是它） | — |
| **继承段**（`class C extends B implements I, J` / `interface K extends L<M>, N`） | `<HeritageClause>` + `<ExpressionWithTypeArguments>`（子句词、逗号与每个实体名都在里面；类表达式与括号化继承表达式同样收） | — |
| **解构绑定**（`const { a, b: c, d = 1 } = x` / `[x, , y, ...rest]` / `f({ p, q })` / `catch ({ message })`） | 元素各一个 `<BindingElement>`（模式本身是 `<ObjectLiteral>` / `<ArrayLiteral>`——TS 的 `ObjectBindingPattern` / `ArrayBindingPattern` 同形；`b: c` 是重命名、不产 `TypeDefine`） | — |
| **括号类型**（类型位的 `(A \| B)` / `((a: A) => B)`） | `<ParenthesizedType>`（括号本身属于这个节点，与 TS 一致；值位的括号不受影响） | — |
| **类型查询**（类型位的 `typeof x`） | `<TypeQuery>`（值位的 `typeof x` 仍是 `<UnaryOperator op="typeof">`；已经折成一元运算的那种壳会被换掉） | — |
| **字面量类型**（`"a"` / `1` / `0x10` / `true` / `null` / `-1`） | `<LiteralType>`（字面量本身作为子单元；带符号数字把 `-` 与数字一起收进来。十进制 / 十六进制 / 二进制 / 八进制 / 指数 / 数字分隔符 / `BigInt` 都认） | — |
| **模板字面量类型**（`` `a${X}b` ``） | `<String interpolation="true">` + `<InterpolationString>`（插值段的类型文本照常成形：联合 / 交叉 / 下标访问……） | — |
| **映射类型**（`{ [K in T]: X }`，含 `readonly` / `-readonly` / `+?` 修饰与 `as` 键重映射） | `<MappedType>`（内容直接装在节点下：`[K in T]` 与值类型各成形；索引签名 `{ [k: string]: X }` 仍是 `<TypeLiteral>`） | — |
| `type X = { a: number }` / `let x: { m(): void }`（**类型位**的对象类型） | `<TypeLiteral>` + `<TypeLiteralBody>`（成员是 `Field` / `MethodDeclaration` / `Signature`） | — |
| `interface I { (a: number): string }` / `new (a: number): I` / `abstract new (a: number): I` | `<Signature kind="call">` / `<Signature kind="construct">`（`abstract` 作为签名的第一个子单元收进来） | `kind` |
| `import('./m').A` / `typeof import('./m')`（类型位） | `<ImportType>`（`typeof` 与限定名尾巴都在里面——与 TS 的 `ImportType` 一对一；**值位**的动态 `import()` 仍是 `<Method name="import">`） | — |
| 泛型实参段与类型参数段（`Array<T>` / `<T extends X = Y>`） | `<GenericType>`（**实参段**；**参数表**在它里面再收成 `<TypeParameter>`） | `startBracket` `endBracket` |
| 字符串（常量 / 内插 / 逐字 / 原始 / 模板） | `<String>` + `<ConstString>` / `<InterpolationString>` | `interpolation` `verbatim` `raw` `interpolationCount` `rawQuoteCount` |
| `async` / `await` / `return` / `throw` / `readonly` … | `<Keyword>` | — |
| `class C { static { … } }`（类静态块） | `<StaticBlock>`（体内的语句；花括号本身不进树，与 `FunctionBody` 同款） | — |
| `export as namespace Foo` | `<NamespaceExport>`（自闭合，与 `Label` / `Let` 同款） | `name` |

`modifiers` 是声明前面那一串修饰词按源码顺序 `join(",")`（`export` / `declare` / `default` / `abstract` /
`async` / `public` / `private` / `protected` / `static` / `readonly` / `override` / `accessor` / `get` / `set` / `const`）。

### 叶子标签的名字

三个「字面量块」原先叫 `Common` / `Symbol` / `WrapSymbol`——名字说的是**实现**（通用字符块、符号块、包装符号），
不是**语义**。现在按它到底是什么命名，下游（差分脚本、多语言目标）读产物时不必先查表：

| 旧标签 | 新标签 | 是什么 |
| --- | --- | --- |
| `<Common>` | `<Identifier>` | 标识符与数字、布尔字面量的文本块（`<Identifier>0</Identifier>` 就是数字 `0`） |
| `<Symbol>` | `<SymbolToken>` | 符号块：运算符、标点、括号字符 |
| `<WrapSymbol>` | `<LineWrap>` | 软换行，**不是符号**：它不吐文本，只是相邻判定的透明单元 |
| `<JsonObject>` | `<ObjectLiteral>` | 值位的对象字面量 `{ … }` |
| `<JsonArray>` | `<ArrayLiteral>` | 值位的数组字面量 `[ … ]` |
| `<Temp>` | **删除** | 这个类没有任何 `new Temp(` 被创建过，是死代码 |

`Bracket`（`( )` / `{ }` / `[ ]` 三种括号共用）与 `Keyword`（关键字兜底身份）保留原名：它们说的就是自己的语义。

[samples/declarations.ts](samples/declarations.ts) 把上表逐项走了一遍，产物是
[samples/declarations.expected.xml](samples/declarations.expected.xml)。

## 设计约定

写新 token 或改解析顺序时要守的几条（都是这个项目自己的约定，不是风格偏好）：

- **节点名就是 XML 标签名**：`ToXmlString` 覆写里取的是 `this.constructor.name`，
  所以 `Class` / `Enum` / `IfSegment` 这些类名不能随便改；反过来，重组规则类（`*Reorganization`）不进树、不进 XML，
  名字随便取。
- **嵌套类必须写在外层类之前**：外层类的静态字段（`JumpIn` / `AppendIn` / `Instance`）在类定义时就
  `new` 那个嵌套类，写反了会命中暂时性死区（TDZ）。
- **软换行是独立单元**（`LineWrap`，产物里的 `<LineWrap />`），靠「跳过它」与「最后摘掉它」两步处理：
  相邻判定一律走 `SkipNextWrapSymbol` / `SkipPreviousWrapSymbol`——这两个**函数名**里的 `WrapSymbol`
  是历史包袱（那个类现在叫 `LineWrap`），函数名本身没跟着改，因为它牵动两百多处调用点、且不影响产物。
- **声明头先认领、`Keyword` 兜底**：`class` / `function` / `switch` 这些词要先被各自的上下文规则吃掉，
  剩下的散词才升级成 `Keyword`（所以 `Keyword` 排在重组队列的最后）。
- **`{ }` 括号不跑重组队列**：类体 / 函数体 / 循环体里的内容，是各段 token（`ClassBody` / `FunctionBody` /
  `ForBody`…）在构造时挂上语句队列之后才成形的。
- **一行的边界要显式收**：声明规则的范围**只到自己最后一个单元为止**，尾随软换行留在父单元里——
  那道换行就是语句边界（`SearchFrontIndexed` 往回找语句头时的「墙」），
  收进声明范围会让下一行被并进同一条语句。空 `<Statement>` 由语句重组自己的早退挡掉
  （见 [typescript/tokens/declaration-common.xl.md](typescript/tokens/declaration-common.xl.md) 里
  「一个已经删掉的收尾口径」那一节）。

## 已知缺口

> 判据只有**六道门**（`runtime:check` / `runtime:cli` / `cases:tsast` / `samples` / `cases:check` /
> `coverage` ✓，一次跑完是 `npm run gates` ✓）。更早那十七把尺子 / 探针
> （`diff` / `matrix` / `lossless` / `structure` / `boundaries` / `astjson` / `sweep` / `recon*` / `fuzz*` /
> `align` …）**已随测试集收窄删除** ✓，逐轮的读数留在
> [docs/typescript-parsing-gaps.md](docs/typescript-parsing-gaps.md) 与 git 历史里 ✓。
> 这一节写**当前**的判据与状态 ✓。

**主判据：与 `ts.createSourceFile` 逐节点对拍**：

| 命令 | 口径 |
| --- | --- |
| `npm run cases:tsast` | 逐节点比 **kind / 区间 / 字段名**；未映射（透传进产物的标签）/ 缺 range / 区间越界也一并判绿，**七条全 0 才退出码 0** |
| `npm run cases:tsast:cli` | **发布路径**：真的开 `cjcli <文件> --ts-ast` 进程，拿它 stdout 的 JSON 与 `ts.createSourceFile` 对拍（全语料，按需跑） |
| `npm run samples` | 三份样本的 `*.expected.tsast.json` **逐字节**比（键序 / 坐标 / 序列化），并断言「命令行 = 库 API」 |

产物标签名直接比只有 **44.6%**——本工程的标签本来就不是 TS 那一套；**投影成 TS 形状之后**按
**逐文件完全一致**算：**用例语料 1037 / 1037** ✓（四个方向 + 未映射 + 缺 range + 越界全 0 ✓）、
**真实语料 406 / 414** ✓（剩下七份的逐条差额见 `node tests/parse/ts-ast.mjs real --per-file` ✓）。

它原来是红的，红的不是解析出错，而是**产物的节点集合与 TypeScript 不是同一套**：语句 / 声明壳
（`VariableDeclarationList` / `VariableStatement` / `ExpressionStatement` / `Block`）、
类型引用（`TypeReference` 在 TS 那边是**同一区间两层节点**）、
以及叶子按值分名（`NumericLiteral` / `StringLiteral`）。第 181 轮把这些一层层补完，
第 182~198 轮把投影从 `typescript/ts-ast.xl.md` 逐块搬进各 token 的 `PrintAst`，
此后每一轮都在同一把尺子上记读数（**逐轮的账**在
[docs/member-layer-plan.md](docs/member-layer-plan.md) 与
[docs/typescript-parsing-gaps.md](docs/typescript-parsing-gaps.md) ✓，本节只写**当前**状态）。

### 当前状态（第 587 轮实测）

| 判据 | 结果 |
| --- | --- |
| `cases:tsast`（用例语料） | **1037 / 1037**，四方向 0、未映射 0、缺 range 0、区间越界 0 |
| `cases:tsast`（真实语料） | **406 / 414**（缺 126 / 漂 37 / 多 91，七份红） |
| `cases:tsast:cli` | 发布路径（慢，按需跑）：开 `cjcli … --ts-ast` 进程逐文件对拍，与库路径同一条口径 |
| `samples` | hello / declarations / generic 三份 TS 形状夹具**逐字节**一致，且「命令行 = 库 API」 |
| `cases:check` | **1050** 条用例，0 条不合格 |
| `runtime:check` | **242 / 242** |
| `runtime:cli` | 直接执行 `.ts`：**79 / 79** 份与 `node` 逐字节相同 |
| `coverage` | **1666 / 1713**（96.9%）：引擎 97.6% / 降级 96.8% / 标准库 97.8% / 端到端 95.2% |
| `npm run gates` | 上面六道一次跑完（实测墙钟 **~20s**） |

**语料数是活的**：`dist/ts/**` 也在语料里（[ts-ast.mjs:423](tests/parse/ts-ast.mjs#L423)），
所以具体数字只是**本轮读数**，判据本身是「**用例语料全部一致、真实语料逐文件对拍**」。

结构性缺口（**只剩这些，且都是「标签表表达不了」或语言配置**）：

- **类型层已经补了九块**（第 54 轮：**函数类型**；第 55 轮：**条件类型**；
  第 58–59 轮：**联合 / 交叉**；第 60 轮：**映射类型**；
  第 66 轮：**方括号三种 + 类型运算符 + 类型查询 + 字面量类型 + 模板字面量类型**，
  续批又补上 **导入类型 + 类型参数 + 推断类型**；
  第 67 轮：**括号类型里的类型文本 + 空元组**）：
  类型位现在有 `TypeDefine` / `GenericType` / `TypeLiteral` / `Signature` /
  `FunctionType`（4226 处）/ `ConditionalType`（183 处）/ `UnionType` + `IntersectionType`（8680 处）/
  `MappedType`（36 处）/ `ArrayType` + `TupleType`（含空元组 `[]`）+ `IndexedAccessType` /
  `TypeOperator`（`keyof` / `readonly` / `unique`）/ `TypeQuery`（类型位的 `typeof`）/
  `LiteralType`（全语料 13110 处）/ `ImportType`（类型位的 `[typeof] import("m")[.A.B]`）/
  `TypeParameter`（泛型参数表与映射键）/ `InferType`（`infer X [extends Y]`，含 `(infer U)` 那种括号里）/
  模板字面量类型的插值段（联合、交叉、下标访问都成形）。
  **这一层的净额是 0**：与 `ts.createSourceFile` 逐节点比，类型的每一种构造都对得上
  （见 `docs/typescript-parsing-gaps.md` 第 54~67 轮那一串读数）。
- **`Label` 只是标记节点**，不包含它标的那条语句（产物形如 `<Label label="outer" /><While>…</While>`）：
  标签规则必须排在 `TypeDefine` 之前，那时后面那条语句还没成形，认不出边界。
- **ASI 是按形状预判的**：判据在 [typescript/tokens/statement.xl.md](typescript/tokens/statement.xl.md) 的
  `Statement.IsLineBreakBoundary`（前一个单元不再要操作数、后一个单元也不能续接 ⇒ 断句，
  加上 `return` / `throw` / `break` / `continue` / `yield` 与后缀 `++` / `--` 的受限产生式）。
  规范里 ASI 还有一条「**语法不允许时**才插分号」，本工程不看完整文法、只看形状，
  所以个别极端排版仍可能与 TS 不同——这类情况由 `cases:tsast` 巡检（它比的是与 TS 的 AST
  逐节点一致，真实语料那 8 份红的就在这一栏里）。
- **JSX / TSX** 没有支持（四个 `.tsx` 用例只钉住「不抛异常 / 不吞掉后面的代码」）。
  这是**独立于 TypeScript 的语法扩展**，不在 `.ts` 范围内。
- **嵌套解构的绑定名进的是同一张逗号分隔表**（`arrayPattern`），丢的是**结构**而不是名字：
  `const [[a, b], [, c = 0]] = m` 记成 `a,b,c,0`。
- **`<RegexToken>` 是空标签**：正则正文与标志在单元的 `Temp` / `Flags` 字段上、刻意不渲染进 XML
  （见 [typescript/tokens/regex-token.xl.md](typescript/tokens/regex-token.xl.md)）。
- **语言配置带来的两处差异**（不是解析器缺陷，是这套语言这么定义）：
  `\a` 解成响铃字符而不是字母 `a`；`@'…'` / `@"…"` 是逐字字符串前缀、不是装饰器。
- **块与表达式之间没有分隔符时**（`{ A }a += 1`：块紧跟着表达式，中间既没有 `;` 也没有换行），
  产物里块与后一条语句仍然**并进同一个 `<Statement>`**（与 TypeScript 的「两条语句」不一致）——
  这一条在 token 树（XML）上仍然是缺口，但**投影到 TS 形状时按 TS 的划分出节点**，
  所以 `cases:tsast` 是绿的（形状那一层已经对了，token 树那一层没动）。
  **第 63 轮修掉了其中更严重的一半**：复合赋值的展开原来会**再克隆一份那个块**
  （`<Bracket>{ A }</Bracket> a = <Bracket>{ A }</Bracket> + 1`）——那是**凭空多出内容**，
  根因是 `SearchFront` 的起点判据写成了 `startBracket === "}"`（块语句的起点是 `{`，
  一个都匹配不上，于是 `front` 退化成整个前缀）。改成 `endBracket === "}"` 之后
  克隆的只有目标那一段 ✓，剩下的只是「两条语句被并进一个 `<Statement>`」这一条边界口径。
  **不再抛异常**（第 52 轮之前这里直接抛「没有父单元」整份文件解析失败）。
  第 63 轮还试过把块当语句边界（`StatementReorganization2.Previous`），
  结果复合赋值的展开被切断、**整段内容丢失** ✗——比边界不合严重，已退回；
  两条形状已经收进用例语料（`tests/parse/cases/**`）。

---

> **逐轮的账不写在这里** ✓：规范、判据、每一轮的根因 / 修法 / 读数都在
> [docs/member-layer-plan.md](docs/member-layer-plan.md)（token / 投影 / AST 那一条线）与
> [docs/typescript-parsing-gaps.md](docs/typescript-parsing-gaps.md)（历史缺口台账）里 ✓，
> 本文件只留**现状**与**怎么改** ✓。

### 实测规模

`node_modules` 下 226 个真实 `.d.ts` + 本项目产物 `dist/ts/**` + 1037 条用例
——`cases:tsast` 的语料就是这一份（用例语料逐文件完全一致 ✓，真实语料 **406 / 414** ✓）。
TypeScript 自带的那份 8MB **打包 JS**（`typescript.js`）仍会在个别
JavaScript 专有形状上抛内部错误——那是 JS 而不是 TypeScript，不在当前范围内。

## cjcli

[cjcli.xl.md](cjcli.xl.md) → `dist/ts/cjcli.ts` → `build/ts/cjcli.js`。它是命令行入口，不属于语法层本体。

**产物是自执行的**：`cjcli.xl.md` 末尾的 `# statement` 段把 `Main(process.argv.slice(2))` 原样写进产物，
所以 `node build/ts/cjcli.js` 直接就是命令行工具——没有加载器、没有包装进程、没有第三方运行时。

```
cjcli <文件>              解析源文件，缩进 XML 打到标准输出
cjcli <文件> -o <文件>    解析后写入指定文件（同一份缩进文本）
cjcli <文件> --ast-json   解析后把 AST JSON（紧凑单行）打到标准输出
cjcli <文件> --ts-ast     解析后把 TS 形状 JSON（紧凑单行）打到标准输出
cjcli                    从标准输入读源码
cjcli -h, --help         打印本说明
cjcli -v, --version      打印版本
```

退出码：`0` 成功；`1` 表示用法错误 / 读不到文件 / 解析抛错。

```bash
node build/ts/cjcli.js samples/hello.ts
echo "let x = 1" | node build/ts/cjcli.js
node build/ts/cjcli.js samples/hello.ts -o out.xml
node build/ts/cjcli.js samples/hello.ts --ast-json -o out.json
node build/ts/cjcli.js samples/hello.ts --ts-ast > out.tsast.json
node build/ts/cjcli.js samples/hello.ts --ts-ast | node -e "..."   # 直接喂给 diff / 对拍脚本
```

`--ast-json` / `--ts-ast` 换的是**出口**不是解析：`CjcliParse` 造出根单元之后才分叉，
三个出口看的是同一棵树（`CjcliParseXml` 取 `ToXmlString()`、`CjcliParseAstJson` 取 `ToJsonString()`、
`CjcliParseTsAst` 取 `ToJsonText(projectRoot(Root.ToList(), 原文))`）。
两个 JSON 出口都不经过 `CommonUtil.FormatXml`——那个函数只认 XML。
两个开关同时给时以 `--ts-ast` 优先（同一个位置的两种形状，不是可以叠加的东西）。

## 样本验收

[samples/check.mjs](samples/check.mjs)：`samples/*.ts` 与同名 `*.expected.xml` / `*.expected.ast.json`
/ `*.expected.tsast.json` 对照（三个出口各一份夹具）。

```bash
npm run samples                 # 比对，全部一致时退出码 0
node samples/check.mjs --update # 用当前产物重写夹具
```

XML 夹具是**紧凑单行**（`--update` 写的是归一化之后的那一份，不是 `cjcli` 打出来的缩进形态）。
`normalize()` 在比对前把标签之间的空白全部去掉，所以判据是「标签、属性、文本内容是否逐字节相同」，
**缩进怎么排不参与判定**；
属性值里的空白不受影响（`CommonUtil.XmlDecode` 把换行 / 制表符都写成了 `\n` / `\t` 转义）。
两端都在文件层读写、不经过控制台编码，中文注释不会在比对里被搅坏。

两个 JSON 夹具（AST JSON 与 TS 形状）都**逐字节比、不做归一化**：它们本来就是紧凑单行，
键序由规范里的 `result.set(...)` 顺序（或字段赋值的顺序）决定、`range` / `pos` 由源码下标决定，
都是确定性的——归一化只会把「键序变了」这类漂移盖掉。

**同一份比对还顺带钉住了「入口」**：脚本除了跑 `cjcli` 进程，也用库 API 解析同一份源码
（`new TextContext(...).Process(...)` → `Root.ToXmlString()` / `Root.ToJsonString()` /
`ToJsonText(projectRoot(...))`），断言两条路**逐字节相同**
（`[XML]` / `[AST JSON]` / `[TS 形状]` 那三行之外，`ENTRY` 一行就是这条断言）。
少了它，「库对了、命令行打歪了」没有任何尺子看得见——`cases:astjson` 只走库 API。
TS 形状那一支尤其要这一条：`ToJsonText` 是 `cjcli` 与这个脚本**共用**的同一个函数，
两边不是各写一遍对齐的。

[samples/diag.mjs](samples/diag.mjs) 打印完整的诊断链：`cjcli` 只打最外层 `SyntaxException` 的位置，
真正的原因在内层异常里（`Token.Process` 会把任何异常包一层，可能包好几层）。

## 为什么留了一个 `bin/cjcli.js`

整条链路上 xl 表达不了的只有 **shebang** 一行：

- `# statement` 能把执行语句写进产物，但插不进 shebang——产物前三行永远是 xl 的产物头，
  而 `tsc` 只认**文件第 1 行**的 `#!`（放别处直接 `error TS18026`，tsc 还会把它编译成垃圾）。
- `package.json` 的 `bin` 需要第 1 行是可执行解释器行，所以它落在 [bin/cjcli.js](bin/cjcli.js)：
  `#!/usr/bin/env node` + `require("../build/ts/cjcli.js")`。它不含任何逻辑。

不需要 shebang 的话（例如只用 `node build/ts/cjcli.js`），把 `bin` 直接指到 `build/ts/cjcli.js` 也行。
检出时必须保持 LF：仓库根的 `.gitattributes` 用 `* text=auto eol=lf` 钉死了。

## 改这个项目

- 规范是 `*.xl.md`：`# dependencies` 写依赖、`# namespace` 之后是声明。
  **散文解释「为什么」**，代码块就是产物本身，标题行（`# class` / `## method` / `## field`）就是签名契约——
  改标题等于改 API。
- **XML 属性名就是从 class 属性名来的**：`Class` 上那个 `name` 属性的值，就是产物里 `name="…"` 的值。
  所以想改产物上的属性名，就改规范里的字段名与 `ToXmlString` 里那处拼串，两处必须一起动——
  只在拼串里改名，会留下 `this.FieldName` 与 `name="…"` 对不上的产物。
- 改完跑这几步（第 200 轮收窄后的全部判据）：

  ```bash
  xl check                     # 结构与规则检查（应该是 0 error / 0 warning）
  npm run build                # xl build && tsc
  npm run samples              # TS 形状夹具逐字节对照；产物本该变化时用 -- --update 重写夹具
  npm run cases:check          # 用例体检
  npm run cases:tsast          # **主判据**：与 ts.createSourceFile 逐节点对拍（七条全 0）
  npm run cases:tsast:cli      # 发布路径那一把（慢，改到 cjcli / 序列化时才需要）
  ```

  动了**投影的键序或坐标**时，`samples` 是唯一看得见的那把尺子（`cases:tsast` 只比
  kind / 区间 / 字段名）；动了 token 层时反过来，`cases:tsast` 会告诉你形状还对不对。

- **一轮一提交，提交完就推**：一轮的改动跑完尺子之后
  `git commit` + `git push origin main`，提交信息按轮次写
  （`feat(ts-shape): …（第 N 轮）—— 量化`，正文写根因 / 修法 / 数字）。
  攒着不提交的话，「哪一轮把哪个数字动了」在 `git log` 里就查不到了。

- **临时脚本与它们的输出不进仓库**：排查用的一次性脚本、`tmp-*` 输出、
  `dist/` / `build/` / `.xl` 都不提交（后者由 `.gitignore` 挡着）。
  仓库根目录历史上堆过 47 个临时脚本，所以这条是硬规矩：**能复现的才进仓库**
  （进仓库的形态是尺子或用例，不是某次排查的脚本）。

- **改「谁吃掉换行」之前先读 `declaration-common.xl.md` 里那一节**：
  本工程的 `LineWrap` 不只是排版，它还是语句边界本身。历史上 `DeclarationEnd`
  就是因为「吃掉它」而制造了一整类语句合并缺口。

- 产物头里的 `xl:sha256` 是源指纹：规范一变，产物就会重新生成。
