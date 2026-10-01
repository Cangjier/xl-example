# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../core/syntax/reorganization.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { SkipPreviousWrapSymbol, IsTypeContainerUnit, IsEmptyContentUnit, IsOwnContentRange, IsTypeMemberStart, IsTypeOperandUnit } from "../text-common-util.xl.md"
import { Bracket } from "./bracket.xl.md"
import { ArrayLiteral } from "./json/array-literal.xl.md"
import { ParsePipeline } from "../parse-pipeline.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**方括号的三种类型构造**：`T[]` 收成 `ArrayType`、`[A, B]` 收成 `TupleType`、
`T[K]` 收成 `IndexedAccessType`。

第 66 轮之前这三种**都没有节点**：`T[]` 与 `[A, B]` 都落成一对裸 `Bracket`
（`[A, B]` 有时被 `JsonArrayReorganization` 收成值位的 `ArrayLiteral`，**同一个类型两种产物**），
`T[K]` 也一样是裸括号。内容一个都没丢，可「这是数组类型 / 元组类型 / 下标访问类型」这件事
在树里看不出来——`typescript/lib/*.d.ts` 里这种写法遍地都是。

**判据是「它被装在哪里」，不是「它长什么样」**：类型位的 `[` 与值位的 `[` 形状完全一样
（`T[]` 与 `a[i]`、`[A, B]` 与 `[1, 2]`），区别只在**容器**。所以本规则唯一的上下文判据是
父单元的类名白名单（`../text-common-util.xl.md` 的 `IsTypeContainerUnit`）——这条路是**时序无关**的。

三个节点都把**内容**搬进自己：`ArrayType` 装「被数组化的那个类型」，`TupleType` 装元组的元素，
`IndexedAccessType` 装「被下标的类型 + 下标」。那对方括号本身不进产物
（与 `ObjectLiteral` / `ArrayLiteral` 同一口径：括号是语法、标签已经把它说清楚了），
所以 `T[]` 无论前面是 `GenericType` 还是 `)`，产物都是同一个形状。

# class TypeBracketReorganization extends Reorganization

它永远不进 `Data`、不进 XML。

## static readonly field Instance:TypeBracketReorganization = new TypeBracketReorganization()

唯一的实例。

## private method IsNestedInTypeBracket:(unit:Token, startIndex:int, endIndex:int, units:Array<Token>)=>bool

`unit` 的父亲是不是已经是这三种节点之一、且这一段就是它的全部内容（递归守卫，见
`../text-common-util.xl.md` 的 `IsOwnContentRange`）。

