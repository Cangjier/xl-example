# dependencies
```xl
import { Value, ValueTag } from "../../runtime/value.xl.md"
import { HeapTable, HeapArray, ObjectCharge, ValueCharge, CodeUnitCharge } from "../../runtime/heap.xl.md"
import {RoomChecker, TextUnitsOf, RtCmpEqStrict, RtToBoolean, IsCallableValue, ToInt32Of } from "../../runtime/rt.xl.md"
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
`filter(回调)` 的号——按回调的**真假**收原值 ✓（走 `RtToBoolean` ✓，**那就是本仓唯一的真假口径** ✓；
**别写成 `Value.AsBool()`** ✗——那一个把 `""` 判成真 ✗，见第 144 轮 ✓）。
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
（**第 130 轮把这条限制量清楚了** ✓：`reduce` 与 `sort` 都卡在它上面 ✓，
而 `findIndex` 只要一个实参 ✓，所以它做得出来 ✓。扩展 `NativeCall` 是一条**引擎级**的改动 ✓，
它牵动全部调用点 ✓，单独立一轮 ✓。）
# const ArrayFindIndex:int = 16
**`findIndex(回调)`** 的号（第 130 轮）——第一个让回调为真的**下标** ✓；
一个都没有给 `-1` ✓（与 `find` 同一条通道 ✓，只是交出去的是下标 ✓）。
# const ArraySort:int = 18

**`sort(比较器)`**（第 142 轮）——**排序是原地**的 ✓（JS 的 `sort` 改的是那个数组本身 ✓，
返回的也是它 ✓），所以它 `Recount` 之后把 `self` 还回去 ✓。

**没有比较器时按「转成字符串再比」** ✓（JS 的口径 ✓）：`[10, 9].sort()` 给 `[10, 9]` ✓
（`"10" < "9"` ✓），而 `[10, 9].sort((a, b) => a - b)` 给 `[9, 10]` ✓——
**这一条最容易想当然** ✗（按数值排看起来「更对」，但不是 JS ✓）。

**算法**：插入排序 ✓——数组在这一层是小东西 ✓，而**稳定性**要照 JS 办 ✓
（`Array.prototype.sort` 在 ES2019 起保证稳定 ✓）：插入排序天然稳定 ✓，
快排要额外下功夫 ✗。比较器返回**负数 / 零 / 正数**三种意思 ✓（零表示相等、保持原顺序 ✓）。

**回调要两个实参** ✓——这正是第 142 轮把 `NativeCall` 的实参表开宽的原因之一 ✓
（原来只带一个 ✗，`sort` 根本无从下手 ✓）。
# const ArrayReduce:int = 19

**`reduce(回调, 初值?)`**（第 142 轮）——把数组折成一个值 ✓。**两处最容易写错的地方** ✗：

1. **没给初值时，第一项就是初值** ✓（而且**从第二项开始**跑回调 ✓）——
   空数组且没给初值在 JS 里是 `TypeError` ✓，这里**响亮地抛** ✓；
2. **回调收 `(累计, 当前值)`** ✓（JS 还给下标与数组 ✓，本仓给前两个 ✓——
   `NativeCall` 的实参表现在开宽了 ✓，要不要补后两个是**另一轮**的事 ✓）。

**洞要跳过** ✓（JS 的 `reduce` 只走**存在**的下标 ✓）——`[, 1].reduce((a, b) => a + b)` 给 `1` ✓
（下标 0 是洞 ✓）。这与 `map`/`filter` 那两条不同 ✗（它们**照走洞**、给 `undefined` ✓），
**照 JS 的口径** ✓。

# const ArrayShift:int = 20

**`shift()`**（第 142 轮）——去掉并返回**第一格** ✓（空数组给 `undefined` ✓），
长度减一 ✓、后面所有格**整体左移** ✓。**第一格是洞时照样返回 `undefined`** ✓
（`heap.xl.md` 的 `GetAt` 对洞就是给 `undefined` ✓），而挪动要**把洞一起挪** ✓
（与 `sort` 那一支同一条纪律 ✓：`SetAt` 会清掉洞标记 ✓，所以要**再标回去** ✓）。

# const ArrayFill:int = 21

# const ArrayAt:int = 24

**`at(i)`**（第 150 轮）——与下标读只差**负下标从尾巴数** ✓。

**号为什么是 24 而不是 22** ✗（实测踩到的 ✓）：`ArrayFlat` **本来就是 22** ✓——
第一版我给 `at` 编了 22 ✓，于是**两个常量同一个号** ✗，
而 `ids` 那一列按 `entries` 的顺序排 ✓，`flat` 于是被**解到 `at` 那一支**上 ✓
（`at` 的缺省实参让它返回 `undefined` ✓ → 症状是 `.flat()` **给 undefined** ✗，
报出来是「读 undefined 的属性」✓——**离现场很远** ✗）。
**号是跨目标的契约** ✓：只追加、**不改已有的** ✓（所以是 `at`/`splice` 让位 ✓）。

# const ArraySplice:int = 25

**`splice(起点, 删几个, …插进去的)`**（第 150 轮）——就地改、返回删掉的那些 ✓。

**`fill(值)`**（第 142 轮）——把整段填成同一个值 ✓、返回**自己** ✓（JS 返回的就是它 ✓）。
**只做 `fill(值)` 这一档** ✗：`fill(值, 起, 止)` 的三实参形态要处理负数下标与越界规整 ✓，
是**另一轮**的事 ✓——**它今天不是静默忽略** ✓，多给的实参会走到这里被**丢掉** ✗，
所以这一条**写在明处** ✓（下一个做它的人从这里接着走 ✓）。

# const ArrayFlat:int = 22

**`flat()`**（第 142 轮）——摊平**一层** ✓（`[[1],[2]].flat()` 给 `[1,2]` ✓）。
**只做一层** ✗：`flat(深度)` 要递归 ✓，与 `fill` 那三实参形态是同一类「先做最常用的那一档」✓。
**元素里的洞跳过** ✓（JS 的 `flat` 会跳过洞 ✓）；**不是数组的元素照收** ✓
（`[1, [2]].flat()` 给 `[1, 2]` ✓——**只有数组才摊** ✓，字符串不摊 ✗）。
# const ArrayFrom:int = 17
**`Array.from(可迭代物)`** 的号（第 130 轮）——**静态方法** ✓，而且它要**原型表**
（返回的是新数组 ✓），所以它**不在 `InvokeArray` 里分派** ✓，走 `install.xl.md` 那条
（与 `String.split` 同一处、同一个理由 ✓）。

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
  // **回调要「能被调」** ✓——判据走 `IsCallableValue` ✓（第 145 轮）：
  // `value.IsCallable()` **看不到可调用对象** ✗，于是 `xs.map(String)` 会被拒 ✗
  //（而 `String` 明明可以调 ✓：它是一个对象 + 一格载荷 ✓）。
  if (args.length < 1 || !IsCallableValue(table, args[0]) || call === null) {
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
    const answered = call(args[0], Value.Undefined(), [item, Value.FromInt(i)]);
    if (id === ArrayForEach) continue;
    if (id === ArrayMap) {
      // **`map` 收返回值** ✓（与 JS 一致）。
      table.Get(collected).AsArray().Push(answered);
      continue;
    }
    // **`filter` 按回调的真假收原值** ✓——走 `RtToBoolean`（`rt.xl.md` 的 `TruthyOf` ✓，
    // 本仓唯一的真假口径 ✓）。**不能写 `answered.AsBool()`** ✗（第 144 轮）：
    // `AsBool` 看不到码元长度 ✓，于是 `["", "a"].filter(s => s)` 会把**空串也收下** ✓
    //（JS 只收 `"a"` ✓）——**静默错值** ✗，与 `if (s)` 那条是同一个根因 ✓。
    if (RtToBoolean(table, answered).AsBool()) table.Get(collected).AsArray().Push(item);
  }
  return id === ArrayForEach ? Value.Undefined() : Value.FromArray(collected);
}
if (id === ArrayFind || id === ArraySome || id === ArrayEvery || id === ArrayFindIndex) {
  // **谓词族**（第 118 轮；`findIndex` 第 130 轮加入 ✓）：与 `forEach`/`map`/`filter` 同一条回调通道 ✓，
  // 但**结果不同**：`find` 给原值（没有给 `undefined`）✓、`some` 有一个为真即真 ✓、
  // `every` 全真才真 ✓、`findIndex` 给**下标**（没有给 `-1` ✓）。
  // **空数组**：`some` 给**假**、`every` 给**真** ✓（JS 的口径 ✓；`every` 这一条最容易写反 ✗）。
  // **真假也走 `RtToBoolean`** ✓（第 144 轮，与 `filter` 同一条 ✓）：
  // `[""].some(s => s)` 是**假** ✓、`[""].find(s => s)` 是 `undefined` ✓——写 `AsBool()` 就会反过来 ✗。
  if (args.length < 1 || !IsCallableValue(table, args[0]) || call === null) {
    throw new Error("this array method needs a function and a call channel (the host must pass one)");
  }
  const predicateTotal = source.GetLength();
  for (let i = 0; i < predicateTotal; i++) {
    const item = source.GetAt(i);
    const answered = RtToBoolean(table, call(args[0], Value.Undefined(), [item, Value.FromInt(i)])).AsBool();
    if (id === ArrayFind) {
      if (answered) return item;
      continue;
    }
    if (id === ArrayFindIndex) {
      if (answered) return Value.FromInt(i);
      continue;
    }
    if (id === ArraySome && answered) return Value.FromBool(true);
    if (id === ArrayEvery && !answered) return Value.FromBool(false);
  }
  if (id === ArrayFind) return Value.Undefined();
  if (id === ArrayFindIndex) return Value.FromInt(-1);
  // 走到这里：`some` 一个都没中（假）、`every` 一个都没反（真）——**空数组也落在这一支** ✓。
  return Value.FromBool(id === ArrayEvery);
}
if (id === ArraySort) {
  // **比较器可选** ✓（不给就按「转成字符串再比」✓，见 `ArraySort` 那一段 ✓）。
  // **「可调用」的判据与回调族同一条** ✓（`IsCallableValue` ✓，第 145 轮）——
  // 写 `IsCallable()` 的话 `[2, 1].sort(String)` 会**静默**走文本那一支 ✗（不是拒绝，是换语义 ✗）。
  const comparator = args.length > 0 && IsCallableValue(table, args[0]) ? args[0] : Value.Undefined();
  const hasComparator = IsCallableValue(table, comparator);
  // **插入排序**（稳定 ✓）：从第二格起，每格往前挪到该在的位置 ✓。
  for (let i = 1; i < source.GetLength(); i++) {
    const item = source.GetAt(i);
    const itemHole = source.IsHole(i);
    let j = i - 1;
    while (j >= 0) {
      const other = source.GetAt(j);
      const otherHole = source.IsHole(j);
      // **判据统一成一句**：「`other` 是不是该排在 `item` **后面**」✓——
      // 比较器返回**正数**表示「第一个参数在后面」✓，所以**两个分支都拿 `(other, item)` 去比** ✓。
      // **这一格极容易写反** ✗：第一版拿 `(item, other)` 比、又用 `> 0` 当「往后挪」✓，
      // 于是判据整好反了一百八十度 ✓——`[3,1,2].sort((a, b) => a - b)` 给 `3,2,1` ✓
      // （而 `["b","a"].sort()` 那条**照样对** ✗，因为文本那一支我写的是 `(other, item)` ✓，
      //  于是「一半对一半错」✓——判据现场就是这么红的 ✓）。
      let otherFirst = false;
      if (hasComparator && call !== null) {
        const verdict = call(comparator, Value.Undefined(), [other, item]);
        if (verdict.Tag === ValueTag.Int32) otherFirst = verdict.Int > 0;
        else if (verdict.Tag === ValueTag.Float64) otherFirst = verdict.Dbl > 0;
      } else {
        otherFirst = CompareAsText(table, other, item) > 0;
      }
      if (!otherFirst) break;
      // **洞要跟着格子一起挪** ✓：`SetAt` 会**清掉**那一格的洞标记 ✓（`heap.xl.md` 的 `SetAt` ✓），
      // 所以「挪过来的本来是洞」时要**再标回去** ✓——少了这一步，洞里会冒出一个显式的
      // `undefined` ✗（形状变了 ✓：`in` 从假变真 ✗）。
      source.SetAt(j + 1, other);
      if (otherHole) source.SetHole(j + 1);
      j = j - 1;
    }
    source.SetAt(j + 1, item);
    if (itemHole) source.SetHole(j + 1);
  }
  table.Recount(self.Ref);
  return self;
}
if (id === ArrayReduce) {
  // **回调与通道都要有** ✓（少了就响亮地说清 ✓，与别的回调族一样 ✓）。
  if (args.length < 1 || !args[0].IsCallable() || call === null) {
    throw new Error("reduce needs a function and a call channel (the host must pass one)");
  }
  const total = source.GetLength();
  let accumulator = Value.Undefined();
  let started = false;
  if (args.length > 1) {
    accumulator = args[1];
    started = true;
  }
  for (let i = 0; i < total; i++) {
    // **洞跳过** ✓（JS 的 `reduce` 只走存在的下标 ✓）。
    if (source.IsHole(i)) continue;
    if (!started) {
      // **没给初值：第一项当初值** ✓（这一项**不跑回调** ✓）。
      accumulator = source.GetAt(i);
      started = true;
      continue;
    }
    accumulator = call(args[0], Value.Undefined(), [accumulator, source.GetAt(i)]);
  }
  if (!started) {
    // **空数组且没给初值**：JS 抛 `TypeError` ✓，这里也抛 ✓（**不许**静默给 `undefined` ✗）。
    throw new Error("reduce of an empty array with no initial value");
  }
  return accumulator;
}
if (id === ArrayShift) {
  // **空数组给 `undefined`** ✓（JS 的口径 ✓）。
  if (source.GetLength() === 0) return Value.Undefined();
  const first = source.GetAt(0);
  // **整体左移**：`SetAt` 会清掉洞标记 ✓，所以洞要**再标回去** ✓（与 `sort` 同一条纪律 ✓）。
  for (let i = 1; i < source.GetLength(); i++) {
    const moved = source.GetAt(i);
    const movedHole = source.IsHole(i);
    source.SetAt(i - 1, moved);
    if (movedHole) source.SetHole(i - 1);
  }
  // **缩一格**：`Truncate` 是「截到这么长」✓（`heap.xl.md` ✓）——与 `pop` 那一支同一个用法 ✓。
  source.Truncate(source.GetLength() - 1);
  table.Recount(self.Ref);
  return first;
}
if (id === ArrayAt) {
  // **`at(i)`**（第 150 轮）✓：与 `[i]` 只差**负下标从尾巴数** ✓
  //（`at(-1)` 是最后一个 ✓，`[−1]` 是 `undefined` ✓——两处都要在 ✓，差别是语义 ✗）。
  // **越界给 `undefined`** ✓（不是 `undefined` 加报错 ✓，JS 的口径 ✓）。
  if (args.length < 1) return Value.Undefined();
  let index = ToInt32Of(args[0]);
  const length = source.GetLength();
  if (index < 0) index = index + length;
  if (index < 0 || index >= length) return Value.Undefined();
  // **洞也照读** ✓（`GetAt` 对洞给 `undefined` ✓——JS 的 `at` 就是读那一格 ✓）。
  return source.GetAt(index);
}
if (id === ArraySplice) {
  // **`splice(起点, 删几个, …插进去的)`**（第 150 轮）✓——**就地改** ✓，返回**删掉的那些** ✓
  //（新数组 ✓、原型跟着源数组走 ✓——与 `slice` / `map` 同一条 ✓）。
  //
  // **三档缺省都是 JS 的口径** ✓：起点缺省 0 ✓、**起点为负从尾巴数** ✓、
  // 删除个数缺省是「删到尾巴」 ✓（`splice(1)` 删掉 1 之后全部 ✓）。
  const length = source.GetLength();
  let start = args.length > 0 ? ToInt32Of(args[0]) : 0;
  if (start < 0) start = start + length;
  if (start < 0) start = 0;
  if (start > length) start = length;
  let removeCount = length - start;
  if (args.length > 1) {
    const asked = ToInt32Of(args[1]);
    removeCount = asked < 0 ? 0 : asked;
    if (removeCount > length - start) removeCount = length - start;
  }
  const insertCount = args.length > 2 ? args.length - 2 : 0;
  const removedRoom = thisSpliceRoom(room, length);
  if (!removedRoom) throw new Error("out of room");
  const removed = table.CreateArray();
  table.Get(removed).Proto = table.Get(self.Ref).Proto;
  const removedArray = table.Get(removed).AsArray();
  for (let i = 0; i < removeCount; i++) removedArray.Push(source.GetAt(start + i));
  // **先把尾巴搬到位、再截断 / 追加** ✓（顺序是语义 ✗）：`splice` 是**就地**的 ✓，
  // 而 `Array` 这一层只有 `GetAt` / `SetAt` / `Push` / `Truncate` ✓——
  // 所以「搬移」要自己写 ✓（没有 `RemoveAt` / `InsertAt` ✗，那是下一层的事 ✓）。
  //
  // **两头的方向为什么不一样** ✓：左边（`start` 之前）不动 ✓；
  // 中间要腾出 `insertCount - removeCount` 格的差 ✓——
  // 差为正（插得多）时**从后往前**搬 ✓（不然会把还没读的覆盖掉 ✗），
  // 差为负（删得多）时**从前往后**搬 ✓。
  const delta = insertCount - removeCount;
  if (delta > 0) {
    if (!room(ObjectCharge)) throw new Error("out of room");
    for (let i = length - 1; i >= start + removeCount; i--) {
      source.SetAt(i + delta, source.GetAt(i));
    }
    for (let i = 0; i < delta; i++) source.SetAt(start + removeCount + i, Value.Undefined());
  } else if (delta < 0) {
    for (let i = start + removeCount; i < length; i++) {
      source.SetAt(i + delta, source.GetAt(i));
    }
  }
  source.Truncate(length + delta);
  for (let i = 0; i < insertCount; i++) source.SetAt(start + i, args[2 + i]);
  table.Recount(self.Ref);
  // **`CreateArray` 给的是堆上的把手** ✓，返回值要包成值 ✓（`Value.FromArray` ✓——
  // 与 `slice` / `flat` 那两支同一个写法 ✓）。
  return Value.FromArray(removed);
}
if (id === ArrayFill) {
  if (args.length < 1) throw new Error("fill needs a value");
  for (let i = 0; i < source.GetLength(); i++) {
    source.SetAt(i, args[0]);
  }
  table.Recount(self.Ref);
  return self;
}
if (id === ArrayFlat) {
  // **要在 `RequireArray` 之后、`self` 上做** ✓——结果是一个**新数组** ✓（JS 不改原数组 ✓），
  // 原型**跟着源数组走** ✓（与 `slice`/`map` 那几支同一条 ✓）。
  const flatRoom = thisFlatRoom(room, source.GetLength());
  if (!flatRoom) throw new Error("out of room");
  const flattened = table.CreateArray();
  table.Get(flattened).Proto = table.Get(self.Ref).Proto;
  const target = table.Get(flattened).AsArray();
  for (let i = 0; i < source.GetLength(); i++) {
    if (source.IsHole(i)) continue;
    const item = source.GetAt(i);
    if (item.Tag === ValueTag.Array) {
      const inner = table.Get(item.Ref).AsArray();
      for (let j = 0; j < inner.GetLength(); j++) {
        if (inner.IsHole(j)) continue;
        target.Push(inner.GetAt(j));
      }
      continue;
    }
    target.Push(item);
  }
  table.Recount(flattened);
  return Value.FromArray(flattened);
}
throw new Error("unimplemented: array builtin " + id);
```

