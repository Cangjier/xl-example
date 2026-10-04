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
| **引擎**（`runtime/`） | **~98%** | 值 / 堆 / GC / 帧 / IR / 装载验证 / 执行器 / 宿主 ABI 都在跑；线形态从第 129 轮起承载 f64（升 v2）✓；第 133 轮加了第 22 个算子 `call_array` ✓；第 136 轮 `iter_new` / `iter_next` 认字符串 ✓；第 137 轮的「内建构造函数 → 原型」登记表 ✓；第 139 轮「失败类别」✓；第 142 轮 `NativeCall` 的实参表开宽 ✓；第 144 轮真假收成一个 `TruthyOf` ✓；第 145 轮「既是对象又可调用」✓；**第 147 轮位运算七条**（`ToInt32Of` / `ShiftCountOf` 两条共用判据 + 七条算子 ✓，`BitNot` / `UShr` 两个新号**追加在表尾** ✓）；缺 wasm 执行器（P3）、特化与内联缓存（P4） |
| **降级层**（本目录） | **~99%** | 语句 / 表达式 / 类 / 闭包 / 生成器 / `for..of` / `try` / 解构都在跑；解构形参（第 134 轮）✓；对象剩余（第 135 轮）✓；`super(...xs)`（第 141 轮）✓；`new Date` 特例撤掉（第 145 轮）✓；解构赋值（第 146 轮）✓；位运算与复合赋值六条（第 147 轮）✓；**第 148 轮类型位那一族整族跳过**（`type` / `interface` / `declare` 六种 / 重载签名 / 抽象成员 ✓）；**缺 `enum` 与运行期 `namespace`** ✗（都有运行期语义 ✓，要造对象 ✓，下一步第一、二条 ✓）、`new C(...xs)` 与 `super.m(...xs)`、正则、`export default` |
| **标准库**（`builtins/`） | **~88%** | `Array` / `String` / `Object` / `Math` / `Number` / `JSON` / `Map` / `Set` / `Symbol` / `Date` 的常用那一半；第 130 轮的 `findIndex` · `Array.from` · `Object.assign` · `String.fromCharCode` · `String.replace` ✓；第 131 轮的 `console.log` 形状 ✓；第 137 轮错误家族 ✓；第 138 轮三族 `prototype` / `constructor` ✓；第 140 轮内建 `super()` ✓；第 142 轮 `sort` / `reduce` / `shift` / `fill` / `flat` ✓；第 144 轮 `filter` 与谓词族的真假 ✓；第 145 轮 `String(x)` / `Number(x)` / `Boolean(x)` / `Array(n)` / `new Date(ms)` 与 `typeof` ✓；**第 149 轮 `NaN` / `Infinity` / `isNaN` / `isFinite` / `Number.isFinite` / `globalThis` + `**`（`PowId` 那条内建）** ✓；缺 `splice` / `replaceAll` / `fill(值, 起, 止)` / `flat(深度)`、原始值原型（`toFixed` / `toString(基数)`）、`Object.prototype` 上的方法、`Map` / `Set` 的内部槽 |
| **端到端**（普通 `.ts` 文件） | **~99%** | **41** 份语料逐字节一致（含类、继承、集合、生成器、`await`、标准库、类字段与 `static`、数字字面量全形态、`console.log` 的容器形状、展开与剩余的两半、函数的两条形状、解构形参、`for..of` 解构与 `var` 提升、字符串可迭代与空值读抛、`instanceof` 与错误家族、三族集合的原型格、引擎抛的 `TypeError`、自定义错误类、默认构造函数与 `super(...xs)`、两个实参的回调族、实参位的可选链、真假、可调用的全局名、解构赋值、位运算七条、类型位的声明整族跳过、**数值常量与幂**）；下一个是 **「未声明读法的运行期化」**（见「下一步」第一条 ✓——`enum` 与 `namespace` 已按新口径移到第 5 条 ✓） |

**这三个百分数是估计，不是读数**——它们是按「这一层要做的事还剩多少」折算的，
每轮按实测的新缺口与新补上的构造更新；**唯一硬读数**是下面这两条判据的条数
与语料数（`runtime:check` **208** 条 / `runtime:cli` **41** 份 ✓）。

### 整体进度（加权；第 149 轮）

四层各自的百分比是**估计**，权重是**这一层在「一份普通 `.ts` 跑对」里占的分量**：

| 层 | 权重 | 本轮估计 | 贡献 |
| --- | --- | --- | --- |
| 引擎（`runtime/`） | 25% | 98% | 24.50 |
| 降级层（`typescript-exec/` 除 `builtins/`） | 30% | 99% | 29.70 |
| 标准库（`builtins/`） | 25% | 88% | 22.00 |
| 端到端（普通 `.ts` 直接跑） | 20% | 99% | 19.80 |
| **合计** | 100% | — | **96.0%** |

**下一步（第 149 轮收尾时更新，按要紧程度排）**。
**排序口径这一轮换了一次** ✗：从「这一层还剩什么」换成「**Node 跑得动而我们跑不了**」✓——
因为目标那句是「stdout 与 `node <文件.ts>` 逐字节相同」✓，而 **Node 自己拒绝运行的东西**
（`enum` ✓、运行期 `namespace` ✓）在这一条判据下**没有意义** ✗：
type stripping 不做变换 ✓，`node <文件.ts>` 直接报错 ✓。它们记在第 5 条 ✓（不是不做 ✓，
是**排在后面** ✓）。

1. **`typeof` 之外的「未声明读法」** ✗：`window.foo` / 直接读一个没声明的名字照旧
   **降级期**抛 ✓（JS 是运行期 `ReferenceError` ✓，`try` 接得住 ✓）——
   本仓整份文件进不来 ✗。要做的是「**把名字解析推迟到运行期**」✓（与 `typeof` 同一族 ✓）。
2. **括号表达式当非第一个实参时被判成类型位** ✗（第 147 轮插桩量出来的 ✓）：
   `console.log("x", (a & b))` 里那个括号的判据是 `before = ","` ✓ →
   `a & b` 折成 `IntersectionType` ✓。与 `=>` 那一格同源 ✓。判据钉在明处 ✓。
3. **`f?.(o?.a, "q")`** ✗：**可选调用的实参表里带逗号**时，实参被折成一个
   `BinaryOperator op=","`——降级层报 `unimplemented: binary operator ,`。
4. **数组解构走的是下标，不是迭代协议** ✗（第 146 轮量出来的 ✓）：
   `[q] = 5` 静默给 `undefined` ✓（JS 抛 `TypeError` ✗）、
   `[a, b] = new Set([8, 9])` 静默给两个 `undefined` ✗。**两半一致** ✓，但是**静默**的 ✗。
5. **`enum` 与运行期 `namespace`** ✗（第 148 轮量到的 ✓，**这一轮降级**✓）：
   两者都有运行期语义 ✓（要真造对象 ✓），但 **Node 自己就拒绝运行它们** ✗——
   所以它们**不影响「与 Node 逐字节相同」**这一条 ✓（只影响「本仓比 Node 更能跑」✓）。
6. **`typeof typeof x`** ✗（第 149 轮顺手量到的 ✓）：`typeof` 套 `typeof` 报
   `unimplemented: expression TypeOfKeyword` ✓——投影把**内层那个** `typeof` 投成了
   `TypeOfKeyword` ✓（与 `[x in y]` / 逗号后的括号同族：**投影的位置判据** ✗）。
7. **原始值原型** ✗：`(1.2345).toFixed(2)` / `(255).toString(16)`——数字与布尔还没有原型格。
8. **`try { return … } finally { … }`** ✗（现在**响亮地抛** ✓）、
   **`[...generator()]`** ✗（与第 4 条同源 ✓）、**`async f().then(…)`** ✗、
   `class C { toString() }` 用在模板串里 ✗（**静默给 `[object Object]`** ✗）。
9. **宿主专有的全局名** ✗（第 149 轮如实记下的差异 ✓）：`typeof process`（Node 给 `"object"` ✓）
   在本仓给 `"undefined"` ✗——本仓的全局对象**故意小** ✓（宿主能力走能力表 ✓）。
   这一格与第 1 条**同一条路** ✓：把宿主能力接进作用域是宿主自己的决定 ✓。
10. `[x in y]`（数组字面量里放 `in` ✗）、**`{ A }a += 1`**（块与表达式之间没有分隔符 ✓）、
    `Array.from({length}, fn)`、`splice` / `replaceAll`、`Map` / `Set` 的内部槽、
    `super.m(...xs)`、`new C(...xs)`、`extends Map` 的 `super()`。
