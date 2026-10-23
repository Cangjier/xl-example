# dependencies
```xl
import { Message, MessageTypes } from "../message.xl.md"
import { Token } from "../token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

重放消息：把一段**下标区间**重新处理一遍。`String` 里引号配对、`Let` / `Method` 回看上一段文本这类「回头再看一眼」的动作都靠它。

# class ReloadMessage extends Message

重新处理一段位置的消息。

**位置可以是一段**：`EndIndex` 非 `-1` 时，驱动层会把 `[StartIndex, EndIndex)` 段里的每个下标按**升序**重放一遍
（`from` 这种四字符的关键字被收进错的单元、要交还父单元时，只重放首字符只会得到 `f`）。
`EndIndex = -1` 就是原来的「只重放一个位置」。

它有两种构造方式：参数较全的那个做构造器，不指定处理者的那个做成静态工厂。

## field StartIndex:int

要重新处理的区间起点；单点重放时就是那一个下标。

## field EndIndex:int = -1

要重新处理的开区间终点；`-1` 表示只重放 `StartIndex` 一个位置。

## constructor:(processOwner:Token | null, startIndex:int, endIndex?:int)=>void

带处理者的构造；`processOwner` 允许为 `null`，表示消费时回退到上下文的根。

```ts
super(processOwner);
this.ProcessOwner = processOwner;
this.StartIndex = startIndex;
this.EndIndex = endIndex ?? -1;
```

## static method WithoutProcessOwner:(target:Token, index:int)=>ReloadMessage

不指定处理者的单点重放。

```ts
const message = new ReloadMessage(null, index);
message.Target = target;
return message;
```

## static method FromRange:(target:Token, startIndex:int, endIndexExclusive:int)=>ReloadMessage

不指定处理者、重放 `[startIndex, endIndexExclusive)` 一整段。

```ts
const message = new ReloadMessage(null, startIndex, endIndexExclusive);
message.Target = target;
return message;
```

## property Type:MessageTypes

消息类型，覆写基类：恒为 `MessageTypes.None`。

### get

```ts
return MessageTypes.None;
```
