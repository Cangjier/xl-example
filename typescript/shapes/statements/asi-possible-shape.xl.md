# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { OperandUtil } from "../expressions/operand-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { BinaryExpressionPossibleShape } from "../expressions/binary-expression-possible-shape.xl.md"
import { SuffixAccessPossibleShape } from "../expressions/suffix-access-possible-shape.xl.md"
import { ExpressionStatementEndPossibleShape } from "./expression-statement-end-possible-shape.xl.md"
import { ExpressionStatementShape } from "./expression-statement-shape.xl.md"
```

# namespace cangjie

# class AsiPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (!(unit instanceof Common) || !unit.Closed) {
  return ShapeStates.Reject;
}
if (!OperandUtil.CanStartExpression(unit) && !AsiPossibleShape.IsStatementKeyword(unit)) {
  return ShapeStates.Reject;
}
const prevIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (prevIndex < 0) {
  return ShapeStates.Reject;
}
const prev = units[prevIndex];
if (!AsiPossibleShape.IsClosedOperand(prev)) {
  return ShapeStates.Reject;
}
if (!AsiPossibleShape.HasLineTerminator(units, prevIndex, tokenIndex)) {
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
if (!(unit instanceof Common) || !unit.Closed || (!OperandUtil.CanStartExpression(unit) && !AsiPossibleShape.IsStatementKeyword(unit))) {
  return false;
}
const prevIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (prevIndex < 0 || !AsiPossibleShape.IsClosedOperand(units[prevIndex])) {
  return false;
}
return AsiPossibleShape.HasLineTerminator(units, prevIndex, tokenIndex);
```

## static method IsStatementKeyword:(unit:Common)=>bool

```ts
const text = unit.TempToString();
return text === "let" || text === "debugger" || text === "type";
```

## static method IsClosedOperand:(unit:Token)=>bool

```ts
const name = unit.constructor.name;
if (name === "IdentifierShape" || name === "NumericLiteralShape" || name === "BinaryExpressionShape" || name === "PropertyAccessExpressionShape" || name === "ElementAccessExpressionShape") {
  return unit.Closed;
}
return false;
```

## static method HasLineTerminator:(units:Array<Token>, prevIndex:int, tokenIndex:int)=>bool

```ts
for (let at = prevIndex + 1; at < tokenIndex; at++) {
  const item = units[at];
  if (!item.IsTriviaToken) {
    continue;
  }
  const text = item.AstText();
  if (text.indexOf("\n") >= 0 || text.indexOf("\r") >= 0 || text.indexOf("\u2028") >= 0 || text.indexOf("\u2029") >= 0) {
    return true;
  }
}
return false;
```

## static method PositionOf:(units:Array<Token>, index:int)=>int

```ts
let pos = units[index].SourceRange.Start;
let moved = true;
while (moved) {
  moved = false;
  for (let at = 0; at <= index; at++) {
    const unit = units[at];
    if (unit.IsTriviaToken && unit.SourceRange.End === pos) {
      pos = unit.SourceRange.Start;
      moved = true;
      break;
    }
  }
}
return pos;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const hostName = host.constructor.name;
const unit = units[tokenIndex] as Common;
const operandStart = OperandUtil.CanStartExpression(unit);
const prevIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
const prev = units[prevIndex];
const pos = AsiPossibleShape.PositionOf(units, tokenIndex);
const tail = units.splice(prevIndex + 1);
let current:Common | null = null;
if (operandStart) {
  current = tail.pop()! as Common;
}
let statement:Token | null = null;
if (hostName === "ExpressionStatementShape") {
  host.SourceRange.End = prev.SourceRange.End;
  host.TryToClose(context);
  statement = host;
  host.Quit();
} else {
  host.SourceRange.End = prev.SourceRange.End;
  host.TryToClose(context);
  const list = host.Parent;
  host.Quit();
  if (list !== null) {
    list.SourceRange.End = prev.SourceRange.End;
    list.TryToClose(context);
    statement = list.Parent;
    list.Quit();
  }
}
if (statement === null) {
  throw new Error("AsiPossibleShape: 找不到语句");
}
const source = statement.Parent;
if (source === null) {
  throw new Error("AsiPossibleShape: 找不到 SourceFile");
}
statement.SourceRange.End = prev.SourceRange.End;
statement.TryToClose(context);
statement.Quit();
let insertAt = source.Data.indexOf(statement);
insertAt = insertAt < 0 ? source.Data.length : insertAt + 1;
for (const item of tail) {
  item.Parent = source;
  source.Data.splice(insertAt, 0, item);
  insertAt++;
}
if (current === null) {
  source.MountedUnit = null;
  return this.StampCreated(statement, context);
}
const operand = OperandUtil.FromCommon(current, pos);
const next = new ExpressionStatementShape(source.Template);
next.Pos = pos;
next.SignIn(current.SourceRange.Start);
next.Add(operand);
next.CatalogGuide = new CatalogGuide(
  [new BinaryExpressionPossibleShape(), new SuffixAccessPossibleShape(), new AsiPossibleShape()],
  new ExpressionStatementEndPossibleShape(),
);
source.Data.splice(insertAt, 0, next);
next.Parent = source;
source.MountedUnit = next;
return this.StampCreated(next, context);
```
