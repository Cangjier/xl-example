# dependencies
```xl
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ConstString } from "../../../core/syntax/basic-tokens/string/const-string.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
import { BigIntLiteralShape } from "../literals/big-int-literal-shape.xl.md"
import { NumericLiteralShape } from "../literals/numeric-literal-shape.xl.md"
import { StringLiteralShape } from "../literals/string-literal-shape.xl.md"
import { FalseKeywordShape } from "../keywords/false-keyword-shape.xl.md"
import { NullKeywordShape } from "../keywords/null-keyword-shape.xl.md"
import { ThisKeywordShape } from "../keywords/this-keyword-shape.xl.md"
import { TrueKeywordShape } from "../keywords/true-keyword-shape.xl.md"
```

# namespace cangjie

直建路径**唯一**允许的「运算符 token / 操作数叶子」工厂：运算符一律复用 `ExpressionBuilder.MakeOperatorToken`
（与旧路径同一张映射表，直建侧不复制 if 链）；操作数判定只有这一处（数值 / BigInt / 字符串 / 关键字 / 标识符）。

# class DirectTokenUtil

```txt
"+"  -> PlusTokenShape（经 ExpressionBuilder.MakeOperatorToken）
"2"  -> NumericLiteralShape.FromBasicToken
"1n" -> BigIntLiteralShape.FromBasicToken
"a"  -> IdentifierShape.FromBasicToken
true -> TrueKeywordShape（叶子，无子节点）
`t`  -> NoSubstitutionTemplateLiteralShape（模板分支在引擎里）
```

## static method OperatorToken:(unit:Token, pos:int, template:Template, context:SyntaxContext)=>Token

```ts
// 唯一映射表复用（CONTRACT §3.4）：Load([unit], pos) 只是让 SpanLeaf 取到 Units[0] / Positions[0]，
// 运算符形状的「选型 + SignIn/SignOut/Pos/TryToClose」仍由 MakeOperatorToken 这一条老路径决定。
const builder = new ExpressionBuilder(template, context);
builder.Load([unit], pos);
return builder.MakeOperatorToken(unit, 0);
```

## static method StartsNumber:(text:string)=>bool

```ts
// 与 `ExpressionBuilder.StartsNumber` / `Common.CanStartNumber` 同一条判据（三处同源，别各写一份）：
// 首字符是数字，或 `.` 后紧跟数字。这里只回答「这串文本能不能起一个数值字面量」，不做数值解析。
if (text.length === 0) {
  return false;
}
const ch = text[0];
if (ch >= "0" && ch <= "9") {
  return true;
}
return ch === "." && text.length > 1 && text[1] >= "0" && text[1] <= "9";
```

## static method TextOf:(unit:Token)=>string

```ts
if (unit instanceof Common) {
  return (unit as Common).TempToString();
}
if (unit instanceof Symbol) {
  return (unit as Symbol).TempToString();
}
return "";
```

## static method IsIdentifierOperand:(unit:Token)=>bool

```ts
if (!(unit instanceof Common)) {
  return false;
}
const common = unit as Common;
const text = common.TempToString();
// 数字 / BigInt 走 LiteralOperand（NumericLiteralShape / BigIntLiteralShape）。
if (DirectTokenUtil.StartsNumber(text) || common.IsNumber() || common.IsBigInt()) {
  return false;
}
// 显式的保留字 / 范围外字面量集合：只写在这一处（CONTRACT §3.4「别散落」）。
// true/false/null/this 是关键字字面量（R2 起由 LiteralOperand 建成叶子，见 A1）；
// super/undefined 仍是范围外；typeof/void/delete/new 各有专门节点（R2 A3/A5）；
// await/yield/import 也是专门节点；instanceof/in/as/satisfies/of 是运算符位，不是操作数。
const reserved:Array<string> = [
  "true", "false", "null", "undefined", "this", "super",
  "typeof", "void", "delete", "new", "function", "class",
  "await", "yield", "import", "instanceof", "in", "as", "satisfies", "of",
];
if (reserved.includes(text)) {
  return false;
}
return true;
```

## static method IsKeywordLiteral:(text:string)=>bool

```ts
// R2-A1：四个关键字字面量。`super` / `undefined` 明确不在本轮（DECISIONS D2 + R2-CONTRACT §1.1）。
return text === "true" || text === "false" || text === "null" || text === "this";
```

## static method IsStringUnit:(unit:Token)=>bool

```ts
// 词法层的 String 单元：普通引号串、逐字串、原始串、模板串都在这一个类上，
// 靠 `Template.StringTemplate` 的引号配置再分「模板 / 普通串」（见 IsTemplateUnit）。
return unit instanceof String;
```

## static method IsTemplateUnit:(unit:Token, template:Template)=>bool

```ts
// 判据照抄 `ExpressionBuilder.IsTemplateToken`（只读复用，不 new builder——A6 口径）：
// 这个 String 单元支不支持内插 + 它的引号是不是内插引号（ts 只有反引号）。
if (!(unit instanceof String)) {
  return false;
}
const token = unit as String;
if (!token.IsSupportInterpolation) {
  return false;
}
const config = template.StringTemplate;
return config.HasInterpolationQuoteChars && config.InterpolationQuoteChars.includes(token.StringChar);
```

## static method LiteralOperand:(unit:Token, text:string, pos:int, template:Template, context:SyntaxContext)=>Token | null

```ts
// 返回 null = 「不是字面量操作数」（调用方据此 Decline）。有插值的模板**故意**返回 null：
// 它要递归引擎，不能塞进这个纯工厂（由引擎的 `ParseTemplate` 分支建）。
if (unit instanceof String) {
  if (DirectTokenUtil.IsTemplateUnit(unit, template)) {
    return null;
  }
  const stringShape = StringLiteralShape.FromBasicToken(unit as String, context);
  stringShape.Pos = pos;
  return stringShape;
}
if (!(unit instanceof Common)) {
  return null;
}
const common = unit as Common;
if (DirectTokenUtil.IsKeywordLiteral(text)) {
  let keyword:ShapeToken;
  if (text === "true") {
    keyword = new TrueKeywordShape(template);
  } else if (text === "false") {
    keyword = new FalseKeywordShape(template);
  } else if (text === "null") {
    keyword = new NullKeywordShape(template);
  } else {
    keyword = new ThisKeywordShape(template);
  }
  if (common.SourceRange.StartIndex >= 0) {
    keyword.SignIn(common.SourceRange.StartIndex);
  }
  if (common.SourceRange.EndIndex >= 0) {
    keyword.SignOut(common.SourceRange.EndIndex);
  }
  keyword.Pos = pos;
  keyword.TryToClose(context);
  return keyword;
}
if (!DirectTokenUtil.StartsNumber(text)) {
  return null;
}
if (common.IsBigInt()) {
  const bigInt = BigIntLiteralShape.FromBasicToken(common, context);
  bigInt.Pos = pos;
  return bigInt;
}
if (!common.IsNumber()) {
  return null;
}
const numeric = NumericLiteralShape.FromBasicToken(common, context);
numeric.Pos = pos;
return numeric;
```
