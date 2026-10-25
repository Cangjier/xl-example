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

## static method IsAsiBoundary:(units:Array<Token>, tokenIndex:int, limit?:int)=>bool

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
// C2（R4-CONTRACT §4.1，审批 A-2）：行首**操作数起点**是 ASI 边界。
// 判据与 TS 的「表达式吃到接不上为止 + canParseSemicolon」同构：① 与前一代码单元之间有行终止符；
// ② 前一单元能收住一条表达式（`= ⏎ a` / `( ⏎ a` 这类位置因此不受影响）；③ 当前单元是**操作数起点**；
// ④ 当前单元不是续接位（`(` `[` 模板 / 二元运算符 / `.` `?.` / `<` / `?` `:` `=>` / `as` `satisfies`
// `in` `of` `instanceof`）。四条在 `IsLineStartOperandBoundary` 里唯一实现，本分支只做接入。
// 回归面：只有「换行 + 前项能收住 + 行首是操作数起点」这一种输入会走这一支；`ContinuesAcrossLine`
// **一个字不改**（它是类型位 / `in`·`of` 子句共用的判据）。
if (StatementBoundaryUtil.IsLineStartOperandBoundary(units, tokenIndex)) {
  return true;
}
return !ExpressionStatementPossibleShape.IsContinuation(current);
```

## static method IsContinuationToken:(unit:Token)=>bool

```ts
// = 既有 `ExpressionStatementPossibleShape.IsContinuation` 的**同语义副本**。
// 不能反向 import：boundary 层被候选层 import（`expression-statement-possible-shape` → 本文件），
// 反向引用会成环。只列「换行后仍然接得上」的那一批，与本文件的其它判据共用同一个闭集口径。
if (unit instanceof Bracket) {
  const start = (unit as Bracket).StartBracketChar;
  return start === "(" || start === "[";
}
if (unit instanceof String) {
  return (unit as String).StringChar === "`";
}
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  return text === "+" || text === "-" || text === "*" || text === "/" || text === "%"
    || text === "**" || text === "<" || text === ">" || text === "<=" || text === ">="
    || text === "==" || text === "!=" || text === "===" || text === "!=="
    || text === "&" || text === "|" || text === "^" || text === "&&" || text === "||"
    || text === "??" || text === "<<" || text === ">>" || text === ">>>" || text === "="
    || text === "+=" || text === "-=" || text === "*=" || text === "/=" || text === "%="
    || text === "**=" || text === "&=" || text === "|=" || text === "^=" || text === "&&="
    || text === "||=" || text === "??=" || text === "<<=" || text === ">>=" || text === ">>>="
    || text === "." || text === "?." || text === "," || text === "?" || text === ":"
    || text === "=>" || text === "...";
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  return text === "in" || text === "instanceof" || text === "as" || text === "satisfies";
}
return false;
```

## static method IsOperandStartUnit:(unit:Token)=>bool

```ts
// C2 条件③：当前单元能不能**起一个操作数**（= 新语句的第一格）。
// 只认「只能起操作数、不能续接上一条表达式」的单元：Common（标识符 / 前缀关键字，但要排除续接词、
// 语句词、声明头词）、数字、字符串、正则、BigInt；符号 / 括号一律不算（`(b)` `[b]` `+ b` 是续接位）。
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  if (StatementBoundaryUtil.IsContinuationToken(unit)) {
    return false;                     // `in` / `instanceof` / `as` / `satisfies`
  }
  if (ExpressionStatementPossibleShape.IsStatementWord(text)) {
    return false;                     // `if` / `for` / `return` / `let` … 起的是语句，不是操作数
  }
  if (ExpressionStatementPossibleShape.IsDeclarationHeadWord(text)) {
    return false;                     // `class` / `function` / `interface` … 同上
  }
  // `of` / `keyof` / `unique` / `readonly` / `is` / `asserts` / `infer` 是上下文关键字：
  // 它们在行首既可能起类型位也可能起标识符，交回原有判据（不在这里擅自断句）。
  return text !== "of" && text !== "keyof" && text !== "unique" && text !== "readonly"
    && text !== "is" && text !== "asserts" && text !== "infer";
}
if (unit instanceof Symbol) {
  // `-a` / `+a` / `!a` / `~a` / `++a` 是**前缀**形态，但它们的第一个单元是符号——行首符号一律按
  // 续接位处理（`a ⏎ + b` 必须仍是一条），所以这里答 false。这条就是 C2 的反过度收缩半边。
  return false;
}
if (unit instanceof Bracket) {
  return false;
}
if (unit.IsTriviaToken || unit instanceof EndOfFileTokenShape) {
  return false;
}
// 数字 / 字符串 / 正则 / BigInt 等字面量单元：只能起操作数。
return true;
```

## static method IsLineStartOperandBoundary:(units:Array<Token>, tokenIndex:int)=>bool

```ts
// C2（R4-CONTRACT §4.1）：①②③④ 四条的唯一实现点，逐条判、任一条不成立就答 false。
if (tokenIndex <= 0 || tokenIndex >= units.length) {
  return false;
}
const current = units[tokenIndex];
if (current.IsTriviaToken || current instanceof EndOfFileTokenShape) {
  return false;
}
if (current instanceof Symbol && (current as Symbol).Is(";")) {
  return false;                       // `;` 是语句自己的终结符（`Done` 那条路），不在这里断
}
let prev = tokenIndex - 1;
while (prev >= 0 && units[prev].IsTriviaToken) {
  prev--;
}
if (prev < 0) {
  return false;
}
// ① 换行：与 `IsAsiBoundary` 读同一份（按源位置找，块体 units 不带 trivia）。
if (!ExpressionStatementPossibleShape.HasLineBreakBefore(units, tokenIndex)) {
  return false;
}
// ② 前一单元能收住一条表达式（`= ⏎ a` / `( ⏎ a` / `, ⏎ a` 的位置因此不受影响）。
if (!ExpressionStatementPossibleShape.CanEndExpressionAt(units, prev)
  && !ExpressionStatementPossibleShape.IsPostfixBangTail(units, prev)) {
  return false;
}
// ③ 当前单元是操作数起点。
if (!StatementBoundaryUtil.IsOperandStartUnit(current)) {
  return false;
}
// ④ 当前单元不是续接位（③ 已排除符号 / 括号，这一条对 Common 再做一次兜底）。
if (StatementBoundaryUtil.IsContinuationToken(current)) {
  return false;
}
return true;
```

## static method IsInstantiationTailAsiBoundary:(units:Array<Token>, tokenIndex:int, limit?:int)=>bool

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

```ts
return unit instanceof Symbol && (unit as Symbol).Is(";");
```

## static method IsEof:(tokenIndex:int, units:Array<Token>)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
return units[tokenIndex] instanceof EndOfFileTokenShape;
```

