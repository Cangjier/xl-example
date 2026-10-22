# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { CallSignatureShape } from "./call-signature-shape.xl.md"
import { MemberPossibleScan } from "./property-signature-possible-shape.xl.md"
import { MemberPossibleUtil } from "./property-signature-possible-shape.xl.md"
import { TypeBuilder } from "./type-builder.xl.md"
```

# namespace cangjie

# class CallSignaturePossibleShape extends PossibleShape

```txt
interface I { (): A; }
interface I { (a: A, b?: B): C }
interface I { <T>(x: T): U }
interface I { (...rest: A[]): B }
interface I { a: A; (): B }
```

对象类型里的**调用签名**候选：以 `(` 括号或 `<` 符号开头的成员（`(): A` / `(a: A, b?: B): C` / `<T>(x: T): U` / rest 参数 / 无参 / 可选参数 / 换行与逗号分隔 / 与属性签名混排）。

判型完全交给共享工具：`MemberPossibleUtil.ClassifyHead` 看到首个代码单元是 `(` 括号或文本 `<` 就只留 `CallKind`，看到 `new` 就只留构造签名、看到名字就只留属性 / 方法，所以本候选只需要读共享扫描状态——可能种类里没有 `CallKind` 就 `Reject`，成员收住了就 `Accept`。

**调用签名与构造签名的分界**（见 `docs/member-possible-design.md` §2）：`(` / `<` 开头是调用签名；`new` 后跟 `(` 或 `<` 才是构造签名（换行不影响）。`new` 后面不是 `(` / `<` 时 `new` 只是成员名，属于属性签名。这三个分支在 `ClassifyHead` 里互斥，本候选不需要自己看 `new`。

判定与建形状分离：`ComputeByIndex` 不建形状、不跑 `TypeBuilder`；消费范围由共享扫描状态的 `End` 给出（含成员自己的 `;` / `,`，不含尾部 trivia），`BuildByIndex` 才用 `TypeBuilder.ParseTypeMember()` 建一次形状，并断言产出的是 `CallSignatureShape`。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

只读共享扫描结论：可能种类里没有 `CallKind` 就 `Reject`；收住了就 `Accept`；其余 `Uncertain`（继续等后面的单元）。

空条目 / 纯 trivia / 纯分隔符在共享扫描里是 `AllKinds` + 未收住 ⇒ `Uncertain`，等容器收口时由 `CollectBodyMembers` 兜底，这里不会提前下结论。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const state = MemberPossibleUtil.Scan(units, tokenIndex, cache);
if (!MemberPossibleUtil.HasKind(state.Kinds, MemberPossibleUtil.CallKind)) {
  return ShapeStates.Reject;
}
if (state.Complete) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

收住了才建：`;` / `,` / 下一个成员起点 / 容器收口，三选一的证据在共享扫描的 `Analyze` 里已经算好。`ComputeByIndex` 的 `Accept` 与这里同源，但目录只在**只剩一个候选**时问 `IsBuildable`，所以这里必须再核一遍 `Complete` 与 `CallKind`，否则单独裁剪到本候选时会在参数表关闭的那一刻提前建形状、把成员边界切错。

```ts
const state = cache.GetState<MemberPossibleScan>(MemberPossibleUtil.CacheKey);
if (state === null) {
  return false;
}
return state.Complete && state.End >= 0
  && MemberPossibleUtil.HasKind(state.Kinds, MemberPossibleUtil.CallKind);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

消费 `state.Start .. CodeAt[state.End]` 这一段（含成员自己的 `;` / `,`），用 `TypeBuilder.ParseTypeMember()` 建出调用签名，然后 `host.Data.splice(start, consumed, shape)` 原地顶替。

成员区间尾部的 trivia 不属于成员：`splice` 只吃到最后一个代码单元（注释 / 换行由 `splice` 天然留在原处，下一条目的 `Pos` 由 `BasePos` 按「前一个非 trivia 单元」重新算）。

`ParseTypeMember` 对 `(` 开头与 `<` 开头两条路径都产出 `CallSignatureShape`：前者是普通调用签名，后者是泛型调用签名（`<T>(x: T): U`，类型参数进 `CallSignature` 的 children）。成员读完、消费范围一致、产出类型正确，三者任一不成立直接抛错——宁可红，不可静默切错边界。

```ts
const state = catalog.PossibleShapesComputeCache.GetState<MemberPossibleScan>(MemberPossibleUtil.CacheKey);
if (state === null || state.End < 0 || state.End >= state.CodeAt.length) {
  throw new Error("CallSignaturePossibleShape.BuildByIndex: 判定状态缺失");
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
if (!(built instanceof CallSignatureShape)) {
  throw new Error("CallSignaturePossibleShape.BuildByIndex: 产出不是 CallSignatureShape");
}
if (builder.At !== builder.Units.length) {
  throw new Error("CallSignaturePossibleShape.BuildByIndex: 成员没有读完");
}
if (builder.OriginalConsumed() !== consumed.length) {
  throw new Error("CallSignaturePossibleShape.BuildByIndex: 消费范围与判定不一致");
}
host.Data.splice(start, consumed.length, built);
built.Parent = host;
return built;
```
