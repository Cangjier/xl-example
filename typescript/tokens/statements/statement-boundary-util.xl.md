# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { ExpressionStatementPossibleShape } from "./expression-statement-possible-shape.xl.md"
import { StatementScanner } from "./statement-scanner.xl.md"
import { StatementRouteUtil } from "./statement-route-util.xl.md"
import { TypeAliasDeclarationShape } from "../declarations/type-alias-declaration-shape.xl.md"
```

# namespace cangjie

# class StatementBoundaryUtil

`;` / ASI 判据的**唯一来源**。目录里的每个形状（根终结候选、块内扫描、类型别名收尾…）
都从这里读同一个判断，不允许出现第二份 ASI 写法的实现。

**`IsAsiBoundary` 唯一实现点 = `StatementBoundaryUtil`**：`ExpressionStatementPossibleShape.IsAsiBoundary`
只剩单行委托，函数体已逐字搬到这里（零行为变化，AST 门必须逐位不变）。

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

`limit` 是「本条语句所在段的起点」（可选）：块体里的 units 还没有建形状，调用方必须传段首。

> 说明：本方法体自 `expression-statement-possible-shape.xl.md` **逐字搬迁**（原 :359-558），一字未改；
> `limit?:int` 一并保留——`StatementBuilder` 的块内调用点传了段首，删掉会改变行为。

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
// 前缀位置的 `++` / `--` 收不住上一条表达式：它的操作数可以落在下一行
// （`a++; --` ⏎ `a;` 的第二条是 `--a;`）。只有 `++` / `--` 前面还有能收住表达式的单元时
// 它才是后缀、才可能构成 ASI 边界。
if (units[prev] instanceof Symbol
  && ((units[prev] as Symbol).Is("++") || (units[prev] as Symbol).Is("--"))) {
  let operatorStart = prev - 1;
  while (operatorStart >= 0 && units[operatorStart].IsTriviaToken) {
    operatorStart--;
  }
  if (operatorStart < (limit ?? 0)
    || !ExpressionStatementPossibleShape.CanEndExpressionAt(units, operatorStart)) {
    return false;
  }
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
// 类型实参 / 类型断言收尾的 `>`（`a as T<U>` / `f<T>`）不是 EndExpression 认的表达式尾，
// 但类型之后接 `(` / `[` / 模板是语法错 → 换行处是 ASI 边界（与 StatementScanner.EndsAtLineBreak
// 的同一支判据一致）。只处理 `>` 收尾：普通表达式尾`f(a as T)` ⏎ `(b)` 的调用是合法的，不能早断。
if ((current instanceof Bracket
    && (((current as Bracket).StartBracketChar === "(") || ((current as Bracket).StartBracketChar === "[")))
  || (current instanceof String && (current as String).StringChar === "`")) {
  if (units[prev] instanceof Symbol
    && ((units[prev] as Symbol).Is(">") || (units[prev] as Symbol).Is(">>") || (units[prev] as Symbol).Is(">>>"))
    && StatementScanner.IsCallPositionBlocked(units, prev)) {
    return true;
  }
}
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
const headFollow = afterHead;
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
// 标签语句（`lbl: …`）由语句候选建 LabeledStatement：换行处不是表达式语句的 ASI，
// 否则语句候选 Accept 的同时终结候选也 Accept，CatalogGuide 抛「同时成立」。
if (units[head] instanceof Common && headFollow < units.length
  && units[headFollow] instanceof Symbol && (units[headFollow] as Symbol).Is(":")) {
  return false;
}
// 双角色 / 上下文关键字（possible-compute）：`async` / `let` / `using` / `type` 只有能起声明时
// 才是声明头；否则它们起的是表达式语句（`let = 1`、`type = 1`、`using` 标识符…），换行处仍是
// ASI 边界。判据与候选 / StatementScanner 读同一套，不在两处各写一份。
if (units[head] instanceof Common) {
  const headText = (units[head] as Common).TempToString();
  let expressionHead = false;
  if (headText === "async") {
    let afterAsync = head + 1;
    while (afterAsync < units.length && units[afterAsync].IsTriviaToken) {
      afterAsync++;
    }
    expressionHead = !(afterAsync < units.length && units[afterAsync] instanceof Common
      && (units[afterAsync] as Common).Is("function"));
  }
  if ((headText === "let" || headText === "using") && !expressionHead) {
    let nextCode = head + 1;
    while (nextCode < units.length && units[nextCode].IsTriviaToken) {
      nextCode++;
    }
    if (headText === "let") {
      expressionHead = !StatementScanner.StartsBinding(units, nextCode);
    } else {
      expressionHead = !StatementScanner.StartsUsingDeclaration(units, head, nextCode);
    }
  }
  if (!expressionHead && headText === "type") {
    const headCode:Array<Token> = [];
    for (let at = head; at < units.length; at++) {
      if (!units[at].IsTriviaToken) {
        headCode.push(units[at]);
      }
    }
    expressionHead = !TypeAliasDeclarationShape.IsTypeAliasHead(headCode, headText);
  }
  if (!expressionHead && ExpressionStatementPossibleShape.IsStatementWord(headText)
    // `yield` 是唯一的例外：它既是语句词、也是受限产生式的开头——`yield 1` ⏎ `yield* other()`
    // 的换行是 ASI 边界（yield 候选不在 root 的候选表里，不会撞共存）。
    && !(units[head] as Common).Is("yield")) {
    return false;
  }
}
// 调用位：`(` / `[` / 反引号模板在换行后接上一条表达式，当且仅当上一条表达式能当调用者 /
// 标签模板宿主（TS 的 CallExpression / TaggedTemplate 宿主必须是 LeftHandSideExpression）。
// 块体箭头 `() => {}` 收尾的 `{}` 不是 `CanEndExpression` 认的表达式尾，所以这条必须放在
// `CanEndExpressionAt` **之前**；声明语句的换行处已由上面的语句起点判据挡掉，交给语句候选收口。
if ((current instanceof Bracket
    && (((current as Bracket).StartBracketChar === "(") || ((current as Bracket).StartBracketChar === "[")))
  || (current instanceof String && (current as String).StringChar === "`")) {
  if (ExpressionStatementPossibleShape.IsNonCallableExpressionTail(units, prev)) {
    return true;
  }
}
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

## static method EndsAtLineBreak:(code:Array<Token>, previousIndex:int, nextIndex:int)=>bool

**扫描器侧的换行收口判据**（`StatementScanner` 的唯一实现点，设计 §2.4 第 5 步）：

`previous` 能收尾、`next` 接不上、两者之间有换行 —— 三者都成立就是 ASI 边界。
调用 / 下标 / 标签模板位另有一条：`next` 虽然「接得上」（`(` 通常是续接），但当上一条表达式
不能当调用者时就接不上——与 `IsAsiBoundary` 读同一个判据。

> 本方法体自 `statement-scanner.xl.md` **逐字搬迁**（`EndsAtLineBreak` 原 :666-688），一字未改；
> 扫描器侧只剩一行委托，所以 `ScanExpressionBody`（块内表达式语句）/ `ScanToSemicolon`
> （声明尾）/ `ScanBreakOrContinue` / `ScanSimpleSemicolon` 读的是这一份实现。
> 与 `IsAsiBoundary` 的分工：`IsAsiBoundary` 是「候选层」判据（含声明头 / 标签 / 双角色关键字
> 的互斥），`EndsAtLineBreak` 是「扫描器层」判据（只做三条件 + 调用位），两者不可互换——
> 把扫描器那一格换成 `IsAsiBoundary` 会让 47 条 token-ast 用例回退
> （`不支持的表达式起点`），这一点已在 S2 第一轮实测过。

```ts
const previous = code[previousIndex];
const next = code[nextIndex];
if (StatementScanner.NoLineBreakBetween(previous, next)) {
  return false;
}
// 类型实参 / 类型断言收尾的 `>`（`a as T<U>` / `f<T>`）不是 `EndsExpression` 认的表达式尾
//（它只认 `++` / `--`），但类型之后接 `(` / `[` / 模板同样是语法错 → 换行处是 ASI 边界。
if (StatementScanner.IsCallishUnit(next) && previous instanceof Symbol) {
  const previousSymbol = (previous as Symbol).TempToString();
  if ((previousSymbol === ">" || previousSymbol === ">>" || previousSymbol === ">>>")
    && StatementScanner.IsCallPositionBlocked(code, previousIndex)) {
    return true;
  }
}
if (!StatementScanner.EndsExpression(previous)) {
  return false;
}
if (StatementScanner.IsCallishUnit(next) && StatementScanner.IsCallPositionBlocked(code, previousIndex)) {
  return true;
}
return !StatementScanner.ContinuesAcrossLine(next);
```

## static method IsSemicolon:(unit:Token)=>bool

这个代码单元是不是 `;`（语句自己的终结符）。

```ts
return unit instanceof Symbol && (unit as Symbol).Is(";");
```

## static method IsEof:(tokenIndex:int, units:Array<Token>)=>bool

这一格是不是 EOF 哨兵（根单元的结束）。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
return units[tokenIndex] instanceof EndOfFileTokenShape;
```

## static method CanEndStatement:(units:Array<Token>, tokenIndex:int, atEof:bool)=>bool

一条语句能不能在 `tokenIndex` 这一格结束：`;`、EOF、或 ASI 边界三者之一。
`atEof` 是调用方已知的「已经在文件末尾」，与 `IsEof` 取并集（哨兵没显式出现在 units 里时也要成立）。

```ts
if (atEof) {
  return true;
}
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
return StatementBoundaryUtil.IsSemicolon(units[tokenIndex])
  || StatementBoundaryUtil.IsEof(tokenIndex, units)
  || StatementBoundaryUtil.IsAsiBoundary(units, tokenIndex);
```
## static method IsDeclarationFollowBoundary:(units:Array<Token>, tokenIndex:int)=>bool

**声明壳的「下一条语句已到」边界**（Stage 4ab）：`IsAsiBoundary` 的条件 5 对以声明关键字开头的条目
一律返回 `false`（`class C` ⏎ `{}` 的 `{` 是声明头的一部分，那里不存在「上一条表达式」）。
声明壳因此永远收不了口：`interface I { }` ⏎ `const a = 1;` 的 `const` 到达时，壳把下一条语句也吞进去，
最后 `BuildFromShell` 读到两条语句抛错 → `DetachShell` 整段退回 raw（decl=2 / 首节点 `Common` 的根因）。

本方法只回答**声明壳**的收口：当前代码单元是一个**能起一条新语句的单词**，且换行之前那一段已经完整。
它与 `IsAsiBoundary` 的分工是「收口对象不同」，不是第二份 ASI：
换行、可收尾、非延续三条仍旧读 `ExpressionStatementPossibleShape` 的同一批判据；
条件 5 只在 `IsAsiBoundary` 里保留（本方法不调用它，也不改它）。

```ts
if (tokenIndex < 1 || tokenIndex >= units.length) {
  return false;
}
const current = units[tokenIndex];
if (current.IsTriviaToken || current instanceof EndOfFileTokenShape) {
  return false;
}
if (current instanceof Symbol && (current as Symbol).Is(";")) {
  return false;
}
// 只认单词起点：`{` / `<` / `=` / `(` 等符号既可能是声明内部构件，也可能是续接，一律不算。
if (!(current instanceof Common)) {
  return false;
}
const text = (current as Common).TempToString();
if (!StatementRouteUtil.IsLegacyKeyword(text)
  && text !== "let" && text !== "const" && text !== "var") {
  return false;
}
let prev = tokenIndex - 1;
while (prev >= 0 && units[prev].IsTriviaToken) {
  prev--;
}
if (prev < 0) {
  return false;
}
// 换行判据与 `IsAsiBoundary` 同一份（`HasLineBreakBefore` 按源位置找，块体 units 不带 trivia）。
if (!ExpressionStatementPossibleShape.HasLineBreakBefore(units, tokenIndex)) {
  return false;
}
// 声明体的收尾是闭合的 `{…}`（interface / enum / namespace / module / export {…}）：
// `CanEndExpression` 分不清 `{` 与裸块、统一按 false 处理，这里按「已闭合」计入。
if (units[prev] instanceof Bracket && (units[prev] as Bracket).StartBracketChar === "{") {
  return true;
}
return ExpressionStatementPossibleShape.CanEndExpressionAt(units, prev);
```

## static method IsLateAtEof:(units:Array<Token>, tokenIndex:int)=>bool

**晚建守卫的 EOF 半边**（Stage 4x）：从 `statement-possible-shape` 的 `declaration-statement-possible-shape`
里原样上移，供 `CanEndStatementAt` 与 legacy 让位门控共用一份判据。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const owner = units[tokenIndex].Parent;
const end = units[tokenIndex].SourceRange.EndIndex;
return (owner !== null && owner.SourceRange.EndIndex >= 0)
  || (end >= 0 && StatementScanner.NextChar(units[tokenIndex].SourceRange.Document, end) === "");
```

## static method CanEndStatementAt:(units:Array<Token>, tokenIndex:int)=>bool

**「这一格之前能不能收口」的唯一入口**（Stage 4x）：`CanEndStatement` + `IsLateAtEof` 的组合，
原先在 `DeclarationStatementPossibleShape.ComputeByIndex` / `IsBuildable` 里**各抄了一遍**。
现在三处（`ComputeByIndex`、`IsBuildable`、`StatementRouteUtil.ShouldYieldToDeclarationShell`）
读同一个函数，判据不会分叉。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
return StatementBoundaryUtil.CanEndStatement(units, tokenIndex, StatementBoundaryUtil.IsLateAtEof(units, tokenIndex));
```