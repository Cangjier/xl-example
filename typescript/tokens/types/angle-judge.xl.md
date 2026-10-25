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
