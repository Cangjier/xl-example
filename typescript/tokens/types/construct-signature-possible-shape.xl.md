# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ConstructSignatureShape } from "./construct-signature-shape.xl.md"
import { MethodSignatureShape } from "./method-signature-shape.xl.md"
import { MemberPossibleScan } from "./property-signature-possible-shape.xl.md"
import { MemberPossibleUtil } from "./property-signature-possible-shape.xl.md"
import { TypeBuilder } from "./type-builder.xl.md"
```

# namespace cangjie

接口 / 对象类型体里的构造签名候选。

# class ConstructSignaturePossibleShape extends PossibleShape

```txt
interface I { new (): A; }
interface I { new (a: A, b: B): C; }
interface I { new <T>(a: T): A; }
interface I { abstract new (): A }
```

对象类型里的构造签名候选：`new` 后接参数表（可带类型参数 `<T>`）与 `:` 返回类型；成员边界 `;` / `,` / 换行 / 容器收口。

判据不看换行：`new` 后紧跟 `(` 或 `<` 就是构造签名（`new` ⏎ `(` 仍是构造签名，与 `TypeBuilder.ParseTypeMember()` 同口径）；`new` 后面是别的单元时 `new` 只是成员名（属性签名），本候选让路。

判定与建形状分离：`ComputeByIndex` 只读共享的 `MemberPossibleUtil.Scan` 结论（可能种类里没有构造签名就 `Reject`；收住了就 `Accept`），真正的形状由 `BuildByIndex` 用 `TypeBuilder.ParseTypeMember()` 建。共享扫描状态与参考实现（`PropertySignaturePossibleShape`）共用同一份 `MemberPossibleScan`，不另写判型。

**`abstract new (...)` 的 recovery**：TS 把 `abstract new (...)` 解析成名字为 `new` 的 `MethodSignature`（带 `AbstractKeyword`），`TypeBuilder.ParseTypeMember()` 也按 TS 处理、产出 `MethodSignatureShape`。共享判型把这条前缀归为构造签名（`abstract` 只是修饰词），所以本候选是目录里唯一还活着的候选时，`BuildByIndex` 接受这个 recovery 形状并按原区间顶替，保证 AST 与 TS 逐节点一致。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

只读共享扫描结论：可能种类里没有构造签名就 `Reject`；收住了就 `Accept`；其余 `Uncertain`（继续等）。

共享扫描在「条目里还有未配对的 `<`」时会把条目中间的 `,`（`new <U, V>`）或后面的 `>`（`new <T>` / `A<B>`）误判成收口；这是共享 `MemberPossibleUtil` 的已知 bug（`fix/member-boundary` 分支在修），本候选不本地绕过——修复合入后 `state.Complete` 才可信。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const state = MemberPossibleUtil.Scan(units, tokenIndex, cache);
if (!MemberPossibleUtil.HasKind(state.Kinds, MemberPossibleUtil.ConstructKind)) {
  return ShapeStates.Reject;
}
if (state.Complete) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

收住了才建：`;` / `,` / 下一个成员起点 / 容器收口，三选一的证据在共享 `Analyze` 里已经算好。

```ts
const state = cache.GetState<MemberPossibleScan>(MemberPossibleUtil.CacheKey);
if (state === null) {
  return false;
}
return state.Complete && state.End >= 0
  && MemberPossibleUtil.HasKind(state.Kinds, MemberPossibleUtil.ConstructKind);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

消费 `state.Start .. CodeAt[state.End]` 这一段（含成员自己的 `;` / `,`），用 `TypeBuilder.ParseTypeMember()` 建出构造签名，然后 `host.Data.splice(start, consumed, shape)` 原地顶替。

成员区间尾部的 trivia 不属于成员：`splice` 只吃到最后一个代码单元，后面的 trivia 留给下一条目当先行 trivia（下一条目的 `Pos` 由 `BasePos` 按「前一个非 trivia 单元」算，与整段解析同口径）。

产出断言：正常路径必须是 `ConstructSignatureShape`；带修饰词的 `new (...)`（TS 的 recovery：`abstract new (...)` / `readonly new (...)` 都是名字为 `new` 的 `MethodSignatureShape`，`TypeBuilder` 对「有修饰词 + `new`」统一走这条）只在条目以 `abstract` / `readonly` 开头时接受。两种情况都必须读完后无 leftover、消费范围与判定一致才 `splice`，否则不建、把 raw 代码留给收口时的 `BuildMembers` 按重构前口径恢复（见 `MemberPossibleUtil.MemberParsedWhole`）；整段读完后才做产出断言。

```ts
const state = catalog.PossibleShapesComputeCache.GetState<MemberPossibleScan>(MemberPossibleUtil.CacheKey);
if (state === null || state.End < 0 || state.End >= state.CodeAt.length) {
  throw new Error("ConstructSignaturePossibleShape.BuildByIndex: 判定状态缺失");
}
const start = state.Start;
const end = state.CodeAt[state.End];
if (start < 0 || end < start) {
  return host;
}
const consumed:Array<Token> = host.Data.slice(start, end + 1);
let firstCode:Token | null = null;
for (const unit of consumed) {
  if (!unit.IsTriviaToken) {
    firstCode = unit;
    break;
  }
}
const modifierRecovery = firstCode !== null
  && (MemberPossibleUtil.TextOf(firstCode) === "abstract"
    || MemberPossibleUtil.TextOf(firstCode) === "readonly");
const basePos = MemberPossibleUtil.BasePos(host, start);
const builder = new TypeBuilder(host.Template, context);
builder.Load(consumed, basePos);
const built = builder.ParseTypeMember();
if (!MemberPossibleUtil.MemberParsedWhole(builder, consumed.length)) {
  return host;
}
const isConstruct = built instanceof ConstructSignatureShape;
const isModifierMethodRecovery = modifierRecovery && built instanceof MethodSignatureShape;
if (!isConstruct && !isModifierMethodRecovery) {
  throw new Error("ConstructSignaturePossibleShape.BuildByIndex: 产出不是 ConstructSignatureShape");
}host.Data.splice(start, consumed.length, built);
built.Parent = host;
return built;
```
