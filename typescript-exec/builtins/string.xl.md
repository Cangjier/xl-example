# dependencies
```xl
import { Value, ValueTag } from "../../runtime/value.xl.md"
import { HeapTable, ObjectCharge, CodeUnitCharge } from "../../runtime/heap.xl.md"
import { RoomChecker, TextUnitsOf } from "../../runtime/rt.xl.md"
import { SetProperty, NativeCall, Protos } from "../../runtime/props.xl.md"
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

**这一轮不做**：大小写转换（要一张大小写映射表 ✗）、正则、`padStart` 那一类。

# const StringCharAt:int = 101

`String.prototype.charAt` 的能力号。

# const StringCharCodeAt:int = 102

# const StringIndexOf:int = 103

# const StringSlice:int = 104

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
throw new Error("unimplemented: string builtin " + id);
```

# method InstallString:(vm:Vm, protos:Protos)=>void

把字符串内建装到 `Protos.String` 上。

```ts
const table = vm.Table;
const proto = Value.FromObject(protos.String);
const entries: string[] = ["charAt", "charCodeAt", "indexOf", "slice"];
const ids: number[] = [StringCharAt, StringCharCodeAt, StringIndexOf, StringSlice];
for (let i = 0; i < entries.length; i++) {
  const key = Value.FromString(table.CreateString(Units(entries[i])));
  const target = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ids[i], 0));
  SetProperty(vm.Room(), NeverCall, table, proto, key, target);
}
```
