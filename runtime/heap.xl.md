# dependencies
```xl
import { Value, ValueTag } from "./value.xl.md"
```

# namespace cangjie

执行层的堆：**对象表 + 句柄**。契约见 [docs/runtime-architecture.md](../docs/runtime-architecture.md) §4 与 §9。

本文件只管**存储**（对象长什么样、句柄怎么发、账怎么记）。**属性的语义**（原型链查找、
getter/setter 的调用、`delete`、`in`、内联缓存）不在这里，它们在 `rt_get_prop` 那一层——
存储与语义分开，是为了让回收器与装载验证只看这一个文件就能数清「哪些格子能装句柄」。

**为什么用句柄而不是指针。** 三个理由，缺一不可：句柄**稳定**（回收器不移动），所以宿主
跨调用持有它不会失效；句柄是整数，所以 IR 里没有裸指针（安全第 2 层）；句柄可以被边界检查
兜住，指针不能（越界句柄是一个可抛的脚本异常，野指针是崩溃）。

**句柄 0 是哨兵。** `Objects[0]` 是一个 `Tag` 为 `Undefined` 的空位，永不分配。
于是「`Value.Ref` 还是默认值 0」永远不会被误当成合法对象——这条挡住的是一整类
「忘了初始化 → 悄悄指向第 0 个对象」的 bug。

**`Tag` 为 `Undefined` 就是「这一格是空的」。** 所以堆里**不存在**活着的 `Tag=Undefined`
对象，`IsValid` 与 `Retire` 都靠这一条，回收器也靠它跳空格。

**记账单位是「计费字节」，不是目标的真实字节。** 下面的 `*Charge` 常量描述的是**规范层的
布局**（`Value` 多大、每格属性多大……）。一个把值压到 8 字节的目标**照样按这套常量记账**：

> 记账是**预算货币**，不是物理测量。若按各自的真实布局记账，同一个脚本会在 ts 上跑到第
> 100 万步 OOM、在 C++ 上跑到第 300 万步 OOM——「同 IR + 同输入 = 同输出」这条判据当场作废。
> 精确的物理布局是各目标的优化，**账本必须只有一份**。

**账在三个时刻被维护。** ① 分配：载荷填好后**一次结账**（`Finish`）；② 回收：退掉这一格
上次记的账；③ **回收的标记阶段：全量重算**。理由是热路径上没法保证每次 `push` 都来结账
（数组追加一个元素就是一次），所以两次回收之间的增长会**少记**：

> 少记的后果是「真正用掉的内存略高于账本」，不是「上限失效」。所以**回收结束后必须用重算
> 出来的总额重新判一次上限**——仍超就再收一次，收不动才抛 OOM。这条是账本与安全第 4 层
> 的接缝，写在 `gc.xl.md` 里。

# const ValueCharge:int = 16

一个 `Value` 的计费字节（胖联合：标签 + 整数 + 浮点 + 句柄）。

# const PropertyCharge:int = 24

一格属性的计费字节（键句柄 + 种类 + 值 + getter + setter + 标志）。

# const ObjectCharge:int = 32

一个对象头的计费字节（标签 + 标记位 + 上次记账 + 原型句柄 + 属性表 + 十一个载荷槽）。

# const CodeUnitCharge:int = 2

一个 UTF-16 码元的计费字节。

# const HoleCharge:int = 1

一个「洞」标记的计费字节（稀疏数组才有）。

# const HashModulus:int = 16777213

字符串哈希的模。

**为什么是「小于 2²⁴ 的质数」**：哈希里要做 `hash * 31 + unit`，而各目标的 `int` 宽度不同
（ts 是双精度，C++ 是 32 位）。取小于 2²⁴ 的模，保证 `hash * 31 < 2²⁹`——**任何目标的 `int`
都装得下**，双精度也不丢精度。用 FNV 那种 32 位环绕乘法就必须有位重解释，那会把某一个目标
的语义钉进共用层（`runtime/value.xl.md` 那节「宽度与溢出」同一笔账）。

# const PropertyFlagEnumerable:int = 1

属性可枚举（`Object.keys` / `for..in` 看得见）。

# const PropertyFlagWritable:int = 2

属性可写。

# const PropertyFlagConfigurable:int = 4

属性可配置（可 `delete`、可改属性种类）。

# const PropertyFlagInternal:int = 8

**引擎自己的记账格**（第 890 轮）——它**不是一个属性**：所有「用户看得见」的出口都要滤掉它。

前三格（1 / 2 / 4）是 JS 规范的属性特性；这一位是**本仓的**：绑定函数那三格
`__boundTarget` / `__boundThis` / `__boundArgs`（以及转抄过来的 `prototype`）是引擎
自己要读的载荷，而 JS 里它们**根本不存在**——`"__boundTarget" in f.bind(x)` 是假、
`Object.getOwnPropertyNames(f.bind(x))` 只有 `["length","name"]`。

**为什么不能用「按名字滤」**：用户自己写 `{ ["__boundTarget"]: 1 }` 是一个**真的**
自有属性名（JS 的 `Object.getOwnPropertyNames` 会给它）——按名字滤会把它一起藏掉。
标记必须跟着**那一格**走，与 `#p` 那一族（`globals.xl.md` 第 737 轮）同一个坎。

**它不进 `PropertyFlagsAll`**：`All` 说的是「三个规范位全开」，
而「内部」是正交的一位——普通赋值造出来的属性永远是 7。

# const PropertyFlagsAll:int = 7

三个**规范**标志全开——普通赋值产生的属性就是它（`PropertyFlagInternal` 不在里面）。

# method PopInt:(items:Array<int>)=>int

从整数数组尾部弹一个；空则给 `-1`。

存在理由是**一处**收住 `Array.pop()` 在严格类型下的 `undefined`：句柄约定 `-1` 表示「没有」，
于是各目标只需要一个 `pop` 映射，不必在每个调用点判空。

```ts
if (items.length === 0) return -1;
const value = items.pop();
if (value === undefined) return -1;
return value;
```

# method HashUnits:(units:Array<int>)=>int

UTF-16 码元序列的哈希（多项式 rolling hash，模见 `HashModulus`）。

**不读堆、不调库**：只用整数乘加与取模，逐目标都成立。

```ts
let hash = 7;
for (let i = 0; i < units.length; i++) {
  hash = (hash * 31 + units[i]) % HashModulus;
}
return hash;
```

# enum PropertyKind

属性的种类。

- case Data
数据属性：值在 `Value` 里。
- case Accessor
访问器属性：值是 `Getter` / `Setter` 两个可调用对象，`Value` 无意义。

# class Property

一格属性。

**键是句柄，不是字符串**：它指向一个 `HeapString` 或 `HeapSymbol`（看那一格的 `Tag`）。
字符串键按**内容**比，符号键按**身份**比——这个分叉由 `rt_get_prop` 负责，本文件只存。

## field Key:int = 0

键的句柄（字符串或符号）。

## field Kind:PropertyKind = PropertyKind.Data

属性种类。

## field Value:Value = new Value()

数据值。`Kind` 为 `Accessor` 时无意义。

## field Getter:Value = new Value()

取值器（可调用对象）。`Kind` 为 `Data` 时无意义。

## field Setter:Value = new Value()

赋值器（可调用对象）。`Kind` 为 `Data` 时无意义。

## field Flags:int = 7

属性标志的位掩码，默认全开（`PropertyFlagsAll`）。

**第四位（`PropertyFlagInternal`）是「这不是一个属性」**：读属性 / `in` / 自有名表
那几处都要按它滤掉（`props.xl.md` 的 `FindProperty` 有一格 `includeInternal`，
只有引擎自己读载荷时才给真）。

## constructor:(key:int, value:Value)=>void

造一个数据属性。这是绝大多数赋值的路径，所以只留这一个构造器（xl 规定一个类至多一个）。

```ts
this.Key = key;
this.Kind = PropertyKind.Data;
this.Value = value;
```

## static method Accessor:(key:int, getter:Value, setter:Value)=>Property

