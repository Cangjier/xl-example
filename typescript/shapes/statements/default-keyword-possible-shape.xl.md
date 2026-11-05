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
import { CaseBlockShape } from "./case-block-shape.xl.md"
import { DefaultClauseShape } from "./default-clause-shape.xl.md"
import { CaseColonPossibleShape } from "./case-colon-possible-shape.xl.md"
```

# namespace cangjie

# class DefaultKeywordPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
if (!(host instanceof CaseBlockShape)) {
  return ShapeStates.Reject;
}
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
if (tokenIndex !== start || unit.TempToString() !== "default") {
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
return unit instanceof Common && unit.Closed && unit.TempToString() === "default";
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
const keyword = index.At(tokenIndex) as Common;
const clause = new DefaultClauseShape(host.Template);
clause.Pos = ItemUtil.PositionOf(units, tokenIndex);
clause.SignIn(keyword.SourceRange.Start);
clause.CatalogGuide = new CatalogGuide([new CaseColonPossibleShape()], null);
units.splice(tokenIndex, 1, clause);
clause.Parent = host;
host.MountedUnit = clause;
return this.StampCreated(clause, context);
```
