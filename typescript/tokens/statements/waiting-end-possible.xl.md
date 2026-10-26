# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class WaitingEndPossible extends PossibleShape

**「永不 Accept」的终结候选：括号目录的承重件（B0）。**

`CatalogGuide.ComputePossibleShapesByIndex` 有两条抛错出口（`catalog-guide.xl.md:90-107`）：

1. 终结候选 `Accept` 而 `Candidates` 里还有候选 ⇒ 抛「终结候选与其它候选同时成立」；
2. 候选被全部 `Reject`（`Candidates.size === 0`）且 `EndPossible === null` ⇒ 抛「没有候选形状可以构成」。

**这两条出口都由「有没有一个永不 Accept 的终结候选」决定。** 本类就是那个终结候选：它永远返回
`ShapeStates.Uncertain`，于是：

- 出口 1 不可能触发——它永远不会 `Accept`；
- 出口 2 变成 `ComputePossibleShapesStates.Waiting`——候选全灭只是「这一格没东西可建」，
  括号里的 raw 单元保持原样，交给收口侧的 legacy 建造器，**不抛错、也不半建**。

这就是给括号挂 `CatalogGuide(possibles, WaitingEnd)` 的前提。缺了它，括号宿主在第一个 `,` / `:` /
`;` 上就会把候选全部剪光并抛错——`call-possible-shape.xl.md:54-63` 当初拒绝落实参目录，
正是因为没有这个构件（它只能补一个「也会 Accept」的终结候选，那会与实参候选同格双 Accept）。

**`BuildByIndex` 永不调用**：`CatalogGuide` 只在 `EndPossible` `Accept` 时才建它（`:97-101`），
本类永远不 `Accept`，所以那条路径不可达。写成抛错桩是为了让「谁来建我」当场炸，而不是静默返回 `null`。

[B0] 本类**没有任何开关、没有任何计数**：它只在被挂进某个 `CatalogGuide` 时起作用，
而挂它的唯一入口是 `BracketCatalogInstaller.Install`（`EnableBracketRoleCatalog=false` 时不装任何目录）。
所以它默认不参与任何一次解析。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

永远 `Uncertain`：不 `Accept`（不触发建树）、不 `Reject`（不参与候选淘汰，也不受 `Reject` 永久删除的影响）。

注意它**不是**「这一格还没长完」的意思，而是「这个目录的收口不由这一格决定」。命中格、还是末端格，
答案都一样；`Candidates` 的淘汰只发生在 `PossibleShapes` 里的候选身上。

```ts
return ShapeStates.Uncertain;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

不可达（见类注释）：`CatalogGuide` 只会为 `Accept` 的终结候选建树。真被调用说明有代码违反
「非 `Accept` 不建」的不变量，当场抛错而不是返回一个假单元。

```ts
throw new Error("WaitingEndPossible: 终结候选不应被建树（ComputeByIndex 永不 Accept）");
```
