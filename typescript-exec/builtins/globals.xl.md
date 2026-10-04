# dependencies
```xl
import { Value, ValueTag } from "../../runtime/value.xl.md"
import { HeapTable, ObjectCharge, ValueCharge, CodeUnitCharge, PropertyKind, HoleCharge } from "../../runtime/heap.xl.md"
import { RoomChecker, TextUnitsOf, RtToBoolean, MakeNumber } from "../../runtime/rt.xl.md"
import { HostUnitsText, NumberFromHostText } from "../../runtime/host-text.xl.md"
import { SetProperty, NativeCall, Protos, NewPlainObject, NewPlainArray, FindProperty } from "../../runtime/props.xl.md"
import { Vm } from "../../runtime/vm.xl.md"
import { Units, NeverCall, ArgOr, ArrayIsArray, ArrayFrom } from "./array.xl.md"
import { StringFromCharCode } from "./string.xl.md"
import { ValueUnits, ValueText } from "./text.xl.md"
import { InspectText } from "./inspect.xl.md"
import { MapCtor, NameValue } from "./map.xl.md"
import { SetCtor } from "./set.xl.md"
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

# const NumberIsInteger:int = 320

**`Number.isInteger(x)`**（第 126 轮）——`Number` 是**普通对象** ✓（与 `Array` / `Math` 同款 ✓），
上面挂几个静态判定 ✓。**只认真整数** ✓：`Int32` 一律真 ✓、
`Float64` 要有限且是整数 ✓，其余（字符串 / `null` / …）一律假 ✓（**不做转换** ✗，与 JS 一致 ✓）。

# const NumberIsNaN:int = 321

**`Number.isNaN(x)`**——**只认真正的 `NaN`** ✓（`Float64` 那条自比较 ✓）；
`"abc"` / `undefined` 一律假 ✓（JS 也是 ✓——要转的用全局 `isNaN` ✗，那一个这一轮不做 ✓）。

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
那一套没做 ✓，所以**响亮地抛** ✓（不许给一个看起来合理的 `NaN` ✗：`[]` 该给 `0` ✓）。

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
  "RangeError", "Array", "Number", "String", "Boolean", "parseInt", "parseFloat"];
```

# method NumericOf:(value:Value)=>float

取数值；不是数值就抛（与 `rt.xl.md` 的同名函数**不是一回事**：
那个在引擎里、按引擎的口径，这个是建库层对**参数**的检查）。

```ts
if (value.Tag === ValueTag.Int32) return value.Int;
if (value.Tag === ValueTag.Float64) return value.Dbl;
throw new Error("this method needs a number");
```

# method MathResult:(value:float)=>Value

把算出来的数值变成 `Value`：**整的给 Int32，不是整的给 Float64**。

**这条口径与引擎里的 `MakeNumber` 一致**（`rt.xl.md`）——建库层不另立一套，
否则同一个数在两处会有两种标签，而标签是判等与显示的依据。

```ts
if (value === Math.floor(value) && value >= -2147483648 && value <= 2147483647) {
  return Value.FromInt(value);
}
return Value.FromDouble(value);
```

# method NumberFromValue:(table:HeapTable, value:Value)=>Value

**`Number(x)` 的语义**（第 145 轮）——JS 的 `ToNumber` 里**做得出来的那一半** ✓。

**顺序是语义** ✓（JS 的 `ToNumber` 就是这么排的 ✓）：

| 输入 | 给什么 | 依据 |
| --- | --- | --- |
| 数（`Int32` / `Float64`） | 它自己 ✓ | 已经是数 ✓ |
| 布尔 | `1` / `0` ✓ | JS 的 `Number(true)` 是 `1` ✓ |
| `null` | `0` ✓ | JS 的 `Number(null)` 是 `0` ✓（而 `Number(undefined)` 是 `NaN` ✗——两格不一样 ✓） |
| `undefined` | `NaN` ✓ | JS 的口径 ✓ |
| 字符串 | **整串解析** ✓ | `NumberFromHostText` ✓（`"12px"` 给 `NaN` ✓，`parseInt` 才给 `12` ✓） |
| 其余（对象 / 数组 / 符号） | **抛** ✓ | 要 `ToPrimitive`（先 `valueOf` 再 `toString`）✗——**不许给一个看起来合理的 `NaN`** ✗：`Number([])` 在 JS 里是 `0` ✓ |

**字符串那一档不自己扫** ✓：借 `runtime/host-text.xl.md` 的 `NumberFromHostText` ✓——
「十进制文本 → 双精度」**只有那一个出口** ✓（线形态的常量也走它 ✓），
自己再写一遍前缀/进制/指数的判据就是**第二份会走偏的实现** ✗（第 129 轮那条账 ✓）。

**收窄用引擎的 `MakeNumber`** ✓（不是本文件的 `MathResult` ✗）：
两者只差一格 ✓——`MathResult` 会把 `-0` 收成 `Int32 0` ✗（`Number("-0")` 在 JS 里是 `-0` ✓，
`Object.is(Number("-0"), -0)` 为真 ✓），而 `MakeNumber` 专门判了负零 ✓（`rt.xl.md` 那一格 ✓）。

