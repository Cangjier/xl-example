# dependencies
```xl
import { Value, ValueTag } from "../../runtime/value.xl.md"
import { HeapTable, HeapArray, PropertyKind } from "../../runtime/heap.xl.md"
import { RoomChecker, TextUnitsOf, ToPrimitiveOf, ToPrimitiveString } from "../../runtime/rt.xl.md"
import { HostTextUnits, NumberToHostText } from "../../runtime/host-text.xl.md"
import { GetProperty, NativeCall, Protos, FindProperty, NeverRoom } from "../../runtime/props.xl.md"
```

# namespace cangjie

**标准库的一小块：任意值 → 文本**（第 124 轮）。

# method BoxKey:(table:HeapTable)=>Value

**包装对象上「里面那个原始值」挂在哪个键下**（第 310 轮 ✓）——
与 `__k` / `__v` / `__boundTarget` 那一族**同一个理由** ✓（每一次现造 ✓，按内容比 ✓）。

**为什么是隐藏属性而不是普通属性** ✗：`Object.keys(new Number(5))` 在 JS 里是 `[]` ✓，
挂成普通属性会当场给 `["__box"]` ✗——**静默错值** ✓
（与 `Map` 的内部格、`__b` 那条同一个坑 ✓）。

**为什么放在这一层** ✓：`globals.xl.md` 与 `string.xl.md` **都要它** ✓
（前者造箱、后者脱箱 ✓），而两边**互相不能 import** ✗（`globals` 已经 import 了 `string` ✓）。
`text.xl.md` 是它们共同的落点 ✓——而且「取这个值里面的原始值」本来就是一桩**值与文本之间**的家务事 ✓。

**用 `HostUnits` 而不是 `Units`** ✗：后者在 `array.xl.md` 里 ✓，而 `array` **import 了本文件** ✓
——import 回来就是一个环 ✗（本文件自己那个 `HostUnits` 正是为这种事准备的 ✓）。

```ts
return Value.FromString(table.CreateString(HostUnits("__box")));
```

# method UnwrapBox:(table:HeapTable, value:Value)=>Value

**包装对象 → 里面那个原始值**；**不是包装对象就原样返回** ✓（第 310 轮 ✓）。

**判据是「自有那一格在不在」** ✓——`FindProperty` 会**沿原型链**找 ✗，
所以找到之后还要问一句 `Owner === value.Ref` ✓（与 `defineProperty` 那条同一个写法 ✓）。

**不是对象就直接返回** ✓（原始值走的正是这一支 ✓，绝大多数调用都是它 ✓）。

```ts
if (value.Tag !== ValueTag.Object) return value;
const found = FindProperty(NeverRoom, table, value.Ref, BoxKey(table));
if (found === null || found.Owner !== value.Ref) return value;
const property = table.Get(found.Owner).Props[found.Index];
// **访问器不算** ✓（内部格一定是数据属性 ✓；真遇到访问器就当它不是箱 ✓）。
if (property.Kind === PropertyKind.Accessor) return value;
return property.Value;
```

# method ToStringOfObject:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, value:Value)=>Value | null

**对象自己的 `toString`**（第 193 轮 ✓）——有就给它的结果 ✓、没有就给 `null` ✓。

**为什么需要它** ✗：`${new C()}` / `"x" + new C()` / `String(new C())` 在 JS 里走
`ToPrimitive(o, "string")` ✓ → **先问对象自己的 `toString`** ✓
（`class C { toString() { return "C!"; } }` 的实例印出 `C!` ✓）。
本仓原来**一步都不问** ✓、直接给 `[object Object]` ✓——
那一刻是「**静默错值**」✗（每一格单看都像对的 ✓，只有与 Node 逐字节比才看得出来 ✓）。

