# dependencies
```xl
import { Token } from "../../../core/syntax/token.xl.md"
import { Document } from "../../../core/syntax/document.xl.md"
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { RegexToken } from "../../../core/syntax/basic-tokens/regex-token.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { ExpressionStatementPossibleShape } from "./expression-statement-possible-shape.xl.md"
import { StatementBoundaryUtil } from "./statement-boundary-util.xl.md"
import { StatementLegacyMetrics } from "./statement-legacy-metrics.xl.md"
import { LineTerminator } from "../../run/line-terminator.xl.md"
import { AngleJudge } from "../types/angle-judge.xl.md"
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

`AtEOF` 是文件末尾的判别位：根在最后一个真实位置已经被签出（`SourceRange.EndIndex >= 0`）时，候选把「本层没有后续单元」当成 ASI 收尾，而不是继续等 `else` / `;`。

## static field AtEOF:bool = false

## static field ContentDocument:Document | null = null

`ContentText` 缓存对应的文档。解析按文件串行，换一个文档才重取（`GetRaw(0, count)` 在半开区间覆盖全文时返回原串本身，不拷贝）。

## static field ContentText:string = ""

`ContentDocument` 的全文：`NextChar` 的逐字符读取与注释整段跳都在这份串上做，避免每字符一次 `SourceRange.At`。

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

## static method IsReservedWord:(text:string)=>bool

保留字（TS 的 `LastReservedWord` 及以下）：绑定标识符**不能**是它们。上下文关键字
（`let` / `async` / `await` / `yield` / `of` / `as` / `type` / `declare` …）不在表里，
可以当绑定名——`let let = 1` / `let await = 1` 在 TS 里都是合法声明。

```ts
return text === "break" || text === "case" || text === "catch" || text === "class"
  || text === "const" || text === "continue" || text === "debugger" || text === "default"
  || text === "delete" || text === "do" || text === "else" || text === "enum"
  || text === "export" || text === "extends" || text === "false" || text === "finally"
  || text === "for" || text === "function" || text === "if" || text === "import"
  || text === "in" || text === "instanceof" || text === "new" || text === "null"
  || text === "return" || text === "super" || text === "switch" || text === "this"
  || text === "throw" || text === "true" || text === "try" || text === "typeof"
  || text === "var" || text === "void" || text === "while" || text === "with";
