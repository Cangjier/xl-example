# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ClassMemberPossibleUtil } from "./class-member-possible-util.xl.md"
```

# namespace cangjie

# class ClassMemberCatchAllPossibleShape extends PossibleShape

```txt
class C { constructor() {} }
          ^ 本阶段还没有构造候选：这一条必须安全地留在 raw 里
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const state = ClassMemberPossibleUtil.Scan(units, tokenIndex, cache);
if (!state.Complete || state.Kinds.length === 0) {
  return ShapeStates.Uncertain;
}
for (const kind of state.Kinds) {
  if (!ClassMemberPossibleUtil.HasKind(ClassMemberPossibleUtil.ImplementedKinds(), kind)) {
    return ShapeStates.Uncertain;
  }
}
return ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return false;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
throw new Error("ClassMemberCatchAllPossibleShape.BuildByIndex: 兜底候选不应被建");
```
