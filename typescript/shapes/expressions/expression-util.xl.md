# dependencies
```xl
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { PostfixUnaryExpressionShape } from "../statements/postfix-unary-expression-shape.xl.md"
import { BinaryExpressionShape } from "./binary-expression-shape.xl.md"
import { AsExpressionShape } from "./as-expression-shape.xl.md"
import { ConditionalExpressionShape } from "./conditional-expression-shape.xl.md"
import { NewExpressionShape } from "./new-expression-shape.xl.md"
import { OperandUtil } from "./operand-util.xl.md"
import { ParenthesizedExpressionShape } from "./parenthesized-expression-shape.xl.md"
import { SuffixAccessUtil } from "./suffix-access-util.xl.md"
import { UnaryExpressionShape } from "./unary-expression-shape.xl.md"
```

# namespace cangjie

# class ExpressionUtil

## static method IsClosedOperand:(unit:Token)=>bool

```ts
if (!unit.Closed) {
  return false;
}
if (unit instanceof BinaryExpressionShape) {
  return true;
}
if (unit instanceof ConditionalExpressionShape) {
  return true;
}
if (unit instanceof UnaryExpressionShape) {
  return true;
}
if (unit instanceof PostfixUnaryExpressionShape) {
  return true;
}
if (unit.constructor.name === "CallExpressionShape") {
  return true;
}
if (unit instanceof AsExpressionShape) {
  return true;
}
if (unit instanceof NewExpressionShape) {
  return true;
}
if (unit instanceof ParenthesizedExpressionShape) {
  return true;
}
return SuffixAccessUtil.IsOperand(unit);
```

## static method PosOf:(unit:Token)=>int

```ts
if (unit instanceof ShapeToken) {
  return unit.Pos;
}
return unit.SourceRange.Start;
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

## static method IsPrefixKeyword:(text:string)=>bool

```ts
return text === "typeof" || text === "void" || text === "delete";
```

## static method IsPrefixOperator:(unit:Token)=>bool

```ts
if (!unit.Closed) {
  return false;
}
if (unit instanceof Symbol) {
  return unit.IsAny(["!", "~", "+", "-"]);
}
if (unit instanceof Common) {
  return ExpressionUtil.IsPrefixKeyword(unit.TempToString());
}
return false;
```

## static method CanBeOperand:(common:Common)=>bool

```ts
if (common.IsNumber() || common.IsBigInt()) {
  return true;
}
const text = common.TempToString();
if (ExpressionUtil.IsPrefixKeyword(text)) {
  return false;
}
return OperandUtil.IsIdentifier(text);
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

## static method HasOperandBefore:(units:Array<Token>, tokenIndex:int)=>bool

```ts
for (let at = tokenIndex - 1; at >= 0; at--) {
  const item = units[at];
  if (item.IsTriviaToken || item.IsBasicToken) {
    continue;
  }
  return ExpressionUtil.IsClosedOperand(item);
}
return false;
```
