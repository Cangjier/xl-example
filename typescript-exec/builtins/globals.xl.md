# dependencies
```xl
import { Value, ValueTag } from "../../runtime/value.xl.md"
import { HeapTable, ObjectCharge, ValueCharge, CodeUnitCharge, PropertyKind, HoleCharge, Property, PropertyCharge, PropertyFlagEnumerable, PropertyFlagWritable, PropertyFlagConfigurable } from "../../runtime/heap.xl.md"
import { RoomChecker, RtToBoolean, MakeNumber, RtChainHas, RtSetProto, ToNumberOf, ToPrimitiveOf, ToPrimitiveDefault, ToPrimitiveString, IsCallableValue, SameValue } from "../../runtime/rt.xl.md"
import { HostUnitsText, NumberFromHostText, NumberToHostText } from "../../runtime/host-text.xl.md"
import { SetProperty, SetHiddenProperty, GetProperty, NativeCall, CallFailed, Protos, NewPlainObject, NewPlainArray, FindProperty, KeyMatches, NeverRoom, DeleteProperty } from "../../runtime/props.xl.md"
import { Vm } from "../../runtime/vm.xl.md"
import { Units, NeverCall, ArgOr, ArrayIsArray, ArrayFrom, ArrayOf, ArrayValues } from "./array.xl.md"
import { StringFromCharCode, StringFromCodePoint } from "./string.xl.md"
import { JsTextUnits, NumberToJsText, ValueUnits, ValueText, ToStringOfObject, BoxKey, UnwrapBox } from "./text.xl.md"
import { InspectText, DateMarker } from "./inspect.xl.md"
import { MapCtor, MapGroupBy, NameValue, ReadOwn } from "./map.xl.md"
import { SetCtor } from "./set.xl.md"
import { BuildPromise, PromiseQueueMicrotask } from "./promise.xl.md"
```

# namespace cangjie

**全局名：`Math` 与 `console`**。

**它们与原型方法不是一回事**：原型方法是「**值**身上找得到的属性」，全局名是
「**模块作用域里声明过的名字**」。所以它们不能靠原型链，只能像普通变量一样**被声明**——
而值从哪来：宿主把「环境对象」当**入口函数的第 0 个参数**交给模块
（`lowering.xl.md` 的 `BindGlobals` 逐个取出来）。

**名字的名单在这一层**（`GlobalNames`），不在降级器里：`Math` / `console` /
`JSON` 是**这门语言**的建库决定；降级器只认识「有一批全局名」。

**打印不能由标准库自己决定去哪**：`console.log` 把文本交给**宿主给的回调**
（`LogSink`）——宿主可以打到自己的日志、收到数组里、或者丢掉。
**标准库不假定自己连着 stdout**（那会让「确定性」这一层安全要求漏一个洞）。

# type LogSink = (text:string)=>void

**一行日志去哪**：宿主说了算。

**粒度是「一次 `console.log` = 一次调用」**（第 119 轮改的口径）：实参已经按 JS 的规矩
用**空格**接成一行交进来，**不带行尾**（换行由宿主补——库不替宿主决定输出形态）。

**为什么粒度要定在「行」上**：原来是「一个实参调一次 sink」，那样宿主**再也拼不回行** ✗——
`console.log('a', 1)` 与 `console.log('a'); console.log(1)` 在它眼里**一模一样**；
而「把 `.ts` 直接跑起来」的命令行拿 stdout 与 `node` 逐字节对拍时，这个区别就是全部 ✗。

# const MathFloor:int = 201

`Math.floor` 的能力号（全局段从 200 起，与数组 1..99、字符串 100..199 分开）。

# const MathAbs:int = 202

# const MathMax:int = 203

# const MathMin:int = 204

# const MathRound:int = 205

`Math.round` / `ceil` / `trunc` / `sign`（第 120 轮补）。

**这一批的共同点：结果是整数** ✓——所以它们能安全地落进 `MathResult`（整的给 Int32 ✓）。

# const MathSqrt:int = 211

`Math.sqrt`（第 124 轮补）。

**第 120 轮时它被挡在门外** ✓：结果多数是**非整数** ✗，而 `Float64` 当时**没有文本形态** ✗
——「算得出、打不出」是给人挖坑 ✗。**第 124 轮把文本形态做了** ✓
（`text.xl.md`：最短往返十进制 ✓），于是它与 `pow` 一起放行 ✓。

# const MathPow:int = 212

`Math.pow(x, y)`——**两个实参** ✓（与 `max` / `min` 同一形状 ✓）。

# const MathCeil:int = 206

# const MathTrunc:int = 207

# const MathSign:int = 208

# const MathLog:int = 213

`Math.log` / `exp` / `cbrt` / `hypot`（第 206 轮补 ✓）。

**它们与 `sqrt` / `pow` 是同一档** ✓：结果多数是**非整数** ✓，所以当年和 `sqrt` 一起
被挡在门外（「算得出、打不出」✗）——第 124 轮把浮点的文本形态做出来之后才谈得上放行 ✓。
这一批拖着的判据是 `math-logs-constants` ✓（`Math.log(1)` / `exp(0)` 这些）✓。

# const MathExp:int = 214

# const MathCbrt:int = 215

# const MathHypot:int = 216

**第 275 轮补的十格** ✓（号**开一段新的**：`350..359` ✗）。

**为什么不接着 201..219 往下排** ✗：那一段的下一个号是 **`220`** ✓，
而它已经是 **`StringCtor`** 了 ✓（构造器那一族占着 `220..225` ✓）——
**号是跨目标的契约** ✓（见 `ArrayAt` 那一段的教训 ✓），所以不能挤 ✗。
`350..359` 这一段是**空的** ✓（`330..345` 是原始值原型那一族 ✓，`346..349` 没人用 ✓），
放在这里读起来也顺 ✓：**「第 275 轮补的第二批 Math」** ✓。

**这一批的共同点与 `201..216` 那一段不同** ✗：那一段里 **多数结果是整数** ✓
（`floor` / `round` / `ceil` / `trunc` / `sign` ✓），所以能落在「整的给 `Int32`」那条口径上 ✓；
而这十格**结果几乎全是浮点** ✓（`imul` / `clz32` 除外 ✓）——
它们能放行靠的是**第 124 轮那条浮点文本形态** ✓（「算得出、打不出」的坑那时才填上 ✓）。

**这十格全是第 273 轮普查量到的** ✓：判据 `math-imul-clz32` 与 `math-hypot-and-roots`
两条在报 `cannot call a non-closure value` ✓——也就是**那一格根本没装** ✗。

# const MathImul:int = 350

**`Math.imul(a, b)`**（第 275 轮 ✓）——**32 位有符号整数乘法** ✓。
**它不是 `a * b`** ✗：`Math.imul(0xffffffff, 5)` 是 `-5` ✓（乘的是**低 32 位** ✓），
而 `a * b` 给 `21474836475` ✓——**这是两种不同的语义** ✗，
所以这一格**不能**用宿主那个 `imul` 之外的任何写法顶替 ✓。

# const MathClz32:int = 351

**`Math.clz32(x)`**（第 275 轮 ✓）——**前导零个数** ✓（32 位无符号 ✓）。
**`Math.clz32(0)` 是 `32`** ✓（全都零 ✓），而 `Math.clz32(1)` 是 `31` ✓。

# const MathFround:int = 352

**`Math.fround(x)`**（第 275 轮 ✓）——**最近的那个 f32** ✓。
**它是本仓唯一一处 f32** ✓：`0.1` 走一趟回来是 `0.10000000149011612` ✓——
所以这一格**不能**照着「原样交出去」写 ✓（那样 `Math.fround(0.1)` 会**静默**给 `0.1` ✗）。

# const MathExpm1:int = 353

# const MathSinh:int = 354

# const MathCosh:int = 355

# const MathTanh:int = 356

# const MathLog2:int = 357

# const MathLog10:int = 358

# const MathLog1p:int = 359

**`expm1` / `sinh` / `cosh` / `tanh` / `log2` / `log10` / `log1p`**（第 275 轮 ✓）——
**七个单实参的数学函数** ✓，与 `log` / `exp` / `cbrt` 同一档 ✓：
结果多为非整数 ✓，交给宿主那一格 ✓、走 `MathResult` ✓。

**它们为什么值得单独列出来** ✗：每一个都有一处「**照着近义函数写就会错**」的地方 ✓——
`log2(8)` 是 `3` ✓（不是 `log(8) / log(2)` 那种自己算的近似 ✓，
判据里 `Math.log2(8)` 与 `3` 是**逐字节**比的 ✓）；`expm1(0)` 是 `0` ✓
（不是 `exp(0) - 1` ✓——那个在**很小的入参**上会丢掉全部有效位 ✓）；
`log1p(0)` 同理 ✓。**所以七格一律交给宿主那一格** ✓（一个一个转调 ✓），
**不自己用别的函数凑** ✗。

# const MathSin:int = 360

# const MathCos:int = 361

# const MathTan:int = 362

# const MathAsin:int = 363

# const MathAcos:int = 364

# const MathAtan:int = 365

# const MathAtan2:int = 366

**三角七格**（第 288 轮 ✓）——号开在 `360..366` ✓（`350..359` 第 275 轮已用 ✓）。

**为什么它们拖到第 288 轮才被量到** ✗：这一族**不在**第 273 轮那份普查的候选里 ✓
（那份普查按「已经想到的形状」铺 ✓），而第 287 轮的加宽把 `Math.sin` / `Math.cos` / `Math.tan`
写进了一条用例 ✓ ⇒ 它当场报 `cannot call a non-closure value` ✓（**七格一格都没装** ✗）。

**七个都交给宿主那一格** ✓（`Math.sin` … `Math.atan2` ✓）——与第 275 轮那十格同一条纪律 ✗：
`asin` / `acos` / `atan` **不是**「用别的函数凑出来的」✓（凑出来的在边界上会差最后一位 ✓，
而判据是**逐字节**比 ✓）。`atan2(y, x)` 是**两个实参**那一档 ✓（与 `pow` / `imul` 同形 ✓）。

**`Math.sin` 这一族是「每天都在用」的那一档** ✓（角度换算、波形、几何 ✓），
而它们的缺席是**响亮地抛** ✓——比第 287 轮那七条静默错值好查得多 ✓。

# const NumberIsSafeInteger:int = 325

**`Number.isSafeInteger(x)`**（第 288 轮 ✓）——号在 `320..324` 之后的**下一个** ✓。

**它与 `isInteger` 只差一个边界** ✗：`2**53 - 1` 是 `true` ✓、`2**53` 是 **`false`** ✓
（`isInteger(2**53)` 给 `true` ✓——那是**整数** ✓，只是**不安全** ✓）。
**所以判据是两句** ✓：「是整数」✓ **且** `|x| <= 2^53 - 1` ✓——
`isInteger` 那一段的那一句**照用** ✓（不另写一份 ✗：第二份迟早与第一份走偏 ✓）。

# const ObjectGetOwnPropertySymbols:int = 417

**`Object.getOwnPropertySymbols(o)`**（第 288 轮 ✓）——号在 `411..416` 之后的**下一个** ✓。
**它是 `Object.getOwnPropertyNames` 的**镜像** ✓**：同一趟扫描 ✓、
同一处「内部标记不算自有属性」的过滤 ✓，**只把「键是不是字符串」翻成「键是不是符号」** ✓
（属性表里符号键那一格是 `ValueTag.Symbol` ✓，见 `props.xl.md` 的 `SamePropertyKey` ✓）。
**次序照属性表的次序** ✓（JS 也是插入序 ✓——符号键**不参与**整数键优先那一套 ✗）。

# const EncodeURIComponent:int = 422

**`encodeURIComponent(s)`**（第 311 轮 ✓）——号**追加在全局段表尾** ✓（`421` 之后 ✓）。

**四个名字一次做完** ✓（`encodeURI` ✓ / `encodeURIComponent` ✓ / `decodeURI` ✓ /
`decodeURIComponent` ✓）：它们是**同一件事的两个参数** ✗——「哪些字符留着」那张表
差十一个保留字符 ✓、别的算法一个字都不差 ✓。**写四份就是四处会漂** ✗。

**为什么它们是「能证明」的那一档** ✓：UTF-8 的字节规则 ✓ 与那张百分号表 ✓
都由标准定死 ✓（与 `Math.pow` 那类「各目标可能差最后一位」**不是**一回事 ✗）。

# const EncodeURI:int = 423

**`encodeURI(s)`**（第 311 轮 ✓）——与 `encodeURIComponent` **共用同一支实现** ✓，
只多留 `; , / ? : @ & = + $ #` 这十一个保留字符 ✓（见 `UriKeep` ✓）。

# const DecodeURIComponent:int = 424

**`decodeURIComponent(s)`**（第 311 轮 ✓）——按 UTF-8 把 `%XX` 串解回码点 ✓。

# const DecodeURI:int = 425

**`decodeURI(s)`**（第 311 轮 ✓）——与 `decodeURIComponent` **共用同一支实现** ✓，
差别只有一处 ✓：解出来的**保留字符原样吐回 `%XX`** ✓（JS 的口径 ✓——
`decodeURI("%2F")` 是 `"%2F"` ✓，而 `decodeURIComponent("%2F")` 是 `"/"` ✓）。

# const ObjectIs:int = 411

**`Object.is(a, b)`**（第 275 轮 ✓）——号在 `Object` 那一段的**下一个** ✓（`401..410` 已用 ✓）。

**它要的是第三张判等表** ✗：`Object.is` 用的是 **SameValue** ✓，
与 `===` 差 `NaN` ✓、与 `SameValueZero` 差 `±0` ✓——
两处都翻 ✓，所以**任何一张现成的表都不对** ✗（见 `rt.xl.md` 的 `SameValue` ✓）。

**第 276 轮补的五格** ✓（`Object` 那一段的下五个号 ✓ `412..416` ✓）——
它们围着**同一件事**转 ✓：**描述符**（descriptor ✓）。
`getOwnPropertyDescriptor` 是 `defineProperty` 的**反面** ✓（读一格 → 一个描述符对象 ✓）、
`defineProperties` 是它的**复数版** ✓（一趟写多格 ✓）、
`seal` / `isSealed` / `isFrozen` 是**标志位的三种问法** ✓。

**它们是第 273 轮普查量到的** ✓：判据 `object-getownpropertydescriptor` 与
`object-seal-and-defineProperties` 两条都在报 `cannot call a non-closure value` ✓——
即**那几格根本没装** ✗（`defineProperty` 与 `freeze` 一直是好的 ✓）。

# const ObjectGetOwnPropertyDescriptor:int = 412

**`Object.getOwnPropertyDescriptor(对象, 键)`**（第 276 轮 ✓）——把那一格读成`{ value, writable, enumerable, configurable }` ✓，**没有那一格给 `undefined`** ✓。

# const ObjectGetOwnPropertyDescriptors:int = 428

**`Object.getOwnPropertyDescriptors(对象)`**（第 324 轮 ✓）——**一次拿全表** ✓，
号**追加在全局段那个 `Object` 段之后的第一格空号** ✓（`421` 之后空了一段 ✓，
`426` / `427` 是生成器自己那两格 ✓——**号只追加、不复用** ✓）。

**它一个字的判断都不重写** ✓：逐格**复用单数那一支** ✓（`InvokeGlobal` 递归调同一张分派 ✓，
`ObjectGetOwnPropertyDescriptor` ✓）——**描述符的形状只有那一处答案** ✓
（数据属性四格 ✓ / 访问器两格 ✓ / 数组元素与字符串下标的标志不一样 ✓ / `length` 第三种 ✓，
第 276 / 304 轮全是**实测**出来的 ✓）。**再抄一遍就是第二处会漂的答案** ✗，
而漂的表现是「单数对、复数错」✓（第 284 轮那个计算键写三遍就是这种账 ✓）。

**键那一趟也复用** ✓：自有**字符串键**与自有**符号键**各走现成的那两支 ✓
（`getOwnPropertyNames` ✓ / `getOwnPropertySymbols` ✓，第 214 / 288 轮 ✓）——
于是「整数键在前 ✓、`length` 在不在里面 ✓、`__sealed` 那个内部标记不算 ✓」
这些**已经定过的口径**不必再想一遍 ✓。

# const ObjectDefineProperties:int = 413
**`Object.defineProperties(对象, 描述符表)`**（第 276 轮 ✓）——一趟写多格 ✓。
**它与 `defineProperty` 共用同一个方法** ✓（`DefineOwnFromDescriptor` ✓）：
「怎么把描述符写进去」那段里有两处**不能抄**的判断 ✓（默认三个标志全是假 ✓、
访问器描述符要抛 ✗），抄成两份就是两处会漂的答案 ✗。

# const ObjectSeal:int = 414

**`Object.seal(对象)`**（第 276 轮 ✓）——**不可配置**（`configurable` 全清 ✓）、
但**仍然可写** ✓（这正是它与 `freeze` 的分界 ✓）。

# const ObjectIsSealed:int = 415

# const ObjectIsFrozen:int = 416

**`Object.isSealed` / `Object.isFrozen`**（第 276 轮 ✓）——**两个问法共用一张底牌** ✓：
「**这个对象被标记过不可扩展吗**」✓。**为什么需要一个标记** ✗：
「每个自有属性都不可配置」在**空对象**上是**真空成立**的 ✓——
`Object.isSealed({})` 于是会答**真** ✗，而 JS 答**假** ✓（它是可扩展的 ✓）。
**静默错值** ✓，所以这一格不能只看标志位 ✗。
标记走 `SetHiddenProperty` ✓（与 `Map` 的 `__k` / `Boolean` 的 `__b` 同一条路 ✓），
**已知差异写在明处** ✗：它和那些内部格一样，会出现在 `Object.getOwnPropertyNames` 里 ✓
（**这不是新开的一个口子** ✗——`__k` / `__v` / `__b` / 绑定函数的三个槽今天都这样 ✓）。

# const ObjectIsExtensible:int = 418

**`Object.isExtensible(对象)`**（第 291 轮 ✓）——**第 276 轮那张底牌的正面** ✓：
`isSealed` / `isFrozen` 问的都是「**这个对象被标记过不可扩展吗**」✓，
而这一格正是**那一格的取反** ✓（不是另开一个标记 ✗——两处标记迟早会漂 ✓）。
**判据 `c291-object-freeze-and-is`** 把三格钉在一起 ✓（`freeze` 之后三个答案同时要对 ✓）。

# const ObjectSetPrototypeOf:int = 419

**`Object.setPrototypeOf(对象, 原型)`**（第 304 轮 ✓）——号在 `411..418` 之后的**下一个** ✓。

**它落的正是引擎里早就有的那一步** ✓：`set_proto` 那条路（`rt.xl.md` 的 `RtSetProto` ✓）
——第 278 轮为 `extends` 写过一遍 ✓（那时发现「父类可能是宿主引用值」⇒ **原型那一格不是对象就不做事** ✓，
**接收者那一格仍然抛** ✓）。**不另写一份** ✗：两处各写一遍，`extends` 与这一格就会在
「原型不是对象」那一档上**分岔** ✓（JS 在这一格是**不做事** ✓，不是抛 ✓）。

**它是第 304 轮加宽矩阵时量到的** ✗：判据 `c304-std-object-setprototypeof-value` 与
`c304-rt-setprototypeof-and-isprototypeof` 都在报 `cannot call a non-closure value` ✓
——即**那一格根本没装** ✗（`Object.create` / `getPrototypeOf` 从第 209 轮起就是好的 ✓，
它们是**同一族的三格** ✓，偏偏中间那一格没人做 ✓）。

# const ObjectPreventExtensions:int = 420

**`Object.preventExtensions(对象)`**（第 304 轮 ✓）——**只打「不可扩展」那个标记** ✓，
**不动任何一个属性标志** ✓。**这正是它与 `seal` 的分界** ✓：
`seal` 还要把每一格的 `configurable` 清掉 ✓、`freeze` 连 `writable` 一起清 ✓——
所以三档是**同一件事的三层** ✓，而 `isExtensible` / `isSealed` / `isFrozen` 三个问法
读的都是**同一个标记** ✓（第 291 轮那一格就是它的正面 ✓）。

**已知差异写在明处** ✗：这一层**只标记、不真的拦写** ✗——JS 里
`Object.preventExtensions(o)` 之后 `o.b = 1` 在**松散模式**下静默无效 ✓，
而本仓的 `SetProperty` 今天只认 `seal` / `freeze` 清出来的**属性标志** ✓，
不认「不可扩展」这个对象级标记 ✓（判据只量 `isExtensible` 与既有属性 ✓）。

**它是第 304 轮加宽矩阵时量到的** ✗：判据 `c304-std-object-preventextensions-forms`
与 `c304-rt-preventextensions-and-isextensible` 都在报 `cannot call a non-closure value` ✓
——即**那一格根本没装** ✗（`isExtensible` 从第 291 轮起就是好的 ✓，
**有问的人、没有做的人** ✓）。

# const ObjectIsPrototypeOf:int = 421

**`Object.prototype.isPrototypeOf(对象)`**（第 304 轮 ✓）——**原型方法** ✓
（与 `hasOwnProperty` 同一条路 ✓：挂在 `Protos.Object` 上 ✓、**隐藏**挂 ✓——
`Object.keys({})` 必须还是空的 ✓，挂成普通属性它当场变成 3 ✗）。

**它与 `instanceof` 不是一回事** ✗：那个比的是**构造函数的 `prototype`** ✓，
这个问的是「**链上有没有这一格**」✓——所以它**正好落在 `RtChainHas` 上** ✓
（`instanceof` 的第三段 ✓，第 137 轮抽出来的那个 ✓）。**不另写一趟走链** ✗：
两处各走一遍就是两处会漂的上限与终止条件 ✓。

**原始值一律答假** ✓（JS 的口径 ✓：`Object.prototype.isPrototypeOf(1)` 是**假** ✓）。

# const NumberToExponential:int = 367

**`(0.000123).toExponential(位数?)`**（第 291 轮 ✓）——**与 `toFixed` / `toPrecision` 同一张表** ✓
（`NumberToFixed` / `NumberToPrecision` ✓），**号追加在表尾** ✓。
**语义同样借宿主** ✓（理由与 `NumberToFixed` 那一段一字不差 ✓：ECMAScript 逐字定死了
「用精确的数学值做十进制舍入」✓）。
**它是第 291 轮普查量到的** ✗：判据 `c291-number-tostring-radix-and-format` 报
`cannot call a non-closure value` ✓——即**那一格根本没装** ✗（`toFixed` 一直是好的 ✓）。

# const ConsoleLog:int = 301

# const ParseInt:int = 303

**`parseInt(文本, 基数?)`**（第 126 轮）——**全局函数** ✓：与 `Math` / `console` 那些一样
从环境对象上取 ✓（不是某个对象的方法 ✓）。

**照着 JS 的规矩** ✓：跳过**前导空白** ✓、认一个 `+` / `-` ✓、
基数给了就按它（**2..36 之外给 `NaN`** ✓）、没给就看有没有 `0x` 前缀 ✓（有就 16、没有就 10 ✓）、
**取最长的合法前缀** ✓（`parseInt("12px")` 是 `12` ✓）、一个数字都没有就给 `NaN` ✓。
**非字符串的实参先 ToString** ✓（`parseInt(12.5)` 是 `12` ✓）——走的是「任意值 → 文本」那条 ✓。

**已知差异写在明处** ✗：JS 的空白集合比这里的**大**（Unicode 空白那一类 ✗）——
这里只认 ASCII 那六个 ✓（与 `trim` 同一条口径 ✓）；
**超出 `i32` 的位数**在 JS 里靠双精度累加、末几位可能与这里不同 ✗（这一层不假装逐位一致 ✓）。

# const ParseFloat:int = 304

**`parseFloat(文本)`**（第 126 轮）——同样跳过前导空白 ✓、**取最长的合法前缀** ✓
（`"1.5px"` → `1.5` ✓、`"1e"` → `1` ✓、`"Infinity"` → `Infinity` ✓）、
一个合法字符都没有就给 `NaN` ✓。**前缀到数值那一步借用宿主** ✓——
正确舍入的十进制转换是 IEEE 754 的活儿 ✓（与 `JSON.parse` 那条同一条理由 ✓）。

# const NumberToFixed:int = 330

**`(1.5).toFixed(位数)`**（第 150 轮）——挂在 `Number.prototype` 上 ✓（原始值接收者从那一条链上找 ✓）。

**这一步借宿主** ✓：`toFixed` 的语义**由 ECMAScript 逐字定死** ✓（用**精确的数学值**、
按指定的位数做**十进制舍入** ✓）——所以它是「结果被标准定死」的那一类 ✓
（与 `host-text.xl.md` 借「十进制 ↔ 双精度」同一条理由 ✓）。
**手写一遍是另一个量级的工程** ✗：`x * 10^d` 再取整在边界上会错 ✓
（`(1.005).toFixed(2)` 那种 ✓——精确值的舍入不是浮点乘除能表达的 ✓）。

**已知的跨目标差**（写在明处 ✗）：C++ 那一侧的定长格式化（`to_chars`）在**平局**上
可能与 V8 差最后一位 ✓——与 `host-text.xl.md` 里记的指数形式那条同族 ✓（P1 对拍时收 ✓）。

# const NumberToStringRadix:int = 331

**`(255).toString(16)`**（第 150 轮）——**同一个名字、两种语义** ✗：
`Number.prototype.toString()` **不带实参**时是十进制 ✓（`(1.5).toString()` 是 `"1.5"` ✓），
带**基数**时是那个进制的写法 ✓。

**基数 10 走 `NumberToHostText`** ✓（引擎那一处借用 ✓：最短往返、`NaN` / `±Infinity` / `-0`
的名字都在那里定死 ✓）；**其余基数借宿主** ✓（ECMAScript 对小基数有算法 ✓，
大基数在边角上留给实现 ✓——与 `toFixed` 同一条口径 ✓）。

# const BooleanToString:int = 332

**`true.toString()`**（第 150 轮）——挂在 `Boolean.prototype` 上 ✓。
**它就是 `TextUnitsOf` 对布尔的那一档** ✓（`"true"` / `"false"` ✓）——
两处口径本来就该一样 ✓（一个是 `String(true)` ✓，一个是 `true.toString()` ✓）。

# const NumberToPrecision:int = 333

**`(1.2345).toPrecision(3)`**（第 182 轮）——与 `toFixed` **同一族、同一条理由** ✓
（语义由 ECMAScript 逐字定死 ✓、用精确的数学值 ✓、手写一遍会错在边界上 ✗），
所以同样**借宿主** ✓。差别只有一句话 ✓：`toFixed` 固定**小数位** ✓、
`toPrecision` 固定**有效位数** ✓（≥ 精度时还可能给指数形式 ✓——那一处写法差异
与 `host-text.xl.md` 记的指数形式那条同族 ✗，P1 对拍时一起收 ✓）。

# const NumberValueOf:int = 334

**`(5).valueOf()`**（第 182 轮）——**返回接收者自己** ✓（本仓不装箱 ✓，
所以 `self` 就是那个原始值 ✓）。JS 里 `o.valueOf()` 是 `ToPrimitive` 的第一步 ✓，
而数值这一档的答案就是它自己 ✓。

# const BooleanValueOf:int = 335

**`true.valueOf()`**（第 182 轮）——与 `NumberValueOf` 同一条口径 ✓（返回接收者自己 ✓）。

# const ObjectValueOf:int = 336

**`({}).valueOf()`**（第 198 轮）——**与 `NumberValueOf` 同一支实现** ✓（返回接收者自己 ✓）。

**它是 `Object.prototype` 上最"空"的一个方法** ✓，而它**永远是对的** ✓：JS 的 `ToPrimitive`
普通那一支第一步就是它 ✓——原始值那几档给回自己 ✓，对象给回对象 ✓（于是**继续往下走
`toString`** ✓）。补上它之后，「普通对象 → 原始值」那条路只差 `toString` ✓。

# const ErrorToString:int = 339

**`Error.prototype.toString`**（第 213 轮 ✓）：`"<name>: <message>"` ✓。

**为什么不复用 `Object.prototype.toString`** ✗：那一个给的是 `"[object Object]"` ✓
（它的口径就是「标签」✓），而错误这一族要的是 `"Error: msg"` ✓——
判据 `error-tostring` 现场给的就是 `"[object Object]"` ✗（**离对的只差一个"很像"** ✗）。

# const ObjectHasOwnProperty:int = 338

**`({}).hasOwnProperty(k)`**（第 209 轮 ✓）——只问**自己**那一格 ✓（`in` 会沿原型链 ✓，
两处**不能互相顶替** ✗）。号紧挨着上面两格 ✓（同一个「`Object.prototype` 上的方法」段 ✓）。

# const FunctionCall:int = 340

**`f.call(thisArg, …args)`**（第 228 轮 ✓）——`Function.prototype` 上的第一格 ✓。

**它为什么能做得出来、而 `bind` 要绕着走** ✗：`call` / `apply` **不造新值** ✓——
它们要的是「换一个 `this`、再按给定的实参调一次」✓，而这件事 `NativeCall` 本来就会 ✓
（`props.xl.md` 的那条重入通道带 `thisValue` ✓、实参表是一整个数组 ✓，
第 142 轮就开宽了 ✓）。所以这一格只是**搬运**：把 `args[0]` 当 `this`、
把 `args[1..]` 收成一个数组 ✓，然后 `call(callee, thisArg, list)` ✓。

**它凭什么常见** ✓：`Object.prototype.toString.call(x)` 这一族写法遍地都是 ✓
（判据 `object-tostring-tag` / `symbol-tostringtag` 拖着的就是它 ✓），
而本仓原来报的是 `calling a non-closure value` ✗——`call` 那一格**根本不存在** ✓
（根子在「闭包没有 `Proto`」✓，第 228 轮在 `vm.xl.md` 的 `MakeClosure` 补上了 ✓）。

# const FunctionApply:int = 341

**`f.apply(thisArg, argsArray)`**（第 228 轮 ✓）——与 `FunctionCall` 同一支实现 ✓
（`this` 同样是 `args[0]` ✓），只有实参那一半不同 ✗：`apply` 的实参**已经是数组** ✓
（JS 还认「类数组」那一条 ✓，本仓只认真的数组 ✓——写在已知差异里 ✓）。

# const FunctionBind:int = 342

**`f.bind(thisArg, …args)`**（第 228 轮 ✓）——**它要造一个新值** ✓，所以与上面两格不同 ✗：
造出来的那个东西必须**带着**「目标 / `this` / 已绑定的实参」三样 ✓，
而且是**能被调的** ✓。本仓现成的两个机制正好够 ✓：`AttachCallable` 第 145 轮就在
（「对象照旧是对象，只是多了一格能被调」✓），三样东西挂成**隐藏自有属性** ✓
（`SetHiddenProperty` ✓，第 210 轮 ✓——它们不该出现在 `Object.keys` 里 ✓）。
落到哪一段代码由**这一格号**决定 ✓（引擎不认识 `"bind"` 这几个字母 ✗，
与 `Symbol` / `Map` 同一条分界 ✓），实现在 `InvokeGlobal` 的 `FunctionBind` 那一支 ✓。

# const FunctionCtor:int = 343

**`Function` 这个全局对象自己**（第 228 轮 ✓）：`Function.prototype.call` 这一族要一个落点 ✓，
所以它是一格「普通对象 + 可调用载荷」✓（与 `Array` / `String` 同款 ✓）。
**它不是 `new Function("…")` 那条路** ✗（那是**编译期**的事 ✓，本运行器不做 ✓）——
它只是 `Function` 这个名字的落点 ✓，于是 `Function.prototype === Function.prototype` 成立 ✓。

# const GeneratorNextId:int = 709

**「生成器的 `next`」那一格**（第 229 轮 ✓）——`it.next()` 落到这里 ✓，
但它**不由这一层实现** ✗：走一步生成器要发 `iter_next`（**指令** ✓），
而那是**引擎**的事 ✓（`vm.xl.md` 的 `NextStepOf` ✓）。

**它的作用只有两个** ✓：
1. **`protos.Generator.next` 上挂的那个载荷用它** ✓（`BuildGlobals` 挂 ✓）——
   这样 `GetProperty` 沿原型链找到它、`DoCallMethod` 把它当方法调 ✓；
2. **让引擎认得出「这一次调用是我自己的」** ✓：`InstallBuiltins` 调
   `machine.RegisterGeneratorMethods(GeneratorNextId, GeneratorReturnId, GeneratorThrowId)` ✓，
   引擎于是把这三格号记下来 ✓（`GeneratorNextId` 那三个字段 ✓），
   两条派发路上各截一次 ✓（`GeneratorStepKind` ✓）。

**为什么用能力号而不是新加一条算子** ✓：**一条指令都不用加** ✓——
`AttachCallable` 与「宿主载荷的能力号分派」第 145 / 228 轮就都在了 ✓，
这只是一次**新的用法** ✓（与 `Symbol` / `Date` 那种「对象带一格载荷」同一个形状 ✓）。

**第 313 轮补了两格** ✓（`return` / `throw` ✓，`710` / `711` ✓）：
它们是**同一件事的另外两个方向** ✓（结束掉 ✓ / 往里抛 ✓），
所以**登记入口也合成一个** ✓（三个号一次交出去 ✓，引擎那边判据只有一份 ✓）。
`throw` 那一个方向**做得了** ✓（在挂起点抛一个值 ✓，`Op.Resume` ✓）；
`return` 那一个**做不了** ✗——它要让那个 `yield` 点上跑 `finally` 链 ✓，
而那条链是**降级期**的构造 ✓（`lowering.xl.md` 的 `FinallyBlocks` ✓），
引擎手里没有「这个帧欠哪些 `finally`」那张表 ✗ ⇒ 那一格今天**响亮地抛** ✓。

**它在 709** ✓（700..799 是语言内部辅助那段 ✓，`SetHiddenId = 708` 是当前最大的 ✓）——
**加号必须同时改 `BuiltinSlots`** ✗（`install.xl.md` ✓）：漏了它的症状是`capability id is out of range: 709` ✓（一句话里没提「名单」两个字 ✗，第 210 / 197 轮各踩过一次 ✓）。

# const BoundCall:int = 344

**调一个 `bind` 造出来的函数**（第 228 轮 ✓）——`FunctionBind` 那一支造的那个对象
身上带着这一格载荷 ✓，被调时落到这里 ✓。

**三样东西藏在哪些名字下、由谁定** ✗：名字（`BoundTargetName` / `BoundThisName` /
`BoundArgsName` 三个方法 ✓）是**这一层**的常数 ✓，**引擎一个字都不认识** ✓——
它只负责「把这个对象当 `this` 递进来」✓（`vm.xl.md` 的 `CallHostValue` 就是这么写的 ✓）。
**写成三个方法而不是三个号** ✓：它们的用处是「现造一个字符串句柄」✓
（`table.CreateString` ✓），而号那一栏是**能力号**的段 ✗——混进去会让人以为宿主能注册它们 ✓。

# method BoundTargetName:(table:HeapTable)=>Value

**`bind` 造出来那个对象上，「目标」挂在哪个键下**（第 228 轮 ✓）。

**每一次都现造一个字符串** ✓（不是缓存一格句柄 ✓）：属性查找**按内容比** ✓
（`props.xl.md` 的 `KeyMatches` ✓），所以「同一个名字」不要求「同一个句柄」✓；
而这个函数一次调用最多走两趟 ✓（写一趟、读一趟 ✓），缓存带来的收益抵不过
多一格全局状态要维护 ✓。**三个方法挤在一处** ✓（同一件事的三个名字 ✓）。

```ts
return Value.FromString(table.CreateString(Units("__boundTarget")));
```

# method MakeBox:(room:RoomChecker, table:HeapTable, protos:Protos, protoHandle:int, inner:Value)=>Value

**造一个包装对象**（第 310 轮 ✓）——**普通对象 + 一格隐藏的原值** ✓，原型指到 `protoHandle` ✓。

三处用它 ✓（`new Number(x)` ✓ / `new String(x)` ✓ / `new Boolean(x)` ✓、以及 `Object(原始值)` ✓）——
**同一件事写三遍就是三处会走偏** ✗（判据要的是**三族行为一致** ✓：`typeof` 是 `"object"` ✓、
`valueOf` 给回原值 ✓、`Object.keys` 是 `[]` ✓）。

**为什么原型要显式指过去** ✗：`NewPlainObject` 给的是 `Object.prototype` ✓——
不换的话 `(new Number(5)).toFixed(2)` 找不到那一格 ✗（报的是
`cannot call a non-closure value` ✓，听起来像「`toFixed` 没做」✗，而它**早就有了** ✓）。

**里面那一格为什么是隐藏属性** ✗：见 `BoxKey` 那一段 ✓（`Object.keys` 必须给 `[]` ✓）。

```ts
const boxed = NewPlainObject(room, table, protos);
table.Get(boxed.Ref).Proto = protoHandle;
SetHiddenProperty(room, table, boxed, BoxKey(table), inner);
return boxed;
```

# method MakeStringBox:(room:RoomChecker, table:HeapTable, protos:Protos, primitive:Value)=>Value

**造一个字符串包装对象**（第 310 轮 ✓）——`MakeBox` 再加两样 ✓。

**JS 的字符串对象是「奇异对象」** ✗：它**自己**带着下标格与 `length` ✓——
`new String("ab").length` 是 2 ✓、`s[0]` 是 `"a"` ✓、`s[1]` 是 `"b"` ✓，
而且 `Object.keys(new String("ab"))` 是 **`["0", "1"]`** ✓（那两格**是可枚举的自有属性** ✓，
不是内部格 ✗——所以它们走 `SetProperty` ✓，只有 `length` 走隐藏那一支 ✓）。

**不补这两样会怎样** ✗：`s.length` 沿原型链找不到 ✓ ⇒ `undefined` ✓（**静默错值** ✗）；
`s[0]` 同理 ✓。判据 `c305-std-string-wrapper-methods` 量的正是这两格 ✓。

```ts
const boxed = MakeBox(room, table, protos, protos.String, primitive);
const units = table.Get(primitive.Ref).AsString().Units;
if (!room(PropertyCharge * (units.length + 1) + ObjectCharge)) throw new Error("out of room");
for (let i = 0; i < units.length; i++) {
  SetProperty(room, NeverCall, table, boxed,
    Value.FromString(table.CreateString(Units(String(i)))),
    Value.FromString(table.CreateString([units[i]])));
}
// **`length` 不可枚举** ✓（JS 的口径 ✓）——它走隐藏那一支 ✓。
SetHiddenProperty(room, table, boxed, NameValue(table, "length"), Value.FromInt(units.length));
return boxed;
```

# method UriKeep:(unit:number, component:bool)=>bool

**这个 ASCII 码元在百分号编码里要不要留着**（第 311 轮 ✓）。

三档 ✓（规范的 `uriUnescaped` / `uriReserved` 两张表 ✓）：
**字母数字** ✓、**`- _ . ! ~ * ' ( )`** ✓（永远留着 ✓）、
以及 `component === false`（即 `encodeURI` ✓）时**多留的十一个保留字符** ✓。

**非 ASCII 一律不留** ✗（它们要走 UTF-8 那一支 ✓）——所以判据只对 `< 128` 有意义 ✓，
调用方也只在那一档问它 ✓。

```ts
if ((unit >= 65 && unit <= 90) || (unit >= 97 && unit <= 122) || (unit >= 48 && unit <= 57)) return true;
if (unit === 45 || unit === 95 || unit === 46 || unit === 33 || unit === 126 || unit === 42
  || unit === 39 || unit === 40 || unit === 41) return true;
if (!component && UriReserved(unit)) return true;
return false;
```

# method UriReserved:(unit:number)=>bool

**那十一个保留字符**（第 311 轮 ✓）：`; , / ? : @ & = + $ #` ✓。

**两处都问它** ✓：`encodeURI` 留它们 ✓（`UriKeep` ✓）、`decodeURI` 遇到它们**不解** ✓
（解出来的还是 `%XX` ✓）——**同一张表两处用** ✓，各写一遍就是两处会漂 ✗。

```ts
return unit === 59 || unit === 44 || unit === 47 || unit === 63 || unit === 58 || unit === 64
  || unit === 38 || unit === 61 || unit === 43 || unit === 36 || unit === 35;
```

# method UriHex:(unit:number)=>int

**十六进制数字 → 值**；不是就 `-1` ✓（第 311 轮 ✓）。

```ts
if (unit >= 48 && unit <= 57) return unit - 48;
if (unit >= 65 && unit <= 70) return unit - 55;
if (unit >= 97 && unit <= 102) return unit - 87;
return -1;
```

# method EncodePercent:(table:HeapTable, value:Value, component:bool)=>Array<int>

**值 → 百分号编码的码元表**（第 311 轮 ✓）。`value` 先过 `JsTextUnits` ✓（JS 的 `ToString` ✓）。

**按码点走** ✓（代理对合起来 ✓）：`encodeURIComponent("😀")` 是 `%F0%9F%98%80` ✓（四个字节 ✓），
拆成两个码元去编码会得到**两串三字节** ✗（**静默错值** ✓，而且长度也对不上 ✓）。

```ts
const units = JsTextUnits(table, value);
const out: number[] = [];
const hexDigits = "0123456789ABCDEF";
let i = 0;
while (i < units.length) {
  let code = units[i];
  let width = 1;
  if (code >= 0xd800 && code <= 0xdbff && i + 1 < units.length
    && units[i + 1] >= 0xdc00 && units[i + 1] <= 0xdfff) {
    code = 0x10000 + ((code - 0xd800) * 1024) + (units[i + 1] - 0xdc00);
    width = 2;
  }
  if (code < 128 && UriKeep(code, component)) {
    out.push(code);
    i += width;
    continue;
  }
  const bytes: number[] = [];
  if (code < 0x80) {
    bytes.push(code);
  } else if (code < 0x800) {
    bytes.push(192 + Math.floor(code / 64));
    bytes.push(128 + (code % 64));
  } else if (code < 0x10000) {
    bytes.push(224 + Math.floor(code / 4096));
    bytes.push(128 + (Math.floor(code / 64) % 64));
    bytes.push(128 + (code % 64));
  } else {
    bytes.push(240 + Math.floor(code / 262144));
    bytes.push(128 + (Math.floor(code / 4096) % 64));
    bytes.push(128 + (Math.floor(code / 64) % 64));
    bytes.push(128 + (code % 64));
  }
  for (let b = 0; b < bytes.length; b++) {
    out.push(37);
    out.push(hexDigits.charCodeAt(Math.floor(bytes[b] / 16)));
    out.push(hexDigits.charCodeAt(bytes[b] % 16));
  }
  i += width;
}
return out;
```

# method DecodePercent:(table:HeapTable, value:Value, component:bool)=>Array<int>

**百分号编码 → 码元表**（第 311 轮 ✓）。

**用算术而不是位运算** ✓（`Math.floor` / `%` ✓）：这一段是本仓自己的规范文件 ✓，
而它是 `cases:tsast` 的语料 ✓——位运算写得再对也只是多一层风险 ✓（`& 0x3f` 那几处
在这一版里没有一处非它不可 ✓）。

**`component === false` 时保留字符不解** ✓（`decodeURI("%2F")` 给 `"%2F"` ✓）——
吐回去的是**大写十六进制** ✓（JS 原样保留输入里那两个字符的大小写 ✗，本仓统一大写 ✓，
**写在明处** ✓：`decodeURI("%2f")` 在 JS 里是 `"%2f"` ✓、这里是 `"%2F"` ✓）。

**坏输入响亮地抛** ✓（JS 抛 `URIError` ✓）：本仓**没有** `URIError` 那一族 ✗，
所以抛的是一个普通 `Error` 并**点名** ✓（编一个「看起来像对的」答案是静默错值 ✗）。

```ts
const units = JsTextUnits(table, value);
const out: number[] = [];
const hexDigits = "0123456789ABCDEF";
let i = 0;
while (i < units.length) {
  if (units[i] !== 37) {
    out.push(units[i]);
    i += 1;
    continue;
  }
  const bytes: number[] = [];
  let j = i;
  while (j + 2 < units.length && units[j] === 37) {
    const high = UriHex(units[j + 1]);
    const low = UriHex(units[j + 2]);
    if (high < 0 || low < 0) {
      throw new Error("unimplemented: malformed percent-encoding (JS throws URIError)");
    }
    bytes.push(high * 16 + low);
    j += 3;
  }
  let k = 0;
  while (k < bytes.length) {
    const lead = bytes[k];
    let code = 0;
    let need = 0;
    if (lead < 128) {
      code = lead;
    } else if (lead >= 192 && lead < 224) {
      code = lead - 192;
      need = 1;
    } else if (lead >= 224 && lead < 240) {
      code = lead - 224;
      need = 2;
    } else if (lead >= 240 && lead < 248) {
      code = lead - 240;
      need = 3;
    } else {
      throw new Error("unimplemented: malformed UTF-8 in percent-encoding (JS throws URIError)");
    }
    if (k + need >= bytes.length) {
      throw new Error("unimplemented: truncated UTF-8 in percent-encoding (JS throws URIError)");
    }
    for (let n = 1; n <= need; n++) {
      const follow = bytes[k + n];
      if (follow < 128 || follow >= 192) {
        throw new Error("unimplemented: malformed UTF-8 in percent-encoding (JS throws URIError)");
      }
      code = code * 64 + (follow - 128);
    }
    k += need + 1;
    if (!component && code < 128 && UriReserved(code)) {
      out.push(37);
      out.push(hexDigits.charCodeAt(Math.floor(code / 16)));
      out.push(hexDigits.charCodeAt(code % 16));
      continue;
    }
    if (code < 0x10000) {
      out.push(code);
    } else {
      const offset = code - 0x10000;
      out.push(0xd800 + Math.floor(offset / 1024));
      out.push(0xdc00 + (offset % 1024));
    }
  }
  i = j;
}
return out;
```

# method BooleanBoxKey:(table:HeapTable)=>Value

**`new Boolean(x)` 那个包装对象上，「原值」挂在哪个键下**（第 232 轮 ✓）——
与 `BoundTargetName` 那一族**同一个理由** ✓（每一次现造 ✓，按内容比 ✓）。

**为什么是隐藏属性而不是普通属性** ✗：`Object.keys(new Boolean(1))` 在 JS 里是 `[]` ✓，
挂成普通属性会当场给 `["__b"]` ✗——**静默错值** ✓（与 `Map` 的内部格那条同一个坑 ✓）。

```ts
return Value.FromString(table.CreateString(Units("__b")));
```

# method BoundThisName:(table:HeapTable)=>Value

**绑定的 `this` 挂在哪个键下**（第 228 轮 ✓，与上面同一条口径 ✓）。

```ts
return Value.FromString(table.CreateString(Units("__boundThis")));
```

# method BoundArgsName:(table:HeapTable)=>Value

**已绑定的实参挂在哪个键下**（第 228 轮 ✓，与上面同一条口径 ✓）。

```ts
return Value.FromString(table.CreateString(Units("__boundArgs")));
```

# const ObjectCreate:int = 407

**`Object.create(proto)`**（第 209 轮 ✓）——造一个空对象、把**原型**指过去 ✓。

# const ObjectGetPrototypeOf:int = 408

**`Object.getPrototypeOf(o)`**（第 209 轮 ✓）——把 `o` 那一格原型**当值**交出去 ✓。

# const ObjectGetOwnPropertyNames:int = 409

**`Object.getOwnPropertyNames(o)`**（第 214 轮 ✓）——与 `Object.keys` **只差「不管 `enumerable`」** ✓。

# const ObjectFromEntries:int = 410

**`Object.fromEntries(entries)`**（第 214 轮 ✓）——`[[k, v], …]` 或 `Map` → 普通对象 ✓。

# const ObjectToString:int = 337

**`({}).toString()`**（第 198 轮）——**只答能证的那一格** ✓：`"[object Object]"` ✓。

**为什么它不能顺手给一个默认值** ✗：JS 的 `Object.prototype.toString` 是一条**长长的分派** ✓
（`Array` / `Function` / `Error` / `Date` / `Map` / `Set` 各有各的标签 ✓，
其中 `Map` / `Set` 那两个还是靠 `Symbol.toStringTag` ✓）。本仓今天能**证明**的只有
「普通对象」这一格 ✓（没有标记格 ✓、原型链上不是 `Error` ✓、不是可调用对象 ✓）——
**其余一律抛** ✓（见 `ObjectTagOf` ✓）。

**它凭什么值得做** ✓：`({}) + 1` 在 JS 里是 `"[object Object]1"` ✓，而本仓原来报
「算术作用于非数值」✗——第 198 轮把 `ToPrimitive` 做出来之后 ✓，
这一步就是**对象那一支的最后一块** ✓（`[] + 1` 早就有 `Array.prototype.toString` ✓ 了 ✓）。

# method ObjectTagOf:(room:RoomChecker, call:NativeCall | null, table:HeapTable, protos:Protos, value:Value)=>string

**`Object.prototype.toString` 该给哪个标签** ✓——**能证的证、不能证的抛** ✓（第 198 轮）。

**顺序是语义** ✓：可调用对象 → 标记格那三族 → `Error` → 普通对象 ✓。

**为什么不能落回 `"Object"`** ✗：那三族与 `Error` 在 JS 里给的是**别的文本** ✓
（`new Map() + 1` 是 `"[object Map]1"` ✓、`new Error("x") + 1` 是 `"Error: x1"` ✓
——注意 `Error` 那一格走的是 `Error.prototype.toString` ✓，不是这一条 ✓）。
落回默认值就是**静默错值** ✗，而它比「进不了门」危险得多 ✓（`Object.freeze` 那条账刚记过 ✓）——
所以这里**响亮地抛** ✓，把每一样缺的东西**点名** ✓（缺 `Symbol.toStringTag` ✓ / 缺
`Error.prototype.toString` ✓）。

**`Date` / `Map` / `Set` 三族靠 `DateMarker` 认** ✓（`inspect.xl.md` 那一处 ✓）——
**同一个判据只有一份** ✓：`GetIterator`（认 `Map` / `Set` ✓）、`InspectValue`（认三族 ✓）、
这里 ✓ 问的都是「那一格标记在不在」✓；各写一遍的下场是「`console.log` 认得、算术不认得」✗。

**数组与那几档原始值也要给对** ✓（第 228 轮 ✓）：`Object.prototype.toString.call(x)`
这条写法在普通 `.ts` 里遍地都是 ✓（判据 `function-prototype-shape` ✓），
而**最常传进去的就是数组与数字** ✓。**为什么把它排在最前** ✗：
数组**不是**「普通对象」那一档 ✓（`value.Tag` 就是 `Array` ✓），
而原始值那一档原来走到最后会落成 `"Object"` ✗——`Object.prototype.toString.call([])`
在 Node 里是 `"[object Array]"` ✓，本仓给 `"[object Object]"` ✗（**静默错值** ✗）。
**`typeof` 的标签名不在这里算** ✗：这一层要的是**大写的类名** ✓
（`"Array"` ✓ / `"Number"` ✓），与 `props.xl.md` 的 `TypeOfName` 是两张表 ✓。

```ts
// **数组先认** ✓（它有自己的标签，不是「普通对象」✓）。
if (value.Tag === ValueTag.Array) return "Array";
// **函数那一档** ✓：`typeof` 给 `"function"` ✓，这里的标签是 `"Function"` ✓。
// **它排在「带可调用载荷的对象」那一条抛之前** ✗，见下面那一条的说明 ✓。
if (value.IsCallable()) return "Function";
if (value.Tag === ValueTag.HostRef) return "Function";
// **其余原始值**（第 228 轮 ✓）：`typeof` 的名字首字母大写就是 JS 的标签 ✓
// （`"number"` → `"Number"` ✓、`"string"` → `"String"` ✓、`"boolean"` → `"Boolean"` ✓、
//  `"undefined"` → `"Undefined"` ✓、`null` → `"Null"` ✓、`"symbol"` → `"Symbol"` ✓）。
// **`null` 与 `undefined` 不在这里** ✗：`InvokeGlobal` 那两支**先**把它们答掉了 ✓
// （`Object.prototype.toString.call(null)` 是 `"[object Null]"` ✓）。
if (value.Tag === ValueTag.Int32 || value.Tag === ValueTag.Float64) return "Number";
if (value.Tag === ValueTag.String) return "String";
if (value.Tag === ValueTag.Bool) return "Boolean";
if (value.Tag === ValueTag.Symbol) return "Symbol";
// **可调用对象**（`String` / `Number` / `Function` 那些宿主载荷 ✓）：JS 印源码文本 ✗。
if (table.Get(value.Ref).Host !== null) {
  throw new Error("unimplemented: Object.prototype.toString of a callable object (JS renders source text)");
}
// **`Error` 那一族先问** ✓（第 229 轮把次序摆正 ✓）：JS 里 `Object.prototype.toString`
// **不特判 `Error`** ✗——它按普通对象那条走 ✓，而 `Error.prototype` 上**没有**
// `Symbol.toStringTag` ✓，所以答案是 `"[object Error]"` ✓（**不是** `"Error: x"` ✗！）。
// **`"Error: x"` 是 `Error.prototype.toString` 的答案** ✓——同一个值、两个方法、两个答案 ✓，
// 混起来就是「`String(e)` 也对、`Object.prototype.toString.call(e)` 也『对』」✗（**静默错值** ✗）。
// **`TypeError` / `RangeError` 两族自然落在同一个标签上** ✓（它们的原型链经过 `Error.prototype` ✓，
// 而 JS 给 `"[object Error]"` ✓——实测 `Object.prototype.toString.call(new TypeError())` ✓）。
if (value.Tag === ValueTag.Object && RtChainHas(table, value, protos.Error)) return "Error";
// **`Symbol.toStringTag` 说了算** ✓（第 229 轮 ✓）：它**排在**标记格那三族之前 ✓——
// `new Map()` 明明带 `__k` 标记 ✓，可 JS 给的是 `"[object Map]"` ✓，
// 而那一格**正是** `Map.prototype[Symbol.toStringTag]` 供的 ✓（本仓没有那一格 ✗，
// 所以下面那三族照旧抛 ✓）。**顺序反了**就会让「自己的 `toStringTag`」被标记格抢先 ✗。
const tag = ObjectTagOverride(room, call, table, protos, value);
if (tag !== "") return tag;
const marker = DateMarker(table, value);
if (marker !== "") {
  throw new Error("unimplemented: Object.prototype.toString of a " + marker + " (JS needs Symbol.toStringTag)");
}
return "Object";
```

# method ObjectTagOverride:(room:RoomChecker, call:NativeCall | null, table:HeapTable, protos:Protos, value:Value)=>string

**这个对象自己的 `Symbol.toStringTag`**（第 229 轮 ✓）——没给、或者给的**不是字符串**就给空串 ✓。

**它是 JS 里 `Object.prototype.toString` 的第一步** ✓：
`o[Symbol.toStringTag]` 是字符串就印 `"[object " + 它 + "]"` ✓（`{ [Symbol.toStringTag]: "Custom" }` ✓），
否则走内置那一串分派 ✓。

**为什么只认字符串** ✗：JS 的口径是「`ToString` 之后用它」✓，而**非字符串那一档**
没有判据能证 ✓（`42` 要变 `"42"`、对象要先 `ToPrimitive` ✓，两档都要通道 ✓）——
**不给近似值** ✓：不是字符串就当它没有 ✓（退到内置分派 ✓，而那一条**要么给对、要么响亮地抛** ✓）。

**符号从哪来** ✓：`protos.WellKnownSymbols` 那张**语言层填的小表** ✓
（`props.xl.md` ✓，第 184 轮 ✓）——引擎不该认识 `Symbol` 这六个字 ✓，
而这一层是**语言层** ✓，所以它问的是**自己填的那张表** ✓。

**第 306 轮把「取值」那一步改对了** ✗（原来是 `FindProperty` ✓，只认数据属性 ✓）：
JS 的 `o[Symbol.toStringTag]` 是一次 **`[[Get]]`** ✓——**访问器要调 getter** ✓。
`class C { get [Symbol.toStringTag]() { return "Custom" } }` 是日常写法 ✓，
而原来那一支对访问器**直接 `return ""`** ✗ ⇒ `Object.prototype.toString.call(new C())`
给 `[object Object]` ✓（Node 给 `[object Custom]` ✓，**静默错值** ✗）。
**与 `Object.assign` 的展开那一处是同一个根** ✓：读属性有两条路，
这两处走的是**没有访问器那一档**的那条 ✓。

**没有通道时退回老口径** ✓（`call === null` ✓）：照旧只认数据属性 ✓——
宁可少答一格 ✓，也不能为了「看起来支持访问器」去猜一个值 ✗。

```ts
if (protos.WellKnownSymbols <= 0) return "";
if (value.Tag !== ValueTag.Object) return "";
const symbolTable = Value.FromObject(protos.WellKnownSymbols);
const lookupKey = Value.FromString(table.CreateString(Units("toStringTag")));
const tagSymbol = GetProperty(NeverRoom, NeverCall, protos, table, symbolTable, lookupKey);
if (tagSymbol.Tag !== ValueTag.Symbol) return "";
let tagValue = Value.Undefined();
if (call !== null) {
  // **走 `[[Get]]`** ✓：数据属性给值 ✓、访问器调 getter ✓、原型链照旧走 ✓
  //（`Map.prototype[Symbol.toStringTag]` 就在链上 ✓）。
  // **它可能重入脚本** ✓（getter 是脚本 ✓）——所以先问一次 room ✓，
  // 让回收落在「值还不存在」的时候 ✓（与上面 `Object.assign` 那一处同一条纪律 ✓）。
  if (!room(PropertyCharge)) throw new Error("out of room");
  tagValue = GetProperty(room, call, protos, table, value, tagSymbol);
} else {
  const found = FindProperty(NeverRoom, table, value.Ref, tagSymbol);
  if (found === null) return "";
  const property = table.Get(found.Owner).Props[found.Index];
  if (property.Kind === PropertyKind.Accessor) return "";
  tagValue = property.Value;
}
if (tagValue.Tag !== ValueTag.String) return "";
return TextFrom(table, tagValue);
```

# const NumberIsInteger:int = 320
**`Number.isInteger(x)`**（第 126 轮）——`Number` 是**普通对象** ✓（与 `Array` / `Math` 同款 ✓），
上面挂几个静态判定 ✓。**只认真整数** ✓：`Int32` 一律真 ✓、
`Float64` 要有限且是整数 ✓，其余（字符串 / `null` / …）一律假 ✓（**不做转换** ✗，与 JS 一致 ✓）。

# const NumberIsNaN:int = 321

**`Number.isNaN(x)`**——**只认真正的 `NaN`** ✓（`Float64` 那条自比较 ✓）；
`"abc"` / `undefined` 一律假 ✓（JS 也是 ✓）。

# const NumberIsFinite:int = 324

**`Number.isFinite(x)`**（第 149 轮补）——**不做转换** ✗（与 `Number.isNaN` 同一条口径 ✓）：
只认 `Int32` / `Float64` 且有限 ✓，其余（字符串 / `null` / `NaN` / `±Infinity`）一律假 ✓。
`isFinite("3")` 是 `true` ✓（全局那个先转 ✓），`Number.isFinite("3")` 是 `false` ✓——
**两份的差别就是「转不转」这一格** ✓。

# const IsNaN:int = 322
**全局的 `isNaN(x)`**（第 149 轮补）——**与 `Number.isNaN` 不是一回事** ✗：
它先做 **`ToNumber`** ✓（`isNaN("abc")` 是 `true` ✓——字符串转不成就给 `NaN` ✓），
而 `Number.isNaN("abc")` 是 `false` ✓。

**实现就是「先转再自比较」** ✓：转那一步借**第 145 轮**那条 `NumberFromValue` ✓
（`Number(x)` 的语义只有一份 ✓——这里再写一遍前缀/进制扫描就是第二份会走偏的实现 ✗）。

# const IsFinite:int = 323

**全局的 `isFinite(x)`**（第 149 轮补）——同样**先 `ToNumber`** ✓
（`isFinite("3")` 是 `true` ✓、`isFinite("abc")` 是 `false` ✓）。

**`NaN` 与 `±Infinity` 都是假** ✓：`Number(x)` 出来是 `NaN` / `±Infinity` 就假 ✓
（`NaN !== NaN` 那一条自比较在这里就够了 ✓，不必再调库 ✓）。

# method DigitValue:(unit:int)=>int

**一位数字的值**（`0-9` / `a-z` / `A-Z` → `0..35`）；不是数字给 `-1` ✓。

**为什么不借 `JsonHexDigit`** ✗：那个只认**十六进制** ✓，
而 `parseInt` 的基数一直开到 **36** ✓（`parseInt("zz", 36)` 是 `1295` ✓）——
判据现场就是在这里红的 ✓（我第一版借了十六进制那个解码器 ✗，`"zz"` 给了 `NaN` ✗）。

```ts
if (unit >= 48 && unit <= 57) return unit - 48;
if (unit >= 97 && unit <= 122) return unit - 87;
if (unit >= 65 && unit <= 90) return unit - 55;
return -1;
```

# method ParseIntText:(units:Array<int>, radix:int, hasRadix:bool)=>Value

**`parseInt` 的正身**：从码元里取最长的合法整数前缀 ✓（见 `ParseInt` 那一段的口径 ✓）。

**累加用宿主双精度** ✓（与 JS 一致 ✓——`parseInt` 的结果本来就是「一个数」✓）；
**整的、且在 `i32` 里就给 `Int32`** ✓（与 `MathResult` 同口径 ✓），其余给 `Float64` ✓。

```ts
let at = 0;
while (at < units.length) {
  const unit = units[at];
  if (unit === 32 || unit === 9 || unit === 10 || unit === 11 || unit === 12 || unit === 13) {
    at = at + 1;
    continue;
  }
  break;
}
let negative = false;
if (at < units.length && (units[at] === 43 || units[at] === 45)) {
  negative = units[at] === 45;
  at = at + 1;
}
let base = 10;
// **基数的规整照 JS** ✓：给了且**非 0** 就按它（**2..36 之外一律 `NaN`** ✓），
// 否则（没给 / 给了 0）看 `0x` 前缀 ✓——**前缀要在这一步就吃掉** ✓。
// 判据现场在这里红过一次 ✗：我第一版把「没给」直接当成 10、于是 `parseInt("0x1f")` 给了 `0` ✗
//（JS 给 31 ✓）。
const explicit = hasRadix && radix !== 0;
if (explicit) {
  if (radix < 2 || radix > 36) return MathResult(NaN);
  base = radix;
}
const hexPrefix = at + 1 < units.length && units[at] === 48
  && (units[at + 1] === 120 || units[at + 1] === 88);
if (!explicit && hexPrefix) {
  base = 16;
  at = at + 2;
} else if (base === 16 && hexPrefix) {
  // **给了 16 也吃掉 `0x`** ✓（JS：`parseInt("0x10", 16)` 是 16 ✓）。
  at = at + 2;
}
let value = 0;
let digits = 0;
while (at < units.length) {
  // **基数的上限是 36** ✓，所以这里用通用的数字解码器 ✓（不是十六进制那个 ✗）。
  const digit = DigitValue(units[at]);
  if (digit < 0 || digit >= base) break;
  value = value * base + digit;
  digits = digits + 1;
  at = at + 1;
}
if (digits === 0) return MathResult(NaN);
// **负号要乘、不要减** ✗（第 330 轮 ✓）：规范写的是 `sign × number` ✓，
// 而 `0 - value` 在 `value === 0` 那一格给的是 **`+0`** ✗——`0 - 0` 是正的 ✓。
// 于是 `parseInt("-0")` 印 `0` ✓（Node 印 **`-0`** ✓，**静默错值** ✓，
// 判据 `c330-std-number-parse-edges` 量的就是它 ✓）。
// **`-1 * 0` 才是 `-0`** ✓——乘法保住了符号位 ✓，而减法把它抹平了 ✗。
// **这一格不能靠 `MathResult` 兜** ✗：它收的是**算完的数** ✓，
// `0 - 0` 到它手上时符号已经没了 ✓（`MathResult(-0)` 自己是对的 ✓，见那一格 ✓）。
return MathResult(negative ? -1 * value : value);
```

# method ParseFloatText:(units:Array<int>)=>Value

**`parseFloat` 的正身**：切出最长的合法前缀 ✓，再**交给宿主**做十进制 → 双精度 ✓
（与 `JsonParseNumber` 同一条理由：正确舍入是 IEEE 754 的活儿 ✓）。

**前缀的文法** ✓：`[+-]? ( Infinity | digits [. digits] [exp] | . digits [exp] )` ✓——
`"1e"` 只吃到 `1` ✓、`"1.5px"` 吃到 `1.5` ✓、`".5"` 是 `0.5` ✓、`"Infinity"` 是无穷 ✓。

```ts
let at = 0;
while (at < units.length) {
  const unit = units[at];
  if (unit === 32 || unit === 9 || unit === 10 || unit === 11 || unit === 12 || unit === 13) {
    at = at + 1;
    continue;
  }
  break;
}
const start = at;
if (at < units.length && (units[at] === 43 || units[at] === 45)) at = at + 1;
// `Infinity` 单独认 ✓（它没有数字位 ✓）。
if (at + 7 < units.length + 1 && units[at] === 73 && units[at + 1] === 110 && units[at + 2] === 102
  && units[at + 3] === 105 && units[at + 4] === 110 && units[at + 5] === 105 && units[at + 6] === 116
  && units[at + 7] === 121) {
  at = at + 8;
  if (units[start] === 45) return MathResult(-Infinity);
  return MathResult(Infinity);
}
let digits = 0;
while (at < units.length && units[at] >= 48 && units[at] <= 57) {
  at = at + 1;
  digits = digits + 1;
}
if (at < units.length && units[at] === 46) {
  const dot = at;
  at = at + 1;
  while (at < units.length && units[at] >= 48 && units[at] <= 57) {
    at = at + 1;
    digits = digits + 1;
  }
  if (digits === 0) at = dot;
}
if (digits === 0) return MathResult(NaN);
// **指数只在后面真跟着数字时才吃** ✓（`"1e"` 该给 `1` ✓）。
if (at < units.length && (units[at] === 101 || units[at] === 69)) {
  let after = at + 1;
  if (after < units.length && (units[after] === 43 || units[after] === 45)) after = after + 1;
  let expDigits = 0;
  while (after < units.length && units[after] >= 48 && units[after] <= 57) {
    after = after + 1;
    expDigits = expDigits + 1;
  }
  if (expDigits > 0) at = after;
}
let literal = "";
for (let i = start; i < at; i++) literal = literal + String.fromCharCode(units[i]);
return MathResult(Number(literal));
```

# const StringConcat:int = 302


**字符串拼接**（第 125 轮）——**它不是全局名** ✓，是**降级层**发的一条内部调用 ✓
（`a + b` 里有字符串字面量时落到这里 ✓，见 `lowering.xl.md` 的 `ConcatValues`）。
与 `DateCtor` 同一类 ✓：号在全局段里 ✓、脚本看不见 ✓、由 `InstallBuiltins` **登记进能力表** ✓
（不登记就报「capability is not registered」✓）。

**它为什么必须存在** ✗：引擎的 `RtOp.Add` 只渲染它认识的那几档 ✓，
遇到**对象 / 数组 / 浮点**会**抛** ✓——而 `"x=" + obj` 这种写法遍地都是 ✓。
「对象渲染成什么」是**语言层**的决定 ✓（`text.xl.md` 的 `ValueUnits` ✓），引擎不认识它 ✗。

**实参两个都要** ✓（JS 的 `+` 是从左到右求值 ✓，降级层已经把两格算好了 ✓）；
结果**一定是字符串** ✓——因为调用点上已经保证「有一边是字符串字面量」✓
（`1 + "x"` 也是 `"1x"` ✓，照 JS 给 ✓）。

# const TemplateConcat:int = 305

**模板串的拼接**（第 288 轮 ✓）——与 `StringConcat` **共用同一支实现** ✓，
只把 hint 从 `default` 换成 **`string`** ✓。

**为什么非得分两格** ✗：JS 里这两件事的 `ToPrimitive` **hint 不同** ✓：

| 写法 | 规范里的第一步 | 先问谁 |
| --- | --- | --- |
| `"x" + o` | `ToPrimitive(o, default)` ✓ | **`valueOf`** ✓ |
| `` `${o}` `` | `ToString(o)` ⇒ `ToPrimitive(o, string)` ✓ | **`toString`** ✓ |

于是 `const a = { valueOf: () => 5, toString: () => "T" }` 上两个答案**必须不同** ✓：
`a + 1` 给 `6` ✓、`` `${a}` `` 给 `"T"` ✓。
本仓原来**两处都走 `StringConcat`** ✗（`default` ✓）⇒ `` `${a}` `` 给 `"5"` ✗——
**静默错值** ✓，判据 `object-valueof-override` 量的就是它 ✓。

**为什么不给 `StringConcat` 加一个「hint 实参」** ✗：那条路的调用方是**降级层的 `+`** ✓
（`ConcatValues` ✓），它永远不需要别的 hint ✓；多一个只被一处用的实参
就是**多一处能传错的地方** ✗（第 283 轮那条：判据分两份迟早走偏 ✓）。
两个号、一支实现 ✓ 才是这一层本来的形状 ✓（`ParseInt` / `String.fromCharCode` 那一族同款 ✓）。


# const StringCtor:int = 220

**`String(x)`** 的能力号（第 145 轮）——**把它当函数调**那一档。

**它为什么一直没做**：`String` 是一个**对象** ✓（上面挂着 `fromCharCode` 与 `prototype` ✓），
而值模型原来只有两半里的各一半 ✓（宿主引用能被调 ✓、对象能带属性 ✓，**两样都占的没有** ✗）。
第 145 轮给堆加了一格**可调用载荷** ✓（`heap.xl.md` 的 `AttachCallable` ✓），
于是 `String` **同时**是这两样 ✓：`String.fromCharCode` 照用 ✓、`String(1)` 也通 ✓、
`typeof String` 报 `"function"` ✓。

**`String()` 与 `String(x)` 的语义**：任意值 → 文本 ✓（走 `text.xl.md` 的 `ValueUnits` ✓，
与 `console.log` 那条**同一个出口** ✓）；不给实参给 `""` ✓（JS 的口径 ✓）。

**已知差异**（写在明处）：`new String(1)` 走的是**调用**那一支 ✓——JS 会给一个**装箱对象** ✗，
而本仓没有装箱那一层 ✓（与「`"x" instanceof String` 一律假」同一条 ✓）。

# const NumberCtor:int = 221

**`Number(x)`** 的能力号（第 145 轮）——JS 的 `ToNumber` ✓。

**它不是 `parseInt` / `parseFloat`** ✗（那两个在下面，各自一条 ✓）：那两条是**前缀**口径
（`parseInt("12px")` 给 `12` ✓），而 `Number("12px")` 给 **`NaN`** ✓——
**整串都得是数** ✓。所以它走 `NumberFromHostText` ✓（`runtime/host-text.xl.md` ✓，
「十进制文本 → 双精度」的唯一一处 ✓），而不是自己写一遍前缀扫描 ✗。

**对象要 `ToPrimitive`** ✓（`Number({})` 在 JS 里是 `NaN` / `Number([])` 是 `0`）——
**第 198 轮做出来了** ✓，所以这一档**不再抛** ✗：`NumberFromValue` 转调引擎的
`ToNumberOf` ✓（一元 `+x` 问的也是它 ✓——**同一个 `ToNumber` 只有一处** ✓）。

# const BooleanCtor:int = 222

**`Boolean(x)`** 的能力号（第 145 轮）。

**它就是 `rt.xl.md` 的 `RtToBoolean`** ✓（`TruthyOf` 的包装 ✓）——
**不是另一个真假口径** ✗：`Boolean("")` 是 `false` ✓，而第 144 轮之前那条口径给 `true` ✗
（那一轮的账在 `typescript-exec/README.md` 里 ✓）。

# const ArrayCtor:int = 223

**`Array(长度)` / `new Array(长度)`** 的能力号（第 145 轮）。

**调用与构造是同一件事** ✓（JS 里两者等价 ✓），所以只有一个号 ✓。

**两种实参形态** ✓（JS 的口径 ✓）：**一个数**是**长度** ✓（`new Array(3)` 给三个洞 ✓，
`0 in arr` 为假 ✓），**其余**（零个或多个）是**元素** ✓（`Array(1, 2)` 给 `[1, 2]` ✓）。

**长度那一档复用 `HeapArray.Truncate`** ✓：它的规矩**本来就是**「变长时新增的格子全是洞」 ✓
（`heap.xl.md` 写着这一条 ✓）——正是 `new Array(n)` 的语义 ✓，不必再写一遍 ✗。

# const ObjectCtor:int = 225

**`Object(x)` / `new Object(x)`** 的能力号（第 232 轮 ✓）。

**JS 里两者给的东西不一样** ✗（这是这一格要记住的第一件事）：
`Object(null)` 是 **`null`** ✓（它把任意值**转成对象**，而 `null` / `undefined` **转出来还是自己** ✓），
`new Object(null)` 是**一个空对象** ✓（构造那条路**永远**给新对象 ✓，实参不参与 ✓）。

**这一轮只做「能证的那一半」** ✓：
- **`Object(x)` 有实参、且 `x` 已经是对象** ⇒ 原样返回 ✓（`Object({a: 1}).a` 是 `1` ✓）；
- **`Object()` 没实参** ⇒ 造一个空对象 ✓；
- **`Object(null)` / `Object(undefined)`** ⇒ 原样返回 `null` / `undefined` ✓；
- **`Object(原始值)`** ⇒ **响亮地抛** ✗。JS 在这里给**包装对象** ✓
  （`Object(1)` 是一个 `Number` 对象 ✓、`typeof` 是 `"object"` ✓），
  而本仓**一个包装对象都没有** ✗（`new Number(1)` 那一族也没做 ✓）——
  **给一个贴了原型的普通对象**是**静默错值** ✗（`typeof` 会是 `"object"` ✓ 而内容不对 ✗），
  所以宁可不做 ✓（与「不能给近似值的那几格」同一条纪律 ✓）。

**它跟 `Array` 一样是「调用与构造同一个号」** ✗——**这是这一轮的已知差** ✓：
本仓的宿主 ABI **不告诉被调方「这一次是 `new` 还是普通调用」** ✗（`HostInvoker` 只有
`(id, self, args)` ✓），所以 `new Object(null)` 与 `Object(null)` 走的是**同一条** ✓。
**它选了「原样返回」那一半** ✓：`Object(null)` 是真答案 ✓，
而 `new Object(null)` 在普通 `.ts` 里**几乎不写** ✓（判据 `global-array-object-ctors`
用的正是 `new Object(null as any) !== null` ✓——**按 JS 那是 `true`** ✗，
所以那一条判据还差**这一格** ✓，缺口写在台账里 ✓）。
**要做对它得先给宿主 ABI 加一位「这次是不是构造」** ✗——那是另一件事 ✓。

# const PowId:int = 224

**`a ** b`（幂）** 的能力号（第 149 轮）——**它不是全局名** ✓，是**降级层**发的一条内部调用 ✓
（与 `StringConcat` 同一类 ✓：号在全局段里 ✓、脚本看不见 ✓、由 `InstallBuiltins` 登记 ✓）。

**为什么它走这一层、不进引擎的算子表** ✗（这是这一轮**特意绕开**的一格 ✓）：
`RtOp.Pow` 那一格**早就留着** ✓（设计期就编了号 ✓），但**幂的舍入没有标准定死** ✗——
IEEE 754 **不要求** `pow` 正确舍入 ✓，所以 V8 的 `Math.pow` 与 C++ 的 `std::pow`
**可能差最后一位** ✓。而 `runtime/host-text.xl.md` 那条规矩是
「**借的必须是结果被标准定死的东西**」✓（十进制 ↔ 双精度那条有 IEEE 754 兜着 ✓）。
把 `pow` 塞进引擎就等于**偷偷破那条规矩** ✗；放在**建库层**就名正言顺 ✓——
这一层本来就是「JS 家族语义 + 一处诚实的宿主借用」✓，而 `Math.pow` **早就在这儿** ✓
（`MathPow` = 212 ✓）。所以 `**` 与 `Math.pow(x, y)` 走**同一行代码** ✓：
JS 的规范本来就说 `**` 的语义**就是** `Math.pow` ✓。

**已知的跨目标差**（写在明处 ✗）：C++ 那一侧的 `std::pow` 可能与 V8 差最后一位 ✓——
与 `host-text.xl.md` 里记的「指数形式写法可能差字符」同族 ✓（P1 对拍时收 ✓）。

```ts
if (id === PowId) {
  // **与 `MathPow` 一字不差** ✓（同一个语义只有一份实现 ✓）。
  return MathResult(Math.pow(NumericOf(args[0]), NumericOf(args[1])));
}
```

# const GeneratorThrowId:int = 711

**「生成器的 `throw`」那一格**（第 313 轮 ✓）——`it.throw(e)` 落到这里 ✓，
实现在**引擎**里 ✓（在挂起点抛 `e` ✓：`vm.xl.md` 的 `ResumeRaises` ✓）。

# const GeneratorSelf:int = 427

**`gen[Symbol.iterator]()`** ✓（第 320 轮 ✓）——与 `AsyncGeneratorSelf` 那一条**同一个形状** ✓：
JS 的口径就是**返回它自己** ✓，所以这一支也只做「把 `self` 交出去」 ✓。

**它是怎么做这一格时顺手量到的** ✓：做完 `Symbol.asyncIterator` 那一格，顺手量了**同步**生成器 ✓
——Node 给 `typeof gen[Symbol.iterator] === "function"` ✓、本仓给 `undefined` ✗，
**同一个缺口**（`for..of` 走指令 ✓、不问这一格 ✓），只是**同步那一半** ✓。
**两格必须分开挂** ✗：同步生成器有 `Symbol.iterator` 而**没有** `Symbol.asyncIterator` ✓；
异步生成器**两个都有** ✓（它继承 `Generator` 那一格 ✓）——所以
`Symbol.iterator` 挂 `Generator` ✓、`asyncIterator` 挂 `AsyncGenerator` ✓。

# const AsyncGeneratorSelf:int = 426

**`asyncGen[Symbol.asyncIterator]()`** ✓（第 320 轮 ✓）——号在**全局段** ✓（`422..425` 是
第 311 轮那四条百分号编解码 ✓，这一格接在它们后面 ✓；它**不是全局名** ✗：脚本里没有
叫这个名字的东西 ✓，只是原型上一格方法的能力号 ✓）。——JS 的口径就是**返回它自己** ✓
（与同步生成器的 `[Symbol.iterator]()` 一样 ✓），所以这里**一行实现都不用写**：
那一支只做「把 `self` 交出去」✓（见 `InvokeGlobal` 里那一句 ✓）。

**为什么这一格值得存在** ✗：`for await` 在**引擎**里走的是指令那条路 ✓
（`iter_new` / `iter_next` ✓），**根本不问这一格** ✓——与第 308 轮
`Array.prototype[Symbol.iterator]` 那一条**一模一样** ✓：`for await` 一直是对的 ✓，
而**显式取出来自己调**报 `it[Symbol.asyncIterator] is not a function` ✗
（那句话听起来像「异步迭代还没做」✗，真相是**没人往这一格挂东西** ✓）。
判据 `c305-ex-async-generator-interface-type` ✓ 钉的就是 `typeof` 那一问 ✓。

**挂在哪一格是**有讲究的** ✗：只挂 `protos.AsyncGenerator` ✓（**不能**挂 `protos.Generator` ✓）
——同步生成器要是也带上它，就会**自称可异步迭代** ✓（JS 里那是 `TypeError` ✓，
**说谎比缺一格更坏** ✗）。

# const GeneratorReturnId:int = 710

**「生成器的 `return`」那一格**（第 313 轮 ✓）——`it.return(v)` 落到这里 ✓，
而它今天**响亮地抛** ✗（要跑 `finally` 链 ✓，而那条链是降级期的构造 ✓，
见 `GeneratorNextId` 那一段 ✓）。

# const SymbolCtor:int = 250

# const SymbolDescription:int = 251

**`s.description`**（第 241 轮 ✓）——**由 `get_prop` 那条路特判** ✓
（符号值不是一个对象 ✗、没有原型那一格 ✓，所以它不能像 `Map` 的 `size` 那样挂在原型上 ✓）。

**回的是字符串或 `undefined`** ✓（见 `InvokeGlobal` 里那一支 ✓）。
**`Symbol(description)`** 的能力号（全局段 200..299 里空着的号）。

**它不是构造函数**：JS 里 `Symbol()` **不带 `new`**（`new Symbol()` 会抛）——
所以它只是一个普通的宿主函数值，走 `Op.Call` 那条路，和 `Map` / `Set`（走 `Op.New`）不同。

# const SymbolFor:int = 252

**`Symbol.for(名字)`**（第 277 轮 ✓）——**全局注册表**：同一个名字永远给**同一个符号** ✓
（`Symbol.for("a") === Symbol.for("a")` 是**真** ✓，而 `Symbol("a") !== Symbol("a")` ✓）。
**这一格是 `Symbol` 与别的构造器最不一样的地方** ✗：别的都要「按身份」✓，
只有它要「**按名字去重**」✓——所以它必须有个地方**记着** ✓。

# const SymbolKeyFor:int = 253

**`Symbol.keyFor(符号)`**（第 277 轮 ✓）——反查 ✓：**注册表里的**给名字 ✓、
其余的给 `undefined` ✓。

**两个号都在 `250..259` 这一段里** ✓（`Symbol` 家族：构造 250 ✓、`description` 251 ✓、
这两个 252 / 253 ✓）——与 `SymbolCtor` 挤在一段读起来顺 ✓。

**注册表放在哪** ✗：`InvokeGlobal` 手里只有 `protos` ✓（没有任何模块级的可变量 ✓，
这一层全是纯函数 ✓），所以注册表得**挂在一个够得着的对象上** ✓——
用的是 `protos.WellKnownSymbols` ✓（第 184 轮那张知名符号表 ✓），
条目**带一个前缀** ✓（理由是「`keyFor` 不能把知名符号认成注册过的」✓，写在实现里 ✓）。

# const SymbolToString:int = 254

**`s.toString()`**（第 277 轮 ✓）——`description` 那一格的**兄弟** ✓，
差别只有「交出去的是一个**能被调的东西**」✗（见 `vm.xl.md` 的 `SymbolToStringId` ✓）。

**为什么它到今天才做** ✗：`String(s)` 一直是好的 ✓（第 215 轮 ✓，那是**转文本**那条路 ✓），
而 `s.toString()` 是**取一格属性再调用** ✗——符号没有原型那一格 ✓，
所以它和 `description` 一样**只能由引擎特判** ✓，而特判那一支要交出一个 `HostRef` ✓
（于是引擎得知道一个**语言层的号** ✗——多一格 `DeclareSymbolToString` ✓，见 `host-abi.xl.md` ✓）。

**判据 `symbol-registry` 量的就是它** ✓（那一句是 `a.toString() === c.toString()` ✓，
第 273 轮普查收进来的 ✓）。

# const ClockNow:int = 260

**`Date.now()` 的能力号——它是一个「必须由宿主回答」的号。**

**建库层不实现它**（所以这里没有它的分支）：谁把 `260` 交出去，谁就要在**自己的**
宿主回调里先认它。这样「时间从哪来」就**只**由宿主决定：

- 固定值 → 判据稳定、可复现；
- 真实时钟 → 客户程序的正常用法（**由客户自己选择**，不是运行器偷偷读）；
- 递增计数器 → 需要「时间会走」的测试。

**没接这一号的宿主会收到 `unimplemented: builtin id 260`**——响亮地失败，
而不是给一个假时间（那会破坏确定性，而且要到很久以后才显形）。

# const DateCtor:int = 265

**`new Date(毫秒)`** 的能力号（第 114 轮补）。

**它不是全局段里那条 `Date.now` 的路**：`Date.now()` 走的是**普通对象属性** ✓
（`BuildGlobals` 把 `ClockNow` 挂成一个属性 ✓），而 `new Date(...)` 在 JS 里是**构造** ✓。
两者在值模型里原来**不能同时成立** ✗——`Date` 是个普通对象 ✓（能挂属性、**不能被 `new`** ✗），
所以第 114 轮把这一支**交给降级层落地** ✓：`new Date(毫秒)` 被降级成一条 `host_call(265, …)` ✓。

**第 145 轮这条特例撤掉了** ✓：`Date` 现在**自己**带一格可调用载荷 ✓
（`heap.xl.md` 的 `AttachCallable` ✓），`new Date(ms)` 走的就是**普通的 `Op.New`** ✓
（`vm.xl.md` 的 `DoNew` 那条宿主分支 ✓）。两个好处写在明处 ✓：

- 降级层少一条「只有直接写 `Date` 才认」的特例 ✓（**那条已知差异没有了** ✓：
  `const D = Date; new D(0)` 现在也对 ✓）；
- `DateCtor` **不再需要登记进能力表** ✓（它不是降级层发的内部调用了 ✓，
  而是**从那个值身上**取出来的 ✓）——`install.xl.md` 的名单里因此去掉了它 ✓。

**剩下的已知差异**：**几百亿以上的毫秒值写不进源码** ✗——整数字面量是 i32 ✓
（与「浮点不能写成源码字面量」同族 ✓）。要喂大值就**用运行时算出来** ✓。

# const DateGetTime:int = 266
`getTime()` 的号（返回毫秒）。
# const DateGetUTCFullYear:int = 267
`getUTCFullYear()` 的号（**UTC**——这一层不碰时区数据 ✓，明确的范围决定 ✓）。
# const DateGetUTCMonth:int = 268
`getUTCMonth()` 的号（**0 起**，与 JS 一致 ✓）。
# const DateGetUTCDate:int = 269
`getUTCDate()` 的号（**1 起**，与 JS 一致 ✓）。
# const DateGetUTCHours:int = 270
`getUTCHours()` 的号（0..23）。
# const DateGetUTCMinutes:int = 271
`getUTCMinutes()` 的号（0..59）。
# const DateGetUTCSeconds:int = 272
`getUTCSeconds()` 的号（0..59）。

**第 280 轮补的九格** ✓（`Date` 家族：`284..292` ✓）——它们围着**日历算术**转 ✓：
`toISOString` ✓（正向 ✓）、七个 `setUTC*` ✓（逆变换 ✓）、以及**静态的 `Date.UTC`** ✓
（也是逆变换 ✓，只是不带接收者 ✓）。
**两个方向都要有** ✗：`DateParts` 从第 138 轮起就给了正向 ✓，而**逆变换一直没有** ✗——
`Date.UTC` 与七个 `setUTC*` 全都要它 ✓（判据 `date-utc-setters` 与 `date-iso-and-json` 量的正是这两半 ✓）。

**为什么从 `284` 起、而不是接着 `272` 往下排** ✗（**这一轮踩到了** ✓）：
`273..279` 确实是空的 ✓，可 **`280` / `281` / `282` / `283` 已经被
`ErrorCtor` / `TypeErrorCtor` / `RangeErrorCtor` / `SyntaxErrorCtor` 占了** ✓——
第一版把这一批排在 `273..281` ✗，于是 `DateUTC` **撞上了 `TypeErrorCtor`** ✓，
而分派表**先问错误构造器那一支** ✓ ⇒ `Date.UTC(2020, 0, 2)` 返回了一个
**`TypeError` 对象** ✓（`console.log` 打出来是 `[Function (anonymous)]` ✓，
而真相是「号撞了」✗，**离现场很远** ✗）。
**这是这一个文件里的老毛病** ✓：第 150 轮 `ArrayAt = 22` 撞上 `ArrayFlat = 22` 是同一个形状 ✓
（那一次是 `flat()` 静默给 `undefined` ✓）。**规避办法只有一条** ✓：
加号之前**把这一段已经用掉的号看一遍** ✓，而 `# const` 那一串就是那份名单 ✓。
**从 `284` 起整段排** ✓ 就绕开了那四格 ✓，而且读起来也顺 ✓（「错误家族之后是日期家族」✓）。

# const DateToISOString:int = 284

**`Date.prototype.toISOString`**（第 280 轮 ✓）——`DateIsoText` 的正身 ✓。
**`toJSON` 指到同一个号** ✓（JS 里 `Date.prototype.toJSON` 对合法日期给的就是那一串 ✓——
同一件事不写第二份实现 ✓，与数组的 `toString` = `join` 同款 ✓）。

# const DateSetUTCFullYear:int = 285

# const DateSetUTCMonth:int = 286

# const DateSetUTCDate:int = 287

# const DateSetUTCHours:int = 288

# const DateSetUTCMinutes:int = 289

# const DateSetUTCSeconds:int = 290

# const DateSetUTCMilliseconds:int = 291

**七个 `setUTC*`**（第 280 轮 ✓）——**一个模板套七次** ✓（见下面那一支 ✓）。

**它们与 `getUTC*` 是同一件事的两面** ✓：读那一半第 138 轮就有了 ✓，
写这一半原来**整族不在** ✗（`typeof d.setUTCFullYear` 给 `undefined` ✓）。

# const DateUTC:int = 292

**静态的 `Date.UTC(年, 月?, 日?, 时?, 分?, 秒?, 毫秒?)`**（第 280 轮 ✓）——
**与七个 `setUTC*` 是同一条逆变换** ✓，差别只有「没有接收者」✓（它不读当前值 ✓、
缺的那几格按 JS 的默认值补 ✓）。

**它的默认值与 `new Date(...)` 那一条不同** ✗（`月` 缺省 `0` ✓、`日` 缺省 `1` ✓、
`时/分/秒/毫秒` 缺省 `0` ✓），而**年份的 `0..99` 要加 1900** ✓（JS 的口径 ✓）。

# const DateParse:int = 368

**静态的 `Date.parse(文本)`**（第 293 轮 ✓）——号**追加在表尾** ✓。

**收的是 ISO 8601 的一个最小子集** ✓：`YYYY-MM-DD` ✓、`YYYY-MM-DDTHH:mm` ✓、
`…:ss` ✓、`…:ss.sss` ✓，后面可跟 `Z` ✓ / `±HH:mm` ✓ / 什么都不跟 ✓。
**其余形状一律给 `NaN`** ✓（不猜 ✗——`"Jan 1 2020"` / `"2020/01/02"` 这一族要么是本地化的、
要么歧义 ✓，编一个答案就是**静默错值** ✓）。
**`new Date(字符串)` 走的是同一条** ✓（见 `DateCtor` ✓）。

# const DateToString:int = 369

**`Date.prototype.toString`**（第 293 轮 ✓）——号**追加在表尾** ✓。

**只做「非法日期」那一档** ✓：JS 的 `String(new Date(NaN))` 是 **`"Invalid Date"`** ✓，
而它**与时区无关** ✓（所以这一档能逐字节对上 ✓）。
**合法日期那一条仍旧响亮地抛** ✓：JS 给的是**本地时区**的一串
（`Thu Jan 01 1970 08:00:00 GMT+0800 (China Standard Time)` ✓），
它**随机器变** ✗——编一个出来只会让「本机对、别处错」✓（判据 `date-invalid-values`
只量了 `NaN` 那一档 ✓，所以**只做那一档** ✓）。

# const DateGetUTCMilliseconds:int = 370

**`getUTCMilliseconds` / `getMilliseconds`**（第 293 轮 ✓）——号**追加在表尾** ✓。
它与 `getUTCSeconds` 同一族 ✓，只是**那一格以前没人要** ✗（`DateClockParts` 早就给了 ✓）。

# const DateGetUTCDay:int = 371

**`getUTCDay` / `getDay`**（第 293 轮 ✓）——**星期几** ✓（`0` = 周日 ✓）。
**它是从纪元起的天数对 7 取模** ✓（`1970-01-01` 是**周四** ⇒ `0` 对应周四 ✓，
所以要先 `+4` 再取模 ✓）——**这个偏移写错就是静默错一天** ✓，判据 `date-getters-and-setters`
钉着它 ✓。

# const ReferenceErrorCtor:int = 326

**`ReferenceError`**（第 295 轮 ✓）——号**追加在表尾** ✓（`280..283` 那一段已经占了四个 ✓）。

**它是「等有判据了再补」那条规矩的例子** ✓：第 277 轮补 `SyntaxError` 时，
`props.xl.md` 那一格明写着「剩下三个名字（`ReferenceError` / `URIError` / `EvalError`）
**没有判据** ✓，所以先不占名字」✓——第 295 轮判据来了 ✓
（`c291-error-families-and-messages` 把五个族排在一起 ✓），于是照规矩补上 ✓。

# const AggregateErrorCtor:int = 327

**`AggregateError(内层数组, 消息?)`**（第 295 轮 ✓）——号**追加在表尾** ✓。

**它与其余几个只差一格** ✓：第一个实参是**内层那个数组** ✓（挂成不可枚举的 `errors` ✓），
消息是**第二个** ✓（不是第一个 ✗）——所以它**不能**直接落进
`ErrorCtorName` / `ErrorCtorProto` 那一支的实参解析里 ✓（那一支的第一个实参是消息 ✓）。
**`Promise.any` 也用它** ✓（全部被拒绝时抛的就是它 ✓）。

# const ObjectGroupBy:int = 328

**`Object.groupBy(可迭代, 回调)`**（第 295 轮 ✓）——号**追加在表尾** ✓。

# const ObjectKeys:int = 401

`Object.keys` 的能力号（`Object` 段从 400 起）。
# const ObjectValues:int = 402

`Object.values` 的能力号（第 120 轮补）。

# const ObjectEntries:int = 403

# const ObjectDefineProperty:int = 405

**`Object.defineProperty(对象, 键, 描述符)`**（第 182 轮）——**只做数据属性那一半** ✓。

**它就是把属性表里那一格的标志位写下来** ✓：本仓的属性早就有
`enumerable` / `writable` / `configurable` 三个标志 ✓（`heap.xl.md` ✓），
而 `SetProperty` / `DeleteProperty` **照着它们抛** ✓（`props.xl.md` ✓）——
所以这一格**不需要任何引擎改动** ✓：找到那一格（没有就新建 ✓）→ 写值 + 写标志 ✓。

**JS 的默认值是三个 `false`** ✓（少给哪个字段就是 `false` ✓，不是「保持原样」✗）——
这一条容易写反 ✓，判据里钉着它 ✓。

**访问器描述符（`get` / `set`）响亮地抛** ✗：那要造访问器属性 ✓（`props.xl.md` 有那一格 ✓），
但「把描述符里的函数值挂成访问器」是另一件事 ✓，单独立一轮 ✓。

# const ObjectFreeze:int = 406

**`Object.freeze(对象)`**（第 182 轮）——**把自有数据属性的 `writable` 清掉** ✓。

**它同样一个引擎改动都不用** ✓：`SetProperty` 见到不可写的属性**本来就会抛** ✓
（`props.xl.md` 第 442 行那一格 ✓），所以冻结只需要把标志位改掉 ✓。
**返回的是那个对象本身** ✓（JS 的口径 ✓）。

**两处已知缺口写在明处** ✗：**数组元素**不在属性表里 ✓（它们在密集元素区 ✓），
所以 `Object.freeze([1, 2])` 之后 `a[0] = 5` **照样写得进去** ✗——元素区没有标志位 ✓；
以及**「不可扩展」**没做 ✗（往冻结对象上**加**新属性仍然可以 ✓）。
两件都是「要动引擎」的活 ✓，这一轮不做 ✓、也不假装做了 ✓。

# const ObjectAssign:int = 404

**`Object.assign(目标, …来源)`** 的号（第 130 轮）。

**它读的是「**自有可枚举**」那一张表** ✓（与 `keys` / `values` / `entries` 同一张 ✓）——
**访问器被跳过** ✓（那三个的口径 ✓：这一层不调 getter ✗，记在台账 ✓）。
**返回的就是那个目标对象本身** ✓（JS 的口径 ✓，不是拷贝 ✓）。
**不许把原始值当目标** ✓：JS 会**装箱**（`Object.assign(1, {a:1})` 给一个 Number 对象 ✗），
而本仓没有装箱那一层 ✓——**响亮地抛**比静默返回一个数好 ✓。
消息以 `unimplemented: ` 开头 ✓（判据钉着这一条 ✓：这一层所有「没做」的话都同一个开头 ✓，
用户与判据都不必去猜哪几句是「没做」✗）。

`Object.entries` 的能力号（第 120 轮补）。

**三个方法的共同口径**：只看**自有**的**字符串键**属性 ✓（JS 的 `Object.keys` 就是这个口径 ✓），
**访问器一律跳过** ✗——读它要**重入执行器**（那是一个 `NativeCall`，而这一块的签名里没有它 ✓），
与 `JsonText` 里那条「访问器跳过」同一条理由 ✓。
**与 `Object.keys` 的差别**：`keys` **不**跳过访问器（它只取名字，JS 也是这个口径 ✓）；
`values` / `entries` 要**读值**，所以只能跳过 ✗——这一条写在明处，不假装它读到了 getter。

# const ErrorCtor:int = 280

**`Error` 的能力号**（第 120 轮补；200..299 这一段里的空号）。

**它是构造函数，也是普通函数** ✓：JS 里 `new Error("x")` 与 `Error("x")` 给的是**同一种东西**
（后者不 `new` 也返回一个新对象 ✓）。走 `Op.New` 时引擎按「宿主构造函数」那条分支调它 ✓，
走 `Op.Call` 时就是一次普通宿主调用 ✓——**同一个号、同一支实现**，两条路天然都通 ✓。

**它造的是一个普通对象**（不是 `Map` / `Set` 那种带内部格的）✓：`message` 与 `name` 两个
数据属性 ✓——这正好是 `RunDescribe`（命令行打印抛出的值）认的那一格 ✓。
**原型挂在 `Protos.Error` 上** ✓（第 137 轮补）：`e instanceof Error` 靠的就是它 ✓
（`NewError` 那一段写着为什么 ✗）。
**没有 `stack`** ✗：那是宿主（V8）的事，这一层给不出来 ✓，也不该假装给一个。

# const TypeErrorCtor:int = 281

**`TypeError` 的能力号**（第 137 轮）。

**它比 `Error` 只多两件事** ✓：原型是**另一格** ✓（`Protos.TypeError` ✓，它自己的原型是
`Error.prototype` ✓），以及 `name` 是 `"TypeError"` ✓。其余一字不差 ✓——
所以两支共用一个 `NewErrorLike` ✓（复制一份的下场是「改了一处忘了一处」✗）。

**为什么要它** ✗：`catch (e) { if (e instanceof TypeError) … }` 是**日常写法** ✓，
而引擎自己抛的那些（`null.y` ✓、`undefined[0]` ✓）在 JS 里**正是 `TypeError`** ✓。

# const RangeErrorCtor:int = 282

**`RangeError` 的能力号**（第 137 轮）——与 `TypeError` 同款 ✓（同一支实现、换原型与名字 ✓）。

# const SyntaxErrorCtor:int = 283

**`SyntaxError` 的能力号**（第 277 轮 ✓）——与 `TypeError` / `RangeError` 同款 ✓
（同一支实现、换原型与名字 ✓）。

**为什么第 277 轮才补它** ✗：这一族原来三个成员 ✓，而判据要的是第四个 ✓——
`JSON.parse("oops")` 抛的是 `SyntaxError` ✓，脚本里那个
`catch (e) { e instanceof SyntaxError }` 于是**没有落点** ✗
（`protos` 里没有那一格 ✓ ⇒ 引擎连「该找什么」都不知道 ✓）。
**顺带修掉一条更基础的** ✗：`SyntaxError` 原来**不在 `GlobalNames` 里** ✓，
所以 `typeof SyntaxError` 在**降级期**就报 `name is not a local or a capture: SyntaxError` ✓
——那句话听起来像脚本写错了变量名 ✗，其实是名单少了一个名字 ✓
（与第 145 轮的 `Boolean` 一模一样 ✓）。

# const JsonStringify:int = 501

`JSON.stringify` 的能力号（`JSON` 段从 500 起）。

# const JsonParse:int = 502

**`JSON.parse` 的能力号**（第 122 轮补）。

**它能做，是因为上一轮铺了那条路** ✓：坏输入是**脚本接得住**的异常 ✓——
在此之前，这里唯一能做的「报错」是抛宿主异常 ✗，那会把整份程序打断，
于是 `try { JSON.parse(text) } catch { … }` 这种**日常写法接不住** ✗（宁可缺也不这么给 ✗）。

**数字按双精度解析** ✓（JSON 的规矩就是双精度 ✓）：整数落在 `i32` 里给 `Int32` ✓、
其余给 `Float64` ✓（与 `MathResult` / 引擎的 `MakeNumber` 同一条口径 ✓）。
**代价写在明处**：`Float64` 今天**没有文本形态** ✗（`TextUnitsOf` 对它抛 ✓）——
所以 `JSON.parse("1.5")` 算得动、`console.log` 打不出来 ✓。这是**浮点文本形态**那一块的账 ✓，
不是 `parse` 少做了哪一步 ✗。

# const MaxJsonDepth:int = 64

序列化深度上限。

**为什么用深度而不是「查环」**：真正的环检测要**记住访问过的对象**（一份身份集合），
那是另一件事；而**深度上限**把「环」与「太深的结构」都变成**一条可捕获的错误**。
代价写在明处：**一个刻意做得很深（但无环）的结构也会被拒**。

**解析那一侧也用它**（第 122 轮）✓：`parse` 是**递归**的（宿主递归 ✓），
而宿主栈溢出**不可捕获** ✗（`README` 的硬性约定第 2 条 ✓）——
所以深度上限在这里是**安全要求**，不是风格选择 ✓。

# method GlobalNames:()=>Array<string>

**这一层提供给模块的全局名**。降级器拿它去声明名字，宿主拿它去建环境对象——
**两边用的是同一张名单**（所以不会出现「声明了却没提供」）。

**`undefined` 也在名单里**：它不是关键字，而是**全局对象上的一个只读属性**
（`globalThis.undefined` 真的存在）——所以它走的是**同一条路**，
不必在降级器里为它开一个特例（特例意味着「别的地方也得记得它」）。

**`Boolean` 是第 145 轮加进来的** ✓：它原来**只在名单之外** ✗，
于是 `Boolean(0)` 在**降级期**就报 `name is not a local or a capture: Boolean` ✓
（那句话听起来像脚本写错了变量名 ✗，其实是名单少了一个名字 ✓）。
**名单与 `BuildGlobals` 是同一份约定** ✓（名单里有、`BuildGlobals` 没挂 ⇒
「声明了却没提供」✗，判据里量着这一条 ✓）。

```ts
return ["undefined", "Math", "console", "Object", "JSON", "Map", "Set", "Symbol", "Date", "Error", "TypeError",
  "RangeError", "SyntaxError", "Array", "Number", "String", "Boolean", "Promise", "Function", "parseInt",
  "parseFloat", "NaN", "Infinity", "isNaN", "isFinite", "globalThis",
  // **第 311 轮补的四个名字** ✓（`encodeURI` ✓ / `encodeURIComponent` ✓ /
  // `decodeURI` ✓ / `decodeURIComponent` ✓）——**名单与 `BuildGlobals` 是同一份约定** ✓，
  // 四条都**两边一起**加了 ✓（少一边就是「声明了却没提供」✗，判据里量着这一条 ✓）。
  "encodeURI", "encodeURIComponent", "decodeURI", "decodeURIComponent",
  // **第 295 轮补的四个名字** ✓（`ReferenceError` ✓ / `AggregateError` ✓ /
  // `WeakMap` ✓ / `WeakSet` ✓）——**名单与 `BuildGlobals` 是同一份约定** ✓，
  // 四条都**两边一起**加了 ✓（少一边就是「声明了却没提供」✗，判据里量着这一条 ✓）。
  "ReferenceError", "AggregateError", "WeakMap", "WeakSet",
  // **第 332 轮补的一个名字** ✓（`queueMicrotask` ✓）——**名单与 `BuildGlobals` 是同一份约定** ✓，
  // 两边一起加 ✓（少一边就是「声明了却没提供」✗）。
  // **它的号落在承诺那一段的尾巴上** ✗（`promise.xl.md` 的 `PromiseQueueMicrotask = 250` ✓）——
  // 理由写在那一段 ✓：它要的那条通道（`schedule` ✓）只有那里有 ✓。
  // **名字与号不是一个东西** ✓：号只是路由的键 ✓，挂在哪儿是这一层的事 ✓。
  "queueMicrotask"];
```

**`Function` 是第 228 轮加进来的** ✓（与 `Boolean` / `Promise` 那两条同一个理由 ✓）：
名单里没有它，`Function.prototype` 这个写法在**降级期**就报
`name is not a local or a capture: Function` ✓——那句话听起来像脚本写错了变量名 ✗，
其实是名单少了一个名字 ✓。**它同时是「`f.call` 那条路」的另一半** ✓
（前一半是闭包身上的 `Proto` ✓，见 `vm.xl.md` 的 `MakeClosure` ✓）。

**`Promise` 是第 185 轮加进来的** ✓（与 `Boolean` 那条同一个理由 ✓）：
名单里没有它，`Promise.resolve(1)` 在**降级期**就报
`name is not a local or a capture: Promise` ✓——那句话听起来像脚本写错了变量名 ✗，
其实是名单少了一个名字 ✓。

**`isNaN` / `isFinite` 是第 149 轮加进来的** ✓：它们与 `Number.isNaN` / `Number.isFinite`
**不是一回事** ✗——全局那两个**先做 `ToNumber`** ✓（`isNaN("abc")` 是 `true` ✓、
`isFinite("3")` 是 `true` ✓），而 `Number.isNaN("abc")` 是 `false` ✓（它只认真正的 `NaN` ✓）。
两份都要有 ✓，而且**实现要分开写** ✓（写成一份就是「一半对」✓）。

**`globalThis` 也是第 149 轮加进来的** ✓，而且它**指向那个环境对象自己** ✓
（`globalThis.Math === Math` ✓）。加它是因为 `typeof` 那一格的新规矩
（未声明的名字给 `"undefined"` ✓，第 149 轮 ✓）会让 `typeof globalThis` 给
**`"undefined"`** ✗——而它在 Node 里是 `"object"` ✓，那是一处**静默**的不一致 ✗。
**剩下的同类差异写在明处** ✗：`typeof process` / `typeof require` / `typeof setTimeout`
这些**宿主专有**的名字，Node 给 `"object"` / `"function"` ✓，本仓给 `"undefined"` ✗——
本仓的全局对象是**故意小的** ✓（宿主能力走能力表 ✓，不往脚本作用域里塞 ✓）。

# method NumericOf:(value:Value)=>float

取数值；不是数值就抛（与 `rt.xl.md` 的同名函数**不是一回事**：
那个在引擎里、按引擎的口径，这个是建库层对**参数**的检查）。

```ts
if (value.Tag === ValueTag.Int32) return value.Int;
if (value.Tag === ValueTag.Float64) return value.Dbl;
throw new Error("this method needs a number");
```

# method PropertyKeyOf:(table:HeapTable, value:Value)=>Value

**一个值当属性键用** ✓（第 214 轮 ✓）：字符串照原样 ✓、**符号也是键** ✓（它的身份就是键 ✓）、
其余先 `ToString` ✓（`{1: "a"}` 的键是 `"1"` ✓，与 JS 的 `ToPropertyKey` 一致 ✓）。

```ts
if (value.Tag === ValueTag.String || value.Tag === ValueTag.Symbol) return value;
return Value.FromString(table.CreateString(Units(TextFrom(table, value))));
```

# method IsIndexKeyText:(text:string)=>bool

**这个键文本是不是 JS 的「数组下标」** ✓（第 210 轮 ✓）——也就是
**规范数字串**：全是数字 ✓、没有前导零（`"0"` 自己除外 ✓）、值 `< 2^32 - 1` ✓。

**它决定次序** ✓（`Object.keys` 里整数样的键排在最前、升序 ✓）——
所以判据要比 JS 严 ✗：`"01"` / `"1.5"` / `"-1"` / `"1e3"` **都不是**下标键 ✓
（它们按普通字符串排在后面 ✓，与 JS 一致 ✓）。

```ts
if (text.length === 0) return false;
if (text.length > 1 && text[0] === "0") return false;
for (let i = 0; i < text.length; i++) {
  const code = text.charCodeAt(i);
  if (code < 48 || code > 57) return false;
}
return Number(text) < 4294967295;
```

# method IndexKeyPositions:(table:HeapTable, target:Value)=>Array<int>

**这个值有哪些「下标自有键」** ✓（第 210 轮 ✓）——给的是**位置本身** ✗ 不是个数 ✓：
`[1, , 3]` 给 `[0, 2]` ✓（JS 的 `Object.keys` 就是 `["0","2"]` ✓）。

**第一版给的是「个数」** ✗（`[1, , 3]` 给 `2` ✓），于是调用方按 `0 .. 个数-1` 造键 ✓ ⇒
`["0","1"]` ✗——**洞后面的那个键位移了** ✗。这一类错误很安静 ✓（长度对得上 ✓），
所以判据里那条 `Object.keys(xs).join(",")` 是**专门钉它**的 ✓。

数组是**跳过洞**的位置 ✓、字符串是每个码元 ✓、其余是空 ✓。

```ts
const positions: number[] = [];
if (target.Tag === ValueTag.Array) {
  const items = table.Get(target.Ref).AsArray();
  for (let i = 0; i < items.GetLength(); i++) {
    if (items.IsHole(i)) continue;
    positions.push(i);
  }
  return positions;
}
if (target.Tag === ValueTag.String) {
  const textUnits = table.Get(target.Ref).AsString().Units;
  for (let i = 0; i < textUnits.length; i++) positions.push(i);
  return positions;
}
return positions;
```

# method IndexKeyValueAt:(room:RoomChecker, table:HeapTable, target:Value, index:int)=>Value

**下标键上那个值** ✓（第 210 轮 ✓）：数组的元素 ✓、字符串的那**一个码元**（新串 ✓）✓。

**`Object.values([1, 2])` 在 JS 里是 `[1, 2]`** ✓——所以数组这一支就是 `GetAt` ✓
（调用方已经跳过了洞 ✓，走不到「洞」那一格 ✓）。

```ts
if (target.Tag === ValueTag.Array) return table.Get(target.Ref).AsArray().GetAt(index);
const units = table.Get(target.Ref).AsString().Units;
if (!room(ObjectCharge + CodeUnitCharge)) throw new Error("out of room");
return Value.FromString(table.CreateString([units[index]]));
```

# method MathArgOf:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, value:Value)=>float

**`Math.*` 的实参口径**（第 206 轮 ✓）：JS 对它们先做 **`ToNumber`** ✓——
`Math.floor("2.5")` 是 `2` ✓、`Math.max(1, "9")` 是 `9` ✓、`Math.abs(true)` 是 `1` ✓、
`Math.floor(undefined)` 是 `NaN` ✓（**不抛** ✓）。

**它与 `NumericOf` 不是一回事** ✗：那个是**这一层的参数检查** ✓（只认 Int32 / Float64 ✓，
别的点名抛 ✓）——对 `toFixed` 的位数那种实参是对的 ✓，对 `Math` 是错的 ✗。
原来 `Math` 那一族用的正是 `NumericOf` ✗，于是 `Math.floor("2.5")` 抛
`this method needs a number` ✓（判据 `math-isnan-family` 现场红的 ✓）。

**转换那张表只有一份** ✓（引擎的 `ToNumberOf` ✓，第 198 轮把它与 `ToPrimitive` 收到了一处 ✓），
所以这里**转调它** ✓：对象那一支（`ToPrimitive` → 可能调脚本 ✓）也跟着对 ✓。

```ts
return ToNumberOf(room, call, protos, table, value);
```

# method MathResult:(value:float)=>Value

把算出来的数值变成 `Value`：**整的给 Int32，不是整的给 Float64**。

**这一格现在转调引擎的 `MakeNumber`** ✓（第 206 轮 ✓）——原来它**自己抄了一遍**
那条判据 ✗，抄漏的是**负零** ✗：`Math.min(-0, 0)` 在 JS 里给 `-0` ✓（`1 / -0` 是 `-Infinity` ✓），
而这一格把它收成 `Int32 0` ✓ ⇒ `console.log` 打的是 `0` ✗（node 打 `-0` ✓）。
`MakeNumber` 的注释里写着它为什么必须单独判 `-0` ✓（第 129 轮 ✓），
所以这里**一个字都不该自己写** ✓——同一件事不写两份答案 ✓。

```ts
return MakeNumber(value);
```

# method NumberFromValue:(room:RoomChecker, call:NativeCall | null, table:HeapTable, protos:Protos, value:Value)=>Value

**`Number(x)` 的语义**（第 145 轮）——**第 198 轮起它就是引擎的 `ToNumber`** ✓。

**这一格原来自己写了一半** ✗：数 / 布尔 / `null` / `undefined` / 字符串各一档 ✓，
**对象那一档抛** ✓（理由是「要 `ToPrimitive`，没做」✓）。第 198 轮把整张表
（含对象那一支 ✓）做进了 `rt.xl.md` 的 `ToNumberOf` ✓，所以这里**转调**它 ✓——
**同一件事不写两份答案** ✓。

**为什么这条比「顺手补上对象那一档」更要紧** ✓：`Number([])` 是 `0` ✓、`Number({})` 是 `NaN` ✓，
而这两格的答案来自 `ToPrimitive` 那两步 ✓（`[].toString()` 是 `""` ✓、
`({}).toString()` 是 `"[object Object]"` ✓）。两处各写一遍的话，
`Number([])` 与 `+[]` 早晚会给**两个答案** ✗——而它们在**任何** JS 引擎里都必须是同一个 ✓。

**收窄仍旧归 `MakeNumber`** ✓：`ToNumberOf` 给的是宿主双精度 ✓，`-0` 的符号位在这一步保住 ✓
（`Object.is(Number("-0"), -0)` 为真 ✓）——`MathResult` 会把 `-0` 收成 `Int32 0` ✗，
所以这一格**不能**用它 ✓。

```ts
return MakeNumber(ToNumberOf(room, call, protos, table, value));
```

# method InvokeGlobal:(room:RoomChecker, call:NativeCall | null, table:HeapTable, protos:Protos, id:int, self:Value, args:Array<Value>, sink:LogSink, failed:CallFailed | null = null, constructing:bool = false)=>Value

**全局内建的分派与实现**。

`Math.floor` / `abs` / `max` / `min` 各一行；`console.log` 把实参 `ToString` 之后
**用空格接成一行**、**一次**交给 `sink`（见 `LogSink` 那一段：粒度是行，不是实参）。

**为什么要原型表**：`Object.keys` 返回的是**新数组**，而新数组必须带**数组原型**
（否则结果连 `.join` 都没有——那等于返回了一个「长得像数组但不是」的东西）。
这是全局段里唯一需要它的地方，写在签名里而不是塞进某个全局变量。

**四个「当函数调」的全局名也在这里**（第 145 轮 ✓）：`String(x)` / `Number(x)` /
`Boolean(x)` / `Array(n)` ✓——它们的值是**对象** ✓，能被调是因为身上带了一格载荷 ✓
（`heap.xl.md` 的 `AttachCallable` ✓），而**落到哪一段代码**由这一层的号决定 ✓
（引擎不认识 `String` 这几个字母 ✗，与 `Map` / `Set` 同一条分界 ✓）。

```ts
if (id === StringCtor) {
  // **`String()` 给空串、`String(undefined)` 给 `"undefined"`** ✓——两格不一样 ✓，
  // 所以不给实参这一支要**先判**（`ValueUnits` 对 `undefined` 给 `"undefined"` ✓，
  // 那是 `String(x)` 的答案 ✓，不是 `String()` 的 ✓）。
  if (args.length === 0) {
    const empty = Value.FromString(table.CreateString([]));
    return constructing ? MakeStringBox(room, table, protos, empty) : empty;
  }
  // **`String(符号)` 是一条特例** ✓（第 215 轮 ✓）：JS 在这里**不走 `ToPrimitive`** ✗
  //（走的话会得到 `Symbol(…)` 的字符串化 **之前**就抛 ✓）——`String(sym)` 给
  // **`"Symbol(描述)"`** ✓，没有描述就给 `"Symbol()"` ✓。
  // 而**别的路径**（`"x" + sym` ✓、`` `${sym}` `` ✓、`sym.toString()` ✓）在 JS 里**一律抛** ✓——
  // 那条规矩**不动** ✓（本仓也是抛的 ✓，见 `TextUnitsOf` ✓）。
  if (args[0].Tag === ValueTag.Symbol) {
    const symRecord = table.Get(args[0].Ref).AsSymbol();
    let symText = "Symbol()";
    if (symRecord.Description !== 0) {
      symText = "Symbol(" + HostUnitsText(table.Get(symRecord.Description).AsString().Units) + ")";
    }
    if (!room(ObjectCharge + CodeUnitCharge * symText.length)) throw new Error("out of room");
    const fromSymbol = Value.FromString(table.CreateString(Units(symText)));
    return constructing ? MakeStringBox(room, table, protos, fromSymbol) : fromSymbol;
  }
  // **`String(o)` 就是 `ToPrimitive(o, "string")` 再取文本** ✓（第 213 轮收口 ✓）。
  //
  // **它原来只问「对象自己的 `toString`」** ✗（第 193 轮那一处 ✓）：那对
  // `class C { toString() {…} }` 是够的 ✓，但**原型链上的 `toString` 看不见** ✗——
  // `String(new Error("m"))` 于是印 `"[object Object]"` ✗（JS 印 `"Error: m"` ✓，
  // 判据 `error-tostring` 现场红的 ✓），而**同一条 `new Error("m")` 的
  // `"" + e` / `` `${e}` `` 却是对的** ✓（它们走 `StringConcat` ✓，第 203 轮已经收口到那张表上 ✓）——
  // **同一件事两个答案** ✗，这一轮把它也接到 `ToPrimitiveOf` 上 ✓。
  //
  // **`hint` 是 `string`** ✓（`ToString` 的口径 ✓）：先 `toString` ✓、后 `valueOf` ✓。
  // **原始值不受影响** ✓（`ToPrimitiveOf` 对它们给回自己 ✓，`TextUnitsOf` 照样给文本 ✓）。
  //
  // **一处变响的已知差异** ✓：`String(new Date(0))` 现在会**抛**
  // `unimplemented: ToPrimitive of a Date with a string hint` ✓（`Date.prototype.toString`
  // 还没装 ✓）——原来它静默印 `"[object Object]"` ✗。**抛比静默错值好** ✓（台账里记着 ✓）。
  const stringUnits = JsTextUnits(table, ToPrimitiveOf(room, call, protos, table, args[0], ToPrimitiveString));
  if (!room(CodeUnitCharge * stringUnits.length + ObjectCharge)) throw new Error("out of room");
  const primitive = Value.FromString(table.CreateString(stringUnits));
  // **`new String(x)` 给的是包装对象** ✓（第 310 轮 ✓）——与 `Number` / `Boolean` 那两族
  // 同一个形状 ✓（`typeof` 给 `"object"` ✓、`valueOf` 给回原值 ✓）。
  if (constructing) return MakeStringBox(room, table, protos, primitive);
  return primitive;
}
if (id === NumberCtor) {
  // **不给实参给 `0`** ✓（JS 的 `Number()` 是 `0` ✓，不是 `NaN` ✗）。
  const converted = NumberFromValue(room, call, table, protos, args.length > 0 ? args[0] : Value.FromInt(0));
  // **`new Number(x)` 给的是包装对象** ✓（第 310 轮 ✓）。
  if (constructing) return MakeBox(room, table, protos, protos.Number, converted);
  return converted;
}
if (id === BooleanCtor) {
  // **不给实参给 `false`** ✓，走的是**唯一那条真假口径** ✓（第 144 轮的 `TruthyOf` ✓）。
  // **`new Boolean(x)` 给的是「包装对象」** ✓（第 232 轮 ✓）：JS 里
  // `Boolean(false)` 是**假** ✓、`new Boolean(false)` 是**真** ✓
  //（`typeof` 是 `"object"` ✓，而且**任何对象都是真** ✓——`ToBoolean` 那一支最后一行就是它 ✓）。
  // 判据 `global-boolean` 现场钉着这一句 ✓：它最后一项是 `Boolean(new Boolean(false) as any)` ✓，
  // 期望 `true` ✓（**不是** `false` ✗）。
  //
  // **本仓没有「包装对象」那一档** ✓（`Number` / `String` 也没有 ✓）——
  // 所以这里给的是一个**普通对象 + 一格隐藏的原值** ✓（`__b` ✓，用 `SetHiddenProperty` ✓：
  // 它**不能**是可枚举的自有属性 ✓，否则 `Object.keys(new Boolean(1))` 当场给 `["__b"]` ✗，
  // 而 JS 给 `[]` ✓——**静默错值** ✗）。
  // **已知差** ✗：`String(new Boolean(false))` 在这里给 `"[object Object]"` ✓，
  // 而 JS 给 `"false"` ✓（那要 `Boolean.prototype.toString` / `valueOf` 那一族 ✓）。
  // **它比「静默按假算」好** ✓：真假这一档是对的 ✓，缺的是**原始值的那两个方法** ✓。
  // **第 310 轮把那一族补上了** ✓：箱有了**自己的原型** ✓（`protos.Boolean` ✓）、
  // 两个方法在原型上 ✓、而且它们都先**脱箱** ✓ ——`String(new Boolean(false))` 现在给 `"false"` ✓。
  if (constructing) {
    // **里面那一格存的是 `RtToBoolean` 的答案** ✓（它是**值**不是宿主 `bool` ✓）——
    // 直接存 `Value.FromBool(…)` 是编译不过的 ✗（那一句是「类型当场拦下来」的好例子 ✓）。
    const inner = RtToBoolean(table, args.length > 0 ? args[0] : Value.Undefined());
    return MakeBox(room, table, protos, protos.Boolean, inner);
  }
  return RtToBoolean(table, args.length > 0 ? args[0] : Value.Undefined());
}
if (id === ObjectCtor) {
  // **`Object()` / `Object(x)` / `new Object(x)`** ✓（第 232 轮 ✓）：
  // 见 `ObjectCtor` 那一段里「这一轮只做能证的那一半」那一节 ✓——
  // **原始值那一档响亮地抛** ✗（本仓没有包装对象 ✓，不静默给近似值 ✗）。
  //
  // **构造那一档先判** ✗（次序是语义 ✓）：JS 里 `new Object(x)` **永远给新对象** ✓，
  // 实参**完全不参与** ✓——所以 `new Object(null)` 是 `{}` 而**不是** `null` ✓
  //（判据 `global-array-object-ctors` 钉的就是这一句 ✓：
  // `new Object(null as any) !== null` 在 JS 里是 `true` ✓）。
  if (constructing) {
    return NewPlainObject(room, table, protos);
  }
  if (args.length === 0) {
    return NewPlainObject(room, table, protos);
  }
  const only = args[0];
  // **对象原样返回** ✓（`Object({a: 1}) === 那一个对象` ✓，JS 的口径 ✓）。
  if (only.IsObject()) return only;
  // **`null` / `undefined` 也原样返回** ✓（`Object(null)` 是 `null` ✓）。
  if (only.Tag === ValueTag.Null || (only.Tag === ValueTag.Undefined)) return only;
  // **其余原始值给包装对象** ✓（第 310 轮把这一格补上了 ✗）——
  // 原来这里**响亮地抛** ✓（`unimplemented: Object(primitive) needs wrapper objects` ✓），
  // 理由是「本仓没有包装对象」✗；现在三族都有了 ✓（`StringCtor` / `NumberCtor` /
  // `BooleanCtor` 那个 `constructing` 分支 ✓），所以这里按**各自的族**造 ✓。
  // **`Symbol` 仍抛** ✗：符号包装对象今天没有别的用处 ✓（`Object(sym).description` 那种），
  // 而本仓的符号连属性表都没有 ✓——**不猜** ✓（响亮地抛 ✓，与原来同一条纪律 ✓）。
  if (only.Tag === ValueTag.Bool) return MakeBox(room, table, protos, protos.Boolean, only);
  if (only.Tag === ValueTag.Int32 || only.Tag === ValueTag.Float64) {
    return MakeBox(room, table, protos, protos.Number, only);
  }
  if (only.Tag === ValueTag.String) return MakeStringBox(room, table, protos, only);
  throw new Error("unimplemented: Object(symbol) needs a symbol wrapper");
}
if (id === ArrayCtor) {  // **一个数是长度、其余是元素** ✓（JS 的口径 ✓，见 `ArrayCtor` 那一段 ✓）。
  if (args.length === 1 && args[0].Tag === ValueTag.Int32) {
    const count = args[0].Int;
    if (count < 0) throw new Error("unimplemented: new Array(n) needs a non-negative length");
    // **洞也要计费** ✓：`Truncate` 会按长度铺满洞 ✓（`heap.xl.md` 写着它「变长时新增的全是洞」✓），
    // 所以先按最坏情况问一次 ✓（`ObjectCharge` 那一份由 `NewPlainArray` 自己问 ✓）。
    if (!room((ValueCharge + HoleCharge) * count)) throw new Error("out of room");
    const sized = NewPlainArray(room, table, protos);
    table.Get(sized.Ref).AsArray().Truncate(count);
    table.Recount(sized.Ref);
    return sized;
  }
  const items = NewPlainArray(room, table, protos);
  const elements = table.Get(items.Ref).AsArray();
  for (let i = 0; i < args.length; i++) {
    if (!room(ValueCharge)) throw new Error("out of room");
    elements.Push(args[i]);
  }
  table.Recount(items.Ref);
  return items;
}
if (id === SymbolCtor) {
  // **描述是可选的**：给了字符串就留它的句柄，没给就 `0`（`heap.xl.md` 说 `0` 表示没有描述）。
  // **身份号由堆发**（`CreateSymbol`），所以 `Symbol('a') !== Symbol('a')` 天然成立——
  // 这一层不需要、也不该有计数器。
  let description = 0;
  if (args.length > 0 && args[0].Tag === ValueTag.String) description = args[0].Ref;
  if (!room(ObjectCharge + ValueCharge)) throw new Error("out of room");
  return Value.FromRef(ValueTag.Symbol, table.CreateSymbol(description));
}
if (id === SymbolDescription) {
  // **`s.description`** ✓（第 241 轮 ✓）：`self` 就是**那个符号** ✓
  //（判据 `symbol-description` 读的正是 `String(s1.description)` ✓）。
  //
  // **没描述给 `undefined`** ✓（JS 的规矩 ✓：`Symbol().description` 是 `undefined` ✓，
  // 而 `Symbol("").description` 是**空串** ✓）——所以判据是「句柄是不是 `0`」✗，
  // **不是**「字符串长不长」✗（`0` 那一格表示「没有」✓，`heap.xl.md` 写着 ✓）。
  //
  // **符号值没有原型那一格** ✗（它不是一个对象 ✓）——所以这个属性**只能由
  // `get_prop` 那条路特判** ✓，见下面 `GetProperty` 那一处 ✓。
  if (self.Tag !== ValueTag.Symbol) return Value.Undefined();
  const record = table.Get(self.Ref).AsSymbol();
  if (record.Description === 0) return Value.Undefined();
  return Value.FromString(record.Description);
}
if (id === SymbolToString) {
  // **`s.toString()`**（第 277 轮 ✓）——引擎在 `get_prop` 那一处交出一个 `HostRef` ✓
  //（见 `vm.xl.md` 的 `ToStringKey` ✓），调用落到这里 ✓。
  // **`self` 就是那个符号** ✓（与 `SymbolDescription` 一条路 ✓）。
  // **没描述给 `Symbol()`** ✓（JS 的口径 ✓：`Symbol().toString()` 是 `"Symbol()"` ✓）——
  // 所以判据还是**句柄是不是 `0`** ✗，不是「串长不长」✗（与上面那一支一字不差 ✓）。
  // **不是符号就抛** ✓：这一格**只**由上面那条特判交出来 ✓，真走到别处说明接线错了 ✓
  //（静默给一个 `"Symbol()"` 会让 `(1).toString()` 变成一个看不出问题的答案 ✗）。
  if (self.Tag !== ValueTag.Symbol) {
    throw new TypeError("Symbol.prototype.toString needs a symbol");
  }
  const toStringRecord = table.Get(self.Ref).AsSymbol();
  const rendered = toStringRecord.Description === 0
    ? "Symbol()"
    : "Symbol(" + TextFrom(table, Value.FromString(toStringRecord.Description)) + ")";
  if (!room(ObjectCharge + CodeUnitCharge * rendered.length)) throw new Error("out of room");
  return Value.FromString(table.CreateString(Units(rendered)));
}
if (id === SymbolFor) {
  // **`Symbol.for(名字)`**（第 277 轮 ✓）——**按名字去重** ✓（这一层唯一一处这么做的地方 ✓）。
  // **名字先 `ToString`** ✓（JS 的口径 ✓）：`Symbol.for(1)` 与 `Symbol.for("1")` 是**同一个** ✓——
  // 所以键不能用实参本身的类型去拼 ✓（`ValueText` 走的是与 `console.log` 同一个出口 ✓）。
  const forName = args.length > 0 ? ValueText(table, args[0]) : "undefined";
  // **注册表的键带一个前缀** ✓（`for:` ✓）——理由是 `keyFor` 那一问 ✓：
  // 那张表**同时**装着五个知名符号 ✓（`"iterator"` 那几格 ✓），
  // 而 `Symbol.keyFor(Symbol.iterator)` 在 JS 里是 `undefined` ✓（它**不是**注册过的 ✓）。
  // 没有前缀的话，反查那一趟会把知名符号认成注册过的 ✓（**静默错值** ✓）；
  // 有前缀则「**键以 `for:` 开头**」就是「注册过」的判据 ✓（知名符号的名字都不会这么开头 ✓）。
  const registryKey = Value.FromString(table.CreateString(Units("for:" + forName)));
  const registry = Value.FromObject(protos.WellKnownSymbols);
  const already = FindProperty(room, table, protos.WellKnownSymbols, registryKey);
  if (already !== null && already.Owner === protos.WellKnownSymbols) {
    return table.Get(protos.WellKnownSymbols).Props[already.Index].Value;
  }
  // **造一个新符号，描述就是那个名字** ✓（JS 的口径 ✓：`Symbol.for("x").description` 是 `"x"` ✓）。
  if (!room(ObjectCharge + ValueCharge * 2 + CodeUnitCharge * forName.length)) {
    throw new Error("out of room");
  }
  const created = Value.FromRef(ValueTag.Symbol, table.CreateSymbol(table.CreateString(Units(forName))));
  SetHiddenProperty(room, table, registry, registryKey, created);
  return created;
}
if (id === SymbolKeyFor) {
  // **`Symbol.keyFor(符号)`**（第 277 轮 ✓）——**反着查一趟注册表** ✓。
  //
  // **为什么是线性扫而不是「符号上存个名字」** ✗：符号**没有属性表** ✓
  //（它不是一个对象 ✓，`SetHiddenProperty` 落不下去 ✓）——所以反查只能在**注册表那一侧**做 ✓。
  // 表很小 ✓（只有脚本自己 `Symbol.for` 过的那些 ✓），扫一趟是应该的 ✓。
  //
  // **不是符号就抛 `TypeError`** ✓（JS 的口径 ✓：`Symbol.keyFor(1)` 抛 ✓）——
  // **不静默给 `undefined`** ✗：那会让「这个符号没注册过」与「你给的根本不是符号」
  // 变成同一个答案 ✓（调用方分不出来 ✓）。
  if (args.length < 1 || args[0].Tag !== ValueTag.Symbol) {
    throw new TypeError("Symbol.keyFor needs a symbol");
  }
  const registryItem = table.Get(protos.WellKnownSymbols);
  for (let i = 0; i < registryItem.Props.length; i++) {
    const entry = registryItem.Props[i];
    if (entry.Kind === PropertyKind.Accessor) continue;
    if (table.Get(entry.Key).Tag !== ValueTag.String) continue;
    const entryName = TextFrom(table, Value.FromString(entry.Key));
    // **前缀就是「注册过」的判据** ✓（理由写在 `SymbolFor` 那一支里 ✓）。
    if (entryName.length < 4 || entryName[0] !== "f" || entryName[1] !== "o" || entryName[2] !== "r"
      || entryName[3] !== ":") {
      continue;
    }
    if (entry.Value.Tag !== ValueTag.Symbol) continue;
    if (entry.Value.Ref !== args[0].Ref) continue;
    const keyForName = entryName.slice(4);
    if (!room(ObjectCharge + CodeUnitCharge * keyForName.length)) throw new Error("out of room");
    return Value.FromString(table.CreateString(Units(keyForName)));
  }
  // **注册表里没有就给 `undefined`** ✓（JS 的口径 ✓：`Symbol("x")` 与知名符号都走这一支 ✓）。
  return Value.Undefined();
}
if (id === MathFloor) {
  return MathResult(Math.floor(MathArgOf(room, call, protos, table, args[0])));
}
if (id === MathAbs) {
  const value = MathArgOf(room, call, protos, table, args[0]);
  // **`-0` 要折成 `+0`** ✗（第 274 轮）：下面那句「负数就取反」的判据是 `value < 0` ✓，
  // 而 **`-0 < 0` 在 JS 里是假** ✗——于是 `-0` 被原样交了出去 ✓。
  // 实测 `Math.abs(-0)` 给 `-0` ✓、`1 / Math.abs(-0)` 给 `-Infinity` ✗（node 给 `0` 与 `Infinity` ✓）：
  // **静默错值** ✓（判据 `math-min-max-edge` 量到的就是它 ✓，第 273 轮普查收进来的 ✓）。
  // **判据是 `value === 0`** ✓：`-0 === 0` 是**真** ✓，于是两种零都收到同一个出口 ✓；
  // 而 `NaN` 不走这一支 ✓（`NaN === 0` 是假 ✓），落回下面那句、原样交出去 ✓（JS 也是 `NaN` ✓）。
  if (value === 0) return MathResult(0);
  return MathResult(value < 0 ? 0 - value : value);
}
if (id === MathMax || id === MathMin) {
  // **空实参也有答案** ✓（第 206 轮 ✓）：JS 的 `Math.max()` 是 `-Infinity` ✓、
  // `Math.min()` 是 `Infinity` ✓（「比谁都小 / 比谁都大」的那个初值 ✓）——
  // 原来这里直接读 `args[0]` ✗，于是 `Math.min()` 崩成
  // `Cannot read properties of undefined (reading 'Tag')` ✓（判据 `math-abs-min-max` 现场红的 ✓）。
  if (args.length === 0) {
    return MathResult(id === MathMax ? -Infinity : Infinity);
  }
  let best = MathArgOf(room, call, protos, table, args[0]);
  // **第一个实参也可能是 `NaN`** ✓（`Math.max(NaN, 1)` 也是 `NaN` ✓）。
  if (best !== best) return MathResult(NaN);
  for (let i = 1; i < args.length; i++) {
    const value = MathArgOf(room, call, protos, table, args[i]);
    // **`NaN` 会传染** ✓（第 206 轮 ✓）：JS 的 `Math.min(1, NaN)` 是 `NaN` ✓——
    // 而「比大小」那两条判据对 `NaN` **永远为假** ✗，于是它会**静默**被跳过 ✓
    //（实测：`Math.min(1, NaN)` 给 `1` ✗，node 给 `NaN` ✓）。
    // 与 `+` / 关系比较那几张表同一条纪律：**`NaN` 的传播要显式写出来** ✓。
    if (value !== value) return MathResult(NaN);
    if (id === MathMax) {
      if (value > best) best = value;
      // **两个零之间的次序** ✗（第 288 轮）：JS 的 `Math.max(-0, 0)` 是 **`+0`** ✓、
      // `Math.max(-0, -0)` 是 `-0` ✓——而 `-0 > 0` 是**假** ✗，于是上面那一句
      // **静默**把 `+0` 丢了 ✓（实测 `1 / Math.max(-0, 0)` 给 `-Infinity`，
      // Node 给 `Infinity` ✓ —— 与 `Math.min` 那一半**正好相反** ✓）。
      // 判据收在一句上 ✓：**两个都是零时，`+0` 赢** ✓（`value === 0` 对两种零都真 ✓，
      // 而 `1 / value > 0` 只对 `+0` 真 ✓）。
      else if (value === 0 && best === 0 && 1 / value > 1 / best) best = value;
    } else {
      if (value < best) best = value;
      // **`min` 那一半：`-0` 赢** ✓（`Math.min(0, -0)` 是 `-0` ✓，`Math.min(-0, -0)` 也是 `-0` ✓）。
      // 同一句判据翻个方向 ✓——`1 / value < 1 / best` 只对 `-0` 真 ✓。
      else if (value === 0 && best === 0 && 1 / value < 1 / best) best = value;
    }
  }
  return MathResult(best);
}
if (id === MathRound || id === MathCeil || id === MathTrunc || id === MathSign) {
  // **四个都在 `MathResult` 那条口径上**（整的给 Int32）✓——这些函数的结果**本来就是整数** ✓，
  // 所以不存在「算得出、打不出」那一类坑 ✓。
  const value = MathArgOf(room, call, protos, table, args[0]);
  if (id === MathRound) return MathResult(Math.round(value));
  if (id === MathCeil) return MathResult(Math.ceil(value));
  if (id === MathTrunc) return MathResult(Math.trunc(value));
  return MathResult(Math.sign(value));
}
if (id === MathSqrt) {
  // **浮点现在打得出来了**（第 124 轮）✓，所以这一支放行 ✓。
  const value = MathArgOf(room, call, protos, table, args[0]);
  if (value < 0) return MathResult(NaN);
  return MathResult(Math.sqrt(value));
}
if (id === MathLog || id === MathExp || id === MathCbrt || id === MathHypot) {
  // **第 206 轮补的四格** ✓（`log` / `exp` / `cbrt` / `hypot` ✓）——
  // 与 `sqrt` / `pow` 同一档（结果多为非整数 ✓，第 124 轮之后才谈得上放行 ✓）。
  // `hypot` 是**多实参**那一档（与 `max` / `min` 同形 ✓）：`Math.hypot(3, 4)` 是 `5` ✓。
  //
  // **零实参那一档** ✗（第 288 轮）：JS 的 `Math.hypot()` 是 **`0`** ✓
  //（「谁都没有、平方和是 0」✓）。原来这里直接读 `args[0]` ✗ ⇒ `MathArgOf(undefined)` 崩
  //（`Cannot read properties of undefined (reading 'IsObject')` ✓——那句话听起来像引擎坏了 ✗，
  // 其实是**少了一条早退** ✓）。与 `Math.max()` / `Math.min()` 第 206 轮那条早退
  // **同一个形状** ✓（那一处也写着理由 ✓）。
  if (args.length === 0) return MathResult(0);
  const first = MathArgOf(room, call, protos, table, args[0]);
  if (id === MathLog) return MathResult(Math.log(first));
  if (id === MathExp) return MathResult(Math.exp(first));
  if (id === MathCbrt) return MathResult(Math.cbrt(first));
  let sum = first * first;
  for (let i = 1; i < args.length; i++) {
    const value = MathArgOf(room, call, protos, table, args[i]);
    sum = sum + value * value;
  }
  return MathResult(Math.sqrt(sum));
}
if (id === MathSin || id === MathCos || id === MathTan || id === MathAsin
  || id === MathAcos || id === MathAtan || id === MathAtan2) {
  // **三角七格**（第 288 轮 ✓）——一律交给宿主那一格 ✓（与第 275 轮那十格同一条纪律 ✗：
  // `asin` / `acos` / `atan` 照着别的函数凑出来的在边界上会差最后一位 ✓，而判据是逐字节比 ✓）。
  // **`atan2` 是两个实参那一档** ✓（与 `pow` / `imul` 同形 ✓）。
  const firstTrig = MathArgOf(room, call, protos, table, args[0]);
  if (id === MathSin) return MathResult(Math.sin(firstTrig));
  if (id === MathCos) return MathResult(Math.cos(firstTrig));
  if (id === MathTan) return MathResult(Math.tan(firstTrig));
  if (id === MathAtan2) {
    return MathResult(Math.atan2(MathArgOf(room, call, protos, table, args[0]),
      MathArgOf(room, call, protos, table, args[1])));
  }
  if (id === MathAsin) return MathResult(Math.asin(firstTrig));
  if (id === MathAcos) return MathResult(Math.acos(firstTrig));
  return MathResult(Math.atan(firstTrig));
}
if (id === MathImul || id === MathClz32 || id === MathFround || id === MathExpm1 || id === MathSinh
  || id === MathCosh || id === MathTanh || id === MathLog2 || id === MathLog10 || id === MathLog1p) {
  // **第 275 轮补的十格** ✓。**一律交给宿主那一格** ✓（一个一个转调 ✓）：
  // 这十格每一个都有一处「照着近义函数自己凑就会错」的地方 ✓——
  // `imul` 不是 `a * b` ✓（乘的是低 32 位 ✓）、`fround` 不是原样交出去 ✓（要过一趟 f32 ✓）、
  // `expm1` 不是 `exp(x) - 1` ✓（很小的入参上后者会把有效位全丢掉 ✓）、
  // `log1p` 同理 ✓、`log2` / `log10` 也不是「换底自己算」✓。
  // **自己凑出来的东西看着是对的** ✗——而判据是**逐字节**比 ✓（`Math.log2(8)` 对 `3` ✓），
  // 所以这一批**一个字都不自己算** ✓。
  // **`MathArgOf` 对缺实参给 `NaN`** ✓（与 JS 一致 ✓），所以不必为「少给一个」另立一条抛 ✓。
  const first = MathArgOf(room, call, protos, table, args[0]);
  if (id === MathImul) {
    // **两个实参** ✓（与 `pow` / `max` 同形 ✓）。
    return MathResult(Math.imul(MathArgOf(room, call, protos, table, args[0]),
      MathArgOf(room, call, protos, table, args[1])));
  }
  if (id === MathClz32) return MathResult(Math.clz32(first));
  if (id === MathFround) return MathResult(Math.fround(first));
  if (id === MathExpm1) return MathResult(Math.expm1(first));
  if (id === MathSinh) return MathResult(Math.sinh(first));
  if (id === MathCosh) return MathResult(Math.cosh(first));
  if (id === MathTanh) return MathResult(Math.tanh(first));
  if (id === MathLog2) return MathResult(Math.log2(first));
  if (id === MathLog10) return MathResult(Math.log10(first));
  return MathResult(Math.log1p(first));
}
if (id === MathPow) {
  // **两个实参**（与 `max` / `min` 同形 ✓）；少给就抛（`MathArgOf(undefined)` 给 `NaN` ✓，
  // 而 JS 的 `Math.pow(undefined, …)` 也是 `NaN` ✓——**两边一致** ✓，所以不必另立一条抛 ✓）。
  return MathResult(Math.pow(MathArgOf(room, call, protos, table, args[0]),
    MathArgOf(room, call, protos, table, args[1])));
}
if (id === NumberToFixed || id === NumberToPrecision || id === NumberToExponential || id === NumberToStringRadix
  || id === BooleanToString || id === NumberValueOf || id === BooleanValueOf) {
  // **原始值的方法：`self` 就是那个原始值本身** ✓（`GetProperty` 把 receiver 递过来 ✓，
  // 不是装箱对象 ✓——本仓不装箱 ✓）。所以这里直接取它的数值 / 真假 ✓。
  // **`valueOf` 更简单**（第 182 轮）✓：`ToPrimitive` 的第一步就是「原始值给回自己」✓，
  // 所以它**连转换都不做** ✓——直接返回 `self` ✓。
  //
  // **包装对象要先脱箱** ✓（第 310 轮 ✓）：`new Number(5).toFixed(2)` 与
  // `new Boolean(false).valueOf()` 的接收者都是**普通对象** ✓（方法是从原型上找到的 ✓）——
  // 不脱箱的话 `NumericOf(self)` / `self.AsBool()` 拿到的是一个对象 ✗
  //（症状是 `NaN` 或 `"false"` 变成别的东西 ✓）。脱箱只有一处 ✓（`UnwrapBox` ✓），
  // 三族共用 ✓——不是三个方法各写一遍 ✗。
  const receiver = UnwrapBox(table, self);
  if (id === NumberValueOf || id === BooleanValueOf) {
    return receiver;
  }
  if (id === BooleanToString) {
    return Value.FromString(table.CreateString(Units(receiver.AsBool() ? "true" : "false")));
  }
  const number = NumericOf(receiver);
  if (id === NumberToFixed || id === NumberToPrecision || id === NumberToExponential) {
    // **位数缺省是 0** ✓（`(1.5).toFixed()` 是 `"2"` ✓，JS 的口径 ✓）。
    // **`toExponential` 那一格的缺省与另外两个不同** ✗（第 291 轮 ✓）：不带实参时
    // JS 要**尽可能多的位数** ✓（`(0.000123).toExponential()` 是 `"1.23e-4"` ✓），
    // 而 `toFixed()` / `toPrecision()` 都按 `0` ✓——所以三格**不能共用一个缺省值** ✗，
    // 这也正是「同一张表上的兄弟只差一处、而那一处最容易写错」那条老形状 ✓。
    const digits = args.length > 0 ? NumericOf(args[0])
      : (id === NumberToExponential ? -1 : 0);
    // **`toPrecision` 与 `toFixed` 只差最后那一个调用** ✓（第 182 轮 ✓）——
    // 两张语义都借宿主 ✓、理由同一个 ✓（见号那两段 ✓）。
    // **`toExponential` 的「不给位数」借宿主的 `undefined`** ✓（宿主把 `undefined`
    // 读成「尽可能多」✓，与 JS 一字不差 ✓）。
    let text = "";
    if (id === NumberToFixed) text = number.toFixed(digits);
    else if (id === NumberToPrecision) text = number.toPrecision(digits);
    else if (digits < 0) text = number.toExponential();
    else text = number.toExponential(digits);
    if (!room(ObjectCharge + CodeUnitCharge * text.length)) throw new Error("out of room");
    return Value.FromString(table.CreateString(Units(text)));
  }
  const radix = args.length > 0 ? NumericOf(args[0]) : 10;
  // **基数 10 走语言层那一处** ✓（`text.xl.md` 的 `NumberToJsText` ✓——它在
  // `NumberToHostText` 之上补了 `-0` 那一格 ✓：JS 的 `(-0).toString()` 是 `"0"` ✓）；
  // **其余基数借宿主** ✓（见号那一段的说明 ✓）。
  const text = radix === 10 ? NumberToJsText(number) : number.toString(radix);
  if (!room(ObjectCharge + CodeUnitCharge * text.length)) throw new Error("out of room");
  return Value.FromString(table.CreateString(Units(text)));
}
if (id === ObjectHasOwnProperty) {
  // **`Object.prototype.hasOwnProperty`**（第 209 轮 ✓）：只问**自己**那一格 ✓，
  // 原型链上的**不算** ✓（`new A().hasOwnProperty("m")` 是**假** ✓——`m` 在 `A.prototype` 上 ✓）。
  // 与 `in` 的差别就是这一条 ✓，所以两处**不能互相顶替** ✗。
  // **不能用 `FindProperty`** ✗：那一位是**沿链找**（`props.xl.md` ✓）——正是这里要**排除**的那一半 ✓。
  if (args.length < 1) return Value.FromBool(false);
  if (self.Tag !== ValueTag.Object && self.Tag !== ValueTag.Array) return Value.FromBool(false);
  // **非字符串的键先过 `ToString`** ✓（JS 的 `ToPropertyKey` ✓）：`o.hasOwnProperty(1)` 是通的 ✓。
  const askedKey = args[0].Tag === ValueTag.String
    ? args[0]
    : Value.FromString(table.CreateString(Units(TextFrom(table, args[0]))));
  const ownProps = table.Get(self.Ref).Props;
  for (let i = 0; i < ownProps.length; i++) {
    if (KeyMatches(table, ownProps[i], askedKey)) return Value.FromBool(true);
  }
  return Value.FromBool(false);
}
if (id === ObjectCreate) {
  // **`Object.create(proto)`**（第 209 轮 ✓）：造一个空对象、把它的**原型**指过去 ✓。
  // **它不该走「原型跟着谁走」那条顺手的路** ✗（`NewPlainObject` 给的是 `Object.prototype` ✓）——
  // 要的正是**换掉**那一格 ✓（`child.greet()` 于是沿这条链找到 `proto` 上的方法 ✓）。
  const made = NewPlainObject(room, table, protos);
  if (args.length === 0) return made;
  const proto = args[0];
  if (proto.Tag === ValueTag.Null) {
    // **`Object.create(null)`** ✓（第 299 轮 ✓）——`Proto = 0` 就是「没有原型」✓。
    //
    // **第 209 轮那一版抛了** ✗，理由写的是「『没有』与『`Object.prototype`』在
    // `GetProperty` 那条路上**长得一样**」✓——**量了一下：它们不一样** ✗。
    // `props.xl.md` 的 `FindProperty` 循环判的是 `current > 0` ✓，
    // 所以 `Proto = 0` 那一档**天然就是「到此为止」** ✓（`GetProperty` 沿链找不到 ⇒ `undefined` ✓）。
    // 而「长得一样」说的是**另一件事** ✗：`NewPlainObject` 给新对象填的是 `protos.Object` ✓——
    // 所以「没设过」与「设成 0」**是两档** ✓，只是当时没有把 `0` 真的写进去过 ✓。
    // **判据就是这一句** ✓：`"toString" in Object.create(null)` 在 JS 里是**假** ✓
    //（判据 `object-create-and-prototype-forms` 量着它 ✓）。
    table.Get(made.Ref).Proto = 0;
    return made;
  }
  if (proto.Tag !== ValueTag.Object) {
    throw new Error("unimplemented: Object.create over a prototype that is not an object");
  }
  table.Get(made.Ref).Proto = proto.Ref;
  // **第二格实参：属性描述表** ✓（第 299 轮 ✓）——以前**整格丢掉** ✗
  //（`Object.create(proto, { a: { value: 1, enumerable: true } })` 之后 `o.a` 是 `undefined` ✓，
  //  而 `Object.keys(o)` 是空的 ✓——**两句都看着像「那个对象就是空的」** ✓，**静默错值** ✗，
  //  判据 `object-create-with-properties` / `object-create-and-prototype-forms` 量的就是它 ✓）。
  //
  // **走 `DefineOwnFromDescriptor` 那条既有的路** ✓（与 `defineProperties` 一字不差 ✓）：
  // 扫描述符表里**可枚举的自有属性** ✓、逐格写 ✓——**不新写一条** ✗
  //（新写一条就是第二份「描述符怎么读」✓，而里面有两处**不能抄**的判断 ✓：
  //  默认三个标志全是假 ✓、访问器那两格 ✓）。
  if (args.length > 1 && args[1].IsObject()) {
    const createDescriptors = table.Get(args[1].Ref);
    const createCount = createDescriptors.Props.length;
    for (let i = 0; i < createCount; i++) {
      const entry = createDescriptors.Props[i];
      if (entry.Kind === PropertyKind.Accessor) continue;
      if (!entry.IsEnumerable()) continue;
      if (table.Get(entry.Key).Tag !== ValueTag.String) continue;
      DefineOwnFromDescriptor(room, table, made, Value.FromString(entry.Key), entry.Value);
    }
  }
  return made;
}
if (id === ObjectGetPrototypeOf) {
  // **`Object.getPrototypeOf(o)`**（第 209 轮 ✓）：把那一格原型**当值**交出去 ✓
  //（`Object.getPrototypeOf([]) === Array.prototype` ✓、`Object.getPrototypeOf(new A()) === A.prototype` ✓）。
  // **原始值也给它的原型** ✓（JS 会**装箱**再取 ✓）：`Object.getPrototypeOf("a")` 是 `String.prototype` ✓——
  // 本仓不装箱 ✓，所以这一支按**原始值原型表**（`protos.String` / `Number` / `Boolean` ✓）直接答 ✓。
  if (args.length < 1) throw new Error("this method needs an argument");
  const target = args[0];
  if (target.Tag === ValueTag.String) return Value.FromObject(protos.String);
  if (target.Tag === ValueTag.Int32 || target.Tag === ValueTag.Float64) return Value.FromObject(protos.Number);
  if (target.Tag === ValueTag.Bool) return Value.FromObject(protos.Boolean);
  if (target.Tag !== ValueTag.Object && target.Tag !== ValueTag.Array) {
    throw new Error("unimplemented: Object.getPrototypeOf over this kind of value");
  }
  const protoHandle = table.Get(target.Ref).Proto;
  if (protoHandle === 0) return Value.Null();
  return Value.FromObject(protoHandle);
}
if (id === ErrorToString) {
  // **`Error.prototype.toString`** ✓（第 213 轮 ✓）——JS 的三条规矩 ✓：
  // **`name` 缺省 `"Error"`** ✓（`Error.prototype.name` 就是它 ✓）、**`message` 缺省空串** ✓、
  // **两格任一为空就只给另一个** ✓（空串不是「`": "` 那种拼接」✗）。
  // **两格要「真读一次属性」** ✓（不是直接给类型名 ✗）：`e.name = "MyError"` 这种写法遍地都是 ✓，
  // 而 `message` 更是构造时就写在实例上的自有属性 ✓。属性读**可能调 getter** ✓，
  // 所以它要一条调用通道 ✓——宿主没接时必须**响亮**说清 ✗（而不是偷偷给个默认值 ✓）。
  if (call === null) {
    throw new Error("Error.prototype.toString needs a call channel (the host must pass one)");
  }
  const errorNameValue = GetProperty(room, call, protos, table, self, NameValue(table, "name"));
  const errorMessageValue = GetProperty(room, call, protos, table, self, NameValue(table, "message"));
  let errorName = "Error";
  if (errorNameValue.Tag !== ValueTag.Undefined) errorName = TextFrom(table, errorNameValue);
  let errorMessage = "";
  if (errorMessageValue.Tag !== ValueTag.Undefined) errorMessage = TextFrom(table, errorMessageValue);
  let errorText = "";
  if (errorName.length === 0) {
    errorText = errorMessage;
  } else if (errorMessage.length === 0) {
    errorText = errorName;
  } else {
    errorText = errorName + ": " + errorMessage;
  }
  if (!room(ObjectCharge + CodeUnitCharge * errorText.length)) throw new Error("out of room");
  return Value.FromString(table.CreateString(Units(errorText)));
}
if (id === FunctionCall || id === FunctionApply) {
  // **`Function.prototype.call` / `apply`**（第 228 轮 ✓）：`self` 是**被调的那个函数** ✓
  //（`greet.call(o, 1, 2)` 里 `self` 就是 `greet` ✓——方法调用的 `this` 是接收者 ✓，
  // 而这里接收者正好就是那个函数 ✓）。
  //
  // **可调性要判** ✓（`IsCallableValue` ✓，第 145 轮）：`Function.prototype.call.call(1)`
  // 在 JS 里是 `TypeError` ✓——用 `IsCallable()`（不带堆的那一半 ✗）会漏掉
  // 「带载荷的对象」那一档 ✓（`Array.call(...)` 是能调的 ✓），
  // 而漏掉它的症状是**静默**换了语义 ✗，与 `[1, 2].map(String)` 那条同型 ✓。
  if (!IsCallableValue(table, self)) {
    throw new TypeError("Function.prototype.call/apply called on a non-function");
  }
  if (call === null) {
    throw new Error("Function.prototype.call needs a call channel (the host must pass one)");
  }
  // **`thisArg` 的缺省是 `undefined`** ✓（JS 的口径 ✓）：`f.call()` 是「不给 `this`」✓
  // ——不是「`this` 是 `undefined` 这个**值**」那种区别在本仓里看不出来 ✓（不装箱 ✓）。
  const invokedThis = args.length > 0 ? args[0] : Value.Undefined();
  let invokedArgs: Value[] = [];
  if (id === FunctionCall) {
    // **`call`：`args[1..]` 就是实参表** ✓——逐个搬进一个新数组 ✓。
    for (let i = 1; i < args.length; i++) invokedArgs.push(args[i]);
  } else {
    // **`apply`：第二格**就是实参表 ✓。
    // **只认真的数组** ✗（JS 还认「类数组」✓）：`apply(self, {length: 2, 0: 1, 1: 2})`
    // 在 JS 里是 `1,2` ✓、这里**响亮地抛** ✓——先算「还没做」的那一档，
    // 比**静默**当成零个实参好 ✓（那种错值最难查 ✓）。
    if (args.length > 1 && args[1].Tag !== ValueTag.Undefined && args[1].Tag !== ValueTag.Null) {
      if (args[1].Tag !== ValueTag.Array) {
        throw new Error("unimplemented: Function.prototype.apply needs an array (array-likes are not supported)");
      }
      const supplied = table.Get(args[1].Ref).AsArray();
      for (let i = 0; i < supplied.GetLength(); i++) invokedArgs.push(supplied.GetAt(i));
    }
  }
  return call(self, invokedThis, invokedArgs);
}
if (id === FunctionBind) {
  // **`Function.prototype.bind`**（第 228 轮 ✓）——与 `call` / `apply` 不同 ✗：
  // 它**造一个新值** ✓，造出来的那个要能被调 ✓、而且调它时用的是**绑定时的** `this` ✓。
  //
  // **本仓怎么造** ✓：一个**普通对象** ✓ + `AttachCallable` 那一格载荷 ✓（第 145 轮 ✓）
  // + 三格**隐藏自有属性** ✓（目标 / `this` / 已绑定的实参 ✓，见 `BoundTargetKey` ✓）。
  // **为什么隐藏** ✗：`Object.keys(f.bind(o))` 在 JS 里是**空数组** ✓——
  // 挂成普通属性的话它当场变成 3 ✗（**静默错值** ✗，与 `Object.prototype` 那几格同一条规矩 ✓）。
  if (!IsCallableValue(table, self)) {
    throw new TypeError("Function.prototype.bind called on a non-function");
  }
  // **三格一起问 room** ✓（一个对象头 + 三个属性 + 值 + 一个实参数组 ✓）：
  // 分三次问会在中间那一次分配之后留下**没有根保护的中间值** ✗（与 `TextUnitsOf` 那条同一个坎 ✓）。
  // **第 291 轮加到五格两串** ✓：`length` / `name` 两个隐藏属性 ✓，以及那三个键串
  //（`"length"` / `"name"` / `"bound "` ✓）与名字串本身 ✓——**估少了的后果是
  // 「分配刚好越界」** ✗，而它离现场很远 ✓（与这一整段同一条纪律 ✓）。
  if (!room(ObjectCharge * 2 + PropertyCharge * 5 + ValueCharge * 4 + (args.length + 1) * ValueCharge
    + CodeUnitCharge * 64)) {
    throw new Error("out of room");
  }
  const boundArgs = NewPlainArray(room, table, protos);
  const boundElements = table.Get(boundArgs.Ref).AsArray();
  for (let i = 1; i < args.length; i++) boundElements.Push(args[i]);
  table.Recount(boundArgs.Ref);
  const bound = NewPlainObject(room, table, protos);
  table.AttachCallable(bound.Ref, BoundCall, 0);
  // **绑定出来的东西的原型是 `Function.prototype`** ✓（第 228 轮 ✓）：
  // JS 里 `f.bind(o)` 返回的是一个**函数** ✓，所以 `bound.call(...)`、
  // `bound.bind(...)`、`bound.length`（**第 291 轮补上了** ✓，见下面那一段 ✓）
  // 都从那一格上找 ✓。
  // **不给这一格就是「一半对」** ✗：`bound(2)` 能跑 ✓、而 `bound.call(o, 2)` 报
  // `calling a non-closure value` ✗——那句话听起来像调用写错了 ✓，
  // 其实是**这一格没人填** ✓（与闭包那一格第 228 轮修的是同一个形状 ✓）。
  table.Get(bound.Ref).Proto = protos.Function;
  SetHiddenProperty(room, table, bound, BoundTargetName(table), self);
  SetHiddenProperty(room, table, bound, BoundThisName(table),
    args.length > 0 ? args[0] : Value.Undefined());
  SetHiddenProperty(room, table, bound, BoundArgsName(table), boundArgs);
  // **`bound.length` / `bound.name`**（第 291 轮 ✓）——第 228 轮那一句注释里
  // 明写着「`bound.length`（本仓没做 ✓）」，这一轮把它补上 ✓。
  //
  // **两个都按 JS 的规矩算** ✓，都不是照抄目标的那两格 ✗：
  // `length` 是**原函数的形参个数减掉已经绑定的实参数** ✓（`f.bind(o, 1).length`
  // 在 `f` 有两个形参时是 **1** ✓）——**不减就是静默错值** ✗；负数要夹到 `0` ✓。
  // `name` 是 `"bound " + 原名` ✓（Node 印 `"bound f"` ✓）——**原名要真读一次**
  //（目标可能是闭包 ✓、也可能**又是一个绑定** ✓，套两层就是 `"bound bound f"` ✓）。
  //
  // **写成隐藏属性** ✓：`GetProperty` 那条路照旧走得通 ✓（`BoundTargetName` 那一族
  // 就是这么读的 ✓），而 `Object.keys(bound)` / `JSON.stringify(bound)` **看不见它们** ✓
  //（与 `__boundTarget` 三格同一条口径 ✓——JS 里这三个也都是**不可枚举**的 ✓）。
  const boundLengthKey = Value.FromString(table.CreateString(Units("length")));
  const targetLength = GetProperty(room, NeverCall, protos, table, self, boundLengthKey);
  let boundArity = 0;
  if (targetLength.IsNumber()) {
    boundArity = targetLength.AsInt() - (args.length > 0 ? args.length - 1 : 0);
    if (boundArity < 0) boundArity = 0;
  }
  SetHiddenProperty(room, table, bound, boundLengthKey, Value.FromInt(boundArity));
  const boundNameKey = Value.FromString(table.CreateString(Units("name")));
  const targetName = GetProperty(room, NeverCall, protos, table, self, boundNameKey);
  const targetText = targetName.Tag === ValueTag.String ? TextFrom(table, targetName) : "";
  SetHiddenProperty(room, table, bound, boundNameKey,
    Value.FromString(table.CreateString(Units("bound " + targetText))));
  return bound;
}
if (id === BoundCall) {
  // **调一个绑定出来的函数** ✓（第 228 轮 ✓）：`self` 是**那个绑定对象** ✓
  //（`DoCallValue` 与 `CallNative` 都把接收者当 `this` 递进来 ✓——见 `vm.xl.md` ✓），
  // 三样东西从它自己的隐藏属性里取 ✓。
  if (!self.IsObject()) {
    throw new Error("a bound function must be an object (the engine passes the receiver as this)");
  }
  const boundTarget = GetProperty(room, NeverCall, protos, table, self, BoundTargetName(table));
  if (!IsCallableValue(table, boundTarget)) {
    throw new Error("a bound function lost its target");
  }
  const boundSelf = GetProperty(room, NeverCall, protos, table, self, BoundThisName(table));
  const storedArgs = GetProperty(room, NeverCall, protos, table, self, BoundArgsName(table));
  if (call === null) {
    throw new Error("a bound function needs a call channel (the host must pass one)");
  }
  // **已绑定的实参在前、调用时给的在后** ✓（JS 的口径 ✓）：
  // `f.bind(o, 1)(2)` 调的是 `f(1, 2)` ✓——写反了是**静默错值** ✗。
  const merged: Value[] = [];
  if (storedArgs.Tag === ValueTag.Array) {
    const stored = table.Get(storedArgs.Ref).AsArray();
    for (let i = 0; i < stored.GetLength(); i++) merged.push(stored.GetAt(i));
  }
  for (let i = 0; i < args.length; i++) merged.push(args[i]);
  return call(boundTarget, boundSelf, merged);
}
if (id === ObjectValueOf) {
  // **返回接收者自己** ✓（第 198 轮 ✓，与 `NumberValueOf` 同一条口径 ✓）——
  // `Object.prototype.valueOf` 是 JS 里最"空"的一个方法 ✓，而它**永远是对的** ✓。
  return self;
}
if (id === ObjectToString) {
  // **`null` / `undefined` 也给标签** ✓（JS 的 `Object.prototype.toString` ✓）：
  // `Object.prototype.toString.call(null)` 是 `"[object Null]"` ✓——
  // 本仓没有 `.call` ✗，但接收者直接落在这两档上的形状（元编程写法）仍该给对 ✓。
  if (self.Tag === ValueTag.Undefined) {
    return Value.FromString(table.CreateString(Units("[object Undefined]")));
  }
  if (self.Tag === ValueTag.Null) {
    return Value.FromString(table.CreateString(Units("[object Null]")));
  }
  const text = "[object " + ObjectTagOf(room, call, table, protos, self) + "]";
  if (!room(ObjectCharge + CodeUnitCharge * text.length)) throw new Error("out of room");
  return Value.FromString(table.CreateString(Units(text)));
}
if (id === IsNaN || id === IsFinite || id === NumberIsFinite) {
  // **`Number.isFinite` 不转换** ✗（第 149 轮）：它只认数值标签 ✓——
  // `Number.isFinite("3")` 是 `false` ✓，而全局的 `isFinite("3")` 是 `true` ✓。
  // **这一格单独判** ✓：混进下面「先转再判」那条就是**静默错值** ✗
  //（`Number.isFinite("3")` 会变成 `true` ✓，而 JS 给 `false` ✓）。
  if (id === NumberIsFinite) {
    const raw = args.length > 0 ? args[0] : Value.Undefined();
    if (raw.Tag !== ValueTag.Int32 && raw.Tag !== ValueTag.Float64) return Value.FromBool(false);
    const numeric = raw.Tag === ValueTag.Int32 ? raw.Int : raw.Dbl;
    return Value.FromBool(numeric === numeric && numeric !== Infinity && numeric !== -Infinity);
  }
  // **两个全局判定都是「先 `ToNumber`，再自比较」**（第 149 轮）✓：
  // 转那一步借 `NumberFromValue` ✓（`Number(x)` 的语义只有一份 ✓）。
  // **不许直接拿 `Number.isNaN` / `Number.isFinite` 顶替** ✗：那两个**不做转换** ✓——
  // `isNaN("abc")` 该是 `true` ✓（转成 `NaN` ✓），而 `Number.isNaN("abc")` 是 `false` ✓。
  const converted = NumberFromValue(room, call, table, protos, args.length > 0 ? args[0] : Value.Undefined());
  const number = converted.Tag === ValueTag.Int32 ? converted.Int : converted.Dbl;
  const notANumber = number !== number;
  if (id === IsNaN) return Value.FromBool(notANumber);
  // **`NaN` 与 `±Infinity` 都不有限** ✓（自比较那一条已经管了 `NaN` ✓）。
  return Value.FromBool(notANumber === false && number !== Infinity && number !== -Infinity);
}
if (id === PowId) {
  // **`a ** b` 走的就是 `Math.pow`** ✓（JS 的规范本来就这么定 ✓）——
  // 号不同（`PowId` 是降级层发的内部调用 ✓）、语义同一个 ✓。
  // **不是全局名** ✓：脚本里写 `PowId` 找不到它 ✓。
  return MathResult(Math.pow(NumericOf(args[0]), NumericOf(args[1])));
}
if (id === ErrorCtor || id === TypeErrorCtor || id === RangeErrorCtor || id === SyntaxErrorCtor
  || id === ReferenceErrorCtor) {
  // **`new Error(msg)` 与 `Error(msg)` 同一支**（号相同、两条调用路都落到这里）✓。
  // **四个号共用一支**（第 137 轮三个、第 277 轮加 `SyntaxError` ✓）：
  // 它们只差**原型**与**名字** ✓——复制四份的下场是「改了一处忘了一处」✗
  //（而症状是「`SyntaxError` 的 `name` 写着 `Error`」✓）。
  // 名字与原型第 277 轮各收成一个方法 ✓（`ErrorCtorName` / `ErrorCtorProto` ✓，
  // 理由写在它们那儿 ✓）——**每加一个成员要改的地方从两处收到了一处** ✓。
  // **实参走「任意值 → 文本」**（第 124 轮）✓：`new Error({})` 在 JS 里得到
  // `"[object Object]"` ✓——以前这里用引擎的 `TextFrom`，那会在对象上**抛** ✗。
  const text = args.length > 0 ? ValueText(table, args[0]) : "";
  // **第二格实参 `{ cause }`** ✓（第 277 轮 ✓）：`new Error(msg, { cause: inner })` 在 JS 里
  // 把 `cause` 挂成一个**不可枚举的自有属性** ✓（`Object.keys(e)` 看不见它 ✓）⇒ `SetHiddenProperty` ✓。
  //
  // **判据是「描述符里有没有 `cause` 这一格」** ✗，**不是**「第二个实参在不在」✗：
  // `new Error("x", {})` 与 `new Error("x", { cause: undefined })` 在 JS 里**不一样** ✓
  //（前者**没有**那一格 ✓、后者有，值是 `undefined` ✓）——拿「实参在不在」顶替就是**静默错值** ✓
  //（`"cause" in e` 会从假变真 ✓）。
  //
  // **访问器跳过、非字符串键跳过** ✓（与 `DefineOwnFromDescriptor` 那一处同一条 ✓）：
  // 不跳的话一个符号键会被 `Value.FromString` 读成一段越界码元 ✓（静默 ✓）。
  let causeValue = Value.Undefined();
  let hasCause = false;
  if (args.length > 1 && args[1].IsObject()) {
    const options = table.Get(args[1].Ref);
    for (let i = 0; i < options.Props.length; i++) {
      const option = options.Props[i];
      if (option.Kind === PropertyKind.Accessor) continue;
      if (table.Get(option.Key).Tag !== ValueTag.String) continue;
      if (TextFrom(table, Value.FromString(option.Key)) !== "cause") continue;
      causeValue = option.Value;
      hasCause = true;
    }
  }
  const selfName = ErrorCtorName(id);
  // **`super(m)`：往「传进来的那个 `this`」上初始化**（第 140 轮做掉了 ✓）。
  //
  // **为什么它是这一族最要紧的一格** ✗：`class MyErr extends Error { constructor(m) { super(m);
  // this.name = "MyErr"; } }` 是**日常写法** ✓（自定义错误类 ✓），而 `super(m)` 落在内建
  // 构造函数上时，本仓给的是**一次普通调用 + 一个接收者** ✓——接收者就是**已经在造的那个实例** ✓
  // （降级层用 `Op.Call` 的 `D` 操作数把 `this` 递过来 ✓，见 `lowering.xl.md` 那一支 ✓）。
  //
  // **第 137 轮在这里抛** ✗（「unimplemented: super(...) on a builtin constructor」✓）——
  // 因为那时这一族是「**自己造一个新对象返回**」那一款 ✓，于是新对象被丢掉 ✓、
  // `this` 上一个属性都没写 ✗（**症状是 `e.message` 空着**，而 `e.name` 被派生类自己写了、
  // 看着一切正常 ✓）。**抛比静默错值好** ✓，所以先抛了一轮 ✓；这一轮改成**真的办到它** ✓。
  //
  // **返回的是 `self`** ✗：`super(...)` 的结果在本仓被丢掉 ✓（降级层拿它当临时格 ✓），
  // 但**不能返回一个新对象** ✓——那会让「谁是真的 `this`」出现两个答案 ✓
  //（JS 的规矩是「父类构造函数改的就是那一个 `this`」✓）。
  // **`name` 也写上去** ✓（与 `NewErrorLike` 一致 ✓）：不写的话，
  // `class E extends Error {}` 的实例 `name` 来自原型 ✓（也是 `"Error"` ✓），两种写法结果一样 ✓。
  if (self.IsObject()) {
    SetProperty(room, NeverCall, table, self, NameValue(table, "message"),
      Value.FromString(table.CreateString(Units(text))));
    SetProperty(room, NeverCall, table, self, NameValue(table, "name"),
      Value.FromString(table.CreateString(Units(selfName))));
    // **`cause` 也走同一处** ✓：`super(m, { cause })` 在派生类里也该挂上 ✓——
    // 少了这一句，`class E extends Error { constructor(m) { super(m, { cause: 1 }) } }`
    // 的实例**没有 `cause`** ✗，而 `new Error(m, { cause: 1 })` 有 ✓（**一半对一半错** ✗）。
    if (hasCause) SetHiddenProperty(room, table, self, NameValue(table, "cause"), causeValue);
    return self;
  }
  const built = NewErrorLike(room, table, protos, ErrorCtorProto(protos, id), selfName, text);
  // **新造的那一条也要挂** ✓（与 `self` 那一支对称 ✓）。
  if (hasCause) SetHiddenProperty(room, table, built, NameValue(table, "cause"), causeValue);
  return built;
}
if (id === AggregateErrorCtor) {
  // **`AggregateError(内层数组, 消息?)`** ✓（第 295 轮 ✓）——**实参次序与别的族相反** ✗：
  // 第一个是**那个数组** ✓（JS 的口径 ✓），消息是第二个 ✓。
  // **它自己那一格 `errors` 是普通（可枚举的）属性** ✓（与 `message` / `name` 同款 ✓）——
  // 与 `cause` **不同** ✗（后者是不可枚举的 ✓，见上面那一支 ✓）：`JSON.stringify(e)` 在 JS 里
  // 给 `{"errors":[]}` ✓（`message` / `name` 在**原型**上 ✓、不是自有属性 ✓）——
  // 那一条**记在台账里** ✓（本仓是自有属性 ⇒ 会多印两格 ✓）。
  const innerList = args.length > 0 ? args[0] : Value.Undefined();
  const aggregateText = args.length > 1 ? ValueText(table, args[1]) : "";
  if (self.IsObject()) {
    SetProperty(room, NeverCall, table, self, NameValue(table, "message"),
      Value.FromString(table.CreateString(Units(aggregateText))));
    SetProperty(room, NeverCall, table, self, NameValue(table, "name"),
      Value.FromString(table.CreateString(Units("AggregateError"))));
    SetProperty(room, NeverCall, table, self, NameValue(table, "errors"), innerList);
    return self;
  }
  const aggregateBuilt = NewErrorLike(room, table, protos, protos.AggregateError, "AggregateError", aggregateText);
  SetProperty(room, NeverCall, table, aggregateBuilt, NameValue(table, "errors"), innerList);
  return aggregateBuilt;
}
if (id === ObjectGroupBy) {
  // **`Object.groupBy(可迭代, 回调)`** ✓（第 295 轮 ✓）——按回调的返回值分组 ✓。
  //
  // **只收数组** ✗（可迭代那一半没做 ✓）：判据用的是数组 ✓，而
  // 「按迭代协议走一遍」那一套要走 `GetIterator` ✓——**没量到就不做** ✗，
  // 而**响亮地抛**比「把别的形状当数组读」好 ✓。
  //
  // **回调每个元素调一次** ✓（实参 `(元素, 下标)` ✓，与 `Array.map` 那一族同一个形状 ✓）。
  //
  // **已知差异写在明处** ✗：JS 给的分组对象**没有原型** ✓（`Object.groupBy` 返回的是
  // null-prototype 对象 ✓），本仓给的是**普通对象** ✓——`Object.create(null)` 那一档
  // 本仓表达不了 ✓（见 `ObjectCreate` 那一支 ✓）。所以 `"toString" in g` 在本仓是**真** ✓、
  // 在 JS 里是**假** ✓。
  if (args.length < 2) throw new Error("Object.groupBy needs two arguments");
  if (!IsCallableValue(table, args[1])) {
    throw new Error("Object.groupBy needs a function as the second argument");
  }
  if (call === null) {
    throw new Error("Object.groupBy needs a call channel (the host must pass one)");
  }
  if (args[0].Tag !== ValueTag.Array) {
    throw new Error("unimplemented: Object.groupBy over a value that is not an array");
  }
  const groupSource = table.Get(args[0].Ref).AsArray();
  const groups = NewPlainObject(room, table, protos);
  for (let i = 0; i < groupSource.GetLength(); i++) {
    const member = groupSource.GetAt(i);
    const bucketName = call(args[1], Value.Undefined(), [member, Value.FromInt(i)]);
    const bucketKey = Value.FromString(table.CreateString(Units(ValueText(table, bucketName))));
    let bucket = GetProperty(room, NeverCall, protos, table, groups, bucketKey);
    if (bucket.Tag !== ValueTag.Array) {
      // **先问 room、再分配** ✓：`SetProperty` 自己也会问 room ✓——
      // 那一次如果触发了回收，这个**还没有人指着**的新数组就会被收走 ✓
      //（与 `Promise.all` 那个 `state` 同一条纪律 ✓）。
      if (!room(ObjectCharge + PropertyCharge + ValueCharge * 2)) throw new Error("out of room");
      bucket = NewPlainArray(room, table, protos);
      SetProperty(room, NeverCall, table, groups, bucketKey, bucket);
    }
    if (!room(ValueCharge)) throw new Error("out of room");
    table.Get(bucket.Ref).AsArray().Push(member);
  }
  return groups;
}
if (id === GeneratorSelf || id === AsyncGeneratorSelf) {
  // **`gen[Symbol.iterator]()` / `asyncGen[Symbol.asyncIterator]()` 都是「它自己」** ✓
  //（第 320 轮 ✓）——两族**共用这一支** ✓（同一个语义一处实现 ✓），差的只是挂在哪个原型上 ✓。
  // **不是对象就响亮地抛** ✗（那是把它当普通函数调 ✓）。
  if (self.Tag !== ValueTag.Object) {
    throw new Error("this method needs a generator receiver");
  }
  return self;
}
if (id === EncodeURIComponent || id === EncodeURI || id === DecodeURIComponent || id === DecodeURI) {
  // **百分号编解码四个名字**（第 311 轮 ✓）——**两个参数合起来只有一位不同** ✗：
  // 「哪些字符留着」与「哪些字符不解」都只看 `component` 这一格 ✓（见 `UriKeep` ✓）。
  // **实参缺了也要走** ✓（JS 的 `encodeURIComponent()` 是 `"undefined"` ✓——
  // `ToString(undefined)` ✓；`EncodePercent` / `DecodePercent` 里的 `JsTextUnits`
  // 正是做这件事 ✓）。
  const component = id === EncodeURIComponent || id === DecodeURIComponent;
  const source = args.length > 0 ? args[0] : Value.Undefined();
  const encoded = id === EncodeURIComponent || id === EncodeURI;
  const result = encoded
    ? EncodePercent(table, source, component)
    : DecodePercent(table, source, component);
  if (!room(ObjectCharge + CodeUnitCharge * result.length)) throw new Error("out of room");
  return Value.FromString(table.CreateString(result));
}
if (id === ParseInt || id === ParseFloat) {
  // **两个全局函数**（第 126 轮）：实参先 ToString ✓（`parseInt(12.5)` 是 `12` ✓），
  // 走的是「任意值 → 文本」那条 ✓。
  if (args.length < 1) return MathResult(NaN);
  const text = ValueUnits(table, args[0], 0);
  if (id === ParseFloat) return ParseFloatText(text);
  // **基数的规整照 JS**：给了就 ToInt32（`ArgOr` 收的就是整数 ✓），
  // 「给没给」要分开——`parseInt(x)` 与 `parseInt(x, 0)` 都是「没给」✓。
  const hasRadix = args.length > 1 && !args[1].IsUndefined();
  return ParseIntText(text, hasRadix ? ArgOr(args, 1, 10) : 10, hasRadix);
}
if (id === NumberIsInteger || id === NumberIsSafeInteger) {
  const target = args.length > 0 ? args[0] : Value.Undefined();
  // **只认真整数** ✓（不做转换 ✓，与 JS 一致 ✓）。
  let isInt = false;
  let number = 0;
  if (target.Tag === ValueTag.Int32) {
    isInt = true;
    number = target.Int;
  } else if (target.Tag === ValueTag.Float64) {
    number = target.Dbl;
    isInt = number === number && number !== Infinity && number !== -Infinity
      && number === Math.floor(number);
  }
  // **`isSafeInteger` 与 `isInteger` 只差一个边界** ✗（第 288 轮 ✓）：
  // `2**53 - 1` 是 `true` ✓、`2**53` 是 **`false`** ✓（它是**整数** ✓，只是**不安全** ✓）。
  // 判据**照用**上面那一句 ✓、只多问一句「在安全区间里没有」✓——
  // 不另写一份整数判据 ✗（第二份迟早与第一份走偏 ✓）。
  if (id === NumberIsSafeInteger) {
    return Value.FromBool(isInt && number >= -9007199254740991 && number <= 9007199254740991);
  }
  if (target.Tag === ValueTag.Int32) return Value.FromBool(true);
  return Value.FromBool(isInt);
}
if (id === NumberIsNaN) {
  const target = args.length > 0 ? args[0] : Value.Undefined();
  if (target.Tag !== ValueTag.Float64) return Value.FromBool(false);
  return Value.FromBool(target.Dbl !== target.Dbl);
}
if (id === StringConcat || id === TemplateConcat) {
  // **两个值按字符串拼起来**（第 125 轮）——**两边都先 `ToPrimitive`** ✓
  // （第 203 轮改 ✓，走的是与 `RtAdd` **同一张表** ✓：`rt.xl.md` 的 `ToPrimitiveOf` ✓）。
  //
  // **hint 按调用方分** ✓（第 288 轮 ✓）：`+` 走 `default` ✓（先 `valueOf` ✓）、
  // **模板串走 `string`** ✓（先 `toString` ✓）——见 `TemplateConcat` 那一段的表 ✓。
  // 两支**共用下面这一整段实现** ✓，只在读 hint 那一句上分开 ✓。
  //
  // **原来这里走的是 `ToString`** ✗（`text.xl.md` 的 `ValueUnits` ✓，外加一次
  // 「对象自己的 `toString`」✓，第 193 轮 ✓）——那是**另一个问题** ✗：
  // JS 的 `+` 第一步是 `ToPrimitive(default)` ✓，而 `default` 那一支**先问 `valueOf`、后问 `toString`** ✓
  // （`rt.xl.md` 那张表 ✓）。于是 `class Money { valueOf() { return 250 } toString() { return "$2.5" } }` 的
  // `"s" + m` 该给 `"s250"` ✓，走 `ToString` 给的是 `"s$2.5"` ✗——**静默错值** ✓，
  // 第 203 轮判据（`cls-override-toString-valueOf` ✓）现场就是这么红的 ✓。
  // **同一条 `+` 原来有两个答案** ✗（`m + 50` 走 `RtAdd` 是对的 ✓、`"s" + m` 走这里是不对的 ✗）——
  // 这一轮把它收成一个 ✓。
  //
  // **顺序**：左边算完**立刻**取码元（宿主侧数组 ✓，不占堆、不受回收影响 ✓），再算右边 ✓——
  // `ToPrimitive` **可能调脚本** ✓（`valueOf` / `Symbol.toPrimitive` ✓），
  // 而两边都先算完、最后只问一次 room、只分配一次 ✓（与 `RtAdd` 那条纪律同一条 ✓）。
  if (args.length < 2) throw new Error("unimplemented: string_concat needs (left, right)");
  // **唯一分岔** ✓：模板串那一格用 `string` ✓。
  const concatHint = id === TemplateConcat ? ToPrimitiveString : ToPrimitiveDefault;
  const left = JsTextUnits(table, ToPrimitiveOf(room, call, protos, table, args[0], concatHint));
  const right = JsTextUnits(table, ToPrimitiveOf(room, call, protos, table, args[1], concatHint));
  if (!room(ObjectCharge + CodeUnitCharge * (left.length + right.length))) {
    throw new Error("out of room");
  }
  const joined: number[] = [];
  for (let i = 0; i < left.length; i++) joined.push(left[i]);
  for (let i = 0; i < right.length; i++) joined.push(right[i]);
  return Value.FromString(table.CreateString(joined));
}
if (id === ConsoleLog) {
  // **一次调用 = 一行**（见 `LogSink`）：实参按 JS 的规矩用空格接起来，**只调一次** `sink`。
  // 少了这一步，宿主拿到的是一串**分不出行**的碎片 ✗（`console.log('a', 1)` 与两条
  // 各自一个实参的日志长得一样 ✗）——命令行那个「与 node 逐字节相同」的判据就无从谈起 ✗。
  //
  // **每个实参按 Node 的规矩渲染**（第 131 轮改）✓：**字符串原样** ✓（`console.log('a')` 印 `a` ✓），
  // **其余走 `util.inspect` 那一份** ✓（`inspect.xl.md` ✓）——`console.log([1, 2])` 印 `[ 1, 2 ]` ✓、
  // `console.log({ a: 1 })` 印 `{ a: 1 }` ✓、`console.log(1.5)` 印 `1.5` ✓。
  //
  // **为什么字符串要单独一条** ✗：Node 的 `util.format` 对**字符串实参**用的是它本身 ✓，
  // 而嵌套在容器里才加引号 ✓（`[ 'a' ]` ✓）——两处口径**必须不同** ✓，
  // 混成一条会让 `console.log('a')` 印成 `'a'` ✗（差两个引号，判据会当场点出来 ✓）。
  let line = "";
  for (let i = 0; i < args.length; i++) {
    if (i > 0) line = line + " ";
    if (args[i].Tag === ValueTag.String) {
      line = line + ValueText(table, args[i]);
      continue;
    }
    line = line + InspectText(table, args[i]);
  }
  sink(line);
  return Value.Undefined();
}
if (id === ObjectAssign) {
  // **目标必须是对象** ✓：JS 会装箱 ✗，本仓没有装箱那一层 ✓——响亮地抛 ✓。
  if (args.length < 1 || !args[0].IsObject()) {
    throw new Error("unimplemented: Object.assign needs an object as the target "
      + "(boxing a primitive is not supported)");
  }
  const target = args[0];
  for (let s = 1; s < args.length; s++) {
    const source = args[s];
    // **字符串来源要按下标展开** ✓（第 304 轮修的 ✗）：JS 的 `Object.assign({}, "ab")`
    // 给 `{"0":"a","1":"b"}` ✓——字符串的**可枚举自有属性就是那些下标** ✓
    //（`length` 是**不可枚举**的 ✓，所以它不进去 ✓）。
    // 原来这一支被「不是对象就跳过」**整段丢掉** ✓ ⇒ 静默给 `{}` ✓（判据
    // `c304-std-object-assign-forms` 量的就是它 ✓，而 `object-assign-forms-and-order`
    // 从第 293 轮起拖着同一个根 ✓）。
    // **按码元走** ✓（与 `Object.keys("ab")` 那一条口径一字不差 ✓——不另写一份下标规矩 ✗）。
    if (source.Tag === ValueTag.String) {
      const sourceUnits = table.Get(source.Ref).AsString().Units;
      if (!room(PropertyCharge * sourceUnits.length)) throw new Error("out of room");
      for (let i = 0; i < sourceUnits.length; i++) {
        SetProperty(room, NeverCall, table, target,
          Value.FromString(table.CreateString(Units(String(i)))), Value.FromString(table.CreateString([sourceUnits[i]])));
      }
      continue;
    }
    // **不是对象的来源跳过** ✓（JS 的口径 ✓：`Object.assign({}, null)` 合法 ✓、`(…, 1)` 也算合法 ✓——
    // 一个数没有自有可枚举属性 ✓）。
    if (!source.IsObject()) continue;
    // **先抄键与值、再写** ✓（与 `values` / `entries` 同一条纪律 ✓）：
    // `Object.assign(o, o)` 是合法的 ✓，而边读边写会让**属性表在遍历中变长** ✗。
    // 抄进来的是 `Value`（引用）✓，而它们住在源对象的属性表里 ✓——
    // 源是这次调用的根（`args[s]`）✓，所以中途的分配不会把它们收走 ✓。
    const own = table.Get(source.Ref);
    const keys: Value[] = [];
    const values: Value[] = [];
    for (let i = 0; i < own.Props.length; i++) {
      const keyHandle = own.Props[i].Key;
      const keyTag = table.Get(keyHandle).Tag;
      // **字符串键与符号键都要抄** ✓（第 306 轮修的 ✗）：JS 的对象展开 / `Object.assign`
      // 带走**可枚举的自有符号键** ✓（`{ ...{ [s]: 1 } }` 里那个符号键在 ✓）——
      // 原来这一句只认字符串 ✗ ⇒ 符号键**静默丢掉** ✓（判据 `c305-rt-object-rest-keeps-symbol` ✓）。
      // **内部格不会因此漏出去** ✓：它们都是**不可枚举**的 ✓（`SetHiddenProperty` ✓），
      // 下面那一句自己会挡 ✓。
      if (keyTag !== ValueTag.String && keyTag !== ValueTag.Symbol) continue;
      // **可枚举才算**（第 182 轮，与 `keys` 那一条同一处修正 ✓）。
      if (!own.Props[i].IsEnumerable()) continue;
      // **访问器不再跳过** ✓（第 306 轮修的 ✗）：JS 的对象展开与 `Object.assign`
      // 走的都是 **`[[Get]]`** ✓——`{ ...{ get x() { … } } }` 会**调 getter** ✓。
      // 原来这里跳过 ✗ ⇒ 那一格**整格不见** ✓（判据 `c305-rt-object-spread-triggers-getter` ✓，
      // **静默错值** ✗）。
      //
      // **值那一格这一刻不抄** ✗：getter 的结果**不属于任何对象** ✓（下面那条
      // 「源是这次调用的根、抄进来的值住在源的属性表里」的理由对它不成立 ✓），
      // 抄进 `values` 再写就是让一个没人指着的值跨越一次分配 ✗。
      // 所以访问器那一格照旧 push（写那一趟会按**键**重新认出它 ✓），
      // 真取值放在写那一趟、紧挨着 `SetProperty` ✓。
      keys.push(keyTag === ValueTag.Symbol
        ? Value.FromRef(ValueTag.Symbol, keyHandle)
        : Value.FromString(keyHandle));
      values.push(own.Props[i].Value);
    }
    for (let i = 0; i < keys.length; i++) {
      let value = values[i];
      const again = FindProperty(room, table, source.Ref, keys[i]);
      if (again !== null && again.Owner === source.Ref
        && table.Get(again.Owner).Props[again.Index].Kind === PropertyKind.Accessor) {
        // **没有通道时照旧跳过** ✓（`call === null` 是「宿主没接那一格」✓，
        // 与 `failed` / `keep` 同一条可选服务的纪律 ✓——那时宁可少一格 ✓，
        // 也不能凭空给一个 `undefined` ✗）。
        if (call === null) continue;
        // **取值就在这一刻** ✓：读到写之间只有这两句 ✓——先问一次 room ✓，
        // 让可能发生的那次回收落在**值还不存在**的时候 ✓（与 `Object.groupBy`
        // 那两处「先问 room、再分配」同一条纪律 ✓）。
        if (!room(PropertyCharge)) throw new Error("out of room");
        value = GetProperty(room, call, protos, table, source, keys[i]);
      }
      SetProperty(room, NeverCall, table, target, keys[i], value);
    }
  }
  // **返回的是目标本身** ✓（JS 的口径 ✓，不是一份拷贝 ✓）。
  return target;
}
if (id === ObjectIs) {
  // **`Object.is(a, b)`**（第 275 轮 ✓）——它要的是**第三张判等表** ✗
  //（见 `rt.xl.md` 的 `SameValue` ✓）：与 `===` 差 `NaN` ✓、与 `SameValueZero` 差 `±0` ✓，
  // **两处都翻** ✓。所以这一格**不能**借 `RtCmpEqStrict` 或 `SameValueZero` 顶替 ✗——
  // 借了会在另一格上**静默**给错答案 ✓（`Object.is(NaN, NaN)` 给假 ✗、
  // 或 `Object.is(0, -0)` 给真 ✗，而 node 给真与假 ✓）。
  // **缺实参给 `undefined`** ✓（与这一块其余实参位同一条 ✓）：
  // 于是 `Object.is()` 与 `Object.is(undefined, undefined)` 一致 ✓（JS 也是 ✓）。
  const isLeft = args.length > 0 ? args[0] : Value.Undefined();
  const isRight = args.length > 1 ? args[1] : Value.Undefined();
  return Value.FromBool(SameValue(table, isLeft, isRight));
}
if (id === ObjectFreeze) {
  // **冻结 = 把自有数据属性的 `writable` 清掉**（第 182 轮）✓——
  // `SetProperty` 那一支**早就**照着这个标志抛 ✓（`props.xl.md`：不可写的属性写入抛 TypeError ✓），
  // 所以这里只要改标志 ✓，一个引擎改动都不用 ✓（见号那一段的两处缺口 ✗）。
  //
  // **第 276 轮补上另一半** ✓：JS 的 `freeze` 是 `seal` **再加一步** ✓——
  // 「不可配置」那一半原来没做 ✗（`isSealed(frozen)` 会答**假** ✓，而 JS 答**真** ✓）。
  // 顺带接上「不可扩展」那个标记 ✓（`seal` / `isSealed` / `isFrozen` 三格都要它 ✓）。
  if (args.length < 1 || !args[0].IsObject()) {
    throw new Error("unimplemented: Object.freeze needs an object "
      + "(boxing a primitive is not supported)");
  }
  const frozen = table.Get(args[0].Ref);
  for (let i = 0; i < frozen.Props.length; i++) {
    const property = frozen.Props[i];
    if (property.Kind === PropertyKind.Accessor) continue;
    if ((property.Flags & PropertyFlagWritable) !== 0) {
      property.Flags = property.Flags - PropertyFlagWritable;
    }
    // **不可配置那一半** ✓（与 `Object.seal` 同一句 ✓）。
    if ((property.Flags & PropertyFlagConfigurable) !== 0) {
      property.Flags = property.Flags - PropertyFlagConfigurable;
    }
  }
  MarkUnextensible(room, table, args[0]);
  // **返回的是那个对象本身** ✓（JS 的口径 ✓，不是一份拷贝 ✓）。
  return args[0];
}
if (id === ObjectDefineProperty) {
  // **`Object.defineProperty(对象, 键, 描述符)`**（第 182 轮）✓——
  // 「怎么把描述符写进去」那一段第 276 轮**抽成了方法** ✓（`DefineOwnFromDescriptor` ✓）：
  // `defineProperties` 要的就是「同一件事跑在描述符表上每一格」✓，
  // 而那段里有两处**不能抄**的判断 ✓（默认三个标志全是假 ✓、访问器描述符要抛 ✗）——
  // 抄成两份就是两处会漂的答案 ✗。
  if (args.length < 3 || !args[0].IsObject() || args[1].Tag !== ValueTag.String || !args[2].IsObject()) {
    throw new Error("unimplemented: Object.defineProperty needs (object, string key, descriptor object)");
  }
  DefineOwnFromDescriptor(room, table, args[0], args[1], args[2]);
  // **返回的还是那个对象** ✓（JS 的口径 ✓）。
  return args[0];
}
if (id === ObjectDefineProperties) {
  // **`Object.defineProperties(对象, 描述符表)`**（第 276 轮 ✓）——
  // 把描述符表里**每一个可枚举的自有属性**当成一格描述符写进去 ✓。
  // **只走可枚举的那一份** ✓（JS 在这里用的就是 `Object.keys` 那一套 ✓）：
  // 描述符表是一个**普通对象字面量** ✓（`{ a: {…}, b: {…} }` ✓），
  // 里面每一项都可枚举 ✓；不可枚举的那些 JS **不看** ✓。
  if (args.length < 2 || !args[0].IsObject() || !args[1].IsObject()) {
    throw new Error("unimplemented: Object.defineProperties needs (object, descriptors object)");
  }
  const descriptorTable = table.Get(args[1].Ref);
  // **先把条数抄下来再走循环** ✓：写的是**另一个对象** ✓，所以扫的这一摞不会被改 ✓；
  // 而 `Props.length` 中途可能长 ✓（前面几格写进 `args[1]` 时不会 ✗，
  // 但**把它抄成一个宿主数**读起来更明确 ✓——与 `Object.keys` 那一支同一条理由 ✓）。
  const descriptorCount = descriptorTable.Props.length;
  for (let i = 0; i < descriptorCount; i++) {
    const entry = descriptorTable.Props[i];
    if (entry.Kind === PropertyKind.Accessor) continue;
    if (!entry.IsEnumerable()) continue;
    if (table.Get(entry.Key).Tag !== ValueTag.String) continue;
    DefineOwnFromDescriptor(room, table, args[0], Value.FromString(entry.Key), entry.Value);
  }
  return args[0];
}
if (id === ObjectGetOwnPropertyDescriptor) {
  // **`Object.getOwnPropertyDescriptor(对象, 键)`**（第 276 轮 ✓）——`defineProperty` 的**反面** ✓：
  // 把那一格的 `value` 与三个标志装成一个**普通对象** ✓。
  // **没有那一格给 `undefined`** ✓（JS 的口径 ✓——**不是**给一个空描述符 ✗）。
  // **字符串也是合法接收者** ✓（与 `Object.keys` / `getOwnPropertyNames` 那两支同一条 ✓，
  // 第 210 轮 ✓）：`Object.getOwnPropertyDescriptor("ab", "1")` 在 JS 里给一个描述符 ✓，
  // 而字符串**不是 `IsObject()`** ✗（它是 `HeapString` ✓）——所以这一句要**显式放行** ✓，
  // 只写 `IsObject()` 会把字符串挡在门外 ✓（**响亮地抛** ✓，不是静默错值 ✓，但那是**假缺口** ✗）。
  if (args.length < 2 || args[1].Tag !== ValueTag.String
    || (!args[0].IsObject() && args[0].Tag !== ValueTag.String)) {
    throw new Error("unimplemented: Object.getOwnPropertyDescriptor needs (object or string, string key)");
  }
  const receiver = args[0];
  const ownKey = args[1];
  const ownKeyText = TextFrom(table, ownKey);
  // **① 下标键先答** ✓：数组的元素与字符串的下标**不住在 `Props` 里** ✗
  //（与 `Object.keys` / `getOwnPropertyNames` 那两支同一条次序 ✓，第 210 轮 ✓）。
  //
  // **两种接收者的标志不一样** ✗（第 276 轮**实测**过 ✓，不是推的 ✓）：
  //   · **数组元素**：`可写 / 可枚举 / 可配置` **三个全真** ✓（JS 就是这样 ✓）；
  //   · **字符串下标**：`不可写 / 可枚举 / 不可配置` ✗——字符串是**不可变**的 ✓。
  // 写成一套（「都是数组那样」）就是**静默错值** ✓：`Object.getOwnPropertyDescriptor("ab", "1").writable`
  // 会答**真** ✗，而 JS 答**假** ✓。
  if (IsIndexKeyText(ownKeyText)) {
    const at = Number(ownKeyText);
    let element = Value.Undefined();
    let present = false;
    let elementWritable = true;
    // **字符串那一支要留着码元表** ✗：下面开串时还要用 ✓
    //（`element` 该是一个 **1 码元的串** ✓，不是码元数 ✗——第 276 轮实测 ✓：
    // `Object.getOwnPropertyDescriptor("ab", "1").value` 在 JS 里是 `"b"` ✓）。
    let elementUnits: number[] = [];
    if (receiver.Tag === ValueTag.Array) {
      const items = table.Get(receiver.Ref).AsArray();
      if (at < items.GetLength() && !items.IsHole(at)) {
        element = items.GetAt(at);
        present = true;
      }
    } else if (receiver.Tag === ValueTag.String) {
      elementUnits = table.Get(receiver.Ref).AsString().Units;
      if (at < elementUnits.length) {
        present = true;
        elementWritable = false;
      }
    }
    // **洞与越界都不是自有属性** ✓ ⇒ 落到最后的 `undefined` ✓（JS 的口径 ✓）。
    if (!present) return Value.Undefined();
    // **房间要一起问** ✓：字符串那一支要**开一个新串** ✓，所以 `CodeUnitCharge` 也算上 ✓
    //（与 `Object.keys` 那一支同一条规矩 ✓：开之前先问 ✓）。
    if (!room(ObjectCharge + PropertyCharge * 4 + CodeUnitCharge)) throw new Error("out of room");
    if (receiver.Tag === ValueTag.String) {
      element = Value.FromString(table.CreateString([elementUnits[at]]));
    }
    const elementDescriptor = NewPlainObject(room, table, protos);
    SetProperty(room, NeverCall, table, elementDescriptor, NameValue(table, "value"), element);
    SetProperty(room, NeverCall, table, elementDescriptor, NameValue(table, "writable"), Value.FromBool(elementWritable));
    SetProperty(room, NeverCall, table, elementDescriptor, NameValue(table, "enumerable"), Value.FromBool(true));
    // **两个不可配置、一个可配置** ✓：数组元素可配置 ✓、字符串下标不可 ✓
    //（`elementWritable` 那两格是同一次实测出来的 ✓）。
    SetProperty(room, NeverCall, table, elementDescriptor, NameValue(table, "configurable"), Value.FromBool(elementWritable));
    return elementDescriptor;
  }
  // **② `length` 也是自有属性** ✓（与 `Object.getOwnPropertyNames` 那一支同一条 ✓，第 214 轮 ✓）：
  // 它**不住在属性表里** ✗（在 `HeapArray` / `HeapString` 上 ✓）。
  // **两种接收者的标志又不一样** ✗（同一次实测 ✓）：
  //   · **数组**：`可写 / 不可枚举 / 不可配置` ✓（`xs.length = 0` 是合法的 ✓）；
  //   · **字符串**：`不可写 / 不可枚举 / 不可配置` ✓。
  // 次序也要紧 ✗：`"length"` **不是**下标键 ✓（`IsIndexKeyText` 看的是全数字 ✓），
  // 所以它落在这一支而不是上面那一支 ✓。
  if (ownKeyText === "length" && (receiver.Tag === ValueTag.Array || receiver.Tag === ValueTag.String)) {
    const lengthValue = receiver.Tag === ValueTag.Array
      ? table.Get(receiver.Ref).AsArray().GetLength()
      : table.Get(receiver.Ref).AsString().Units.length;
    if (!room(ObjectCharge + PropertyCharge * 4)) throw new Error("out of room");
    const lengthDescriptor = NewPlainObject(room, table, protos);
    SetProperty(room, NeverCall, table, lengthDescriptor, NameValue(table, "value"), Value.FromInt(lengthValue));
    SetProperty(room, NeverCall, table, lengthDescriptor, NameValue(table, "writable"),
      Value.FromBool(receiver.Tag === ValueTag.Array));
    SetProperty(room, NeverCall, table, lengthDescriptor, NameValue(table, "enumerable"), Value.FromBool(false));
    SetProperty(room, NeverCall, table, lengthDescriptor, NameValue(table, "configurable"), Value.FromBool(false));
    return lengthDescriptor;
  }
  // **② 自有属性表** ✓。**只在自有属性里找** ✓（与 `defineProperty` 同一条 ✓）：
  // `FindProperty` 会**沿原型链**找 ✗，所以找到之后还要问一句 `Owner === receiver.Ref` ✓——
  // 不问的话 `Object.getOwnPropertyDescriptor({}, "toString")` 会给一个描述符 ✗（JS 给 `undefined` ✓）。
  const ownFound = FindProperty(room, table, receiver.Ref, ownKey);
  if (ownFound === null || ownFound.Owner !== receiver.Ref) {
    // **函数上的 `length` / `name` 这一层还没有** ✗：JS 给一个描述符 ✓
    //（实测：`Object.getOwnPropertyDescriptor(function f(a, b) {}, "length")` 是
    // `2 / 不可写 / 不可枚举 / 可配置` ✓——注意它是**四个里唯一可配置的** ✗），
    // 而本仓的函数是 `Closure` / `Function` ✓、那两个名字**不在属性表里** ✓。
    // **响亮地抛** ✓，不静默给 `undefined` ✗——后者正是判据 `function-length-and-name`
    // 拖着的那一格 ✓（它今天也还没过 ✓，两处指的是同一件事 ✓）。
    if (receiver.Tag === ValueTag.Function || receiver.Tag === ValueTag.Closure) {
      throw new Error("unimplemented: Object.getOwnPropertyDescriptor on a function "
        + "(function length / name are not modelled)");
    }
    return Value.Undefined();
  }
  const ownProperty = table.Get(receiver.Ref).Props[ownFound.Index];
  // **内部标记不算自有属性** ✓（第 276 轮 ✓）：`Object.getOwnPropertyDescriptor(o, "__sealed")`
  // 该给 `undefined` ✓——它是实现细节 ✓，不该被描述符接口看见 ✓（见那个方法的说明 ✓）。
  if (IsSealedMarkProperty(table, ownProperty)) return Value.Undefined();
  // **访问器那一格给 `get` / `set` 两格** ✓（第 304 轮修的 ✗）——第 276 轮这里**响亮地抛** ✓，
  // 理由是「这一层还没有那两格的门」✓；**量了一下：门早就在** ✗——
  // 访问器就住在 `Property.Getter` / `Property.Setter` 上 ✓（`heap.xl.md` ✓），
  // 而对象字面量与类方法从第 98 轮起就一直走 `DefineAccessor` ✓。
  // **描述符的**形状**与数据属性不一样** ✗：访问器那一档**没有 `value` / `writable`** ✓，
  // 多的是 `get` / `set` ✓——写成「四格都填」就是**静默错值** ✓
  //（`"value" in d` 会从假变真 ✓，判据 `c304-std-object-descriptor-accessor` 量着它 ✓）。
  if (ownProperty.Kind === PropertyKind.Accessor) {
    if (!room(ObjectCharge + PropertyCharge * 4)) throw new Error("out of room");
    const accessorFlags = ownProperty.Flags;
    const accessorDescriptor = NewPlainObject(room, table, protos);
    SetProperty(room, NeverCall, table, accessorDescriptor, NameValue(table, "get"), ownProperty.Getter);
    SetProperty(room, NeverCall, table, accessorDescriptor, NameValue(table, "set"), ownProperty.Setter);
    SetProperty(room, NeverCall, table, accessorDescriptor, NameValue(table, "enumerable"),
      Value.FromBool((accessorFlags & PropertyFlagEnumerable) !== 0));
    SetProperty(room, NeverCall, table, accessorDescriptor, NameValue(table, "configurable"),
      Value.FromBool((accessorFlags & PropertyFlagConfigurable) !== 0));
    return accessorDescriptor;
  }
  if (!room(ObjectCharge + PropertyCharge * 4)) throw new Error("out of room");
  const ownFlags = ownProperty.Flags;
  const ownDescriptor = NewPlainObject(room, table, protos);
  SetProperty(room, NeverCall, table, ownDescriptor, NameValue(table, "value"), ownProperty.Value);
  SetProperty(room, NeverCall, table, ownDescriptor, NameValue(table, "writable"),
    Value.FromBool((ownFlags & PropertyFlagWritable) !== 0));
  SetProperty(room, NeverCall, table, ownDescriptor, NameValue(table, "enumerable"),
    Value.FromBool((ownFlags & PropertyFlagEnumerable) !== 0));
  SetProperty(room, NeverCall, table, ownDescriptor, NameValue(table, "configurable"),
    Value.FromBool((ownFlags & PropertyFlagConfigurable) !== 0));
  return ownDescriptor;
}
if (id === ObjectGetOwnPropertyDescriptors) {
  // **`Object.getOwnPropertyDescriptors(对象)`**（第 324 轮 ✓）——**一趟拿全表** ✓。
  //
  // **递归调自己** ✓（`InvokeGlobal` 就在这个函数里 ✓）：键那一趟走
  // `getOwnPropertyNames` / `getOwnPropertySymbols` ✓，每一格走**单数**那一条 ✓——
  // 于是「描述符长什么样」只有**一处**答案 ✓（第 276 / 304 轮那些实测出来的差别
  // ——数组元素三个真 ✓、字符串下标不可写 ✓、`length` 不可枚举不可配置 ✓、
  // 访问器没有 `value` ✓——**一条都不必在这里再写一遍** ✓）。
  // **抄一遍的代价是「两边会漂」** ✗，而漂出来的是「单数对、复数错」✓。
  if (args.length < 1 || (!args[0].IsObject() && args[0].Tag !== ValueTag.String)) {
    throw new Error("unimplemented: Object.getOwnPropertyDescriptors needs (object or string)");
  }
  const descriptorOwner = args[0];
  const out = NewPlainObject(room, table, protos);
  // **两趟键：先字符串、后符号** ✓（JS 的 `[[OwnPropertyKeys]]` 次序 ✓）——
  // 两支各自的口径（整数键在前 ✓、内部标记不算 ✓）已经定过了 ✓，这里不再想第二遍 ✓。
  const keyLists: Value[] = [
    InvokeGlobal(room, call, table, protos, ObjectGetOwnPropertyNames, descriptorOwner, [descriptorOwner], sink, failed, false),
    InvokeGlobal(room, call, table, protos, ObjectGetOwnPropertySymbols, descriptorOwner, [descriptorOwner], sink, failed, false),
  ];
  for (let k = 0; k < keyLists.length; k++) {
    const keys = table.Get(keyLists[k].Ref).AsArray();
    for (let i = 0; i < keys.GetLength(); i++) {
      if (keys.IsHole(i)) continue;
      const key = keys.GetAt(i);
      const descriptor = InvokeGlobal(room, call, table, protos, ObjectGetOwnPropertyDescriptor,
        descriptorOwner, [descriptorOwner, key], sink, failed, false);
      // **`undefined` 不写进去** ✗：单数那一支对「洞 / 越界 / 内部标记」给 `undefined` ✓，
      // 而那几格**本来就不该出现在这张表里** ✓（它们正是「不是自有属性」那几档 ✓）。
      if (descriptor.IsNullish()) continue;
      SetProperty(room, NeverCall, table, out, key, descriptor);
    }
  }
  return out;
}
if (id === ObjectSeal) {  // **`Object.seal(对象)`**（第 276 轮 ✓）——**不可配置、但仍然可写** ✓。
  // **这正是它与 `freeze` 的分界** ✓：`freeze` 两样都清 ✓、`seal` 只清 `configurable` ✓——
  // 两条判据（`object-freeze` 与这一条）量的就是这两样的**差** ✓。
  // **访问器跳过** ✗（与 `freeze` 同一条 ✓）：它的「可配置」挂在访问器那一格上 ✓，
  // 而这一层还没有那一格的门 ✓。
  if (args.length < 1 || !args[0].IsObject()) {
    throw new Error("unimplemented: Object.seal needs an object "
      + "(boxing a primitive is not supported)");
  }
  const sealTarget = table.Get(args[0].Ref);
  for (let i = 0; i < sealTarget.Props.length; i++) {
    const property = sealTarget.Props[i];
    if (property.Kind === PropertyKind.Accessor) continue;
    if ((property.Flags & PropertyFlagConfigurable) !== 0) {
      property.Flags = property.Flags - PropertyFlagConfigurable;
    }
  }
  // **标记也要打上** ✓——`isSealed` / `isFrozen` 从它起手 ✓（理由见号那一段 ✓）。
  MarkUnextensible(room, table, args[0]);
  return args[0];
}
if (id === ObjectIsExtensible) {
  // **`Object.isExtensible(对象)`**（第 291 轮 ✓）——**与上面那两格共用同一张底牌** ✓，
  // 只是**不取反** ✓（见号那一段 ✓：另开一个标记迟早会与 `IsUnextensible` 漂开 ✓）。
  // **原始值一律答假** ✓（JS 的口径 ✓）：`Object.isExtensible(1)` 是**假** ✓——
  // 与 `isSealed` / `isFrozen` 那两格的「原始值答真」**正好相反** ✗，
  // 所以这一句**不能顺手抄上面那一支** ✗（抄了就是三格一起**静默**反向 ✓）。
  if (args.length < 1 || !args[0].IsObject()) return Value.FromBool(false);
  return Value.FromBool(!IsUnextensible(room, table, args[0]));
}
if (id === ObjectSetPrototypeOf) {
  // **`Object.setPrototypeOf(对象, 原型)`**（第 304 轮 ✓）——**走引擎那一条现成的路** ✓
  //（`RtSetProto` ✓，第 278 轮为 `extends` 写的 ✓）：那里已经定了两格的口径 ✓——
  // **接收者不是对象就抛** ✓、**原型不是对象就不做事** ✓（JS 的口径 ✓）。
  // **不在这里自己写 `table.Get(...).Proto = ...`** ✗：抄一遍就是第二处会漂的答案 ✓，
  // 而漂的表现是「`extends` 与这一格在某一档上分岔」✓（最难查的一种 ✓）。
  if (args.length < 2) {
    throw new Error("unimplemented: Object.setPrototypeOf needs (object, prototype)");
  }
  return RtSetProto(table, args[0], args[1]);
}
if (id === ObjectPreventExtensions) {
  // **`Object.preventExtensions(对象)`**（第 304 轮 ✓）——**只打标记、不动属性标志** ✓
  //（与 `seal` / `freeze` 的分界写在号那一段 ✓）。**返回的是那个对象本身** ✓（JS 的口径 ✓）。
  // **原始值原样返回** ✓（JS 的口径 ✓：`Object.preventExtensions(1)` 给 `1` ✓，不抛 ✓）。
  if (args.length < 1) return Value.Undefined();
  if (!args[0].IsObject()) return args[0];
  MarkUnextensible(room, table, args[0]);
  return args[0];
}
if (id === ObjectIsPrototypeOf) {
  // **`Object.prototype.isPrototypeOf(对象)`**（第 304 轮 ✓）——问「`self` 在它的原型链上吗」✓。
  // **走 `RtChainHas`** ✓（`instanceof` 的第三段 ✓，第 137 轮抽出来的 ✓）：
  // 它把**深度上限**与**终止条件**都写在一处 ✓（`props.xl.md` 的 `MaxProtoDepth` ✓）——
  // 自己再走一趟就是第二处会漂的环保护 ✓。
  // **两边都不是对象就答假** ✓（JS 的口径 ✓：`Object.prototype.isPrototypeOf(1)` 是假 ✓，
  // 而 `1..isPrototypeOf({})` 也是假 ✓——原始值身上没有原型链可走 ✓）。
  if (args.length < 1 || !args[0].IsObject()) return Value.FromBool(false);
  if (!self.IsObject()) return Value.FromBool(false);
  return Value.FromBool(RtChainHas(table, args[0], self.Ref));
}
if (id === ObjectIsSealed || id === ObjectIsFrozen) {
  // **两个问法共用一张底牌** ✓（第 276 轮 ✓）：**先问「标记在不在」** ✓——
  // 少了这一问，空对象会因为「每个自有属性都不可配置」**真空成立**而答**真** ✗
  //（JS 答**假** ✓：空对象是可扩展的 ✓）。**静默错值** ✓，所以这一格不能只看标志位 ✗。
  //
  // **原始值一律答真** ✓（JS 的口径 ✓）：`Object.isSealed(1)` 与 `Object.isFrozen(1)`
  // 在 JS 里都是**真** ✓——原始值本来就不可扩展、也没有属性可改 ✓。
  // 所以这一支的**缺省是「真」** ✗，与别的内建那套「缺省给假」正好相反 ✓（写在明处 ✓）。
  if (args.length < 1 || !args[0].IsObject()) return Value.FromBool(true);
  if (!IsUnextensible(room, table, args[0])) return Value.FromBool(false);
  if (id === ObjectIsSealed) {
    // **`seal` 是两件事** ✓（第 304 轮修正 ✗）：**不可扩展** ✓ **且每一格都不可配置** ✓。
    // 原来这一格只问了那个**标记** ✓ ⇒ `Object.preventExtensions({ x: 1 })` 之后
    // `Object.isSealed` 答**真** ✗（JS 答**假** ✓——那一格还是可配置的 ✓）。
    // 标记这一半是**必要的** ✓（空对象上「每格都不可配置」**真空成立** ✓，
    // 少了它 `Object.isSealed({})` 会答真 ✗），但**不是充分的** ✗——两件事都要问 ✓。
    // **内部标记不算自有属性** ✓（与 `isFrozen` 那一支同一条 ✓：它自己就是可写的 ✓）。
    const sealedTarget = table.Get(args[0].Ref);
    for (let i = 0; i < sealedTarget.Props.length; i++) {
      const sealedProperty = sealedTarget.Props[i];
      if (IsSealedMarkProperty(table, sealedProperty)) continue;
      if ((sealedProperty.Flags & PropertyFlagConfigurable) !== 0) return Value.FromBool(false);
    }
    return Value.FromBool(true);
  }
  // **`isFrozen` 再问一层** ✓：每个自有**数据**属性都不能可写 ✓
  //（访问器跳过 ✗——与 `freeze` / `seal` 那两支同一条 ✓）。
  const frozenTarget = table.Get(args[0].Ref);
  for (let i = 0; i < frozenTarget.Props.length; i++) {
    const property = frozenTarget.Props[i];
    if (property.Kind === PropertyKind.Accessor) continue;
    // **内部标记不算自有属性** ✓（第 276 轮实测踩到 ✓：它自己就是**可写**的 ✓，
    // 不跳过这一格，`Object.isFrozen(Object.freeze({y: 1}))` 会答**假** ✗）。
    if (IsSealedMarkProperty(table, property)) continue;
    if ((property.Flags & PropertyFlagWritable) !== 0) return Value.FromBool(false);
  }
  return Value.FromBool(true);
}
if (id === ObjectKeys) {
  // **`Object.keys` = 自有 + 可枚举 × 「下标键在前、其余按创建顺序」** ✓（第 210 轮补后两条 ✓）。
  //
  // **它原来只看 `Props`** ✗，于是**两整类东西一个都看不见** ✓：
  //   · **数组的元素**（住在 `HeapArray` 里 ✓，不在 `Props` 里 ✗）⇒ `Object.keys([1, 2])` 给 `[]` ✗（JS 给 `["0","1"]` ✓）；
  //   · **字符串的下标**（字符串没有 `Props` ✗）⇒ `Object.keys("ab")` **抛** ✓（JS 给 `["0","1"]` ✓）；
  // 而 **`Object.keys` 的次序也是语义** ✓：**整数样的键升序在前** ✓，其余按创建顺序 ✓——
  // `{ "a-b": 1, if: 2, 3: "three" }` 在 JS 里是 `["3","a-b","if"]` ✓
  //（判据 `ex-quoted-and-keyword-keys` 现场红的 ✓：原来给 `["a-b","if","3"]` ✗）。
  // **字符串也是合法的接收者** ✓（JS：`Object.keys("ab")` 给 `["0","1"]` ✓）——
  // 而字符串**没有属性表** ✗（它是 `HeapString` ✓），所以下面那一趟要跳过 ✓。
  const stringTarget = args[0].Tag === ValueTag.String;
  if (!stringTarget && args[0].Tag !== ValueTag.Array && !args[0].IsObject()) {
    throw new Error("Object.keys needs an object");
  }
  const ownItem = stringTarget ? null : table.Get(args[0].Ref);
  // **① 下标键**（数组跳过洞 ✓、字符串逐码元 ✓）——它们本来就是升序 ✓。
  const indexPositions = IndexKeyPositions(table, args[0]);
  const names: string[] = [];
  for (let i = 0; i < indexPositions.length; i++) names.push("" + indexPositions[i]);
  // **② `Props` 里的键**分成两摞 ✓（整数样的一摞要排在下标键之后、其余之前 ✓）。
  const intNames: string[] = [];
  const plainNames: string[] = [];
  if (ownItem !== null) {
  for (let i = 0; i < ownItem.Props.length; i++) {
    if (table.Get(ownItem.Props[i].Key).Tag !== ValueTag.String) continue;
    // **只看可枚举的**（第 182 轮修 ✓）：`Object.keys` 的口径是**自有 + 可枚举** ✓，
    // 而这一格原来**一个标志都不看** ✗——`Object.defineProperty(o, "x", { value: 1 })`
    // 默认 `enumerable: false` ✓，于是它与 JS 差一格（本仓会把它数进去 ✗）。
    // 这一条以前量不出来 ✓：在 `defineProperty` 落地之前，**所有**属性的 `enumerable` 都是真 ✓。
    // 同一趟把**私有字段**也筛掉了 ✓（它们第 210 轮起走隐藏属性 ✓，`enumerable` 是假 ✓）。
    if (!ownItem.Props[i].IsEnumerable()) continue;
    const text = TextFrom(table, Value.FromString(ownItem.Props[i].Key));
    // **已经被下标键覆盖的那些不再收** ✓（数组模型里元素不住在 `Props` 里 ✓，
    // 但**越界写过的下标**可能落在两处都有一份 ✓——只收一次 ✓）。
    if (IsIndexKeyText(text)) {
      let covered = false;
      for (let k = 0; k < indexPositions.length; k++) {
        if (indexPositions[k] === Number(text)) covered = true;
      }
      if (covered) continue;
      intNames.push(text);
      continue;
    }
    plainNames.push(text);
  }
  }
  // **③ 整数样的一摞升序**（插入排序 ✓——键数很少 ✓）。
  for (let i = 1; i < intNames.length; i++) {
    const cur = intNames[i];
    let j = i - 1;
    while (j >= 0 && Number(intNames[j]) > Number(cur)) {
      intNames[j + 1] = intNames[j];
      j = j - 1;
    }
    intNames[j + 1] = cur;
  }
  for (let i = 0; i < intNames.length; i++) names.push(intNames[i]);
  for (let i = 0; i < plainNames.length; i++) names.push(plainNames[i]);
  if (!room(ObjectCharge + ValueCharge * names.length + CodeUnitCharge * names.length * 4)) {
    throw new Error("out of room");
  }
  const handle = table.CreateArray();
  table.Get(handle).Proto = protos.Array;
  const result = table.Get(handle).AsArray();
  for (let i = 0; i < names.length; i++) {
    result.Push(Value.FromString(table.CreateString(Units(names[i]))));
  }
  return Value.FromArray(handle);
}
if (id === ObjectValues || id === ObjectEntries) {
  // **值与键值对**（第 120 轮补）：与 `Object.keys` 同一趟扫描 ✓，
  // 差别只有「要不要读值」——所以**访问器在这里必须跳过** ✗（`keys` 不必）。
  //
  // **第 210 轮把下标键也接上** ✓（与 `keys` 那一支同一条口径 ✓）：数组的元素 ✓、
  // 字符串的下标 ✓——它们排在最前面 ✓（`Object.values([1,2])` 在 JS 里是 `[1,2]` ✓，
  // 原来给 `[]` ✗）。
  //
  // **先把要用的值抄进宿主数组再分配** ✓：抄进来的是 `Value`（引用），
  // 而它们**住在源对象的属性表里** ✓——属性表由 `args[0]` 拴着，`args[0]` 是这次调用的根 ✓，
  // 所以中途的分配不会把它们收走 ✓（`GetIterator` 那条路是同一个理由）。
  const stringTarget2 = args[0].Tag === ValueTag.String;
  if (!stringTarget2 && args[0].Tag !== ValueTag.Array && !args[0].IsObject()) {
    throw new Error("Object.values/entries needs an object");
  }
  const own = stringTarget2 ? null : table.Get(args[0].Ref);
  const indexPositions2 = IndexKeyPositions(table, args[0]);
  const indexKeys: Value[] = [];
  const indexValues: Value[] = [];
  for (let i = 0; i < indexPositions2.length; i++) {
    // **键是位置本身** ✓（`[1, , 3]` 给 `"0"` 与 `"2"` ✓，不是 `"0"` 与 `"1"` ✗）。
    indexKeys.push(Value.FromString(table.CreateString(Units("" + indexPositions2[i]))));
    indexValues.push(IndexKeyValueAt(room, table, args[0], indexPositions2[i]));
  }
  // **`Props` 里那两摞** ✓：与 `Object.keys` 那一支同一处次序规矩 ✓
  //（整数样的键升序在前 ✓、其余按创建顺序 ✓）——`Object.values({ "a-b": 1, 3: "three" })`
  // 在 JS 里是 `["three", 1]` ✓（**值的次序跟着键** ✓）。
  const intKeys: number[] = [];
  const intValues: Value[] = [];
  const plainKeys: number[] = [];
  const plainValues: Value[] = [];
  if (own !== null) {
  for (let i = 0; i < own.Props.length; i++) {
    if (table.Get(own.Props[i].Key).Tag !== ValueTag.String) continue;
    if (own.Props[i].IsAccessor()) continue;
    // **可枚举才算**（第 182 轮，与 `keys` 那一条同一处修正 ✓）；私有字段是隐藏的 ✓，一起筛掉 ✓。
    if (!own.Props[i].IsEnumerable()) continue;
    // **与下标键重复的那些**（越界写过的下标 ✓）不重复收 ✓。
    const propText = TextFrom(table, Value.FromString(own.Props[i].Key));
    if (IsIndexKeyText(propText)) {
      let coveredValue = false;
      for (let k = 0; k < indexPositions2.length; k++) {
        if (indexPositions2[k] === Number(propText)) coveredValue = true;
      }
      if (coveredValue) continue;
      intKeys.push(own.Props[i].Key);
      intValues.push(own.Props[i].Value);
      continue;
    }
    plainKeys.push(own.Props[i].Key);
    plainValues.push(own.Props[i].Value);
  }
  }
  // **整数样的一摞升序**（键与值一起换 ✓——两摞是平行的 ✓）。
  for (let i = 1; i < intKeys.length; i++) {
    const curKey = intKeys[i];
    const curValue = intValues[i];
    let j = i - 1;
    while (j >= 0 && Number(TextFrom(table, Value.FromString(intKeys[j]))) > Number(TextFrom(table, Value.FromString(curKey)))) {
      intKeys[j + 1] = intKeys[j];
      intValues[j + 1] = intValues[j];
      j = j - 1;
    }
    intKeys[j + 1] = curKey;
    intValues[j + 1] = curValue;
  }
  const keys: number[] = [];
  const values: Value[] = [];
  for (let i = 0; i < intKeys.length; i++) {
    keys.push(intKeys[i]);
    values.push(intValues[i]);
  }
  for (let i = 0; i < plainKeys.length; i++) {
    keys.push(plainKeys[i]);
    values.push(plainValues[i]);
  }
  if (!room(ObjectCharge + ValueCharge * (indexValues.length * 2 + values.length * 2 + 2)
    + CodeUnitCharge * (indexKeys.length + values.length) * 4)) {
    throw new Error("out of room");
  }
  const handle = table.CreateArray();
  table.Get(handle).Proto = protos.Array;
  const result = table.Get(handle).AsArray();
  for (let i = 0; i < indexValues.length; i++) {
    if (id === ObjectValues) {
      result.Push(indexValues[i]);
      continue;
    }
    const indexPair = NewPlainArray(room, table, protos);
    table.Get(indexPair.Ref).AsArray().Push(indexKeys[i]);
    table.Get(indexPair.Ref).AsArray().Push(indexValues[i]);
    result.Push(indexPair);
  }
  for (let i = 0; i < values.length; i++) {
    if (id === ObjectValues) {
      result.Push(values[i]);
      continue;
    }
    // `entries` 给的是 `[键, 值]` 的**新数组**（JS 的形状 ✓），所以它也要数组原型 ✓。
    const pair = NewPlainArray(room, table, protos);
    table.Get(pair.Ref).AsArray().Push(Value.FromString(keys[i]));
    table.Get(pair.Ref).AsArray().Push(values[i]);
    result.Push(pair);
  }
  return Value.FromArray(handle);
}
if (id === ObjectGetOwnPropertyNames) {
  // **`Object.getOwnPropertyNames(o)`** ✓（第 214 轮 ✓）——与 `Object.keys` **只差一格** ✓：
  // 它**不管 `enumerable`** ✗（`defineProperty(o, "x", { value: 1 })` 那默认的不可枚举一格 ✓
  // 在 `keys` 里看不见 ✓、在这里看得见 ✓）。次序、下标键那两条口径**一字不差** ✓。
  //
  // **它是 `Object.keys` 的第二份实现吗** ✗：不是——**过滤那一步**不同而已 ✓，
  // 所以这里照抄的是同一趟扫描 ✓、只把 `IsEnumerable()` 那一句去掉 ✓（写在明处 ✓：
  // 两处的差异**只有那一句** ✓，谁改了次序都要记得两边一起改 ✓）。
  const nameTarget = args.length > 0 ? args[0] : Value.Undefined();
  const nameIsText = nameTarget.Tag === ValueTag.String;
  if (!nameIsText && nameTarget.Tag !== ValueTag.Array && !nameTarget.IsObject()) {
    throw new Error("Object.getOwnPropertyNames needs an object");
  }
  const nameItem = nameIsText ? null : table.Get(nameTarget.Ref);
  const nameIndexPositions = IndexKeyPositions(table, nameTarget);
  const ownNames: string[] = [];
  for (let i = 0; i < nameIndexPositions.length; i++) ownNames.push("" + nameIndexPositions[i]);
  // **`length` 也是自有属性** ✓（第 214 轮实测 ✓）：JS 的 `Object.getOwnPropertyNames([1, 2])`
  // 是 `["0", "1", "length"]` ✓、字符串同理 ✓——而本仓的 `length` **不住在属性表里** ✗
  //（它在 `HeapArray` 上 ✓，`keys` 那一支看不见它是因为它**不可枚举** ✓ 在这里却是**要看见**的 ✓）。
  // 次序对 ✓：下标在前、`length` 在后 ✓（JS 的整数键优先那一套 ✓）。
  if (nameTarget.Tag === ValueTag.Array || nameTarget.Tag === ValueTag.String) {
    ownNames.push("length");
  }
  const ownIntNames: string[] = [];
  const ownPlainNames: string[] = [];
  if (nameItem !== null) {
    for (let i = 0; i < nameItem.Props.length; i++) {
      if (table.Get(nameItem.Props[i].Key).Tag !== ValueTag.String) continue;
      // **内部标记不算自有属性** ✓（第 276 轮 ✓）：它挂在**不可枚举**那一档上 ✓，
      // 而这一支的判据恰恰是「**不管 `enumerable`**」✗——所以它会漏出来 ✓
      //（实测：`Object.getOwnPropertyNames(Object.seal({x: 1}))` 给 `["x","__sealed"]` ✗，
      //  JS 给 `["x"]` ✓）。**这一句是这一支与 `Object.keys` 唯一的差别多出来的一行** ✓。
      if (IsSealedMarkProperty(table, nameItem.Props[i])) continue;
      const text = TextFrom(table, Value.FromString(nameItem.Props[i].Key));
      if (IsIndexKeyText(text)) {
        let coveredName = false;
        for (let k = 0; k < nameIndexPositions.length; k++) {
          if (nameIndexPositions[k] === Number(text)) coveredName = true;
        }
        if (coveredName) continue;
        ownIntNames.push(text);
        continue;
      }
      ownPlainNames.push(text);
    }
  }
  for (let i = 1; i < ownIntNames.length; i++) {
    const curName = ownIntNames[i];
    let j = i - 1;
    while (j >= 0 && Number(ownIntNames[j]) > Number(curName)) {
      ownIntNames[j + 1] = ownIntNames[j];
      j = j - 1;
    }
    ownIntNames[j + 1] = curName;
  }
  for (let i = 0; i < ownIntNames.length; i++) ownNames.push(ownIntNames[i]);
  for (let i = 0; i < ownPlainNames.length; i++) ownNames.push(ownPlainNames[i]);
  if (!room(ObjectCharge + ValueCharge * ownNames.length + CodeUnitCharge * ownNames.length * 4)) {
    throw new Error("out of room");
  }
  const namesHandle = table.CreateArray();
  table.Get(namesHandle).Proto = protos.Array;
  const namesResult = table.Get(namesHandle).AsArray();
  for (let i = 0; i < ownNames.length; i++) {
    namesResult.Push(Value.FromString(table.CreateString(Units(ownNames[i]))));
  }
  return Value.FromArray(namesHandle);
}
if (id === ObjectGetOwnPropertySymbols) {
  // **`Object.getOwnPropertySymbols(o)`** ✓（第 288 轮 ✓）——`getOwnPropertyNames` 的**镜像** ✓：
  // 同一趟扫描 ✓、同一处「**内部标记不算自有属性**」的过滤 ✓（第 276 轮那条 ✓），
  // **只把「键是不是字符串」翻成「键是不是符号」** ✓。
  //
  // **次序照属性表的次序** ✓：符号键**不参与**「整数键优先」那一套 ✗
  //（JS 的 `[[OwnPropertyKeys]]` 是「整数键 → 字符串键 → 符号键」三段 ✓，
  //  而这一段**本身就是最后那一段** ✓ ⇒ 直接按插入序交出去 ✓）。
  //
  // **`length` 与下标键都不在结果里** ✓：它们不是符号键 ✓——
  // 所以这一支**不需要** `IndexKeyPositions` 那一套 ✓（那一套是给字符串键用的 ✓），
  // 也不需要在数组 / 字符串上特判 ✓。
  const symbolsTarget = args.length > 0 ? args[0] : Value.Undefined();
  if (symbolsTarget.Tag !== ValueTag.String && symbolsTarget.Tag !== ValueTag.Array
    && !symbolsTarget.IsObject()) {
    throw new Error("Object.getOwnPropertySymbols needs an object");
  }
  // **字符串与数组的符号键在属性表里** ✓（`length` / 下标不在 ✓，而它们也不是符号 ✓）——
  // 所以这一句与 `getOwnPropertyNames` 那一边的取法一致 ✓。
  const symbolsItem = symbolsTarget.Tag === ValueTag.String ? null : table.Get(symbolsTarget.Ref);
  const ownSymbols: Value[] = [];
  if (symbolsItem !== null) {
    for (let i = 0; i < symbolsItem.Props.length; i++) {
      // **键是句柄** ✓（`heap.xl.md` 的 `Property.Key` ✓）——它指向一个 `HeapString`
      // 或 `HeapSymbol` ✓，**看那一格的 `Tag`** ✓（与 `getOwnPropertyNames` 那边
      // 判「是不是字符串」用的是同一句 ✓，只翻了个方向 ✓）。
      if (table.Get(symbolsItem.Props[i].Key).Tag !== ValueTag.Symbol) continue;
      if (IsSealedMarkProperty(table, symbolsItem.Props[i])) continue;
      ownSymbols.push(Value.FromRef(ValueTag.Symbol, symbolsItem.Props[i].Key));
    }
  }
  if (!room(ObjectCharge + ValueCharge * ownSymbols.length)) throw new Error("out of room");
  const symbolsHandle = table.CreateArray();
  table.Get(symbolsHandle).Proto = protos.Array;
  const symbolsResult = table.Get(symbolsHandle).AsArray();
  for (let i = 0; i < ownSymbols.length; i++) symbolsResult.Push(ownSymbols[i]);
  return Value.FromArray(symbolsHandle);
}
if (id === ObjectFromEntries) {
  // **`Object.fromEntries(entries)`** ✓（第 214 轮 ✓）：`[[k, v], …]` 或一个 `Map` ✓ →
  // 造一个**普通对象** ✓。
  //
  // **`Map` 那一支读的是它的内部两格** ✓（`__k` / `__v` ✓，`map.xl.md` 的表示 ✓）：
  // 这里**不去走迭代协议** ✗——那要 `protos` 与调用通道那一整套 ✓，
  // 而 `Map` 的内部表示就在手边 ✓（`ReadOwn` ✓）。
  // **别的可迭代物不支持** ✓：响亮地抛 ✓（不静默给空对象 ✗）。
  const entriesTarget = args.length > 0 ? args[0] : Value.Undefined();
  // **造属性要一条调用通道** ✓（`SetProperty` 可能碰到 setter ✓）——没有就响亮地抛 ✓。
  if (call === null) {
    throw new Error("Object.fromEntries needs a call channel (the host must pass one)");
  }
  const made = NewPlainObject(room, table, protos);
  if (entriesTarget.Tag === ValueTag.Array) {
    const rows = table.Get(entriesTarget.Ref).AsArray();
    for (let i = 0; i < rows.GetLength(); i++) {
      if (rows.IsHole(i)) continue;
      const row = rows.GetAt(i);
      if (row.Tag !== ValueTag.Array) {
        throw new Error("unimplemented: Object.fromEntries needs [key, value] pairs");
      }
      const pair = table.Get(row.Ref).AsArray();
      SetProperty(room, call, table, made, PropertyKeyOf(table, pair.GetAt(0)), pair.GetAt(1));
    }
    return made;
  }
  if (entriesTarget.Tag === ValueTag.Object && RtChainHas(table, entriesTarget, protos.Map)) {
    const mapKeys = ReadOwn(room, table, entriesTarget, "__k");
    const mapValues = ReadOwn(room, table, entriesTarget, "__v");
    const mapKeyArray = table.Get(mapKeys.Ref).AsArray();
    const mapValueArray = table.Get(mapValues.Ref).AsArray();
    for (let i = 0; i < mapKeyArray.GetLength(); i++) {
      if (mapKeyArray.IsHole(i)) continue;
      SetProperty(room, call, table, made, PropertyKeyOf(table, mapKeyArray.GetAt(i)), mapValueArray.GetAt(i));
    }
    return made;
  }
  throw new Error("unimplemented: Object.fromEntries over a value that is neither an array nor a Map");
}
if (id === JsonParse) {
  // **`JSON.parse`**（第 122 轮）：实参必须是字符串 ✓——坏输入**抛** ✓，
  // 而那个抛由宿主通道抬成**脚本接得住**的异常 ✓（第 121 轮那条路 ✓）。
  //
  // **坏输入抛的是 `SyntaxError`** ✓（第 277 轮 ✓）：那 22 处写的是**宿主的**那个类 ✓，
  // 由 `RaiseFromHost` 翻成脚本的族 ✓（第 227 轮那条桥 ✓）。
  if (args.length < 1 || args[0].Tag !== ValueTag.String) {
    throw new SyntaxError("JSON.parse needs a string");
  }
  // **第二格实参（reviver）** ✓（第 279 轮 ✓）：JS 的规矩是**自底向上**走一遍 ——
  // 先让每一格过一遍回调 ✓，最后再拿**根**调一次 ✓（键是空串 ✓）。
  //
  // **根要锚住** ✗：整棵解析出来的树在这一次调用期间**只有宿主变量指着它** ✓，
  // 而回调里会分配 ✓（脚本跑起来什么都可能造 ✓）——不锚的话，某一轮回调之后
  // 剩下的那些格子**可能已经被收走** ✓（症状是「回调跑到一半拿到死句柄」✗，
  // 与第 200 轮 `reduce` 那个累加器一模一样的形状 ✓）。
  // **锚在哪** ✗：`protos.WellKnownSymbols` ✓——它由 `Protos.Roots` 挂着 ✓（第 184 轮 ✓），
  // 而这一层手里只有 `protos` ✓（没有模块级可变量 ✓，与 `Symbol.for` 那张注册表同一个理由 ✓）。
  // **要存旧的、跑完恢复** ✗：回调里还可能再调一次 `JSON.parse` ✓（合法 ✓）——
  // 不恢复的话内层跑完会把外层的根换掉 ✓，外层剩下那几格就没人指着了 ✓。
  const anchorKey = Value.FromString(table.CreateString(Units("__jsonRoot")));
  const anchorAt = FindProperty(room, table, protos.WellKnownSymbols, anchorKey);
  let previousAnchor = Value.Undefined();
  let hadAnchor = false;
  if (anchorAt !== null && anchorAt.Owner === protos.WellKnownSymbols) {
    previousAnchor = table.Get(protos.WellKnownSymbols).Props[anchorAt.Index].Value;
    hadAnchor = true;
  }
  if (!room(ObjectCharge + PropertyCharge * 2 + ValueCharge)) throw new Error("out of room");
  const rootHolder = NewPlainObject(room, table, protos);
  // **先把 holder 锚上、再解析** ✓：`JsonParseText` 自己会分配一大堆 ✓，
  // 而它交出来的那棵树**还没有人指着** ✓——锚在前面就没有那个窗口 ✓。
  SetHiddenProperty(room, table, Value.FromObject(protos.WellKnownSymbols), anchorKey, rootHolder);
  const parsed = JsonParseText(room, table, protos, JsTextUnits(table, args[0]));
  SetProperty(room, NeverCall, table, rootHolder, Value.FromString(table.CreateString(Units(""))), parsed);
  // **没有 reviver（或它不可调）就到此为止** ✓（JS 的口径 ✓：`JSON.parse(x, 1)` 是**忽略** ✓）。
  if (args.length < 2 || !IsCallableValue(table, args[1]) || call === null) {
    if (hadAnchor) {
      SetHiddenProperty(room, table, Value.FromObject(protos.WellKnownSymbols), anchorKey, previousAnchor);
    } else {
      DeleteProperty(table, protos.WellKnownSymbols, anchorKey);
    }
    return parsed;
  }
  const revived = JsonRevive(room, table, call, failed, rootHolder, "", args[1]);
  if (hadAnchor) {
    SetHiddenProperty(room, table, Value.FromObject(protos.WellKnownSymbols), anchorKey, previousAnchor);
  } else {
    DeleteProperty(table, protos.WellKnownSymbols, anchorKey);
  }
  return revived;
}
if (id === JsonStringify) {
  const target = args.length > 0 ? args[0] : Value.Undefined();
  // **第三、四个实参：缩进**（第 192 轮 ✓）。JS 收两种 ✓：**数字**（空格个数 ✓，
  // 夹到 0..10 ✓）与**字符串**（前十个字符 ✓）✓；别的（`undefined` / `null` / 对象 ✓）
  // 一律当「不缩进」✓。这一格原来是**整段忽略** ✗（永远紧凑 ✓，**静默**不同 ✗）。
  let jsonIndent = "";
  if (args.length > 2) {
    const indentArg = args[2];
    if (indentArg.IsNumber()) {
      let width = indentArg.AsInt();
      if (width > 10) width = 10;
      for (let i = 0; i < width; i++) jsonIndent = jsonIndent + " ";
    } else if (indentArg.Tag === ValueTag.String) {
      const rawIndent = TextFrom(table, indentArg);
      jsonIndent = rawIndent.length > 10 ? rawIndent.substring(0, 10) : rawIndent;
    }
  }
  // **锚那一格**（第 294 轮 ✓）：`JsonText` 调完 `toJSON` / replacer 之后，那一趟的产物
  // **只有宿主变量指着** ✓，而递归里还会再调脚本 ✓（脚本里会分配 ✓）——
  // 所以先造一个**数组**当锚、**挂到 `protos.WellKnownSymbols` 上** ✓
  //（与第 279 轮 `JSON.parse` 的 reviver **同一处坎、同一个理由** ✓：
  // 这一层手里只有 `protos` ✓，没有模块级可变量 ✓）。
  // **按递归深度分格** ✓（一层一格 ✓）——理由写在 `JsonAnchor` 那一段 ✓。
  // **存旧的、跑完恢复** ✗：`toJSON` / replacer 里还可能再调一次 `JSON.stringify` ✓（合法 ✓）——
  // 不恢复的话内层跑完会把外层这一格换掉 ✓。
  //
  // **没有 `call` 通道时一次都不会用它** ✓：`JsonText` 里那两支（`call !== null`）
  // 根本不会跑 ✓——**照旧的纯查询一条都不变** ✓。
  const jsonAnchorKey = Value.FromString(table.CreateString(Units("__jsonTextAnchor")));
  const jsonAnchorAt = FindProperty(room, table, protos.WellKnownSymbols, jsonAnchorKey);
  let previousJsonAnchor = Value.Undefined();
  let hadJsonAnchor = false;
  if (jsonAnchorAt !== null && jsonAnchorAt.Owner === protos.WellKnownSymbols) {
    previousJsonAnchor = table.Get(protos.WellKnownSymbols).Props[jsonAnchorAt.Index].Value;
    hadJsonAnchor = true;
  }
  let jsonAnchor = 0;
  if (call !== null) {
    if (!room(ObjectCharge + PropertyCharge + ValueCharge * 2)) throw new Error("out of room");
    const anchorArray = NewPlainArray(room, table, protos);
    jsonAnchor = anchorArray.Ref;
    SetHiddenProperty(room, table, Value.FromObject(protos.WellKnownSymbols), jsonAnchorKey,
      Value.FromArray(anchorArray.Ref));
  }
  // **第二格实参（replacer）** ✓（第 294 轮 ✓）：JS 收**函数**（逐格改写 ✓）
  // 与**数组**（键的白名单 ✓）两种 ✓，别的（`null` / 对象 ✓）一律**忽略** ✓。
  // 这里是**原样递下去** ✓：是哪一种由 `JsonText` 那两处按类型判 ✓
  //（分开判两次比在这里折成两种参数少一层 ✓）。
  const jsonReplacer = args.length > 1 ? args[1] : Value.Undefined();
  const rendered = JsonText(room, call, protos, table, jsonAnchor, jsonReplacer, target,
    Value.FromString(table.CreateString([])), Value.Undefined(), 0, false, jsonIndent);
  if (call !== null) {
    if (hadJsonAnchor) {
      SetHiddenProperty(room, table, Value.FromObject(protos.WellKnownSymbols), jsonAnchorKey, previousJsonAnchor);
    } else {
      DeleteProperty(table, protos.WellKnownSymbols, jsonAnchorKey);
    }
  }
  if (rendered === null) return Value.Undefined();
  if (!room(ObjectCharge + CodeUnitCharge * rendered.length)) throw new Error("out of room");
  return Value.FromString(table.CreateString(Units(rendered)));
}
if (id === DateCtor) {
  // **`new Date(毫秒)`**（降级层直接落成这一条 `host_call`，见 `DateCtor` 的说明）。
  // 实例是一个**普通对象** ✓：毫秒存在 `__t` 里 ✓，方法**挂在实例自己身上** ✓
  // （与 `Map` 同一套配方 ✓）。**但原型那一格是 `Protos.Date`** ✓（第 138 轮）——
  // 「方法挂实例」与「这一族是谁」是两件事 ✓：前者决定 `Object.keys(d)` 里有什么 ✓，
  // 后者决定 `d instanceof Date` ✓。少了后者，`instanceof` 那一族又是「一半对」✗。
  const created = NewPlainObject(room, table, protos);
  table.Get(created.Ref).Proto = protos.Date;
  // **四条构造形态** ✓（第 293 轮把后三条补齐 ✓）：
  //   · 不给实参 ⇒ `0` ✗（**没有时钟接口** ✓，见 `ClockNow` 那一段 ✓——宿主真接了时钟的话走的是 `Date.now` ✓）；
  //   · 一个数 ⇒ 毫秒数 ✓（第 138 轮 ✓）；
  //   · **一个字符串 ⇒ `Date.parse`** ✓（与静态那条**同一条** ✓，不写第二份解析器 ✗）；
  //   · **两个以上 ⇒ 年 / 月 / 日 / 时 / 分 / 秒 / 毫秒** ✓（缺的按 JS 的默认值补 ✓：
  //     日缺省 `1` ✓、其余缺省 `0` ✓）。
  //
  // **`0..99` 的年份要加 1900** ✓（JS 的两条构造**都是**这条口径 ✓，与 `Date.UTC` 一字不差 ✓）——
  // 少了它 `new Date(99, 0, 1)` 会变成**公元 99 年** ✓（**静默错值** ✓，而且是错 1900 年 ✓）。
  //
  // **本地时间那一档本仓当 UTC 用** ✗（写在明处 ✓）：本仓没有时区库 ✓，
  // 所以「构造用哪个口径、读取就用哪个口径」✓——`new Date(2020, 0, 2, 3, 4, 5)` 与
  // `getFullYear()` / `getHours()` 这一对**自洽** ✓（判据量的正是这一对 ✓）。
  // 而**混用**本地与 UTC 的程序会与 Node 差一个时区偏移 ✓（例如 `new Date(0).getHours()`
  // 在 UTC+8 的机器上 Node 给 `8` ✓、本仓给 `0` ✓）——记在台账里 ✓。
  let ms = Value.FromInt(0);
  if (args.length === 1) {
    if (args[0].Tag === ValueTag.String) {
      ms = Value.FromDouble(DateParseUnits(JsTextUnits(table, args[0])));
    } else {
      ms = args[0];
    }
  } else if (args.length > 1) {
    const askedYear = ArgOr(args, 0, 0);
    const fullYear = askedYear >= 0 && askedYear <= 99 ? askedYear + 1900 : askedYear;
    ms = Value.FromDouble(DateMakeMs(fullYear, ArgOr(args, 1, 0), ArgOr(args, 2, 1),
      ArgOr(args, 3, 0), ArgOr(args, 4, 0), ArgOr(args, 5, 0), ArgOr(args, 6, 0)));
  }
  if (!ms.IsNumber()) throw new Error("unimplemented: new Date(x) needs a number of milliseconds or an ISO string");
  // **`__t` 也是不可枚举的**（第 194 轮 ✓）：JS 的 `Object.keys(new Date())` 是 `[]` ✓
  //（本仓原来给 8 个键 ✗）。**`JSON.stringify(date)` 那一格仍旧不同** ✗：
  // JS 走 `toJSON` ✓ 给 ISO 字符串 ✓，本仓给 `{"__t":0}` ✓——那是**另一件事** ✓，
  // 与新加的 `Date.prototype.toJSON` 一起单独立一轮 ✓（记在台账里 ✓）。
  SetHiddenProperty(room, table, created,
    Value.FromString(table.CreateString(Units("__t"))), ms);
  const methodIds = [DateGetTime, DateGetUTCFullYear, DateGetUTCMonth, DateGetUTCDate,
    DateGetUTCHours, DateGetUTCMinutes, DateGetUTCSeconds, DateGetTime,
    // **第 280 轮补的两格** ✓：`toISOString` ✓ 与 `toJSON` ✓（**同一个号** ✓，见号那一段 ✓）。
    DateToISOString, DateToISOString,
    // **七个 `setUTC*`** ✓（第 280 轮 ✓）——名字与号**一一对齐** ✓（按下标配 ✓）。
    DateSetUTCFullYear, DateSetUTCMonth, DateSetUTCDate, DateSetUTCHours,
    DateSetUTCMinutes, DateSetUTCSeconds, DateSetUTCMilliseconds,
    // **第 293 轮补的九个名字** ✓——**本地那一族与 UTC 共用同一个号** ✓
    //（`getFullYear` = `getUTCFullYear` ✓ …），理由是**本仓的本地口径就是 UTC** ✓
    //（见上面那一段 ✓）：写第二份实现就是第二份会漂的答案 ✗
    //（与 `valueOf` = `getTime` ✓、`toJSON` = `toISOString` ✓ 同一条先例 ✓）。
    DateGetUTCMilliseconds, DateGetUTCMilliseconds, DateGetUTCDay, DateGetUTCDay,
    DateGetUTCFullYear, DateGetUTCMonth, DateGetUTCDate, DateGetUTCHours,
    DateGetUTCMinutes, DateGetUTCSeconds,
    // **`toString` 单独一个号** ✓（只做 `Invalid Date` 那一档 ✓，见号那一段 ✓）。
    DateToString];
  // **`valueOf` 就是 `getTime`**（第 198 轮 ✓）：JS 的 `Date.prototype.valueOf` 给的正是那一格
  // 毫秒数 ✓——**同一个能力号** ✓（同一件事不写第二份实现 ✓，与数组的 `toString` = `join` 同款 ✓）。
  // 它让**日常那个写法**通了 ✓：`+new Date()`（一元 `+` 是 `ToNumber` ✓ →
  // `ToPrimitive(date, number)` ✓ → `valueOf` ✓ → 毫秒数 ✓）。
  // **`date + 1` 仍旧响亮地抛** ✓（那是 hint `default` ✓，JS 按 `string` 走 ✓，
  // 会给日期串 ✗——本仓的 `toString` 只做 `Invalid Date` 那一档 ✓，见号那一段 ✓）。
  const methodNames = ["getTime", "getUTCFullYear", "getUTCMonth", "getUTCDate",
    "getUTCHours", "getUTCMinutes", "getUTCSeconds", "valueOf",
    "toISOString", "toJSON",
    "setUTCFullYear", "setUTCMonth", "setUTCDate", "setUTCHours",
    "setUTCMinutes", "setUTCSeconds", "setUTCMilliseconds",
    "getMilliseconds", "getUTCMilliseconds", "getDay", "getUTCDay",
    "getFullYear", "getMonth", "getDate", "getHours", "getMinutes", "getSeconds",
    "toString"];
  for (let i = 0; i < methodIds.length; i++) {
    // **方法也不可枚举**（第 194 轮 ✓）：`Object.keys(new Date())` 在 JS 里是 `[]` ✓。
    SetHiddenProperty(room, table, created,
      Value.FromString(table.CreateString(Units(methodNames[i]))),
      Value.FromRef(ValueTag.HostRef, table.CreateHostRef(methodIds[i], 0)));
  }
  return created;
}
if (id === DateGetTime || id === DateGetUTCFullYear || id === DateGetUTCMonth
  || id === DateGetUTCDate || id === DateGetUTCHours || id === DateGetUTCMinutes
  || id === DateGetUTCSeconds || id === DateGetUTCMilliseconds || id === DateGetUTCDay) {
  // **实例方法**：先从 `__t` 取毫秒（`self` 就是那个实例）。
  const stored = FindProperty(room, table, self.Ref,
    Value.FromString(table.CreateString(Units("__t"))));
  if (stored === null) throw new Error("unimplemented: not a Date receiver (no __t)");
  const ms = NumericOf(table.Get(stored.Owner).Props[stored.Index].Value);
  if (id === DateGetTime) return MathResult(ms);
  if (id === DateGetUTCFullYear) return Value.FromInt(DateParts(ms)[0]);
  if (id === DateGetUTCMonth) return Value.FromInt(DateParts(ms)[1]);
  if (id === DateGetUTCDate) return Value.FromInt(DateParts(ms)[2]);
  // **一天之内的部分**：与日历那一半无关，所以单独算 ✓（`+86400` 那一步是为了
  // **负毫秒**——1970 年以前的时刻也要给出 0..86399 之内的秒数 ✓）。
  const seconds = Math.floor(ms / 1000);
  const secondOfDay = ((seconds % 86400) + 86400) % 86400;
  if (id === DateGetUTCHours) return Value.FromInt(Math.floor(secondOfDay / 3600));
  if (id === DateGetUTCMinutes) return Value.FromInt(Math.floor(secondOfDay / 60) % 60);
  if (id === DateGetUTCSeconds) return Value.FromInt(secondOfDay % 60);
  if (id === DateGetUTCMilliseconds) {
    // **毫秒那一格要从原始 `ms` 取** ✗（不是上面那个「一天的秒数」✓）——
    // 负毫秒上写成 `ms % 1000` 会给负数 ✓（`-1` 该给 `999` ✓），所以先折回非负 ✓。
    const whole = Math.floor(ms);
    return Value.FromInt(((whole % 1000) + 1000) % 1000);
  }
  // **星期几** ✓（第 293 轮 ✓）：从纪元起的**天数**对 7 取模 ✓，
  // 而 `1970-01-01` 是**周四** ✓ ⇒ 加 4 之后 `0` 才是周日 ✓。
  // **先 `floor` 到天** ✗（不是拿毫秒除 ✓：`-1` 毫秒是 1969-12-31 ✓，纳秒级的截断会让它差一天 ✓）。
  const dayNumber = Math.floor(ms / 86400000);
  return Value.FromInt((((dayNumber + 4) % 7) + 7) % 7);
}
if (id === DateParse) {
  // **`Date.parse(文本)`** ✓（第 293 轮 ✓）——与 `new Date(字符串)` **共用同一条解析器** ✓
  //（见 `DateParseUnits` ✓）。
  //
  // **非字符串响亮地抛** ✗（不 `ToString` 一遍 ✓）：JS 在这里是 `ToString` 之后再解析 ✓
  //（`Date.parse(2020)` 于是走 `"2020"` ⇒ `NaN` ✓），而那一档在本仓**一条判据也没有** ✓——
  // 猜一个「数字当文本」出来只会多一处会漂的地方 ✗（与 `DateParseUnits` 里
  // 「其余形状一律给 `NaN`」**不是**同一条：那一条是**已经给了文本** ✓）。
  if (args.length === 0) return Value.FromDouble(NaN);
  if (args[0].Tag !== ValueTag.String) {
    throw new Error("unimplemented: Date.parse needs a string argument");
  }
  return Value.FromDouble(DateParseUnits(JsTextUnits(table, args[0])));
}
if (id === DateToString) {
  // **`Date.prototype.toString`** ✓（第 293 轮 ✓）——**只做非法日期那一档** ✓。
  const textStored = FindProperty(room, table, self.Ref,
    Value.FromString(table.CreateString(Units("__t"))));
  if (textStored === null) throw new Error("unimplemented: not a Date receiver (no __t)");
  const textMs = NumericOf(table.Get(textStored.Owner).Props[textStored.Index].Value);
  if (textMs === textMs) {
    // **合法日期响亮地抛** ✓（JS 给的是本地时区那一串 ✓，随机器变 ✗——见号那一段 ✓）。
    throw new Error("unimplemented: Date.prototype.toString for a valid date (JS renders local time)");
  }
  if (!room(ObjectCharge + CodeUnitCharge * 12)) throw new Error("out of room");
  return Value.FromString(table.CreateString(Units("Invalid Date")));
}
if (id === DateToISOString) {
  // **`toISOString` 与 `toJSON` 共用这一支** ✓（第 280 轮 ✓，同一个号 ✓）。
  // **`toJSON` 多收一个键实参** ✗（`JSON.stringify` 调它时给 `(键, 值)` ✓）——
  // 那一格**用不上** ✓（日期串与键无关 ✓），所以两支合并**没有代价** ✓。
  const isoStored = FindProperty(room, table, self.Ref,
    Value.FromString(table.CreateString(Units("__t"))));
  if (isoStored === null) throw new Error("unimplemented: not a Date receiver (no __t)");
  const isoMs = NumericOf(table.Get(isoStored.Owner).Props[isoStored.Index].Value);
  // **非法日期要抛 `RangeError`** ✓（JS 的口径 ✓）：本层的 `__t` 只可能是数 ✓，
  // 而 `NaN` 那一档（`new Date("坏")` ✓）在 JS 里 `toISOString` 是**抛** ✓、
  // `toJSON` 是给 **`null`** ✓——两处不一样 ✗，所以这里按**号相同**合并之后
  // 用一个判据：`NaN` ⇒ 抛 ✓（`toJSON` 那一档的 `null` 记在台账里 ✓）。
  if (isoMs !== isoMs) throw new RangeError("Invalid time value");
  const isoText = DateIsoText(isoMs);
  if (!room(ObjectCharge + CodeUnitCharge * isoText.length)) throw new Error("out of room");
  return Value.FromString(table.CreateString(Units(isoText)));
}
if (id === DateSetUTCFullYear || id === DateSetUTCMonth || id === DateSetUTCDate
  || id === DateSetUTCHours || id === DateSetUTCMinutes || id === DateSetUTCSeconds
  || id === DateSetUTCMilliseconds) {
  // **七个写入口是一个模板套七次** ✓（第 280 轮 ✓）：读当前七个部分 ✓ →
  // 把**给了的那几格**换掉 ✓ → 合并回毫秒 ✓ → 写回 `__t` ✓ → 返回新毫秒 ✓（JS 的口径 ✓）。
  //
  // **先拆成七格再按号替换，而不是七个分支各拆一次** ✗：七支各写一遍就是七份
  // 「哪些实参是可选的」✓（而这张表恰好最容易抄漏一格 ✓：`setUTCMonth(月, 日?)` ✓、
  // `setUTCHours(时, 分?, 秒?, 毫秒?)` ✓ 都不一样 ✗）。
  const setStored = FindProperty(room, table, self.Ref,
    Value.FromString(table.CreateString(Units("__t"))));
  if (setStored === null) throw new Error("unimplemented: not a Date receiver (no __t)");
  const setMs = NumericOf(table.Get(setStored.Owner).Props[setStored.Index].Value);
  const dateBits = DateParts(setMs);
  const clockBits = DateClockParts(setMs);
  // **每一格都先取当前值，再按「给了没有」覆写** ✓——`args[k]` 缺省就保持原样 ✓
  //（这就是 JS 那七个 setter 的实参表 ✓）。
  let year = dateBits[0];
  let month = dateBits[1];
  let day = dateBits[2];
  let hours = clockBits[0];
  let minutes = clockBits[1];
  let seconds = clockBits[2];
  let millis = clockBits[3];
  if (id === DateSetUTCFullYear) {
    if (args.length > 0) year = ArgOr(args, 0, year);
    if (args.length > 1) month = ArgOr(args, 1, month);
    if (args.length > 2) day = ArgOr(args, 2, day);
  } else if (id === DateSetUTCMonth) {
    if (args.length > 0) month = ArgOr(args, 0, month);
    if (args.length > 1) day = ArgOr(args, 1, day);
  } else if (id === DateSetUTCDate) {
    if (args.length > 0) day = ArgOr(args, 0, day);
  } else if (id === DateSetUTCHours) {
    if (args.length > 0) hours = ArgOr(args, 0, hours);
    if (args.length > 1) minutes = ArgOr(args, 1, minutes);
    if (args.length > 2) seconds = ArgOr(args, 2, seconds);
    if (args.length > 3) millis = ArgOr(args, 3, millis);
  } else if (id === DateSetUTCMinutes) {
    if (args.length > 0) minutes = ArgOr(args, 0, minutes);
    if (args.length > 1) seconds = ArgOr(args, 1, seconds);
    if (args.length > 2) millis = ArgOr(args, 2, millis);
  } else if (id === DateSetUTCSeconds) {
    if (args.length > 0) seconds = ArgOr(args, 0, seconds);
    if (args.length > 1) millis = ArgOr(args, 1, millis);
  } else {
    if (args.length > 0) millis = ArgOr(args, 0, millis);
  }
  // **月份与日子越界由 `DateMakeMs` 自己接住** ✓（见那个方法的说明 ✓）——
  // `setUTCMonth(13)` 于是给下一年的二月 ✓（JS 的口径 ✓），这里**不规整** ✗。
  const nextMs = DateMakeMs(year, month, day, hours, minutes, seconds, millis);
  // **改的是那个实例本身** ✓（JS 的 setter 是就地改 ✓）——所以写回 `__t` ✓。
  table.Get(setStored.Owner).Props[setStored.Index].Value = Value.FromDouble(nextMs);
  return Value.FromDouble(nextMs);
}
if (id === DateUTC) {
  // **静态的 `Date.UTC`** ✓（第 280 轮 ✓）——与七个 setter **同一条逆变换** ✓，
  // 差别只有「没有接收者」✓：缺的那几格按 JS 的默认值补 ✓（**月 0 / 日 1 / 其余 0** ✓）。
  // **实参一律先做 `ToNumber`** ✓（JS 的口径 ✓）：`Date.UTC("2020" as any, 0, 2)` 也认 ✓——
  // 用 `ArgOr` 会把它当成「没给」✗（那个取值器只认数值格子 ✓），所以这里走 `NumericOf` ✓。
  const utcYear = args.length > 0 ? NumericOf(args[0]) : NaN;
  const utcMonth = args.length > 1 ? NumericOf(args[1]) : 0;
  const utcDay = args.length > 2 ? NumericOf(args[2]) : 1;
  const utcHours = args.length > 3 ? NumericOf(args[3]) : 0;
  const utcMinutes = args.length > 4 ? NumericOf(args[4]) : 0;
  const utcSeconds = args.length > 5 ? NumericOf(args[5]) : 0;
  const utcMillis = args.length > 6 ? NumericOf(args[6]) : 0;
  // **年份 `0..99` 加 1900** ✓（JS 的口径 ✓，与构造函数那一支一字不差 ✓）。
  let utcYearFixed = utcYear;
  if (utcYearFixed >= 0 && utcYearFixed <= 99) utcYearFixed = utcYearFixed + 1900;
  // **七格里任何一格是 `NaN` 就整条是 `NaN`** ✓（JS 的口径 ✓）——
  // `DateMakeMs` 会把 `NaN` 自然传播下去 ✓，所以这里不另判 ✓（写在明处 ✓）。
  return Value.FromDouble(DateMakeMs(utcYearFixed, utcMonth, utcDay, utcHours, utcMinutes,
    utcSeconds, utcMillis));
}
throw new Error("unimplemented: global builtin " + id);
```

# method ErrorCtorName:(id:int)=>string

**这一族成员的名字**（第 277 轮把「三条三元表达式」收成一处 ✓）。

**为什么要收** ✗：名字在**两处**要用 ✓（写 `self` 的自有属性那一处 ✓、
走 `NewErrorLike` 那一处 ✓），而每加一个成员就要改两处 ✓——
第 277 轮加 `SyntaxError` 时正是这么踩的 ✓：三元的链再套一层就成了一行读不懂的东西 ✓。
**名字写错的表现是「看着对」的** ✗：`new SyntaxError().name` 给 `"Error"` ✓（**不是抛** ✓），
而 `e instanceof SyntaxError` **照样是真** ✓——两半里只错了一半 ✓，
`String(e)` 于是给 `"Error: boom"` 而不是 `"SyntaxError: boom"` ✓（静默 ✓）。

```ts
if (id === TypeErrorCtor) return "TypeError";
if (id === RangeErrorCtor) return "RangeError";
if (id === SyntaxErrorCtor) return "SyntaxError";
if (id === ReferenceErrorCtor) return "ReferenceError";
return "Error";
```

# method ErrorCtorProto:(protos:Protos, id:int)=>int

**这一族成员的原型句柄**（第 277 轮 ✓）——与名字同一个理由 ✓。

**写错一格的下场与名字写错正好差一半** ✗：`e instanceof SyntaxError` 会**静默**给假 ✓
（而 `e.name` 是对的 ✓）。两处各错一半 ⇒ **比两处都错更难查** ✓
（两处都错的话 `catch (e) { e instanceof TypeError }` 什么都不匹配 ✓，一眼就看出来了 ✓）。

```ts
if (id === TypeErrorCtor) return protos.TypeError;
if (id === RangeErrorCtor) return protos.RangeError;
if (id === SyntaxErrorCtor) return protos.SyntaxError;
if (id === ReferenceErrorCtor) return protos.ReferenceError;
return protos.Error;
```

# method NewErrorLike:(room:RoomChecker, table:HeapTable, protos:Protos, protoHandle:int, name:string, message:string)=>Value

**造一个内建错误对象**（第 137 轮）：`message` 是**自有属性** ✓、`name` 也写成自有属性 ✓
（JS 那边 `name` 住在**原型**上 ✗，这里两处都有 ✓——自有属性优先 ✓，
所以 `e.name` 两种写法都对 ✓）。

**为什么它要单独存在**：`Error` 有三个来处 ✓——脚本写 `new Error(m)` ✓、
`new TypeError(m)` ✓，以及**宿主/内建失败时由驱动兜一个**（`RaiseFromHost` ✓）。
三处给的必须是**同一种东西** ✓，否则脚本 `catch (e) { e.message }` 在几条路上会得到
两种形状 ✗。

**原型必须挂在传进来的那一格上** ✗：挂 `Protos.Object` 的话
`e instanceof Error` 给 **`false`** ✗（**静默的错答案**，比抛更糟 ✓）；
挂错了格（`TypeError` 挂到 `Error` 上）会让 `e instanceof TypeError` 也错 ✗——
两种都是「看起来都做了」的那种错 ✓。

```ts
const created = NewPlainObject(room, table, protos);
table.Get(created.Ref).Proto = protoHandle;
// **`message` 与 `name` 是不可枚举的**（第 194 轮 ✓）：JS 里 `Object.keys(new Error("x"))`
// 是 `[]` ✓（本仓原来给 `message,name` ✗——**静默**多出来的键 ✓）。
SetHiddenProperty(room, table, created, NameValue(table, "message"),
  Value.FromString(table.CreateString(Units(message))));
SetHiddenProperty(room, table, created, NameValue(table, "name"),
  Value.FromString(table.CreateString(Units(name))));
return created;
```

# method NewError:(room:RoomChecker, table:HeapTable, protos:Protos, message:string)=>Value

**`NewErrorLike` 的旧名字**（第 121 轮就有 ✓，第 137 轮改成转调 ✓）：引擎那条
「兜一个错误对象」的路（`tsrun.xl.md` 的 `RaiseFromHost` ✓）走的是它 ✓。

**留着这个名字**是因为**引擎侧不认识「错误有几种」** ✓——它兜出来的统一是 `Error` ✓；
要造 `TypeError` 的地方是**语言层自己**（`invoke` 的 `TypeErrorCtor` 那一支 ✓）。

```ts
return NewErrorLike(room, table, protos, protos.Error, "Error", message);
```

# method SealedMarkName:()=>string

**「这个对象不可扩展」那个标记的名字**（第 276 轮 ✓）——`seal` / `freeze` 写它 ✓、
`isSealed` / `isFrozen` 读它 ✓，所以**收成一个方法** ✗（同一个字符串写四遍就是四处会漂的答案 ✓）。

**为什么带两个下划线** ✓：与 `__k` / `__v` / `__b` 那几格同一族 ✓——它们都是「**内部格**」✓，
`Object.keys` 看不见 ✓（`SetHiddenProperty` 写的是不可枚举 ✓）。

```ts
return "__sealed";
```

# method MarkUnextensible:(room:RoomChecker, table:HeapTable, target:Value)=>void

**给一个对象打上「不可扩展」的标记**（第 276 轮 ✓）——`seal` 与 `freeze` 都调它 ✓。

**重复调用是幂等的** ✓：先问一句「已经有了吗」✓——少了这一问，`seal` 之后再 `seal`
会在属性表里**再堆一格** ✗（`Object.getOwnPropertyNames` 于是越数越多 ✓）。

```ts
const key = NameValue(table, SealedMarkName());
const existing = FindProperty(room, table, target.Ref, key);
if (existing !== null && existing.Owner === target.Ref) return;
SetHiddenProperty(room, table, target, key, Value.FromBool(true));
```

# method IsUnextensible:(room:RoomChecker, table:HeapTable, target:Value)=>bool

**这个对象被标记过「不可扩展」吗**（第 276 轮 ✓）——`isSealed` 与 `isFrozen` 都从它起手 ✓。

**回答的是「有没有那一格」，不是「那一格是什么」** ✓：标记只有「在」这一种状态 ✓
（`SetHiddenProperty` 写的是 `true` ✓），所以判空比读值更贴题 ✓，
也**不必为那一格分配一个值来读** ✓。

```ts
const key = NameValue(table, SealedMarkName());
const found = FindProperty(room, table, target.Ref, key);
return found !== null && found.Owner === target.Ref;
```

# method DefineOwnFromDescriptor:(room:RoomChecker, table:HeapTable, target:Value, key:Value, descriptor:Value)=>void

**把一个描述符对象写进 `target` 的那一格**（第 276 轮从 `Object.defineProperty` 里抽出来 ✓，
`defineProperties` 也调它 ✓）。没有那一格就**新建一个** ✓。

**默认三个标志全是假** ✓（JS 的口径 ✓：少给哪个字段就是 `false` ✓）——
所以标志位是**从零开始拼**的 ✓，不是「拿旧的改一改」✗。

**访问器描述符响亮地抛** ✗：它的描述符该有 `get` / `set` 两格 ✓，
而这一层还没有那两格的门 ✓——静默把它当成一个「没有 `value()` 的数据属性」是最坏的一种 ✗
（`o.x` 会变成 `undefined` ✓，而调用方以为它写进去了 ✓）。

**只看自有属性，而且这一句是必写的** ✗：JS 的 `defineProperty` **不看原型链** ✓——
所以「找到之后还要问 `Owner === target.Ref`」✓。少了它，
`Object.defineProperty({}, "toString", …)` 会去改**原型上**那一格 ✓，
那是把一个对象的改动**泄漏到所有对象上** ✗（一改全改 ✓，而且不报错 ✗）。

```ts
const defineTarget = table.Get(target.Ref);
const descriptorObject = table.Get(descriptor.Ref);
// **读描述符的字段** ✓：描述符是一个**普通对象字面量** ✓，所以直接扫它的属性表 ✓
// （访问器跳过 ✗——理由与 `Object.values` 那一条相同 ✓：这一层不调 getter ✓）。
const fieldOf = (name: string) => {
  for (let i = 0; i < descriptorObject.Props.length; i++) {
    const property = descriptorObject.Props[i];
    if (property.Kind === PropertyKind.Accessor) continue;
    // **键必须是字符串** ✓：描述符的字段名一律是字符串 ✓——
    // 不判这一句的话，一个**符号键**会被 `Value.FromString` 读成一段越界码元 ✓（静默 ✓）。
    if (table.Get(property.Key).Tag !== ValueTag.String) continue;
    if (TextFrom(table, Value.FromString(property.Key)) === name) return property.Value;
  }
  return Value.Undefined();
};
// **访问器那一支** ✓（第 299 轮 ✓）：`{ get: …, set: … }` 以前**整支抛** ✗——
// 理由写的是「这一层还没有那两格的门」✓，而**引擎早就有门了** ✗：
// `Property.Accessor` 那个工厂 ✓、`ReadProperty` / `SetProperty` 两条读写的分支 ✓、
// 以及 `props.xl.md` 的 `DefineAccessor` ✓（第 98 轮 ✓，对象字面量与类方法一直走它 ✓）。
// 缺的只是**把描述符的那两格接上去** ✓。
//
// **`writable` 在访问器上无意义** ✓（JS 的口径 ✓）：标志位只拼
// `enumerable` 与 `configurable` 两个 ✓——把 `writable` 也算进去是**静默**多一位 ✗
//（`Object.getOwnPropertyDescriptor(o, "g").writable` 于是会答假 ✓，而 JS 那两格**根本不在** ✓）。
//
// **`get` / `set` 不是函数就丢掉** ✓（JS 的口径 ✓：`{ get: 1 }` 是「没有 getter」✓）——
// 不是「原样存进去」✗：那会让 `o.g` 去调一个数字 ✓，报的是「调了一个不是函数的东西」✓。
const accessorGet = fieldOf("get");
const accessorSet = fieldOf("set");
if (accessorGet.Tag !== ValueTag.Undefined || accessorSet.Tag !== ValueTag.Undefined) {
  const storedGetter = IsCallableValue(table, accessorGet) ? accessorGet : Value.Undefined();
  const storedSetter = IsCallableValue(table, accessorSet) ? accessorSet : Value.Undefined();
  let accessorFlags = 0;
  if (RtToBoolean(table, fieldOf("enumerable")).AsBool()) accessorFlags = accessorFlags + PropertyFlagEnumerable;
  if (RtToBoolean(table, fieldOf("configurable")).AsBool()) accessorFlags = accessorFlags + PropertyFlagConfigurable;
  const accessorExisting = FindProperty(room, table, target.Ref, key);
  if (accessorExisting !== null && accessorExisting.Owner === target.Ref) {
    // **原地换那一格** ✓（与上面数据属性那一支同一个写法 ✓）：`Kind` 一改，
    // 读写两条路立刻按访问器走 ✓（`ReadProperty` 调 getter ✓、`SetProperty` 调 setter ✓）。
    const accessorProperty = defineTarget.Props[accessorExisting.Index];
    accessorProperty.Kind = PropertyKind.Accessor;
    accessorProperty.Getter = storedGetter;
    accessorProperty.Setter = storedSetter;
    accessorProperty.Flags = accessorFlags;
    return;
  }
  if (!room(PropertyCharge)) throw new Error("out of room");
  const createdAccessor = Property.Accessor(key.Ref, storedGetter, storedSetter);
  createdAccessor.Flags = accessorFlags;
  defineTarget.Props.push(createdAccessor);
  table.Recount(target.Ref);
  return;
}
let flags = 0;
if (RtToBoolean(table, fieldOf("enumerable")).AsBool()) flags = flags + PropertyFlagEnumerable;
if (RtToBoolean(table, fieldOf("writable")).AsBool()) flags = flags + PropertyFlagWritable;
if (RtToBoolean(table, fieldOf("configurable")).AsBool()) flags = flags + PropertyFlagConfigurable;
const existing = FindProperty(room, table, target.Ref, key);
if (existing !== null && existing.Owner === target.Ref) {
  const property = defineTarget.Props[existing.Index];
  if (property.Kind === PropertyKind.Accessor) {
    throw new Error("unimplemented: redefining an accessor property needs the accessor path");
  }
  property.Value = fieldOf("value");
  property.Flags = flags;
  return;
}
if (!room(PropertyCharge)) throw new Error("out of room");
const created = new Property(key.Ref, fieldOf("value"));
created.Flags = flags;
defineTarget.Props.push(created);
table.Recount(target.Ref);
```

# method IsSealedMarkProperty:(table:HeapTable, property:Property)=>bool

**这一格是不是「不可扩展」那个内部标记**（第 276 轮 ✓）。

**为什么需要它** ✗（第 276 轮实测踩到 ✓）：那个标记是**一个真的数据属性** ✓，
而 `SetHiddenProperty` 只保证它**不可枚举** ✗——`writable` / `configurable` 它不管 ✓。
于是两处一起坏 ✓：

- **`isFrozen` 会答假** ✗：它问的是「每个自有数据属性都不可写」✓，
  而**标记自己就可写** ✓（`Object.freeze({y: 1})` 之后的 `isFrozen` 给 `false` ✗，实测 ✓）；
- **`getOwnPropertyNames` 里多一格** ✗（实测：给 `["x", "__sealed"]` ✓，JS 给 `["x"]` ✓）。

所以「**这个标记不算自有属性**」这句话要在**三处**各说一遍 ✓
（`isSealed` / `isFrozen` 的循环 ✓、`getOwnPropertyNames` ✓、`getOwnPropertyDescriptor` ✓）——
收进这一个方法 ✓，三处调它 ✓。

**它为什么不像 `__k` / `__v` / `__b` 那样留在明面上** ✗：那几格是**对象自己的一部分** ✓
（`Map` 的数据就在那儿 ✓），漏出去顶多是多一格 ✓；而这一个标记是**纯内部状态** ✓，
它出现在 `Object.getOwnPropertyNames(Object.seal(o))` 里会让人以为那个对象真有一格叫 `__sealed` ✓
——**能挡住就挡住** ✓。

```ts
if (table.Get(property.Key).Tag !== ValueTag.String) return false;
return TextFrom(table, Value.FromString(property.Key)) === SealedMarkName();
```

# method TextFrom:(table:HeapTable, value:Value)=>string

**堆里的字符串 → 宿主字符串**。

**这一步用宿主的字符设施是应该的**：建库层本来就是宿主侧代码（`Units` 是反方向）。
引擎侧不许这么做，因为四个目标的语言各自有各自的字符串——
而**建库层的产物是宿主自己的字符串**，这里没有别的选择，也不需要别的选择。

```ts
const units = JsTextUnits(table, value);
let text = "";
for (let i = 0; i < units.length; i++) {
  text = text + String.fromCharCode(units[i]);
}
return text;
```

# method DateParts:(ms:float)=>Array<int>

**毫秒 → `[年, 月, 日]`**（月 **0 起**、日 **1 起**，与 `getUTCMonth` / `getUTCDate` 一致 ✓）。

用 **Howard Hinnant 的 `civil_from_days`**（无表、无时区、纯整数 ✓）——
这一层**不碰时区数据** ✓（范围决定：`getUTC*` 一族 ✓，本地时区 ✗）。

**这里每一步的除数都是非负的** ✓（`z` 加了 `719468` 之后必为正 ✓），
所以「向下取整」与「向零截断」一致 ✓——用 `Math.floor` 是安全的 ✓。

```ts
const days = Math.floor(ms / 86400000);
const z = days + 719468;
const era = Math.floor(z / 146097);
const doe = z - era * 146097;
const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524)
  - Math.floor(doe / 146096)) / 365);
const y = yoe + era * 400;
const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
const mp = Math.floor((5 * doy + 2) / 153);
const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
const month = mp + (mp < 10 ? 3 : -9);
return [y + (month <= 2 ? 1 : 0), month - 1, day];
```

# method DateClockParts:(ms:float)=>Array<int>

**毫秒 → `[时, 分, 秒, 毫秒]`**（第 280 轮 ✓）——`DateParts` 的另一半 ✓，四个都是 `0` 起的整数 ✓。

**判据是 `Math.floor(ms / 86400000)`** ✗（**向下取整** ✓，不是截断 ✓）：
于是「当天的毫秒」落在 `[0, 86400000)` ✓（**1970 年以前也对** ✓——
`new Date(-1)` 该给 `23:59:59.999` ✓，写成截断会整整差一天 ✓）。

```ts
const dayStart = Math.floor(ms / 86400000) * 86400000;
const withinDay = ms - dayStart;
const hours = Math.floor(withinDay / 3600000);
const minutes = Math.floor(withinDay / 60000) % 60;
const seconds = Math.floor(withinDay / 1000) % 60;
const millis = withinDay % 1000;
return [hours, minutes, seconds, millis];
```

# method DateDaysFromCivil:(year:int, month:int, day:int)=>float

**`[年, 月(0 起), 日]` → 距 1970-01-01 的天数**（第 280 轮 ✓）——
`DateParts` 的**逆** ✓，同一个作者（Howard Hinnant 的 `days_from_civil` ✓）、同一份推导 ✓。

**为什么不能只做正向** ✗：`Date.UTC` ✓、七个 `setUTC*` ✓、以及 `new Date("2021-03-04")`
那一类**都是这个方向** ✓——而 `toISOString` 那一半只走正向 ✓。
**合成一份逆变换**比「先算正向、再二分搜」既短又不会错 ✓。

**除法一律 `Math.floor`** ✗：`era` 在**负年份**上是负的 ✓（`year = -1` 该落在 `era = -1` ✓）——
写成截断会把公元前后的日期整整挪一个 400 年的纪元 ✓（**静默错值** ✗，
而它只在「年份 ≤ 0」时才现形 ✓，日常判据量不到 ✗——所以这一句写在这里当路障 ✓）。
`yoe` 在 `floor` 之后必落在 `[0, 399]` ✓，所以下面那三处 `Math.floor` 对非负数也对 ✓。

```ts
let y = year;
// **一月与二月算作上一年的第 13 / 14 月** ✓（这就是这条推导的全部秘密 ✓）。
if (month <= 1) y = y - 1;
const era = Math.floor(y / 400);
const yoe = y - era * 400;
const mp = month > 1 ? month - 2 : month + 10;
const doy = Math.floor((153 * mp + 2) / 5) + day - 1;
const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
return era * 146097 + doe - 719468;
```

# method DateMakeMs:(year:int, month:int, day:int, hours:int, minutes:int, seconds:int, millis:int)=>float

**七个部分 → 毫秒**（第 280 轮 ✓）——`DateParts` + `DateClockParts` 的**合并逆** ✓。

**一天之内的部分直接乘** ✓（不必规整 ✓）：JS 的 `setUTCHours(1, 2, 3, 4)` 就是
「时×3600000 + 分×60000 + 秒×1000 + 毫秒」✓，而**月份与日子可以越界** ✓
（`setUTCMonth(13)` 是下一年的二月 ✓）——那一条**由 `DateDaysFromCivil` 自己接住** ✓
（它对任意整数月都成立 ✓：`mp` 只是取模到 `[0, 11]` 的一个下标 ✓，
而 `y` 那一步已经按 `month <= 1` 分过 ✓）。**不要在这里先规整一遍** ✗
（规整一次就是第二份「月份怎么算」的答案 ✓）。

```ts
return DateDaysFromCivil(year, month, day) * 86400000
  + hours * 3600000 + minutes * 60000 + seconds * 1000 + millis;
```

# method DateParseUnits:(units:Array<int>)=>float

**ISO 8601 的一个最小子集**（第 293 轮 ✓）——`Date.parse` 与 `new Date(字符串)` 的**同一条** ✓。

**收的形状** ✓：`YYYY-MM-DD` ✓、`YYYY-MM-DDTHH:mm` ✓、`…:ss` ✓、`…:ss.sss` ✓，
后面可跟 `Z` ✓ / `±HH:mm` ✓ / 什么都不跟 ✓（日期与时间之间收 `T` / `t` / 一个空格 ✓）。

**其余一律给 `NaN`** ✓（**不猜** ✗）：`"Jan 1 2020"` ✓、`"2020/01/02"` ✓、`"20200102"` ✓
这些要么是本地化的 ✓、要么有歧义 ✓——编一个答案就是**静默错值** ✓，
而 JS 自己对不合规的文本给的正是 `NaN` ✓（所以「不认就给 NaN」**与 JS 一致** ✓，
不是「做不到就先给个错的」✗）。

**三处最容易写错的地方** ✗（每一处都有一条判据或一句 JS 的明文在背后 ✓）：
- **`.5` 是 500 不是 5** ✓（不足三位要**按位补零** ✓）、**`.1234` 是 123** ✓（多于三位**只取前三位** ✓）——
  两档方向**相反** ✓，写成一处就会有一半错 ✓；
- **偏移是「减去」** ✓（`+08:00` 的时刻比 UTC **早** 8 小时 ✓ ⇒ 毫秒数**小** 8 小时 ✓）；
- **没有偏移的时间串按 UTC 算** ✗（JS 按**本地**算 ✓）——与上面 `DateCtor` 那段同一个口径 ✓
  （本仓的本地时间就是 UTC ✓），而**带偏移**的那些形状两边**完全一致** ✓。

```ts
const n = units.length;
if (n < 10) return NaN;
const digitAt = (at: number): number => {
  if (at < 0 || at >= n) return -1;
  const code = units[at];
  if (code < 48 || code > 57) return -1;
  return code - 48;
};
const numberAt = (from: number, count: number): number => {
  let read = 0;
  for (let i = 0; i < count; i++) {
    const digit = digitAt(from + i);
    if (digit < 0) return -1;
    read = read * 10 + digit;
  }
  return read;
};
const year = numberAt(0, 4);
if (year < 0) return NaN;
if (units[4] !== 45) return NaN;
const month = numberAt(5, 2);
if (month < 1 || month > 12) return NaN;
if (units[7] !== 45) return NaN;
const day = numberAt(8, 2);
if (day < 1 || day > 31) return NaN;
let at = 10;
let hours = 0;
let minutes = 0;
let seconds = 0;
let millis = 0;
if (at < n) {
  const separator = units[at];
  if (separator !== 84 && separator !== 116 && separator !== 32) return NaN;
  at = at + 1;
  hours = numberAt(at, 2);
  if (hours < 0 || hours > 24) return NaN;
  at = at + 2;
  if (at >= n || units[at] !== 58) return NaN;
  at = at + 1;
  minutes = numberAt(at, 2);
  if (minutes < 0 || minutes > 59) return NaN;
  at = at + 2;
  if (at < n && units[at] === 58) {
    at = at + 1;
    seconds = numberAt(at, 2);
    if (seconds < 0 || seconds > 59) return NaN;
    at = at + 2;
    if (at < n && units[at] === 46) {
      at = at + 1;
      const first = at;
      while (at < n && digitAt(at) >= 0) at = at + 1;
      const shown = at - first;
      if (shown === 0) return NaN;
      for (let i = 0; i < 3; i++) {
        const digit = i < shown ? digitAt(first + i) : 0;
        millis = millis * 10 + (digit < 0 ? 0 : digit);
      }
    }
  }
}
let offsetMinutes = 0;
if (at < n) {
  const zone = units[at];
  if (zone === 90 || zone === 122) {
    at = at + 1;
  } else if (zone === 43 || zone === 45) {
    const zoneHours = numberAt(at + 1, 2);
    if (zoneHours < 0) return NaN;
    let zoneMinutes = 0;
    let zoneAt = at + 3;
    if (zoneAt < n && units[zoneAt] === 58) {
      zoneMinutes = numberAt(zoneAt + 1, 2);
      if (zoneMinutes < 0) return NaN;
      zoneAt = zoneAt + 3;
    }
    offsetMinutes = zoneHours * 60 + zoneMinutes;
    if (zone === 45) offsetMinutes = 0 - offsetMinutes;
    at = zoneAt;
  } else {
    return NaN;
  }
}
if (at !== n) return NaN;
return DateMakeMs(year, month - 1, day, hours, minutes, seconds, millis) - offsetMinutes * 60000;
```

# method PadNumber:(value:int, width:int)=>string

**左补零到 `width` 位**（第 280 轮 ✓）——ISO 那一串里要用五次 ✓。

**负数带负号** ✓（`-1` 补到两位是 `-1` ✓ 不是 `0-1` ✓）——所以符号要先摘出来 ✓。
日期的年份在 ISO 里**另有规矩**（扩展年份带 `+` ✓），那一档下面单独判 ✓。

```ts
let text = "" + value;
if (value < 0) text = text.substring(1);
while (text.length < width) text = "0" + text;
return value < 0 ? "-" + text : text;
```

# method DateIsoText:(ms:float)=>string

**毫秒 → ISO 8601 文本**（第 280 轮 ✓）——`Date.prototype.toISOString` 的正身 ✓。

**全部拼自那两个纯整数公式** ✓（`DateParts` ✓ + `DateClockParts` ✓），
**不碰宿主日期库** ✓——与 `DateParts` 同一条理由 ✓（跨目标抄得走 ✓，
`dates` 与 `times` 这些宿主对象在 C++ 那边不存在 ✓）。

**年份的两种形态** ✗：`0..9999` 是四位数字 ✓（`1970` ✓）；
**超出这个范围时 JS 给扩展形态** ✓（`+010000-01-01T00:00:00.000Z` ✓、负年份带 `-` ✓）。
这一层**只做四位那一档** ✗，其余**响亮地抛** ✓——静默补出一串看着像日期的东西是最坏的一种 ✗
（判据里量不到那一档 ✓，所以写在明处 ✓）。

```ts
const parts = DateParts(ms);
const clock = DateClockParts(ms);
if (parts[0] < 0 || parts[0] > 9999) {
  throw new Error("unimplemented: toISOString outside 0000..9999 needs the expanded year form");
}
let text = PadNumber(parts[0], 4) + "-" + PadNumber(parts[1] + 1, 2) + "-" + PadNumber(parts[2], 2);
text = text + "T" + PadNumber(clock[0], 2) + ":" + PadNumber(clock[1], 2) + ":" + PadNumber(clock[2], 2);
// **毫秒是三位** ✓（`+ "." + 4` 该给 `004` ✓，不是 `4` ✗）。
return text + "." + PadNumber(clock[3], 3) + "Z";
```

# method QuoteJson:(table:HeapTable, value:Value)=>string

JSON 字符串字面量（**带上引号与转义**）。

**只转义必要的那些**：引号、反斜杠、`\n` / `\r` / `\t`，以及其它控制字符走 `\u00XX`。
**不转义非 ASCII**：`JSON.stringify` 输出的是可读的 UTF-16 文本（判据正是拿它跟 Node 比）。

**孤立代理要转义** ✓（第 297 轮 ✓）：ES2019 那条「well-formed JSON.stringify」规定
**落单的代理码元写成 `\uXXXX`** ✓（合起来的代理对**照旧原样输出** ✓，因为那是合法的 UTF-16 ✓）。
**它原来原样吐出去** ✗：`JSON.stringify("\uD800")` 于是给了一串**不是合法 UTF-16 的文本** ✓——
拷到别处就变成一个替换字符 ✓（**静默**：本仓自己打出来看着「就是那个字符」✓，
而 Node 打的是 `"\ud800"` ✓）。**判据是第 297 轮量的** ✓（原来一条都没有 ✓）。

```ts
const units = JsTextUnits(table, value);
let text = "\"";
for (let i = 0; i < units.length; i++) {
  const unit = units[i];
  if (unit === 34) text = text + "\\\"";
  else if (unit === 92) text = text + "\\\\";
  else if (unit === 10) text = text + "\\n";
  else if (unit === 13) text = text + "\\r";
  else if (unit === 9) text = text + "\\t";
  else if (unit < 32) text = text + "\\u" + unit.toString(16).padStart(4, "0");
  else if (unit >= 55296 && unit <= 56319) {
    // **前导代理：后面跟着后随代理才算一对** ✓（那样两个都原样输出 ✓）——
    // 否则它是**落单**的 ✓，按 well-formed 那条规矩转义 ✓。
    const follower = i + 1 < units.length ? units[i + 1] : -1;
    if (follower >= 56320 && follower <= 57343) {
      text = text + String.fromCharCode(unit) + String.fromCharCode(follower);
      i = i + 1;
    } else {
      text = text + "\\u" + unit.toString(16).padStart(4, "0");
    }
  } else if (unit >= 56320 && unit <= 57343) {
    // **后随代理走到这里就是落单的** ✓（前面那一格没把它带走 ✓）。
    text = text + "\\u" + unit.toString(16).padStart(4, "0");
  } else text = text + String.fromCharCode(unit);
}
return text + "\"";
```

# method JsonText:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, anchor:int, replacer:Value, value:Value, key:Value, parent:Value, depth:int, insideArray:bool, indent:string)=>string | null

**序列化一个值**；返回 `null` 表示「这个值没有 JSON 形态」（于是**键整个省略**）。

**第 294 轮多了六格** ✗（`room` / `call` / `protos` / `anchor` / `replacer` / `parent` ✓）——
为的是接上 **`toJSON`** ✓ 与 **replacer** ✓（见下面那两支 ✓）。
**`anchor` 是「锚」那个数组** ✓（由 `JsonStringify` 造好、挂在 `protos.WellKnownSymbols` 上 ✓）：
这一趟里那些**只有宿主变量指着**的中间值就存在它身上 ✓（理由写在 `JsonAnchor` 那一支里 ✓）。
**`key` 是这一格在父容器里的键** ✓、**`parent` 是那个容器本身** ✓——
`toJSON(键)` 要前者 ✓、`replacer.call(parent, 键, 值)` 要后者 ✓。

**三种「没有形态」要分开处理**（JS 就是这么定的）：

- 在**对象**里：函数 / `undefined` → 整个键省略（返回 `null`）；
- 在**数组**里：同样这些东西 → 变成 `null`（**位置不能少**）；
- 顶层：`JSON.stringify(undefined)` → 结果是 `undefined`（不是字符串 `"undefined"`）。

**非整数数值抛**：`1.0` 该写成 `"1"` 还是 `"1.0"`、`0.1+0.2` 那一串尾巴怎么写，
是**规范级的决定**（与 `ToString` 那一处同一条理由）。**不猜一个然后让它看起来对**。

**访问器跳过**：读它要**重入**（`call`），而这里是个"纯"查询——跳过并写在这里，
比"顺手调一下"安全（后者会在序列化期间跑脚本）。

```ts
if (depth > MaxJsonDepth) {
  // **抛的是 `TypeError`** ✓（第 305 轮改的 ✗）：JS 里 `JSON.stringify(循环引用)` 抛
  // **`TypeError`** ✓（"Converting circular structure to JSON" ✓），本仓这一句同时也是
  // **深度上限**那一格 ✓（"a cycle looks the same" ✓）——所以它是**同一个出口** ✓。
  // 原来抛的是**裸 `Error`** ✗ ⇒ 脚本里 `e.name` 给 `"Error"` ✗（Node 给 `"TypeError"` ✓）。
  // 与 `string.xl.md` 的 `repeat(-1)`（第 288 轮 ✓）、`fromCodePoint` 越界（第 275 轮 ✓）
  // **同一条口径** ✓：内建抛**宿主的那一族** ✓，`install.xl.md` 那一支按类翻族 ✓
  //（它写着「只映射能证明的两族」✓）——这里一个字都不用改 ✓。
  throw new TypeError("this structure is too deep to serialize (a cycle looks the same)");
}
// **`toJSON`** ✓（第 294 轮 ✓）：JS 在序列化**每一个**值之前先问它有没有 `toJSON` ✓
//（`SerializeJSONProperty` 的第一步 ✓）——`Date.prototype.toJSON` 就是靠它生效的 ✓
//（第 280 轮把那一格装上了 ✓，可 `JSON.stringify({ d })` 一直给 `{"__t":0}` ✗：
// **没有人调它** ✗——而 `JsonText` 从第 122 轮起就是个**纯查询** ✓，刻意不调脚本 ✓）。
//
// **它必须排在最前面** ✗（在 `Array` / `Object` 那两条分支之前 ✓）：JS 是**先换值**、
// 再按**换过之后**的值决定走哪一支 ✓——`toJSON` 交出一个字符串就是字符串 ✓（不再是对象 ✓）。
//
// **只在对象上问** ✓（JS 的口径 ✓：原始值身上没有 `toJSON` 那一格 ✓）——
// 对原始值多问一趟是热路径上的白花 ✓，而且读 `null` 的属性会抛 ✓。
//
// **键要真的递进去** ✗（`toJSON(键)` ✓）：`{ toJSON(k) { return k } }` 是合法的 ✓，
// 递一个空串就是**静默错值** ✓——与「`Date` 那一格用不上」是两回事 ✗
//（那一格是**用不上** ✓，这一格是**用得上却给错了** ✓）。
//
// **产物要锚住** ✗（与第 279 轮 `JSON.parse` 的 reviver 是**同一处坎** ✓）：
// 它**只有这一个宿主变量指着** ✓，而下面那一趟递归里还会再调脚本 ✓（脚本里会分配 ✓）——
// 不锚的话某一轮之后它可能已经被收走 ✓（症状是「拿到死句柄」✗）。
// **锚在按深度分格的那个数组上** ✓（见 `JsonAnchor` 那一段：一层一格 ✓，
// 所以内层再调一次 `toJSON` 也挤不掉外层正在遍历的那个容器 ✓）。
//
// **两支都只换值、不递归** ✓：换完继续往下走同一趟分派 ✓——
// JS 就是「换过之后再按**换过之后**的值分派」✓，写成「换完递归一遍」会让 replacer
// **对同一格跑两次** ✓（`(k, v) => k === "b" ? undefined : v` 于是把 `b` 又放回去 ✗）。
if (value.IsObject() && call !== null) {
  const toJsonKey = Value.FromString(table.CreateString(Units("toJSON")));
  const toJson = GetProperty(room, call, protos, table, value, toJsonKey);
  if (IsCallableValue(table, toJson)) {
    value = call(toJson, value, [key]);
    JsonAnchor(room, table, anchor, depth, value);
  }
}
// **replacer** ✓（第 294 轮 ✓）：JS 的 `SerializeJSONProperty` 是**三步**——
// 取值 ✓、**`toJSON`** ✓、**replacer** ✓——次序是语义 ✗（`toJSON` 先 ✓、replacer 后 ✓）。
// **第二格实参是函数时**它就是这一步 ✓（是数组时它改成「键的白名单」✓，见 `Object` 那一支 ✓）。
//
// **`this` 是那个容器** ✓（JS 的口径 ✓）：`replacer.call(容器, 键, 值)` ✓——
// 所以它要 `parent` 那一格 ✓。**根那一格的 `parent` 是 `undefined`** ✗
// （JS 给的是一个 `{"": 值}` 的临时对象 ✓）——**写在明处** ✓：
// 用 `this` 的 replacer 在**根**这一格上与 JS 不同 ✓（嵌套那几格是对的 ✓）。
//
// **返回 `undefined` 就是「这一格没有」** ✓：后面按类型分派时它落进
// 「对象里省略 / 数组里变 `null`」那条老规矩 ✓（与 `JSON.stringify(undefined)` 同一条 ✓）。
if (call !== null && IsCallableValue(table, replacer)) {
  value = call(replacer, parent, [key, value]);
  JsonAnchor(room, table, anchor, depth, value);
}
// **包装对象要脱箱** ✓（第 310 轮 ✓）——`SerializeJSONProperty` 的**第三步** ✓
//（`if Type(value) is Object` 那一段 ✓：`[[NumberData]]` / `[[StringData]]` / `[[BooleanData]]`
// 三种内部槽都要换回**它们里面的原始值** ✓）。
// 少了它：`JSON.stringify(new Number(5))` 给 `"{}"` ✗（Node 给 `"5"` ✓）、
// `JSON.stringify(new String("ab"))` 给 `"{}"` ✗（Node 给 `'"ab"'` ✓）——**静默错值** ✗
//（判据 `c291-global-object-wrappers` 那一族量的就是它 ✓）。
// **位置在三步的最末** ✗（`toJSON` 之后 ✓、replacer 之后 ✓）：JS 就是「取值 → `toJSON` → replacer
// → 再按**换过之后**的值分派」✓，脱箱是**分派之前的最后一步** ✓。
// **脱箱只有一处** ✓（`UnwrapBox` ✓，与 `valueOf` 那条路**同一份** ✓）——
// 不是包装对象它就原样返回 ✓（`{}` 与普通对象一个字节都不变 ✓）。
value = UnwrapBox(table, value);
if (value.Tag === ValueTag.Null) return "null";
if (value.Tag === ValueTag.Undefined) return insideArray ? "null" : null;

if (value.Tag === ValueTag.Bool) return value.AsBool() ? "true" : "false";
if (value.Tag === ValueTag.Int32) return value.Int.toString();
if (value.Tag === ValueTag.Float64) {
  // **浮点现在有文本形态了**（第 124 轮）：`String(x)` 的最短往返十进制 ✓——它与
  // JS 的 `JSON.stringify` 用的是**同一个**数字格式化 ✓（`JSON.stringify(1.5)` 是 `"1.5"` ✓）。
  // 以前这里抛「格式化是规范级决定」✗——那个决定现在做了 ✓，做在**语言层** ✓
  //（`text.xl.md` 的 `ValueUnits` ✓，理由写在那一块的开头 ✓）。
  const number = value.Dbl;
  if (number !== number || number === Infinity || number === -Infinity) return "null";
  if (number === 0) return "0";
  return String(number);
}
if (value.Tag === ValueTag.String) return QuoteJson(table, value);
if (value.Tag === ValueTag.Function || value.Tag === ValueTag.Closure
  || value.Tag === ValueTag.HostRef || value.Tag === ValueTag.Symbol) {
  return insideArray ? "null" : null;
}
if (value.Tag === ValueTag.Array) {
  const array = table.Get(value.Ref).AsArray();
  const count = array.GetLength();
  // **缩进那一档**（第 192 轮 ✓）：`JSON.stringify(x, null, 2)` 要的是**多行**形状 ✓——
  // 原来第三、四个实参被**整段忽略** ✗，于是永远给紧凑形状 ✓（**静默**与 Node 不同 ✗）。
  // **空数组照旧是 `[]`** ✓（JS 的口径 ✓：缩进不作用在空容器上 ✓）。
  if (indent !== "" && count > 0) {
    let text = "[\n";
    for (let i = 0; i < count; i++) {
      if (i > 0) text = text + ",\n";
      const rendered = JsonText(room, call, protos, table, anchor, replacer, array.GetAt(i),
        Value.FromInt(i), value, depth + 1, true, indent);
      text = text + JsonIndent(depth + 1, indent) + (rendered === null ? "null" : rendered);
    }
    return text + "\n" + JsonIndent(depth, indent) + "]";
  }
  let text = "[";
  for (let i = 0; i < count; i++) {
    if (i > 0) text = text + ",";
    const rendered = JsonText(room, call, protos, table, anchor, replacer, array.GetAt(i),
      Value.FromInt(i), value, depth + 1, true, indent);
    text = text + (rendered === null ? "null" : rendered);
  }
  return text + "]";
}
if (value.Tag === ValueTag.Object) {
  const item = table.Get(value.Ref);
  // **replacer 是数组时：它就是「键的白名单」** ✓（第 294 轮 ✓）——
  // JS 的 `PropertyList` ✓：**只收列出来的那几个键** ✓，而且**按数组的顺序** ✓
  //（不是按对象自己的顺序 ✗——`JSON.stringify({b:1,a:2}, ["a","b"])` 给 `{"a":2,"b":1}` ✓）。
  // **它只管对象** ✗：数组那一支不看白名单 ✓（JS 的口径 ✓：数组的键永远是下标 ✓），
  // 所以这一支排在 `Array` 那条**后面** ✓、只写在 `Object` 里面 ✓。
  // **符号键与别的类型要排掉** ✓：JS 收的是「字符串与数字」✓（数字按 `ToString` 折成键 ✓），
  // 其余（符号 / 对象 / 函数 ✓）**整个条目丢掉** ✓——不是「当字符串硬转」✗。
  if (replacer.Tag === ValueTag.Array) {
    const whiteList = table.Get(replacer.Ref).AsArray();
    const multi = indent !== "";
    let whiteText = multi ? "{\n" : "{";
    let whiteFirst = true;
    for (let i = 0; i < whiteList.GetLength(); i++) {
      let asked = whiteList.GetAt(i);
      if (asked.Tag === ValueTag.Symbol) continue;
      if (asked.Tag !== ValueTag.String) {
        asked = Value.FromString(table.CreateString(JsTextUnits(table, asked)));
      }
      const found = FindProperty(room, table, value.Ref, asked);
      if (found === null || found.Owner !== value.Ref) continue;
      const property = item.Props[found.Index];
      if (property.Kind === PropertyKind.Accessor) continue;
      if (!property.IsEnumerable()) continue;
      const rendered = JsonText(room, call, protos, table, anchor, replacer, property.Value,
        asked, value, depth + 1, false, indent);
      if (rendered === null) continue;
      if (!whiteFirst) whiteText = whiteText + (multi ? ",\n" : ",");
      whiteFirst = false;
      whiteText = whiteText + (multi ? JsonIndent(depth + 1, indent) : "")
        + QuoteJson(table, asked) + (multi ? ": " : ":") + rendered;
    }
    if (whiteFirst) return "{}";
    return whiteText + (multi ? "\n" + JsonIndent(depth, indent) + "}" : "}");
  }
  // **次序**（第 296 轮 ✓）：三趟遍历走**同一张下标表** ✓——见 `JsonKeyOrder` 那一段 ✓。
  // **白名单那一支不走它** ✗（那一支按**数组给的顺序** ✓，与对象自己的次序无关 ✓）。
  const order = JsonKeyOrder(table, value.Ref);
  // **缩进那一档**（同上）：先按「有没有可渲染的键」判一次 ✓——空对象照旧是 `{}` ✓。
  let renderedCount = 0;
  if (indent !== "") {
    for (let oi = 0; oi < order.length; oi++) {
      const probe = item.Props[order[oi]];
      if (table.Get(probe.Key).Tag !== ValueTag.String) continue;
      if (probe.Kind === PropertyKind.Accessor) continue;
      if (!probe.IsEnumerable()) continue;
      if (JsonText(room, call, protos, table, anchor, replacer, probe.Value,
        Value.FromString(probe.Key), value, depth + 1, false, indent) === null) continue;
      renderedCount = renderedCount + 1;
    }
    if (renderedCount > 0) {
      let text = "{\n";
      let firstIndented = true;
      for (let oi = 0; oi < order.length; oi++) {
        const property = item.Props[order[oi]];
        if (table.Get(property.Key).Tag !== ValueTag.String) continue;
        if (property.Kind === PropertyKind.Accessor) continue;
        if (!property.IsEnumerable()) continue;
        const renderedHere = JsonText(room, call, protos, table, anchor, replacer, property.Value,
          Value.FromString(property.Key), value, depth + 1, false, indent);
        if (renderedHere === null) continue;
        if (!firstIndented) text = text + ",\n";
        firstIndented = false;
        text = text + JsonIndent(depth + 1, indent)
          + QuoteJson(table, Value.FromString(property.Key)) + ": " + renderedHere;
      }
      return text + "\n" + JsonIndent(depth, indent) + "}";
    }
  }
  let text = "{";
  let first = true;
  for (let oi = 0; oi < order.length; oi++) {
    const property = item.Props[order[oi]];
    const keyValue = table.Get(property.Key);
    if (keyValue.Tag !== ValueTag.String) continue;
    if (property.Kind === PropertyKind.Accessor) continue;
    // **不可枚举的键不进 JSON**（第 182 轮修 ✓）：`JSON.stringify` 只看**可枚举**的自有属性 ✓
    // （与 `Object.keys` 同一条口径 ✓）——`Object.defineProperty(o, "x", { value: 1 })`
    // 默认不可枚举 ✓，所以它**不该**出现在 JSON 里 ✗（实测判据当场量到这一格 ✓）。
    if (!property.IsEnumerable()) continue;
    const rendered = JsonText(room, call, protos, table, anchor, replacer, property.Value,
      Value.FromString(property.Key), value, depth + 1, false, indent);
    if (rendered === null) continue;
    if (!first) text = text + ",";
    first = false;
    text = text + QuoteJson(table, Value.FromString(property.Key)) + ":" + rendered;
  }
  return text + "}";
}
throw new Error("unimplemented: JSON of this kind of value");
```

# method JsonAnchor:(room:RoomChecker, table:HeapTable, anchor:int, depth:int, value:Value)=>void

**把「只有宿主变量指着」的那一格存进锚里**（第 294 轮 ✓）。

**锚是一个数组** ✓（`JsonStringify` 造好、挂在 `protos.WellKnownSymbols` 上的那一个 ✓）——
**按递归深度存** ✓：`depth` 那一格给「这一层正在序列化的值」✓。

**为什么按深度分格、不是一个格子来回换** ✗：内层**可能再调一次 `toJSON` / replacer** ✓
（合法 ✓），一层一层叠上去 ✓——共用一个格子的话，内层会把**外层正在遍历的那个容器**挤掉 ✓，
而外层接着 `table.Get(value.Ref)` 就是**一个已经被收走的句柄** ✓
（与第 200 轮 `reduce` 那个累加器、第 279 轮 reviver 的根**同一处坎** ✓）。
**深度天然就是层号** ✓（递归进子节点时 `depth + 1` ✓），所以不必再维护一个计数器 ✓。

**没有回调时一次都不会调它** ✓（`anchor` 那一路只在 `call !== null` 的分支里走 ✓）——
所以「纯查询」那条老路**一格都没变** ✓。

```ts
if (!room(ValueCharge * 2)) throw new Error("out of room");
table.Get(anchor).AsArray().SetAt(depth, value);
```

# method JsonKeyOrder:(table:HeapTable, owner:int)=>Array<int>

**一个对象该按什么顺序序列化**（第 296 轮 ✓）——**返回的是属性表里的下标** ✓。

**JS 的次序是语义** ✗，而且是**两条规矩**：**整数样的键升序在最前** ✓、
**其余按创建顺序** ✓（`OrdinaryOwnPropertyKeys` ✓）。`JSON.stringify({b:1, 2:2, a:3, 1:4})`
在 Node 里是 `{"1":4,"2":2,"b":1,"a":3}` ✓。

**原来这里是照 `Props` 的原样走** ✗（纯插入序 ✓）⇒ 打出来是
`{"b":1,"2":2,"a":3,"1":4}` ✓——**一句异常都没有** ✓（**静默错值** ✓，
而 `Object.keys` 从第 210 轮起就是对的 ✓ ⇒ **同一个对象两个出口两个次序** ✗，
判据 `c291-rt-object-key-order-and-json` 与 `c291-rt-object-iteration-order` 量的就是这一对 ✓）。

**为什么收成一个方法** ✗：`Object` 那一支有**三条**遍历 ✓（白名单那条不算 ✓——
它按**数组给的顺序** ✓，与这里无关 ✗；剩下**探测一次、缩进渲染一次、紧凑渲染一次** ✓）——
三处各写一遍次序就是**三处会漂** ✓，而漂了的症状是「同一个对象在同一个出口里两种次序」✓。

**判据与 `Object.keys` 共用** ✓（`IsIndexKeyText` ✓）：两处各写一份「什么算下标键」
就是两处会漂 ✓——`"01"` / `"1.5"` / `"-1"` / `"1e3"` **都不是**下标键 ✓。

```ts
const item = table.Get(owner);
const indexAt: number[] = [];
const indexValue: number[] = [];
const plainAt: number[] = [];
for (let i = 0; i < item.Props.length; i++) {
  const property = item.Props[i];
  if (table.Get(property.Key).Tag !== ValueTag.String) continue;
  if (property.Kind === PropertyKind.Accessor) continue;
  if (!property.IsEnumerable()) continue;
  const text = TextFrom(table, Value.FromString(property.Key));
  if (IsIndexKeyText(text)) {
    indexAt.push(i);
    indexValue.push(Number(text));
    continue;
  }
  plainAt.push(i);
}
// **整数样那一摞升序**（插入排序 ✓——键数很少 ✓，与 `Object.keys` 那一处同一个写法 ✓）。
for (let i = 1; i < indexAt.length; i++) {
  const curAt = indexAt[i];
  const curValue = indexValue[i];
  let j = i - 1;
  while (j >= 0 && indexValue[j] > curValue) {
    indexAt[j + 1] = indexAt[j];
    indexValue[j + 1] = indexValue[j];
    j = j - 1;
  }
  indexAt[j + 1] = curAt;
  indexValue[j + 1] = curValue;
}
const order: number[] = [];
for (let i = 0; i < indexAt.length; i++) order.push(indexAt[i]);
for (let i = 0; i < plainAt.length; i++) order.push(plainAt[i]);
return order;
```

# method JsonIndent:(depth:int, indent:string)=>string

**缩进串**（第 192 轮 ✓）：`depth` 层 ✓、每层 `indent` ✓——纯字符串重复 ✓，不碰堆 ✓。

```ts
let text = "";
for (let i = 0; i < depth; i++) text = text + indent;
return text;
```

# method JsonHexDigit:(unit:int)=>int

**一位十六进制**（`0-9` / `a-f` / `A-F`）；非法给 `-1` ✓。

```ts
if (unit >= 48 && unit <= 57) return unit - 48;
if (unit >= 97 && unit <= 102) return unit - 87;
if (unit >= 65 && unit <= 70) return unit - 55;
return -1;
```

# method JsonSkipSpace:(text:Array<int>, cursor:any)=>void

**跳过 JSON 允许的那四种空白**（空格 / 制表 / 换行 / 回车 ✓）——**只有这四种** ✓
（JS 的 `JSON.parse` 就是这么定的 ✓：`\v` / `\f` / 不换行空格都不算 ✗）。

**游标为什么是一个对象**：本仓的方法**只返回一个值** ✓，而解析要带出「读到哪了」✓——
塞进一个只有本方法读写的对象里 ✓（与 `CollectDefaults` 那种「往调用方的数组里追加」同一个套路 ✓）。

```ts
while (cursor.At < text.length) {
  const unit = text[cursor.At];
  if (unit === 32 || unit === 9 || unit === 10 || unit === 13) {
    cursor.At = cursor.At + 1;
    continue;
  }
  return;
}
```

# method JsonExpectWord:(text:Array<int>, cursor:any, word:string)=>void

**认三个字面量词**（`true` / `false` / `null`）：逐码元比 ✓，比完把游标推过去 ✓；不一致就抛 ✓。

```ts
for (let i = 0; i < word.length; i++) {
  if (cursor.At >= text.length || text[cursor.At] !== word.charCodeAt(i)) {
    throw new SyntaxError("JSON.parse: expected " + word);
  }
  cursor.At = cursor.At + 1;
}
```

# method JsonParseString:(text:Array<int>, cursor:any)=>Array<int>

**解析一个 JSON 字符串字面量**：游标停在开引号上 ✓，成功时停在闭引号之后 ✓；返回**码元** ✓。

**转义**：`\" \\ \/ \b \f \n \r \t` 与 `\uXXXX` ✓。
**代理对原样两个码元** ✓——本仓的字符串就是 UTF-16 码元 ✓，
不需要「拼成一个码位」那一步 ✓（那一步反而会把两个码元并成一个 ✗）。

**不合法就抛** ✓：没闭合 ✓、裸控制字符 ✓（JSON 明文禁止 ✗）、不认识的转义 ✓、
`\u` 后面不是四位十六进制 ✓。

```ts
if (cursor.At >= text.length || text[cursor.At] !== 34) {
  throw new SyntaxError("JSON.parse: expected a string");
}
cursor.At = cursor.At + 1;
const out: number[] = [];
while (true) {
  if (cursor.At >= text.length) throw new SyntaxError("JSON.parse: unterminated string");
  const unit = text[cursor.At];
  cursor.At = cursor.At + 1;
  if (unit === 34) return out;
  if (unit < 32) throw new SyntaxError("JSON.parse: a raw control character in a string");
  if (unit !== 92) {
    out.push(unit);
    continue;
  }
  if (cursor.At >= text.length) throw new SyntaxError("JSON.parse: unterminated escape");
  const escape = text[cursor.At];
  cursor.At = cursor.At + 1;
  if (escape === 34) {
    out.push(34);
    continue;
  }
  if (escape === 92) {
    out.push(92);
    continue;
  }
  if (escape === 47) {
    out.push(47);
    continue;
  }
  if (escape === 98) {
    out.push(8);
    continue;
  }
  if (escape === 102) {
    out.push(12);
    continue;
  }
  if (escape === 110) {
    out.push(10);
    continue;
  }
  if (escape === 114) {
    out.push(13);
    continue;
  }
  if (escape === 116) {
    out.push(9);
    continue;
  }
  if (escape !== 117) throw new SyntaxError("JSON.parse: unknown escape");
  let value = 0;
  for (let i = 0; i < 4; i++) {
    if (cursor.At >= text.length) throw new SyntaxError("JSON.parse: truncated \\u escape");
    const digit = JsonHexDigit(text[cursor.At]);
    if (digit < 0) throw new SyntaxError("JSON.parse: bad \\u escape");
    value = value * 16 + digit;
    cursor.At = cursor.At + 1;
  }
  out.push(value);
}
```

# method JsonParseNumber:(text:Array<int>, cursor:any)=>Value

**解析一个 JSON 数字**：`-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?` ✓
（前导零 ✗、`1.` ✗、`.5` ✗、`1e` ✗——**每一条都抛** ✓，与 JS 一样严 ✓）。

**先按文法切出那一段文本，再交给宿主做十进制 → 双精度** ✓——
**这一步用宿主是应该的** ✓：正确舍入的十进制转换是 IEEE 754 的活儿 ✓
（TS 的 `Number` 与 C++ 的 `strtod` 都给「最近的那个双精度」✓），手写一遍只会写错 ✗。
（与 `TextFrom` / `UnitsOf` 同一条口径 ✓：**建库层是宿主侧代码** ✓；
「引擎侧不许用宿主库」那条规矩管的是 `runtime/` ✓。）

**整的、且在 `i32` 里就给 `Int32`** ✓，其余给 `Float64` ✓——与 `MathResult` / `MakeNumber`
同一条口径 ✓（同一个数在两处不该有两种标签 ✓）。

```ts
const start = cursor.At;
if (cursor.At < text.length && text[cursor.At] === 45) cursor.At = cursor.At + 1;
if (cursor.At >= text.length) throw new SyntaxError("JSON.parse: a number with no digits");
if (text[cursor.At] === 48) {
  // **前导零只许一个** ✓：`01` 是坏的 ✓。
  cursor.At = cursor.At + 1;
} else if (text[cursor.At] >= 49 && text[cursor.At] <= 57) {
  while (cursor.At < text.length && text[cursor.At] >= 48 && text[cursor.At] <= 57) {
    cursor.At = cursor.At + 1;
  }
} else {
  throw new SyntaxError("JSON.parse: a number must start with a digit");
}
if (cursor.At < text.length && text[cursor.At] === 46) {
  cursor.At = cursor.At + 1;
  if (cursor.At >= text.length || text[cursor.At] < 48 || text[cursor.At] > 57) {
    throw new SyntaxError("JSON.parse: a fraction needs digits");
  }
  while (cursor.At < text.length && text[cursor.At] >= 48 && text[cursor.At] <= 57) {
    cursor.At = cursor.At + 1;
  }
}
if (cursor.At < text.length && (text[cursor.At] === 101 || text[cursor.At] === 69)) {
  cursor.At = cursor.At + 1;
  if (cursor.At < text.length && (text[cursor.At] === 43 || text[cursor.At] === 45)) {
    cursor.At = cursor.At + 1;
  }
  if (cursor.At >= text.length || text[cursor.At] < 48 || text[cursor.At] > 57) {
    throw new SyntaxError("JSON.parse: an exponent needs digits");
  }
  while (cursor.At < text.length && text[cursor.At] >= 48 && text[cursor.At] <= 57) {
    cursor.At = cursor.At + 1;
  }
}
let literal = "";
for (let i = start; i < cursor.At; i++) literal = literal + String.fromCharCode(text[i]);
const number = Number(literal);
if (Number.isInteger(number) && number >= -2147483648 && number <= 2147483647) {
  return Value.FromInt(number);
}
return Value.FromDouble(number);
```

# method JsonParseValue:(room:RoomChecker, table:HeapTable, protos:Protos, text:Array<int>, cursor:any, depth:int)=>Value

**解析一个 JSON 值**（递归下降 ✓；每一种值一支 ✓）。

**深度上限**：超过 `MaxJsonDepth` 就抛 ✓——`parse` 是**宿主递归** ✓，
而宿主栈溢出**不可捕获** ✗（`README` 的硬性约定第 2 条 ✓），所以这不是风格问题 ✓。

**对象用 `NewPlainObject`、数组用 `NewPlainArray`** ✓（都带上原型表给的原型 ✓）：
于是 `JSON.parse('{"a":1}').a` ✓ 与 `JSON.parse('[1,2]').join('-')` ✓ 都成立 ✓。
**重复的键后面那个赢** ✓（JS 就是 `SetProperty` 覆盖 ✓，这一条与真实实现一致 ✓）。

**字符串那一格要先问 room** ✓：`table.CreateString` **自己不问** ✓（`heap.xl.md` 里它只管分配 ✓），
而解析出来的每一段文本都是新对象 ✓——不问就是绕过资源上限 ✗。

```ts
if (depth > MaxJsonDepth) throw new SyntaxError("JSON.parse: this document is nested too deeply");
JsonSkipSpace(text, cursor);
if (cursor.At >= text.length) throw new SyntaxError("JSON.parse: unexpected end of input");
const unit = text[cursor.At];
if (unit === 123) {
  cursor.At = cursor.At + 1;
  const created = NewPlainObject(room, table, protos);
  JsonSkipSpace(text, cursor);
  if (cursor.At < text.length && text[cursor.At] === 125) {
    cursor.At = cursor.At + 1;
    return created;
  }
  while (true) {
    JsonSkipSpace(text, cursor);
    const key = JsonParseString(text, cursor);
    JsonSkipSpace(text, cursor);
    if (cursor.At >= text.length || text[cursor.At] !== 58) {
      throw new SyntaxError("JSON.parse: expected ':'");
    }
    cursor.At = cursor.At + 1;
    const value = JsonParseValue(room, table, protos, text, cursor, depth + 1);
    if (!room(ObjectCharge + CodeUnitCharge * key.length)) throw new Error("out of room");
    // **这里是普通属性** ✗（第 194 轮差点改错 ✓）：JSON 解析出来的键是**数据** ✓，
    // `Object.keys(JSON.parse(...))` 在 JS 里看得见它们 ✓——「不可枚举」只给
    // **内部件与方法**用 ✓（`__t` / `__k` / `message` / 那一批方法 ✓）。
    // 判据当场抓住了这一格 ✓：那条 check 报的是「期望 {...}、实际 {}」✓。
    SetProperty(room, NeverCall, table, created, Value.FromString(table.CreateString(key)), value);
    JsonSkipSpace(text, cursor);
    if (cursor.At >= text.length) throw new SyntaxError("JSON.parse: unterminated object");
    if (text[cursor.At] === 44) {
      cursor.At = cursor.At + 1;
      continue;
    }
    if (text[cursor.At] === 125) {
      cursor.At = cursor.At + 1;
      return created;
    }
    throw new SyntaxError("JSON.parse: expected a comma or the closing brace");
  }
}
if (unit === 91) {
  cursor.At = cursor.At + 1;
  const array = NewPlainArray(room, table, protos);
  JsonSkipSpace(text, cursor);
  if (cursor.At < text.length && text[cursor.At] === 93) {
    cursor.At = cursor.At + 1;
    return array;
  }
  while (true) {
    const value = JsonParseValue(room, table, protos, text, cursor, depth + 1);
    table.Get(array.Ref).AsArray().Push(value);
    JsonSkipSpace(text, cursor);
    if (cursor.At >= text.length) throw new SyntaxError("JSON.parse: unterminated array");
    if (text[cursor.At] === 44) {
      cursor.At = cursor.At + 1;
      continue;
    }
    if (text[cursor.At] === 93) {
      cursor.At = cursor.At + 1;
      return array;
    }
    throw new SyntaxError("JSON.parse: expected a comma or the closing bracket");
  }
}
if (unit === 34) {
  const units = JsonParseString(text, cursor);
  if (!room(ObjectCharge + CodeUnitCharge * units.length)) throw new Error("out of room");
  return Value.FromString(table.CreateString(units));
}
if (unit === 116) {
  JsonExpectWord(text, cursor, "true");
  return Value.FromBool(true);
}
if (unit === 102) {
  JsonExpectWord(text, cursor, "false");
  return Value.FromBool(false);
}
if (unit === 110) {
  JsonExpectWord(text, cursor, "null");
  return Value.Null();
}
if (unit === 45 || (unit >= 48 && unit <= 57)) return JsonParseNumber(text, cursor);
throw new SyntaxError("JSON.parse: unexpected character");
```

# method JsonRevive:(room:RoomChecker, table:HeapTable, call:NativeCall | null, failed:CallFailed | null, holder:Value, name:string, reviver:Value)=>Value

**`JSON.parse` 的 reviver 那一步**（第 279 轮 ✓）——JS 的 `InternalizeJSONProperty` ✓。

**顺序是「先自底向上、再调回调」** ✗：`holder[name]` 若是对象 ✓，
就**先把它的每一格都过一遍** ✓，然后才拿**这一格**调 `reviver.call(holder, name, value)` ✓
（JS 就是这么定的 ✓）。**反过来写**（先调自己再走孩子）会让父回调看到**没走完的孩子** ✓
——判据里所有数字都乘了 10 ✓，写反了就会**一部分乘了、一部分没乘** ✓。

**回调返回 `undefined` 是「删掉这一格」** ✗（JS 的口径 ✓，不是「写一个 `undefined`」✓）：
`{"a":1}` 配 `(k, v) => typeof v === "number" ? undefined : v` 在 JS 里给 `{}` ✓，
而写成「写入 `undefined`」会给 `{"a":undefined}` ✓（**形状变了** ✓，`"a" in o` 从真变假 ✗）。

**数组那一支不能删格** ✗：JS 对数组元素用的是**定义那一格** ✓
（`len` 不变 ✓，返回 `undefined` 就把它设成 `undefined` ✓）。两处**不是同一条** ✓
——所以下面分成两支写 ✓，而不是合成一句「删掉」✗。

**`failed` 那一问每一轮都要问** ✓（与这一块其余回调循环同一条 ✓）：
回调抛出之后 `walked` 是 `undefined` ✓，不问的话会被当成**回调的答案**用 ✓
（于是「抛了」变成「把那一格设成了 `undefined`」✗，**静默错值** ✓）。

```ts
const holderKey = Value.FromString(table.CreateString(Units(name)));
// **① `holder[name]`**：数组按下标 ✓、对象按自有属性 ✓。
// **洞与缺席都给 `undefined`** ✓（JS 的 `Get` 也是这个答案 ✓）——两者在这里不必分开 ✓。
let current = Value.Undefined();
if (holder.Tag === ValueTag.Array) {
  const holderItems = table.Get(holder.Ref).AsArray();
  const at = Number(name);
  if (at >= 0 && at < holderItems.GetLength() && !holderItems.IsHole(at)) {
    current = holderItems.GetAt(at);
  }
} else {
  const here = FindProperty(room, table, holder.Ref, holderKey);
  if (here !== null && here.Owner === holder.Ref) {
    current = table.Get(holder.Ref).Props[here.Index].Value;
  }
}
// **② 是容器就先把孩子走完** ✓（对象与数组**都是** `IsObject()` ✓——数组也是对象 ✓）。
if (current.IsObject()) {
  const container = table.Get(current.Ref);
  if (current.Tag === ValueTag.Array) {
    const containerItems = container.AsArray();
    const length = containerItems.GetLength();
    for (let i = 0; i < length; i++) {
      const walked = JsonRevive(room, table, call, failed, current, "" + i, reviver);
      if (failed !== null && failed()) return Value.Undefined();
      // **数组：定义那一格，不删** ✓（见上面那一段 ✓）。`SetAt` 会把洞清掉 ✓——正是想要的 ✓。
      containerItems.SetAt(i, walked);
    }
  } else {
    // **先把键抄下来再改** ✗：走一趟回调会**改这一摞属性** ✓（返回 `undefined` 时删掉 ✓），
    // 边扫边改就是**边遍历边改容器** ✓——抄一份是唯一稳的写法 ✓。
    // **只看自有 + 可枚举 + 字符串键** ✓（JS 的 `EnumerableOwnPropertyNames` ✓）：
    // 访问器跳过 ✗（读它要重入 ✓，而 JSON 解析出来的树上**根本没有访问器** ✓——
    // 跳过的代价是零 ✓，写进去的代价是「遍历顺序里冒出一格不存在的东西」✗）。
    const childNames: string[] = [];
    for (let i = 0; i < container.Props.length; i++) {
      const property = container.Props[i];
      if (property.Kind === PropertyKind.Accessor) continue;
      if (!property.IsEnumerable()) continue;
      if (table.Get(property.Key).Tag !== ValueTag.String) continue;
      childNames.push(TextFrom(table, Value.FromString(property.Key)));
    }
    for (let i = 0; i < childNames.length; i++) {
      const walked = JsonRevive(room, table, call, failed, current, childNames[i], reviver);
      if (failed !== null && failed()) return Value.Undefined();
      const childKey = Value.FromString(table.CreateString(Units(childNames[i])));
      if (walked.Tag === ValueTag.Undefined) {
        // **`undefined` ⇒ 删掉这一格** ✓（JS 的 `DeletePropertyOrThrow` ✓）。
        DeleteProperty(table, current.Ref, childKey);
      } else {
        SetProperty(room, NeverCall, table, current, childKey, walked);
      }
    }
  }
}
// **③ 最后才拿这一格调回调** ✓（顺序见上面那一段 ✓）。
// **`this` 是 holder** ✓（JS 的 `Call(reviver, holder, «name, value»)` ✓）——
// 写成 `Value.Undefined()` 会让 `reviver` 里读 `this` 的那一支拿到 `undefined` ✓（静默 ✓）。
if (call === null) return current;
return call(reviver, holder, [holderKey, current]);
```

# method JsonParseText:(room:RoomChecker, table:HeapTable, protos:Protos, text:Array<int>)=>Value

**`JSON.parse` 的正身**：解析**一个**值，然后要求**后面只剩空白** ✓——
`"1 2"` / `"{}extra"` 都是坏的 ✓（JS 也拒 ✓）。

**为什么自己走一遍、不用宿主的 `JSON.parse`** ✓：它给的是**宿主对象** ✗，
而这一层要的是**堆里的值** ✓（转换那一步要另写一套，还多一次分配）；
更要紧的是**跨目标** ✗——C++ 那边抄不了 `JSON.parse` ✓，
而这一份逻辑逐行都能翻 ✓（与 `DateParts` 用 Hinnant 公式而不是宿主日期库同一条理由 ✓）。

```ts
const cursor = { At: 0 };
const value = JsonParseValue(room, table, protos, text, cursor, 0);
JsonSkipSpace(text, cursor);
if (cursor.At !== text.length) throw new SyntaxError("JSON.parse: trailing characters after the value");
return value;
```

# method BuildGlobals:(vm:Vm, protos:Protos, sink:LogSink)=>Value

**造出交给模块的那个环境对象**：`{ Math: {...}, console: {...} }`。

**每次求值都造一个新的**：模块之间不共享可变状态（这一轮也没有跨模块的东西），
所以不必有一个「全局单例」——**没有共享就没有共享带来的顺序问题**。

```ts
const table = vm.Table;
const globals = NewPlainObject(vm.Room(), table, protos);
const math = NewPlainObject(vm.Room(), table, protos);
const mathNames: string[] = ["floor", "abs", "max", "min", "round", "ceil", "trunc", "sign", "sqrt", "pow",
  "log", "exp", "cbrt", "hypot",
  // **第 275 轮补的十格** ✓（号开在 `350..359` ✓，理由见那十段号 ✓）——
  // 名字与号**一一对齐** ✓（两张表按下标配 ✓，错一格就是**静默**换语义 ✗）。
  "imul", "clz32", "fround", "expm1", "sinh", "cosh", "tanh", "log2", "log10", "log1p",
  // **第 288 轮补的三角七格** ✓（号开在 `360..366` ✓）——同样**按下标配** ✓。
  "sin", "cos", "tan", "asin", "acos", "atan", "atan2"];
const mathIds: number[] = [MathFloor, MathAbs, MathMax, MathMin, MathRound, MathCeil, MathTrunc, MathSign,
  MathSqrt, MathPow, MathLog, MathExp, MathCbrt, MathHypot,
  MathImul, MathClz32, MathFround, MathExpm1, MathSinh, MathCosh, MathTanh, MathLog2, MathLog10, MathLog1p,
  MathSin, MathCos, MathTan, MathAsin, MathAcos, MathAtan, MathAtan2];
for (let i = 0; i < mathNames.length; i++) {
  const key = Value.FromString(table.CreateString(Units(mathNames[i])));
  const target = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(mathIds[i], 0));
  SetProperty(vm.Room(), NeverCall, table, math, key, target);
}
// **`Math.PI` / `Math.E` 是属性，不是方法** ✓（第 206 轮 ✓）：它们是**数** ✓，
// 所以挂的是 `Value.FromDouble(...)` 本身 ✓——挂成 HostRef 的话
// `Math.PI` 取出来会是一个「能被调用的号」✗（`Math.PI * 2` 于是算不对 ✓）。
// **`Math.PI` 遍地都是** ✓（圆的面积、角度换算 ✓），而判据 `e2e-inheritance-hierarchy` /
// `math-logs-constants` 拖着的正是它 ✓。
SetProperty(vm.Room(), NeverCall, table, math,
  Value.FromString(table.CreateString(Units("PI"))), Value.FromDouble(Math.PI));
SetProperty(vm.Room(), NeverCall, table, math,
  Value.FromString(table.CreateString(Units("E"))), Value.FromDouble(Math.E));
// **第 291 轮补的六个常量** ✓（`LN2` / `LN10` / `LOG2E` / `LOG10E` / `SQRT2` / `SQRT1_2` ✓）。
// **`Math.PI` 与 `Math.E` 两条先例的照抄** ✓：常量是**数** ✓，挂的是 `Value.FromDouble(...)` 本身 ✓
// ——**不是** `HostRef` ✗（挂错的话 `Math.LN2` 会变成一个「能被调用的号」✓，
// 于是 `Math.LN2 > 0.69` 静默给假 ✗）。
// **它们是第 291 轮普查量到的** ✗：判据 `c291-math-constants-and-pow` 量到
// `Math.LN2 > 0.69` 与 `Math.SQRT2 > 1.41` 都给**假** ✓——即**那两格根本没装** ✗
//（PI / E / pow 一直是好的 ✓）。**静默错值** ✓：一句异常都没有 ✓。
SetProperty(vm.Room(), NeverCall, table, math,
  Value.FromString(table.CreateString(Units("LN2"))), Value.FromDouble(Math.LN2));
SetProperty(vm.Room(), NeverCall, table, math,
  Value.FromString(table.CreateString(Units("LN10"))), Value.FromDouble(Math.LN10));
SetProperty(vm.Room(), NeverCall, table, math,
  Value.FromString(table.CreateString(Units("LOG2E"))), Value.FromDouble(Math.LOG2E));
SetProperty(vm.Room(), NeverCall, table, math,
  Value.FromString(table.CreateString(Units("LOG10E"))), Value.FromDouble(Math.LOG10E));
SetProperty(vm.Room(), NeverCall, table, math,
  Value.FromString(table.CreateString(Units("SQRT2"))), Value.FromDouble(Math.SQRT2));
SetProperty(vm.Room(), NeverCall, table, math,
  Value.FromString(table.CreateString(Units("SQRT1_2"))), Value.FromDouble(Math.SQRT1_2));
const consoleObject = NewPlainObject(vm.Room(), table, protos);
const logKey = Value.FromString(table.CreateString(Units("log")));
const logTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ConsoleLog, 0));
SetProperty(vm.Room(), NeverCall, table, consoleObject, logKey, logTarget);

const objectObject = NewPlainObject(vm.Room(), table, protos);
const keysKey = Value.FromString(table.CreateString(Units("keys")));
const keysTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectKeys, 0));
SetProperty(vm.Room(), NeverCall, table, objectObject, keysKey, keysTarget);
// **`Object.is`**（第 275 轮 ✓）：与 `keys` **同一张对象**上再挂一格 ✓
//（与 `JSON.stringify` / `parse` 那两格的写法一字不差 ✓）。
const isKey = Value.FromString(table.CreateString(Units("is")));
const isTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectIs, 0));
SetProperty(vm.Room(), NeverCall, table, objectObject, isKey, isTarget);
// **第 276 轮补的五格** ✓（`Object` 那一段的 `412..416` ✓）——**名字与号一一对齐** ✓
//（按下标配 ✓，错一格就是**静默**换语义 ✗）。它们围着**描述符**这一件事 ✓：
// 读一格 / 写多格 / 标志位的三种问法 ✓。
const objectExtraNames: string[] = ["getOwnPropertyDescriptor", "defineProperties", "seal",
  "isSealed", "isFrozen",
  // **第 291 轮补的一格** ✓（`isExtensible` ✓）——它与上面两格**共用同一张底牌** ✓
  //（见号那一段 ✓）。名字与号照旧**按下标配** ✓。
  "isExtensible",
  // **第 304 轮补的两格** ✓（`setPrototypeOf` / `preventExtensions` ✓）——
  // 号在 `419` / `420` ✓，名字与号**按下标配** ✓（错一格就是**静默**换语义 ✗）。
  // 它们是第 304 轮加宽矩阵时**当场量到的** ✗（两条判据都在报
  // `cannot call a non-closure value` ✓——那一族**有问的人、没有做的人** ✓）。
  "setPrototypeOf", "preventExtensions",
  // **第 324 轮补的一格** ✓（`getOwnPropertyDescriptors` ✓，号 `428` ✓）——
  // 它排在**最后** ✓：这两张表**按下标配** ✓（错一格就是**静默**换语义 ✗），
  // 而插在中间会把后面每一格都挪一位 ✓（第 280 轮那次号撞车就是这么来的 ✓）。
  "getOwnPropertyDescriptors"];
const objectExtraIds: number[] = [ObjectGetOwnPropertyDescriptor, ObjectDefineProperties, ObjectSeal,
  ObjectIsSealed, ObjectIsFrozen, ObjectIsExtensible,
  ObjectSetPrototypeOf, ObjectPreventExtensions,
  ObjectGetOwnPropertyDescriptors];
for (let i = 0; i < objectExtraNames.length; i++) {
  const extraKey = Value.FromString(table.CreateString(Units(objectExtraNames[i])));
  const extraTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(objectExtraIds[i], 0));
  SetProperty(vm.Room(), NeverCall, table, objectObject, extraKey, extraTarget);
}

const jsonObject = NewPlainObject(vm.Room(), table, protos);
const stringifyKey = Value.FromString(table.CreateString(Units("stringify")));
const stringifyTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(JsonStringify, 0));
SetProperty(vm.Room(), NeverCall, table, jsonObject, stringifyKey, stringifyTarget);
// `JSON.parse`（第 122 轮）：与 `stringify` 同一张对象上再挂一个号 ✓。
const parseKey = Value.FromString(table.CreateString(Units("parse")));
const parseTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(JsonParse, 0));
SetProperty(vm.Room(), NeverCall, table, jsonObject, parseKey, parseTarget);

// `Object.values` / `Object.entries`（第 120 轮补）：与 `keys` 同一张对象上再挂两个号 ✓。
const valuesKey = Value.FromString(table.CreateString(Units("values")));
const valuesTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectValues, 0));
SetProperty(vm.Room(), NeverCall, table, objectObject, valuesKey, valuesTarget);
const entriesKey = Value.FromString(table.CreateString(Units("entries")));
const entriesTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectEntries, 0));
SetProperty(vm.Room(), NeverCall, table, objectObject, entriesKey, entriesTarget);
// `Object.assign`（第 130 轮）：与上面三个同一张对象 ✓。
const assignKey = Value.FromString(table.CreateString(Units("assign")));
const assignTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectAssign, 0));
SetProperty(vm.Room(), NeverCall, table, objectObject, assignKey, assignTarget);
// **`Object.freeze` / `Object.defineProperty`**（第 182 轮）：与上面四个同一张对象 ✓。
// 两个都只动**属性表里的标志位** ✓（`SetProperty` / `DeleteProperty` 早就照着它们抛 ✓）。
const freezeKey = Value.FromString(table.CreateString(Units("freeze")));
const freezeTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectFreeze, 0));
SetProperty(vm.Room(), NeverCall, table, objectObject, freezeKey, freezeTarget);
const definePropertyKey = Value.FromString(table.CreateString(Units("defineProperty")));
const definePropertyTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectDefineProperty, 0));
SetProperty(vm.Room(), NeverCall, table, objectObject, definePropertyKey, definePropertyTarget);
// **`Object.groupBy`**（第 295 轮 ✓）：与上面那些**同一张对象**上再挂一格 ✓。
const groupByKey = Value.FromString(table.CreateString(Units("groupBy")));
const groupByTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectGroupBy, 0));
SetProperty(vm.Room(), NeverCall, table, objectObject, groupByKey, groupByTarget);

// `Error` 是一个**宿主构造函数**（`new Error(msg)` 走 `Op.New` 的宿主那条分支 ✓，
// `Error(msg)` 走 `Op.Call` ✓——同一个号两支都通，见 `ErrorCtor` 的说明）。
const errorKey = Value.FromString(table.CreateString(Units("Error")));
const errorTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ErrorCtor, 0));
SetProperty(vm.Room(), NeverCall, table, globals, errorKey, errorTarget);
// **`Error` 的 `prototype` 要登记**（第 137 轮）✗：它是**宿主引用值** ✓，
// **没有属性表** ✗——所以 `GetProperty(Error, "prototype")` 永远给 `undefined` ✗，
// 而 `instanceof` 正是靠读那个属性找目标的 ✓。登记一次，
// `x instanceof Error` 就走引擎那张表 ✓（`vm.xl.md` 的 `ConstructorProtos` ✓）。
vm.RegisterConstructorProto(ErrorCtor, protos.Error);
// **`TypeError` / `RangeError` 两个号也登记**（第 137 轮）✓，并且挂成全局名 ✓
// （`GlobalNames` 那张名单 ✓——两边是同一份约定 ✓，少一处就是「声明了却没提供」✗）。
const typeErrorKey = Value.FromString(table.CreateString(Units("TypeError")));
const typeErrorTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(TypeErrorCtor, 0));
SetProperty(vm.Room(), NeverCall, table, globals, typeErrorKey, typeErrorTarget);
vm.RegisterConstructorProto(TypeErrorCtor, protos.TypeError);
const rangeErrorKey = Value.FromString(table.CreateString(Units("RangeError")));
const rangeErrorTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(RangeErrorCtor, 0));
SetProperty(vm.Room(), NeverCall, table, globals, rangeErrorKey, rangeErrorTarget);
vm.RegisterConstructorProto(RangeErrorCtor, protos.RangeError);
// **`SyntaxError` 那三样**（第 277 轮 ✓）：挂全局名 ✓、登记原型 ✓、原型上三个属性 ✓——
// 与上面那两条一字不差 ✓。**三处缺一处的表现各不相同** ✗（都记在明处 ✓）：
// 只挂名字不登记原型 ⇒ `e instanceof SyntaxError` **抛**「右边没有原型对象」✓；
// 登记了原型但没挂 `name` ⇒ `new SyntaxError().name` 读到 `Error.prototype` 的 `"Error"` ✓
//（**看着对** ✓）；没挂 `constructor` ⇒ `e.constructor === SyntaxError` 给假 ✓。
const syntaxErrorKey = Value.FromString(table.CreateString(Units("SyntaxError")));
const syntaxErrorTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(SyntaxErrorCtor, 0));
SetProperty(vm.Room(), NeverCall, table, globals, syntaxErrorKey, syntaxErrorTarget);
vm.RegisterConstructorProto(SyntaxErrorCtor, protos.SyntaxError);
// **`ReferenceError` / `AggregateError` 两格**（第 295 轮 ✓）：挂全局名 ✓、登记原型 ✓——
// 与上面那三条一字不差 ✓。**原型上的 `name` / `message` / `constructor` 三格**
// 由下面那段循环一起挂 ✓（它们就在那张名单里 ✓）。
const referenceErrorKey = Value.FromString(table.CreateString(Units("ReferenceError")));
const referenceErrorTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ReferenceErrorCtor, 0));
SetProperty(vm.Room(), NeverCall, table, globals, referenceErrorKey, referenceErrorTarget);
vm.RegisterConstructorProto(ReferenceErrorCtor, protos.ReferenceError);
const aggregateErrorKey = Value.FromString(table.CreateString(Units("AggregateError")));
const aggregateErrorTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(AggregateErrorCtor, 0));
SetProperty(vm.Room(), NeverCall, table, globals, aggregateErrorKey, aggregateErrorTarget);
vm.RegisterConstructorProto(AggregateErrorCtor, protos.AggregateError);
// **`WeakMap` / `WeakSet`**（第 295 轮 ✓）：**值就是 `Map` / `Set` 那两个构造** ✓——
// 本仓**没有弱引用那一档** ✗（回收器不认「弱」这个属性 ✓），
// 而它们拖着的两条判据只量 `set` / `get` / `has` / `delete` / `add` ✓——
// 拿 `Map` / `Set` 顶上，那些格**一格不差** ✓。
//
// **两处已知差异写在明处** ✗（都不能装作没有 ✓）：
// · **键必须是对象**那一条**没有单独判** ✓（`new WeakMap().set(1, 2)` 在本仓是通的 ✗、
//   在 JS 里抛 `TypeError` ✓）；
// · **`instanceof WeakMap` 是假的** ✓（原型还是 `Map` 那一个 ✓）。
// **为什么不给它们各造一个原型** ✗：方法挂在**实例**上 ✓（`map.xl.md` 的 `InstallMapMethods` ✓），
// 所以「用哪个原型」只影响 `instanceof` 那一格 ✓——为它复制一整套安装代码不成比例 ✓
//（判据也没有量它 ✓），记在台账里 ✓。
const weakMapKey = Value.FromString(table.CreateString(Units("WeakMap")));
const weakMapObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(weakMapObject.Ref, MapCtor, 0);
SetProperty(vm.Room(), NeverCall, table, globals, weakMapKey, weakMapObject);
const weakSetKey = Value.FromString(table.CreateString(Units("WeakSet")));
const weakSetObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(weakSetObject.Ref, SetCtor, 0);
SetProperty(vm.Room(), NeverCall, table, globals, weakSetKey, weakSetObject);
// **`Map` / `Set` 两个号登记**（第 138 轮）：它们是**宿主引用值** ✓（与 `Error` 同款 ✗），
// 只能走登记表 ✓。**`Date` 不走这条路** ✗——它的全局值是**普通对象** ✓
// （`new Date()` 由降级层落成一条 `host_call(DateCtor, …)` ✓，见 `DateCtor` 的说明 ✓），
// 所以那一格用「在对象上挂 `prototype` 属性」的老路 ✓（与 `Array` / `Object` / `String` 同款 ✓）。
vm.RegisterConstructorProto(MapCtor, protos.Map);
vm.RegisterConstructorProto(SetCtor, protos.Set);
// **`Error.prototype` 上的三个属性**（`name` / `message` / `constructor`）✓：
// `name` 是 `e.name` 在没有自有属性时的落点 ✓，`constructor` 是 `e.constructor === Error` ✓。
// **`message` 给空串** ✓（JS 的 `Error.prototype.message` 就是 `""` ✓）。
const errorProtoValue = Value.FromObject(protos.Error);
SetProperty(vm.Room(), NeverCall, table, errorProtoValue, NameValue(table, "name"),
  Value.FromString(table.CreateString(Units("Error"))));
SetProperty(vm.Room(), NeverCall, table, errorProtoValue, NameValue(table, "message"),
  Value.FromString(table.CreateString(Units(""))));
SetProperty(vm.Room(), NeverCall, table, errorProtoValue, NameValue(table, "constructor"), errorTarget);
// **`Error.prototype.toString`** ✓（第 213 轮 ✓）：**隐藏挂** ✓（与 `Object.prototype` 那两格
// 同一条规矩 ✓——`Object.keys` / `for..in` 不该看见它 ✓）。
// **挂 `Error.prototype` 就够** ✓：三个错误子族的原型都**链在它下面** ✓（第 137 轮 ✓），
// 所以 `TypeError` 那边**不必再挂一份** ✓（挂两份就是两处会漂的答案 ✗）。
SetHiddenProperty(vm.Room(), table, errorProtoValue,
  Value.FromString(table.CreateString(Units("toString"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ErrorToString, 0)));
// **`TypeError.prototype` / `RangeError.prototype` 上的同名三格** ✓：
// `name` 是各自的种类名 ✓（`e.name` 在没有自有属性时的落点 ✓），
// `message` 给空串 ✓、`constructor` 指回各自那个构造函数 ✓。
// **三格一次写完**（`protos.TypeError` / `protos.RangeError` ✓）——
// 漏一格的表现是 `e.name` 读成 `"Error"` ✗（错得**很像对的** ✓）。
const typeErrorProtoValue = Value.FromObject(protos.TypeError);
SetProperty(vm.Room(), NeverCall, table, typeErrorProtoValue, NameValue(table, "name"),
  Value.FromString(table.CreateString(Units("TypeError"))));
SetProperty(vm.Room(), NeverCall, table, typeErrorProtoValue, NameValue(table, "message"),
  Value.FromString(table.CreateString(Units(""))));
SetProperty(vm.Room(), NeverCall, table, typeErrorProtoValue, NameValue(table, "constructor"), typeErrorTarget);
const rangeErrorProtoValue = Value.FromObject(protos.RangeError);
SetProperty(vm.Room(), NeverCall, table, rangeErrorProtoValue, NameValue(table, "name"),
  Value.FromString(table.CreateString(Units("RangeError"))));
SetProperty(vm.Room(), NeverCall, table, rangeErrorProtoValue, NameValue(table, "message"),
  Value.FromString(table.CreateString(Units(""))));
SetProperty(vm.Room(), NeverCall, table, rangeErrorProtoValue, NameValue(table, "constructor"), rangeErrorTarget);
// **`SyntaxError.prototype` 上的同名三格**（第 277 轮 ✓）——**一字不差地照上面那两族写** ✓。
// **`toString` 不必再挂一份** ✓：它挂在 `Error.prototype` 上 ✓，
// 而这一格的原型链接着 `Error.prototype` ✓（第 137 轮那条链 ✓）——挂两份就是两处会漂的答案 ✗。
const syntaxErrorProtoValue = Value.FromObject(protos.SyntaxError);
SetProperty(vm.Room(), NeverCall, table, syntaxErrorProtoValue, NameValue(table, "name"),
  Value.FromString(table.CreateString(Units("SyntaxError"))));
SetProperty(vm.Room(), NeverCall, table, syntaxErrorProtoValue, NameValue(table, "message"),
  Value.FromString(table.CreateString(Units(""))));
SetProperty(vm.Room(), NeverCall, table, syntaxErrorProtoValue, NameValue(table, "constructor"), syntaxErrorTarget);
// **`ReferenceError.prototype` / `AggregateError.prototype` 上的同名三格**（第 295 轮 ✓）——
// **一字不差地照上面那三族写** ✓。**`toString` 同样不必再挂一份** ✓（挂在 `Error.prototype` 上 ✓，
// 而这两格的原型链都接着它 ✓）。
const referenceErrorProtoValue = Value.FromObject(protos.ReferenceError);
SetProperty(vm.Room(), NeverCall, table, referenceErrorProtoValue, NameValue(table, "name"),
  Value.FromString(table.CreateString(Units("ReferenceError"))));
SetProperty(vm.Room(), NeverCall, table, referenceErrorProtoValue, NameValue(table, "message"),
  Value.FromString(table.CreateString(Units(""))));
SetProperty(vm.Room(), NeverCall, table, referenceErrorProtoValue, NameValue(table, "constructor"), referenceErrorTarget);
const aggregateErrorProtoValue = Value.FromObject(protos.AggregateError);
SetProperty(vm.Room(), NeverCall, table, aggregateErrorProtoValue, NameValue(table, "name"),
  Value.FromString(table.CreateString(Units("AggregateError"))));
SetProperty(vm.Room(), NeverCall, table, aggregateErrorProtoValue, NameValue(table, "message"),
  Value.FromString(table.CreateString(Units(""))));
SetProperty(vm.Room(), NeverCall, table, aggregateErrorProtoValue, NameValue(table, "constructor"), aggregateErrorTarget);

// **`Array` 是一个普通对象**（与 `Math` / `Date` 同款 ✓），上面只挂**静态方法** `isArray` ✓
// （第 123 轮）。
// **第 145 轮它同时是构造函数了** ✓：`AttachCallable` 给它挂上 `ArrayCtor` ✓，
// 于是 `new Array(3)` / `Array(1, 2)` 都通 ✓（原来那条「已知差异」没有了 ✓）。
const arrayObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(arrayObject.Ref, ArrayCtor, 0);
const isArrayKey = Value.FromString(table.CreateString(Units("isArray")));
const isArrayTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ArrayIsArray, 0));
SetProperty(vm.Room(), NeverCall, table, arrayObject, isArrayKey, isArrayTarget);
// `Array.from`（第 130 轮）：与 `isArray` 同一张对象 ✓（这两个都是 `Array` 的**静态方法** ✓）。
// **号在数组段、分派在 `install.xl.md`** ✓——它要原型表（返回新数组 ✓），
// 理由与 `String.split` 那条一字不差 ✓。
const fromKey = Value.FromString(table.CreateString(Units("from")));
const fromTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ArrayFrom, 0));
SetProperty(vm.Room(), NeverCall, table, arrayObject, fromKey, fromTarget);
// **`Array.of`**（第 206 轮 ✓）：与 `isArray` / `from` 同一张对象 ✓（都是静态方法 ✓）——
// **号在数组段、分派在 `install.xl.md`** ✓，理由与 `from` 那条一字不差 ✓（要原型表 ✓）。
const ofKey = Value.FromString(table.CreateString(Units("of")));
const ofTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ArrayOf, 0));
SetProperty(vm.Room(), NeverCall, table, arrayObject, ofKey, ofTarget);
const arrayKey = Value.FromString(table.CreateString(Units("Array")));
SetProperty(vm.Room(), NeverCall, table, globals, arrayKey, arrayObject);
// **`Array.prototype`**（第 137 轮）：`Array` 是**普通对象** ✓，所以直接挂一个属性就行 ✓——
// `[] instanceof Array` 于是走「读右边那个 `prototype` 属性」那条老路 ✓（不需要登记表 ✓）。
// **这一格必须是 `protos.Array`** ✗（数组造出来时挂的就是它 ✓）：挂一个**新对象**，
// `instanceof` 会一路走到底给 `false` ✗——那是最难查的一种「看起来都做了」✓。
SetProperty(vm.Room(), NeverCall, table, arrayObject, NameValue(table, "prototype"),
  Value.FromObject(protos.Array));
// **`Array.prototype.constructor === Array`** ✓（第 137 轮顺手补的 ✓）：
// 与 `Error.prototype.constructor` 那三格同一条规矩 ✓——少了它，
// `[].constructor === Array` 给 **`false`** ✗（判据现场就是这么红的 ✓）。
SetProperty(vm.Room(), NeverCall, table, Value.FromObject(protos.Array), NameValue(table, "constructor"),
  arrayObject);
// **`Number` 也是一个普通对象**（第 126 轮），上面挂静态判定 ✓；
// **第 145 轮它同时能被调用** ✓（`Number("7")` ✓）。
const numberObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(numberObject.Ref, NumberCtor, 0);
// **`parseInt` / `parseFloat` 的宿主引用只造一次** ✓（第 206 轮 ✓）：
// 上面那两个全局、下面 `Number.parseInt` 那一格，**用的是同一个 `Value`** ✓——
// 不然 `Number.parseInt === parseInt` 给 `false` ✗（JS 给 `true` ✓）。
// 根子在**宿主引用的判等口径**上 ✓：`HostRef` 按**堆句柄**比 ✓，
// 两次 `CreateHostRef(同一个号)` 造的是**两个句柄** ✓ ⇒ 两个值不相等 ✗。
// 「同一个函数」这件事在 JS 里是**能被脚本看见的** ✓（实测 `Number.parseInt === parseInt` ✓），
// 所以只能**共用同一个值** ✓，不能在两处各造一个 ✓。
const parseIntTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ParseInt, 0));
const parseFloatTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ParseFloat, 0));
const isIntegerKey = Value.FromString(table.CreateString(Units("isInteger")));
const isIntegerTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(NumberIsInteger, 0));
SetProperty(vm.Room(), NeverCall, table, numberObject, isIntegerKey, isIntegerTarget);
// **`Number.isSafeInteger`**（第 288 轮 ✓）：与 `isInteger` **同一支实现** ✓
//（只差一句区间判据 ✓，见那一支的理由 ✓）——所以这里挂的是**另一个能力号** ✓，
// 而**不是另一份实现** ✗。
const isSafeIntegerKey = Value.FromString(table.CreateString(Units("isSafeInteger")));
const isSafeIntegerTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(NumberIsSafeInteger, 0));
SetProperty(vm.Room(), NeverCall, table, numberObject, isSafeIntegerKey, isSafeIntegerTarget);
const isNaNAKey = Value.FromString(table.CreateString(Units("isNaN")));
const isNaNTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(NumberIsNaN, 0));
SetProperty(vm.Room(), NeverCall, table, numberObject, isNaNAKey, isNaNTarget);
// **`Number.isFinite`**（第 149 轮）✓：与全局的 `isFinite` 不是一个东西 ✓
//（那个先转、这个不转 ✓），所以两处各挂一格 ✓。
const isFiniteKey = Value.FromString(table.CreateString(Units("isFinite")));
const isFiniteTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(NumberIsFinite, 0));
SetProperty(vm.Room(), NeverCall, table, numberObject, isFiniteKey, isFiniteTarget);
// **`Number.parseInt` / `Number.parseFloat`**（第 206 轮 ✓）：它们与**全局那两个是同一个个函数** ✓
//（JS 就是这么定的：`Number.parseInt === parseInt` 为真 ✓）——所以这里挂的是**同一个能力号** ✓，
// 而不是另写一份 ✗（`parseInt` 那一段的规矩不少：跳空白 / 认符号 / 基数 / 最长合法前缀 ✓，
// 写第二份就是第二处会漂的答案 ✗）。
const numberParseIntKey = Value.FromString(table.CreateString(Units("parseInt")));
SetProperty(vm.Room(), NeverCall, table, numberObject, numberParseIntKey, parseIntTarget);
const numberParseFloatKey = Value.FromString(table.CreateString(Units("parseFloat")));
SetProperty(vm.Room(), NeverCall, table, numberObject, numberParseFloatKey, parseFloatTarget);
// **数值常量是属性，不是方法** ✓（与 `Math.PI` 同一条规矩 ✓）。
// `MAX_SAFE_INTEGER` 是 **2^53-1** ✓（`9007199254740991` ✓）——它**超出 int32** ✓，
// 所以必须是 `FromDouble` ✓（写成 Int32 会溢出成另一个数 ✗，而那是最难查的一种「看起来存进去了」✓）。
// **`MAX_SAFE_INTEGER` 拖着的判据是 `num-float-bits` / `number-constants`** ✓。
SetProperty(vm.Room(), NeverCall, table, numberObject,
  Value.FromString(table.CreateString(Units("MAX_SAFE_INTEGER"))), Value.FromDouble(9007199254740991));
SetProperty(vm.Room(), NeverCall, table, numberObject,
  Value.FromString(table.CreateString(Units("MIN_SAFE_INTEGER"))), Value.FromDouble(-9007199254740991));
SetProperty(vm.Room(), NeverCall, table, numberObject,
  Value.FromString(table.CreateString(Units("EPSILON"))), Value.FromDouble(2.220446049250313e-16));
SetProperty(vm.Room(), NeverCall, table, numberObject,
  Value.FromString(table.CreateString(Units("MAX_VALUE"))), Value.FromDouble(1.7976931348623157e308));
SetProperty(vm.Room(), NeverCall, table, numberObject,
  Value.FromString(table.CreateString(Units("MIN_VALUE"))), Value.FromDouble(5e-324));
SetProperty(vm.Room(), NeverCall, table, numberObject,
  Value.FromString(table.CreateString(Units("POSITIVE_INFINITY"))), Value.FromDouble(Infinity));
SetProperty(vm.Room(), NeverCall, table, numberObject,
  Value.FromString(table.CreateString(Units("NEGATIVE_INFINITY"))), Value.FromDouble(-Infinity));
SetProperty(vm.Room(), NeverCall, table, numberObject,
  Value.FromString(table.CreateString(Units("NaN"))), Value.FromDouble(NaN));
const numberKey = Value.FromString(table.CreateString(Units("Number")));
SetProperty(vm.Room(), NeverCall, table, globals, numberKey, numberObject);
// **`Number.prototype` 与 `Boolean.prototype`**（第 150 轮）：与 `String.prototype` 同款 ✓——
// **挂的必须是 `protos.Number` / `protos.Boolean` 那一格** ✗（现造一个新对象的话，
// 原始值接收者那条路找不到它 ✓：`(1.5).toFixed(2)` 会报
// `unimplemented: calling a non-closure value` ✓——听起来像调用写错了 ✗）。
// **方法挂在原型上** ✓（与字符串那一族相同 ✓：`GetProperty` 对原始值接收者
// 从原型上找 ✓，`this` 仍然是那个原始值 ✓）。
SetProperty(vm.Room(), NeverCall, table, numberObject, NameValue(table, "prototype"),
  Value.FromObject(protos.Number));
SetProperty(vm.Room(), NeverCall, table, Value.FromObject(protos.Number), NameValue(table, "constructor"),
  numberObject);
SetProperty(vm.Room(), NeverCall, table, Value.FromObject(protos.Number),
  Value.FromString(table.CreateString(Units("toFixed"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(NumberToFixed, 0)));
SetProperty(vm.Room(), NeverCall, table, Value.FromObject(protos.Number),
  Value.FromString(table.CreateString(Units("toString"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(NumberToStringRadix, 0)));
// **`toPrecision` 与 `valueOf`**（第 182 轮）✓：与上面两个同一格原型 ✓
// （`toPrecision` 是 `toFixed` 的同族 ✓、`valueOf` 只是「返回接收者自己」✓）。
SetProperty(vm.Room(), NeverCall, table, Value.FromObject(protos.Number),
  Value.FromString(table.CreateString(Units("toPrecision"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(NumberToPrecision, 0)));
SetProperty(vm.Room(), NeverCall, table, Value.FromObject(protos.Number),
  Value.FromString(table.CreateString(Units("valueOf"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(NumberValueOf, 0)));
// **`toExponential`**（第 291 轮 ✓）：与 `toFixed` / `toPrecision` 同一格原型 ✓
//（三格同一张表 ✓、只差缺省位数与那个宿主调用 ✓，见号那一段 ✓）。
SetProperty(vm.Room(), NeverCall, table, Value.FromObject(protos.Number),
  Value.FromString(table.CreateString(Units("toExponential"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(NumberToExponential, 0)));
// **`String` 也是一个普通对象**（第 130 轮，与 `Array` / `Number` 同款 ✓），
// 上面挂**静态方法** `fromCharCode` ✓。
// **第 145 轮它同时能被调用** ✓：`String(x)` 与 `String.fromCharCode(65)` 一起成立 ✓
// （值模型那一格补上了 ✓，见 `heap.xl.md` 的 `AttachCallable` ✓）。
const stringObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(stringObject.Ref, StringCtor, 0);
const fromCharCodeKey = Value.FromString(table.CreateString(Units("fromCharCode")));
const fromCharCodeTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(StringFromCharCode, 0));
SetProperty(vm.Room(), NeverCall, table, stringObject, fromCharCodeKey, fromCharCodeTarget);
// **`String.fromCodePoint`**（第 275 轮 ✓）：与 `fromCharCode` **同一张对象**上再挂一格 ✓。
// **两者不是一回事** ✗（一个是码元、一个是码位 ✓，越界一个夹住一个抛 ✓）——
// 所以这一格**不能**指到上面那个号上顶替 ✗（指过去就是**静默**换语义 ✓，
// `String.fromCodePoint(0x1F600)` 会变成一个越界码元 ✗）。
const fromCodePointKey = Value.FromString(table.CreateString(Units("fromCodePoint")));
const fromCodePointTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(StringFromCodePoint, 0));
SetProperty(vm.Room(), NeverCall, table, stringObject, fromCodePointKey, fromCodePointTarget);
const stringKey = Value.FromString(table.CreateString(Units("String")));
SetProperty(vm.Room(), NeverCall, table, globals, stringKey, stringObject);
// **`String.prototype` / `Object.prototype`**（第 137 轮）：与 `Array` 同款 ✓
// （两个都是普通对象 ✓）。**`"x" instanceof String` 在 JS 里是 `false`** ✗——
// 原始值不是对象 ✓——所以这一格在 `instanceof` 上只对**装箱过的**字符串有意义 ✓，
// 而本仓不装箱 ✗：这一格今天的作用是「原型链有个正经的落点」✓（不是「字符串 instanceof」✓）。
SetProperty(vm.Room(), NeverCall, table, stringObject, NameValue(table, "prototype"),
  Value.FromObject(protos.String));
SetProperty(vm.Room(), NeverCall, table, Value.FromObject(protos.String), NameValue(table, "constructor"),
  stringObject);
// **`Boolean` 是这一族里最新的一格**（第 145 轮）：它原来**连全局名都不是** ✗
// （`GlobalNames` 里没有它 ✓ → 降级期就报 `name is not a local or a capture: Boolean` ✓）。
// **第 145 轮它没有 `prototype`、第 150 轮补上了** ✓：`Boolean.prototype` 在 JS 里是有的 ✓，
// 而 `true.toString()` 正要从那一格上找方法 ✓（本仓**仍然不装箱** ✗——
// `true instanceof Boolean` 在 JS 里本来就是 `false` ✓，
// 而 `new Boolean(true) instanceof Boolean` 那条路要装箱 ✗，与 `new String(1)` 同一条 ✓）。
const booleanObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(booleanObject.Ref, BooleanCtor, 0);
const booleanKey = Value.FromString(table.CreateString(Units("Boolean")));
SetProperty(vm.Room(), NeverCall, table, globals, booleanKey, booleanObject);
// **`Boolean.prototype` + `constructor` + `toString`**（第 150 轮）✓：
// 与 `String.prototype` / `Number.prototype` 同款 ✓——**挂的必须是 `protos.Boolean`** ✗
// （现造一个新对象的话，原始值接收者那条路找不到它 ✓）。
SetProperty(vm.Room(), NeverCall, table, booleanObject, NameValue(table, "prototype"),
  Value.FromObject(protos.Boolean));
SetProperty(vm.Room(), NeverCall, table, Value.FromObject(protos.Boolean), NameValue(table, "constructor"),
  booleanObject);
SetProperty(vm.Room(), NeverCall, table, Value.FromObject(protos.Boolean),
  Value.FromString(table.CreateString(Units("toString"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(BooleanToString, 0)));
// **`Boolean.prototype.valueOf`**（第 182 轮）✓：与 `Number.prototype.valueOf` 同一支实现 ✓。
SetProperty(vm.Room(), NeverCall, table, Value.FromObject(protos.Boolean),
  Value.FromString(table.CreateString(Units("valueOf"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(BooleanValueOf, 0)));
// **`Function` 与它的原型**（第 228 轮 ✓）——`FunctionCall` / `FunctionApply` / `FunctionBind`
// 三格就挂在这里 ✓。
//
// **它为什么现在才出现** ✗：`f.call(...)` 这条写法要两件事同时成立 ✓——
// ① 闭包身上有 `Proto` ✓（第 228 轮在 `vm.xl.md` 的 `MakeClosure` 补上了 ✓：
//    原来 `typeof greet.call` 给 `"undefined"` ✓，报的是 `calling a non-closure value` ✗）；
// ② `protos.Function` 上**真的挂着**那三格 ✓（这一处 ✓）。
// **两件缺一件都不行** ✗：只补①就是「找得到原型、原型上什么都没有」✓（还是 `undefined` ✓）。
//
// **`Function` 是「普通对象 + 可调用载荷」** ✓（与 `Array` / `Number` / `String` 同款 ✓）：
// 于是 `Function.prototype === Function.prototype` 成立 ✓、`typeof Function` 给 `"function"` ✓。
// **`new Function("…")` 不做** ✗（那是编译期的事 ✓）——载荷落在 `FunctionCtor` 那一格上，
// 而 `FunctionCtor` 在 `InvokeGlobal` 里**没有分支** ✓ ⇒ 调它报
// `unimplemented: builtin id 343` ✓（**响亮地说「没做」** ✓，不是静默给 `undefined` ✓）。
const functionObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(functionObject.Ref, FunctionCtor, 0);
const functionKey = Value.FromString(table.CreateString(Units("Function")));
SetProperty(vm.Room(), NeverCall, table, globals, functionKey, functionObject);
SetProperty(vm.Room(), NeverCall, table, functionObject, NameValue(table, "prototype"),
  Value.FromObject(protos.Function));
SetProperty(vm.Room(), NeverCall, table, Value.FromObject(protos.Function), NameValue(table, "constructor"),
  functionObject);
// **三格方法** ✓：`call` / `apply` / `bind` ✓——**隐藏挂** ✓（与 `Object.prototype` 那三格同一条
// 规矩 ✓：`for..in` 不该看见它们 ✓，而 `Object.keys(Function.prototype)` 在 JS 里是空数组 ✓）。
//
// **`BoundTargetKey` / `BoundThisKey` / `BoundArgsKey` 三格字符串也要造** ✓
// （它们是**属性名**，脚本看不见 ✓、也没有人会念出它们 ✓）——造在 `protos.Function` 上
// 是**故意的** ✗（`GetProperty` 从接收者沿链找 ✓，而 `bound` 那个对象的原型就是 `protos.Object` ✓，
// 根本到不了这里 ✓）。真正需要它们的是 `BoundCall` 那一支里那句
// `Value.FromString(BoundTargetKey)` ✓——**同一个句柄、同一张表的两处** ✓。
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Function),
  Value.FromString(table.CreateString(Units("call"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(FunctionCall, 0)));
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Function),
  Value.FromString(table.CreateString(Units("apply"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(FunctionApply, 0)));
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Function),
  Value.FromString(table.CreateString(Units("bind"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(FunctionBind, 0)));
// **`protos.Function` 三格方法** ✓ 与 **`protos.Generator.next`** ✓ 都在这一带挂上。
//
// **生成器那一格**（第 229 轮 ✓）：生成器对象**没有属性表** ✗（它就是 `HeapObject`
// 上那一格 `Generator` 载荷 ✓），所以 `it.next()` 里的 `next` 只能**沿原型链**找 ✓——
// `protos.Generator` 就是那一格 ✓（`InitProtos` 造的 ✓）。
// **挂的是一个「带可调用载荷的对象」** ✓：载荷号是 `GeneratorNextId` ✓，
// 而**引擎自己**认这个号 ✓（它不发回宿主 ✗，见 `vm.xl.md` 的 `IsGeneratorNext` ✓）。
// **为什么不把 `next` 做成一个普通宿主方法** ✗：走一步生成器要发 `iter_next` ✓，
// 那是**指令** ✓，宿主侧的内建调不到它 ✗。
const generatorNext = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(generatorNext.Ref, GeneratorNextId, 0);
SetProperty(vm.Room(), NeverCall, table, Value.FromObject(protos.Generator),
  Value.FromString(table.CreateString(Units("next"))), generatorNext);
// **`return` / `throw` 两格** ✓（第 313 轮 ✓）：与 `next` **同一个形状** ✓
//（带可调用载荷的对象 ✓、载荷号由引擎认 ✓）。
// **`throw` 那一格今天真的能用** ✓（引擎在挂起点抛出 ✓）；
// **`return` 那一格会响亮地抛** ✗（理由见号那一段 ✓——它要跑 `finally` 链，
// 而那条链是降级期的构造 ✓）。**挂上去比空着好** ✗：空着报的是
// `cannot call a non-closure value` ✓（听起来像「脚本写错了」✗），
// 挂上去报的是「还差什么」✓。
const generatorReturn = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(generatorReturn.Ref, GeneratorReturnId, 0);
SetProperty(vm.Room(), NeverCall, table, Value.FromObject(protos.Generator),
  Value.FromString(table.CreateString(Units("return"))), generatorReturn);
const generatorThrow = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(generatorThrow.Ref, GeneratorThrowId, 0);
SetProperty(vm.Room(), NeverCall, table, Value.FromObject(protos.Generator),
  Value.FromString(table.CreateString(Units("throw"))), generatorThrow);
// **同一批方法还要挂到异步生成器那一格上** ✓（第 320 轮 ✓）——**不能靠继承** ✗：
// 异步生成器的原型指 `Object` ✓（`props.xl.md` 写着理由 ✓：继承 `Generator` 会**顺带**
// 得到 `Symbol.iterator` ✗，而 JS 里异步生成器**没有**那一格 ✓——判据
// `c320-ex-generator-interface-shapes` 当场把它拦下来了 ✓）。
// **同一个实现、两处挂载** ✓：能力号与上面那三个对象**完全一样** ✓
//（`next` / `return` / `throw` 的语义两族本来就一致 ✓），所以这不是两份实现 ✗。
if (protos.AsyncGenerator > 0) {
  const asyncGeneratorProto = Value.FromObject(protos.AsyncGenerator);
  SetProperty(vm.Room(), NeverCall, table, asyncGeneratorProto,
    Value.FromString(table.CreateString(Units("next"))), generatorNext);
  SetProperty(vm.Room(), NeverCall, table, asyncGeneratorProto,
    Value.FromString(table.CreateString(Units("return"))), generatorReturn);
  SetProperty(vm.Room(), NeverCall, table, asyncGeneratorProto,
    Value.FromString(table.CreateString(Units("throw"))), generatorThrow);
}
// **`parseInt` / `parseFloat` 是全局函数** ✓（不是某个对象的方法 ✓）。
const parseIntKey = Value.FromString(table.CreateString(Units("parseInt")));
SetProperty(vm.Room(), NeverCall, table, globals, parseIntKey, parseIntTarget);
const parseFloatKey = Value.FromString(table.CreateString(Units("parseFloat")));
SetProperty(vm.Room(), NeverCall, table, globals, parseFloatKey, parseFloatTarget);
// **`queueMicrotask` 也是全局函数** ✓（第 332 轮 ✓）——与上面两个同一形状 ✓。
// **它的能力号在承诺那一段** ✗（`PromiseQueueMicrotask = 250` ✓）：那一支手上才有
// 「把一次调用排进微任务队列」那条通道 ✓（`schedule` ✓）——理由写在 `promise.xl.md` 那一段 ✓。
const queueMicrotaskKey = Value.FromString(table.CreateString(Units("queueMicrotask")));
SetProperty(vm.Room(), NeverCall, table, globals, queueMicrotaskKey,
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(PromiseQueueMicrotask, 0)));

const mathKey = Value.FromString(table.CreateString(Units("Math")));
const consoleKey = Value.FromString(table.CreateString(Units("console")));
const objectKey = Value.FromString(table.CreateString(Units("Object")));
const jsonKey = Value.FromString(table.CreateString(Units("JSON")));
SetProperty(vm.Room(), NeverCall, table, globals, mathKey, math);
SetProperty(vm.Room(), NeverCall, table, globals, consoleKey, consoleObject);
SetProperty(vm.Room(), NeverCall, table, globals, objectKey, objectObject);
SetProperty(vm.Room(), NeverCall, table, globals, jsonKey, jsonObject);
// **`Object.prototype`**（第 137 轮）：与 `Array` / `String` 同款 ✓（`Object` 也是普通对象 ✓）。
SetProperty(vm.Room(), NeverCall, table, objectObject, NameValue(table, "prototype"),
  Value.FromObject(protos.Object));
SetProperty(vm.Room(), NeverCall, table, Value.FromObject(protos.Object), NameValue(table, "constructor"),
  objectObject);
// **`Object.prototype.valueOf` / `toString`**（第 198 轮）✓：`ToPrimitive` 普通那一支的两步 ✓
//（`valueOf` 先 ✓、`toString` 后 ✓），挂的必须是 `protos.Object` ✗
//（现造一个新对象的话，普通对象那条原型链找不到它 ✓——与 `Number.prototype` 那条同一个坎 ✓）。
// **用 `SetHiddenProperty`** ✓（第 194 轮 ✓）：JS 里这两个方法本来就**不可枚举** ✓，
// 所以 `Object.keys({})` 必须还是空的 ✓——挂成普通属性的话它当场变成 2 ✗（**静默错值** ✗）。
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Object),
  Value.FromString(table.CreateString(Units("valueOf"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectValueOf, 0)));
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Object),
  Value.FromString(table.CreateString(Units("toString"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectToString, 0)));
// **`hasOwnProperty`**（第 209 轮 ✓）：与上面两格**同一条路** ✓（`Object.prototype` 上的方法 ✓、
// **隐藏**挂上 ✓——`Object.keys({})` 必须还是空的 ✓，挂成普通属性它当场变成 3 ✗，**静默错值** ✗）。
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Object),
  Value.FromString(table.CreateString(Units("hasOwnProperty"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectHasOwnProperty, 0)));
// **`isPrototypeOf`**（第 304 轮 ✓）：与上面三格**同一条路** ✓（`Object.prototype` 上的方法 ✓、
// **隐藏**挂上 ✓——`Object.keys({})` 必须还是空的 ✓）。**它与 `hasOwnProperty` 是同一族的两半** ✓：
// 一个只问**自己**那一格 ✓、一个问**整条链**上有没有某一格 ✓。
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Object),
  Value.FromString(table.CreateString(Units("isPrototypeOf"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectIsPrototypeOf, 0)));
// **`Object.create` / `Object.getPrototypeOf`**（第 209 轮 ✓）：与 `keys` / `values` 那几张
// **同一张对象** ✓（都是 `Object` 的静态方法 ✓），分派在 `InvokeGlobal` 里 ✓（那一支有 `table` ✓）。
SetProperty(vm.Room(), NeverCall, table, objectObject,
  Value.FromString(table.CreateString(Units("create"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectCreate, 0)));
SetProperty(vm.Room(), NeverCall, table, objectObject,
  Value.FromString(table.CreateString(Units("getPrototypeOf"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectGetPrototypeOf, 0)));
SetProperty(vm.Room(), NeverCall, table, objectObject,
  Value.FromString(table.CreateString(Units("getOwnPropertyNames"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectGetOwnPropertyNames, 0)));
// **`Object.getOwnPropertySymbols`**（第 288 轮 ✓）：与 `getOwnPropertyNames` **挨着挂** ✓
//（同一族、同一趟扫描、同一个 `417` 的号 ✓——放远了看不出它们是镜像 ✗）。
SetProperty(vm.Room(), NeverCall, table, objectObject,
  Value.FromString(table.CreateString(Units("getOwnPropertySymbols"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectGetOwnPropertySymbols, 0)));
SetProperty(vm.Room(), NeverCall, table, objectObject,
  Value.FromString(table.CreateString(Units("fromEntries"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectFromEntries, 0)));
// **`Object` 这个名字自己可以被调、也可以被 `new`** ✓（第 232 轮 ✓）：
// 它原来只是「一格普通对象 + 一堆静态方法」✗——于是 `Object({ a: 1 })` 报
// `calling a non-closure value` ✓、`new Object(null)` 报
// `calling an object as a constructor (this object is not callable)` ✓
// （判据 `global-array-object-ctors` 现场红的 ✓）。
// **补的就是这一句** ✓：给它挂上可调用载荷 ✓（与 `Array` / `String` / `Function` 同款 ✓）——
// 分派在 `InvokeGlobal` 的 `ObjectCtor` 那一支 ✓。
// **`AttachCallable` 落在那一格对象自己身上** ✓（不是 `protos.Object` 上 ✗）：
// 挂到 `protos.Object` 就是「所有普通对象都可调用」✗（**静默错值** ✓，而且整份脚本都受影响 ✓）。
table.AttachCallable(objectObject.Ref, ObjectCtor, 0);
const undefinedKey = Value.FromString(table.CreateString(Units("undefined")));
SetProperty(vm.Room(), NeverCall, table, globals, undefinedKey, Value.Undefined());
// **`NaN` / `Infinity` 也是全局对象上的属性**（第 149 轮）✓：与 `undefined` 同一条路 ✓——
// 它们是**只读**的 ✓（JS 里 `Infinity = 1` 在严格模式下抛 ✗），但这一层没有「只读」那一格 ✓，
// 所以照普通属性挂 ✓：**已知差异**写在明处 ✓（脚本给它们赋值在这里会成功 ✗）。
// 值本身是 `Float64` ✓（`NaN` 用 `Value.FromDouble(NaN)` ✓——与 `0 / 0` 算出来的**同一档** ✓）。
const nanKey = Value.FromString(table.CreateString(Units("NaN")));
SetProperty(vm.Room(), NeverCall, table, globals, nanKey, Value.FromDouble(NaN));
const infinityKey = Value.FromString(table.CreateString(Units("Infinity")));
SetProperty(vm.Room(), NeverCall, table, globals, infinityKey, Value.FromDouble(Infinity));
// **全局的 `isNaN` / `isFinite`**（第 149 轮）✓——与 `Number.isNaN` / `Number.isFinite`
// 是**两个**东西 ✓（那两个挂在上面的 `Number` 对象上 ✓），所以这里各挂一格 ✓。
SetProperty(vm.Room(), NeverCall, table, globals,
  Value.FromString(table.CreateString(Units("isNaN"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(IsNaN, 0)));
SetProperty(vm.Room(), NeverCall, table, globals,
  Value.FromString(table.CreateString(Units("isFinite"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(IsFinite, 0)));
// **百分号编解码四个名字**（第 311 轮 ✓）：与 `isNaN` / `isFinite` **同一条路** ✓
//（全局对象上的四个函数 ✓）——`GlobalNames` 那张名单里也有它们 ✓（**两边是同一份约定** ✓）。
const percentNames: string[] = ["encodeURI", "encodeURIComponent", "decodeURI", "decodeURIComponent"];
const percentIds: number[] = [EncodeURI, EncodeURIComponent, DecodeURI, DecodeURIComponent];
for (let i = 0; i < percentNames.length; i++) {
  SetProperty(vm.Room(), NeverCall, table, globals,
    Value.FromString(table.CreateString(Units(percentNames[i]))),
    Value.FromRef(ValueTag.HostRef, table.CreateHostRef(percentIds[i], 0)));
}
// **`globalThis` 指向那个环境对象自己**（第 149 轮）✓：`globalThis.Math === Math` ✓。
// **加它的直接原因是 `typeof` 那一格的新规矩** ✓：未声明的名字给 `"undefined"` ✓，
// 而 `globalThis` 在 Node 里是 `"object"` ✓——不补这一格就是一处**静默**的不一致 ✗。
SetProperty(vm.Room(), NeverCall, table, globals,
  Value.FromString(table.CreateString(Units("globalThis"))), globals);
// **`Map` 从「宿主引用」改成「带可调用载荷的对象」** ✓（第 327 轮 ✓）：
// 它现在要挂一格**静态方法**（`Map.groupBy` ✓），而**宿主引用没有属性表** ✗
// ——与第 183 轮 `Symbol` 那一条**一字不差** ✓（那一次是为了挂知名符号 ✓）。
// **两件事都不受影响** ✓：`new Map()` 照旧走 `Op.New` 的宿主那一条 ✓
//（`IsHostCallable` **两种壳都认** ✓，第 145 轮 ✓）；`instanceof Map` 照旧走登记表 ✓
//（`RegisterConstructorProto` 按**号**认 ✓，与壳无关 ✓）。六道门一起验过 ✓。
const mapObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(mapObject.Ref, MapCtor, 0);
const mapKey = Value.FromString(table.CreateString(Units("Map")));
SetProperty(vm.Room(), NeverCall, table, globals, mapKey, mapObject);
// **`Map.groupBy`** ✓（第 327 轮 ✓）：挂在**那个对象**上 ✓（它现在有属性表了 ✓）。
// **号是 660** ✗（不是 `611` ✓）：`600..610` 满了 ✓、`611..659` 是 `Set` 的 ✓——见 `map.xl.md`。
SetProperty(vm.Room(), NeverCall, table, mapObject,
  Value.FromString(table.CreateString(Units("groupBy"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(MapGroupBy, 0)));
// `Set` 同样是**宿主引用值**（`new Set()` 走 `Op.New` 的宿主构造函数那条分支）。
const setKey = Value.FromString(table.CreateString(Units("Set")));
const setTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(SetCtor, 0));
SetProperty(vm.Room(), NeverCall, table, globals, setKey, setTarget);
// `Symbol` 从**宿主引用**改成**带可调用载荷的对象**（第 183 轮）✓：
// 它现在要挂**知名符号**（`Symbol.iterator` 等 ✓），而**宿主引用没有属性表** ✗
// （与第 137 轮 `Error.prototype` 那条同一个坎 ✓——那边靠 `Protos` 绕开了 ✓，
// 而 `Symbol.iterator` 是一格**普通属性** ✓，绕不开 ✓）。
// `AttachCallable` 的语义是「对象照旧是对象，只是多了一格能被调」✓（第 145 轮 ✓），
// 所以 `Symbol("x")` 照旧走 `Op.Call` ✓、`typeof Symbol` 照旧给 `"function"` ✓
//（第 145 轮把 `typeof` 那一格改成认「能被调」✓）。
const symbolObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(symbolObject.Ref, SymbolCtor, 0);
const symbolKey = Value.FromString(table.CreateString(Units("Symbol")));
SetProperty(vm.Room(), NeverCall, table, globals, symbolKey, symbolObject);
// **`Symbol.for` / `Symbol.keyFor` 两格**（第 277 轮 ✓）：与 `String.fromCharCode` 那几格一样，
// **挂在那个全局对象上** ✓（`Symbol` 既是一个普通对象 ✓、又带一格可调用载荷 ✓——
// 两件事同时成立，见第 145 轮 ✓）。
// **注册表不在这一层** ✗：它挂在 `protos.WellKnownSymbols` 上 ✓——
// `InvokeGlobal` 手里只有 `protos` ✓（这一层没有模块级可变量 ✓），
// 所以「记着谁注册过」这件事只能落在**够得着的那个对象**上 ✓（理由见 `SymbolFor` 那一段 ✓）。
const symbolStaticNames: string[] = ["for", "keyFor"];
const symbolStaticIds: number[] = [SymbolFor, SymbolKeyFor];
for (let i = 0; i < symbolStaticNames.length; i++) {
  const symbolStaticKey = Value.FromString(table.CreateString(Units(symbolStaticNames[i])));
  const symbolStaticTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(symbolStaticIds[i], 0));
  SetProperty(vm.Room(), NeverCall, table, symbolObject, symbolStaticKey, symbolStaticTarget);
}
// **知名符号**：每个名字造**一次**✓——JS 要求 `Symbol.iterator` **永远是同一个值** ✓
//（`o[Symbol.iterator] === o[Symbol.iterator]` ✓、拿它当键的两处要落到同一格 ✓）。
// 描述按 JS 的写法给全名 ✓（`Symbol.iterator` 的描述就是 `"Symbol.iterator"` ✓）。
// **`vm.Room()` 先落进一个局部量**（第 183 轮）✓：直接写 `vm.Room()(…)`（**调用一个调用结果** ✓）
// 会踩中投影里那一族还没修的形状 ✓——本仓自己的规范文件也是 `cases:tsast` 的**语料** ✓，
// 所以那种写法会让尺子当场变红 ✓（实测 ✓：`Room` 被投成一个**零宽**的 `Identifier` ✓）。
// 那一格与第 179 轮 `xs[0]()` 是同一族 ✓（「调用调用结果」✓），记在台账里 ✓。
const room = vm.Room();
for (const wellKnown of ["iterator", "asyncIterator", "toPrimitive", "hasInstance", "toStringTag"]) {
  const fullName = "Symbol." + wellKnown;
  if (!room(ObjectCharge + ValueCharge + CodeUnitCharge * fullName.length)) {
    throw new Error("out of room");
  }
  const described = table.CreateString(Units(fullName));
  const symbol = Value.FromRef(ValueTag.Symbol, table.CreateSymbol(described));
  SetProperty(room, NeverCall, table, symbolObject,
    Value.FromString(table.CreateString(Units(wellKnown))), symbol);
}
// **同一批符号再挂到「知名符号表」上**（第 184 轮）✓：迭代协议那一侧
// （`install.xl.md` 的 `GetIterator` ✓）只拿得到 `protos` ✓，所以给它一个
// **按名字取符号**的落点 ✓——引擎不必认识 `Symbol` 这六个字 ✓。
const wellKnownTable = NewPlainObject(room, table, protos);
for (const wellKnown of ["iterator", "asyncIterator", "toPrimitive", "hasInstance", "toStringTag"]) {
  const symbolKey = Value.FromString(table.CreateString(Units(wellKnown)));
  SetProperty(room, NeverCall, table, wellKnownTable, symbolKey,
    GetProperty(room, NeverCall, protos, table, symbolObject, symbolKey));
}
protos.WellKnownSymbols = wellKnownTable.Ref;
// **`Symbol.toStringTag` 要挂到那三族的原型上** ✓（第 229 轮 ✓）：
// `Object.prototype.toString.call(new Map())` 在 JS 里是 `"[object Map]"` ✓，
// 而那一格**正是** `Map.prototype[Symbol.toStringTag] = "Map"` 供的 ✓
// （`Date` / `Set` 同理 ✓）。**不挂就是「响亮地抛」** ✓（`ObjectTagOf` 那条 ✓）——
// 那一抛是对的 ✓（不知道就不猜 ✓），可这一格是**有确定答案**的 ✓，所以做出来 ✓。
//
// **挂成普通属性** ✓（JS 里 `Map.prototype[Symbol.toStringTag]` 是**不可写但可枚举为假** ✓；
// 本仓没有「不可枚举的符号键」那一档的判据能证 ✓，而且枚举那几条路
// **本来就跳过符号键** ✓——见 `Object.keys` / `JSON` / `for..in` 那几处 ✓，
// 所以 `Object.keys(new Map())` 不会因为这一挂而变 ✗）。
const toStringTagKey = GetProperty(room, NeverCall, protos, table, wellKnownTable,
  Value.FromString(table.CreateString(Units("toStringTag"))));
const tagTargets = [protos.Map, protos.Set, protos.Date];
const tagNames = ["Map", "Set", "Date"];
for (let i = 0; i < tagTargets.length; i++) {
  SetProperty(room, NeverCall, table, Value.FromObject(tagTargets[i]), toStringTagKey,
    Value.FromString(table.CreateString(Units(tagNames[i]))));
}
// **`Array.prototype[Symbol.iterator]`** ✓（第 308 轮 ✓）——JS 里它就是 `values` ✓
//（**同一个函数对象** ✓：`[][Symbol.iterator] === [].values` ✓），所以**指到同一格能力号** ✓
//（`ArrayValues` ✓）——**同一件事不写第二份实现** ✓。
//
// **为什么这一格一直缺着** ✗：引擎的迭代（`for..of` ✓、展开 ✓、`Array.from` ✓）走的是
// **指令**那条路 ✓（`iter_new` / `iter_next` ✓），**根本不问这一格** ✓——
// 于是 `[...xs]` 一直是对的 ✓，而**显式取出来自己调**（`xs[Symbol.iterator]()` ✓）
// 报 `cannot call a non-closure value` ✗。那句话听起来像「迭代器这一套还没做」✗，
// 真相是**只是没人往这一格挂东西** ✓（与第 274 轮那七格、第 304 轮 `toSpliced` 同一形状 ✓）。
// 判据 `c304-std-symbol-iterator-manual` ✓ / `c291-array-iterator-protocol-manual` ✓ /
// `c305-std-array-iterator-symbol-method` ✓ 三条一起拖着它 ✓。
//
// **挂的位置与上面那三族的 `toStringTag` 同一处** ✓：`protos.WellKnownSymbols` 刚填好 ✓、
// 键就是那张表里那个句柄 ✓。**键必须走那张表** ✗（不能现造一个符号 ✓）：
// 符号在属性查找里是**按句柄**比的 ✓（`props.xl.md` ✓），三处拿到的必须是**同一个** ✓
// ——知名符号的规矩就是「只造一次」✓（上面那一段写着 ✓）。
const arrayIteratorKey = GetProperty(room, NeverCall, protos, table, wellKnownTable,
  Value.FromString(table.CreateString(Units("iterator"))));
if (arrayIteratorKey.Tag === ValueTag.Symbol) {
  SetProperty(room, NeverCall, table, Value.FromObject(protos.Array), arrayIteratorKey,
    Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ArrayValues, 0)));
}
// **异步生成器那一格：`Symbol.asyncIterator`** ✓（第 320 轮 ✓）——与上面那一条
// **同一个形状** ✓（同一个知名符号表取键 ✓、挂一格宿主引用 ✓），差的是**挂在别的原型上** ✓。
// **只挂 `AsyncGenerator`** ✗：同步生成器**没有**这一格（JS 里那里是 `TypeError` ✓）——
// 挂到 `Generator` 上就是**说谎** ✓（判据 `c305-ex-async-generator-interface-type` ✓
// 只问异步那一侧 ✓，而「同步那侧不该有」这一条**写在注释里** ✓：矩阵里还没有那一格 ✓，
// 补一条是下一轮的事 ✓）。
const asyncIteratorKey = GetProperty(room, NeverCall, protos, table, wellKnownTable,
  Value.FromString(table.CreateString(Units("asyncIterator"))));
if (asyncIteratorKey.Tag === ValueTag.Symbol && protos.AsyncGenerator > 0) {
  SetProperty(room, NeverCall, table, Value.FromObject(protos.AsyncGenerator), asyncIteratorKey,
    Value.FromRef(ValueTag.HostRef, table.CreateHostRef(AsyncGeneratorSelf, 0)));
}
// **同步生成器那一格：`Symbol.iterator`** ✓（第 320 轮 ✓，做上面那一格时顺手量到的 ✓）
// ——挂 `Generator` ✓（异步生成器**继承**它 ✓，所以两族都有 ✓ ✓，与 JS 一致 ✓）。
const generatorIteratorKey = GetProperty(room, NeverCall, protos, table, wellKnownTable,
  Value.FromString(table.CreateString(Units("iterator"))));
if (generatorIteratorKey.Tag === ValueTag.Symbol && protos.Generator > 0) {
  SetProperty(room, NeverCall, table, Value.FromObject(protos.Generator), generatorIteratorKey,
    Value.FromRef(ValueTag.HostRef, table.CreateHostRef(GeneratorSelf, 0)));
}
// `Date` 是一个**普通对象**（像 `Math` 一样），上面挂 `now`——
// 而 `now` 指向的是**宿主**要回答的能力号（见 `ClockNow` 的说明：建库层没有时钟）。
// **第 145 轮它同时是构造函数** ✓：`new Date(ms)` 不再靠降级层那条特例 ✓
// （`const D = Date; new D(0)` 现在也对 ✓），而 `Date.now()` 照旧走属性 ✓。
const dateObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(dateObject.Ref, DateCtor, 0);
const nowKey = Value.FromString(table.CreateString(Units("now")));
const nowTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ClockNow, 0));
SetProperty(vm.Room(), NeverCall, table, dateObject, nowKey, nowTarget);
// **`Date.UTC`**（第 280 轮 ✓）：与 `now` **同一张对象**上再挂一格 ✓
//（`Date` 既是对象 ✓、也能被 `new` ✓——两件事同时成立，见第 145 轮 ✓）。
const utcKey = Value.FromString(table.CreateString(Units("UTC")));
const utcTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(DateUTC, 0));
SetProperty(vm.Room(), NeverCall, table, dateObject, utcKey, utcTarget);
// **`Date.parse`**（第 293 轮 ✓）：与 `now` / `UTC` **同一张对象**上再挂一格 ✓
//（`Date` 既是对象 ✓、也能被 `new` ✓——两件事同时成立，见第 145 轮 ✓）。
const dateParseKey = Value.FromString(table.CreateString(Units("parse")));
const dateParseTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(DateParse, 0));
SetProperty(vm.Room(), NeverCall, table, dateObject, dateParseKey, dateParseTarget);
const dateKey = Value.FromString(table.CreateString(Units("Date")));
SetProperty(vm.Room(), NeverCall, table, globals, dateKey, dateObject);
// **`Promise`**（第 185 轮 ✓）：值由 `promise.xl.md` 造 ✓（那里有四个静态方法 ✓），
// 这里只负责**挂进全局对象** ✓——与 `Date` 那一格同一个形状 ✓
// （既是对象 ✓、也能被 `new` ✓）。
const promiseKey = Value.FromString(table.CreateString(Units("Promise")));
SetProperty(vm.Room(), NeverCall, table, globals, promiseKey, BuildPromise(vm, protos));
// **`Map` / `Set` / `Date` / `Array` 四格的 `prototype` 与 `constructor`**（第 138 轮）✓：
// `new Map() instanceof Map` 要靠原型那一格 ✓，`new Map().constructor === Map` 要靠
// `constructor` 那一格 ✓——**两格都要** ✗（只补一格就是「一半对」✓）。
//
// **`constructor` 里必须放「全局那一份」那个值** ✗：内建函数的相等是**按句柄比**的 ✓
// （`RtCmpEqStrict` 对 `HostRef` 比的是载荷句柄 ✓）——现造一个新句柄的话，
// `new Map().constructor === Map` 给 **`false`** ✗（判据现场就是这么红的 ✓）。
// 所以这里用的是上面那几个变量 **本身** ✓，不是再造一个 ✓。
SetProperty(vm.Room(), NeverCall, table, Value.FromObject(protos.Map), NameValue(table, "constructor"), mapObject);
// **`Map.prototype` 也要挂上** ✓（第 327 轮 ✓）：`Map` 现在是**对象** ✓，
// 而 `instanceof` 走「读右边的 `prototype` 属性」那一条 ✓（登记表现在只给宿主引用值用 ✗）——
// 不挂的话 `m instanceof Map` 报 `the right side of instanceof has no prototype object` ✓
//（**响亮的错** ✓，但它是一处**回归** ✗：改壳之前那一条是好的 ✓，
// 所以六道门里 `runtime:check` 与覆盖矩阵一起验过 ✓）。与 `Date` 那一行**同一个形状** ✓。
SetProperty(vm.Room(), NeverCall, table, mapObject, NameValue(table, "prototype"), Value.FromObject(protos.Map));
SetProperty(vm.Room(), NeverCall, table, Value.FromObject(protos.Set), NameValue(table, "constructor"), setTarget);
SetProperty(vm.Room(), NeverCall, table, dateObject, NameValue(table, "prototype"), Value.FromObject(protos.Date));
SetProperty(vm.Room(), NeverCall, table, Value.FromObject(protos.Date), NameValue(table, "constructor"), dateObject);
return globals;
```