造一个访问器属性。

```ts
const result = new Property(key, Value.Undefined());
result.Kind = PropertyKind.Accessor;
result.Getter = getter;
result.Setter = setter;
return result;
```

## method IsEnumerable:()=>bool

是否可枚举。

```ts
return (this.Flags & PropertyFlagEnumerable) !== 0;
```

## method IsAccessor:()=>bool

是否访问器属性。

```ts
return this.Kind === PropertyKind.Accessor;
```

## method Clone:()=>Property

值语义复制：**五个载荷一起抄**（与 `Value.Clone` 同一条理由——只抄一部分会在某个目标上
悄悄换掉载荷）。

```ts
const result = new Property(this.Key, this.Value.Clone());
result.Kind = this.Kind;
result.Getter = this.Getter.Clone();
result.Setter = this.Setter.Clone();
result.Flags = this.Flags;
return result;
```

# class HeapString

字符串对象。**内容是 UTF-16 码元序列**（`ValueTag.String` 那一档的载荷）。

为什么是显式的 `Array<int>` 而不是各目标的原生字符串：ts 与 C# 的原生字符串本来就是 UTF-16，
但 C++ 的 `std::string` 是字节、Rust 的 `String` 是 UTF-8——**用原生字符串就等于把「下标」
的含义交给目标去解释**，而 JS 的 `.length` / `s[i]` / `charCodeAt` 全是码元语义。
显式存码元，语义在四个目标上完全相同；ts 上慢一点，**这笔账记在这里**，
各目标将来可以用 `### ts` / `### cpp` 覆盖段换成原生缓冲，只要**可观测语义不变**。

**不做驻留**（v1）：属性键按内容比而不是按句柄比，于是不需要驻留表——
省掉一整个子系统，也省掉「驻留表是根，脚本狂造键就泄漏」那条面。代价是属性查找慢一档，
**这笔账也记在这里**；驻留是 P4 的优化。

## field Units:Array<int> = []

UTF-16 码元序列。

## constructor:(units:Array<int>)=>void

以码元序列构造。

```ts
this.Units = units;
```

## method GetLength:()=>int

码元个数——就是 JS 的 `s.length`。

```ts
return this.Units.length;
```

## method CodeAt:(index:int)=>int

取第 `index` 个码元。**调用方保证下标在范围内**（越界检查在 `rt_*` 层，
因为那里才知道「该返回 `undefined` 还是该抛」）。

```ts
return this.Units[index];
```

## method Equals:(other:HeapString)=>bool

按**内容**比。字符串是原始值，`===` 就是按内容比（不看句柄）。

```ts
if (this.Units.length !== other.Units.length) return false;
for (let i = 0; i < this.Units.length; i++) {
  if (this.Units[i] !== other.Units[i]) return false;
}
return true;
```

## method Hash:()=>int

内容哈希。v1 只用于属性表的哈希索引。

```ts
return HashUnits(this.Units);
```

## method Charge:()=>int

计费字节。**只算自己的额外存储**：对象头由 `HeapObject.Charge` 记一次——
两边都算就会把同一块内存记两遍，账本虚高，堆上限提前触发。

```ts
return this.Units.length * CodeUnitCharge;
```

# class HeapSymbol

符号对象（`ValueTag.Symbol` 那一档的载荷）。

**身份是 `Id`，不是内容**：`Symbol("a") !== Symbol("a")`，而两个内容相同的字符串相等。
所以符号没有 `Equals`——要判等就判 `Id`。

## field Id:int = 0

全局唯一的身份号。

## field Description:int = 0

描述字符串的句柄；`0` 表示没有描述。

## constructor:(id:int, description:int)=>void

造一个符号。

```ts
this.Id = id;
this.Description = description;
```

## method Charge:()=>int

计费字节。符号没有额外存储，所以是 0（对象头由 `HeapObject.Charge` 记）。

```ts
return 0;
```

# class HeapArray

数组对象（`ValueTag.Array` 那一档的载荷）。

**洞（hole）是独立的一格**：`delete a[0]` 之后 `a[0] === undefined` 为真，但 `0 in a` 为假，
`Object.keys(a)` 看不到它——所以「洞」与「显式的 `undefined`」必须能分辨。
`Holes` 为空数组表示**全密**（绝大多数数组），这时不占额外内存也不做额外判断。

## field Elements:Array<Value> = []

密集元素区。

## field Holes:Array<bool> = []

洞标记，与 `Elements` 等长；**空数组表示没有洞**。

## method GetLength:()=>int

元素个数——就是 JS 的 `a.length`。

```ts
return this.Elements.length;
```

## method IsHole:(index:int)=>bool

第 `index` 格是不是洞。

```ts
if (this.Holes.length === 0) return false;
return this.Holes[index];
```

## method GetAt:(index:int)=>Value

取第 `index` 格；越界或洞都给 `undefined`。

```ts
if (index < 0 || index >= this.Elements.length) return Value.Undefined();
if (this.IsHole(index)) return Value.Undefined();
return this.Elements[index];
```

## method SetAt:(index:int, value:Value)=>void

写第 `index` 格。

**跨过末尾写要按 JS 的规矩补洞**：`const a = [1]; a[2] = 3` 之后**第 1 格是洞**，
不是显式的 `undefined`（`1 in a` 为假）。

这里有一条容易写坏的地方，**它在判据里被抓过一次**：从全密数组（`Holes` 为空）变长时，
必须**先把既有的格子标成「非洞」再开洞**。少了这一步，`Holes` 会与 `Elements` 错位，
于是**本来有值的格子被当成洞**——读出来是 `undefined`，而它明明有值。

另外：**正好接在末尾**（`index === Elements.length`）且当前全密时不引入 `Holes`——
`a.push(x)` 与 `a[a.length] = x` 是最常见的两种写法，不该为它们建一张洞表。

```ts
if (index < 0) return;
if (index === this.Elements.length && this.Holes.length === 0) {
  this.Elements.push(value);
  return;
}
if (index >= this.Elements.length) {
  while (this.Holes.length < this.Elements.length) {
    this.Holes.push(false);
  }
  while (this.Elements.length < index) {
    this.Elements.push(Value.Undefined());
    this.Holes.push(true);
  }
  this.Elements.push(value);
  this.Holes.push(false);
  return;
}
this.Elements[index] = value;
if (this.Holes.length > 0) this.Holes[index] = false;
```

## method SetHole:(index:int)=>void

把第 `index` 格变成洞（`delete a[i]`）。长度不变——JS 的 `delete` 不缩数组。

```ts
if (index < 0 || index >= this.Elements.length) return;
while (this.Holes.length < this.Elements.length) {
  this.Holes.push(false);
}
this.Elements[index] = Value.Undefined();
this.Holes[index] = true;
```

## method Push:(value:Value)=>void

尾部追加。

```ts
if (this.Holes.length > 0) this.Holes.push(false);
this.Elements.push(value);
```

## method Truncate:(length:int)=>void

把长度改成 `length`（`a.length = n` 的落点）。

**变长时新增的格子全是洞**——这是 JS 的语义（`const a = [1]; a.length = 3` 之后
`1 in a` 是假）。所以变长之前要把既有的格子先补成「非洞」，否则一个全密数组变长之后
会变成「新增的是实值」——那是**另一个**语义。

```ts
if (length < 0) throw new Error("array length cannot be negative");
if (length < this.Elements.length) {
  while (this.Elements.length > length) {
    this.Elements.pop();
    if (this.Holes.length > 0) this.Holes.pop();
  }
  return;
}
if (length === this.Elements.length) return;
while (this.Holes.length < this.Elements.length) {
  this.Holes.push(false);
}
while (this.Elements.length < length) {
  this.Elements.push(Value.Undefined());
  this.Holes.push(true);
}
```

## method Charge:()=>int

计费字节。洞密集的稀疏数组按实际长度记账——这是**规范选的**口径，不是测量值。

