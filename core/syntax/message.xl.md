# dependencies
```xl
import { SyntaxContext } from "./syntax-context.xl.md"
import { Token } from "./token.xl.md"
```

# namespace cangjie

# enum MessageTypes

- case None

# class Message

## field Target:Token | null = null

## field ProcessOwner:Token | null = null

## constructor:(Target?:Token | null)=>void

```ts
this.Target = Target ?? null;
```

## property Type:MessageTypes

### get

```ts
throw new Error("abstract member: Type");
```
