# dependencies
```xl
import { Value, ValueTag } from "../../runtime/value.xl.md"
import { HeapTable } from "../../runtime/heap.xl.md"
import { RoomChecker } from "../../runtime/rt.xl.md"
import { Protos, DefineAccessor, FindProperty, NewPlainArray, NeverRoom } from "../../runtime/props.xl.md"
import { Vm } from "../../runtime/vm.xl.md"
import { Host } from "../../runtime/host-abi.xl.md"
import { BuiltinBase } from "../../runtime/ir.xl.md"
import { InvokeArray } from "./array.xl.md"
import { InstallArray } from "./array.xl.md"
import { InvokeString, InstallString } from "./string.xl.md"
import { InvokeGlobal, LogSink } from "./globals.xl.md"
import { InvokeMap, MapCtor, NameValue, ReadOwn } from "./map.xl.md"
import { InvokeSet } from "./set.xl.md"
```

# namespace cangjie

**标准库的装库入口与总分派**。

为什么要一个「入口」而不是让宿主分别调两块：

1. **宿主只认一个名字**（`InstallBuiltins` / `InvokeBuiltin`）——将来加 `Object` / `Math` /
   `JSON`，宿主那一侧一行都不用改；
2. **号段在这里翻译成模块**（数组 1..99、字符串 100..199）——
   「哪个号属于哪一块」只有这一处知道，**加一块只改这一处**。

**依赖方向**：`builtins/` 依赖 `runtime/`，不反过来。所以「装库」这一步永远由
**知道两边的那一层**（宿主 / 驱动）显式调用——`runtime/` 里不会出现 `builtins` 的名字。

# method InvokeBuiltin:(room:RoomChecker, table:HeapTable, id:int, self:Value, args:Array<Value>)=>Value

**按能力号总分派**。

号段之外一律抛：**没装的东西被调到，就是配置错了**，不是「当作没有」——
静默返回 `undefined` 会让调用方以为方法存在。

```ts
if (id >= 100 && id < 200) return InvokeString(room, table, id, self, args);
if (id >= 1 && id < 100) return InvokeArray(room, table, id, self, args);
throw new Error("unimplemented: builtin id " + id);
```

# method InvokeWithSink:(room:RoomChecker, table:HeapTable, protos:Protos, id:int, self:Value, args:Array<Value>, sink:LogSink)=>Value

**宿主实际接的那个通道**：带 `sink` 的总分派。

**为什么不让 `InvokeBuiltin` 直接收 `sink`**：数组与字符串那两块**根本不需要它**
（它们不打印）。把用不到的东西塞进它们的签名里，会让那两块的读者以为它们要
「知道日志去哪」——**号段的翻译留在这一层，`sink` 只往需要它的那一块传**。

**原型表只在全局段用得到**（`Object.keys` 返回的新数组要带数组原型），
理由同上：用不到的那两块不必收它。

```ts
// **集合那一段要原型表**（它们造普通对象与数组）——`NeverCall` 是写数据属性时的现成空实现。
// **段内再分段，按窄到宽判，避免重叠**：610..659 `Set`、600..609 `Map`。
if (id >= 610 && id < 660) return InvokeSet(room, protos, table, id, self, args);
if (id >= 600 && id < 700) return InvokeMap(room, protos, table, id, self, args);
// **700..799：语言内部辅助**（第 99 轮开的段）。
// 它们**不是全局名**——降级层为了落实现某条语法（访问器、`for..of` 的入口）而发的内部调用。
// 与全局段分开编号，是为了让「脚本能看见的名字」与「降级层的家务事」一眼可辨。
// **`get_iterator` 排在最前**（第 111 轮）：它要 `protos`（要造数组），而 `InvokeObjectHelper`
// 不收 `protos`——把这一支留在这一层，就不必为了一个参数去改那个签名。
if (id === GetIteratorId) {
  if (args.length < 1) throw new Error("unimplemented: get_iterator needs (value)");
  return GetIterator(room, table, protos, args[0]);
}
if (id >= 700 && id < 800) return InvokeObjectHelper(room, table, id, self, args);
if (id >= 200) return InvokeGlobal(room, table, protos, id, self, args, sink);
return InvokeBuiltin(room, table, id, self, args);
```

# const GetIteratorId:int = 702

**`for..of` 的入口**（第 111 轮补）：降级层把「要被迭代的那个值」先交给它，拿回来的一定是
**引擎认得的可迭代物**（数组或生成器）——`iter_next` 那边一行都不用改。

**为什么必须由语言层做这一步**：引擎**不认识 `Map`** ✗（那是语言层的东西）。
让 `iter_next` 认识 `Map`，等于把语言内建塞进语言无关的引擎里（分层就反了）。
这里正好用上一次已经开好的机制——**语言内建号**（号段 700..799）✓，
而它的**格数与登记**都已经由 `BuiltinSlots` / `InstallBuiltins` 包掉了 ✓（**宿主不必知道它存在** ✓）。

# method GetIterator:(room:RoomChecker, table:HeapTable, protos:Protos, value:Value)=>Value

**它对四种输入做什么**：

| 输入 | 给什么 |
| --- | --- |
| **Map**（有 `__k`） | **`[键, 值]` 对的数组**——这正是 JS 的形状 ✓（`for (const e of m) e[0]/e[1]` ✓） |
| **Set**（有 `__v`） | **值的数组**（与 `Set.values()` 同形 ✓） |
| 数组 | **原样**（数组本来就是引擎认的可迭代物 ✓） |
| 生成器 / 其它值 | **原样**（生成器由引擎认；其它值由引擎那边报错，报的是引擎的话 ✓） |

