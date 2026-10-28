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

# class NumericLiteralPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (!unit.IsBasicToken) {
  // 初始值已经是一个操作数形状：本候选不参与后面的二元运算格。
  return ShapeStates.Reject;
}
if (unit instanceof Symbol) {
  if (unit.Is("=")) {
    return ShapeStates.Uncertain;
  }
  return ShapeStates.Reject;
}
if (!(unit instanceof Common) || !unit.Closed) {
  return ShapeStates.Uncertain;
}
if (NumericLiteralPossibleShape.ShouldBuild(units, tokenIndex)) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return NumericLiteralPossibleShape.ShouldBuild(units, tokenIndex);
```

## static method ShouldBuild:(units:Array<Token>, tokenIndex:int)=>bool

```ts
// 初始值的第一项：`=` 之后刚关闭的那个 Common，就是字面量。
const unit = units[tokenIndex];
if (!(unit instanceof Common) || !unit.Closed) {
  return false;
}
const before = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (before < 0) {
  return false;
}
const previous = units[before];
return previous instanceof Symbol && previous.Is("=");
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const common = host.Data[tokenIndex] as Common;
const literal = NumericLiteralShape.FromCommon(common, ItemUtil.PositionOf(host.Data, tokenIndex));
common.Replace(literal);
return literal;
```
