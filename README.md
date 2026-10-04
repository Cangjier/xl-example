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
判据见 `npm run runtime:check`（227 条）与 `npm run runtime:cli`（67 份语料）；
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

> **第 200 轮起测试集只留 AST 相关的判据**（`cases:tsast` / `cases:tsast:cli` / `samples` / `cases:check`，
> 见文首「验收是这几步」）。缺口台账（`tests/parse/known-gaps.json`）与另外十七把尺子 / 探针
> （`diff` / `dashboard` / `matrix` / `lossless` / `structure` / `boundaries` / `noise` / `astjson` /
> `shapelint` / `sweep` / `recon` / `recon2` / `fuzz` / `fuzz3` / `align`）随它们量的那个出口一起删了；
> 逐轮的读数留在 [docs/typescript-parsing-gaps.md](docs/typescript-parsing-gaps.md) 与 git 历史里。
> **下面从「第 50 轮」往后的章节是历史台账**，里面引用的尺子与探针即指这些已删的脚本。
> 这一节先写清**当前**的判据与状态。

**主判据：与 `ts.createSourceFile` 逐节点对拍**（第 181 轮缺口归零，第 199 轮把三栏「地基」并进退出码）：

| 命令 | 口径 |
| --- | --- |
| `npm run cases:tsast` | 逐节点比 **kind / 区间 / 字段名**；未映射（透传进产物的标签）/ 缺 range / 区间越界也一并判绿，**七条全 0 才退出码 0** |
| `npm run cases:tsast:cli` | **发布路径**：真的开 `cjcli <文件> --ts-ast` 进程，拿它 stdout 的 JSON 与 `ts.createSourceFile` 对拍（全语料，按需跑） |
| `npm run samples` | 三份样本的 `*.expected.tsast.json` **逐字节**比（键序 / 坐标 / 序列化），并断言「命令行 = 库 API」 |

产物标签名直接比只有 **44.6%**——本工程的标签本来就不是 TS 那一套；**投影成 TS 形状之后是 100%**：
语料 1436 份（`dist/ts/**` 也在语料里，所以这个数随运行期规范一起长）**逐文件完全一致 1436 / 1436**，四个方向（缺 / 漂移 / 多出 / 字段名）全 0，
未映射 0 类 / 0 处、缺 range 0、区间越界 0。

它原来是红的，红的不是解析出错，而是**产物的节点集合与 TypeScript 不是同一套**：语句 / 声明壳
（`VariableDeclarationList` / `VariableStatement` / `ExpressionStatement` / `Block`）、
类型引用（`TypeReference` 在 TS 那边是**同一区间两层节点**）、
以及叶子按值分名（`NumericLiteral` / `StringLiteral`）。第 181 轮把这些一层层补完，
第 182~198 轮把投影从 `typescript/ts-ast.xl.md` 逐块搬进各 token 的 `PrintAst`
（每搬一块都重跑这一把，基线一直是 1407 / 1407），第 199 轮把「四方向全 0 但还有三栏没判」的星号删干净。

### 当前状态（实测，四个脚本全绿）

| 判据 | 结果 |
| --- | --- |
| `cases:tsast` | 语料 **1436** 个文件、解析成功 1436、抛异常 0；**完全一致 1436 / 1436**，缺 0 / 漂移 0 / 多出 0 / 字段名 0 / 未映射 0 / 缺 range 0 / 区间越界 0，退出码 0（trivia 越界 2 处单列：注释与软换行是被扫进来的、不参与签入签出，是约定的形态） |
| `cases:tsast:cli` | 发布路径（慢，按需跑）：**语料全部**、解析成功全部、失败 0，**完全一致**，四方向 0，报未映射标签的文件 0 个 |
| `samples` | hello / declarations / generic 三份 TS 形状夹具逐字节一致，且「命令行 = 库 API」 |
| `cases:check` | **1043** 条用例，0 条不合格 |

