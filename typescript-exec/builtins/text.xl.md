# dependencies
```xl
import { Value, ValueTag } from "../../runtime/value.xl.md"
import { HeapTable, HeapArray } from "../../runtime/heap.xl.md"
import { TextUnitsOf } from "../../runtime/rt.xl.md"
```

# namespace cangjie

**标准库的一小块：任意值 → 文本**（第 124 轮）。

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
**两条口子写在明处** ✗：`NaN` / `±Infinity` / `-0` **自己判** ✓（宿主打印它们的字面各不相同 ✗）；
**指数形式的写法**（`1e+21` 那几个字符）两个目标**可能**有差别 ✓（记在台账 ✓）。

**这里不碰 `+`** ✗：`"" + obj` 走的是**引擎**的拼接 ✓，而引擎只认它自己那几档 ✓——
那条路要动引擎（给它一个「渲染不了就问宿主」的钩子 ✓），**留给下一轮** ✓。
这一轮先把**语言层自己经手文本的地方**全部走通 ✓：
`console.log` / `Array.join` / `Error` 的消息 / `JSON` 的数字 ✓。

# const TextMaxDepth:int = 64

**嵌套上限**（与 `MaxJsonDepth` 同一个理由 ✓）：数组可以**自引用** ✓
（`const a = []; a.push(a)` ✓），而这里是**宿主递归** ✓——宿主栈溢出**不可捕获** ✗
（`README` 的硬性约定第 2 条 ✓）。所以「环」与「太深」都变成**一条可捕获的错误** ✓，
代价照旧写在明处：**一个刻意做得很深（但无环）的数组也会被拒** ✓。

# method HostUnits:(text:string)=>Array<int>

宿主字符串 → 码元。

**为什么不借 `array.xl.md` 的 `Units`** ✗：那一块要**用**本模块 ✓（`join` 要靠它渲染元素 ✓），
借过来就成了**循环依赖** ✓（`array` → `text` → `array`）✗。
四行循环换一条干净的依赖方向 ✓，划算 ✓。

```ts
const units: number[] = [];
for (let i = 0; i < text.length; i++) {
  units.push(text.charCodeAt(i));
}
return units;
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
  const number = value.Dbl;
  if (number !== number) return HostUnits("NaN");
  if (number === Infinity) return HostUnits("Infinity");
  if (number === -Infinity) return HostUnits("-Infinity");
  // **零自己判**：`String(-0)` 在 JS 里是 `"0"` ✓（宿主可能给 `"-0"` ✗）。
  if (number === 0) return HostUnits("0");
  return HostUnits(String(number));
}
if (value.Tag === ValueTag.Object) {
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
