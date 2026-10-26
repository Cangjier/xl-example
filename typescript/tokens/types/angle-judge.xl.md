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

[D3c:ANGLE] `FindCloseAhead` 一次最多往后看多少个字符。类型实参 / 类型参数表不会有几 KB，
这个上限只是防止畸形输入把一次判定拖成全文扫描；超了按「配不上对」处理（判否，退回旧的显式错误）。

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

[D3c:ANGLE] 以**源码原文**为准，从 `<` 这一格的末端往后找配对的 `>`，返回它在文档里的下标；找不到返回 `-1`。

**为什么不能用 `units`**：候选目录是**逐格**问的——`const a = new A<T>` 的 `<` 那一格到达时，
`Data` 到 `<` 为止，`T` 与 `>` 还在后面；`const f = <T,>(a: T) => a` 在 `,` 那一格到达时，`>` 也还没来。
按 `Data` 找配对的 `>` 永远找不到，于是「这格在不在尖括号里」这个问题在增量路径上**不可能**用 `FindClose` 回答
（实测：`new A<T>` 的 `<` 格 `IsGroupMember` 恒假，9 条 `declaration 符号 <` 一条也没动）。
原文从 `unit.SourceRange.Document` 拿（`GetRawRange` 只读，不改任何形状、不建任何 token）。

扫描规则（保守：宁可判否，退回旧的显式错误，也不猜）：

- `>` 减一层、`<` 加一层，归零即配对，返回该 `>` 的下标；
- `>` 后面紧跟 `=`（`>=`）不算闭合——比较运算符不是括号；
- 空白 / `//` 行注释 / `/* */` 块注释跳过；
- `"` `'` 字符串整段跳过（里面的尖括号不是括号）；
- 反引号模板：不含 `${` 时整段跳过；含插值时判否（模板里再嵌 `<>` 不猜）；
- **深度 > 0 时遇到这些字符判否**（它们不可能出现在类型实参 / 类型参数表里）：
  `;` `)` `=` `&&` `||`。没有这一条，比较链会被读成尖括号组——
  实测反例 `tokenIndex < 0 || tokenIndex >= units.length`：`< 0 || tokenIndex >` 的 `>` 在 `>=` 里，
  而 `||` 与 `=` 在旁边，于是一个纯比较被当成组，声明在逗号 / 换行格上不肯收口，树就漂了
  （`construct-signature-possible-shape.ts` 一条 `moved` 就是这么来的）；
- 扫描上限 `FindCloseAheadLimit` 个字符（防止畸形输入把一次判定拖成全文扫描）；
- 没有 `Document`（单元测试里直接构造的形状）判否。

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

[D3c:ANGLE] 这一格之前有一个 `<`，它**在原文里配对到的 `>`** 落在本格或更后（`FindCloseAhead`）。

只数配得上对的 `<`：比较链 `x == y < z` 里的裸 `<`（`FindCloseAhead` 为 `-1`，或配对 `>` 在 `;` 之后被截断）
不算，声明因此仍能正常收口。

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

[D3c:ANGLE] 这一格是不是**一个尖括号组的成员**——开括号那一格本身，或组内任何一格（含配对的 `>`）。

与 `CanStart` 的分工：`CanStart` 还要求前驱 / 后继能接成「类型实参」那种形状（`FindClose` + `FollowerAllows`），
是**读法判据**；本判据只回答「这两个尖括号之间有东西」——给「这一格不要按运算符 / 列表分隔符 / 收口符处理」用。

两条：

1. **本格是开括号**：`<` 且 `FindCloseAhead` 找得到配对的 `>`；
2. **本格在组内**：在它之前有一个 `<`，其原文配对 `>` 落在本格或更后（`IsOpenAt`）。

为什么不能用「数角深度 > 0」：比较链 `x == y < z` 里的 `<` 没有配对，按深度数会一直算作「还没闭合」，
整条声明再也收不了口。`FindCloseAhead` 遇到 `;` / 字符串 / 模板插值就判否，正好把这种判出去。

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

[D3c:ANGLE] 与 `IsGroupMember` 同义，留给「这一格不能收口」那两处调用点读顺：
`IsGroupMember` 说「这一格属于某组」，`IsOpenGroup` 说「有一组还开着、包着这一格」。

两者是同一判据（`IsOpenAt` 已经排除「配对 `>` 在本格之前」的情况），所以声明在组的最后一格（配对的 `>`）
也不能收口——那一格正是 `<T,>` 的 `>`。

```ts
return AngleJudge.IsGroupMember(units, index);
```
