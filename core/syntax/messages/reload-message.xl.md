# dependencies
```xl
import { Message, MessageTypes } from "../message.xl.md"
import { Token } from "../token.xl.md"
```

# namespace cangjie

# class ReloadMessage extends Message

## field StartIndex:int

## field EndIndex:int = -1

## constructor:(processOwner:Token | null, startIndex:int, endIndex?:int)=>void

```ts
super(processOwner);
this.ProcessOwner = processOwner;
this.StartIndex = startIndex;
this.EndIndex = endIndex ?? -1;
```

## static method WithoutProcessOwner:(target:Token, index:int)=>ReloadMessage

```ts
const message = new ReloadMessage(null, index);
message.Target = target;
return message;
```

## static method FromRange:(target:Token, startIndex:int, endIndexExclusive:int)=>ReloadMessage

```ts
const message = new ReloadMessage(null, startIndex, endIndexExclusive);
message.Target = target;
return message;
```

## property Type:MessageTypes

### get

```ts
return MessageTypes.None;
```
