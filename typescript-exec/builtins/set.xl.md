# dependencies
```xl
import { Value, ValueTag } from "../../runtime/value.xl.md"
import { HeapTable, HeapArray, ObjectCharge, ValueCharge } from "../../runtime/heap.xl.md"
import { RoomChecker, RtCmpEqStrict, SameValueZero, IsCallableValue } from "../../runtime/rt.xl.md"
import { NativeCall, CallFailed, Protos, NewPlainObject, NewPlainArray, SetProperty, DefineAccessor, NeverRoom } from "../../runtime/props.xl.md"
import { NeverCall, Units, AttachArrayIterator } from "./array.xl.md"
import { NameValue, ReadOwn, WriteOwn } from "./map.xl.md"
import { Vm } from "../../runtime/vm.xl.md"
```

# namespace cangjie

**`Set`（v1 标准库名单里的一项）——与 `Map` 同一套配方，没有新的堆形状。**

一个 `Set` 就是一个**普通对象**，上面挂两样东西：

| 属性 | 是什么 |
| --- | --- |
| `__v` | 一个**数组**，按插入顺序放值（**可以是任何值**） |
| `size` | 原型上的**只读访问器**（第 613 轮 ✓）——getter 返回 `__v` 的长度 ✓，**不是**实例上的数据格 ✗ |

**它和 `Map` 共用三件小工具**（`NameValue` / `ReadOwn` / `WriteOwn`，从 `map.xl.md` import）——
那不是「谁属于谁」，而是这两个集合的**内部表示是同一件事**（一个对象 + 一个数组）。
**将来若要给它们换表示（比如真的哈希表），就一起换。**

**键相等用 `SameValueZero`** ✓（第 207 轮改 ✓，与 `Map` 同一个表 ✓，`rt.xl.md` 那张具名的 ✓）——
它不是 `===` ✗：`new Set([NaN]).has(NaN)` 在 JS 里是**真** ✓（那个 `NaN` 字面量第 206 轮才装得上 ✓）。

**`values()` 返回数组**（不是迭代器）：引擎的迭代只认数组与生成器，所以
`for (const x of s.values())` 能用，而 `for (const x of s)` **直接迭代 Set 不支持**——
记为缺口（与 `Map` 同一条）。

**没做的**（明确抛，不静默少跑）：`keys()` / `entries()` / `clear` / `forEach`
（`forEach` 要求宿主回调脚本闭包 = **重入执行器**，这一层没有）。

# const SetCtor:int = 611
`new Set()` 的号（集合段从 610 起，与 Map 的 600..609 分开）。
# const SetAdd:int = 612
`add(v)` 的号（返回自己，好接链式写法）。
# const SetHas:int = 613
`has(v)` 的号。
# const SetDelete:int = 614
`delete(v)` 的号。
# const SetValues:int = 615
`values()` 的号（**返回数组**）。
# const SetKeys:int = 616
`keys()` 的号——**集合里它与 `values()` 是同一件事**（JS 也这样：Set 的键就是它的值）。
# const SetEntries:int = 617
`entries()` 的号（**返回 `[值, 值]` 对的数组**——JS 里 Set 的 `entries` 就是这个形状，
所以脚本里 `e[0]` 与 `e[1]` 都能用）。
# const SetClear:int = 618
`clear()` 的号（清空并返回 `undefined`）。
# const SetForEach:int = 619
`forEach(回调)` 的号——与 `Map` 同一条路（靠 `NativeCall` 重入分派循环 ✓）。
**回调收 `(值, 值, 集合)` 三格** ✓（第 288 轮补齐 ✓——前两格是同一个值 ✓，第三格是接收者 ✓）。

# const SetUnion:int = 620

**`union(另一个集合)`**（第 324 轮 ✓）——号**追加在集合段里** ✓（`611..659` ✓，
第 130 轮开这一段时就留着空号 ✓）。

# const SetIntersection:int = 621

**`intersection(另一个集合)`**（第 324 轮 ✓）。

# const SetDifference:int = 622

**`difference(另一个集合)`**（第 324 轮 ✓）。

# const SetSymmetricDifference:int = 623

**`symmetricDifference(另一个集合)`**（第 324 轮 ✓）。

# const SetSubsetOf:int = 624

**`isSubsetOf(另一个集合)`**（第 324 轮 ✓）。

# const SetDisjointFrom:int = 625
**`isDisjointFrom(另一个集合)`**（第 324 轮 ✓）。

