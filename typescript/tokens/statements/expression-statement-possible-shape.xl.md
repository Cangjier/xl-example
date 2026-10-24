# dependencies
```xl
import { StatementRoute } from "./statement-route-util.xl.md"
import { StatementRouteUtil } from "./statement-route-util.xl.md"
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
import { StatementScanner } from "./statement-scanner.xl.md"
import { StatementBoundaryUtil } from "./statement-boundary-util.xl.md"
import { LineTerminator } from "../../run/line-terminator.xl.md"
import { TypeAliasDeclarationShape } from "../declarations/type-alias-declaration-shape.xl.md"
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

## field DualStage:int = 0

## field DualAt:int = -1

## field AwaitUsingAt:int = -1

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
  // `yield` 同理：TS 的 parse 视角下顶层 `yield 1;` 也是合法语句（语义层才报「yield 只能在
  // generator 里」），语句首放行后 builder 的 ParseYield 能建 YieldExpression。原先它被
  // `IsStatementWord` 排除 → 根级零候选 → 终结候选兜底崩在「SourceRange.End has been setted」。
  if (text === "yield") {
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
行终止符口径见 `LineTerminator`（LF / CR / U+2028 / U+2029，cover8-A）。

```ts
return LineTerminator.HasLineBreakUnit(unit);
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
属性名，不是语句关键字。所以按上下文再放开两格：

- 紧邻的前一代码单元是 `.` / `?.` 时，任何 Common 都能收住（TS 的 `a.class` 是 PropertyAccessExpression）；
- `let` / `using` 是上下文关键字：后面**不能**起绑定时它们只是标识符，可以收住一条表达式
  （`using` ⏎ `x = y;` 是两条语句；`let` 同理；与候选的 DualStage 同一判据）。
- `type` 也是上下文关键字（同理）：只有「名字与 `type` 同行 + 名字后面紧跟 `=` / `<`」才是声明头
  （`TypeAliasDeclarationShape.IsTypeAliasHead`）；否则 `type` 是标识符，可以收住一条表达式——
  `type` ⏎ `T = 1` 是两条 ExpressionStatement（Z01–Z16）。没有这一格，换行处终结候选不会 Accept，
  `type` 与 `T = 1` 会被并成一条 TypeAliasDeclaration（或者拖到 EOF 兜底 crash）。

