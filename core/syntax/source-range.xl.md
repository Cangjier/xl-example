# dependencies
```xl
import { Document } from "./document.xl.md"
import { SourceException } from "../exceptions/source-exception.xl.md"
```

# namespace cangjie

# class SourceRange

## static field CurrentDocument:Document | null = null

## field Document:Document | null = null

## field Start:int = -1

## field End:int = -1

## constructor:(document?:Document | null, start?:int, end?:int)=>void

```ts
this.Document = document ?? null;
this.Start = start ?? -1;
this.End = end ?? -1;
```

## static method Of:(document:Document, start:int, end:int)=>SourceRange

```ts
return new SourceRange(document, start, end);
```

## static method Whole:(document:Document)=>SourceRange

```ts
if (document.WholeRange === null) {
  document.WholeRange = new SourceRange(document, 0, document.GetCount());
}
return document.WholeRange;
```

## method At:(index:int)=>string

```ts
if (!this.Has(index)) {
  throw SourceException.SourceRangeIndexOutOfRange;
}
return this.Document!.GetValue(index);
```

## method ValueAt:(index:int)=>string

```ts
return this.Document!.GetValue(index);
```

## method Has:(index:int)=>bool

```ts
return this.Start >= 0 && index >= this.Start && index < this.End;
```

## method Length:()=>int

```ts
return Math.max(0, this.End - this.Start);
```

## method IsEmpty:()=>bool

```ts
return this.End <= this.Start;
```

## method IsInRange:(index:int)=>bool

```ts
return this.Start >= 0 && index >= this.Start && index < this.End;
```

## method IsEof:()=>bool

```ts
return this.Document !== null && this.Start === this.End && this.Start >= this.Document.GetCount();
```

## property StartIndex:int

### get

```ts
return this.Start;
```

## property EndIndex:int

### get

```ts
return this.End;
```

## method Clone:()=>SourceRange

```ts
return new SourceRange(this.Document, this.Start, this.End);
```

## method Equals:(other:any)=>bool

```ts
if (!(other instanceof SourceRange)) {
  return false;
}
return this.Document === other.Document && this.Start === other.Start && this.End === other.End;
```

## static method Same:(left:SourceRange | null, right:SourceRange | null)=>bool

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

```ts
return !SourceRange.Same(left, right);
```

## method GetHashCode:()=>int

```ts
return this.Start < 0 ? 0 : this.Start;
```

## method ToString:()=>string

```ts
return this.GetRangLines();
```

## method GetRangeString:()=>string

```ts
if (this.Document === null || this.Start < 0) {
  return "[unkown code scope]";
}
return this.Document.GetRangeString(this);
```

## method GetRangLines:()=>string

```ts
if (this.Document === null || this.Start < 0) {
  return "[unkown code scope]";
}
return this.Document.GetRangeLines(this);
```

## method GetRaw:()=>string

```ts
if (this.Document === null || this.Start < 0 || this.End < 0) {
  throw SourceException.SourceRangeContainsNull;
}
return this.Document.GetRaw(this.Start, this.End);
```

## method GetRawRange:(start:int, end:int)=>string

```ts
if (this.Document === null || this.Start < 0 || this.End < 0) {
  throw SourceException.SourceRangeContainsNull;
}
return this.Document.GetRaw(start, end);
```

## method GetLineRange:()=>Array<int>

```ts
if (this.Document === null || this.Start < 0 || this.End < 0) {
  throw SourceException.SourceRangeContainsNull;
}
return [this.GetStartLine(), this.GetEndLine()];
```

## method GetStartLine:()=>int

```ts
if (this.Document === null || this.Start < 0) {
  throw SourceException.SourceRangeStartIsNull;
}
const index = this.Start;
const count = this.Document.GetCount();
return this.Document.GetLine(index < count ? index : count > 0 ? count - 1 : 0);
```

## method GetEndLine:()=>int

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

```ts
if (this.Document === null || this.Start < 0) {
  throw SourceException.SourceRangeStartIsNull;
}
const count = this.Document.GetCount();
const index = this.Start < count ? this.Start : count > 0 ? count - 1 : 0;
return this.Document.GetLineInfo(index);
```

## method GetEndLineInfo:()=>Array<int>

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

```ts
const document = start.Document !== null ? start.Document : end.Document;
return new SourceRange(document, start.Start, end.End);
```
