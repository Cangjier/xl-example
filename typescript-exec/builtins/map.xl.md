# dependencies
```xl
import { Value, ValueTag } from "../../runtime/value.xl.md"
import { HeapTable, ObjectCharge, ValueCharge } from "../../runtime/heap.xl.md"
import { RoomChecker, RtCmpEqStrict } from "../../runtime/rt.xl.md"
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

**`call` 用现成的 `NeverCall`**（`array.xl.md` 导出、`globals.xl.md` 也这么用）：
只写**数据属性**，而 `SetProperty` 只在**访问器**那条分支用 `call`。
用现成的空实现，就不必把宿主 ABI 撑大，也不必临时塞 `null` 进去。

**取属性值的路子（第 56 轮核实过，不是猜的）**：`FindProperty` 给一处命中
`PropRef { Owner, Index }`，值在 `table.Get(Owner).Props[Index].Value`
（`heap.xl.md` 的 `Property.Value`）。数组那一侧同样核实过：`GetLength()` /
`GetAt()` / `SetAt()` / `Push()` / `Truncate()` / `IsHole()`——**不是** `Length()` / `At()`。

**没做的**（明确抛，不静默少跑）：`entries` / `clear` / `forEach`
（`forEach` 要求宿主回调脚本闭包 = **重入执行器**，这一层没有）。

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
const ids = [MapSet, MapGet, MapHas, MapDelete, MapKeys, MapValues];
for (let i = 0; i < ids.length; i++) {
  const fn = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(ids[i], 0));
  WriteOwn(room, NeverCall, table, map, MethodNameOf(ids[i]), fn);
}
```

# method IndexOfKey:(table:HeapTable, keys:Value, key:Value)=>int

**在键数组里线性找**，用**严格相等**（`RtCmpEqStrict`：与 JS 的 SameValueZero
在整数 / 字符串 / 布尔 / 引用上一致；`NaN` 与 `±0` 的边角这一层没有）。

```ts
const array = table.Get(keys.Ref).AsArray();
for (let i = 0; i < array.GetLength(); i++) {
  if (array.IsHole(i)) continue;
  if (RtCmpEqStrict(table, array.GetAt(i), key).AsBool()) return i;
}
return -1;
```

# method InvokeMap:(room:RoomChecker, protos:Protos, table:HeapTable, id:int, self:Value, args:Array<Value>)=>Value

**Map 的构造函数与方法总入口**（号段 600..699）。

```ts
if (id === MapCtor) {
  const map = NewPlainObject(room, table, protos);
  WriteOwn(room, NeverCall, table, map, "__k", NewPlainArray(room, table, protos));
  WriteOwn(room, NeverCall, table, map, "__v", NewPlainArray(room, table, protos));
  WriteOwn(room, NeverCall, table, map, "size", Value.FromInt(0));
  InstallMapMethods(room, table, map);
  return map;
}
const keys = ReadOwn(room, table, self, "__k");
const values = ReadOwn(room, table, self, "__v");
const valuesArray = table.Get(values.Ref).AsArray();
if (id === MapSet) {
  const at = IndexOfKey(table, keys, args[0]);
  if (at >= 0) {
    valuesArray.SetAt(at, args[1]);
    return self;
  }
  if (!room(ObjectCharge * 2 + ValueCharge * 2)) throw new Error("out of room");
  table.Get(keys.Ref).AsArray().Push(args[0]);
  valuesArray.Push(args[1]);
  WriteOwn(room, NeverCall, table, self, "size", Value.FromInt(table.Get(keys.Ref).AsArray().GetLength()));
  return self;
}
if (id === MapGet) {
  const at = IndexOfKey(table, keys, args[0]);
  if (at < 0) return Value.Undefined();
  return valuesArray.GetAt(at);
}
if (id === MapHas) {
  return Value.FromBool(IndexOfKey(table, keys, args[0]) >= 0);
}
if (id === MapDelete) {
  const at = IndexOfKey(table, keys, args[0]);
  if (at < 0) return Value.FromBool(false);
  // **删中间一格要把后面的往前挪**：顺序是语义（`keys()` 按插入顺序），
  // 「拿最后一个填洞」会把顺序打乱。
  const keysArray = table.Get(keys.Ref).AsArray();
  const last = keysArray.GetLength() - 1;
  for (let i = at; i < last; i++) {
    keysArray.SetAt(i, keysArray.GetAt(i + 1));
    valuesArray.SetAt(i, valuesArray.GetAt(i + 1));
  }
  keysArray.Truncate(last);
  valuesArray.Truncate(last);
  WriteOwn(room, NeverCall, table, self, "size", Value.FromInt(last));
  return Value.FromBool(true);
}
if (id === MapKeys || id === MapValues) {
  const source = table.Get(id === MapKeys ? keys.Ref : values.Ref).AsArray();
  const out = NewPlainArray(room, table, protos);
  const outArray = table.Get(out.Ref).AsArray();
  for (let i = 0; i < source.GetLength(); i++) {
    if (source.IsHole(i)) continue;
    outArray.Push(source.GetAt(i));
  }
  return out;
}
throw new Error("unimplemented: map id " + id);
```
