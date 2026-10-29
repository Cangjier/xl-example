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
import { StatementUtil } from "./statement-util.xl.md"
import { ConditionCreatePossibleShape } from "../conditions/condition-create-possible-shape.xl.md"
import { IfStatementShape } from "./if-statement-shape.xl.md"
```

# namespace cangjie

# class IfStatementPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
const start = StatementUtil.StartIndex(units);
if (tokenIndex < start) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (!(unit instanceof Common)) {
  return ShapeStates.Reject;
}
if (!unit.Closed) {
  return ShapeStates.Uncertain;
}
if (tokenIndex !== start || unit.TempToString() !== "if") {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const start = StatementUtil.StartIndex(units);
if (tokenIndex !== start || tokenIndex !== units.length - 1) {
  return false;
}
const unit = units[tokenIndex];
return unit instanceof Common && unit.Closed && unit.TempToString() === "if";
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const keyword = units[tokenIndex] as Common;
const pos = ItemUtil.PositionOf(units, tokenIndex);
const statement = new IfStatementShape(host.Template);
statement.Pos = pos;
statement.SignIn(keyword.SourceRange.Start);
statement.CatalogGuide = new CatalogGuide([new ConditionCreatePossibleShape()], null);
units.splice(tokenIndex, 1, statement);
statement.Parent = host;
host.MountedUnit = statement;
return statement;
```
