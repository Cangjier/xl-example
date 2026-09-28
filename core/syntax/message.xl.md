# dependencies
```xl
import { IOwner } from "../../owners/i-owner.xl.md"
import { IReleasable } from "../../owners/i-releasable.xl.md"
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

# class Message<ValueType = any> implements IReleasable

消息。

类型参数带默认值 `any`，因为 `extends` 只接受裸名字（M29）：`ReloadMessage` 要写 `extends Message`。

原 C# 侧是 `public abstract class Message<ValueType> : IReleasable`，`Type` 是抽象属性，写成抛错桩（M13）。

## field Owner:IOwner

消息所属的负责人。

## field Target:Token<ValueType>

消息的目标单元。

## field ProcessOwner:Token<ValueType> | null = null

处理本消息时要切换到的单元；`null` 表示用上下文的根。原 C# 是 `Token<ValueType>? ProcessOwner { get; set; }`。

## constructor:(owner:IOwner, Target:Token<ValueType>)=>void

创建消息并登记到 `owner`。

```ts
this.Target = Target;
this.Owner = owner;
owner.Add([this]);
```

## property Type:MessageTypes

消息类型。

原 C# 是 `public abstract MessageTypes Type { get; }`，由 `ReloadMessage` 覆写成 `MessageTypes.None`。

### get

```ts
throw new Error("abstract member: Type");
```

## method Release:()=>void

释放消息。

原 C# 在这里把 `Target` / `ProcessOwner` / `Owner` 逐个置 `null`；按 M23，置空交 GC 的部分不写，只断开那个可为空的引用。

```ts
this.ProcessOwner = null;
```