**只看「自有或原型链上那一格是不是能被调」** ✓（`GetProperty` 走链 ✓）：
拿到了就**带 `this = 那个对象`** 调一次 ✓；结果**必须是字符串** ✓（JS 的口径 ✓：
`toString` 给了非原始值就往下走 `valueOf` ✗——那一半还没做 ✓，记在台账里 ✓）。
**没有那一格**（普通对象 / `Object.prototype` 上没挂默认 `toString` ✓）→ `null` ✓，
调用方照旧落回 `[object Object]` ✓（口径没变 ✓）。

```ts
if (!value.IsObject()) return null;
// **带可调用载荷的对象（`String` / `Number` / `Date` …）跳过** ✓：JS 印的是**源码文本** ✗
// （这一层拿不到 ✓），与 `ValueUnits` 里那条口径一致 ✓（宁可抛也不编一个 ✓）。
if (table.Get(value.Ref).Host !== null) return null;
// **数组跳过** ✓：数组的渲染这一层本来就有答案（`ValueUnits` 里那条 `join` ✓）——
// 绕到 `toString` 上等于把同一件事写成两份 ✓（而且 `[1,2].toString()` 走的是
// 数组自己的那一支，不是普通对象的 ✓）。
if (value.Tag === ValueTag.Array) return null;
if (call === null) return null;
const toStringValue = GetProperty(room, call, protos, table, value,
  Value.FromString(table.CreateString(HostTextUnits("toString"))));
// **可调用的两档**（闭包 ✓ / 内建 ✓，与引擎 `IsHostCallable` 同一条口径 ✓）。
const callable = toStringValue.IsCallable()
  || (toStringValue.Tag === ValueTag.Object && table.Get(toStringValue.Ref).Host !== null);
if (!callable) return null;
const produced = call(toStringValue, value, []);
// **给原始值就算数** ✓（JS 的口径 ✓）：`toString() { return 42; }` 在 JS 里
// `String(o)` 给 `"42"` ✓——**转换由调用方做** ✓（这一层只回答「ToPrimitive 给了什么」✓）。
// **给了对象就往下走 `valueOf`** ✗——那一半还没做 ✓，所以给 `null` ✓（落回默认 ✓）。
if (produced.IsObject()) return null;
return produced;
```


**它为什么必须有**：引擎的 `TextUnitsOf`（`runtime/rt.xl.md`）**只做它认识的那几档** ✓
（字符串 / 整数 / 布尔 / `null` / `undefined` ✓），其余一律**抛** ✓——而「其余」里
有两样是**日常**：**浮点数** ✓（`5 / 2` 这种算出来的小数 ✓）与**对象 / 数组** ✓
（`[obj].join()`、`console.log(obj)`、`new Error(obj)` ✓）。

**为什么这个决定在语言层、不在引擎里** ✓：
「`1.5` 显示成 `1.5`」「普通对象显示成 `[object Object]`」「数组按 `,` 连起来」——
**每一条都是 JS 家族的语义** ✗，换一门语言一套都用不上 ✓。
引擎只该说「这个值我渲染不了」 ✓（它现在就是这么做的 ✓），
而**渲染成什么**由这一层给 ✓。

**一处诚实的借用** ✓：浮点的**最短往返十进制**（`String(1.5)` → `"1.5"`、
`String(0.1 + 0.2)` → `"0.30000000000000004"` ✓）用**宿主**的转换器 ✓——
正确舍入 + 最短往返是 IEEE 754 的活儿 ✓（TS 的 `String(x)`、C++ 的 `to_chars` 都给「最短且能往返」✓），
手写一遍（Grisu / Ryu 那一类）是另一个量级的工程 ✗。
**第 129 轮起这一处借用搬进了引擎**（[runtime/host-text.xl.md](../../runtime/host-text.xl.md)）✓：
线形态要承载 f64 常量 ✓，于是「十进制 ↔ 双精度」两个方向都要 ✓，收在一处才不会走偏 ✓。
**两条口子写在明处** ✗：`NaN` / `±Infinity` / `-0` **自己判** ✓（宿主打印它们的字面各不相同 ✗）；
**指数形式的写法**（`1e+21` 那几个字符）两个目标**可能**有差别 ✓（记在台账 ✓）。

