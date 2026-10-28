# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { OperandUtil } from "../expressions/operand-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { ControlStatementShape } from "./control-statement-shape.xl.md"
import { ControlBodyPossibleShape } from "./control-body-possible-shape.xl.md"
```

# namespace cangjie

# class ConditionPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (!(unit instanceof Bracket)) {
  return ShapeStates.Reject;
}
if (!unit.Closed) {
  return ShapeStates.Uncertain;
}
if (!unit.Is("(", ")")) {
  return ShapeStates.Reject;
}
const codeIndex = ConditionPossibleShape.OnlyCodeIndex(unit);
if (codeIndex < 0) {
  return ShapeStates.Reject;
}
const code = unit.Data[codeIndex];
return code instanceof Common && OperandUtil.CanStartExpression(code)
  ? ShapeStates.Accept
  : ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Bracket) || !unit.Closed || !unit.Is("(", ")")) {
  return false;
}
const codeIndex = ConditionPossibleShape.OnlyCodeIndex(unit);
if (codeIndex < 0) {
  return false;
}
const code = unit.Data[codeIndex];
return code instanceof Common && OperandUtil.CanStartExpression(code);
```

## static method OnlyCodeIndex:(bracket:Bracket)=>int

```ts
let codeIndex = -1;
for (let at = 0; at < bracket.Data.length; at++) {
  if (bracket.Data[at].IsTriviaToken) {
    continue;
  }
  if (codeIndex >= 0) {
    return -1;
  }
  codeIndex = at;
}
return codeIndex;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const bracket = units[tokenIndex] as Bracket;
const codeIndex = ConditionPossibleShape.OnlyCodeIndex(bracket);
const common = bracket.Data[codeIndex] as Common;
if (!common.Closed) {
  common.TryToClose(context);
}
const operand = OperandUtil.FromCommon(common, ItemUtil.PositionOf(bracket.Data, codeIndex));
const control = host as ControlStatementShape;
control.Condition = operand;
units.splice(tokenIndex, 1, operand);
operand.Parent = host;
control.CatalogGuide = new CatalogGuide([new ControlBodyPossibleShape()], null);
host.MountedUnit = null;
return operand;
```
