# namespace cangjie

执行层的值模型：**一个有标签的胖联合**。

它是 `runtime/` 里最底下的那一层——堆（`heap.xl.md`）、回收器（`gc.xl.md`）、指令集
（`ir.xl.md`）与所有 `rt_*` 算子都只通过这个类型交换数据。契约见
[docs/runtime-architecture.md](../docs/runtime-architecture.md) §3。

**三条不变式。**

1. **值只有四个载荷**：`Tag` 决定谁有效，别的载荷是垃圾。读错载荷**没有定义**，
   责任在 `rt_*` 的 tag 前置检查——这一层不做校验，也不再包一层。
2. **`Ref` 是堆句柄，不是指针**。句柄由对象表发放且**稳定**（回收器不移动），
   越界句柄由对象表的边界检查兜住——`Value` 自己不认识堆。
3. **JS 的 `number` 一律走 `Dbl`（f64）**。`Int` 只放小整数、索引与长度，以及布尔。

**为什么是胖联合。** 不用 NaN-boxing：那要求 f64 与 u64 之间的位重解释，xl 表达不了、也不该表达
（规范是写给四个目标语言看的，不是写给某一个逃逸口的）。不用装箱对象：那会让每个
数值都过一次分配。代价是字节数，**记在这里**：各目标可以在同一 IR 与同一语义下自行压到
8 字节，但那是目标内的优化，不动本文件的形状。

**宽度与溢出——今天的实话。** `Int` 的宽度**目前由目标语言的 `int` 映射决定**（ts 是 `number`，C++ 是 `int`，
Rust/C# 各自的 `int`）。所以：

- **不要把 `Int32` 当「32 位环绕整数」用**。需要环绕、需要 64 位、需要按位精确的地方，
  走 `docs/runtime-architecture.md` 的 P2（类型层补 `i32`/`i64`/`f64`/`byte` 并把溢出规则定死）；
- 本文件今天只保证「`Int32` 的值恰好是个整数，且落在各目标 `int` 的交集范围内」；
- `Dbl` 已经是 f64，没有这个问题。

这条不是风格问题：`int` 在 ts 上是双精度、在 C++ 上是 32 位，把它当环绕整数用会写出
**只在某一个目标上正确**的代码，而那正是本工程要消灭的东西。

# enum ValueTag

值的标签。

**只追加，不改序**：各目标按**位置**编号（ts 是自增枚举，C++ 是 `A = 0, B = 1`），
所以成员的顺序就是跨目标的约定；要改只能追加到末尾。

- case Undefined
未定义（`undefined`）。JS 里它是**独立的一档**，不是 `null`，只有 `==` 才把两者算相等。
- case Null
空值（`null`）。
- case Bool
布尔。载荷在 `Int`：`0` 为假、非 `0` 为真。
- case Int32
小整数。载荷在 `Int`。
- case Float64
浮点数。载荷在 `Dbl`。JS 的 `number` 一律是它。
- case String
字符串。载荷在 `Ref`：一个字符串对象的句柄。**内容是 UTF-16 码元序列**（`.length`、
下标、`charCodeAt` 全是码元语义，代理对算两个）。
- case Object
普通对象（含函数对象之外的一切对象）。载荷在 `Ref`。
- case Array
数组（`Array.isArray` 为真）。单独一档是为了让索引访问与长度走快路径，
它不是「另一种对象」——原型链上仍然是 `Object`。
- case Function
宿主或内建函数对象（`HostRef` 的一种常见形态）。载荷在 `Ref`。
- case Closure
降级期造出来的闭包（带环境记录的脚本函数）。载荷在 `Ref`。
- case HostRef
宿主交给脚本的不透明句柄。载荷在 `Ref`。脚本**只能**把它传回去，看不到里面是什么。
- case Symbol
符号（`typeof` 报 `"symbol"`）。载荷在 `Ref`：一个 `HeapSymbol` 的句柄。
它**不是对象**（挂不了属性），但和字符串一样能当属性键；**身份按 `HeapSymbol.Id` 比，不按内容比**。

# class Value

一个值。

四种载荷同放一个类里，是为了让它能按值传递（xl 没有值类型，所以复制走 `Clone`）。
`Tag` 是唯一可信的那一格。

## field Tag:ValueTag = ValueTag.Undefined

值的标签。唯一决定「哪个载荷有效」的一格。

## field Int:int = 0

整数载荷：`Bool` 的 0/1、`Int32` 的值。

## field Dbl:double = 0

浮点载荷：`Float64` 的值。

## field Ref:int = 0

堆句柄：`String` / `Object` / `Array` / `Function` / `Closure` / `HostRef` 的句柄。

## static method Undefined:()=>Value

造一个 `undefined`。

```ts
const result = new Value();
result.Tag = ValueTag.Undefined;
return result;
```

## static method Null:()=>Value

造一个 `null`。

```ts
const result = new Value();
result.Tag = ValueTag.Null;
return result;
```

## static method FromBool:(value:bool)=>Value

由布尔构造。

```ts
const result = new Value();
result.Tag = ValueTag.Bool;
result.Int = value ? 1 : 0;
return result;
```