**这里不碰 `+`** ✗：`"" + obj` 走的是**引擎**的拼接 ✓，而引擎只认它自己那几档 ✓——
那条路要动引擎（给它一个「渲染不了就问宿主」的钩子 ✓），**留给下一轮** ✓。
这一轮先把**语言层自己经手文本的地方**全部走通 ✓：
`console.log` / `Array.join` / `Error` 的消息 / `JSON` 的数字 ✓。

# method NumberToJsText:(value:double)=>string

**双精度 → JS 的 `String(x)` 那一条文本**（第 290 轮 ✓）——它与 `host-text.xl.md` 的
`NumberToHostText` **只差 `-0` 一格** ✓：JS 的 `String(-0)` 是 `"0"` ✓，
而线形态的规范文本必须**逐位往返** ⇒ 那一处只能是 `"-0"` ✓（`ir-verify` 钉着它 ✓）。

**为什么单开这一个方法** ✗：`-0` 这一格原来**只在 `ValueUnits` 里补过** ✓
（`console.log` 那条路 ✓），而**其余每一条取文本的路都直接问引擎** ✗
——实测四条全给 `"-0"` ✓：`String(-0)` ✓、`(-0).toString()` ✓、`` `${-0}` `` ✓、
`"" + -0` ✓——与 Node 逐字节比就是**四处静默错值** ✓。

**它不替换 `NumberToHostText`** ✗：两者的口径**故意不同** ✓（线形态要那一份 ✓、
JS 的字符串语义要这一份 ✓）。收成一处的是**「谁该用哪一份」** ✓，不是那一份本身 ✓。

```ts
const text = NumberToHostText(value);
return text === "-0" ? "0" : text;
```

# method JsTextUnits:(table:HeapTable, value:Value)=>Array<int>

**任意值 → JS 的 `ToString` 码元**：引擎的 `TextUnitsOf` 加上 `-0` 那一格（见上 ✓）。

语言层凡是「按 JS 取文本」的地方（`String(x)` ✓ / `+` 与模板串 ✓ / 各 `toString` ✓ /
把实参转成字符串的每一个内建 ✓）都走它 ✓；**线形态**（`ir-verify` ✓）与
**`console.log` 的数值渲染**（`inspect.xl.md` 直接问 `NumberToHostText` ✓，Node 的
`util.inspect(-0)` 印的就是 `-0` ✓）**不走** ✓。

```ts
if (value.Tag === ValueTag.Float64) return HostTextUnits(NumberToJsText(value.Dbl));
return TextUnitsOf(table, value);
```

# const TextMaxDepth:int = 64

**嵌套上限**（与 `MaxJsonDepth` 同一个理由 ✓）：数组可以**自引用** ✓
（`const a = []; a.push(a)` ✓），而这里是**宿主递归** ✓——宿主栈溢出**不可捕获** ✗
（`README` 的硬性约定第 2 条 ✓）。所以「环」与「太深」都变成**一条可捕获的错误** ✓，
代价照旧写在明处：**一个刻意做得很深（但无环）的数组也会被拒** ✓。

# method HostUnits:(text:string)=>Array<int>

宿主字符串 → 码元。

**第 129 轮起这就是引擎那一份** ✓（`runtime/host-text.xl.md` 的 `HostTextUnits` ✓）。
原先这里自己写了一份四行循环 ✓，理由是「借 `array.xl.md` 的 `Units` 会成环」✗——
那个理由对 ✓，但它不是「非留一份不可」的理由 ✗：`host-text.xl.md` **不依赖任何东西** ✓，
所以「码元 ↔ 宿主字符串」的**两份实现**在这里收成一份 ✓
（引擎里那一条「宿主 API 只许出现在 `host-text.xl.md`」的判据也才立得住 ✓）。

```ts
return HostTextUnits(text);
```

