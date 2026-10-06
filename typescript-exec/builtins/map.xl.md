# dependencies
```xl
import { Value, ValueTag } from "../../runtime/value.xl.md"
import { HeapTable, ObjectCharge, ValueCharge } from "../../runtime/heap.xl.md"
import { RoomChecker, RtCmpEqStrict, SameValueZero, IsCallableValue } from "../../runtime/rt.xl.md"
import { NativeCall, CallFailed, Protos, SetProperty, SetHiddenProperty, FindProperty, NewPlainObject, NewPlainArray } from "../../runtime/props.xl.md"
import { NeverCall, AttachArrayIterator } from "./array.xl.md"
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
**回调收 `(值, 键, 映射)` 三格** ✓（第 142 轮给了前两格 ✓、**第 288 轮补上第三格** ✓）——
第 116 轮时 `NativeCall` 只带**一个**实参 ✗（那时给回调的是值 ✓，后两个不传 ✓），
第 142 轮把实参表开宽成**一整个数组** ✓，前两格当场就对了 ✓；第三格一直缺 ✓
（`self` 就在手边 ✓，见下面那一支 ✓）。

# const MapGroupBy:int = 660

**`Map.groupBy(可迭代, 回调)`**（第 327 轮 ✓）——**静态方法** ✓，号落在
**`600..610` 之外** ✗（那一段满了 ✓，而 `611..659` 是 `Set` 的 ✓）——
所以它是**下一位 660** ✓，分派那一句写成「`600..610` **或** `660`」 ✓
（`install.xl.md` ✓；**段号不连续要写在明处** ✗：将来再加一个 Map 的静态方法时，
「下一个号是几」不能按 `610 + 1` 推 ✓）。

**它为什么不能直接挂在 `Map` 那个值上** ✗（这一格量出来的第一件事 ✓）：
`Map` 这一格是**宿主引用值** ✓——它**没有属性表** ✗，所以「往 `Map` 上挂一格静态方法」
根本挂不上去 ✓（`Object.groupBy` 能挂 ✓，是因为 `Object` 本来就是普通对象 ✓）。
修法与第 183 轮 `Symbol` 那条**一字不差** ✓：把 `Map` 改成
**带可调用载荷的对象** ✓（`AttachCallable` ✓）——`new Map()` 照旧走 `Op.New` 的
宿主那一条 ✓（`IsHostCallable` **两种壳都认** ✓，第 145 轮 ✓），
`instanceof Map` 照旧走登记表 ✓（`RegisterConstructorProto` 按**号**认 ✓，与壳无关 ✓）。

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

**内部件与方法都是「不可枚举」的**（第 194 轮）：JS 里 `Object.keys(new Map())` 是 `[]`、
`JSON.stringify(new Map())` 是 `{}`——那些东西（`__k` / `__v` / `size` 与那些方法）
**不是「可枚举的自有属性」**。本仓原来把它们写成普通属性，于是 `Object.keys` 给 12、
JSON 也跟着漏出去（**静默错值**，普查里 `map-internal-slots` 那条就是这么红的）。

**这一处是 Map 与 Set 全部写入的唯一出口**（Set 也 import 它），
所以标志位只要在这里对一次。

```ts
SetHiddenProperty(room, table, self, NameValue(table, name), value);
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

**在键数组里线性找**，用 **SameValueZero** ✓（第 207 轮改 ✓，`rt.xl.md` 那张具名的表 ✓）。

**原来借的是 `===`** ✗（`RtCmpEqStrict` ✓），注释里写着「与 JS 的 SameValueZero 在整数 / 字符串 /
布尔 / 引用上一致；`NaN` 与 `±0` 的边角这一层没有」✓——**`±0` 那条其实早就被 `RtCmpEqStrict`
自己解决了** ✓（第 129 轮：`-0 === 0` 为真 ✓），而 **`NaN` 那条现在碰得到了** ✓
（`Number.NaN` 第 206 轮装上 ✓）：`new Map([[NaN, "x"]]).get(NaN)` 在 JS 里是 `"x"` ✓，
借 `===` 给的是 `undefined` ✗（判据 `map-object-keys` 现场红的 ✓）。

```ts
const keysArray = table.Get(keys.Ref).AsArray();
const length = keysArray.GetLength();
for (let i = 0; i < length; i++) {
  if (keysArray.IsHole(i)) continue;
  if (SameValueZero(table, keysArray.GetAt(i), key)) return i;
}
return -1;
```

