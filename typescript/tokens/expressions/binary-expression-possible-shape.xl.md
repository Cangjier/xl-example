# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { AsteriskTokenShape } from "../punctuation/asterisk-token-shape.xl.md"
import { PlusTokenShape } from "../punctuation/plus-token-shape.xl.md"
import { OperatorTable } from "./operator-table.xl.md"
import { BinaryExpressionShape } from "./binary-expression-shape.xl.md"
import { IncrementalItemPosition } from "./numeric-literal-possible-shape.xl.md"
import { RightOperandPossibleShape } from "./right-operand-possible-shape.xl.md"
```

# namespace cangjie

# class BinaryExpressionPossibleShape extends PossibleShape

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (!(unit instanceof Symbol)) {
  // 数字字面量 / 已建形状都不是运算符；char 9 那次建完字面量后目录会复位，本候选重新参与判定。
  return ShapeStates.Reject;
}
const text = (unit as Symbol).TempToString();
if (text === "=") {
  return ShapeStates.Uncertain;
}
if (!OperatorTable.IsBinaryOperator(text)) {
  return ShapeStates.Reject;
}
if (text === "*" || text === "+") {
  // [P5] 让给 `ReassociationPossibleShape`：再结合（`a+b*c`）要在归约栈上拆层，
  // 本候选的单层原位替换做不到（旧实现在这里 Accept，然后在 BuildByIndex 里显式抛错）。
  return ShapeStates.Reject;
}
// WP-A2：其余二元运算符让给 `BinaryOperatorPossibleShape`（逐字符建形状，用 OperatorShapeMap）。
// 但「左操作数还不是形状」的格上**保持旧行为**（`<` 可能是尖括号断言 / 类型实参，`in` / `instanceof`
// 这类关键字也不该在这里被抢）：否则 angle-assert / generic-arrow 一类 case 会从 throw 漂移成 divergent。
const leftIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (leftIndex >= 0 && units[leftIndex] instanceof ShapeToken) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const token = host.Data[tokenIndex];
if (!(token instanceof Symbol)) {
  throw new Error("增量变量形状未支持：expression 二元运算符");
}
const operatorShape = BinaryExpressionPossibleShape.BuildOperator(token as Symbol, host, tokenIndex, context);
const leftIndex = BinaryExpressionPossibleShape.LeftOperandIndex(host.Data, tokenIndex);
if (leftIndex < 0) {
  throw new Error("增量变量形状未支持：expression 二元运算缺左操作数");
}
const left = host.Data[leftIndex];
if (!left.Closed) {
  throw new Error("增量变量形状未支持：expression 二元运算左操作数未封口");
}
const precedence = OperatorTable.Precedence((token as Symbol).TempToString());
const trivia = ItemUtil.TriviaBetween(host.Data, leftIndex, tokenIndex);
const binary = BinaryExpressionShape.FromLeftAndOperator(left, operatorShape, precedence, host.Template, trivia);
host.Data.splice(tokenIndex, 1);
host.Data.splice(leftIndex, 1, binary);
host.Data.splice(leftIndex + 1, trivia.length);
binary.Parent = host;
host.MountedUnit = binary;
binary.CatalogGuide = new CatalogGuide(RightOperandPossibleShape.Catalog(), null);
return binary;
```

## static method BuildOperator:(token:Symbol, host:Token, tokenIndex:int, context:SyntaxContext)=>Token

```ts
const text = token.TempToString();
const pos = IncrementalItemPosition.AfterPreviousCode(host.Data, tokenIndex);
if (text === "*") {
  const shape = AsteriskTokenShape.FromSymbol(token, context);
  shape.Pos = pos;
  token.Replace(shape);
  return shape;
}
if (text === "+") {
  const shape = PlusTokenShape.FromSymbol(token, context);
  shape.Pos = pos;
  token.Replace(shape);
  return shape;
}
throw new Error("增量变量形状未支持：expression 运算符 " + text);
```

## static method LeftOperandIndex:(units:Array<Token>, tokenIndex:int)=>int

```ts
return ItemUtil.PreviousCode(units, tokenIndex - 1);
```