# method ValueUnitsAt:(table:HeapTable, item:HeapArray, index:int, depth:int)=>Array<int>

**数组某一格的渲染**——**洞 / `undefined` / `null` 都给空串** ✓，其余走 `ValueUnits` ✓。

**为什么单开一个方法**：这条规矩**不只对顶层 `join` 成立** ✓——
`[[1, null]].toString()` 在 JS 里是 `"1,"` ✓（内层也跟着空 ✓），
而 `String(null)` 是 `"null"` ✓。两处（`join` 那一支与外层数组那一支）**必须同一条** ✓，
写两遍就是两处会走偏的判据 ✗（判据现场正是这么红的 ✓：
`[1, , 3].join("-")` 给 `"1-undefined-3"` ✗、`[null, undefined, true].join(",")` 给
`"null,undefined,true"` ✗，而 JS 给 `"1--3"` ✓ / `",,true"` ✓）。

```ts
if (item.IsHole(index)) return [];
const element = item.GetAt(index);
if (element.Tag === ValueTag.Undefined || element.Tag === ValueTag.Null) return [];
return ValueUnits(table, element, depth + 1);
```

# method JsElementUnits:(room:RoomChecker, call:NativeCall | null, protos:Protos, table:HeapTable, item:HeapArray, index:int, depth:int)=>Array<int>

**`Array.prototype.join` 里某一格该渲染成什么** ✓（第 338 轮 ✓）——**JS 的那一条** ✓：
洞 / `undefined` / `null` 给空串 ✓，**其余先走 `ToPrimitive(v, "string")`** ✓
（也就是**先问它自己的 `toString`** ✓），再把结果当文本 ✓。

**为什么不能直接用 `ValueUnitsAt`** ✗（**实测撞到的** ✓）：那一支对面对象**一律给
`[object Object]`** ✗（`ValueUnits` 的表格里写着 ✓，那是**它那一档的口径** ✓），
而 JS 的 `[obj, 1].toString()` 是 `obj.toString() + "," + "1"` ✓——
判据 `array-tostring-custom-values` / `c305-std-array-tostring-custom-element` 量的就是它 ✓
（Node 给 `C!,1` ✓、本仓给 `[object Object],1` ✓——**静默错值** ✗）。

**它凭什么一次就够** ✓：`ToPrimitive` 会**自己走到对象的 `toString`** ✓——
自定义的那个 ✓、`Array.prototype.toString`（= `join` ✓）✓、`Object.prototype.toString` ✓
**三档都落在同一条路上** ✓，所以这里**不必**自己递归数组 ✗（第 130 轮那条老判别仍然在
`ValueUnits` 里 ✓，它服务的是「没有调用通道」的那几处 ✓）。

**`call === null` 时退回老口径** ✓（`ValueUnitsAt` ✓）：宿主没接调用通道时
**调不动任何 `toString`** ✗，那时给 `[object Object]` 是**当时能做到的最好** ✓
（与「不说谎，只是不特殊」同一条 ✓——**写在明处** ✓）。

```ts
if (item.IsHole(index)) return [];
const element = item.GetAt(index);
if (element.Tag === ValueTag.Undefined || element.Tag === ValueTag.Null) return [];
if (call === null) return ValueUnits(table, element, depth + 1);
const primitive = ToPrimitiveOf(room, call, protos, table, element, ToPrimitiveString);
return JsTextUnits(table, primitive);
```

# method ValueUnits:(table:HeapTable, value:Value, depth:int)=>Array<int>

**任意值 → 码元**。分支如下（**顺序是语义** ✓）：

