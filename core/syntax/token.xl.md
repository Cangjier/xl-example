# dependencies
```xl
import { SourceException } from "../exceptions/source-exception.xl.md"
import { Branch } from "./branch.xl.md"
import { Reorganization } from "./reorganization.xl.md"
import { Source } from "./source.xl.md"
import { SourceRange } from "./source-range.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { Template } from "./templates/template.xl.md"
import { Sequence } from "./templates/sequence.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

`Token` 是整棵树的地基：它记录自己覆盖的源码范围、自己的子单元、以及处理每个字符时该跑哪些跳转与重组。

# class Token

Token，语法树的地基。

原 C# 侧是 `public abstract class Token<ValueType> : IReleasable`。**本移植移除了资源归属层**：`Token` 不再实现
`IReleasable`、不再持有 `Owner` 字段、构造器也不收 `owner`，释放交给 GC（见 README「资源生命周期：交给 GC」）。
xl 没有 `abstract`（M13）：`Default` / `Close` / `Process` / `Clone` 四个抽象成员写成抛错桩。

## field Template:Template

本单元使用的模板。

## field ProcessQueue:Sequence<Branch> | null = null

从当前单元跳到下一个单元的跳转队列。由各 token 在自己的构造器里从 `Template.BranchTemplate` 取。原 C# 是 `protected set`。

## field ReorganizationQueue:Sequence<Reorganization> | null = null

本单元关闭时要跑的重组队列。原 C# 是 `internal protected set`。

## field Parent:Token | null = null

父单元。

## field Data:Array<Token> = []

子单元。原 C# 是 `List<Token<ValueType>> Data { get; private set; }`。

## field MountedUnit:Token | null = null

当前挂载的子单元：非空时本单元把 `Process` 直接转给它。

## field SourceRange:SourceRange = new SourceRange()

本单元覆盖的源码范围。原 C# 是公开字段（`public SourceRange<ValueType> SourceRange = new()`）。

## field LastSource:Source | null = null

上一次处理的字符位置。

## field Closed:bool = false

本单元是否已关闭；关闭后不再接收字符。

## constructor:(template:Template)=>void

以模板创建。

原 C# 是 `Token(IOwner owner, Template<char> template)`，体内除了记下模板还把自身 `owner.Add(this)` 登记进持有者。
资源归属层移除后这两件事只剩一件，登记与 `Release` 都没有对应物。

```ts
this.Template = template;
```

## method Last:(index?:int)=>Token | null

倒数第 `index` 个子单元；越界返回 `null`。

原 C# 签名是 `Token<ValueType>? Last(int index = 0)`。

```ts
const position = this.Data.length - 1 - (index ?? 0);
if (position >= 0 && position < this.Data.length) {
  return this.Data[position];
}
return null;
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

所有跳转都不接手时的兜底处理。

原 C# 是 `protected abstract`。`Root.Default` 会在这里报「未知字符」。

```ts
throw new Error("abstract member: Default");
```

## protected method Close:()=>void

关闭本单元。

原 C# 是 `protected abstract`；绝大多数实现只做 `Closed = true`。

```ts
throw new Error("abstract member: Close");
```

## method TryToClose:()=>void

尝试关闭：范围必须已签入签出，然后关闭并跑一遍重组。

约定（原 C# 注释）：`SourceRange` 只能赋值一次；`Close` 之前它必须已赋值；新建单元时上一个单元必须已关闭。

```ts
if (this.SourceRange.Start === null || this.SourceRange.End === null) {
  throw SourceException.SourceRangeContainsNull;
}
this.Close();
this.Reorganize();
```

## method Reorganize:()=>void

跑一遍重组队列：对每个重组规则、对每个下标，先问 `Previous`，命中就 `Process`。

原 C# 的 `Process` 带 `ref int index`，按 M15 改成返回值，所以这里写 `i = item.Process(..., i)`——重组会把多个子单元换成一个，下标必须跟着走。

