# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { FirstBinaryOperatorShape } from "../aliases/first-binary-operator-shape.xl.md"
import { InKeywordShape } from "../keywords/in-keyword-shape.xl.md"
import { InstanceOfKeywordShape } from "../keywords/instance-of-keyword-shape.xl.md"
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
import { CaretEqualsTokenShape } from "../punctuation/caret-equals-token-shape.xl.md"
import { CaretTokenShape } from "../punctuation/caret-token-shape.xl.md"
import { ColonTokenShape } from "../punctuation/colon-token-shape.xl.md"
import { EqualsEqualsEqualsTokenShape } from "../punctuation/equals-equals-equals-token-shape.xl.md"
import { EqualsEqualsTokenShape } from "../punctuation/equals-equals-token-shape.xl.md"
import { EqualsTokenShape } from "../punctuation/equals-token-shape.xl.md"
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
import { PlusEqualsTokenShape } from "../punctuation/plus-equals-token-shape.xl.md"
import { PlusTokenShape } from "../punctuation/plus-token-shape.xl.md"
import { QuestionQuestionEqualsTokenShape } from "../punctuation/question-question-equals-token-shape.xl.md"
import { QuestionQuestionTokenShape } from "../punctuation/question-question-token-shape.xl.md"
import { QuestionTokenShape } from "../punctuation/question-token-shape.xl.md"
import { SlashEqualsTokenShape } from "../punctuation/slash-equals-token-shape.xl.md"
import { SlashTokenShape } from "../punctuation/slash-token-shape.xl.md"
import { AsExpressionShape } from "./as-expression-shape.xl.md"
import { DeleteExpressionShape } from "./delete-expression-shape.xl.md"
import { OperatorTable } from "./operator-table.xl.md"
import { PostfixUnaryExpressionShape } from "./postfix-unary-expression-shape.xl.md"
import { PrefixUnaryExpressionShape } from "./prefix-unary-expression-shape.xl.md"
import { SatisfiesExpressionShape } from "./satisfies-expression-shape.xl.md"
import { TypeOfExpressionShape } from "./type-of-expression-shape.xl.md"
import { VoidExpressionShape } from "./void-expression-shape.xl.md"
```

# namespace cangjie

# class OperatorShapeMap

## static field KindBinary:string = "binary"

## static field KindAssignment:string = "assignment"

## static field KindPrefix:string = "prefix"

## static field KindPostfix:string = "postfix"

## static field KindUpdate:string = "update"

## static field KindConditionalQuestion:string = "conditional-question"

## static field KindConditionalColon:string = "conditional-colon"

## static field KindTypeAssert:string = "type-assert"

## static field PositionBinary:string = "binary"

## static field PositionPrefix:string = "prefix"

## static field PositionPostfix:string = "postfix"

## static field PositionTypeAssert:string = "type-assert"

## static method KindOf:(text:string)=>string

```ts
if (text === "?") {
  return OperatorShapeMap.KindConditionalQuestion;
}
if (text === ":") {
  return OperatorShapeMap.KindConditionalColon;
}
if (text === "as" || text === "satisfies") {
  return OperatorShapeMap.KindTypeAssert;
}
if (OperatorTable.IsAssignmentOperator(text)) {
  return OperatorShapeMap.KindAssignment;
}
if (text === "++" || text === "--") {
  return OperatorShapeMap.KindUpdate;
}
if (OperatorTable.IsBinaryOperator(text)) {
  return OperatorShapeMap.KindBinary;
}
if (OperatorTable.IsPrefixOperator(text)) {
  return OperatorShapeMap.KindPrefix;
}
return "";
```

## static method IsOperator:(text:string)=>bool

```ts
return OperatorShapeMap.KindOf(text).length > 0;
```

## static method IsBinary:(text:string)=>bool

```ts
return OperatorTable.IsBinaryOperator(text);
```

## static method IsAssignment:(text:string)=>bool

```ts
return OperatorTable.IsAssignmentOperator(text);
```

## static method IsPrefix:(text:string)=>bool

```ts
return OperatorTable.IsPrefixOperator(text);
```

## static method IsPostfix:(text:string)=>bool

```ts
return text === "++" || text === "--";
```

## static method IsConditional:(text:string)=>bool

```ts
return text === "?" || text === ":";
```

## static method IsTypeAssert:(text:string)=>bool

```ts
return text === "as" || text === "satisfies";
```

## static method PrecedenceOf:(text:string)=>int

```ts
if (OperatorTable.IsAssignmentOperator(text)) {
  return OperatorTable.AssignmentPrecedence;
}
return OperatorTable.Precedence(text);
```

## static method IsRightAssociative:(text:string)=>bool

```ts
return OperatorTable.AssociationOf(text) === "right";
```

## static method Create:(text:string, position:string, template:Template, start:int, end:int, context:SyntaxContext | null)=>Token

```ts
if (position === OperatorShapeMap.PositionPrefix) {
  return OperatorShapeMap.CreatePrefix(text, template);
}
if (position === OperatorShapeMap.PositionPostfix) {
  return OperatorShapeMap.CreatePostfix(text, template);
}
if (position === OperatorShapeMap.PositionTypeAssert) {
  return OperatorShapeMap.CreateTypeAssert(text, template);
}
if (position === OperatorShapeMap.PositionBinary) {
  return OperatorShapeMap.CreateBinary(text, template, start, end, context);
}
throw new Error("增量变量形状未支持：expression 运算符位置 " + position);
```

## private static method CreateBinary:(text:string, template:Template, start:int, end:int, context:SyntaxContext | null)=>Token

```ts
if (text === "*") {
  return OperatorShapeMap.FinishShape(new AsteriskTokenShape(template), start, end, context);
}
if (text === "/") {
  return OperatorShapeMap.FinishShape(new SlashTokenShape(template), start, end, context);
}
if (text === "%") {
  return OperatorShapeMap.FinishShape(new PercentTokenShape(template), start, end, context);
}
if (text === "+") {
  return OperatorShapeMap.FinishShape(new PlusTokenShape(template), start, end, context);
}
if (text === "-") {
  return OperatorShapeMap.FinishShape(new MinusTokenShape(template), start, end, context);
}
if (text === "**") {
  return OperatorShapeMap.FinishShape(new AsteriskAsteriskTokenShape(template), start, end, context);
}
if (text === "<<") {
  return OperatorShapeMap.FinishShape(new LessThanLessThanTokenShape(template), start, end, context);
}
if (text === ">>") {
  return OperatorShapeMap.FinishShape(new GreaterThanGreaterThanTokenShape(template), start, end, context);
}
if (text === ">>>") {
  return OperatorShapeMap.FinishShape(new GreaterThanGreaterThanGreaterThanTokenShape(template), start, end, context);
}
if (text === "<") {
  return OperatorShapeMap.FinishShape(new FirstBinaryOperatorShape(template), start, end, context);
}
if (text === ">") {
  return OperatorShapeMap.FinishShape(new GreaterThanTokenShape(template), start, end, context);
}
if (text === "<=") {
  return OperatorShapeMap.FinishShape(new LessThanEqualsTokenShape(template), start, end, context);
}
if (text === ">=") {
  return OperatorShapeMap.FinishShape(new GreaterThanEqualsTokenShape(template), start, end, context);
}
if (text === "instanceof") {
  return OperatorShapeMap.FinishShape(new InstanceOfKeywordShape(template), start, end, context);
}
if (text === "in") {
  return OperatorShapeMap.FinishShape(new InKeywordShape(template), start, end, context);
}
if (text === "==") {
  return OperatorShapeMap.FinishShape(new EqualsEqualsTokenShape(template), start, end, context);
}
if (text === "!=") {
  return OperatorShapeMap.FinishShape(new ExclamationEqualsTokenShape(template), start, end, context);
}
if (text === "===") {
  return OperatorShapeMap.FinishShape(new EqualsEqualsEqualsTokenShape(template), start, end, context);
}
if (text === "!==") {
  return OperatorShapeMap.FinishShape(new ExclamationEqualsEqualsTokenShape(template), start, end, context);
}
if (text === "&") {
  return OperatorShapeMap.FinishShape(new AmpersandTokenShape(template), start, end, context);
}
if (text === "^") {
  return OperatorShapeMap.FinishShape(new CaretTokenShape(template), start, end, context);
}
if (text === "|") {
  return OperatorShapeMap.FinishShape(new BarTokenShape(template), start, end, context);
}
if (text === "&&") {
  return OperatorShapeMap.FinishShape(new AmpersandAmpersandTokenShape(template), start, end, context);
}
if (text === "||") {
  return OperatorShapeMap.FinishShape(new BarBarTokenShape(template), start, end, context);
}
if (text === "??") {
  return OperatorShapeMap.FinishShape(new QuestionQuestionTokenShape(template), start, end, context);
}
if (text === "=") {
  return OperatorShapeMap.FinishShape(new EqualsTokenShape(template), start, end, context);
}
if (text === "+=") {
  return OperatorShapeMap.FinishShape(new PlusEqualsTokenShape(template), start, end, context);
}
if (text === "-=") {
  return OperatorShapeMap.FinishShape(new MinusEqualsTokenShape(template), start, end, context);
}
if (text === "*=") {
  return OperatorShapeMap.FinishShape(new AsteriskEqualsTokenShape(template), start, end, context);
}
if (text === "/=") {
  return OperatorShapeMap.FinishShape(new SlashEqualsTokenShape(template), start, end, context);
}
if (text === "%=") {
  return OperatorShapeMap.FinishShape(new PercentEqualsTokenShape(template), start, end, context);
}
if (text === "**=") {
  return OperatorShapeMap.FinishShape(new AsteriskAsteriskEqualsTokenShape(template), start, end, context);
}
if (text === "<<=") {
  return OperatorShapeMap.FinishShape(new LessThanLessThanEqualsTokenShape(template), start, end, context);
}
if (text === ">>=") {
  return OperatorShapeMap.FinishShape(new GreaterThanGreaterThanEqualsTokenShape(template), start, end, context);
}
if (text === ">>>=") {
  return OperatorShapeMap.FinishShape(new GreaterThanGreaterThanGreaterThanEqualsTokenShape(template), start, end, context);
}
if (text === "&=") {
  return OperatorShapeMap.FinishShape(new AmpersandEqualsTokenShape(template), start, end, context);
}
if (text === "^=") {
  return OperatorShapeMap.FinishShape(new CaretEqualsTokenShape(template), start, end, context);
}
if (text === "|=") {
  return OperatorShapeMap.FinishShape(new BarEqualsTokenShape(template), start, end, context);
}
if (text === "&&=") {
  return OperatorShapeMap.FinishShape(new AmpersandAmpersandEqualsTokenShape(template), start, end, context);
}
if (text === "||=") {
  return OperatorShapeMap.FinishShape(new BarBarEqualsTokenShape(template), start, end, context);
}
if (text === "??=") {
  return OperatorShapeMap.FinishShape(new QuestionQuestionEqualsTokenShape(template), start, end, context);
}
if (text === "?") {
  return OperatorShapeMap.FinishShape(new QuestionTokenShape(template), start, end, context);
}
if (text === ":") {
  return OperatorShapeMap.FinishShape(new ColonTokenShape(template), start, end, context);
}
throw new Error("增量变量形状未支持：expression 运算符 " + text);
```

## private static method CreatePrefix:(text:string, template:Template)=>Token

```ts
if (text === "typeof") {
  return new TypeOfExpressionShape(template);
}
if (text === "void") {
  return new VoidExpressionShape(template);
}
if (text === "delete") {
  return new DeleteExpressionShape(template);
}
if (OperatorTable.IsPrefixOperator(text)) {
  return new PrefixUnaryExpressionShape(template);
}
throw new Error("增量变量形状未支持：expression 前缀运算符 " + text);
```

## private static method CreatePostfix:(text:string, template:Template)=>Token

```ts
if (text === "++" || text === "--") {
  return new PostfixUnaryExpressionShape(template);
}
throw new Error("增量变量形状未支持：expression 后缀运算符 " + text);
```

## private static method CreateTypeAssert:(text:string, template:Template)=>Token

```ts
if (text === "as") {
  return new AsExpressionShape(template);
}
if (text === "satisfies") {
  return new SatisfiesExpressionShape(template);
}
throw new Error("增量变量形状未支持：expression 类型断言 " + text);
```

## private static method FinishShape:(shape:Token, start:int, end:int, context:SyntaxContext | null)=>Token

```ts
if (start >= 0) {
  shape.SignIn(start);
}
if (end >= 0) {
  shape.SignOut(end);
}
if (context !== null && shape.SourceRange.Start >= 0 && shape.SourceRange.End >= 0) {
  shape.TryToClose(context);
}
return shape;
```
