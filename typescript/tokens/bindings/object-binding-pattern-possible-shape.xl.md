# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ObjectBindingPatternShape } from "./object-binding-pattern-shape.xl.md"
```

# namespace cangjie

# class ObjectBindingPatternScan

## field Checked:int = 0

## field HasShape:bool = false

## field LastCode:int = -1

# class ObjectBindingPatternPossibleShape extends PossibleShape

```txt
const { a, b: c } = o;
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
// `{` 在声明位置才可能是解构 pattern（语句首的 `{` 是块，那是 statement 候选的事）；
// 本候选只回答「到 tokenIndex 为止最后一个非 trivia 单元是不是 `{` 括号」，候选由谁注册由 statements 家族决定。
// 扫到哪儿记进 cache（IMPORTANCE 3.4），不每次从头全量重扫。
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.Slot();
let state = cache.GetState<ObjectBindingPatternScan>(name);
if (state === null) {
  state = new ObjectBindingPatternScan();
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
  if (units[at] instanceof ObjectBindingPatternShape) {
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
return ShapeStates.Uncertain;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
// 把那个 `{...}` 括号换成一个 ObjectBindingPatternShape；Pos 口径与 ArrayBindingPatternPossibleShape 相同。
let index = tokenIndex;
while (index >= 0 && host.Data[index].IsTriviaToken) {
  index--;
}
if (index < 0 || !(host.Data[index] instanceof Bracket)) {
  return host;
}
const bracket = host.Data[index] as Bracket;
const shape = ObjectBindingPatternShape.FromBracket(bracket, context);
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
