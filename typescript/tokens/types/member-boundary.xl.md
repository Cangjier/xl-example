# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
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
