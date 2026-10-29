# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { OperandUtil } from "../expressions/operand-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { ForHeadShape } from "./for-head-shape.xl.md"
import { ForClosePossibleShape } from "./for-close-possible-shape.xl.md"
```

# namespace cangjie

# class ForSourcePossibleShape extends PossibleShape

`of` / `in` 之后的被迭代表达式（当前接一个操作数，二元式留给后续扩展）。

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof ForHeadShape) || host.Mode === "" || host.Right !== null) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (!(unit instanceof Common)) {
  return ShapeStates.Reject;
}
if (!unit.Closed) {
  return ShapeStates.Uncertain;
}
if (!OperandUtil.CanStartExpression(unit)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
return unit instanceof Common && unit.Closed && OperandUtil.CanStartExpression(unit);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const head = host as ForHeadShape;
const common = head.Data[tokenIndex] as Common;
const operand = OperandUtil.FromCommon(common, ItemUtil.PositionOf(head.Data, tokenIndex));
head.Data.splice(tokenIndex, 1, operand);
operand.Parent = head;
head.Right = operand;
head.CatalogGuide = new CatalogGuide([new ForClosePossibleShape()], null);
head.MountedUnit = null;
return operand;
```