10. `Array.from({length}, fn)`、`splice` / `replaceAll` /
    `Map` / `Set` 的内部槽（`Object.keys(new Map())` 给 12）、**「不是函数却调用它」带类别**、
    **话里带上键名**、`super.m(...xs)`、`new C(...xs)`、`extends Map` 的 `super()`。

> **第 144 轮的账在下面（`### 第 144 轮的账`）**：这一轮不在上面这张单子里——
> 它是**顺手用 `Boolean(x)` 那条缺口反查出来的**：`Boolean("")` 该给 `false` ✓，
> 而实现它的那一格（`Value.AsBool`）给 `true` ✗，于是 `if ("")` **一直在走真那一支** ✓。


### 第 149 轮的账（四个「Node 跑得动、本仓跑不了」的小口子）

**这一轮的排序口径换了一次** ✗（记在明处 ✓）：上一轮把手上的单子按「这一层还剩什么」排 ✓，
于是 `enum` 排在第一位 ✓。这一轮先量了一件事 ✓——**Node 自己拒跑 `enum` 与运行期 `namespace`** ✓
（type stripping 不做变换 ✓，`node <文件.ts>` 直接报错 ✓）：
而目标那句是「stdout 与 `node <文件.ts>` **逐字节相同**」✓，
**Node 跑不动的东**（✗）在这条判据下**没有意义** ✓。所以口径换成
「**Node 跑得动、而我们跑不了**」✓——`enum` 与 `namespace` 因此移到第 5 条 ✓
（不是不做 ✓，是排在后面 ✓）。按新口径量出来的四个口子，这一轮全做掉了 ✓。

**一、`NaN` / `Infinity`**（原来让**整份文件**在降级期失败 ✗：报
`name is not a local or a capture: Infinity` ✓，听起来像写错了变量名 ✗）：
它们是**全局对象上的属性** ✓（不是关键字 ✓），与 `undefined` 走**同一条路** ✓——
所以加在 `GlobalNames` 与 `BuildGlobals` 两处就行 ✓，降级器一行都不用动 ✓。
**已知差异**写在明处 ✗：JS 里它们是**只读**的 ✓（严格模式下 `Infinity = 1` 抛 ✓），
这一层没有「只读」那一格 ✓，所以脚本给它们赋值在这里会成功 ✗。

**二、`**`：走**语言建内建**那条，不进通用算子表** ✓

`RtOp.Pow` 那一格**设计期就编了号** ✓（一直留着 ✓），但这一轮**不用它** ✗：
幂的舍入**没有标准定死** ✗——IEEE 754 不要求 `pow` 正确舍入 ✓，各目标的 `pow`
可能差最后一位 ✓；而 `runtime/host-text.xl.md` 那条规矩是
「**借的必须是结果被标准定死的东西**」✓。放进**建库层**就名正言顺 ✓——
那一层本来就是「JS 家族语义 + 一处诚实的宿主借用」✓，而 `Math.pow` **早就在那儿** ✓。
于是 `**` 与 `Math.pow(x, y)` 走**同一行代码** ✓（JS 的规范本来就说 `**` 的语义**就是**它 ✓）。
**`RtOp.Pow` 那一格留着、不删** ✓（「只追加、不改号」✓）。

**第一版只做了二元那条** ✗，于是 `acc **= 2` 仍旧报
`unimplemented: binary operator **` ✓——**两种形状同一个运算符，一个通一个不通** ✓，
那是最容易看漏的一种 ✓。根因是复合赋值那条分支**在进分支之前**就调了
`BinaryOpOf(底)` ✓（而 `**` 没有通用算子号 ✓）。修法：把「算」那一步从**三处**
（名字 / 属性 / 下标 ✓）收成一个 `CombineValues` ✓——它先判 `**` ✓，其余才去问 `BinaryOpOf` ✓。

**三、`typeof` 一个没声明的名字**：JS 里这是**唯一不抛**的未声明读法 ✓
（`typeof window !== "undefined"` 遍地都是 ✓），原来在**降级期**就抛 ✗（整份文件进不来 ✓）。
判据是「这个名字在这一层与作用域链上都找不到」✓（`NameIsUnreachable` ✓，
与 `ResolveAccess` **同一份查找顺序** ✓），命中就给**字符串** `"undefined"` ✓——
**不是 `undefined` 那个值** ✗（最容易写错的一格 ✓）。**`typeof` 之外照旧抛** ✓（与 JS 一致 ✓）。

**这一格带出两处必须一起补的东西**（不补就是**静默**的不一致 ✗，比原来那个响亮的抛更糟 ✗）：

- **`globalThis`** ✓：它不补的话，`typeof globalThis` 会按新规矩给 `"undefined"` ✗，
  而 Node 给 `"object"` ✓——所以补一格「指向那个环境对象自己」✓（`globalThis.Math === Math` ✓）；
- **`isNaN` / `isFinite` 与 `Number.isNaN` / `Number.isFinite`** ✓：**两对**，
  差别只在「**转不转**」✓（全局的**先 `ToNumber`** ✓，`Number.` 那两个**不转** ✓）。
  `Number.isFinite` 是这一轮量出来的第三个缺口 ✓（探针里一用就报
  `calling a non-closure value` ✓）。**写成一份实现就会让其中一对错** ✗，
  而错的那一半**不报错** ✓，只给一个反的布尔 ✓。

**剩下的一档差异如实记下** ✗：`typeof process` / `typeof require` / `typeof setTimeout`
这些**宿主专有**的名字，Node 给 `"object"` / `"function"` ✓，本仓给 `"undefined"` ✗——
本仓的全局对象是**故意小的** ✓（宿主能力走能力表 ✓，不往脚本作用域里塞 ✓）。

**顺手量到的第四个小口子**（进「下一步」第 6 条 ✓）：`typeof typeof x` 报
`unimplemented: expression TypeOfKeyword` ✓——投影把**内层那个** `typeof` 投成了
`TypeOfKeyword` ✓（与 `[x in y]` / 逗号后的括号同族 ✓：**投影的位置判据** ✗）。

**语料与判据**：

- `tests/runtime/cases/41-numeric-globals-and-pow.ts`（**9 行 stdout 与 `node` 逐字节相同** ✓）：
  三个常量与两条除法 ✓、**转与不转那两对** ✓、`**` 四形状 ✓、`**=` 三种左值 ✓、
  `typeof` 未声明 / 已声明 / `globalThis` ✓、特性检测 ✓、`globalThis.Math === Math` ✓；
- `runtime:check` 三条（**208 条** ✓）：①三个常量 + 两对判定的分工 + `globalThis` ✓；
  ②`**` 与 `**=`（并钉住「`RtOp.Pow` 留着、实现走建库层」这个决定 ✓）；
  ③`typeof` 那一格 + 「`typeof` 之外照旧抛」+ 宿主专有名字那档差异 ✓；
- `cases:tsast` **1430/1430** ✓（这一轮没动 token 层 ✓）。

### 第 148 轮的账（类型位的声明一个运行期指令都不产生）

**做的是「下一步」的第一条** ✓，也就是第 147 轮量出来的**那一档最大的拦路虎** ✓：
`type X = …` 报 `unimplemented: expression TypeAliasDeclaration` ✓、
`interface I { … }` 报 `unimplemented: statement InterfaceDeclaration` ✓——
**不是在运行期失败，是整份文件根本降级不出来** ✗。而这两样在真实的 `.ts` 里
几乎无处不在 ✓（本仓自己 `dist/ts/**` 的每一份产物都带 `interface` ✓）。

**口径是现成的** ✓：文末那条「**类型位一律擦除**」✓——类型别名与接口**不产生任何运行期东西**
（JS 里也没有它们 ✓），它们只描述形状 ✓，而本仓不做类型检查 ✓。所以**整条跳过** ✓：
不查名字 ✓、不查成员 ✓（**查了反而错** ✗：接口成员的类型文本里可以有这一层不认识的写法 ✓，
而它们本来就不该影响运行 ✓）。

**同一条判据顺手关掉的另两处**（都是**同一形状**：声明是真的、运行期没有东西 ✓）：

