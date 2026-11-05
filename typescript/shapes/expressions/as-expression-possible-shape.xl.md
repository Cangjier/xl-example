# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { TypeReferenceShape } from "../types/type-node-shapes.xl.md"
import { TypeKeywordUtil } from "../types/type-keyword-util.xl.md"
import { AsExpressionShape } from "./as-expression-shape.xl.md"
import { ExpressionUtil } from "./expression-util.xl.md"
import { OperandUtil } from "./operand-util.xl.md"
```

# namespace cangjie

# class AsPossibleShape extends PossibleShape

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
if (!(unit instanceof Common) || unit.TempToString() !== "as") {
  return ShapeStates.Reject;
}
if (!AsPossibleShape.ShouldBuild(units, tokenIndex)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return AsPossibleShape.ShouldBuild(units, tokenIndex);
```

## static method ShouldBuild:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length || tokenIndex !== units.length - 1) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Common) || !unit.Closed || unit.TempToString() !== "as") {
  return false;
}
const expressionIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (expressionIndex < 0) {
  return false;
}
return ExpressionUtil.IsClosedOperand(units[expressionIndex]);
```

## static method Guide:()=>CatalogGuide

```ts
return new CatalogGuide([], new AsTypeEndPossibleShape());
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const expressionIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (expressionIndex < 0) {
  throw new Error("AsPossibleShape: 缺 as 左侧操作数");
}
const expression = units[expressionIndex];
const shape = new AsExpressionShape(host.Template);
shape.Pos = ExpressionUtil.PosOf(expression);
shape.SignIn(expression.SourceRange.Start);
shape.Add(expression);
units.splice(expressionIndex, tokenIndex - expressionIndex + 1, shape);
shape.Parent = host;
host.MountedUnit = shape;
shape.CatalogGuide = AsPossibleShape.Guide();
return this.StampCreated(shape, context);
```

# class AsTypeEndPossibleShape extends PossibleShape

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
if (!(host instanceof AsExpressionShape)) {
  return ShapeStates.Reject;
}
if (!(unit instanceof Common)) {
  return ShapeStates.Reject;
}
if (unit.TempToString() === "as") {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
return unit instanceof Common && unit.Closed && unit.TempToString() !== "as";
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const unit = units[tokenIndex] as Common;
const pos = OperandUtil.PositionOf(units, tokenIndex);
const keyword = TypeKeywordUtil.KeywordTypeOf(unit, pos);
let type:Token;
if (keyword !== null) {
  type = keyword;
} else {
  const identifier = IdentifierShape.FromCommon(unit, pos);
  const reference = new TypeReferenceShape(host.Template);
  reference.Pos = pos;
  reference.SignIn(unit.SourceRange.Start);
  reference.Add(identifier);
  reference.SignOut(unit.SourceRange.End);
  reference.Closed = true;
  type = reference;
}
units.splice(tokenIndex, 1, type);
type.Parent = host;
host.SourceRange.End = type.SourceRange.End;
host.TryToClose(context);
host.Quit();
return this.StampCreated(type, context);
```
