# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { NumericLiteralShape } from "../literals/numeric-literal-shape.xl.md"
import { BinaryExpressionShape } from "./binary-expression-shape.xl.md"
import { BinaryExpressionEndPossibleShape } from "./binary-expression-end-possible-shape.xl.md"
import { BinaryOperatorTable } from "./binary-operator-table.xl.md"
import { RightOperandPossibleShape } from "./right-operand-possible-shape.xl.md"
import { VariableDeclarationShape } from "../declarations/variable-declaration-shape.xl.md"
```

# namespace cangjie

# class BinaryExpressionPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol)) {
  if (unit instanceof Common) {
    if (host instanceof BinaryExpressionShape) {
      return ShapeStates.Reject;
    }
    const before = ItemUtil.PreviousCode(units, tokenIndex - 1);
    if (before >= 0 && units[before] instanceof Symbol && (units[before] as Symbol).Is("=")) {
      return ShapeStates.Reject;
    }
    return ShapeStates.Reject;
  }
  if (unit instanceof NumericLiteralShape) {
    return ShapeStates.Reject;
  }
  return ShapeStates.Uncertain;
}
if (!unit.Closed) {
  return ShapeStates.Uncertain;
}
if (!BinaryOperatorTable.Contains(unit.TempToString())) {
  return ShapeStates.Reject;
}
if (host instanceof VariableDeclarationShape && unit.TempToString() === "=") {
  return ShapeStates.Reject;
}
if (BinaryExpressionPossibleShape.ShouldBuild(units, tokenIndex)) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return BinaryExpressionPossibleShape.ShouldBuild(units, tokenIndex);
```

## static method ShouldBuild:(units:Array<Token>, tokenIndex:int)=>bool

```ts
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed) {
  return false;
}
if (!BinaryOperatorTable.Contains(unit.TempToString())) {
  return false;
}
const leftIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (leftIndex < 0) {
  return false;
}
return BinaryExpressionPossibleShape.IsClosedOperand(units[leftIndex]);
```

## static method IsClosedOperand:(unit:Token)=>bool

```ts
if (unit instanceof BinaryExpressionShape) {
  return unit.Closed;
}
if (unit instanceof NumericLiteralShape) {
  return unit.Closed;
}
if (unit instanceof IdentifierShape) {
  return unit.Closed;
}
return false;
```

## static method PosOf:(unit:Token)=>int

```ts
if (unit instanceof ShapeToken) {
  return unit.Pos;
}
return -1;
```

## static method OperatorPosition:(units:Array<Token>, tokenIndex:int)=>int

```ts
let pos = units[tokenIndex].SourceRange.Start;
for (let at = tokenIndex - 1; at >= 0; at--) {
  const unit = units[at];
  if (!unit.IsTriviaToken) {
    continue;
  }
  if (unit.SourceRange.End !== pos) {
    continue;
  }
  pos = unit.SourceRange.Start;
}
return pos;
```

## static method LastOperandIndex:(data:Array<Token>)=>int

```ts
for (let at = data.length - 1; at >= 0; at--) {
  const unit = data[at];
  if (unit.IsTriviaToken || unit.IsBasicToken) {
    continue;
  }
  return at;
}
return -1;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const units = host.Data;
const operator = units[tokenIndex] as Symbol;
const info = BinaryOperatorTable.Find(operator.TempToString());
if (info === null) {
  throw new Error("BinaryExpressionPossibleShape: 不支持的运算符 " + operator.TempToString());
}
const precedence = info.Precedence;
const rightAssociative = info.RightAssociative;
const operatorShape = BinaryOperatorTable.Create(operator, BinaryExpressionPossibleShape.OperatorPosition(units, tokenIndex));
const leftIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (leftIndex < 0) {
  throw new Error("BinaryExpressionPossibleShape: 缺左操作数");
}
const left = units[leftIndex];

if (host instanceof BinaryExpressionShape) {
  const promotesHost = precedence < host.Precedence
    || (precedence === host.Precedence && !rightAssociative);
  if (promotesHost) {
    let target:BinaryExpressionShape = host;
    while (target.Parent instanceof BinaryExpressionShape) {
      const parent = target.Parent as BinaryExpressionShape;
      const promotesParent = precedence < parent.Precedence
        || (precedence === parent.Precedence && !rightAssociative);
      if (!promotesParent) {
        break;
      }
      target = parent;
    }
    const container = target.Parent;
    if (container === null) {
      throw new Error("BinaryExpressionPossibleShape: 二元式没有父单元，无法提升");
    }
    units.splice(tokenIndex, 1);
    const tail:Array<Token> = [];
    while (units.length > 0 && units[units.length - 1].IsTriviaToken) {
      tail.unshift(units.pop()!);
    }
    if (!target.Closed) {
      target.TryToClose(context);
    }
    const promoted = BinaryExpressionShape.FromLeftAndOperator(target, operatorShape, precedence, target.Template);
    promoted.Pos = target.Pos;
    let insertAt = 1;
    for (const item of tail) {
      item.Parent = promoted;
      promoted.Data.splice(insertAt, 0, item);
      insertAt++;
    }
    promoted.CatalogGuide = new CatalogGuide([new RightOperandPossibleShape(), new BinaryExpressionPossibleShape()], new BinaryExpressionEndPossibleShape());
    const at = container.Data.indexOf(target);
    if (at >= 0) {
      promoted.Parent = container;
      container.Data.splice(at, 1, promoted);
      container.MountedUnit = promoted;
    }
    return this.StampCreated(promoted, context);
  }
}

if (left instanceof BinaryExpressionShape && left.Closed) {
  const bindsTighter = rightAssociative ? precedence >= left.Precedence : precedence > left.Precedence;
  if (bindsTighter) {
    const rightIndex = BinaryExpressionPossibleShape.LastOperandIndex(left.Data);
    if (rightIndex >= 0) {
      const right = left.Data[rightIndex];
      left.Data.splice(rightIndex, 1);
      const nested = BinaryExpressionShape.FromLeftAndOperator(right, operatorShape, precedence, left.Template);
      nested.Pos = BinaryExpressionPossibleShape.PosOf(right);
      left.Add(nested);
      left.Closed = false;
      left.SourceRange.End = -1;
      left.MountedUnit = nested;
      nested.CatalogGuide = new CatalogGuide([new RightOperandPossibleShape(), new BinaryExpressionPossibleShape()], new BinaryExpressionEndPossibleShape());
      units.splice(tokenIndex, 1);
      host.MountedUnit = left;
      return this.StampCreated(nested, context);
    }
  }
}

const binary = BinaryExpressionShape.FromLeftAndOperator(left, operatorShape, precedence, host.Template);
binary.Pos = BinaryExpressionPossibleShape.PosOf(left);
units.splice(tokenIndex, 1);
units.splice(leftIndex, 1, binary);
const tail = units.splice(leftIndex + 1);
let insertAt = 1;
for (const item of tail) {
  item.Parent = binary;
  binary.Data.splice(insertAt, 0, item);
  insertAt++;
}
binary.Parent = host;
host.MountedUnit = binary;
binary.CatalogGuide = new CatalogGuide([new RightOperandPossibleShape(), new BinaryExpressionPossibleShape()], new BinaryExpressionEndPossibleShape());
return this.StampCreated(binary, context);
```
