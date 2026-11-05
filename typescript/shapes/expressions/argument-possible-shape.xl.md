# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { TokenIndex } from "../../../core/syntax/token-index.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { OperandUtil } from "./operand-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
```

# namespace cangjie

# class ArgumentPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = index.At(tokenIndex);
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (unit instanceof Symbol) {
  if (unit.Closed && unit.Is(",")) {
    return ShapeStates.Uncertain;
  }
  return ShapeStates.Reject;
}
if (!(unit instanceof Common)) {
  return ShapeStates.Uncertain;
}
if (!unit.Closed) {
  return ShapeStates.Uncertain;
}
if (ArgumentPossibleShape.ShouldBuild(units, tokenIndex)) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
return ArgumentPossibleShape.ShouldBuild(units, tokenIndex);
```

## static method ShouldBuild:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length || tokenIndex !== units.length - 1) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Common) || !unit.Closed) {
  return false;
}
const prevIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (prevIndex < 0) {
  return false;
}
if (prevIndex === 0) {
  return true;
}
const prev = units[prevIndex];
return prev instanceof Symbol && prev.Closed && prev.Is(",");
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
const common = index.At(tokenIndex) as Common;
const pos = OperandUtil.PositionOf(units, tokenIndex);
const operand = OperandUtil.FromCommon(common, pos);
common.Replace(operand);
return this.StampCreated(operand, context);
```
