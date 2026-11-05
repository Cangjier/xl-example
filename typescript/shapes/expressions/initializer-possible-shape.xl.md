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
import { TokenIndex } from "../../../core/syntax/token-index.xl.md"
```

# namespace cangjie

# class InitializerPossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = index.At(tokenIndex);
if (!unit.IsBasicToken) {
  return ShapeStates.Reject;
}
if (unit instanceof Symbol) {
  if (unit.Is("=")) {
    return ShapeStates.Uncertain;
  }
  return ShapeStates.Reject;
}
if (!(unit instanceof Common) || !unit.Closed) {
  return ShapeStates.Uncertain;
}
if (InitializerPossibleShape.ShouldBuild(units, tokenIndex)) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
return InitializerPossibleShape.ShouldBuild(units, tokenIndex);
```

## static method ShouldBuild:(units:Array<Token>, tokenIndex:int)=>bool

```ts
const unit = units[tokenIndex];
if (!(unit instanceof Common) || !unit.Closed) {
  return false;
}
const before = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (before < 0) {
  return false;
}
const previous = units[before];
if (!(previous instanceof Symbol) || !previous.Is("=")) {
  return false;
}
const text = unit.TempToString();
return text !== "typeof" && text !== "void" && text !== "delete" && text !== "new";
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
const common = index.At(tokenIndex) as Common;
const before = ItemUtil.PreviousCode(host.Data, tokenIndex - 1);
const operand = OperandUtil.FromCommon(common, OperandUtil.PositionOf(host.Data, tokenIndex));
common.Replace(operand);
if (before >= 0 && before < host.Data.length) {
  const equals = host.Data[before];
  if (equals instanceof Symbol && equals.Is("=")) {
    (host as any).EqualsPos = equals.SourceRange.Start;
    equals.RemoveSelf();
  }
}
return this.StampCreated(operand, context);
```
