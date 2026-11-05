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
import { TokenIndex } from "../../../core/syntax/token-index.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { MinusTokenShape } from "../punctuation/binary-operator-token-shapes.xl.md"
import { PlusTokenShape } from "../punctuation/plus-token-shape.xl.md"
import { CallPossibleShape } from "./call-possible-shape.xl.md"
import { ExpressionUtil } from "./expression-util.xl.md"
import { ParenthesizedPossibleShape } from "./parenthesized-possible-shape.xl.md"
import { PrefixOperandPossibleShape } from "./prefix-operand-possible-shape.xl.md"
import { PrefixUnaryEndPossibleShape } from "./prefix-unary-end-possible-shape.xl.md"
import { SuffixAccessPossibleShape } from "./suffix-access-possible-shape.xl.md"
import { DeleteExpressionShape, PrefixUnaryExpressionShape, TypeOfExpressionShape, VoidExpressionShape } from "./unary-expression-shapes.xl.md"
import { ExclamationTokenShape, PrefixKeywordTokenShape, TildeTokenShape } from "./unary-token-shapes.xl.md"
import { UnaryExpressionShape } from "./unary-expression-shape.xl.md"
```

# namespace cangjie

# class PrefixUnaryPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = index.At(tokenIndex);
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (!unit.Closed) {
  return ShapeStates.Uncertain;
}
if (!ExpressionUtil.IsPrefixOperator(unit)) {
  if (unit instanceof Symbol && unit.Is("=")) {
    return ShapeStates.Uncertain;
  }
  return ShapeStates.Reject;
}
if (!PrefixUnaryPossibleShape.ShouldBuild(units, tokenIndex)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
return PrefixUnaryPossibleShape.ShouldBuild(units, tokenIndex);
```

## static method ShouldBuild:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length || tokenIndex !== units.length - 1) {
  return false;
}
const unit = units[tokenIndex];
if (!ExpressionUtil.IsPrefixOperator(unit)) {
  return false;
}
const previousIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previousIndex < 0) {
  return true;
}
return !ExpressionUtil.IsClosedOperand(units[previousIndex]);
```

## static method Guide:()=>CatalogGuide

```ts
return new CatalogGuide(
  [
    new PrefixOperandPossibleShape(),
    new SuffixAccessPossibleShape(),
    new CallPossibleShape(),
    new ParenthesizedPossibleShape(),
    new PrefixUnaryPossibleShape(),
  ],
  new PrefixUnaryEndPossibleShape(),
);
```

## static method CreateOperator:(unit:Token, pos:int)=>Token

```ts
if (unit instanceof Symbol) {
  const text = unit.TempToString();
  if (text === "!") {
    return ExclamationTokenShape.FromSymbol(unit, pos);
  }
  if (text === "~") {
    return TildeTokenShape.FromSymbol(unit, pos);
  }
  if (text === "+") {
    return PlusTokenShape.FromSymbol(unit, pos);
  }
  if (text === "-") {
    return MinusTokenShape.FromSymbol(unit, pos);
  }
}
if (unit instanceof Common) {
  const text = unit.TempToString();
  if (text === "typeof" || text === "void" || text === "delete") {
    return PrefixKeywordTokenShape.FromCommon(unit, pos, text);
  }
}
throw new Error("PrefixUnaryPossibleShape: 不支持的前缀运算符");
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
const unit = index.At(tokenIndex);
const pos = ExpressionUtil.OperatorPosition(units, tokenIndex);
const operator = PrefixUnaryPossibleShape.CreateOperator(unit, pos);
let shape:UnaryExpressionShape;
if (unit instanceof Common) {
  const text = unit.TempToString();
  if (text === "typeof") {
    shape = new TypeOfExpressionShape(host.Template);
  } else if (text === "void") {
    shape = new VoidExpressionShape(host.Template);
  } else {
    shape = new DeleteExpressionShape(host.Template);
  }
} else {
  shape = new PrefixUnaryExpressionShape(host.Template);
}
shape.Pos = pos;
shape.SignIn(unit.SourceRange.Start);
shape.Operator = operator;
shape.AwaitingOperand = true;
units.splice(tokenIndex, 1, shape);
if (host instanceof UnaryExpressionShape) {
  (host as UnaryExpressionShape).AwaitingOperand = false;
}
shape.Parent = host;
host.MountedUnit = shape;
shape.CatalogGuide = PrefixUnaryPossibleShape.Guide();
return this.StampCreated(shape, context);
```