```ts
if (ExpressionStatementPossibleShape.CanEndExpression(units[index])) {
  return true;
}
if (units[index] instanceof Common) {
  const keywordText = (units[index] as Common).TempToString();
  if (keywordText === "let" || keywordText === "using") {
    let nextCode = index + 1;
    while (nextCode < units.length && units[nextCode].IsTriviaToken) {
      nextCode++;
    }
    const isDeclaration = keywordText === "let"
      ? StatementScanner.StartsBinding(units, nextCode)
      : StatementScanner.StartsUsingDeclaration(units, index, nextCode);
    if (!isDeclaration) {
      return true;
    }
  }
  if (keywordText === "type") {
    // 声明头判据与 TypeAliasDeclarationPossibleShape 的 Stage 1 读同一份：
    // 同行 + 名字 + `=`/`<`。两者不一致会一边判「别名」一边判「表达式」（候选共存 crash）。
    const headCode:Array<Token> = [units[index]];
    for (let at = index + 1; at < units.length; at++) {
      if (!units[at].IsTriviaToken) {
        headCode.push(units[at]);
      }
    }
    if (!TypeAliasDeclarationShape.IsTypeAliasHead(headCode, keywordText)) {
      return true;
    }
  }
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
// 唯一实现点 = StatementBoundaryUtil（函数体已逐字搬迁，本方法只做委托）。
return StatementBoundaryUtil.IsAsiBoundary(units, tokenIndex, limit);
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

`last` 收尾的表达式是不是「不能当调用者 / 标签模板宿主」：`as` / `satisfies` 的类型之后、
**块体**箭头函数 `() => {}` 之后。TS 只在「换行继续会变成语法错误」时才插 ASI，
所以这两处换行后接 `(` `[` 反引号模板只能是下一条语句。

实现只有一份：`StatementScanner.IsCallPositionBlocked`（语句候选的 ASI 判据也调它，
两侧不会一边断、一边不断）。表达式体箭头不算：`() => x` ⏎ `(b)` 是 `() => x(b)`。

```ts
return StatementScanner.IsCallPositionBlocked(units, last);
```
## static method HasLineBreakBefore:(units:Array<Token>, tokenIndex:int)=>bool

`tokenIndex` 之前紧邻的那段 trivia 里有没有换行（块注释里的换行也算）。按**源位置**在
前一代码单元与当前单元之间找行终止符（LF / CR / U+2028 / U+2029，见 `LineTerminator`）：
块体 / 体里的 `Units` 不一定带 trivia 单元（`StatementBuilder` 的块数据只有代码单元），
只扫 trivia 单元会在那里永远判出「没有换行」。

```ts
return LineTerminator.HasBefore(units, tokenIndex);
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

另加一条**窄判据**（与变量语句 / `return` 操作数共用 `IsUncontinuableTailBoundary`）：
当前是调用位（`(` / `[` / 反引号模板）且上一格是**注定当不了调用者**的尾巴（块体箭头 `=> {}`、
`as` / `satisfies` 的类型、后缀 `++` / `--`）时，无论 `IsContinuation` 怎么说都是边界——
`export default a as T` ⏎ `(b)` 是两条语句，而 `export default a` ⏎ `(b)` 仍是 `a(b)` 一条。

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
// 调用位 + 不可调用尾：`(` / `[` / 模板「接得上」的前提是上一格能当调用者 / 标签模板宿主；
// `as` / `satisfies` 的类型、块体箭头、后缀自增都当不了，TS 就在那里插 ASI。
if (ExpressionStatementPossibleShape.IsUncontinuableTailBoundary(units, tokenIndex)) {
  return true;
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
// 换行后的 `{`：上一单元能收住一条表达式，且前缀上下文不是「还在等体」的头
//（`function ()` / `class A` / `=>` / 控制头 `(...)`）——那么这里只能是**块语句**的起点，
//就是 ASI 边界。否则扫描器会把下一条块语句吸进本条语句（`let a = 1` ⏎ `{ b; }`）。
if (current instanceof Bracket && (current as Bracket).StartBracketChar === "{"
  && ExpressionStatementPossibleShape.CanEndExpression(units[previous])
  && !ExpressionStatementPossibleShape.ExpectsBodyBefore(units, previous)) {
  return true;
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

## static method ExpectsBodyBefore:(units:Array<Token>, previousIndex:int)=>bool

`previousIndex` 处的收尾单元后面紧跟的 `{`，是不是**某个头还欠着的体**？

只有「还在等体」时返回 true：`function ()` / `class A` / `class A extends B` / `interface A` / `enum A` /
`namespace A` / 箭头 `=>` / 控制头 `if (a)` `for (…)` `while (…)` `switch (…)` `with (…)` `catch (…)`。
其余一律 false——那时换行后的 `{` 只能是一条新的块语句。

```ts
if (previousIndex < 0 || previousIndex >= units.length) {
  return false;
}
const tail = units[previousIndex];
if (tail instanceof Bracket) {
  // 已经闭合的体 / 对象字面量：头不可能还在等体。
  if ((tail as Bracket).StartBracketChar === "{") {
    return false;
  }
  // `if (a)` 这种紧邻控制头的调用位括号：体还没出现。
  if ((tail as Bracket).StartBracketChar === "(") {
    let before = previousIndex - 1;
    while (before >= 0 && units[before].IsTriviaToken) {
      before--;
    }
    if (before >= 0 && units[before] instanceof Common) {
      if (ExpressionStatementPossibleShape.IsBodyExpectingHead((units[before] as Common).TempToString())) {
        return true;
      }
    }
  }
} else if (tail instanceof Common) {
  if (ExpressionStatementPossibleShape.IsBodyExpectingHead((tail as Common).TempToString())) {
    return true;
  }
} else if (tail instanceof Symbol) {
  if ((tail as Symbol).TempToString() === "=>") {
    return true;
  }
}
for (let at = previousIndex - 1; at >= 0; at--) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Bracket) {
    if ((unit as Bracket).StartBracketChar === "{") {
      return false;
    }
    continue;
  }
  if (unit instanceof Symbol) {
    const text = (unit as Symbol).TempToString();
    if (text === ";") {
      return false;
    }
    if (text === "=>") {
      return true;
    }
    continue;
  }
  if (unit instanceof Common) {
    const text = (unit as Common).TempToString();
    if (ExpressionStatementPossibleShape.IsBodyExpectingHead(text)) {
      return true;
    }
    if (ExpressionStatementPossibleShape.IsStatementHead(text)) {
      return false;
    }
    continue;
  }
  return false;
}
return false;
```

## static method IsBodyExpectingHead:(text:string)=>bool

`text` 是不是一个「后面必须有一个 `{` 体」的头关键字。

```ts
return text === "function" || text === "class" || text === "extends" || text === "interface"
  || text === "enum" || text === "namespace" || text === "module" || text === "implements"
  || text === "abstract" || text === "if" || text === "for" || text === "while"
  || text === "switch" || text === "with" || text === "catch" || text === "else"
  || text === "do" || text === "try" || text === "finally";
```

## static method IsStatementHead:(text:string)=>bool

`text` 能否开头一条语句：向回扫头关键字时遇到它就停下（跨语句不算）。

```ts
return text === "let" || text === "const" || text === "var" || text === "using"
  || text === "export" || text === "declare" || text === "import" || text === "return"
  || text === "throw" || text === "case" || text === "default" || text === "yield"
  || text === "await" || text === "type" || text === "break" || text === "continue";
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
// Stage 1 T1d（设计 §3.2）：`ShellPlainExpression` 起点由 `RootExpressionStatementPossibleShape` 建壳接管，
// 本候选在根格主动让位（`Reject` 永久，但 `Reset` 会复原，不会饿死后续条目）。只有 trivia 时 `Decide` 返回
// `None`，这里不 Reject。本方法只被根目录调用；块内走 `ExpressionEnd` / `IsAsiBoundary`，不受影响。
if (StatementRouteUtil.EnableShellExpressions
  && StatementRouteUtil.Decide(units, tokenIndex) === StatementRoute.ShellPlainExpression) {
  return ShapeStates.Reject;
}
const name = this.Slot();
let state = cache.GetState<ExpressionStatementScan>(name);
if (state === null) {
  state = new ExpressionStatementScan();
  state.Start = ItemUtil.ItemStartCached(units, cache);
  state.Checked = state.Start;
  cache.SetState(name, state);
}
if (state.Checked > tokenIndex + 1) {
  state.Start = ItemUtil.ItemStartCached(units, cache);
  state.Checked = state.Start;
  state.Admitted = false;
  state.Done = false;
  state.DoneAt = -1;
  state.Rejected = false;
  state.AsyncStage = 0;
  state.ImportStage = 0;
  state.AwaitStage = 0;
  state.DualStage = 0;
  state.DualAt = -1;
  state.AwaitUsingAt = -1;
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
    const firstText = unit instanceof Common ? (unit as Common).TempToString() : "";
    // `let` / `using` 是上下文关键字（不是保留字）：后面能起绑定才是声明（让位给语句候选），
    // 否则 `let` / `using` 就是普通标识符——`let = 1` / `let: 1` / `let(x)` / `using;`
    // 都是表达式语句（或标签，标签在上一格 `:` 处已退出）。判据与 TS 的
    // `isLetDeclaration` / `isUsingDeclaration` 一致，与语句候选读同一个 StartsBinding。
    if (firstText === "let" || firstText === "using" || firstText === "type") {
      state.DualStage = firstText === "let" ? 1 : (firstText === "using" ? 2 : 3);
      state.DualAt = at;
    } else if (!this.CanStart(unit)) {
      state.Rejected = true;
    } else if (unit instanceof Common && (unit as Common).TempToString() === "async") {
      // async 箭头要累积确认：下一格必须是 `(` 或标识符，再下一格必须是 `=>`。
      state.AsyncStage = 1;
    } else if (unit instanceof Common && (unit as Common).TempToString() === "import") {
      // import.meta 要累积确认：下一个代码单元必须是 `.`，否则本候选退出。
      state.ImportStage = 1;
    } else if (unit instanceof Common && (unit as Common).TempToString() === "await") {
      // `await using` 是 using 声明：下一格是 using 且第三格能起绑定就让语句候选独占这一格。
      state.AwaitStage = 1;
    }
  } else if (state.DualStage === 1) {
    // `let` 的下一格：`[` / `{` / 非保留字 Common 是绑定 → 声明，本候选退出；其余（`=` / `(` /
    // `.` / `:` / 运算符）说明 `let` 是标识符，继续当表达式语句。
    if (StatementScanner.StartsBinding(units, at)) {
      state.Rejected = true;
    } else {
      state.DualStage = 0;
    }
  } else if (state.DualStage === 2) {
    // `using` 要求**同一行**跟绑定标识符或 `{`（`[` 不在内）。
    if (StatementScanner.StartsUsingDeclaration(units, state.DualAt, at)) {
      state.Rejected = true;
    } else {
      state.DualStage = 0;
    }
  } else if (state.DualStage === 3) {
    // `type` 双角色的第一格：别名头要求「名字 + `=`/`<`」，先看这一格是不是名字。
    if (unit instanceof Common) {
      state.DualStage = 4;
    } else {
      state.DualStage = 0;
    }
  } else if (state.DualStage === 4) {
    // `type` 双角色的第三格：`=` / `<` 才是别名声明头，其余说明 `type` 是标识符。
    if (unit instanceof Symbol && ((unit as Symbol).Is("=") || (unit as Symbol).Is("<"))) {
      state.Rejected = true;
    } else {
      state.DualStage = 0;
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
      // 首格 await、次格 using：还要看第三格。`await using;` 是 AwaitExpression(Identifier)，
      // 不是声明；只有 `await using <绑定>`（同一行）才让位。
      state.AwaitStage = 2;
      state.AwaitUsingAt = at;
    } else {
      state.AwaitStage = 0;
    }
  } else if (state.AwaitStage === 2) {
    if (StatementScanner.StartsUsingDeclaration(units, state.AwaitUsingAt, at)) {
      // `await using` 进入这里说明三格齐了：这是声明，不是表达式语句。
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
const state = cache.GetState<ExpressionStatementScan>(this.Slot());
return state !== null && state.Done && !state.Rejected && state.DoneAt === tokenIndex;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const state = catalog.PossibleShapesComputeCache.GetState<ExpressionStatementScan>(this.Slot());
const start = state === null ? ItemUtil.ItemStart(host.Data) : state.Start;
const built = ExpressionStatementShape.FromUnits(host, start, tokenIndex, context);
host.Data.splice(start, tokenIndex - start + 1, built);
built.Parent = host;
return built;
```