```ts
if (value.Tag === ValueTag.Int32 || value.Tag === ValueTag.Float64) return value;
if (value.Tag === ValueTag.Bool) return Value.FromInt(value.Int !== 0 ? 1 : 0);
if (value.Tag === ValueTag.Null) return Value.FromInt(0);
if (value.Tag === ValueTag.Undefined) return Value.FromDouble(NaN);
if (value.Tag === ValueTag.String) {
  const units = table.Get(value.Ref).AsString().Units;
  return MakeNumber(NumberFromHostText(HostUnitsText(units)));
}
throw new Error("unimplemented: Number(x) of an object needs ToPrimitive");
```

# method InvokeGlobal:(room:RoomChecker, table:HeapTable, protos:Protos, id:int, self:Value, args:Array<Value>, sink:LogSink)=>Value

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
  const units = ValueUnits(table, args[0], 0);
  if (!room(CodeUnitCharge * units.length + ObjectCharge)) throw new Error("out of room");
  return Value.FromString(table.CreateString(units));
}
if (id === NumberCtor) {
  // **不给实参给 `0`** ✓（JS 的 `Number()` 是 `0` ✓，不是 `NaN` ✗）。
  return NumberFromValue(table, args.length > 0 ? args[0] : Value.FromInt(0));
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
  return MathResult(Math.floor(NumericOf(args[0])));
}
if (id === MathAbs) {
  const value = NumericOf(args[0]);
  return MathResult(value < 0 ? 0 - value : value);
}
if (id === MathMax || id === MathMin) {
  let best = NumericOf(args[0]);
  for (let i = 1; i < args.length; i++) {
    const value = NumericOf(args[i]);
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
  const value = NumericOf(args[0]);
  if (id === MathRound) return MathResult(Math.round(value));
  if (id === MathCeil) return MathResult(Math.ceil(value));
  if (id === MathTrunc) return MathResult(Math.trunc(value));
  return MathResult(Math.sign(value));
}
if (id === MathSqrt) {
  // **浮点现在打得出来了**（第 124 轮）✓，所以这一支放行 ✓。
  const value = NumericOf(args[0]);
  if (value < 0) return MathResult(NaN);
  return MathResult(Math.sqrt(value));
}
if (id === MathPow) {
  // **两个实参**（与 `max` / `min` 同形 ✓）；少给就抛（`NumericOf(undefined)` 会抛 ✓）。
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
  // **两个值按字符串拼起来**（第 125 轮）：两边都走「任意值 → 文本」✓
  // （`text.xl.md` 的 `ValueUnits` ✓——浮点 / 对象 / 数组 / 洞都在那里有答案 ✓）。
  if (args.length < 2) throw new Error("unimplemented: string_concat needs (left, right)");
  const left = ValueUnits(table, args[0], 0);
  const right = ValueUnits(table, args[1], 0);
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
if (id === ObjectKeys) {
  if (args.length < 1 || !args[0].IsObject()) {
    throw new Error("Object.keys needs an object");
  }
  const item = table.Get(args[0].Ref);
  const names: string[] = [];
  for (let i = 0; i < item.Props.length; i++) {
    const keyValue = table.Get(item.Props[i].Key);
    if (keyValue.Tag !== ValueTag.String) continue;
    names.push(TextFrom(table, Value.FromString(item.Props[i].Key)));
  }
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
  // **先把要用的值抄进宿主数组再分配** ✓：抄进来的是 `Value`（引用），
  // 而它们**住在源对象的属性表里** ✓——属性表由 `args[0]` 拴着，`args[0]` 是这次调用的根 ✓，
  // 所以中途的分配不会把它们收走 ✓（`GetIterator` 那条路是同一个理由）。
  if (args.length < 1 || !args[0].IsObject()) {
    throw new Error("Object.values/entries needs an object");
  }
  const own = table.Get(args[0].Ref);
  const keys: number[] = [];
  const values: Value[] = [];
  for (let i = 0; i < own.Props.length; i++) {
    if (table.Get(own.Props[i].Key).Tag !== ValueTag.String) continue;
    if (own.Props[i].IsAccessor()) continue;
    keys.push(own.Props[i].Key);
    values.push(own.Props[i].Value);
  }
  if (!room(ObjectCharge + ValueCharge * (values.length * 2 + 2)
    + CodeUnitCharge * values.length * 4)) {
    throw new Error("out of room");
  }
  const handle = table.CreateArray();
  table.Get(handle).Proto = protos.Array;
  const result = table.Get(handle).AsArray();
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
  const rendered = JsonText(table, target, 0, false);
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
  SetProperty(room, NeverCall, table, created,
    Value.FromString(table.CreateString(Units("__t"))), ms);
  const methodIds = [DateGetTime, DateGetUTCFullYear, DateGetUTCMonth, DateGetUTCDate,
    DateGetUTCHours, DateGetUTCMinutes, DateGetUTCSeconds];
  const methodNames = ["getTime", "getUTCFullYear", "getUTCMonth", "getUTCDate",
    "getUTCHours", "getUTCMinutes", "getUTCSeconds"];
  for (let i = 0; i < methodIds.length; i++) {
    SetProperty(room, NeverCall, table, created,
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
SetProperty(room, NeverCall, table, created, NameValue(table, "message"),
  Value.FromString(table.CreateString(Units(message))));
SetProperty(room, NeverCall, table, created, NameValue(table, "name"),
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

# method JsonText:(table:HeapTable, value:Value, depth:int, insideArray:bool)=>string | null

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
  let text = "[";
  for (let i = 0; i < array.GetLength(); i++) {
    if (i > 0) text = text + ",";
    const rendered = JsonText(table, array.GetAt(i), depth + 1, true);
    text = text + (rendered === null ? "null" : rendered);
  }
  return text + "]";
}
if (value.Tag === ValueTag.Object) {
  const item = table.Get(value.Ref);
  let text = "{";
  let first = true;
  for (let i = 0; i < item.Props.length; i++) {
    const property = item.Props[i];
    const keyValue = table.Get(property.Key);
    if (keyValue.Tag !== ValueTag.String) continue;
    if (property.Kind === PropertyKind.Accessor) continue;
    const rendered = JsonText(table, property.Value, depth + 1, false);
    if (rendered === null) continue;
    if (!first) text = text + ",";
    first = false;
    text = text + QuoteJson(table, Value.FromString(property.Key)) + ":" + rendered;
  }
  return text + "}";
}
throw new Error("unimplemented: JSON of this kind of value");
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
const mathNames: string[] = ["floor", "abs", "max", "min", "round", "ceil", "trunc", "sign", "sqrt", "pow"];
const mathIds: number[] = [MathFloor, MathAbs, MathMax, MathMin, MathRound, MathCeil, MathTrunc, MathSign,
  MathSqrt, MathPow];
for (let i = 0; i < mathNames.length; i++) {
  const key = Value.FromString(table.CreateString(Units(mathNames[i])));
  const target = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(mathIds[i], 0));
  SetProperty(vm.Room(), NeverCall, table, math, key, target);
}
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
const isIntegerKey = Value.FromString(table.CreateString(Units("isInteger")));
const isIntegerTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(NumberIsInteger, 0));
SetProperty(vm.Room(), NeverCall, table, numberObject, isIntegerKey, isIntegerTarget);
const isNaNAKey = Value.FromString(table.CreateString(Units("isNaN")));
const isNaNTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(NumberIsNaN, 0));
SetProperty(vm.Room(), NeverCall, table, numberObject, isNaNAKey, isNaNTarget);
const numberKey = Value.FromString(table.CreateString(Units("Number")));
SetProperty(vm.Room(), NeverCall, table, globals, numberKey, numberObject);
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
// **它没有 `prototype` 那一格** ✗（`Protos` 里没有 `Boolean` ✓，写在明处）：
// 本仓**不装箱** ✓——`true instanceof Boolean` 在 JS 里本来就是 `false` ✓，
// 而 `new Boolean(true) instanceof Boolean` 那条路要装箱 ✗（与 `new String(1)` 同一条 ✓）。
const booleanObject = NewPlainObject(vm.Room(), table, protos);
table.AttachCallable(booleanObject.Ref, BooleanCtor, 0);
const booleanKey = Value.FromString(table.CreateString(Units("Boolean")));
SetProperty(vm.Room(), NeverCall, table, globals, booleanKey, booleanObject);
// **`parseInt` / `parseFloat` 是全局函数** ✓（不是某个对象的方法 ✓）。
const parseIntKey = Value.FromString(table.CreateString(Units("parseInt")));
const parseIntTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ParseInt, 0));
SetProperty(vm.Room(), NeverCall, table, globals, parseIntKey, parseIntTarget);
const parseFloatKey = Value.FromString(table.CreateString(Units("parseFloat")));
const parseFloatTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ParseFloat, 0));
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
const undefinedKey = Value.FromString(table.CreateString(Units("undefined")));
SetProperty(vm.Room(), NeverCall, table, globals, undefinedKey, Value.Undefined());
// **`Map` 是一个宿主引用值**（不是普通对象）：`new Map()` 走 `Op.New` 的
// 「宿主构造函数」那条分支——宿主自己把对象造好返回（见 `map.xl.md`）。
const mapKey = Value.FromString(table.CreateString(Units("Map")));
const mapTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(MapCtor, 0));
SetProperty(vm.Room(), NeverCall, table, globals, mapKey, mapTarget);
// `Set` 同样是**宿主引用值**（`new Set()` 走 `Op.New` 的宿主构造函数那条分支）。
const setKey = Value.FromString(table.CreateString(Units("Set")));
const setTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(SetCtor, 0));
SetProperty(vm.Room(), NeverCall, table, globals, setKey, setTarget);
// `Symbol` 是**普通宿主函数**（不是构造函数）：`Symbol('x')` 走 `Op.Call`。
const symbolKey = Value.FromString(table.CreateString(Units("Symbol")));
const symbolTarget = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(SymbolCtor, 0));
SetProperty(vm.Room(), NeverCall, table, globals, symbolKey, symbolTarget);
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
