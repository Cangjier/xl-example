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
import { ForClauseShape } from "./for-clause-shape.xl.md"
import { ForHeadShape } from "./for-head-shape.xl.md"
import { ForSourcePossibleShape } from "./for-source-possible-shape.xl.md"
import { TokenIndex } from "../../../core/syntax/token-index.xl.md"
```

# namespace cangjie

# class ForOfInKeywordPossibleShape extends PossibleShape


## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
if (host instanceof ForClauseShape) {
  return this.ComputeInClause(host as ForClauseShape, tokenIndex);
}
if (!(host instanceof ForHeadShape) || host.Init === null || host.Mode !== "" || host.Right !== null) {
  return ShapeStates.Reject;
}
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = index.At(tokenIndex);
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (!(unit instanceof Common) || !unit.Closed || !unit.IsAny(["of", "in"])) {
  return ShapeStates.Reject;
}
const prevIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (prevIndex < 0 || units[prevIndex] !== host.Init) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## private method ComputeInClause:(clause:ForClauseShape, tokenIndex:int)=>ShapeStates

```ts
if (clause.Role !== 0) {
  return ShapeStates.Reject;
}
const head = clause.Parent;
if (!(head instanceof ForHeadShape) || head.Init !== null || head.Mode !== "" || head.Right !== null) {
  return ShapeStates.Reject;
}
const units = clause.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (!(unit instanceof Common) || !unit.Closed || !unit.IsAny(["of", "in"])) {
  return ShapeStates.Reject;
}
let expression: Token | null = null;
let codeCount = 0;
for (const item of units) {
  if (item.IsTriviaToken || item === unit) {
    continue;
  }
  codeCount++;
  if (expression === null) {
    expression = item;
  }
}
if (codeCount !== 1 || expression === null || !expression.Closed) {
  return ShapeStates.Reject;
}
const prevIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (prevIndex < 0 || units[prevIndex] !== expression) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = index.At(tokenIndex);
return unit instanceof Common && unit.Closed && unit.IsAny(["of", "in"]);
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
if (host instanceof ForClauseShape) {
  return this.BuildInClause(host as ForClauseShape, tokenIndex, context);
}
const head = host as ForHeadShape;
const shapeIndex = head.DropTriviaBefore(tokenIndex);
const keyword = head.Data[shapeIndex] as Common;
head.Mode = keyword.TempToString();
head.Data.splice(shapeIndex, 1);
head.CatalogGuide = new CatalogGuide([new ForSourcePossibleShape()], null);
head.MountedUnit = null;
return this.StampCreated(keyword, context);
```

## private method BuildInClause:(clause:ForClauseShape, tokenIndex:int, context:SyntaxContext)=>Token

```ts
const head = clause.Parent as ForHeadShape;
const units = clause.Data;
const keyword = units[tokenIndex] as Common;
let at = tokenIndex - 1;
while (at >= 0 && units[at].IsTriviaToken) {
  at--;
}
const start = at + 1;
units.splice(start, tokenIndex - start);
units.splice(start, 1);
const code = units.filter((item) => !item.IsTriviaToken);
if (code.length !== 1) {
  throw new Error("ForOfInKeywordPossibleShape: for 子句里没有唯一的表达式");
}
const expression = code[0];
units.length = 0;
clause.Closed = true;
const headIndex = head.Data.indexOf(clause);
if (headIndex < 0) {
  throw new Error("ForOfInKeywordPossibleShape: for 子句不在 for 头部里");
}
head.Data.splice(headIndex, 1, expression);
expression.Parent = head;
head.Init = expression;
head.Mode = keyword.TempToString();
head.CatalogGuide = new CatalogGuide([new ForSourcePossibleShape()], null);
head.MountedUnit = null;
clause.Quit();
return this.StampCreated(keyword, context);
```
