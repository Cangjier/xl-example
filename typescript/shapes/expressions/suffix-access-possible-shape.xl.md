# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { OperandUtil } from "./operand-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { ElementAccessExpressionShape } from "./element-access-expression-shape.xl.md"
import { PropertyAccessExpressionShape } from "./property-access-expression-shape.xl.md"
import { QuestionDotTokenShape } from "./question-dot-token-shape.xl.md"
import { SuffixAccessUtil } from "./suffix-access-util.xl.md"
```

# namespace cangjie

# class SuffixAccessPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (!unit.Closed) {
  return ShapeStates.Uncertain;
}
const kind = SuffixAccessPossibleShape.KindOf(units, tokenIndex);
if (kind === "pending") {
  return ShapeStates.Uncertain;
}
if (kind === "") {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const kind = SuffixAccessPossibleShape.KindOf(units, tokenIndex);
return kind === "name" || kind === "element-argument" || kind === "element-close";
```

## static method KindOf:(units:Array<Token>, tokenIndex:int)=>string

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return "";
}
const unit = units[tokenIndex];
if (unit instanceof Symbol) {
  return SuffixAccessPossibleShape.SymbolKind(units, tokenIndex);
}
if (unit instanceof Common) {
  return SuffixAccessPossibleShape.NameKind(units, tokenIndex);
}
return "";
```

## static method SymbolKind:(units:Array<Token>, tokenIndex:int)=>string

```ts
const unit = units[tokenIndex] as Symbol;
if (!unit.Closed) {
  return "";
}
if (unit.Is("]")) {
  return SuffixAccessPossibleShape.ElementCloseKind(units, tokenIndex);
}
if (!unit.IsAny([".", "?.", "["])) {
  return "";
}
const leftIndex = SuffixAccessUtil.LeftOf(units, tokenIndex);
if (leftIndex < 0 || !SuffixAccessUtil.IsOperandForSuffix(units[leftIndex])) {
  return "";
}
return "pending";
```

## static method ElementCloseKind:(units:Array<Token>, tokenIndex:int)=>string

```ts
const before = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (before < 0) {
  return "";
}
const shape = units[before];
if (shape instanceof ElementAccessExpressionShape && shape.AwaitingClose) {
  return "element-close";
}
return "";
```

## static method NameKind:(units:Array<Token>, tokenIndex:int)=>string

```ts
const unit = units[tokenIndex] as Common;
if (!unit.Closed) {
  return "";
}
const symbolIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (symbolIndex < 0) {
  return "";
}
const symbol = units[symbolIndex];
if (!(symbol instanceof Symbol) || !symbol.Closed) {
  return "";
}
if (symbol.Is(".") || symbol.Is("?.")) {
  const leftIndex = SuffixAccessUtil.LeftOf(units, symbolIndex);
  if (leftIndex < 0 || !SuffixAccessUtil.IsOperandForSuffix(units[leftIndex])) {
    return "";
  }
  return "name";
}
if (symbol.Is("[")) {
  const leftIndex = SuffixAccessUtil.LeftOf(units, symbolIndex);
  if (leftIndex < 0 || !SuffixAccessUtil.IsOperandForSuffix(units[leftIndex])) {
    return "";
  }
  return "element-argument";
}
return "";
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const kind = SuffixAccessPossibleShape.KindOf(units, tokenIndex);
if (kind === "name") {
  return this.BuildProperty(host, units, tokenIndex, context);
}
if (kind === "element-argument") {
  return this.BuildElement(host, units, tokenIndex, context);
}
if (kind === "element-close") {
  return this.CloseElement(units, tokenIndex, context);
}
throw new Error("SuffixAccessPossibleShape: 没有可以构建的后缀访问");
```

## private method BuildProperty:(host:Token, units:Array<Token>, nameIndex:int, context:SyntaxContext)=>Token

```ts
const common = units[nameIndex] as Common;
const symbolIndex = ItemUtil.PreviousCode(units, nameIndex - 1);
const symbol = units[symbolIndex] as Symbol;
const leftIndex = SuffixAccessUtil.LeftOf(units, symbolIndex);
const left = units[leftIndex];
const namePos = OperandUtil.PositionOf(units, nameIndex);
const name = OperandUtil.FromCommon(common, namePos);
const shape = new PropertyAccessExpressionShape(host.Template);
shape.Pos = SuffixAccessUtil.PosOf(left);
shape.SignIn(left.SourceRange.Start);
shape.Add(left);
shape.Left = left;
const questionDotIndex = SuffixAccessUtil.QuestionDotOf(units, symbolIndex);
if (questionDotIndex >= 0) {
  const questionDot = QuestionDotTokenShape.FromSymbol(units[questionDotIndex] as Symbol, OperandUtil.PositionOf(units, questionDotIndex));
  shape.Add(questionDot);
  shape.QuestionDot = questionDot;
}
shape.Add(name);
shape.SourceRange.End = common.SourceRange.End;
shape.Closed = true;
units.splice(leftIndex, nameIndex - leftIndex + 1, shape);
shape.Parent = host;
return this.StampCreated(shape, context);
```

## private method BuildElement:(host:Token, units:Array<Token>, argumentIndex:int, context:SyntaxContext)=>Token

```ts
const common = units[argumentIndex] as Common;
const bracketIndex = ItemUtil.PreviousCode(units, argumentIndex - 1);
const leftIndex = SuffixAccessUtil.LeftOf(units, bracketIndex);
const left = units[leftIndex];
const argumentPos = OperandUtil.PositionOf(units, argumentIndex);
const argument = OperandUtil.FromCommon(common, argumentPos);
const shape = new ElementAccessExpressionShape(host.Template);
shape.Pos = SuffixAccessUtil.PosOf(left);
shape.SignIn(left.SourceRange.Start);
shape.Add(left);
shape.Left = left;
const questionDotIndex = SuffixAccessUtil.QuestionDotOf(units, bracketIndex);
if (questionDotIndex >= 0) {
  const questionDot = QuestionDotTokenShape.FromSymbol(units[questionDotIndex] as Symbol, OperandUtil.PositionOf(units, questionDotIndex));
  shape.Add(questionDot);
  shape.QuestionDot = questionDot;
}
shape.Add(argument);
shape.SourceRange.End = common.SourceRange.End;
shape.AwaitingClose = true;
shape.Closed = true;
units.splice(leftIndex, argumentIndex - leftIndex + 1, shape);
shape.Parent = host;
return this.StampCreated(shape, context);
```

## private method CloseElement:(units:Array<Token>, closeIndex:int, context:SyntaxContext)=>Token

```ts
const bracket = units[closeIndex] as Symbol;
const shapeIndex = ItemUtil.PreviousCode(units, closeIndex - 1);
const shape = units[shapeIndex] as ElementAccessExpressionShape;
shape.SourceRange.End = bracket.SourceRange.End;
shape.AwaitingClose = false;
shape.Closed = true;
units.splice(shapeIndex + 1, closeIndex - shapeIndex);
return this.StampCreated(shape, context);
```
