# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
import { ImportEqualsDeclarationShape } from "../declarations/import-equals-declaration-shape.xl.md"
import { ImportDeclarationShape } from "../declarations/import-declaration-shape.xl.md"
import { FunctionDeclarationShape } from "../declarations/function-declaration-shape.xl.md"
import { ClassDeclarationShape } from "../declarations/class-declaration-shape.xl.md"
import { StatementBuilder } from "../statements/statement-builder.xl.md"
import { ExportKeywordShape } from "../keywords/export-keyword-shape.xl.md"
import { DefaultKeywordShape } from "../keywords/default-keyword-shape.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
import { ExportAssignmentShape } from "../declarations/export-assignment-shape.xl.md"
import { ExportDeclarationShape } from "../declarations/export-declaration-shape.xl.md"
import { InterfaceDeclarationShape } from "../declarations/interface-declaration-shape.xl.md"
import { TypeAliasDeclarationShape } from "../declarations/type-alias-declaration-shape.xl.md"
import { ModuleDeclarationShape } from "../declarations/module-declaration-shape.xl.md"
import { NamespaceExportDeclarationShape } from "../declarations/namespace-export-declaration-shape.xl.md"
import { EnumDeclarationShape } from "../declarations/enum-declaration-shape.xl.md"
import { ExpressionStatementPossibleShape } from "../statements/expression-statement-possible-shape.xl.md"
import { StatementBoundaryUtil } from "../statements/statement-boundary-util.xl.md"
import { StatementScanner } from "../statements/statement-scanner.xl.md"
import { ExpressionStatementShape } from "../statements/expression-statement-shape.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { TypeBuilder } from "../types/type-builder.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
```

# namespace cangjie

# class SourceFileEndPossibleShape extends PossibleShape

```txt
a
++b;
^ 换行这里上一条就到齐了
```

根单元的终结候选：认两种「这条语句到这里该结束了」。

- **EOF 哨兵**：`EndOfFileTokenShape` 关闭触发的那一次重算里 `Accept`；
- **ASI 边界**：换行之后到来的代码单元接不上前一条表达式时 `Accept`（判据由
  `ExpressionStatementPossibleShape.IsAsiBoundary` 给出，与普通候选**读同一个函数**）。

两种情况下普通候选（import / export / expression statement）都已在同一处 `Reject`，
所以 `Candidates == 0`，按 `CatalogGuide` 的契约由本候选结束这一条语句。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const current = units[tokenIndex];
if (current instanceof EndOfFileTokenShape) {
  return ShapeStates.Accept;
}
// `;` 由语句候选自己吃（语句的 `Done` 那一条路），终结候选在 `;` 格必须让位，
// 否则 CatalogGuide 抛「终结候选与其它候选同时成立」：IsAsiBoundary 对 `;` 本来就返回 false。
if (StatementBoundaryUtil.CanEndStatement(units, tokenIndex, false)
  && !StatementBoundaryUtil.IsSemicolon(units[tokenIndex])) {
  // 前导装饰器属于**下一条声明**，不是换行处结束的表达式语句：`@dec\nclass C {}`。
  // 类候选还在吃这串装饰器时，终结候选不许 Accept，否则 CatalogGuide 会报「终结候选与其它候选同时成立」。
  if (SourceFileEndPossibleShape.HasDecoratorPrefix(units, tokenIndex)) {
    return ShapeStates.Uncertain;
  }
  // 被标语句（`lab: a` ⏎ `c;`）不是表达式语句：`lab: a` 只能由 StatementPossibleShape
  // 按 LabeledStatement 建。ASI 判据把它当成「`a` 处结束的表达式语句」，于是终结候选 Accept
  // 时普通候选还活着 → CatalogGuide 抛「终结候选与其它候选同时成立」。这里让位给语句候选。
  if (SourceFileEndPossibleShape.HasLabelPrefix(units, tokenIndex)) {
    return ShapeStates.Uncertain;
  }
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## static method HasLabelPrefix:(units:Array<Token>, tokenIndex:int)=>bool

本条语句（`tokenIndex` 之前那一段）是不是**带标签的语句头** `标识符 :`。
是的话 `tokenIndex` 处不是「一条表达式语句在换行处结束」，而是被标语句的体刚结束时——
`lab: a` ⏎ `c;` 里 TS 侧是 `LabeledStatement(lab, ExpressionStatement(a))`，这条语句只能由
`StatementPossibleShape` 建，终结候选不许抢。

做法：先按 `IsAsiBoundary` 的口径回到本条语句的头（越过本条的 basic token、跳过前导 trivia），
再看头后面的第一个代码单元是不是 `:`。`a ? b : c` 的头是 `a`、后面是 `?`，所以不会误判。

```ts
const start = ItemUtil.ItemStart(units);
let prev = tokenIndex - 1;
while (prev >= start && units[prev].IsTriviaToken) {
  prev--;
}
if (prev < start) {
  return false;
}
let head = prev;
while (head > start && units[head - 1].IsBasicToken) {
  head--;
}
while (head < prev && units[head].IsTriviaToken) {
  head++;
}
if (!(units[head] instanceof Common)) {
  return false;
}
let afterHead = head + 1;
while (afterHead < units.length && units[afterHead].IsTriviaToken) {
  afterHead++;
}
return afterHead < units.length
  && units[afterHead] instanceof Symbol
  && (units[afterHead] as Symbol).Is(":");
