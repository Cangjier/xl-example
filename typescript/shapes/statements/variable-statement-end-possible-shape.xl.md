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
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { VariableStatementShape } from "./variable-statement-shape.xl.md"
```

# namespace cangjie

# class VariableStatementEndPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const unit = index.At(tokenIndex);
if (unit instanceof Symbol && unit.Closed && unit.Is(";")) {
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
return unit instanceof Symbol && unit.Closed && unit.Is(";");
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
const semicolon = index.At(tokenIndex) as Symbol;
const previousIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
const declarationEnd = previousIndex >= 0 ? units[previousIndex].SourceRange.End : semicolon.SourceRange.Start;
host.SourceRange.End = declarationEnd;
host.TryToClose(context);
const list = host.Parent;
host.Quit();
if (list !== null) {
  list.SourceRange.End = declarationEnd;
  list.TryToClose(context);
  const statement = list.Parent;
  list.Quit();
  if (statement !== null) {
    statement.SourceRange.End = semicolon.SourceRange.End;
    (statement as VariableStatementShape).EndsWithSemicolon = true;
    statement.TryToClose(context);
    statement.Quit();
  }
}
return this.StampCreated(semicolon, context);
```
