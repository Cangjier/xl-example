# dependencies
```xl
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { NumericLiteralShape } from "../literals/numeric-literal-shape.xl.md"
import { ElementAccessExpressionShape } from "./element-access-expression-shape.xl.md"
import { PropertyAccessExpressionShape } from "./property-access-expression-shape.xl.md"
```

# namespace cangjie

# class SuffixAccessUtil

## static method IsOperand:(unit:Token)=>bool

```ts
if (!unit.Closed) {
  return false;
}
return unit instanceof IdentifierShape
  || unit instanceof NumericLiteralShape
  || unit instanceof PropertyAccessExpressionShape
  || unit instanceof ElementAccessExpressionShape;
```

## static method IsOperandForSuffix:(unit:Token)=>bool

```ts
if (!SuffixAccessUtil.IsOperand(unit)) {
  return false;
}
if (unit instanceof ElementAccessExpressionShape && (unit as ElementAccessExpressionShape).AwaitingClose) {
  return false;
}
return true;
```

## static method IsSuffixSymbol:(unit:Token)=>bool

```ts
return unit instanceof Symbol && unit.Closed && unit.IsAny([".", "?.", "[", "]"]);
```

## static method LeftOf:(units:Array<Token>, symbolIndex:int)=>int

```ts
if (symbolIndex <= 0 || symbolIndex >= units.length) {
  return -1;
}
const symbol = units[symbolIndex];
if (!(symbol instanceof Symbol)) {
  return -1;
}
const before = ItemUtil.PreviousCode(units, symbolIndex - 1);
if (before < 0) {
  return -1;
}
if (symbol.Is("[") && units[before] instanceof Symbol && (units[before] as Symbol).Is("?.")) {
  return ItemUtil.PreviousCode(units, before - 1);
}
return before;
```

## static method QuestionDotOf:(units:Array<Token>, symbolIndex:int)=>int

```ts
if (symbolIndex < 0 || symbolIndex >= units.length) {
  return -1;
}
const symbol = units[symbolIndex];
if (symbol instanceof Symbol && symbol.Is("?.")) {
  return symbolIndex;
}
const before = ItemUtil.PreviousCode(units, symbolIndex - 1);
if (before >= 0) {
  const previous = units[before];
  if (previous instanceof Symbol && previous.Is("?.")) {
    return before;
  }
}
return -1;
```

## static method PosOf:(unit:Token)=>int

```ts
if (unit instanceof ShapeToken) {
  return unit.Pos;
}
return unit.SourceRange.Start;
```