# const SetSizeGet:int = 662
**`Set.prototype.size` 那个 getter 的号** ✓（第 613 轮 ✓）——**不是脚本看得到的名字** ✗：
它是 `InstallSetPrototype` 自己挂上去的一个宿主引用 ✓。号落在 `661`（`MapSizeGet`）后面 ✓，
理由与 `Map.groupBy` 那一段一字不差 ✓（`611..659` 那一段满了 ✓）。

# method SetMethodNameOf:(id:int)=>string

号 → 方法名（**这张表只此一处**）。

```ts
if (id === SetAdd) return "add";
if (id === SetHas) return "has";
if (id === SetDelete) return "delete";
if (id === SetValues) return "values";
if (id === SetKeys) return "keys";
if (id === SetEntries) return "entries";
if (id === SetClear) return "clear";
if (id === SetForEach) return "forEach";
// **第 324 轮那六个** ✓（ES2025 的集合运算 ✓）——它们是**另一件事** ✓：
// 前八个改的是**接收者自己** ✓，这六个**不改接收者** ✗（造一个新的 ✓、或答一个是非 ✓）——
// 但它们的**号与名字**照旧挂在这一张表上 ✓（`install.xl.md` 与这一层共用它 ✓）。
if (id === SetUnion) return "union";
if (id === SetIntersection) return "intersection";
if (id === SetDifference) return "difference";
if (id === SetSymmetricDifference) return "symmetricDifference";
if (id === SetSubsetOf) return "isSubsetOf";
if (id === SetDisjointFrom) return "isDisjointFrom";
throw new Error("unimplemented: set method id " + id);
```

# method InstallSetMethods:(room:RoomChecker, table:HeapTable, target:Value)=>void

**把方法挂到一个对象上**（每个值都是带本模块号的宿主引用）✓。

**第 341 轮：调用点从「每个实例」改成了「原型那一格」** ✗——理由与 `map.xl.md`
`InstallMapMethods` 那一段**一字不差** ✓（`Object.getOwnPropertyNames(new Set())`
在 Node 里是**空数组** ✓、本仓原来列出十四个方法名 ✗）。**函数体不必改** ✗：
它们读的是 `self.__v` ✓，而 `DoCallMethod` 递进去的 `self` 仍然是**那个实例** ✓。

```ts
const ids = [SetAdd, SetHas, SetDelete, SetValues, SetKeys, SetEntries, SetClear, SetForEach,
  // **第 324 轮那六个也要挂** ✓：与上面八个**同一个循环** ✓——少挂一格就是
  // `cannot call a non-closure value` ✓（**那句话听起来像「集合运算还没做」** ✗，
  // 其实只是**没人往那一格挂东西** ✓，与第 308 轮 `Array.prototype[Symbol.iterator]` 同一副面孔 ✓）。
  SetUnion, SetIntersection, SetDifference, SetSymmetricDifference, SetSubsetOf, SetDisjointFrom];
for (let i = 0; i < ids.length; i++) {
  const fn = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ids[i], 0));
  WriteOwn(room, NeverCall, table, target, SetMethodNameOf(ids[i]), fn);
}
```

# method InstallSetPrototype:(vm:Vm, protos:Protos)=>void

**把 Set 那一族的方法装到 `Protos.Set` 上** ✓（第 341 轮 ✓）——与 `InstallMapPrototype`
同一个位置、同一个形状 ✓。

**`size` 从第 613 轮起也挂在这里** ✓（原来只是**实例上的一个数据格** ✗）——
理由与 `map.xl.md` 的 `InstallMapPrototype` 那一段**一字不差** ✓（JS 里它是原型上的只读访问器 ✓，
而本仓那一格根本不在原型上 ✗）。

```ts
InstallSetMethods(vm.Room(), vm.Table, Value.FromObject(protos.Set));
// **`Set.prototype.size` 的 getter** ✓（第 613 轮 ✓）：与 `Map` 那一格同形 ✓——
// **也必须走 `DefineAccessor`** ✗（`SetProperty` 造的是数据属性 ✓，
// 理由写在 `map.xl.md` 那一处 ✓）。
DefineAccessor(vm.Room(), vm.Table, Value.FromObject(protos.Set), NameValue(vm.Table, "size"),
  Value.FromRef(ValueTag.HostRef, vm.Table.CreateHostRef(SetSizeGet, 0)), Value.Undefined(), false);
```

