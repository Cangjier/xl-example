# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ClassMemberPossibleUtil } from "./class-member-possible-util.xl.md"
```

# namespace cangjie

# class ClassMemberCatchAllPossibleShape extends PossibleShape

```txt
class C { constructor() {} }
          ^ 本阶段还没有构造候选：这一条必须安全地留在 raw 里
```

类体成员目录的**安全兜底**。`CatalogGuide` 在「候选 0 个且没有终结候选」时直接抛错（`catalog-guide.xl.md`），
而类体括号上的目录**没有终结候选**（终结候选在壳上）。所以只要还有一类成员没有候选（T6b 只做了属性与方法），
就必须有一个永不退出的候选占着目录，让「没认出的成员」安静地留在 raw basic token 里，由壳收口时
`CollectBodyMembers` 的 raw 尾巴交给 `ClassDeclarationShape.BuildMembers` 逐成员解析——AST 与基线逐节点一致。

**判型全函数性**：`Kinds` 永不为空（`ClassMemberPossibleUtil` 对判不清的形态返回 `AllKinds()`），
本候选也从不因为「这一格长什么样」而退出。

**唯一的退出条件**：共享扫描已经**收住**、且 `Kinds` 全部落在 `ClassMemberPossibleUtil.ImplementedKinds()`
（本阶段：属性 / 方法 / 孤立 `;`）里——这时真正的候选会在这同一格 `Accept` 并被建出来（`CatalogGuide` 只在
只剩一个候选时建），本候选必须让开；否则目录永远到不了「唯一候选」，已实现的成员就永远建不出来，本段的增量构建
等于没做。**其余任何时候都返回 `Uncertain`**：构造 / 访问器 / static 块 / 索引签名 / 未知形态 / 未收住的条目，
全部由本候选占位，raw 兜底。

`IsBuildable` 恒为 `false`：本候选**永远不建任何形状**。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

只读共享扫描结论：收住且已定死是属性 / 方法时 `Reject`（让给真正的候选），其余一律 `Uncertain`。

`Kinds` 为空数组（理论上不会出现）也返回 `Uncertain`——宁可让目录多等，也不能让候选集归零。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const state = ClassMemberPossibleUtil.Scan(units, tokenIndex, cache);
if (!state.Complete || state.Kinds.length === 0) {
  return ShapeStates.Uncertain;
}
for (const kind of state.Kinds) {
  if (!ClassMemberPossibleUtil.HasKind(ClassMemberPossibleUtil.ImplementedKinds(), kind)) {
    return ShapeStates.Uncertain;
  }
}
return ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

恒 `false`：兜底候选只占位，不建形状。

```ts
return false;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

不会被调用（`IsBuildable` 恒 `false`，且本候选被选中时说明扫描结论自相矛盾）；一旦被调用就是判型 bug，直接抛错。

```ts
throw new Error("ClassMemberCatchAllPossibleShape.BuildByIndex: 兜底候选不应被建");
```
