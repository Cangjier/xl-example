# dependencies
```xl
import { Bracket } from "../../../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { SourceRange } from "../../../../../core/syntax/source-range.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { ExpressionBuilder } from "../../expression-builder.xl.md"
import { CompositeInitializerJudge } from "./composite-initializer-judge.xl.md"
import { InitializerTailJudge } from "../shared/initializer-tail-judge.xl.md"
import { StatementRouteUtil } from "../../../statements/statement-route-util.xl.md"
```

# namespace cangjie

# class CompositeInitializerFormsJudge

```text
let x = [1, 2]              → ArrayLiteralExpressionShape
let x = [...a]              → ArrayLiteralExpressionShape + SpreadElementShape
let x = ((1)) / (a, b) / (1, 2, 3)   → ParenthesizedExpressionShape（含逗号链）
let x = () => 1 / (a, b) => a / ({ a }) => a / (...a) => a / y => y
                            → ArrowFunctionShape
let x = async () => 1       → ArrowFunctionShape + AsyncKeywordShape
let x = () => { return 1; } → ArrowFunctionShape + BlockShape
let x = function () {}      → FunctionExpressionShape
let x = class {}            → ClassExpressionShape
let x = a ? b : c           → ConditionalExpressionShape
```

## static method NextSignificantChar:(unit:Token)=>string

```ts
const range = unit.SourceRange;
let document = range.Document;
if (document === null) {
  document = SourceRange.CurrentDocument;
}
if (document === null || range.EndIndex < 0) {
  return "";
}
const count = document.GetCount();
let at = range.EndIndex;
while (at < count) {
  const ch = document.GetValue(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v" || ch === "\u2028" || ch === "\u2029") {
    at += 1;
    continue;
  }
  if (ch === "/" && at + 1 < count) {
    const next = document.GetValue(at + 1);
    if (next === "/") {
      at += 2;
      while (at < count && document.GetValue(at) !== "\n") {
        at += 1;
      }
      continue;
    }
    if (next === "*") {
      at += 2;
      while (at + 1 < count) {
        if (document.GetValue(at) === "*" && document.GetValue(at + 1) === "/") {
          at += 2;
          break;
        }
        at += 1;
      }
      continue;
    }
    return "/";
  }
  return ch;
}
return "";
```

## static method RawAfter:(unit:Token, length:int)=>string

```ts
const range = unit.SourceRange;
let document = range.Document;
if (document === null) {
  document = SourceRange.CurrentDocument;
}
if (document === null || range.EndIndex < 0) {
  return "";
}
let text = "";
const count = document.GetCount();
let at = range.EndIndex;
while (at < count && text.length < length) {
  const ch = document.GetValue(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v") {
    at += 1;
    continue;
  }
  text += ch;
  at += 1;
}
return text;
```

## static method FirstSignificant:(units:Array<Token>, from:int)=>int

```ts
for (let at = from; at < units.length; at++) {
  if (!units[at].IsTriviaToken) {
    return at;
  }
}
return -1;
```

## static method LastSignificant:(units:Array<Token>)=>int

```ts
for (let at = units.length - 1; at >= 0; at--) {
  if (!units[at].IsTriviaToken) {
    return at;
  }
}
return -1;
```

## static method Family:(units:Array<Token>)=>string