```ts
if (this.ReorganizationQueue === null) {
  return;
}
for (const item of this.ReorganizationQueue.Data) {
  for (let i = 0; i < this.Data.length; i++) {
    if (item.Previous(this.Template, this.Data, i)) {
      i = item.Process(this.Template, this.Data, i);
    }
  }
}
```

## method MoveDataTo:(target:Token)=>void

把所有子单元搬给 `target`，然后清空自己的。

```ts
for (const item of this.Data) {
  target.Add(item);
}
this.Data.length = 0;
```

## method Add:<Item extends Token>(item:Item)=>Item

加一个子单元，并把它的父设为自己。

原 C# 签名是 `T Add<T>(T item) where T : Token<ValueType>`。

```ts
item.Parent = this;
this.Data.push(item);
return item;
```

## method AddRange:<Item extends Token>(items:Array<Item>)=>Token

加一批子单元，返回自身。

原 C# 是重载 `Add<T>(IEnumerable<T> items)`；它与单元素版参数个数相同，ts 无法靠重载区分，按 M14(c) 改名 `AddRange`。

```ts
for (const item of items) {
  item.Parent = this;
}
this.Data.push(...items);
return this;
```

## method AddAndCloseLast:<Item extends Token>(item:Item)=>Item

加一个子单元；如果最后一个子单元还没关闭，先关掉它。

```ts
const last = this.Last();
if (last !== null && !last.Closed) {
  last.TryToClose();
}
return this.Add(item);
```

## method AddToMounted:<Item extends Token>(item:Item)=>Item

加一个子单元并把它设为 `MountedUnit`。

```ts
this.MountedUnit = this.AddAndCloseLast(item);
return item;
```

## method Quit:()=>Token | null

从父单元卸载自己，返回父单元。

```ts
if (this.Parent !== null) {
  this.Parent.MountedUnit = null;
}
return this.Parent;
```

## method Process:(context:SyntaxContext, source:Source)=>void

处理一个字符。

原 C# 是 `public abstract`。

```ts
throw new Error("abstract member: Process");
```

## method SignIn:(source:Source)=>Token

签入：把范围起点设为 `source`。起点只能设一次。

原 C# 签名是 `Token<ValueType> SignIn(in Source<ValueType> source)`。

```ts
if (this.SourceRange.Start === null) {
  this.SourceRange.Start = source;
  return this;
}
throw SourceException.SourceRangeStartIsSetted;
```

## method SignInToken:(token:Token)=>Token

用另一个单元的起点签入。

原 C# 是重载 `SignIn(Token<ValueType> source)`，按 M14(c) 改名 `SignInToken`。

```ts
if (token.SourceRange.Start === null) {
  throw SourceException.SourceRangeStartIsNull;
}
return this.SignIn(token.SourceRange.Start);
```

## method SignOut:(source:Source)=>void

签出：把范围终点设为 `source`，并让最后一个子单元递归签出。终点只能设一次。

原 C# 是 `public virtual void SignOut(in Source<ValueType> source)`。

```ts
if (this.SourceRange.End === null) {
  this.SourceRange.End = source;
  if (this.Data.length !== 0) {
    this.Data[this.Data.length - 1].TrySignOut(source);
  }
} else {
  throw SourceException.SourceRangeEndIsSetted;
}
```

## private method TrySignOut:(source:Source)=>void

递归签出：只在终点还没设过时往下传。

原 C# 是私有方法，与 `SignOut` 的差别是**不抛异常**——遇到已签出的子单元就停。

```ts
if (this.SourceRange.End === null) {
  this.SourceRange.End = source;
  if (this.Data.length !== 0) {
    this.Data[this.Data.length - 1].TrySignOut(source);
  }
}
```

## method SignOutToken:(token:Token)=>void

用另一个单元的终点签出。

原 C# 是重载 `SignOut(Token<ValueType> source)`，按 M14(c) 改名 `SignOutToken`。

```ts
if (token.SourceRange.End === null) {
  throw SourceException.SourceRangeEndIsNull;
}
this.SignOut(token.SourceRange.End);
```

## method Sign:(token:Token)=>void

用另一个单元同时签入与签出。

原 C# 签名是 `void Sign(Token<ValueType> source)`。

