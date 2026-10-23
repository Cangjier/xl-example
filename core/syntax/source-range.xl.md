# dependencies
```xl
import { Document } from "./document.xl.md"
import { SourceException } from "../exceptions/source-exception.xl.md"
```

# namespace cangjie

来源的**范围**：一段半开区间 `[Start, End)`。语法树里每个 token 都靠它记录自己覆盖了源码的哪一段，`Undo` / `IsInRange` 这类回退逻辑全靠它判断。

范围不再持有 `Source`（那个类已删除），只持有文档与两个整数下标：`Start` 是第一个字符，`End` 是最后一个字符的下标 **+1**（与 TS 的 `pos` / `end` 口径一致）。`-1` 表示未设置。

# class SourceRange

一段来源范围。

它按值语义使用：声明成类并提供 `Clone`；相等与不等判断走静态方法 `Same` / `Different`，比较本身由 `Equals` 方法承载。

`At` 是「取某个下标上的字符」的**零分配**入口：直接问文档要值，不建任何对象。token 层只通过它（或 `buffer.At`）读字符。

## field Document:Document | null = null

这段范围所属的文档；`null` 表示还没关联。

## field Start:int = -1

起点（第一个字符的下标）；`-1` 表示尚未签入。

## field End:int = -1

开区间终点（最后一个字符的下标 +1）；`-1` 表示尚未签出。

## constructor:(document?:Document | null, start?:int, end?:int)=>void

以文档、起点、终点创建；都不传则文档为 `null`、两端都是 `-1`。

参数允许显式传 `null`：调用点会把「可能没有文档」的结果直接写进来。

```ts
this.Document = document ?? null;
this.Start = start ?? -1;
this.End = end ?? -1;
```

## static method Of:(document:Document, start:int, end:int)=>SourceRange

以文档与半开区间创建。

```ts
return new SourceRange(document, start, end);
```

## static method Whole:(document:Document)=>SourceRange

整个文档：`[0, document.GetCount())`。

```ts
return new SourceRange(document, 0, document.GetCount());
```

## method At:(index:int)=>string

下标处的字符。合法当且仅当 `Start <= index < End`；否则抛 `SourceException.SourceRangeIndexOutOfRange`。

**不得分配对象**：校验完直接问文档要值。

```ts
if (!this.Has(index)) {
  throw SourceException.SourceRangeIndexOutOfRange;
}
return this.Document!.GetValue(index);
```

## method Has:(index:int)=>bool

下标是否落在本范围内（`Start <= index < End`）。与 `At` 的判据相同，但**不抛**。

```ts
return this.Start >= 0 && index >= this.Start && index < this.End;
```

## method Length:()=>int

范围长度：`max(0, End - Start)`。

```ts
return Math.max(0, this.End - this.Start);
```

## method IsEmpty:()=>bool

范围是否为空：`End <= Start`。

```ts
return this.End <= this.Start;
```

## method IsInRange:(index:int)=>bool

下标是否落在本范围内（半开）。

```ts
return this.Start >= 0 && index >= this.Start && index < this.End;
```

## method IsEof:()=>bool

本范围是不是文件末尾的空区间：有文档、`Start === End`，且起点已经到（或超过）文档长度。

```ts
return this.Document !== null && this.Start === this.End && this.Start >= this.Document.GetCount();
```

## property StartIndex:int

起点的下标（未设置时就是 `-1`，不再抛空引用）。

### get

```ts
return this.Start;
```

## property EndIndex:int

开区间终点的下标（未设置时就是 `-1`）。

### get

```ts
return this.End;
```

## method Clone:()=>SourceRange

复制一份等值的范围。

```ts
return new SourceRange(this.Document, this.Start, this.End);
```

## method Equals:(other:any)=>bool

同文档对象、同起点、同终点。

`Document` 按**引用**比较：两个范围只有在同一个文档对象上才算相等。

```ts
if (!(other instanceof SourceRange)) {
  return false;
}
return this.Document === other.Document && this.Start === other.Start && this.End === other.End;
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
return this.Start < 0 ? 0 : this.Start;
```

