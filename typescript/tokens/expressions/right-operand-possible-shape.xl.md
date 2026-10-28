# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { BinaryExpressionShape } from "./binary-expression-shape.xl.md"
import { BigIntLiteralShape } from "../literals/big-int-literal-shape.xl.md"
import { NumericLiteralPossibleShape } from "./numeric-literal-possible-shape.xl.md"
import { IncrementalItemPosition } from "./numeric-literal-possible-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { ParenthesizedPossibleShape } from "./forms/primary/parenthesized-possible-shape.xl.md"
import { StringLiteralPrimaryPossibleShape } from "./forms/primary/string-literal-primary-possible-shape.xl.md"
import { TemplatePrimaryPossibleShape } from "./forms/primary/template-primary-possible-shape.xl.md"
import { KeywordLiteralPrimaryPossibleShape } from "./forms/primary/keyword-literal-primary-possible-shape.xl.md"
import { ObjectLiteralOperandPossibleShape } from "./forms/shared/object-literal-operand.xl.md"
```

# namespace cangjie

# class RightOperandPossibleShape extends PossibleShape

## static method IsIdentifierText:(text:string)=>bool

```ts
if (text.length === 0) {
  return false;
}
if (text === "true" || text === "false" || text === "null" || text === "undefined" || text === "this") {
  return false;
}
return true;
```

## static method Catalog:()=>Array<PossibleShape>

```ts
const shapes:Array<PossibleShape> = [];
shapes.push(new RightOperandPossibleShape());
shapes.push(RightOperandFormPossibleShape.Create("paren", new ParenthesizedPossibleShape()));
shapes.push(RightOperandFormPossibleShape.Create("string", new StringLiteralPrimaryPossibleShape()));
shapes.push(RightOperandFormPossibleShape.Create("template", new TemplatePrimaryPossibleShape()));
shapes.push(RightOperandFormPossibleShape.Create("keyword", new KeywordLiteralPrimaryPossibleShape()));
shapes.push(RightOperandFormPossibleShape.Create("object", new ObjectLiteralOperandPossibleShape()));
return shapes;
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
if (!(unit instanceof Common)) {
  return ShapeStates.Reject;
}
if ((unit as Common).IsNumber() || (unit as Common).IsBigInt()) {
  return ShapeStates.Accept;
}
// WP-A2：右操作数是**标识符**时也在这里建（`a / b` 的 `b`、`a instanceof B` 的 `B`）。
// 关键字 / 字面量（`true`/`false`/`null`/`undefined`/`this`…）留给 WP-A1/A4 的原子候选，这里 Reject。
if (RightOperandPossibleShape.IsIdentifierText((unit as Common).TempToString())) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
return !units[tokenIndex].IsTriviaToken;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
// [D0] 定位要建的那一格：trivia（空白 / 注释）跳过走 `ItemUtil.NextCode`（与其它候选同一份工具，
// 不在这里另写扫描）。正常情况 codeIndex === tokenIndex；只有目录在注释格被问到才会前移。
let codeIndex = ItemUtil.NextCode(host.Data, tokenIndex);
if (codeIndex < 0 || codeIndex >= host.Data.length) {
  throw new Error("增量变量形状未支持：expression 右操作数");
}
// [D0] 运算符与右操作数之间的 trivia（`1 + /* c */ 2` 的注释）留在宿主里会变成增量树多出来的 basic 行
// （legacy 的 `BinaryExpressionShape` 不保留它们，`residualBasicLines` 会 +N）。建之前从宿主摘掉：
// 与 legacy 同树，且 `Pos` 仍取「前一个非 trivia 代码单元」的终点（C1）。
while (codeIndex > 0 && host.Data[codeIndex - 1].IsTriviaToken) {
  host.Data.splice(codeIndex - 1, 1);
  codeIndex -= 1;
}
const token = host.Data[codeIndex];
if (!(token instanceof Common)) {
  throw new Error("增量变量形状未支持：expression 右操作数");
}
let shape: Token;
if ((token as Common).IsBigInt()) {
  // BigInt 也是数字字面量（`a + 10n` / `0b1010 / 1_000 / 10n`）。少了这一格外形，
  // `10n` 会落到下面的标识符分支，产出 `IdentifierShape text="10n"`（TS 是 `BigIntLiteral`）。
  const bigint = BigIntLiteralShape.FromBasicToken(token as Common, context);
  bigint.Pos = IncrementalItemPosition.AfterPreviousCode(host.Data, codeIndex);
  (token as Common).Replace(bigint);
  shape = bigint;
} else if ((token as Common).IsNumber()) {
  shape = NumericLiteralPossibleShape.BuildLiteral(token as Common, host, codeIndex, context);
} else {
  // WP-A2：右操作数是标识符（`a / b` 的 `b`、`a instanceof B` 的 `B`）。
  if (!RightOperandPossibleShape.IsIdentifierText((token as Common).TempToString())) {
    throw new Error("增量变量形状未支持：expression 右操作数正文 " + token.TempToString());
  }
  const identifier = IdentifierShape.FromBasicToken(token as Common, context);
  identifier.Pos = IncrementalItemPosition.AfterPreviousCode(host.Data, codeIndex);
  (token as Common).Replace(identifier);
  shape = identifier;
}
if (!(host instanceof BinaryExpressionShape)) {
  throw new Error("增量变量形状未支持：expression 右操作数宿主不是二元表达式");
}
(host as BinaryExpressionShape).SealRightOperand(context);
return shape;
```

# class RightOperandFormPossibleShape extends PossibleShape

## field Kind:string = ""

```ts
""
```

## field Inner:PossibleShape | null = null

```ts
null
```

## static method Create:(kind:string, inner:PossibleShape)=>RightOperandFormPossibleShape

```ts
const shape = new RightOperandFormPossibleShape();
shape.Kind = kind;
shape.Inner = inner;
return shape;
```

## static method IsOperatorLike:(unit:Token)=>bool

```ts
if (!(unit instanceof ShapeToken)) {
  return false;
}
const name = unit.constructor.name;
if (name.endsWith("TokenShape")) {
  return true;
}
// [R19] `instanceof` 的类名是 `InstanceOfKeywordShape`（大写 `O`）——这里原来只写了
// `InstanceofKeywordShape`，于是 `a instanceof (b)` / `a instanceof "x"` / `a instanceof { … }`
// 这一族**形态**右操作数从来认不出前驱是运算符，全部在右操作数格上落到
// `CatalogGuide: 没有候选形状可以构成`。`in` 的名字是对的（`InKeywordShape`），两格都保留。
if (name === "InKeywordShape") {
  return true;
}
return name === "InstanceOfKeywordShape" || name === "InstanceofKeywordShape";
```

## static method Claims:(unit:Token, kind:string)=>bool

```ts
if (kind === "paren") {
  if (!(unit instanceof Bracket)) {
    return false;
  }
  if (!(unit as Bracket).Closed) {
    return false;
  }
  return (unit as Bracket).StartBracketChar === "(";
}
if (kind === "string" || kind === "template") {
  if (!(unit instanceof String)) {
    return false;
  }
  const interpolation = (unit as String).IsSupportInterpolation;
  if (kind === "string") {
    return !interpolation;
  }
  return interpolation;
}
if (kind === "keyword") {
  if (!(unit instanceof Common)) {
    return false;
  }
  return (unit as Common).IsAny(["true", "false", "null"]);
}
if (kind === "object") {
  // [R19:OBJECT] 值位对象字面量：已闭合的 `{ … }` 括号（位置判据由 `ComputeByIndex` 的
  // 「前驱是运算符形状」回答，这里只看形态）。
  return ObjectLiteralOperandPossibleShape.Claims(unit);
}
return false;
```

## static method IsRelational:(unit:Token)=>bool

```ts
const name = unit.constructor.name;
return name === "LessThanTokenShape" || name === "GreaterThanTokenShape";
```

## static method AcceptsPrevious:(kind:string, previous:Token)=>bool

```ts
if (kind === "template") {
  return !RightOperandFormPossibleShape.IsRelational(previous);
}
return true;
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
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previous < 0) {
  return ShapeStates.Reject;
}
if (!RightOperandFormPossibleShape.IsOperatorLike(units[previous])) {
  return ShapeStates.Reject;
}
if (!RightOperandFormPossibleShape.AcceptsPrevious(this.Kind, units[previous])) {
  return ShapeStates.Reject;
}
if (!RightOperandFormPossibleShape.Claims(unit, this.Kind)) {
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
if (unit.IsTriviaToken) {
  return false;
}
if (this.Kind === "object") {
  // [R19:OBJECT] 值位对象字面量：形态已在 `ComputeByIndex` 判过，这里只再确认一次；
  // 括号里的内容由 `ObjectLiteralOperandPossibleShape.BuildInto` 用 legacy `ExpressionBuilder`
  // 整块吃掉（与容器关闭格候选建对象字面量同一条路）。
  return ObjectLiteralOperandPossibleShape.Claims(unit);
}
if (this.Kind !== "paren") {
  return true;
}
if (!(unit instanceof Bracket)) {
  return false;
}
return ParenthesizedPossibleShape.CanParseInside(unit as Bracket, context);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
if (this.Inner === null) {
  throw new Error("增量变量形状未支持：expression 右操作数形态缺内部候选");
}
let codeIndex = ItemUtil.NextCode(host.Data, tokenIndex);
if (codeIndex < 0 || codeIndex >= host.Data.length) {
  throw new Error("增量变量形状未支持：expression 右操作数");
}
while (codeIndex > 0 && host.Data[codeIndex - 1].IsTriviaToken) {
  host.Data.splice(codeIndex - 1, 1);
  codeIndex -= 1;
}
const built = this.Inner.BuildByIndex(host, codeIndex, catalog, context);
if (host instanceof BinaryExpressionShape) {
  const binary = host as BinaryExpressionShape;
  if (!binary.Closed) {
    binary.SealRightOperand(context);
  }
}
return built;
```
