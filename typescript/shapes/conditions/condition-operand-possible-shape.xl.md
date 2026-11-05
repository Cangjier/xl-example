# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { TokenIndex } from "../../../core/syntax/token-index.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { OperandUtil } from "../expressions/operand-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { BinaryExpressionShape } from "../expressions/binary-expression-shape.xl.md"
import { BinaryOperatorTokenShape } from "../punctuation/binary-operator-token-shape.xl.md"
```

# namespace cangjie

# class ConditionOperandPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = index.At(tokenIndex);
if (!(unit instanceof Common) || !unit.Closed || !OperandUtil.CanStartExpression(unit)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = index.At(tokenIndex);
return unit instanceof Common && unit.Closed && OperandUtil.CanStartExpression(unit);
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
const common = index.At(tokenIndex) as Common;
const operand = OperandUtil.FromCommon(common, ItemUtil.PositionOf(units, tokenIndex));
let root:Token | null = null;
for (const item of units) {
  if (!item.IsTriviaToken && !item.IsBasicToken) {
    root = item;
    break;
  }
}
if (root instanceof BinaryExpressionShape) {
  let cursor:BinaryExpressionShape = root;
  while (true) {
    let lastCode:Token | null = null;
    for (let at = cursor.Data.length - 1; at >= 0; at--) {
      if (!cursor.Data[at].IsTriviaToken && !cursor.Data[at].IsBasicToken) {
        lastCode = cursor.Data[at];
        break;
      }
    }
    if (lastCode instanceof BinaryExpressionShape) {
      cursor = lastCode;
      continue;
    }
    if (lastCode instanceof BinaryOperatorTokenShape) {
      units.splice(tokenIndex, 1);
      cursor.Add(operand);
      cursor.Closed = true;
      cursor.SourceRange.End = operand.SourceRange.End;
      let ancestor = cursor.Parent;
      while (ancestor instanceof BinaryExpressionShape) {
        ancestor.Closed = true;
        ancestor.SourceRange.End = operand.SourceRange.End;
        ancestor = ancestor.Parent;
      }
      return this.StampCreated(operand, context);
    }
    break;
  }
}
units.splice(tokenIndex, 1, operand);
operand.Parent = host;
return this.StampCreated(operand, context);
```
