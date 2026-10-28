# dependencies
```xl
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { ItemUtil } from "../../../item-util.xl.md"
import { IdentifierShape } from "../../../names/identifier-shape.xl.md"
import { NumericLiteralShape } from "../../../literals/numeric-literal-shape.xl.md"
import { IncrementalItemPosition } from "../../numeric-literal-possible-shape.xl.md"
import { OperatorShapeMap } from "../../operator-shape-map.xl.md"
import { OperatorTable } from "../../operator-table.xl.md"
import { Bracket } from "../../../../../core/syntax/basic-tokens/bracket.xl.md"
import { ObjectLiteralOperandPossibleShape } from "../shared/object-literal-operand.xl.md"
```

# namespace cangjie

```text
let x = -y
VariableDeclarationShape  pos=3  src=[4,10)
├─ IdentifierShape  pos=3  src=[4,5)  text="x"
└─ PrefixUnaryExpressionShape  pos=7  src=[8,10)
   └─ IdentifierShape  pos=9  src=[9,10)  text="y"

let x = !!y                      let x = typeof y
PrefixUnaryExpressionShape       TypeOfExpressionShape
  pos=7  src=[8,11)                pos=7  src=[8,16)
  └─ PrefixUnaryExpressionShape    └─ IdentifierShape  pos=14  src=[15,16)
     pos=9  src=[9,11)
     └─ IdentifierShape pos=10  src=[10,11)
```

# class PrefixUnaryPossibleShape extends PossibleShape

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

```ts
shapes.push(new PrefixUnaryPossibleShape());
```

## static method IsPrefixText:(text:string)=>bool

```ts
if (!OperatorTable.IsPrefixOperator(text)) {
  return false;
}
if (text === "delete" || text === "++" || text === "--") {
  return false;
}
return true;
```

## static method IsHandledText:(text:string)=>bool

```ts
return PrefixUnaryPossibleShape.IsPrefixText(text);
```

## static method TextOf:(unit:Token)=>string

```ts
if (unit instanceof Symbol) {
  return (unit as Symbol).TempToString();
}
if (unit instanceof Common) {
  return (unit as Common).TempToString();
}
return "";
```

## static method OperatorRunStart:(units:Array<Token>, before:int)=>int

```ts
let at = before;
let start = -1;
while (at >= 0) {
  if (units[at].IsTriviaToken) {
    at -= 1;
    continue;
  }
  const text = PrefixUnaryPossibleShape.TextOf(units[at]);
  if (!PrefixUnaryPossibleShape.IsPrefixText(text)) {
    break;
  }
  if (!PrefixUnaryPossibleShape.IsHandledText(text)) {
    return -1;
  }
  start = at;
  at -= 1;
}
if (start < 0) {
  return -1;
}
const head = ItemUtil.PreviousCode(units, at);
if (head < 0) {
  return -1;
}
const unit = units[head];
if (!(unit instanceof Symbol)) {
  return -1;
}
if (!(unit as Symbol).Is("=")) {
  return -1;
}
return start;
```

