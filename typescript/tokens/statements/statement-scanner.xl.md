# dependencies
```xl
import { Token } from "../../../core/syntax/token.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { RegexToken } from "../../../core/syntax/basic-tokens/regex-token.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { ExpressionStatementPossibleShape } from "./expression-statement-possible-shape.xl.md"
```

# namespace cangjie

# class StatementScanResult

语句扫描的结果：`Status` 0 = 还要等，1 = 到齐，2 = 不是本形状；`End` 是「到齐」时最后一个代码单元在 `code` 数组里的下标。

## field Status:int = 0

## field End:int = -1

## constructor:(status:int, end:int)=>void

```ts
this.Status = status;
this.End = end;
```

# class StatementScanner

根级语句的**终结位置扫描器**：只做符号层的递归下降，不建任何形状，回答「从第一个代码单元算起，这条语句到哪一格结束」。

为什么要有它：根候选按 `CatalogGuide` 的契约必须在一个下标上决定「建不建」，而 `if` 还牵扯「`;` 之后还有没有 `else`」——这根换行 / 下一个代码单元才看得见。扫描器把「还差单元」与「已经到齐（到齐点可能早于当前下标）」分开回答，形状才在正确的时机建。

`AtEOF` 是文件末尾的判别位：根在最后一个真实位置已经被签出（`SourceRange.End` 非空）时，候选把「本层没有后续单元」当成 ASI 收尾，而不是继续等 `else` / `;`。

## static field AtEOF:bool = false

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

## static method IsKeyword:(unit:Token, text:string)=>bool

```ts
return unit instanceof Common && (unit as Common).Is(text);
```

## static method IsSymbol:(unit:Token, text:string)=>bool

```ts
return unit instanceof Symbol && (unit as Symbol).Is(text);
```

## static method IsBracket:(unit:Token, start:string)=>bool

```ts
return unit instanceof Bracket && (unit as Bracket).StartBracketChar === start;
```

## static method IsEOF:(unit:Token)=>bool

```ts
return unit instanceof EndOfFileTokenShape;
```

## static method NeedMore:()=>StatementScanResult

```ts
return new StatementScanResult(0, -1);
```

## static method Complete:(end:int)=>StatementScanResult

```ts
return new StatementScanResult(1, end);
```

## static method Mismatch:()=>StatementScanResult

```ts
return new StatementScanResult(2, -1);
```

## static method ScanRoot:(code:Array<Token>)=>StatementScanResult

根级只认「本族语句的起点」：`{`（块）、`;`（空语句）、以及固定关键字。表达式 / import / export 一律交回其它候选。

