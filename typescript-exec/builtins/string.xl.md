# dependencies
```xl
import { Value, ValueTag } from "../../runtime/value.xl.md"
import { HeapTable, ObjectCharge, CodeUnitCharge, ValueCharge } from "../../runtime/heap.xl.md"
import { RoomChecker, TextUnitsOf } from "../../runtime/rt.xl.md"
import { SetProperty, NativeCall, Protos, NewPlainArray } from "../../runtime/props.xl.md"
import { Vm } from "../../runtime/vm.xl.md"
import { Units, NeverCall, ArgOr } from "./array.xl.md"
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

**非整数先向下取整** ✓（JS 是 `ToIntegerOrInfinity` ✓）；**负数抛** ✓。
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

# method RequireString:(table:HeapTable, self:Value)=>void

`self` 必须是字符串；不是就抛。

**原始值接收者这条路上，`self` 是原样的字符串**（没有包装对象）——
「装箱」这件事没有发生，引擎只是**借它的原型**去找方法。

```ts
if (self.Tag !== ValueTag.String) {
  throw new Error("this method needs a string receiver");
}
```

# method InvokeString:(room:RoomChecker, table:HeapTable, id:int, self:Value, args:Array<Value>)=>Value

**字符串内建的分派与实现**。

每个返回新字符串的地方都**先问 room**（`charAt` 也要：空串照样占一个对象头）。

**`charCodeAt` 越界给 `undefined`**（JS 给 `NaN` ✗）：`NaN` 要浮点那一套
（`value.xl.md` 里 `Float64` 有了，但「NaN 怎么表示、怎么显示」是另一件事），
所以这一轮**给 `undefined` 并写在这里**——不假装它是 `NaN`。

**负下标不按 JS 的「从末尾数」**：`slice(-2)` 在 JS 里是最后两个字符，
这里**夹到 0**。这是**已知的语义差**，写在文首那张表里（做法与理由同 `??`/`?.` 那些）。

```ts
RequireString(table, self);
const units = TextUnitsOf(table, self);
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
  const at = ArgOr(args, 0, 0);
  if (at < 0 || at >= units.length) return Value.Undefined();
  return Value.FromInt(units[at]);
}
if (id === StringIndexOf) {
  const needle = args.length > 0 ? TextUnitsOf(table, args[0]) : [];
  if (needle.length === 0) return Value.FromInt(0);
  for (let i = 0; i + needle.length <= units.length; i++) {
    let same = true;
    for (let j = 0; j < needle.length; j++) {
      if (units[i + j] !== needle[j]) same = false;
    }
    if (same) return Value.FromInt(i);
  }
  return Value.FromInt(-1);
}
if (id === StringSlice) {
  const length = units.length;
  let start = ArgOr(args, 0, 0);
  let end = ArgOr(args, 1, length);
  if (start < 0) start = 0;
  if (end > length) end = length;
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
  const needle = args.length > 0 ? TextUnitsOf(table, args[0]) : [];
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
if (id === StringTrim) {
  // **只做 ASCII 空白**（9 / 10 / 11 / 12 / 13 / 32）✓，理由与大小写那一条一模一样 ✓：
  // 扫到**边缘**是 > 127 的码元时**抛** ✓——它可能就是 JS 要裁掉的
  // `U+00A0` / `U+2028` 那一类空白，而这一层认不出来 ✗。
  const blank = (unit: number): boolean => {
    return unit === 32 || unit === 9 || unit === 10 || unit === 11 || unit === 12 || unit === 13;
  };
  let start = 0;
  let end = units.length;
  while (start < end && blank(units[start])) start++;
  while (end > start && blank(units[end - 1])) end--;
  if (start < end && (units[start] > 127 || units[end - 1] > 127)) {
    throw new Error("unimplemented: trim with a non-ASCII edge (that character may be trimmable in JS)");
  }
  const cut: number[] = [];
  for (let i = start; i < end; i++) cut.push(units[i]);
  if (!room(ObjectCharge + CodeUnitCharge * cut.length)) throw new Error("out of room");
  return Value.FromString(table.CreateString(cut));
}
if (id === StringStartsWith || id === StringEndsWith) {
  // **两个都收可选的第二个参数**（第 123 轮）✓——但它们的含义**不一样** ✗：
  // `startsWith` 的那个是**起点** ✓，`endsWith` 的那个是**结束位置** ✓（JS 就是这么定的 ✓）。
  const needle = args.length > 0 ? TextUnitsOf(table, args[0]) : [];
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
if (id === StringRepeat) {
  // **先向下取整；负数抛** ✓（JS 的 `ToIntegerOrInfinity` + RangeError ✓）。
  const raw = args.length > 0 ? ArgOr(args, 0, 0) : 0;
  const count = raw < 0 ? -1 : raw;
  if (count < 0) throw new Error("repeat needs a count that is not negative");
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
    ? TextUnitsOf(table, args[1])
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
throw new Error("unimplemented: string builtin " + id);
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

**`limit` 参数这一轮抛** ✗：JS 的第二个参数是「最多几段」，语义不是「少切几刀」
（最后一段要装下剩下的全部 ✓）——顺手忽略它会让 `split(",", 2)` 静默给错形状 ✗。

**先问一次 room 再分配** ✓：段的个数上界是「码元数 + 1」✓（空分隔符那一支正好等于码元数 ✓）。

```ts
RequireString(table, self);
const units = TextUnitsOf(table, self);
if (args.length > 1) {
  throw new Error("unimplemented: split with a limit");
}
const out = NewPlainArray(room, table, protos);
const result = table.Get(out.Ref).AsArray();
if (args.length === 0 || args[0].IsUndefined()) {
  result.Push(self);
  return out;
}
const separator = TextUnitsOf(table, args[0]);
if (!room(ObjectCharge + ValueCharge * (units.length + 1)
  + CodeUnitCharge * (units.length + 1))) {
  throw new Error("out of room");
}
if (separator.length === 0) {
  // **空分隔符：逐码元一段，且不补尾段**（`"".split("")` 是 `[]`）✓。
  for (let i = 0; i < units.length; i++) {
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
  const part: number[] = [];
  for (let k = start; k < i; k++) part.push(units[k]);
  result.Push(Value.FromString(table.CreateString(part)));
  i = i + separator.length - 1;
  start = i + 1;
}
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
  "startsWith", "endsWith", "substring", "repeat", "padStart", "padEnd"];
const ids: number[] = [StringCharAt, StringCharCodeAt, StringIndexOf, StringSlice, StringSplit,
  StringToUpperCase, StringToLowerCase, StringTrim, StringIncludes,
  StringStartsWith, StringEndsWith, StringSubstring, StringRepeat, StringPadStart, StringPadEnd];
for (let i = 0; i < entries.length; i++) {
  const key = Value.FromString(table.CreateString(Units(entries[i])));
  const target = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ids[i], 0));
  SetProperty(vm.Room(), NeverCall, table, proto, key, target);
}
```
