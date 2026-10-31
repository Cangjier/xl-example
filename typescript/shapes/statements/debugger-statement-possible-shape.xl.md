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
import { StatementUtil } from "./statement-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { DebuggerStatementShape } from "./debugger-statement-shape.xl.md"
```

# namespace cangjie

# class DebuggerStatementPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
const start = StatementUtil.StartIndex(units);
if (start >= units.length || tokenIndex < start || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit instanceof Common) {
  if (tokenIndex === start && unit.TempToString() === "debugger") {
    return ShapeStates.Uncertain;
  }
  return ShapeStates.Reject;
}
if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is(";")) {
  return ShapeStates.Reject;
}
if (DebuggerStatementPossibleShape.IsPattern(units, start, tokenIndex)) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex !== units.length - 1) {
  return false;
}
const start = StatementUtil.StartIndex(units);
return DebuggerStatementPossibleShape.IsPattern(units, start, tokenIndex);
```

## static method IsPattern:(units:Array<Token>, start:int, tokenIndex:int)=>bool

```ts
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is(";")) {
  return false;
}
let headIndex = -1;
let codeCount = 0;
for (let at = start; at < tokenIndex; at++) {
  if (units[at].IsTriviaToken) {
    continue;
  }
  headIndex = at;
  codeCount++;
}
if (codeCount !== 1) {
  return false;
}
const head = units[headIndex];
return head instanceof Common && head.Closed && head.TempToString() === "debugger";
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const start = StatementUtil.StartIndex(units);
const semicolon = units[tokenIndex] as Symbol;
const keywordIndex = StatementUtil.NextCode(units, start);
const keyword = units[keywordIndex] as Common;
const shape = DebuggerStatementShape.FromKeywordAndSemicolon(keyword, semicolon, ItemUtil.PositionOf(units, start));
units.splice(start, tokenIndex - start + 1, shape);
shape.Parent = host;
host.MountedUnit = null;
return this.StampCreated(shape, context);
```
