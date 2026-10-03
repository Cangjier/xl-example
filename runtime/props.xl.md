# dependencies
```xl
import { Value, ValueTag } from "./value.xl.md"
import { HeapTable, Property, PropertyKind, ObjectCharge, PropertyCharge } from "./heap.xl.md"
import { PropertyFlagWritable, PropertyFlagConfigurable } from "./heap.xl.md"
import { RootSet } from "./gc.xl.md"
import { RoomChecker } from "./rt.xl.md"
```

# namespace cangjie

**属性与原型**：读写一个属性名时到底发生什么。契约见
[docs/runtime-architecture.md](../docs/runtime-architecture.md) §3 / §4。

这一层回答四个问题：**找不找得到**（沿原型链）、**找到的是什么**（数据还是访问器）、
**写到哪里**（找到的那个拥有者，还是接收者自己）、**找不到怎么办**（给 `undefined` /
新建一个自有属性）。

**为什么单开一份**：`heap.xl.md` 只管「属性怎么存」，这里管「属性怎么找、怎么写」。
存储与语义分开，回收器与装载验证才只需要看前者。

**v1 的两处明确缺口**（都抛宿主错误，**不静默给近似值**）：

1. **只读 / 不可配置 / 有 getter 没 setter**：这些在严格模式下该抛 `TypeError`，
   而错误对象那一层还没有——这一轮**抛宿主错误**（判据因此能看见「它确实拦住了」）。
2. **非数字下标要走 `ToString`**（`a["0"]`）——`ToString` 还没实现，所以**抛**。

**访问器已经能跑**：它靠 `NativeCall` 重入分派循环（见下面那个类型），
`this` 永远是**接收者**。

**原型链不会成环**：v1 没有「改原型」的指令（`new_object` / `new_array` 给的是固定的
内建原型）。但这一层仍然给一个**深度上限**（`MaxProtoDepth`）：万一哪天加了改原型的路，
也不会变成死循环。

# type NativeCall = (callee:Value, thisValue:Value, argument:Value, hasArgument:boolean)=>Value

**从语义层回调进脚本**：`callee` 用 `thisValue` 当 `this` 调一次，返回它的返回值；
`hasArgument` 为真时把 `argument` 当第一个实参（setter 用）。

与 `RoomChecker` 同一形状、同一理由：依赖方向只能是 `vm → props`（机器用语义），
反过来就成环了。**访问器**（getter / setter）就是它的第一个用户——它必须**重入分派循环**
才能跑脚本函数，而那台循环在 `vm.xl.md` 手里。

**回调不是随便能重入的**：机器那边有**重入深度上限**（安全第 4 层）——
脚本可以在 getter 里再读同一个属性，没有上限就是栈溢出的另一种写法。

# const MaxProtoDepth:int = 256

原型链深度上限。超了就抛——**它只可能来自引擎 bug**（或者是将来某条改原型的路没挡住环）。

# class PropRef

一处命中的属性：**拥有者 + 它在拥有者属性表里的下标**。

为什么要带着拥有者：**访问器的 `this` 是接收者，不是拥有者**（`a.m()` 里 `this` 是 `a`），
所以光有 `Property` 不够。数据属性也留着它：**写操作要写回拥有者那一格**。

**不是堆对象**（它就是一次查找的临时结果）：持有的是句柄，而那个句柄指向的对象必然从
接收者可达（接收者就在槽里），所以这一趟不会遇到「回收器把中间结果收掉」。

## field Owner:int = 0

拥有者的句柄。

## field Index:int = 0

在 `Props` 里的下标。

## constructor:(owner:int, index:int)=>void

记一处命中。

```ts
this.Owner = owner;
this.Index = index;
```

# class Protos

**内建原型表**：三个空对象，语言的建库层将来往里填方法。

`runtime/` 提供它不算越界：**「普通对象有原型」「数组有原型」是这个对象模型的结构事实**，
不是某门语言的语法糖。往里填什么（`Array.prototype.map` 那些）才是语言层的事
（`typescript-exec/builtins/`）。

三个原型是**常驻根**（`vm.xl.md` 的根快照要把它们算进去）：它们是所有对象的祖先，
被收掉的话整棵原型链当场断掉。

## field Object:int = 0

普通对象的原型。

## field Array:int = 0

数组的原型。

## field Function:int = 0

函数（闭包 / 内建）的原型。

## field String:int = 0

字符串的原型。

**它是「原始值接收者」的入口**：原始值自己没有属性表（`length` 是结构属性 ✓），
所以 `"abc".charAt(1)` 这类读写**必须**从这一条链上找——`GetProperty` 里那一段就是它。

## constructor:(objectHandle:int, arrayHandle:int, functionHandle:int, stringHandle:int)=>void

