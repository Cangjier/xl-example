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

## static method FindTypeMemberBoundary:(code:Array<Token>, from:int)=>int

**对象类型成员候选管线**（接口体；类型字面量将来可复用同一入口）的分界：与 `FindMemberBoundary` 同口径，
另外把**换行后的 `(` / `<`** 当成新成员起点——`(): A` ⏎ `(): B`、`a: A` ⏎ `(): B`、`a: Foo<A>` ⏎ `(): B`
都是两个成员。

class 体不能直接复用这条例外：值初始化器里的 `foo` ⏎ `(bar)` / `foo` ⏎ `<T>(x)` 是**续接**（TS 不插 ASI），
所以 `FindMemberBoundary` / `LooksLikeMemberStart` 保持原判据不动，class 体与 type literal 的既有解析不受影响；
只有对象类型成员候选（`MemberPossibleUtil.Analyze`）走这个入口。

`(` / `<` 前面是 `new`（`new` ⏎ `<T>` / `(` 是构造签名的类型参数表 / 参数表），
或当前成员前缀**还没拿到参数表**（`m` ⏎ `(x: T): B`、`m<T>` ⏎ `(x: T): B`、`b?` ⏎ `(): E`、
`<T>` ⏎ `(x: T): B`）时，`(` / `<` 是同一个签名自己的类型参数表 / 参数表，不是新成员：
TS 的 `parseTypeMember` 在成员名与 `<` / `(` 之间**从不插 ASI**，只有成员自己已经收住
（有了 `:` 类型、有了参数表、或根本是调用签名）时，换行后的 `(` / `<` 才是下一个成员。

`(` 前面是 `import`、再前一个是 `typeof`（`f: typeof import` ⏎ `("m")`）时，`(` 是 import 类型的
参数表（`TypeBuilder.ParseTypeQuery` 同口径），也不是新成员。

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

`unit` 是不是 `new` 关键字。

```ts
if (unit instanceof Common) {
  return (unit as Common).TempToString() === "new";
}
return false;
```

## private static method IsMemberSignatureAwaitingParams:(code:Array<Token>, at:int)=>bool

`at` 是换行后的 `(` / `<`。当前成员前缀（`code[0 .. at-1]`）还停在「成员名 / 可选标记 / 类型参数表」
这一截、**还没拿到参数表**时，`at` 处的 `(` / `<` 属于同一个签名，不是新成员：

- 前缀里已经出现过参数表 `(` 括号 ⇒ 成员已经收住（`(): A` / `m()`），`at` 是新成员；
- 前缀顶层（角深度 0）出现过 `:` ⇒ 类型已经开始（`a: Foo<A>` ⏎ `(): B`），成员收得住，`at` 是新成员；
- 前缀最后一个代码单元必须是「后面还能接类型参数表 / 参数表」的东西：名字 / 字符串名、
  可选标记 `?` / `?:`、或类型参数表的收口 `>` / `>>` / `>>>`。

`readonly` 是例外：`TypeBuilder.ParseTypeMember` 把**换行后的** `readonly` 当场收成无类型属性名
（`readonly` ⏎ `readonly: number` 是两个成员，这是 TS 的 `nextTokenIsOnSameLineAndCanFollowModifier`），
跨过这个换行会让它提前收口、留下 leftover，所以 `readonly` ⏎ `(` 保持既有分界（不跨）。

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

`at` 是换行后的 `(`，`code[at - 1]` 是 `import`、`code[at - 2]` 是 `typeof` 时，这组括号是
`typeof import(...)` 的参数表：TS 的 `parseTypeQuery` 在 `import` 之后直接读 `(`，不插 ASI；
本仓 `TypeBuilder.ParseTypeQuery` 同口径，所以成员分界要跨过那个换行。

`import` 只有紧跟 `typeof` 才是 import 类型；其它位置的 `import` 是成员名（`import` ⏎ `(): A`
是名字为 `import` 的方法签名，`(` 照常是新成员起点）。

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
行终止符口径统一交给 `LineTerminator`（LF / CR / U+2028 / U+2029，cover8-A）。

```ts
return LineTerminator.HasBetween(left.SourceRange.End, right.SourceRange.Start);
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