# method InvokeMap:(room:RoomChecker, protos:Protos, table:HeapTable, call:NativeCall | null, id:int, self:Value, args:Array<Value>, failed:CallFailed | null = null)=>Value

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
  // **生成器第 199 轮通了** ✓：`new Map(生成器)` 现在给的是全部产出 ✓——
  // 收成数组那一步在**号段翻译那一层** ✓（`install.xl.md` 的 `InvokeWithSink` ✓），
  // 因为这一块**不能** import 它 ✓（会成环 ✗）。所以到这里 `args[0]` **一定是数组** ✓
  // （或者 `null` / `undefined` ✓ = 空表 ✓）——**这一支一个字都没改** ✓。
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
if (id === MapGroupBy) {
  // **`Map.groupBy(可迭代, 回调)`** ✓（第 327 轮 ✓）——与 `Object.groupBy` **同一套分组** ✓，
  // 差的是**分组键是任意值** ✓（对象那一版只能按字符串键 ✓——对象的键是字符串 ✓）。
  // **两处不是抄一遍** ✗：键那一格本来就不同（一边 `ToString` ✓、一边原样 ✓），
  // 但**回调的调用形状**（每个元素调一次 ✓、`(元素, 下标)` 两格 ✓）与它**一字不差** ✓。
  //
  // **它必须排在 `ReadOwn` 那两句之前** ✗（第一版写在函数末尾 ✓，报
  // `unimplemented: not a Map receiver (no __k)` ✓）：它是**静态**方法 ✓，
  // 接收者是 `Map` **那个对象**（没有 `__k` ✓）——排在后面就等于先拿它当实例读了 ✓。
  // 「静态方法要先于实例那几句」这条次序与 `MapCtor` 那一支**同一个位置** ✓。
  //
  // **源只收数组** ✗（与 `Object.groupBy` 同一条 ✓）：可迭代那一半在
  // `install.xl.md` 的号段翻译那一趟**已经收成数组** ✓（与 `new Map(生成器)` 同一处 ✓）。
  //
  // **桶用 `Map` 自己装** ✓：`get` 找、没有就 `set` 一个新数组 ✓——
  // 于是「键是同一个值时合成一组」交给 `SameValueZero` 那一位 ✓（`NaN` ✓、对象引用 ✓，
  // 与 `Map` 别的分支**同一张表** ✓）。
  if (args.length < 2) throw new Error("Map.groupBy needs two arguments");
  if (!IsCallableValue(table, args[1])) {
    throw new Error("Map.groupBy needs a function as the second argument");
  }
  if (call === null) {
    throw new Error("Map.groupBy needs a call channel (the host must pass one)");
  }
  if (args[0].Tag !== ValueTag.Array) {
    throw new Error("unimplemented: Map.groupBy over a value that is not an array");
  }
  const groupSource = table.Get(args[0].Ref).AsArray();
  const grouped = InvokeMap(room, protos, table, call, MapCtor, Value.Undefined(), []);
  for (let i = 0; i < groupSource.GetLength(); i++) {
    const member = groupSource.GetAt(i);
    const bucketKey = call(args[1], Value.Undefined(), [member, Value.FromInt(i)]);
    let bucket = InvokeMap(room, protos, table, call, MapGet, grouped, [bucketKey]);
    if (bucket.Tag !== ValueTag.Array) {
      // **先问 room、再分配** ✓（与 `Object.groupBy` 那一条同一个理由 ✓）：
      // `MapSet` 自己也会问 room ✓——那一次如果触发了回收，这个**还没有人指着**的
      // 新数组就会被收走 ✓。
      if (!room(ObjectCharge * 2 + ValueCharge * 2)) throw new Error("out of room");
      bucket = NewPlainArray(room, table, protos);
      InvokeMap(room, protos, table, call, MapSet, grouped, [bucketKey, bucket]);
    }
    if (!room(ValueCharge)) throw new Error("out of room");
    table.Get(bucket.Ref).AsArray().Push(member);
  }
  return grouped;
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
  // **真迭代器那一套也要挂上** ✓（第 331 轮 ✓）：`map.keys().next()` 是**日常写法** ✓
  //（「拿第一个键」那一句 ✓），而本仓的 `keys()` 返回的是**数组** ✓、
  // 数组上没有 `next` ✗ ⇒ 报 `cannot call a non-closure value` ✓
  //（听起来像「那个方法没做」✗，其实是**接线漏了一族** ✓）。
  // 用的是**同一个** `AttachArrayIterator` ✓（第 279 轮做出的那两格 ✓，见 `array.xl.md` ✓）——
  // **一处实现、四个用户** ✓（数组三格 ✓、`Map` ✓、`Set` ✓）。
  AttachArrayIterator(room, table, out.Ref);
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
  AttachArrayIterator(room, table, out.Ref);
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
    // **第三格是「这个 Map 自己」** ✓（第 288 轮 ✓）：JS 的签名是 `(值, 键, 映射)` ✓——
    // 原来只给前两格 ✗，于是 `m.forEach((v, k, self) => self.size)` 里 `self` 是 `undefined` ✓
    // ⇒ 读 `.size` 当场炸 ✓（判据 `map-iteration-and-foreach` 量到的就是它 ✓）。
    // **给的就是接收者 `self`** ✓（不是另造一个包装 ✓——JS 给的是**同一个对象** ✓，
    // 判据里那一句 `self === m` 量的就是它 ✓）。
    call(args[0], Value.Undefined(), [table.Get(values.Ref).AsArray().GetAt(i),
      table.Get(keys.Ref).AsArray().GetAt(i), self]);
    // **回调抛出就收摊** ✓（第 228 轮 ✓，与 `Array.prototype.forEach` 那条同一条口径 ✓）：
    // 不问这一句，回调里那次 `throw` 要等整张表走完才冒出来 ✓
    //（**静默**那一类 ✗：多跑的每一轮都可能已经改了脚本自己的状态 ✓）。
    if (failed !== null && failed()) return Value.Undefined();
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
