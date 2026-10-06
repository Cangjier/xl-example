# dependencies
```xl
import { Value, ValueTag } from "../../runtime/value.xl.md"
import { HeapTable, ObjectCharge, CodeUnitCharge, ValueCharge } from "../../runtime/heap.xl.md"
import { RoomChecker, IsCallableValue } from "../../runtime/rt.xl.md"
import { SetProperty, NativeCall, Protos, NewPlainArray } from "../../runtime/props.xl.md"
import { Vm } from "../../runtime/vm.xl.md"
import { Units, NeverCall, ArgOr, NormalizeRangeIndex } from "./array.xl.md"
import { JsTextUnits, ValueUnits, UnwrapBox } from "./text.xl.md"
import { HostUnitsText, HostTextUnits, HostNormalize } from "../../runtime/host-text.xl.md"
```

# namespace cangjie

**标准库第二块：`String` 的原型方法**（`charAt` / `charCodeAt` / `indexOf` / `slice`）。

**它与数组那一块的区别在于「接收者是谁」**：数组是对象，自带 `Proto` ✓；
字符串是**原始值**——它没有属性表，所以**引擎**要为它提供一个起点
（`props.xl.md` 的 `Protos.String` 与 `GetProperty` 里那一段原始值分支 ✓）。
**这一步非做不可**：不做的话 `"abc".charAt` 只能是 `undefined`，而那种
「看起来像没有这个方法」比报错更难查。

**能力号从 100 起**（与数组的 1..9 分开）：一个通道按号分派全部内建，
**号段分开**是为了让「哪一块」一眼可辨（`builtins/install.xl.md` 就是按号段转的）。

**这一轮不做**：正则、`padStart` 那一类。

**第 120 轮补的五个**：`split`（要造数组，所以走宿主那条带原型的通道 ✓）、
`toUpperCase` / `toLowerCase`（**只做 ASCII** ✓——大小写映射表不在这一层，
遇到非 ASCII **响亮地抛** ✓，不静默给一个「看起来变过了」的串 ✗）、
`trim`（**只做 ASCII 空白** ✓，边缘遇到非 ASCII 同样是抛 ✗）、`includes`（返回真假 ✓）。

# const StringCharAt:int = 101

`String.prototype.charAt` 的能力号。

# const StringCharCodeAt:int = 102

# const StringIndexOf:int = 103

# const StringSlice:int = 104

# const StringSplit:int = 105

`String.prototype.split` 的能力号（第 120 轮补）。

**它必须走带原型的那条通道**（`InvokeWithSink`）：结果是一个**数组** ✓，
而「数组从哪来」要 `protos` ✗——`InvokeString` 的签名里没有它 ✓
（与 `get_iterator` 在 `install.xl.md` 里被单独接住是同一个理由 ✓）。

# const StringToUpperCase:int = 106

# const StringToLowerCase:int = 107

# const StringTrim:int = 108

# const StringIncludes:int = 109

# const StringStartsWith:int = 110

`startsWith(前缀, 位置?)` 的号（第 123 轮）。
**位置参数照 JS 给** ✓：从那个下标起比对 ✓（夹到 `0..length` ✓）。

# const StringEndsWith:int = 111

`endsWith(后缀, 结束位置?)` 的号——第二个参数是**结束位置** ✓（不是起点 ✗，与 `startsWith` 不同 ✓）。

# const StringSubstring:int = 112

`substring(起, 止)` 的号。

**它与 `slice` 的差别只有两处** ✓，而这两处**恰好让它能做得比 `slice` 更准** ✓：
`substring` 把负数与 `NaN` **夹到 0** ✓（JS 也是 ✓），而 `slice` 在 JS 里是**从末尾数** ✗
（那是本仓已记的差异 ✗）；`substring` 在 `起 > 止` 时**交换两个参数** ✓（JS 的怪规矩 ✓，
`slice` 给空串 ✗）——**两条都照 JS 给** ✓。

# const StringRepeat:int = 113

`repeat(次数)` 的号。

**非整数按 `ToIntegerOrInfinity` 折** ✓（**向零截断** ✗ 不是向下取整 ✓——`repeat(-0.5)` 在 JS 里
是 `repeat(-0)` ⇒ **空串** ✓，写成 `floor` 会变成 `-1` ⇒ **抛** ✗）；**负数抛** ✓。
**第 288 轮这一格才真的对** ✓：次数取自 `ArgOr` ✓，而它在第 288 轮之前对小数**一律给 `0`** ✗
（`"a".repeat(2.9)` 给空串 ✓，JS 给 `"aa"` ✓——**静默错值** ✓，理由记在 `ArgOr` 那一段 ✓）。
**太多次不另设上限** ✓：它自己会在 `room` 那一关被拦下 ✓（那是一条**可捕获的错误** ✓），
再加一个人为上限就是第二个「上限」了 ✗——两处不一致比一处更坏 ✓。

# const StringPadStart:int = 114

`padStart(目标长度, 填充串?)` 的号（第 126 轮）——第二个参数缺省是**一个空格** ✓。

# const StringPadEnd:int = 115

`padEnd(目标长度, 填充串?)`。

**两条边角照 JS 给** ✓：目标长度**不大于**当前长度就**原样返回** ✓；
**填充串是空串就不补** ✓（JS 也这样 ✓——补出来的东西不是「填充」✗）。
**填充串要重复、并在最后一段截断** ✓（`"ab".padStart(7, "xy")` → `"xyxyxab"` ✓）。
**已知差异写在明处** ✗：JS 按**字符**（码位）补，这里按**码元** ✓——
ASCII 填充串两边一致 ✓，**代理对**那一类会差一个 ✓（记在台账 ✓）。

# const StringFromCharCode:int = 116

**`String.fromCharCode(码元…)`** 的号（第 130 轮）——**静态方法** ✓：
调用时 `self` 是那个 `String` **普通对象**（不是字符串 ✗），
所以它必须排在 `RequireString` **前面** ✓（与 `Array.isArray` 同一条先例 ✓）。

