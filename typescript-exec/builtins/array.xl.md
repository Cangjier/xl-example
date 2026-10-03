# dependencies
```xl
import { Value, ValueTag } from "../../runtime/value.xl.md"
import { HeapTable, ObjectCharge, ValueCharge, CodeUnitCharge } from "../../runtime/heap.xl.md"
import { RoomChecker, TextUnitsOf, RtCmpEqStrict } from "../../runtime/rt.xl.md"
import { SetProperty, NativeCall, Protos } from "../../runtime/props.xl.md"
import { Vm } from "../../runtime/vm.xl.md"
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

# method InvokeArray:(room:RoomChecker, table:HeapTable, id:int, self:Value, args:Array<Value>)=>Value

**数组内建的分派与实现**。

`push` / `pop` 改的是**同一个数组对象**（`heap.xl.md` 的 `HeapArray`），
改完要 `Recount`——**计费账要跟着变**（回收器的阈值按它算）。

`slice` 造的新数组**继承源数组的原型**（`table.Get(source).Proto`）：不必认识
`Protos`，也不必把原型表传进来——**原型从哪来就从哪继承**。

```ts
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
    const units = TextUnitsOf(table, source.GetAt(i));
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
throw new Error("unimplemented: array builtin " + id);
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
const entries: string[] = ["push", "pop", "join", "indexOf", "slice"];
const ids: number[] = [ArrayPush, ArrayPop, ArrayJoin, ArrayIndexOf, ArraySlice];
for (let i = 0; i < entries.length; i++) {
  const key = Value.FromString(table.CreateString(Units(entries[i])));
  const target = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ids[i], 0));
  SetProperty(vm.Room(), NeverCall, table, proto, key, target);
}
```