```ts
let total = this.Elements.length * ValueCharge;
if (this.Holes.length > 0) total = total + this.Holes.length * HoleCharge;
return total;
```

# class HeapClosure

降级期造出来的闭包（`ValueTag.Closure` 那一档的载荷）。

它把「哪段代码」与「哪份环境」绑在一起：`Code` 是 IR 里的函数模板入口，`Env` 是环境记录
的句柄。**捕获表在降级期算好**，运行期只是建一条记录并记住它的句柄。

## field Code:int = 0

函数模板在 IR 里的入口下标。

## field Env:int = 0

环境记录的句柄（`0` 表示没有捕获任何东西）。

## field Arity:int = 0

形参个数（不含剩余参数）。

## field Name:int = 0

名字字符串的句柄；`0` 表示匿名。

## field Source:int = 0

**这个函数的源码文本**（第 334 轮）——字符串句柄；`0` 表示「没有」（宿主函数、
或者降级时没给源码）。

**为什么它住在闭包上、而不是某一层现算**：`f.toString()` 在 JS 里给的是
**定义它那一段源码**（`function named(a) { return a + 1; }`），
而**运行期只认得出「这是哪个闭包」**——那段文本只有**造它的那一方**知道
（降级层手里同时有源码与节点的区间，与 `Name` 那一格**同一个理由**）。

**它为什么不是一个常量池下标**：这一层不认识常量池（`Code` 是函数表下标、
`Name` 是字符串句柄，两个都是**表里的句柄**）——要读常量池就得再开一条宿主通道，
而句柄这条路**本来就有**。代价是「同一个函数求值两次 ⇒ 两张字符串」
（`const f = () => 1` 在循环里）——**字符串是不可变的**，多一份只是多一份计费，
语义上察觉不到（JS 自己也是每次求值造一个新的函数对象）。

## field IsClass:bool = false

**这个闭包是不是一个类的构造函数**（第 613 轮）。

**为什么它必须住在闭包上**：`console.log(class C {})` 在 Node 里印
**`[class C]`**（`util.inspect` 的判据是 `Function.prototype.toString` 以 `class` 开头），
而**类在值模型里就是一个普通闭包**——运行期没有别的地方看得出这件事
（这一层手上只有代码 / 环境 / 名字 / 形参 / 源码五格）。
只有**造它的那一方**知道（降级层手里正拿着那个类节点），
与 `Arity` / `Name` / `Source` 三格**同一条分工**。

## field IsStrict:bool = false

**这个闭包是不是严格代码**（第 620 轮）——与 `IsClass` 同一处来、
同一条纪律（只有造它的那一方知道）。

**它只影响一件事**：函数被当普通函数调（没有接收者）时 `this` 是 `undefined` 还是全局对象
（`vm.xl.md` 的 `DoCallValue` / `CallNative`）。类体是严格代码，
所以「摘下来的方法」`const f = d.m; f()` 里那句 `this.v` **该抛**
（松散那一档给全局对象，第 337 轮选定、`c304` / `c337` 两条钉着它）。

**第 892 轮起多了一个读处**：`delete` 那一支也读它（严格模式下删不可配置的属性要抛
`TypeError`，见 `vm.xl.md` 的 `del_prop`）。**但「当普通函数调时的 `this`」那一档要跟
`IsArrow` 一起读**——理由见那一格：箭头**没有自己的 `this`**，就算它是严格代码，
那一格也不是它的。**只读 `IsStrict` 会把箭头读错**。

## field IsArrow:bool = false

**这个闭包是不是一个箭头函数**（第 892 轮）——与 `IsClass` / `IsStrict` / `IsGenerator`
**同一处来、同一条纪律**（只有造它的那一方知道：降级层手里正拿着那个节点）。

**为什么必须住在闭包上**：`IsStrict` 从第 892 轮起**不止管 `this`**了（`delete` 也读它），
而箭头体里的 `"use strict"` 指令序言**同样是严格代码**（`(() => { "use strict"; … })` 里
`delete` 不可配置的属性在 JS 里抛 `TypeError`）⇒ 那一格**必须置真**。
**可是「没有接收者时 `this` 给谁」那一问不认它**：箭头的 `this` 是**词法**的
（从捕获的环境格读），从来没有「自己的 `this`」可兜——照 `IsStrict` 一路兜下去的话，
`function outer() { const f = () => { "use strict"; return typeof this; }; return f(); }`
会从 `"object"` 变成 `"undefined"`（**那是错的**：外层 `outer` 是松散的，
JS 给 `"object"`，`exec/functions/120-strict-mode-and-module-this` 第 6 档钉着它）。
所以调用点那两处**要多问这一位**（`vm.xl.md` 的 `DoCallValue` / `CallNative`）。

**它借的是 `new_closure` 第四格的下一位**（值 32）：与 `IsGenerator` / `IsAsync` 那两位
**同一个形状**——位宽从五位加到六位、形参个数那一半的步长从 32 变成 **64**
（降级层 `EmitClosure` **同步**改，两边是同一份规约的两半）。见 `vm.xl.md` 的 `MakeClosure`。

## field HasRestricted:bool = false

**这个闭包带不带那两格「受限属性」`arguments` / `caller`**（第 709 轮）。

**JS 的口径**（真 `node` 现量的，CJS 松散模式）：**松散的普通函数**——
函数声明与函数表达式——**自有**这两格
（`Object.getOwnPropertyNames(function f(a, b) {})` 给
`["length","name","arguments","caller","prototype"]`），
而**箭头 / 方法 / 访问器 / 生成器 / `async` / 类 / 严格代码**都**没有**这两格
（`Object.getOwnPropertyNames((a) => {})` 给 `["length","name"]`、
`Object.getOwnPropertyNames({ m() {} }.m)` 也一样）。

**为什么它必须住在闭包上**：这是**语法种类**决定的（是不是方法、是不是箭头、
有没有指令序言），运行期从值上看不出来——与 `IsClass` / `IsStrict` **同一条分工**：
只有造它的那一方（降级层手里正拿着那个节点）知道。

**读出来的值**：不在调用中时两格都是 `null`（`typeof f.arguments` 给 `"object"`），
那一档由 `props.xl.md` 的 `GetProperty` 现答——它**不在属性表里**
（与 `Arity` / `Name` 那两格同一个形状）。

## field IsGenerator:bool = false

**这个闭包是不是一个生成器函数**（第 730 轮）——与 `IsClass` / `IsStrict` / `HasRestricted`
**同一处来、同一条纪律**：只有造它的那一方知道（降级层手里正拿着那个节点）。

**为什么它必须住在闭包上**：`Object.prototype.toString.call(function* () {})` 在 JS 里是
`"[object GeneratorFunction]"`、`console.log(function* g() {})` 印
`[GeneratorFunction: g]`——两处的判据都是「这个**函数值**是哪一档」，
而本仓的闭包只有「代码 / 环境 / 名字 / 形参 / 源码」五格，运行期看不出这件事
（`function* g(){}` 与 `function g(){}` 在值模型里**一模一样**）。

**它借的是 `new_closure` 第四格的下一位**（值 8）：与 `HasRestricted` 那一位
**同一个形状**——位宽从三位加到五位、形参个数那一半的步长从 8 变成 **32**
（降级层 `EmitClosure` **同步**改，两边是同一份规约的两半）。见 `vm.xl.md` 的 `MakeClosure`。

## field IsAsync:bool = false

**这个闭包是不是一个 `async` 函数**（第 730 轮）——与 `IsGenerator` 挨着的下一位（值 16）。

**两族合成一档**：`async function*` **两位置真**——JS 里它是**第三种**原型
（`%AsyncGeneratorFunction%`）、标签是 `"[object AsyncGeneratorFunction]"`，
而只有 `IsGenerator` 那一档才是 `"[object GeneratorFunction]"`。
所以「谁的原型」要按这两位**一起**挑，不能只看一位（`vm.xl.md` 的 `MakeClosure`）。

## constructor:(code:int, env:int, arity:int, name:int, source:int)=>void

