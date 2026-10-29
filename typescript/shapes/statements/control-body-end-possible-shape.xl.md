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
import { ControlStatementShape } from "./control-statement-shape.xl.md"
import { ControlElsePossibleShape } from "./control-else-possible-shape.xl.md"
import { ExpressionStatementShape } from "./expression-statement-shape.xl.md"
```

# namespace cangjie

# class ControlBodyEndPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
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
const semicolon = host.Data[tokenIndex] as Symbol;
host.SourceRange.End = semicolon.SourceRange.End;
(host as ExpressionStatementShape).EndsWithSemicolon = true;
host.TryToClose(context);
const control = host.Parent;
host.Quit();
if (!(control instanceof ControlStatementShape)) {
  return semicolon;
}
if (control.ElseBody === host) {
  // else 分支结束就是整条 if 结束（`else` 之后不可能再有 `else`）。
  ControlStatementShape.CloseChain(control, context);
  return semicolon;
}
// then 分支结束：后面还有 `else` 就先把控制语句留着，等 `else` 自己建；
// 否则按原样连控制语句一起收口。
if (ControlStatementShape.IsElseAhead(context, semicolon.SourceRange.End)) {
  control.CatalogGuide = new CatalogGuide([new ControlElsePossibleShape()], null);
  return semicolon;
}
ControlStatementShape.CloseChain(control, context);
return semicolon;
```
