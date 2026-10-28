# dependencies
```xl
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../../../core/syntax/possible-source.xl.md"
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

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

```ts
shapes.push(new KeywordLiteralPrimaryPossibleShape());
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

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
