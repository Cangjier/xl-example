# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { CallExpressionShape } from "./call-expression-shape.xl.md"
```

# namespace cangjie

# class CallExpressionEndPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!CallExpressionEndPossibleShape.ShouldEnd(host, tokenIndex)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return CallExpressionEndPossibleShape.ShouldClose(units, tokenIndex);
```

## static method ShouldEnd:(host:Token, tokenIndex:int)=>bool

```ts
if (!(host instanceof CallExpressionShape)) {
  return false;
}
if (!host.AwaitingClose) {
  return false;
}
return CallExpressionEndPossibleShape.ShouldClose(host.Data, tokenIndex);
```

## static method ShouldClose:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed) {
  return false;
}
return unit.Is(")");
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
if (!(host instanceof CallExpressionShape)) {
  throw new Error("CallExpressionEndPossibleShape: 宿主不是调用表达式");
}
const units = host.Data;
const close = units[tokenIndex] as Symbol;
units.splice(tokenIndex, 1);
host.AwaitingClose = false;
host.SourceRange.End = close.SourceRange.End;
host.TryToClose(context);
host.Quit();
return this.StampCreated(host, context);
```
