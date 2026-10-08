# dependencies
```xl
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

`Process` 有三种用法（参数表不同），xl 同一类型内不允许成员重名（`E1205`），最常用的文档版用原名 `Process`，其余加后缀 `ProcessSingle` / `ProcessAt`。

变量表的键是 `string`、值是 `any`——ts 的 `object` 只表示「非原始值」，装不下 `string` / `number`。

# class SyntaxContext

语法上下文。

## field Messages:Array<Message> = []

待消费的消息队列。

## field VariableMap:Map<string, any> = new Map()

上下文变量表。

## field Root:Token

根单元。整个解析从它开始，所有 token 最终都挂在它的 `Data` 下。

## field SourceQueue:Array<ProcessSource> = []

待处理位置的队列。

## constructor:(root:Token)=>void

以根单元创建上下文。

```ts
this.Root = root;
```

## method GetDefault:<Item>(key:string, defaultValue?:Item | null)=>Item | null

取变量；不存在时给默认值。

变量存在但值是 `null` 时也返回默认值。

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

`documents.At(i)` 每次访问都新建一个 `Source`，不要依赖对象身份。

**空文档直接返回**（第 64 轮补）：一个位置都没有时，循环体一次都不跑，
`Root` 既没签入也没签出，`TryToClose()` 会抛
`SourceException: SourceRange.Start == null || SourceRange.End == null`
——**一个空的 `.ts` 文件整份解析失败**（实测）。
空文档的产物就该是一个空的 `<Root></Root>`，与「只有换行」「只有注释」的文件一致，
所以这里提前返回，不碰 `TryToClose`。

```ts
const count = documents.GetCount();
if (count === 0) {
  return;
}
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

```ts
this.SourceQueue.push(new ProcessSource(this.Root, item));
this.DrainQueue();
```

## method ProcessAt:(processOwner:Token, item:Source)=>void

处理单个位置，处理者是指定单元。

```ts
this.SourceQueue.push(new ProcessSource(processOwner, item));
this.DrainQueue();
```

## private method DrainQueue:()=>void

把位置队列抽干：逐个弹出、交给 `ProcessOwner` 处理，每处理完一轮就消费一次消息队列。

队列是「边处理边插队」的，所以必须用 `while` 而不是 `for`——处理过程中可能又有新位置进来（含 `ReloadMessage` 插回队首的）。

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

默认空实现，`TextContext` 也覆写成空，所以不写 ts 体，打印器产出空方法。

## private method DrainMessages:()=>void

把消息队列抽干：`ReloadMessage` 插回位置队列的**队首**，其余交给 `HandleMessage`。

```ts
while (this.Messages.length > 0) {
  const item = this.Messages[0];
  this.Messages.splice(0, 1);
  if (item instanceof ReloadMessage) {
    this.SourceQueue.splice(
      0,
      0,
      new ProcessSource(item.ProcessOwner ?? this.Root, item.Source),
    );
  } else {
    this.HandleMessage(item);
  }
}
```
