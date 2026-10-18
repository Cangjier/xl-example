# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { StringLiteralShape } from "./string-literal-shape.xl.md"
```

# namespace cangjie

# class StringLiteralPossibleShape extends PossibleShape

```txt
"s"
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
for (const unit of units) {
  if (unit instanceof StringLiteralShape) {
    return ShapeStates.Reject;
  }
}
const last = ItemUtil.LastCodeInItem(units);
if (last < 0) {
  return ShapeStates.Uncertain;
}
if (!(units[last] instanceof String)) {
  return ShapeStates.Reject;
}
const previous = ItemUtil.PreviousCode(units, last - 1);
if (previous < 0) {
  return ShapeStates.Reject;
}
const before = units[previous];
if (!(before instanceof Common) || !(before as Common).Is("from")) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide)=>Token

```ts
let index = tokenIndex;
while (index >= 0 && host.Data[index].IsTriviaToken) {
  index--;
}
if (index < 0 || !(host.Data[index] instanceof String)) {
  return host;
}
const token = host.Data[index] as String;
const shape = StringLiteralShape.FromToken(token);
host.Data.splice(index, 1, shape);
shape.Parent = host;
return shape;
```
