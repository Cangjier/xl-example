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
import { BinaryExpressionShape } from "../expressions/binary-expression-shape.xl.md"
import { BinaryExpressionPossibleShape } from "../expressions/binary-expression-possible-shape.xl.md"
import { BinaryOperatorTable } from "../expressions/binary-operator-table.xl.md"
```

# namespace cangjie

# class ConditionOperatorPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed || !BinaryOperatorTable.Contains(unit.TempToString())) {
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
return unit instanceof Symbol && unit.Closed && BinaryOperatorTable.Contains(unit.TempToString());
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const symbol = units[tokenIndex] as Symbol;
const info = BinaryOperatorTable.Find(symbol.TempToString());
if (info === null) {
  throw new Error("ConditionOperatorPossibleShape: 不支持的运算符 " + symbol.TempToString());
}
let root:Token | null = null;
for (const item of units) {
  if (!item.IsTriviaToken && !item.IsBasicToken) {
    root = item;
    break;
  }
}
if (root === null) {
  throw new Error("ConditionOperatorPossibleShape: 运算符前没有左操作数");
}
const operator = BinaryOperatorTable.Create(symbol, ItemUtil.PositionOf(units, tokenIndex));
if (root instanceof BinaryExpressionShape) {
  if (!root.Closed) {
    throw new Error("ConditionOperatorPossibleShape: 左表达式还在等右操作数");
  }
  const bindsTighter = info.RightAssociative
    ? info.Precedence >= root.Precedence
    : info.Precedence > root.Precedence;
  if (bindsTighter) {
    let rightIndex = -1;
    for (let at = root.Data.length - 1; at >= 0; at--) {
      if (!root.Data[at].IsTriviaToken && !root.Data[at].IsBasicToken) {
        rightIndex = at;
        break;
      }
    }
    if (rightIndex < 0) {
      throw new Error("ConditionOperatorPossibleShape: 左表达式没有右操作数");
    }
    const right = root.Data[rightIndex];
    root.Data.splice(rightIndex, 1);
    const nested = BinaryExpressionShape.FromLeftAndOperator(right, operator, info.Precedence, host.Template);
    nested.Pos = BinaryExpressionPossibleShape.PosOf(right);
    nested.SourceRange.End = operator.SourceRange.End;
    nested.Closed = false;
    root.Add(nested);
    root.Closed = false;
    root.SourceRange.End = -1;
    units.length = 0;
    host.Add(root);
    return nested;
  }
}
const binary = BinaryExpressionShape.FromLeftAndOperator(root, operator, info.Precedence, host.Template);
binary.Pos = BinaryExpressionPossibleShape.PosOf(root);
binary.SourceRange.End = operator.SourceRange.End;
binary.Closed = false;
units.length = 0;
host.Add(binary);
return binary;
```