```ts
if (code.length === 0) {
  return StatementScanner.NeedMore();
}
const first = code[0];
if (first instanceof Bracket) {
  if ((first as Bracket).StartBracketChar === "{") {
    return StatementScanner.Complete(0);
  }
  return StatementScanner.Mismatch();
}
if (first instanceof Symbol) {
  if ((first as Symbol).Is(";")) {
    return StatementScanner.Complete(0);
  }
  return StatementScanner.Mismatch();
}
if (first instanceof Common) {
  const text = (first as Common).TempToString();
  // Ambient variable statement: `declare` + variable keyword on the SAME line.
  // A line break between them means TS ASI splits it (`declare` expression statement + `const …`),
  // so this candidate answers Mismatch there and lets the expression / end candidates take over.
  if (text === "declare") {
    if (code.length === 1) {
      return StatementScanner.NeedMore();
    }
    const second = code[1];
    if (second instanceof Common) {
      const secondText = (second as Common).TempToString();
      // `declare const enum …`: the enum declaration candidate owns it, so yield here too.
      if (secondText === "const" && StatementScanner.NextWord(second.SourceRange.End) === "enum") {
        return StatementScanner.Mismatch();
      }
      if ((secondText === "let" || secondText === "const" || secondText === "var" || secondText === "using")
        && StatementScanner.NoLineBreakBetween(first, second)) {
        return StatementScanner.ScanToSemicolon(code, 2, true);
      }
    }
    return StatementScanner.Mismatch();
  }
  if (text === "let" || text === "const" || text === "var") {
    // `const enum E {…}` (also `const\tenum` / `const\nenum`): the enum declaration candidate owns
    // this form, so the variable-statement candidate must yield instead of scanning to `;`.
    // Raw lookahead, because `enum` may not be tokenized yet when `const` arrives.
    if (text === "const" && StatementScanner.NextWord(first.SourceRange.End) === "enum") {
      return StatementScanner.Mismatch();
    }
    return StatementScanner.ScanToSemicolon(code, 1, true);
  }
  if (text === "if") {
    return StatementScanner.ScanIf(code, 0);
  }
  if (text === "while") {
    return StatementScanner.ScanLoop(code, 0);
  }
  if (text === "for") {
    return StatementScanner.ScanFor(code, 0);
  }
  if (text === "switch" || text === "with") {
    return StatementScanner.ScanLoop(code, 0);
  }
  if (text === "try") {
    return StatementScanner.ScanTry(code, 0);
  }
  if (text === "do") {
    return StatementScanner.ScanDo(code, 0);
  }
  if (text === "return" || text === "throw") {
    return StatementScanner.ScanReturnOrThrow(code, 0);
  }
  if (text === "break" || text === "continue") {
    return StatementScanner.ScanBreakOrContinue(code, 1);
  }
  if (text === "debugger") {
    return StatementScanner.ScanSimpleSemicolon(code, 1);
  }
  // using 声明：声明列表到本层 ; 为止（本层括号是整单元，不数深度）。
  if (text === "using") {
    return StatementScanner.ScanToSemicolon(code, 1);
  }
  // await using：只认「await 后紧跟 using」，其余 await … 交回表达式候选。
  if (text === "await") {
    if (code.length === 1) {
      // 还不能判：可能是 `await using` 声明，也可能是 await 表达式语句。
      return StatementScanner.NeedMore();
    }
    if (StatementScanner.IsKeyword(code[1], "using")) {
      return StatementScanner.ScanToSemicolon(code, 2);
    }
    return StatementScanner.Mismatch();
  }
  // Root-level labeled statement: Identifier ":" statement.
  // A plain identifier start keeps this candidate alive only when the raw text after it
  // (skipping trivia) is ":"; anything else is an expression statement, handled by the
  // expression candidate at exactly the same trigger as before.
  if (code.length === 1) {
    if (StatementScanner.NextChar(first.SourceRange.End) === ":") {
      return StatementScanner.NeedMore();
    }
    return StatementScanner.Mismatch();
  }
  if (StatementScanner.IsSymbol(code[1], ":")) {
    return StatementScanner.ScanBody(code, 2);
  }
  return StatementScanner.Mismatch();
}
return StatementScanner.Mismatch();
```

## static method ScanBody:(code:Array<Token>, at:int, stopAtWhile?:bool)=>StatementScanResult

语句体：任何一条语句都行（含表达式语句与空语句），因为 `if` / 循环的体里不会再走根候选。

`stopAtWhile` 只由 `ScanDo` 传 true：do 体的表达式语句在**换行处遇到 `while`** 时要收口，
那个 `while` 是 do-while 自己的条件头，不是体的一部分（否则体会把 `while (…)` 之后的 `;` 也吞掉，
`ScanDo.whileAt` 就落到下一条语句上）。

