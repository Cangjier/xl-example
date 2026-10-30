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
import { ItemUtil } from "../item-util.xl.md"
import { OperandUtil } from "../expressions/operand-util.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { NumericLiteralShape } from "../literals/numeric-literal-shape.xl.md"
import { StringLiteralShape } from "../literals/string-literal-shape.xl.md"
import { AssertsKeywordShape } from "./type-token-shapes.xl.md"
import { TypeShape } from "./type-shape.xl.md"
import { FunctionTypeShape } from "./type-node-shapes.xl.md"
import { LiteralTypeShape } from "./type-node-shapes.xl.md"
import { TypePredicateShape } from "./type-node-shapes.xl.md"
import { TypeReferenceShape } from "./type-node-shapes.xl.md"
import { TypeAliasDeclarationShape } from "./type-alias-declaration-shape.xl.md"
import { TypeAliasEndPossibleShape } from "./type-alias-end-possible-shape.xl.md"
import { TypeParser } from "./type-parser.xl.md"
```

# namespace cangjie

# class ReturnTypeContextShape extends TypeShape

## field Predicate:TypePredicateShape | null = null

## method Finish:(context:SyntaxContext)=>Token

```ts
// 返回类型要么是已经逐字长出来的类型谓词，要么还是原始单元：到这里才用同一套类型文法补完。
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
  type = TypeParser.ParseCompleteReturnType(this.Data, this.Data.length, this.Template);
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
  // 这个上下文只是“返回类型的脚手架”：关闭时用真正的类型节点替换自己。
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

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
// 光标在 `=>` 之前必须一直活着：候选一旦 Reject，要到下一次 build 的 Reset 才会回来。
if (!(host instanceof TypeAliasDeclarationShape)) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
// 这两类是语句收口的 token，让给终结候选。
if (unit instanceof Symbol && unit.Closed && unit.Is(";")) {
  return TypeParser.IsBalanced(units, tokenIndex) ? ShapeStates.Reject : ShapeStates.Uncertain;
}
if (unit instanceof Common && unit.Closed && TypeAliasEndPossibleShape.IsStatementStart(unit)) {
  return TypeParser.IsBalanced(units, tokenIndex) ? ShapeStates.Reject : ShapeStates.Uncertain;
}
// `extends` 之后只可能是条件类型：让位给条件类型候选（它只在这一格 Accept）。
if (unit instanceof Common && unit.Closed && unit.Is("extends")) {
  return ShapeStates.Reject;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
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
// 只接「名字后面直接是 =」的无类型参数别名：`type A<T> = (…) => …` 的类型参数仍走 close 兜底。
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

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const alias = host as TypeAliasDeclarationShape;
const units = alias.Data;
const arrow = units[tokenIndex] as Symbol;
const equals = TypeFunctionArrowPossibleShape.FindEquals(units, tokenIndex);
const first = TypeFunctionArrowPossibleShape.NextCode(units, equals + 1, tokenIndex);
const parameters = TypeParser.ParseParameterPrefix(units, first, tokenIndex, alias.Template);
const functionType = new FunctionTypeShape(alias.Template);
functionType.Pos = ItemUtil.PositionOf(units, first);
functionType.SignIn(units[first].SourceRange.Start);
for (const parameter of parameters) {
  functionType.Add(parameter);
}
// 返回类型的脚手架先挂上：`asserts` / `is` 一出现就能往里长，不必等 EOF。
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
return functionType;
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

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof ReturnTypeContextShape)) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is(";")) {
  return ShapeStates.Reject;
}
return TypeParser.IsBalanced(units, tokenIndex) ? ShapeStates.Accept : ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return true;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const returnType = host as ReturnTypeContextShape;
const semicolon = returnType.Data[tokenIndex] as Symbol;
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
return semicolon;
```

# class TypePredicateStartPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof ReturnTypeContextShape) || host.Predicate !== null) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const unit = units[tokenIndex];
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

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return true;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const returnType = host as ReturnTypeContextShape;
const asserts = returnType.Data[tokenIndex] as Common;
const pos = ItemUtil.PositionOf(returnType.Data, tokenIndex);
const predicate = new TypePredicateShape(returnType.Template);
predicate.Pos = pos;
predicate.SignIn(asserts.SourceRange.Start);
predicate.Add(AssertsKeywordShape.FromUnit(asserts, pos));
predicate.SourceRange.End = asserts.SourceRange.End;
returnType.Data.splice(tokenIndex, 1, predicate);
predicate.Parent = returnType;
returnType.Predicate = predicate;
// 谓词自己成为 mounted unit：后面的空白、名字、`is`、类型都先流进它。
predicate.CatalogGuide = new CatalogGuide([new TypePredicateNamePossibleShape()], null);
returnType.MountedUnit = predicate;
return predicate;
```

