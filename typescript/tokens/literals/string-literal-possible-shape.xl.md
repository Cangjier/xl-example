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

# class StringLiteralScan

## field Start:int = 0

## field Checked:int = 0

## field HasLiteral:bool = false

# class StringLiteralPossibleShape extends PossibleShape

```txt
"s"
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.constructor.name;
let state = cache.GetState<StringLiteralScan>(name);
if (state === null) {
  state = new StringLiteralScan();
  state.Start = ItemUtil.ItemStart(units);
  cache.SetState(name, state);
}
if (state.Checked > tokenIndex + 1) {
  state.Checked = 0;
  state.HasLiteral = false;
}
for (let at = state.Checked; at <= tokenIndex; at++) {
  if (units[at] instanceof StringLiteralShape) {
    state.HasLiteral = true;
  }
}
state.Checked = tokenIndex + 1;
if (state.HasLiteral) {
  return ShapeStates.Reject;
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
if (!(before instanceof Common)) {
  return ShapeStates.Reject;
}
const keyword = before as Common;
if (!keyword.Is("from") && !keyword.Is("import")) {
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
const scan = catalog.PossibleShapesComputeCache.GetState<StringLiteralScan>(this.constructor.name);
const itemStart = scan === null ? ItemUtil.ItemStart(host.Data) : scan.Start;
const token = host.Data[index] as String;
let previousCode = -1;
for (let at = index - 1; at >= itemStart; at--) {
  if (!host.Data[at].IsTriviaToken) {
    previousCode = at;
    break;
  }
}
const shape = StringLiteralShape.FromBasicToken(token);
if (previousCode >= 0 && host.Data[previousCode].SourceRange.End !== null) {
  const prevUnit = host.Data[previousCode];
  if (prevUnit.SourceRange.End !== null) {
    shape.Pos = prevUnit.SourceRange.End.Index + 1;
  }
} else if (token.SourceRange.Start !== null) {
  shape.Pos = token.SourceRange.Start.Index;
}
host.Data.splice(index, 1, shape);
shape.Parent = host;
return shape;
```
