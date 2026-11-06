# dependencies
```xl
import { CatalogGuide } from "../../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { TokenIndex } from "../../../../core/syntax/token-index.xl.md"
import { ItemUtil } from "../../item-util.xl.md"
import { TypeAliasDeclarationShape } from "../type-alias-declaration-shape.xl.md"
import { TypeAliasEndPossibleShape } from "../type-alias-end-possible-shape.xl.md"
import { TypeBalanceUtil } from "../type-balance-util.xl.md"
import { TypeConditionalScan } from "../type-conditional-scan-util.xl.md"
import { TypeParameterListShape } from "../type-parameter-list-shape.xl.md"
import { TypeParserApi } from "../type-parser-api.xl.md"
import { ConstructorTypeShape } from "../type-node-shapes.xl.md"
import { FunctionTypeShape } from "../type-node-shapes.xl.md"
import { TypeShape } from "../type-shape.xl.md"
import { AbstractKeywordShape } from "../type-token-shapes.xl.md"
import { ReturnTypeContextShape } from "../type-function-incremental.xl.md"
import { TypePredicateStartPossibleShape } from "../type-function-incremental.xl.md"
import { TypePredicateBarePossibleShape } from "../type-function-incremental.xl.md"
import { TypeReturnEndPossibleShape } from "../type-function-incremental.xl.md"
import { FunctionBuild } from "./function-shapes.xl.md"
```


# namespace cangjie