记下四个句柄。

```ts
this.Object = objectHandle;
this.Array = arrayHandle;
this.Function = functionHandle;
this.String = stringHandle;
```

## method AddRoots:(roots:RootSet)=>void

把四个原型加进根快照。

```ts
if (this.Object > 0) roots.AddHandle(this.Object);
if (this.Array > 0) roots.AddHandle(this.Array);
if (this.Function > 0) roots.AddHandle(this.Function);
if (this.String > 0) roots.AddHandle(this.String);
```

# method InitProtos:(room:RoomChecker, table:HeapTable)=>Protos

造四个空原型。**要先问 room**（要造四个堆对象）。

```ts
if (!room(ObjectCharge * 4)) {
  throw new Error("out of room");
}
return new Protos(table.CreateObject(), table.CreateObject(), table.CreateObject(), table.CreateObject());
```

# method NeverRoom:(bytes:int)=>bool

一个「永远说不行」的 room 判据，给**不分配的查询**用。

`FindProperty` 的签名里带 `room` 是为了它将来可能要为内联缓存分配东西；今天它一次都不分配，
所以查询路径传这个进来——**语义上明确「这条路上不会分配」**。

```ts
return false;
```

# method IsLengthKey:(table:HeapTable, key:Value)=>bool

这个键是不是 `"length"`。

数组与字符串的 `length` 是**结构属性**（不在属性表里），读与写都要先认出它。
**判定只写在这里一处**：散成两份的话，总有一天一份会漂。

**按码元逐个比，不造中间字符串**：这条路径在热路径的第一步上，而造一个字符串要分配。

```ts
if (key.Tag !== ValueTag.String) return false;
const units = table.Get(key.Ref).AsString().Units;
if (units.length !== 6) return false;
if (units[0] !== 108) return false;
if (units[1] !== 101) return false;
if (units[2] !== 110) return false;
if (units[3] !== 103) return false;
if (units[4] !== 116) return false;
if (units[5] !== 104) return false;
return true;
```

# method KeyMatches:(table:HeapTable, property:Property, key:Value)=>bool

这一格属性的键是不是 `key`。

**字符串按内容比、符号按身份比**——这就是「字符串是原始值、符号是身份」在属性表上的落点
（`heap.xl.md` 的 `Property.Key` 只存句柄，分叉在这里）。

```ts
const stored = table.Get(property.Key);
if (key.Tag === ValueTag.String) {
  if (stored.Tag !== ValueTag.String) return false;
  return stored.AsString().Equals(table.Get(key.Ref).AsString());
}
if (key.Tag === ValueTag.Symbol) {
  if (stored.Tag !== ValueTag.Symbol) return false;
  return stored.AsSymbol().Id === table.Get(key.Ref).AsSymbol().Id;
}
throw new Error("property keys must be strings or symbols");
```

# method FindProperty:(room:RoomChecker, table:HeapTable, receiver:int, key:Value)=>PropRef | null

沿原型链找 `key`，返回**第一处**命中的（自有属性优先）。

**返回 `null` 是正常结果**（属性不存在），不是错误。深度上限见 `MaxProtoDepth`。

```ts
let current = receiver;
let depth = 0;
while (current > 0) {
  if (depth > MaxProtoDepth) throw new Error("prototype chain is too deep");
  const item = table.Get(current);
  for (let i = 0; i < item.Props.length; i++) {
    if (KeyMatches(table, item.Props[i], key)) return new PropRef(current, i);
  }
  current = item.Proto;
  depth = depth + 1;
}
return null;
```

# method HasProperty:(table:HeapTable, receiver:int, key:Value)=>bool

`key in receiver`：**沿原型链找得到就算**（`in` 的语义就是它，不是「自有属性」）。

```ts
return FindProperty(NeverRoom, table, receiver, key) !== null;
```

# method GetProperty:(room:RoomChecker, call:NativeCall, protos:Protos, table:HeapTable, receiver:Value, key:Value)=>Value

读属性。

三条分支，**顺序是语义**：

1. **数组 / 字符串的 `length`**：结构属性，先答；
2. **沿原型链找**：数据属性给值；**访问器调它的 getter**（`this` 是**接收者**，不是拥有者）；
3. **找不到给 `undefined`**——**不是错误**（`obj.missing` 是 `undefined`，这是 JS 的日常）。

**原始值接收者**（`String` / `Symbol` / 数字 / 布尔）没有属性表，所以第 2 步从
**它的原型**起步（今天只做字符串 → `Protos.String`）——`"abc".charAt(1)` 靠的就是它。
**数字与布尔今天仍给 `undefined`**（还没有它们的原型），这一条写在这里，
而不是让它们静默地「看起来像没有方法」。

