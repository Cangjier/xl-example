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
import { OperandUtil } from "../expressions/operand-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { StatementUtil } from "./statement-util.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { VariableDeclarationShape } from "../declarations/variable-declaration-shape.xl.md"
import { VariableDeclarationListShape } from "../declarations/variable-declaration-list-shape.xl.md"
import { ForHeadShape } from "./for-head-shape.xl.md"
import { ForOfInKeywordPossibleShape } from "./for-of-in-keyword-possible-shape.xl.md"
import { ForClosePossibleShape } from "./for-close-possible-shape.xl.md"
import { ForClauseStartPossibleShape } from "./for-clause-start-possible-shape.xl.md"
import { ForDeclarationInitPossibleShape } from "./for-declaration-init-possible-shape.xl.md"
```

# namespace cangjie

# class ForOpenPossibleShape extends PossibleShape


## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof ForHeadShape) || host.Init !== null || host.Mode !== "") {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed) {
  return ShapeStates.Reject;
}
if (!unit.Is("(")) {
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
return unit instanceof Symbol && unit.Closed && unit.Is("(");
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const head = host as ForHeadShape;
const index = head.DropTriviaBefore(tokenIndex);
const open = head.Data[index] as Symbol;
head.Data.splice(index, 1);
head.CatalogGuide = new CatalogGuide(
  [new ForBindingPossibleShape(), new ForClauseStartPossibleShape(), new ForSemicolonPossibleShape()],
  null,
);
head.MountedUnit = null;
return this.StampCreated(open, context);
```

# class ForBindingPossibleShape extends PossibleShape


## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof ForHeadShape) || host.Init !== null || host.Mode !== "") {
  return ShapeStates.Reject;
}
const units = host.Data;
const start = StatementUtil.StartIndex(units, tokenIndex, cache);
if (tokenIndex < start) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (!(unit instanceof Common)) {
  return ShapeStates.Reject;
}
if (!unit.Closed) {
  return ShapeStates.Uncertain;
}
if (tokenIndex !== start) {
  return ShapeStates.Reject;
}
if (unit.IsAny(["let", "const", "var"])) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Common) || !unit.Closed) {
  return false;
}
const start = StatementUtil.StartIndex(units, tokenIndex, cache);
if (tokenIndex !== start) {
  return false;
}
return unit.IsAny(["let", "const", "var"]);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const head = host as ForHeadShape;
const common = head.Data[tokenIndex] as Common;
head.CatalogGuide = new CatalogGuide([new ForDeclarationNamePossibleShape()], null);
head.MountedUnit = null;
return this.StampCreated(common, context);
```

# class ForDeclarationNamePossibleShape extends PossibleShape


## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof ForHeadShape) || host.Init !== null || host.Mode !== "") {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (!(unit instanceof Common)) {
  return ShapeStates.Reject;
}
if (!unit.Closed) {
  return ShapeStates.Uncertain;
}
const keywordIndex = StatementUtil.StartIndex(units, tokenIndex, cache);
const nameIndex = StatementUtil.NextCode(units, keywordIndex + 1, tokenIndex + 1);
if (nameIndex !== tokenIndex || tokenIndex !== units.length - 1) {
  return ShapeStates.Reject;
}
const keyword = units[keywordIndex];
if (!(keyword instanceof Common) || !keyword.Closed || !keyword.IsAny(["let", "const", "var"])) {
  return ShapeStates.Reject;
}
if (!OperandUtil.CanStartExpression(unit)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex !== units.length - 1) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Common) || !unit.Closed || !OperandUtil.CanStartExpression(unit)) {
  return false;
}
const keywordIndex = StatementUtil.StartIndex(units, tokenIndex, cache);
const keyword = units[keywordIndex];
return keyword instanceof Common && keyword.Closed && keyword.IsAny(["let", "const", "var"]);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const head = host as ForHeadShape;
const units = head.Data;
const keywordIndex = StatementUtil.StartIndex(units, tokenIndex, catalog.PossibleShapesComputeCache);
const nameIndex = StatementUtil.NextCode(units, keywordIndex + 1);
const keyword = units[keywordIndex] as Common;
const common = units[nameIndex] as Common;
const list = new VariableDeclarationListShape(host.Template);
list.Pos = ItemUtil.PositionOf(units, keywordIndex);
list.SignIn(keyword.SourceRange.Start);
const identifierPos = ItemUtil.PositionOf(units, nameIndex);
const identifier = IdentifierShape.FromCommon(common, identifierPos);
const declaration = new VariableDeclarationShape(host.Template);
declaration.Pos = identifierPos;
declaration.SignIn(identifier.SourceRange.Start);
declaration.Add(identifier);
declaration.SignOut(identifier.SourceRange.End);
declaration.TryToClose(context);
list.Add(declaration);
list.SignOut(identifier.SourceRange.End);
units.splice(keywordIndex, nameIndex - keywordIndex + 1, list);
list.Parent = head;
head.Init = list;
head.CatalogGuide = new CatalogGuide(
  [new ForDeclarationInitPossibleShape(), new ForOfInKeywordPossibleShape()],
  null,
);
head.MountedUnit = null;
return this.StampCreated(list, context);
```

# class ForSemicolonPossibleShape extends PossibleShape


## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof ForHeadShape)) {
  return ShapeStates.Reject;
}
if (host.Mode !== "" && host.Mode !== "classic") {
  return ShapeStates.Reject;
}
if (host.Segment >= 2) {
  return ShapeStates.Reject;
}
if (host.Segment === 0 && host.Init !== null) {
  return ShapeStates.Reject;
}
if (host.Segment === 1 && host.Condition !== null) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is(";")) {
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
return unit instanceof Symbol && unit.Closed && unit.Is(";");
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const head = host as ForHeadShape;
const index = head.DropTriviaBefore(tokenIndex);
const semicolon = head.Data[index] as Symbol;
head.Data.splice(index, 1);
head.Mode = "classic";
if (head.Segment === 0) {
  head.Segment = 1;
  head.CatalogGuide = new CatalogGuide(
    [new ForClauseStartPossibleShape(), new ForSemicolonPossibleShape(), new ForClosePossibleShape()],
    null,
  );
} else {
  head.Segment = 2;
  head.CatalogGuide = new CatalogGuide(
    [new ForClauseStartPossibleShape(), new ForClosePossibleShape()],
    null,
  );
}
head.MountedUnit = null;
return this.StampCreated(semicolon, context);
```
