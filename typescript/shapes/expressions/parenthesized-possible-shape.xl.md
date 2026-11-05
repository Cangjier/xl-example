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
import { BinaryExpressionPossibleShape } from "./binary-expression-possible-shape.xl.md"
import { AsPossibleShape } from "./as-expression-possible-shape.xl.md"
import { CallPossibleShape } from "./call-possible-shape.xl.md"
import { ConditionalPossibleShape } from "./conditional-possible-shape.xl.md"
import { ExpressionUtil } from "./expression-util.xl.md"
import { OperandUtil } from "./operand-util.xl.md"
import { ParenthesizedExpressionShape } from "./parenthesized-expression-shape.xl.md"
import { PostfixUnaryPossibleShape } from "./postfix-unary-possible-shape.xl.md"
import { PrefixUnaryPossibleShape } from "./prefix-unary-possible-shape.xl.md"
import { SuffixAccessPossibleShape } from "./suffix-access-possible-shape.xl.md"
import { UnaryExpressionShape } from "./unary-expression-shape.xl.md"
```

# namespace cangjie

# class ParenthesizedPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (!unit.Closed) {
  return ShapeStates.Uncertain;
}
if (unit instanceof Symbol && unit.Is("=")) {
  return ShapeStates.Uncertain;
}
if (!(unit instanceof Symbol) || !unit.Is("(")) {
  return ShapeStates.Reject;
}
if (!ParenthesizedPossibleShape.ShouldBuild(units, tokenIndex)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return ParenthesizedPossibleShape.ShouldBuild(units, tokenIndex);
```

## static method ShouldBuild:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is("(")) {
  return false;
}
const prevIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (prevIndex < 0) {
  return true;
}
const prev = units[prevIndex];
if (ExpressionUtil.IsClosedOperand(prev)) {
  return false;
}
if (prev instanceof Symbol && (prev.Is(".") || prev.Is("?.") || prev.Is("["))) {
  return false;
}
return true;
```

## static method Guide:()=>CatalogGuide

```ts
return new CatalogGuide(
  [
    new ParenOperandPossibleShape(),
    new BinaryExpressionPossibleShape(),
    new SuffixAccessPossibleShape(),
    new CallPossibleShape(),
    new ConditionalPossibleShape(),
    new PrefixUnaryPossibleShape(),
    new PostfixUnaryPossibleShape(),
    new ParenthesizedPossibleShape(),
    new AsPossibleShape(),
  ],
  new ParenthesizedEndPossibleShape(),
);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const open = units[tokenIndex] as Symbol;
const pos = OperandUtil.PositionOf(units, tokenIndex);
const shape = new ParenthesizedExpressionShape(host.Template);
shape.Pos = pos;
shape.SignIn(open.SourceRange.Start);
units.splice(tokenIndex, 1, shape);
if (host instanceof UnaryExpressionShape) {
  (host as UnaryExpressionShape).AwaitingOperand = false;
}
shape.Parent = host;
host.MountedUnit = shape;
shape.CatalogGuide = ParenthesizedPossibleShape.Guide();
return this.StampCreated(shape, context);
```

# class ParenOperandPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (!unit.Closed) {
  return ShapeStates.Uncertain;
}
if (!(host instanceof ParenthesizedExpressionShape)) {
  return ShapeStates.Reject;
}
if (!ParenOperandPossibleShape.ShouldBuild(units, tokenIndex)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return ParenOperandPossibleShape.ShouldBuild(units, tokenIndex);
```

## static method ShouldBuild:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length || tokenIndex !== units.length - 1) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Common) || !unit.Closed) {
  return false;
}
if (!ExpressionUtil.CanBeOperand(unit)) {
  return false;
}
return !ExpressionUtil.HasOperandBefore(units, tokenIndex);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const common = units[tokenIndex] as Common;
const operand = OperandUtil.FromCommon(common, OperandUtil.PositionOf(units, tokenIndex));
common.Replace(operand);
return this.StampCreated(operand, context);
```

# class ParenthesizedEndPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (!unit.Closed) {
  return ShapeStates.Uncertain;
}
if (!(host instanceof ParenthesizedExpressionShape)) {
  return ShapeStates.Reject;
}
return ParenthesizedEndPossibleShape.ShouldClose(units, tokenIndex) ? ShapeStates.Accept : ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return ParenthesizedEndPossibleShape.ShouldClose(units, tokenIndex);
```

## static method ShouldClose:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is(")")) {
  return false;
}
return ExpressionUtil.HasOperandBefore(units, tokenIndex);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const close = units[tokenIndex] as Symbol;
let startIndex = tokenIndex;
for (let at = tokenIndex - 1; at >= 0; at--) {
  const item = units[at];
  if (item.IsTriviaToken) {
    startIndex = at;
    continue;
  }
  break;
}
const end = close.SourceRange.End;
units.splice(startIndex, units.length - startIndex);
host.SourceRange.End = end;
host.TryToClose(context);
host.Quit();
return this.StampCreated(close, context);
```
