# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ClassDeclarationShape } from "../declarations/class-declaration-shape.xl.md"
import { ClassMemberPossibleScan, ClassMemberPossibleUtil } from "./class-member-possible-util.xl.md"
import { GetAccessorShape } from "./get-accessor-shape.xl.md"
```

# namespace cangjie

# class GetAccessorPossibleShape extends PossibleShape

```txt
class C { get x() { return 1; } }
class C { get x(): A { return null; } }
class C { static get [k](): number { return 1; } }
```

类体里的 `get` 访问器成员候选。`get` 只有后面跟名字（标识符 / `[` 计算名 / `#` 私有名）时才是访问器关键字；
`get()` / `get: A` 里的 `get` 是成员名，判型归 `MethodKind` / `PropertyKind`，本候选 `Reject`。

判定与建形状分离：`ComputeByIndex` 只读 `ClassMemberPossibleUtil.Scan` 的结论；`BuildByIndex` 调用
`ClassDeclarationShape.BuildMemberFromCode`——与壳收口时的 raw 兜底走**同一个** `BuildMembers`。产出不是
`GetAccessorShape` 时抛错（判型与建造器分叉的最后一道保险）。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

只读共享扫描结论：可能种类里没有 get 访问器就 `Reject`；收住了就 `Accept`；其余 `Uncertain`。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const state = ClassMemberPossibleUtil.Scan(units, tokenIndex, cache);
if (!ClassMemberPossibleUtil.HasKind(state.Kinds, ClassMemberPossibleUtil.GetKind)) {
  return ShapeStates.Reject;
}
if (state.Complete) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

收住了才建：`;` / 下一成员起点 / 容器收口，三选一的证据在 `Analyze` 里已经算好。

```ts
const state = cache.GetState<ClassMemberPossibleScan>(ClassMemberPossibleUtil.CacheKey);
if (state === null) {
  return false;
}
return state.Complete && state.End >= 0
  && ClassMemberPossibleUtil.HasKind(state.Kinds, ClassMemberPossibleUtil.GetKind);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

消费 `state.Start .. CodeAt[state.End]` 这一段（含成员自己的 `;`），交给 `ClassDeclarationShape.BuildMemberFromCode`
建一次形状，然后 `host.Data.splice(start, consumed, shape)` 原地顶替。

整段没读完 / 产出不是 `GetAccessorShape` 时**不建、不顶替**：raw 代码原样留给收口时的 `BuildMembers`。

```ts
const state = catalog.PossibleShapesComputeCache.GetState<ClassMemberPossibleScan>(ClassMemberPossibleUtil.CacheKey);
if (state === null || state.End < 0 || state.End >= state.CodeAt.length) {
  throw new Error("GetAccessorPossibleShape.BuildByIndex: 判定状态缺失");
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
if (!(built instanceof GetAccessorShape)) {
  throw new Error("GetAccessorPossibleShape.BuildByIndex: 产出不是 GetAccessorShape");
}
host.Data.splice(start, consumed.length, built);
built.Parent = host;
return built;
```