| 形状 | 为什么也该跳过 |
| --- | --- |
| `declare function` / `const` / `class` / `module "x" {}` / `global {}` / `namespace D {}` ✓ | 「环境声明」说的是**外面已经有它** ✓——那份文件跑起来并没有那个值 ✓ |
| **没有体的函数 / 方法声明** ✓（`function f(a: string): void;` 后面跟实现 ✓、`abstract m(): void;` ✓） | 重载签名与抽象成员**在运行期什么也不是** ✓；语义在那条**带体的**声明里 ✓ |

判据都收在「**有没有体**」与「**有没有 `declare` 修饰词**」两句上 ✓——
两处（`Hoist` 与 `LowerStatement` ✓、类成员那一圈 ✓）**都要** ✗：
插桩把两处都点出来过 ✓（先是 `Hoist` 报 `FunctionDeclaration has no child body` ✓，
修完之后 `LowerStatement` 又报一次 ✓——**同一个形状在两个阶段各拦一次** ✓）。

**顺带改准的一句话** ✓：`scope.xl.md` 的 `CollectDeclaredNames` 原来把
`declare const AMBIENT` 的名字收进**声明名单** ✓，于是「用到它」报的是
`name used before its declaration` ✗——**那句话指错了方向** ✓
（它不在「声明之前」✓，它**根本没有** ✓）。排掉环境声明之后报的是
`name is not a local or a capture: AMBIENT` ✓，与真相一致 ✓。
**与 Node 差一档，记在明处** ✗：Node 是**运行期** `ReferenceError`（`try` 接得住 ✓），
本仓是**降级期**拒绝 ✓（与第 146 轮那条「解构赋值给没声明的名字」同一档 ✓；
TS 自己在类型检查期也会报 `Cannot find name` ✓，所以正常 `.ts` 到不了这一格 ✓）。

**这一轮差点记了一个不存在的缺口** ✗（如实写下来 ✓）：写判据时我把三条语句放在**一行**上 ✓
（`declare namespace D { … } const z = 1;` ✓），于是报的是
`unimplemented: assignment to a non-identifier` ✓——**那是 README 里记的
「块与表达式之间没有分隔符」那条老缺口** ✓（`{ A }a += 1` 同源 ✓），
与 `declare namespace` 毫无关系 ✗。我一度把它当成「`declare namespace` 的窄缺口」写进判据 ✓，
换成两行之后它**跑得完全正确** ✓。**教训写在判据里** ✓：那一条现在是
「`declare namespace` 整族跳过」的**正面断言** ✓，不再是缺口的钉子 ✓。

**语料与判据**：

- `tests/runtime/cases/40-type-declarations.ts`（**4 行 stdout 与 `node` 逐字节相同** ✓）：
  联合 / 交叉 / 条件 / 映射 / 深嵌套泛型 ✓、`declare` 六种 ✓、`export type` / `export interface` ✓、
  **重载签名** ✓、**抽象类 + 抽象方法** ✓、函数体内的 `type` / `interface` ✓、
  以及它们与运行期代码混在一起 ✓；
- `runtime:check` 一条（**205 条** ✓）：类型那一族跳过之后**运行期那部分照常跑** ✓、
  **环境值不是值**（用它在降级期就抛 ✓）、**运行期的 `namespace` 不在擦除名单里** ✓、
  **`declare namespace` 整族跳过** ✓（就是上面那条教训 ✓）；
- `cases:tsast` **1430/1430** ✓（这一轮没动 token 层 ✓）。

### 第 147 轮的账（位运算七条 · 以及一路撞出来的三处）

**做的是「下一步」里的位运算** ✓：`flags |= 4` 原来在**降级期**就报
`unimplemented: binary operator |=` ✓。做完之后这一轮**变成了四件事** ✓——
其余三处都是「写判据 / 建语料时撞出来的」✓，如实记在这里 ✓。

**一、位运算七条（`& | ^ ~ << >> >>>`）**

引擎的算子表里这七格**大半一直都在** ✓：`BitAnd` / `BitOr` / `BitXor` / `Shl` / `Shr`
是设计期就留好的号 ✓（**声明了、没实现** ✗——`rt.xl.md` 里没有它们、`RunRtOp` 里也没有分派 ✓），
`BitNot`（`~`）与 `UShr`（`>>>`）是这一轮**追加**的 ✓。
**追加在表尾、不挨着兄弟** ✓（`ir.xl.md` 的 `RtOpCount` 38 → 40 ✓）——
「只追加、不改号」是那张表的规矩 ✓，可读性让位给兼容性 ✓。

语义照 JS 的三条硬规矩，全部落在**两个共用判据**上 ✓：

| 判据 | 它管什么 |
| --- | --- |
| `ToInt32Of` | 两边都要过它 ✓：`NaN` / `±Infinity` → `0` ✓、小数**向零截断** ✓、按 2³² 取模再折回有符号 ✓ |
| `ShiftCountOf` | 移位那个数取**低 5 位** ✓（`ToUint32(右) & 31` ✓——**这里可以借 `ToInt32`** ✓：两者只差最高位那一位 ✓，而 `& 31` 只看低 5 位 ✓） |

**整段用算术写、不写 `n \| 0`** ✓：那一步在四个目标上写法不同 ✗（C++ 里 `int32_t(双精度)`
越界是 UB ✗），而这里每一步（比较 ✓、取余 ✓、减法 ✓、`% 1` 截断 ✓）的语义四个目标都一样 ✓——
与 `MakeNumber` 里那条「用一次除法看符号位」同一条理由 ✓。

**这一轮的两处实测 bug**（都是**判据抓到的** ✓，两处都「静默给一个看起来成立的整数」✗）：

1. **截断与取模的顺序** ✗：第一版先加 `2³²` 再截断 ✓，于是 `-1.9 | 0` 给 `-2` ✗
   （JS 给 `-1` ✓）——「向零截断」对负数与对「加过一轮的大正数」是两个方向 ✓；
2. **`>>>` 的高位** ✗：算术右移给负数补 1 ✓，而无符号右移该补 0 ✓——
   `-1 >>> 28` 该是 `15` ✓，第一版给的是 `4294967295` ✗。
   修法是「移位数大于 0 时把高几位的 1 自己抹掉」✓（`2147483647 >> (k - 1)` 正好是
   「低 `32 - k` 位全 1」✓），只有**移位数是 0** 那一格才走「负数加 `2³²`」✓。

**降级层那一侧**：`BinaryOpOf` 加七条映射 ✓、一元 `~` 接上 ✓、
复合赋值从「`+=` 那五条 + `operatorText.slice(0, 1)`」改成**一张 `CompoundBaseOf` 表** ✓——
那个 `slice` 对 `<<=` / `>>=` / `>>>=` **当场错** ✗（切出 `"<"` / `">"` ✓），
而报出来停在 `unimplemented: binary operator <` ✓（离现场很远 ✗）。

**`**` 特地没做** ✗，理由与三条候选写在「下一步」第七条 ✓——
一句话：`pow` 的舍入**没有标准定死** ✗，所以它**不该进引擎** ✗
（`host-text.xl.md` 那条「借的必须是结果被标准定死的东西」✓）。

**二、顺手修掉的一处 token 层缺口（`=>` 的体）**

写语料时撞出来的 ✓：`(n) => (n | 0)` 报 `unimplemented: expression UnionType` ✗——
**`&` / `|` 在箭头函数的体里根本用不了** ✗（`i & 1` 这种日常写法 ✓）。
根因在 `IsTypeBracketPosition`：**「前一个实义单元是 `=>` ⇒ 类型位」** ✓ 是给*函数类型的返回段*
写的 ✓（`type F = (a: A) => (B & C)` ✓），而**箭头函数的体**紧跟在同一个 `=>` 后面 ✗——
插桩实测：`owner=Root at=5 before=SymbolToken/=>` ✓。**块体也一样** ✗
（`(n) => { return (n & 2) === 2; }` 里那个 `{` 的判据同样是这一条 ✓）。

修法：**问一句「形参表是不是箭头函数的形参表」** ✓——`LamdaReorganization.IsLambdaParameters`
已经答过这件事 ✓（它自己那一串判据：前面是 `:` / `?:` / `new` / `extends` / 类型别名赋值
⇒ 函数类型 ✓，否则是箭头 ✓）。**不自己写一份近似** ✗：写歪的症状是
「函数类型的返回段被判成值位」✗（`type F = (a) => (B | C)` 丢掉联合节点 ✓），比原来那个更难查 ✓。
这段判据落在 `tokens/type-union.xl.md` **而不是** `text-common-util.xl.md` ✓：
`lamda.xl.md` **import 了** `text-common-util.xl.md` ✗，反向 import 就是模块环 ✗；
本文件与 lamda 之间没有这个环 ✓。

