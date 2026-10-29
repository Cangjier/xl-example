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
import { ForHeadShape } from "./for-head-shape.xl.md"
import { ForSourcePossibleShape } from "./for-source-possible-shape.xl.md"
```

# namespace cangjie

# class ForOfInKeywordPossibleShape extends PossibleShape

`for (v of …)` / `for (k in …)` 的 `of` / `in`（上下文关键字，本身不进 AST）。

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof ForHeadShape) || host.Init === null || host.Mode !== "" || host.Right !== null) {
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
if (!(unit instanceof Common) || !unit.Closed || !unit.IsAny(["of", "in"])) {
  return ShapeStates.Reject;
}
const prevIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (prevIndex < 0 || units[prevIndex] !== host.Init) {
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
return unit instanceof Common && unit.Closed && unit.IsAny(["of", "in"]);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const head = host as ForHeadShape;
const index = head.DropTriviaBefore(tokenIndex);
const keyword = head.Data[index] as Common;
head.Mode = keyword.TempToString();
head.Data.splice(index, 1);
head.CatalogGuide = new CatalogGuide([new ForSourcePossibleShape()], null);
head.MountedUnit = null;
return keyword;
```
