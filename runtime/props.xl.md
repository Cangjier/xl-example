# dependencies
```xl
import { Value, ValueTag } from "./value.xl.md"
import { HeapTable, Property, PropertyKind, ObjectCharge, PropertyCharge, ValueCharge } from "./heap.xl.md"
import { PropertyFlagWritable, PropertyFlagConfigurable, PropertyFlagEnumerable, PropertyFlagsAll, PropertyFlagInternal } from "./heap.xl.md"
import { RootSet } from "./gc.xl.md"
import { RoomChecker, IsCallableValue } from "./rt.xl.md"
```

# namespace cangjie

**属性与原型**：读写一个属性名时到底发生什么。契约见
[docs/runtime-architecture.md](../docs/runtime-architecture.md) §3 / §4。

这一层回答四个问题：**找不找得到**（沿原型链）、**找到的是什么**（数据还是访问器）、
**写到哪里**（找到的那个拥有者，还是接收者自己）、**找不到怎么办**（给 `undefined` /
新建一个自有属性）。

**为什么单开一份**：`heap.xl.md` 只管「属性怎么存」，这里管「属性怎么找、怎么写」。
存储与语义分开，回收器与装载验证才只需要看前者。

**v1 的两处明确缺口**（都抛宿主错误，**不静默给近似值**）：

1. **只读 / 不可配置 / 有 getter 没 setter**：这些在严格模式下该抛 `TypeError`，
   而错误对象那一层还没有——这一轮**抛宿主错误**（判据因此能看见「它确实拦住了」）。
2. **非数字下标要走 `ToString`**（`a["0"]`）——`ToString` 还没实现，所以**抛**。

**访问器已经能跑**：它靠 `NativeCall` 重入分派循环（见下面那个类型），
`this` 永远是**接收者**。

**原型链不会成环**：v1 没有「改原型」的指令（`new_object` / `new_array` 给的是固定的
内建原型）。但这一层仍然给一个**深度上限**（`MaxProtoDepth`）：万一哪天加了改原型的路，
也不会变成死循环。

# type NativeCall = (callee:Value, thisValue:Value, args:Array<Value>)=>Value

**从语义层回调进脚本**：`callee` 用 `thisValue` 当 `this` 调一次，**按 `args` 逐个铺实参**，
返回它的返回值。

与 `RoomChecker` 同一形状、同一理由：依赖方向只能是 `vm → props`（机器用语义），
反过来就成环了。**访问器**（getter / setter）就是它的第一个用户——它必须**重入分派循环**
才能跑脚本函数，而那台循环在 `vm.xl.md` 手里。

**实参表是一整个数组**（第 142 轮改的）：原来是「一个值 + 一个 `hasArgument` 标志」——
那够访问器用（getter 零个、setter 一个），也够 `Map.forEach(v => …)` 用，
**但不够 `sort((a, b) => …)` 与 `reduce((acc, x) => …)`**——
那是**两个**实参，而它们是日常代码里最常见的两个数组方法。
**一次把口子开到位**：以后再有「回调要三个实参」的（`Array.prototype.map` 的
`(值, 下标, 数组)`）不必再动签名。

**回调不是随便能重入的**：机器那边有**重入深度上限**（安全第 4 层）——
脚本可以在 getter 里再读同一个属性，没有上限就是栈溢出的另一种写法。

# type CallFailed = ()=>boolean

**「上一次重入没跑完」这一个问题的形状**（第 228 轮）——与 `RoomChecker` 同一形状、
同一理由：依赖方向只能是 `vm → props`，而**语言内建**住在更外面那一层
（`typescript-exec/builtins/`），它拿不到 `Vm`。

**它为什么必须存在**：内建里有二十来处**回调循环**（`forEach` / `map` / 谓词族 /
`sort` 的比较器 / `Map`、`Set` 的 `forEach` / 走迭代协议的那几处），
而循环体里那次 `call(...)` 是**一次重入**——脚本在回调里抛了异常时，
重入返回的是一个**看起来正常的 `undefined`**（`vm.xl.md` 的 `CallNative` 写着为什么），
于是循环**照转下一圈**（**静默**那一类：异常最后才冒出来，而多跑的那几圈已经
把副作用做出去了，判据 `exc-throw-in-callback`）。

**为什么不复用 `NativeCall` 的返回值**：`undefined` 是**合法的回调返回值**
（`[1, 2].forEach(() => {})` 每次都返回它）——拿它当哨兵就是把正常情况当异常。
**为什么不「从内建里抛一个宿主异常出去」**：那条路第 153 轮试过（判据当场红三条，
见 `vm.xl.md` 里那段结论）。**所以问一句**：不问不改、也不改控制流。

**`null` 是合法值**（与 `NativeCall | null` 同一条纪律）：宿主没接这一格时
内建**照旧转**（退回第 228 轮之前的行为）——那不是「新加了一道必须配的线」，
而是一个**只让事情变对**的可选服务。

# const MaxProtoDepth:int = 256

原型链深度上限。超了就抛——**它只可能来自引擎 bug**（或者是将来某条改原型的路没挡住环）。

# class PropRef

一处命中的属性：**拥有者 + 它在拥有者属性表里的下标**。

为什么要带着拥有者：**访问器的 `this` 是接收者，不是拥有者**（`a.m()` 里 `this` 是 `a`），
所以光有 `Property` 不够。数据属性也留着它：**写操作要写回拥有者那一格**。

**不是堆对象**（它就是一次查找的临时结果）：持有的是句柄，而那个句柄指向的对象必然从
接收者可达（接收者就在槽里），所以这一趟不会遇到「回收器把中间结果收掉」。

## field Owner:int = 0

拥有者的句柄。

## field Index:int = 0

在 `Props` 里的下标。

## constructor:(owner:int, index:int)=>void

记一处命中。

```ts
this.Owner = owner;
this.Index = index;
```

# class Protos

**内建原型表**：三个空对象，语言的建库层将来往里填方法。

`runtime/` 提供它不算越界：**「普通对象有原型」「数组有原型」是这个对象模型的结构事实**，
不是某门语言的语法糖。往里填什么（`Array.prototype.map` 那些）才是语言层的事
（`typescript-exec/builtins/`）。

三个原型是**常驻根**（`vm.xl.md` 的根快照要把它们算进去）：它们是所有对象的祖先，
被收掉的话整棵原型链当场断掉。

## field Object:int = 0

普通对象的原型。

## field Array:int = 0

数组的原型。

## field Function:int = 0

函数（闭包 / 内建）的原型。

## field String:int = 0

字符串的原型。

**它是「原始值接收者」的入口**：原始值自己没有属性表（`length` 是结构属性），
所以 `"abc".charAt(1)` 这类读写**必须**从这一条链上找——`GetProperty` 里那一段就是它。

## field Number:int = 0

**数字的原型**（第 150 轮）——与 `String` 那一格同一个用途：
`(1.5).toFixed(2)` / `(255).toString(16)` 从这里找方法。

## field Boolean:int = 0

**布尔的原型**（第 150 轮）——同款（`true.toString()`）。

## field Symbol:int = 0

**`Symbol` 的原型**（第 754 轮）——同款，但今天**只服务 `Object.prototype.toString`**：
`Object.prototype.toString.call(Symbol.prototype)` 在 Node 里是 `"[object Symbol]"`，
而这一格缺着时那一句会走到 `ObjectTagOf` 最后那个「缺 `Symbol.toStringTag`」的响亮一抛。
**成员一个都没装**（台账 `stdlib/symbol/037` 开着），这一格只是让「那是一个原型对象」
在值模型里存在——建库层那一侧把标签挂上去（`globals.xl.md` 的 `tagTargets`）。

## field Error:int = 0

**`Error` 的原型**（第 137 轮）。

**为什么 `Error` 要在这一层有一个原型**：`e instanceof Error` 要在 `e` 的原型链上
找到 `Error.prototype`——没有这一格，`instanceof` 就没有落点
（它原来直接抛「the right side of instanceof has no prototype object」，
而**内建的 `instanceof` 全都不通**：`[] instanceof Array` 也是同一句话）。
`name` / `message` / `constructor` 三个属性由建库层挂上去（这一层只管造一个空对象）。

## field TypeError:int = 0

**`TypeError` 的原型**（第 137 轮）——**它自己的原型是 `Error.prototype`**
（`InitProtos` 接的），所以 `e instanceof Error` 对 `TypeError` 也成立
（JS 就是这样：`TypeError` 是 `Error` 的子类）。

## field RangeError:int = 0

**`RangeError` 的原型**（第 137 轮）——链与 `TypeError` 那一条一字不差。

## field SyntaxError:int = 0

**`SyntaxError` 的原型**（第 277 轮）——链与上面两条一字不差。

**为什么第 277 轮才补它**：这一族原来只有三个成员（`Error` / `TypeError` / `RangeError`），
而**判据要的是第四个**——`JSON.parse("oops")` 抛的是 `SyntaxError`，
脚本里那个 `catch (e) { e instanceof SyntaxError }` 于是没有落点。
**它在这一层就是一个空原型**（与那三条一样）：`name` / `message` / `constructor`
三格由建库层挂（`globals.xl.md`），这一层只管造一个空对象并**把链接到 `Error.prototype`**。

**剩下两个名字**（`URIError` / `EvalError`）**第 376 轮补上了**——
判据来了（`c371-stdlib-error-families-and-field` 一次量七个族、
`c371-stdlib-globals-uri-family` 量的是 `decodeURIComponent("%")` 抛出来的名字）。
**与上一条同一句规矩**：名单里有、没挂 ⇒ 「声明了却没提供」，所以「等有判据了再补」。

## field URIError:int = 0

**`URIError` 的原型**（第 376 轮）——链与上面几条一字不差。

**它是「抛出来的那一族」**（不只是「能 new 出来」）：`decodeURIComponent("%")` 在 JS 里抛的
正是 `URIError`，而本仓原来抛一个**普通 `Error`**——症状是脚本里
`catch (e) { console.log(e.name) }` 印出 `Error`（判据 `c371-stdlib-globals-uri-family` 量的就是它）。
**它还有一个副产品**：那一族**原来在 `DecodePercent` 里是死循环**（第 376 轮一起修的，
见 `globals.xl.md` 那一段）。

## field EvalError:int = 0

**`EvalError` 的原型**（第 376 轮）——链与上面几条一字不差。

**它是七族里唯一「只由脚本造」的一个**：本仓没有 `eval`（非目标清单里），
所以没有任何内建会抛它——`new EvalError("e")` 与 `e instanceof EvalError` 是它的全部用途
（而那正是判据量的两件事）。

## field ReferenceError:int = 0

**`ReferenceError` 的原型**（第 295 轮）——链与上面三条一字不差。

**为什么第 295 轮才补它**：第 277 轮那一格写着「等有判据了再补」，
而判据**来了**（`c291-error-families-and-messages`：它把五个错误族排在一起，
`new ReferenceError("f")` 在**降级期**就报 `name is not a local or a capture: ReferenceError`）。
**它自己就是那条规矩的一个例子**——按规矩等着，等到判据出现。

## field AggregateError:int = 0

**`AggregateError` 的原型**（第 295 轮）——链与上面几条一字不差。

**它与其他几个不同的一点**：它自己带一格 `errors`（第一个实参那个数组，由建库层挂）。
**`instanceof Error` 也要成立**（判据量着它）——所以它同样要接在 `Error.prototype` 下面。


## field Map:int = 0

**`Map` 的原型**（第 138 轮）——与 `Error` 那三格同一个用途：`new Map() instanceof Map`
要在实例的原型链上找到它。**它今天不挂方法**：`map.xl.md` 把方法挂在**实例**上
（`InstallMapMethods`），所以这一格今天的**唯一**作用是 `instanceof`。
这一条写在明处——「挂在实例上」与「挂在原型上」在 `Object.keys(map)` 上是两种结果。

## field Set:int = 0

**`Set` 的原型**（第 138 轮）——与 `Map` 那一格同款（方法也挂在实例上）。

## field WeakMap:int = 0

**`WeakMap` 的原型**（第 733 轮）——**接在 `Object.prototype` 下面**，
与 `Map.prototype` **并列而不是接在它下面**。

**这一条是量出来的、不是推出来的**（**实测 Node**）：
`Object.getPrototypeOf(WeakMap.prototype) === Object.prototype` 给 **`true`**、
`=== Map.prototype` 给 **`false`**；而 `Object.getOwnPropertyNames(WeakMap.prototype)`
是 `constructor,delete,get,set,has`——**五格自有**（没有 `clear` / `forEach` / `keys` /
`values` / `entries` / `size`，那些是 `Map` 独有的）。
**第一版写的就是「接在 `Map.prototype` 下面」**（想省掉复制方法的功夫）：
那样 `Object.keys(WeakMap.prototype)` 仍是 `[]`、五个名字也取得到，
**但 `WeakMap.prototype.size` 会跟着继承过来**（JS 里是 `undefined`）——
判据只量那五个名字，所以**这一处会静默留下**，正好是一种最难查的「一半对」。
改成并列之后那五格得**自己挂一份**（见 `globals.xl.md` 的
`InstallWeakPrototypeMethods`），但换来的是**没有多出来的格**。

**为什么第 733 轮才补**：第 295 / 681 轮让 `WeakMap` 与 `Map` **共用** `protos.Map`
（取舍写在 `globals.xl.md` 那一处），代价是 `WeakMap.prototype` **就是** `Map.prototype`
——于是判据 `stdlib/map-set/103-names-weakmap-proto` 那一行量到的是 `Map.prototype`
（`get` 找得到、`constructor` 是 `Map`），而两族**本该是两个对象**。

## field WeakSet:int = 0

**`WeakSet` 的原型**（第 733 轮）——与 `WeakMap` 那一格**同一个形状**
（接在 `Object.prototype` 下面，与 `Set.prototype` 并列），理由与它一字不差：
`Object.getOwnPropertyNames(WeakSet.prototype)` 在 Node 里是 `constructor,delete,has,add`
——**四格自有**，`size` / `clear` / `forEach` / 那一族集合运算**一格都不该有**。

## field Date:int = 0

**`Date` 的原型**（第 138 轮）——与上面两格同款。

## field RegExp:int = 0

**`RegExp` 的原型**（第 936 轮）——与 `Date` 那一格同款。

