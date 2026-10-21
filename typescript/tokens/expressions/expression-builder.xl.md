# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ConstString } from "../../../core/syntax/basic-tokens/string/const-string.xl.md"
import { InterpolationString } from "../../../core/syntax/basic-tokens/string/interpolation-string.xl.md"
import { RegexToken } from "../../../core/syntax/basic-tokens/regex-token.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { FirstAssignmentShape } from "../aliases/first-assignment-shape.xl.md"
import { FirstBinaryOperatorShape } from "../aliases/first-binary-operator-shape.xl.md"
import { FirstCompoundAssignmentShape } from "../aliases/first-compound-assignment-shape.xl.md"
import { LastBinaryOperatorShape } from "../aliases/last-binary-operator-shape.xl.md"
import { AmpersandAmpersandEqualsTokenShape } from "../punctuation/ampersand-ampersand-equals-token-shape.xl.md"
import { AmpersandAmpersandTokenShape } from "../punctuation/ampersand-ampersand-token-shape.xl.md"
import { AmpersandEqualsTokenShape } from "../punctuation/ampersand-equals-token-shape.xl.md"
import { AmpersandTokenShape } from "../punctuation/ampersand-token-shape.xl.md"
import { AsteriskAsteriskEqualsTokenShape } from "../punctuation/asterisk-asterisk-equals-token-shape.xl.md"
import { AsteriskAsteriskTokenShape } from "../punctuation/asterisk-asterisk-token-shape.xl.md"
import { AsteriskEqualsTokenShape } from "../punctuation/asterisk-equals-token-shape.xl.md"
import { AsteriskTokenShape } from "../punctuation/asterisk-token-shape.xl.md"
import { BarBarEqualsTokenShape } from "../punctuation/bar-bar-equals-token-shape.xl.md"
import { BarBarTokenShape } from "../punctuation/bar-bar-token-shape.xl.md"
import { BarEqualsTokenShape } from "../punctuation/bar-equals-token-shape.xl.md"
import { BarTokenShape } from "../punctuation/bar-token-shape.xl.md"
import { CaretTokenShape } from "../punctuation/caret-token-shape.xl.md"
import { ColonTokenShape } from "../punctuation/colon-token-shape.xl.md"
import { CommaTokenShape } from "../punctuation/comma-token-shape.xl.md"
import { DotDotDotTokenShape } from "../punctuation/dot-dot-dot-token-shape.xl.md"
import { EqualsEqualsEqualsTokenShape } from "../punctuation/equals-equals-equals-token-shape.xl.md"
import { EqualsEqualsTokenShape } from "../punctuation/equals-equals-token-shape.xl.md"
import { EqualsGreaterThanTokenShape } from "../punctuation/equals-greater-than-token-shape.xl.md"
import { ExclamationEqualsEqualsTokenShape } from "../punctuation/exclamation-equals-equals-token-shape.xl.md"
import { ExclamationEqualsTokenShape } from "../punctuation/exclamation-equals-token-shape.xl.md"
import { GreaterThanEqualsTokenShape } from "../punctuation/greater-than-equals-token-shape.xl.md"
import { GreaterThanGreaterThanEqualsTokenShape } from "../punctuation/greater-than-greater-than-equals-token-shape.xl.md"
import { GreaterThanGreaterThanGreaterThanEqualsTokenShape } from "../punctuation/greater-than-greater-than-greater-than-equals-token-shape.xl.md"
import { GreaterThanGreaterThanGreaterThanTokenShape } from "../punctuation/greater-than-greater-than-greater-than-token-shape.xl.md"
import { GreaterThanGreaterThanTokenShape } from "../punctuation/greater-than-greater-than-token-shape.xl.md"
import { GreaterThanTokenShape } from "../punctuation/greater-than-token-shape.xl.md"
import { LessThanEqualsTokenShape } from "../punctuation/less-than-equals-token-shape.xl.md"
import { LessThanLessThanEqualsTokenShape } from "../punctuation/less-than-less-than-equals-token-shape.xl.md"
import { LessThanLessThanTokenShape } from "../punctuation/less-than-less-than-token-shape.xl.md"
import { MinusEqualsTokenShape } from "../punctuation/minus-equals-token-shape.xl.md"
import { MinusTokenShape } from "../punctuation/minus-token-shape.xl.md"
import { PercentEqualsTokenShape } from "../punctuation/percent-equals-token-shape.xl.md"
import { PercentTokenShape } from "../punctuation/percent-token-shape.xl.md"
import { PlusTokenShape } from "../punctuation/plus-token-shape.xl.md"
import { QuestionDotTokenShape } from "../punctuation/question-dot-token-shape.xl.md"
import { QuestionQuestionEqualsTokenShape } from "../punctuation/question-question-equals-token-shape.xl.md"
import { QuestionQuestionTokenShape } from "../punctuation/question-question-token-shape.xl.md"
import { QuestionTokenShape } from "../punctuation/question-token-shape.xl.md"
import { SlashEqualsTokenShape } from "../punctuation/slash-equals-token-shape.xl.md"
import { SlashTokenShape } from "../punctuation/slash-token-shape.xl.md"
import { ArrayLiteralExpressionShape } from "./array-literal-expression-shape.xl.md"
import { OmittedExpressionShape } from "./omitted-expression-shape.xl.md"
import { ArrowFunctionShape } from "./arrow-function-shape.xl.md"
import { BinaryExpressionShape } from "./binary-expression-shape.xl.md"
import { CallExpressionShape } from "./call-expression-shape.xl.md"
import { ClassExpressionShape } from "./class-expression-shape.xl.md"
import { ConditionalExpressionShape } from "./conditional-expression-shape.xl.md"
import { DeleteExpressionShape } from "./delete-expression-shape.xl.md"
import { ElementAccessExpressionShape } from "./element-access-expression-shape.xl.md"
import { FunctionExpressionShape } from "./function-expression-shape.xl.md"
import { NewExpressionShape } from "./new-expression-shape.xl.md"
import { NonNullExpressionShape } from "./non-null-expression-shape.xl.md"
import { ObjectLiteralExpressionShape } from "./object-literal-expression-shape.xl.md"
import { ParenthesizedExpressionShape } from "./parenthesized-expression-shape.xl.md"
import { PostfixUnaryExpressionShape } from "./postfix-unary-expression-shape.xl.md"
import { PrefixUnaryExpressionShape } from "./prefix-unary-expression-shape.xl.md"
import { PropertyAccessExpressionShape } from "./property-access-expression-shape.xl.md"
import { TaggedTemplateExpressionShape } from "./tagged-template-expression-shape.xl.md"
import { TemplateExpressionShape } from "./template-expression-shape.xl.md"
import { TemplateSpanShape } from "./template-span-shape.xl.md"
import { TypeOfExpressionShape } from "./type-of-expression-shape.xl.md"
import { VoidExpressionShape } from "./void-expression-shape.xl.md"
import { FalseKeywordShape } from "../keywords/false-keyword-shape.xl.md"
import { AsyncKeywordShape } from "../keywords/async-keyword-shape.xl.md"
import { InKeywordShape } from "../keywords/in-keyword-shape.xl.md"
import { InstanceOfKeywordShape } from "../keywords/instance-of-keyword-shape.xl.md"
import { NullKeywordShape } from "../keywords/null-keyword-shape.xl.md"
import { ThisKeywordShape } from "../keywords/this-keyword-shape.xl.md"
import { SuperKeywordShape } from "../keywords/super-keyword-shape.xl.md"
import { TrueKeywordShape } from "../keywords/true-keyword-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { ImportKeywordShape } from "../keywords/import-keyword-shape.xl.md"
import { ParameterShape } from "../types/parameter-shape.xl.md"
import { TypeBuilder } from "../types/type-builder.xl.md"
import { TypeParameterShape } from "../types/type-parameter-shape.xl.md"
import { ConstKeywordShape } from "../keywords/const-keyword-shape.xl.md"
import { ExpressionWithTypeArgumentsShape } from "./expression-with-type-arguments-shape.xl.md"
import { TypeAssertionExpressionShape } from "./type-assertion-expression-shape.xl.md"
import { MetaPropertyShape } from "./meta-property-shape.xl.md"
import { AwaitExpressionShape } from "./await-expression-shape.xl.md"
import { YieldExpressionShape } from "./yield-expression-shape.xl.md"
import { StatementBuilder } from "../statements/statement-builder.xl.md"
import { AsExpressionShape } from "./as-expression-shape.xl.md"
import { SatisfiesExpressionShape } from "./satisfies-expression-shape.xl.md"
import { SpreadElementShape } from "./spread-element-shape.xl.md"
import { ClassDeclarationShape } from "../declarations/class-declaration-shape.xl.md"
import { HeritageClauseShape } from "../members/heritage-clause-shape.xl.md"
import { MethodDeclarationShape } from "../types/method-declaration-shape.xl.md"
import { GetAccessorShape } from "../types/get-accessor-shape.xl.md"
import { SetAccessorShape } from "../types/set-accessor-shape.xl.md"
import { ComputedPropertyNameShape } from "../types/computed-property-name-shape.xl.md"
import { ArrayBindingPatternShape } from "../bindings/array-binding-pattern-shape.xl.md"
import { ObjectBindingPatternShape } from "../bindings/object-binding-pattern-shape.xl.md"
import { PrivateIdentifierShape } from "../names/private-identifier-shape.xl.md"
import { PropertyAssignmentShape } from "../members/property-assignment-shape.xl.md"
import { ShorthandPropertyAssignmentShape } from "../members/shorthand-property-assignment-shape.xl.md"
import { SpreadAssignmentShape } from "../members/spread-assignment-shape.xl.md"
import { BigIntLiteralShape } from "../literals/big-int-literal-shape.xl.md"
import { NoSubstitutionTemplateLiteralShape } from "../literals/no-substitution-template-literal-shape.xl.md"
import { NumericLiteralShape } from "../literals/numeric-literal-shape.xl.md"
import { RegularExpressionLiteralShape } from "../literals/regular-expression-literal-shape.xl.md"
import { StringLiteralShape } from "../literals/string-literal-shape.xl.md"
import { TemplateHeadShape } from "../literals/template-head-shape.xl.md"
import { TemplateMiddleShape } from "../literals/template-middle-shape.xl.md"
import { TemplateTailShape } from "../literals/template-tail-shape.xl.md"
```

# namespace cangjie

# class ExpressionBuilder

## field Units:Array<Token> = []

## field Positions:Array<int> = []

## field At:int = 0

## field Template:Template

## field Context:SyntaxContext

## constructor:(template:Template, context:SyntaxContext)=>void

```ts
this.Template = template;
this.Context = context;
```

## method Load:(units:Array<Token>, basePos:int)=>void

```ts
this.Units = [];
this.Positions = [];
this.At = 0;
let pos = basePos;
for (const unit of units) {
  if (unit.IsTriviaToken) {
    continue;
  }
  this.Units.push(unit);
  this.Positions.push(pos);
  if (unit.SourceRange.End !== null) {
    pos = unit.SourceRange.End.Index + 1;
  }
}
```

## method Peek:(offset:int)=>Token | null

```ts
const index = this.At + offset;
if (index < 0 || index >= this.Units.length) {
  return null;
}
return this.Units[index];
```

## method TextOf:(unit:Token)=>string

```ts
if (unit instanceof Common) {
  return (unit as Common).TempToString();
}
if (unit instanceof Symbol) {
  return (unit as Symbol).TempToString();
}
return "";
```

## method IsText:(unit:Token, text:string)=>bool

```ts
return this.TextOf(unit) === text;
```

## method StartsNumber:(text:string)=>bool

文本能不能起一个数字字面量：首字符是数字，或 `.` 后面紧跟数字（前导点写法 `.5`）。与 `Common.CanStartNumber` 同一口径。

```ts
if (text.length === 0) {
  return false;
}
const ch = text[0];
if (ch >= "0" && ch <= "9") {
  return true;
}
return ch === "." && text.length > 1 && text[1] >= "0" && text[1] <= "9";
```

## method SpanLeaf:(shape:ShapeToken, index:int)=>ShapeToken

```ts
const unit = this.Units[index];
if (unit.SourceRange.Start !== null) {
  shape.SignIn(unit.SourceRange.Start);
}
if (unit.SourceRange.End !== null) {
  shape.SignOut(unit.SourceRange.End);
}
shape.Pos = this.Positions[index];
shape.TryToClose(this.Context);
return shape;
```

## method SpanNode:(shape:ShapeToken, first:int, last:int)=>ShapeToken

```ts
const head = this.Units[first];
const tail = this.Units[last];
if (head.SourceRange.Start !== null) {
  shape.SignIn(head.SourceRange.Start);
}
if (tail.SourceRange.End !== null) {
  shape.SignOut(tail.SourceRange.End);
}
shape.Pos = this.Positions[first];
shape.TryToClose(this.Context);
return shape;
```

## method IsPrefixOperator:(text:string)=>bool

```ts
return text === "!"
  || text === "~"
  || text === "+"
  || text === "-"
  || text === "++"
  || text === "--"
  || text === "typeof"
  || text === "void"
  || text === "delete";
