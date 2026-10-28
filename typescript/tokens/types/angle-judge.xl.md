# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { StatementScanner } from "../statements/statement-scanner.xl.md"
```

# namespace cangjie

# class AngleJudge

## static field FindCloseAheadLimit:int = 4096

## static method IsSplitClose:(text:string)=>bool

```ts
if (text.length < 2) {
  return false;
}
for (const item of text) {
  if (item !== ">") {
    return false;
  }
}
return true;
```

## static method Shift:(unit:Token, depth:int)=>int

```ts
if (!(unit instanceof Symbol)) {
  return depth;
}
const text = (unit as Symbol).TempToString();
if (text === "<") {
  return depth + 1;
}
if (text === ">") {
  return depth - 1;
}
if (AngleJudge.IsSplitClose(text)) {
  return depth - text.length;
}
return depth;
```

## static method Guard:(unit:Token, depth:int)=>int

```ts
if (!(unit instanceof Symbol)) {
  return depth;
}
const text = (unit as Symbol).TempToString();
if (text === "<") {
  return depth + 1;
}
if (text === ">") {
  return depth > 0 ? depth - 1 : 0;
}
return depth;
```

## static method ScanDepth:(unit:Token, depth:int)=>int

```ts
if (!(unit instanceof Symbol)) {
  return depth;
}
const text = (unit as Symbol).TempToString();
if (text === "<") {
  return depth + 1;
}
if (text === ">") {
  return depth > 0 ? depth - 1 : 0;
}
if (text === ">>") {
  return depth >= 2 ? depth - 2 : 0;
}
if (text === ">>>") {
  return depth >= 3 ? depth - 3 : 0;
}
return depth;
```

## static method IsText:(unit:Token, text:string)=>bool

```ts
if (unit instanceof Symbol) {
  return (unit as Symbol).Is(text);
}
if (unit instanceof Common) {
  return (unit as Common).Is(text);
}
return false;
```

## private static method PredecessorAllows:(units:Array<Token>, index:int)=>bool

```ts
for (let at = index - 1; at >= 0; at--) {
  const previous = units[at];
  if (previous.IsTriviaToken) {
    continue;
  }
  if (previous instanceof Common || previous instanceof Bracket || previous instanceof String) {
    return true;
  }
  if (previous instanceof Symbol) {
    const text = (previous as Symbol).TempToString();
    return text === ">" || text === ">>" || text === ">>>" || text === "!" || text === "?.";
  }
  return false;
}
return false;
```

## static method FindClose:(units:Array<Token>, index:int)=>int

```ts
if (index < 0 || index >= units.length) {
  return -1;
}
if (!AngleJudge.IsText(units[index], "<")) {
  return -1;
}
let depth = 0;
for (let at = index; at < units.length; at++) {
  const unit = units[at];
  if (!(unit instanceof Symbol)) {
    if (depth === 0) {
      return -1;
    }
    continue;
  }
  const text = (unit as Symbol).TempToString();
  if (text === "<") {
    depth++;
    continue;
  }
  if (text === ">") {
    depth--;
    if (depth === 0) {
      return at;
    }
    continue;
  }
  if (AngleJudge.IsSplitClose(text)) {
    depth -= text.length;
    if (depth <= 0) {
      return at;
    }
    continue;
  }
  if (text === ",") {
    continue;
  }
  return -1;
}
return -1;
```

## static method FindPair:(units:Array<Token>, index:int)=>int

```ts
if (index < 0 || index >= units.length) {
  return -1;
}
if (!AngleJudge.IsText(units[index], "<")) {
  return -1;
}
let depth = 0;
for (let at = index; at < units.length; at++) {
  const unit = units[at];
  if (!(unit instanceof Symbol)) {
    if (depth === 0) {
      return -1;
    }
    continue;
  }
  const text = (unit as Symbol).TempToString();
  if (text === "<") {
    depth++;
    continue;
  }
  if (text === ">") {
    depth--;
    if (depth === 0) {
      return at;
    }
    continue;
  }
  if (AngleJudge.IsSplitClose(text)) {
    depth -= text.length;
    if (depth <= 0) {
      return at;
    }
    continue;
  }
}
return -1;
```

## private static method FollowerAllows:(units:Array<Token>, close:int)=>bool

```ts
// follower 必须是**下一个代码单元**：`host.Data` 里 `>` 与下一格之间常夹着空白 / 换行 trivia，
// 直接读 `units[close + 1]` 会读到那个 trivia 单元（它既不是 Symbol 也不是 Bracket），
// `a < b >` ⏎ `c` 因此被判成「接不上」——而 TS 的 `canFollowTypeArgumentsInExpression`
// 先看 `>` 后第一个 **token**（换行只作为 `hasPrecedingLineBreak` 参与判断）。
let followerIndex = close + 1;
while (followerIndex < units.length && units[followerIndex].IsTriviaToken) {
  followerIndex++;
}
if (followerIndex >= units.length) {
  return true;
}
const follower = units[followerIndex];
// **换行规则之前**先排掉 TS 明确排除的四类 token（`canFollowTypeArgumentsInExpression` 的
// `switch`：`<` / `>` 与 `>>` / `>>>` 同形歧义，`+` / `-` 在这个位置是一元运算符，不是二元）。
// 换行救不了它们：`a < b >` ⏎ `+c` 在 TS 里仍是比较链 `(a<b) > (+c)`，`a < b >` ⏎ `< c >` 也是
// 比较链而不是两个实例化表达式。少了这一格，换行分支会把它们全判成「类型实参之后接得上」。
if (follower instanceof Symbol) {
  const excluded = (follower as Symbol).TempToString();
  if (excluded === "<" || excluded === ">" || excluded === ">>" || excluded === ">>>"
    || excluded === "+" || excluded === "-") {
    return false;
  }
}
// 配对的 `>` 与 follower 之间**有换行**时，follow 什么其实无所谓：上一条语句在换行处已经结束
// （`const { [k]: v } = { a: 1 } as Record<string, number>` 换行 `console.log(v)`）。
// 例外是「换行也接得上」的续接符：`(` / `[` / `.` / `?.` / 模板串——那是同一条表达式。
if (units[close] !== undefined && !StatementScanner.NoLineBreakBetween(units[close], follower)) {
  const continues = (follower instanceof Bracket
      && ((follower as Bracket).StartBracketChar === "(" || (follower as Bracket).StartBracketChar === "["))
    || (follower instanceof Symbol && ((follower as Symbol).Is(".") || (follower as Symbol).Is("?.")))
    || (follower instanceof String && (follower as String).StringChar === "`");
  if (!continues) {
    return true;
  }
}
if (follower instanceof Symbol) {
  const text = (follower as Symbol).TempToString();
  if (text === "(" || text === "[" || text === ";" || text === "," || text === ")" || text === "]"
      || text === "}" || text === "=" || text === "." || text === "!" || text === "?"
      || text === "?:" || text === ":" || text === "=>" || text === "?."
      || text === "??" || text === "||" || text === "&&") {
    return true;
  }
  return false;
}
if (follower instanceof Bracket) {
  return (follower as Bracket).StartBracketChar === "(" || (follower as Bracket).StartBracketChar === "[";
}
if (follower instanceof Common) {
  const text = (follower as Common).TempToString();
  return text === "as" || text === "satisfies" || text === "instanceof" || text === "in"
    || text === "extends";
}
if (follower instanceof String) {
  // 标签模板的标签是实例化表达式：`f<T>`t``。
  return true;
}
return false;
```

## static method IsInstantiationClose:(units:Array<Token>, index:int)=>bool

```ts
if (index < 0 || index >= units.length) {
  return false;
}
const closeUnit = units[index];
if (!(closeUnit instanceof Symbol)) {
  return false;
}
const closeText = (closeUnit as Symbol).TempToString();
if (closeText !== ">" && !AngleJudge.IsSplitClose(closeText)) {
  return false;
}
let opener = -1;
for (let at = index - 1; at >= 0; at--) {
  const unit = units[at];
  if (unit.IsTriviaToken || !(unit instanceof Symbol) || !(unit as Symbol).Is("<")) {
    continue;
  }
  if (AngleJudge.FindClose(units, at) !== index) {
    continue;
  }
  opener = at;
  break;
}
if (opener < 0) {
  return false;
}
if (!AngleJudge.PredecessorAllows(units, opener)) {
  return false;
}
let openBefore = opener - 1;
while (openBefore >= 0 && units[openBefore].IsTriviaToken) {
  openBefore--;
}
if (openBefore >= 0 && units[openBefore] instanceof Symbol) {
  const beforeText = (units[openBefore] as Symbol).TempToString();
  if (beforeText === ">" || beforeText === ">>" || beforeText === ">>>") {
    return false;
  }
}
let follower = index + 1;
while (follower < units.length && units[follower].IsTriviaToken) {
  follower++;
}
if (follower < units.length) {
  const followerUnit = units[follower];
  if (followerUnit instanceof Bracket && (followerUnit as Bracket).StartBracketChar === "(") {
    return false;
  }
  if (followerUnit instanceof String && (followerUnit as String).StringChar === "`") {
    return false;
  }
}
return AngleJudge.FollowerAllows(units, index);
```

## static method CanStart:(units:Array<Token>, index:int)=>bool

```ts
if (index < 0 || index >= units.length) {
  return false;
}
if (!AngleJudge.IsText(units[index], "<")) {
  return false;
}
if (!AngleJudge.PredecessorAllows(units, index)) {
  return false;
}
const close = AngleJudge.FindClose(units, index);
if (close < 0) {
  return false;
}
return AngleJudge.FollowerAllows(units, close);
```

## static method FindCloseAhead:(unit:Token)=>int

```ts
if (!(unit instanceof Symbol)) {
  return -1;
}
if ((unit as Symbol).TempToString() !== "<") {
  return -1;
}
const range = unit.SourceRange;
if (range === null || range.Document === null) {
  return -1;
}
const count = range.Document.GetCount();
const from = range.EndIndex;
if (from < 0 || from >= count) {
  return -1;
}
const limit = from + AngleJudge.FindCloseAheadLimit;
const content = range.GetRawRange(from, limit < count ? limit : count);
let depth = 1;
let at = 0;
while (at < content.length) {
  const code = content[at];
  if (code === " " || code === "\t" || code === "\r" || code === "\n" || code === "\v" || code === "\f") {
    at++;
    continue;
  }
  if (code === "/" && at + 1 < content.length && content[at + 1] === "/") {
    const lineEnd = content.indexOf("\n", at + 2);
    at = lineEnd < 0 ? content.length : lineEnd + 1;
    continue;
  }
  if (code === "/" && at + 1 < content.length && content[at + 1] === "*") {
    const blockEnd = content.indexOf("*/", at + 2);
    at = blockEnd < 0 ? content.length : blockEnd + 2;
    continue;
  }
  if (code === '"' || code === "'") {
    let scan = at + 1;
    while (scan < content.length && content[scan] !== code) {
      if (content[scan] === "\\") {
        scan++;
      }
      scan++;
    }
    at = scan + 1;
    continue;
  }
  if (code === "`") {
    let scan = at + 1;
    let substitution = false;
    while (scan < content.length && content[scan] !== "`") {
      if (content[scan] === "\\") {
        scan++;
      } else if (content[scan] === "$" && scan + 1 < content.length && content[scan + 1] === "{") {
        substitution = true;
      }
      scan++;
    }
    if (substitution) {
      return -1;
    }
    at = scan + 1;
    continue;
  }
  // [D3c:ANGLE] 深度 > 0 时的「判否」字符：它们不可能出现在类型实参 / 类型参数表里，
  // 出现了就是比较 / 赋值表达式，不是尖括号组（反例见方法注释）。
  if (code === ";" || code === ")" || code === "=") {
    return -1;
  }
  if (code === "&" && at + 1 < content.length && content[at + 1] === "&") {
    return -1;
  }
  if (code === "|" && at + 1 < content.length && content[at + 1] === "|") {
    return -1;
  }
  if (code === "<") {
    depth++;
    at++;
    continue;
  }
  if (code === ">") {
    if (at + 1 < content.length && content[at + 1] === "=") {
      // `>=`：比较运算符，整格跳过（`<>` 不可能是括号组的一部分）。
      at += 2;
      continue;
    }
    depth--;
    if (depth === 0) {
      return from + at;
    }
    at++;
    continue;
  }
  at++;
}
return -1;
```

## static method IsOpenAt:(units:Array<Token>, index:int)=>bool

```ts
if (index < 0 || index >= units.length) {
  return false;
}
const start = units[index].SourceRange.StartIndex;
if (start < 0) {
  return false;
}
for (let at = 0; at < index; at++) {
  if (!AngleJudge.IsText(units[at], "<")) {
    continue;
  }
  const close = AngleJudge.FindCloseAhead(units[at]);
  if (close < 0) {
    continue;
  }
  if (close >= start) {
    return true;
  }
}
return false;
```

## static method IsGroupMember:(units:Array<Token>, index:int)=>bool

```ts
if (index < 0 || index >= units.length) {
  return false;
}
if (AngleJudge.IsText(units[index], "<")) {
  if (AngleJudge.FindCloseAhead(units[index]) >= 0) {
    return true;
  }
}
return AngleJudge.IsOpenAt(units, index);
```

## static method IsOpenGroup:(units:Array<Token>, index:int)=>bool

```ts
return AngleJudge.IsGroupMember(units, index);
```
