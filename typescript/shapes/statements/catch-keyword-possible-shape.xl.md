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
import { CatchClauseShape } from "./catch-clause-shape.xl.md"
import { CatchOpenPossibleShape } from "./catch-open-possible-shape.xl.md"
import { CatchBlockPossibleShape } from "./catch-block-possible-shape.xl.md"
import { TryStatementShape } from "./try-statement-shape.xl.md"
```

# namespace cangjie

# class CatchKeywordPossibleShape extends PossibleShape

`try` 块之后的 `catch`（上下文关键字，不进 AST）。

## static method Arm:(statement:TryStatementShape)=>void

```ts
statement.CatalogGuide = new CatalogGuide([new CatchKeywordPossibleShape()], null);
statement.MountedUnit = null;
```

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof TryStatementShape) || host.TryBlock === null || host.CatchClause !== null) {
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
if (!(unit instanceof Common) || !unit.Closed || !unit.Is("catch")) {
  return ShapeStates.Reject;
}
const prevIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (prevIndex < 0 || units[prevIndex] !== host.TryBlock) {
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
return unit instanceof Common && unit.Closed && unit.Is("catch");
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const statement = host as TryStatementShape;
const units = statement.Data;
const keyword = units[tokenIndex] as Common;
const clause = new CatchClauseShape(host.Template);
clause.Pos = ItemUtil.PositionOf(units, tokenIndex);
clause.SignIn(keyword.SourceRange.Start);
clause.CatalogGuide = new CatalogGuide(
  [new CatchOpenPossibleShape(), new CatchBlockPossibleShape()],
  null,
);
units.splice(tokenIndex, 1, clause);
clause.Parent = host;
statement.CatchClause = clause;
host.MountedUnit = clause;
return this.StampCreated(clause, context);
```
