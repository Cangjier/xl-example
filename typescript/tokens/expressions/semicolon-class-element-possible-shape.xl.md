# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
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

类体里的**孤立分号**候选：`BuildMembers` 在条目起点看到 `;` 时会建一个只有区间的 `SemicolonClassElement`。
成员自己的尾随 `;`（`a = 1;`）会被属性 / 方法候选吃进区间，不会走到这里。

这条候选同时修掉一个 raw 尾巴的边界问题：`CollectBodyMembers` 收集已建成员时会跳过残留的 `;`（那是接口体的
分隔符口径），所以「属性增量建出 + 后面还剩一个孤立 `;`」如果不由本候选建，收口时那个 `;` 会被丢掉、
AST 比基线少一个节点。孤立 `;` 一旦在 body 里被建出，它就是非 basic 单元，收口时原样收进 `Members`。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

只读共享扫描结论：可能种类里没有孤立分号就 `Reject`；收住了就 `Accept`。

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

`;` 本身就是一个完整的成员，收住即建。

```ts
const state = cache.GetState<ClassMemberPossibleScan>(ClassMemberPossibleUtil.CacheKey);
if (state === null) {
  return false;
}
return state.Complete && state.End >= 0
  && ClassMemberPossibleUtil.HasKind(state.Kinds, ClassMemberPossibleUtil.SemicolonKind);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

消费 `;` 这一格，交给 `ClassDeclarationShape.BuildMemberFromCode` 建一次形状后原地顶替。

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
