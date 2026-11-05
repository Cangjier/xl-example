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
import { BinaryOperatorTable } from "./binary-operator-table.xl.md"
import { CallPossibleShape } from "./call-possible-shape.xl.md"
import { ExpressionUtil } from "./expression-util.xl.md"
import { NewExpressionShape } from "./new-expression-shape.xl.md"
import { OperandUtil } from "./operand-util.xl.md"
import { SuffixAccessPossibleShape } from "./suffix-access-possible-shape.xl.md"
import { TokenIndex } from "../../../core/syntax/token-index.xl.md"
import { UnaryExpressionShape } from "./unary-expression-shape.xl.md"
```

# namespace cangjie

# class NewPossibleShape extends PossibleShape

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
if (unit instanceof Symbol && unit.Is("=")) {
  return ShapeStates.Uncertain;
}
if (!(unit instanceof Common) || unit.TempToString() !== "new") {
  return ShapeStates.Reject;
}
if (!NewPossibleShape.ShouldBuild(units, tokenIndex)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
return NewPossibleShape.ShouldBuild(units, tokenIndex);
```

## static method ShouldBuild:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length || tokenIndex !== units.length - 1) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Common) || !unit.Closed || unit.TempToString() !== "new") {
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
return !(prev instanceof Symbol && (prev.Is(".") || prev.Is("?.")));
```

## static method Guide:()=>CatalogGuide

```ts
return new CatalogGuide(
  [new NewCalleePossibleShape(), new SuffixAccessPossibleShape(), new CallPossibleShape()],
  new NewExpressionEndPossibleShape(),
);
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
const keyword = index.At(tokenIndex) as Common;
const pos = OperandUtil.PositionOf(units, tokenIndex);
const shape = new NewExpressionShape(host.Template);
shape.Pos = pos;
shape.SignIn(keyword.SourceRange.Start);
units.splice(tokenIndex, 1, shape);
if (host instanceof UnaryExpressionShape) {
  (host as UnaryExpressionShape).AwaitingOperand = false;
}
shape.Parent = host;
host.MountedUnit = shape;
shape.CatalogGuide = NewPossibleShape.Guide();
return this.StampCreated(shape, context);
```

# class NewCalleePossibleShape extends PossibleShape

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
if (!(host instanceof NewExpressionShape)) {
  return ShapeStates.Reject;
}
if (!NewCalleePossibleShape.ShouldBuild(units, tokenIndex)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
return NewCalleePossibleShape.ShouldBuild(units, tokenIndex);
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

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
const common = index.At(tokenIndex) as Common;
const callee = OperandUtil.FromCommon(common, OperandUtil.PositionOf(units, tokenIndex));
common.Replace(callee);
return this.StampCreated(callee, context);
```

# class NewExpressionEndPossibleShape extends PossibleShape

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
if (!(host instanceof NewExpressionShape)) {
  return ShapeStates.Reject;
}
return NewExpressionEndPossibleShape.ShouldEnd(units, tokenIndex) ? ShapeStates.Accept : ShapeStates.Reject;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
return NewExpressionEndPossibleShape.ShouldEnd(units, tokenIndex);
```

## static method ShouldEnd:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!unit.Closed) {
  return false;
}
if (!ExpressionUtil.HasOperandBefore(units, tokenIndex)) {
  return false;
}
if (!(unit instanceof Symbol)) {
  return false;
}
if (unit.IsAny([";", ")", ",", "]", "}", ":"])) {
  return true;
}
return BinaryOperatorTable.Contains(unit.TempToString());
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
const trigger = index.At(tokenIndex);
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
