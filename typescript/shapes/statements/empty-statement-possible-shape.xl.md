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
import { EmptyStatementShape } from "./empty-statement-shape.xl.md"
```

# namespace cangjie

# class EmptyStatementPossibleShape extends PossibleShape

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
if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is(";")) {
  return ShapeStates.Reject;
}
if (ItemUtil.PreviousCode(units, tokenIndex - 1) >= start) {
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
const unit = index.At(tokenIndex);
return unit instanceof Symbol
  && unit.Closed
  && unit.Is(";")
  && ItemUtil.PreviousCode(units, tokenIndex - 1) < start;
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
const semicolon = index.At(tokenIndex) as Symbol;
const shape = EmptyStatementShape.FromSemicolon(semicolon, ItemUtil.PositionOf(units, tokenIndex));
semicolon.Replace(shape);
host.MountedUnit = null;
return this.StampCreated(shape, context);
```
