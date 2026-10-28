# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { StatementUtil } from "./statement-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { BlockShape } from "./block-shape.xl.md"
```

# namespace cangjie

# class BlockPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
const start = StatementUtil.StartIndex(units);
if (start >= units.length || tokenIndex < start || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
// 当前语句的第一个代码单元就是那个 `{ }`。
if (tokenIndex !== start) {
  return ShapeStates.Reject;
}
if (!(unit instanceof Bracket)) {
  return ShapeStates.Reject;
}
if (!unit.Closed) {
  return ShapeStates.Uncertain;
}
if (BlockPossibleShape.IsEmptyBlock(unit as Bracket)) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex !== units.length - 1) {
  return false;
}
const start = StatementUtil.StartIndex(units);
if (tokenIndex !== start) {
  return false;
}
const unit = units[tokenIndex];
return unit instanceof Bracket && unit.Closed && BlockPossibleShape.IsEmptyBlock(unit as Bracket);
```

## static method IsEmptyBlock:(bracket:Bracket)=>bool

```ts
if (!bracket.Is("{", "}")) {
  return false;
}
for (const item of bracket.Data) {
  if (!item.IsTriviaToken) {
    return false;
  }
}
return true;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const bracket = units[tokenIndex] as Bracket;
const shape = BlockShape.FromBracket(bracket, ItemUtil.PositionOf(units, tokenIndex));
bracket.Replace(shape);
host.MountedUnit = null;
return shape;
```
