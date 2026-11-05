# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ReloadMessage } from "../../../core/syntax/messages/reload-message.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { BinaryExpressionPossibleShape } from "./binary-expression-possible-shape.xl.md"
import { CallPossibleShape } from "./call-possible-shape.xl.md"
import { OperandUtil } from "./operand-util.xl.md"
import { ParenthesizedPossibleShape } from "./parenthesized-possible-shape.xl.md"
import { SpreadElementShape } from "./spread-element-shape.xl.md"
import { SuffixAccessPossibleShape } from "./suffix-access-possible-shape.xl.md"
```

# namespace cangjie

# class SpreadPossibleShape extends PossibleShape

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
if (unit instanceof Symbol && unit.Is(",")) {
  return ShapeStates.Uncertain;
}
if (!(unit instanceof Symbol) || !unit.Is("...")) {
  return ShapeStates.Reject;
}
if (!SpreadPossibleShape.ShouldBuild(units, tokenIndex)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return SpreadPossibleShape.ShouldBuild(units, tokenIndex);
```

## static method ShouldBuild:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length || tokenIndex !== units.length - 1) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is("...")) {
  return false;
}
const prevIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (prevIndex < 0) {
  return false;
}
if (prevIndex === 0) {
  return true;
}
const prev = units[prevIndex];
return prev instanceof Symbol && prev.Closed && prev.Is(",");
```

## static method Guide:()=>CatalogGuide

```ts
return new CatalogGuide(
  [
    new SpreadOperandPossibleShape(),
    new BinaryExpressionPossibleShape(),
    new SuffixAccessPossibleShape(),
    new CallPossibleShape(),
    new ParenthesizedPossibleShape(),
  ],
  new SpreadEndPossibleShape(),
);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const dots = units[tokenIndex] as Symbol;
const pos = OperandUtil.PositionOf(units, tokenIndex);
const shape = new SpreadElementShape(host.Template);
shape.Pos = pos;
shape.SignIn(dots.SourceRange.Start);
units.splice(tokenIndex, 1, shape);
shape.Parent = host;
host.MountedUnit = shape;
shape.CatalogGuide = SpreadPossibleShape.Guide();
return this.StampCreated(shape, context);
```

# class SpreadOperandPossibleShape extends PossibleShape

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
if (!(host instanceof SpreadElementShape)) {
  return ShapeStates.Reject;
}
if (SpreadOperandPossibleShape.ShouldBuild(units, tokenIndex)) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return SpreadOperandPossibleShape.ShouldBuild(units, tokenIndex);
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
if (!OperandUtil.CanStartExpression(unit)) {
  return false;
}
return ItemUtil.PreviousCode(units, tokenIndex - 1) < 0;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const common = units[tokenIndex] as Common;
const operand = OperandUtil.FromCommon(common, OperandUtil.PositionOf(units, tokenIndex));
common.Replace(operand);
return this.StampCreated(operand, context);
```

# class SpreadEndPossibleShape extends PossibleShape

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
if (!(host instanceof SpreadElementShape)) {
  return ShapeStates.Reject;
}
return SpreadEndPossibleShape.ShouldEnd(units, tokenIndex) ? ShapeStates.Accept : ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return SpreadEndPossibleShape.ShouldEnd(units, tokenIndex);
```

## static method ShouldEnd:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed) {
  return false;
}
if (!unit.IsAny([")", ","])) {
  return false;
}
return ItemUtil.PreviousCode(units, tokenIndex - 1) >= 0;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const trigger = units[tokenIndex];
let startIndex = tokenIndex;
for (let at = tokenIndex - 1; at >= 0; at--) {
  const item = units[at];
  if (item.IsTriviaToken) {
    startIndex = at;
    continue;
  }
  break;
}
const start = units[startIndex].SourceRange.Start;
const end = trigger.SourceRange.End;
units.splice(startIndex, units.length - startIndex);
host.TryToClose(context);
host.Quit();
context.Messages.push(ReloadMessage.FromRange(trigger, start, end));
return this.StampCreated(trigger, context);
```