造一个闭包。

```ts
this.Code = code;
this.Env = env;
this.Arity = arity;
this.Name = name;
this.Source = source;
this.IsClass = false;
this.IsStrict = false;
this.IsArrow = false;
this.HasRestricted = false;
this.IsGenerator = false;
this.IsAsync = false;
```

## method Charge:()=>int

计费字节。闭包没有额外存储（代码与环境都在别处），所以是 0。

```ts
return 0;
```

# class HeapEnv

一个**环境记录**（`ValueTag.Object` 那一档的载荷——环境是引擎内部对象，脚本看不到它）。

闭包捕获就住在这里：一格一个值，`Parent` 指向**外层作用域**的环境。

**父链是引用，不是拷贝**：同一份环境被多个闭包共享时，一个写、另一个看得见——
这是闭包语义的核心（判据里有一条专钉它）。`Parent` 是句柄，回收器顺着它走
（`gc.xl.md` 的 `Trace` 有 `Env` 那一支）。

## field Slots:Array<Value> = []

捕获的格子。

## field Parent:int = 0

外层环境的句柄；`0` 表示没有（最外层）。

## constructor:(slotCount:int, parent:int)=>void

按格数造一个环境，格子先全部填成 `undefined`（**不留空格**：见 `HeapFrame` 的同一条理由）。

```ts
this.Parent = parent;
this.Slots = [];
for (let i = 0; i < slotCount; i++) {
  this.Slots.push(Value.Undefined());
}
```

## method Charge:()=>int

计费字节。格子是这一格的主要开销。

```ts
return this.Slots.length * ValueCharge;
```

# enum GeneratorState

生成器的状态。

- case Suspended
挂起：帧冻着，等下一次 `next()`。
- case Running
正在跑：这时候再 `next()` 是**非法**（JS 抛 `TypeError`，v1 抛宿主错误）。
- case Done
跑完了：帧已经 `return` 出去，之后每次 `next()` 都给 `{value: undefined, done: true}`。

# class HeapGenerator

一个**生成器对象**（`ValueTag.Object` 那一档的载荷——脚本看得见它，但看不到里面）。

它只做一件事：**把冻住的帧挂在身上**。所以「生成器」在引擎里的全部含义就是
`{ 帧句柄, 挂起时收到的值, 状态 }`——`yield` 的语义由 `vm.xl.md` 的 `suspend`/`resume`
与「恢复时把帧压回栈上」那一套完成。

`ResumeValue` **不在生成器身上**：`await` 也需要「恢复时送进来的值」，
所以那一格归**帧**（`HeapFrame.ResumeValue`）——**一份状态只存一处**，
两个恢复机制（生成器的 `next(v)` 与承诺的兑现）都往同一格写。

## field Frame:int = 0

冻住的那一帧的句柄；`0` 表示还没有（不该出现）。

## field State:int = 0

`GeneratorState` 的值。

## field Started:bool = false

**这个生成器的体跑过没有**（第 746 轮）——`GeneratorState` 那一格**答不了这个问题**：
本仓的三档（`Suspended` / `Running` / `Done`）在「还没开始」与「跑过一轮之后挂起」
这两种情况下**都是 `Suspended`**（`heap.xl.md` 的 `GeneratorState` 那一段写着它只有三档），
而 JS 那边是**两个**状态（`suspendedStart` 与 `suspendedYield`）。

**为什么这一格必须分开**：`it.return(v)` 与 `it.throw(v)` 打在**还没开始**的生成器上时，
JS 的 `GeneratorResumeAbrupt` **不执行体、也不跑 `finally`**——直接把生成器关掉，
`throw` 把那个值抛给调用方、`return` 把它当完成值交出去；
而打在**已经挂起**的生成器上时，它要跑体（`return` 只跑 `finally`、`catch` 不接）。
两档的**字面写法一模一样**（都是 `it.return(v)`），差别**只在这一格**。

**谁写**：`vm.xl.md` 的 `DoIterNext` —— 每一次恢复（不论方向）在**真正开跑之前**置真；
于是「第二次以后」的 `return` / `throw` 自然走正常那条路。
**它不是根**（一个布尔）；初值 `false`。

## field CompletedValue:Value = new Value()

**这个生成器关掉时那个「完成值」**（第 746 轮）——一个跑完的生成器**不是一个黑洞**：
JS 里它记着自己是怎么结束的。

**为什么需要这一格**：`{ value, done }` 的那一对里 `value` 在**结束之后**不是 `undefined`。
实测（判据 `runtime/round746/p746a-a02`）：
`function* g() { yield 1; yield 2; }` 跑起来、`it.return(8)` 交出去 `{value: 8, done: true}`
之后**再问一次** `it.return(8)`，`node` 还是给 `{value: 8, done: true}`——
而本仓原来把「已经 `Done`」那一档**一律**答成 `{value: undefined, done: true}`，
于是 `yield* g()` 那个表达式的值**静默变成 `undefined`**（JS 里它是 `8`）。

**为什么不做成「`Done` 之后再问一次就交它」**：`next()` 那一档 JS 给的是
`{value: undefined, done: true}`（不是完成值）——所以这一格**只由 `return` 那两条路**填
（`DoIterNext` 的两处 `returns` 分支），不由 `next()` 的结束填。
**它是根**（可能是一个对象），`vm.xl.md` 的 `SnapshotRoots` 那一份名单里要带上它。

## constructor:(frame:int)=>void

造一个生成器，初始挂起（帧还没跑，等第一次 `next()`）。

```ts
this.Frame = frame;
this.State = GeneratorState.Suspended;
this.Started = false;
this.CompletedValue = Value.Undefined();
```

## method Charge:()=>int

计费字节：只剩两个整数，**没有额外存储**（那个值在帧上）。

```ts
return 0;
```

# enum PromiseState

承诺的状态。

- case Pending
还没结清：等着它的那些帧挂在 `Reactions` 上。
- case Fulfilled
已兑现：`Value` 就是兑现值。
- case Rejected
已拒绝：v1 里**还没有拒绝的路径**（那要错误对象那一层），所以这一档只占位。

# class HeapPromise

一个**承诺**（`ValueTag.Object` 那一档的载荷——脚本看得见它，但看不到里面）。

引擎只需要它三样东西：**状态**、**兑现值**、**等着它的那些帧**。

`Reactions` 存的是**帧句柄**而不是回调：`await` 的语义就是「把这个帧挂在这儿，
等结了再放回去跑」，而真回调（`.then(fn)`）是语言层建库的事——它们将来走同一张表
（把回调包成一个帧，或者让建库层自己排微任务）。

**它也是回收的根链一环**：等着它的帧（以及帧里的活值）全靠这条链活着。

## field State:int = 0

`PromiseState` 的值。

## field Value:Value = new Value()

兑现值。

## field Reactions:Array<int> = []

等着它的帧句柄（`await` 挂起来的那些）。

## field NativeReactions:Array<int> = []

**等着它的原生任务号**（第 185 轮）——`Reactions` 的姊妹那一格。

两格分开的理由是**一个是帧、一个是任务**：`Reactions` 里装的是 `await` 挂起的帧
（结清之后把这些帧放回执行器），而这一格装的是**语言层挂上来的回调**
（`.then(fn)`——结清之后由执行器**调那个闭包**，并且把它的返回值灌进另一个承诺）。
**两者不能混在一个数组里**：放回去的帧与要调的回调，恢复方式根本不同
（一个是 `PushBack`，另一个是 `CallNative`）。

**任务本体住在执行器那边**（`vm.xl.md` 的 `NativeTasks`），这里只存**号**——
于是这一格不需要认识「回调是什么」（与 `Frame` 那一格同一个手法：句柄而不是对象）。
**它同样是回收的根链一环**：任务里那个闭包与实参靠它活着（执行器扫根时按号去标）。

## constructor:(state:int, value:Value)=>void

造一个承诺。

```ts
this.State = state;
this.Value = value;
this.Reactions = [];
this.NativeReactions = [];
```

