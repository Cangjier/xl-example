# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { TokenIndex } from "../../../core/syntax/token-index.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { OperandUtil } from "../expressions/operand-util.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { NumericLiteralShape } from "../literals/numeric-literal-shape.xl.md"
import { StringLiteralShape } from "../literals/string-literal-shape.xl.md"
import { AssertsKeywordShape } from "./type-token-shapes.xl.md"
import { TypeShape } from "./type-shape.xl.md"
import { FunctionTypeShape } from "./type-node-shapes.xl.md"
import { ParenthesizedTypeShape } from "./type-node-shapes.xl.md"
import { LiteralTypeShape } from "./type-node-shapes.xl.md"
import { TypePredicateShape } from "./type-node-shapes.xl.md"
import { TypeReferenceShape } from "./type-node-shapes.xl.md"
import { TypeAliasDeclarationShape } from "./type-alias-declaration-shape.xl.md"
import { TypeAliasEndPossibleShape } from "./type-alias-end-possible-shape.xl.md"
import { TypeParameterListShape } from "./type-parameter-list-shape.xl.md"
import { TypeBodyUtil } from "./type-body-util.xl.md"
import { TypeConditionalScan } from "./type-conditional-scan-util.xl.md"
import { TypeBalanceUtil } from "./type-balance-util.xl.md"
import { TypeKeywordUtil } from "./type-keyword-util.xl.md"
import { TypeParserApi } from "./type-parser-api.xl.md"
import { FunctionBuild } from "./forms/function-shapes.xl.md"
```


# namespace cangjie

# class ReturnTypeContextShape extends TypeShape

## field Predicate:TypePredicateShape | null = null

## method Finish:(context:SyntaxContext)=>Token

```ts
let type:Token;
if (this.Predicate !== null) {
  for (const item of this.Data) {
    if (item === this.Predicate || item.IsTriviaToken) {
      continue;
    }
    throw new Error("ReturnTypeContextShape: 类型谓词之后暂不支持更复杂的返回类型");
  }
  if (!this.Predicate.Closed) {
    this.Predicate.TryToClose(context);
  }
  type = this.Predicate;
} else {
  type = FunctionBuild.FinishReturn(this) ?? TypeParserApi.ParseCompleteReturnType(this.Data, this.Data.length, this.Template);
}
this.Data = [type];
type.Parent = this;
this.SourceRange.End = type.SourceRange.End;
return type;
```

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
const type = this.Finish(context);
const parent = this.Parent;
if (parent !== null) {
  const at = parent.Data.indexOf(this);
  if (at >= 0) {
    parent.Data.splice(at, 1, type);
    type.Parent = parent;
  }
}
this.Closed = true;
return CloseStates.Nothing;
```