**三、又一处 token 层缺口（这次是「本来就已经红的」）**

为了让引擎那一侧的新代码进语料 ✓，这一轮把 `typescript/**` 整个**强制重建**了一遍 ✓——
于是 `cases:tsast` 从 1430/1430 掉到 1429/1430 ✓，红的是
`tests/parse/cases/expressions/expr-optional-in-argument.ts` ✓（第 143 轮自己加的那条用例 ✓）。
**查明之后是两件事叠在一起** ✓：

- 旧 `dist/ts/typescript/**` 比规范**新** ✓（判据只看「规范比产物新」✓，不看反向 ✓），
  所以那一次 1430/1430 量的是**上一版的产物** ✓——与 `check.mjs` 文首那条纪律同源 ✓。
  这一条**记在明处** ✓：`cases:tsast` 的语料新鲜度只拦一个方向 ✗。
- 真 bug 在 `tokens/method.xl.md` 的 `PrintAst` ✓：**可选链那一支**（第 107 轮写的 ✓）
  只判「`Method` 的子单元里有 `NCO`」✗，没判**那个 `NCO` 属于谁** ✗——
  `f(o?.a)` 的产物是 `<Method name="f"><Identifier>o</Identifier><NCO>a</NCO></Method>` ✓，
  第一个子单元是**实参** ✓，可那一支照样把「实参那条链」当成**整条调用的投影**返回 ✗，
  `CallExpression` 与 `Identifier(f)` 一起没了 ✗（就是判据报的「缺 3 / 漂移 2」✓）。
  **修法是加一句判据**：**第一个子单元就是被调用者自己** ✓（`x?.y?.(1)` 的 `Identifier(x)`
  与 `name="x"` 同名 ✓、`f(g?.(1))` 内层同理 ✓）。让开之后它落到
  `print-ast-common.xl.md` 的 **0a0** 支 ✓——第 143 轮写的**正是这一支** ✓，
  只是被上面那一支抢在前面了 ✗。

**四、量出来、记在明处的两条**（都不是这一轮弄出来的 ✓，都进了「下一步」✓）

1. **`type` / `interface` 声明让整份文件进不了门** ✗✗：`type F = number;` 报
   `unimplemented: expression TypeAliasDeclaration` ✓、`interface I { … }` 报
   `unimplemented: statement InterfaceDeclaration` ✓——**任何一份真实的 `.ts`** 都带这两样 ✓
   （本仓 `dist/ts/**` 每一份产物都有 ✓）。而按文末那条口径「类型位一律擦除」✓，
   它们**不该产生任何运行期东西** ✓，所以正确做法是**直接跳过** ✓（很轻 ✓）。
   它是「整份文件进不了门」那一档 ✓，所以排在「下一步」第一条 ✓。
2. **括号表达式当非第一个实参** ✗：`console.log("x", (1 & 2))` 里的括号被判成类型位 ✓
   （插桩：`owner=Bracket at=2 before=SymbolToken/,` ✓——「`before` 是 `,`」被当成
   *类型参数表* 的证据 ✓），于是 `1 & 2` 折成 `IntersectionType` ✓。
   与 `=>` 那一格同源 ✓，但修它要多问一句「包着它的那个括号是不是一次调用的实参表」✗，
   单独立一轮 ✓。语料里**避开了这个形状** ✓（并写明为什么 ✓）。

**语料与判据**：

- `tests/runtime/cases/39-bitwise-operators.ts`（**10 行 stdout 与 `node` 逐字节相同** ✓）：
  七条算子 ✓、`ToInt32` 的四类输入 ✓、复合赋值六条 ✓、掩码过滤 ✓、字符串哈希 ✓、
  箭头体（括号式与块式 ✓）、`~x` 与 `-x - 1` 的对照 ✓；
- `runtime:check` 三条（**204 条** ✓）：①`ToInt32Of` 的十一档 + 非数值抛 ✓；
  ②七条算子的结果与 `>>>` 的进位 ✓；③端到端 + **两条已知缺口钉在明处** ✓
  （`type` 声明 ✓、逗号后的括号 ✓——做出来那天它们会当场变红 ✓）；
- `cases:tsast` **1430/1430** ✓（那一处投影 bug 修掉之后 ✓）。

### 第 146 轮的账（解构赋值）

**做的是「下一步」的头一条** ✓：`[a, b] = [b, a]` 报
`unimplemented: assignment to a non-identifier` ✓。

**根因是「投影的形状与这一层的左值表对不上」** ✓：`=` 只认三种左值
（名字 ✓ / `o.x` ✓ / `o[k]` ✓），而解构赋值左边的 `[a, b]` 在 TS 的 AST 里是
**`ArrayLiteralExpression`** ✓、`({a} = o)` 左边是 `ObjectLiteralExpression` ✓
（投影与 `ts.createSourceFile` 逐节点一致 ✓，所以形状不能改 ✗）。
它**绝不能**走 `LowerExpression` ✗——那会把 `[a, b]` 当成数组字面量**造一个新数组** ✓，
而真正要拆的是右边那一格 ✓。

**做法的口径：读法一份、写法人各一半** ✓。声明那一半（`Destructure` ✓）与赋值这一半
（`DestructureAssign` ✓）**读法一个字都不差** ✓——对象按属性名 ✓、数组按下标 ✓、
`...剩余` 走**同一个**内建（`ArrayRestId` / `RestObjectId` ✓）、
默认值只在**严格 `undefined`** 时求 ✓。为此把两段共用规矩**提了出来** ✓：

| 新方法 | 它是什么 | 谁在用 |
| --- | --- | --- |
| `DestructureDefault` | 默认值那一段（严格 `undefined` 才求 ✓、懒 ✓） | 声明 ✓ + 赋值 ✓ |
| `PropertyKeyNodeOf` | 「一个成员拿走的键是哪个节点」——对象剩余的**排除名单**要靠它 ✓ | 声明 ✓ + 赋值 ✓ |
| `DestructureTarget` | 「目标 + 可选默认值」那一段（带默认值的元素是一个 `BinaryExpression` ✓） | 赋值（数组元素 ✓ + 对象成员 ✓） |
| `StoreAssignTarget` | 把一格值写进四种目标（已存在的名字 / `o.x` / `o[k]` / 再嵌一层模式 ✓） | 赋值 ✓ |
| `StaticKeyNodeOf` | 名单里能用哪种键（`["a"]` ✓ 算常量，`[k]` ✗ 不算） | 赋值（对象剩余 ✓） |

**为什么两半不合成一个函数** ✗：两边「临时量能不能退水位」是**相反**的 ✓——
声明那一半因为 `BindName` 会**在当前水位之上留变量格** ✓，所以**一律不退** ✓
（退了就把变量格交出去 ✗，症状是「几条语句之后读到别人的值」✓）；赋值这一半
**一个变量都不声明** ✓，临时量该退就退 ✓。用一个布尔开关表达这件事，
等于**两套水位纪律挤进一个函数** ✗——那是这个文件里最容易出错的一类形状 ✓。

**顺手收下的两样**（都在赋值那一半 ✓）：

- **计算键** ✓：`({[k]: v} = o)`——键**当值求一次** ✓，走 `get_index` 那条
  （**不能走 `get_prop`** ✗：那条只收字符串 / 符号的键 ✓，而 `({[1]: n} = …)` 的键是一个**数** ✓，
  JS 会把它 `ToPropertyKey` 成 `"1"` ✓，`get_index` 那一条正是「非数组接收者先把键字符串化」✓）；
- **常量计算键 + 对象剩余** ✓：`({["a"]: w, ...rest} = src)`——名单是**编译期的常量表** ✓，
  `["a"]` 编译期就知道是哪个键 ✓，所以放得进去 ✓。

**三处响亮地抛**（不许静默 ✓）：

1. **目标名字没声明** ✗：`[missing] = [2]` → `ResolveAccess` 抛
   「name is not a local or a capture」✓——**不静默造一个全局** ✓
   （JS 在**脚本**里造全局 ✓、在**模块**里抛 `ReferenceError` ✓，本仓走模块那一档 ✓；
   而且它**在降级期**就抛 ✓——TS 自己也会报 `Cannot find name` ✓，所以正常 `.ts` 到不了这一格 ✓
   **差一档记在这里** ✓：JS 是运行期 `ReferenceError` ✗，本仓是降级期拒绝 ✓）；
