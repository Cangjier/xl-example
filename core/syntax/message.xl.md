# dependencies
```xl
import { Token } from "./token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

消息通道：处理一个字符时，单元可以给上下文留一条消息，等这一轮处理结束后由 `SyntaxContext` 统一消费。

# enum MessageTypes

消息类型。

原 C# 的 `MessageTypes` 只有一个成员。

- case None
无类型。目前所有消息都是它。

# class Message

消息。

原 C# 侧是 `public abstract class Message<ValueType> : IReleasable`，`Type` 是抽象属性，写成抛错桩（M13）。
资源归属层已移除：`IReleasable`、`Owner` 字段与 `Release` 都没有对应物（见 README「资源生命周期：交给 GC」）。

## field Target:Token

消息的目标单元。

## field ProcessOwner:Token | null = null

处理本消息时要切换到的单元；`null` 表示用上下文的根。原 C# 是 `Token<ValueType>? ProcessOwner { get; set; }`。

## constructor:(Target:Token)=>void

创建消息。

```ts
this.Target = Target;
```

## property Type:MessageTypes

消息类型。

原 C# 是 `public abstract MessageTypes Type { get; }`，由 `ReloadMessage` 覆写成 `MessageTypes.None`。

### get

```ts
throw new Error("abstract member: Type");
```
