# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { BinaryExpressionShape } from "../expressions/binary-expression-shape.xl.md"
import { AsExpressionShape } from "../expressions/as-expression-shape.xl.md"
import { SatisfiesExpressionShape } from "../expressions/satisfies-expression-shape.xl.md"
import { OperatorTable } from "../expressions/operator-table.xl.md"
import { CallExpressionShape } from "../expressions/call-expression-shape.xl.md"
import { ConditionalExpressionShape } from "../expressions/conditional-expression-shape.xl.md"
import { PostfixUnaryExpressionShape } from "../expressions/postfix-unary-expression-shape.xl.md"
import { ElementAccessExpressionShape } from "../expressions/element-access-expression-shape.xl.md"
import { PropertyAccessExpressionShape } from "../expressions/property-access-expression-shape.xl.md"
import { DeleteExpressionShape } from "../expressions/delete-expression-shape.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
import { ParenthesizedExpressionShape } from "../expressions/parenthesized-expression-shape.xl.md"
import { PrefixUnaryExpressionShape } from "../expressions/prefix-unary-expression-shape.xl.md"
import { NonNullExpressionShape } from "../expressions/non-null-expression-shape.xl.md"
import { TypeOfExpressionShape } from "../expressions/type-of-expression-shape.xl.md"
import { VoidExpressionShape } from "../expressions/void-expression-shape.xl.md"
import { AsyncKeywordShape } from "../keywords/async-keyword-shape.xl.md"
import { FalseKeywordShape } from "../keywords/false-keyword-shape.xl.md"
import { NullKeywordShape } from "../keywords/null-keyword-shape.xl.md"
import { ThisKeywordShape } from "../keywords/this-keyword-shape.xl.md"
import { SuperKeywordShape } from "../keywords/super-keyword-shape.xl.md"
import { TrueKeywordShape } from "../keywords/true-keyword-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { PrivateIdentifierShape } from "../names/private-identifier-shape.xl.md"
import { MetaPropertyShape } from "../expressions/meta-property-shape.xl.md"
import { TaggedTemplateExpressionShape } from "../expressions/tagged-template-expression-shape.xl.md"
import { ImportKeywordShape } from "../keywords/import-keyword-shape.xl.md"
import { BigIntLiteralShape } from "../literals/big-int-literal-shape.xl.md"
import { NumericLiteralShape } from "../literals/numeric-literal-shape.xl.md"
import { RegularExpressionLiteralShape } from "../literals/regular-expression-literal-shape.xl.md"
import { StringLiteralShape } from "../literals/string-literal-shape.xl.md"
import { RegexToken } from "../../../core/syntax/basic-tokens/regex-token.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { StatementOperandShape } from "./statement-operator-body.xl.md"
import { StatementOperatorBody } from "./statement-operator-body.xl.md"
```

# namespace cangjie

# class StatementShapeAst

## static field TotalShapeAst:int = 0

## static field TotalDeclined:int = 0

## static field LastDeclineReason:string = ""

## static method Decline:(reason:string)=>Token | null

```ts
StatementShapeAst.TotalDeclined++;
StatementShapeAst.LastDeclineReason = reason;
return null;
```

## static method Build:(body:StatementOperatorBody, units:Array<Token>, basePos:int, template:Template, context:SyntaxContext)=>Token | null

```ts
if (body.Root === null || body.Root.Data.length !== 1) {
  return StatementShapeAst.Decline("表达式体没有唯一的根节点");
}
if (body.Incomplete || !body.IsComplete()) {
  return StatementShapeAst.Decline("表达式体不完整（" + body.Reason + "）");
}
const builder = new ExpressionBuilder(template, context);
builder.Load(units, basePos);
if (builder.Units.length === 0) {
  return StatementShapeAst.Decline("表达式没有代码单元");
}
const covered:Array<number> = [];
const value = StatementShapeAst.BuildNode(body.Root.Data[0], builder, context, covered);
if (value === null) {
  return null;
}
if (!StatementShapeAst.Covers(covered, builder.Units.length)) {
  return StatementShapeAst.Decline("形状树没有覆盖整段表达式单元");
}
StatementShapeAst.TotalShapeAst++;
return value;
```

## static method Covers:(covered:Array<int>, expected:int)=>bool

```ts
if (covered.length !== expected) {
  return false;
}
for (let at = 0; at < covered.length; at++) {
  if (covered[at] !== at) {
    return false;
  }
}
return true;
```

## static method BuildNode:(node:Token, builder:ExpressionBuilder, context:SyntaxContext, covered:Array<int>)=>Token | null

```ts
if (!(node instanceof StatementOperandShape)) {
  return StatementShapeAst.Decline("形状节点不是操作数形状");
}
const shape = node as StatementOperandShape;
if (shape.Kind === StatementOperandShape.KindIdentifier || shape.Kind === StatementOperandShape.KindNumber) {
  const raw = shape.Raw;
  if (raw === null || !(raw instanceof Common)) {
    return StatementShapeAst.Decline("叶子没有 raw 单元");
  }
  const index = builder.Units.indexOf(raw);
  if (index < 0) {
    return StatementShapeAst.Decline("叶子单元不在表达式里");
  }
  covered.push(index);
  if (shape.Kind === StatementOperandShape.KindNumber) {
    if ((raw as Common).IsBigInt()) {
      const bigint = BigIntLiteralShape.FromBasicToken(raw as Common, context);
      bigint.Pos = builder.Positions[index];
      return bigint;
    }
    if (!(raw as Common).IsNumber()) {
      return StatementShapeAst.Decline("不是数字字面量");
    }
    const numeric = NumericLiteralShape.FromBasicToken(raw as Common, context);
    numeric.Pos = builder.Positions[index];
    return numeric;
  }
  const identifier = IdentifierShape.FromBasicToken(raw as Common, context);
  identifier.Pos = builder.Positions[index];
  return identifier;
}
if (shape.Kind === StatementOperandShape.KindString
  || shape.Kind === StatementOperandShape.KindTemplate
  || shape.Kind === StatementOperandShape.KindRegex) {
  const raw = shape.Raw;
  if (raw === null) {
    return StatementShapeAst.Decline("字面量叶子没有 raw 单元");
  }
  const index = builder.Units.indexOf(raw);
  if (index < 0) {
    return StatementShapeAst.Decline("字面量单元不在表达式里");
  }
  covered.push(index);
  if (shape.Kind === StatementOperandShape.KindString) {
    if (!(raw instanceof String)) {
      return StatementShapeAst.Decline("字符串叶子不是 String 单元");
    }
    const literal = StringLiteralShape.FromBasicToken(raw as String, context);
    literal.Pos = builder.Positions[index];
    return literal;
  }
  if (shape.Kind === StatementOperandShape.KindTemplate) {
    if (!(raw instanceof String)) {
      return StatementShapeAst.Decline("模板叶子不是 String 单元");
    }
    const savedAt = builder.At;
    builder.At = index;
    const templateLiteral = builder.ParseTemplateToken();
    builder.At = savedAt;
    return templateLiteral;
  }
  if (!(raw instanceof RegexToken)) {
    return StatementShapeAst.Decline("正则叶子不是 RegexToken");
  }
  const regex = RegularExpressionLiteralShape.FromBasicToken(raw as RegexToken, context);
  regex.Pos = builder.Positions[index];
  return regex;
}
if (shape.Kind === StatementOperandShape.KindArray) {
  const raw = shape.Raw;
  if (raw === null || !(raw instanceof Bracket)) {
    return StatementShapeAst.Decline("数组字面量没有括号单元");
  }
  const bracket = raw as Bracket;
  if (bracket.StartBracketChar !== "[") {
    return StatementShapeAst.Decline("数组字面量不是方括号");
  }
  const index = builder.Units.indexOf(bracket);
  if (index < 0) {
    return StatementShapeAst.Decline("数组字面量单元不在表达式里");
  }
  covered.push(index);
  return builder.ParseArrayLiteral(bracket, index);
}
if (shape.Kind === StatementOperandShape.KindImportKeyword) {
  // 动态 `import(` 的 `import` 关键字叶子：与 legacy `MakeKeywordLeaf(new ImportKeywordShape(...))` 同口径。
  const raw = shape.Raw;
  if (raw === null || !(raw instanceof Common) || !(raw as Common).Is("import")) {
    return StatementShapeAst.Decline("import 关键字没有 raw 单元");
  }
  const index = builder.Units.indexOf(raw);
  if (index < 0) {
    return StatementShapeAst.Decline("import 关键字不在表达式里");
  }
  covered.push(index);
  return builder.SpanLeaf(new ImportKeywordShape(builder.Template), index);
}
if (shape.Kind === StatementOperandShape.KindMember) {
  if (shape.Data.length !== 2) {
    return StatementShapeAst.Decline("成员访问不是两个子节点");
  }
  if (shape.Data[0] instanceof StatementOperandShape
    && (shape.Data[0] as StatementOperandShape).Kind === StatementOperandShape.KindImportKeyword) {
    // `import.meta`：legacy `ExpressionBuilder.ParsePrimary` 的 import 分支建 `MetaPropertyShape`，
    // children 只有名字 `meta`（`import` 与 `.` 只进区间）。形状层把 `import` 建关键字叶子、由成员后缀
    // 接上 `meta`，所以这一格要改写回 MetaProperty，而不是普通成员访问；名字不是 `meta` 一律退回 legacy。
    const importRaw = (shape.Data[0] as StatementOperandShape).Raw;
    const dotRaw = shape.Raw;
    if (importRaw === null || dotRaw === null) {
      return StatementShapeAst.Decline("import.meta 缺少单元");
    }
    const importIndex = builder.Units.indexOf(importRaw);
    const dotIndex = builder.Units.indexOf(dotRaw);
    if (importIndex < 0 || dotIndex < 0) {
      return StatementShapeAst.Decline("import.meta 单元不在表达式里");
    }
    let nameIndex = dotIndex + 1;
    while (nameIndex < builder.Units.length && builder.Units[nameIndex].IsTriviaToken) {
      nameIndex++;
    }
    if (nameIndex >= builder.Units.length || !(builder.Units[nameIndex] instanceof Common)
      || !(builder.Units[nameIndex] as Common).Is("meta")) {
      return StatementShapeAst.Decline("import.meta 的名字不是 meta");
    }
    covered.push(importIndex);
    covered.push(dotIndex);
    covered.push(nameIndex);
    const metaProperty = new MetaPropertyShape(builder.Template);
    const identifier = IdentifierShape.FromBasicToken(builder.Units[nameIndex] as Common, context);
    identifier.Pos = builder.Positions[nameIndex];
    metaProperty.Add(identifier);
    return builder.SpanNode(metaProperty, importIndex, nameIndex);
  }
  const at = covered.length;
  const object = StatementShapeAst.BuildNode(shape.Data[0], builder, context, covered);
  if (object === null) {
    return null;
  }
  const firstIndex = covered[at];
  const dotRaw = shape.Raw;
  if (dotRaw === null) {
    return StatementShapeAst.Decline("成员访问没有点号单元");
  }
  const dotIndex = builder.Units.indexOf(dotRaw);
  if (dotIndex < 0) {
    return StatementShapeAst.Decline("成员点号不在表达式里");
  }
  covered.push(dotIndex);
  const nameShape = StatementShapeAst.BuildNode(shape.Data[1], builder, context, covered);
  if (nameShape === null) {
    return null;
  }
  const access = new PropertyAccessExpressionShape(builder.Template);
  access.Add(object);
  access.Add(nameShape);
  return builder.SpanNode(access, firstIndex, covered[covered.length - 1]);
}
if (shape.Kind === StatementOperandShape.KindCall) {
  if (shape.Data.length !== 1) {
    return StatementShapeAst.Decline("调用节点不是单个被调用者");
  }
  const raw = shape.Raw;
  if (raw === null || !(raw instanceof Bracket)) {
    return StatementShapeAst.Decline("调用节点没有实参括号");
  }
  const bracket = raw as Bracket;
  if (bracket.StartBracketChar !== "(") {
    return StatementShapeAst.Decline("调用实参不是圆括号");
  }
  const at = covered.length;
  const callee = StatementShapeAst.BuildNode(shape.Data[0], builder, context, covered);
  if (callee === null) {
    return null;
  }
  const firstIndex = covered[at];
  const bracketIndex = builder.Units.indexOf(bracket);
  if (bracketIndex < 0) {
    return StatementShapeAst.Decline("调用括号不在表达式里");
  }
  covered.push(bracketIndex);
  const call = new CallExpressionShape(builder.Template);
  call.Add(callee);
  const args = builder.ParseBracketArguments(bracket);
  for (const arg of args) {
    call.Add(arg);
  }
  return builder.SpanNode(call, firstIndex, bracketIndex);
}
if (shape.Kind === StatementOperandShape.KindIndex) {
  if (shape.Data.length !== 2) {
    return StatementShapeAst.Decline("索引不是两个子节点");
  }
  const raw = shape.Raw;
  if (raw === null || !(raw instanceof Bracket)) {
    return StatementShapeAst.Decline("索引节点没有方括号");
  }
  const bracket = raw as Bracket;
  if (bracket.StartBracketChar !== "[") {
    return StatementShapeAst.Decline("索引不是方括号");
  }
  const at = covered.length;
  const object = StatementShapeAst.BuildNode(shape.Data[0], builder, context, covered);
  if (object === null) {
    return null;
  }
  const firstIndex = covered[at];
  const bracketIndex = builder.Units.indexOf(bracket);
  if (bracketIndex < 0) {
    return StatementShapeAst.Decline("索引括号不在表达式里");
  }
  covered.push(bracketIndex);
  const inner = new ExpressionBuilder(builder.Template, context);
  let base = 0;
  if (bracket.SourceRange.StartIndex >= 0) {
    base = bracket.SourceRange.StartIndex + 1;
  }
  inner.Load(bracket.Data, base);
  if (inner.Units.length === 0) {
    return StatementShapeAst.Decline("索引里没有单元");
  }
  const innerCovered:Array<number> = [];
  const value = StatementShapeAst.BuildNode(shape.Data[1], inner, context, innerCovered);
  if (value === null) {
    return null;
  }
  if (!StatementShapeAst.Covers(innerCovered, inner.Units.length)) {
    return StatementShapeAst.Decline("索引内的形状树没有覆盖整段单元");
  }
  const access = new ElementAccessExpressionShape(builder.Template);
  access.Add(object);
  access.Add(value);
  return builder.SpanNode(access, firstIndex, bracketIndex);
}
if (shape.Kind === StatementOperandShape.KindParen) {
  const raw = shape.Raw;
  if (raw === null || !(raw instanceof Bracket)) {
    return StatementShapeAst.Decline("括号节点没有括号单元");
  }
  const bracket = raw as Bracket;
  if (bracket.StartBracketChar !== "(") {
    return StatementShapeAst.Decline("括号单元不是圆括号");
  }
  if (shape.Data.length !== 1) {
    return StatementShapeAst.Decline("括号节点不是单操作数");
  }
  const inner = new ExpressionBuilder(builder.Template, context);
  let base = 0;
  if (bracket.SourceRange.StartIndex >= 0) {
    base = bracket.SourceRange.StartIndex + 1;
  }
  inner.Load(bracket.Data, base);
  if (inner.Units.length === 0) {
    return StatementShapeAst.Decline("括号内没有单元");
  }
  const innerCovered:Array<number> = [];
  const value = StatementShapeAst.BuildNode(shape.Data[0], inner, context, innerCovered);
  if (value === null) {
    return null;
  }
  if (!StatementShapeAst.Covers(innerCovered, inner.Units.length)) {
    return StatementShapeAst.Decline("括号内的形状树没有覆盖整段单元");
  }
  const index = builder.Units.indexOf(bracket);
  if (index < 0) {
    return StatementShapeAst.Decline("括号单元不在表达式里");
  }
  covered.push(index);
  const paren = new ParenthesizedExpressionShape(builder.Template);
  paren.Add(value);
  return builder.SpanNode(paren, index, index);
}
if (shape.Kind === StatementOperandShape.KindOperator) {
  const raw = shape.Raw;
  if (raw === null) {
    return StatementShapeAst.Decline("二元节点没有运算符单元");
  }
  if (shape.Data.length !== 2) {
    return StatementShapeAst.Decline("二元节点不是两个操作数");
  }
  const coveredAtStart = covered.length;
  const left = StatementShapeAst.BuildNode(shape.Data[0], builder, context, covered);
  if (left === null) {
    return null;
  }
  const firstIndex = covered[coveredAtStart];
  const opIndex = builder.Units.indexOf(raw);
  if (opIndex < 0) {
    return StatementShapeAst.Decline("运算符单元不在表达式里");
  }
  covered.push(opIndex);
  const right = StatementShapeAst.BuildNode(shape.Data[1], builder, context, covered);
  if (right === null) {
    return null;
  }
  const lastIndex = covered[covered.length - 1];
  const binary = new BinaryExpressionShape(builder.Template);
  binary.Add(left);
  binary.Add(builder.MakeOperatorToken(raw, opIndex));
  binary.Add(right);
  return builder.SpanNode(binary, firstIndex, lastIndex);
}
if (shape.Kind === StatementOperandShape.KindKeyword) {
  const raw = shape.Raw;
  if (raw === null || !(raw instanceof Common)) {
    return StatementShapeAst.Decline("关键字叶子没有 raw 单元");
  }
  const index = builder.Units.indexOf(raw);
  if (index < 0) {
    return StatementShapeAst.Decline("关键字叶子不在表达式里");
  }
  covered.push(index);
  const keywordText = (raw as Common).TempToString();
  if (keywordText === "true") {
    return builder.SpanLeaf(new TrueKeywordShape(builder.Template), index);
  }
  if (keywordText === "false") {
    return builder.SpanLeaf(new FalseKeywordShape(builder.Template), index);
  }
  if (keywordText === "null") {
    return builder.SpanLeaf(new NullKeywordShape(builder.Template), index);
  }
  if (keywordText === "this") {
    return builder.SpanLeaf(new ThisKeywordShape(builder.Template), index);
  }
  if (keywordText === "super") {
    // Stage 5d-7：`super` 与 legacy `ParsePrimary` 的 super 分支同一工厂（`SuperKeywordShape` + `MakeKeywordLeaf`）。
    return builder.MakeKeywordLeaf(new SuperKeywordShape(builder.Template), index);
  }
  return StatementShapeAst.Decline("不认识的关键字叶子 " + keywordText);
}
if (shape.Kind === StatementOperandShape.KindPrefix) {
  const raw = shape.Raw;
  if (raw === null) {
    return StatementShapeAst.Decline("前缀节点没有运算符单元");
  }
  if (shape.Data.length !== 1) {
    return StatementShapeAst.Decline("前缀节点不是单操作数");
  }
  const opIndex = builder.Units.indexOf(raw);
  if (opIndex < 0) {
    return StatementShapeAst.Decline("前缀运算符单元不在表达式里");
  }
  covered.push(opIndex);
  const operand = StatementShapeAst.BuildNode(shape.Data[0], builder, context, covered);
  if (operand === null) {
    return null;
  }
  const lastIndex = covered[covered.length - 1];
  const prefixText = StatementOperatorBody.TextOfToken(raw);
  let prefix:ShapeToken;
  if (prefixText === "typeof") {
    prefix = new TypeOfExpressionShape(builder.Template);
  } else if (prefixText === "void") {
    prefix = new VoidExpressionShape(builder.Template);
  } else if (prefixText === "delete") {
    prefix = new DeleteExpressionShape(builder.Template);
  } else {
    prefix = new PrefixUnaryExpressionShape(builder.Template);
  }
  prefix.Add(operand);
  return builder.SpanNode(prefix, opIndex, lastIndex);
}
if (shape.Kind === StatementOperandShape.KindObject) {
  const raw = shape.Raw;
  if (raw === null || !(raw instanceof Bracket)) {
    return StatementShapeAst.Decline("对象字面量没有括号单元");
  }
  const bracket = raw as Bracket;
  if (bracket.StartBracketChar !== "{") {
    return StatementShapeAst.Decline("对象字面量不是花括号");
  }
  const index = builder.Units.indexOf(bracket);
  if (index < 0) {
    return StatementShapeAst.Decline("对象字面量单元不在表达式里");
  }
  covered.push(index);
  return builder.ParseObjectLiteral(bracket, index);
}
if (shape.Kind === StatementOperandShape.KindNew) {
  const raw = shape.Raw;
  if (raw === null) {
    return StatementShapeAst.Decline("new 没有关键字单元");
  }
  const newIndex = builder.Units.indexOf(raw);
  if (newIndex < 0) {
    return StatementShapeAst.Decline("new 关键字不在表达式里");
  }
  if (shape.Data.length !== 1) {
    return StatementShapeAst.Decline("new 不是单个被构造者");
  }
  const savedAt = builder.At;
  builder.At = newIndex;
  let value:Token | null = null;
  try {
    value = builder.ParseNew();
  } catch (error) {
    builder.At = savedAt;
    return StatementShapeAst.Decline("new 表达式交给 legacy 解析失败");
  }
  const after = builder.At;
  builder.At = savedAt;
  if (after <= newIndex) {
    return StatementShapeAst.Decline("new 表达式没有消费单元");
  }
  for (let at = newIndex; at < after; at++) {
    covered.push(at);
  }
  return value;
}
if (shape.Kind === StatementOperandShape.KindOptionalMember) {
  if (shape.Data.length !== 2) {
    return StatementShapeAst.Decline("可选成员访问不是两个子节点");
  }
  const dotRaw = shape.Raw;
  if (dotRaw === null) {
    return StatementShapeAst.Decline("可选成员没有 ?. 单元");
  }
  const at = covered.length;
  const object = StatementShapeAst.BuildNode(shape.Data[0], builder, context, covered);
  if (object === null) {
    return null;
  }
  const firstIndex = covered[at];
  const dotIndex = builder.Units.indexOf(dotRaw);
  if (dotIndex < 0) {
    return StatementShapeAst.Decline("?. 单元不在表达式里");
  }
  covered.push(dotIndex);
  const name = StatementShapeAst.BuildNode(shape.Data[1], builder, context, covered);
  if (name === null) {
    return null;
  }
  const access = new PropertyAccessExpressionShape(builder.Template);
  access.Add(object);
  access.Add(builder.MakeOperatorToken(dotRaw, dotIndex));
  access.Add(name);
  return builder.SpanNode(access, firstIndex, covered[covered.length - 1]);
}
if (shape.Kind === StatementOperandShape.KindOptionalCall) {
  if (shape.Data.length !== 1) {
    return StatementShapeAst.Decline("可选调用不是单个被调用者");
  }
  const dotRaw = shape.Raw;
  const rawArgs = shape.Args;
  if (dotRaw === null || rawArgs === null || !(rawArgs instanceof Bracket)) {
    return StatementShapeAst.Decline("可选调用缺少 ?. 或实参括号");
  }
  const bracket = rawArgs as Bracket;
  if (bracket.StartBracketChar !== "(") {
    return StatementShapeAst.Decline("可选调用实参不是圆括号");
  }
  const at = covered.length;
  const callee = StatementShapeAst.BuildNode(shape.Data[0], builder, context, covered);
  if (callee === null) {
    return null;
  }
  const firstIndex = covered[at];
  const dotIndex = builder.Units.indexOf(dotRaw);
  if (dotIndex < 0) {
    return StatementShapeAst.Decline("?. 单元不在表达式里");
  }
  covered.push(dotIndex);
  const bracketIndex = builder.Units.indexOf(bracket);
  if (bracketIndex < 0) {
    return StatementShapeAst.Decline("可选调用括号不在表达式里");
  }
  covered.push(bracketIndex);
  const call = new CallExpressionShape(builder.Template);
  call.Add(callee);
  call.Add(builder.MakeOperatorToken(dotRaw, dotIndex));
  const args = builder.ParseBracketArguments(bracket);
  for (const arg of args) {
    call.Add(arg);
  }
  return builder.SpanNode(call, firstIndex, bracketIndex);
}
if (shape.Kind === StatementOperandShape.KindOptionalIndex) {
  if (shape.Data.length !== 2) {
    return StatementShapeAst.Decline("可选索引不是两个子节点");
  }
  const dotRaw = shape.Raw;
  const rawArgs = shape.Args;
  if (dotRaw === null || rawArgs === null || !(rawArgs instanceof Bracket)) {
    return StatementShapeAst.Decline("可选索引缺少 ?. 或方括号");
  }
  const bracket = rawArgs as Bracket;
  if (bracket.StartBracketChar !== "[") {
    return StatementShapeAst.Decline("可选索引不是方括号");
  }
  const at = covered.length;
  const object = StatementShapeAst.BuildNode(shape.Data[0], builder, context, covered);
  if (object === null) {
    return null;
  }
  const firstIndex = covered[at];
  const dotIndex = builder.Units.indexOf(dotRaw);
  if (dotIndex < 0) {
    return StatementShapeAst.Decline("?. 单元不在表达式里");
  }
  covered.push(dotIndex);
  const bracketIndex = builder.Units.indexOf(bracket);
  if (bracketIndex < 0) {
    return StatementShapeAst.Decline("可选索引括号不在表达式里");
  }
  covered.push(bracketIndex);
  const inner = new ExpressionBuilder(builder.Template, context);
  let base = 0;
  if (bracket.SourceRange.StartIndex >= 0) {
    base = bracket.SourceRange.StartIndex + 1;
  }
  inner.Load(bracket.Data, base);
  if (inner.Units.length === 0) {
    return StatementShapeAst.Decline("可选索引里没有单元");
  }
  const innerCovered:Array<number> = [];
  const value = StatementShapeAst.BuildNode(shape.Data[1], inner, context, innerCovered);
  if (value === null) {
    return null;
  }
  if (!StatementShapeAst.Covers(innerCovered, inner.Units.length)) {
    return StatementShapeAst.Decline("可选索引内的形状树没有覆盖整段单元");
  }
  const access = new ElementAccessExpressionShape(builder.Template);
  access.Add(object);
  access.Add(builder.MakeOperatorToken(dotRaw, dotIndex));
  access.Add(value);
  return builder.SpanNode(access, firstIndex, bracketIndex);
}
if (shape.Kind === StatementOperandShape.KindConditional) {
  if (shape.Data.length !== 3) {
    return StatementShapeAst.Decline("条件表达式不是三个子节点");
  }
  const questionRaw = shape.Raw;
  const colonRaw = shape.Colon;
  if (questionRaw === null || colonRaw === null) {
    return StatementShapeAst.Decline("条件表达式缺少 ? 或 : 单元");
  }
  const at = covered.length;
  const condition = StatementShapeAst.BuildNode(shape.Data[0], builder, context, covered);
  if (condition === null) {
    return null;
  }
  const firstIndex = covered[at];
  const questionIndex = builder.Units.indexOf(questionRaw);
  if (questionIndex < 0) {
    return StatementShapeAst.Decline("? 单元不在表达式里");
  }
  covered.push(questionIndex);
  const whenTrue = StatementShapeAst.BuildNode(shape.Data[1], builder, context, covered);
  if (whenTrue === null) {
    return null;
  }
  const colonIndex = builder.Units.indexOf(colonRaw);
  if (colonIndex < 0) {
    return StatementShapeAst.Decline(": 单元不在表达式里");
  }
  covered.push(colonIndex);
  const whenFalse = StatementShapeAst.BuildNode(shape.Data[2], builder, context, covered);
  if (whenFalse === null) {
    return null;
  }
  const conditional = new ConditionalExpressionShape(builder.Template);
  conditional.Add(condition);
  conditional.Add(builder.MakeOperatorToken(questionRaw, questionIndex));
  conditional.Add(whenTrue);
  conditional.Add(builder.MakeOperatorToken(colonRaw, colonIndex));
  conditional.Add(whenFalse);
  return builder.SpanNode(conditional, firstIndex, covered[covered.length - 1]);
}
if (shape.Kind === StatementOperandShape.KindNonNull) {
  if (shape.Data.length !== 1) {
    return StatementShapeAst.Decline("非空断言不是单操作数");
  }
  const at = covered.length;
  const operand = StatementShapeAst.BuildNode(shape.Data[0], builder, context, covered);
  if (operand === null) {
    return null;
  }
  const firstIndex = covered[at];
  const opRaw = shape.Raw;
  if (opRaw === null) {
    return StatementShapeAst.Decline("非空断言没有 ! 单元");
  }
  const opIndex = builder.Units.indexOf(opRaw);
  if (opIndex < 0) {
    return StatementShapeAst.Decline("非空断言的 ! 单元不在表达式里");
  }
  covered.push(opIndex);
  const nonNull = new NonNullExpressionShape(builder.Template);
  nonNull.Add(operand);
  return builder.SpanNode(nonNull, firstIndex, opIndex);
}
if (shape.Kind === StatementOperandShape.KindPostfix) {
  if (shape.Data.length !== 1) {
    return StatementShapeAst.Decline("后缀节点不是单操作数");
  }
  const raw = shape.Raw;
  if (raw === null) {
    return StatementShapeAst.Decline("后缀节点没有运算符单元");
  }
  const at = covered.length;
  const operand = StatementShapeAst.BuildNode(shape.Data[0], builder, context, covered);
  if (operand === null) {
    return null;
  }
  const firstIndex = covered[at];
  const opIndex = builder.Units.indexOf(raw);
  if (opIndex < 0) {
    return StatementShapeAst.Decline("后缀运算符单元不在表达式里");
  }
  covered.push(opIndex);
  const postfix = new PostfixUnaryExpressionShape(builder.Template);
  postfix.Add(operand);
  return builder.SpanNode(postfix, firstIndex, opIndex);
}
if (shape.Kind === StatementOperandShape.KindTypeAssert) {
  // Stage 5d-7：类型断言（`a as T` / `a satisfies T`）。左边仍是形状树的节点；右边是**类型**，
  // 形状层没有类型节点，所以从 `as` 之后整段交给 legacy `ParseFollowingType`——与
  // `ExpressionBuilder.ParseBinary` 的 `IsTypeOperator` 分支同一个调用、同一批工厂
  // （`AsExpressionShape` / `SatisfiesExpressionShape`）、同一段区间口径（`SpanNode(左首单元, 类型末单元)`）。
  //
  // **安全条件**：类型必须**恰好**吃到本形状节点声明的最后一个单元（`claimedLast + 1`，Stage 5d-8b）。
  // 原先要求吃到**整条语句末尾**，而 `a as T + b` / `a ? b as T : c` 的 `+ b` / `: c` 属于外层节点，
  // 于是那种形态一律判死。现在形状层在「类型之后不可能再是类型」的那一格收口（`EndsTypeTail`），
  // 本节点声明到类型末单元为止；只要 legacy 的 `ParseFollowingType` 消费长度与它一致就接管，
  // 不一致（类型比形状层以为的长 / 短）仍然判否、整条回 legacy，绝不建出「只吃了一半源码」的树。
  // 链式断言（`a as T as U`）在循环里逐层包，与 legacy 的左结合一致。
  if (shape.Data.length !== 1) {
    return StatementShapeAst.Decline("类型断言不是单操作数");
  }
  const raw = shape.Raw;
  if (raw === null || !(raw instanceof Common)) {
    return StatementShapeAst.Decline("类型断言没有 as / satisfies 单元");
  }
  const index = builder.Units.indexOf(raw);
  if (index < 0) {
    return StatementShapeAst.Decline("类型断言的运算符单元不在表达式里");
  }
  const at = covered.length;
  const operand = StatementShapeAst.BuildNode(shape.Data[0], builder, context, covered);
  if (operand === null) {
    return null;
  }
  const firstIndex = covered[at];
  // 本节点声明的**类型区域末单元**：形状层吞类型时逐格记下的最后一格（`StatementOperandShape.TailEnd`）。
  // 没有它就无从知道「本节点到哪结束」——类型区域不进 `Data`，而如果退回「必须吃到语句末尾」，
  // `a as T + b` / `a ? b as T : c` 这类「类型之后还有表达式」就永远接管不了。
  const tailEnd = shape.TailEnd;
  if (tailEnd === null) {
    return StatementShapeAst.Decline("类型断言没有类型单元");
  }
  const tailIndex = builder.Units.indexOf(tailEnd);
  if (tailIndex < 0) {
    return StatementShapeAst.Decline("类型断言的类型单元不在表达式里");
  }
  const savedAt = builder.At;
  builder.At = index;
  let value:Token = operand;
  let lastIndex = index - 1;
  try {
    while (builder.At < builder.Units.length) {
      const operatorUnit = builder.Units[builder.At];
      if (!(operatorUnit instanceof Common)
        || !OperatorTable.IsAsOperator((operatorUnit as Common).TempToString())) {
        break;
      }
      const operatorText = (operatorUnit as Common).TempToString();
      builder.At++;
      const type = builder.ParseFollowingType();
      let assertShape:ShapeToken;
      if (operatorText === "as") {
        assertShape = new AsExpressionShape(builder.Template);
      } else {
        assertShape = new SatisfiesExpressionShape(builder.Template);
      }
      assertShape.Add(value);
      assertShape.Add(type);
      value = builder.SpanNode(assertShape, firstIndex, builder.At - 1);
      lastIndex = builder.At - 1;
    }
  } catch (error) {
    builder.At = savedAt;
    return StatementShapeAst.Decline("类型断言交给 legacy 类型解析失败");
  }
  const after = builder.At;
  builder.At = savedAt;
  if (lastIndex < index || after !== tailIndex + 1) {
    return StatementShapeAst.Decline("类型断言没有覆盖本节点的类型区域");
  }
  for (let cursor = index; cursor < after; cursor++) {
    covered.push(cursor);
  }
  return value;
}
if (shape.Kind === StatementOperandShape.KindPrivateName) {
  // Stage 5d-7：私有名（`this.#x` 的成员名 / `#x in obj` 的操作数）。token 层把它拆成 `#` + 名字两格，
  // `PrivateIdentifierShape` 把它们合成一个节点：`SignInToken(#)` + `SignOutToken(名字)` +
  // `Pos = Positions[#]`——与 `ExpressionBuilder.ParsePostfixSuffix` 的私有成员分支、
  // `ParsePrimary` 的私有名字分支逐字段同口径（children 为空：TS 的 PrivateIdentifier 不投影 text）。
  if (shape.Data.length !== 1) {
    return StatementShapeAst.Decline("私有名不是单个名字");
  }
  const hashRaw = shape.Raw;
  if (hashRaw === null) {
    return StatementShapeAst.Decline("私有名没有 # 单元");
  }
  const hashIndex = builder.Units.indexOf(hashRaw);
  if (hashIndex < 0) {
    return StatementShapeAst.Decline("私有名的 # 单元不在表达式里");
  }
  const nameShape = shape.Data[0];
  if (!(nameShape instanceof StatementOperandShape)) {
    return StatementShapeAst.Decline("私有名的名字不是形状节点");
  }
  const nameRaw = (nameShape as StatementOperandShape).Raw;
  if (nameRaw === null) {
    return StatementShapeAst.Decline("私有名的名字没有单元");
  }
  const nameIndex = builder.Units.indexOf(nameRaw);
  if (nameIndex < 0) {
    return StatementShapeAst.Decline("私有名的名字单元不在表达式里");
  }
  covered.push(hashIndex);
  covered.push(nameIndex);
  const privateShape = new PrivateIdentifierShape(builder.Template);
  privateShape.SignInToken(hashRaw);
  privateShape.SignOutToken(nameRaw);
  privateShape.Pos = builder.Positions[hashIndex];
  privateShape.TryToClose(context);
  return privateShape;
}
if (shape.Kind === StatementOperandShape.KindTypeArguments) {
  // Stage 5d-7：类型实参尾巴（`f<T>(a)` / `a<b>?.[0]` / `f<T>` / `a<b>\`t\``）。
  // 左边是形状树建好的表达式；`<` 之后（类型实参 + 调用 / 实例化 / `?.` 链）整段交给 legacy
  // `ExpressionBuilder.ParsePostfixSuffix`——那是这条文法的唯一实现（`CanStartTypeArgumentCall` /
  // `CanStartTypeArguments` / `ParseTypeArgumentsAtCurrent` 都在里面），所以节点与 legacy 逐字段同源。
  // 安全条件：它必须**恰好**吃到最后一个单元（`after === builder.Units.length`），否则判否、整条回 legacy。
  if (shape.Data.length !== 1) {
    return StatementShapeAst.Decline("类型实参尾巴不是单个左表达式");
  }
  const raw = shape.Raw;
  if (raw === null) {
    return StatementShapeAst.Decline("类型实参尾巴没有 < 单元");
  }
  const ltIndex = builder.Units.indexOf(raw);
  if (ltIndex < 0) {
    return StatementShapeAst.Decline("类型实参的 < 单元不在表达式里");
  }
  const at = covered.length;
  const left = StatementShapeAst.BuildNode(shape.Data[0], builder, context, covered);
  if (left === null) {
    return null;
  }
  const firstIndex = covered[at];
  const savedAt = builder.At;
  let value:Token | null = null;
  let after = ltIndex;
  builder.At = ltIndex;
  try {
    value = builder.ParsePostfixSuffix(left, firstIndex);
    // Stage 5d-8b：`ParsePostfixSuffix` 只管**后缀**，读到 `as` / `satisfies` / `instanceof` / `in` / `&&`
    // 就停（`a<b> as T`、`a<b> instanceof C`、`a<b> in c`）。这些运算符属于「类型实参尾巴之后」的表达式位，
    // 交给 `ParseExpressionFrom`——它是 `ParseExpression` 的「左操作数已建好」入口，走同一段赋值 / 条件 /
    // 二元 / 逗号逻辑（节点、`Pos`、区间同源）。它只在本条语句还剩单元时才调，读到的运算符仍必须
    // **恰好**吃到最后一个单元，否则下面判否、整条回 legacy。
    if (value !== null && builder.At < builder.Units.length) {
      value = builder.ParseExpressionFrom(value, firstIndex);
    }
    after = builder.At;
  } catch (error) {
    builder.At = savedAt;
    return StatementShapeAst.Decline("类型实参尾巴交给 legacy 解析失败");
  }
  builder.At = savedAt;
  if (value === null || after <= ltIndex || after !== builder.Units.length) {
    return StatementShapeAst.Decline("类型实参尾巴没有覆盖整段表达式单元");
  }
  for (let cursor = ltIndex; cursor < after; cursor++) {
    covered.push(cursor);
  }
  return value;
}
if (shape.Kind === StatementOperandShape.KindNewTarget) {
  // Stage 5d-7：`new.target`（`new` `.` `target` 三格）。整格交给 legacy `ExpressionBuilder.ParseNew()`——
  // 它对 `new` 之后紧跟 `. target` 本来就有专门分支（`MetaPropertyShape`，children 只有名字 `target`，
  // `new` 与 `.` 只进区间，`Pos` 取 `new` 的含前导 trivia 起点）。这里只按 legacy 的消费长度记覆盖，
  // 与 `KindNew` / `KindArrow` / `KindFunction` 的委派口径一致。
  if (shape.Data.length !== 1) {
    return StatementShapeAst.Decline("new.target 不是单个名字");
  }
  const raw = shape.Raw;
  const dotRaw = shape.Args;
  if (raw === null || dotRaw === null) {
    return StatementShapeAst.Decline("new.target 缺少 new 或点号单元");
  }
  const index = builder.Units.indexOf(raw);
  if (index < 0) {
    return StatementShapeAst.Decline("new 关键字不在表达式里");
  }
  const nameShape = shape.Data[0];
  if (!(nameShape instanceof StatementOperandShape) || (nameShape as StatementOperandShape).Text !== "target") {
    return StatementShapeAst.Decline("new 之后的成员名不是 target");
  }
  const savedAt = builder.At;
  builder.At = index;
  let value:Token | null = null;
  let after = index;
  try {
    value = builder.ParseNew();
    after = builder.At;
  } catch (error) {
    builder.At = savedAt;
    return StatementShapeAst.Decline("new.target 交给 legacy 解析失败");
  }
  builder.At = savedAt;
  if (value === null || after <= index) {
    return StatementShapeAst.Decline("new.target 没有消费单元");
  }
  for (let at = index; at < after; at++) {
    covered.push(at);
  }
  return value;
}
if (shape.Kind === StatementOperandShape.KindTaggedTemplate) {
  // Stage 5d-7：标签模板（`` tag`t` ``）。被标宿主（标签）本身仍是形状树的节点，所以它由上面的分支
  // 逐个建；模板单元这一格交给 legacy `ParseTemplateToken`（与 `KindTemplate` 同一工厂：无内插 →
  // `NoSubstitutionTemplateLiteralShape`，有内插 → `TemplateExpressionShape`，`Pos` 与区间由同一段代码定）。
  // 外层 `TaggedTemplateExpressionShape` 的 children 顺序（标签、模板）、`Pos`（标签的 `Pos`）与区间
  // （标签首单元 → 模板单元）与 `ExpressionBuilder.ParsePostfixSuffix` 的模板分支**逐字段同源**：
  // 那个分支就是 `shape.Add(tag)` + `shape.Add(template)` + `SignIn(tag.StartIndex)` + `SignOut(template.EndIndex)`，
  // 而 `SpanNode(firstIndex, index)` 做的是同一件事。
  if (shape.Data.length !== 1) {
    return StatementShapeAst.Decline("标签模板不是单个标签");
  }
  const raw = shape.Raw;
  if (raw === null || !(raw instanceof String)) {
    return StatementShapeAst.Decline("标签模板没有模板单元");
  }
  const index = builder.Units.indexOf(raw);
  if (index < 0) {
    return StatementShapeAst.Decline("模板单元不在表达式里");
  }
  const at = covered.length;
  const tag = StatementShapeAst.BuildNode(shape.Data[0], builder, context, covered);
  if (tag === null) {
    return null;
  }
  const firstIndex = covered[at];
  covered.push(index);
  const savedAt = builder.At;
  builder.At = index;
  const templateLiteral = builder.ParseTemplateToken();
  builder.At = savedAt;
  const tagged = new TaggedTemplateExpressionShape(builder.Template);
  tagged.Add(tag);
  tagged.Add(templateLiteral);
  return builder.SpanNode(tagged, firstIndex, index);
}
if (shape.Kind === StatementOperandShape.KindArrow) {
  // S3l：箭头函数整段交给 legacy。参数形态与体（表达式体 / 块体）由 `ParseAssign` 的箭头分支决定，
  // 所以 `ArrowFunctionShape` / `ParameterShape` / `EqualsGreaterThanToken` 的 children、`Pos` 与区间
  // 与 legacy `EnableShellExpressions=false` 逐字段同源。参数单元就是本节点的起点（标识符或括号）。
  if (shape.Data.length !== 1) {
    return StatementShapeAst.Decline("箭头函数不是单一参数");
  }
  const params = shape.Data[0];
  if (!(params instanceof StatementOperandShape)) {
    return StatementShapeAst.Decline("箭头函数参数不是形状节点");
  }
  const paramRaw = (params as StatementOperandShape).Raw;
  if (paramRaw === null) {
    return StatementShapeAst.Decline("箭头函数参数没有单元");
  }
  const first = builder.Units.indexOf(paramRaw);
  if (first < 0) {
    return StatementShapeAst.Decline("箭头函数参数单元不在表达式里");
  }
  // Stage 5d-8b：本节点声明的**箭头体末单元**（`Ingest` 吞体时逐格记下的最后一格）。顶层逗号不在体里
  // （`x => a, b` = `(x => a), b`），所以体不再总是吃到语句末尾——这时必须核「legacy `ParseAssign`
  // 恰好消费到本节点声明的那一格」，多一格或少一格都判否、整条回 legacy。
  const arrowTail = shape.TailEnd;
  const arrowTailIndex = arrowTail === null ? -1 : builder.Units.indexOf(arrowTail);
  const savedAt = builder.At;
  builder.At = first;
  let value:Token | null = null;
  let after = first;
  try {
    value = builder.ParseAssign();
    after = builder.At;
  } catch (error) {
    builder.At = savedAt;
    return StatementShapeAst.Decline("箭头函数交给 legacy 解析失败");
  }
  builder.At = savedAt;
  if (value === null || after <= first) {
    return StatementShapeAst.Decline("箭头函数没有消费单元");
  }
  if (arrowTailIndex >= 0 && after !== arrowTailIndex + 1) {
    return StatementShapeAst.Decline("箭头函数交给 legacy 解析后与形状树不一致");
  }
  for (let at = first; at < after; at++) {
    covered.push(at);
  }
  return value;
}
if (shape.Kind === StatementOperandShape.KindAwait || shape.Kind === StatementOperandShape.KindYield) {
  // Stage 5d-8b：`await` / `yield` 作为操作数（`x = yield y` / `x ? await a : await b` / `(yield 1) + 2`）。
  // **判型不在这里**：AwaitExpression / YieldExpression / 普通 Identifier 由 `ExpressionBuilder.ParseUnary`
  // 里的上下文判据（`IsAwaitExpressionStart` / `ParseYield` 的 generator 上下文 + lookahead + 换行）决定，
  // 这里只把关键字那一格交给它，再核「消费到的末单元」正好是本形状节点声明的最后一个单元
  // （`claimedLast + 1`）。不一致就判否回 legacy——`yield a + b` 这种「`+` 落在 KindYield 之外、
  // 而 legacy 的 yield 操作数是 `ParseAssign`」的分歧因此不会建出错树。
  if (shape.Data.length > 1) {
    return StatementShapeAst.Decline("await/yield 不是单操作数");
  }
  const raw = shape.Raw;
  if (raw === null) {
    return StatementShapeAst.Decline("await/yield 没有关键字单元");
  }
  const index = builder.Units.indexOf(raw);
  if (index < 0) {
    return StatementShapeAst.Decline("await/yield 关键字不在表达式里");
  }
  covered.push(index);
  if (shape.Data.length === 1) {
    const operand = StatementShapeAst.BuildNode(shape.Data[0], builder, context, covered);
    if (operand === null) {
      return null;
    }
  }
  const claimedLast = covered[covered.length - 1];
  const savedAt = builder.At;
  builder.At = index;
  let value:Token | null = null;
  let after = index;
  try {
    value = builder.ParseUnary();
    after = builder.At;
  } catch (error) {
    builder.At = savedAt;
    return StatementShapeAst.Decline("await/yield 交给 legacy 解析失败");
  }
  builder.At = savedAt;
  if (value === null || after !== claimedLast + 1) {
    return StatementShapeAst.Decline("await/yield 交给 legacy 解析后与形状树不一致");
  }
  return value;
}
if (shape.Kind === StatementOperandShape.KindFunction || shape.Kind === StatementOperandShape.KindClass) {
  // S3l：函数表达式 / 类表达式整段交给 legacy（`ParseFunctionExpression` / `ParseClassExpression`），
  // 关键字单元就是本节点的起点；头部与体都不进形状树，所以这里只按 legacy 的消费长度记覆盖。
  const raw = shape.Raw;
  if (raw === null) {
    return StatementShapeAst.Decline("函数/类表达式没有关键字单元");
  }
  const index = builder.Units.indexOf(raw);
  if (index < 0) {
    return StatementShapeAst.Decline("函数/类关键字不在表达式里");
  }
  // S3m：`async function` 的 async 单元在 Data[0]（不透明节点正文不进形状树）。
  // legacy `ParseFunctionExpression(asyncKeyword?, spanStart?)` 正好接受它：
  // At 仍指向 `function`，async 作为第一个子节点，spanStart 让节点区间从 async 开始。
  let asyncKeyword:Token | null = null;
  let spanStart = index;
  if (shape.Kind === StatementOperandShape.KindFunction && shape.Data.length > 0) {
    const firstChild = shape.Data[0];
    if (firstChild instanceof StatementOperandShape
      && (firstChild as StatementOperandShape).Text === "async") {
      const asyncRaw = (firstChild as StatementOperandShape).Raw;
      if (asyncRaw !== null) {
        const asyncIndex = builder.Units.indexOf(asyncRaw);
        if (asyncIndex >= 0) {
          // 与 legacy `ParseAssign` 的 async function 分支同一工厂、同一位置：
          // AsyncKeyword 必须建 `AsyncKeywordShape`（不是 raw Common），否则 XML 与 legacy 不同字节。
          asyncKeyword = builder.MakeKeywordLeaf(new AsyncKeywordShape(builder.Template), asyncIndex);
          spanStart = asyncIndex;
        }
      }
    }
  }
  const savedAt = builder.At;
  builder.At = index;
  let value:Token | null = null;
  let after = index;
  try {
    value = shape.Kind === StatementOperandShape.KindClass
      ? builder.ParseClassExpression()
      : (asyncKeyword === null
        ? builder.ParseFunctionExpression()
        : builder.ParseFunctionExpression(asyncKeyword, spanStart));
    after = builder.At;
  } catch (error) {
    builder.At = savedAt;
    return StatementShapeAst.Decline("函数/类表达式交给 legacy 解析失败");
  }
  builder.At = savedAt;
  if (value === null || after <= index) {
    return StatementShapeAst.Decline("函数/类表达式没有消费单元");
  }
  for (let at = spanStart; at < after; at++) {
    covered.push(at);
  }
  return value;
}
return StatementShapeAst.Decline("未覆盖的形状类型");
```
