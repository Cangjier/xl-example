# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapePosition } from "../positions/shape-position.xl.md"
import { NamedExportsShape } from "./named-exports-shape.xl.md"
```

# namespace cangjie

# class NamedExportsScan

## field Checked:int = 0

## field HasShape:bool = false

## field LastCode:int = -1

## field PreviousCode:int = -1

# class NamedExportsPossibleShape extends PossibleShape

```txt
export { a };
export type { T };
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.Slot();
let state = cache.GetState<NamedExportsScan>(name);
if (state === null) {
  state = new NamedExportsScan();
  cache.SetState(name, state);
}
if (state.Checked > tokenIndex + 1) {
  state.Checked = 0;
  state.HasShape = false;
  state.LastCode = -1;
  state.PreviousCode = -1;
}
for (let at = state.Checked; at <= tokenIndex; at++) {
  if (!units[at].IsTriviaToken) {
    state.PreviousCode = state.LastCode;
    state.LastCode = at;
  }
  if (units[at] instanceof NamedExportsShape) {
    state.HasShape = true;
  }
}
state.Checked = tokenIndex + 1;
if (state.HasShape) {
  return ShapeStates.Reject;
}
const last = state.LastCode;
if (last < 0) {
  return ShapeStates.Uncertain;
}
const tail = units[last];
if (!(tail instanceof Bracket) || (tail as Bracket).StartBracketChar !== "{") {
  return ShapeStates.Reject;
}
const previous = state.PreviousCode;
if (previous < 0) {
  return ShapeStates.Reject;
}
const before = units[previous];
if (before instanceof Common && ((before as Common).Is("with") || (before as Common).Is("assert"))) {
  // 属性段也是 `{ … }`：它归 ImportAttributes，不归具名导出。
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
let index = tokenIndex;
while (index >= 0 && host.Data[index].IsTriviaToken) {
  index--;
}
if (index < 0 || !(host.Data[index] instanceof Bracket)) {
  return host;
}
const bracket = host.Data[index] as Bracket;
const shape = NamedExportsShape.FromBracket(bracket, context);
// Pos 是 `{` 前面那一格（`export` / `type`）的 End+1——括号外的那一格只有宿主看得见。
// [R3:POS] 口径交给 `ShapePosition.PosAt`，见 named-imports 同款注释。
shape.Pos = ShapePosition.PosAt(host, host.Data, index);
host.Data.splice(index, 1, shape);
shape.Parent = host;
return shape;
```
