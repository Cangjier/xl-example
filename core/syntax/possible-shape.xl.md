# dependencies
```xl
import { SyntaxContext } from "./syntax-context.xl.md"
import { CatalogGuide } from "./catalog-guide.xl.md"
import { PossibleShapeCache } from "./possible-shape-cache.xl.md"
import { PossibleSource } from "./possible-source.xl.md"
import { ShapeStates } from "./shape-states.xl.md"
import { ShapeToken } from "./shape-token.xl.md"
import { Token } from "./token.xl.md"
```

# namespace cangjie

# class PossibleShape

## method Compute:(host:Token, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
return this.ComputeByIndex(host, host.Data.length - 1, cache, source);
```

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
throw new Error("abstract member: ComputeByIndex");
```

## method Build:(host:Token, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
return this.BuildByIndex(host, host.Data.length - 1, catalog, context);
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return true;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
throw new Error("abstract member: BuildByIndex");
```

## protected method StampCreated:(built:Token, context:SyntaxContext)=>Token

```ts
// 形状的创建位置只由 possible / end 的 build 写：这次 build 建出来的那颗形状，连同它下面的子树。
// 根已经被写过（这颗形状是复用旧树、不是这次建的）就整棵跳过，免得把旧形状标成这一格。
if (built instanceof ShapeToken && built.CreatedAt < 0) {
  PossibleShape.StampAll(built, context.Index);
}
return built;
```

## static method StampAll:(token:Token, index:int)=>void

```ts
if (token instanceof ShapeToken) {
  if (token.CreatedAt < 0) {
    token.CreatedAt = index;
  }
}
const data = token.Data;
for (let at = 0; at < data.length; at++) {
  PossibleShape.StampAll(data[at], index);
}
```
