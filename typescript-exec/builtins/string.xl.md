# dependencies
```xl
import { Value, ValueTag } from "../../runtime/value.xl.md"
import { HeapTable, ObjectCharge, CodeUnitCharge, ValueCharge } from "../../runtime/heap.xl.md"
import { RoomChecker, IsCallableValue } from "../../runtime/rt.xl.md"
import { SetProperty, GetProperty, GetIndex, FindProperty, ReadProperty, NativeCall, Protos, NewPlainArray } from "../../runtime/props.xl.md"
import { Vm } from "../../runtime/vm.xl.md"
import { Units, NeverCall, ArgOr, NormalizeRangeIndex } from "./array.xl.md"
import { JsTextUnits, ValueUnits, UnwrapBox } from "./text.xl.md"
import { HostUnitsText, HostTextUnits, HostNormalize } from "../../runtime/host-text.xl.md"
```

# namespace cangjie

**标准库第二块：`String` 的原型方法**（`charAt` / `charCodeAt` / `indexOf` / `slice`）。

**它与数组那一块的区别在于「接收者是谁」**：数组是对象，自带 `Proto`；
字符串是**原始值**——它没有属性表，所以**引擎**要为它提供一个起点
（`props.xl.md` 的 `Protos.String` 与 `GetProperty` 里那一段原始值分支）。
**这一步非做不可**：不做的话 `"abc".charAt` 只能是 `undefined`，而那种
「看起来像没有这个方法」比报错更难查。

**能力号从 100 起**（与数组的 1..9 分开）：一个通道按号分派全部内建，
**号段分开**是为了让「哪一块」一眼可辨（`builtins/install.xl.md` 就是按号段转的）。

**这一轮不做**：正则、`padStart` 那一类。

**第 120 轮补的五个**：`split`（要造数组，所以走宿主那条带原型的通道）、
`toUpperCase` / `toLowerCase`（**只做 ASCII**——大小写映射表不在这一层，
遇到非 ASCII **响亮地抛**，不静默给一个「看起来变过了」的串）、
`trim`（**只做 ASCII 空白**，边缘遇到非 ASCII 同样是抛）、`includes`（返回真假）。

# const StringCharAt:int = 101

`String.prototype.charAt` 的能力号。

# const StringCharCodeAt:int = 102

# const StringIndexOf:int = 103

# const StringSlice:int = 104

# const StringSplit:int = 105

`String.prototype.split` 的能力号（第 120 轮补）。

**它必须走带原型的那条通道**（`InvokeWithSink`）：结果是一个**数组**，
而「数组从哪来」要 `protos`——`InvokeString` 的签名里没有它
（与 `get_iterator` 在 `install.xl.md` 里被单独接住是同一个理由）。

# const StringToUpperCase:int = 106

# const StringToLowerCase:int = 107

# const StringToLocaleUpperCase:int = 134

**`toLocaleUpperCase()`**（第 617 轮）——号**追加在表尾**（`134`），已有的一个都没动。

**它与 `toUpperCase` 是同一件事的那一档**：语言环境是**缺省**时
（无参数、或 `undefined`），JS 的 `toLocaleUpperCase` 就是
**`toUpperCase` 的逐码元映射**——差别只在几条**语言特例**
（土耳其语的 `i` / `I`、立陶宛语的重音），而那些要**一张按 locale 分的表**，
本仓没有。**按同一份表给**、并把「不做语言特例」写在明处：
`"i".toLocaleUpperCase("tr")` 在 Node 里是 `"İ"`、这里是 `"I"`——**记在台账里**。

# const StringToLocaleLowerCase:int = 135

**`toLocaleLowerCase()`**（第 617 轮）——与上面那一格**同一份实现**、同一条口径。

# const StringTrim:int = 108

# const StringIncludes:int = 109

# const StringStartsWith:int = 110

`startsWith(前缀, 位置?)` 的号（第 123 轮）。
**位置参数照 JS 给**：从那个下标起比对（夹到 `0..length`）。

# const StringEndsWith:int = 111

`endsWith(后缀, 结束位置?)` 的号——第二个参数是**结束位置**（不是起点，与 `startsWith` 不同）。

# const StringSubstring:int = 112

`substring(起, 止)` 的号。

**它与 `slice` 的差别只有两处**，而这两处**恰好让它能做得比 `slice` 更准**：
`substring` 把负数与 `NaN` **夹到 0**（JS 也是），而 `slice` 在 JS 里是**从末尾数**
（那是本仓已记的差异）；`substring` 在 `起 > 止` 时**交换两个参数**（JS 的怪规矩，
`slice` 给空串）——**两条都照 JS 给**。

# const StringRepeat:int = 113

`repeat(次数)` 的号。

**非整数按 `ToIntegerOrInfinity` 折**（**向零截断** 不是向下取整——`repeat(-0.5)` 在 JS 里
是 `repeat(-0)` ⇒ **空串**，写成 `floor` 会变成 `-1` ⇒ **抛**）；**负数抛**。
**第 288 轮这一格才真的对**：次数取自 `ArgOr`，而它在第 288 轮之前对小数**一律给 `0`**
（`"a".repeat(2.9)` 给空串，JS 给 `"aa"`——**静默错值**，理由记在 `ArgOr` 那一段）。
**太多次不另设上限**：它自己会在 `room` 那一关被拦下（那是一条**可捕获的错误**），
再加一个人为上限就是第二个「上限」了——两处不一致比一处更坏。

# const StringPadStart:int = 114

`padStart(目标长度, 填充串?)` 的号（第 126 轮）——第二个参数缺省是**一个空格**。

# const StringPadEnd:int = 115

`padEnd(目标长度, 填充串?)`。

**两条边角照 JS 给**：目标长度**不大于**当前长度就**原样返回**；
**填充串是空串就不补**（JS 也这样——补出来的东西不是「填充」）。
**填充串要重复、并在最后一段截断**（`"ab".padStart(7, "xy")` → `"xyxyxab"`）。
**已知差异写在明处**：JS 按**字符**（码位）补，这里按**码元**——
ASCII 填充串两边一致，**代理对**那一类会差一个（记在台账）。

# const StringFromCharCode:int = 116

**`String.fromCharCode(码元…)`** 的号（第 130 轮）——**静态方法**：
调用时 `self` 是那个 `String` **普通对象**（不是字符串），
所以它必须排在 `RequireString` **前面**（与 `Array.isArray` 同一条先例）。

**已知差异写在明处**：JS 会**夹到 `0..65535`**，这里**不夹**——
`-1` / `70000` 原样进码元表，于是它会变成一个越界码元。
与 `charAt` 那条「越界给 `undefined`」同一类（**宁可差得可查，也不静默改值**），
记在台账里。

# const StringReplace:int = 117

# const StringReplaceAll:int = 118

# const StringAt:int = 119

`String.prototype.at` / `codePointAt` / `concat` / `lastIndexOf`（第 208 轮，号**追加在表尾**）。

**四格各自拖着的判据**：`string-length-index`（`at`）、
`string-codePointAt`（代理对合成一个码位）、`string-concat-method`（`"a".concat(…, 1, true)`）、
`string-lastIndexOf`（从后往前找）。

**`at` 与 `s[i]` 的差别就是负下标**（`s.at(-1)` 从尾巴数、`s[-1]` 是 `undefined`）——
与数组那一格 `ArrayAt` 同一条规矩（两处都要在，两处都不许把 `-1` 当尾巴）。

# const StringLastIndexOf:int = 122

# const StringCodePointAt:int = 121

# const StringConcatMethod:int = 120

**它不叫 `StringConcat`**：那个名字在 `globals.xl.md` 里**已经占了**（语言内建号 302，
「降级层的字符串拼接」）——两个同名常量被同一个文件 import 就是**撞名**，
所以这一格带 `Method` 后缀。

# const StringLocaleCompare:int = 123

**`localeCompare`**（第 208 轮）——按**码元**比、**只做 ASCII**（没有区域表，理由写在实现里）。

# const StringTrimStart:int = 124

# const StringTrimEnd:int = 125

**`trimStart` / `trimEnd`**（第 275 轮）——`trim` 的**两个半边**。
**三个共用同一段实现**（只差「从哪一头裁」）：那一支里有两件**不能抄**的东西——
「**只做 ASCII 空白**」那张表、以及「**边缘是非 ASCII 就抛**」那条纪律
（它挡的是 `U+00A0` 那一类这一层认不出来的空白）。
抄成三份就是三处会漂的答案，而漂了的症状是「有一头**静默**少裁了一个字符」。

**它们是第 273 轮普查量到的**：判据 `string-trim-variants` 在报
`cannot call a non-closure value`——即**那一格根本没装**（`trim` 一直是好的）。

# const StringToString:int = 128

**`"abc".toString()`**（第 304 轮）——返回**接收者自己**（`valueOf` 与它一字不差）。

**不装它的代价是静默错值**：`Protos.String` 上找不到 `toString`，属性查找就
一路落到 `Object.prototype.toString`，于是 `"abc".toString()` 打出
**`"[object String]"`**——**看着像个值**、一句异常都没有
（判据 `c304-std-string-valueof-tostring` 量的就是它）。
**同一族的 `String.prototype.toString.call(s)`** 走的也是这一格
（`String.prototype` 从第 137 轮起就是 `Protos.String` 本人）。

# const StringValueOf:int = 129

**`"abc".valueOf()`**（第 304 轮）——与 `toString` **同一个实现**
（JS 里这两个方法在字符串上返回的都是接收者自己，所以指到**同一格能力号**——
同一件事不写第二份实现，与 `Array.prototype.toString` / `toLocaleString` 那条先例同款）。

# const StringSubstr:int = 127

**`substr(起, 长度?)`**（第 291 轮）——**号照旧追加在表尾**（`126` 之后）。

**它不是 `substring` 的别名**，也不是 `slice` 的：第二个实参是**长度**
（`"abcdef".substr(1, 2)` 是 `"bc"`，而 `substring(1, 2)` 是 `"b"`）；
**负起点从尾巴数**（`substr(-2)` 是 `"ef"`，而 `substring(-2)` 夹到 `0` ⇒ 整串）；
**起点在尾巴之外给空串**。三条合起来正好说明**它是第三张表**——
与 `StringSubstring` 那一段里记的「`slice` 与 `substring` 只差两处」对照着读：
`substr` 与它们**每一处都不同**，所以既不能顶替、也不能共用。

**它是第 291 轮普查量到的**：判据 `c291-string-slice-substring-substr`
报 `cannot call a non-closure value`——即**那一格根本没装**
（`slice` / `substring` 一直是好的）。

# const StringIsWellFormed:int = 130

**`s.isWellFormed()`**（第 330 轮，ES2024）——这张码元表里**有没有落单的代理**。

**它与 `toWellFormed` 是同一件事的两面**，所以共用一条扫描（见 `SurrogateStep`）：
规范里写死的正是「`isWellFormed()` 为真 ⟺ `toWellFormed()` 原样返回」——
分成两份实现，就会有一天一条说真、另一条却改了东西。

**为什么它是「标准里定死」的那一档**（而不是「各目标可能不同」）：
代理对的合法性是 UTF-16 自己的规矩，与区域设置 / 宿主都无关
（与第 311 轮那两张表同一档）。

# const StringToWellFormed:int = 131

**`s.toWellFormed()`**（第 330 轮）——把每个**落单的代理**换成一个 `U+FFFD`，
**成对的代理一个都不动**（它是一对合法的）。

**替换是逐码元的、不是逐码点的**：`"\uD800\uD800"` 给**两个** `U+FFFD`
（JS 的口径，两个各自落单）——写成「先按码点拆再替换」会先把它们凑成一对，
**静默错值**。

# const StringNormalize:int = 132

**`s.normalize(形态?)`**（第 332 轮，ES2015）——Unicode 规范化的四个形态。

**它借宿主的表**（`host-text.xl.md` 的 `HostNormalize`）：NFC / NFD / NFKC / NFKD
由 Unicode 标准**逐码位定死**，任何一份实现给的都是同一串——**与浮点那两处同一条规矩**
（`NumberToHostText` / `NumberFromHostText`）。而那张表是几万行：手写一遍是另一个量级。

**形态要在这一层先判**：JS 对认不出来的形态抛 **`RangeError`**，而宿主抛的是
**宿主异常**（两条路在这一层的分工与 `NumberFromHostText` 那一处相同）。
**默认 `"NFC"`**（`s.normalize()` 与 `s.normalize(undefined)` 都是它）。

**一处诚实的差别写在明处**：JS 里那张表是**运行期**查的，本仓借的是**宿主那一份**——
两者逐码位相同，但**未来 Unicode 版本更新时两边会一起变**（这正是「借被标准定死的东西」
的含义，与浮点那条**一字不差**）。

# const StringRaw:int = 133

**`String.raw(段落, …内插)`**（第 333 轮，ES2015）——**唯一一个把原文交出来的地方**。

**它读的是 `段落.raw`**（**不是** `段落` 自己）：`` String.raw`a\nb` `` 给的是
`a` + 反斜杠 + `n` + `b`（**四个字符**），而 `段落[0]` 里那个是**真换行**。
两半各在各自的家：`raw` 那一摞由**降级层**铺好（`LowerTaggedTemplate`，
投影对带内插的模板段给的就是原文），这里只管按 JS 的规矩把它们与内插**交错**起来。

**交错那一段是全部语义**：`raw[0] + 内插[0] + raw[1] + …`——
**段落比内插多一个**（`String.raw({ raw: ["p", "q"] }, "-")` 给 `"p-q"`），
多出来的那一个照接（循环写「先接段落、再接内插（如果有）」就自然对）。

**`raw` 那一格按普通属性读**（`GetProperty`）：JS 里它就是一个可枚举的自有属性
（两条判据都拿手写的 `{ raw: [...] }` 量过）；**它可以是任何东西**
（数组、带 `length` 的对象）——所以下面按「一段一段取 `length` / 下标」办，
不假设它是真数组。

# const StringFromCodePoint:int = 126

**`String.fromCodePoint(码位…)`**（第 275 轮）——**静态方法**
（与 `fromCharCode` 同一条先例：`self` 是那个 `String` **普通对象**，
所以它必须排在 `RequireString` **前面**）。

**它与 `fromCharCode` 不是一回事**，而且差在**两头**：
- **实参**是**码位**（`fromCodePoint(0x1F600)` 给**一个**字符），
  而 `fromCharCode` 收的是**码元**（`fromCharCode(0x1F600)` 给**一个**越界码元，
  它**不是**那个 emoji）；
- **输出**可能**不止一个码元**（代理对）——所以这一格要**按码位拆成码元**，
  不能像 `fromCharCode` 那样「一个实参一个码元」。

**越界要抛 `RangeError`**（JS 的口径）：`fromCodePoint(-1)` / `fromCodePoint(0x110000)`
在 JS 里都抛，而 `fromCharCode` 是**夹住**——**两个函数的边角口径不同**，
这一句也是不能互相顶替的地方。

**它是第 273 轮普查量到的**：判据 `string-at-and-codepoints` 量到
`String.fromCodePoint` 不在那儿（同一条里 `.at()` 与 `.codePointAt()` 一直是好的）。

**`replaceAll(找, 换)`**（第 150 轮）——与 `replace` **共用同一段实现**（只差「换一处 / 换全部」）。
**不是「把 `replace` 的结果反复跑一遍」**（那在替换文本里含针时会无限增长）；
扫描接着**这一处之后**走（`"aaa".replaceAll("a","aa")` 给 `"aaaaaa"`——JS 就是三处）。

