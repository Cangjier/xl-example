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
```

# namespace cangjie

# class CompositeInitializerFormsJudge

WP-A4b 的**复合初始化器判据（续任：数组 / 括号 / 箭头 / 函数 / 类 / 三元）**。

A4 的 `CompositeInitializerJudge` 只接管「初始化器 = 单只 `{...}`」。本判据沿用同一机制
（`}`/`]`/`)` 关闭后、或表达式末尾单元关闭后，用 **legacy `ExpressionBuilder` 整棵建出 + 原位替换**），
把范围扩到：

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

**关键设计：只在「初始化器已经长完」的那一格建树。**

`[`/`(` 关闭后仍可能有续接（`let x = [1] as const` 的 `as`、`let x = (a as T)` 的 `as`、`(a: number) => a`
的类型注解），提前建树会把续接单元留在声明层被静默丢弃（divergent，A4 报告 §3 的碰撞点）。
本判据的办法是**把「能不能建」的判断整体前移成两道闸门**：

1. **形态闸门** `Family(units)`：只看 `=` 之后**第一个代码单元**决定候选族（`[` / `(` / `function` /
   `class` / `async` / 标识符后紧跟 `=>` 或 `?`）。`(` 族里有类型注解或 `as`/`satisfies` 的**不认领**
   （那是 A5 的 `(a: number) => a` / `(y as T)`，保持它们原来的 throw 账本）。
2. **完成闸门** `CanBuild(units)`：把 `=` 之后的 raw 单元整段交给 `ExpressionBuilder.ParseExpression`，
   必须**整段吃完**，并且最后一个代码单元之后**只剩输入结束**（`NextSignificantChar === ""`）才算长完。
   `;` / `as` / `+` / `,` 等后缀一律判「还没长完」⇒ 候选 `Uncertain`（继续等）或 `Reject`（不是本族），
   **绝不**在半截上建树。

两个闸门都在 `Claims`/`ClaimsForEndPossible` 里共用同一份实现（候选与声明终结候选不各写一份判据）。

## static method NextSignificantChar:(unit:Token)=>string

`unit` 之后第一个非空白 / 非注释字符（跳空白 + 两种注释；跨行）；输入结束返回 `""`。

与 A5 `TypeCatalogFactory.NextSignificantChar` 同一口径（该文件尚未并入本分支，因此在 A4b 自带一份）。

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

`unit` 之后（跳过空白）最多 `length` 个原始字符。用于区分 `=>` 与 `=`、`?` 与 `?.` / `??`。

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

`=` 之后第一个代码单元决定的候选族；不是本 WP 的形态返回 `""`。

- `"array"`：`[` 括号；
- `"paren"`：`(` 括号，且括号里**没有**类型注解 `:` / `as` / `satisfies`（那是 A5 的 `(a: number) => a` / `(y as T)`）；
- `"function"` / `"class"` / `"async"`：这三个关键字起首；
- `"arrow"`：标识符之后紧跟 `=>`（`y => y`）；
- `"ternary"`：标识符之后紧跟 `?`（不是 `?.` / `??`）。

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

## static method HasAssertSuffix:(units:Array<Token>, equalAt:int)=>bool

`=` 之后的数组/括号初始化器是否跟着 `as` / `satisfies` 续接（`[1] as const`）：**跨步稳定**的判据——
`as` 到达之前看文档前瞻，到达之后看「`=` 之后有没有 as/satisfies 单元」。

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

这段单元里的任一括号是否带「顶层 `:`」（参数类型注解）。带类型注解的箭头/函数表达式是 **A5** 的形态
（`(a: number) => a` / `function (a: number) {}`），本 WP 不认领，保持它们原来的 throw 账本。

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

「初始化器已经长完、可以整棵建出」：形态命中 + legacy `ExpressionBuilder` 能整段吃完 + 最后一个代码单元
之后只剩输入结束。任一不满足返回 `false`（候选继续等 / 不接管）。

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

括号关闭后仍是**本族合法续接**（还没长完、要等）：`(...)` 之后是 `=>` 的 `=`、`function (...)` 之后是
函数体的 `{`。终结候选在这两格必须 `Reject`（等），而不是按 C10 抛「declaration 括号」。

判据只看文档前瞻字符，**不看** `as`/`satisfies` 等续接：`let x = [1] as const` 在 `]` 关闭格上前瞻是
`a`，不满足 ⇒ 终结候选保持原来的显式 throw（账本不变）。

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
## static method ClaimsForEndPossible:(units:Array<Token>)=>bool

声明终结候选（`variable-declaration-end-possible-shape.xl.md`）的放行判据。**这个签名没有 context / template**
（`PossibleShape.ComputeByIndex` 拿不到它们），所以这里只做**结构判定**：形态命中 + 最后一个代码单元之后
只剩输入结束。真正能不能建由候选的 `IsBuildable`（有 context）用 `CanBuild` 再判一次——两道判据共用
`Family` / `NextSignificantChar`，不会两处漂移。

只在真正要建的那一格返回 `true`（让终结候选 `Reject`、等候选建树）。之前/之后的格子一律 `false`：
`let x = [1] as const` 在 `]` 关闭格上判据为假 ⇒ 终结候选仍按原样显式 throw（账本不变）。

尾巴判据走 `InitializerTailJudge.IsInitializerEnd`（WP-D0）：跳过 trivia、允许一个或多个 `;`、之后必须输入结束。

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

把 `=` 之后的**全部** raw 单元整棵建成表达式，替换掉这些单元；`Pos`/层级/子节点由 legacy 建造器给出
（与 legacy EOF 树逐节点同源）。建完 `host.MountedUnit = null`：后续单元（`;` 等）仍归声明层
（A4 报告 §2.3 的坑）。

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
