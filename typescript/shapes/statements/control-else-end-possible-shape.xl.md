# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { IComputePossibleShapes } from "../../../core/syntax/i-compute-possible-shapes.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ControlStatementShape } from "./control-statement-shape.xl.md"
import { DoWhileKeywordPossibleShape } from "./do-while-keyword-possible-shape.xl.md"
```

# namespace cangjie

# class ControlElseEndPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof ControlStatementShape) || host.Body === null) {
  return ShapeStates.Reject;
}
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
if (ControlElseEndPossibleShape.CanEnd(unit)) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex !== units.length - 1) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken || !unit.Closed) {
  return false;
}
return ControlElseEndPossibleShape.CanEnd(unit);
```

## static method CanEnd:(unit:Token)=>bool

```ts
if (unit instanceof ShapeToken) {
  return false;
}
if (unit instanceof Common && unit.Is("else")) {
  return false;
}
return true;
```

## static method Outermost:(control:ControlStatementShape)=>Token

```ts
let top: Token = control;
while (top.Parent instanceof ControlStatementShape) {
  top = top.Parent;
}
return top;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const control = host as ControlStatementShape;
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  throw new Error("ControlElseEndPossibleShape: 下标越界");
}
const unit = units[tokenIndex];
let startIndex = tokenIndex;
for (let at = tokenIndex - 1; at >= 0; at--) {
  if (units[at].IsTriviaToken) {
    startIndex = at;
    continue;
  }
  break;
}
const moved = units.splice(startIndex, units.length - startIndex);
const outermost = ControlElseEndPossibleShape.Outermost(control);
let waiting: ControlStatementShape | null = ControlStatementShape.CloseChain(control, context);
let resting: ControlStatementShape | null = null;
while (waiting !== null) {
  if (waiting.Kind === "do") {
    resting = waiting;
    break;
  }
  waiting = ControlStatementShape.CloseChain(waiting, context);
}
const target: Token | null = resting !== null ? resting : outermost.Parent;
if (resting !== null) {
  DoWhileKeywordPossibleShape.Arm(resting);
}
if (target !== null) {
  for (const item of moved) {
    target.Add(item);
  }
  if ("ComputePossibleShapes" in target) {
    (target as unknown as IComputePossibleShapes).ComputePossibleShapes(context, PossibleSource.Close);
  }
}
return this.StampCreated(unit, context);
```
