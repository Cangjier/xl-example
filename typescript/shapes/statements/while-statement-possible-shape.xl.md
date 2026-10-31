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
import { WhileStatementShape } from "./while-statement-shape.xl.md"
```

# namespace cangjie

# class WhileStatementPossibleShape extends PossibleShape

`while` 关键字收口的那一刻就把整条语句建出来，条件括号交给 ConditionCreatePossibleShape，
与 `if` 走同一条条件通路。

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
if (tokenIndex !== start || unit.TempToString() !== "while") {
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
return unit instanceof Common && unit.Closed && unit.TempToString() === "while";
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const keyword = units[tokenIndex] as Common;
const pos = ItemUtil.PositionOf(units, tokenIndex);
const statement = new WhileStatementShape(host.Template);
statement.Kind = "while";
statement.Pos = pos;
statement.SignIn(keyword.SourceRange.Start);
statement.CatalogGuide = new CatalogGuide([new ConditionCreatePossibleShape()], null);
units.splice(tokenIndex, 1, statement);
statement.Parent = host;
host.MountedUnit = statement;
return this.StampCreated(statement, context);
```