```

## static method HasDecoratorPrefix:(units:Array<Token>, tokenIndex:int)=>bool

自 `tokenIndex` 往前看：这段开头的代码单元是否属于**装饰器前缀**（`@dec` / `@dec()` / `@a @b` / `@a.b`）。
是的话 `tokenIndex` 处不是一条表达式语句的结尾，而是带装饰器声明的内部——终结候选不许把它当 ASI 边界。

做法：从 `tokenIndex` 前一个代码单元起往回走，把「`.` / Common / `(…)` 括号单元」当成装饰器表达式的一部分，
碰到 `@` 就成立；碰到别的（`;` / `}` / 二元运算符等）就说明不是装饰器前缀。

```ts
const start = ItemUtil.ItemStart(units);
let at = tokenIndex - 1;
while (at >= start && units[at].IsTriviaToken) {
  at--;
}
for (let index = at; index >= start; index--) {
  const unit = units[index];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is("@")) {
    return true;
  }
  if (unit instanceof Common) {
    continue;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is(".")) {
    continue;
  }
  if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "(") {
    continue;
  }
  return false;
}
return false;
```

## static method LeadingDeclarationKeyword:(code:Array<Token>)=>int

EOF 尾随段的**声明关键字下标**：从段首跳过修饰词（`export` / `default` / `declare` / `abstract` /
`async` / `const`），返回第一个非修饰词单元的下标；它不是 `Common`（说明不是声明头）时返回 `-1`。
`abstract class` / `declare abstract class` / `async function` / `declare async function` 都是
「修饰词 + 声明词」：段首的表层文字不是声明词，但整段**就是**那条声明，交给对应的 `FromUnits`
（它们自己消费修饰词）即可。只用于 EOF 兜底，不参与普通候选判定。

```ts
let at = 0;
while (at < code.length && code[at] instanceof Common) {
  const text = (code[at] as Common).TempToString();
  if (text === "export" || text === "default" || text === "declare"
    || text === "abstract" || text === "async" || text === "const") {
    at++;
    continue;
  }
  break;
}
if (at >= code.length || !(code[at] instanceof Common)) {
  return -1;
}
return at;
```

## static method BodyDeclarationKeyword:(code:Array<Token>, from:int)=>int

`export default <声明>`：从 `from` 起跳过修饰词（`declare` / `abstract` / `async` / `const`），
返回第一个声明词（`class` / `function` / `interface` / `enum`）的下标；不是声明形时返回 `-1`。
TS 的 `export default class C {}` / `export default function f() {}` 是**声明自身**带
`ExportKeyword` + `DefaultKeyword` 修饰词（不是 `ExportAssignment`），所以这里必须先把
「default 后面是不是声明」判出来，再决定走哪条建树路。

```ts
let at = from;
while (at < code.length && code[at] instanceof Common) {
  const text = (code[at] as Common).TempToString();
  if (text === "class" || text === "function" || text === "interface" || text === "enum") {
    return at;
  }
  if (text === "declare" || text === "abstract" || text === "async" || text === "const") {
    at++;
    continue;
  }
  return -1;
}
return -1;
```

## static method IsStandaloneTrailingStatement:(unit:Token)=>bool

`unit` **单独一个代码单元**就能构成一条完整的根语句吗？只认两族：

- 裸块 `{…}`（`Bracket`，`StartBracketChar` 是 `{`）：一条 BlockStatement，不是对象字面量；
- `return` / `debugger` / `break` / `continue`：TS 的 ASI 让它们在这一格就收口，无分号、无操作数
  （`type T = A` ⏎ `return` / `debugger` 各是一条语句）。

`;` / `throw` / 变量声明 / 控制语句都不在这里：`throw` 缺操作数在 TS 里是语法错误，其余要么需要
更多单元、要么由 `BuildTrailingDeclaration` 的其它分支建。

```ts
if (unit instanceof Bracket) {
  return (unit as Bracket).StartBracketChar === "{";
}
if (!(unit instanceof Common)) {
  return false;
}
const text = (unit as Common).TempToString();
return text === "return" || text === "debugger" || text === "break" || text === "continue";
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

两条路各走各的：

- **ASI**：只把「换行处结束的那一条」按边界收尾建出来（不要求 `;`），根继续吃后面的单元；
- **EOF**：建最后一条等不到 `;` 的语句（声明 / 变量 / 控制语句 / 裸块 / 无分号简单语句——最后一段
  只剩一个代码单元时走 `IsStandaloneTrailingStatement`），签出根（`SyntaxContext.Process` 在最后一个真实位置已经签过一次，
  这里只在没签时补），关闭根。

```ts
const unit = host as UnitToken;
if (!(host.Data[tokenIndex] instanceof EndOfFileTokenShape)) {
  // ASI：当前代码单元接不上上一条表达式，上一条在换行处就结束了。
  let end = tokenIndex - 1;
  while (end >= 0 && host.Data[end].IsTriviaToken) {
    end--;
  }
  const asiStart = ItemUtil.ItemStart(host.Data);
  // 边界格（下一条语句的第一个代码单元）要在 splice 之前抓住：splice 之后它的下标会整体左移。
  const boundaryUnit = tokenIndex >= 0 && tokenIndex < host.Data.length ? host.Data[tokenIndex] : null;
  if (end >= asiStart && host.Data[end].IsBasicToken) {
    const built = ExpressionStatementShape.FromUnits(host, asiStart, end, context, false);
    host.Data.splice(asiStart, end - asiStart + 1, built);
    built.Parent = host;
    // 边界格若是裸块 `{}`：它就是下一条语句（BlockStatement），这里当场建掉。
    // 否则它会以 basic token 的形态留到 EOF，和 StatementPossibleShape 在 EOF 格的 Accept 撞共存。
    if (boundaryUnit instanceof Bracket && (boundaryUnit as Bracket).StartBracketChar === "{") {
      let blockPos = 0;
      const blockEnd = end >= 0 ? host.Data[asiStart].SourceRange.EndIndex : -1;
      if (blockEnd >= 0) {
        blockPos = blockEnd;
      }
      const blockBuilder = new StatementBuilder(host.Template, context);
      blockBuilder.Load([boundaryUnit], blockPos);
      const blockStatement = blockBuilder.BuildStatement();
      const boundaryAt = host.Data.indexOf(boundaryUnit);
      if (boundaryAt >= 0) {
        host.Data.splice(boundaryAt, 1, blockStatement);
        blockStatement.Parent = host;
      }
    }
  }
  return host;
}
let at = tokenIndex;
while (at >= 0 && (host.Data[at].IsTriviaToken || host.Data[at] instanceof EndOfFileTokenShape)) {
  at--;
}
const start = ItemUtil.ItemStart(host.Data);
if (at >= start && host.Data[at].IsBasicToken) {
  let firstCode = start;
  while (firstCode <= at && host.Data[firstCode].IsTriviaToken) {
    firstCode++;
  }
  // 最后一段只剩一个代码单元、而它自己就构成一条完整语句：裸块 `{}`（`a.class` ⏎ `{}`）是
  // **BlockStatement** 不是对象字面量；`return` / `debugger` / `break` / `continue` 无分号到 EOF
  // 也各是一条语句（上一条语句在 ASI 边界收口时把这个边界 token 原样留下：`type T = A` ⏎ `return`）。
  // 统一交给 StatementBuilder 按正常语句路径建——走 ExpressionStatement 的话块会被投成对象字面量、
  // 关键字会报「表达式语句没有读完」。
  if (firstCode === at && SourceFileEndPossibleShape.IsStandaloneTrailingStatement(host.Data[at])) {
    let trailingPos = 0;
    for (let index = start - 1; index >= 0; index--) {
      if (!host.Data[index].IsTriviaToken) {
        const previousEnd = host.Data[index].SourceRange.EndIndex;
        if (previousEnd >= 0) {
          trailingPos = previousEnd;
        }
        break;
      }
    }
    const trailingBuilder = new StatementBuilder(host.Template, context);
    trailingBuilder.Load(host.Data.slice(start, at + 1), trailingPos);
    const trailingStatement = trailingBuilder.BuildStatement();
    host.Data.splice(start, at - start + 1, trailingStatement);
    trailingStatement.Parent = host;
  } else if (!SourceFileEndPossibleShape.BuildTrailingDeclaration(host, start, at, context)) {
    // 孤立的 `declare;` / `abstract;`：尾部 `;` 不进表达式（ExpressionBuilder 不认 `;`），
    // 但**进语句区间**（TS 的 ExpressionStatement End 含 `;`）：先按无分号建表达式，再把 End 签出到 `;`。
    const tailIsSemicolon = host.Data[at] instanceof Symbol && (host.Data[at] as Symbol).Is(";");
    const built = tailIsSemicolon && at > start
      ? ExpressionStatementShape.FromUnits(host, start, at - 1, context, false)
      : ExpressionStatementShape.FromUnits(host, start, at, context, false);
    if (tailIsSemicolon && at > start) {
      const semiEnd = host.Data[at].SourceRange.EndIndex;
      if (semiEnd >= 0) {
        built.SignOut(semiEnd);
      }
    }
    host.Data.splice(start, at - start + 1, built);
    built.Parent = host;
  }
}
let tail = host.Data.length - 1;
while (tail >= 0 && (host.Data[tail].IsTriviaToken || host.Data[tail] instanceof EndOfFileTokenShape)) {
  tail--;
}
if (tail >= 0 && unit.SourceRange.EndIndex < 0) {
  const end = host.Data[tail].SourceRange.EndIndex;
  if (end >= 0) {
    unit.SignOut(end);
  }
}
unit.TryToClose(context);
return host;
```

## private static method BuildStatementSegments:(host:Token, start:int, at:int, context:SyntaxContext)=>bool

把 `host.Data[start..at]` 里的 leftover 单元按「一条语句一段」逐段建 shape：每段交给 StatementBuilder，
**段的消费量按语句右边界 `SourceRange.EndIndex`（半开终点）数 Data 槽位**（不用 `builder.At`——它不是可靠的消费量，
上一轮用它 splice 造成 114 个文件 ok→diff），再按段长 splice；整段都建完返 true。

```ts
let cursor = start;
let limit = at;
let built = 0;
while (cursor <= limit) {
  let hasBasic = false;
  for (let index = cursor; index <= limit; index++) {
    if (host.Data[index].IsBasicToken && !host.Data[index].IsTriviaToken) {
      hasBasic = true;
      break;
    }
  }
  if (!hasBasic) {
    break;
  }
  let basePos = 0;
  for (let index = cursor - 1; index >= 0; index--) {
    if (!host.Data[index].IsTriviaToken) {
      const previousEnd = host.Data[index].SourceRange.EndIndex;
      if (previousEnd >= 0) {
        basePos = previousEnd;
      }
      break;
    }
  }
  const builder = new StatementBuilder(host.Template, context);
  builder.Load(host.Data.slice(cursor, limit + 1), basePos);
  let statement:Token | null = null;
  try {
    statement = builder.BuildStatement();
  } catch (error) {
    statement = null;
  }
  if (statement === null) {
    break;
  }
  const endIndex = statement.SourceRange.EndIndex;
  let consumed = 0;
  if (endIndex < 0) {
    consumed = limit - cursor + 1;
  } else {
    while (cursor + consumed <= limit) {
      const unitStart = host.Data[cursor + consumed].SourceRange.Start;
      if (unitStart >= 0 && unitStart >= endIndex) {
        break;
      }
      consumed++;
    }
  }
  if (consumed <= 0) {
    break;
  }
  host.Data.splice(cursor, consumed, statement);
  statement.Parent = host;
  built++;
  limit -= consumed - 1;
  cursor++;
  while (cursor <= limit && (host.Data[cursor].IsTriviaToken || !host.Data[cursor].IsBasicToken)) {
    cursor++;
  }
}
return built > 0;
```

## private static method IsInsideExportModifierChain:(code:Array<Token>, index:int)=>bool

`code[index]` 这一格是不是一条**从 `export` 起、还没走完的修饰词链**的内部。TS 的 `parseModifiers`
对 `export` / `default` / `as` / `import` 不看换行，所以这几格都还在**同一条**声明的声明头里，
换行不构成多语句分界：`export` ⏎ `default` ⏎ `function f(): void` / `export as` ⏎ `namespace A` /
`export` ⏎ `import` ⏎ `x = A.B`。只回溯这四种修饰词是刻意的——`declare` / `abstract` / `async`
与下一格之间换行时 TS 侧是另一条语句（`export default async` ⏎ `function f(): void` =
ExportAssignment + FunctionDeclaration；`declare` ⏎ `class C {}` 同理），不能一起吞掉。

```ts
let at = index - 1;
while (at >= 0 && code[at] instanceof Common) {
  const text = (code[at] as Common).TempToString();
  if (text === "export") {
    return true;
  }
  if (text !== "default" && text !== "as" && text !== "import") {
    return false;
  }
  at--;
}
return false;
```

## private static method BuildTrailingDeclaration:(host:Token, start:int, at:int, context:SyntaxContext)=>bool

EOF 边界补一条「必须分号、但 ASI 允许省略分号」的声明：`type T = A` 与 `import x = require("m")`
（两者在 TS 里都能不带 `;` 收在文件末尾）。它们的 `FromUnits` 都要求 `tokenIndex` 落在 `;` 上，
所以这里在最后一个真实代码单元后面补一个**零宽合成 `Symbol ";"`**（`SignIn` / `SignOut` 用同一个
半开终点 `EndIndex`——`AppendValueAndSignOut` 传 `EndIndex - 1` 签出到 `EndIndex`，它正好是声明的右边界），再按正常入口建。

只认四族：`type` 开头、`import <名字> = …`（`code[2]` 是 `=`）、函数声明（`declare function …` /
重载签名 `function …`，无体时最后一块是 `;`；有体时最后一块是 `{`）、以及紧邻的 `class … {}`。
其余返回 `false`，由调用方退回 `ExpressionStatementShape`。返回值 = 有没有建出来。

**多条无分号声明连排**：在 EOF 落下来的 leftovers 可能含多条（`declare function f(): void\ndeclare function g(): void`）。
这里先找**最后一个换行处开始的声明**，把前面那段递归建掉（建不出来就按 `ExpressionStatement(…, false)` 收尾），
再递归建最后一段——于是每条声明各得一个节点，和 TS 的 ASI 结果一致。

```ts
const code:Array<Token> = [];
const codeAt:Array<number> = [];
for (let index = start; index <= at; index++) {
  if (!host.Data[index].IsTriviaToken) {
    code.push(host.Data[index]);
    codeAt.push(index);
  }
}
if (code.length < 2) {
  return false;
}
// 孤立修饰词语句：`declare;` / `abstract;`。它们各自是一条 ExpressionStatement（TS 的
// Identifier 就是关键字本身）。先就地建掉，后面的单元留给下一次 EOF 收口，否则多语句段
// 会落进同一个 ExpressionStatement 兜底而抛「表达式语句没有读完」。
if (code[0] instanceof Common) {
  const standaloneText = (code[0] as Common).TempToString();
  if ((standaloneText === "declare" || standaloneText === "abstract")
    && code[1] instanceof Symbol && (code[1] as Symbol).Is(";")) {
    const standalone = ExpressionStatementShape.FromUnits(host, start, codeAt[1], context, true);
    host.Data.splice(start, codeAt[1] - start + 1, standalone);
    standalone.Parent = host;
    // 同一次调用里把剩余单元按段收口（否则它们会以 basic token 残留、污染 AST）。
    const standaloneLimit = at - (codeAt[1] - start);
    let standaloneNext = start + 1;
    while (standaloneNext <= standaloneLimit
      && (host.Data[standaloneNext].IsTriviaToken || !host.Data[standaloneNext].IsBasicToken)) {
      standaloneNext++;
    }
    if (standaloneNext <= standaloneLimit) {
      SourceFileEndPossibleShape.BuildStatementSegments(host, standaloneNext, standaloneLimit, context);
    }
    return true;
  }
}
// `do <body> while (…)` 是一条语句：leftover 的换行拆分不能把 body 与 while 切开，
// 整段交给 StatementBuilder（statements 文档 F 组）。
const firstCodeText = code[0] instanceof Common ? (code[0] as Common).TempToString() : "";
if (firstCodeText === "do") {
  let doPos = 0;
  for (let index = start - 1; index >= 0; index--) {
    if (!host.Data[index].IsTriviaToken) {
      const previousEnd = host.Data[index].SourceRange.EndIndex;
      if (previousEnd >= 0) {
        doPos = previousEnd;
      }
      break;
    }
  }
  const doBuilder = new StatementBuilder(host.Template, context);
  doBuilder.Load(host.Data.slice(start, at + 1), doPos);
  const doStatement = doBuilder.BuildStatement();
  host.Data.splice(start, at - start + 1, doStatement);
  doStatement.Parent = host;
  return true;
}
// 装饰器开头的变量语句（`@dec\nconst x = 1;`）：段首 `@` 不是 Common，下面按字面量的分支会漏掉；
// 多语句分界又会把 `@dec` 与 `const` 切开（前缀 `@dec` 单独不是一条语句，会落进表达式兜底报
// 「不支持的表达式起点」）。TS 的 VariableStatement children 是 Decorator(s) + VariableDeclarationList，
// 装饰器前缀允许跨行，所以这里先用 `StatementBuilder.ScanDecoratedHead` 认出声明词——**只接变量关键字**
// （class / interface / enum / function / namespace 等装饰器声明头仍走各自的既有分支与候选，
// 避免与装饰器声明头判据抢归属）。认出变量关键字后，`this.At` 仍停在第一个 `@`，整条交给
// `StatementBuilder.BuildStatement`（`BuildDecoratedStatement` → `BuildDecoratedVariableStatement`）。
if (code[0] instanceof Symbol && (code[0] as Symbol).Is("@")) {
  let decoratedPos = 0;
  for (let index = start - 1; index >= 0; index--) {
    if (!host.Data[index].IsTriviaToken) {
      const previousEnd = host.Data[index].SourceRange.EndIndex;
      if (previousEnd >= 0) {
        decoratedPos = previousEnd;
      }
      break;
    }
  }
  const decoratedBuilder = new StatementBuilder(host.Template, context);
  decoratedBuilder.Load(host.Data.slice(start, at + 1), decoratedPos);
  let decoratedKeyword = "";
  try {
    decoratedBuilder.ScanDecoratedHead();
    decoratedKeyword = decoratedBuilder.DecoratedKeyword;
    decoratedBuilder.DecoratedKeyword = "";
  } catch (error) {
    decoratedKeyword = "";
  }
  if (decoratedKeyword === "const" || decoratedKeyword === "let" || decoratedKeyword === "var") {
    let decoratedStatement:Token | null = null;
    try {
      decoratedStatement = decoratedBuilder.BuildStatement();
    } catch (error) {
      decoratedStatement = null;
    }
    if (decoratedStatement !== null) {
      const decoratedEndIndex = decoratedStatement.SourceRange.EndIndex;
      let consumed = 0;
      if (decoratedEndIndex < 0) {
        consumed = at - start + 1;
      } else {
        while (start + consumed <= at) {
          const unitStart = host.Data[start + consumed].SourceRange.Start;
          if (unitStart >= 0 && unitStart >= decoratedEndIndex) {
            break;
          }
          consumed++;
        }
      }
      if (consumed > 0) {
        host.Data.splice(start, consumed, decoratedStatement);
        decoratedStatement.Parent = host;
        // 后面还有语句（`@dec\nconst x = 1;` ⏎ `const y = 2;`）：剩余单元按段继续收口。
        const decoratedLimit = at - (consumed - 1);
        let decoratedNext = start + 1;
        while (decoratedNext <= decoratedLimit
          && (host.Data[decoratedNext].IsTriviaToken || !host.Data[decoratedNext].IsBasicToken)) {
          decoratedNext++;
        }
        if (decoratedNext <= decoratedLimit) {
          SourceFileEndPossibleShape.BuildStatementSegments(host, decoratedNext, decoratedLimit, context);
        }
        return true;
      }
    }
  }
}
// 多条声明连排：最后一条的起点 = 最后一个「换行之后出现的声明起点」。
let boundary = -1;
// 装饰器声明头：段首就是 `@` 时，整段是「装饰器前缀（可跨行、可多个）+ 修饰词 + 声明词」的
// **一个**声明头（`@dec\nclass C {}` / `@a\n@b\ninterface I {}`）。头内部的声明词虽然也在换行处，
// 但它不是新语句的起点——否则会把 `@dec` 与 `class` 切成两段，前缀 `@dec` 建不出来。
let decoratedHeadEnd = -1;
if (code[0] instanceof Symbol && (code[0] as Symbol).Is("@")) {
  decoratedHeadEnd = StatementScanner.DecoratedHeadKeyword(code, 0);
}
for (let index = 1; index < code.length; index++) {
  // 多语句的分界只在「还有下一条」时才成立：最后一格只能是本段自己的结尾。
  if (index >= code.length - 1) {
    continue;
  }
  let lineBreak = false;
  for (let gap = codeAt[index - 1] + 1; gap < codeAt[index]; gap++) {
    if (ExpressionStatementPossibleShape.HasLineBreak(host.Data[gap])) {
      lineBreak = true;
      break;
    }
  }
  if (!lineBreak) {
    continue;
  }
  if (index <= decoratedHeadEnd) {
    // 正在扫的这条装饰器声明头的内部（装饰器表达式 / 修饰词 / 声明词本身）：不是新语句的起点。
    continue;
  }
  const unit = code[index];
  // 修饰词跨行：`export` ⏎ `const x = 1` / `export` ⏎ `default` ⏎ `function f(): void` /
  // `export as` ⏎ `namespace A` 都是**同一条**声明的声明头（TS 的 parseModifiers 对
  // export / default / as / import 不看换行）。分界若落在链内部，前缀只剩半截声明头
  //（`export default` / `export as`）→ 表达式路径 crash。判据只看「从 export 起、还没走完的
  // 修饰词链」——`declare` / `abstract` / `async` 与下一格之间换行时 TS 侧是另一条语句，不能吞。
  if (SourceFileEndPossibleShape.IsInsideExportModifierChain(code, index)) {
    continue;
  }
  // 老判据：下一行以声明 / 语句关键字开头。声明头本身可以跨行（`interface I` ⏎ `extends B`），
  // 所以这里不看前一个代码单元是否完整——这类 leftovers 本来就只在不收口时才会走到。
  if (unit instanceof Symbol && (unit as Symbol).Is("@")) {
    // 换行后的 `@dec` 是**下一条声明**的装饰器前缀（`@dec class C {}`）：装饰器表达式可以任意长，
    // 这里只需要把边界放在 `@` 上，整段交给下面的装饰器分支建。同时把整个声明头
    //（@ / 装饰器 / 修饰词 / 声明词）记成一体：头内部的 `class` / `export` 不再改边界。
    boundary = index;
    const headAt = StatementScanner.DecoratedHeadKeyword(code, index);
    if (headAt >= 0) {
      decoratedHeadEnd = headAt;
    }
    continue;
  }
  if (unit instanceof Common) {
    const unitText = (unit as Common).TempToString();
    if (unitText === "declare" || unitText === "function" || unitText === "type" || unitText === "import"
      || unitText === "export" || unitText === "class" || unitText === "interface" || unitText === "enum"
      || unitText === "namespace" || unitText === "module" || unitText === "global" || unitText === "abstract"
      || unitText === "async" || unitText === "const" || unitText === "let" || unitText === "var"
      || unitText === "using") {
      // 分界还要过一关：**前一段能不能收住一条完整语句**。`let` ⏎ `let = 1` 在 TS 里是**一条**
      // VariableStatement（`let` 是上下文关键字，下一格能起绑定就按声明读，见
      // StatementScanner.ScanRoot）；前缀只有单独一个 `let` 时它收不住任何语句，换行不构成分界。
      const loneLetPrefix = index - 1 === 0
        && code[0] instanceof Common && (code[0] as Common).Is("let")
        && StatementScanner.StartsBinding(code, index);
      if (loneLetPrefix) {
        continue;
      }
      boundary = index;
      continue;
    }
  }
  // 新判据（G2a）：下一条语句以**标识符**开头（`const a = 1` ⏎ `console.log(a)`）。
  // 要求前一个代码单元能收住一条完整语句、当前单元又接不上它；声明体的 `{` 不算新语句。
  if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{") {
    continue;
  }
  // 声明头跨行续接的关键字（`interface I` ⏎ `extends B` / `class C` ⏎ `implements I`）与类型位续接词
  // 都不是新语句的起点。
  if (unit instanceof Common
    && ((unit as Common).Is("extends") || (unit as Common).Is("implements")
      || (unit as Common).Is("is") || (unit as Common).Is("asserts")
      || (unit as Common).Is("from") || (unit as Common).Is("as")
      || (unit as Common).Is("with") || (unit as Common).Is("assert")
      || (unit as Common).Is("defer") || (unit as Common).Is("in")
      || (unit as Common).Is("out") || (unit as Common).Is("keyof")
      || (unit as Common).Is("infer"))) {
    continue;
  }
  if (ExpressionStatementPossibleShape.IsExpressionTail(code[index - 1])
    && !ExpressionStatementPossibleShape.IsContinuation(unit)) {
    boundary = index;
  }
}
if (boundary > 0) {
  const prefixEnd = codeAt[boundary - 1];
  if (!SourceFileEndPossibleShape.BuildTrailingDeclaration(host, start, prefixEnd, context)) {
    const prefix = ExpressionStatementShape.FromUnits(host, start, prefixEnd, context, false);
    host.Data.splice(start, prefixEnd - start + 1, prefix);
    prefix.Parent = host;
  }
  // 前缀可能建出多条声明（它自己也会继续拆）：splice 进来的是非 basic 的形状 token，
  // 形状之间还可能夹 trivia，所以「后缀起点」必须跳过所有 trivia **和已建形状**，直到下一个 basic 单元。
  let cursor = start;
  while (cursor < host.Data.length
    && (host.Data[cursor].IsTriviaToken || !host.Data[cursor].IsBasicToken)) {
    cursor++;
  }
  // 后缀终点不能用「前缀消费了几个原单元」的算术：前缀若走无体签名/type/import 的路径，
  // BuildTrailingDeclaration 内部会先插一个零宽合成 `;` 再 splice（净删 C+1 个槽位、换回 1 条形状），
  // 原来 `at + inserted - (prefixEnd - start + 1)` 会偏一格，递归的第二个边界就落到合成形状上。
  // 后缀自己的单元（含其间 trivia）在 splice 后是连续平移的，所以用「后缀起点 + 相对长度」直接定位。
  const suffixAt = cursor + (at - codeAt[boundary]);
  // 后缀自己也可能建不出来：整条返回 false 会让调用方拿**已经 splice 过**的旧下标来兜底
  // （`已建前缀 + export 子句` 就是这样越界读到 undefined 的）。所以后缀先内部兜底成表达式语句。
  const suffixBuilt = SourceFileEndPossibleShape.BuildTrailingDeclaration(host, cursor, suffixAt, context);
  if (!suffixBuilt) {
    // 后缀常以 `;` 结尾：`declare module "m"` ⏎ `z;` 的后缀就是 `z ;`。
    // 这时要走 `requireSemicolon = true` 的入口（它会把 `;` 从表达式单元里切掉、End 停在 `;` 上）；
    // 传 false 会把 `;` 当表达式单元，`ExpressionBuilder` 报「表达式语句没有读完」。
    // 注意不能先按 false 建完再 `SignOut(endIndex)`——`FromUnits` 已经签过 End，再签会抛
    // `SourceRange.End has been setted`。
    let suffixLast = suffixAt;
    while (suffixLast > cursor && host.Data[suffixLast].IsTriviaToken) {
      suffixLast--;
    }
    const suffixTailIsSemicolon = suffixLast >= cursor
      && host.Data[suffixLast] instanceof Symbol
      && (host.Data[suffixLast] as Symbol).Is(";");
    const suffix = suffixTailIsSemicolon
      ? ExpressionStatementShape.FromUnits(host, cursor, suffixLast, context, true)
      : ExpressionStatementShape.FromUnits(host, cursor, suffixLast, context, false);
    host.Data.splice(cursor, suffixAt - cursor + 1, suffix);
    suffix.Parent = host;
  }
  return true;
}
// 装饰器开头的声明（`@dec class C {}` / `@a @b class C {}` / `@dec export class C {}` /
// `@dec interface I {}` / `@dec enum E { A }` / `@dec type T = number;` / `@dec namespace N {}` /
// `@dec function g() {}`）：段首是 `@`（不是 Common），下面的字面分支都会漏掉。
// 「装饰器前缀（可跨行、可多个）+ 修饰词 + 声明词」由
// `StatementScanner.DecoratedHeadKeyword` 一次认出——与 `function-declaration-possible-shape` 的
// ASI 判据、`statement-builder.ScanDecoratedHead` 同口径——再按**声明词**分派到对应的 `FromUnits`：
// 它们都从段首重新扫装饰器，把 Decorator 放进 children 最前，整段建出来就是 TS 的声明节点。
// 建不出来（装饰器后面不是声明头 / 段被切在声明头中间）按原路返回 false。
if (code[0] instanceof Symbol && (code[0] as Symbol).Is("@")) {
  const headAt = StatementScanner.DecoratedHeadKeyword(code, 0);
  if (headAt < 0) {
    return false;
  }
  const headText = (code[headAt] as Common).TempToString();
  try {
    let decorated:Token;
    if (headText === "interface") {
      decorated = InterfaceDeclarationShape.FromUnits(host, start, at, context);
    } else if (headText === "enum") {
      decorated = EnumDeclarationShape.FromUnits(host, start, at, context);
    } else if (headText === "type") {
      decorated = TypeAliasDeclarationShape.FromUnits(host, start, at, context);
    } else if (headText === "function") {
      decorated = FunctionDeclarationShape.FromUnits(host, start, at, context);
    } else if (headText === "namespace" || headText === "module" || headText === "global") {
      decorated = SourceFileEndPossibleShape.BuildModuleDeclaration(host, start, at, context);
    } else {
      // `class`（含 `@dec abstract class`：`abstract` 是修饰词，装饰器声明头认出的声明词是 class）。
      // ClassDeclarationShape.FromUnits 自己消费 export / default / declare / abstract 与装饰器。
      decorated = ClassDeclarationShape.FromUnits(host, start, at, context);
    }
    host.Data.splice(start, at - start + 1, decorated);
    decorated.Parent = host;
    return true;
  } catch (error) {
    return false;
  }
}
const head = code[0];
if (!(head instanceof Common)) {
  return false;
}
const text = (head as Common).TempToString();
const lastUnit = code[code.length - 1];
// 变量语句（`const/let/var/using` 开头，或 ambient 的 `declare const/let/var` 开头）：
// EOF 时 statement 候选按 stopAtEof 主动退让（避免与终结候选同时成立），由这里用
// StatementBuilder 按正常语句路径补建——declare 修饰与 DeclareKeyword 子节点都由它负责。
const isVariableKeyword = text === "let" || text === "const" || text === "var" || text === "using";
const isDeclareVariable = text === "declare"
  && code.length >= 2
  && code[1] instanceof Common
  && ((code[1] as Common).Is("let") || (code[1] as Common).Is("const")
    || (code[1] as Common).Is("var") || (code[1] as Common).Is("using"));
// 空声明语句 `const` / `var`（含 `const;` / `var;`）：TS 是带**空** VariableDeclarationList 的
// VariableStatement（`const` 是关键字，不可能当标识符表达式）。StatementBuilder 的正常路径只按
// 「有 declarator」建变量语句，所以这里单独走 BuildVariableStatement 的入口；
// `let` 不在此列（TS 里 `let` 单独成句是 ExpressionStatement，标识符）。
const isLoneEmptyVariable = isVariableKeyword
  && (text === "const" || text === "var")
  && (code.length === 1
    || (code.length === 2 && code[1] instanceof Symbol && (code[1] as Symbol).Is(";")));
if (isLoneEmptyVariable) {
  let emptyPos = 0;
  for (let index = start - 1; index >= 0; index--) {
    if (!host.Data[index].IsTriviaToken) {
      const previousEnd = host.Data[index].SourceRange.EndIndex;
      if (previousEnd >= 0) {
        emptyPos = previousEnd;
      }
      break;
    }
  }
  const emptyBuilder = new StatementBuilder(host.Template, context);
  emptyBuilder.Load(host.Data.slice(start, at + 1), emptyPos);
  const emptyStatement = emptyBuilder.BuildStatement();
  host.Data.splice(start, at - start + 1, emptyStatement);
  emptyStatement.Parent = host;
  return true;
}
if (isVariableKeyword || isDeclareVariable) {
  // 无分号 EOF 尾巴：可能连排多条语句（`const a = 1` ⏎ `console.log(a)`）——按段逐条建，
  // 每段按语句右边界算消费量，不能整段 splice（会吞掉后面的语句）。
  return SourceFileEndPossibleShape.BuildStatementSegments(host, start, at, context);
}
// 控制语句 / 简单语句无分号到 EOF（statements 文档 F 组：`do x++` ⏎ `while (c);`）：
// 这些形态没有专门的 FromUnits，交给 StatementBuilder 按正常语句路径建，别落进 ExpressionStatement。
const isSimpleStatement = text === "do" || text === "while" || text === "if" || text === "for"
  || text === "switch" || text === "try" || text === "throw" || text === "return"
  || text === "break" || text === "continue" || text === "debugger";
if (isSimpleStatement) {
  let statementPos = 0;
  for (let index = start - 1; index >= 0; index--) {
    if (!host.Data[index].IsTriviaToken) {
      const previousEnd = host.Data[index].SourceRange.EndIndex;
      if (previousEnd >= 0) {
        statementPos = previousEnd;
      }
      break;
    }
  }
  const statementBuilder = new StatementBuilder(host.Template, context);
  statementBuilder.Load(host.Data.slice(start, at + 1), statementPos);
  const simpleStatement = statementBuilder.BuildStatement();
  host.Data.splice(start, at - start + 1, simpleStatement);
  simpleStatement.Parent = host;
  return true;
}
// 紧邻的 class / interface 声明（体是闭合括号单元，tokenIndex 落在 `}` 上）；允许前置 declare。
// `export const x = 1` 鏃犲垎鍙峰埌 EOF锛氬厛渚?StatementBuilder 鎸夊彉閲忚鍙ュ缓锛屽啀鎶?ExportKeyword 鎻掑埌 Data 鏈€鍓嶃€?
const isExportConstEnum = text === "export"
  && code.length >= 3
  && code[1] instanceof Common && (code[1] as Common).Is("const")
  && code[2] instanceof Common && (code[2] as Common).Is("enum");
const isExportVariable = !isExportConstEnum && text === "export"
  && code.length >= 2
  && code[1] instanceof Common
  && ((code[1] as Common).Is("const") || (code[1] as Common).Is("let")
    || (code[1] as Common).Is("var") || (code[1] as Common).Is("using")
    || ((code[1] as Common).Is("declare") && code.length >= 3 && code[2] instanceof Common
      && ((code[2] as Common).Is("const") || (code[2] as Common).Is("let")
        || (code[2] as Common).Is("var") || (code[2] as Common).Is("using"))));
if (isExportVariable) {
  let basePos = 0;
  let pos = 0;
  for (let index = start - 1; index >= 0; index--) {
    if (!host.Data[index].IsTriviaToken) {
      const previousEnd = host.Data[index].SourceRange.EndIndex;
      if (previousEnd >= 0) {
        pos = previousEnd;
      }
      break;
    }
  }
  const exportEnd = code[0].SourceRange.EndIndex;
  basePos = exportEnd < 0 ? pos : exportEnd;
  const builder = new StatementBuilder(host.Template, context);
  builder.Load(host.Data.slice(codeAt[1], at + 1), basePos);
  // 空声明列表（`export let` / `export let;`）：TS 这里是带**空** VariableDeclarationList 的
  // VariableStatement。`let` 单独成句时是标识符表达式语句，所以 `BuildStatement` 会把它当表达式；
  // 但 `export` 之后的关键字永远是变量声明入口——这里直接走 `BuildVariableStatement`。
  let emptyList = true;
  for (let index = codeAt[1]; index <= at; index++) {
    if (host.Data[index].IsTriviaToken) {
      continue;
    }
    if (index === codeAt[1] || (host.Data[index] instanceof Symbol && (host.Data[index] as Symbol).Is(";"))) {
      continue;
    }
    emptyList = false;
    break;
  }
  const statement = emptyList ? builder.BuildVariableStatement() : builder.BuildStatement();
  const exportKeyword = ExportKeywordShape.FromBasicToken(code[0] as Common, context);
  (exportKeyword as ShapeToken).Pos = pos;
  statement.Data.unshift(exportKeyword);
  exportKeyword.Parent = statement;
  (statement as ShapeToken).Pos = pos;
  host.Data.splice(start, at - start + 1, statement);
  statement.Parent = host;
  return true;
}
// `export class C {…}` / `export interface I {…}` / `export [declare] namespace N {…}`
// 无分号到 EOF：体是闭合 `}` 括号；从 export 之后那一格建声明，再把 ExportKeyword 插回 Data 最前。
if (text === "export" && code.length >= 4 && code[1] instanceof Common && lastUnit instanceof Bracket
  && (lastUnit as Bracket).StartBracketChar === "{" && TypeBuilder.IsBodyBrace(code, code.length - 1)) {
  // 跳过 export 之后的修饰词（declare / abstract / async / const）找到声明词；
  // 但建树起点要留在第一个修饰词上（DeclareKeyword / AbstractKeyword / ConstKeyword 是 TS 的 children）。
  let keywordOffset = 1;
  while (keywordOffset < code.length && code[keywordOffset] instanceof Common) {
    const modifierText = (code[keywordOffset] as Common).TempToString();
    if (modifierText === "declare" || modifierText === "abstract" || modifierText === "async"
      || modifierText === "const") {
      keywordOffset++;
      continue;
    }
    break;
  }
  const keywordText = keywordOffset < code.length && code[keywordOffset] instanceof Common
    ? (code[keywordOffset] as Common).TempToString() : "";
  if (keywordText === "class" || keywordText === "interface" || keywordText === "enum"
    || keywordText === "namespace" || keywordText === "module" || keywordText === "global") {
    let pos = 0;
    for (let index = start - 1; index >= 0; index--) {
      if (!host.Data[index].IsTriviaToken) {
        const previousEnd = host.Data[index].SourceRange.EndIndex;
        if (previousEnd >= 0) {
          pos = previousEnd;
        }
        break;
      }
    }
    let declared:ShapeToken;
    if (keywordText === "class") {
      declared = ClassDeclarationShape.FromUnits(host, codeAt[1], at, context) as ShapeToken;
    } else if (keywordText === "interface") {
      declared = InterfaceDeclarationShape.FromUnits(host, codeAt[1], at, context) as ShapeToken;
    } else if (keywordText === "enum") {
      declared = EnumDeclarationShape.FromUnits(host, codeAt[1], at, context) as ShapeToken;
    } else {
      // namespace / module / global：ModuleDeclarationShape.FromUnits 要 code + positions 两个数组，
      // 且它自己会处理开头的 export / declare 修饰词，所以从 export 开始切。
      const subCode:Array<Token> = [];
      const subPositions:Array<number> = [];
      let subPos = pos;
      for (let index = start; index <= at; index++) {
        const unit = host.Data[index];
        if (unit.IsTriviaToken) {
          continue;
        }
        subCode.push(unit);
        subPositions.push(subPos);
        if (unit.SourceRange.EndIndex >= 0) {
          subPos = unit.SourceRange.EndIndex;
        }
      }
      declared = ModuleDeclarationShape.FromUnits(subCode, subPositions, context) as ShapeToken;
    }
    const exportKeyword = ExportKeywordShape.FromBasicToken(code[0] as Common, context);
    (exportKeyword as ShapeToken).Pos = pos;
    if (keywordText !== "namespace" && keywordText !== "module" && keywordText !== "global") {
      declared.Data.unshift(exportKeyword);
      exportKeyword.Parent = declared;
    }
    (declared as ShapeToken).Pos = pos;
    host.Data.splice(start, at - start + 1, declared);
    declared.Parent = host;
    return true;
  }
}
// `export default 1` 鏃犲垎鍙峰埌 EOF锛欳hildren 鍙湁琛ㄨ揪寮忥紙TS 涓?export/default 閮戒笉鏄妭鐐癸級鎴栧悕绉般€?
// `export default function f(): void`（无体、无分号到 EOF）：TS 是带 export / default 修饰的
// FunctionDeclaration（重载签名，children 顺序 ExportKeyword → DefaultKeyword → AsyncKeyword? → 名字 → 返回类型）。
// `FunctionDeclarationShape.FromUnits` 不认 export / default，所以从 `function` / `async` 那一格建，
// 再把 DefaultKeyword / ExportKeyword 依次插到 Data 最前。没有这一支，整条会落进
// `isExportDefault` 的表达式路径，报「函数表达式缺少函数体」。
// 有体的 `export default function f() {}` 由声明候选自己收口，不走这里。
// 长度下界按**括号是整单元**算：`export default function ()` 只有 export / default / function / `()`
// 四个单元（无返回类型），所以下界是 4；async 形多一格 async，下界 5。
const isExportDefaultFunction = text === "export"
  && code.length >= 4
  && code[1] instanceof Common && (code[1] as Common).Is("default")
  && code[2] instanceof Common
  && ((code[2] as Common).Is("function")
    || ((code[2] as Common).Is("async") && code.length >= 5
      && code[3] instanceof Common && (code[3] as Common).Is("function")));
if (isExportDefaultFunction
  && !(lastUnit instanceof Bracket && (lastUnit as Bracket).StartBracketChar === "{")) {
  let pos = 0;
  for (let index = start - 1; index >= 0; index--) {
    if (!host.Data[index].IsTriviaToken) {
      const previousEnd = host.Data[index].SourceRange.EndIndex;
      if (previousEnd >= 0) {
        pos = previousEnd;
      }
      break;
    }
  }
  const lastCodeEnd = code[code.length - 1].SourceRange.EndIndex;
  if (lastCodeEnd < 0) {
    return false;
  }
  let overloadEnd = at;
  if (!(lastUnit instanceof Symbol && (lastUnit as Symbol).Is(";"))) {
    const overloadSemi = new Symbol(host.Template);
    overloadSemi.SignIn(lastCodeEnd);
    overloadSemi.AppendValueAndSignOut(";", lastCodeEnd - 1);
    host.Data.splice(at + 1, 0, overloadSemi);
    overloadEnd = at + 1;
  }
  try {
    // 匿名无体 `export default function (): void`：TS 的 FunctionDeclaration 没有名字 child
    //（`export default function () {}` 也是这样），所以这里必须允许匿名——否则 FromUnits 抛
    //「函数声明的名字不是标识符」、被 catch 后整条落进 isExportDefault 的表达式路径 crash。
    // ambient 也传 true：无体、无返回类型的签名（`export default function ()`）在根级只有
    // declare / ambient 才被 FunctionDeclarationShape 接受，但 TS 侧它是合法的「重载签名」形
    //（parseDiagnostics=0，AST 只有 ExportKeyword / DefaultKeyword / Parameter[]），
    // 不打开这一格就建不出来。
    const declared = FunctionDeclarationShape.FromUnits(host, codeAt[2], overloadEnd, context, true, true);
    const defaultKeyword = new DefaultKeywordShape(host.Template);
    if (code[1].SourceRange.StartIndex >= 0) {
      defaultKeyword.SignIn(code[1].SourceRange.StartIndex);
    }
    if (code[1].SourceRange.EndIndex >= 0) {
      defaultKeyword.SignOut(code[1].SourceRange.EndIndex);
    }
    defaultKeyword.Pos = code[0].SourceRange.EndIndex < 0 ? pos : code[0].SourceRange.EndIndex;
    defaultKeyword.TryToClose(context);
    declared.Data.unshift(defaultKeyword);
    defaultKeyword.Parent = declared;
    const exportKeyword = ExportKeywordShape.FromBasicToken(code[0] as Common, context);
    (exportKeyword as ShapeToken).Pos = pos;
    declared.Data.unshift(exportKeyword);
    exportKeyword.Parent = declared;
    (declared as ShapeToken).Pos = pos;
    host.Data.splice(start, overloadEnd - start + 1, declared);
    declared.Parent = host;
    return true;
  } catch (error) {
    if (overloadEnd !== at) {
      host.Data.splice(at + 1, 1);
    }
    return false;
  }
}
const isExportDefault = text === "export"
  && code.length >= 3
  && code[1] instanceof Common
  && (code[1] as Common).Is("default");
if (isExportDefault) {
  // `export default class C {}` / `export default function f() {}` / `export default interface I {}`：
  // TS 6 把 ExportKeyword / DefaultKeyword 当声明**自身的修饰词**（ClassDeclaration /
  // FunctionDeclaration / InterfaceDeclaration 的 children），不是 ExportAssignment；default 后面
  // 若是声明形，必须建声明，不能走下面的表达式路。
  const defaultDeclarationAt = SourceFileEndPossibleShape.BodyDeclarationKeyword(code, 2);
  if (defaultDeclarationAt >= 0) {
    const declarationText = (code[defaultDeclarationAt] as Common).TempToString();
    const closedBody = code[code.length - 1] instanceof Bracket
      && (code[code.length - 1] as Bracket).StartBracketChar === "{"
      && TypeBuilder.IsBodyBrace(code, code.length - 1);
    if (closedBody) {
      let pos = 0;
      for (let index = start - 1; index >= 0; index--) {
        if (!host.Data[index].IsTriviaToken) {
          const previousEnd = host.Data[index].SourceRange.EndIndex;
          if (previousEnd >= 0) {
            pos = previousEnd;
          }
          break;
        }
      }
      if (declarationText === "class") {
        // ClassDeclarationShape.FromUnits 自己消费 export / default / declare / abstract 与装饰器；
        // AllowAnonymous 覆盖 `export default class {}`（TS 合法：没有名字 child）。
        const declared = ClassDeclarationShape.FromUnitsAllowAnonymous(host, start, at, context);
        host.Data.splice(start, at - start + 1, declared);
        declared.Parent = host;
        return true;
      }
      if (declarationText === "function" || declarationText === "interface") {
        // 这两个 FromUnits 只认自己的修饰词（function 的 declare/async、interface 的 export/declare），
        // 不认 default：从声明词（function 前的 async 也算）建出来，再把 DefaultKeyword /
        // ExportKeyword 按 TS 的 children 顺序插到最前。
        let declarationStart = defaultDeclarationAt;
        while (declarationStart > 2 && code[declarationStart - 1] instanceof Common
          && (code[declarationStart - 1] as Common).Is("async")) {
          declarationStart--;
        }
        const declared = declarationText === "function"
          ? FunctionDeclarationShape.FromUnits(host, codeAt[declarationStart], at, context)
          : InterfaceDeclarationShape.FromUnits(host, codeAt[declarationStart], at, context);
        const exportKeyword = ExportKeywordShape.FromBasicToken(code[0] as Common, context);
        (exportKeyword as ShapeToken).Pos = pos;
        const defaultKeyword = new DefaultKeywordShape(host.Template);
        defaultKeyword.SignInToken(code[1]);
        defaultKeyword.SignOutToken(code[1]);
        const exportEnd = code[0].SourceRange.EndIndex;
        (defaultKeyword as ShapeToken).Pos = exportEnd < 0 ? pos : exportEnd;
        defaultKeyword.TryToClose(context);
        declared.Data.unshift(exportKeyword, defaultKeyword);
        exportKeyword.Parent = declared;
        defaultKeyword.Parent = declared;
        (declared as ShapeToken).Pos = pos;
        host.Data.splice(start, at - start + 1, declared);
        declared.Parent = host;
        return true;
      }
    }
    return false;
  }
  let pos = 0;
  for (let index = start - 1; index >= 0; index--) {
    if (!host.Data[index].IsTriviaToken) {
      const previousEnd = host.Data[index].SourceRange.EndIndex;
      if (previousEnd >= 0) {
        pos = previousEnd;
      }
      break;
    }
  }
  const defaultEnd = code[1].SourceRange.EndIndex;
  const basePos = defaultEnd < 0 ? pos : defaultEnd;
  const builder = new ExpressionBuilder(host.Template, context);
  builder.Load(host.Data.slice(codeAt[2], at + 1), basePos);
  const expression = builder.ParseExpression();
  const assignment = new ExportAssignmentShape(host.Template);
  assignment.Expression = expression;
  assignment.Data.push(expression);
  expression.Parent = assignment;
  (assignment as ShapeToken).Pos = pos;
  if (code[0].SourceRange.StartIndex >= 0) {
    assignment.SignIn(code[0].SourceRange.StartIndex);
  }
  const expressionEnd = code[code.length - 1].SourceRange.EndIndex;
  if (expressionEnd >= 0) {
    assignment.SignOut(expressionEnd);
  }
  host.Data.splice(start, at - start + 1, assignment);
  assignment.Parent = host;
  return true;
}
// `export = 1` 无分号到 EOF：与 `export default 1` 同族（都是 ExportAssignment，children 只有表达式），
// 区别只在 `export` 后面跟的是 `=`。`End` 由形状取最后一个代码单元。
const isExportEquals = text === "export"
  && code.length >= 3
  && code[1] instanceof Symbol
  && (code[1] as Symbol).Is("=");
if (isExportEquals) {
  const assignment = ExportAssignmentShape.FromUnits(host, start, at, context, false);
  host.Data.splice(start, at - start + 1, assignment);
  assignment.Parent = host;
  return true;
}
// `export as namespace A` 无分号到 EOF（statements 文档 I 组）：NamespaceExportDeclaration 的 children
// 只有名字，FromUnits 要求末尾 `;`；这里补零宽合成 `;` 再走正常入口，避免落进 ExpressionStatement
// 报「表达式语句没有读完」。多声明连排时本条是前缀，本分支只负责这一段。
const isExportAsNamespace = text === "export"
  && code.length >= 4
  && code[1] instanceof Common && (code[1] as Common).Is("as")
  && code[2] instanceof Common && (code[2] as Common).Is("namespace");
if (isExportAsNamespace) {
  const namespaceEnd = host.Data[at].SourceRange.EndIndex;
  if (namespaceEnd < 0) {
    return false;
  }
  const namespaceSemi = new Symbol(host.Template);
  namespaceSemi.SignIn(namespaceEnd);
  namespaceSemi.AppendValueAndSignOut(";", namespaceEnd - 1);
  host.Data.splice(at + 1, 0, namespaceSemi);
  const namespaceExport = NamespaceExportDeclarationShape.FromUnits(host, start, at + 1, context);
  host.Data.splice(start, at - start + 2, namespaceExport);
  namespaceExport.Parent = host;
  return true;
}
// 无体 ambient module 到 EOF：`declare module "m"`（无体、无分号），以及不带 `declare` 的
// `module "m"` / `module "m";`（TS 同为无体 ModuleDeclaration，children 只有字符串名）。
// TS 的 ModuleDeclaration 在模块字符串处就完整，换行 / EOF 靠 ASI 收口。原实现只在「最后一块是 `{`」
// 时建 ModuleDeclaration，无体形落进 ExpressionStatement 兜底报「表达式语句没有读完」；
// 多条连排（`declare module "m"` ⏎ `class C {}`）时前缀递归同样走到这里。
// 末尾没有 `;` 时补零宽合成 `;`，有真实 `;` 时直接用它（End 要含分号），
// 再走 ModuleDeclarationShape.FromUnits 的无体分支（terminatorIndex）。
const isDeclareBodylessModule = text === "declare"
  && code.length === 3
  && code[1] instanceof Common && (code[1] as Common).Is("module");
const isQuotedBodylessModule = text === "module"
  && code[1] instanceof String
  && (code.length === 2
    || (code.length === 3 && code[2] instanceof Symbol && (code[2] as Symbol).Is(";")));
const isBodylessAmbientModule = isDeclareBodylessModule || isQuotedBodylessModule;
if (isBodylessAmbientModule) {
  const moduleEnd = host.Data[at].SourceRange.EndIndex;
  if (moduleEnd < 0) {
    return false;
  }
  try {
    const subCode:Array<Token> = [];
    const subPositions:Array<number> = [];
    let subPos = 0;
    for (let index = start - 1; index >= 0; index--) {
      if (!host.Data[index].IsTriviaToken) {
        const previousEnd = host.Data[index].SourceRange.EndIndex;
        if (previousEnd >= 0) {
          subPos = previousEnd;
        }
        break;
      }
    }
    for (let index = start; index <= at; index++) {
      const unit = host.Data[index];
      if (unit.IsTriviaToken) {
        continue;
      }
      subCode.push(unit);
      subPositions.push(subPos);
      if (unit.SourceRange.EndIndex >= 0) {
        subPos = unit.SourceRange.EndIndex;
      }
    }
    const lastCodeUnit = subCode[subCode.length - 1];
    if (!(lastCodeUnit instanceof Symbol && (lastCodeUnit as Symbol).Is(";"))) {
      const moduleSemi = new Symbol(host.Template);
      moduleSemi.SignIn(moduleEnd);
      moduleSemi.AppendValueAndSignOut(";", moduleEnd - 1);
      subCode.push(moduleSemi);
      subPositions.push(subPos);
    }
    const bodyless = ModuleDeclarationShape.FromUnits(subCode, subPositions, context);
    host.Data.splice(start, at - start + 1, bodyless);
    bodyless.Parent = host;
    return true;
  } catch (error) {
    return false;
  }
}
// 声明关键字按「修饰词 + 声明词」识别：`abstract class` / `declare abstract class` 与 `class` /
// `declare class` 一样都是 ClassDeclaration（ClassDeclarationShape.FromUnits 自己消费修饰词）。
const leadingAt = SourceFileEndPossibleShape.LeadingDeclarationKeyword(code);
const leadingText = leadingAt >= 0 ? (code[leadingAt] as Common).TempToString() : "";
const isClass = leadingText === "class";
const isInterface = text === "interface"
  || (text === "declare" && code.length >= 3 && code[1] instanceof Common && (code[1] as Common).Is("interface"));
const isEnum = text === "enum"
  || (text === "declare" && code.length >= 3 && code[1] instanceof Common && (code[1] as Common).Is("enum"));
const isModuleDecl = text === "namespace" || text === "module" || text === "global"
  || (text === "declare" && code.length >= 3 && code[1] instanceof Common
    && ((code[1] as Common).Is("namespace") || (code[1] as Common).Is("module")
      || (code[1] as Common).Is("global")));
if ((isClass || isInterface || isEnum || isModuleDecl)
  && lastUnit instanceof Bracket && (lastUnit as Bracket).StartBracketChar === "{") {
  if (isClass) {
    const klass = ClassDeclarationShape.FromUnits(host, start, at, context);
    host.Data.splice(start, at - start + 1, klass);
    klass.Parent = host;
    return true;
  }
  if (isInterface) {
    const iface = InterfaceDeclarationShape.FromUnits(host, start, at, context);
    host.Data.splice(start, at - start + 1, iface);
    iface.Parent = host;
    return true;
  }
  if (isEnum) {
    const enumShape = EnumDeclarationShape.FromUnits(host, start, at, context);
    host.Data.splice(start, at - start + 1, enumShape);
    enumShape.Parent = host;
    return true;
  }
  // namespace / module / global：ModuleDeclarationShape.FromUnits 要 code + positions 两个数组。
  const subCode:Array<Token> = [];
  const subPositions:Array<number> = [];
  let noSemiPos = 0;
  for (let index = start - 1; index >= 0; index--) {
    if (!host.Data[index].IsTriviaToken) {
      const previousEnd = host.Data[index].SourceRange.EndIndex;
      if (previousEnd >= 0) {
        noSemiPos = previousEnd;
      }
      break;
    }
  }
  for (let index = start; index <= at; index++) {
    const unit = host.Data[index];
    if (unit.IsTriviaToken) {
      continue;
    }
    subCode.push(unit);
    subPositions.push(noSemiPos);
    if (unit.SourceRange.EndIndex >= 0) {
      noSemiPos = unit.SourceRange.EndIndex;
    }
  }
  const moduleShape = ModuleDeclarationShape.FromUnits(subCode, subPositions, context);
  host.Data.splice(start, at - start + 1, moduleShape);
  moduleShape.Parent = host;
  return true;
}
// `export type T = A` 也走类型别名族（TypeAliasDeclarationShape 已接受 export 前缀），
// 于是 `export type T = A` 无分号到 EOF 能靠合成 `;` 建出来。
// 注意：**只有真的长得像别名才走这一支**。`type = 1` / `type` ⏎ `T` 这类以 `type`
// 开头的赋值表达式语句，TS 侧是 ExpressionStatement，不能被这里当别名丢给 FromUnits
//（FromUnits 会抛「类型别名声明不完整」）。判据在 TypeAliasDeclarationShape.IsTypeAliasHead。
const isExportType = text === "export"
  && code.length >= 3
  && code[1] instanceof Common
  && (code[1] as Common).Is("type");
// `declare type T = A` 无分号到 EOF：TypeAliasDeclarationShape.FromUnits 已接受 declare 前缀。
const isDeclareType = text === "declare"
  && code.length >= 3
  && code[1] instanceof Common
  && (code[1] as Common).Is("type");
const isExportDeclareType = text === "export"
  && code.length >= 4
  && code[1] instanceof Common && (code[1] as Common).Is("declare")
  && code[2] instanceof Common && (code[2] as Common).Is("type");
const isType = TypeAliasDeclarationShape.IsTypeAliasHead(code, text);
const isImportEquals = (text === "import"
  && ((code.length >= 5
    && code[1] instanceof Common
    && code[2] instanceof Symbol
    && (code[2] as Symbol).Is("="))
    // `import type x = require("m")`：`type` 是 typeOnly 属性，不是名字；`=` 在 code[3]。
    || (code.length >= 6
      && code[1] instanceof Common && (code[1] as Common).Is("type")
      && code[2] instanceof Common
      && code[3] instanceof Symbol && (code[3] as Symbol).Is("="))))
  // `export import y = require("m")` / `export import type y = …`：TS 是 ImportEqualsDeclaration
  // 带 ExportKeyword 修饰词（ImportEqualsDeclarationShape.FromUnits 已消费 export 前缀）；
  // 无分号到 EOF 时跟 import 形一样补零宽合成 `;` 走正常入口。
  || (text === "export"
    && ((code.length >= 6
      && code[1] instanceof Common && (code[1] as Common).Is("import")
      && code[2] instanceof Common
      && code[3] instanceof Symbol && (code[3] as Symbol).Is("="))
      || (code.length >= 7
        && code[1] instanceof Common && (code[1] as Common).Is("import")
        && code[2] instanceof Common && (code[2] as Common).Is("type")
        && code[3] instanceof Common
        && code[4] instanceof Symbol && (code[4] as Symbol).Is("="))));
// `import … from "m"`（含 import type / 具名 / 命名空间 / 副作用）无分号到 EOF：
// ImportDeclarationShape 有 FromUnits，末尾要求 `;`，这里补零宽合成 `;` 走它。
const isImportClause = text === "import" && !isImportEquals;
// `export import x = A.B` / `export import x = require("m")` 无分号到 EOF：
// TS 是带 ExportKeyword 修饰的 ImportEqualsDeclaration。ImportEqualsDeclarationShape.FromUnits
// 不认 export 前缀，所以从 `import` 那一格建，再把 ExportKeyword 插到 Data 最前
//（与 isExportFunction 同款）。没有这一支，整条会落进 ExpressionStatement 兜底，
// 报「表达式语句没有读完」（`export = a` ⏎ `export import x = A.B` 的后缀也是它）。
const isExportImportEquals = text === "export"
  && ((code.length >= 5
    && code[1] instanceof Common && (code[1] as Common).Is("import")
    && code[2] instanceof Common
    && code[3] instanceof Symbol && (code[3] as Symbol).Is("="))
    // `export import type x = require("m")`：`type` 是 typeOnly 属性，`=` 在 code[4]。
    || (code.length >= 6
      && code[1] instanceof Common && (code[1] as Common).Is("import")
      && code[2] instanceof Common && (code[2] as Common).Is("type")
      && code[3] instanceof Common
      && code[4] instanceof Symbol && (code[4] as Symbol).Is("=")));
// 函数声明：无体时最后一块是 `;`（补合成 `;`），有体时最后一块是 `{`（直接 FromUnits）。
// 合并裁定（end-build 的通用判据 + missing-end 的显式枚举，两边语义都保留）：
// 1) end-build：修饰词按「declare / async + function」归约到 leadingText，`text !== "export" && leadingText === "function"`
//    覆盖 `function` / `declare function` / `async function` / `declare async function` 以及带装饰器/@dec 前缀的声明；
// 2) missing-end：显式枚举 `function` / `declare function` / `async function` / `declare async function` 作为兜底
//    （重载签名可以带 async；TS 只做语义检查）。
const isFunction = (text !== "export" && leadingText === "function")
  || text === "function"
  || (text === "declare" && code.length >= 4 && code[1] instanceof Common && (code[1] as Common).Is("function"))
  || (text === "async" && code.length >= 2 && code[1] instanceof Common && (code[1] as Common).Is("function"))
  || (text === "declare" && code.length >= 5 && code[1] instanceof Common && (code[1] as Common).Is("async")
    && code[2] instanceof Common && (code[2] as Common).Is("function"));
// `export function …` / `export declare function …` / `export async function …`：
// FunctionDeclarationShape.FromUnits 只认 declare/async 前缀、不认 export，所以从 export 之后那一格建，
// 再把 ExportKeyword 插到 Data 最前面（与 isExportVariable 同款）。没有这一支，`export declare function f(): B`
// 无分号到 EOF 会落进 ExpressionStatement，报「表达式语句没有读完」。
let exportFunctionStart = -1;
if (text === "export" && code.length >= 4 && code[1] instanceof Common) {
  const secondText = (code[1] as Common).TempToString();
  if (secondText === "function") {
    // `export function …`
    exportFunctionStart = codeAt[1];
  } else if (secondText === "async" && code.length >= 5 && code[2] instanceof Common
    && (code[2] as Common).Is("function")) {
    // `export async function …`：从 async 起（FromUnits 建 AsyncKeyword 子节点）。
    exportFunctionStart = codeAt[1];
  } else if (secondText === "declare") {
    // `export declare function …` / `export declare async function …`：从 declare 起，
    // FromUnits 才能建出 DeclareKeyword 子节点。
    if (code.length >= 5 && code[2] instanceof Common && (code[2] as Common).Is("function")) {
      exportFunctionStart = codeAt[1];
    } else if (code.length >= 6 && code[2] instanceof Common && (code[2] as Common).Is("async")
      && code[3] instanceof Common && (code[3] as Common).Is("function")) {
      exportFunctionStart = codeAt[1];
    }
  }
}
const isExportFunction = exportFunctionStart >= 0;
// 其余 `export …` 形式（`export { a }` / `export * from "m"` / `export type { T }` 等）：
// 走 ExportDeclarationShape.FromUnits + 合成 `;`，在下面 isType/isImportEquals/isExportFunction 之后兜底。
const isExportClause = text === "export";
if (!isType && !isImportEquals && !isImportClause && !isFunction && !isExportFunction
  && !isExportImportEquals && !isExportClause) {
  return false;
}
if ((isFunction || isExportFunction) && lastUnit instanceof Bracket && (lastUnit as Bracket).StartBracketChar === "{"
  && TypeBuilder.IsBodyBrace(code, code.length - 1)) {
  const functionStart = isExportFunction ? exportFunctionStart : start;
  const declared = FunctionDeclarationShape.FromUnits(host, functionStart, at, context);
  if (isExportFunction) {
    let pos = 0;
    for (let index = start - 1; index >= 0; index--) {
      if (!host.Data[index].IsTriviaToken) {
        const previousEnd = host.Data[index].SourceRange.EndIndex;
        if (previousEnd >= 0) {
          pos = previousEnd;
        }
        break;
      }
    }
    const exportKeyword = ExportKeywordShape.FromBasicToken(code[0] as Common, context);
    (exportKeyword as ShapeToken).Pos = pos;
    declared.Data.unshift(exportKeyword);
    exportKeyword.Parent = declared;
    (declared as ShapeToken).Pos = pos;
  }
  host.Data.splice(start, at - start + 1, declared);
  declared.Parent = host;
  return true;
}
const lastEnd = host.Data[at].SourceRange.EndIndex;
if (lastEnd < 0) {
  return false;
}
const semi = new Symbol(host.Template);
semi.SignIn(lastEnd);
semi.AppendValueAndSignOut(";", lastEnd - 1);
host.Data.splice(at + 1, 0, semi);
if (isType) {
  const built = TypeAliasDeclarationShape.FromUnits(host, start, at + 1, context);
  host.Data.splice(start, at - start + 2, built);
  built.Parent = host;
  return true;
}
if (isImportEquals) {
  const imported = ImportEqualsDeclarationShape.FromUnits(host, start, at + 1, context);
  host.Data.splice(start, at - start + 2, imported);
  imported.Parent = host;
  return true;
}
if (isExportImportEquals) {
  // 从 `import` 那一格建（ExportKeyword 不是 ImportEqualsDeclarationShape 的入参），
  // 再把 ExportKeyword 插回 Data 最前、Pos 改到 export 起点——TS 的 Pos 含前导 trivia。
  let exportPos = 0;
  for (let index = start - 1; index >= 0; index--) {
    if (!host.Data[index].IsTriviaToken) {
      const previousEnd = host.Data[index].SourceRange.EndIndex;
      if (previousEnd >= 0) {
        exportPos = previousEnd;
      }
      break;
    }
  }
  try {
    const imported = ImportEqualsDeclarationShape.FromUnits(host, codeAt[1], at + 1, context);
    const exportKeyword = ExportKeywordShape.FromBasicToken(code[0] as Common, context);
    (exportKeyword as ShapeToken).Pos = exportPos;
    imported.Data.unshift(exportKeyword);
    exportKeyword.Parent = imported;
    (imported as ShapeToken).Pos = exportPos;
    host.Data.splice(start, at - start + 2, imported);
    imported.Parent = host;
    return true;
  } catch (error) {
    host.Data.splice(at + 1, 1);
    return false;
  }
}
if (isImportClause) {
  try {
    const imported = ImportDeclarationShape.FromUnits(host, start, at + 1, context);
    host.Data.splice(start, at - start + 2, imported);
    imported.Parent = host;
    return true;
  } catch (error) {
    host.Data.splice(at + 1, 1);
    return false;
  }
}
if (isExportFunction) {
  const exported = FunctionDeclarationShape.FromUnits(host, exportFunctionStart, at + 1, context);
  let pos = 0;
  for (let index = start - 1; index >= 0; index--) {
    if (!host.Data[index].IsTriviaToken) {
      const previousEnd = host.Data[index].SourceRange.EndIndex;
      if (previousEnd >= 0) {
        pos = previousEnd;
      }
      break;
    }
  }
  const exportKeyword = ExportKeywordShape.FromBasicToken(code[0] as Common, context);
  (exportKeyword as ShapeToken).Pos = pos;
  exported.Data.unshift(exportKeyword);
  exportKeyword.Parent = exported;
  (exported as ShapeToken).Pos = pos;
  host.Data.splice(start, at - start + 2, exported);
  exported.Parent = host;
  return true;
}
if (isExportClause) {
  // `export { a }` / `export * from "m"` 无分号到 EOF：ExportDeclarationShape 自己的入口要求末尾 `;`，
  // 这里用已插入的合成 `;` 走正常路径；建不出来就撤掉合成 `;` 并让调用方退回表达式兜底。
  try {
    const built = ExportDeclarationShape.FromUnits(host, start, at + 1, context);
    host.Data.splice(start, at - start + 2, built);
    built.Parent = host;
    return true;
  } catch (error) {
    host.Data.splice(at + 1, 1);
    return false;
  }
}
const declared = FunctionDeclarationShape.FromUnits(host, start, at + 1, context);
host.Data.splice(start, at - start + 2, declared);
declared.Parent = host;
return true;
```

## private static method BuildModuleDeclaration:(host:Token, start:int, at:int, context:SyntaxContext)=>Token

段首是装饰器的模块声明（`@dec namespace N {}` / `@dec export module "m" {}` 等）：
`ModuleDeclarationShape.FromUnits` 要 `code` + `positions` 两个数组（`positions[i]` 是 `code[i]`
含前导 trivia 的半开起点），且它自己从段首开始扫装饰器与 `export` / `declare` 修饰词。
这里只负责把 `host.Data[start..at]` 收成这两个数组，建形状由它完成；splice 留给调用方。

```ts
let pos = 0;
for (let index = start - 1; index >= 0; index--) {
  if (!host.Data[index].IsTriviaToken) {
    const previousEnd = host.Data[index].SourceRange.EndIndex;
    if (previousEnd >= 0) {
      pos = previousEnd;
    }
    break;
  }
}
const subCode:Array<Token> = [];
const subPositions:Array<number> = [];
let subPos = pos;
for (let index = start; index <= at; index++) {
  const unit = host.Data[index];
  if (unit.IsTriviaToken) {
    continue;
  }
  subCode.push(unit);
  subPositions.push(subPos);
  if (unit.SourceRange.EndIndex >= 0) {
    subPos = unit.SourceRange.EndIndex;
  }
}
return ModuleDeclarationShape.FromUnits(subCode, subPositions, context);
```

