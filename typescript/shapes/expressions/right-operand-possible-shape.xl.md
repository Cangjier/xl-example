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
import { ItemUtil } from "../item-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { NumericLiteralShape } from "../literals/numeric-literal-shape.xl.md"
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
if (unit instanceof NumericLiteralShape || unit instanceof Symbol) {
  return ShapeStates.Reject;
}
if (unit instanceof Common && unit.Closed && tokenIndex === units.length - 1) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex !== units.length - 1) {
  return false;
}
const unit = units[tokenIndex];
return unit instanceof Common && unit.Closed;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const common = units[tokenIndex] as Common;
const literal = NumericLiteralShape.FromCommon(common, ItemUtil.PositionOf(units, tokenIndex));
common.Replace(literal);
// 右操作数一到，二元式当场封口，并把宿主交还给上一层（doc: char 11 的 `+` 落在声明下）。
host.TryToClose(context);
host.Quit();
return literal;
```
