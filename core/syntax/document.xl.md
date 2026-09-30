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

## constructor:(getValue:ValueGetter, getCount:CountGetter, Parent?:SourceRange | null)=>void

以取值器、长度器与父范围创建。

参数允许显式传 `null`：调用点会把「可能没有父范围」的结果直接写进来。

```ts
this.GetValue = getValue;
this.GetCount = getCount;
this.Parent = Parent ?? null;
```

## method At:(index:int)=>Source

取下标对应的**位置**。

每次访问都新建一个 `Source`，调用点不要依赖对象身份。

```ts
return new Source(this, index);
```

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
