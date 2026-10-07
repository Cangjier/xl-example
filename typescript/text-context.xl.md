# dependencies
```xl
import { Message } from "../core/syntax/message.xl.md"
import { SyntaxContext } from "../core/syntax/syntax-context.xl.md"
import { Template } from "../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "./parse-pipeline.xl.md"
import { Root } from "./tokens/root.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

文本上下文：`Core/Syntax` 的 `SyntaxContext` 在 `typescript` 里的唯一实现。

它只做两件事：构造时把根单元换成 `Root`、把 `HandleMessage` 压成空实现。
**它也是整个解析的入口**——调用方拿到的 `textContext.Root.ToString()` 就是验收用的 XML。

**它同时是装配点**：装配职责已经从 `Root` 里摘出来，所以「把通用跳转队列与通用规则队列装进模板」
落在造根单元之前的那一步——见 `./parse-pipeline.xl.md`。

语法层把 `ValueType` 定死为 `string`，所以 `SyntaxContext` 不再带类型参数。

# class TextContext extends SyntaxContext

文本上下文。

## constructor:(Template:Template)=>void

以模板创建：先装配模板，再把根单元换成 `Root`。

资源生命周期交给 GC（见 README「资源生命周期：交给 GC」），构造器不再接收资源归属参数，所以这里写 `super(new Root(Template))`。
构造器的执行顺序是「先装配模板、再 `new Root`、最后 `super`」：`Root` 的构造器要读模板上的队列，
装配必须在它之前完成；而 `new Root` 的实参在 `super` 之前求值，顺序天然成立。

参数名 `Template` 与类型名 `Template` 同名；ts 里参数名不会遮蔽类型位置上的
`Template`，所以合法。

```ts
super(new Root(Template.Initialize(ParsePipeline.Install)));
```

## protected method HandleMessage:(Message:Message)=>void

消费一条非插队消息的钩子。

**空实现**：文本层没有需要 `SyntaxContext` 代为处理的消息类型（插队消息由基类自己处理）。
不写方法体，打印器产出空方法。