**为什么它必须有一格**（而不是「每次造实例时现造一个原型对象」）：
`Object.prototype.toString.call(/x/)` 要给 `[object RegExp]`，而那一格是
**按身份**答的（`globals.xl.md` 的 `ObjectTagOf`：`RegExp.prototype` 自己与它的实例
都落在这一格上）——现造的话每次都是新句柄，身份比不相等。
`instanceof RegExp` 也靠它（引擎沿 `Proto` 链走）。

## field AsyncGenerator:int = 0

**异步生成器的原型**（第 320 轮）——与 `Generator` 那格**同一个用途**、
**但不能合成一格**：JS 里同步生成器**没有** `Symbol.asyncIterator`
（`for await (const x of syncGen)` 是 `TypeError`），而异步生成器有。
合在一起的话，同步生成器会**自称可异步迭代**——那是**说谎**（比缺一格更坏）。

**谁用它**：`vm.xl.md` 的 `AttachGeneratorProto`（三处造生成器的地方都问它，
判据是 `info.IsAsync`）；**方法挂在哪**：`globals.xl.md` 的 `BuildGlobals`
（`Symbol.asyncIterator`，键取自 `protos.WellKnownSymbols`）。

## field Generator:int = 0

**生成器的原型**（第 229 轮）——**方法挂在它上面**（与字符串 / 数字 / 布尔那三格
同一个用途），而调用方是**脚本**：`it.next()`。

**为什么它必须有一格**：本仓的生成器对象**没有属性表**——
它就是 `HeapObject` 上那一格 `Generator` 载荷（`heap.xl.md`），
所以「`next` 这个方法从哪来」只能靠**原型链**。第 229 轮之前那一格是空的，
于是 `it.next()` 报的是 `calling a non-closure value`
（听起来像调用写错了，其实是**这一格不存在**——与第 150 轮
`(1.5).toFixed(2)` 报同一句话、根子也是「原型那一格不存在」，一模一样）。

**`next` 挂在它上面、指向一个「带引擎载荷的对象」**：那个载荷的能力号是引擎自己认的
（`GeneratorNextId`，见 `vm.xl.md` 的 `NextStepOf`）——**引擎用能力号认它自己的方法**，
与「语言层的内建靠能力号分派」是**同一条机制**，只是号的用途不同。

## field GeneratorFunction:int = 0

**`function* () {}` 那一档的 `[[Prototype]]`**（第 730 轮）。

**它是什么**：JS 里生成器函数的原型**不是** `Function.prototype`，而是
`%GeneratorFunction.prototype%`——`Object.prototype.toString.call(function* () {})`
给 `"[object GeneratorFunction]"` 的**唯一**来处就是它自己那一格
`Symbol.toStringTag`（规范里 `Object.prototype.toString` 的第一步就是
「取 `O[@@toStringTag]`，是字符串就用它」，见 `globals.xl.md` 的 `ObjectTagOf`）。
本仓原来所有脚本闭包**一律**指 `protos.Function` ⇒ 那一族给的是
`"[object Function]"`（**静默错值**，第 730 轮量出来的两族缺口之一）。

**谁填它**：`vm.xl.md` 的 `MakeClosure`——`function*` 造出来的闭包
**出生那一刻**就指这一格（按 `HeapClosure.IsGenerator` 那两位挑）。

**它自己接在 `Function.prototype` 下面**（`InitProtos` 接的）：所以
`f.call` / `f.apply` 那一族照旧沿链找得到，而 `%GeneratorFunction%.prototype.constructor`
那一格由建库层挂（"prototype" 与 "constructor" 两格**成对**——与 `Map` / `Set` 那两处
一字不差：只补一格就是「一半对」）。

## field AsyncFunction:int = 0

**`async function () {}` 那一档的 `[[Prototype]]`**（第 730 轮）——与 `GeneratorFunction`
**同一个形状、同一条理由**，只是标签是 `"[object AsyncFunction]"`。

## field AsyncGeneratorFunction:int = 0

**`async function* () {}` 那一档的 `[[Prototype]]`**（第 730 轮）。

**为什么它不是前两格之一**：JS 里它是**第三个**内部对象
（`%AsyncGeneratorFunction.prototype%`），标签是
`"[object AsyncGeneratorFunction]"`——把 `async function*` 归到前两格里
就会**答错**（而「答错」比「没有这一格」坏：静默错值）。
**三格都是「函数那一族的原型」**，所以三格**一起**造、一起进根集。

## field Promise:int = 0

**`Promise` 的原型**（第 601 轮）——与 `Map` / `Set` / `Date` 那三格同款：
`x instanceof Promise` 要在这条链上找到它，`Symbol.toStringTag` 也挂在它上面
（`Object.prototype.toString.call(Promise.resolve(1))` 给 `[object Promise]`）。
**方法不在这里挂**：`then` / `catch` / `finally` 仍逐个实例挂（`promise.xl.md`），
所以承诺的属性表与 JS 仍有结构差——写在明处。

## field WellKnownSymbols:int = 0

**知名符号那张表**（第 184 轮）——一个**普通对象的句柄**：语言层在装库时
把 `iterator` 一类的符号挂上去，引擎那一侧只按**名字**去取。

**为什么它住在这里**：迭代协议（`for..of` / 展开 / `Array.from`）走的是
`GetIterator`，而那个函数**只收到 `protos` 这一个「语言层给的常数表」**——
引擎不该认识 `Symbol` 这六个字（与 `ConstructorProtos` 那条同一个道理：
**结构由引擎提供、名字由语言层给**）。
**宿主没接这一格时它就是 `0`**，引擎那一侧退回「只认数组 / 字符串 / `Map` / `Set`」
——**不说谎，只是不特殊**。

## field Global:int = 0

**全局对象那一格**（第 337 轮）——语言层在装库时把它填进来，
**引擎那一侧只在一处用它**：非严格模式下**普通函数调用的 `this`**
（`vm.xl.md` 的 `DoCallValue`）。

**为什么它必须由语言层给**：全局对象是**语言层造的那个对象**
（`globals.xl.md` 的 `BuildGlobals`），引擎手里没有它——而 JS 的规矩是
「**非严格**函数被**当作函数**调用时，`this` 是全局对象」（严格模式才是 `undefined`）。
**与 `WellKnownSymbols` 完全同一条机制**：**结构由引擎提供、内容由语言层给**；
**宿主没接这一格时它是 `0`** ⇒ 引擎退回「给 `undefined`」（**不说谎，只是不特殊**，
与那一格一字不差）。

**一处已知的差别写在明处**：JS 里**类体里那些函数是严格的**
（`class A { m() {} }` 摘下来的 `m` 单独调 ⇒ `this` 是 `undefined`），
而本仓**一个函数一个口径**（一律按非严格办）——与第 333 轮那条「本仓选定非严格」
是**同一个决定**。**没有判据量着那一档**，写在这里。

## constructor:(objectHandle:int, arrayHandle:int, functionHandle:int, stringHandle:int)=>void

记下四个句柄。**其余六格（三格 `Error` + `Map` / `Set` / `Date`）不在构造参数里**：
它们由 `InitProtos` 造好后**直接赋值**（第 137 / 138 轮）——
四个位置参数已经够多了，再往后加只会让每一处 `new Protos(...)` 都变脆。

```ts
this.Object = objectHandle;
this.Array = arrayHandle;
this.Function = functionHandle;
this.String = stringHandle;
```

## method AddRoots:(roots:RootSet)=>void

把原型加进根快照。

**漏一格就是「整条原型链某天突然断掉」**（原型对象是常驻根，
被收掉的话 `X.prototype` 指向一个已经没了的东西）。

```ts
if (this.Object > 0) roots.AddHandle(this.Object);
if (this.Array > 0) roots.AddHandle(this.Array);
if (this.Function > 0) roots.AddHandle(this.Function);
if (this.String > 0) roots.AddHandle(this.String);
if (this.Number > 0) roots.AddHandle(this.Number);
if (this.Boolean > 0) roots.AddHandle(this.Boolean);
if (this.Symbol > 0) roots.AddHandle(this.Symbol);
if (this.Error > 0) roots.AddHandle(this.Error);
if (this.TypeError > 0) roots.AddHandle(this.TypeError);
if (this.RangeError > 0) roots.AddHandle(this.RangeError);
if (this.SyntaxError > 0) roots.AddHandle(this.SyntaxError);
if (this.ReferenceError > 0) roots.AddHandle(this.ReferenceError);
if (this.AggregateError > 0) roots.AddHandle(this.AggregateError);
// **第 376 轮补的两族**（`URIError` / `EvalError`）——与上面几行一字不差。
// **根集漏一格的症状是「看着对、偶尔不对」**：那一格会被回收器当成不可达，
// 而它偏偏还是 `e instanceof URIError` 要用的那一格 ⇒ 报出来的错与现场无关。
if (this.URIError > 0) roots.AddHandle(this.URIError);
if (this.EvalError > 0) roots.AddHandle(this.EvalError);
if (this.Map > 0) roots.AddHandle(this.Map);
if (this.Set > 0) roots.AddHandle(this.Set);
if (this.Date > 0) roots.AddHandle(this.Date);
// **`RegExp` 那一格也是根**（第 936 轮）：与 `Date` 那几行**一字不差**的理由——
// 它被脚本的每一个正则实例**指成 `Proto`**、也被建库层挂着 `constructor` /
// `Symbol.toStringTag` / `Symbol.match`，收掉一格的症状同样是
// 「某一次回收之后 `Object.prototype.toString.call(/x/)` 突然变成别的东西」。
if (this.RegExp > 0) roots.AddHandle(this.RegExp);
if (this.Promise > 0) roots.AddHandle(this.Promise);
// **生成器的原型也是根**（第 229 轮）：与上面那几族同一条理由——
// 被收掉的话 `it.next()` 会在某一次回收之后突然变成 `undefined`
//（症状是「调用一个非闭包」，离现场很远）。
if (this.Generator > 0) roots.AddHandle(this.Generator);
// **函数那三族的原型也是根**（第 730 轮）：与上面几格**一字不差**的理由——
// 它们被脚本闭包**指成 `Proto`**、也被建库层挂着 `constructor` / `toStringTag`，
// 收掉一格的症状同样是「某一次回收之后标签突然变成 `[object Object]`」。
if (this.GeneratorFunction > 0) roots.AddHandle(this.GeneratorFunction);
if (this.AsyncFunction > 0) roots.AddHandle(this.AsyncFunction);
if (this.AsyncGeneratorFunction > 0) roots.AddHandle(this.AsyncGeneratorFunction);
// **知名符号那张表也是根**（第 184 轮）：它里面装着**符号值**，
// 而符号是**引用型**（`IsRef` 那一档）——不收根的话 `Symbol.iterator`
// 会在某一次回收之后变成一个悬着的句柄（症状是「迭代协议某天突然不认了」）。
if (this.WellKnownSymbols > 0) roots.AddHandle(this.WellKnownSymbols);
// **全局对象那一格也要挂根**（第 337 轮）：它是**语言层造的那个对象**
//（`BuildGlobals`），而引擎在非严格调用的那条路上会**把它当 `this` 递出去**——
// 不收根的话，一次回收之后那个句柄就悬了，症状是「某个函数里的 `this` 突然是个野对象」
//（与上面知名符号那条**一字不差**的理由）。
if (this.Global > 0) roots.AddHandle(this.Global);
```

# method InitProtos:(room:RoomChecker, table:HeapTable)=>Protos

造十四个空原型。**要先问 room**（要造十四个堆对象）。

**四格 `Error` 的链是「接上去」的**：`Error.prototype` 的原型是 `Object.prototype`、
`TypeError.prototype` / `RangeError.prototype` / `SyntaxError.prototype` /
**`ReferenceError.prototype` / `AggregateError.prototype`**（第 295 轮）的原型是
`Error.prototype`（JS 里就是如此）——所以 `e instanceof Object` 与
`new TypeError() instanceof Error` 都成立。
**这几个成员共用「报错对象的原型」这一件事**，所以 `/ 13` 那个上界跟着
第 277 轮变成 `/ 14`、第 295 轮变成 **`* 16`**、**第 376 轮变成 `* 18`**、
**第 730 轮变成 `* 21`**（函数那三族的原型）、
**第 733 轮变成 `* 23`**（`WeakMap` / `WeakSet` 两格）
（`URIError` / `EvalError` 两格）——**这个数是手写的**（`ObjectCharge * 23`），
改成员数时**两处都要改**
（少改一处就是「房间问少了」：`CreateObject` 自己**不做房间检查**）。
**第 754 轮变成 `* 24`**（`Symbol.prototype` 那一格）。
**第 936 轮变成 `* 25`**（`RegExp.prototype` 那一格——与上面每一轮同一条：
成员数变了，**这个手写的数也要跟着变**）。
**`Map` / `Set` / `Date` 三格接在 `Object.prototype` 上**（第 138 轮）。
**`Number` / `Boolean` 两格也是**（第 150 轮）——它们与 `String` 那一格同一个用途：
**原始值接收者的方法从这里找**（`(1.5).toFixed(2)`、`true.toString()`）。

