# dependencies
```xl
import { IOwner } from "../../owners/i-owner.xl.md"
import { IReleasable } from "../../owners/i-releasable.xl.md"
import { Source } from "./source.xl.md"
import { SourceRange } from "./source-range.xl.md"
```

# namespace cangjie

文档：按「下标 → 值」抽象出来的字符来源。语法层不关心底层是字符串、文件还是别的什么，只通过 `Document` 取长度、取值、取行号。`Dawn/Text` 里的 `TextDocument` 是它唯一的实现。

# type ValueGetter = (index:number)=>any

「按下标取值」的委托。

原 C# 侧是 `Func<int, ValueType>`。按 M22，参数表里不直接写函数类型，改用这个别名；别名不支持泛型参数，所以泛型实参退化成 `any`（`ValueType` 的具体类型由使用处保证）。按 M26，右侧直接写 ts 语法。

# type CountGetter = ()=>number

「取长度」的委托。

原 C# 侧是 `Func<int>`。

# class Document<ValueType = any> implements IReleasable

文档。

类型参数带默认值 `any`，因为 `# class` 的 `extends` 只接受裸名字（M29）：`Dawn/Text` 的 `TextDocument` 要写 `extends Document`，靠这个默认值在 ts 侧实例化成 `Document<any>`。

原 C# 侧还有 `this[int index]` 索引器，按 M19 映射成 `At(index)` 方法。

## field Owner:IOwner

文档所属的负责人，构造时登记进去。

## field GetValue:ValueGetter

按下标取值。

原 C# 侧是 `Func<int, ValueType> GetValue { get; private set; }`。

## field GetCount:CountGetter

取值的总个数。

原 C# 侧是 `Func<int> GetCount { get; private set; }`。

## field Parent:SourceRange<ValueType> | null = null

父范围；文档可以嵌在另一个文档的范围里，顶层文档为 `null`。

## constructor:(owner:IOwner, getValue:ValueGetter, getCount:CountGetter, Parent?:SourceRange<ValueType> | null)=>void

以取值器、长度器与父范围创建，并把自身登记到 `owner`。

参数允许显式传 `null`——原 C# 签名是 `Document(IOwner owner, Func<int, ValueType> getValue, Func<int> getCount, SourceRange<ValueType>? Parent = null)`，调用点会直接写 `null`。

```ts
this.GetValue = getValue;
this.GetCount = getCount;
this.Parent = Parent ?? null;
this.Owner = owner;
owner.Add([this]);
```

## method At:(index:int)=>Source<ValueType>

取下标对应的**位置**。

原 C# 是索引器 `public Source<ValueType> this[int index] => new(this, index);`。每次访问都新建一个 `Source`，调用点不要依赖对象身份。

```ts
return new Source<ValueType>(this, index);
```

## method GetRangeString:(range:SourceRange<ValueType>)=>string

范围的可读字符串。

原 C# 是 `virtual`，基类实现直接返回 `range.ToString()`，由 `TextDocument` 覆盖成带 `^` 指示的多行文本。

```ts
return range.ToString();
```

## method GetRangeLines:(range:SourceRange<ValueType>)=>string

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

## method Release:()=>void

释放文档。

原 C# 侧在这里把 `GetValue` / `GetCount` / `Parent` / `Owner` 逐个置 `null`。按 M23，置空交 GC 的部分不写，只断开那个可为空的引用。

```ts
this.Parent = null;
```
