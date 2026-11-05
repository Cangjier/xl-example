# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { TokenIndex } from "../../../core/syntax/token-index.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { StatementUtil } from "./statement-util.xl.md"
import { BreakStatementShape } from "./break-statement-shape.xl.md"
import { StatementEndPossibleShape } from "./statement-end-possible-shape.xl.md"
```

# namespace cangjie

# class BreakStatementPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
const start = StatementUtil.StartIndex(units, tokenIndex, cache);
if (tokenIndex < start) {
  return ShapeStates.Uncertain;
}
const unit = index.At(tokenIndex);
if (!(unit instanceof Common)) {
  return ShapeStates.Reject;
}
if (!unit.Closed) {
  return ShapeStates.Uncertain;
}
if (tokenIndex !== start || unit.TempToString() !== "break") {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
const start = StatementUtil.StartIndex(units, tokenIndex, cache);
if (tokenIndex !== start || tokenIndex !== units.length - 1) {
  return false;
}
const unit = index.At(tokenIndex);
return unit instanceof Common && unit.Closed && unit.TempToString() === "break";
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
const keyword = index.At(tokenIndex) as Common;
const shape = new BreakStatementShape(host.Template);
shape.Pos = ItemUtil.PositionOf(units, tokenIndex);
shape.SignIn(keyword.SourceRange.Start);
shape.CatalogGuide = new CatalogGuide([new StatementEndPossibleShape()], null);
units.splice(tokenIndex, 1, shape);
shape.Parent = host;
host.MountedUnit = shape;
return this.StampCreated(shape, context);
```