# method thisFlatRoom:(room:RoomChecker, length:int)=>bool

**`flat` 开新数组之前问一句房间** ✓：上界按「每个元素都摊开、且每一层都不比源长」算 ✗——
那算不准 ✓，所以这里**只问一个保守的下界** ✓（一个新数组 + 与源同样多的值 ✓），
多的那些由 `Push` 自己在需要时兜 ✓（`heap.xl.md` 的 `Push` 不做房间检查 ✗，
所以这里**不能**给出一个「肯定够」的假承诺 ✓——**宁可问一句、也不假装算得准** ✓）。

```ts
return room(ObjectCharge + length * ValueCharge);
```

# method thisSpliceRoom:(room:RoomChecker, length:int)=>bool

**`splice` 开「删掉的那些」那个新数组之前问一句房间** ✓（第 150 轮）——
与 `thisFlatRoom` 同款 ✓：**只问一个保守的下界** ✓（一个新数组 + 与源同样多的值 ✓）。

**为什么把 `length` 留在签名里** ✗：上面那句「与源同样多的值」就是它 ✓——
按 `removeCount` 算会**少问** ✓（`Push` 自己不做房间检查 ✗），而这里宁可多问 ✓。

```ts
return room(ObjectCharge + length * ValueCharge);
```

# method CompareAsText:(table:HeapTable, left:Value, right:Value)=>int

