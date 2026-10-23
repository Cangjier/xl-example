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
import { IndexSignatureShape } from "./index-signature-shape.xl.md"
import { TypeBuilder } from "./type-builder.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

# class IndexSignaturePossibleShape extends PossibleShape

```txt
interface I { [k: string]: A; }
interface I { readonly [k: string]: A; }
interface I { [k: number]: A }
```

对象类型里的索引签名候选：可选的 `readonly` 修饰词、`[` 参数名 `:` 键类型 `]`、`:` 值类型，参数名任意、键与值类型任意，成员边界 `;` / `,` / 换行 / 容器收口。

**判型分界**（与 `TypeBuilder.ParseTypeMember()` 同口径，由共享工具回答）：`[...]` 内部**第二个代码单元是 `:`**（或空括号）才是索引签名；`[expr]` 后接 `:` / `?` / `?:` / `(` / `<` 的是计算属性名属性签名 / 方法签名，索引候选在方括号刚关闭时就要 `Reject`。`readonly` 只有「同一行 + 后面跟名字 / 字符串名 / 计算名」时才是修饰词（换行时它是成员名）。

判定与建形状分离：`ComputeByIndex` 只读 `MemberPossibleUtil.Scan` 的结论（可能种类里没有索引签名就 `Reject`；收住了就 `Accept`），消费范围由扫描状态的 `End` 给，`BuildByIndex` 才用 `TypeBuilder.ParseTypeMember()` 建一次形状并断言产出的是 `IndexSignatureShape`。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

只读共享扫描结论：可能种类里没有索引签名就 `Reject`；收住了就 `Accept`；其余 `Uncertain`（继续等）。空条目 / 纯 trivia / 纯分隔符的 `Kinds` 是全部种类且 `Complete=false`，一律 `Uncertain`。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const state = MemberPossibleUtil.Scan(units, tokenIndex, cache);
if (!MemberPossibleUtil.HasKind(state.Kinds, MemberPossibleUtil.IndexKind)) {
  return ShapeStates.Reject;
}
if (state.Complete) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

收住了才建：`;` / `,` / 下一个成员起点 / 容器收口，三选一的证据在 `MemberPossibleUtil.Analyze` 里已经算好。只看到 `[k: string]` 关闭（还没等到 `:` 与值类型）时 `Complete=false`，继续等后面的单元。

```ts
const state = cache.GetState<MemberPossibleScan>(MemberPossibleUtil.CacheKey);
if (state === null) {
  return false;
}
return state.Complete && state.End >= 0
  && MemberPossibleUtil.HasKind(state.Kinds, MemberPossibleUtil.IndexKind);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

消费 `state.Start .. CodeAt[state.End]` 这一段（含成员自己的 `;` / `,`），用 `TypeBuilder.ParseTypeMember()` 建出索引签名，然后 `host.Data.splice(start, consumed, shape)` 原地顶替。

成员区间尾部的 trivia 不属于成员：`splice` 只吃到最后一个代码单元，后面的 trivia 留给下一条目当先行 trivia（下一条目的 `Pos` 由 `BasePos` 按「前一个非 trivia 单元」算，与整段解析同口径）。

```ts
const state = catalog.PossibleShapesComputeCache.GetState<MemberPossibleScan>(MemberPossibleUtil.CacheKey);
if (state === null || state.End < 0 || state.End >= state.CodeAt.length) {
  throw new Error("IndexSignaturePossibleShape.BuildByIndex: 判定状态缺失");
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
if (!(built instanceof IndexSignatureShape)) {
  throw new Error("IndexSignaturePossibleShape.BuildByIndex: 产出不是 IndexSignatureShape");
}
host.Data.splice(start, consumedLength, built);
MemberPossibleUtil.UpdateItemStartAfterBuild(catalog.PossibleShapesComputeCache, host, start);
built.Parent = host;
return built;
```
