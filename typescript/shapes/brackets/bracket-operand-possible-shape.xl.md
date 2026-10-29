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
import { BinaryExpressionShape } from "../expressions/binary-expression-shape.xl.md"
import { BinaryOperatorTokenShape } from "../punctuation/binary-operator-token-shape.xl.md"
```

# namespace cangjie

# class BracketOperandPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (!(unit instanceof Common) || !unit.Closed || !OperandUtil.CanStartExpression(unit)) {
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
return unit instanceof Common && unit.Closed && OperandUtil.CanStartExpression(unit);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const bracket = host as Bracket;
const units = bracket.Data;
const common = units[tokenIndex] as Common;
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
      return operand;
    }
    break;
  }
}
units.splice(tokenIndex, 1, operand);
operand.Parent = bracket;
return operand;
```