# class TypeFunctionArrowPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
if (!(host instanceof TypeAliasDeclarationShape)) {
  return ShapeStates.Reject;
}
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = index.At(tokenIndex);
if (TypeParameterListShape.IsHeaderOpen(units, tokenIndex)) {
  return ShapeStates.Reject;
}
if (TypeBodyUtil.IsBodyName(units, tokenIndex, cache)) {
  return ShapeStates.Reject;
}
if (TypeBodyUtil.IsBodyKeyword(units, tokenIndex, cache)) {
  return ShapeStates.Reject;
}
if (TypeBodyUtil.IsPostfixArrayClose(units, tokenIndex, cache)) {
  return ShapeStates.Reject;
}
if (TypeBodyUtil.IsOperatorMember(units, tokenIndex, cache)) {
  return ShapeStates.Reject;
}
if (unit instanceof Symbol && unit.Closed && unit.Is(";")) {
  return TypeBalanceUtil.IsBalanced(units, tokenIndex) ? ShapeStates.Reject : ShapeStates.Uncertain;
}
if (unit instanceof Common && unit.Closed && TypeAliasEndPossibleShape.IsStatementStart(unit)) {
  return TypeBalanceUtil.IsBalanced(units, tokenIndex) ? ShapeStates.Reject : ShapeStates.Uncertain;
}
if (unit instanceof Common && unit.Closed && unit.Is("extends")) {
  return ShapeStates.Reject;
}
const bodyEquals = TypeConditionalScan.TopLevelEquals(units, units.length);
const bodyIndex = bodyEquals < 0 ? -1 : TypeConditionalScan.FirstCodeIndex(units, bodyEquals + 1, units.length);
if (bodyIndex < 0) {
  return ShapeStates.Uncertain;
}
const first = units[bodyIndex];
if (first instanceof Symbol) {
  const text = first.TempToString();
  return text === "(" ? ShapeStates.Uncertain : ShapeStates.Reject;
}
if (first instanceof TypeShape) {
  return first instanceof ParenthesizedTypeShape ? ShapeStates.Uncertain : ShapeStates.Reject;
}
if (first instanceof Common && first.Closed) {
  const text = first.TempToString();
  if (text !== "new" && text !== "abstract") {
    return ShapeStates.Reject;
  }
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
return TypeFunctionArrowPossibleShape.IsFunctionArrow(units, tokenIndex);
```

## private static method IsFunctionArrow:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is("=>")) {
  return false;
}
const equals = TypeFunctionArrowPossibleShape.FindEquals(units, tokenIndex);
if (equals < 0) {
  return false;
}
for (let at = 1; at < equals; at++) {
  if (!units[at].IsTriviaToken) {
    return false;
  }
}
const first = TypeFunctionArrowPossibleShape.NextCode(units, equals + 1, tokenIndex);
if (first < 0) {
  return false;
}
const open = units[first];
if (!(open instanceof Symbol) || !open.Is("(")) {
  return false;
}
const last = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (last < 0) {
  return false;
}
const close = units[last];
return close instanceof Symbol && close.Is(")");
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const tokenIndex = index.Index;
const alias = host as TypeAliasDeclarationShape;
const units = alias.Data;
const arrow = index.At(tokenIndex) as Symbol;
const equals = TypeFunctionArrowPossibleShape.FindEquals(units, tokenIndex);
const first = TypeFunctionArrowPossibleShape.NextCode(units, equals + 1, tokenIndex);
const parameters = TypeParserApi.ParseParameterPrefix(units, first, tokenIndex, alias.Template);
const functionType = new FunctionTypeShape(alias.Template);
functionType.Pos = ItemUtil.PositionOf(units, first);
functionType.SignIn(units[first].SourceRange.Start);
for (const parameter of parameters) {
  functionType.Add(parameter);
}
const returnType = new ReturnTypeContextShape(alias.Template);
returnType.Pos = ItemUtil.PositionOf(units, tokenIndex);
returnType.SignIn(arrow.SourceRange.End);
returnType.SourceRange.End = arrow.SourceRange.End;
functionType.Add(returnType);
functionType.SourceRange.End = arrow.SourceRange.End;
functionType.Closed = false;
returnType.CatalogGuide = new CatalogGuide(
  [new TypePredicateStartPossibleShape(), new TypePredicateBarePossibleShape()],
  new TypeReturnEndPossibleShape(),
);
units.splice(equals, tokenIndex - equals + 1, functionType);
functionType.Parent = alias;
alias.MountedUnit = functionType;
functionType.MountedUnit = returnType;
return this.StampCreated(functionType, context);
```

## private static method FindEquals:(units:Array<Token>, limit:int)=>int

```ts
for (let at = 0; at < limit; at++) {
  const unit = units[at];
  if (unit instanceof Symbol && unit.Is("=")) {
    return at;
  }
}
return -1;
```

## private static method NextCode:(units:Array<Token>, from:int, limit:int)=>int

```ts
let at = from;
while (at < limit && units[at].IsTriviaToken) {
  at++;
}
return at < limit ? at : -1;
```

# class TypeReturnEndPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
if (!(host instanceof ReturnTypeContextShape)) {
  return ShapeStates.Reject;
}
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const unit = index.At(tokenIndex);
if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is(";")) {
  return ShapeStates.Reject;
}
return TypeBalanceUtil.IsBalanced(units, tokenIndex) ? ShapeStates.Accept : ShapeStates.Reject;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
return true;
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const tokenIndex = index.Index;
const returnType = host as ReturnTypeContextShape;
const semicolon = index.At(tokenIndex) as Symbol;
returnType.Data.splice(tokenIndex);
returnType.TryToClose(context);
const parent = returnType.Parent;
if (!(parent instanceof FunctionTypeShape)) {
  throw new Error("TypeReturnEndPossibleShape: 返回类型不在函数类型里");
}
const functionType = parent;
functionType.Closed = true;
const last = functionType.Last();
if (last !== null && last.SourceRange.End >= 0) {
  functionType.SourceRange.End = last.SourceRange.End;
}
const alias = functionType.Parent;
if (!(alias instanceof TypeAliasDeclarationShape)) {
  throw new Error("TypeReturnEndPossibleShape: 函数类型不在类型别名里");
}
alias.Data = alias.Data.filter((item) => !item.IsTriviaToken && !item.IsBasicToken);
for (const item of alias.Data) {
  item.Parent = alias;
}
alias.SourceRange.End = semicolon.SourceRange.End;
alias.Closed = true;
alias.Quit();
return this.StampCreated(semicolon, context);
```

# class TypePredicateStartPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
if (!(host instanceof ReturnTypeContextShape) || host.Predicate !== null) {
  return ShapeStates.Reject;
}
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const unit = index.At(tokenIndex);
if (!(unit instanceof Common) || !unit.Closed || unit.TempToString() !== "asserts") {
  return ShapeStates.Reject;
}
for (let at = 0; at < tokenIndex; at++) {
  if (!units[at].IsTriviaToken) {
    return ShapeStates.Reject;
  }
}
return ShapeStates.Accept;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
return true;
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const tokenIndex = index.Index;
const returnType = host as ReturnTypeContextShape;
const asserts = index.At(tokenIndex) as Common;
const pos = ItemUtil.PositionOf(returnType.Data, tokenIndex);
const predicate = new TypePredicateShape(returnType.Template);
predicate.Pos = pos;
predicate.SignIn(asserts.SourceRange.Start);
predicate.Add(AssertsKeywordShape.FromUnit(asserts, pos));
predicate.SourceRange.End = asserts.SourceRange.End;
returnType.Data.splice(tokenIndex, 1, predicate);
predicate.Parent = returnType;
returnType.Predicate = predicate;
predicate.CatalogGuide = new CatalogGuide([new TypePredicateNamePossibleShape()], null);
returnType.MountedUnit = predicate;
return this.StampCreated(predicate, context);
```

