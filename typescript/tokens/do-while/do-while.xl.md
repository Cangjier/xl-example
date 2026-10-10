# dependencies
```xl
import { Get } from "../../../core/extensions/list-extension.xl.md"
import { ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { TakeRange } from "../../../core/extensions/list-extension.xl.md"
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../../core/syntax/close-rule.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { TokenField } from "../../../core/syntax/token-field.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { GetSkipNextWrapSymbol, IsTriviaUnit } from "../../text-common-util.xl.md"
import { SkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { CommentsIn, SkipNextTrivia, SkipPreviousTrivia } from "../../text-common-util.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Identifier } from "../identifier.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
import { IsWordUnit } from "../declaration-common.xl.md"
import { Statement } from "../statement.xl.md"

import { WhileBody } from "../while/while-body.xl.md"
import { WhileCompare } from "../while/while-compare.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`do … while` 语句：把 `do` 语句 `while` `(` 条件 `)` `;` 这一串单元重组成一个 `DoWhile`，
里面分成 Body（`do` 后面那条语句）与 Compare（`while` 那个条件括号整段）两段。

**为什么单开一条规则**：`do` 在关键字表里，没有它时 `do` 只是一个 `<Keyword>`，
后面的 `while(...)` 会被 `WhileCloseRule` 抢走当成一个**独立的 while 语句**——
`do { x++ } while (x < 10)` 于是变成「`do` 关键字 + 空 while」，而不带分号的写法更糟：
`while` 会去找自己的循环体，找不到就抛 `Error`。

**两段的顺序与 `While` 相反**：`do` 的体在前、条件在后，所以 XML 里 Body 段排在 Compare 段之前。
两段复用 `While` 的类型（`WhileBody` / `WhileCompare`）——形状完全一样，
消费者可以按同一套标签处理两种循环。

`DoWhileCloseRule` **不进 `Data`、不进 XML**，所以它的类名随便取。它必须写在 `DoWhile` **之前**：
`Instance` 这个静态字段在类定义时就会 `new DoWhileCloseRule()`，写反了会命中暂时性死区（TDZ）。

反过来，`DoWhile` 本体的类名**就是** XML 标签名（取自 `this.constructor.name`），不能改。

# class DoWhileCloseRule extends CloseRule

收尾规则：`do` + 一条语句 + `while` + `(` 开头的括号，整段换成一个 `DoWhile`。

## static readonly field Instance:DoWhileCloseRule = new DoWhileCloseRule()

唯一的实例。

## private method BodyEnd:(units:Array<Token>, index:int)=>int

`do` 后面那条语句的结尾下标；取不到时返回 `-1`。

`do` 的体有两种形状，与 `While` 一样分两路：

- `{` 开头的括号——体就是这一整个括号，返回它的下标；
- 其余——**往后找到那个 `while` 词**，它前面一个下标就是体的结尾。

第二种为什么不用 `Statement.SearchStatementEnd`：`do … while` 的体经常写作两行——
`do x++` 换行 `while (x < 10)`；体与 `while` 之间只有一个软换行（TypeScript 的 ASI 在这里断句），
`SearchStatementEnd` 对这种没有 `;` 的形状给不出结尾，于是整条 `do` 落回 `WhileCloseRule` 手里，
然后因为「`while` 后面没有语句」抛错——正是这条规则要修的那个报错。

按定义，`do` 的体后面**必然**紧跟 `while`，所以直接找那个词最稳。代价是「体里嵌套了另一个 `do…while`」这种
极端写法会找错那个 `while`，这一层不做区分（TypeScript 里嵌套 `do` 也会被 ASI 断开，本来就极其罕见）。

**条件那一截可能先被语句层收成壳**：`do if (a) x++; while (c);` 里 `while (c);` 自带分号，
它在 `do` 被处理之前就缩进了一个 `Statement`——顶层找不到那个 `while` 词，只有壳里第一格是它。
所以扫的时候连壳一起看：壳的第一格是 `while` 词（或已经是 `While` 单元）时，它的前一个下标就是体的结尾。

**体自己起手就是 `while` 的那一档也收掉了**（第 656 轮）：`do while (a) x++; while (b);` 里
第一个 `while` 是**体**、第二个才是终止符——按定义，体与终止符之间至少隔着体的那一整条语句，
所以**体起点那一格永远不可能是终止符**：扫到 `i === index` 的这一格跳过，往后找的就是真的终止符。
（判据只多这一格，`do x++; while (a);` 那种没有体起手 `while` 的形状一个字节都没变。）

```ts
const candidate = Get(units, index);
if (candidate instanceof Bracket && candidate.startBracket === "{") {
  return index;
}
let i = index;
while (i < units.length) {
  const item = Get(units, i);
  let isWhileStart = IsWordUnit(item, "while");
  // 条件也可能**先被语句层收成壳**：`do if (a) x++; while (c);` 里 `while (c);` 自带分号，
  // 它在 `do` 被处理之前就缩进了一个 `Statement`——顶层于是找不到那个 `while` 词，
  // 只有壳里第一格是它（或已经是 `While` 单元）。不认这一格，整条 `do` 就落不到这条规则手里。
  if (isWhileStart === false && item instanceof Statement) {
    const head = Get(item.Data, 0);
    isWhileStart = head !== null && (head.constructor.name === "While" || IsWordUnit(head, "while"));
  }
  // **体起点那一格是体本身、不是终止符**：`do while (a) x++; while (b);` 的第一个 `while`
  // 就是体（上面那条「壳里第一格」也可能命中它），跳过它再往后找。
  if (isWhileStart && i !== index) {
    // **体尾巴上的 trivia 不算体**（第 843 轮）：`do { a(); } /*c*/while (b);` 里
    // `while` 前面紧挨着的是那条注释（注释也算 trivia）——照 `i - 1` 取会把注释当成体的最后一格
    //  ⇒ `Previous` 走到 `SkipNext*` 那一步看到的是注释、`while` 认不出来
    //（实测 `gap-sweep-{comment,linecomment}-dowhile-01` 两条：整条 `do` 退回
    //  `WhileCloseRule`，产物是「散 `do` 关键字 + 一个独立的 `While`」，各缺 6 多 2）。
    // 软换行本来就该跳（第 501 轮那条口径），这里只是把注释并进同一档。
    return SkipPreviousTrivia(units, i);
  }
  i = i + 1;
}
return -1;
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一次 `do … while` 的起点。

判定要一路看到条件括号：只认 `do` 是不够的——`do` 也可能出现在别的地方（比如某个标识符的下一行开头），
必须确认「一条语句 + `while` + `(`」这个完整形状。

```ts
const common = Get(units, index);
// **两种来路**（第 635 轮）：顶层单元要么是那个 `do` 词本身（体还没断句），
// 要么是一个**已经断好句的语句壳**——`do x++;` 里那个 `;` 是语句终结符，
// 它在 `while` 被读进来**之前**就把 `do x++` 收成了壳 ⇒ 之后再也看不到顶层的 `do` 词。
// 壳里第一格仍是那个 `do` 词，所以「`do` + 体 + `while` + `(`」这条形状照样成立。
if (common instanceof Statement) {
  const head = Get(common.Data, 0);
  if (IsWordUnit(head, "do") === false) {
    return false;
  }
  const after = SkipNextTrivia(units, index);
  // **条件那一截的三种形态**：
  // 1. 它自成一个语句壳（`do x++; while (c);` 里两个 `;` 各收一个）——壳里那一趟
  //    **可能已经把条件收成了 `While` 单元**（壳先关、规则后跑）⇒ 壳里第一格是
  //    `While` 也算命中；
  // 2. 顶层直接是 `while` 词 + `(` 括号；
  // 3. 顶层直接是一个 `While` 单元。
  // **跨 trivia 而不是只跨软换行**（第 843 轮）：夹一条注释的写法（`do { … } /*c*/while (b);`）
  // 与换行是同一种排版，只跳软换行时这一格看到的是注释 ⇒ 整条 `do` 落到 `WhileCloseRule` 手里。
  const condHolder = Get(units, after);
  const condUnits = condHolder instanceof Statement ? condHolder.Data : units;
  let condAt = condHolder instanceof Statement ? 0 : after;
  // **壳里那条注释要先跳过去**（第 843 轮）：`do x++; /*c*/ while (c);` 里条件那条壳是
  // `[AreaAnnotation, while, (c)]`（语句壳只丢软换行、不丢注释，见 `Statement.FormFrom`）
  // —— 照 `Data[0]` 取看到的是注释 ⇒ `while` 认不出来 ⇒ 整条 `do` 退回 `WhileCloseRule`
  //（实测这一格缺 4 多 4：`do x++;` 与 `while (c);` 各成一条）。
  while (condHolder instanceof Statement && condAt < condUnits.length && IsTriviaUnit(Get(condUnits, condAt))) {
    condAt = condAt + 1;
  }
  const cond = Get(condUnits, condAt);
  if (cond !== null && cond.constructor.name === "While") {
    return true;
  }
  if (IsWordUnit(cond, "while") === false) {
    return false;
  }
  const condition = GetSkipNextWrapSymbol(condUnits, condAt);
  return condition instanceof Bracket && condition.startBracket === "(";
}
if (IsWordUnit(common, "do") === false) {
  return false;
}
let i = SkipNextWrapSymbol(units, index);
const bodyEnd = this.BodyEnd(units, i);
if (bodyEnd < 0) {
  return false;
}
i = SkipNextTrivia(units, bodyEnd);
// **体与 `while` 之间夹的注释也算 trivia**（第 843 轮，与上面壳里那一支同一口径）：
// 只跳软换行时这一格看到的是注释 ⇒ `while` 认不出来 ⇒ 整条 `do` 退回 `WhileCloseRule`。
// 条件那一截与上面同一份判据：可能在壳里（壳先关、规则后跑），也可能顶层就是词或 `While` 单元。
const holder = Get(units, i);
const condUnits = holder instanceof Statement ? holder.Data : units;
const condAt = holder instanceof Statement ? 0 : i;
const cond = Get(condUnits, condAt);
if (cond !== null && cond.constructor.name === "While") {
  return true;
}
if (IsWordUnit(cond, "while") === false) {
  return false;
}
const condition = GetSkipNextWrapSymbol(condUnits, condAt);
return condition instanceof Bracket && condition.startBracket === "(";
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

执行重组：把 `do` 头、循环体、`while` 条件收进一个 `DoWhile`，**返回新的下标**。

顺序与 `WhileCloseRule.Process` 一致：签入签出 → `MoveDataTo` 搬内容 → `TryToClose`。
两点不同：

1. 体的内容在前、条件在后（源顺序）；
2. 结尾多收一个可选的 `;`（`do { … } while (x);`）——不这么做，那个 `;` 会留在父单元里，
   被语句重组收成一个空的 `Statement`。**尾随软换行不收**：它留在父单元里充当语句边界
   （见 `../declaration-common.xl.md` 里「为什么这里不再有收尾口径」那一节）。
   **那个 `;` 有两条来路**（第 569 轮）：解析期**先**收壳时（`;` 那一档），
   它被 `Statement.FormFrom` 切进**壳体的区间**、不进 `Data` ⇒ 这时右端只能从**宿主**取；
   规则先跑时它还在列表里 ⇒ 照旧按列表取。两条路在 `Process` 末尾分开写。

```ts
const unit = Get(units, index)!;
// **体先断句的那一档**（第 635 轮）：顶层是语句壳、`do` 在壳里第一格，
// 条件那一段通常也自成一个壳（`do x++; while (c);` 里两个 `;` 各收一个）。
// 这一支**整段自成一路**：下面那一套（顶层是 `do` 词）一个字都不动。
if (unit instanceof Statement) {
  const head = Get(unit.Data, 0)!;
  const result = new DoWhile(template);
  result.Parent = unit.Parent;
  result.SignIn(head.SourceRange.Start!);
  const after = SkipNextTrivia(units, index);
  // **条件那一截的三种形态**（与 `Previous` 同一份判据）：壳里可能已经是一个 `While` 单元
  //（壳先关、规则后跑），也可能还是 `while` 词 + 括号，顶层也可能直接是 `While`。
  const holder = Get(units, after);
  const condShell = holder instanceof Statement ? holder : null;
  const condUnits = condShell === null ? units : condShell.Data;
  let condAt = condShell === null ? after : 0;
  // **与 `Previous` 同一格**（第 843 轮）：壳里那条注释要先跳过去，
  // `do x++; /*c*/ while (c);` 的条件壳是 `[AreaAnnotation, while, (c)]`。
  while (condShell !== null && condAt < condUnits.length && IsTriviaUnit(Get(condUnits, condAt))) {
    condAt = condAt + 1;
  }
  let condUnit = Get(condUnits, condAt);
  // **条件已经是一个 `While` 单元时，取它里面那个 Compare 段**：
  // 那个段里就是括号整段（`WhileCloseRule` 把括号的子单元搬进去了）。
  let compareSource = null;
  let stillWord = false;
  if (condUnit !== null && condUnit.constructor.name === "While") {
    compareSource = condUnit.Data.find((x) => x.constructor.name === "WhileCompare") ?? null;
  } else {
    stillWord = true;
    compareSource = GetSkipNextWrapSymbol(condUnits, condAt);
  }
  // **壳就是体**：把壳里那个 `do` 词摘掉，剩下的与 `while (c) x++;` 那一支**同形**
  //（体的内容仍是**一个 `Statement` 壳** ⇒ 投影照同一条路投，不必另开一路）。
  const bodySegment = result.CreateBody();
  unit.Data.splice(0, 1);
  // **壳里只剩 trivia 也算空体**（第 662 轮）：`do /* c */; while (false);` 里壳里剩下的
  // 只有那条注释，按「长度 > 0」判会把它当成体（`EmptyBodyAt` 于是记不下、
  // 投影画不出那个 `EmptyStatement`）；注释本身照旧留在壳里，不丢。
  const bodyUnits = unit.Data.filter((item) => !IsTriviaUnit(item));
  if (bodyUnits.length > 0) {
    // **壳的起点要挪到体的第一格**：壳自己的范围从那个 `do` 词起（它本来就是个语句），
    // 而这里要的是**体**（TS 那边 `DoStatement.statement` 从 `x` 起）。
    // `Token.SignIn` 只能设一次，所以这里直接换掉 `SourceRange.Start` 那个引用
    //（它是普通字段，「只能设一次」那条纪律写在 `Token.SignIn` 里）。
    //
    // **「第一格」要跳过 trivia**（第 907 轮片段普查量出的
    // `gap-r907-do-body-comment-range`）：`do/*c*/ f(); while (1);` 里 `Data[0]` 是那条
    // 注释 ⇒ 体的区间从注释起（实测产物 `ExpressionStatement [2,12)`，TS 是 `[8,12)`）；
    // 上面那句 `bodyUnits` 已经把 trivia 滤掉了，这里用**同一个口径**取第一格。
    unit.SourceRange.Start = bodyUnits[0].SourceRange.Start!;
  } else {
    // **`do ; while (…)`**：壳里只剩那个 `do` 词 ⇒ 体是那条空语句。
    // `;` 被 `Statement.FormFrom` 切进了壳的区间，所以它的下标是**壳的右端**
    //（与 `While.EmptyBodyAt` 同一个来由）。
    result.EmptyBodyAt = unit.SourceRange.End!.Index;
  }
  bodySegment.Add(unit);
  bodySegment.SignIn(unit.SourceRange.Start!);
  bodySegment.SignOut(unit.SourceRange.End!);
  bodySegment.TryToClose();
  // **跨过的注释要收下**（第 843 轮）：体与条件之间那条注释落在被 `ReplaceCountAt`
  // 替换掉的那一段里，不显式收下就等于删掉（与 `switch` 第 595 轮同一手，`CommentsIn` 的说明）。
  // 两条来路：顶层那两个单元之间（`units`），以及**条件那条壳里**（`do x++; /*c*/ while (c);`
  // 那条注释住在条件壳里，壳自己被替换掉时就一起没了）。
  result.AddRange(CommentsIn(units, index + 1, after));
  if (condShell !== null) {
    result.AddRange(CommentsIn(condShell.Data, 0, condShell.Data.length));
  }
  const compare = result.CreateCompare();
  if (compareSource !== null) {
    compare.SignIn(compareSource.SourceRange.Start!);
    compare.SignOut(compareSource.SourceRange.End!);
    compareSource.MoveDataTo(compare);
    compare.TryToClose();
  }
  // **右端**：条件自成壳时 `;` 在壳的区间里；条件已经是一个 `While` 单元时它的右端就是
  // 那个 `;`（`while (c);` 收尾时把 `;` 算进去了）；还是散词时再看列表里有没有 `;`。
  let lastIndex = condShell === null ? (stillWord ? SkipNextWrapSymbol(units, after) : after) : after;
  let signOut = condShell !== null
    ? condShell.SourceRange.End!
    : (condUnit !== null && stillWord === false ? condUnit.SourceRange.End! : compareSource!.SourceRange.End!);
  if (condShell === null && stillWord) {
    const semicolon = Get(units, lastIndex + 1);
    if (semicolon instanceof SymbolToken && semicolon.Is(";")) {
      lastIndex = lastIndex + 1;
      signOut = semicolon.SourceRange.End!;
    }
  }
  result.SignOut(signOut);
  result.TryToClose();
  ReplaceCountAt(units, index, lastIndex - index + 1, result);
  return index;
}
const result = new DoWhile(template);
result.Parent = unit.Parent;
result.SignIn(unit.SourceRange.Start!);
let endIndex = SkipNextTrivia(units, index);
const bodyStart = endIndex;
// **`do` 与体之间夹 trivia**（第 907 轮片段普查量出的 `gap-r907-do-body-comment-range`）：
// `do/*c*/ f(); while (1);` / `do//c` 换行 `f();` 里，只跳软换行时 `bodyStart` 落在
// **那条注释**上 ⇒ 体的区间从注释起（实测产物 `ExpressionStatement [2,12)`，
// TS 是 `[8,12)`——注释不是体的第一个单元）。判据跨 trivia 之后，
// 跳过的注释按第 843 轮那一手**显式收下**（它们落在被 `ReplaceCountAt`
// 替换掉的那一段里，不显式收下就等于删掉；`CommentsIn` 只收注释、软换行照旧丢掉）。
if (bodyStart >= units.length) {
  throw new Error("`do` 后需要跟语句，如 `do {...} while (...)` 或 `do ...; while (...)`");
}
result.AddRange(CommentsIn(units, index + 1, bodyStart));
const bodyEnd = this.BodyEnd(units, bodyStart);
if (bodyEnd < 0) {
  throw new Error("`do` 后需要跟语句，如 `do {...} while (...)` 或 `do ...; while (...)`");
}
const bodySegment = result.CreateBody();
const bodyCandidate = Get(units, bodyStart);
if (bodyCandidate instanceof Bracket && bodyCandidate.startBracket === "{") {
  // **体那一对花括号当场记进 `BodyBrace`**（第 619 轮那一格，第 641 轮带上整段，
  // 与 `While` / `For` 同一条口径）：
  // `do {} while (c)` 的空块在 `ToList` 里**整个摊掉**了，
  // 而 TS 那边 `DoStatement.statement` 仍有一个**空 `Block`**——
  // 投影原来靠 `indexOf("{")` + `MatchingBrace` **回原文重扫**（同一条判据的第二份近似）。
  result.BodyBrace.Set(bodyCandidate.SourceRange.Start!.Index, bodyCandidate.SourceRange);
  bodyCandidate.MoveDataTo(bodySegment);
  bodySegment.SignIn(bodyCandidate.SourceRange.Start!);
  bodySegment.SignOut(bodyCandidate.SourceRange.End!);
} else {
  bodySegment.AddRange(TakeRange(units, bodyStart, bodyEnd - bodyStart + 1));
  bodySegment.SignIn(Get(units, bodyStart)!.SourceRange.Start!);
  bodySegment.SignOut(Get(units, bodyEnd)!.SourceRange.End!);
}
bodySegment.TryToClose();
// **体与 `while` 之间的 trivia 要跨过去**（第 843 轮，与 `Previous` 同一口径）：
// `do { a(); } /*c*/while (b);` 里那一格是注释 —— 只跳软换行时 `endIndex` 停在注释上，
// `while` 词与它后面那个括号一位都对不上 ⇒ 整条 `do` 只能退回 `WhileCloseRule`。
endIndex = SkipNextTrivia(units, bodyEnd);
// **跨过的注释要收下**（同第 843 轮）：它们落在被 `ReplaceCountAt` 替换掉的那一段里，
// 不显式收下就等于删掉（`CommentsIn` 只收注释、软换行照旧丢掉，与 `switch` 同一手）。
result.AddRange(CommentsIn(units, bodyEnd + 1, endIndex));
// **条件自成壳或已成形时走这一支**（`do if (a) x++; while (c);`，与上面壳里那一支同一份判据）：
// 顶层那一格是条件**那一整条语句**，不是一个 `while` 词跟着括号 ⇒ 不能再按「词 + 括号」取。
const condHolder = Get(units, endIndex);
const condShell = condHolder instanceof Statement ? condHolder : null;
const condUnits = condShell === null ? units : condShell.Data;
const condAt = condShell === null ? endIndex : 0;
const condUnit = Get(condUnits, condAt);
const condIsWhile = condUnit !== null && condUnit.constructor.name === "While";
if (condShell !== null || condIsWhile) {
  const compare = result.CreateCompare();
  let compareSource: Token | null = null;
  if (condUnit !== null && condIsWhile) {
    compareSource = condUnit.Data.find((x) => x.constructor.name === "WhileCompare") ?? null;
  } else {
    compareSource = GetSkipNextWrapSymbol(condUnits, condAt);
  }
  if (compareSource !== null) {
    compare.SignIn(compareSource.SourceRange.Start!);
    compare.SignOut(compareSource.SourceRange.End!);
    compareSource.MoveDataTo(compare);
    compare.TryToClose();
  }
  // 壳的右端就是那个 `;`（`Statement.FormFrom` 把终结符切进了区间、不进 `Data`）；
  // 顶层是 `While` 单元时它自己的右端就是终点。
  const shellEnd = condShell === null ? null : condShell.SourceRange.End;
  const unitEnd = condUnit === null ? null : condUnit.SourceRange.End;
  const tail = shellEnd === null ? unitEnd : shellEnd;
  result.SignOut(tail!);
  result.TryToClose();
  ReplaceCountAt(units, index, endIndex - index + 1, result);
  return index;
}
endIndex = SkipNextWrapSymbol(units, endIndex);
const conditionBracket = Get(units, endIndex) as Bracket;
const compare = result.CreateCompare();
compare.SignIn(conditionBracket.SourceRange.Start!);
compare.SignOut(conditionBracket.SourceRange.End!);
conditionBracket.MoveDataTo(compare);
compare.TryToClose();
const semicolon = Get(units, endIndex + 1);
if (semicolon instanceof SymbolToken && semicolon.Is(";")) {
  endIndex = endIndex + 1;
  result.SignOut(semicolon.SourceRange.End!);
} else {
  // **尾分号可能根本不在列表里**（第 569 轮）：`;` 是语句终结符 ——
  // `Statement.FormFrom` 把它**切进壳体的区间**（`children.slice(0, length - 1)`）却不放进 `Data`
  // ⇒ 上面那一问永远拿不到它 ⇒ `DoWhile` 的右端比 TS 少一格
  //（实测 `do { f() } while (x < 10);`：产物 `DoStatement [49,76)` vs TS `[49,77)` ——
  //  单看就是「漂移 1 + 多出 1」）。
  //
  // **判据落在原文上，不再问宿主的右端**（第 859 轮）：早先那一版是
  //「宿主是 `Statement` 且右端比最后一格更远 ⇒ 取宿主右端」——`ownerEnd` 是**整条语句壳**的右端，
  // 壳体里可以装着**下一条语句**（`do {} while (a) b()` 里那个 `b()` 就在同一个壳里）
  // ⇒ 照取会把 `DoWhile` 一路撑到 `b()` 的末尾（实测 `stmt-do-while-then-statement`：
  // 产物 `DoStatement [123,143)` vs TS `[123,138)` —— 多出来的正是 `b()`）。
  // 这里改成问**原文**：条件括号之后跳过空白与注释，下一个字符是不是 `;` ——
  // 是就是自己的终结符（TS 的 `parseDoStatement` 收尾调 `parseSemicolon()`），
  // 不是就是 ASI 断在括号上（`do {} while (a)` 后面接语句的排法）。
  // **末尾那个 `;` 自己占一格时上面那一问已经吃过了**，这一支只管它不在列表里的那一档。
  //
  // **上一版那一问的坐标两处都差一格**（第 860 轮实测）：`SourceRange.End` 是**含尾**的位置
  // ——`(x < 10)` 那一格括号的 `End.Index` 就是 `)` 自己（实测 `tail=24`、`GetValue(24)==")"`），
  // 不是它后面那一格。所以「从 `tail.Index` 起扫」第一步看到的是 `)` 而不是空格，
  // 循环当场 `break`、`=== ";"` 那一问永远为假 ⇒ 这一整段是**死代码**，右端照旧停在 `)` 上
  //（实测 `do { f() } while (x < 10);`：产物 `[0,25)` vs TS `[0,26)`，全语料 9 处 `DoStatement` 漂移）。
  // 同理 `At(at + 1)` 也越了一格：`;` 在 `at` 上时，**要签出的就是这个位置本身**（含尾口径），
  // 不是它后面那一格。两处各改一格，扫描从括号后那一格起、签在 `;` 上。
  //
  // **与它成对的那半在第 866 轮收掉了**：`DoWhile` 与后面那条语句原来挤在同一个语句壳里
  // （`Statement.FormTail` 收的），投影于是多套一层 `ExpressionStatement`。
  // 修法不在本文件，在 `statement.xl.md`：**把 `DoWhile` 补进 `Statement.IsStatementUnit`**
  // （用类名判定，本文件与 `statement.xl.md` 之间不能互相 import）——
  // `Statement.SplitShell` 的入口与标签那一支都问那张表，认了它，壳当场拆成两条语句。
  // **第 859 轮试过一次、退回来的那一版**多改了一处（`SplitShell` 里尾巴那条壳的右端
  // 改成一律取尾巴自己的最后一格）：那一处会打断 `stmt-declaration-body-trailing-semicolon`
  // 的 `EmptyStatement`（缺 1），**不需要**——尾巴的右端照旧借壳那一格（`;` 不在 `Data` 里）。
  // `tmp/r866/do-while.mjs` 那一族 20 条探针全绿（`dw-then-*` / 标签 / 函数体 / 注释 / 嵌套），
  // `cases:tsast` 全语料缺 0 漂 0 多 0、已知缺口 3 → 2。
  let signOut = compare.SourceRange.End!;
  const tail = conditionBracket.SourceRange.End!;
  const tailDoc = tail.Document;
  let at = tail.Index + 1;
  for (;;) {
    while (at < tailDoc.GetCount() && (tailDoc.GetValue(at) === " " || tailDoc.GetValue(at) === "\t" || tailDoc.GetValue(at) === "\r" || tailDoc.GetValue(at) === "\n")) {
      at = at + 1;
    }
    if (at + 1 < tailDoc.GetCount() && tailDoc.GetValue(at) === "/" && (tailDoc.GetValue(at + 1) === "/" || tailDoc.GetValue(at + 1) === "*")) {
      if (tailDoc.GetValue(at + 1) === "/") {
        while (at < tailDoc.GetCount() && tailDoc.GetValue(at) !== "\n") {
          at = at + 1;
        }
      } else {
        at = at + 2;
        while (at + 1 < tailDoc.GetCount() && !(tailDoc.GetValue(at) === "*" && tailDoc.GetValue(at + 1) === "/")) {
          at = at + 1;
        }
        at = at + 2;
      }
      continue;
    }
    break;
  }
  if (at < tailDoc.GetCount() && tailDoc.GetValue(at) === ";") {
    signOut = tailDoc.At(at);
  }
  result.SignOut(signOut);
}
result.TryToClose();
ReplaceCountAt(units, index, endIndex - index + 1, result);
return index;
```

# class DoWhile extends IndependentToken

`do … while` 语句单元。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<DoWhile>` 里依次是 Body、Compare 两段的 XML。

## method SegmentNames:()=>Map<string, Map<string, string>>

**本单元的段，投成目标语言形状时叫什么**：产物那边的分段名 → 目标语言的字段名。

段名是**本单元自己的事实**（见 `Token.SegmentNames`）：这些段是这一个 token 切开来的，叫 `compare` / `body` 的名字只有在这一页才成立——所以它住在这一页，而不是投影层那张按 kind 分几十档的中央表里。**投影只读这一格**：`structuralProps` 拿它给字段名，查不到才落到那张还没搬完的表。

**形态与基类一致**（`## method` 而不是 `## property`）：基类那一格是 `## method` + 空表，写成属性会在派生类里报「类型不兼容」——两者只能同一形态。

```ts
return new Map([["DoStatement", new Map([["compare", "condition"], ["body", "statement"]])]]);
```

## field BodyBrace:TokenField<number> = new TokenField<number>(-1)

**体那一对花括号的整段区间**（值取 `{` 的下标）；体不是花括号块时**没记过**（`IsSet` 为假）。

与 `While.BodyBrace` / `For.BodyBrace` **同一个来由、同一份形状**：
`do {} while (c)` 的空块在 `ToList` 时**整个摊掉**了，
而 TS 那边 `DoStatement.statement` 仍有一个空 `Block`。
**两端都在手上**（第 641 轮换成了 `TokenField`）⇒ 投影不必回原文配对。

## field EmptyBodyAt:int = -1

**体是那条空语句（`do ; while (c);`）时，那个 `;` 的下标**；不是这一档就是 `-1`（第 635 轮）。

与 `While.EmptyBodyAt` / `For.EmptyBodyAt` 同一个来由：`;` 被 `Statement.FormFrom`
切进了**壳的区间**、不进 `Data` ⇒ 这一格只有在收尾规则里才拿得到
（就是壳的右端，见 `Process` 那一支）。

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 992 轮）：与上面的 `PrintDirectAst` 出**同一个答案**，
但只许用这个 token 自己的属性、子单元与 `Parent`（不回原文查）——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintDirectAst`。

```ts
  const props: any = {};
  const body = ctx.KidsOf(v, "body").filter((k: any) => !ctx.Invisible.has(k.Tag()));
  // **体那一对花括号直读字段**（第 619 轮那一格，第 641 轮带上整段，与 `While` 同一条）：
  // 两端都是**挂体那一刻**的事实 ⇒ 空块与带块的体都由 `BodyBlockOf` 直接给出
  //（`do {} while (c);` 的右端取**配对的花括号**，不是本单元的终点——那后面还有
  //  `while (c);`，见 `DoWhileCloseRule.Process` 签在体段上的区间）。
  // **空语句体那一格也直读字段**（第 635 轮，与 `While.PrintDirectAst` 同一条）：
  // `do ; while (c);` 的体是 `EmptyStatement`。
  const rawEmpty = v.attrs !== undefined && typeof v.attrs.get === "function"
    ? v.emptyBodyAt
    : undefined;
  const emptyAt = typeof rawEmpty === "number" ? rawEmpty : -1;
  if (emptyAt >= 0) {
    props.statement = { kind: "EmptyStatement", pos: emptyAt, end: emptyAt + 1 };
  } else {
    const statement = ctx.BodyBlockOf(v.start + "do".length, body, v.bodyBraceRange);
    if (statement !== undefined) props.statement = statement;
  }
  const compare = ctx.KidsOf(v, "compare").filter((k: any) => !ctx.Invisible.has(k.Tag()));
  if (compare.length > 0) props.expression = ctx.Expression(compare);
  return ctx.NodeHead("DoStatement", props, v);
```


## constructor:(template:Template)=>void

转调基类构造器，没有自己的字段要初始化。

```ts
super(template);
```

## method CreateBody:()=>WhileBody

新建 Body 段并挂到自己名下，返回新单元。

```ts
return this.Add(new WhileBody(this.Template));
```

## property Body:WhileBody

Body 段（`do` 后面那条语句）。

### get

```ts
return this.Data.find((x) => x instanceof WhileBody) as WhileBody;
```

## method CreateCompare:()=>WhileCompare

新建 Compare 段并挂到自己名下，返回新单元。

```ts
return this.Add(new WhileCompare(this.Template));
```

## property Compare:WhileCompare

Compare 段（`while` 后面那个条件括号整段）。

### get

```ts
return this.Data.find((x) => x instanceof WhileCompare) as WhileCompare;
```

## property body:Array<any>

`ToDictionary` 的 `body` 键**由这一页自己承担**（第 1018 轮）：值取那一批子单元的节点数据。

### get

```ts
return this.Body.ToList();
```

## property compare:Array<any>

`ToDictionary` 的 `compare` 键**由这一页自己承担**（第 1018 轮）：值取那一批子单元的节点数据。

### get

```ts
return this.Compare.ToList();
```

## property bodyBraceAt:any

`ToDictionary` 的 `bodyBraceAt` 键**由这一页自己承担**（第 1018 轮）：值取这一页自己那一格事实。

### get

```ts
return this.BodyBrace.File();
```

## property emptyBodyAt:any

`ToDictionary` 的 `emptyBodyAt` 键**由这一页自己承担**（第 1018 轮）：值取这一页自己那一格事实。

### get

```ts
return this.EmptyBodyAt;
```

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + `body` / `compare` 两个**具名分段**。

`DoWhile` 在 XML 里不写属性（`<DoWhile>` 只有子单元的串接），两段的先后与源顺序一致：
`body` 是 `do` 后面那条语句，`compare` 是 `while` 后面那个条件括号整段——与 `While` 的段序相反，
写键的顺序也照着源顺序来，读的人不必再回头去数。

两段的值取 `ToList()`：段是**一批子单元**的容器（`ToList()` 才是给「一批」准备的口子），
摊成扁平的 `children` 会把体与条件的边界抹掉。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.Tag());
result.set("body", this.body);
result.set("compare", this.compare);
// **体那个 `{` 的位置也写出去**（第 619 轮，与 `While.ToDictionary` 同一条）：
// 投影空 `Block` 时直读，不再回原文重扫。
if (this.BodyBrace.IsSet) {
  result.set("bodyBraceAt", this.bodyBraceAt);
  const braceRange = this.BodyBrace.Range;
  if (braceRange !== null && braceRange.Start !== null && braceRange.End !== null) {
    result.set("bodyBraceRange", String(braceRange.Start.Index) + "," + String(braceRange.End.Index));
  }
}
// **空语句体那一格也写出去**（第 635 轮，与 `While.ToDictionary` 同一条）。
result.set("emptyBodyAt", this.emptyBodyAt);
return result;
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 克隆全部子单元 → `TryToClose()`。

```ts
const result = new DoWhile(this.Template);
result.Sign(this);
result.BodyBrace = this.BodyBrace;
result.EmptyBodyAt = this.EmptyBodyAt;
result.AddRange(this.Data.map((x) => x.Clone()));
result.TryToClose();
return result;
```
