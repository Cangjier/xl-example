# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class FeasOperandPossibleShape extends PossibleShape

可行性原型的**操作数候选**：只回答「这一格能不能起一个操作数」。判定是单格 O(1)（不扫描前缀，所以不需要 `PossibleShapeCache` 的进度状态）。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (unit instanceof Bracket) {
  if ((unit as Bracket).StartBracketChar === "(") {
    return ShapeStates.Accept;
  }
  return ShapeStates.Reject;
}
if (unit instanceof Common) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

原型用 `FeasOperatorParser` 直接按单元序列增量建形状（见该文件）；本候选在原型里只承担判型职责，接入 `CatalogGuide` 后的建法见 `HANDOFF.md` 的集成说明。

```ts
throw new Error("FeasOperandPossibleShape.BuildByIndex: 原型由 FeasOperatorParser 增量建形状");
```
