# dependencies
```xl
import { IOwner } from "../../owners/i-owner.xl.md"
import { Message } from "../../core/syntax/message.xl.md"
import { SyntaxContext } from "../../core/syntax/syntax-context.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Root } from "./tokens/root.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

文本上下文：`Core/Syntax` 的 `SyntaxContext` 在 `Dawn/Text` 里的唯一实现。

它只做三件事：构造时把根单元换成 `Root`、把 `HandleMessage` 压成空实现、把 `Release` 原样转发。
**它也是整个解析的入口**——调用方拿到的 `textContext.Root.ToString()` 就是验收用的 XML。

原 C# 侧是 `public class TextContext : SyntaxContext<char>`。按 M29，基类类型参数带默认值，
所以 `extends SyntaxContext` 在 ts 侧实例化成 `SyntaxContext<any>`。

# class TextContext extends SyntaxContext

文本上下文。

## constructor:(owner:IOwner, Template:Template<string>)=>void

以负责人与模板创建，根单元是 `Root`。

原 C# 是 `public TextContext(IOwner owner, Template<char> Template) : base(owner, new Root(owner, Template))`。

参数名 `Template` 与类型名 `Template` 同名，这是照抄 C# 的写法；ts 里参数名不会遮蔽类型位置上的
`Template<string>`，所以合法。

```ts
super(owner, new Root(owner, Template));
```

## protected method HandleMessage:(Message:Message<string>)=>void

消费一条非插队消息的钩子。

原 C# 是 `protected override void HandleMessage(Message<char> Message) { }`——**空实现**，
因为文本层没有需要 `SyntaxContext` 代为处理的消息类型（插队消息由基类自己处理）。
按 M30 不写 ts 体，打印器产出空方法。

## method Release:()=>void

释放上下文：原样转发给基类。

原 C# 是 `public override void Release() { base.Release(); }`，覆写体只有一句转发。

```ts
super.Release();
```
