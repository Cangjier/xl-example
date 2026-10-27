# dependencies
```xl
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { CompositeInitializerTailJudge } from "./composite-initializer-tail-judge.xl.md"
```

# namespace cangjie

# class CompositeInitializerTailPossibleShape extends PossibleShape

**A4c 尾形候选**：`<T>y`（尖括号断言）/ `<T>(a: T) => a`（泛型箭头）/ `[1] as const`（数组 + as 断言）。

与 A4b 的 `CompositeInitializerFormsPossibleShape` 并列注册；两族**互斥**：A4b 的 `Family` 不认 `<` 起首，
也不认「`]` 之后紧跟 `as`/`satisfies`」的数组（A4b 文件里已加这条排除，避免两边同时存活）。

判据与建树都在 `CompositeInitializerTailJudge`（与声明终结候选共用同一份实现）。

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

注册区入口（`ExpressionShapeCatalog.AppendFragments`，锚点 `// [E-CAT:FRAGMENTS]`）：只追加本候选一个实例。

```ts
shapes.push(new CompositeInitializerTailPossibleShape());
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

- 越界 / trivia → `Uncertain`（`=` 与 trivia 必须保持存活，`Reject` 在本条目内永不回来）；
- `Symbol("=")` → `Uncertain`（初始化器还没开始）；
- 族不命中（`Family === ""`）→ `Reject`（不是本 WP 的初始化器）；
- 族命中 → `Accept`（真正能不能建由 `IsBuildable` 判）。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (unit instanceof Symbol && (unit as Symbol).Is("=")) {
  return ShapeStates.Uncertain;
}
if (CompositeInitializerTailJudge.Family(units) === "") {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

`CanBuild` 为真才建（族命中 + legacy `ExpressionBuilder` 整段吃完 + 之后只剩输入结束）。
`PossibleShape` 没有模板字段，模板从 `context.Root` 取。

```ts
return CompositeInitializerTailJudge.CanBuild(units, context.Root.Template, context);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

整棵建出、替换 `=` 之后的全部 raw 单元（实现见 `CompositeInitializerTailJudge.Build`）。

```ts
return CompositeInitializerTailJudge.Build(host, context);
```