# class TypePredicateBarePossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
// `x is T`：`x` 关闭时还看不出来（也可能是 TypeReference），`is` 关闭时才能定案。
if (!(host instanceof ReturnTypeContextShape) || host.Predicate !== null) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const unit = units[tokenIndex];
if (TypePredicateBarePossibleShape.IsReady(units, tokenIndex)) {
  return ShapeStates.Accept;
}
if (unit instanceof Symbol && unit.Closed && unit.Is(";")) {
  return ShapeStates.Reject;
}
if (unit instanceof Common && unit.Closed && unit.TempToString() === "asserts") {
  // 第一个代码单元是 asserts：交给 TypePredicateStartPossibleShape。
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

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
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

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
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
// `name` 与 `is` 之间的 trivia、以及 `is` 本身，一起搬进谓词；`is` 留给后面的类型当 pos 锚点。
const tail = units.splice(nameIndex, tokenIndex - nameIndex + 1);
for (let at = 1; at < tail.length; at++) {
  predicate.Add(tail[at]);
}
predicate.SourceRange.End = tail[tail.length - 1].SourceRange.End;
units.splice(nameIndex, 0, predicate);
predicate.Parent = returnType;
returnType.Predicate = predicate;
predicate.CatalogGuide = new CatalogGuide([new TypePredicateTypePossibleShape()], null);
returnType.MountedUnit = predicate;
return predicate;
```

# class TypePredicateNamePossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof TypePredicateShape)) {
  return ShapeStates.Reject;
}
for (const item of host.Data) {
  if (item instanceof IdentifierShape) {
    return ShapeStates.Reject;
  }
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const unit = units[tokenIndex];
if (!(unit instanceof Common) || !unit.Closed) {
  return ShapeStates.Reject;
}
const text = unit.TempToString();
return OperandUtil.IsIdentifier(text) && !OperandUtil.IsKeyword(text) ? ShapeStates.Accept : ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return true;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const predicate = host as TypePredicateShape;
const unit = predicate.Data[tokenIndex] as Common;
const pos = ItemUtil.PositionOf(predicate.Data, tokenIndex);
const identifier = IdentifierShape.FromCommon(unit, pos);
predicate.Data.splice(tokenIndex, 1, identifier);
identifier.Parent = predicate;
predicate.SourceRange.End = identifier.SourceRange.End;
predicate.CatalogGuide = new CatalogGuide([new TypePredicateIsKeywordPossibleShape()], null);
return identifier;
```

# class TypePredicateIsKeywordPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof TypePredicateShape)) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const unit = units[tokenIndex];
return unit instanceof Common && unit.Closed && unit.TempToString() === "is" ? ShapeStates.Accept : ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return true;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const predicate = host as TypePredicateShape;
const unit = predicate.Data[tokenIndex];
// `is` 不从 Data 里摘掉：它是后面类型的「前一个代码单元」，留着才能让 PositionOf 停在这里，
// 否则前后两段 trivia 会拼在一起，把下一个类型的 pos 推回名字之后。
predicate.CatalogGuide = new CatalogGuide([new TypePredicateTypePossibleShape()], null);
return unit;
```

# class TypePredicateTypePossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (!(host instanceof TypePredicateShape)) {
  return ShapeStates.Reject;
}
const predicate = host;
for (const item of predicate.Data) {
  if (item instanceof TypeShape) {
    return ShapeStates.Reject;
  }
}
const units = predicate.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const unit = units[tokenIndex];
if (!unit.Closed) {
  return ShapeStates.Uncertain;
}
if (unit instanceof Common || unit instanceof String) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return true;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const predicate = host as TypePredicateShape;
const unit = predicate.Data[tokenIndex];
const pos = ItemUtil.PositionOf(predicate.Data, tokenIndex);
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
  const keyword = TypeParser.KeywordTypeOf(common, pos);
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
predicate.Add(atom);
predicate.SourceRange.End = atom.SourceRange.End;
predicate.CatalogGuide = null;
predicate.Quit();
return atom;
```