```ts
if (at < 0 || at >= code.length) {
  return StatementScanner.NeedMore();
}
const unit = code[at];
if (unit instanceof Bracket) {
  if ((unit as Bracket).StartBracketChar === "{") {
    return StatementScanner.Complete(at);
  }
  return StatementScanner.ScanExpressionBody(code, at, stopAtWhile ?? false);
}
if (unit instanceof Symbol) {
  if ((unit as Symbol).Is(";")) {
    return StatementScanner.Complete(at);
  }
  return StatementScanner.ScanExpressionBody(code, at, stopAtWhile ?? false);
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  if (text === "let" || text === "const" || text === "var") {
    // Same yield as the root dispatch: `const enum …` belongs to the enum declaration candidate.
    if (text === "const" && StatementScanner.NextWord(code[at].SourceRange.End) === "enum") {
      return StatementScanner.Mismatch();
    }
    return StatementScanner.ScanToSemicolon(code, at + 1);
  }
  if (text === "if") {
    return StatementScanner.ScanIf(code, at);
  }
  if (text === "while" || text === "switch" || text === "with") {
    return StatementScanner.ScanLoop(code, at);
  }
  if (text === "for") {
    return StatementScanner.ScanFor(code, at);
  }
  if (text === "try") {
    return StatementScanner.ScanTry(code, at);
  }
  if (text === "do") {
    return StatementScanner.ScanDo(code, at);
  }
  if (text === "return" || text === "throw") {
    return StatementScanner.ScanReturnOrThrow(code, at);
  }
  if (text === "break" || text === "continue") {
    return StatementScanner.ScanBreakOrContinue(code, at + 1);
  }
  if (text === "debugger") {
    return StatementScanner.ScanSimpleSemicolon(code, at + 1);
  }
  if (text === "using") {
    return StatementScanner.ScanToSemicolon(code, at + 1);
  }
  if (text === "await") {
    if (at + 1 < code.length && StatementScanner.IsKeyword(code[at + 1], "using")) {
      return StatementScanner.ScanToSemicolon(code, at + 2);
    }
  }
  // Annex-B: a labeled statement may wrap a function / class declaration (`lbl: function f() {}`).
  // Those are declaration statements: scan to the closed body `{…}` bracket instead of an expression.
  if (text === "function" || text === "class") {
    return StatementScanner.ScanDeclarationBody(code, at);
  }
  // 被标声明（`iface: interface I` ⏎ `{ … }` / `en: enum E` ⏎ `{ A }`）：体是闭合 `{…}` 括号，
  // 按声明体收口；否则会落到 ScanExpressionBody 一路吃到 EOF，把后面的语句并给 builder。
  if (text === "interface" || text === "enum" || text === "namespace" || text === "module") {
    return StatementScanner.ScanDeclarationBody(code, at);
  }
  if (text === "async" && at + 1 < code.length
    && StatementScanner.IsKeyword(code[at + 1], "function")) {
    return StatementScanner.ScanDeclarationBody(code, at);
  }
  // Nested labeled statement inside a body: Identifier ":" statement.
  if (at + 1 < code.length && StatementScanner.IsSymbol(code[at + 1], ":")) {
    return StatementScanner.ScanBody(code, at + 2);
  }
}
return StatementScanner.ScanExpressionBody(code, at, stopAtWhile ?? false);
```

## static method ScanDeclarationBody:(code:Array<Token>, at:int)=>StatementScanResult

声明语句（函数 / 类，含 `function*`、泛型参数、参数表、`extends` 等）的体是一个闭合的 `{…}` 括号单元：
从 `at` 起找本层第一个 `{` 括号，到它为止。找不到且已到 EOF 则 mismatch。

```ts
for (let index = at; index < code.length; index++) {
  const unit = code[index];
  if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{") {
    return StatementScanner.Complete(index);
  }
  if (StatementScanner.IsEOF(code[index])) {
    return StatementScanner.Mismatch();
  }
}
if (StatementScanner.AtEOF && code.length > 0) {
  return StatementScanner.Complete(code.length - 1);
}
return StatementScanner.NeedMore();
```

## static method ScanToSemicolon:(code:Array<Token>, from:int, stopAtEof?:bool)=>StatementScanResult

