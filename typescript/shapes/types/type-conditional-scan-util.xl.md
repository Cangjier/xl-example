# dependencies
```xl
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { OperandUtil } from "../expressions/operand-util.xl.md"
import { TypeShape } from "./type-shape.xl.md"
import { UnionTypeShape } from "./type-node-shapes.xl.md"
import { IntersectionTypeShape } from "./type-node-shapes.xl.md"
import { TypeReferenceShape } from "./type-node-shapes.xl.md"
```


# namespace cangjie

# class TypeConditionalScan

## static method LastTypeIndex:(units:Array<Token>)=>int

```ts
for (let at = units.length - 1; at >= 0; at--) {
  if (units[at] instanceof TypeShape) {
    return at;
  }
}
return -1;
```


## static method RunStart:(units:Array<Token>)=>int

```ts
return TypeConditionalScan.LastTypeIndex(units) + 1;
```


## static method CodeCount:(units:Array<Token>, from:int, to:int)=>int

```ts
let count = 0;
for (let at = from; at < to; at++) {
  if (!units[at].IsTriviaToken) {
    count++;
  }
}
return count;
```


## static method FirstCodeIndex:(units:Array<Token>, from:int, to:int)=>int

```ts
for (let at = from; at < to; at++) {
  if (!units[at].IsTriviaToken) {
    return at;
  }
}
return -1;
```


## static method Balanced:(units:Array<Token>, from:int, to:int)=>bool

```ts
let paren = 0;
let square = 0;
let brace = 0;
let angle = 0;
for (let at = from; at < to; at++) {
  const unit = units[at];
  if (!(unit instanceof Symbol)) {
    continue;
  }
  const text = unit.TempToString();
  if (text === "(") {
    paren++;
  } else if (text === ")") {
    paren--;
    if (paren < 0) {
      return false;
    }
  } else if (text === "[") {
    square++;
  } else if (text === "]") {
    square--;
    if (square < 0) {
      return false;
    }
  } else if (text === "{") {
    brace++;
  } else if (text === "}") {
    brace--;
    if (brace < 0) {
      return false;
    }
  } else if (text === "<") {
    angle++;
  } else if (text === ">" || text === ">>" || text === ">>>") {
    angle -= text.length;
    if (angle < 0) {
      return false;
    }
  }
}
return paren === 0 && square === 0 && brace === 0 && angle === 0;
```


## static method TopLevelEquals:(units:Array<Token>, limit:int)=>int

```ts
let paren = 0;
let square = 0;
let brace = 0;
let angle = 0;
let found = -1;
for (let at = 0; at < limit; at++) {
  const unit = units[at];
  if (!(unit instanceof Symbol)) {
    continue;
  }
  const text = unit.TempToString();
  if (text === "(") {
    paren++;
  } else if (text === ")") {
    paren--;
  } else if (text === "[") {
    square++;
  } else if (text === "]") {
    square--;
  } else if (text === "{") {
    brace++;
  } else if (text === "}") {
    brace--;
  } else if (text === "<") {
    angle++;
  } else if (text === ">" || text === ">>" || text === ">>>") {
    angle -= text.length;
  } else if (text === "=" && paren === 0 && square === 0 && brace === 0 && angle === 0) {
    found = at;
  }
}
return found;
```


## static method IsPrefixText:(text:string)=>bool

```ts
switch (text) {
  case "keyof":
  case "readonly":
  case "unique":
  case "typeof":
  case "infer":
  case "new":
  case "abstract":
  case "import":
  case "asserts":
    return true;
  default:
    return false;
}
```


