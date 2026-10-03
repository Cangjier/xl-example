# dependencies
```xl
import { Value, ValueTag } from "../../runtime/value.xl.md"
import { HeapTable, HeapArray, ObjectCharge, ValueCharge, CodeUnitCharge } from "../../runtime/heap.xl.md"
import {RoomChecker, TextUnitsOf, RtCmpEqStrict, RtToBoolean } from "../../runtime/rt.xl.md"
import { SetProperty, NativeCall, Protos } from "../../runtime/props.xl.md"
import { Vm } from "../../runtime/vm.xl.md"
import { ValueUnits, ValueUnitsAt } from "./text.xl.md"
```

# namespace cangjie

**标准库的第一块：`Array` 的原型方法**（`push` / `pop` / `join` / `indexOf` / `slice`）。

**它们写成宿主函数**（`HostRef`），由这一层装到 `Protos.Array` 上——**引擎一行都不用改**：

- 引擎只需要「宿主函数也能被 `call` 调用」这一件事（`vm.xl.md` 的 `DoCallValue`
  那条宿主分支 ✓），它**不知道** `push` 是什么；
- 方法**怎么找**也是引擎现成的能力：`GetProperty` 沿原型链走（`props.xl.md`）——
  `arr.push` 之所以找得到，就是因为 `arr` 的 `Proto` 指向 `Protos.Array` ✓
  （数组在**造的时候就带了原型**：`NewPlainArray` ✓）。

**为什么内建必须收 `room`**：它们要分配（`push` 长一格、`join` 造字符串）。
宿主函数绕过资源预算就等于把「资源上限」这一层安全要求挖了个洞——
所以调用通道把 `room` 一并交出来，**每次分配前都要问**。

**计费口径如实说明**：`push` 按「每格一个值」问 room（`ValueCharge * 个数`），
这是**规范选的口径**，不是对底层数组增长的精确建模——`heap.xl.md` 里那种
「按计费字节、跨目标一致」的口径在这里继续沿用。

**这一轮只做数组**：字符串方法要引擎先把「原始值接收者怎么走到原型」补上
（`Protos` 里还没有 `String`），那是下一块。

# const ArrayPush:int = 1

`Array.prototype.push` 的能力号（`HostRef.CapabilityId`）。

**为什么用能力号分派**：一个 `HostRef` 自己就带着「是哪一个」（`heap.xl.md` 的
`HeapHostRef.CapabilityId`）。于是**一个宿主函数可以服务全部内建**——
不必为每个方法注册一次调用通道，也不必让引擎认识它们。

# const ArrayPop:int = 2

# const ArrayJoin:int = 3

# const ArrayIndexOf:int = 4

# const ArraySlice:int = 5
# const ArrayForEach:int = 6
`forEach(回调)` 的号——**回调脚本**（第 117 轮，与 `Map/Set.forEach` 同一条路 ✓）。
# const ArrayMap:int = 7
`map(回调)` 的号——`map` 能成立是因为 `NativeCall` **有返回值** ✓。
# const ArrayFilter:int = 8
`filter(回调)` 的号——按回调的**真假**收原值 ✓（用 `Value.AsBool()` ✓，那就是本仓的真假口径 ✓）。
# const ArrayFind:int = 9
`find(回调)` 的号——第一个让回调为真的**原值**；没有就给 `undefined` ✓（与 JS 一致 ✓）。
# const ArraySome:int = 10
`some(回调)` 的号——有一个为真就是真；**空数组给假** ✓（与 JS 一致 ✓）。
# const ArrayEvery:int = 11
`every(回调)` 的号——全都为真才是真；**空数组给真** ✓（与 JS 一致 ✓，这一条最容易写反 ✗）。
# const ArrayConcat:int = 12
`concat(…items)` 的号（第 123 轮）——**只摊平一层** ✓（`[[1]].concat([[2]])` 给 `[[1],[2]]` ✓），
非数组实参**原样接在后面** ✓。
# const ArrayReverse:int = 13
`reverse()` 的号——**原地改**并返回**同一个数组** ✓（JS 就是改自己 ✗ 不是给新数组 ✓）。
# const ArrayIncludes:int = 14
`includes(值)` 的号——返回**真假** ✓；洞按 `undefined` 算 ✓（JS 也这样 ✓）。
# const ArrayIsArray:int = 15
**`Array.isArray(x)`** 的号（第 123 轮）——**静态方法** ✓：调用时 `self` 是那个 `Array`
**普通对象**（不是数组 ✗），所以它必须排在 `RequireArray` **前面** ✓。