`replace(要找的, 换成的)` 的号（第 130 轮）——**只做「字符串找字符串、换成字符串」**。

**只替换第一处**（JS 的字符串实参口径，不是 `replaceAll`）。
**三个不做的形态一律响亮地抛**：正则实参、函数实参（`(match) => …`）、
`$1` / `$&` 那一类替换模式——它们的语义靠**正则**与**回调**，
而这一层两样都还没有。静默把它们当普通文本是最坏的一种。

# method RequireString:(table:HeapTable, self:Value)=>void

**原始值接收者这条路上，`self` 是原样的字符串**（没有包装对象）——
「装箱」这件事没有发生，引擎只是**借它的原型**去找方法。

```ts
if (self.Tag !== ValueTag.String) {
  throw new Error("this method needs a string receiver");
}
```

# method SurrogateStep:(units:Array<int>, at:int)=>int

**良构那条扫描在 `at` 这一格要跨几步**（第 330 轮）——
`2` = 一对**配对**的代理、`1` = 一个普通码元、`-1` = **落单的代理**。

**为什么让扫描「跨步」而不是逐格判**：逐格判要把「我是不是某一对的后半」也带上，
而那正是最容易写漏的一格——实测第一版就是逐格判的，
`"a\uD83D\uDE00b"` 在第 2 格（**后随代理**）被判成落单，
于是 `"😀".isWellFormed()` 给**假**（JS 给真）。**跨步之后这一格根本不会单独被访问**。

| 这一格 | 下一格 | 给什么 |
| --- | --- | --- |
| 前导代理 `D800..DBFF` | 后随代理 `DC00..DFFF` | `2`（一对） |
| 前导代理 | 别的 / **没有下一格** | `-1`（落单） |
| 后随代理 `DC00..DFFF` | —— | `-1`（后随代理**永远**不该单独出现） |
| 其余 | —— | `1` |

**它与迭代那一支**不是一回事（第 297 轮的 `DoIterNext`）：那一支也要按码点走，
可它的口径是「**孤立的照样给出去**」（`[..."\uD800"]` 在 JS 里长度是 1）——
它**不判良构**。两处问的是不同的问题，所以合并就是把两件事混成一件。

```ts
const unit = units[at];
if (unit >= 55296 && unit <= 56319) {
  if (at + 1 >= units.length) return -1;
  const follower = units[at + 1];
  if (follower >= 56320 && follower <= 57343) return 2;
  return -1;
}
if (unit >= 56320 && unit <= 57343) return -1;
return 1;
```

# method InvokeString:(room:RoomChecker, table:HeapTable, call:NativeCall | null, id:int, self:Value, args:Array<Value>)=>Value

**字符串内建的分派与实现**。

每个返回新字符串的地方都**先问 room**（`charAt` 也要：空串照样占一个对象头）。

**`charCodeAt` 越界给 `undefined`**（JS 给 `NaN`）：`NaN` 要浮点那一套
（`value.xl.md` 里 `Float64` 有了，但「NaN 怎么表示、怎么显示」是另一件事），
所以这一轮**给 `undefined` 并写在这里**——不假装它是 `NaN`。

**负下标不按 JS 的「从末尾数」**：`slice(-2)` 在 JS 里是最后两个字符，
这里**夹到 0**。这是**已知的语义差**，写在文首那张表里（做法与理由同 `??`/`?.` 那些）。

