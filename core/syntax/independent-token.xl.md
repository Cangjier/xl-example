# dependencies
```xl
import { CloseStates } from "./close-states.xl.md"
import { SourceRange } from "./source-range.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { Token } from "./token.xl.md"
import { Template } from "./templates/template.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

独立单元：关闭之后就不再参与字符处理。它由别的规则造出来，本身不消费字符。

# class IndependentToken extends Token

独立单元。

## constructor:(template:Template)=>void

以模板创建。独立单元没有自己的状态，构造器里只有转调。

```ts
super(template);
```

## method Process:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

处理一个字符。

独立单元不接收任何字符，所以这个覆写是**空的**：不消费、不推进 `context.Index`，被调用时保持 `context.Index === index`（无进展即阻塞返回，由驱动层保护）。不写 ts 体，打印器产出空方法。

## protected method Close:(context:SyntaxContext)=>CloseStates

关闭：只把自己标记为已关闭，返回 `Nothing`。

```ts
this.Closed = true;
return CloseStates.Nothing;
```

## protected method Default:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>void

兜底处理。

空实现，不写 ts 体。
