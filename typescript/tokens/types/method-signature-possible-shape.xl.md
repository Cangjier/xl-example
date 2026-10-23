# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { MemberPossibleScan, MemberPossibleUtil } from "./property-signature-possible-shape.xl.md"
import { MethodSignatureShape } from "./method-signature-shape.xl.md"
import { TypeBuilder } from "./type-builder.xl.md"
```

# namespace cangjie

# class MethodSignaturePossibleShape extends PossibleShape

```txt
interface I { m(): void; }
interface I { m(a: A, b?: B): C; }
interface I { m?(): void; }
interface I { m<T>(x: T): U; }
interface I { readonly m(): void; }
interface I { "m"(): A; [k](): B; }
```

对象类型 / 接口体里的方法签名候选：成员名（标识符 / 字符串字面量 / 计算名）之后跟参数表 `(`…`)`，
或先跟泛型类型参数表 `<`…`>` 再跟参数表；可选方法 `m?()` 的 `?` 是成员标记，`readonly` 是前缀修饰词，
返回类型 `: T` 可有可无。成员边界 `;` / `,` / 换行 / 容器收口与 `TypeBuilder.ParseTypeMember()` 同口径。

判型只读共享扫描结论（`MemberPossibleUtil.Scan`）：可能种类里没有方法签名就 `Reject`；
边界收住了就 `Accept`，其余 `Uncertain` 继续等。真正的形状由 `BuildByIndex` 用
`TypeBuilder.ParseTypeMember()` 建一次——与参考实现（`PropertySignaturePossibleShape`）共用
`MemberPossibleScan` / `MemberPossibleUtil` 与同一个 `PossibleShapeCache` 键，七个成员候选在一次判定里只扫一遍。

与属性签名的分界按判型表：名字后跟 `(` / `<` 是方法；名字后跟 `:` 是属性；`?` 后面跟 `(` 时看参数表
`)` 之后的下一字符是不是 `:`（是则可选方法，否则可选属性 + 括号类型）。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

只读共享扫描结论：可能种类里没有方法签名就 `Reject`；收住了就 `Accept`；其余 `Uncertain`（继续等）。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const state = MemberPossibleUtil.Scan(units, tokenIndex, cache);
if (!MemberPossibleUtil.HasKind(state.Kinds, MemberPossibleUtil.MethodKind)) {
  return ShapeStates.Reject;
}
if (state.Complete) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

成员边界确定（`;` / `,` / 下一个成员起点 / 容器收口三种证据之一）才建；早建会切错边界。

```ts
const state = cache.GetState<MemberPossibleScan>(MemberPossibleUtil.CacheKey);
if (state === null) {
  return false;
}
return state.Complete && state.End >= 0
  && MemberPossibleUtil.HasKind(state.Kinds, MemberPossibleUtil.MethodKind);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

消费 `state.Start .. CodeAt[state.End]` 这一段（含成员自己的 `;` / `,`，不含成员之后的 trivia），
用 `TypeBuilder.ParseTypeMember()` 建出方法签名，然后 `host.Data.splice(start, consumed, shape)` 原地顶替。

`Pos` 由 `MemberPossibleUtil.BasePos` 算（条目起点前最近一个非 trivia 单元的 `EndIndex`），
与整段 `BuildMembers` 同一口径。**成员读完、消费范围与判定一致才 `splice`**，否则不建、把 raw 代码留给收口时的 `BuildMembers` 按重构前口径恢复（见 `MemberPossibleUtil.MemberParsedWhole`）；整段读完后才断言产出必须是 `MethodSignatureShape`。

`abstract new (...)` 这类 recovery 不是本候选的入口：判型表把它交给构造签名分支，本候选在
`ClassifyHead` 阶段即 `Reject`。

```ts
const state = catalog.PossibleShapesComputeCache.GetState<MemberPossibleScan>(MemberPossibleUtil.CacheKey);
if (state === null || state.End < 0 || state.End >= state.CodeAt.length) {
  throw new Error("MethodSignaturePossibleShape.BuildByIndex: 判定状态缺失");
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
if (!(built instanceof MethodSignatureShape)) {
  throw new Error("MethodSignaturePossibleShape.BuildByIndex: 产出不是 MethodSignatureShape");
}
host.Data.splice(start, consumedLength, built);
MemberPossibleUtil.UpdateItemStartAfterBuild(catalog.PossibleShapesComputeCache, host, start);
built.Parent = host;
return built;
```
