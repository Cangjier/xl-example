# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ReloadMessage } from "../../../core/syntax/messages/reload-message.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { CallPossibleShape } from "./call-possible-shape.xl.md"
import { ExpressionUtil } from "./expression-util.xl.md"
import { SuffixAccessPossibleShape } from "./suffix-access-possible-shape.xl.md"
import { UnaryExpressionShape } from "./unary-expression-shape.xl.md"
```

# namespace cangjie

# class PrefixUnaryEndPossibleShape extends PossibleShape

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
if (!(host instanceof UnaryExpressionShape)) {
  return ShapeStates.Reject;
}
if (host.AwaitingOperand) {
  return ShapeStates.Reject;
}
if (!PrefixUnaryEndPossibleShape.ShouldEnd(units, tokenIndex)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return PrefixUnaryEndPossibleShape.ShouldEnd(units, tokenIndex);
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
if (SuffixAccessPossibleShape.KindOf(units, tokenIndex) !== "") {
  return false;
}
if (CallPossibleShape.ShouldBuild(units, tokenIndex)) {
  return false;
}
return ExpressionUtil.HasOperandBefore(units, tokenIndex);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const unit = units[tokenIndex];
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
const end = unit.SourceRange.End;
units.splice(startIndex, units.length - startIndex);
host.TryToClose(context);
host.Quit();
context.Messages.push(ReloadMessage.FromRange(unit, start, end));
return this.StampCreated(unit, context);
```