```ts
if (!room(ObjectCharge * 25)) {
  throw new Error("out of room");
}
// **`Array.prototype` 自己就是一个数组**（第 592 轮）：JS 里 `Array.isArray(Array.prototype)`
// 是 **`true`**（规范里它就是 Array 异种对象、`length` 为 0），而本仓原来四个原型一律
// `CreateObject` ⇒ `ArrayIsArray` 看的是 `Tag` ⇒ 给 `false`
//（判据 `c371-stdlib-array-of-and-isarray`）。`length` 是结构属性、不在 `Props` 里，
// 所以 `Object.keys(Array.prototype)` 仍是 `[]`（JS 一致）。
const protos = new Protos(table.CreateObject(), table.CreateArray(), table.CreateObject(), table.CreateObject());
// **数组 / 函数 / 字符串的原型也接在 `Object.prototype` 上**（第 137 轮）：
// JS 里 `Object.getPrototypeOf(Array.prototype) === Object.prototype`——
// 不接的话 `[1] instanceof Object` 给 **`false`**（Node 给 `true`，
// 而 `[] instanceof Array` 却是对的——**一半对一半错**是最难查的一种）。
table.Get(protos.Array).Proto = protos.Object;
table.Get(protos.Function).Proto = protos.Object;
table.Get(protos.String).Proto = protos.Object;
// **数字与布尔那两格**（第 150 轮）：与 `String` 一模一样地接——
// 缺了它们，`(1.5).toFixed(2)` 报的是 `unimplemented: calling a non-closure value`
//（听起来像调用写错了，其实是**这一格不存在**）。
protos.Number = table.CreateObject();
table.Get(protos.Number).Proto = protos.Object;
protos.Boolean = table.CreateObject();
table.Get(protos.Boolean).Proto = protos.Object;
// **`Symbol.prototype` 那一格**（第 754 轮）：与上面 `String` / `Number` / `Boolean`
// 三格**同一个用途**——`Object.prototype.toString.call(Symbol.prototype)` 在 Node 里是
// `"[object Symbol]"`（它是一个 Symbol 包装对象），而本仓原来连那一格都没有，
// 于是 `ObjectTagOf` 走不到「箱」那一支、最后落到 `DateMarker` 那一问上——
// **响亮地抛**（`Object.prototype.toString.call(Symbol.prototype)` 整句报
// `unimplemented`，判据 `p754d-01` 第 16 行）。
// **这一格今天只服务标签**（`Symbol.prototype` 的成员还没装，台账 `stdlib/symbol/037`
// 开着）：造它是为了让「那是一个原型对象」这件事在值模型里存在。
protos.Symbol = table.CreateObject();
table.Get(protos.Symbol).Proto = protos.Object;
protos.Error = table.CreateObject();
table.Get(protos.Error).Proto = protos.Object;
protos.TypeError = table.CreateObject();
table.Get(protos.TypeError).Proto = protos.Error;
protos.RangeError = table.CreateObject();
table.Get(protos.RangeError).Proto = protos.Error;
protos.SyntaxError = table.CreateObject();
table.Get(protos.SyntaxError).Proto = protos.Error;
// **第 295 轮补的两格**（`ReferenceError` / `AggregateError`）——链与上面三条一字不差。
protos.ReferenceError = table.CreateObject();
table.Get(protos.ReferenceError).Proto = protos.Error;
protos.AggregateError = table.CreateObject();
table.Get(protos.AggregateError).Proto = protos.Error;
// **第 376 轮补的两格**（`URIError` / `EvalError`）——链与上面几条一字不差
//（JS 里这两个也直接继承 `Error.prototype`）。
protos.URIError = table.CreateObject();
table.Get(protos.URIError).Proto = protos.Error;
protos.EvalError = table.CreateObject();
table.Get(protos.EvalError).Proto = protos.Error;
// **`Map` / `Set` / `Date` 三格**（第 138 轮）：它们直接接在 `Object.prototype` 上
// （JS 里 `Map.prototype` 的原型就是 `Object.prototype`），
// 于是 `new Map() instanceof Object` 也成立。
protos.Map = table.CreateObject();
table.Get(protos.Map).Proto = protos.Object;
protos.Set = table.CreateObject();
table.Get(protos.Set).Proto = protos.Object;
// **`WeakMap` / `WeakSet` 两格**（第 733 轮）：**接在 `Object.prototype` 下面**
// ——**与 `Map.prototype` / `Set.prototype` 并列，不是接在它们下面**。
// 这一条是**实测 Node 量出来的**（`Object.getPrototypeOf(WeakMap.prototype) === Object.prototype`
// 给 `true`、`=== Map.prototype` 给 `false`），理由写在上面那两格字段的说明里：
// 接在 `Map.prototype` 下面的话 `WeakMap.prototype.size` 会**跟着继承过来**，
// 而 JS 里它是 `undefined`——`Object.keys` 那一格看不出来，所以是一种**静默的「一半对」**。
// **方法在 `globals.xl.md` 里各自挂一份**（`InstallWeakPrototypeMethods`），
// 与 `InstallMapPrototype` / `InstallSetPrototype` 同一个位置、同一个形状。
protos.WeakMap = table.CreateObject();
table.Get(protos.WeakMap).Proto = protos.Object;
protos.WeakSet = table.CreateObject();
table.Get(protos.WeakSet).Proto = protos.Object;
protos.Date = table.CreateObject();
table.Get(protos.Date).Proto = protos.Object;
// **`RegExp` 那一格**（第 936 轮）：与上面那几格**一字不差**
// （接在 `Object.prototype` 下面；JS 里 `Object.getPrototypeOf(/x/) === RegExp.prototype`、
//  `Object.getPrototypeOf(RegExp.prototype) === Object.prototype`）。
// **谁用它**：`globals.xl.md` 的 `MakeRegexp`（造实例时把 `Proto` 指到这一格）与
// `ObjectTagOf`（那一格**自己**报 `[object RegExp]`，与四个包装原型同一条做法）。
// **方法不在这一层挂**：`InstallRegexpMethods` 在做完那一格之后挂上去
// ——与 `Map` / `Set` / `Date` 三族同一条分界（引擎只提供「一格句柄」）。
protos.RegExp = table.CreateObject();
table.Get(protos.RegExp).Proto = protos.Object;
// **生成器那一格**（第 229 轮）：接在 `Object.prototype` 上
// （与 `Map` / `Set` / `Date` 同款）。**方法不在这里挂**——
// 这一层只管造一个空对象，「`next` 指向哪一段代码」是**语言层**的事
// （`globals.xl.md` 的 `BuildGlobals` 挂），与 `Error.prototype` 那三格同一条分界。
protos.Generator = table.CreateObject();
table.Get(protos.Generator).Proto = protos.Object;
// **异步生成器自己那一格**（第 320 轮）：`Proto` 指 **`Object`**
// ——**不能指 `Generator`**（第一版就是那么写的，判据当场把它拦下来了）：
// 继承 `Generator` 会**顺带**继承 `Symbol.iterator`，而 JS 里异步生成器
// **没有**那一格（`for..of` 一个异步生成器是 `TypeError`；实测 Node 给
// `typeof asy[Symbol.iterator] === "undefined"`）。
// **那 `next` / `return` / `throw` 怎么来**：**两格原型各挂一份**
//（`globals.xl.md` 的 `BuildGlobals`：同一批能力号挂两处，见那一句的说明）——
// 「同一个实现、两处挂载」比「继承过来、再想办法遮掉一格」干净。
protos.AsyncGenerator = table.CreateObject();
table.Get(protos.AsyncGenerator).Proto = protos.Object;
// **函数那三族的原型**（第 730 轮）——`GeneratorFunction` / `AsyncFunction` /
// `AsyncGeneratorFunction`：**三个都接在 `Function.prototype` 下面**
//（JS 里 `Object.getPrototypeOf(%GeneratorFunction%.prototype)` 就是 `%Function.prototype%`，
//  实测 Node：`Object.getPrototypeOf(Object.getPrototypeOf(function* () {})) === Function.prototype`
//  给 `true`）——所以 `.call` / `.apply` / `bind` 三格**照旧沿链找得到**，
// 而这正是这三格**不能**与 `Function` 合成一格的理由：合成一格的话
// 「`function*` 与 `function` 的标签」就成了同一件事（第 730 轮要收的**正是**这一处）。
//
// **它与 `Generator` 那一格的分工**：`Generator` 是**生成器对象**（`g()` 的成果）的原型，
// 这三格是**生成器函数**（`g` 自己）的原型——JS 里是两个不同的内部对象，
// `Object.prototype.toString.call(g)` 给 `"[object GeneratorFunction]"`、
// `Object.prototype.toString.call(g())` 给 `"[object Generator]"`（判据钉着**两句**）。
protos.GeneratorFunction = table.CreateObject();
table.Get(protos.GeneratorFunction).Proto = protos.Function;
protos.AsyncFunction = table.CreateObject();
table.Get(protos.AsyncFunction).Proto = protos.Function;
protos.AsyncGeneratorFunction = table.CreateObject();
table.Get(protos.AsyncGeneratorFunction).Proto = protos.Function;
// **`Promise` 那一格**（第 601 轮）：与上面那几格一字不差。
protos.Promise = table.CreateObject();
table.Get(protos.Promise).Proto = protos.Object;
return protos;
```

# method NeverRoom:(bytes:int)=>bool

一个「永远说不行」的 room 判据，给**不分配的查询**用。

`FindProperty` 的签名里带 `room` 是为了它将来可能要为内联缓存分配东西；今天它一次都不分配，
所以查询路径传这个进来——**语义上明确「这条路上不会分配」**。

```ts
return false;
```

# method IsLengthKey:(table:HeapTable, key:Value)=>bool

这个键是不是 `"length"`。

数组与字符串的 `length` 是**结构属性**（不在属性表里），读与写都要先认出它。
**判定只写在这里一处**：散成两份的话，总有一天一份会漂。

**按码元逐个比，不造中间字符串**：这条路径在热路径的第一步上，而造一个字符串要分配。

```ts
if (key.Tag !== ValueTag.String) return false;
const units = table.Get(key.Ref).AsString().Units;
if (units.length !== 6) return false;
if (units[0] !== 108) return false;
if (units[1] !== 101) return false;
if (units[2] !== 110) return false;
if (units[3] !== 103) return false;
if (units[4] !== 116) return false;
if (units[5] !== 104) return false;
return true;
```

# method IsNameKey:(table:HeapTable, key:Value)=>bool

这个键是不是 `"name"`（第 291 轮）。

**与 `IsLengthKey` 同一个写法、同一个理由**（按码元逐个比，不造中间字符串）：
闭包的 `fn.name` 是**结构属性**（住在 `HeapClosure.Name` 上，不在属性表里）——
与数组 / 字符串的 `length` 是同一档东西。**判定只写在这里一处**
（散成两份的话，总有一天一份会漂）。

```ts
if (key.Tag !== ValueTag.String) return false;
const units = table.Get(key.Ref).AsString().Units;
if (units.length !== 4) return false;
if (units[0] !== 110) return false;
if (units[1] !== 97) return false;
if (units[2] !== 109) return false;
if (units[3] !== 101) return false;
return true;
```

# method IsRestrictedKey:(table:HeapTable, key:Value)=>bool

这个键是不是 `"arguments"` 或 `"caller"`（第 709 轮）。

**与 `IsLengthKey` / `IsNameKey` 同一个写法、同一个理由**（按码元逐个比，
不造中间字符串）：这两格是**松散的普通函数**自带的受限属性，
**不住在属性表里**（住在「这个闭包是不是那一档」这一位上，见
`heap.xl.md` 的 `HeapClosure.HasRestricted`）——所以读与枚举都要先认出它们。

**两格合成一次判定**：它们的语义、来处、开关都是同一处，分开写就是两份会漂的答案。

```ts
if (key.Tag !== ValueTag.String) return false;
const units = table.Get(key.Ref).AsString().Units;
if (units.length === 9) {
  if (units[0] !== 97) return false;
  if (units[1] !== 114) return false;
  if (units[2] !== 103) return false;
  if (units[3] !== 117) return false;
  if (units[4] !== 109) return false;
  if (units[5] !== 101) return false;
  if (units[6] !== 110) return false;
  if (units[7] !== 116) return false;
  if (units[8] !== 115) return false;
  return true;
}
if (units.length !== 6) return false;
if (units[0] !== 99) return false;
if (units[1] !== 97) return false;
if (units[2] !== 108) return false;
if (units[3] !== 108) return false;
if (units[4] !== 101) return false;
if (units[5] !== 114) return false;
return true;
```

# method KeyMatches:(table:HeapTable, property:Property, key:Value)=>bool

这一格属性的键是不是 `key`。

**字符串按内容比、符号按身份比**——这就是「字符串是原始值、符号是身份」在属性表上的落点
（`heap.xl.md` 的 `Property.Key` 只存句柄，分叉在这里）。

```ts
const stored = table.Get(property.Key);
if (key.Tag === ValueTag.String) {
  if (stored.Tag !== ValueTag.String) return false;
  return stored.AsString().Equals(table.Get(key.Ref).AsString());
}
if (key.Tag === ValueTag.Symbol) {
  if (stored.Tag !== ValueTag.Symbol) return false;
  return stored.AsSymbol().Id === table.Get(key.Ref).AsSymbol().Id;
}
// **整数键与「十进制整数文本」是同一格**（第 707 轮，**普查当场红的**）：
// 对象字面量 `{ 1: "v" }` 的键是**数字字面量**——降级层把它**原样**交上来
// （`Int32`），而那些**只认字符串**的旁路（`Object.hasOwn(o, 1)`、
// `Object.getOwnPropertyDescriptor(o, 1)`、`Object.getOwnPropertyDescriptors`）
// 于是**答假 / 给 `undefined`**，而 `o[1]` / `o["1"]` / `1 in o` 三条**全都是对的**
//（它们走 `get_index` / `in`，那两处早就会把数字键字符串化）——
// **同一个属性、四种问法、两个答案**（判据 `p707d-k01` / `p707d-k02`）。
//
// **只认非负的十进制整数**：`-1` 与 `1.5` 在 JS 里是**普通属性名**（`"-1"` / `"1.5"`），
// 而它们**不会**以 `Int32` 的形态落在属性表里（`{ 1.5: "v" }` 造出来的是字符串键
// `"1.5"`——判据 `p707d-k03` 是绿的）。所以这里只处理 `Int32` 那一档。
//
// **十进制码元就地算，不 import `DecimalUnits`**：那一格在 `rt.xl.md` 里，
// 而**本文件是它 import 的**（`rt.xl.md` 第 7 行）——import 回来就是一个环。
// 写法与它**一字不差**（从低位往高位取、最后翻一遍）。
if (stored.Tag === ValueTag.String && key.Tag === ValueTag.Int32 && key.Int >= 0) {
  const storedString = stored.AsString();
  const keyUnits: number[] = [];
  let magnitude = key.Int;
  if (magnitude === 0) keyUnits.push(48);
  while (magnitude > 0) {
    keyUnits.push(magnitude % 10 + 48);
    magnitude = Math.floor(magnitude / 10);
  }
  if (storedString.Units.length !== keyUnits.length) return false;
  const storedUnits = storedString.Units;
  for (let i = 0; i < storedUnits.length; i++) {
    if (storedUnits[i] !== keyUnits[storedUnits.length - 1 - i]) return false;
  }
  return true;
}
throw new Error("property keys must be strings or symbols");
```

# method FindProperty:(room:RoomChecker, table:HeapTable, receiver:int, key:Value, includeInternal:bool = false)=>PropRef | null

沿原型链找 `key`，返回**第一处**命中的（自有属性优先）。