# class TypePredicateBarePossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
if (!(host instanceof ReturnTypeContextShape) || host.Predicate !== null) {
  return ShapeStates.Reject;
}
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const unit = index.At(tokenIndex);
if (TypePredicateBarePossibleShape.IsReady(units, tokenIndex)) {
  return ShapeStates.Accept;
}
if (unit instanceof Symbol && unit.Closed && unit.Is(";")) {
  return ShapeStates.Reject;
}
if (unit instanceof Common && unit.Closed && unit.TempToString() === "asserts") {
  return ShapeStates.Reject;
}
let prior = -1;
for (let at = 0; at < tokenIndex; at++) {
  if (units[at].IsTriviaToken) {
    continue;
  }
  if (prior >= 0) {
    return ShapeStates.Reject;
  }
  prior = at;
}
if (prior >= 0) {
  return ShapeStates.Reject;
}
if (!(unit instanceof Common) || !unit.Closed) {
  return ShapeStates.Reject;
}
const text = unit.TempToString();
return OperandUtil.IsIdentifier(text) && !OperandUtil.IsKeyword(text) ? ShapeStates.Uncertain : ShapeStates.Reject;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
return TypePredicateBarePossibleShape.IsReady(units, tokenIndex);
```

## private static method IsReady:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Common) || !unit.Closed || unit.TempToString() !== "is") {
  return false;
}
let nameIndex = -1;
for (let at = 0; at < tokenIndex; at++) {
  if (units[at].IsTriviaToken) {
    continue;
  }
  if (nameIndex >= 0) {
    return false;
  }
  nameIndex = at;
}
if (nameIndex < 0) {
  return false;
}
const name = units[nameIndex];
if (!(name instanceof Common)) {
  return false;
}
const text = name.TempToString();
return OperandUtil.IsIdentifier(text) && !OperandUtil.IsKeyword(text);
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const tokenIndex = index.Index;
const returnType = host as ReturnTypeContextShape;
const units = returnType.Data;
let nameIndex = -1;
for (let at = 0; at < tokenIndex; at++) {
  if (!units[at].IsTriviaToken) {
    nameIndex = at;
    break;
  }
}
const pos = ItemUtil.PositionOf(units, nameIndex);
const nameUnit = units[nameIndex] as Common;
const predicate = new TypePredicateShape(returnType.Template);
predicate.Pos = pos;
predicate.SignIn(nameUnit.SourceRange.Start);
predicate.Add(IdentifierShape.FromCommon(nameUnit, pos));
const tail = units.splice(nameIndex, tokenIndex - nameIndex + 1);
const isUnit = tail[tail.length - 1];
predicate.TypeStart = isUnit.SourceRange.End;
predicate.SourceRange.End = isUnit.SourceRange.End;
units.splice(nameIndex, 0, predicate);
predicate.Parent = returnType;
returnType.Predicate = predicate;
predicate.CatalogGuide = new CatalogGuide([new TypePredicateTypePossibleShape()], null);
returnType.MountedUnit = predicate;
return this.StampCreated(predicate, context);
```

