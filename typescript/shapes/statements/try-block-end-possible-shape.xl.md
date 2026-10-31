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
import { CatchKeywordPossibleShape } from "./catch-keyword-possible-shape.xl.md"
import { FinallyKeywordPossibleShape } from "./finally-keyword-possible-shape.xl.md"
import { ControlStatementShape } from "./control-statement-shape.xl.md"
import { TryStatementShape } from "./try-statement-shape.xl.md"
```

# namespace cangjie

# class TryBlockEndPossibleShape extends PossibleShape

`try` 块的 `}`：收口块之后按前瞻决定接 `catch`、`finally`，还是到此为止。

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
const parent = block.Parent;
block.SourceRange.End = close.SourceRange.End;
block.EndedByBrace = true;
block.TryToClose(context);
block.Quit();
if (!(parent instanceof TryStatementShape)) {
  return this.StampCreated(close, context);
}
if (ControlStatementShape.IsWordAhead(context, close.SourceRange.End, "catch")) {
  CatchKeywordPossibleShape.Arm(parent);
} else if (ControlStatementShape.IsWordAhead(context, close.SourceRange.End, "finally")) {
  FinallyKeywordPossibleShape.Arm(parent);
} else {
  TryStatementShape.Finish(parent, context);
}
return this.StampCreated(close, context);
```
