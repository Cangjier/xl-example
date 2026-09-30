# dependencies
```xl
import { Document } from "./document.xl.md"
import { Source } from "./source.xl.md"
import { SourceException } from "../exceptions/source-exception.xl.md"
```

# namespace cangjie

来源的**范围**：一段起止位置。语法树里每个 token 都靠它记录自己覆盖了源码的哪一段，`Undo` / `IsInRange` 这类回退逻辑全靠它判断。

# class SourceRange

一段来源范围。

它按值语义使用：声明成类并提供 `Clone`；相等与不等判断走静态方法 `Same` / `Different`，比较本身由 `Equals` 方法承载。

`Start` / `End` 是允许为 `null` 的 `Source`。`Source` 事实不可变（`Index` 只在构造时赋值），所以这里直接持有引用、不做深拷贝；只有整体赋值一个 `SourceRange` 时才需要 `Clone()`。

## field Start:Source | null = null

起点；`null` 表示尚未签入。

## field End:Source | null = null

终点；`null` 表示尚未签出。

## constructor:(start?:Source | null, end?:Source | null)=>void

以起点与终点创建；都不传则两个字段都是 `null`。

参数类型允许 `null`：`UnitToken` 在异常处理里就把 `source.Pre()` 的结果直接传进来。

只有这一个构造器；从两个范围构造的入口见 `FromRanges`。

```ts
this.Start = start ?? null;
this.End = end ?? null;
```

## static method FromRanges:(start:SourceRange, end:SourceRange)=>SourceRange

从两个范围构造：取 `start` 的起点与 `end` 的终点。

```ts
const result = new SourceRange();
result.Start = start.Start;
result.End = end.End;
return result;
```

## property StartIndex:int

起点的下标。

### get

起点为 `null` 时抛空引用。

```ts
return this.Start!.Index;
```

## property EndIndex:int

终点的下标。

### get

终点为 `null` 时抛空引用。

```ts
return this.End!.Index;
```

## property Document:Document

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

本范围覆盖的那几行源码。`ToString` 直接给 `GetRangLines()`——异常诊断里拼的就是它。

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

无参的那个用原名 `GetRaw`，带范围参数的那个叫 `GetRawRange`。

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

xl 没有元组类型写法，一律用 `Array<int>`，ts 侧用解构取值。

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

用 `Array<int>` 表示两个元素。

```ts
if (this.Start === null) {
  throw SourceException.SourceRangeStartIsNull;
}
return this.Start.Document.GetLineInfo(this.Start.Index);
```

## method GetEndLineInfo:()=>Array<int>

终点所在行的 `[行号, 行内偏移]`。

用 `Array<int>` 表示两个元素。

```ts
if (this.End === null) {
  throw SourceException.SourceRangeEndIsNull;
}
return this.End.Document.GetLineInfo(this.End.Index);
```

## method IsInRange:(source:Source)=>bool

某个位置是否落在本范围内。

只有起点、没有终点时，判定退化成「不小于起点」。

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

起点、终点分别按「同文档同下标」相等，且起点所在的文档对象相同。

```ts
if (!(other instanceof SourceRange)) {
  return false;
}
return Source.Same(this.Start, other.Start)
  && Source.Same(this.End, other.End)
  && this.Start?.Document === other.Start?.Document;
```

## static method Same:(left:SourceRange | null, right:SourceRange | null)=>bool

判等：两边都为 `null` 视为相等。

```ts
if (left === null || left === undefined) {
  return right === null || right === undefined;
}
if (right === null || right === undefined) {
  return false;
}
return left.Equals(right);
```

## static method Different:(left:SourceRange | null, right:SourceRange | null)=>bool

判不等：取 `Same` 的反面。

```ts
return !SourceRange.Same(left, right);
```

## method GetHashCode:()=>int

哈希码。

ts 没有值哈希，这里退化成起点下标；本方法只用于诊断，相等判定一律走 `Equals` / `Same`。

```ts
return this.Start === null ? 0 : this.Start.Index;
```

## method Clone:()=>SourceRange

值语义复制的显式入口。

`SourceRange` 按值语义使用：把它整体赋给另一个字段、放进列表、当参数传出去时，都要显式 `Clone()`。

`Source` 不可变，所以这里浅拷贝两个引用就够了。

```ts
const copy = new SourceRange();
copy.Start = this.Start;
copy.End = this.End;
return copy;
```