**`reduce` 不做** ✗：JS 的 `(累计, 值, 下标, 数组)` 要**两个以上实参** ✗，
而 `NativeCall` **只带一个** ✓（与 `Map.forEach` 不传 `key`/`map` 是同一条限制 ✓）。
拿一个数组把两个值打包过去是**另一种语义** ✗——宁可**不做**，也不静默换形状 ✓。
`filter(回调)` 的号——按回调的**真假**收原值 ✓（用 `Value.AsBool()` ✓，那就是本仓的真假口径 ✓）。

# method Units:(text:string)=>Array<int>

宿主字符串 → 码元。

**这一步用宿主字符 API 是应该的**：它读的是宿主写死的字面量（方法名、分隔符）。
与降级层同一条理由：「引擎侧不许用宿主库」管的是 `runtime/`。

```ts
const units: number[] = [];
for (let i = 0; i < text.length; i++) {
  units.push(text.charCodeAt(i));
}
return units;
```

# method RequireArray:(table:HeapTable, self:Value)=>void

`self` 必须是个数组；不是就抛。

**不给「近似值」**：`push` 落到非数组上时，静默忽略比报错危险得多——
调用方会以为它成功了。

```ts
if (self.Tag !== ValueTag.Array) {
  throw new Error("this method needs an array receiver");
}
```

# method ArgOr:(args:Array<Value>, index:int, fallback:int)=>int

取第 `index` 个实参当整数；**没有就给 `fallback`**（`slice` 的两个参数都可省）。

```ts
if (index >= args.length) return fallback;
if (!args[index].IsNumber()) return fallback;
return args[index].AsInt();
```

# method InvokeArray:(room:RoomChecker, table:HeapTable, call:NativeCall | null, id:int, self:Value, args:Array<Value>)=>Value

**数组内建的分派与实现**。

`push` / `pop` 改的是**同一个数组对象**（`heap.xl.md` 的 `HeapArray`），
改完要 `Recount`——**计费账要跟着变**（回收器的阈值按它算）。

`slice` 造的新数组**继承源数组的原型**（`table.Get(source).Proto`）：不必认识
`Protos`，也不必把原型表传进来——**原型从哪来就从哪继承**。

