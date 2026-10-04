# dependencies
```xl
import { Value, ValueTag } from "../../runtime/value.xl.md"
import { HeapTable, ObjectCharge, ValueCharge, CodeUnitCharge, PropertyKind, HoleCharge, Property, PropertyCharge, PropertyFlagEnumerable, PropertyFlagWritable, PropertyFlagConfigurable } from "../../runtime/heap.xl.md"
import { RoomChecker, TextUnitsOf, RtToBoolean, MakeNumber, RtChainHas, ToNumberOf, ToPrimitiveOf, ToPrimitiveDefault, ToPrimitiveString } from "../../runtime/rt.xl.md"
import { HostUnitsText, NumberFromHostText, NumberToHostText } from "../../runtime/host-text.xl.md"
import { SetProperty, SetHiddenProperty, GetProperty, NativeCall, Protos, NewPlainObject, NewPlainArray, FindProperty, KeyMatches } from "../../runtime/props.xl.md"
import { Vm } from "../../runtime/vm.xl.md"
import { Units, NeverCall, ArgOr, ArrayIsArray, ArrayFrom, ArrayOf } from "./array.xl.md"
import { StringFromCharCode } from "./string.xl.md"
import { ValueUnits, ValueText, ToStringOfObject } from "./text.xl.md"
import { InspectText, DateMarker } from "./inspect.xl.md"
import { MapCtor, NameValue } from "./map.xl.md"
import { SetCtor } from "./set.xl.md"
import { BuildPromise } from "./promise.xl.md"
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

# const ObjectCreate:int = 407

**`Object.create(proto)`**（第 209 轮 ✓）——造一个空对象、把**原型**指过去 ✓。

# const ObjectGetPrototypeOf:int = 408

**`Object.getPrototypeOf(o)`**（第 209 轮 ✓）——把 `o` 那一格原型**当值**交出去 ✓。

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

# method ObjectTagOf:(table:HeapTable, protos:Protos, value:Value)=>string

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

```ts
// **可调用对象**（`String` / `Number` / `Function` 那些宿主载荷 ✓）：JS 印源码文本 ✗。
if (table.Get(value.Ref).Host !== null) {
  throw new Error("unimplemented: Object.prototype.toString of a callable object (JS renders source text)");
}
const marker = DateMarker(table, value);
if (marker !== "") {
  throw new Error("unimplemented: Object.prototype.toString of a " + marker + " (JS needs Symbol.toStringTag)");
}
// **`Error` 那一族**（第 137 轮起原型链就接好了 ✓）：JS 走 `Error.prototype.toString` ✓，
// 给的是 `"Error: x"` ✓——不是 `"[object Error]"` ✗。所以这里也抛 ✓。
if (RtChainHas(table, value, protos.Error)) {
  throw new Error("unimplemented: Error.prototype.toString");
}
return "Object";
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
return MathResult(negative ? 0 - value : value);
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

# const SymbolCtor:int = 250

**`Symbol(description)`** 的能力号（全局段 200..299 里空着的号）。

**它不是构造函数**：JS 里 `Symbol()` **不带 `new`**（`new Symbol()` 会抛）——
所以它只是一个普通的宿主函数值，走 `Op.Call` 那条路，和 `Map` / `Set`（走 `Op.New`）不同。

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
  "RangeError", "Array", "Number", "String", "Boolean", "Promise", "parseInt", "parseFloat", "NaN", "Infinity",
  "isNaN", "isFinite", "globalThis"];
