# dependencies
```xl
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { RegexToken } from "../../../../../core/syntax/basic-tokens/regex-token.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { IncrementalItemPosition } from "../../numeric-literal-possible-shape.xl.md"
import { ItemUtil } from "../../../item-util.xl.md"
import { RegularExpressionLiteralShape } from "../../../literals/regular-expression-literal-shape.xl.md"
import { PrimaryAtomGuard } from "./primary-atom-guard.xl.md"
```

# namespace cangjie

# class RegexLiteralPrimaryPossibleShape extends PossibleShape

WP-A1：声明初始化器位置的**正则字面量**（`let x = /r/`、`/[a-z\/]+/i`、`/ab/gimsuy` 等）。

词法层已经把 `/…/flags` 收成一个 `RegexToken` basic 单元（`ToText()` 就是 legacy 的 `text`）；本候选只在它关闭时
把它原位换成 `RegularExpressionLiteralShape`。legacy EOF 口径：`RegularExpressionLiteralShape  pos=7  src=[8,11)  text="/r/"`。

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

```ts
shapes.push(new RegexLiteralPrimaryPossibleShape());
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

判据：当前格是已关闭的 `RegexToken`。`=` 与 trivia → `Uncertain`（约束①）。

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
if (!(unit instanceof RegexToken)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

只对「初始化器 = 单个正则字面量」放行（第二道闸门见 `PrimaryAtomGuard`）。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken || !(unit instanceof RegexToken)) {
  return false;
}
return PrimaryAtomGuard.IsLoneAtom(units, tokenIndex, context, false);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const token = host.Data[tokenIndex];
if (!(token instanceof RegexToken)) {
  throw new Error("增量变量形状未支持：expression 正则字面量");
}
const shape = RegularExpressionLiteralShape.FromBasicToken(token, context);
shape.Pos = IncrementalItemPosition.AfterPreviousCode(host.Data, tokenIndex);
token.Replace(shape);
return shape;
```