从 `from` 起找本层的 `;`（本层里括号是整单元，所以 `;` 只可能是语句分隔符）；文件末尾没有 `;` 时按 ASI 收在最后一个代码单元。
`stopAtEof` 为真时文件末尾**不**按 ASI 收口，而是 `Mismatch`——变量语句在 EOF 交给根终结候选的
`BuildTrailingDeclaration` 兜底（避免 statement 候选与终结候选在 EOF 同时成立）。

```ts
for (let at = from; at < code.length; at++) {
  if (StatementScanner.IsEOF(code[at])) {
    if (stopAtEof ?? false) {
      return StatementScanner.Mismatch();
    }
    if (at > 0) {
      return StatementScanner.Complete(at - 1);
    }
    return StatementScanner.Mismatch();
  }
  // 换行 ASI：前一个代码单元能收住一条声明、当前单元接不上，就在这里收口——
  // 否则会把**下一条语句**的 `;` 也吞进来（`const last = …` ⏎ `f(...)` / 类型注解跨行读到下一个 `;`）。
  // 与 `StatementBuilder.BuildExpressionStatement` / `BuildVariableStatement` 读同一套判据；
  // 表达式尾的细节（后缀 `++`/`--`、`=> {}` / `as` / `satisfies` 不是调用位宿主）交给
  // `ExpressionStatementPossibleShape.IsUncontinuableTailBoundary`。
  if (at > from && (StatementScanner.EndsAtLineBreak(code[at - 1], code[at])
    || ExpressionStatementPossibleShape.IsUncontinuableTailBoundary(code, at))) {
    if (StatementScanner.IsSymbol(code[at], ";")) {
      // 行首 `;` 后面同一行还有代码（`;(() => 1)()`）：这个 `;` 是下一条空语句，不归本声明。
      const afterSemi = at + 1 < code.length ? code[at + 1] : null;
      if (afterSemi !== null && StatementScanner.NoLineBreakBetween(code[at], afterSemi)) {
        return StatementScanner.Complete(at - 1);
      }
    } else {
      return StatementScanner.Complete(at - 1);
    }
  }
  if (StatementScanner.IsSymbol(code[at], ";")) {
    return StatementScanner.Complete(at);
  }
}
if (StatementScanner.AtEOF && code.length > 0) {
  if (stopAtEof ?? false) {
    return StatementScanner.Mismatch();
  }
  return StatementScanner.Complete(code.length - 1);
}
return StatementScanner.NeedMore();
```

## static method EndsExpression:(unit:Token)=>bool

标识符 / 括号 / 字面量 / 后缀自增自减可以收尾一个表达式；`as` / `typeof` 这类前缀词不算。
（与 `StatementBuilder.EndsExpression` 同一判据；放在 scanner 侧是为了不给 statement-scanner → statement-builder 造成循环依赖。）

```ts
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  if (text === "as" || text === "satisfies" || text === "instanceof" || text === "in" || text === "of"
    || text === "extends" || text === "is" || text === "keyof" || text === "typeof" || text === "new"
    || text === "await" || text === "delete" || text === "void"
    || text === "unique" || text === "readonly" || text === "asserts" || text === "infer") {
    return false;
  }
  return true;
}
if (unit instanceof Bracket) {
  return true;
}
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  return text === "++" || text === "--";
}
return true;
```

## static method ContinuesAcrossLine:(unit:Token)=>bool

下一行的这个单元能不能接着上一行继续同一个表达式 / 类型（与 `StatementBuilder.ContinuesAcrossLine` 同表）。

```ts
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  return text === "." || text === "?." || text === "<" || text === ">" || text === ">>" || text === ">>>"
    || text === "|" || text === "&" || text === "?" || text === "?:" || text === ":" || text === "=>"
    || text === "=" || text === "+" || text === "-" || text === "*" || text === "/" || text === "%"
    || text === "**" || text === "&&" || text === "||" || text === "??" || text === "!" || text === "++"
    || text === "--" || text === "," || text === "~";
}
if (unit instanceof Bracket) {
  const start = (unit as Bracket).StartBracketChar;
  return start === "(" || start === "[" || start === "{";
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  return text === "as" || text === "satisfies" || text === "instanceof" || text === "in" || text === "of"
    || text === "extends" || text === "is" || text === "keyof" || text === "typeof";
}
if (unit instanceof RegexToken) {
  // 正则字面量不能续接上一条表达式：换行后的 `/re/g` 是一条新语句
  //（箭头体 `}` 之后由 TypeScriptRegexTemplate.CanStartAt 的位置判据把它认成正则起点）。
  return false;
}
return true;
```

