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

## field Status:int = 0

## field End:int = -1

## constructor:(status:int, end:int)=>void

```ts
this.Status = status;
this.End = end;
```

# class StatementScanner

## static field AtEOF:bool = false

## static field ContentDocument:Document | null = null

## static field ContentText:string = ""

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

## static method IsInstantiationClose:(code:Array<Token>, index:int)=>bool

```ts
return AngleJudge.IsInstantiationClose(code, index);
```

## static method IsCallishUnit:(unit:Token)=>bool

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

```ts
// 单一来源：函数体已搬到 `StatementBoundaryUtil.EndsAtLineBreak`（逐字搬迁，零行为变化）。
// 扫描器这里只留一行委托，形态与 `ExpressionStatementPossibleShape.IsAsiBoundary` 的委托一致。
return StatementBoundaryUtil.EndsAtLineBreak(code, previousIndex, nextIndex);
```

## static method EndsAtLineBreakBefore:(units:Array<Token>, current:int)=>bool

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

```ts
return !LineTerminator.HasBetween(left.SourceRange, right.SourceRange);
```

## static method HasLineBreakBefore:(units:Array<Token>, at:int)=>bool

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

```ts
return text === "class" || text === "interface" || text === "enum" || text === "type"
  || text === "namespace" || text === "module" || text === "global" || text === "function";
```

## static method DecoratedHeadKeyword:(code:Array<Token>, at:int)=>int

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
