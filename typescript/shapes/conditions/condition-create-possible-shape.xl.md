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
import { IfStatementShape } from "../statements/if-statement-shape.xl.md"
import { ConditionShape } from "./condition-shape.xl.md"
import { ConditionOperandPossibleShape } from "./condition-operand-possible-shape.xl.md"
import { ConditionOperatorPossibleShape } from "./condition-operator-possible-shape.xl.md"
import { ConditionEndPossibleShape } from "./condition-end-possible-shape.xl.md"
```

# namespace cangjie

# class ConditionCreatePossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof IfStatementShape) || host.Condition !== null) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is("(")) {
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
return unit instanceof Symbol && unit.Closed && unit.Is("(");
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const open = units[tokenIndex] as Symbol;
const condition = new ConditionShape(host.Template);
condition.Pos = ItemUtil.PositionOf(units, tokenIndex);
condition.SignIn(open.SourceRange.Start);
condition.SignOut(open.SourceRange.End);
condition.CatalogGuide = new CatalogGuide(
  [new ConditionOperandPossibleShape(), new ConditionOperatorPossibleShape()],
  new ConditionEndPossibleShape(),
);
units.splice(tokenIndex, 1, condition);
condition.Parent = host;
(host as IfStatementShape).CatalogGuide = null;
host.MountedUnit = condition;
return condition;
```
