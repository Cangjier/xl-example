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
import { ConstructorShape } from "./constructor-shape.xl.md"
```

# namespace cangjie

# class ConstructorPossibleShape extends PossibleShape

```txt
class C { constructor() {} }
class C { constructor(private a: A) {} }
class C { static constructor() {} }
```

类体里的构造函数成员候选。`constructor` 只有在**名字位置**且后面跟参数表 `(`（或泛型 `<` 再 `(`）时才归构造：
`constructor = 1` / `constructor: A` 里的 `constructor` 是属性名，由 `ClassMemberPossibleUtil.ClassifyHead` 判成
`PropertyKind` / `MethodKind`，本候选 `Reject`。

判定与建形状分离：`ComputeByIndex` 只读 `ClassMemberPossibleUtil.Scan` 的结论；`BuildByIndex` 调用
`ClassDeclarationShape.BuildMemberFromCode`——与壳收口时的 raw 兜底走**同一个** `BuildMembers`，所以区间 /
`Pos` / `End` / children 顺序与一次性构建逐字一致。构造的 `instanceof` 断言同时是判型的最后一道保险：
判成构造而建造器给出别的形状，说明判型与 `BuildMembers` 分叉，直接抛错。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

只读共享扫描结论：可能种类里没有构造就 `Reject`；收住了就 `Accept`；其余 `Uncertain`。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const state = ClassMemberPossibleUtil.Scan(units, tokenIndex, cache);
if (!ClassMemberPossibleUtil.HasKind(state.Kinds, ClassMemberPossibleUtil.ConstructorKind)) {
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
  && ClassMemberPossibleUtil.HasKind(state.Kinds, ClassMemberPossibleUtil.ConstructorKind);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

消费 `state.Start .. CodeAt[state.End]` 这一段（含成员自己的 `;`），交给 `ClassDeclarationShape.BuildMemberFromCode`
建一次形状，然后 `host.Data.splice(start, consumed, shape)` 原地顶替。

整段没读完 / 产出不是 `ConstructorShape` 时**不建、不顶替**：raw 代码原样留给收口时的 `BuildMembers`。

```ts
const state = catalog.PossibleShapesComputeCache.GetState<ClassMemberPossibleScan>(ClassMemberPossibleUtil.CacheKey);
if (state === null || state.End < 0 || state.End >= state.CodeAt.length) {
  throw new Error("ConstructorPossibleShape.BuildByIndex: 判定状态缺失");
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
if (!(built instanceof ConstructorShape)) {
  throw new Error("ConstructorPossibleShape.BuildByIndex: 产出不是 ConstructorShape");
}
host.Data.splice(start, consumed.length, built);
// Share 由 Build 阶段更新：条目起点前进一格（被建的形状正好坐在 start 上）。
ClassMemberPossibleUtil.UpdateItemStartAfterBuild(catalog.PossibleShapesComputeCache, host, start);
built.Parent = host;
return built;
```