```

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

# method InvokeGlobal:(room:RoomChecker, call:NativeCall | null, table:HeapTable, protos:Protos, id:int, self:Value, args:Array<Value>, sink:LogSink)=>Value

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
  if (args.length === 0) return Value.FromString(table.CreateString([]));
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
  const stringUnits = TextUnitsOf(table, ToPrimitiveOf(room, call, protos, table, args[0], ToPrimitiveString));
  if (!room(CodeUnitCharge * stringUnits.length + ObjectCharge)) throw new Error("out of room");
  return Value.FromString(table.CreateString(stringUnits));
}
if (id === NumberCtor) {
  // **不给实参给 `0`** ✓（JS 的 `Number()` 是 `0` ✓，不是 `NaN` ✗）。
  return NumberFromValue(room, call, table, protos, args.length > 0 ? args[0] : Value.FromInt(0));
}
if (id === BooleanCtor) {
  // **不给实参给 `false`** ✓，走的是**唯一那条真假口径** ✓（第 144 轮的 `TruthyOf` ✓）。
  return RtToBoolean(table, args.length > 0 ? args[0] : Value.Undefined());
}
if (id === ArrayCtor) {
  // **一个数是长度、其余是元素** ✓（JS 的口径 ✓，见 `ArrayCtor` 那一段 ✓）。
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
if (id === MathFloor) {
  return MathResult(Math.floor(MathArgOf(room, call, protos, table, args[0])));
}
if (id === MathAbs) {
  const value = MathArgOf(room, call, protos, table, args[0]);
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
    } else {
      if (value < best) best = value;
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
if (id === MathPow) {
  // **两个实参**（与 `max` / `min` 同形 ✓）；少给就抛（`MathArgOf(undefined)` 给 `NaN` ✓，
  // 而 JS 的 `Math.pow(undefined, …)` 也是 `NaN` ✓——**两边一致** ✓，所以不必另立一条抛 ✓）。
  return MathResult(Math.pow(MathArgOf(room, call, protos, table, args[0]),
    MathArgOf(room, call, protos, table, args[1])));
}
if (id === NumberToFixed || id === NumberToPrecision || id === NumberToStringRadix
  || id === BooleanToString || id === NumberValueOf || id === BooleanValueOf) {
  // **原始值的方法：`self` 就是那个原始值本身** ✓（`GetProperty` 把 receiver 递过来 ✓，
  // 不是装箱对象 ✓——本仓不装箱 ✓）。所以这里直接取它的数值 / 真假 ✓。
  // **`valueOf` 更简单**（第 182 轮）✓：`ToPrimitive` 的第一步就是「原始值给回自己」✓，
  // 所以它**连转换都不做** ✓——直接返回 `self` ✓。
  if (id === NumberValueOf || id === BooleanValueOf) {
    return self;
  }
  if (id === BooleanToString) {
    return Value.FromString(table.CreateString(Units(self.AsBool() ? "true" : "false")));
  }
  const number = NumericOf(self);
  if (id === NumberToFixed || id === NumberToPrecision) {
    // **位数缺省是 0** ✓（`(1.5).toFixed()` 是 `"2"` ✓，JS 的口径 ✓）。
    const digits = args.length > 0 ? NumericOf(args[0]) : 0;
    // **`toPrecision` 与 `toFixed` 只差最后那一个调用** ✓（第 182 轮 ✓）——
    // 两张语义都借宿主 ✓、理由同一个 ✓（见号那两段 ✓）。
    const text = id === NumberToFixed ? number.toFixed(digits) : number.toPrecision(digits);
    if (!room(ObjectCharge + CodeUnitCharge * text.length)) throw new Error("out of room");
    return Value.FromString(table.CreateString(Units(text)));
  }
  const radix = args.length > 0 ? NumericOf(args[0]) : 10;
  // **基数 10 走引擎那一处借用** ✓（`host-text.xl.md`：`NaN` / `±Infinity` / `-0` 的名字
  // 都在那里定死 ✓）；**其余基数借宿主** ✓（见号那一段的说明 ✓）。
  const text = radix === 10 ? NumberToHostText(number) : number.toString(radix);
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
    // **`Object.create(null)` 响亮地抛** ✗：本仓的 `Value` 表达不了「没有原型」那一档 ✓
    //（`Proto` 是句柄，`0` 是「没有」✓，而「没有」与「`Object.prototype`」在
    //  `GetProperty` 那条路上**长得一样** ✗）——静默给一个 `Object.prototype` 的后代
    // 会让 `"toString" in o` **由假变真** ✗，那是**静默错值** ✓。
    throw new Error("unimplemented: Object.create(null) (a proto-less object)");
  }
  if (proto.Tag !== ValueTag.Object) {
    throw new Error("unimplemented: Object.create over a prototype that is not an object");
  }
  table.Get(made.Ref).Proto = proto.Ref;
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
  const text = "[object " + ObjectTagOf(table, protos, self) + "]";
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
if (id === ErrorCtor || id === TypeErrorCtor || id === RangeErrorCtor) {
  // **`new Error(msg)` 与 `Error(msg)` 同一支**（号相同、两条调用路都落到这里）✓。
  // **三个号共用一支**（第 137 轮）✓：它们只差**原型**与**名字** ✓——
  // 复制三份的下场是「改了一处忘了一处」✗（而症状是「`TypeError` 的 `name` 写着 `Error`」✓）。
  // **实参走「任意值 → 文本」**（第 124 轮）✓：`new Error({})` 在 JS 里得到
  // `"[object Object]"` ✓——以前这里用引擎的 `TextFrom`，那会在对象上**抛** ✗。
  const text = args.length > 0 ? ValueText(table, args[0]) : "";
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
    const selfName = id === TypeErrorCtor ? "TypeError" : (id === RangeErrorCtor ? "RangeError" : "Error");
    SetProperty(room, NeverCall, table, self, NameValue(table, "name"),
      Value.FromString(table.CreateString(Units(selfName))));
    return self;
  }
  if (id === TypeErrorCtor) return NewErrorLike(room, table, protos, protos.TypeError, "TypeError", text);
  if (id === RangeErrorCtor) return NewErrorLike(room, table, protos, protos.RangeError, "RangeError", text);
  return NewErrorLike(room, table, protos, protos.Error, "Error", text);
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
if (id === NumberIsInteger) {
  const target = args.length > 0 ? args[0] : Value.Undefined();
  // **只认真整数** ✓（不做转换 ✓，与 JS 一致 ✓）。
  if (target.Tag === ValueTag.Int32) return Value.FromBool(true);
  if (target.Tag === ValueTag.Float64) {
    const number = target.Dbl;
    return Value.FromBool(number === number && number !== Infinity && number !== -Infinity
      && number === Math.floor(number));
  }
  return Value.FromBool(false);
}
if (id === NumberIsNaN) {
  const target = args.length > 0 ? args[0] : Value.Undefined();
  if (target.Tag !== ValueTag.Float64) return Value.FromBool(false);
  return Value.FromBool(target.Dbl !== target.Dbl);
}
if (id === StringConcat) {
  // **两个值按字符串拼起来**（第 125 轮）——**两边都先 `ToPrimitive`（hint `default`）** ✓
  // （第 203 轮改 ✓，走的是与 `RtAdd` **同一张表** ✓：`rt.xl.md` 的 `ToPrimitiveOf` ✓）。
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
  const left = TextUnitsOf(table, ToPrimitiveOf(room, call, protos, table, args[0], ToPrimitiveDefault));
  const right = TextUnitsOf(table, ToPrimitiveOf(room, call, protos, table, args[1], ToPrimitiveDefault));
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
      if (table.Get(own.Props[i].Key).Tag !== ValueTag.String) continue;
      // **访问器跳过** ✓（`keys` / `values` / `entries` 那一条口径 ✓：这一层不调 getter ✗）。
      if (own.Props[i].IsAccessor()) continue;
      // **可枚举才算**（第 182 轮，与 `keys` 那一条同一处修正 ✓）。
      if (!own.Props[i].IsEnumerable()) continue;
      keys.push(Value.FromString(own.Props[i].Key));
      values.push(own.Props[i].Value);
    }
    for (let i = 0; i < keys.length; i++) {
      SetProperty(room, NeverCall, table, target, keys[i], values[i]);
    }
  }
  // **返回的是目标本身** ✓（JS 的口径 ✓，不是一份拷贝 ✓）。
  return target;
}
if (id === ObjectFreeze) {
  // **冻结 = 把自有数据属性的 `writable` 清掉**（第 182 轮）✓——
  // `SetProperty` 那一支**早就**照着这个标志抛 ✓（`props.xl.md`：不可写的属性写入抛 TypeError ✓），
  // 所以这里只要改标志 ✓，一个引擎改动都不用 ✓（见号那一段的两处缺口 ✗）。
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
  }
  // **返回的是那个对象本身** ✓（JS 的口径 ✓，不是一份拷贝 ✓）。
  return args[0];
}
if (id === ObjectDefineProperty) {
  // **`Object.defineProperty(对象, 键, 描述符)`**（第 182 轮）✓——
  // 找到那一格（**只在自有属性里找** ✓，JS 的 `defineProperty` 不看原型链 ✓），
  // 把描述符里的 `value` 与三个标志写进去 ✓；没有那一格就**新建**一个 ✓。
  // **默认三个都是 `false`** ✓（JS 的口径 ✓：少给哪个字段就是 `false` ✓）——
  // 所以标志位是**从零开始拼**的 ✓，不是「拿旧的改一改」✗。
  if (args.length < 3 || !args[0].IsObject() || args[1].Tag !== ValueTag.String || !args[2].IsObject()) {
    throw new Error("unimplemented: Object.defineProperty needs (object, string key, descriptor object)");
  }
  const defineTarget = table.Get(args[0].Ref);
  const descriptor = table.Get(args[2].Ref);
  // **读描述符的字段** ✓：描述符是一个**普通对象字面量** ✓，所以直接扫它的属性表 ✓
  // （访问器跳过 ✗——理由与 `Object.values` 那一条相同 ✓：这一层不调 getter ✓）。
  const fieldOf = (name: string) => {
    for (let i = 0; i < descriptor.Props.length; i++) {
      const property = descriptor.Props[i];
      if (property.Kind === PropertyKind.Accessor) continue;
      if (TextFrom(table, Value.FromString(property.Key)) === name) return property.Value;
    }
    return Value.Undefined();
  };
  // **访问器描述符响亮地抛** ✗（见号那一段 ✓）。
  if (fieldOf("get").Tag !== ValueTag.Undefined || fieldOf("set").Tag !== ValueTag.Undefined) {
    throw new Error("unimplemented: Object.defineProperty with a get/set descriptor");
  }
  let flags = 0;
  if (RtToBoolean(table, fieldOf("enumerable")).AsBool()) flags = flags + PropertyFlagEnumerable;
  if (RtToBoolean(table, fieldOf("writable")).AsBool()) flags = flags + PropertyFlagWritable;
  if (RtToBoolean(table, fieldOf("configurable")).AsBool()) flags = flags + PropertyFlagConfigurable;
  const defineKey = args[1];
  const existing = FindProperty(room, table, args[0].Ref, defineKey);
  if (existing !== null && existing.Owner === args[0].Ref) {
    const property = defineTarget.Props[existing.Index];
    if (property.Kind === PropertyKind.Accessor) {
      throw new Error("unimplemented: redefining an accessor property needs the accessor path");
    }
    property.Value = fieldOf("value");
    property.Flags = flags;
    return args[0];
  }
  if (!room(PropertyCharge)) throw new Error("out of room");
  const created = new Property(defineKey.Ref, fieldOf("value"));
  created.Flags = flags;
  defineTarget.Props.push(created);
  table.Recount(args[0].Ref);
  // **返回的还是那个对象** ✓（JS 的口径 ✓）。
  return args[0];
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
if (id === JsonParse) {
  // **`JSON.parse`**（第 122 轮）：实参必须是字符串 ✓——坏输入**抛** ✓，
  // 而那个抛由宿主通道抬成**脚本接得住**的异常 ✓（第 121 轮那条路 ✓）。
  if (args.length < 1 || args[0].Tag !== ValueTag.String) {
    throw new Error("JSON.parse needs a string");
  }
  return JsonParseText(room, table, protos, TextUnitsOf(table, args[0]));
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
  const rendered = JsonText(table, target, 0, false, jsonIndent);
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
  const ms = args.length > 0 ? args[0] : Value.FromInt(0);
  if (!ms.IsNumber()) throw new Error("unimplemented: new Date(x) needs a number of milliseconds");
  // **`__t` 也是不可枚举的**（第 194 轮 ✓）：JS 的 `Object.keys(new Date())` 是 `[]` ✓
  //（本仓原来给 8 个键 ✗）。**`JSON.stringify(date)` 那一格仍旧不同** ✗：
  // JS 走 `toJSON` ✓ 给 ISO 字符串 ✓，本仓给 `{"__t":0}` ✓——那是**另一件事** ✓，
  // 与新加的 `Date.prototype.toJSON` 一起单独立一轮 ✓（记在台账里 ✓）。
  SetHiddenProperty(room, table, created,
    Value.FromString(table.CreateString(Units("__t"))), ms);
  const methodIds = [DateGetTime, DateGetUTCFullYear, DateGetUTCMonth, DateGetUTCDate,
    DateGetUTCHours, DateGetUTCMinutes, DateGetUTCSeconds, DateGetTime];
  // **`valueOf` 就是 `getTime`**（第 198 轮 ✓）：JS 的 `Date.prototype.valueOf` 给的正是那一格
  // 毫秒数 ✓——**同一个能力号** ✓（同一件事不写第二份实现 ✓，与数组的 `toString` = `join` 同款 ✓）。
  // 它让**日常那个写法**通了 ✓：`+new Date()`（一元 `+` 是 `ToNumber` ✓ →
  // `ToPrimitive(date, number)` ✓ → `valueOf` ✓ → 毫秒数 ✓）。
  // **`date + 1` 仍旧响亮地抛** ✓（那是 hint `default` ✓，JS 按 `string` 走 ✓，
  // 会给日期串 ✗——本仓没有 `Date.prototype.toString` ✓，见 `ToPrimitiveOf` 里那条路障 ✓）。
  const methodNames = ["getTime", "getUTCFullYear", "getUTCMonth", "getUTCDate",
    "getUTCHours", "getUTCMinutes", "getUTCSeconds", "valueOf"];
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
  || id === DateGetUTCSeconds) {
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
  return Value.FromInt(secondOfDay % 60);
}
throw new Error("unimplemented: global builtin " + id);
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

# method TextFrom:(table:HeapTable, value:Value)=>string

**堆里的字符串 → 宿主字符串**。

**这一步用宿主的字符设施是应该的**：建库层本来就是宿主侧代码（`Units` 是反方向）。
引擎侧不许这么做，因为四个目标的语言各自有各自的字符串——
而**建库层的产物是宿主自己的字符串**，这里没有别的选择，也不需要别的选择。

```ts
const units = TextUnitsOf(table, value);
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

