# dependencies
```xl
import { Bracket } from "../../../../../core/syntax/basic-tokens/bracket.xl.md"
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
import { ExpressionBuilder } from "../../expression-builder.xl.md"
import { BinaryExpressionShape } from "../../binary-expression-shape.xl.md"
import { ParenthesizedExpressionShape } from "../../parenthesized-expression-shape.xl.md"
import { ItemUtil } from "../../../item-util.xl.md"
import { IncrementalItemPosition } from "../../numeric-literal-possible-shape.xl.md"
```

# namespace cangjie

# class ParenthesizedPossibleShape extends PossibleShape

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

```ts
shapes.push(new ParenthesizedPossibleShape());
```

## static method IsOperatorBefore:(unit:Token)=>bool

```ts
if (unit instanceof ShapeToken) {
  return unit.constructor.name.endsWith("TokenShape");
}
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  return text === "?" || text === ":";
}
return false;
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
if (!(unit instanceof Bracket)) {
  return ShapeStates.Reject;
}
if (!(unit as Bracket).Closed) {
  return ShapeStates.Uncertain;
}
if ((unit as Bracket).StartBracketChar !== "(") {
  return ShapeStates.Reject;
}
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previous < 0) {
  return ShapeStates.Reject;
}
return ParenthesizedPossibleShape.IsOperatorBefore(units[previous]) ? ShapeStates.Accept : ShapeStates.Reject;
```

## method ContinuationClaim:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return false;
}
if (!(unit instanceof Bracket)) {
  return false;
}
if ((unit as Bracket).StartBracketChar !== "(") {
  return false;
}
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previous < 0) {
  return false;
}
return ParenthesizedPossibleShape.IsOperatorBefore(units[previous]);
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
if (!(unit instanceof Bracket)) {
  return false;
}
return ParenthesizedPossibleShape.CanParseInside(unit as Bracket, context);
```

## static method CanParseInside:(bracket:Bracket, context:SyntaxContext)=>bool

```ts
const raw:Array<Token> = [];
for (const child of bracket.Data) {
  if (child.IsTriviaToken) {
    continue;
  }
  raw.push(child);
}
if (raw.length === 0) {
  return false;
}
let basePos = bracket.SourceRange.Start + 1;
const builder = new ExpressionBuilder(bracket.Template, context);
builder.Load(raw, basePos < 0 ? 0 : basePos);
try {
  builder.ParseExpression();
} catch (error) {
  return false;
}
return builder.At === builder.Units.length;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const bracket = host.Data[tokenIndex];
if (!(bracket instanceof Bracket)) {
  throw new Error("增量变量形状未支持：expression 括号");
}
const raw:Array<Token> = [];
for (const child of (bracket as Bracket).Data) {
  if (child.IsTriviaToken) {
    continue;
  }
  raw.push(child);
}
if (raw.length === 0) {
  throw new Error("增量变量形状未支持：expression 空括号");
}
let basePos = bracket.SourceRange.Start + 1;
if (basePos < 0) {
  basePos = 0;
}
const builder = new ExpressionBuilder(host.Template, context);
builder.Load(raw, basePos);
const inner = builder.ParseExpression();
if (builder.At !== builder.Units.length) {
  throw new Error("增量变量形状未支持：expression 括号内未读完");
}
const shape = new ParenthesizedExpressionShape(host.Template);
if (bracket.SourceRange.Start >= 0) {
  shape.SignIn(bracket.SourceRange.Start);
}
shape.Pos = IncrementalItemPosition.AfterPreviousCode(host.Data, tokenIndex);
shape.Add(inner);
if (bracket.SourceRange.End >= 0) {
  shape.SignOut(bracket.SourceRange.End);
}
if (shape.SourceRange.End < 0) {
  shape.TryToClose(context);
}
shape.Closed = true;
(bracket as Bracket).Replace(shape);
if (host instanceof BinaryExpressionShape) {
  (host as BinaryExpressionShape).SealRightOperand(context);
}
return shape;
```
