# dependencies
```xl
import { Value, ValueTag } from "../../runtime/value.xl.md"
import { HeapTable, ObjectCharge, ValueCharge, CodeUnitCharge, PropertyKind, HoleCharge, Property, PropertyCharge, PropertyFlagEnumerable, PropertyFlagWritable, PropertyFlagConfigurable, PropertyFlagsAll } from "../../runtime/heap.xl.md"
import { RoomChecker, RtToBoolean, MakeNumber, RtChainHas, RtSetProto, ToNumberOf, ToPrimitiveOf, ToPrimitiveDefault, ToPrimitiveString, IsCallableValue, SameValue, FunctionSourceText } from "../../runtime/rt.xl.md"
import { HostUnitsText, NumberFromHostText, NumberToHostText, NumberToJsText } from "../../runtime/host-text.xl.md"
import { SetProperty, SetHiddenProperty, CreateDataProperty, GetProperty, DefineAccessor, NativeCall, CallFailed, Protos, NewPlainObject, NewPlainArray, FindProperty, KeyMatches, NeverRoom, DeleteProperty, ArrayIndexAt } from "../../runtime/props.xl.md"
import { Vm } from "../../runtime/vm.xl.md"
import { Units, NeverCall, IntArgOr, IntArgStrict, IntOfNumberStrict, NumArgOr, ArrayIsArray, ArrayFrom, ArrayFromAsync, ArrayOf, ArrayValues, AttachArrayIterator, ArrayLikeLength, ArrayLikeAt } from "./array.xl.md"
import { StringFromCharCode, StringFromCodePoint, StringRaw } from "./string.xl.md"
import { JsTextUnits, ValueUnits, ValueText, ToStringOfObject, BoxKey, UnwrapBox, PropertyKeyValue } from "./text.xl.md"
import { InspectText, DateMarker, IsArgumentsValue } from "./inspect.xl.md"
import { MapCtor, MapGroupBy, MapEntries, NameValue, ReadOwn, WeakMapCtor } from "./map.xl.md"
import { SetCtor, SetValues, WeakSetCtor } from "./set.xl.md"
import { BuildPromise, PromiseQueueMicrotask, PromiseThen, PromiseCatch, PromiseFinally } from "./promise.xl.md"
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

**为什么粒度要定在「行」上**：原来是「一个实参调一次 sink」，那样宿主**再也拼不回行**——
`console.log('a', 1)` 与 `console.log('a'); console.log(1)` 在它眼里**一模一样**；
而「把 `.ts` 直接跑起来」的命令行拿 stdout 与 `node` 逐字节对拍时，这个区别就是全部。

# const MathFloor:int = 201

`Math.floor` 的能力号（全局段从 200 起，与数组 1..99、字符串 100..199 分开）。

# const MathAbs:int = 202

# const MathMax:int = 203

# const MathMin:int = 204

# const MathRound:int = 205

`Math.round` / `ceil` / `trunc` / `sign`（第 120 轮补）。

**这一批的共同点：结果是整数**——所以它们能安全地落进 `MathResult`（整的给 Int32）。

# const MathSqrt:int = 211

`Math.sqrt`（第 124 轮补）。

**第 120 轮时它被挡在门外**：结果多数是**非整数**，而 `Float64` 当时**没有文本形态**
——「算得出、打不出」是给人挖坑。**第 124 轮把文本形态做了**
（`text.xl.md`：最短往返十进制），于是它与 `pow` 一起放行。

# const MathPow:int = 212

`Math.pow(x, y)`——**两个实参**（与 `max` / `min` 同一形状）。

# const MathCeil:int = 206

# const MathTrunc:int = 207

# const MathSign:int = 208

# const MathLog:int = 213

`Math.log` / `exp` / `cbrt` / `hypot`（第 206 轮补）。

**它们与 `sqrt` / `pow` 是同一档**：结果多数是**非整数**，所以当年和 `sqrt` 一起
被挡在门外（「算得出、打不出」）——第 124 轮把浮点的文本形态做出来之后才谈得上放行。
这一批拖着的判据是 `math-logs-constants`（`Math.log(1)` / `exp(0)` 这些）。

# const MathExp:int = 214

# const MathCbrt:int = 215

# const MathHypot:int = 216

**第 275 轮补的十格**（号**开一段新的**：`350..359`）。

**为什么不接着 201..219 往下排**：那一段的下一个号是 **`220`**，
而它已经是 **`StringCtor`** 了（构造器那一族占着 `220..225`）——
**号是跨目标的契约**（见 `ArrayAt` 那一段的教训），所以不能挤。
`350..359` 这一段是**空的**（`330..345` 是原始值原型那一族，`346..349` 没人用），
放在这里读起来也顺：**「第 275 轮补的第二批 Math」**。

**这一批的共同点与 `201..216` 那一段不同**：那一段里 **多数结果是整数**
（`floor` / `round` / `ceil` / `trunc` / `sign`），所以能落在「整的给 `Int32`」那条口径上；
而这十格**结果几乎全是浮点**（`imul` / `clz32` 除外）——
它们能放行靠的是**第 124 轮那条浮点文本形态**（「算得出、打不出」的坑那时才填上）。

**这十格全是第 273 轮普查量到的**：判据 `math-imul-clz32` 与 `math-hypot-and-roots`
两条在报 `cannot call a non-closure value`——也就是**那一格根本没装**。

# const MathImul:int = 350

**`Math.imul(a, b)`**（第 275 轮）——**32 位有符号整数乘法**。
**它不是 `a * b`**：`Math.imul(0xffffffff, 5)` 是 `-5`（乘的是**低 32 位**），
而 `a * b` 给 `21474836475`——**这是两种不同的语义**，
所以这一格**不能**用宿主那个 `imul` 之外的任何写法顶替。

# const MathClz32:int = 351

**`Math.clz32(x)`**（第 275 轮）——**前导零个数**（32 位无符号）。
**`Math.clz32(0)` 是 `32`**（全都零），而 `Math.clz32(1)` 是 `31`。

# const MathFround:int = 352

**`Math.fround(x)`**（第 275 轮）——**最近的那个 f32**。
**它是本仓唯一一处 f32**：`0.1` 走一趟回来是 `0.10000000149011612`——
所以这一格**不能**照着「原样交出去」写（那样 `Math.fround(0.1)` 会**静默**给 `0.1`）。

# const MathExpm1:int = 353

# const MathSinh:int = 354

# const MathCosh:int = 355

# const MathTanh:int = 356

# const MathLog2:int = 357

# const MathLog10:int = 358

# const MathLog1p:int = 359

**`expm1` / `sinh` / `cosh` / `tanh` / `log2` / `log10` / `log1p`**（第 275 轮）——
**七个单实参的数学函数**，与 `log` / `exp` / `cbrt` 同一档：
结果多为非整数，交给宿主那一格、走 `MathResult`。

**它们为什么值得单独列出来**：每一个都有一处「**照着近义函数写就会错**」的地方——
`log2(8)` 是 `3`（不是 `log(8) / log(2)` 那种自己算的近似，
判据里 `Math.log2(8)` 与 `3` 是**逐字节**比的）；`expm1(0)` 是 `0`
（不是 `exp(0) - 1`——那个在**很小的入参**上会丢掉全部有效位）；
`log1p(0)` 同理。**所以七格一律交给宿主那一格**（一个一个转调），
**不自己用别的函数凑**。

# const MathSin:int = 360

# const MathCos:int = 361

# const MathTan:int = 362

# const MathAsin:int = 363

# const MathAcos:int = 364

# const MathAtan:int = 365

# const MathAtan2:int = 366

**三角七格**（第 288 轮）——号开在 `360..366`（`350..359` 第 275 轮已用）。

# const MathAsinh:int = 372

# const MathAcosh:int = 373

# const MathAtanh:int = 374

**`asinh` / `acosh` / `atanh`**（第 372 轮）——**双曲函数的反函数三格**，
与 `sinh` / `cosh` / `tanh`（`354..356`）**同一族的另一半**。

**为什么它们拖到第 372 轮才被量到**：理由与第 288 轮那三角七格**一字不差**——
第 287 轮的加宽铺的是「已经想到的形状」，而第 371 轮那批新语料第一次写了
`Math.asinh(0)` ⇒ 当场报 `cannot call a non-closure value`（**没装**）。
**号开在 `372..374`**（`367..371` 是 `Number` / `Date` 那两段用掉的，
而 `350..366` 是数学那两段——**号只追加、不复用**）。

**这三格与小十格、三角七格是同一条口径**：**一律交给宿主那一格**，
一个字都不自己凑（`atanh(0)` 是 `0`、`acosh(1)` 是 `0`、
`asinh(0)` 是 `0`——而 `acosh(x)` 写成 `log(x + sqrt(x*x - 1))` 在大入参上会丢有效位）。


**为什么它们拖到第 288 轮才被量到**：这一族**不在**第 273 轮那份普查的候选里
（那份普查按「已经想到的形状」铺），而第 287 轮的加宽把 `Math.sin` / `Math.cos` / `Math.tan`
写进了一条用例 ⇒ 它当场报 `cannot call a non-closure value`（**七格一格都没装**）。

**七个都交给宿主那一格**（`Math.sin` … `Math.atan2`）——与第 275 轮那十格同一条纪律：
`asin` / `acos` / `atan` **不是**「用别的函数凑出来的」（凑出来的在边界上会差最后一位，
而判据是**逐字节**比）。`atan2(y, x)` 是**两个实参**那一档（与 `pow` / `imul` 同形）。

**`Math.sin` 这一族是「每天都在用」的那一档**（角度换算、波形、几何），
而它们的缺席是**响亮地抛**——比第 287 轮那七条静默错值好查得多。

# const NumberIsSafeInteger:int = 325

**`Number.isSafeInteger(x)`**（第 288 轮）——号在 `320..324` 之后的**下一个**。

**它与 `isInteger` 只差一个边界**：`2**53 - 1` 是 `true`、`2**53` 是 **`false`**
（`isInteger(2**53)` 给 `true`——那是**整数**，只是**不安全**）。
**所以判据是两句**：「是整数」 **且** `|x| <= 2^53 - 1`——
`isInteger` 那一段的那一句**照用**（不另写一份：第二份迟早与第一份走偏）。

# const ObjectGetOwnPropertySymbols:int = 417

**`Object.getOwnPropertySymbols(o)`**（第 288 轮）——号在 `411..416` 之后的**下一个**。
**它是 `Object.getOwnPropertyNames` 的**镜像****：同一趟扫描、
同一处「内部标记不算自有属性」的过滤，**只把「键是不是字符串」翻成「键是不是符号」**
（属性表里符号键那一格是 `ValueTag.Symbol`，见 `props.xl.md` 的 `SamePropertyKey`）。
**次序照属性表的次序**（JS 也是插入序——符号键**不参与**整数键优先那一套）。

# const EncodeURIComponent:int = 422

**`encodeURIComponent(s)`**（第 311 轮）——号**追加在全局段表尾**（`421` 之后）。

**四个名字一次做完**（`encodeURI` / `encodeURIComponent` / `decodeURI` /
`decodeURIComponent`）：它们是**同一件事的两个参数**——「哪些字符留着」那张表
差十一个保留字符、别的算法一个字都不差。**写四份就是四处会漂**。

**为什么它们是「能证明」的那一档**：UTF-8 的字节规则 与那张百分号表
都由标准定死（与 `Math.pow` 那类「各目标可能差最后一位」**不是**一回事）。

# const EncodeURI:int = 423

**`encodeURI(s)`**（第 311 轮）——与 `encodeURIComponent` **共用同一支实现**，
只多留 `; , / ? : @ & = + $ #` 这十一个保留字符（见 `UriKeep`）。

# const DecodeURIComponent:int = 424

**`decodeURIComponent(s)`**（第 311 轮）——按 UTF-8 把 `%XX` 串解回码点。

# const DecodeURI:int = 425

**`decodeURI(s)`**（第 311 轮）——与 `decodeURIComponent` **共用同一支实现**，
差别只有一处：解出来的**保留字符原样吐回 `%XX`**（JS 的口径——
`decodeURI("%2F")` 是 `"%2F"`，而 `decodeURIComponent("%2F")` 是 `"/"`）。

# const ObjectIs:int = 411

**`Object.is(a, b)`**（第 275 轮）——号在 `Object` 那一段的**下一个**（`401..410` 已用）。

**它要的是第三张判等表**：`Object.is` 用的是 **SameValue**，
与 `===` 差 `NaN`、与 `SameValueZero` 差 `±0`——
两处都翻，所以**任何一张现成的表都不对**（见 `rt.xl.md` 的 `SameValue`）。

**第 276 轮补的五格**（`Object` 那一段的下五个号 `412..416`）——
它们围着**同一件事**转：**描述符**（descriptor）。
`getOwnPropertyDescriptor` 是 `defineProperty` 的**反面**（读一格 → 一个描述符对象）、
`defineProperties` 是它的**复数版**（一趟写多格）、
`seal` / `isSealed` / `isFrozen` 是**标志位的三种问法**。

**它们是第 273 轮普查量到的**：判据 `object-getownpropertydescriptor` 与
`object-seal-and-defineProperties` 两条都在报 `cannot call a non-closure value`——
即**那几格根本没装**（`defineProperty` 与 `freeze` 一直是好的）。

# const ObjectGetOwnPropertyDescriptor:int = 412

**`Object.getOwnPropertyDescriptor(对象, 键)`**（第 276 轮）——把那一格读成`{ value, writable, enumerable, configurable }`，**没有那一格给 `undefined`**。

# const ObjectGetOwnPropertyDescriptors:int = 428

**`Object.getOwnPropertyDescriptors(对象)`**（第 324 轮）——**一次拿全表**，
号**追加在全局段那个 `Object` 段之后的第一格空号**（`421` 之后空了一段，
`426` / `427` 是生成器自己那两格——**号只追加、不复用**）。

**它一个字的判断都不重写**：逐格**复用单数那一支**（`InvokeGlobal` 递归调同一张分派，
`ObjectGetOwnPropertyDescriptor`）——**描述符的形状只有那一处答案**
（数据属性四格 / 访问器两格 / 数组元素与字符串下标的标志不一样 / `length` 第三种，
第 276 / 304 轮全是**实测**出来的）。**再抄一遍就是第二处会漂的答案**，
而漂的表现是「单数对、复数错」（第 284 轮那个计算键写三遍就是这种账）。

**键那一趟也复用**：自有**字符串键**与自有**符号键**各走现成的那两支
（`getOwnPropertyNames` / `getOwnPropertySymbols`，第 214 / 288 轮）——
于是「整数键在前、`length` 在不在里面」
这些**已经定过的口径**不必再想一遍。
（第 333 轮起第三样没了：那个 `__sealed` 内部标记属性搬去了堆上的一格布尔
——`heap.xl.md` 的 `Extensible`，它本来就不该是一个属性。）

# const ObjectHasOwn:int = 429

**`Object.hasOwn(对象, 键)`**（第 372 轮）——`hasOwnProperty` 的**静态版**：
同一个问法（**只问自己那一格**，原型链上的不算），
而**接收者从 `self` 换成第一个实参**（`Object.hasOwn(o, "k")`）。

**为什么拖到第 372 轮才被量到**：它是 **ES2022** 才进标准的，
第 273 轮那份普查按「已经想到的形状」铺 ⇒ 没写上；而第 371 轮那批新语料里
`Object.hasOwn` 一口气出现在 **3 条**里 ⇒ 当场报 `cannot call a non-closure value`（**没装**）。

**它不另写一份「自有属性」的判据**：**逐格复用 `getOwnPropertyDescriptor` 那一支**
（与 `getOwnPropertyDescriptors` 第 324 轮那条**同一个做法**）——
于是「数组元素算自有、字符串下标算自有、`length` 算自有、
洞与越界不算、函数上的 `length` / `name` 也算」**一条都不必在这里再写一遍**
（抄一遍就是第二处会漂的答案，而漂出来的是「单数对、静态版错」）。

# const ObjectPropertyIsEnumerable:int = 430

**`Object.prototype.propertyIsEnumerable(键)`**（第 372 轮）——接收者是 `self`、
只收**一个**键实参；问的是「**那一格存在、而且可枚举**吗」。

**它落在谁的旁边是要紧的**：号紧挨着 `Object.hasOwn`（`429`）——
两格是**同一个问法的两半**（一个问「在不在」、一个问「在而且可枚举吗」），
而 `hasOwnProperty` / `isPrototypeOf` 那两格（`338` / `421`）就是这条路的先例。

**它同样复用 `getOwnPropertyDescriptor`**：拿到描述符之后只读**一格**（`enumerable`）——
三套标志（数组元素三个真、字符串下标不可写不可配、`length` 不可枚举不可配）
**已经在那一处定过了**。**函数上的 `length` / `name`** 是唯一要在这里手工认的一档
（它们**不在属性表里**，见 `getOwnPropertyDescriptor` 那一支同一句话）：JS 里它们是
**自有、不可枚举** ⇒ `hasOwn` 真、`propertyIsEnumerable` 假。

# const MathF16Round:int = 431

**`Math.f16round(x)`**（第 703 轮）——**最近的那个 f16**（IEEE 754 binary16）。

**为什么拖到今天才被量到**：它（与 `Float16Array` 同一批）比第 273 轮那份普查晚得多，
而普查是按「已经想到的形状」铺的 ⇒ 没写上；第 703 轮那批原子探针里
`Math.f16round(1.1)` 当场报 `cannot call a non-closure value`（**那一格根本没装**）。

**它与 `fround` 是同一族的另一半**（`352`）：**一律交给宿主那一格**——
`Math.f16round(1.1)` 是 `1.099609375`，而「先过 f32 再砍位」自己凑出来的东西
**看着是对的**（判据是**逐字节**比），所以这里一个字都不自己算。

**号为什么落在这里**（`431`）：`350..366` 是数学那两段、`367..371` 是 `Number` / `Date`
用掉的、`372..374` 是双曲反函数、`375..376` 是 `URIError` / `EvalError` 两个构造、
`401..430` 是 `Object` 那一段——`431` 是紧接其后的第一格；
而 `700..799` 是**对象辅助函数**那一段、`600..699` 是 `Map` / `Set`，都进不来。

# const MathRandom:int = 432

**`Math.random()`**（第 703 轮）——**交给宿主**。本仓不自己写伪随机源：
规范只要求「近似均匀」，而**任何自己写的源都是一个可预测的答案**——
那是把一个「故意不确定」的东西做成确定的，比不做更糟。

**判据只量 `typeof`**（`stdlib/math/044-names-math` 那一行自己写着「只问名字，不调它」）
——**值不可比**（两次调用本来就不该相等），所以这一格**不能**写成逐字节的用例。

# const ErrorCaptureStackTrace:int = 433

**`Error.captureStackTrace(对象, 构造函数?)`**（第 703 轮）——**宿主那一格**。

**它不在规范里**（V8 的自有扩展），而判据钉的是**当前 Node 的形状**：那一格在 Node 上
是一个**函数**。本仓还没有 `Error.stack`（不是规范的一部分，见台账 `probe697-e11`），
所以这一格**收下实参、不做事**——它的职责是「存在、可调用」，
而「栈里有什么」是另一件事（那件事要先定「本仓的帧信息从哪儿来」）。

# const ErrorPrepareStackTrace:int = 434

**`Error.prepareStackTrace`**（第 703 轮）——与 `captureStackTrace` 同一处（V8 扩展）。
Node 上它是一个**函数**，所以这里也收成一格可调用的宿主引用，同样不做事。

# const ObjectToLocaleString:int = 504

**`Object.prototype.toLocaleString()`**（第 689 轮）——规范里它的正身就是
**`this.toString()`**（`Object.prototype.toLocaleString` 那一条算法只有一句
「Return ? Invoke(O, "toString")」）。

**所以这里一行实现都不新写**：原样转交给 `ObjectToString` 那一支
（与 `Array.prototype.toLocaleString` 指到同一格是**同一条先例**，见 `array.xl.md` 文末）。
**少了它是什么样**：`({}).toLocaleString()` 报 `cannot call a non-closure value`
（属性根本不存在），判据 `118-names-object-proto` 量的就是这一格。

**号为什么落在这里**（`504`）而不是接着上面那一串往下排：
**`700..799` 是对象辅助函数那一段**（`install.xl.md` 的 `InvokeObjectHelper` 先接走），
`713` 落在里面 ⇒ 报 `unimplemented: object helper 713`（**这一轮实测撞到的**）。
`500` 那一段只有 `501..503` 三格（JSON 两格 + `Date.toJSON`），`504` 是空的。

# const ObjectProtoGet:int = 505

**`Object.prototype.__proto__` 那个访问器的 getter 的号**（第 697 轮）——
**它不是脚本看得到的名字**：这一层自己挂上去的一个宿主引用（见文末装库那一趟）。

**它与 `Object.getPrototypeOf` 是同一件事**（规范里那一格的正身就是
`get Object.prototype.__proto__`，算法里只有一句「Return ? O.[[GetPrototypeOf]]()」），
所以两支**共用 `PrototypeOfValue`**——不为同一件事写第二份实现。

**号为什么落在这里**（`505`）：`500` 那一段只有 `501..503`（JSON 两格 + `Date.toJSON`）
与 `504`（`toLocaleString`），`505` 是接着的第一格；
而 `700..799` 是**对象辅助函数那一段**（`install.xl.md` 的 `InvokeObjectHelper` 先接走），
`600..699` 是 `Map` / `Set`——都进不来。

# const ObjectProtoSet:int = 506

**`__proto__` 那个访问器的 setter 的号**（第 697 轮）——与 `ObjectProtoGet` 成对。

**它的口径与 `Object.setPrototypeOf` **不是**同一条**（JS 里就是两条，写在这里免得被「顺手统一」）：
`Object.setPrototypeOf(o, 1)` 抛 `TypeError`、而 `o.__proto__ = 1` **静默不做事**；
`Object.setPrototypeOf(1, {})` 抛、而 `1 .__proto__ = {}` **静默不做事**。
所以这一支**自己不抛**，只把那两档筛掉之后交给 `RtSetProto`（`null` 那一档在那边刚补上）。

# const ObjectLookupGetter:int = 507

**`Object.prototype.__lookupGetter__(键)`**（第 706 轮）——B.2.2.4 那个**老访问器辅助**
（`__lookupGetter__` / `__lookupSetter__` / `__defineGetter__` / `__defineSetter__` 四格）。

**它们不在 ES 的主线里**（Annex B 的「附加属性」），但在**每个引擎里都在**，
而且 Node 上 `Object.getOwnPropertyNames(Object.prototype)` 就列着这四个名字
——所以「这一族在不在」是一条**普通的名字判据**：用例
`stdlib/object/118-names-object-proto.ts` 原来登的六处差额里，四处就是它们
（另两处 `__proto__` / `toLocaleString` 第 697 / 689 轮各收掉一格）。

**号为什么落在这里**（`507`）：`500` 那一段只有 `501..506`
（JSON 两格 + `Date.toJSON` + `toLocaleString` + `__proto__` 那一对），
而 `600..699` 是 `Map` / `Set`、`700..799` 是**对象辅助函数那一段**
（`install.xl.md` 的 `InvokeObjectHelper` 先接走）——都进不来。

**实现不是第二份算法**：`__lookupGetter__` 的正身就是
「取 `[[GetOwnProperty]]`，是访问器就返回它的 `[[Get]]`」——本仓那一趟**已经有了**
（`ObjectGetOwnPropertyDescriptor`，第 276 轮）。所以这一格只是**问它、再取一格**
（`__lookupSetter__` 同一支、取另一格：`508` 与它成对）。

# const ObjectLookupSetter:int = 508

**`Object.prototype.__lookupSetter__(键)`**（第 706 轮）——与 `507` **共用一支**，
只有「取描述符的哪一格」不同。

# const ObjectDefineGetter:int = 509

**`Object.prototype.__defineGetter__(键, 函数)`**（第 706 轮）——与 `__lookupGetter__` 成对。

**语义照规范**：`RequireObjectCoercible(O)` → `ToPropertyKey(P)` →
`IsCallable(getter)` 为假就抛 `TypeError` → 在**接收者自己**身上造一格**可枚举、可配置**的
访问器（`Enumerable` / `Configurable` 都为真，`[[Get]]` 是那个函数）。

**挂法与 `__proto__` 那一格同一条**：`SetProperty` 造的是**数据属性**、造不出访问器，
所以这一处走 `DefineAccessor`（第 613 / 697 轮踩过两次的同一个坎）。
**`DefineAccessor` 的最后一格就是 `enumerable`**——给 `true`，与 JS 一致
（`__defineGetter__` 造出来的那一格 `Object.keys` **看得见**，与 `Object.defineProperty`
的缺省**正好相反**，这是最容易抄错的一处）。

# const ObjectDefineSetter:int = 510

**`Object.prototype.__defineSetter__(键, 函数)`**（第 706 轮）——与 `509` **共用一支**，
只有「造 `[[Get]]` 还是 `[[Set]]`」不同。

# const ObjectDefineProperties:int = 413
**`Object.defineProperties(对象, 描述符表)`**（第 276 轮）——一趟写多格。
**它与 `defineProperty` 共用同一个方法**（`DefineOwnFromDescriptor`）：
「怎么把描述符写进去」那段里有两处**不能抄**的判断（默认三个标志全是假、
访问器描述符要抛），抄成两份就是两处会漂的答案。

# const ObjectSeal:int = 414

**`Object.seal(对象)`**（第 276 轮）——**不可配置**（`configurable` 全清）、
但**仍然可写**（这正是它与 `freeze` 的分界）。

# const ObjectIsSealed:int = 415

# const ObjectIsFrozen:int = 416

**`Object.isSealed` / `Object.isFrozen`**（第 276 轮）——**两个问法共用一张底牌**：
「**这个对象被标记过不可扩展吗**」。**为什么需要一个标记**：
「每个自有属性都不可配置」在**空对象**上是**真空成立**的——
`Object.isSealed({})` 于是会答**真**，而 JS 答**假**（它是可扩展的）。
**静默错值**，所以这一格不能只看标志位。
标记走 `SetHiddenProperty`（与 `Map` 的 `__k` / `Boolean` 的 `__b` 同一条路），
**已知差异写在明处**：它和那些内部格一样，会出现在 `Object.getOwnPropertyNames` 里
（**这不是新开的一个口子**——`__k` / `__v` / `__b` / 绑定函数的三个槽今天都这样）。

# const ObjectIsExtensible:int = 418

**`Object.isExtensible(对象)`**（第 291 轮）——**第 276 轮那张底牌的正面**：
`isSealed` / `isFrozen` 问的都是「**这个对象被标记过不可扩展吗**」，
而这一格正是**那一格的取反**（不是另开一个标记——两处标记迟早会漂）。
**判据 `c291-object-freeze-and-is`** 把三格钉在一起（`freeze` 之后三个答案同时要对）。

# const ObjectSetPrototypeOf:int = 419

**`Object.setPrototypeOf(对象, 原型)`**（第 304 轮）——号在 `411..418` 之后的**下一个**。

**它落的正是引擎里早就有的那一步**：`set_proto` 那条路（`rt.xl.md` 的 `RtSetProto`）
——第 278 轮为 `extends` 写过一遍（那时发现「父类可能是宿主引用值」⇒ **原型那一格不是对象就不做事**，
**接收者那一格仍然抛**）。**不另写一份**：两处各写一遍，`extends` 与这一格就会在
「原型不是对象」那一档上**分岔**（JS 在这一格是**不做事**，不是抛）。

**它是第 304 轮加宽矩阵时量到的**：判据 `c304-std-object-setprototypeof-value` 与
`c304-rt-setprototypeof-and-isprototypeof` 都在报 `cannot call a non-closure value`
——即**那一格根本没装**（`Object.create` / `getPrototypeOf` 从第 209 轮起就是好的，
它们是**同一族的三格**，偏偏中间那一格没人做）。

# const ObjectPreventExtensions:int = 420

**`Object.preventExtensions(对象)`**（第 304 轮）——**只打「不可扩展」那个标记**，
**不动任何一个属性标志**。**这正是它与 `seal` 的分界**：
`seal` 还要把每一格的 `configurable` 清掉、`freeze` 连 `writable` 一起清——
所以三档是**同一件事的三层**，而 `isExtensible` / `isSealed` / `isFrozen` 三个问法
读的都是**同一个标记**（第 291 轮那一格就是它的正面）。

**已知差异写在明处**：这一层**只标记、不真的拦写**——JS 里
`Object.preventExtensions(o)` 之后 `o.b = 1` 在**松散模式**下静默无效，
而本仓的 `SetProperty` 今天只认 `seal` / `freeze` 清出来的**属性标志**，
不认「不可扩展」这个对象级标记（判据只量 `isExtensible` 与既有属性）。

**它是第 304 轮加宽矩阵时量到的**：判据 `c304-std-object-preventextensions-forms`
与 `c304-rt-preventextensions-and-isextensible` 都在报 `cannot call a non-closure value`
——即**那一格根本没装**（`isExtensible` 从第 291 轮起就是好的，
**有问的人、没有做的人**）。

# const ObjectIsPrototypeOf:int = 421

**`Object.prototype.isPrototypeOf(对象)`**（第 304 轮）——**原型方法**
（与 `hasOwnProperty` 同一条路：挂在 `Protos.Object` 上、**隐藏**挂——
`Object.keys({})` 必须还是空的，挂成普通属性它当场变成 3）。

**它与 `instanceof` 不是一回事**：那个比的是**构造函数的 `prototype`**，
这个问的是「**链上有没有这一格**」——所以它**正好落在 `RtChainHas` 上**
（`instanceof` 的第三段，第 137 轮抽出来的那个）。**不另写一趟走链**：
两处各走一遍就是两处会漂的上限与终止条件。

**原始值一律答假**（JS 的口径：`Object.prototype.isPrototypeOf(1)` 是**假**）。

# const NumberToExponential:int = 367

**`(0.000123).toExponential(位数?)`**（第 291 轮）——**与 `toFixed` / `toPrecision` 同一张表**
（`NumberToFixed` / `NumberToPrecision`），**号追加在表尾**。
**语义同样借宿主**（理由与 `NumberToFixed` 那一段一字不差：ECMAScript 逐字定死了
「用精确的数学值做十进制舍入」）。
**它是第 291 轮普查量到的**：判据 `c291-number-tostring-radix-and-format` 报
`cannot call a non-closure value`——即**那一格根本没装**（`toFixed` 一直是好的）。

# const ConsoleLog:int = 301

# const ParseInt:int = 303

**`parseInt(文本, 基数?)`**（第 126 轮）——**全局函数**：与 `Math` / `console` 那些一样
从环境对象上取（不是某个对象的方法）。

**照着 JS 的规矩**：跳过**前导空白**、认一个 `+` / `-`、
基数给了就按它（**2..36 之外给 `NaN`**）、没给就看有没有 `0x` 前缀（有就 16、没有就 10）、
**取最长的合法前缀**（`parseInt("12px")` 是 `12`）、一个数字都没有就给 `NaN`。
**非字符串的实参先 ToString**（`parseInt(12.5)` 是 `12`）——走的是「任意值 → 文本」那条。

**已知差异写在明处**：JS 的空白集合比这里的**大**（Unicode 空白那一类）——
这里只认 ASCII 那六个（与 `trim` 同一条口径）；
**超出 `i32` 的位数**在 JS 里靠双精度累加、末几位可能与这里不同（这一层不假装逐位一致）。

# const ParseFloat:int = 304

**`parseFloat(文本)`**（第 126 轮）——同样跳过前导空白、**取最长的合法前缀**
（`"1.5px"` → `1.5`、`"1e"` → `1`、`"Infinity"` → `Infinity`）、
一个合法字符都没有就给 `NaN`。**前缀到数值那一步借用宿主**——
正确舍入的十进制转换是 IEEE 754 的活儿（与 `JSON.parse` 那条同一条理由）。

# const NumberToFixed:int = 330

**`(1.5).toFixed(位数)`**（第 150 轮）——挂在 `Number.prototype` 上（原始值接收者从那一条链上找）。

**这一步借宿主**：`toFixed` 的语义**由 ECMAScript 逐字定死**（用**精确的数学值**、
按指定的位数做**十进制舍入**）——所以它是「结果被标准定死」的那一类
（与 `host-text.xl.md` 借「十进制 ↔ 双精度」同一条理由）。
**手写一遍是另一个量级的工程**：`x * 10^d` 再取整在边界上会错
（`(1.005).toFixed(2)` 那种——精确值的舍入不是浮点乘除能表达的）。

**已知的跨目标差**（写在明处）：C++ 那一侧的定长格式化（`to_chars`）在**平局**上
可能与 V8 差最后一位——与 `host-text.xl.md` 里记的指数形式那条同族（P1 对拍时收）。

# const NumberToStringRadix:int = 331

**`(255).toString(16)`**（第 150 轮）——**同一个名字、两种语义**：
`Number.prototype.toString()` **不带实参**时是十进制（`(1.5).toString()` 是 `"1.5"`），
带**基数**时是那个进制的写法。

**基数 10 走 `NumberToHostText`**（引擎那一处借用：最短往返、`NaN` / `±Infinity` / `-0`
的名字都在那里定死）；**其余基数借宿主**（ECMAScript 对小基数有算法，
大基数在边角上留给实现——与 `toFixed` 同一条口径）。

# const BooleanToString:int = 332

**`true.toString()`**（第 150 轮）——挂在 `Boolean.prototype` 上。
**它就是 `TextUnitsOf` 对布尔的那一档**（`"true"` / `"false"`）——
两处口径本来就该一样（一个是 `String(true)`，一个是 `true.toString()`）。

# const NumberToPrecision:int = 333

**`(1.2345).toPrecision(3)`**（第 182 轮）——与 `toFixed` **同一族、同一条理由**
（语义由 ECMAScript 逐字定死、用精确的数学值、手写一遍会错在边界上），
所以同样**借宿主**。差别只有一句话：`toFixed` 固定**小数位**、
`toPrecision` 固定**有效位数**（≥ 精度时还可能给指数形式——那一处写法差异
与 `host-text.xl.md` 记的指数形式那条同族，P1 对拍时一起收）。

# const NumberValueOf:int = 334

**`(5).valueOf()`**（第 182 轮）——**返回接收者自己**（本仓不装箱，
所以 `self` 就是那个原始值）。JS 里 `o.valueOf()` 是 `ToPrimitive` 的第一步，
而数值这一档的答案就是它自己。

# const BooleanValueOf:int = 335

**`true.valueOf()`**（第 182 轮）——与 `NumberValueOf` 同一条口径（返回接收者自己）。

# const ObjectValueOf:int = 336

**`({}).valueOf()`**（第 198 轮）——**与 `NumberValueOf` 同一支实现**（返回接收者自己）。

**它是 `Object.prototype` 上最"空"的一个方法**，而它**永远是对的**：JS 的 `ToPrimitive`
普通那一支第一步就是它——原始值那几档给回自己，对象给回对象（于是**继续往下走
`toString`**）。补上它之后，「普通对象 → 原始值」那条路只差 `toString`。

# const ErrorToString:int = 339

**`Error.prototype.toString`**（第 213 轮）：`"<name>: <message>"`。

**为什么不复用 `Object.prototype.toString`**：那一个给的是 `"[object Object]"`
（它的口径就是「标签」），而错误这一族要的是 `"Error: msg"`——
判据 `error-tostring` 现场给的就是 `"[object Object]"`（**离对的只差一个"很像"**）。

# const ObjectHasOwnProperty:int = 338

**`({}).hasOwnProperty(k)`**（第 209 轮）——只问**自己**那一格（`in` 会沿原型链，
两处**不能互相顶替**）。号紧挨着上面两格（同一个「`Object.prototype` 上的方法」段）。

# const FunctionCall:int = 340

**`f.call(thisArg, …args)`**（第 228 轮）——`Function.prototype` 上的第一格。

**它为什么能做得出来、而 `bind` 要绕着走**：`call` / `apply` **不造新值**——
它们要的是「换一个 `this`、再按给定的实参调一次」，而这件事 `NativeCall` 本来就会
（`props.xl.md` 的那条重入通道带 `thisValue`、实参表是一整个数组，
第 142 轮就开宽了）。所以这一格只是**搬运**：把 `args[0]` 当 `this`、
把 `args[1..]` 收成一个数组，然后 `call(callee, thisArg, list)`。

**它凭什么常见**：`Object.prototype.toString.call(x)` 这一族写法遍地都是
（判据 `object-tostring-tag` / `symbol-tostringtag` 拖着的就是它），
而本仓原来报的是 `calling a non-closure value`——`call` 那一格**根本不存在**
（根子在「闭包没有 `Proto`」，第 228 轮在 `vm.xl.md` 的 `MakeClosure` 补上了）。

# const FunctionApply:int = 341

**`f.apply(thisArg, argsArray)`**（第 228 轮）——与 `FunctionCall` 同一支实现
（`this` 同样是 `args[0]`），只有实参那一半不同：`apply` 的实参**已经是数组**
（JS 还认「类数组」那一条，本仓只认真的数组——写在已知差异里）。

# const FunctionBind:int = 342

**`f.bind(thisArg, …args)`**（第 228 轮）——**它要造一个新值**，所以与上面两格不同：
造出来的那个东西必须**带着**「目标 / `this` / 已绑定的实参」三样，
而且是**能被调的**。本仓现成的两个机制正好够：`AttachCallable` 第 145 轮就在
（「对象照旧是对象，只是多了一格能被调」），三样东西挂成**隐藏自有属性**
（`SetHiddenProperty`，第 210 轮——它们不该出现在 `Object.keys` 里）。
落到哪一段代码由**这一格号**决定（引擎不认识 `"bind"` 这几个字母，
与 `Symbol` / `Map` 同一条分界），实现在 `InvokeGlobal` 的 `FunctionBind` 那一支。

# method MethodObject:(room:RoomChecker, table:HeapTable, protos:Protos, id:int, arity:int)=>Value

**一个「能被调、而且有 `length`」的方法值**（第 350 轮）——`Function.prototype` 上
那四格用的就是它。

**为什么不直接挂一个宿主引用**（**实测撞到的**）：宿主引用**没有属性表** ⇒
`Function.prototype.call.length` 永远给 `undefined`
（判据 `c291-function-prototype-shape`：Node 给 `1`、本仓给 `undefined`）。
**JS 里那四格是函数、函数有 `length`** ⇒ 做成「对象 + 可调用载荷」（第 145 轮那一款）：
对象照旧能被调（**同一个能力号**）、`typeof` 也给 `"function"`，
而多出来的一张属性表正好用来放 `length`。

**`length` 是隐藏挂的**：`Object.keys(Function.prototype)` 在 JS 里是空数组
（那四格的**值**不进枚举）——而 `toString.call.length` 这一类读法照样成立。

```ts
const fn = NewPlainObject(room, table, protos);
table.AttachCallable(fn.Ref, id, 0);
SetHiddenProperty(room, table, fn, Value.FromString(table.CreateString(Units("length"))),
  Value.FromInt(arity));
return fn;
```

# const FunctionCtor:int = 343

**`Function` 这个全局对象自己**（第 228 轮）：`Function.prototype.call` 这一族要一个落点，
所以它是一格「普通对象 + 可调用载荷」（与 `Array` / `String` 同款）。
**它不是 `new Function("…")` 那条路**（那是**编译期**的事，本运行器不做）——
它只是 `Function` 这个名字的落点，于是 `Function.prototype === Function.prototype` 成立。

# const FunctionToString:int = 345

**`f.toString()`**（第 334 轮）——`Function.prototype` 上的**第四格**。

**号为什么是 `345` 而不是 `344`**（**实测撞过一次**）：`344` 已经**被 `BoundCall` 占了**
（同一个文件、同一个号段）——第一版取 `344` ⇒ 那个号被 `FunctionToString` 那一支截走
⇒ `bound(2)` 报 **`a bound function lost its target`**（**离现场很远**：
那句话听起来像绑定对象坏了，其实是**两个方法共用一个号**）。
**与第 332 轮 `queueMicrotask` 撞 `SymbolCtor` 是同一个形状**——
**号撞车是静默的**，这一仓第 150 / 280 / 332 轮各踩过一次，这是**第二次**在**同一段**里踩。
**下一轮该做的**：给「同一段里的号不许重复」加一道**自动检查**
（`tmp/tmp-ids.mjs` 那种一次性脚本不够——它不会在每次提交时跑）。

**它读的是闭包上那一格**（`HeapClosure.Source`，由降级层从源码里切出来）：
`f.toString()` 在 JS 里给的是**定义它那一段**（`function named(a) { return a + 1; }`），
而运行期只认得出「这是哪个闭包」——**与 `fn.name` 同一格道理**（第 291 轮）。

**判据现算的是「这一格在不在」**：`f.toString().includes("function")`、
`arrow.toString().startsWith("(n")`、`obj.m.toString().includes("m")`——
三处量的都是**文本里有没有那一段**，所以「原样抄下来」就够了，
不必（也不该）重新排版。

**造不出来就给空串**→：宿主那两档由 `FunctionSourceText` 现造
（`function () { [native code] }`，那是规范定的字面）；而**连那一格都没有**
（`new Lowering()` 那十几处）时给空串——**规范说 `toString` 永远返回一个字符串**，
所以这里不抛（抛出来的话 `String(f)` 会整句变成异常，而 JS 给的是一个字符串）。

**`String(f)` 走的是另一条路**（`ToPrimitive`）：它也读同一格
（`rt.xl.md` 的 `FunctionSourceText`）——**一处实现、三处用户**
（`f + 1` / `` `${f}` `` / `f.toString()`，与第 331 轮 `AttachArrayIterator` 同一个形状）。

# const StructuredCloneId:int = 346

**`structuredClone(v)`**（第 338 轮）——**一个全局函数**，它**深拷贝**一份值。

**它为什么落在这一层**：拷贝要读的是**堆的形状**（对象的 `Props`、数组的 `Elements`、
原型那一格），而语言层本来就在直接读堆（`GetProperty` 那一族）——
不必为它开一条新通道。**引擎那一侧一格都不用改**。

**它认哪些东西**：原始值**原样返回**（JS 的口径）；
**数组**给一个新数组（原型照抄、元素递归）；**对象**给一个新对象
（原型照抄、每一格属性按原来的键与标志位复制、值递归）。
**`Map` / `Set` / `Date` 不必特判**——本仓把它们**就是**做成「带几格隐藏属性的普通对象」的
（`__k` / `__v` / `__b`、`Date` 那几格），所以对象那一条**顺手就把它们带上了**
（原型也照抄 ⇒ `cloned.map.get(...)` 找得到方法）。

**环要认**（`const a = { }; a.self = a`——判据 `c330-std-structuredclone-containers`）：
`seen` 记的是「源句柄 → 新句柄」，**先登记再递归**（后登记就成了无限递归，
而宿主栈溢出**不可捕获**——`README` 的硬性约定第 2 条）。

**函数那一档响亮地抛**（JS 给 `DataCloneError`）：拷贝一个函数**没有正确的做法**，
而「原样返回」会让两边**共用同一个函数对象**——**静默错值**（改一边看另一边也变）。
**符号那一档同样抛**（JS 也不许克隆符号）。

**房间**：每一格分配之前先问（这一层每一处都守这条）。

# method CloneStructured:(room:RoomChecker, table:HeapTable, value:Value, seen:any)=>Value

**`structuredClone` 的那一趟深拷贝**（第 338 轮）——见 `StructuredCloneId` 那一段的账。

**`seen` 是一张宿主 `Map`**（`句柄 → 句柄`）：语言层是**宿主代码**，
所以它可以用宿主的容器——这**不是**「引擎侧不许用宿主库」那一条的地盘
（那一条管的是 `runtime/`）。

**先登记、再递归**（`seen.set` 排在走成员之前）：反过来的话自引用就是**无限递归**，
而宿主栈溢出**不可捕获**（`README` 的硬性约定第 2 条）。

**数组按 `Elements` 抄**（**洞要保住**：`[1, , 3]` 抄成 `[1, undefined, 3]` 会让
`1 in copy` 从假变真——**形状变了**；`SetHole` 就是为这一格留的）。
**对象按 `Props` 抄**（键、`Kind`、`Flags` 一起——`Map` / `Set` / `Date` 那几格
**隐藏属性**也在这里被带上，所以它们不必特判）。

```ts
if (!value.IsObject()) {
  // **函数与宿主引用要响亮地抛**（JS 给 `DataCloneError`）：原样返回会让两边
  // **共用同一个函数对象**（改一边看另一边也变——**静默错值**）。
  if (value.Tag === ValueTag.Closure || value.Tag === ValueTag.Function || value.Tag === ValueTag.HostRef) {
    throw new TypeError("structuredClone cannot clone a function");
  }
  // **符号也抛**（JS 也不许克隆符号）。
  if (value.Tag === ValueTag.Symbol) {
    throw new TypeError("structuredClone cannot clone a symbol");
  }
  return value;
}
const seenHandle = seen.get(value.Ref);
if (seenHandle !== undefined) return Value.FromRef(value.Tag, seenHandle);
if (value.Tag === ValueTag.Array) {
  const source = table.Get(value.Ref).AsArray();
  if (!room(ObjectCharge + ValueCharge * source.GetLength())) throw new Error("out of room");
  const handle = table.CreateArray();
  seen.set(value.Ref, handle);
  table.Get(handle).Proto = table.Get(value.Ref).Proto;
  const target = table.Get(handle).AsArray();
  for (let i = 0; i < source.GetLength(); i++) {
    // **洞要保住**（见上面那一段）：`SetAt` 会把洞抹成一个真值。
    if (source.IsHole(i)) {
      target.Push(Value.Undefined());
      target.SetHole(target.GetLength() - 1);
      continue;
    }
    target.Push(CloneStructured(room, table, source.GetAt(i), seen));
  }
  table.Recount(handle);
  return Value.FromArray(handle);
}
const sourceProps = table.Get(value.Ref).Props;
if (!room(ObjectCharge + PropertyCharge * sourceProps.length)) throw new Error("out of room");
const handle = table.CreateObject();
seen.set(value.Ref, handle);
table.Get(handle).Proto = table.Get(value.Ref).Proto;
for (let i = 0; i < sourceProps.length; i++) {
  const original = sourceProps[i];
  // **值那一档：可枚举的函数要抛、不可枚举的内建方法照抄**（**实测踩过一次**）。
  //
  // **为什么不能一律抛**：本仓的 `Map` / `Set` / `Date` 把**方法**挂在**每个实例自己**身上
  //（`Object.getOwnPropertyNames(new Map())` 会列出 `get` / `set` / …，
  //  而 Node 给**空数组**——那是**另一处**结构差，记在下面）。
  // 一律抛的话 `structuredClone({ map, set, date })` 当场报
  // 「cannot clone a function」（判据 `c330-std-structuredclone-containers` 现场就是这个）。
  //
  // **判据是「可不可枚举」**：内建方法是用 `SetHiddenProperty` 挂的（不可枚举），
  // 而用户写在对象字面量里的函数是**可枚举**的——JS 对后者抛 `DataCloneError`
  //（`structuredClone({ f: () => 1 })` 在 Node 里抛）。**这就是两类东西的分界**
  //（**结构差写在明处**：本仓 Map 的实例多出一堆自有方法，Node 没有——
  //  那一处要改的是 `map.xl.md` / `set.xl.md` / `Date` 的装法，不是这一条）。
  const isFunction = original.Value.Tag === ValueTag.Closure
    || original.Value.Tag === ValueTag.Function || original.Value.Tag === ValueTag.HostRef;
  const enumerable = (original.Flags & PropertyFlagEnumerable) !== 0;
  if (isFunction && enumerable) {
    throw new TypeError("structuredClone cannot clone a function");
  }
  // **键与标志位照抄、值递归**：标志位不抄的话，`Object.freeze` 过的那个副本
  // 会变成**可写**的（`isFrozen(copy)` 从真变假——第 333 轮那条账刚量过同型的错）。
  const copied = isFunction ? original.Value : CloneStructured(room, table, original.Value, seen);
  const copy = new Property(original.Key, copied);
  copy.Kind = original.Kind;
  copy.Flags = original.Flags;
  copy.Getter = original.Getter;
  copy.Setter = original.Setter;
  table.Get(handle).Props.push(copy);
}
table.Recount(handle);
return Value.FromObject(handle);
```

# const StringIteratorSelf:int = 349

**`"ab"[Symbol.iterator]()`**（第 345 轮）——**字符串那一族的迭代器**。

**它为什么必须存在**（**实测撞到的**）：`for (const c of "abc")` 与 `[...s]` 一直是对的
（那两条走的是**引擎**那条 `iter_next`，字符串它自己认），
而**手写那句** `"ab"[Symbol.iterator]()` 报「cannot call a non-closure value」——
`String.prototype` 上那一格**从来没挂过**（数组那一格第 308 轮挂过）。
判据 `c304-std-symbol-iterator-manual` 量的正是这一格：
**同一个口径两条路，只接了一条**。

**实现借的是现成的两步**，**一行码点规则都不新写**：
`IterDrain`（`GetIterator` + `drain`）对**字符串**给的就是**逐码点的数组**
（`install.xl.md` 那一处写着：`const [c1, c2] = "hi"` 给 `"h"` / `"i"`）——
然后 `AttachArrayIterator` 把那两格（`__i` / `next`）挂上去，
`next()` 于是给 `{ value, done }`（`ArrayIteratorNext`）。
**码点那条规则仍然只有一处**（引擎的 `DoIterNext`）。

# const SpeciesGetterId:int = 712

**`Array[Symbol.species]` 那个访问器的 getter**（第 601 轮）——**把接收者原样给回去**。

JS 的口径就是这一句：`Array[Symbol.species]` 的 getter 返回 `this`，
于是子类（`class MyArray extends Array {}`）读到的是**子类自己**。
访问器调 getter 时 `this` 是**接收者**（`props.xl.md` 的 `ReadProperty`），
所以这一格只回 `self`。分派在 `install.xl.md` 的 `InvokeObjectHelper`（号段 700..799），
挂它的是 `BuildGlobals`（挂到 `Array` 那个普通对象上）。

**它住在这里而不是 `install.xl.md`**：`install.xl.md` 已经 import 本文件
（`GeneratorNextId` 那几格同款），反过来的话就是环。

# const GeneratorNextId:int = 709

**「生成器的 `next`」那一格**（第 229 轮）——`it.next()` 落到这里，
但它**不由这一层实现**：走一步生成器要发 `iter_next`（**指令**），
而那是**引擎**的事（`vm.xl.md` 的 `NextStepOf`）。

**它的作用只有两个**：
1. **`protos.Generator.next` 上挂的那个载荷用它**（`BuildGlobals` 挂）——
   这样 `GetProperty` 沿原型链找到它、`DoCallMethod` 把它当方法调；
2. **让引擎认得出「这一次调用是我自己的」**：`InstallBuiltins` 调
   `machine.RegisterGeneratorMethods(GeneratorNextId, GeneratorReturnId, GeneratorThrowId)`，
   引擎于是把这三格号记下来（`GeneratorNextId` 那三个字段），
   两条派发路上各截一次（`GeneratorStepKind`）。

**为什么用能力号而不是新加一条算子**：**一条指令都不用加**——
`AttachCallable` 与「宿主载荷的能力号分派」第 145 / 228 轮就都在了，
这只是一次**新的用法**（与 `Symbol` / `Date` 那种「对象带一格载荷」同一个形状）。

**第 313 轮补了两格**（`return` / `throw`，`710` / `711`）：
它们是**同一件事的另外两个方向**（结束掉 / 往里抛），
所以**登记入口也合成一个**（三个号一次交出去，引擎那边判据只有一份）。
`throw` 那一个方向**做得了**（在挂起点抛一个值，`Op.Resume`）；
`return` 那一个**做不了**——它要让那个 `yield` 点上跑 `finally` 链，
而那条链是**降级期**的构造（`lowering.xl.md` 的 `FinallyBlocks`），
引擎手里没有「这个帧欠哪些 `finally`」那张表 ⇒ 那一格今天**响亮地抛**。

**它在 709**（700..799 是语言内部辅助那段，`SetHiddenId = 708` 是当前最大的）——
**加号必须同时改 `BuiltinSlots`**（`install.xl.md`）：漏了它的症状是`capability id is out of range: 709`（一句话里没提「名单」两个字，第 210 / 197 轮各踩过一次）。

# const BoundCall:int = 344

**调一个 `bind` 造出来的函数**（第 228 轮）——`FunctionBind` 那一支造的那个对象
身上带着这一格载荷，被调时落到这里。

**三样东西藏在哪些名字下、由谁定**：名字（`BoundTargetName` / `BoundThisName` /
`BoundArgsName` 三个方法）是**这一层**的常数，**引擎一个字都不认识**——
它只负责「把这个对象当 `this` 递进来」（`vm.xl.md` 的 `CallHostValue` 就是这么写的）。
**写成三个方法而不是三个号**：它们的用处是「现造一个字符串句柄」
（`table.CreateString`），而号那一栏是**能力号**的段——混进去会让人以为宿主能注册它们。

# method BoundTargetName:(table:HeapTable)=>Value

**`bind` 造出来那个对象上，「目标」挂在哪个键下**（第 228 轮）。

**每一次都现造一个字符串**（不是缓存一格句柄）：属性查找**按内容比**
（`props.xl.md` 的 `KeyMatches`），所以「同一个名字」不要求「同一个句柄」；
而这个函数一次调用最多走两趟（写一趟、读一趟），缓存带来的收益抵不过
多一格全局状态要维护。**三个方法挤在一处**（同一件事的三个名字）。

```ts
return Value.FromString(table.CreateString(Units("__boundTarget")));
```

# method MakeBox:(room:RoomChecker, table:HeapTable, protos:Protos, protoHandle:int, inner:Value)=>Value

**造一个包装对象**（第 310 轮）——**普通对象 + 一格隐藏的原值**，原型指到 `protoHandle`。

三处用它（`new Number(x)` / `new String(x)` / `new Boolean(x)`、以及 `Object(原始值)`）——
**同一件事写三遍就是三处会走偏**（判据要的是**三族行为一致**：`typeof` 是 `"object"`、
`valueOf` 给回原值、`Object.keys` 是 `[]`）。

**为什么原型要显式指过去**：`NewPlainObject` 给的是 `Object.prototype`——
不换的话 `(new Number(5)).toFixed(2)` 找不到那一格（报的是
`cannot call a non-closure value`，听起来像「`toFixed` 没做」，而它**早就有了**）。

**里面那一格为什么是隐藏属性**：见 `BoxKey` 那一段（`Object.keys` 必须给 `[]`）。

```ts
const boxed = NewPlainObject(room, table, protos);
table.Get(boxed.Ref).Proto = protoHandle;
SetHiddenProperty(room, table, boxed, BoxKey(table), inner);
return boxed;
```

# method BoxReceiver:(room:RoomChecker, table:HeapTable, protos:Protos, value:Value)=>Value

**松散模式里「原始值当 `this`」要走的 `ToObject`**（第 710 轮）——`f.call(1)` 里
`this` 该是一个 **`Number` 包装对象**（`typeof this` 给 `"object"`），不是那个数本身。

**它收在一处**：三个入口要的是同一句话（`FunctionCall` / `FunctionApply` 的 `thisArg`、
`BoundCall` 里那个绑定时的 `this`），而**同一件事写三遍就是三处会漂**
（与 `MakeBox` 那一族同一条纪律）。

**三档，与 `Object(原始值)` 那一支一字不差**（第 310 轮那一套）：
字符串走 `MakeStringBox`（它多带下标与 `length` 两样）、数字与布尔走 `MakeBox`。
**其余一律原样交回**——对象（含 `null` / `undefined`：那一档由引擎换成全局对象）、
符号（本仓还没有符号包装对象，`Object(sym)` 至今响亮地抛）。
**`null` / `undefined` 不在这里兜**：`ToObject` 对它们抛，而 JS 的 `[[Call]]`
在**更早**一步就把它们换成全局对象了（`vm.xl.md` 的 `DoCallValue` 那一支）。

```ts
if (value.Tag === ValueTag.String) return MakeStringBox(room, table, protos, value);
if (value.Tag === ValueTag.Int32 || value.Tag === ValueTag.Float64) {
  return MakeBox(room, table, protos, protos.Number, value);
}
if (value.Tag === ValueTag.Bool) return MakeBox(room, table, protos, protos.Boolean, value);
return value;
```

# method MakeStringBox:(room:RoomChecker, table:HeapTable, protos:Protos, primitive:Value)=>Value

**造一个字符串包装对象**（第 310 轮）——`MakeBox` 再加两样。

**JS 的字符串对象是「奇异对象」**：它**自己**带着下标格与 `length`——
`new String("ab").length` 是 2、`s[0]` 是 `"a"`、`s[1]` 是 `"b"`，
而且 `Object.keys(new String("ab"))` 是 **`["0", "1"]`**（那两格**是可枚举的自有属性**，
不是内部格——所以它们走 `SetProperty`，只有 `length` 走隐藏那一支）。

**不补这两样会怎样**：`s.length` 沿原型链找不到 ⇒ `undefined`（**静默错值**）；
`s[0]` 同理。判据 `c305-std-string-wrapper-methods` 量的正是这两格。

```ts
const boxed = MakeBox(room, table, protos, protos.String, primitive);
const units = table.Get(primitive.Ref).AsString().Units;
if (!room(PropertyCharge * (units.length + 1) + ObjectCharge)) throw new Error("out of room");
for (let i = 0; i < units.length; i++) {
  SetProperty(room, NeverCall, table, boxed,
    Value.FromString(table.CreateString(Units(String(i)))),
    Value.FromString(table.CreateString([units[i]])));
}
// **`length` 不可枚举**（JS 的口径）——它走隐藏那一支。
SetHiddenProperty(room, table, boxed, NameValue(table, "length"), Value.FromInt(units.length));
return boxed;
```

# method UriKeep:(unit:number, component:bool)=>bool

**这个 ASCII 码元在百分号编码里要不要留着**（第 311 轮）。

三档（规范的 `uriUnescaped` / `uriReserved` 两张表）：
**字母数字**、**`- _ . ! ~ * ' ( )`**（永远留着）、
以及 `component === false`（即 `encodeURI`）时**多留的十一个保留字符**。

**非 ASCII 一律不留**（它们要走 UTF-8 那一支）——所以判据只对 `< 128` 有意义，
调用方也只在那一档问它。

```ts
if ((unit >= 65 && unit <= 90) || (unit >= 97 && unit <= 122) || (unit >= 48 && unit <= 57)) return true;
if (unit === 45 || unit === 95 || unit === 46 || unit === 33 || unit === 126 || unit === 42
  || unit === 39 || unit === 40 || unit === 41) return true;
if (!component && UriReserved(unit)) return true;
return false;
```

# method UriReserved:(unit:number)=>bool

**那十一个保留字符**（第 311 轮）：`; , / ? : @ & = + $ #`。

**两处都问它**：`encodeURI` 留它们（`UriKeep`）、`decodeURI` 遇到它们**不解**
（解出来的还是 `%XX`）——**同一张表两处用**，各写一遍就是两处会漂。

```ts
return unit === 59 || unit === 44 || unit === 47 || unit === 63 || unit === 58 || unit === 64
  || unit === 38 || unit === 61 || unit === 43 || unit === 36 || unit === 35;
```

# method UriHex:(unit:number)=>int

**十六进制数字 → 值**；不是就 `-1`（第 311 轮）。

```ts
if (unit >= 48 && unit <= 57) return unit - 48;
if (unit >= 65 && unit <= 70) return unit - 55;
if (unit >= 97 && unit <= 102) return unit - 87;
return -1;
```

# method EncodePercent:(table:HeapTable, value:Value, component:bool)=>Array<int>

**值 → 百分号编码的码元表**（第 311 轮）。`value` 先过 `JsTextUnits`（JS 的 `ToString`）。

**按码点走**（代理对合起来）：`encodeURIComponent("😀")` 是 `%F0%9F%98%80`（四个字节），
拆成两个码元去编码会得到**两串三字节**（**静默错值**，而且长度也对不上）。

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
  // **孤立代理项是坏输入，响亮地抛**（第 647 轮）：JS 的两个编码函数遇到它都抛
  // `URIError`——一个孤立的代理项**不是一个字符**，而原来把它当成一个普通码点
  // 编成三字节（实测 `encodeURIComponent("\uD800")` 给 `%ED%A0%80`，
  // 而 Node 抛 `URIError: URI malformed`）。**与解码那一侧抛的是同一件事**
  //（`decodeURIComponent` 的坏字节序列也是这个类、这句话）。
  if (code >= 0xd800 && code <= 0xdfff) {
    throw new URIError("URI malformed");
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

**百分号编码 → 码元表**（第 311 轮）。

**用算术而不是位运算**（`Math.floor` / `%`）：这一段是本仓自己的规范文件，
而它是 `cases:tsast` 的语料——位运算写得再对也只是多一层风险（`& 0x3f` 那几处
在这一版里没有一处非它不可）。

**`component === false` 时保留字符不解**（`decodeURI("%2F")` 给 `"%2F"`）——
吐回去的是**大写十六进制**（JS 原样保留输入里那两个字符的大小写，本仓统一大写，
**写在明处**：`decodeURI("%2f")` 在 JS 里是 `"%2f"`、这里是 `"%2F"`）。

**坏输入响亮地抛**（JS 抛 `URIError`）——**第 376 轮起抛的就是真的 `URIError`**：
那一族原来**不存在**（`props.xl.md` 那一格写着「等有判据了再补」），
所以这里原来抛一个普通 `Error` 并点名（编一个「看起来像对的」答案是静默错值）。
判据来了（`c371-stdlib-globals-uri-family` 量 `e.name`），于是那一族补上了、
这里换成 `throw new URIError(…)`——**消息照 JS**（`"URI malformed"`），
而「宿主类 → 脚本族」那一步在 `install.xl.md` 里做（内建这边只管抛**宿主的**那个类）。
**同一轮还修了这里的死循环**（`decodeURIComponent("%")` 原来**转不动**，
见下面 `bytes.length === 0` 那一句）。

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
      throw new URIError("URI malformed");
    }
    bytes.push(high * 16 + low);
    j += 3;
  }
  // **一个完整的 `%XX` 都没读到 ⇒ 坏输入，响亮地抛**（第 376 轮）。
  //
  // **少了这一条是死循环**（不是错值，是**转不动**）：`decodeURIComponent("%")` 里
  // `j + 2 < units.length` 当场为假 ⇒ 上面那个 `while` **一次都不进** ⇒ `bytes` 空 ⇒
  // 解码那一段也整段跳过 ⇒ 最后 `i = j` 里 `j` **还是 `i`** ⇒ 外层 `while` 原地打转。
  // **实测**：`tsrun` 跑 `decodeURIComponent("%")` **不返回**（被判据的 30s 超时杀掉，
  // 报告里那一格是「退出码 `null`」）——而这一条**拖慢了整轮判据**：
  // 它让所在那一批被超时杀掉、单条重跑再花 30s（第 371 轮的账里记着这件事）。
  // **同族的 `"a%"` / `"abc%2"` 全是同一个形状**（都是「有 `%`、后面不够两位」）。
  if (bytes.length === 0) {
    throw new URIError("URI malformed");
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
      throw new URIError("URI malformed");
    }
    if (k + need >= bytes.length) {
      throw new URIError("URI malformed");
    }
    for (let n = 1; n <= need; n++) {
      const follow = bytes[k + n];
      if (follow < 128 || follow >= 192) {
        throw new URIError("URI malformed");
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

**`new Boolean(x)` 那个包装对象上，「原值」挂在哪个键下**（第 232 轮）——
与 `BoundTargetName` 那一族**同一个理由**（每一次现造，按内容比）。

**为什么是隐藏属性而不是普通属性**：`Object.keys(new Boolean(1))` 在 JS 里是 `[]`，
挂成普通属性会当场给 `["__b"]`——**静默错值**（与 `Map` 的内部格那条同一个坑）。

```ts
return Value.FromString(table.CreateString(Units("__b")));
```

# method BoundThisName:(table:HeapTable)=>Value

**绑定的 `this` 挂在哪个键下**（第 228 轮，与上面同一条口径）。

```ts
return Value.FromString(table.CreateString(Units("__boundThis")));
```

# method BoundArgsName:(table:HeapTable)=>Value

**已绑定的实参挂在哪个键下**（第 228 轮，与上面同一条口径）。

```ts
return Value.FromString(table.CreateString(Units("__boundArgs")));
```

# const ObjectCreate:int = 407

**`Object.create(proto)`**（第 209 轮）——造一个空对象、把**原型**指过去。

# const ObjectGetPrototypeOf:int = 408

**`Object.getPrototypeOf(o)`**（第 209 轮）——把 `o` 那一格原型**当值**交出去。

# const ObjectGetOwnPropertyNames:int = 409

**`Object.getOwnPropertyNames(o)`**（第 214 轮）——与 `Object.keys` **只差「不管 `enumerable`」**。

# const ObjectFromEntries:int = 410

**`Object.fromEntries(entries)`**（第 214 轮）——`[[k, v], …]` 或 `Map` → 普通对象。

# const ObjectToString:int = 337

**`({}).toString()`**（第 198 轮）——**只答能证的那一格**：`"[object Object]"`。

**为什么它不能顺手给一个默认值**：JS 的 `Object.prototype.toString` 是一条**长长的分派**
（`Array` / `Function` / `Error` / `Date` / `Map` / `Set` 各有各的标签，
其中 `Map` / `Set` 那两个还是靠 `Symbol.toStringTag`）。本仓今天能**证明**的只有
「普通对象」这一格（没有标记格、原型链上不是 `Error`、不是可调用对象）——
**其余一律抛**（见 `ObjectTagOf`）。

**它凭什么值得做**：`({}) + 1` 在 JS 里是 `"[object Object]1"`，而本仓原来报
「算术作用于非数值」——第 198 轮把 `ToPrimitive` 做出来之后，
这一步就是**对象那一支的最后一块**（`[] + 1` 早就有 `Array.prototype.toString` 了）。

# method ObjectTagOf:(room:RoomChecker, call:NativeCall | null, table:HeapTable, protos:Protos, value:Value)=>string

**`Object.prototype.toString` 该给哪个标签**——**能证的证、不能证的抛**（第 198 轮）。

**顺序是语义**：可调用对象 → 标记格那三族 → `Error` → 普通对象。

**为什么不能落回 `"Object"`**：那三族与 `Error` 在 JS 里给的是**别的文本**
（`new Map() + 1` 是 `"[object Map]1"`、`new Error("x") + 1` 是 `"Error: x1"`
——注意 `Error` 那一格走的是 `Error.prototype.toString`，不是这一条）。
落回默认值就是**静默错值**，而它比「进不了门」危险得多（`Object.freeze` 那条账刚记过）——
所以这里**响亮地抛**，把每一样缺的东西**点名**（缺 `Symbol.toStringTag` / 缺
`Error.prototype.toString`）。

**`Date` / `Map` / `Set` 三族靠 `DateMarker` 认**（`inspect.xl.md` 那一处）——
**同一个判据只有一份**：`GetIterator`（认 `Map` / `Set`）、`InspectValue`（认三族）、
这里 问的都是「那一格标记在不在」；各写一遍的下场是「`console.log` 认得、算术不认得」。

**数组与那几档原始值也要给对**（第 228 轮）：`Object.prototype.toString.call(x)`
这条写法在普通 `.ts` 里遍地都是（判据 `function-prototype-shape`），
而**最常传进去的就是数组与数字**。**为什么把它排在最前**：
数组**不是**「普通对象」那一档（`value.Tag` 就是 `Array`），
而原始值那一档原来走到最后会落成 `"Object"`——`Object.prototype.toString.call([])`
在 Node 里是 `"[object Array]"`，本仓给 `"[object Object]"`（**静默错值**）。
**`typeof` 的标签名不在这里算**：这一层要的是**大写的类名**
（`"Array"` / `"Number"`），与 `props.xl.md` 的 `TypeOfName` 是两张表。

**包装对象那三格是第 690 轮补的**（`new Number(3)` → `"Number"`）：它就是 JS 算法里的
`[[NumberData]]` / `[[StringData]]` / `[[BooleanData]]` 三个内部格，而本仓的箱
**已经把那个原值存在 `__box` 那一格里**（`MakeBox`）——所以这一档不是「猜」，
是**读已经有的那一格**；照原型认反而会把 `Object.create(Number.prototype)` 答错。

```ts
// **`arguments` 先分出去**（第 702 轮）：它是数组（`vm.xl.md` 就是这么造的），
// 可 JS 给的是 `"[object Arguments]"`（判据 `stdlib/object/138-object-tostring-arguments-gap`）。
// **必须排在下面「数组先认」那一句之前**——那一句的判据就是 `Tag === Array`，
// 排在它后面等于永远读不到。
if (IsArgumentsValue(table, value)) return "Arguments";
// **数组先认**（它有自己的标签，不是「普通对象」）。
if (value.Tag === ValueTag.Array) return "Array";
// **函数那一档**：`typeof` 给 `"function"`，这里的标签**默认**是 `"Function"`。
// **它排在「带可调用载荷的对象」那一条抛之前**，见下面那一条的说明。
//
// **函数的标签也要先问 `Symbol.toStringTag`**（第 730 轮）——**这一句是规范的原话**：
// `Object.prototype.toString` 里 `builtinTag` 只回答「没有 `@@toStringTag` 时给什么」，
// 而生成器 / `async` 函数**正好有那一格**（在 `%GeneratorFunction.prototype%` 一族上）：
// `Object.prototype.toString.call(function* () {})` 在 Node 里是
// `"[object GeneratorFunction]"`，本仓原来给 `"[object Function]"`（**静默错值**）。
// **次序反了就读不到**：先答 `"Function"` 的话，`Get(O, @@toStringTag)` 那一步
// **根本轮不到**——而那一步正是 `Map` / `Promise` 那几族标签的**唯一**来处
// （它们也是**可调用的对象**：`Object.prototype.toString.call(Map)` 在 JS 里是
// `"[object Function]"`，靠的就是「`Map` 自己没有 `@@toStringTag`」这一点）。
// 所以这里**不是**给函数另开一档，而是**把规范那一步挪到前面**。
if (value.IsCallable()) {
  const callableTag = ObjectTagOverride(room, call, table, protos, value);
  if (callableTag !== "") return callableTag;
  return "Function";
}
if (value.Tag === ValueTag.HostRef) return "Function";
// **其余原始值**（第 228 轮）：`typeof` 的名字首字母大写就是 JS 的标签
// （`"number"` → `"Number"`、`"string"` → `"String"`、`"boolean"` → `"Boolean"`、
//  `"undefined"` → `"Undefined"`、`null` → `"Null"`、`"symbol"` → `"Symbol"`）。
// **`null` 与 `undefined` 不在这里**：`InvokeGlobal` 那两支**先**把它们答掉了
// （`Object.prototype.toString.call(null)` 是 `"[object Null]"`）。
if (value.Tag === ValueTag.Int32 || value.Tag === ValueTag.Float64) return "Number";
if (value.Tag === ValueTag.String) return "String";
if (value.Tag === ValueTag.Bool) return "Boolean";
if (value.Tag === ValueTag.Symbol) return "Symbol";
// **可调用对象**（`String` / `Number` / `Function` 那些宿主载荷）：JS 印源码文本。
//
// **第 730 轮试过把这一档答成 `"Function"`、当场退回来了**（**量出来的话留在这一条**）：
// `Object.prototype.toString.call(String)` 在 Node 里确实是 `"[object Function]"`
//（实测：`Function.prototype` 与 `%GeneratorFunction%` 也都是），所以「答 `Function`」
// 单看这一格是**对的**。可**这一档不是只有 `Object.prototype.toString` 在用**：
// `String + 1` / `String(String)` 走的是 `ToPrimitive` → `toString`，
// 而本仓 `String.toString` 命中的**正是这一格**（带可调用载荷的对象不算
// `IsCallable()`，于是 `props.xl.md` 那条「借 `protos.Function` 找一次」够不着它）
// ⇒ 那一句从**响亮地抛**（`tests/runtime/check.mjs` 第 8643 条那一档钉着它）
// 变成 `"[object Function]1"` —— **静默错值**（Node 给
// `"function String() { [native code] }1"`）。
// **它比「进不了门」危险得多**，所以这一格维持原样：**要收它得先把
// 「带可调用载荷的对象也走 `protos.Function` 那一趟」做出来**（那样 `String.toString`
// 才是 `Function.prototype.toString`、`String + 1` 才有真答案），
// 而那一步要连带解决「`FunctionSourceText` 从中读出函数名」——是另一件事。
if (table.Get(value.Ref).Host !== null) {
  throw new Error("unimplemented: Object.prototype.toString of a callable object (JS renders source text)");
}
// **`Error` 那一族先问**（第 229 轮把次序摆正）：JS 里 `Object.prototype.toString`
// **不特判 `Error`**——它按普通对象那条走，而 `Error.prototype` 上**没有**
// `Symbol.toStringTag`，所以答案是 `"[object Error]"`（**不是** `"Error: x"`！）。
// **`"Error: x"` 是 `Error.prototype.toString` 的答案**——同一个值、两个方法、两个答案，
// 混起来就是「`String(e)` 也对、`Object.prototype.toString.call(e)` 也『对』」（**静默错值**）。
// **`TypeError` / `RangeError` 两族自然落在同一个标签上**（它们的原型链经过 `Error.prototype`，
// 而 JS 给 `"[object Error]"`——实测 `Object.prototype.toString.call(new TypeError())`）。
if (value.Tag === ValueTag.Object && RtChainHas(table, value, protos.Error)) return "Error";
// **`Symbol.toStringTag` 说了算**（第 229 轮）：它**排在**标记格那三族之前——
// `new Map()` 明明带 `__k` 标记，可 JS 给的是 `"[object Map]"`，
// 而那一格**正是** `Map.prototype[Symbol.toStringTag]` 供的（本仓没有那一格，
// 所以下面那三族照旧抛）。**顺序反了**就会让「自己的 `toStringTag`」被标记格抢先。
const tag = ObjectTagOverride(room, call, table, protos, value);
if (tag !== "") return tag;
// **包装对象**（第 690 轮）：`Object.prototype.toString.call(new Number(3))` 在 JS 里是
// `"[object Number]"`（`String` / `Boolean` 两族同理）——本仓原来一律落成
// `"[object Object]"`（**静默错值**：箱造出来了、`typeof` / `valueOf` / 加法都对，
// 只有这一格在说谎，判据 `137-beh-boxed-primitives` 量的就是它）。
//
// **位置是语义**：它**排在 `Symbol.toStringTag` 之后**——JS 的算法是
// 「先 `Get(O, @@toStringTag)`，不是字符串才用内部标签」，所以箱自己带了
// `toStringTag` 就该让那个说话（判据 `r690-box-tag-override` 钉着这一句）。
//
// **凭什么认出「这是箱」**：`UnwrapBox` 的判据是「**自有**那一格 `__box` 在不在」
//（`FindProperty` 找到之后还要问 `Owner === 自己`）。所以 `Object.create(Number.prototype)`
// **不是**箱——JS 给 `"[object Object]"`（它没有内部格），照原型认就会把这一档答反
//（判据 `r690-box-not-created` 钉着它）。
if (value.Tag === ValueTag.Object) {
  const inner = UnwrapBox(table, value);
  if (inner.Tag === ValueTag.String) return "String";
  if (inner.Tag === ValueTag.Bool) return "Boolean";
  if (inner.Tag === ValueTag.Int32 || inner.Tag === ValueTag.Float64) return "Number";
}
const marker = DateMarker(table, value);
if (marker !== "") {
  throw new Error("unimplemented: Object.prototype.toString of a " + marker + " (JS needs Symbol.toStringTag)");
}
return "Object";
```

# method ObjectTagOverride:(room:RoomChecker, call:NativeCall | null, table:HeapTable, protos:Protos, value:Value)=>string

**这个对象自己的 `Symbol.toStringTag`**（第 229 轮）——没给、或者给的**不是字符串**就给空串。

**它是 JS 里 `Object.prototype.toString` 的第一步**：
`o[Symbol.toStringTag]` 是字符串就印 `"[object " + 它 + "]"`（`{ [Symbol.toStringTag]: "Custom" }`），
否则走内置那一串分派。

**为什么只认字符串**：JS 的口径是「`ToString` 之后用它」，而**非字符串那一档**
没有判据能证（`42` 要变 `"42"`、对象要先 `ToPrimitive`，两档都要通道）——
**不给近似值**：不是字符串就当它没有（退到内置分派，而那一条**要么给对、要么响亮地抛**）。

**符号从哪来**：`protos.WellKnownSymbols` 那张**语言层填的小表**
（`props.xl.md`，第 184 轮）——引擎不该认识 `Symbol` 这六个字，
而这一层是**语言层**，所以它问的是**自己填的那张表**。

**第 306 轮把「取值」那一步改对了**（原来是 `FindProperty`，只认数据属性）：
JS 的 `o[Symbol.toStringTag]` 是一次 **`[[Get]]`**——**访问器要调 getter**。
`class C { get [Symbol.toStringTag]() { return "Custom" } }` 是日常写法，
而原来那一支对访问器**直接 `return ""`** ⇒ `Object.prototype.toString.call(new C())`
给 `[object Object]`（Node 给 `[object Custom]`，**静默错值**）。
**与 `Object.assign` 的展开那一处是同一个根**：读属性有两条路，
这两处走的是**没有访问器那一档**的那条。

**没有通道时退回老口径**（`call === null`）：照旧只认数据属性——
宁可少答一格，也不能为了「看起来支持访问器」去猜一个值。

```ts
if (protos.WellKnownSymbols <= 0) return "";
// **闭包也走这一条**（第 730 轮）：生成器 / `async` 函数的那一格
// `Symbol.toStringTag` 就挂在**它们自己的原型**上（`%GeneratorFunction.prototype%` 一族），
// 而闭包在值模型里是 `ValueTag.Closure`（不是 `Object`）——原来那一句
// 「不是对象就给空串」会把它们**一律**挡在门外 ⇒ `"[object Function]"`。
// **`ValueTag.Function`（宿主函数）不进来**：本仓给它们挂不到任何原型，
// 放进来只会多一次走链的查找（答案仍然是空串）。
if (value.Tag !== ValueTag.Object && value.Tag !== ValueTag.Closure) return "";
const symbolTable = Value.FromObject(protos.WellKnownSymbols);
const lookupKey = Value.FromString(table.CreateString(Units("toStringTag")));
const tagSymbol = GetProperty(NeverRoom, NeverCall, protos, table, symbolTable, lookupKey);
if (tagSymbol.Tag !== ValueTag.Symbol) return "";
let tagValue = Value.Undefined();
if (call !== null) {
  // **走 `[[Get]]`**：数据属性给值、访问器调 getter、原型链照旧走
  //（`Map.prototype[Symbol.toStringTag]` 就在链上）。
  // **它可能重入脚本**（getter 是脚本）——所以先问一次 room，
  // 让回收落在「值还不存在」的时候（与上面 `Object.assign` 那一处同一条纪律）。
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
**`Number.isInteger(x)`**（第 126 轮）——`Number` 是**普通对象**（与 `Array` / `Math` 同款），
上面挂几个静态判定。**只认真整数**：`Int32` 一律真、
`Float64` 要有限且是整数，其余（字符串 / `null` / …）一律假（**不做转换**，与 JS 一致）。

# const NumberIsNaN:int = 321

**`Number.isNaN(x)`**——**只认真正的 `NaN`**（`Float64` 那条自比较）；
`"abc"` / `undefined` 一律假（JS 也是）。

# const NumberIsFinite:int = 324

**`Number.isFinite(x)`**（第 149 轮补）——**不做转换**（与 `Number.isNaN` 同一条口径）：
只认 `Int32` / `Float64` 且有限，其余（字符串 / `null` / `NaN` / `±Infinity`）一律假。
`isFinite("3")` 是 `true`（全局那个先转），`Number.isFinite("3")` 是 `false`——
**两份的差别就是「转不转」这一格**。

# const IsNaN:int = 322
**全局的 `isNaN(x)`**（第 149 轮补）——**与 `Number.isNaN` 不是一回事**：
它先做 **`ToNumber`**（`isNaN("abc")` 是 `true`——字符串转不成就给 `NaN`），
而 `Number.isNaN("abc")` 是 `false`。

**实现就是「先转再自比较」**：转那一步借**第 145 轮**那条 `NumberFromValue`
（`Number(x)` 的语义只有一份——这里再写一遍前缀/进制扫描就是第二份会走偏的实现）。

# const IsFinite:int = 323

**全局的 `isFinite(x)`**（第 149 轮补）——同样**先 `ToNumber`**
（`isFinite("3")` 是 `true`、`isFinite("abc")` 是 `false`）。

**`NaN` 与 `±Infinity` 都是假**：`Number(x)` 出来是 `NaN` / `±Infinity` 就假
（`NaN !== NaN` 那一条自比较在这里就够了，不必再调库）。

# method DigitValue:(unit:int)=>int

**一位数字的值**（`0-9` / `a-z` / `A-Z` → `0..35`）；不是数字给 `-1`。

**为什么不借 `JsonHexDigit`**：那个只认**十六进制**，
而 `parseInt` 的基数一直开到 **36**（`parseInt("zz", 36)` 是 `1295`）——
判据现场就是在这里红的（我第一版借了十六进制那个解码器，`"zz"` 给了 `NaN`）。

```ts
if (unit >= 48 && unit <= 57) return unit - 48;
if (unit >= 97 && unit <= 122) return unit - 87;
if (unit >= 65 && unit <= 90) return unit - 55;
return -1;
```

# method ParseIntText:(units:Array<int>, radix:int, hasRadix:bool)=>Value

**`parseInt` 的正身**：从码元里取最长的合法整数前缀（见 `ParseInt` 那一段的口径）。

**累加用宿主双精度**（与 JS 一致——`parseInt` 的结果本来就是「一个数」）；
**整的、且在 `i32` 里就给 `Int32`**（与 `MathResult` 同口径），其余给 `Float64`。

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
// **基数的规整照 JS**：给了且**非 0** 就按它（**2..36 之外一律 `NaN`**），
// 否则（没给 / 给了 0）看 `0x` 前缀——**前缀要在这一步就吃掉**。
// 判据现场在这里红过一次：我第一版把「没给」直接当成 10、于是 `parseInt("0x1f")` 给了 `0`
//（JS 给 31）。
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
  // **给了 16 也吃掉 `0x`**（JS：`parseInt("0x10", 16)` 是 16）。
  at = at + 2;
}
let value = 0;
let digits = 0;
while (at < units.length) {
  // **基数的上限是 36**，所以这里用通用的数字解码器（不是十六进制那个）。
  const digit = DigitValue(units[at]);
  if (digit < 0 || digit >= base) break;
  value = value * base + digit;
  digits = digits + 1;
  at = at + 1;
}
if (digits === 0) return MathResult(NaN);
// **负号要乘、不要减**（第 330 轮）：规范写的是 `sign × number`，
// 而 `0 - value` 在 `value === 0` 那一格给的是 **`+0`**——`0 - 0` 是正的。
// 于是 `parseInt("-0")` 印 `0`（Node 印 **`-0`**，**静默错值**，
// 判据 `c330-std-number-parse-edges` 量的就是它）。
// **`-1 * 0` 才是 `-0`**——乘法保住了符号位，而减法把它抹平了。
// **这一格不能靠 `MathResult` 兜**：它收的是**算完的数**，
// `0 - 0` 到它手上时符号已经没了（`MathResult(-0)` 自己是对的，见那一格）。
return MathResult(negative ? -1 * value : value);
```

# method ParseFloatText:(units:Array<int>)=>Value

**`parseFloat` 的正身**：切出最长的合法前缀，再**交给宿主**做十进制 → 双精度
（与 `JsonParseNumber` 同一条理由：正确舍入是 IEEE 754 的活儿）。

**前缀的文法**：`[+-]? ( Infinity | digits [. digits] [exp] | . digits [exp] )`——
`"1e"` 只吃到 `1`、`"1.5px"` 吃到 `1.5`、`".5"` 是 `0.5`、`"Infinity"` 是无穷。

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
// `Infinity` 单独认（它没有数字位）。
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
// **指数只在后面真跟着数字时才吃**（`"1e"` 该给 `1`）。
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


**字符串拼接**（第 125 轮）——**它不是全局名**，是**降级层**发的一条内部调用
（`a + b` 里有字符串字面量时落到这里，见 `lowering.xl.md` 的 `ConcatValues`）。
与 `DateCtor` 同一类：号在全局段里、脚本看不见、由 `InstallBuiltins` **登记进能力表**
（不登记就报「capability is not registered」）。

**它为什么必须存在**：引擎的 `RtOp.Add` 只渲染它认识的那几档，
遇到**对象 / 数组 / 浮点**会**抛**——而 `"x=" + obj` 这种写法遍地都是。
「对象渲染成什么」是**语言层**的决定（`text.xl.md` 的 `ValueUnits`），引擎不认识它。

**实参两个都要**（JS 的 `+` 是从左到右求值，降级层已经把两格算好了）；
结果**一定是字符串**——因为调用点上已经保证「有一边是字符串字面量」
（`1 + "x"` 也是 `"1x"`，照 JS 给）。

# const TemplateConcat:int = 305

**模板串的拼接**（第 288 轮）——与 `StringConcat` **共用同一支实现**，
只把 hint 从 `default` 换成 **`string`**。

**为什么非得分两格**：JS 里这两件事的 `ToPrimitive` **hint 不同**：

| 写法 | 规范里的第一步 | 先问谁 |
| --- | --- | --- |
| `"x" + o` | `ToPrimitive(o, default)` | **`valueOf`** |
| `` `${o}` `` | `ToString(o)` ⇒ `ToPrimitive(o, string)` | **`toString`** |

于是 `const a = { valueOf: () => 5, toString: () => "T" }` 上两个答案**必须不同**：
`a + 1` 给 `6`、`` `${a}` `` 给 `"T"`。
本仓原来**两处都走 `StringConcat`**（`default`）⇒ `` `${a}` `` 给 `"5"`——
**静默错值**，判据 `object-valueof-override` 量的就是它。

**为什么不给 `StringConcat` 加一个「hint 实参」**：那条路的调用方是**降级层的 `+`**
（`ConcatValues`），它永远不需要别的 hint；多一个只被一处用的实参
就是**多一处能传错的地方**（第 283 轮那条：判据分两份迟早走偏）。
两个号、一支实现 才是这一层本来的形状（`ParseInt` / `String.fromCharCode` 那一族同款）。


# const StringCtor:int = 220

**`String(x)`** 的能力号（第 145 轮）——**把它当函数调**那一档。

**它为什么一直没做**：`String` 是一个**对象**（上面挂着 `fromCharCode` 与 `prototype`），
而值模型原来只有两半里的各一半（宿主引用能被调、对象能带属性，**两样都占的没有**）。
第 145 轮给堆加了一格**可调用载荷**（`heap.xl.md` 的 `AttachCallable`），
于是 `String` **同时**是这两样：`String.fromCharCode` 照用、`String(1)` 也通、
`typeof String` 报 `"function"`。

**`String()` 与 `String(x)` 的语义**：任意值 → 文本（走 `text.xl.md` 的 `ValueUnits`，
与 `console.log` 那条**同一个出口**）；不给实参给 `""`（JS 的口径）。

**已知差异**（写在明处）：`new String(1)` 走的是**调用**那一支——JS 会给一个**装箱对象**，
而本仓没有装箱那一层（与「`"x" instanceof String` 一律假」同一条）。

# const NumberCtor:int = 221

**`Number(x)`** 的能力号（第 145 轮）——JS 的 `ToNumber`。

**它不是 `parseInt` / `parseFloat`**（那两个在下面，各自一条）：那两条是**前缀**口径
（`parseInt("12px")` 给 `12`），而 `Number("12px")` 给 **`NaN`**——
**整串都得是数**。所以它走 `NumberFromHostText`（`runtime/host-text.xl.md`，
「十进制文本 → 双精度」的唯一一处），而不是自己写一遍前缀扫描。

**对象要 `ToPrimitive`**（`Number({})` 在 JS 里是 `NaN` / `Number([])` 是 `0`）——
**第 198 轮做出来了**，所以这一档**不再抛**：`NumberFromValue` 转调引擎的
`ToNumberOf`（一元 `+x` 问的也是它——**同一个 `ToNumber` 只有一处**）。

# const BooleanCtor:int = 222

**`Boolean(x)`** 的能力号（第 145 轮）。

**它就是 `rt.xl.md` 的 `RtToBoolean`**（`TruthyOf` 的包装）——
**不是另一个真假口径**：`Boolean("")` 是 `false`，而第 144 轮之前那条口径给 `true`
（那一轮的账在 `typescript-exec/README.md` 里）。

# const ArrayCtor:int = 223

**`Array(长度)` / `new Array(长度)`** 的能力号（第 145 轮）。

**调用与构造是同一件事**（JS 里两者等价），所以只有一个号。

**两种实参形态**（JS 的口径）：**一个数**是**长度**（`new Array(3)` 给三个洞，
`0 in arr` 为假），**其余**（零个或多个）是**元素**（`Array(1, 2)` 给 `[1, 2]`）。

**长度那一档复用 `HeapArray.Truncate`**：它的规矩**本来就是**「变长时新增的格子全是洞」
（`heap.xl.md` 写着这一条）——正是 `new Array(n)` 的语义，不必再写一遍。

# const ObjectCtor:int = 225

**`Object(x)` / `new Object(x)`** 的能力号（第 232 轮）。

**JS 里两者给的东西不一样**（这是这一格要记住的第一件事）：
`Object(null)` 是 **`null`**（它把任意值**转成对象**，而 `null` / `undefined` **转出来还是自己**），
`new Object(null)` 是**一个空对象**（构造那条路**永远**给新对象，实参不参与）。

**这一轮只做「能证的那一半」**：
- **`Object(x)` 有实参、且 `x` 已经是对象** ⇒ 原样返回（`Object({a: 1}).a` 是 `1`）；
- **`Object()` 没实参** ⇒ 造一个空对象；
- **`Object(null)` / `Object(undefined)`** ⇒ 原样返回 `null` / `undefined`；
- **`Object(原始值)`** ⇒ **响亮地抛**。JS 在这里给**包装对象**
  （`Object(1)` 是一个 `Number` 对象、`typeof` 是 `"object"`），
  而本仓**一个包装对象都没有**（`new Number(1)` 那一族也没做）——
  **给一个贴了原型的普通对象**是**静默错值**（`typeof` 会是 `"object"` 而内容不对），
  所以宁可不做（与「不能给近似值的那几格」同一条纪律）。

**它跟 `Array` 一样是「调用与构造同一个号」**——**这是这一轮的已知差**：
本仓的宿主 ABI **不告诉被调方「这一次是 `new` 还是普通调用」**（`HostInvoker` 只有
`(id, self, args)`），所以 `new Object(null)` 与 `Object(null)` 走的是**同一条**。
**它选了「原样返回」那一半**：`Object(null)` 是真答案，
而 `new Object(null)` 在普通 `.ts` 里**几乎不写**（判据 `global-array-object-ctors`
用的正是 `new Object(null as any) !== null`——**按 JS 那是 `true`**，
所以那一条判据还差**这一格**（第 675 轮起它**在矩阵里**：
[`gap-std-new-object-null`](../../tests/cases/stdlib/object/109-std-new-object-null.ts)，登在
它的 `xl:why`）。
**要做对它得先给宿主 ABI 加一位「这次是不是构造」**——那是另一件事。

# const PowId:int = 224

**`a ** b`（幂）** 的能力号（第 149 轮）——**它不是全局名**，是**降级层**发的一条内部调用
（与 `StringConcat` 同一类：号在全局段里、脚本看不见、由 `InstallBuiltins` 登记）。

**为什么它走这一层、不进引擎的算子表**（这是这一轮**特意绕开**的一格）：
`RtOp.Pow` 那一格**早就留着**（设计期就编了号），但**幂的舍入没有标准定死**——
IEEE 754 **不要求** `pow` 正确舍入，所以 V8 的 `Math.pow` 与 C++ 的 `std::pow`
**可能差最后一位**。而 `runtime/host-text.xl.md` 那条规矩是
「**借的必须是结果被标准定死的东西**」（十进制 ↔ 双精度那条有 IEEE 754 兜着）。
把 `pow` 塞进引擎就等于**偷偷破那条规矩**；放在**建库层**就名正言顺——
这一层本来就是「JS 家族语义 + 一处诚实的宿主借用」，而 `Math.pow` **早就在这儿**
（`MathPow` = 212）。所以 `**` 与 `Math.pow(x, y)` 走**同一行代码**：
JS 的规范本来就说 `**` 的语义**就是** `Math.pow`。

**已知的跨目标差**（写在明处）：C++ 那一侧的 `std::pow` 可能与 V8 差最后一位——
与 `host-text.xl.md` 里记的「指数形式写法可能差字符」同族（P1 对拍时收）。

```ts
if (id === PowId) {
  // **与 `MathPow` 一字不差**（同一个语义只有一份实现）。
  return MathResult(Math.pow(NumericOf(args[0]), NumericOf(args[1])));
}
```

# const GeneratorThrowId:int = 711

**「生成器的 `throw`」那一格**（第 313 轮）——`it.throw(e)` 落到这里，
实现在**引擎**里（在挂起点抛 `e`：`vm.xl.md` 的 `ResumeRaises`）。

# const GeneratorSelf:int = 427

**`gen[Symbol.iterator]()`**（第 320 轮）——与 `AsyncGeneratorSelf` 那一条**同一个形状**：
JS 的口径就是**返回它自己**，所以这一支也只做「把 `self` 交出去」。

**它是怎么做这一格时顺手量到的**：做完 `Symbol.asyncIterator` 那一格，顺手量了**同步**生成器
——Node 给 `typeof gen[Symbol.iterator] === "function"`、本仓给 `undefined`，
**同一个缺口**（`for..of` 走指令、不问这一格），只是**同步那一半**。
**两格必须分开挂**：同步生成器有 `Symbol.iterator` 而**没有** `Symbol.asyncIterator`；
异步生成器**两个都有**（它继承 `Generator` 那一格）——所以
`Symbol.iterator` 挂 `Generator`、`asyncIterator` 挂 `AsyncGenerator`。

# const AsyncGeneratorSelf:int = 426

**`asyncGen[Symbol.asyncIterator]()`**（第 320 轮）——号在**全局段**（`422..425` 是
第 311 轮那四条百分号编解码，这一格接在它们后面；它**不是全局名**：脚本里没有
叫这个名字的东西，只是原型上一格方法的能力号）。——JS 的口径就是**返回它自己**
（与同步生成器的 `[Symbol.iterator]()` 一样），所以这里**一行实现都不用写**：
那一支只做「把 `self` 交出去」（见 `InvokeGlobal` 里那一句）。

**为什么这一格值得存在**：`for await` 在**引擎**里走的是指令那条路
（`iter_new` / `iter_next`），**根本不问这一格**——与第 308 轮
`Array.prototype[Symbol.iterator]` 那一条**一模一样**：`for await` 一直是对的，
而**显式取出来自己调**报 `it[Symbol.asyncIterator] is not a function`
（那句话听起来像「异步迭代还没做」，真相是**没人往这一格挂东西**）。
判据 `c305-ex-async-generator-interface-type` 钉的就是 `typeof` 那一问。

**挂在哪一格是**有讲究的**：只挂 `protos.AsyncGenerator`（**不能**挂 `protos.Generator`）
——同步生成器要是也带上它，就会**自称可异步迭代**（JS 里那是 `TypeError`，
**说谎比缺一格更坏**）。

# const GeneratorReturnId:int = 710

**「生成器的 `return`」那一格**（第 313 轮）——`it.return(v)` 落到这里，
而它今天**响亮地抛**（要跑 `finally` 链，而那条链是降级期的构造，
见 `GeneratorNextId` 那一段）。

# const SymbolCtor:int = 250

# const SymbolDescription:int = 251

**`s.description`**（第 241 轮）——**由 `get_prop` 那条路特判**
（符号值不是一个对象、没有原型那一格，所以它不能像 `Map` 的 `size` 那样挂在原型上）。

**回的是字符串或 `undefined`**（见 `InvokeGlobal` 里那一支）。
**`Symbol(description)`** 的能力号（全局段 200..299 里空着的号）。

**它不是构造函数**：JS 里 `Symbol()` **不带 `new`**（`new Symbol()` 会抛）——
所以它只是一个普通的宿主函数值，走 `Op.Call` 那条路，和 `Map` / `Set`（走 `Op.New`）不同。

# const SymbolFor:int = 252

**`Symbol.for(名字)`**（第 277 轮）——**全局注册表**：同一个名字永远给**同一个符号**
（`Symbol.for("a") === Symbol.for("a")` 是**真**，而 `Symbol("a") !== Symbol("a")`）。
**这一格是 `Symbol` 与别的构造器最不一样的地方**：别的都要「按身份」，
只有它要「**按名字去重**」——所以它必须有个地方**记着**。

# const SymbolKeyFor:int = 253

**`Symbol.keyFor(符号)`**（第 277 轮）——反查：**注册表里的**给名字、
其余的给 `undefined`。

**两个号都在 `250..259` 这一段里**（`Symbol` 家族：构造 250、`description` 251、
这两个 252 / 253）——与 `SymbolCtor` 挤在一段读起来顺。

**注册表放在哪**：`InvokeGlobal` 手里只有 `protos`（没有任何模块级的可变量，
这一层全是纯函数），所以注册表得**挂在一个够得着的对象上**——
用的是 `protos.WellKnownSymbols`（第 184 轮那张知名符号表），
条目**带一个前缀**（理由是「`keyFor` 不能把知名符号认成注册过的」，写在实现里）。

# const SymbolToString:int = 254

**`s.toString()`**（第 277 轮）——`description` 那一格的**兄弟**，
差别只有「交出去的是一个**能被调的东西**」（见 `vm.xl.md` 的 `SymbolToStringId`）。

**为什么它到今天才做**：`String(s)` 一直是好的（第 215 轮，那是**转文本**那条路），
而 `s.toString()` 是**取一格属性再调用**——符号没有原型那一格，
所以它和 `description` 一样**只能由引擎特判**，而特判那一支要交出一个 `HostRef`
（于是引擎得知道一个**语言层的号**——多一格 `DeclareSymbolToString`，见 `host-abi.xl.md`）。

**判据 `symbol-registry` 量的就是它**（那一句是 `a.toString() === c.toString()`，
第 273 轮普查收进来的）。

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

**它不是全局段里那条 `Date.now` 的路**：`Date.now()` 走的是**普通对象属性**
（`BuildGlobals` 把 `ClockNow` 挂成一个属性），而 `new Date(...)` 在 JS 里是**构造**。
两者在值模型里原来**不能同时成立**——`Date` 是个普通对象（能挂属性、**不能被 `new`**），
所以第 114 轮把这一支**交给降级层落地**：`new Date(毫秒)` 被降级成一条 `host_call(265, …)`。

**第 145 轮这条特例撤掉了**：`Date` 现在**自己**带一格可调用载荷
（`heap.xl.md` 的 `AttachCallable`），`new Date(ms)` 走的就是**普通的 `Op.New`**
（`vm.xl.md` 的 `DoNew` 那条宿主分支）。两个好处写在明处：

- 降级层少一条「只有直接写 `Date` 才认」的特例（**那条已知差异没有了**：
  `const D = Date; new D(0)` 现在也对）；
- `DateCtor` **不再需要登记进能力表**（它不是降级层发的内部调用了，
  而是**从那个值身上**取出来的）——`install.xl.md` 的名单里因此去掉了它。

**剩下的已知差异**：**几百亿以上的毫秒值写不进源码**——整数字面量是 i32
（与「浮点不能写成源码字面量」同族）。要喂大值就**用运行时算出来**。

# const DateGetTime:int = 266
`getTime()` 的号（返回毫秒）。
# const DateGetUTCFullYear:int = 267
`getUTCFullYear()` 的号（**UTC**——这一层不碰时区数据，明确的范围决定）。
# const DateGetUTCMonth:int = 268
`getUTCMonth()` 的号（**0 起**，与 JS 一致）。
# const DateGetUTCDate:int = 269
`getUTCDate()` 的号（**1 起**，与 JS 一致）。
# const DateGetUTCHours:int = 270
`getUTCHours()` 的号（0..23）。
# const DateGetUTCMinutes:int = 271
`getUTCMinutes()` 的号（0..59）。
# const DateGetUTCSeconds:int = 272
`getUTCSeconds()` 的号（0..59）。

**第 280 轮补的九格**（`Date` 家族：`284..292`）——它们围着**日历算术**转：
`toISOString`（正向）、七个 `setUTC*`（逆变换）、以及**静态的 `Date.UTC`**
（也是逆变换，只是不带接收者）。
**两个方向都要有**：`DateParts` 从第 138 轮起就给了正向，而**逆变换一直没有**——
`Date.UTC` 与七个 `setUTC*` 全都要它（判据 `date-utc-setters` 与 `date-iso-and-json` 量的正是这两半）。

**为什么从 `284` 起、而不是接着 `272` 往下排**（**这一轮踩到了**）：
`273..279` 确实是空的，可 **`280` / `281` / `282` / `283` 已经被
`ErrorCtor` / `TypeErrorCtor` / `RangeErrorCtor` / `SyntaxErrorCtor` 占了**——
第一版把这一批排在 `273..281`，于是 `DateUTC` **撞上了 `TypeErrorCtor`**，
而分派表**先问错误构造器那一支** ⇒ `Date.UTC(2020, 0, 2)` 返回了一个
**`TypeError` 对象**（`console.log` 打出来是 `[Function (anonymous)]`，
而真相是「号撞了」，**离现场很远**）。
**这是这一个文件里的老毛病**：第 150 轮 `ArrayAt = 22` 撞上 `ArrayFlat = 22` 是同一个形状
（那一次是 `flat()` 静默给 `undefined`）。**规避办法只有一条**：
加号之前**把这一段已经用掉的号看一遍**，而 `# const` 那一串就是那份名单。
**从 `284` 起整段排** 就绕开了那四格，而且读起来也顺（「错误家族之后是日期家族」）。

# const DateToISOString:int = 284

**`Date.prototype.toISOString`**（第 280 轮）——`DateIsoText` 的正身。

# const DateToJSON:int = 503

**`Date.prototype.toJSON`**（第 605 轮）——**与 `toISOString` 分开的第二个号**，号**追加在表尾**。

**为什么不能合用一个号**（第 280 轮起它们一直合用，直到这一轮）：JS 里两档对**非法日期**
的回答**不一样**——`toISOString` **抛 `RangeError`**、`toJSON` 给 **`null`**
（规范 `Date.prototype.toJSON`：`tv` 不是有限数就返回 `null`）。合用一个号时那一档只能挑一个，
于是 `JSON.stringify(new Date(NaN))` 会**抛**（Node 给 `null`——判据
`c371-stdlib-date-parse-and-json` 量的就是这一格）。**合法日期那一档仍是同一份实现**
（两处都取 `DateIsoText`）。

# const DateSetUTCFullYear:int = 285

# const DateSetUTCMonth:int = 286

# const DateSetUTCDate:int = 287

# const DateSetUTCHours:int = 288

# const DateSetUTCMinutes:int = 289

# const DateSetUTCSeconds:int = 290

# const DateSetUTCMilliseconds:int = 291

**七个 `setUTC*`**（第 280 轮）——**一个模板套七次**（见下面那一支）。

**它们与 `getUTC*` 是同一件事的两面**：读那一半第 138 轮就有了，
写这一半原来**整族不在**（`typeof d.setUTCFullYear` 给 `undefined`）。

# const DateUTC:int = 292

**静态的 `Date.UTC(年, 月?, 日?, 时?, 分?, 秒?, 毫秒?)`**（第 280 轮）——
**与七个 `setUTC*` 是同一条逆变换**，差别只有「没有接收者」（它不读当前值、
缺的那几格按 JS 的默认值补）。

**它的默认值与 `new Date(...)` 那一条不同**（`月` 缺省 `0`、`日` 缺省 `1`、
`时/分/秒/毫秒` 缺省 `0`），而**年份的 `0..99` 要加 1900**（JS 的口径）。

# const DateParse:int = 368

**静态的 `Date.parse(文本)`**（第 293 轮）——号**追加在表尾**。

**收的是 ISO 8601 的一个最小子集**：`YYYY-MM-DD`、`YYYY-MM-DDTHH:mm`、
`…:ss`、`…:ss.sss`，后面可跟 `Z` / `±HH:mm` / 什么都不跟。
**其余形状一律给 `NaN`**（不猜——`"Jan 1 2020"` / `"2020/01/02"` 这一族要么是本地化的、
要么歧义，编一个答案就是**静默错值**）。
**`new Date(字符串)` 走的是同一条**（见 `DateCtor`）。

# const DateToString:int = 369

**`Date.prototype.toString`**（第 293 轮）——号**追加在表尾**。

**第 293 轮只做「非法日期」那一档**（JS 的 `String(new Date(NaN))` 是 **`"Invalid Date"`**，
**与时区无关** ⇒ 逐字节对得上）；**合法日期按 UTC 渲染**是第 616 轮补的
（见 `DateTextOf`：本仓没有时区库，本地那一族 getter 本来就当 UTC 用，
`String(d)` 与 `d.getHours()` 必须自洽——**与 Node 的差距只剩时区那一截**，
Node 在 `TZ=UTC` 下与本仓逐字节相同）。

# const DateGetUTCMilliseconds:int = 370

**`getUTCMilliseconds` / `getMilliseconds`**（第 293 轮）——号**追加在表尾**。
它与 `getUTCSeconds` 同一族，只是**那一格以前没人要**（`DateClockParts` 早就给了）。

# const DateGetUTCDay:int = 371

**`getUTCDay` / `getDay`**（第 293 轮）——**星期几**（`0` = 周日）。
**它是从纪元起的天数对 7 取模**（`1970-01-01` 是**周四** ⇒ `0` 对应周四，
所以要先 `+4` 再取模）——**这个偏移写错就是静默错一天**，判据 `date-getters-and-setters`
钉着它。

# const DateToUTCString:int = 680

**`toUTCString` / `toGMTString`**（第 702 轮）——`DateIsoText` 的**可读**那一种拼法。

**为什么它可以做、而 `toDateString` / `toLocaleString` 不行**：UTC 那一种是
**与时区、区域表都无关**的固定拼法（`Thu, 02 Jan 2020 03:04:05 GMT`），判据逐字节对得上；
而 `toDateString` 要**本地时区**与**星期/月份英文名**、`toLocaleString` 要**一张区域表**
（`2020/1/2 11:04:05` 是 ICU 给的形状）——两者都是另一件事
（前者登在 `stdlib/date/040-r676-std-date-todatestring` 的台账里，后者与 `Intl` 整族一起没做）。
**`toGMTString` 与它是同一个号**：JS 里那一格就是 `toUTCString` 的**别名**
（规范直接指过去），写第二份实现就是第二份会漂的答案。

**号为什么落在这里**（`680`）：**`700..799` 是对象辅助函数那一段**
（`install.xl.md` 的 `InvokeObjectHelper` **先接走**，见 `ObjectToLocaleString` 那一段的账），
`709..712` 那几格（生成器三格 + `SpeciesGetterId`）也在里面。
**第一版把这一批排在 `713..717`**，于是 `d.getTimezoneOffset()` 报
**`unimplemented: object helper 714`**、`d.toUTCString()` 报
**`define_data needs (object, key, value)`**——**号撞了**，而症状里没有一个字提到号
（与第 280 轮 `DateUTC` 撞上 `TypeErrorCtor`、第 150 轮 `ArrayAt` 撞上 `ArrayFlat` 同一个形状）。
`680..684` 是这一段**空着**的格子，且**不在**那道拦截后面。

# const DateGetTimezoneOffset:int = 681

**`getTimezoneOffset`**（第 702 轮）。

**本仓给 `0`**——这是**本仓那条一贯的口径**，不是「没做」：本仓的**本地时间就是 UTC**
（`InstallDateMethods` 那一段写着：本地那一族 getter 与 UTC 共用同一个号，
所以「构造用哪个口径、读取就用哪个口径」自洽）。`getTimezoneOffset` 若去答机器的
真时区，`d.getHours()` 与 `d.getTimezoneOffset()` 就**互相矛盾**了
（前者按 UTC、后者按 UTC+8）。
**代价写在明处**：Node 在同一台机器上给 `-480`，所以「拿它算本地时间」的程序
在本仓会得到一个与 Node 不同的偏移——那一格登在
`stdlib/date/039-r676-std-date-gettimezoneoffset` 的台账里
（判据只钉「是个在 `[-1440, 1440]` 里的整数」，那一档两边都真）。

# const DateGetYear:int = 682

**`getYear`**（第 702 轮）——`getFullYear() - 1900`（JS 的**废弃**成员，
可它实实在在在 `Date.prototype` 上，`Object.getOwnPropertyNames` 数得出来）。

# const DateSetTime:int = 683

**`setTime`**（第 702 轮）——**把 `__t` 直接写成给的那个毫秒数**，返回它。

**它不走 `DateMakeMs`**：JS 的 `setTime` 就是「换一个时间值」，不做日历分解
（`setTime(NaN)` 于是把实例变成 Invalid Date——与那七个字段 setter 不是一回事）。

# const DateSetYear:int = 684

**`setYear`**（第 702 轮）——**`0..99` 要加 1900**，与 `new Date(年, …)` / `Date.UTC`
那两条**一字不差**（`d.setYear(99)` 给 1999 年，而 `d.setFullYear(99)` 给公元 99 年——
**两格差 1900 年**，正是这一条规矩存在的理由）。

# const ReferenceErrorCtor:int = 326

**`ReferenceError`**（第 295 轮）——号**追加在表尾**（`280..283` 那一段已经占了四个）。

**它是「等有判据了再补」那条规矩的例子**：第 277 轮补 `SyntaxError` 时，
`props.xl.md` 那一格明写着「剩下三个名字（`ReferenceError` / `URIError` / `EvalError`）
**没有判据**，所以先不占名字」——第 295 轮判据来了
（`c291-error-families-and-messages` 把五个族排在一起），于是照规矩补上。

# const AggregateErrorCtor:int = 327

# const URIErrorCtor:int = 375

# const EvalErrorCtor:int = 376

**`URIError` / `EvalError`**（第 376 轮）——号**追加在表尾**（`372..374` 给数学那三格，
而 `301..371` 那一段全是别的族）。**`326` / `327` 是第 295 轮那两格**，挨着看的。

**它们是「等有判据了再补」那条规矩的第二个例子**：第 277 轮 `props.xl.md` 那一格明写着
「剩下三个名字没有判据，先不占名字」——第 376 轮判据来了
（`c371-stdlib-error-families-and-fields` 一次量七个族，
`c371-stdlib-globals-uri-family` 量的是 `decodeURIComponent("%")` **抛出来的名字**），
于是照规矩补上。**七族齐了**。

**`URIError` 与另外六族有一处不同**：**它是被内建自己抛出来的**
（`DecodePercent` 那一支）——所以它除了「能 `new` 出来」，还要在
`install.xl.md` 那条**宿主异常 → 脚本族**的映射里占一格（否则脚本 `catch` 到的是 `Error`）。
`EvalError` 反过来：本仓没有 `eval`（非目标清单），
**没有任何内建会抛它**——它存在的意义就是「`new EvalError(…)` 通、`instanceof` 对」。

**`AggregateError(内层数组, 消息?)`**（第 295 轮）——号**追加在表尾**。

**它与其余几个只差一格**：第一个实参是**内层那个数组**（挂成不可枚举的 `errors`），
消息是**第二个**（不是第一个）——所以它**不能**直接落进
`ErrorCtorName` / `ErrorCtorProto` 那一支的实参解析里（那一支的第一个实参是消息）。
**`Promise.any` 也用它**（全部被拒绝时抛的就是它）。

# const ObjectGroupBy:int = 328

**`Object.groupBy(可迭代, 回调)`**（第 295 轮）——号**追加在表尾**。

# method OwnEnumerableKeyTexts:(table:HeapTable, value:Value, protos:Protos)=>Array<string>

**一个对象「自有 + 可枚举」的字符串键，按 JS 的次序**（第 340 轮，从 `Object.keys`
那一支**原样抽出来**的）——**下标键在前**（数组的元素 / 字符串的码元 / 整数样的 `Props`，
它们**升序**）、**其余按创建顺序**、**符号键一律不要**。

**为什么值得抽出来**：`for..in` 要在**原型链的每一层**做同一件事
（`ObjectForInKeys`），而「哪些键算数、按什么次序」那一段有 **45 行**——
抄一份就是**两处会漂**的判据（第 307 / 312 / 320 / 338 轮各踩过一次同型的错）。

```ts
const stringTarget = value.Tag === ValueTag.String;
const ownItem = stringTarget ? null : table.Get(value.Ref);
const indexPositions = IndexKeyPositions(table, value);
const names: string[] = [];
// **被不可枚举的那一格压住的下标不算键**（第 706 轮）：`IndexKeyPositions` 只看
// 「元素区在不在」，而 `Object.defineProperty([], 0, { value: 5 })` 造的那一格
// **在 `Props` 里、不可枚举**（见 `IndexKeyShadowed` 那一段的账）。
for (let i = 0; i < indexPositions.length; i++) {
  if (IndexKeyShadowed(table, value, indexPositions[i])) continue;
  names.push("" + indexPositions[i]);
}
const intNames: string[] = [];
const plainNames: string[] = [];
if (ownItem !== null) {
  for (let i = 0; i < ownItem.Props.length; i++) {
    if (table.Get(ownItem.Props[i].Key).Tag !== ValueTag.String) continue;
    // **只看可枚举的**（第 182 轮修）：`Object.defineProperty(o, "x", { value: 1 })`
    // 默认 `enumerable: false`——不看标志就会把它数进去。
    // 同一趟把**私有字段**也筛掉了（它们走隐藏属性，`enumerable` 是假）。
    if (!ownItem.Props[i].IsEnumerable()) continue;
    const text = TextFrom(table, Value.FromString(ownItem.Props[i].Key));
    // **已经被下标键覆盖的那些不再收**（越界写过的下标可能两处都有一份）。
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
// **整数样的一摞升序**（插入排序——键数很少）。
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
return names;
```

# method CollectForInKeys:(room:RoomChecker, table:HeapTable, value:Value, protos:Protos)=>int

**`for..in` 要的那串键**（第 340 轮）——**沿原型链往上走**，每一层取
「自有 + 可枚举」，**被内层压住的同名键只算一次**（JS 的规矩）。

**它为什么不能只问 `Object.keys`**（**实测撞到的**）：`Object.keys` 的口径是
**自有**（判据 `rt-forin-order-and-inherited` 第 3 行：Node 给 `own,inherited`、
本仓给 `own`）。`for..in` 走的是**另一条**口径，而 `LowerForIn` 原来借的正是 `keys`。

**次序**：每一层内部按 `OwnEnumerableKeyTexts`（下标键在前 升序），
层次**由内向外**——JS 就是这样（`{inherited: true}` 的原型上那一格排在自有键**之后**）。

**怎么进到语言层**：它是 `Object` 构造函数上一格**隐藏**静态
（`forInKeys`，不可枚举）——`LowerForIn` 按名字取，与它取 `keys` 那一条**同一个形状**。
**符号键天然进不来**（`for..in` 不看符号，`OwnEnumerableKeyTexts` 只收字符串）。

```ts
let handle = value.Ref;
const seen: string[] = [];
const names: string[] = [];
let guard = 0;
while (handle > 0 && guard < 64) {
  guard = guard + 1;
  const item = table.Get(handle);
  const layer: Value = handle === value.Ref ? value : Value.FromObject(handle);
  const own = OwnEnumerableKeyTexts(table, layer, protos);
  for (let i = 0; i < own.length; i++) {
    let dup = false;
    // **花括号不能省**（**实测踩过一次**）：写成 `for (…) if (…) dup = true;` 时
    // **投影往返会漂**（`cases:tsast` 当场报「投影后多出来一个 `Block`」、
    //  `ForStatement` 区间也跟着漂）——这一仓的写法**一律带花括号**，不是风格。
    for (let k = 0; k < seen.length; k++) {
      if (seen[k] === own[i]) dup = true;
    }
    if (dup) continue;
    seen.push(own[i]);
    names.push(own[i]);
  }
  handle = item.Proto;
}
if (!room(ObjectCharge + ValueCharge * names.length + CodeUnitCharge * names.length * 4)) {
  throw new Error("out of room");
}
const outHandle = table.CreateArray();
table.Get(outHandle).Proto = protos.Array;
const out = table.Get(outHandle).AsArray();
for (let i = 0; i < names.length; i++) {
  out.Push(Value.FromString(table.CreateString(Units(names[i]))));
}
return outHandle;
```

# const ObjectForInKeys:int = 347

**or..in 要的那串键**（第 340 轮，取号 347——那一段里的第一个空号，
第 335 轮那道「同一文件里不许重号」的检查会拦撞车）——实现见 CollectForInKeys。

# const ObjectKeys:int = 401

`Object.keys` 的能力号（`Object` 段从 400 起）。
# const ObjectValues:int = 402

`Object.values` 的能力号（第 120 轮补）。

# const ObjectEntries:int = 403

# const ObjectDefineProperty:int = 405

**`Object.defineProperty(对象, 键, 描述符)`**（第 182 轮）——**只做数据属性那一半**。

**它就是把属性表里那一格的标志位写下来**：本仓的属性早就有
`enumerable` / `writable` / `configurable` 三个标志（`heap.xl.md`），
而 `SetProperty` / `DeleteProperty` **照着它们抛**（`props.xl.md`）——
所以这一格**不需要任何引擎改动**：找到那一格（没有就新建）→ 写值 + 写标志。

**JS 的默认值是三个 `false`**（少给哪个字段就是 `false`，不是「保持原样」）——
这一条容易写反，判据里钉着它。

**访问器描述符（`get` / `set`）响亮地抛**：那要造访问器属性（`props.xl.md` 有那一格），
但「把描述符里的函数值挂成访问器」是另一件事，单独立一轮。

# const ObjectFreeze:int = 406

**`Object.freeze(对象)`**（第 182 轮）——**把自有数据属性的 `writable` 清掉**。

**它同样一个引擎改动都不用**：`SetProperty` 见到不可写的属性**本来就会抛**
（`props.xl.md` 第 442 行那一格），所以冻结只需要把标志位改掉。
**返回的是那个对象本身**（JS 的口径）。

**两处已知缺口写在明处**：**数组元素**不在属性表里（它们在密集元素区），
所以 `Object.freeze([1, 2])` 之后 `a[0] = 5` **照样写得进去**——元素区没有标志位；
以及**「不可扩展」**没做（往冻结对象上**加**新属性仍然可以）。
两件都是「要动引擎」的活，这一轮不做、也不假装做了。

# const ObjectAssign:int = 404

**`Object.assign(目标, …来源)`** 的号（第 130 轮）。

**它读的是「**自有可枚举**」那一张表**（与 `keys` / `values` / `entries` 同一张）——
**访问器被跳过**（那三个的口径：这一层不调 getter，记在台账）。
**返回的就是那个目标对象本身**（JS 的口径，不是拷贝）。
**不许把原始值当目标**：JS 会**装箱**（`Object.assign(1, {a:1})` 给一个 Number 对象），
而本仓没有装箱那一层——**响亮地抛**比静默返回一个数好。
消息以 `unimplemented: ` 开头（判据钉着这一条：这一层所有「没做」的话都同一个开头，
用户与判据都不必去猜哪几句是「没做」）。

`Object.entries` 的能力号（第 120 轮补）。

**三个方法的共同口径**：只看**自有**的**字符串键**属性（JS 的 `Object.keys` 就是这个口径），
**访问器一律跳过**——读它要**重入执行器**（那是一个 `NativeCall`，而这一块的签名里没有它），
与 `JsonText` 里那条「访问器跳过」同一条理由。
**与 `Object.keys` 的差别**：`keys` **不**跳过访问器（它只取名字，JS 也是这个口径）；
`values` / `entries` 要**读值**，所以只能跳过——这一条写在明处，不假装它读到了 getter。

# const ErrorIsError:int = 348

**`Error.isError(v)`**（第 343 轮，ES2025）——`Error` 上的**第一格静态**。

**它为什么存在**：判「这是不是一个错误对象」在真实代码里**到处都是**
（日志那一层、错误边界那一层），而 `instanceof Error` **跨 realm 会失效**——
JS 为此加了这一格。本仓只有**一个 realm**，所以这一格**近似**就是
「链上有没有 `protos.Error`」。

**一处已知差别写在明处**（**实测量到的**）：JS 的这一格问的是**内部槽**，
所以 `Error.isError(Object.create(Error.prototype))` 在 Node 里是 **`false`**、
而 `instanceof Error` 是 **`true`**——**两者不是同一个判据**。本仓没有内部槽，
只有属性表与原型链 ⇒ 这一格拿**链**来近似 ⇒ 上面那种「手工接上原型」的对象
**会被算成错误**。**要真对齐得给每个错误对象留一格隐藏标记**
（与 `Date` 的 `__t` 同一形状）——**那是另一件事**，记在这里。

**它落在 `Error` 那个对象上、而且是隐藏挂**（`SetHiddenProperty`）：
`Object.keys(Error)` 在 Node 里是**空数组**（静态方法不可枚举），
`for..in` 也不该看见它。

**它第 342 轮试过一次、退回来了**（**账在 `typescript-exec/README.md` 那一轮**）：
要让静态有落点就得把 `Error` 从「光秃秃的宿主引用」改成「**对象 + 可调用载荷**」，
而那一改撞上了 `this` 的**两条相反规则**——第 343 轮把那条规则按**载荷号**收窄之后，
这一格才落得下来。

# const ErrorCtor:int = 280

**`Error` 的能力号**（第 120 轮补；200..299 这一段里的空号）。

**它是构造函数，也是普通函数**：JS 里 `new Error("x")` 与 `Error("x")` 给的是**同一种东西**
（后者不 `new` 也返回一个新对象）。走 `Op.New` 时引擎按「宿主构造函数」那条分支调它，
走 `Op.Call` 时就是一次普通宿主调用——**同一个号、同一支实现**，两条路天然都通。

**它造的是一个普通对象**（不是 `Map` / `Set` 那种带内部格的）：`message` 与 `name` 两个
数据属性——这正好是 `RunDescribe`（命令行打印抛出的值）认的那一格。
**原型挂在 `Protos.Error` 上**（第 137 轮补）：`e instanceof Error` 靠的就是它
（`NewError` 那一段写着为什么）。
**没有 `stack`**：那是宿主（V8）的事，这一层给不出来，也不该假装给一个。

# const TypeErrorCtor:int = 281

**`TypeError` 的能力号**（第 137 轮）。

**它比 `Error` 只多两件事**：原型是**另一格**（`Protos.TypeError`，它自己的原型是
`Error.prototype`），以及 `name` 是 `"TypeError"`。其余一字不差——
所以两支共用一个 `NewErrorLike`（复制一份的下场是「改了一处忘了一处」）。

**为什么要它**：`catch (e) { if (e instanceof TypeError) … }` 是**日常写法**，
而引擎自己抛的那些（`null.y`、`undefined[0]`）在 JS 里**正是 `TypeError`**。

# const RangeErrorCtor:int = 282

**`RangeError` 的能力号**（第 137 轮）——与 `TypeError` 同款（同一支实现、换原型与名字）。

# const SyntaxErrorCtor:int = 283

**`SyntaxError` 的能力号**（第 277 轮）——与 `TypeError` / `RangeError` 同款
（同一支实现、换原型与名字）。

**为什么第 277 轮才补它**：这一族原来三个成员，而判据要的是第四个——
`JSON.parse("oops")` 抛的是 `SyntaxError`，脚本里那个
`catch (e) { e instanceof SyntaxError }` 于是**没有落点**
（`protos` 里没有那一格 ⇒ 引擎连「该找什么」都不知道）。
**顺带修掉一条更基础的**：`SyntaxError` 原来**不在 `GlobalNames` 里**，
所以 `typeof SyntaxError` 在**降级期**就报 `name is not a local or a capture: SyntaxError`
——那句话听起来像脚本写错了变量名，其实是名单少了一个名字
（与第 145 轮的 `Boolean` 一模一样）。

# const JsonStringify:int = 501

`JSON.stringify` 的能力号（`JSON` 段从 500 起）。

# const JsonParse:int = 502

**`JSON.parse` 的能力号**（第 122 轮补）。

**它能做，是因为上一轮铺了那条路**：坏输入是**脚本接得住**的异常——
在此之前，这里唯一能做的「报错」是抛宿主异常，那会把整份程序打断，
于是 `try { JSON.parse(text) } catch { … }` 这种**日常写法接不住**（宁可缺也不这么给）。

**数字按双精度解析**（JSON 的规矩就是双精度）：整数落在 `i32` 里给 `Int32`、
其余给 `Float64`（与 `MathResult` / 引擎的 `MakeNumber` 同一条口径）。
**代价写在明处**：`Float64` 今天**没有文本形态**（`TextUnitsOf` 对它抛）——
所以 `JSON.parse("1.5")` 算得动、`console.log` 打不出来。这是**浮点文本形态**那一块的账，
不是 `parse` 少做了哪一步。

# const MaxJsonDepth:int = 64

序列化深度上限。

**为什么用深度而不是「查环」**：真正的环检测要**记住访问过的对象**（一份身份集合），
那是另一件事；而**深度上限**把「环」与「太深的结构」都变成**一条可捕获的错误**。
代价写在明处：**一个刻意做得很深（但无环）的结构也会被拒**。

**解析那一侧也用它**（第 122 轮）：`parse` 是**递归**的（宿主递归），
而宿主栈溢出**不可捕获**（`README` 的硬性约定第 2 条）——
所以深度上限在这里是**安全要求**，不是风格选择。

# method GlobalNames:()=>Array<string>

**这一层提供给模块的全局名**。降级器拿它去声明名字，宿主拿它去建环境对象——
**两边用的是同一张名单**（所以不会出现「声明了却没提供」）。

**`undefined` 也在名单里**：它不是关键字，而是**全局对象上的一个只读属性**
（`globalThis.undefined` 真的存在）——所以它走的是**同一条路**，
不必在降级器里为它开一个特例（特例意味着「别的地方也得记得它」）。

**`Boolean` 是第 145 轮加进来的**：它原来**只在名单之外**，
于是 `Boolean(0)` 在**降级期**就报 `name is not a local or a capture: Boolean`
（那句话听起来像脚本写错了变量名，其实是名单少了一个名字）。
**名单与 `BuildGlobals` 是同一份约定**（名单里有、`BuildGlobals` 没挂 ⇒
「声明了却没提供」，判据里量着这一条）。

```ts
return ["undefined", "Math", "console", "Object", "JSON", "Map", "Set", "Symbol", "Date", "Error", "TypeError",
  "RangeError", "SyntaxError", "Array", "Number", "String", "Boolean", "Promise", "Function", "parseInt",
  "parseFloat", "NaN", "Infinity", "isNaN", "isFinite", "globalThis",
  // **第 311 轮补的四个名字**（`encodeURI` / `encodeURIComponent` /
  // `decodeURI` / `decodeURIComponent`）——**名单与 `BuildGlobals` 是同一份约定**，
  // 四条都**两边一起**加了（少一边就是「声明了却没提供」，判据里量着这一条）。
  "encodeURI", "encodeURIComponent", "decodeURI", "decodeURIComponent",
  // **第 295 轮补的四个名字**（`ReferenceError` / `AggregateError` /
  // `WeakMap` / `WeakSet`）——**名单与 `BuildGlobals` 是同一份约定**，
  // 四条都**两边一起**加了（少一边就是「声明了却没提供」，判据里量着这一条）。
  "ReferenceError", "AggregateError", "WeakMap", "WeakSet",
  // **第 376 轮补的两个名字**（`URIError` / `EvalError`）——**名单与 `BuildGlobals`
  // 是同一份约定**，两边一起加（少一边就是「声明了却没提供」，判据里量着这一条）。
  // **它们拖着的两条判据**：`c371-stdlib-error-families-and-fields`（七族一起量）与
  // `c371-stdlib-globals-uri-family`（`decodeURIComponent("%")` 抛出来的**名字**）。
  "URIError", "EvalError",
  // **第 332 轮补的一个名字**（`queueMicrotask`）——**名单与 `BuildGlobals` 是同一份约定**，
  // 两边一起加（少一边就是「声明了却没提供」）。
  // **它的号落在承诺那一段的尾巴上**（`promise.xl.md` 的 `PromiseQueueMicrotask = 250`）——
  // 理由写在那一段：它要的那条通道（`schedule`）只有那里有。
  // **名字与号不是一个东西**：号只是路由的键，挂在哪儿是这一层的事。
  "queueMicrotask",
  // **第 338 轮补的一个名字**（`structuredClone`）——**同一条约定**（名单与 `BuildGlobals`
  // 两边一起加）；号取 `346`（那一段里第一个空号，第 335 轮那道去重检查会拦撞车）。
  "structuredClone",
  // **第 717 轮补的一个名字**（`Reflect`）——**名单与 `BuildGlobals` 两边一起加**
  // （少一边的症状写在上面第 2309 行：名单里有、`BuildGlobals` 没挂 ⇒「声明了却没提供」）。
  // 号开在 `685..697`（13 格），理由见 `ReflectApply` 那一段。
  "Reflect"];
```

**`Function` 是第 228 轮加进来的**（与 `Boolean` / `Promise` 那两条同一个理由）：
名单里没有它，`Function.prototype` 这个写法在**降级期**就报
`name is not a local or a capture: Function`——那句话听起来像脚本写错了变量名，
其实是名单少了一个名字。**它同时是「`f.call` 那条路」的另一半**
（前一半是闭包身上的 `Proto`，见 `vm.xl.md` 的 `MakeClosure`）。

**`Promise` 是第 185 轮加进来的**（与 `Boolean` 那条同一个理由）：
名单里没有它，`Promise.resolve(1)` 在**降级期**就报
`name is not a local or a capture: Promise`——那句话听起来像脚本写错了变量名，
其实是名单少了一个名字。

**`isNaN` / `isFinite` 是第 149 轮加进来的**：它们与 `Number.isNaN` / `Number.isFinite`
**不是一回事**——全局那两个**先做 `ToNumber`**（`isNaN("abc")` 是 `true`、
`isFinite("3")` 是 `true`），而 `Number.isNaN("abc")` 是 `false`（它只认真正的 `NaN`）。
两份都要有，而且**实现要分开写**（写成一份就是「一半对」）。

**`globalThis` 也是第 149 轮加进来的**，而且它**指向那个环境对象自己**
（`globalThis.Math === Math`）。加它是因为 `typeof` 那一格的新规矩
（未声明的名字给 `"undefined"`，第 149 轮）会让 `typeof globalThis` 给
**`"undefined"`**——而它在 Node 里是 `"object"`，那是一处**静默**的不一致。
**剩下的同类差异写在明处**：`typeof process` / `typeof require` / `typeof setTimeout`
这些**宿主专有**的名字，Node 给 `"object"` / `"function"`，本仓给 `"undefined"`——
本仓的全局对象是**故意小的**（宿主能力走能力表，不往脚本作用域里塞）。

# method NumericOf:(value:Value)=>float

取数值；不是数值就抛（与 `rt.xl.md` 的同名函数**不是一回事**：
那个在引擎里、按引擎的口径，这个是建库层对**参数**的检查）。

```ts
if (value.Tag === ValueTag.Int32) return value.Int;
if (value.Tag === ValueTag.Float64) return value.Dbl;
throw new Error("this method needs a number");
```

# method PropertyKeyOf:(table:HeapTable, value:Value)=>Value

**一个值当属性键用**（第 214 轮）：字符串照原样、**符号也是键**（它的身份就是键）、
其余先 `ToString`（`{1: "a"}` 的键是 `"1"`，与 JS 的 `ToPropertyKey` 一致）。

```ts
if (value.Tag === ValueTag.String || value.Tag === ValueTag.Symbol) return value;
return Value.FromString(table.CreateString(Units(TextFrom(table, value))));
```

# method IsIndexKeyText:(text:string)=>bool

**这个键文本是不是 JS 的「数组下标」**（第 210 轮）——也就是
**规范数字串**：全是数字、没有前导零（`"0"` 自己除外）、值 `< 2^32 - 1`。

**它决定次序**（`Object.keys` 里整数样的键排在最前、升序）——
所以判据要比 JS 严：`"01"` / `"1.5"` / `"-1"` / `"1e3"` **都不是**下标键
（它们按普通字符串排在后面，与 JS 一致）。

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

**这个值有哪些「下标自有键」**（第 210 轮）——给的是**位置本身** 不是个数：
`[1, , 3]` 给 `[0, 2]`（JS 的 `Object.keys` 就是 `["0","2"]`）。

**第一版给的是「个数」**（`[1, , 3]` 给 `2`），于是调用方按 `0 .. 个数-1` 造键 ⇒
`["0","1"]`——**洞后面的那个键位移了**。这一类错误很安静（长度对得上），
所以判据里那条 `Object.keys(xs).join(",")` 是**专门钉它**的。

数组是**跳过洞**的位置、字符串是每个码元、其余是空。

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

# method IndexKeyShadowOf:(table:HeapTable, target:Value, at:int)=>Property | null

**数组第 `at` 格在属性表里的那一份「标志位影子」**（第 721 轮）——没有就返回 `null`。

**为什么元素那一格会在属性表里另有一份**：元素区（`HeapArray` 的 `Elements` / `Holes`）
**没有逐格标志位**，而 `Object.defineProperty([1, 2, 3], "1", { enumerable: false })`
在 JS 里那一格**还在**（`a[1]` 照样读得到值），变的只是三个标志里的一位。
所以这一层把「标志位」那一份放进 `Props`，与元素区那一格**同时存在**：

| 问 | 答在哪一摞 |
| --- | --- |
| 那一格在不在 / 值是多少 | **元素区**（`HeapArray`） |
| 可写 / 可枚举 / 可配置 | **`Props` 里这一份**（有这一份时） |

**第 706 轮只写了「不可枚举」那一档**（那时缺省 `enumerable: false` 是唯一会分叉的字段），
**第 721 轮**把 `writable` / `configurable` 也放进同一份：
`Object.defineProperty(a, "1", { writable: false })` 之后 `a[1] = 42` 该**静默无效**、
`{ configurable: false }` 之后 `delete a[1]` 该给**假**——两处都要读这一份。

**一处实现**：`Object.keys` / `for..in` 那一趟（`IndexKeyShadowed`）、
`Object.getOwnPropertyDescriptor`、「写下标」与「删下标」四处都问它，
谁都不许按自己的写法再找一遍（找法的判据是 `IsIndexKeyText` + 数值相等，
抄一份就是第二处会漂的答案）。

```ts
if (target.Tag !== ValueTag.Array) return null;
const shadowed = table.Get(target.Ref).Props;
for (let i = 0; i < shadowed.length; i++) {
  if (table.Get(shadowed[i].Key).Tag !== ValueTag.String) continue;
  const keyText = TextFrom(table, Value.FromString(shadowed[i].Key));
  if (!IsIndexKeyText(keyText)) continue;
  if (Number(keyText) !== at) continue;
  return shadowed[i];
}
return null;
```

# method IndexKeyShadowed:(table:HeapTable, target:Value, at:int)=>bool

**数组第 `at` 格算不算「被属性表那一份压成不可枚举」**（第 706 轮）——
`OwnEnumerableKeyTexts`（`Object.keys` / `for..in` 的键表）用它把元素区那一格筛掉。

**判据只有「不可枚举」这一位**：可枚举的落点本来就在元素区那一摞里，
`Object.keys` 该看见它（`IndexKeyShadowOf` 找得到那一份，但它可枚举）。

```ts
const shadow = IndexKeyShadowOf(table, target, at);
if (shadow === null) return false;
return !shadow.IsEnumerable();
```

# method MaterializeElementShadows:(room:RoomChecker, table:HeapTable, target:Value, keepWritable:bool)=>void

**把数组现在有的每一格元素「补一份标志位影子」**（第 723 轮）——`freeze` / `seal` 用。

**为什么需要这一步**：元素区（`HeapArray` 的 `Elements` / `Holes`）**没有逐格标志位**，
所以 `freeze` / `seal` 那两趟**扫属性表**的循环**一格元素都扫不到** ⇒
`Object.freeze(a); a[1] = 9` 原来**照样写得进去**（判据 `p723a-r01`）、
`Object.seal(a); delete a[1]` 原来给**真**（`p723a-r03`）。第 721 轮给
「`defineProperty` 显式写了标志位」那一档补的落点就是这个形状，这一格是
**整体操作**那条入口的另一半。

**只补「还没有影子」的那些**（已有的那一份由调用方那两趟循环去改标志位）。
**洞不补**：洞里根本没有那一格（JS 里 `freeze` 也不会把洞变成实值）。
标志位给「**可枚举**」（元素本来就是可枚举的；不可枚举那一档由 `IndexKeyShadowed`
筛掉 `Object.keys`）——`keepWritable` 为真时再加「**可写**」（`seal` 只清「可配置」）。

```ts
if (target.Tag !== ValueTag.Array) return;
const shadowItems = table.Get(target.Ref).AsArray();
const count = shadowItems.GetLength();
let missing = 0;
for (let i = 0; i < count; i++) {
  if (shadowItems.IsHole(i)) continue;
  if (IndexKeyShadowOf(table, target, i) === null) missing = missing + 1;
}
if (missing === 0) return;
if (!room(PropertyCharge * missing)) throw new Error("out of room");
for (let i = 0; i < count; i++) {
  if (shadowItems.IsHole(i)) continue;
  if (IndexKeyShadowOf(table, target, i) !== null) continue;
  const indexKey = Value.FromString(table.CreateString(Units("" + i)));
  const elementShadow = new Property(indexKey.Ref, shadowItems.GetAt(i));
  let elementFlags = PropertyFlagEnumerable;
  if (keepWritable) elementFlags = elementFlags + PropertyFlagWritable;
  elementShadow.Flags = elementFlags;
  table.Get(target.Ref).Props.push(elementShadow);
}
table.Recount(target.Ref);
```

# method IndexLengthPropertyOf:(table:HeapTable, target:Value)=>Property | null

**数组自己身上那一格 `length` 的属性表项**（第 722 轮）——没有就返回 `null`。

**它为什么会在属性表里**：数组的长度本身**不住在属性表里**（`HeapArray` 的结构属性），
可 `Object.defineProperty(xs, "length", { writable: false })` 要**把「可写吗」记在某个地方**，
本仓记的就是这一份（`array.xl.md` 的 `RequireArrayGrowable` 读它）。

**一处实现**：`Object.getOwnPropertyDescriptor` 与「写长度」两条路都要问它——
各写一份扫描就是两处会漂的答案（与 `IndexKeyShadowOf` 同一条纪律）。

```ts
if (target.Tag !== ValueTag.Array) return null;
const own = table.Get(target.Ref).Props;
for (let i = 0; i < own.length; i++) {
  if (table.Get(own[i].Key).Tag !== ValueTag.String) continue;
  if (TextFrom(table, Value.FromString(own[i].Key)) === "length") return own[i];
}
return null;
```

# method IndexKeyValueAt:(room:RoomChecker, table:HeapTable, target:Value, index:int)=>Value

**下标键上那个值**（第 210 轮）：数组的元素、字符串的那**一个码元**（新串）。

**`Object.values([1, 2])` 在 JS 里是 `[1, 2]`**——所以数组这一支就是 `GetAt`
（调用方已经跳过了洞，走不到「洞」那一格）。

```ts
if (target.Tag === ValueTag.Array) return table.Get(target.Ref).AsArray().GetAt(index);
const units = table.Get(target.Ref).AsString().Units;
if (!room(ObjectCharge + CodeUnitCharge)) throw new Error("out of room");
return Value.FromString(table.CreateString([units[index]]));
```

# method MathArgOf:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, value:Value)=>float

**`Math.*` 的实参口径**（第 206 轮）：JS 对它们先做 **`ToNumber`**——
`Math.floor("2.5")` 是 `2`、`Math.max(1, "9")` 是 `9`、`Math.abs(true)` 是 `1`、
`Math.floor(undefined)` 是 `NaN`（**不抛**）。

**它与 `NumericOf` 不是一回事**：那个是**这一层的参数检查**（只认 Int32 / Float64，
别的点名抛）——对 `toFixed` 的位数那种实参是对的，对 `Math` 是错的。
原来 `Math` 那一族用的正是 `NumericOf`，于是 `Math.floor("2.5")` 抛
`this method needs a number`（判据 `math-isnan-family` 现场红的）。

**转换那张表只有一份**（引擎的 `ToNumberOf`，第 198 轮把它与 `ToPrimitive` 收到了一处），
所以这里**转调它**：对象那一支（`ToPrimitive` → 可能调脚本）也跟着对。

```ts
return ToNumberOf(room, call, protos, table, value);
```

# method MathResult:(value:float)=>Value

把算出来的数值变成 `Value`：**整的给 Int32，不是整的给 Float64**。

**这一格现在转调引擎的 `MakeNumber`**（第 206 轮）——原来它**自己抄了一遍**
那条判据，抄漏的是**负零**：`Math.min(-0, 0)` 在 JS 里给 `-0`（`1 / -0` 是 `-Infinity`），
而这一格把它收成 `Int32 0` ⇒ `console.log` 打的是 `0`（node 打 `-0`）。
`MakeNumber` 的注释里写着它为什么必须单独判 `-0`（第 129 轮），
所以这里**一个字都不该自己写**——同一件事不写两份答案。

```ts
return MakeNumber(value);
```

# method F16Round:(value:float)=>float

**最近的那个 f16**（第 703 轮）——`Math.f16round` 落地的唯一一处。

**两档退路**（都只问「宿主有没有」，不问「宿主是谁」）：
先是 `Math.f16round`（这一格在 Node 24 起就有），没有就用 `Float16Array` 那一趟
（同一批进标准的，赋一次值就是同一次舍入），两样都没有就**原样给回**——
**不自己按位凑**：自己凑出来的舍入在**次正规数**与**溢出边界**上会差，
而判据是逐字节比（`Math.f16round(1.1)` 对 `1.099609375`）。

```ts
if (typeof Math.f16round === "function") return Math.f16round(value);
if (typeof Float16Array === "function") {
  const scratch = new Float16Array(1);
  scratch[0] = value;
  return scratch[0];
}
return value;
```

# method NumberFromValue:(room:RoomChecker, call:NativeCall | null, table:HeapTable, protos:Protos, value:Value)=>Value

**`Number(x)` 的语义**（第 145 轮）——**第 198 轮起它就是引擎的 `ToNumber`**。

**这一格原来自己写了一半**：数 / 布尔 / `null` / `undefined` / 字符串各一档，
**对象那一档抛**（理由是「要 `ToPrimitive`，没做」）。第 198 轮把整张表
（含对象那一支）做进了 `rt.xl.md` 的 `ToNumberOf`，所以这里**转调**它——
**同一件事不写两份答案**。

**为什么这条比「顺手补上对象那一档」更要紧**：`Number([])` 是 `0`、`Number({})` 是 `NaN`，
而这两格的答案来自 `ToPrimitive` 那两步（`[].toString()` 是 `""`、
`({}).toString()` 是 `"[object Object]"`）。两处各写一遍的话，
`Number([])` 与 `+[]` 早晚会给**两个答案**——而它们在**任何** JS 引擎里都必须是同一个。

**收窄仍旧归 `MakeNumber`**：`ToNumberOf` 给的是宿主双精度，`-0` 的符号位在这一步保住
（`Object.is(Number("-0"), -0)` 为真）——`MathResult` 会把 `-0` 收成 `Int32 0`，
所以这一格**不能**用它。

```ts
return MakeNumber(ToNumberOf(room, call, protos, table, value));
```

# method PrototypeOfValue:(protos:Protos, table:HeapTable, target:Value)=>Value

**取一个值的原型，当值交出去**（第 697 轮从 `ObjectGetPrototypeOf` 那一支抽出来）——
两个调用点：`Object.getPrototypeOf(o)` 与 **`({}).__proto__` 那个访问器的 getter**
（规范里那一格的正身就是一句 `Return ? O.[[GetPrototypeOf]]()`，同一件事）。

**原始值给它的原型**（JS 会**装箱**再取）：`Object.getPrototypeOf("a")` 是 `String.prototype`——
本仓不装箱，所以这里按**原始值原型表**（`protos.String` / `Number` / `Boolean`）直接答。

**闭包 / 函数也要认**（第 357 轮，**实测撞到的**）：`class B extends A { }` 里
**类对象自己**也是一个对象（`Object.getPrototypeOf(B) === A`，判据
`c291-rt-class-shapes` 第 6 格量的就是它）——而函数那一档原来**一律抛**
（`unimplemented: Object.getPrototypeOf over this kind of value`，
**一句话里没有一个字提到「函数也是对象」**）。
它们在值模型里同样住堆上（`HeapClosure` / `HeapFunction` 都有 `Proto` 那一格），
所以这里只是**放行**、下面那句读法一个字都不用改。

```ts
if (target.Tag === ValueTag.String) return Value.FromObject(protos.String);
if (target.Tag === ValueTag.Int32 || target.Tag === ValueTag.Float64) return Value.FromObject(protos.Number);
if (target.Tag === ValueTag.Bool) return Value.FromObject(protos.Boolean);
if (target.Tag !== ValueTag.Object && target.Tag !== ValueTag.Array
  && target.Tag !== ValueTag.Closure && target.Tag !== ValueTag.Function) {
  throw new Error("unimplemented: Object.getPrototypeOf over this kind of value");
}
const protoHandle = table.Get(target.Ref).Proto;
if (protoHandle === 0) return Value.Null();
// **标签要跟着那一格自己的**（第 357 轮，**实测撞到的**）：`class B extends A {}` 的
// **`B` 自己**是一条 `set_proto` 到 **`A` 那个闭包**上的（`LowerClass` 里那句
// `SetProto(ctor, staticBaseSlot)`）——而这里原来一律 `Value.FromObject`
// ⇒ 拿到的是一个 **Object 标签**的值，与 `A`（**Closure 标签**）用 `===` 一比
// **永远是假**（症状：`Object.getPrototypeOf(B) === A` 给 `false`，而链上**确实**是 `A`
// ——`c291-rt-class-shapes` 第 6 格量的就是它）。
// **`HeapObject.Tag` 就是为这件事留的**（堆上每一项都记着自己是什么）——
// 不再猜、也不再写第二份「哪些 tag 算对象」的名单。
return Value.FromRef(table.Get(protoHandle).Tag, protoHandle);
```

# method InvokeGlobal:(room:RoomChecker, call:NativeCall | null, table:HeapTable, protos:Protos, id:int, self:Value, args:Array<Value>, sink:LogSink, failed:CallFailed | null = null, constructing:bool = false, constructThis:Value = new Value())=>Value

**全局内建的分派与实现**。

`Math.floor` / `abs` / `max` / `min` 各一行；`console.log` 把实参 `ToString` 之后
**用空格接成一行**、**一次**交给 `sink`（见 `LogSink` 那一段：粒度是行，不是实参）。

**为什么要原型表**：`Object.keys` 返回的是**新数组**，而新数组必须带**数组原型**
（否则结果连 `.join` 都没有——那等于返回了一个「长得像数组但不是」的东西）。
这是全局段里唯一需要它的地方，写在签名里而不是塞进某个全局变量。

**四个「当函数调」的全局名也在这里**（第 145 轮）：`String(x)` / `Number(x)` /
`Boolean(x)` / `Array(n)`——它们的值是**对象**，能被调是因为身上带了一格载荷
（`heap.xl.md` 的 `AttachCallable`），而**落到哪一段代码**由这一层的号决定
（引擎不认识 `String` 这几个字母，与 `Map` / `Set` 同一条分界）。

```ts
if (id === StringCtor) {
  // **`String()` 给空串、`String(undefined)` 给 `"undefined"`**——两格不一样，
  // 所以不给实参这一支要**先判**（`ValueUnits` 对 `undefined` 给 `"undefined"`，
  // 那是 `String(x)` 的答案，不是 `String()` 的）。
  if (args.length === 0) {
    const empty = Value.FromString(table.CreateString([]));
    return constructing ? MakeStringBox(room, table, protos, empty) : empty;
  }
  // **`String(符号)` 是一条特例**（第 215 轮）：JS 在这里**不走 `ToPrimitive`**
  //（走的话会得到 `Symbol(…)` 的字符串化 **之前**就抛）——`String(sym)` 给
  // **`"Symbol(描述)"`**，没有描述就给 `"Symbol()"`。
  // 而**别的路径**（`"x" + sym`、`` `${sym}` ``、`sym.toString()`）在 JS 里**一律抛**——
  // 那条规矩**不动**（本仓也是抛的，见 `TextUnitsOf`）。
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
  // **`String(o)` 就是 `ToPrimitive(o, "string")` 再取文本**（第 213 轮收口）。
  //
  // **它原来只问「对象自己的 `toString`」**（第 193 轮那一处）：那对
  // `class C { toString() {…} }` 是够的，但**原型链上的 `toString` 看不见**——
  // `String(new Error("m"))` 于是印 `"[object Object]"`（JS 印 `"Error: m"`，
  // 判据 `error-tostring` 现场红的），而**同一条 `new Error("m")` 的
  // `"" + e` / `` `${e}` `` 却是对的**（它们走 `StringConcat`，第 203 轮已经收口到那张表上）——
  // **同一件事两个答案**，这一轮把它也接到 `ToPrimitiveOf` 上。
  //
  // **`hint` 是 `string`**（`ToString` 的口径）：先 `toString`、后 `valueOf`。
  // **原始值不受影响**（`ToPrimitiveOf` 对它们给回自己，`TextUnitsOf` 照样给文本）。
  //
  // **一处变响的已知差异**：`String(new Date(0))` 现在会**抛**
  // `unimplemented: ToPrimitive of a Date with a string hint`（`Date.prototype.toString`
  // 还没装）——原来它静默印 `"[object Object]"`。**抛比静默错值好**（台账里记着）。
  const stringUnits = JsTextUnits(table, ToPrimitiveOf(room, call, protos, table, args[0], ToPrimitiveString));
  if (!room(CodeUnitCharge * stringUnits.length + ObjectCharge)) throw new Error("out of room");
  const primitive = Value.FromString(table.CreateString(stringUnits));
  // **`new String(x)` 给的是包装对象**（第 310 轮）——与 `Number` / `Boolean` 那两族
  // 同一个形状（`typeof` 给 `"object"`、`valueOf` 给回原值）。
  if (constructing) return MakeStringBox(room, table, protos, primitive);
  return primitive;
}
if (id === NumberCtor) {
  // **不给实参给 `0`**（JS 的 `Number()` 是 `0`，不是 `NaN`）。
  const converted = NumberFromValue(room, call, table, protos, args.length > 0 ? args[0] : Value.FromInt(0));
  // **`new Number(x)` 给的是包装对象**（第 310 轮）。
  if (constructing) return MakeBox(room, table, protos, protos.Number, converted);
  return converted;
}
if (id === BooleanCtor) {
  // **不给实参给 `false`**，走的是**唯一那条真假口径**（第 144 轮的 `TruthyOf`）。
  // **`new Boolean(x)` 给的是「包装对象」**（第 232 轮）：JS 里
  // `Boolean(false)` 是**假**、`new Boolean(false)` 是**真**
  //（`typeof` 是 `"object"`，而且**任何对象都是真**——`ToBoolean` 那一支最后一行就是它）。
  // 判据 `global-boolean` 现场钉着这一句：它最后一项是 `Boolean(new Boolean(false) as any)`，
  // 期望 `true`（**不是** `false`）。
  //
  // **本仓没有「包装对象」那一档**（`Number` / `String` 也没有）——
  // 所以这里给的是一个**普通对象 + 一格隐藏的原值**（`__b`，用 `SetHiddenProperty`：
  // 它**不能**是可枚举的自有属性，否则 `Object.keys(new Boolean(1))` 当场给 `["__b"]`，
  // 而 JS 给 `[]`——**静默错值**）。
  // **已知差**：`String(new Boolean(false))` 在这里给 `"[object Object]"`，
  // 而 JS 给 `"false"`（那要 `Boolean.prototype.toString` / `valueOf` 那一族）。
  // **它比「静默按假算」好**：真假这一档是对的，缺的是**原始值的那两个方法**。
  // **第 310 轮把那一族补上了**：箱有了**自己的原型**（`protos.Boolean`）、
  // 两个方法在原型上、而且它们都先**脱箱** ——`String(new Boolean(false))` 现在给 `"false"`。
  if (constructing) {
    // **里面那一格存的是 `RtToBoolean` 的答案**（它是**值**不是宿主 `bool`）——
    // 直接存 `Value.FromBool(…)` 是编译不过的（那一句是「类型当场拦下来」的好例子）。
    const inner = RtToBoolean(table, args.length > 0 ? args[0] : Value.Undefined());
    return MakeBox(room, table, protos, protos.Boolean, inner);
  }
  return RtToBoolean(table, args.length > 0 ? args[0] : Value.Undefined());
}
if (id === ObjectCtor) {
  // **`Object()` / `Object(x)` / `new Object(x)`**（第 232 轮）：
  // 见 `ObjectCtor` 那一段里「这一轮只做能证的那一半」那一节——
  // **原始值那一档响亮地抛**（本仓没有包装对象，不静默给近似值）。
  //
  // **构造那一档先判**（次序是语义）：JS 里 `new Object(x)` **永远给新对象**，
  // 实参**完全不参与**——所以 `new Object(null)` 是 `{}` 而**不是** `null`
  //（判据 `global-array-object-ctors` 钉的就是这一句：
  // `new Object(null as any) !== null` 在 JS 里是 `true`）。
  if (constructing) {
    return NewPlainObject(room, table, protos);
  }
  if (args.length === 0) {
    return NewPlainObject(room, table, protos);
  }
  const only = args[0];
  // **对象原样返回**（`Object({a: 1}) === 那一个对象`，JS 的口径）。
  if (only.IsObject()) return only;
  // **`null` / `undefined` 给一个新对象**（第 690 轮，**这里原来是错的**）：
  // 上一版写的是「`Object(null)` 是 `null`」——**那不是 JS 的口径**。
  // `Object(value)` 那条算法里 `null` / `undefined` 走的是
  // `OrdinaryObjectCreate(%Object.prototype%)`，与**无实参**那一档**同一句**：
  // `Object(null)` / `Object(undefined)` 都造一个空对象（判据 `131-object-ctor-null-undefined`
  // 钉的正是这一句：`Object(null as any) === null` 在 JS 里是 `false`）。
  // **静默错值**：返回 `null` 会让 `Object(x) === null` 这种守卫在**传了 `null` 的那一次**判反
  // （而它本来是最该判对的一次）——`Object(undefined)` 同病。
  if (only.Tag === ValueTag.Null || only.Tag === ValueTag.Undefined) {
    return NewPlainObject(room, table, protos);
  }
  // **其余原始值给包装对象**（第 310 轮把这一格补上了）——
  // 原来这里**响亮地抛**（`unimplemented: Object(primitive) needs wrapper objects`），
  // 理由是「本仓没有包装对象」；现在三族都有了（`StringCtor` / `NumberCtor` /
  // `BooleanCtor` 那个 `constructing` 分支），所以这里按**各自的族**造。
  // **`Symbol` 仍抛**：符号包装对象今天没有别的用处（`Object(sym).description` 那种），
  // 而本仓的符号连属性表都没有——**不猜**（响亮地抛，与原来同一条纪律）。
  if (only.Tag === ValueTag.Bool) return MakeBox(room, table, protos, protos.Boolean, only);
  if (only.Tag === ValueTag.Int32 || only.Tag === ValueTag.Float64) {
    return MakeBox(room, table, protos, protos.Number, only);
  }
  if (only.Tag === ValueTag.String) return MakeStringBox(room, table, protos, only);
  throw new Error("unimplemented: Object(symbol) needs a symbol wrapper");
}
if (id === ArrayCtor) {  // **一个数是长度、其余是元素**（JS 的口径，见 `ArrayCtor` 那一段）。
  // **「一个数字实参」这一档的判据是「是不是数字」，不是「是不是 Int32」**（第 692 轮，普查当场红的）：
  // JS 的 `Array(len)` 只认 `0 ≤ len ≤ 2^32-2` 的**整数**，其余一律
  // `RangeError: Invalid array length`（`new Array(-1)` / `new Array(1.5)` /
  // `new Array(NaN)` / `new Array(Infinity)` / `new Array(2 ** 32 - 1)`）。
  // **原来两条都错**：负数抛的是**普通 `Error`**（`e instanceof RangeError` 分不出来），
  // 而 `new Array(1.5)` **根本不进这一支** ⇒ 落到底下「一个实参就是一个元素」那条路
  // ⇒ **静默给 `[1.5]`**（Node 抛）。
  if (args.length === 1 && (args[0].Tag === ValueTag.Int32 || args[0].Tag === ValueTag.Float64)) {
    const count = NumericOf(args[0]);
    if (Number.isInteger(count) === false || count < 0 || count > 4294967294) {
      throw new RangeError("Invalid array length");
    }
    // **洞也要计费**：`Truncate` 会按长度铺满洞（`heap.xl.md` 写着它「变长时新增的全是洞」），
    // 所以先按最坏情况问一次（`ObjectCharge` 那一份由 `NewPlainArray` 自己问）。
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
  // **`s.description`**（第 241 轮）：`self` 就是**那个符号**
  //（判据 `symbol-description` 读的正是 `String(s1.description)`）。
  //
  // **没描述给 `undefined`**（JS 的规矩：`Symbol().description` 是 `undefined`，
  // 而 `Symbol("").description` 是**空串**）——所以判据是「句柄是不是 `0`」，
  // **不是**「字符串长不长」（`0` 那一格表示「没有」，`heap.xl.md` 写着）。
  //
  // **符号值没有原型那一格**（它不是一个对象）——所以这个属性**只能由
  // `get_prop` 那条路特判**，见下面 `GetProperty` 那一处。
  if (self.Tag !== ValueTag.Symbol) return Value.Undefined();
  const record = table.Get(self.Ref).AsSymbol();
  if (record.Description === 0) return Value.Undefined();
  return Value.FromString(record.Description);
}
if (id === SymbolToString) {
  // **`s.toString()`**（第 277 轮）——引擎在 `get_prop` 那一处交出一个 `HostRef`
  //（见 `vm.xl.md` 的 `ToStringKey`），调用落到这里。
  // **`self` 就是那个符号**（与 `SymbolDescription` 一条路）。
  // **没描述给 `Symbol()`**（JS 的口径：`Symbol().toString()` 是 `"Symbol()"`）——
  // 所以判据还是**句柄是不是 `0`**，不是「串长不长」（与上面那一支一字不差）。
  // **不是符号就抛**：这一格**只**由上面那条特判交出来，真走到别处说明接线错了
  //（静默给一个 `"Symbol()"` 会让 `(1).toString()` 变成一个看不出问题的答案）。
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
  // **`Symbol.for(名字)`**（第 277 轮）——**按名字去重**（这一层唯一一处这么做的地方）。
  // **名字先 `ToString`**（JS 的口径）：`Symbol.for(1)` 与 `Symbol.for("1")` 是**同一个**——
  // 所以键不能用实参本身的类型去拼（`ValueText` 走的是与 `console.log` 同一个出口）。
  const forName = args.length > 0 ? ValueText(table, args[0]) : "undefined";
  // **注册表的键带一个前缀**（`for:`）——理由是 `keyFor` 那一问：
  // 那张表**同时**装着五个知名符号（`"iterator"` 那几格），
  // 而 `Symbol.keyFor(Symbol.iterator)` 在 JS 里是 `undefined`（它**不是**注册过的）。
  // 没有前缀的话，反查那一趟会把知名符号认成注册过的（**静默错值**）；
  // 有前缀则「**键以 `for:` 开头**」就是「注册过」的判据（知名符号的名字都不会这么开头）。
  const registryKey = Value.FromString(table.CreateString(Units("for:" + forName)));
  const registry = Value.FromObject(protos.WellKnownSymbols);
  const already = FindProperty(room, table, protos.WellKnownSymbols, registryKey);
  if (already !== null && already.Owner === protos.WellKnownSymbols) {
    return table.Get(protos.WellKnownSymbols).Props[already.Index].Value;
  }
  // **造一个新符号，描述就是那个名字**（JS 的口径：`Symbol.for("x").description` 是 `"x"`）。
  if (!room(ObjectCharge + ValueCharge * 2 + CodeUnitCharge * forName.length)) {
    throw new Error("out of room");
  }
  const created = Value.FromRef(ValueTag.Symbol, table.CreateSymbol(table.CreateString(Units(forName))));
  SetHiddenProperty(room, table, registry, registryKey, created);
  return created;
}
if (id === SymbolKeyFor) {
  // **`Symbol.keyFor(符号)`**（第 277 轮）——**反着查一趟注册表**。
  //
  // **为什么是线性扫而不是「符号上存个名字」**：符号**没有属性表**
  //（它不是一个对象，`SetHiddenProperty` 落不下去）——所以反查只能在**注册表那一侧**做。
  // 表很小（只有脚本自己 `Symbol.for` 过的那些），扫一趟是应该的。
  //
  // **不是符号就抛 `TypeError`**（JS 的口径：`Symbol.keyFor(1)` 抛）——
  // **不静默给 `undefined`**：那会让「这个符号没注册过」与「你给的根本不是符号」
  // 变成同一个答案（调用方分不出来）。
  if (args.length < 1 || args[0].Tag !== ValueTag.Symbol) {
    throw new TypeError("Symbol.keyFor needs a symbol");
  }
  const registryItem = table.Get(protos.WellKnownSymbols);
  for (let i = 0; i < registryItem.Props.length; i++) {
    const entry = registryItem.Props[i];
    if (entry.Kind === PropertyKind.Accessor) continue;
    if (table.Get(entry.Key).Tag !== ValueTag.String) continue;
    const entryName = TextFrom(table, Value.FromString(entry.Key));
    // **前缀就是「注册过」的判据**（理由写在 `SymbolFor` 那一支里）。
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
  // **注册表里没有就给 `undefined`**（JS 的口径：`Symbol("x")` 与知名符号都走这一支）。
  return Value.Undefined();
}
if (id === MathFloor) {
  return MathResult(Math.floor(MathArgOf(room, call, protos, table, args[0])));
}
if (id === MathAbs) {
  const value = MathArgOf(room, call, protos, table, args[0]);
  // **`-0` 要折成 `+0`**（第 274 轮）：下面那句「负数就取反」的判据是 `value < 0`，
  // 而 **`-0 < 0` 在 JS 里是假**——于是 `-0` 被原样交了出去。
  // 实测 `Math.abs(-0)` 给 `-0`、`1 / Math.abs(-0)` 给 `-Infinity`（node 给 `0` 与 `Infinity`）：
  // **静默错值**（判据 `math-min-max-edge` 量到的就是它，第 273 轮普查收进来的）。
  // **判据是 `value === 0`**：`-0 === 0` 是**真**，于是两种零都收到同一个出口；
  // 而 `NaN` 不走这一支（`NaN === 0` 是假），落回下面那句、原样交出去（JS 也是 `NaN`）。
  if (value === 0) return MathResult(0);
  return MathResult(value < 0 ? 0 - value : value);
}
if (id === MathMax || id === MathMin) {
  // **空实参也有答案**（第 206 轮）：JS 的 `Math.max()` 是 `-Infinity`、
  // `Math.min()` 是 `Infinity`（「比谁都小 / 比谁都大」的那个初值）——
  // 原来这里直接读 `args[0]`，于是 `Math.min()` 崩成
  // `Cannot read properties of undefined (reading 'Tag')`（判据 `math-abs-min-max` 现场红的）。
  if (args.length === 0) {
    return MathResult(id === MathMax ? -Infinity : Infinity);
  }
  let best = MathArgOf(room, call, protos, table, args[0]);
  // **第一个实参也可能是 `NaN`**（`Math.max(NaN, 1)` 也是 `NaN`）。
  if (best !== best) return MathResult(NaN);
  for (let i = 1; i < args.length; i++) {
    const value = MathArgOf(room, call, protos, table, args[i]);
    // **`NaN` 会传染**（第 206 轮）：JS 的 `Math.min(1, NaN)` 是 `NaN`——
    // 而「比大小」那两条判据对 `NaN` **永远为假**，于是它会**静默**被跳过
    //（实测：`Math.min(1, NaN)` 给 `1`，node 给 `NaN`）。
    // 与 `+` / 关系比较那几张表同一条纪律：**`NaN` 的传播要显式写出来**。
    if (value !== value) return MathResult(NaN);
    if (id === MathMax) {
      if (value > best) best = value;
      // **两个零之间的次序**（第 288 轮）：JS 的 `Math.max(-0, 0)` 是 **`+0`**、
      // `Math.max(-0, -0)` 是 `-0`——而 `-0 > 0` 是**假**，于是上面那一句
      // **静默**把 `+0` 丢了（实测 `1 / Math.max(-0, 0)` 给 `-Infinity`，
      // Node 给 `Infinity` —— 与 `Math.min` 那一半**正好相反**）。
      // 判据收在一句上：**两个都是零时，`+0` 赢**（`value === 0` 对两种零都真，
      // 而 `1 / value > 0` 只对 `+0` 真）。
      else if (value === 0 && best === 0 && 1 / value > 1 / best) best = value;
    } else {
      if (value < best) best = value;
      // **`min` 那一半：`-0` 赢**（`Math.min(0, -0)` 是 `-0`，`Math.min(-0, -0)` 也是 `-0`）。
      // 同一句判据翻个方向——`1 / value < 1 / best` 只对 `-0` 真。
      else if (value === 0 && best === 0 && 1 / value < 1 / best) best = value;
    }
  }
  return MathResult(best);
}
if (id === MathRound || id === MathCeil || id === MathTrunc || id === MathSign) {
  // **四个都在 `MathResult` 那条口径上**（整的给 Int32）——这些函数的结果**本来就是整数**，
  // 所以不存在「算得出、打不出」那一类坑。
  const value = MathArgOf(room, call, protos, table, args[0]);
  if (id === MathRound) return MathResult(Math.round(value));
  if (id === MathCeil) return MathResult(Math.ceil(value));
  if (id === MathTrunc) return MathResult(Math.trunc(value));
  return MathResult(Math.sign(value));
}
if (id === MathSqrt) {
  // **浮点现在打得出来了**（第 124 轮），所以这一支放行。
  const value = MathArgOf(room, call, protos, table, args[0]);
  if (value < 0) return MathResult(NaN);
  return MathResult(Math.sqrt(value));
}
if (id === MathLog || id === MathExp || id === MathCbrt || id === MathHypot) {
  // **第 206 轮补的四格**（`log` / `exp` / `cbrt` / `hypot`）——
  // 与 `sqrt` / `pow` 同一档（结果多为非整数，第 124 轮之后才谈得上放行）。
  // `hypot` 是**多实参**那一档（与 `max` / `min` 同形）：`Math.hypot(3, 4)` 是 `5`。
  //
  // **零实参那一档**（第 288 轮）：JS 的 `Math.hypot()` 是 **`0`**
  //（「谁都没有、平方和是 0」）。原来这里直接读 `args[0]` ⇒ `MathArgOf(undefined)` 崩
  //（`Cannot read properties of undefined (reading 'IsObject')`——那句话听起来像引擎坏了，
  // 其实是**少了一条早退**）。与 `Math.max()` / `Math.min()` 第 206 轮那条早退
  // **同一个形状**（那一处也写着理由）。
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
  // **三角七格**（第 288 轮）——一律交给宿主那一格（与第 275 轮那十格同一条纪律：
  // `asin` / `acos` / `atan` 照着别的函数凑出来的在边界上会差最后一位，而判据是逐字节比）。
  // **`atan2` 是两个实参那一档**（与 `pow` / `imul` 同形）。
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
if (id === MathImul || id === MathClz32 || id === MathFround || id === MathF16Round
  || id === MathExpm1 || id === MathSinh
  || id === MathCosh || id === MathTanh || id === MathLog2 || id === MathLog10 || id === MathLog1p
  // **第 372 轮补的三格**（双曲函数的反函数，号 `372..374`）——
  // 与上面这十格**走同一支**（同一个实参取值器、同一个 `MathResult`、同样不自己凑）。
  || id === MathAsinh || id === MathAcosh || id === MathAtanh) {
  // **第 275 轮补的十格**。**一律交给宿主那一格**（一个一个转调）：
  // 这十格每一个都有一处「照着近义函数自己凑就会错」的地方——
  // `imul` 不是 `a * b`（乘的是低 32 位）、`fround` 不是原样交出去（要过一趟 f32）、
  // `expm1` 不是 `exp(x) - 1`（很小的入参上后者会把有效位全丢掉）、
  // `log1p` 同理、`log2` / `log10` 也不是「换底自己算」。
  // **自己凑出来的东西看着是对的**——而判据是**逐字节**比（`Math.log2(8)` 对 `3`），
  // 所以这一批**一个字都不自己算**。
  // **`MathArgOf` 对缺实参给 `NaN`**（与 JS 一致），所以不必为「少给一个」另立一条抛。
  const first = MathArgOf(room, call, protos, table, args[0]);
  if (id === MathImul) {
    // **两个实参**（与 `pow` / `max` 同形）。
    return MathResult(Math.imul(MathArgOf(room, call, protos, table, args[0]),
      MathArgOf(room, call, protos, table, args[1])));
  }
  if (id === MathClz32) return MathResult(Math.clz32(first));
  if (id === MathFround) return MathResult(Math.fround(first));
  // **第 703 轮**：f16 那一格与 fround **同一条口径**（交给宿主，见 `MathF16Round` 那一段）。
  if (id === MathF16Round) return MathResult(F16Round(first));
  if (id === MathExpm1) return MathResult(Math.expm1(first));
  if (id === MathSinh) return MathResult(Math.sinh(first));
  if (id === MathCosh) return MathResult(Math.cosh(first));
  if (id === MathTanh) return MathResult(Math.tanh(first));
  if (id === MathAsinh) return MathResult(Math.asinh(first));
  if (id === MathAcosh) return MathResult(Math.acosh(first));
  if (id === MathAtanh) return MathResult(Math.atanh(first));
  if (id === MathLog2) return MathResult(Math.log2(first));
  if (id === MathLog10) return MathResult(Math.log10(first));
  return MathResult(Math.log1p(first));
}
if (id === MathRandom) {
  // **第 703 轮**：`Math.random()` 交给宿主那一格（见 `MathRandom` 那一段号）——
  // **它一个实参都不取**，所以不进上面那一支（那一支会为 `args[0]` 做一次 `ToNumber`）。
  return MathResult(Math.random());
}
if (id === MathPow) {
  // **两个实参**（与 `max` / `min` 同形）；少给就抛（`MathArgOf(undefined)` 给 `NaN`，
  // 而 JS 的 `Math.pow(undefined, …)` 也是 `NaN`——**两边一致**，所以不必另立一条抛）。
  return MathResult(Math.pow(MathArgOf(room, call, protos, table, args[0]),
    MathArgOf(room, call, protos, table, args[1])));
}
if (id === NumberToFixed || id === NumberToPrecision || id === NumberToExponential || id === NumberToStringRadix
  || id === BooleanToString || id === NumberValueOf || id === BooleanValueOf) {
  // **原始值的方法：`self` 就是那个原始值本身**（`GetProperty` 把 receiver 递过来，
  // 不是装箱对象——本仓不装箱）。所以这里直接取它的数值 / 真假。
  // **`valueOf` 更简单**（第 182 轮）：`ToPrimitive` 的第一步就是「原始值给回自己」，
  // 所以它**连转换都不做**——直接返回 `self`。
  //
  // **包装对象要先脱箱**（第 310 轮）：`new Number(5).toFixed(2)` 与
  // `new Boolean(false).valueOf()` 的接收者都是**普通对象**（方法是从原型上找到的）——
  // 不脱箱的话 `NumericOf(self)` / `self.AsBool()` 拿到的是一个对象
  //（症状是 `NaN` 或 `"false"` 变成别的东西）。脱箱只有一处（`UnwrapBox`），
  // 三族共用——不是三个方法各写一遍。
  const receiver = UnwrapBox(table, self);
  // **接收者的类型是各自那一族的事**（第 719 轮）：这三族原来**一次都不问**——
  // `valueOf` 那一格**原样把接收者交回去**、`toString` 那一格直接 `AsBool()`，
  // 于是两个**静默错值**：
  // `Number.prototype.valueOf.call("x")` 给 `"x"`（Node 抛 `TypeError`）、
  // `Boolean.prototype.toString.call(1)` 给 `"true"`（Node 抛 `TypeError`）。
  // **抛的种类也一起改对**：原来 `NumericOf` 抛的是**普通 `Error`**，
  // 而 `Number.prototype.toFixed.call("1.5", 1)` 在 Node 里是 `TypeError`。
  // 判据 `p719a-n15` / `p719a-c01` … `c05`。
  //
  // **判据是「载荷的标签」，不是 `IsObject()`**：这一族的接收者本来就是**原始值**
  //（本仓不装箱），所以 `Int32` / `Float64` / `Bool` 三个标签就是全部那一档。
  const receiverIsNumber = receiver.Tag === ValueTag.Int32 || receiver.Tag === ValueTag.Float64;
  const receiverIsBool = receiver.Tag === ValueTag.Bool;
  if (id === NumberValueOf) {
    if (!receiverIsNumber) {
      throw new TypeError("Number.prototype.valueOf called on a non-numeric receiver");
    }
    return receiver;
  }
  if (id === BooleanValueOf) {
    if (!receiverIsBool) {
      throw new TypeError("Boolean.prototype.valueOf called on a non-boolean receiver");
    }
    return receiver;
  }
  if (id === BooleanToString) {
    if (!receiverIsBool) {
      throw new TypeError("Boolean.prototype.toString called on a non-boolean receiver");
    }
    return Value.FromString(table.CreateString(Units(receiver.AsBool() ? "true" : "false")));
  }
  if (!receiverIsNumber) {
    throw new TypeError("Number.prototype method called on a non-numeric receiver");
  }
  const number = NumericOf(receiver);
  if (id === NumberToFixed || id === NumberToPrecision || id === NumberToExponential) {
    // **位数缺省是 0**（`(1.5).toFixed()` 是 `"2"`，JS 的口径）。
    // **`toExponential` 那一格的缺省与另外两个不同**（第 291 轮）：不带实参时
    // JS 要**尽可能多的位数**（`(0.000123).toExponential()` 是 `"1.23e-4"`），
    // 而 `toFixed()` / `toPrecision()` 都按 `0`——所以三格**不能共用一个缺省值**，
    // 这也正是「同一张表上的兄弟只差一处、而那一处最容易写错」那条老形状。
    //
    // **第 692 轮把这一格量细了**（普查当场红的）：规范对这三格**各有一套缺省口径**，
    // 而且「不给实参」与「显式给 `undefined`」是**同一档**（先问「是不是 `undefined`」、
    // 再谈 `ToIntegerOrInfinity`）——实测 Node：
    //
    // | 写法 | Node |
    // | --- | --- |
    // | `(0.1).toPrecision()` / `(0.1).toPrecision(undefined)` | `"0.1"`（= `toString`） |
    // | `(0.1).toPrecision(NaN)` | `RangeError`（`NaN` → 0，小于下限 1） |
    // | `(1.5).toFixed()` / `(1.5).toFixed(undefined)` / `(1.5).toFixed(NaN)` | `"2"`（一律 0 位） |
    // | `(0.000123).toExponential()` / `(undefined)` | `"1.23e-4"`（尽量多） |
    // | `(0.000123).toExponential(NaN)` | `"1e-4"`（`NaN` → 0 位） |
    //
    // 原来这里把「不给实参」与「给 `NaN`」**混成同一档**（都按 0）——
    // 于是 `(0.1).toPrecision()` **抛 `RangeError`**（0 位不是合法精度），
    // 而 `(5).toString(undefined)` 也抛（基数被算成 `NaN`）。
    // 三格现在**各写各的缺省**，判据就是上面那张表。
    const given = args.length > 0 && args[0].Tag !== ValueTag.Undefined;
    // **位数走 `ToIntegerOrInfinity`**（第 719 轮）：原来是 `NumericOf(args[0])`
    // ——**只认数值标签**，于是 `(1.5).toFixed(null)` / `.toFixed(true)` /
    // `.toFixed("2")` 一起抛（Node 给 `"2"` / `"1.5"` / `"1.50"`）。
    // 规范那一步是 `ToIntegerOrInfinity(fractionDigits)`：**先 `ToNumber` 再向零截断**。
    // 收进共用那一份（`array.xl.md` 的 `NumArgOr`，第 702 轮给「可选实参」立的），
    // 这里只补一句截断——**不写第二份 `ToNumber`**。
    // **`NaN` 不被 `IntOfNumber` 折走是故意的**：JS 的 `(1.5).toFixed(NaN)` 给 `"2"`
    //（`NaN` → 0 位），而 `toPrecision(NaN)` 抛 `RangeError`（0 位不是合法精度）——
    // 两档的差别在**宿主那一支**里，所以这里**原样把 `NaN` 交给它**，
    // 折成 `fallback` 反而会把 `toPrecision(NaN)` 变成 `"0.1"`（静默错值）。
    const digits = given ? Math.trunc(NumArgOr(room, call, protos, table, args, 0, 0)) : -1;
    let text = "";
    if (id === NumberToFixed) {
      // **`toFixed` 缺省给 0**（`NaN` 那一档也归它——实测 Node 给 `"2"`，不是抛）。
      text = number.toFixed(given ? digits : 0);
    } else if (id === NumberToPrecision) {
      // **不给位数 = `toString`**（借宿主那一格不带实参的形态）。
      text = given ? number.toPrecision(digits) : number.toPrecision();
    } else if (given) {
      text = number.toExponential(digits);
    } else {
      text = number.toExponential();
    }
    if (!room(ObjectCharge + CodeUnitCharge * text.length)) throw new Error("out of room");
    return Value.FromString(table.CreateString(Units(text)));
  }
  // **基数的「不给」与「给 `undefined`」也是同一档**（第 692 轮，与上面同一句）：
  // 实测 Node `(5).toString(undefined)` 是 `"5"`，而 `(5).toString(NaN)` 抛 `RangeError`
  //（`NaN` → 0 → 小于下限 2；而**字面的 `0`** 规范里映射成 10，宿主自己办得到）。
  const radixGiven = args.length > 0 && args[0].Tag !== ValueTag.Undefined;
  // **基数同一条**（第 719 轮）：`(5).toString("16")` 在 Node 里是 `"5"`、
  // `(5).toString(10.9)` 也是 `"5"`（`ToIntegerOrInfinity` 先截断），
  // 而这里原来只有 `NumericOf` ⇒ 两档都抛。
  const radix = radixGiven ? Math.trunc(NumArgOr(room, call, protos, table, args, 0, 10)) : 10;
  // **基数 10 走语言层那一处**（`text.xl.md` 的 `NumberToJsText`——它在
  // `NumberToHostText` 之上补了 `-0` 那一格：JS 的 `(-0).toString()` 是 `"0"`）；
  // **其余基数借宿主**（见号那一段的说明）。
  const text = radix === 10 ? NumberToJsText(number) : number.toString(radix);
  if (!room(ObjectCharge + CodeUnitCharge * text.length)) throw new Error("out of room");
  return Value.FromString(table.CreateString(Units(text)));
}
if (id === ObjectHasOwnProperty) {
  // **`Object.prototype.hasOwnProperty`**（第 209 轮）：只问**自己**那一格，
  // 原型链上的**不算**（`new A().hasOwnProperty("m")` 是**假**——`m` 在 `A.prototype` 上）。
  // 与 `in` 的差别就是这一条，所以两处**不能互相顶替**。
  // **不能用 `FindProperty`**：那一位是**沿链找**（`props.xl.md`）——正是这里要**排除**的那一半。
  if (args.length < 1) return Value.FromBool(false);
  // **`null` / `undefined` 要抛**（第 691 轮，与 `Object.hasOwn` 那一支同一句话）：
  // JS 在这一步先做 `RequireObjectCoercible`——
  // `Object.prototype.hasOwnProperty.call(null, "x")` 给
  // `TypeError: Cannot convert undefined or null to object`，本仓原来答**假**。
  if (self.Tag === ValueTag.Null || self.Tag === ValueTag.Undefined) {
    throw new TypeError("Cannot convert undefined or null to object");
  }
  // **非字符串的键先过 `ToString`**（JS 的 `ToPropertyKey`）：`o.hasOwnProperty(1)` 是通的。
  // **符号键不走这一趟**（第 691 轮）：`TextFrom` 对符号抛，而那正是「整份脚本挂掉」；
  // 符号键本来就该**按身份**问（`KeyMatches` 那条路）。
  const askedKey = args[0].Tag === ValueTag.String || args[0].Tag === ValueTag.Symbol
    ? args[0]
    : Value.FromString(table.CreateString(Units(TextFrom(table, args[0]))));
  // **字符串接收者**（第 692 轮，普查当场量到的）：`"abc".hasOwnProperty("length")` 与
  // `"abc".hasOwnProperty(0)` 在 JS 里都是**真**（每一个码元下标 + `length` 都是
  // **自有**属性），本仓原来在下面那句 `self.Tag !== Object && !== Array` 上**答假**——
  // **静默错值**，而且同一个问题在这里与 `Object.hasOwn` 那一支（第 691 轮已经收下字符串）
  // 是**两个答案**（`Object.hasOwn("ab", 0)` 早就是真）。
  // **走同一支**：`getOwnPropertyDescriptor` 那一支早就收字符串（下标 / `length` /
  // 越界给 `undefined`），所以「不是自有属性」的判据就是**它给 `undefined`**——
  // 不另写一份「哪些键算自有」的名单（那正是两份答案的来源）。
  if (self.Tag === ValueTag.String) {
    const stringDescriptor = InvokeGlobal(room, call, table, protos, ObjectGetOwnPropertyDescriptor,
      self, [self, askedKey],
      sink, failed, false);
    return Value.FromBool(!stringDescriptor.IsNullish());
  }
  // **函数自己那两格**（第 692 轮，与 `Object.hasOwn` 那一支同一句话）：
  // `length` / `name` **不住在属性表里**（`getOwnPropertyDescriptor` 对函数响亮地抛），
  // 而 JS 里它们都是**自有、不可枚举** ⇒ `(function (a) {}).hasOwnProperty("length")` 是**真**。
  if ((self.Tag === ValueTag.Function || self.Tag === ValueTag.Closure)
    && askedKey.Tag === ValueTag.String
    && (TextFrom(table, askedKey) === "length" || TextFrom(table, askedKey) === "name")) {
    return Value.FromBool(true);
  }
  // **受限属性那两格也是自有的**（第 709 轮）：`(function f() {}).hasOwnProperty("arguments")`
  // 在 Node 里是**真**（`arguments` / `caller` 是松散普通函数的自有属性）——
  // 与上面 `length` / `name` 同一句话，只是**多问一位**（箭头 / 方法那一档答假）。
  if (self.Tag === ValueTag.Closure && askedKey.Tag === ValueTag.String
    && table.Get(self.Ref).AsClosure().HasRestricted
    && (TextFrom(table, askedKey) === "arguments" || TextFrom(table, askedKey) === "caller")) {
    return Value.FromBool(true);
  }
  // **数组的下标也是自有属性**（第 706 轮，**普查当场红的**）：元素**不住在 `Props` 里**
  // （在 `Elements` 上），所以下面那一趟扫描**一格都碰不到它** ⇒ `[7].hasOwnProperty(0)`
  // 答**假**，而 JS 答**真**（判据 `p706c-x07`：node 给 `true,true`、本仓给 `true,false`）。
  // **与字符串那一支同一个做法**：问 `getOwnPropertyDescriptor`——
  // 它那一支早就收下标键（数组元素 / 字符串码元 / 洞与越界给 `undefined`），
  // 「不是自有属性」的判据就是**它给 `undefined`**。
  // **两档共用一个答案**，不另写一份「哪些键算数组的自有属性」的名单。
  // **`Object.hasOwn` 那一支早就是对的**（它走的是同一条路）——
  // 所以这一处的症状正是「同一个问题两个答案」里那个错的。
  if (self.Tag === ValueTag.Array && IsIndexKeyText(TextFrom(table, askedKey))) {
    const arrayDescriptor = InvokeGlobal(room, call, table, protos, ObjectGetOwnPropertyDescriptor,
      self, [self, askedKey],
      sink, failed, false);
    return Value.FromBool(!arrayDescriptor.IsNullish());
  }
  // **闭包自己的属性表也要扫**（第 709 轮，**普查当场量到的**）：
  // `(function f() {}).hasOwnProperty("prototype")` 在 Node 里是**真**
  //（`prototype` 是函数**自有**的一格，`AttachPrototype` 写的），而本仓原来在这里
  // 就把闭包挡在外面（`self.Tag !== Object && !== Array` ⇒ 答假）——
  // **同一个属性两种问法两个答案**（`Object.getOwnPropertyNames` 列得出它、
  // `hasOwnProperty` 说没有）。所以闭包与 `Function` **一起走下面那一趟扫描**：
  // 箭头 / 方法没有 `prototype` 那一格，扫描自然答假——**不另写一份名单**。
  if (self.Tag !== ValueTag.Object && self.Tag !== ValueTag.Array
    && self.Tag !== ValueTag.Closure && self.Tag !== ValueTag.Function) {
    return Value.FromBool(false);
  }
  const ownProps = table.Get(self.Ref).Props;
  for (let i = 0; i < ownProps.length; i++) {
    if (KeyMatches(table, ownProps[i], askedKey)) return Value.FromBool(true);
  }
  return Value.FromBool(false);
}
if (id === ObjectHasOwn || id === ObjectPropertyIsEnumerable) {
  // **`Object.hasOwn(o, k)`** 与 **`Object.prototype.propertyIsEnumerable(k)`**（第 372 轮）——
  // 两格是**同一个问法的两半**：一个问「那一格**在不在**」、
  // 一个问「那一格**在、而且可枚举**吗」。**所以两格走同一支**（同一个接收者取值、
  // 同一次 `getOwnPropertyDescriptor`）——分成两支就是两处会漂的答案。
  //
  // **接收者与键的取法不一样**（这是两格唯一的差别）：
  //   · `hasOwn`：接收者是**第一个实参**、键是**第二个**（`Object.hasOwn(o, "k")`）；
  //   · `propertyIsEnumerable`：接收者是 **`self`**（`GetProperty` 递过来的）、
  //     键是**第一个**实参。少给实参一律当 `undefined`（与本块其余实参位同一条）。
  const hasOwnMode = id === ObjectHasOwn;
  const ownReceiver = hasOwnMode ? (args.length > 0 ? args[0] : Value.Undefined()) : self;
  const ownAsked = hasOwnMode
    ? (args.length > 1 ? args[1] : Value.Undefined())
    : (args.length > 0 ? args[0] : Value.Undefined());
  // **`null` / `undefined` 那一档要抛**（第 691 轮，普查当场量到的）：
  // 下面那条「不是对象 ⇒ 假」的挡板**把它们也当成「假」了**——
  // 而 JS 的 `RequireObjectCoercible` 在这一步就抛
  //（`Object.prototype.hasOwnProperty.call(null, "x")` 给
  // `TypeError: Cannot convert undefined or null to object`，判据 `object-hasown-and-propertyisenumerable`）。
  // **只有这两档抛**：数字 / 布尔 / 符号走装箱、字符串有下标属性，都答真或假。
  if (ownReceiver.Tag === ValueTag.Null || ownReceiver.Tag === ValueTag.Undefined) {
    throw new TypeError("Cannot convert undefined or null to object");
  }
  // **原始值里只有字符串有自有属性**：`Object.hasOwn("ab", 0)` 在 JS 里是**真**
  //（字符串的每一个码元下标都是自有属性），而数字 / 布尔 / `null` / `undefined` 一律**假**
  //（JS 把它们装箱之后也没有自有属性——`Object.hasOwn(1, "x")` 是假、不抛）。
  // **所以这里先挡一道**，而不是把它交给 `getOwnPropertyDescriptor`（那一支对非对象
  // **响亮地抛**——那是它自己的口径，可用在这里会把「假」变成「抛」）。
  if (ownReceiver.Tag !== ValueTag.Object && ownReceiver.Tag !== ValueTag.Array
    && ownReceiver.Tag !== ValueTag.String && ownReceiver.Tag !== ValueTag.Function
    && ownReceiver.Tag !== ValueTag.Closure) {
    return Value.FromBool(false);
  }
  // **键先过一趟 `ToPropertyKey`**（`TextFrom` 就是那一趟）：`Object.hasOwn([1], 0)` 是**真**
  //（数字键与下标键是同一格——`hasOwnProperty` 那一支同一句话）。
  //
  // **符号键不走这一趟**（第 691 轮，普查当场撞到的）：`TextFrom` 对符号**响亮地抛**
  //（`cannot convert a Symbol value to a string`），于是
  // `o.propertyIsEnumerable(某个符号)` **整份脚本挂掉**——而 JS 里它答真 / 假。
  // 符号键本来就该**按身份**问（`KeyMatches` 那条路），所以这里只是**别把它转成文本**：
  // 交给 `getOwnPropertyDescriptor` 的那一格原样是**符号值**
  //（第 680 轮起它收符号，见 `ObjectDefineProperty` 那一处的账）。
  const symbolicOwnKey = ownAsked.Tag === ValueTag.Symbol;
  const ownKeyText = symbolicOwnKey ? "" : TextFrom(table, ownAsked);
  // **函数上的 `length` / `name` 是唯一手工认的一档**：它们**不住在属性表里**
  //（`getOwnPropertyDescriptor` 那一支对函数**响亮地抛**，同一句话在那边写着）。
  // JS 里这两格是**自有、不可枚举** ⇒ `hasOwn` 真、`propertyIsEnumerable` 假。
  if (!symbolicOwnKey
    && (ownReceiver.Tag === ValueTag.Function || ownReceiver.Tag === ValueTag.Closure)
    && (ownKeyText === "length" || ownKeyText === "name")) {
    return Value.FromBool(hasOwnMode);
  }
  const ownKeyValue = symbolicOwnKey ? ownAsked : Value.FromString(table.CreateString(Units(ownKeyText)));
  const ownDescriptor = InvokeGlobal(room, call, table, protos, ObjectGetOwnPropertyDescriptor,
    ownReceiver, [ownReceiver, ownKeyValue],
    sink, failed, false);
  // **「不是自有属性」= 那一支给 `undefined`**（洞、越界、继承来的 全是这一档）。
  if (ownDescriptor.IsNullish()) return Value.FromBool(false);
  if (hasOwnMode) return Value.FromBool(true);
  // **可枚举那一格**：描述符的**形状**（数据属性四格 / 访问器两格）已经在
  // `getOwnPropertyDescriptor` 那一处定过了——这里只读**一格**，不重建描述符。
  const enumerableKey = NameValue(table, "enumerable");
  const enumerableFound = FindProperty(room, table, ownDescriptor.Ref, enumerableKey);
  if (enumerableFound === null || enumerableFound.Owner !== ownDescriptor.Ref) return Value.FromBool(false);
  // **`FindProperty` 给的是「哪一格」**（`Owner` + `Index`，不是值本身）——
  // 值与 `getOwnPropertyDescriptor` 那一支取法**一字不差**（`Props[Index]`）。
  const enumerableProperty = table.Get(ownDescriptor.Ref).Props[enumerableFound.Index];
  return Value.FromBool(RtToBoolean(table, enumerableProperty.Value).AsBool());
}
if (id === ObjectCreate) {
  // **`Object.create(proto)`**（第 209 轮）：造一个空对象、把它的**原型**指过去。
  // **它不该走「原型跟着谁走」那条顺手的路**（`NewPlainObject` 给的是 `Object.prototype`）——
  // 要的正是**换掉**那一格（`child.greet()` 于是沿这条链找到 `proto` 上的方法）。
  const made = NewPlainObject(room, table, protos);
  if (args.length === 0) return made;
  const proto = args[0];
  if (proto.Tag === ValueTag.Null) {
    // **`Object.create(null)`**（第 299 轮）——`Proto = 0` 就是「没有原型」。
    //
    // **第 209 轮那一版抛了**，理由写的是「『没有』与『`Object.prototype`』在
    // `GetProperty` 那条路上**长得一样**」——**量了一下：它们不一样**。
    // `props.xl.md` 的 `FindProperty` 循环判的是 `current > 0`，
    // 所以 `Proto = 0` 那一档**天然就是「到此为止」**（`GetProperty` 沿链找不到 ⇒ `undefined`）。
    // 而「长得一样」说的是**另一件事**：`NewPlainObject` 给新对象填的是 `protos.Object`——
    // 所以「没设过」与「设成 0」**是两档**，只是当时没有把 `0` 真的写进去过。
    // **判据就是这一句**：`"toString" in Object.create(null)` 在 JS 里是**假**
    //（判据 `object-create-and-prototype-forms` 量着它）。
    table.Get(made.Ref).Proto = 0;
  } else {
    if (proto.Tag !== ValueTag.Object) {
      throw new Error("unimplemented: Object.create over a prototype that is not an object");
    }
    table.Get(made.Ref).Proto = proto.Ref;
  }
  // **第二格实参：属性描述表**（第 299 轮）——以前**整格丢掉**
  //（`Object.create(proto, { a: { value: 1, enumerable: true } })` 之后 `o.a` 是 `undefined`，
  //  而 `Object.keys(o)` 是空的——**两句都看着像「那个对象就是空的」**，**静默错值**，
  //  判据 `object-create-with-properties` / `object-create-and-prototype-forms` 量的就是它）。
  //
  // **第 691 轮补上另一半**：`Object.create(null, 描述表)` 那一档原来**当场 `return`**——
  // 无原型那一支写完 `Proto = 0` 就交回对象，**第二格实参连看都没看**
  //（判据 `object-create-with-properties` 量的就是它：`o.a` 是 `undefined`、`Object.keys(o)` 空的，
  //  与「`proto` 传 `null`」这个无关的差别**一起**静默）。
  // 两支现在**合流到同一段描述符处理**：无原型只是 `Proto = 0` 的一次赋值，不是一条出路。
  //
  // **走 `DefineOwnFromDescriptor` 那条既有的路**（与 `defineProperties` 一字不差）：
  // 扫描述符表里**可枚举的自有属性**、逐格写——**不新写一条**
  //（新写一条就是第二份「描述符怎么读」，而里面有两处**不能抄**的判断：
  //  默认三个标志全是假、访问器那两格）。
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
  // **`Object.getPrototypeOf(o)`**（第 209 轮）：把那一格原型**当值**交出去
  //（`Object.getPrototypeOf([]) === Array.prototype`、`Object.getPrototypeOf(new A()) === A.prototype`）。
  // **取法抽成了 `PrototypeOfValue`**（第 697 轮）：`__proto__` 那个访问器的 getter
  // 与这一格是**同一件事**（规范里就是一句转交），两份就是两处会漂的答案。
  if (args.length < 1) throw new Error("this method needs an argument");
  return PrototypeOfValue(protos, table, args[0]);
}
if (id === ObjectProtoGet) {
  // **`({}).__proto__`**（第 697 轮）：与 `getPrototypeOf` **同一处取法**——
  // 差别只有「接收者从哪儿来」：那一支读 `args[0]`、这一支读 `self`（访问器的接收者）。
  // **原始值接收者也照答**（JS 会先 `ToObject`）：`(1).__proto__` 是 `Number.prototype`——
  // 与 `Object.getPrototypeOf(1)` 同一条表。
  return PrototypeOfValue(protos, table, self);
}
if (id === ObjectProtoSet) {
  // **`o.__proto__ = p`**（第 697 轮）——**两档静默不做事**（JS 的口径，见号那一段）：
  // 接收者不是对象（`(1).__proto__ = {}`）、原型不是对象也不是 `null`（`o.__proto__ = 1`）。
  // **其余交给 `RtSetProto`**：那一条已经有「自环当场拒」「深度上限」两处保护，
  // 而 `null` 那一档（`o.__proto__ = null` 真的断开链）这一轮刚在那边补上——
  // 这里再写一遍就是第二份会漂的答案。
  if (!self.IsObject()) return Value.Undefined();
  const wanted = args.length > 0 ? args[0] : Value.Undefined();
  if (!wanted.IsObject() && wanted.Tag !== ValueTag.Null) return Value.Undefined();
  RtSetProto(table, self, wanted);
  return Value.Undefined();
}
if (id === ErrorToString) {
  // **`Error.prototype.toString`**（第 213 轮）——JS 的三条规矩：
  // **`name` 缺省 `"Error"`**（`Error.prototype.name` 就是它）、**`message` 缺省空串**、
  // **两格任一为空就只给另一个**（空串不是「`": "` 那种拼接」）。
  // **两格要「真读一次属性」**（不是直接给类型名）：`e.name = "MyError"` 这种写法遍地都是，
  // 而 `message` 更是构造时就写在实例上的自有属性。属性读**可能调 getter**，
  // 所以它要一条调用通道——宿主没接时必须**响亮**说清（而不是偷偷给个默认值）。
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
  // **`Function.prototype.call` / `apply`**（第 228 轮）：`self` 是**被调的那个函数**
  //（`greet.call(o, 1, 2)` 里 `self` 就是 `greet`——方法调用的 `this` 是接收者，
  // 而这里接收者正好就是那个函数）。
  //
  // **可调性要判**（`IsCallableValue`，第 145 轮）：`Function.prototype.call.call(1)`
  // 在 JS 里是 `TypeError`——用 `IsCallable()`（不带堆的那一半）会漏掉
  // 「带载荷的对象」那一档（`Array.call(...)` 是能调的），
  // 而漏掉它的症状是**静默**换了语义，与 `[1, 2].map(String)` 那条同型。
  if (!IsCallableValue(table, self)) {
    throw new TypeError("Function.prototype.call/apply called on a non-function");
  }
  if (call === null) {
    throw new Error("Function.prototype.call needs a call channel (the host must pass one)");
  }
  // **`thisArg` 的缺省是 `undefined`**（JS 的口径）：`f.call()` 是「不给 `this`」
  // ——不是「`this` 是 `undefined` 这个**值**」那种区别在本仓里看不出来（不装箱）。
  let invokedThis = args.length > 0 ? args[0] : Value.Undefined();
  // **原始值接收者要装箱**（第 710 轮，**静默错值**）：JS 的 `OrdinaryCallBindThis`
  // 在**松散**模式下对原始值做一次 `ToObject`——
  // `(function () { return typeof this; }).call(1)` 在 Node 里给 `"object"`
  //（`this` 是 `Number` 包装对象），本仓原来把那个数**原样递进去** ⇒ 给 `"number"`。
  // **严格目标不装箱**（它拿到什么就是什么）——所以判据里要问**目标**那一位
  //（闭包的 `IsStrict`，第 620 轮起由降级层填）。
  // **对象 / `null` / `undefined` 三档不碰**：前者的 `ToObject` 就是它自己，
  // 后一档由引擎换成全局对象（`vm.xl.md` 的 `DoCallValue`）。
  if (self.Tag === ValueTag.Closure && !table.Get(self.Ref).AsClosure().IsStrict) {
    invokedThis = BoxReceiver(room, table, protos, invokedThis);
  }
  let invokedArgs: Value[] = [];
  if (id === FunctionCall) {
    // **`call`：`args[1..]` 就是实参表**——逐个搬进一个新数组。
    for (let i = 1; i < args.length; i++) invokedArgs.push(args[i]);
  } else {
    // **`apply`：第二格**就是实参表。
    // **数组与「类数组」都认**（第 377 轮补上后一半）：JS 的 `apply` 走的是
    // `CreateListFromArrayLike`——它只要「一个 `length` 与一串下标」，
    // 所以 `f.apply(null, arguments)` / `f.apply(null, { length: 2, 0: 1, 1: 2 })`
    // 都是**日常写法**（前者在真实代码里遍地都是）。
    // **原来只认真数组**，类数组**响亮地抛**（那比静默当成零个实参好，可它仍然是缺口）。
    // **两个助手都是现成的**（第 335 / 338 轮给 `slice` / `join` 那一族备的：
    // `ArrayLikeLength` / `ArrayLikeAt`）——**不另写一份「长度怎么读」**。
    if (args.length > 1 && args[1].Tag !== ValueTag.Undefined && args[1].Tag !== ValueTag.Null) {
      if (args[1].Tag === ValueTag.Array) {
        const supplied = table.Get(args[1].Ref).AsArray();
        for (let i = 0; i < supplied.GetLength(); i++) invokedArgs.push(supplied.GetAt(i));
      } else if (args[1].IsObject()) {
        // **类数组那一档**：长度与每一格都按 JS 的 `CreateListFromArrayLike` 取
        //（长度是 `ToLength(ToObject(值).length)`，这里 `ArrayLikeLength` 做的就是那一趟）。
        const likeLength = ArrayLikeLength(room, table, call, args[1]);
        for (let i = 0; i < likeLength; i++) invokedArgs.push(ArrayLikeAt(room, table, call, args[1], i));
      } else {
        throw new TypeError("Function.prototype.apply: arguments list has a wrong type");
      }
    }
  }
  return call(self, invokedThis, invokedArgs);
}
if (id === FunctionBind) {
  // **`Function.prototype.bind`**（第 228 轮）——与 `call` / `apply` 不同：
  // 它**造一个新值**，造出来的那个要能被调、而且调它时用的是**绑定时的** `this`。
  //
  // **本仓怎么造**：一个**普通对象** + `AttachCallable` 那一格载荷（第 145 轮）
  // + 三格**隐藏自有属性**（目标 / `this` / 已绑定的实参，见 `BoundTargetKey`）。
  // **为什么隐藏**：`Object.keys(f.bind(o))` 在 JS 里是**空数组**——
  // 挂成普通属性的话它当场变成 3（**静默错值**，与 `Object.prototype` 那几格同一条规矩）。
  if (!IsCallableValue(table, self)) {
    throw new TypeError("Function.prototype.bind called on a non-function");
  }
  // **三格一起问 room**（一个对象头 + 三个属性 + 值 + 一个实参数组）：
  // 分三次问会在中间那一次分配之后留下**没有根保护的中间值**（与 `TextUnitsOf` 那条同一个坎）。
  // **第 291 轮加到五格两串**：`length` / `name` 两个隐藏属性，以及那三个键串
  //（`"length"` / `"name"` / `"bound "`）与名字串本身——**估少了的后果是
  // 「分配刚好越界」**，而它离现场很远（与这一整段同一条纪律）。
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
  // **绑定出来的东西的原型是 `Function.prototype`**（第 228 轮）：
  // JS 里 `f.bind(o)` 返回的是一个**函数**，所以 `bound.call(...)`、
  // `bound.bind(...)`、`bound.length`（**第 291 轮补上了**，见下面那一段）
  // 都从那一格上找。
  // **不给这一格就是「一半对」**：`bound(2)` 能跑、而 `bound.call(o, 2)` 报
  // `calling a non-closure value`——那句话听起来像调用写错了，
  // 其实是**这一格没人填**（与闭包那一格第 228 轮修的是同一个形状）。
  table.Get(bound.Ref).Proto = protos.Function;
  SetHiddenProperty(room, table, bound, BoundTargetName(table), self);
  SetHiddenProperty(room, table, bound, BoundThisName(table),
    args.length > 0 ? args[0] : Value.Undefined());
  SetHiddenProperty(room, table, bound, BoundArgsName(table), boundArgs);
  // **`bound.length` / `bound.name`**（第 291 轮）——第 228 轮那一句注释里
  // 明写着「`bound.length`（本仓没做）」，这一轮把它补上。
  //
  // **两个都按 JS 的规矩算**，都不是照抄目标的那两格：
  // `length` 是**原函数的形参个数减掉已经绑定的实参数**（`f.bind(o, 1).length`
  // 在 `f` 有两个形参时是 **1**）——**不减就是静默错值**；负数要夹到 `0`。
  // `name` 是 `"bound " + 原名`（Node 印 `"bound f"`）——**原名要真读一次**
  //（目标可能是闭包、也可能**又是一个绑定**，套两层就是 `"bound bound f"`）。
  //
  // **写成隐藏属性**：`GetProperty` 那条路照旧走得通（`BoundTargetName` 那一族
  // 就是这么读的），而 `Object.keys(bound)` / `JSON.stringify(bound)` **看不见它们**
  //（与 `__boundTarget` 三格同一条口径——JS 里这三个也都是**不可枚举**的）。
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
  // **调一个绑定出来的函数**（第 228 轮）：`self` 是**那个绑定对象**
  //（`DoCallValue` 与 `CallNative` 都把接收者当 `this` 递进来——见 `vm.xl.md`），
  // 三样东西从它自己的隐藏属性里取。
  if (!self.IsObject()) {
    throw new Error("a bound function must be an object (the engine passes the receiver as this)");
  }
  const boundTarget = GetProperty(room, NeverCall, protos, table, self, BoundTargetName(table));
  if (!IsCallableValue(table, boundTarget)) {
    throw new Error("a bound function lost its target");
  }
  const boundSelf = GetProperty(room, NeverCall, protos, table, self, BoundThisName(table));
  // **`new` 底下目标要的是实例，不是 `boundThis`**（第 617 轮）：
  // `new (fn.bind(null))(5)` 是**构造调用**——JS 里绑定函数被 `new` 时
  // **绑定过的 `this` 不算数**（`[[Construct]]` 把新对象交下去），
  // 而 `fn.bind(null)(5)` 才用 `null`（严格模式下 `this` 就是 `null`）。
  // 引擎那一边一个 `this` 位表达不了两件事（`self` 必须留给对象自己），
  // 所以实例走 `constructThis` 单独递进来（`vm.xl.md` 的 `HostConstructThis`）。
  // **`boundSelf` 照旧先取**：它在这条路上不用，但取它这一步**不能省**——
  // 少一个 `GetProperty` 会让「隐藏属性丢了」这件事在构造那条路上**静默**过去，
  // 而下面那句「按值取」的检查也就少了一半。
  //
  // **判据是 `IsObject()`**（不是「非 `undefined`」）：引擎只在**构造**那一趟
  // 递实例，其余时候递的是 `Value.Undefined()`——而 `null` / 其它值都可能是
  // 调用方给的 `this`，照 `IsObject` 认就不会把它们错当成实例。
  const effectiveSelf = constructThis.IsObject() ? constructThis : boundSelf;
  // **绑定时的原始值 `this` 在被调用时也要装箱**（第 710 轮，与 `FunctionCall` 那一条
  // 同一个根）：JS 的 `bind` 记下的是**原值**，`ToObject` 发生在**每一次调用**上——
  // 于是 `(function () { return this; }).bind(1)() === 1` 在 Node 里是 **`false`**
  //（`this` 是一个新造的 `Number` 包装对象），本仓原来给 `true`。
  // **目标严格就不装**（与 `call` 那一条一字不差）；**构造那一趟不装**
  //（`constructThis` 是实例，`IsObject()` 已经把它挑走了）。
  let callSelf = effectiveSelf;
  if (!constructThis.IsObject() && boundTarget.Tag === ValueTag.Closure
    && !table.Get(boundTarget.Ref).AsClosure().IsStrict) {
    callSelf = BoxReceiver(room, table, protos, effectiveSelf);
  }
  const storedArgs = GetProperty(room, NeverCall, protos, table, self, BoundArgsName(table));
  if (call === null) {
    throw new Error("a bound function needs a call channel (the host must pass one)");
  }
  // **已绑定的实参在前、调用时给的在后**（JS 的口径）：
  // `f.bind(o, 1)(2)` 调的是 `f(1, 2)`——写反了是**静默错值**。
  const merged: Value[] = [];
  if (storedArgs.Tag === ValueTag.Array) {
    const stored = table.Get(storedArgs.Ref).AsArray();
    for (let i = 0; i < stored.GetLength(); i++) merged.push(stored.GetAt(i));
  }
  for (let i = 0; i < args.length; i++) merged.push(args[i]);
  return call(boundTarget, callSelf, merged);
}
if (id === StructuredCloneId) {
  // **`structuredClone(v)`**（第 338 轮）：见 `StructuredCloneId` 那一段的账。
  // **`seen` 从一只空表起**（宿主 `Map`——这一层是宿主代码，用宿主容器是应该的）。
  const target = args.length > 0 ? args[0] : Value.Undefined();
  return CloneStructured(room, table, target, new Map());
}
if (id === FunctionToString) {
  // **`f.toString()`**（第 334 轮）：读闭包上那一格（`FunctionSourceText`，
  // 它是「一处实现、三处用户」里的那一处——理由见号那一段）。
  const handle = FunctionSourceText(room, table, self);
  // **造不出来就给空串**→：规范说 `toString` **永远**返回一个字符串，
  // 所以这里不抛（宿主那两档由 `FunctionSourceText` 现造 `[native code]` 那串）。
  if (handle === 0) {
    if (!room(ObjectCharge)) throw new Error("out of room");
    return Value.FromString(table.CreateString([]));
  }
  return Value.FromString(handle);
}
if (id === ObjectValueOf) {
  // **返回接收者自己**（第 198 轮，与 `NumberValueOf` 同一条口径）——
  // `Object.prototype.valueOf` 是 JS 里最"空"的一个方法，而它**永远是对的**。
  return self;
}
if (id === ObjectLookupGetter || id === ObjectLookupSetter) {
  // **`Object.prototype.__lookupGetter__(键)` / `__lookupSetter__(键)`**（第 706 轮）——
  // Annex B 那两个老辅助。**它们不是第二份算法**：规范里那一格的正身就是
  // 「取 `[[GetOwnProperty]]`，是访问器就交回它的 `[[Get]]`（`[[Set]]`）」，
  // 而本仓那一趟**已经有了**（`ObjectGetOwnPropertyDescriptor`，第 276 轮）——
  // 所以这里只问它、再取一格（与 `Object.hasOwn` 那一支复用同一支是同一条先例：
  // 「一个问法的两半走同一处取法」）。
  //
  // **它答的是 `undefined`**（不是抛）：那一格不是访问器（数据属性 / 根本不存在）时，
  // JS 给的就是 `undefined`——`Object.create(null)` 的 `{}` 与数组下标都走这一档。
  if (args.length < 1) return Value.Undefined();
  // **接收者与 `hasOwnProperty` 那一支同一个闸门**（第 691 轮）：JS 在这一步先做
  // `RequireObjectCoercible` —— `Object.prototype.__lookupGetter__.call(null)` 给
  // `TypeError: Cannot convert undefined or null to object`，不是 `undefined`。
  if (self.Tag === ValueTag.Null || self.Tag === ValueTag.Undefined) {
    throw new TypeError("Cannot convert undefined or null to object");
  }
  // **键先过 `ToPropertyKey`**（第 706 轮，与 `defineProperty` 那一处同一条）：
  // `o.__lookupGetter__(1)` 与 `(…, "1")` 问的是**同一格**。
  const lookupKey = PropertyKeyValue(room, table, args[0]);
  const lookupName = id === ObjectLookupGetter ? "get" : "set";
  // **这一问要沿原型链走**（第 706 轮，**普查当场红的**）：规范 B.2.2.4 的算法是
  // `Repeat`：取 `O.[[GetOwnProperty]](P)`，**是访问器就返回它、否则 `O = O.[[Prototype]]`**，
  // 一路到 `null` 为止。第一版只问了**自有**那一格（`getOwnPropertyDescriptor` 的口径），
  // 于是 `Object.create({ get g() {} }).__lookupGetter__("g")` 给 `undefined`、
  // 而 JS 给那个 getter（判据 `p706c-x24`）。
  // **每一层都按「自有」问**：那一支找到 `Owner !== receiver.Ref` 就答 `undefined`，
  // 正好是「这一层有没有」，所以走链这件事由这里做、不自写一份查找。
  let lookupOwner = self;
  let lookupResult = Value.Undefined();
  let lookupDone = false;
  let lookupDepth = 0;
  while (!lookupDone && lookupOwner.IsObject()) {
    if (lookupDepth > 64) throw new Error("prototype chain is too deep");
    const lookupDescriptor = InvokeGlobal(room, call, table, protos, ObjectGetOwnPropertyDescriptor,
      lookupOwner, [lookupOwner, lookupKey],
      sink, failed, false);
    // **不是访问器 ⇒ 继续往上**（数据属性、洞、越界 全是这一档；`undefined` 也是）。
    if (!lookupDescriptor.IsNullish() && lookupDescriptor.IsObject()) {
      const accessor = GetProperty(room, NeverCall, protos, table, lookupDescriptor, NameValue(table, lookupName));
      // **读到 `get` / `set` 两格里的任何一格就算找到了**（规范那一句是
      // 「有 `[[Get]]` 就返回它」）：只读访问器的 `set` 那一格是 `undefined`，
      // 而 JS 在 `__lookupSetter__` 上**答的就是 `undefined` 并且停住**。
      if (!accessor.IsNullish()) {
        lookupResult = accessor;
        lookupDone = true;
      }
    }
    if (!lookupDone) lookupOwner = PrototypeOfValue(protos, table, lookupOwner);
    lookupDepth = lookupDepth + 1;
  }
  return lookupResult;
}
if (id === ObjectDefineGetter || id === ObjectDefineSetter) {
  // **`Object.prototype.__defineGetter__(键, 函数)` / `__defineSetter__`**（第 706 轮）——
  // 与上面两格成对。语义照规范（B.2.2.2 / B.2.2.3）：
  // `RequireObjectCoercible(O)` → `ToPropertyKey(P)` → 那一格不是函数就抛 `TypeError`
  // → 在**接收者自己**身上造一格**可枚举、可配置**的访问器。
  if (args.length < 2) {
    throw new TypeError("__defineGetter__ needs (property key, function)");
  }
  if (self.Tag === ValueTag.Null || self.Tag === ValueTag.Undefined) {
    throw new TypeError("Cannot convert undefined or null to object");
  }
  // **接收者必须是对象**：`__defineGetter__` 要给**接收者自己**造一格，
  // 而原始值的箱是**一次性的**（造在那上面等于什么都没做）——
  // `DefineAccessor` 本来就是这么抛的，这一句只是把话说在前面。
  if (!self.IsObject()) {
    throw new TypeError("__defineGetter__ needs an object receiver");
  }
  const defineFn = args[1];
  if (!IsCallableValue(table, defineFn)) {
    throw new TypeError("__defineGetter__ needs a callable function");
  }
  const accessorKey = PropertyKeyValue(room, table, args[0]);
  // **必须走 `DefineAccessor`**（第 613 / 697 轮踩过两次的同一个坎）：
  // `SetProperty` 造的是**数据属性**，造不出访问器。
  // **第七格给 `true`**：JS 里 `__defineGetter__` 造的那一格**可枚举**
  //（`Object.keys(o)` 看得见它）——这与 `Object.defineProperty` 的缺省**正好相反**，
  // 是这一族最容易抄错的一处（`DefineAccessor` 的缺省恰好就是 `true`，照写即可）。
  const defineGetter = id === ObjectDefineGetter ? defineFn : Value.Undefined();
  const defineSetter = id === ObjectDefineSetter ? defineFn : Value.Undefined();
  DefineAccessor(room, table, self, accessorKey, defineGetter, defineSetter, true);
  return Value.Undefined();
}
if (id === ObjectToString || id === ObjectToLocaleString) {
  // **`toLocaleString` 与 `toString` 走同一支**（第 689 轮）：规范里
  // `Object.prototype.toLocaleString` 的算法只有一句「Invoke(O, "toString")」——
  // 而**本仓没有区域设置**，所以两格给的一定是同一个串。**分成两支就是两处会漂的答案**
  //（`Array.prototype.toLocaleString` 指到 `toString` 同一格是同一条先例）。
  // **`null` / `undefined` 也给标签**（JS 的 `Object.prototype.toString`）：
  // `Object.prototype.toString.call(null)` 是 `"[object Null]"`——
  // 本仓没有 `.call`，但接收者直接落在这两档上的形状（元编程写法）仍该给对。
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
  // **`Number.isFinite` 不转换**（第 149 轮）：它只认数值标签——
  // `Number.isFinite("3")` 是 `false`，而全局的 `isFinite("3")` 是 `true`。
  // **这一格单独判**：混进下面「先转再判」那条就是**静默错值**
  //（`Number.isFinite("3")` 会变成 `true`，而 JS 给 `false`）。
  if (id === NumberIsFinite) {
    const raw = args.length > 0 ? args[0] : Value.Undefined();
    if (raw.Tag !== ValueTag.Int32 && raw.Tag !== ValueTag.Float64) return Value.FromBool(false);
    const numeric = raw.Tag === ValueTag.Int32 ? raw.Int : raw.Dbl;
    return Value.FromBool(numeric === numeric && numeric !== Infinity && numeric !== -Infinity);
  }
  // **两个全局判定都是「先 `ToNumber`，再自比较」**（第 149 轮）：
  // 转那一步借 `NumberFromValue`（`Number(x)` 的语义只有一份）。
  // **不许直接拿 `Number.isNaN` / `Number.isFinite` 顶替**：那两个**不做转换**——
  // `isNaN("abc")` 该是 `true`（转成 `NaN`），而 `Number.isNaN("abc")` 是 `false`。
  const converted = NumberFromValue(room, call, table, protos, args.length > 0 ? args[0] : Value.Undefined());
  const number = converted.Tag === ValueTag.Int32 ? converted.Int : converted.Dbl;
  const notANumber = number !== number;
  if (id === IsNaN) return Value.FromBool(notANumber);
  // **`NaN` 与 `±Infinity` 都不有限**（自比较那一条已经管了 `NaN`）。
  return Value.FromBool(notANumber === false && number !== Infinity && number !== -Infinity);
}
if (id === PowId) {
  // **`a ** b` 走的就是 `Math.pow`**（JS 的规范本来就这么定）——
  // 号不同（`PowId` 是降级层发的内部调用）、语义同一个。
  // **不是全局名**：脚本里写 `PowId` 找不到它。
  return MathResult(Math.pow(NumericOf(args[0]), NumericOf(args[1])));
}
if (id === StringIteratorSelf) {
  // **`"ab"[Symbol.iterator]()`**（第 345 轮）：见号那一段的账。
  // **借 `Array.from` 那一条能力**（`ArrayFrom = 17`）：它对**字符串**给的就是
  // **逐码点的数组**——`install.xl.md` 的 `ArrayFromValues` 那一支里写着
  // 「先 `GetIterator` 再 `drain`」，而字符串两处都现成。
  // **码点那条规则于是仍然只有一处**（引擎的 `DoIterNext`）——
  // 这里**一行码点规则都不新写**。
  // **为什么走能力号而不是直接 import**：`ArrayFromValues` 住在 `install.xl.md`，
  // 而那一份**要 import 这一份**（`InvokeGlobal`）——直接调就成环。
  // 能力号这条路是**反的**（宿主那一头把它接回来），与内建之间互调同一形状。
  if (call === null) {
    throw new Error("unimplemented: a string iterator needs the call channel");
  }
  const fromFn = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ArrayFrom, 0));
  const fromArgs: Value[] = [self];
  const drained = call(fromFn, Value.Undefined(), fromArgs);
  if (drained.Tag !== ValueTag.Array) {
    throw new Error("unimplemented: draining a string did not give an array");
  }
  AttachArrayIterator(room, table, drained.Ref);
  return drained;
}
if (id === ErrorIsError) {
  // **`Error.isError(v)`**（第 343 轮）：判据与 `instanceof Error` **同一个**
  //（链上有没有 `protos.Error`）——见号那一段的账。
  if (args.length === 0 || !args[0].IsObject()) return Value.FromBool(false);
  return Value.FromBool(RtChainHas(table, args[0], protos.Error));
}
if (id === ErrorCtor || id === TypeErrorCtor || id === RangeErrorCtor || id === SyntaxErrorCtor
  || id === ReferenceErrorCtor
  // **第 376 轮补的两族**（`URIError` / `EvalError`）——**七个号共用这一支**
  //（第 137 轮三个、第 277 轮加 `SyntaxError`、第 295 轮加 `ReferenceError`）：
  // 它们只差**原型**与**名字**（两样都由 `ErrorCtorProto` / `ErrorCtorName` 各自回答），
  // 复制七份的下场是「改了一处忘了一处」（而症状上面那一段写着：一半错、一半对）。
  || id === URIErrorCtor || id === EvalErrorCtor) {
  // **`new Error(msg)` 与 `Error(msg)` 同一支**（号相同、两条调用路都落到这里）。
  // **四个号共用一支**（第 137 轮三个、第 277 轮加 `SyntaxError`）：
  // 它们只差**原型**与**名字**——复制四份的下场是「改了一处忘了一处」
  //（而症状是「`SyntaxError` 的 `name` 写着 `Error`」）。
  // 名字与原型第 277 轮各收成一个方法（`ErrorCtorName` / `ErrorCtorProto`，
  // 理由写在它们那儿）——**每加一个成员要改的地方从两处收到了一处**。
  // **实参走「任意值 → 文本」**（第 124 轮）：`new Error({})` 在 JS 里得到
  // `"[object Object]"`——以前这里用引擎的 `TextFrom`，那会在对象上**抛**。
  // **第 703 轮：`undefined` 不挂那一格**（`hasMessage`）——见 `NewErrorLike` 那一段。
  const hasMessage = args.length > 0 && args[0].Tag !== ValueTag.Undefined;
  const text = hasMessage ? ValueText(table, args[0]) : "";
  // **第二格实参 `{ cause }`**（第 277 轮）：`new Error(msg, { cause: inner })` 在 JS 里
  // 把 `cause` 挂成一个**不可枚举的自有属性**（`Object.keys(e)` 看不见它）⇒ `SetHiddenProperty`。
  //
  // **判据是「描述符里有没有 `cause` 这一格」**，**不是**「第二个实参在不在」：
  // `new Error("x", {})` 与 `new Error("x", { cause: undefined })` 在 JS 里**不一样**
  //（前者**没有**那一格、后者有，值是 `undefined`）——拿「实参在不在」顶替就是**静默错值**
  //（`"cause" in e` 会从假变真）。
  //
  // **访问器跳过、非字符串键跳过**（与 `DefineOwnFromDescriptor` 那一处同一条）：
  // 不跳的话一个符号键会被 `Value.FromString` 读成一段越界码元（静默）。
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
  // **`super(m)`：往「传进来的那个 `this`」上初始化**（第 140 轮做掉了）。
  //
  // **为什么它是这一族最要紧的一格**：`class MyErr extends Error { constructor(m) { super(m);
  // this.name = "MyErr"; } }` 是**日常写法**（自定义错误类），而 `super(m)` 落在内建
  // 构造函数上时，本仓给的是**一次普通调用 + 一个接收者**——接收者就是**已经在造的那个实例**
  // （降级层用 `Op.Call` 的 `D` 操作数把 `this` 递过来，见 `lowering.xl.md` 那一支）。
  //
  // **第 137 轮在这里抛**（「unimplemented: super(...) on a builtin constructor」）——
  // 因为那时这一族是「**自己造一个新对象返回**」那一款，于是新对象被丢掉、
  // `this` 上一个属性都没写（**症状是 `e.message` 空着**，而 `e.name` 被派生类自己写了、
  // 看着一切正常）。**抛比静默错值好**，所以先抛了一轮；这一轮改成**真的办到它**。
  //
  // **返回的是 `self`**：`super(...)` 的结果在本仓被丢掉（降级层拿它当临时格），
  // 但**不能返回一个新对象**——那会让「谁是真的 `this`」出现两个答案
  //（JS 的规矩是「父类构造函数改的就是那一个 `this`」）。
  //
  // **这里也只写 `message`，不写 `name`**（第 389 轮，与 `NewErrorLike` 那条同一个根子）：
  // 原来这两句都写，而且都用 `SetProperty`（**可枚举**）——
  // 于是 `class E extends Error { constructor(m) { super(m) } }` 的实例上
  // `Object.keys(e)` 会给出 `["message","name"]`（JS 给 `[]`）、
  // 而 `e.name = "Custom"` 又写进那个自有格 ⇒ `propertyIsEnumerable("name")` 假（JS 真）。
  // **`name` 交给原型**：`ErrorCtorProto` 各族那张原型上就有，
  // `class E extends Error {}` 的实例照样读到 `"Error"`（第 3132 行那段旧注释里
  // 「两种写法结果一样」这句话**只对值成立**，对「自有 / 可枚举」两维都不成立）。
  if (self.IsObject()) {
    // **第 703 轮：`undefined` 那一档不挂**（与 `NewErrorLike` 同一条口径）——
    // `new Error(undefined).message` 该读原型上那一格的 `""`。
    if (hasMessage) {
      SetHiddenProperty(room, table, self, NameValue(table, "message"),
        Value.FromString(table.CreateString(Units(text))));
    }
    // **`cause` 也走同一处**：`super(m, { cause })` 在派生类里也该挂上——
    // 少了这一句，`class E extends Error { constructor(m) { super(m, { cause: 1 }) } }`
    // 的实例**没有 `cause`**，而 `new Error(m, { cause: 1 })` 有（**一半对一半错**）。
    if (hasCause) SetHiddenProperty(room, table, self, NameValue(table, "cause"), causeValue);
    return self;
  }
  const built = NewErrorLike(room, table, protos, ErrorCtorProto(protos, id), selfName, text, hasMessage);
  // **新造的那一条也要挂**（与 `self` 那一支对称）。
  if (hasCause) SetHiddenProperty(room, table, built, NameValue(table, "cause"), causeValue);
  return built;
}
if (id === AggregateErrorCtor) {
  // **`AggregateError(内层数组, 消息?)`**（第 295 轮）——**实参次序与别的族相反**：
  // 第一个是**那个数组**（JS 的口径），消息是第二个。
  // **它自己那一格 `errors` 是普通（可枚举的）属性**（与 `message` / `name` 同款）——
  // 与 `cause` **不同**（后者是不可枚举的，见上面那一支）：`JSON.stringify(e)` 在 JS 里
  // 给 `{"errors":[]}`（`message` / `name` 在**原型**上、不是自有属性）——
  // 那一条**记在台账里**（本仓是自有属性 ⇒ 会多印两格）。
  const innerList = args.length > 0 ? args[0] : Value.Undefined();
  const aggregateText = args.length > 1 && args[1].Tag !== ValueTag.Undefined ? ValueText(table, args[1]) : "";
  // **第 703 轮**：与 `Error` 那一支同一条口径（`undefined` / 没给 ⇒ 不挂 `message` 那一格）。
  const aggregateHasMessage = args.length > 1 && args[1].Tag !== ValueTag.Undefined;
  if (self.IsObject()) {
    // **`message` 也照上面那条挂**（原来是**无条件** `SetProperty`）——
    // 这一处与 `Error` 那一支是同一个形状，就不各写一份判据了。
    if (aggregateHasMessage) {
      SetProperty(room, NeverCall, table, self, NameValue(table, "message"),
        Value.FromString(table.CreateString(Units(aggregateText))));
    }
    SetProperty(room, NeverCall, table, self, NameValue(table, "name"),
      Value.FromString(table.CreateString(Units("AggregateError"))));
    SetProperty(room, NeverCall, table, self, NameValue(table, "errors"), innerList);
    return self;
  }
  const aggregateBuilt = NewErrorLike(room, table, protos, protos.AggregateError, "AggregateError", aggregateText,
    aggregateHasMessage);
  SetProperty(room, NeverCall, table, aggregateBuilt, NameValue(table, "errors"), innerList);
  return aggregateBuilt;
}
if (id === ObjectGroupBy) {
  // **`Object.groupBy(可迭代, 回调)`**（第 295 轮）——按回调的返回值分组。
  //
  // **只收数组**（可迭代那一半没做）：判据用的是数组，而
  // 「按迭代协议走一遍」那一套要走 `GetIterator`——**没量到就不做**，
  // 而**响亮地抛**比「把别的形状当数组读」好。
  //
  // **回调每个元素调一次**（实参 `(元素, 下标)`，与 `Array.map` 那一族同一个形状）。
  //
  // **已知差异写在明处**（第 690 轮**收掉了**，留着这条线是为了记住它曾经是什么）：
  // 第 295 轮给的是**带 `Object.prototype` 的普通对象**，理由写的是「`Object.create(null)`
  // 本仓表达不了」——那句理由当时就不对（`ObjectCreate` 第 299 轮之前那一版抛，
  // 第 299 轮把 `Proto = 0` 落地了）。现在这一格与 JS 一致：`"toString" in g` 是**假**。
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
  // **分组表没有原型**（第 690 轮收掉的**已知差异**）：JS 给的是 null-prototype 对象
  //（`Object.groupBy` 的算法里写的是 `OrdinaryObjectCreate(null)`）。
  // 上面那一段原来记着「本仓表达不了 `Object.create(null)`」——**那句话第 299 轮就不成立了**：
  // `ObjectCreate` 那一支把 `Proto = 0` 真的写了进去（`FindProperty` 的循环判的是
  // `current > 0`，所以 `0` 天然就是「到此为止」）。这里照**同一条路**补一句。
  // **判据就是这一句**：`"toString" in Object.groupBy([1], f)` 在 JS 里是**假**
  //（判据 `132-object-groupby-null-proto` 量着它）。
  const groupSource = table.Get(args[0].Ref).AsArray();
  const groups = NewPlainObject(room, table, protos);
  table.Get(groups.Ref).Proto = 0;
  for (let i = 0; i < groupSource.GetLength(); i++) {
    const member = groupSource.GetAt(i);
    const bucketName = call(args[1], Value.Undefined(), [member, Value.FromInt(i)]);
    const bucketKey = Value.FromString(table.CreateString(Units(ValueText(table, bucketName))));
    let bucket = GetProperty(room, NeverCall, protos, table, groups, bucketKey);
    if (bucket.Tag !== ValueTag.Array) {
      // **先问 room、再分配**：`SetProperty` 自己也会问 room——
      // 那一次如果触发了回收，这个**还没有人指着**的新数组就会被收走
      //（与 `Promise.all` 那个 `state` 同一条纪律）。
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
  // **`gen[Symbol.iterator]()` / `asyncGen[Symbol.asyncIterator]()` 都是「它自己」**
  //（第 320 轮）——两族**共用这一支**（同一个语义一处实现），差的只是挂在哪个原型上。
  // **不是对象就响亮地抛**（那是把它当普通函数调）。
  if (self.Tag !== ValueTag.Object) {
    throw new Error("this method needs a generator receiver");
  }
  return self;
}
if (id === EncodeURIComponent || id === EncodeURI || id === DecodeURIComponent || id === DecodeURI) {
  // **百分号编解码四个名字**（第 311 轮）——**两个参数合起来只有一位不同**：
  // 「哪些字符留着」与「哪些字符不解」都只看 `component` 这一格（见 `UriKeep`）。
  // **实参缺了也要走**（JS 的 `encodeURIComponent()` 是 `"undefined"`——
  // `ToString(undefined)`；`EncodePercent` / `DecodePercent` 里的 `JsTextUnits`
  // 正是做这件事）。
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
  // **两个全局函数**（第 126 轮）：实参先 ToString（`parseInt(12.5)` 是 `12`），
  // 走的是「任意值 → 文本」那条。
  if (args.length < 1) return MathResult(NaN);
  const text = ValueUnits(table, args[0], 0);
  if (id === ParseFloat) return ParseFloatText(text);
  // **基数的规整照 JS**：给了就 `ToInt32`（`IntArgOr` 收的就是整数），
  // 「给没给」要分开——`parseInt(x)` 与 `parseInt(x, 0)` 都是「没给」。
  // **第 702 轮起这里过的是真 `ToNumber`**：原来走 `ArgOr` 的窄签名，
  // 于是 `parseInt("ff", "16")` 会落回缺省 10（Node 给 255）——**静默错值**。
  const hasRadix = args.length > 1 && !args[1].IsUndefined();
  return ParseIntText(text, hasRadix ? IntArgOr(room, call, protos, table, args, 1, 10) : 10, hasRadix);
}
if (id === NumberIsInteger || id === NumberIsSafeInteger) {
  const target = args.length > 0 ? args[0] : Value.Undefined();
  // **只认真整数**（不做转换，与 JS 一致）。
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
  // **`isSafeInteger` 与 `isInteger` 只差一个边界**（第 288 轮）：
  // `2**53 - 1` 是 `true`、`2**53` 是 **`false`**（它是**整数**，只是**不安全**）。
  // 判据**照用**上面那一句、只多问一句「在安全区间里没有」——
  // 不另写一份整数判据（第二份迟早与第一份走偏）。
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
  // **两个值按字符串拼起来**（第 125 轮）——**两边都先 `ToPrimitive`**
  // （第 203 轮改，走的是与 `RtAdd` **同一张表**：`rt.xl.md` 的 `ToPrimitiveOf`）。
  //
  // **hint 按调用方分**（第 288 轮）：`+` 走 `default`（先 `valueOf`）、
  // **模板串走 `string`**（先 `toString`）——见 `TemplateConcat` 那一段的表。
  // 两支**共用下面这一整段实现**，只在读 hint 那一句上分开。
  //
  // **原来这里走的是 `ToString`**（`text.xl.md` 的 `ValueUnits`，外加一次
  // 「对象自己的 `toString`」，第 193 轮）——那是**另一个问题**：
  // JS 的 `+` 第一步是 `ToPrimitive(default)`，而 `default` 那一支**先问 `valueOf`、后问 `toString`**
  // （`rt.xl.md` 那张表）。于是 `class Money { valueOf() { return 250 } toString() { return "$2.5" } }` 的
  // `"s" + m` 该给 `"s250"`，走 `ToString` 给的是 `"s$2.5"`——**静默错值**，
  // 第 203 轮判据（`cls-override-toString-valueOf`）现场就是这么红的。
  // **同一条 `+` 原来有两个答案**（`m + 50` 走 `RtAdd` 是对的、`"s" + m` 走这里是不对的）——
  // 这一轮把它收成一个。
  //
  // **顺序**：左边算完**立刻**取码元（宿主侧数组，不占堆、不受回收影响），再算右边——
  // `ToPrimitive` **可能调脚本**（`valueOf` / `Symbol.toPrimitive`），
  // 而两边都先算完、最后只问一次 room、只分配一次（与 `RtAdd` 那条纪律同一条）。
  if (args.length < 2) throw new Error("unimplemented: string_concat needs (left, right)");
  // **唯一分岔**：模板串那一格用 `string`。
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
  // 少了这一步，宿主拿到的是一串**分不出行**的碎片（`console.log('a', 1)` 与两条
  // 各自一个实参的日志长得一样）——命令行那个「与 node 逐字节相同」的判据就无从谈起。
  //
  // **每个实参按 Node 的规矩渲染**（第 131 轮改）：**字符串原样**（`console.log('a')` 印 `a`），
  // **其余走 `util.inspect` 那一份**（`inspect.xl.md`）——`console.log([1, 2])` 印 `[ 1, 2 ]`、
  // `console.log({ a: 1 })` 印 `{ a: 1 }`、`console.log(1.5)` 印 `1.5`。
  //
  // **为什么字符串要单独一条**：Node 的 `util.format` 对**字符串实参**用的是它本身，
  // 而嵌套在容器里才加引号（`[ 'a' ]`）——两处口径**必须不同**，
  // 混成一条会让 `console.log('a')` 印成 `'a'`（差两个引号，判据会当场点出来）。
  // **格式说明符那一档**（第 691 轮）：Node 的 `console.log` 走 `util.format`，
  // 所以**第一个实参是字符串并且后面还有实参**时，那个字符串是一张**格式串**——
  // `%s` / `%d` / `%i` / `%f` / `%o` / `%O` 各消耗一个实参、`%c` 与 `%%` 不消耗，
  // 其余实参按空格接在后面。原来整串当普通字符串印（`console.log("%s", "x")` 给
  // `%s x`、Node 给 `x`）——**每一句带格式串的日志都多两个字符**。
  //
  // **三条边界照 Node 量到的写**：
  // ① **没有实参可消耗时说明符原样留着**（`console.log("100%")` 还是 `100%`）；
  // ② **认不出的说明符也原样留着**（`%q` 不动）；
  // ③ `%c` 只吃掉自己（它管的是 CSS，Node 里也不消耗实参）。
  // **`%j` 没做**（它要走 `JSON.stringify` 那一整支，而那一支是同一条
  // `InvokeGlobal` 里的另一个 `id`——**要做**，写在这一处而不是藏在静默里）。
  const renderArg = (value: Value) => (value.Tag === ValueTag.String ? ValueText(table, value) : InspectText(table, value));
  let line = "";
  if (args.length > 1 && args[0].Tag === ValueTag.String) {
    const format = ValueText(table, args[0]);
    let used = 1;
    const text: string[] = [];
    let at = 0;
    while (at < format.length) {
      const ch = format.charAt(at);
      if (ch !== "%" || at + 1 >= format.length) { text.push(ch); at = at + 1; continue; }
      const code = format.charAt(at + 1);
      if (code === "%") { text.push("%"); at = at + 2; continue; }
      if (code === "c") { at = at + 2; continue; }
      const known = code === "s" || code === "d" || code === "i" || code === "f" || code === "o" || code === "O";
      if (!known || used >= args.length) { text.push(ch); at = at + 1; continue; }
      const arg = args[used];
      used = used + 1;
      if (code === "s") { text.push(renderArg(arg)); }
      else if (code === "d" || code === "i") {
        text.push(NumberToHostText(ToNumberOf(room, call, protos, table, arg)));
      } else if (code === "f") {
        // **`%f` 是 `parseFloat`**（Node 的口径）：`%f` 接 `"1.5abc"` 给 `1.5`、
        // 接 `"abc"` 给 `NaN`——**不是** `Number()`（那个给 `NaN`，两处只在字符串上分岔）。
        text.push(NumberToHostText(parseFloat(renderArg(arg))));
      } else {
        // `%o` / `%O`：Node 给的是 `util.inspect` 那一份（`%o` 还带 `showHidden`）。
        // 这一层只有一份 inspect，所以两档走同一份——**已知差写在明处**。
        text.push(InspectText(table, arg));
      }
      at = at + 2;
    }
    line = text.join("");
    for (let k = used; k < args.length; k++) line = line + " " + renderArg(args[k]);
    sink(line);
    return Value.Undefined();
  }
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
  // **目标必须是对象**：JS 会装箱，本仓没有装箱那一层——响亮地抛。
  if (args.length < 1 || !args[0].IsObject()) {
    throw new Error("unimplemented: Object.assign needs an object as the target "
      + "(boxing a primitive is not supported)");
  }
  const target = args[0];
  // **往目标写的那条通道要给真的 `call`**（第 599 轮）：JS 的 `Object.assign` 走
  // **`[[Set]]`** ⇒ 目标上那个同名的**访问器 setter 会被调用**
  //（`Object.assign({ set s(v) { … } }, { s: 9 })`）。原来几处都传 `NeverCall`
  //（那一格是给「装内建的时候」用的）⇒ 报
  // `unreachable: installing a builtin never calls a function`（**整份文件进不来**，
  // 判据 `c371-stdlib-object-assign-getters-and-order`）。
  // **没有通道时照旧 `NeverCall`**：与「读来源的 getter 那一支」同一条可选服务的纪律
  //（宿主都没接那一格，能做的只是别把一句假话当成结果）。
  const targetWriter = call === null ? NeverCall : call;
  for (let s = 1; s < args.length; s++) {
    const source = args[s];
    // **字符串来源要按下标展开**（第 304 轮修的）：JS 的 `Object.assign({}, "ab")`
    // 给 `{"0":"a","1":"b"}`——字符串的**可枚举自有属性就是那些下标**
    //（`length` 是**不可枚举**的，所以它不进去）。
    // 原来这一支被「不是对象就跳过」**整段丢掉** ⇒ 静默给 `{}`（判据
    // `c304-std-object-assign-forms` 量的就是它，而 `object-assign-forms-and-order`
    // 从第 293 轮起拖着同一个根）。
    // **按码元走**（与 `Object.keys("ab")` 那一条口径一字不差——不另写一份下标规矩）。
    if (source.Tag === ValueTag.String) {
      const sourceUnits = table.Get(source.Ref).AsString().Units;
      if (!room(PropertyCharge * sourceUnits.length)) throw new Error("out of room");
      for (let i = 0; i < sourceUnits.length; i++) {
        SetProperty(room, targetWriter, table, target,
          Value.FromString(table.CreateString(Units(String(i)))), Value.FromString(table.CreateString([sourceUnits[i]])));
      }
      continue;
    }
    // **不是对象的来源跳过**（JS 的口径：`Object.assign({}, null)` 合法、`(…, 1)` 也算合法——
    // 一个数没有自有可枚举属性）。
    if (!source.IsObject()) continue;
    // **数组来源要按下标展开**（第 598 轮）：`{ ...xs }` 在 JS 里给
    // `{"0":1,"1":2,…}`（`CopyDataProperties` 走的是 `OwnPropertyKeys`，
    // 而数组的下标正是**自有可枚举的字符串键**）——可它们住在**载荷**里、
    // 不在下面那一趟看的 `Props` 里 ⇒ 整片下标**静默丢掉**
    //（判据 `c371-ex-spread-forms`：`JSON.stringify({ ...xs })` 给 `{}`，Node 给三个键）。
    // **它与上面字符串那一支是同一条理由、同一个位置**：整数下标排在字符串键**之前**
    //（`OwnPropertyKeys` 的口径）。**洞不是自有属性** ⇒ 跳过（与 `map` 那族同一条）。
    // **下标键现造**（`Units(String(i))`，与字符串那一支一字不差）——
    // 数组元素**没有现成的键句柄**可用（`Props` 那条路才有）。
    if (source.Tag === ValueTag.Array) {
      const items = table.Get(source.Ref).AsArray();
      if (!room(PropertyCharge * items.GetLength())) throw new Error("out of room");
      for (let i = 0; i < items.GetLength(); i++) {
        if (items.IsHole(i)) continue;
        const sourceKey = Value.FromString(table.CreateString(Units(String(i))));
        // **目标也是数组时，下标要落进元素区**（第 707 轮，**普查当场红的**）：
        // `Object.assign([], [1, 2])` 在 JS 里给 `[1, 2]`（`length` 2）——
        // 而 `SetProperty` **认不得数组下标**（它那一趟写的是属性表，
        // 元素的 `length` 不跟着长）⇒ 本仓给 `[]`、`length` 还是 `0`
        //（判据 `p707c-o01`）。台账里 `probe694-o27` / `probe703-o-a38` 两条**同一条根**。
        // **与 `defineProperty` 那一处同一个判据**（`ArrayIndexAt`）：
        // 「`"0"` 是不是下标」只有它有答案。
        // **`SetAt` 不带标志位**（元素区没有逐格标志位）——`Object.assign` 走的是
        // `[[Set]]`，可枚举是它本来就有的语义，所以这一档与 `defineProperty` 的可枚举那一支合流。
        if (target.Tag === ValueTag.Array && ArrayIndexAt(table, sourceKey) >= 0) {
          if (!room(ValueCharge)) throw new Error("out of room");
          table.Get(target.Ref).AsArray().SetAt(ArrayIndexAt(table, sourceKey), items.GetAt(i));
          table.Recount(target.Ref);
          continue;
        }
        SetProperty(room, targetWriter, table, target, sourceKey, items.GetAt(i));
      }
      continue;
    }
    // **先抄键与值、再写**（与 `values` / `entries` 同一条纪律）：
    // `Object.assign(o, o)` 是合法的，而边读边写会让**属性表在遍历中变长**。
    // 抄进来的是 `Value`（引用），而它们住在源对象的属性表里——
    // 源是这次调用的根（`args[s]`），所以中途的分配不会把它们收走。
    const own = table.Get(source.Ref);
    const keys: Value[] = [];
    const values: Value[] = [];
    for (let i = 0; i < own.Props.length; i++) {
      const keyHandle = own.Props[i].Key;
      const keyTag = table.Get(keyHandle).Tag;
      // **字符串键与符号键都要抄**（第 306 轮修的）：JS 的对象展开 / `Object.assign`
      // 带走**可枚举的自有符号键**（`{ ...{ [s]: 1 } }` 里那个符号键在）——
      // 原来这一句只认字符串 ⇒ 符号键**静默丢掉**（判据 `c305-rt-object-rest-keeps-symbol`）。
      // **内部格不会因此漏出去**：它们都是**不可枚举**的（`SetHiddenProperty`），
      // 下面那一句自己会挡。
      if (keyTag !== ValueTag.String && keyTag !== ValueTag.Symbol) continue;
      // **可枚举才算**（第 182 轮，与 `keys` 那一条同一处修正）。
      if (!own.Props[i].IsEnumerable()) continue;
      // **访问器不再跳过**（第 306 轮修的）：JS 的对象展开与 `Object.assign`
      // 走的都是 **`[[Get]]`**——`{ ...{ get x() { … } } }` 会**调 getter**。
      // 原来这里跳过 ⇒ 那一格**整格不见**（判据 `c305-rt-object-spread-triggers-getter`，
      // **静默错值**）。
      //
      // **值那一格这一刻不抄**：getter 的结果**不属于任何对象**（下面那条
      // 「源是这次调用的根、抄进来的值住在源的属性表里」的理由对它不成立），
      // 抄进 `values` 再写就是让一个没人指着的值跨越一次分配。
      // 所以访问器那一格照旧 push（写那一趟会按**键**重新认出它），
      // 真取值放在写那一趟、紧挨着 `SetProperty`。
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
        // **没有通道时照旧跳过**（`call === null` 是「宿主没接那一格」，
        // 与 `failed` / `keep` 同一条可选服务的纪律——那时宁可少一格，
        // 也不能凭空给一个 `undefined`）。
        if (call === null) continue;
        // **取值就在这一刻**：读到写之间只有这两句——先问一次 room，
        // 让可能发生的那次回收落在**值还不存在**的时候（与 `Object.groupBy`
        // 那两处「先问 room、再分配」同一条纪律）。
        if (!room(PropertyCharge)) throw new Error("out of room");
        value = GetProperty(room, call, protos, table, source, keys[i]);
      }
      // **目标也是数组时，下标要落进元素区**（第 707 轮）：与上面「源是数组」那一支
      // **同一句判据**（`ArrayIndexAt`）——`Object.assign([], { 0: "a" })` 在 JS 里
      // 给 `["a"]`（`length` 1），而 `SetProperty` 只写属性表、`length` 不跟着长。
      if (target.Tag === ValueTag.Array && keys[i].Tag === ValueTag.String
        && ArrayIndexAt(table, keys[i]) >= 0) {
        if (!room(ValueCharge)) throw new Error("out of room");
        table.Get(target.Ref).AsArray().SetAt(ArrayIndexAt(table, keys[i]), value);
        table.Recount(target.Ref);
        continue;
      }
      SetProperty(room, targetWriter, table, target, keys[i], value);
    }
  }
  // **返回的是目标本身**（JS 的口径，不是一份拷贝）。
  return target;
}
if (id === ObjectIs) {
  // **`Object.is(a, b)`**（第 275 轮）——它要的是**第三张判等表**
  //（见 `rt.xl.md` 的 `SameValue`）：与 `===` 差 `NaN`、与 `SameValueZero` 差 `±0`，
  // **两处都翻**。所以这一格**不能**借 `RtCmpEqStrict` 或 `SameValueZero` 顶替——
  // 借了会在另一格上**静默**给错答案（`Object.is(NaN, NaN)` 给假、
  // 或 `Object.is(0, -0)` 给真，而 node 给真与假）。
  // **缺实参给 `undefined`**（与这一块其余实参位同一条）：
  // 于是 `Object.is()` 与 `Object.is(undefined, undefined)` 一致（JS 也是）。
  const isLeft = args.length > 0 ? args[0] : Value.Undefined();
  const isRight = args.length > 1 ? args[1] : Value.Undefined();
  return Value.FromBool(SameValue(table, isLeft, isRight));
}
if (id === ObjectFreeze) {
  // **冻结 = 把自有数据属性的 `writable` 清掉**（第 182 轮）——
  // `SetProperty` 那一支**早就**照着这个标志抛（`props.xl.md`：不可写的属性写入抛 TypeError），
  // 所以这里只要改标志，一个引擎改动都不用（见号那一段的两处缺口）。
  //
  // **第 276 轮补上另一半**：JS 的 `freeze` 是 `seal` **再加一步**——
  // 「不可配置」那一半原来没做（`isSealed(frozen)` 会答**假**，而 JS 答**真**）。
  // 顺带接上「不可扩展」那个标记（`seal` / `isSealed` / `isFrozen` 三格都要它）。
  if (args.length < 1 || !args[0].IsObject()) {
    throw new Error("unimplemented: Object.freeze needs an object "
      + "(boxing a primitive is not supported)");
  }
  const frozen = table.Get(args[0].Ref);
  // **数组的 `length` 也要跟着冻结**（第 722 轮）：它**不住在属性表里**，
  // 所以下面那一趟扫不到它 ⇒ `Object.freeze(a)` 之后 `a.length = 5` 照样改
  //（判据 `p722a-r03`：Node 静默、本仓把长度写成了 5；`push` 那一档碰巧是好的——
  //  它走的是 `Extensible` 那一句，不是长度这一句）。
  // **「长度可写吗」的落点在属性表里那一份**（`array.xl.md` 的 `RequireArrayGrowable`
  // 与描述符那一趟都读它），所以先把它造出来，再让下面那一趟照常清标志位。
  if (args[0].Tag === ValueTag.Array && IndexLengthPropertyOf(table, args[0]) === null) {
    if (!room(PropertyCharge)) throw new Error("out of room");
    const frozenLengthKey = Value.FromString(table.CreateString(Units("length")));
    const frozenLength = new Property(frozenLengthKey.Ref,
      Value.FromInt(table.Get(args[0].Ref).AsArray().GetLength()));
    frozenLength.Flags = 0;
    frozen.Props.push(frozenLength);
    table.Recount(args[0].Ref);
  }
  // **元素那一摞也要补影子**（第 723 轮，见 `MaterializeElementShadows`）——
  // 不然下面这一趟扫不到它们，`Object.freeze(a); a[1] = 9` 照样写得进去。
  MaterializeElementShadows(room, table, args[0], false);
  for (let i = 0; i < frozen.Props.length; i++) {
    const property = frozen.Props[i];
    if (property.Kind === PropertyKind.Accessor) continue;
    if ((property.Flags & PropertyFlagWritable) !== 0) {
      property.Flags = property.Flags - PropertyFlagWritable;
    }
    // **不可配置那一半**（与 `Object.seal` 同一句）。
    if ((property.Flags & PropertyFlagConfigurable) !== 0) {
      property.Flags = property.Flags - PropertyFlagConfigurable;
    }
  }
  MarkUnextensible(room, table, args[0]);
  // **返回的是那个对象本身**（JS 的口径，不是一份拷贝）。
  return args[0];
}
if (id === ObjectDefineProperty) {
  // **`Object.defineProperty(对象, 键, 描述符)`**（第 182 轮）——
  // 「怎么把描述符写进去」那一段第 276 轮**抽成了方法**（`DefineOwnFromDescriptor`）：
  // `defineProperties` 要的就是「同一件事跑在描述符表上每一格」，
  // 而那段里有两处**不能抄**的判断（默认三个标志全是假、访问器描述符要抛）——
  // 抄成两份就是两处会漂的答案。
  // **键也要收符号**（第 680 轮）：`Symbol.hasInstance` / `Symbol.toPrimitive` 这类协议
  // **只能**用符号键装，而这一句原来只收 `ValueTag.String` ⇒ 「用符号键写一格」这条链
  // 从第一步就断（实测 `r678-beh-defineproperty-symbol-key` 与同族的
  // `r678-sym-getownpropertydescriptor-symbol` / `r678-beh-instanceof-hasinstance` 三条）。
  //
  // **下面那条路本来就收符号**：`DefineOwnFromDescriptor` 把 `key.Ref` 直接当堆引用
  //（`FindProperty` / `Property.Accessor` / `new Property` 三处都吃它），而符号值在堆里
  // **就是** `ValueTag.Symbol + 句柄`（与 `getOwnPropertySymbols` 那一支同一个形状）
  // ⇒ 缺的只是这一格闸门，不是「符号键的属性不存在」。**窄的是闸门，不是数据**。
  // **键再收一道 `ToPropertyKey`**（第 706 轮，**普查当场红的**）：
  // JS 那一步是 `ToPropertyKey`——`Object.defineProperty(o, 1, …)` 与
  // `Object.defineProperty(o, { toString() { return "k"; } }, …)` 都**合法**，
  // 而这里原来只收字符串 / 符号两种标签 ⇒ **数字键与对象键响亮地抛**
  //（`unimplemented: Object.defineProperty needs (object, string or symbol key, …)`——
  //  一句话里没有一个字提到「数字键」；判据 `p706b-d01` / `p706b-d02` / `p706b-d09`）。
  // **同一个形状在隔壁早有答案**：`getOwnPropertyDescriptor` 那一支第 692 轮就收数字键了
  //（`Object.hasOwn([1], 0)` 第 691 轮、`o.hasOwnProperty(1)` 更早）——
  // 而 `defineProperty` 是**写**那一侧，写不进一格比读不出一格更难被发现。
  // 转换**不新写一份**：走 `PropertyKeyValue`（`text.xl.md`，就是 `ToPropertyKey` 那一句）。
  if (args.length < 3 || !args[0].IsObject() || !args[2].IsObject()) {
    throw new Error("unimplemented: Object.defineProperty needs (object, string or symbol key, descriptor object)");
  }
  const defineKey = PropertyKeyValue(room, table, args[1]);
  if (defineKey.Tag !== ValueTag.String && defineKey.Tag !== ValueTag.Symbol) {
    throw new Error("unimplemented: Object.defineProperty needs (object, string or symbol key, descriptor object)");
  }
  DefineOwnFromDescriptor(room, table, args[0], defineKey, args[2]);
  // **返回的还是那个对象**（JS 的口径）。
  return args[0];
}
if (id === ObjectDefineProperties) {
  // **`Object.defineProperties(对象, 描述符表)`**（第 276 轮）——
  // 把描述符表里**每一个可枚举的自有属性**当成一格描述符写进去。
  // **只走可枚举的那一份**（JS 在这里用的就是 `Object.keys` 那一套）：
  // 描述符表是一个**普通对象字面量**（`{ a: {…}, b: {…} }`），
  // 里面每一项都可枚举；不可枚举的那些 JS **不看**。
  if (args.length < 2 || !args[0].IsObject() || !args[1].IsObject()) {
    throw new Error("unimplemented: Object.defineProperties needs (object, descriptors object)");
  }
  const descriptorTable = table.Get(args[1].Ref);
  // **先把条数抄下来再走循环**：写的是**另一个对象**，所以扫的这一摞不会被改；
  // 而 `Props.length` 中途可能长（前面几格写进 `args[1]` 时不会，
  // 但**把它抄成一个宿主数**读起来更明确——与 `Object.keys` 那一支同一条理由）。
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
  // **`Object.getOwnPropertyDescriptor(对象, 键)`**（第 276 轮）——`defineProperty` 的**反面**：
  // 把那一格的 `value` 与三个标志装成一个**普通对象**。
  // **没有那一格给 `undefined`**（JS 的口径——**不是**给一个空描述符）。
  // **字符串也是合法接收者**（与 `Object.keys` / `getOwnPropertyNames` 那两支同一条，
  // 第 210 轮）：`Object.getOwnPropertyDescriptor("ab", "1")` 在 JS 里给一个描述符，
  // 而字符串**不是 `IsObject()`**（它是 `HeapString`）——所以这一句要**显式放行**，
  // 只写 `IsObject()` 会把字符串挡在门外（**响亮地抛**，不是静默错值，但那是**假缺口**）。
  // **符号键也收**（第 680 轮，与同轮 `Object.defineProperty` 那一条**同一格闸门**）：
  // 「用符号键装一格、再读回描述符」是**同一条链的两半**——上半截放开了、下半截还窄着，
  // 那条链照样断在第二步（实测 `r678-sym-getownpropertydescriptor-symbol`）。
  // 下面那一段本来就按 `key.Ref` 走（堆引用对字符串与符号是同一种东西）。
  if (args.length < 2
    || (!args[0].IsObject() && args[0].Tag !== ValueTag.String)) {
    throw new Error("unimplemented: Object.getOwnPropertyDescriptor needs (object or string, string or symbol key)");
  }
  const receiver = args[0];
  // **键先过一趟 `ToPropertyKey`**（第 692 轮，普查当场红的）：JS 里
  // `Object.getOwnPropertyDescriptor([1], 0)` 与 `(…, "0")` **问的是同一格**，
  // 而这里原来只收字符串 / 符号 ⇒ **数字键响亮地抛**
  //（`Object.getOwnPropertyDescriptor(arr, 0)` 是最普通的写法之一；
  //  `Object.hasOwn([1], 0)` 那一支第 691 轮就收数字了——两套口径不该分家）。
  // **符号键不走这一趟**（`TextFrom` 对符号抛）：下面那一支按**身份**找。
  // **数字键一律先化成文本**（第 707 轮，**普查当场红的**）：对象字面量 `{ 1: "v" }`
  // 的键是**数字字面量**，而降级层把它**原样**交上来——`KeyMatches` 现在认得
  // 「整数两档」（`Int32` 与十进制文本是同一格，`props.xl.md`），
  // 可**其余那些只认字符串键的旁路**（这一支的 `IsIndexKeyText`、`FindProperty`
  // 后面那几趟）依然会把它当成一个**普通对象键**：
  // `Object.getOwnPropertyDescriptor(o, 1)` / `Object.hasOwn(o, 1)` /
  // `o.propertyIsEnumerable(1)` 于是**答 `undefined` / 假**，
  // 而 `o[1]` / `o["1"]` / `1 in o` / `o.hasOwnProperty(1)` **四条全对**
  //（判据 `p707d-k01` / `p707d-k02` / `p707c-o10`）。
  // **在入口处归一**、不在每一格判据里各认一次：JS 那一步就是 `ToPropertyKey`
  //（`TextFrom` 对 Int32 / Float64 给的正是 `String(n)`）。
  // **符号键不走这一趟**（`TextFrom` 对符号抛——下面单独一支按身份找）。
  const rawOwnKey = args[1];
  const numericOwnKey = rawOwnKey.Tag === ValueTag.Int32 || rawOwnKey.Tag === ValueTag.Float64;
  const normalizedOwnKey = numericOwnKey
    ? Value.FromString(table.CreateString(Units(TextFrom(table, rawOwnKey))))
    : rawOwnKey;
  const ownKey = normalizedOwnKey.Tag === ValueTag.String || normalizedOwnKey.Tag === ValueTag.Symbol
    ? normalizedOwnKey
    : Value.FromString(table.CreateString(Units(TextFrom(table, normalizedOwnKey))));
  // **符号键跳过「取文本」那一格**（第 680 轮）：符号值不能被读成码元表
  //（`TextFrom` 会当场抛 `cannot convert a Symbol value to a string`），
  // 而下面那几支判据（下标键 / `length` / 自有属性表）**本来就只对字符串键有意义**
  // ⇒ 符号键直接进最后一支（`FindProperty` 按堆引用找，对两种键是同一种东西）。
  // 这一格是**必须有的**：同一条链的上半截（`defineProperty`）放开之后，
  // `Object.getOwnPropertyDescriptors` 会把符号键**真地**递进来（它两趟键里第二趟就是符号）。
  if (ownKey.Tag === ValueTag.Symbol) {
    const symbolFound = FindProperty(room, table, receiver.Ref, ownKey);
    if (symbolFound === null || symbolFound.Owner !== receiver.Ref) {
      return Value.Undefined();
    }
    const symbolProperty = table.Get(receiver.Ref).Props[symbolFound.Index];
    if (!room(ObjectCharge + PropertyCharge * 4)) throw new Error("out of room");
    const symbolDescriptor = NewPlainObject(room, table, protos);
    if (symbolProperty.Kind === PropertyKind.Accessor) {
      SetProperty(room, NeverCall, table, symbolDescriptor, NameValue(table, "get"), symbolProperty.Getter);
      SetProperty(room, NeverCall, table, symbolDescriptor, NameValue(table, "set"), symbolProperty.Setter);
    } else {
      SetProperty(room, NeverCall, table, symbolDescriptor, NameValue(table, "value"), symbolProperty.Value);
      SetProperty(room, NeverCall, table, symbolDescriptor, NameValue(table, "writable"),
        Value.FromBool((symbolProperty.Flags & PropertyFlagWritable) !== 0));
    }
    SetProperty(room, NeverCall, table, symbolDescriptor, NameValue(table, "enumerable"),
      Value.FromBool((symbolProperty.Flags & PropertyFlagEnumerable) !== 0));
    SetProperty(room, NeverCall, table, symbolDescriptor, NameValue(table, "configurable"),
      Value.FromBool((symbolProperty.Flags & PropertyFlagConfigurable) !== 0));
    return symbolDescriptor;
  }
  const ownKeyText = TextFrom(table, ownKey);
  // **① 下标键先答**：数组的元素与字符串的下标**不住在 `Props` 里**
  //（与 `Object.keys` / `getOwnPropertyNames` 那两支同一条次序，第 210 轮）。
  //
  // **两种接收者的标志不一样**（第 276 轮**实测**过，不是推的）：
  //   · **数组元素**：`可写 / 可枚举 / 可配置` **三个全真**（JS 就是这样）；
  //   · **字符串下标**：`不可写 / 可枚举 / 不可配置`——字符串是**不可变**的。
  // 写成一套（「都是数组那样」）就是**静默错值**：`Object.getOwnPropertyDescriptor("ab", "1").writable`
  // 会答**真**，而 JS 答**假**。
  if (IsIndexKeyText(ownKeyText)) {
    const at = Number(ownKeyText);
    let element = Value.Undefined();
    let present = false;
    let elementWritable = true;
    // **字符串那一支要留着码元表**：下面开串时还要用
    //（`element` 该是一个 **1 码元的串**，不是码元数——第 276 轮实测：
    // `Object.getOwnPropertyDescriptor("ab", "1").value` 在 JS 里是 `"b"`）。
    let elementUnits: number[] = [];
    if (receiver.Tag === ValueTag.Array) {
      const items = table.Get(receiver.Ref).AsArray();
      if (at < items.GetLength() && !items.IsHole(at)) {
        element = items.GetAt(at);
        present = true;
      }
      // **属性表里有那一份的，标志位就由它说了算**（第 706 轮开的口子，第 721 轮放宽）：
      // 元素区没有标志位，而 `Object.defineProperty` 在下标上写下的
      // `enumerable` / `writable` / `configurable` 三位**只有那一份记着**——
      // 上面那一趟看元素区会答「三个全真」，那是**静默错值**
      //（判据 `p706f-w03`：node 给 `enumerable=false`、本仓给 `true`；
      //  `p721a-r08`：下标上的**访问器**该给 `get` / `set`，原来给的是元素区的数据那一档）。
      //
      // **第 706 轮只在这一份「不可枚举」时才走这一支**（那时只有它一个字段会分叉）；
      // 第 721 轮起判据是「**有没有这一份**」——`writable: false` / `configurable: false`
      // 同样住在这里，而它们**可枚举**，按老判据会落到元素区那一档去。
      const indexShadow = IndexKeyShadowOf(table, receiver, at);
      if (indexShadow !== null) {
        if (!room(ObjectCharge + PropertyCharge * 4)) throw new Error("out of room");
        const shadowDescriptor = NewPlainObject(room, table, protos);
        // **两档形状**：访问器给 `get` / `set`，数据属性给 `value` / `writable`——
        // 与 `Object.getOwnPropertyDescriptor` 在普通属性上那一趟**同一套字段**
        //（`{ get }` 与 `{ value }` 不会同时出现）。
        if (indexShadow.Kind === PropertyKind.Accessor) {
          SetProperty(room, NeverCall, table, shadowDescriptor, NameValue(table, "get"), indexShadow.Getter);
          SetProperty(room, NeverCall, table, shadowDescriptor, NameValue(table, "set"), indexShadow.Setter);
        } else {
          SetProperty(room, NeverCall, table, shadowDescriptor, NameValue(table, "value"), indexShadow.Value);
          SetProperty(room, NeverCall, table, shadowDescriptor, NameValue(table, "writable"),
            Value.FromBool((indexShadow.Flags & PropertyFlagWritable) !== 0));
        }
        SetProperty(room, NeverCall, table, shadowDescriptor, NameValue(table, "enumerable"),
          Value.FromBool((indexShadow.Flags & PropertyFlagEnumerable) !== 0));
        SetProperty(room, NeverCall, table, shadowDescriptor, NameValue(table, "configurable"),
          Value.FromBool((indexShadow.Flags & PropertyFlagConfigurable) !== 0));
        return shadowDescriptor;
      }
    } else if (receiver.Tag === ValueTag.String) {
      elementUnits = table.Get(receiver.Ref).AsString().Units;
      if (at < elementUnits.length) {
        present = true;
        elementWritable = false;
      }
    }
    // **洞与越界都不是自有属性** ⇒ 落到最后的 `undefined`（JS 的口径）。
    // **可普通对象的整数键照样是自有属性**（第 707 轮，**普查当场红的**）：
    // `{ 1: "v" }` 的键是**数字字面量**，所以那一段**必须接着往下面那一趟走**
    // （自有属性表）——原来这里对**任何**非数组 / 非字符串接收者都直接 `return undefined`，
    // 于是 `Object.getOwnPropertyDescriptor(o, 1)` 给 `undefined`、
    // 而 `Object.keys(o)` / `Object.getOwnPropertyNames(o)` 都看得到那一格
    //（判据 `p707d-k01`：`o[1]` / `o["1"]` / `1 in o` / `o.hasOwnProperty(1)` 四条全对，
    //  只有描述符这一条路断路）。**数组与字符串那一档仍然在这里收口**（洞 / 越界）。
    if (!present) {
      if (receiver.Tag === ValueTag.Array || receiver.Tag === ValueTag.String) return Value.Undefined();
      // **不是数组也不是字符串** ⇒ 落到下面「自有属性表」那一趟（`ownKey` 已经归一成文本）。
      const numericOwnFound = FindProperty(room, table, receiver.Ref, ownKey);
      if (numericOwnFound === null || numericOwnFound.Owner !== receiver.Ref) return Value.Undefined();
      const numericProperty = table.Get(receiver.Ref).Props[numericOwnFound.Index];
      if (!room(ObjectCharge + PropertyCharge * 4)) throw new Error("out of room");
      const numericDescriptor = NewPlainObject(room, table, protos);
      if (numericProperty.Kind === PropertyKind.Accessor) {
        SetProperty(room, NeverCall, table, numericDescriptor, NameValue(table, "get"), numericProperty.Getter);
        SetProperty(room, NeverCall, table, numericDescriptor, NameValue(table, "set"), numericProperty.Setter);
      } else {
        SetProperty(room, NeverCall, table, numericDescriptor, NameValue(table, "value"), numericProperty.Value);
        SetProperty(room, NeverCall, table, numericDescriptor, NameValue(table, "writable"),
          Value.FromBool((numericProperty.Flags & PropertyFlagWritable) !== 0));
      }
      SetProperty(room, NeverCall, table, numericDescriptor, NameValue(table, "enumerable"),
        Value.FromBool((numericProperty.Flags & PropertyFlagEnumerable) !== 0));
      SetProperty(room, NeverCall, table, numericDescriptor, NameValue(table, "configurable"),
        Value.FromBool((numericProperty.Flags & PropertyFlagConfigurable) !== 0));
      return numericDescriptor;
    }
    // **房间要一起问**：字符串那一支要**开一个新串**，所以 `CodeUnitCharge` 也算上
    //（与 `Object.keys` 那一支同一条规矩：开之前先问）。
    if (!room(ObjectCharge + PropertyCharge * 4 + CodeUnitCharge)) throw new Error("out of room");
    if (receiver.Tag === ValueTag.String) {
      element = Value.FromString(table.CreateString([elementUnits[at]]));
    }
    const elementDescriptor = NewPlainObject(room, table, protos);
    SetProperty(room, NeverCall, table, elementDescriptor, NameValue(table, "value"), element);
    SetProperty(room, NeverCall, table, elementDescriptor, NameValue(table, "writable"), Value.FromBool(elementWritable));
    SetProperty(room, NeverCall, table, elementDescriptor, NameValue(table, "enumerable"), Value.FromBool(true));
    // **两个不可配置、一个可配置**：数组元素可配置、字符串下标不可
    //（`elementWritable` 那两格是同一次实测出来的）。
    SetProperty(room, NeverCall, table, elementDescriptor, NameValue(table, "configurable"), Value.FromBool(elementWritable));
    return elementDescriptor;
  }
  // **② `length` 也是自有属性**（与 `Object.getOwnPropertyNames` 那一支同一条，第 214 轮）：
  // 它**不住在属性表里**（在 `HeapArray` / `HeapString` 上）。
  // **两种接收者的标志又不一样**（同一次实测）：
  //   · **数组**：`可写 / 不可枚举 / 不可配置`（`xs.length = 0` 是合法的）；
  //   · **字符串**：`不可写 / 不可枚举 / 不可配置`。
  // 次序也要紧：`"length"` **不是**下标键（`IsIndexKeyText` 看的是全数字），
  // 所以它落在这一支而不是上面那一支。
  if (ownKeyText === "length" && (receiver.Tag === ValueTag.Array || receiver.Tag === ValueTag.String)) {
    const lengthValue = receiver.Tag === ValueTag.Array
      ? table.Get(receiver.Ref).AsArray().GetLength()
      : table.Get(receiver.Ref).AsString().Units.length;
    // **数组的 `length` 可写吗**（第 722 轮）：`Object.defineProperty(xs, "length",
    // { writable: false })` 在属性表里留了一份（`RequireArrayGrowable` 读的就是它）——
    // 原来这一支**写死 `writable: true`**，于是那一问的答案是错的（判据 `p722a-*`）。
    // **字符串没有那一份**（它的长度本来就不可写）。
    let lengthWritable = receiver.Tag === ValueTag.Array;
    if (receiver.Tag === ValueTag.Array) {
      const ownLength = IndexLengthPropertyOf(table, receiver);
      if (ownLength !== null && ownLength.Kind === PropertyKind.Data) {
        lengthWritable = (ownLength.Flags & PropertyFlagWritable) !== 0;
      }
    }
    if (!room(ObjectCharge + PropertyCharge * 4)) throw new Error("out of room");
    const lengthDescriptor = NewPlainObject(room, table, protos);
    SetProperty(room, NeverCall, table, lengthDescriptor, NameValue(table, "value"), Value.FromInt(lengthValue));
    SetProperty(room, NeverCall, table, lengthDescriptor, NameValue(table, "writable"),
      Value.FromBool(lengthWritable));
    SetProperty(room, NeverCall, table, lengthDescriptor, NameValue(table, "enumerable"), Value.FromBool(false));
    SetProperty(room, NeverCall, table, lengthDescriptor, NameValue(table, "configurable"), Value.FromBool(false));
    return lengthDescriptor;
  }
  // **② 自有属性表**。**只在自有属性里找**（与 `defineProperty` 同一条）：
  // `FindProperty` 会**沿原型链**找，所以找到之后还要问一句 `Owner === receiver.Ref`——
  // 不问的话 `Object.getOwnPropertyDescriptor({}, "toString")` 会给一个描述符（JS 给 `undefined`）。
  const ownFound = FindProperty(room, table, receiver.Ref, ownKey);
  if (ownFound === null || ownFound.Owner !== receiver.Ref) {
    // **函数上那两格 `length` / `name`**（第 687 轮）——它们**不在属性表里**
    //（`length` 住在 `HeapClosure.Arity`、`name` 住在 `Name`，见 `props.xl.md` 的
    //  `GetProperty` 那两格），所以 `FindProperty` 找不到，必须在这里单独答。
    //
    // **第 687 轮之前这里是响亮地抛**（「function length / name are not modelled」）——
    // 抛得比静默给 `undefined` 好，可**它是同一件事的另一半**：`GetProperty` 第 291 轮
    // 就把那两格接上了（`f.length` / `f.name` 都读得到），只有**描述符**这一条路还断着
    // ⇒ `Object.getOwnPropertyDescriptor(f, "length")` 一条异常把整份文件带走。
    // 形状照 JS（实测）：`length` 是 `值 / 不可写 / 不可枚举 / **可配置**`，
    // `name` 是 `值 / 不可写 / 不可枚举 / 可配置`——**两个都只差「可配置」那一格**
    //（写成「四个全假」就是静默错值）。
    //
    // **找不到也不抛**：`Object.getOwnPropertyDescriptor(f, "nope")` 在 JS 里是 `undefined`，
    // 而 `prototype` 是函数上**真的在属性表里**的那一格（它排在前面那一支就不会走到这里）——
    // 所以这一支只负责那两格，其余照旧 `undefined`（**原来那个 throw 把这两件事混在了一起**）。
    if (receiver.Tag === ValueTag.Function || receiver.Tag === ValueTag.Closure) {
      if (ownKeyText === "length" || ownKeyText === "name") {
        let slotValue = Value.Undefined();
        if (ownKeyText === "length") {
          // **只有闭包有 `Arity`**（内建构造是「普通对象 + 一格可调用载荷」，
          // 它们的 `length` 走属性表那一支——第 687 轮给它们挂上了那一格）。
          if (receiver.Tag === ValueTag.Closure) {
            slotValue = Value.FromInt(table.Get(receiver.Ref).AsClosure().Arity);
          }
        } else if (receiver.Tag === ValueTag.Closure) {
          const nameHandle = table.Get(receiver.Ref).AsClosure().Name;
          slotValue = nameHandle === 0
            ? Value.FromString(table.CreateString([]))
            : Value.FromString(nameHandle);
        }
        if (!room(ObjectCharge + PropertyCharge * 4)) throw new Error("out of room");
        const slotDescriptor = NewPlainObject(room, table, protos);
        SetProperty(room, NeverCall, table, slotDescriptor, NameValue(table, "value"), slotValue);
        SetProperty(room, NeverCall, table, slotDescriptor, NameValue(table, "writable"), Value.FromBool(false));
        SetProperty(room, NeverCall, table, slotDescriptor, NameValue(table, "enumerable"), Value.FromBool(false));
        SetProperty(room, NeverCall, table, slotDescriptor, NameValue(table, "configurable"), Value.FromBool(true));
        return slotDescriptor;
      }
    }
    return Value.Undefined();
  }
  const ownProperty = table.Get(receiver.Ref).Props[ownFound.Index];
  // **第 333 轮起没有那个内部标记属性了**（`heap.xl.md` 的 `Extensible`）——
  // 「把它滤掉」那一套（名字 / 判据 / 五处 `continue`）连同它一起删了。
  // **访问器那一格给 `get` / `set` 两格**（第 304 轮修的）——第 276 轮这里**响亮地抛**，
  // 理由是「这一层还没有那两格的门」；**量了一下：门早就在**——
  // 访问器就住在 `Property.Getter` / `Property.Setter` 上（`heap.xl.md`），
  // 而对象字面量与类方法从第 98 轮起就一直走 `DefineAccessor`。
  // **描述符的**形状**与数据属性不一样**：访问器那一档**没有 `value` / `writable`**，
  // 多的是 `get` / `set`——写成「四格都填」就是**静默错值**
  //（`"value" in d` 会从假变真，判据 `c304-std-object-descriptor-accessor` 量着它）。
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
  // **`Object.getOwnPropertyDescriptors(对象)`**（第 324 轮）——**一趟拿全表**。
  //
  // **递归调自己**（`InvokeGlobal` 就在这个函数里）：键那一趟走
  // `getOwnPropertyNames` / `getOwnPropertySymbols`，每一格走**单数**那一条——
  // 于是「描述符长什么样」只有**一处**答案（第 276 / 304 轮那些实测出来的差别
  // ——数组元素三个真、字符串下标不可写、`length` 不可枚举不可配置、
  // 访问器没有 `value`——**一条都不必在这里再写一遍**）。
  // **抄一遍的代价是「两边会漂」**，而漂出来的是「单数对、复数错」。
  if (args.length < 1 || (!args[0].IsObject() && args[0].Tag !== ValueTag.String)) {
    throw new Error("unimplemented: Object.getOwnPropertyDescriptors needs (object or string)");
  }
  const descriptorOwner = args[0];
  const out = NewPlainObject(room, table, protos);
  // **两趟键：先字符串、后符号**（JS 的 `[[OwnPropertyKeys]]` 次序）——
  // 两支各自的口径（整数键在前、内部标记不算）已经定过了，这里不再想第二遍。
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
      // **`undefined` 不写进去**：单数那一支对「洞 / 越界 / 内部标记」给 `undefined`，
      // 而那几格**本来就不该出现在这张表里**（它们正是「不是自有属性」那几档）。
      if (descriptor.IsNullish()) continue;
      SetProperty(room, NeverCall, table, out, key, descriptor);
    }
  }
  return out;
}
if (id === ObjectSeal) {  // **`Object.seal(对象)`**（第 276 轮）——**不可配置、但仍然可写**。
  // **这正是它与 `freeze` 的分界**：`freeze` 两样都清、`seal` 只清 `configurable`——
  // 两条判据（`object-freeze` 与这一条）量的就是这两样的**差**。
  // **访问器跳过**（与 `freeze` 同一条）：它的「可配置」挂在访问器那一格上，
  // 而这一层还没有那一格的门。
  if (args.length < 1 || !args[0].IsObject()) {
    throw new Error("unimplemented: Object.seal needs an object "
      + "(boxing a primitive is not supported)");
  }
  const sealTarget = table.Get(args[0].Ref);
  // **元素那一摞也要补影子**（第 723 轮）：`seal` 只清「可配置」——
  // 写完 `a[1] = 9` 照样写得进去、`delete a[1]` 该给假（判据 `p723a-r03`）。
  MaterializeElementShadows(room, table, args[0], true);
  for (let i = 0; i < sealTarget.Props.length; i++) {
    const property = sealTarget.Props[i];
    if (property.Kind === PropertyKind.Accessor) continue;
    if ((property.Flags & PropertyFlagConfigurable) !== 0) {
      property.Flags = property.Flags - PropertyFlagConfigurable;
    }
  }
  // **标记也要打上**——`isSealed` / `isFrozen` 从它起手（理由见号那一段）。
  MarkUnextensible(room, table, args[0]);
  return args[0];
}
if (id === ObjectIsExtensible) {
  // **`Object.isExtensible(对象)`**（第 291 轮）——**与上面那两格共用同一张底牌**，
  // 只是**不取反**（见号那一段：另开一个标记迟早会与 `IsUnextensible` 漂开）。
  // **原始值一律答假**（JS 的口径）：`Object.isExtensible(1)` 是**假**——
  // 与 `isSealed` / `isFrozen` 那两格的「原始值答真」**正好相反**，
  // 所以这一句**不能顺手抄上面那一支**（抄了就是三格一起**静默**反向）。
  if (args.length < 1 || !args[0].IsObject()) return Value.FromBool(false);
  return Value.FromBool(!IsUnextensible(room, table, args[0]));
}
if (id === ObjectSetPrototypeOf) {
  // **`Object.setPrototypeOf(对象, 原型)`**（第 304 轮）——**走引擎那一条现成的路**
  //（`RtSetProto`，第 278 轮为 `extends` 写的）：那里已经定了两格的口径——
  // **接收者不是对象就抛**、**原型不是对象就不做事**（JS 的口径）。
  // **不在这里自己写 `table.Get(...).Proto = ...`**：抄一遍就是第二处会漂的答案，
  // 而漂的表现是「`extends` 与这一格在某一档上分岔」（最难查的一种）。
  if (args.length < 2) {
    throw new Error("unimplemented: Object.setPrototypeOf needs (object, prototype)");
  }
  // **第 720 轮把这一格的三档口径补全**（原来一律交给 `RtSetProto`，而那一格是
  // **为 `extends` 定的内部口径**：接收者不是对象就抛、原型不是对象就**不做事**）。
  // 规范在这里是**三档**，实测 Node（判据 `p720a-s01` … `s12`）：
  //
  // | 写法 | Node | 本仓原来 |
  // | --- | --- | --- |
  // | `Object.setPrototypeOf({}, 1)` | `TypeError` | **静默返回那个对象** |
  // | `Object.setPrototypeOf(1, {})` | **原样返回 `1`** | 抛普通 `Error` |
  // | `Object.setPrototypeOf(null, {})` | `TypeError` | 抛普通 `Error` |
  //
  // 「接收者必须是对象」是 `RtSetProto` 的**内部**约定（`set_proto` 的线上形态
  // 只由降级层发），**不是这一格的语义**——JS 在这一格先做 `RequireObjectCoercible`
  // 之后对**原始值接收者原样返回**。
  //
  // **原型的判据要多认 `HostRef` 一格**：内建构造函数在本仓是**宿主引用值**
  //（`IsObject()` 对它是假），而 JS 里它就是对象——按原始值抛掉就等于把
  // `Object.setPrototypeOf(o, Error)` 判成错的（第 278 轮那条账的同一个坑）。
  if (args[0].Tag === ValueTag.Null || args[0].Tag === ValueTag.Undefined) {
    throw new TypeError("Object.setPrototypeOf called on null or undefined");
  }
  const protoObjectish = args[1].IsObject() || args[1].Tag === ValueTag.HostRef;
  if (!protoObjectish && args[1].Tag !== ValueTag.Null) {
    throw new TypeError("Object.setPrototypeOf called with a non-object prototype");
  }
  // **原始值接收者原样返回**（不抛、也不做事）。
  if (!args[0].IsObject()) return args[0];
  return RtSetProto(table, args[0], args[1]);
}
if (id === ObjectPreventExtensions) {
  // **`Object.preventExtensions(对象)`**（第 304 轮）——**只打标记、不动属性标志**
  //（与 `seal` / `freeze` 的分界写在号那一段）。**返回的是那个对象本身**（JS 的口径）。
  // **原始值原样返回**（JS 的口径：`Object.preventExtensions(1)` 给 `1`，不抛）。
  if (args.length < 1) return Value.Undefined();
  if (!args[0].IsObject()) return args[0];
  MarkUnextensible(room, table, args[0]);
  return args[0];
}
if (id === ObjectIsPrototypeOf) {
  // **`Object.prototype.isPrototypeOf(对象)`**（第 304 轮）——问「`self` 在它的原型链上吗」。
  // **走 `RtChainHas`**（`instanceof` 的第三段，第 137 轮抽出来的）：
  // 它把**深度上限**与**终止条件**都写在一处（`props.xl.md` 的 `MaxProtoDepth`）——
  // 自己再走一趟就是第二处会漂的环保护。
  // **两边都不是对象就答假**（JS 的口径：`Object.prototype.isPrototypeOf(1)` 是假，
  // 而 `1..isPrototypeOf({})` 也是假——原始值身上没有原型链可走）。
  if (args.length < 1 || !args[0].IsObject()) return Value.FromBool(false);
  if (!self.IsObject()) return Value.FromBool(false);
  return Value.FromBool(RtChainHas(table, args[0], self.Ref));
}
if (id === ObjectIsSealed || id === ObjectIsFrozen) {
  // **两个问法共用一张底牌**（第 276 轮）：**先问「标记在不在」**——
  // 少了这一问，空对象会因为「每个自有属性都不可配置」**真空成立**而答**真**
  //（JS 答**假**：空对象是可扩展的）。**静默错值**，所以这一格不能只看标志位。
  //
  // **原始值一律答真**（JS 的口径）：`Object.isSealed(1)` 与 `Object.isFrozen(1)`
  // 在 JS 里都是**真**——原始值本来就不可扩展、也没有属性可改。
  // 所以这一支的**缺省是「真」**，与别的内建那套「缺省给假」正好相反（写在明处）。
  if (args.length < 1 || !args[0].IsObject()) return Value.FromBool(true);
  if (!IsUnextensible(room, table, args[0])) return Value.FromBool(false);
  if (id === ObjectIsSealed) {
    // **`seal` 是两件事**（第 304 轮修正）：**不可扩展** **且每一格都不可配置**。
    // 原来这一格只问了那个**标记** ⇒ `Object.preventExtensions({ x: 1 })` 之后
    // `Object.isSealed` 答**真**（JS 答**假**——那一格还是可配置的）。
    // 标记这一半是**必要的**（空对象上「每格都不可配置」**真空成立**，
    // 少了它 `Object.isSealed({})` 会答真），但**不是充分的**——两件事都要问。
    const sealedTarget = table.Get(args[0].Ref);
    for (let i = 0; i < sealedTarget.Props.length; i++) {
      const sealedProperty = sealedTarget.Props[i];
  // **第 333 轮起没有那个内部标记属性了**（`heap.xl.md` 的 `Extensible`）——
  // 「把它滤掉」那一套（名字 / 判据 / 五处 `continue`）连同它一起删了。
      if ((sealedProperty.Flags & PropertyFlagConfigurable) !== 0) return Value.FromBool(false);
    }
    return Value.FromBool(true);
  }
  // **`isFrozen` 再问一层**：每个自有**数据**属性都不能可写
  //（访问器跳过——与 `freeze` / `seal` 那两支同一条）。
  const frozenTarget = table.Get(args[0].Ref);
  for (let i = 0; i < frozenTarget.Props.length; i++) {
    const property = frozenTarget.Props[i];
    if (property.Kind === PropertyKind.Accessor) continue;
    // 不跳过这一格，`Object.isFrozen(Object.freeze({y: 1}))` 会答**假**）。
  // **第 333 轮起没有那个内部标记属性了**（`heap.xl.md` 的 `Extensible`）——
  // 「把它滤掉」那一套（名字 / 判据 / 五处 `continue`）连同它一起删了。
    if ((property.Flags & PropertyFlagWritable) !== 0) return Value.FromBool(false);
  }
  return Value.FromBool(true);
}
if (id === ObjectForInKeys) {
  // **`for..in` 要的那串键**（第 340 轮）：见 `CollectForInKeys` 那一段的账。
  if (args.length === 0) throw new Error("for..in needs a receiver");
  if (!args[0].IsObject() && args[0].Tag !== ValueTag.Array && args[0].Tag !== ValueTag.String) {
    // **原始值给空表**（JS：`for (const k in 42)` 一次都不跑，而且**不抛**）。
    const emptyHandle = table.CreateArray();
    table.Get(emptyHandle).Proto = protos.Array;
    return Value.FromArray(emptyHandle);
  }
  return Value.FromArray(CollectForInKeys(room, table, args[0], protos));
}
if (id === ObjectKeys) {
  // **`Object.keys` = 自有 + 可枚举 × 「下标键在前、其余按创建顺序」**（第 210 轮补后两条）。
  //
  // **它原来只看 `Props`**，于是**两整类东西一个都看不见**：
  //   · **数组的元素**（住在 `HeapArray` 里，不在 `Props` 里）⇒ `Object.keys([1, 2])` 给 `[]`（JS 给 `["0","1"]`）；
  //   · **字符串的下标**（字符串没有 `Props`）⇒ `Object.keys("ab")` **抛**（JS 给 `["0","1"]`）；
  // 而 **`Object.keys` 的次序也是语义**：**整数样的键升序在前**，其余按创建顺序——
  // `{ "a-b": 1, if: 2, 3: "three" }` 在 JS 里是 `["3","a-b","if"]`
  //（判据 `ex-quoted-and-keyword-keys` 现场红的：原来给 `["a-b","if","3"]`）。
  // **字符串也是合法的接收者**（JS：`Object.keys("ab")` 给 `["0","1"]`）——
  // 而字符串**没有属性表**（它是 `HeapString`），所以下面那一趟要跳过。
  const stringTarget = args[0].Tag === ValueTag.String;
  // **原始值里只有 `null` / `undefined` 抛**（第 377 轮）：JS 走的是 `ToObject`，
  // 而 `Object.keys(5)` / `Object.keys(true)` **不抛**（给空数组——装箱之后没有自有可枚举属性）。
  // **原来非对象一律抛** ⇒ `Object.keys(5)` 报 `Object.keys needs an object`
  //（判据 `c371-stdlib-object-values-entries-primitive` 的第四行量的就是它）。
  // `null` / `undefined` 那两档**照旧抛 `TypeError`**（JS 也是，判据里两半都写着）。
  if (args[0].IsNullish()) {
    throw new TypeError("Object.keys called on null or undefined");
  }
  if (!stringTarget && args[0].Tag !== ValueTag.Array && !args[0].IsObject()
    && args[0].Tag !== ValueTag.Int32 && args[0].Tag !== ValueTag.Float64
    && args[0].Tag !== ValueTag.Bool) {
    throw new Error("unimplemented: Object.keys on a " + args[0].Tag);
  }
  // **数字 / 布尔：装箱之后一个自有可枚举属性都没有** ⇒ 直接给空数组
  //（不往下走那一趟扫描——它读的是 `Props`，而原始值没有属性表）。
  const boxedEmpty = args[0].Tag === ValueTag.Int32 || args[0].Tag === ValueTag.Float64
    || args[0].Tag === ValueTag.Bool;
  if (boxedEmpty) {
    if (!room(ObjectCharge)) throw new Error("out of room");
    const emptyHandle = table.CreateArray();
    table.Get(emptyHandle).Proto = protos.Array;
    return Value.FromArray(emptyHandle);
  }
  // **第 340 轮：这一趟扫描抽成了 `OwnEnumerableKeyTexts`**——`for..in` 要在原型链的
  // **每一层**做同一件事（`CollectForInKeys`），而「哪些键算数、按什么次序」
  // 有四十多行 ⇒ 抄一份就是**两处会漂**的判据（第 307 / 312 / 320 / 338 轮各踩过一次）。
  // **这一支的行为一个字节都没变**（同一段代码搬了个家）。
  const names = OwnEnumerableKeyTexts(table, args[0], protos);
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
  // **值与键值对**（第 120 轮补）：与 `Object.keys` 同一趟扫描，
  // 差别只有「要不要读值」——**访问器也要读**（第 655 轮：JS 走 `[[Get]]`，`keys` 不必读）。
  //
  // **第 210 轮把下标键也接上**（与 `keys` 那一支同一条口径）：数组的元素、
  // 字符串的下标——它们排在最前面（`Object.values([1,2])` 在 JS 里是 `[1,2]`，
  // 原来给 `[]`）。
  //
  // **先把要用的值抄进宿主数组再分配**：抄进来的是 `Value`（引用），
  // 而它们**住在源对象的属性表里**——属性表由 `args[0]` 拴着，`args[0]` 是这次调用的根，
  // 所以中途的分配不会把它们收走（`GetIterator` 那条路是同一个理由）。
  const stringTarget2 = args[0].Tag === ValueTag.String;
  // **与 `keys` 那一支同一条口径**（第 377 轮）：`null` / `undefined` 抛 `TypeError`、
  // **数字 / 布尔给空数组**（装箱之后没有自有可枚举属性）。两处**必须一起改**——
  // 只改一处的话 `Object.keys(5)` 通、`Object.values(5)` 抛，而它们是同一个问题。
  if (args[0].IsNullish()) {
    throw new TypeError("Object.values/entries called on null or undefined");
  }
  const boxedEmpty2 = args[0].Tag === ValueTag.Int32 || args[0].Tag === ValueTag.Float64
    || args[0].Tag === ValueTag.Bool;
  if (boxedEmpty2) {
    if (!room(ObjectCharge)) throw new Error("out of room");
    const emptyHandle2 = table.CreateArray();
    table.Get(emptyHandle2).Proto = protos.Array;
    return Value.FromArray(emptyHandle2);
  }
  if (!stringTarget2 && args[0].Tag !== ValueTag.Array && !args[0].IsObject()) {
    throw new Error("unimplemented: Object.values/entries on a " + args[0].Tag);
  }
  const own = stringTarget2 ? null : table.Get(args[0].Ref);
  const indexPositions2 = IndexKeyPositions(table, args[0]);
  const indexKeys: Value[] = [];
  const indexValues: Value[] = [];
  for (let i = 0; i < indexPositions2.length; i++) {
    // **键是位置本身**（`[1, , 3]` 给 `"0"` 与 `"2"`，不是 `"0"` 与 `"1"`）。
    indexKeys.push(Value.FromString(table.CreateString(Units("" + indexPositions2[i]))));
    indexValues.push(IndexKeyValueAt(room, table, args[0], indexPositions2[i]));
  }
  // **`Props` 里那两摞**：与 `Object.keys` 那一支同一处次序规矩
  //（整数样的键升序在前、其余按创建顺序）——`Object.values({ "a-b": 1, 3: "three" })`
  // 在 JS 里是 `["three", 1]`（**值的次序跟着键**）。
  const intKeys: number[] = [];
  const intValues: Value[] = [];
  const intAccessor: boolean[] = [];
  const plainKeys: number[] = [];
  const plainValues: Value[] = [];
  const plainAccessor: boolean[] = [];
  if (own !== null) {
  for (let i = 0; i < own.Props.length; i++) {
    if (table.Get(own.Props[i].Key).Tag !== ValueTag.String) continue;
    // **可枚举才算**（第 182 轮，与 `keys` 那一条同一处修正）；私有字段是隐藏的，一起筛掉。
    if (!own.Props[i].IsEnumerable()) continue;
    // **访问器不再跳过**（第 655 轮）：`Object.values` / `Object.entries` 走的是 **`[[Get]]`**
    //（第 120 轮那一版在这里 `continue`，于是 `{ get a() { return 1 } }` 给 `[]`，`node` 给 `[1]`）
    // ——与 `Object.assign` 第 306 轮修的是同一件事。
    // **值这一刻不抄**：getter 的结果**不属于任何对象**，抄进这个宿主数组再分配
    // 就是让一个没人指着的值跨越一次回收，所以只记下「这一格要现读」。
    const isAccessor = own.Props[i].IsAccessor();
    // **与下标键重复的那些**（越界写过的下标）不重复收。
    const propText = TextFrom(table, Value.FromString(own.Props[i].Key));
    if (IsIndexKeyText(propText)) {
      let coveredValue = false;
      for (let k = 0; k < indexPositions2.length; k++) {
        if (indexPositions2[k] === Number(propText)) coveredValue = true;
      }
      if (coveredValue) continue;
      intKeys.push(own.Props[i].Key);
      intValues.push(isAccessor ? Value.Undefined() : own.Props[i].Value);
      intAccessor.push(isAccessor);
      continue;
    }
    plainKeys.push(own.Props[i].Key);
    plainValues.push(isAccessor ? Value.Undefined() : own.Props[i].Value);
    plainAccessor.push(isAccessor);
  }
  }
  // **整数样的一摞升序**（键与值一起换——两摞是平行的）；「要不要现读」那一摞跟着一起换。
  for (let i = 1; i < intKeys.length; i++) {
    const curKey = intKeys[i];
    const curValue = intValues[i];
    const curAccessor = intAccessor[i];
    let j = i - 1;
    while (j >= 0 && Number(TextFrom(table, Value.FromString(intKeys[j]))) > Number(TextFrom(table, Value.FromString(curKey)))) {
      intKeys[j + 1] = intKeys[j];
      intValues[j + 1] = intValues[j];
      intAccessor[j + 1] = intAccessor[j];
      j = j - 1;
    }
    intKeys[j + 1] = curKey;
    intValues[j + 1] = curValue;
    intAccessor[j + 1] = curAccessor;
  }
  const keys: number[] = [];
  const values: Value[] = [];
  const accessors: boolean[] = [];
  for (let i = 0; i < intKeys.length; i++) {
    keys.push(intKeys[i]);
    values.push(intValues[i]);
    accessors.push(intAccessor[i]);
  }
  for (let i = 0; i < plainKeys.length; i++) {
    keys.push(plainKeys[i]);
    values.push(plainValues[i]);
    accessors.push(plainAccessor[i]);
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
    // **现读的那一格：读到的值立刻进它该去的地方**（第 655 轮）——
    // 结果数组**已经分配好**（上面那次 `room` 是唯一的回收点，发生在值还不存在的时候），
    // 所以第一次 `Push` 就是给这个值生根；`entries` 的键先塞进新数组、值再塞，
    // 中间隔着的那次 `GetProperty` 因而不会留下没人指着的值。
    // **没有通道时照旧跳过**（`call === null` 是「宿主没接那一格」，与 `Object.assign`
    // 那条可选服务的纪律一字不差——那时宁可少一格，也不能凭空给一个 `undefined`）。
    const needsRead = accessors[i];
    if (needsRead && call === null) continue;
    if (id === ObjectValues) {
      let value = values[i];
      if (needsRead) {
        if (call === null) continue;
        if (!room(PropertyCharge)) throw new Error("out of room");
        value = GetProperty(room, call, protos, table, args[0], Value.FromString(keys[i]));
      }
      result.Push(value);
      continue;
    }
    // `entries` 给的是 `[键, 值]` 的**新数组**（JS 的形状），所以它也要数组原型。
    const pair = NewPlainArray(room, table, protos);
    const pairItems = table.Get(pair.Ref).AsArray();
    pairItems.Push(Value.FromString(keys[i]));
    let entryValue = values[i];
    if (needsRead) {
      if (call === null) continue;
      if (!room(PropertyCharge)) throw new Error("out of room");
      entryValue = GetProperty(room, call, protos, table, args[0], Value.FromString(keys[i]));
    }
    pairItems.Push(entryValue);
    result.Push(pair);
  }
  return Value.FromArray(handle);
}
if (id === ObjectGetOwnPropertyNames) {
  // **`Object.getOwnPropertyNames(o)`**（第 214 轮）——与 `Object.keys` **只差一格**：
  // 它**不管 `enumerable`**（`defineProperty(o, "x", { value: 1 })` 那默认的不可枚举一格
  // 在 `keys` 里看不见、在这里看得见）。次序、下标键那两条口径**一字不差**。
  //
  // **它是 `Object.keys` 的第二份实现吗**：不是——**过滤那一步**不同而已，
  // 所以这里照抄的是同一趟扫描、只把 `IsEnumerable()` 那一句去掉（写在明处：
  // 两处的差异**只有那一句**，谁改了次序都要记得两边一起改）。
  const nameTarget = args.length > 0 ? args[0] : Value.Undefined();
  // **`null` / `undefined` 抛 `TypeError`**（第 705 轮）：与 `Object.keys` 那一支
  // **一字不差**（JS 在这里走的也是 `ToObject`，只有那两档会抛）。
  if (nameTarget.IsNullish()) {
    throw new TypeError("Object.getOwnPropertyNames called on null or undefined");
  }
  const nameIsText = nameTarget.Tag === ValueTag.String;
  // **数字 / 布尔 / 符号：装箱之后一个自有属性都没有** ⇒ 直接给空数组
  //（第 705 轮，**实测撞到的**）：原来非对象一律抛 ⇒ `Object.getOwnPropertyNames(1)`
  // 报 `... needs an object`（Node 给 `[]`），第 705 轮的原子探针 `p705o-b26` 量的就是它。
  // 口径与 `Object.keys` 那一支第 377 轮补的那两档**是同一个**——`ToObject` 的正面。
  if (!nameIsText && nameTarget.Tag !== ValueTag.Array && !nameTarget.IsObject()
    && (nameTarget.Tag === ValueTag.Int32 || nameTarget.Tag === ValueTag.Float64
      || nameTarget.Tag === ValueTag.Bool || nameTarget.Tag === ValueTag.Symbol)) {
    if (!room(ObjectCharge)) throw new Error("out of room");
    const primitiveHandle = table.CreateArray();
    table.Get(primitiveHandle).Proto = protos.Array;
    return Value.FromArray(primitiveHandle);
  }
  if (!nameIsText && nameTarget.Tag !== ValueTag.Array && !nameTarget.IsObject()) {
    throw new Error("unimplemented: Object.getOwnPropertyNames on a " + nameTarget.Tag);
  }
  const nameItem = nameIsText ? null : table.Get(nameTarget.Ref);
  const nameIndexPositions = IndexKeyPositions(table, nameTarget);
  const ownNames: string[] = [];
  for (let i = 0; i < nameIndexPositions.length; i++) ownNames.push("" + nameIndexPositions[i]);
  // **`length` 也是自有属性**（第 214 轮实测）：JS 的 `Object.getOwnPropertyNames([1, 2])`
  // 是 `["0", "1", "length"]`、字符串同理——而本仓的 `length` **不住在属性表里**
  //（它在 `HeapArray` 上，`keys` 那一支看不见它是因为它**不可枚举** 在这里却是**要看见**的）。
  // 次序对：下标在前、`length` 在后（JS 的整数键优先那一套）。
  if (nameTarget.Tag === ValueTag.Array || nameTarget.Tag === ValueTag.String) {
    ownNames.push("length");
  }
  // **闭包自己那两格**（第 687 轮）：`length` 住在 `HeapClosure.Arity`、`name` 住在 `Name`，
  // **都不在属性表里** ⇒ 上面那一趟扫不到它们。JS 里普通函数给
  // `["length", "name", "prototype"]`、箭头函数给 `["length", "name"]`——
  // 次序就是这一句的次序（`length` 在前、`name` 随后），`prototype` 那一格**在属性表里**
  // （`AttachPrototype` 写的），所以由下面那一趟负责，这里不重复。
  // **`ValueTag.Function`（内建构造）也要**：它们的 `length` / `name` 是**属性表里**
  // 真的两格（第 687 轮挂的），所以那一档原样走下面那一趟，这里只补闭包。
  if (nameTarget.Tag === ValueTag.Closure) {
    ownNames.push("length");
    ownNames.push("name");
    // **受限属性那两格**（第 709 轮）：`arguments` / `caller` 也**不住在属性表里**——
    // 只有**松散的普通函数**有它们（箭头 / 方法 / 生成器 / `async` / 类 / 严格代码都没有，
    // 判据由降级层量好放在 `HeapClosure.HasRestricted` 上）。
    // **次序是 Node 的次序**：`["length","name","arguments","caller","prototype"]`
    // ——`prototype` 那一格在属性表里（`AttachPrototype` 写的），由下面那一趟接在**后面**。
    if (nameItem !== null && table.Get(nameTarget.Ref).AsClosure().HasRestricted) {
      ownNames.push("arguments");
      ownNames.push("caller");
    }
  }
  const ownIntNames: string[] = [];
  const ownPlainNames: string[] = [];
  if (nameItem !== null) {
    for (let i = 0; i < nameItem.Props.length; i++) {
      if (table.Get(nameItem.Props[i].Key).Tag !== ValueTag.String) continue;
      // 而这一支的判据恰恰是「**不管 `enumerable`**」——所以它会漏出来
      //  JS 给 `["x"]`）。**这一句是这一支与 `Object.keys` 唯一的差别多出来的一行**。
  // **第 333 轮起没有那个内部标记属性了**（`heap.xl.md` 的 `Extensible`）——
  // 「把它滤掉」那一套（名字 / 判据 / 五处 `continue`）连同它一起删了。
      const text = TextFrom(table, Value.FromString(nameItem.Props[i].Key));
      // **`length` 已经在上面那一句里推过一次**（第 722 轮）：数组 / 字符串自己那一格
      // `length` 本来不住在属性表里，可 `Object.defineProperty(xs, "length",
      // { writable: false })` 会在属性表里留一份（`RequireArrayGrowable` 读它）——
      // 不筛掉的话 `Object.getOwnPropertyNames([1])` 会给出 `["0", "length", "length"]`
      //（JS 给 `["0", "length"]`）。
      if (text === "length" && (nameTarget.Tag === ValueTag.Array || nameTarget.Tag === ValueTag.String)) {
        continue;
      }
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
  // **`Object.getOwnPropertySymbols(o)`**（第 288 轮）——`getOwnPropertyNames` 的**镜像**：
  // **只把「键是不是字符串」翻成「键是不是符号」**。
  //
  // **次序照属性表的次序**：符号键**不参与**「整数键优先」那一套
  //（JS 的 `[[OwnPropertyKeys]]` 是「整数键 → 字符串键 → 符号键」三段，
  //  而这一段**本身就是最后那一段** ⇒ 直接按插入序交出去）。
  //
  // **`length` 与下标键都不在结果里**：它们不是符号键——
  // 所以这一支**不需要** `IndexKeyPositions` 那一套（那一套是给字符串键用的），
  // 也不需要在数组 / 字符串上特判。
  const symbolsTarget = args.length > 0 ? args[0] : Value.Undefined();
  if (symbolsTarget.Tag !== ValueTag.String && symbolsTarget.Tag !== ValueTag.Array
    && !symbolsTarget.IsObject()) {
    throw new Error("Object.getOwnPropertySymbols needs an object");
  }
  // **字符串与数组的符号键在属性表里**（`length` / 下标不在，而它们也不是符号）——
  // 所以这一句与 `getOwnPropertyNames` 那一边的取法一致。
  const symbolsItem = symbolsTarget.Tag === ValueTag.String ? null : table.Get(symbolsTarget.Ref);
  const ownSymbols: Value[] = [];
  if (symbolsItem !== null) {
    for (let i = 0; i < symbolsItem.Props.length; i++) {
      // **键是句柄**（`heap.xl.md` 的 `Property.Key`）——它指向一个 `HeapString`
      // 或 `HeapSymbol`，**看那一格的 `Tag`**（与 `getOwnPropertyNames` 那边
      // 判「是不是字符串」用的是同一句，只翻了个方向）。
      if (table.Get(symbolsItem.Props[i].Key).Tag !== ValueTag.Symbol) continue;
  // **第 333 轮起没有那个内部标记属性了**（`heap.xl.md` 的 `Extensible`）——
  // 「把它滤掉」那一套（名字 / 判据 / 五处 `continue`）连同它一起删了。
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
  // **`Object.fromEntries(entries)`**（第 214 轮）：`[[k, v], …]` 或一个 `Map` →
  // 造一个**普通对象**。
  //
  // **`Map` 那一支读的是它的内部两格**（`__k` / `__v`，`map.xl.md` 的表示）：
  // 这里**不去走迭代协议**——那要 `protos` 与调用通道那一整套，
  // 而 `Map` 的内部表示就在手边（`ReadOwn`）。
  // **别的可迭代物不支持**：响亮地抛（不静默给空对象）。
  const entriesTarget = args.length > 0 ? args[0] : Value.Undefined();
  // **造属性要一条调用通道**（`SetProperty` 可能碰到 setter）——没有就响亮地抛。
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
  // **`JSON.parse`**（第 122 轮）：实参必须是字符串——坏输入**抛**，
  // 而那个抛由宿主通道抬成**脚本接得住**的异常（第 121 轮那条路）。
  //
  // **坏输入抛的是 `SyntaxError`**（第 277 轮）：那 22 处写的是**宿主的**那个类，
  // 由 `RaiseFromHost` 翻成脚本的族（第 227 轮那条桥）。
  if (args.length < 1 || args[0].Tag !== ValueTag.String) {
    throw new SyntaxError("JSON.parse needs a string");
  }
  // **第二格实参（reviver）**（第 279 轮）：JS 的规矩是**自底向上**走一遍 ——
  // 先让每一格过一遍回调，最后再拿**根**调一次（键是空串）。
  //
  // **根要锚住**：整棵解析出来的树在这一次调用期间**只有宿主变量指着它**，
  // 而回调里会分配（脚本跑起来什么都可能造）——不锚的话，某一轮回调之后
  // 剩下的那些格子**可能已经被收走**（症状是「回调跑到一半拿到死句柄」，
  // 与第 200 轮 `reduce` 那个累加器一模一样的形状）。
  // **锚在哪**：`protos.WellKnownSymbols`——它由 `Protos.Roots` 挂着（第 184 轮），
  // 而这一层手里只有 `protos`（没有模块级可变量，与 `Symbol.for` 那张注册表同一个理由）。
  // **要存旧的、跑完恢复**：回调里还可能再调一次 `JSON.parse`（合法）——
  // 不恢复的话内层跑完会把外层的根换掉，外层剩下那几格就没人指着了。
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
  // **先把 holder 锚上、再解析**：`JsonParseText` 自己会分配一大堆，
  // 而它交出来的那棵树**还没有人指着**——锚在前面就没有那个窗口。
  SetHiddenProperty(room, table, Value.FromObject(protos.WellKnownSymbols), anchorKey, rootHolder);
  const parsed = JsonParseText(room, table, protos, JsTextUnits(table, args[0]));
  SetProperty(room, NeverCall, table, rootHolder, Value.FromString(table.CreateString(Units(""))), parsed);
  // **没有 reviver（或它不可调）就到此为止**（JS 的口径：`JSON.parse(x, 1)` 是**忽略**）。
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
  // **第三、四个实参：缩进**（第 192 轮）。JS 收两种：**数字**（空格个数，
  // 夹到 0..10）与**字符串**（前十个字符）；别的（`undefined` / `null` / 对象）
  // 一律当「不缩进」。这一格原来是**整段忽略**（永远紧凑，**静默**不同）。
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
  // **锚那一格**（第 294 轮）：`JsonText` 调完 `toJSON` / replacer 之后，那一趟的产物
  // **只有宿主变量指着**，而递归里还会再调脚本（脚本里会分配）——
  // 所以先造一个**数组**当锚、**挂到 `protos.WellKnownSymbols` 上**
  //（与第 279 轮 `JSON.parse` 的 reviver **同一处坎、同一个理由**：
  // 这一层手里只有 `protos`，没有模块级可变量）。
  // **按递归深度分格**（一层一格）——理由写在 `JsonAnchor` 那一段。
  // **存旧的、跑完恢复**：`toJSON` / replacer 里还可能再调一次 `JSON.stringify`（合法）——
  // 不恢复的话内层跑完会把外层这一格换掉。
  //
  // **没有 `call` 通道时一次都不会用它**：`JsonText` 里那两支（`call !== null`）
  // 根本不会跑——**照旧的纯查询一条都不变**。
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
  // **第二格实参（replacer）**（第 294 轮）：JS 收**函数**（逐格改写）
  // 与**数组**（键的白名单）两种，别的（`null` / 对象）一律**忽略**。
  // 这里是**原样递下去**：是哪一种由 `JsonText` 那两处按类型判
  //（分开判两次比在这里折成两种参数少一层）。
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
  // 实例是一个**普通对象**：毫秒存在 `__t` 里，方法**挂在实例自己身上**
  // （与 `Map` 同一套配方）。**但原型那一格是 `Protos.Date`**（第 138 轮）——
  // 「方法挂实例」与「这一族是谁」是两件事：前者决定 `Object.keys(d)` 里有什么，
  // 后者决定 `d instanceof Date`。少了后者，`instanceof` 那一族又是「一半对」。
  const created = NewPlainObject(room, table, protos);
  table.Get(created.Ref).Proto = protos.Date;
  // **四条构造形态**（第 293 轮把后三条补齐）：
  //   · 不给实参 ⇒ `0`（**没有时钟接口**，见 `ClockNow` 那一段——宿主真接了时钟的话走的是 `Date.now`）；
  //   · 一个数 ⇒ 毫秒数（第 138 轮）；
  //   · **一个字符串 ⇒ `Date.parse`**（与静态那条**同一条**，不写第二份解析器）；
  //   · **两个以上 ⇒ 年 / 月 / 日 / 时 / 分 / 秒 / 毫秒**（缺的按 JS 的默认值补：
  //     日缺省 `1`、其余缺省 `0`）。
  //
  // **`0..99` 的年份要加 1900**（JS 的两条构造**都是**这条口径，与 `Date.UTC` 一字不差）——
  // 少了它 `new Date(99, 0, 1)` 会变成**公元 99 年**（**静默错值**，而且是错 1900 年）。
  //
  // **本地时间那一档本仓当 UTC 用**（写在明处）：本仓没有时区库，
  // 所以「构造用哪个口径、读取就用哪个口径」——`new Date(2020, 0, 2, 3, 4, 5)` 与
  // `getFullYear()` / `getHours()` 这一对**自洽**（判据量的正是这一对）。
  // 而**混用**本地与 UTC 的程序会与 Node 差一个时区偏移（例如 `new Date(0).getHours()`
  // 在 UTC+8 的机器上 Node 给 `8`、本仓给 `0`）——记在台账里。
  let ms = Value.FromInt(0);
  if (args.length === 1) {
    if (args[0].Tag === ValueTag.String) {
      ms = Value.FromDouble(DateParseUnits(JsTextUnits(table, args[0])));
    } else {
      ms = args[0];
    }
  } else if (args.length > 1) {
    // **年那一格看 `MakeFullYear`**（第 702 轮）：它在 `NaN` 的**输入**上给 `+0`
    //（`new Date(undefined as any, 0)` 在 JS 里是 1900 年 1 月——`ToNumber` 给 `NaN`，
    // 而 `MakeFullYear` 把 `NaN` 折成 `+0`，再吃 `0..99` 那条加 1900 的规则）。
    // **其余六格不走那一档**：它们拿到 `NaN` 就整条 `NaN`（`MakeDay` 的口径），
    // 所以那六格用 `IntArgStrict`（`NaN` 折成哨兵，由 `DateMakeMs` 认）。
    // 原来七格共用 `ArgOr` 的窄签名：`new Date("2020" as any, 0)` 里那个**字符串年份**
    // 落回缺省 `0`，再吃 `0..99` 那条规则 ⇒ **公元 1900 年**（Node 给 2020）——静默错值。
    const askedYear = IntArgOr(room, call, protos, table, args, 0, 0);
    const fullYear = askedYear >= 0 && askedYear <= 99 ? askedYear + 1900 : askedYear;
    ms = Value.FromDouble(DateMakeMs(fullYear,
      IntArgStrict(room, call, protos, table, args, 1, 0), IntArgStrict(room, call, protos, table, args, 2, 1),
      IntArgStrict(room, call, protos, table, args, 3, 0), IntArgStrict(room, call, protos, table, args, 4, 0),
      IntArgStrict(room, call, protos, table, args, 5, 0), IntArgStrict(room, call, protos, table, args, 6, 0)));
  }
  if (!ms.IsNumber()) throw new Error("unimplemented: new Date(x) needs a number of milliseconds or an ISO string");
  // **`__t` 也是不可枚举的**（第 194 轮）：JS 的 `Object.keys(new Date())` 是 `[]`
  //（本仓原来给 8 个键）。**`JSON.stringify(date)` 那一格仍旧不同**：
  // JS 走 `toJSON` 给 ISO 字符串，本仓给 `{"__t":0}`——那是**另一件事**，
  // 与新加的 `Date.prototype.toJSON` 一起单独立一轮（记在台账里）。
  SetHiddenProperty(room, table, created,
    Value.FromString(table.CreateString(Units("__t"))), ms);
  // **方法第 341 轮搬到了原型上**（`InstallDatePrototype`）：这一行原来写着
  // 「方法挂在实例自己身上」——那一句现在是**错的**，所以一并改掉
  //（`Object.getOwnPropertyNames(new Date())` 在 Node 里是**空数组**、本仓原来列出二十七个名字）。
  // `__t` 仍然留在实例上（它是**这个实例的数据**，不是方法）。
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
  // **非有限的时刻先把 `NaN` 交回去**（第 702 轮）：JS 对 `Invalid Date` 的**每一个**
  // getter 都给 `NaN`（`new Date(NaN).getUTCMonth()` 在 Node 里是 `NaN`，**不抛**）。
  // 少了这一句，下面那些 `Value.FromInt(…)` 会把 `NaN` 塞进 `int` 那一格——
  // 于是 `typeof d.getUTCMonth()` 还是 `"number"`，可 `String(…)` 出来**是空串**
  //（宿主侧 `Value.FromInt(NaN)` 落成 `Int: NaN`，渲染那一步给不出 "NaN"）——
  // **判据现场就是这么红的**。**七格共用一个出口**（`DateParts` 的列 + 一天之内那几格 + 星期几），
  // 所以判在入口一处、不判在七处。
  if (ms !== ms || ms === Infinity || ms === -Infinity) return Value.FromDouble(NaN);
  if (id === DateGetUTCFullYear) return Value.FromInt(DateParts(ms)[0]);
  if (id === DateGetUTCMonth) return Value.FromInt(DateParts(ms)[1]);
  if (id === DateGetUTCDate) return Value.FromInt(DateParts(ms)[2]);
  // **一天之内的部分**：与日历那一半无关，所以单独算（`+86400` 那一步是为了
  // **负毫秒**——1970 年以前的时刻也要给出 0..86399 之内的秒数）。
  const seconds = Math.floor(ms / 1000);
  const secondOfDay = ((seconds % 86400) + 86400) % 86400;
  if (id === DateGetUTCHours) return Value.FromInt(Math.floor(secondOfDay / 3600));
  if (id === DateGetUTCMinutes) return Value.FromInt(Math.floor(secondOfDay / 60) % 60);
  if (id === DateGetUTCSeconds) return Value.FromInt(secondOfDay % 60);
  if (id === DateGetUTCMilliseconds) {
    // **毫秒那一格要从原始 `ms` 取**（不是上面那个「一天的秒数」）——
    // 负毫秒上写成 `ms % 1000` 会给负数（`-1` 该给 `999`），所以先折回非负。
    const whole = Math.floor(ms);
    return Value.FromInt(((whole % 1000) + 1000) % 1000);
  }
  // **星期几**（第 293 轮）：从纪元起的**天数**对 7 取模，
  // 而 `1970-01-01` 是**周四** ⇒ 加 4 之后 `0` 才是周日。
  // **先 `floor` 到天**（不是拿毫秒除：`-1` 毫秒是 1969-12-31，纳秒级的截断会让它差一天）。
  const dayNumber = Math.floor(ms / 86400000);
  return Value.FromInt((((dayNumber + 4) % 7) + 7) % 7);
}
if (id === DateParse) {
  // **`Date.parse(文本)`**（第 293 轮）——与 `new Date(字符串)` **共用同一条解析器**
  //（见 `DateParseUnits`）。
  //
  // **非字符串响亮地抛**（不 `ToString` 一遍）：JS 在这里是 `ToString` 之后再解析
  //（`Date.parse(2020)` 于是走 `"2020"` ⇒ `NaN`），而那一档在本仓**一条判据也没有**——
  // 猜一个「数字当文本」出来只会多一处会漂的地方（与 `DateParseUnits` 里
  // 「其余形状一律给 `NaN`」**不是**同一条：那一条是**已经给了文本**）。
  if (args.length === 0) return Value.FromDouble(NaN);
  if (args[0].Tag !== ValueTag.String) {
    throw new Error("unimplemented: Date.parse needs a string argument");
  }
  return Value.FromDouble(DateParseUnits(JsTextUnits(table, args[0])));
}
if (id === DateToString) {
  // **`Date.prototype.toString`**（第 293 轮，第 616 轮补上合法日期那一档）。
  //
  // **非法日期给 `"Invalid Date"`**（JS 的口径）。
  // **合法日期按 UTC 渲染**（`DateTextOf`）——本仓没有时区库，
  // 本地那一族 getter 本来就当 UTC 用（见 `InstallDateMethods` 那一段），
  // 两者必须同一个口径：`String(d)` 与 `d.getHours()` 不自洽的话，
  // 同一份日期在同一个程序里会有两套读法。
  const textStored = FindProperty(room, table, self.Ref,
    Value.FromString(table.CreateString(Units("__t"))));
  if (textStored === null) throw new Error("unimplemented: not a Date receiver (no __t)");
  const textMs = NumericOf(table.Get(textStored.Owner).Props[textStored.Index].Value);
  // **非法日期那一档**：`"Invalid Date"` 恰好 12 个码元。
  if (textMs !== textMs) {
    if (!room(ObjectCharge + CodeUnitCharge * 12)) throw new Error("out of room");
    return Value.FromString(table.CreateString(Units("Invalid Date")));
  }
  const dateText = DateTextOf(textMs);
  if (!room(ObjectCharge + CodeUnitCharge * dateText.length)) throw new Error("out of room");
  return Value.FromString(table.CreateString(Units(dateText)));
}
if (id === DateToISOString || id === DateToJSON) {
  // **`toISOString` 与 `toJSON` 共用这一支**（第 280 轮，两支的差别只有非法日期那一格）。
  // **`toJSON` 多收一个键实参**（`JSON.stringify` 调它时给 `(键, 值)`）——
  // 那一格**用不上**（日期串与键无关），所以两支合并**没有代价**。
  const isoStored = FindProperty(room, table, self.Ref,
    Value.FromString(table.CreateString(Units("__t"))));
  if (isoStored === null) throw new Error("unimplemented: not a Date receiver (no __t)");
  const isoMs = NumericOf(table.Get(isoStored.Owner).Props[isoStored.Index].Value);
  // **非法日期两档不一样**（第 605 轮）：`toISOString` 抛 `RangeError`、
  // `toJSON` 给 **`null`**（规范原话：`tv` 不是有限数就返回 `null`）——
  // 所以这两个号不能再合并，见 `DateToJSON` 那一段。
  if (isoMs !== isoMs) {
    if (id === DateToJSON) return Value.Null();
    throw new RangeError("Invalid time value");
  }
  const isoText = DateIsoText(isoMs);
  if (!room(ObjectCharge + CodeUnitCharge * isoText.length)) throw new Error("out of room");
  return Value.FromString(table.CreateString(Units(isoText)));
}
if (id === DateToUTCString) {
  // **`toUTCString`（`toGMTString` 同一个号）**（第 702 轮）——与 `toString` 同一支的形状：
  // 读 `__t` → 非法日期给 `"Invalid Date"` → 否则按 **UTC** 拼那一段可读文本。
  // **它不生造拼法**：`DateIsoText` 已经把 `YYYY-MM-DDTHH:mm:ss.sssZ` 拼好了，
  // 这里只把同一份数字**换个排列**（见 `DateUtcText`）——星期与月份的英文名是**一张常数表**，
  // 不是区域表（UTC 那一种拼法在规范里就是固定的）。
  const utcStored = FindProperty(room, table, self.Ref,
    Value.FromString(table.CreateString(Units("__t"))));
  if (utcStored === null) throw new Error("unimplemented: not a Date receiver (no __t)");
  const utcMs = NumericOf(table.Get(utcStored.Owner).Props[utcStored.Index].Value);
  if (utcMs !== utcMs) {
    if (!room(ObjectCharge + CodeUnitCharge * 12)) throw new Error("out of room");
    return Value.FromString(table.CreateString(Units("Invalid Date")));
  }
  const utcText = DateUtcText(utcMs);
  if (!room(ObjectCharge + CodeUnitCharge * utcText.length)) throw new Error("out of room");
  return Value.FromString(table.CreateString(Units(utcText)));
}
if (id === DateGetTimezoneOffset) {
  // **本仓的本地时间就是 UTC ⇒ 偏移恒为 `0`**（理由见号那一段）。
  // 仍然是**实例方法**：不是 Date 接收者要照样抛（与其余 getter 同一道门）。
  const tzStored = FindProperty(room, table, self.Ref,
    Value.FromString(table.CreateString(Units("__t"))));
  if (tzStored === null) throw new Error("unimplemented: not a Date receiver (no __t)");
  return Value.FromInt(0);
}
if (id === DateGetYear) {
  // **`getYear()` = `getFullYear() - 1900`**（第 702 轮）——非法日期那一档照其余 getter：
  // 给 `NaN`（Node 给 `NaN`，不抛）。
  const yearStored = FindProperty(room, table, self.Ref,
    Value.FromString(table.CreateString(Units("__t"))));
  if (yearStored === null) throw new Error("unimplemented: not a Date receiver (no __t)");
  const yearMs = NumericOf(table.Get(yearStored.Owner).Props[yearStored.Index].Value);
  if (yearMs !== yearMs) return Value.FromDouble(NaN);
  return Value.FromInt(DateParts(yearMs)[0] - 1900);
}
if (id === DateSetTime) {
  // **`setTime(t)`：直接把 `__t` 换成 `ToNumber(t)`**（第 702 轮）——
  // **不拆日历**（与那七个字段 setter 不是一回事）：`setTime(NaN)` 于是把实例变成
  // Invalid Date，而那正是 JS 的口径。返回换上去的那个数。
  const timeStored = FindProperty(room, table, self.Ref,
    Value.FromString(table.CreateString(Units("__t"))));
  if (timeStored === null) throw new Error("unimplemented: not a Date receiver (no __t)");
  const asked = args.length > 0 ? ToNumberOf(room, call, protos, table, args[0]) : NaN;
  table.Get(timeStored.Owner).Props[timeStored.Index].Value = Value.FromDouble(asked);
  return Value.FromDouble(asked);
}
if (id === DateSetYear) {
  // **`setYear(y)`：`0..99` 加 1900**（第 702 轮）——与 `new Date(年, …)` / `Date.UTC`
  // 那两条**一字不差**（`setFullYear(99)` 给公元 99 年，而 `setYear(99)` 给 1999 年）。
  // **月与日不动**（JS 的口径：`setYear` 只换年那一格）。
  const setYearStored = FindProperty(room, table, self.Ref,
    Value.FromString(table.CreateString(Units("__t"))));
  if (setYearStored === null) throw new Error("unimplemented: not a Date receiver (no __t)");
  const setYearMs = NumericOf(table.Get(setYearStored.Owner).Props[setYearStored.Index].Value);
  const askedYear2 = args.length > 0
    ? IntOfNumberStrict(ToNumberOf(room, call, protos, table, args[0])) : -2147483648;
  const yearBits = DateParts(setYearMs);
  const clock2 = DateClockParts(setYearMs);
  const fixedYear = askedYear2 >= 0 && askedYear2 <= 99 ? askedYear2 + 1900 : askedYear2;
  const nextYearMs = DateMakeMs(fixedYear, yearBits[1], yearBits[2],
    clock2[0], clock2[1], clock2[2], clock2[3]);
  table.Get(setYearStored.Owner).Props[setYearStored.Index].Value = Value.FromDouble(nextYearMs);
  return Value.FromDouble(nextYearMs);
}
if (id === DateSetUTCFullYear || id === DateSetUTCMonth || id === DateSetUTCDate
  || id === DateSetUTCHours || id === DateSetUTCMinutes || id === DateSetUTCSeconds
  || id === DateSetUTCMilliseconds) {
  // **七个写入口是一个模板套七次**（第 280 轮）：读当前七个部分 →
  // 把**给了的那几格**换掉 → 合并回毫秒 → 写回 `__t` → 返回新毫秒（JS 的口径）。
  //
  // **先拆成七格再按号替换，而不是七个分支各拆一次**：七支各写一遍就是七份
  // 「哪些实参是可选的」（而这张表恰好最容易抄漏一格：`setUTCMonth(月, 日?)`、
  // `setUTCHours(时, 分?, 秒?, 毫秒?)` 都不一样）。
  const setStored = FindProperty(room, table, self.Ref,
    Value.FromString(table.CreateString(Units("__t"))));
  if (setStored === null) throw new Error("unimplemented: not a Date receiver (no __t)");
  const setMs = NumericOf(table.Get(setStored.Owner).Props[setStored.Index].Value);
  const dateBits = DateParts(setMs);
  const clockBits = DateClockParts(setMs);
  // **每一格都先取当前值，再按「给了没有」覆写**——`args[k]` 缺省就保持原样
  //（这就是 JS 那七个 setter 的实参表）。
  // **每一格过 `ToNumber` 再取整，`NaN` 折成哨兵**（第 702 轮）：
  // JS 的 `setUTCMonth(NaN)` / `setUTCFullYear({})` 把那个实例变成 **Invalid Date**
  //（`__t` 成 `NaN`），而 `NaN` 折成缺省值就成了**静默错值**（一个看起来正常的日期）。
  // 原来走 `ArgOr` 的窄签名：`setUTCFullYear("2020" as any)` 落回当前年——同样是静默错值。
  let year = dateBits[0];
  let month = dateBits[1];
  let day = dateBits[2];
  let hours = clockBits[0];
  let minutes = clockBits[1];
  let seconds = clockBits[2];
  let millis = clockBits[3];
  if (id === DateSetUTCFullYear) {
    if (args.length > 0) year = IntArgStrict(room, call, protos, table, args, 0, year);
    if (args.length > 1) month = IntArgStrict(room, call, protos, table, args, 1, month);
    if (args.length > 2) day = IntArgStrict(room, call, protos, table, args, 2, day);
  } else if (id === DateSetUTCMonth) {
    if (args.length > 0) month = IntArgStrict(room, call, protos, table, args, 0, month);
    if (args.length > 1) day = IntArgStrict(room, call, protos, table, args, 1, day);
  } else if (id === DateSetUTCDate) {
    if (args.length > 0) day = IntArgStrict(room, call, protos, table, args, 0, day);
  } else if (id === DateSetUTCHours) {
    if (args.length > 0) hours = IntArgStrict(room, call, protos, table, args, 0, hours);
    if (args.length > 1) minutes = IntArgStrict(room, call, protos, table, args, 1, minutes);
    if (args.length > 2) seconds = IntArgStrict(room, call, protos, table, args, 2, seconds);
    if (args.length > 3) millis = IntArgStrict(room, call, protos, table, args, 3, millis);
  } else if (id === DateSetUTCMinutes) {
    if (args.length > 0) minutes = IntArgStrict(room, call, protos, table, args, 0, minutes);
    if (args.length > 1) seconds = IntArgStrict(room, call, protos, table, args, 1, seconds);
    if (args.length > 2) millis = IntArgStrict(room, call, protos, table, args, 2, millis);
  } else if (id === DateSetUTCSeconds) {
    if (args.length > 0) seconds = IntArgStrict(room, call, protos, table, args, 0, seconds);
    if (args.length > 1) millis = IntArgStrict(room, call, protos, table, args, 1, millis);
  } else {
    if (args.length > 0) millis = IntArgStrict(room, call, protos, table, args, 0, millis);
  }
  // `setUTCMonth(13)` 于是给下一年的二月（JS 的口径），这里**不规整**。
  const nextMs = DateMakeMs(year, month, day, hours, minutes, seconds, millis);
  // **改的是那个实例本身**（JS 的 setter 是就地改）——所以写回 `__t`。
  table.Get(setStored.Owner).Props[setStored.Index].Value = Value.FromDouble(nextMs);
  return Value.FromDouble(nextMs);
}
if (id === DateUTC) {
  // **静态的 `Date.UTC`**（第 280 轮）——与七个 setter **同一条逆变换**，
  // 差别只有「没有接收者」：缺的那几格按 JS 的默认值补（**月 0 / 日 1 / 其余 0**）。
  // **实参一律先做 `ToNumber`**（JS 的口径）：`Date.UTC("2020" as any, 0, 2)` 也认——
  // 用 `ArgOr` 会把它当成「没给」（那个取值器只认数值格子）。
  // **第 702 轮改用 `ToNumberOf`**：原来写的是建库层那个 `NumericOf`，它**只认数值格子**
  //（字符串 / `undefined` 一律抛）——于是 `Date.UTC(2020, undefined as any)` 抛
  //「this method needs a number」，而 JS 给 `NaN`（**判据现场红的**）。
  // 缺哪一格仍然按 JS 的默认值补（月 0 / 日 1 / 其余 0），**给了 `undefined` 不给默认值**：
  // 那一格要的是真 `NaN`（与下面那句「任何一格 `NaN` 就整条 `NaN`」是同一条）。
  const utcYear = args.length > 0 ? ToNumberOf(room, call, protos, table, args[0]) : NaN;
  const utcMonth = args.length > 1 ? ToNumberOf(room, call, protos, table, args[1]) : 0;
  const utcDay = args.length > 2 ? ToNumberOf(room, call, protos, table, args[2]) : 1;
  const utcHours = args.length > 3 ? ToNumberOf(room, call, protos, table, args[3]) : 0;
  const utcMinutes = args.length > 4 ? ToNumberOf(room, call, protos, table, args[4]) : 0;
  const utcSeconds = args.length > 5 ? ToNumberOf(room, call, protos, table, args[5]) : 0;
  const utcMillis = args.length > 6 ? ToNumberOf(room, call, protos, table, args[6]) : 0;
  // **年份 `0..99` 加 1900**（JS 的口径，与构造函数那一支一字不差）。
  let utcYearFixed = utcYear;
  if (utcYearFixed >= 0 && utcYearFixed <= 99) utcYearFixed = utcYearFixed + 1900;
  // **七格里任何一格是 `NaN` 就整条是 `NaN`**（JS 的口径）——
  // `DateMakeMs` 会把 `NaN` 自然传播下去，所以这里不另判（写在明处）。
  return Value.FromDouble(DateMakeMs(utcYearFixed, utcMonth, utcDay, utcHours, utcMinutes,
    utcSeconds, utcMillis));
}
throw new Error("unimplemented: global builtin " + id);
```

# method InstallDateMethods:(room:RoomChecker, table:HeapTable, target:Value)=>void

**把 Date 那一族的方法挂到一个对象上**（第 341 轮从 `DateCtor` 那一支**原样搬出来**）——
调用点从「每个实例」改成「原型那一格」，理由与 `map.xl.md` 的 `InstallMapMethods`
那一段**一字不差**。**函数体不必改**：它们读的是 `self.__t`，
而 `DoCallMethod` 递进去的 `self` 仍然是**那个实例**。

```ts
const methodIds = [DateGetTime, DateGetUTCFullYear, DateGetUTCMonth, DateGetUTCDate,
  DateGetUTCHours, DateGetUTCMinutes, DateGetUTCSeconds, DateGetTime,
  // **第 280 轮补的两格**：`toISOString` 与 `toJSON`——**第 605 轮起两个号**
  //（非法日期那一格不一样，见 `DateToJSON` 那一段）。
  DateToISOString, DateToJSON,
  // **七个 `setUTC*`**（第 280 轮）——名字与号**一一对齐**（按下标配）。
  DateSetUTCFullYear, DateSetUTCMonth, DateSetUTCDate, DateSetUTCHours,
  DateSetUTCMinutes, DateSetUTCSeconds, DateSetUTCMilliseconds,
  // **本地那七个 setter 与 UTC 共用同一个号**（第 623 轮）——与上面那一批本地 getter
  // 同一条先例：本仓的本地口径就是 UTC，写第二份实现就是第二份会漂的答案。
  // 少了它们 `d.setHours(10)` 报 `cannot call a non-closure value`（属性根本不存在）。
  DateSetUTCFullYear, DateSetUTCMonth, DateSetUTCDate, DateSetUTCHours,
  DateSetUTCMinutes, DateSetUTCSeconds, DateSetUTCMilliseconds,
  // **第 293 轮补的九个名字**——**本地那一族与 UTC 共用同一个号**
  //（`getFullYear` = `getUTCFullYear` …），理由是**本仓的本地口径就是 UTC**
  //（见上面那一段）：写第二份实现就是第二份会漂的答案
  //（与 `valueOf` = `getTime` 同一条先例）。
  DateGetUTCMilliseconds, DateGetUTCMilliseconds, DateGetUTCDay, DateGetUTCDay,
  DateGetUTCFullYear, DateGetUTCMonth, DateGetUTCDate, DateGetUTCHours,
  DateGetUTCMinutes, DateGetUTCSeconds,
  // **`toString` 单独一个号**（只做 `Invalid Date` 那一档，见号那一段）。
  DateToString,
  // **第 702 轮补的六格**（`680..684` 与 `toString` 那一半）：`toUTCString` /
  // `getTimezoneOffset` / `getYear` / `setTime` / `setYear`——四个 getter/setter 是
  // 「JS 有、本仓没有」的普通成员，而 `toUTCString` 是**与时区无关**的那一种渲染
  //（`toDateString` / `toLocaleString` 仍不做，理由写在各自那一格）。
  DateToUTCString, DateToUTCString, DateGetTimezoneOffset, DateGetYear,
  DateSetTime, DateSetYear];
// **`valueOf` 就是 `getTime`**（第 198 轮）：JS 的 `Date.prototype.valueOf` 给的正是那一格
// 毫秒数——**同一个能力号**（同一件事不写第二份实现，与数组的 `toString` = `join` 同款）。
// 它让**日常那个写法**通了：`+new Date()`（一元 `+` 是 `ToNumber` →
// `ToPrimitive(date, number)` → `valueOf` → 毫秒数）。
// **`date + 1` 仍旧响亮地抛**（那是 hint `default`，JS 按 `string` 走，
// 会给日期串——本仓的 `toString` 只做 `Invalid Date` 那一档，见号那一段）。
const methodNames = ["getTime", "getUTCFullYear", "getUTCMonth", "getUTCDate",
  "getUTCHours", "getUTCMinutes", "getUTCSeconds", "valueOf",
  "toISOString", "toJSON",
  "setUTCFullYear", "setUTCMonth", "setUTCDate", "setUTCHours",
  "setUTCMinutes", "setUTCSeconds", "setUTCMilliseconds",
  "setFullYear", "setMonth", "setDate", "setHours", "setMinutes", "setSeconds", "setMilliseconds",
  "getMilliseconds", "getUTCMilliseconds", "getDay", "getUTCDay",
  "getFullYear", "getMonth", "getDate", "getHours", "getMinutes", "getSeconds",
  "toString",
  // **第 702 轮补的六个名字**——`toGMTString` 与 `toUTCString` **同一个号**（JS 里是别名）。
  "toUTCString", "toGMTString", "getTimezoneOffset", "getYear",
  "setTime", "setYear"];
for (let i = 0; i < methodIds.length; i++) {
  // **方法也不可枚举**（第 194 轮）：`Object.keys(new Date())` 在 JS 里是 `[]`。
  SetHiddenProperty(room, table, target,
    Value.FromString(table.CreateString(Units(methodNames[i]))),
    Value.FromRef(ValueTag.HostRef, table.CreateHostRef(methodIds[i], 0)));
}
```

# method InstallDatePrototype:(vm:Vm, protos:Protos)=>void

**把 Date 那一族的方法装到 `Protos.Date` 上**（第 341 轮）——与 `InstallMapPrototype`
同一个位置、同一个形状。

```ts
InstallDateMethods(vm.Room(), vm.Table, Value.FromObject(protos.Date));
```

# method ErrorCtorName:(id:int)=>string

**这一族成员的名字**（第 277 轮把「三条三元表达式」收成一处）。

**为什么要收**：名字在**两处**要用（写 `self` 的自有属性那一处、
走 `NewErrorLike` 那一处），而每加一个成员就要改两处——
第 277 轮加 `SyntaxError` 时正是这么踩的：三元的链再套一层就成了一行读不懂的东西。
**名字写错的表现是「看着对」的**：`new SyntaxError().name` 给 `"Error"`（**不是抛**），
而 `e instanceof SyntaxError` **照样是真**——两半里只错了一半，
`String(e)` 于是给 `"Error: boom"` 而不是 `"SyntaxError: boom"`（静默）。

```ts
if (id === TypeErrorCtor) return "TypeError";
if (id === RangeErrorCtor) return "RangeError";
if (id === SyntaxErrorCtor) return "SyntaxError";
if (id === ReferenceErrorCtor) return "ReferenceError";
// **第 376 轮补的两族**（`URIError` / `EvalError`）——与上面四行一字不差。
if (id === URIErrorCtor) return "URIError";
if (id === EvalErrorCtor) return "EvalError";
return "Error";
```

# method ErrorCtorProto:(protos:Protos, id:int)=>int

**这一族成员的原型句柄**（第 277 轮）——与名字同一个理由。

**写错一格的下场与名字写错正好差一半**：`e instanceof SyntaxError` 会**静默**给假
（而 `e.name` 是对的）。两处各错一半 ⇒ **比两处都错更难查**
（两处都错的话 `catch (e) { e instanceof TypeError }` 什么都不匹配，一眼就看出来了）。

```ts
if (id === TypeErrorCtor) return protos.TypeError;
if (id === RangeErrorCtor) return protos.RangeError;
if (id === SyntaxErrorCtor) return protos.SyntaxError;
if (id === ReferenceErrorCtor) return protos.ReferenceError;
// **第 376 轮补的两族**（`URIError` / `EvalError`）——与上面四行一字不差。
if (id === URIErrorCtor) return protos.URIError;
if (id === EvalErrorCtor) return protos.EvalError;
return protos.Error;
```

# method NewErrorLike:(room:RoomChecker, table:HeapTable, protos:Protos, protoHandle:int, name:string, message:string, hasMessage:bool)=>Value

**造一个内建错误对象**（第 137 轮）：`message` 是**自有属性**、`name` 也写成自有属性
（JS 那边 `name` 住在**原型**上，这里两处都有——自有属性优先，
所以 `e.name` 两种写法都对）。

**为什么它要单独存在**：`Error` 有三个来处——脚本写 `new Error(m)`、
`new TypeError(m)`，以及**宿主/内建失败时由驱动兜一个**（`RaiseFromHost`）。
三处给的必须是**同一种东西**，否则脚本 `catch (e) { e.message }` 在几条路上会得到
两种形状。

**原型必须挂在传进来的那一格上**：挂 `Protos.Object` 的话
`e instanceof Error` 给 **`false`**（**静默的错答案**，比抛更糟）；
挂错了格（`TypeError` 挂到 `Error` 上）会让 `e instanceof TypeError` 也错——
两种都是「看起来都做了」的那种错。

```ts
const created = NewPlainObject(room, table, protos);
table.Get(created.Ref).Proto = protoHandle;
// **`message` 是不可枚举的自有属性；`name` **不是自有属性****（第 389 轮）。
//
// 第 194 轮把这两个都做成「自有 + 不可枚举」，理由是
// 「JS 里 `Object.keys(new Error("x"))` 是 `[]`」——**那句话是对的**，
// 但它**不足以推出 `name` 该是自有的**：`[]` 只说明**可枚举的自有键为空**，
// 而 JS 那边 `message` **是**自有的（不可枚举）、`name` **根本不在实例上**
//（它住在 `Error.prototype` 上，也是不可枚举）。
//
// **两者差别在「自有」这一维**——`Object.keys` 看不见，可下面这四问都看得见：
//
//     Object.getOwnPropertyNames(new Error("x"))   Node: ["stack","message"]
//     new Error("x").hasOwnProperty("name")        Node: false
//     const e = new Error("x"); e.name = "C";
//     e.propertyIsEnumerable("name")               Node: true   ← 赋值新建的是**自有可枚举**
//     Object.keys(e)                               Node: ["name"]
//
// 本仓原来给：`["message","name"]` / `true` / `false` / `[]`
//（判据 `c371-stdlib-error-print-and-types` 拖着的正是后两行——
//  `e.name = "Custom"` 写进的是那个**已有的自有**格 ⇒ 它带着「不可枚举」的标志
//  ⇒ 两问一起错）。
//
// **所以这里只留 `message`**：`name` 由原型回答（`protos.Error` 上那一格，
// `ErrorCtorProto` 各族各自建），`e.name` 照样是 `"Error"` / `"TypeError"`。
// **`message` 是「给了才挂」**（第 703 轮，`hasMessage`）——
// JS 的 `Error` 构造那一步是 `If message is not undefined, ...`：
// `new Error(undefined).message` **不是** `"undefined"`、而是**原型上那一格的 `""`**
// （`Object.getOwnPropertyNames(new Error(undefined))` 在 Node 里**没有** `message`）。
// 第 703 轮的原子探针 `p704e-a37` 量的就是它（本仓原来给 `"undefined"`——**静默错值**）。
if (hasMessage) {
  SetHiddenProperty(room, table, created, NameValue(table, "message"),
    Value.FromString(table.CreateString(Units(message))));
}
return created;
```

# method NewError:(room:RoomChecker, table:HeapTable, protos:Protos, message:string)=>Value

**`NewErrorLike` 的旧名字**（第 121 轮就有，第 137 轮改成转调）：引擎那条
「兜一个错误对象」的路（`tsrun.xl.md` 的 `RaiseFromHost`）走的是它。

**留着这个名字**是因为**引擎侧不认识「错误有几种」**——它兜出来的统一是 `Error`；
要造 `TypeError` 的地方是**语言层自己**（`invoke` 的 `TypeErrorCtor` 那一支）。

```ts
return NewErrorLike(room, table, protos, protos.Error, "Error", message, true);
```

# method MarkUnextensible:(room:RoomChecker, table:HeapTable, target:Value)=>void

**给一个对象打上「不可扩展」的标记**（第 276 轮）——`seal` / `freeze` / `preventExtensions`
三处都调它。

**第 333 轮起它写的是堆上那一格**（`heap.xl.md` 的 `HeapObject.Extensible`）：
原来是**往属性表里塞一个隐藏属性**（`__sealed`）——那样**运行时读不到它**，
而 `SetPropertySearched`（`props.xl.md`）在「没找到 ⇒ 新造一格」那一步**必须**问这一句
（依赖方向是「语言层认识运行时」，反过来成环）。
**顺着这个改动，`SealedMarkName` 与 `IsSealedMarkProperty` 两格连同五处「把它滤掉」都没了**
——那一整套（名字 / 判据 / 五个 `continue`）本来就是**为了绕开「它是个真属性」**，
现在没有那个属性了，所以**不是删了功能，是删了绕路**。

**重复调用仍然是幂等的**：写一个布尔字段本来就幂等。

```ts
table.Get(target.Ref).Extensible = false;
```

# method IsUnextensible:(room:RoomChecker, table:HeapTable, target:Value)=>bool

**这个对象被标记过「不可扩展」吗**（第 276 轮）——`isSealed` 与 `isFrozen` 都从它起手。

**读的就是 `MarkUnextensible` 写的那一格**（第 333 轮）：两份存储迟早会漂开
（第 276 轮那条注释写的就是这句话，这一轮把它落到了底）。

```ts
return !table.Get(target.Ref).Extensible;
```

# method DefineOwnFromDescriptor:(room:RoomChecker, table:HeapTable, target:Value, key:Value, descriptor:Value)=>void

**把一个描述符对象写进 `target` 的那一格**（第 276 轮从 `Object.defineProperty` 里抽出来，
`defineProperties` 也调它）。没有那一格就**新建一个**。

**默认三个标志全是假**（JS 的口径：少给哪个字段就是 `false`）——
所以标志位是**从零开始拼**的，不是「拿旧的改一改」。

**访问器描述符响亮地抛**：它的描述符该有 `get` / `set` 两格，
而这一层还没有那两格的门——静默把它当成一个「没有 `value()` 的数据属性」是最坏的一种
（`o.x` 会变成 `undefined`，而调用方以为它写进去了）。

**只看自有属性，而且这一句是必写的**：JS 的 `defineProperty` **不看原型链**——
所以「找到之后还要问 `Owner === target.Ref`」。少了它，
`Object.defineProperty({}, "toString", …)` 会去改**原型上**那一格，
那是把一个对象的改动**泄漏到所有对象上**（一改全改，而且不报错）。

```ts
const defineTarget = table.Get(target.Ref);
const descriptorObject = table.Get(descriptor.Ref);
// **这一格是不是数组的下标**（第 721 轮）：下标那一格的**值住在元素区**、
// **标志位住在属性表里那一份**（见 `IndexKeyShadowOf`），所以「重定义一个已有的
// 下标格」那一支改完值之后**必须把它同步回元素区**——只改属性表那一份的话
// `a[1]`（`get_index` 那条快路径）读回来还是旧值（判据 `p721a-r09` 那一族的另一半）。
// 判据与 `delete` / `in` / `GetIndex` 那几处**共用 `ArrayIndexAt`**（一处答案）。
const indexSlotAt = target.Tag === ValueTag.Array && key.Tag === ValueTag.String
  ? ArrayIndexAt(table, key) : -1;
// **读描述符的字段**：描述符是一个**普通对象字面量**，所以直接扫它的属性表
// （访问器跳过——理由与 `Object.values` 那一条相同：这一层不调 getter）。
const fieldOf = (name: string) => {
  for (let i = 0; i < descriptorObject.Props.length; i++) {
    const property = descriptorObject.Props[i];
    if (property.Kind === PropertyKind.Accessor) continue;
    // **键必须是字符串**：描述符的字段名一律是字符串——
    // 不判这一句的话，一个**符号键**会被 `Value.FromString` 读成一段越界码元（静默）。
    if (table.Get(property.Key).Tag !== ValueTag.String) continue;
    if (TextFrom(table, Value.FromString(property.Key)) === name) return property.Value;
  }
  return Value.Undefined();
};
// **「这一格字段写没写」与「它的值是不是 `undefined`」是两件事**（第 691 轮）：
// `ValidateAndApplyPropertyDescriptor` 里**没写的字段 = 不改**，
// 而 `{ value: undefined }` 是**写明要改成 `undefined`**。原来看不出这个差别，
// 于是「重定义一个已有属性」的那条路把三个标志**一律按缺省值 `false` 重算**——
// 实测 `const o = { a: 1 }; Object.defineProperty(o, "a", { value: 2 })` 之后
// `Object.keys(o)` 是**空的**（Node 给 `["a"]`）：那一格被顺手改成了**不可枚举**。
const hasField = (name: string) => {
  for (let i = 0; i < descriptorObject.Props.length; i++) {
    const property = descriptorObject.Props[i];
    if (property.Kind === PropertyKind.Accessor) continue;
    if (table.Get(property.Key).Tag !== ValueTag.String) continue;
    if (TextFrom(table, Value.FromString(property.Key)) === name) return true;
  }
  return false;
};
// **`Cannot redefine property: 名字`**（Node 那一句）：字符串键给名字，
// 符号键给 `Symbol(描述)`——**两处都要**，因为判据会读 `e.message`
//（`description` 那一格就在 `HeapSymbol` 上，不需要把 `inspect.xl.md` 引进来）。
const cannotRedefine = () => {
  if (table.Get(key.Ref).Tag === ValueTag.String) {
    return new TypeError("Cannot redefine property: " + TextFrom(table, key));
  }
  const description = table.Get(key.Ref).AsSymbol().Description;
  if (description > 0) {
    return new TypeError("Cannot redefine property: Symbol(" + TextFrom(table, Value.FromString(description)) + ")");
  }
  return new TypeError("Cannot redefine property: Symbol()");
};
// **不可扩展的对象上**新建一格也抛（第 691 轮）：JS 给
// `Cannot define property b, object is not extensible`——原来整支不查，
// 于是 `Object.preventExtensions(o)` 之后 `defineProperty(o, "b", …)` **照装**，
// 而 `push` 那一路（`array.xl.md`）早就照着同一格 `Extensible` 抛了。
const cannotDefineOn = () => {
  if (table.Get(key.Ref).Tag === ValueTag.String) {
    return new TypeError("Cannot define property " + TextFrom(table, key) + ", object is not extensible");
  }
  return new TypeError("Cannot define property, object is not extensible");
};
/** 三个标志里**写了的那些**按描述符来、**没写的那些保持原样**（第 691 轮）。 */
const mergeFlags = (old: number, wantsEnumerable: boolean, wantsWritable: boolean, wantsConfigurable: boolean) => {
  let merged = old;
  if (hasField("enumerable")) {
    if (wantsEnumerable) merged = merged | PropertyFlagEnumerable;
    else merged = merged & (PropertyFlagsAll - PropertyFlagEnumerable);
  }
  if (hasField("writable")) {
    if (wantsWritable) merged = merged | PropertyFlagWritable;
    else merged = merged & (PropertyFlagsAll - PropertyFlagWritable);
  }
  if (hasField("configurable")) {
    if (wantsConfigurable) merged = merged | PropertyFlagConfigurable;
    else merged = merged & (PropertyFlagsAll - PropertyFlagConfigurable);
  }
  return merged;
};
// **访问器那一支**（第 299 轮）：`{ get: …, set: … }` 以前**整支抛**——
// 理由写的是「这一层还没有那两格的门」，而**引擎早就有门了**：
// `Property.Accessor` 那个工厂、`ReadProperty` / `SetProperty` 两条读写的分支、
// 以及 `props.xl.md` 的 `DefineAccessor`（第 98 轮，对象字面量与类方法一直走它）。
// 缺的只是**把描述符的那两格接上去**。
//
// **`writable` 在访问器上无意义**（JS 的口径）：标志位只拼
// `enumerable` 与 `configurable` 两个——把 `writable` 也算进去是**静默**多一位
//（`Object.getOwnPropertyDescriptor(o, "g").writable` 于是会答假，而 JS 那两格**根本不在**）。
//
// **`get` / `set` 不是函数就丢掉**（JS 的口径：`{ get: 1 }` 是「没有 getter」）——
// 不是「原样存进去」：那会让 `o.g` 去调一个数字，报的是「调了一个不是东西的函数」。
const accessorGet = fieldOf("get");
const accessorSet = fieldOf("set");
const wantsEnumerable = RtToBoolean(table, fieldOf("enumerable")).AsBool();
const wantsConfigurable = RtToBoolean(table, fieldOf("configurable")).AsBool();
const wantsWritable = RtToBoolean(table, fieldOf("writable")).AsBool();
// **数组的 `length` 那一格**（第 722 轮，**普查当场红的**）：它**不住在属性表里**
// （是 `HeapArray` 的结构属性），可它**在 JS 里是一个真的自有属性**——
// `Object.defineProperty([1, 2, 3], "length", { value: 1 })` 要**把数组截到 1**、
// `{ writable: false }` 要**锁住长度**、`{ enumerable: true }` / `{ configurable: true }`
// 与访问器描述符都是 **`TypeError`**。原来这一格落到下面「普通属性」那条路：
// 造一格 `Props` 里的 `length`（值取描述符的 `value`、标志位三个全假），
// **既不截短也不加长**——而 `RequireArrayGrowable`（`array.xl.md`）正好读那一份的
// 「可写」位，于是「锁长度」那一半**碰巧是过的**（`c305-std-array-length-nonwritable`）。
//
// **一份两用**：`Props` 里那一格 `length` 就是「长度可写吗」的**唯一事实来源**
// （`RequireArrayGrowable` 与 `Object.getOwnPropertyDescriptor` 都读它）——
// 「值」那一半仍然由 `HeapArray` 自己答（`GetProperty` 的结构属性那一段）。
const lengthKeyText = key.Tag === ValueTag.String ? TextFrom(table, key) : "";
if (target.Tag === ValueTag.Array && lengthKeyText === "length") {
  // **访问器 / `enumerable: true` / `configurable: true` 三种都是 `TypeError`**
  //（JS 的那一格不可配置、也不可枚举，所以这三档一步都改不动）。
  if (accessorGet.Tag !== ValueTag.Undefined || accessorSet.Tag !== ValueTag.Undefined
      || (hasField("enumerable") && wantsEnumerable)
      || (hasField("configurable") && wantsConfigurable)) {
    throw cannotRedefine();
  }
  const lengthItems = table.Get(target.Ref).AsArray();
  const oldLength = lengthItems.GetLength();
  // **已有那一份（`{ writable: false }` 造的）**：`ValidateAndApplyPropertyDescriptor`
  // 里「不可配置」那一段照样管着它——`writable: false → true` 与「不可写时改值」都抛。
  const ownLengthFound = FindProperty(room, table, target.Ref, key);
  const hasOwnLength = ownLengthFound !== null && ownLengthFound.Owner === target.Ref;
  const ownLength = hasOwnLength ? defineTarget.Props[ownLengthFound.Index] : null;
  if (ownLength !== null && (ownLength.Flags & PropertyFlagConfigurable) === 0) {
    if (hasField("writable") && wantsWritable) throw cannotRedefine();
    if (hasField("value") && (ownLength.Flags & PropertyFlagWritable) === 0
        && !SameValue(table, Value.FromInt(oldLength), fieldOf("value"))) {
      throw cannotRedefine();
    }
  }
  let newLength = oldLength;
  if (hasField("value")) {
    // **`ToUint32` 那一档先判**（JS 的顺序：先要一个合法的数组长度，再谈写不写得下去）：
    // `-1` / `1.5` / `2 ** 32` 都是 `RangeError: Invalid array length`
    //（判据 `p721a-r32`；`xs.length = …` 那条**赋值**第 376 轮就是这么判的，这里同一句）。
    const wantedValue = fieldOf("value");
    // **先过 `ToNumber`**（第 722 轮，**普查当场红的**）：JS 那一格是
    // 「`ToUint32(v)` 与 `ToNumber(v)` 相等才算合法」，所以 `"2"` 是 2、`true` 是 1、
    // `null` 是 0、`undefined` 是 `NaN`（⇒ `RangeError`）。
    // 原来只认 `IsNumber()`，其余一律 `NaN` ⇒ `{ value: "2" }` 也抛（判据 `p722a-r11`）。
    // **`Number(文本)` 是宿主那一份**（与 `IndexKeyShadowOf` 里那一句同一个写法）：
    // 建库层本来就是宿主侧代码（`TextFrom` 那一格写着同一句话）。
    // **对象与符号仍然走 `RangeError`**：JS 会给它们过 `ToPrimitive`，而这一格的签名里
    // 没有调用通道 ⇒ **宁可响也不静默**（写在明处，台账里没有这一条）。
    let wantedDouble = NaN;
    if (wantedValue.IsNumber()) {
      wantedDouble = wantedValue.AsDouble();
    } else if (wantedValue.Tag === ValueTag.Bool) {
      wantedDouble = wantedValue.AsBool() ? 1 : 0;
    } else if (wantedValue.Tag === ValueTag.Null) {
      wantedDouble = 0;
    } else if (wantedValue.Tag === ValueTag.String) {
      wantedDouble = Number(TextFrom(table, wantedValue));
    }
    if (!(wantedDouble >= 0 && wantedDouble <= 4294967295
        && wantedDouble === Math.floor(wantedDouble))) {
      throw new RangeError("Invalid array length");
    }
    newLength = wantedDouble;
    // **削短：一格一格地删**——碰到**不可配置**的那一格就抛 `TypeError`
    //（判据 `p721a-r31`：`defineProperty(a, "2", { configurable: false })` 之后削到 1）。
    // **先判完再动手**：删到一半才发现挡路的，会留下一个「删了一半」的数组。
    for (let i = newLength; i < oldLength; i++) {
      const doomed = IndexKeyShadowOf(table, target, i);
      if (doomed !== null && (doomed.Flags & PropertyFlagConfigurable) === 0) throw cannotRedefine();
    }
  }
  if (newLength !== oldLength) {
    if (newLength > oldLength && !room(ValueCharge * (newLength - oldLength))) {
      throw new Error("out of room");
    }
    lengthItems.Truncate(newLength);
    // **削掉的那些下标格，属性表里那一份也要跟着走**：`IndexKeyShadowOf` 找的是
    // 「键是下标」的 `Props` 项，截短之后它们**就不该再被找到**（`Object.keys` /
    // 描述符 / `hasOwnProperty` 三条路一起看这一份）。
    const trimmed: Property[] = [];
    for (let i = 0; i < defineTarget.Props.length; i++) {
      const candidate = defineTarget.Props[i];
      if (table.Get(candidate.Key).Tag !== ValueTag.String) {
        trimmed.push(candidate);
        continue;
      }
      const candidateText = TextFrom(table, Value.FromString(candidate.Key));
      if (IsIndexKeyText(candidateText) && Number(candidateText) >= newLength) continue;
      trimmed.push(candidate);
    }
    defineTarget.Props = trimmed;
    table.Recount(target.Ref);
  }
  // **「长度可写吗」那一位**：只在那一位**写明了**的时候才动属性表里那一份
  //（`{ enumerable: false }` 这种「什么都没改」的描述符**不该**顺手把长度锁上——
  //  原来那一支会造一格三个标志全假的 `length`，于是 `a.length = 5` 静默失效）。
  if (hasField("writable")) {
    if (ownLength !== null) {
      ownLength.Value = Value.FromInt(newLength);
      ownLength.Flags = mergeFlags(ownLength.Flags, false, wantsWritable, false);
    } else {
      if (!room(PropertyCharge)) throw new Error("out of room");
      const lengthProperty = new Property(key.Ref, Value.FromInt(newLength));
      // **不可枚举、不可配置**（JS 里 `length` 那两格永远是假），可写与否按描述符。
      let lengthFlags = 0;
      if (wantsWritable) lengthFlags = lengthFlags + PropertyFlagWritable;
      lengthProperty.Flags = lengthFlags;
      defineTarget.Props.push(lengthProperty);
      table.Recount(target.Ref);
    }
  } else if (ownLength !== null && hasField("value")) {
    ownLength.Value = Value.FromInt(newLength);
  }
  return;
}
if (accessorGet.Tag !== ValueTag.Undefined || accessorSet.Tag !== ValueTag.Undefined) {
  const storedGetter = IsCallableValue(table, accessorGet) ? accessorGet : Value.Undefined();
  const storedSetter = IsCallableValue(table, accessorSet) ? accessorSet : Value.Undefined();
  const accessorExisting = FindProperty(room, table, target.Ref, key);
  if (accessorExisting !== null && accessorExisting.Owner === target.Ref) {
    const oldAccessor = defineTarget.Props[accessorExisting.Index];
    // **不可配置那一档**（第 691 轮）：只有「本来就是访问器、`get` / `set` 一字未动、
    // `enumerable` 也没变」才允许——其余（改成数据属性、换 getter、改可枚举）都抛。
    if ((oldAccessor.Flags & PropertyFlagConfigurable) === 0) {
      const sameGetter = oldAccessor.Kind === PropertyKind.Accessor
        && SameValue(table, oldAccessor.Getter, storedGetter)
        && SameValue(table, oldAccessor.Setter, storedSetter);
      const sameEnumerable = ((oldAccessor.Flags & PropertyFlagEnumerable) !== 0) === wantsEnumerable;
      if (!sameGetter || !sameEnumerable) throw cannotRedefine();
    }
    // **原地换那一格**（与上面数据属性那一支同一个写法）：`Kind` 一改，
    // 读写两条路立刻按访问器走（`ReadProperty` 调 getter、`SetProperty` 调 setter）。
    oldAccessor.Kind = PropertyKind.Accessor;
    oldAccessor.Getter = storedGetter;
    oldAccessor.Setter = storedSetter;
    oldAccessor.Flags = mergeFlags(oldAccessor.Flags, wantsEnumerable, false, wantsConfigurable);
    return;
  }
  if (!room(PropertyCharge)) throw new Error("out of room");
  if (!defineTarget.Extensible) throw cannotDefineOn();
  const createdAccessor = Property.Accessor(key.Ref, storedGetter, storedSetter);
  let accessorFlags = 0;
  if (wantsEnumerable) accessorFlags = accessorFlags + PropertyFlagEnumerable;
  if (wantsConfigurable) accessorFlags = accessorFlags + PropertyFlagConfigurable;
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
  const wasConfigurable = (property.Flags & PropertyFlagConfigurable) !== 0;
  const wasWritable = (property.Flags & PropertyFlagWritable) !== 0;
  const wasEnumerable = (property.Flags & PropertyFlagEnumerable) !== 0;
  // **「描述符里没写」= 要的就是原值**（第 691 轮）：不做这一步，
  // `Object.freeze(o)` 之后 `Object.defineProperty(o, "a", { value: 1 })`（**同值**）会
  // 因为 `enumerable` 缺省成假而被判成「改了可枚举」⇒ 该静默的那一档抛了
  //（判据 `object-defineproperty-redefine` 的 frozen 那一段）。
  const wantsEnumerableNow = hasField("enumerable") ? wantsEnumerable : wasEnumerable;
  const wantsWritableNow = hasField("writable") ? wantsWritable : wasWritable;
  const wantsConfigurableNow = hasField("configurable") ? wantsConfigurable : wasConfigurable;
  // **不可配置 = `ValidateAndApplyPropertyDescriptor` 里那一整段**（第 691 轮）：
  // 能改的只有「`writable` 由真到假」与「同值改写」；改 `configurable` / `enumerable`、
  // 把数据属性换成访问器（这里走的是数据那一支）、或者在一个**不可写**的格子上换值，
  // 在 JS 里都是 `TypeError`——原来照写、一句都不报（判据 `object-defineproperty-redefine`）。
  if (!wasConfigurable) {
    const keepsShape = !wantsConfigurableNow && wantsEnumerableNow === wasEnumerable;
    const changesWritable = wantsWritableNow !== wasWritable;
    const changesValue = hasField("value") && !SameValue(table, property.Value, fieldOf("value"));
    if (!keepsShape || (changesWritable && wantsWritableNow)
        || (property.Kind === PropertyKind.Accessor)
        || (!wasWritable && changesValue)) {
      throw cannotRedefine();
    }
  }
  if (property.Kind === PropertyKind.Accessor) {
    // **访问器 → 数据**（可配置那一档才走得到这里）：`Get` / `Set` 两格清掉，
    // 值取描述符里的 `value`（没写就是 `undefined`——JS 转换那一支正是这么写的）。
    property.Kind = PropertyKind.Data;
    property.Value = fieldOf("value");
    property.Getter = Value.Undefined();
    property.Setter = Value.Undefined();
  } else if (hasField("value")) {
    // **没写 `value` 就不动那一格**（原来看不出「没写」与「写成 `undefined`」的差别）。
    property.Value = fieldOf("value");
  }
  // **下标那一格：值同步回元素区**（第 721 轮，见 `indexSlotAt` 那一段的账）。
  // **洞与越界不算**：那一格在元素区根本不在（`Object.defineProperty` 的定义
  // 已经由上面「新造一格」那一支负责把 `length` 顶上去）。
  if (indexSlotAt >= 0 && indexSlotAt < table.Get(target.Ref).AsArray().GetLength()
      && property.Kind === PropertyKind.Data) {
    if (!room(ValueCharge)) throw new Error("out of room");
    table.Get(target.Ref).AsArray().SetAt(indexSlotAt, property.Value);
    table.Recount(target.Ref);
  }
  property.Flags = mergeFlags(property.Flags, wantsEnumerable, wantsWritable, wantsConfigurable);
  return;
}
if (!room(PropertyCharge)) throw new Error("out of room");
if (!defineTarget.Extensible) throw cannotDefineOn();
// **数组元素是另一摞**（第 706 轮，**普查当场红的**）：`[[DefineOwnProperty]]` 在数组上
// 走的是**元素那一趟**（`OrdinaryDefineOwnProperty` 里 `IsArrayIndex` 那一支）：
// `Object.defineProperty([], 0, { value: 5 })` 在 JS 里给 `[5]`（**`length` 跟着长到 1**），
// 而这里原来把它当**普通属性**写进 `Props` ⇒ `a.length` 还是 `0`、`a[0]` 是 `undefined`、
// `JSON.stringify(a)` 给 `[]`（判据 `p706c-x08`：node 给 `[5]`、本仓给 `[]`）。
// **`Object.getOwnPropertyNames` 也看得出这个差别**（Node 给 `0|length`，本仓给 `length|0`）。
//
// **判据与 `delete` / `in` 那几处共用 `ArrayIndexAt`**（前导零不算下标、超 `i32` 不算）——
// 「`"0"` 是不是下标」这件事只有它有答案，另写一份就是第二处会漂的答案。
//
// **只有「可枚举」那一档才落进元素区**（第 706 轮，**本轮第二个当场红**）：
// 元素区**没有逐格的标志位**（`HeapArray` 只有 `Elements` 与 `Holes` 两摞宿主数组），
// 而 `Object.keys` 的两条路在那儿合流——`IndexKeyPositions` 把**在的每一格**都算成下标键，
// 于是 `Object.defineProperty([], 0, { value: 5 })`（**缺省 `enumerable: false`**）之后
// `Object.keys` 给 `["0"]`，而 JS 给 `[]`（判据 `p706e-z03`：`JSON.stringify` 给 `[5]`、
// `a.length` 给 `1`**都对**，错的只有「算不算可枚举键」）。
//
// **两摞都要写**（这是这一轮最后定下来的形状）：
//   · **元素区那一格一定要写**——下标一旦被定义，**`length` 就要跟着长**
//     （`Object.defineProperty([], 3, { value: 5 })` 之后 JS 的 `length` 是 `4`），
//     只写属性表那一摞的话 `length` 不动（**同一次普查里红的两条是同一件事的两半**）；
//   · **不可枚举的那一档再进 `Props` 一份**——元素区没有标志位，标志位只能住那里。
//     于是「那一格在不在」由两摞一起答（`in` / `hasOwnProperty` / `delete` 早就是两摞一起看），
//     而「算不算可枚举键」由 `IndexKeyShadowed` 那一句把元素区那一格筛掉。
const wantsElementSlot = target.Tag === ValueTag.Array && key.Tag === ValueTag.String;
const elementAt = wantsElementSlot ? ArrayIndexAt(table, key) : -1;
if (elementAt >= 0) {
  // **这一格该不该按「元素」写**：三档，合起来才是 `ValidateAndApplyPropertyDescriptor`
  // 在数组下标上的落点——
  //   · 描述符**写明** `enumerable` ⇒ 按它（真 = 元素区，假 = 属性表那一格标志位）；
  //   · **没写** ⇒ **沿用那一格原来的枚举性**（`Object.defineProperty(xs, "1", { value: 9 })`
  //     在 JS 里**只改值**：`xs[1]` 给 `9`、`Object.keys(xs)` 还是 `["0","1","2"]`。
  //     判据 `probe698-c09` 量的就是它——**原来只认「写明了才落元素区」，
  //     于是没写的那一档把元素改成不可枚举**，`Object.keys` 少了 `"1"`）；
  //   · 原来**不在**元素区（洞 / 越界）而描述符又没写 `enumerable` ⇒ 缺省**不可枚举**
  //     （JS 的口径），所以它只进属性表。
  const items = table.Get(target.Ref).AsArray();
  const wasElement = elementAt < items.GetLength() && !items.IsHole(elementAt);
  // **三个标志各自一档**（第 706 轮只分了 `enumerable`，第 721 轮把三格一起分）：
  // 描述符里**写明的**按它、**没写的**沿用那一格原来的性质——
  // 而「下标那一格原来的性质」就是元素的常态：**可写 + 可枚举 + 可配置**
  //（JS 里 `const a = [1]; Object.defineProperty(a, "0", { enumerable: false })`
  // 之后 `a[0] = 5` 照样写下去、`delete a[0]` 照样删得掉）。
  // 原来只算 `enumerable`、另外两位一律按描述符的缺省（假）——
  // 于是 `{ enumerable: false }` 顺手把那一格变成**不可写 + 不可配置**（静默错值，
  // 判据 `p721a-r02` / `p721a-r09` / `p721a-r10`）。
  const slotEnumerable = hasField("enumerable") ? wantsEnumerable : wasElement;
  const slotWritable = hasField("writable") ? wantsWritable : wasElement;
  const slotConfigurable = hasField("configurable") ? wantsConfigurable : wasElement;
  // **没写 `value` 就不动值**（第 721 轮，**普查当场红的**）：
  // `Object.defineProperty(a, "1", { enumerable: false })` 在 JS 里**只改枚举性**，
  // 而这里原来无条件写 `fieldOf("value")`（没写就是 `undefined`）⇒ 那一格被抹掉
  //（判据 `p721a-r02`：node 给 `9`、本仓给 `undefined`，`JSON.stringify` 跟着给 `null`）。
  const slotValue = hasField("value") ? fieldOf("value")
    : (wasElement ? items.GetAt(elementAt) : Value.Undefined());
  // **元素区那一格一定要写**——下标一旦被定义，**`length` 就要跟着长**
  //（`Object.defineProperty([], 3, { value: 5 })` 之后 JS 的 `length` 是 `4`），
  // 只写属性表那一摞的话 `length` 不动（**同一次普查里红的两条是同一件事的两半**）。
  if (!room(ValueCharge)) throw new Error("out of room");
  items.SetAt(elementAt, slotValue);
  table.Recount(target.Ref);
  // **三项都是元素的常态** ⇒ 元素区那一格就是全部，不必再留标志位那一份
  //（绝大多数 `defineProperty` 落在这一档——多留一份会让 `IndexKeyShadowOf` 天天白找）。
  if (slotEnumerable && slotWritable && slotConfigurable) return;
  // **否则在 `Props` 里留一份**（标志位的唯一落点）：不可枚举、不可写、不可配置
  // 三位里只要有一位不是元素的常态，就要有这一份——`Object.keys`（`IndexKeyShadowed`）、
  // 描述符那一趟、`a[i] = v`（`SetIndex`）与 `delete a[i]`（`DeleteProperty`）四处都问它。
  const slotCreated = new Property(key.Ref, slotValue);
  let slotFlags = 0;
  if (slotEnumerable) slotFlags = slotFlags + PropertyFlagEnumerable;
  if (slotWritable) slotFlags = slotFlags + PropertyFlagWritable;
  if (slotConfigurable) slotFlags = slotFlags + PropertyFlagConfigurable;
  slotCreated.Flags = slotFlags;
  defineTarget.Props.push(slotCreated);
  table.Recount(target.Ref);
  return;
}
// **不可枚举那一档落到下面的 `Props`**：那里**有标志位**，于是 `Object.keys` 看不见它、
// `getOwnPropertyDescriptor` 读得到真标志（那一支最后就是「自有属性表」那一趟）、
// `in` / `delete` 也照样认（它们两条路一起看）。
// **代价写在明处**：那一格于是**住在 `Props` 里**，与元素区不在同一摞——
// 从脚本那一侧看不出来（三条枚举路都两摞一起看），
// 但「元素区要不要有逐格标志位」是另一件更大的事（它牵动 `HeapArray` 的形状）。
// **访问器那一支不走这里**（它在上面就返回了）：JS 里给数组下标定义一个访问器
// 会在那一格上造属性、**不动 `length`**，所以「下标 + 访问器」两条路的落点不同。
const created = new Property(key.Ref, fieldOf("value"));
created.Flags = flags;
defineTarget.Props.push(created);
table.Recount(target.Ref);
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

**毫秒 → `[年, 月, 日]`**（月 **0 起**、日 **1 起**，与 `getUTCMonth` / `getUTCDate` 一致）。

用 **Howard Hinnant 的 `civil_from_days`**（无表、无时区、纯整数）——
这一层**不碰时区数据**（范围决定：`getUTC*` 一族，本地时区）。

**这里每一步的除数都是非负的**（`z` 加了 `719468` 之后必为正），
所以「向下取整」与「向零截断」一致——用 `Math.floor` 是安全的。

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

**毫秒 → `[时, 分, 秒, 毫秒]`**（第 280 轮）——`DateParts` 的另一半，四个都是 `0` 起的整数。

**判据是 `Math.floor(ms / 86400000)`**（**向下取整**，不是截断）：
于是「当天的毫秒」落在 `[0, 86400000)`（**1970 年以前也对**——
`new Date(-1)` 该给 `23:59:59.999`，写成截断会整整差一天）。

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

**`[年, 月(0 起), 日]` → 距 1970-01-01 的天数**（第 280 轮）——
`DateParts` 的**逆**，同一个作者（Howard Hinnant 的 `days_from_civil`）、同一份推导。

**为什么不能只做正向**：`Date.UTC`、七个 `setUTC*`、以及 `new Date("2021-03-04")`
那一类**都是这个方向**——而 `toISOString` 那一半只走正向。
**合成一份逆变换**比「先算正向、再二分搜」既短又不会错。

**除法一律 `Math.floor`**：`era` 在**负年份**上是负的（`year = -1` 该落在 `era = -1`）——
写成截断会把公元前后的日期整整挪一个 400 年的纪元（**静默错值**，
而它只在「年份 ≤ 0」时才现形，日常判据量不到——所以这一句写在这里当路障）。
`yoe` 在 `floor` 之后必落在 `[0, 399]`，所以下面那三处 `Math.floor` 对非负数也对。

```ts
let y = year;
// **一月与二月算作上一年的第 13 / 14 月**（这就是这条推导的全部秘密）。
if (month <= 1) y = y - 1;
const era = Math.floor(y / 400);
const yoe = y - era * 400;
const mp = month > 1 ? month - 2 : month + 10;
const doy = Math.floor((153 * mp + 2) / 5) + day - 1;
const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
return era * 146097 + doe - 719468;
```

# method DateMakeMs:(year:int, month:int, day:int, hours:int, minutes:int, seconds:int, millis:int)=>float

**七个部分 → 毫秒**（第 280 轮）——`DateParts` + `DateClockParts` 的**合并逆**。

**一天之内的部分直接乘**（不必规整）：JS 的 `setUTCHours(1, 2, 3, 4)` 就是
「时×3600000 + 分×60000 + 秒×1000 + 毫秒」，而**月份与日子可以越界**
（`setUTCMonth(13)` 是下一年的二月）——那一条**由 `DateDaysFromCivil` 自己接住**
（它对任意整数月都成立：`mp` 只是取模到 `[0, 11]` 的一个下标，
而 `y` 那一步已经按 `month <= 1` 分过）。**不要在这里先规整一遍**
（规整一次就是第二份「月份怎么算」的答案）。

**`NaN` 那一档由哨兵认**（第 702 轮）：调用方（`new Date(…)` / 七个 setter）拿到的
七个整数可能是 `IntOfNumberStrict` 给的 **`-2147483648`**——那表示这一步的 `ToNumber`
得到的是 `NaN`（`new Date(2020, undefined)` / `setUTCMonth({})`），而 JS 的口径是
「任何一格 `NaN` ⇒ 整条 `NaN`」。**认在入口一处**：七个调用点一个都不用改
（`DateDaysFromCivil` 拿到哨兵会算出一个**看似合理**的日子——那是**静默错值**，
所以这一句必须在这里、且必须在算之前）。

```ts
if (year === -2147483648 || month === -2147483648 || day === -2147483648
  || hours === -2147483648 || minutes === -2147483648
  || seconds === -2147483648 || millis === -2147483648) return NaN;
return DateDaysFromCivil(year, month, day) * 86400000
  + hours * 3600000 + minutes * 60000 + seconds * 1000 + millis;
```

# method DateUtcText:(ms:float)=>string

**`toUTCString` 那一段文本**（第 702 轮）——`Thu, 02 Jan 2020 03:04:05 GMT`。

**数字全部来自 `DateIsoText`**（不写第二份日历算术）：它给的是
`YYYY-MM-DDTHH:mm:ss.sssZ`，这里只是**按位置切开**再排列——位置固定，
所以 `slice` 是安全的（那一段文本是本文件自己拼出来的，不是用户输入）。

**星期与月份是两张常数表**：UTC 那一种拼法在规范里是**固定文本**，与区域表无关
（`toLocaleString` 那一种才要区域表，那一格没做）。

```ts
const iso = DateIsoText(ms);
// `YYYY-MM-DDTHH:mm:ss.sssZ` 的位置：0..3 年、5..6 月、8..9 日、11..12 时、
// 14..15 分、17..18 秒，末尾那个 `Z` 换成 `GMT`。
const weeks = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthIndex = NumberFromHostText(iso.slice(5, 7)) - 1;
// **星期几从「天数对 7 取模」算**（与 `getUTCDay` 那一段同一条口径）：
// 直接读那段 ISO 文本里的日期会绕远，而这里已经在手边。
const dayNumber = Math.floor(ms / 86400000);
const weekIndex = (((dayNumber + 4) % 7) + 7) % 7;
return weeks[weekIndex] + ", " + iso.slice(8, 10) + " " + months[monthIndex]
  + " " + iso.slice(0, 4) + " " + iso.slice(11, 19) + " GMT";
```

# method DateParseUnits:(units:Array<int>)=>float

**ISO 8601 的一个最小子集**（第 293 轮）——`Date.parse` 与 `new Date(字符串)` 的**同一条**。

**收的形状**：`YYYY-MM-DD`、`YYYY-MM-DDTHH:mm`、`…:ss`、`…:ss.sss`，
后面可跟 `Z` / `±HH:mm` / 什么都不跟（日期与时间之间收 `T` / `t` / 一个空格）。

**其余一律给 `NaN`**（**不猜**）：`"Jan 1 2020"`、`"2020/01/02"`、`"20200102"`
这些要么是本地化的、要么有歧义——编一个答案就是**静默错值**，
而 JS 自己对不合规的文本给的正是 `NaN`（所以「不认就给 NaN」**与 JS 一致**，
不是「做不到就先给个错的」）。

**三处最容易写错的地方**（每一处都有一条判据或一句 JS 的明文在背后）：
- **`.5` 是 500 不是 5**（不足三位要**按位补零**）、**`.1234` 是 123**（多于三位**只取前三位**）——
  两档方向**相反**，写成一处就会有一半错；
- **偏移是「减去」**（`+08:00` 的时刻比 UTC **早** 8 小时 ⇒ 毫秒数**小** 8 小时）；
- **没有偏移的时间串按 UTC 算**（JS 按**本地**算）——与上面 `DateCtor` 那段同一个口径
  （本仓的本地时间就是 UTC），而**带偏移**的那些形状两边**完全一致**。

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

**左补零到 `width` 位**（第 280 轮）——ISO 那一串里要用五次。

**负数带负号**（`-1` 补到两位是 `-1` 不是 `0-1`）——所以符号要先摘出来。
日期的年份在 ISO 里**另有规矩**（扩展年份带 `+`），那一档下面单独判。

```ts
let text = "" + value;
if (value < 0) text = text.substring(1);
while (text.length < width) text = "0" + text;
return value < 0 ? "-" + text : text;
```

# method DateIsoText:(ms:float)=>string

**毫秒 → ISO 8601 文本**（第 280 轮）——`Date.prototype.toISOString` 的正身。

**全部拼自那两个纯整数公式**（`DateParts` + `DateClockParts`），
**不碰宿主日期库**——与 `DateParts` 同一条理由（跨目标抄得走，
`dates` 与 `times` 这些宿主对象在 C++ 那边不存在）。

**年份的两种形态**：`0..9999` 是四位数字（`1970`）；
**超出这个范围时 JS 给扩展形态**（`+010000-01-01T00:00:00.000Z`、负年份带 `-`）。
这一层**只做四位那一档**，其余**响亮地抛**——静默补出一串看着像日期的东西是最坏的一种
（判据里量不到那一档，所以写在明处）。

```ts
const parts = DateParts(ms);
const clock = DateClockParts(ms);
if (parts[0] < 0 || parts[0] > 9999) {
  throw new Error("unimplemented: toISOString outside 0000..9999 needs the expanded year form");
}
let text = PadNumber(parts[0], 4) + "-" + PadNumber(parts[1] + 1, 2) + "-" + PadNumber(parts[2], 2);
text = text + "T" + PadNumber(clock[0], 2) + ":" + PadNumber(clock[1], 2) + ":" + PadNumber(clock[2], 2);
// **毫秒是三位**（`+ "." + 4` 该给 `004`，不是 `4`）。
return text + "." + PadNumber(clock[3], 3) + "Z";
```

# method DateTextOf:(ms:float)=>string

**毫秒 → `Date.prototype.toString` 的文本**（第 616 轮）——本仓**按 UTC 渲染**。

**为什么按 UTC**：JS 这条印的是**本地时区**（`Thu Jan 01 1970 08:00:00 GMT+0800 (… Time)`，
随机器变），而本仓**没有时区库**、本地那一族 getter 本来就当 UTC 用
（`getFullYear` = `getUTCFullYear`）——**同一件事只能有一个口径**：
`String(d)` 与 `d.getHours()` 必须自洽，否则同一份日期在同一个程序里有两套读法。
**已知差异写在明处**：与 Node 的字符串**逐字节不同**（差在时区那一截，Node 在 UTC 下与这里一致）。

年份只做 `0000..9999`，其余响亮地抛（与 `DateIsoText` 同一条）。

```ts
const parts = DateParts(ms);
const clock = DateClockParts(ms);
if (parts[0] < 0 || parts[0] > 9999) {
  throw new Error("unimplemented: toString outside 0000..9999 needs the expanded year form");
}
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// **星期几与 `getUTCDay` 同一份判据**（从纪元起的天数对 7 取模，1970-01-01 是周四）。
const dayNumber = Math.floor(ms / 86400000);
const weekday = weekdays[(((dayNumber + 4) % 7) + 7) % 7];
let text = weekday + " " + months[parts[1]] + " " + PadNumber(parts[2], 2) + " " + PadNumber(parts[0], 4);
text = text + " " + PadNumber(clock[0], 2) + ":" + PadNumber(clock[1], 2) + ":" + PadNumber(clock[2], 2);
return text + " GMT+0000 (Coordinated Universal Time)";
```

# method QuoteJson:(table:HeapTable, value:Value)=>string

JSON 字符串字面量（**带上引号与转义**）。

**只转义必要的那些**：引号、反斜杠、`\n` / `\r` / `\t`，以及其它控制字符走 `\u00XX`。
**不转义非 ASCII**：`JSON.stringify` 输出的是可读的 UTF-16 文本（判据正是拿它跟 Node 比）。

**孤立代理要转义**（第 297 轮）：ES2019 那条「well-formed JSON.stringify」规定
**落单的代理码元写成 `\uXXXX`**（合起来的代理对**照旧原样输出**，因为那是合法的 UTF-16）。
**它原来原样吐出去**：`JSON.stringify("\uD800")` 于是给了一串**不是合法 UTF-16 的文本**——
拷到别处就变成一个替换字符（**静默**：本仓自己打出来看着「就是那个字符」，
而 Node 打的是 `"\ud800"`）。**判据是第 297 轮量的**（原来一条都没有）。

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
    // **前导代理：后面跟着后随代理才算一对**（那样两个都原样输出）——
    // 否则它是**落单**的，按 well-formed 那条规矩转义。
    const follower = i + 1 < units.length ? units[i + 1] : -1;
    if (follower >= 56320 && follower <= 57343) {
      text = text + String.fromCharCode(unit) + String.fromCharCode(follower);
      i = i + 1;
    } else {
      text = text + "\\u" + unit.toString(16).padStart(4, "0");
    }
  } else if (unit >= 56320 && unit <= 57343) {
    // **后随代理走到这里就是落单的**（前面那一格没把它带走）。
    text = text + "\\u" + unit.toString(16).padStart(4, "0");
  } else text = text + String.fromCharCode(unit);
}
return text + "\"";
```

# method JsonMemberValue:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, anchor:int, depth:int, owner:Value, property:any)=>Value | null

**一格该序列化的值**（第 695 轮）。

数据属性直接给 `property.Value`；**访问器要现读**（`GetProperty` 走**真的 `call`** 通道，
与 `Object.values` / `entries` 第 655 轮那一处**同一条**口径）。

**没有通道时给 `null`**（调用方 `continue` 跳过）：宁可少一格，也不能凭空给一个
`undefined`——那是**静默错值**，而「本来就没做」这件事写在 `JsonText` 那一段里。

**读到的值要当场锚住**（`JsonAnchor`）：它与 `toJSON` 的产物**是同一处坎**——
下面那一趟递归里还会再调脚本（脚本里会分配），只有这一个宿主变量指着的值会被收走。

```ts
if (property.Kind !== PropertyKind.Accessor) {
  return property.Value;
}
if (call === null) {
  return null;
}
if (!room(PropertyCharge)) throw new Error("out of room");
const read = GetProperty(room, call, protos, table, owner, Value.FromString(property.Key));
JsonAnchor(room, table, anchor, depth, read);
return read;
```

# method JsonText:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, anchor:int, replacer:Value, value:Value, key:Value, parent:Value, depth:int, insideArray:bool, indent:string)=>string | null

**序列化一个值**；返回 `null` 表示「这个值没有 JSON 形态」（于是**键整个省略**）。

**第 294 轮多了六格**（`room` / `call` / `protos` / `anchor` / `replacer` / `parent`）——
为的是接上 **`toJSON`** 与 **replacer**（见下面那两支）。
**`anchor` 是「锚」那个数组**（由 `JsonStringify` 造好、挂在 `protos.WellKnownSymbols` 上）：
这一趟里那些**只有宿主变量指着**的中间值就存在它身上（理由写在 `JsonAnchor` 那一支里）。
**`key` 是这一格在父容器里的键**、**`parent` 是那个容器本身**——
`toJSON(键)` 要前者、`replacer.call(parent, 键, 值)` 要后者。

**三种「没有形态」要分开处理**（JS 就是这么定的）：

- 在**对象**里：函数 / `undefined` → 整个键省略（返回 `null`）；
- 在**数组**里：同样这些东西 → 变成 `null`（**位置不能少**）；
- 顶层：`JSON.stringify(undefined)` → 结果是 `undefined`（不是字符串 `"undefined"`）。

**非整数数值抛**：`1.0` 该写成 `"1"` 还是 `"1.0"`、`0.1+0.2` 那一串尾巴怎么写，
是**规范级的决定**（与 `ToString` 那一处同一条理由）。**不猜一个然后让它看起来对**。

**访问器现读**（第 695 轮改的口径）：原来一律**跳过**（写的是「读它要重入 `call`，
而这里是个纯查询」）——可那是**静默错值**：`JSON.stringify({ get a() { return 1; } })`
本仓给 `{}`、Node 给 `{"a":1}`。`Object.values` / `entries` 第 655 轮就已经接上了
「有 `call` 通道就现读」这条可选服务的纪律，`JsonText` 这一趟照同一条走
（见 `JsonMemberValue`）：**没有通道时仍旧跳过**，有通道时**读真的那一格**。

```ts
if (depth > MaxJsonDepth) {
  // **抛的是 `TypeError`**（第 305 轮改的）：JS 里 `JSON.stringify(循环引用)` 抛
  // **`TypeError`**（"Converting circular structure to JSON"），本仓这一句同时也是
  // **深度上限**那一格（"a cycle looks the same"）——所以它是**同一个出口**。
  // 原来抛的是**裸 `Error`** ⇒ 脚本里 `e.name` 给 `"Error"`（Node 给 `"TypeError"`）。
  // 与 `string.xl.md` 的 `repeat(-1)`（第 288 轮）、`fromCodePoint` 越界（第 275 轮）
  // **同一条口径**：内建抛**宿主的那一族**，`install.xl.md` 那一支按类翻族
  //（它写着「只映射能证明的两族」）——这里一个字都不用改。
  throw new TypeError("this structure is too deep to serialize (a cycle looks the same)");
}
// **`toJSON`**（第 294 轮）：JS 在序列化**每一个**值之前先问它有没有 `toJSON`
//（`SerializeJSONProperty` 的第一步）——`Date.prototype.toJSON` 就是靠它生效的
//（第 280 轮把那一格装上了，可 `JSON.stringify({ d })` 一直给 `{"__t":0}`：
// **没有人调它**——而 `JsonText` 从第 122 轮起就是个**纯查询**，刻意不调脚本）。
//
// **它必须排在最前面**（在 `Array` / `Object` 那两条分支之前）：JS 是**先换值**、
// 再按**换过之后**的值决定走哪一支——`toJSON` 交出一个字符串就是字符串（不再是对象）。
//
// **只在对象上问**（JS 的口径：原始值身上没有 `toJSON` 那一格）——
// 对原始值多问一趟是热路径上的白花，而且读 `null` 的属性会抛。
//
// **键要真的递进去**（`toJSON(键)`）：`{ toJSON(k) { return k } }` 是合法的，
// 递一个空串就是**静默错值**——与「`Date` 那一格用不上」是两回事
//（那一格是**用不上**，这一格是**用得上却给错了**）。
//
// **产物要锚住**（与第 279 轮 `JSON.parse` 的 reviver 是**同一处坎**）：
// 它**只有这一个宿主变量指着**，而下面那一趟递归里还会再调脚本（脚本里会分配）——
// 不锚的话某一轮之后它可能已经被收走（症状是「拿到死句柄」）。
// **锚在按深度分格的那个数组上**（见 `JsonAnchor` 那一段：一层一格，
// 所以内层再调一次 `toJSON` 也挤不掉外层正在遍历的那个容器）。
//
// **两支都只换值、不递归**：换完继续往下走同一趟分派——
// JS 就是「换过之后再按**换过之后**的值分派」，写成「换完递归一遍」会让 replacer
// **对同一格跑两次**（`(k, v) => k === "b" ? undefined : v` 于是把 `b` 又放回去）。
if (value.IsObject() && call !== null) {
  const toJsonKey = Value.FromString(table.CreateString(Units("toJSON")));
  const toJson = GetProperty(room, call, protos, table, value, toJsonKey);
  if (IsCallableValue(table, toJson)) {
    value = call(toJson, value, [key]);
    JsonAnchor(room, table, anchor, depth, value);
  }
}
// **replacer**（第 294 轮）：JS 的 `SerializeJSONProperty` 是**三步**——
// 取值、**`toJSON`**、**replacer**——次序是语义（`toJSON` 先、replacer 后）。
// **第二格实参是函数时**它就是这一步（是数组时它改成「键的白名单」，见 `Object` 那一支）。
//
// **`this` 是那个容器**（JS 的口径）：`replacer.call(容器, 键, 值)`——
// 所以它要 `parent` 那一格。**根那一格的 `parent` 是 `undefined`**
// （JS 给的是一个 `{"": 值}` 的临时对象）——**写在明处**：
// 用 `this` 的 replacer 在**根**这一格上与 JS 不同（嵌套那几格是对的）。
//
// **返回 `undefined` 就是「这一格没有」**：后面按类型分派时它落进
// 「对象里省略 / 数组里变 `null`」那条老规矩（与 `JSON.stringify(undefined)` 同一条）。
if (call !== null && IsCallableValue(table, replacer)) {
  value = call(replacer, parent, [key, value]);
  JsonAnchor(room, table, anchor, depth, value);
}
// **包装对象要脱箱**（第 310 轮）——`SerializeJSONProperty` 的**第三步**
//（`if Type(value) is Object` 那一段：`[[NumberData]]` / `[[StringData]]` / `[[BooleanData]]`
// 三种内部槽都要换回**它们里面的原始值**）。
// 少了它：`JSON.stringify(new Number(5))` 给 `"{}"`（Node 给 `"5"`）、
// `JSON.stringify(new String("ab"))` 给 `"{}"`（Node 给 `'"ab"'`）——**静默错值**
//（判据 `c291-global-object-wrappers` 那一族量的就是它）。
// **位置在三步的最末**（`toJSON` 之后、replacer 之后）：JS 就是「取值 → `toJSON` → replacer
// → 再按**换过之后**的值分派」，脱箱是**分派之前的最后一步**。
// **脱箱只有一处**（`UnwrapBox`，与 `valueOf` 那条路**同一份**）——
// 不是包装对象它就原样返回（`{}` 与普通对象一个字节都不变）。
value = UnwrapBox(table, value);
if (value.Tag === ValueTag.Null) return "null";
if (value.Tag === ValueTag.Undefined) return insideArray ? "null" : null;

if (value.Tag === ValueTag.Bool) return value.AsBool() ? "true" : "false";
if (value.Tag === ValueTag.Int32) return value.Int.toString();
if (value.Tag === ValueTag.Float64) {
  // **浮点现在有文本形态了**（第 124 轮）：`String(x)` 的最短往返十进制——它与
  // JS 的 `JSON.stringify` 用的是**同一个**数字格式化（`JSON.stringify(1.5)` 是 `"1.5"`）。
  // 以前这里抛「格式化是规范级决定」——那个决定现在做了，做在**语言层**
  //（`text.xl.md` 的 `ValueUnits`，理由写在那一块的开头）。
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
  // **缩进那一档**（第 192 轮）：`JSON.stringify(x, null, 2)` 要的是**多行**形状——
  // 原来第三、四个实参被**整段忽略**，于是永远给紧凑形状（**静默**与 Node 不同）。
  // **空数组照旧是 `[]`**（JS 的口径：缩进不作用在空容器上）。
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
  // **replacer 是数组时：它就是「键的白名单」**（第 294 轮）——
  // JS 的 `PropertyList`：**只收列出来的那几个键**，而且**按数组的顺序**
  //（不是按对象自己的顺序——`JSON.stringify({b:1,a:2}, ["a","b"])` 给 `{"a":2,"b":1}`）。
  // **它只管对象**：数组那一支不看白名单（JS 的口径：数组的键永远是下标），
  // 所以这一支排在 `Array` 那条**后面**、只写在 `Object` 里面。
  // **符号键与别的类型要排掉**：JS 收的是「字符串与数字」（数字按 `ToString` 折成键），
  // 其余（符号 / 对象 / 函数）**整个条目丢掉**——不是「当字符串硬转」。
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
      if (!property.IsEnumerable()) continue;
      const whiteValue = JsonMemberValue(room, call, protos, table, anchor, depth, value, property);
      if (whiteValue === null) continue;
      const rendered = JsonText(room, call, protos, table, anchor, replacer, whiteValue,
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
  // **次序**（第 296 轮）：三趟遍历走**同一张下标表**——见 `JsonKeyOrder` 那一段。
  // **白名单那一支不走它**（那一支按**数组给的顺序**，与对象自己的次序无关）。
  const order = JsonKeyOrder(table, value.Ref);
  // **缩进那一档**（同上）：先按「有没有可渲染的键」判一次——空对象照旧是 `{}`。
  let renderedCount = 0;
  if (indent !== "") {
    for (let oi = 0; oi < order.length; oi++) {
      const probe = item.Props[order[oi]];
      if (table.Get(probe.Key).Tag !== ValueTag.String) continue;
      if (!probe.IsEnumerable()) continue;
      const probeValue = JsonMemberValue(room, call, protos, table, anchor, depth, value, probe);
      if (probeValue === null) continue;
      if (JsonText(room, call, protos, table, anchor, replacer, probeValue,
        Value.FromString(probe.Key), value, depth + 1, false, indent) === null) continue;
      renderedCount = renderedCount + 1;
    }
    if (renderedCount > 0) {
      let text = "{\n";
      let firstIndented = true;
      for (let oi = 0; oi < order.length; oi++) {
        const property = item.Props[order[oi]];
        if (table.Get(property.Key).Tag !== ValueTag.String) continue;
        if (!property.IsEnumerable()) continue;
        const memberValue = JsonMemberValue(room, call, protos, table, anchor, depth, value, property);
        if (memberValue === null) continue;
        const renderedHere = JsonText(room, call, protos, table, anchor, replacer, memberValue,
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
    // **不可枚举的键不进 JSON**（第 182 轮修）：`JSON.stringify` 只看**可枚举**的自有属性
    // （与 `Object.keys` 同一条口径）——`Object.defineProperty(o, "x", { value: 1 })`
    // 默认不可枚举，所以它**不该**出现在 JSON 里（实测判据当场量到这一格）。
    if (!property.IsEnumerable()) continue;
    // **访问器现读**（第 695 轮）：见 `JsonMemberValue` 那一段——原来这里是
    // `PropertyKind.Accessor → continue`（**静默错值**：`JSON.stringify({ get a() { return 1; } })`
    // 给 `{}`，Node 给 `{"a":1}`）。
    const memberValue = JsonMemberValue(room, call, protos, table, anchor, depth, value, property);
    if (memberValue === null) continue;
    const rendered = JsonText(room, call, protos, table, anchor, replacer, memberValue,
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

**把「只有宿主变量指着」的那一格存进锚里**（第 294 轮）。

**锚是一个数组**（`JsonStringify` 造好、挂在 `protos.WellKnownSymbols` 上的那一个）——
**按递归深度存**：`depth` 那一格给「这一层正在序列化的值」。

**为什么按深度分格、不是一个格子来回换**：内层**可能再调一次 `toJSON` / replacer**
（合法），一层一层叠上去——共用一个格子的话，内层会把**外层正在遍历的那个容器**挤掉，
而外层接着 `table.Get(value.Ref)` 就是**一个已经被收走的句柄**
（与第 200 轮 `reduce` 那个累加器、第 279 轮 reviver 的根**同一处坎**）。
**深度天然就是层号**（递归进子节点时 `depth + 1`），所以不必再维护一个计数器。

**没有回调时一次都不会调它**（`anchor` 那一路只在 `call !== null` 的分支里走）——
所以「纯查询」那条老路**一格都没变**。

```ts
if (!room(ValueCharge * 2)) throw new Error("out of room");
table.Get(anchor).AsArray().SetAt(depth, value);
```

# method JsonKeyOrder:(table:HeapTable, owner:int)=>Array<int>

**一个对象该按什么顺序序列化**（第 296 轮）——**返回的是属性表里的下标**。

**JS 的次序是语义**，而且是**两条规矩**：**整数样的键升序在最前**、
**其余按创建顺序**（`OrdinaryOwnPropertyKeys`）。`JSON.stringify({b:1, 2:2, a:3, 1:4})`
在 Node 里是 `{"1":4,"2":2,"b":1,"a":3}`。

**原来这里是照 `Props` 的原样走**（纯插入序）⇒ 打出来是
`{"b":1,"2":2,"a":3,"1":4}`——**一句异常都没有**（**静默错值**，
而 `Object.keys` 从第 210 轮起就是对的 ⇒ **同一个对象两个出口两个次序**，
判据 `c291-rt-object-key-order-and-json` 与 `c291-rt-object-iteration-order` 量的就是这一对）。

**为什么收成一个方法**：`Object` 那一支有**三条**遍历（白名单那条不算——
它按**数组给的顺序**，与这里无关；剩下**探测一次、缩进渲染一次、紧凑渲染一次**）——
三处各写一遍次序就是**三处会漂**，而漂了的症状是「同一个对象在同一个出口里两种次序」。

**判据与 `Object.keys` 共用**（`IsIndexKeyText`）：两处各写一份「什么算下标键」
就是两处会漂——`"01"` / `"1.5"` / `"-1"` / `"1e3"` **都不是**下标键。

**访问器算不算一格**（第 695 轮）：**算**——原来这里也有一句
`PropertyKind.Accessor → continue`，于是访问器**连次序表都进不去**，
`JsonMemberValue` 那一处再怎么现读也轮不到它（实测：改完 `JsonText` 三处仍然给 `{}`）。
跳不跳现在由**读值那一趟**决定（`call === null` 时跳过），次序这一层只按
「自有 + 可枚举 + 字符串键」筛——与 `Object.keys` **同一条**。

```ts
const item = table.Get(owner);
const indexAt: number[] = [];
const indexValue: number[] = [];
const plainAt: number[] = [];
for (let i = 0; i < item.Props.length; i++) {
  const property = item.Props[i];
  if (table.Get(property.Key).Tag !== ValueTag.String) continue;
  if (!property.IsEnumerable()) continue;
  const text = TextFrom(table, Value.FromString(property.Key));
  if (IsIndexKeyText(text)) {
    indexAt.push(i);
    indexValue.push(Number(text));
    continue;
  }
  plainAt.push(i);
}
// **整数样那一摞升序**（插入排序——键数很少，与 `Object.keys` 那一处同一个写法）。
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

**缩进串**（第 192 轮）：`depth` 层、每层 `indent`——纯字符串重复，不碰堆。

```ts
let text = "";
for (let i = 0; i < depth; i++) text = text + indent;
return text;
```

# method JsonHexDigit:(unit:int)=>int

**一位十六进制**（`0-9` / `a-f` / `A-F`）；非法给 `-1`。

```ts
if (unit >= 48 && unit <= 57) return unit - 48;
if (unit >= 97 && unit <= 102) return unit - 87;
if (unit >= 65 && unit <= 70) return unit - 55;
return -1;
```

# method JsonSkipSpace:(text:Array<int>, cursor:any)=>void

**跳过 JSON 允许的那四种空白**（空格 / 制表 / 换行 / 回车）——**只有这四种**
（JS 的 `JSON.parse` 就是这么定的：`\v` / `\f` / 不换行空格都不算）。

**游标为什么是一个对象**：本仓的方法**只返回一个值**，而解析要带出「读到哪了」——
塞进一个只有本方法读写的对象里（与 `CollectDefaults` 那种「往调用方的数组里追加」同一个套路）。

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

**认三个字面量词**（`true` / `false` / `null`）：逐码元比，比完把游标推过去；不一致就抛。

```ts
for (let i = 0; i < word.length; i++) {
  if (cursor.At >= text.length || text[cursor.At] !== word.charCodeAt(i)) {
    throw new SyntaxError("JSON.parse: expected " + word);
  }
  cursor.At = cursor.At + 1;
}
```

# method JsonParseString:(text:Array<int>, cursor:any)=>Array<int>

**解析一个 JSON 字符串字面量**：游标停在开引号上，成功时停在闭引号之后；返回**码元**。

**转义**：`\" \\ \/ \b \f \n \r \t` 与 `\uXXXX`。
**代理对原样两个码元**——本仓的字符串就是 UTF-16 码元，
不需要「拼成一个码位」那一步（那一步反而会把两个码元并成一个）。

**不合法就抛**：没闭合、裸控制字符（JSON 明文禁止）、不认识的转义、
`\u` 后面不是四位十六进制。

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

**解析一个 JSON 数字**：`-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?`
（前导零、`1.`、`.5`、`1e`——**每一条都抛**，与 JS 一样严）。

**先按文法切出那一段文本，再交给宿主做十进制 → 双精度**——
**这一步用宿主是应该的**：正确舍入的十进制转换是 IEEE 754 的活儿
（TS 的 `Number` 与 C++ 的 `strtod` 都给「最近的那个双精度」），手写一遍只会写错。
（与 `TextFrom` / `UnitsOf` 同一条口径：**建库层是宿主侧代码**；
「引擎侧不许用宿主库」那条规矩管的是 `runtime/`。）

**整的、且在 `i32` 里就给 `Int32`**，其余给 `Float64`——与 `MathResult` / `MakeNumber`
同一条口径（同一个数在两处不该有两种标签）。

```ts
const start = cursor.At;
if (cursor.At < text.length && text[cursor.At] === 45) cursor.At = cursor.At + 1;
if (cursor.At >= text.length) throw new SyntaxError("JSON.parse: a number with no digits");
if (text[cursor.At] === 48) {
  // **前导零只许一个**：`01` 是坏的。
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

**解析一个 JSON 值**（递归下降；每一种值一支）。

**深度上限**：超过 `MaxJsonDepth` 就抛——`parse` 是**宿主递归**，
而宿主栈溢出**不可捕获**（`README` 的硬性约定第 2 条），所以这不是风格问题。

**对象用 `NewPlainObject`、数组用 `NewPlainArray`**（都带上原型表给的原型）：
于是 `JSON.parse('{"a":1}').a` 与 `JSON.parse('[1,2]').join('-')` 都成立。
**重复的键后面那个赢**（JS 就是 `SetProperty` 覆盖，这一条与真实实现一致）。

**字符串那一格要先问 room**：`table.CreateString` **自己不问**（`heap.xl.md` 里它只管分配），
而解析出来的每一段文本都是新对象——不问就是绕过资源上限。

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
    // **这里是普通属性**（第 194 轮差点改错）：JSON 解析出来的键是**数据**，
    // `Object.keys(JSON.parse(...))` 在 JS 里看得见它们——「不可枚举」只给
    // **内部件与方法**用（`__t` / `__k` / `message` / 那一批方法）。
    // 判据当场抓住了这一格：那条 check 报的是「期望 {...}、实际 {}」。
    //
    // **走 `CreateDataProperty`、不走 `SetProperty`**（第 697 轮，**实测撞到的**）：
    // JSON 解析是「按数据造对象」，JS 那一步是 `CreateDataProperty`——
    // 而 `[[Set]]` 会**沿原型链调访问器的 setter**：`{"__proto__": {…}}` 于是去**改原型**
    //（`044-json-parse-proto-key` 量的正是「它是普通自有属性」），
    // 而且这里手里只有 `NeverCall` ⇒ 真调起来抛的是
    // `unreachable: installing a builtin never calls a function`（**整份文件进不来**，
    // 判据 `038-json-parse-forms-r371` / `044` / `061` 三条一起红）。
    CreateDataProperty(room, table, created, Value.FromString(table.CreateString(key)), value);
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

**`JSON.parse` 的 reviver 那一步**（第 279 轮）——JS 的 `InternalizeJSONProperty`。

**顺序是「先自底向上、再调回调」**：`holder[name]` 若是对象，
就**先把它的每一格都过一遍**，然后才拿**这一格**调 `reviver.call(holder, name, value)`
（JS 就是这么定的）。**反过来写**（先调自己再走孩子）会让父回调看到**没走完的孩子**
——判据里所有数字都乘了 10，写反了就会**一部分乘了、一部分没乘**。

**回调返回 `undefined` 是「删掉这一格」**（JS 的口径，不是「写一个 `undefined`」）：
`{"a":1}` 配 `(k, v) => typeof v === "number" ? undefined : v` 在 JS 里给 `{}`，
而写成「写入 `undefined`」会给 `{"a":undefined}`（**形状变了**，`"a" in o` 从真变假）。

**数组那一支不能删格**：JS 对数组元素用的是**定义那一格**
（`len` 不变，返回 `undefined` 就把它设成 `undefined`）。两处**不是同一条**
——所以下面分成两支写，而不是合成一句「删掉」。

**`failed` 那一问每一轮都要问**（与这一块其余回调循环同一条）：
回调抛出之后 `walked` 是 `undefined`，不问的话会被当成**回调的答案**用
（于是「抛了」变成「把那一格设成了 `undefined`」，**静默错值**）。

```ts
const holderKey = Value.FromString(table.CreateString(Units(name)));
// **① `holder[name]`**：数组按下标、对象按自有属性。
// **洞与缺席都给 `undefined`**（JS 的 `Get` 也是这个答案）——两者在这里不必分开。
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
// **② 是容器就先把孩子走完**（对象与数组**都是** `IsObject()`——数组也是对象）。
if (current.IsObject()) {
  const container = table.Get(current.Ref);
  if (current.Tag === ValueTag.Array) {
    const containerItems = container.AsArray();
    const length = containerItems.GetLength();
    for (let i = 0; i < length; i++) {
      const walked = JsonRevive(room, table, call, failed, current, "" + i, reviver);
      if (failed !== null && failed()) return Value.Undefined();
      // **数组：定义那一格，不删**（见上面那一段）。`SetAt` 会把洞清掉——正是想要的。
      containerItems.SetAt(i, walked);
    }
  } else {
    // **先把键抄下来再改**：走一趟回调会**改这一摞属性**（返回 `undefined` 时删掉），
    // 边扫边改就是**边遍历边改容器**——抄一份是唯一稳的写法。
    // **只看自有 + 可枚举 + 字符串键**（JS 的 `EnumerableOwnPropertyNames`）：
    // 访问器跳过（读它要重入，而 JSON 解析出来的树上**根本没有访问器**——
    // 跳过的代价是零，写进去的代价是「遍历顺序里冒出一格不存在的东西」）。
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
        // **`undefined` ⇒ 删掉这一格**（JS 的 `DeletePropertyOrThrow`）。
        DeleteProperty(table, current.Ref, childKey);
      } else {
        // **与解析那一趟同一条规矩**（第 697 轮）：JS 的 `InternalizeJSONProperty`
        // 这一步也是 `CreateDataProperty`——reviver 返回的值**按数据写回那一格**，
        // 不沿原型链找 setter（`{"__proto__": …}` 在 reviver 这一趟同样只是普通自有属性）。
        CreateDataProperty(room, table, current, childKey, walked);
      }
    }
  }
}
// **③ 最后才拿这一格调回调**（顺序见上面那一段）。
// **`this` 是 holder**（JS 的 `Call(reviver, holder, «name, value»)`）——
// 写成 `Value.Undefined()` 会让 `reviver` 里读 `this` 的那一支拿到 `undefined`（静默）。
if (call === null) return current;
return call(reviver, holder, [holderKey, current]);
```

# method JsonParseText:(room:RoomChecker, table:HeapTable, protos:Protos, text:Array<int>)=>Value

**`JSON.parse` 的正身**：解析**一个**值，然后要求**后面只剩空白**——
`"1 2"` / `"{}extra"` 都是坏的（JS 也拒）。

**为什么自己走一遍、不用宿主的 `JSON.parse`**：它给的是**宿主对象**，
而这一层要的是**堆里的值**（转换那一步要另写一套，还多一次分配）；
更要紧的是**跨目标**——C++ 那边抄不了 `JSON.parse`，
而这一份逻辑逐行都能翻（与 `DateParts` 用 Hinnant 公式而不是宿主日期库同一条理由）。

```ts
const cursor = { At: 0 };
const value = JsonParseValue(room, table, protos, text, cursor, 0);
JsonSkipSpace(text, cursor);
if (cursor.At !== text.length) throw new SyntaxError("JSON.parse: trailing characters after the value");
return value;
```

# const ReflectApply:int = 685

**`Reflect` 那一族的第一格**（第 717 轮）——13 个号开在 `685..697`（`680..684` 是 `Date`
那一族、`700..799` 是语言内部辅助那一段，中间这一段空着）。

**为什么 `Reflect` 值得做**：它与 `Proxy` 是**同一批「元编程那一层」的构造**，
而本仓原来**一格都没有**——降级期就报 `name is not a local or a capture: Reflect`
（判据 `stdlib/object/probe703-o-a25` … `a28` 四条登着，一句话里没有一个字提到
「没装」）。**分工与 `Object` 的静态方法那一族重叠但不同**：`Object.defineProperty`
写不下去就**抛**，`Reflect.defineProperty` 把它折成**一个布尔**；
`Object.getPrototypeOf(1)` 答 `Number.prototype`，`Reflect.getPrototypeOf(1)` **抛**
（`Reflect` 那一族**一律先要求第一个实参是对象**，`apply` / `construct` 两格除外）。

**实现落在 `install.xl.md`**（`InvokeReflect`）而不是这一份里：`Reflect.construct`
要走 `ConstructApply`，而那一格住在 `install.xl.md`（依赖方向只允许它 import 这里）。

# const ReflectConstruct:int = 686

**`Reflect.construct(ctor, 实参数组)`**（第 717 轮）——转交 `ConstructApply`
（`new C(...xs)` 的落点，第 197 轮）。**三实参那一档（`newTarget`）还没做**：
给了就**响亮地抛**，不静默拿 `ctor` 顶替。

# const ReflectDefineProperty:int = 687

**`Reflect.defineProperty(对象, 键, 描述符)`**（第 717 轮）——走 `DefineOwnFromDescriptor`
（与 `Object.defineProperty` **同一处**），成功返回真。**写不下去那一档**在 JS 里是**假**、
在本仓是**抛**（`DefineOwnFromDescriptor` 的口径）——**已知差写在明处**。

# const ReflectDeleteProperty:int = 688

**`Reflect.deleteProperty(对象, 键)`**（第 717 轮）——与 `delete 对象[键]` **同一处**
（`props.xl.md` 的 `DeleteProperty`），返回它那个布尔。**键走 `ToPropertyKey`**
（数字键 / 对象键都收，与第 706 轮给 `delete` 补的那一句同一条）。

# const ReflectGet:int = 689

**`Reflect.get(对象, 键)`**（第 717 轮）——与 `对象[键]` **同一处**（`GetProperty`）。
**第三格 `receiver` 还没做**：给了就**响亮地抛**（那一格要改 `GetProperty` 的取法本身，
不是这一轮的事）。

# const ReflectGetOwnPropertyDescriptor:int = 690

**`Reflect.getOwnPropertyDescriptor(对象, 键)`**（第 717 轮）——**不写第二份扫描**：
转交给 `Object.getOwnPropertyDescriptor` 那一格能力号（两边的答案本来就一字不差）。

# const ReflectGetPrototypeOf:int = 691

**`Reflect.getPrototypeOf(对象)`**（第 717 轮）——与 `Object.getPrototypeOf` /
`__proto__` 那一格是**同一处取法**（`PrototypeOfValue`）。

# const ReflectHas:int = 692

**`Reflect.has(对象, 键)`**（第 717 轮）——`in` 那一格的正身：走 `FindProperty`
（**沿原型链**找），找到就是真。**不调 `HasProperty` 的第二份实现**。

# const ReflectIsExtensible:int = 693

**`Reflect.isExtensible(对象)`**（第 717 轮）——与 `Object.isExtensible` 共用
`IsUnextensible` 那一张底牌（只是不取反）。

# const ReflectOwnKeys:int = 694

**`Reflect.ownKeys(对象)`**（第 717 轮）——**字符串键 + 符号键**，次序按
`Object.getOwnPropertyNames` 再 `Object.getOwnPropertySymbols`（JS 的次序就是这样：
整数键在前、其余字符串键按插入次序、符号键最后）。**两趟都不重写**：
各转交给 `Object` 那一族**同一个能力号**，只把两个结果接起来——
那条「自己再扫一遍属性表」的路就是第二份会漂的判据。

# const ReflectPreventExtensions:int = 695

**`Reflect.preventExtensions(对象)`**（第 717 轮）——与 `Object.preventExtensions`
同一处（`MarkUnextensible`），返回真。

# const ReflectSet:int = 696

**`Reflect.set(对象, 键, 值)`**（第 717 轮）——与 `对象[键] = 值` 同一处（`SetProperty`），
**返回的是那个布尔**（写不下去给假，**不抛**——这正是 `Reflect` 与 `Object` 那一族的分界）。
**第四格 `receiver` 还没做**（与 `get` 那一格同一条，给了就抛）。

# const ReflectSetPrototypeOf:int = 697

**`Reflect.setPrototypeOf(对象, 原型)`**（第 717 轮）——与 `Object.setPrototypeOf` 走
**同一条现成的路**（`RtSetProto`：自环当场拒、深度上限那一套都在里面）。
**原型不是对象也不是 `null` 时给假**（JS 的 `Reflect` 口径；`Object` 那一格是抛）。

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
  // **第 275 轮补的十格**（号开在 `350..359`，理由见那十段号）——
  // 名字与号**一一对齐**（两张表按下标配，错一格就是**静默**换语义）。
  "imul", "clz32", "fround", "expm1", "sinh", "cosh", "tanh", "log2", "log10", "log1p",
  // **第 288 轮补的三角七格**（号开在 `360..366`）——同样**按下标配**。
  "sin", "cos", "tan", "asin", "acos", "atan", "atan2",
  // **第 372 轮补的三格**（双曲函数的反函数，号开在 `372..374`）——同样**按下标配**。
  // 它们是第 371 轮加宽语料时**当场量到的**（`Math.asinh(0)` 报
  // `cannot call a non-closure value`——那一族**有写的人、没有装的人**，
  // 与第 304 轮 `setPrototypeOf` / `preventExtensions` 那两格**同一个形状**）。
  "asinh", "acosh", "atanh",
  // **第 703 轮补的两格**（号 `431..432`）——同样**按下标配**。
  // 它们是第 703 轮那批原子探针**当场量到的**（`Math.f16round(1.1)` 与
  // `typeof Math.random` 两条：前者报 `cannot call a non-closure value`、
  // 后者给 `undefined`）。**`random` 的值不可比**，判据只问名字（见号那两段）。
  "f16round", "random"];
const mathIds: number[] = [MathFloor, MathAbs, MathMax, MathMin, MathRound, MathCeil, MathTrunc, MathSign,
  MathSqrt, MathPow, MathLog, MathExp, MathCbrt, MathHypot,
  MathImul, MathClz32, MathFround, MathExpm1, MathSinh, MathCosh, MathTanh, MathLog2, MathLog10, MathLog1p,
  MathSin, MathCos, MathTan, MathAsin, MathAcos, MathAtan, MathAtan2,
  MathAsinh, MathAcosh, MathAtanh,
  // **第 703 轮的两格**（与上面那串名字**按下标一一对齐**）。
  MathF16Round, MathRandom];
for (let i = 0; i < mathNames.length; i++) {
  const key = Value.FromString(table.CreateString(Units(mathNames[i])));
  const target = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(mathIds[i], 0));
  SetHiddenProperty(vm.Room(), table, math, key, target);
}
// **`Math.PI` / `Math.E` 是属性，不是方法**（第 206 轮）：它们是**数**，
// 所以挂的是 `Value.FromDouble(...)` 本身——挂成 HostRef 的话
// `Math.PI` 取出来会是一个「能被调用的号」（`Math.PI * 2` 于是算不对）。
// **`Math.PI` 遍地都是**（圆的面积、角度换算），而判据 `e2e-inheritance-hierarchy` /
// `math-logs-constants` 拖着的正是它。
// **第 709 轮：这八个常量改成「不可写 / 不可枚举 / 不可配置」**（`flags = 0`）——
// 规范的 `Math` 常量全是这样，而本仓原来用 `SetProperty` 挂 ⇒ **三个标志全真**
// （判据 `probe705-o-b07`：`Object.getOwnPropertyDescriptor(Math, "PI").writable`
//  Node 给 `false`、本仓给 `true`——**静默错值**，一句异常都没有）。
// **`flags = 0` 就是那一档**（`props.xl.md` 的 `SetHiddenProperty`：给 `-1` 才是
// 「可写 + 可配置」那个缺省）；`enumerable` 本来就不在 `SetProperty` 那一位上。
SetHiddenProperty(vm.Room(), table, math,
  Value.FromString(table.CreateString(Units("PI"))), Value.FromDouble(Math.PI), 0);
SetHiddenProperty(vm.Room(), table, math,
  Value.FromString(table.CreateString(Units("E"))), Value.FromDouble(Math.E), 0);
// **第 291 轮补的六个常量**（`LN2` / `LN10` / `LOG2E` / `LOG10E` / `SQRT2` / `SQRT1_2`）。
// **`Math.PI` 与 `Math.E` 两条先例的照抄**：常量是**数**，挂的是 `Value.FromDouble(...)` 本身
// ——**不是** `HostRef`（挂错的话 `Math.LN2` 会变成一个「能被调用的号」，
// 于是 `Math.LN2 > 0.69` 静默给假）。
// **它们是第 291 轮普查量到的**：判据 `c291-math-constants-and-pow` 量到
// `Math.LN2 > 0.69` 与 `Math.SQRT2 > 1.41` 都给**假**——即**那两格根本没装**
//（PI / E / pow 一直是好的）。**静默错值**：一句异常都没有。
// **标志位与上面两格同一条**（第 709 轮）。
SetHiddenProperty(vm.Room(), table, math,
  Value.FromString(table.CreateString(Units("LN2"))), Value.FromDouble(Math.LN2), 0);
SetHiddenProperty(vm.Room(), table, math,
  Value.FromString(table.CreateString(Units("LN10"))), Value.FromDouble(Math.LN10), 0);
SetHiddenProperty(vm.Room(), table, math,
  Value.FromString(table.CreateString(Units("LOG2E"))), Value.FromDouble(Math.LOG2E), 0);
SetHiddenProperty(vm.Room(), table, math,
  Value.FromString(table.CreateString(Units("LOG10E"))), Value.FromDouble(Math.LOG10E), 0);
SetHiddenProperty(vm.Room(), table, math,
  Value.FromString(table.CreateString(Units("SQRT2"))), Value.FromDouble(Math.SQRT2), 0);
SetHiddenProperty(vm.Room(), table, math,
  Value.FromString(table.CreateString(Units("SQRT1_2"))), Value.FromDouble(Math.SQRT1_2), 0);
const consoleObject = NewPlainObject(vm.Room(), table, protos);
const logKey = Value.FromString(table.CreateString(Units("log")));
const logTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ConsoleLog, 0));
// **`console` 是那一族里的例外：它的成员在 Node 上「可枚举」**（第 709 轮，普查量到的）。
// 第 709 轮把这一族命名空间的成员统一改成 `SetHiddenProperty`（`Math` / `JSON` /
// `Object` / `Number` / `String.prototype` … 在 JS 里全是**不可枚举**的），
// 而 `console` **不在规范里**——Node 的实现把方法挂成普通属性：
// `Object.getOwnPropertyDescriptor(console, "log").enumerable` 在 Node 里是 **`true`**、
// `for (const k in console)` 数得出 **25** 个名字（本仓只有 `log` 一个成员，
// 那是 `stdlib/console/020-names-console` 那条台账管的事）。
// **所以这一格要留在 `SetProperty` 上**：跟规范走的那一族统一收口，
// 而这一档按实现走——两种口径**写在明处**，不混。
SetProperty(vm.Room(), NeverCall, table, consoleObject, logKey, logTarget);

const objectObject = NewPlainObject(vm.Room(), table, protos);
const keysKey = Value.FromString(table.CreateString(Units("keys")));
const keysTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectKeys, 0));
SetHiddenProperty(vm.Room(), table, objectObject, keysKey, keysTarget);
// **`for..in` 那一格藏在 `Object` 上**（第 340 轮）：降级层按**名字**取它
//（与它取 `keys` 是同一个形状），而**用 `SetHiddenProperty`** ⇒
// `Object.keys(Object)` / `for..in` 都看不见它（**不可枚举**）——
// 只有 `Object.getOwnPropertyNames(Object)` 会列出它（判据里**没有**这一格，
// 语料里也查过一遍：0 处）。
const forInKey = Value.FromString(table.CreateString(Units("forInKeys")));
const forInTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectForInKeys, 0));
SetHiddenProperty(vm.Room(), table, objectObject, forInKey, forInTarget);
// **`Object.is`**（第 275 轮）：与 `keys` **同一张对象**上再挂一格
//（与 `JSON.stringify` / `parse` 那两格的写法一字不差）。
const isKey = Value.FromString(table.CreateString(Units("is")));
const isTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectIs, 0));
SetHiddenProperty(vm.Room(), table, objectObject, isKey, isTarget);
// **第 276 轮补的五格**（`Object` 那一段的 `412..416`）——**名字与号一一对齐**
//（按下标配，错一格就是**静默**换语义）。它们围着**描述符**这一件事：
// 读一格 / 写多格 / 标志位的三种问法。
const objectExtraNames: string[] = ["getOwnPropertyDescriptor", "defineProperties", "seal",
  "isSealed", "isFrozen",
  // **第 291 轮补的一格**（`isExtensible`）——它与上面两格**共用同一张底牌**
  //（见号那一段）。名字与号照旧**按下标配**。
  "isExtensible",
  // **第 304 轮补的两格**（`setPrototypeOf` / `preventExtensions`）——
  // 号在 `419` / `420`，名字与号**按下标配**（错一格就是**静默**换语义）。
  // 它们是第 304 轮加宽矩阵时**当场量到的**（两条判据都在报
  // `cannot call a non-closure value`——那一族**有问的人、没有做的人**）。
  "setPrototypeOf", "preventExtensions",
  // **第 324 轮补的一格**（`getOwnPropertyDescriptors`，号 `428`）——
  // 它排在**最后**：这两张表**按下标配**（错一格就是**静默**换语义），
  // 而插在中间会把后面每一格都挪一位（第 280 轮那次号撞车就是这么来的）。
  "getOwnPropertyDescriptors"];
const objectExtraIds: number[] = [ObjectGetOwnPropertyDescriptor, ObjectDefineProperties, ObjectSeal,
  ObjectIsSealed, ObjectIsFrozen, ObjectIsExtensible,
  ObjectSetPrototypeOf, ObjectPreventExtensions,
  ObjectGetOwnPropertyDescriptors];
for (let i = 0; i < objectExtraNames.length; i++) {
  const extraKey = Value.FromString(table.CreateString(Units(objectExtraNames[i])));
  const extraTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(objectExtraIds[i], 0));
  SetHiddenProperty(vm.Room(), table, objectObject, extraKey, extraTarget);
}
// **`Object.hasOwn`**（第 372 轮）——**单开一句**（不进上面那两张按下标对齐的表）：
// 那两张表的口径是「**名字与号一一对齐**」，而这一格是**追加**的（号开在 `429`，
// 与表里那一段 `412..420` / `428` 不连号）⇒ 塞进去反而要重新对一遍下标，
// 而那正是第 280 轮**号撞车**那一类错的温床。**摆在这里**（描述符那一族后面）
// 是因为它是**同一个问法的静态版**——`hasOwnProperty` 就在下面 `Object.prototype` 那一摞里。
SetHiddenProperty(vm.Room(), table, objectObject,
  Value.FromString(table.CreateString(Units("hasOwn"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectHasOwn, 0)));

const jsonObject = NewPlainObject(vm.Room(), table, protos);
const stringifyKey = Value.FromString(table.CreateString(Units("stringify")));
const stringifyTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(JsonStringify, 0));
SetHiddenProperty(vm.Room(), table, jsonObject, stringifyKey, stringifyTarget);
// `JSON.parse`（第 122 轮）：与 `stringify` 同一张对象上再挂一个号。
const parseKey = Value.FromString(table.CreateString(Units("parse")));
const parseTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(JsonParse, 0));
SetHiddenProperty(vm.Room(), table, jsonObject, parseKey, parseTarget);

// `Object.values` / `Object.entries`（第 120 轮补）：与 `keys` 同一张对象上再挂两个号。
const valuesKey = Value.FromString(table.CreateString(Units("values")));
const valuesTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectValues, 0));
SetHiddenProperty(vm.Room(), table, objectObject, valuesKey, valuesTarget);
const entriesKey = Value.FromString(table.CreateString(Units("entries")));
const entriesTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectEntries, 0));
SetHiddenProperty(vm.Room(), table, objectObject, entriesKey, entriesTarget);
// `Object.assign`（第 130 轮）：与上面三个同一张对象。
const assignKey = Value.FromString(table.CreateString(Units("assign")));
const assignTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectAssign, 0));
SetHiddenProperty(vm.Room(), table, objectObject, assignKey, assignTarget);
// **`Object.freeze` / `Object.defineProperty`**（第 182 轮）：与上面四个同一张对象。
// 两个都只动**属性表里的标志位**（`SetProperty` / `DeleteProperty` 早就照着它们抛）。
const freezeKey = Value.FromString(table.CreateString(Units("freeze")));
const freezeTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectFreeze, 0));
SetHiddenProperty(vm.Room(), table, objectObject, freezeKey, freezeTarget);
const definePropertyKey = Value.FromString(table.CreateString(Units("defineProperty")));
const definePropertyTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectDefineProperty, 0));
SetHiddenProperty(vm.Room(), table, objectObject, definePropertyKey, definePropertyTarget);
// **`Object.groupBy`**（第 295 轮）：与上面那些**同一张对象**上再挂一格。
const groupByKey = Value.FromString(table.CreateString(Units("groupBy")));
const groupByTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectGroupBy, 0));
SetHiddenProperty(vm.Room(), table, objectObject, groupByKey, groupByTarget);

// `Error` 是一个**宿主构造函数**（`new Error(msg)` 走 `Op.New` 的宿主那条分支，
// `Error(msg)` 走 `Op.Call`——同一个号两支都通，见 `ErrorCtor` 的说明）。
const errorKey = Value.FromString(table.CreateString(Units("Error")));
// **第 343 轮：`Error` 从「光秃秃的宿主引用」改成「普通对象 + 可调用载荷」**
// （**实测撞到的**）：`Error.isError` 这种**静态**要挂在**那个值**身上，
// 而**宿主引用没有属性表**（`GetProperty(Error, "isError")` 永远给 `undefined`）。
// 形状照 `Function` / `Array` / `Number` / `String` 那一族抄：
// 对象照旧是对象、只是多了一格「能被调」（`AttachCallable`，第 145 轮）——
// 于是 `Error(msg)` 与 `new Error(msg)` **两条路都不受影响**（同一个号）。
// **它是第 342 轮那次退回来的那一改**：当时撞在 `this` 的两条相反规则上
//（`super(m)` 要接收者、`bind` 要对象自己），第 343 轮按**载荷号**收窄之后
// 两条都对了——所以这一格现在落得下来。
const errorObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(errorObject.Ref, ErrorCtor, 0);
SetHiddenProperty(vm.Room(), table, globals, errorKey, errorObject);
SetHiddenProperty(vm.Room(), table, errorObject, NameValue(table, "prototype"),
  Value.FromObject(protos.Error));
// **`Error.isError(v)`**（第 343 轮）：判据是「链上有没有 `Error.prototype`」——
// 与 `instanceof Error` **同一个判据**（`Object.create(Error.prototype)` 也算，
// 而那正是 JS 的规矩）。**原始值一律假**（`Error.isError("Error")` 在 Node 里是 `false`）。
SetHiddenProperty(vm.Room(), table, errorObject, NameValue(table, "isError"),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ErrorIsError, 0)));
// **第 703 轮补的四格**（V8 的扩展 + 构造自己的 `length`）——
// 判据 `stdlib/error/031-names-error` 与 `probe-e09` 量的是**名字在不在**
// （四条 `typeof` 分别是 function / number / function / number，与 Node 逐字相同）。
// **走 `SetHiddenProperty`**（与上面 `isError` 同一条路）：Node 上这几格**都不可枚举**
// ——`Object.keys(Error)` 在 Node 里只有 `stackTraceLimit` 那一格（见下面那一句），
// 而 `Error.prototype` 那一格本仓历史上就是可枚举的（不属这一轮的账）。
// **`stackTraceLimit` 给 `10`**（Node 的缺省值）：判据只问 `typeof`，
// 可这一格**本来就是个数**，挂成函数就是「答一个形状不对的东西」。
SetHiddenProperty(vm.Room(), table, errorObject, NameValue(table, "captureStackTrace"),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ErrorCaptureStackTrace, 0)));
SetHiddenProperty(vm.Room(), table, errorObject, NameValue(table, "prepareStackTrace"),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ErrorPrepareStackTrace, 0)));
// **`stackTraceLimit` 是 `Error` 上**唯一可枚举**的一格**（第 709 轮，**实测**）：
// `Object.keys(Error)` 在 Node 24 里给 **`["stackTraceLimit"]`**
//（它的描述符是 `{ writable: true, enumerable: true, configurable: true }`，
//  那是 V8 自己挂的扩展，不是规范那一档）。
// **这一句原来写的是 `SetHiddenProperty`，而注释还说「Node 里 `Object.keys(Error)` 是 `[]`」**
// ——那个说法在 Node 24 上**不成立**。判据 `stdlib/error/probe704-e-a23`
//（`Object.keys(Error).length`）原来**是碰巧过的**：那时 `Error.prototype` 那一格
// 还是可枚举的（`SetProperty` 挂的），于是长度也是 **1**——**两个不同的键、同一个数**。
// 第 709 轮把那一族命名空间统一改成不可枚举之后，这一格的真面目才露出来（**倒退**一条）。
// **收法就是按实现走**：这一格给 `SetProperty`（可枚举），与 Node 逐字相同。
SetProperty(vm.Room(), NeverCall, table, errorObject, NameValue(table, "stackTraceLimit"),
  Value.FromInt(10));
SetHiddenProperty(vm.Room(), table, errorObject, NameValue(table, "length"),
  Value.FromInt(1));
// **`Error` 的 `prototype` 要登记**（第 137 轮）：它是**宿主引用值**，
// **没有属性表**——所以 `GetProperty(Error, "prototype")` 永远给 `undefined`，
// 而 `instanceof` 正是靠读那个属性找目标的。登记一次，
// `x instanceof Error` 就走引擎那张表（`vm.xl.md` 的 `ConstructorProtos`）。
vm.RegisterConstructorProto(ErrorCtor, protos.Error);
// **`TypeError` / `RangeError` 两个号也登记**（第 137 轮），并且挂成全局名
// （`GlobalNames` 那张名单——两边是同一份约定，少一处就是「声明了却没提供」）。
const typeErrorKey = Value.FromString(table.CreateString(Units("TypeError")));
const typeErrorObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(typeErrorObject.Ref, TypeErrorCtor, 0);
const typeErrorTarget = typeErrorObject;
SetHiddenProperty(vm.Room(), table, globals, typeErrorKey, typeErrorTarget);
SetHiddenProperty(vm.Room(), table, typeErrorObject, NameValue(table, "name"),
  Value.FromString(table.CreateString(Units("TypeError"))));
SetHiddenProperty(vm.Room(), table, typeErrorObject, NameValue(table, "prototype"),
  Value.FromObject(protos.TypeError));
vm.RegisterConstructorProto(TypeErrorCtor, protos.TypeError);
const rangeErrorKey = Value.FromString(table.CreateString(Units("RangeError")));
const rangeErrorObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(rangeErrorObject.Ref, RangeErrorCtor, 0);
const rangeErrorTarget = rangeErrorObject;
SetHiddenProperty(vm.Room(), table, globals, rangeErrorKey, rangeErrorTarget);
SetHiddenProperty(vm.Room(), table, rangeErrorObject, NameValue(table, "name"),
  Value.FromString(table.CreateString(Units("RangeError"))));
SetHiddenProperty(vm.Room(), table, rangeErrorObject, NameValue(table, "prototype"),
  Value.FromObject(protos.RangeError));
vm.RegisterConstructorProto(RangeErrorCtor, protos.RangeError);
// **`SyntaxError` 那三样**（第 277 轮）：挂全局名、登记原型、原型上三个属性——
// 与上面那两条一字不差。**三处缺一处的表现各不相同**（都记在明处）：
// 只挂名字不登记原型 ⇒ `e instanceof SyntaxError` **抛**「右边没有原型对象」；
// 登记了原型但没挂 `name` ⇒ `new SyntaxError().name` 读到 `Error.prototype` 的 `"Error"`
//（**看着对**）；没挂 `constructor` ⇒ `e.constructor === SyntaxError` 给假。
const syntaxErrorKey = Value.FromString(table.CreateString(Units("SyntaxError")));
const syntaxErrorObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(syntaxErrorObject.Ref, SyntaxErrorCtor, 0);
const syntaxErrorTarget = syntaxErrorObject;
SetHiddenProperty(vm.Room(), table, globals, syntaxErrorKey, syntaxErrorTarget);
SetHiddenProperty(vm.Room(), table, syntaxErrorObject, NameValue(table, "name"),
  Value.FromString(table.CreateString(Units("SyntaxError"))));
SetHiddenProperty(vm.Room(), table, syntaxErrorObject, NameValue(table, "prototype"),
  Value.FromObject(protos.SyntaxError));
vm.RegisterConstructorProto(SyntaxErrorCtor, protos.SyntaxError);
// **`ReferenceError` / `AggregateError` 两格**（第 295 轮）：挂全局名、登记原型——
// 与上面那三条一字不差。**原型上的 `name` / `message` / `constructor` 三格**
// 由下面那段循环一起挂（它们就在那张名单里）。
const referenceErrorKey = Value.FromString(table.CreateString(Units("ReferenceError")));
const referenceErrorObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(referenceErrorObject.Ref, ReferenceErrorCtor, 0);
const referenceErrorTarget = referenceErrorObject;
SetHiddenProperty(vm.Room(), table, globals, referenceErrorKey, referenceErrorTarget);
SetHiddenProperty(vm.Room(), table, referenceErrorObject, NameValue(table, "name"),
  Value.FromString(table.CreateString(Units("ReferenceError"))));
SetHiddenProperty(vm.Room(), table, referenceErrorObject, NameValue(table, "prototype"),
  Value.FromObject(protos.ReferenceError));
vm.RegisterConstructorProto(ReferenceErrorCtor, protos.ReferenceError);
const aggregateErrorKey = Value.FromString(table.CreateString(Units("AggregateError")));
const aggregateErrorObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(aggregateErrorObject.Ref, AggregateErrorCtor, 0);
const aggregateErrorTarget = aggregateErrorObject;
SetHiddenProperty(vm.Room(), table, globals, aggregateErrorKey, aggregateErrorTarget);
SetHiddenProperty(vm.Room(), table, aggregateErrorObject, NameValue(table, "name"),
  Value.FromString(table.CreateString(Units("AggregateError"))));
SetHiddenProperty(vm.Room(), table, aggregateErrorObject, NameValue(table, "prototype"),
  Value.FromObject(protos.AggregateError));
vm.RegisterConstructorProto(AggregateErrorCtor, protos.AggregateError);
// **`URIError` / `EvalError` 两格**（第 376 轮）：挂全局名、登记原型——
// 与上面那四条一字不差。**原型上的 `name` / `message` / `constructor` 三格**在下面。
// **`URIError` 那一格是「真的会被抛出来」的**（另外六族里除了 `SyntaxError` 都是「只由脚本造」）：
// 它还要在 `install.xl.md` 那条宿主异常 → 脚本族的映射里占一格
//（`DecodePercent` 抛的是**宿主的** `URIError`，映射在那一侧做——与第 277 轮
// 「内建那边一个字都不用改」是同一条做法）。
const uriErrorKey = Value.FromString(table.CreateString(Units("URIError")));
const uriErrorObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(uriErrorObject.Ref, URIErrorCtor, 0);
const uriErrorTarget = uriErrorObject;
SetHiddenProperty(vm.Room(), table, globals, uriErrorKey, uriErrorTarget);
SetHiddenProperty(vm.Room(), table, uriErrorObject, NameValue(table, "name"),
  Value.FromString(table.CreateString(Units("URIError"))));
SetHiddenProperty(vm.Room(), table, uriErrorObject, NameValue(table, "prototype"),
  Value.FromObject(protos.URIError));
vm.RegisterConstructorProto(URIErrorCtor, protos.URIError);
const evalErrorKey = Value.FromString(table.CreateString(Units("EvalError")));
const evalErrorObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(evalErrorObject.Ref, EvalErrorCtor, 0);
const evalErrorTarget = evalErrorObject;
SetHiddenProperty(vm.Room(), table, globals, evalErrorKey, evalErrorTarget);
SetHiddenProperty(vm.Room(), table, evalErrorObject, NameValue(table, "name"),
  Value.FromString(table.CreateString(Units("EvalError"))));
SetHiddenProperty(vm.Room(), table, evalErrorObject, NameValue(table, "prototype"),
  Value.FromObject(protos.EvalError));
vm.RegisterConstructorProto(EvalErrorCtor, protos.EvalError);
// **`WeakMap` / `WeakSet`**（第 295 轮）：**值就是 `Map` / `Set` 那两个构造**——
// 本仓**没有弱引用那一档**（回收器不认「弱」这个属性），
// 而它们拖着的两条判据只量 `set` / `get` / `has` / `delete` / `add`——
// 拿 `Map` / `Set` 顶上，那些格**一格不差**。
//
// **第 681 轮起走各自的两个号**（`WeakMapCtor = 663` / `WeakSetCtor = 664`）：
// 「**键必须是对象**」那一条原来**没有单独判**（`new WeakMap().set(1, 2)` 在本仓是通的、
// 在 JS 里抛 `TypeError`），而用量出来的缺口把它补上了——
// 两个新号是 `MapCtor` / `SetCtor` 的**同一份实现**，只多写一格内部件 `__w`
//（构造那一刻的事实来源），`set` / `add` 各自读一次。**实现没有第二份**。
//
// **仍然记着的一处差异**：`instanceof WeakMap` 是假的（原型还是 `Map` 那一个）。
// **为什么不给它们各造一个原型**：方法挂在**原型**上（`map.xl.md` 的 `InstallMapMethods`），
// 而「用哪个原型」只影响 `instanceof` 那一格——为它复制一整套安装代码不成比例
//（判据也没有量它），继续记在台账里。
const weakMapKey = Value.FromString(table.CreateString(Units("WeakMap")));
const weakMapObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(weakMapObject.Ref, WeakMapCtor, 0);
SetHiddenProperty(vm.Room(), table, globals, weakMapKey, weakMapObject);
const weakSetKey = Value.FromString(table.CreateString(Units("WeakSet")));
const weakSetObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(weakSetObject.Ref, WeakSetCtor, 0);
SetHiddenProperty(vm.Room(), table, globals, weakSetKey, weakSetObject);
// **`Map` / `Set` 两个号登记**（第 138 轮）：它们是**宿主引用值**（与 `Error` 同款），
// 只能走登记表。**`Date` 不走这条路**——它的全局值是**普通对象**
// （`new Date()` 由降级层落成一条 `host_call(DateCtor, …)`，见 `DateCtor` 的说明），
// 所以那一格用「在对象上挂 `prototype` 属性」的老路（与 `Array` / `Object` / `String` 同款）。
vm.RegisterConstructorProto(MapCtor, protos.Map);
vm.RegisterConstructorProto(SetCtor, protos.Set);
// **`Error.prototype` 上的三个属性**（`name` / `message` / `constructor`）：
// `name` 是 `e.name` 在没有自有属性时的落点，`constructor` 是 `e.constructor === Error`。
// **`message` 给空串**（JS 的 `Error.prototype.message` 就是 `""`）。
const errorProtoValue = Value.FromObject(protos.Error);
SetHiddenProperty(vm.Room(), table, errorProtoValue, NameValue(table, "name"),
  Value.FromString(table.CreateString(Units("Error"))));
SetHiddenProperty(vm.Room(), table, errorProtoValue, NameValue(table, "message"),
  Value.FromString(table.CreateString(Units(""))));
// **`constructor` 指回那个对象**（第 343 轮起 `Error` 是对象）：
// `Error.prototype.constructor === Error` 在 JS 里是**真**。
SetHiddenProperty(vm.Room(), table, errorProtoValue, NameValue(table, "constructor"), errorObject);
// **`Error.prototype.toString`**（第 213 轮）：**隐藏挂**（与 `Object.prototype` 那两格
// 同一条规矩——`Object.keys` / `for..in` 不该看见它）。
// **挂 `Error.prototype` 就够**：三个错误子族的原型都**链在它下面**（第 137 轮），
// 所以 `TypeError` 那边**不必再挂一份**（挂两份就是两处会漂的答案）。
SetHiddenProperty(vm.Room(), table, errorProtoValue,
  Value.FromString(table.CreateString(Units("toString"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ErrorToString, 0)));
// **`TypeError.prototype` / `RangeError.prototype` 上的同名三格**：
// `name` 是各自的种类名（`e.name` 在没有自有属性时的落点），
// `message` 给空串、`constructor` 指回各自那个构造函数。
// **三格一次写完**（`protos.TypeError` / `protos.RangeError`）——
// 漏一格的表现是 `e.name` 读成 `"Error"`（错得**很像对的**）。
const typeErrorProtoValue = Value.FromObject(protos.TypeError);
SetHiddenProperty(vm.Room(), table, typeErrorProtoValue, NameValue(table, "name"),
  Value.FromString(table.CreateString(Units("TypeError"))));
SetHiddenProperty(vm.Room(), table, typeErrorProtoValue, NameValue(table, "message"),
  Value.FromString(table.CreateString(Units(""))));
SetHiddenProperty(vm.Room(), table, typeErrorProtoValue, NameValue(table, "constructor"), typeErrorTarget);
const rangeErrorProtoValue = Value.FromObject(protos.RangeError);
SetHiddenProperty(vm.Room(), table, rangeErrorProtoValue, NameValue(table, "name"),
  Value.FromString(table.CreateString(Units("RangeError"))));
SetHiddenProperty(vm.Room(), table, rangeErrorProtoValue, NameValue(table, "message"),
  Value.FromString(table.CreateString(Units(""))));
SetHiddenProperty(vm.Room(), table, rangeErrorProtoValue, NameValue(table, "constructor"), rangeErrorTarget);
// **`SyntaxError.prototype` 上的同名三格**（第 277 轮）——**一字不差地照上面那两族写**。
// **`toString` 不必再挂一份**：它挂在 `Error.prototype` 上，
// 而这一格的原型链接着 `Error.prototype`（第 137 轮那条链）——挂两份就是两处会漂的答案。
const syntaxErrorProtoValue = Value.FromObject(protos.SyntaxError);
SetHiddenProperty(vm.Room(), table, syntaxErrorProtoValue, NameValue(table, "name"),
  Value.FromString(table.CreateString(Units("SyntaxError"))));
SetHiddenProperty(vm.Room(), table, syntaxErrorProtoValue, NameValue(table, "message"),
  Value.FromString(table.CreateString(Units(""))));
SetHiddenProperty(vm.Room(), table, syntaxErrorProtoValue, NameValue(table, "constructor"), syntaxErrorTarget);
// **`ReferenceError.prototype` / `AggregateError.prototype` 上的同名三格**（第 295 轮）——
// **一字不差地照上面那三族写**。**`toString` 同样不必再挂一份**（挂在 `Error.prototype` 上，
// 而这两格的原型链都接着它）。
const referenceErrorProtoValue = Value.FromObject(protos.ReferenceError);
SetHiddenProperty(vm.Room(), table, referenceErrorProtoValue, NameValue(table, "name"),
  Value.FromString(table.CreateString(Units("ReferenceError"))));
SetHiddenProperty(vm.Room(), table, referenceErrorProtoValue, NameValue(table, "message"),
  Value.FromString(table.CreateString(Units(""))));
SetHiddenProperty(vm.Room(), table, referenceErrorProtoValue, NameValue(table, "constructor"), referenceErrorTarget);
const aggregateErrorProtoValue = Value.FromObject(protos.AggregateError);
SetHiddenProperty(vm.Room(), table, aggregateErrorProtoValue, NameValue(table, "name"),
  Value.FromString(table.CreateString(Units("AggregateError"))));
SetHiddenProperty(vm.Room(), table, aggregateErrorProtoValue, NameValue(table, "message"),
  Value.FromString(table.CreateString(Units(""))));
SetHiddenProperty(vm.Room(), table, aggregateErrorProtoValue, NameValue(table, "constructor"), aggregateErrorTarget);
// **`URIError.prototype` / `EvalError.prototype` 上的同名三格**（第 376 轮）——
// **一字不差地照上面那五族写**。**`toString` 同样不必再挂一份**（挂在 `Error.prototype` 上，
// 而这两格的原型链都接着它）。
const uriErrorProtoValue = Value.FromObject(protos.URIError);
SetHiddenProperty(vm.Room(), table, uriErrorProtoValue, NameValue(table, "name"),
  Value.FromString(table.CreateString(Units("URIError"))));
SetHiddenProperty(vm.Room(), table, uriErrorProtoValue, NameValue(table, "message"),
  Value.FromString(table.CreateString(Units(""))));
SetHiddenProperty(vm.Room(), table, uriErrorProtoValue, NameValue(table, "constructor"), uriErrorTarget);
const evalErrorProtoValue = Value.FromObject(protos.EvalError);
SetHiddenProperty(vm.Room(), table, evalErrorProtoValue, NameValue(table, "name"),
  Value.FromString(table.CreateString(Units("EvalError"))));
SetHiddenProperty(vm.Room(), table, evalErrorProtoValue, NameValue(table, "message"),
  Value.FromString(table.CreateString(Units(""))));
SetHiddenProperty(vm.Room(), table, evalErrorProtoValue, NameValue(table, "constructor"), evalErrorTarget);

// **`Array` 是一个普通对象**（与 `Math` / `Date` 同款），上面只挂**静态方法** `isArray`
// （第 123 轮）。
// **第 145 轮它同时是构造函数了**：`AttachCallable` 给它挂上 `ArrayCtor`，
// 于是 `new Array(3)` / `Array(1, 2)` 都通（原来那条「已知差异」没有了）。
const arrayObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(arrayObject.Ref, ArrayCtor, 0);
const isArrayKey = Value.FromString(table.CreateString(Units("isArray")));
const isArrayTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ArrayIsArray, 0));
SetHiddenProperty(vm.Room(), table, arrayObject, isArrayKey, isArrayTarget);
// `Array.from`（第 130 轮）：与 `isArray` 同一张对象（这两个都是 `Array` 的**静态方法**）。
// **号在数组段、分派在 `install.xl.md`**——它要原型表（返回新数组），
// 理由与 `String.split` 那条一字不差。
const fromKey = Value.FromString(table.CreateString(Units("from")));
const fromTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ArrayFrom, 0));
SetHiddenProperty(vm.Room(), table, arrayObject, fromKey, fromTarget);
// **`Array.of`**（第 206 轮）：与 `isArray` / `from` 同一张对象（都是静态方法）——
// **号在数组段、分派在 `install.xl.md`**，理由与 `from` 那条一字不差（要原型表）。
const ofKey = Value.FromString(table.CreateString(Units("of")));
const ofTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ArrayOf, 0));
SetHiddenProperty(vm.Room(), table, arrayObject, ofKey, ofTarget);
// **`Array.fromAsync`**（第 369 轮）：与 `from` / `of` 同一张对象、同一个形状
//（静态方法、号在数组段、分派在 `install.xl.md`）。
// **它比那两个多要一条通道**：承诺那条（`schedule` / `settle` / `invoke`）——
// 而 `InvokeArray` 那一支递不下来，所以走 `install` 这条（与 `from` 同一个理由，**多一条**）。
const fromAsyncKey = Value.FromString(table.CreateString(Units("fromAsync")));
const fromAsyncTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ArrayFromAsync, 0));
SetHiddenProperty(vm.Room(), table, arrayObject, fromAsyncKey, fromAsyncTarget);
const arrayKey = Value.FromString(table.CreateString(Units("Array")));
SetHiddenProperty(vm.Room(), table, globals, arrayKey, arrayObject);
// **`Array.prototype`**（第 137 轮）：`Array` 是**普通对象**，所以直接挂一个属性就行——
// `[] instanceof Array` 于是走「读右边那个 `prototype` 属性」那条老路（不需要登记表）。
// **这一格必须是 `protos.Array`**（数组造出来时挂的就是它）：挂一个**新对象**，
// `instanceof` 会一路走到底给 `false`——那是最难查的一种「看起来都做了」。
// **这一格的值是「数组型」**（第 592 轮）：`protos.Array` 现在是一个**数组句柄**
//（`props.xl.md` 的 `InitProtos`），所以这里要用 `FromArray` 而不是 `FromObject` ——
// 用错的话读出来那个值的 `Tag` 是 `Object` ⇒ `Array.isArray(Array.prototype)` 还是 `false`
//（`ArrayIsArray` 判的正是 `Tag`）。
SetHiddenProperty(vm.Room(), table, arrayObject, NameValue(table, "prototype"),
  Value.FromArray(protos.Array));
// **`Array.prototype.constructor === Array`**（第 137 轮顺手补的）：
// 与 `Error.prototype.constructor` 那三格同一条规矩——少了它，
// `[].constructor === Array` 给 **`false`**（判据现场就是这么红的）。
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Array), NameValue(table, "constructor"),
  arrayObject);
// **`Number` 也是一个普通对象**（第 126 轮），上面挂静态判定；
// **第 145 轮它同时能被调用**（`Number("7")`）。
const numberObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(numberObject.Ref, NumberCtor, 0);
// **`parseInt` / `parseFloat` 的宿主引用只造一次**（第 206 轮）：
// 上面那两个全局、下面 `Number.parseInt` 那一格，**用的是同一个 `Value`**——
// 不然 `Number.parseInt === parseInt` 给 `false`（JS 给 `true`）。
// 根子在**宿主引用的判等口径**上：`HostRef` 按**堆句柄**比，
// 两次 `CreateHostRef(同一个号)` 造的是**两个句柄** ⇒ 两个值不相等。
// 「同一个函数」这件事在 JS 里是**能被脚本看见的**（实测 `Number.parseInt === parseInt`），
// 所以只能**共用同一个值**，不能在两处各造一个。
const parseIntTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ParseInt, 0));
const parseFloatTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ParseFloat, 0));
const isIntegerKey = Value.FromString(table.CreateString(Units("isInteger")));
const isIntegerTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(NumberIsInteger, 0));
SetHiddenProperty(vm.Room(), table, numberObject, isIntegerKey, isIntegerTarget);
// **`Number.isSafeInteger`**（第 288 轮）：与 `isInteger` **同一支实现**
//（只差一句区间判据，见那一支的理由）——所以这里挂的是**另一个能力号**，
// 而**不是另一份实现**。
const isSafeIntegerKey = Value.FromString(table.CreateString(Units("isSafeInteger")));
const isSafeIntegerTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(NumberIsSafeInteger, 0));
SetHiddenProperty(vm.Room(), table, numberObject, isSafeIntegerKey, isSafeIntegerTarget);
const isNaNAKey = Value.FromString(table.CreateString(Units("isNaN")));
const isNaNTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(NumberIsNaN, 0));
SetHiddenProperty(vm.Room(), table, numberObject, isNaNAKey, isNaNTarget);
// **`Number.isFinite`**（第 149 轮）：与全局的 `isFinite` 不是一个东西
//（那个先转、这个不转），所以两处各挂一格。
const isFiniteKey = Value.FromString(table.CreateString(Units("isFinite")));
const isFiniteTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(NumberIsFinite, 0));
SetHiddenProperty(vm.Room(), table, numberObject, isFiniteKey, isFiniteTarget);
// **`Number.parseInt` / `Number.parseFloat`**（第 206 轮）：它们与**全局那两个是同一个个函数**
//（JS 就是这么定的：`Number.parseInt === parseInt` 为真）——所以这里挂的是**同一个能力号**，
// 而不是另写一份（`parseInt` 那一段的规矩不少：跳空白 / 认符号 / 基数 / 最长合法前缀，
// 写第二份就是第二处会漂的答案）。
const numberParseIntKey = Value.FromString(table.CreateString(Units("parseInt")));
SetHiddenProperty(vm.Room(), table, numberObject, numberParseIntKey, parseIntTarget);
const numberParseFloatKey = Value.FromString(table.CreateString(Units("parseFloat")));
SetHiddenProperty(vm.Room(), table, numberObject, numberParseFloatKey, parseFloatTarget);
// **数值常量是属性，不是方法**（与 `Math.PI` 同一条规矩）。
// `MAX_SAFE_INTEGER` 是 **2^53-1**（`9007199254740991`）——它**超出 int32**，
// 所以必须是 `FromDouble`（写成 Int32 会溢出成另一个数，而那是最难查的一种「看起来存进去了」）。
// **`MAX_SAFE_INTEGER` 拖着的判据是 `num-float-bits` / `number-constants`**。
SetHiddenProperty(vm.Room(), table, numberObject,
  Value.FromString(table.CreateString(Units("MAX_SAFE_INTEGER"))), Value.FromDouble(9007199254740991));
SetHiddenProperty(vm.Room(), table, numberObject,
  Value.FromString(table.CreateString(Units("MIN_SAFE_INTEGER"))), Value.FromDouble(-9007199254740991));
SetHiddenProperty(vm.Room(), table, numberObject,
  Value.FromString(table.CreateString(Units("EPSILON"))), Value.FromDouble(2.220446049250313e-16));
SetHiddenProperty(vm.Room(), table, numberObject,
  Value.FromString(table.CreateString(Units("MAX_VALUE"))), Value.FromDouble(1.7976931348623157e308));
SetHiddenProperty(vm.Room(), table, numberObject,
  Value.FromString(table.CreateString(Units("MIN_VALUE"))), Value.FromDouble(5e-324));
SetHiddenProperty(vm.Room(), table, numberObject,
  Value.FromString(table.CreateString(Units("POSITIVE_INFINITY"))), Value.FromDouble(Infinity));
SetHiddenProperty(vm.Room(), table, numberObject,
  Value.FromString(table.CreateString(Units("NEGATIVE_INFINITY"))), Value.FromDouble(-Infinity));
SetHiddenProperty(vm.Room(), table, numberObject,
  Value.FromString(table.CreateString(Units("NaN"))), Value.FromDouble(NaN));
const numberKey = Value.FromString(table.CreateString(Units("Number")));
SetHiddenProperty(vm.Room(), table, globals, numberKey, numberObject);
// **`Number.prototype` 与 `Boolean.prototype`**（第 150 轮）：与 `String.prototype` 同款——
// **挂的必须是 `protos.Number` / `protos.Boolean` 那一格**（现造一个新对象的话，
// 原始值接收者那条路找不到它：`(1.5).toFixed(2)` 会报
// `unimplemented: calling a non-closure value`——听起来像调用写错了）。
// **方法挂在原型上**（与字符串那一族相同：`GetProperty` 对原始值接收者
// 从原型上找，`this` 仍然是那个原始值）。
SetHiddenProperty(vm.Room(), table, numberObject, NameValue(table, "prototype"),
  Value.FromObject(protos.Number));
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Number), NameValue(table, "constructor"),
  numberObject);
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Number),
  Value.FromString(table.CreateString(Units("toFixed"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(NumberToFixed, 0)));
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Number),
  Value.FromString(table.CreateString(Units("toString"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(NumberToStringRadix, 0)));
// **`toPrecision` 与 `valueOf`**（第 182 轮）：与上面两个同一格原型
// （`toPrecision` 是 `toFixed` 的同族、`valueOf` 只是「返回接收者自己」）。
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Number),
  Value.FromString(table.CreateString(Units("toPrecision"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(NumberToPrecision, 0)));
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Number),
  Value.FromString(table.CreateString(Units("valueOf"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(NumberValueOf, 0)));
// **`toExponential`**（第 291 轮）：与 `toFixed` / `toPrecision` 同一格原型
//（三格同一张表、只差缺省位数与那个宿主调用，见号那一段）。
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Number),
  Value.FromString(table.CreateString(Units("toExponential"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(NumberToExponential, 0)));
// **`String` 也是一个普通对象**（第 130 轮，与 `Array` / `Number` 同款），
// 上面挂**静态方法** `fromCharCode`。
// **第 145 轮它同时能被调用**：`String(x)` 与 `String.fromCharCode(65)` 一起成立
// （值模型那一格补上了，见 `heap.xl.md` 的 `AttachCallable`）。
const stringObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(stringObject.Ref, StringCtor, 0);
const fromCharCodeKey = Value.FromString(table.CreateString(Units("fromCharCode")));
const fromCharCodeTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(StringFromCharCode, 0));
SetHiddenProperty(vm.Room(), table, stringObject, fromCharCodeKey, fromCharCodeTarget);
// **`String.fromCodePoint`**（第 275 轮）：与 `fromCharCode` **同一张对象**上再挂一格。
// **两者不是一回事**（一个是码元、一个是码位，越界一个夹住一个抛）——
// 所以这一格**不能**指到上面那个号上顶替（指过去就是**静默**换语义，
// `String.fromCodePoint(0x1F600)` 会变成一个越界码元）。
const fromCodePointKey = Value.FromString(table.CreateString(Units("fromCodePoint")));
const fromCodePointTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(StringFromCodePoint, 0));
SetHiddenProperty(vm.Room(), table, stringObject, fromCodePointKey, fromCodePointTarget);
// **`String.raw`**（第 333 轮）：它是**静态**（`String.raw\`…\``），
// 所以挂在这一张**构造函数对象**上——**不是** `protos.String` 上
//（挂到原型上就是「所有字符串都有 `.raw()`」，而 JS 里 `"x".raw` 是 `undefined`）。
// 第一版就是挂在原型那张表里的，症状是 `` String.raw`a` `` 报
// `cannot call a non-closure value`（**离现场很远**）。
const rawKey = Value.FromString(table.CreateString(Units("raw")));
const rawTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(StringRaw, 0));
SetHiddenProperty(vm.Room(), table, stringObject, rawKey, rawTarget);
const stringKey = Value.FromString(table.CreateString(Units("String")));
SetHiddenProperty(vm.Room(), table, globals, stringKey, stringObject);
// **`String.prototype` / `Object.prototype`**（第 137 轮）：与 `Array` 同款
// （两个都是普通对象）。**`"x" instanceof String` 在 JS 里是 `false`**——
// 原始值不是对象——所以这一格在 `instanceof` 上只对**装箱过的**字符串有意义，
// 而本仓不装箱：这一格今天的作用是「原型链有个正经的落点」（不是「字符串 instanceof」）。
SetHiddenProperty(vm.Room(), table, stringObject, NameValue(table, "prototype"),
  Value.FromObject(protos.String));
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.String), NameValue(table, "constructor"),
  stringObject);
// **`Boolean` 是这一族里最新的一格**（第 145 轮）：它原来**连全局名都不是**
// （`GlobalNames` 里没有它 → 降级期就报 `name is not a local or a capture: Boolean`）。
// **第 145 轮它没有 `prototype`、第 150 轮补上了**：`Boolean.prototype` 在 JS 里是有的，
// 而 `true.toString()` 正要从那一格上找方法（本仓**仍然不装箱**——
// `true instanceof Boolean` 在 JS 里本来就是 `false`，
// 而 `new Boolean(true) instanceof Boolean` 那条路要装箱，与 `new String(1)` 同一条）。
const booleanObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(booleanObject.Ref, BooleanCtor, 0);
const booleanKey = Value.FromString(table.CreateString(Units("Boolean")));
SetHiddenProperty(vm.Room(), table, globals, booleanKey, booleanObject);
// **`Boolean.prototype` + `constructor` + `toString`**（第 150 轮）：
// 与 `String.prototype` / `Number.prototype` 同款——**挂的必须是 `protos.Boolean`**
// （现造一个新对象的话，原始值接收者那条路找不到它）。
SetHiddenProperty(vm.Room(), table, booleanObject, NameValue(table, "prototype"),
  Value.FromObject(protos.Boolean));
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Boolean), NameValue(table, "constructor"),
  booleanObject);
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Boolean),
  Value.FromString(table.CreateString(Units("toString"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(BooleanToString, 0)));
// **`Boolean.prototype.valueOf`**（第 182 轮）：与 `Number.prototype.valueOf` 同一支实现。
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Boolean),
  Value.FromString(table.CreateString(Units("valueOf"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(BooleanValueOf, 0)));
// **`Function` 与它的原型**（第 228 轮）——`FunctionCall` / `FunctionApply` / `FunctionBind`
// 三格就挂在这里。
//
// **它为什么现在才出现**：`f.call(...)` 这条写法要两件事同时成立——
// ① 闭包身上有 `Proto`（第 228 轮在 `vm.xl.md` 的 `MakeClosure` 补上了：
//    原来 `typeof greet.call` 给 `"undefined"`，报的是 `calling a non-closure value`）；
// ② `protos.Function` 上**真的挂着**那三格（这一处）。
// **两件缺一件都不行**：只补①就是「找得到原型、原型上什么都没有」（还是 `undefined`）。
//
// **`Function` 是「普通对象 + 可调用载荷」**（与 `Array` / `Number` / `String` 同款）：
// 于是 `Function.prototype === Function.prototype` 成立、`typeof Function` 给 `"function"`。
// **`new Function("…")` 不做**（那是编译期的事）——载荷落在 `FunctionCtor` 那一格上，
// 而 `FunctionCtor` 在 `InvokeGlobal` 里**没有分支** ⇒ 调它报
// `unimplemented: builtin id 343`（**响亮地说「没做」**，不是静默给 `undefined`）。
const functionObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(functionObject.Ref, FunctionCtor, 0);
const functionKey = Value.FromString(table.CreateString(Units("Function")));
SetHiddenProperty(vm.Room(), table, globals, functionKey, functionObject);
SetHiddenProperty(vm.Room(), table, functionObject, NameValue(table, "prototype"),
  Value.FromObject(protos.Function));
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Function), NameValue(table, "constructor"),
  functionObject);
// **三格方法**：`call` / `apply` / `bind`——**隐藏挂**（与 `Object.prototype` 那三格同一条
// 规矩：`for..in` 不该看见它们，而 `Object.keys(Function.prototype)` 在 JS 里是空数组）。
//
// **第 350 轮：四格方法改成「带载荷的对象」**（**实测撞到的**）：
// 它们原来挂的是**光秃秃的宿主引用**——而宿主引用**没有属性表** ⇒
// `Function.prototype.call.length` 永远给 `undefined`
//（判据 `c291-function-prototype-shape`：Node 给 `1`、本仓给 `undefined`）。
// **JS 里它们是函数、函数有 `length`** ⇒ 做成「对象 + 可调用载荷」（第 145 轮那一款）：
// 对象照旧能被调（同一个能力号）、`typeof` 也给 `"function"`，
// 而多出来的一张属性表正好用来放 `length`。**`length` 也隐藏挂**
//（`Object.keys(Function.prototype)` 在 JS 里是空数组——那四格的**值**不进枚举）。
//
// **`BoundTargetKey` / `BoundThisKey` / `BoundArgsKey` 三格字符串也要造**
// （它们是**属性名**，脚本看不见、也没有人会念出它们）——造在 `protos.Function` 上
// 是**故意的**（`GetProperty` 从接收者沿链找，而 `bound` 那个对象的原型就是 `protos.Object`，
// 根本到不了这里）。真正需要它们的是 `BoundCall` 那一支里那句
// `Value.FromString(BoundTargetKey)`——**同一个句柄、同一张表的两处**。
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Function),
  Value.FromString(table.CreateString(Units("call"))),
  MethodObject(vm.Room(), table, protos, FunctionCall, 1));
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Function),
  Value.FromString(table.CreateString(Units("apply"))),
  MethodObject(vm.Room(), table, protos, FunctionApply, 2));
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Function),
  Value.FromString(table.CreateString(Units("bind"))),
  MethodObject(vm.Room(), table, protos, FunctionBind, 1));
// **第四格：`toString`**（第 334 轮）——与那三格**同一条口径**（隐藏挂：
// `Object.keys(Function.prototype)` 在 JS 里是空数组）。
//
// **它为什么必须是「隐藏」而不是普通属性**：`Object.keys(Function.prototype)` 与
// `for..in` 都不该看见它——这三格一直是用 `SetHiddenProperty` 挂的（第 228 轮），
// 第四格跟着走（**同一族的东西用同一个手法**，别的地方也不用再想一遍）。
// **`Function.prototype` 自己的 `length` 与 `name` 是第 690 轮**量出来、又放回去的一格
//（**实测撞到 40 条回归**，见下）。
//
// JS 里 `Function.prototype` 自己也是一个函数对象（`typeof` 给 `"function"`），
// 所以它也该有 `length`（`0`）与 `name`（`""`）——第 690 轮照着上面五格**隐藏挂**了上去，
// 判据 `122-names-function-proto` 当场转绿。
//
// **可它把 40 条用例一起弄红了**（`089-function-tostring-and-name`：
// node 给 `named 2 true`、本仓给 ` 0 true`）：`props.xl.md` 里**可调用接收者**取属性
// 走的是「先自有、再 `protos.Function`、最后才是闭包载荷」那条路
//（第 228 轮为 `.call` 那一族写的），而 `length` / `name` 在**闭包载荷**上
//（`Arity` / `Name`，第 291 轮）——原型上多了同名两格，**先命中的就是原型那一格**，
// 于是每一个函数的 `f.name` 都变成 `""`、`f.length` 都变成 `0`。
// **这不是「补一格」能收的**：要收它得把「闭包载荷那两格」提到
// `protos.Function` **之前**判（`props.xl.md` 那一段的次序），那是另一件事。
// 格回来了，量出来的话留在这一条注释里。
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Function),
  Value.FromString(table.CreateString(Units("toString"))),
  MethodObject(vm.Room(), table, protos, FunctionToString, 0));
// **`protos.Function` 自己那两格：`length`（`0`）与 `name`（`""`）**（第 731 轮）——
// JS 里 `Function.prototype` **本身就是一个函数对象**（`typeof` 给 `"function"`，
// 第 690 轮 `RtTypeOf` 那一格量的就是它），所以它也**自有**这两格
//（判据 `stdlib/object/122-names-function-proto`：Node 给 `0` 与 `""`）。
//
// **第 690 轮挂过一次、当场撤回**（**实测 40 条回归**）：当时 `props.xl.md` 里
// 「可调用接收者」那一趟**排在闭包载荷之前**，于是 `protos.Function` 上的这两格
// 把**每一个函数**的 `f.name` / `f.length` 顶掉了（`089-function-tostring-and-name`：
// node 给 `named 2 true`、本仓给 ` 0 true`）。第 731 轮把**闭包载荷那两格提到那一趟
// 之前**（`props.xl.md` 的 `GetProperty`），两处才一起成立——**两半是同一件事**，
// 只挂这一半就是那次 40 条回归。
//
// **挂成隐藏**（`SetHiddenProperty`，与上面四格同一条口径）：
// `Object.keys(Function.prototype)` 在 JS 里是空数组。
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Function),
  Value.FromString(table.CreateString(Units("length"))), Value.FromInt(0));
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Function),
  Value.FromString(table.CreateString(Units("name"))),
  Value.FromString(table.CreateString([])));
// **函数那三族：原型上的 `constructor` 与构造对象自己那三格**（第 730 轮）——
// `GeneratorFunction` / `AsyncFunction` / `AsyncGeneratorFunction`。
//
// **为什么要有这三格**：`Object.prototype.toString.call(function* () {})` 在 Node 里是
// `"[object GeneratorFunction]"`、`(async function () {}).constructor.name` 是
// `"AsyncFunction"`——两处的来处**都是**「这个函数值的原型是哪一格」：
// 前者读**原型上那一格 `Symbol.toStringTag`**（规范里 `Object.prototype.toString`
// 的第一步就是取 `@@toStringTag`），后者读 **`原型.constructor.name`**。
// **原型本身由引擎造**（`props.xl.md` 的 `InitProtos`——`MakeClosure` 在闭包出生
// 那一刻就要指过去），**这两格属性由这一层挂**：与 `Error.prototype` / `Map.prototype`
// 那几处**同一条分界**（「结构由引擎提供、内容由语言层给」）。
//
// **它们是「普通对象 + 一格可调用载荷」**（与 `Function` / `Array` 那一族同款，
// 第 145 轮）：JS 里 `%GeneratorFunction%` 是一个**真函数**（`typeof` 给 `"function"`，
// `(function* () {}).constructor.constructor === Function`），而本仓的普通对象
// `typeof` 给 `"object"`——**判据 `probe697-p12` 量的正是这一格**
//（`typeof (async function () {}).constructor`：Node 给 `"function"`）。
// 挂上载荷之后两件事同时成立：`typeof` 对了、属性表也有了。
//
// **载荷号借 `FunctionCtor` 那一格**（343）：JS 里这三个构造干的正是
// `Function("…")` 同一件事——**从源码现造一个函数**（只是造出来的那一档不同），
// 而本仓**没有动态代码生成**（`FunctionCtor` 在 `InvokeGlobal` 里**没有分支**，
// 调它报 `unimplemented: builtin id 343`）。借同一格不是省事：
// 「`new Function` 那一族还没做」就是**同一件事**，所以错误文本也该是同一句
// ——新开一格只会让同一个缺口有两种说法。
//
// **三格都挂成不可枚举**（`SetHiddenProperty`）：JS 里
// `Object.keys(Object.getPrototypeOf(function* () {}))` 是 `[]`、
// `Object.keys(function* () {}.constructor)` 也是 `[]`。
//
// **名单与句柄两条数组按下标对齐**（与上面 `Reflect` 那一处同一个写法）：
// 加第四族只改这两行，不用再抄一遍循环体。
const functionKindNames: string[] = ["GeneratorFunction", "AsyncFunction", "AsyncGeneratorFunction"];
const functionKindProtos: number[] = [protos.GeneratorFunction, protos.AsyncFunction,
  protos.AsyncGeneratorFunction];
for (let i = 0; i < functionKindNames.length; i++) {
  const kindProto = Value.FromObject(functionKindProtos[i]);
  const kindObject = NewPlainObject(vm.Room(), table, protos);
  table.AttachCallable(kindObject.Ref, FunctionCtor, 0);
  SetHiddenProperty(vm.Room(), table, kindObject, NameValue(table, "name"),
    Value.FromString(table.CreateString(Units(functionKindNames[i]))));
  SetHiddenProperty(vm.Room(), table, kindObject, NameValue(table, "length"), Value.FromInt(1));
  SetHiddenProperty(vm.Room(), table, kindObject, NameValue(table, "prototype"), kindProto);
  SetHiddenProperty(vm.Room(), table, kindProto, NameValue(table, "constructor"), kindObject);
}
// **`protos.Function` 三格方法** 与 **`protos.Generator.next`** 都在这一带挂上。
//
// **生成器那一格**（第 229 轮）：生成器对象**没有属性表**（它就是 `HeapObject`
// 上那一格 `Generator` 载荷），所以 `it.next()` 里的 `next` 只能**沿原型链**找——
// `protos.Generator` 就是那一格（`InitProtos` 造的）。
// **挂的是一个「带可调用载荷的对象」**：载荷号是 `GeneratorNextId`，
// 而**引擎自己**认这个号（它不发回宿主，见 `vm.xl.md` 的 `IsGeneratorNext`）。
// **为什么不把 `next` 做成一个普通宿主方法**：走一步生成器要发 `iter_next`，
// 那是**指令**，宿主侧的内建调不到它。
const generatorNext = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(generatorNext.Ref, GeneratorNextId, 0);
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Generator),
  Value.FromString(table.CreateString(Units("next"))), generatorNext);
// **`return` / `throw` 两格**（第 313 轮）：与 `next` **同一个形状**
//（带可调用载荷的对象、载荷号由引擎认）。
// **`throw` 那一格今天真的能用**（引擎在挂起点抛出）；
// **`return` 那一格会响亮地抛**（理由见号那一段——它要跑 `finally` 链，
// 而那条链是降级期的构造）。**挂上去比空着好**：空着报的是
// `cannot call a non-closure value`（听起来像「脚本写错了」），
// 挂上去报的是「还差什么」。
const generatorReturn = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(generatorReturn.Ref, GeneratorReturnId, 0);
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Generator),
  Value.FromString(table.CreateString(Units("return"))), generatorReturn);
const generatorThrow = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(generatorThrow.Ref, GeneratorThrowId, 0);
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Generator),
  Value.FromString(table.CreateString(Units("throw"))), generatorThrow);
// **同一批方法还要挂到异步生成器那一格上**（第 320 轮）——**不能靠继承**：
// 异步生成器的原型指 `Object`（`props.xl.md` 写着理由：继承 `Generator` 会**顺带**
// 得到 `Symbol.iterator`，而 JS 里异步生成器**没有**那一格——判据
// `c320-ex-generator-interface-shapes` 当场把它拦下来了）。
// **同一个实现、两处挂载**：能力号与上面那三个对象**完全一样**
//（`next` / `return` / `throw` 的语义两族本来就一致），所以这不是两份实现。
if (protos.AsyncGenerator > 0) {
  const asyncGeneratorProto = Value.FromObject(protos.AsyncGenerator);
  SetHiddenProperty(vm.Room(), table, asyncGeneratorProto,
    Value.FromString(table.CreateString(Units("next"))), generatorNext);
  SetHiddenProperty(vm.Room(), table, asyncGeneratorProto,
    Value.FromString(table.CreateString(Units("return"))), generatorReturn);
  SetHiddenProperty(vm.Room(), table, asyncGeneratorProto,
    Value.FromString(table.CreateString(Units("throw"))), generatorThrow);
}
// **`parseInt` / `parseFloat` 是全局函数**（不是某个对象的方法）。
const parseIntKey = Value.FromString(table.CreateString(Units("parseInt")));
SetHiddenProperty(vm.Room(), table, globals, parseIntKey, parseIntTarget);
const parseFloatKey = Value.FromString(table.CreateString(Units("parseFloat")));
SetHiddenProperty(vm.Room(), table, globals, parseFloatKey, parseFloatTarget);
// **`queueMicrotask` 也是全局函数**（第 332 轮）——与上面两个同一形状。
// **它的能力号在承诺那一段**（`PromiseQueueMicrotask = 250`）：那一支手上才有
// 「把一次调用排进微任务队列」那条通道（`schedule`）——理由写在 `promise.xl.md` 那一段。
const queueMicrotaskKey = Value.FromString(table.CreateString(Units("queueMicrotask")));
SetHiddenProperty(vm.Room(), table, globals, queueMicrotaskKey,
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(PromiseQueueMicrotask, 0)));
// **`structuredClone` 也是全局函数**（第 338 轮）——与上面三个同一形状
//（`String.raw` 那次踩过「挂在原型上 ⇒ cannot call a non-closure value」，
//  所以这里照旧挂在**全局对象**上）。
const structuredCloneKey = Value.FromString(table.CreateString(Units("structuredClone")));
SetHiddenProperty(vm.Room(), table, globals, structuredCloneKey,
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(StructuredCloneId, 0)));

// **`Reflect`**（第 717 轮）：与 `Math` **同一个形状**（普通对象 + 隐藏挂上的方法）——
// 名字与号**按下标一一对齐**，理由见 `ReflectApply` 那一段。
// **方法一律不可枚举**（`SetHiddenProperty`）：JS 里 `Object.keys(Reflect)` 是 `[]`
// （第 709 轮给 `Math` / `JSON` 那一族改的就是这一格，同一句）。
const reflect = NewPlainObject(vm.Room(), table, protos);
const reflectNames: string[] = ["apply", "construct", "defineProperty", "deleteProperty", "get",
  "getOwnPropertyDescriptor", "getPrototypeOf", "has", "isExtensible", "ownKeys",
  "preventExtensions", "set", "setPrototypeOf"];
const reflectIds: number[] = [ReflectApply, ReflectConstruct, ReflectDefineProperty, ReflectDeleteProperty,
  ReflectGet, ReflectGetOwnPropertyDescriptor, ReflectGetPrototypeOf, ReflectHas, ReflectIsExtensible,
  ReflectOwnKeys, ReflectPreventExtensions, ReflectSet, ReflectSetPrototypeOf];
for (let i = 0; i < reflectNames.length; i++) {
  const key = Value.FromString(table.CreateString(Units(reflectNames[i])));
  const target = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(reflectIds[i], 0));
  SetHiddenProperty(vm.Room(), table, reflect, key, target);
}
const reflectKey = Value.FromString(table.CreateString(Units("Reflect")));
SetHiddenProperty(vm.Room(), table, globals, reflectKey, reflect);

const mathKey = Value.FromString(table.CreateString(Units("Math")));
const consoleKey = Value.FromString(table.CreateString(Units("console")));
const objectKey = Value.FromString(table.CreateString(Units("Object")));
const jsonKey = Value.FromString(table.CreateString(Units("JSON")));
SetHiddenProperty(vm.Room(), table, globals, mathKey, math);
SetHiddenProperty(vm.Room(), table, globals, consoleKey, consoleObject);
SetHiddenProperty(vm.Room(), table, globals, objectKey, objectObject);
SetHiddenProperty(vm.Room(), table, globals, jsonKey, jsonObject);
// **`Object.prototype`**（第 137 轮）：与 `Array` / `String` 同款（`Object` 也是普通对象）。
SetHiddenProperty(vm.Room(), table, objectObject, NameValue(table, "prototype"),
  Value.FromObject(protos.Object));
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Object), NameValue(table, "constructor"),
  objectObject);
// **`Object.prototype.valueOf` / `toString`**（第 198 轮）：`ToPrimitive` 普通那一支的两步
//（`valueOf` 先、`toString` 后），挂的必须是 `protos.Object`
//（现造一个新对象的话，普通对象那条原型链找不到它——与 `Number.prototype` 那条同一个坎）。
// **用 `SetHiddenProperty`**（第 194 轮）：JS 里这两个方法本来就**不可枚举**，
// 所以 `Object.keys({})` 必须还是空的——挂成普通属性的话它当场变成 2（**静默错值**）。
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Object),
  Value.FromString(table.CreateString(Units("valueOf"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectValueOf, 0)));
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Object),
  Value.FromString(table.CreateString(Units("toString"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectToString, 0)));
// **`hasOwnProperty`**（第 209 轮）：与上面两格**同一条路**（`Object.prototype` 上的方法、
// **隐藏**挂上——`Object.keys({})` 必须还是空的，挂成普通属性它当场变成 3，**静默错值**）。
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Object),
  Value.FromString(table.CreateString(Units("hasOwnProperty"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectHasOwnProperty, 0)));
// **`isPrototypeOf`**（第 304 轮）：与上面三格**同一条路**（`Object.prototype` 上的方法、
// **隐藏**挂上——`Object.keys({})` 必须还是空的）。**它与 `hasOwnProperty` 是同一族的两半**：
// 一个只问**自己**那一格、一个问**整条链**上有没有某一格。
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Object),
  Value.FromString(table.CreateString(Units("isPrototypeOf"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectIsPrototypeOf, 0)));
// **`propertyIsEnumerable`**（第 372 轮）：与上面四格**同一条路**
//（`Object.prototype` 上的方法、**隐藏**挂上——`Object.keys({})` 必须还是空的）。
// **它是 `hasOwnProperty` 的另一半**：一个问「在不在」、一个问「在、而且可枚举吗」，
// 所以这一格**挨着 `hasOwnProperty` 挂**（两处放远了看不出它们是一对）。
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Object),
  Value.FromString(table.CreateString(Units("propertyIsEnumerable"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectPropertyIsEnumerable, 0)));
// **`toLocaleString`**（第 689 轮）：与上面五格**同一条路**（`Object.prototype` 上的方法、
// **隐藏**挂上）。**为什么挨着 `toString` 挂**：它是 `toString` 的**同一件事**
//（规范里只有一句转交），放远了看不出这一点。
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Object),
  Value.FromString(table.CreateString(Units("toLocaleString"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectToLocaleString, 0)));
// **`__proto__` 那个访问器**（第 697 轮，**判据 `exec/decorators-modifiers/051-beh-proto-accessor`
// 与 `exec/expressions/128-beh-setproto-change` 钉着它**）：`Object.prototype.__proto__`。
// 原来那一格**根本没装** ⇒ 读 `o.__proto__` 给 `undefined`；而**写**它更坏：
// `SetProperty` 对不存在的键造的是**数据属性** ⇒ `o.__proto__ = proto` 写出一格
// **叫 `__proto__` 的普通自有属性**，链**一点没变**——
// `o.greet` 是 `undefined`、而 `o.__proto__ === proto` 却为**真**（**半对**，最难查的一种）。
//
// **必须走 `DefineAccessor`**（与 `Map.prototype.size` 第 613 轮**同一条教训**）：
// `SetProperty` 造的是数据属性，造不出访问器。
// **不可枚举**（Node 那边 `Object.getOwnPropertyDescriptor(Object.prototype, "__proto__")`
// 给 `{ enumerable: false, configurable: true }`）。
// **`Object.keys({})` 必须还是空的**——这一格是**访问器**，而按上面那一条它不进枚举。
DefineAccessor(vm.Room(), vm.Table, Value.FromObject(protos.Object),
  Value.FromString(table.CreateString(Units("__proto__"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectProtoGet, 0)),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectProtoSet, 0)), false);
// **`__lookupGetter__` / `__lookupSetter__` / `__defineGetter__` / `__defineSetter__`**
// （第 706 轮）：与上面七格**同一条路**（`Object.prototype` 上的方法、**隐藏**挂上——
// `Object.keys({})` 必须还是空的）。
// **为什么这一轮才补**：它们是 Annex B 的附加属性（不在 ES 主线里），而本仓按
// 「ES 主线的成员表」建库 ⇒ 四格一直空着。判据 `stdlib/object/118-names-object-proto.ts`
// 就是挨个问名字的那一条——它原来登着**六处**差额（`__proto__` / `toLocaleString` +
// 这四格），前两处第 697 / 689 轮各收掉一格，**剩下的四格是这一轮**。
// **挨着 `__proto__` 那一对挂**：它们同属「老访问器辅助」这一族，放远了看不出是一家人。
// **号连号**（`507..510`）：两格是**读**那一对、两格是**写**那一对——
// 读的两格共用一支（只差「取描述符的哪一格」）、写的两格同理。
const protoHelperNames: string[] = ["__lookupGetter__", "__lookupSetter__", "__defineGetter__", "__defineSetter__"];
const protoHelperIds: number[] = [ObjectLookupGetter, ObjectLookupSetter, ObjectDefineGetter, ObjectDefineSetter];
for (let i = 0; i < protoHelperNames.length; i++) {
  SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Object),
    Value.FromString(table.CreateString(Units(protoHelperNames[i]))),
    Value.FromRef(ValueTag.HostRef, table.CreateHostRef(protoHelperIds[i], 0)));
}
// **`Object.create` / `Object.getPrototypeOf`**（第 209 轮）：与 `keys` / `values` 那几张
// **同一张对象**（都是 `Object` 的静态方法），分派在 `InvokeGlobal` 里（那一支有 `table`）。
SetHiddenProperty(vm.Room(), table, objectObject,
  Value.FromString(table.CreateString(Units("create"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectCreate, 0)));
SetHiddenProperty(vm.Room(), table, objectObject,
  Value.FromString(table.CreateString(Units("getPrototypeOf"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectGetPrototypeOf, 0)));
SetHiddenProperty(vm.Room(), table, objectObject,
  Value.FromString(table.CreateString(Units("getOwnPropertyNames"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectGetOwnPropertyNames, 0)));
// **`Object.getOwnPropertySymbols`**（第 288 轮）：与 `getOwnPropertyNames` **挨着挂**
//（同一族、同一趟扫描、同一个 `417` 的号——放远了看不出它们是镜像）。
SetHiddenProperty(vm.Room(), table, objectObject,
  Value.FromString(table.CreateString(Units("getOwnPropertySymbols"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectGetOwnPropertySymbols, 0)));
SetHiddenProperty(vm.Room(), table, objectObject,
  Value.FromString(table.CreateString(Units("fromEntries"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectFromEntries, 0)));
// **`Object` 这个名字自己可以被调、也可以被 `new`**（第 232 轮）：
// 它原来只是「一格普通对象 + 一堆静态方法」——于是 `Object({ a: 1 })` 报
// `calling a non-closure value`、`new Object(null)` 报
// `calling an object as a constructor (this object is not callable)`
// （判据 `global-array-object-ctors` 现场红的）。
// **补的就是这一句**：给它挂上可调用载荷（与 `Array` / `String` / `Function` 同款）——
// 分派在 `InvokeGlobal` 的 `ObjectCtor` 那一支。
// **`AttachCallable` 落在那一格对象自己身上**（不是 `protos.Object` 上）：
// 挂到 `protos.Object` 就是「所有普通对象都可调用」（**静默错值**，而且整份脚本都受影响）。
table.AttachCallable(objectObject.Ref, ObjectCtor, 0);
const undefinedKey = Value.FromString(table.CreateString(Units("undefined")));
SetHiddenProperty(vm.Room(), table, globals, undefinedKey, Value.Undefined(), 0);
// **`NaN` / `Infinity` 也是全局对象上的属性**（第 149 轮）：与 `undefined` 同一条路——
// 它们是**只读**的（JS 里 `Infinity = 1` 在严格模式下抛）。
// **第 709 轮把「只读」那一格补上了**：`SetHiddenProperty` 的第六格给 `0`
// 就是「不可写、不可枚举、不可配置」——正是 Node 上问这三格描述符得到的答案。
// **原来那一段注释写着「这一层没有『只读』那一格」**：那个说法在
// `SetHiddenProperty` 收下 `flags` 之后就不再成立了（常量那一族的标志位同一条）。
// 值本身是 `Float64`（`NaN` 用 `Value.FromDouble(NaN)`——与 `0 / 0` 算出来的**同一档**）。
const nanKey = Value.FromString(table.CreateString(Units("NaN")));
SetHiddenProperty(vm.Room(), table, globals, nanKey, Value.FromDouble(NaN), 0);
const infinityKey = Value.FromString(table.CreateString(Units("Infinity")));
SetHiddenProperty(vm.Room(), table, globals, infinityKey, Value.FromDouble(Infinity), 0);
// **全局的 `isNaN` / `isFinite`**（第 149 轮）——与 `Number.isNaN` / `Number.isFinite`
// 是**两个**东西（那两个挂在上面的 `Number` 对象上），所以这里各挂一格。
SetHiddenProperty(vm.Room(), table, globals,
  Value.FromString(table.CreateString(Units("isNaN"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(IsNaN, 0)));
SetHiddenProperty(vm.Room(), table, globals,
  Value.FromString(table.CreateString(Units("isFinite"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(IsFinite, 0)));
// **百分号编解码四个名字**（第 311 轮）：与 `isNaN` / `isFinite` **同一条路**
//（全局对象上的四个函数）——`GlobalNames` 那张名单里也有它们（**两边是同一份约定**）。
const percentNames: string[] = ["encodeURI", "encodeURIComponent", "decodeURI", "decodeURIComponent"];
const percentIds: number[] = [EncodeURI, EncodeURIComponent, DecodeURI, DecodeURIComponent];
for (let i = 0; i < percentNames.length; i++) {
  SetHiddenProperty(vm.Room(), table, globals,
    Value.FromString(table.CreateString(Units(percentNames[i]))),
    Value.FromRef(ValueTag.HostRef, table.CreateHostRef(percentIds[i], 0)));
}
// **`globalThis` 指向那个环境对象自己**（第 149 轮）：`globalThis.Math === Math`。
// **加它的直接原因是 `typeof` 那一格的新规矩**：未声明的名字给 `"undefined"`，
// 而 `globalThis` 在 Node 里是 `"object"`——不补这一格就是一处**静默**的不一致。
SetHiddenProperty(vm.Room(), table, globals,
  Value.FromString(table.CreateString(Units("globalThis"))), globals);
// **`Map` 从「宿主引用」改成「带可调用载荷的对象」**（第 327 轮）：
// 它现在要挂一格**静态方法**（`Map.groupBy`），而**宿主引用没有属性表**
// ——与第 183 轮 `Symbol` 那一条**一字不差**（那一次是为了挂知名符号）。
// **两件事都不受影响**：`new Map()` 照旧走 `Op.New` 的宿主那一条
//（`IsHostCallable` **两种壳都认**，第 145 轮）；`instanceof Map` 照旧走登记表
//（`RegisterConstructorProto` 按**号**认，与壳无关）。六道门一起验过。
const mapObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(mapObject.Ref, MapCtor, 0);
const mapKey = Value.FromString(table.CreateString(Units("Map")));
SetHiddenProperty(vm.Room(), table, globals, mapKey, mapObject);
// **`Map.groupBy`**（第 327 轮）：挂在**那个对象**上（它现在有属性表了）。
// **号是 660**（不是 `611`）：`600..610` 满了、`611..659` 是 `Set` 的——见 `map.xl.md`。
SetHiddenProperty(vm.Room(), table, mapObject,
  Value.FromString(table.CreateString(Units("groupBy"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(MapGroupBy, 0)));
// `Set` 从前是**宿主的引用值**，第 613 轮起改成**可调用对象**（与 `Map` 同款）——
// 理由与 `Map` 那一格一字不差：`Set.name` / `new Set().constructor.name` 要读得到，
// 而宿主引用**没有属性表**（第 343 轮给 `Error` 换壳时踩的就是同一个坎）。
const setKey = Value.FromString(table.CreateString(Units("Set")));
const setObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(setObject.Ref, SetCtor, 0);
const setTarget = setObject;
SetHiddenProperty(vm.Room(), table, globals, setKey, setTarget);
// `Symbol` 从**宿主引用**改成**带可调用载荷的对象**（第 183 轮）：
// 它现在要挂**知名符号**（`Symbol.iterator` 等），而**宿主引用没有属性表**
// （与第 137 轮 `Error.prototype` 那条同一个坎——那边靠 `Protos` 绕开了，
// 而 `Symbol.iterator` 是一格**普通属性**，绕不开）。
// `AttachCallable` 的语义是「对象照旧是对象，只是多了一格能被调」（第 145 轮），
// 所以 `Symbol("x")` 照旧走 `Op.Call`、`typeof Symbol` 照旧给 `"function"`
//（第 145 轮把 `typeof` 那一格改成认「能被调」）。
const symbolObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(symbolObject.Ref, SymbolCtor, 0);
const symbolKey = Value.FromString(table.CreateString(Units("Symbol")));
SetHiddenProperty(vm.Room(), table, globals, symbolKey, symbolObject);
// **`Symbol.for` / `Symbol.keyFor` 两格**（第 277 轮）：与 `String.fromCharCode` 那几格一样，
// **挂在那个全局对象上**（`Symbol` 既是一个普通对象、又带一格可调用载荷——
// 两件事同时成立，见第 145 轮）。
// **注册表不在这一层**：它挂在 `protos.WellKnownSymbols` 上——
// `InvokeGlobal` 手里只有 `protos`（这一层没有模块级可变量），
// 所以「记着谁注册过」这件事只能落在**够得着的那个对象**上（理由见 `SymbolFor` 那一段）。
const symbolStaticNames: string[] = ["for", "keyFor"];
const symbolStaticIds: number[] = [SymbolFor, SymbolKeyFor];
for (let i = 0; i < symbolStaticNames.length; i++) {
  const symbolStaticKey = Value.FromString(table.CreateString(Units(symbolStaticNames[i])));
  const symbolStaticTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(symbolStaticIds[i], 0));
  SetHiddenProperty(vm.Room(), table, symbolObject, symbolStaticKey, symbolStaticTarget);
}
// **知名符号**：每个名字造**一次**——JS 要求 `Symbol.iterator` **永远是同一个值**
//（`o[Symbol.iterator] === o[Symbol.iterator]`、拿它当键的两处要落到同一格）。
// 描述按 JS 的写法给全名（`Symbol.iterator` 的描述就是 `"Symbol.iterator"`）。
// **`vm.Room()` 先落进一个局部量**（第 183 轮）：直接写 `vm.Room()(…)`（**调用一个调用结果**）
// 会踩中投影里那一族还没修的形状——本仓自己的规范文件也是 `cases:tsast` 的**语料**，
// 所以那种写法会让尺子当场变红（实测：`Room` 被投成一个**零宽**的 `Identifier`）。
// 那一格与第 179 轮 `xs[0]()` 是同一族（「调用调用结果」），记在台账里。
const room = vm.Room();
// **知名度名单只写一份**（第 690 轮）：下面两个循环原来各写了一遍同一张字面量
//（一处挂到 `Symbol` 自己身上、一处挂到知名符号表上）——**两处漂了看不出**：
// 症状是「`Symbol.match` 取得到、而引擎那张表里取不到」（或者反过来），
// 而那两条路各自看起来都是对的。名单收成一个局部量之后，加一格只改一行。
//
// **`dispose` / `asyncDispose` 在名单里**：`using` 声明与实现了 `Symbol.dispose` 的类
// （`class C { [Symbol.dispose]() {} }`）都按这两个符号办事。少了它们，`Symbol.dispose`
// 是 `undefined`，于是 `[Symbol.dispose]() {}` 的计算名落到 `set_hidden` 上抛
// `unimplemented: set_hidden with a key that is not a string or a symbol`。
//
// **第 690 轮补上另外七个名字**（`isConcatSpreadable` / `unscopables` 与
// `match` / `replace` / `search` / `split` / `matchAll`）：**名字与协议是两件事**。
// 前两个各有一个协议（`Array.prototype.concat` 的展开开关、`with` 的作用域屏蔽表），
// 后五个是 `RegExp` 协议那一族——**协议本身仍是待做项**（`String.prototype.match`
// 那些格子没装、`RegExp` 也没进降级层），可是 `Symbol.match` **本身就是一个规范里的值**：
// JS 里它**永远存在**，`typeof Symbol.match` 是 `"symbol"`。
// 少了它，`class C { [Symbol.match](s) {} }` 这种写法当场报
// 「`set_hidden` 的键不是字符串也不是符号」——**报的话离现场很远**
//（与 `dispose` 那两格当初缺着时的症状一字不差）。
// **判据**：`150-sym-wellknown-presence`（只问名字）与 `134-symbol-wellknown-more`。
const wellKnownNames: string[] = ["iterator", "asyncIterator", "toPrimitive", "hasInstance",
  "toStringTag", "species", "dispose", "asyncDispose",
  "isConcatSpreadable", "unscopables", "match", "replace", "search", "split", "matchAll"];
for (const wellKnown of wellKnownNames) {
  const fullName = "Symbol." + wellKnown;
  if (!room(ObjectCharge + ValueCharge + CodeUnitCharge * fullName.length)) {
    throw new Error("out of room");
  }
  const described = table.CreateString(Units(fullName));
  const symbol = Value.FromRef(ValueTag.Symbol, table.CreateSymbol(described));
  SetProperty(room, NeverCall, table, symbolObject,
    Value.FromString(table.CreateString(Units(wellKnown))), symbol);
}
// **同一批符号再挂到「知名符号表」上**（第 184 轮）：迭代协议那一侧
// （`install.xl.md` 的 `GetIterator`）只拿得到 `protos`，所以给它一个
// **按名字取符号**的落点——引擎不必认识 `Symbol` 这个全局名。
const wellKnownTable = NewPlainObject(room, table, protos);
for (const wellKnown of wellKnownNames) {
  const symbolKey = Value.FromString(table.CreateString(Units(wellKnown)));
  SetProperty(room, NeverCall, table, wellKnownTable, symbolKey,
    GetProperty(room, NeverCall, protos, table, symbolObject, symbolKey));
}
protos.WellKnownSymbols = wellKnownTable.Ref;
// **全局对象那一格**（第 337 轮）：引擎在**非严格**那条路上要用它当 `this`
//（`vm.xl.md` 的 `DoCallValue`）——与上面那张知名符号表**同一条机制**
//（`props.xl.md` 的 `Protos.Global`：**结构由引擎提供、内容由语言层给**）。
// **`globals` 就在手上**（这一段的开头就是它），所以只是一句赋值。
protos.Global = globals.Ref;
// **`Symbol.toStringTag` 要挂到那几族的原型上**（第 229 轮，第 601 轮补了 `Promise`，
// 第 730 轮补了生成器对象与函数那三族）：
// `Object.prototype.toString.call(new Map())` 在 JS 里是 `"[object Map]"`，
// 那一格**正是** `Map.prototype[Symbol.toStringTag] = "Map"` 供的（`Date` / `Set` / `Promise` 同理）。
// 挂成普通属性（符号键不进 `Object.keys` / `JSON` / `for..in`，所以内建那几条读数不受影响）。
//
// **第 730 轮补的五格**：`Generator` / `AsyncGenerator` 是**生成器对象**那一档
//（`g()` 的成果）、`GeneratorFunction` / `AsyncFunction` / `AsyncGeneratorFunction`
// 是**函数值**那一档（`g` 自己）——四档在 JS 里是四个**不同的**内部对象，
// 标签也各不相同（`"[object Generator]"` vs `"[object GeneratorFunction]"`），
// 而本仓原来两档都给 `"[object Object]"` / `"[object Function]"`（**静默错值**）。
// **函数那三格能生效的前提是闭包出生时指对了原型**（`vm.xl.md` 的 `MakeClosure`）：
// 标签是**沿原型链取**的，原型不对时挂得再对也读不到。
const toStringTagKey = GetProperty(room, NeverCall, protos, table, wellKnownTable,
  Value.FromString(table.CreateString(Units("toStringTag"))));
const tagTargets = [protos.Map, protos.Set, protos.Date, protos.Promise,
  protos.Generator, protos.AsyncGenerator,
  protos.GeneratorFunction, protos.AsyncFunction, protos.AsyncGeneratorFunction];
const tagNames = ["Map", "Set", "Date", "Promise",
  "Generator", "AsyncGenerator",
  "GeneratorFunction", "AsyncFunction", "AsyncGeneratorFunction"];
for (let i = 0; i < tagTargets.length; i++) {
  SetProperty(room, NeverCall, table, Value.FromObject(tagTargets[i]), toStringTagKey,
    Value.FromString(table.CreateString(Units(tagNames[i]))));
}
// **`Array[Symbol.species]`**（第 601 轮）：JS 里它是一个只读访问器，
// getter 返回**接收者**——所以 `class MyArray extends Array {}` 之后
// `MyArray[Symbol.species] === MyArray`（静态成员本来就走构造函数那条原型链，静态 getter 实测也能继承）。
// getter 是语言层的一个宿主引用（`SpeciesGetterId`：把接收者原样给回去）；
// `Array` 是个普通对象，所以直接往它身上挂。不可枚举（与 `prototype` 同一条口径）。
const speciesKey = GetProperty(room, NeverCall, protos, table, wellKnownTable,
  Value.FromString(table.CreateString(Units("species"))));
if (speciesKey.Tag === ValueTag.Symbol) {
  DefineAccessor(room, table, arrayObject, speciesKey,
    Value.FromRef(ValueTag.HostRef, table.CreateHostRef(SpeciesGetterId, 0)), Value.Undefined(), false);
}
// **`Array.prototype[Symbol.iterator]`**（第 308 轮）——JS 里它就是 `values`
//（**同一个函数对象**：`[][Symbol.iterator] === [].values`），所以**指到同一格能力号**
//（`ArrayValues`）——**同一件事不写第二份实现**。
//
// **为什么这一格一直缺着**：引擎的迭代（`for..of`、展开、`Array.from`）走的是
// **指令**那条路（`iter_new` / `iter_next`），**根本不问这一格**——
// 于是 `[...xs]` 一直是对的，而**显式取出来自己调**（`xs[Symbol.iterator]()`）
// 报 `cannot call a non-closure value`。那句话听起来像「迭代器这一套还没做」，
// 真相是**只是没人往这一格挂东西**（与第 274 轮那七格、第 304 轮 `toSpliced` 同一形状）。
// 判据 `c304-std-symbol-iterator-manual` / `c291-array-iterator-protocol-manual` /
// `c305-std-array-iterator-symbol-method` 三条一起拖着它。
//
// **挂的位置与上面那三族的 `toStringTag` 同一处**：`protos.WellKnownSymbols` 刚填好、
// 键就是那张表里那个句柄。**键必须走那张表**（不能现造一个符号）：
// 符号在属性查找里是**按句柄**比的（`props.xl.md`），三处拿到的必须是**同一个**
// ——知名符号的规矩就是「只造一次」（上面那一段写着）。
const arrayIteratorKey = GetProperty(room, NeverCall, protos, table, wellKnownTable,
  Value.FromString(table.CreateString(Units("iterator"))));
if (arrayIteratorKey.Tag === ValueTag.Symbol) {
  SetProperty(room, NeverCall, table, Value.FromObject(protos.Array), arrayIteratorKey,
    Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ArrayValues, 0)));
  // **字符串那一族也要挂**（第 345 轮，**实测撞到的**）：`for..of` / `[...s]`
  // 走的是**引擎**那条 `iter_next`（字符串它自己认），而**手写那一句**
  // `"ab"[Symbol.iterator]()` 走的是**这一格** ⇒ 不挂就报
  // 「cannot call a non-closure value」（判据 `c304-std-symbol-iterator-manual`）。
  // **同一个键**（知名符号只造一次，从同一张小表里取），挂的是**另一个号**
  // （字符串那个迭代器要把码点收成数组，见 `StringIteratorSelf`）。
  SetProperty(room, NeverCall, table, Value.FromObject(protos.String), arrayIteratorKey,
    Value.FromRef(ValueTag.HostRef, table.CreateHostRef(StringIteratorSelf, 0)));
}
// **异步生成器那一格：`Symbol.asyncIterator`**（第 320 轮）——与上面那一条
// **同一个形状**（同一个知名符号表取键、挂一格宿主引用），差的是**挂在别的原型上**。
// **只挂 `AsyncGenerator`**：同步生成器**没有**这一格（JS 里那里是 `TypeError`）——
// 挂到 `Generator` 上就是**说谎**（判据 `c305-ex-async-generator-interface-type`
// 只问异步那一侧，而「同步那侧不该有」这一条**写在注释里**：矩阵里还没有那一格，
// 补一条是下一轮的事）。
const asyncIteratorKey = GetProperty(room, NeverCall, protos, table, wellKnownTable,
  Value.FromString(table.CreateString(Units("asyncIterator"))));
if (asyncIteratorKey.Tag === ValueTag.Symbol && protos.AsyncGenerator > 0) {
  SetProperty(room, NeverCall, table, Value.FromObject(protos.AsyncGenerator), asyncIteratorKey,
    Value.FromRef(ValueTag.HostRef, table.CreateHostRef(AsyncGeneratorSelf, 0)));
}
// **同步生成器那一格：`Symbol.iterator`**（第 320 轮，做上面那一格时顺手量到的）
// ——挂 `Generator`（异步生成器**继承**它，所以两族都有，与 JS 一致）。
const generatorIteratorKey = GetProperty(room, NeverCall, protos, table, wellKnownTable,
  Value.FromString(table.CreateString(Units("iterator"))));
if (generatorIteratorKey.Tag === ValueTag.Symbol && protos.Generator > 0) {
  SetProperty(room, NeverCall, table, Value.FromObject(protos.Generator), generatorIteratorKey,
    Value.FromRef(ValueTag.HostRef, table.CreateHostRef(GeneratorSelf, 0)));
}
// **`Map.prototype[Symbol.iterator]` / `Set.prototype[Symbol.iterator]`**（第 712 轮）
// ——与上面第 308 轮 `Array.prototype[Symbol.iterator]` 是**同一副面孔**。
//
// **为什么它在矩阵里是红的**：`for..of` / 展开走的是**语言层那条 `GetIterator`**
// （`install.xl.md`：它按 `Symbol.iterator` **协议**把 `Map` / `Set` 物化成数组），
// **根本不问原型这一格**——于是 `for (const [k, v] of m)` 一直是对的，
// 而**显式取出来自己调**（`m[Symbol.iterator]()`）报 `cannot call a non-closure value`。
// 那句话听起来像「集合的迭代这一套还没做」，真相是**只是没人往这一格挂东西**
// （与第 308 轮数组那一格、第 341 轮 `Map` / `Set` 的方法搬原型同一形状）。
// 判据 `exec/round711/p711c-c07`（`typeof (new Map())[Symbol.iterator]` 该是 `"function"`）
// 量的就是这一格。
//
// **挂的是同一格能力号**（**同一件事不写第二份实现**）：
// JS 里 `Map.prototype[Symbol.iterator] === Map.prototype.entries`、
// `Set.prototype[Symbol.iterator] === Set.prototype.values`——两处都是**同一个函数对象**，
// 所以这里指到 `InstallMapMethods` / `InstallSetMethods` 已经挂出去的那两个号
// （`MapEntries` / `SetValues`，号落在集合段 600..610 / 611..659 里，两张名字表都有它们）。
//
// **位置只能在这里**（**实测踩过**）：第一版写在 `install.xl.md` 的 `InstallBuiltins` 里
// （与 `InstallMapPrototype` 并排，看起来更「同一件事放一处」），
// 而那一句跑在 **`BuildGlobals` 之前**（`tsrun.xl.md` 的顺序：`InstallBuiltins` 先、
// `BuildGlobals` 那一份模块后求值）⇒ `protos.WellKnownSymbols` 还是 `0`、
// 取键拿到 `undefined`、**静默什么都不挂**。放在这里就对了：**符号表刚填好**
// （上面那句赋值），`protos.Map` / `protos.Set` 也早在 `CreateProtos` 里造好了。
const mapIteratorKey = GetProperty(room, NeverCall, protos, table, wellKnownTable,
  Value.FromString(table.CreateString(Units("iterator"))));
if (mapIteratorKey.Tag === ValueTag.Symbol && protos.Map > 0 && protos.Set > 0) {
  SetProperty(room, NeverCall, table, Value.FromObject(protos.Map), mapIteratorKey,
    Value.FromRef(ValueTag.HostRef, table.CreateHostRef(MapEntries, 0)));
  SetProperty(room, NeverCall, table, Value.FromObject(protos.Set), mapIteratorKey,
    Value.FromRef(ValueTag.HostRef, table.CreateHostRef(SetValues, 0)));
}
// `Date` 是一个**普通对象**（像 `Math` 一样），上面挂 `now`——
// 而 `now` 指向的是**宿主**要回答的能力号（见 `ClockNow` 的说明：建库层没有时钟）。
// **第 145 轮它同时是构造函数**：`new Date(ms)` 不再靠降级层那条特例
// （`const D = Date; new D(0)` 现在也对），而 `Date.now()` 照旧走属性。
const dateObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(dateObject.Ref, DateCtor, 0);
const nowKey = Value.FromString(table.CreateString(Units("now")));
const nowTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ClockNow, 0));
SetHiddenProperty(vm.Room(), table, dateObject, nowKey, nowTarget);
// **`Date.UTC`**（第 280 轮）：与 `now` **同一张对象**上再挂一格
//（`Date` 既是对象、也能被 `new`——两件事同时成立，见第 145 轮）。
const utcKey = Value.FromString(table.CreateString(Units("UTC")));
const utcTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(DateUTC, 0));
SetHiddenProperty(vm.Room(), table, dateObject, utcKey, utcTarget);
// **`Date.parse`**（第 293 轮）：与 `now` / `UTC` **同一张对象**上再挂一格
//（`Date` 既是对象、也能被 `new`——两件事同时成立，见第 145 轮）。
const dateParseKey = Value.FromString(table.CreateString(Units("parse")));
const dateParseTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(DateParse, 0));
SetHiddenProperty(vm.Room(), table, dateObject, dateParseKey, dateParseTarget);
const dateKey = Value.FromString(table.CreateString(Units("Date")));
SetHiddenProperty(vm.Room(), table, globals, dateKey, dateObject);
// **`Promise`**（第 185 轮）：值由 `promise.xl.md` 造（那里有四个静态方法），
// 这里只负责**挂进全局对象**——与 `Date` 那一格同一个形状
// （既是对象、也能被 `new`）。
const promiseKey = Value.FromString(table.CreateString(Units("Promise")));
const promiseObject = BuildPromise(vm, protos);
SetHiddenProperty(vm.Room(), table, globals, promiseKey, promiseObject);
// **`Promise` 自己的 `name` 与 `prototype`**（第 613 轮）：与 `Map` / `Set` 那两格
// **同一个形状**——`Promise.resolve(1).constructor === Promise` 要靠
// `protos.Promise.constructor`（`BuildPromise` 里挂），而 `Promise.name` 要靠这一格。
SetHiddenProperty(vm.Room(), table, promiseObject, NameValue(table, "name"),
  Value.FromString(table.CreateString(Units("Promise"))));
// **`Promise.length` 也是 1**（第 687 轮）：与上面那一批同一个形状，
// 位置只能在这里——`promiseObject` 是 `BuildPromise` 现造的（见下面那一句）。
SetHiddenProperty(vm.Room(), table, promiseObject, NameValue(table, "length"), Value.FromInt(1));
// **不能进上面那张 `builtinNames` 表**：`promiseObject` 在这一句之前**还不存在**
// （它是 `BuildPromise` 造的），所以它只能在这里补一格——表里放的是**已经造好的变量**。
SetHiddenProperty(vm.Room(), table, promiseObject, NameValue(table, "prototype"),
  Value.FromObject(protos.Promise));
// **`Promise.prototype` 上那三格**（第 690 轮）：JS 里 `then` / `catch` / `finally`
// **就在原型上**（`Promise.prototype.then` 是函数、`.length` 是 2）。
//
// **本仓原来把三格挂在每个实例上**（`promise.xl.md` 的 `MakePromise`，理由写在那一处：
// 与 `Map` / `Set` 同一条口径，省一层查找）——那是**实现上的选择**，两边不冲突：
// 实例上那一份先命中，原型这一份是**兜底**。可**原型空着**会让两处答错：
// `typeof Promise.prototype.then` 给 `undefined`（判据 `121-names-promise-proto`），
// 而 `Object.create(Promise.prototype).then` 在 JS 里是函数、本仓给 `undefined`。
// **挂法照 `Function.prototype` 那四格**（`MethodObject` + `SetHiddenProperty`）：
// 非枚举（`Object.keys(Promise.prototype)` 在 JS 里是 `[]`）、`length` 也对得上
//（`then` 2 / `catch` 1 / `finally` 1）。
const promiseProto = Value.FromObject(protos.Promise);
SetHiddenProperty(vm.Room(), table, promiseProto, NameValue(table, "then"),
  MethodObject(vm.Room(), table, protos, PromiseThen, 2));
SetHiddenProperty(vm.Room(), table, promiseProto, NameValue(table, "catch"),
  MethodObject(vm.Room(), table, protos, PromiseCatch, 1));
SetHiddenProperty(vm.Room(), table, promiseProto, NameValue(table, "finally"),
  MethodObject(vm.Room(), table, protos, PromiseFinally, 1));
// **`Map` / `Set` / `Date` / `Array` 四格的 `prototype` 与 `constructor`**（第 138 轮）：
// `new Map() instanceof Map` 要靠原型那一格，`new Map().constructor === Map` 要靠
// `constructor` 那一格——**两格都要**（只补一格就是「一半对」）。
//
// **`constructor` 里必须放「全局那一份」那个值**：内建函数的相等是**按句柄比**的
// （`RtCmpEqStrict` 对 `HostRef` 比的是载荷句柄）——现造一个新句柄的话，
// `new Map().constructor === Map` 给 **`false`**（判据现场就是这么红的）。
// 所以这里用的是上面那几个变量 **本身**，不是再造一个。
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Map), NameValue(table, "constructor"), mapObject);
// **`Set.prototype` 上的 `constructor` 与 `prototype` 两格**（第 613 轮）：
// 与 `Map` 那两行**同一个形状**（`Set` 第 613 轮才换成可调用对象，
// 在那之前它是宿主引用值 ⇒ 这两格**一格都挂不上去**）。
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Set), NameValue(table, "constructor"), setObject);
SetHiddenProperty(vm.Room(), table, setObject, NameValue(table, "prototype"), Value.FromObject(protos.Set));
// **`Map.prototype` 也要挂上**（第 327 轮）：`Map` 现在是**对象**，
// 而 `instanceof` 走「读右边的 `prototype` 属性」那一条（登记表现在只给宿主引用值用）——
// 不挂的话 `m instanceof Map` 报 `the right side of instanceof has no prototype object`
//（**响亮的错**，但它是一处**回归**：改壳之前那一条是好的，
// 所以六道门里 `runtime:check` 与覆盖矩阵一起验过）。与 `Date` 那一行**同一个形状**。
SetHiddenProperty(vm.Room(), table, mapObject, NameValue(table, "prototype"), Value.FromObject(protos.Map));
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Set), NameValue(table, "constructor"), setTarget);
SetHiddenProperty(vm.Room(), table, dateObject, NameValue(table, "prototype"), Value.FromObject(protos.Date));
SetHiddenProperty(vm.Room(), table, Value.FromObject(protos.Date), NameValue(table, "constructor"), dateObject);
// **每一个内建构造自己的 `name`**（第 613 轮）——**一次写完，一处也不漏**。
//
// **为什么必须逐个挂**：JS 里 `Array.name` 是**自有属性**，而本仓的内建构造是
// **普通对象 + 一格可调用载荷**（第 145 轮）——它们**不真的以某个原型为原型**
// （`Function.prototype` 那一格不存在），所以**没有一处能替它们回答**。
//
// **少了它是什么样**：`Error.name` / `Array.name` 全给 `undefined`
// ⇒ `x.constructor.name` 跟着给 `undefined`——**静默错值**，
// 一句异常都没有，所以从第 343 轮（`Error` 换壳）到第 612 轮一直没被量到。
// 现场：判据 `c371-stdlib-promise-allsettled-any-race` 的 `e.constructor.name`。
//
// **它与「原型上那一格」是两件事**：`Error.prototype.name` 是 `"Error"`
// （那是 `e.name` 的落点），而 `Error.name` 是**构造自己的名字**——
// 同名不同物，JS 里两格都真的存在。
//
// **挂成不可枚举**（与 JS 同款）：`Object.keys(Array)` 在 Node 里给
// `["isArray","from","of","fromAsync"]`——没有 `name`、也没有 `prototype`。
const builtinNames: string[] = ["Object", "Function", "Array", "Number", "String", "Boolean",
  "Symbol", "Map", "Set", "WeakMap", "WeakSet", "Date", "Error"];
const builtinNameTargets: Value[] = [objectObject, functionObject, arrayObject, numberObject, stringObject,
  booleanObject, symbolObject, mapObject, setObject, weakMapObject, weakSetObject, dateObject, errorObject];
// **每一个内建构造自己的 `length`**（第 687 轮）——**与 `name` 同一个位置、同一条理由**：
// 它们在 JS 里是**构造函数的形参数**（`Array.length` 是 1、`Date.length` 是 7、
// `Map` / `Set` / `WeakMap` / `WeakSet` / `Symbol` 是 0），而本仓的内建构造是
// 「普通对象 + 一格可调用载荷」⇒ **没有一处能替它们回答**（`Function.prototype` 那一格不存在）。
//
// **第 687 轮之前它们全是 `undefined`**：判据 `113-names-array` / `099-names-map` /
// `101-names-set` / `064-names-number` / `146-names-string` / `117-names-object` /
// `044-names-date` **七条一起红**，报的是「名字逐个取一次：缺 1 个」——
// 而**根子是同一格**（那七条各自只问 `typeof`，所以看起来像七件事）。
// 数字照 Node 实测：`Object` / `Function` / `Array` / `Number` / `String` / `Boolean` /
// `Error` / `Promise` 是 1、`Symbol` / `Map` / `Set` / `WeakMap` / `WeakSet` 是 0、`Date` 是 7。
//
// **`Promise` 那一档在这里**（它是**第 687 轮才进这张名单的**：原来只写 `name`，
// 而那一条里 `Promise` 本来就漏着——`Promise.length` 在 Node 上是 1）。
//
// **类型写 `number[]` 不写 `int[]`**：`int` 是规范里的中立类型名，而**这一行原样搬进 .ts**
// ——`tsc` 不认 `int`（同一个文件里别处写 `int` 都是函数签名，打印时被改写成 `number`，
// 而代码块里的注解式声明会**逐字节**搬过去）。
const builtinLengths: number[] = [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 7, 1];
for (let i = 0; i < builtinNames.length; i++) {
  SetHiddenProperty(vm.Room(), table, builtinNameTargets[i], NameValue(table, "name"),
    Value.FromString(table.CreateString(Units(builtinNames[i]))));
  SetHiddenProperty(vm.Room(), table, builtinNameTargets[i], NameValue(table, "length"),
    Value.FromInt(builtinLengths[i]),
    // **`length` 是「不可写 + 可配置」**（与 `name` 不同！）——Node 实测：
    // `Object.getOwnPropertyDescriptor(Array, "length")` 给 `1 / false / false / true`
    // （`name` 那一格是 `可写`）。**缺省那一位给的是「可写 + 可配置」**，
    // 所以这里必须显式给一次，否则 `d.writable` 会答真（判据 `r-builtin-length-desc` 量的就是它）。
    PropertyFlagConfigurable);
}
return globals;
```
