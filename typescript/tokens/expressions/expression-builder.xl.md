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
import { ArrowFunctionShape } from "./arrow-function-shape.xl.md"
import { BinaryExpressionShape } from "./binary-expression-shape.xl.md"
import { CallExpressionShape } from "./call-expression-shape.xl.md"
import { ClassExpressionShape } from "./class-expression-shape.xl.md"
import { ConditionalExpressionShape } from "./conditional-expression-shape.xl.md"
import { DeleteExpressionShape } from "./delete-expression-shape.xl.md"
import { ElementAccessExpressionShape } from "./element-access-expression-shape.xl.md"
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
import { InKeywordShape } from "../keywords/in-keyword-shape.xl.md"
import { InstanceOfKeywordShape } from "../keywords/instance-of-keyword-shape.xl.md"
import { NullKeywordShape } from "../keywords/null-keyword-shape.xl.md"
import { ThisKeywordShape } from "../keywords/this-keyword-shape.xl.md"
import { TrueKeywordShape } from "../keywords/true-keyword-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { ParameterShape } from "../types/parameter-shape.xl.md"
import { PropertyAssignmentShape } from "../members/property-assignment-shape.xl.md"
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
if (!this.IsPrefixOperator(text)) {
  return this.ParsePostfix();
}
this.At++;
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

## method ParsePostfix:()=>Token

```ts
const start = this.At;
let expression = this.ParsePrimary();
while (true) {
  const unit = this.Peek(0);
  if (unit === null) {
    break;
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
    const body = this.ParseAssign();
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
    shape.Add(expression);
    shape.Add(template);
    if (expression.SourceRange.Start !== null) {
      shape.SignIn(expression.SourceRange.Start);
    }
    if (template.SourceRange.End !== null) {
      shape.SignOut(template.SourceRange.End);
    }
    shape.Pos = (expression as ShapeToken).Pos;
    shape.TryToClose(this.Context);
    expression = shape;
    continue;
  }
  if (unit instanceof Symbol) {
    const text = (unit as Symbol).TempToString();
    if (text === ".") {
      this.At++;
      const name = this.ParseName();
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

## method ParseObjectLiteral:(bracket:Bracket, start:int)=>Token

`{…}` 对象字面量：逐个属性解析（`名字 : 值`），逗号不进 AST。TS 的 `PropertyAssignment` 只有两个子节点（名 / 值），冒号不是节点。

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
  const nameIndex = inner.At;
  const name = inner.ParseName();
  const colon = inner.Peek(0);
  if (colon === null || !inner.IsText(colon, ":")) {
    throw new Error("对象字面量缺少冒号");
  }
  inner.At++;
  const value = inner.ParseAssign();
  const property = new PropertyAssignmentShape(this.Template);
  property.Add(name);
  property.Add(value);
  inner.SpanNode(property, nameIndex, inner.At - 1);
  shape.Add(property);
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
while (inner.At < inner.Units.length) {
  const unit = inner.Units[inner.At];
  if (inner.IsText(unit, ",")) {
    inner.At++;
    continue;
  }
  shape.Add(inner.ParseAssign());
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

## method ParseArrowFromBracket:(bracket:Bracket, start:int)=>Token

`(…) => body` 的箭头：`bracket.Data` 里只允许「标识符 (`,` 标识符)*」，每个标识符产出一个 `Parameter`（子节点是 `Identifier`）；`=>` 走 `EqualsGreaterThanToken`，body 按赋值表达式解析。TS 的 children 顺序是 Parameter 们、EqualsGreaterThanToken、body；无参箭头没有 Parameter。

```ts
const arrow = new ArrowFunctionShape(this.Template);
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
  if (!(unit instanceof Common) || (unit as Common).CanStartNumber()) {
    throw new Error("箭头函数的参数只支持标识符");
  }
  const nameIndex = inner.At;
  const name = IdentifierShape.FromBasicToken(unit as Common, this.Context);
  name.Pos = inner.Positions[nameIndex];
  inner.At++;
  const parameter = new ParameterShape(this.Template);
  parameter.Add(name);
  inner.SpanNode(parameter, nameIndex, nameIndex);
  arrow.Add(parameter);
}
const arrowUnit = this.Peek(0);
if (arrowUnit === null || !this.IsText(arrowUnit, "=>")) {
  throw new Error("箭头函数缺少 =>");
}
const arrowIndex = this.At;
this.At++;
const body = this.ParseAssign();
arrow.Add(this.MakeOperatorToken(arrowUnit, arrowIndex));
arrow.Add(body);
return this.SpanNode(arrow, start, this.At - 1);
```

## method ParseClassExpression:()=>Token

`class {}` 类表达式：本批只收空类体（这种情况下 ClassExpression 没有 children）。类体成员依赖后续块，先显式报错，不静默建错树。

```ts
const start = this.At;
this.At++;
const bodyUnit = this.Peek(0);
if (bodyUnit === null || !this.IsBracketStart(bodyUnit, "{")) {
  throw new Error("类表达式缺少类体");
}
const bracket = bodyUnit as Bracket;
for (const item of bracket.Data) {
  if (!item.IsTriviaToken) {
    throw new Error("类表达式暂不支持类体成员");
  }
}
this.At++;
const shape = new ClassExpressionShape(this.Template);
return this.SpanNode(shape, start, this.At - 1);
```

## method ParsePrimary:()=>Token

```ts
const start = this.At;
const unit = this.Peek(0);
if (unit === null) {
  throw new Error("表达式意外结束");
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
    if (next !== null && this.IsText(next, "=>")) {
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
  this.At++;
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
