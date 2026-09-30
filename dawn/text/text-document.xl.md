# dependencies
```xl
import { Document } from "../../core/syntax/document.xl.md"
import { SourceRange } from "../../core/syntax/source-range.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

这一层是 `Core/Syntax` 的唯一实现——`Core/Syntax` 只抽象「按下标取值」，具体值从哪来由这里决定。

# class TextDocument extends Document

文本文档：值来自一个字符串。

构造时把 `index => content[index]` 与 `() => content.length` 两个取值器传给基类；规范里单元值类型写作 `string`。

除了基类要求的「取值 / 取长度」，它还把整段文本按行切开缓存起来，供 `GetLine` / `GetLineInfo` / `GetRangeLines` 使用。`GetRangeLines` 就是异常信息里那段带 `^` 下划线的文本的来源。

## field Content:string

整段文本。

## field FilePath:string = ""

脚本路径。为空时错误信息里不追加 `at file:` 那一行。

## field LineStartOffsets:Array<int> = []

每一行起始下标。

## constructor:(content:string)=>void

以文本创建，并把两个取值器交给基类。

```ts
super((index: number) => content[index], () => content.length, null);
this.Content = content;
this.ProcessLineStartOffsets();
```

## private method ProcessLineStartOffsets:()=>void

算出每行起始下标：从 `0` 开始，每遇到一个 `\n` 就把它的下一个下标记下来——**最后一个字符是 `\n` 时不记**（`i + 1 < Content.Length` 那道判断）。

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

整篇源码文本。

```ts
return this.Content;
```

## method GetScriptPath:()=>string

脚本自身的路径。

```ts
return this.FilePath;
```

## method GetRangeString:(range:SourceRange)=>string

把范围所在的那一行连同下一行 `^` 下划线一起输出。

处理方式：先把整段文本按 `\n` 切行（`\r` 直接丢掉），再找到起点所在行，输出该行、换行、一串与行等长的 `^`（落在 `[startIndex, endIndex]` 内的位置是 `^`，其余是空格），最后在有 `FilePath` 时追加 `at file: <路径>:<行号>`。

注意 `\r` 被丢弃但**不计入行内容**，所以列位置与原始文本可能差一个。

```ts
if (range.Start === null) {
  throw new Error("SourceRange.Start is null");
}
const startIndex = range.Start.Index;
const endIndex = range.End === null ? startIndex : range.End.Index;
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
      if (j >= startIndex && j <= endIndex) {
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

同上，但每一行都加上 `line <行号>: ` 前缀。

`GetRangeLines` 与 `GetRangeString` 是两份几乎一样的代码，差别只在行前缀；这里保持同样的结构。

```ts
if (range.Start === null) {
  throw new Error("SourceRange.Start is null");
}
const startIndex = range.Start.Index;
const endIndex = range.End === null ? startIndex : range.End.Index;
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
      if (j >= startIndex && j <= endIndex) {
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

## method GetRaw:(start:int, end:int)=>string

取 `[start, end]` 上的原文——注意是**闭区间**。

```ts
return this.Content.substring(start, end + 1);
```

## method GetLine:(index:int)=>int

下标所在行号。

用 `LineStartOffsets` 线性扫描：找到第一个「比 `index` 大」的行起点，返回它前一行；都没找到就是最后一行。注意下标为 `0` 时会返回 `-1`（`i - 1` 且 `i == 0`）。

```ts
if (index < 0 || index >= this.Content.length) {
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

下标在其所在行内的偏移。

```ts
if (index < 0 || index >= this.Content.length) {
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

下标所在行的 `[行号, 行内偏移]`。

行号与行内偏移合成一个两元组，类型是 `Array<int>`。

```ts
if (index < 0 || index >= this.Content.length) {
  throw new Error("ArgumentOutOfRangeException: Index is out of range.");
}
for (let i = 0; i < this.LineStartOffsets.length; i++) {
  if (index < this.LineStartOffsets[i]) {
    return [i - 1, index - this.LineStartOffsets[i - 1]];
  }
}
return [this.LineStartOffsets.length - 1, index - this.LineStartOffsets[this.LineStartOffsets.length - 1]];
```