## method Charge:()=>int

计费字节：一个值 + 两张反应表里每格一个句柄。

```ts
return ValueCharge + this.Reactions.length * 4 + this.NativeReactions.length * 4;
```

# class HeapIterator

**一个迭代游标**：`{ 源, 走到第几格 }`。

**为什么要它**：`for..of` 要的是**逐次推进**的状态。数组没有这种状态（它只是一串值），
所以「迭代器」必须是一个**独立的、活的**东西——这正是「游标」与「容器」的区别。

**为什么不让降级层自己拿个槽当游标**：那样 `for..of` 只能对数组成立
（生成器那一边的状态在生成器身上）。有了游标记录，`iter_new` 可以在**引擎内部**
按载荷分派——数组给游标、生成器给生成器自己——**IR 侧因此不必有类型判断**
（`ir.xl.md` 里没有、也不该有「这是数组吗」这种指令）。

`Source` 存句柄而不是内联：数组可以在游标活着的时候被改（`push`），
**游标必须看见那些改动**——JS 的迭代语义就是这样（长度也是每次现问）。

## field Source:int = 0

源数组的句柄。

## field Index:int = 0

下一次该给第几格。

## constructor:(source:int)=>void

记下源数组，游标从第 0 格开始。

```ts
this.Source = source;
this.Index = 0;
```

## method Charge:()=>int

计费字节：两个整数，**没有额外存储**（源数组由它自己那格算）。

```ts
return 0;
```

# class HeapFrame

一个**调用帧**（`ValueTag.Object` 那一档的载荷——帧是引擎内部对象，脚本永远看不到它）。

帧是**堆对象**而不是宿主栈上的一格，理由只有一条但足够：**生成器与 `await` 要把帧冻在中途**。
帧长在宿主栈上，就没法「跑一半放下、过会儿接着跑」。

字段里 `Prev` 是调用者、`ReturnSlot` 是「返回值写回调用者的哪一格」——
两者合起来就是调用栈，而**遍历它不需要递归**（回收器的标记栈、`vm.xl.md` 的返回都一样）。

## field Code:int = 0

函数模板入口（与 `HeapClosure.Code` 同一套编号，指向函数表）。

## field Env:int = 0

环境记录句柄；`0` 表示没有。

## field Pc:int = 0

**下一条**要执行的指令（不是当前这条——`vm.xl.md` 先前进再执行，跳转指令自己覆盖）。

## field Slots:Array<Value> = []

槽数组。**槽数在装载时定死**（`FunctionInfo.SlotCount`），运行期不增长。

## field Prev:int = 0

调用者的帧句柄；`0` 表示这是栈底。

## field ReturnSlot:int = -1

返回值写回调用者的哪一格（也就是调用时的**参数基址**）；`-1` 表示没有调用者。

## field This:Value = new Value()

调用时的**接收者**（`obj.m()` 里的 `obj`）。普通函数调用给 `undefined`（严格模式语义）。

**它可能在回收时是唯一的引用**（`this` 只挂在帧上），所以回收器必须顺着它走
（`gc.xl.md` 的 `Trace` 有帧那一支）。

## field ConstructTarget:int = 0

`new` 造出来的那个对象的句柄；`0` 表示这不是一次构造调用。

`return` 时按 JS 的规矩收尾：**构造函数返回对象就用那个对象，否则用这里这个**
（`vm.xl.md` 的 `DoReturn`）。少了这一条，`new` 出来的东西就不是 JS 语义里的那个。

## field NewTarget:Value = new Value()

**`new.target` 那一个值**（第 346 轮）——**被调的那个构造函数本身**
（闭包、宿主引用、可调用对象 都行），**不是实例**。

**为什么不复用上面那一格**：`ConstructTarget` 存的是**实例的句柄**（`int`，
`DoReturn` 那一支要用），而 `new.target` 要的是**构造函数那个值**——**两件事**。
**不是构造调用时给 `undefined`**（JS 的 `F()` 里 `new.target` 就是 `undefined`，
判据 `c304-rt-new-target-in-ctor` 第 1 行钉着它）。

**它是 `Value`、上面那格是 `int`**——与 `This` 同一形状（帧是回收根，
所以这一格要**在 `gc.xl.md` 的帧扫描里一起标**：漏了它的症状是
「某个构造函数里 `new.target` 某一天空了」，**只在回收之后出现**）。

## field Generator:int = 0

这一帧属于哪个生成器（句柄）；`0` 表示它是普通调用帧。

**恢复时靠它把 `next(v)` 传来的值找回来**（`HeapGenerator.ResumeValue`）——
所以它也必须是回收的根（`gc.xl.md` 的 `Trace` 顺着它走）。

## field ResumeValue:Value = new Value()

**这次恢复送进来的值**：生成器的 `next(v)` 与 `await p` 的兑现值都写这一格，
由紧跟其后的 `resume` 指令搬进槽里。

**它归帧、不归生成器也不归承诺**：两个恢复机制（`iter_next` 与承诺兑现）写的是同一格，
`resume` 只认帧——于是「谁把我恢复的」这件事在指令层不需要分叉。

**它必须是根**：送进来的可能是个堆对象（比如 `next({...})`）。

## field Done:bool = false

这一帧是否已经跑完。给挂起 / 恢复用（`vm.xl.md` 的 `suspend` / `resume`）。

## field AsyncPromise:int = 0

**这一帧是 `async` 函数的体吗；是的话，它自己的那个承诺是几号**（第 285 轮）。

**「它自己的那个承诺」= 调用者拿到的那一个**（`f()` 这个表达式的值）——
`return v` 的意思就是「把它兑现为 `v`」、体里抛出去的错就是「把它拒绝」。

**为什么必须存在帧上、不能只留在调用者那一格**（第一版就是这么写的，**当场就不行**）：
帧被 `await` 摘下来之后**随时可能被复用**，而 `throw` 那一趟要
**按帧把合适的承诺各自拒绝掉**——那时从帧去反查「调用者那一格」已经**不可靠**
（调用者可能早就返回了、那一格可能已经装了别的值）。
与 `Generator` 那一格同一个理由：**谁收尾谁要知道它是谁**。

**它必须是根**（`gc.xl.md` 的 `Trace` 加了一格）。

## field Awaiting:Value = new Value()

**这一帧正挂在哪个承诺上**（第 285 轮）——`await` 那一刻写上、恢复时它还在。

**它是「这一帧现在在不在栈上」的判据**（`Awaiting.IsRef()`）：写它的地方只有
`DoAwait` 一处，而 `DoAwait` 一定**先把帧摘下来**再写——
所以「有它」⟺「帧不在栈上」。`DoReturn` / `DoThrow` 拿它决定
「这个 async 帧该不该就地结清」（`AdoptInto` 那一支正好利用这个窗口）。

**与 `AsyncPromise` 是两样东西**：一个是「_我_的承诺」（交给调用者的那一个），
一个是「_我等_的承诺」——`await` 一个**自己的**承诺是死锁，
而这两格分开之后，它至少**不会把帧误判成已经在跑的**。

**为什么不另加一个布尔**：多一格布尔等于把同一件事写两遍
（迟早有一处忘了同步），而这一格本来就要存。

**它必须是根**：送进来的可能是个堆对象（`gc.xl.md` 的 `Trace` 顺着它走）。

## field SuspendedInAwait:bool = false

**这一帧上一次离开栈，是 `await` 摘的、还是 `suspend`（`yield`）摘的**（第 319 轮）。

**为什么这一格不是「同一件事写两遍」**：上面那条说的是 `Awaiting` 与 `AsyncPromise`，
而这一格问的是**另一个问题**——「上一次为什么离开栈」。
**`Awaiting` 答不了它**：它**恢复之后还留着**（那一段自己写着），
所以「有没有 `Awaiting`」只说明**曾经**等过，不说明**这一次**是为什么挂的。
**两种挂起在帧上原来一模一样**（都是「不在栈上、`ResumeValue` 等着一格」）
⇒ 推进**异步生成器**的那一侧分不出「产出了一个值」与「还在等一个承诺」
（症状：`yield await x` 之后那一次 `next()` 被当成**结束**，
实测 `await it.next()` 给 `{"done":true}`，Node 给 `{"value":2,"done":false}`）。