**原型表要传进来**：原始值没有「自己那一格」可以顺着走，起点只能由调用方给。
对象那条路不靠它（对象自带 `Proto`），但两条路共用一个签名更不容易分叉。

```ts
if (IsLengthKey(table, key)) {
  if (receiver.Tag === ValueTag.Array) return Value.FromInt(table.Get(receiver.Ref).AsArray().GetLength());
  if (receiver.Tag === ValueTag.String) return Value.FromInt(table.Get(receiver.Ref).AsString().GetLength());
}
if (!receiver.IsObject()) {
  if (receiver.Tag !== ValueTag.String) return Value.Undefined();
  const boxed = FindProperty(room, table, protos.String, key);
  if (boxed === null) return Value.Undefined();
  return ReadProperty(call, table, boxed, receiver);
}
const found = FindProperty(room, table, receiver.Ref, key);
if (found === null) return Value.Undefined();
return ReadProperty(call, table, found, receiver);
```

# method ReadProperty:(call:NativeCall, table:HeapTable, found:PropRef, receiver:Value)=>Value

**一处命中的属性怎么读出来**：数据属性给值，访问器**用接收者当 `this`** 调它的 getter。

**抽出来是因为有两条路会命中**（对象沿原型链、原始值沿它的原型）——
**「命中之后怎么读」是同一件事**，写两遍就会漂。

```ts
const property = table.Get(found.Owner).Props[found.Index];
if (property.Kind === PropertyKind.Accessor) {
  if (!property.Getter.IsCallable()) {
    throw new Error("unimplemented: this should throw a TypeError (accessor without a getter)");
  }
  return call(property.Getter, receiver, Value.Undefined(), false);
}
return property.Value;
```

# method SetProperty:(room:RoomChecker, call:NativeCall, table:HeapTable, receiver:Value, key:Value, value:Value)=>Value

写属性，返回写进去的值（赋值表达式的值就是它）。

四条分支，**顺序是语义**：

1. **数组的 `length`**：写它**截断**（JS 语义：`a.length = 2` 把后面丢掉）；
   字符串的 `length` 只读 → 抛（缺口 2）；
2. **访问器**：**调它的 setter**（`this` 是接收者）——注意这一条在「自有还是继承」之前：
   继承来的 setter 也要调，**不是**在接收者上遮蔽一格；
3. **自有数据属性**：写它那一格；不可写 → 抛（缺口 2）；
4. **没找到，或者只在原型链上找到数据属性**：**在接收者上新建一个自有属性**。

第 4 条里「只在原型链上找到」那一半容易写错，值得写清楚：JS 的 `[[Set]]` 遇到**继承来的
数据属性**时**不改原型**，而是在接收者上**新建一个自有的**（遮蔽它）。「写回拥有者」
是反过来的——那会让 `child.x = 1` 悄悄改掉所有兄弟共享的原型，**这正是原型污染那一类
bug 的形状**。原型那一格只有在「直接对原型对象赋值」时才会变。

```ts
if (IsLengthKey(table, key)) {
  if (receiver.Tag === ValueTag.Array) {
    if (!value.IsNumber()) throw new Error("unimplemented: array length must be a number");
    table.Get(receiver.Ref).AsArray().Truncate(value.AsInt());
    table.Recount(receiver.Ref);
    return value;
  }
  throw new Error("unimplemented: this should throw a TypeError (read-only length)");
}
if (!receiver.IsObject()) {
  throw new Error("unimplemented: assigning a property on a primitive receiver");
}
const found = FindProperty(room, table, receiver.Ref, key);
if (found !== null) {
  const property = table.Get(found.Owner).Props[found.Index];
  if (property.Kind === PropertyKind.Accessor) {
    if (!property.Setter.IsCallable()) {
      throw new Error("unimplemented: this should throw a TypeError (accessor without a setter)");
    }
    call(property.Setter, receiver, value, true);
    return value;
  }
  if ((property.Flags & PropertyFlagWritable) === 0) {
    throw new Error("unimplemented: this should throw a TypeError (read-only property)");
  }
  if (found.Owner === receiver.Ref) {
    property.Value = value;
    return value;
  }
}
if (!room(PropertyCharge)) {
  throw new Error("out of room");
}
table.Get(receiver.Ref).Props.push(new Property(key.Ref, value));
table.Recount(receiver.Ref);
return value;
```

# method DeleteProperty:(table:HeapTable, receiver:int, key:Value)=>bool

`delete receiver[key]`。

**只删自有属性**（不沿原型链）——这是 JS 的语义：删不掉原型上的东西，
而且删掉之后对象会重新「看见」原型上那个。

