# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { AreaAnnotation } from "../../../core/syntax/basic-tokens/area-annotation.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { RegexToken } from "../../../core/syntax/basic-tokens/regex-token.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { WrapSymbol } from "../../../core/syntax/basic-tokens/wrap-symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { ExpressionStatementShape } from "./expression-statement-shape.xl.md"
```

# namespace cangjie

# class ExpressionStatementScan

## field Start:int = -1

## field Checked:int = 0

## field Admitted:bool = false

## field Done:bool = false

## field DoneAt:int = -1

## field Rejected:bool = false

## field AsyncStage:int = 0

## field ImportStage:int = 0

## field AwaitStage:int = 0

## field CodeCount:int = 0

## field FirstIdentifier:bool = false

## field SawQuestion:bool = false

# class ExpressionStatementPossibleShape extends PossibleShape

```txt
a;
a + b * c;
f(a, b).c;
a ? b : c;
a = b, c = d;
```

## method CanStart:(unit:Token)=>bool

```ts
if (unit instanceof Bracket) {
  // 本批放开 `(` 与 `[`；`{` 仍不放（块 / 对象二义，需要先有块候选）。
  return (unit as Bracket).StartBracketChar === "("
    || (unit as Bracket).StartBracketChar === "[";
}
if (unit instanceof RegexToken) {
  return true;
}
if (unit instanceof String) {
  return true;
}
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  // 语句首的 `<` 在 TS（ScriptKind=TS，无 JSX 二义）只可能是尖括号断言或泛型箭头：
  // 两者由 builder 的 ParseAngleStart 再区分；类型读不完会抛明确错误，不静默错树。
  // `#` = private identifier 的起始 token（`#x` 在 token 层是 Symbol "#" + Common "x"），
  // 语句首只可能是 `#x in obj` 这种 brand check，放行后由 ExpressionBuilder 建 PrivateIdentifier。
  return text === "<"
    || text === "#"
    || text === "!"
    || text === "~"
    || text === "+"
    || text === "-"
    || text === "++"
    || text === "--";
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  if (text === "true" || text === "false" || text === "null" || text === "this") {
    return true;
  }
  if (text === "typeof" || text === "void" || text === "delete" || text === "new") {
    return true;
  }
  // `async` 只在真的起始一个 async 箭头时才放行；是不是箭头由 ComputeByIndex 的
  // 累积状态机（AsyncStage）在后续单元上确认，确认不了就 Reject。
  if (text === "async") {
    return true;
  }
  // `import` 只在 `import . meta` 时放行；下一个代码单元必须是 `.`
  // （由 ComputeByIndex 的 ImportStage 状态机确认）。`import x from "m"` 里
  // 表达式候选在 `x` 处退出，import 声明候选保持唯一。
  if (text === "import") {
    return true;
  }
  // `await` 是一元前缀（ts 的 parseDiagnostics 视角下顶层 `await x;` 也是合法语句），
  // builder 的 ParseUnary 已经能建 AwaitExpression，所以语句首放行。
  if (text === "await") {
    return true;
  }
  if ((unit as Common).CanStartNumber()) {
    return true;
  }
  return !ExpressionStatementPossibleShape.IsStatementWord(text);
}
return false;
```

## static method IsStatementWord:(text:string)=>bool

语句 / 声明开头的关键字：它们既不能起始一条表达式语句（`CanStart` 的排除表），
也收不住一条完整表达式（`CanEndExpression` 的排除表）——`export\n{ a };` 里那个 `export` 后面就不许断句。
两张表共用这一份，免得一处放开、一处漏掉。

```ts
return text === "import"
  || text === "export"
  || text === "declare"
  || text === "const"
  || text === "let"
  || text === "var"
  || text === "function"
  || text === "class"
  || text === "interface"
  || text === "enum"
  || text === "namespace"
  || text === "module"
  || text === "type"
  || text === "if"
  || text === "else"
  || text === "for"
  || text === "while"
  || text === "do"
  || text === "switch"
  || text === "case"
  || text === "default"
  || text === "try"
  || text === "catch"
  || text === "finally"
  || text === "throw"
  || text === "return"
  || text === "break"
  || text === "continue"
  || text === "debugger"
  || text === "with"
  || text === "extends"
  || text === "implements"
  || text === "abstract"
  || text === "public"
  || text === "private"
  || text === "protected"
  || text === "static"
  || text === "readonly"
  || text === "async"
  || text === "await"
  || text === "yield"
  || text === "using";