**`sort()` 不给比较器时的比法**：两边都转成文本，按**码元**逐位比 ✓
（JS 就是「转成字符串再按码元比」✓）。

**为什么单独写一个** ✗：`sort` 那一支的循环里要用它三处（比、判正负 ✓），
写进循环里会让那段已经够长的代码更难读 ✓；而且**它的口径要写下来** ✓——
「按数值比看起来更对，但不是 JS」✓ 正是那种会被顺手「改对」的地方 ✓。

```ts
const leftUnits = ValueUnits(table, left, 0);
const rightUnits = ValueUnits(table, right, 0);
const shared = leftUnits.length < rightUnits.length ? leftUnits.length : rightUnits.length;
for (let i = 0; i < shared; i++) {
  if (leftUnits[i] === rightUnits[i]) continue;
  return leftUnits[i] < rightUnits[i] ? -1 : 1;
}
if (leftUnits.length === rightUnits.length) return 0;
return leftUnits.length < rightUnits.length ? -1 : 1;
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

# method NeverCall:(callee:Value, self:Value, args:Array<Value>)=>Value

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
  "find", "some", "every", "concat", "reverse", "includes", "findIndex", "sort", "reduce",
  "shift", "fill", "flat", "at", "splice"];
const ids: number[] = [ArrayPush, ArrayPop, ArrayJoin, ArrayIndexOf, ArraySlice, ArrayForEach,
  ArrayMap, ArrayFilter, ArrayFind, ArraySome, ArrayEvery, ArrayConcat, ArrayReverse, ArrayIncludes,
  ArrayFindIndex, ArraySort, ArrayReduce, ArrayShift, ArrayFill, ArrayFlat, ArrayAt, ArraySplice];
for (let i = 0; i < entries.length; i++) {
  const key = Value.FromString(table.CreateString(Units(entries[i])));
  const target = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ids[i], 0));
  SetProperty(vm.Room(), NeverCall, table, proto, key, target);
}
```