```

## static method StartsBinding:(code:Array<Token>, index:int)=>bool

`index` 这一格能不能起一个绑定：标识符（非保留字的 Common）或 `[` / `{` 括号。
与 TS 的 `nextTokenIsBindingIdentifierOrStartOfDestructuring` 同口径（`let` 用它）。

```ts
if (index < 0 || index >= code.length) {
  return false;
}
const unit = code[index];
if (unit instanceof Bracket) {
  const start = (unit as Bracket).StartBracketChar;
  return start === "[" || start === "{";
}
if (unit instanceof Common) {
  return !StatementScanner.IsReservedWord((unit as Common).TempToString());
}
return false;
```

## static method StartsUsingDeclaration:(code:Array<Token>, keywordAt:int, index:int)=>bool

`using` 声明要求**同一行**跟绑定标识符或 `{`（TS 的
`nextTokenIsBindingIdentifierOrStartOfDestructuringOnSameLine`）：`[` 不在内——
`using [a] = b` 是 `using[a] = b` 的元素访问赋值，不是声明。

```ts
if (index < 0 || index >= code.length || keywordAt < 0 || keywordAt >= code.length) {
  return false;
}
if (!StatementScanner.NoLineBreakBetween(code[keywordAt], code[index])) {
  return false;
}
const unit = code[index];
if (unit instanceof Bracket) {
  return (unit as Bracket).StartBracketChar === "{";
}
if (unit instanceof Common) {
  return !StatementScanner.IsReservedWord((unit as Common).TempToString());
}
return false;
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

**Stage 5d-1a 计数器（零行为变化）**：入口先给 `StatementLegacyMetrics.ScanRootCallCount` 自增——只加一个静态整数，
不读、不改任何状态，返回值与分支逐字节不变。它量的是「还有多少语句判界要问这支 legacy 扫描器」，退场判据是它归零。

```ts
StatementLegacyMetrics.ScanRootCallCount++;
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
      if (secondText === "const" && StatementScanner.NextWord(second.SourceRange.Document, second.SourceRange.EndIndex) === "enum") {
        return StatementScanner.Mismatch();
      }
      if ((secondText === "let" || secondText === "const" || secondText === "var" || secondText === "using")
        && StatementScanner.NoLineBreakBetween(first, second)) {
        return StatementScanner.ScanToSemicolon(code, 2, true);
      }
    }
    return StatementScanner.Mismatch();
  }
  if (text === "const" || text === "var") {
    // `const enum E {…}` (also `const\tenum` / `const\nenum`): the enum declaration candidate owns
    // this form, so the variable-statement candidate must yield instead of scanning to `;`.
    // Raw lookahead, because `enum` may not be tokenized yet when `const` arrives.
    if (text === "const" && StatementScanner.NextWord(first.SourceRange.Document, first.SourceRange.EndIndex) === "enum") {
      return StatementScanner.Mismatch();
    }
    return StatementScanner.ScanToSemicolon(code, 1, true);
  }
  // `let` 是上下文关键字（不是保留字）：只有**下一格能起绑定**（标识符 / `[` / `{`）时它才是
  // 变量声明；否则它仍是一个普通标识符——`let = 1` 是赋值表达式语句、`let: 1` 是标签、
  // `let (a)` 是调用。判据与 TS 的 `isLetDeclaration`（lookAhead 到
  // `nextTokenIsBindingIdentifierOrStartOfDestructuring`）一致。
  if (text === "let") {
    if (code.length >= 2 && StatementScanner.StartsBinding(code, 1)) {
      return StatementScanner.ScanToSemicolon(code, 1, true);
    }
    if (code.length === 1 && !StatementScanner.AtEOF) {
      return StatementScanner.NeedMore();
    }
    // 落到下面的标签判据 / `Mismatch`：让位置给表达式候选。
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
  // `using` 也是上下文关键字：TS 的 `isUsingDeclaration` 要求**同一行**跟绑定标识符或 `{`
  // （`[` 不在内：`using [a] = b` 被解析成 `using[a] = b` 的元素访问赋值）。
  if (text === "using") {
    if (code.length >= 2 && StatementScanner.StartsUsingDeclaration(code, 0, 1)) {
      return StatementScanner.ScanToSemicolon(code, 2);
    }
    if (code.length === 1 && !StatementScanner.AtEOF) {
      return StatementScanner.NeedMore();
    }
    // `using = 1` / `using: 1` / `using;`：标识符，落到标签判据 / Mismatch。
  }
  // await using：只认「await 后紧跟 using，且 using 后面同一行能起绑定」，其余 await … 交回表达式候选。
  if (text === "await") {
    if (code.length === 1) {
      if (StatementScanner.AtEOF) {
        return StatementScanner.Mismatch();
      }
      // 还不能判：可能是 `await using` 声明，也可能是 await 表达式语句。
      return StatementScanner.NeedMore();
    }
    if (StatementScanner.IsKeyword(code[1], "using")) {
      if (code.length === 2) {
        if (StatementScanner.AtEOF) {
          // `await using` 到头：`using` 是 await 的操作数（表达式语句），不是声明。
          return StatementScanner.Mismatch();
        }
        return StatementScanner.NeedMore();
      }
      if (StatementScanner.StartsUsingDeclaration(code, 1, 2)) {
        return StatementScanner.ScanToSemicolon(code, 3);
      }
      return StatementScanner.Mismatch();
    }
    return StatementScanner.Mismatch();
  }
  // Root-level labeled statement: Identifier ":" statement.
  // A plain identifier start keeps this candidate alive only when the raw text after it
  // (skipping trivia) is ":"; anything else is an expression statement, handled by the
  // expression candidate at exactly the same trigger as before.
  if (code.length === 1) {
    if (StatementScanner.NextChar(first.SourceRange.Document, first.SourceRange.EndIndex) === ":") {
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
  if (text === "const" || text === "var") {
    // Same yield as the root dispatch: `const enum …` belongs to the enum declaration candidate.
    if (text === "const" && StatementScanner.NextWord(code[at].SourceRange.Document, code[at].SourceRange.EndIndex) === "enum") {
      return StatementScanner.ScanDeclarationBody(code, at);
    }
    return StatementScanner.ScanToSemicolon(code, at + 1);
  }
  // `let` 双角色（与 ScanRoot 同一判据）：后面能起绑定才是声明，否则按标识符走标签 / 表达式体。
  if (text === "let") {
    if (at + 1 < code.length && StatementScanner.StartsBinding(code, at + 1)) {
      return StatementScanner.ScanToSemicolon(code, at + 1);
    }
    if (at + 1 >= code.length && !StatementScanner.AtEOF) {
      return StatementScanner.NeedMore();
    }
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
    if (at + 1 < code.length && StatementScanner.StartsUsingDeclaration(code, at, at + 1)) {
      return StatementScanner.ScanToSemicolon(code, at + 1);
    }
    if (at + 1 >= code.length && !StatementScanner.AtEOF) {
      return StatementScanner.NeedMore();
    }
  }
  if (text === "await") {
    if (at + 1 < code.length && StatementScanner.IsKeyword(code[at + 1], "using")) {
      if (at + 2 >= code.length) {
        if (!StatementScanner.AtEOF) {
          return StatementScanner.NeedMore();
        }
      } else if (StatementScanner.StartsUsingDeclaration(code, at + 1, at + 2)) {
        return StatementScanner.ScanToSemicolon(code, at + 2);
      }
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
  if (at > from && (StatementScanner.EndsAtLineBreak(code, at - 1, at)
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

## static method IsTypePositionBefore:(code:Array<Token>, index:int)=>bool

`code[index]` 是类型实参表的 `<`：它**左边**最近的那个「上下文决定词」是不是类型位。

只认三种上下文：`:`（变量 / 参数 / 属性的类型注解）、`as` / `satisfies`（断言位）、`extends` /
`implements`（heritage 位）。往前扫时跳过的都是类型引用自身可能出现的单元（标识符、`.`、`|`、`&`、
`[]` 括号、`keyof` / `typeof` / `readonly` 等类型运算符）；**碰到 `=` 或值位运算符就判否**——
`a < b >` 的 `<` 左边是 `a` 再往左就是语句起点，不可能是类型位，仍走旧的比较式路径。

`?` 一律判否：条件类型 / 三元的分支里再出现 `<` 时，这里不做猜测（漏判只会退回旧行为，不会误切）。

```ts
if (index <= 0 || index >= code.length) {
  return false;
}
for (let at = index - 1; at >= 0; at--) {
  const unit = code[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Symbol) {
    const text = (unit as Symbol).TempToString();
    if (text === ":") {
      return true;
    }
    if (text === "=>" || text === "?" || text === "=" || text === "+" || text === "-" || text === "*"
      || text === "/" || text === "%" || text === "==" || text === "===" || text === "!="
      || text === "!==" || text === "!" || text === "~" || text === ";" || text === "?.") {
      // `=>` 是箭头体起点、`?` 是三元 / 条件类型分支：这里剩下的都是「值位」上下文，不能当类型位。
      return false;
    }
    if (text === "|" || text === "&" || text === "." || text === "," || text === "["
      || text === "]" || text === "(" || text === ")" || text === "<" || text === ">"
      || text === ">>" || text === ">>>") {
      continue;
    }
    return false;
  }
  if (unit instanceof Common) {
    const text = (unit as Common).TempToString();
    if (text === "as" || text === "satisfies" || text === "extends" || text === "implements") {
      return true;
    }
    if (text === "keyof" || text === "typeof" || text === "readonly" || text === "unique"
      || text === "infer" || text === "is" || text === "asserts" || text === "new") {
      continue;
    }
    // 其余标识符是类型引用自身的名字（`Foo` / `Bar`），继续往左找上下文。
    continue;
  }
  if (unit instanceof Bracket) {
    continue;
  }
  continue;
}
return false;
```

## static method IsTypeArgumentClose:(code:Array<Token>, index:int)=>bool

`code[index]` 是不是**类型实参表的闭合 `>`**（`Foo<Bar>` / `Foo<Bar<Baz>>` 的最后一格）。

判据不新写角括号扫描：配对交给 `AngleJudge.FindClose`（唯一实现点），这里只补两件事——
① 这个 `>` 必须是某个 `<` 的配对闭合；② 那个 `<` 必须坐在类型位（`IsTypePositionBefore`）。
第二条是防误判的闸：`a < b >`（比较式）的 `<` 不在类型位，返回 false，仍走旧的表达式路径。

`>>` / `>>>`（嵌套类型实参的合符号）同样成立：`FindClose` 会把它们在那一格收多层。

```ts
if (index < 0 || index >= code.length) {
  return false;
}
const unit = code[index];
if (!(unit instanceof Symbol)) {
  return false;
}
const text = (unit as Symbol).TempToString();
if (text !== ">" && !AngleJudge.IsSplitClose(text)) {
  return false;
}
for (let at = index - 1; at >= 0; at--) {
  const opener = code[at];
  if (opener.IsTriviaToken || !(opener instanceof Symbol) || !(opener as Symbol).Is("<")) {
    continue;
  }
  if (AngleJudge.FindClose(code, at) !== index) {
    continue;
  }
  return StatementScanner.IsTypePositionBefore(code, at);
}
return false;
```

## static method IsCallishUnit:(unit:Token)=>bool

换行之后到来的这一格是不是「调用 / 下标 / 标签模板」位：`(`、`[` 括号或反引号模板。
只有这三类才需要问「上一条表达式能不能当调用者 / 标签模板宿主」。

```ts
if (unit instanceof Bracket) {
  const start = (unit as Bracket).StartBracketChar;
  return start === "(" || start === "[";
}
if (unit instanceof String) {
  return (unit as String).StringChar === "`";
}
return false;
```

## static method IsCallPositionBlocked:(code:Array<Token>, last:int)=>bool

`last` 收尾的那条表达式**不能**当调用者 / 标签模板宿主，因此换行后的 `(` / `[` / 模板
只能是新语句（TS 在那里插 ASI）。判据与 TS 的解析结果同源——`(` 能接上，当且仅当已经解析出的
表达式是 LeftHandSideExpression：

- `as` / `satisfies` 右半是**类型**：类型之后不能再接 `(`（`a as T (b)` 是语法错）→ 断；
- 块体箭头函数 `() => {}` 已经完整、也不是调用者 → 断（表达式体箭头不同：调用接在体的表达式上，
  `() => x` ⏎ `(b)` = `() => x(b)`，不断）；
- 其余（标识符 / 字面量 / 括号单元 / 成员访问 / 调用 / 对象字面量 / 函数与类表达式）都能接。

扫描是**平**的：括号单元各自完整（`(…)` / `[…]` / `{…}` 在 `Data` 里各是一个单元），
所以遇到括号单元直接跳过，不数深度。`<` `>` `>>` `>>>`（类型实参 / 比较歧义）、`|` `&`
（联合 / 交叉类型）、`?` `:`（条件类型 / 三元）都可能还在类型位里，继续往回找 `as`。

```ts
let at = last;
while (at >= 0 && code[at].IsTriviaToken) {
  at--;
}
if (at < 0) {
  return false;
}
const tail = code[at];
// 后缀 `++` / `--`：结果不是调用者 / 标签模板宿主（TS 的 UpdateExpression 不在
// LeftHandSideExpression 里），换行后的 `(` / `[` / 模板只能是新语句。
if (tail instanceof Symbol) {
  const tailText = (tail as Symbol).TempToString();
  if (tailText === "++" || tailText === "--") {
    let before = at - 1;
    while (before >= 0 && code[before].IsTriviaToken) {
      before--;
    }
    if (before >= 0 && StatementScanner.NoLineBreakBetween(code[before], tail)
      && StatementScanner.EndsExpression(code[before])) {
      return true;
    }
  }
}
// 块体箭头函数：`=>` 后面紧跟的 `{…}` 就是它的体，箭头已完整且不是调用者。
if (tail instanceof Bracket && (tail as Bracket).StartBracketChar === "{") {
  let before = at - 1;
  while (before >= 0 && code[before].IsTriviaToken) {
    before--;
  }
  if (before >= 0 && code[before] instanceof Symbol && (code[before] as Symbol).Is("=>")) {
    return true;
  }
}
while (at >= 0) {
  const unit = code[at];
  if (unit.IsTriviaToken) {
    at--;
    continue;
  }
  if (unit instanceof Bracket) {
    // 括号单元自成整体：它的内容不改变「外层最后一个操作数」是谁。
    at--;
    continue;
  }
  if (unit instanceof String || unit instanceof RegexToken) {
    at--;
    continue;
  }
  if (unit instanceof Common) {
    const text = (unit as Common).TempToString();
    // 类型位：`as` / `satisfies` 右半的类型之后不能再接 `(` / `[` / 模板。
    if (text === "as" || text === "satisfies") {
      return true;
    }
    // 明确的二元关键字：类型到这里已经结束，`(` 接在右操作数上。
    if (text === "in" || text === "instanceof") {
      return false;
    }
    at--;
    continue;
  }
  if (unit instanceof Symbol) {
    const text = (unit as Symbol).TempToString();
    // 表达式体箭头：调用接在体的表达式上，不是新语句。
    if (text === "=>") {
      return false;
    }
    // 类型实参 / 比较歧义、联合与交叉、条件类型、成员访问：都还可能在类型位里（或只是
    // 访问后缀），继续往回找 `as`。
    if (text === "<" || text === ">" || text === ">>" || text === ">>>"
      || text === "|" || text === "&" || text === "?" || text === ":"
      || text === "." || text === "?.") {
      at--;
      continue;
    }
    // 其它符号都是表达式运算符：最后一个操作数在它右边，`(` 接在那个操作数上。
    return false;
  }
  return false;
}
return false;
```

## static method EndsAtLineBreak:(code:Array<Token>, previousIndex:int, nextIndex:int)=>bool

`previous` 能收尾、`next` 接不上、两者之间有换行 —— 三者都成立就是 ASI 边界。
调用 / 下标 / 标签模板位另有一条：`next` 虽然「接得上」（`(` 通常是续接），但当上一条表达式
不能当调用者时就接不上——与 `ExpressionStatementPossibleShape.IsAsiBoundary` 读同一个判据。

```ts
// 单一来源：函数体已搬到 `StatementBoundaryUtil.EndsAtLineBreak`（逐字搬迁，零行为变化）。
// 扫描器这里只留一行委托，形态与 `ExpressionStatementPossibleShape.IsAsiBoundary` 的委托一致。
return StatementBoundaryUtil.EndsAtLineBreak(code, previousIndex, nextIndex);
```

## static method EndsAtLineBreakBefore:(units:Array<Token>, current:int)=>bool

`units[current]` 是当前代码单元；把它前面紧邻的那个代码单元与它交给 `EndsAtLineBreak` 判一次 ASI。
给「手里直接是 `host.Data`（带 trivia）、没有先抽成 code 数组」的候选共用：export 家族的
`export const|let|var` / `export declare …` 无分号收口。判据仍然只有 `EndsAtLineBreak` 一份
（含调用位 / 类型实参收尾 `>` 两条），所以与根变量语句不会一边断、一边不断。

```ts
if (current <= 0 || current >= units.length) {
  return false;
}
let previous = current - 1;
while (previous >= 0 && units[previous].IsTriviaToken) {
  previous--;
}
if (previous < 0) {
  return false;
}
return StatementScanner.EndsAtLineBreak(units, previous, current);
```

## static method ScanReturnOrThrow:(code:Array<Token>, keywordAt:int)=>StatementScanResult

`return` / `throw` 的受限产生式：**关键字之后换行**时语句停在关键字上（`throw\na;` = throw; a;，
`return\nc;` = return; c;）。TS 的 `ReturnStatement` / `ThrowStatement` 用的是
`return [no LineTerminator here] Expression? ;` 的受限产生式，换行后没有操作数。
TS 对 `throw` 的恢复形是 `ThrowStatement` + 零宽 `Identifier` 子节点（Builder 侧补），扫描这里只负责收口。

少了 `return` 这一支，`return` 会一路吃到**下一条语句的 `;`**，`Build` 时报「语句没有读完」
（`return` ⏎ `c;`、`lbl: return` ⏎ `c;`、`while (a) return` ⏎ `c;` 都是这个原因）。

```ts
if (keywordAt + 1 < code.length
  && !StatementScanner.NoLineBreakBetween(code[keywordAt], code[keywordAt + 1])) {
  // 换行后的 `;` 仍是这条语句的终止符：TS 给 `throw` ⏎ `;` 的 AST 是
  // ThrowStatement[0,7] + 零宽 Identifier[5,5]（`;` 计入 End，不再另起 EmptyStatement）；
  // `return` ⏎ `;` 同理（ReturnStatement 的 End 含分号）。
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

`debugger` 这类简单语句：`;` 或 EOF 收口之外，**换行处也按 ASI 收口**——
`debugger` ⏎ `c;` 是两条语句（TS 在 `debugger` 后插 ASI）。没有这一条，`debugger` 候选在
`c` 那一格 `Mismatch`，整段 leftover 一直拖到 EOF 哨兵，再被 `BuildTrailingDeclaration`
按一条语句建出来，后面的语句就整条丢掉。

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
if (from > 0 && StatementScanner.EndsAtLineBreak(code, from - 1, from)) {
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
if (from > 0 && StatementScanner.EndsAtLineBreak(code, from - 1, from)) {
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
if (StatementScanner.EndsAtLineBreak(code, from, from + 1)) {
  return StatementScanner.Complete(from);
}
return StatementScanner.Mismatch();
```

## static method ScanExpressionBody:(code:Array<Token>, at:int, stopAtWhile?:bool)=>StatementScanResult

语句体里的表达式语句也要认 **ASI 边界**：`while (a) b` ⏎ `c;` 的体在 `b` 处就被换行收住
（TS 在 `b` 之后插 ASI，`c;` 是下一条语句）。少了这一条，体扫描会一路吃到下一条语句的 `;`，
`Build` 时报「语句没有读完」。

判据与 `ScanToSemicolon` 的同类规则、`StatementBuilder.ContinuesAcrossLine` 同一张表：
前一个代码单元能收尾 + 两者之间有换行 + 当前单元不是续接符。
**当前单元是 `;` 时不算 ASI**：`b` ⏎ `;` 里的 `;` 就是这条语句自己的终止符（`parseSemicolon`
跨行照收），交给下面的 `;` 分支，不能让它变成下一条空语句。

```ts
for (let cursor = at; cursor < code.length; cursor++) {
  // do 体（`stopAtWhile`）：换行后遇到 `while` 关键字 ⇒ 体到此为止，那一格属于 do-while 的条件头。
  // 判据复用 `EndsAtLineBreak`（前一个代码单元能收尾 + 换行 + `while` 不是表达式的续接符）。
  if ((stopAtWhile ?? false) && cursor > at
    && StatementScanner.IsKeyword(code[cursor], "while")
    && StatementScanner.EndsAtLineBreak(code, cursor - 1, cursor)) {
    return StatementScanner.Complete(cursor - 1);
  }
  // 体的终点是下一条块语句的 `{`：上一单元能收住表达式，且**从体起点往回看**没有等体的头。
  // `if (a) b` 的 `if` 是这条语句自己的头（体 `b` 已经给了），不算等体；
  // `if (a) function f ()` 的 `function` 在体起点上，仍在界内，照样算等体（`{` 是函数体）。
  // 同行块也算：TS 里 `if (a) b { }` 是 if(b) + 块两条语句；`{` 在表达式后面永远不是续接符。
  let bodyTail = cursor - 1;
  while (bodyTail > at && code[bodyTail].IsTriviaToken) {
    bodyTail--;
  }
  if (bodyTail >= at
    && code[cursor] instanceof Bracket && (code[cursor] as Bracket).StartBracketChar === "{"
    && ExpressionStatementPossibleShape.CanEndExpression(code[bodyTail])
    && !ExpressionStatementPossibleShape.ExpectsBodyBefore(code, bodyTail, at)) {
    return StatementScanner.Complete(bodyTail);
  }
  // ASI：换行处收口语句体（`while (a) b` ⏎ `c;` / `if (a) b` ⏎ `else c` / `lab: a` ⏎ `c;`）。
  // 判据只有一份：`StatementBoundaryUtil.EndsAtLineBreak`（设计 §2.4 第 5 步、§5 Stage 2）。
  if (cursor > at
    && !StatementScanner.IsSymbol(code[cursor], ";")
    && StatementScanner.EndsAtLineBreak(code, cursor - 1, cursor)) {
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
  // 换行 ASI：与 `StatementBuilder.BuildExpressionStatement` /
  // `ExpressionStatementPossibleShape.ExpressionEnd` 读同一套判据——体是表达式语句时，
  // 前一个代码单元能收尾、当前单元接不上，就是体的终点。没有这一条，
  // `let: 1` ⏎ `a();` 的体会一路吃到下一句的 `;`，把后面的语句吞进来。
  if (cursor > at && StatementScanner.EndsAtLineBreak(code, cursor - 1, cursor)) {
    return StatementScanner.Complete(cursor - 1);
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
if (StatementScanner.NextWord(code[body.End].SourceRange.Document, code[body.End].SourceRange.EndIndex) === "else") {
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
  // 体已经收口、本层再没有单元：`while` 缺失（`do` ⏎ `{}`）。TS 的恢复形是
  // DoStatement + 体 + 零宽 Identifier 条件；到 EOF 时按体尾收口（Builder 补那个零宽占位），
  // 还没到 EOF 就继续等（后面可能还有 `while`）。
  if (StatementScanner.AtEOF) {
    return StatementScanner.Complete(body.End);
  }
  return StatementScanner.NeedMore();
}
if (StatementScanner.IsKeyword(code[whileAt], "while")) {
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
  const headerEnd = (code[whileAt + 1] as Bracket).SourceRange.EndIndex;
  const nextChar = StatementScanner.NextChar((code[whileAt + 1] as Bracket).SourceRange.Document, headerEnd);
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
}
// **缺 `while` 的恢复形**（TS parseDoStatement 的错误恢复：`parseExpected(WhileKeyword)` 报错但不消费）：
// 条件位就是一个表达式——`do b` ⏎ `{}` 的 `{}` 在 TS 里是条件位的对象字面量（DoStatement [0,7]，
// body=ExpressionStatement、condition=ObjectLiteralExpression）。体已经在 `b` 处按 ASI 收住（`stopAtWhile`
// 那条判据），所以这里绝不能把 `{}` 再当体的续接。
const conditionEnd = StatementScanner.ScanConditionEnd(code, whileAt);
if (conditionEnd < 0) {
  return StatementScanner.Mismatch();
}
return StatementScanner.Complete(conditionEnd);
```

## static method ScanConditionEnd:(code:Array<Token>, from:int)=>int

**do-while 条件位的恢复形尾界**：`while` / `(` 缺失时，TS 仍把条件位读成一个表达式，DoStatement 收在
那个表达式的末尾。返回最后一个属于条件表达式的代码单元下标；`from >= code.length` 返回 `-1`（没有条件单元）。

扫描只做「这个表达式还能不能接下去」：`ExpressionStatementPossibleShape.IsContinuation` 认的续接符继续吃，
吃到 `;` / EOF / 接不上的单元为止。调用位括号（`(` / `[` / 反引号模板）是**整单元**，吃完还是完整表达式；
其余续接符（二元 / 赋值 / 成员 / 三元 / 逗号 / 箭头 / `in` 等）后面必须再吃一格右操作数——
`do b` ⏎ `{}` 的 `{}` 是完整对象字面量，后面紧跟的 `while` 不是续接符，条件就在 `{}` 收住。

判据与 ASI / 表达式语句读同一张续接表（`IsContinuation`），不新写第二份表达式文法。

```ts
if (from < 0 || from >= code.length) {
  return -1;
}
let at = from;
let expectOperand = false;
while (at + 1 < code.length) {
  const next = code[at + 1];
  if (StatementScanner.IsSymbol(next, ";") || StatementScanner.IsEOF(next)) {
    break;
  }
  if (expectOperand) {
    // 运算符 / 成员访问 / `?` `:` 之后的那一格就是右操作数。
    expectOperand = false;
    at++;
    continue;
  }
  if (!ExpressionStatementPossibleShape.IsContinuation(next)) {
    break;
  }
  at++;
  // 调用 / 下标 / 标签模板是整单元，吃完仍是完整表达式；其余续接符要等右操作数。
  const callish = next instanceof Bracket
    || (next instanceof String && (next as String).StringChar === "`");
  expectOperand = !callish;
}
return at;
```

## static method NoLineBreakBetween:(left:Token, right:Token)=>bool

两个 token 的原始文本之间（`left.EndIndex` 到 `right.StartIndex - 1`，即半开 `[left.EndIndex, right.StartIndex)`）有没有换行；
块注释里的换行也算换行。用于 `declare` 与变量关键字之间：同一行才是同一个 ambient 变量语句。
行终止符口径统一交给 `LineTerminator`（LF / CR / U+2028 / U+2029，cover8-A）。

```ts
return !LineTerminator.HasBetween(left.SourceRange, right.SourceRange);
```

## static method HasLineBreakBefore:(units:Array<Token>, at:int)=>bool

`units[at]` 前面紧邻的非 trivia 单元与它之间有没有换行（块注释里的换行也算）。
与 `NoLineBreakBetween` 共用同一份行终止符口径（LF / CR / U+2028 / U+2029，cover8-A），
供「换行后的 `@` 是下一条声明的装饰器前缀」判据使用。

```ts
if (at <= 0 || at >= units.length) {
  return false;
}
let previous = at - 1;
while (previous >= 0 && units[previous].IsTriviaToken) {
  previous--;
}
if (previous < 0) {
  return false;
}
return !StatementScanner.NoLineBreakBetween(units[previous], units[at]);
```

## static method IsDecoratedDeclarationStart:(units:Array<Token>, at:int)=>bool

`at` 这一格是不是「换行之后开始的带装饰器的新声明」：`unit = @` 且与上一个非 trivia 单元之间有换行。
装饰器在 TS 词法里是 Symbol `@`（不是 `Common`），`IsStatementWord` 那条 ASI 判据看不到它；
`declare function f(): void` ⏎ `@dec class C {}` 会在 `@` 处被继续当成返回类型内容，最终把下一条声明
的 `{…}` 收成函数体。这里把「换行后的 `@`」与 statement word 同等对待（与
`FunctionDeclarationPossibleShape.IsDecoratedDeclarationStart` 同一份判据，两处共读这一个函数）。

```ts
if (at < 0 || at >= units.length) {
  return false;
}
if (!(units[at] instanceof Symbol) || !(units[at] as Symbol).Is("@")) {
  return false;
}
return StatementScanner.HasLineBreakBefore(units, at);
```

## static method IsDeclarationKeyword:(text:string)=>bool

装饰器声明头的**声明词**表：装饰器前缀（可跨行、可多个）与修饰词之后，只有这些词才让整段
成一条声明。`abstract` 是修饰词不是声明词（`@dec abstract class` 归到 `class`）。
变量声明（`const` / `let` / `var` / `using`）不在表里：根级 `@dec` + 变量声明的分派由
`StatementBuilder.BuildDecoratedStatement` 负责，EOF 尾随段这里不抢。

```ts
return text === "class" || text === "interface" || text === "enum" || text === "type"
  || text === "namespace" || text === "module" || text === "global" || text === "function";
```

## static method DecoratedHeadKeyword:(code:Array<Token>, at:int)=>int

`code[at]` 是 `@`（装饰器前缀的起点，可跨行）：把**装饰器前缀 + 修饰词**整段扫完，返回紧随其后的
声明词下标；不是「装饰器 + 声明头」时返回 `-1`。

- 装饰器表达式：`@dec` / `@a.b` / `@dec(…)` / `@dec(…) .b`（括号 / 下标是整单元，`(…)` 直接跳过）；
- 修饰词：`export` / `default` / `declare` / `abstract` / `async` / `const`，按 TS 的书写顺序；
- 收尾：`IsDeclarationKeyword` 认的词才返回下标；别的返回 `-1`。

读法只到**声明词**为止，不再深入声明体：调用方按声明词分派到对应 `FromUnits`，
装饰器的形状由那些 `FromUnits` 自己建（它们都从段首重新扫装饰器）。

```ts
if (at < 0 || at >= code.length) {
  return -1;
}
let index = at;
while (index < code.length && code[index] instanceof Symbol && (code[index] as Symbol).Is("@")) {
  index++;
  if (index >= code.length) {
    return -1;
  }
  if (code[index] instanceof Bracket && (code[index] as Bracket).StartBracketChar === "(") {
    // `@(expr)`：括号表达式整单元。
    index++;
  } else if (code[index] instanceof Common) {
    index++;
    // 限定名 `@ns.dec`
    while (index + 1 < code.length
      && code[index] instanceof Symbol && (code[index] as Symbol).Is(".")
      && code[index + 1] instanceof Common) {
      index += 2;
    }
  } else {
    return -1;
  }
  // 装饰器调用 `@dec(…)`：括号整单元。
  if (index < code.length && code[index] instanceof Bracket
    && (code[index] as Bracket).StartBracketChar === "(") {
    index++;
  }
}
while (index < code.length && code[index] instanceof Common) {
  const text = (code[index] as Common).TempToString();
  if (text === "export" || text === "default" || text === "declare" || text === "abstract"
    || text === "async" || text === "const") {
    index++;
    continue;
  }
  break;
}
if (index >= code.length || !(code[index] instanceof Common)) {
  return -1;
}
const keyword = (code[index] as Common).TempToString();
if (!StatementScanner.IsDeclarationKeyword(keyword)) {
  return -1;
}
return index;
```

## static method NextChar:(document:Document | null, last:int)=>string

从 `last`（半开终点，即上一个字符的下标 + 1）起，跳过空白与 `//` / `/* */` 注释，返回第一个字符；越界返回空串。
根级标签判据用它回答「标识符后面是不是 `:`」，此时 `:` 可能还没被 token 化。

空白逐字符判；注释用 `indexOf` 整段跳到注释末尾，不再让每个注释字符各走一次 `SourceRange.At`
（`At` 带范围校验、再经 `Document.GetValue` 一次间接调用；长注释占本方法 90% 以上的字符）。

```ts
if (document === null || last < 0) {
  return "";
}
if (document !== StatementScanner.ContentDocument) {
  StatementScanner.ContentDocument = document;
  StatementScanner.ContentText = document.GetRaw(0, document.GetCount());
}
const content = StatementScanner.ContentText;
const count = content.length;
let at = last;
while (at < count) {
  const code = content.charCodeAt(at);
  if (code === 32 || code === 9 || code === 13 || code === 10 || code === 11 || code === 12) {
    at++;
    continue;
  }
  if (code === 47 && at + 1 < count) {
    const next = content.charCodeAt(at + 1);
    if (next === 47) {
      const lineEnd = content.indexOf("\n", at + 2);
      at = lineEnd < 0 ? count : lineEnd + 1;
      continue;
    }
    if (next === 42) {
      const blockEnd = content.indexOf("*/", at + 2);
      at = blockEnd < 0 ? count : blockEnd + 2;
      continue;
    }
  }
  return content[at];
}
return "";
```

## static method NextWord:(document:Document | null, last:int)=>string

从 `last`（半开终点，即上一个字符的下标 + 1）起，跳过空白与注释，读一个标识符词；读不到（越界 / 非标识符字符）返回空串。

它只服务「可选关键字是不是还在文档后面」这一种判据（`else` / `catch` / `finally`），不看 token 层：`catch` 之类的关键字还没被 token 化时，扫描器仍要能回答「还要不要等」。

```ts
if (document === null || last < 0) {
  return "";
}
const count = document.GetCount();
const whole = SourceRange.Whole(document);
let at = last;
while (at < count) {
  const ch = whole.At(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\v" || ch === "\f") {
    at++;
    continue;
  }
  if (ch === "/" && at + 1 < count) {
    const next = whole.At(at + 1);
    if (next === "/") {
      at += 2;
      while (at < count && whole.At(at) !== "\n") {
        at++;
      }
      continue;
    }
    if (next === "*") {
      at += 2;
      while (at + 1 < count && !(whole.At(at) === "*" && whole.At(at + 1) === "/")) {
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
  const ch = whole.At(at);
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
const word = StatementScanner.NextWord(code[tryBlock].SourceRange.Document, code[tryBlock].SourceRange.EndIndex);
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
if (StatementScanner.NextWord(code[catchBlock].SourceRange.Document, code[catchBlock].SourceRange.EndIndex) === "finally") {
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
