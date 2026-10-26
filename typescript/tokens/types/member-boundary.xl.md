# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
import { LineTerminator } from "../../run/line-terminator.xl.md"
```

# namespace cangjie

# class MemberBoundaryScan

## field Boundary:int = -1

## field Checked:int = 1

# class MemberBoundaryCache

## field Code:Array<Token> | null = null

## field From:int = -1

## field Boundary:int = -1

# class MemberBoundary

## static method ScanTypeMemberBoundary:(code:Array<Token>, scan:MemberBoundaryScan)=>void

```ts
if (scan.Boundary >= 0) {
  return;
}
let at = scan.Checked;
if (at < 1) {
  at = 1;
}
while (at < code.length) {
  if (MemberBoundary.HasLineBreakBetween(code[at - 1], code[at])
    && MemberBoundary.CanEndTypeUnit(code[at - 1])
    && !MemberBoundary.IsInitializerIndexContinuation(code, at)) {
    const unit = code[at];
    if (unit instanceof Symbol && (unit as Symbol).Is("<")) {
      if (!MemberBoundary.IsNewKeyword(code[at - 1])
        && !MemberBoundary.IsMemberSignatureAwaitingParams(code, at)) {
        scan.Boundary = at;
        return;
      }
    } else if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "(") {
      if (!MemberBoundary.IsNewKeyword(code[at - 1])
        && !MemberBoundary.IsMemberSignatureAwaitingParams(code, at)
        && !MemberBoundary.IsImportTypeArguments(code, at)) {
        scan.Boundary = at;
        return;
      }
    } else if (MemberBoundary.LooksLikeMemberStart(code, at)) {
      scan.Boundary = at;
      return;
    }
  }
  at++;
}
scan.Checked = code.length > 1 ? code.length - 1 : 1;
```
## static method FindMemberBoundary:(code:Array<Token>, from:int, cache?:MemberBoundaryCache | null)=>int

```ts
if (cache !== undefined && cache !== null && cache.Code === code
  && cache.Boundary >= 0 && from >= cache.From
  && (cache.Boundary >= code.length || from < cache.Boundary)) {
  return cache.Boundary;
}
for (let at = from + 1; at < code.length; at++) {
  if (!MemberBoundary.HasLineBreakBetween(code[at - 1], code[at])) {
    continue;
  }
  if (!MemberBoundary.CanEndTypeUnit(code[at - 1])) {
    continue;
  }
  if (MemberBoundary.IsInitializerIndexContinuation(code, at)) {
    // `= 1` 换行 `["s" + "t"] = 2`：`[` 能续接上一行的初始化器（TS 不插 ASI），不切成员。
    continue;
  }
  if (!MemberBoundary.LooksLikeMemberStart(code, at)) {
    continue;
  }
  if (cache !== undefined && cache !== null) {
    cache.Code = code;
    cache.From = from;
    cache.Boundary = at;
  }
  return at;
}
if (cache !== undefined && cache !== null) {
  cache.Code = code;
  cache.From = from;
  cache.Boundary = code.length;
}
return code.length;
```

## static method FindTypeMemberBoundary:(code:Array<Token>, from:int)=>int

```ts
for (let at = from + 1; at < code.length; at++) {
  if (!MemberBoundary.HasLineBreakBetween(code[at - 1], code[at])) {
    continue;
  }
  if (!MemberBoundary.CanEndTypeUnit(code[at - 1])) {
    continue;
  }
  if (MemberBoundary.IsInitializerIndexContinuation(code, at)) {
    continue;
  }
  const unit = code[at];
  if (unit instanceof Symbol && (unit as Symbol).Is("<")) {
    if (MemberBoundary.IsNewKeyword(code[at - 1])) {
      // `new` ⏎ `<T>` 是构造签名的类型参数表，不是新成员。
      continue;
    }
    if (MemberBoundary.IsMemberSignatureAwaitingParams(code, at)) {
      // `m` ⏎ `<T>(…)`：`<...>` 是这个方法自己的类型参数表。
      continue;
    }
    return at;
  }
  if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "(") {
    if (MemberBoundary.IsNewKeyword(code[at - 1])) {
      // `new` ⏎ `(...)` 是构造签名的参数表。
      continue;
    }
    if (MemberBoundary.IsMemberSignatureAwaitingParams(code, at)) {
      // `m` / `m<T>` / `b?` ⏎ `(...)`：参数表属于同一个成员。
      continue;
    }
    if (MemberBoundary.IsImportTypeArguments(code, at)) {
      // `typeof import` ⏎ `("m")`：`(` 是 import 类型的参数表。
      continue;
    }
    return at;
  }
  if (!MemberBoundary.LooksLikeMemberStart(code, at)) {
    continue;
  }
  return at;
}
return code.length;
```

## private static method IsNewKeyword:(unit:Token)=>bool

```ts
if (unit instanceof Common) {
  return (unit as Common).TempToString() === "new";
}
return false;
```

## private static method IsMemberSignatureAwaitingParams:(code:Array<Token>, at:int)=>bool

```ts
for (let cursor = 0; cursor < at; cursor++) {
  const unit = code[cursor];
  if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "(") {
    return false;
  }
}
let angle = 0;
for (let cursor = 0; cursor < at; cursor++) {
  const unit = code[cursor];
  if (!(unit instanceof Symbol)) {
    continue;
  }
  const text = (unit as Symbol).TempToString();
  if (text === "<") {
    angle += 1;
    continue;
  }
  if (text === ">") {
    angle = angle > 0 ? angle - 1 : 0;
    continue;
  }
  if (text === ">>") {
    angle = angle > 1 ? angle - 2 : 0;
    continue;
  }
  if (text === ">>>") {
    angle = angle > 2 ? angle - 3 : 0;
    continue;
  }
  if (text === ":" && angle === 0) {
    return false;
  }
}
const last = code[at - 1];
if (last instanceof Common) {
  return (last as Common).TempToString() !== "readonly";
}
if (last instanceof String) {
  return true;
}
if (last instanceof Symbol) {
  const lastText = (last as Symbol).TempToString();
  return lastText === "?" || lastText === "?:" || lastText === ">"
    || lastText === ">>" || lastText === ">>>";
}
return false;
```

## private static method IsImportTypeArguments:(code:Array<Token>, at:int)=>bool

```ts
if (at < 2) {
  return false;
}
const name = code[at - 1];
if (!(name instanceof Common) || (name as Common).TempToString() !== "import") {
  return false;
}
const before = code[at - 2];
return before instanceof Common && (before as Common).TempToString() === "typeof";
```

## static method IsInitializerIndexContinuation:(code:Array<Token>, at:int)=>bool

```ts
const unit = code[at];
if (!(unit instanceof Bracket) || (unit as Bracket).StartBracketChar !== "[") {
  return false;
}
const next = at + 1 < code.length ? code[at + 1] : null;
if (next === null || !(next instanceof Symbol) || !(next as Symbol).Is("=")) {
  return false;
}
const previous = code[at - 1];
return previous instanceof Common || previous instanceof String || previous instanceof Bracket;
```

## static method HasLineBreakBetween:(left:Token, right:Token)=>bool

```ts
return LineTerminator.HasBetween(left.SourceRange, right.SourceRange);
```

## static method CanEndTypeUnit:(unit:Token)=>bool

```ts
if (unit instanceof Common || unit instanceof String || unit instanceof Bracket) {
  return true;
}
if (unit instanceof Symbol) {
  return (unit as Symbol).TempToString() === ">";
}
return false;
```

## static method LooksLikeMemberStart:(code:Array<Token>, at:int)=>bool

```ts
const unit = code[at];
if (unit instanceof String) {
  // 反引号模板不是成员名：它只能续在上一条初始化器后面当标签模板
  //（`class C { a = 1` ⏎ `` `t` ``}` 是**一个**成员、初始化器为 `1`t``，TS 不插 ASI）。
  // 引号串才是成员名（`class C { a = 1` ⏎ `"s"` }` 的 `"s"` 是新成员）。
  return (unit as String).StringChar !== "`";
}
if (unit instanceof Symbol) {
  return (unit as Symbol).Is("@");
}
if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "[") {
  // 计算名成员：`[...]` 之后跟 `:` / `?` / `(` / `!` / `=` / `<`；
  // 类型里的索引访问后缀后面接的是 `|` `&` `[` `)` `;` `,` 等。
  const next = at + 1 < code.length ? code[at + 1] : null;
  if (next === null) {
    return false;
  }
  // 计算名方法 `['a']()`：`[...]` 之后直接是参数表 `(`。
  if (next instanceof Bracket && (next as Bracket).StartBracketChar === "(") {
    return true;
  }
  if (next instanceof Symbol) {
    const nextText = (next as Symbol).TempToString();
    return nextText === ":" || nextText === "?" || nextText === "?:" || nextText === "("
      || nextText === "!" || nextText === "=" || nextText === "<";
  }
  return false;
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  // 类型内部的续行关键字不是成员起点。
  if (text === "extends" || text === "keyof" || text === "typeof" || text === "infer"
    || text === "is" || text === "asserts" || text === "in" || text === "of"
    || text === "as" || text === "satisfies" || text === "unique") {
    return false;
  }
  return true;
}
return false;
```

# class MemberHeadScan

**成员头前瞻（B2b）**：在成员**第一格**闭合时，只看 document 里后面的字符，判断这条成员是不是
「属性形态」。判出来就当场建成员外壳（`MemberShellCatalog`），修饰词 / 名字 / 初始字面量于是各自
在自己的 token 格成形状，而不是等成员边界一次性重建。

判据只回答一件事：**跳过修饰词链之后的名字后面，第一个决定性字符是什么**。

- `:` `=` `;` `}` `,` ⇒ 属性（这几格只可能属于属性成员，方法要 `(` / `<`）；
- `?` / `!` 只是可选 / 确定断言标记，继续看下一格；
- `(` `<` `[` `{` `.` `@` `*` ⇒ 判不出（方法 / 泛型 / 计算名 / 静态块 / 装饰器）⇒ `-1`，交旧路径；
- 换行 ⇒ `-1`（ASI / 修饰词链跨行是另一套判据，不在这里放宽）；
- 文件尾 ⇒ `-1`。

`-1` 一律表示「不早建」，调用方保持既有行为。返回 `>= 0` 是**修饰词个数**（0 = 第一格就是名字）。

## static method IsWordStart:(ch:string)=>bool

```ts
if (ch.length !== 1) {
  return false;
}
const code = ch.charCodeAt(0);
if (code >= 48 && code <= 57) {
  return true;
}
if (code >= 65 && code <= 90) {
  return true;
}
if (code >= 97 && code <= 122) {
  return true;
}
return ch === "_" || ch === "$" || ch === "\\";
```

## static method IsWordChar:(ch:string)=>bool

```ts
if (ch.length !== 1) {
  return false;
}
const code = ch.charCodeAt(0);
if (code >= 48 && code <= 57) {
  return true;
}
if (code >= 65 && code <= 90) {
  return true;
}
if (code >= 97 && code <= 122) {
  return true;
}
return ch === "_" || ch === "$";
```

## static method IsModifierWord:(word:string)=>bool

```ts
return word === "readonly" || word === "static" || word === "private" || word === "public"
  || word === "protected" || word === "abstract" || word === "declare" || word === "override"
  || word === "async" || word === "accessor";
```

## static method CanFollowWord:(ch:string)=>bool

修饰词后面**能接**的那一类字符（对齐 `ClassDeclarationShape.CanFollowModifier`：名字 / `#` / `[` / `*` /
字符串 / `{`）。接不上就说明当前这个词本身就是名字（`static = 1` 的 `static`）。

```ts
if (MemberHeadScan.IsWordStart(ch)) {
  return true;
}
return ch === "#" || ch === "[" || ch === "*" || ch === "{" || ch === "\"" || ch === "'" || ch === "`";
```

## static method SkipTrivia:(whole:SourceRange, at:int, count:int)=>int

跳过空白与注释，返回下一个非 trivia 字符的下标；遇到换行（ASI 的另一套判据）或到达文件尾返回 `-1`。

```ts
let cursor = at;
while (cursor < count) {
  const ch = whole.At(cursor);
  if (ch === " " || ch === "\t" || ch === "\v" || ch === "\f") {
    cursor++;
    continue;
  }
  if (ch === "\n" || ch === "\r" || ch === "\u2028" || ch === "\u2029") {
    return -1;
  }
  if (ch === "/" && cursor + 1 < count) {
    const next = whole.At(cursor + 1);
    if (next === "/") {
      // 行注释到换行为止：注释结束之后紧跟的一定是换行，所以这里直接判「不可早建」。
      return -1;
    }
    if (next === "*") {
      cursor += 2;
      while (cursor + 1 < count && !(whole.At(cursor) === "*" && whole.At(cursor + 1) === "/")) {
        cursor++;
      }
      cursor += 2;
      continue;
    }
  }
  return cursor;
}
return -1;
```

## static method ModifierCount:(unit:Token)=>int

成员第一格闭合时调用：返回该成员的**修饰词个数**（`>= 0`），或 `-1` = 不早建。

```ts
const range = unit.SourceRange;
const document = range.Document;
if (document === null || range.EndIndex < 0) {
  return -1;
}
const whole = SourceRange.Whole(document);
const count = document.GetCount();
// 本格自己也算进修饰词链：它是成员的第一格，扫的是**它之后**的字符。
let modifiers = 0;
let nameRead = true;
if (unit instanceof Common && MemberHeadScan.IsModifierWord((unit as Common).TempToString())) {
  modifiers = 1;
  nameRead = false;
}
let at = range.EndIndex;
let guard = 0;
while (at < count) {
  guard++;
  if (guard > 512) {
    return -1;
  }
  const ch = whole.At(at);
  if (ch === " " || ch === "\t" || ch === "\v" || ch === "\f") {
    at++;
    continue;
  }
  if (ch === "\n" || ch === "\r" || ch === "\u2028" || ch === "\u2029") {
    return -1;
  }
  if (ch === "/" && at + 1 < count) {
    const next = whole.At(at + 1);
    if (next === "/" || next === "*") {
      const skipped = MemberHeadScan.SkipTrivia(whole, at, count);
      if (skipped < 0) {
        return -1;
      }
      at = skipped;
      continue;
    }
  }
  if (MemberHeadScan.IsWordStart(ch)) {
    let word = "";
    while (at < count && MemberHeadScan.IsWordChar(whole.At(at))) {
      word += whole.At(at);
      at++;
    }
    if (!nameRead && MemberHeadScan.IsModifierWord(word)) {
      const after = MemberHeadScan.SkipTrivia(whole, at, count);
      if (after >= 0 && MemberHeadScan.CanFollowWord(whole.At(after))) {
        modifiers++;
        continue;
      }
    }
    if (nameRead) {
      return -1;
    }
    nameRead = true;
    continue;
  }
  if (ch === "#" && !nameRead) {
    at++;
    continue;
  }
  if (!nameRead) {
    return -1;
  }
  if (ch === ":" || ch === "=" || ch === ";" || ch === "}" || ch === ",") {
    return modifiers;
  }
  if (ch === "?" || ch === "!") {
    at++;
    continue;
  }
  return -1;
}
return -1;
```
