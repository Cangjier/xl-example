# dependencies
```xl
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
```

# namespace cangjie

直建路径**唯一**允许的「运算符 token / 操作数叶子」工厂：运算符一律复用 `ExpressionBuilder.MakeOperatorToken`
（与旧路径同一张映射表，直建侧不复制 if 链）；操作数判定只有这一处（数字 / 标识符 / 保留字）。

# class DirectTokenUtil

```txt
"+"  -> PlusTokenShape（经 ExpressionBuilder.MakeOperatorToken）
"2"  -> NumericLiteralShape.FromBasicToken
"a"  -> IdentifierShape.FromBasicToken
true -> 不是标识符操作数（调用方 Decline）
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
// 数字字面量走 NumericLiteralShape；BigInt 本轮不支持（调用方据 StartsNumber 显式 Decline）。
if (DirectTokenUtil.StartsNumber(text) || common.IsNumber() || common.IsBigInt()) {
  return false;
}
// 显式的保留字 / 范围外字面量集合：只写在这一处（CONTRACT §3.4「别散落」）。
// true/false/null/this/super/undefined 是关键字字面量（本轮只做数值字面量，D2）；
// typeof/void/delete/new/function/class 是范围外操作数（各有专门节点）；
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
