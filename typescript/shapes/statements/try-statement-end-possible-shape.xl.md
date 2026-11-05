# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ReloadMessage } from "../../../core/syntax/messages/reload-message.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { TryStatementShape } from "./try-statement-shape.xl.md"
```

# namespace cangjie

# class TryStatementEndPossibleShape extends PossibleShape


## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof TryStatementShape)) {
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
if (unit === host.TryBlock || unit === host.CatchClause || unit === host.Finalizer) {
  return ShapeStates.Reject;
}
if (unit instanceof Common && unit.IsAny(["catch", "finally"])) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length || tokenIndex !== units.length - 1) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken || !unit.Closed) {
  return false;
}
return !(unit instanceof Common && unit.IsAny(["catch", "finally"]));
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const statement = host as TryStatementShape;
const units = statement.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  throw new Error("TryStatementEndPossibleShape: 下标越界");
}
const unit = units[tokenIndex];
let startIndex = tokenIndex;
for (let at = tokenIndex - 1; at >= 0; at--) {
  if (!units[at].IsTriviaToken) {
    break;
  }
  startIndex = at;
}
const start = units[startIndex].SourceRange.Start;
const end = unit.SourceRange.End;
units.splice(startIndex, tokenIndex - startIndex + 1);
TryStatementShape.Finish(statement, context);
context.Messages.push(ReloadMessage.FromRange(unit, start, end));
return this.StampCreated(unit, context);
```