```ts
const equalAt = CompositeInitializerJudge.EqualIndex(units);
if (equalAt < 0) {
  return "";
}
const first = CompositeInitializerFormsJudge.FirstSignificant(units, equalAt + 1);
if (first < 0) {
  return "";
}
const head = units[first];
if (head instanceof Bracket) {
  const start = (head as Bracket).StartBracketChar;
  if (start === "[") {
    // [A4c] `]` 之后接 `as` / `satisfies`（`let x = [1] as const`）不是「纯数组初始化器」：
    // 交给 A4c 的 `CompositeInitializerTailJudge` 认领（整条 `X as T` 长完那一格建）。
    // 判据要**跨步稳定**：`as` 到达之前用文档前瞻，到达之后用「`=` 之后有没有 as/satisfies 单元」，
    // 两种都要命中同一条族判定，否则 `as` 到达那一格 A4b 会重新变回 `array`、与 A4c 同时存活。
    if (CompositeInitializerFormsJudge.HasAssertSuffix(units, equalAt)) {
      return "";
    }
    return "array";
  }
  if (start !== "(") {
    // `{...}` 归 A4 的 `CompositeInitializerJudge`（同为单只括号，但判据/交接不同）。
    return "";
  }
  for (const child of (head as Bracket).Data) {
    if (child.IsTriviaToken) {
      continue;
    }
    if (child instanceof Symbol && (child as Symbol).Is(":")) {
      return "";
    }
    if (child instanceof Common) {
      const text = (child as Common).TempToString();
      if (text === "as" || text === "satisfies") {
        return "";
      }
    }
  }
  // [B0:PAREN] 箭头参数 `(` 的**前瞻**（A2 §7 R4 的所有权交接，默认关）。
  // `)` 之后紧跟 `=>` 的这一格不是「分组」而是「箭头形参表」：把裁定推迟到 `=>` 到达那一格，
  // 交给 B3b 的 `ArrowParamsCatalog`。默认 `EnableArrowParenCatalog === false` ⇒ 本分支不进，
  // `Family` 的返回值与 B0 之前逐字节相同（`bin-paren-mul` 的 `(1+2)*3` 仍是 `"paren"`）。
  if (StatementRouteUtil.EnableArrowParenCatalog
    && CompositeInitializerFormsJudge.IsArrowParen(units, head as Bracket)) {
    return "arrowparen";
  }
  return "paren";
}
if (!(head instanceof Common)) {
  return "";
}
const headText = (head as Common).TempToString();
if (headText === "function" || headText === "async") {
  // 参数带类型注解的 `function (a: number) {}` / `async (a: number) => a` 是 **A5** 的形态
  //（`HasParameterTypeAnnotation`），本 WP 不认领：返回 "" 让终结候选保持原来的显式 throw。
  if (CompositeInitializerFormsJudge.HasParameterTypeAnnotation(units)) {
    return "";
  }
  return headText;
}
if (headText === "class") {
  return "class";
}
// 标识符起首的箭头 / 三元：用文档前瞻（只看源码字符，不读 ctx.Text）。
// `y = 1`（赋值）前瞻是 `=1` 而不是 `=>`，`y < 2` 前瞻是 `<`，都不会命中。
// `?.` / `??` 也不是三元（前瞻前两字符是 `?.` / `??`）。
// 标识符起首的「单参数箭头 `y => y`」与「三元 `a ? b : c`」**本 WP 不认领**：实测在最后一个单元那一格，
// A2 的 `BinaryOperatorPossibleShape` 仍然存活（它把标识符当可能的左操作数、等一个不存在的运算符），
// `CatalogGuide` 的 `Candidates.size === 1` 条件永远不成立 ⇒ 建不出来（本候选只能等到 EOF 兜底，
// 分类停在 partial）。要接管它们，需要 A2 在「后面没有运算符」时给出 `Reject`（A2/Lead 的判据），
// 或 E-base 提供「候选数收敛」的钩子；交接见 `_coord/REPORT-all-possible-A4b.md`。
// 这里返回 "" 让它们保持原来的 throw 账本（零漂移）。
return "";
```

## static method IsArrowParen:(units:Array<Token>, bracket:Bracket)=>bool

```ts
if (bracket === null) {
  return false;
}
if (bracket.StartBracketChar !== "(") {
  return false;
}
for (const unit of units) {
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is("=>")) {
    return true;
  }
}
if (!bracket.Closed) {
  return false;
}
return CompositeInitializerFormsJudge.RawAfter(bracket, 2) === "=>";
```

## static method HasAssertSuffix:(units:Array<Token>, equalAt:int)=>bool

```ts
const last = CompositeInitializerFormsJudge.LastSignificant(units);
if (last >= 0) {
  const pair = CompositeInitializerFormsJudge.RawAfter(units[last], 2);
  if (pair === "as" || pair === "sa") {
    return true;
  }
}
for (let at = equalAt + 1; at < units.length; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Common) {
    const text = (unit as Common).TempToString();
    if (text === "as" || text === "satisfies") {
      return true;
    }
  }
}
return false;
```
## static method HasParameterTypeAnnotation:(units:Array<Token>)=>bool

```ts
for (const unit of units) {
  if (unit.IsTriviaToken) {
    continue;
  }
  if (!(unit instanceof Bracket)) {
    continue;
  }
  for (const child of (unit as Bracket).Data) {
    if (child.IsTriviaToken) {
      continue;
    }
    if (child instanceof Symbol && (child as Symbol).Is(":")) {
      return true;
    }
  }
}
return false;
```

## static method CanBuild:(units:Array<Token>, template:Template, context:SyntaxContext)=>bool

