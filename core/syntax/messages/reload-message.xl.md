# dependencies
```xl
import { Message, MessageTypes } from "../message.xl.md"
import { Source } from "../source.xl.md"
import { Token } from "../token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

插队消息：把一条位置重新插回队列**队首**，立刻再处理一遍。`String` 里引号配对、`Let` / `Method` 回看上一段文本这类「回头再看一眼」的动作都靠它。

# class ReloadMessage extends Message

重新处理一条位置的消息。

**位置可以是一段**：`End` 非空时，`SourceQueue` 会把 `[Source, End]` 这段里的每个位置按序重放一遍
（`from` 这种四字符的关键字被收进错的单元、要交还父单元时，只重放首字符只会得到 `f`）。
`End` 为空就是原来的「只重放一个位置」。

它有两种构造方式：参数较全的那个做构造器，不指定处理者的那个做成静态工厂。

## field Source:Source

要重新处理的位置；带 `End` 时是这段的起点。

## field End:Source | null = null

要重新处理的这段的终点（含）；`null` 表示只重放 `Source` 一个位置。

## constructor:(processOwner:Token | null, target:Token, source:Source)=>void

带处理者的构造；`processOwner` 允许为 `null`，表示消费时回退到上下文的根。

```ts
super(target);
this.Source = source;
this.ProcessOwner = processOwner;
```

## static method WithoutProcessOwner:(target:Token, source:Source)=>ReloadMessage

不指定处理者的构造方式。

```ts
return new ReloadMessage(null, target, source);
```

## static method FromRange:(target:Token, start:Source, end:Source)=>ReloadMessage

不指定处理者、重放 `[start, end]` 一整段。

```ts
const message = new ReloadMessage(null, target, start);
message.End = end;
return message;
```

## property Type:MessageTypes

消息类型，覆写基类：恒为 `MessageTypes.None`。

### get

```ts
return MessageTypes.None;
```
