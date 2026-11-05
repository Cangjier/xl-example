# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { TokenIndex } from "../../../core/syntax/token-index.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { CallExpressionShape } from "./call-expression-shape.xl.md"
import { ElementAccessExpressionShape } from "./element-access-expression-shape.xl.md"
import { ParenthesizedExpressionShape } from "./parenthesized-expression-shape.xl.md"
import { PropertyAccessExpressionShape } from "./property-access-expression-shape.xl.md"
```

# namespace cangjie

# class CallPossibleShape extends PossibleShape

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
if (!(unit instanceof Symbol)) {
  return ShapeStates.Reject;
}
if (!unit.Is("(")) {
  return ShapeStates.Reject;
}
if (!CallPossibleShape.ShouldBuild(units, tokenIndex)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
return CallPossibleShape.ShouldBuild(units, tokenIndex);
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
const calleeIndex = CallPossibleShape.CalleeIndex(units, tokenIndex);
if (calleeIndex < 0) {
  return false;
}
return CallPossibleShape.IsCallable(units[calleeIndex]);
```

## static method CalleeIndex:(units:Array<Token>, tokenIndex:int)=>int

```ts
return ItemUtil.PreviousCode(units, tokenIndex - 1);
```

## static method IsCallable:(unit:Token)=>bool

```ts
if (!unit.Closed) {
  return false;
}
if (unit instanceof ParenthesizedExpressionShape) {
  return true;
}
return unit instanceof IdentifierShape
  || unit instanceof PropertyAccessExpressionShape
  || unit instanceof ElementAccessExpressionShape
  || unit instanceof CallExpressionShape;
```

## static method PosOf:(unit:Token)=>int

```ts
if (unit instanceof ShapeToken) {
  return unit.Pos;
}
return unit.SourceRange.Start;
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
const calleeIndex = CallPossibleShape.CalleeIndex(units, tokenIndex);
if (calleeIndex < 0) {
  throw new Error("CallPossibleShape: 缺被调用者");
}
const callee = units[calleeIndex];
const shape = new CallExpressionShape(host.Template);
shape.Pos = CallPossibleShape.PosOf(callee);
shape.SignIn(callee.SourceRange.Start);
shape.Add(callee);
shape.AwaitingClose = true;
units.splice(calleeIndex, tokenIndex - calleeIndex + 1, shape);
shape.Parent = host;
host.MountedUnit = shape;
return this.StampCreated(shape, context);
```