# class TypePredicateNamePossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
if (!(host instanceof TypePredicateShape)) {
  return ShapeStates.Reject;
}
for (let at = 0; at < tokenIndex && at < units.length; at++) {
  if (units[at] instanceof IdentifierShape) {
    return ShapeStates.Reject;
  }
}
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const unit = index.At(tokenIndex);
if (!(unit instanceof Common) || !unit.Closed) {
  return ShapeStates.Reject;
}
const text = unit.TempToString();
return OperandUtil.IsIdentifier(text) && !OperandUtil.IsKeyword(text) ? ShapeStates.Accept : ShapeStates.Reject;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
return true;
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const tokenIndex = index.Index;
const predicate = host as TypePredicateShape;
const unit = index.At(tokenIndex) as Common;
const pos = ItemUtil.PositionOf(predicate.Data, tokenIndex);
const identifier = IdentifierShape.FromCommon(unit, pos);
predicate.Data.splice(tokenIndex, 1, identifier);
identifier.Parent = predicate;
predicate.SourceRange.End = identifier.SourceRange.End;
predicate.CatalogGuide = new CatalogGuide([new TypePredicateIsKeywordPossibleShape()], null);
return this.StampCreated(identifier, context);
```

# class TypePredicateIsKeywordPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
if (!(host instanceof TypePredicateShape)) {
  return ShapeStates.Reject;
}
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const unit = index.At(tokenIndex);
return unit instanceof Common && unit.Closed && unit.TempToString() === "is" ? ShapeStates.Accept : ShapeStates.Reject;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
return true;
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const tokenIndex = index.Index;
const predicate = host as TypePredicateShape;
const unit = index.At(tokenIndex);
predicate.TypeStart = unit.SourceRange.End;
predicate.Data.splice(tokenIndex, 1);
predicate.CatalogGuide = new CatalogGuide([new TypePredicateTypePossibleShape()], null);
return predicate;
```

# class TypePredicateTypePossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const tokenIndex = index.Index;
if (!(host instanceof TypePredicateShape)) {
  return ShapeStates.Reject;
}
const predicate = host;
const units = predicate.Data;
for (let at = 0; at < tokenIndex && at < units.length; at++) {
  if (units[at] instanceof TypeShape) {
    return ShapeStates.Reject;
  }
}
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const unit = index.At(tokenIndex);
if (!unit.Closed) {
  return ShapeStates.Uncertain;
}
if (unit instanceof Common || unit instanceof String) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
return true;
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const tokenIndex = index.Index;
const predicate = host as TypePredicateShape;
const unit = index.At(tokenIndex);
const pos = predicate.TypeStart >= 0 ? predicate.TypeStart : ItemUtil.PositionOf(predicate.Data, tokenIndex);
let atom:Token;
if (unit instanceof String) {
  const literal = StringLiteralShape.FromString(unit, pos);
  const literalType = new LiteralTypeShape(predicate.Template);
  literalType.Pos = pos;
  literalType.SignIn(unit.SourceRange.Start);
  literalType.Add(literal);
  literalType.SignOut(unit.SourceRange.End);
  literalType.Closed = true;
  atom = literalType;
} else {
  const common = unit as Common;
  const keyword = TypeKeywordUtil.KeywordTypeOf(common, pos);
  if (keyword !== null) {
    atom = keyword;
  } else if (common.IsNumber()) {
    const literal = NumericLiteralShape.FromCommon(common, pos);
    const literalType = new LiteralTypeShape(predicate.Template);
    literalType.Pos = pos;
    literalType.SignIn(common.SourceRange.Start);
    literalType.Add(literal);
    literalType.SignOut(common.SourceRange.End);
    literalType.Closed = true;
    atom = literalType;
  } else {
    const identifier = IdentifierShape.FromCommon(common, pos);
    const reference = new TypeReferenceShape(predicate.Template);
    reference.Pos = pos;
    reference.SignIn(common.SourceRange.Start);
    reference.Add(identifier);
    reference.SignOut(common.SourceRange.End);
    reference.Closed = true;
    atom = reference;
  }
}
predicate.Data.splice(tokenIndex, 1);
for (let at = tokenIndex - 1; at >= 0; at--) {
  const item = predicate.Data[at];
  if (item.IsTriviaToken || item.IsBasicToken) {
    predicate.Data.splice(at, 1);
  }
}
predicate.Add(atom);
predicate.SourceRange.End = atom.SourceRange.End;
predicate.CatalogGuide = null;
predicate.Quit();
return this.StampCreated(atom, context);
```