**返回 `null` 是正常结果**（属性不存在），不是错误。深度上限见 `MaxProtoDepth`。

**`includeInternal` 缺省为假 = 「按用户的口径找」**（第 890 轮）：
带 `PropertyFlagInternal` 的那些格**不是一个属性**（`heap.xl.md` 那一格写着为什么），
所以读属性 / `in` / 赋值**全都看不见它们**——`f.bind(x).prototype` 给 `undefined`、
`"prototype" in f.bind(x)` 给假（Node 两边都是这样）。
**这一格只有引擎自己读载荷时才给真**（`vm.xl.md` 造实例时读那一格 `prototype`、
`globals.xl.md` 的 `BoundCall` 读那三格 `__bound*`）——**两个调用点，都写在明处**。

**为什么滤在这一层而不是「按名字滤」**：用户自己写 `{ ["__boundTarget"]: 1 }`
是一个**真的**自有属性名，按名字滤会把它一起藏掉（与 `#p` 那一族同一个坎）。

```ts
let current = receiver;
let depth = 0;
while (current > 0) {
  if (depth > MaxProtoDepth) throw new Error("prototype chain is too deep");
  const item = table.Get(current);
  for (let i = 0; i < item.Props.length; i++) {
    if (includeInternal === false && (item.Props[i].Flags & PropertyFlagInternal) !== 0) {
      continue;
    }
    if (KeyMatches(table, item.Props[i], key)) return new PropRef(current, i);
  }
  current = item.Proto;
  depth = depth + 1;
}
return null;
```

# method HasProperty:(table:HeapTable, receiver:int, key:Value, functionProto:int = 0)=>bool

`key in receiver`：**沿原型链找得到就算**（`in` 的语义就是它，不是「自有属性」）。

**记账格不算属性**（第 890 轮）：`FindProperty` 的缺省口径会把
`PropertyFlagInternal` 那些格滤掉，所以 `"__boundTarget" in f.bind(x)` 给假
（Node 就是这样；它在 `heap.xl.md` 那一格写着为什么）。

**两格「受限属性」要先答**（第 899 轮）：`arguments` / `caller` **不在属性表里**
（按闭包载荷那一位答，见 `GetProperty` 那一支），所以只查属性表会把它们答成**假**——
`"arguments" in function f() {}` 在 Node 里是**真**（自有那两格），本仓原来给假
（**静默错值**：同一份文件里 `hasOwnProperty` 答真、`in` 答假，两个出口互相打脸）。
两档形状不同，都要认：

- **松散的普通函数**：那一位在闭包载荷上（`HeapClosure.HasRestricted`）；
- **`Function.prototype` 自己**：它按规范也自有这两格，而它是个**普通对象**
  （带一格可调用载荷）、**没有闭包载荷可问** ⇒ 只能按**身份**认。
  身份由调用方给（`functionProto`）——引擎认识的是句柄、不是名字，
  与 `ConstructorProtoOf` 那几处「语言层登记、引擎按号认」同一条分界；
  **默认 `0` 表示「没给」**，那几处照旧只按属性表答。

```ts
if (IsRestrictedKey(table, key)) {
  const holder = table.Get(receiver);
  if (holder.Tag === ValueTag.Closure && holder.AsClosure().HasRestricted) return true;
  if (functionProto !== 0 && receiver === functionProto) return true;
}
return FindProperty(NeverRoom, table, receiver, key) !== null;
```

# method GetInternalProperty:(room:RoomChecker, table:HeapTable, receiver:Value, key:Value)=>Value

**读一格「引擎自己的记账」**（第 890 轮）——只有**自有**那一格算数（不沿原型链），
不是数据属性或找不到都给 `undefined`。

**为什么单独有一个方法**：`GetProperty` 是**用户口径**的读（它按 `FindProperty` 的缺省
把记账格滤掉），而引擎有两处必须读到那些格——`vm.xl.md` 造实例时读绑定对象上那一格
`prototype`、`globals.xl.md` 的 `BoundCall` 读 `__boundTarget` / `__boundThis` /
`__boundArgs`。把「要不要看见记账」摊成一个显式的入口，比在 `GetProperty` 上加第 7 个
参数更难写错（那条路上有几十个调用点，多一个位置参数就是几十处静默的实参错位）。

```ts
if (!receiver.IsObject()) {
  return Value.Undefined();
}
const found = FindProperty(room, table, receiver.Ref, key, true);
if (found === null || found.Owner !== receiver.Ref) {
  return Value.Undefined();
}
const property = table.Get(found.Owner).Props[found.Index];
if (property.Kind !== PropertyKind.Data) {
  return Value.Undefined();
}
return property.Value;
```

# method GetProperty:(room:RoomChecker, call:NativeCall, protos:Protos, table:HeapTable, receiver:Value, key:Value)=>Value

读属性。

三条分支，**顺序是语义**：

1. **数组 / 字符串的 `length`**：结构属性，先答；
2. **沿原型链找**：数据属性给值；**访问器调它的 getter**（`this` 是**接收者**，不是拥有者）；
3. **找不到给 `undefined`**——**不是错误**（`obj.missing` 是 `undefined`，这是 JS 的日常）。

**原始值接收者**（`String` / `Symbol` / 数字 / 布尔）没有属性表，所以第 2 步从
**它的原型**起步（`"abc".charAt(1)` 走 `Protos.String`、
`(1.5).toFixed(2)` 走 `Protos.Number`、`true.toString()` 走 `Protos.Boolean`
——三格都是**同一条路**，只有起点不同）。
**`Symbol` 今天仍给 `undefined`**（还没有它的原型，写在明处）；
**数字与布尔是第 150 轮补的**——在那之前它们也给 `undefined`，
于是 `(1.5).toFixed(2)` 报的是 `calling a non-closure value`（离现场很远）。

**原型表要传进来**：原始值没有「自己那一格」可以顺着走，起点只能由调用方给。
对象那条路不靠它（对象自带 `Proto`），但两条路共用一个签名更不容易分叉。

**闭包那两格结构属性排在下面「借 `protos.Function`」那一趟之前**（第 731 轮）：
`fn.length`（`HeapClosure.Arity`）与 `fn.name`（`HeapClosure.Name`）住在**闭包载荷**上，
而 `Function.prototype` 自己**也是函数对象**——它那两格（`length` 是 `0`、`name` 是 `""`）
第 731 轮挂进了 `protos.Function` 的表里。**次序反了就是 40 条回归**：
第 690 轮照着挂过一次，可当时「可调用接收者」那一趟排在前面 ⇒ **每一个函数**的
`f.name` 都变成 `""`、`f.length` 都变成 `0`（实测：`089-function-tostring-and-name`
报 `node «named 2 true» vs 本仓 « 0 true»`），那一版当场撤回、账留在这里。
第 731 轮把两格**提到前面**（闭包自己身上的东西本来就比原型上的更具体——
JS 里它们就是**自有属性**），于是两处一起成立：
`Function.prototype.length` / `.name` 取得到，而 `f.length` / `f.name` 照旧。

**`Object.prototype` / `Function.prototype` 那两个对象与「函数那一类」接收者
都要从 `protos.Function` 上找一次**（第 228 轮）：
`Object.prototype.toString.call(x)` 这条写法（判据 `object-tostring-tag` / `symbol-tostringtag`）
里的接收者是 **`Object.prototype.toString` 这个值**，而 `.call` 挂在 `protos.Function` 上
——它**顺着 `Proto` 走是走不到的**（那个值是**宿主引用**，`HostRef` 没有属性表）。

**JS 里为什么没有这个问题**：那边的每一个函数（包括内建）都**真的**以
`Function.prototype` 为原型（`Object.prototype.toString` 在那边是一个**函数对象**，
它的原型就是 `Function.prototype` ⇒ `.call` 沿链找得到）；
本仓的宿主引用是**引擎内部那一档**，没有跟着走——所以这里替它补一次查找。

**所以补一条判据**，而不是去改原型链：接收者**是「函数那一类」**时，
先到 `protos.Function` 上找一次。

**「函数那一类」比「闭包」宽**（第 228 轮实测三次才定下来）：
第一版只写了 `protos.Function` **这一个对象**，第二版加了 `protos.Object`，
两版都漏了**同一个东西**——本仓的内建方法**不都是闭包**：
`Object.prototype.toString` 那一族是**宿主引用**（`HostRef`，
`globals.xl.md` 里挂的就是 `Value.FromRef(ValueTag.HostRef, …)`），
而 `HostRef` **不算 `IsObject()`**（`value.xl.md` 那一格写着理由）——
于是 `Object.prototype.toString.call(x)` 这条路**根本没走到这一条判据上**，
它走的是下面那条「原始值 / 不是对象」的兜底，答案是 `undefined`
（症状仍然是 `calling a non-closure value`，而真相是「`.call` 那一格没找到」）。

**判据收成一句**：`Value.IsCallable()`（闭包、内建函数）+ `HostRef`
+ **那两个原型对象自己**（`protos.Function` 在 JS 里**确实是**函数对象；
`protos.Object` 一并放行是**这一侧的取舍**——`Object.prototype.toString` 就在它自己的表里，
先看自有那一格才不会命中 `protos.Function` 上同名的 `toString`，理由见下面 `own.Owner`
那一段。**注意两处口径不完全对称**：`rt.xl.md` 的 `RtTypeOf` 第 690 轮把 `protos.Object`
**拿掉了**（`typeof Object.prototype` 必须是 `"object"`），这里留着——它管的是
「找哪张表」，不是「这个值是什么」）。
**顺序要紧**：它必须排在「是不是对象」那条分岔**之前**，
不然 `HostRef` 那一档就到不了这里。

**它只多答「`protos.Function` 上有什么」**：那三格就是我们自己挂的
`call` / `apply` / `bind`（`globals.xl.md`）——所以
`Function.prototype.call === Function.prototype.call` 仍然成立
（判据 `function-prototype-shape` 钉着这一条）。

