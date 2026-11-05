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
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { BlockShape } from "./block-shape.xl.md"
import { CatchClauseShape } from "./catch-clause-shape.xl.md"
import { CatchKeywordPossibleShape } from "./catch-keyword-possible-shape.xl.md"
import { FinallyKeywordPossibleShape } from "./finally-keyword-possible-shape.xl.md"
import { TryStatementEndPossibleShape } from "./try-statement-end-possible-shape.xl.md"
import { TryStatementShape } from "./try-statement-shape.xl.md"
```

# namespace cangjie

# class CatchBlockEndPossibleShape extends PossibleShape


## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const unit = index.At(tokenIndex);
if (unit instanceof Symbol && unit.Closed && unit.Is("}")) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = index.At(tokenIndex);
return unit instanceof Symbol && unit.Closed && unit.Is("}");
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
const close = index.At(tokenIndex) as Symbol;
const block = host as BlockShape;
const clause = block.Parent;
block.SourceRange.End = close.SourceRange.End;
block.EndedByBrace = true;
block.TryToClose(context);
block.Quit();
if (!(clause instanceof CatchClauseShape)) {
  return this.StampCreated(close, context);
}
clause.SourceRange.End = close.SourceRange.End;
clause.TryToClose(context);
clause.Quit();
const statement = clause.Parent;
if (!(statement instanceof TryStatementShape)) {
  return this.StampCreated(close, context);
}
statement.CatalogGuide = new CatalogGuide(
  [new CatchKeywordPossibleShape(), new FinallyKeywordPossibleShape()],
  new TryStatementEndPossibleShape(),
);
statement.MountedUnit = null;
return this.StampCreated(close, context);
```