```ts
// **静态方法排在 `RequireString` 前面**（第 130 轮，与 `Array.isArray` 同一条先例）：
// `String.fromCharCode(65)` 的 `self` 是那个 `String` **普通对象**，过一遍 `RequireString`
// 会当场抛（症状离现场很远：报的是「这个方法要一个字符串接收者」，而调用点看着完全正常）。
if (id === StringFromCharCode) {
  const codes: number[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].IsNumber()) codes.push(args[i].AsInt());
  }
  if (!room(ObjectCharge + CodeUnitCharge * codes.length)) throw new Error("out of room");
  return Value.FromString(table.CreateString(codes));
}
if (id === StringRaw) {
  const cooked = args.length > 0 ? args[0] : Value.Undefined();
  if (!cooked.IsObject()) {
    throw new TypeError("String.raw needs an object with a raw property");
  }
  // **不借 `GetProperty`**（这一层没有原型表——`install.xl.md` 写着为什么不为一个方法改签名）：
  // `raw` 与 `length` 在 JS 里都是**自有**属性（`String.raw` 只认自有那一格），
  // 所以「找一格 + 读一格」那两步就够，而它俩一个要 `room`、一个要 `call`，都在手上。
  const rawKey = Value.FromString(table.CreateString(Units("raw")));
  if (!room(ObjectCharge + CodeUnitCharge * 6)) throw new Error("out of room");
  const rawFound = FindProperty(room, table, cooked.Ref, rawKey);
  if (rawFound === null || rawFound.Owner !== cooked.Ref) {
    throw new TypeError("String.raw needs an object with a raw property");
  }
  const raws = ReadProperty(NeverCall, table, rawFound, cooked);
  if (!raws.IsObject()) {
    throw new TypeError("String.raw needs an object with a raw property");
  }
  // **段落个数**：`raw.length`（按整数读——与 `Array.from({ length: n })` 同一条口径）。
  //
  // **数组那一档要单独认**（第 333 轮实测踩到）：数组的 `length` **不在属性表里**
  //（它是结构属性，`props.xl.md` 的 `IsLengthKey` 那一段写着）——
  // 所以拿 `FindProperty` 去找它**永远找不到** ⇒ 段落数算成 `0` ⇒
  // `` String.raw`a\nb` `` 给**空串**（实测：第一版就是这个症状，而报错一声不响）。
  const lengthKey = Value.FromString(table.CreateString(Units("length")));
  if (!room(ObjectCharge + CodeUnitCharge * 6)) throw new Error("out of room");
  let count = 0;
  if (raws.Tag === ValueTag.Array) {
    count = table.Get(raws.Ref).AsArray().GetLength();
  } else {
    const lengthFound = FindProperty(room, table, raws.Ref, lengthKey);
    const countValue = lengthFound === null
      ? Value.Undefined()
      : ReadProperty(NeverCall, table, lengthFound, raws);
    count = countValue.IsNumber() ? countValue.AsInt() : 0;
  }
  const pieces: number[][] = [];
  let total = 0;
  for (let i = 0; i < count; i++) {
    // **一段一段取**：字符串段落直接给码元，别的一律 `ToString`（`JsTextUnits` 管这一档）。
    const units = JsTextUnits(table, GetIndex(table, raws, Value.FromInt(i)));
    pieces.push(units);
    total = total + units.length;
  }
  // **内插接在段落之间**：`raw[0] + sub[0] + raw[1] + …`（段落比内插多一个）。
  const innerUnits: number[][] = [];
  for (let i = 0; i + 1 < args.length; i++) {
    const units = ValueUnits(table, args[i + 1], 0);
    innerUnits.push(units);
    total = total + units.length;
  }
  if (!room(CodeUnitCharge * total + ObjectCharge)) throw new Error("out of room");
  const joined: number[] = [];
  for (let i = 0; i < pieces.length; i++) {
    for (let j = 0; j < pieces[i].length; j++) joined.push(pieces[i][j]);
    if (i < innerUnits.length) {
      for (let j = 0; j < innerUnits[i].length; j++) joined.push(innerUnits[i][j]);
    }
  }
  return Value.FromString(table.CreateString(joined));
}
if (id === StringFromCodePoint) {
  // **静态方法，排在 `RequireString` 前面**（与 `fromCharCode` 同一条先例，理由见号那一段）。
  // **一个码位可能拆成两个码元**（代理对）——所以先把整张码元表算出来，
  // 再一次性开串（`CreateString` 收的是**整张表**，不是「能追加的串」）。
  // **两头都与 `fromCharCode` 不同**：实参是**码位**（不是码元）、
  // 越界**抛 `RangeError`**（不是夹住）——JS 把这两个函数的口径分得很开。
  const codeUnits: number[] = [];
  for (let i = 0; i < args.length; i++) {
    // **不是数字就抛**（JS 先 `ToNumber`，拿不到整码位就抛）——
    // 这里**不做 `ToNumber`**（那要碰堆），直接要求一个数值格子；
    // 给别的类型就落到这一句抛上（**响亮**，不是静默跳过）。
    if (!args[i].IsNumber()) {
      throw new RangeError("invalid code point for String.fromCodePoint");
    }
    const point = args[i].AsDouble();
    // **整数、且落在 `0..0x10FFFF`**：`NaN` / 小数 / 越界**一律抛**（JS 的口径）。
    // `NaN` 那一格由 `point !== Math.floor(point)` 顺手接住
    //（`Math.floor(NaN)` 是 `NaN`，两者不等）。
    if (point !== Math.floor(point) || point < 0 || point > 0x10ffff) {
      throw new RangeError("invalid code point for String.fromCodePoint");
    }
    if (point <= 0xffff) {
      codeUnits.push(point);
      continue;
    }
    // **代理对的两个公式**（JS 的 `UTF16EncodeCodePoint`）：
    // 高位是 `0xD800 + (偏移 >> 10)`、低位是 `0xDC00 + (偏移 & 0x3FF)`。
    const offset = point - 0x10000;
    codeUnits.push(0xd800 + (offset >> 10));
    codeUnits.push(0xdc00 + (offset & 0x3ff));
  }
  if (!room(ObjectCharge + CodeUnitCharge * codeUnits.length)) throw new Error("out of room");
  return Value.FromString(table.CreateString(codeUnits));
}
// **包装对象要在这里脱箱**（第 310 轮）：`new String("ab").toUpperCase()`——
// 接收者是一个**普通对象**（方法是从 `String.prototype` 上找到的），
// 而下面**每一条**都按「`self` 是字符串」写。
// **脱箱只有一处**（`text.xl.md` 的 `UnwrapBox`，与 `globals.xl.md` 那一处
// **同一份**）——在两个文件里各写一遍就是两处会漂（`globals` 已经 import 了本文件，
// 所以那个判据只能落在 `text.xl.md`）。
// **它排在这里**（静态方法那几支之后）：那几支的 `self` 是 `String` **对象本身**，
// 不该被当成包装对象。
self = UnwrapBox(table, self);
RequireString(table, self);
const units = JsTextUnits(table, self);
// **`isWellFormed` / `toWellFormed`**（第 330 轮）——两条**共用同一条扫描**
//（`SurrogateStep`，理由见那两个号那一段）。
if (id === StringIsWellFormed) {
  let at = 0;
  while (at < units.length) {
    const step = SurrogateStep(units, at);
    if (step < 0) return Value.FromBool(false);
    at = at + step;
  }
  return Value.FromBool(true);
}
if (id === StringToWellFormed) {
  // **先扫一遍判「要不要动」**：良构时**原样把接收者交回去**
  //（`"a".toWellFormed() === "a"` 在 JS 里为真，与 `toString` / `valueOf` 那一族同一条口径），
  // 而「边扫边造、最后一个字符都没换也造一个新串」会让上面那条判等给假。
  let at = 0;
  let clean = true;
  while (at < units.length) {
    const step = SurrogateStep(units, at);
    if (step < 0) { clean = false; break; }
    at = at + step;
  }
  if (clean) return self;
  const fixed: number[] = [];
  at = 0;
  while (at < units.length) {
    const step = SurrogateStep(units, at);
    if (step < 0) {
      // **落单的那一格换成一个 `U+FFFD`**（`65533`），其余原样。
      fixed.push(65533);
      at = at + 1;
      continue;
    }
    for (let k = 0; k < step; k++) fixed.push(units[at + k]);
    at = at + step;
  }
  if (!room(ObjectCharge + CodeUnitCharge * fixed.length)) throw new Error("out of room");
  return Value.FromString(table.CreateString(fixed));
}
if (id === StringNormalize) {
  // **形态先判、再交给宿主**（第 332 轮，理由见号那一段）：JS 对认不出来的形态
  // 抛 `RangeError`，而宿主抛的是宿主异常。**缺省 `"NFC"`**（`undefined` 也走它）。
  let form = "NFC";
  if (args.length > 0 && args[0].Tag !== ValueTag.Undefined) {
    form = HostUnitsText(JsTextUnits(table, args[0]));
  }
  if (form !== "NFC" && form !== "NFD" && form !== "NFKC" && form !== "NFKD") {
    throw new RangeError("invalid normalization form: " + form);
  }
  const normalized = HostNormalize(HostUnitsText(units), form);
  const out = HostTextUnits(normalized);
  if (!room(ObjectCharge + CodeUnitCharge * out.length)) throw new Error("out of room");
  return Value.FromString(table.CreateString(out));
}
if (id === StringCharAt) {
  const at = ArgOr(args, 0, 0);
  if (at < 0 || at >= units.length) {
    if (!room(ObjectCharge)) throw new Error("out of room");
    return Value.FromString(table.CreateString([]));
  }
  if (!room(ObjectCharge + CodeUnitCharge)) throw new Error("out of room");
  return Value.FromString(table.CreateString([units[at]]));
}
if (id === StringCharCodeAt) {
  // **越界给 `NaN`**（第 208 轮改）：JS 的 `"".charCodeAt(0)` 是 `NaN`，
  // 而这里原来给的是 `undefined`——**静默错值**（判据 `string-charAt-charCodeAt` 现场红的：
  // `"".charCodeAt(0) !== "".charCodeAt(0)` 在 JS 里是**真**（`NaN` 与自己不等），
  // 给 `undefined` 就成了**假**）。这一格与 `charAt` 不一样：那个越界给**空串**（JS 的口径）。
  const at = ArgOr(args, 0, 0);
  if (at < 0 || at >= units.length) return Value.FromDouble(NaN);
  return Value.FromInt(units[at]);
}
if (id === StringLocaleCompare) {
  // **`localeCompare`**（第 208 轮）：JS 的完整语义要**一张区域表**（本仓没有），
  // 所以这里按**码元**比、并且**只做 ASCII**——非 ASCII 当场抛
  //（与 `toUpperCase` / `toLowerCase` 同一条纪律：宁可缺，也不静默换一个「看起来对」的答案）。
  const other = args.length > 0 ? JsTextUnits(table, args[0]) : [];
  for (let i = 0; i < units.length; i++) {
    if (units[i] > 127) throw new Error("unimplemented: localeCompare outside ASCII (there is no collation table here)");
  }
  for (let i = 0; i < other.length; i++) {
    if (other[i] > 127) throw new Error("unimplemented: localeCompare outside ASCII (there is no collation table here)");
  }
  const shorter = units.length < other.length ? units.length : other.length;
  for (let i = 0; i < shorter; i++) {
    if (units[i] === other[i]) continue;
    return Value.FromInt(units[i] < other[i] ? -1 : 1);
  }
  if (units.length === other.length) return Value.FromInt(0);
  return Value.FromInt(units.length < other.length ? -1 : 1);
}
if (id === StringIndexOf || id === StringLastIndexOf) {
  const needle = args.length > 0 ? JsTextUnits(table, args[0]) : [];
  const length0 = units.length;
  // **`fromIndex` 那一格**（第 208 轮）：与数组那一轮同一处缺口——
  // 第二个实参原来**被丢掉**（`"hello".indexOf("o", 5)` 从 0 找起，**静默错值**）。
  // **两条边角照 JS**，而**字符串这一支与数组那一支不是同一条规矩**（第 208 轮实测）：
  // `String.indexOf` 的 `position` **夹到 `[0, len]`**（`"hello world".indexOf("o", -5)`
  // 是 `4`——**负数不从末尾数**！那是 `Array.prototype.indexOf` 的规矩）；
  // `lastIndexOf` 缺省**从尾巴起**、给了就**往前找**、负数当 `0`。
  let from = 0;
  if (id === StringLastIndexOf) from = length0 - needle.length;
  if (args.length > 1) {
    from = ArgOr(args, 1, from);
    if (id === StringLastIndexOf) {
      if (from < 0) from = 0;
      if (from > length0 - needle.length) from = length0 - needle.length;
    } else {
      if (from < 0) from = 0;
      if (from > length0) {
        // **越过尾巴**：空串给 `length` 那一段、非空串给 `-1`（JS 的口径）。
        if (needle.length === 0) return Value.FromInt(length0);
        return Value.FromInt(-1);
      }
    }
  }
  if (id === StringLastIndexOf) {
    // **空串在末尾匹配一次**（`"abc".lastIndexOf("")` 是 `3`）。
    if (needle.length === 0) return Value.FromInt(from < 0 ? 0 : from);
    for (let i = from; i >= 0; i--) {
      let same = true;
      for (let j = 0; j < needle.length; j++) {
        if (units[i + j] !== needle[j]) same = false;
      }
      if (same) return Value.FromInt(i);
    }
    return Value.FromInt(-1);
  }
  if (needle.length === 0) return Value.FromInt(from);
  for (let i = from; i + needle.length <= length0; i++) {
    let same = true;
    for (let j = 0; j < needle.length; j++) {
      if (units[i + j] !== needle[j]) same = false;
    }
    if (same) return Value.FromInt(i);
  }
  return Value.FromInt(-1);
}
if (id === StringAt) {
  // **`at(i)`**（第 208 轮）：与 `s[i]` 只差**负下标从尾巴数**
  //（与数组那一格 `ArrayAt` 是同一条规矩——两处都不许把 `s[-1]` 当成「从尾巴数」）。
  // **不给实参 = 0**（第 208 轮实测）：JS 走的是 `ToIntegerOrInfinity(undefined)`
  //（`NaN` → `0`），所以 `"abc".at()` 是 `"a"`、`"abc".codePointAt()` 是 `65`——
  // **不是 `undefined`**（那是「越界」那一档，两档不一样）。
  let at = ArgOr(args, 0, 0);
  if (at < 0) at = at + units.length;
  if (at < 0 || at >= units.length) return Value.Undefined();
  if (!room(ObjectCharge + CodeUnitCharge)) throw new Error("out of room");
  return Value.FromString(table.CreateString([units[at]]));
}
if (id === StringCodePointAt) {
  // **`codePointAt(i)`**（第 208 轮）：把**代理对**合成一个码位
  //（`"𐀀".codePointAt(0)` 是 `65536`，而 `charCodeAt(0)` 是那个高代理——两格都要在）。
  // **不给实参 = 0**（与 `at` 同一档，理由写在那一支里）。
  const at = ArgOr(args, 0, 0);
  if (at < 0 || at >= units.length) return Value.Undefined();
  const first = units[at];
  if (first >= 0xd800 && first <= 0xdbff && at + 1 < units.length) {
    const second = units[at + 1];
    if (second >= 0xdc00 && second <= 0xdfff) {
      return Value.FromInt((first - 0xd800) * 0x400 + (second - 0xdc00) + 0x10000);
    }
  }
  return Value.FromInt(first);
}
if (id === StringConcatMethod) {
  // **`String.prototype.concat(…args)`**（第 208 轮）：把 `self` 与**每个实参**的文本接起来。
  // **实参先过 `ToString`**（`"a".concat(1, true)` 是 `"a1true"`）——
  // 所以走的是「任意值 → 文本」那条（`ValueUnits`，与 `String(x)` 同一处），
  // 而不是 `TextUnitsOf`（那个对非字符串**抛**，是引擎的口径）。
  const parts: number[][] = [units];
  let total = units.length;
  for (let i = 0; i < args.length; i++) {
    const unitsOfArg = ValueUnits(table, args[i], 0);
    parts.push(unitsOfArg);
    total = total + unitsOfArg.length;
  }
  if (!room(ObjectCharge + CodeUnitCharge * total)) throw new Error("out of room");
  const joined: number[] = [];
  for (let i = 0; i < parts.length; i++) {
    for (let j = 0; j < parts[i].length; j++) joined.push(parts[i][j]);
  }
  return Value.FromString(table.CreateString(joined));
}
if (id === StringSlice) {
  const length = units.length;
  // **两个端点都走 `NormalizeRangeIndex`**（第 208 轮）：与数组那一轮同一处缺口——
  // 原来只夹了「起点小于 0 → 0」，于是 **`"abcdef".slice(-2)` 给整串**
  //（JS 给 `"ef"`，**静默错值**）。
  // **`substring` 那一支与它不一样**（`substring` 把负数当 0、还会**交换**两个端点）——
  // 所以那一支**不许**接这个规整（接上去就是「看起来统一了」的错）。
  const start = NormalizeRangeIndex(ArgOr(args, 0, 0), length);
  let end = NormalizeRangeIndex(ArgOr(args, 1, length), length);
  if (end < start) end = start;
  const cut: number[] = [];
  for (let i = start; i < end; i++) cut.push(units[i]);
  if (!room(ObjectCharge + CodeUnitCharge * cut.length)) throw new Error("out of room");
  return Value.FromString(table.CreateString(cut));
}
if (id === StringIncludes) {
  // **`includes` 与 `indexOf` 共用一趟扫描**：差别只在「给不给下标」。
  // **空串恒为真**（JS 就是这么定的：`"abc".includes("")` 是真）——
  // 这一条与 `indexOf` 给 `0` 是同一件事的两种说法。
  const needle = args.length > 0 ? JsTextUnits(table, args[0]) : [];
  if (needle.length === 0) return Value.FromBool(true);
  for (let i = 0; i + needle.length <= units.length; i++) {
    let same = true;
    for (let j = 0; j < needle.length; j++) {
      if (units[i + j] !== needle[j]) same = false;
    }
    if (same) return Value.FromBool(true);
  }
  return Value.FromBool(false);
}
if (id === StringToUpperCase || id === StringToLowerCase
  || id === StringToLocaleUpperCase || id === StringToLocaleLowerCase) {
  // **整张表在第 617 轮补上了**（见本文件末尾那一节）。
  // 第 120 轮那一版**只做 ASCII**、遇到 > 127 **当场抛**——那是对的取舍
  //（宁可缺，也不静默换形状），缺的是**表本身**。
  //
  // **为什么是「一张表」而不是「借宿主」**：`runtime/host-text.xl.md` 那道线
  // 只允许借「结果被标准定死」的四次转换，`toUpperCase` 不在里面——
  // 它借的是一张**会随 Unicode 版本变的表**，而那种东西进引擎就等于
  // 「引擎的输出随宿主版本变」。表留在建库层、引擎一行都不动。
  //
  // **这里只留两行**：转换、按房间预算造串——
  // 逐码元的逻辑（展开表优先、1:1 次之、都没有原样）在 `CaseUnits` 里一份。
  const out = CaseUnits(units, id);
  if (!room(ObjectCharge + CodeUnitCharge * out.length)) throw new Error("out of room");
  return Value.FromString(table.CreateString(out));
}
if (id === StringTrim || id === StringTrimStart || id === StringTrimEnd) {
  // **JS 要裁的那张表是标准定死的**（第 311 轮补全）。原来这里**只认 ASCII 六格**
  // （9 / 10 / 11 / 12 / 13 / 32）、扫到 > 127 的边缘码元就**抛**——
  // 那是「认不出来就不猜」 的写法，可这张表**根本不用猜**：
  // `WhiteSpace` + `LineTerminator` 的名单是规范里写着的（`String.prototype.trim`
  // 的「white space」= **WhiteSpace ∪ LineTerminator**）。
  //
  // **两半**：`WhiteSpace` = TAB(9) VT(11) FF(12) SP(32) NBSP(U+00A0)
  // ZWNBSP(U+FEFF) 以及 **Unicode 的 `Zs`**（U+1680、U+2000..U+200A、
  // U+202F、U+205F、U+3000）；`LineTerminator` = LF(10) CR(13)
  // LS(U+2028) PS(U+2029)。
  //
  // **`Zs` 那一段写成区间**（U+2000..U+200A 是连续十个）——逐个列出来更容易漏，
  // 而漏一个的症状是「那一格**静默**没裁掉」（判据 `c305-std-string-trim-unicode-space`：
  // `"\u00a0x\u00a0".trim()` 与 `"\u3000y".trim()`）。
  // **那张名单里没有任何东西需要问宿主**：它是规范里的**字面表**，
  // 与「大小写要 Unicode 表」是两回事（后者是一张巨大的映射表，前者是二十来个码元）。
  const blank = (unit: number): boolean => {
    if (unit === 32 || unit === 9 || unit === 10 || unit === 11 || unit === 12 || unit === 13) return true;
    if (unit === 0xa0 || unit === 0xfeff || unit === 0x1680) return true;
    if (unit === 0x2028 || unit === 0x2029 || unit === 0x202f || unit === 0x205f || unit === 0x3000) return true;
    return unit >= 0x2000 && unit <= 0x200a;
  };
  const trimFront = id !== StringTrimEnd;
  const trimBack = id !== StringTrimStart;
  let start = 0;
  let end = units.length;
  if (trimFront) {
    while (start < end && blank(units[start])) start++;
  }
  if (trimBack) {
    while (end > start && blank(units[end - 1])) end--;
  }
  const cut: number[] = [];
  for (let i = start; i < end; i++) cut.push(units[i]);
  if (!room(ObjectCharge + CodeUnitCharge * cut.length)) throw new Error("out of room");
  return Value.FromString(table.CreateString(cut));
}
if (id === StringStartsWith || id === StringEndsWith) {
  // **两个都收可选的第二个参数**（第 123 轮）——但它们的含义**不一样**：
  // `startsWith` 的那个是**起点**，`endsWith` 的那个是**结束位置**（JS 就是这么定的）。
  const needle = args.length > 0 ? JsTextUnits(table, args[0]) : [];
  const length = units.length;
  let from = ArgOr(args, 1, id === StringEndsWith ? length : 0);
  if (from < 0) from = 0;
  if (from > length) from = length;
  if (id === StringStartsWith) {
    if (needle.length === 0) return Value.FromBool(true);
    if (from + needle.length > length) return Value.FromBool(false);
    let same = true;
    for (let i = 0; i < needle.length; i++) {
      if (units[from + i] !== needle[i]) same = false;
    }
    return Value.FromBool(same);
  }
  if (needle.length === 0) return Value.FromBool(true);
  if (needle.length > from) return Value.FromBool(false);
  let same = true;
  for (let i = 0; i < needle.length; i++) {
    if (units[from - needle.length + i] !== needle[i]) same = false;
  }
  return Value.FromBool(same);
}
if (id === StringSubstring) {
  // **夹到 0、再交换**（JS 的两条怪规矩，见 `StringSubstring` 那一段）。
  const length = units.length;
  let start = ArgOr(args, 0, 0);
  let end = ArgOr(args, 1, length);
  if (start < 0) start = 0;
  if (start > length) start = length;
  if (end < 0) end = 0;
  if (end > length) end = length;
  if (start > end) {
    const swap = start;
    start = end;
    end = swap;
  }
  const cut: number[] = [];
  for (let i = start; i < end; i++) cut.push(units[i]);
  if (!room(ObjectCharge + CodeUnitCharge * cut.length)) throw new Error("out of room");
  return Value.FromString(table.CreateString(cut));
}
if (id === StringSubstr) {
  // **第三个实参是「长度」**（见 `StringSubstr` 那一段）——三处与 `slice` / `substring` 都不同：
  // 负起点**从尾巴数**、缺省长度是「到尾巴」、起点越界给**空串**（不是夹到尾巴）。
  const length = units.length;
  const rawStart = args.length > 0 ? ArgOr(args, 0, 0) : 0;
  // **向零截断**（JS 的 `ToIntegerOrInfinity`，与 `repeat` 那条同一个折法）。
  let start = rawStart < 0 ? Math.ceil(rawStart) : Math.floor(rawStart);
  if (start < 0) start = length + start;
  if (start < 0) start = 0;
  if (start > length) start = length;
  let count = length - start;
  if (args.length > 1 && !args[1].IsUndefined()) {
    const rawCount = ArgOr(args, 1, 0);
    const asked = rawCount < 0 ? 0 : Math.floor(rawCount);
    if (asked < count) count = asked;
  }
  if (count < 0) count = 0;
  const cut: number[] = [];
  for (let i = start; i < start + count; i++) cut.push(units[i]);
  if (!room(ObjectCharge + CodeUnitCharge * cut.length)) throw new Error("out of room");
  return Value.FromString(table.CreateString(cut));
}
if (id === StringRepeat) {
  // **向零截断；负数抛 `RangeError`**（JS 的 `ToIntegerOrInfinity` + RangeError）。
  // **抛的必须是 `RangeError`**（第 288 轮改）：原来抛的是**裸 `Error`**，
  // 于是脚本里 `e.name` 给 `"Error"`（Node 给 `"RangeError"`）——
  // 而 `install.xl.md` 那一支**恰恰按宿主异常的类**翻族（`error instanceof RangeError`），
  // 所以「抛什么」是**能被脚本看见**的（判据 `string-pad-and-repeat-edge-forms` 量的就是它）。
  // 同一个文件里 `fromCodePoint` 那一支早就抛 `RangeError`（第 275 轮）——这一处是漏的。
  const raw = args.length > 0 ? ArgOr(args, 0, 0) : 0;
  const count = raw < 0 ? -1 : raw;
  if (count < 0) throw new RangeError("repeat needs a count that is not negative");
  const total = units.length * count;
  // **上限交给 room**（见 `StringRepeat` 那一段：不另设一个人为的上限）。
  if (!room(ObjectCharge + CodeUnitCharge * total)) throw new Error("out of room");
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    for (let j = 0; j < units.length; j++) out.push(units[j]);
  }
  return Value.FromString(table.CreateString(out));
}
if (id === StringPadStart || id === StringPadEnd) {
  // **两条边角照 JS 给**（见 `StringPadStart` 那一段）：
  // 目标长度不大于当前长度就**原样返回**；**填充串是空串就不补**。
  const target = ArgOr(args, 0, 0);
  const fill = args.length > 1 && args[1].Tag === ValueTag.String
    ? JsTextUnits(table, args[1])
    : Units(" ");
  if (target <= units.length || fill.length === 0) {
    if (!room(ObjectCharge + CodeUnitCharge * units.length)) throw new Error("out of room");
    return Value.FromString(table.CreateString(units));
  }
  const total = target - units.length;
  if (!room(ObjectCharge + CodeUnitCharge * (units.length + total))) throw new Error("out of room");
  const out: number[] = [];
  if (id === StringPadStart) {
    for (let i = 0; i < total; i++) out.push(fill[i % fill.length]);
    for (let i = 0; i < units.length; i++) out.push(units[i]);
  } else {
    for (let i = 0; i < units.length; i++) out.push(units[i]);
    for (let i = 0; i < total; i++) out.push(fill[i % fill.length]);
  }
  return Value.FromString(table.CreateString(out));
}
if (id === StringReplace || id === StringReplaceAll) {
  // **三个形态先挡掉**：`args[0]` / `args[1]` 不是字符串就抛（正则实参、函数实参、
  // 以及 `$&` / `$1` 那一类模式都落在这里）。挡在前面而不是「当普通文本用」——
  // 静默把 `/a/g` 当字面量会**给出一个看起来对的错答案**（`"a-a".replace(/a/g,"b")`
  // 在 JS 里是 `"b-b"`，当字面量就成了 `"a-a"`）。
  //
  // **`replaceAll` 与 `replace` 共用这一段**（第 150 轮）：两者只差
  // 「换一处还是换全部」——分成两份实现的话，空串那一格 / 找不到那一格
  // 就要各写一遍（而它们正是最容易走偏的两格）。
  const replaceEverywhere = id === StringReplaceAll;
  // **第 296 轮把另外两半接上了**：
  //   · **替换值是函数**（每一处匹配调它一次，实参 `(匹配文本, 位置, 整个串)`）；
  //   · **替换文本里的记号**（`$$` / `$&` / `` $` `` / `$'`，见 `JsSubstitutionUnits`）。
  // **正则那一半仍旧不做**（`RegExp` 是 v1 写死的非目标）——它现在**响亮地抛**，
  // 而且抛的是「需要字符串模式」而不是「需要两个字符串实参」（话说得更准了）。
  const replacementIsCallable = args.length > 1 && IsCallableValue(table, args[1]);
  if (args.length < 2 || args[0].Tag !== ValueTag.String
    || (args[1].Tag !== ValueTag.String && !replacementIsCallable)) {
    throw new Error("unimplemented: String.replace needs a string pattern and a string or function replacement "
      + "(regex patterns are not supported)");
  }
  const needle = JsTextUnits(table, args[0]);
  const replacement = args[1].Tag === ValueTag.String ? JsTextUnits(table, args[1]) : [];
  if (needle.length === 0 && replacementIsCallable) {
    // **空针 + 函数**那一格**没做**（判据没有量它）：JS 会在**每一个**插入点上调一次回调
    // （`replaceAll` 是 `长度 + 1` 次、`replace` 是 1 次）——形状与下面那条循环不同，
    // 所以**响亮地抛**，不当成「匹配到了空串」糊过去。
    throw new Error("unimplemented: String.replace with an empty pattern and a function replacement");
  }
  if (needle.length === 0) {
    // **空串那一格两种调用不一样**（实测抓到的）：
    //   · `"ab".replace("", "-")` 给 `"-ab"`（**只在最前面插一次**）；
    //   · `"abc".replaceAll("", "-")` 给 `"-a-b-c-"`（**每一格前面都插**，末尾也插
    //     ——一共 `长度 + 1` 处）。
    // 我第一版按「`replaceAll` 的空串也只插一次」写，判据当场给了 `"-abc"`
    //（与 Node 的 `"-a-b-c-"` 一比就露）。**空串的「落点」是 `长度 + 1` 个**：
    // 第 `i` 个落点在第 `i` 个码元**之前**，最后一个在最末尾。
    const inserted: number[] = [];
    for (let k = 0; k < units.length; k++) {
      if (replaceEverywhere) {
        for (let m = 0; m < replacement.length; m++) inserted.push(replacement[m]);
      }
      inserted.push(units[k]);
    }
    if (replaceEverywhere) {
      for (let m = 0; m < replacement.length; m++) inserted.push(replacement[m]);
    } else {
      // `replace` 那一格是「插在最前面」——所以要把刚才的顺序倒过来：
      // 先放替换文本、再放原串。
      const front: number[] = [];
      for (let m = 0; m < replacement.length; m++) front.push(replacement[m]);
      for (let k = 0; k < inserted.length; k++) front.push(inserted[k]);
      if (!room(ObjectCharge + CodeUnitCharge * front.length)) throw new Error("out of room");
      return Value.FromString(table.CreateString(front));
    }
    if (!room(ObjectCharge + CodeUnitCharge * inserted.length)) throw new Error("out of room");
    return Value.FromString(table.CreateString(inserted));
  }
  // **先扫出所有落点**（`replaceAll` 要全部、`replace` 只要第一个）。
  const hits: number[] = [];
  let scan = 0;
  while (scan + needle.length <= units.length) {
    let same = false;
    for (let i = scan; i + needle.length <= units.length; i++) {
      let matched = true;
      for (let j = 0; j < needle.length; j++) {
        if (units[i + j] !== needle[j]) matched = false;
      }
      if (matched) {
        hits.push(i);
        // **接着从「这一处之后」扫**（**不回头扫刚换上去的文本**）：
        // `"aaa".replaceAll("a", "aa")` 在 JS 里是 `"aaaaaa"`（三处），
        // 回头扫就会变成无限增长。
        scan = i + needle.length;
        same = true;
        break;
      }
    }
    if (!same) break;
    if (!replaceEverywhere) break;
  }
  // **找不到就原样返回**（JS 的口径；返回的还是同一个字符串值）。
  if (hits.length === 0) return self;
  // **每一处要用什么替换文本**（第 296 轮）：两种来源、逐处算——
  // 所以长度是**逐处累加**出来的（原来是「每一处一样长」那个乘法：
  // 记号（`$'` 之类）与函数都会让每一处**不一样长**）。
  const pieces: number[][] = [];
  for (let k = 0; k < hits.length; k++) {
    if (replacementIsCallable) {
      if (call === null) {
        throw new Error("String.replace needs a call channel (the host must pass one)");
      }
      const matched: number[] = [];
      for (let j = 0; j < needle.length; j++) matched.push(units[hits[k] + j]);
      // **实参是 `(匹配文本, 位置, 整个串)`**（JS 的口径——没有捕获组时就是这三个）。
      const produced = call(args[1], Value.Undefined(),
        [Value.FromString(table.CreateString(matched)), Value.FromInt(hits[k]), self]);
      // **返回值按 `ToString` 折**（JS 的口径：返回一个数就印那个数）。
      pieces.push(JsTextUnits(table, produced));
    } else {
      pieces.push(JsSubstitutionUnits(replacement, units, hits[k], needle.length));
    }
  }
  let total = units.length;
  for (let k = 0; k < pieces.length; k++) total = total + pieces[k].length - needle.length;
  if (!room(ObjectCharge + CodeUnitCharge * total)) throw new Error("out of room");
  const joined: number[] = [];
  let cursor = 0;
  for (let k = 0; k < hits.length; k++) {
    for (let i = cursor; i < hits[k]; i++) joined.push(units[i]);
    for (let i = 0; i < pieces[k].length; i++) joined.push(pieces[k][i]);
    cursor = hits[k] + needle.length;
  }
  for (let i = cursor; i < units.length; i++) joined.push(units[i]);
  return Value.FromString(table.CreateString(joined));
}
if (id === StringToString || id === StringValueOf) {
  // **`"abc".toString()` / `"abc".valueOf()`**（第 304 轮）——两个都返回**接收者自己**
  //（JS 的 `String.prototype.toString` / `valueOf` 就是恒等）。
  // **接收者那一关由上面那句 `RequireString` 把着**：不是字符串就抛
  //（JS 在这里也抛 `TypeError`——`String.prototype.toString.call(1)` 不是**静默**给 `1`）。
  return self;
}
throw new Error("unimplemented: string builtin " + id);
```

# method JsSubstitutionUnits:(template:Array<int>, units:Array<int>, at:int, length:int)=>Array<int>

**替换文本里的记号**（第 296 轮）——`String.prototype.replace` 的第二格实参**不是纯文本**：
它里面那几个 `$` 开头的记号会被换成与**匹配位置有关**的东西。

| 记号 | 换成 |
| --- | --- |
| `$$` | 一个 `$` |
| `$&` | **匹配到的那一段** |
| `` $` `` | 匹配**之前**的那一段 |
| `$'` | 匹配**之后**的那一段 |
| `$n` / `$nn` | **捕获组**——而**字符串模式没有捕获组** ⇒ **原样留着** |