```ts
// **排在「沿原型链找」与「原始值兜底」之前**（见上面那一段的说明）。
//
// **`protos` 那一格要先判空**（第 228 轮实测）：`GetProperty` 的签名里
// `protos: Protos` 是**非空**的，可**判据**会拿一台还没装载过的机器来调它
// （`tests/runtime/check.mjs` 用 `InitProtos` 自己造一份，而 `machine.Protos` 是 `null`）——
// 那几处的接收者是**普通对象**（它们走的是「对象自带 `Proto`」那条路，本来不需要 `protos`），
// 于是直接读 `protos.Object` 会当场抛，而那句话是
// `Cannot read properties of null (reading 'Object')`（**离现场很远**，
// 实测踩过一次：五条判据一起红，读起来像「对象表坏了」）。
// **判空之后语义不变**：`protos === null` 时只少答「那两个原型对象 + 宿主引用」两档。
// **闭包那两格结构属性先答**（第 731 轮把这一段从下面搬上来的，理由见上面那一段）：
// 它们住在**闭包载荷**上（`Arity` / `Name`），而下面那一趟会去 `protos.Function` 找——
// 那里第 731 轮起也有同名的两格（`Function.prototype.length` / `.name`），
// **闭包自己身上的那一份更具体**（JS 里它们是**自有属性**，原型的同名格永远排在后面）。
if (IsLengthKey(table, key)) {
  if (receiver.Tag === ValueTag.Array) return Value.FromInt(table.Get(receiver.Ref).AsArray().GetLength());
  if (receiver.Tag === ValueTag.String) return Value.FromInt(table.Get(receiver.Ref).AsString().GetLength());
  // **闭包的 `fn.length`**（第 291 轮）——与上面两格**同一档结构属性**
  //（住在 `HeapClosure.Arity` 上，不在属性表里，所以必须在这里答）。
  // **第 291 轮之前它给 `undefined`**（`function-length-and-name` /
  // `function-length-with-defaults` 两条判据一起报的就是这个）——
  // 而 `Arity` 那一格**本来就是为它留的**（`heap.xl.md`），只是从第 238 轮到
  // 第 290 轮**一直没人填、也没人读**。
  if (receiver.Tag === ValueTag.Closure) return Value.FromInt(table.Get(receiver.Ref).AsClosure().Arity);
}
// **闭包的 `fn.name`**（第 291 轮）：`Name` 是**字符串句柄**、`0` 表示匿名——
// 匿名给**空串**（JS 的 `(function () {}).name` 是 `""`，不是 `undefined`；
// `console.log` 那边印 `[Function (anonymous)]` 是**宿主**的写法，见 `inspect.xl.md`）。
if (receiver.Tag === ValueTag.Closure && IsNameKey(table, key)) {
  const nameHandle = table.Get(receiver.Ref).AsClosure().Name;
  if (nameHandle === 0) return Value.FromString(table.CreateString([]));
  return Value.FromString(nameHandle);
}
if ((protos !== null && (receiver.Ref === protos.Object || receiver.Ref === protos.Function))
  || receiver.IsCallable() || receiver.Tag === ValueTag.HostRef) {
  if (protos !== null) {
    // **自有那一格先看**（第 334 轮修的，**实测撞过一次**）：那两个原型对象
    // **自己有属性表**——`Object.prototype.toString`（号 337）就在 `protos.Object` 自己表里、
    // `Function.prototype.toString`（号 345，第 334 轮新加的）在 `protos.Function` 自己表里。
    //
    // **少了这一句会怎样**：读 `Object.prototype.toString` 会先命中 `protos.Function` 上那一格
    // ⇒ `Object.prototype.toString.call([])` 变成调「读闭包源码」那一条 ⇒ 给**空串**
    //（判据 `object-tostring-tags` / `symbol-tostringtag` / `c291-object-tostring-and-tag` /
    // `c305-std-symbol-tostringtag-custom` / `error-family-and-cause` /
    // `function-prototype-shape` ——**六条一起红**），
    // 而报的是「`[object Array]` 变成了空的」——**离现场很远**。
    // **两边都有 `toString` 才是这一格的触发器**：第 228 轮加这一段时
    // `protos.Function` 上只有 `call` / `apply` / `bind`，三格在 `protos.Object` 上都没有
    // ⇒ 「先找哪边」看不出来；第 334 轮补上第四格才把它点着。
    //
    // **宿主引用今天也有自己的表了**（第 733 轮）：它本来「没有属性表」，
    // 所以 `.call` 这类挂在 `protos.Function` 上的格子只能靠下面那一句替它找。
    // 可「宿主引用没有表」**不是一条结构事实**——`HeapObject.Props` 本来就长在
    // 每一格上（`heap.xl.md`），`HostRef` 只是**从来没人往里写过**。
    // 第 733 轮往里写了头两格（内建函数的 `name` / `length`，见 `globals.xl.md`
    // 的 `DefineBuiltinName`），于是它**和普通对象一样**先看自有那一摞。
    //
    // **顺序要紧**：这一段必须排在下面那句「去 `protos.Function` 上找」**之前**——
    // `protos.Function` 自己第 731 轮挂了 `name`（空串）与 `length`（`0`），
    // 排在后面的话每一个内建的 `name` 都会读到**原型上那一格**（静默错值，
    // 与第 731 轮那 40 条回归**同一个形状**）。
    // **只查自有那一摞**（`FindProperty` 会顺着 `Proto` 走）：宿主引用的 `Proto`
    // 今天还是 `0`（没有原型），走链是空转；而「自有优先」正是 JS 里
    // `[[GetOwnProperty]]` 先于原型链那一条。
    if (receiver.Tag === ValueTag.HostRef) {
      const hostOwn = FindProperty(room, table, receiver.Ref, key);
      if (hostOwn !== null && hostOwn.Owner === receiver.Ref) {
        return ReadProperty(call, table, hostOwn, receiver);
      }
    }
    if (receiver.Ref === protos.Object || receiver.Ref === protos.Function) {
      const own = FindProperty(room, table, receiver.Ref, key);
      if (own !== null && own.Owner === receiver.Ref) {
        return ReadProperty(call, table, own, receiver);
      }
    }
    // **闭包自己那条原型链比 `protos.Function` 更具体，先走它**（第 730 轮）——
    // **但只限「函数那一族」的原型**（`%GeneratorFunction%` 那三格）。
    //
    // **为什么需要这一句**：闭包的 `Proto` 是 `MakeClosure` 出生那一刻指的，
    // 而第 730 轮起 `function*` / `async function` / `async function*` 三族指的是
    // `%GeneratorFunction%` 一族，那三格上正挂着 `constructor` 与 `Symbol.toStringTag`。
    // 少了这一句的话，下面那趟「去 `protos.Function` 上找」会**先**命中
    // `Function.prototype.constructor` ⇒ `(function* () {}).constructor.name` 给
    // `"Function"`（Node 给 `"GeneratorFunction"`，**静默错值**）。
    //
    // **为什么不能给所有闭包走**（**第 730 轮实测撞了三条**）：闭包的 `Proto`
    // **不一定是函数那一族**——`class E extends Error {}` 的静态链
    // 指的就是那个**父类值**（`Error` 那个普通对象，它的 `Proto` 是 `protos.Object`），
    // 于是「先走自己那条链」会**穿过父类**命中 `Error` 自己的 `name`
    //（`E.name` 从 `"E"` 变成 `"Error"`）、或穿过 `Array` 命中
    // `Object.prototype.toString`（`(class extends Array {}).toString()` 从
    // `"class extends Array {}"` 变成 `"[object Function]"`）。
    // **JS 里不会这样**：那边每个内建函数的 `[[Prototype]]` **真的**是 `Function.prototype`，
    // 所以链上先遇到的是 `Function.prototype.toString`——差别在本仓内建是「普通对象 +
    // 一格可调用载荷」（见 `globals.xl.md` 那几处），它们的 `Proto` 是 `Object.prototype`。
    // 所以判据收成「**这个闭包的原型是不是那三格之一**」：是才走自己那条链，
    // 其余一律照旧（先借 `protos.Function`）——**不动**上面那三条已经量过的行为。
    if (receiver.Tag === ValueTag.Closure) {
      const chainProto = table.Get(receiver.Ref).Proto;
      const isFunctionKind = chainProto === protos.GeneratorFunction
        || chainProto === protos.AsyncFunction
        || chainProto === protos.AsyncGeneratorFunction;
      if (isFunctionKind) {
        const onOwnChain = FindProperty(room, table, receiver.Ref, key);
        if (onOwnChain !== null) return ReadProperty(call, table, onOwnChain, receiver);
      }
    }
    const onFunction = FindProperty(room, table, protos.Function, key);
    if (onFunction !== null) return ReadProperty(call, table, onFunction, receiver);
  }
}
// **读 `null` / `undefined` 的属性要抛**（第 136 轮）：JS 的 `null.y` 是 `TypeError`，
// 而这里原来一律给 `undefined`——**静默错值里最贵的一种**
// （`const {a} = null` 也给 `undefined`，**一句 `try` 都接不住**——
//  判据现场：`try { const x = null.y } catch { }` 在 Node 里进 `catch`，在这里不进）。
//
// **要能被 `try` 接住**：这一抛必须走**错误工厂**那条路（`vm.xl.md` 的 `Guard`），
// 所以调用方（`RtOp.GetProp` 那一支）也要跟着包一层——只改这里的话，
// 抛出去的是**引擎的**异常，整份程序照样挂。
//
// **一处已知差**：JS 抛的是 `TypeError` 且话里带着键名
//（`Cannot read properties of null (reading 'y')`），本仓抛的是**装了工厂的那种错误**
// ——`try` 接得住，「是哪一种错误」还分不出来（`instanceof TypeError` 那一层还没有）。
if (receiver.Tag === ValueTag.Undefined || receiver.Tag === ValueTag.Null) {
  throw new Error("cannot read properties of " + (receiver.Tag === ValueTag.Null ? "null" : "undefined"));
}
// **闭包那两格 `length` / `name` 在第 731 轮搬到了上面**（在「借 `protos.Function`
// 找一次」那一趟**之前**）——理由写在 `GetProperty` 那一段的开头：两处都有同名格时，
// **闭包载荷上的那一份**才是 JS 里那个**自有属性**。
// **松散普通函数那两格受限属性**（第 709 轮）：`fn.arguments` / `fn.caller` 是
// **自有、不可枚举、不可写、不可配置**的两格，**不在属性表里**——
// 与上面 `length` / `name` 同一档结构属性，所以也只能在这里答。
// **值给 `null`**：不在调用中时 JS 就是 `null`
//（`typeof f.arguments` 给 `"object"`；本仓不模拟「调用中给出实参对象」那一半——
//  那是 `[[ParameterMap]]` 同族的待做项，见 `exec/functions/095-arguments-length` 的台账）。
// **只有 `HasRestricted` 那一位为真的闭包才有**（箭头 / 方法 / 生成器 / `async` /
// 类 / 严格代码都没有这两格，判据在降级层现量）。
// **`Function.prototype` 自己也有这两格**（第 899 轮）：它按规范是一个**松散函数对象**，
// 而它在本仓是「普通对象 + 一格可调用载荷」、**没有闭包载荷可问** ⇒ 按**身份**认
//（`protos.Function`，这一层手上正好有 `protos`）。值同样给 `null`——
// `in` / `hasOwnProperty` / 读三个出口因此说同一句话（`HasProperty` 与
// `globals.xl.md` 的 `hasOwnProperty` 各补了同一句判据）。
if (IsRestrictedKey(table, key)
  && ((receiver.Tag === ValueTag.Closure && table.Get(receiver.Ref).AsClosure().HasRestricted)
    || (protos !== null && receiver.IsObject() && receiver.Ref === protos.Function))) {
  return Value.Null();
}
if (!receiver.IsObject()) {
  // **原始值接收者：从它自己的原型起步**（第 150 轮把数字与布尔接了进来）——
  // 三格走的是**同一条路**，只有起点不同；`Symbol` 还没有原型 → `undefined`。
  let protoHandle = 0;
  if (receiver.Tag === ValueTag.String) protoHandle = protos.String;
  if (receiver.Tag === ValueTag.Int32 || receiver.Tag === ValueTag.Float64) protoHandle = protos.Number;
  if (receiver.Tag === ValueTag.Bool) protoHandle = protos.Boolean;
  if (protoHandle === 0) return Value.Undefined();
  const boxed = FindProperty(room, table, protoHandle, key);
  if (boxed === null) return Value.Undefined();
  return ReadProperty(call, table, boxed, receiver);
}
const found = FindProperty(room, table, receiver.Ref, key);
if (found === null) return Value.Undefined();
return ReadProperty(call, table, found, receiver);
```

# method GetPropertyFrom:(room:RoomChecker, call:NativeCall, table:HeapTable, start:Value, key:Value, receiver:Value)=>Value

**从 `start` 起沿原型链找一格属性，但读的时候 `this` 是 `receiver`**（第 243 轮）——
`super.v` 那一格要的正是它。

**它为什么必须是一条新入口**（第 242 轮量清的）：
- **`GetProperty`** 的起点是**接收者自己**——`get v() { return super.v + 1 }` 里
  那会先命中**子类自己**那一格访问器 ⇒ **无限递归**（响亮的错，但它就是进不来的原因）；
- **`FindProperty` + `ReadProperty`** 分开用呢——`FindProperty` 的起点能指定，
  可它**只找不读**；再拿找到的句柄去 `ReadProperty(…, 父原型)`，
  `this` 会变成**原型**（不是实例）⇒ **静默错值**——比无限递归坏得多。

**它一行业务逻辑都不新写**：起点由一个**句柄**给（`start.Ref`），
找到之后交给**同一个** `ReadProperty`（那一处「访问器的 `this` 是接收者」的规矩照旧）。

**`start` 必须是对象**：`super` 的父原型当然是一个对象——
不是的话（`null` / `undefined`）给 `undefined`（与 `GetProperty` 找不到那一档一致，
**不抛**：`super.v` 在父类那一格不存在时 JS 给 `undefined`）。

```ts
if (!start.IsObject()) return Value.Undefined();
const from = FindProperty(room, table, start.Ref, key);
if (from === null) return Value.Undefined();
return ReadProperty(call, table, from, receiver);
```

# method ReadProperty:(call:NativeCall, table:HeapTable, found:PropRef, receiver:Value)=>Value

**一处命中的属性怎么读出来**：数据属性给值，访问器**用接收者当 `this`** 调它的 getter。

**抽出来是因为有两条路会命中**（对象沿原型链、原始值沿它的原型）——
**「命中之后怎么读」是同一件事**，写两遍就会漂。

**判据是 `IsCallableValue`、不是 `Value.IsCallable`**（第 601 轮，**实测撞到的**）：
后者看不到**宿主引用**，而语言层往内建身上挂的 getter 正是宿主引用
（`Array[Symbol.species]` 那一格）⇒ 拿后者判会在**读**的时候报
「accessor without a getter」——那一格明明装着 getter。

```ts
const property = table.Get(found.Owner).Props[found.Index];
if (property.Kind === PropertyKind.Accessor) {
  if (!IsCallableValue(table, property.Getter)) {
    throw new Error("unimplemented: this should throw a TypeError (accessor without a getter)");
  }
  return call(property.Getter, receiver, []);
}
return property.Value;
```

# method SetProperty:(room:RoomChecker, call:NativeCall, table:HeapTable, receiver:Value, key:Value, value:Value)=>bool

写属性。**返回的是「写下去了没有」**（第 333 轮）——**不再是那个值**。

**为什么要把这一格交出来**（这一轮实测撞到的）：JS 的 `[[Set]]` 本来就是**一个布尔**，
而**赋值语句与非严格模式**对它的处理是「**不看**」——`o.x = 1` 在不可写的属性上
**一声不响什么都没做**。本仓原来把它写成**抛** ⇒ 同一个脚本在 Node 里是好的、
在这里报 `this should throw a TypeError (read-only property)`（判据 `object-freeze`）。

**那为什么还要把布尔交出来**：有一整族**内建方法**要**看得见**这个结果——
`Array.prototype.push` 在冻结的数组上**必须抛 `TypeError`**（JS 的口径：那是
`CreateDataPropertyOrThrow` 那一类，与赋值语句**不是一回事**）。所以：
**引擎说「写没写下去」，谁去在乎由调用方决定**——
赋值那三条 rt 算子不看（非严格）、`push` 那些看（判据 `object-freeze-array-element`）。

**它是 `SetPropertySearched` 的「从头找」那一档**（第 326 轮抽出来）：
查找起点**就是接收者自己**——`super.x = v` 要的是「起点另给一个、接收者照旧」，
两件事只差**一个参数**，所以规矩只有一处（见 `SetPropertyFrom`）。

```ts
// **闭包的 `name` 是结构属性**（第 291 轮读的那一格，第 620 轮补上写的那一半）：
// `GetProperty` **先**答结构属性（上面那一段），所以只往属性表里写一格是**看不见的**
// ——`f.name` 读回来还是原来那个（**静默无效**）。
// **谁要写它**：对象字面量与类里的**计算键成员**——JS 的 NamedEvaluation 用的是
// **运行期算出来的那个键**（`{ ["k" + 1]() {} }.k1.name` 是 `"k1"`，判据
// `c371-rt-function-name-and-length`），而降级期算不出那个键 ⇒ 只能由运行期补写。
// **只收字符串值、且只有匿名闭包**：JS 那边是 `ToPropertyKey(key)` 之后的文本
//（数字给 `"5"`、符号给 `"[Symbol.iterator]"`）——那两步要语言层，这里只接
// **已经算成文本**的那一档，其余照旧落进属性表（**不说谎，只是不特殊**）。
// **已经有名字的不动**（**实测撞到的**）：`class Named {}` 的 `name` 在 JS 里是
// **不可写**的（`C.name = "Renamed"` **静默无效**，判据 `rt-class-expr-and-static-this`），
// 而「写成结构属性」那条路**不看标志位** ⇒ 那一格会从 `Named` 变成 `Renamed`。
// **已经有一个名字就不再命名** 本来就是 NamedEvaluation 的判据
//（`{ ["c"]: function named(){} }.c.name` 是 `named`），所以这一夹不是补丁。
if (receiver.Tag === ValueTag.Closure && IsNameKey(table, key) && value.IsString()
  && table.Get(receiver.Ref).AsClosure().Name === 0) {
  table.Get(receiver.Ref).AsClosure().Name = value.Ref;
  return true;
}
return SetPropertySearched(room, call, table, receiver.Ref, key, value, receiver);
```

# method SetPropertyFrom:(room:RoomChecker, call:NativeCall, table:HeapTable, start:Value, key:Value, value:Value, receiver:Value)=>bool

**从 `start` 起沿原型链找那一格，但写下去的接收者是 `receiver`**（第 326 轮）——
`super.x = v` 那一格要的正是它（与读那一半的 `GetPropertyFrom` **对称**）。