# method QuoteJson:(table:HeapTable, value:Value)=>string

JSON 字符串字面量（**带上引号与转义**）。

**只转义必要的那些**：引号、反斜杠、`\n` / `\r` / `\t`，以及其它控制字符走 `\u00XX`。
**不转义非 ASCII**：`JSON.stringify` 输出的是可读的 UTF-16 文本（判据正是拿它跟 Node 比）。

```ts
const units = TextUnitsOf(table, value);
let text = "\"";
for (let i = 0; i < units.length; i++) {
  const unit = units[i];
  if (unit === 34) text = text + "\\\"";
  else if (unit === 92) text = text + "\\\\";
  else if (unit === 10) text = text + "\\n";
  else if (unit === 13) text = text + "\\r";
  else if (unit === 9) text = text + "\\t";
  else if (unit < 32) text = text + "\\u" + unit.toString(16).padStart(4, "0");
  else text = text + String.fromCharCode(unit);
}
return text + "\"";
```

# method JsonText:(table:HeapTable, value:Value, depth:int, insideArray:bool, indent:string)=>string | null

**序列化一个值**；返回 `null` 表示「这个值没有 JSON 形态」（于是**键整个省略**）。

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
  throw new Error("this structure is too deep to serialize (a cycle looks the same)");
}
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
      const rendered = JsonText(table, array.GetAt(i), depth + 1, true, indent);
      text = text + JsonIndent(depth + 1, indent) + (rendered === null ? "null" : rendered);
    }
    return text + "\n" + JsonIndent(depth, indent) + "]";
  }
  let text = "[";
  for (let i = 0; i < count; i++) {
    if (i > 0) text = text + ",";
    const rendered = JsonText(table, array.GetAt(i), depth + 1, true, indent);
    text = text + (rendered === null ? "null" : rendered);
  }
  return text + "]";
}
if (value.Tag === ValueTag.Object) {
  const item = table.Get(value.Ref);
  // **缩进那一档**（同上）：先按「有没有可渲染的键」判一次 ✓——空对象照旧是 `{}` ✓。
  let renderedCount = 0;
  if (indent !== "") {
    for (let i = 0; i < item.Props.length; i++) {
      const probe = item.Props[i];
      if (table.Get(probe.Key).Tag !== ValueTag.String) continue;
      if (probe.Kind === PropertyKind.Accessor) continue;
      if (!probe.IsEnumerable()) continue;
      if (JsonText(table, probe.Value, depth + 1, false, indent) === null) continue;
      renderedCount = renderedCount + 1;
    }
    if (renderedCount > 0) {
      let text = "{\n";
      let firstIndented = true;
      for (let i = 0; i < item.Props.length; i++) {
        const property = item.Props[i];
        if (table.Get(property.Key).Tag !== ValueTag.String) continue;
        if (property.Kind === PropertyKind.Accessor) continue;
        if (!property.IsEnumerable()) continue;
        const renderedHere = JsonText(table, property.Value, depth + 1, false, indent);
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
  for (let i = 0; i < item.Props.length; i++) {
    const property = item.Props[i];
    const keyValue = table.Get(property.Key);
    if (keyValue.Tag !== ValueTag.String) continue;
    if (property.Kind === PropertyKind.Accessor) continue;
    // **不可枚举的键不进 JSON**（第 182 轮修 ✓）：`JSON.stringify` 只看**可枚举**的自有属性 ✓
    // （与 `Object.keys` 同一条口径 ✓）——`Object.defineProperty(o, "x", { value: 1 })`
    // 默认不可枚举 ✓，所以它**不该**出现在 JSON 里 ✗（实测判据当场量到这一格 ✓）。
    if (!property.IsEnumerable()) continue;
    const rendered = JsonText(table, property.Value, depth + 1, false, indent);
    if (rendered === null) continue;
    if (!first) text = text + ",";
    first = false;
    text = text + QuoteJson(table, Value.FromString(property.Key)) + ":" + rendered;
  }
  return text + "}";
}
throw new Error("unimplemented: JSON of this kind of value");
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
    throw new Error("JSON.parse: expected " + word);
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
  throw new Error("JSON.parse: expected a string");
}
cursor.At = cursor.At + 1;
const out: number[] = [];
while (true) {
  if (cursor.At >= text.length) throw new Error("JSON.parse: unterminated string");
  const unit = text[cursor.At];
  cursor.At = cursor.At + 1;
  if (unit === 34) return out;
  if (unit < 32) throw new Error("JSON.parse: a raw control character in a string");
  if (unit !== 92) {
    out.push(unit);
    continue;
  }
  if (cursor.At >= text.length) throw new Error("JSON.parse: unterminated escape");
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
  if (escape !== 117) throw new Error("JSON.parse: unknown escape");
  let value = 0;
  for (let i = 0; i < 4; i++) {
    if (cursor.At >= text.length) throw new Error("JSON.parse: truncated \\u escape");
    const digit = JsonHexDigit(text[cursor.At]);
    if (digit < 0) throw new Error("JSON.parse: bad \\u escape");
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
if (cursor.At >= text.length) throw new Error("JSON.parse: a number with no digits");
if (text[cursor.At] === 48) {
  // **前导零只许一个** ✓：`01` 是坏的 ✓。
  cursor.At = cursor.At + 1;
} else if (text[cursor.At] >= 49 && text[cursor.At] <= 57) {
  while (cursor.At < text.length && text[cursor.At] >= 48 && text[cursor.At] <= 57) {
    cursor.At = cursor.At + 1;
  }
} else {
  throw new Error("JSON.parse: a number must start with a digit");
}
if (cursor.At < text.length && text[cursor.At] === 46) {
  cursor.At = cursor.At + 1;
  if (cursor.At >= text.length || text[cursor.At] < 48 || text[cursor.At] > 57) {
    throw new Error("JSON.parse: a fraction needs digits");
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
    throw new Error("JSON.parse: an exponent needs digits");
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
if (depth > MaxJsonDepth) throw new Error("JSON.parse: this document is nested too deeply");
JsonSkipSpace(text, cursor);
if (cursor.At >= text.length) throw new Error("JSON.parse: unexpected end of input");
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
      throw new Error("JSON.parse: expected ':'");
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
    if (cursor.At >= text.length) throw new Error("JSON.parse: unterminated object");
    if (text[cursor.At] === 44) {
      cursor.At = cursor.At + 1;
      continue;
    }
    if (text[cursor.At] === 125) {
      cursor.At = cursor.At + 1;
      return created;
    }
    throw new Error("JSON.parse: expected a comma or the closing brace");
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
    if (cursor.At >= text.length) throw new Error("JSON.parse: unterminated array");
    if (text[cursor.At] === 44) {
      cursor.At = cursor.At + 1;
      continue;
    }
    if (text[cursor.At] === 93) {
      cursor.At = cursor.At + 1;
      return array;
    }
    throw new Error("JSON.parse: expected a comma or the closing bracket");
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
throw new Error("JSON.parse: unexpected character");
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
if (cursor.At !== text.length) throw new Error("JSON.parse: trailing characters after the value");
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
  "log", "exp", "cbrt", "hypot"];
const mathIds: number[] = [MathFloor, MathAbs, MathMax, MathMin, MathRound, MathCeil, MathTrunc, MathSign,
  MathSqrt, MathPow, MathLog, MathExp, MathCbrt, MathHypot];
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
const consoleObject = NewPlainObject(vm.Room(), table, protos);
const logKey = Value.FromString(table.CreateString(Units("log")));
const logTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ConsoleLog, 0));
SetProperty(vm.Room(), NeverCall, table, consoleObject, logKey, logTarget);

const objectObject = NewPlainObject(vm.Room(), table, protos);
const keysKey = Value.FromString(table.CreateString(Units("keys")));
const keysTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectKeys, 0));
SetProperty(vm.Room(), NeverCall, table, objectObject, keysKey, keysTarget);

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
// **`String` 也是一个普通对象**（第 130 轮，与 `Array` / `Number` 同款 ✓），
// 上面挂**静态方法** `fromCharCode` ✓。
// **第 145 轮它同时能被调用** ✓：`String(x)` 与 `String.fromCharCode(65)` 一起成立 ✓
// （值模型那一格补上了 ✓，见 `heap.xl.md` 的 `AttachCallable` ✓）。
const stringObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(stringObject.Ref, StringCtor, 0);
const fromCharCodeKey = Value.FromString(table.CreateString(Units("fromCharCode")));
const fromCharCodeTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(StringFromCharCode, 0));
SetProperty(vm.Room(), NeverCall, table, stringObject, fromCharCodeKey, fromCharCodeTarget);
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
// **`parseInt` / `parseFloat` 是全局函数** ✓（不是某个对象的方法 ✓）。
const parseIntKey = Value.FromString(table.CreateString(Units("parseInt")));
SetProperty(vm.Room(), NeverCall, table, globals, parseIntKey, parseIntTarget);
const parseFloatKey = Value.FromString(table.CreateString(Units("parseFloat")));
SetProperty(vm.Room(), NeverCall, table, globals, parseFloatKey, parseFloatTarget);

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
// **`Object.create` / `Object.getPrototypeOf`**（第 209 轮 ✓）：与 `keys` / `values` 那几张
// **同一张对象** ✓（都是 `Object` 的静态方法 ✓），分派在 `InvokeGlobal` 里 ✓（那一支有 `table` ✓）。
SetProperty(vm.Room(), NeverCall, table, objectObject,
  Value.FromString(table.CreateString(Units("create"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectCreate, 0)));
SetProperty(vm.Room(), NeverCall, table, objectObject,
  Value.FromString(table.CreateString(Units("getPrototypeOf"))),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ObjectGetPrototypeOf, 0)));
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
// **`globalThis` 指向那个环境对象自己**（第 149 轮）✓：`globalThis.Math === Math` ✓。
// **加它的直接原因是 `typeof` 那一格的新规矩** ✓：未声明的名字给 `"undefined"` ✓，
// 而 `globalThis` 在 Node 里是 `"object"` ✓——不补这一格就是一处**静默**的不一致 ✗。
SetProperty(vm.Room(), NeverCall, table, globals,
  Value.FromString(table.CreateString(Units("globalThis"))), globals);
