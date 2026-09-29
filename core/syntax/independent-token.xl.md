# dependencies
```xl
import { IOwner } from "../../owners/i-owner.xl.md"
import { Source } from "./source.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { Token } from "./token.xl.md"
import { Template } from "./templates/template.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

独立单元：关闭之后就不再参与字符处理。它靠重组（`Reorganization`）被造出来，本身不消费字符。

# class IndependentToken extends Token

独立单元。

## constructor:(owner:IOwner, template:Template)=>void

原 C# 只是转调基类构造器。

```ts
super(owner, template);
```

## method Process:(context:SyntaxContext, source:Source)=>void

处理一个字符。

原 C# 的覆写是**空的**：独立单元不接收任何字符。按 M30 不写 ts 体，打印器产出空方法。

## protected method Close:()=>void

关闭：只把自己标记为已关闭。

原 C# 是 `protected override void Close()`。

```ts
this.Closed = true;
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

兜底处理。

原 C# 是空实现。按 M30 不写 ts 体。
