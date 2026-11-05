# dependencies
```xl
import { SyntaxContext } from "./syntax-context.xl.md"
import { CatalogGuide } from "./catalog-guide.xl.md"
import { PossibleShapeCache } from "./possible-shape-cache.xl.md"
import { PossibleSource } from "./possible-source.xl.md"
import { ShapeStates } from "./shape-states.xl.md"
import { ShapeToken } from "./shape-token.xl.md"
import { Token } from "./token.xl.md"
import { TokenIndex } from "./token-index.xl.md"
```

# namespace cangjie

# class PossibleShape

## method Compute:(host:Token, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
return this.ComputeByIndex(new TokenIndex(host, host.Data.length - 1), cache, source);
```

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
throw new Error("abstract member: ComputeByIndex");
```

## method Build:(host:Token, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
return this.BuildByIndex(new TokenIndex(host, host.Data.length - 1), catalog, context);
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return true;
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
throw new Error("abstract member: BuildByIndex");
```

## protected method StampCreated:(built:Token, context:SyntaxContext)=>Token

```ts
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
  if (token.CreatedRevisionAt >= 0 && token.CreatedRevisionAt >= token.CreatedAt) {
    token.CreatedRevisionAt = -1;
  }
}
const data = token.Data;
for (let at = 0; at < data.length; at++) {
  PossibleShape.StampAll(data[at], index);
}
```