```ts
// **静态方法排在 `RequireArray` 前面**（第 123 轮）：`Array.isArray(x)` 的 `self`
// 是那个 `Array` **普通对象** ✓，过一遍 `RequireArray` 会当场抛 ✗。
if (id === ArrayIsArray) {
  const target = args.length > 0 ? args[0] : Value.Undefined();
  return Value.FromBool(target.Tag === ValueTag.Array);
}
RequireArray(table, self);
const source = table.Get(self.Ref).AsArray();
if (id === ArrayPush) {
  if (!room(ValueCharge * args.length)) throw new Error("out of room");
  for (let i = 0; i < args.length; i++) {
    source.Push(args[i]);
  }
  table.Recount(self.Ref);
  return Value.FromInt(source.GetLength());
}
if (id === ArrayPop) {
  const length = source.GetLength();
  if (length === 0) return Value.Undefined();
  const last = source.GetAt(length - 1);
  source.Truncate(length - 1);
  table.Recount(self.Ref);
  return last;
}
if (id === ArrayJoin) {
  const separator = args.length > 0 && args[0].Tag === ValueTag.String
    ? TextUnitsOf(table, args[0])
    : Units(",");
  const parts: number[][] = [];
  let total = separator.length * (source.GetLength() > 0 ? source.GetLength() - 1 : 0);
  for (let i = 0; i < source.GetLength(); i++) {
    // **元素走「任意值 → 文本」**（第 124 轮）：`[obj, [1, 2]].join('|')` 在 JS 里是
    // `"[object Object]|1,2"` ✓——用引擎的 `TextUnitsOf` 会在对象上**抛** ✗（那是它的口径 ✓）。
    // **空格（洞 / `null` / `undefined`）渲染成空串** ✓——那条规矩在 `ValueUnitsAt` 里
    // 只有一处 ✓（顶层与嵌套共用 ✓；判据现场：`[1, , 3].join('-')` 该给 `"1--3"` ✓）。
    const units = ValueUnitsAt(table, source, i, 0);
    parts.push(units);
    total = total + units.length;
  }
  if (!room(CodeUnitCharge * total + ObjectCharge)) throw new Error("out of room");
  const joined: number[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (i > 0) {
      for (let j = 0; j < separator.length; j++) joined.push(separator[j]);
    }
    for (let j = 0; j < parts[i].length; j++) joined.push(parts[i][j]);
  }
  return Value.FromString(table.CreateString(joined));
}
if (id === ArrayIndexOf) {
  const needle = args.length > 0 ? args[0] : Value.Undefined();
  for (let i = 0; i < source.GetLength(); i++) {
    if (RtCmpEqStrict(table, source.GetAt(i), needle).AsBool()) return Value.FromInt(i);
  }
  return Value.FromInt(-1);
}
if (id === ArraySlice) {
  const length = source.GetLength();
  let start = ArgOr(args, 0, 0);
  let end = ArgOr(args, 1, length);
  if (start < 0) start = 0;
  if (end > length) end = length;
  if (end < start) end = start;
  const count = end - start;
  if (!room(ObjectCharge + ValueCharge * count)) throw new Error("out of room");
  const handle = table.CreateArray();
  table.Get(handle).Proto = table.Get(self.Ref).Proto;
  const slice = table.Get(handle).AsArray();
  for (let i = start; i < end; i++) {
    slice.Push(source.GetAt(i));
  }
  return Value.FromArray(handle);
}
if (id === ArrayConcat) {
  // **只摊平一层** ✓：实参是数组就把**格子**接过来，不是数组就**原样接一个** ✓。
  // **洞要跟着走** ✗：`[1,,2].concat([3])` 在 JS 里第二个位置**还是洞** ✓——
  // 把洞 `Push` 成一个显式的 `undefined` 会让 `1 in result` 从假变真 ✗（形状变了）。
  let extra = 0;
  for (let i = 0; i < args.length; i++) {
    extra = extra + (args[i].Tag === ValueTag.Array ? table.Get(args[i].Ref).AsArray().GetLength() : 1);
  }
  if (!room(ObjectCharge + ValueCharge * (source.GetLength() + extra))) {
    throw new Error("out of room");
  }
  const handle = table.CreateArray();
  table.Get(handle).Proto = table.Get(self.Ref).Proto;
  const created = table.Get(handle).AsArray();
  for (let i = 0; i < source.GetLength(); i++) {
    AppendSlot(created, source, i);
  }
  for (let i = 0; i < args.length; i++) {
    if (args[i].Tag !== ValueTag.Array) {
      created.Push(args[i]);
      continue;
    }
    const part = table.Get(args[i].Ref).AsArray();
    for (let j = 0; j < part.GetLength(); j++) {
      AppendSlot(created, part, j);
    }
  }
  return Value.FromArray(handle);
}
if (id === ArrayReverse) {
  // **原地改、返回同一个数组** ✓（JS 就是这样 ✗ 不是给新数组 ✓）。
  // **洞按位置跟着换** ✓：读的时候 `IsHole` 先看一眼 ✓，
  // 写回去时洞走 `SetHole` ✓（写成 `undefined` 会把洞变成真值 ✗）。
  const length = source.GetLength();
  const half = Math.floor(length / 2);
  for (let i = 0; i < half; i++) {
    const j = length - 1 - i;
    const leftHole = source.IsHole(i);
    const rightHole = source.IsHole(j);
    const left = source.GetAt(i);
    const right = source.GetAt(j);
    if (rightHole) source.SetHole(i); else source.SetAt(i, right);
    if (leftHole) source.SetHole(j); else source.SetAt(j, left);
  }
  return self;
}
if (id === ArrayIncludes) {
  // **它是 `indexOf` 的布尔版** ✓：同一趟严格相等 ✓。
  // **与 JS 的那一处差别写在明处** ✗：JS 的 `includes` 用 SameValueZero（`NaN` 找得到 ✓），
  // 而这里用严格相等（`NaN` 找不到 ✗）——`NaN` 今天在这一层**到不了这里** ✓
  // （没有 `NaN` 字面量，`0/0` 那种也落在浮点上 ✗），所以这条差别暂时碰不到 ✓。
  const needle = args.length > 0 ? args[0] : Value.Undefined();
  for (let i = 0; i < source.GetLength(); i++) {
    if (RtCmpEqStrict(table, source.GetAt(i), needle).AsBool()) return Value.FromBool(true);
  }
  return Value.FromBool(false);
}
if (id === ArrayForEach || id === ArrayMap || id === ArrayFilter) {
  // **回调脚本**（第 117 轮，与 `Map/Set.forEach` 同一条路 ✓）：`call` 会重入分派循环 ✓，
  // 所以这里能跑脚本闭包；`map` 还能**收返回值**（`NativeCall` 有返回值 ✓）。
  // `call` 也要判空：宿主没接通道时必须**响亮**说清 ✗（而不是「调用了非闭包」）。
  if (args.length < 1 || !args[0].IsCallable() || call === null) {
    throw new Error("this array method needs a function and a call channel (the host must pass one)");
  }
  // **快照一次长度**：回调里可以改这个数组 ✓（JS 也允许），改了的下一轮才见 ✓。
  const eachTotal = source.GetLength();
  let collected = -1;
  if (id !== ArrayForEach) {
    if (!room(ObjectCharge)) throw new Error("out of room");
    collected = table.CreateArray();
    table.Get(collected).Proto = table.Get(self.Ref).Proto;
  }
  for (let i = 0; i < eachTotal; i++) {
    const item = source.GetAt(i);
    const answered = call(args[0], Value.Undefined(), item, true);
    if (id === ArrayForEach) continue;
    if (id === ArrayMap) {
      // **`map` 收返回值** ✓（与 JS 一致）。
      table.Get(collected).AsArray().Push(answered);
      continue;
    }
    // **`filter` 按回调的真假收原值** ✓——用 `Value.AsBool()`（它就是本仓的真假口径 ✓；
    // 不是只看布尔标签 ✗：回调返回 `1` 或 `"x"` 在 JS 里都算真 ✓。
    if (answered.AsBool()) table.Get(collected).AsArray().Push(item);
  }
  return id === ArrayForEach ? Value.Undefined() : Value.FromArray(collected);
}
if (id === ArrayFind || id === ArraySome || id === ArrayEvery) {
  // **谓词族**（第 118 轮）：与 `forEach`/`map`/`filter` 同一条回调通道 ✓，但**结果不同**：
  // `find` 给原值（没有给 `undefined`）✓、`some` 有一个为真即真 ✓、`every` 全真才真 ✓。
  // **空数组**：`some` 给**假**、`every` 给**真** ✓（JS 的口径 ✓；`every` 这一条最容易写反 ✗）。
  if (args.length < 1 || !args[0].IsCallable() || call === null) {
    throw new Error("this array method needs a function and a call channel (the host must pass one)");
  }
  const predicateTotal = source.GetLength();
  for (let i = 0; i < predicateTotal; i++) {
    const item = source.GetAt(i);
    const answered = call(args[0], Value.Undefined(), item, true).AsBool();
    if (id === ArrayFind) {
      if (answered) return item;
      continue;
    }
    if (id === ArraySome && answered) return Value.FromBool(true);
    if (id === ArrayEvery && !answered) return Value.FromBool(false);
  }
  if (id === ArrayFind) return Value.Undefined();
  // 走到这里：`some` 一个都没中（假）、`every` 一个都没反（真）——**空数组也落在这一支** ✓。
  return Value.FromBool(id === ArrayEvery);
}
throw new Error("unimplemented: array builtin " + id);
```