**`$1` 那一格为什么是「原样留着」而不是「换成空串」**：JS 的规矩是
「**没有那个组就不动它**」（`"abc".replace("b", "$1")` 给 `"a$1c"`）——
换成空串是**静默错值**，而且错得很像对的（少了一个 `$1`，看不出是错的）。
**正则那一档要等 `RegExp`**（口径外），所以这一格**今天永远不会**有捕获组。

**为什么单独一个方法**：`replace` 与 `replaceAll` 共用它，而**逐处的顺序**是语义——
`$'` 取的是「这一处之后」、`` $` `` 取的是「这一处之前」，两处都跟着**当前这一处**走
（写成「整个串的前后」在 `replaceAll` 上会**每一处都一样** ⇒ 静默错值）。

```ts
const out: number[] = [];
let i = 0;
while (i < template.length) {
  const unit = template[i];
  if (unit !== 36) {
    out.push(unit);
    i = i + 1;
    continue;
  }
  const next = i + 1 < template.length ? template[i + 1] : -1;
  if (next === 36) {
    out.push(36);
    i = i + 2;
    continue;
  }
  if (next === 38) {
    for (let j = 0; j < length; j++) out.push(units[at + j]);
    i = i + 2;
    continue;
  }
  if (next === 96) {
    for (let j = 0; j < at; j++) out.push(units[j]);
    i = i + 2;
    continue;
  }
  if (next === 39) {
    for (let j = at + length; j < units.length; j++) out.push(units[j]);
    i = i + 2;
    continue;
  }
  out.push(36);
  i = i + 1;
}
return out;
```

# method SplitString:(room:RoomChecker, table:HeapTable, protos:Protos, self:Value, args:Array<Value>)=>Value

**`String.prototype.split`**（第 120 轮补）：按分隔串切成一个**数组**。

**JS 的三条边角都照着给**（它们正是最容易写错的地方）：

| 输入 | 结果 |
| --- | --- |
| `"a,b".split(",")` | `["a", "b"]` |
| `"a,b,".split(",")` | `["a", "b", ""]`（**末尾空段不能丢**） |
| `"".split(",")` | `[""]`（没匹配上，整串就是唯一一段） |
| `"abc".split("")` | `["a", "b", "c"]`（空分隔符 = 逐码元） |
| `"".split("")` | `[]`（**不是 `[""]`**——空分隔符那一支**不补尾段**） |
| `"abc".split()` / `split(undefined)` | `["abc"]` |

**`limit` 参数**（第 208 轮）：JS 的第二个参数是「**最多几段**」——
到了上限**连尾巴那一段也不收**（`"a-b-c".split("-", 2)` 是 `["a","b"]`，不是 `["a","b-c"]`）。
原来它**抛**（那一抛是对的：顺手忽略会让 `split(",", 2)` 静默给错形状），
现在按 JS 给的语义做出来。

**先问一次 room 再分配**：段的个数上界是「码元数 + 1」（空分隔符那一支正好等于码元数）。

```ts
// **与 `InvokeString` 那一处同一条口径**（第 310 轮）：`String.split` 走的是
// 这一条独立的路（它要 `protos` 造数组），而包装对象的接收者照样要先脱箱
// ——`new String("a,b").split(",")`。
self = UnwrapBox(table, self);
RequireString(table, self);
const units = JsTextUnits(table, self);
// **`limit` 那一格**（第 208 轮）：原来这里**抛**（理由写得很对：忽略它会让
// `split(",", 2)` 静默给错形状）——这一轮把它做出来。
// **JS 的语义是「最多几段」**：到了上限就**不再收**（连尾巴那一段也不收）——
// 所以「先全切出来、最后截断到 `limit` 段」与它**等价**（简单分隔符、空分隔符、末尾空段三档都对）。
//
// **`limit` 走的是 `ToUint32`**（第 647 轮）：JS 先做 `ToUint32(limit)`——
// `-1` 于是绕回 `4294967295`（**等于「不限」**），而 `0` 是**真的**一段都不收。
// 原来把负数**压成 `0`** ⇒ `"a,b,c".split(",", -1)` 给 `[]`、与 `split(",", 0)`
// 混成同一件事了（Node 给 `["a","b","c"]`）。判据 `c647-std-string-split-negative-limit`。
let limit = -1;
if (args.length > 1 && !args[1].IsUndefined()) {
  const asked = ArgOr(args, 1, 0);
  // **整段照 `ToUint32`**：先 `ToIntegerOrInfinity`（`Math.trunc`），再模 2^32 取正
  //（`-0.5` 于是给 `0`、`-1` 给 `4294967295`、`2.7` 给 `2`、`4294967296` 给 `0`）。
  const truncated = Math.trunc(asked);
  const wrapped = truncated % 4294967296;
  limit = wrapped < 0 ? wrapped + 4294967296 : wrapped;
}
const out = NewPlainArray(room, table, protos);
const result = table.Get(out.Ref).AsArray();
if (args.length === 0 || args[0].IsUndefined()) {
  if (limit !== 0) result.Push(self);
  return out;
}
const separator = JsTextUnits(table, args[0]);
if (!room(ObjectCharge + ValueCharge * (units.length + 1)
  + CodeUnitCharge * (units.length + 1))) {
  throw new Error("out of room");
}
if (separator.length === 0) {
  // **空分隔符：逐码元一段，且不补尾段**（`"".split("")` 是 `[]`）。
  for (let i = 0; i < units.length; i++) {
    if (limit >= 0 && result.GetLength() >= limit) break;
    result.Push(Value.FromString(table.CreateString([units[i]])));
  }
  return out;
}
let start = 0;
for (let i = 0; i + separator.length <= units.length; i++) {
  let same = true;
  for (let j = 0; j < separator.length; j++) {
    if (units[i + j] !== separator[j]) same = false;
  }
  if (!same) continue;
  // **到上限就停**（尾巴那一段也不收——JS 在「还要再收一段」之前就问 `lim === 0`）。
  if (limit >= 0 && result.GetLength() >= limit) return out;
  const part: number[] = [];
  for (let k = start; k < i; k++) part.push(units[k]);
  result.Push(Value.FromString(table.CreateString(part)));
  i = i + separator.length - 1;
  start = i + 1;
}
if (limit >= 0 && result.GetLength() >= limit) return out;
const tail: number[] = [];
for (let k = start; k < units.length; k++) tail.push(units[k]);
result.Push(Value.FromString(table.CreateString(tail)));
return out;
```

# method InstallString:(vm:Vm, protos:Protos)=>void

把字符串内建装到 `Protos.String` 上。

```ts
const table = vm.Table;
const proto = Value.FromObject(protos.String);
const entries: string[] = ["charAt", "charCodeAt", "indexOf", "slice", "split",
  "toUpperCase", "toLowerCase", "trim", "includes",
  "startsWith", "endsWith", "substring", "repeat", "padStart", "padEnd", "replace", "replaceAll",
  // **第 208 轮补的四格**（`at` / `codePointAt` / `concat` / `lastIndexOf`）——
  // 号**追加在表尾**、已有的一个都没动。
  "at", "codePointAt", "concat", "lastIndexOf", "localeCompare",
  // **第 275 轮补的两格**（`trimStart` / `trimEnd`）——号**照旧追加在表尾**
  //（`124` / `125`），已有的一个都没动。
  "trimStart", "trimEnd",
  // **第 291 轮补的一格**（`substr`）——号**照旧追加在表尾**（`127`）。
  "substr",
  // **第 304 轮补的两格**（`toString` / `valueOf`）——号**照旧追加在表尾**
  //（`128` / `129`），已有的一个都没动。**两格共用一个实现**（见号那一段）。
  "toString", "valueOf",
  // **第 330 轮补的两格**（`isWellFormed` / `toWellFormed`，ES2024）——
  // 号**照旧追加在表尾**（`130` / `131`），已有的一个都没动。
  "isWellFormed", "toWellFormed",
  // **第 332 轮补的一格**（`normalize`）——号**照旧追加在表尾**（`132`）。
  "normalize",
  // **第 617 轮补的两格**（`toLocaleUpperCase` / `toLocaleLowerCase`）——
  // 号**照旧追加在表尾**（`134` / `135`），已有的一个都没动。
  // **为什么它们必须存在**：判据 `c371-stdlib-string-case-forms` 的第 3 行
  // 调的就是这两格——缺了它们报的是 `cannot call a non-closure value`
  //（**那句话听起来像「调用写错了」**，其实是**这一格没人挂**，
  //  与第 308 轮 `Array.prototype[Symbol.iterator]` 同一副面孔）。
  "toLocaleUpperCase", "toLocaleLowerCase"];
