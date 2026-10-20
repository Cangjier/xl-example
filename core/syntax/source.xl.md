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

## field IsEOF:bool = false

是不是文件末尾的哨兵位置：下标 `-1` 就是 EOF（构造器按这一格置位），`Value` 恒为 `"\0"`，由静态方法 `EOF` 构造。

它不是文档里的真实字符位置：`Pre` 从它再往前是越界，文档的 `GetCount` / `At` 也不会给出它。

## property Parent:SourceRange | null

文档的父范围，直接透传 `Document.Parent`。

### get

```ts
return this.Document.Parent;
```

## property Value:string

该位置上的值。

EOF 哨兵没有文档字符可读，固定返回 `"\0"`。

### get

```ts
if (this.Index === -1) {
  return "\0";
}
return this.Document.GetValue(this.Index);
```

## constructor:(document:Document, index:int)=>void

以文档与下标创建。下标 `-1` 是 EOF 哨兵，`IsEOF` 按这一格置位。

```ts
this.Document = document;
this.Index = index;
this.IsEOF = index === -1;
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

## static method EOF:(document:Document)=>Source

构造文件末尾的哨兵位置：下标 `-1`，`IsEOF` 由构造器置为 `true`，`Value` 读出来是 `"\0"`。

```ts
return new Source(document, -1);
```

## method GetHashCode:()=>int

哈希码。

ts 没有值哈希，这里退化成下标；本方法只用于诊断，不参与相等判定（相等一律走 `Equals` / `Same`）。

```ts
return this.Index;
```
