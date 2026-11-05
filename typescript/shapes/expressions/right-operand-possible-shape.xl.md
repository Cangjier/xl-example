# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { TokenIndex } from "../../../core/syntax/token-index.xl.md"
import { OperandUtil } from "./operand-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { NumericLiteralShape } from "../literals/numeric-literal-shape.xl.md"
import { BinaryOperatorTokenShape } from "../punctuation/binary-operator-token-shape.xl.md"
```

# namespace cangjie

# class RightOperandPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = index.At(tokenIndex);
if (unit instanceof NumericLiteralShape || unit instanceof IdentifierShape || unit instanceof Symbol) {
  return ShapeStates.Reject;
}
if (unit instanceof Common && unit.Closed && tokenIndex === units.length - 1) {
  if (RightOperandPossibleShape.IsWaitingForOperand(units, tokenIndex)) {
    return ShapeStates.Accept;
  }
  return ShapeStates.Reject;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
if (tokenIndex !== units.length - 1) {
  return false;
}
const unit = index.At(tokenIndex);
return unit instanceof Common && unit.Closed && RightOperandPossibleShape.IsWaitingForOperand(units, tokenIndex);
```

## static method IsWaitingForOperand:(units:Array<Token>, tokenIndex:int)=>bool

```ts
const head = units[tokenIndex];
if (head instanceof Common && head.Closed) {
  const text = head.TempToString();
  if (text === "typeof" || text === "void" || text === "delete") {
    return false;
  }
}
for (let at = tokenIndex - 1; at >= 0; at--) {
  const item = units[at];
  if (item.IsTriviaToken || item.IsBasicToken) {
    continue;
  }
  return item instanceof BinaryOperatorTokenShape;
}
return false;
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
const common = index.At(tokenIndex) as Common;
const operand = OperandUtil.FromCommon(common, OperandUtil.PositionOf(units, tokenIndex));
common.Replace(operand);
return this.StampCreated(operand, context);
```
