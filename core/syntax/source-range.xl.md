# dependencies
```xl
import { Document } from "./document.xl.md"
import { Source } from "./source.xl.md"
import { SourceException } from "../exceptions/source-exception.xl.md"
```

# namespace cangjie

来源的**范围**：一段起止位置。语法树里每个 token 都靠它记录自己覆盖了源码的哪一段，`Undo` / `IsInRange` 这类回退逻辑全靠它判断。

# class SourceRange<ValueType>

一段来源范围。

原 C# 侧是 `struct SourceRange<ValueType> : IEquatable<SourceRange<ValueType>>`（值类型，赋值即复制），并重载了 `==` / `!=`。按 M16 声明成 `# class` 并提供 `Clone`；按 M19 运算符换成静态方法 `Same` / `Different`；`IEquatable<>` 是 BCL 接口，按 M20 不进 `implements`，改由 `Equals` 方法承载。

`Start` / `End` 是允许为 `null` 的 `Source`。`Source` 事实不可变（`Index` 只在构造时赋值），所以这里直接持有引用、不做深拷贝；只有整体赋值一个 `SourceRange` 时才需要 `Clone()`。

## field Start:Source<ValueType> | null = null

起点；`null` 表示尚未签入。

## field End:Source<ValueType> | null = null

终点；`null` 表示尚未签出。

## constructor:(start?:Source<ValueType> | null, end?:Source<ValueType> | null)=>void

以起点与终点创建；都不传即 C# 的 `new SourceRange()`（两个字段都是 `null`）。

参数类型允许 `null`，因为 C# 里 `SourceRange(Source start, Source end)` 的实参可能是可空的 `Source`——`UnitToken` 在异常处理里就把 `source.Pre()` 的结果直接传进来。

原 C# 有两个构造器，按 M14(b) 只保留这一个，另一个转成 `FromRanges`。

```ts
this.Start = start ?? null;
this.End = end ?? null;
```

## static method FromRanges:(start:SourceRange<any>, end:SourceRange<any>)=>SourceRange<any>

原 C# 构造器 `SourceRange(SourceRange<ValueType> start, SourceRange<ValueType> end)` 的替代：取 `start` 的起点与 `end` 的终点。

按 M27，泛型类的静态成员不能引用类的类型参数，所以参数与返回类型都写 `SourceRange<any>`。

```ts
const result = new SourceRange<any>();
result.Start = start.Start;
result.End = end.End;
return result;
```

## property StartIndex:int

起点的下标。

### get

原 C# 是 `readonly int StartIndex => Start!.Value.Index;`——起点为 `null` 时抛空引用。

```ts
return this.Start!.Index;
```

## property EndIndex:int

终点的下标。

### get

原 C# 是 `readonly int EndIndex => End!.Value.Index;`——终点为 `null` 时抛空引用。

```ts
return this.End!.Index;
```

## property Document:Document<ValueType>

所在的文档：优先取起点，其次取终点，都没有则抛错。

### get

```ts
if (this.Start !== null) {
  return this.Start.Document;
}
if (this.End !== null) {
  return this.End.Document;
}
throw SourceException.SourceRangeContainsNull;
```

## method ToString:()=>string

原 C# 是 `public readonly override string ToString() => GetRangLines();`。

```ts
return this.GetRangLines();
```

## method GetRangeString:()=>string

范围的可读字符串；无起点时给出占位文本。

```ts
if (this.Start === null) {
  return "[unkown code scope]";
}
return this.Start.Document.GetRangeString(this);
```

## method GetRangLines:()=>string

范围所在的行（带 `^` 指示），是异常信息的正文。

```ts
if (this.Start === null) {
  return "[unkown code scope]";
}
return this.Start.Document.GetRangeLines(this);
```

## method GetRaw:()=>string

范围内的原始文本。

原 C# 有两个重载 `GetRaw()` 与 `GetRaw(int start, int end)`，按 M14(b) 保留无参的那个用原名，另一个改名 `GetRawRange`。

```ts
if (this.Start === null || this.End === null) {
  throw SourceException.SourceRangeContainsNull;
}
return this.Start.Document.GetRaw(this.Start.Index, this.End.Index);
```

