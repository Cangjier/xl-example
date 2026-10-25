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
import { TypeBuilder } from "../types/type-builder.xl.md"
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

## static method IsInstantiationTailAsiBoundary:(units:Array<Token>, tokenIndex:int, limit?:int)=>bool

**实例化表达式收尾的换行边界**（gap-edge2 的那一格；Stage 5d-10b 从 `IsAsiBoundary` 函数体移出）：
`a < b >` ⏎ `c` 里 `>` 收的是一段类型实参、表达式到此为止，`c` 是下一条语句。`CanEndExpressionAt`
不认 `>`（值位是二元运算符），所以基线 `IsAsiBoundary` 在第 100 行那处三连判上返回 `false`。

**为什么单列**：规则要求 `IsAsiBoundary` 的既有函数体与基线 `7cc30e41` **逐字节一致**。gap-edge2 曾在
那个三连判里补过一条 `&& !StatementScanner.IsInstantiationClose(units, prev)`；本轮把这一条移到这里，
`IsAsiBoundary` 恢复基线原文（`HANDOFF-5d10b.md` §2 有 `git show` 的对比证据）。

**这不是第二套 ASI**：本方法只回答**一种形态**（收尾单元是 `>` / `>>` / `>>>` 且
`StatementScanner.IsInstantiationClose` 认它是类型实参收尾）；其余五条条件——当前是代码、`prev` 存在、
两者之间有换行、语句首不是声明头 / 标签 / 语句词、当前单元不是续接符——逐条读 `IsAsiBoundary` 读的
**同一批**唯一实现（`HasLineBreakBefore` / `IsDeclarationHeadWord` / `IsStatementWord` / `IsContinuation`，
`IsInstantiationClose` 也只是 `AngleJudge` 的唯一委托）。两条入口合起来才是「`IsAsiBoundary` + 这一格」。