**已知差异写在明处** ✗：JS 会**夹到 `0..65535`** ✓，这里**不夹** ✗——
`-1` / `70000` 原样进码元表，于是它会变成一个越界码元 ✓。
与 `charAt` 那条「越界给 `undefined`」同一类（**宁可差得可查，也不静默改值** ✓），
记在台账里 ✓。

# const StringReplace:int = 117

# const StringReplaceAll:int = 118

# const StringAt:int = 119

`String.prototype.at` / `codePointAt` / `concat` / `lastIndexOf`（第 208 轮 ✓，号**追加在表尾** ✓）。

**四格各自拖着的判据** ✓：`string-length-index`（`at` ✓）、
`string-codePointAt`（代理对合成一个码位 ✓）、`string-concat-method`（`"a".concat(…, 1, true)` ✓）、
`string-lastIndexOf`（从后往前找 ✓）。

**`at` 与 `s[i]` 的差别就是负下标** ✓（`s.at(-1)` 从尾巴数 ✓、`s[-1]` 是 `undefined` ✓）——
与数组那一格 `ArrayAt` 同一条规矩 ✓（两处都要在 ✓，两处都不许把 `-1` 当尾巴 ✗）。

# const StringLastIndexOf:int = 122

# const StringCodePointAt:int = 121

# const StringConcatMethod:int = 120

**它不叫 `StringConcat`** ✗：那个名字在 `globals.xl.md` 里**已经占了** ✓（语言内建号 302 ✓，
「降级层的字符串拼接」✓）——两个同名常量被同一个文件 import 就是**撞名** ✗，
所以这一格带 `Method` 后缀 ✓。

# const StringLocaleCompare:int = 123

**`localeCompare`**（第 208 轮 ✓）——按**码元**比、**只做 ASCII** ✓（没有区域表 ✓，理由写在实现里 ✓）。

# const StringTrimStart:int = 124

# const StringTrimEnd:int = 125

**`trimStart` / `trimEnd`**（第 275 轮 ✓）——`trim` 的**两个半边** ✓。
**三个共用同一段实现** ✓（只差「从哪一头裁」✓）：那一支里有两件**不能抄**的东西 ✗——
「**只做 ASCII 空白**」那张表 ✓、以及「**边缘是非 ASCII 就抛**」那条纪律 ✓
（它挡的是 `U+00A0` 那一类这一层认不出来的空白 ✓）。
抄成三份就是三处会漂的答案 ✗，而漂了的症状是「有一头**静默**少裁了一个字符」✓。

**它们是第 273 轮普查量到的** ✓：判据 `string-trim-variants` 在报
`cannot call a non-closure value` ✓——即**那一格根本没装** ✗（`trim` 一直是好的 ✓）。

# const StringToString:int = 128

**`"abc".toString()`**（第 304 轮 ✓）——返回**接收者自己** ✓（`valueOf` 与它一字不差 ✓）。

**不装它的代价是静默错值** ✗：`Protos.String` 上找不到 `toString` ✓，属性查找就
一路落到 `Object.prototype.toString` ✓，于是 `"abc".toString()` 打出
**`"[object String]"`** ✓——**看着像个值** ✓、一句异常都没有 ✗
（判据 `c304-std-string-valueof-tostring` 量的就是它 ✓）。
**同一族的 `String.prototype.toString.call(s)`** 走的也是这一格 ✓
（`String.prototype` 从第 137 轮起就是 `Protos.String` 本人 ✓）。

# const StringValueOf:int = 129

**`"abc".valueOf()`**（第 304 轮 ✓）——与 `toString` **同一个实现** ✓
（JS 里这两个方法在字符串上返回的都是接收者自己 ✓，所以指到**同一格能力号** ✓——
同一件事不写第二份实现 ✓，与 `Array.prototype.toString` / `toLocaleString` 那条先例同款 ✓）。

# const StringSubstr:int = 127

**`substr(起, 长度?)`**（第 291 轮 ✓）——**号照旧追加在表尾** ✓（`126` 之后 ✓）。

**它不是 `substring` 的别名** ✗，也不是 `slice` 的 ✗：第二个实参是**长度** ✓
（`"abcdef".substr(1, 2)` 是 `"bc"` ✓，而 `substring(1, 2)` 是 `"b"` ✓）；
**负起点从尾巴数** ✓（`substr(-2)` 是 `"ef"` ✓，而 `substring(-2)` 夹到 `0` ⇒ 整串 ✓）；
**起点在尾巴之外给空串** ✓。三条合起来正好说明**它是第三张表** ✓——
与 `StringSubstring` 那一段里记的「`slice` 与 `substring` 只差两处」对照着读 ✓：
`substr` 与它们**每一处都不同** ✓，所以既不能顶替、也不能共用 ✓。

**它是第 291 轮普查量到的** ✓：判据 `c291-string-slice-substring-substr`
报 `cannot call a non-closure value` ✓——即**那一格根本没装** ✗
（`slice` / `substring` 一直是好的 ✓）。

# const StringIsWellFormed:int = 130

**`s.isWellFormed()`**（第 330 轮 ✓，ES2024 ✓）——这张码元表里**有没有落单的代理** ✓。

**它与 `toWellFormed` 是同一件事的两面** ✓，所以共用一条扫描 ✓（见 `SurrogateStep` ✓）：
规范里写死的正是「`isWellFormed()` 为真 ⟺ `toWellFormed()` 原样返回」✓——
分成两份实现，就会有一天一条说真、另一条却改了东西 ✗。

**为什么它是「标准里定死」的那一档** ✓（而不是「各目标可能不同」✗）：
代理对的合法性是 UTF-16 自己的规矩 ✓，与区域设置 / 宿主都无关 ✓
（与第 311 轮那两张表同一档 ✓）。

# const StringToWellFormed:int = 131

**`s.toWellFormed()`**（第 330 轮 ✓）——把每个**落单的代理**换成一个 `U+FFFD` ✓，
**成对的代理一个都不动** ✗（它是一对合法的 ✓）。

