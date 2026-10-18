# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { NamedImportsShape } from "./named-imports-shape.xl.md"
```

# namespace cangjie

# class NamedImportsPossibleShape extends PossibleShape

```txt
import a, { b } from "m";
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
for (const unit of units) {
  if (unit instanceof NamedImportsShape) {
    return ShapeStates.Reject;
  }
}
const last = ItemUtil.LastCodeInItem(units);
if (last < 0) {
  return ShapeStates.Uncertain;
}
const tail = units[last];
if (tail instanceof Bracket && (tail as Bracket).StartBracketChar === "{") {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
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
const shape = NamedImportsShape.FromBracket(bracket);
host.Data.splice(index, 1, shape);
shape.Parent = host;
return shape;
```
