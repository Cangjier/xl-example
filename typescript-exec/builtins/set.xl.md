# dependencies
```xl
import { Value, ValueTag } from "../../runtime/value.xl.md"
import { HeapTable, ObjectCharge, ValueCharge } from "../../runtime/heap.xl.md"
import { RoomChecker, RtCmpEqStrict, SameValueZero, IsCallableValue } from "../../runtime/rt.xl.md"
import { NativeCall, CallFailed, Protos, NewPlainObject, NewPlainArray } from "../../runtime/props.xl.md"
import { NeverCall, Units } from "./array.xl.md"
import { NameValue, ReadOwn, WriteOwn } from "./map.xl.md"
```

# namespace cangjie

**`Set`（v1 标准库名单里的一项）——与 `Map` 同一套配方，没有新的堆形状。**

一个 `Set` 就是一个**普通对象**，上面挂两样东西：

| 属性 | 是什么 |
| --- | --- |
| `__v` | 一个**数组**，按插入顺序放值（**可以是任何值**） |
| `size` | 一个**普通数字属性**，每次增删都更新 |

**它和 `Map` 共用三件小工具**（`NameValue` / `ReadOwn` / `WriteOwn`，从 `map.xl.md` import）——
那不是「谁属于谁」，而是这两个集合的**内部表示是同一件事**（一个对象 + 一个数组 + 一个数字）。
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
**已知差异**（`NativeCall` 只带一个实参 ✓）：给回调的是**值** ✓，JS 的 `(值, 值, 集合)` 后两个不传 ✗。

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
throw new Error("unimplemented: set method id " + id);
```

# method InstallSetMethods:(room:RoomChecker, table:HeapTable, target:Value)=>void

把方法挂到实例上（每个值都是带本模块号的宿主引用）。

```ts
const ids = [SetAdd, SetHas, SetDelete, SetValues, SetKeys, SetEntries, SetClear, SetForEach];
for (let i = 0; i < ids.length; i++) {
  const fn = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ids[i], 0));
  WriteOwn(room, NeverCall, table, target, SetMethodNameOf(ids[i]), fn);
}
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
  InstallSetMethods(room, table, created);
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
    call(args[0], Value.Undefined(), [table.Get(values.Ref).AsArray().GetAt(i), table.Get(values.Ref).AsArray().GetAt(i)]);
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
throw new Error("unimplemented: set id " + id);
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