| 值 | 给什么 | 依据 |
| --- | --- | --- |
| 字符串 / 整数 / 布尔 / `null` / `undefined` | 交给引擎的 `TextUnitsOf` ✓ | 引擎已经认识这几档 ✓（口径只有一处 ✓） |
| **浮点** | **最短往返十进制** ✓ | `String(x)` 的语义 ✓；`NaN` / `±Infinity` / `-0` 自己判 ✓ |
| **普通对象** | `[object Object]` ✓ | `Object.prototype.toString` 的默认值 ✓ |
| **数组** | 元素各自渲染后**用 `,` 连起来** ✓ | `Array.prototype.toString` = `join(",")` ✓ |
| 函数 / 闭包 / 符号 / 宿主值 | **抛** ✓ | JS 给的是**源码文本**（`function f() { … }`）✗——那一份这一层拿不到 ✓，宁可抛也不编一个 ✗ |

**洞渲染成空串** ✓（JS：`[1, , 2].toString()` 是 `"1,,2"` ✓）——
`GetAt` 对洞给 `undefined` ✗，所以**先问 `IsHole`** ✓（判据里钉着这一条 ✓）。

```ts
if (depth > TextMaxDepth) {
  throw new Error("this value is nested too deeply to render (a cycle looks the same)");
}
if (value.Tag === ValueTag.Float64) {
  // **浮点 → 文本这一条收在 `JsTextUnits` 那一处** ✓（第 290 轮 ✓）：
  // 同一张符号名表（`NaN` / `±Infinity` / `-0`）原先在这里也有一份 ✗，两份就会有一天走偏 ✗。
  // **两处的口径在那里必须不同** ✓：JS 的 `String(-0)` 是 `"0"` ✓（字符串语义 ✓），
  // 而线形态的规范文本是 `"-0"` ✓（它要**逐位往返** ✓）——差别只有这一格 ✓，
  // 所以它是一条**明写的判断** ✓，不是两套渲染器 ✓。
  return JsTextUnits(table, value);
}
if (value.Tag === ValueTag.Object) {
  // **可调用对象与函数同一条**（第 145 轮）✓：`String` / `Number` / `Date` 这些
  // 现在**既是对象又能被调** ✓，而 JS 的 `String(String)` 给的是**源码文本**
  //（`function String() { [native code] }` ✓）——那一份这一层拿不到 ✗。
  // 所以它们与闭包 / 宿主函数走**同一条口径** ✓（宁可抛，也不编一个 ✗）。
  // **不能落进下面那句 `[object Object]`** ✗：JS 从不把函数印成 `[object Object]` ✓，
  // 那是**静默错值** ✗（第 144 轮刚把这一类清过一遍 ✓）。
  if (table.Get(value.Ref).Host !== null) {
    throw new Error("unimplemented: ToString of a function object (JS renders source text)");
  }
  return HostUnits("[object Object]");
}
if (value.Tag === ValueTag.Array) {
  const item = table.Get(value.Ref).AsArray();
  const out: number[] = [];
  for (let i = 0; i < item.GetLength(); i++) {
    if (i > 0) out.push(44);
    // **元素走 `ValueUnitsAt`** ✓：洞 / `null` / `undefined` 在那里渲染成空串 ✓
    //（JS 的 `join` 口径 ✓，而且**每一层**都成立 ✓）。
    const part = ValueUnitsAt(table, item, i, depth + 1);
    for (let j = 0; j < part.length; j++) out.push(part[j]);
  }
  return out;
}
// 其余交给引擎：它认识那几档 ✓，不认识就**它**抛 ✓（报的话也是它的 ✓）。
return TextUnitsOf(table, value);
```

# method ValueText:(table:HeapTable, value:Value)=>string

**任意值 → 宿主字符串**（`console.log` 那一类「要拼给人看的一行」用的就是它 ✓）。

与 `ValueUnits` 是**同一件事的两种出口** ✓：一个给码元（引擎侧的形状 ✓），
一个给宿主字符串（建库层本来就是宿主侧代码 ✓，理由同 `TextFrom` ✓）。

```ts
const units = ValueUnits(table, value, 0);
let text = "";
for (let i = 0; i < units.length; i++) {
  text = text + String.fromCharCode(units[i]);
}
return text;
```
