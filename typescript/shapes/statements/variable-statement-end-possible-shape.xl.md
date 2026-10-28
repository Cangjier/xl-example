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
import { VariableStatementShape } from "./variable-statement-shape.xl.md"
```

# namespace cangjie

# class VariableStatementEndPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const unit = units[tokenIndex];
if (unit instanceof Symbol && unit.Closed && unit.Is(";")) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
return unit instanceof Symbol && unit.Closed && unit.Is(";");
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const semicolon = units[tokenIndex] as Symbol;
const previousIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
const declarationEnd = previousIndex >= 0 ? units[previousIndex].SourceRange.End : semicolon.SourceRange.Start;
// VariableDeclaration 不含 `;`；VariableStatement 含 `;`（与 TS 一致）。
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
return semicolon;
```
