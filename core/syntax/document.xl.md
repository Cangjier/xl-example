# dependencies
```xl
import { Source } from "./source.xl.md"
import { SourceRange } from "./source-range.xl.md"
```

# namespace cangjie

文档：按「下标 → 值」抽象出来的字符来源。语法层不关心底层是字符串、文件还是别的什么，只通过 `Document` 取长度、取值、取行号。`Dawn/Text` 里的 `TextDocument` 是它唯一的实现。

# type ValueGetter = (index:number)=>string

「按下标取值」的委托。

原 C# 侧是 `Func<int, ValueType>`。按 M22，参数表里不直接写函数类型，改用这个别名；`ValueType` 在规范里定死为 `string`（M31）。按 M26，右侧直接写 ts 语法。

# type CountGetter = ()=>number

「取长度」的委托。

原 C# 侧是 `Func<int>`。

# class Document

文档。

原 C# 侧还有 `this[int index]` 索引器，按 M19 映射成 `At(index)` 方法。

原 C# 侧这个类还实现 `IReleasable`、持有 `Owner` 字段；资源归属层已移除，这些成员与 `Release` 都没有对应物
（见 README「资源生命周期：交给 GC」）。

## field GetValue:ValueGetter

按下标取值。

原 C# 侧是 `Func<int, ValueType> GetValue { get; private set; }`。

## field GetCount:CountGetter

取值的总个数。

原 C# 侧是 `Func<int> GetCount { get; private set; }`。

## field Parent:SourceRange | null = null

父范围；文档可以嵌在另一个文档的范围里，顶层文档为 `null`。

## constructor:(getValue:ValueGetter, getCount:CountGetter, Parent?:SourceRange | null)=>void

以取值器、长度器与父范围创建。

参数允许显式传 `null`——原 C# 签名是 `Document(IOwner owner, Func<int, ValueType> getValue, Func<int> getCount, SourceRange<ValueType>? Parent = null)`，调用点会直接写 `null`。
开头的 `owner` 随资源归属层移除，所以规范签名从 `getValue` 开始。

```ts
this.GetValue = getValue;
this.GetCount = getCount;
this.Parent = Parent ?? null;
```

## method At:(index:int)=>Source

取下标对应的**位置**。

原 C# 是索引器 `public Source<ValueType> this[int index] => new(this, index);`。每次访问都新建一个 `Source`，调用点不要依赖对象身份。

```ts
return new Source(this, index);
```

## method GetRangeString:(range:SourceRange)=>string

范围的可读字符串。

原 C# 是 `virtual`，基类实现直接返回 `range.ToString()`，由 `TextDocument` 覆盖成带 `^` 指示的多行文本。

```ts
return range.ToString();
```

## method GetRangeLines:(range:SourceRange)=>string

范围所在的行。

原 C# 是 `virtual`，基类实现直接返回 `range.ToString()`，由 `TextDocument` 覆盖。

```ts
return range.ToString();
```

## method GetLine:(index:int)=>int

下标所在的行号。

原 C# 是 `virtual` 并抛 `NotImplementedException`，由 `TextDocument` 覆盖。

```ts
throw new Error("NotImplementedException");
```

## method GetLineOffset:(index:int)=>int

下标在其所在行内的偏移。

原 C# 是 `virtual` 并抛 `NotImplementedException`，由 `TextDocument` 覆盖。

```ts
throw new Error("NotImplementedException");
```

## method GetLineInfo:(index:int)=>Array<int>

下标所在行的 `[行号, 行内偏移]`。

原 C# 是 `virtual`，返回元组 `(int line, int lineOffset)`，按 M25 映射成 `Array<int>`；并抛 `NotImplementedException`，由 `TextDocument` 覆盖。

```ts
throw new Error("NotImplementedException");
```

## method GetRaw:(start:int, end:int)=>string

文档上 `[start, end]` 的原始文本。

原 C# 是 `virtual` 并抛 `NotImplementedException`，由 `TextDocument` 覆盖。

```ts
throw new Error("NotImplementedException");
```

## method GetScriptPath:()=>string

文档对应的脚本路径；基类不实现。

原 C# 是 `virtual` 并抛 `NotImplementedException`，由 `TextDocument` 覆盖。

```ts
throw new Error("NotImplementedException");
```
