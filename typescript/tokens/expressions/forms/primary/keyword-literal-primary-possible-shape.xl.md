# dependencies
```xl
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../../../core/syntax/shape-token.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { IncrementalItemPosition } from "../../numeric-literal-possible-shape.xl.md"
import { ItemUtil } from "../../../item-util.xl.md"
import { FalseKeywordShape } from "../../../keywords/false-keyword-shape.xl.md"
import { NullKeywordShape } from "../../../keywords/null-keyword-shape.xl.md"
import { TrueKeywordShape } from "../../../keywords/true-keyword-shape.xl.md"
import { PrimaryAtomGuard } from "./primary-atom-guard.xl.md"
```

# namespace cangjie

# class KeywordLiteralPrimaryPossibleShape extends PossibleShape

WP-A1：声明初始化器位置的**布尔 / null 关键字字面量**（`true` / `false` / `null`）。

legacy EOF 口径（`expr-probe` 实测）：`TrueKeywordShape  pos=7  src=[8,12)`（`FalseKeywordShape` / `NullKeywordShape`
同型）——是**关键字形状**、不是 `IdentifierShape`，`src` 覆盖整个关键字、不带 `text` 字段。

与 `IdentifierPrimaryPossibleShape` 互斥：后者对这三个文本 `Reject`。

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

```ts
shapes.push(new KeywordLiteralPrimaryPossibleShape());
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

判据：当前格是已关闭的 `Common`，且文本是 `true` / `false` / `null`。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
const start = ItemUtil.ItemStartCached(units, cache);
if (tokenIndex < start) {
  return ShapeStates.Reject;
}
if (unit instanceof Symbol) {
  if ((unit as Symbol).Is("=")) {
    return ShapeStates.Uncertain;
  }
  return ShapeStates.Reject;
}
if (!(unit instanceof Common)) {
  return ShapeStates.Reject;
}
if (!(unit as Common).IsAny(["true", "false", "null"])) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

只对「初始化器 = 单个关键字字面量」放行（第二道闸门见 `PrimaryAtomGuard`）。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken || !(unit instanceof Common)) {
  return false;
}
if (!(unit as Common).IsAny(["true", "false", "null"])) {
  return false;
}
return PrimaryAtomGuard.IsLoneAtom(units, tokenIndex, context, false);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

按文本造三种关键字形状之一：签入 / 签出取关键字自己的区间，`Pos` = 前一个非 trivia 单元的 `EndIndex`（C1），
`TryToClose` 后原位 `Replace`。

```ts
const token = host.Data[tokenIndex];
if (!(token instanceof Common)) {
  throw new Error("增量变量形状未支持：expression 关键字字面量");
}
const text = token.TempToString();
let shape:ShapeToken;
if (text === "true") {
  shape = new TrueKeywordShape(token.Template);
} else if (text === "false") {
  shape = new FalseKeywordShape(token.Template);
} else if (text === "null") {
  shape = new NullKeywordShape(token.Template);
} else {
  throw new Error("增量变量形状未支持：expression 关键字字面量 " + text);
}
if (token.SourceRange.StartIndex >= 0) {
  shape.SignIn(token.SourceRange.StartIndex);
}
if (token.SourceRange.EndIndex >= 0) {
  shape.SignOut(token.SourceRange.EndIndex);
}
shape.Pos = IncrementalItemPosition.AfterPreviousCode(host.Data, tokenIndex);
shape.TryToClose(context);
token.Replace(shape);
return shape;
```
