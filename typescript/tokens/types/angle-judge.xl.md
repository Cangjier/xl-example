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

`<` / `>` 的**唯一**判据：一个 `<` 开的是「类型实参 / 类型参数」，还是算术 / 比较。

原来这套判据散在 6 处（expression-builder 的 `FindTypeArgumentClose` / `CanStartTypeArgumentCall` /
`CanStartTypeArguments` / `MatchAngleClose`、statement-builder 的 `IsTypeArgumentStart`、
class/function/interface 声明候选里手写的 `<`/`>`/`>>` 计数、type-builder 的 `IsSplitClose` 调用方）。
本类把「配对扫描 + 前驱 + follower 白名单 + 内层粗校验」收成一份，其余调用点只做薄包装。

三段判据对应 TS `tryParseTypeArgumentsInExpression`：
1. **前驱**：`<` 前一个代码单元必须是表达式结尾（标识符 / `)` `]` / `>` / `!` / 模板串 / `new` `typeof` 等关键字）；
2. **配对扫描**：从 `<` 数层，`>>` / `>>>` 按层拆（basic token 是合符号，这里拆语义），返回**真实单元下标**；
3. **follower 白名单**：配对 `>` 之后必须是「类型实参段之后接得上」的东西（`(`、模板串、`.`、`?.`、
   `!`、`as`/`satisfies`/`instanceof`/`in`、`;` `,` `)` `]` `}`、EOF 等）；
4. **内层粗校验**：只允许类型文法里的东西（非符号单元 + `.` `,` `|` `&` `:` `?` `=>` `-` `!` `[` `]` 等），
   出现 `&&` / `||` / `=` / `+` 之类值位运算符就判否。

# class AngleJudge

## static method IsSplitClose:(text:string)=>bool

是不是「连续闭合尖括号」：长度 ≥ 2 且每个字符都是 `>`（`>>` / `>>>`）。这是 basic token 的合符号，
类型位 / 表达式位都按层拆开消费。

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

候选扫描里的**宽松**数角（class 的 `<...>` 类型参数阶段 / function 的类型参数表）：`<` 进一层、`>` 出一层、
`>>` / `>>>` 一次出两 / 三层；不是角符号时返回原深度，深度允许到 0 以下（调用方只判 `<= 0`）。
这是「候选扫描数角」的唯一实现，与严格判据 `CanStart` / 强制配对 `FindPair` 并存、职责不同。

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

候选扫描的另一个变体（class / interface 的 heritage 段）：只认 `<` 与 `>`，`>` 只在深度 > 0 时出层，
`>>` / `>>>` 原样当内容；深度夹在 0 以上。

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

变量声明初始化器扫顶层 `,` 边界时用的**夹零**数角：`<` +1；`>` 仅在 depth > 0 时 -1；
`>>` / `>>>` 一次 -2 / -3（不够时夹到 0）；其它单元原样。
与 `Shift` 的唯一区别是深度不会变负（调用方拿 `=== 0` 判「顶层逗号」）。

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

`<` 前一个代码单元能不能当被调用者 / 类型引用的结尾：标识符类（含 `new` `typeof` 等关键字）、
`)` `]` 这类括号整块、模板串、或 `>` / `!` 后缀。前面没有代码单元（语句起点的 `<` 断言 / 泛型箭头）
由 expression-builder 的 `ParseAngleStart` 直接处理，不走本判据。

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

**类型实参判据用**的严格配对扫描：从 `index`（必须是 `<`）数层，只认 `<` / `>` / `>>` / `>>>` / `,`
这些符号与任意非符号单元（类型名 / 字面量 / 括号整块）；碰到别的符号（`&&`、`+`、`=` 等）判否。
返回闭合 `>` 的**原单元下标**（`>>` / `>>>` 在那一格收多层），不是类型实参返回 `-1`。

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

**强制配对**用的宽松扫描（class / function / interface 的类型参数表、尖括号断言）：从 `index`（必须是 `<`）
只数 `<` / `>` / `>>` / `>>>`，其它符号与括号整块原样跳过；返回闭合 `>` 的原单元下标，扫不到返回 `-1`。
它只回答「配对的 `>` 在哪」，不回答「这是不是类型实参」——后者是 `CanStart`。

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

配对 `>` 之后那一格是不是「类型实参段之后接得上」的东西。
`[` 也是合法 follower：数组后缀 / 下标访问紧跟配对 `>`（`a as Foo<A, B>[]`、`f<T>[0]`），
类型实参段在这里就收口；否则声明层的顶层 `,` 扫描会把 `<A, B>` 里的逗号当声明分隔符。

```ts
const followerIndex = close + 1;
if (followerIndex >= units.length) {
  return true;
}
const follower = units[followerIndex];
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

## static method CanStart:(units:Array<Token>, index:int)=>bool

`units[index]` 是 `<` 时，判断它开启的是不是**类型实参 / 类型参数**。这是唯一判据；
`expression-builder` / `statement-builder` / 声明候选都只调它（需要强制配对时用 `FindPair`）。

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