**谁写谁清**：`DoAwait` 写（`vm.xl.md`）；两条恢复路都经过 `resume` 那条指令，
由它清掉（只写不清就是下一次误判）。

**它不是根**（一个布尔，不指向堆）；初值 `false`。

## field ResumeRaises:bool = false

**这一次恢复，是「往挂起点抛一个值」还是「把一个值放进 `yield` / `await` 那一格」**。

**第 313 轮它长在 `Vm` 上**（见那一轮的说明）——那一版是对的，因为那时**只有一个**恢复者
（`DoIterNext`），而且它设完**立刻**在同一个调用里把帧压回栈上、被恢复的那一帧的
第一条指令正是 `resume`，中间插不进别的东西。

**第 330 轮它必须落到帧上**：多出来**第二个**恢复者——`RejectPromise`。
一个被拒绝的承诺可能**同时**排着**好几个**等着它的帧（`Promise.all` 那一族天生如此），
而它们不是当场恢复的：`RejectPromise` 只是把句柄推进微任务队列，
真正恢复要等 `DrainMicrotasks` 一条一条地跑。
**一个机器级的瞬时格装不下「排着队的每一条各自的答案」**
（写成一格的话，第二个排队者的答案会把第一个盖掉 ⇒ 一半的 `await` 拿到的是**值**而不是**抛**，
**静默错值**）。所以它搬到**帧**上——与同族的 `SuspendedInAwait`、`ResumeValue`、
`AsyncPromise` 住在一起（「谁收尾谁要知道它是谁」是同一条理由）。

**谁写谁清**：`DoIterNext`（生成器那一路的 `throw`）与 `RejectPromise`（被拒绝的承诺）
写，`Op.Resume` 读走并清掉——**只写不清就是下一次凭空抛一次**（第 313 轮就是这么写的）。

**它不是根**（一个布尔）；初值 `false`。

## field GeneratorReturnRequested:bool = false

**这一次恢复，是一次 `return` 完成（`it.return(v)`）吗**（第 336 轮）。

**它与 `ResumeRaises` 住在同一族、同一个位置**（都在帧上，理由与上面那一段一字不差：
**排队等着恢复的不止一个**，而每一条各自的答案只有它自己知道）。

**为什么不能与 `ResumeRaises` 合成一格**：`return` 要的**不是抛**——
抛出去会被 `catch` 接住，而 JS 的 `return` **只跑 `finally`**、`catch` 不接
（`try { yield 1 } catch { … } finally { … }` 里 `it.return()` 只跑 `finally`）。
所以「抛一个哨兵、让降级层自己认」那一招也不能用（哨兵会被 `catch` 接走）。

**谁写谁清**：`DoIterNext`（`return` 那一路）写，`Op.CheckGeneratorReturn`
读走并清掉——**只写不清就是下一次恢复也跳一次**（而那时 JS 那边早就把它交给
`finally` 里那个 `yield` 了）。

**它不是根**；初值 `false`。

## constructor:(code:int, slotCount:int, prev:int, returnSlot:int)=>void

按槽数开一帧，槽先全部填成 `undefined`（**不留空槽**：未初始化的槽若带着上一轮的垃圾值，
回收器会顺着它走）。

```ts
this.Code = code;
this.Env = 0;
this.Pc = 0;
this.Prev = prev;
this.ReturnSlot = returnSlot;
this.Done = false;
this.This = new Value();
this.ConstructTarget = 0;
this.NewTarget = new Value();
this.Generator = 0;
this.AsyncPromise = 0;
this.Awaiting = new Value();
this.SuspendedInAwait = false;
this.ResumeRaises = false;
this.ResumeValue = new Value();
this.GeneratorReturnRequested = false;
this.Slots = [];
for (let i = 0; i < slotCount; i++) {
  this.Slots.push(Value.Undefined());
}
```

## method Charge:()=>int

计费字节。槽数组是这一格的主要开销；`This` 也是一个值，算进去。

```ts
return ValueCharge + this.Slots.length * ValueCharge;
```

# class HeapFunction

内建函数或宿主函数（`ValueTag.Function` 那一档的载荷）。

脚本看不见 `HostId`：它只能是「内建 id 表」或「宿主能力表」里的号，**没有别的入口**
（安全第 6 层）。

## field HostId:int = 0

调用的目标号（内建走 id 表，宿主能力走能力表）。

## field Arity:int = 0

形参个数。

## field Name:int = 0

名字字符串的句柄；`0` 表示匿名。

## constructor:(hostId:int, arity:int, name:int)=>void

造一个函数对象。

```ts
this.HostId = hostId;
this.Arity = arity;
this.Name = name;
```

## method Charge:()=>int

计费字节。函数对象没有额外存储，所以是 0。

```ts
return 0;
```

# class HeapHostRef

宿主交给脚本的不透明句柄（`ValueTag.HostRef` 那一档的载荷）。

脚本**只能**把它原样传回宿主。`Opaque` 由宿主解释，规范层永远不看它的内部。

## field CapabilityId:int = 0

它属于哪一类能力（注册宿主能力时给的号）。

## field Opaque:int = 0

宿主自己的不透明载荷。

## constructor:(capabilityId:int, opaque:int)=>void

造一个宿主句柄。

```ts
this.CapabilityId = capabilityId;
this.Opaque = opaque;
```

## method Charge:()=>int

计费字节。宿主句柄没有额外存储，所以是 0。

```ts
return 0;
```

# class HeapObject

对象表里的一格。

**胖对象**：一个类装下所有载荷，非当前 `Tag` 的载荷一律为 `null`。这样回收器只要看 `Tag`
就知道该顺着哪几个格子走、计费该算哪几块。代价是表项本身大一点，**这笔账记在这里**；
目标内可以换成载荷联合或平行数组（结构体数组），只要可观测语义不变、账本口径不变。

## field Tag:ValueTag = ValueTag.Undefined

这一格的标签。只取**七档引用型**；`Undefined` 是「这一格是空的」（见文首哨兵一节）。

## field Mark:bool = false

标记位，回收器用。

## field ChargedBytes:int = 0

这一格**上次记账**的字节数。`Retire` 退的是它（不是重算的 `Charge()`）——
因为载荷可能在上次结账之后被改过，退错了账就会把账本推高或推低。

## field Proto:int = 0

原型对象的句柄（`0` 表示没有原型）。原型链查找是 `rt_get_prop` 的活，这里只存。

## field Extensible:bool = true

**这个对象还可不可以长出新属性**（第 333 轮）——`Object.seal` / `Object.freeze` /
`Object.preventExtensions` 三件事的**共同那一半**。

**为什么它必须住在这一层**（这一轮实测撞到的）：`SetPropertySearched`
（`props.xl.md`）在「没找到 ⇒ 在接收者上新造一格」那一步要问它，
而**语言层那一份标记**（`globals.xl.md` 的 `SealedMarkName` 一个隐藏属性）
**它读不到**——依赖方向是「语言层认识运行时」，反过来成环。

**为什么不能省**：少了这一问，`const o = Object.freeze({a: 1}); o.b = 3`
会**真的造出 `b`**——于是 `Object.isFrozen(o)` 从**真**变成**假**
（新造的那一格是「可写 + 可配置」），而**用户看到的因果是反的**：
先冻结、再赋值一次，冻结就没了（判据 `object-freeze` 现场量的就是这一条：
Node 给 `1 undefined true false`，本仓给 `1 3 false false`——**三个都歪**）。

**默认是真**（新造的对象都可扩展，与 JS 一致）；
**只追加字段**（线形态与回收器都不受影响——它不指向任何堆格子）。

## field Props:Array<Property> = []

自有属性表。v1 是线性数组；超过阈值转哈希索引是**这一层**的事（存储优化），
不是查询语义的事。