2. **运行期计算键 + 对象剩余** ✗（`({[k]: v, ...r} = o)`）：
   名单是编译期的 ✓，要支持它就得「把键值一路留着」✗ 或者「到这儿重算一遍」✗，
   后者会让那个表达式的**副作用跑两遍** ✓。漏掉一个键的症状只是
   「剩余对象里多出一个已经拆走的键」✓（**静默错值** ✗），所以这里宁可抛 ✓；
3. **不可迭代的右边**……**这一条没做到** ✗，见下面那条已知差 ✓。

**量出来的一档已知差（不是这一轮弄出来的）** ✗：数组解构走的是**下标**读 ✓，
不是 JS 的**迭代协议** ✓——于是

```
[q] = 5                  → q 是 undefined（JS 抛 TypeError）
[s1, s2] = new Set([8, 9]) → 两个 undefined（JS 给 8, 9）
[a] = generator()          → undefined（JS 迭代）
```

**两半一致** ✓（同一个读法 ✓，声明那一半从第 119 轮起就是这样 ✓），但它是**静默**的 ✗——
按本仓的排序，静默错值比响亮地抛更该先修 ✓，所以它进了「下一步」的**第二条** ✓
（与 `[...generator()]` 同源 ✓：两处都缺「用迭代协议拿一串值」那一格 ✓）。
**判据把它钉在明处** ✓（`runtime:check` 第 146 轮那一节 ✓）：哪天换成迭代协议，
那两条会**当场变红** ✓，那正是它们该有的作用 ✓。

**语料与判据**：

- `tests/runtime/cases/38-destructuring-assignment.ts`（**12 行 stdout 与 `node` 逐字节相同** ✓）：
  交换 ✓、对象剩余 / 重命名 / 默认值 ✓、洞 ✓、数组剩余 ✓、嵌套 ✓、成员目标 ✓、
  计算键 ✓、赋值表达式的值 ✓、求值顺序 ✓、字符串右边 ✓；
- `runtime:check` 三条（**201 条** ✓）：①**同一个模式在声明位与赋值位给出同一对答案** ✓
  （这一轮最想保住的那条 ✓）；②求值顺序与赋值表达式的值 ✓；③失败形状 ✓
  （没声明的名字 / 计算键 + 剩余 / 两条**已知差** ✓）。

### 第 145 轮的账（既是对象又可调用）

**做的是「下一步」原来的头一条** ✓：`String(1)` / `Number("7")` / `Boolean(0)` 一律报
`unimplemented: calling a non-closure value` ✓。第 144 轮把它量清楚了 ✓——
`Boolean` **连全局名都不是** ✗，而 `String` / `Number` 是**对象**但**不可调用** ✗，
所以缺的那一格不是「少写一个方法」✗，而是**值模型少一档** ✓：
**「既是对象又可调用」**（JS 里 `String` / `Number` / `Boolean` / `Array` / `Date`
都是函数对象 ✓）。

**两条候选修法**（`vm.xl.md` 的 `DoNew` 从第 138 轮起就写在明处 ✓），这一轮选了第二条 ✓：

| 候选 | 为什么选 / 不选 |
| --- | --- |
| ① 宿主引用带一张静态属性表 | ✗：宿主引用今天**没有出边** ✓（`gc.xl.md` 的 `Trace` 写着「字符串与宿主句柄没有出边」✓），加属性表就要让**回收器**多跟一条边、让 `Charge` / `Clear` 多管一块载荷 ✓——而那一档本来是「原样传回宿主、规范层不看内部」✓ |
| ② **对象带一格可调用载荷** | ✓：**一处结构都不用加** ✓——对象本来就有属性表 ✓，而 `Charge` / `Clear` 两处**早就按 `Host !== null` 判过** ✓（那两行原来只为宿主引用而写 ✓，对对象同样成立 ✓） |

**改动的形状**（四个文件 ✓）：

| 改哪 | 加什么 |
| --- | --- |
| `heap.xl.md` | `AttachCallable(句柄, 能力号, 载荷)` ✓：往**已有对象**上挂那一格 ✓（`Tag` 不变 ✓、原型不变 ✓、`Recount` 记一次账 ✓） |
| `vm.xl.md` | `IsHostCallable` ✓（三处共用的那一句判据 ✓）+ `CallHostValue` ✓（宿主调用那一份代码从 `DoCallValue` 里抽出来 ✓，返回 `Value \| null` ✓——`null` 就是「展开已经发生，别写结果」✓）+ `DoCallValue` / `DoNew` / `CallNative` 各接一条 ✓ |
| `rt.xl.md` / `props.xl.md` | `TypeUnitsOf` / `TypeOfName` 各加一档：**带可调用载荷的对象报 `"function"`** ✓（两处同时改 ✓——一处给码元、一处给宿主字符串 ✓）；外加 `IsCallableValue` ✓ |
| `builtins/` | 四个能力号（`StringCtor` / `NumberCtor` / `BooleanCtor` / `ArrayCtor` ✓）、`NumberFromValue` ✓、`GlobalNames` 加上 `Boolean` ✓、五个「这实参能不能当回调」的判据改走 `IsCallableValue` ✓ |

**三件事写在明处** ✗：

1. **`Value.IsCallable` / `Value.AsBool` / `Value.TagName` 那一族是「不带堆的那一半」** ✓
   （第 144 轮定的分工 ✓，这一轮又加了一格 ✓）：「对象也能调」要看堆 ✓，
   所以完整的答案在 `IsCallableValue` / `TypeUnitsOf` 里 ✓。
   第 145 轮把**建库层那五处**（数组的 `map` / `filter` / 谓词族 / `sort` 的比较器、
   `Set` 与 `Map` 的 `forEach` ✓）全部接了过去 ✓——不然 `[1, 2].map(String)` 会被拒 ✗。
   `sort` 那一处更险 ✗：写 `IsCallable()` 不是**拒绝**，而是**静默换语义** ✓
   （`[2, 1].sort(String)` 会走「按文本比」那一支 ✓）。
2. **`String(String)` 响亮地抛** ✓（JS 给源码文本 ✗——那一份这一层拿不到 ✓），
   与闭包 / 宿主函数同一条口径 ✓；`ValueUnits` 里专门拦住它 ✗——
   **不许落进 `[object Object]`** ✗（那是**静默错值** ✓，第 144 轮刚清过这一类 ✓）。
   `console.log(String)` 给 `[Function (anonymous)]` ✓——与**宿主引用**那一档同一个答案 ✓
   （`console.log(Map)` 今天就是这个 ✓，名字那一格宿主载荷里没有 ✗）。
3. **`new String(1)` / `new Number(1)` / `new Boolean(1)` 走的是调用那一支** ✓
   （返回原始值 ✓）——JS 会给**装箱对象** ✗，而本仓**不装箱** ✓
   （`Boolean` 因此连 `Prototype` 那一格都没做 ✓：`true instanceof Boolean` 在 JS 里
   本来就是 `false` ✓）。同族的 `new Date(ms)` 与 `new Array(n)` 不是装箱 ✓，所以它们做全了 ✓。

**顺路撤掉的那条特例**（本轮的第二个收获 ✓）：`new Date(ms)` 从第 114 轮起是
**降级层的一条特例** ✗（「只有直接写 `Date` 才认」✓）——现在 `Date` 自己带那格载荷 ✓，
于是 `Op.New` 走**普通的路** ✓，那条特例**删掉了** ✓
（连带 `install.xl.md` 的辅助号名单里也去掉了 `DateCtor` ✓：它不再是降级层发的调用 ✓）。
**降级层从此不认识任何一个全局名** ✓（除了 `Object.keys` 那条 `for..in` 的历史形状 ✓）。
判据把「别名」那一格钉住了 ✓：`const Alias = Date; new Alias(500)` ✓。

**语料与判据**：

- `tests/runtime/cases/37-callable-globals.ts`（**11 行 stdout 与 `node` 逐字节相同** ✓）：
  三个全局名 + `typeof` + 静态方法那一半 + `new Date` 与别名 + `new Array(n)` 的洞
  + `map(String)` / `filter(Boolean)` ✓；
