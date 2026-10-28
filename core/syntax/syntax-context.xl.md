# dependencies
```xl
import { Document } from "./document.xl.md"
import { Message } from "./message.xl.md"
import { ReloadMessage } from "./messages/reload-message.xl.md"
import { SourceRange } from "./source-range.xl.md"
import { SyntaxException } from "../exceptions/syntax-exception.xl.md"
import { Token } from "./token.xl.md"
```

# namespace cangjie

# class SyntaxContext

## field BufferSize:int = 32

## field Index:int = 0

## field CurrentDocument:Document | null = null

## field Messages:Array<Message> = []

## field Replaying:bool = false

## field VariableMap:Map<string, unknown> = new Map()

## field RegexStartAfter:Set<int> = new Set()

## field Root:Token

## constructor:(root:Token, bufferSize?:int)=>void

```ts
this.Root = root;
this.BufferSize = bufferSize ?? 32;
```

## method GetDefault:<Item>(key:string, defaultValue?:Item | null)=>Item | null

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

```ts
if (this.VariableMap.has(key)) {
  return this.VariableMap.get(key);
}
return null;
```

## method ContainsKey:(key:string)=>bool

```ts
return this.VariableMap.has(key);
```

## method Set:(key:string, value:any)=>SyntaxContext

```ts
this.VariableMap.set(key, value);
return this;
```

## method Process:(document:Document)=>void

```ts
this.CurrentDocument = document;
SourceRange.CurrentDocument = document;
this.Index = 0;
const count = document.GetCount();
while (this.Index < count) {
  const end = Math.min(this.Index + this.BufferSize, count);
  const buffer = new SourceRange(document, this.Index, end);
  const forwardFrom = this.Index;
  this.Root.Process(this, buffer, this.Index);
  if (this.Index < forwardFrom) {
    this.Index = forwardFrom;
  }
  this.DrainMessages();
  if (this.Index <= forwardFrom) {
    throw SyntaxException.FromMessage(
      new SourceRange(document, forwardFrom, Math.min(forwardFrom + 1, count)),
      `SyntaxContext.Process: no progress at index ${forwardFrom}, the owner blocked without consuming any character`,
    );
  }
}
this.Index = count;
this.Root.SignOut(count);
this.Root.Process(this, new SourceRange(document, count, count), count);
this.DrainMessages();
```

## method ProcessRange:(owner:Token, buffer:SourceRange, index:int)=>void

```ts
if (buffer.Document !== null) {
  this.CurrentDocument = buffer.Document;
  SourceRange.CurrentDocument = buffer.Document;
}
this.Index = index;
owner.Process(this, buffer, index);
this.DrainMessages();
```

## protected method HandleMessage:(message:Message)=>void

## private method DrainMessages:()=>void

```ts
while (this.Messages.length > 0) {
  const item = this.Messages[0];
  this.Messages.splice(0, 1);
  if (item instanceof ReloadMessage) {
    const document = this.CurrentDocument!;
    const count = document.GetCount();
    const owner = item.ProcessOwner ?? this.Root;
    const start = item.StartIndex;
    const endExclusive = item.EndIndex < 0 ? start + 1 : item.EndIndex;
    this.Replaying = true;
    for (let at = start; at < endExclusive; at++) {
      const saved = this.Index;
      const windowEnd = Math.min(at + 1, count);
      let attempts = 0;
      while (true) {
        this.Index = at;
        owner.Process(this, new SourceRange(document, at, windowEnd), at);
        if (this.Index !== at) {
          break;
        }
        // 旧队列语义：一次重放没有推进、只压了新消息（典型是「先建形状、再把当前字符交回来」），
        // 这个位置会被重新排队再处理一遍。这里就地重试，模拟那条回路；换不出推进才算挂死。
        attempts++;
        if (attempts > 8) {
          throw SyntaxException.FromMessage(
            new SourceRange(document, at, Math.min(at + 1, count)),
            `SyntaxContext.DrainMessages: reload made no progress at index ${at}`,
          );
        }
      }
      this.Index = Math.max(this.Index, saved);
    }
    this.Replaying = false;
  } else {
    this.HandleMessage(item);
  }
}
```
