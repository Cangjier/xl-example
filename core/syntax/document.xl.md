# dependencies
```xl
import { Source } from "./source.xl.md"
import { SourceRange } from "./source-range.xl.md"
```

# namespace cangjie

文档：按「下标 → 值」抽象出来的字符来源。语法层不关心底层是字符串、文件还是别的什么，只通过 `Document` 取长度、取值、取行号。`typescript/tokens` 里的 `TextDocument` 是它唯一的实现。

# type ValueGetter = (index:number)=>string

「按下标取值」的委托。

参数表里不直接写函数类型，改用这个别名；取值都是单字符组成的 `string`，别名右侧直接写 ts 语法。

# type CountGetter = ()=>number

「取长度」的委托。

# class Document

文档。

索引式的取值由 `At(index)` 方法承担。

## field GetValue:ValueGetter

按下标取值。

## field GetCount:CountGetter

取值的总个数。

## field Parent:SourceRange | null = null

父范围；文档可以嵌在另一个文档的范围里，顶层文档为 `null`。

## field CacheIndex:Array<int> = []

`At` 的四格直接映射备忘：每一槽记「上次是哪个下标」。

## field CacheSource:Array<Source | null> = []

与 `CacheIndex` 同一槽位的那个 `Source`——两格一起看，**槽位 = `index & 3`**。

## constructor:(getValue:ValueGetter, getCount:CountGetter, Parent?:SourceRange | null)=>void

以取值器、长度器与父范围创建。

参数允许显式传 `null`：调用点会把「可能没有父范围」的结果直接写进来。

两格备忘的初值也在这里给（`-1` 不是合法下标，所以第一趟必然答否）。

```ts
this.GetValue = getValue;
this.GetCount = getCount;
this.Parent = Parent ?? null;
this.CacheIndex = [-1, -1, -1, -1];
this.CacheSource = [null, null, null, null];
```

## method At:(index:int)=>Source

取下标对应的**位置**。

**同一个下标问第二遍就把上一次那一格还回去**（第 1214 轮，用户口径 1.2「提升 parse 效率」）：
访问形状是「**主循环问 `At(i)`，紧接着 `Source.Pre()` 问 `At(i-1)`**」（`Pre()` 的正文就是
`this.Document.At(this.Index - 1)`），而 `Source` 是**只读的值对象**（`Document` / `Index` / `Value`
三格全是构造时赋好、此后无人写——全仓扫过：只有 `Source` 的构造函数那一处写它们）。
同一格里问第二遍就不必再造一个对象、也不必回取值器再读一次字符。
实测一份 `typescript.d.ts` 上（`tmp/r1213-precnt.mjs`）：`Document.GetValue`
**1066638 → 622992**（−443646，−41.6%），少造的 `Source` 是同样多。

**判据只有一句「那个槽位里记的下标是不是就是我要的」**（直接映射、四格、没有链表）：

```ts
const slot = index & 3;
if (this.CacheIndex[slot] === index) {
  return this.CacheSource[slot]!;
}
const source = new Source(this, index);
this.CacheIndex[slot] = index;
this.CacheSource[slot] = source;
return source;
```

**调用点仍然不许依赖对象身份**（原来那句老话照旧）：备忘只保证「同一个下标**可能**给出同一个
对象」，不保证「不同下标给出不同对象」以外的任何事——所以谁也不许改它，也不许拿它当键。

## method GetRangeString:(range:SourceRange)=>string

范围的可读字符串。

基类实现直接返回 `range.ToString()`，由 `TextDocument` 覆盖成带 `^` 指示的多行文本。

```ts
return range.ToString();
```

## method GetRangeLines:(range:SourceRange)=>string

范围所在的行。

基类实现直接返回 `range.ToString()`，由 `TextDocument` 覆盖。

```ts
return range.ToString();
```

## method GetLine:(index:int)=>int

下标所在的行号。

基类不实现，由 `TextDocument` 覆盖。

```ts
throw new Error("抽象成员未实现");
```

## method GetLineOffset:(index:int)=>int

下标在其所在行内的偏移。

基类不实现，由 `TextDocument` 覆盖。

```ts
throw new Error("抽象成员未实现");
```

## method GetLineInfo:(index:int)=>Array<int>

下标所在行的 `[行号, 行内偏移]`。

返回两个元素组成的数组；基类不实现，由 `TextDocument` 覆盖。

```ts
throw new Error("抽象成员未实现");
```

## method GetRaw:(start:int, end:int)=>string

文档上 `[start, end]` 的原始文本。

基类不实现，由 `TextDocument` 覆盖。

```ts
throw new Error("抽象成员未实现");
```

## method GetScriptPath:()=>string

文档对应的脚本路径；基类不实现。

基类不实现，由 `TextDocument` 覆盖。

```ts
throw new Error("抽象成员未实现");
```
