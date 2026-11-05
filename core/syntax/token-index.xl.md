# dependencies
```xl
import { Token } from "./token.xl.md"
```

# namespace cangjie

# class TokenIndex

## field Host:Token

## field Index:int = -1

## constructor:(host:Token, index:int)=>void

```ts
this.Host = host;
this.Index = index;
```

## method At:(at:int)=>Token

```ts
if (at > this.Index) {
  throw new Error(`TokenIndex: 禁止查看 tokenIndex 之后的数据（tokenIndex=${this.Index}，at=${at}）`);
}
return this.Host.Data[at];
```

## method Has:(at:int)=>bool

```ts
return at >= 0 && at <= this.Index && at < this.Host.Data.length;
```
