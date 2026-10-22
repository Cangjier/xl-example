# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class MemberBoundary

对象类型 / 类体里「一个成员的终点」的判据。成员的类型是**贪心**解析的，但 `[…]` 既可能是类型的
索引访问后缀、也可能是下一个成员的计算名（`entries: () => X\n[Symbol.iterator]: () => Y`），
所以解析类型之前要先用这个助手截出当前成员的范围。

## static method FindMemberBoundary:(code:Array<Token>, from:int)=>int

从 `from` 起扫到第一个「换行 + 前一个代码单元能收住一个类型 + 当前单元看起来是成员起点」的位置；
找不到就是 `code.length`。

```ts
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
  return at;
}
return code.length;
```

## static method IsInitializerIndexContinuation:(code:Array<Token>, at:int)=>bool

`at` 是换行后的 `[`，且这个 `[...]` 后面紧跟 `=`（计算名初始化的形态）时，它是上一行初始化器
的下标续接，而不是新成员起点（TS 的 ASI 规则：`[` 可以续接表达式，不插分号）。
类型上下文里的 `[K]: T`（后面是 `:`）不受影响。

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

两个代码单元的原文之间有没有换行（块注释里的换行也算）。

```ts
const from = left.SourceRange.End;
const to = right.SourceRange.Start;
if (from === null || to === null) {
  return false;
}
const document = from.Document;
let at = from.Index + 1;
while (at < to.Index) {
  const ch = document.At(at).Value;
  if (ch === "\n" || ch === "\r") {
    return true;
  }
  at++;
}
return false;
```

## static method CanEndTypeUnit:(unit:Token)=>bool

一个代码单元能不能收住一个类型。

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

`at` 处的代码单元像不像一个新成员的起点。

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
