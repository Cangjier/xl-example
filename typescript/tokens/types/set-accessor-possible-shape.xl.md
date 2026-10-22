# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { MemberPossibleScan } from "./property-signature-possible-shape.xl.md"
import { MemberPossibleUtil } from "./property-signature-possible-shape.xl.md"
import { SetAccessorShape } from "./set-accessor-shape.xl.md"
import { TypeBuilder } from "./type-builder.xl.md"
```

# namespace cangjie

Cangjie 的语法层：接口体成员候选（set 访问器）。

# class SetAccessorPossibleShape extends PossibleShape

```txt
interface I { set x(v: A); }
interface I { set [k](v: number) }
interface I { set x(v) }
```

接口体里的 set 访问器候选：`set` 是成员起点关键字，后面跟一个名字（标识符或以 `[` 开头的计算名）与参数表 `(...)`，
再跟可选的 `: 返回类型`（TS 的 set 访问器不写返回类型，但恢复路径也接受），成员边界 `;` / `,` / 换行 / 容器收口。
TS 的节点是 `SetAccessor`（children = 名字 + [参数] + [返回类型]）。

判定与建形状分离：`ComputeByIndex` 只读共享扫描结论（`MemberPossibleUtil.Scan` 的 `Kinds` 里没有 `SetKind` 就 `Reject`；
收住了就 `Accept`），消费范围由扫描状态的 `End` 给；`BuildByIndex` 才用一次 `TypeBuilder.ParseTypeMember()` 建形状并断言产出 `SetAccessorShape`。

`set` 退化为成员名的写法（`set: A` 属性、`set(): A` 方法、`set` 独占一个成员）由共享判型归到名字族，本候选 `Reject`，
不会抢属性 / 方法候选的成员；`get x(): A` 归 `GetKind`，本候选同样 `Reject`——两个访问器候选互斥。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

只读共享扫描结论：可能种类里没有 set 访问器就 `Reject`；收住了就 `Accept`；其余 `Uncertain`（继续等）。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const state = MemberPossibleUtil.Scan(units, tokenIndex, cache);
if (!MemberPossibleUtil.HasKind(state.Kinds, MemberPossibleUtil.SetKind)) {
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
  && MemberPossibleUtil.HasKind(state.Kinds, MemberPossibleUtil.SetKind);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

消费 `state.Start .. CodeAt[state.End]` 这一段（含成员自己的 `;` / `,`），用一次 `TypeBuilder.ParseTypeMember()` 建出 set 访问器，
然后 `host.Data.splice(start, consumed, shape)` 原地顶替。成员区间尾部的 trivia 不属于成员，留给下一条目当先行 trivia。

```ts
const state = catalog.PossibleShapesComputeCache.GetState<MemberPossibleScan>(MemberPossibleUtil.CacheKey);
if (state === null || state.End < 0 || state.End >= state.CodeAt.length) {
  throw new Error("SetAccessorPossibleShape.BuildByIndex: 判定状态缺失");
}
const start = state.Start;
const end = state.CodeAt[state.End];
if (start < 0 || end < start) {
  return host;
}
const basePos = MemberPossibleUtil.BasePos(host, start);
const consumed:Array<Token> = host.Data.slice(start, end + 1);
const builder = new TypeBuilder(host.Template, context);
builder.Load(consumed, basePos);
const built = builder.ParseTypeMember();
if (!(built instanceof SetAccessorShape)) {
  throw new Error("SetAccessorPossibleShape.BuildByIndex: 产出不是 SetAccessorShape");
}
if (builder.At !== builder.Units.length) {
  throw new Error("SetAccessorPossibleShape.BuildByIndex: 成员没有读完");
}
if (builder.OriginalConsumed() !== consumed.length) {
  throw new Error("SetAccessorPossibleShape.BuildByIndex: 消费范围与判定不一致");
}
host.Data.splice(start, consumed.length, built);
built.Parent = host;
return built;
```