**替换是逐码元的、不是逐码点的** ✗：`"\uD800\uD800"` 给**两个** `U+FFFD` ✓
（JS 的口径 ✓，两个各自落单 ✓）——写成「先按码点拆再替换」会先把它们凑成一对 ✓，
**静默错值** ✗。

# const StringNormalize:int = 132

**`s.normalize(形态?)`** ✓（第 332 轮 ✓，ES2015 ✓）——Unicode 规范化的四个形态 ✓。

**它借宿主的表** ✓（`host-text.xl.md` 的 `HostNormalize` ✓）：NFC / NFD / NFKC / NFKD
由 Unicode 标准**逐码位定死** ✓，任何一份实现给的都是同一串 ✓——**与浮点那两处同一条规矩** ✓
（`NumberToHostText` / `NumberFromHostText` ✓）。而那张表是几万行 ✗：手写一遍是另一个量级 ✓。

**形态要在这一层先判** ✗：JS 对认不出来的形态抛 **`RangeError`** ✓，而宿主抛的是
**宿主异常** ✗（两条路在这一层的分工与 `NumberFromHostText` 那一处相同 ✓）。
**默认 `"NFC"`** ✓（`s.normalize()` 与 `s.normalize(undefined)` 都是它 ✓）。

**一处诚实的差别写在明处** ✗：JS 里那张表是**运行期**查的 ✓，本仓借的是**宿主那一份** ✓——
两者逐码位相同 ✓，但**未来 Unicode 版本更新时两边会一起变** ✓（这正是「借被标准定死的东西」
的含义 ✓，与浮点那条**一字不差** ✓）。

# const StringFromCodePoint:int = 126

**`String.fromCodePoint(码位…)`**（第 275 轮 ✓）——**静态方法** ✓
（与 `fromCharCode` 同一条先例 ✓：`self` 是那个 `String` **普通对象** ✓，
所以它必须排在 `RequireString` **前面** ✓）。

**它与 `fromCharCode` 不是一回事** ✗，而且差在**两头** ✓：
- **实参**是**码位** ✓（`fromCodePoint(0x1F600)` 给**一个**字符 ✓），
  而 `fromCharCode` 收的是**码元** ✓（`fromCharCode(0x1F600)` 给**一个**越界码元 ✓，
  它**不是**那个 emoji ✓）；
- **输出**可能**不止一个码元** ✓（代理对 ✓）——所以这一格要**按码位拆成码元** ✓，
  不能像 `fromCharCode` 那样「一个实参一个码元」✗。

**越界要抛 `RangeError`** ✓（JS 的口径 ✓）：`fromCodePoint(-1)` / `fromCodePoint(0x110000)`
在 JS 里都抛 ✓，而 `fromCharCode` 是**夹住** ✓——**两个函数的边角口径不同** ✗，
这一句也是不能互相顶替的地方 ✓。

**它是第 273 轮普查量到的** ✓：判据 `string-at-and-codepoints` 量到
`String.fromCodePoint` 不在那儿 ✓（同一条里 `.at()` 与 `.codePointAt()` 一直是好的 ✓）。

**`replaceAll(找, 换)`**（第 150 轮）——与 `replace` **共用同一段实现** ✓（只差「换一处 / 换全部」✓）。
**不是「把 `replace` 的结果反复跑一遍」** ✗（那在替换文本里含针时会无限增长 ✓）；
扫描接着**这一处之后**走 ✓（`"aaa".replaceAll("a","aa")` 给 `"aaaaaa"` ✓——JS 就是三处 ✓）。

`replace(要找的, 换成的)` 的号（第 130 轮）——**只做「字符串找字符串、换成字符串」** ✓。

**只替换第一处** ✓（JS 的字符串实参口径 ✓，不是 `replaceAll` ✗）。
**三个不做的形态一律响亮地抛** ✓：正则实参、函数实参（`(match) => …`）、
`$1` / `$&` 那一类替换模式 ✗——它们的语义靠**正则**与**回调**，
而这一层两样都还没有 ✓。静默把它们当普通文本是最坏的一种 ✗。

# method RequireString:(table:HeapTable, self:Value)=>void

**原始值接收者这条路上，`self` 是原样的字符串**（没有包装对象）——
「装箱」这件事没有发生，引擎只是**借它的原型**去找方法。

```ts
if (self.Tag !== ValueTag.String) {
  throw new Error("this method needs a string receiver");
}
```

# method SurrogateStep:(units:Array<int>, at:int)=>int

**良构那条扫描在 `at` 这一格要跨几步**（第 330 轮 ✓）——
`2` = 一对**配对**的代理 ✓、`1` = 一个普通码元 ✓、`-1` = **落单的代理** ✓。

**为什么让扫描「跨步」而不是逐格判** ✗：逐格判要把「我是不是某一对的后半」也带上 ✓，
而那正是最容易写漏的一格 ✗——实测第一版就是逐格判的 ✓，
`"a\uD83D\uDE00b"` 在第 2 格（**后随代理**）被判成落单 ✓，
于是 `"😀".isWellFormed()` 给**假** ✗（JS 给真 ✓）。**跨步之后这一格根本不会单独被访问** ✓。

| 这一格 | 下一格 | 给什么 |
| --- | --- | --- |
| 前导代理 `D800..DBFF` ✓ | 后随代理 `DC00..DFFF` ✓ | `2`（一对 ✓） |
| 前导代理 ✓ | 别的 / **没有下一格** ✓ | `-1`（落单 ✓） |
| 后随代理 `DC00..DFFF` ✓ | —— | `-1`（后随代理**永远**不该单独出现 ✓） |
| 其余 | —— | `1` ✓ |

**它与迭代那一支**不是一回事 ✗（第 297 轮的 `DoIterNext` ✓）：那一支也要按码点走 ✓，
可它的口径是「**孤立的照样给出去**」✓（`[..."\uD800"]` 在 JS 里长度是 1 ✓）——
它**不判良构** ✗。两处问的是不同的问题 ✓，所以合并就是把两件事混成一件 ✗。

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

