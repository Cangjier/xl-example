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
import { ControlStatementShape } from "./control-statement-shape.xl.md"
import { ControlElsePossibleShape } from "./control-else-possible-shape.xl.md"
```

# namespace cangjie

# class BlockEndPossibleShape extends PossibleShape

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
if (!(parent instanceof ControlStatementShape)) {
  return close;
}
if (parent.ElseBody === block) {
  // else 分支的块收口就是整条 if 结束。
  ControlStatementShape.CloseChain(parent, context);
  return close;
}
// then 分支的块收口：`}` 后面还有 `else` 就先把控制语句留着。
if (ControlStatementShape.IsElseAhead(context, close.SourceRange.End)) {
  parent.CatalogGuide = new CatalogGuide([new ControlElsePossibleShape()], null);
  return close;
}
ControlStatementShape.CloseChain(parent, context);
return close;
```