- `runtime:check` 三条（**198 条** ✓）：①`AttachCallable` 那一格（**还是对象** ✓、
  可调用 ✓、`typeof` 换名字 ✓、**回收复用之后载荷不残留** ✓）；②`Number` 的六档
  （`""` 给 0 ✓、`"12px"` 给 `NaN` ✓、`undefined` 给 `NaN` ✓、**`-0` 保住符号位** ✓、
  对象**响亮地抛** ✓），外加「`Boolean` 在名单里」✓；③`new Array(n)` 的洞与元素两种形态 ✓。

**写判据时又撞到那条老缺口** ✓（如实记下）：`[0 in holes]` 报
`unimplemented: expression TypeParameter` ✓——就是台账里那条
「**数组字面量里放 `in` 表达式** 被读成映射键」✗（token 层 ✓、**语料之外** ✓）。
它**不是**这一轮弄出来的 ✓（第 145 轮之前就记着 ✓），判据里改用实参位避开了 ✓，
并在「下一步」里给了它一个位置 ✓。

### 第 144 轮的账（真假只有一个定义 · 空串是假）

这一轮**不在台账的单子上** ✓——它是**探「下一步第一条」时反查出来的** ✓。
本来的目标是 `Boolean(x)`（`String(1)` / `Number("7")` 那一族 ✓），
第一版探针写下去，先撞到的**不是**「全局名不能当函数调」✗，而是：

```
$ node build/ts/tsrun.js tmp-probe.ts
empty-string-true        ← `if ("")` 走了**真**那一支
x-true
false false              ← `!("")` 与 `!("a")` 都给假
```

`node` 那边是 `empty-string-false` / `true false` ✓。也就是说**一份普通 `.ts` 里
最普通的一句 `if (s)`，只要 `s` 是空串，就走错支** ✗——而它**不报错、不抛** ✗，
只是**静默地**走另一条路 ✓。按本仓自己的排序，这比那些「响亮地抛」的缺口更靠前 ✓。

**根因一处**：真假的口径落在 `Value.AsBool`（`value.xl.md`）✓，而它**看不到码元长度** ✗
——`Value` 是**纯值**（四个载荷 + 标签），**不持有任何一个堆** ✓，
所以「这个字符串是不是空的」它**答不出来** ✓，于是它对字符串**一律给真** ✗。

**真正的坏处不是这一格错了，而是它错了五处** ✓（同一个方法被五个地方当成了 `ToBoolean`）：

| 调用点 | 哪条构造 | 第 144 轮之前 |
| --- | --- | --- |
| `vm.xl.md` 的 `jmp_if_false` | `if` / `while` / `&&` / `\|\|` / `?:`（五条降级**全落在这一条指令上**） | 空串当真 |
| `rt.xl.md` 的 `RtNot` | `!` | `!""` 给假 |
| `rt.xl.md` 的 `RtToBoolean` | `Boolean(x)` / `RtOp.ToBoolean` | 空串当真 |
| `builtins/array.xl.md` 的 `filter` | `filter(回调)` | `[""].filter(s => s)` 留下空串 |
| `builtins/array.xl.md` 的谓词族 | `find` / `some` / `every` / `findIndex` | 同上，四条一起歪 |

**修法**：`rt.xl.md` 新增 `TruthyOf(table, value)` ✓——**全仓唯一的真假答案** ✓
（空串那一档去堆里看码元长度 ✓）。五个调用点全部改走它 ✓：

- `jmp_if_false` 改叫 `TruthyOf(this.Table, …)` ✓（**改一处、五条构造一起对** ✓）；
- `RtNot` / `RtToBoolean` 都改成一行 `TruthyOf` ✓；
- `filter` 与谓词族改走 `RtToBoolean` ✓。

**`Value.AsBool` 留着** ✓：它不是错的，它是**这个函数的不带堆的那一半** ✓
（四个判断与 `TruthyOf` 里那四行是同一个答案 ✓，分歧**只在字符串那一档** ✓），
调用方**已经确认过标签不是字符串**时用它更省一次取表 ✓。这一轮的判据把这句话
**写成了可查的形状** ✓：两处对**十一档**逐条对拍，其中**十档必须一致、一档必须分歧** ✓。

**这一轮把第 118 轮的一条决定反过来了，账记在这里** ✓：
那一轮把建库层从 `RtToBoolean(table, …)` 改成「直接写 `answered.AsBool()`」✓，
理由是「**少一次绕路，语义一模一样**」✓（那一条原话在
[docs/typescript-parsing-gaps.md](../docs/typescript-parsing-gaps.md) 里 ✓）。
「语义一模一样」**只对空串以外成立** ✗——而**恰恰是那次「省一次绕路」，
把这一族从唯一的那一份口径上摘了下来** ✓，于是引擎那边改好之后，
建库层还会**各自错各自的** ✓。所以这一轮把它们**接回** `RtToBoolean` ✓：
**那一次绕路现在是真的在干活**（`TruthyOf` 要读堆 ✓）。

**语料与判据**：

- `tests/runtime/cases/36-truthiness.ts`（**14 行 stdout 与 `node` 逐字节相同** ✓）——
  四条构造 + `!` + `while` + `filter` + 四条谓词 + `for..of` 里的 `if` + 函数返回值当真假用
  + `NaN` / `-0` 那几档（改口径不能把它们动坏 ✓）；
- `runtime:check` 两条（**195 条** ✓）：①`TruthyOf` 与 `AsBool` 的十一档对拍
  （十档一致、空串一档分歧 ✓）；②四条调用路 + 降级到建库整条链摆在一起量同一个答案 ✓。

### 第 143 轮的账（实参位的 `?.`）

第 142 轮收尾时列的**头一条**是「`?.` 写在实参位」，这一轮做掉了它——
而**量出来的东西与台账里写的不是同一件事**，所以把账如实记在这里。

**台账那条写的是**「`console.log(o?.a)` 什么都不打印、退出码还是 0」——
实测**基线是好的**（`runtime:cli` 34 份语料里没有这个形状，但现场一试就通）。
坏掉的是**别的几处**：`f?.(o?.a)`、`f(o?.a)`、`[o?.a]`、`` `${o?.a}` `` 这一类——
症状是**「未映射标签 `NullConditionalOperator`」+ 降级层
`unimplemented: expression NullConditionalOperator`**，也就是**整格丢掉**。

**根因**：产物把「基名」与「`?.`」记成**两个平级单元**
（`[Identifier(o), NCO(a)]`），而 `projectExpression` 走到通用支**只取 `kids[0]`**——
基名在、`?.a` 整个没了。**语句位**之所以一直是对的，是因为那里有
`PropertyAccess` / 二元那两条路（它们的判据看「NCO 前面那个兄弟」）；
而**实参位 / 下标位 / 模板插值位**这一层只看得到一个「段」，前面没有兄弟可看。

**修法**（全在投影层，`typescript/print-ast-common.xl.md` 一处）：

| 改哪 | 加什么 |
| --- | --- |
| `projectExpression` 新增 **0a0** 支 | 判据三条：`ncoIndex > 0`、**前面那一格是链基名**、**NCO 的第一个子单元不是 `Method`**（让路给 `?.()`/`?.[]`），再加一条「前缀里没有顶层二元运算符」（让路给 0a 在运算符处切开那一支）。命中就 `chainWithOptional` 把基名接上去 |
| 新增 `IsChainBaseNode` | 判**产物的一格**（`Map`）能不能当链基名——与 token 层 `IsChainBase` 同口径、不同层（那边判 `Token`）。**`Bracket` 直接放掉**：`a?.b?.[c]` 里末尾那个 `[c]` 也会被算成「收尾括号」，认它会把 `?.b` 与 `?.[c]` 合成一格 |
| `chainWithOptional` 的 `?.(args)` 支 | 实参从 `projectEach`（**逐格**投）改成 **按顶层逗号切段 + 每段 `projectExpression`**——`h?.(o?.a)` 的括号里正是「基名与 `?.` 平级」的形状，逐格投会让 `?.a` 落成未映射标签 |

**第一版修在 token 层（`NullConditionalOperatorReorganization.Process` 把基名一起收进来），
被语料打回来了** ✗：**11 个文件变红**（`this.Start?.Document === other.Start?.Document`、
`a?.b?.[c]?.(d)` 这些形状的链被搅散）。**投影层改完 1430 / 1430 全绿**——
所以这一轮的结论写在明处：**「哪一格是 `?.` 的操作数」在 token 层已经有答案**
（`PropertyAccess` / `Method` / 二元那几条都按那个答案写死了），
**动它等于同时改那几条**；而缺的那一半在**渲染侧**——那边有「多个平级单元合成一个表达式」
所需的全部信息。