不可配置的属性删不掉（严格模式下该抛 `TypeError`，见缺口 2）。
**属性本来就不存在也算成功**（返回 `true`）——`delete` 一个不存在的属性不报错。

```ts
const item = table.Get(receiver);
for (let i = 0; i < item.Props.length; i++) {
  if (!KeyMatches(table, item.Props[i], key)) continue;
  if ((item.Props[i].Flags & PropertyFlagConfigurable) === 0) {
    throw new Error("unimplemented: this should throw a TypeError (non-configurable)");
  }
  item.Props = RemoveAt(item.Props, i);
  table.Recount(receiver);
  return true;
}
return true;
```

# method RemoveAt:(items:Array<Property>, index:int)=>Array<Property>

去掉第 `index` 格，返回新数组。

**新建数组而不是原地 `splice`**：原地删要挪后面所有格，而返回新数组更直白——
属性表本来就是小数组，这一层不是瓶颈（真要快是内联缓存的事）。

```ts
const result: Property[] = [];
for (let i = 0; i < items.length; i++) {
  if (i !== index) result.push(items[i]);
}
return result;
```

# method TypeOfName:(value:Value)=>string

JS 的 `typeof`。

**它不是 `Value.TagName`**（`value.xl.md` 里那条已经写明）：`Array` 与 `HostRef` 都报
`"object"`，闭包与内建函数都报 `"function"`，符号报 `"symbol"`，而 JS 的 `null` 报
`"object"`（历史包袱，照报）。

```ts
if (value.Tag === ValueTag.Undefined) return "undefined";
if (value.Tag === ValueTag.Null) return "object";
if (value.Tag === ValueTag.Bool) return "boolean";
if (value.Tag === ValueTag.Int32 || value.Tag === ValueTag.Float64) return "number";
if (value.Tag === ValueTag.String) return "string";
if (value.Tag === ValueTag.Symbol) return "symbol";
if (value.Tag === ValueTag.Function || value.Tag === ValueTag.Closure) return "function";
return "object";
```

# method GetIndex:(table:HeapTable, receiver:Value, index:Value)=>Value

`receiver[index]` 的**快路径**：数组给元素，字符串给**一个码元的字符串**。

**越界给 `undefined`，不是错误**；洞也给 `undefined`（`heap.xl.md` 的 `GetAt` 已经这样答）。

```ts
if (receiver.Tag === ValueTag.Array) {
  if (!index.IsNumber()) {
    throw new Error("unimplemented: non-numeric index needs ToString");
  }
  return table.Get(receiver.Ref).AsArray().GetAt(index.AsInt());
}
if (receiver.Tag === ValueTag.String) {
  if (!index.IsNumber()) {
    throw new Error("unimplemented: non-numeric index needs ToString");
  }
  const units = table.Get(receiver.Ref).AsString().Units;
  const at = index.AsInt();
  if (at < 0 || at >= units.length) return Value.Undefined();
  return Value.FromString(table.CreateString([units[at]]));
}
throw new Error("unimplemented: indexed access on a non-array receiver");
```

# method SetIndex:(room:RoomChecker, table:HeapTable, receiver:Value, index:Value, value:Value)=>Value

`receiver[index] = value` 的**快路径**：数组写元素（下标超长时补洞，`heap.xl.md` 的
`SetAt` 已经这样答）。

```ts
if (receiver.Tag === ValueTag.Array) {
  if (!index.IsNumber()) {
    throw new Error("unimplemented: non-numeric index needs ToString");
  }
  const at = index.AsInt();
  if (at < 0) throw new Error("unimplemented: negative index needs ToString");
  table.Get(receiver.Ref).AsArray().SetAt(at, value);
  table.Recount(receiver.Ref);
  return value;
}
throw new Error("unimplemented: indexed assignment on a non-array receiver");
```

# method NewPlainObject:(room:RoomChecker, table:HeapTable, protos:Protos)=>Value

造一个普通对象：**原型取 `Protos.Object`**。

这与 `heap.xl.md` 的 `CreateObject` 有区别：后者给的是**没有原型**——那是引擎内部对象
（帧 / 环境）该有的样子，脚本能看见的对象不该那样。

```ts
if (!room(ObjectCharge)) {
  throw new Error("out of room");
}
const handle = table.CreateObject();
table.Get(handle).Proto = protos.Object;
return Value.FromObject(handle);
```

# method NewPlainArray:(room:RoomChecker, table:HeapTable, protos:Protos)=>Value

造一个数组：原型取 `Protos.Array`。

```ts
if (!room(ObjectCharge)) {
  throw new Error("out of room");
}
const handle = table.CreateArray();
table.Get(handle).Proto = protos.Array;
return Value.FromArray(handle);
```
