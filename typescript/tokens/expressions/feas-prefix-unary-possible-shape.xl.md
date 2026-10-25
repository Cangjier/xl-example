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

# class FeasPrefixUnaryPossibleShape extends PossibleShape

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
if (OperatorTable.IsPrefixOperator(text) && !OperatorTable.IsRightAssociative(text)) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
throw new Error("FeasPrefixUnaryPossibleShape.BuildByIndex: 原型由 FeasOperatorParser 增量建形状");
```
