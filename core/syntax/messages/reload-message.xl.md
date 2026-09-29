# dependencies
```xl
import { IOwner } from "../../../owners/i-owner.xl.md"
import { Message, MessageTypes } from "../message.xl.md"
import { Source } from "../source.xl.md"
import { Token } from "../token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

插队消息：把一条位置重新插回队列**队首**，立刻再处理一遍。`String` 里引号配对、`Let` / `Method` 回看上一段文本这类「回头再看一眼」的动作都靠它。

# class ReloadMessage extends Message

重新处理一条位置的消息。

原 C# 侧是 `public class ReloadMessage<ValueType> : Message<ValueType>`，两个构造器。按 M14(b) 保留参数较全的那个做构造器，三参的那个转成静态工厂。

## field Source:Source

要重新处理的位置。原 C# 侧是公开字段 `public Source<ValueType> Source;`。

## constructor:(owner:IOwner, processOwner:Token | null, target:Token, source:Source)=>void

带处理者的构造；`processOwner` 允许为 `null`，表示消费时回退到上下文的根。

原 C# 签名是 `ReloadMessage(IOwner owner, Token<ValueType> processOwner, Token<ValueType> target, Source<ValueType> source) : base(owner, target)`。

```ts
super(owner, target);
this.Source = source;
this.ProcessOwner = processOwner;
```

## static method WithoutProcessOwner:(owner:IOwner, target:Token, source:Source)=>ReloadMessage

原 C# 构造器 `ReloadMessage(IOwner owner, Token<ValueType> target, Source<ValueType> source)` 的替代：不指定处理者。

```ts
return new ReloadMessage(owner, null, target, source);
```

## property Type:MessageTypes

消息类型，覆写基类：恒为 `MessageTypes.None`。

### get

```ts
return MessageTypes.None;
```
