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

## field Value:string = ""

**该位置上的值**（第 1211 轮，用户口径 1.2「提升 parse 效率」）：这一格原来是 `## property` +
`### get`（每读一次就 `this.Document.GetValue(this.Index)` 回文档问一次），而**同一个位置会被问很多遍**
——处理一个字符时，那个字符的 `Source` 会依次交给通用队列里每一条分支，每条分支的 `Condition`
第一件事就是读 `source.Value`。实测一份 `typescript.d.ts` 上：
`Document.GetValue` 被调 **9643035** 次，而新建的 `Source` 只有 **1176959** 个
（`tmp/r1211-count3.mjs`；`tmp/r1211-gvstack2.mjs` 按栈采样，前十六名全是各页 `Condition` 里那一句）——
**同一个字符平均被回文档读了 8 遍**。

**为什么可以在这里算一次**：`Source` 是「文档里的一个位置」，而位置由 `Document` 与 `Index` 定死
（两个字段都只在构造时赋值），文档本身也是不可变的（`Document.GetValue` 是纯取值、没有副作用）
——所以「这一格的值」在构造那一刻就已经是最终答案。**读法与语义一个字没改**：构造签名还是
`(document, index)`，读法还是 `source.Value`；`Document.At()` 仍旧**每次新建一个 `Source`**
（调用点仍旧不要依赖对象身份），`Pre()` / `Clone()` 也照旧。

## constructor:(document:Document, index:int)=>void

以文档与下标创建。

```ts
this.Document = document;
this.Index = index;
this.Value = document.GetValue(index);
```

## method Pre:(skipChars?:Array<string>)=>Source | null

前一个位置。

`skipChars` 省略或为空时返回下标减一的位置（越界返回 `null`）；给了 `skipChars` 时不断向前跳过这些字符，直到遇到不在其中的字符（一路跳到底则返回 `null`）。

```ts
// **不跳任何字符时不再造一个空数组**（第 1208 轮，用户口径 1.2「提升 parse 效率」）：
// 原来写的是 `const skip = skipChars ?? []`，而**无参调用占绝大多数**——
// 实测 `typescript.d.ts` 一份上 `Pre` 被调 **2796688** 次，其中无参 **2361649** 次
//（`tmp/r1208-pre.mjs`）⇒ 每一份文件**白造 236 万个空数组**。
// 判据一个字没改：省略与空数组走的是同一条路，`skipChars` 非空那一支才用它自己。
//
// **那一趟边界检查里的 `Document.GetCount()` 不动**（第 1236 轮量过，用户口径 1.2
// 「提升 parse 效率」）：它是个闭包（`() => content.length`），无参那一支**每次都要调一次**
// （同 2796688 次里 236 万次），看上去是最顺理成章的一笔——把长度在 `Document` 构造时
// 算一次（`this.Count`），`Pre` 读它。**量出来是更慢**：
//
//     tmp/abparse.mjs（parse，同进程交替）  旧版 = tmp/r1236-old/ts
//       20 对 × 每批 2 轮   mean **+25.13ms/轮**（sd 75.34、se 16.85）8:12
//
// ⇒ 那一趟闭包调用**没在账上**（V8 在这个调用点上把它内联掉了），换成一次属性读反而多一层。
// 按本仓口径「一次没量出来的改动不留」，**这一笔整笔撤掉**，只留读数。
if (skipChars === undefined || skipChars.length === 0) {
  if (this.Index - 1 < 0 || this.Index - 1 >= this.Document.GetCount()) {
    return null;
  }
  return this.Document.At(this.Index - 1);
}
let last: Source | null = this.Pre();
while (last !== null) {
  if (skipChars.includes(last.Value)) {
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