const ids: number[] = [StringCharAt, StringCharCodeAt, StringIndexOf, StringSlice, StringSplit,
  StringToUpperCase, StringToLowerCase, StringTrim, StringIncludes,
  StringStartsWith, StringEndsWith, StringSubstring, StringRepeat, StringPadStart, StringPadEnd,
  StringReplace, StringReplaceAll,
  StringAt, StringCodePointAt, StringConcatMethod, StringLastIndexOf, StringLocaleCompare,
  StringTrimStart, StringTrimEnd, StringSubstr,
  StringToString, StringValueOf,
  StringIsWellFormed, StringToWellFormed,
  StringNormalize,
  // **与 `entries` 同序**：两张表**按下标一一对应**（见下面那个循环）——
  // 一张多一个、另一张少一个就是**静默挂错方法**（`"a".toLocaleUpperCase()`
  // 会调到别的号上），而这**不报错**。
  StringToLocaleUpperCase, StringToLocaleLowerCase];
for (let i = 0; i < entries.length; i++) {
  const key = Value.FromString(table.CreateString(Units(entries[i])));
  const target = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ids[i], 0));
  SetProperty(vm.Room(), NeverCall, table, proto, key, target);
}
```

# private method CaseUnits:(units:Array<int>, id:int)=>Array<int>

**一整个码元序列的大小写转换**——`StringToUpperCase` 与 `StringToLowerCase`
共用这一份，只按 `id` 选表。

**两档的次序是语义**：**先查展开表**（`ß` → `SS`），查不到再查 1:1 表，
都没有才**原样输出**。反过来先查 1:1 表的话 `ß` 会命中一个**错的**单格映射
（或者查不到 ⇒ 原样，两种都不是 `SS`）。

**表为什么是懒建的**：四张 Map 第一次用到时才填——
模块加载时不付这份钱，而调用点只多一次 `size === 0` 判断。

**表是怎么来的**（不是手抄的）：用本机的 Unicode 数据逐码元量了一遍——
BMP 全段（0x0000..0xFFFF，代理区除外）每个码元问一次 `toUpperCase` / `toLowerCase`，
**1:1 的压成区间**（`起,止,增量` 三元组）、**一变多的单列一张展开表**
（`ß` → `SS`、`İ` → `i` + U+0307）。量出来的读数：上档 676 段、下档 665 段、
展开 103 条。

**为什么 BMP 全段都要**：只收「常见的那几段」（Latin-1 + Greek + Cyrillic）
会把**别的文字**的码元留成**静默按原样输出**——而那一档正是第 120 轮要避免的
「看起来变过了」（宁可响亮地缺，也不静默给错）。全段收下之后，「认不出来」
只剩**表外的补充平面码元**（它们按码元各转各的，与 JS 一致——
`toUpperCase` 走的是 `toUpper(code unit)` 逐格映射，不是逐码点）。

```ts
const CASE_UPPER_RANGES: number[] = [
  0x61,0x7a,-32, 0xb5,0xb5,743, 0xe0,0xf6,-32, 0xf8,0xfe,-32, 0xff,0xff,121, 0x101,0x101,-1, 0x103,0x103,-1, 0x105,0x105,-1,
  0x107,0x107,-1, 0x109,0x109,-1, 0x10b,0x10b,-1, 0x10d,0x10d,-1, 0x10f,0x10f,-1, 0x111,0x111,-1, 0x113,0x113,-1, 0x115,0x115,-1,
  0x117,0x117,-1, 0x119,0x119,-1, 0x11b,0x11b,-1, 0x11d,0x11d,-1, 0x11f,0x11f,-1, 0x121,0x121,-1, 0x123,0x123,-1, 0x125,0x125,-1,
  0x127,0x127,-1, 0x129,0x129,-1, 0x12b,0x12b,-1, 0x12d,0x12d,-1, 0x12f,0x12f,-1, 0x131,0x131,-232, 0x133,0x133,-1, 0x135,0x135,-1,
  0x137,0x137,-1, 0x13a,0x13a,-1, 0x13c,0x13c,-1, 0x13e,0x13e,-1, 0x140,0x140,-1, 0x142,0x142,-1, 0x144,0x144,-1, 0x146,0x146,-1,
  0x148,0x148,-1, 0x14b,0x14b,-1, 0x14d,0x14d,-1, 0x14f,0x14f,-1, 0x151,0x151,-1, 0x153,0x153,-1, 0x155,0x155,-1, 0x157,0x157,-1,
  0x159,0x159,-1, 0x15b,0x15b,-1, 0x15d,0x15d,-1, 0x15f,0x15f,-1, 0x161,0x161,-1, 0x163,0x163,-1, 0x165,0x165,-1, 0x167,0x167,-1,
  0x169,0x169,-1, 0x16b,0x16b,-1, 0x16d,0x16d,-1, 0x16f,0x16f,-1, 0x171,0x171,-1, 0x173,0x173,-1, 0x175,0x175,-1, 0x177,0x177,-1,
  0x17a,0x17a,-1, 0x17c,0x17c,-1, 0x17e,0x17e,-1, 0x17f,0x17f,-300, 0x180,0x180,195, 0x183,0x183,-1, 0x185,0x185,-1, 0x188,0x188,-1,
  0x18c,0x18c,-1, 0x192,0x192,-1, 0x195,0x195,97, 0x199,0x199,-1, 0x19a,0x19a,163, 0x19b,0x19b,42561, 0x19e,0x19e,130, 0x1a1,0x1a1,-1,
  0x1a3,0x1a3,-1, 0x1a5,0x1a5,-1, 0x1a8,0x1a8,-1, 0x1ad,0x1ad,-1, 0x1b0,0x1b0,-1, 0x1b4,0x1b4,-1, 0x1b6,0x1b6,-1, 0x1b9,0x1b9,-1,
  0x1bd,0x1bd,-1, 0x1bf,0x1bf,56, 0x1c5,0x1c5,-1, 0x1c6,0x1c6,-2, 0x1c8,0x1c8,-1, 0x1c9,0x1c9,-2, 0x1cb,0x1cb,-1, 0x1cc,0x1cc,-2,
  0x1ce,0x1ce,-1, 0x1d0,0x1d0,-1, 0x1d2,0x1d2,-1, 0x1d4,0x1d4,-1, 0x1d6,0x1d6,-1, 0x1d8,0x1d8,-1, 0x1da,0x1da,-1, 0x1dc,0x1dc,-1,
  0x1dd,0x1dd,-79, 0x1df,0x1df,-1, 0x1e1,0x1e1,-1, 0x1e3,0x1e3,-1, 0x1e5,0x1e5,-1, 0x1e7,0x1e7,-1, 0x1e9,0x1e9,-1, 0x1eb,0x1eb,-1,
  0x1ed,0x1ed,-1, 0x1ef,0x1ef,-1, 0x1f2,0x1f2,-1, 0x1f3,0x1f3,-2, 0x1f5,0x1f5,-1, 0x1f9,0x1f9,-1, 0x1fb,0x1fb,-1, 0x1fd,0x1fd,-1,
  0x1ff,0x1ff,-1, 0x201,0x201,-1, 0x203,0x203,-1, 0x205,0x205,-1, 0x207,0x207,-1, 0x209,0x209,-1, 0x20b,0x20b,-1, 0x20d,0x20d,-1,
  0x20f,0x20f,-1, 0x211,0x211,-1, 0x213,0x213,-1, 0x215,0x215,-1, 0x217,0x217,-1, 0x219,0x219,-1, 0x21b,0x21b,-1, 0x21d,0x21d,-1,
  0x21f,0x21f,-1, 0x223,0x223,-1, 0x225,0x225,-1, 0x227,0x227,-1, 0x229,0x229,-1, 0x22b,0x22b,-1, 0x22d,0x22d,-1, 0x22f,0x22f,-1,
  0x231,0x231,-1, 0x233,0x233,-1, 0x23c,0x23c,-1, 0x23f,0x240,10815, 0x242,0x242,-1, 0x247,0x247,-1, 0x249,0x249,-1, 0x24b,0x24b,-1,
  0x24d,0x24d,-1, 0x24f,0x24f,-1, 0x250,0x250,10783, 0x251,0x251,10780, 0x252,0x252,10782, 0x253,0x253,-210, 0x254,0x254,-206, 0x256,0x257,-205,
  0x259,0x259,-202, 0x25b,0x25b,-203, 0x25c,0x25c,42319, 0x260,0x260,-205, 0x261,0x261,42315, 0x263,0x263,-207, 0x264,0x264,42343, 0x265,0x265,42280,
  0x266,0x266,42308, 0x268,0x268,-209, 0x269,0x269,-211, 0x26a,0x26a,42308, 0x26b,0x26b,10743, 0x26c,0x26c,42305, 0x26f,0x26f,-211, 0x271,0x271,10749,
  0x272,0x272,-213, 0x275,0x275,-214, 0x27d,0x27d,10727, 0x280,0x280,-218, 0x282,0x282,42307, 0x283,0x283,-218, 0x287,0x287,42282, 0x288,0x288,-218,
  0x289,0x289,-69, 0x28a,0x28b,-217, 0x28c,0x28c,-71, 0x292,0x292,-219, 0x29d,0x29d,42261, 0x29e,0x29e,42258, 0x345,0x345,84, 0x371,0x371,-1,
  0x373,0x373,-1, 0x377,0x377,-1, 0x37b,0x37d,130, 0x3ac,0x3ac,-38, 0x3ad,0x3af,-37, 0x3b1,0x3c1,-32, 0x3c2,0x3c2,-31, 0x3c3,0x3cb,-32,
  0x3cc,0x3cc,-64, 0x3cd,0x3ce,-63, 0x3d0,0x3d0,-62, 0x3d1,0x3d1,-57, 0x3d5,0x3d5,-47, 0x3d6,0x3d6,-54, 0x3d7,0x3d7,-8, 0x3d9,0x3d9,-1,
  0x3db,0x3db,-1, 0x3dd,0x3dd,-1, 0x3df,0x3df,-1, 0x3e1,0x3e1,-1, 0x3e3,0x3e3,-1, 0x3e5,0x3e5,-1, 0x3e7,0x3e7,-1, 0x3e9,0x3e9,-1,
  0x3eb,0x3eb,-1, 0x3ed,0x3ed,-1, 0x3ef,0x3ef,-1, 0x3f0,0x3f0,-86, 0x3f1,0x3f1,-80, 0x3f2,0x3f2,7, 0x3f3,0x3f3,-116, 0x3f5,0x3f5,-96,
  0x3f8,0x3f8,-1, 0x3fb,0x3fb,-1, 0x430,0x44f,-32, 0x450,0x45f,-80, 0x461,0x461,-1, 0x463,0x463,-1, 0x465,0x465,-1, 0x467,0x467,-1,
  0x469,0x469,-1, 0x46b,0x46b,-1, 0x46d,0x46d,-1, 0x46f,0x46f,-1, 0x471,0x471,-1, 0x473,0x473,-1, 0x475,0x475,-1, 0x477,0x477,-1,
  0x479,0x479,-1, 0x47b,0x47b,-1, 0x47d,0x47d,-1, 0x47f,0x47f,-1, 0x481,0x481,-1, 0x48b,0x48b,-1, 0x48d,0x48d,-1, 0x48f,0x48f,-1,
  0x491,0x491,-1, 0x493,0x493,-1, 0x495,0x495,-1, 0x497,0x497,-1, 0x499,0x499,-1, 0x49b,0x49b,-1, 0x49d,0x49d,-1, 0x49f,0x49f,-1,
  0x4a1,0x4a1,-1, 0x4a3,0x4a3,-1, 0x4a5,0x4a5,-1, 0x4a7,0x4a7,-1, 0x4a9,0x4a9,-1, 0x4ab,0x4ab,-1, 0x4ad,0x4ad,-1, 0x4af,0x4af,-1,
  0x4b1,0x4b1,-1, 0x4b3,0x4b3,-1, 0x4b5,0x4b5,-1, 0x4b7,0x4b7,-1, 0x4b9,0x4b9,-1, 0x4bb,0x4bb,-1, 0x4bd,0x4bd,-1, 0x4bf,0x4bf,-1,
  0x4c2,0x4c2,-1, 0x4c4,0x4c4,-1, 0x4c6,0x4c6,-1, 0x4c8,0x4c8,-1, 0x4ca,0x4ca,-1, 0x4cc,0x4cc,-1, 0x4ce,0x4ce,-1, 0x4cf,0x4cf,-15,
  0x4d1,0x4d1,-1, 0x4d3,0x4d3,-1, 0x4d5,0x4d5,-1, 0x4d7,0x4d7,-1, 0x4d9,0x4d9,-1, 0x4db,0x4db,-1, 0x4dd,0x4dd,-1, 0x4df,0x4df,-1,
  0x4e1,0x4e1,-1, 0x4e3,0x4e3,-1, 0x4e5,0x4e5,-1, 0x4e7,0x4e7,-1, 0x4e9,0x4e9,-1, 0x4eb,0x4eb,-1, 0x4ed,0x4ed,-1, 0x4ef,0x4ef,-1,
  0x4f1,0x4f1,-1, 0x4f3,0x4f3,-1, 0x4f5,0x4f5,-1, 0x4f7,0x4f7,-1, 0x4f9,0x4f9,-1, 0x4fb,0x4fb,-1, 0x4fd,0x4fd,-1, 0x4ff,0x4ff,-1,
  0x501,0x501,-1, 0x503,0x503,-1, 0x505,0x505,-1, 0x507,0x507,-1, 0x509,0x509,-1, 0x50b,0x50b,-1, 0x50d,0x50d,-1, 0x50f,0x50f,-1,
  0x511,0x511,-1, 0x513,0x513,-1, 0x515,0x515,-1, 0x517,0x517,-1, 0x519,0x519,-1, 0x51b,0x51b,-1, 0x51d,0x51d,-1, 0x51f,0x51f,-1,
  0x521,0x521,-1, 0x523,0x523,-1, 0x525,0x525,-1, 0x527,0x527,-1, 0x529,0x529,-1, 0x52b,0x52b,-1, 0x52d,0x52d,-1, 0x52f,0x52f,-1,
  0x561,0x586,-48, 0x10d0,0x10fa,3008, 0x10fd,0x10ff,3008, 0x13f8,0x13fd,-8, 0x1c80,0x1c80,-6254, 0x1c81,0x1c81,-6253, 0x1c82,0x1c82,-6244, 0x1c83,0x1c84,-6242,
  0x1c85,0x1c85,-6243, 0x1c86,0x1c86,-6236, 0x1c87,0x1c87,-6181, 0x1c88,0x1c88,35266, 0x1c8a,0x1c8a,-1, 0x1d79,0x1d79,35332, 0x1d7d,0x1d7d,3814, 0x1d8e,0x1d8e,35384,
  0x1e01,0x1e01,-1, 0x1e03,0x1e03,-1, 0x1e05,0x1e05,-1, 0x1e07,0x1e07,-1, 0x1e09,0x1e09,-1, 0x1e0b,0x1e0b,-1, 0x1e0d,0x1e0d,-1, 0x1e0f,0x1e0f,-1,
  0x1e11,0x1e11,-1, 0x1e13,0x1e13,-1, 0x1e15,0x1e15,-1, 0x1e17,0x1e17,-1, 0x1e19,0x1e19,-1, 0x1e1b,0x1e1b,-1, 0x1e1d,0x1e1d,-1, 0x1e1f,0x1e1f,-1,
  0x1e21,0x1e21,-1, 0x1e23,0x1e23,-1, 0x1e25,0x1e25,-1, 0x1e27,0x1e27,-1, 0x1e29,0x1e29,-1, 0x1e2b,0x1e2b,-1, 0x1e2d,0x1e2d,-1, 0x1e2f,0x1e2f,-1,
  0x1e31,0x1e31,-1, 0x1e33,0x1e33,-1, 0x1e35,0x1e35,-1, 0x1e37,0x1e37,-1, 0x1e39,0x1e39,-1, 0x1e3b,0x1e3b,-1, 0x1e3d,0x1e3d,-1, 0x1e3f,0x1e3f,-1,
  0x1e41,0x1e41,-1, 0x1e43,0x1e43,-1, 0x1e45,0x1e45,-1, 0x1e47,0x1e47,-1, 0x1e49,0x1e49,-1, 0x1e4b,0x1e4b,-1, 0x1e4d,0x1e4d,-1, 0x1e4f,0x1e4f,-1,
  0x1e51,0x1e51,-1, 0x1e53,0x1e53,-1, 0x1e55,0x1e55,-1, 0x1e57,0x1e57,-1, 0x1e59,0x1e59,-1, 0x1e5b,0x1e5b,-1, 0x1e5d,0x1e5d,-1, 0x1e5f,0x1e5f,-1,
  0x1e61,0x1e61,-1, 0x1e63,0x1e63,-1, 0x1e65,0x1e65,-1, 0x1e67,0x1e67,-1, 0x1e69,0x1e69,-1, 0x1e6b,0x1e6b,-1, 0x1e6d,0x1e6d,-1, 0x1e6f,0x1e6f,-1,
  0x1e71,0x1e71,-1, 0x1e73,0x1e73,-1, 0x1e75,0x1e75,-1, 0x1e77,0x1e77,-1, 0x1e79,0x1e79,-1, 0x1e7b,0x1e7b,-1, 0x1e7d,0x1e7d,-1, 0x1e7f,0x1e7f,-1,
  0x1e81,0x1e81,-1, 0x1e83,0x1e83,-1, 0x1e85,0x1e85,-1, 0x1e87,0x1e87,-1, 0x1e89,0x1e89,-1, 0x1e8b,0x1e8b,-1, 0x1e8d,0x1e8d,-1, 0x1e8f,0x1e8f,-1,
  0x1e91,0x1e91,-1, 0x1e93,0x1e93,-1, 0x1e95,0x1e95,-1, 0x1e9b,0x1e9b,-59, 0x1ea1,0x1ea1,-1, 0x1ea3,0x1ea3,-1, 0x1ea5,0x1ea5,-1, 0x1ea7,0x1ea7,-1,
  0x1ea9,0x1ea9,-1, 0x1eab,0x1eab,-1, 0x1ead,0x1ead,-1, 0x1eaf,0x1eaf,-1, 0x1eb1,0x1eb1,-1, 0x1eb3,0x1eb3,-1, 0x1eb5,0x1eb5,-1, 0x1eb7,0x1eb7,-1,
  0x1eb9,0x1eb9,-1, 0x1ebb,0x1ebb,-1, 0x1ebd,0x1ebd,-1, 0x1ebf,0x1ebf,-1, 0x1ec1,0x1ec1,-1, 0x1ec3,0x1ec3,-1, 0x1ec5,0x1ec5,-1, 0x1ec7,0x1ec7,-1,
  0x1ec9,0x1ec9,-1, 0x1ecb,0x1ecb,-1, 0x1ecd,0x1ecd,-1, 0x1ecf,0x1ecf,-1, 0x1ed1,0x1ed1,-1, 0x1ed3,0x1ed3,-1, 0x1ed5,0x1ed5,-1, 0x1ed7,0x1ed7,-1,
  0x1ed9,0x1ed9,-1, 0x1edb,0x1edb,-1, 0x1edd,0x1edd,-1, 0x1edf,0x1edf,-1, 0x1ee1,0x1ee1,-1, 0x1ee3,0x1ee3,-1, 0x1ee5,0x1ee5,-1, 0x1ee7,0x1ee7,-1,
  0x1ee9,0x1ee9,-1, 0x1eeb,0x1eeb,-1, 0x1eed,0x1eed,-1, 0x1eef,0x1eef,-1, 0x1ef1,0x1ef1,-1, 0x1ef3,0x1ef3,-1, 0x1ef5,0x1ef5,-1, 0x1ef7,0x1ef7,-1,
  0x1ef9,0x1ef9,-1, 0x1efb,0x1efb,-1, 0x1efd,0x1efd,-1, 0x1eff,0x1eff,-1, 0x1f00,0x1f07,8, 0x1f10,0x1f15,8, 0x1f20,0x1f27,8, 0x1f30,0x1f37,8,
  0x1f40,0x1f45,8, 0x1f51,0x1f51,8, 0x1f53,0x1f53,8, 0x1f55,0x1f55,8, 0x1f57,0x1f57,8, 0x1f60,0x1f67,8, 0x1f70,0x1f71,74, 0x1f72,0x1f75,86,
  0x1f76,0x1f77,100, 0x1f78,0x1f79,128, 0x1f7a,0x1f7b,112, 0x1f7c,0x1f7d,126, 0x1fb0,0x1fb1,8, 0x1fbe,0x1fbe,-7205, 0x1fd0,0x1fd1,8, 0x1fe0,0x1fe1,8,
  0x1fe5,0x1fe5,7, 0x214e,0x214e,-28, 0x2170,0x217f,-16, 0x2184,0x2184,-1, 0x24d0,0x24e9,-26, 0x2c30,0x2c5f,-48, 0x2c61,0x2c61,-1, 0x2c65,0x2c65,-10795,
  0x2c66,0x2c66,-10792, 0x2c68,0x2c68,-1, 0x2c6a,0x2c6a,-1, 0x2c6c,0x2c6c,-1, 0x2c73,0x2c73,-1, 0x2c76,0x2c76,-1, 0x2c81,0x2c81,-1, 0x2c83,0x2c83,-1,
  0x2c85,0x2c85,-1, 0x2c87,0x2c87,-1, 0x2c89,0x2c89,-1, 0x2c8b,0x2c8b,-1, 0x2c8d,0x2c8d,-1, 0x2c8f,0x2c8f,-1, 0x2c91,0x2c91,-1, 0x2c93,0x2c93,-1,
  0x2c95,0x2c95,-1, 0x2c97,0x2c97,-1, 0x2c99,0x2c99,-1, 0x2c9b,0x2c9b,-1, 0x2c9d,0x2c9d,-1, 0x2c9f,0x2c9f,-1, 0x2ca1,0x2ca1,-1, 0x2ca3,0x2ca3,-1,
  0x2ca5,0x2ca5,-1, 0x2ca7,0x2ca7,-1, 0x2ca9,0x2ca9,-1, 0x2cab,0x2cab,-1, 0x2cad,0x2cad,-1, 0x2caf,0x2caf,-1, 0x2cb1,0x2cb1,-1, 0x2cb3,0x2cb3,-1,
  0x2cb5,0x2cb5,-1, 0x2cb7,0x2cb7,-1, 0x2cb9,0x2cb9,-1, 0x2cbb,0x2cbb,-1, 0x2cbd,0x2cbd,-1, 0x2cbf,0x2cbf,-1, 0x2cc1,0x2cc1,-1, 0x2cc3,0x2cc3,-1,
  0x2cc5,0x2cc5,-1, 0x2cc7,0x2cc7,-1, 0x2cc9,0x2cc9,-1, 0x2ccb,0x2ccb,-1, 0x2ccd,0x2ccd,-1, 0x2ccf,0x2ccf,-1, 0x2cd1,0x2cd1,-1, 0x2cd3,0x2cd3,-1,
  0x2cd5,0x2cd5,-1, 0x2cd7,0x2cd7,-1, 0x2cd9,0x2cd9,-1, 0x2cdb,0x2cdb,-1, 0x2cdd,0x2cdd,-1, 0x2cdf,0x2cdf,-1, 0x2ce1,0x2ce1,-1, 0x2ce3,0x2ce3,-1,
  0x2cec,0x2cec,-1, 0x2cee,0x2cee,-1, 0x2cf3,0x2cf3,-1, 0x2d00,0x2d25,-7264, 0x2d27,0x2d27,-7264, 0x2d2d,0x2d2d,-7264, 0xa641,0xa641,-1, 0xa643,0xa643,-1,
  0xa645,0xa645,-1, 0xa647,0xa647,-1, 0xa649,0xa649,-1, 0xa64b,0xa64b,-1, 0xa64d,0xa64d,-1, 0xa64f,0xa64f,-1, 0xa651,0xa651,-1, 0xa653,0xa653,-1,
  0xa655,0xa655,-1, 0xa657,0xa657,-1, 0xa659,0xa659,-1, 0xa65b,0xa65b,-1, 0xa65d,0xa65d,-1, 0xa65f,0xa65f,-1, 0xa661,0xa661,-1, 0xa663,0xa663,-1,
  0xa665,0xa665,-1, 0xa667,0xa667,-1, 0xa669,0xa669,-1, 0xa66b,0xa66b,-1, 0xa66d,0xa66d,-1, 0xa681,0xa681,-1, 0xa683,0xa683,-1, 0xa685,0xa685,-1,
  0xa687,0xa687,-1, 0xa689,0xa689,-1, 0xa68b,0xa68b,-1, 0xa68d,0xa68d,-1, 0xa68f,0xa68f,-1, 0xa691,0xa691,-1, 0xa693,0xa693,-1, 0xa695,0xa695,-1,
  0xa697,0xa697,-1, 0xa699,0xa699,-1, 0xa69b,0xa69b,-1, 0xa723,0xa723,-1, 0xa725,0xa725,-1, 0xa727,0xa727,-1, 0xa729,0xa729,-1, 0xa72b,0xa72b,-1,
  0xa72d,0xa72d,-1, 0xa72f,0xa72f,-1, 0xa733,0xa733,-1, 0xa735,0xa735,-1, 0xa737,0xa737,-1, 0xa739,0xa739,-1, 0xa73b,0xa73b,-1, 0xa73d,0xa73d,-1,
  0xa73f,0xa73f,-1, 0xa741,0xa741,-1, 0xa743,0xa743,-1, 0xa745,0xa745,-1, 0xa747,0xa747,-1, 0xa749,0xa749,-1, 0xa74b,0xa74b,-1, 0xa74d,0xa74d,-1,
  0xa74f,0xa74f,-1, 0xa751,0xa751,-1, 0xa753,0xa753,-1, 0xa755,0xa755,-1, 0xa757,0xa757,-1, 0xa759,0xa759,-1, 0xa75b,0xa75b,-1, 0xa75d,0xa75d,-1,
  0xa75f,0xa75f,-1, 0xa761,0xa761,-1, 0xa763,0xa763,-1, 0xa765,0xa765,-1, 0xa767,0xa767,-1, 0xa769,0xa769,-1, 0xa76b,0xa76b,-1, 0xa76d,0xa76d,-1,
  0xa76f,0xa76f,-1, 0xa77a,0xa77a,-1, 0xa77c,0xa77c,-1, 0xa77f,0xa77f,-1, 0xa781,0xa781,-1, 0xa783,0xa783,-1, 0xa785,0xa785,-1, 0xa787,0xa787,-1,
  0xa78c,0xa78c,-1, 0xa791,0xa791,-1, 0xa793,0xa793,-1, 0xa794,0xa794,48, 0xa797,0xa797,-1, 0xa799,0xa799,-1, 0xa79b,0xa79b,-1, 0xa79d,0xa79d,-1,
  0xa79f,0xa79f,-1, 0xa7a1,0xa7a1,-1, 0xa7a3,0xa7a3,-1, 0xa7a5,0xa7a5,-1, 0xa7a7,0xa7a7,-1, 0xa7a9,0xa7a9,-1, 0xa7b5,0xa7b5,-1, 0xa7b7,0xa7b7,-1,
  0xa7b9,0xa7b9,-1, 0xa7bb,0xa7bb,-1, 0xa7bd,0xa7bd,-1, 0xa7bf,0xa7bf,-1, 0xa7c1,0xa7c1,-1, 0xa7c3,0xa7c3,-1, 0xa7c8,0xa7c8,-1, 0xa7ca,0xa7ca,-1,
  0xa7cd,0xa7cd,-1, 0xa7cf,0xa7cf,-1, 0xa7d1,0xa7d1,-1, 0xa7d3,0xa7d3,-1, 0xa7d5,0xa7d5,-1, 0xa7d7,0xa7d7,-1, 0xa7d9,0xa7d9,-1, 0xa7db,0xa7db,-1,
  0xa7f6,0xa7f6,-1, 0xab53,0xab53,-928, 0xab70,0xabbf,-38864, 0xff41,0xff5a,-32,
];
const CASE_LOWER_RANGES: number[] = [
  0x41,0x5a,32, 0xc0,0xd6,32, 0xd8,0xde,32, 0x100,0x100,1, 0x102,0x102,1, 0x104,0x104,1, 0x106,0x106,1, 0x108,0x108,1,
  0x10a,0x10a,1, 0x10c,0x10c,1, 0x10e,0x10e,1, 0x110,0x110,1, 0x112,0x112,1, 0x114,0x114,1, 0x116,0x116,1, 0x118,0x118,1,
  0x11a,0x11a,1, 0x11c,0x11c,1, 0x11e,0x11e,1, 0x120,0x120,1, 0x122,0x122,1, 0x124,0x124,1, 0x126,0x126,1, 0x128,0x128,1,
  0x12a,0x12a,1, 0x12c,0x12c,1, 0x12e,0x12e,1, 0x132,0x132,1, 0x134,0x134,1, 0x136,0x136,1, 0x139,0x139,1, 0x13b,0x13b,1,
  0x13d,0x13d,1, 0x13f,0x13f,1, 0x141,0x141,1, 0x143,0x143,1, 0x145,0x145,1, 0x147,0x147,1, 0x14a,0x14a,1, 0x14c,0x14c,1,
  0x14e,0x14e,1, 0x150,0x150,1, 0x152,0x152,1, 0x154,0x154,1, 0x156,0x156,1, 0x158,0x158,1, 0x15a,0x15a,1, 0x15c,0x15c,1,
  0x15e,0x15e,1, 0x160,0x160,1, 0x162,0x162,1, 0x164,0x164,1, 0x166,0x166,1, 0x168,0x168,1, 0x16a,0x16a,1, 0x16c,0x16c,1,
  0x16e,0x16e,1, 0x170,0x170,1, 0x172,0x172,1, 0x174,0x174,1, 0x176,0x176,1, 0x178,0x178,-121, 0x179,0x179,1, 0x17b,0x17b,1,
  0x17d,0x17d,1, 0x181,0x181,210, 0x182,0x182,1, 0x184,0x184,1, 0x186,0x186,206, 0x187,0x187,1, 0x189,0x18a,205, 0x18b,0x18b,1,
  0x18e,0x18e,79, 0x18f,0x18f,202, 0x190,0x190,203, 0x191,0x191,1, 0x193,0x193,205, 0x194,0x194,207, 0x196,0x196,211, 0x197,0x197,209,
  0x198,0x198,1, 0x19c,0x19c,211, 0x19d,0x19d,213, 0x19f,0x19f,214, 0x1a0,0x1a0,1, 0x1a2,0x1a2,1, 0x1a4,0x1a4,1, 0x1a6,0x1a6,218,
  0x1a7,0x1a7,1, 0x1a9,0x1a9,218, 0x1ac,0x1ac,1, 0x1ae,0x1ae,218, 0x1af,0x1af,1, 0x1b1,0x1b2,217, 0x1b3,0x1b3,1, 0x1b5,0x1b5,1,
  0x1b7,0x1b7,219, 0x1b8,0x1b8,1, 0x1bc,0x1bc,1, 0x1c4,0x1c4,2, 0x1c5,0x1c5,1, 0x1c7,0x1c7,2, 0x1c8,0x1c8,1, 0x1ca,0x1ca,2,
  0x1cb,0x1cb,1, 0x1cd,0x1cd,1, 0x1cf,0x1cf,1, 0x1d1,0x1d1,1, 0x1d3,0x1d3,1, 0x1d5,0x1d5,1, 0x1d7,0x1d7,1, 0x1d9,0x1d9,1,
  0x1db,0x1db,1, 0x1de,0x1de,1, 0x1e0,0x1e0,1, 0x1e2,0x1e2,1, 0x1e4,0x1e4,1, 0x1e6,0x1e6,1, 0x1e8,0x1e8,1, 0x1ea,0x1ea,1,
  0x1ec,0x1ec,1, 0x1ee,0x1ee,1, 0x1f1,0x1f1,2, 0x1f2,0x1f2,1, 0x1f4,0x1f4,1, 0x1f6,0x1f6,-97, 0x1f7,0x1f7,-56, 0x1f8,0x1f8,1,
  0x1fa,0x1fa,1, 0x1fc,0x1fc,1, 0x1fe,0x1fe,1, 0x200,0x200,1, 0x202,0x202,1, 0x204,0x204,1, 0x206,0x206,1, 0x208,0x208,1,
  0x20a,0x20a,1, 0x20c,0x20c,1, 0x20e,0x20e,1, 0x210,0x210,1, 0x212,0x212,1, 0x214,0x214,1, 0x216,0x216,1, 0x218,0x218,1,
  0x21a,0x21a,1, 0x21c,0x21c,1, 0x21e,0x21e,1, 0x220,0x220,-130, 0x222,0x222,1, 0x224,0x224,1, 0x226,0x226,1, 0x228,0x228,1,
  0x22a,0x22a,1, 0x22c,0x22c,1, 0x22e,0x22e,1, 0x230,0x230,1, 0x232,0x232,1, 0x23a,0x23a,10795, 0x23b,0x23b,1, 0x23d,0x23d,-163,
  0x23e,0x23e,10792, 0x241,0x241,1, 0x243,0x243,-195, 0x244,0x244,69, 0x245,0x245,71, 0x246,0x246,1, 0x248,0x248,1, 0x24a,0x24a,1,
  0x24c,0x24c,1, 0x24e,0x24e,1, 0x370,0x370,1, 0x372,0x372,1, 0x376,0x376,1, 0x37f,0x37f,116, 0x386,0x386,38, 0x388,0x38a,37,
  0x38c,0x38c,64, 0x38e,0x38f,63, 0x391,0x3a1,32, 0x3a3,0x3ab,32, 0x3cf,0x3cf,8, 0x3d8,0x3d8,1, 0x3da,0x3da,1, 0x3dc,0x3dc,1,
  0x3de,0x3de,1, 0x3e0,0x3e0,1, 0x3e2,0x3e2,1, 0x3e4,0x3e4,1, 0x3e6,0x3e6,1, 0x3e8,0x3e8,1, 0x3ea,0x3ea,1, 0x3ec,0x3ec,1,
  0x3ee,0x3ee,1, 0x3f4,0x3f4,-60, 0x3f7,0x3f7,1, 0x3f9,0x3f9,-7, 0x3fa,0x3fa,1, 0x3fd,0x3ff,-130, 0x400,0x40f,80, 0x410,0x42f,32,
  0x460,0x460,1, 0x462,0x462,1, 0x464,0x464,1, 0x466,0x466,1, 0x468,0x468,1, 0x46a,0x46a,1, 0x46c,0x46c,1, 0x46e,0x46e,1,
  0x470,0x470,1, 0x472,0x472,1, 0x474,0x474,1, 0x476,0x476,1, 0x478,0x478,1, 0x47a,0x47a,1, 0x47c,0x47c,1, 0x47e,0x47e,1,
  0x480,0x480,1, 0x48a,0x48a,1, 0x48c,0x48c,1, 0x48e,0x48e,1, 0x490,0x490,1, 0x492,0x492,1, 0x494,0x494,1, 0x496,0x496,1,
  0x498,0x498,1, 0x49a,0x49a,1, 0x49c,0x49c,1, 0x49e,0x49e,1, 0x4a0,0x4a0,1, 0x4a2,0x4a2,1, 0x4a4,0x4a4,1, 0x4a6,0x4a6,1,
  0x4a8,0x4a8,1, 0x4aa,0x4aa,1, 0x4ac,0x4ac,1, 0x4ae,0x4ae,1, 0x4b0,0x4b0,1, 0x4b2,0x4b2,1, 0x4b4,0x4b4,1, 0x4b6,0x4b6,1,
  0x4b8,0x4b8,1, 0x4ba,0x4ba,1, 0x4bc,0x4bc,1, 0x4be,0x4be,1, 0x4c0,0x4c0,15, 0x4c1,0x4c1,1, 0x4c3,0x4c3,1, 0x4c5,0x4c5,1,
  0x4c7,0x4c7,1, 0x4c9,0x4c9,1, 0x4cb,0x4cb,1, 0x4cd,0x4cd,1, 0x4d0,0x4d0,1, 0x4d2,0x4d2,1, 0x4d4,0x4d4,1, 0x4d6,0x4d6,1,
  0x4d8,0x4d8,1, 0x4da,0x4da,1, 0x4dc,0x4dc,1, 0x4de,0x4de,1, 0x4e0,0x4e0,1, 0x4e2,0x4e2,1, 0x4e4,0x4e4,1, 0x4e6,0x4e6,1,
  0x4e8,0x4e8,1, 0x4ea,0x4ea,1, 0x4ec,0x4ec,1, 0x4ee,0x4ee,1, 0x4f0,0x4f0,1, 0x4f2,0x4f2,1, 0x4f4,0x4f4,1, 0x4f6,0x4f6,1,
  0x4f8,0x4f8,1, 0x4fa,0x4fa,1, 0x4fc,0x4fc,1, 0x4fe,0x4fe,1, 0x500,0x500,1, 0x502,0x502,1, 0x504,0x504,1, 0x506,0x506,1,
  0x508,0x508,1, 0x50a,0x50a,1, 0x50c,0x50c,1, 0x50e,0x50e,1, 0x510,0x510,1, 0x512,0x512,1, 0x514,0x514,1, 0x516,0x516,1,
  0x518,0x518,1, 0x51a,0x51a,1, 0x51c,0x51c,1, 0x51e,0x51e,1, 0x520,0x520,1, 0x522,0x522,1, 0x524,0x524,1, 0x526,0x526,1,
  0x528,0x528,1, 0x52a,0x52a,1, 0x52c,0x52c,1, 0x52e,0x52e,1, 0x531,0x556,48, 0x10a0,0x10c5,7264, 0x10c7,0x10c7,7264, 0x10cd,0x10cd,7264,
  0x13a0,0x13ef,38864, 0x13f0,0x13f5,8, 0x1c89,0x1c89,1, 0x1c90,0x1cba,-3008, 0x1cbd,0x1cbf,-3008, 0x1e00,0x1e00,1, 0x1e02,0x1e02,1, 0x1e04,0x1e04,1,
  0x1e06,0x1e06,1, 0x1e08,0x1e08,1, 0x1e0a,0x1e0a,1, 0x1e0c,0x1e0c,1, 0x1e0e,0x1e0e,1, 0x1e10,0x1e10,1, 0x1e12,0x1e12,1, 0x1e14,0x1e14,1,
  0x1e16,0x1e16,1, 0x1e18,0x1e18,1, 0x1e1a,0x1e1a,1, 0x1e1c,0x1e1c,1, 0x1e1e,0x1e1e,1, 0x1e20,0x1e20,1, 0x1e22,0x1e22,1, 0x1e24,0x1e24,1,
  0x1e26,0x1e26,1, 0x1e28,0x1e28,1, 0x1e2a,0x1e2a,1, 0x1e2c,0x1e2c,1, 0x1e2e,0x1e2e,1, 0x1e30,0x1e30,1, 0x1e32,0x1e32,1, 0x1e34,0x1e34,1,
  0x1e36,0x1e36,1, 0x1e38,0x1e38,1, 0x1e3a,0x1e3a,1, 0x1e3c,0x1e3c,1, 0x1e3e,0x1e3e,1, 0x1e40,0x1e40,1, 0x1e42,0x1e42,1, 0x1e44,0x1e44,1,
  0x1e46,0x1e46,1, 0x1e48,0x1e48,1, 0x1e4a,0x1e4a,1, 0x1e4c,0x1e4c,1, 0x1e4e,0x1e4e,1, 0x1e50,0x1e50,1, 0x1e52,0x1e52,1, 0x1e54,0x1e54,1,
  0x1e56,0x1e56,1, 0x1e58,0x1e58,1, 0x1e5a,0x1e5a,1, 0x1e5c,0x1e5c,1, 0x1e5e,0x1e5e,1, 0x1e60,0x1e60,1, 0x1e62,0x1e62,1, 0x1e64,0x1e64,1,
  0x1e66,0x1e66,1, 0x1e68,0x1e68,1, 0x1e6a,0x1e6a,1, 0x1e6c,0x1e6c,1, 0x1e6e,0x1e6e,1, 0x1e70,0x1e70,1, 0x1e72,0x1e72,1, 0x1e74,0x1e74,1,
  0x1e76,0x1e76,1, 0x1e78,0x1e78,1, 0x1e7a,0x1e7a,1, 0x1e7c,0x1e7c,1, 0x1e7e,0x1e7e,1, 0x1e80,0x1e80,1, 0x1e82,0x1e82,1, 0x1e84,0x1e84,1,
  0x1e86,0x1e86,1, 0x1e88,0x1e88,1, 0x1e8a,0x1e8a,1, 0x1e8c,0x1e8c,1, 0x1e8e,0x1e8e,1, 0x1e90,0x1e90,1, 0x1e92,0x1e92,1, 0x1e94,0x1e94,1,
  0x1e9e,0x1e9e,-7615, 0x1ea0,0x1ea0,1, 0x1ea2,0x1ea2,1, 0x1ea4,0x1ea4,1, 0x1ea6,0x1ea6,1, 0x1ea8,0x1ea8,1, 0x1eaa,0x1eaa,1, 0x1eac,0x1eac,1,
  0x1eae,0x1eae,1, 0x1eb0,0x1eb0,1, 0x1eb2,0x1eb2,1, 0x1eb4,0x1eb4,1, 0x1eb6,0x1eb6,1, 0x1eb8,0x1eb8,1, 0x1eba,0x1eba,1, 0x1ebc,0x1ebc,1,
  0x1ebe,0x1ebe,1, 0x1ec0,0x1ec0,1, 0x1ec2,0x1ec2,1, 0x1ec4,0x1ec4,1, 0x1ec6,0x1ec6,1, 0x1ec8,0x1ec8,1, 0x1eca,0x1eca,1, 0x1ecc,0x1ecc,1,
  0x1ece,0x1ece,1, 0x1ed0,0x1ed0,1, 0x1ed2,0x1ed2,1, 0x1ed4,0x1ed4,1, 0x1ed6,0x1ed6,1, 0x1ed8,0x1ed8,1, 0x1eda,0x1eda,1, 0x1edc,0x1edc,1,
  0x1ede,0x1ede,1, 0x1ee0,0x1ee0,1, 0x1ee2,0x1ee2,1, 0x1ee4,0x1ee4,1, 0x1ee6,0x1ee6,1, 0x1ee8,0x1ee8,1, 0x1eea,0x1eea,1, 0x1eec,0x1eec,1,
  0x1eee,0x1eee,1, 0x1ef0,0x1ef0,1, 0x1ef2,0x1ef2,1, 0x1ef4,0x1ef4,1, 0x1ef6,0x1ef6,1, 0x1ef8,0x1ef8,1, 0x1efa,0x1efa,1, 0x1efc,0x1efc,1,
  0x1efe,0x1efe,1, 0x1f08,0x1f0f,-8, 0x1f18,0x1f1d,-8, 0x1f28,0x1f2f,-8, 0x1f38,0x1f3f,-8, 0x1f48,0x1f4d,-8, 0x1f59,0x1f59,-8, 0x1f5b,0x1f5b,-8,
  0x1f5d,0x1f5d,-8, 0x1f5f,0x1f5f,-8, 0x1f68,0x1f6f,-8, 0x1f88,0x1f8f,-8, 0x1f98,0x1f9f,-8, 0x1fa8,0x1faf,-8, 0x1fb8,0x1fb9,-8, 0x1fba,0x1fbb,-74,
  0x1fbc,0x1fbc,-9, 0x1fc8,0x1fcb,-86, 0x1fcc,0x1fcc,-9, 0x1fd8,0x1fd9,-8, 0x1fda,0x1fdb,-100, 0x1fe8,0x1fe9,-8, 0x1fea,0x1feb,-112, 0x1fec,0x1fec,-7,
  0x1ff8,0x1ff9,-128, 0x1ffa,0x1ffb,-126, 0x1ffc,0x1ffc,-9, 0x2126,0x2126,-7517, 0x212a,0x212a,-8383, 0x212b,0x212b,-8262, 0x2132,0x2132,28, 0x2160,0x216f,16,
  0x2183,0x2183,1, 0x24b6,0x24cf,26, 0x2c00,0x2c2f,48, 0x2c60,0x2c60,1, 0x2c62,0x2c62,-10743, 0x2c63,0x2c63,-3814, 0x2c64,0x2c64,-10727, 0x2c67,0x2c67,1,
  0x2c69,0x2c69,1, 0x2c6b,0x2c6b,1, 0x2c6d,0x2c6d,-10780, 0x2c6e,0x2c6e,-10749, 0x2c6f,0x2c6f,-10783, 0x2c70,0x2c70,-10782, 0x2c72,0x2c72,1, 0x2c75,0x2c75,1,
  0x2c7e,0x2c7f,-10815, 0x2c80,0x2c80,1, 0x2c82,0x2c82,1, 0x2c84,0x2c84,1, 0x2c86,0x2c86,1, 0x2c88,0x2c88,1, 0x2c8a,0x2c8a,1, 0x2c8c,0x2c8c,1,
  0x2c8e,0x2c8e,1, 0x2c90,0x2c90,1, 0x2c92,0x2c92,1, 0x2c94,0x2c94,1, 0x2c96,0x2c96,1, 0x2c98,0x2c98,1, 0x2c9a,0x2c9a,1, 0x2c9c,0x2c9c,1,
  0x2c9e,0x2c9e,1, 0x2ca0,0x2ca0,1, 0x2ca2,0x2ca2,1, 0x2ca4,0x2ca4,1, 0x2ca6,0x2ca6,1, 0x2ca8,0x2ca8,1, 0x2caa,0x2caa,1, 0x2cac,0x2cac,1,
  0x2cae,0x2cae,1, 0x2cb0,0x2cb0,1, 0x2cb2,0x2cb2,1, 0x2cb4,0x2cb4,1, 0x2cb6,0x2cb6,1, 0x2cb8,0x2cb8,1, 0x2cba,0x2cba,1, 0x2cbc,0x2cbc,1,
  0x2cbe,0x2cbe,1, 0x2cc0,0x2cc0,1, 0x2cc2,0x2cc2,1, 0x2cc4,0x2cc4,1, 0x2cc6,0x2cc6,1, 0x2cc8,0x2cc8,1, 0x2cca,0x2cca,1, 0x2ccc,0x2ccc,1,
  0x2cce,0x2cce,1, 0x2cd0,0x2cd0,1, 0x2cd2,0x2cd2,1, 0x2cd4,0x2cd4,1, 0x2cd6,0x2cd6,1, 0x2cd8,0x2cd8,1, 0x2cda,0x2cda,1, 0x2cdc,0x2cdc,1,
  0x2cde,0x2cde,1, 0x2ce0,0x2ce0,1, 0x2ce2,0x2ce2,1, 0x2ceb,0x2ceb,1, 0x2ced,0x2ced,1, 0x2cf2,0x2cf2,1, 0xa640,0xa640,1, 0xa642,0xa642,1,
  0xa644,0xa644,1, 0xa646,0xa646,1, 0xa648,0xa648,1, 0xa64a,0xa64a,1, 0xa64c,0xa64c,1, 0xa64e,0xa64e,1, 0xa650,0xa650,1, 0xa652,0xa652,1,
  0xa654,0xa654,1, 0xa656,0xa656,1, 0xa658,0xa658,1, 0xa65a,0xa65a,1, 0xa65c,0xa65c,1, 0xa65e,0xa65e,1, 0xa660,0xa660,1, 0xa662,0xa662,1,
  0xa664,0xa664,1, 0xa666,0xa666,1, 0xa668,0xa668,1, 0xa66a,0xa66a,1, 0xa66c,0xa66c,1, 0xa680,0xa680,1, 0xa682,0xa682,1, 0xa684,0xa684,1,
  0xa686,0xa686,1, 0xa688,0xa688,1, 0xa68a,0xa68a,1, 0xa68c,0xa68c,1, 0xa68e,0xa68e,1, 0xa690,0xa690,1, 0xa692,0xa692,1, 0xa694,0xa694,1,
  0xa696,0xa696,1, 0xa698,0xa698,1, 0xa69a,0xa69a,1, 0xa722,0xa722,1, 0xa724,0xa724,1, 0xa726,0xa726,1, 0xa728,0xa728,1, 0xa72a,0xa72a,1,
  0xa72c,0xa72c,1, 0xa72e,0xa72e,1, 0xa732,0xa732,1, 0xa734,0xa734,1, 0xa736,0xa736,1, 0xa738,0xa738,1, 0xa73a,0xa73a,1, 0xa73c,0xa73c,1,
  0xa73e,0xa73e,1, 0xa740,0xa740,1, 0xa742,0xa742,1, 0xa744,0xa744,1, 0xa746,0xa746,1, 0xa748,0xa748,1, 0xa74a,0xa74a,1, 0xa74c,0xa74c,1,
  0xa74e,0xa74e,1, 0xa750,0xa750,1, 0xa752,0xa752,1, 0xa754,0xa754,1, 0xa756,0xa756,1, 0xa758,0xa758,1, 0xa75a,0xa75a,1, 0xa75c,0xa75c,1,
  0xa75e,0xa75e,1, 0xa760,0xa760,1, 0xa762,0xa762,1, 0xa764,0xa764,1, 0xa766,0xa766,1, 0xa768,0xa768,1, 0xa76a,0xa76a,1, 0xa76c,0xa76c,1,
  0xa76e,0xa76e,1, 0xa779,0xa779,1, 0xa77b,0xa77b,1, 0xa77d,0xa77d,-35332, 0xa77e,0xa77e,1, 0xa780,0xa780,1, 0xa782,0xa782,1, 0xa784,0xa784,1,
  0xa786,0xa786,1, 0xa78b,0xa78b,1, 0xa78d,0xa78d,-42280, 0xa790,0xa790,1, 0xa792,0xa792,1, 0xa796,0xa796,1, 0xa798,0xa798,1, 0xa79a,0xa79a,1,
  0xa79c,0xa79c,1, 0xa79e,0xa79e,1, 0xa7a0,0xa7a0,1, 0xa7a2,0xa7a2,1, 0xa7a4,0xa7a4,1, 0xa7a6,0xa7a6,1, 0xa7a8,0xa7a8,1, 0xa7aa,0xa7aa,-42308,
  0xa7ab,0xa7ab,-42319, 0xa7ac,0xa7ac,-42315, 0xa7ad,0xa7ad,-42305, 0xa7ae,0xa7ae,-42308, 0xa7b0,0xa7b0,-42258, 0xa7b1,0xa7b1,-42282, 0xa7b2,0xa7b2,-42261, 0xa7b3,0xa7b3,928,
  0xa7b4,0xa7b4,1, 0xa7b6,0xa7b6,1, 0xa7b8,0xa7b8,1, 0xa7ba,0xa7ba,1, 0xa7bc,0xa7bc,1, 0xa7be,0xa7be,1, 0xa7c0,0xa7c0,1, 0xa7c2,0xa7c2,1,
  0xa7c4,0xa7c4,-48, 0xa7c5,0xa7c5,-42307, 0xa7c6,0xa7c6,-35384, 0xa7c7,0xa7c7,1, 0xa7c9,0xa7c9,1, 0xa7cb,0xa7cb,-42343, 0xa7cc,0xa7cc,1, 0xa7ce,0xa7ce,1,
  0xa7d0,0xa7d0,1, 0xa7d2,0xa7d2,1, 0xa7d4,0xa7d4,1, 0xa7d6,0xa7d6,1, 0xa7d8,0xa7d8,1, 0xa7da,0xa7da,1, 0xa7dc,0xa7dc,-42561, 0xa7f5,0xa7f5,1,
  0xff21,0xff3a,32,
];
const CASE_UPPER_EXPAND: number[] = [
  0xdf,0x53,0x53,-1, 0x149,0x2bc,0x4e,-1, 0x1f0,0x4a,0x30c,-1, 0x390,0x399,0x308,0x301,-1, 0x3b0,0x3a5,0x308,0x301,-1, 0x587,0x535,0x552,-1,
  0x1e96,0x48,0x331,-1, 0x1e97,0x54,0x308,-1, 0x1e98,0x57,0x30a,-1, 0x1e99,0x59,0x30a,-1, 0x1e9a,0x41,0x2be,-1, 0x1f50,0x3a5,0x313,-1,
  0x1f52,0x3a5,0x313,0x300,-1, 0x1f54,0x3a5,0x313,0x301,-1, 0x1f56,0x3a5,0x313,0x342,-1, 0x1f80,0x1f08,0x399,-1, 0x1f81,0x1f09,0x399,-1, 0x1f82,0x1f0a,0x399,-1,
  0x1f83,0x1f0b,0x399,-1, 0x1f84,0x1f0c,0x399,-1, 0x1f85,0x1f0d,0x399,-1, 0x1f86,0x1f0e,0x399,-1, 0x1f87,0x1f0f,0x399,-1, 0x1f88,0x1f08,0x399,-1,
  0x1f89,0x1f09,0x399,-1, 0x1f8a,0x1f0a,0x399,-1, 0x1f8b,0x1f0b,0x399,-1, 0x1f8c,0x1f0c,0x399,-1, 0x1f8d,0x1f0d,0x399,-1, 0x1f8e,0x1f0e,0x399,-1,
  0x1f8f,0x1f0f,0x399,-1, 0x1f90,0x1f28,0x399,-1, 0x1f91,0x1f29,0x399,-1, 0x1f92,0x1f2a,0x399,-1, 0x1f93,0x1f2b,0x399,-1, 0x1f94,0x1f2c,0x399,-1,
  0x1f95,0x1f2d,0x399,-1, 0x1f96,0x1f2e,0x399,-1, 0x1f97,0x1f2f,0x399,-1, 0x1f98,0x1f28,0x399,-1, 0x1f99,0x1f29,0x399,-1, 0x1f9a,0x1f2a,0x399,-1,
  0x1f9b,0x1f2b,0x399,-1, 0x1f9c,0x1f2c,0x399,-1, 0x1f9d,0x1f2d,0x399,-1, 0x1f9e,0x1f2e,0x399,-1, 0x1f9f,0x1f2f,0x399,-1, 0x1fa0,0x1f68,0x399,-1,
  0x1fa1,0x1f69,0x399,-1, 0x1fa2,0x1f6a,0x399,-1, 0x1fa3,0x1f6b,0x399,-1, 0x1fa4,0x1f6c,0x399,-1, 0x1fa5,0x1f6d,0x399,-1, 0x1fa6,0x1f6e,0x399,-1,
  0x1fa7,0x1f6f,0x399,-1, 0x1fa8,0x1f68,0x399,-1, 0x1fa9,0x1f69,0x399,-1, 0x1faa,0x1f6a,0x399,-1, 0x1fab,0x1f6b,0x399,-1, 0x1fac,0x1f6c,0x399,-1,
  0x1fad,0x1f6d,0x399,-1, 0x1fae,0x1f6e,0x399,-1, 0x1faf,0x1f6f,0x399,-1, 0x1fb2,0x1fba,0x399,-1, 0x1fb3,0x391,0x399,-1, 0x1fb4,0x386,0x399,-1,
  0x1fb6,0x391,0x342,-1, 0x1fb7,0x391,0x342,0x399,-1, 0x1fbc,0x391,0x399,-1, 0x1fc2,0x1fca,0x399,-1, 0x1fc3,0x397,0x399,-1, 0x1fc4,0x389,0x399,-1,
  0x1fc6,0x397,0x342,-1, 0x1fc7,0x397,0x342,0x399,-1, 0x1fcc,0x397,0x399,-1, 0x1fd2,0x399,0x308,0x300,-1, 0x1fd3,0x399,0x308,0x301,-1, 0x1fd6,0x399,0x342,-1,
  0x1fd7,0x399,0x308,0x342,-1, 0x1fe2,0x3a5,0x308,0x300,-1, 0x1fe3,0x3a5,0x308,0x301,-1, 0x1fe4,0x3a1,0x313,-1, 0x1fe6,0x3a5,0x342,-1, 0x1fe7,0x3a5,0x308,0x342,-1,
  0x1ff2,0x1ffa,0x399,-1, 0x1ff3,0x3a9,0x399,-1, 0x1ff4,0x38f,0x399,-1, 0x1ff6,0x3a9,0x342,-1, 0x1ff7,0x3a9,0x342,0x399,-1, 0x1ffc,0x3a9,0x399,-1,
  0xfb00,0x46,0x46,-1, 0xfb01,0x46,0x49,-1, 0xfb02,0x46,0x4c,-1, 0xfb03,0x46,0x46,0x49,-1, 0xfb04,0x46,0x46,0x4c,-1, 0xfb05,0x53,0x54,-1,
  0xfb06,0x53,0x54,-1, 0xfb13,0x544,0x546,-1, 0xfb14,0x544,0x535,-1, 0xfb15,0x544,0x53b,-1, 0xfb16,0x54e,0x546,-1, 0xfb17,0x544,0x53d,-1,
];
const CASE_LOWER_EXPAND: number[] = [
  0x130,0x69,0x307,-1,
];
const upperMap: Map<number, number> = new Map();
const lowerMap: Map<number, number> = new Map();
const upperExpand: Map<number, number[]> = new Map();
const lowerExpand: Map<number, number[]> = new Map();
let i = 0;
while (i + 2 < CASE_UPPER_RANGES.length) {
  const from = CASE_UPPER_RANGES[i];
  const to = CASE_UPPER_RANGES[i + 1];
  const delta = CASE_UPPER_RANGES[i + 2];
  for (let unit = from; unit <= to; unit++) upperMap.set(unit, unit + delta);
  i = i + 3;
}
i = 0;
while (i + 2 < CASE_LOWER_RANGES.length) {
  const from = CASE_LOWER_RANGES[i];
  const to = CASE_LOWER_RANGES[i + 1];
  const delta = CASE_LOWER_RANGES[i + 2];
  for (let unit = from; unit <= to; unit++) lowerMap.set(unit, unit + delta);
  i = i + 3;
}
i = 0;
while (i < CASE_UPPER_EXPAND.length) {
  const from = CASE_UPPER_EXPAND[i];
  const pieces: number[] = [];
  i = i + 1;
  while (i < CASE_UPPER_EXPAND.length && CASE_UPPER_EXPAND[i] >= 0) {
    pieces.push(CASE_UPPER_EXPAND[i]);
    i = i + 1;
  }
  upperExpand.set(from, pieces);
  i = i + 1;
}
i = 0;
while (i < CASE_LOWER_EXPAND.length) {
  const from = CASE_LOWER_EXPAND[i];
  const pieces: number[] = [];
  i = i + 1;
  while (i < CASE_LOWER_EXPAND.length && CASE_LOWER_EXPAND[i] >= 0) {
    pieces.push(CASE_LOWER_EXPAND[i]);
    i = i + 1;
  }
  lowerExpand.set(from, pieces);
  i = i + 1;
}
const out: number[] = [];
for (let at = 0; at < units.length; at++) {
  const unit = units[at];
  if (id === StringToLowerCase || id === StringToLocaleLowerCase) {
    const expansion = lowerExpand.get(unit);
    if (expansion !== undefined) {
      for (let k = 0; k < expansion.length; k++) out.push(expansion[k]);
      continue;
    }
    const mapped = lowerMap.get(unit);
    out.push(mapped === undefined ? unit : mapped);
    continue;
  }
  const expansion = upperExpand.get(unit);
  if (expansion !== undefined) {
    for (let k = 0; k < expansion.length; k++) out.push(expansion[k]);
    continue;
  }
  const mapped = upperMap.get(unit);
  out.push(mapped === undefined ? unit : mapped);
}
return out;
```