## static method FromInt:(value:int)=>Value

由小整数构造。

```ts
const result = new Value();
result.Tag = ValueTag.Int32;
result.Int = value;
return result;
```

## static method FromDouble:(value:double)=>Value

由浮点构造。

```ts
const result = new Value();
result.Tag = ValueTag.Float64;
result.Dbl = value;
return result;
```

## static method FromRef:(tag:ValueTag, handle:int)=>Value

由「标签 + 句柄」构造。`String` / `Symbol` / `Object` / `Array` / `Function` / `Closure` /
`HostRef` 七档都走它——`tag` 由调用方保证是这七档之一。

```ts
const result = new Value();
result.Tag = tag;
result.Ref = handle;
return result;
```

## static method FromString:(handle:int)=>Value

由字符串句柄构造。`FromRef` 的一行包装：属性访问与字符串拼接里到处都是它。

```ts
return Value.FromRef(ValueTag.String, handle);
```

## static method FromObject:(handle:int)=>Value

由对象句柄构造。

```ts
return Value.FromRef(ValueTag.Object, handle);
```

## static method FromArray:(handle:int)=>Value

由数组句柄构造。

```ts
return Value.FromRef(ValueTag.Array, handle);
```

## method Clone:()=>Value

值语义复制。四个载荷一起抄——只抄 `Tag` 会让「提升过的值」在某个目标上悄悄换掉载荷。

```ts
const result = new Value();
result.Tag = this.Tag;
result.Int = this.Int;
result.Dbl = this.Dbl;
result.Ref = this.Ref;
return result;
```

## method IsUndefined:()=>bool

是否为 `undefined`。

```ts
return this.Tag === ValueTag.Undefined;
```

## method IsNull:()=>bool

是否为 `null`。

```ts
return this.Tag === ValueTag.Null;
```

## method IsNullish:()=>bool

是否为 `undefined` 或 `null`。空值合并与可选链的判据就是它。

```ts
return this.Tag === ValueTag.Undefined || this.Tag === ValueTag.Null;
```

## method IsBool:()=>bool

是否为布尔。

```ts
return this.Tag === ValueTag.Bool;
```

## method IsNumber:()=>bool

是否为数值（小整数或浮点）。

```ts
return this.Tag === ValueTag.Int32 || this.Tag === ValueTag.Float64;
```

## method IsString:()=>bool

是否为字符串。

```ts
return this.Tag === ValueTag.String;
```

## method IsSymbol:()=>bool

是否为符号。符号是**原始值**（`typeof` 报 `"symbol"`），不是对象——挂不了属性，
但能当属性键，而且身份不按内容比。

```ts
return this.Tag === ValueTag.Symbol;
```

## method IsRef:()=>bool

是否**带句柄**（七档引用型）。回收器扫根时问的是它，不是 `IsObject`。

```ts
return this.Tag === ValueTag.String
  || this.Tag === ValueTag.Symbol
  || this.Tag === ValueTag.Object
  || this.Tag === ValueTag.Array
  || this.Tag === ValueTag.Function
  || this.Tag === ValueTag.Closure
  || this.Tag === ValueTag.HostRef;
```

## method IsObject:()=>bool

是否是可带属性的对象（`Object` / `Array` / `Function` / `Closure`）。
属性访问的快路径判据：`String` 与 `HostRef` **不算**——前者走字符串原型，
后者只能原样传回宿主。

```ts
return this.Tag === ValueTag.Object
  || this.Tag === ValueTag.Array
  || this.Tag === ValueTag.Function
  || this.Tag === ValueTag.Closure;
```

## method IsCallable:()=>bool

是否可调用——**闭包与内建函数这两档**（**不带堆的那一半**）。

**它看不到「带可调用载荷的对象」**（第 145 轮）：那种值是 `Tag === Object`，
而「它身上那一格载荷在不在」要去**堆**里看，这一层没有表
（与 `AsBool` 的空串那一档同型）。
完整的答案在 `rt.xl.md` 的 `IsCallableValue(table, value)`——
**建库层问「这个实参能不能当回调」时要走那一个**，
拿这个方法去判会让 `[1, 2].map(String)` 报「需要一个函数」。

```ts
return this.Tag === ValueTag.Function || this.Tag === ValueTag.Closure;
```

## method AsBool:()=>bool

JS 的 `ToBoolean` 的**不带堆的那一半**：只看标签与载荷。

**它答全了「除空串以外」的每一档**——`undefined` / `null` / `0` / `-0` / `NaN` 为假、
其余为真。**空串是唯一的例外**：`""` 在 JS 里是**假**，而这里给**真**，
因为要知道一个字符串是不是空的，**必须去堆里看码元长度**，而 `Value` 这一层没有表
（`value.xl.md` 的 `Value` 是**纯值**：四个载荷 + 标签，不持有任何一个堆）。