// **`Map` 是一个宿主引用值**（不是普通对象）：`new Map()` 走 `Op.New` 的
// 「宿主构造函数」那条分支——宿主自己把对象造好返回（见 `map.xl.md`）。
const mapKey = Value.FromString(table.CreateString(Units("Map")));
const mapTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(MapCtor, 0));
SetProperty(vm.Room(), NeverCall, table, globals, mapKey, mapTarget);
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
// `Date` 是一个**普通对象**（像 `Math` 一样），上面挂 `now`——
// 而 `now` 指向的是**宿主**要回答的能力号（见 `ClockNow` 的说明：建库层没有时钟）。
// **第 145 轮它同时是构造函数** ✓：`new Date(ms)` 不再靠降级层那条特例 ✓
// （`const D = Date; new D(0)` 现在也对 ✓），而 `Date.now()` 照旧走属性 ✓。
const dateObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(dateObject.Ref, DateCtor, 0);
const nowKey = Value.FromString(table.CreateString(Units("now")));
const nowTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ClockNow, 0));
SetProperty(vm.Room(), NeverCall, table, dateObject, nowKey, nowTarget);
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
SetProperty(vm.Room(), NeverCall, table, Value.FromObject(protos.Map), NameValue(table, "constructor"), mapTarget);
SetProperty(vm.Room(), NeverCall, table, Value.FromObject(protos.Set), NameValue(table, "constructor"), setTarget);
SetProperty(vm.Room(), NeverCall, table, dateObject, NameValue(table, "prototype"), Value.FromObject(protos.Date));
SetProperty(vm.Room(), NeverCall, table, Value.FromObject(protos.Date), NameValue(table, "constructor"), dateObject);
return globals;
```
