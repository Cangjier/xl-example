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
  if (MemberBoundary.IsLineBreakInsensitiveModifier(code[at - 1])
    && MemberBoundary.CanFollowModifierToken(code[at])) {
    // `static` ⏎ `readonly a = 1`：TS 对 `static` 走 `nextTokenCanFollowModifier()`，**不看换行**，
    // 所以换行之后仍是同一条成员的修饰词链，这里不是成员边界。
    // （`public` 这类要求同行的修饰词不走这条：`public` ⏎ `static x = 1` 是「字段 public + 静态字段 x」。）
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

## static method IsLineBreakInsensitiveModifier:(unit:Token)=>bool

```ts
if (!(unit instanceof Common)) {
  return false;
}
return (unit as Common).TempToString() === "static";
```

## static method CanFollowModifierToken:(unit:Token)=>bool

```ts
if (unit instanceof Bracket) {
  const bracketChar = (unit as Bracket).StartBracketChar;
  return bracketChar === "[" || bracketChar === "{";
}
if (unit instanceof Symbol) {
  const symbolText = (unit as Symbol).TempToString();
  return symbolText === "*" || symbolText === "..." || symbolText === "#";
}
return unit instanceof Common || unit instanceof String;
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

# class MemberHeadKind

## static field Property:int = 0

## static field Method:int = 1

## static field Constructor:int = 2

## static field Get:int = 3

## static field Set:int = 4

## static field Index:int = 5

## static field StaticBlock:int = 6

## static field Construct:int = 7

# class MemberHeadPlan

## field Kind:int = -1

## field Modifiers:int = 0

# class MemberHeadScan

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

```ts
if (MemberHeadScan.IsWordStart(ch)) {
  return true;
}
return ch === "#" || ch === "[" || ch === "*" || ch === "{" || ch === "\"" || ch === "'" || ch === "`";
```

## static method SkipTrivia:(whole:SourceRange, at:int, count:int)=>int

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

## static method NextSignificant:(whole:SourceRange, at:int, count:int)=>int

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
      return -1;
    }
    if (next === "*") {
      cursor += 2;
      while (cursor + 1 < count && !(whole.At(cursor) === "*" && whole.At(cursor + 1) === "/")) {
        const inner = whole.At(cursor);
        if (inner === "\n" || inner === "\r" || inner === "\u2028" || inner === "\u2029") {
          return -1;
        }
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

## static method Plan:(unit:Token, forInterface:bool)=>MemberHeadPlan | null

```ts
const range = unit.SourceRange;
const document = range.Document;
if (document === null || range.EndIndex < 0) {
  return null;
}
const whole = SourceRange.Whole(document);
const count = document.GetCount();
if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "[") {
  // 索引签名：第一格是已经闭合的 `[name: T]`，后面紧跟 `:`。
  if (!(unit as Bracket).Closed) {
    return null;
  }
  const inner:Array<Token> = [];
  for (const item of (unit as Bracket).Data) {
    if (!item.IsTriviaToken) {
      inner.push(item);
    }
  }
  if (inner.length < 3 || !(inner[0] instanceof Common)) {
    return null;
  }
  if (!(inner[1] instanceof Symbol) || !(inner[1] as Symbol).Is(":")) {
    return null;
  }
  const afterBracket = MemberHeadScan.NextSignificant(whole, range.EndIndex, count);
  if (afterBracket < 0 || whole.At(afterBracket) !== ":") {
    return null;
  }
  const plan = new MemberHeadPlan();
  plan.Kind = MemberHeadKind.Index;
  plan.Modifiers = 0;
  return plan;
}
if (!(unit instanceof Common)) {
  return null;
}
let modifiers = 0;
let accessor = 0;
let name = "";
let nameRead = false;
let cursor = range.EndIndex;
// 本格自己：修饰词只在「后面确实能接被修饰的东西」时才算修饰词（`static = 1` 的 `static` 是名字）。
const firstText = (unit as Common).TempToString();
let firstIsModifier = MemberHeadScan.IsModifierWord(firstText);
if (firstText === "get" || firstText === "set") {
  // `get` / `set` 不在修饰词表里（`get()` 是名为 get 的方法），只有后面确实跟着名字时才是访问器关键字。
  firstIsModifier = true;
}
if (firstIsModifier) {
  const afterFirst = MemberHeadScan.NextSignificant(whole, cursor, count);
  if (firstText === "static" && afterFirst >= 0 && whole.At(afterFirst) === "{") {
    const blockPlan = new MemberHeadPlan();
    blockPlan.Kind = MemberHeadKind.StaticBlock;
    blockPlan.Modifiers = 1;
    return blockPlan;
  }
  if (afterFirst >= 0 && MemberHeadScan.CanFollowWord(whole.At(afterFirst))) {
    modifiers = 1;
    if (firstText === "get") {
      accessor = MemberHeadKind.Get;
    } else if (firstText === "set") {
      accessor = MemberHeadKind.Set;
    }
  } else {
    name = firstText;
    nameRead = true;
  }
} else {
  name = firstText;
  nameRead = true;
}
let guard = 0;
while (cursor < count) {
  guard++;
  if (guard > 256) {
    return null;
  }
  const next = MemberHeadScan.NextSignificant(whole, cursor, count);
  if (next < 0) {
    return null;
  }
  cursor = next;
  const ch = whole.At(cursor);
  if (MemberHeadScan.IsWordStart(ch)) {
    if (nameRead) {
      return null;
    }
    let word = "";
    let wordAt = cursor;
    while (wordAt < count && MemberHeadScan.IsWordChar(whole.At(wordAt))) {
      word += whole.At(wordAt);
      wordAt++;
    }
    const afterWord = MemberHeadScan.NextSignificant(whole, wordAt, count);
    const wordIsModifier = MemberHeadScan.IsModifierWord(word) || word === "get" || word === "set";
    if (afterWord >= 0 && wordIsModifier
      && MemberHeadScan.CanFollowWord(whole.At(afterWord))) {
      modifiers++;
      if (word === "get") {
        accessor = MemberHeadKind.Get;
      } else if (word === "set") {
        accessor = MemberHeadKind.Set;
      }
      cursor = wordAt;
      continue;
    }
    name = word;
    nameRead = true;
    cursor = wordAt;
    continue;
  }
  if (!nameRead) {
    return null;
  }
  if (ch === ":" || ch === "=" || ch === ";" || ch === "}" || ch === ",") {
    const plan = new MemberHeadPlan();
    plan.Kind = MemberHeadKind.Property;
    plan.Modifiers = modifiers;
    return plan;
  }
  if (ch === "?" || ch === "!") {
    cursor++;
    continue;
  }
  if (ch === "<") {
    // 泛型方法的类型参数表：只配平尖括号，配不平就判不出；配平之后必须紧跟 `(`。
    let depth = 0;
    let angleAt = cursor;
    while (angleAt < count) {
      const angleCh = whole.At(angleAt);
      if (angleCh === "<") {
        depth++;
      } else if (angleCh === ">") {
        depth--;
        if (depth === 0) {
          angleAt++;
          break;
        }
      } else if (angleCh === "/" && angleAt + 1 < count) {
        const commentNext = whole.At(angleAt + 1);
        if (commentNext === "/") {
          return null;
        }
        if (commentNext === "*") {
          angleAt += 2;
          while (angleAt + 1 < count && !(whole.At(angleAt) === "*" && whole.At(angleAt + 1) === "/")) {
            angleAt++;
          }
          angleAt++;
        }
      }
      angleAt++;
    }
    if (depth !== 0) {
      return null;
    }
    const afterAngle = MemberHeadScan.NextSignificant(whole, angleAt, count);
    if (afterAngle < 0 || whole.At(afterAngle) !== "(") {
      return null;
    }
    const genericPlan = new MemberHeadPlan();
    if (accessor !== 0) {
      genericPlan.Kind = accessor;
    } else if (name === "constructor") {
      genericPlan.Kind = MemberHeadKind.Constructor;
    } else if (name === "new" && forInterface) {
      genericPlan.Kind = MemberHeadKind.Construct;
    } else {
      genericPlan.Kind = MemberHeadKind.Method;
    }
    genericPlan.Modifiers = modifiers;
    return genericPlan;
  }
  if (ch === "(") {
    const plan = new MemberHeadPlan();
    if (accessor !== 0) {
      plan.Kind = accessor;
    } else if (name === "constructor") {
      plan.Kind = MemberHeadKind.Constructor;
    } else if (name === "new" && forInterface) {
      plan.Kind = MemberHeadKind.Construct;
    } else {
      plan.Kind = MemberHeadKind.Method;
    }
    plan.Modifiers = modifiers;
    return plan;
  }
  return null;
}
return null;
```

## static method ModifierCount:(unit:Token)=>int

```ts
const plan = MemberHeadScan.Plan(unit, false);
if (plan === null || plan.Kind !== MemberHeadKind.Property) {
  return -1;
}
return plan.Modifiers;
```