## static method EndsAtLineBreak:(previous:Token, next:Token)=>bool

`previous` 能收尾、`next` 接不上、两者之间有换行 —— 三者都成立就是 ASI 边界。

```ts
if (StatementScanner.NoLineBreakBetween(previous, next)) {
  return false;
}
if (!StatementScanner.EndsExpression(previous)) {
  return false;
}
return !StatementScanner.ContinuesAcrossLine(next);
```

## static method ScanReturnOrThrow:(code:Array<Token>, keywordAt:int)=>StatementScanResult

`return` / `throw` 的受限产生式：**关键字之后换行**时语句停在关键字上（`throw\na;` = throw; a;）。
TS 对 `throw` 的恢复形是 `ThrowStatement` + 零宽 `Identifier` 子节点（Builder 侧补），扫描这里只负责收口。

```ts
if (StatementScanner.IsKeyword(code[keywordAt], "throw") && keywordAt + 1 < code.length
  && !StatementScanner.NoLineBreakBetween(code[keywordAt], code[keywordAt + 1])) {
  // 换行后的 `;` 仍是这条 throw 的终止符：TS 给 `throw` ⏎ `;` 的 AST 是
  // ThrowStatement[0,7] + 零宽 Identifier[5,5]（`;` 计入 End，不再另起 EmptyStatement）。
  // 收在这一格上，否则它会被留给下一条空语句，根层 statement 候选就会拖到 EOF 哨兵上
  // 与根终结候选同时 Accept（CatalogGuide「终结候选与其它候选同时成立」）。
  if (StatementScanner.IsSymbol(code[keywordAt + 1], ";")) {
    return StatementScanner.Complete(keywordAt + 1);
  }
  return StatementScanner.Complete(keywordAt);
}
return StatementScanner.ScanToSemicolon(code, keywordAt + 1);
```
## static method ScanSimpleSemicolon:(code:Array<Token>, from:int)=>StatementScanResult

```ts
if (from >= code.length) {
  if (StatementScanner.AtEOF && code.length > 0) {
    return StatementScanner.Complete(code.length - 1);
  }
  return StatementScanner.NeedMore();
}
if (StatementScanner.IsSymbol(code[from], ";")) {
  return StatementScanner.Complete(from);
}
if (StatementScanner.IsEOF(code[from])) {
  return StatementScanner.Complete(from - 1);
}
return StatementScanner.Mismatch();
```

## static method ScanBreakOrContinue:(code:Array<Token>, from:int)=>StatementScanResult

```ts
if (from >= code.length) {
  // 本层已经读完：AtEOF 时按 ASI 收在最后一个代码单元（`for (;;) break` / `label: break label`），
  // 否则还要等下一格才能判断后面有没有标签 / `;`。不在这里收口，普通候选会一直活到 EOF 哨兵，
  // 与根终结候选同时 Accept，CatalogGuide 抛「终结候选与其它候选同时成立」（end compute B 组同源）。
  if (StatementScanner.AtEOF && code.length > 0) {
    return StatementScanner.Complete(code.length - 1);
  }
  return StatementScanner.NeedMore();
}
if (StatementScanner.IsSymbol(code[from], ";")) {
  return StatementScanner.Complete(from);
}
if (StatementScanner.IsEOF(code[from])) {
  return StatementScanner.Complete(from - 1);
}
// 受限产生式：`break` / `continue` 之后换行 = 没有标签，语句在关键字处收口（`break` ⏎ `foo()`）。
if (from > 0 && StatementScanner.EndsAtLineBreak(code[from - 1], code[from])) {
  return StatementScanner.Complete(from - 1);
}
if (from + 1 >= code.length) {
  if (StatementScanner.AtEOF && code.length > 0) {
    return StatementScanner.Complete(code.length - 1);
  }
  return StatementScanner.NeedMore();
}
if (StatementScanner.IsSymbol(code[from + 1], ";")) {
  return StatementScanner.Complete(from + 1);
}
if (StatementScanner.IsEOF(code[from + 1])) {
  return StatementScanner.Complete(from);
}
// 标签之后换行 / 到头：`break label` 后面没有 `;` 也收口（`break label` ⏎ 下一条语句）。
if (StatementScanner.EndsAtLineBreak(code[from], code[from + 1])) {
  return StatementScanner.Complete(from);
}
return StatementScanner.Mismatch();
```

