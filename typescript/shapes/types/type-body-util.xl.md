# dependencies
```xl
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { OperandUtil } from "../expressions/operand-util.xl.md"
import { TypeShape } from "./type-shape.xl.md"
import { TypeConditionalScan } from "./type-conditional-scan-util.xl.md"
```


# namespace cangjie

# class TypeBodyUtil

## static method BodyStart:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>int

```ts
const key = "TypeAliasBodyStart:" + units.length;
const cached = cache.GetShare<number>(key);
if (cached !== null) {
  return cached;
}
const equals = TypeConditionalScan.TopLevelEquals(units, tokenIndex + 1);
let start = -1;
if (equals >= 0 && TypeConditionalScan.Balanced(units, 0, equals)) {
  start = TypeConditionalScan.FirstCodeIndex(units, equals + 1, tokenIndex + 1);
}
cache.SetShare(key, start);
return start;
```


## static method IsBodyName:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Common) || !unit.Closed) {
  return false;
}
if (TypeBodyUtil.BodyStart(units, tokenIndex, cache) !== tokenIndex) {
  return false;
}
const text = unit.TempToString();
if (TypeConditionalScan.IsPrefixText(text) || TypeConditionalScan.IsKeywordText(text)) {
  return false;
}
return OperandUtil.IsIdentifier(text) && !OperandUtil.IsKeyword(text);
```


## static method IsKeywordTypeText:(text:string)=>bool

```ts
switch (text) {
  case "string":
  case "number":
  case "boolean":
  case "any":
  case "unknown":
  case "never":
  case "void":
  case "object":
  case "symbol":
  case "bigint":
  case "undefined":
    return true;
  default:
    return false;
}
```


## static method IsBodyKeyword:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>bool

```ts
const bodyIndex = TypeBodyUtil.BodyStart(units, tokenIndex, cache);
if (bodyIndex < 0 || bodyIndex >= units.length) {
  return false;
}
const unit = units[bodyIndex];
if (!(unit instanceof Common) || !unit.Closed) {
  return false;
}
return TypeBodyUtil.IsKeywordTypeText(unit.TempToString());
```


## static method IsPostfixArrayClose:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>bool

```ts
const bodyIndex = TypeBodyUtil.BodyStart(units, tokenIndex, cache);
if (bodyIndex < 0 || bodyIndex >= units.length) {
  return false;
}
const type = units[bodyIndex];
if (!(type instanceof TypeShape) || !type.Closed) {
  return false;
}
const closeIndex = ItemUtil.PreviousCode(units, tokenIndex);
if (closeIndex < 0) {
  return false;
}
const close = units[closeIndex];
if (!(close instanceof Symbol) || !close.Closed || !close.Is("]")) {
  return false;
}
const openIndex = ItemUtil.PreviousCode(units, closeIndex - 1);
if (openIndex < 0) {
  return false;
}
const open = units[openIndex];
if (!(open instanceof Symbol) || !open.Closed || !open.Is("[")) {
  return false;
}
return ItemUtil.PreviousCode(units, openIndex - 1) === bodyIndex;
```


## static method IsOperatorMember:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>bool

```ts
const bodyIndex = TypeBodyUtil.BodyStart(units, tokenIndex, cache);
if (bodyIndex < 0 || bodyIndex >= units.length) {
  return false;
}
const left = units[bodyIndex];
if (!(left instanceof TypeShape) || !left.Closed) {
  return false;
}
const memberIndex = ItemUtil.PreviousCode(units, tokenIndex);
if (memberIndex < 0) {
  return false;
}
const member = units[memberIndex];
if (!(member instanceof Common) || !member.Closed) {
  return false;
}
const text = member.TempToString();
if (!TypeBodyUtil.IsKeywordTypeText(text)
    && (OperandUtil.IsKeyword(text) || !OperandUtil.IsIdentifier(text))) {
  return false;
}
const opIndex = ItemUtil.PreviousCode(units, memberIndex - 1);
if (opIndex < 0) {
  return false;
}
const op = units[opIndex];
if (!(op instanceof Symbol) || !op.Closed || (!op.Is("|") && !op.Is("&"))) {
  return false;
}
return ItemUtil.PreviousCode(units, opIndex - 1) === bodyIndex;
```


## static method HasBodyCode:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
return TypeBodyUtil.BodyStart(units, tokenIndex, cache) >= 0;
```