## static method CanEndStatement:(units:Array<Token>, tokenIndex:int, atEof:bool)=>bool

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

```ts
return StatementBoundaryUtil.ScanToSemicolonIncremental(code, 1, true, atEof);
```

## static method ScanToSemicolonIncremental:(code:Array<Token>, from:int, stopAtEof:bool, atEof:bool)=>int

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
  // D7（R3-CONTRACT §4.5）：`++` / `--` / `!` **不能跨行**成为后缀（TS `parsePostfixExpressionOrHigher`
  // 的 `scanner.hasPrecedingLineBreak()` 守卫；与 C1 的引擎守卫、`IsAsiBoundary` 是**同一条语义**）。
  // 判据只补在这里一次，因为声明族（`let`/`const`/`var`）与 `return`/`throw` 的收口只走本函数，
  // 而 `EndsAtLineBreak` 的 `!ContinuesAcrossLine(next)` 对这三个符号恒为 false。
  // 前置条件 `EndsExpression(code[at-1])` 是关键：`a = ⏎ ++b` 里 `=` 收不住表达式，`++` 是**前缀**，
  // 不能断（这一条就是「反过度收缩」守卫）；`let x = a⏎+ b` 的 `+` 不在受限集合里，同样不受影响。
  if (at > from
    && !StatementScanner.NoLineBreakBetween(code[at - 1], code[at])
    && StatementBoundaryUtil.IsRestrictedPostfixUnit(code[at])
    && StatementScanner.EndsExpression(code[at - 1])) {
    return at - 1;
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

## static method IsRestrictedPostfixUnit:(unit:Token)=>bool

```ts
// D7（R3-CONTRACT §4.5 + R4-CONTRACT §4.2 A-3）：跨行后**不能**继续上一条表达式的受限后缀单元。
// `++` / `--` 在 TS 里是后缀运算符（`parsePostfixExpressionOrHigher` 用 `hasPrecedingLineBreak()`
// 拒绝跨行）；`!` / `~` 不是二元运算符而是一元前缀的起点，同样接不上（`a ! b` / `a ~ b` 从来不是
// 合法表达式）；`typeof` 同族（`a typeof b` 也不是表达式，它只能作**前缀**）。
// R4 按 A-3 把 `~` 与 `typeof` 补进闭集：`let x = a⏎~b` / `let x = a⏎typeof b` 由扫描器在 `b` 之前收口
// ⇒ 两条语句（tsc 实测同结论，见 R4-CONTRACT §2.3）。`typeof` 是 `Common`（不是 `Symbol`），
// 所以类型判别必须同时认两种单元——这不是放宽：`++`/`--`/`!`/`~` 仍是 `Symbol` 文本比较。
// 不追加 `as` / `satisfies` / `keyof` / `of`：它们是上下文关键字，要连带类型位判据 ⇒ R5（扩展观察项）。
if (!(unit instanceof Symbol) && !(unit instanceof Common)) {
  return false;
}
const text = (unit as Symbol | Common).TempToString();
return text === "++" || text === "--" || text === "!" || text === "~" || text === "typeof";
```

## static method IsYieldFamilyCode:(code:Array<Token>)=>bool

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

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const owner = units[tokenIndex].Parent;
const end = units[tokenIndex].SourceRange.EndIndex;
return (owner !== null && owner.SourceRange.EndIndex >= 0)
  || (end >= 0 && StatementScanner.NextChar(units[tokenIndex].SourceRange.Document, end) === "");
```