**所以「一个值是不是真」的正确答案不在这个文件里**：它在 `rt.xl.md` 的 `TruthyOf`。
第 144 轮之前，三个地方（`jmp_if_false` / `!` / `Boolean(x)`）用的是**这个方法**，
于是 `if ("")` 走了真那一支——**静默错值**（没有报错，只有一个看起来像巧合的结果）。

**留着这个方法**：它的四个判断是 `TruthyOf` 里那四行的**同一个答案**，
而调用方在**已经确认过标签不是字符串**时（例如比较结果、`in` 的结果）
用它能省掉一次取表的绕路。**别拿它当 `ToBoolean` 用**。

`Float64` 的假值只有 `0` 与 `NaN`；`NaN` 用 IEEE 自比较判定（`x !== x`，
逐目标都成立），**不调任何库函数**——规范里出现 `Number.isNaN` 就等于把某一个目标的库
钉进了共用层。

```ts
if (this.Tag === ValueTag.Undefined) return false;
if (this.Tag === ValueTag.Null) return false;
if (this.Tag === ValueTag.Bool) return this.Int !== 0;
if (this.Tag === ValueTag.Int32) return this.Int !== 0;
if (this.Tag === ValueTag.Float64) return this.Dbl !== 0 && this.Dbl === this.Dbl;
return true;
```

## method AsInt:()=>int

取整数载荷。`Bool` 给 `0`/`1`，`Int32` 给自身，其余给 `0`。

**它不是 `ToNumber`**：字符串解析、`null` → `0`、`undefined` → `NaN` 都是 `rt_*` 的活
（那些要碰堆，也需要按 JS 规则抛错）。这里只回答「这一个格子的整数值是多少」，
调用方必须先确认标签。

```ts
if (this.Tag === ValueTag.Bool) return this.Int !== 0 ? 1 : 0;
if (this.Tag === ValueTag.Int32) return this.Int;
return 0;
```

## method LengthAsInt:()=>int

取**长度**那一格的整数值（第 735 轮）——`Int32` 直接给，**`Float64` 向零截断**。

**为什么它必须与 `AsInt` 分开**：`AsInt` 的口径是「**这个格子的整数载荷**是多少」，
它对 `Float64` 给 `0`（`value.xl.md` 那一段写着「其余给 0」）——那个口径在**下标**
那一侧是对的（下标就是整数），可**长度**那一侧不对：JS 的长度一律先过 `ToLength`
（`{ length: 2.5 }` 的 `ToLength` 是 **2**、`{ length: -1 }` 是 **0**、
`{ length: 0.9 }` 是 **0**）。

**实测撞到的**（第 735 轮）：`Array.from({ length: 2.5, 0: "a", 1: "b" })` 在 Node 里给
`["a","b"]`，本仓给 **`[]`**——`lengthValue.IsNumber()` 为真、`AsInt()` 给 `0`
⇒ 一次都不读（**静默错值**，一句异常都没有）。同一个形状在 `ArrayLikeLength`
（`Array.prototype.slice.call({ length: 2.5 })`）里各写了一份。

**所以收成一格**：长度那几处一律走它，`Float64` 那一档由它一家负责截断。
**向零截断**（不是 `Math.floor`）：`ToLength` 是 `ToIntegerOrInfinity` 再夹到
`0 .. 2^53-1`，而 `ToIntegerOrInfinity(-1.5)` 是 **-1**（截断）——负数随后由调用方
夹到 `0`（与原来那一句 `count < 0 ? 0` 一字不差）。

```ts
if (this.Tag === ValueTag.Int32) return this.Int;
if (this.Tag === ValueTag.Bool) return this.Int !== 0 ? 1 : 0;
if (this.Tag === ValueTag.Float64) {
  // **向零截断**：`Math.trunc` 对 `NaN` 给 `NaN`，而这里要给 `int` ⇒ 先挡掉。
  if (this.Dbl !== this.Dbl) return 0;
  return Math.trunc(this.Dbl);
}
return 0;
```

## method AsDouble:()=>double

取数值载荷，`Int32` 提升成 f64。同样**不是 `ToNumber`**。

```ts
if (this.Tag === ValueTag.Int32) return this.Int;
if (this.Tag === ValueTag.Float64) return this.Dbl;
return 0;
```

## method TagName:()=>string

标签名，给 IR dump 与运行期报错用。**不是 `typeof`**：`typeof` 是 JS 语义
（`Array` / `HostRef` 都会报 `"object"`），那份映射在 `rt_typeof` 里。

```ts
if (this.Tag === ValueTag.Undefined) return "undefined";
if (this.Tag === ValueTag.Null) return "null";
if (this.Tag === ValueTag.Bool) return "bool";
if (this.Tag === ValueTag.Int32) return "int32";
if (this.Tag === ValueTag.Float64) return "float64";
if (this.Tag === ValueTag.String) return "string";
if (this.Tag === ValueTag.Object) return "object";
if (this.Tag === ValueTag.Array) return "array";
if (this.Tag === ValueTag.Function) return "function";
if (this.Tag === ValueTag.Closure) return "closure";
if (this.Tag === ValueTag.HostRef) return "hostref";
if (this.Tag === ValueTag.Symbol) return "symbol";
return "unknown";
```
