# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { SemicolonClassElementShape } from "./semicolon-class-element-shape.xl.md"
import { ClassDeclarationShape } from "../declarations/class-declaration-shape.xl.md"
import { ClassMemberPossibleScan, ClassMemberPossibleUtil } from "../types/class-member-possible-util.xl.md"
```

# namespace cangjie

# class SemicolonClassElementPossibleShape extends PossibleShape

```txt
class C { ; }
class C { a = 1;; }
          ^ 第二个 `;` 是独立的 SemicolonClassElement
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const state = ClassMemberPossibleUtil.Scan(units, tokenIndex, cache);
if (!ClassMemberPossibleUtil.HasKind(state.Kinds, ClassMemberPossibleUtil.SemicolonKind)) {
  return ShapeStates.Reject;
}
if (state.Complete) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const state = cache.GetState<ClassMemberPossibleScan>(ClassMemberPossibleUtil.CacheKey);
if (state === null) {
  return false;
}
return state.Complete && state.End >= 0
  && ClassMemberPossibleUtil.HasKind(state.Kinds, ClassMemberPossibleUtil.SemicolonKind);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const state = catalog.PossibleShapesComputeCache.GetState<ClassMemberPossibleScan>(ClassMemberPossibleUtil.CacheKey);
if (state === null || state.End < 0 || state.End >= state.CodeAt.length) {
  throw new Error("SemicolonClassElementPossibleShape.BuildByIndex: 判定状态缺失");
}
const start = state.Start;
const end = state.CodeAt[state.End];
if (start < 0 || end < start) {
  return host;
}
const basePos = ClassMemberPossibleUtil.BasePos(host, start);
const consumed:Array<Token> = host.Data.slice(start, end + 1);
const built = ClassDeclarationShape.BuildMemberFromCode(host, consumed, 0, consumed.length - 1, basePos, context);
if (built === null) {
  return host;
}
if (!(built instanceof SemicolonClassElementShape)) {
  throw new Error("SemicolonClassElementPossibleShape.BuildByIndex: 产出不是 SemicolonClassElementShape");
}
host.Data.splice(start, consumed.length, built);
// Share 由 Build 阶段更新：条目起点前进一格（被建的形状正好坐在 start 上）。
ClassMemberPossibleUtil.UpdateItemStartAfterBuild(catalog.PossibleShapesComputeCache, host, start);
built.Parent = host;
return built;
```