# method AppendSlot:(target:HeapArray, source:HeapArray, index:int)=>void

**把 `source[index]` 接到 `target` 尾部**——**洞也照样接过去** ✓（第 123 轮）。

**为什么必须先 `Push` 再 `SetHole`**：`SetHole` 只处理**已有的**下标 ✓（越界它直接返回 ✓），
所以「长一格」这一步只能由 `Push` 做 ✓——`heap.xl.md` 里那两半合起来才是这一步 ✓。
**不能写成 `Push(source.GetAt(index))`** ✗：洞会被接成一个**显式的 `undefined`** ✓，
于是 `1 in result` 从假变真 ✗（形状变了，判据量不出来、用户量得出来 ✗）。

```ts
if (source.IsHole(index)) {
  target.Push(Value.Undefined());
  target.SetHole(target.GetLength() - 1);
  return;
}
target.Push(source.GetAt(index));
```

# method NeverCall:(callee:Value, self:Value, argument:Value, hasArgument:bool)=>Value

装上内建时用的调用通道桩：**它一次都不该被调到**（装属性不会触发访问器）。

**留着它是为了让「装」与「读」走同一套规则**（`SetProperty` 本身要一个通道），
而万一真被调到，**报出来比静默好**。

```ts
throw new Error("unreachable: installing a builtin never calls a function");
```

# method InstallArray:(vm:Vm, protos:Protos)=>void

**把数组内建装到 `Protos.Array` 上**。

由宿主在装载之后显式调用：`runtime/` 不认识 `typescript-exec/`（依赖方向不能倒），
所以「装库」这一步只能由**知道两边的那一层**（宿主 / 驱动）来做。

```ts
const table = vm.Table;
const proto = Value.FromObject(protos.Array);
const entries: string[] = ["push", "pop", "join", "indexOf", "slice", "forEach", "map", "filter",
  "find", "some", "every", "concat", "reverse", "includes"];
const ids: number[] = [ArrayPush, ArrayPop, ArrayJoin, ArrayIndexOf, ArraySlice, ArrayForEach,
  ArrayMap, ArrayFilter, ArrayFind, ArraySome, ArrayEvery, ArrayConcat, ArrayReverse, ArrayIncludes];
for (let i = 0; i < entries.length; i++) {
  const key = Value.FromString(table.CreateString(Units(entries[i])));
  const target = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ids[i], 0));
  SetProperty(vm.Room(), NeverCall, table, proto, key, target);
}
```
