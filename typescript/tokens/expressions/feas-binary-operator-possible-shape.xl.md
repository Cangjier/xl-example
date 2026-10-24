# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { OperatorTable } from "./operator-table.xl.md"
```

# namespace cangjie

# class FeasBinaryOperatorPossibleShape extends PossibleShape

可行性原型的**二元操作符候选**：`OperatorTable` 判得优先级 `>= 0` 的这一格就是二元操作符。优先级数值不存在第二份。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
let text = "";
if (unit instanceof Symbol) {
  text = (unit as Symbol).TempToString();
} else if (unit instanceof Common) {
  text = (unit as Common).TempToString();
} else {
  return ShapeStates.Reject;
}
if (OperatorTable.IsBinaryOperator(text)) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

原型沿用 `ExpressionBuilder.MakeOperatorToken` 造运算符单元的同一个入口（避免「第二份运算符映射」），由 `FeasOperatorParser` 在插入新 shape 时调用。

```ts
throw new Error("FeasBinaryOperatorPossibleShape.BuildByIndex: 原型由 FeasOperatorParser 增量建形状");
```
