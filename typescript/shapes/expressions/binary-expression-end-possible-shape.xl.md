# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ReloadMessage } from "../../../core/syntax/messages/reload-message.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { BinaryExpressionShape } from "./binary-expression-shape.xl.md"
import { BinaryOperatorTable } from "./binary-operator-table.xl.md"
import { SuffixAccessPossibleShape } from "./suffix-access-possible-shape.xl.md"
import { BinaryOperatorTokenShape } from "../punctuation/binary-operator-token-shape.xl.md"
```

# namespace cangjie

# class BinaryExpressionEndPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (BinaryExpressionEndPossibleShape.ShouldEnd(host.Data, tokenIndex)) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return BinaryExpressionEndPossibleShape.ShouldEnd(units, tokenIndex);
```

## static method ShouldEnd:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!unit.Closed) {
  return false;
}
if (SuffixAccessPossibleShape.KindOf(units, tokenIndex) !== "") {
  return false;
}
if (!BinaryExpressionEndPossibleShape.HasOperandBefore(units, tokenIndex)) {
  return false;
}
if (unit instanceof Symbol) {
  return !BinaryOperatorTable.Contains(unit.TempToString());
}
if (unit instanceof Common) {
  return BinaryExpressionEndPossibleShape.HasLineTerminatorBefore(units, tokenIndex);
}
return false;
```

## static method HasOperandBefore:(units:Array<Token>, tokenIndex:int)=>bool

```ts
for (let at = tokenIndex - 1; at >= 0; at--) {
  const item = units[at];
  if (item.IsTriviaToken || item.IsBasicToken) {
    continue;
  }
  return !(item instanceof BinaryOperatorTokenShape);
}
return false;
```

## static method HasLineTerminatorBefore:(units:Array<Token>, tokenIndex:int)=>bool

```ts
for (let at = tokenIndex - 1; at >= 0; at--) {
  const item = units[at];
  if (item.IsTriviaToken) {
    if (BinaryExpressionShape.HasLineTerminatorTrivia(item)) {
      return true;
    }
    continue;
  }
  break;
}
return false;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  throw new Error("BinaryExpressionEndPossibleShape: 下标越界");
}
const unit = units[tokenIndex];
let startIndex = tokenIndex;
if (unit instanceof Common) {
  for (let at = tokenIndex - 1; at >= 0; at--) {
    const item = units[at];
    if (item.IsTriviaToken) {
      startIndex = at;
      continue;
    }
    break;
  }
}
const start = units[startIndex].SourceRange.Start;
const end = unit.SourceRange.End;
units.splice(startIndex, units.length - startIndex);
host.TryToClose(context);
host.Quit();
context.Messages.push(ReloadMessage.FromRange(unit, start, end));
return this.StampCreated(unit, context);
```
