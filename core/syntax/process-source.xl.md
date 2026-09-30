# dependencies
```xl
import { Source } from "./source.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { Token } from "./token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

待处理队列里的一条：某个位置，交给某个单元去处理。

# class ProcessSource

一条待处理的「位置 + 处理者」。

`SyntaxContext` 把要处理的字符排成这个队列，逐个弹出后调用 `Process`。队列里只有「处理者 + 位置」两件事。

## field ProcessOwner:Token

处理这条位置的单元。

## field Source:Source

要处理的位置。

## constructor:(processOwner:Token, source:Source)=>void

创建条目。

```ts
this.ProcessOwner = processOwner;
this.Source = source;
```

## method Process:(context:SyntaxContext)=>void

把这条位置交给 `ProcessOwner` 处理。

```ts
this.ProcessOwner.Process(context, this.Source);
```
