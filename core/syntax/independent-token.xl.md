# dependencies
```xl
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

## constructor:(template:Template)=>void

以模板创建。独立单元没有自己的状态，构造器里只有转调。

```ts
super(template);
```

## method Process:(context:SyntaxContext, source:Source)=>void

处理一个字符。

独立单元不接收任何字符，所以这个覆写是**空的**：不写 ts 体，打印器产出空方法。

## protected method Close:()=>void

关闭：只把自己标记为已关闭。

```ts
this.Closed = true;
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

兜底处理。

空实现，不写 ts 体。
