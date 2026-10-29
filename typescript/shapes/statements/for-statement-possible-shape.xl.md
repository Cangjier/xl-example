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
import { ForHeadShape } from "./for-head-shape.xl.md"
import { ForOpenPossibleShape } from "./for-head-opening.xl.md"
```

# namespace cangjie

# class ForStatementPossibleShape extends PossibleShape

`for` 关键字：先建解析期的 ForHeadShape，`(` 由 ForOpenPossibleShape 认领。
到 `)` 再按头部形态换成真正的语句节点。

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
if (tokenIndex !== start || unit.TempToString() !== "for") {
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
return unit instanceof Common && unit.Closed && unit.TempToString() === "for";
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const keyword = units[tokenIndex] as Common;
const head = new ForHeadShape(host.Template);
head.Pos = ItemUtil.PositionOf(units, tokenIndex);
head.SignIn(keyword.SourceRange.Start);
head.CatalogGuide = new CatalogGuide([new ForOpenPossibleShape()], null);
units.splice(tokenIndex, 1, head);
head.Parent = host;
host.MountedUnit = head;
return head;
```