**按「有没有那两格」认，而不是按名字认**：`Map` / `Set` 在引擎里就是「挂着 `__k` / `__v`
的普通对象」——**这里也只认这两格** ✓。于是两个集合将来换内部表示（真的哈希表）时，
改动只落在这一处 ✓。

**每一处数组都现取视图**（`table.Get(句柄).AsArray()`）：句柄稳定、**视图不稳定** ✓
（`Push` 换底层存储之后老视图就废了——`map.xl.md` 文首那条教训）。

```ts
if (!value.IsObject()) return value;
const mapMarker = FindProperty(NeverRoom, table, value.Ref, NameValue(table, "__k"));
const setMarker = FindProperty(NeverRoom, table, value.Ref, NameValue(table, "__v"));
if (mapMarker === null && setMarker === null) return value;
const source = ReadOwn(room, table, value, mapMarker !== null ? "__k" : "__v");
const out = NewPlainArray(room, table, protos);
const length = table.Get(source.Ref).AsArray().GetLength();
for (let i = 0; i < length; i++) {
  if (table.Get(source.Ref).AsArray().IsHole(i)) continue;
  if (mapMarker === null) {
    table.Get(out.Ref).AsArray().Push(table.Get(source.Ref).AsArray().GetAt(i));
    continue;
  }
  const pair = NewPlainArray(room, table, protos);
  table.Get(pair.Ref).AsArray().Push(table.Get(source.Ref).AsArray().GetAt(i));
  const values = ReadOwn(room, table, value, "__v");
  table.Get(pair.Ref).AsArray().Push(table.Get(values.Ref).AsArray().GetAt(i));
  table.Get(out.Ref).AsArray().Push(pair);
}
return out;
```

# method BuiltinSlots:()=>int

**这一层要用掉多少格「语言内建段」**（第 111 轮补）——宿主拿它去**开表**。

**为什么这个数必须由语言公布**：能力表是宿主按**这一次装载的 id 表**开出来的 ✓，
而语言内部辅助号（700 段）**不在脚本里**、宿主无从得知 ✗。开小了 `host.Register` 会
**返回 `false`**（规范原话：「注册不进去不是「静默忽略」」✗），症状却离现场很远
——先是 `capability id is out of range`，再是 `capability is not registered`（两次实测都是这个形状 ✓）。

**算的是「格数」不是「号」**：`IdTable` 的内建段从 `BuiltinBase` 起算 ✓，所以这里减掉它 ✓——
宿主不必自己知道那个基址 ✓。**加新的辅助号时只改这一句的名单** ✓。

```ts
const highest = DefineAccessorId > GetIteratorId ? DefineAccessorId : GetIteratorId;
return highest + 1 - BuiltinBase;
```

# method InstallBuiltins:(host:Host, protos:Protos)=>void

**把全部内建装上**：数组、字符串——**并且把语言内部辅助号登记进能力表**（第 109 轮）。

**参数从 `Vm` 换成 `Host`**：要登记就得有门面（`host.Register`）✓，机器从 `host.Machine` 拿 ✓。

**调用时机有要求**：必须在 `host.Load(...)` **之后** ✓——`Register` 只认**已装载的那张表**里的号，
而且**表要开够**（用 `BuiltinSlots()` ✓）。装载之前调它，登记**静默失败** ✗（返回 `false`，没人看）。
司机与判据天然就是这个顺序 ✓。

```ts
InstallArray(host.Machine, protos);
InstallString(host.Machine, protos);
// **辅助号在这里登记**：值是带本模块号的宿主引用（与建库层别处同一形状）。
const helpers = [DefineAccessorId, GetIteratorId];
for (let i = 0; i < helpers.length; i++) {
  host.Register(helpers[i],
    Value.FromRef(ValueTag.HostRef, host.Machine.Table.CreateHostRef(helpers[i], 0)));
}
```

# const DefineAccessorId:int = 701

`{ get x() { … } }` 落成的那条内部调用（号段 700..799，见 `InvokeWithSink`）。

**它不是全局名**：脚本里没有叫这个名字的东西，是**降级层**为了落实现「对象字面量的访问器」
而发的内部调用——调用形状是 `define_accessor(对象, 键, getter, setter)`，
落在 `props.xl.md` 的 `DefineAccessor` 上。

**为什么走内建号而不是加一条通用算子**：加算子要动 `RtOpCount`、还要改**手写的 `vm.cpp`** ✗；
而规范写着「**语言内建从 `BuiltinBase` 之后编号，由语言层注册**」——「定义访问器」本来就属于
语言/库那一侧，所以它该是**语言内建**，不是通用算子。

# method InvokeObjectHelper:(room:RoomChecker, table:HeapTable, id:int, self:Value, args:Array<Value>)=>Value

**号段 700..799 的分派**（语言内部辅助）。

这一段今天只有一条：`DefineAccessorId`。**其余号照旧抛**——没装的东西被调到就是配置错了。

```ts
if (id === DefineAccessorId) {
  if (args.length < 4) {
    throw new Error("unimplemented: define_accessor needs (object, key, getter, setter)");
  }
  DefineAccessor(room, table, args[0], args[1], args[2], args[3]);
  return Value.Undefined();
}
throw new Error("unimplemented: object helper " + id);
```
