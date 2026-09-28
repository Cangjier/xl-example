# dependencies
```xl
import { IOwner } from "../../owners/i-owner.xl.md"
import { IReleasable } from "../../owners/i-releasable.xl.md"
import { Source } from "./source.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { Token } from "./token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

待处理队列里的一条：某个位置，交给某个单元去处理。

# class ProcessSource<ValueType> implements IReleasable

一条待处理的「位置 + 处理者」。

`SyntaxContext` 把要处理的字符排成这个队列，逐个弹出后调用 `Process`。

## field Owner:IOwner

本条目所属的负责人。

## field ProcessOwner:Token<ValueType>

处理这条位置的单元。

## field Source:Source<ValueType>

要处理的位置。原 C# 是 `Source<ValueType> Source { get; set; }`。

## constructor:(owner:IOwner, processOwner:Token<ValueType>, source:Source<ValueType>)=>void

创建条目并登记到 `owner`。

原 C# 里 `this.Owner = owner.Add(this)`——`Add` 返回的是 `owner` 自身，所以 ts 侧直接写 `owner.Add([this])`。

```ts
this.ProcessOwner = processOwner;
this.Source = source;
this.Owner = owner.Add([this]);
```

## method Process:(context:SyntaxContext<ValueType>)=>void

把这条位置交给 `ProcessOwner` 处理。

```ts
this.ProcessOwner.Process(context, this.Source);
```

## method Release:()=>void

释放条目。

原 C# 只把 `ProcessOwner` 置 `null`；按 M23 这是纯粹的置空交 GC，ts 侧没有可做的事，所以按 M30 不写 ts 体。