```

## method BinaryPrecedence:(text:string)=>int

```ts
if (text === "**") {
  return 15;
}
if (text === "*" || text === "/" || text === "%") {
  return 14;
}
if (text === "+" || text === "-") {
  return 13;
}
if (text === "<<" || text === ">>" || text === ">>>") {
  return 12;
}
if (text === "<" || text === ">" || text === "<=" || text === ">=" || text === "instanceof" || text === "in") {
  return 11;
}
if (text === "==" || text === "!=" || text === "===" || text === "!==") {
  return 10;
}
if (text === "&") {
  return 9;
}
if (text === "^") {
  return 8;
}
if (text === "|") {
  return 7;
}
if (text === "&&") {
  return 6;
}
if (text === "||") {
  return 5;
}
if (text === "??") {
  return 4;
}
return -1;
```

## method IsRightAssociative:(text:string)=>bool

```ts
return text === "**";
```

## method IsAssignmentText:(text:string)=>bool

```ts
return text === "="
  || text === "+="
  || text === "-="
  || text === "*="
  || text === "/="
  || text === "%="
  || text === "**="
  || text === "<<="
  || text === ">>="
  || text === ">>>="
  || text === "&="
  || text === "|="
  || text === "^="
  || text === "&&="
  || text === "||="
  || text === "??=";