**调用方**：`ExpressionStatementPossibleShape.IsAsiBoundary`（候选层委托，一行并集）与
`StatementBoundaryUtil.StatementEndCode` 的 ASI 分支。**legacy 直接读 `StatementBoundaryUtil.IsAsiBoundary`
的调用点保持旧行为**（`CanEndStatement` 是其中一处；它本轮仍在用，不删）。被删的是
`CanEndStatementAt`（无生产调用，见 `IsLateAtEof` 一节的说明）。

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
let prev = tokenIndex - 1;
while (prev >= 0 && units[prev].IsTriviaToken) {
  prev--;
}
if (prev < 0) {
  return false;
}
// 唯一新增的一格：收尾单元是实例化类型实参的 `>`。
if (!(units[prev] instanceof Symbol)) {
  return false;
}
const tailText = (units[prev] as Symbol).TempToString();
if (tailText !== ">" && tailText !== ">>" && tailText !== ">>>") {
  return false;
}
if (!StatementScanner.IsInstantiationClose(units, prev)) {
  return false;
}
if (!ExpressionStatementPossibleShape.HasLineBreakBefore(units, tokenIndex)) {
  return false;
}
// 以下与 `IsAsiBoundary` 条件 5 逐条同源（段首回走 / 标签头 / 声明头 / 双角色关键字 /
// 非调用位尾巴 / 续接符）：判据是同一批实现，不是第二份写法。
const lowerBound = limit ?? 0;
let head = prev;
while (head > lowerBound && units[head - 1].IsBasicToken) {
  head--;
}
while (head < prev && units[head].IsTriviaToken) {
  head++;
}
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
if (units[head] instanceof Common && headFollow < units.length
  && units[headFollow] instanceof Symbol && (units[headFollow] as Symbol).Is(":")) {
  return false;
}
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
    && !(units[head] as Common).Is("yield")) {
    return false;
  }
}
// 调用位 / 非调用位尾巴：`IsInstantiationClose` 已经排除「follower 是调用位」，所以这两支对
// `>` 收尾不会命中；仍按同一顺序问一次，保证与 `IsAsiBoundary` 的判定顺序逐格一致。
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
// **类型实参表收尾的 `>` + 换行后一条新语句**（gap-AS1）：`let a: Foo<Bar>` ⏎ `let b = 1;`。
// `EndsExpression` 不认 `>`（它在值位是二元运算符），可这里那个 `>` 关闭的是**类型实参表**
//（`IsTypeArgumentClose`：配对交给 `AngleJudge.FindClose`，再要求 `<` 坐在类型位），
// 类型之后没有右操作数可再接 → 下一格接不上就是 ASI 边界。
// 闸门是「类型位」本身：`a < b >` ⏎ `c` 的 `<` 不在类型位，仍走下面的旧路径（比较式尾不接受 ASI）。
if (previous instanceof Symbol) {
  const typeArgumentTail = (previous as Symbol).TempToString();
  if ((typeArgumentTail === ">" || typeArgumentTail === ">>" || typeArgumentTail === ">>>")
    && StatementScanner.IsTypeArgumentClose(code, previousIndex)
    && !ExpressionStatementPossibleShape.IsContinuation(next)) {
    return true;
  }
}
// **实例化表达式收尾的 `>` + 换行后一条新语句**（gap-edge2）：`a < b >` ⏎ `c`。
// TS 的 `canFollowTypeArgumentsInExpression` 在 `>` 之后是标识符但**有换行**时接受类型实参 ⇒
// `a < b >` 是一条完整的 `ExpressionWithTypeArguments` 语句，`c` 是下一条。`EndsExpression`
// 不认 `>`（值位是二元运算符），所以这一支单独判：`<` 在**表达式位**且 `>` 收尾（判据唯一实现
// = `AngleJudge.IsInstantiationClose`；follower 是 `(` / 模板时 TS 建的是带类型实参的调用，
// 该判据自己返回 false，不会早断）。
if (previous instanceof Symbol) {
  const instantiationTail = (previous as Symbol).TempToString();
  if ((instantiationTail === ">" || instantiationTail === ">>" || instantiationTail === ">>>")
    && StatementScanner.IsInstantiationClose(code, previousIndex)) {
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
  || StatementBoundaryUtil.IsAsiBoundary(units, tokenIndex)
  // Stage 5d-10b：`module` / `namespace` 与名字之间换行时 TS 判它是标识符（两条表达式语句），
  // `IsAsiBoundary` 的条件 5 把这两个词当声明头、答 `false`，这一格由补充判据并入。
  || StatementBoundaryUtil.IsDeclinedDeclarationHeadBoundary(units, tokenIndex);
```

## static method IsDeclinedDeclarationHeadBoundary:(units:Array<Token>, tokenIndex:int)=>bool

**被 TS 判成标识符的上下文声明头之后的换行边界**（Stage 5d-10b）：`module` ⏎ `M = 1;` /
`namespace` ⏎ `N = 1;` 在 TS 里都是「一条 `ExpressionStatement(module / namespace)` + 一条赋值表达式语句」
（`parseModuleOrNamespaceDeclaration` 的名字与声明词必须同行，TS 的 `nextTokenIsOnSameLineAndCanFollowModifier`
不成立时那只是一条表达式语句）。

**为什么单列**：`IsAsiBoundary` 的条件 5 用 `IsDeclarationHeadWord` 把 `module` / `namespace` 当声明头
（`class C` ⏎ `{}` 的 `{` 是类体，那一格确实不存在 ASI），而这几个词在**换行**时根本不是声明头。
函数体按规则冻结在基线 `7cc30e41`，所以这一格由本方法补，并由 `CanEndStatement` 并入（`;` / EOF / ASI
之外的第四条边界）——`SourceFileEndPossibleShape.ComputeByIndex` 与 `RootExpressionStatementPossibleShape`
读的都是 `CanEndStatement` 这一份。

**不新写判据**：段首是不是「被 TS 拒绝的声明头」读 `StatementRouteUtil.DeclinesDeclarationHead`
（路由 `DecideDeclaration` 与 `DeclarationStatementPossibleShape` 读的同一份），「有换行」读
`ExpressionStatementPossibleShape.HasLineBreakBefore`。`prev` 必须是那个声明词本身，所以 `= / ;` 之后的格子
不会重复成立。

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
let prev = tokenIndex - 1;
while (prev >= 0 && units[prev].IsTriviaToken) {
  prev--;
}
if (prev < 0) {
  return false;
}
if (!(units[prev] instanceof Common)) {
  return false;
}
const headText = (units[prev] as Common).TempToString();
if (headText !== "type" && headText !== "module" && headText !== "namespace") {
  return false;
}
if (!StatementRouteUtil.DeclinesDeclarationHead(units)) {
  return false;
}
return ExpressionStatementPossibleShape.HasLineBreakBefore(units, tokenIndex);
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

**Stage 4af-B：补两条普通单词起点判据**（判据一原样保留，`IsAsiBoundary` 函数体不动）：

- **判据二**：`prev` 是已闭合的 `{…}` 括号单元时（`interface` / `enum` / `namespace` / `module` /
  `export {…}` 的体收尾），下一格的普通单词就是下一条语句的起点。能接在闭合 `{}` 后面继续同一条声明的
  单词只有 `from`（`export { a }` ⏎ `from "m"`），因此排除。
- **判据三**：`prev` 能收住一条完整表达式（`declare function f<T>(): T` ⏎ `f<string>;` 的 `T`）时同样成立。
  泛型实例化的下一条语句以普通单词开头，判据一（只认关键字）看不见它，壳会把两条一起吞掉。
- 判据二 / 三的「不能是续接词」清单是：`from`、`extends`、`implements`（声明头续接），
  再加 `ExpressionStatementPossibleShape.IsContinuation`（`in` / `instanceof` / `as` / `satisfies`，
  `export default { … }` ⏎ `satisfies T` 仍是一条）。这份清单与 `IsAsiBoundary` 读同一个 `IsContinuation`，
  不新写第二套表达式续接判据；符号起点（`|` / `&` / `[` / `<` …）在判据一之前就被排除，不受影响。

**Stage 4af-D：判据一 / 判据三的「上一段已完整」改读 `CanEndDeclarationTail`**。原来的
`CanEndExpressionAt` 是**表达式**口径，而声明头收尾的常常是**类型**：`declare function f(): void` ⏎
`export { … }` 的 `void` 被判成「还在等操作数」，壳因此不收口，把后面的 `export` / `const` 整段吞进去
（`undici-types/index.d.ts` 打开态唯一 real-dts 残留）。判据只多认 `void` 一格（见
`CanEndDeclarationTail`），换行 / 续接 / 关键字三条仍是这一份实现。

**Stage 4af-E：换行后的 `@` 是下一条装饰器声明的起点**。装饰器在词法上是 Symbol `@`、不是 Common，
所以「只认单词起点」那一格把它整条挡掉了：`declare function gf(): void` ⏎ `@dec class C {}` 的壳不在
`@` 收口，把装饰器声明一起吞进函数声明，`BuildFromShell` 只建出前一条（`end-build` 47 条结构差的
根因）。这一格只在**声明壳**里认（`@` + 前面有换行 + 上一段能收尾，条件与
`StatementScanner.IsDecoratedDeclarationStart` 同口径）：符号起点里的 `@` 是唯一能起一条新声明的
一个，其余符号（`|` / `&` / `[` / `<` / `=` / `(`）仍可能是续接，照旧不算。`@` 之后到底是不是
一条声明、是哪一条，仍由 legacy 候选 / 根终结候选自己的装饰器扫描判，这里不新写第二份。

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
// **Stage 5d-8c：import 的 `with` / `assert` 子句可以写在模块说明符的下一行**。
// `import a from "m"` ⏎ `with { type: "json" };` 是**一条** ImportDeclaration（TS 实测），
// 而 `with` 是 legacy 关键字 → 判据一会在字符串后面收口，把 `with { … }` 拆成一条 WithStatement
// （AST 直接少一个 attributes 子句）。判据只看「上一格是模块说明符」：字符串前一格是 `from`
// 或 `import`，才是 import 声明的说明符；其余字符串收尾照旧收口。
if (units[prev] instanceof String) {
  const prevText = (current as Common).TempToString();
  if (prevText === "with" || prevText === "assert") {
    let beforeString = prev - 1;
    while (beforeString >= 0 && units[beforeString].IsTriviaToken) {
      beforeString--;
    }
    if (beforeString >= 0 && units[beforeString] instanceof Common
      && ((units[beforeString] as Common).Is("from") || (units[beforeString] as Common).Is("import"))) {
      return false;
    }
  }
}
// **Stage 4af-E：换行后的 `@` 是下一条装饰器声明的起点**（`declare function gf(): void` ⏎
// `@dec class C {}`）。装饰器在词法上是 Symbol `@`（不是 Common），原来的「只认单词起点」
// 让这一格直接落空，声明壳因此不在 `@` 收口：整条装饰器声明被吞进上一条声明，`BuildFromShell`
// 只建出前一条，装饰器类整条消失（ast-json `end-build` 47 条）。判据与
// `StatementScanner.IsDecoratedDeclarationStart` 同口径（`@` + 前面有换行），「上一段已完整」
// 仍读 `CanEndDeclarationTail` 那一份，不新写第二套表达式 / 类型尾巴判据。
if (current instanceof Symbol && (current as Symbol).Is("@")) {
  return StatementBoundaryUtil.CanEndDeclarationTail(units, prev);
}
// 只认单词起点：`{` / `<` / `=` / `(` 等符号既可能是声明内部构件，也可能是续接，一律不算。
if (!(current instanceof Common)) {
  return false;
}
const text = (current as Common).TempToString();
// 声明体的收尾是闭合的 `{…}`（interface / enum / namespace / module / export {…}）：
// `CanEndExpression` 分不清 `{` 与裸块、统一按 false 处理，这里按「已闭合」计入。
const prevIsClosedBody = units[prev] instanceof Bracket
  && (units[prev] as Bracket).StartBracketChar === "{";
// 判据一（Stage 4ab）：下一格是能起一条新语句的声明 / 变量关键字。
if (StatementRouteUtil.IsLegacyKeyword(text)
  || text === "let" || text === "const" || text === "var") {
  if (prevIsClosedBody) {
    return true;
  }
  return StatementBoundaryUtil.CanEndDeclarationTail(units, prev);
}
// 判据二 / 三共用的「这个单词是声明的续接词」判据：
// - `from`：`export { a }` ⏎ `from "m"` / `import { a }` ⏎ `from "m"` 仍是同一条声明；
// - `extends` / `implements`：`interface I` ⏎ `extends J` 的声明头续接；
// - `in` / `instanceof` / `as` / `satisfies`：表达式续接词，与 `IsAsiBoundary` 读同一个 `IsContinuation`。
const isContinuationWord = text === "from" || text === "extends" || text === "implements"
  || ExpressionStatementPossibleShape.IsContinuation(current);
if (isContinuationWord) {
  return false;
}
// 判据二（Stage 4af-B）：声明体已闭合，下一格只要是普通单词就是下一条语句的起点。
// `interface I {}` ⏎ `foo();` 的 `foo` 既不是关键字、闭合 `{}` 也收不住表达式尾巴，判据一因此看不见它。
if (prevIsClosedBody) {
  return true;
}
// 判据三（Stage 4af-B）：声明头末尾是能收住表达式的类型引用（`declare function f<T>(): T` ⏎ `f<string>;`）。
// 要求换行前那一格确实能收住表达式，所以 `declare function f(` / `interface I<` 一类还没收尾的格子不会误切。
// Stage 4af-D：类型以 `void` / `>` 收尾时同一格由 `CanEndDeclarationTail` 认
// （`declare function f(): void`、`declare function g(): Promise<T>`）。
return StatementBoundaryUtil.CanEndDeclarationTail(units, prev);
```

## static method CanEndDeclarationTail:(units:Array<Token>, index:int)=>bool

**声明壳收口时的「换行前那一格已经完整」判据**（Stage 4af-D）：`IsDeclarationFollowBoundary` 的判据一 /
判据三原来直接读 `CanEndExpressionAt`——那是**表达式**口径，而声明头收尾的常常是**类型**。两处口径差在
两类尾巴上：

1. `void`：`CanEndExpression` 把它当成前缀运算符（`void x` 还在等操作数），但类型位置上
   `declare function f(): void` / `declare const x: void` / `type T = () => void` 已经写完。
   `void` 是唯一一个「能收尾类型、却落在表达式排除表里」的**词**：`typeof` / `keyof` / `asserts` /
   `infer` / `new` / `readonly` / `unique` 都还要右操作数，不能收尾类型；`any` / `unknown` / `never` /
   `string` / `number` / `boolean` / `object` / `symbol` / `bigint` / `undefined` / `intrinsic` / `null` /
   `this` / `true` / `false` 本来就能收住表达式（`CanEndExpression` 为真）。
2. `>` / `>>` / `>>>`：泛型实参表的收尾（`declare function request(): Promise<Dispatcher.ResponseData<T>>`、
   `type O = Omit<X, 'a'>`）。`CanEndExpression` 不认符号尾巴（关系比较的 `>` 右边还在等操作数）。
   **但变量声明的初始化表达式里 `>` 是关系运算符**（`export const x = a >` ⏎ `b` 是一条语句），
   那里不能断句——所以这一类只对**非变量声明**成立（按段首关键字排除 `const` / `let` / `var` / `using`，
   `export` / `declare` / `default` / `abstract` / `async` 前缀跳过）。

两类之外仍读 `CanEndExpressionAt` 那一份——不是第二份 ASI，也不是第二份类型扫描。

```ts
if (index < 0 || index >= units.length) {
  return false;
}
const unit = units[index];
if (unit instanceof Common) {
  if ((unit as Common).Is("void")) {
    return true;
  }
  const word = (unit as Common).TempToString();
  // **Stage 5d-8c：类型位上的类型运算符不能收尾**。`CanEndExpression` 只排除 `typeof` / `keyof` /
  // `new`（它们在值位也是前缀运算符），但 `unique` / `readonly` / `infer` / `asserts` 在值位是普通
  // 标识符、在类型位才等右操作数：`declare const t: unique` ⏎ `symbol;` 的 `unique` 若按表达式口径
  // 收尾，别名 / 变量声明的类型就被切成两半（`unique symbol` 是两个字连排的类型运算符）。
  // 类型位判据读 `StatementScanner.IsTypePositionBefore`（唯一实现点），不新写第二套。
  if ((word === "unique" || word === "readonly" || word === "infer" || word === "asserts")
    && StatementScanner.IsTypePositionBefore(units, index)) {
    return false;
  }
  // **Stage 5d-8c：`asserts x` 后面还等着 `is`**。断言签名 `asserts x is T` 的 `is` 可以写在下一行
  // （TS 实测是一条声明），所以 `asserts` 后面的名字不能当「类型尾巴已完整」。
  let beforeName = index - 1;
  while (beforeName >= 0 && units[beforeName].IsTriviaToken) {
    beforeName--;
  }
  if (beforeName >= 0 && units[beforeName] instanceof Common
    && (units[beforeName] as Common).Is("asserts")) {
    return false;
  }
  return ExpressionStatementPossibleShape.CanEndExpressionAt(units, index);
}
if (!(unit instanceof Symbol) || ((unit as Symbol).TempToString() !== ">"
  && (unit as Symbol).TempToString() !== ">>" && (unit as Symbol).TempToString() !== ">>>")) {
  // 其余（括号 / 字符串 / 正则 / 数字 …）一律照旧问表达式口径。
  return ExpressionStatementPossibleShape.CanEndExpressionAt(units, index);
}
// 段首（本条语句的第一个代码单元）：往回跳过 basic token，停在形状 / 段首。
let head = index;
while (head > 0 && units[head - 1].IsBasicToken) {
  head--;
}
let at = head;
while (at < index) {
  if (units[at].IsTriviaToken) {
    at++;
    continue;
  }
  if (!(units[at] instanceof Common)) {
    break;
  }
  const text = (units[at] as Common).TempToString();
  if (text === "export" || text === "declare" || text === "default"
    || text === "abstract" || text === "async") {
    at++;
    continue;
  }
  // 变量声明：`export const x = a >` ⏎ `b` 的 `>` 是关系运算符，不是类型实参表的收尾。
  // **例外（gap-AS1）**：类型注解位上的 `>` 就是类型实参表的收尾（`declare const a: Foo<Bar>` ⏎
  // `let b = 1`）——交给 `StatementScanner.IsTypeArgumentClose`（配对 + 类型位，唯一判据）回答，
  // 不在这里新写第二套角括号扫描。`= a >` 的 `>` 不在类型位，仍判 false。
  if (text === "const" || text === "let" || text === "var" || text === "using") {
    return StatementScanner.IsTypeArgumentClose(units, index);
  }
  return true;
}
return true;
```

## static method StatementEndCode:(units:Array<Token>, codeAt:Array<int>, atEof:bool, declarationShell?:bool)=>int

**语句收口位置的唯一实现点**（Stage 4af-F）：返回**宿主 `Data` 的下标**（与 `StatementScanner` 的
`End` / `CodeAt` 折算同一基准），`-1` = 还不能收口。判据只有这一份（`;` / EOF / ASI / 声明跟随边界），
不在别处写第二套 ASI。

> 本方法体自 `statement-end-possible-shape.xl.md` 的 `StatementEndPossibleShape.ExpressionEndCode`
> **逐字搬迁**（Stage 4af-F），一字未改：那里的 `ExpressionEndCode` 只剩一行委托。
> 搬家的原因是它有**第二个调用方**——`StatementShape.TryToClose`（见下），而 `statement-shape` 不能
> 反向 import `statement-end-possible-shape`（后者已经 import 前者，会成环）。
> 两个调用方读的是同一份实现，所以「终结候选怎么收口」与「EOF 兜底怎么收口」不可能分叉。

**第二个调用方（Stage 4af-F）**：文件以「下一条语句只有一个 token」结尾时（`type T = A` ⏎ `a`），
最后一个 token 的 `ComputePossibleShapes` 永远没有机会被问（壳只在**新单元流入**时求值，末 token 的
求值要等它自己之后那一个字符，而那个字符是 EOF）——于是 `StatementShape.TryToClose` 是唯一的机会。
它原来对非表达式族一律读 `ScanRoot` 的 `End`，而 `ScanRoot` 对「壳里塞了两条语句」只回 `Mismatch`
（`Status == 2`、`End == -1`），`endIndex` 落回最后一个代码单元 → `BuildFromShell` 读到两条 →
抛错 → `DetachShell` → 首条退 raw（`Common`）。改走本方法后：末 token 一行判出声明跟随边界，
`endIndex` 收在 `A`，剩下的 `a` 由 `FinishShell` 搬回根、再经尾巴重放建第二条。

**基准必须是 `host.Data`（含 trivia），不能只传 code-only 数组**：`IsAsiBoundary` 与 legacy 调用点
（`SourceFileEndPossibleShape` / `ExpressionStatementPossibleShape` / `StatementBuilder`）读的是同一个
`units`，它的 `prev` 回走、`CanEndExpressionAt` 的「前一格是 `.` / `?.`」、`head` 的 basic-token 回走
全部按**含 trivia 的下标**解释。传 code-only 数组等于混用两套下标：该断处判 `false`（语句拖到 EOF →
`BuildFromShell` 抛「表达式语句没有读完」），不该断处判 `true`（语句切早 → `missing-end` / 结构差）。
`codeAt` 是「代码下标 → `host.Data` 下标」的映射，判界结果一律经它折算回宿主下标。

1. 末代码单元是 `;` → 收在它身上（`;` 归本条语句，`StatementBuilder` 建完语句后不把它放进 `Data`）；
2. 末代码单元是 ASI 边界（`IsAsiBoundary(units, lastAt)`，与 legacy 同基、同下标）→ 收在**前一个代码单元**：
   边界单元是下一条语句的开头（`a` ⏎ `b` 的 `b`），必须留在壳里交给 `FinishShell` 搬回父单元；
3. 已经在文件末尾（`atEof`）→ 收在末代码单元；
4. 其余 → `-1`（继续等）。

`atEof` 排在 ASI 之后：文件末尾的 `a` ⏎ `b` 仍然是两条语句。
`declarationShell === true` 时多三条**只属于声明壳**的判据，全部排在 `atEof` **之前**——否则那些格子会被
`atEof` 吞掉：

- **声明体括号已闭合**（`IsClosedDeclarationBody`，排在 `;` 之前）：`interface I {}` 后面同行的任何 token
  都是下一条语句（`;` 是独立的 EmptyStatement）；
- **声明跟随边界**（`IsDeclarationFollowBoundary`）：换行 + 能起新语句的单词，声明到这里收口；
- **类型别名的后缀 / 类型实参不吃跨行**（`IsTypeAliasLineBreakCut`）：`type T = A` ⏎ `["k"];` 是两条语句，
  而这三格恰好都是 `IsContinuation` 认的续接符，上面两条看不见它们。

```ts
if (codeAt.length === 0) {
  return -1;
}
const lastAt = codeAt[codeAt.length - 1];
if (StatementBoundaryUtil.IsEof(lastAt, units)) {
  return codeAt.length === 1 ? -1 : codeAt[codeAt.length - 2];
}
// **Stage 5d-8c：声明体括号已闭合 ⇒ 这条声明到体括号为止**（排在 `;` 之前）。
// `interface I {}` ⏎ `function f() {}`、`enum E { A } type T = A;`、`namespace N {} class C {}`、
// `export interface I {} export enum E { A }`、`export default abstract class C {};`、
// `interface I1 { }` ⏎ `/re/g;` —— TS 在这些形态里都把闭合的声明体当作声明的**终点**：后面同行的
// `;` 是独立的 EmptyStatement，后面任何 token 都是下一条语句的开头。原来的判据（`;` / ASI /
// 声明跟随边界）三条都要求**换行**或 `;`，所以 `interface I {} interface J {}` 这种同行连排
// 会被整个吞进一条壳，`BuildFromShell` 建出两条 → 抛「语句没有读完」→ 文件级 fallback。
// 判据不新写：闭合体括号由 `TypeBuilder.IsBodyBrace` 认（`DeclarationShellEndCode` 同一份），
// 「这条语句是带体声明」由段首关键字表认（`IsBodyBearingDeclarationCode`）。
if (declarationShell === true && StatementBoundaryUtil.IsClosedDeclarationBody(units, codeAt)) {
  if (codeAt.length === 1) {
    return -1;
  }
  return codeAt[codeAt.length - 2];
}
if (StatementBoundaryUtil.IsSemicolon(units[lastAt])) {
  return lastAt;
}
if (StatementBoundaryUtil.IsAsiBoundary(units, lastAt)
  // Stage 5d-10b：实例化收尾的 `>` 那一格由补充判据答（`IsAsiBoundary` 函数体保持基线原文）。
  || StatementBoundaryUtil.IsInstantiationTailAsiBoundary(units, lastAt)) {
  if (codeAt.length === 1) {
    return -1;
  }
  return codeAt[codeAt.length - 2];
}
// Stage 4ab：声明壳的收口。`IsAsiBoundary` 的条件 5 对声明开头的条目一律返回 false，
// 所以 `interface I { }` ⏎ `const a`、`type T = A` ⏎ `return`、`enum E { A }` ⏎ `export { … }`
// 这些「上一条声明已完整、下一条语句已到」的换行永远判不出边界 —— 壳会把下一条语句一起吞进去，
// `BuildFromShell` 读到两条语句抛错 → `DetachShell` 退成 raw（decl=2/3、CJ 首节点 Common 的根因）。
// 这里补一条只属于声明壳的判据：当前单元是**能起一条新语句的单词**、且换行之前那段已经完整。
if (declarationShell === true && StatementBoundaryUtil.IsDeclarationFollowBoundary(units, lastAt)) {
  if (codeAt.length === 1) {
    return -1;
  }
  return codeAt[codeAt.length - 2];
}
// **Stage 5d-8c：类型别名的后缀 / 类型实参不吃跨行**（TS 的 `parsePostfixTypeOrHigher` 只在同一行
// 吃 `[`，`parseTypeArgumentsOfTypeReference` 要求 `<` 与类型名同一行）：`type T = A` ⏎ `["k"];` /
// `type T = A` ⏎ `<B>c;` / `type T = A` ⏎ `(b);` 全部是「别名 + 一条表达式语句」。这三格的当前单元
// 恰好都是 `IsContinuation` 认的续接符，`IsAsiBoundary` 因此不收口，`IsDeclarationFollowBoundary`
// 又只认单词起点——两条判据都看不见它们，壳一路吃到 `;` / EOF。判据只看「段首是类型别名」+
// 「换行前是能收尾的类型尾巴」+「当前是 `[` / `(` / `<`」三件事，不新写类型扫描。
if (declarationShell === true && StatementBoundaryUtil.IsTypeAliasLineBreakCut(units, codeAt)) {
  if (codeAt.length === 1) {
    return -1;
  }
  return codeAt[codeAt.length - 2];
}
if (atEof) {
  return lastAt;
}
return -1;
```

## static method IsBodyDeclarationHead:(units:Array<Token>, codeAt:Array<int>)=>bool

**声明族 / 声明壳的「这一条声明带体」判据**（Stage 5d-8a）：壳的**首代码单元序列**跳过声明修饰词之后，
第一个真关键字是不是一个**带体声明**的词。

- 修饰词（跳过）：`export` / `declare` / `default` / `abstract` / `async` / `const`
  （`const` 只为 `const enum` 与 `declare const enum` 而跳；`const x = {…}` 的下一个代码单元是名字，
  不是真关键字，见下）；
- 带体声明（返回 `true`）：`class` / `function` / `interface` / `enum` / `namespace` / `module` / `global`；
- 其余（返回 `false`）：`import` / `type` / `using` / `as` / 名字 / 符号 / 括号。

**为什么需要它**：`TypeBuilder.IsBodyBrace` 只回答「这个 `{` 是不是类型的一部分」，它把
`export { a }` 的**导出列表**、`import { a }` 的**导入列表**、`export type { A } from "m"` 的列表、
`export default { … }` 的**赋值表达式**都看成体括号（它们前面是 `export` / `type` / `default` 这类
「能收住一个类型」的词）。声明族一旦也用体括号收口（`DeclarationFamilyBodyEndCode`），必须再回答
「**这条声明本身有没有体**」——`export type { A } from "m"` 在列表 `}` 处收口会把 `from "m"` 丢掉。

**首单元不是 `Common` 时返回 `true`（未知 → 保持既有行为）**：装饰器声明 `@dec class C {}` 的首单元是
`@`（`Symbol`），`@` 后面是什么声明要到收口时由 `ScanDecoratedHead` 回答——本判据不抢那个判型，
只让 5d-3 已有的「装饰器声明认体括号」逐位不变。

```ts
if (codeAt.length === 0) {
  return false;
}
const first = units[codeAt[0]];
if (!(first instanceof Common)) {
  // `@dec class C {}`：首单元是 `@`，判型不在这里（见说明）。
  return true;
}
let at = 0;
while (at < codeAt.length) {
  const unit = units[codeAt[at]];
  if (!(unit instanceof Common)) {
    return false;
  }
  const text = (unit as Common).TempToString();
  if (text === "export" || text === "declare" || text === "default"
    || text === "abstract" || text === "async" || text === "const") {
    at += 1;
    continue;
  }
  return text === "class" || text === "function" || text === "interface"
    || text === "enum" || text === "namespace" || text === "module" || text === "global";
}
return false;
```

## static method IsBodyBearingDeclarationCode:(code:Array<Token>)=>bool

**Stage 5d-8c：这段代码是不是一条「带体声明」**（`class` / `function` / `interface` / `enum` / `namespace` /
`module` / `global`，允许 `export` / `declare` / `default` / `abstract` / `async` / `const` 这些前缀修饰词）。

用途只有一个：`StatementEndCode` 判断「上一条代码单元是闭合的声明体括号」时先确认这条语句**本来就有体**——
否则 `export default { … }` / `export { a }` / `declare const x = { … }` 里的对象字面量与导出列表也会被
当成体括号，在 `}` 处把语句切早。修饰词表只收**声明前缀位**上的词（它们后面必须紧跟声明关键字），
所以 `export =` / `export {` 这类后面的符号单元会让判据直接返回 `false`；装饰器族（`@` 起头）走自己的壳
（`ShellDecoratedDeclaration`），不经过这里。

```ts
let at = 0;
while (at < code.length) {
  const unit = code[at];
  if (!(unit instanceof Common)) {
    return false;
  }
  const text = (unit as Common).TempToString();
  if (text === "export" || text === "declare" || text === "default" || text === "abstract"
    || text === "async" || text === "const") {
    at++;
    continue;
  }
  return text === "class" || text === "function" || text === "interface" || text === "enum"
    || text === "namespace" || text === "module" || text === "global";
}
return false;
```

## static method DeclarationFamilyBodyEndCode:(units:Array<Token>, codeAt:Array<int>)=>int

**声明族（`ShellDeclarationFamily`）的「声明体括号已闭合」补充判据**（Stage 5d-8a）：末代码单元是一个
已闭合的 `{…}`、`TypeBuilder.IsBodyBrace` 认它是声明体、且 `IsBodyDeclarationHead` 认这一条声明带体
→ 返回它的下标；否则 `-1`。

**这是「只增」的一条判据，排在既有判据之后**：声明族原先与表达式族共用
`StatementEndPossibleShape.ExpressionEndCode`（**调用位 ASI** + `;` / EOF / ASI / 声明跟随边界），它
**不认体括号**——`{ export class A {} export const b = 1; }` 的第一条声明因此永远收不了口，把第二条
一起吞进去，`BuildFromShell` 读到两条语句抛「语句没有读完」→ `DetachShell` → 块体整段 raw（5d-6 §5 的
`export` 族 10 条）。调用方**先问 `ExpressionEndCode`，只有它给 `-1` 时才问本方法**，所以既有收口点
一个字节都不变，本方法只在「原本收不了口」的格上生效。

**为什么不并入 `DeclarationShellEndCode`**：那一份是 5d-3 的 `function` / `class` / 装饰器声明壳的判据，
它的第 1 条（体括号）排在 `;` 之前、且**不做调用位 ASI**——把声明族并进去会丢掉
`export default () => {}` ⏎ `(b);` 的调用位收口（AST 会把 `(b)` 并进 ExportAssignment，实测 1 条结构差）。
两条判据各自保持原本的调用方，语义边界才清楚。

```ts
if (codeAt.length === 0) {
  return -1;
}
const lastAt = codeAt[codeAt.length - 1];
if (units[lastAt] instanceof Bracket && (units[lastAt] as Bracket).StartBracketChar === "{"
  && TypeBuilder.IsBodyBrace(units, lastAt)
  && StatementBoundaryUtil.IsBodyDeclarationHead(units, codeAt)) {
  return lastAt;
}
return -1;
```

## static method IsClosedDeclarationBody:(units:Array<Token>, codeAt:Array<int>)=>bool

**Stage 5d-8c：上一条代码单元就是这条声明的闭合体括号**。`codeAt` 的末格是**当前到达**的单元，
倒数第二格才是声明自己的最后一段。三件事同时成立才算：

1. 它是 `{` 括号单元且**已闭合**（`SourceRange.EndIndex >= 0`）；
2. `TypeBuilder.IsBodyBrace` 认它是**声明体**（不是返回类型 / `extends` / 类型参数里的类型字面量）；
3. 段首是带体声明（`IsBodyBearingDeclarationCode`）。

第二条不新写：`DeclarationShellEndCode` 的体括号判据读的是同一个实现。

```ts
if (codeAt.length < 2) {
  return false;
}
const braceAt = codeAt[codeAt.length - 2];
const brace = units[braceAt];
if (!(brace instanceof Bracket) || (brace as Bracket).StartBracketChar !== "{") {
  return false;
}
if (brace.SourceRange.EndIndex < 0) {
  return false;
}
if (!TypeBuilder.IsBodyBrace(units, braceAt)) {
  return false;
}
const code:Array<Token> = [];
for (let at = 0; at < codeAt.length - 1; at++) {
  code.push(units[codeAt[at]]);
}
return StatementBoundaryUtil.IsBodyBearingDeclarationCode(code);
```

## static method IsTypeAliasLineBreakCut:(units:Array<Token>, codeAt:Array<int>)=>bool

**Stage 5d-8c：类型别名的后缀 / 类型实参不吃跨行**。TS 的 `parsePostfixTypeOrHigher` 只在同一行吃 `[`，
`parseTypeArgumentsOfTypeReference` 要求 `<` 与类型名同一行，所以下面三条全是「别名 + 一条表达式语句」：

| 形态 | TS 的两条语句 |
| --- | --- |
| `type T = A` ⏎ `["k"];` | TypeAliasDeclaration + ExpressionStatement |
| `type T = A` ⏎ `<B>c;` | TypeAliasDeclaration + ExpressionStatement |
| `type T = A` ⏎ `(b);` | TypeAliasDeclaration + ExpressionStatement |

这三格的当前单元恰好都是 `IsContinuation` 认的续接符（`[` / `(` / `<`），`IsAsiBoundary` 因此不收口；
`IsDeclarationFollowBoundary` 又只认单词起点（`@` 是唯一例外）。两条判据都看不见它们，声明壳会一路吃到
`;` 或 EOF，`BuildFromShell` 建出一条别名 + 剩下的单元 → 抛「语句没有读完」→ 文件级 fallback。

**为什么只对类型别名成立**：变量声明里同样的排版是**一条**语句（`let x = A` ⏎ `[0];` 的 `[` 是元素访问，
值位没有「同一行」限制）。段首判据读 `TypeAliasDeclarationShape.IsTypeAliasHead`（唯一实现点，含
`export type` / `declare type` / `export declare type` 三种前缀），「换行前那段能收尾」读
`CanEndDeclarationTail`，「有换行」读 `HasLineBreakBefore`——三条都是既有实现。

```ts
if (codeAt.length < 3) {
  return false;
}
const lastAt = codeAt[codeAt.length - 1];
const current = units[lastAt];
let currentText = "";
if (current instanceof Symbol) {
  currentText = (current as Symbol).TempToString();
} else if (current instanceof Bracket) {
  currentText = (current as Bracket).StartBracketChar;
}
if (currentText !== "[" && currentText !== "(" && currentText !== "<") {
  return false;
}
if (!ExpressionStatementPossibleShape.HasLineBreakBefore(units, lastAt)) {
  return false;
}
if (!StatementBoundaryUtil.CanEndDeclarationTail(units, codeAt[codeAt.length - 2])) {
  return false;
}
const code:Array<Token> = [];
for (let at = 0; at < codeAt.length - 1; at++) {
  code.push(units[codeAt[at]]);
}
const head = code[0];
if (!(head instanceof Common)) {
  return false;
}
const headText = (head as Common).TempToString();
if (headText !== "type" && headText !== "export" && headText !== "declare") {
  return false;
}
if (!TypeAliasDeclarationShape.IsTypeAliasHead(code, headText)) {
  return false;
}
// **泛型函数类型的形参表可以写在下一行**：`type U = <U>` ⏎ `(a: U) => U;` 是**一条**声明
// （TS 的 `parseTypeParameters` 之后 `(` 是同一行的函数类型，不受硬换行限制，`type-alias-generic-fn-trivia`
// 那族正是靠它）。判据只看「RHS 是不是以 `<` 起头」：以 `<` 起头的右值只能是泛型函数类型，它的 `(` 是续接；
// 其余形态（`type T = A` ⏎ `(b);`）仍要切。
if (currentText === "(") {
  let typeIndex = 0;
  if (headText === "export" || headText === "declare") {
    typeIndex = 1;
    if (code.length >= 2 && code[1] instanceof Common && (code[1] as Common).Is("declare")) {
      typeIndex = 2;
    }
  }
  const rhsAt = typeIndex + 3;
  if (rhsAt < code.length && code[rhsAt] instanceof Symbol && (code[rhsAt] as Symbol).Is("<")) {
    return false;
  }
}
return true;
```

## static method DeclarationShellEndCode:(units:Array<Token>, codeAt:Array<int>, atEof:bool, decorated?:bool)=>int

**带体声明语句壳的收口位置**（Stage 5d-3 的根层 `function` / `class` / 装饰器声明）：返回宿主 `Data`
的下标，`-1` = 还不能收口。判据只有这一份——终结候选（`StatementEndPossibleShape` 的
`ComputeByIndex` / `BuildByIndex`）与 EOF 兜底（`StatementShape.TryToClose`）读同一个实现，
所以「怎么收口」与「兜底收到哪」不可能分叉。

四条顺序：

1. **体括号已闭合**：末代码单元是 `{…}` 括号单元，且 `TypeBuilder.IsBodyBrace` 认它是**声明体**
   （不是返回类型 / `extends` / 类型参数里的类型字面量）→ 收在它身上。这是 `function` / `class`
   唯一的主路径：体里的语句都在括号单元内部，壳在这一格就把整条声明交出去。
2. **`;`**：ambient / 重载签名（`function f(a: A): B;`）收在 `;` 上——与 `StatementEndCode` 的第 1 条同义，
   这里提前挡住，避免 `;` 之后的声明跟随判据把它算到前一个代码单元上。
3. **装饰器族（`decorated === true`）到此为止**：`@dec` ⏎ `class C {}` 的换行是**装饰器与声明之间**的
   合法换行，不是 ASI 边界——`IsAsiBoundary` 只看「语句首」是 `@`（不是 Common 声明头词），
   会把 `@dec` 当场判成一条语句。所以本族只认体括号 / `;`，其余交给 EOF 兜底。
4. 其余 → `StatementEndCode(units, codeAt, atEof, true)`（声明跟随边界 / EOF，与声明族同一份）。

**为什么不给 `function` / `class` 走 ASI 主判据**：`IsAsiBoundary` 的条件 5 对以声明关键字开头的条目
一律返回 `false`（`class C` ⏎ `{}` 的 `{` 是声明头的一部分），所以这两族本来就不会被 ASI 提前切断；
真正会提前切断的是 `IsDeclarationFollowBoundary`（下一条语句的词已到），第 4 条读的就是它。

```ts
if (codeAt.length === 0) {
  return -1;
}
const lastAt = codeAt[codeAt.length - 1];
if (units[lastAt] instanceof Bracket && (units[lastAt] as Bracket).StartBracketChar === "{"
  && TypeBuilder.IsBodyBrace(units, lastAt)) {
  return lastAt;
}
if (StatementBoundaryUtil.IsSemicolon(units[lastAt])) {
  return lastAt;
}
if (decorated === true) {
  return atEof ? lastAt : -1;
}
return StatementBoundaryUtil.StatementEndCode(units, codeAt, atEof, true);
```

## static method AwaitUsingEndCode:(code:Array<Token>, atEof:bool)=>int

**Stage 5d-5：`await` 起点语句的唯一可收口形态——`await using` 声明**。返回**代码下标**（`code` 基准），
`-1` = 这一格不收口（也**不会**再收口）。

`await` 在 `ScanRoot` 里只有一条会 `Complete` 的路：`await` 后紧跟 `using`、且 `using` 后面同一行能起绑定
（`StatementScanner.StartsUsingDeclaration`），此时按声明列表 `ScanToSemicolon(code, 3)` 读到本层 `;`。
其余所有 `await` 形态（`await f()` / `await` 单关键字 / `await using` 到头 / `await = 1` / `await: 1`）
在 `ScanRoot` 里都是 `Mismatch` 或 `NeedMore`——**都不是「本条语句到此为止」的证据**。

**迁移来源**：`StatementScanner.ScanRoot` 的 `await` 分支（逐字搬迁），只有两处语义化：

1. 全局 `StatementScanner.AtEOF` 改为显式 `atEof` 入参（调用方在分派前刚算过同一个值）；
2. `ScanToSemicolon(code, 3)` 改为 `ScanToSemicolonIncremental(code, 3, false, atEof)`（同一份实现，
   下标语义见那里的说明）。

**为什么需要它**：`await` 语句壳（`AwaitStatementPossibleShape`）的终结候选原来一律读 `ScanRoot`——
每格 +1（全语料 211 次），而其中真正会 `Accept` 的只有 `await using x = …;` 这 11 次。搬到这里之后
`await` 壳的判界不再进 legacy 扫描器，`await using` 的接管行为一字不改（`End` 与迁移前逐条相同，
`HANDOFF-5d5.md` §4 有对拍读数）。

```ts
if (code.length === 0) {
  return -1;
}
const head = code[0];
if (!(head instanceof Common)) {
  return -1;
}
if ((head as Common).TempToString() !== "await") {
  return -1;
}
if (code.length === 1) {
  // 单 `await`：还在等（`NeedMore`）或到头（`Mismatch`），两种都不收口。
  return -1;
}
if (!StatementScanner.IsKeyword(code[1], "using")) {
  return -1;
}
if (code.length === 2) {
  return -1;
}
if (!StatementScanner.StartsUsingDeclaration(code, 1, 2)) {
  return -1;
}
return StatementBoundaryUtil.ScanToSemicolonIncremental(code, 3, false, atEof);
```

## static method IsShortFamilyCode:(code:Array<Token>)=>bool

**Stage 5d-2a：短语句族的「是不是本族」判据**（族判定，不判收口位置）。只认六个起点：

| 起点 | 族 | 收口规则 | 判据实现 |
| --- | --- | --- | --- |
| `return` / `throw` | 受限产生式 | 关键字后换行 = 没有操作数，语句停在关键字上；否则到本层 `;` / ASI | `ReturnThrowEndCode` |
| `break` / `continue` | 受限产生式 + 可选标签 | 关键字 / 标签 / `;` 三选一的同一份换行判据 | `BreakContinueEndCode` |
| `debugger` | 简单语句 | `;` / EOF / 换行 ASI | `SimpleSemicolonEndCode` |
| `let` / `const` / `var` | 变量声明语句 | 到本层 `;`，换行处按 ASI 收口；文件末尾**不收口**（交 EOF 兜底） | `VariableStatementEndCode` |

`code` 是**只含代码单元（无 trivia）的已扫前缀**，与 `StatementScanner.ScanRoot` 的入参同一基准——
终结候选的 `StatementScan.Code` 本来就是这么攒的（只追加），所以这里是纯读、无状态、无分配。

**族判定必须与 `ScanRoot` 的分派条件逐条一致**（否则「本族」与「扫描器认的族」会错位，收口位置就会分叉）：

- `return` / `throw` / `break` / `continue` / `debugger`：`ScanRoot` 无条件交给各自的扫描器，这里无条件认；
- `const` / `var`：`ScanRoot` 只在 `const enum …` 上交回 enum 声明候选（
  `StatementScanner.NextWord` 同一判据），所以这一格**不算本族**，仍走 `ScanRoot`；
- `let`：双角色上下文关键字，只有**下一格能起绑定**（`StatementScanner.StartsBinding`，与 `ScanRoot` /
  `StatementRouteUtil.DecideCommon` 同一个判据）才是声明语句；单 `let` + 文档前瞻是 `:` 时是**标签语句**
  （`ScanRoot` 交回 `ScanBody`），也不算本族。

**空语句（`;`）不在本方法里**：它由 `StatementEndPossibleShape.EmptyStatementEndCode` 判（gap-SW §1），
在族分派**之前**对所有族生效，本轮不新增第二份。空语句壳本来就不在 `ScanRoot` 分支上。

```ts
if (code.length === 0) {
  return false;
}
const head = code[0];
if (!(head instanceof Common)) {
  return false;
}
const text = (head as Common).TempToString();
if (text === "return" || text === "throw" || text === "break" || text === "continue"
  || text === "debugger") {
  return true;
}
if (text === "const" || text === "var") {
  // `const enum E {…}`（含 `const` ⏎ `enum`）：归 enum 声明候选，`ScanRoot` 在这里也是 `Mismatch`。
  if (text === "const"
    && StatementScanner.NextWord(head.SourceRange.Document, head.SourceRange.EndIndex) === "enum") {
    return false;
  }
  return true;
}
if (text === "let") {
  if (code.length >= 2) {
    // `let` 后面能起绑定才是变量声明；否则它只是标识符（`let = 1` / `let: 1` / `let (a)`）。
    return StatementScanner.StartsBinding(code, 1);
  }
  // 只有一个 `let`：后面（跳过空白与注释）是 `:` 就是标签语句；其余（还在等绑定 / 已到文件末尾）
  // 都归本族，收口位置由 `VariableStatementEndCode` 答 `-1`（与 `ScanRoot` 的 `NeedMore` / `Mismatch`
  // 对终结判定是同一结果：都不到齐）。
  return StatementScanner.NextChar(head.SourceRange.Document, head.SourceRange.EndIndex) !== ":";
}
return false;
```

## static method ShortFamilyEndCode:(code:Array<Token>, atEof:bool)=>int

**Stage 5d-2a：短语句族的收口位置**（唯一入口）。返回**代码下标**（`code` 基准），`-1` = 还不能收口。

只对 `IsShortFamilyCode(code) === true` 的条目有意义（调用方先问族、再问位置）。每个族的判据都是
`StatementScanner` 里那份扫描规则的**逐字搬迁**（`ScanReturnOrThrow` / `ScanBreakOrContinue` /
`ScanSimpleSemicolon` / `ScanToSemicolon`），搬到这里是为了：

1. 终界候选不再调 `StatementScanner.ScanRoot`（`ScanRoot` 只认 `{` / `;` / 固定关键字起点，是**根候选**的
   分派器；短语句族的收口规则本来就不需要经过它）；
2. 判据读的是 `StatementEndScan.Code` 这份**只追加**的增量前缀，入口是纯函数（`atEof` 显式传入，
   不读全局 `StatementScanner.AtEOF`）。

**与 `ScanRoot` 的一致性**：两条路径读的底层判据完全同一批——`IsSemicolon` / `IsEof` /
`EndsAtLineBreak`（`StatementBoundaryUtil.EndsAtLineBreak` 就是 `StatementScanner.EndsAtLineBreak` 的
唯一实现点）/ `NoLineBreakBetween` / `IsUncontinuableTailBoundary`。`ScanRoot` 本身**一字不改**：
legacy 根候选（`StatementPossibleShape`）与块内原子建树仍读它，本轮只把「壳的终结候选」这一条调用点
换到本方法（`HANDOFF-5d2a.md` §2 有逐族前后计数）。

`atEof` 的语义与 `StatementEndCode` 的 `atEof` 完全相同：调用方已算出「当前单元之后文档里没有内容」。
变量声明族在文件末尾**故意不收口**（`stopAtEof = true`）：`var a` 的收口交给
`StatementShape.BuildTrailingDeclaration` / `TryToClose` 那条既有兜底，收口位置与基线逐位相同。

```ts
if (code.length === 0) {
  return -1;
}
const head = code[0];
if (!(head instanceof Common)) {
  return -1;
}
const text = (head as Common).TempToString();
if (text === "return" || text === "throw") {
  return StatementBoundaryUtil.ReturnThrowEndCode(code, atEof);
}
if (text === "break" || text === "continue") {
  return StatementBoundaryUtil.BreakContinueEndCode(code, atEof);
}
if (text === "debugger") {
  return StatementBoundaryUtil.SimpleSemicolonEndCode(code, atEof);
}
if (text === "let" || text === "const" || text === "var") {
  return StatementBoundaryUtil.VariableStatementEndCode(code, atEof);
}
return -1;
```

## static method ReturnThrowEndCode:(code:Array<Token>, atEof:bool)=>int

**`return` / `throw` 的受限产生式**（`return [no LineTerminator here] Expression? ;`）：
关键字之后**换行** → 没有操作数，语句停在关键字上（`return` ⏎ `x` 是两条语句：`return;` 与 `x;`）。

换行后的 `;` 仍归本条语句：TS 给 `throw` ⏎ `;` 的 AST 是 `ThrowStatement[0,7)` + 零宽 `Identifier`
（`;` 计入 `End`，不再另起 `EmptyStatement`）——收在这一格上，否则它会被留给下一条空语句，
根层 statement 候选就会拖到 EOF 哨兵上与根终结候选同时 `Accept`。

**迁移来源**：`StatementScanner.ScanReturnOrThrow(code, 0)`（逐字搬迁；那边的 `keywordAt` 恒为 0）。

```ts
if (code.length >= 2 && !StatementScanner.NoLineBreakBetween(code[0], code[1])) {
  if (StatementBoundaryUtil.IsSemicolon(code[1])) {
    return 1;
  }
  return 0;
}
return StatementBoundaryUtil.ScanToSemicolonIncremental(code, 1, false, atEof);
```

## static method BreakContinueEndCode:(code:Array<Token>, atEof:bool)=>int

**`break` / `continue`**：`;` / EOF 之外，**关键字之后换行**也收口（`break` ⏎ `lbl` 是两条语句：
`break;` 与 `lbl;`），此时换行后的单元属于下一条语句，收口位置是关键字自己。

`break lbl` / `break lbl;` 走下面两条：标签之后有 `;` 收在 `;`，标签之后换行或到头收在标签上。
关键字之后还没到时**不能**收口（还要看有没有标签）——除非已到文件末尾（`for (;;) break`）。

**迁移来源**：`StatementScanner.ScanBreakOrContinue(code, 1)`（逐字搬迁；`from` 恒为 1）。

```ts
const from = 1;
if (from >= code.length) {
  // 本层已经读完：AtEOF 时按 ASI 收在最后一个代码单元（`for (;;) break` / `label: break label`），
  // 否则还要等下一格才能判断后面有没有标签 / `;`。
  if (atEof && code.length > 0) {
    return code.length - 1;
  }
  return -1;
}
if (StatementBoundaryUtil.IsSemicolon(code[from])) {
  return from;
}
if (StatementBoundaryUtil.IsEof(from, code)) {
  return from - 1;
}
// 受限产生式：`break` / `continue` 之后换行 = 没有标签，语句在关键字处收口（`break` ⏎ `foo()`）。
if (from > 0 && StatementBoundaryUtil.EndsAtLineBreak(code, from - 1, from)) {
  return from - 1;
}
if (from + 1 >= code.length) {
  if (atEof && code.length > 0) {
    return code.length - 1;
  }
  return -1;
}
if (StatementBoundaryUtil.IsSemicolon(code[from + 1])) {
  return from + 1;
}
if (StatementBoundaryUtil.IsEof(from + 1, code)) {
  return from;
}
// 标签之后换行 / 到头：`break label` 后面没有 `;` 也收口（`break label` ⏎ 下一条语句）。
if (StatementBoundaryUtil.EndsAtLineBreak(code, from, from + 1)) {
  return from;
}
return -1;
```

## static method SimpleSemicolonEndCode:(code:Array<Token>, atEof:bool)=>int

**`debugger` 这类简单语句**：`;` / EOF 之外，**换行处也按 ASI 收口**——`debugger` ⏎ `c;` 是两条语句
（TS 在 `debugger` 后插 ASI）。没有这一条，`debugger` 候选在 `c` 那一格 `Mismatch`，整段 leftover
一直拖到 EOF 哨兵，再被 `BuildTrailingDeclaration` 按一条语句建出来，后面的语句整条丢掉。

**迁移来源**：`StatementScanner.ScanSimpleSemicolon(code, 1)`（逐字搬迁；`from` 恒为 1）。

```ts
const from = 1;
if (from >= code.length) {
  if (atEof && code.length > 0) {
    return code.length - 1;
  }
  return -1;
}
if (StatementBoundaryUtil.IsSemicolon(code[from])) {
  return from;
}
if (StatementBoundaryUtil.IsEof(from, code)) {
  return from - 1;
}
if (from > 0 && StatementBoundaryUtil.EndsAtLineBreak(code, from - 1, from)) {
  return from - 1;
}
return -1;
```

## static method VariableStatementEndCode:(code:Array<Token>, atEof:bool)=>int

**变量声明语句（`let` / `const` / `var`）**的收口：到本层 `;` 为止；`;` 之前遇到**换行 ASI** 就在换行前
那一格收口（`let a = 1` ⏎ `let b = 2` 的第一条收在 `1`，`let a = 1` ⏎ `if (x) y;` 收在 `1`）。
`stopAtEof = true`：文件末尾**不收口**（`var a` 的收口交给 `BuildTrailingDeclaration` / `TryToClose`）。

**迁移来源**：`StatementScanner.ScanToSemicolon(code, 1, true)`；走的仍是同一份
`StatementBoundaryUtil.EndsAtLineBreak` 与 `ExpressionStatementPossibleShape.IsUncontinuableTailBoundary`
（与 `StatementBuilder.BuildVariableStatement` 同一批判据），不新写第二套 ASI。

```ts
return StatementBoundaryUtil.ScanToSemicolonIncremental(code, 1, true, atEof);
```

## static method ScanToSemicolonIncremental:(code:Array<Token>, from:int, stopAtEof:bool, atEof:bool)=>int

**到本层 `;` 的收口走法**（`return` / `throw` 的操作数与变量声明共用）。

**迁移来源**：`StatementScanner.ScanToSemicolon(code, from, stopAtEof)`（逐字搬迁），只有两处语义化：

1. 全局 `StatementScanner.AtEOF` 改为显式 `atEof` 入参（调用方在分派前刚算过同一个值，
   所以读的是同一个事实，不是第二个判据）；
2. `statement-scanner` 里的 `afterSemi`（`at + 1 < code.length ? code[at + 1] : null`）改成下标判断，
   行为一致。

判据本身一条不新写：换行 ASI 读 `StatementBoundaryUtil.EndsAtLineBreak`，行首 `;` 读 `IsSemicolon`，
表达式尾巴的不可续接读 `ExpressionStatementPossibleShape.IsUncontinuableTailBoundary`。

```ts
for (let at = from; at < code.length; at++) {
  if (StatementBoundaryUtil.IsEof(at, code)) {
    if (stopAtEof) {
      return -1;
    }
    if (at > 0) {
      return at - 1;
    }
    return -1;
  }
  // 换行 ASI：前一个代码单元能收住一条声明、当前单元接不上，就在这里收口——
  // 否则会把**下一条语句**的 `;` 也吞进来（`const last = …` ⏎ `f(...)` / 类型注解跨行读到下一个 `;`）。
  if (at > from && (StatementBoundaryUtil.EndsAtLineBreak(code, at - 1, at)
    || ExpressionStatementPossibleShape.IsUncontinuableTailBoundary(code, at))) {
    if (StatementBoundaryUtil.IsSemicolon(code[at])) {
      // 行首 `;` 后面同一行还有代码（`;(() => 1)()`）：这个 `;` 是下一条空语句，不归本声明。
      if (at + 1 < code.length && StatementScanner.NoLineBreakBetween(code[at], code[at + 1])) {
        return at - 1;
      }
    } else {
      return at - 1;
    }
  }
  if (StatementBoundaryUtil.IsSemicolon(code[at])) {
    return at;
  }
}
if (atEof && code.length > 0) {
  if (stopAtEof) {
    return -1;
  }
  return code.length - 1;
}
return -1;
```

## static method IsYieldFamilyCode:(code:Array<Token>)=>bool

**Stage 5d-6：`yield` / 生成器语句族的「是不是本族」判据**（族判定，不判收口位置）。只认一个起点：
首代码单元是 `yield` 关键字的**表达式语句**（`yield` / `yield 1` / `yield* xs` / `yield = 1`）。

| 起点 | 族 | 收口规则 | 判据实现 |
| --- | --- | --- | --- |
| `yield`（非标签） | 受限产生式表达式语句 | 关键字后换行 ⇒ 停在关键字上；否则到本层 `;` / ASI | `YieldFamilyEndCode` |

`yield` 与 `return` / `throw` 同样是**受限产生式**（`yield [no LineTerminator here] *? AssignmentExpression`），
但它是**双角色起点**：`Decide` 一律判成 `StatementRoute.Legacy`，根层由 `StatementPossibleShape` 原子建树
（行为一字不改），块体目录里由 `YieldStatementPossibleShape`（Stage 5d-4）建壳。本方法只服务后者——
壳的终结候选在 `ScanRoot` 之前先问它，收口位置改读 `YieldFamilyEndCode`。

**为什么不认 `yield:`（标签）**：`标识符 :` 是控制流族的标签格（`IsControlFlowFamilyCode` →
`ScanBodyEndCode(code, 2)`），`yield: 1` 在非生成器里是合法标签、在生成器里是 TS 的恢复形，
两条都由那一格负责。这里让开，族与族之间不重叠——与 `IsShortFamilyCode` 对 `let:` 的让法同一口径。

```ts
if (code.length === 0) {
  return false;
}
const head = code[0];
if (!(head instanceof Common)) {
  return false;
}
if ((head as Common).TempToString() !== "yield") {
  return false;
}
// `yield:` 是标签语句（`IsControlFlowFamilyCode` 的标签格），仍归控制流族。
return !StatementBoundaryUtil.IsLabelHead(code);
```

## static method YieldFamilyEndCode:(code:Array<Token>, atEof:bool)=>int

**Stage 5d-6：`yield` 表达式语句的收口位置**（唯一入口）。返回**代码下标**（`code` 基准），
`-1` = 还不能收口。只对 `IsYieldFamilyCode(code) === true` 的条目有意义（调用方先问族、再问位置）。

判据与 `StatementBuilder.BuildExpressionStatement` **同一套**（那是 legacy 建这一族的唯一实现），只做两件事：

1. **受限产生式**（`yield` 之后、操作数之前有行终止符 ⇒ 本条语句停在 `yield` 上）：
   `function* g(){ yield⏎(x) }` = `yield;` + `(x);`。块注释里的换行同样算（`NoLineBreakBetween` 的
   `LineTerminator` 口径）。`yield` ⏎ `;` 与建造器一致：`;` 留给下一条空语句，收口仍是 `0`。
2. 否则按**表达式语句**收口：本层 `;` 收在 `;` 上；换行处前一个代码单元能收尾、当前单元接不上
   （`EndsAtLineBreak`）或候选层的 ASI（`IsAsiBoundary`）成立 ⇒ 收在前一个代码单元上。
   两条判据都是 `StatementBoundaryUtil` 的**既有唯一实现**，不新写 ASI。

**与扫描器 / 建造器的关系**：收口规则本来就在 `StatementBuilder.BuildExpressionStatement` 里有一份
（`;` / `EndsAtLineBreak` / `IsAsiBoundary` / `yield` 受限产生式），这里读的是同一批边界判据——
`StatementBoundaryUtil.EndsAtLineBreak` 是扫描器侧的**唯一实现点**（`ScanExpressionBody` /
`ScanToSemicolon` 都读它），`ExpressionStatementPossibleShape.IsAsiBoundary` 是候选侧的**唯一实现点**
（建造器读的也是它）。所以壳的 `End` 与建造器自己算出的末格**不会分叉**：`BuildFromShell` 的
`At === Units.length` 由构造保证，不是靠捕获异常兜住。

**为什么不能直接用 `CanEndStatement` / 表达式族那一格**：`CanEndStatement` 只在**当前格**回答「能不能
收」，它把 `yield⏎(x)` 的换行判成「`(` 能接上 `yield` 这个标识符」（调用位续接），于是受限产生式那一格
收不住——5d-4 实测 20 条探针里 4 条因此整文件重解析（`HANDOFF-5d4.md` §4）。本方法把「`yield` 之后换行」
放在最前面，受限产生式先于任何调用位判断。

```ts
if (code.length === 0) {
  return -1;
}
if (!StatementBoundaryUtil.IsYieldFamilyCode(code)) {
  return -1;
}
// 1) 受限产生式：`yield` 与下一个代码单元之间有行终止符 ⇒ 没有操作数，本条语句停在 `yield` 上。
if (code.length >= 2 && !StatementScanner.NoLineBreakBetween(code[0], code[1])) {
  return 0;
}
// 2) 表达式语句的 `;` / ASI（与 `BuildExpressionStatement` 的循环同一顺序：先 `;`，再 ASI）。
for (let at = 1; at < code.length; at++) {
  if (StatementBoundaryUtil.IsSemicolon(code[at])) {
    return at;
  }
  if (StatementBoundaryUtil.EndsAtLineBreak(code, at - 1, at)
    || ExpressionStatementPossibleShape.IsAsiBoundary(code, at, 0)) {
    return at - 1;
  }
}
if (atEof && code.length > 0) {
  return code.length - 1;
}
return -1;
```

## static method IsAwaitFamilyCode:(code:Array<Token>)=>bool

**Stage 5d-6：`await` 起点语句族的「是不是本族」判据**（族判定，不判收口位置）。只认一个起点：
首代码单元是 `await` 关键字的表达式 / 变量语句（`await f()` / `await x` / `await using r = f()`）。

| 起点 | 族 | 收口规则 | 判据实现 |
| --- | --- | --- | --- |
| `await`（非标签） | 一元表达式语句（**无**受限产生式） | 到本层 `;` / ASI | `AwaitFamilyEndCode` |

`await` 是 `StatementRouteUtil.IsLegacyKeyword` 里的双角色起点（`await f()` 的关键字前缀，`await` 标识符 /
`await: 1` 标签），`Decide` 一律判成 `StatementRoute.Legacy`；根层由 `StatementPossibleShape` 原子建树，
块体目录里由 `AwaitStatementPossibleShape`（Stage 4l）建壳。本方法只服务后者——壳的终结候选在
`ScanRoot` 之前先问它，收口位置改读 `AwaitFamilyEndCode`。

**为什么不认 `await:`（标签）**：与 `yield:` 同一口径，`标识符 :` 是控制流族的标签格，让开。

```ts
if (code.length === 0) {
  return false;
}
const head = code[0];
if (!(head instanceof Common)) {
  return false;
}
if ((head as Common).TempToString() !== "await") {
  return false;
}
return !StatementBoundaryUtil.IsLabelHead(code);
```

## static method AwaitFamilyEndCode:(code:Array<Token>, atEof:bool)=>int

**Stage 5d-6：`await` 语句的收口位置**（唯一入口）。返回**代码下标**（`code` 基准），`-1` = 还不能收口。
只对 `IsAwaitFamilyCode(code) === true` 的条目有意义（调用方先问族、再问位置）。

`await` 是**一元运算符**，没有 `yield` / `return` / `throw` 的受限产生式：`await` ⏎ `x` 仍是 `await x`
（TS 的 `parseAwaitExpression` 不看换行）。所以收口只有一条：**表达式语句的 `;` / ASI**——
`await f()` / `await using r = f()` / `await(x)` / `await = 1` 都收在本层 `;` 上，没有 `;` 时收在 ASI
边界或末代码单元上。

判据不新写：`ScanToSemicolonIncremental` 就是 `StatementScanner.ScanToSemicolon` 的逐字搬迁
（`;` / 换行 ASI / 不可续接尾巴 / EOF），与 `BuildExpressionStatement` / `BuildVariableStatement`
读同一批 `StatementBoundaryUtil.EndsAtLineBreak` 与 `ExpressionStatementPossibleShape.IsUncontinuableTailBoundary`。
`stopAtEof = false`：`await` 在文件末尾同样收口（它不是声明，没有 `BuildTrailingDeclaration` 兜底）。

```ts
if (code.length === 0) {
  return -1;
}
if (!StatementBoundaryUtil.IsAwaitFamilyCode(code)) {
  return -1;
}
return StatementBoundaryUtil.ScanToSemicolonIncremental(code, 1, false, atEof);
```

## static method IsControlFlowFamilyCode:(code:Array<Token>)=>bool

**Stage 5d-2b：带体 / 链式控制流族的「是不是本族」判据**（族判定，不判收口位置）。认三类起点：

| 起点 | 族 | 收口规则 | 判据实现 |
| --- | --- | --- | --- |
| `{`（`{…}` 括号） | 块语句 | 首单元就是**已闭合**的块 | `ControlFlowFamilyEndCode` → `0` |
| `if` | 带体 + `else` 链 | `(…)` 头 + 体，体后按文档前瞻等 `else` | `IfStatementEndCode` |
| `while` / `switch` / `with` | 带体 | `(…)` 头 + 体 | `LoopStatementEndCode` |
| `for` / `for await` | 带体 | 可选 `await` + `(…)` 头 + 体 | `ForStatementEndCode` |
| `do` | 带体 + `while (…)` 链 | 体（`stopAtWhile`）+ `while (…)` + `;` / ASI | `DoStatementEndCode` |
| `try` | 带体 + `catch` / `finally` 链 | `{…}` + 可选 `catch` / `finally`（文档前瞻） | `TryStatementEndCode` |
| `标识符 :` | 标签 | `:` 后的那条语句 | `ScanBodyEndCode(code, 2)` |

**族判定必须与 `ScanRoot` 的分派条件逐条一致**（否则「本族」与「扫描器认的族」会错位，收口位置就会分叉）：

- 七个控制流关键字在 `ScanRoot` 里各自 `return`，这里无条件认；
- `declare` / `await` / `using` 在 `ScanRoot` 里有专门分支且都提前 `return`，**不会**落到标签判据；
- 短语句族（`return` / `throw` / `break` / `continue` / `debugger` / `let`·`const`·`var`）由
  `IsShortFamilyCode` 在族分派里**先**分流，本方法对它们只在「`let:` 标签形态」这一格接住
  （此时 `IsShortFamilyCode` 已答 `false`，`ScanRoot` 也会落到最后的标签判据）；
- 其余 `Common` 起点在 `ScanRoot` 里只剩**标签判据**一条路（`标识符 :`），所以这里也只认它；
- **Stage 5d-6**：`yield`（非标签形态）由 `IsYieldFamilyCode` 在族分派里**先**接走，本方法对它只在
  「`yield:` 标签形态」这一格接住（那时 `IsYieldFamilyCode` 已答 `false`，与 `let:` 的分工同构）。

`code` 与 `IsShortFamilyCode` 的入参同一基准：只含代码单元（无 trivia）的已扫前缀。

```ts
if (code.length === 0) {
  return false;
}
const head = code[0];
if (head instanceof Bracket) {
  // 块语句：`ScanRoot` 对首单元 `{` 也答 `Complete(0)`。
  return (head as Bracket).StartBracketChar === "{";
}
if (!(head instanceof Common)) {
  return false;
}
const text = (head as Common).TempToString();
if (text === "if" || text === "while" || text === "do" || text === "for"
  || text === "try" || text === "switch" || text === "with") {
  return true;
}
// `ScanRoot` 的专门分支（ambient 变量 / `await using` / `using`）都提前 `return`；
// 短语句族也已在族分派里先被 `IsShortFamilyCode` 接走。这里保持「不认」，让它们仍走各自的分支。
if (text === "declare" || text === "await" || text === "using"
  || text === "const" || text === "var" || text === "return" || text === "throw"
  || text === "break" || text === "continue" || text === "debugger") {
  return false;
}
// 其余 Common：`ScanRoot` 只可能落到最后的标签判据（`标识符 :`）。
return StatementBoundaryUtil.IsLabelHead(code);
```

## static method IsLabelHead:(code:Array<Token>)=>bool

**标签语句的头判据**（与 `ScanRoot` 的标签分支同一口径）：首单元是 `Common`，且

- 下一格已经是 `:`（`code[1]`），或
- 只有一个单元、文档里紧随的字符（跳过空白与注释）是 `:`（`:` 还没被 token 化）。

```ts
if (code.length === 0) {
  return false;
}
const head = code[0];
if (!(head instanceof Common)) {
  return false;
}
if (code.length >= 2) {
  return code[1] instanceof Symbol && (code[1] as Symbol).Is(":");
}
return StatementScanner.NextChar(head.SourceRange.Document, head.SourceRange.EndIndex) === ":";
```

## static method ControlFlowFamilyEndCode:(code:Array<Token>)=>int

**Stage 5d-2b：带体 / 链式控制流族的收口位置**（唯一入口）。返回**代码下标**（`code` 基准），
`-1` = 还不能收口。只对 `IsControlFlowFamilyCode(code) === true` 的条目有意义（调用方先问族、再问位置）。

链式族的关键字前瞻（`else` / `while` / `catch` / `finally`）**逐条搬在 boundary 层**，判据来源是
`StatementScanner` 的 `NextWord` / `NextChar`（`else` / `catch` / `finally` 可能还没被 token 化，
必须读文档；do-while 的 `;` 也一样）——不是第二套前瞻，就是扫描器里那一条。

**语句体的终点仍读 `StatementScanner.ScanBody`**（唯一实现点）：体可以是任意语句（块 / 表达式 /
短语句 / 嵌套控制流 / 声明体），把它在 boundary 层重写一遍就是第二套语句文法。`ScanBody` 本身
**不调用 `ScanRoot`**（它按首单元分派到各族的体扫描），所以终结候选这条路径上 `ScanRoot` 归零。

**`AtEOF` 读的是调用方刚设置的 `StatementScanner.AtEOF`**（`ComputeByIndex` / `BuildByIndex` /
`TryToClose` 都在分派前算过同一个值，与 `ScanRoot` 读的是同一个事实），不在这里重算，避免出现第二个口径。

```ts
if (code.length === 0) {
  return -1;
}
const head = code[0];
if (head instanceof Bracket) {
  // 块语句：首单元 `{…}` 就是整条语句（与 `ScanRoot` 的 `Complete(0)` 同一位）。
  return (head as Bracket).StartBracketChar === "{" ? 0 : -1;
}
if (!(head instanceof Common)) {
  return -1;
}
const text = (head as Common).TempToString();
if (text === "if") {
  return StatementBoundaryUtil.IfStatementEndCode(code);
}
if (text === "while" || text === "switch" || text === "with") {
  return StatementBoundaryUtil.LoopStatementEndCode(code);
}
if (text === "for") {
  return StatementBoundaryUtil.ForStatementEndCode(code);
}
if (text === "try") {
  return StatementBoundaryUtil.TryStatementEndCode(code);
}
if (text === "do") {
  return StatementBoundaryUtil.DoStatementEndCode(code);
}
// 标签：`标识符 :` 之后的那条语句（`let: 1` 的 `:` 也在这里，单 `let` 还在等 `:` 时答 -1）。
if (!StatementBoundaryUtil.IsLabelHead(code)) {
  return -1;
}
return StatementBoundaryUtil.ScanBodyEndCode(code, 2);
```

## static method ScanBodyEndCode:(code:Array<Token>, at:int, stopAtWhile?:bool)=>int

**语句体的收口位置**：把 `StatementScanner.ScanBody(code, at, stopAtWhile)` 的 `Complete` 折算成
「最后一个属于体的代码下标」，其余（`NeedMore` / `Mismatch`）一律 `-1`。

`stopAtWhile` 只由 `DoStatementEndCode` 传 `true`（do 体的表达式语句在换行处遇到 `while` 要收口，
那一格属于 do-while 的条件头），与 `ScanDo` 的传法逐字相同。

```ts
if (at < 0 || at >= code.length) {
  return -1;
}
const body = StatementScanner.ScanBody(code, at, stopAtWhile);
if (body.Status !== 1 || body.End < 0 || body.End >= code.length) {
  return -1;
}
return body.End;
```

## static method IfStatementEndCode:(code:Array<Token>)=>int

**`if` 的收口**（含 `else` / `else if` 链）：`if` + `(…)` 头 + 体；体到齐后

- 本层已有下一格：是 `else` 就再吃一条体、收在 `else` 体末尾；否则收在 if 体末尾；
- 本层没有下一格：文档里紧接着的词是 `else` 就**继续等**（`if (a) {}` ⏎ `else {}` 的 `else`
  可能还没被 token 化），否则收在 if 体末尾。

`else` 体仍交给 `ScanBody`，所以 `else if` 链是自然的递归（`ScanBody` 认 `if`），不需要在这里再写一层。

**迁移来源**：`StatementScanner.ScanIf(code, 0)`（链式前瞻逐字搬迁）。

```ts
if (code.length < 2) {
  return -1;
}
if (!StatementScanner.IsBracket(code[1], "(")) {
  return -1;
}
const bodyEnd = StatementBoundaryUtil.ScanBodyEndCode(code, 2);
if (bodyEnd < 0) {
  return -1;
}
const next = bodyEnd + 1;
if (next < code.length) {
  if (StatementScanner.IsKeyword(code[next], "else")) {
    return StatementBoundaryUtil.ScanBodyEndCode(code, next + 1);
  }
  return bodyEnd;
}
if (StatementScanner.NextWord(code[bodyEnd].SourceRange.Document, code[bodyEnd].SourceRange.EndIndex) === "else") {
  return -1;
}
return bodyEnd;
```

## static method LoopStatementEndCode:(code:Array<Token>)=>int

**`while` / `switch` / `with` 的收口**：头是一个 `( … )` 括号单元，后面跟体。三者同构
（`ScanRoot` 把 `switch` / `with` 也交给 `ScanLoop`），所以共用这一份。

```ts
if (code.length < 2) {
  return -1;
}
if (!StatementScanner.IsBracket(code[1], "(")) {
  return -1;
}
return StatementBoundaryUtil.ScanBodyEndCode(code, 2);
```

## static method ForStatementEndCode:(code:Array<Token>)=>int

**`for` / `for-in` / `for-of` / `for await` 的收口**：可选一个 `await`，然后 `( … )` 头，再跟体。
`for-in` / `for-of` 的区别只在头括号**内部**（头是整单元，这里不看），所以判据同一条。

```ts
if (code.length < 2) {
  return -1;
}
let bracketAt = 1;
if (StatementScanner.IsKeyword(code[bracketAt], "await")) {
  bracketAt++;
  if (bracketAt >= code.length) {
    return -1;
  }
}
if (!StatementScanner.IsBracket(code[bracketAt], "(")) {
  return -1;
}
return StatementBoundaryUtil.ScanBodyEndCode(code, bracketAt + 1);
```

## static method DoStatementEndCode:(code:Array<Token>)=>int

**`do-while` 的收口**：体（`stopAtWhile`：换行处遇到 `while` 就收住，那个 `while` 是条件头）→
`while` + `( … )` → 条件头之后

- 原始文本的下一个字符**不是 `;`**：语句已经完整，收在条件头的 `)` 括号单元上
  （TS 的 `do {} while (b)` 后面即使同一行还有一条语句，也是两条语句）；
- 是 `;` 且本层已有这一格：收在 `;`；是 EOF 哨兵则收在条件括号上；
- 是 `;` 但本层还没到：继续等。

**缺 `while` 的恢复形**（`do b` ⏎ `{}`）：条件位就是一个表达式，交给
`StatementScanner.ScanConditionEnd`（唯一实现点）找条件表达式的末尾；`-1` 时继续等。

```ts
const bodyEnd = StatementBoundaryUtil.ScanBodyEndCode(code, 1, true);
if (bodyEnd < 0) {
  return -1;
}
const whileAt = bodyEnd + 1;
if (whileAt >= code.length) {
  // 体已经收口、本层再没有单元：`while` 缺失（`do` ⏎ `{}`）。到文件末尾按体尾收口，
  // 还没到 EOF 就继续等（后面可能还有 `while`）。
  if (StatementScanner.AtEOF) {
    return bodyEnd;
  }
  return -1;
}
if (StatementScanner.IsKeyword(code[whileAt], "while")) {
  if (whileAt + 1 >= code.length) {
    return -1;
  }
  if (!StatementScanner.IsBracket(code[whileAt + 1], "(")) {
    return -1;
  }
  const header = code[whileAt + 1] as Bracket;
  const semiAt = whileAt + 2;
  // 只有字面 `;` 才能续上 do-while：条件头之后的下一个原始字符不是 `;` 就已经完整
  // （文件末尾 / `}` 前 / 换行处 / 同一行起下一条语句，都是完整语句）。
  const nextChar = StatementScanner.NextChar(header.SourceRange.Document, header.SourceRange.EndIndex);
  if (nextChar !== ";") {
    return whileAt + 1;
  }
  if (semiAt >= code.length) {
    return -1;
  }
  if (StatementBoundaryUtil.IsSemicolon(code[semiAt])) {
    return semiAt;
  }
  if (StatementBoundaryUtil.IsEof(semiAt, code)) {
    return semiAt - 1;
  }
  return -1;
}
// 缺 `while` 的恢复形：条件位是一个表达式（`do b` ⏎ `{}` 的 `{}` 是条件位的对象字面量）。
return StatementScanner.ScanConditionEnd(code, whileAt);
```

## static method TryStatementEndCode:(code:Array<Token>)=>int

**`try` 的收口**（含 `catch` / `finally` 链）：`try` + `{…}`，然后

- 本层已有下一格：`catch` / `finally` 就继续吃，其余收在 try 块上；
- 本层没有下一格：文档里紧接着的词是 `catch` / `finally` 就**继续等**，否则收在 try 块上。

```ts
if (code.length < 2) {
  return -1;
}
if (!StatementScanner.IsBracket(code[1], "{")) {
  return -1;
}
const tryBlock = 1;
const next = tryBlock + 1;
if (next < code.length) {
  if (StatementScanner.IsKeyword(code[next], "catch")) {
    return StatementBoundaryUtil.TryCatchEndCode(code, next);
  }
  if (StatementScanner.IsKeyword(code[next], "finally")) {
    return StatementBoundaryUtil.TryFinallyEndCode(code, next);
  }
  return tryBlock;
}
const word = StatementScanner.NextWord(code[tryBlock].SourceRange.Document, code[tryBlock].SourceRange.EndIndex);
if (word === "catch" || word === "finally") {
  return -1;
}
return tryBlock;
```

## static method TryCatchEndCode:(code:Array<Token>, catchAt:int)=>int

**`catch` 子句**：可选一个 `( 绑定 )`，然后必须是一个 `{ … }` 块；块到齐后再看 `finally`
（与 `ScanTry` 的 `catch` / `finally` 前瞻同一条文档前瞻）。

```ts
let cursor = catchAt + 1;
if (cursor >= code.length) {
  return -1;
}
if (StatementScanner.IsBracket(code[cursor], "(")) {
  cursor++;
}
if (cursor >= code.length) {
  return -1;
}
if (!StatementScanner.IsBracket(code[cursor], "{")) {
  return -1;
}
const catchBlock = cursor;
const next = catchBlock + 1;
if (next < code.length) {
  if (StatementScanner.IsKeyword(code[next], "finally")) {
    return StatementBoundaryUtil.TryFinallyEndCode(code, next);
  }
  return catchBlock;
}
if (StatementScanner.NextWord(code[catchBlock].SourceRange.Document, code[catchBlock].SourceRange.EndIndex) === "finally") {
  return -1;
}
return catchBlock;
```

## static method TryFinallyEndCode:(code:Array<Token>, finallyAt:int)=>int

**`finally` 子句**：`finally` 之后必须是一个 `{ … }` 块，收在它上面。

```ts
const blockAt = finallyAt + 1;
if (blockAt >= code.length) {
  return -1;
}
if (!StatementScanner.IsBracket(code[blockAt], "{")) {
  return -1;
}
return blockAt;
```

## static method IsLateAtEof:(units:Array<Token>, tokenIndex:int)=>bool

**晚建守卫的 EOF 半边**（Stage 4x）：从 `statement-possible-shape` 的 `declaration-statement-possible-shape`
里原样上移，供 legacy 让位门控与 `CanEndStatement` 的调用方共用一份判据。

> **Stage 5d-10b 删除 `CanEndStatementAt`**：它原本是 `CanEndStatement` + 本方法的组合，三个历史调用点
> （`DeclarationStatementPossibleShape.ComputeByIndex` / `IsBuildable` /
> `StatementRouteUtil.ShouldYieldToDeclarationShell`）在 4af-a 之后都已改读 `IsDeclarationFollowBoundary`，
> 全仓 grep 无生产调用。判据本身只剩 `CanEndStatement` 一份（本方法仍被它读）。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const owner = units[tokenIndex].Parent;
const end = units[tokenIndex].SourceRange.EndIndex;
return (owner !== null && owner.SourceRange.EndIndex >= 0)
  || (end >= 0 && StatementScanner.NextChar(units[tokenIndex].SourceRange.Document, end) === "");
```