**语料两条**：

- `tests/parse/cases/expressions/expr-optional-in-argument.ts`（`f(o?.a)` / `g(o?.a, 1)` / `h?.(o?.a)`）；
- `tests/runtime/cases/35-optional-in-arguments.ts`（**14 行 stdout 与 `node` 逐字节相同**）——
  覆盖实参位、混在其它实参之间、被调用者自己也带 `?.`、两层链、下标与 `.length`、
  模板插值、与语句位同值对拍。

**顺带量出来的两条**（都进「下一步」了）：**`String(1)` 报
`calling a non-closure value`**（全局名只登记成构造函数，没有可调那一格）；
**`f?.(o?.a, "q")` 的逗号被折成逗号运算符**（token 层的老形状，基线同样如此）。

> **状态：已开始。** `lowering.xl.md` + `scope.xl.md` 落地了**最小构造集 + 提升 + 闭包捕获**，
> 并跑通了 **P0 的形状**：同一份 `.ts` 交给 Node 与交给「真解析器 → 降级 → IR → VM」，
> **逐值一致**（判据 `npm run runtime:check` 的最后二十几节，共 **208** 条全绿）。
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
> （判据 `npm run runtime:cli`，语料 `tests/runtime/cases/*.ts` **41** 份，裁判是真 Node）。
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

## 第 142 轮的账（回调要两个实参的那一族）

第 141 轮收尾做了一次**「日常 stdlib 普查」**（69 条普通写法 ✓，`tmp-lib.cjs` 那类脚本 ✓）：
**46/69** ✓。最大的一簇是「**回调要两个实参**」✗——
`sort((a, b) => …)` 与 `reduce((acc, x) => …)` **连签名都进不去** ✓
（`NativeCall` 只带**一个**实参 ✗；那条限制从第 116 轮 `Map.forEach` 起就记在台账里 ✓）。

**改的是签名那一格** ✓：

```
# type NativeCall = (callee, thisValue, argument, hasArgument) => Value     ← 原来
# type NativeCall = (callee, thisValue, args:Array<Value>)   => Value       ← 现在
```

**一次开到底** ✓：访问器给 `[]` / `[value]` ✓、`Map.forEach` 给 `[值, 键]` ✓、
数组的回调给 `[元素, 下标]` ✓——以后再来「回调要三个实参」的（`map((值, 下标, 数组))` ✓）
**不必再动签名** ✓。改动点一共六处 ✓（两个类型的定义 + 三个回调族 + 一个桩 ✓）。

**顺带补上的方法**（都是普查里红的 ✓）：`sort` ✓、`reduce` ✓、
外加铺路的 `shift` / `fill` / `flat` ✓——**普查 46 → 52/69** ✓。

**`sort` 有两处「想当然就会写错」** ✗：

1. **不给比较器时按「转成字符串再比」** ✓（`[10, 9].sort()` 给 `[10, 9]` ✓）——
   按数值排**看起来更对** ✗，但不是 JS ✓；
2. **判据的符号** ✗：第一版拿 `(item, other)` 比、又用 `> 0` 当「往后挪」✓，
   于是整好反了一百八十度 ✓——`[3,1,2].sort((a, b) => a - b)` 给 **`3,2,1`** ✗，
   而 `["b","a"].sort()`（文本那一支）**照样对** ✗——**一半对一半错** ✓。
   修法是把两个分支统一成**一句判据** ✓：「`other` 是不是该排在 `item` 后面」✓。

**算法是插入排序** ✓：稳定（ES2019 起 JS 保证稳定 ✓）、数组在这一层本来就是小东西 ✓。

语料 [tests/runtime/cases/34-two-argument-callbacks.ts](../tests/runtime/cases/34-two-argument-callbacks.ts)
**10 行 stdout 与 `node` 逐字节相同** ✓。

### 普查里最要命的一条（下一轮第一条）

**`console.log(a?.b)` 整句会被收没** ✗✗——那一行**什么都不打印** ✓，**退出码还是 0** ✗。
产物树（`node build/ts/cjcli.js <文件>` ✓）是：

```
<PropertyAccess><Identifier>console</Identifier><SymbolToken>.</SymbolToken>
  <Method name="log">
    <Identifier>o</Identifier>                       ← 本该与下面合成一个实参
    <NullConditionalOperator><Identifier>a</Identifier></NullConditionalOperator>
  </Method>
</PropertyAccess>
```

`Method` 的子单元本该是**一个**实参 `o?.a` ✓，却被拆成了两个平级 ✓。
语句位的 `a?.b` 是对的 ✓（投影层的 `chainWithOptional` 补上了 ✓），
**实参位就断了** ✗——所以这一条修在 **token 层**（`?.` 那一支的 `Process` 要把
前面那个实心单元一起收进来 ✓），不是投影层 ✓。
**静默少一整句** 比抛错糟得多 ✓，所以它排在下一步的第一条 ✓。

## 第 141 轮的账（派生类的默认构造函数 · `super(...xs)`）

第 140 轮让 `super(m)` 落在内建构造函数上通了 ✓，收尾时留的头一条是
**`class E extends Error {}`（不写构造函数）** ✗——降级层要求派生类自己写构造函数
并调用 `super(...)` ✓，本仓**不合成**那一个 ✓。这一轮把它办掉 ✓，顺带做掉 `super(...xs)` ✓。

| 做什么 | 怎么落 |
| --- | --- |
| **`super(...xs)`** | `call_array` **本来就带 `this` 操作数** ✓（`EmitCallArray(callee, argsArray, self)` ✓，第 133 轮加算子时留出来的 ✓）——**一个新算子都没加** ✓，缺的只是把 `super` 接上去 ✓。第 133 轮那一处「响亮地抛」于是撤掉了 ✓ |
| **合成的默认构造函数** | 父类带构造函数而派生类没写时，合成 JS 那一个：`constructor(...args) { super(...args); }` ✓——**合成的是一棵树** ✓，形状必须与投影给的一模一样 ✓（`Parameter.dotDotDotToken` 非 null ✓、`CallExpression.expression.kind === "SuperKeyword"` ✓、实参是 `SpreadElement` ✓） |
| **「父类有没有构造函数」递归问** | `FindParentHasConstructor` 原来只看 `members` ✗——而合成出来的构造函数**不在 `members` 里** ✓ |

**②是最容易只做一半的那一处** ✗：`class A { constructor(v) {…} } class B extends A {}
class C extends B {}` 里，`B` 的构造函数是**合成出来的** ✓——只看 `members` 的话，
`C` 会以为父类没有构造函数 ✓，于是拿到一个**空的**默认构造函数 ✓，
`new C(8).v` 就是 `undefined` ✓（**静默错值** ✓，判据现场就是这么红的 ✓）。

**递归的底** ✓：名字找不到时返回「有」✓（原样保留 ✓，「查不清」按最坏情况算 ✓）；
自己直接继承 `Object`（没有 `extends`）时返回「假」✓；`class A extends A` 当场抛 ✓
（源码上非法 ✓，而递归没有底会转圈 ✗）。名字的取法收到 `SuperClassNameOf` ✓——
`LowerClass` 与 `FindParentHasConstructor` **问的是同一个问题** ✓，两处各写一遍就会漂 ✓。

**一条仍然保持的「响亮」** ✓：派生类写了构造函数但**没调 `super(...)`** 时照旧抛 ✓
（静默少跑父类初始化比不能用更坏 ✓）——那条判据一个字没动 ✓。

语料 [tests/runtime/cases/33-derived-default-ctor.ts](../tests/runtime/cases/33-derived-default-ctor.ts)
**6 行 stdout 与 `node` 逐字节相同** ✓：

```
default-ctor    3 true 5 f
super-spread    7 true 6
chain           13 true true
error-subclass  plain,Error,true,true
coded-error     bad,42,true,true
```

**两条旧判据随契约更新** ✓（都与第 129 / 131 / 137 轮那几条同一个处理 ✓）：
「父类带构造函数必须抛」与「派生类缺构造函数必须抛」改成「**不再抛、而且转发对了**」✓；
「`super(...xs)` 降级期就抛」改成「**跑得出来**」✓。

**判据自己踩的两个坑**（写在这里，下次少踩 ✓）：`CallExport` 是**普通调用** ✓，
拿它调一个类拿不到 `this` ✓（类的构造函数要用 `new` ✓）；`Sources` 是
**一份一份的模块** ✗，名字与用它那句分开放会报「不是局部名也不是捕获」✓。

