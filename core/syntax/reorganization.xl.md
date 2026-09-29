# dependencies
```xl
import { Template } from "./templates/template.xl.md"
import { Token } from "./token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

一次「重组尝试」的抽象：单元关闭时，扫描它的子单元列表，把相邻的若干单元合并成更高层的结构（如把 `if` `(` `a` `)` 合成一个 `IfSet`）。

# class Reorganization

一次重组尝试。

原 C# 侧是 `public abstract class Reorganization<ValueType>`，两个抽象方法，都写成抛错桩（M13）。

C# 的两个方法都以 `IOwner owner` 开头；资源归属层移除后这个形参一并去掉（见 README「资源生命周期：交给 GC」），
所以规范签名从 `template` 开始。

`Process` 的 C# 签名带 `ref int index`，按 M15 改成返回值——调用点写成 `i = item.Process(..., i)`。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

下标 `index` 处是不是本次重组的起点。

原 C# 是 `public abstract bool Previous(IOwner owner, Template<ValueType> template, List<Token<ValueType>> units, int index)`。

```ts
throw new Error("abstract member: Previous");
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

执行重组，**返回新的下标**。

原 C# 是 `public abstract void Process(IOwner owner, Template<ValueType> template, List<Token<ValueType>> units, ref int index)`：它既改写 `units`，又通过 `ref` 推进外层循环的下标——ts 不能传引用的 `int`，所以下标变成返回值。

```ts
throw new Error("abstract member: Process");
```