**它为什么必须与 `SetProperty` 分开**：`SetProperty` 的查找起点是**接收者自己**——
`set value(v) { super.value = v }` 会先命中**子类自己**那一格 setter ⇒ **无限递归**
（读那一半第 242 轮踩的是同一件事）。

**起点不是对象**（`null` / `undefined`）**就跳过查找**：父原型为空时 JS 照样往下走
（在接收者上定义），**不抛**。

```ts
const searchRef = start.IsObject() ? start.Ref : -1;
return SetPropertySearched(room, call, table, searchRef, key, value, receiver);
```

# method SetPropertySearched:(room:RoomChecker, call:NativeCall, table:HeapTable, searchRef:int, key:Value, value:Value, receiver:Value)=>bool

**写属性那一套规矩本身**（第 326 轮从 `SetProperty` 里抽出来）——`searchRef` 是
**查找起点**（`< 0` 表示「不找」），接收者永远是 `receiver`。

四条分支，**顺序是语义**：

1. **数组的 `length`**：写它**截断**（JS 语义：`a.length = 2` 把后面丢掉）；
   字符串的 `length` 只读 → 抛（缺口 2）；
2. **访问器**：**调它的 setter**（`this` 是接收者）——注意这一条在「自有还是继承」之前：
   继承来的 setter 也要调，**不是**在接收者上遮蔽一格；
3. **自有数据属性**：写它那一格；不可写 → **返回假**（第 333 轮，见 `SetProperty` 那一段）；
4. **没找到，或者只在原型链上找到数据属性**：**在接收者上新建一个自有属性**。

第 4 条里「只在原型链上找到」那一半容易写错，值得写清楚：JS 的 `[[Set]]` 遇到**继承来的
数据属性**时**不改原型**，而是在接收者上**新建一个自有的**（遮蔽它）。「写回拥有者」
是反过来的——那会让 `child.x = 1` 悄悄改掉所有兄弟共享的原型，**这正是原型污染那一类
bug 的形状**。原型那一格只有在「直接对原型对象赋值」时才会变。

