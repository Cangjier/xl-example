# dependencies
```xl
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { ItemUtil } from "../../../item-util.xl.md"
import { BinaryExpressionShape } from "../../binary-expression-shape.xl.md"
import { IncrementalItemPosition } from "../../numeric-literal-possible-shape.xl.md"
import { OperatorShapeMap } from "../../operator-shape-map.xl.md"
import { OperatorTable } from "../../operator-table.xl.md"
import { RightOperandPossibleShape } from "../../right-operand-possible-shape.xl.md"
import { ShapeOperatorStack } from "../../shape-operator-stack.xl.md"
import { BinaryOperatorPossibleShape } from "./binary-operator-possible-shape.xl.md"
```

# namespace cangjie

```
char 8  `1`   → NumericLiteralShape（既有原子候选）
char 9  `+`   → 本候选建 PlusTokenShape + Binary(1+)，左操作数格原位替换
char 10 `2`   → Binary(1+) 的右操作数目录建 NumericLiteralShape 并封口（既有 C3）
char 11 `*`   → 本候选：左操作数 Binary(+) 优先级 13 < 14 ⇒ 归约栈把 `2` 摘下来当新 Binary 的左操作数
EOF           → 右操作数 `3` 由内层 Binary(*) 的目录封口；外层 End 由 EOF 签出 / Close 级联补齐
```

# class ReassociationPossibleShape extends PossibleShape

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
const text = BinaryOperatorPossibleShape.TextOf(unit);
if (text === "") {
  return ShapeStates.Reject;
}
if (text === "=") {
  return ShapeStates.Uncertain;
}
if (!OperatorTable.IsBinaryOperator(text)) {
  return ShapeStates.Reject;
}
const precedence = OperatorTable.Precedence(text);
if (text === "*" || text === "+") {
  return ShapeStates.Accept;
}
const leftIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (leftIndex < 0) {
  return ShapeStates.Reject;
}
if (!BinaryExpressionShape.NeedsReassociation(units[leftIndex], precedence, text)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const token = host.Data[tokenIndex];
const text = BinaryOperatorPossibleShape.TextOf(token);
if (text === "") {
  throw new Error("增量变量形状未支持：expression 二元运算符");
}
const precedence = OperatorTable.Precedence(text);
if (precedence < 0) {
  throw new Error("增量变量形状未支持：expression 运算符 " + text);
}
const leftIndex = ReassociationPossibleShape.LeftOperandIndex(host.Data, tokenIndex);
if (leftIndex < 0) {
  throw new Error("增量变量形状未支持：expression 二元运算缺左操作数");
}
let left = host.Data[leftIndex];
if (!(left instanceof ShapeToken)) {
  left = BinaryOperatorPossibleShape.Operand(host, leftIndex, context);
}
if (!left.Closed) {
  throw new Error("增量变量形状未支持：expression 二元运算左操作数未封口");
}
if (left instanceof BinaryExpressionShape) {
  if (BinaryExpressionShape.NeedsReassociation(left, precedence, text)) {
    return ReassociationPossibleShape.Reassociate(host, tokenIndex, leftIndex, precedence, token, context);
  }
}
const operatorShape = ReassociationPossibleShape.BuildOperator(token, host, tokenIndex, context);
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

## static method Reassociate:(host:Token, tokenIndex:int, leftIndex:int, precedence:int, token:Token, context:SyntaxContext)=>Token

```ts
const left = host.Data[leftIndex];
if (!(left instanceof BinaryExpressionShape)) {
  throw new Error("增量变量形状未支持：expression 归约对象不是二元表达式");
}
const leftBinary = left as BinaryExpressionShape;
const data = leftBinary.Data;
let outerLeft: Token | null = null;
let outerOperator: Token | null = null;
let innerLeft: Token | null = null;
const outerTrivia: Array<Token> = [];
const innerTrivia: Array<Token> = [];
for (let index = 0; index < data.length; index++) {
  const item = data[index];
  if (item.IsTriviaToken) {
    if (outerOperator === null) {
      outerTrivia.push(item);
    } else {
      innerTrivia.push(item);
    }
    continue;
  }
  if (outerLeft === null) {
    outerLeft = item;
    continue;
  }
  if (outerOperator === null) {
    outerOperator = item;
    continue;
  }
  if (innerLeft === null) {
    innerLeft = item;
    continue;
  }
  throw new Error("增量变量形状未支持：expression 归约对象的子单元多于三格代码");
}
if (outerLeft === null || outerOperator === null || innerLeft === null) {
  throw new Error("增量变量形状未支持：expression 归约对象的子单元不是三格");
}
leftBinary.Data.length = 0;
outerLeft.Parent = null;
outerOperator.Parent = null;
innerLeft.Parent = null;
for (const item of outerTrivia) {
  item.Parent = null;
}
for (const item of innerTrivia) {
  item.Parent = null;
}
const outerText = outerOperator.AstOperator();
if (outerText === "") {
  throw new Error("增量变量形状未支持：expression 归约对象的外层运算符没有文本");
}
const newTrivia = ItemUtil.TriviaBetween(host.Data, leftIndex, tokenIndex);
const operatorShape = ReassociationPossibleShape.BuildOperator(token, host, tokenIndex, context);
const stack = new ShapeOperatorStack(host.Template);
stack.PushOperand(outerLeft);
stack.PushOperator(outerOperator, outerText);
stack.PushOperand(innerLeft);
stack.PushOperator(operatorShape, BinaryOperatorPossibleShape.TextOf(token));
const outer = stack.Root();
const inner = stack.Top();
if (outer === null || inner === null || outer === inner) {
  throw new Error("增量变量形状未支持：expression 再结合没有归约出两层");
}
const hostIndex = host.Data.indexOf(left);
if (hostIndex < 0) {
  throw new Error("增量变量形状未支持：expression 再结合找不到左操作数那一格");
}
host.Data.splice(hostIndex, 1, outer);
host.Data.splice(hostIndex + 1, newTrivia.length);
outer.Parent = host;
ItemUtil.InsertTrivia(outer, 1, outerTrivia);
ItemUtil.InsertTrivia(inner, 1, newTrivia);
if (innerTrivia.length > 0) {
  ItemUtil.InsertTrivia(outer, 2 + outerTrivia.length, innerTrivia);
}
(left as BinaryExpressionShape).Parent = null;
(inner as ShapeToken).CatalogGuide = new CatalogGuide(RightOperandPossibleShape.Catalog(), null);
inner.Parent = host;
host.MountedUnit = inner;
return inner;
```

## static method BuildOperator:(token:Token, host:Token, tokenIndex:int, context:SyntaxContext)=>Token

```ts
const text = BinaryOperatorPossibleShape.TextOf(token);
if (text === "") {
  throw new Error("增量变量形状未支持：expression 运算符");
}
const pos = IncrementalItemPosition.AfterPreviousCode(host.Data, tokenIndex);
const shape = OperatorShapeMap.Create(text, OperatorShapeMap.PositionBinary, host.Template, token.SourceRange.Start, token.SourceRange.End, context);
if (shape instanceof ShapeToken) {
  (shape as ShapeToken).Pos = pos;
}
token.Replace(shape);
return shape;
```

## static method LeftOperandIndex:(units:Array<Token>, tokenIndex:int)=>int

```ts
return ItemUtil.PreviousCode(units, tokenIndex - 1);
```

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

```ts
shapes.push(new ReassociationPossibleShape());
```
