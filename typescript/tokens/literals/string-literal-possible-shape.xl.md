# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { StringLiteralShape } from "./string-literal-shape.xl.md"
```

# namespace cangjie

# class StringLiteralScan

## field Start:int = 0

## field Checked:int = 0

## field HasLiteral:bool = false

## field LastCode:int = -1

## field PreviousCode:int = -1

# class StringLiteralPossibleShape extends PossibleShape

```txt
"s"
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.Slot();
let state = cache.GetState<StringLiteralScan>(name);
if (state === null) {
  state = new StringLiteralScan();
  state.Start = ItemUtil.ItemStartCached(units, cache);
  cache.SetState(name, state);
}
if (state.Checked > tokenIndex + 1) {
  state.Checked = 0;
  state.HasLiteral = false;
  state.LastCode = -1;
  state.PreviousCode = -1;
}
for (let at = state.Checked; at <= tokenIndex; at++) {
  if (!units[at].IsTriviaToken) {
    state.PreviousCode = state.LastCode;
    state.LastCode = at;
  }
  if (units[at] instanceof StringLiteralShape) {
    state.HasLiteral = true;
  }
}
state.Checked = tokenIndex + 1;
if (state.HasLiteral) {
  return ShapeStates.Reject;
}
const last = state.LastCode;
if (last < 0) {
  return ShapeStates.Uncertain;
}
if (!(units[last] instanceof String)) {
  // `from` 只是分隔符，模块字符串还在后面：候选继续活着，等 String 单元到了再判。
  if (units[last] instanceof Common && (units[last] as Common).Is("from")) {
    return ShapeStates.Uncertain;
  }
  // `export *` 的 `*` 后面既可能接 `as ns`、也可能直接接 `from "m"`：先别判死。
  if (units[last] instanceof Symbol && (units[last] as Symbol).Is("*")) {
    return ShapeStates.Uncertain;
  }
  // 已经攒出形状（例如具名导出子句）时，字符串仍可能接在 ``from`` 后面；一次 trivia 收尾
  // 不该把候选判死——判死之后本目录要到下一次 Reset 才会把它放回来，字符串就再也建不出来。
  if (!units[last].IsBasicToken) {
    return ShapeStates.Uncertain;
  }
  return ShapeStates.Reject;
}
const previous = state.PreviousCode;
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

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
let index = tokenIndex;
while (index >= 0 && host.Data[index].IsTriviaToken) {
  index--;
}
if (index < 0 || !(host.Data[index] instanceof String)) {
  return host;
}
const scan = catalog.PossibleShapesComputeCache.GetState<StringLiteralScan>(this.Slot());
const itemStart = scan === null ? ItemUtil.ItemStart(host.Data) : scan.Start;
const token = host.Data[index] as String;
let previousCode = -1;
for (let at = index - 1; at >= itemStart; at--) {
  if (!host.Data[at].IsTriviaToken) {
    previousCode = at;
    break;
  }
}
const shape = StringLiteralShape.FromBasicToken(token, context);
if (previousCode >= 0 && host.Data[previousCode].SourceRange.EndIndex >= 0) {
  const prevUnit = host.Data[previousCode];
  if (prevUnit.SourceRange.EndIndex >= 0) {
    shape.Pos = prevUnit.SourceRange.EndIndex;
  }
} else if (token.SourceRange.StartIndex >= 0) {
  shape.Pos = token.SourceRange.StartIndex;
}
host.Data.splice(index, 1, shape);
shape.Parent = host;
return shape;
```