## 第 140 轮的账（`super(m)` 落在内建构造函数上）

第 137 轮把 `Error` / `TypeError` / `RangeError` 做成了真构造函数 ✓，
但 `class MyErr extends Error` 当场**响亮地抛** ✓——那一族是「**自己造一个新对象返回**」那一款 ✓：
`super(m)` 造出来的新对象被丢掉 ✓、`this` 上一个属性都没写 ✗
（**症状是 `e.message` 空着**，而 `e.name` 被派生类自己写了、看着一切正常 ✓）。
**抛比静默错值好** ✓，所以先抛了一轮 ✓；这一轮改成**真的办到它** ✓。

**改的是哪一格** ✓：内建错误构造函数拿到**接收者**（`self` ✓）时，
往**那个对象**上写 `message` / `name` ✓，并**返回它** ✓——
「谁是真的 `this`」只有一个答案 ✓（JS 的规矩就是「父类构造函数改的就是那一个 `this`」✓）。

**一行降级层改动都没有** ✗：`this` 是降级层用 `Op.Call` 的 **`D` 操作数**递过来的 ✓
（`lowering.xl.md` 的 `super(...)` 那一支 ✓）——这一轮量到的正是「引擎 / 建库层的那一格补对了」✓。

语料 [tests/runtime/cases/32-super-on-builtins.ts](../tests/runtime/cases/32-super-on-builtins.ts)
**5 行 stdout 与 `node` 逐字节相同** ✓：

```
extends-error       MyError,custom,true,true
extends-typeerror   TypeError,bad:tag,true,true,false
extends-rangeerror  RangeError,range,true
caught-by-kind      generic,type,range
```

**第二行值得看一眼** ✓：`TaggedError` **没有**自己写 `name` ✓，于是 `e.name` 从原型链上取到
`"TypeError"` ✓——Node 也是这样 ✓（`instanceof TypeError` 为真 ✓、`instanceof RangeError` 为假 ✓）。

**一句仍然抛的** ✗：`class E extends Error {}`（**不写构造函数** ✓）——
降级层要求派生类自己写构造函数并调用 `super(...)` ✓。JS 的默认构造函数是
`constructor(...args) { super(...args) }` ✓，本仓**不合成那一个** ✗。
它挡着的正是最常见的那个写法 ✓，所以它是**下一步的头一条** ✓
（第 133 轮的剩余参数 + 这一轮的内建 `super()` 都已经在 ✓，**只差合成** ✓）。

## 第 139 轮的账（引擎抛的也是 `TypeError`）

第 136 轮让「读 `null` / `undefined` 的属性」**抛** ✓、也**接得住** ✓，
第 137 轮把 `TypeError` 这个类做出来了 ✓——差的只剩**最后一格**：
引擎报「这是哪一类失败」✗。

| 改哪 | 加什么 |
| --- | --- |
| `# type ErrorFactory` | `(text) => Value` → **`(kind:number, text:string) => Value`** ✓ |
| `# const ErrorKindGeneric / ErrorKindType` | `0` / `1` ✓——**引擎报的是类别，不是名字** ✗ |
| `Guard:(body, kind = ErrorKindGeneric)` | 默认那一档不变 ✓，**类型失败**的调用点传 `ErrorKindType` ✓ |
| `tsrun` 的错误工厂 | `kind === ErrorKindType` → `NewErrorLike(… protos.TypeError, "TypeError" …)` ✓，否则 `Error` ✓ |

**为什么引擎传的是数字、不是 `"TypeError"`** ✗：引擎一旦认识那几个字母，
换一门语言就得改引擎 ✓——而这一层存在的全部意义就是「引擎不认识语言」✓。
与 `PrototypeKey`（名字由语言层给 ✓）、`RegisterConstructorProto`（号 → 原型由语言层填 ✓）
是**同一条分界** ✓。

**一处编译期的教训** ✓：`# type` 的右侧是**原文**（宿主的类型写法 ✓）——
第一版把 `kind` 写成 `int` ✗，编译期报「Cannot find name 'int'」✓，
位置正好在那一行 ✓。这条规矩只有踩过才记得住 ✓（已写进那一节 ✓）。

语料 [tests/runtime/cases/31-engine-type-errors.ts](../tests/runtime/cases/31-engine-type-errors.ts)
**5 行 stdout 与 `node` 逐字节相同** ✓——引擎抛的两处 `e.name` 现在是 `"TypeError"` ✓、
`e instanceof TypeError` 与 `e instanceof Error` 都为真 ✓，而脚本自己 `throw` 的那种
**各不相同** ✓（`TypeError` / `Error` 各是各的 ✓）。

**两笔明账**（都进了「下一步」✓）：

- **话里没有键名** ✗：Node 说 `Cannot read properties of null (reading 'x')` ✓，
  本仓说 `cannot read properties of null` ✓——要带上键名得把**那个键值**递给工厂 ✓
  （工厂是语言层 ✓ 认得 `TextFrom` ✓；引擎侧不许把值渲染成文本 ✗，见 `host-text.xl.md` ✓）。
- **「不是函数却调用」还没算类型失败** ✗：它走**指令那一层**的 `Guard` ✓（一处包住整条指令 ✓），
  那一层分不出类别 ✗——要分就得让 `DoCallValue` 自己带类别 ✓。

## 第 138 轮的账（`Map` / `Set` / `Date` 的原型格）

第 137 轮把「内建构造函数 → 原型」那格登记表铺好了 ✓，收尾时留下的第一条待办就是
给这三族补上**自己的原型格** ✓——**同一条语义、两种接法** ✓，两处坑都当场量到了 ✓：

| 谁 | 怎么接 | 为什么 |
| --- | --- | --- |
| **`Map` / `Set`** | `vm.RegisterConstructorProto(MapCtor, protos.Map)` ✓ | 它们是**宿主引用值** ✓、**没有属性表** ✗——`GetProperty(Map, "prototype")` 永远是 `undefined` ✗ |
| **`Date`** | 在 `dateObject` 上挂 `prototype` 属性 ✓ | 它的全局值是**普通对象** ✓（`new Date()` 由降级层落成一条 `host_call(DateCtor, …)` ✓），老路走得通 ✓ |

**接错的症状一模一样** ✓：`instanceof` 抛「the right side of instanceof has no prototype object」✓——
所以「哪种接法」不能靠猜 ✓，要看**那个全局值在值模型里是什么** ✓。

**三处「一半对」的坑**（都当场量到了 ✓）：

1. **实例那一侧也要挂** ✗：`Protos.Map` 造出来了、登记表也填了 ✓，可 `MapCtor` 造实例时
   如果还挂 `Protos.Object` ✓，`new Map() instanceof Map` 照样 `false` ✗——
   **两处都要** ✓（`table.Get(map.Ref).Proto = protos.Map` ✓）；
2. **`constructor` 里必须放「全局那一份」那个值** ✗：内建函数的相等是**按句柄比**的 ✓
   （`RtCmpEqStrict` 对 `HostRef` 比的是载荷句柄 ✓）——现造一个新句柄的话，
   `new Map().constructor === Map` 给 **`false`** ✗（判据现场就是这么红的 ✓）；
3. **`Protos` 的常量声明顺序** ✗：`constructor` 那几行要写在 `mapTarget` / `setTarget` /
   `dateObject` **之后** ✓（写在前面是 TDZ 错 ✗，而它离现场只有几行 ✓，还算好找 ✓）。

**`Protos` 从七格加到十格** ✓（三格错误 + `Map` / `Set` / `Date` ✓），
`AddRoots` 与 `InitProtos` 都跟着改 ✓——**十个原型全是常驻根** ✓：
漏一格，收垃圾之后整条链就断 ✓（判据量的就是「根里正好十格」✓）。

语料 [tests/runtime/cases/30-collection-prototypes.ts](../tests/runtime/cases/30-collection-prototypes.ts)
**7 行 stdout 与 `node` 逐字节相同** ✓。

**一处结构差写在这里** ✗：`Object.keys(new Map())` 在本仓给 **12** ✗（Node 给 **0** ✓）——
方法挂在**实例**上 ✓、`__k` / `__v` / `size` 也是自有属性 ✓。
JS 用**内部槽** ✓，而本仓的值模型没有那一层 ✗。这不是「漏挂了一个方法」✓，
是**两个模型的差别** ✓，所以它写在这里而不是当成 bug 修 ✓。

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
