# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { TryStatementShape } from "./try-statement-shape.xl.md"
import { FinallyBlockPossibleShape } from "./finally-block-possible-shape.xl.md"
```

# namespace cangjie

# class FinallyKeywordPossibleShape extends PossibleShape

`catch` 块（或 `try` 块）之后的 `finally`。

## static method Arm:(statement:TryStatementShape)=>void

```ts
statement.CatalogGuide = new CatalogGuide([new FinallyKeywordPossibleShape()], null);
statement.MountedUnit = null;
```

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof TryStatementShape) || host.TryBlock === null || host.Finalizer !== null) {
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
if (!(unit instanceof Common) || !unit.Closed || !unit.Is("finally")) {
  return ShapeStates.Reject;
}
const prevIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (prevIndex < 0) {
  return ShapeStates.Reject;
}
const prev = units[prevIndex];
if (prev !== host.TryBlock && prev !== host.CatchClause) {
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
return unit instanceof Common && unit.Closed && unit.Is("finally");
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const statement = host as TryStatementShape;
const index = statement.DropTriviaBefore(tokenIndex);
const keyword = statement.Data[index] as Common;
statement.Data.splice(index, 1);
statement.CatalogGuide = new CatalogGuide([new FinallyBlockPossibleShape()], null);
statement.MountedUnit = null;
return keyword;
```