# method SetSizeOf:(table:HeapTable, self:Value)=>Value

**`size` 那个 getter 的正身** ✓（第 613 轮 ✓）——读 `__v` 的长度 ✓，
与 `Map` 那一格**同一个形状** ✓（那边读的是 `__k` ✓）。

```ts
const values = ReadOwn(NeverRoom, table, self, "__v");
return Value.FromInt(table.Get(values.Ref).AsArray().GetLength());
```

# method InvokeSet:(room:RoomChecker, protos:Protos, table:HeapTable, call:NativeCall | null, id:int, self:Value, args:Array<Value>, failed:CallFailed | null = null)=>Value

**Set 的构造函数与方法总入口**（号段 610..699）。

**每一处数组都现取视图**（`table.Get(句柄).AsArray()`）：句柄是稳定的，**视图不是**——
`Push` 换存储之后老视图就废了（这一条在 `Map` 上踩过）。

```ts
if (id === SetCtor) {
  // **变量别起名叫 `set`**：投影会把 `set` 判成 `SetKeyword`（上下文关键字误判），
  // 而 TS 那边是 `Identifier`——对拍尺子会当场点出来（第 60 轮实测）。
  // 这是投影层的 bug，记在台账里；这里先绕开，让它不影响别的判据。
  const created = NewPlainObject(room, table, protos);
  // **实例挂在 `Protos.Set` 上**（第 138 轮）——理由与 `map.xl.md` 那一句一字不差 ✓
  // （`new Set() instanceof Set` 要在链上找到那一格 ✓）。
  table.Get(created.Ref).Proto = protos.Set;
  WriteOwn(room, NeverCall, table, created, "__v", NewPlainArray(room, table, protos));
  WriteOwn(room, NeverCall, table, created, "size", Value.FromInt(0));
  // **初始值**（第 130 轮）：`new Set([1, 2])` ✓——实参是**数组**的那一种 ✓
  // （`new Set(Array.from(x))` / `new Set([...])` 都是这个形状 ✓；**注意**后者的 `[...]`
  // 还要展开语法 ✓，那是降级层的事 ✓）。**复用 `add` 那条路** ✓：去重与 `size` 都不必写第二遍 ✓。
  // **生成器第 199 轮通了** ✓：`new Set(生成器)` 原来**静默给空集** ✗（JS 给全部产出 ✓）——
  // 收成数组那一步在**号段翻译那一层** ✓（`install.xl.md` 的 `InvokeWithSink` ✓，
  // 因为这一块**不能** import 它 ✓，会成环 ✗）。所以到这里 `args[0]` **一定是数组** ✓
  // （或者 `null` / `undefined` ✓ = 空集 ✓）——**这一支一个字都没改** ✓。
  if (args.length > 0 && args[0].Tag === ValueTag.Array) {
    const items = table.Get(args[0].Ref).AsArray();
    for (let i = 0; i < items.GetLength(); i++) {
      const itemArgs: Value[] = [items.GetAt(i)];
      InvokeSet(room, protos, table, null, SetAdd, created, itemArgs);
    }
  }
  return created;
}
const values = ReadOwn(room, table, self, "__v");
// **`size` 那个 getter** ✓（第 613 轮 ✓）：读 `__v` 的长度 ✓——见 `SetSizeOf` ✓。
if (id === SetSizeGet) return SetSizeOf(table, self);
// **查找要用到才做**：`values()` 没有参数，若把 `IndexOfSetValue(..., args[0])` 提到
// 分支之前，这里就会拿 `undefined` 去比相等——报出来的是
// 「Cannot read properties of undefined (reading 'Tag')」，离现场很远（第 60 轮踩的）。
if (id === SetAdd) {
  // **已经在里面就什么都不做**（JS 的 `add` 对重复值是空操作，仍然返回自己）。
  if (IndexOfSetValue(table, values, args[0]) >= 0) return self;
  if (!room(ObjectCharge + ValueCharge)) throw new Error("out of room");
  table.Get(values.Ref).AsArray().Push(args[0]);
  WriteOwn(room, NeverCall, table, self, "size",
    Value.FromInt(table.Get(values.Ref).AsArray().GetLength()));
  return self;
}
if (id === SetHas) {
  return Value.FromBool(IndexOfSetValue(table, values, args[0]) >= 0);
}
if (id === SetDelete) {
  const at = IndexOfSetValue(table, values, args[0]);
  if (at < 0) return Value.FromBool(false);
  // **删中间一格要把后面的往前挪**：顺序是语义（`values()` 按插入顺序）。
  const array = table.Get(values.Ref).AsArray();
  const last = array.GetLength() - 1;
  for (let i = at; i < last; i++) {
    table.Get(values.Ref).AsArray().SetAt(i, table.Get(values.Ref).AsArray().GetAt(i + 1));
  }
  table.Get(values.Ref).AsArray().Truncate(last);
  WriteOwn(room, NeverCall, table, self, "size", Value.FromInt(last));
  return Value.FromBool(true);
}
if (id === SetValues || id === SetKeys) {
  // **`keys()` 与 `values()` 同一支**：集合里键就是值（JS 也这样）。
  const out = NewPlainArray(room, table, protos);
  const length = table.Get(values.Ref).AsArray().GetLength();
  for (let i = 0; i < length; i++) {
    const source = table.Get(values.Ref).AsArray();
    if (source.IsHole(i)) continue;
    table.Get(out.Ref).AsArray().Push(source.GetAt(i));
  }
  // **真迭代器那一套也要挂上** ✓（第 331 轮 ✓）：`set.keys().next()` 与 `Map` 那一族
  // **是同一件事** ✓ ⇒ 用**同一个** `AttachArrayIterator` ✓（第 279 轮做出的那两格 ✓，
  // 见 `array.xl.md` 那一段的理由 ✓——**抄第二遍就是第二处会漂的答案** ✗）。
  AttachArrayIterator(room, table, out.Ref);
  return out;
}
if (id === SetEntries) {
  // **`[值, 值]` 对的数组**（JS 里 Set 的 `entries` 就是这个形状，两个元素相同）。
  const out = NewPlainArray(room, table, protos);
  const length = table.Get(values.Ref).AsArray().GetLength();
  for (let i = 0; i < length; i++) {
    // **视图每次现取**：里面两次 `Push` 都会换底层存储。
    if (table.Get(values.Ref).AsArray().IsHole(i)) continue;
    const pair = NewPlainArray(room, table, protos);
    table.Get(pair.Ref).AsArray().Push(table.Get(values.Ref).AsArray().GetAt(i));
    table.Get(pair.Ref).AsArray().Push(table.Get(values.Ref).AsArray().GetAt(i));
    table.Get(out.Ref).AsArray().Push(pair);
  }
  AttachArrayIterator(room, table, out.Ref);
  return out;
}
if (id === SetForEach) {
  // **回调脚本**（与 `Map` 同一条路 ✓）。快照一次长度：回调里可以改这个集合 ✓。
  // **`call` 也要判空**：宿主没接回调通道时，这里必须**响亮**说清（而不是「调用了非闭包」）✗。
  if (args.length < 1 || !IsCallableValue(table, args[0]) || call === null) {
    throw new Error("forEach needs a function and a call channel (the host must pass one)");
  }
  const eachTotal = table.Get(values.Ref).AsArray().GetLength();
  for (let i = 0; i < eachTotal; i++) {
    if (table.Get(values.Ref).AsArray().IsHole(i)) continue;
    // **三格**（第 288 轮 ✓）：JS 的签名是 `(值, 值, 集合)` ✓——前两格是**同一个值** ✓
    //（`s.forEach((v, k) => …)` 里 `k === v` ✓），第三格是**这个 Set 自己** ✓
    //（给的就是接收者 `self` ✓，不是另造一个包装 ✓）。判据 `set-methods-and-iteration` ✓。
    call(args[0], Value.Undefined(), [table.Get(values.Ref).AsArray().GetAt(i),
      table.Get(values.Ref).AsArray().GetAt(i), self]);
    // **回调抛出就收摊** ✓（第 228 轮 ✓，与 `Map.forEach` / `Array.prototype.forEach` 同一条口径 ✓）。
    if (failed !== null && failed()) return Value.Undefined();
  }
  return Value.Undefined();
}
if (id === SetClear) {
  table.Get(values.Ref).AsArray().Truncate(0);
  WriteOwn(room, NeverCall, table, self, "size", Value.FromInt(0));
  return Value.Undefined();
}
// ---- 第 324 轮：ES2025 的集合运算六个 ----
//
// **它们与上面八个是两件事** ✓：上面那些改的是**接收者自己** ✓（`add` / `delete` / `clear` ✓），
// 这六个**一个都不改** ✗——造一个**新的 `Set`** ✓（四个）或答**一个是非** ✓（两个）。
//
// **另一个集合到这一层已经是数组** ✓（`install.xl.md` 那一趟 `IterDrain` ✓，
// 与 `new Set(生成器)` 同一条路 ✓）——所以这里只需要**线性找** ✓
// （`SameValueZero` ✓，与 `has` / `delete` 同一个表 ✓，`NaN` 于是也对 ✓）。
// **`null` / `undefined` 按空集算** ✓（与 `new Set(undefined)` 同一条口径 ✓）。
if (id === SetUnion || id === SetIntersection || id === SetDifference
  || id === SetSymmetricDifference || id === SetSubsetOf || id === SetDisjointFrom) {
  let other: HeapArray | null = null;
  if (args.length > 0 && args[0].Tag === ValueTag.Array) other = table.Get(args[0].Ref).AsArray();
  const mine = table.Get(values.Ref).AsArray();
  if (id === SetSubsetOf || id === SetDisjointFrom) {
    // **两格是一对反过来的问法** ✓：`isSubsetOf` 问「我每一个都在不在它里面」✓、
    // `isDisjointFrom` 问「有没有一个在它里面」✓——**共用一个循环** ✓，
    // 分开写就是两处会漂的答案 ✓（`!shared` 与 `missing` 是同一件事的两种说法 ✓）。
    let shared = false;
    let missing = false;
    for (let i = 0; i < mine.GetLength(); i++) {
      if (mine.IsHole(i)) continue;
      if (SetArrayHas(table, other, mine.GetAt(i))) shared = true;
      else missing = true;
    }
    return Value.FromBool(id === SetSubsetOf ? !missing : !shared);
  }
  const created = InvokeSet(room, protos, table, null, SetCtor, Value.Undefined(), []);
  // **一趟走自己那一侧** ✓：`union` 全要 ✓、`intersection` 要两边都有的 ✓、
  // `difference` 要**只有自己有**的 ✓、`symmetricDifference` 先要「只有自己有」的 ✓
  //（另一半在下面那一趟补 ✓）。
  for (let i = 0; i < mine.GetLength(); i++) {
    if (mine.IsHole(i)) continue;
    const value = mine.GetAt(i);
    const inOther = SetArrayHas(table, other, value);
    let keep = true;
    if (id === SetIntersection) keep = inOther;
    if (id === SetDifference || id === SetSymmetricDifference) keep = !inOther;
    if (!keep) continue;
    InvokeSet(room, protos, table, null, SetAdd, created, [value]);
  }
  // **`union` / `symmetricDifference` 的另一半** ✓（只在它俩身上 ✓）：
  // 把「只有另一边有」的那些补进来 ✓——`add` 自己会去重 ✓（`union` 里两边都有的那些
  // 于是不会进两次 ✓），所以这里**不必自己判重** ✓。
  if ((id === SetUnion || id === SetSymmetricDifference) && other !== null) {
    for (let i = 0; i < other.GetLength(); i++) {
      if (other.IsHole(i)) continue;
      const value = other.GetAt(i);
      if (id === SetSymmetricDifference && SetArrayHas(table, mine, value)) continue;
      InvokeSet(room, protos, table, null, SetAdd, created, [value]);
    }
  }
  return created;
}
throw new Error("unimplemented: set id " + id);
```

# method SetArrayHas:(table:HeapTable, source:HeapArray | null, value:Value)=>bool

**在「另一个集合」那个数组里找一格**（第 324 轮 ✓）——集合运算六个共用它 ✓。

**为什么要有它** ✗：四个运算与两个是非各写一遍「线性找」就是**六处会漂的判据** ✓，
而它们要的**是同一个问题** ✓（`SameValueZero` ✓，`NaN` 也算在里面 ✓）。

```ts
if (source === null) return false;
for (let i = 0; i < source.GetLength(); i++) {
  if (source.IsHole(i)) continue;
  if (SameValueZero(table, source.GetAt(i), value)) return true;
}
return false;
```

# method IndexOfSetValue:(table:HeapTable, values:Value, value:Value)=>int

**在线性表里找**（与 `Map` 的 `IndexOfKey` 同一条道理；严格相等）。

```ts
const array = table.Get(values.Ref).AsArray();
const length = array.GetLength();
for (let i = 0; i < length; i++) {
  if (array.IsHole(i)) continue;
  if (SameValueZero(table, array.GetAt(i), value)) return i;
}
return -1;
```