## field Str:HeapString | null = null

字符串载荷（`Tag` 为 `String` 时非空）。

## field Sym:HeapSymbol | null = null

符号载荷（`Tag` 为 `Symbol` 时非空）。

## field Arr:HeapArray | null = null

数组载荷（`Tag` 为 `Array` 时非空）。

## field Closure:HeapClosure | null = null

闭包载荷（`Tag` 为 `Closure` 时非空）。

## field Function:HeapFunction | null = null

函数载荷（`Tag` 为 `Function` 时非空）。

## field Host:HeapHostRef | null = null

宿主句柄载荷（`Tag` 为 `HostRef` 时非空）。

## field Frame:HeapFrame | null = null

帧载荷（帧是引擎内部对象，`Tag` 为 `Object`；脚本拿不到它的句柄）。

## field Env:HeapEnv | null = null

环境载荷（环境也是引擎内部对象，`Tag` 为 `Object`；脚本同样拿不到它的句柄）。

## field Generator:HeapGenerator | null = null

生成器载荷（**脚本看得见生成器对象**，但看不到它身上挂的帧）。

## field Promise:HeapPromise | null = null

承诺载荷（脚本看得见承诺，但看不到它的状态与反应表）。

## field Iterator:HeapIterator | null = null

迭代游标载荷（**脚本看不见它**：`iter_new` 的产物只在引擎与降级层之间流转）。

## method Charge:()=>int

这一格按**当前载荷**算出的计费字节。

```ts
let total = ObjectCharge + this.Props.length * PropertyCharge;
if (this.Str !== null) total = total + this.Str.Charge();
if (this.Sym !== null) total = total + this.Sym.Charge();
if (this.Arr !== null) total = total + this.Arr.Charge();
if (this.Closure !== null) total = total + this.Closure.Charge();
if (this.Function !== null) total = total + this.Function.Charge();
if (this.Host !== null) total = total + this.Host.Charge();
if (this.Frame !== null) total = total + this.Frame.Charge();
if (this.Env !== null) total = total + this.Env.Charge();
if (this.Generator !== null) total = total + this.Generator.Charge();
if (this.Promise !== null) total = total + this.Promise.Charge();
if (this.Iterator !== null) total = total + this.Iterator.Charge();
return total;
```

## method Clear:()=>void

把这一格清空并置成「空的」。`Retire`、`AllocateRaw` 与回收器的清扫阶段共用它。

**载荷清空是必须的**：留着旧载荷会让已经归还的格子仍然指向别的对象——那是一整类
「回收之后还活着」的 bug，也会让回收器顺着空格走下去。

```ts
this.Tag = ValueTag.Undefined;
this.Mark = false;
this.ChargedBytes = 0;
this.Proto = 0;
this.Props = [];
this.Str = null;
this.Sym = null;
this.Arr = null;
this.Closure = null;
this.Function = null;
this.Host = null;
this.Frame = null;
this.Env = null;
this.Generator = null;
this.Promise = null;
this.Iterator = null;
```

## method AsString:()=>HeapString

取字符串载荷；不是字符串就抛（**内部不变式被破坏**，是引擎的 bug，不是脚本的错——
所以它是宿主异常，不是脚本异常）。

```ts
if (this.Str === null) throw new Error("heap object is not a string");
return this.Str;
```

## method AsSymbol:()=>HeapSymbol

取符号载荷。

```ts
if (this.Sym === null) throw new Error("heap object is not a symbol");
return this.Sym;
```

## method AsArray:()=>HeapArray

取数组载荷。

```ts
if (this.Arr === null) throw new Error("heap object is not an array");
return this.Arr;
```

## method AsClosure:()=>HeapClosure

取闭包载荷。

```ts
if (this.Closure === null) throw new Error("heap object is not a closure");
return this.Closure;
```

## method AsFunction:()=>HeapFunction

取函数载荷。

```ts
if (this.Function === null) throw new Error("heap object is not a function");
return this.Function;
```

## method AsHost:()=>HeapHostRef

取宿主句柄载荷。

```ts
if (this.Host === null) throw new Error("heap object is not a host ref");
return this.Host;
```

## method AsFrame:()=>HeapFrame

取帧载荷。

```ts
if (this.Frame === null) throw new Error("heap object is not a frame");
return this.Frame;
```

## method AsEnv:()=>HeapEnv

取环境载荷。

```ts
if (this.Env === null) throw new Error("heap object is not an environment");
return this.Env;
```

## method AsGenerator:()=>HeapGenerator

取生成器载荷。

```ts
if (this.Generator === null) throw new Error("heap object is not a generator");
return this.Generator;
```

## method AsPromise:()=>HeapPromise

取承诺载荷。

```ts
if (this.Promise === null) throw new Error("heap object is not a promise");
return this.Promise;
```

## method AsIterator:()=>HeapIterator

取迭代游标载荷。

```ts
if (this.Iterator === null) throw new Error("heap object is not an iterator");
return this.Iterator;
```

# class HeapTable

对象表。

句柄就是下标。`Objects[0]` 是哨兵（见文首），所以**合法句柄恒大于 0**。

**发格子与结账分两步**：`AllocateRaw` 只发（不计费），创建工厂填好载荷后调 `Finish` 结账。
分成两步是因为计费要看**载荷**（字符串多长、数组几个元素），而载荷是发完格子才填的；
把它拆开，就没有「先按空壳记账，之后再补记」那条漏记的路。

## field Objects:Array<HeapObject> = []

表本身。下标即句柄。

## field NextSymbolId:int = 1

**下一个符号的身份号**（`HeapSymbol.Id`）。

**为什么计数器在堆上**：`Symbol('a') !== Symbol('a')` 靠的是**身份**，而「哪些身份已经发过」
必须有个**唯一的地方**记——**一个堆就是一个身份空间**（同一台 VM 里两个模块拿到的
`Symbol('a')` 也不相等，这正是 JS 的语义）。放在语言层就变成「谁先装库谁发号」，
那会随加载顺序变。

## field FreeList:Array<int> = []

可回收的句柄栈。从尾部取（`PopInt`），所以最近回收的先被复用——
这对缓存友好，也让「刚死又刚生」的临时对象复用同一格。

## field LiveCount:int = 0

活对象个数（哨兵不算）。

## field Charged:int = 0

已计费字节总数。它与安全层的堆上限直接比。

## constructor:()=>void

造表：先放哨兵。

```ts
this.Objects.push(new HeapObject());
this.LiveCount = 0;
this.Charged = 0;
```

## method Capacity:()=>int

表的高水位（含哨兵与空格）。回收器遍历 `1 .. Capacity()-1`。

```ts
return this.Objects.length;
```

## method IsValid:(handle:int)=>bool

句柄是否指向一个活对象。三个条件缺一不可，**顺序也是判据的一部分**：
先挡 `<= 0`（含哨兵与负号），再挡越界，最后看标签。

```ts
if (handle <= 0) return false;
if (handle >= this.Objects.length) return false;
return this.Objects[handle].Tag !== ValueTag.Undefined;
```

## method Get:(handle:int)=>HeapObject

取对象；句柄不合法就抛。**「调用方保证合法」是不成立的**——`Get` 自己挡，
因为越界句柄是脚本可以间接触发的路径（安全第 2 层）。

```ts
if (!this.IsValid(handle)) throw new Error("invalid handle: " + handle);
return this.Objects[handle];
```

## method AllocateRaw:(tag:ValueTag)=>int

发一格：优先复用空闲链，否则扩表。**不计费**——账由 `Finish` 结。

只给下面的创建工厂用；直接用它就必须自己 `Finish`，否则这一格不进账本。

```ts
const recycled = PopInt(this.FreeList);
if (recycled > 0) {
  const reused = this.Objects[recycled];
  reused.Clear();
  reused.Tag = tag;
  this.LiveCount = this.LiveCount + 1;
  return recycled;
}
const created = new HeapObject();
created.Tag = tag;
this.Objects.push(created);
this.LiveCount = this.LiveCount + 1;
return this.Objects.length - 1;
```

