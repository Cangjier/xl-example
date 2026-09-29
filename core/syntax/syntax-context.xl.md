# dependencies
```xl
import { IOwner } from "../../owners/i-owner.xl.md"
import { IReleasable } from "../../owners/i-releasable.xl.md"
import { Document } from "./document.xl.md"
import { Message } from "./message.xl.md"
import { ProcessSource } from "./process-source.xl.md"
import { ReloadMessage } from "./messages/reload-message.xl.md"
import { Source } from "./source.xl.md"
import { Token } from "./token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

语法上下文：持有根单元、待处理位置队列与消息队列，是驱动整个解析的引擎。`TextContext` 是它唯一的实现。

C# 的 `Process` 有三个同名重载（参数表不同），xl 同一类型内不允许成员重名（`E1205`），按 M14(c) 保留最常用的文档版用原名，其余加后缀。

`Dictionary<string, object>` 里的 C# `object` 在 ts 侧映射成 `any`——ts 的 `object` 只表示「非原始值」，装不下 `string` / `number`。

# class SyntaxContext implements IReleasable

语法上下文。

## field Owner:IOwner

上下文所属的负责人。

## field Messages:Array<Message> = []

待消费的消息队列。

## field VariableMap:Map<string, any> = new Map()

上下文变量表。

原 C# 是 `Dictionary<string, object> VariableMap { get; private set; }`。

## field Root:Token

根单元。整个解析从它开始，所有 token 最终都挂在它的 `Data` 下。

## field SourceQueue:Array<ProcessSource> = []

待处理位置的队列。原 C# 侧是私有字段。

## constructor:(owner:IOwner, root:Token)=>void

以根单元创建上下文，并把自身登记到 `owner`。

```ts
this.Root = root;
this.Owner = owner;
owner.Add([this]);
```

## method GetDefault:<Item>(key:string, defaultValue?:Item | null)=>Item | null

取变量；不存在时给默认值。

原 C# 签名是 `T? GetDefault<T>(string key, T? defaultValue = default)`：变量存在但值是 `null` 时也返回 `default`。

```ts
if (this.VariableMap.has(key)) {
  const value = this.VariableMap.get(key);
  if (value === null || value === undefined) {
    return null;
  }
  return value as Item;
}
return defaultValue ?? null;
```

## method Get:(key:string)=>any

取变量；不存在返回 `null`。

原 C# 签名是 `object? Get(string key)`。

```ts
if (this.VariableMap.has(key)) {
  return this.VariableMap.get(key);
}
return null;
```

## method ContainsKey:(key:string)=>bool

变量是否存在。

```ts
return this.VariableMap.has(key);
```

## method Set:(key:string, value:any)=>SyntaxContext

设变量，返回自身便于链式调用。

```ts
this.VariableMap.set(key, value);
return this;
```

## method Process:(documents:Document)=>void

处理整个文档：逐位置处理，最后一个位置处理完后给根签出，最后把根关掉。

原 C# 签名是 `void Process(Document<ValueType> documents)`。C# 的索引器 `documents[i]` 每次访问都新建一个 `Source`，这里写 `documents.At(i)`，同样每次新建。

```ts
const count = documents.GetCount();
for (let i = 0; i < count; i++) {
  this.ProcessSingle(documents.At(i));
  if (i === count - 1) {
    this.Root.SignOut(documents.At(i));
  }
}
this.Root.TryToClose();
```

## method ProcessSingle:(item:Source)=>void

处理单个位置，处理者用根单元。

原 C# 是重载 `void Process(Source<ValueType> item)`。

```ts
this.SourceQueue.push(new ProcessSource(this.Owner, this.Root, item));
this.DrainQueue();
```

## method ProcessAt:(processOwner:Token, item:Source)=>void

处理单个位置，处理者是指定单元。

原 C# 是重载 `void Process(Token<ValueType> processOwner, Source<ValueType> item)`。

```ts
this.SourceQueue.push(new ProcessSource(this.Owner, processOwner, item));
this.DrainQueue();
```

## private method DrainQueue:()=>void

把位置队列抽干：逐个弹出、交给 `ProcessOwner` 处理，每处理完一轮就消费一次消息队列。

原 C# 是私有的无参重载 `private void Process()`。队列是「边处理边插队」的，所以必须用 `while` 而不是 `for`——处理过程中可能又有新位置进来（含 `ReloadMessage` 插回队首的）。

```ts
while (this.SourceQueue.length > 0) {
  const item = this.SourceQueue[0];
  this.SourceQueue.splice(0, 1);
  item.Process(this);
  this.DrainMessages();
}
```

## protected method HandleMessage:(message:Message)=>void

消费一条非插队消息的钩子。

原 C# 是 `protected virtual` 且默认空实现，`TextContext` 也覆写成空。按 M30 不写 ts 体，打印器产出空方法。

## private method DrainMessages:()=>void

把消息队列抽干：`ReloadMessage` 插回位置队列的**队首**，其余交给 `HandleMessage`。

原 C# 是私有的无参重载 `private void HandleMessage()`。

```ts
while (this.Messages.length > 0) {
  const item = this.Messages[0];
  this.Messages.splice(0, 1);
  if (item instanceof ReloadMessage) {
    this.SourceQueue.splice(
      0,
      0,
      new ProcessSource(this.Owner, item.ProcessOwner ?? this.Root, item.Source),
    );
  } else {
    this.HandleMessage(item);
  }
}
```

## method Release:()=>void

释放上下文。

原 C# 在这里把 `Messages` / `VariableMap` / `Root` / `SourceQueue` / `Owner` 逐个清空或置 `null`；按 M23，置空交 GC 的部分不写，只保留真正清空容器的三个动作。

```ts
this.Messages.length = 0;
this.VariableMap.clear();
this.SourceQueue.length = 0;
```
