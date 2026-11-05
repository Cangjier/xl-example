# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { TokenIndex } from "../../../core/syntax/token-index.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { StatementUtil } from "./statement-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { BlockShape } from "./block-shape.xl.md"
import { BlockEndPossibleShape } from "./block-end-possible-shape.xl.md"
import { StatementGuide } from "./statement-guide.xl.md"
```

# namespace cangjie

# class BlockPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
const start = StatementUtil.StartIndex(units, tokenIndex, cache);
if (start >= units.length || tokenIndex < start || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = index.At(tokenIndex);
if (tokenIndex !== start) {
  return ShapeStates.Reject;
}
if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is("{")) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
if (tokenIndex !== units.length - 1) {
  return false;
}
const start = StatementUtil.StartIndex(units, tokenIndex, cache);
if (tokenIndex !== start) {
  return false;
}
const unit = index.At(tokenIndex);
return unit instanceof Symbol && unit.Closed && unit.Is("{");
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
const open = index.At(tokenIndex) as Symbol;
const shape = BlockShape.FromOpen(open, ItemUtil.PositionOf(units, tokenIndex));
shape.CatalogGuide = StatementGuide.Create(new BlockEndPossibleShape(), [new BlockPossibleShape()]);
units.splice(tokenIndex, 1, shape);
shape.Parent = host;
host.MountedUnit = shape;
return this.StampCreated(shape, context);
```
