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
import { OperandUtil } from "../expressions/operand-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
```

# namespace cangjie

# class InitializerPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (!unit.IsBasicToken) {
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
if (InitializerPossibleShape.ShouldBuild(units, tokenIndex)) {
  return ShapeStates.Accept;
}
// 不是 `=` 之后的首操作数：让位给 Asi / 其它候选，别和它们同时存活。
return ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return InitializerPossibleShape.ShouldBuild(units, tokenIndex);
```

## static method ShouldBuild:(units:Array<Token>, tokenIndex:int)=>bool

```ts
// 初始化式的第一项：`=` 之后刚关闭的那个 Common，按文本落成 Identifier 或 NumericLiteral。
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
const operand = OperandUtil.FromCommon(common, OperandUtil.PositionOf(host.Data, tokenIndex));
common.Replace(operand);
return this.StampCreated(operand, context);
```