## static method IsKeywordText:(text:string)=>bool

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
  case "true":
  case "false":
  case "null":
  case "this":
    return true;
  default:
    return false;
}
```


## static method IsAtomUnit:(unit:Token)=>bool

```ts
if (!unit.Closed) {
  return false;
}
if (unit instanceof String) {
  return true;
}
if (!(unit instanceof Common)) {
  return false;
}
const text = unit.TempToString();
if (TypeConditionalScan.IsPrefixText(text)) {
  return false;
}
if (TypeConditionalScan.IsKeywordText(text)) {
  return true;
}
return unit.IsNumber();
```


## static method IsCloserUnit:(unit:Token)=>bool

```ts
if (!(unit instanceof Symbol) || !unit.Closed) {
  return false;
}
const text = unit.TempToString();
return text === "]" || text === "}" || text === ">" || text === ">>" || text === ">>>";
```


## static method IsNameRun:(units:Array<Token>, from:int, to:int)=>bool

```ts
let expectName = true;
for (let at = from; at < to; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (expectName) {
    if (!(unit instanceof Common) || !unit.Closed) {
      return false;
    }
    const text = unit.TempToString();
    if (!OperandUtil.IsIdentifier(text) || OperandUtil.IsKeyword(text)) {
      return false;
    }
    if (TypeConditionalScan.IsPrefixText(text) || TypeConditionalScan.IsKeywordText(text)) {
      return false;
    }
  } else if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is(".")) {
    return false;
  }
  expectName = !expectName;
}
return !expectName;
```


## static method IsNameUnit:(unit:Token)=>bool

```ts
if (!(unit instanceof Common) || !unit.Closed) {
  return false;
}
const text = unit.TempToString();
if (TypeConditionalScan.IsPrefixText(text) || TypeConditionalScan.IsKeywordText(text)) {
  return false;
}
if (text === "extends" || text === "is" || text === "asserts") {
  return false;
}
return OperandUtil.IsIdentifier(text) && !OperandUtil.IsKeyword(text);
```


## static method IsArgumentStart:(units:Array<Token>, tokenIndex:int)=>bool

```ts
for (let at = tokenIndex - 1; at >= 1; at--) {
  const item = units[at];
  if (item.IsTriviaToken) {
    continue;
  }
  return item instanceof Symbol && item.Closed && item.Is(",");
}
return true;
```


## static method IsSegmentName:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
if (!TypeConditionalScan.IsNameUnit(units[tokenIndex])) {
  return false;
}
const start = TypeConditionalScan.RunStart(units);
return TypeConditionalScan.CodeCount(units, start, tokenIndex + 1) === 1;
```


## static method IsQualifiedTail:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
if (!TypeConditionalScan.IsNameUnit(units[tokenIndex])) {
  return false;
}
const start = TypeConditionalScan.RunStart(units);
if (TypeConditionalScan.CodeCount(units, start, tokenIndex + 1) !== 2) {
  return false;
}
const dot = TypeConditionalScan.FirstCodeIndex(units, start, tokenIndex + 1);
if (!(units[dot] instanceof Symbol) || !units[dot].Closed || !units[dot].Is(".")) {
  return false;
}
const left = ItemUtil.PreviousCode(units, dot - 1);
return left === TypeConditionalScan.LastTypeIndex(units) && units[left] instanceof TypeReferenceShape;
```


## static method IsReferenceTail:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is("<")) {
  return false;
}
const start = TypeConditionalScan.RunStart(units);
if (TypeConditionalScan.CodeCount(units, start, tokenIndex) !== 0) {
  return false;
}
return TypeConditionalScan.LastTypeShape(units) instanceof TypeReferenceShape;
```


## static method CanOpenTypeReference:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is("<")) {
  return false;
}
if (TypeConditionalScan.IsReferenceTail(units, tokenIndex)) {
  return true;
}
const start = TypeConditionalScan.RunStart(units);
if (TypeConditionalScan.CodeCount(units, start, tokenIndex) === 0) {
  return false;
}
return TypeConditionalScan.IsNameRun(units, start, tokenIndex);
```


## static method IsOperatorUnit:(unit:Token)=>bool

```ts
if (!(unit instanceof Symbol) || !unit.Closed) {
  return false;
}
return unit.Is("|") || unit.Is("&");
```


## static method IsOperatorShape:(unit:Token)=>bool

```ts
return unit instanceof UnionTypeShape || unit instanceof IntersectionTypeShape;
```


## static method LastTypeShape:(units:Array<Token>)=>Token | null

```ts
const at = TypeConditionalScan.LastTypeIndex(units);
if (at < 0) {
  return null;
}
return units[at];
```
