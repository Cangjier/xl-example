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
import { DoWhileKeywordPossibleShape } from "./do-while-keyword-possible-shape.xl.md"
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
  return this.StampCreated(semicolon, context);
}
// body 收口：`if` 等 `else`、`do` 等 `while`、`while`/`for` 直接收口。
// 收口链可能把更外层的 if 交回来说「它还在等 `else`」
// （`if (a) if (b) c; else d; else e;` 里内层吃掉了第一个 `else`，外层还在等下一个）。
const waiting = ControlStatementShape.BodyClosed(control, host, semicolon.SourceRange.End, context);
if (waiting !== null) {
  if ((waiting as ControlStatementShape).Kind === "do") {
    DoWhileKeywordPossibleShape.Arm(waiting as ControlStatementShape);
  } else {
    ControlElsePossibleShape.Arm(waiting as ControlStatementShape);
  }
}
return this.StampCreated(semicolon, context);
```
