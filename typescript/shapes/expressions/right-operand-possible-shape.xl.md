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
import { OperandUtil } from "./operand-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { NumericLiteralShape } from "../literals/numeric-literal-shape.xl.md"
import { BinaryOperatorTokenShape } from "../punctuation/binary-operator-token-shape.xl.md"
```

# namespace cangjie

# class RightOperandPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
// 运算符归 BinaryExpression 候选；已建字面量不再重复建。其余单元保持 Uncertain，
// 让注释之类还没被消费的 basic token 不会把整棵候选集清零。
if (unit instanceof NumericLiteralShape || unit instanceof IdentifierShape || unit instanceof Symbol) {
  return ShapeStates.Reject;
}
// 只有「还缺右操作数」的时候才收 Common；右操作数已到位再来的 Common 归终结候选。
if (unit instanceof Common && unit.Closed && tokenIndex === units.length - 1) {
  if (RightOperandPossibleShape.IsWaitingForOperand(units, tokenIndex)) {
    return ShapeStates.Accept;
  }
  return ShapeStates.Reject;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex !== units.length - 1) {
  return false;
}
const unit = units[tokenIndex];
return unit instanceof Common && unit.Closed && RightOperandPossibleShape.IsWaitingForOperand(units, tokenIndex);
```

## static method IsWaitingForOperand:(units:Array<Token>, tokenIndex:int)=>bool

```ts
for (let at = tokenIndex - 1; at >= 0; at--) {
  const item = units[at];
  if (item.IsTriviaToken || item.IsBasicToken) {
    continue;
  }
  return item instanceof BinaryOperatorTokenShape;
}
return false;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const common = units[tokenIndex] as Common;
const operand = OperandUtil.FromCommon(common, OperandUtil.PositionOf(units, tokenIndex));
common.Replace(operand);
// 右操作数到位不等于二元式收口：后面可能还有优先级更松的运算符，或者尾随空白/注释。
// 这里只把操作数挂上，二元式保持开着，由运算符候选或终结候选决定什么时候封口。
return this.StampCreated(operand, context);
```