# class FunctionTypeStartPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
if (!(host instanceof TypeAliasDeclarationShape)) {
  return ShapeStates.Reject;
}
const units = host.Data;
const tokenIndex = index.Index;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
if (TypeParameterListShape.IsHeaderOpen(units, tokenIndex)) {
  return ShapeStates.Reject;
}
const bodyIndex = FunctionBuild.BodyStart(units);
if (bodyIndex < 0 || bodyIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const head = units[bodyIndex];
if (!(head instanceof Symbol) || !head.Closed || !head.Is("<")) {
  return ShapeStates.Reject;
}
const unit = units[tokenIndex];
if (unit instanceof Symbol && unit.Closed && unit.Is(";")) {
  return TypeBalanceUtil.IsBalanced(units, tokenIndex) ? ShapeStates.Reject : ShapeStates.Uncertain;
}
return FunctionBuild.GenericArrow(units, bodyIndex) >= 0 ? ShapeStates.Accept : ShapeStates.Uncertain;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const bodyIndex = FunctionBuild.BodyStart(index.Host.Data);
if (bodyIndex < 0) {
  return false;
}
return FunctionBuild.GenericArrow(index.Host.Data, bodyIndex) >= 0;
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const alias = index.Host as TypeAliasDeclarationShape;
const units = alias.Data;
const bodyIndex = FunctionBuild.BodyStart(units);
const openAngle = bodyIndex;
const closeAngle = FunctionBuild.AngleClose(units, openAngle);
const openParen = FunctionBuild.GenericOpen(units, openAngle);
const closeParen = FunctionBuild.MatchClose(units, openParen, "(", ")");
const arrowIndex = FunctionBuild.GenericArrow(units, bodyIndex);
const names = FunctionBuild.TypeParameterNames(units, openAngle, closeAngle);
if (names === null || closeParen < 0 || arrowIndex < 0) {
  throw new Error("FunctionTypeStartPossibleShape: 泛型函数类型不完整");
}
const typeParameters = FunctionBuild.BuildTypeParameters(units, names, alias.Template);
const parameters = TypeParserApi.ParseParameterPrefix(units, openParen, closeParen + 1, alias.Template);
const functionType = new FunctionTypeShape(alias.Template);
functionType.Pos = ItemUtil.PositionOf(units, bodyIndex);
functionType.SignIn(units[bodyIndex].SourceRange.Start);
for (const parameter of typeParameters) {
  functionType.Add(parameter);
}
for (const parameter of parameters) {
  functionType.Add(parameter);
}
const returnType = new ReturnTypeContextShape(alias.Template);
returnType.Pos = ItemUtil.PositionOf(units, arrowIndex);
returnType.SignIn(units[arrowIndex].SourceRange.End);
returnType.SourceRange.End = units[arrowIndex].SourceRange.End;
functionType.Add(returnType);
functionType.SourceRange.End = units[arrowIndex].SourceRange.End;
functionType.Closed = false;
returnType.CatalogGuide = new CatalogGuide(
  [new FunctionReturnAtomPossibleShape(), new TypePredicateStartPossibleShape(), new TypePredicateBarePossibleShape()],
  new TypeReturnEndPossibleShape(),
);
const equals = TypeConditionalScan.TopLevelEquals(units, units.length);
units.splice(equals, arrowIndex - equals + 1, functionType);
functionType.Parent = alias;
alias.MountedUnit = functionType;
functionType.MountedUnit = returnType;
return this.StampCreated(functionType, context);
```

# class ConstructorTypeStartPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
if (!(host instanceof TypeAliasDeclarationShape)) {
  return ShapeStates.Reject;
}
const units = host.Data;
const tokenIndex = index.Index;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
if (TypeParameterListShape.IsHeaderOpen(units, tokenIndex)) {
  return ShapeStates.Reject;
}
const bodyIndex = FunctionBuild.BodyStart(units);
if (bodyIndex < 0 || bodyIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const head = units[bodyIndex];
if (!(head instanceof Common) || head.TempToString() !== "new") {
  return ShapeStates.Reject;
}
if (!head.Closed) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit instanceof Symbol && unit.Closed && unit.Is(";")) {
  return TypeBalanceUtil.IsBalanced(units, tokenIndex) ? ShapeStates.Reject : ShapeStates.Uncertain;
}
return FunctionBuild.ConstructorArrow(units, bodyIndex, -1) >= 0 ? ShapeStates.Accept : ShapeStates.Uncertain;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const bodyIndex = FunctionBuild.BodyStart(units);
if (bodyIndex < 0) {
  return false;
}
return FunctionBuild.ConstructorArrow(units, bodyIndex, -1) >= 0;
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const alias = index.Host as TypeAliasDeclarationShape;
const units = alias.Data;
const bodyIndex = FunctionBuild.BodyStart(units);
const built = ConstructorTypeStartPossibleShape.BuildConstructor(alias, units, bodyIndex, -1, context);
return this.StampCreated(built, context);
```

## static method BuildConstructor:(alias:TypeAliasDeclarationShape, units:Array<Token>, bodyIndex:int, abstractIndex:int, context:SyntaxContext)=>Token

```ts
const newIndex = abstractIndex < 0 ? bodyIndex : FunctionBuild.NextCode(units, abstractIndex + 1, units.length);
const openParen = FunctionBuild.OpenParenAfter(units, newIndex);
const closeParen = FunctionBuild.MatchClose(units, openParen, "(", ")");
const arrowIndex = FunctionBuild.ConstructorArrow(units, bodyIndex, abstractIndex);
if (openParen < 0 || closeParen < 0 || arrowIndex < 0) {
  throw new Error("ConstructorTypeStartPossibleShape: 构造类型不完整");
}
const parameters = TypeParserApi.ParseParameterPrefix(units, openParen, closeParen + 1, alias.Template);
const constructorType = new ConstructorTypeShape(alias.Template);
constructorType.Pos = ItemUtil.PositionOf(units, bodyIndex);
constructorType.SignIn(units[bodyIndex].SourceRange.Start);
if (abstractIndex >= 0) {
  constructorType.Add(AbstractKeywordShape.FromUnit(units[abstractIndex], ItemUtil.PositionOf(units, abstractIndex)));
}
const angle = FunctionBuild.NextCode(units, newIndex + 1, units.length);
if (angle >= 0) {
  const angleUnit = units[angle];
  if (angleUnit instanceof Symbol && angleUnit.Is("<")) {
    const closeAngle = FunctionBuild.AngleClose(units, angle);
    const names = FunctionBuild.TypeParameterNames(units, angle, closeAngle);
    if (names !== null) {
      for (const parameter of FunctionBuild.BuildTypeParameters(units, names, alias.Template)) {
        constructorType.Add(parameter);
      }
    }
  }
}
for (const parameter of parameters) {
  constructorType.Add(parameter);
}
const returnType = new ReturnTypeContextShape(alias.Template);
returnType.Pos = ItemUtil.PositionOf(units, arrowIndex);
returnType.SignIn(units[arrowIndex].SourceRange.End);
returnType.SourceRange.End = units[arrowIndex].SourceRange.End;
constructorType.Add(returnType);
constructorType.SourceRange.End = units[arrowIndex].SourceRange.End;
constructorType.Closed = false;
returnType.CatalogGuide = new CatalogGuide(
  [new FunctionReturnAtomPossibleShape(), new TypePredicateStartPossibleShape(), new TypePredicateBarePossibleShape()],
  new TypeReturnEndPossibleShape(),
);
const equals = TypeConditionalScan.TopLevelEquals(units, units.length);
units.splice(equals, arrowIndex - equals + 1, constructorType);
constructorType.Parent = alias;
alias.MountedUnit = constructorType;
constructorType.MountedUnit = returnType;
return constructorType;
```

# class AbstractConstructorPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
if (!(host instanceof TypeAliasDeclarationShape)) {
  return ShapeStates.Reject;
}
const units = host.Data;
const tokenIndex = index.Index;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
if (TypeParameterListShape.IsHeaderOpen(units, tokenIndex)) {
  return ShapeStates.Reject;
}
const bodyIndex = FunctionBuild.BodyStart(units);
if (bodyIndex < 0 || bodyIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const head = units[bodyIndex];
if (!(head instanceof Common) || head.TempToString() !== "abstract") {
  return ShapeStates.Reject;
}
if (!head.Closed) {
  return ShapeStates.Uncertain;
}
const newIndex = FunctionBuild.NextCode(units, bodyIndex + 1, units.length);
if (newIndex < 0) {
  return ShapeStates.Uncertain;
}
const newUnit = units[newIndex];
if (!(newUnit instanceof Common) || newUnit.TempToString() !== "new") {
  return ShapeStates.Reject;
}
if (!newUnit.Closed) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit instanceof Symbol && unit.Closed && unit.Is(";")) {
  return TypeBalanceUtil.IsBalanced(units, tokenIndex) ? ShapeStates.Reject : ShapeStates.Uncertain;
}
return FunctionBuild.ConstructorArrow(units, bodyIndex, bodyIndex) >= 0 ? ShapeStates.Accept : ShapeStates.Uncertain;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const bodyIndex = FunctionBuild.BodyStart(units);
if (bodyIndex < 0) {
  return false;
}
return FunctionBuild.ConstructorArrow(units, bodyIndex, bodyIndex) >= 0;
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const alias = index.Host as TypeAliasDeclarationShape;
const units = alias.Data;
const bodyIndex = FunctionBuild.BodyStart(units);
const built = ConstructorTypeStartPossibleShape.BuildConstructor(alias, units, bodyIndex, bodyIndex, context);
return this.StampCreated(built, context);
```

# class FunctionReturnAtomPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
if (!(host instanceof ReturnTypeContextShape)) {
  return ShapeStates.Reject;
}
if (host.Predicate !== null) {
  return ShapeStates.Reject;
}
const units = host.Data;
const codeIndex = FunctionBuild.SingleCode(units);
if (codeIndex < 0) {
  return units.length === 0 ? ShapeStates.Uncertain : ShapeStates.Reject;
}
const unit = units[codeIndex];
if (unit instanceof TypeShape) {
  return ShapeStates.Reject;
}
if (!unit.Closed) {
  return ShapeStates.Uncertain;
}
return FunctionBuild.IsReturnAtom(unit) ? ShapeStates.Accept : ShapeStates.Reject;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const codeIndex = FunctionBuild.SingleCode(units);
if (codeIndex < 0) {
  return false;
}
return FunctionBuild.IsReturnAtom(units[codeIndex]);
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host as ReturnTypeContextShape;
const units = host.Data;
const codeIndex = FunctionBuild.SingleCode(units);
const atom = FunctionBuild.BuildReturnAtom(units, codeIndex, host.Template);
if (atom === null) {
  throw new Error("FunctionReturnAtomPossibleShape: 返回类型原子不可建");
}
host.Data = [atom];
atom.Parent = host;
host.MountedUnit = atom;
host.SourceRange.End = atom.SourceRange.End;
host.CatalogGuide = null;
return this.StampCreated(atom, context);
```

# class FunctionFragments

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

```ts
// T3：函数类型族（含构造签名）。三个形态候选只在 alias 宿主上工作（R5），
// 返回类型原子只在自己的 ReturnTypeContextShape 引导里工作。
shapes.push(new FunctionTypeStartPossibleShape());
shapes.push(new ConstructorTypeStartPossibleShape());
shapes.push(new AbstractConstructorPossibleShape());
```