**`charCodeAt` 越界给 `undefined`**（JS 给 `NaN` ✗）：`NaN` 要浮点那一套
（`value.xl.md` 里 `Float64` 有了，但「NaN 怎么表示、怎么显示」是另一件事），
所以这一轮**给 `undefined` 并写在这里**——不假装它是 `NaN`。

**负下标不按 JS 的「从末尾数」**：`slice(-2)` 在 JS 里是最后两个字符，
这里**夹到 0**。这是**已知的语义差**，写在文首那张表里（做法与理由同 `??`/`?.` 那些）。

```ts
// **静态方法排在 `RequireString` 前面** ✓（第 130 轮，与 `Array.isArray` 同一条先例 ✓）：
// `String.fromCharCode(65)` 的 `self` 是那个 `String` **普通对象** ✓，过一遍 `RequireString`
// 会当场抛 ✗（症状离现场很远：报的是「这个方法要一个字符串接收者」✓，而调用点看着完全正常 ✗）。
if (id === StringFromCharCode) {
  const codes: number[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].IsNumber()) codes.push(args[i].AsInt());
  }
  if (!room(ObjectCharge + CodeUnitCharge * codes.length)) throw new Error("out of room");
  return Value.FromString(table.CreateString(codes));
}
if (id === StringFromCodePoint) {
  // **静态方法，排在 `RequireString` 前面** ✓（与 `fromCharCode` 同一条先例 ✓，理由见号那一段 ✓）。
  // **一个码位可能拆成两个码元** ✓（代理对 ✓）——所以先把整张码元表算出来 ✓，
  // 再一次性开串 ✓（`CreateString` 收的是**整张表** ✓，不是「能追加的串」✗）。
  // **两头都与 `fromCharCode` 不同** ✗：实参是**码位**（不是码元 ✓）、
  // 越界**抛 `RangeError`**（不是夹住 ✓）——JS 把这两个函数的口径分得很开 ✓。
  const codeUnits: number[] = [];
  for (let i = 0; i < args.length; i++) {
    // **不是数字就抛** ✓（JS 先 `ToNumber` ✓，拿不到整码位就抛 ✓）——
    // 这里**不做 `ToNumber`** ✗（那要碰堆 ✓），直接要求一个数值格子 ✓；
    // 给别的类型就落到这一句抛上 ✓（**响亮**，不是静默跳过 ✗）。
    if (!args[i].IsNumber()) {
      throw new RangeError("invalid code point for String.fromCodePoint");
    }
    const point = args[i].AsDouble();
    // **整数、且落在 `0..0x10FFFF`** ✓：`NaN` / 小数 / 越界**一律抛** ✓（JS 的口径 ✓）。
    // `NaN` 那一格由 `point !== Math.floor(point)` 顺手接住 ✓
    //（`Math.floor(NaN)` 是 `NaN` ✓，两者不等 ✓）。
    if (point !== Math.floor(point) || point < 0 || point > 0x10ffff) {
      throw new RangeError("invalid code point for String.fromCodePoint");
    }
    if (point <= 0xffff) {
      codeUnits.push(point);
      continue;
    }
    // **代理对的两个公式**（JS 的 `UTF16EncodeCodePoint` ✓）：
    // 高位是 `0xD800 + (偏移 >> 10)` ✓、低位是 `0xDC00 + (偏移 & 0x3FF)` ✓。
    const offset = point - 0x10000;
    codeUnits.push(0xd800 + (offset >> 10));
    codeUnits.push(0xdc00 + (offset & 0x3ff));
  }
  if (!room(ObjectCharge + CodeUnitCharge * codeUnits.length)) throw new Error("out of room");
  return Value.FromString(table.CreateString(codeUnits));
}
// **包装对象要在这里脱箱** ✓（第 310 轮 ✓）：`new String("ab").toUpperCase()` ✓——
// 接收者是一个**普通对象** ✓（方法是从 `String.prototype` 上找到的 ✓），
// 而下面**每一条**都按「`self` 是字符串」写 ✓。
// **脱箱只有一处** ✓（`text.xl.md` 的 `UnwrapBox` ✓，与 `globals.xl.md` 那一处
// **同一份** ✓）——在两个文件里各写一遍就是两处会漂 ✗（`globals` 已经 import 了本文件 ✗，
// 所以那个判据只能落在 `text.xl.md` ✓）。
// **它排在这里**（静态方法那几支之后 ✓）：那几支的 `self` 是 `String` **对象本身** ✗，
// 不该被当成包装对象 ✓。
self = UnwrapBox(table, self);
RequireString(table, self);
const units = JsTextUnits(table, self);
// **`isWellFormed` / `toWellFormed`**（第 330 轮 ✓）——两条**共用同一条扫描** ✓
//（`SurrogateStep` ✓，理由见那两个号那一段 ✓）。
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
  // **先扫一遍判「要不要动」** ✗：良构时**原样把接收者交回去** ✓
  //（`"a".toWellFormed() === "a"` 在 JS 里为真 ✓，与 `toString` / `valueOf` 那一族同一条口径 ✓），
  // 而「边扫边造、最后一个字符都没换也造一个新串」会让上面那条判等给假 ✓。
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
      // **落单的那一格换成一个 `U+FFFD`** ✓（`65533` ✓），其余原样 ✓。
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
  // **形态先判、再交给宿主** ✗（第 332 轮 ✓，理由见号那一段 ✓）：JS 对认不出来的形态
  // 抛 `RangeError` ✓，而宿主抛的是宿主异常 ✗。**缺省 `"NFC"`** ✓（`undefined` 也走它 ✓）。
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
  // **越界给 `NaN`** ✓（第 208 轮改 ✓）：JS 的 `"".charCodeAt(0)` 是 `NaN` ✓，
  // 而这里原来给的是 `undefined` ✗——**静默错值** ✗（判据 `string-charAt-charCodeAt` 现场红的 ✓：
  // `"".charCodeAt(0) !== "".charCodeAt(0)` 在 JS 里是**真** ✓（`NaN` 与自己不等 ✓），
  // 给 `undefined` 就成了**假** ✗）。这一格与 `charAt` 不一样 ✓：那个越界给**空串** ✓（JS 的口径 ✓）。
  const at = ArgOr(args, 0, 0);
  if (at < 0 || at >= units.length) return Value.FromDouble(NaN);
  return Value.FromInt(units[at]);
}
if (id === StringLocaleCompare) {
  // **`localeCompare`**（第 208 轮 ✓）：JS 的完整语义要**一张区域表** ✗（本仓没有 ✓），
  // 所以这里按**码元**比 ✓、并且**只做 ASCII** ✓——非 ASCII 当场抛 ✓
  //（与 `toUpperCase` / `toLowerCase` 同一条纪律 ✓：宁可缺，也不静默换一个「看起来对」的答案 ✗）。
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
  // **`fromIndex` 那一格**（第 208 轮 ✓）：与数组那一轮同一处缺口 ✓——
  // 第二个实参原来**被丢掉** ✓（`"hello".indexOf("o", 5)` 从 0 找起 ✗，**静默错值** ✗）。
  // **两条边角照 JS** ✓，而**字符串这一支与数组那一支不是同一条规矩** ✗（第 208 轮实测 ✓）：
  // `String.indexOf` 的 `position` **夹到 `[0, len]`** ✓（`"hello world".indexOf("o", -5)`
  // 是 `4` ✓——**负数不从末尾数** ✗！那是 `Array.prototype.indexOf` 的规矩 ✓）；
  // `lastIndexOf` 缺省**从尾巴起** ✓、给了就**往前找** ✓、负数当 `0` ✓。
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
        // **越过尾巴**：空串给 `length` 那一段、非空串给 `-1` ✓（JS 的口径 ✓）。
        if (needle.length === 0) return Value.FromInt(length0);
        return Value.FromInt(-1);
      }
    }
  }
  if (id === StringLastIndexOf) {
    // **空串在末尾匹配一次** ✓（`"abc".lastIndexOf("")` 是 `3` ✓）。
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
  // **`at(i)`**（第 208 轮 ✓）：与 `s[i]` 只差**负下标从尾巴数** ✓
  //（与数组那一格 `ArrayAt` 是同一条规矩 ✓——两处都不许把 `s[-1]` 当成「从尾巴数」✗）。
  // **不给实参 = 0** ✓（第 208 轮实测 ✓）：JS 走的是 `ToIntegerOrInfinity(undefined)` ✓
  //（`NaN` → `0` ✓），所以 `"abc".at()` 是 `"a"` ✓、`"abc".codePointAt()` 是 `65` ✓——
  // **不是 `undefined`** ✗（那是「越界」那一档 ✓，两档不一样 ✓）。
  let at = ArgOr(args, 0, 0);
  if (at < 0) at = at + units.length;
  if (at < 0 || at >= units.length) return Value.Undefined();
  if (!room(ObjectCharge + CodeUnitCharge)) throw new Error("out of room");
  return Value.FromString(table.CreateString([units[at]]));
}
if (id === StringCodePointAt) {
  // **`codePointAt(i)`**（第 208 轮 ✓）：把**代理对**合成一个码位 ✓
  //（`"𐀀".codePointAt(0)` 是 `65536` ✓，而 `charCodeAt(0)` 是那个高代理 ✓——两格都要在 ✓）。
  // **不给实参 = 0** ✓（与 `at` 同一档 ✓，理由写在那一支里 ✓）。
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
  // **`String.prototype.concat(…args)`**（第 208 轮 ✓）：把 `self` 与**每个实参**的文本接起来 ✓。
  // **实参先过 `ToString`** ✓（`"a".concat(1, true)` 是 `"a1true"` ✓）——
  // 所以走的是「任意值 → 文本」那条（`ValueUnits` ✓，与 `String(x)` 同一处 ✓），
  // 而不是 `TextUnitsOf` ✗（那个对非字符串**抛** ✓，是引擎的口径 ✓）。
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
  // **两个端点都走 `NormalizeRangeIndex`** ✓（第 208 轮 ✓）：与数组那一轮同一处缺口 ✓——
  // 原来只夹了「起点小于 0 → 0」✗，于是 **`"abcdef".slice(-2)` 给整串** ✓
  //（JS 给 `"ef"` ✓，**静默错值** ✗）。
  // **`substring` 那一支与它不一样** ✗（`substring` 把负数当 0 ✓、还会**交换**两个端点 ✓）——
  // 所以那一支**不许**接这个规整 ✓（接上去就是「看起来统一了」的错 ✗）。
  const start = NormalizeRangeIndex(ArgOr(args, 0, 0), length);
  let end = NormalizeRangeIndex(ArgOr(args, 1, length), length);
  if (end < start) end = start;
  const cut: number[] = [];
  for (let i = start; i < end; i++) cut.push(units[i]);
  if (!room(ObjectCharge + CodeUnitCharge * cut.length)) throw new Error("out of room");
  return Value.FromString(table.CreateString(cut));
}
if (id === StringIncludes) {
  // **`includes` 与 `indexOf` 共用一趟扫描** ✓：差别只在「给不给下标」✓。
  // **空串恒为真** ✓（JS 就是这么定的：`"abc".includes("")` 是真 ✓）——
  // 这一条与 `indexOf` 给 `0` 是同一件事的两种说法 ✓。
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
if (id === StringToUpperCase || id === StringToLowerCase) {
  // **只做 ASCII**（第 120 轮）：一张完整的大小写映射表不在这里 ✗——
  // 而「只悄悄转 ASCII、其余原样放过」会让 `"é".toUpperCase()` 静默给错值 ✗，
  // 所以遇到 > 127 的码元**当场抛** ✓（宁可缺，也不静默换形状 ✓）。
  const out: number[] = [];
  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    if (unit > 127) {
      throw new Error("unimplemented: case conversion outside ASCII (there is no mapping table here)");
    }
    if (id === StringToLowerCase) {
      out.push(unit >= 65 && unit <= 90 ? unit + 32 : unit);
    } else {
      out.push(unit >= 97 && unit <= 122 ? unit - 32 : unit);
    }
  }
  if (!room(ObjectCharge + CodeUnitCharge * out.length)) throw new Error("out of room");
  return Value.FromString(table.CreateString(out));
}
if (id === StringTrim || id === StringTrimStart || id === StringTrimEnd) {
  // **JS 要裁的那张表是标准定死的** ✓（第 311 轮补全 ✓）。原来这里**只认 ASCII 六格**
  // （9 / 10 / 11 / 12 / 13 / 32 ✓）、扫到 > 127 的边缘码元就**抛** ✓——
  // 那是「认不出来就不猜」✓ 的写法 ✓，可这张表**根本不用猜** ✗：
  // `WhiteSpace` + `LineTerminator` 的名单是规范里写着的 ✓（`String.prototype.trim`
  // 的「white space」= **WhiteSpace ∪ LineTerminator** ✓）。
  //
  // **两半** ✓：`WhiteSpace` = TAB(9) ✓ VT(11) ✓ FF(12) ✓ SP(32) ✓ NBSP(U+00A0) ✓
  // ZWNBSP(U+FEFF) ✓ 以及 **Unicode 的 `Zs`**（U+1680 ✓、U+2000..U+200A ✓、
  // U+202F ✓、U+205F ✓、U+3000 ✓）；`LineTerminator` = LF(10) ✓ CR(13) ✓
  // LS(U+2028) ✓ PS(U+2029) ✓。
  //
  // **`Zs` 那一段写成区间** ✓（U+2000..U+200A 是连续十个 ✓）——逐个列出来更容易漏 ✓，
  // 而漏一个的症状是「那一格**静默**没裁掉」✗（判据 `c305-std-string-trim-unicode-space` ✓：
  // `"\u00a0x\u00a0".trim()` ✓ 与 `"\u3000y".trim()` ✓）。
  // **那张名单里没有任何东西需要问宿主** ✓：它是规范里的**字面表** ✓，
  // 与「大小写要 Unicode 表」是两回事 ✗（后者是一张巨大的映射表 ✓，前者是二十来个码元 ✓）。
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
  // **两个都收可选的第二个参数**（第 123 轮）✓——但它们的含义**不一样** ✗：
  // `startsWith` 的那个是**起点** ✓，`endsWith` 的那个是**结束位置** ✓（JS 就是这么定的 ✓）。
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
  // **夹到 0、再交换**（JS 的两条怪规矩，见 `StringSubstring` 那一段）✓。
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
  // **第三个实参是「长度」** ✓（见 `StringSubstr` 那一段 ✓）——三处与 `slice` / `substring` 都不同 ✗：
  // 负起点**从尾巴数** ✓、缺省长度是「到尾巴」✓、起点越界给**空串** ✓（不是夹到尾巴 ✗）。
  const length = units.length;
  const rawStart = args.length > 0 ? ArgOr(args, 0, 0) : 0;
  // **向零截断** ✓（JS 的 `ToIntegerOrInfinity` ✓，与 `repeat` 那条同一个折法 ✓）。
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
  // **向零截断；负数抛 `RangeError`** ✓（JS 的 `ToIntegerOrInfinity` + RangeError ✓）。
  // **抛的必须是 `RangeError`** ✗（第 288 轮改）：原来抛的是**裸 `Error`** ✓，
  // 于是脚本里 `e.name` 给 `"Error"` ✗（Node 给 `"RangeError"` ✓）——
  // 而 `install.xl.md` 那一支**恰恰按宿主异常的类**翻族 ✓（`error instanceof RangeError` ✓），
  // 所以「抛什么」是**能被脚本看见**的 ✓（判据 `string-pad-and-repeat-edge-forms` 量的就是它 ✓）。
  // 同一个文件里 `fromCodePoint` 那一支早就抛 `RangeError` ✓（第 275 轮 ✓）——这一处是漏的 ✗。
  const raw = args.length > 0 ? ArgOr(args, 0, 0) : 0;
  const count = raw < 0 ? -1 : raw;
  if (count < 0) throw new RangeError("repeat needs a count that is not negative");
  const total = units.length * count;
  // **上限交给 room** ✓（见 `StringRepeat` 那一段：不另设一个人为的上限 ✓）。
  if (!room(ObjectCharge + CodeUnitCharge * total)) throw new Error("out of room");
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    for (let j = 0; j < units.length; j++) out.push(units[j]);
  }
  return Value.FromString(table.CreateString(out));
}
if (id === StringPadStart || id === StringPadEnd) {
  // **两条边角照 JS 给**（见 `StringPadStart` 那一段）：
  // 目标长度不大于当前长度就**原样返回** ✓；**填充串是空串就不补** ✓。
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
  // **三个形态先挡掉** ✓：`args[0]` / `args[1]` 不是字符串就抛 ✓（正则实参、函数实参、
  // 以及 `$&` / `$1` 那一类模式都落在这里 ✓）。挡在前面而不是「当普通文本用」✗——
  // 静默把 `/a/g` 当字面量会**给出一个看起来对的错答案** ✗（`"a-a".replace(/a/g,"b")`
  // 在 JS 里是 `"b-b"`，当字面量就成了 `"a-a"`）✗。
  //
  // **`replaceAll` 与 `replace` 共用这一段**（第 150 轮）✓：两者只差
  // 「换一处还是换全部」✓——分成两份实现的话，空串那一格 / 找不到那一格
  // 就要各写一遍 ✓（而它们正是最容易走偏的两格 ✓）。
  const replaceEverywhere = id === StringReplaceAll;
  // **第 296 轮把另外两半接上了** ✓：
  //   · **替换值是函数** ✓（每一处匹配调它一次 ✓，实参 `(匹配文本, 位置, 整个串)` ✓）；
  //   · **替换文本里的记号** ✓（`$$` / `$&` / `` $` `` / `$'` ✓，见 `JsSubstitutionUnits` ✓）。
  // **正则那一半仍旧不做** ✗（`RegExp` 是 v1 写死的非目标 ✓）——它现在**响亮地抛** ✓，
  // 而且抛的是「需要字符串模式」而不是「需要两个字符串实参」✓（话说得更准了 ✓）。
  const replacementIsCallable = args.length > 1 && IsCallableValue(table, args[1]);
  if (args.length < 2 || args[0].Tag !== ValueTag.String
    || (args[1].Tag !== ValueTag.String && !replacementIsCallable)) {
    throw new Error("unimplemented: String.replace needs a string pattern and a string or function replacement "
      + "(regex patterns are not supported)");
  }
  const needle = JsTextUnits(table, args[0]);
  const replacement = args[1].Tag === ValueTag.String ? JsTextUnits(table, args[1]) : [];
  if (needle.length === 0 && replacementIsCallable) {
    // **空针 + 函数**那一格**没做** ✗（判据没有量它 ✓）：JS 会在**每一个**插入点上调一次回调 ✓
    // （`replaceAll` 是 `长度 + 1` 次 ✓、`replace` 是 1 次 ✓）——形状与下面那条循环不同 ✓，
    // 所以**响亮地抛** ✓，不当成「匹配到了空串」糊过去 ✗。
    throw new Error("unimplemented: String.replace with an empty pattern and a function replacement");
  }
  if (needle.length === 0) {
    // **空串那一格两种调用不一样** ✗（实测抓到的 ✓）：
    //   · `"ab".replace("", "-")` 给 `"-ab"` ✓（**只在最前面插一次** ✓）；
    //   · `"abc".replaceAll("", "-")` 给 `"-a-b-c-"` ✓（**每一格前面都插**，末尾也插 ✓
    //     ——一共 `长度 + 1` 处 ✓）。
    // 我第一版按「`replaceAll` 的空串也只插一次」写 ✓，判据当场给了 `"-abc"` ✗
    //（与 Node 的 `"-a-b-c-"` 一比就露 ✓）。**空串的「落点」是 `长度 + 1` 个** ✓：
    // 第 `i` 个落点在第 `i` 个码元**之前** ✓，最后一个在最末尾 ✓。
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
      // `replace` 那一格是「插在最前面」✓——所以要把刚才的顺序倒过来：
      // 先放替换文本、再放原串 ✓。
      const front: number[] = [];
      for (let m = 0; m < replacement.length; m++) front.push(replacement[m]);
      for (let k = 0; k < inserted.length; k++) front.push(inserted[k]);
      if (!room(ObjectCharge + CodeUnitCharge * front.length)) throw new Error("out of room");
      return Value.FromString(table.CreateString(front));
    }
    if (!room(ObjectCharge + CodeUnitCharge * inserted.length)) throw new Error("out of room");
    return Value.FromString(table.CreateString(inserted));
  }
  // **先扫出所有落点** ✓（`replaceAll` 要全部 ✓、`replace` 只要第一个 ✓）。
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
        // **接着从「这一处之后」扫** ✓（**不回头扫刚换上去的文本** ✗）：
        // `"aaa".replaceAll("a", "aa")` 在 JS 里是 `"aaaaaa"` ✓（三处 ✓），
        // 回头扫就会变成无限增长 ✗。
        scan = i + needle.length;
        same = true;
        break;
      }
    }
    if (!same) break;
    if (!replaceEverywhere) break;
  }
  // **找不到就原样返回** ✓（JS 的口径 ✓；返回的还是同一个字符串值 ✓）。
  if (hits.length === 0) return self;
  // **每一处要用什么替换文本**（第 296 轮 ✓）：两种来源 ✓、逐处算 ✓——
  // 所以长度是**逐处累加**出来的 ✗（原来是「每一处一样长」那个乘法 ✓：
  // 记号（`$'` 之类）与函数都会让每一处**不一样长** ✓）。
  const pieces: number[][] = [];
  for (let k = 0; k < hits.length; k++) {
    if (replacementIsCallable) {
      if (call === null) {
        throw new Error("String.replace needs a call channel (the host must pass one)");
      }
      const matched: number[] = [];
      for (let j = 0; j < needle.length; j++) matched.push(units[hits[k] + j]);
      // **实参是 `(匹配文本, 位置, 整个串)`** ✓（JS 的口径 ✓——没有捕获组时就是这三个 ✓）。
      const produced = call(args[1], Value.Undefined(),
        [Value.FromString(table.CreateString(matched)), Value.FromInt(hits[k]), self]);
      // **返回值按 `ToString` 折** ✓（JS 的口径 ✓：返回一个数就印那个数 ✓）。
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
  // **`"abc".toString()` / `"abc".valueOf()`**（第 304 轮 ✓）——两个都返回**接收者自己** ✓
  //（JS 的 `String.prototype.toString` / `valueOf` 就是恒等 ✓）。
  // **接收者那一关由上面那句 `RequireString` 把着** ✓：不是字符串就抛 ✓
  //（JS 在这里也抛 `TypeError` ✓——`String.prototype.toString.call(1)` 不是**静默**给 `1` ✓）。
  return self;
}
throw new Error("unimplemented: string builtin " + id);
```

# method JsSubstitutionUnits:(template:Array<int>, units:Array<int>, at:int, length:int)=>Array<int>

**替换文本里的记号**（第 296 轮 ✓）——`String.prototype.replace` 的第二格实参**不是纯文本** ✗：
它里面那几个 `$` 开头的记号会被换成与**匹配位置有关**的东西 ✓。

| 记号 | 换成 |
| --- | --- |
| `$$` | 一个 `$` ✓ |
| `$&` | **匹配到的那一段** ✓ |
| `` $` `` | 匹配**之前**的那一段 ✓ |
| `$'` | 匹配**之后**的那一段 ✓ |
| `$n` / `$nn` | **捕获组** ✓——而**字符串模式没有捕获组** ✗ ⇒ **原样留着** ✓ |

**`$1` 那一格为什么是「原样留着」而不是「换成空串」** ✗：JS 的规矩是
「**没有那个组就不动它**」✓（`"abc".replace("b", "$1")` 给 `"a$1c"` ✓）——
换成空串是**静默错值** ✓，而且错得很像对的 ✓（少了一个 `$1`，看不出是错的 ✗）。
**正则那一档要等 `RegExp`** ✓（口径外 ✓），所以这一格**今天永远不会**有捕获组 ✓。

**为什么单独一个方法** ✗：`replace` 与 `replaceAll` 共用它 ✓，而**逐处的顺序**是语义 ✓——
`$'` 取的是「这一处之后」✓、`` $` `` 取的是「这一处之前」✓，两处都跟着**当前这一处**走 ✓
（写成「整个串的前后」在 `replaceAll` 上会**每一处都一样** ✗ ⇒ 静默错值 ✓）。

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

**JS 的三条边角都照着给** ✓（它们正是最容易写错的地方 ✓）：

| 输入 | 结果 |
| --- | --- |
| `"a,b".split(",")` | `["a", "b"]` ✓ |
| `"a,b,".split(",")` | `["a", "b", ""]` ✓（**末尾空段不能丢** ✓） |
| `"".split(",")` | `[""]` ✓（没匹配上，整串就是唯一一段 ✓） |
| `"abc".split("")` | `["a", "b", "c"]` ✓（空分隔符 = 逐码元 ✓） |
| `"".split("")` | `[]` ✓（**不是 `[""]`** ✗——空分隔符那一支**不补尾段** ✓） |
| `"abc".split()` / `split(undefined)` | `["abc"]` ✓ |

**`limit` 参数**（第 208 轮 ✓）：JS 的第二个参数是「**最多几段**」✓——
到了上限**连尾巴那一段也不收** ✓（`"a-b-c".split("-", 2)` 是 `["a","b"]` ✓，不是 `["a","b-c"]` ✗）。
原来它**抛** ✗（那一抛是对的 ✓：顺手忽略会让 `split(",", 2)` 静默给错形状 ✗），
现在按 JS 给的语义做出来 ✓。

**先问一次 room 再分配** ✓：段的个数上界是「码元数 + 1」✓（空分隔符那一支正好等于码元数 ✓）。

```ts
// **与 `InvokeString` 那一处同一条口径** ✓（第 310 轮 ✓）：`String.split` 走的是
// 这一条独立的路 ✓（它要 `protos` 造数组 ✓），而包装对象的接收者照样要先脱箱 ✓
// ——`new String("a,b").split(",")` ✓。
self = UnwrapBox(table, self);
RequireString(table, self);
const units = JsTextUnits(table, self);
// **`limit` 那一格**（第 208 轮 ✓）：原来这里**抛** ✗（理由写得很对 ✓：忽略它会让
// `split(",", 2)` 静默给错形状 ✗）——这一轮把它做出来 ✓。
// **JS 的语义是「最多几段」** ✓：到了上限就**不再收**（连尾巴那一段也不收 ✓）——
// 所以「先全切出来、最后截断到 `limit` 段」与它**等价** ✓（简单分隔符、空分隔符、末尾空段三档都对 ✓）。
let limit = -1;
if (args.length > 1 && !args[1].IsUndefined()) {
  const asked = ArgOr(args, 1, 0);
  limit = asked < 0 ? 0 : asked;
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
  // **空分隔符：逐码元一段，且不补尾段**（`"".split("")` 是 `[]`）✓。
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
  // **到上限就停** ✓（尾巴那一段也不收 ✓——JS 在「还要再收一段」之前就问 `lim === 0` ✓）。
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
  // **第 208 轮补的四格** ✓（`at` / `codePointAt` / `concat` / `lastIndexOf` ✓）——
  // 号**追加在表尾** ✓、已有的一个都没动 ✓。
  "at", "codePointAt", "concat", "lastIndexOf", "localeCompare",
  // **第 275 轮补的两格** ✓（`trimStart` / `trimEnd` ✓）——号**照旧追加在表尾** ✓
  //（`124` / `125` ✓），已有的一个都没动 ✓。
  "trimStart", "trimEnd",
  // **第 291 轮补的一格** ✓（`substr` ✓）——号**照旧追加在表尾** ✓（`127` ✓）。
  "substr",
  // **第 304 轮补的两格** ✓（`toString` / `valueOf` ✓）——号**照旧追加在表尾** ✓
  //（`128` / `129` ✓），已有的一个都没动 ✓。**两格共用一个实现** ✓（见号那一段 ✓）。
  "toString", "valueOf",
  // **第 330 轮补的两格** ✓（`isWellFormed` / `toWellFormed` ✓，ES2024 ✓）——
  // 号**照旧追加在表尾** ✓（`130` / `131` ✓），已有的一个都没动 ✓。
  "isWellFormed", "toWellFormed",
  // **第 332 轮补的一格** ✓（`normalize` ✓）——号**照旧追加在表尾** ✓（`132` ✓）。
  "normalize"];
const ids: number[] = [StringCharAt, StringCharCodeAt, StringIndexOf, StringSlice, StringSplit,
  StringToUpperCase, StringToLowerCase, StringTrim, StringIncludes,
  StringStartsWith, StringEndsWith, StringSubstring, StringRepeat, StringPadStart, StringPadEnd,
  StringReplace, StringReplaceAll,
  StringAt, StringCodePointAt, StringConcatMethod, StringLastIndexOf, StringLocaleCompare,
  StringTrimStart, StringTrimEnd, StringSubstr,
  StringToString, StringValueOf,
  StringIsWellFormed, StringToWellFormed,
  StringNormalize];
for (let i = 0; i < entries.length; i++) {
  const key = Value.FromString(table.CreateString(Units(entries[i])));
  const target = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ids[i], 0));
  SetProperty(vm.Room(), NeverCall, table, proto, key, target);
}
```
