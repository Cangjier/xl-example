# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { NamedImportsShape } from "./named-imports-shape.xl.md"
```

# namespace cangjie

# class NamedImportsScan

## field Checked:int = 0

## field HasShape:bool = false

## field LastCode:int = -1

# class NamedImportsPossibleShape extends PossibleShape

```txt
import a, { b } from "m";
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.Slot();
let state = cache.GetState<NamedImportsScan>(name);
if (state === null) {
  state = new NamedImportsScan();
  cache.SetState(name, state);
}
if (state.Checked > tokenIndex + 1) {
  state.Checked = 0;
  state.HasShape = false;
  state.LastCode = -1;
}
for (let at = state.Checked; at <= tokenIndex; at++) {
  if (!units[at].IsTriviaToken) {
    state.LastCode = at;
  }
  if (units[at] instanceof NamedImportsShape) {
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
if (tail instanceof Bracket && (tail as Bracket).StartBracketChar === "{") {
  return ShapeStates.Accept;
}
if (tail instanceof Symbol && (tail as Symbol).Is(",")) {
  // 逗号只是「具名导入还没开始」：子句要在它后面继续长，候选不能在这里判死。
  return ShapeStates.Uncertain;
}
return ShapeStates.Reject;
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
const shape = NamedImportsShape.FromBracket(bracket, context);
// Pos 是 `{` 前面那一格（默认导入后是逗号）的 End+1——括号外的那一格只有宿主看得见。
let previous = -1;
for (let at = index - 1; at >= 0; at--) {
  if (!host.Data[at].IsTriviaToken) {
    previous = at;
    break;
  }
}
if (previous >= 0) {
  const previousEnd = host.Data[previous].SourceRange.EndIndex;
  if (previousEnd >= 0) {
    shape.Pos = previousEnd;
  }
} else if (bracket.SourceRange.StartIndex >= 0) {
  shape.Pos = bracket.SourceRange.StartIndex;
}
host.Data.splice(index, 1, shape);
shape.Parent = host;
return shape;
```
