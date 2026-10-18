# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { ImportAttributesShape } from "../members/import-attributes-shape.xl.md"
```

# namespace cangjie

# class ImportAttributesPossibleShape extends PossibleShape

```txt
import a from "m" with { type: "json" };
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
for (const unit of units) {
  if (unit instanceof ImportAttributesShape) {
    return ShapeStates.Reject;
  }
}
const last = ItemUtil.LastCodeInItem(units);
if (last < 0) {
  return ShapeStates.Uncertain;
}
const tail = units[last];
if (!(tail instanceof Bracket) || (tail as Bracket).StartBracketChar !== "{") {
  return ShapeStates.Reject;
}
const previous = ItemUtil.PreviousCode(units, last - 1);
if (previous < 0) {
  return ShapeStates.Reject;
}
const keyword = units[previous];
if (!(keyword instanceof Common)) {
  return ShapeStates.Reject;
}
if (!(keyword as Common).Is("with") && !(keyword as Common).Is("assert")) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context?:SyntaxContext)=>Token

```ts
let index = tokenIndex;
while (index >= 0 && host.Data[index].IsTriviaToken) {
  index--;
}
if (index < 0 || !(host.Data[index] instanceof Bracket)) {
  return host;
}
const bracket = host.Data[index] as Bracket;
let at = index - 1;
while (at >= 0 && host.Data[at].IsTriviaToken) {
  at--;
}
if (at < 0 || !(host.Data[at] instanceof Common)) {
  return host;
}
const keyword = host.Data[at] as Common;
const shape = ImportAttributesShape.FromBracket(bracket, keyword.TempToString());
host.Data.splice(at, index - at + 1, shape);
shape.Parent = host;
return shape;
```