## static method ScanExpressionBody:(code:Array<Token>, at:int, stopAtWhile?:bool)=>StatementScanResult

```ts
for (let cursor = at; cursor < code.length; cursor++) {
  // do 体（`stopAtWhile`）：换行后遇到 `while` 关键字 ⇒ 体到此为止，那一格属于 do-while 的条件头。
  // 判据复用 `EndsAtLineBreak`（前一个代码单元能收尾 + 换行 + `while` 不是表达式的续接符）。
  if ((stopAtWhile ?? false) && cursor > at
    && StatementScanner.IsKeyword(code[cursor], "while")
    && StatementScanner.EndsAtLineBreak(code[cursor - 1], code[cursor])) {
    return StatementScanner.Complete(cursor - 1);
  }
  if (StatementScanner.IsSymbol(code[cursor], ";")) {
    return StatementScanner.Complete(cursor);
  }
  if (StatementScanner.IsEOF(code[cursor])) {
    if (cursor > at) {
      return StatementScanner.Complete(cursor - 1);
    }
    return StatementScanner.Mismatch();
  }
}
if (StatementScanner.AtEOF && code.length > at) {
  return StatementScanner.Complete(code.length - 1);
}
return StatementScanner.NeedMore();
```

## static method ScanIf:(code:Array<Token>, at:int)=>StatementScanResult

`else` 的歧义在这里处理：体到齐那一刻，如果**文档里**紧随的下一个词是 `else`（还没被 token 化也算），就继续等；否则收在体的末尾。这样 `if (a) {}` 在文件末尾能就地建，不会把「还差 else」拖到 EOF 哨兵上与根终结候选打架。

```ts
if (at + 1 >= code.length) {
  return StatementScanner.NeedMore();
}
if (!StatementScanner.IsBracket(code[at + 1], "(")) {
  return StatementScanner.Mismatch();
}
const body = StatementScanner.ScanBody(code, at + 2);
if (body.Status !== 1) {
  return body;
}
const next = body.End + 1;
if (next < code.length) {
  if (StatementScanner.IsKeyword(code[next], "else")) {
    const elseBody = StatementScanner.ScanBody(code, next + 1);
    if (elseBody.Status !== 1) {
      return elseBody;
    }
    return StatementScanner.Complete(elseBody.End);
  }
  return StatementScanner.Complete(body.End);
}
if (StatementScanner.NextWord(code[body.End].SourceRange.End) === "else") {
  return StatementScanner.NeedMore();
}
return StatementScanner.Complete(body.End);
```

## static method ScanFor:(code:Array<Token>, at:int)=>StatementScanResult

`for` 头可选一个 `await`（`for await (…)`，ForOfStatement 的 AwaitKeyword），后面才是 `( … )` 括号单元。

```ts
if (at + 1 >= code.length) {
  return StatementScanner.NeedMore();
}
let bracketAt = at + 1;
if (StatementScanner.IsKeyword(code[bracketAt], "await")) {
  bracketAt++;
  if (bracketAt >= code.length) {
    return StatementScanner.NeedMore();
  }
}
if (!StatementScanner.IsBracket(code[bracketAt], "(")) {
  return StatementScanner.Mismatch();
}
return StatementScanner.ScanBody(code, bracketAt + 1);
```