## method ToString:()=>string

本范围覆盖的那几行源码。`ToString` 直接给 `GetRangLines()`——异常诊断里拼的就是它。

```ts
return this.GetRangLines();
```

## method GetRangeString:()=>string

范围的可读字符串；文档或起点未设置时给出占位文本。

```ts
if (this.Document === null || this.Start < 0) {
  return "[unkown code scope]";
}
return this.Document.GetRangeString(this);
```

## method GetRangLines:()=>string

范围所在的行（带 `^` 指示），是异常信息的正文。

```ts
if (this.Document === null || this.Start < 0) {
  return "[unkown code scope]";
}
return this.Document.GetRangeLines(this);
```

## method GetRaw:()=>string

范围内的原始文本，半开 `[Start, End)`。

```ts
if (this.Document === null || this.Start < 0 || this.End < 0) {
  throw SourceException.SourceRangeContainsNull;
}
return this.Document.GetRaw(this.Start, this.End);
```

## method GetRawRange:(start:int, end:int)=>string

文档上 `[start, end)` 的原始文本。起止仍必须已签入。

```ts
if (this.Document === null || this.Start < 0 || this.End < 0) {
  throw SourceException.SourceRangeContainsNull;
}
return this.Document.GetRaw(start, end);
```

## method GetLineRange:()=>Array<int>

起止所在行，返回两个元素：`[起点行, 终点行]`。

半开口径下「终点所在行」是**最后一个字符**（`End - 1`）所在的行；空范围与起点同一行。

xl 没有元组类型写法，一律用 `Array<int>`，ts 侧用解构取值。

```ts
if (this.Document === null || this.Start < 0 || this.End < 0) {
  throw SourceException.SourceRangeContainsNull;
}
return [this.GetStartLine(), this.GetEndLine()];
```

## method GetStartLine:()=>int

起点所在行。

```ts
if (this.Document === null || this.Start < 0) {
  throw SourceException.SourceRangeStartIsNull;
}
const index = this.Start;
const count = this.Document.GetCount();
return this.Document.GetLine(index < count ? index : count > 0 ? count - 1 : 0);
```

## method GetEndLine:()=>int

终点所在行：半开口径取最后一个字符 `End - 1`；空范围退回起点。

```ts
if (this.Document === null || this.End < 0) {
  throw SourceException.SourceRangeEndIsNull;
}
const count = this.Document.GetCount();
let index = this.End > this.Start ? this.End - 1 : this.Start;
if (index >= count) {
  index = count > 0 ? count - 1 : 0;
}
return this.Document.GetLine(index);
```

## method GetStartLineInfo:()=>Array<int>

起点所在行的 `[行号, 行内偏移]`。

用 `Array<int>` 表示两个元素。

```ts
if (this.Document === null || this.Start < 0) {
  throw SourceException.SourceRangeStartIsNull;
}
const count = this.Document.GetCount();
const index = this.Start < count ? this.Start : count > 0 ? count - 1 : 0;
return this.Document.GetLineInfo(index);
```

## method GetEndLineInfo:()=>Array<int>

终点所在行的 `[行号, 行内偏移]`：半开口径取最后一个字符 `End - 1`；空范围退回起点。

用 `Array<int>` 表示两个元素。

```ts
if (this.Document === null || this.End < 0) {
  throw SourceException.SourceRangeEndIsNull;
}
const count = this.Document.GetCount();
let index = this.End > this.Start ? this.End - 1 : this.Start;
if (index >= count) {
  index = count > 0 ? count - 1 : 0;
}
return this.Document.GetLineInfo(index);
```

## static method FromRanges:(start:SourceRange, end:SourceRange)=>SourceRange

从两个范围构造：取 `start` 的起点与 `end` 的终点，得到 `[start.Start, end.End)`。

```ts
const document = start.Document !== null ? start.Document : end.Document;
return new SourceRange(document, start.Start, end.End);
```
