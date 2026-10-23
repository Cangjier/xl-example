# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { BindingElementShape } from "./binding-element-shape.xl.md"
```

# namespace cangjie

# class BindingElementScan

## field Checked:int = 0

## field LastCode:int = -1

## field HasShape:bool = false

# class BindingElementPossibleShape extends PossibleShape

```txt
const { a: b = 1 } = o;
const [a, ...rest] = xs;
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
// binding element 没有自己能独占的开头字符（名字 / `...` 都太普通），它只在「已经是 pattern 内部」时成立；
// 所以本候选的判定是：到 tokenIndex 为止的这一组单元已经是一个**完整的** element，
// 且下一个非 trivia 单元是 element 分隔符（`,` / `}` / `]`）——此刻才能建，早一步建会把 `{ a = b + c }` 截断。
// 扫到哪儿记进 cache（IMPORTANCE 3.4）。
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.Slot();
let state = cache.GetState<BindingElementScan>(name);
if (state === null) {
  state = new BindingElementScan();
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
  if (units[at] instanceof BindingElementShape) {
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
// 组内单元（本形状只看 `,` 之后、到 tokenIndex 为止的非 trivia 单元）。
let group:Array<Token> = [];
for (let at = 0; at <= tokenIndex; at++) {
  if (units[at].IsTriviaToken) {
    continue;
  }
  if (units[at] instanceof Symbol && (units[at] as Symbol).Is(",")) {
    group = [];
    continue;
  }
  group.push(units[at]);
}
// 结构校验：`...`? 名字 (`:` 名字)? (`=` 已完整)? ——与 BindingElementShape.FromTokens 的切法一致。
let index = 0;
while (index < group.length && group[index] instanceof Symbol && (group[index] as Symbol).Is(".")) {
  index++;
}
if (index === 1 || index === 2) {
  // 还没走满三个点：是 `...` 的前缀，继续等。
  return ShapeStates.Uncertain;
}
if (index >= group.length) {
  return ShapeStates.Uncertain;
}
index++;
if (index < group.length && group[index] instanceof Symbol && (group[index] as Symbol).Is(":")) {
  index++;
  if (index >= group.length) {
    return ShapeStates.Uncertain;
  }
  index++;
}
if (index < group.length && group[index] instanceof Symbol && (group[index] as Symbol).Is("=")) {
  index++;
  if (index >= group.length) {
    return ShapeStates.Uncertain;
  }
  return ShapeStates.Uncertain;
}
if (index !== group.length) {
  return ShapeStates.Reject;
}
// 完整了，但要点在分隔符上才建（否则下一个单元可能是 `:` / `=`，那这一组还会继续长）。
let next = -1;
for (let at = tokenIndex + 1; at < units.length; at++) {
  if (!units[at].IsTriviaToken) {
    next = at;
    break;
  }
}
if (next < 0) {
  return ShapeStates.Uncertain;
}
const follower = units[next];
if (follower instanceof Symbol && (follower as Symbol).Is(",")) {
  return ShapeStates.Accept;
}
if (follower instanceof Symbol && ((follower as Symbol).Is("}") || (follower as Symbol).Is("]"))) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
// 把这一组单元换成一个 BindingElementShape：取到 tokenIndex 为止的非 trivia 单元，
// 从上一个 `,` 之后开始算组，整组（首单元到末单元）一起换成形状，Pos 取组首前的 End+1。
let first = tokenIndex;
while (first >= 0 && host.Data[first].IsTriviaToken) {
  first--;
}
if (first < 0) {
  return host;
}
let start = first;
while (start > 0) {
  const previous = host.Data[start - 1];
  if (previous.IsTriviaToken) {
    start--;
    continue;
  }
  if (previous instanceof Symbol && (previous as Symbol).Is(",")) {
    break;
  }
  start--;
}
const tokens:Array<Token> = [];
for (let at = start; at <= first; at++) {
  if (!host.Data[at].IsTriviaToken) {
    tokens.push(host.Data[at]);
  }
}
const shape = BindingElementShape.FromTokens(tokens, context, -1);
if (shape === null) {
  return host;
}
let previous = -1;
for (let at = start - 1; at >= 0; at--) {
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
}
host.Data.splice(start, first - start + 1, shape);
shape.Parent = host;
return shape;
```