## method Finish:(handle:int)=>void

按当前载荷结账（分配路径的最后一步）。

```ts
const item = this.Objects[handle];
item.ChargedBytes = item.Charge();
this.Charged = this.Charged + item.ChargedBytes;
```

## method Retire:(handle:int)=>void

把一个对象交还给空闲链：先退账、再清格、最后入链。

**失败要静默**（句柄不合法或本来就是空的）：回收器的清扫阶段会顺序扫过整张表，
空格是常态，让它每个空格抛一次异常会把这个接口变得没法用。

```ts
if (handle <= 0) return;
if (handle >= this.Objects.length) return;
const item = this.Objects[handle];
if (item.Tag === ValueTag.Undefined) return;
this.Charged = this.Charged - item.ChargedBytes;
item.Clear();
this.FreeList.push(handle);
this.LiveCount = this.LiveCount - 1;
```

## method Recount:(handle:int)=>void

重算某一格的账并修正总额。**改过载荷之后调用**（加属性、塞元素、改字符串内容）。

回收的标记阶段会对每个活对象调用它，所以两次回收之间的漏记最多存在一个回收周期。

```ts
if (handle <= 0) return;
if (handle >= this.Objects.length) return;
const item = this.Objects[handle];
if (item.Tag === ValueTag.Undefined) return;
const fresh = item.Charge();
this.Charged = this.Charged + fresh - item.ChargedBytes;
item.ChargedBytes = fresh;
```

## method RecountAll:()=>void

重算全表并覆盖总额。**回收的标记阶段调用它**——顺路（标记本来就要走遍每个活对象），
所以它不额外花一趟。

```ts
let total = 0;
for (let i = 1; i < this.Objects.length; i++) {
  const item = this.Objects[i];
  if (item.Tag === ValueTag.Undefined) continue;
  const fresh = item.Charge();
  item.ChargedBytes = fresh;
  total = total + fresh;
}
this.Charged = total;
```

## method CreateObject:()=>int

造一个普通对象。原型的指定是调用方的事（`rt_new_object` 按内建原型表给）。

```ts
const handle = this.AllocateRaw(ValueTag.Object);
this.Finish(handle);
return handle;
```

## method CreateArray:()=>int

造一个空数组。

```ts
const handle = this.AllocateRaw(ValueTag.Array);
const item = this.Objects[handle];
item.Arr = new HeapArray();
this.Finish(handle);
return handle;
```

## method CreateString:(units:Array<int>)=>int

造一个字符串。**码元序列在这里就位**，所以账一次记全。

```ts
const handle = this.AllocateRaw(ValueTag.String);
const item = this.Objects[handle];
item.Str = new HeapString(units);
this.Finish(handle);
return handle;
```

## method CreateSymbol:(description:int)=>int

造一个符号：**身份号由堆自己发**（见 `NextSymbolId`），调用方只给描述。

**改过一次签名**：原来是 `(id, description)`，由调用方给号——那份写法没有调用方，
而「谁来发号」正是这件事的关键（见 `NextSymbolId` 的说明），所以收进堆里。

```ts
const handle = this.AllocateRaw(ValueTag.Symbol);
const item = this.Objects[handle];
item.Sym = new HeapSymbol(this.NextSymbolId, description);
this.NextSymbolId = this.NextSymbolId + 1;
this.Finish(handle);
return handle;
```

## method CreateClosure:(code:int, env:int, arity:int, name:int, source:int)=>int

造一个闭包。

```ts
const handle = this.AllocateRaw(ValueTag.Closure);
const item = this.Objects[handle];
item.Closure = new HeapClosure(code, env, arity, name, source);
this.Finish(handle);
return handle;
```

## method CreateFunction:(hostId:int, arity:int, name:int)=>int

造一个内建或宿主函数对象。

```ts
const handle = this.AllocateRaw(ValueTag.Function);
const item = this.Objects[handle];
item.Function = new HeapFunction(hostId, arity, name);
this.Finish(handle);
return handle;
```

## method CreateHostRef:(capabilityId:int, opaque:int)=>int

造一个宿主句柄。

```ts
const handle = this.AllocateRaw(ValueTag.HostRef);
const item = this.Objects[handle];
item.Host = new HeapHostRef(capabilityId, opaque);
this.Finish(handle);
return handle;
```

## method AttachCallable:(handle:int, capabilityId:int, opaque:int)=>void

**给一个已经存在的对象挂上「可被调用」那一格载荷**（第 145 轮）——于是它同时是
**对象**（属性、原型、`Object.keys` 都照旧）与**可调用值**（`String(x)` / `new Date(ms)`）。

**为什么是「对象带一格宿主载荷」，而不是「宿主引用带一张属性表」**：
两条候选修法都摆在台账里（`vm.xl.md` 的 `DoNew` 那一段），选这一条的理由是
**改动落在哪一侧**：

| 候选 | 代价 |
| --- | --- |
| 宿主引用带属性表 | 宿主引用今天**没有出边**（`gc.xl.md` 的 `Trace` 写着「字符串与宿主句柄没有出边」），加属性表就要让**回收器**多跟一条边、让 `Charge` / `Clear` 多管一块载荷——而那一档本来是「原样传回宿主、规范层不看内部」 |
| **对象带一格可调用载荷**（选的这条） | **一处结构都不用加**：对象本来就有属性表，而 `Charge` / `Clear` 两处**早就按 `Host !== null` 判过**（那两行原来只为宿主引用而写，对对象同样成立） |

**`Tag` 不变**：挂上之后它仍然是 `Object`——属性照查、`instanceof` 照走原型、
`Object.keys` 照列。**变的只有「能不能被调用」**（`vm.xl.md` 的 `DoCallValue` /
`DoNew` 各多一条判据）。

**不影响回收**：宿主载荷是**内联的两个 int**（`HeapHostRef`），没有句柄可跟——
`gc.xl.md` 的 `Trace` 一行都不用改。`AllocateRaw` 复用空格时走 `Clear()`，
所以**回收过的格子不会带着上一次的可调用载荷**（不然「随便一个对象能被调用」就是
最难查的一种）。

```ts
const item = this.Objects[handle];
if (item.Tag !== ValueTag.Object) throw new Error("attach_callable needs an object");
item.Host = new HeapHostRef(capabilityId, opaque);
this.Recount(handle);
```

## method CreateFrame:(code:int, slotCount:int, prev:int, returnSlot:int)=>int

造一个调用帧。槽数组在这里就位，所以账一次记全。

```ts
const handle = this.AllocateRaw(ValueTag.Object);
const item = this.Objects[handle];
item.Frame = new HeapFrame(code, slotCount, prev, returnSlot);
this.Finish(handle);
return handle;
```

## method CreateEnv:(slotCount:int, parent:int)=>int

造一个环境记录。

```ts
const handle = this.AllocateRaw(ValueTag.Object);
const item = this.Objects[handle];
item.Env = new HeapEnv(slotCount, parent);
this.Finish(handle);
return handle;
```

## method CreateGenerator:(frame:int)=>int

造一个生成器对象（初始挂起）。**它不分配帧**——帧由调用方先开好。

```ts
const handle = this.AllocateRaw(ValueTag.Object);
const item = this.Objects[handle];
item.Generator = new HeapGenerator(frame);
this.Finish(handle);
return handle;
```

## method CreatePromise:(state:int, value:Value)=>int

造一个承诺。

```ts
const handle = this.AllocateRaw(ValueTag.Object);
const item = this.Objects[handle];
item.Promise = new HeapPromise(state, value);
this.Finish(handle);
return handle;
```

## method CreateIterator:(source:int)=>int

造一个迭代游标，指向 `source`，从第 0 格开始。

```ts
const handle = this.AllocateRaw(ValueTag.Object);
const item = this.Objects[handle];
item.Iterator = new HeapIterator(source);
this.Finish(handle);
return handle;
```