**语料数是活的。** `dist/ts/**` 也在语料里（[ts-ast.mjs:423](tests/parse/ts-ast.mjs#L423)），
所以**每新增一条规范就多一份语料**：上面的具体数字是**本轮读数**，
判据本身是「**全部一致**」与「七条全 0」，不是某个具体数字。

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
  逐节点一致，语料全部一致——当前 1436 份）。
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

> **以下从第 50 轮起的章节是历史台账**（成文于测试集收窄之前）：里面提到的尺子与探针
> （`align` / `boundaries` / `noise` / `structure` / `lossless` / `matrix` / `diff` / `dashboard` /
> `astjson` / `shapelint` / `sweep` / `recon*` / `fuzz*`）**已随测试集收窄删除**，
> 脚本本身在 git 历史里。保留它们是为了记下「这条规则为什么长这样」。

### 按三把探针修掉的几处真缺口（第 52 轮）

`recon.mjs` / `recon2.mjs` / `fuzz.mjs` 首次跑起来就抓到**八把尺子看不见**的几处缺口——
计数不变（节点都在）、括号归属也对，所以前八把全绿：

| 缺口 | 根因 | 触发形状 |
| --- | --- | --- |
| `a.import` 抛 `TypeError`（不是 `SyntaxException`），整份文件解析失败 | `ImportReorganization.Previous` 只认「内容等于 `import` 的 `Identifier`」，**不看它前面那一格**；成员位置的 `import` 于是被当成导入声明接手，`Process` 往后立刻撞上语句结尾、收集到的单元为空，`items[items.length - 1]` 拿到 `undefined` | `a.import` / `a?.import`（`new` 那一支早有同型判据，`import` 漏了） |
| `Lamda` 克隆时抛 `SourceException: SourceRange.Start == null` | `LamdaReorganization.Process` 只给 `LamdaParameters` / `LamdaBody` 签了范围，**`Lamda` 本体的两头一直是 `null`**；而 `Lamda.Clone` 第一句是 `Sign(this)` | `x => x` 换行 `a += 1`——复合赋值规则要把等号左边那段逐个克隆，起点搜索会把上一行那个 `Lamda` 圈进来 |
| `{ A }a += 1` 抛 `Error: 没有父单元` | `StatementReorganization3` 在**旧下标**上收出一个不可能进树的 `Statement`，却已经把子单元的 `Parent` 改成了挂在它名下；后面 `JsonObjectReorganization.Process` 的 `Replace` 找不到父单元 | 块紧跟着表达式，中间既没有 `;` 也没有换行 |
| `import …` 作为文件最后一个构造时，产物里内容**渲染两遍** | `ImportReorganization.Process` 把吃掉的单元 `AddRange` 进新 `Import` 后**没有把它们从列表里摘掉**（`ReplaceCountAt` 按「连续 count 格」清理，与按内容收集的 `items` 不是一回事），旧下标于是还能把它们再收一遍 | 文件以 `import …` 结尾且它后面没有 `;` |
| 箭头函数后面换行，两条语句被并成**一条** | `Statement.SearchStatementEnd` 把 `x => x` 的体判到行尾，但那个**软换行不在**搜索范围里；`LamdaReorganization` 于是把换行一起收进 `LamdaBody`，语句重组再也看不到那个边界 | `x => x` 换行 `y`（`cases:boundaries` 报「被 `<Statement>` 横跨」） |
| `x => x` 换行 `a += 1` 里 `<Lamda>` 渲染两次 | `CompoundAssignmentOperatorReorganization.IsCompoundAssignmentOperatorStart` 只认赋值号 / `,;:?` / `return`，**不认已经成形的语句级单元**，于是往前找到的「左值」把上一行的 `Lamda` 整段圈进来克隆 | 复合赋值紧跟在箭头函数后面 |
| `a?.import` 抛 `TypeError` | `?.` 后面那个成员名 `import` 先被 `ImportReorganization` 收成 `Import` 单元，接着 `NullConditionalOperatorReorganization` 从这个 `Import` **里面**往下扫，却在**外层列表**上做替换——下标与元素全对不上 | 可选链的成员名恰好是 `import` |

修法（都在 token 层，`core/` 未动）：

- **关键字要看前面那一格**：`ImportReorganization.Previous` 增加「前一个实义单元是 `.` / `?.` ⇒ 不是导入声明」，
  与 `new.xl.md` 里 `a.new` 的判据同型。
- **要留在树里的单元必须签入签出**：`Lamda` 本体补 `SignIn` / `SignOut`（终点在收尾处判空兜底，
  覆盖 `=>` 后面什么都没有的形状）。
- **重组产物不留旧槽位**：`ImportReorganization.Process` 改成按对象身份逐个 `RemoveItem` 再从列表里摘干净
  （新增 `list-extensions.xl.md` 的 `RemoveItem`）。
- **拿不到父单元就不放进列表**：`StatementReorganization3.Process` 多了 `WrapStartIndex`（段内已有成形的
  语句级单元时只收它右边那条尾巴）与一条兜底（`Parent` 为 `null` 时把这批子单元的 `Parent` 恢复回去、
  原样返回）；`JsonObjectReorganization.Process` 也补了一条早退——**先保住内容再让步**。
- **边界字符不属于左侧表达式**：`LamdaReorganization.Process` 在收 `;` 之后**再退一层尾随软换行**，
  把换行留在 `LamdaBody` 外面，语句重组才拿得到那个边界（与「`;` 不属于体」同一口径）。
- **起点搜索要认语句级单元**：`CompoundAssignmentOperatorReorganization.IsCompoundAssignmentOperatorStart`
  增加「已经成形的语句级单元 / `}` 收尾的括号」两条（用类名认，沿用 `Statement.IsStatementUnit` 里
  认 `Let` 那条既有约定）——否则克隆范围会跨过换行、把上一条语句整段克隆一遍。
- **`?.` 后面是成员名时，别让别的规则先把它收走**：`NullConditionalOperatorReorganization.Previous`
  排掉「跨过软换行的下一个实心单元是 `import`」的情形（与 `ImportReorganization.Previous` 里那一格同型）。

回归用例 6 条：`mod-import-at-eof-no-newline`、`expr-lambda-then-compound-assign`、
`expr-lambda-bare-then-compound-assign`、`expr-member-named-import`、`expr-member-named-import-qualified`、
`expr-member-named-import-optional`。

### `structure.mjs` 为什么要跳过一部分文件

它要靠「产物叶子 ≈ 源码 token」这条对应关系把括号落回源码。有一批文件的对应率低于 60%
（`@types/node/cluster.d.ts`、`typescript/lib/lib.es2016.array.include.d.ts`、`lib.es2017.object.d.ts`、
`lib.es2019.object.d.ts`、`lib.es2020.promise.d.ts`、`lib.es2022.array.d.ts`、`lib/typescript.d.ts` 等），
原因是这批文件里注释碎片与模板串把叶子链拉得很稀疏，对齐会滑。
尺子对这种情况**主动跳过**并如实报告数量——
**宁可少查，也不要拿错的对齐去报假缺口**。其余文件（含全部回归用例、
全部实现文件、绝大部分 `.d.ts`）逐个对账通过。

`cases:boundaries` 用的是同一套对齐，并把「两遍贪心结果不一致」的叶子也剔掉，
所以它跳过的文件更多（真实语料约一半）——**判不了就报「跳过」，不报「通过」**。

### 按 `structure.mjs` 修掉的两处真缺口（第 50 轮）

形状尺子第一次跑起来就抓到两处**六个计数器都看不见**的结构错位：

| 缺口 | 根因 |
| --- | --- |
| 类成员的 `accessor` 修饰符（TS 4.9 自动访问器）不认 | 它不在修饰词表里，于是被当成裸名字，成员退化成 `<Statement><Identifier>accessor</Identifier><Field …/></Statement>`——**多包一层 `Statement`**，而「Field 在不在」「有几个」这类计数完全不变。`static accessor` / `abstract accessor` 同理 |
| `@dec x = 1` 把字段名吞进装饰器 | 装饰器的名字扫描把任何非关键字 `Identifier` 都吃下去，`x` 被拼成 `name="dec.x"`，**字段整个消失**（只剩 `<SymbolToken>=</SymbolToken><Identifier>1</Identifier>`）。判据改成「名字之间必须有 `.`」：`@ns.dec` 才是多段名字 |

两处都有回归用例：`decl-class-accessor`（三条 `Field` 计数）、`cls-accessor-keyword`、
`cls-decorator-field`、`cls-decorator-qualified-name`。

### 按 `boundaries.mjs` 修掉的语句合并（第 51 轮）

语句边界尺子第一次跑起来就抓到**八把尺子里另外七把都看不见**的一整类缺口：两条相邻的 TS 语句
被收进**同一个** `Statement`。计数不变（节点都还在）、无损性不变（名字都还在）、
括号归属也不变（那对括号的包含关系恰好没动），所以前面七把全绿。

| 缺口 | 根因 |
| --- | --- |
| `@types/node` 里成片的 `declare module "x" { … }` 换行 `declare module "node:x" { … }` 被并成一条 | 声明规则（`Class` / `Function` / `Enum` / `Interface` / `Namespace` / `MethodDeclaration` / `Signature` / `Field` / `Switch` / `DoWhile`）用 `DeclarationEnd` 把**尾随软换行**并进了自己的替换范围。那道换行正是 `SearchFrontIndexed` 往回找语句头时的「墙」；墙没了，搜索一路退到列表开头。**真实语料 217 个文件里 30 个中招（48 处）** |
| `const a = [1, 2] as const` 换行 `const o = …` | `as const` 里的 `const` 被 `LetReorganization` 当成声明头，于是 `SkipNext` 跨过换行找到**下一行**的 `const`，三个单元一起被替换成一个 `Let fieldName="const"` |
| `const a = x as { b: number }` 换行 `const b = …` | `IsInStatement` 只看换行**两侧**有没有非语句符号；下一行是 `Let` 而再往后是 `=`，于是被判成「语句内部」，`As` 的类型扫描把第二个 `Let` 吞掉 |
| `a?.b` 换行 `c?.d` | 空条件运算符的扫描只在运算符处断开，不认换行 |
| `let a!: number` 换行 `class C { … }` | `TypeDefine` 只认「成员边界」，不认语句边界，整个类被收进类型 |
| `a` 换行 `++b`；`x++` 换行 `continue`；`return` 换行 `-1` | ASI 之前**完全没做**：换行只在成员边界与声明尾部被当成边界 |

修法：

- **删掉 `DeclarationEnd`**（`Class` / `Function` / `Enum` / `Interface` / `Namespace` /
  `MethodDeclaration` / `Signature` / `Field` / `Switch` / `DoWhile` 十处）：它当初的理由
  （避免空的 `<Statement></Statement>`）**今天已经由语句重组自己的早退承担**，
  而它的代价正是上面第一行那条。删掉之后空 `Statement` 仍是 0（`cases:noise` 钉住）。
- **把 ASI 写成一条判据**：`Statement.IsLineBreakBoundary` —— 换行前一个单元不再要操作数、
  且换行后一个单元也不能续接这个表达式 ⇒ 断句；另有 `return` / `throw` / `break` / `continue` /
  `yield`（受限产生式）与后缀 `++` / `--` 两条更早的结论。它同时被 `StatementReorganization2`、
  `IsStatementEnd`（`As` 的收尾）与 `TypeDefine` / `NullConditionalOperator` 复用，**只有一份规则**。
- **`declare module "…"` 不再按点号拆嵌套命名空间**：字符串名字是模块路径的整体（`"./m"` / `"*.css"`），
  只有标识符形式的 `namespace A.B.C` 才拆（`gap-dashboard` 里那 4 个 `ModuleDeclaration 真多` 就是它）。

回归用例 10 条：`stmt-asi-class-expression-then-statement`、`stmt-asi-as-const-then-statement`、
`stmt-asi-as-then-statement`、`stmt-asi-type-annotation-then-class`、`stmt-asi-return-newline`、
`stmt-asi-prefix-increment-after-statement`、`stmt-asi-postfix-then-continue`、
`expr-asi-optional-chain-then-statement`、`mod-declare-module-pair`、`mod-declare-module-string-name`。

### 按「构造 ↔ 标签」对齐探针修掉的七处真缺口（第 53 轮）

八把尺子里**没有一把**看形状与语义的对应关系：`arrow => { … }` 的块体被收成 `TypeLiteral` 时，
节点计数、名字、括号归属、语句边界、空节点全都正常，差分账上只表现为几处「真多」。
所以这一轮改用「源码区间重叠」把**产物单元**与 **TypeScript AST 节点**对齐，两边互相反查：

- 产物里有某个标签，源码里却找不到对应构造（标签被别的形状占用）；
- 源码里有某个构造，产物里却没有对应标签（缺节点）。

六处缺口（全部有回归用例）：
| 缺口 | 根因 | 触发形状 |
| --- | --- | --- |
| 箭头函数的**块体**被收成 `TypeLiteral`，里面每条语句退化成 `Field`，`g(a)` 退化成 `MethodDeclaration` | `TypeLiteralReorganization.IsTypePosition` 一见 `=>` 就判「类型位」——`=>` 后面那个 `{` 既可能是**函数类型的返回类型**，也可能只是**箭头函数的块体** | `const f = (a) => { return a }`（真实代码里遍地都是；真实语料 7 处、本项目自己的产物 3 处） |
| 多形参箭头函数只产出**一个** `LamdaParameter`，`ComputeParametersCount` 报 1 | 形参括号在 `=>` 之前就闭合了，它自己那一趟重组先把 `a, b` 收成了 `BinaryOperator op=","`；轮到 `Lamda` 时形参表里已经没有逗号 `SymbolToken` | `(a, b, c) => x`、`(a, b = 1, ...c) => x` |
| 复合赋值展开出来的**克隆体是空壳**：`<BinaryOperator op="+" />` / `<NotNull />` / `<Spread />` / `<UnaryOperator />` | `BinaryOperator` / `NotNull` / `Spread` / `UnaryOperator` 四个类的 `Clone` 只签范围、**没有把子单元克隆进去**（`LogicalOperator` 是对的，可以对照） | `a[b + c] += 1` 展开成 `a[b + c] = a[b + c] + 1`，克隆那份的下标变空 |
| 变量声明的**多声明符**逗号被折成逗号运算符 | 语句层的 `,` 被一律当成序列表达式，而 `let a = 1, b = 2` 的那个 `,` 是声明符分隔符 | `const a = 1, b = 2`（产物里 `b` 被卷进 `<BinaryOperator op=",">`） |
| `yield*` 被折成乘法 | `IsOperand` 只排了八个「语句头关键字」，`yield` 是**前缀运算符**、不在这八个里 | `function* g() { yield* h() }` |
| `satisfies` 完全没有节点；`a as const satisfies B` 两个运算被并进**一个** `As` | `AsReorganization` 只认 `as`，收集时也不认后面的 `satisfies` | `x satisfies T`、`a as B satisfies C` |
| 括号里的**第一个** `{` 被判成值位：`({ readonly ok: true } \| { readonly no: true })` 里第一个是 `ObjectLiteral`、第二个才是 `TypeLiteral` | 本层回扫看不到左边的单元（它们在**括号外面**），于是落到「值位」的保守结论 | `type T = A & ({ … } \| { … })`、`declare const x: ({ a: 1 } \| { b: 2 })`（真实语料 8 处） |

修法（都在 token 层，`core/` 未动）：

- **`=>` 后面那个 `{` 要看形参表左边是什么**：跨过箭头与它的形参表（中间还可能夹着返回类型标注
  `: T`）之后再下结论——左边是 `:` ⇒ 函数类型（类型位）；跨过 `=` 之后落到 `type` ⇒ 类型别名（类型位）；
  落到 `let` / `var` / `const` 或列表边界 ⇒ 值位（块体）。
- **形参表先拆平再切分**：`LamdaReorganization` 新增 `CollectParameterUnits`，
  把 `op` 为 `,` 的 `BinaryOperator` 递归展开，然后才按逗号切 `LamdaParameter`。
- **要留在树里的单元必须整体克隆**：四个类的 `Clone` 补上
  `result.AddRange(this.Data.map((item) => item.Clone()))`（`Clone` 只在复合赋值展开里被调用，
  而被克隆的那一段正是左侧表达式）。
- **语句列表里有 `Let` 时，顶层 `,` 不是序列表达式**：`IsCommaExpressionComma` 增加
  `HasDeclarationBefore` 判据（真正的 `a, b;` / `i++, j--;` 里不会有 `Let`）。
- **`yield` 单列进「不是操作数」那一组**：它是前缀运算符，唯一直接贴在它右边的是委托产生式 `yield*`；
  `await` / `new` / `typeof` **不能照抄**（`new X * 2` 是合法的 `(new X) * 2`）。
- **`satisfies` 与 `as` 共用一条规则、产出两种节点**：`AsReorganization.Previous` 认两个词，
  `Process` 按出发词分派 `As` / `Satisfies`，并在遇到**后面那个同类词**时收工
  （两者同级左结合，先后顺序必须保留）。新增 [typescript/tokens/satisfies.xl.md](typescript/tokens/satisfies.xl.md)。
- **括号里的第一个 `{` 要递归问括号自己那一格**：`IsTypePosition` 在 `index === 0` 且父单元是 `(` 括号时，
  拿括号在**外层列表**里的下标再问一次（`type T = ({ … })` 回扫到 `type` ⇒ 类型位；
  `f({ … })` 回扫到 `Method` ⇒ 值位）。括号紧跟 `=>` 的那一种要**排除**——那是箭头函数的表达式体，
  拿外层去判会把它收成 `TypeLiteral`（`expr-arrow-return-object-type` 钉住）。

回归用例 11 条：`expr-arrow-block-body-statement`、`expr-arrow-block-body-call`、
`expr-arrow-params-multi`、`expr-arrow-params-default-rest`、`expr-compound-assign-clone-operands`、
`expr-multi-declarator-comma`、`expr-yield-delegate`、`type-op-as-then-satisfies`、
`type-op-satisfies-then-as`、`type-union-paren-object`（另修了两条既有用例的期望值：
`expr-comma-sequence` 的计数由 3 改 2，`type-op-satisfies` 由 `Keyword` 改成 `Satisfies`）。

### 类型层补第一块：函数类型（第 54 轮）

`cases:align` 第 53 轮把缺口量化出来之后，最大的一块是**类型层**。这一轮先啃最常见的那一种：

| 缺口 | 根因 | 触发形状 |
| --- | --- | --- |
| **函数类型没有节点**：`(a: A) => B` 在类型位散成裸单元（真实语料 4226 处），其中 17 处被误收成 **`Lamda`**（值位标签） | 类型位压根没有「函数类型」这条规则；`LamdaReorganization` 只按「形参括号前面是不是 `:`」判断，括号套括号 / 泛型段 / 条件类型约束 / `extends (` 这些形状全都漏了 | `Array<(a: A) => B>`、`x: ((a: A) => B)`、`cb?: (e: Error) => void`、`new () => object`、`<T>(a: A) => B`、`T extends (this: infer U, …) => any ? U : never` |
| `extends (…)` 被当成一次**调用**，收出 `<Method name="extends">`，函数类型整段散掉 | `BanedMethodNames` 的禁用表里没有 `extends` / `infer` | `type ThisParameterType<T> = T extends (this: infer U, ...args: never) => any ? U : never`（`lib.es5.d.ts`） |
| 上一行声明的函数类型**吞掉下一行整条声明** | `FunctionType.Process` 只按 `Statement.IsLineBreakBoundary` 判终点，而 `void`（返回类型）那时还是个 `Identifier`、被判成「还能续接」 | `type A<in T> = (x: T) => void` 换行 `type B<out T> = () => T`（`ty-variance.ts` 当场并成一条） |
| 外层条件类型被吞进 `FunctionType` | 收集时不认 `?` / `:`，一路收到语句尾 | `F extends abstract new(...args: any) => any ? F : undefined` |

修法（都在 token 层，`core/` 未动）：

- **新增 [typescript/tokens/function-type.xl.md](typescript/tokens/function-type.xl.md)**：
  `FunctionTypeReorganization` 认「`=>` 左边那个 `(` 不是形参表」这一半——判据直接复用
  `LamdaReorganization.FindParameters`（给 `-1` 就是函数类型），**两边共用一份判断**，
  不会出现「一边当形参表、另一边当函数类型」的错位。规则排在 `Lamda` **之前**、`TypeAssign` 之前。
- **`IsLambdaParameters` 补四类类型位**：父单元是 `GenericType`；
  形参括号是所在列表第一项时往外问一层（`IsWrappedByTypeContext`：`:` / `?:` / `|` / `&` /
  `extends` / 类型实参段 ⇒ 类型位，`=` 再往左找 `type` 还是 `const`）；
  前面是 `=` 时问 `IsTypeAliasAssignment`（`type F = (a) => B` 与 `const f = (a) => b` 的区别就在这里）；
  前面是 `?` 时问 `HasExtendsMarker`（条件类型真分支）；前面是 `new` / `extends` 一律不算形参表。
  顺带修掉 `?:` 只判 `Is(":")` 的漏（可选回调一大片）。
- **`FunctionType` 挂类型队列**（与 `TypeDefine` 同一做法）：否则返回类型里的 `void` / `infer` /
  `abstract` 停在 `Identifier` 上（`type-fn-*` 三条用例当场报缺 `Keyword`）。
- **收尾用 `IsStatementKeyword` / `IsDeclarationBoundary`**（与 `type-assign.xl.md` 的 `AliasEnd` 同款），
  并且顶层 `?` / `:` 按「沿途见过 `extends` 没有」决定是返回类型自己的条件类型还是外层的。

结果：函数 / 构造类型（真实语料 4226 + 24 处）从 **0 个节点** 变成**只剩 1 处没成形**
（`@types/node/test.d.ts:2119` 的 `ConstructorType`，已登记为口径）；`<Lamda>` 误标从 **17 处降到 0 处**。回归用例：`type-fn-simple` / `type-fn-generic` /
`type-fn-new` / `type-fn-abstract-new` / `type-fn-union-member` / `type-fn-optional-param`
六条补上 `FunctionType` 期望值，另加 `type-fn-declaration-boundary`、
`type-fn-in-conditional-constraint`、`type-fn-optional-callback` 三条。

### 类型层补第二块：条件类型（第 55 轮）

接着第 54 轮的函数类型，这一轮补**条件类型** `T extends U ? A : B`（真实语料 183 处）：

| 缺口 | 根因 | 触发形状 |
| --- | --- | --- |
| 条件类型**一处节点都没有**，个别位置还落成 `<TernaryOperator>`（值位三元的标签） | 类型位没有条件类型这条规则，`TernaryOperatorReorganization` 只按形状认 `? :` | `type X = T extends U ? A : B`、`T extends U ? A : B` 作泛型实参 / 联合成员 / 标注 / 返回类型 |
| 约束段里有成员访问时**整条认不出来** | 回扫找 `extends` 时停在 `.` 上（`Process` 里那份更是完全漏了泛型段与点号） | `T extends NodeJS.ArrayBufferView<infer B> ? Buffer<B> : never`（`@types/node/buffer.buffer.d.ts`、`compatibility/iterators.d.ts`） |

修法：新增 [typescript/tokens/conditional-type.xl.md](typescript/tokens/conditional-type.xl.md)。

- **判据是「`?` 前面有没有 `extends`」**：条件类型与三元表达式形状完全一样，
  区别只在这个词（它只出现在声明头与条件类型里，而声明头的 `extends` 后面不会跟 `?`）。
  这条判据与 `lamda.xl.md` / `type-literal.xl.md` 里那两份同源，各自独立实现一份。
- **`Previous` 与 `Process` 共用一份 `FindExtendsIndex`**：两边各写一份就会出现
  「判定说有、收集说找不到」的错位——实测正是如此（`Process` 那份漏了 `.` 与泛型实参段）。
- 规则排在 `FunctionType` 之后、`TernaryOperator` 之前：约束里的函数类型先成形
  （`T extends (a: A) => B ? X : Y`），条件类型再把整段收走；值位的三元照旧归 `TernaryOperator`。
- `findStart` 从 `extends` 往左找条件的左边界（只有符号划边界，放行 `.` / `?.` / `!`，
  换行处按 `Statement.IsLineBreakBoundary` 让位），收集到 `;` / `,` / 赋值 / 声明边界为止。

结果：**183 处条件类型全部成形**（`cases:align` 的缺节点从 7 处降到 0），
值位三元一处都没被误收（`class C extends B { m() { return a ? b : c } }` 用例钉住）。
回归：9 条既有 `type-cond-*` 用例补上 `ConditionalType` 期望值，另加
`type-cond-member-constraint`、`type-cond-multiline` 两条。

### 清掉「结构性缺口」里的三条（第 56 轮）

这一轮回头收 `README.md` 自己列的那份「结构性缺口」清单（它们是**内容没丢、但没有标签 / 归类不同**的那些）：

| 缺口 | 修法 | 产物变化 |
| --- | --- | --- |
| 类静态块没有专属标签 | 新增 [typescript/tokens/class/static-block.xl.md](typescript/tokens/class/static-block.xl.md)：`StaticBlockReorganization` 认「`static` + `{`，且父单元是 `ClassBody`」，把花括号内容整段搬进 `StaticBlock`（与 `FunctionBody` 同款），并挂语句队列 | `<Statement><Keyword>static</Keyword><Bracket>{…}</Bracket></Statement>` → `<StaticBlock><Statement>…</Statement></StaticBlock>` |
| `export as namespace Foo` 没有专属节点 | 新增 [typescript/tokens/namespace-export.xl.md](typescript/tokens/namespace-export.xl.md)：`NamespaceExportReorganization` 认四个词连排（`export` / `as` / `namespace` / 名字），排在 `As` **之前**（否则 `as` 那条规则先收走 `namespace Foo`） | `<Keyword>export</Keyword><As>namespace Foo</As>` → `<NamespaceExport name="Foo" />` |
| `import type x = require('y')` 里那个 `type` 词冗余 | `Import` / `Export` 在读词之后**不再把 `type` 放进子单元**——它已经由 `typeOnly="true"` 表达 | `…<Identifier>type</Identifier>…` 消失（属性不变） |

顺带修的一处**多包一层**：`StaticBlock` 与 `NamespaceExport` 要进
`Statement.IsStatementUnit` 的判定表，否则它们会被多包一层 `<Statement>`
（`decl-class-static-block` / `mod-export-as-namespace` 两条用例钉住）。
两者都用**类名判定**：`statement.xl.md` 被几乎所有 token 文件 import，再 import 它们会绕出更深的环
（与该文件里 `Let` 那条同一个理由）。

### 类型位 `typeof` 的同构不同形（第 57 轮）

`cases:align` 上一轮留下的最大一类「口径」是类型位的 `typeof`：`type T = typeof x` 与
`let v: typeof x` 都是 `<Keyword>typeof</Keyword><Identifier>x</Identifier>`，
可 `let v: Wrap<typeof x>`（**类型实参段**里）却变成一个 `<UnaryOperator op="typeof">`——
同一个 `TypeQuery` 两种产物。全语料实测 **337 处里 81 处**长成了 `UnaryOperator`。

插桩追下去才看清：词法阶段**收编类型实参段的那一趟**，这段文本还没挂到任何父单元上
（`Parent === null`，见 `generic-type.xl.md`），所以 `UnaryOperatorReorganization.Previous` 里
那条 `Parent instanceof GenericType` 在那一刻问不出东西来——等它挂上去时节点已经造好了。

修法：那条判据补一句 **`Parent === null` 且运算符是 `typeof` 就不接手**。
先量后改：把全语料 `Parent === null` 的一元折全部抓出来看过，**只有 `op=typeof`**，
其余（`!` / `-` / `void` / `delete`）的折都发生在 `Statement` / `Bracket` 父单元下，不受影响。
结果：81 处 → **0 处**（值位的 `typeof x` 照旧是一元运算，`let v = typeof x` 用例钉住）。

**顺带试过、退回来的一条**：想让 `(` 也有类型位标记（`DecideBracketContext` 原本只算 `{` / `[`），
好把括号类型里的 `typeof`（`(WindowProxy & typeof globalThis)`，全语料 1 处）也判对。
`(` 纳进来之后 `for (; i < n; i++)` 的循环头被判成类型位，`i++` / `-1` 这些真一元运算
当场少了 **17 个**（`cases:dashboard` 报「一元/更新 真缺 17」）——那段「往上爬 4 跳」的扫描
对括号来说前文太远、信号太杂。退回原判据，那 1 处如实登记成口径
（`tests/parse/align.mjs` 的 `UnaryOperator in Bracket`），并加了一条用例把它钉在案上。

### 类型层补第三块：联合 / 交叉类型（第 58 轮）

`cases:align` 上两轮把「还没成形的类型构造」逐条量化之后，最大的一块是**联合类型**：
真实语料 **8461 处联合 + 206 处交叉**，产物里全是散单元——`A | B` 与「三个互不相干的单元」
在树里长得一模一样（一直挂在口径里）。

新增 [typescript/tokens/type-union.xl.md](typescript/tokens/type-union.xl.md)，**一条规则管两个运算符**：

- 优先级靠「**收进去的那一段再跑一趟**」表达：两个节点都挂类型队列（队列里有这条规则），
  收集 `|` 时允许穿过 `&`（`A | B & C` 先整段收成 `UnionType`，它内部的 `&` 再由自己的那一趟
  折成 `IntersectionType` ✓ 得到 `A | (B & C)`）；收集 `&` 时遇到 `|` 就停
  （`A & B | C` → `UnionType(IntersectionType(A & B) | C)` ✓）。
- 规则**同时注册进通用队列与类型队列**：类型文本有的装在 `TypeDefine` / `TypeAssign`（类型队列），
  有的直接挂在 `GenericType` / `ReturnType` 的列表上（通用队列）。
  通用队列那一趟落在**值位**的语句列表上，所以判据是**白名单**（父单元是类型容器才接手）——
  黑名单式（「不是语句就算类型」）会把 `BinaryOperator` / `UnaryOperator` 的内容也放进来。
- **无限递归**踩了一次：本节点挂类型队列、队列里有这条规则，`A | B` 收成 `UnionType` 之后
  那一趟又在同一段上看到同一个 `|`（实测 `RangeError: Maximum call stack size exceeded`）。
  守卫写成「起点在本层第 0 格、终点之后只剩软换行 ⇒ 这一段就是这个节点的全部内容，不再包」。

顺带修掉两个**真解析缺口**（不是缺节点，是树本身错了）——它们都在
[generic-type.xl.md](typescript/tokens/generic-type.xl.md) 的 `IsTypePosition` 里：

| 缺口 | 现象 | 修法 |
| --- | --- | --- |
| 联合成员里的类型实参不认 | `let x: X \| Foo<Bar>` 的 `<Bar>` 退回比较运算符，整个类型**劈成两半**（`<UnionType>X \| Foo</UnionType><SymbolToken>&lt;</SymbolToken>…`）；真实语料里 `ArrayBuffer \| NodeJS.TypedArray<T>`、`\| Uint8Array<T>` 都是这一形状 | `\|` / `&` 判成**透明**（继续往前找边界），而不是直接判表达式位——`let x = a \| Foo<Bar>`（值位）透明过去会撞上 `=` → `let`，判回表达式位 ✓ |
| 函数类型的返回类型里同上 | `type F = () => Iterable<T> \| AsyncIterable<T>`（`@types/node/stream.d.ts` 的 `PipelineSourceFunction`）里 `<T>` 的扫描先撞上 `=>` | `=>` 与 `:` / `?:` / `->` 一样判类型位；值位箭头体（`x => a < b`）没有配对的 `>`，后继闸本来就过不了 |

结果：联合 **8461 → 只剩 57 处**、交叉 **206 → 只剩 42 处**（剩下的全是**括号类型**里的那种，
`(string | symbol) & Key2<…>`：括号内容判不出自己在类型位，`DecideBracketContext` 只覆盖 `{` / `[`，
加 `(` 会误判 `for (…; …; i++)` 的循环头——第 57 轮试过、退回来了；已逐条登记成口径）。
回归用例 6 条：`type-union-basic`、`type-intersection-basic`、`type-union-precedence`、
`type-intersection-then-union`、`type-union-generic-member`、`type-union-leading-bar`。

### 括号类型、限定名与字面量联合（第 59 轮）

第 58 轮把联合 / 交叉立起来之后，`cases:align` 还挂着 99 处没成形的——全是**括号类型**里的
（`(string | symbol) & Key2<…>`、`| (ObjectEncodingOptions & Abortable) | …`）。
这一轮把它啃到 **43 处**，顺带又挖出两个真缺口：

| 缺口 | 现象 | 修法 |
| --- | --- | --- |
| 括号类型里的联合 / 交叉不成形 | 括号的内容是在**括号关闭那一刻**重组的，那时外层 `TypeDefine` / `Statement` 还没成形（插桩：`parent=Bracket grand=Root`），「往上找类型容器」这条路在这一刻是断的 | 增 `IsTypeContext` / `IsTypeParen`：括号那一格**按前文判**（`:` / `?:` / `\|` / `&` / `=>` ⇒ 类型位；`=` 再往左找 `type` 还是 `let`/`const`/`var`），与 `lamda.xl.md` 的 `IsWrappedByTypeContext` 同源。**这次不会误判 `for (…)`**——那里括号前面是 `for` 这个名字，不是符号；第 57 轮退回来的那次是跨好几格扫文本 |
| 联合成员是**限定名**时节点在第一个点号处断掉 | `ArrayBuffer \| NodeJS.TypedArray` 的右扫把 `.` 当成边界（左扫认它、右扫不认，两边不对称） | 右扫补上 `IsTypeOperand` 那一支（`.` / `?.` / `!`），并把 `-` / `+` 也算进操作数——`-1 \| 0 \| 1` 这种**负数字面量类型**的联合因此也能成形 |
| 括号类型里的 `typeof`（第 57 轮登记的 1 处残渣） | 同一个括号判定问题 | 随第一行一起消失：`(WindowProxy & typeof globalThis)` 现在先收成 `IntersectionType`，里面的 `typeof` 走类型队列、按 `Keyword` 收 ✓ |

结果：**联合 8470 → 只剩 43 处**（99.5%）、**交叉 210 → 只剩 2 处**（99%）；
剩下的全是「括号里带括号函数类型」那个形状，已如实登记成口径。
回归用例 3 条：`type-union-in-paren`、`type-union-qualified-member`、`type-union-literal-members`
（另把 `type-query-in-paren-type` 的期望值从「钉住残渣」改回「必须成形」）。

### 类型层补第四块：映射类型（第 60 轮）

映射类型 `{ [K in T]: X }`（真实语料 36 处）原来**没有专属标签**：产物是
`TypeLiteral` + `TypeLiteralBody` + `Field`，与 `{ a: number }` 在树里长得一样。

**没有新增规则**——判定塞进 `TypeLiteralReorganization.Process`：那对花括号已经在类型位、
也已经由 `Previous` 认领，区别只在内文（`IsMappedTypeBrace`：第一个实义单元是 `[` 括号、
且里面有 `in` 标记）。索引签名 `{ [key: string]: number }` 没有 `in`，仍然走 `TypeLiteral` ✓。

三处实测出来的细节（都写进规范了）：

- **`readonly` / `+` / `-` 修饰词在括号前面**：`{ readonly [K in T]: X }`、`{ -readonly [K in T]-?: X }`
  的第一个实义单元不是 `[`——不跳过这些修饰词，带修饰的映射类型整片认不出来。
- **`in` 有三种形态**：还是 `Identifier`（刚收上来）、已升成 `Keyword`（`in` 后面跟着 `keyof` 时
  没被折成二元运算）、已被折成 `BinaryOperator`（`[K in T]`）。所以 `HasInMarker` 既要认两种词，
  也要往容器子单元里递归看一眼。
- **联合规则会把 `in` 吞掉**：`{ [K in "a" | "b"]: X }` 里 `[` 括号的内容成了
  `ArrayLiteral > UnionType(K in "a" | "b")`——映射类型的标记再也找不到。
  修法是 `type-union.xl.md` 的 `IsTypeOperand` **把 `in` 排除出操作数**（它是语法标记，不是类型），
  于是联合只覆盖 `"a" | "b"` ✓。

内容**直接装在 `MappedType` 上**（不套 `TypeLiteralBody`）：映射类型只有一个成员，
再套一层只是噪声；`MappedType` 自己挂语句队列让成员成形。
8 条既有 `*mapped*` 用例的期望值随之从 `TypeLiteral,TypeLiteralBody` 改成 `MappedType`。

### 回头查「已登记的口径」——三处真 bug（第 61 轮）

前几轮把 `cases:align` 的差额逐条登记成了口径，可**登记本身就是可疑动作**：口径里可能藏着真误判。
这一轮给探针加了 `--samples`（连已登记条目也打印样本），一眼扫出三处：

| 现象 | 规模 | 根因 | 修法 |
| --- | --- | --- | --- |
| **成员的「前导 `\|` 多行联合」被切断** | `@types/node/vm.d.ts` 3 处 | `FieldReorganization` 扫成员结尾时用「换行前一个实单元是不是符号」这条粗判据：前一行末尾是标识符（`… \| A`），当场判「这行写完了」→ 成员在 `\| A` 之后断开，剩下半截落进 `<Statement>`，还被折成一个**值位**的 `BinaryOperator op="\|"` | 那条粗判据换成 `Statement.IsLineBreakBoundary`（就是 ASI 判据）：换行后是 `\|` / `&` 这类要左操作数的运算符时判「不是边界」✓；函数类型成员那个形状它照样判边界 ✓ |
| **`-` / `+` 不在泛型实参字母表里** | `lib.es2015.promise.d.ts`、`lib.es2020.promise.d.ts` 等 | `Promise<{ -readonly [P in keyof T]: Awaited<T[P]> }>` 里 `-readonly` 的 `-` 让扫描中止 → 整个 `<…>` 退回符号：产物里 `Promise` 后面是个裸 `<`，映射类型落成值位 `ObjectLiteral`，**剩下整段掉进 `<FunctionBody>`** ✗✗（结构全塌） | `-` / `+` 进字母表（映射类型修饰符 `-readonly` / `+readonly` / `-?` / `+?` 与负数字面量类型 `-1 \| 0`）；`->` 那条分支改成只认 `->`、其余 `-` 放行（踩过一次：先加了通用放行、却被更早的 `->` 分支拦掉） |
| **映射类型修饰符 `-readonly` 被折成一元运算** | 5 处 → 0 | `UnaryOperatorReorganization` 不认得映射类型的修饰位 | 加 `IsInMappedType`（往上三层找 `MappedType`，成员那层隔着 `<Statement>`）：映射类型的内容全是类型，里面出现一元运算一定是误判 |
| 下标访问的类型位 `A[typeof x]` | 1 处 | `typeof` 的父单元是 `[` 括号，前面两条判据都问不出来 | 直接问 `[` 括号的 `Context`（`DecideBracketContext` 覆盖 `{` / `[`）**只加 `[`**——`(` 的 Context 一律空串，第 57 轮把它纳进来时真一元运算少了 17 个 |

第 1 条让 `cases:dashboard` 的「真多」从 2518 降到 **2433**；回归用例 4 条
（`type-mapped-modifier-in-generic`、`type-mapped-minus-question-in-generic`、
`type-union-leading-bar-in-member`、`type-query-in-index-access` + 值位对照的
`expr-typeof-in-index-access`）。

### 类型位判定收口：括号、修饰词与模板插值（第 62 轮）

顺着第 61 轮的 `--samples`（这轮又让它把**已登记不产节点**的条目也打印出来），又扫出几处：

| 现象 | 规模 | 根因 | 修法 |
| --- | --- | --- | --- |
| **类型位修饰词后面的括号**判不出来 | `typescript.d.ts` 8 处 | `readonly (A \| B)[]` 里 `(` 前面是 `readonly`（标识符、不是符号），`IsTypeParen` 直接判否 | 增 `IsTypeModifier`（`readonly` / `keyof` / `infer` / `unique` / `asserts` / `typeof` / `new` / `abstract`），**但还要看修饰词自己站在哪**——`readonly` / `keyof` 不是保留字，值位可以有个叫 `readonly` 的函数（`readonly (a \| b)` 是一次调用） |
| **括号类型里的类型实参**认不出来 | `typescript.d.ts` 5 个联合 | `(TransformerFactory<SourceFile> \| CustomTransformerFactory)[]` 里 `<` 的位置扫描先撞上 `(`：`IsTypePosition` 见到括号就判值位 → 整个类型退化成散单元，里面那个联合跟着没了 | 括号那一格问 `IsTypeBracketPosition`（扫描中途遇到括号、以及扫到自己这一层尽头时各问一次） |
| **`as` 右边的联合**不成形 | 2 处 | `As` 节点**没有重组队列**，收进来的类型文本没人再跑一趟 | `As` 挂类型队列（与 `TypeDefine` / `TypeAssign` / `FunctionType` 同一条做法）；顺带在 `KeywordReorganization` 里挡掉「`As` 里的 `const`」——那是 `as const` 的**字面量类型标记**，升成关键词会让 `type-op-as-then-satisfies` 当场失败 |

三处判定（括号、修饰词、`=` 左边是 `type` 还是 `let`）现在**收口在**
[text-common-util.xl.md](typescript/text-common-util.xl.md) 的 `IsTypeBracketPosition` /
`IsTypeModifier` / `IsTypeAliasAssignment` 三个共享函数里——`type-union.xl.md` 与
`generic-type.xl.md` 用**同一个答案**，不再各写一份近似。

**试过、退回一条**：模板字面量类型的插值段（``type X = `a${"x" | "y"}b` ``）里的联合仍不成形。
那段内容是在字符串收尾**之前**重组的，此刻父单元还没接上（实测插值段链路是
`InterpolationString > String > Root`，而 `Root.Data` 里还找不到那个 `String`），
「这一格前面是什么」与「往上找类型容器」两条都断。曾按类型位放行，
值位的 `` `${a | b}` `` 会跟着变成联合——那个取舍不划算，于是如实登记成口径。

结果：联合的未成形数 **43 → 1**、交叉 **2 → 1**（都是上面那条模板插值残渣）；
回归用例 3 条（`type-union-in-paren-with-generic`、`type-union-after-readonly`、
`type-union-in-as-expression`）。

### 三处「真 bug」（第 63 轮）

这一轮把 `--samples` 的清单一条条点开看，抓到三处**不是口径、是 bug** 的东西：

| 现象 | 规模 | 根因 | 修法 |
| --- | --- | --- | --- |
| **块语句被凭空复制一份** | `{ A }a += 1` | 复合赋值的展开要从 `+=` 往左找「等号左边那一段」再克隆；判据里那条「`}` 收尾的括号算起点」写成了 `startBracket === "}"`——块语句的起点是 `{`，一个都匹配不上，于是 `SearchFront` 一路穿到列表头返回 `-1`，`front` 变成 `units.slice(0, index)`，**整段（块 + 目标）被克隆** ✗ | 改成 `endBracket === "}"`（同一个文件里 `SearchFront` 的起点判据）|
| **名字叫 `function` 的类型成员被读成函数声明** | `@types/node/sqlite.d.ts` 2 处 | `FunctionReorganization.Previous` 只看「`function` 后面能凑出 `(`」——`interface I { function(name: string): void }` 里那个 `(` 就是**方法签名自己的形参表**，于是收成一个**没有名字的 `<Function>`** ✗ | 接口体 / 类型字面量体 / 类体里不可能有函数**声明**，这三处的 `function` 直接判否（交给方法规则，产物是 `<MethodDeclaration name="function">`）|
| **合法 TS 直接抛异常** | `if (x) print(1)`（**文件结尾没有换行、也没有 `;`**）| `if` / `while` / `for` / `foreach` 找语句体用的是 `SearchStatementEnd`：没有 `;` 也没有换行时它给 `-1`，四条规则都直接 `throw` ✗——可 TypeScript 的语句**到输入末尾就结束了** | 新增 `Statement.LastMeaningfulIndex`：找不到结束符号时，体一直写到**最后一个实义单元**（尾随换行仍留在外面当语句边界）；四条规则都补上这条兜底 |

**试过、退回来一条**：给 `StatementReorganization2.Previous` 加「前一个实义单元是 `}` 收尾的
`Bracket` ⇒ 新语句开始」，想把 `{ A }a += 1` 断成两条语句（`cases:boundaries` 正是这么报的）。
加上之后边界是对了，可**复合赋值的展开还没跑完就被切断**：产物里第二段只剩一个 `1`，
`a` / `=` / 展开出来的 `BinaryOperator` 全丢了 ✗——内容丢失比边界不合严重得多。
所以维持原判据，那两条形状写进 `tests/parse/recon2.mjs` 的片段表（**96 条**，靠探针盯「内容不许丢」）。

### 空文件、换行风格与规模（第 64 轮）

第 63 轮那四个「合法 TS 抛异常」都属于**文件结尾没有换行**这一族，所以这一轮按族扫：

- **92 个「结尾没有换行」的片段**（`if` / `while` / `for` / `do` / `switch` / `try` / 类 / 接口 /
  类型标注 / 表达式 / 模块 ……）：**零抛异常、零内容丢失** ✓（第 63 轮修的那四条已经覆盖住了）；
- **27 个换行风格与规模片段**：LF / CRLF / CR / 混合换行、有无结尾换行、BOM、空文件、
  只有换行、只有注释、注释与字符串里的括号、60 层括号 / 40 层泛型、800 条语句、500 个接口成员……
  → 抓到**一处真 bug**：

| 现象 | 根因 | 修法 |
| --- | --- | --- |
| **空 `.ts` 文件整份解析失败**（`SourceException: SourceRange.Start == null \|\| SourceRange.End == null`）| `SyntaxContext.Process` 逐位置处理，最后一个位置处理完再给根签出；**一个位置都没有**时循环体一次都不跑，`Root` 既没签入也没签出，`TryToClose()` 的「范围必须先签好」这道闸当场抛 ✗ | 空文档提前返回：产物就是一个空的 `<Root></Root>`，与「只有换行」「只有注释」的文件一致 ✓ |

这两族片段**常驻**在 `tests/parse/recon2.mjs` 里（**96 → 114 条**），
空文件另外进了一条用例（`cases/lexical/empty-file.ts`，是个 0 字节文件）。

第 65 轮（收尾复查）又扫了一批**冷门但合法**的 TS 形状——`declare global` / 通配模块 /
`export type *` / `import x = require(…)` / `using` 与 `await using` / `accessor` /
`#p in o` / 装饰器 / `asserts x is T` / `this is T` / `unique symbol` /
`infer A extends string` / 变长元组 / 带标签元组 / `const` 类型参数 / 内建工具类型 /
`typeof import(…)` / `a?.[b]` / `??=` / `>>>=` / `new.target` / `import.meta` /
`(this: C) => void` / `abstract new` / 尖括号断言 / 正则 unicode 转义 / 标签模板 /
嵌套模板 / 模板字面量类型 `infer` / 映射类型 `as` 模板键 / 计算属性名 / 数值分隔符与大整数——
**98 条零抛异常、零 TS 诊断**；其中 **40 条**（覆盖面最广的那些）也常驻进 `recon2.mjs`
（**114 → 154 条**）。

### 类型层补第五块：方括号三种 · 类型运算符 · 类型查询（第 66 轮）

`cases:align` 把「还没成形的类型构造」逐条量化之后，剩下的最大一块是**方括号**。
这一轮把它连同两个前缀运算符一起补上，并顺手牵出四处真 bug。

**新增 [typescript/tokens/type-bracket.xl.md](typescript/tokens/type-bracket.xl.md)**：
类型位的 `[` 收成 `ArrayType`（`T[]`）/ `TupleType`（`[A, B]`）/ `IndexedAccessType`（`T[K]`）。

| 缺口 | 根因 | 触发形状 |
| --- | --- | --- |
| `T[]` / `[A, B]` / `T[K]` 都只落成裸 `Bracket`，`[A, B]` 还**时好时坏**（有时是值位的 `ArrayLiteral`） | 类型位压根没有方括号这条规则；`JsonArrayReorganization` 对类型位与值位一视同仁 | `Dirent<X>[]`、`readonly [A, B]`、`A["k"]` |
| `Dirent<X>[]` 曾被收成**元组** | 空括号有**两种来路**：`(A \| B)[]` 前面是另一个括号（`IsArrayAt` 判否、留成 `Bracket`），`Dirent<X>[]` 前面是 `GenericType`（判是、收成 `ArrayLiteral`）。只认 `Bracket`、或者把包装单元留在树里，同一种写法就长出两种树 | 真实语料 7 / 3 处 |
| `T extends [infer A, infer B] ? …` 里 `extends` 被当成**被操作的类型** | 判据只排了符号，没排「**引出类型**的词」（`extends` / `is` / `as` / `satisfies` / `in` …） | `type-cond-multiple-infer` |

**新增 [typescript/tokens/type-operator.xl.md](typescript/tokens/type-operator.xl.md)**：
类型位的 `keyof` / `readonly` / `unique` 连同操作数收成 `TypeOperator`，`typeof` 收成 `TypeQuery`。

| 缺口 | 根因 | 触发形状 |
| --- | --- | --- |
| `keyof T` / `readonly T[]` / `unique symbol` 没有节点 | 词升级成 `Keyword` 就停了，说不清它把后面那个类型变成了什么 | `type A = keyof B` |
| 类型位的 `typeof x` 有时落成**值位**的 `<UnaryOperator op="typeof">` | 类型那一段在**它的括号关闭那一刻**先跑过一趟通用队列，那时 `UnaryOperatorReorganization` 已经折了一元运算；类型队列跑起来时裸词已经没有了 | `ReturnType<any[][typeof Symbol.iterator]>`（`iterators.d.ts`，长期挂在口径里） |

**判据收口**：`IsTypeContainerUnit` / `IsTypeOperandUnit` / `IsTypeMemberStart` / `IsEmptyContentUnit` /
`IsOwnContentRange` / `IsTypeIntroducerWord` / `WordText` 七个共享函数落在
[text-common-util.xl.md](typescript/text-common-util.xl.md)——两条规则用**同一个答案**，
不再各写一份近似（`type-union.xl.md` 的 `FindExtendsIndex` 记过同一个教训）。
它们唯一问的是「**我的父亲是哪一类节点**」，**时序无关**；「往上找祖先」那条路走不通，
`DecideBracketContext` 那一节记过三次失败。

### 第 66 轮顺手牵出的四处真 bug

它们都不是「缺标签」，而是**树本身错了**；八把尺子里只有 `cases:align` 看得见——这一轮还把它加严了一层：
新标签登记进 `REVERSE` 之后，「缺节点」那一侧才开始报出 `ArrayType` / `TupleType` / `IndexedAccessType`。

| 缺口 | 根因 | 触发形状 |
| --- | --- | --- |
| **`readonly (A \| B)[]` 整段塌成一次假调用**：`<Method name="readonly">` | `MethodReorganization` 不认得「只出现在类型位的修饰词」；`readonly` 又不在 `BanedMethodNames` 里 | 真实语料 `typescript.d.ts` 4 处 |
| 成员位的 `readonly (…)` **绕过禁用表**那一支照样成立 | `MethodDeclarationReorganization` 对成员体**刻意放开**禁用表（`class A { if() {} }` 是合法的），那条豁免必须单独挡掉五个类型运算符 | `interface R { references?: readonly (R \| undefined)[] }`——整条成员被收成一个 `<MethodDeclaration name="readonly">`，`[]` 还被当成返回类型 |
| **三元表达式跨语句配对**：`const a = x ? "t" : "f";` 换行 `const c: number[] = [];` 之后，第一条三元把后面几条语句整段吞掉 | `TernaryOperatorReorganization` 往前找 `?` 用的是「一路扫到列表开头」，不认语句边界 | 产物里只剩一个 `<Statement>`、`number[]` 长不出 `ArrayType`（自己的产物 `dist/ts/typescript/tokens/string/string.ts` 实测） |
| **`satisfies` 右边的类型文本整片不跑类型队列** | `Satisfies` 是第 53 轮加的类，当时只搬了 `As` 的判定与收集，**漏了构造器里那句挂队列** | `const y = [1, 2] satisfies number[]` 的 `number[]` 停在裸 `Bracket` 上 |

修法：

- **两个类型运算符词补进 `BanedMethodNames`**（`readonly` / `unique`）：它们在值位几乎不可能当方法名，
  而漏掉的代价是整段类型塌掉。`new` / `abstract` / `typeof` **不能**一起补——
  `class A { new() {} }` 里的 `new` 是合法方法名（`lex-keyword-method-name.ts` 钉住这一条）。
- **成员体那一支单独挡**：只挡 `readonly` / `keyof` / `unique` / `asserts` / `infer` 五个词，
  一样不能照抄 `IsTypeModifier`（它含 `new` / `abstract` / `typeof`）。
- **往前找 `?` 时遇语句边界就停**：新增 `QuestionIndexBefore`，`;` 与
  `Statement.IsLineBreakBoundary` 都算边界；`Previous` 与 `Process` 共用它。
  多行三元（`cond` 换行 `? a` 换行 `: b`）不受影响——换行前是操作数、换行后是 `:`，判据给「不是边界」。
- **`Satisfies` 挂类型队列**：与 `As` 完全同款；共用的是判定与收集，节点自己的队列必须各挂一次。
- **`IsTypeModifier` 补认 `Keyword`**、**`IsTypeBracketPosition` 的修饰词那一支修掉差一格**
  （见 `text-common-util.xl.md` 的两节）：`readonly (B | undefined)[]` 里的括号类型与联合因此才成形。

回归用例 8 条：`type-bracket-three-nodes`、`type-operator-nodes`、`stmt-ternary-statement-boundary`、
`expr-satisfies-type-queue`、`expr-value-position-not-type`（值位对照组），
另加两条把已修形状钉在案上（`type-tuple-readonly` 系列与 `ty-indexed-keyof` 的期望值随之加严）。

**收尾复检又抓到第五处**（删掉产物从零重建、再用断言脚本逐条复核时才露出来）：
`KeywordReorganization` 与 `LetReorganization` 造新单元时**没有抄 `Parent`**
（`ReplaceCountAt` 只做 `splice`，`Token.Add` 才设 `Parent`）。这个漏抄平时看不出来——
绝大多数规则只读自己的 `Data`；可这一轮的两条新规则**要看「父亲是哪一类容器」**，于是当场咬人：
`type A = keyof typeof h` 里第二趟的 `keyof` 问到 `IsTypeContainerUnit(null)`，外层运算符不成形，
**两层只成了一层**（`TypeOperator` 计数 3 而不是 4）。两处都改成抄被替换单元的 `Parent`——
「还没挂上去（`Parent === null`）」这个信号因此原样保留，`unary-operator.xl.md` 第 57 轮那条
「`Parent === null` 的 `typeof` 不折一元运算」不受影响（全绿实证）。
教训写进 `keyword.xl.md` / `let.xl.md` 的同名小节：**造单元就要把 `Parent` 抄上**。

**这一轮新暴露、留给下一轮的两处**（都是同一个根因：**条件类型真分支里的类型实参**）：

- `util.d.ts:1567` 的 `T["options"]`：`ApplyOptionalModifiers<T["options"], { [L in keyof T["options"]]: … }>`
  外面套着条件类型，`ConditionalType` 收尾**早了一步**——`{ … }` 落到括号里成了 `ObjectLiteral`
  （`cases:align` 里 `ObjectLiteral in Bracket` 那 6 处里有它，原来登记成「解构模式」是**错登记**）；
- `lib.es2019.array.d.ts:19` 的元组类型：同一个形状，`F<A, [-1, 0, …][D]>` 里泛型实参段没成形。

两处都只影响**那一个类型实参**，内容没丢（`cases:lossless` 全绿），登记进 `cases:align` 的缺节点方向。

### 第 66 轮（续）：类型层收尾 —— 条件类型真分支、模板字面量、字面量类型

上一节收尾时 `cases:align` 还挂着**缺节点 2 类**与**已登记的真缺口 3 类**（模板字面量里的
联合 1 / 交叉 2、`ConstructorType` 1）。这一轮把它们全部清掉，并顺手把**字面量类型**补上——
`cases:align` 的缺节点方向现在是 **0**，未登记的标签占用也是 **0**。

| 缺口 | 根因 | 修法 |
| --- | --- | --- |
| `T extends U ? F<A, B> : C` 里 `F<A, B>` **泛型段不成形**（连带 `util.d.ts` 的映射类型被读成 `ObjectLiteral`、`lib.es2019.array.d.ts` 的元组类型丢掉） | `generic-type.xl.md` 的 `IsTypePosition` 逆扫时把条件类型的 `?` 当成**值位边界**，于是那次试读只允许后继是 `(`，`F<A, B>` 后面的 `:` 过不了后继闸 | `?` 与 `.` `,` `\|` `&` 一样**透明**（继续往前找真正的边界：类型位会撞上 `extends`，值位会撞上 `=` → `let`/`const`，那里后继闸只放行 `(`，`a ? b < c > d : e` 照旧读成比较） |
| `interface I { [sym]?<K>(error: Error): void }` 整条成员降级成 `Field` + `Signature` | 名字闸只认 `Identifier`，而这里是**计算成员名**（`ArrayLiteral` / `[` 括号）+ `?` | 名字闸多认一支「`?` 前面的计算成员名」（`events.d.ts` 实测 2 处） |
| 模板字面量类型里的联合 / 交叉不成形（`` type X = `a${"x" \| "y"}b` ``） | 插值段内容在**字符串收尾之前**重组，那一刻往上找不到类型容器 | 新增 `IsTemplateTypeContent`：插值段的外层 `String` **已经在父列表里**，所以问「这个 `String` 在前面一格是什么」（与括号同一套 `IsTypeBracketPosition`）。值位的 `` `${a \| b}` `` 照旧不成形（第 62 轮的取舍保留） |
| 映射类型 `as` 子句里的模板键（`` as `get${K & string}` ``）仍不成形 | `IsTypeBracketPosition` 见到 `as`（一个 `Identifier`）直接判值位 | `as` / `satisfies` / `is` / `extends` 后面**一定是类型**，加入类型位信号（`readonly` / `keyof` 这些修饰词仍走原来那一支——它们还要看自己前面是不是类型位） |
| `F extends abstract new(...args: any) => any ? F : undefined` 被收成一个**没有名字的方法声明**，它的 `ReturnType` 再把条件类型的 `? :` 吃成值位三元 | `MethodDeclarationReorganization` 的形参表判定不看后面是什么 | 形参表后面是 `=>` ⇒ 那是**函数 / 构造类型**（`../function-type.xl.md` 接手），不是方法声明 |
| 类型位的字面量**没有专属标签**（`type X = "a"` 与 `const x = "a"` 在树里分不出来） | 没有这条规则 | 新增 [typescript/tokens/literal-type.xl.md](typescript/tokens/literal-type.xl.md)：`LiteralType`，全语料 13110 处里覆盖 12947 处 |
| 字面量类型里的数字只认十进制（`IsNumber` 不管 `0x…`） | —— | 规则自带数字判据：十六进制 / 二进制 / 八进制 / 指数 / 数字分隔符 / `BigInt` / `d`·`f` 后缀；**不改 `IsNumber`**（它还被泛型名字闸用着）。少了这一条 `cases:align` 的 `LiteralType` 缺 3097 处 |
| `-1` 在类型位只有 `1` 被包起来 | 类型位的 `-` 与数字**不会**被折成 `UnaryOperator`（折叠规则在通用队列上，那时文本已经装进类型容器） | 带符号数字**成对**收进 `LiteralType`（`-` 与数字一起），TypeScript 那边的 `LiteralType > PrefixUnaryExpression` 按位置登记 |
| 函数体里 `return [ … ]` 的数组字面量被当成元组、里面的字符串被包成字面量类型（实测 36 处） | `DecideBracketContext` 爬到**函数头**，撞上返回类型标注的 `:` ⇒ 判成类型位 | 两条：①爬到花括号时**先停**，答案就是那个花括号自己处在哪（它的 `Context` 开括号时就算好了）；②`function f(): string {` 这种「冒号前面是形参表、冒号与花括号之间还有返回类型文本」的花括号是**体**（值位） |
| 映射类型的键里嵌套的类型不成形（`[K in keyof any[]]`、`[L in keyof T["options"]]`） | 键括号被 `JsonArrayReorganization` 收成 `ArrayLiteral`，而值位的数组字面量**绝不能**算类型容器 | 新增 `IsMappedKeyBracket`（内容里有没有 `in` 标记）当判据。一开始用 `ArrayLiteral.Context === "type"`，实测不可靠（值位也会被误答成类型位，27 处误包） |
| 条件类型约束里的带符号字面量（`Depth extends -1 ? … : …`）整条认不出来，落成值位三元 | `FindExtendsIndex` 回扫到裸的 `-` 符号就停 | `-` / `+` 放行（与 `.` 同一支） |

回归用例 7 条：`type-literal-type`、`expr-value-not-literal-type`、`type-cond-generic-in-true-branch`、
`type-mapped-key-nested-type`、`decl-interface-computed-optional-method`、`type-fn-ctor-in-conditional`、
`stmt-return-array-not-tuple`。

### 第 66 轮（第三批）：推断类型、可选调用、以及量具的两处失真

这一批的目标是「每个 TypeScript 构造都有对应标签」，先把 `cases:align` 的缺口清到 **0**，
再逐个把「另有归属」的口径升级成专属节点。

| 缺口 | 根因 | 修法 |
| --- | --- | --- |
| `cases:align` 的 `Method in TypeQuery` **144 处假阳性** | TypeScript 6 里 `SyntaxKind.ImportType === LastTypeNode`（**同一个枚举值 206**），`SyntaxKind[kind]` 把导入类型印成 `"LastTypeNode"`，`REVERSE` 里写的 `"ImportType"` 永远匹配不上 | `align.mjs` 加 `kindName()`：用 `ts.isImportTypeNode` 按**语义**正名 |
| `xl:absent Method` 在完全正确的产物上误报 | `run.mjs` 用 `xml.includes("<" + tag)` **子串匹配**——`Method` 命中 `MethodDeclaration` / `MethodBody`，`Class` 命中 `ClassBody`，`For` 命中 `Foreach` | 改成精确标签匹配（`<Tag>` 或 `<Tag `） |
| 类型位的导入类型没有专属节点（`TypeQuery` 多套一层、`Method` 借位，共 **169 处**） | TS 6 把 `typeof import("x").Y` 收成**一个** `ImportType`（`typeof` 是它的标志位） | 新增 `import-type.xl.md`：`[typeof] import("m")[.A.B]` → `<ImportType>`；**值位**动态 `import()` 仍是 `<Method>`；规则还要认**裸形状**（类型实参段里没有调用规则） |
| 泛型参数表没有专属节点（`TypeParameter` 缺 **2102 处**） | 参数表整段留成 `<GenericType>` 里的散单元 | 新增 `type-parameter.xl.md`：映射键 `[K in T]` 与参数表 `<T extends X = Y>` 都收成 `<TypeParameter>`；参数表与实参段用三条判据区分（顶层 `extends`/`in`/`=`、父单元是成员体、`<` 前名字再前面是声明头关键词），都不成立就保持 `GenericType` |
| `infer X` 没有节点（`TypeParameter` 残留 **86 处**） | `infer` 后面的名字在 TS 那边就是一个 `TypeParameter` | 新增 `infer-type.xl.md`：`<InferType>` 里配一个 `<TypeParameter>`；挂**类型队列与通用队列两个地方**（`infer` 常住在函数类型形参里，那里只有类型队列跑得到） |
| 条件类型整条认不出来 | `FindExtendsIndex` 回扫撞上**已经成形**的 `InferType` / `TypeParameter` 就停 | 两者按透明处理（与 `Bracket` / `GenericType` 同一支） |
| 可选调用 / 非空断言调用没有调用节点（**6 处**） | `NullConditionalOperator` 把实参表吞了（判据锚在「名字 + `(`」，看不到括号）；`b!()` 的被调者是 `NotNull`（判据只认 `Identifier` / 括号） | 新增 `optional-call.xl.md`：两支都收成同一个 `<Method>`（TS 那边同为 `CallExpression`）；**父单元已是 `Method` 就不再收**——否则每趟 `TryToClose` 再包一层，实测爆栈 |
| 参数表约束里的联合 / 交叉消失（`UnionType` 1 → **52**、`IntersectionType` 1 → **3**） | `type-union.xl.md` 有**自己**的一份容器白名单，没认新节点 | 白名单补 `TypeParameter` / `InferType`（`interface I<T extends null \| Writable>` 的约束就在它们里面） |
| 构造类型的参数表（`new <T>(…) => …`，1 处） | 参数表判据只认声明头关键词 | 补 `new` / `abstract`（后面紧跟 `(`） |
| 用例声明「这段源码不是合法 TS」（**15 处**） | TS 6.0.3 自带的 parser 在 ASI 歧义处报错并读错形状（`class C { a = 1` 换行 `` [`m`]() {} ``） | 按**文件级**口径登记（`// xl:ts-invalid`），并在缺节点那一节**单独报出条数**，不让它变成万能免罪符 |

回归用例 10 条：`type-import-type`、`expr-dynamic-import-not-type`、`type-parameter-list`、
`type-parameter-mapped`、`cls-decorator-calls`、`cls-method-not-call`、`type-infer`、
`expr-optional-call-nodes`、`type-parameter-constraint-union` 等。

**清完之后的账**：`cases:align` 的**缺节点方向是 0**（那一节只打印「（没有）」），
未登记的标签占用也是 **0 类**；余下 16 类全是逐条登记的**口径**（解构模式、ASI、
成员位 `abstract new`、映射类型的 `in`/`as`、模板字面量类型残渣……各有理由）。

### 第 66 轮（第四批）：类型谓词、元组成员、枚举成员 —— 以及一处**真误判**

这一批接着清「另有归属」：`TypePredicate` / `OptionalType` / `RestType` /
`NamedTupleMember` / `EnumMember` 逐个补上专属节点。顺带抓出并修掉一个**真误判**。

| 缺口 | 根因 | 修法 |
| --- | --- | --- |
| 返回类型位的 `x is T` / `asserts x is T` / `asserts x` 没有节点 | 整段只是 `TypeDefine` 里的散单元（`is` 只是一个关键词） | 新增 `type-predicate.xl.md`：整段收成 `<TypePredicate>`；起点两处（容器第一个实义单元、**紧跟函数类型的 `=>`**——`(value: T) => value is S` 实测一大片） |
| **元组里的 `?` 与 `name:` 被配成三元运算符**（真误判） | 三元规则只看「前面有没有 `?`」，而元组的可选标记 `A?` 与具名元素的 `:` 正好凑成一对 | 两道：`IsTypePosition` 多认**父单元是类型容器**（元组是 `TupleType`）；问号后面紧跟 `,` / `]` / `)` ⇒ 它是**可选标记**不是条件问号。修前 `type T = [A?, ...B, C, name: D?, ...rest: E[]]` 整条被切成一串嵌套 `<TernaryOperator>` |
| 元组成员四种形状看不出来 | 元素摊平成散单元 | 新增 `tuple-member.xl.md`：`OptionalType`（`A?`）/ `RestType`（`...B`）/ `NamedTupleMember`（`name: D?` / `...rest: E[]`）；**普通元素照旧不包**（TS 也不给节点）。两处细节：`...` 可能已被收成 `Spread`（要**摊开**装进 `RestType`，否则报 `Spread in RestType` 4 处）；具名元素的 `:` 可能已被收进 `TypeDefine`（只认裸 `:` 会漏 12 处具名成员、还把两个具名变长元素误收成 `RestType`） |
| 枚举成员没有节点（1292 处） | 成员表摊平在 `EnumBody > Statement` 里 | 新增 `enum-member.xl.md`：按顶层逗号切成 `<EnumMember>`；**容器只认 `EnumBody` 里那个 `Statement`**——一开始还认了 `EnumBody` 自己，结果整张表先被包一层、成员各自再包一层（实测 `<EnumMember><EnumMember>A = 1</EnumMember></EnumMember>`）。成员挂通用队列，`A = 1 \| 2` 的位运算与 `= -1` 的一元运算照常成形 |
| 谓词与条件类型**互相套娃**（`RangeError: Maximum call stack size exceeded`） | `FindStart` 回扫越过了 `is`，把参数名也吃进条件里（`x is A extends B ? C : D` 的条件成了 `x is A`），条件类型里于是再匹配一次谓词 | `FindStart` 在 `is` 处停；谓词规则再加「父单元是 `ConditionalType` 就不收」 |

回归用例 5 条：`type-predicate`、`type-predicate-in-function-type`、`enum-members`、
`type-tuple-members`、`type-tuple-optional-not-ternary`（钉住那处真误判）。

**账**：`cases:align` 依旧是未登记标签占用 **0 类**、缺节点 **`（没有）`**。

### 第 66 轮（第五批）：索引签名、括号类型 —— 以及一处**枚举成员的真回归**

| 缺口 | 根因 | 修法 |
| --- | --- | --- |
| **索引签名借字段节点**（`{ [k: string]: T }` 收成 `<Field name="k">`） | 它与字段在成员表里同形，`FieldReorganization` 先接手了 | 在 `field.xl.md` 里**分流**：名字是「`[` + 标识符 + `:`」时为 `IndexSignature`（新节点，挂通用队列）。三条判据细节都是实测逼出来的：名字可能是 `Bracket`（第一趟）也可能已是 `ArrayLiteral`（第二趟）；冒号可能已被收进 `TypeDefine`；计算成员名 `[Symbol.iterator]` / `[cond ? a : b]` 要排除（头两个实义单元不是「标识符 + 冒号」）。方括号按 `ArrayType` 的先例消费掉 |
| **括号类型没有节点** | 类型位的 `(A \| B)` 就是一个 `Bracket` | 新增 `parenthesized-type.xl.md`：父单元是类型容器、且**不是函数类型的形参表**时，把括号收成 `ParenthesizedType`。三条「不是形参表」的守卫：后面紧跟 `=>`；父单元是函数类型 / 声明类节点；括号里顶层有 `TypeDefine` |
| **枚举成员把 JSDoc 注释也包进去了**（真回归，66 处） | 成员表按顶层逗号切段时，注释（`AreaAnnotation` / `LineAnnotation`）落在段里，跟着一起被包进 `<EnumMember>` | 注释是 TS 的 **trivia**、不属于任何节点：遇到就把当前段收掉、注释原样留在容器里。`cases:align` 的 **占用方向**抓出来的（前一轮只看了缺节点那一节，漏了它）——`tuple-member.xl.md` 同款修一遍 |
| **旧用例钉的是旧口径** | `lex-member-index-signature` / `type-object-index` / `type-object-index-readonly` 三条用例的期望写着 `Field` | 随设计变更更新为 `IndexSignature`（只读索引签名现在多一个 `Keyword` 子单元） |

回归用例 3 条：`type-index-signature`、`type-parenthesized`、`expr-value-paren-not-type`（值位对照）。

**账**：`cases:align` 未登记标签占用 **0 类**、缺节点 **`（没有）`**。

### 第 66 轮（第六批）：形参标签统一 —— 全语料 31904 处，以及为了落地而修的量具

**做了什么**

| 改动 | 说明 |
| --- | --- |
| **形参一律收成 `Parameter`** | 五个宿主：`FunctionType` / `Signature` / `MethodDeclaration` / `Function` / **`NewType`（构造签名）**；箭头那一支本来就由 `lamda.xl.md` 收（标签从 `LamdaParameter` 统一成 `Parameter`，与 TS 一致）。`cases:align` 的 `Parameter` 缺 **31904 → 0**，而且那条位置登记**已经删掉**（不是靠遮蔽过关） |
| **索引签名里的参数**也收成 `Parameter` | `{ [key: string]: T }` 的 `key: string` 在 TS 那边就是 `IndexSignature > Parameter`；由 `field.xl.md` 的分流现造一个 |
| **构造签名的判据**（实测逼出来的两条） | ①构造签名的形参表挂在 `NewType` 里（值位 `new Foo(1)` 的 `NewType` 装的是被调者名字）；②**还要要求括号里有顶层冒号**——`new (getCtor())()` / `new (class {})()` 把被调者括起来时 `NewType` 里同样是一个括号，只按「第一个子单元是括号」判会把实参误当成形参（实测 `Parameter in Bracket` 3 处） |
| `NewType` 补队列 | 它原来没有队列，`ParameterReorganization` 锚在那个括号上、改的是括号自己的 `Data`，没人扫描 `NewType` 的内容就永远收不出来（实测缺 934 处） |

**为了落地顺带修的量具**：接线之后 `cases:boundaries` 报出一处 `<Parameter>` 横跨两条重载
（`@types/node/url.d.ts`）。用检查器自带的调试开关能看到它把那个形参的区间算成了 8779→12801
（4000 多字符），而**产物树里那个形参的区间本来是对的**。根因是 `locateLeavesStrict`
拿 XML 的叶子去贴源码 token 时会向前跳一格。修法（`boundaries.mjs`）：

- 报「合并」之前，先用**产物树自己的 `SourceRange`** 复核一次：真的有一个**非容器**单元
  横跨那里、**而且它没有越过下一条语句的结尾**吗？
  （后半句是必须的：本工程的 `Statement` 会把一整块如命名空间体包成一个单元，
  那种「容器式横跨」不是合并。）
- 复核掉的条数**单独报出来**，不混进真问题也不藏起来：
  `（另有 1 处是 XML 定位漂移：产物树自己的区间里并没有单元横跨那里，已复核排除）`。

接线后：`cases:boundaries` 回到 **0 处**、`cases:align` 缺节点 **`（没有）`**、
`cases:run` 999 条全过、无损性 0 丢失。

回归用例：`types/type-parameter-nodes.ts`（五处宿主各一个形参）、
`types/type-index-signature-parameter.ts`（索引签名里的参数）。

### 第 66 轮（第七批）：继承段有了节点 —— 顺手修掉两个**一直没生效**的地方

| 缺口 | 根因 | 修法 |
| --- | --- | --- |
| `class C extends B implements I, J` 的继承段只是散单元 + 一个 `implements="I,J"` 属性 | TS 那边是 `HeritageClause` + `ExpressionWithTypeArguments`（全语料 4631 处） | 新增 `heritage-clause.xl.md`：锚在 `extends` / `implements` 那个词上，宿主是 `Class` / `Interface`；子句装成 `<HeritageClause>`，段里每个实体名（含类型实参 `L<M>`）装成 `<ExpressionWithTypeArguments>` |
| `interface K extends L<M>, N` 的**名字与逗号被规则消费掉**，只留一个 `GenericType` | 接口的 `extends` 扫描只把类型实参段搬进节点 | 让那段扫描把 `extends` 词、每个实体名、逗号也搬进来（它们落在 `ReplaceCountAt` 的替换区间里，不搬就消失） |
| **接口的队列从来没跑过** | `InterfaceReorganization.Process` 一直没调用 `TryToClose`（构造器注释写着「挂了队列是为了让 `extends` 升成 `Keyword`」，但收尾漏了） | 补上收尾。两个症状一起消失：`extends` 终于升成 `Keyword`；继承段终于能被规则收到 |
| 匿名类表达式 `const C = class extends B {}` 的 `extends` **词本身没进产物** | `class` 后面直接是 `extends`，`Process` 把它当成「名字位」，循环从它**之后**开始 | 名字位上是 `extends` 时不跳过它（实测 7 处，三类用例） |
| `class G extends (Base) {}` / `extends mixin(C)` | 子句终点原本把 `(` 也当边界 | 只把 `{` / `ClassBody` / `InterfaceBody` / 下一个 `implements` 当终点（括号属于实体名） |

回归用例：`types/type-heritage-clause.ts`（类 / 接口 / 匿名类表达式 / 括号化继承表达式四处）。

**账**：`cases:align` 未登记标签占用 **0 类**、缺节点 **`（没有）`**；
那条 `ExpressionWithTypeArguments` 的旧遮蔽登记（「由 HeritageClause + GenericType 承接」）也一并删掉了。

### 第 66 轮（第八批）：解构绑定有了节点 —— 顺手补上 `Let` 一直缺的队列

| 缺口 | 根因 | 修法 |
| --- | --- | --- |
| `const { a, b: c, d = 1 } = obj` 的**模式不进产物**（只有一个自闭合的 `<Let objectPattern="a,b,c,d,1" />`） | `LetReorganization` 把模式括号整段留在替换区间里、随 `ReplaceCountAt` 一起消失；属性里那串名字是**给人读的递归补全**，`{` `}` `:` `=` 与「这是几个绑定元素」全都没有节点 | 把模式括号搬进 `Let`；`Let.ToXmlString` 对解构两种形态改成**带子单元**；新增 `binding-element.xl.md` 把元素按顶层逗号收成 `<BindingElement>` |
| **`Let` 没有队列** | 它的构造器只转调基类，`TryToClose` 跑的是空队列——模式元素永远收不出来（与上一批接口那处「队列没跑过」同一类问题） | 挂通用队列 |
| `...rest` 在元素里是 `<Spread>` | TS 的子节点是 `DotDotDotToken` + 名字，不是 `SpreadElement` | 装进元素前把 `Spread` 摊开（与元组 `RestType` 同一做法，实测 5 处） |
| 形参默认值里的 `{}` 被误认成模式 | `function f({ a = 0 }: T)` 的默认值也是 `{}` | 只认**形参首位**那个（TS 也是 `Parameter > ObjectBindingPattern`）；剩余参数的 `...[value]` 放行 |
| `catch ({ message })` 的绑定没节点 | 模式的宿主是 `CatchDefine`，不在名单里 | 加进宿主名单 |
| `const { b: c } = x` 的 `:` 被读成类型标注 | `TypeDefineReorganization` 对任何 `:` 都成立 | 加守卫：父单元是 `BindingElement` 时不凑 `TypeDefine`（那是**重命名**，不是类型） |
| `ObjectBindingPattern` / `ArrayBindingPattern` 的宿主 | TS 用这两个 kind，本工程用 `ObjectLiteral` / `ArrayLiteral`（同形） | 把两个 kind 加进对应标签的构造集合；`.tsx` 文件级口径（JSX 不在范围内）也在这里登记 |

回归用例：`decl-binding-elements`（对象 / 数组 / 形参 / catch 四处）；`decl-obj-destructure-nested` 的期望随设计更新。

**账**：`cases:align` 未登记标签占用 **0 类**、缺节点 **`（没有）`**。

### 第 66 轮（第九批）：`PropertyAccessExpression` 试做后回退（附**精确落点**）+ 台账卫生

**试做了什么**：给值位的成员访问 `a.b` / `this.x` / `f().g` / `a[0].b` 收一个
`<PropertyAccessExpression>`，链式按 TS 的方式左结合嵌套（`a.b.c` = `(a.b).c`）；
类型位不收（`A.B.C` 在 TS 那边是 `QualifiedName`，另一个构造）；`?.` 天然不命中
（本工程的可选链是 `NullConditionalOperator`）。规则排在**通用队列最后一位**，
让所有既有规则先看到原形——产物实测正确：

    const v = a.b.c;   →  <PropertyAccessExpression><PropertyAccessExpression>a.b</…>.c</…>
    const w = this.x;  →  <PropertyAccessExpression><Keyword>this</Keyword>.x</…>
    const y = f().g;   →  <PropertyAccessExpression><Method name="f"/>.g</…>
    type T = A.B.C;    →  不动（类型位限定名）

**为什么回退**：挂上去之后 `cases:align` 从「未登记 0 类」变成 5 类误包 + 2 类新缺节点，
而且缺节点是大面积（2908 处）：

| 类型 | 条目 | 说明 |
| --- | --- | --- |
| 新误包 | `ArrayLiteral in Method` 12 / `PropertyAccessExpression in TypePredicate` 3 / `ArrayLiteral in TernaryOperatorTrueStatement` 2 / `PropertyAccessExpression in Statement` 2 / `ArrayLiteral in SwitchCompare` 1 | 新节点改变了若干**既有口径的父标签**（与第 5 批那次「父标签改名」同一类问题，只是这次面更大） |
| 新缺节点 | `PropertyAccessExpression` 2908 / `SpreadElement` 9 | 2908 处未覆盖：`?.` 链、被 `Spread` / `TypePredicate` / 语句层包住的那些形状都要单独处理 |

按「不把红尺子留在仓库里」的原则，这一批**整体回退**（规则文件已删、两处注册已撤、`REVERSE` 条目已撤），
但把上面这份落点写在这里：下一次要接的话，**先处理那 5 类误包的父标签改名**、
再按 2908 处样本逐类补覆盖，然后才谈挂上去。

**顺带确认的一件事**：箭头函数的解构形参（`({ a, b }) => …` / `([x, y]) => …`）
现在已经是 `<Parameter><ObjectLiteral><BindingElement>…` ✓（第八批的副产品），
所以那两条 `… in Bracket` / `… in Parameter` 口径已经**不会再命中**。

**台账卫生**：清掉 5 条因本会话改动而失效的口径条目；把 `ArrayLiteral in Statement`
的文字改准（样本其实是**值位下标访问**的方括号被 `JsonArray` 收成了 `ArrayLiteral`，
原来写成「元组类型」，与样本不符）。

### 还剩什么、怎么接（第 66 轮收尾时写下的交接说明）

明列的构造（`ImportType` / `ParenthesizedType` / `TypePredicate` / `IndexSignature` / `TypeParameter` /
`OptionalType` / `RestType` / `NamedTupleMember` / `HeritageClause` + `ExpressionWithTypeArguments` /
`Parameter`，外加顺带做的 `InferType` / `EnumMember` / `BindingElement`）**都已经有专属节点并登记进
`cases:align` 的 `REVERSE`**，两条判据（未登记缺节点 0、17 个脚本全绿）与「产物可复现」每次实测都成立。
剩下三块都**不在**上面的明列清单里，而且各自需要先做一个设计决定：

| 剩什么 | 语料规模 | 需要先定的事 |
| --- | --- | --- |
| `TypeReference` | 39118 | **要不要 boxing**：给每个类型引用（`Foo` / `Array<T>`）套一层节点，等于给类型层再加一层包装。好处是与 TS 一一对应；代价是产物体量与所有类型规则的匹配面都要重新过一遍（现在的口径是「类型文本由 `TypeDefine` 承接」，`cases:align` 里登记为位置口径）。**建议先只做「带类型实参的引用」这一半**（`Array<T>` 的 `GenericType` 已经有了，只是没有一个包住名字+实参的节点），看扰动再决定要不要铺开 |
| `PropertyAccessExpression` | 5919 | **已试做、已回退**，落点见上一节：先处理 5 类「父标签改名」的误包，再按 2908 处样本逐类补覆盖（`?.` 链 / 被 `Spread` 或 `TypePredicate` 或语句层包住的形状） |
| 模板字面量类型的 span | 36 | 现在由 `<InterpolationString>` 承接（值位与类型位同一个标签）。要不要给**类型位**那一个单独一个 `TemplateLiteralTypeSpan`——判据现成（`IsTemplateTypeContent`），但它要挂到 `String` 自己的队列上，而 `String` 目前没有队列 |

**验收口径不会因为「没做这三块」而变松**：`cases:align` 里这三块的 TS 侧构造要么根本没有标签映射
（模板 span），要么是逐条登记的位置口径（`TypeReference`），要么已被上一节的回退恢复原状（成员访问）。
也就是说：`align` 现在报的「未登记 0 类 / 缺节点 0」是**真的**，不是靠遮蔽得来的。

### 第 66 轮（第十一批）：拿刁钻形状压已落地的标签 —— 抓到一处误收

**做法**：把前九批每个新节点都用最刁的写法压一遍（导入类型出现在映射键 / 裸类型 / `typeof` 里、
括号类型与数组/交叉/构造类型混写、谓词带 `asserts`、索引签名嵌套、映射键带 `as` 模板、
类型参数带约束与默认值、元组里 `a?: A` 与 `...b: B[]` 并存、枚举成员带移位与字符串、
形参带 `this` / 解构 / 默认值 / 剩余、继承段带限定名与泛型与括号化表达式、
解构带默认值与嵌套与剩余），固化成两条用例：`types/type-new-nodes-adversarial.ts`、
`declarations/decl-binding-computed-key.ts`。

**抓到的真问题**（一个）：`const { [k]: v } = o` 里计算属性名的 `[k]` 被 `BindingElement` 规则**误收**
——`[k]` 是 TS 的 `ComputedPropertyName`，里面的 `k` 是**表达式**、不是 `ArrayBindingPattern`。
产物原来是 `<BindingElement><ArrayLiteral><BindingElement>k</BindingElement></ArrayLiteral> : v</BindingElement>`。
修法：判据是「括号**紧跟一个 `:`**」（模式的括号后面只会是 `,` / `}` / `]` / 结尾）→ 跳过。
修完 `{[k]: v}` 与嵌套的 `{[k2]: {a}}` 都正确了。

**两处查证后判定「不是问题」的**（记下来免得下次再查一遍）：

| 形状 | 结论 |
| --- | --- |
| `type F = [a?: A, ...b: B[], c: C?]` 里 `a?:` 的 `?` 不在产物 XML 里 | **与普通 `:` 同一约定**：`TypeDefine` 承接「类型标注」这个构造、不重画冒号/问号；TS 那边 `QuestionToken` 是 token 不是构造。另外 TS 对 `...b: B[]` 用的也是 `NamedTupleMember`（不是 `RestType`），与本工程一致 ✓ |
| `class C<in T, out U>` 里 `in` 成了 `<Keyword>`、`out` 还是 `<Identifier>` | **有依据**：TS 的**扫描器**只把 `in` 当关键词（`InKeyword` / `OutKeyword` 在 AST 里都有，但 `out` 是上下文修饰、词法上仍是 Identifier）→ 与产物一致，不动全局关键词表（动了会把普通标识符 `out` 也升成 Keyword） |

**账**：`cases:align` 未登记标签占用 **0 类**、缺节点 **`（没有）`**。

### 第 66 轮（第十二批）：语句层/类/表达式再压一轮 —— 又抓到一个真缺口

**做法**：把语句层、类、表达式那一面也用刁钻写法压一遍（静态块 / 计算属性名方法 / 存取器 /
参数属性 / `asserts` 谓词 / `this` 形参 / 泛型箭头与泛型函数类型 / 标签 / `do-while` /
`switch` 穿透 / 命名空间嵌套 / `as const satisfies` / 剩余解构 / 逗号表达式 `for` / 非空断言 /
可选链混合 / `new (getCtor())()` / 只读索引签名），固化成 `statements/stmt-adversarial-shapes.ts`。

**抓到的真缺口（1 处，已修）**：`const g2: <T>(x: T) => T = (x) => x` 里的 `<T>` **没升成 `TypeParameter`**。
根因：类型参数规则的闸门有三条出口，这一支**一条都不满足**——`<T>` 的父单元是 `TypeDefine`（不在
「成员/函数/函数类型/箭头」那张名单里）、`T` 上既没有 `in` / `=` 也没有 `extends`（`HasTopLevelMarker` 不成立）、
它**前面什么都没有**（不像 `type F = <T>…` 前面有 `=`，所以 `IsExpressionParameterList` 也不成立）。
补的判据是「**后面紧跟一个 `(` 括号**」——这正是「类型参数表 + 形参表」的形状（泛型函数类型 / 构造类型）。
修完 `let g2: <T>(x: T) => T`、`type F = <T>(x: T) => T`、`class C<K> { m<V>(a: V): V }` 三处都对，`align` 回到 0/0。

**同一轮里发现、但**没在这轮修**的另一处（记在这里，别让它悄悄躺着）**：
类型字面量里的**泛型调用签名** `const h: { <T>(x: T): T }` —— `<T>` 连 `GenericType` 都没成形
（产物里是裸的 `<` / `T` / `>`），所以类型参数规则看不到它。TS 那边是
`CallSignatureDeclaration > TypeParameter`。**它现在不在语料里**，所以 `cases:align` 不会报它——
这不是「被遮蔽」，是「还没进语料」；下次要接的话：先让类型字面量体里的 `<…>` 能收成 `GenericType`
（判据：`<` 前面是 `{` / `;` / `}` / 换行，后面跟着 `(`），再把这行加进上面那条用例。

### 第 66 轮（第十三批）：把上一批留下的那处补齐 —— 成员开头的类型参数

上一批结尾记着一处「发现但没修」的缺口：类型字面量里的**泛型调用签名** `const h: { <T>(x: T): T }`，
`<T>` 连 `GenericType` 都没成形（产物里是裸的 `<` / `T` / `>`），TS 那边却是
`CallSignatureDeclaration > TypeParameter`。这一批把它补上了。

**根因**：`GenericTypeReorganization` 的「名字闸」有三支——宿主的最后一个子单元是 `Identifier`
（`Array<T>` 这种）、或是一个**操作数起点**（`=` / `=>` / `:` / `;` / `,` / 一段括号 / 软换行）、
或是「名字 + `?`」（可选成员签名）。而成员开头的 `<` 是那条成员**第一个**单元，
**前面什么都没有**——三支一条都不成立。

**修法**：补一支「**宿主还是空的**也算类型参数段」，理由与「操作数起点」那一支完全相同
（这个位置上按定义还没有操作数，`<…>` 只可能是类型参数段）。实测：

```
const h: { <T>(x: T): T }        →  <Signature kind="call"><GenericType><TypeParameter>T</TypeParameter></GenericType>…
interface Y { <T>(): T }         →  同上（接口体里也补上了）
const k: { new <T>(x: T): T }    →  本来就成形（`new` 那个词在宿主里，走的是另一支）
const c = a < b > c              →  仍是裸符号 ✓（对照，没被误判成泛型）
```

回归用例：`types/type-generic-signature.ts`（上面四种形状 + `type Z = <T>(x: T) => T` + `const m = <T,>(x: T) => x`）。

### 第 66 轮（第十四批）：模块层与字符串/模板层压一轮 —— **没有新缺口**

把模块层与字符串/模板层的刁钻写法压了一遍（`declare module "m" { export = X }` / `declare global` /
`import type { A as B } from "m"` / `export type { C } from "m"` / `export * as ns from "m"` /
命名空间里的 `export import M = K` / `declare namespace O { const v: unique symbol }` /
`declare module "*.css"` / `export default class {}` / 模板字面量类型 `\`a\${B}c\``、`\`a\${B | C}d\``、
`\`\${number}-\${string}\``、值位模板嵌套 `\`a\${ \`inner\${Q}\` }b\``），固化成
`modules/mod-adversarial-shapes.ts`。

结果：**一处缺口都没抓到** —— `cases:align` 的「未登记标签占用」与「缺节点」两节都没有列出这个文件，
无损性 / 结构 / 边界三把尺子也都没报。也就是说第九~十三批立起来的那一整套（类型位模板里的联合、
导入类型、命名空间体、导出节点……）在这一面已经**站得住**了。

这一批唯一的产出是那条用例本身（1006 条）——它是**回归防线**：以后有人动模块层或字符串层，
这十几条形状会立刻把变化照出来。

### 第 66 轮（第十五批）：组合场景压一轮 —— 抓到一处**带栈溢出陷阱**的缺口，已回退并记录

把组合场景压了一遍（条件类型套条件类型、映射类型里套条件类型与模板类型、`infer` 出现在对象类型属性位 /
函数类型返回位 / 泛型实参位 / 带约束的 `infer X extends Y`、装饰器叠在泛型方法上），
固化成 `types/type-combination-adversarial.ts`。

**抓到的缺口（1 处，未修，原样记在这里）**：

```ts
type Deep<T> = T extends (infer U)[] ? Deep<U> : T;
```

`(infer U)` 被 `ParenthesizedType` 包住之后，`infer U` **收不出 `InferType`**（连带缺一个 `TypeParameter`）。
同一行的 `Promise<infer V>` 是好的——差别就在那层括号。复现：

```
node tests/parse/probe.mjs "type D<T> = T extends (infer U)[] ? D<U> : T;"
```

**试过的修法与为什么回退**：`InferTypeReorganization` 的闸门要求「容器在 `IsTypeContainerUnit` 白名单里」，
而白名单**恰好没有 `ParenthesizedType`**（括号类型本来就是类型容器，看着像漏项）。往白名单里补一行之后：

- 目标形状确实好了；
- 但语料里 **47 个文件解析时抛 `RangeError: Maximum call stack size exceeded`**（`@types/node/http.d.ts` 等），
  立刻回退。

这是**同一类陷阱的第二次**：第 5 轮那次（谓词 `x is A` 与条件类型互相递归）也是这样——把某个标签
加进「类型容器」白名单，会让两条规则互相把对方当成容器而无限套下去。**下次要接的话，不要动全局白名单**，
改成只让 `InferTypeReorganization` 自己多认一种容器（局部放宽），并且先跑一遍全语料确认不再抛
`RangeError`。这条形状现在不在语料里（不在 `cases:align` 的检查范围内），但它**不是被遮蔽**：
上面那行复现命令谁都能跑。

### 第 66 轮（第十六批）：去修那处 `(infer U)[]` —— 结论是**症结不在闸门**，已回退

按第十五批写下的路子（不动共享白名单、只在本规则内放宽）动了 `InferTypeReorganization`，两次都**没有生效**：

| 试法 | 结果 |
| --- | --- |
| 认「父亲是 `ParenthesizedType`、祖父是类型容器」 | `infer U` 仍是裸的 `Keyword` + `Identifier` ✗ |
| 再认「父亲是 `(` 括号、祖父是 `ParenthesizedType`、曾祖是类型容器」（实测产物确实是两层：`<ParenthesizedType><Bracket>(</Bracket><Keyword>infer</Keyword>…`） | 仍然 ✗ |

**两次都没抛栈溢出**（无损性 1377 文件 0 异常 ✓），但也都没修好——**说明症结不在闸门条件**：
`infer` 与名字装在那对 `(` `)` 里，而**这条规则的队列到不了那段内容**
（括号里的单元从来没有被 `InferTypeReorganization` 扫过）。要修得先解决「谁扫括号里的内容」，
那已经超出「放宽一格」的范围，所以本轮**把两处编辑整体回退**（不把不生效的守卫留在仓库里），
只留下这份诊断。

复现（产物里 `infer U` 是散单元、没有 `InferType`）：

```
node tests/parse/probe.mjs "type D<T> = T extends (infer U)[] ? D<U> : T;"
```

下一次要接的话：先查 `ParenthesizedTypeReorganization` 造出括号之后、有没有给那个 `Bracket`
挂上能扫到 `infer` 的队列（对照：`Promise<infer V>` 能成形，是因为它在 `GenericType` 里，
而 `GenericType` 的内容是有队列扫的）。

> **第 67 轮接上了**：症结确实在「谁扫括号里的内容」——换父之后重跑一遍括号自己的队列，
> 判据用「父单元是 `ParenthesizedType`」这个**事后信号**。见下一节。

### 第 67 轮：括号类型的内容 · 空元组 · 以及尺子的三处盲区

这一轮从「离完整解析 TypeScript 还差什么」出发，先量后改。抓到**两块真缺口**（其中一块
文档里一直记着「症结不在闸门」）、**一处新构造的误读**，并在过程中发现
`cases:align` 的三处盲区——**尺子比解析器更需要先修**。

#### 一、括号类型里的类型文本（含第 66 轮留下的 `(infer U)[]`）

`(keyof T)` / `(readonly U[])` / `(unique symbol)` / `(typeof x)` / `([A, B])` /
`(C["k"])` / `("a")` / `(1)` / `(infer U)` / `((A))` —— **写在圆括号类型里的这些写法一个都不成形**：

```
type A1 = (keyof X);    →  原来：<ParenthesizedType><Bracket><Keyword>keyof</Keyword><Identifier>X</Identifier>…
type A5 = ([A, B]);     →  原来：<…><ArrayLiteral>…（元组被读成值位数组字面量）
type P10 = T extends (infer U)[] ? U : never;   →  原来：<Keyword>infer</Keyword><Identifier>U</Identifier> 散着
```

真实语料里就有：`typescript/lib/lib.es2015.collection.d.ts` 的
`new <K, V>(entries?: readonly (readonly [K, V])[] | null): Map<K, V>;` ——
内层那对括号里的 `readonly` 与 `[K, V]` **一个节点都没有**（`TypeOperator` 缺、
`TupleType` 缺，而外层那个 `TypeOperator` 在 `cases:align` 里按**区间重叠**把它认领掉了）。

**根因是时序，不是判据写错**：括号的内容在**括号关闭那一刻**就重组完了，
那一刻它的父单元还是语句列表（插桩实测：`infer` 被问到时 `parent=Bracket grand=Root`），
而「这个括号是括号类型」这件事发生在**之后**（`ParenthesizedTypeReorganization` 在它前面那一格
看到 `:` / `=`→`type` 时才接手）。所以：

- **判据**：`IsTypeContainerUnit` 增加一支——父单元是 `Bracket`、且**它的父单元是 `ParenthesizedType`**
  时，括号里的内容就是类型文本。这是**事后信号**，只在括号真被认成类型时出现。
- **让它生效**：`ParenthesizedTypeReorganization.Process` 在 `AddAndCloseLast`（换父）之后
  **重跑一遍那个括号自己的队列**——那一趟的规则都按形状认，对已经成形的形状一律不动。

**试过、退回来的一版**：把判据写成「括号自己那一格按前文判」（复用 `IsTypeBracketPosition`）。
它把 `,` 与 `(` 也算类型位信号（类型实参表 / 形参表需要它们），于是值位实参里的
`f(a, ([x]))`、多行调用的 `bar,` 换行 `[1, 2],` 会被判成类型位，**数组字面量当场变成元组**。
事后信号这一版对值位一个字都不命中（回归用例 `expr-value-paren-not-type-array` 钉住）。

顺带把**第 66 轮留下的两处残渣一起带走了**（它们都是同一个根因）：
`typescript.d.ts` 的 `F extends abstract new(...) => any ? F : undefined`（`FunctionType` 缺）、
`util.d.ts` 的 `{ [longOption: string]: … }`（被读成 `ObjectLiteral`）、
`iterators.d.ts` 的 `any[][typeof Symbol.iterator]`（类型位 `typeof` 被折成一元运算）、
以及模板字面量类型插值段里的联合 / 交叉——`cases:align` 的「已登记不产节点」里
这五类现在都消失了。

#### 二、空元组 `[]`（13 处，被尺子的宽别名表遮住）

`TypeBracketReorganization.Previous` 原来要求「空方括号左边必须有操作数才算类型」
（为了「`[]` 单独出现不是类型」）。可这一层**已经在类型容器里**了
（`IsTypeContainerUnit` 是上一道闸），类型容器里的空 `[]` 只可能是**空元组**：

```
next(...args: [] | [TNext]): …            // lib.es2015.generator.d.ts
Generator<T, TReturn, TNext> 的 `[]`       // lib.es2015.iterable.d.ts
```

**13 处**在真实语料里，产物是裸括号。修法是那条判据直接去掉（空括号进 `Process` 之后，
左边有操作数走 `ArrayType`、没有走 `TupleType`，两条路本来就分好了）。

#### 三、尺子的三处盲区（这一轮真正值钱的部分）

| 盲区 | 后果 | 修法 |
| --- | --- | --- |
| `REVERSE.ArrayLiteral` 里挂着 `"TupleType"` | 元组早就有自己的标签，这条别名等于给「元组没成形」发免罪符——它真的遮住了上面那 13 处空元组 | 删掉别名（删掉后当场报出 13 处，现已全修） |
| `REVERSE.Method` 里挂着 `"ImportType"` / `"TypeQuery"`；`TypeLiteral` / `Field` 里挂着 `"MappedType"`；`TernaryOperator` 里挂着 `"ConditionalType"`；`As` 里挂着 `"SatisfiesExpression"` | 同类：这些构造都已经有专属标签，宽别名表让「标签被别的形状占用」永远看不出来 | 逐个删掉；实测**一处真缺口都没有新增**（说明它们是历史遗留、不是口径），只有 `Method in ImportType`（175 处，`<ImportType>` 里嵌着的调用壳）浮出来，**按位置登记进 `ALLOWED_EXTRA`**——登记看得见，别名看不见 |
| `--all` 时标题写的是 `rows.length`，而 `rows` 此刻**包含**已登记口径 | 同一个数字随开关变化（12 类已登记口径被报成「未登记 12 类」） | 标题按 `!allowed` 单独数 |
| 语料里**漏了 `node_modules/undici-types`** | 其余六把尺子一直把它算进语料，只有这一把漏——`@types/node` 依赖的 44 个 `.d.ts`（`fetch.d.ts` / `dispatcher.d.ts` / `webidl.d.ts` …）从来没被「构造 ↔ 标签」这一步查过。**一个只查一半语料的探针，报出来的「0」也只对一半语料成立** | 补进语料；补完实测仍是未登记 0 类 / 缺节点 0（语料 1351 → 1395 个文件） |

教训与第 66 轮那两条（`kindName()` 的枚举别名、`run.mjs` 的子串匹配）同类：
**宽口径的登记本身就是尺子的盲区**；「缺节点 0」这句话只有在标签表收干净之后才算数。

#### 四、`import defer * as ns`（TS 5.9 延迟导入）与 import-equals 的两个属性

`import defer * as ns from "m"` 原来把 `defer` 读成**默认导入名**（`defaultImport="defer"`、
`namespace=""`）。`defer` 是相位修饰词，不是名字——但判据必须带上**后面紧跟 `*`** 这半条：
`import defer from "./defer.js"` 是**合法的默认导入**，名字就叫 `defer`，
无条件跳过会把它读丢（回归用例 `mod-import-defer` 两条都钉住）。

**import-equals 的两个属性**（`import fs = require("fs")` / `import type x = require("m")` /
`export import A = B`）一并修了：

- `From` 一直是**空串**——`Process` 找 `String` 时只看直接子单元，而走到那里时
  `require("fs")` 已经被 `MethodReorganization` 收成一个 `Method`，那个 `String` 是它的子单元。
  修法是新增 `FindStringUnit`，**递归**进子单元按文档顺序取第一个。
- `defaultImport` 被填成**别名**（`fs`）——TS 那边 `ImportEqualsDeclaration` 里
  根本没有「default import」这个位置。修法是 `ReadClause` 认「第二个单元是 `=`」就早退。

两条都不是「解析不出来」（内容一直没丢），是**结构化属性读歪**：下游按
「默认导入 + 路径」读，会把 `import fs = require("fs")` 读成 `import fs from "fs"`。

#### 五、三片段组合探针抓到的两处「整份文件解析失败」

`cases:fuzz.mjs` 是**两两**拼接（9 上下文 × 4 分隔 × 215² 片段），这一轮新加的
`cases:fuzz3.mjs` 把它改成**三个**片段相邻（抽样 20 万次，固定种子可复现）。
它第一次跑起来就报出两处**整份文件解析失败**——两两拼接里一个都不出现：

| 形状 | 现象 | 根因与修法 |
| --- | --- | --- |
| `type H = number` 换行 `try { } catch { }` | `TryReorganization` 抛 **「next is not Bracket」** | `TypeLiteralReorganization.IsTypePosition` 的回扫**跨过换行、跨过 `try`**，一路撞上 `type` ⇒ 把 `try` 的语句体收成了一个 `TypeLiteral`。修法是回扫遇到**语句边界**即停——判据复用 ASI 那一条（`Statement.IsLineBreakBoundary`），多行类型的排版（`type T =` 换行 `{ … }`、联合成员换行）照旧成立 |
| `{` 换行 `x => x` 换行 `[1, 2, 3]` 换行 `a += 1` 换行 `}` | `JsonArrayReorganization.Process` 抛 **「没有父单元」** | 与第 52 轮 `JsonObjectReorganization.Process` 那一条**同一个形状、同一个理由**（复合赋值的展开让列表改短、那个 `[` 成了孤儿），可守卫当时只加到了**对象**那一支。补上数组这一支的早退：**先保住内容再让步** |

两处都进了用例（`stmt-type-alias-then-try`、`am-block-lambda-array-compound`），
并常驻 `recon2.mjs` 的片段表（`edge-type-alias-then-try` / `edge-type-alias-then-try-finally` /
`edge-block-lambda-array-compound`）。`fuzz3.mjs` 也**常驻**成第 18 个 npm 脚本
（`npm run cases:fuzz3`）：它不当判据，但与 `fuzz.mjs` 一样，是「构造与构造相邻」那一面的哨兵。

#### 这一轮的账

| 判据 | 结果 |
| --- | --- |
| `cases:run` | 1014 条用例全部通过，台账在案缺口 **0** 条 |
| `cases:align` | **未登记标签占用 0 类、缺节点 0**（标签表已收干净、语料已补齐，见上表） |
| 其余六把尺子 + 六把探针 | 全绿（无损性 1384 文件 0 丢失、结构 0 不符、边界 0 横跨、噪声 0 空节点；`fuzz3` 9.7 万组合可疑 0 类） |

回归用例 7 条：`type-paren-content-nodes`（11 种括号内容）、
`expr-value-paren-not-type-array`（值位对照）、`type-empty-tuple`、`mod-import-defer`、
`mod-import-equals-from`、`stmt-type-alias-then-try`、`am-block-lambda-array-compound`；
另把 `type-new-nodes-adversarial` 的 `ParenthesizedType` 由 4 改成 5——
`((A))` 的**内层**括号现在也成形（TS 那边就是两层 `ParenthesizedType`，
原来的 4 是把「内层不收」这个 bug 写进了期望值）。

### 还剩什么（第 67 轮收尾时重排）

第 66 轮列的三大块里，**模板字面量类型的 span** 与 **`TypeReference`** 仍是设计取舍，
**`PropertyAccessExpression`** 仍是「试过、已回退」（落点见上一节）：

| 剩什么 | 语料规模 | 现状 |
| --- | --- | --- |
| `TypeReference` | 39118 | 类型引用由 `TypeDefine` / `GenericType` 承接（`align` 的 `TypeReference` 口径）。**不产节点不影响解析**：名字、类型实参、位置都在 |
| `PropertyAccessExpression` | 5919 | 值位成员访问 `a.b` 由 `Identifier` + `SymbolToken` 平铺承接（与上同）。第 66 轮试做后回退，理由与落点写在那一节 |
| 模板字面量类型的 span | 36 | 由 `<String>` + `<InterpolationString>` 承接（值位与类型位同一个标签）。判据现成（`IsTemplateTypeContent`），缺的是「挂到 `String` 自己的队列上」，而 `String` 按设计没有队列 |

**这三块都不是「解析不出来」**：它们是「标签粒度」的选择——内容、位置、括号归属、
语句边界全都对。`cases:align` 的这两条口径是**逐条登记在案**的，不是靠宽别名遮的
（这一轮刚把宽别名清干净）。

### 第 68 轮：全量复核（不修解析器，只把「0」问到站得住）

这一轮的诉求是**确认没有任何缺口**。做法是把十八个脚本从头到尾重跑一遍，并且**不只看退出码**——
`cases:diff` 是探针不是判据（它没有退出码，怎么跑都是 0），所以它的表要逐行读。结果两条：

1. **一处量具口径过期（已修）**：`cases:diff` 的 `Field` 一行报 **+119**。
   逐文件独立复核（自己数 TS 的 `PropertySignature` / `PropertyDeclaration` / `IndexSignatureDeclaration`
   与产物的 `<Field>` / `<IndexSignature>`）：TS 侧 20363 = `<Field>` 20244 + `<IndexSignature>` 120 − 1，
   **净额 −1，不是正项**。根因是 `differential.mjs` 的映射表没跟着标签表走：
   索引签名第 66 轮（`238327f`）起有自己的 `<IndexSignature>`（`index-signature.xl.md`），
   映射表里还写着 `IndexSignatureDeclaration → "Field"`，于是 120 处索引签名被算成「Field 没成节点」。
   修法是那一行改成 `"IndexSignature"`——**量具的口径必须与标签表同源**，
   否则「没有任何一项差额为正」这句话会随标签表演化悄悄失真（这句话在 README 里躺着，
   上一次为真已经是加 `IndexSignature` 之前了）。
2. **一处 0 是「语料覆盖」的 0，不是「已修」的 0**（如实写进状态表）：
   `{ A }a += 1` / `x = 1 { A }` 这种「块紧贴下一条语句、中间既没有 `;` 也没有换行」的形状，
   产物里两条 TS 语句仍是一个 `<Statement>`；把它单独喂给 `cases:boundaries`
   是 **1 处横跨、退出码 1**。语料（真实 `.d.ts` + 本项目产物 + 1014 条用例）里没有这个形状，
   所以那一行报的 0 覆盖不到它——**这是第 63 轮就写在「已知缺口」里的那条**，
   本轮只是把它从「正文里的一句话」提到「状态表的同一行」，不让 0 被读成「这一类已经没有了」。
   加换行或 `;` 都正确（实测），所以它只在**极端排版**（压缩成一行）里出现。

两条都不需要动解析器。**结论**：台账在案缺口 0、未登记口径 0、八把尺子（除上面这条覆盖边界外）全绿；
「没有任何缺口」在**已登记的语料 + 已登记的口径**上成立，在「任意形状」上不成立——
差的就是上面第 2 条那一类，它一直登记在案。

### 第 69 轮：AST JSON 出口（第二个出口，与上游 Cangjie 同源）

这一轮加的是**产物自己的第二个出口**，不是解析能力：`cjcli <文件> --ast-json` 打一棵与 XML
同源、但形状照上游 Cangjie `Token.ToDictionary` / `Token.ToList` 的 JSON（规格见
[docs/ast-json.md](docs/ast-json.md)）。上游那 33 处 `ToDictionary` 覆写逐个搬了过来
（本工程最终是 **37 个 token 类 + 基类**，因为本工程的标签比上游细），
**只有一处刻意与上游不同**：键名一律与**本工程的 XML 属性同名**，而不是上游的
`MethodName` / `StartBracketChar` 那套 PascalCase——本工程的 XML 出口本来就与上游叫法不同
（`name` / `startBracket`、`Identifier` 对 `Common`），JSON 跟着上游只会让同一棵树的两个出口
**在本工程内部**对不上。差异逐条记在规格文档里。

三处踩过的坑（都记在代码注释与规格里）：

1. **`JSON.stringify` 对 `Map` 静默给 `{}`**——`ToDictionary` 返回的是 `Map`，
   所以必须有一步显式的 `Map` → 普通对象（`Token.ToPlain`），否则整份产物是 `[{},{},{}]`
   （第一版实测就是这样，而且**不报错**）。
2. **同名子元素在不同父亲下的待遇不同**：`<ReturnType>` 在 `Lamda` 里是 `returnType` 段，
   在 `MethodDeclaration` 里却是普通子单元（跟着 `children` 走）。尺子的分段表因此**按父亲分组**。
3. **`Switch.segments` 与 `For.initial` 的「段元素」含义相反**：前者装的是 `<SwitchSegment>`
   元素本身，后者装的是 `<ForInitial>` 的**内容**。分段表里用一个 `unwrap` 标记区分。

新增的第九把尺子 `cases:astjson` 就是为了让这三处不再复发：它把两个出口折算成同一种形状后
逐节点比对，并带 5 种变异的 `--self-test`。**自检第一版是假的**——它拿「根数组前两个节点互换
类型」当变异，而两个根节点本来就是同一个类型（两条 `<Statement>`），互换等于什么都没做；
改成「把某个节点的类型改成它父亲的」之后才有牙。另外 `samples/check.mjs` 顺带钉住了「入口」：
`cjcli` 进程与库 API 解析同一份源码，两条路的输出必须逐字节相同。

这一轮由尺子自己抓出来的两处**真缺口**（不是口径，是漏节点）：

| 缺口 | 根因 | 修法 |
| --- | --- | --- |
| `Foreach` 的 JSON 比 XML 少一个节点（`for await (x of xs)` 里的 `await`） | 分段写法只写了 `define` / `enumable` / `body` 三段，**段之外直接挂在 `Foreach` 上的子单元**（`await`）没有出口 | `ToDictionary` 末尾按「不属于三条段的那些」兜底收一遍 `children` |
| `Lamda.body` 在 JSON 侧是**一个节点**、在 XML 侧是**一批子单元** | 体段取了 `ToDictionary()`，而其余所有段都取 `ToList()` | 统一成 `ToList()`（包装元素 `<LamdaBody>` 与其它段一样不出现） |

两条都不需要动解析器，XML 产物一个字节都没变（八把尺子全绿、`samples` 的 XML 夹具无 diff）。

### 第 70 轮：成员访问链进 token 层（真实语料 93.0% → 94.4%）

`cases:tsast` 的缺口榜上，最大的一块一直是**表达式层的成员访问**：真实语料里
`PropertyAccessExpression` 缺 **4077**、`CallExpression` 缺 **1263**，加上
`Identifier` 那一栏里同源的一千多处。它们**不是投影层的账**——投影层的折链逻辑
（第 22 / 25 轮）本身是对的，缺口全来自 token 层把链**劈开了**：

```
x.y !== z   →   Identifier(x)  SymbolToken(.)  Identifier(y)  SymbolToken(!==)  Identifier(z)

`!==` 那一趟向左右各取一格 ⇒ 拿到 x 与 z ⇒
产物：Identifier(x)  SymbolToken(.)  BinaryOperator(y !== z)
                     ↑ 点号被夹在运算符节点外面，链的两头各挂在一处
```

同样被劈开的还有 `a + options.Error`（`+` 先折走 `options`）、
`content.charCodeAt(0) === 0xfeff`（`===` 的左操作数是 `Method`，链底留在外面）、
`typeof x.y`（一元规则拿走了 `x`）、`x.y!`（非空断言拿走了 `y`）……
**根因只有一个**：所有运算符规则都只看**紧邻的那一个单元**，而链条在它们眼里是一串平级单元。
投影层救不回来——树上已经是「半个链 + 一个运算符节点」，再拼就是猜。

**修法是给 token 层加一条成员访问链规则**（新增
[typescript/tokens/property-access.xl.md](typescript/tokens/property-access.xl.md)，
`PropertyAccess` + `PropertyAccessReorganization`，注册在 `WrapSymbolReorganization`
之后、复合赋值与一元/二元之前）。链在运算符规则看到它之前就是一个单元，
于是 `x.y !== z` 里 `!==` 的两侧都是完整的操作数：

```
<BinaryOperator op="!=="><PropertyAccess>x . y</PropertyAccess> !== z</BinaryOperator>
```

四处「只能是这么写」的判据（都写进了规范）：

1. **链尾是调用也照收**：`a.b(1)` 的 `b(1)` 先被 `MethodReorganization` 收成 `Method`，
   本规则再把 `[a, ., Method]` 收成一个 `PropertyAccess`——`CjcliHost.Fs().readFileSync(p)`
   这种「调用结果再取成员」的链必须整体成为一个操作数；
2. **一次 `Process` 收完整条**（链尾是 `Method` 时继续往后走）：第一版在 `Method` 处停下，
   `a.b(1).c.d` 于是被折成两个平级的 `PropertyAccess`，投影层再也拼不回左结合的嵌套；
3. **它自己不装通用队列**（只装「关键字升级」那条）：`Data` 的第一个单元就是链底，
   `Previous` 对它照样成立——装通用队列会**自己折自己**，一路套到爆栈。
   装关键字队列是因为成员名可能是关键字（`a.import`），不装就停在 `Identifier` 上
   （两条既有用例 `expr-member-named-import` / `-qualified` 断言的正是 `<Keyword>import</Keyword>`）；
4. **三条让路**：纯类型容器里不折（`A.B` 在类型位归投影层的 `QualifiedName`）、
   括号类型的内容不折（括号在关闭那一刻重组，那时祖父还不是 `ParenthesizedType`，
   只有 `IsTypeBracketPosition` 问得出来）、链尾紧跟 `?.` 时不折（那一支归
   `NullConditionalOperatorReorganization`，折了会把它的节点挤到外面）。

**尺子当场抓出来的第二处**（这一轮唯一一次「改对了一处、改坏了另一处」）：
链折起来之后，`logicalOperator.Data[0]` 里那个 `[` 的**前一个单元**从 `Identifier`
换成了 `PropertyAccess`，而 `JsonArrayReorganization.IsArrayAt` 的「前一个是操作数 ⇒
这是元素访问」名单是按类型列的——名单里没有新类型，于是 **35 处下标访问被收成了数组字面量**
（`cases:align` 报出三处未登记的标签占用）。补上 `PropertyAccess` 之后 align 回到
与改动前**逐条相同**的 14 类口径。

量化（同一批 1385 个真实语料文件 + 1001 条用例）：

| 判据 | 改动前 | 改动后 |
| --- | --- | --- |
| `cases:tsast` 真实语料（同 kind 同区间） | 93.0% | **94.4%** |
| `cases:tsast` 用例语料 | 81.4% | **82.1%** |
| 其中**字段名也一致**（真实语料） | 98.9% | 98.8% |
| 投影后仍缺 `PropertyAccessExpression` | 4077 | **672** |
| 投影后仍缺 `CallExpression` | 1263 | **182** |
| 投影后仍缺 `BinaryExpression` | 888 | 668 |
| 投影后仍缺 `Identifier` | 4350 | 3493 |
| 用例 | 1014 条全通过 | **1017 条全通过**（新增 3 条钉住本轮） |

新增的三条用例分别钉住：运算符两边的完整操作数（`expr-member-chain-operand`）、
链中间的调用之后再取成员（`expr-member-chain-call-tail`）、
以及链尾的下标访问仍然是 `Bracket` 而不是 `ArrayLiteral`（`expr-member-chain-index`）。
九把尺子（`run` / `diff` / `dashboard` / `lossless` / `structure` / `boundaries` / `noise` /
`astjson` / `align`）与五把探针（`sweep` / `recon` / `recon2` / `fuzz` / `fuzz3`）全绿，
`samples` 三份夹具按新形状重生成（只有 `declarations` 里那条 `this.…` 链变了形状）。
这一轮点名的四条目标（`Block` / `TypeReference` / `ConstructSignature` / 逻辑运算符 token）
里，第 1 条与第 4 条在**第 71 轮**清掉了，见下一节。

### 第 88 轮：二元链的结合性与优先级 · 三元的两个标点（漂移 1655 → 744）

上一轮点名的「`BinaryExpression` 654 多 + 657 漂移是一件事」，这一轮证实了，而且是**两处**：

**一、右结合 vs 左结合**。`error !== null && error !== undefined && typeof error === "object" && …`
那种四段逻辑链，产物折成了**右结合**（`a && (b && (c && d))`）——四个 `BinaryExpression` 的起点
落在四个操作数上；而 TS 是**左结合**（`((a && b) && c) && d`），四个节点**都从第一个操作数起**、
终点逐个增长。两处都要改：

- `foldBinaryFrom`：赋值仍**右结合**（`a = b = c` ⇒ `a = (b = c)`），其余二元运算符**左结合**，
  且每一段的右操作数只取到**下一个同级（或更低优先级）**运算符为止；
- `projectBinary`（`LogicalOperator` 单元那一支）：原来取**第一个**运算符再把右边整段递归——
  同一个右结合的病。

顺带补了 `operatorRank`（优先级表）：**切分要切在优先级最低的运算符上**，同级取最左。
`x && y || z` 的 TS 是 `(x && y) || z`，按第一个运算符切会得到 `x && (y || z)` ✗。

**二、三元的 `?` / `:` 位置差一格**（`DRIFT: ColonToken` 158 + `DRIFT: QuestionToken` 127）。
产物树里 `TernaryOperator` 只有三段、标点没有单元，原来是「按上一段末尾合成」的——
而 `endOf` 是**闭区间**（最后一个字符的下标），于是两个 token 都落在标点**前一格**上。
改成从源码里**量**（在两段之间扫那个标点，中间一般还有空白）：新增 `punctBetween`。

| 判据 | 第 87 轮 | 现在 |
| --- | --- | --- |
| 区间漂移 | 1640 | **744** |
| 多出来的节点 | 4116 | **3149** |
| 缺节点 | 5916 | **5872** |
| 字段名不符 | 270 | 270 |
| 完全一致的文件 | 81 / 385 | 81 / 385（这些账落在那几个文件之外） |
| `cases:run` / `cases:check` | 1035 / 1035 | **1035 / 1035** |
| 其余八把尺子 + `samples` | 全绿 | **全绿** |

#### 下一批

`ExpressionStatement` 305（成员位那层壳，样本 `: never;`）、`IfStatement` 115 漂移 + 224 多出
（`else {` 那一支：区间偏短，且 `else if` 链多出一个节点）、`DRIFT: Parameter` 104、
缺 `Identifier` 1441（样本仍是 `typeof globalThis.atob` 那一族，说明我只补了 `exprName`、
里面的两个 `Identifier` 还没落位）。

### 第 87 轮：具名导出的成员（缺 6091 → 5916，字段名不符 362 → 270）

`export { a as b, c, type D }` 的产物是 `[Keyword(export), Bracket{ a as b, c, type D }]`，
TS 那边是

    ExportDeclaration[0,29)  exportClause:NamedExports[7,28)
                             └ elements: ExportSpecifier[9,15)  propertyName:a  name:b
                                         ExportSpecifier[17,18) name:c
                                         ExportSpecifier[20,26) name:D（`type` 是标志、不进子节点）

照通用投影会把括号里每个单元（**包括 `as` 与 `type` 两个词**）投成平级子节点，
`ExportSpecifier` 一个也投不出来。新增 `namedExportClause` + `namedExportSpecifiers`
（与 `namedImportSpecifiers` 同形，多一处「段首 `type` 要跳过、但区间从段首算」）。

**顺带修掉一个把整支漏掉的判据**：`projectStatement` 原来只在 `kids.length > 1` 时才把
`Export` 开头的语句交给 `projectExport`（那条判据是为 `export = X` / `export default X`
写的，它们的表达式是 `Export` 单元的平级兄弟）。可具名导出的语句里**只有 `Export` 一个单元**
（`{…}` 在它里面）——`> 1` 把它漏给了通用投影。改成 `>= 1`。

| 判据 | 第 86 轮 | 现在 |
| --- | --- | --- |
| 缺节点 | 6087 | **5916** |
| 字段名不符 | 362 | **270** |
| 多出来的节点 | 4223 | **4116** |
| 区间漂移 | 1540 | 1640（**语料churn**：`dist/ts/**` 就在语料里，本轮改动让 `ts-ast.ts` 自身变了形状） |
| 完全一致的文件 | 81 / 385 | 81 / 385（这四个方向都改到了的那几个文件另有别的账） |
| `cases:run` / `cases:check` | 1035 / 1035 | **1035 / 1035** |
| 其余八把尺子 + `samples` | 全绿 | **全绿** |

#### 下一批

`BinaryExpression` 654（漂移 657 与它是同一族：`error !== null && error !== undefined` 那种
逻辑链的区间比 TS 宽，样本 `undici-types/webidl.d.ts` 的联合还有「运算符那格没进树」的残缺节点）、
`ExpressionStatement` 307（成员位那层 `Statement` 仍未摊开，样本 `: never;`）、
`IfStatement` 219（`else {` 那一支的区间比 TS 短）。

### 第 86 轮：枚举成员 · 嵌套链摊平 · `NotNull` 的标签名（完全一致 79 → 81 / 385）

这一轮四处，第一处是**共享根因**（一轮换掉两千八百个多余节点）：

**一、枚举体也是成员表**。`export enum CommandTypes { JsxClosingTag = "jsxClosingTag", … }`
的产物里有一个 `<Statement>` 壳，装的是 `[EnumMember, SymbolToken(,), EnumMember, …]`。
第 79 轮那套「成员位摊平」没管它，因为**两道门都没开**：

- `MEMBER_LIST_KINDS` 里没有 `EnumDeclaration`（只有 `InterfaceDeclaration` / `TypeLiteral` / `ClassDeclaration`）；
- 就算开了，那一层 `every` 守卫也不认成员之间的 `,`（只认成员标签）。

于是那个 `,` 把整串成员折成一个 `BinaryOperator`，投出来是
`ExpressionStatement > BinaryExpression(EnumMember, CommaToken, EnumMember)` ✗——
「多出来」榜的第一名 `BinaryExpression` 1806 与第二名 `CommaToken` 1158 全是它。
两处都放开之后，枚举成员是干净的 `EnumMember > [name, initializer]` ✓。

**二、嵌套的链要摊平**。`this.Parent!.Data.splice(1, 2)` 的产物偶尔把**一整条链**塞进另一条链的
成员位：`[NotNull(this.Parent), ., PropertyAccess([Data, ., Method(splice)])]`，
而 TS 是**左结合**的 `((this.Parent!).Data).splice(1, 2)`。折链前先把这种嵌套摊平，
否则那一格会走「成员名」那一支、投成一个盖住整段的 `Identifier`
（实测 `Data.splice(1, 2)` 成了名字，`splice` 那次调用也丢了）。

**三、`case` 认的是产物标签，不是 TS 的 kind**（我自己踩的）。非空断言那一支我写成
`case "NonNullExpression"`——那是 `KIND_BY_TAG` 给它的**投出**名字，产物标签叫 `NotNull`，
于是这一支永远不命中，`ExclamationToken` 350 个一个都没少。改成 `case "NotNull"` 才生效。

| 判据 | 第 85 轮 | 现在 |
| --- | --- | --- |
| **完全一致的文件** | 79 / 385 | **81 / 385** |
| 多出来的节点 | 7031 | **4223** |
| 缺节点 / 区间漂移 / 字段名不符 | 6136 / 1543 / 362 | **6087 / 1540 / 362** |
| `cases:run` / `cases:check` | 1035 / 1035 | **1035 / 1035** |
| 其余八把尺子 + `samples` | 全绿 | **全绿** |

#### 下一批

`BinaryExpression` 652（样本 `undici-types/webidl.d.ts` 的 `'Boolean' | 'String'`——**类型位的联合**
在某个上下文里仍被折成二元运算，看起来是「运算符那一格没进树」的那类残缺节点）、
`ExpressionStatement` 305（成员位那层 `Statement` 仍未摊开，样本是 `: never;`）、
`Identifier` 234（`export { a as b }` 的 `as`，TS 的 `ExportSpecifier` 只有 `propertyName` / `name`）。

### 第 85 轮：类型运算符 · 映射类型 · 非空断言（完全一致 67 → 79 / 385）

这一轮按第 84 轮量出来的「多出来」榜往下压，三处都是**同一个道理**：
**TS 不把关键字 / 标点算作子节点**，而本工程把它们与操作数摆成平级单元。

| 形状 | TS 的子字段（先 dump 出来的判据） | 原来的错法 |
| --- | --- | --- |
| `keyof T` / `readonly T[]` / `unique symbol` | `TypeOperator` **只有 `type`**（那个词是属性 `operator`）：`TypeOperator[17,38) > ArrayType[26,38)`、`TypeOperator[9,22) > SymbolKeyword[16,22)` | `type` 成了两格数组（`ReadonlyKeyword` + `ArrayType`）；`unique symbol` 的操作数被投成 `TypeReference > Identifier(symbol)` |
| `{ readonly [P in keyof T]-?: T[P] }` | `MappedType` = `readonlyToken` / `typeParameter` / `questionToken` / `type`（`-?` 的那个 `-` 是 **`questionToken:MinusToken`**，`?` 不进子节点） | 那一层 `Statement` 壳被投成 `ExpressionStatement`（多出 465 个），修饰符当成它的内容 |
| `x!` | `NonNullExpression` **只有 `expression`**（`!` 是属性 `exclamationToken`） | `!` 也算进 `expression`（多出 `ExclamationToken` 350 个） |

修法：三支专用投影 `projectTypeOperator` / `projectMappedType` / `projectNonNullExpression`。
其中 `projectTypeOperator` 的操作数**必须走类型位投影**（`projectTypeExpression`）——
`unique symbol` 的 `symbol` 才会是 `SymbolKeyword` 而不是 `TypeReference`。

#### 账

| 判据 | 第 84 轮 | 现在 |
| --- | --- | --- |
| **完全一致的文件** | 67 / 385 | **79 / 385** |
| 多出来的节点 | 9528 | **7031** |
| 缺节点 / 区间漂移 / 字段名不符 | 6241 / 1532 / 373 | **6136 / 1543 / 362** |
| `cases:run` / `cases:check` | 1035 / 1035 | **1035 / 1035** |
| 其余八把尺子 + `samples`（夹具重生成） | 全绿 | **全绿** |

#### 下一批（「多出来」榜上排前面的三类其实是一件事）

`BinaryExpression` 1806 + `CommaToken` 1158：样本落在 `export enum CommandTypes { JsxClosingTag = "jsxClosingTag", … }`
——**枚举成员**。产物把 `名字 = 初值` 折成了一个 `BinaryOperator(=)`，于是投出 `BinaryExpression`
✗（TS 那边是 `EnumMember` + `name` / `initializer`），成员之间的 `,` 也跟着多出来。
接着是 `ExpressionStatement` 442（成员位那层 `Statement` 还是没摊开——第 79 轮的判据要求
「整层都是成员标签」）、`ExportSpecifier`（`export { a as b }` 的 `as` 与缺的节点 134）。

### 第 84 轮：把量具改成「和 TS 的 AST 完全一致」——以及多出来的那一万九千个节点

这一轮的起点是一句预期的收紧：**「和 `ts.createSourceFile` 的 AST 完全一致」**。
而尺子原来量不了这句话——它只报「TS 有、产物没有」（缺 + 漂移 + 字段名），
**不报「产物多出来的节点」**，也没有逐文件的判词（那一行 `逐位置完全一致的文件`
看的是 kind 序列，实测一直印 `0 个`，是个没人看得懂的读数）。所以先把量具改成这个预期的定义：

- 新增第三个方向 **`投影后多出来的节点`**：投影节点里在 TS 那边找不到同 kind 同区间的那些
  （TS 的语义节点集合是**闭的**——少一个不是完全一致，多一个也不是）；
- 新增一行判词 **`完全一致的文件 N / M 个`**：一个文件要「缺 = 0 且漂移 = 0 且多出来 = 0
  且字段名不符 = 0」才算；
- **退出码跟着改**：四个方向都为 0 才绿（原来只看「缺 + 漂移」，所以「产物多出一堆」时它照样绿）。

**第一次量出来的真实距离**（385 个真实语料文件）：

    完全一致的文件 26 / 385
    缺节点 6234（113 类）　区间漂移 1529（30 类）　多出来的节点 29143（66 类）　字段名不符 373

**多出来的那一栏是最大的方向**——29143 比缺 + 漂移加起来还多。榜首两类都是
「**TS 不把标点 / 关键字当子节点**」：

| 多出来的 | 处数 | 根因 | 修法 |
| --- | --- | --- | --- |
| `CommaToken` | **18568** | 各处平级列表（形参 / 实参 / 元素 / 成员 / 类型）把 `,` 也投了出来——而 TS 的 `parameters` / `arguments` / `elements` / `properties` 里**没有**逗号子节点（逗号**运算符**是另一回事：那种早被 token 层折成 `BinaryOperator op=","`，走 `projectBinary`，不经过列表投影） | 在 `projectEach` 的入口统一滤掉顶层 `,` |
| `ExtendsKeyword` | **2192** | `HeritageClause` 的 `forEachChild` **只访问 `types`**，`extends` / `implements` 是节点的**属性**（`token`） | 新增 `projectHeritageClause`（只出 `types`） |

这两刀之后（同一批文件）：

    完全一致的文件 67 / 385（26 → 67）
    多出来的节点 9528（29143 → 9528；CommaToken 18568 → 1158，ExtendsKeyword 2192 → 0）

**注意口径**：`cases:tsast` 现在是**红的**（退出码 1），这是它第一次如实反映「还没完全一致」；
九把尺子里的其余八把不受影响（这一轮只动投影层与这把尺子自己的读数）。

#### 下一批（多出来的节点里排前面的）

`BinaryExpression` 1806（映射类型的 `[P in keyof T]-?: T[P]` 把 `-?` 折成了二元运算、
`JsxClosingTag = "…"` 那种）、`Identifier` 1482（`import { a as b }` 里的 `as` 被当成子节点）、
`TypeReference` 1332（`unique symbol` / `readonly Uint8Array[]` 那些）、`CommaToken` 1158（剩下的
集中在映射类型）、`ExpressionStatement` 465（成员位那层 `Statement` 没被摊开——第 79 轮的摊开
判据要求「整层都是成员标签」，映射类型的成员不满足）。

### 第 83 轮：类型参数的约束 · `typeof A.B`（真实语料 98.3% → 98.4%）

`Identifier` 与 `TypeReference` 剩下的两簇，样本指向两个不同形状：

#### 一、约束被整个包进 `UnionType`

```ts
interface ChildProcessByStdio<I extends null | Writable, O extends null | Readable, …>
```

产物把一个 `<A extends null | Writable>` 收成**一个** `UnionType`——名字、`extends`、约束三段
全在它里面（`<TypeParameter><UnionType>A extends null | Writable</UnionType></TypeParameter>`）。
而 TS 那边 `TypeParameter` 是 `[name, constraint]` 两个字段、约束是**不含名字**的那个联合，
于是名字与约束两头的 `Identifier` 都没有宿主（`@types/node/child_process.d.ts` 里成片）。

修法：`projectTypeParameter` 认出「唯一子单元是 `UnionType` / `IntersectionType`」这一形态，
把那一格摊开、按同一个分隔符重新切一次；`extends` 之后那一段只是**第一个成员**，
余下的成员在同级的下一个组里——收尾时拼回一个 `UnionType`（区间取第一个成员到最后一个成员）。

#### 二、`typeof A.B` 的点号名在节点外面

```ts
declare var atob: typeof globalThis.atob;
```

产物那个 `TypeQuery` **只收 `typeof globalThis`**，点号与 `atob` 是它**外面**的平级单元；
而且它的 `exprName` 里还塞着 `typeof` 那个关键字（TS 那边它是节点的**属性**、不是子节点）。
两处都修了：新增 `projectTypeQuery`（`exprName` 只有名字），并在 `projectTypeExpression` 里
接住「`TypeQuery` + 点号 + 名字」那一串（往右套成 `QualifiedName`、区间覆盖整段）。

#### 三、这一轮踩的两个自伤（记下来，都是「单元 vs 节点」）

1. `qualifiedNameFrom` 吃的是**单元**（它自己会调 `nameOf`），我先投好再喂进去 → `node.get is not a function`；
2. `isNameNode` 判的也是**字典格**，我拿投好的节点去问 → 同样炸。

教训与第 79 轮那次 `view(view)` 同类：投影层里「单元（字典格）」与「已投出的节点」是两种东西，
判据函数各吃一种——**喂错不会报类型错**（`ts-ast.ts` 带 `@ts-nocheck`），只会在某些语料上炸。

#### 四、账

| 判据 | 第 82 轮 | 现在 |
| --- | --- | --- |
| `cases:tsast` 真实语料 | 462284（98.3%） | **463091（98.4%）** |
| 其中字段名也一致 | 461876（99.9%） | **462718（99.9%）** |
| `cases:tsast` 用例语料 | 86.0% | **87.3%** |
| 投影后仍缺 `Identifier` | 1581 | **1479** |
| 投影后仍缺 `TypeReference` | 405 | **350** |
| `cases:align`（1420 文件） | 未登记 1 类 | **未登记 1 类** |
| `cases:run` / `cases:check` | 1035 / 1035 | **1035 / 1035** |
| 九把尺子 + `diff` / `dashboard` / `samples` | 全绿 | **全绿** |

**下一轮的目标**：`PropertyAccessExpression` 429（样本集中在**模板字面量插值**与**三元分支**里，
像是那两处的链没折）、`Block` 416、`BinaryExpression` 324 + 漂移 643、`CaseClause` 188、
`CallExpression` 175、`TemplateSpan` 175 / `TemplateMiddle` 140、`ExportSpecifier` 134。

### 第 82 轮：泛型函数类型（真实语料 98.3%，+281 节点）

`Identifier` 1616 与 `TypeReference` 417 这两块老账，样本几乎全部指向**同一个形状**——
`@types/node/async_hooks.d.ts` 里那种「带类型参数的函数类型」：

```ts
static snapshot(): <R, TArgs extends any[]>(fn: (...args: TArgs) => R, ...args: TArgs) => R;
```

产物那边类型参数段与函数类型是**同一个 `TypeDefine` 里的两个平级单元**：

    <TypeDefine><GenericType>…R, TArgs extends any[]…</GenericType><FunctionType>…</FunctionType></TypeDefine>

而 TS 那边它是 **`FunctionType.typeParameters`**（区间也从类型参数段起）。投影层原来走到
「头是 `GenericType`」的通用支，只投出那个 `GenericType`（`KIND_BY_TAG` 给它的是 `TypeReference`）
——类型参数成了它的孩子、**整个函数类型被丢掉**。修法是在 `projectTypeExpression` 里认这一对
（`[GenericType(装 TypeParameter), FunctionType]`）：类型参数挂到 `FunctionType.typeParameters`、
`pos` 推到类型参数段的起点。

同一处还顺手收了两笔：

1. `projectFunctionType` 里**形参表自己带的类型参数段**（`new <T>(…) => T` / 独立形态）按
   `wrapperTarget` 的同一条判据提成 `typeParameters`（装 `TypeParameter` 的 `GenericType` 才是类型参数段）；
2. 形参括号摊平后要**按顶层逗号切**——原来把 `,` 也塞进了 `parameters`
   （TS 那边 `parameters` 只有 `Parameter`）。

#### 账

| 判据 | 第 81 轮 | 现在 |
| --- | --- | --- |
| `cases:tsast` 真实语料 | 462003（98.3%） | **462284（98.3%）** |
| 其中字段名也一致 | 461595（99.9%） | **461876（99.9%）** |
| 投影后仍缺 `Identifier` | 1616 | **1581** |
| 投影后仍缺 `TypeReference` | 417 | **405** |
| `cases:align`（1420 文件） | 未登记 1 类 | **未登记 1 类** |
| `cases:run` / `cases:check` | 1035 / 1035 | **1035 / 1035** |
| 九把尺子 + `samples`（夹具重生成） | 全绿 | **全绿** |

### 第 81 轮：值位字面量的成员与括号（真实语料 98.1% → 98.3%）

上一轮结尾的榜单上，`PropertyAssignment` 387 与 `ParenthesizedExpression` 370 是最大的两块
**投影层**账（不是 token 层的），这一轮一起收了——它们本来就是同一层：**值位那一串平级单元怎么切成成员**。

#### 一、对象字面量的成员：`{ a: 1, b, [k]: 2, ...rest, m() {} }`

TS 的 `ObjectLiteralExpression.properties` 是**成员数组**，产物那边是一串平级单元
（`[a, :, 1, ,, b, ,, …]`）——照通用投影会把**每个标点都当成一个属性**（实测缺
`PropertyAssignment` 387 处，而 `properties` 里混着 `ColonToken` / `CommaToken`）。修法是新增
`splitTopLevel`（按顶层分隔符切组）与 `projectObjectLiteral`，每组按形状分派：

| 组的第一格 | TS 的成员 |
| --- | --- |
| `Spread` | `SpreadAssignment`（区间含 `...`，`expression` 是后面那段） |
| 单一个 `[k]` 打头 + 顶层 `:` | `PropertyAssignment` + `ComputedPropertyName` |
| 组里有顶层 `:` | `PropertyAssignment`（名字 / 初值各投一段；引号名是 `StringLiteral`） |
| 只有一格、且不是成员节点 | `ShorthandPropertyAssignment` |
| 只有一格、且投出来已经是成员（`m() {}`） | 原样进 `properties`（见 `MEMBER_IN_OBJECT`） |

**解构模式不走这里**：`const { a, b } = x` / `f({ a, b })` 那条路由 `projectBindingPattern`
（它自己造 `ObjectBindingPattern`）——两条路各管一边，互不干扰。

顺手把**数组字面量**按同一套切了（`projectArrayLiteral`：`elements` 里只有元素，不再混逗号；
`...c` 在里面是 `SpreadElement`，与对象字面量的 `SpreadAssignment` 不同）。

#### 二、值位括号 `(expr)` → `ParenthesizedExpression`

产物那边它就是一个 `(` 括号单元，而 `WRAPPER_FIELDS` 把括号**摊平**（`Bracket → null`），
于是括号整类消失（缺 370 处）。修法是在 `projectExpression` 里认它。

**判据能这么简单，是因为那个位置天然排除了别的括号**：实参表 / 形参表 / 类型括号的父单元是
`Method` / `Function` / `Lamda` / `Signature` / 类型容器，各有各的投影路径；
`projectExpression` 收到的单元**一律是操作数**。所以「一个 `(` 括号」就是值位括号。

#### 三、这一轮的账

| 判据 | 第 80 轮 | 现在 |
| --- | --- | --- |
| `cases:tsast` 真实语料（同 kind 同区间） | 460557（98.1%） | **462003（98.3%）** |
| 其中**字段名也一致** | 460098（99.9%） | **461595（99.9%）** |
| `cases:tsast` 用例语料 | 86.0% | **86.6%** |
| 投影后仍缺 `PropertyAssignment` | 387 | **0** |
| 投影后仍缺 `ParenthesizedExpression` | 370 | **0** |
| `cases:align`（1420 文件） | 未登记 1 类 | **未登记 1 类**（仍是那处 `LiteralType in TypeDefine`） |
| `cases:run` / `cases:check` | 1034 / 1034 | **1035 / 1035**（新增 1 条钉住本轮） |
| 其余尺子 | 全绿 | **全绿**（含 `astjson` / `lossless` / `structure` / `boundaries` / `diff` / `dashboard` / `samples`（夹具重生成）/ `shapelint`） |
| 投影抛异常的文件 | 0 | **0** |

**下一轮的目标**：`Identifier` 1616、`PropertyAccessExpression` 422、`TypeReference` 417
（这三块是多因的，得一族一族查）、`Block` 416（样本多是 `dist/ts/cjcli.ts` 里的 `{`）、
`BinaryExpression` 311 + 漂移 643、`CaseClause` 187、`TemplateSpan` 175 / `TemplateMiddle` 140、
`SuperKeyword` 127；以及第 80 轮留下的那 15 处 `cases:align` 未登记缺节点
（`this.#x` 私有名、`interfaceInstance.export` / `source.Pre` 两处上下文带歪的形状）。

### 第 80 轮：下标访问进链（token 层）—— 真实语料 97.9% → 98.1%

上一轮结尾点名的「修不动的那一半」这一轮做掉了：**让下标访问在 token 层就成为一个单元**，
于是运算符规则看到它时它已经是完整操作数。

#### 一、为什么这是「一条规则多认一种后缀」，而不是加节点

第 70 轮那条链规则（[typescript/tokens/property-access.xl.md](typescript/tokens/property-access.xl.md)）
三处现成的条件让它成为最小改动点：

1. **队列位置已经对**：[parse-pipeline.xl.md](typescript/parse-pipeline.xl.md) 里它排在 `WrapSymbol`
   之后、**所有运算符规则之前**（复合赋值 / 一元 / 二元 / 逻辑 / 逗号），所以只要它先把 `a[i]`
   收成一个单元，`+` / `=` / `!==` 那一片就自然会拿到完整操作数；
2. **它本来就认识 `[` 括号**：`IsChainBase` 早就允许「收尾括号是 `)` / `]`」的括号当**链底**
   （`a[0].b` 早就是一条链）——缺的只是**链尾再吞一个 `[ … ]`**；
3. **链的子单元本来就按原文顺序排**（`[a, ., b, ., c]`），下标链接放进去**不需要新标签、
   也不需要标志位**——那个 `[` 括号单元自己就说明了它是下标链接。

改了三处：新增 `IsIndexUnit`（只认 `startBracket === "["`：类型位的早被 `TypeBracketReorganization`
收成 `ArrayType` / `TupleType` / `IndexedAccessType`、值位没有操作数的被 `JsonArrayReorganization`
收成 `ArrayLiteral`，轮到链规则时还留着的 `[` 只可能是「前面有操作数的那个」）、
`ChainEndIndex` 多一步「下一格是下标括号就吞掉、继续走」、`Previous` 末尾补一层**类型位守卫**（见下）。
投影层那一支（`projectExpression` 的链折叠）顺手改成「点号链接与下标链接混排都顺着走」，
于是 `a[i]` / `a[i].b` / `a[i][j].c` 都是左结合的嵌套。

**效果**（`xs[0] + 1` 那个形状，第 79 轮记过的产物树）：

    第 79 轮：  [Identifier(xs), BinaryOperator(op="+", [ Bracket[0], +, Identifier(1) ])]     ✗
    第 80 轮：  BinaryOperator(op="+", [ PropertyAccess(xs [0]), +, Identifier(1) ])            ✓

#### 二、类型位那三处守卫（都是实测逼出来的）

多认一种后缀，就得自己把类型位挡掉——**类型位的 `[]` 与值位的 `[i]` 形状一模一样**。
三处都不是「想一想就知道」，是 `cases:run` 与 `cases:align` 逐个报出来才找到的：

| 形状 | 现象 | 判据 |
| --- | --- | --- |
| `type E2 = A[]` | 这一步**根本没轮到**（`TypeBracketReorganization` 排在前面，先收成 `ArrayType`） | ——（守卫管的是「它还没接手」的那几个形状） |
| `type E3 = [...A[]]` / `...rest: E[]` | `[]` 被链吞掉，`ArrayType` 消失（两条用例当场红） | 括号的宿主（`RestType` / `NamedTupleMember` / `IsTypeContainerUnit`） |
| `type X<O> = { readonly [K in keyof O]: O[K] }` | 映射类型**值**里那个 `O[K]` 被折成链（`cases:align` 的标签占用 12 处） | 宿主的宿主（成员位那层 `Statement` 的父亲是 `MappedType` / `TypeLiteralBody`…——`Statement` **刻意不在** `IsTypeContainerUnit` 白名单里，值位语句列表也是它） |
| `x is NodeJS.ArrayBufferView` | 谓词里的限定名被折成链（4 处） | 同上，再加 `TypePredicate` |

**`Context` 在这里帮不上忙**（重要的一条实测）：`type E3 = [...A[]]` 里那个 `[]` 的
`Context` 是 **`"value"`**——`DecideBracketContext` 往前扫先撞上 `...`（一个符号），规则判它值位。
最后用上的是 **`ArrayLiteral.Context`**（[json/array-literal.xl.md](typescript/tokens/json/array-literal.xl.md)：
它在 `TryToClose` 之前直接抄自那个括号的 `Bracket.Context`）：元组类型的那个 ArrayLiteral 是
`"type"`、值位数组字面量是 `"value"`——插桩还看到那一刻它的 `Parent` 甚至还是 `Root`，
所以「往上找类型容器」与 `IsTypeBracketPosition` 都问不出东西，这个抄过来的 `Context` 才是现成的信号。

#### 三、量具必须跟着走：把 `PropertyAccess` 登记进标签表

这一步是**必须一起做的**（[tests/parse/align.mjs](tests/parse/align.mjs)）：`PropertyAccess`
是第 70 轮加的标签，标签表里一直没有它，而这一把尺子对「查不到标签的 kind」是 `continue`
——那一族**整类看不见**。补上之后，**原来一直看不见的东西当场照了出来**（这正是补它的意义）：

| 照出来的 | 处数 | 处置 |
| --- | --- | --- |
| 继承段的点号名（`interface I extends globalThis.Iterator`） | 158 | **口径**：链规则**刻意**在 `HeritageClause` / `ExpressionWithTypeArguments` / `NewType` / `Decorator` 让路，投影层用 `dottedExpression` 出节点（第 70 轮的设计） |
| `?.` / `!.` 链（`this.Start?.Document` / `f()!.P`） | ~54 | **口径**：那两支分别归 `NullConditionalOperator` / `NotNull`（都排在链规则之后） |
| 装饰器限定名 `@ns.dec` | 1 | **口径**：装饰器名有自己的规则 |
| `new.target`（TS 是 `MetaProperty`）/ 尖括号断言里的 `T[]` | 12 | **口径**：前者第 70 轮起就是链，后者在 README 的「已知缺口」里 |
| `typeof Symbol.iterator` / 谓词里的限定名 | 5 | **口径**：类型位那几格在链规则跑的时候还没成形（时序），本轮的守卫挡住了大部分，余下按位置登记 |

这些口径**逐条登记**在 `ALLOWED_EXTRA` 与 `ignoreMissing` 里（看得见，不是拿别名遮的）。

#### 四、这一轮的账

| 判据 | 第 79 轮 | 现在 |
| --- | --- | --- |
| `cases:tsast` 真实语料（同 kind 同区间） | 459174（97.9%） | **460557（98.1%）** |
| 其中**字段名也一致** | 458715（99.9%） | **460098（99.9%）** |
| `cases:tsast` 用例语料 | 85.7% | **86.0%** |
| 投影后仍缺 `ElementAccessExpression` | 292 | **0** |
| 投影后仍缺 `Identifier` | 1851 | **1602** |
| 投影后仍缺 `PropertyAccessExpression` | 541 | **424** |
| 投影后仍缺 `BinaryExpression` / 漂移 | 400 / 680 | **306 / 642** |
| `cases:align`（1419 文件） | 未登记 1 类 / 缺节点 1 类（那 2 处 `CallExpression`） | 未登记 **1 类**（仍是 `LiteralType in TypeDefine` 那 1 处）/ 缺节点：**已登记口径若干 + 未登记 15 处**（见下） |
| `cases:run` / `cases:check` | 1034 / 1034 | **1034 / 1034**（期望值一条没改） |
| 其余尺子 | 全绿 | **全绿**（`astjson` / `lossless` / `structure` / `boundaries` / `noise` / `diff` / `dashboard` / `matrix` / `recon2` / `samples` / `shapelint`） |
| 投影抛异常的文件 | 0 | **0** |

**如实记下那 15 处**（`cases:align` 的缺节点里未登记的）：`dist/ts/typescript/ts-ast.ts` 的
`params.push`（2 处，即第 75 / 76 轮登记过的**整段平铺**那个已知现象）、`this.#x`（私有名，1 处）、
`interfaceInstance.export` 与 `source.Pre`（各若干处，**单独写出来是对的**，说明是上下文带的，
还没查到根因）。它们都在**值位代码**里——`.d.ts` 语料几乎没有这种形状，所以这一族一直没被照出来过。

**下一轮的目标**：① 上面那 15 处（先从 `this.#x` 与两处「上下文带歪」入手）；
② `PropertyAssignment` 387（对象字面量的成员）；③ `ParenthesizedExpression` 370 / `Block` 414；
④ `Identifier` 1602 与 `TypeReference` 417 这两块老账。

### 第 79 轮：成员位的语句壳 · 索引签名 · 后缀下标（真实语料 +463 节点）

上一轮收尾时点名的第一件事是「`interface I { [n: number]: T }` 被投成
`ExpressionStatement > IndexSignatureDeclaration`」。这一轮把它连根拔了，顺手又清了两小块。

#### 一、成员位**没有语句**（`MEMBER_LIST_KINDS` + `MEMBER_TAGS`）

产物在**成员位**多包了一层 `<Statement>`——`type T = { [k: string]: number }`、
`declare class C { [k: string]: any }`、带 `readonly` 的接口成员都是这一形状
（成员表挂上语句队列之后多出来的那层）。照通用投影走，那层会被补成 `ExpressionStatement`，
于是索引签名成了它的孩子（实测缺 `IndexSignatureDeclaration` 102 处，还凭空多出一批
`ExpressionStatement`）。修法：`projectEachIn` 在成员表宿主（接口 / 类型字面量 / 类）下
**把这一层摊开**——它下面那些单元本身就是成员。

**摊开的判据必须窄**，这一条是被一次崩溃逼出来的：`samples/generic.ts` 里有一句
`class Foo<T> { let value: T }`（本工程的手写样本，不是合法 TS），成员位的 `<Statement>` 里
装的是个 `Let`；无脑摊开就把它当成员投出去，而 `projectLet` 那条路只服务语句位、
容器类型不设防，当场 `TypeError: node.get is not a function`。所以：

1. 摊开要求**整层都是成员标签**（`IndexSignature` / `Field` / `MethodDeclaration` /
   `Signature` / `EnumMember`）；
2. 顺带修掉 `projectLetFrom` 那个**潜伏 bug**：容器参数两个调用方传的东西不一样
   （`projectLet` 传视图、`structuralProps` 传 `view(...)`），而它一律 `view(container)`
   —— 前者会 `view(view)`。现在两种都收。

#### 二、索引签名的形状（`projectIndexSignature`）

TS 那边 `IndexSignatureDeclaration` 有三个具名字段：`parameters`（`[k: string]` 里那段）、
`type`（值类型）、`modifiers`（`readonly`）；产物那边是一串**平级子单元**，照通用投影
全塞进一个 `children`（字段名整类不符）。新增一支按三段切。
注意 **`readonly` 在这里是子单元**（不是 `modifiers` 属性），所以单独收成修饰词节点——
`addModifiers` 读的是属性 / 布尔属性，这一格两样都没有。

#### 三、后缀下标 `a[i]`（投影层折一层）

产物那边下标访问是**平级的两格**（`Identifier(b)` + `[` 括号），TS 那边是
`ElementAccessExpression > [expression, argumentExpression]`。缺这一支有两个后果：
`ElementAccessExpression` 整类缺 300 处；以及**二元表达式的右操作数在括号处被截断**
（`o.a = xs[i + 1]` 的区间止于 `xs`，是 `BinaryExpression` 漂移 687 处里的一块）。

**位置很关键**（第一版踩了）：这一支必须排在**二元 / 赋值切分之后**。先折的话
`o.a = xs[i + 1]` 会被折成一个「以 `BinaryExpression`（那条赋值）为底」的
`ElementAccessExpression`——优先级整个倒了。挪到后面之后：

    o.a = xs[i + 1]  →  BinaryExpression(left: PropertyAccessExpression(o.a),
                                         operatorToken: EqualsToken,
                                         right: ElementAccessExpression(xs[i + 1]))   ✓

判据只有「末尾那一格是 `[` 括号」：值位里前面有操作数的 `[` 就是下标（没有操作数的那些
早被 `json/array-literal.xl.md` 收成 `ArrayLiteral`，类型位的 `T[K]` 是 `IndexedAccessType`
单元，都到不了这里）。递归写法顺带覆盖 `a[i][j]` 与 `f(a)[0]`。

#### 四、这一轮**修不动**的那一半（下一轮的主目标）

`const b = xs[0] + 1` 这种形状，投影层再怎么折也救不回来——**产物树里那条关联没了**：

    xs[0] + 1  →  [Identifier(xs), BinaryOperator(op="+", [ Bracket[0], SymbolToken(+), Identifier(1) ])]

`+` 把那个 `[0]` 括号当成了**自己的左操作数**（`xs` 被留在外面），于是一棵
`xs + ([0] + 1)` 的树；`Let` 的初值取一格，`xs` 之后就只剩那个 `BinaryOperator`。
**正解与第 70 轮修成员访问链是同一套**：让**下标访问在 token 层就成为一个单元**
（把第 70 轮的链规则扩成也吃 `[...]`），运算符规则看到它时它已经是完整操作数。
这一轮的投影那一支只是「树里还是平级两格时尽量折回来」，覆盖不到运算符已经先接手的那一半。

#### 五、这一轮的账

| 判据 | 第 78 轮 | 现在 |
| --- | --- | --- |
| `cases:tsast` 真实语料（同 kind 同区间） | 458711（97.9%） | **459174（97.9%）** |
| 其中**字段名也一致** | 458252（99.9%） | **458715（99.9%）** |
| 投影后仍缺 `IndexSignature` | 102 | **0** |
| 投影后仍缺 `ElementAccessExpression` | 314 | **300**（余下的见第四节） |
| `cases:align`（1419 文件） | 未登记 1 类 / 缺节点 1 类 | **同上**（仍只有那 2 处 `CallExpression`） |
| `cases:run` / `cases:check` | 1033 / 1033 | **1034 / 1034**（新增 1 条钉住本轮） |
| 投影抛异常的文件 | 0 | **0**（新增的摊开判据挡住了 `samples/generic.ts` 那条路） |

九把尺子 + `samples`（夹具已重生成）/ `shapelint` 全绿。

**下一轮的目标**：① 下标访问进 token 层（第四节，`ElementAccessExpression` 300 +
`BinaryExpression` 漂移 687 + `Identifier` 一千八百多里的一大块）；② `PropertyAssignment`
382（对象字面量的成员）；③ `ParenthesizedExpression` 367、`Block` 414；
④ 仍是那处 `CallExpression` 与 `cases:align` 缺 `PropertyAccess` 的标签表口子。

### 第 78 轮：成员名的四种形态（真实语料 97.6% → 97.9%，字段名 99.8% → 99.9%）

这一轮啃的是缺口榜上**同一个根因**的一大片：`StringLiteral` 1083 + `PropertyAccessExpression` 593 +
`ComputedPropertyName` 231 + `NumericLiteral` 216 + `PropertySignature` 52 ≈ 2200 个节点。

#### 一、根因：成员名有**两套**判据，接口那一套是残的

投影层里名字有两处实现：

- `structuralProps`（方法声明 / 签名 / 命名空间走这条）认得**引号名**（`declare module "x"`）与
  **计算名**（`[Symbol.toPrimitive]`，第 34 轮补的）；
- `projectField`（**接口 / 类型字面量成员**走这条）**自己 `synthName` 合了一个 `Identifier`**，
  上面两套判据一条都没用。

而真实语料里正好是后者占绝大多数。于是：

| 源码 | 原来 | 现在 |
| --- | --- | --- |
| `"accept-encoding"?: string` | `Identifier[17,32)`（引号**里面**那几个字符） | `StringLiteral[16,33)`（区间含那对引号） |
| `0: string` / `1.5: boolean` | `Identifier` | `NumericLiteral` |
| `[Symbol.toStringTag]: string` | **整个名字节点都没有**（`name=""` 被 `name !== ""` 的闸门挡掉） | `ComputedPropertyName[59,79)` > `PropertyAccessExpression` |
| `[kOptions]: T` | `Identifier[92,100)`（丢了方括号） | `ComputedPropertyName[91,101)` > `Identifier` |

修法是把它**收成一份**：新增 `memberNameOf(v, ctx)`（[typescript/ts-ast.xl.md](typescript/ts-ast.xl.md)），
`projectField` 与 `structuralProps` 都问它。四条判据都是实测逼出来的：

1. **计算名先问，而且不看 `name` 属性空不空**——`[Symbol.toStringTag]` 的名字属性是**空串**，
   原来那个 `name !== ""` 的闸门直接把整格名字挡掉了（`PropertySignature` 缺 `name` 52 处
   与它同源）；
2. **引号判据是「名字起点前面那一格就是引号」**，不是「窗口里找得到 `"name"`」：
   `x: "x"` 这种成员的类型里正好有同名字符串，按窗口找会把类型当成名字。
   `synthName` 已经把名字位置算好了（推过修饰词、优先用 `nameStart` / `nameEnd`），问它左边一格就够；
3. **数字名用与叶子分名同一个正则**（`NUMERIC_LITERAL`）——`0x10` / `1_000` / `1.5` 都算；
4. **`computed` / `unit` 两个返回值调用方都要用**：`computed` 要从段循环里排掉（否则它会以
   `ArrayLiteral` 的身份再出现一次），`unit` 是名字那个子单元——**这一条是本次改动自己踩的坑**：
   第一版只返回投影后的节点、把 `unit` 丢了，于是接口名那个 `Identifier` 没被排掉、
   顶着字段名 `heritageClauses` 出去，实测 **2640 处字段名不符**（接口那 2137 处全中）。
   `cases:tsast` 的「字段名」那一栏当场把它抓出来——kind / 区间那一栏当时是**涨的**。

#### 二、顺手补的三条字段名映射

| kind | 产物 | TS | 处数 |
| --- | --- | --- | --- |
| `WhileStatement` | `compare` / `body` | `expression` / `statement` | 70 |
| `CallSignature` / `ConstructSignature` | `children` | `parameters` | 146 + 57 |

#### 三、这一轮的账

| 判据 | 第 77 轮 | 现在 |
| --- | --- | --- |
| `cases:tsast` 真实语料（同 kind 同区间） | 457250（97.6%） | **458711（97.9%）** |
| 其中**字段名也一致** | 456338（99.8%） | **458252（99.9%）** |
| `cases:tsast` 用例语料 | 85.4% | **85.7%** |
| 投影后仍缺 `StringLiteral` | 1083 | **170** |
| 投影后仍缺 `ComputedPropertyName` | 231 | **0** |
| 投影后仍缺 `PropertySignature` | 52 | **0** |
| `cases:align`（1418 文件） | 未登记 1 类 / 缺节点 1 类 | **同上**（仍只有那 2 处 `CallExpression`） |
| `cases:run` / `cases:check` | 1032 / 1032 | **1033 / 1033**（新增 1 条钉住本轮） |

九把尺子 + `samples` / `shapelint` 全绿；`samples` 三份 TS 形状夹具按新名字节点重生成。

**下一轮的目标**（现在的榜单，同一批 385 个真实文件）：`Identifier` 1861、
`PropertyAccessExpression` 538、`TypeReference` 417、`Block` 413、`BinaryExpression` 398、
`PropertyAssignment` 374、`ParenthesizedExpression` 366、`ElementAccessExpression` 314、
`NumericLiteral` 214、`CaseClause` 184、`CallExpression` 181、`TemplateSpan` 175 /
`TemplateMiddle` 140、`ExportSpecifier` 134、`SuperKeyword` 127。
其中这一轮**顺带看清了一处**：`interface I { [n: number]: T }` 的索引签名在投影里被包成了
`ExpressionStatement > IndexSignatureDeclaration`（TS 那边是裸的成员）——
`projectStatement` 在**成员位**不该补语句壳，它现在拿不到 `parentKind`，是下一轮的第一件事。

### 第 77 轮：第三个出口改成**逐节点直出**（`Token.PrintAst`）+ 对象字面量里的箭头函数

这一轮换的是**出口的组织方式**，不是投影的形状：原来 TS 形状是「一个中央模块拿字典树转一道」，
现在**每个 token 自己出自己那一格**——与 `ToXmlString` / `ToDictionary` 完全同一种组织方式。

#### 一、`PrintAst(ctx, v)`：基类挂钩 + 各 token 覆写

[core/syntax/token.xl.md](core/syntax/token.xl.md) 新增一个出口方法（`core/` 仍然不知道
目标语言是什么形状）：

- **基类默认返回 `undefined`**，意思是「我不自己出，交给语言层的通用支」——通用支就是原来那张
  中央表（换名 + 提层 + 字段名）。所以**没覆写的类一个字节都不变**；
- **覆写即「这一格归我出」**：两个参数——`ctx`（语言层创建的投影上下文：原文、记账、
  以及一组**出口助手** `Node` / `Each` / `Members` / `Project` / `Text` / `LeafKind` /
  `KeywordKind` / `TokenKind` / `StringText`）与 `v`（**这个节点自己的视图**：标量属性进
  `attrs`、数组进 `segments`、坐标在 `start` / `end`）。覆写里**不需要 import 任何东西**。

**分派怎么落到 token 上**：投影器仍然吃原来那棵「字典 + 坐标」的树，但
`WithRangeOf` 在补坐标时本来就做完了一次配对（「字典项与子单元按类型名配对」），现在**顺手把
「这一格是哪个 token 出的」记在字典格上**（一个普通属性 `__token`，不是 Map 的条目——
`entries()` / `JSON.stringify` / `Token.ToPlain` 都看不见它，所以 XML 出口、AST JSON 出口
与 `cases:astjson` 那把尺子一个字节都不受影响）。投影器拿到一格就先问它的 token。
**入口没变**：`cjcli` / `samples` / 尺子都还是调 `projectRoot(Root.ToList(), 原文)`。

这一轮先搬了**九个类**（每一处都把「这一格的形状」搬到定义它的规范文件里）：

| 类 | 覆写后的那一格 | 原来在中央 `switch` 里 |
| --- | --- | --- |
| `Identifier` | `ctx.Node(ctx.LeafKind(text), { text }, v)`（按文本分 `NumericLiteral` / `StringLiteral` / `TrueKeyword`…） | `case "Identifier"` |
| `Keyword` | `KEYWORD_KIND` 查表，查不到才是 `Identifier` | `case "Keyword"` |
| `SymbolToken` | `TOKEN_KIND` 查表，查不到原样用文本 | `case "SymbolToken"` |
| `String` / `ConstString` | `StringLiteral` + `StringText`（区间含引号、文本不含） | `case "String"/"ConstString"` |
| `UnionType` / `IntersectionType` | `types`，成员按 `|` / `&` 切（`parentKind` 选档） | `KIND_BY_TAG` + 类型容器那一支 |
| `ArrayType` / `TupleType` | `elementType` / `elements`（元组按 `,` 切） | 同上 |

**验收是逐字节对拍**：[`tests/parse`](tests/parse) 那套尺子之外，另用一把一次性脚本
（不进仓库）把**全语料 1403 个文件**的 TS 形状出口串成 JSON 取哈希，改动前后逐字节比：
**源文件没变的 1394 个文件、0 处不一致**（差异只出现在我这一轮改过的那 9 个产物文件上，
它们自己的文本变了）。换句话说：**逐节点直出与中央通用支的产物完全相同**——
这也是后面继续搬其余类的判据。

顺手把两处实现收成一份（否则两条路会悄悄漂开）：`mk` 与 token 覆写用的 `ctx.Node` 都转调
新的 `astNode`；`ctx.Each` 与通用支的类型容器那一支都转调 `typeMemberGroups`。
对拍时还抓出一处**空段口径**：`structuralProps` 的段循环是「非空才写字段」，所以
`<TupleType></TupleType>`（空元组）在 TS 那边是 `{kind,pos,end}`、没有 `elements`——
`ctx.Each` 现在空列表回 `undefined`（`JSON.stringify` 里不出现，与 `projectParameter` 的
`name` / `type` 同一个写法）。少了这一条，10 个空元组 / 具名元组文件会对不上。

#### 二、顺手抓到并修掉的真缺口：对象字面量属性值位置上的箭头函数

新代码里有 `{ Node: (kind, props, view) => … }` 这种写法，`cases:align` 当场报出
**缺 `ArrowFunction` 10 处 + `FunctionType in ObjectLiteral` 10 处 + `BinaryOperator in Parameter` 4 处**：

```ts
const o = { a: (x, y) => x };   // 原来 → <FunctionType>（连形参表里的 `,` 都折成了逗号运算符）
const o = { a: x => x };        // 一直是对的（没有括号，不问形参表那条判据）
```

`LamdaReorganization.IsLambdaParameters` 的判据是「形参括号前面是什么」：前面是 `:` ⇒
类型标注里的**函数类型**。可对象字面量里的冒号是**属性分隔符**——与第 76 轮修的括号 `Context`
是同一族（那一次修的是 `[`，这一次是 `(`）。修法：撞上 `:` 时先问
**外层那个容器是不是对象字面量**（新增 `EnclosingObjectLiteral`，[lamda.xl.md](typescript/tokens/lamda/lamda.xl.md)），
是就按箭头函数收。三处判据都是实测逼出来的：

1. **两种形态都要认**：插桩看到的是 `Bracket((:) < ObjectLiteral < Root`——问这件事的时候
   外层**已经**是造好的 `ObjectLiteral` 了（不是 `{` 括号）。所以先认 `ObjectLiteral`，
   还是括号的 `{` 再交给对象字面量规则自己的 `IsObject`（`As` / `TypeDefine` / `TernaryOperator`
   与 `Lamda` 本来就在用它——**两条规则用同一个答案**）；
2. **`Context !== "type"`**：类型字面量 `type T = { c: (a: A) => B }` 的 `{` 在 `IsObject`
   眼里也是「对象开头」（前面是 `=`），只有 `Context` 分得开它；
3. **它的前面那一格必须是表达式位置**（符号，或 `return` / `typeof`）——`IsObject` 只回答
   「对象字面量规则会不会接手」，而**命名空间体**（`declare module "x" { … }`，前面是模块名
   字符串）在那一刻也判「是」（命名空间规则排在前面、本来轮不到它接手）。少了这一条，
   [@types/node/child_process.d.ts](node_modules/@types/node/child_process.d.ts) 里成片的
   `callback?: (error: …) => void` 会被判成箭头函数，**269 处 `FunctionType` 当场消失**
   （`cases:tsast` 97.6% → 97.5%，是这一轮唯一一次「改对一处、改坏一片」）。

**同时补了第 76 轮那条规则的一个洞**（同一个根因的另一面）：`EnclosingBraceContext` 原来
认「外层 `{` 的 `Context` 是值位」就下结论，可**类体 / 接口体 / 命名空间体的 `Context` 也是值位**，
于是它们里面的**类型字面量**被当成对象字面量——
`interface String { replace(searchValue: { [Symbol.replace](…): string }): string }`
（`lib.es2015.symbol.wellknown.d.ts:253`）里那个 `(substring: string, …) => string` 会从
函数类型变成箭头函数。修法是新增 `BraceInExpression`：**只有这个 `{` 自己出现在表达式里**
（前面是符号或 `return` / `typeof`），才认它那个「值位」结论；声明头后面的体一律返回 `""`
（不表态，落回原来的「类型位」判断）。补上之后那个文件回到基线 ✓。

#### 三、这一轮的账

| 判据 | 第 76 轮 | 现在 |
| --- | --- | --- |
| `cases:tsast` 真实语料（同 kind 同区间） | 456440（97.6%） | **457250（97.6%）** |
| 其中**字段名也一致** | 455528（99.8%） | **456338（99.8%）** |
| **逐字节对拍**（全语料，源文件未变的 1394 个） | — | **0 处不一致** |
| `cases:align`（1416 文件） | 未登记 1 类 / 缺节点 1 类 | **未登记 1 类 / 缺节点 1 类**（仍只有那 2 处 `CallExpression`） |
| `cases:run` / `cases:check` | 1031 / 1031 | **1032 / 1032**（新增 1 条钉住本轮） |
| 九把尺子 + `cases:astjson` / `lossless` / `structure` / `boundaries` / `noise` / `samples` / `shapelint` | 全绿 | **全绿** |

新增一条用例：`expr-arrow-in-object-value`（属性值位置的带括号箭头是 `Lamda`、形参表里的 `,`
不许折成二元运算；同一文件的**类型字面量**成员必须仍是 `FunctionType`——把守卫一起钉住）。

**下一个要接的**：① 继续把其余类搬进各 token 文件（判据不变：逐字节对拍 + `cases:tsast`
数字不动）；② `cases:align` 那处 `CallExpression`（第 76 轮登记的、只在 `dist/ts/typescript/ts-ast.ts`
里出现的「整段平铺」现象）；③ 量具口子：`cases:align` 的标签表里没有 `PropertyAccess`。

### 第 76 轮：类型位的成员切分 · 两处 token 层缺口（真实语料 97.1% → 97.6%）

这一轮从「逐节点对拍」出发，先量后改：`cases:tsast` 的缺口榜上，**最大的一项是同一类**——
类型位那些「一对多格」的写法（名字 + 实参、点号两边的限定名）在投影时被**拆散**了。

#### 一、类型容器的子单元要**按成员切好再投**（投影层，最大的一块）

`projectEachIn` 原来对类型容器的子单元**逐个**投（`projectTypeExpression([item])`），
可产物在类型位把「名字 + 实参」摆成**平级的两格**：

```
ArrayLike<number> | string
  原来 → TypeReference[7780,7789)      ← 只有名字，实参整片丢掉
         TypeReference[7789,7797)      ← 实参自己成了**另一个**节点（区间是 `<number>`）
         StringKeyword(string)
  TS   → UnionType > [TypeReference(ArrayLike<number>)[7780,7797), StringKeyword]
```

同一类根因还压在**限定名**上：`ArrayBuffer | NodeJS.TypedArray` 的点号两边是两个平级单元，
`projectTypeExpression` 里那个限定名循环**一次都进不去**。

修法是给类型容器的子单元表加一层**切分**（`TYPE_MEMBER_SEPARATORS` + `typeMemberGroups`）：
`UnionType` 按 `|`、`IntersectionType` 按 `&`、`TupleType` 按 `,` 切段，**切完每段整段投**；
其余容器（`T[]` / `(A)` / `keyof T` / `A[K]`）的子单元合起来本就是一个类型，维持逐个投。
分隔符自己不进任何一段（与 `projectTypeArguments` 切逗号同一口径），空段（前导 `|`）由 `filter` 挡掉。

#### 二、类型位那几处「字段/层数不对」的投影（同一批，逐个清）

| 缺口 | 根因 | 修法 |
| --- | --- | --- |
| `TypeReference` 漂移 **1761** → **73**、`QualifiedName` 缺 **844** → **118** | 见上（成员被拆散，限定名循环进不去） | `typeMemberGroups` |
| `ImportType` 字段名 113 处 + 缺 `LiteralType` 221 处 | 类型位的 `import("m").A` 走通用投影：TS 那边 `argument` 是**一层 `LiteralType` 包着 `StringLiteral`**、`qualifier` 是**限定名**，产物那边是 `Method` + 点号 + `Identifier` 的平铺 | 新增 `projectImportType`（+ 共用的 `qualifiedNameFrom`）：实参套 `LiteralType`、限定名折 `QualifiedName`，`typeof` / `import` 两个词不进子字段 |
| `InferType` 字段名 72 处 | 产物是 `[infer, TypeParameter]`，TS 只有 `typeParameter` 一格 | 新增 `projectInferType`（`infer` 那个词不进子字段） |
| `IndexedAccessType` 字段名 **657** 处（最大的一处字段差异） | 产物是平铺的 `children`，TS 是 `objectType` + `indexType` | 新增 `projectIndexedAccessType` + `indexBracketOf`：从节点终点往回找**与最后那个 `]` 配对**的 `[`（`A["k"]["j"]` 才不会把内层当成外层），按它把单元切两段 |
| `TypePredicate` 字段名 382 处 | 产物多挂了一个 `isKeyword` | `ts.forEachChild` **不访问** `is`（它只是词法记号）——去掉那一格（`asserts` 的 `assertsModifier` 照留） |
| `IfStatement` 字段名 163 处 | 同上，`elseKeyword` 也不在 `ts.forEachChild` 的访问面里 | `projectIfSet` 不再挂 `elseKeyword` |
| `ForOfStatement` 185 / `ForStatement` 126 处 | 段名是上游 Cangjie 的（`define` / `enumable` / `body`），TS 是另外三个名字 | `FIELD_BY_KIND` 补两行映射 |
| `LiteralType` 缺 221 → **49** | `null` / `true` / `false` 在**一部分**上下文里产物没造 `LiteralType`（`X extends null \| Y` 这类类型参数约束全是裸 `Identifier`） | `projectTypeExpression` 给这三个词套一层 `LiteralType`（**`undefined` 不套**——TS 那边它就是裸的 `UndefinedKeyword`；表在 `LITERAL_TYPE_KEYWORDS`） |

#### 三、两处**真的 token 层缺口**（都是 `cases:align` 报出来的）

`cases:align` 的「缺节点 / 标签占用」两节在**第 75 轮之后其实是红的**，只是它没有退出码、
而第 75 轮的验收表里没有它——这一轮先把**基线量出来**（`git stash` 规范改动、
重新生成产物、跑一遍 align），再动手。基线在下面这张表里（同一批 1412 个文件）：

| 口径 | 第 76 轮之前 | 现在 |
| --- | --- | --- |
| 未登记的「标签占用」 | 4 类（`MethodDeclaration in Method` 2 / `Parameter in Bracket` 2 / `LiteralType in TypeDefine` 1 / `Label in MethodBody` 1） | **1 类**（`LiteralType in TypeDefine` 1，见下） |
| 缺节点 | 2 类（`CallExpression` 2 / `BinaryExpression` 2） | **1 类**（`CallExpression` 2，见下） |

两处共一个来源：`dist/ts/typescript/ts-ast.ts` 这个**1900 行的产物文件**（第 75 轮才进语料），
里面全是对象字面量与实参表——拿它当语料，等于给解析器出了一张「自己写的刁钻形状」考卷。

**（1）形参表后面紧贴逗号 ⇒ 那是实参表，不是方法声明**（token 层，
[`method-declaration.xl.md`](typescript/tokens/function/method-declaration.xl.md)）

```ts
const p = mk(leafKindOfText(text), { text });
```

`BodyIndex` 一路扫到后面那个 `{`，把这次调用收成一个 `MethodDeclaration`：
**`ReturnType` 是那个逗号、`MethodBody` 是 `{ text }`**；连带把简写属性 `{ text }` 读成标签、
把里面的东西读成参数与字面量类型。上一表里那 4 类未登记标签占用**全是这一处**。
判据是「形参表后面紧贴一个 `,`」——方法声明的形参表后面只可能是 `:` / `{` / 成员边界，
逗号在值位只能是实参 / 表达式分隔符（成员之间用 `,` 分隔时，逗号只会出现在返回类型或体**之后**）。

**（2）对象字面量里的下标访问被判成了类型位**（token 层，
[`text-common-util.xl.md`](typescript/text-common-util.xl.md) 的 `DecideBracketContext`）

```ts
const o = { start: range ? range[0] : 0, end: kids[i + 1] };
```

`[` 往前扫时**先撞上的是属性分隔冒号** `start:`，于是被判成类型位——
同一个 `kids[i + 1]` 在语句位置折出 `<BinaryOperator op="+">`、在对象字面量里却是一串平铺单元
（align 的 2 处 `BinaryExpression`）。判据是**外层那个 `{` 自己处在哪**
（它的 `Context` 在它开括号那一刻就算好了，与既有的「爬出花括号之前先停」同一个依据）：
对象字面量（值位 `{`）里的冒号是属性分隔符 ⇒ 值位；类型字面量（类型位 `{`）里的才是类型标注。
新增 `EnclosingBraceContext`，**只在撞上冒号那一支**问它。
类型位写法（`as` / `satisfies` / `keyof`…）在扫描里先于冒号出现，所以到不了这一支：

```
const o = { a: kids[i + 1] }   → `{` 是值位 ⇒ 值位 ✓（`+` 照常折）
let x: { a: A[K] }             → `{` 是类型位 ⇒ 类型位 ✓（IndexedAccessType 照常成形）
type M = { [K in keyof T]: T[K] }  ↦ 不变 ✓（映射类型 / TypeOperator 全绿）
```

#### 四、这一轮**没修完**的两处（如实登记，下一个要接的口子）

两处都在 `dist/ts/typescript/ts-ast.ts` 里，位置随产物重生成而漂，所以登记的是**形状**：

| 剩余 | 现象 | 复现 |
| --- | --- | --- |
| align 未登记 1 类：`LiteralType in TypeDefine` | `return { type, start: range ? range[0] : 0, … }` 附近，产物里那个 `: 0` 被当成类型标注 ⇒ 多一个 `LiteralType`。**同样的字面形状单独写出来是对的**（`const o = { start: a ? b[0] : 0 }` 正常），说明是**上文某处**把这一段的语境带歪了 | `node tests/parse/probe.mjs --file dist/ts/typescript/ts-ast.ts --lines 310-325` |
| align 缺节点 1 类：`CallExpression` 2 处 | `for (const inner of unwrapNodes(k)) params.push(inner);` 这一片**整段保持平铺**（没有 `<Foreach>`、也没有 `<PropertyAccess>`），而同样两行单独写出来会正常折成 `Foreach` + `PropertyAccess` | `node tests/parse/probe.mjs --file dist/ts/typescript/ts-ast.ts --lines 1585-1600` |

两处的共同点已经定位到「**上文**」：`projectFunctionType` 上面那几行
（`kids.findIndex((k) => … )` 那种带箭头与多层的写法）之后，后面整段的重组就没再发生。
**这不是「被遮蔽」，是还没查到根因**；两个复现命令谁都能跑，且它们都在**本工程自己的产物**里——
外部语料（`@types/node` 等）不受影响。

顺带记下一处**量具口子**（下一轮要先补）：`cases:align` 的标签表（`REVERSE`）里
**没有 `PropertyAccess`**（第 70 轮新增的标签），而这一把尺子对「标签表查不到的 kind」是
`continue`（直接跳过）——也就是说 `PropertyAccessExpression` 这一族构造**现在整类看不见**。
要接的话先补这一行，再看它当场照出多少（大概率会照出一片，所以单开一轮）。

#### 五、这一轮的账

量化（同一批 **385 个真实语料文件 / 467593 个 TS 语义节点**）：

| 判据 | 改动前 | 改动后 |
| --- | --- | --- |
| `cases:tsast` 真实语料（同 kind 同区间） | 97.1% | **97.6%** |
| 其中**字段名也一致** | 99.4% | **99.8%** |
| `cases:tsast` 用例语料 | 85.3% | **85.4%**（字段名 96.9% → **97.6%**） |
| 全语料（1403 文件） | 96.7%（1399 文件时） | **97.2%**（字段名 99.3% → **99.7%**） |
| 投影后仍缺 `QualifiedName` | 844 | **118** |
| 投影后仍缺 `LiteralType` | 221 | **49** |
| 投影后仍缺 `TypeReference` / 漂移 | 429 / 1761 | **417 / 73** |
| 字段名不符：`IndexedAccessType` | 657 | **0** |
| 字段名不符：`TypePredicate` | 382 | **0** |
| 字段名不符：`ForOfStatement` / `ForStatement` | 184 / 126 | **0 / 0** |
| 字段名不符：`IfStatement` | 163 | **0** |
| 字段名不符：`ImportType` / `InferType` | 113 / 72 | **0 / 0** |
| `cases:align`（1412 文件） | 未登记 **4 类** / 缺节点 **2 类** | 未登记 **1 类** / 缺节点 **1 类**（见上一节） |
| `cases:run` / `cases:check` | 1027 / 1027 | **1031 / 1031**（新增 4 条钉住本轮） |

九把尺子（`run` / `diff` / `dashboard` / `lossless` / `structure` / `boundaries` / `noise` /
`astjson` / `tsast`）与五把探针（`sweep` / `recon` / `recon2` / `fuzz` / `fuzz3`）全绿，
`samples` 的两份 TS 形状夹具按新形状重生成（`elseKeyword` / `isKeyword` / `initial` 这几处字段名变了）。

新增四条用例：`expr-call-arg-then-object`（形参表后面是逗号 ⇒ 实参表）、
`expr-index-content-in-object`（对象字面量里的下标内容照常跑重组）、
`type-union-member-generic`（类型位联合的成员带实参 / 限定名）、
`type-literal-null-true`（`null` / `true` 在类型位的产物侧形状）。

**下一轮的目标**：`Identifier` 1958、`StringLiteral` 1083（引号成员名 `"accept-encoding"?: T` 一整片）、
`PropertyAccessExpression` 592（计算成员名 `[Symbol.toStringTag]`）、`Block` 408 /
`BinaryExpression` 393 + 漂移 685、`ParenthesizedExpression` 364、`PropertyAssignment` 338、
`ElementAccessExpression` 312、`ComputedPropertyName` 231、`NumericLiteral` 215（`0: string` 这种数字成员名），
以及上面第四节那两处与 align 的 `PropertyAccess` 标签表口子。

### 第 75 轮：TS 形状直出口（第三个出口）—— 投影从测试侧搬进规范

**这一轮改的是「第三个出口」这件事本身**：`cjcli <文件> --ts-ast` 直出 `ts.createSourceFile`
的形状（`kind` 用名字、`pos` / `end`、TS 的字段名），实现写在
[typescript/ts-ast.xl.md](typescript/ts-ast.xl.md)。在此之前，那套投影只活在测试侧
（`tests/parse/ts-shape.mjs`，2464 行 JS）——运行时没有它，于是「投影的账」与「运行时的账」
可以各算各的。现在只有**一份实现**：`cjcli --ts-ast`、`cases:tsast`、
`samples/*.expected.tsast.json` 量的都是同一个函数。

**搬法是逐字搬家，等价性是量出来的**：表名、函数名、函数体、表体一字未改（连空白都一样），
只补类型标注。搬完用一把**一次性尺子** `tests/parse/ts-shape-crossover.mjs`
在全语料上把新旧两份实现的输出**逐字节**对拍：

```
搬家等价性（all）：语料 1399 个文件，解析失败 0，逐字节对拍 1399 个
两份实现输出**逐字节相同**（长度与内容都一致）
```

对拍通过之后那把尺子就删了（`ts-shape.mjs` 随即改成 30 行的转发，只从 `build/ts` 取那一份），
长期判据回到 `cases:tsast` 对 `ts.createSourceFile` 的逐节点对拍。

**搬家当场暴露了一个真缺口（顺手修掉）**：产物里那个跨 5 行的嵌套三元在**对象字面量的属性值**
位置上被收成了「方法声明 + 返回类型 + 方法体」——`BodyIndex` 会跨过运算符去找后面那个 `{`。
最小复现（第 75 轮之前是「三元 0 个、方法声明 1 个」）：

```ts
const p = { name: e(z) ? { k: 1 } : g };          // 错的
const p = { name: e(z) <= f ? { k: 1 } : g };     // 错的（`&&` / `===` / `?` 同理）
const p = { name: e(z)[0] ? { k: 1 } : g };       // 错的（下标）
const p = { name: e(z) in o ? { k: 1 } : g };     // 错的（值位关键字）
```

修法是把第 66 轮那条 `=>` 守卫**推广成三条同族的判定**
（`typescript/tokens/function/method-declaration.xl.md`）：方法声明的形参表后面只可能接
`:` 返回类型 / `{` 体 / 成员边界，接下面的东西就一定是**表达式**——
① 运算符（`ValueOperators`：`=>` / `===` / `&&` / `?` / `.` …）；
② 下标括号 `[`；③ 值位关键字（`ValueKeywordTexts`：`in` / `instanceof` / `as` / `satisfies`，
按文本认词**必须走 `WordText`**——这一刻 `in` 可能还是 `Identifier`，
`KeywordReorganization` 排在队列尾部还没跑过它）。

刻意写成**黑名单**而不是白名单——白名单会连带打掉
成片的无体重载与访问器签名，那个坑在本文件里记着两次净回归。

**`cases:shapelint` 的指针必须跟着搬**（否则它会**静默**失效）：它读的是源码文本、
找的是 `const NAME = new Map([`，搬家后表写成了 `# const NAME:<类型>` + 代码块，
`catch { continue; }` 会把「一张表都没找到」吞成「没有重复键」。现在它默认扫规范文件、
**找不到表就算失败**，并补了 `--self-test`（故意把 `KIND_BY_TAG["Root"]` 写两遍，必须被抓到）。

**数字**（同一套尺子）：

| 判据 | 结果 |
| --- | --- |
| 逐字节对拍（旧实现 vs 运行时直出） | 1399 个文件、**0 处不一致** |
| `cases:tsast`（同一语料） | 97.0% / 字段名 99.3% —— **与搬家前一致** |
| `cases:dashboard` | **真缺 0**（修 `ValueOperators` 之前是三元真缺 1） |
| `cases:run` / `cases:check` | 1027 / 1027、0 条不合格 |
| `cases:astjson` / `lossless` / `structure` / `boundaries` / `matrix` / `diff` | 全绿 |
| `samples` | 三份夹具（XML / AST JSON / TS 形状）× 三个样本，且「命令行 = 库 API」 |

把新生成的 `dist/ts/typescript/ts-ast.ts` 也算进语料时 `cases:tsast` 是 96.7%——
那**不是**投影变差，是语料自己多了一份 1900 行的文件（分母变了），所以上表报的是同一语料的数。

**如实记下的取舍**：① 那份产物带 `// @ts-nocheck`——逐字搬来的函数体是 JS 写法，
`strict` 下要报一百多处，改掉它们就是改写而不是搬家；类型标注仍然写全，它们是文档。
② `NUMERIC_LITERAL` 标 `RegExp`、投影层整体跑在 `any` 上——TS 目标准确，C++ 目标要另想办法
（与 AST JSON 出口同一笔账）。③ 死代码（`stmtLike`）、够不着的 `case` 分支（`projectLogical`）、
重复实现（`matchBrace` / `matchingBrace`）都**照原样留着**：要动它们，另开一轮，用尺子量。

### 第 74 轮：类型谓词 / `export =` / `this` 形参（真实语料 97.1% → 97.4%）

缺口榜上接下来能「一次清一类」的三处，都是**同一个产物标签在投影层少了一层或错了一层**：

| 缺口 | 根因 | 修法 |
| --- | --- | --- |
| `TypeReference` 缺 360 + `Identifier` 一批（父节点 `TypePredicate`） | 类型谓词 `value is T` 的三样身份（`asserts` / 参数名 / `is`）在产物里是**平级子单元**，通用投影把它们全投成一串 `Identifier`——`isKeyword` 与谓词里的类型**整个不成形** | 新增 `projectTypePredicate`：按 `asserts` → 参数名 → `is` → 类型位投影逐段切 |
| `ExportAssignment` 缺 849 + `Identifier` 缺 1149 | `export = X` / `export default X` 的表达式在 `Export` 单元**外面**（`Statement > [Export(export/=), 表达式]`），通用投影把 `Export` 投成 `ExportDeclaration`、表达式留成平级的 `ExpressionStatement` | 新增 `projectExport`：语句里第一个单元是 `Export` 且后面还有兄弟时，整条收成 `ExportAssignment`（**尾分号算进去**，与第 33 轮签名那条口径同源） |
| `Identifier` 缺 1149 里的一大块（父节点 `Parameter`） | **`this` 形参的名字在 TS 里是 `Identifier`**（文本为 `this`），而产物那边它是 `<Keyword>this</Keyword>`——照通用投影投成了 `ThisKeyword`（`ThisKeyword` 只在**类型位**出现） | `projectParameter` 对名字是 `this` 的那种形参显式投 `Identifier` |

量化（同一批 1385 个真实语料文件 + 1027 条用例）：

| 判据 | 改动前 | 改动后 |
| --- | --- | --- |
| `cases:tsast` 真实语料（同 kind 同区间） | 97.1% | **97.4%** |
| `cases:tsast` 用例语料 | 84.8% | **85.3%** |
| 投影后仍缺 `Identifier` | 2564 | **1422** |
| 投影后仍缺 `ExportAssignment` | 849（`expression` 全丢） | **0** |
| 用例 | 1024 条全通过 | **1027 条全通过**（新增 3 条钉住本轮） |

新增三条用例：`mod-export-assignment`、`type-predicate-asserts-is`、`decl-func-this-parameter`。
九把尺子与五把探针全绿。

**下一轮的目标**：`Identifier` 1422（余下的大头在 `PropertyAccessExpression` / `TypeReference` /
`ElementAccessExpression` 下）、`StringLiteral` 1003、`QualifiedName` 844、`TypeReference` 429 + 漂移 1761、
`Block` 380、`ComputedPropertyName` 231。

### 第 73 轮：类型别名右值走类型位投影 + `ConstructSignature`（真实语料 95.8% → 97.1%）

这一轮的两处都是**「按第一个单元投」留下的账**：

| 缺口 | 根因 | 修法 |
| --- | --- | --- |
| `TypeReference` 缺 2102 + `AnyKeyword` 缺 1408（两大块） | `typeOf`（类型别名的右值、类型参数约束与默认值、`as` 的类型、条件类型的分支…）走的是**通用投影**：`Array<any>` 在它眼里是一串平级单元，它只取第一个（`Array`）——**实参整片丢掉**。TS 那边 `Array<any>` 是**同一区间两层节点**（`TypeReference > [Identifier, AnyKeyword]`），所以缺的正是外层 `TypeReference` 与里面的实参 | `typeOf` 改成走 `projectTypeExpression`（类型位投影）：具名类型套 `TypeReference`、原始类型直接是关键字、实参逐段递归 |
| `ConstructSignature` 缺 1190（父节点是 `TypeLiteral` 1019 / `InterfaceDeclaration` 171） | 可构造签名 `new (x: A): B` 与可调用签名在产物里**同标签**（`<Signature kind="call\|construct">`），而 `KIND_BY_TAG` 只写了一条 `CallSignatureDeclaration`——那个名字在这个 TypeScript 里**根本不存在**（`ts.SyntaxKind[...]` 是 `undefined`，真名分别是 `CallSignature` / `ConstructSignature`）；而且 `new` 那一支在产物里多包了一层 `New > NewType`，形参不在 `Signature` 自己身上 | 新增 `projectSignature`：按 `kind` 属性分派两种 kind，并把 `New` 里那一层摊平（形参提到签名自己身上、返回类型从 `ReturnType` 取） |

**顺带纠正两处 kind 名**（都是「按名字猜、猜错了」）：`CallSignatureDeclaration` → **`CallSignature`**、
`TypeAliasDeclaration` 那个构造的 kind 名是 **`Constructor`**（第 72 轮已记）。
`SIGNATURE_KINDS`（决定「签名要不要带尾随分号」）也跟着换成真名。

量化（同一批 1385 个真实语料文件 + 1024 条用例）：

| 判据 | 改动前 | 改动后 |
| --- | --- | --- |
| `cases:tsast` 真实语料（同 kind 同区间） | 95.8% | **97.1%** |
| `cases:tsast` 用例语料 | 82.8% | **84.8%** |
| 投影后仍缺 `AnyKeyword` | 1408 | **0** |
| 投影后仍缺 `TypeReference` | 2102 | **803** |
| 投影后仍缺 `ConstructSignature` | 1190 | **0** |
| 投影后仍缺 `Identifier` | 3009 | **2564** |
| 用例 | 1022 条全通过 | **1024 条全通过**（新增 2 条钉住本轮） |

新增两条用例：`type-alias-generic-any`（类型别名右值的类型位投影）、
`decl-construct-signature`（可构造 / 可调用签名同标签、按 `kind` 属性分）。九把尺子与五把探针全绿。

**下一轮的目标**：`TypeReference` 803 + 漂移 1761（同一类上下文漏网的余量）、
`Identifier` 2564、`StringLiteral` 1003、`QualifiedName` 844、`PropertyAccessExpression` 493、
`Block` 380、`ParenthesizedExpression` 348、`ComputedPropertyName` 231。

### 第 72 轮：声明位的修饰词 + 类构造 + 剩余形参的 `...`（真实语料 95.5% → 95.8%）

这一轮清的是**缺口榜上的三小块**，三处都很小、但根因各不相同：

| 缺口 | 根因 | 修法 |
| --- | --- | --- |
| `ExportKeyword` 缺 606（`InterfaceDeclaration` 480 / `TypeAliasDeclaration` 126） | **同一件事有两种写法**：`Class` 的修饰词是 `modifiers="export"` **字符串**，而 `Interface` / `Namespace` 是 `export="true"` **布尔属性**——`addModifiers` 只认字符串，于是整类 `ExportKeyword` 出不来；`export type T = …` 更绕：修饰词在 `TypeAssign` 上、而 `pos` 要从外层 `Statement` 起 | `addModifiers` 增加布尔属性那一支；`projectTypeAlias` 增加 `baseStart`（外层起点由 `projectStatement` 递进来） |
| `Constructor` 缺 269 | 类里的 `constructor` 在产物里与普通方法**同标签**（`MethodDeclaration`、还带 `name="constructor"`），而 TS 那边它是另一个 kind、**没有名字字段** | 按「父 kind = `ClassDeclaration` + `name` 属性等于 `constructor`」换成 `Constructor`（**不是** `ConstructorDeclaration`——这个 TypeScript 里 `ts.SyntaxKind[...]` 印出来就是 `Constructor`），并从 `structuralProps` 里排掉它的 `name`；`FIELD_BY_KIND` 里补 `Constructor.children → parameters` |
| `DotDotDotToken` 缺 483 | 剩余形参的 `...` 在产物里常常是**平级的 `SymbolToken("...")`**（只有被收成 `Spread` 时才是标签），投影只认了 `Spread` | 两种情况都认，位置取那个单元自己的 `range` |

**同一轮补记第 71 轮的一处口径**：`IfStatement` 的旧路径让 `IfSegment` 的 `condition` / `statement`
两段被子单元**踩了两遍**（`structuralProps` 把段值和 `children` 都扫了），所以第 71 轮换掉那条路径之后
`cases:tsast` 的总节点数**净减 4419**——那不是丢节点，是**不再重复产出**。
第 71 轮的提交信息里没写清这一点，补在这里。

量化（同一批 1385 个真实语料文件 + 1022 条用例）：

| 判据 | 改动前 | 改动后 |
| --- | --- | --- |
| `cases:tsast` 真实语料（同 kind 同区间） | 95.5% | **95.8%** |
| `cases:tsast` 用例语料 | 82.5% | **82.8%** |
| 其中**字段名也一致**（真实语料） | 99.2% | **99.4%** |
| 投影后仍缺 `ExportKeyword` | 607 | **0** |
| 投影后仍缺 `Constructor` | 269 | **0** |
| 投影后仍缺 `DotDotDotToken` | 483 | **0** |
| 用例 | 1020 条全通过 | **1022 条全通过**（新增 2 条钉住本轮） |

新增两条用例：`decl-class-constructor`（类里 `constructor` 与普通方法同标签、投影要分开）、
`decl-fn-rest-parameter`（剩余形参的 `...` 是平级 `SymbolToken`）。九把尺子与五把探针全绿。

**下一轮的目标**：`Identifier` 3009 / `TypeReference` 2102 + 漂移 1749（老账）、
`AnyKeyword` 1408、`ConstructSignature` 1190（类型字面量里的 `new (…)`，**token 层**）、
`StringLiteral` 1174、`QualifiedName` 969。

### 第 71 轮：`Block` 的两处来源 + 逻辑运算符符号进树（真实语料 94.4% → 95.5%）

上一轮点名的第 1 条与第 4 条这一轮一起清了。两处**根因完全不同**，都是 token 层的形状问题：

| 缺口 | 根因 | 修法 |
| --- | --- | --- |
| `Block` 缺 2185（真实语料），其中 **1814 处的父节点是 `IfStatement`** | 两件事叠在一起：① `for` / `for…of` / `while` / `do…while` / `try` 的体在产物里**本来就有自己的单元**（`ForBody` / `ForeachBody` / `WhileBody` / `TryBody`…，区间含那对花括号），但投影的 `KIND_BY_TAG` 里**没有它们**——于是被当「未覆盖标签」原样透传；② `if` 的体不走单元：`IfSet` 的形状是 `IfSet > IfSegment*`，体是段里的**裸语句**，花括号只体现在 `IfStatement` 的区间两端（**包含**），TS 那层 `IfStatement > Block` 在产物里根本不存在 | ① 六个体标签登记成 `Block`；② 投影层新增 `projectIfSet`：`IfSegment` 收起、`else if` 折成**嵌套的 `IfStatement`**、`else` 那个词投成 `ElseKeyword`、体按原文那对花括号收成 `Block` |
| `BarBarToken` 缺 822 + `AmpersandAmpersandToken` 缺 574 + `BinaryExpression` 缺 668 + 漂移 1220 | `LogicalOperatorReorganization` 把运算符当成**分隔符**：`a \|\| b` 收成**两个**各自只有左操作数的 `LogicalOperator`（`a` 与 `b` 分家），`\|\|` 这个符号一个字节都不进树 | 运算符符号改成**段的尾巴**进 `Data`：整条链收成**一个** `LogicalOperator`，子单元按原文顺序排（`[a, \|\|, b]`）；投影层新增 `projectLogical`，按符号左结合折成嵌套的 `BinaryExpression` |

四处「只能是这么写」的判据：

1. **`Block` 的那对花括号要回原文量**：`if (a) { g(); }` 的 `IfStatement` 区间 `[7,18]` 两端**包含**
   （`blockOfBody` 里配对着展开成 `[7,19)`），而 `if (a) g();` 的 `[7,10]` 恰好就是那条语句本身；
2. **判「是不是块」要看全部语句，不能只看第一个 `{`**：`if (a) b(); { c(); }` 里那个 `{` 属于
   **下一条语句**——先找第一个语句起点之前的 `{`，再要求配对出来的 `}` 不早于最后一个语句的终点
   （只看第一个 `{` 会造出 TS 那边不存在的 `Block`）；
3. **`else` 那个词只能在**本段起点之后**找**：`else if` 的段起点在 `if` 上、单语句体的上一段
   `range[1]` 指向那条语句的最后一个字符（`b();` 的 `;`），用 `range[1]` 会整体差一位
   （实测少掉 `[17,38)` 那一层嵌套的 `IfStatement`）；
4. **`LogicalOperator` 不能再挂自己的重组队列**：运算符进 `Data` 之后，本单元的子单元里就有那个符号，
   再挂 `LogicalOperatorReorganization` 会让 `Reorganize` 反复认出自己（实测栈溢出：
   `LogicalOperator → Reorganize → Process → TryToClose → Reorganize → …`）；段内的操作数
   本来就已经在**外层**那一趟里成形了。

量化（同一批 1385 个真实语料文件 + 1020 条用例）：

| 判据 | 改动前 | 改动后 |
| --- | --- | --- |
| `cases:tsast` 真实语料（同 kind 同区间） | 94.4% | **95.5%** |
| `cases:tsast` 用例语料 | 82.1% | **82.5%** |
| 其中**字段名也一致**（真实语料） | 98.8% | **99.2%** |
| 投影后仍缺 `Block` | 2185 | **380** |
| 投影后仍缺 `BarBarToken` / `AmpersandAmpersandToken` | 822 / 574 | **0 / 0** |
| 投影后仍缺 `BinaryExpression` | 668 + 漂移 1220 | 0 + 漂移 0 |
| 投影后仍缺 `Identifier` | 3493 | **3009** |
| 投影后仍缺 `PropertyAccessExpression` | 676 | **493** |
| 用例 | 1017 条全通过 | **1020 条全通过**（新增 3 条钉住本轮） |

新增的三条用例分别钉住：`if` 条件里的 `||` 链是一个 `LogicalOperator`
（`stmt-if-condition-logical-or`）、`&&` / `||` 混用时子单元顺序仍是原文顺序
（`stmt-if-condition-logical-mixed`）、值位的逻辑链同样是「一个单元 + 符号在里面」
（`expr-logical-chain-let`）。九把尺子与五把探针全绿，`samples` 的 `generic` 夹具按新形状重生成。

**下一轮的目标**（缺口榜又换了一批）：

1. **`Identifier` 3009 / `TypeReference` 2102 + 漂移 1749**：老账——签名位的类型实参、点号计算名；
2. **`ConstructSignature` 1190**：类型字面量里的 `new (…)` 没有对应标签（**token 层**）；
3. **`StringLiteral` 1174 + `AnyKeyword` 1408**：都是类型位的上下文漏网；
4. **`DotDotDotToken` 483**：`...rest` 在形参上的 `...` 没进形参节点（与第 30 轮 `?` 同型的字段切分）。

### 实测规模

`node_modules` 下 226 个真实 `.d.ts` + 本项目产物 `.ts` + 1027 条用例
**全部解析成功、零异常、零内容丢失**（`npm run cases:lossless` 覆盖 1398 个文件；
外加 92 个「结尾没有换行」片段与 27 个换行风格 / 规模片段，见第 64 轮）。
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
