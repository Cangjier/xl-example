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
import { NumericLiteralShape } from "../literals/numeric-literal-shape.xl.md"
import { AsteriskTokenShape } from "../punctuation/asterisk-token-shape.xl.md"
import { PlusTokenShape } from "../punctuation/plus-token-shape.xl.md"
import { BinaryExpressionShape } from "./binary-expression-shape.xl.md"
import { RightOperandPossibleShape } from "./right-operand-possible-shape.xl.md"
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
// 这一格只可能是「运算符 Symbol」。非 Symbol 里只有两种情况必须让位：
// 二元式宿主上的右操作数（归 RightOperand）、声明宿主上 `=` 之后的首操作数（归 NumericLiteral）。
// 其余单元保持 Uncertain——候选一旦在某一格被淘汰，要等到下一次 build 的 Reset 才会回来，
// 注释 / 字符串之类的格子不能把它误杀。
if (!(unit instanceof Symbol)) {
  if (unit instanceof Common) {
    if (host instanceof BinaryExpressionShape) {
      return ShapeStates.Reject;
    }
    const before = ItemUtil.PreviousCode(units, tokenIndex - 1);
    if (before >= 0 && units[before] instanceof Symbol && (units[before] as Symbol).Is("=")) {
      return ShapeStates.Reject;
    }
    return ShapeStates.Uncertain;
  }
  if (unit instanceof NumericLiteralShape) {
    return ShapeStates.Reject;
  }
  return ShapeStates.Uncertain;
}
if (!unit.Closed) {
  return ShapeStates.Uncertain;
}
if (BinaryExpressionPossibleShape.ShouldBuild(units, tokenIndex)) {
  return ShapeStates.Accept;
}
// 还不认识的运算符保持 Uncertain（等待后续实现），不在这里把整棵候选集清零。
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return BinaryExpressionPossibleShape.ShouldBuild(units, tokenIndex);
```

## static method ShouldBuild:(units:Array<Token>, tokenIndex:int)=>bool

```ts
// 运算符已关闭，左边是一个已封口的操作数形状。当前只做乘号与加号。
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed) {
  return false;
}
if (!unit.IsAny(["*", "+"])) {
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
return false;
```

## static method Precedence:(text:string)=>int

```ts
if (text === "*" || text === "/" || text === "%") {
  return 2;
}
return 1;
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
// pos 取「紧贴运算符左侧那串 trivia 的起点」。不能直接复用 ItemUtil.PositionOf：
// 二元式封口退出后，它前面的 trivia 会留在父单元、排在它后面，数组顺序不再等于源码顺序。
let pos = units[tokenIndex].SourceRange.Start;
let moved = true;
while (moved) {
  moved = false;
  for (let at = 0; at < units.length; at++) {
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

## static method TokenShape:(operator:Symbol, pos:int)=>Token

```ts
if (operator.Is("*")) {
  return AsteriskTokenShape.FromSymbol(operator, pos);
}
if (operator.Is("+")) {
  return PlusTokenShape.FromSymbol(operator, pos);
}
throw new Error("BinaryExpressionPossibleShape: 不支持的运算符 " + operator.TempToString());
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
const precedence = BinaryExpressionPossibleShape.Precedence(operator.TempToString());
const operatorShape = BinaryExpressionPossibleShape.TokenShape(operator, BinaryExpressionPossibleShape.OperatorPosition(units, tokenIndex));
const leftIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (leftIndex < 0) {
  throw new Error("BinaryExpressionPossibleShape: 缺左操作数");
}
const left = units[leftIndex];

// 情形一：宿主自己就是一个二元式，且新运算符不高于宿主的优先级（`1+2+3` 的第二个 `+`）。
// 此时整个宿主是左操作数：新二元式建在宿主的父单元上，宿主原位换成新式。
if (host instanceof BinaryExpressionShape && precedence <= host.Precedence) {
  const container = host.Parent;
  if (container === null) {
    throw new Error("BinaryExpressionPossibleShape: 二元式没有父单元，无法提升");
  }
  units.splice(tokenIndex, 1);
  const tail:Array<Token> = [];
  while (units.length > 0 && units[units.length - 1].IsTriviaToken) {
    tail.unshift(units.pop()!);
  }
  if (!host.Closed) {
    host.TryToClose(context);
  }
  const promoted = BinaryExpressionShape.FromLeftAndOperator(host, operatorShape, precedence, host.Template);
  promoted.Pos = host.Pos;
  for (const item of tail) {
    promoted.Add(item);
  }
  promoted.CatalogGuide = new CatalogGuide([new RightOperandPossibleShape(), new BinaryExpressionPossibleShape()], null);
  const at = container.Data.indexOf(host);
  if (at >= 0) {
    promoted.Parent = container;
    container.Data.splice(at, 1, promoted);
    container.MountedUnit = promoted;
  }
  return promoted;
}

// 情形二：左操作数是已封口的二元式，而新运算符绑得更紧（`1+2*3` 的 `*`）。
// 把左式最右的操作数拆出来，作为新二元式的左操作数，新式挂回左式右侧；左式重新打开。
if (left instanceof BinaryExpressionShape && left.Closed && precedence > left.Precedence) {
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
    nested.CatalogGuide = new CatalogGuide([new RightOperandPossibleShape(), new BinaryExpressionPossibleShape()], null);
    units.splice(tokenIndex, 1);
    host.MountedUnit = left;
    return nested;
  }
}

// 情形三：左操作数原样作为左子树（`2*3+1` 的 `+`）。
const binary = BinaryExpressionShape.FromLeftAndOperator(left, operatorShape, precedence, host.Template);
binary.Pos = BinaryExpressionPossibleShape.PosOf(left);
units.splice(tokenIndex, 1);
units.splice(leftIndex, 1, binary);
// 运算符前的 trivia 不能留在宿主尾部：宿主可能在 SignOut 之前就被关闭，
// 那时它的 End 会取最后一个子单元——留下来的空白会把右边界截在运算符之前。
const tail = units.splice(leftIndex + 1);
for (const item of tail) {
  binary.Add(item);
}
binary.Parent = host;
host.MountedUnit = binary;
binary.CatalogGuide = new CatalogGuide([new RightOperandPossibleShape(), new BinaryExpressionPossibleShape()], null);
return binary;
```