## static method IsPrefixPosition:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return false;
}
if (!PrefixUnaryPossibleShape.IsHandledText(PrefixUnaryPossibleShape.TextOf(unit))) {
  return false;
}
return PrefixUnaryPossibleShape.OperatorRunStart(units, tokenIndex) >= 0;
```

## static method IsOperandPosition:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return false;
}
if (PrefixUnaryPossibleShape.IsPrefixText(PrefixUnaryPossibleShape.TextOf(unit))) {
  return false;
}
return PrefixUnaryPossibleShape.OperatorRunStart(units, tokenIndex - 1) >= 0;
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
const start = ItemUtil.ItemStartCached(units, cache);
if (tokenIndex < start) {
  return ShapeStates.Reject;
}
if (unit instanceof Symbol && (unit as Symbol).Is("=")) {
  return ShapeStates.Uncertain;
}
if (PrefixUnaryPossibleShape.IsPrefixPosition(units, tokenIndex)) {
  return ShapeStates.Uncertain;
}
if (PrefixUnaryPossibleShape.IsOperandPosition(units, tokenIndex)) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return PrefixUnaryPossibleShape.IsOperandPosition(units, tokenIndex);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const operandIndex = ItemUtil.NextCode(host.Data, tokenIndex);
if (operandIndex < 0 || operandIndex >= host.Data.length) {
  throw new Error("增量变量形状未支持：expression 前缀一元操作数");
}
const firstOperator = PrefixUnaryPossibleShape.OperatorRunStart(host.Data, operandIndex - 1);
if (firstOperator < 0) {
  throw new Error("增量变量形状未支持：expression 前缀一元运算符串");
}
const operatorIndexes:Array<number> = [];
for (let at = firstOperator; at < operandIndex; at++) {
  if (host.Data[at].IsTriviaToken) {
    continue;
  }
  const text = PrefixUnaryPossibleShape.TextOf(host.Data[at]);
  if (!PrefixUnaryPossibleShape.IsHandledText(text)) {
    throw new Error("增量变量形状未支持：expression 前缀运算符 " + text);
  }
  operatorIndexes.push(at);
}
if (operatorIndexes.length === 0) {
  throw new Error("增量变量形状未支持：expression 前缀一元运算符串为空");
}
const lastOperator = operatorIndexes[operatorIndexes.length - 1];
const operandUnit = host.Data[operandIndex];
const operatorEnd = host.Data[lastOperator].SourceRange.End;
if (operatorEnd < 0) {
  throw new Error("增量变量形状未支持：expression 前缀一元运算符未签出");
}
let operandEnd = operatorEnd;
let inner:Token;
if (operandUnit instanceof Common) {
  const common = operandUnit as Common;
  if (common.IsNumber()) {
    const literal = NumericLiteralShape.FromBasicToken(common, context);
    literal.Pos = operatorEnd;
    common.Replace(literal);
    inner = literal;
  } else {
    const text = common.TempToString();
    if (text === "true" || text === "false" || text === "null" || text === "this"
      || text === "in" || text === "instanceof") {
      throw new Error("增量变量形状未支持：expression 前缀一元操作数关键字 " + text);
    }
    const identifier = IdentifierShape.FromBasicToken(common, context);
    identifier.Pos = operatorEnd;
    common.Replace(identifier);
    inner = identifier;
  }
  if (inner.SourceRange.End >= 0) {
    operandEnd = inner.SourceRange.End;
  }
} else if (operandUnit instanceof Bracket && ObjectLiteralOperandPossibleShape.Claims(operandUnit)) {
  // [R19:OBJECT] 值位对象字面量：`typeof { a: 1 }` / `void { a: 1 }` / `!{ a: 1 }`。
  // 操作数是**已闭合的 `{ … }` 括号**时，交 `ObjectLiteralOperandPossibleShape.BuildInto`
  // 用 legacy `ExpressionBuilder` 整块吃掉（与容器关闭格候选建对象字面量同一条路）。
  // 原位顶替、长度不变，所以下面 `removed` / `kept` 用的下标集合继续有效。
  inner = ObjectLiteralOperandPossibleShape.BuildInto(host, operandIndex, context);
  if (inner.SourceRange.End < 0) {
    throw new Error("增量变量形状未支持：expression 前缀一元操作数未签出");
  }
  operandEnd = inner.SourceRange.End;
} else {
  throw new Error("增量变量形状未支持：expression 前缀一元操作数");
}
for (let at = operatorIndexes.length - 1; at >= 0; at--) {
  const index = operatorIndexes[at];
  const operatorUnit = host.Data[index];
  const text = PrefixUnaryPossibleShape.TextOf(operatorUnit);
  const start = operatorUnit.SourceRange.Start;
  if (start < 0) {
    throw new Error("增量变量形状未支持：expression 前缀一元运算符未签入");
  }
  const pos = IncrementalItemPosition.AfterPreviousCode(host.Data, index);
  const created = OperatorShapeMap.Create(text, OperatorShapeMap.PositionPrefix, host.Template, -1, -1, null);
  if (!(created instanceof ShapeToken)) {
    throw new Error("增量变量形状未支持：expression 前缀一元节点不是形状");
  }
  const node = created as ShapeToken;
  node.Pos = pos;
  node.SignIn(start);
  node.SignOut(operandEnd);
  node.Add(inner);
  inner = node;
}
const removed = new Set<number>();
for (const index of operatorIndexes) {
  removed.add(index);
}
removed.add(operandIndex);
const kept:Array<Token> = [];
for (let at = 0; at < host.Data.length; at++) {
  if (at === firstOperator) {
    kept.push(inner);
    continue;
  }
  if (removed.has(at)) {
    continue;
  }
  kept.push(host.Data[at]);
}
host.Data.length = 0;
for (const item of kept) {
  item.Parent = host;
  host.Data.push(item);
}
return inner;
```

## method ContinuationClaim:(units:Array<Token>, tokenIndex:int)=>bool

```ts
return PrefixUnaryPossibleShape.IsPrefixPosition(units, tokenIndex);
```