## static method ScanLoop:(code:Array<Token>, at:int)=>StatementScanResult

`while` 与 `for` 同构：头部是一个 `( … )` 括号单元，后面跟体。

```ts
if (at + 1 >= code.length) {
  return StatementScanner.NeedMore();
}
if (!StatementScanner.IsBracket(code[at + 1], "(")) {
  return StatementScanner.Mismatch();
}
return StatementScanner.ScanBody(code, at + 2);
```

## static method ScanDo:(code:Array<Token>, at:int)=>StatementScanResult

```ts
const body = StatementScanner.ScanBody(code, at + 1, true);
if (body.Status !== 1) {
  return body;
}
const whileAt = body.End + 1;
if (whileAt >= code.length) {
  return StatementScanner.NeedMore();
}
if (!StatementScanner.IsKeyword(code[whileAt], "while")) {
  return StatementScanner.Mismatch();
}
if (whileAt + 1 >= code.length) {
  return StatementScanner.NeedMore();
}
if (!StatementScanner.IsBracket(code[whileAt + 1], "(")) {
  return StatementScanner.Mismatch();
}
const semiAt = whileAt + 2;
// ASI: only a literal `;` can continue a do-while, so when the next raw char is not one the
// statement is already complete — at EOF, before `}`, after a line break, and even on the same
// line when the next token starts a new statement (TS parses `do {} while (b) a;` as two statements).
const headerEnd = (code[whileAt + 1] as Bracket).SourceRange.End;
const nextChar = StatementScanner.NextChar(headerEnd);
if (nextChar !== ";") {
  return StatementScanner.Complete(whileAt + 1);
}
if (semiAt >= code.length) {
  return StatementScanner.NeedMore();
}
if (StatementScanner.IsSymbol(code[semiAt], ";")) {
  return StatementScanner.Complete(semiAt);
}
if (StatementScanner.IsEOF(code[semiAt])) {
  return StatementScanner.Complete(semiAt - 1);
}
return StatementScanner.Mismatch();
```

## static method NoLineBreakBetween:(left:Token, right:Token)=>bool

两个 token 的原始文本之间（`left.End.Index + 1` 到 `right.Start.Index - 1`）有没有换行；
块注释里的换行也算换行。用于 `declare` 与变量关键字之间：同一行才是同一个 ambient 变量语句。

```ts
const from = left.SourceRange.End;
const to = right.SourceRange.Start;
if (from === null || to === null) {
  return true;
}
const document = from.Document;
let cursor = from.Index + 1;
while (cursor < to.Index) {
  const ch = document.At(cursor).Value;
  if (ch === "\n" || ch === "\r") {
    return false;
  }
  cursor++;
}
return true;
```

## static method NextChar:(last:Source | null)=>string

从 `last` 之后的下一个位置起，跳过空白与 `//` / `/* */` 注释，返回第一个字符；越界返回空串。
根级标签判据用它回答「标识符后面是不是 `:`」，此时 `:` 可能还没被 token 化。

```ts
if (last === null) {
  return "";
}
const document = last.Document;
const count = document.GetCount();
let at = last.Index + 1;
while (at < count) {
  const ch = document.At(at).Value;
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\v" || ch === "\f") {
    at++;
    continue;
  }
  if (ch === "/" && at + 1 < count) {
    const next = document.At(at + 1).Value;
    if (next === "/") {
      at += 2;
      while (at < count && document.At(at).Value !== "\n") {
        at++;
      }
      continue;
    }
    if (next === "*") {
      at += 2;
      while (at + 1 < count && !(document.At(at).Value === "*" && document.At(at + 1).Value === "/")) {
        at++;
      }
      at += 2;
      continue;
    }
  }
  return ch;
}
return "";
```