## method GetRawRange:(start:int, end:int)=>string

文档上 `[start, end]` 的原始文本。起止仍必须已签入。

```ts
if (this.Start === null || this.End === null) {
  throw SourceException.SourceRangeContainsNull;
}
return this.Start.Document.GetRaw(start, end);
```

## method GetLineRange:()=>Array<int>

起止所在行，返回两个元素：`[起点行, 终点行]`。

原 C# 返回元组 `(int startLine, int endLine)`。xl 没有元组类型写法，按 M25 一律映射成 `Array<int>`，ts 侧用解构取值。

```ts
if (this.Start === null || this.End === null) {
  throw SourceException.SourceRangeContainsNull;
}
return [
  this.Start.Document.GetLine(this.Start.Index),
  this.End.Document.GetLine(this.End.Index),
];
```

## method GetStartLine:()=>int

起点所在行。

```ts
if (this.Start === null) {
  throw SourceException.SourceRangeStartIsNull;
}
return this.Start.Document.GetLine(this.Start.Index);
```

## method GetEndLine:()=>int

终点所在行。

```ts
if (this.End === null) {
  throw SourceException.SourceRangeEndIsNull;
}
return this.End.Document.GetLine(this.End.Index);
```

## method GetStartLineInfo:()=>Array<int>

起点所在行的 `[行号, 行内偏移]`。

原 C# 返回元组 `(int line, int lineOffset)`，按 M25 映射成 `Array<int>`。

```ts
if (this.Start === null) {
  throw SourceException.SourceRangeStartIsNull;
}
return this.Start.Document.GetLineInfo(this.Start.Index);
```

## method GetEndLineInfo:()=>Array<int>

终点所在行的 `[行号, 行内偏移]`。

原 C# 返回元组 `(int line, int lineOffset)`，按 M25 映射成 `Array<int>`。

```ts
if (this.End === null) {
  throw SourceException.SourceRangeEndIsNull;
}
return this.End.Document.GetLineInfo(this.End.Index);
```

## method IsInRange:(source:Source<ValueType>)=>bool

某个位置是否落在本范围内。

原 C# 有一条特殊分支：只有起点、没有终点时，判定退化成「不小于起点」。

```ts
if (this.Start === null) {
  throw SourceException.SourceRangeStartIsNull;
}
if (this.End === null) {
  return source.Index >= this.Start.Index;
}
return source.Index >= this.Start.Index && source.Index <= this.End.Index;
```

## method Equals:(other:any)=>bool

与原 C# 的两个重载 `Equals(SourceRange<ValueType>)` 与 `Equals(object?)` 合并：起点、终点分别按「同文档同下标」相等，且起点所在的文档对象相同。

```ts
if (!(other instanceof SourceRange)) {
  return false;
}
return Source.Same(this.Start, other.Start)
  && Source.Same(this.End, other.End)
  && this.Start?.Document === other.Start?.Document;
```

## static method Same:(left:SourceRange<any> | null, right:SourceRange<any> | null)=>bool

`==` 运算符的替代：两边都为 `null` 视为相等。

```ts
if (left === null || left === undefined) {
  return right === null || right === undefined;
}
if (right === null || right === undefined) {
  return false;
}
return left.Equals(right);
```

## static method Different:(left:SourceRange<any> | null, right:SourceRange<any> | null)=>bool

`!=` 运算符的替代。

```ts
return !SourceRange.Same(left, right);
```

## method GetHashCode:()=>int

哈希码。

原 C# 是 `HashCode.Combine(Start, End, Start?.Document)`。ts 没有值哈希，这里退化成起点下标；本方法只用于诊断，相等判定一律走 `Equals` / `Same`。

```ts
return this.Start === null ? 0 : this.Start.Index;
```

## method Clone:()=>SourceRange<ValueType>

值语义复制的显式入口。

原 C# 侧 `SourceRange` 是 struct：把它整体赋给另一个字段、放进列表、当参数传出去，都会隐式复制一份。ts 里这些位置必须显式 `Clone()`。

`Source` 不可变，所以这里浅拷贝两个引用就够了。

```ts
const copy = new SourceRange<ValueType>();
copy.Start = this.Start;
copy.End = this.End;
return copy;
```