```ts
const family = CompositeInitializerFormsJudge.Family(units);
if (family === "") {
  return false;
}
const equalAt = CompositeInitializerJudge.EqualIndex(units);
if (equalAt < 0) {
  return false;
}
const last = CompositeInitializerFormsJudge.LastSignificant(units);
if (last <= equalAt) {
  return false;
}
const raw:Array<Token> = [];
for (let at = equalAt + 1; at < units.length; at++) {
  if (units[at].IsTriviaToken) {
    continue;
  }
  raw.push(units[at]);
}
if (raw.length === 0) {
  return false;
}
if (family !== "array" && family !== "paren") {
  // 函数 / 类 / 箭头 / 三元：参数或返回值里带类型注解的属 A5。
  if (CompositeInitializerFormsJudge.HasParameterTypeAnnotation(raw)) {
    return false;
  }
}
// [D0:TAIL] 「之后只剩输入结束」的唯一判据：跳过 trivia、允许一个或多个 `;`、之后必须输入结束。
// 原来是 `NextSignificantChar(lastUnit) !== ""`，`;` 一律判「还没长完」⇒ `let x = [1, 2];` 在 `]` 格失配。
if (!InitializerTailJudge.IsInitializerEnd(units, last)) {
  return false;
}
const equalUnit = units[equalAt];
let basePos = equalUnit.SourceRange.EndIndex;
if (basePos < 0) {
  basePos = equalUnit.SourceRange.StartIndex;
}
const builder = new ExpressionBuilder(template, context);
builder.Load(raw, basePos < 0 ? 0 : basePos);
try {
  builder.ParseExpression();
} catch (error) {
  return false;
}
return builder.At === builder.Units.length;
```

## static method ContinuationAllowed:(units:Array<Token>)=>bool

```ts
if (CompositeInitializerFormsJudge.Family(units) === "") {
  return false;
}
const last = CompositeInitializerFormsJudge.LastSignificant(units);
if (last < 0) {
  return false;
}
const lookahead = CompositeInitializerFormsJudge.NextSignificantChar(units[last]);
return lookahead === "=" || lookahead === "{";
```
## static method IsBinaryOperatorStart:(ch:string)=>bool

```ts
return ch === "*" || ch === "/" || ch === "%" || ch === "+" || ch === "-"
  || ch === "<" || ch === ">" || ch === "&" || ch === "|" || ch === "^";
```

## static method OperatorContinuation:(units:Array<Token>)=>bool

```ts
if (CompositeInitializerFormsJudge.Family(units) !== "paren") {
  return false;
}
const last = CompositeInitializerFormsJudge.LastSignificant(units);
if (last < 0) {
  return false;
}
const unit = units[last];
if (!(unit instanceof Bracket)) {
  return false;
}
if (!(unit as Bracket).Closed) {
  return false;
}
if ((unit as Bracket).StartBracketChar !== "(") {
  return false;
}
const lookahead = CompositeInitializerFormsJudge.NextSignificantChar(unit);
return CompositeInitializerFormsJudge.IsBinaryOperatorStart(lookahead);
```

## static method ClaimsForEndPossible:(units:Array<Token>)=>bool

```ts
if (CompositeInitializerFormsJudge.Family(units) === "") {
  return false;
}
const last = CompositeInitializerFormsJudge.LastSignificant(units);
if (last < 0) {
  return false;
}
return InitializerTailJudge.IsInitializerEnd(units, last);
```

## static method Build:(host:Token, context:SyntaxContext)=>Token

```ts
const equalAt = CompositeInitializerJudge.EqualIndex(host.Data);
if (equalAt < 0) {
  throw new Error("增量变量形状未支持：declaration 复合初始化器缺赋值符");
}
const equalUnit = host.Data[equalAt];
let basePos = equalUnit.SourceRange.EndIndex;
if (basePos < 0) {
  basePos = equalUnit.SourceRange.StartIndex;
}
const raw:Array<Token> = [];
for (let at = equalAt + 1; at < host.Data.length; at++) {
  if (host.Data[at].IsTriviaToken) {
    continue;
  }
  raw.push(host.Data[at]);
}
const builder = new ExpressionBuilder(host.Template, context);
builder.Load(raw, basePos < 0 ? 0 : basePos);
const expression = builder.ParseExpression();
if (builder.At !== builder.Units.length) {
  throw new Error("增量变量形状未支持：declaration 初始化器未读完");
}
const start = equalAt + 1;
const removed = host.Data.length - start;
host.Data.splice(start, removed, expression);
expression.Parent = host;
host.MountedUnit = null;
return expression;
```
