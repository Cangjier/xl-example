# dependencies
```xl
import { Document } from "./document.xl.md"
import { SourceRange } from "./source-range.xl.md"
```

# namespace cangjie

来源：文档里的**一个位置**。执行器按位置而不是按字符推进，所以每一步都要带上 `Source`。

# class Source

文档中的一个位置。

它按值语义使用：声明成类并提供 `Clone`；相等判断走 `Equals` 与静态方法 `Same`。

## field Document:Document

该位置所属的文档。

## field Index:int = 0

该位置在文档里的下标。

## property Parent:SourceRange | null

文档的父范围，直接透传 `Document.Parent`。

### get

```ts
return this.Document.Parent;
```

## property Value:string

该位置上的值。

### get

```ts
return this.Document.GetValue(this.Index);
```

## constructor:(document:Document, index:int)=>void

以文档与下标创建。

```ts
this.Document = document;
this.Index = index;
```

## method Pre:(skipChars?:Array<string>)=>Source | null

前一个位置。

`skipChars` 省略或为空时返回下标减一的位置（越界返回 `null`）；给了 `skipChars` 时不断向前跳过这些字符，直到遇到不在其中的字符（一路跳到底则返回 `null`）。

```ts
const skip = skipChars ?? [];
if (skip.length === 0) {
  if (this.Index - 1 < 0 || this.Index - 1 >= this.Document.GetCount()) {
    return null;
  }
  return this.Document.At(this.Index - 1);
}
let last: Source | null = this.Pre();
while (last !== null) {
  if (skip.includes(last.Value)) {
    last = last.Pre();
  } else {
    return last;
  }
}
return null;
```

## method Equals:(other:any)=>bool

与另一个位置相等：同一个文档对象且下标相同。

```ts
return other instanceof Source && other.Document === this.Document && other.Index === this.Index;
```

## static method Same:(left:Source | null, right:Source | null)=>bool

判等入口：两边都为 `null` 视为相等。

```ts
if (left === null || left === undefined) {
  return right === null || right === undefined;
}
if (right === null || right === undefined) {
  return false;
}
return left.Equals(right);
```

## method GetHashCode:()=>int

哈希码。

ts 没有值哈希，这里退化成下标；本方法只用于诊断，不参与相等判定（相等一律走 `Equals` / `Same`）。

```ts
return this.Index;
```

## method Clone:()=>Source

值语义复制的显式入口。

`Source` 按值语义使用：赋值、作参数、存进字段时都要显式调用 `Clone()`。

```ts
return new Source(this.Document, this.Index);
```