```

## static method HasLineBreak:(unit:Token)=>bool

这个 trivia 单元里有没有换行。空白块看 `Temp`；区域注释看 `Tmp`——**块注释里的换行同样是换行**
（`a /* \n */ ++b` 与 `a \n ++b` 一样断句）。行注释自己不包含换行（换行是它后面那个空白块）。

```ts
if (unit instanceof WrapSymbol) {
  const text = (unit as WrapSymbol).TempToString();
  return text.includes("\n") || text.includes("\r");
}
if (unit instanceof AreaAnnotation) {
  const text = (unit as AreaAnnotation).Tmp;
  return text.includes("\n") || text.includes("\r");
}
return false;
```

## static method CanEndExpression:(unit:Token)=>bool

这个代码单元能不能收住一条完整的表达式。ASI 只在**前面这句话已经能独立成立**时才断句：
`typeof` / `void` / `delete` / `new` 与二元关键字都还在等右操作数，`a +\nb` 里 `+` 后面换行也不能断。
后缀 `++` / `--` 可以收尾（`a++\nb` 断句），前缀形态的 `++` / `--` 交给 `b` 自己去起始。

```ts
if (unit instanceof Bracket) {
  const start = (unit as Bracket).StartBracketChar;
  return start === "(" || start === "[";
}
if (unit instanceof String || unit instanceof RegexToken) {
  return true;
}
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  return text === "++" || text === "--";
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  return !ExpressionStatementPossibleShape.IsStatementWord(text)
    && text !== "typeof"
    && text !== "void"
    && text !== "delete"
    && text !== "new"
    && text !== "in"
    && text !== "instanceof"
    && text !== "as"
    && text !== "satisfies"
    && text !== "keyof";
}
return false;
```

## static method CanEndExpressionAt:(units:Array<Token>, index:int)=>bool

`CanEndExpression` 只看单元本身；但成员名后面换行时（`a.class` ⏎ `{}`）那个 `class` 是 `.` 之后的
属性名，不是语句关键字。所以按上下文再放开一格：紧邻的前一代码单元是 `.` / `?.` 时，任何 Common
都能收住一条完整表达式（TS 的 `a.class` 就是 PropertyAccessExpression）。

```ts
if (ExpressionStatementPossibleShape.CanEndExpression(units[index])) {
  return true;
}
if (index <= 0) {
  return false;
}
const unit = units[index];
if (unit instanceof Common) {
  const before = units[index - 1];
  if (before instanceof Symbol && ((before as Symbol).Is(".") || (before as Symbol).Is("?."))) {
    return true;
  }
}
return false;
```

## static method IsContinuation:(unit:Token)=>bool

换行之后到来的这个代码单元能不能接在上一条表达式后面——**能接就不许断句**。
`(` / `[` 是调用与成员访问；反引号模板是标签模板（普通引号串不算，`a\n"s"` 要断成两条）；
标点按正向清单（只收二元 / 赋值 / 三元 / 成员 / 逗号 / 箭头，`++` / `--` / `;` / `!` / `~` 都不收）；
`in` / `instanceof` / `as` / `satisfies` 是关键字形态的延续符。

```ts
if (unit instanceof Bracket) {
  const start = (unit as Bracket).StartBracketChar;
  return start === "(" || start === "[";
}
if (unit instanceof String) {
  return (unit as String).StringChar === "`";
}
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  return text === "+"
    || text === "-"
    || text === "*"
    || text === "/"
    || text === "%"
    || text === "**"
    || text === "<"
    || text === ">"
    || text === "<="
    || text === ">="
    || text === "=="
    || text === "!="
    || text === "==="
    || text === "!=="
    || text === "&"
    || text === "|"
    || text === "^"
    || text === "&&"
    || text === "||"
    || text === "??"
    || text === "<<"
    || text === ">>"
    || text === ">>>"
    || text === "="
    || text === "+="
    || text === "-="
    || text === "*="
    || text === "/="
    || text === "%="
    || text === "**="
    || text === "&="
    || text === "|="
    || text === "^="
    || text === "&&="
    || text === "||="
    || text === "??="
    || text === "<<="
    || text === ">>="
    || text === ">>>="
    || text === "."
    || text === "?."
    || text === ","
    || text === "?"
    || text === ":"
    || text === "=>"
    || text === "...";
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  return text === "in" || text === "instanceof" || text === "as" || text === "satisfies";
}
return false;
```

## static method IsAsiBoundary:(units:Array<Token>, tokenIndex:int, limit?:int)=>bool

**ASI 判据**：`tokenIndex` 这个代码单元到得太晚——上一条表达式已经在换行处结束了。五条同时成立：

1. 当前单元是代码（trivia 与 EOF 哨兵都不算）；
2. 它前面还有代码单元 `prev`，且 `prev` 能收住一条完整表达式；
3. `prev` 与它之间至少有一个换行 trivia（注释里的换行也算）；
4. 当前单元接不上上一条表达式（不是延续符）；
5. **本条语句是表达式语句**：以语句 / 声明关键字开头的条目（`class` / `interface` / `enum` / `declare` / …）
   后面的换行不是 ASI 边界——`class C\n{}` 的 `{` 是类体，`C` 只是声明头的一部分，
   那里根本不存在「上一条表达式」。

它只回答「该断句」，不建形状：普通候选靠它 `Reject`，终结候选靠它 `Accept`，
两侧读的是同一个函数，所以不会一边断、一边不断。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const current = units[tokenIndex];
if (current.IsTriviaToken || current instanceof EndOfFileTokenShape) {
  return false;
}
// `;` 是语句自己的终结符（`Done` 那一条路），不是 ASI 边界：`a\n;` 仍是一条。
if (current instanceof Symbol && (current as Symbol).Is(";")) {
  return false;
}
let prev = tokenIndex - 1;
while (prev >= 0 && units[prev].IsTriviaToken) {
  prev--;
}
if (prev < 0) {
  return false;
}
// 换行判据按源位置找（块体 / 体里的 Units 不带 trivia 单元，见 HasLineBreakBefore）。
if (!ExpressionStatementPossibleShape.HasLineBreakBefore(units, tokenIndex)) {
  return false;
}
// 前一个代码单元能收住一条完整表达式。闭合的 `{…}` 括号单元（对象字面量 / 箭头函数块体）
// 也算：CanEndExpression 分不清 `{` 与裸块、统一按 false 处理，但在这个位置上 `{…}` 已经
// 闭合，确实收得住（`x = () => {}` ⏎ `(y)` 必须在换行处断句，TS 的块体不是 MemberExpression）。
const prevIsClosedBrace = units[prev] instanceof Bracket
  && (units[prev] as Bracket).StartBracketChar === "{";
if (!ExpressionStatementPossibleShape.CanEndExpressionAt(units, prev)
    && !ExpressionStatementPossibleShape.IsPostfixBangTail(units, prev)
    && !prevIsClosedBrace) {
  return false;
}
// 条件 5：本条语句的起点。**必须排在下面两个「确定性边界」早退之前**——那些边界是给
// **表达式语句**用的；`const f = () => {}` ⏎ `(y)` / `let v = x as T` ⏎ `(1)` 这类声明条目的
// 换行收口要由声明候选自己完成，终结候选若在这里 Accept 就会撞 CatalogGuide 的
// 「终结候选与其它候选同时成立」。
// 从 prev 往回跳过属于自己的 basic token（遇到建好的形状就停）。`limit` 是「本条语句所在段的
// 起点」：块体里的 units 还没有建形状，调用方必须传段首，否则会一路走回上一条语句的声明关键字。
const lowerBound = limit ?? 0;
let head = prev;
while (head > lowerBound && units[head - 1].IsBasicToken) {
  head--;
}
while (head < prev && units[head].IsTriviaToken) {
  head++;
}
// 被标声明（`en: enum E` 换行 `{ A }`）：段首是**标签名**时先跳过标签头，再看真正的声明关键字。
let statementHead = head;
let afterHead = statementHead + 1;
while (afterHead < units.length && units[afterHead].IsTriviaToken) {
  afterHead++;
}
if (units[statementHead] instanceof Common && afterHead < units.length
  && units[afterHead] instanceof Symbol && (units[afterHead] as Symbol).Is(":")) {
  let afterColon = afterHead + 1;
  while (afterColon < units.length && units[afterColon].IsTriviaToken) {
    afterColon++;
  }
  if (afterColon < units.length) {
    statementHead = afterColon;
  }
}
if (units[statementHead] instanceof Common
  && ExpressionStatementPossibleShape.IsDeclarationHeadWord((units[statementHead] as Common).TempToString())) {
  return false;
}
if (units[head] instanceof Common
  && ExpressionStatementPossibleShape.IsStatementWord((units[head] as Common).TempToString())
  // `yield` 是唯一的例外：它既是语句词、也是受限产生式的开头——`yield 1` ⏎ `yield* other()`
  // 的换行是 ASI 边界（yield 候选不在 root 的候选表里，不会撞共存）。
  && !(units[head] as Common).Is("yield")) {
  return false;
}
// `++` / `--` 既可后缀也可前缀：只有紧贴前一个「能结束表达式」的代码单元（中间无换行）时
// 它才是后缀（`a++` 能断句）；否则它是前缀运算符、还在等下一行的操作数（`a++; --\n a;` 里
// 那条语句是 `--a`，绝不能在 `--` 后面断句）。
if (units[prev] instanceof Symbol) {
  const operator = (units[prev] as Symbol).TempToString();
  if (operator === "++" || operator === "--") {
    let before = prev - 1;
    while (before >= 0 && units[before].IsTriviaToken) {
      before--;
    }
    // 「操作数与 `++` 之间不能有换行」同样按源位置判（块体的 Units 不带 trivia 单元）。
    if (before < 0
      || ExpressionStatementPossibleShape.HasLineBreakBefore(units, prev)
      || !ExpressionStatementPossibleShape.CanEndExpression(units[before])) {
      return false;
    }
    // 后缀 `++`/`--` 的结果不是合法的调用者 / 成员访问宿主（TS 的 UpdateExpression 不在
    // MemberExpression 里）：换行后接 `(` `[` `.` `?.` `!` 只能是新语句的起点——
    // `h++` ⏎ `(h)` 是两条语句（TS 在 `h++` 之后插 ASI）。同一行内不会走到这里（无换行即无边界）。
    if (current instanceof Bracket
      && (((current as Bracket).StartBracketChar === "(")
        || ((current as Bracket).StartBracketChar === "["))) {
      return true;
    }
    if (current instanceof Symbol) {
      const afterPostfix = (current as Symbol).TempToString();
      if (afterPostfix === "." || afterPostfix === "?." || afterPostfix === "!") {
        return true;
      }
    }
    // 标签模板的宿主同样不能是后缀 `++`/`--`（TS 的 UpdateExpression 不是 MemberExpression）：
    // `a++` ⏎ `` `t` `` 是两条语句（第二条是无替换模板表达式），不能并成 TaggedTemplateExpression。
    if (current instanceof String && (current as String).StringChar === "`") {
      return true;
    }
  }
}
// 非调用位表达式（箭头体 / as / satisfies）后面换行接 `(` `[` 反引号模板只能是新语句：
// TS 的 CallExpression / TaggedTemplate 宿主必须是 MemberExpression，箭头体与 as/satisfies
// 都不在其中（`x = () => {}` ⏎ `(1)`、`x as T` ⏎ `(1)` 都要 ASI）。
if ((current instanceof Bracket
    && (((current as Bracket).StartBracketChar === "(") || ((current as Bracket).StartBracketChar === "[")))
  || (current instanceof String && (current as String).StringChar === "`")) {
  if (ExpressionStatementPossibleShape.IsNonCallableExpressionTail(units, prev)) {
    return true;
  }
}
return !ExpressionStatementPossibleShape.IsContinuation(current);
```

## static method IsContextualIdentifier:(text:string)=>bool

`declare` / `abstract`：既是语句 / 修改符关键字，也能当普通标识符（TS：`declare;` / `abstract;`
都是 `ExpressionStatement(Identifier)`）。只有「同一行 + 合法声明关键字」那一种才是修改符。

```ts
return text === "declare" || text === "abstract";
```

## static method IsModifierKeyword:(text:string)=>bool

`declare` / `abstract` 后面能跟的、真正进入声明的关键字（同一行才算修改符）。

```ts
return text === "const" || text === "let" || text === "var" || text === "using"
  || text === "function" || text === "class" || text === "interface" || text === "enum"
  || text === "namespace" || text === "module" || text === "type" || text === "global"
  || text === "abstract" || text === "async";
```

## static method IsDeclarationHeadWord:(text:string)=>bool

声明头关键字：它们后面换行跟 `{` 时那个 `{` 是**声明体**，不是 ASI 边界
（`en: enum E` 换行 `{ A }`、`class C` 换行 `{}`）。与 `IsStatementWord` 不同：这里**不收**
`const` / `let` / `var`（`const a = 1` 换行 `{}` 是两条语句）。

```ts
return text === "class" || text === "interface" || text === "enum" || text === "namespace"
  || text === "module" || text === "function" || text === "declare" || text === "abstract";
```

## static method IsPostfixBangTail:(units:Array<Token>, last:int)=>bool

`last` 是不是**后缀** `!`（非空断言）：只有紧贴同一行、且左边能收住表达式时才是后缀
（`x!` ⏎ `g()` 里 `!` 是后缀，TS 在 `x!` 后插 ASI）；换行在 `!` 之前时它是前缀运算符，
仍在等下一行的操作数（`a` ⏎ `!b` 是两条语句，但那条 `!b` 不是后缀）。

```ts
if (!(units[last] instanceof Symbol) || (units[last] as Symbol).TempToString() !== "!") {
  return false;
}
let operand = last - 1;
let breakSeen = false;
while (operand >= 0 && units[operand].IsTriviaToken) {
  if (ExpressionStatementPossibleShape.HasLineBreak(units[operand])) {
    breakSeen = true;
  }
  operand--;
}
return operand >= 0 && !breakSeen && ExpressionStatementPossibleShape.CanEndExpression(units[operand]);
```
## static method IsNonCallableExpressionTail:(units:Array<Token>, last:int)=>bool

`last` 收尾的表达式是不是「不能当调用者 / 标签模板宿主」的那几种（箭头函数体、`as` / `satisfies`）。
TS 只在「换行继续会变成语法错误」时才插 ASI：CallExpression / TaggedTemplate 的宿主必须是
MemberExpression，箭头体与 as/satisfies 表达式都不在其中，所以换行后接 `(` `[` 反引号模板
只能是下一条语句。判据：从 `last` 往回在**同一括号层**里找 `=>` / `as` / `satisfies`；
遇到更外层的开括号就停（`(a as T)` ⏎ `(1)` 是合法调用，不能断）。

```ts
// 箭头函数的**块体**收尾：`last` 是块体 `{…}` 且紧邻它的代码单元是 `=>`
// （`x = () => {}` ⏎ `(y)`：块体不是 MemberExpression，`(` 只能是新语句起点 → ASI）。
// 箭头函数的 **concise body** 不同：`x = () => 1` ⏎ `(y)` 的 `(y)` 还能续在体表达式上
// （`1(y)`），TS 不断句——所以下面往回扫到 `=>` 时不能直接返回。
if (units[last] instanceof Bracket && (units[last] as Bracket).StartBracketChar === "{") {
  let beforeBody = last - 1;
  while (beforeBody >= 0 && units[beforeBody].IsTriviaToken) {
    beforeBody--;
  }
  return beforeBody >= 0 && units[beforeBody] instanceof Symbol
    && (units[beforeBody] as Symbol).TempToString() === "=>";
}
let depth = 0;
for (let at = last; at >= 0; at--) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  const range = unit.SourceRange;
  const raw = range.Start === null || range.End === null ? "" : range.GetRaw();
  const head = raw.length > 0 ? raw[0] : "";
  const tail = raw.length > 0 ? raw[raw.length - 1] : "";
  if (tail === ")" || tail === "]" || tail === "}") {
    depth++;
    continue;
  }
  if (head === "(" || head === "[" || head === "{") {
    if (depth === 0) {
      return false;
    }
    depth--;
    continue;
  }
  if (depth > 0) {
    continue;
  }
  if (unit instanceof Common) {
    const text = (unit as Common).TempToString();
    if (text === "as" || text === "satisfies") {
      return true;
    }
    if (ExpressionStatementPossibleShape.IsStatementWord(text)) {
      return false;
    }
  }
}
return false;
```
## static method HasLineBreakBefore:(units:Array<Token>, tokenIndex:int)=>bool

`tokenIndex` 之前紧邻的那段 trivia 里有没有换行（块注释里的换行也算）。按**源位置**在
前一代码单元与当前单元之间找 `\n` / `\r`：块体 / 体里的 `Units` 不一定带 trivia 单元
（`StatementBuilder` 的块数据只有代码单元），只扫 trivia 单元会在那里永远判出「没有换行」。

```ts
if (tokenIndex < 1) {
  return false;
}
let previous = tokenIndex - 1;
while (previous >= 0 && units[previous].IsTriviaToken) {
  previous--;
}
if (previous < 0) {
  return false;
}
const left = units[previous].SourceRange.End;
const right = units[tokenIndex].SourceRange.Start;
if (left !== null && right !== null) {
  const document = left.Document;
  let at = left.Index + 1;
  while (at < right.Index) {
    const ch = document.At(at).Value;
    if (ch === "\n" || ch === "\r") {
      return true;
    }
    at++;
  }
}
for (let at = tokenIndex - 1; at > previous; at--) {
  if (ExpressionStatementPossibleShape.HasLineBreak(units[at])) {
    return true;
  }
}
return false;
```

## static method IsExpressionTail:(unit:Token)=>bool

`export =` / `export default` 的表达式位置：这个代码单元能不能收住一条完整表达式。
比 `CanEndExpression` 多认一个 `{` 括号——在这个位置上 `{` 只可能是对象字面量 / 箭头函数体，
而 `CanEndExpression` 分不清 `{` 与裸块，统一按 false 处理。

```ts
if (ExpressionStatementPossibleShape.CanEndExpression(unit)) {
  return true;
}
if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{") {
  return true;
}
return false;
```

## static method IsStatementBoundaryAfterExpression:(units:Array<Token>, tokenIndex:int)=>bool

「换行之后，下一条语句的第一个代码单元到了」——`export =` / `export default` 两个候选在等 `;` 的阶段用它收口。
四条同时成立：当前是代码（不是 trivia / EOF / `;`）；与前一代码单元之间有换行；
前一代码单元能收住表达式（`IsExpressionTail`）；当前单元不是延续符（`IsContinuation`）。

它不判「本条语句的起点是不是语句关键字」——那一条是 `IsAsiBoundary` 的，而 export 语句的起点永远是 `export`，
所以那两个候选必须自己判，不能借 `IsAsiBoundary`。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const current = units[tokenIndex];
if (current.IsTriviaToken || current instanceof EndOfFileTokenShape) {
  return false;
}
if (current instanceof Symbol && (current as Symbol).Is(";")) {
  return false;
}
if (!ExpressionStatementPossibleShape.HasLineBreakBefore(units, tokenIndex)) {
  return false;
}
let previous = tokenIndex - 1;
while (previous >= 0 && units[previous].IsTriviaToken) {
  previous--;
}
if (previous < 0) {
  return false;
}
return ExpressionStatementPossibleShape.IsExpressionTail(units[previous])
  && !ExpressionStatementPossibleShape.IsContinuation(current);
```

## static method IsUncontinuableTailBoundary:(units:Array<Token>, tokenIndex:int)=>bool

「上一条表达式的尾巴注定接不上当前单元」——只认**确定**的几种，比 `IsStatementBoundaryAfterExpression`
更窄（变量语句 / `return` 操作数用它：那里若把 `{` 也一律当边界，会把 `function (): number` ⏎ `{ … }`
的函数体切断）：

- 当前是调用位（`(` / `[` / 反引号模板），且上一条以**后缀 `++`/`--`**（UpdateExpression 不是
  MemberExpression）或 **`=> {}` / `as` / `satisfies`** 收尾：`const a = x++` ⏎ `++y`、
  `const f = () => {}` ⏎ `(y)`、`const v = x as T` ⏎ `(1)`；
- 上一条是后缀 `++`/`--`/`!`，当前是 `++` `--` `!` `~`：这些都不是能续接的运算符。

其余（`{` 可能是函数 / 类表达式的体、类型运算符词等）一律返回 false，交给老的
`EndsAtLineBreak` / `ContinuesAcrossLine`。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const current = units[tokenIndex];
if (current.IsTriviaToken || current instanceof EndOfFileTokenShape) {
  return false;
}
if (current instanceof Symbol && (current as Symbol).Is(";")) {
  return false;
}
if (!ExpressionStatementPossibleShape.HasLineBreakBefore(units, tokenIndex)) {
  return false;
}
let previous = tokenIndex - 1;
while (previous >= 0 && units[previous].IsTriviaToken) {
  previous--;
}
if (previous < 0) {
  return false;
}
const currentIsCallPosition = (current instanceof Bracket
    && (((current as Bracket).StartBracketChar === "(") || ((current as Bracket).StartBracketChar === "[")))
  || (current instanceof String && (current as String).StringChar === "`");
if (currentIsCallPosition) {
  if (ExpressionStatementPossibleShape.IsPostfixOperatorAt(units, previous)) {
    const operatorText = (units[previous] as Symbol).TempToString();
    if (operatorText === "++" || operatorText === "--") {
      return true;
    }
  }
  return ExpressionStatementPossibleShape.IsNonCallableExpressionTail(units, previous);
}
if (ExpressionStatementPossibleShape.IsPostfixOperatorAt(units, previous)
  && current instanceof Symbol) {
  const currentText = (current as Symbol).TempToString();
  if (currentText === "++" || currentText === "--" || currentText === "!" || currentText === "~") {
    return true;
  }
}
return false;
```

## static method IsPostfixOperatorAt:(units:Array<Token>, index:int)=>bool

`index` 处的 `++` / `--` / `!` 是不是**后缀**（紧贴同一行、且左边能收住表达式）。
只有后缀形态才「注定接不上」调用位；前缀形态还在等操作数（`x++` 与 `a ⏎ ++b` 要分开）。

```ts
if (index < 0 || index >= units.length || !(units[index] instanceof Symbol)) {
  return false;
}
const text = (units[index] as Symbol).TempToString();
if (text !== "++" && text !== "--" && text !== "!") {
  return false;
}
let operand = index - 1;
while (operand >= 0 && units[operand].IsTriviaToken) {
  operand--;
}
return operand >= 0
  && !ExpressionStatementPossibleShape.HasLineBreakBefore(units, index)
  && ExpressionStatementPossibleShape.CanEndExpression(units[operand]);
```

## static method ExpressionEnd:(units:Array<Token>, from:int)=>int

块体里一条**表达式语句**读到哪一格结束：`;` 老的终止符、**换行 ASI 边界**、或本层末尾。
返回 `-1` 表示本层已经没有后续单元（调用方按「读到末尾」处理，与改前行为一致）。

判据与根级**同源**：`;` 是老路，ASI 直接读 `IsAsiBoundary`——解析期（`StatementScanner`）与
收尾期（`BuildExpressionStatement`）必须问同一个函数，否则会出现「一边断句、一边不断」。

```ts
for (let at = from; at < units.length; at++) {
  const unit = units[at];
  if (unit instanceof Symbol && (unit as Symbol).Is(";")) {
    return at;
  }
  if (unit instanceof EndOfFileTokenShape) {
    return at > from ? at - 1 : -1;
  }
  if (at > from && ExpressionStatementPossibleShape.IsAsiBoundary(units, at)) {
    let last = at - 1;
    while (last > from && units[last].IsTriviaToken) {
      last--;
    }
    return last;
  }
}
return -1;
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.constructor.name;
let state = cache.GetState<ExpressionStatementScan>(name);
if (state === null) {
  state = new ExpressionStatementScan();
  state.Start = ItemUtil.ItemStart(units);
  state.Checked = state.Start;
  cache.SetState(name, state);
}
if (state.Checked > tokenIndex + 1) {
  state.Start = ItemUtil.ItemStart(units);
  state.Checked = state.Start;
  state.Admitted = false;
  state.Done = false;
  state.DoneAt = -1;
  state.Rejected = false;
  state.AsyncStage = 0;
  state.ImportStage = 0;
  state.AwaitStage = 0;
  state.CodeCount = 0;
  state.FirstIdentifier = false;
  state.SawQuestion = false;
}
for (let at = state.Checked; at <= tokenIndex; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof EndOfFileTokenShape) {
    // 文件到头了：本条语句不可能再补 `;`。候选退出，把「建到边界为止」交给终结候选。
    state.Rejected = true;
    continue;
  }
  state.CodeCount++;
  if (state.CodeCount === 1 && unit instanceof Common) {
    state.FirstIdentifier = true;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is("?")) {
    state.SawQuestion = true;
  } else if (unit instanceof Symbol && (unit as Symbol).Is(":")
    && !state.SawQuestion && state.FirstIdentifier && state.CodeCount === 2) {
    // "Identifier :" at statement start can only be a labeled statement (a legal ternary
    // needs "?" first, and object literals / type contexts start with brackets or keywords).
    // Reject here so the statement candidate becomes unique and builds the LabeledStatement.
    state.Rejected = true;
    continue;
  }
  if (!state.Admitted) {
    state.Admitted = true;
    if (!this.CanStart(unit)) {
      state.Rejected = true;
    } else if (unit instanceof Common && (unit as Common).TempToString() === "async") {
      // async 箭头要累积确认：下一格必须是 `(` 或标识符，再下一格必须是 `=>`。
      state.AsyncStage = 1;
    } else if (unit instanceof Common && (unit as Common).TempToString() === "import") {
      // import.meta 要累积确认：下一个代码单元必须是 `.`，否则本候选退出。
      state.ImportStage = 1;
    } else if (unit instanceof Common && (unit as Common).TempToString() === "await") {
      // `await using` 是 using 声明：下一格是 using 就让语句候选独占这一格。
      state.AwaitStage = 1;
    }
  } else if (state.AsyncStage === 1) {
    if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "(") {
      // `async (…)`：调用位或带括号参数的箭头，先按「可能是箭头」继续看。
      state.AsyncStage = 2;
    } else if (unit instanceof Common && !(unit as Common).CanStartNumber()) {
      // `async x`：只有 `async x => …` 这一种，后面必须是 `=>`。
      state.AsyncStage = 4;
    } else {
      // `async function` / `async;` / `async` + 别的代码：不是 async 箭头，候选退出，
      // 别把函数声明的头劫持成表达式语句（function 声明候选还没进 root，保持「无候选」）。
      state.Rejected = true;
    }
  } else if (state.AsyncStage === 2) {
    if (unit instanceof Symbol && (unit as Symbol).Is("=>")) {
      state.AsyncStage = 3;
    } else {
      // `async(…)` 后面不是 `=>`：这不是箭头函数，`async` 只是一个被调用的标识符
      // （`async(1);`）。退回普通表达式语句，别把这一格让给「无候选」——
      // 让位之后 `;` 会成孤儿、落进 EOF 兜底的 ExpressionStatement 并抛「表达式语句没有读完」。
      state.AsyncStage = 0;
    }
  } else if (state.AsyncStage === 4) {
    if (unit instanceof Symbol && (unit as Symbol).Is("=>")) {
      state.AsyncStage = 3;
    } else {
      state.Rejected = true;
    }
  } else if (state.AwaitStage === 1) {
    if (unit instanceof Common && (unit as Common).TempToString() === "using") {
      // `await using` 进入这里说明首格是 await、次格是 using：这是声明，不是表达式语句。
      state.Rejected = true;
    } else {
      state.AwaitStage = 0;
    }
  } else if (state.ImportStage === 1) {
    if (unit instanceof Symbol && (unit as Symbol).Is(".")) {
      state.ImportStage = 2;
    } else if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "(") {
      // dynamic import: import(...) — the statement-layer candidate accepts the call start.
      state.ImportStage = 3;
    } else {
      // `import` 后面不是 `.`：不是 import.meta，候选退出（import 声明候选此时保持唯一）。
      state.Rejected = true;
    }
  }
  if (unit instanceof Symbol && (unit as Symbol).Is(";")) {
    state.Done = true;
    if (state.DoneAt < 0) {
      state.DoneAt = at;
    }
  }
}
// ASI：换行后到来的这个代码单元接不上前一条表达式，说明本条语句在换行处就结束了。
// 这里只「退出」——建那条语句是根终结候选的事（按边界 `FromUnits(..., false)` 收尾）。
if (!state.Done && ExpressionStatementPossibleShape.IsAsiBoundary(units, tokenIndex)) {
  state.Rejected = true;
}
state.Checked = tokenIndex + 1;
if (state.Rejected) {
  return ShapeStates.Reject;
}
if (state.Done) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const state = cache.GetState<ExpressionStatementScan>(this.constructor.name);
return state !== null && state.Done && !state.Rejected && state.DoneAt === tokenIndex;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const state = catalog.PossibleShapesComputeCache.GetState<ExpressionStatementScan>(this.constructor.name);
const start = state === null ? ItemUtil.ItemStart(host.Data) : state.Start;
const built = ExpressionStatementShape.FromUnits(host, start, tokenIndex, context);
host.Data.splice(start, tokenIndex - start + 1, built);
built.Parent = host;
return built;
```
