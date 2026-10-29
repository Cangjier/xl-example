# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { BlockShape } from "./block-shape.xl.md"
import { CatchClauseShape } from "./catch-clause-shape.xl.md"
import { FinallyKeywordPossibleShape } from "./finally-keyword-possible-shape.xl.md"
import { ControlStatementShape } from "./control-statement-shape.xl.md"
import { TryStatementShape } from "./try-statement-shape.xl.md"
```

# namespace cangjie

# class CatchBlockEndPossibleShape extends PossibleShape

`catch` 块的 `}`：收口块 → 收口 CatchClause → 再看 `finally` 或直接收口 TryStatement。

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const unit = units[tokenIndex];
if (unit instanceof Symbol && unit.Closed && unit.Is("}")) {
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
return unit instanceof Symbol && unit.Closed && unit.Is("}");
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const close = host.Data[tokenIndex] as Symbol;
const block = host as BlockShape;
const clause = block.Parent;
block.SourceRange.End = close.SourceRange.End;
block.EndedByBrace = true;
block.TryToClose(context);
block.Quit();
if (!(clause instanceof CatchClauseShape)) {
  return close;
}
clause.SourceRange.End = close.SourceRange.End;
clause.TryToClose(context);
clause.Quit();
const statement = clause.Parent;
if (!(statement instanceof TryStatementShape)) {
  return close;
}
if (ControlStatementShape.IsWordAhead(context, close.SourceRange.End, "finally")) {
  FinallyKeywordPossibleShape.Arm(statement);
} else {
  TryStatementShape.Finish(statement, context);
}
return close;
```
