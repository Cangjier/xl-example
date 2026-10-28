# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { NumericLiteralShape } from "../literals/numeric-literal-shape.xl.md"
import { ExpressionAtomRegistry } from "./forms/shared/expression-atom-registry.xl.md"
```

# namespace cangjie

# class IncrementalItemPosition

## static method AfterPreviousCode:(units:Array<Token>, tokenIndex:int)=>int

```ts
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previous < 0) {
  return 0;
}
const end = units[previous].SourceRange.End;
if (end >= 0) {
  return end;
}
return 0;
```

# class NumericLiteralPossibleShape extends PossibleShape

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
const start = ItemUtil.ItemStartCached(units, cache);
if (tokenIndex < start) {
  return ShapeStates.Reject;
}
if (unit instanceof Symbol) {
  // `=` 是声明的赋值符：初始值还没开始，目录保持等待（见上方说明）。
  if ((unit as Symbol).Is("=")) {
    return ShapeStates.Uncertain;
  }
  return ShapeStates.Reject;
}
if (!(unit instanceof Common)) {
  return ShapeStates.Reject;
}
if (!(unit as Common).IsNumber()) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const token = host.Data[tokenIndex];
if (!(token instanceof Common)) {
  throw new Error("增量变量形状未支持：expression 数字字面量");
}
if (!(token as Common).IsNumber()) {
  throw new Error("增量变量形状未支持：expression 数字字面量正文 " + token.TempToString());
}
const shape = NumericLiteralPossibleShape.BuildLiteral(token as Common, host, tokenIndex, context);
// [T9:ATOM-POSTFIX] 只登记「声明初始化器的根原子」：收口格据此把它当操作数消费（`HasNode`），
// 后缀由 legacy `ExpressionBuilder.ParsePostfixSuffix` 接上。
ExpressionAtomRegistry.RegisterNode(shape);
return shape;
```

## static method BuildLiteral:(token:Common, host:Token, tokenIndex:int, context:SyntaxContext)=>NumericLiteralShape

```ts
const shape = NumericLiteralShape.FromBasicToken(token, context);
shape.Pos = IncrementalItemPosition.AfterPreviousCode(host.Data, tokenIndex);
token.Replace(shape);
return shape;
```