```ts
if (IsLengthKey(table, key) && receiver.Tag === ValueTag.Array) {
  // **非数字要抛 `RangeError`**（第 376 轮）——`xs.length = -1` / `xs.length = 1.5`
  // 在 JS 里都抛 `RangeError: Invalid array length`（判据
  // `c371-stdlib-array-length-write-forms` 量的就是这两格）。
  //
  // **量与数都留着的那一处**（第 750 轮，**普查当场量到的**）：规范在
  // `ArraySetLength` 里先走一步 `ToNumber`，所以 `a.length = "2"` 在 Node 里
  // **是好的**（数组截到 2），而本仓对**非数字一律抛**（判据 `p750a-a06` 的第 3 行：
  // Node 打 `ok:2`、本仓打 `throw:RangeError`）。**这一轮没有收它**，理由写在明处：
  // `ToNumber` 的对象那一档要 `ToPrimitive`，而那要 `protos`——`SetPropertySearched`
  // 的签名里没有它，`ToNumberOf` 的三处调用点（`SetProperty` / `SetPropertyFrom` /
  // 引擎那一个 rt 算子）**全都要跟着加一格**，而这是**每一次属性写入**都要过的那条路。
  // 「把 `protos` 递进来」本身不难，难的是**量清楚它有没有副作用**
  //（`SetProperty` 是整份实现里最热的一格）——所以先登记、不顺手改。
  const asked = value.AsInt();
  if (!value.IsNumber() || asked < 0 || value.AsDouble() !== value.AsDouble()
    || value.AsDouble() !== Math.floor(value.AsDouble()) || value.AsDouble() > 4294967295) {
    throw new RangeError("Invalid array length");
  }
  // **长度被锁住 ⇒ 一声不响**（第 722 轮）：`Object.defineProperty(xs, "length",
  // { writable: false })` 在**属性表里**留了一份（`array.xl.md` 的 `RequireArrayGrowable`
  // 读它、`globals.xl.md` 的描述符那一趟也读它），而这一支原来**从不问它** ⇒
  // `a.length = 5` 照样改（判据 `p722a-*`：Node 静默、本仓改）。
  // **「写没写下去」是一个布尔**（第 333 轮那条纪律）：赋值语句不看它（非严格），
  // `push` 那一档自己看（`RequireArrayGrowable` 直接抛 `TypeError`）。
  const lengthItem = table.Get(receiver.Ref);
  for (let i = 0; i < lengthItem.Props.length; i++) {
    if (!KeyMatches(table, lengthItem.Props[i], key)) continue;
    if (lengthItem.Props[i].Kind === PropertyKind.Data
      && (lengthItem.Props[i].Flags & PropertyFlagWritable) === 0) {
      return false;
    }
    break;
  }
  table.Get(receiver.Ref).AsArray().Truncate(asked);
  table.Recount(receiver.Ref);
  return true;
}
// **`length` 只有在数组上才是那一格特殊的**（第 182 轮修）：原来这里对**任何**接收者
// 都抛「只读的 length」——于是 **`{ length: 3 }` 这种字面量根本造不出来**
//（`Array.from({ length: 3 }, …)` 就卡在这一句上），而 JS 里它只是一个**普通属性**。
// 字符串的 `length` 确实是只读的，但它**不是对象**——下面那条
// 「primitive receiver」自己会挡（`"ab".length = 1` 照样抛）。
if (!receiver.IsObject()) {
  // **`null` / `undefined` 要先抛 `TypeError`**（第 772 轮，**普查当场红的**）：
  // 规范第一句是 `RequireObjectCoercible`——`u.x = 1`（`u` 是 `undefined` / `null`）
  // 在 JS 里**抛 `TypeError`**（Node 的措辞是 `Cannot set properties of undefined
  // (setting 'x')`），而**别的原始值**（数字 / 字符串 / 布尔 / 符号）才是「一声不响」。
  //
  // **本条分支原来把两档合在一句 `return false` 里**（第 750 轮收「原始值接收者」时
  // 只量了 `s.x = 1` / `"abc".length = 5` 那两档）⇒ `u.x = 1` 被**静默当成写成功**
  // （判据 `runtime/round772/r772b-01` 现场：Node 打 `throw:TypeError`、
  // 本仓打 `ok:string:wrote`）。
  //
  // **抛的是宿主 `TypeError`**：`set_prop` / `set_index` 两处都走 `Guard`，
  // 而 `Guard` 认得出这一类（`error instanceof TypeError` ⇒ `ErrorKindType`，
  // 不必在这里递类别）。**别的原始值那一档一个字都没动**。
  if (receiver.Tag === ValueTag.Undefined || receiver.Tag === ValueTag.Null) {
    const what = receiver.Tag === ValueTag.Null ? "null" : "undefined";
    throw new TypeError("cannot set properties of " + what);
  }
  // **原始值接收者：一声不响什么都没做**（第 750 轮，**普查当场红的**）——
  // 返回**假**（「没写下去」），与「不可写的属性」那一格**同一条口径**。
  //
  // **JS 的两个形状都落到这里**（Node 实测，两处都**不抛**、也都不留痕迹）：
  // ① **自有（或继承来）的属性**：`"abc".length = 5` 会去找严格模式那条路，
  //    松散模式下那一步在**装箱出来的临时对象**上失败 ⇒ 一声不响
  //    （`a = 9; return a` 读回来还是原值）；
  // ② **根本不存在的属性**：`let s = "abc"; s.x = 1` 建在**那个临时的包装对象**上、
  //    随它一起丢掉 ⇒ `s.x` 还是 `undefined`。
  // **原来这里响亮地抛**（`unimplemented: assigning a property on a primitive receiver`）
  // ⇒ **整份文件进不来**，而 `s.x = 1` 这种「探测一下」的写法遍地都是
  //（判据 `p750a-a04` 现场就是这个：Node 三行都打出来、本仓第一行就断）。
  //
  // **这一句只管「写属性」这一条路**：`"ab".length = 1` 也是从这里过（上面那一支
  // 只认数组），所以它连带把「字符串的 `length` 只读」那一档也答对了
  //（**不是**抛——JS 里那也是静默失败）。
  return false;
}
// **起点另给时走同一套分支**（`< 0` 就是「不找」 ⇒ 直接落到第 4 条）——
// 三条语义（访问器调 setter / 数据属性写到**接收者**上 / 没找到就新建）
// **一个字都不新写**，两个入口只差这一句查找。
const found = searchRef < 0 ? null : FindProperty(room, table, searchRef, key);
// **接收者自己的那一格要投一次票**（第 782 轮，**实测撞到的**）：`super.x = v` 那一趟
// 的起点是**原型**（`SetPropertyFrom`），于是 `found` 只看得见原型链上那一格——
// 而规范的三步次序是：
//   ① 从**起点**出发找访问器（找到就调它的 setter）；
//   ② **接收者自己的**那一格（`GetOwnProperty(receiver, key)`）——数据属性就**就地改值**；
//   ③ 都没有才在接收者上新建。
// 本仓原来只有 ① 与 ③ ⇒ 派生实例上**已经有** `v` 时，`super.v = w` 会**再建一格**
// 同名的自有属性（`Object.getOwnPropertyNames(e)` 给 `["v","v"]`），而读那一格先命中
// **先前那一份** ⇒ `e.v` 还是旧值（**静默错值**，第 780 轮 `r780b-03` 登记的四个落点之一）。
// **同名自有属性只能是访问器那一格**（数据属性已在上面就地改完）——
// 与前面「继承来的访问器」那一条**同一条规矩**：没有 setter 就返回假，不抛。
// **只在 `found` 不是接收者自己那一格时才查**：起点就是接收者时上面已经找过了
// （多查一次是一趟白跑，而这是**每一次属性写入**都要过的那条路）。
if (found === null || found.Owner !== receiver.Ref) {
  const own = table.Get(receiver.Ref).Props;
  for (let i = 0; i < own.length; i++) {
    if (!KeyMatches(table, own[i], key)) continue;
    // **记账格不是一个属性，赋值也看不见它**（第 890 轮）：`bound.prototype = 7`
    // 在 JS 里是**新开一格普通属性**（那一格是记账，本来就"不该存在"），
    // 不滤的话会**就地改掉记账那一份** ⇒ 用户读不到（`bound.prototype` 给 `undefined`）
    // 而 `new bound()` 拿到的原型被悄悄换成了 `7`（`instanceof` 跟着塌）。
    // 滤掉之后这一趟落空，下面的第 4 条照常新建一个自有属性。
    if ((own[i].Flags & PropertyFlagInternal) !== 0) continue;
    if (own[i].Kind === PropertyKind.Accessor) {
      if (!IsCallableValue(table, own[i].Setter)) {
        return false;
      }
      call(own[i].Setter, receiver, [value]);
      return true;
    }
    if ((own[i].Flags & PropertyFlagWritable) === 0) {
      return false;
    }
    own[i].Value = value;
    return true;
  }
}
if (found !== null) {
  const property = table.Get(found.Owner).Props[found.Index];
  if (property.Kind === PropertyKind.Accessor) {
    // **访问器没有 setter ⇒ 什么都没做**（第 333 轮）：JS 的 `[[Set]]` 在这里返回**假**，
    // 而赋值语句（非严格）**不看**它 ⇒ `o.x = 1` 一声不响。
    // 原来这里**抛** ⇒ `ex-getter-setter-class` 在 Node 里是好的、在这里报
    // `this should throw a TypeError (accessor without a setter)`（**同一句话两种结局**）。
    // **严格模式要抛**——那是另一档（本仓选定非严格，与 `this` 那一条是同一条设计决定）：
    // 谁需要「抛」谁自己看返回值（`push` 那一族，见 `SetProperty` 那一段）。
    //
    // **判据是 `IsCallableValue`、不是 `Value.IsCallable`**（第 697 轮，**实测撞到的**）：
    // 与**读**那一侧第 601 轮修的是**同一处、同一个根**——`Value.IsCallable()` 看不到
    // **宿主引用**，而语言层往内建身上挂的 setter 正是宿主引用
    //（`Object.prototype.__proto__` 那一格，第 697 轮刚装上）。
    // 拿后者判 ⇒ **继承来的宿主 setter 永远不调**，于是 `o.__proto__ = p`
    // 被静默当成「写了个不存在的名字」：链一点没变、`o.greet` 是 `undefined`
    //（判据 `exec/decorators-modifiers/051-beh-proto-accessor`）。
    // **读那一侧修了、写这一侧没修**，是因为当时那一格只装了 getter——
    // 「同一个根长在两条路上」正是本项目反复踩过的那种形状（见第 283 / 307 轮的账）。
    if (!IsCallableValue(table, property.Setter)) {
      return false;
    }
    call(property.Setter, receiver, [value]);
    return true;
  }
  // **不可写的数据属性 ⇒ 什么都没做**（同上）：判据 `object-freeze` 量的就是它
  //（`Object.freeze(o)` 之后 `o.x = 9` 在 Node 里**静默**、`o.x` 还是原值）。
  if ((property.Flags & PropertyFlagWritable) === 0) {
    return false;
  }
  if (found.Owner === receiver.Ref) {
    property.Value = value;
    return true;
  }
}
if (!room(PropertyCharge)) {
  throw new Error("out of room");
}
// **不可扩展的对象长不出新属性**（第 333 轮）：JS 的 `[[Set]]` 走到最后一步之前
// 要问一句 `[[IsExtensible]]`，答假就**返回假**（不是抛——非严格赋值不看它）。
// **少了这一问的后果是「冻结会自己消失」**（`heap.xl.md` 的 `Extensible` 那一段
// 写着现场：`Object.freeze(o); o.b = 3` 之后 `Object.isFrozen(o)` 从真变假）。
if (!table.Get(receiver.Ref).Extensible) {
  return false;
}
table.Get(receiver.Ref).Props.push(new Property(key.Ref, value));
table.Recount(receiver.Ref);
return true;
```

# method DeleteProperty:(table:HeapTable, receiver:int, key:Value)=>bool

`delete receiver[key]`。

**只删自有属性**（不沿原型链）——这是 JS 的语义：删不掉原型上的东西，
而且删掉之后对象会重新「看见」原型上那个。

不可配置的属性删不掉（严格模式下该抛 `TypeError`，见缺口 2）。
**属性本来就不存在也算成功**（返回 `true`）——`delete` 一个不存在的属性不报错。

**数组元素要单独删**（第 289 轮）：元素**不住在 `Props` 里**（在 `Elements` 上，
见 `heap.xl.md` 的 `HeapArray`），所以下面那一趟**一格都碰不到它**
⇒ `delete xs[1]` **什么都没做** 而且**返回 `true`**——**静默错值**
（判据 `rt-delete-array-element` 量的就是它：`1 in xs` 还是真、`xs[1]` 还是原值；
 而 JS 给的是「那一格变成**洞**」：`1 in xs` 假、`xs.length` **不变**）。

**下标那一格要先问 `Props`**（第 721 轮）：数组下标的**标志位**住在属性表里那一份
（`globals.xl.md` 的 `IndexKeyShadowOf` 写着账），于是
`Object.defineProperty(a, "1", { value: 9, configurable: false }); delete a[1]`
在 JS 里给 **`false`**、那一格还在——而元素那一段**无条件成功**，值当场变洞
（判据 `p721a-r10`：node 给 `false,9`、本仓给 `true,undefined`）。
**两件事一起做**：删掉属性表那一份（标志位没了）**并且**把元素那格变成洞。

判据与 `ArrayIndexAt` **共用同一个答案**（它写着「前导零不算下标」、「超出 `i32` 不算」）——
另写一份「数字键」的判据就是第二处会漂的答案。
**越界不算删掉什么**：`delete xs[9]` 在 JS 里是「本来就没有」⇒ 成功（落到下面那句 `return true`）。

```ts
const item = table.Get(receiver);
// **键有两种形态**：`xs[1]` 的键是一个**整数**（`rt.xl.md` 的 `ArrayIndexAt` 只认字符串），
// 而 `xs[i]` 里 `i` 是数字时同样落成一个数字键——所以两档都要认。
// **浮点不算下标**（`xs[1.5]` 是属性）；**负下标不算**（JS 里那是属性）。
let elementAt = -1;
if (item.Tag === ValueTag.Array) {
  if (key.Tag === ValueTag.Int32) {
    elementAt = key.Int;
  } else {
    elementAt = ArrayIndexAt(table, key);
  }
  // **数组的 `length` 删不掉**（第 722 轮）：它是**不可配置**的一格
  //（`delete [1, 2].length` 在 JS 里给 `false`）——而它**不住在属性表里**，
  // 所以下面那两趟都扫不到它，原来会落到最后那句 `return true`（**静默错值**）。
  // 判据与「写长度」那一支**共用 `IsLengthKey`**（那一格的唯一答案）。
  if (IsLengthKey(table, key)) return false;
}
// **属性表那一摞先看**（下标那一份也在这里）：不可配置 ⇒ 给 `false`、那一格留着。
for (let i = 0; i < item.Props.length; i++) {
  if (!KeyMatches(table, item.Props[i], key)) continue;
  if ((item.Props[i].Flags & PropertyFlagConfigurable) === 0) {
    // **第 347 轮：不可配置 ⇒ 给 `false`，不抛**（**实测撞到的**）：
    // `delete o.fixed`（`fixed` 是不可配置的）在**非严格**模式里**返回 `false`**、
    // **不抛**——而这一支原来抛「unimplemented: this should throw a TypeError」。
    // **那句注释记的是严格模式**（`'use strict'` 下确实该抛），
    // 而本仓的口径是**非严格**（第 333 轮写屏障 / 第 337 轮 `this` 两处都按这条定的）——
    // `delete` 这一处当时没跟上（判据 `c304-rt-delete-nonconfigurable`：
    // Node 给 `false 1`、本仓抛）。
    // **给 `false` 是 JS 的语义**，不是「差不多」：`Boolean(delete o.fixed)` 与
    // `"fixed" in o` 两条判据都钉着它。
    return false;
  }
  item.Props = RemoveAt(item.Props, i);
  // **下标那一格：元素区那一摞一起删**（第 721 轮）——只删属性表那一份的话，
  // `a[1]` 照样读得到值（`IndexKeyShadowOf` 没了、元素区还在）。
  if (item.Tag === ValueTag.Array && elementAt >= 0 && elementAt < item.AsArray().GetLength()) {
    item.AsArray().SetHole(elementAt);
  }
  table.Recount(receiver);
  return true;
}
if (item.Tag === ValueTag.Array && elementAt >= 0 && elementAt < item.AsArray().GetLength()) {
  item.AsArray().SetHole(elementAt);
  table.Recount(receiver);
  return true;
}
return true;
```

# method RemoveAt:(items:Array<Property>, index:int)=>Array<Property>

去掉第 `index` 格，返回新数组。

**新建数组而不是原地 `splice`**：原地删要挪后面所有格，而返回新数组更直白——
属性表本来就是小数组，这一层不是瓶颈（真要快是内联缓存的事）。

```ts
const result: Property[] = [];
for (let i = 0; i < items.length; i++) {
  if (i !== index) result.push(items[i]);
}
return result;
```

# method TypeOfName:(table:HeapTable, value:Value)=>string

JS 的 `typeof`。

**它不是 `Value.TagName`**（`value.xl.md` 里那条已经写明）：`Array` 与 `HostRef` 都报
`"object"`，闭包与内建函数都报 `"function"`，符号报 `"symbol"`，而 JS 的 `null` 报
`"object"`（历史包袱，照报）。

**为什么签名里有表**（第 145 轮）：**带可调用载荷的对象**要报 `"function"`
（JS 里 `typeof String` 就是 `"function"`，而本仓的 `String` 是**对象**）——
光看标签分不出「普通对象」与「可调用对象」，所以要读堆。
**这与 `rt.xl.md` 的 `TypeUnitsOf` 是同一件事的两个出口**（那边给码元、
这边给宿主字符串），两处必须同一条规则。

```ts
if (value.Tag === ValueTag.Undefined) return "undefined";
if (value.Tag === ValueTag.Null) return "object";
if (value.Tag === ValueTag.Bool) return "boolean";
if (value.Tag === ValueTag.Int32 || value.Tag === ValueTag.Float64) return "number";
if (value.Tag === ValueTag.String) return "string";
if (value.Tag === ValueTag.Symbol) return "symbol";
if (value.Tag === ValueTag.Function || value.Tag === ValueTag.Closure) return "function";
// **宿主引用也是函数**（第 150 轮，与 `rt.xl.md` 的 `TypeUnitsOf` **同一条口径**：
// 两处都是 `typeof` 的出口，一处改了另一处不改就是「同一个值两个名字」）。
//
// **那两个原型对象不在这里判**（第 228 轮）：要让 `typeof Function.prototype` 给
// `"function"` 就得知道 `protos`，而这一格的签名里**没有它**——
// 与其为一个只有 `typeof` 用得上的判据去改一个**没人调用**的函数的签名，
// 不如把那一档放在**真的那个出口**上（`rt.xl.md` 的 `RtTypeOf`，
// 它从 `vm.xl.md` 拿得到 `Protos`）。这里留一条注释，免得下一个人以为它漏了。
if (value.Tag === ValueTag.HostRef) return "function";
if (value.Tag === ValueTag.Object && table.Get(value.Ref).Host !== null) return "function";
return "object";
```

# method ArrayIndexAt:(table:HeapTable, key:Value)=>int

**字符串键 → 数组下标**；**不是下标就给 `-1`**（空串 / 有非数字 / 前导零 / 太大 / 根本不是字符串）。

**为什么要有它**：数组的元素**不在 `Props` 里**（它们住在 `Elements`），
所以「`1 in [10, 20]`」走属性表会给出**假**——而 JS 给**真**。
**前导零不算下标**（JS 的口径：`"01"` 是一个普通属性名，不是第 1 格）；
**超出 `i32` 的也不可能是这一层的下标**（返回 -1，让它走属性那条路）。

```ts
if (key.Tag !== ValueTag.String) return -1;
const units = table.Get(key.Ref).AsString().Units;
if (units.length === 0) return -1;
if (units.length > 1 && units[0] === 48) return -1;
let index = 0;
for (let i = 0; i < units.length; i++) {
  const unit = units[i];
  if (unit < 48 || unit > 57) return -1;
  index = index * 10 + (unit - 48);
  if (index > 2147483647) return -1;
}
return index;
```

# method IndexAccessorAt:(table:HeapTable, receiver:Value, index:int)=>bool

**这个数组下标位上装的是一格访问器吗**（第 746 轮）——给 `vm.xl.md` 的 `RtOp.GetIndex`
问「这一读要不要改走 `GetProperty`」。

**为什么必须有它**：数组的元素住在**独立的一段**里，而访问器只能住在属性表里。
装访问器那一处（本文件的 `DefineAccessor` 与 `globals.xl.md` 的 `DefineOwnFromDescriptor`）
**把那一格摘成洞**（否则「元素区还有值 + 属性表有访问器」会让访问器**永远读不到**），
于是「先看元素区」那条快路径会**读到一个洞 ⇒ `undefined`**——
`const a = [1, 2, 3]; Object.defineProperty(a, 1, { get: () => 99 })` 的 `a[1]`
在 JS 里是 `99`，本仓原来是 `2`（**静默错值**），摘洞之后是 `undefined`（**还是错**）。

**判据只答「是不是访问器」**，不答值：调用方拿到真就走 `GetProperty`
（那一条会调 getter、`this` 是接收者、也会沿原型链），拿到假就走 `GetIndex` 那条快路径。

**两种键形态都要问**：`a[1]` 在投影里给的是**整数**键、`a["1"]` 给的是**字符串**键，
而 `KeyMatches` 对 `Int32` 只有「十进制整数文本」那一档——只问一个就是「换个写法就错」。

**只扫自有那一摞**（下标那一份一定是自有的）：`FindProperty` 会顺原型链走，
而这是热路径——多走两层表是白花的。

```ts
if (receiver.Tag !== ValueTag.Array) return false;
const item = table.Get(receiver.Ref);
for (let i = 0; i < item.Props.length; i++) {
  const entry = item.Props[i];
  if (entry.Kind !== PropertyKind.Accessor) continue;
  if (KeyMatches(table, entry, Value.FromInt(index))) return true;
}
return false;
```

# method GetIndex:(table:HeapTable, receiver:Value, index:Value)=>Value

`receiver[index]` 的**快路径**：数组给元素，字符串给**一个码元的字符串**。

**越界给 `undefined`，不是错误**；洞也给 `undefined`（`heap.xl.md` 的 `GetAt` 已经这样答）。

**这一支不认访问器**（它没有 `protos` / 调用通道）：下标上的访问器由**调用方**
（`vm.xl.md` 的 `RtOp.GetIndex`，那一层手上两样都有）**先问一句 `IndexAccessorAt`**
再决定走这里还是走 `GetProperty`——第 746 轮的账写在 `IndexAccessorAt` 那一段。

```ts
if (receiver.Tag === ValueTag.Array) {
  if (!index.IsNumber()) {
    throw new Error("unimplemented: non-numeric index needs ToString");
  }
  return table.Get(receiver.Ref).AsArray().GetAt(index.AsInt());
}
if (receiver.Tag === ValueTag.String) {
  if (!index.IsNumber()) {
    throw new Error("unimplemented: non-numeric index needs ToString");
  }
  const units = table.Get(receiver.Ref).AsString().Units;
  const at = index.AsInt();
  if (at < 0 || at >= units.length) return Value.Undefined();
  return Value.FromString(table.CreateString([units[at]]));
}
throw new Error("unimplemented: indexed access on a non-array receiver");
```

# method SetIndex:(room:RoomChecker, table:HeapTable, receiver:Value, index:Value, value:Value)=>Value

`receiver[index] = value` 的**快路径**：数组写元素（下标超长时补洞，`heap.xl.md` 的
`SetAt` 已经这样答）。

**下标那一格的标志位住在 `Props` 里那一份**（第 721 轮，见 `globals.xl.md` 的
`IndexKeyShadowOf`）：`Object.defineProperty(a, "1", { writable: false })` 之后
`a[1] = 42` 在 JS 里**静默无效**——而这条快路径原来**从不问属性表**，值照写
（判据 `p721a-r09`：node 给 `9`、本仓给 `42`）。

**可写那一档要把值同步进属性表那一份**：两摞都存着值（元素区是 `a[i]` 那条路的事实来源、
属性表那一份是描述符那条路的事实来源），不同步就是「读出来一个值、
`Object.getOwnPropertyDescriptor` 另一个值」——两处会漂的答案。

**访问器那一档仍然不管**（记在台账里）：这一格没有调用通道
（`ReadProperty` / `SetProperty` 要一个 `NativeCall`，而这条 op 的签名里没有），
所以「下标上的 getter / setter 真的被调」是另一件事（见
`tests/cases/README.md` 第 721 轮那一段）。这里**不假装调过**，也不额外抛——
保持原来的写法，差别写在明处。

```ts
if (receiver.Tag === ValueTag.Array) {
  if (!index.IsNumber()) {
    throw new Error("unimplemented: non-numeric index needs ToString");
  }
  const at = index.AsInt();
  if (at < 0) throw new Error("unimplemented: negative index needs ToString");
  const slotItem = table.Get(receiver.Ref);
  // **只扫自有那一摞**（下标那一份一定是自有的）：`FindProperty` 会顺原型链走，
  // 而这条路是 `a[i] = v` 的热路径——多走两层表是白花的。
  // **只有非负整数键才比**（`KeyMatches` 对 `Int32` 有「十进制整数文本」那一档；
  // 浮点键在 JS 里是普通属性名，落不到下标那一支）。
  const slotArray = slotItem.AsArray();
  // **那一格「在不在」**（第 723 轮）：`Object.freeze` / `seal` / `preventExtensions`
  // 之后**加新下标**在 JS 里**静默不动**（判据 `p723a-r04`）——原来这一支照写，
  // `const a = [1]; Object.freeze(a); a[1] = 2` 会给 `[1, 2]`（**静默错值**）。
  // **在的那一格照旧可以写**（`preventExtensions` 只挡新的）——所以判据是
  // 「元素区有没有这一格**或**属性表里有没有这一份」，不是「可不可扩展」。
  let slotKnown = at >= 0 && at < slotArray.GetLength() && !slotArray.IsHole(at);
  if (index.Tag === ValueTag.Int32 && slotItem.Props.length > 0) {
    for (let i = 0; i < slotItem.Props.length; i++) {
      if (!KeyMatches(table, slotItem.Props[i], index)) continue;
      slotKnown = true;
      const slot = slotItem.Props[i];
      if (slot.Kind === PropertyKind.Accessor) break;
      // **不可写 ⇒ 一声不响什么都没做**（非严格赋值的口径，与 `SetPropertySearched`
      // 那一句一字不差）；**可写 ⇒ 值两摞一起写**。
      if ((slot.Flags & PropertyFlagWritable) === 0) return value;
      slot.Value = value;
      break;
    }
  }
  if (!slotKnown && !slotItem.Extensible) return value;
  table.Get(receiver.Ref).AsArray().SetAt(at, value);
  table.Recount(receiver.Ref);
  return value;
}
throw new Error("unimplemented: indexed assignment on a non-array receiver");
```

# method SetHiddenProperty:(room:RoomChecker, table:HeapTable, receiver:Value, key:Value, value:Value, flags:int = -1)=>void

**写一格「不可枚举」的自有属性**（第 194 轮）——装库层的内部件与方法用它。

**为什么需要它**：JS 里 `Object.keys(new Map())` 是 `[]`、
`JSON.stringify(new Map())` 是 `{}`——那些东西（内部格 `__k` / `__v` 与那些方法）
**不是「可枚举的自有属性」**。本仓原来把它们全写成普通属性，
于是 `Object.keys` 给 12、JSON 也跟着漏出去——**静默错值**
（普查里 `map-internal-slots` 那条就是这么红的）。

**与 `SetProperty` 的差别只有标志位**：找到自有那一格就改值 + 改标志、
没有就新开一格；**不看数组的 `length`、不调 setter**
（装库层写的都是数据属性，走那条通用路只会多绕一圈）。

**`flags` 是给「不可写」那一档留的口子**（第 605 轮）：缺省 `-1` 表示老口径
（**可写 + 可配置**，第 194 轮起就是它），调用方给具体标志位时按给的来。
今天只有一处给——类的 `prototype` 那一格（`AttachPrototype`）：
JS 里类的那一格是 `{ writable: false, enumerable: false, configurable: false }`，
而普通函数的 `prototype`（以及这里别的内部件）是**可写**的
（规范里 `MakeConstructor` 那两个分支）。**不可写这一位要有意义**，
得 `SetProperty` 那一侧也照它拦住——那里确实拦（不可写的数据属性赋值**静默无效**，
判据 `object-freeze` 一直量着它）。

```ts
if (!receiver.IsObject()) {
  throw new Error("unimplemented: hidden property on a primitive receiver");
}
// **缺省标志位**（见上面那一格）：不给 `flags` 就是第 194 轮起那条口径。
const wanted = flags < 0 ? PropertyFlagWritable + PropertyFlagConfigurable : flags;
// **这一处是引擎自己写**（第 890 轮）：查找要**带上记账格**（`includeInternal`）——
// 不然给同一格写第二次时找不到旧的，会新开一格同名的记账格
//（`SetHiddenProperty` 的语义是「写这一格」，不是「按用户口径找这一格」）。
const hiddenFound = FindProperty(room, table, receiver.Ref, key, true);
if (hiddenFound !== null && hiddenFound.Owner === receiver.Ref) {
  const hiddenProperty = table.Get(hiddenFound.Owner).Props[hiddenFound.Index];
  if (hiddenProperty.Kind !== PropertyKind.Accessor) {
    hiddenProperty.Value = value;
    // **不可枚举**：JS 里这些内部件不是属性——
    // 这里用「自有 + 不可枚举」近似它，改值 / 删除照旧成立（类那一格例外）。
    hiddenProperty.Flags = wanted;
    return;
  }
}
if (!room(PropertyCharge)) throw new Error("out of room");
const hiddenCreated = new Property(key.Ref, value);
hiddenCreated.Flags = wanted;
table.Get(receiver.Ref).Props.push(hiddenCreated);
table.Recount(receiver.Ref);
```

# method CreateDataProperty:(room:RoomChecker, table:HeapTable, receiver:Value, key:Value, value:Value)=>void

**`CreateDataProperty`**（第 697 轮）——「**造/改一格自有的、可写、可枚举、可配置的数据属性**」。

**它与 `SetProperty` 的差别不是「省一步」，是两条不同的规矩**（第 697 轮**实测撞到的**）：
`[[Set]]` 会**沿原型链找访问器并调它的 setter**。于是：

- `JSON.parse('{"__proto__": {…}}')` 会去**改那个新对象的原型**——而 JS 的口径是
  **造一格叫 `__proto__` 的普通自有属性**（判据 `stdlib/json/044-json-parse-proto-key`
  一直量着它，**它原来只是碰巧过**：那一轮那一格 setter 还是个宿主引用、
  被 `Value.IsCallable()` 挡在门外 ⇒ 静默变成「新建一格」，正好是 JS 的答案）；
- 装库期那一档更响：`SetProperty(…, NeverCall, …)` 一旦真去调 setter，
  抛的是 `unreachable: installing a builtin never calls a function`（**整份文件进不来**）。

所以「**按数据造对象**」的地方（`JSON.parse` / `reviver` / `Object.fromEntries` 那一族）
一律走这一格，`[[Set]]` 那一格留给**赋值语句**。

**实现**：**只找自有那一格**（原型链上一概不算——这正是它与 `[[Set]]` 的分界）：

- 自有 + 数据属性 → 改值、标志位一律置回三个全开；
- 自有 + 访问器 → **原地**换成数据属性（位置不变——`Object.keys` 的次序是语义）；
  **不可配置的换不动**，JS 在那里抛 `TypeError`，这里也抛（静默跳过就是错值）；
- 没有自有那一格 → 新开一格（三个标志全开）。

**不看 `Extensible`**：这一格的两个调用点（JSON 解析 / 对象字面量）面对的都是**刚造出来的
对象**，它一定可扩展；真要对不可扩展的对象用它，得先把那一问补上（写在明处）。

```ts
if (!receiver.IsObject()) {
  throw new Error("unimplemented: create_data_property on a primitive receiver");
}
const found = FindProperty(room, table, receiver.Ref, key);
if (found !== null && found.Owner === receiver.Ref) {
  const property = table.Get(found.Owner).Props[found.Index];
  if (property.Kind !== PropertyKind.Accessor) {
    property.Value = value;
    property.Flags = PropertyFlagsAll;
    table.Recount(receiver.Ref);
    return;
  }
  if ((property.Flags & PropertyFlagConfigurable) === 0) {
    throw new TypeError("cannot redefine a non-configurable accessor as a data property");
  }
  property.Kind = PropertyKind.Data;
  property.Value = value;
  property.Getter = Value.Undefined();
  property.Setter = Value.Undefined();
  property.Flags = PropertyFlagsAll;
  table.Recount(receiver.Ref);
  return;
}
if (!room(PropertyCharge)) throw new Error("out of room");
const created = new Property(key.Ref, value);
created.Flags = PropertyFlagsAll;
table.Get(receiver.Ref).Props.push(created);
table.Recount(receiver.Ref);
```

# method NewPlainObject:(room:RoomChecker, table:HeapTable, protos:Protos)=>Value

造一个普通对象：**原型取 `Protos.Object`**。

这与 `heap.xl.md` 的 `CreateObject` 有区别：后者给的是**没有原型**——那是引擎内部对象
（帧 / 环境）该有的样子，脚本能看见的对象不该那样。

```ts
if (!room(ObjectCharge)) {
  throw new Error("out of room");
}
const handle = table.CreateObject();
table.Get(handle).Proto = protos.Object;
return Value.FromObject(handle);
```

# method NewPlainArray:(room:RoomChecker, table:HeapTable, protos:Protos)=>Value

造一个数组：原型取 `Protos.Array`。

```ts
if (!room(ObjectCharge)) {
  throw new Error("out of room");
}
const handle = table.CreateArray();
table.Get(handle).Proto = protos.Array;
return Value.FromArray(handle);
```

# method DefineAccessor:(room:RoomChecker, table:HeapTable, receiver:Value, key:Value, getter:Value, setter:Value, enumerable:bool = true)=>bool

**把一处自有属性变成访问器**（第 98 轮补）——`{ get x() { … } }` 与类里 `get x()` 那类写法的落点。

**为什么它必须在这里**：引擎**早就读得懂**访问器（`ReadProperty` 遇到 `PropertyKind.Accessor`
就调它的 getter、`SetProperty` 调 setter），但在此之前**没有任何办法造出一个**——
`heap.xl.md` 的 `Property.Accessor` 工厂存在，却没人能把它放进对象的属性表里。
「**读得懂、造不出**」是最容易在**合成判据**里露出来的一种缺口（第 95 轮就是这么露的）。

**v1 的最小形状**（不是 `Object.defineProperty` 的全集）：

- **只处理自有属性**：找不到就**新建一格**（新属性三标志全开，与普通赋值一致，
  **除了 `enumerable` 由第七个参数说了算**——第 340 轮补：类里的访问器不可枚举）；
- **找到的是访问器**（或可配置的数据属性）→ **原地替换**那一格的 `Kind`/`Getter`/`Setter`；
  **不可配置的要抛**（严格模式该抛 `TypeError`，见本文件文首的缺口清单）；
- `setter` 传 `undefined` 就是**只读访问器**——读它没问题，写它会走到 `SetProperty`
  那条「访问器没有 setter」的分支上抛。

**第七格 `enumerable` 是第 340 轮补的**（**实测撞到的**）：对象字面量那一档要真、
**类那一档要假**（JS 里 `class A { get g() {} }` 的 `g` **不进 `for..in`**）——
两档共用这一处，所以由调用方说（缺省真 = 老行为一字不改）。
**替换那一支也要跟着改标志**：同一个键先有数据属性、后来被 `get` 接手时，
标志位留在原来那一格上 ⇒ 不改的话「类里同名的字段 + 访问器」还是会漏出去。

```ts
if (!receiver.IsObject()) {
  throw new Error("unimplemented: defining an accessor on a primitive receiver");
}
// **数组下标那一格：先把元素那一段摘掉**（第 746 轮）。
//
// 数组的元素住在**独立的一段**里（`HeapArray.Elements`），而访问器只能住在属性表里
//（`Property.Kind = Accessor`）。**读下标那一趟先看元素区**（下面 `ReadProperty` 那一段的
// `IndexKeyShadowOf` 与元素区那一摞）——于是「元素区还有值 + 属性表新装了一格访问器」
// 等于**访问器永远读不到**：
//   `const a = [1, 2, 3]; Object.defineProperty(a, 1, { get: () => 99 })`
//   在 JS 里 `a[1]` 是 `99`、`a` 是 `[1, 99, 3]`、`Object.keys(a)` 是 `["0","1","2"]`；
//   本仓原来给 `2` / `[1,2,3]` / `["0","2"]`——**静默错值**，而且第 721 轮那一族
//   （下标上的访问器读 / 写 / 展开）量到的正是同一条根，只是没人在这一支上问过
//  （判据 `stdlib/round746/p746b-b01`）。
//
// **摘成洞而不是删掉**：`delete` 不缩数组，而 `defineProperty` 更不缩——
// `a.length` 还是 3，那两格变成洞（JS 里它们成了**访问器格**，不在元素区里）。
// **越界那一档要先把数组撑到那么长**（`Object.defineProperty([], 2, { get })` 在 JS 里
// 让 `length` 变成 3）——`Truncate` 就是「把长度改成这么多」，变长时新增的格子全是洞。
// **键有两种形态**（与 `DeleteProperty` 那一支一字不差）：`a[1]` 的键是整数、
// `a["1"]` 的键是字符串（`ArrayIndexAt` 只认字符串）。
const accessorItem = table.Get(receiver.Ref);
let accessorAt = -1;
if (accessorItem.Tag === ValueTag.Array) {
  accessorAt = key.Tag === ValueTag.Int32 ? key.Int : ArrayIndexAt(table, key);
  if (accessorAt >= 0) {
    const elements = accessorItem.AsArray();
    if (accessorAt >= elements.GetLength()) {
      if (!room(ValueCharge * (accessorAt + 1 - elements.GetLength()))) {
        throw new Error("out of room");
      }
      elements.Truncate(accessorAt + 1);
    } else {
      elements.SetHole(accessorAt);
    }
  }
}
for (let i = 0; i < table.Get(receiver.Ref).Props.length; i++) {
  if (!KeyMatches(table, table.Get(receiver.Ref).Props[i], key)) continue;
  if ((table.Get(receiver.Ref).Props[i].Flags & PropertyFlagConfigurable) === 0) {
    throw new Error("unimplemented: this should throw a TypeError (non-configurable property)");
  }
  const replaced = table.Get(receiver.Ref).Props[i];
  replaced.Kind = PropertyKind.Accessor;
  // **第 340 轮：可枚举那一格也跟着改**（理由见上面那一段）。
  if (enumerable) {
    replaced.Flags = replaced.Flags | PropertyFlagEnumerable;
  } else {
    replaced.Flags = replaced.Flags & (0 - 1 - PropertyFlagEnumerable);
  }
  // **只改提供了的那一半**（与 JS 的描述符语义一致：描述符里没出现的字段不动）。
  // 少了这一条，`{ get x() {} set x(v) {} }` 的**第二次**调用（`getter` 传 `Value.Undefined`）
  // 会把刚装上的 getter 抹成 `undefined`——读它报的是「accessor without a getter」，
  // **离现场很远**（第 102 轮实测：合成判据里一个成对的访问器就炸了）。
  // **只在这一支里判**：新建那一支（下面）照旧把缺的一半留成 `undefined`——
  // 那正是「只读 / 只写访问器」该有的样子。
  if (getter.Tag !== ValueTag.Undefined) replaced.Getter = getter;
  if (setter.Tag !== ValueTag.Undefined) replaced.Setter = setter;
  table.Recount(receiver.Ref);
  return true;
}
if (!room(PropertyCharge)) {
  throw new Error("out of room");
}
// **新建那一支：标志位按调用方说的来**（第 340 轮）——`Property.Accessor` 造出来是
// **三标志全开**，所以「不可枚举」要在这一支里**补摘一下**（返回之后没人再看它）。
const created = Property.Accessor(key.Ref, getter, setter);
if (!enumerable) {
  created.Flags = created.Flags & (0 - 1 - PropertyFlagEnumerable);
}
table.Get(receiver.Ref).Props.push(created);
table.Recount(receiver.Ref);
return true;
```
