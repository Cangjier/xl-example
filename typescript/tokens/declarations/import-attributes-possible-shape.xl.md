# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ImportAttributesShape } from "../members/import-attributes-shape.xl.md"
```

# namespace cangjie

# class ImportAttributesScan

## field Checked:int = 0

## field HasShape:bool = false

## field LastCode:int = -1

## field PreviousCode:int = -1

# class ImportAttributesPossibleShape extends PossibleShape

```txt
import a from "m" with { type: "json" };
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.Slot();
let state = cache.GetState<ImportAttributesScan>(name);
if (state === null) {
  state = new ImportAttributesScan();
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
  if (units[at] instanceof ImportAttributesShape) {
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
  // `with` / `assert` 只是属性段的分隔关键字，`{` 还在后面：候选继续活着。
  if (tail instanceof Common && ((tail as Common).Is("with") || (tail as Common).Is("assert"))) {
    return ShapeStates.Uncertain;
  }
  // 已经攒出形状时（例如模块字符串），属性段仍可能接在后面；trivia 的一次收尾不该把候选判死。
  if (!tail.IsBasicToken) {
    return ShapeStates.Uncertain;
  }
  return ShapeStates.Reject;
}
const previous = state.PreviousCode;
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
let at = index - 1;
while (at >= 0 && host.Data[at].IsTriviaToken) {
  at--;
}
if (at < 0 || !(host.Data[at] instanceof Common)) {
  return host;
}
const keyword = host.Data[at] as Common;
const shape = ImportAttributesShape.FromBracket(bracket, keyword.TempToString(), context);
// ImportAttributes 的 Pos 在 `with` / `assert` 关键字之前那一格（模块字符串的右边界之后）。
let before = at - 1;
while (before >= 0 && host.Data[before].IsTriviaToken) {
  before--;
}
if (before >= 0) {
  const beforeEnd = host.Data[before].SourceRange.EndIndex;
  if (beforeEnd >= 0) {
    shape.Pos = beforeEnd;
  }
} else if (bracket.SourceRange.StartIndex >= 0) {
  shape.Pos = bracket.SourceRange.StartIndex;
}
host.Data.splice(at, index - at + 1, shape);
shape.Parent = host;
return shape;
```
