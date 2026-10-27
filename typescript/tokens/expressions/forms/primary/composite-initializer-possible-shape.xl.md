# dependencies
```xl
import { PossibleSource } from "../../../../../core/syntax/possible-source.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { CompositeInitializerJudge } from "./composite-initializer-judge.xl.md"
```

# namespace cangjie

# class CompositeInitializerPossibleShape extends PossibleShape

**A4 对象字面量初始化器候选**（`{...}` 作为整个初始化器）。数组 `[...]` 不在本变更范围
（`let x = [1] as const` 在 `]` 关闭处不可区分，交接见 `_coord/REPORT-all-possible-A4.md`）。

判据、建树都在 `CompositeInitializerJudge`（与声明终结候选共用同一份实现，避免两处口径漂移）。
本类只做三件事：什么时候接管（`ComputeByIndex`）、现在能不能建（`IsBuildable`）、建（`BuildByIndex`）。

**为什么不会碰别的形态**：`ComputeByIndex` 只在「`=` 之后恰好只剩一只 `[...]` / `{...}` 括号」时
`Accept`，其余一律 `Reject`——`a[0]` / `[1] as const` / 函数式 / 箭头 / 圆括号都不接管
（它们要么在括号前还有单元，要么括号之后还有单元）。

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

注册区入口（`ExpressionShapeCatalog.AppendFragments`，锚点 `// [E-CAT:FRAGMENTS]`）：只追加本候选一个实例。

```ts
shapes.push(new CompositeInitializerPossibleShape());
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

- 越界 / trivia → `Uncertain`（E0b 实测约束 1：`=` 与 trivia 必须保持存活，`Reject` 在本条目内永不回来）；
- `Symbol("=")` → `Uncertain`（初始化器还没开始，目录整体等待）；
- 本 WP 的形态（`CompositeInitializerJudge.Claims`）→ `Accept`；
- 其它 → `Reject`。

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
if (!CompositeInitializerJudge.Claims(units)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

括号自己**已经关闭**（`Closed` 或区间已签出）才是完整形态；未关闭时返回 `false` 让目录继续等。

```ts
const target = CompositeInitializerJudge.SoleCompositeUnit(units);
if (target === null) {
  return false;
}
if (target.Closed) {
  return true;
}
return target.SourceRange.EndIndex >= 0;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

整棵建出并原位替换括号（实现见 `CompositeInitializerJudge.Build`）。

```ts
return CompositeInitializerJudge.Build(host, context);
```
