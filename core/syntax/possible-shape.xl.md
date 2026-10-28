# dependencies
```xl
import { SyntaxContext } from "./syntax-context.xl.md"
import { CatalogGuide } from "./catalog-guide.xl.md"
import { PossibleShapeCache } from "./possible-shape-cache.xl.md"
import { PossibleSource } from "./possible-source.xl.md"
import { ShapeStates } from "./shape-states.xl.md"
import { Token } from "./token.xl.md"
```

# namespace cangjie

# class PossibleShape

## static field Slots:Map<any, int> = new Map()

## static method SlotOf:(shapeClass:any)=>int

```ts
const known = PossibleShape.Slots.get(shapeClass);
if (known !== undefined) {
  return known;
}
const slot = PossibleShape.Slots.size;
PossibleShape.Slots.set(shapeClass, slot);
return slot;
```

## method Slot:()=>int

```ts
return PossibleShape.SlotOf(this.constructor);
```

## method Compute:(units:Array<Token>, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
return this.ComputeByIndex(units, units.length - 1, cache, source);
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

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

## method ContinuationClaim:(units:Array<Token>, tokenIndex:int)=>bool

```ts
// [D0:CONTINUATION] 默认不认领：既有候选一概不参与初始化器位置的通用委派。
return false;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
throw new Error("abstract member: BuildByIndex");
```
