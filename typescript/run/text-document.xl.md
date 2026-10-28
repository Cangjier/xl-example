# dependencies
```xl
import { Document } from "../../core/syntax/document.xl.md"
import { SourceRange } from "../../core/syntax/source-range.xl.md"
```

# namespace cangjie

# class TextDocument extends Document

## field Content:string

## field FilePath:string = ""

## field LineStartOffsets:Array<int> = []

## constructor:(content:string, filePath?:string)=>void

```ts
super((index: number) => content[index], () => content.length, null);
this.Content = content;
this.FilePath = filePath ?? "";
this.ProcessLineStartOffsets();
```

## private method ProcessLineStartOffsets:()=>void

```ts
const offsets: number[] = [0];
for (let i = 0; i < this.Content.length; i++) {
  if (this.Content[i] === "\n") {
    if (i + 1 < this.Content.length) {
      offsets.push(i + 1);
    }
  }
}
this.LineStartOffsets = offsets;
```

## method ToString:()=>string

```ts
return this.Content;
```

## method GetScriptPath:()=>string

```ts
return this.FilePath;
```

## method GetRaw:(start:int, end:int)=>string

```ts
return this.Content.substring(start, end);
```

## method GetLine:(index:int)=>int

```ts
if (index < 0 || index > this.Content.length) {
  throw new Error("ArgumentOutOfRangeException: Index is out of range.");
}
for (let i = 0; i < this.LineStartOffsets.length; i++) {
  if (index < this.LineStartOffsets[i]) {
    return i - 1;
  }
}
return this.LineStartOffsets.length - 1;
```

## method GetLineOffset:(index:int)=>int

```ts
if (index < 0 || index > this.Content.length) {
  throw new Error("ArgumentOutOfRangeException: Index is out of range.");
}
for (let i = 0; i < this.LineStartOffsets.length; i++) {
  if (index < this.LineStartOffsets[i]) {
    return index - this.LineStartOffsets[i - 1];
  }
}
return index - this.LineStartOffsets[this.LineStartOffsets.length - 1];
```

## method GetLineInfo:(index:int)=>Array<int>

```ts
if (index < 0 || index > this.Content.length) {
  throw new Error("ArgumentOutOfRangeException: Index is out of range.");
}
for (let i = 0; i < this.LineStartOffsets.length; i++) {
  if (index < this.LineStartOffsets[i]) {
    return [i - 1, index - this.LineStartOffsets[i - 1]];
  }
}
return [this.LineStartOffsets.length - 1, index - this.LineStartOffsets[this.LineStartOffsets.length - 1]];
```

## method GetRangeString:(range:SourceRange)=>string

```ts
if (range.Start < 0) {
  throw new Error("SourceRange.Start is null");
}
const startIndex = range.StartIndex;
const endIndex = range.EndIndex < 0 ? startIndex : range.EndIndex;
const lines: string[] = [];
const lineStartIndices: number[] = [0];
let lineTemp = "";
const count = this.GetCount();
for (let i = 0; i < count; i++) {
  const value = this.GetValue(i);
  if (value === "\r") {
    continue;
  }
  if (value === "\n") {
    lines.push(lineTemp);
    lineStartIndices.push(i + 1);
    lineTemp = "";
  } else {
    lineTemp += value;
  }
}
lines.push(lineTemp);
let result = "";
let sourceLineIndex = -1;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const lineStartIndex = lineStartIndices[i];
  const lineEndIndex = lineStartIndices[i] + lines[i].length;
  result += line;
  result += "\n";
  if (startIndex >= lineStartIndex && startIndex < lineEndIndex) {
    if (sourceLineIndex === -1) {
      sourceLineIndex = i;
    }
    for (let j = lineStartIndex; j < lineEndIndex; j++) {
      if (j >= startIndex && j < endIndex) {
        result += "^";
      } else {
        result += " ";
      }
    }
    result += "\n";
  }
}
if (this.FilePath !== "") {
  result += `at file: ${this.FilePath}:${sourceLineIndex + 1}`;
  result += "\n";
}
return result;
```

## method GetRangeLines:(range:SourceRange)=>string

```ts
if (range.Start < 0) {
  throw new Error("SourceRange.Start is null");
}
const startIndex = range.StartIndex;
const endIndex = range.EndIndex < 0 ? startIndex : range.EndIndex;
const lines: string[] = [];
const lineStartIndices: number[] = [0];
let lineTemp = "";
const count = this.GetCount();
for (let i = 0; i < count; i++) {
  const value = this.GetValue(i);
  if (value === "\r") {
    continue;
  }
  if (value === "\n") {
    lines.push(lineTemp);
    lineStartIndices.push(i + 1);
    lineTemp = "";
  } else {
    lineTemp += value;
  }
}
lines.push(lineTemp);
let result = "";
let sourceLineIndex = -1;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const lineStartIndex = lineStartIndices[i];
  const lineEndIndex = lineStartIndices[i] + lines[i].length;
  if (startIndex >= lineStartIndex && startIndex < lineEndIndex) {
    if (sourceLineIndex === -1) {
      sourceLineIndex = i;
    }
    result += `line ${i + 1}: `;
    result += line;
    result += "\n";
    result += `line ${i + 1}: `;
    for (let j = lineStartIndex; j < lineEndIndex; j++) {
      if (j >= startIndex && j < endIndex) {
        result += "^";
      } else {
        result += " ";
      }
    }
    result += "\n";
  }
}
if (this.FilePath !== "") {
  result += `at file: ${this.FilePath}:${sourceLineIndex + 1}`;
  result += "\n";
}
return result;
```
