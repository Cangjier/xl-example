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
import { CaseBlockShape } from "./case-block-shape.xl.md"
import { ControlStatementShape } from "./control-statement-shape.xl.md"
```

# namespace cangjie

# class CaseBlockEndPossibleShape extends PossibleShape

CaseBlock 的 `}`：收口整块，再收口它所属的 switch 语句。

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
const block = host as CaseBlockShape;
const parent = block.Parent;
block.SourceRange.End = close.SourceRange.End;
block.EndedByBrace = true;
block.TryToClose(context);
block.Quit();
if (parent instanceof ControlStatementShape) {
  parent.SourceRange.End = close.SourceRange.End;
  parent.TryToClose(context);
  parent.Quit();
}
return close;
```
