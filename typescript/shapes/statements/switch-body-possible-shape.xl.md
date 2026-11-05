# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { CaseBlockShape } from "./case-block-shape.xl.md"
import { CaseKeywordPossibleShape } from "./case-keyword-possible-shape.xl.md"
import { DefaultKeywordPossibleShape } from "./default-keyword-possible-shape.xl.md"
import { CaseBlockEndPossibleShape } from "./case-block-end-possible-shape.xl.md"
import { SwitchStatementShape } from "./switch-statement-shape.xl.md"
import { TokenIndex } from "../../../core/syntax/token-index.xl.md"
```

# namespace cangjie

# class SwitchBodyPossibleShape extends PossibleShape


## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = index.At(tokenIndex);
if (!(unit instanceof Symbol) || !unit.Closed) {
  return ShapeStates.Reject;
}
if (!unit.Is("{")) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
if (tokenIndex < 0 || tokenIndex >= units.length) {
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
const block = CaseBlockShape.FromOpen(open, ItemUtil.PositionOf(units, tokenIndex));
block.CatalogGuide = new CatalogGuide(
  [new CaseKeywordPossibleShape(), new DefaultKeywordPossibleShape(), new CaseBlockEndPossibleShape()],
  null,
);
units.splice(tokenIndex, 1, block);
block.Parent = host;
(host as SwitchStatementShape).CaseBlock = block;
host.MountedUnit = block;
return this.StampCreated(block, context);
```