## static method NextWord:(last:Source | null)=>string

从 `last` 之后的下一个位置起，跳过空白与注释，读一个标识符词；读不到（越界 / 非标识符字符）返回空串。

它只服务「可选关键字是不是还在文档后面」这一种判据（`else` / `catch` / `finally`），不看 token 层：`catch` 之类的关键字还没被 token 化时，扫描器仍要能回答「还要不要等」。

```ts
if (last === null) {
  return "";
}
const document = last.Document;
const count = document.GetCount();
let at = last.Index + 1;
while (at < count) {
  const ch = document.At(at).Value;
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\v" || ch === "\f") {
    at++;
    continue;
  }
  if (ch === "/" && at + 1 < count) {
    const next = document.At(at + 1).Value;
    if (next === "/") {
      at += 2;
      while (at < count && document.At(at).Value !== "\n") {
        at++;
      }
      continue;
    }
    if (next === "*") {
      at += 2;
      while (at + 1 < count && !(document.At(at).Value === "*" && document.At(at + 1).Value === "/")) {
        at++;
      }
      at += 2;
      continue;
    }
  }
  break;
}
const word:Array<string> = [];
while (at < count) {
  const ch = document.At(at).Value;
  if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_" || ch === "$") {
    word.push(ch);
    at++;
    continue;
  }
  break;
}
return word.join("");
```

## static method ScanTry:(code:Array<Token>, at:int)=>StatementScanResult

`try` 的可选部分（`catch` / `finally`）用同一个「文档里下一个词」判据等：块到齐时下一个词是它们就继续等，否则收尾。

```ts
if (at + 1 >= code.length) {
  return StatementScanner.NeedMore();
}
if (!StatementScanner.IsBracket(code[at + 1], "{")) {
  return StatementScanner.Mismatch();
}
const tryBlock = at + 1;
const next = tryBlock + 1;
if (next < code.length) {
  if (StatementScanner.IsKeyword(code[next], "catch")) {
    return StatementScanner.ScanCatch(code, next);
  }
  if (StatementScanner.IsKeyword(code[next], "finally")) {
    return StatementScanner.ScanFinally(code, next);
  }
  return StatementScanner.Complete(tryBlock);
}
const word = StatementScanner.NextWord(code[tryBlock].SourceRange.End);
if (word === "catch" || word === "finally") {
  return StatementScanner.NeedMore();
}
return StatementScanner.Complete(tryBlock);
```

## static method ScanCatch:(code:Array<Token>, catchAt:int)=>StatementScanResult

`catch` 后面可以跟一个 `( 绑定 )`，然后必须是一个 `{ … }` 块；块到齐后再看 `finally`。

```ts
let cursor = catchAt + 1;
if (cursor >= code.length) {
  return StatementScanner.NeedMore();
}
if (StatementScanner.IsBracket(code[cursor], "(")) {
  cursor++;
}
if (cursor >= code.length) {
  return StatementScanner.NeedMore();
}
if (!StatementScanner.IsBracket(code[cursor], "{")) {
  return StatementScanner.Mismatch();
}
const catchBlock = cursor;
const next = catchBlock + 1;
if (next < code.length) {
  if (StatementScanner.IsKeyword(code[next], "finally")) {
    return StatementScanner.ScanFinally(code, next);
  }
  return StatementScanner.Complete(catchBlock);
}
if (StatementScanner.NextWord(code[catchBlock].SourceRange.End) === "finally") {
  return StatementScanner.NeedMore();
}
return StatementScanner.Complete(catchBlock);
```

## static method ScanFinally:(code:Array<Token>, finallyAt:int)=>StatementScanResult

```ts
const blockAt = finallyAt + 1;
if (blockAt >= code.length) {
  return StatementScanner.NeedMore();
}
if (!StatementScanner.IsBracket(code[blockAt], "{")) {
  return StatementScanner.Mismatch();
}
return StatementScanner.Complete(blockAt);
```