```

## method ParseExpression:()=>Token

```ts
const start = this.At;
let left = this.ParseAssign();
while (true) {
  const unit = this.Peek(0);
  if (unit === null) {
    break;
  }
  if (!this.IsText(unit, ",")) {
    break;
  }
  const opIndex = this.At;
  this.At++;
  const right = this.ParseAssign();
  const shape = new BinaryExpressionShape(this.Template);
  shape.Add(left);
  shape.Add(this.MakeOperatorToken(unit, opIndex));
  shape.Add(right);
  left = this.SpanNode(shape, start, this.At - 1);
}
return left;
```

## method ParseAssign:()=>Token

```ts
const start = this.At;
const left = this.ParseConditional();
const unit = this.Peek(0);
if (unit === null) {
  return left;
}
const text = this.TextOf(unit);
if (!this.IsAssignmentText(text)) {
  return left;
}
const opIndex = this.At;
this.At++;
const right = this.ParseAssign();
const shape = new BinaryExpressionShape(this.Template);
shape.Add(left);
shape.Add(this.MakeOperatorToken(unit, opIndex));
shape.Add(right);
return this.SpanNode(shape, start, this.At - 1);
```

## method ParseConditional:()=>Token

```ts
const start = this.At;
const condition = this.ParseBinary(4);
const unit = this.Peek(0);
if (unit === null || !this.IsText(unit, "?")) {
  return condition;
}
const questionIndex = this.At;
this.At++;
const whenTrue = this.ParseAssign();
const colon = this.Peek(0);
if (colon === null || !this.IsText(colon, ":")) {
  throw new Error("条件表达式缺少冒号");
}
const colonIndex = this.At;
this.At++;
const whenFalse = this.ParseAssign();
const shape = new ConditionalExpressionShape(this.Template);
shape.Add(condition);
shape.Add(this.MakeOperatorToken(unit, questionIndex));
shape.Add(whenTrue);
shape.Add(this.MakeOperatorToken(colon, colonIndex));
shape.Add(whenFalse);
return this.SpanNode(shape, start, this.At - 1);
```

## method ParseBinary:(minPrecedence:int)=>Token

```ts
const start = this.At;
let left = this.ParseUnary();
while (true) {
  const unit = this.Peek(0);
  if (unit === null) {
    break;
  }
  if (this.IsTypeOperator(unit)) {
    // `as` / `satisfies`：与关系运算符同级（TS 实测 `a + b as T` = `(a + b) as T`、
    // `a as T + b` = `(a as T) + b`），右操作数是类型不是表达式。
    const precedence = 11;
    if (precedence < minPrecedence) {
      break;
    }
    const operatorText = this.TextOf(unit);
    const opIndex = this.At;
    this.At++;
    const type = this.ParseFollowingType();
    let shape:ShapeToken;
    if (operatorText === "as") {
      shape = new AsExpressionShape(this.Template);
    } else {
      shape = new SatisfiesExpressionShape(this.Template);
    }
    shape.Add(left);
    shape.Add(type);
    left = this.SpanNode(shape, start, this.At - 1);
    continue;
  }
  const opText = this.BinaryOperatorText(unit);
  if (opText === "") {
    break;
  }
  const precedence = this.BinaryPrecedence(opText);
  if (precedence < minPrecedence) {
    break;
  }
  const opIndex = this.At;
  this.At++;
  const right = this.ParseBinary(this.IsRightAssociative(opText) ? precedence : precedence + 1);
  const shape = new BinaryExpressionShape(this.Template);
  shape.Add(left);
  shape.Add(this.MakeOperatorToken(unit, opIndex));
  shape.Add(right);
  left = this.SpanNode(shape, start, this.At - 1);
}
return left;
```

## method IsTypeOperator:(unit:Token)=>bool

`as` / `satisfies` 是类型运算符：`ParseBinary` 在二元循环里按关系运算符的优先级处理它们，右操作数交给 `ParseFollowingType`。

```ts
if (!(unit instanceof Common)) {
  return false;
}
const text = (unit as Common).TempToString();
return text === "as" || text === "satisfies";
```

## method ParseFollowingType:()=>Token

从当前 `At` 起，把**剩下的单元**交给 `TypeBuilder.ParseType()` 读一个完整类型（调用方保证后面还有单元）。
`basePos` 取 `Positions[At]`（即 `<` / `as` 之后第一个单元的含前导 trivia 起点），与 TypeBuilder 的 `Pos` 口径一致。

```ts
const builder = new TypeBuilder(this.Template, this.Context);
builder.Load(this.Units.slice(this.At), this.Positions[this.At]);
const type = builder.ParseType();
if (builder.At === 0) {
  throw new Error("缺少类型");
}
this.At += builder.At;
return type;
```

## method FindTypeArgumentClose:(index:int)=>int

类型实参前瞻用的**严格**配对扫描：只认 `<`、`>`、`>>` / `>>>`、`,` 这些符号与任意非符号单元
（类型名 / 字面量 / 括号整块）；碰到别的符号（`&&`、`+` 等）就判否，避免把
`a < b && c > (d)` 这类比较链当成泛型实参。返回闭合 `>` 所在的**原单元下标**
（`>>` / `>>>` 在最后一格收多层），找不到返回 -1。

```ts
if (index < 0 || index >= this.Units.length) {
  return -1;
}
if (!this.IsText(this.Units[index], "<")) {
  return -1;
}
let depth = 0;
for (let at = index; at < this.Units.length; at++) {
  const unit = this.Units[at];
  if (!(unit instanceof Symbol)) {
    if (depth === 0) {
      return -1;
    }
    continue;
  }
  const text = (unit as Symbol).TempToString();
  if (text === "<") {
    depth++;
    continue;
  }
  if (text === ">") {
    depth--;
    if (depth === 0) {
      return at;
    }
    continue;
  }
  if (text === ">>" || text === ">>>") {
    depth -= text.length;
    if (depth <= 0) {
      return at;
    }
    continue;
  }
  if (text === ",") {
    continue;
  }
  return -1;
}
return -1;
```

## method CanStartTypeArgumentCall:(index:int)=>bool

泛型调用的前瞻：`index` 是 `<`，扫描到与它配对的 `>`，且 `>` 之后紧跟 `(` 才算泛型调用；
否则返回 `false`，让调用方回退成二元比较（`a < b` 不受影响）。只认 `Symbol` 的 `<` / `>` / `,`，
`>>` 这种组合符号直接判否（拆 `>>` 需要 basic token 决策，见本块暂缓）。

```ts
if (index < 0 || index >= this.Units.length) {
  return false;
}
if (!this.IsText(this.Units[index], "<")) {
  return false;
}
const close = this.FindTypeArgumentClose(index);
if (close < 0) {
  return false;
}
const after = this.Units[close + 1];
return after !== undefined && this.IsBracketStart(after, "(");
```

## method CanStartTypeArguments:(index:int)=>bool

Instantiation expression lookahead (`f<string>` with no call): same `<`/`>` pairing scan as
`CanStartTypeArgumentCall`, but the `>` must be followed by a unit that cannot continue a
comparison chain (`;` `,` `)` `]` `}` `=` `.` `!` `?` `:` `=>` `?.` or end of units). TS keeps
`f<string> + 1` as comparison, so no binary-operator terminator is accepted here.

```ts
if (index < 0 || index >= this.Units.length) {
  return false;
}
if (!this.IsText(this.Units[index], "<")) {
  return false;
}
const close = this.FindTypeArgumentClose(index);
if (close < 0) {
  return false;
}
if (close + 1 >= this.Units.length) {
  return true;
}
const after = this.Units[close + 1];
if (after instanceof Symbol) {
  const afterText = (after as Symbol).TempToString();
  if (afterText === ";" || afterText === "," || afterText === ")" || afterText === "]"
      || afterText === "}" || afterText === "=" || afterText === "." || afterText === "!"
      || afterText === "?" || afterText === ":" || afterText === "=>" || afterText === "?."
      || afterText === "??" || afterText === "||" || afterText === "&&") {
    return true;
  }
}
if (after instanceof Common) {
  // 实例化表达式后接类型/关系词（`a<b> as T` / `a<b> satisfies T` / `a<b> instanceof C`）
  // 仍是实例化表达式，不是比较链。
  const afterCommon = (after as Common).TempToString();
  if (afterCommon === "as" || afterCommon === "satisfies" || afterCommon === "instanceof"
      || afterCommon === "in") {
    return true;
  }
}
if (this.IsTemplateToken(after)) {
  // `a<b>`t``：标签模板的标签是实例化表达式，`<…>` 是它自己的 typeArguments。
  return true;
}
return false;
```

## method ParseTypeArgumentsAtCurrent:()=>Array<Token>

`At` 停在 `<` 上时读 `<A, B>`：返回实参数组并把 `At` 推进到 `>` 之后；`>` 本身不进 AST。
`basePos` 取 `Positions[At]`，所以每个 `TypeReference` 的 `Pos` 与 TS 的 `pos` 同口径。

```ts
const open = this.At;
const close = this.MatchAngleClose(open);
if (close < 0) {
  throw new Error("泛型实参缺少配对的 >");
}
const builder = new TypeBuilder(this.Template, this.Context);
builder.Load(this.Units.slice(open), this.Positions[open]);
const typeArguments = builder.ParseTypeArguments();
// TypeBuilder.Load 会把 `>>` / `>>>` 拆成多个单字符 `>`，builder.At 的计数与原单元数不同；
// 收口位置以原单元上的配对扫描为准，不能拿 builder.At 直接加。
this.At = close + 1;
return typeArguments;
```

## method BinaryOperatorText:(unit:Token)=>string

```ts
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  if (this.BinaryPrecedence(text) >= 0) {
    return text;
  }
  return "";
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  if (text === "instanceof" || text === "in") {
    return text;
  }
}
return "";
```

## method ParseUnary:()=>Token

```ts
const start = this.At;
const unit = this.Peek(0);
if (unit === null) {
  throw new Error("表达式意外结束");
}
let text = "";
if (unit instanceof Symbol) {
  text = (unit as Symbol).TempToString();
} else if (unit instanceof Common) {
  text = (unit as Common).TempToString();
}
if (text === "yield") {
  // 裸 `yield` 与生成器里的 `yield;` 在单元层同形（都只剩一格），判据需要生成器上下文，
  // 表达式层拿不到：这里只保留 `yield` 前缀路径，裸 `yield` 的 Identifier 收口留给语句层。
  return this.ParseYield();
}
if (unit instanceof Common && (unit as Common).Is("await")) {
  // `await` with no operand (`const w = await;`) is a plain Identifier in TS, not an
  // AwaitExpression: only take the prefix path when an operand actually follows.
  const awaitNext = this.Peek(1);
  let awaitHasOperand = awaitNext !== null;
  if (awaitNext !== null && awaitNext instanceof Symbol) {
    const awaitNextText = (awaitNext as Symbol).TempToString();
    if (awaitNextText === ";" || awaitNextText === "," || awaitNextText === ")"
        || awaitNextText === "]" || awaitNextText === "}") {
      awaitHasOperand = false;
    }
  }
  if (!awaitHasOperand) {
    return this.ParsePostfix();
  }
}
if (!this.IsPrefixOperator(text) && !(unit instanceof Common && (unit as Common).Is("await"))) {
  return this.ParsePostfix();
}
this.At++;
if (unit instanceof Common && (unit as Common).Is("await")) {
  // `await` 是一元前缀：操作数交给 ParseUnary，所以它比二元运算符绑得紧
  // （`await a + b` = `(await a) + b`），`await` token 本身不进 AST。
  const awaitOperand = this.ParseUnary();
  const awaitShape = new AwaitExpressionShape(this.Template);
  awaitShape.Add(awaitOperand);
  return this.SpanNode(awaitShape, start, this.At - 1);
}
const operand = this.ParseUnary();
if (text === "typeof") {
  const shape = new TypeOfExpressionShape(this.Template);
  shape.Add(operand);
  return this.SpanNode(shape, start, this.At - 1);
}
if (text === "void") {
  const shape = new VoidExpressionShape(this.Template);
  shape.Add(operand);
  return this.SpanNode(shape, start, this.At - 1);
}
if (text === "delete") {
  const shape = new DeleteExpressionShape(this.Template);
  shape.Add(operand);
  return this.SpanNode(shape, start, this.At - 1);
}
const shape = new PrefixUnaryExpressionShape(this.Template);
shape.Add(operand);
return this.SpanNode(shape, start, this.At - 1);
```

## method ParseYield:()=>Token

ParseYield handles `yield` / `yield*`. In TS the YieldExpression children are an optional
AsteriskToken (for `yield*`; the `yield` keyword itself is not a node) and an optional operand
(an assignment expression). The terminators `,` `;` `:` `}` mean the yield has no operand.

```ts
const start = this.At;
const yieldUnit = this.Units[start];
this.At++;
const shape = new YieldExpressionShape(this.Template);
let afterYieldPos = 0;
if (yieldUnit.SourceRange.End !== null) {
  afterYieldPos = yieldUnit.SourceRange.End.Index + 1;
}
const next = this.Peek(0);
if (next !== null && next instanceof Symbol && (next as Symbol).Is("*")) {
  const asterisk = new AsteriskTokenShape(this.Template);
  asterisk.SignInToken(next);
  asterisk.SignOutToken(next);
  asterisk.Pos = afterYieldPos;
  asterisk.TryToClose(this.Context);
  shape.Add(asterisk);
  this.At++;
}
const operandUnit = this.Peek(0);
let hasOperand = operandUnit !== null;
if (operandUnit !== null && operandUnit instanceof Symbol) {
  const operandText = (operandUnit as Symbol).TempToString();
  if (operandText === "," || operandText === ";" || operandText === ":" || operandText === "}") {
    hasOperand = false;
  }
}
if (hasOperand) {
  shape.Add(this.ParseAssign());
}
return this.SpanNode(shape, start, this.At - 1);
```

## method ParsePostfix:()=>Token

```ts
const start = this.At;
let expression = this.ParsePrimary();
while (true) {
  const unit = this.Peek(0);
  if (unit === null) {
    break;
  }
  if (!this.CanStartTypeArgumentCall(this.At) && this.CanStartTypeArguments(this.At)) {
    // Instantiation expression: `f<string>`, `a.b<T>`, `f<string, number>` — a type argument
    // list with no call. TS models it as ExpressionWithTypeArguments (expression + type nodes).
    const typeArguments = this.ParseTypeArgumentsAtCurrent();
    const instantiation = new ExpressionWithTypeArgumentsShape(this.Template);
    instantiation.Expression = expression;
    instantiation.TypeArguments = typeArguments;
    instantiation.Add(expression);
    for (const typeArgument of typeArguments) {
      instantiation.Add(typeArgument);
    }
    if (expression.SourceRange.Start !== null) {
      instantiation.SignIn(expression.SourceRange.Start);
    }
    instantiation.SignOutToken(this.Units[this.At - 1]);
    instantiation.Pos = (expression as ShapeToken).Pos;
    instantiation.TryToClose(this.Context);
    expression = instantiation;
    continue;
  }
  if (this.CanStartTypeArgumentCall(this.At)) {
    // `f<T>(a)` 的前瞻在 CanStartTypeArgumentCall 里完成（`<` 扫到配对的 `>` 且后随 `(`）：
    // 否则 `<` / `>` 会落进 ParseBinary 被吃成比较链（静默错树）。
    const typeArguments = this.ParseTypeArgumentsAtCurrent();
    const argsUnit = this.Peek(0);
    if (argsUnit === null || !this.IsBracketStart(argsUnit, "(")) {
      throw new Error("泛型实参后面缺少调用实参");
    }
    const bracket = argsUnit as Bracket;
    this.At++;
    const args = this.ParseBracketArguments(bracket);
    const shape = new CallExpressionShape(this.Template);
    shape.Add(expression);
    for (const typeArgument of typeArguments) {
      shape.Add(typeArgument);
    }
    for (const arg of args) {
      shape.Add(arg);
    }
    expression = this.SpanNode(shape, start, this.At - 1);
    continue;
  }
  if (this.IsText(unit, "=>")) {
    // 单标识符参数的箭头（`a => a`）：此时 expression 就是那个 Identifier。
    if (!(expression instanceof IdentifierShape)) {
      throw new Error("箭头函数的参数只支持标识符");
    }
    const arrowIndex = this.At;
    const parameter = new ParameterShape(this.Template);
    parameter.Add(expression);
    this.SpanNode(parameter, start, start);
    this.At++;
    const body = this.ParseArrowBody();
    const shape = new ArrowFunctionShape(this.Template);
    shape.Add(parameter);
    shape.Add(this.MakeOperatorToken(unit, arrowIndex));
    shape.Add(body);
    expression = this.SpanNode(shape, start, this.At - 1);
    continue;
  }
  if (this.IsTemplateToken(unit)) {
    const template = this.ParseTemplateToken();
    const shape = new TaggedTemplateExpressionShape(this.Template);
    // `f<T>`t``：TS 的 TaggedTemplateExpression 把实参直接挂在 tag 后面
    // （children = tag 表达式、typeArguments、模板），不是包一层 instantiation expression。
    let tag:Token = expression;
    if (expression instanceof ExpressionWithTypeArgumentsShape) {
      const instantiation = expression as ExpressionWithTypeArgumentsShape;
      const tagExpression = instantiation.Expression;
      if (tagExpression !== null) {
        tag = tagExpression;
      }
      shape.Add(tag);
      for (const typeArgument of instantiation.TypeArguments) {
        shape.Add(typeArgument);
      }
    } else {
      shape.Add(expression);
    }
    shape.Add(template);
    if (tag.SourceRange.Start !== null) {
      shape.SignIn(tag.SourceRange.Start);
    }
    if (template.SourceRange.End !== null) {
      shape.SignOut(template.SourceRange.End);
    }
    shape.Pos = (tag as ShapeToken).Pos;
    shape.TryToClose(this.Context);
    expression = shape;
    continue;
  }
  if (unit instanceof Symbol) {
    const text = (unit as Symbol).TempToString();
    if (text === ".") {
      this.At++;
      let name:Token;
      const nameUnit = this.Peek(0);
      if (nameUnit !== null && nameUnit instanceof Symbol && (nameUnit as Symbol).Is("#")) {
        // Private member access (`this.#x`): the suffix accepts Symbol "#" + Common name as
        // a PrivateIdentifier, in addition to the usual ParseName paths.
        const hashIndex = this.At;
        this.At++;
        const privateNameUnit = this.Peek(0);
        if (privateNameUnit === null || !(privateNameUnit instanceof Common)) {
          throw new Error("private member name is not an identifier");
        }
        const privateShape = new PrivateIdentifierShape(this.Template);
        privateShape.SignInToken(nameUnit);
        privateShape.SignOutToken(privateNameUnit);
        privateShape.Pos = this.Positions[hashIndex];
        privateShape.TryToClose(this.Context);
        this.At++;
        name = privateShape;
      } else {
        name = this.ParseName();
      }
      const shape = new PropertyAccessExpressionShape(this.Template);
      shape.Add(expression);
      shape.Add(name);
      expression = this.SpanNode(shape, start, this.At - 1);
      continue;
    }
    if (text === "?.") {
      const questionDotIndex = this.At;
      this.At++;
      const next = this.Peek(0);
      if (next !== null && this.IsBracketStart(next, "(")) {
        const bracket = next as Bracket;
        this.At++;
        const args = this.ParseBracketArguments(bracket);
        const shape = new CallExpressionShape(this.Template);
        shape.Add(expression);
        shape.Add(this.MakeOperatorToken(unit, questionDotIndex));
        for (const arg of args) {
          shape.Add(arg);
        }
        expression = this.SpanNode(shape, start, this.At - 1);
        continue;
      }
      if (next !== null && this.IsBracketStart(next, "[")) {
        const bracket = next as Bracket;
        this.At++;
        const inner = this.ParseBracketExpression(bracket);
        const shape = new ElementAccessExpressionShape(this.Template);
        shape.Add(expression);
        shape.Add(this.MakeOperatorToken(unit, questionDotIndex));
        shape.Add(inner);
        expression = this.SpanNode(shape, start, this.At - 1);
        continue;
      }
      const name = this.ParseName();
      const shape = new PropertyAccessExpressionShape(this.Template);
      shape.Add(expression);
      shape.Add(this.MakeOperatorToken(unit, questionDotIndex));
      shape.Add(name);
      expression = this.SpanNode(shape, start, this.At - 1);
      continue;
    }
    if (text === "!") {
      this.At++;
      const shape = new NonNullExpressionShape(this.Template);
      shape.Add(expression);
      expression = this.SpanNode(shape, start, this.At - 1);
      continue;
    }
    if (text === "++" || text === "--") {
      this.At++;
      const shape = new PostfixUnaryExpressionShape(this.Template);
      shape.Add(expression);
      expression = this.SpanNode(shape, start, this.At - 1);
      continue;
    }
  }
  if (this.IsBracketStart(unit, "(")) {
    const bracket = unit as Bracket;
    this.At++;
    const args = this.ParseBracketArguments(bracket);
    const shape = new CallExpressionShape(this.Template);
    shape.Add(expression);
    for (const arg of args) {
      shape.Add(arg);
    }
    expression = this.SpanNode(shape, start, this.At - 1);
    continue;
  }
  if (this.IsBracketStart(unit, "[")) {
    const bracket = unit as Bracket;
    this.At++;
    const inner = this.ParseBracketExpression(bracket);
    const shape = new ElementAccessExpressionShape(this.Template);
    shape.Add(expression);
    shape.Add(inner);
    expression = this.SpanNode(shape, start, this.At - 1);
    continue;
  }
  break;
}
return expression;
```

## method ParseNew:()=>Token

```ts
const start = this.At;
this.At++;
// `new.target`：MetaProperty，children 只有 Identifier "target"。
const targetDot = this.Peek(0);
const targetUnit = this.Peek(1);
if (targetDot !== null && this.IsText(targetDot, ".")
  && targetUnit !== null && targetUnit instanceof Common && (targetUnit as Common).Is("target")) {
  this.At++;
  const targetIndex = this.At;
  const targetShape = new MetaPropertyShape(this.Template);
  const targetName = IdentifierShape.FromBasicToken(targetUnit as Common, this.Context);
  targetName.Pos = this.Positions[targetIndex];
  this.At++;
  targetShape.Add(targetName);
  return this.SpanNode(targetShape, start, this.At - 1);
}
const chainStart = this.At;
let callee = this.ParsePrimary();
while (true) {
  const unit = this.Peek(0);
  if (unit === null) {
    break;
  }
  if (unit instanceof Symbol && (unit as Symbol).TempToString() === ".") {
    this.At++;
    const name = this.ParseName();
    const shape = new PropertyAccessExpressionShape(this.Template);
    shape.Add(callee);
    shape.Add(name);
    callee = this.SpanNode(shape, chainStart, this.At - 1);
    continue;
  }
  if (unit instanceof Symbol && (unit as Symbol).TempToString() === "!") {
    // 非空断言属于被构造者（`new a!.b()`）：TS 把后缀链整体算进 NewExpression 的 expression，
    // 后缀不能漏到 `new` 外面另起一个操作数。
    this.At++;
    const shape = new NonNullExpressionShape(this.Template);
    shape.Add(callee);
    callee = this.SpanNode(shape, chainStart, this.At - 1);
    continue;
  }
  if (this.IsTemplateToken(unit)) {
    // `new A.B`t``：模板与点号同属被构造者的后缀链，NewExpression 覆盖整条链。
    const template = this.ParseTemplateToken();
    const shape = new TaggedTemplateExpressionShape(this.Template);
    shape.Add(callee);
    shape.Add(template);
    callee = this.SpanNode(shape, chainStart, this.At - 1);
    continue;
  }
  if (this.IsBracketStart(unit, "[")) {
    const bracket = unit as Bracket;
    this.At++;
    const inner = this.ParseBracketExpression(bracket);
    const shape = new ElementAccessExpressionShape(this.Template);
    shape.Add(callee);
    shape.Add(inner);
    callee = this.SpanNode(shape, chainStart, this.At - 1);
    continue;
  }
  break;
}
const shape = new NewExpressionShape(this.Template);
shape.Add(callee);
if (this.CanStartTypeArgumentCall(this.At) || this.CanStartTypeArguments(this.At)) {
  const typeArguments = this.ParseTypeArgumentsAtCurrent();
  for (const typeArgument of typeArguments) {
    shape.Add(typeArgument);
  }
}
const argsUnit = this.Peek(0);
if (argsUnit !== null && this.IsBracketStart(argsUnit, "(")) {
  const bracket = argsUnit as Bracket;
  this.At++;
  const args = this.ParseBracketArguments(bracket);
  for (const arg of args) {
    shape.Add(arg);
  }
}
return this.SpanNode(shape, start, this.At - 1);
```

## method IsTemplateToken:(unit:Token)=>bool

是不是「引号内式内插」的模板串单元：`String`、开了内插、且它的引号属于模板配置的 `InterpolationQuoteChars`（ts 只有反引号）。
C# 的 `$"…"` 也开 `IsSupportInterpolation`，但引号不在这个集合里，不会被当成模板。

```ts
if (!(unit instanceof String)) {
  return false;
}
const token = unit as String;
if (!token.IsSupportInterpolation) {
  return false;
}
const config = this.Template.StringTemplate;
return config.HasInterpolationQuoteChars && config.InterpolationQuoteChars.includes(token.StringChar);
```

## method SourceAfter:(source:Source, offset:int)=>Source

同一文档里、`source` 之后第 `offset` 个位置（`offset` 为 1 就是下一个字符）。

```ts
return source.Document.At(source.Index + offset);
```

## method ParseTemplateToken:()=>Token

把「当前 At 上的模板 `String` 单元」拆成模板 AST。`At` 要停在模板单元上，方法自己前进一格。

`String.Data` 里 `ConstString` 与 `InterpolationString` 交替：没有 `InterpolationString` → 无内插模板（一个叶子）；
有 → `TemplateExpression` = `TemplateHead` + 若干个 `TemplateSpan`（每个 span = 插值表达式 + `TemplateMiddle` / `TemplateTail`）。

区间口径（与 TS 对齐）：

- 模板整体 / 头：`[String.Start, String.End]` / `[String.Start, interp.Start]`（`interp.Start` 是 `${` 的 `{`）；
- 中段：`[interp.End, nextInterp.Start]`（从 `}` 到下一个 `${` 的 `{`）；尾段：`[interp.End, String.End]`；
- span：`[interp.Start + 1, tail.End]`；插值里的表达式从 `interp.Start + 1` 起（含前导 trivia 的 `Pos` 口径）。

```ts
const start = this.At;
const token = this.Units[start] as String;
this.At++;
const texts:Array<string> = [];
const interps:Array<Token> = [];
let current = "";
for (const part of token.Data) {
  if (part instanceof ConstString) {
    current += (part as ConstString).TempToString();
    continue;
  }
  if (part instanceof InterpolationString) {
    texts.push(current);
    current = "";
    interps.push(part);
  }
}
texts.push(current);
if (interps.length === 0) {
  const literal = NoSubstitutionTemplateLiteralShape.FromBasicToken(token, this.Context);
  literal.Pos = this.Positions[start];
  return literal;
}
const expression = new TemplateExpressionShape(this.Template);
const head = new TemplateHeadShape(this.Template);
head.Text = texts[0];
if (token.SourceRange.Start !== null) {
  head.SignIn(token.SourceRange.Start);
}
if (interps[0].SourceRange.Start !== null) {
  head.SignOut(interps[0].SourceRange.Start);
}
head.Pos = this.Positions[start];
head.TryToClose(this.Context);
expression.Add(head);
for (let index = 0; index < interps.length; index++) {
  const interp = interps[index];
  const inner = new ExpressionBuilder(this.Template, this.Context);
  let base = 0;
  if (interp.SourceRange.Start !== null) {
    base = interp.SourceRange.Start.Index + 1;
  }
  inner.Load(interp.Data, base);
  if (inner.Units.length === 0) {
    throw new Error("插值里没有表达式");
  }
  const value = inner.ParseExpression();
  if (inner.At !== inner.Units.length) {
    throw new Error("插值里的表达式没有读完");
  }
  // 尾段 / 中段的 Pos 是 `}` 这个 token 的 pos（含表达式后面的 trivia）：取「表达式最后一个字符的下一个位置」。
  let tailPos = 0;
  if (value.SourceRange.End !== null) {
    tailPos = value.SourceRange.End.Index + 1;
  } else if (interp.SourceRange.End !== null) {
    tailPos = interp.SourceRange.End.Index;
  }
  let tail:ShapeToken;
  if (index + 1 < interps.length) {
    const middle = new TemplateMiddleShape(this.Template);
    middle.Text = texts[index + 1];
    middle.Pos = tailPos;
    if (interp.SourceRange.End !== null) {
      middle.SignIn(interp.SourceRange.End);
    }
    const nextInterp = interps[index + 1];
    if (nextInterp.SourceRange.Start !== null) {
      middle.SignOut(nextInterp.SourceRange.Start);
    }
    middle.TryToClose(this.Context);
    tail = middle;
  } else {
    const lastTail = new TemplateTailShape(this.Template);
    lastTail.Text = texts[index + 1];
    lastTail.Pos = tailPos;
    if (interp.SourceRange.End !== null) {
      lastTail.SignIn(interp.SourceRange.End);
    }
    if (token.SourceRange.End !== null) {
      lastTail.SignOut(token.SourceRange.End);
    }
    lastTail.TryToClose(this.Context);
    tail = lastTail;
  }
  const span = new TemplateSpanShape(this.Template);
  span.Add(value);
  span.Add(tail);
  if (interp.SourceRange.Start !== null) {
    span.SignIn(this.SourceAfter(interp.SourceRange.Start, 1));
    span.Pos = interp.SourceRange.Start.Index + 1;
  }
  if (tail.SourceRange.End !== null) {
    span.SignOut(tail.SourceRange.End);
  }
  span.TryToClose(this.Context);
  expression.Add(span);
}
if (token.SourceRange.Start !== null) {
  expression.SignIn(token.SourceRange.Start);
}
if (token.SourceRange.End !== null) {
  expression.SignOut(token.SourceRange.End);
}
expression.Pos = this.Positions[start];
expression.TryToClose(this.Context);
return expression;
```

## method ParseComputedPropertyName:()=>Token

`[expr]` 计算属性名（object literal 成员 / class 成员共用）：括号单元内部交给子 ExpressionBuilder，
名字节点是 `ComputedPropertyName`（children 只有那个表达式），区间覆盖整个 `[...]`，`Pos` 含前导 trivia。

```ts
const index = this.At;
const unit = this.Peek(0);
if (unit === null || !this.IsBracketStart(unit, "[")) {
  throw new Error("缺少计算属性名");
}
const bracket = unit as Bracket;
this.At++;
const inner = new ExpressionBuilder(this.Template, this.Context);
let base = 0;
if (bracket.SourceRange.Start !== null) {
  base = bracket.SourceRange.Start.Index + 1;
}
inner.Load(bracket.Data, base);
if (inner.Units.length === 0) {
  throw new Error("计算属性名是空的");
}
const expression = inner.ParseExpression();
if (inner.At !== inner.Units.length) {
  throw new Error("计算属性名没有读完");
}
const shape = new ComputedPropertyNameShape(this.Template);
shape.Add(expression);
shape.SignInToken(bracket);
shape.SignOutToken(bracket);
shape.Pos = this.Positions[index];
shape.TryToClose(this.Context);
return shape;
```

## method ParseObjectLiteral:(bracket:Bracket, start:int)=>Token

`{…}` 对象字面量：逐个成员分派，逗号不进 AST。成员四种写法：`名字 : 值`（PropertyAssignment，两个子节点）、
`名字` / `名字 = 值`（ShorthandPropertyAssignment，`=` 是中间那个子节点）、`...expr`（SpreadAssignment，`...` 只进区间）、
以及字面量名（StringLiteral / NumericLiteral / BigIntLiteral 作为名字节点，不是 Identifier）。

```ts
const inner = new ExpressionBuilder(this.Template, this.Context);
let base = 0;
if (bracket.SourceRange.Start !== null) {
  base = bracket.SourceRange.Start.Index + 1;
}
inner.Load(bracket.Data, base);
const shape = new ObjectLiteralExpressionShape(this.Template);
while (inner.At < inner.Units.length) {
  const unit = inner.Units[inner.At];
  if (inner.IsText(unit, ",")) {
    inner.At++;
    continue;
  }
  const memberIndex = inner.At;
  if (inner.IsText(unit, "...")) {
    inner.At++;
    const expression = inner.ParseAssign();
    const spread = SpreadAssignmentShape.FromExpression(unit, expression, this.Context);
    spread.Pos = inner.Positions[memberIndex];
    shape.Add(spread);
    continue;
  }
  let accessorKind = "";
  let asyncUnit:Token | null = null;
  let asteriskUnit:Token | null = null;
  const firstUnit = inner.Units[memberIndex];
  const afterFirst = memberIndex + 1 < inner.Units.length ? inner.Units[memberIndex + 1] : null;
  const looksLikeMemberName = afterFirst !== null
    && (afterFirst instanceof Common || inner.IsBracketStart(afterFirst, "["));
  const asyncFollowedByGenerator = afterFirst !== null && inner.IsText(afterFirst, "*");
  if (inner.IsText(firstUnit, "async") && (looksLikeMemberName || asyncFollowedByGenerator)) {
    asyncUnit = firstUnit;
    inner.At++;
  } else if (inner.IsText(firstUnit, "get") && looksLikeMemberName) {
    accessorKind = "get";
    inner.At++;
  } else if (inner.IsText(firstUnit, "set") && looksLikeMemberName) {
    accessorKind = "set";
    inner.At++;
  }
  const nameIndex = inner.At;
  const generatedUnit = inner.Peek(0);
  let asteriskIndex = -1;
  if (generatedUnit !== null && inner.IsText(generatedUnit, "*")) {
    asteriskUnit = generatedUnit;
    asteriskIndex = inner.At;
    inner.At++;
  }
  const nameUnit = inner.Peek(0);
  if (nameUnit === null) {
    throw new Error("对象字面量缺少属性名");
  }
  let name:Token;
  if (inner.IsBracketStart(nameUnit, "[")) {
    name = inner.ParseComputedPropertyName();
  } else {
    name = inner.ParsePropertyName();
  }
  const next = inner.Peek(0);
  let methodTypeParameters:Array<Token> = [];
  if (next !== null && inner.IsText(next, "<")) {
    // Generic object literal method `({ m<T>(x: T): T {...} })`: TypeParameter(s) after the name.
    const angleClose = inner.MatchAngleClose(inner.At);
    if (angleClose < 0) {
      throw new Error("对象字面量方法的类型参数缺少配对的 >");
    }
    methodTypeParameters = inner.ParseAngleTypeParameters(inner.At, angleClose);
    inner.At = angleClose + 1;
  }
  const parameterUnit = inner.Peek(0);
  if (parameterUnit !== null && inner.IsBracketStart(parameterUnit, "(")) {
    // method / get / set / async / generator：与 class element 同一套子节点建法（消费 declarations 的静态助手）。
    const host = inner.Units[memberIndex];
    const parameterBracket = parameterUnit as Bracket;
    inner.At++;
    const parameters = ClassDeclarationShape.BuildParameters(host, parameterBracket, this.Context);
    let returnType:Token | null = null;
    const colonUnit = inner.Peek(0);
    if (colonUnit !== null && inner.IsText(colonUnit, ":")) {
      inner.At++;
      const typeStart = inner.At;
      while (inner.At < inner.Units.length && !inner.IsBracketStart(inner.Units[inner.At], "{")) {
        inner.At++;
      }
      const typeUnits:Array<Token> = inner.Units.slice(typeStart, inner.At);
      if (typeUnits.length === 0) {
        throw new Error("方法的返回类型为空");
      }
      const typeBuilder = new TypeBuilder(this.Template, this.Context);
      typeBuilder.Load(typeUnits, inner.Positions[typeStart]);
      // Return types of object literal methods can be type predicates (`x is A`,
      // `asserts x is A`), same as class methods and function types: route through
      // ParseReturnType so the predicate becomes a TypePredicate node like TS.
      returnType = typeBuilder.ParseReturnType();
      if (typeBuilder.At !== typeBuilder.Units.length) {
        throw new Error("方法的返回类型没有读完");
      }
    }
    const bodyUnit = inner.Peek(0);
    if (bodyUnit === null || !inner.IsBracketStart(bodyUnit, "{")) {
      // 值位对象字面量里**不带体**的方法签名（`{ new (a: number): I }`）：TS 仍然产出
      // MethodDeclaration —— 名字就是 `new`、形参表与返回类型照收，没有 Block 子节点。
      const signature = new MethodDeclarationShape(this.Template);
      if (asyncUnit !== null) {
        signature.Add(inner.MakeKeywordLeaf(new AsyncKeywordShape(this.Template), memberIndex));
      }
      if (asteriskUnit !== null) {
        signature.Add(inner.MakeOperatorToken(asteriskUnit, asteriskIndex));
      }
      signature.Add(name);
      for (const typeParameter of methodTypeParameters) {
        signature.Add(typeParameter);
      }
      for (const parameter of parameters) {
        signature.Add(parameter);
      }
      if (returnType !== null) {
        signature.Add(returnType);
      }
      shape.Add(inner.SpanNode(signature, memberIndex, inner.At - 1));
      continue;
    }
    const bodyIndex = inner.At;
    const bodyBuilder = new StatementBuilder(this.Template, this.Context);
    bodyBuilder.Load([bodyUnit], inner.Positions[bodyIndex]);
    const body = bodyBuilder.BuildStatement();
    inner.At++;
    let memberShape:ShapeToken;
    if (accessorKind === "get") {
      memberShape = new GetAccessorShape(this.Template);
    } else if (accessorKind === "set") {
      memberShape = new SetAccessorShape(this.Template);
    } else {
      memberShape = new MethodDeclarationShape(this.Template);
    }
    if (asyncUnit !== null) {
      memberShape.Add(inner.MakeKeywordLeaf(new AsyncKeywordShape(this.Template), memberIndex));
    }
    if (asteriskUnit !== null) {
      memberShape.Add(inner.MakeOperatorToken(asteriskUnit, asteriskIndex));
    }
    memberShape.Add(name);
    for (const typeParameter of methodTypeParameters) {
      memberShape.Add(typeParameter);
    }
    for (const parameter of parameters) {
      memberShape.Add(parameter);
    }
    if (returnType !== null) {
      memberShape.Add(returnType);
    }
    memberShape.Add(body);
    memberShape.SignInToken(inner.Units[memberIndex]);
    memberShape.SignOutToken(inner.Units[bodyIndex]);
    memberShape.Pos = inner.Positions[memberIndex];
    memberShape.TryToClose(this.Context);
    shape.Add(memberShape);
    continue;
  }
  if (asyncUnit !== null || accessorKind !== "" || asteriskUnit !== null) {
    throw new Error("对象字面量成员缺少函数体");
  }
  if (next !== null && inner.IsText(next, ":")) {
    inner.At++;
    const value = inner.ParseAssign();
    const property = PropertyAssignmentShape.FromParts(name, value, this.Context);
    property.Pos = inner.Positions[memberIndex];
    shape.Add(property);
    continue;
  }
  if (next !== null && inner.IsText(next, "=")) {
    const equalsIndex = inner.At;
    inner.At++;
    const initializer = inner.ParseAssign();
    const shorthand = ShorthandPropertyAssignmentShape.FromParts(name, initializer, this.Context);
    shorthand.Pos = inner.Positions[memberIndex];
    shorthand.Data.splice(1, 0, inner.MakeOperatorToken(next, equalsIndex));
    shape.Add(shorthand);
    continue;
  }
  const shorthand = ShorthandPropertyAssignmentShape.FromParts(name, null, this.Context);
  shorthand.Pos = inner.Positions[memberIndex];
  shape.Add(shorthand);
}
if (bracket.SourceRange.Start !== null) {
  shape.SignIn(bracket.SourceRange.Start);
}
if (bracket.SourceRange.End !== null) {
  shape.SignOut(bracket.SourceRange.End);
}
shape.Pos = this.Positions[start];
shape.TryToClose(this.Context);
return shape;
```

## method ParsePropertyName:()=>Token

对象字面量的属性名：`PropertyName` 可以是 `IdentifierName` | `StringLiteral` | `NumericLiteral` | `BigIntLiteral`。
标识符名（含关键字名）走 `ParseName`；字符串 / 数字 / bigint 走各自字面量的 `FromBasicToken`。
`Pos` 一律按「前一个非 trivia 单元 End+1」赋值，与 TS 的 `pos` 同口径。

```ts
const start = this.At;
const unit = this.Peek(0);
if (unit === null) {
  throw new Error("对象字面量缺少属性名");
}
if (unit instanceof String) {
  if (this.IsTemplateToken(unit)) {
    throw new Error("对象字面量的属性名不支持模板串");
  }
  this.At++;
  const shape = StringLiteralShape.FromBasicToken(unit as String, this.Context);
  shape.Pos = this.Positions[start];
  return shape;
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  if (this.StartsNumber(text)) {
    this.At++;
    if ((unit as Common).IsBigInt()) {
      const bigIntShape = BigIntLiteralShape.FromBasicToken(unit as Common, this.Context);
      bigIntShape.Pos = this.Positions[start];
      return bigIntShape;
    }
    const numericShape = NumericLiteralShape.FromBasicToken(unit as Common, this.Context);
    numericShape.Pos = this.Positions[start];
    return numericShape;
  }
}
return this.ParseName();
```

## method ParseArrayLiteral:(bracket:Bracket, start:int)=>Token

`[…]` 数组字面量：逐个元素解析，逗号不进 AST。

```ts
const inner = new ExpressionBuilder(this.Template, this.Context);
let base = 0;
if (bracket.SourceRange.Start !== null) {
  base = bracket.SourceRange.Start.Index + 1;
}
inner.Load(bracket.Data, base);
const shape = new ArrayLiteralExpressionShape(this.Template);
// 空槽（`[1, , 3]` / `[, 1]` / `[1, ,]`）= 零宽 OmittedExpression。
// TS 的口径：槽位起点是**上一个逗号之后那一格**（`[` 之后的第一个槽同理），
// 并且在「该出元素的位置又遇到逗号」时才建；元素后的行尾逗号不是空槽。
const reference = bracket.SourceRange.Start;
let slotStart = base;
let expectValue = true;
while (inner.At < inner.Units.length) {
  const unit = inner.Units[inner.At];
  if (inner.IsText(unit, ",")) {
    if (expectValue && reference !== null && slotStart > 0) {
      const atSource = reference.Document.At(slotStart - 1);
      const omitted = new OmittedExpressionShape(this.Template);
      omitted.SourceRange.Start = atSource;
      omitted.SourceRange.End = atSource;
      omitted.Pos = slotStart;
      omitted.TryToClose(this.Context);
      shape.Add(omitted);
    }
    expectValue = true;
    if (unit.SourceRange.End !== null) {
      slotStart = unit.SourceRange.End.Index + 1;
    }
    inner.At++;
    continue;
  }
  if (inner.IsText(unit, "...")) {
    const spreadIndex = inner.At;
    inner.At++;
    const expression = inner.ParseAssign();
    const spread = new SpreadElementShape(this.Template);
    spread.Add(expression);
    shape.Add(inner.SpanNode(spread, spreadIndex, inner.At - 1));
    expectValue = false;
    continue;
  }
  shape.Add(inner.ParseAssign());
  expectValue = false;
}
if (bracket.SourceRange.Start !== null) {
  shape.SignIn(bracket.SourceRange.Start);
}
if (bracket.SourceRange.End !== null) {
  shape.SignOut(bracket.SourceRange.End);
}
shape.Pos = this.Positions[start];
shape.TryToClose(this.Context);
return shape;
```

## method ParseArrowFromBracket:(bracket:Bracket, start:int, asyncKeyword?:Token | null, typeParameters?:Array<Token> | null)=>Token

`(…) => body` 的箭头：参数括号与函数表达式共用 `ParseFunctionParameters`（支持类型标注 / 默认值 / rest / 可选），
`=>` 走 `EqualsGreaterThanToken`，body 交给 `ParseArrowBody`（表达式体或块体）。
TS 的 children 顺序是 Parameter 们、EqualsGreaterThanToken、body；无参箭头没有 Parameter。
`async` 前缀时 `AsyncKeywordShape` 在最前，泛型箭头时 `TypeParameter` 们紧随其后
（`async <T>(…) => …` 的 TS 口径也是 AsyncKeyword 在前、TypeParameter 之后），两者都由调用方建好传进来。

```ts
const arrow = new ArrowFunctionShape(this.Template);
if (asyncKeyword !== undefined && asyncKeyword !== null) {
  arrow.Add(asyncKeyword);
}
if (typeParameters !== undefined && typeParameters !== null) {
  for (const typeParameter of typeParameters) {
    arrow.Add(typeParameter);
  }
}
const parameters = this.ParseFunctionParameters(bracket);
for (const parameter of parameters) {
  arrow.Add(parameter);
}
const returnColonUnit = this.Peek(0);
if (returnColonUnit !== null && this.IsText(returnColonUnit, ":")) {
  // Optional return type before `=>`; type predicates (`x is A`, `asserts x is A`) go through
  // TypeBuilder.ParseReturnType so they become TypePredicate nodes like TS.
  this.At++;
  const returnTypeStart = this.At;
  // 返回类型本身可以是函数类型（`(): () => void => {…}`），所以不能在**第一个** `=>` 处切断：
  // 逐个把候选 `=>` 之前的那段交给 TypeBuilder，第一个能完整读完的就是这条箭头的返回类型。
  let arrowSplit = -1;
  let arrowReturnType:Token | null = null;
  for (let candidate = returnTypeStart; candidate < this.Units.length; candidate++) {
    if (!this.IsText(this.Units[candidate], "=>")) {
      continue;
    }
    if (candidate === returnTypeStart) {
      break;
    }
    const returnTypeUnits:Array<Token> = this.Units.slice(returnTypeStart, candidate);
    const returnTypeBuilder = new TypeBuilder(this.Template, this.Context);
    returnTypeBuilder.Load(returnTypeUnits, this.Positions[returnTypeStart]);
    try {
      const parsed = returnTypeBuilder.ParseReturnType();
      if (returnTypeBuilder.At !== returnTypeBuilder.Units.length) {
        continue;
      }
      arrowSplit = candidate;
      arrowReturnType = parsed;
      break;
    } catch (error) {
      continue;
    }
  }
  if (arrowSplit < 0 || arrowReturnType === null) {
    throw new Error("箭头函数缺少 =>");
  }
  this.At = arrowSplit;
  arrow.Add(arrowReturnType);
}
const arrowUnit = this.Peek(0);
if (arrowUnit === null || !this.IsText(arrowUnit, "=>")) {
  throw new Error("箭头函数缺少 =>");
}
const arrowIndex = this.At;
this.At++;
const body = this.ParseArrowBody();
arrow.Add(this.MakeOperatorToken(arrowUnit, arrowIndex));
arrow.Add(body);
return this.SpanNode(arrow, start, this.At - 1);
```

## method ParseClassExpression:()=>Token

`class` 类表达式：可选名字、可选 `extends` 遗产子句、类体成员。成员与遗产子句**消费** declarations 家族的
静态助手（`ClassDeclarationShape.BuildMembers` / `HeritageClauseShape.BuildClauses`，不编辑 declarations 文件）；
TS 的 `ClassExpression` children 顺序：名字? → `HeritageClause` 们 → 成员。

```ts
const start = this.At;
const keywordUnit = this.Units[start];
this.At++;
const shape = new ClassExpressionShape(this.Template);
const typeParameters:Array<Token> = [];
let afterClass = keywordUnit.SourceRange.End === null ? 0 : keywordUnit.SourceRange.End.Index + 1;
const angleUnit = this.Peek(0);
if (angleUnit !== null && this.IsText(angleUnit, "<")) {
  // Generic class expression `class<T> { ... }` (TS 5.0): TypeParameter children come first.
  const angleClose = this.MatchAngleClose(this.At);
  if (angleClose < 0) {
    throw new Error("类表达式的类型参数缺少配对的 >");
  }
  const parsedTypeParameters = this.ParseAngleTypeParameters(this.At, angleClose);
  for (const typeParameter of parsedTypeParameters) {
    typeParameters.push(typeParameter);
  }
  if (this.Units[angleClose].SourceRange.End !== null) {
    afterClass = this.Units[angleClose].SourceRange.End.Index + 1;
  }
  this.At = angleClose + 1;
}
let name:Token | null = null;
let heritageBase = afterClass;
const nameUnit = this.Peek(0);
if (nameUnit !== null && nameUnit instanceof Common
    && !(nameUnit as Common).Is("extends") && !(nameUnit as Common).Is("implements")) {
  const nameIndex = this.At;
  const identifier = IdentifierShape.FromBasicToken(nameUnit as Common, this.Context);
  identifier.Pos = heritageBase;
  name = identifier;
  if (nameUnit.SourceRange.End !== null) {
    heritageBase = nameUnit.SourceRange.End.Index + 1;
  }
  this.At++;
}
let bodyIndex = this.At;
while (bodyIndex < this.Units.length && !this.IsBracketStart(this.Units[bodyIndex], "{")) {
  bodyIndex++;
}
if (bodyIndex >= this.Units.length) {
  throw new Error("类表达式缺少类体");
}
if (typeParameters.length > 0) {
  for (const typeParameter of typeParameters) {
    shape.Add(typeParameter);
  }
}
if (name !== null) {
  shape.Add(name);
}
if (bodyIndex > this.At) {
  const heritageUnits:Array<Token> = this.Units.slice(this.At, bodyIndex);
  const clauses = HeritageClauseShape.BuildClauses(keywordUnit, heritageUnits, heritageBase, this.Context);
  for (const clause of clauses) {
    shape.Add(clause);
  }
}
const bodyBracket = this.Units[bodyIndex] as Bracket;
const members = ClassDeclarationShape.BuildMembers(keywordUnit, bodyBracket, this.Context);
for (const member of members) {
  shape.Add(member);
}
this.At = bodyIndex + 1;
return this.SpanNode(shape, start, bodyIndex);
```

## method ParseArrowBody:()=>Token

箭头 body：紧跟 `{` 是块体（`Block`），否则是按赋值表达式解析的表达式体。块体交给 statements 家族的
`StatementBuilder`（**消费**，不编辑 statements 文件）。

```ts
const unit = this.Peek(0);
if (unit !== null && this.IsBracketStart(unit, "{")) {
  return this.ParseBlock();
}
return this.ParseAssign();
```

## method ParseBlock:()=>Token

`{ … }` 语句块：`{` `}` 是一个括号单元，里面的语句交给 `StatementBuilder.BuildBlock()` 递归建。
`StatementBuilder.Load` 的 `basePos` 取 `Positions[At]`，因此 `Block` 的 `Pos`（含前导 trivia）与 TS 同口径。

```ts
const start = this.At;
const unit = this.Peek(0);
if (unit === null || !this.IsBracketStart(unit, "{")) {
  throw new Error("缺少语句块");
}
const builder = new StatementBuilder(this.Template, this.Context);
builder.Load(this.Units.slice(start), this.Positions[start]);
const block = builder.BuildBlock();
if (builder.At !== 1) {
  throw new Error("语句块只应消费一个括号单元");
}
this.At = start + builder.At;
return block;
```

## method HasArrowAfter:(from:int)=>bool

从 `from` 起在同一段单元里找 `=>`，用于「带返回类型标注的箭头」前瞻（`(…): T => …`）。
遇到语句界符 `;` / `,` 判否，避免把 `cond ? f(1) : x` 这类三元误当成箭头。

```ts
for (let at = from; at < this.Units.length; at++) {
  const unit = this.Units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (this.IsText(unit, "=>")) {
    return true;
  }
  if (unit instanceof Symbol) {
    const text = (unit as Symbol).TempToString();
    if (text === ";" || text === ",") {
      return false;
    }
  }
}
return false;
```

## method ParseFunctionExpression:(asyncKeyword?:Token | null, spanStart?:int)=>Token

`function` 函数表达式：children 顺序与 TS 一致 —— `async`?、`*`?、可选的 `Identifier`（名字）、
`TypeParameter` 们、`Parameter` 们、返回类型?、`Block`；参数括号与函数体各是一个 `Bracket` 单元，
参数由 `ParseFunctionParameters` 从括号 `Data` 里建。
TS 的 `FunctionExpression` 没有 `name` 字段（名字只是子节点之一），所以名字走 `Data`、不设字段；
匿名函数表达式的类型参数段（`function <T>(…)`）与生成器 `*` 都不算名字，必须先跳过。

```ts
const start = this.At;
const signedStart = spanStart !== undefined && spanStart !== null ? spanStart : start;
this.At++;
const shape = new FunctionExpressionShape(this.Template);
if (asyncKeyword !== undefined && asyncKeyword !== null) {
  shape.Add(asyncKeyword);
}
const asteriskUnit = this.Peek(0);
if (asteriskUnit !== null && this.IsText(asteriskUnit, "*")) {
  shape.Add(this.MakeOperatorToken(asteriskUnit, this.At));
  this.At++;
}
const nameUnit = this.Peek(0);
if (nameUnit !== null && nameUnit instanceof Common && !this.IsText(nameUnit, "<")) {
  const nameIndex = this.At;
  const name = IdentifierShape.FromBasicToken(nameUnit as Common, this.Context);
  name.Pos = this.Positions[nameIndex];
  shape.Add(name);
  this.At++;
}
const angleUnit = this.Peek(0);
if (angleUnit !== null && this.IsText(angleUnit, "<")) {
  const angleClose = this.MatchAngleClose(this.At);
  if (angleClose < 0) {
    throw new Error("函数表达式的类型参数缺少配对的 >");
  }
  const functionTypeParameters = this.ParseAngleTypeParameters(this.At, angleClose);
  for (const typeParameter of functionTypeParameters) {
    shape.Add(typeParameter);
  }
  this.At = angleClose + 1;
}
const parametersUnit = this.Peek(0);
if (parametersUnit === null || !this.IsBracketStart(parametersUnit, "(")) {
  throw new Error("函数表达式缺少参数括号");
}
const parameterBracket = parametersUnit as Bracket;
this.At++;
const parameters = this.ParseFunctionParameters(parameterBracket);
for (const parameter of parameters) {
  shape.Add(parameter);
}
const returnColonUnit = this.Peek(0);
if (returnColonUnit !== null && this.IsText(returnColonUnit, ":")) {
  // Optional return type before the body; type predicates go through ParseReturnType.
  this.At++;
  const returnTypeStart = this.At;
  while (this.At < this.Units.length && !this.IsBracketStart(this.Units[this.At], "{")) {
    this.At++;
  }
  const returnTypeUnits:Array<Token> = this.Units.slice(returnTypeStart, this.At);
  if (returnTypeUnits.length === 0) {
    throw new Error("函数表达式的返回类型为空");
  }
  const returnTypeBuilder = new TypeBuilder(this.Template, this.Context);
  returnTypeBuilder.Load(returnTypeUnits, this.Positions[returnTypeStart]);
  const functionReturnType = returnTypeBuilder.ParseReturnType();
  if (returnTypeBuilder.At !== returnTypeBuilder.Units.length) {
    throw new Error("函数表达式的返回类型没有读完");
  }
  shape.Add(functionReturnType);
}
const bodyUnit = this.Peek(0);
if (bodyUnit === null || !this.IsBracketStart(bodyUnit, "{")) {
  throw new Error("函数表达式缺少函数体");
}
shape.Add(this.ParseBlock());
return this.SpanNode(shape, signedStart, this.At - 1);
```

## method ParseFunctionParameters:(bracket:Bracket)=>Array<Token>

参数括号里的逐个参数（箭头与函数表达式共用）：`...`? 名字（`?`）?（`: 类型`）?（`= 默认值`）?。
children 顺序与 TS 的 `Parameter` 完全一致：`DotDotDotToken`、`Identifier`、`QuestionToken`、类型节点、initializer。
注意 TS 的 `Parameter` **不含** `=` 这个 EqualsToken（实测 `{ a = 1 }` 那种 shorthand 才含），所以默认值只加 initializer。
`Pos` 取参数第一个单元（`...` 或名字）的含前导 trivia 起点，区间到最后一个子节点结束；类型走 `TypeBuilder`。

```ts
const parameters:Array<Token> = [];
const inner = new ExpressionBuilder(this.Template, this.Context);
let base = 0;
if (bracket.SourceRange.Start !== null) {
  base = bracket.SourceRange.Start.Index + 1;
}
inner.Load(bracket.Data, base);
while (inner.At < inner.Units.length) {
  const unit = inner.Units[inner.At];
  if (inner.IsText(unit, ",")) {
    inner.At++;
    continue;
  }
  const parameterIndex = inner.At;
  let parameterDecorators:Array<Token> = [];
  const decoratorProbe = inner.Peek(0);
  if (decoratorProbe !== null && inner.IsText(decoratorProbe, "@")) {
    // Function expression parameter decorators: reuse TypeBuilder.ParseDecorators (DecoratorShape).
    const decoratorBuilder = new TypeBuilder(this.Template, this.Context);
    decoratorBuilder.Load(inner.Units.slice(inner.At), inner.Positions[inner.At]);
    parameterDecorators = decoratorBuilder.ParseDecorators();
    inner.At += decoratorBuilder.At;
  }
  let restUnit:Token | null = null;
  let restIndex = -1;
  if (inner.IsText(unit, "...")) {
    restUnit = unit;
    restIndex = inner.At;
    inner.At++;
  }
  const nameIndex = inner.At;
  const nameUnit = inner.Peek(0);
  let name:Token;
  if (nameUnit !== null && nameUnit instanceof Bracket
      && (nameUnit as Bracket).StartBracketChar !== "(") {
    // destructuring parameter: `[...]` / `{...}` 交给 bindings 家族的 FromBracket 建 pattern。
    const nameBracket = nameUnit as Bracket;
    if ((nameBracket as Bracket).StartBracketChar === "[") {
      name = ArrayBindingPatternShape.FromBracket(nameBracket, this.Context);
    } else {
      name = ObjectBindingPatternShape.FromBracket(nameBracket, this.Context);
    }
    (name as ShapeToken).Pos = inner.Positions[nameIndex];
    inner.At++;
  } else if (nameUnit !== null && nameUnit instanceof Common && !(nameUnit as Common).CanStartNumber()) {
    const identifier = IdentifierShape.FromBasicToken(nameUnit as Common, this.Context);
    identifier.Pos = inner.Positions[nameIndex];
    name = identifier;
    inner.At++;
  } else {
    throw new Error("函数参数只支持标识符或绑定模式");
  }
  const parameter = new ParameterShape(this.Template);
  for (const decorator of parameterDecorators) {
    parameter.Add(decorator);
  }
  if (restUnit !== null) {
    parameter.Add(inner.MakeOperatorToken(restUnit, restIndex));
  }
  parameter.Add(name);
  if (inner.At < inner.Units.length && inner.IsText(inner.Units[inner.At], "?:")) {
    // `?` 与 `:` 相邻时会被 token 层并成一颗组合符号 `?:`；QuestionToken 只覆盖前一个 `?`。
    const questionUnit = inner.Units[inner.At];
    const questionShape = new QuestionTokenShape(this.Template);
    const questionSource = questionUnit.SourceRange.Start;
    if (questionSource !== null) {
      questionShape.SignIn(questionSource);
      questionShape.SignOut(questionSource);
    }
    questionShape.Pos = inner.Positions[inner.At];
    questionShape.TryToClose(this.Context);
    parameter.Add(questionShape);
    inner.At++;
    parameter.Add(inner.ParseFollowingType());
  } else {
    if (inner.At < inner.Units.length && inner.IsText(inner.Units[inner.At], "?")) {
      const questionUnit = inner.Units[inner.At];
      const questionIndex = inner.At;
      inner.At++;
      parameter.Add(inner.MakeOperatorToken(questionUnit, questionIndex));
    }
    if (inner.At < inner.Units.length && inner.IsText(inner.Units[inner.At], ":")) {
      inner.At++;
      parameter.Add(inner.ParseFollowingType());
    }
  }
  if (inner.At < inner.Units.length && inner.IsText(inner.Units[inner.At], "=")) {
    inner.At++;
    parameter.Add(inner.ParseAssign());
  }
  inner.SpanNode(parameter, parameterIndex, inner.At - 1);
  parameters.push(parameter);
}
return parameters;
```

## method MatchAngleClose:(openIndex:int)=>int

从 `openIndex`（必须是 `<`）扫到与它配对的 `>`，返回 `>` 的下标；扫不到返回 `-1`。
只把 `Symbol` 的 `<` / `>` 当结构符（类型里的 `,` `|` `&` 等原样跳过）；`>>` 是组合符号，
拆它需要 basic token 决策（见本块暂缓），这里**返回 `-1` 让调用方抛明确错误，不静默错树**。

```ts
let depth = 0;
for (let at = openIndex; at < this.Units.length; at++) {
  const unit = this.Units[at];
  if (!(unit instanceof Symbol)) {
    if (depth === 0) {
      return -1;
    }
    continue;
  }
  const text = (unit as Symbol).TempToString();
  if (text === "<") {
    depth++;
    continue;
  }
  if (text === ">") {
    depth--;
    if (depth === 0) {
      return at;
    }
    continue;
  }
  if (text === ">>" || text === ">>>") {
    // 合符号收尾：`Array<number>>` 的 `>>` 关两层、`>>>` 关三层（TS 词法上是多个 `>`）。
    depth -= text.length;
    if (depth <= 0) {
      return at;
    }
    continue;
  }
}
return -1;
```

## method ParseAngleType:(first:int, last:int)=>Token

把 `Units[first..last]` 交给 `TypeBuilder.ParseType()` 读一个**完整**类型，读不完就抛错
（尖括号断言里 `<` / `>` 不投影，只有类型节点与表达式节点进 AST）。
`basePos` 取 `Positions[first]`，与 TypeBuilder 的 `Pos` 口径一致。

```ts
if (first > last) {
  throw new Error("尖括号里没有类型");
}
const builder = new TypeBuilder(this.Template, this.Context);
builder.Load(this.Units.slice(first, last + 1), this.Positions[first]);
const type = builder.ParseType();
if (builder.At !== last - first + 1) {
  throw new Error("尖括号断言里的类型没有读完");
}
return type;
```

## method ParseAngleTypeParameters:(openIndex:int, closeIndex:int)=>Array<Token>

泛型箭头的 `<T>` / `<T, U>`：只收**名字**形态的类型参数（`extends` / 默认值 / `const` / 变体标注
留给 types 家族）；每个 `TypeParameter` 的 children 是名字 `Identifier`，区间到名字结束、`Pos` 取名字含前导 trivia 的起点。

```ts
const builder = new TypeBuilder(this.Template, this.Context);
builder.Load(this.Units.slice(openIndex), this.Positions[openIndex]);
// Full TypeParameter grammar (variance / const / `extends` constraint / `= default`) lives in
// TypeBuilder.ParseTypeParameterList; reuse it instead of a names-only reimplementation.
const parameters = builder.ParseTypeParameterList();
if (parameters.length === 0 || builder.At === 0) {
  throw new Error("泛型箭头缺少类型参数");
}
return parameters;
```

## method ParseAngleStart:()=>Token

语句 / 表达式起点是 `<`：先扫配对 `>`。`>` 之后紧跟 `(…) =>` 的按**泛型箭头**解析
（TypeParameter 们走 `ParseArrowFromBracket`）；否则按**尖括号断言**解析（children = [Type, expression]，
`<` / `>` 不投影）。类型解析失败会让 `TypeBuilder` / `ParseAngleType` 抛明确错误。

```ts
const start = this.At;
const close = this.MatchAngleClose(start);
if (close < 0) {
  throw new Error("尖括号断言/泛型箭头缺少配对的 >");
}
const afterBracket = this.Units[close + 1];
if (afterBracket !== undefined && this.IsBracketStart(afterBracket, "(")) {
  // 泛型箭头：`<T>(…) => …` / `<T,>(…): T => …`（形参表与 `=>` 之间可以有返回类型标注）。
  let bracketAfter = close + 2;
  while (bracketAfter < this.Units.length && this.Units[bracketAfter].IsTriviaToken) {
    bracketAfter++;
  }
  const afterArrow = bracketAfter < this.Units.length ? this.Units[bracketAfter] : null;
  let isGenericArrow = afterArrow !== null && this.IsText(afterArrow, "=>");
  if (!isGenericArrow && afterArrow !== null && this.IsText(afterArrow, ":")) {
    isGenericArrow = this.HasArrowAfter(bracketAfter + 1);
  }
  if (isGenericArrow) {
    const typeParameters = this.ParseAngleTypeParameters(start, close);
    this.At = close + 1;
    const bracket = this.Peek(0) as Bracket;
    this.At++;
    return this.ParseArrowFromBracket(bracket, start, null, typeParameters);
  }
}
const closeUnit = this.Units[close];
const closeText = closeUnit instanceof Symbol ? (closeUnit as Symbol).TempToString() : ">";
const typeLast = closeText.length > 1 ? close : close - 1;
const type = this.ParseAngleType(start + 1, typeLast);
this.At = close + 1;
const shape = new TypeAssertionExpressionShape(this.Template);
shape.Add(type);
const operand = this.ParseUnary();
shape.Add(operand);
return this.SpanNode(shape, start, this.At - 1);
```

## method ParsePrimary:()=>Token

```ts
const start = this.At;
const unit = this.Peek(0);
if (unit === null) {
  throw new Error("表达式意外结束");
}
if (unit instanceof Symbol && (unit as Symbol).Is("#")) {
  // PrivateIdentifier: the token layer splits `#x` into Symbol "#" + Common "x".
  // No Text field is set: TS PrivateIdentifier carries no `text` in the AST projection.
  this.At++;
  const privateNameUnit = this.Peek(0);
  if (privateNameUnit === null || !(privateNameUnit instanceof Common)) {
    throw new Error("私有标识符缺少名字");
  }
  const shape = new PrivateIdentifierShape(this.Template);
  shape.SignInToken(unit);
  shape.SignOutToken(privateNameUnit);
  shape.Pos = this.Positions[start];
  shape.TryToClose(this.Context);
  this.At++;
  return shape;
}
if (unit instanceof RegexToken) {
  this.At++;
  const shape = RegularExpressionLiteralShape.FromBasicToken(unit as RegexToken, this.Context);
  shape.Pos = this.Positions[start];
  return shape;
}
if (unit instanceof Bracket) {
  const bracket = unit as Bracket;
  if (bracket.StartBracketChar === "(") {
    const next = this.Peek(1);
    // Arrow with a return type: `(params): T => ...` / `(params): x is A => ...`.
    // `:` alone is ambiguous with the ternary colon (`a ? (b, c) : d`), so only take the
    // arrow route when a `=>` actually shows up after the parameter list.
    let arrowAhead = next !== null && this.IsText(next, "=>");
    if (!arrowAhead && next !== null && this.IsText(next, ":")) {
      let probe = this.At + 2;
      while (probe < this.Units.length) {
        if (this.IsText(this.Units[probe], "=>")) {
          arrowAhead = true;
          break;
        }
        probe++;
      }
    }
    if (arrowAhead) {
      this.At++;
      return this.ParseArrowFromBracket(bracket, start);
    }
  }
  if (bracket.StartBracketChar === "{") {
    this.At++;
    return this.ParseObjectLiteral(bracket, start);
  }
  if (bracket.StartBracketChar === "[") {
    this.At++;
    return this.ParseArrayLiteral(bracket, start);
  }
  if (bracket.StartBracketChar !== "(") {
    throw new Error("表达式里出现了不支持的括号");
  }
  this.At++;
  const inner = this.ParseBracketExpression(bracket);
  const shape = new ParenthesizedExpressionShape(this.Template);
  shape.Add(inner);
  return this.SpanNode(shape, start, start);
}
if (unit instanceof String) {
  if (this.IsTemplateToken(unit)) {
    return this.ParseTemplateToken();
  }
  this.At++;
  const shape = StringLiteralShape.FromBasicToken(unit as String, this.Context);
  shape.Pos = this.Positions[start];
  return shape;
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  if (text === "new") {
    return this.ParseNew();
  }
  if (text === "class") {
    return this.ParseClassExpression();
  }
  if (text === "function") {
    return this.ParseFunctionExpression();
  }
  if (text === "super") {
    // SuperKeyword (not Identifier): postfix chain / call then wrap it as usual.
    this.At++;
    return this.MakeKeywordLeaf(new SuperKeywordShape(this.Template), start);
  }
  if (text === "async") {
    // async 前缀有四种后续：`async function …`（异步函数表达式）、`async <T>(…) => …`
    // （泛型 async 箭头）、`async (…) => …` / `async (…): T => …`（箭头，可带返回类型标注）、
    // `async a => …`。确认不了是箭头就不吃 `async`（退回标识符路径）。
    let asyncProbe = start + 1;
    while (asyncProbe < this.Units.length && this.Units[asyncProbe].IsTriviaToken) {
      asyncProbe++;
    }
    const next = asyncProbe < this.Units.length ? this.Units[asyncProbe] : null;
    if (next !== null && next instanceof Common && (next as Common).Is("function")) {
      // `async function () {}`：AsyncKeyword 是函数表达式的第一个子节点。
      const functionKeyword = this.MakeKeywordLeaf(new AsyncKeywordShape(this.Template), start);
      this.At = asyncProbe;
      return this.ParseFunctionExpression(functionKeyword, start);
    }
    if (next !== null && this.IsText(next, "<")) {
      // `async <T>(x: T) => x` / `async<T>(x) => x`：类型参数表在 async 与形参表之间。
      const asyncAngleClose = this.MatchAngleClose(asyncProbe);
      if (asyncAngleClose >= 0) {
        const asyncBracketAt = asyncAngleClose + 1;
        const asyncBracketUnit = asyncBracketAt < this.Units.length ? this.Units[asyncBracketAt] : null;
        if (asyncBracketUnit !== null && this.IsBracketStart(asyncBracketUnit, "(")) {
          let asyncArrowAt = asyncBracketAt + 1;
          while (asyncArrowAt < this.Units.length && this.Units[asyncArrowAt].IsTriviaToken) {
            asyncArrowAt++;
          }
          const asyncAfterBracket = asyncArrowAt < this.Units.length ? this.Units[asyncArrowAt] : null;
          let asyncIsArrow = asyncAfterBracket !== null && this.IsText(asyncAfterBracket, "=>");
          if (!asyncIsArrow && asyncAfterBracket !== null && this.IsText(asyncAfterBracket, ":")) {
            asyncIsArrow = this.HasArrowAfter(asyncArrowAt + 1);
          }
          if (asyncIsArrow) {
            const keyword = this.MakeKeywordLeaf(new AsyncKeywordShape(this.Template), start);
            const typeParameters = this.ParseAngleTypeParameters(asyncProbe, asyncAngleClose);
            this.At = asyncBracketAt + 1;
            return this.ParseArrowFromBracket(asyncBracketUnit as Bracket, start, keyword, typeParameters);
          }
        }
      }
    }
    if (next !== null && this.IsBracketStart(next, "(")) {
      const bracketAt = asyncProbe;
      let afterBracketAt = bracketAt + 1;
      while (afterBracketAt < this.Units.length && this.Units[afterBracketAt].IsTriviaToken) {
        afterBracketAt++;
      }
      const after = afterBracketAt < this.Units.length ? this.Units[afterBracketAt] : null;
      let isArrow = after !== null && this.IsText(after, "=>");
      if (!isArrow && after !== null && this.IsText(after, ":")) {
        // 带返回类型标注的 async 箭头：`async (): Promise<void> => {}`。
        isArrow = this.HasArrowAfter(afterBracketAt + 1);
      }
      if (isArrow) {
        const keyword = this.MakeKeywordLeaf(new AsyncKeywordShape(this.Template), start);
        this.At = bracketAt;
        const bracket = this.Peek(0) as Bracket;
        this.At++;
        return this.ParseArrowFromBracket(bracket, start, keyword);
      }
    }
    if (next !== null && next instanceof Common && !(next as Common).CanStartNumber()) {
      const after = this.Peek(2);
      if (after !== null && this.IsText(after, "=>")) {
        const keyword = this.MakeKeywordLeaf(new AsyncKeywordShape(this.Template), start);
        this.At++;
        const nameIndex = this.At;
        const name = IdentifierShape.FromBasicToken(next as Common, this.Context);
        name.Pos = this.Positions[nameIndex];
        this.At++;
        const parameter = new ParameterShape(this.Template);
        parameter.Add(name);
        this.SpanNode(parameter, nameIndex, nameIndex);
        const arrowUnit = this.Peek(0);
        if (arrowUnit === null || !this.IsText(arrowUnit, "=>")) {
          throw new Error("async 箭头缺少 =>");
        }
        const arrowIndex = this.At;
        this.At++;
        const body = this.ParseArrowBody();
        const arrow = new ArrowFunctionShape(this.Template);
        arrow.Add(keyword);
        arrow.Add(parameter);
        arrow.Add(this.MakeOperatorToken(arrowUnit, arrowIndex));
        arrow.Add(body);
        return this.SpanNode(arrow, start, this.At - 1);
      }
    }
  }
  this.At++;
  if (text === "import") {
    // `import.meta`：MetaProperty，children 只有 Identifier "meta"（`import` 是 token，不投影）。
    // `At` 此时已越过 `import`：Peek(0) 应是 `.`、Peek(1) 应是 `meta`；
    // 不满足就不吃 import，退回普通标识符路径（`import x from "m"` 由声明候选处理）。
    const metaDot = this.Peek(0);
    const metaUnit = this.Peek(1);
    // dynamic import: `import("m")` — `import` is the ImportKeyword leaf, the call is parsed by ParsePostfix.
    const callUnit = this.Peek(0);
    if (callUnit !== null && this.IsBracketStart(callUnit, "(")) {
      return this.MakeKeywordLeaf(new ImportKeywordShape(this.Template), start);
    }
    if (metaDot !== null && this.IsText(metaDot, ".")
      && metaUnit !== null && metaUnit instanceof Common && (metaUnit as Common).Is("meta")) {
      const metaShape = new MetaPropertyShape(this.Template);
      this.At++;
      const metaIndex = this.At;
      const metaShapeName = IdentifierShape.FromBasicToken(metaUnit as Common, this.Context);
      metaShapeName.Pos = this.Positions[metaIndex];
      this.At++;
      metaShape.Add(metaShapeName);
      return this.SpanNode(metaShape, start, this.At - 1);
    }
  }
  if (text === "true") {
    return this.MakeKeywordLeaf(new TrueKeywordShape(this.Template), start);
  }
  if (text === "false") {
    return this.MakeKeywordLeaf(new FalseKeywordShape(this.Template), start);
  }
  if (text === "null") {
    return this.MakeKeywordLeaf(new NullKeywordShape(this.Template), start);
  }
  if (text === "this") {
    return this.MakeKeywordLeaf(new ThisKeywordShape(this.Template), start);
  }
  if (this.StartsNumber(text)) {
    if ((unit as Common).IsBigInt()) {
      const bigIntShape = BigIntLiteralShape.FromBasicToken(unit as Common, this.Context);
      bigIntShape.Pos = this.Positions[start];
      return bigIntShape;
    }
    const shape = NumericLiteralShape.FromBasicToken(unit as Common, this.Context);
    shape.Pos = this.Positions[start];
    return shape;
  }
  const shape = IdentifierShape.FromBasicToken(unit as Common, this.Context);
  shape.Pos = this.Positions[start];
  return shape;
}
if (unit instanceof Symbol && (unit as Symbol).Is("<")) {
  return this.ParseAngleStart();
}
throw new Error("不支持的表达式起点");
```

## method MakeKeywordLeaf:(shape:ShapeToken, index:int)=>ShapeToken

```ts
return this.SpanLeaf(shape, index);
```

## method ParseName:()=>Token

```ts
const unit = this.Peek(0);
if (unit === null || !(unit instanceof Common)) {
  throw new Error("缺少标识符");
}
const index = this.At;
this.At++;
const shape = IdentifierShape.FromBasicToken(unit as Common, this.Context);
shape.Pos = this.Positions[index];
return shape;
```

## method IsBracketStart:(unit:Token, start:string)=>bool

```ts
return unit instanceof Bracket && (unit as Bracket).StartBracketChar === start;
```

## method ParseBracketExpression:(bracket:Bracket)=>Token

```ts
const inner = new ExpressionBuilder(this.Template, this.Context);
let base = 0;
if (bracket.SourceRange.Start !== null) {
  base = bracket.SourceRange.Start.Index + 1;
}
inner.Load(bracket.Data, base);
if (inner.Units.length === 0) {
  throw new Error("括号内没有表达式");
}
const shape = inner.ParseExpression();
if (inner.At !== inner.Units.length) {
  throw new Error("括号内的表达式没有读完");
}
return shape;
```

## method ParseBracketArguments:(bracket:Bracket)=>Array<Token>

```ts
const args:Array<Token> = [];
const inner = new ExpressionBuilder(this.Template, this.Context);
let base = 0;
if (bracket.SourceRange.Start !== null) {
  base = bracket.SourceRange.Start.Index + 1;
}
inner.Load(bracket.Data, base);
while (inner.At < inner.Units.length) {
  const unit = inner.Units[inner.At];
  if (inner.IsText(unit, ",")) {
    inner.At++;
    continue;
  }
  if (inner.IsText(unit, "...")) {
    const spreadIndex = inner.At;
    inner.At++;
    const expression = inner.ParseAssign();
    const spread = new SpreadElementShape(this.Template);
    spread.Add(expression);
    args.push(inner.SpanNode(spread, spreadIndex, inner.At - 1));
    continue;
  }
  const arg = inner.ParseAssign();
  args.push(arg);
}
return args;
```

## method MakeOperatorToken:(unit:Token, index:int)=>Token

```ts
const text = this.TextOf(unit);
let shape:ShapeToken;
if (text === "=") {
  shape = new FirstAssignmentShape(this.Template);
} else if (text === "...") {
  shape = new DotDotDotTokenShape(this.Template);
} else if (text === "=>") {
  shape = new EqualsGreaterThanTokenShape(this.Template);
} else if (text === "+=") {
  shape = new FirstCompoundAssignmentShape(this.Template);
} else if (text === "^=") {
  shape = new LastBinaryOperatorShape(this.Template);
} else if (text === "<") {
  shape = new FirstBinaryOperatorShape(this.Template);
} else if (text === "+") {
  shape = new PlusTokenShape(this.Template);
} else if (text === "-") {
  shape = new MinusTokenShape(this.Template);
} else if (text === "*") {
  shape = new AsteriskTokenShape(this.Template);
} else if (text === "/") {
  shape = new SlashTokenShape(this.Template);
} else if (text === "%") {
  shape = new PercentTokenShape(this.Template);
} else if (text === "**") {
  shape = new AsteriskAsteriskTokenShape(this.Template);
} else if (text === ">") {
  shape = new GreaterThanTokenShape(this.Template);
} else if (text === "<=") {
  shape = new LessThanEqualsTokenShape(this.Template);
} else if (text === ">=") {
  shape = new GreaterThanEqualsTokenShape(this.Template);
} else if (text === "==") {
  shape = new EqualsEqualsTokenShape(this.Template);
} else if (text === "!=") {
  shape = new ExclamationEqualsTokenShape(this.Template);
} else if (text === "===") {
  shape = new EqualsEqualsEqualsTokenShape(this.Template);
} else if (text === "!==") {
  shape = new ExclamationEqualsEqualsTokenShape(this.Template);
} else if (text === "&") {
  shape = new AmpersandTokenShape(this.Template);
} else if (text === "|") {
  shape = new BarTokenShape(this.Template);
} else if (text === "^") {
  shape = new CaretTokenShape(this.Template);
} else if (text === "<<") {
  shape = new LessThanLessThanTokenShape(this.Template);
} else if (text === ">>") {
  shape = new GreaterThanGreaterThanTokenShape(this.Template);
} else if (text === ">>>") {
  shape = new GreaterThanGreaterThanGreaterThanTokenShape(this.Template);
} else if (text === "&&") {
  shape = new AmpersandAmpersandTokenShape(this.Template);
} else if (text === "||") {
  shape = new BarBarTokenShape(this.Template);
} else if (text === "??") {
  shape = new QuestionQuestionTokenShape(this.Template);
} else if (text === "?") {
  shape = new QuestionTokenShape(this.Template);
} else if (text === ":") {
  shape = new ColonTokenShape(this.Template);
} else if (text === ",") {
  shape = new CommaTokenShape(this.Template);
} else if (text === "?.") {
  shape = new QuestionDotTokenShape(this.Template);
} else if (text === "-=") {
  shape = new MinusEqualsTokenShape(this.Template);
} else if (text === "*=") {
  shape = new AsteriskEqualsTokenShape(this.Template);
} else if (text === "/=") {
  shape = new SlashEqualsTokenShape(this.Template);
} else if (text === "%=") {
  shape = new PercentEqualsTokenShape(this.Template);
} else if (text === "**=") {
  shape = new AsteriskAsteriskEqualsTokenShape(this.Template);
} else if (text === "<<=") {
  shape = new LessThanLessThanEqualsTokenShape(this.Template);
} else if (text === ">>=") {
  shape = new GreaterThanGreaterThanEqualsTokenShape(this.Template);
} else if (text === ">>>=") {
  shape = new GreaterThanGreaterThanGreaterThanEqualsTokenShape(this.Template);
} else if (text === "&=") {
  shape = new AmpersandEqualsTokenShape(this.Template);
} else if (text === "|=") {
  shape = new BarEqualsTokenShape(this.Template);
} else if (text === "&&=") {
  shape = new AmpersandAmpersandEqualsTokenShape(this.Template);
} else if (text === "||=") {
  shape = new BarBarEqualsTokenShape(this.Template);
} else if (text === "??=") {
  shape = new QuestionQuestionEqualsTokenShape(this.Template);
} else if (text === "instanceof") {
  shape = new InstanceOfKeywordShape(this.Template);
} else if (text === "in") {
  shape = new InKeywordShape(this.Template);
} else {
  throw new Error("未知运算符: " + text);
}
return this.SpanLeaf(shape, index);
```