```ts
if (unit.Parent === null) {
  return false;
}
const name = unit.Parent.constructor.name;
if (name !== "ArrayType" && name !== "TupleType" && name !== "IndexedAccessType") {
  return false;
}
return IsOwnContentRange(units, startIndex, endIndex);
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是本次重组的起点。

三条：单元是 `[` 开头的 `Bracket`、**或**已经被 `JsonArrayReorganization` 收成 `ArrayLiteral`
的类型位方括号（`[A, B]` 与 `Dirent<X>[]` 都会走这一支）；
**容器**是纯类型容器（`IsTypeContainerUnit`）；不是成员开头（`IsTypeMemberStart`）。

空方括号（`[]`）只有在左边真有一个被操作的类型时才算数组类型（`T[]`）；
否则留给别的规则（`[]` 单独出现不是类型）。

```ts
const current = Get(units, index);
if (current === null) {
  return false;
}
const isBracket = current instanceof Bracket && current.startBracket === "[";
if (isBracket === false && !(current instanceof ArrayLiteral)) {
  return false;
}
if (IsTypeContainerUnit(current.Parent) === false) {
  return false;
}
if (IsTypeMemberStart(current)) {
  return false;
}
if (IsEmptyContentUnit(current)) {
  const previous = Get(units, SkipPreviousWrapSymbol(units, index));
  return IsTypeOperandUnit(previous);
}
return true;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把 `index` 处那个方括号（连同它左边被操作的类型）包成一个 `ArrayType` / `TupleType` /
`IndexedAccessType`，**返回新的下标**。

三种形状（`Bracket` 与 `ArrayLiteral` 走同一条判定，只是被吃的单元不同）：

| 形状 | 判据 | 产物 |
| --- | --- | --- |
| `T[]` | 内容为空、左边是被操作的类型 | `ArrayType(T)` |
| `T[K]` | 内容非空、左边是被操作的类型 | `IndexedAccessType(T, K)` |
| `[A, B]` / `readonly [A, B]` | 左边不是被操作的类型（`:` / `=` / `|` / 修饰词 / 列表开头） | `TupleType(A, B)` |

**方括号本身不进产物**（与 `ObjectLiteral` / `ArrayLiteral` 同一口径）。两种来路因此**产物同形**：

- `Dirent<X>[]` 的空括号被 `JsonArrayReorganization` 先收成了 `ArrayLiteral`（内容为空），
- `(A | B)[]` 的括号前面是另一个括号，`IsArrayAt` 判否、留成 `Bracket`（内容也是空），

两条路都走 `MoveDataTo` 把**括号里的内容**搬进新节点，所以 `T[]` 的产物一律是
`<ArrayType>元素类型</ArrayType>`——只认 `Bracket`、或者把包装单元留在树里的版本，
同一种写法会长出两种树（`cases:align` 实测各 7 / 3 处）。

`TupleType` 那一支直接 `Replace` 自己（位置不变）；`ArrayType` / `IndexedAccessType`
要把左边那个类型一起收进来，所以用 `ReplaceCountAt` 替换从 `previousIndex` 到 `index` 的一整段。

**`Replace` 之前不许先 `Add`**（实测踩过）：`Token.Replace` 读的是 `this.Parent.Data`，
而 `AddAndCloseLast` 会把子单元的 `Parent` 改成新节点——先 Add 再 Replace，
`Replace` 就变成「把这个节点插进它自己里面、再把自己从自己里面删掉」，
产物里那一层节点凭空消失（`type T = [A, B]` 实测：`TupleType` 造出来又被摘掉，
最后仍是裸的 `ArrayLiteral`），另一个形状直接抛「自身不在父单元的子单元里」。
所以顺序固定为 **`Replace` 先、`AddAndCloseLast` / `MoveDataTo` 后**。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("TypeBracketReorganization.Process: current is null");
}
const previousIndex = SkipPreviousWrapSymbol(units, index);
const previous = Get(units, previousIndex);
const hasOperand = IsTypeOperandUnit(previous);
if (IsEmptyContentUnit(current) && hasOperand) {
  if (this.IsNestedInTypeBracket(current, previousIndex, index, units)) {
    return index;
  }
  const array = new ArrayType(current.Template);
  array.SignIn(previous!.SourceRange.Start!);
  array.SignOut(current.SourceRange.End!);
  array.AddAndCloseLast(previous!);
  current.MoveDataTo(array);
  array.TryToClose();
  return ReplaceCountAt(units, previousIndex, index - previousIndex + 1, array);
}
if (IsEmptyContentUnit(current) === false && hasOperand) {
  if (this.IsNestedInTypeBracket(current, previousIndex, index, units)) {
    return index;
  }
  const indexed = new IndexedAccessType(current.Template);
  indexed.SignIn(previous!.SourceRange.Start!);
  indexed.SignOut(current.SourceRange.End!);
  indexed.AddAndCloseLast(previous!);
  current.MoveDataTo(indexed);
  indexed.TryToClose();
  return ReplaceCountAt(units, previousIndex, index - previousIndex + 1, indexed);
}
if (this.IsNestedInTypeBracket(current, index, index, units)) {
  return index;
}
const tuple = new TupleType(current.Template);
tuple.SignIn(current.SourceRange.Start!);
tuple.SignOut(current.SourceRange.End!);
current.Replace(tuple);
current.MoveDataTo(tuple);
tuple.TryToClose();
return index;
```

# class ArrayType extends IndependentToken

数组类型（`T[]`）。类名必须与产物的标签名一致。

内容直接装在自己身上：被数组化的那个类型（`<ArrayType><Identifier>T</Identifier></ArrayType>`）。
构造器挂**类型队列**，`readonly (A | B)[]` 这类形状里的联合 / 括号类型因此照常成形。

## constructor:(template:Template)=>void

搬进来的那一段要再跑一趟**类型队列**（元素类型里的联合 / 嵌套数组在那里成形）。

```ts
super(template);
ParsePipeline.InitialKeywordReorganizationQueue(this);
```

## method Clone:()=>Token

克隆自身（`Sign(this)` → 子单元逐个克隆后整批加入 → `TryToClose()`）。

```ts
const result = new ArrayType(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```

# class TupleType extends IndependentToken

元组类型（`[A, B]` / `readonly [A, B]`）。类名必须与产物的标签名一致。

## constructor:(template:Template)=>void

搬进来的那一段要再跑一趟**类型队列**（元素类型里的联合 / 嵌套元组在那里成形）。

```ts
super(template);
ParsePipeline.InitialKeywordReorganizationQueue(this);
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new TupleType(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```

# class IndexedAccessType extends IndependentToken

下标访问类型（`T[K]` / `T["k"]`）。类名必须与产物的标签名一致。

**与值位下标访问的区别只在容器**：`a[i]` 的父单元是语句 / 表达式，`T[K]` 的父单元是类型容器。

## constructor:(template:Template)=>void

搬进来的那一段要再跑一趟**类型队列**（下标里的联合 / `keyof` 在那里成形）。

```ts
super(template);
ParsePipeline.InitialKeywordReorganizationQueue(this);
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new IndexedAccessType(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
