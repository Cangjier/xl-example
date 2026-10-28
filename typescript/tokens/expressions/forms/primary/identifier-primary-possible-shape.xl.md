# dependencies
```xl
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { IncrementalItemPosition } from "../../numeric-literal-possible-shape.xl.md"
import { ItemUtil } from "../../../item-util.xl.md"
import { IdentifierShape } from "../../../names/identifier-shape.xl.md"
import { PrimaryAtomGuard } from "./primary-atom-guard.xl.md"
```

# namespace cangjie

# class IdentifierPrimaryPossibleShape extends PossibleShape

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

```ts
shapes.push(new IdentifierPrimaryPossibleShape());
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
const common = unit as Common;
if (common.IsBigInt() || common.IsNumber()) {
  return ShapeStates.Reject;
}
if (common.IsAny(["true", "false", "null", "this", "new", "typeof", "void", "in", "instanceof"])) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## static field ContextualExpressionWords:Array<string> = ["yield"]

```ts
["yield"]
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return false;
}
if (!(unit instanceof Common)) {
  return false;
}
const common = unit as Common;
if (common.IsBigInt() || common.IsNumber() || common.IsAny(["true", "false", "null", "this", "new", "typeof", "void", "in", "instanceof"])) {
  return false;
}
if (common.IsAny(IdentifierPrimaryPossibleShape.ContextualExpressionWords)) {
  return false;
}
return PrimaryAtomGuard.IsLoneAtom(units, tokenIndex, context, true);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const token = host.Data[tokenIndex];
if (!(token instanceof Common)) {
  throw new Error("增量变量形状未支持：expression 标识符");
}
if (token.IsBigInt() || token.IsNumber() || token.IsAny(["true", "false", "null", "this", "new", "typeof", "void", "in", "instanceof"])) {
  throw new Error("增量变量形状未支持：expression 标识符 " + token.TempToString());
}
if (token.IsAny(IdentifierPrimaryPossibleShape.ContextualExpressionWords)) {
  // [R12] 与 `IsBuildable` 同一份判据：上下文关键字不走本候选（不然这里会是第二份判定）。
  throw new Error("增量变量形状未支持：上下文关键字不成标识符原子 " + token.TempToString());
}
const shape = IdentifierShape.FromBasicToken(token, context);
shape.Pos = IncrementalItemPosition.AfterPreviousCode(host.Data, tokenIndex);
token.Replace(shape);
return shape;
```
