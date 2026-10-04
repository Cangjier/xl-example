# dependencies
```xl
import { Value, ValueTag } from "../../runtime/value.xl.md"
import { HeapTable, ObjectCharge, ValueCharge } from "../../runtime/heap.xl.md"
import { RoomChecker, RtCmpEqStrict, IsCallableValue } from "../../runtime/rt.xl.md"
import { NativeCall, Protos, SetProperty, FindProperty, NewPlainObject, NewPlainArray } from "../../runtime/props.xl.md"
import { NeverCall } from "./array.xl.md"
```

# namespace cangjie

**`Map`（v1 标准库名单里的一项）——没有新的堆形状。**

一个 `Map` 就是一个**普通对象**，上面挂三样东西：

| 属性 | 是什么 |
| --- | --- |
| `__k` | 一个**数组**，按插入顺序放键（**可以是任何值**，对象引用也行） |
| `__v` | 一个数组，同下标放对应的值 |
| `size` | 一个**普通数字属性**，每次增删都更新 |

**为什么键能是任意值**：普通对象的**属性名**必须是字符串，键不能直接当属性名；
放进**数组元素**里就没有这个限制。代价是查找**线性**——**性能是 P4 的事**，
这一层只保证**语义对**。

**方法挂在实例自己身上**（不是原型上）：值是**带本模块号的宿主引用**。
这样**不必给引擎加 `Protos.Map`**，也不必让引擎认识 `Map` 这个名字。

**`AsArray()` 拿到的是「视图」，必须每次用时现取**（这一轮踩的坑）：
把 `table.Get(ref).AsArray()` 存进一个局部量、之后又往同一个数组里 `Push`，
`Push` 换了底层存储之后那个局部量就**失效**了——症状是「键数组对、值数组错位」，
`get` 回来是默认值 `0`，而线索离现场很远。

**调用方要三样齐全**（判据那边也一样）：降级时声明名单、求值时给环境对象、
装宿主调用通道。少前两样时 `Map` 是 `undefined`，报的却是「calling a non-closure value」。

**没做的**（明确抛，不静默少跑）：`forEach`
（`forEach` 要求宿主回调脚本闭包 = **重入执行器**，这一层没有）。

**第 107 轮补了两个**：`entries()`（给 `[键, 值]` 对的数组——正是 JS 里
`for (const e of map)` 拿到的形状，所以 `e[0]`/`e[1]` 两边写法一致）与 `clear()`。
**直接迭代 Map 本体**（`for (const x of map)`）仍不支持 ✗：它要一条「把语言对象转成
引擎认得的可迭代物」的路，而那条路会牵动**每个宿主**的接线（第 106 轮实测、已回退并记账 ✗）。

# const MapCtor:int = 601
`new Map()` 的号。
# const MapSet:int = 602
`set(k, v)` 的号（返回自己，好接链式写法）。
# const MapGet:int = 603
`get(k)` 的号。
# const MapHas:int = 604
`has(k)` 的号。
# const MapDelete:int = 605
`delete(k)` 的号。
# const MapKeys:int = 606
`keys()` 的号（**返回数组**：引擎的迭代只认数组与生成器）。
# const MapValues:int = 607
`values()` 的号（同上）。
# const MapEntries:int = 608
`entries()` 的号（**返回 `[键, 值]` 对的数组**——这正是 JS 里 `for (const e of map)` 拿到的形状 ✓，
所以脚本里 `e[0]` / `e[1]` 的写法在两边都一样 ✓）。
# const MapClear:int = 609
`clear()` 的号（清空并返回 `undefined`）。
# const MapForEach:int = 610
`forEach(回调)` 的号——**这是建库层第一次回调脚本**（第 116 轮）。

**它靠 `NativeCall` 重入分派循环** ✓（访问器 getter/setter 早就走这条路 ✓）：
内建把回调当普通值调一次，`vm.xl.md` 的 `Native` 把机器包成那个回调 ✓。
**已知差异**（`NativeCall` 只带**一个**实参 ✓）：这里给回调的是**值** ✓，
JS 的 `(值, 键, 映射)` 后两个**不传** ✗——`forEach(v => …)` 这种写法两边一致 ✓。

# method Units:(text:string)=>Array<int>

名字 → 码元（与别的建库文件里那一个同形）。

```ts
const out = [];
for (let i = 0; i < text.length; i++) out.push(text.charCodeAt(i));
return out;
```

# method NameValue:(table:HeapTable, name:string)=>Value

属性名 → 值（统一在这里造，避免各处拼错）。

```ts
return Value.FromString(table.CreateString(Units(name)));
```

# method MethodNameOf:(id:int)=>string

号 → 方法名（**这张表只此一处**）。

```ts
if (id === MapSet) return "set";
if (id === MapGet) return "get";
if (id === MapHas) return "has";
if (id === MapDelete) return "delete";
if (id === MapKeys) return "keys";
if (id === MapValues) return "values";
if (id === MapEntries) return "entries";
if (id === MapClear) return "clear";
if (id === MapForEach) return "forEach";
throw new Error("unimplemented: map method id " + id);
```

