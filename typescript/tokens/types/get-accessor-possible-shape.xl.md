# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { GetAccessorShape } from "./get-accessor-shape.xl.md"
import { MemberPossibleScan } from "./property-signature-possible-shape.xl.md"
import { MemberPossibleUtil } from "./property-signature-possible-shape.xl.md"
import { TypeBuilder } from "./type-builder.xl.md"
```

# namespace cangjie

Cangjie 的语法层：接口体成员候选（get 访问器）。

# class GetAccessorPossibleShape extends PossibleShape

```txt
interface I { get x(): A; }
interface I { get [k](): number }
interface I { get x } 
```

接口体里的 get 访问器候选：`get` 是成员起点关键字，后面跟一个名字（标识符或以 `[` 开头的计算名）与参数表 `(...)`，
再跟可选的 `: 返回类型`，成员边界 `;` / `,` / 换行 / 容器收口。TS 的节点是 `GetAccessor`（children = 名字 + [参数] + [返回类型]）。

判定与建形状分离：`ComputeByIndex` 只读共享扫描结论（`MemberPossibleUtil.Scan` 的 `Kinds` 里没有 `GetKind` 就 `Reject`；
收住了就 `Accept`），消费范围由扫描状态的 `End` 给；`BuildByIndex` 才用一次 `TypeBuilder.ParseTypeMember()` 建形状并断言产出 `GetAccessorShape`。

`get` 退化为成员名的写法（`get: A` 属性、`get(): A` 方法、`get` 独占一个成员）由共享判型归到名字族，本候选 `Reject`，
不会抢属性 / 方法候选的成员；`set x(v: A)` 归 `SetKind`，本候选同样 `Reject`——两个访问器候选互斥。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

只读共享扫描结论：可能种类里没有 get 访问器就 `Reject`；收住了就 `Accept`；其余 `Uncertain`（继续等）。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const state = MemberPossibleUtil.Scan(units, tokenIndex, cache);
if (!MemberPossibleUtil.HasKind(state.Kinds, MemberPossibleUtil.GetKind)) {
  return ShapeStates.Reject;
}
if (state.Complete) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

收住了才建：`;` / `,` / 下一个成员起点 / 容器收口，三选一的证据在 `Analyze` 里已经算好。

```ts
const state = cache.GetState<MemberPossibleScan>(MemberPossibleUtil.CacheKey);
if (state === null) {
  return false;
}
return state.Complete && state.End >= 0
  && MemberPossibleUtil.HasKind(state.Kinds, MemberPossibleUtil.GetKind);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

消费 `state.Start .. CodeAt[state.End]` 这一段（含成员自己的 `;` / `,`），用一次 `TypeBuilder.ParseTypeMember()` 建出 get 访问器，
然后 `host.Data.splice(start, consumed, shape)` 原地顶替。成员区间尾部的 trivia 不属于成员，留给下一条目当先行 trivia。

```ts
const state = catalog.PossibleShapesComputeCache.GetState<MemberPossibleScan>(MemberPossibleUtil.CacheKey);
if (state === null || state.End < 0 || state.End >= state.CodeAt.length) {
  throw new Error("GetAccessorPossibleShape.BuildByIndex: 判定状态缺失");
}
const start = state.Start;
const end = state.CodeAt[state.End];
if (start < 0 || end < start) {
  return host;
}
const basePos = MemberPossibleUtil.BasePos(host, start);
const builder = new TypeBuilder(host.Template, context);
const consumedLength = builder.LoadFrom(host.Data, start, end + 1, basePos);
const built = builder.ParseTypeMember();
if (!MemberPossibleUtil.MemberParsedWhole(builder, consumedLength)) {
  return host;
}
if (!(built instanceof GetAccessorShape)) {
  throw new Error("GetAccessorPossibleShape.BuildByIndex: 产出不是 GetAccessorShape");
}
host.Data.splice(start, consumedLength, built);
MemberPossibleUtil.UpdateItemStartAfterBuild(catalog.PossibleShapesComputeCache, host, start);
built.Parent = host;
return built;
```