```ts
this.SignInToken(token);
this.SignOutToken(token);
```

## method Undo:(source:Source)=>void

回退：找到覆盖 `source` 的子单元，让它回退。

原 C# 是 `public virtual`，用模式匹配 `WhichUnitRangeContains(source) is Token<ValueType> undoUnit`；类类型的模式匹配在 `null` 时不成立，等价于 ts 的 `!== null`。

```ts
const undoUnit = this.WhichUnitRangeContains(source);
if (undoUnit !== null) {
  undoUnit.Undo(source);
}
```

## method IsUndo:(source:Source)=>bool

能不能回退。

原 C# 是 `public virtual`。

```ts
const undoUnit = this.WhichUnitRangeContains(source);
if (undoUnit !== null) {
  return undoUnit.IsUndo(source);
}
return false;
```

## method WhichUnitRangeContains:(source:Source)=>Token | null

从后往前找第一个覆盖了 `source` 的子单元。

```ts
for (let i = this.Data.length - 1; i >= 0; i--) {
  if (this.Data[i].SourceRange.IsInRange(source)) {
    return this.Data[i];
  }
}
return null;
```

## method Replace:<Item extends Token>(item:Item)=>Item

在父单元里用 `item` 顶替自己，位置不变。

原 C# 用 `Insert` + `RemoveAt` 实现原地替换，ts 侧照抄成两次 `splice`。

```ts
if (this.Parent === null) {
  throw new Error("Parent is null");
}
const index = this.Parent.Data.indexOf(this);
if (index === -1) {
  throw new Error("Index == -1");
}
item.Parent = this.Parent;
if (this.Parent.MountedUnit === this) {
  this.Parent.MountedUnit = item;
}
this.Parent.Data.splice(index, 0, item);
this.Parent.Data.splice(index + 1, 1);
return item;
```

## method RemoveSelf:()=>void

从父单元里移除自己。

```ts
if (this.Parent === null) {
  throw new Error("Parent is null");
}
const index = this.Parent.Data.indexOf(this);
if (index === -1) {
  throw new Error("Index == -1");
}
if (this.Parent.MountedUnit === this) {
  this.Parent.MountedUnit = null;
}
this.Parent.Data.splice(index, 1);
```

## method ToXmlString:()=>string

产出 XML：标签名是**运行时类型名**，内容是子单元的 XML 串接。

原 C# 用 `GetType().Name`；按 M17，ts 侧用 `this.constructor.name`——这是整个移植里**类名必须与 C# 完全一致**的原因。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name}>${temp.join("")}</${name}>`;
```

## method ToString:()=>string

原 C# 是 `public override string ToString() => ToXmlString();`——`Root.ToString()` 就是 XML 的入口。

```ts
return this.ToXmlString();
```

## method ToDictionary:()=>Map<string, any>

转成字典：`type` 是运行时类型名，有子单元时再加 `children`。

原 C# 返回 `Dictionary<string, object>`；C# 的 `object` 按 M20 映射成 ts 的 `any`。

```ts
const result = new Map<string, any>();
result.set("type", this.constructor.name);
if (this.Data.length !== 0) {
  const children: any[] = [];
  for (const item of this.Data) {
    children.push(item.ToDictionary());
  }
  result.set("children", children);
}
return result;
```

## method ToList:()=>Array<any>

转成列表，每项在自己的字典上再加一个 `range`（起止下标，缺失记 `0`）。

原 C# 返回 `List<object>`，`range` 是 `List<object>` 装两个 `int`。

```ts
const result: any[] = [];
for (const item of this.Data) {
  const itemObject = item.ToDictionary();
  itemObject.set("range", [
    item.SourceRange.Start === null ? 0 : item.SourceRange.Start.Index,
    item.SourceRange.End === null ? 0 : item.SourceRange.End.Index,
  ]);
  result.push(itemObject);
}
return result;
```

## method Clone:()=>Token

克隆自身。

原 C# 是 `public abstract Token<ValueType> Clone()`。

```ts
throw new Error("abstract member: Clone");
```
