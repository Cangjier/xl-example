# dependencies
```xl
import { Document } from "./document.xl.md"
import { SourceRange } from "./source-range.xl.md"
```

# namespace cangjie

来源：文档里的**一个位置**。执行器按位置而不是按字符推进，所以每一步都要带上 `Source`。

# class Source<ValueType>

文档中的一个位置。

原 C# 侧是 `struct Source<ValueType>`（值类型，赋值即复制），并重载了 `==` / `!=`。按 M16 声明成 `# class` 并提供 `Clone`；按 M19 把两个运算符换成静态方法 `Same`。

## field Document:Document<ValueType>

该位置所属的文档。

## field Index:int = 0

该位置在文档里的下标。原 C# 侧是公开可变字段。

## property Parent:SourceRange<ValueType> | null

文档的父范围，直接透传 `Document.Parent`。

### get

```ts
return this.Document.Parent;
```

## property Value:ValueType

该位置上的值。

### get

```ts
return this.Document.GetValue(this.Index);
```

## constructor:(document:Document<ValueType>, index:int)=>void

以文档与下标创建。

```ts
this.Document = document;
this.Index = index;
```

## method Pre:(skipChars?:Array<ValueType>)=>Source<ValueType> | null

前一个位置。

原 C# 签名是 `Source<ValueType>? Pre(params ValueType[] skipChars)`。`skipChars` 省略或为空时返回下标减一的位置（越界返回 `null`）；给了 `skipChars` 时不断向前跳过这些字符，直到遇到不在其中的字符（一路跳到底则返回 `null`）。

```ts
const skip = skipChars ?? [];
if (skip.length === 0) {
  if (this.Index - 1 < 0 || this.Index - 1 >= this.Document.GetCount()) {
    return null;
  }
  return this.Document.At(this.Index - 1);
}
let last: Source<ValueType> | null = this.Pre();
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

原 C# 是 `Equals(object? obj)` 重写，另有 `==` / `!=` 运算符。

```ts
return other instanceof Source && other.Document === this.Document && other.Index === this.Index;
```

## static method Same:(left:Source<any> | null, right:Source<any> | null)=>bool

`==` 运算符的替代：两边都为 `null` 视为相等。

ts 的静态成员不能引用类的类型参数，所以这里的类型写成 `Source<any>`。

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

原 C# 是 `HashCode.Combine(Document.GetHashCode(), Index.GetHashCode())`。ts 没有值哈希，这里退化成下标；本方法只用于诊断，不参与相等判定（相等一律走 `Equals` / `Same`）。

```ts
return this.Index;
```

## method Clone:()=>Source<ValueType>

值语义复制的显式入口。

原 C# 侧 `Source` 是 struct，赋值、作参数、存进字段时都会隐式复制；ts 里这些位置必须显式调用 `Clone()`。

```ts
return new Source<ValueType>(this.Document, this.Index);
```
