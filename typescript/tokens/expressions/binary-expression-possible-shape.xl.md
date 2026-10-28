# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { NumericLiteralShape } from "../literals/numeric-literal-shape.xl.md"
import { AsteriskTokenShape } from "../punctuation/asterisk-token-shape.xl.md"
import { BinaryExpressionShape } from "./binary-expression-shape.xl.md"
import { RightOperandPossibleShape } from "./right-operand-possible-shape.xl.md"
```

# namespace cangjie

# class BinaryExpressionPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit instanceof Common) {
  // 初始值的第一项归字面量候选；`=` 之后的 Common 不可能是二元运算符。
  const before = ItemUtil.PreviousCode(units, tokenIndex - 1);
  if (before >= 0 && units[before] instanceof Symbol && (units[before] as Symbol).Is("=")) {
    return ShapeStates.Reject;
  }
  return ShapeStates.Uncertain;
}
if (!unit.IsBasicToken) {
  return ShapeStates.Reject;
}
if (BinaryExpressionPossibleShape.ShouldBuild(units, tokenIndex)) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return BinaryExpressionPossibleShape.ShouldBuild(units, tokenIndex);
```

## static method ShouldBuild:(units:Array<Token>, tokenIndex:int)=>bool

```ts
// 本步只做乘号：运算符已关闭，左边是一个已封口的操作数形状。
const unit = units[tokenIndex];
if (!unit.IsBasicToken) {
  return false;
}
if (!(unit instanceof Symbol) || !unit.Closed) {
  return false;
}
if (!unit.Is("*")) {
  return false;
}
const leftIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (leftIndex < 0) {
  return false;
}
return BinaryExpressionPossibleShape.IsClosedOperand(units[leftIndex]);
```

## static method IsClosedOperand:(unit:Token)=>bool

```ts
if (unit instanceof BinaryExpressionShape) {
  return unit.Closed;
}
if (unit instanceof NumericLiteralShape) {
  return unit.Closed;
}
return false;
```

## static method Precedence:(text:string)=>int

```ts
if (text === "*" || text === "/" || text === "%") {
  return 2;
}
return 1;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const operator = units[tokenIndex] as Symbol;
const leftIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (leftIndex < 0) {
  throw new Error("BinaryExpressionPossibleShape: 缺左操作数");
}
const left = units[leftIndex];
const operatorShape = AsteriskTokenShape.FromSymbol(operator, ItemUtil.PositionOf(units, tokenIndex));
const binary = BinaryExpressionShape.FromLeftAndOperator(left, operatorShape, BinaryExpressionPossibleShape.Precedence("*"), host.Template);
binary.Pos = ItemUtil.PositionOf(units, leftIndex);
units.splice(tokenIndex, 1);
units.splice(leftIndex, 1, binary);
binary.Parent = host;
host.MountedUnit = binary;
binary.CatalogGuide = new CatalogGuide([new RightOperandPossibleShape()], null);
return binary;
```