# method ReadOwn:(room:RoomChecker, table:HeapTable, self:Value, name:string)=>Value

读实例上的一个自有属性。**不是 Map（或者缺这一格）就抛**——
静默当成空表更坏：那会让 `m.size` 变成 `undefined` 而没人知道为什么。

```ts
const key = NameValue(table, name);
const found = FindProperty(room, table, self.Ref, key);
if (found === null) throw new Error("unimplemented: not a Map receiver (no " + name + ")");
return table.Get(found.Owner).Props[found.Index].Value;
```

# method WriteOwn:(room:RoomChecker, call:NativeCall, table:HeapTable, self:Value, name:string, value:Value)=>void

写实例上的一个自有属性（数据属性）。

```ts
SetProperty(room, call, table, self, NameValue(table, name), value);
```

# method InstallMapMethods:(room:RoomChecker, table:HeapTable, map:Value)=>void

把方法挂到实例上（每个值都是带本模块号的宿主引用）。

```ts
const ids = [MapSet, MapGet, MapHas, MapDelete, MapKeys, MapValues, MapEntries, MapClear,
  MapForEach];
for (let i = 0; i < ids.length; i++) {
  const fn = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ids[i], 0));
  WriteOwn(room, NeverCall, table, map, MethodNameOf(ids[i]), fn);
}
```

# method IndexOfKey:(table:HeapTable, keys:Value, key:Value)=>int

**在键数组里线性找**，用**严格相等**（`RtCmpEqStrict`：与 JS 的 SameValueZero
在整数 / 字符串 / 布尔 / 引用上一致；`NaN` 与 `±0` 的边角这一层没有）。

```ts
const keysArray = table.Get(keys.Ref).AsArray();
const length = keysArray.GetLength();
for (let i = 0; i < length; i++) {
  if (keysArray.IsHole(i)) continue;
  if (RtCmpEqStrict(table, keysArray.GetAt(i), key).AsBool()) return i;
}
return -1;
```

# method InvokeMap:(room:RoomChecker, protos:Protos, table:HeapTable, call:NativeCall | null, id:int, self:Value, args:Array<Value>)=>Value

**Map 的构造函数与方法总入口**（号段 600..699）。

**每一处数组都现取视图**（`table.Get(句柄).AsArray()`）：句柄是稳定的，
**视图不是**——`Push` 换存储之后老视图就废了。

