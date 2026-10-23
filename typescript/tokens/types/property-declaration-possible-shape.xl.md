# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ClassDeclarationShape } from "../declarations/class-declaration-shape.xl.md"
import { PropertyDeclarationShape } from "./property-declaration-shape.xl.md"
import { ClassMemberPossibleScan, ClassMemberPossibleUtil } from "./class-member-possible-util.xl.md"
```

# namespace cangjie

# class PropertyDeclarationPossibleShape extends PossibleShape

```txt
class C { x = 1; }
class C { readonly x: A; }
class C { static x?: A }
class C { [k] = 1 }
class C { #x = 1 }
class C { "x" = 1 }
```

类体里的属性成员候选：修饰词（`readonly` / `static` / 可见性 / `abstract` / `declare` / `override` / `accessor`）、
可选 `?` / 明确赋值 `!`、类型、初始化器、计算名 / 字符串名 / 数字名 / `#private`、成员边界
（`;` / 换行 + 下一成员起点 / 容器收口），**无分号也成立**。

判定与建形状分离：`ComputeByIndex` 只读 `ClassMemberPossibleUtil.Scan` 的结论（可能种类里没有属性就 `Reject`；
收住了就 `Accept`），消费范围由扫描状态的 `End` 给；`BuildByIndex` 才调用
`ClassDeclarationShape.BuildMemberFromCode`——它与壳收口时的 raw 兜底走**同一个** `BuildMembers`，所以区间 /
`Pos` / `End` 口径与一次性构建逐字一致。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

只读共享扫描结论：可能种类里没有属性就 `Reject`；收住了就 `Accept`；其余 `Uncertain`（继续等）。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const state = ClassMemberPossibleUtil.Scan(units, tokenIndex, cache);
if (!ClassMemberPossibleUtil.HasKind(state.Kinds, ClassMemberPossibleUtil.PropertyKind)) {
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
  && ClassMemberPossibleUtil.HasKind(state.Kinds, ClassMemberPossibleUtil.PropertyKind);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

消费 `state.Start .. CodeAt[state.End]` 这一段（含成员自己的 `;`），交给 `ClassDeclarationShape.BuildMemberFromCode`
建一次形状，然后 `host.Data.splice(start, consumed, shape)` 原地顶替。

成员区间尾部的 trivia 不属于成员：`splice` 只吃到最后一个代码单元，后面的 trivia 留给下一条目当先行 trivia
（下一条目的 `Pos` 由 `BasePos` 按「前一个非 trivia 单元」算，与整段解析同口径）。

整段没读完 / 产出不是 `PropertyDeclarationShape` 时**不建、不顶替**：raw 代码原样留给收口时的 `BuildMembers`
（`BuildMemberFromCode` 返回 `null` 即此意）。

```ts
const state = catalog.PossibleShapesComputeCache.GetState<ClassMemberPossibleScan>(ClassMemberPossibleUtil.CacheKey);
if (state === null || state.End < 0 || state.End >= state.CodeAt.length) {
  throw new Error("PropertyDeclarationPossibleShape.BuildByIndex: 判定状态缺失");
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
if (!(built instanceof PropertyDeclarationShape)) {
  throw new Error("PropertyDeclarationPossibleShape.BuildByIndex: 产出不是 PropertyDeclarationShape");
}
host.Data.splice(start, consumed.length, built);
// Share 由 Build 阶段更新：条目起点前进一格（被建的形状正好坐在 start 上）。
ClassMemberPossibleUtil.UpdateItemStartAfterBuild(catalog.PossibleShapesComputeCache, host, start);
built.Parent = host;
return built;
```
