# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { IfStatementShape } from "../statements/if-statement-shape.xl.md"
import { BracketOperandPossibleShape } from "./bracket-operand-possible-shape.xl.md"
import { BracketOperatorPossibleShape } from "./bracket-operator-possible-shape.xl.md"
import { ConditionBracketCloseDispatch } from "./condition-bracket-close-dispatch.xl.md"
```

# namespace cangjie

# class ConditionBracketCreatePossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (source !== PossibleSource.BracketCreate) {
  return ShapeStates.Reject;
}
if (!(host instanceof IfStatementShape) || host.Condition !== null) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (!(unit instanceof Bracket) || !unit.Is("(", ")")) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
return unit instanceof Bracket && unit.Is("(", ")");
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const bracket = units[tokenIndex] as Bracket;
bracket.Role = "if-condition";
bracket.CatalogGuide = new CatalogGuide([
  new BracketOperandPossibleShape(),
  new BracketOperatorPossibleShape(),
], null);
bracket.HandleCloseDispatch = ConditionBracketCloseDispatch.Dispatch;
const statement = host as IfStatementShape;
statement.CatalogGuide = null;
statement.MountedUnit = bracket;
return bracket;
```