```ts
if (id === MapCtor) {
  const map = NewPlainObject(room, table, protos);
  // **实例挂在 `Protos.Map` 上**（第 138 轮）✗：`new Map() instanceof Map` 要在链上
  // 找到那一格 ✓——不挂的话链上是 `Object.prototype` ✓，于是 `instanceof Map` 给
  // **`false`** ✗（而 `instanceof Object` 是对的 ✓，又是一种「一半对」✓）。
  // **方法仍然挂在实例自己身上** ✓（`InstallMapMethods` ✓）——这两件事不冲突 ✓：
  // 原型只负责「我是哪一族」✓，方法今天跟着实例走 ✓（见 `Protos.Map` 那一段的说明 ✓）。
  table.Get(map.Ref).Proto = protos.Map;
  WriteOwn(room, NeverCall, table, map, "__k", NewPlainArray(room, table, protos));
  WriteOwn(room, NeverCall, table, map, "__v", NewPlainArray(room, table, protos));
  WriteOwn(room, NeverCall, table, map, "size", Value.FromInt(0));
  InstallMapMethods(room, table, map);
  // **初始条目**（第 130 轮）：`new Map([[k, v], …])` ✓——实参是**数组**的那一种 ✓
  // （`new Map(Object.entries(o))` 就是这个形状 ✓，日常代码里最常见 ✓）。
  // **其余形态照旧空表** ✓：生成器要 `iter_next`（这一层够不着 ✗）；
  // 数组里不是两格数组的项**跳过** ✓（JS 会当场抛 ✗——**这一点是记着的差异** ✓：
  // 静默跳过比静默塞半个键值对好 ✓，但比不上 JS 的抛 ✗，记在台账 ✓）。
  // **复用 `set` 那条路** ✓：同一个键覆盖、`size` 跟着涨，都不必写第二遍 ✓。
  if (args.length > 0 && args[0].Tag === ValueTag.Array) {
    const pairs = table.Get(args[0].Ref).AsArray();
    for (let i = 0; i < pairs.GetLength(); i++) {
      const pair = pairs.GetAt(i);
      if (pair.Tag !== ValueTag.Array) continue;
      const entry = table.Get(pair.Ref).AsArray();
      if (entry.GetLength() < 2) continue;
      const pairArgs: Value[] = [entry.GetAt(0), entry.GetAt(1)];
      InvokeMap(room, protos, table, null, MapSet, map, pairArgs);
    }
  }
  return map;
}
const keys = ReadOwn(room, table, self, "__k");
const values = ReadOwn(room, table, self, "__v");
if (id === MapSet) {
  const at = IndexOfKey(table, keys, args[0]);
  if (at >= 0) {
    table.Get(values.Ref).AsArray().SetAt(at, args[1]);
    return self;
  }
  if (!room(ObjectCharge * 2 + ValueCharge * 2)) throw new Error("out of room");
  table.Get(keys.Ref).AsArray().Push(args[0]);
  table.Get(values.Ref).AsArray().Push(args[1]);
  WriteOwn(room, NeverCall, table, self, "size",
    Value.FromInt(table.Get(keys.Ref).AsArray().GetLength()));
  return self;
}
if (id === MapGet) {
  const at = IndexOfKey(table, keys, args[0]);
  if (at < 0) return Value.Undefined();
  return table.Get(values.Ref).AsArray().GetAt(at);
}
if (id === MapHas) {
  return Value.FromBool(IndexOfKey(table, keys, args[0]) >= 0);
}
if (id === MapDelete) {
  const at = IndexOfKey(table, keys, args[0]);
  if (at < 0) return Value.FromBool(false);
  // **删中间一格要把后面的往前挪**：顺序是语义（`keys()` 按插入顺序），
  // 「拿最后一个填洞」会把顺序打乱。
  const last = table.Get(keys.Ref).AsArray().GetLength() - 1;
  for (let i = at; i < last; i++) {
    table.Get(keys.Ref).AsArray().SetAt(i, table.Get(keys.Ref).AsArray().GetAt(i + 1));
    table.Get(values.Ref).AsArray().SetAt(i, table.Get(values.Ref).AsArray().GetAt(i + 1));
  }
  table.Get(keys.Ref).AsArray().Truncate(last);
  table.Get(values.Ref).AsArray().Truncate(last);
  WriteOwn(room, NeverCall, table, self, "size", Value.FromInt(last));
  return Value.FromBool(true);
}
if (id === MapKeys || id === MapValues) {
  const out = NewPlainArray(room, table, protos);
  const length = table.Get(id === MapKeys ? keys.Ref : values.Ref).AsArray().GetLength();
  for (let i = 0; i < length; i++) {
    const source = table.Get(id === MapKeys ? keys.Ref : values.Ref).AsArray();
    if (source.IsHole(i)) continue;
    table.Get(out.Ref).AsArray().Push(source.GetAt(i));
  }
  return out;
}
if (id === MapEntries) {
  // **`[键, 值]` 对的数组**——JS 里 `for (const e of map)` 拿到的正是这个形状，
  // 所以脚本里 `e[0]` / `e[1]` 两边写法一样 ✓（**直接迭代 Map 本体**仍不支持 ✗，见文首）。
  const out = NewPlainArray(room, table, protos);
  const length = table.Get(keys.Ref).AsArray().GetLength();
  for (let i = 0; i < length; i++) {
    // **视图每次现取**：里面两次 `Push` 都会换底层存储。
    if (table.Get(keys.Ref).AsArray().IsHole(i)) continue;
    const pair = NewPlainArray(room, table, protos);
    table.Get(pair.Ref).AsArray().Push(table.Get(keys.Ref).AsArray().GetAt(i));
    table.Get(pair.Ref).AsArray().Push(table.Get(values.Ref).AsArray().GetAt(i));
    table.Get(out.Ref).AsArray().Push(pair);
  }
  return out;
}
if (id === MapForEach) {
  // **回调脚本**（第 116 轮）：`call` 会重入分派循环 ✓，所以这里能跑脚本闭包 ✓。
  // **快照一次长度**：回调里可以改这个 Map ✓（JS 也允许）——按当下这一份走，改了的下一轮才见 ✓。
  // **`call` 也要判空**：宿主没接回调通道时，这里必须**响亮**说清（而不是「调用了非闭包」）✗。
  if (args.length < 1 || !IsCallableValue(table, args[0]) || call === null) {
    throw new Error("forEach needs a function and a call channel (the host must pass one)");
  }
  const eachTotal = table.Get(keys.Ref).AsArray().GetLength();
  for (let i = 0; i < eachTotal; i++) {
    if (table.Get(keys.Ref).AsArray().IsHole(i)) continue;
    // **回调收 `(值, 键)`**（第 142 轮 ✓）：实参表那一格开宽之后，这里就能把**键**也递过去 ✓——
    // 上一轮之前只能给一个 ✓（`NativeCall` 只带一个实参 ✗），
    // 于是 `m.forEach((v, k) => …)` 里的 `k` 是 `undefined` ✗（**静默错值** ✓，
    // 普查里那一条就是它：`map-iterate` 打出 `undefined1` 而不是 `a1` ✓）。
    // **键是现成的值** ✓（`keys` 那个数组里存的就是它 ✓）——不要再包一层 ✗。
    call(args[0], Value.Undefined(), [table.Get(values.Ref).AsArray().GetAt(i),
      table.Get(keys.Ref).AsArray().GetAt(i)]);
  }
  return Value.Undefined();
}
if (id === MapClear) {
  // **两个数组一起截到 0**，再把 `size` 写回 0——顺序无所谓（中途没有别人看得见）。
  table.Get(keys.Ref).AsArray().Truncate(0);
  table.Get(values.Ref).AsArray().Truncate(0);
  WriteOwn(room, NeverCall, table, self, "size", Value.FromInt(0));
  return Value.Undefined();
}
throw new Error("unimplemented: map id " + id);
```
