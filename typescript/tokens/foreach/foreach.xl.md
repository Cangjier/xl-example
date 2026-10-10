# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../../core/syntax/close-rule.xl.md"
import { SyntaxException } from "../../../core/exceptions/syntax-exception.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { TokenField } from "../../../core/syntax/token-field.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get } from "../../../core/extensions/list-extension.xl.md"
import { SearchBack } from "../../../core/extensions/list-extension.xl.md"
import { CommentsIn, GetSkipNextTrivia, IsTriviaUnit } from "../../text-common-util.xl.md"
import { GetSkipNext } from "../../../core/extensions/list-extension.xl.md"
import { SkipNextTrivia } from "../../text-common-util.xl.md"
import { SkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { TakeRange } from "../../../core/extensions/list-extension.xl.md"
import { Bracket } from "../bracket.xl.md"
import { IsWordUnit } from "../declaration-common.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
import { Identifier } from "../identifier.xl.md"
import { Statement } from "../statement.xl.md"
import { LineWrap } from "../line-wrap.xl.md"
import { ForeachBody } from "./foreach-body.xl.md"
import { ForeachDefine } from "./foreach-define.xl.md"
import { ForeachEnumable } from "./foreach-enumable.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`foreach` / `for...in` 语句：把 `foreach (x in xs) { ... }` 这一串单元重组成一个 `Foreach`，里面分成 Define（`x`）、Enumable（`xs`）、Body（`{ ... }` 或单条语句）三段。

收尾规则类 `ForeachCloseRule` **不进 `Data`、不进 XML**，所以它的类名随便取。反过来，`Foreach` 本体的类名**就是** XML 标签名（取自 `this.constructor.name`），不能改。

# class ForeachCloseRule extends CloseRule

收尾规则：`foreach` / `for` 加一对括号，括号里带 `in` 或 `of`，就整段换成一个 `Foreach`。

它是 `for` 的收尾规则的**补集**：`ForCloseRule` 只在括号里**没有** `in` / `of` 时命中，这里只在**有** `in` / `of` 时命中——两者靠这一点区分「C 风格 for」与「for-in / foreach」。

## static readonly field Instance:ForeachCloseRule = new ForeachCloseRule()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是本次重组的起点：一个内容为 `for` 或 `foreach` 的 `Identifier`，
**可选的一个 `await`**，紧跟（跳过 **trivia**：软换行**与注释**）一个 `(` 开头的 `Bracket`，
且括号里至少有一个内容为 `in` 或 `of` 的 `Identifier`。

`await` 那一跳是给 `for await (const v of xs)` 的：异步迭代的 `await` 夹在 `for` 与括号之间，
不跳的话判定在这一步就断了、整条 `Foreach` 认不出来（`st-for-await` / `stmt-for-await` 两条用例）。
注意 `for` 与 `(` 之间只有 `await` 需要跳——`for (…)` 本身不能多跳。

**跨 trivia 而不是只跨软换行**（第 595 轮）：`for /* c */ (const x of xs) { }` 在 TypeScript 里
是 `ForOfStatement`，只跳软换行会撞上注释 ⇒ 整条语句退化成一个 `ExpressionStatement`。

```ts
const unit = Get(units, index);
if (!(unit instanceof Identifier)) {
  return false;
}
if (!(unit.Is("for") || unit.Is("foreach"))) {
  return false;
}
let next = GetSkipNextTrivia(units, index);
if (next instanceof Identifier && next.Is("await")) {
  next = GetSkipNext(units, index, (item) => IsTriviaUnit(item) || (item instanceof Identifier && item.Is("await")));
}
if (!(next instanceof Bracket)) {
  return false;
}
const bracket = next;
return bracket.startBracket === "(" && bracket.Data.some((item) => IsWordUnit(item, "in") || IsWordUnit(item, "of"));
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

执行重组：把 `foreach` / `for` 头连同条件括号与语句体收进一个 `Foreach`，**返回新的下标**。

重组把多个子单元换成一个，下标必须跟着走。末尾 `ReplaceCountAt` 把从 `index` 起的这一整段单元换成一个 `Foreach`。

三分段的取法：

1. **Define**（`x`）：括号内**最后一个** `in` / `of` 所在位置之前的内容。找不到就抛 `SyntaxException`。
2. **Enumable**（`xs`）：上述位置之后到括号末尾。位置后面没有内容时同样抛 `SyntaxException`。
3. **Body**：括号后面若是 `{` 开头的 `Bracket`，把它整块搬进来；否则从当前位置起找语句结尾（`Statement.SearchStatementEnd`）。找不到结尾时抛 `SyntaxException`。

`for` 与条件括号之间可以夹一个 `await`（`for await (… of …)`），取括号前要跳掉它——
`Previous` 与 `Process` 必须跳同样多的东西，只改一边会在这里对不上：
`Process` 会把那个 `await` 当成括号去取 `Data`，`SearchBack(undefined, …)` 直接抛。
（这是真实发生过的一次：`Previous` 放宽之后，`fn-async-generator` 那条基线用例开始抛 `SyntaxException`。）

顺序取前面一段用 `TakeRange`（取出不移除）：`Take(n)` 即 `TakeRange(self, 0, n)`。注意 `defineEnd == -1` 这条路径上会切出空数组、不抛错。

三处抛错走静态工厂 `SyntaxException.FromMessage`，把范围与消息一起带上。

```ts
const current = Get(units, index)!;
const result = new Foreach(template);
result.Parent = current.Parent;
result.SignIn(current.SourceRange.Start!);
let currentIndex = index;
currentIndex = SkipNextTrivia(units, currentIndex);
// **条件括号之前跨过的注释要收下**（第 595 轮）：它们落在被替换的那一段里，
// 不收就等于删掉（软换行不收，见 `CommentsIn`）。
result.AddRange(CommentsIn(units, index + 1, currentIndex));
const headUnit = Get(units, currentIndex);
let awaitUnit: Token | null = null;
if (headUnit instanceof Identifier && headUnit.Is("await")) {
  awaitUnit = headUnit;
  const beforeAwait = currentIndex;
  currentIndex = SkipNextTrivia(units, currentIndex);
  result.AddRange(CommentsIn(units, beforeAwait + 1, currentIndex));
}
if (awaitUnit !== null) {
  result.AddAndCloseLast(awaitUnit);
}
const conditionBracket = Get(units, currentIndex) as Bracket;
// **头部那个 `)` 当场记进 `HeaderCloseAt`**（第 634 轮，与 `while.xl.md` / `for.xl.md` 同一条）。
result.HeaderCloseAt = conditionBracket.SourceRange.End!.Index;
const defineEnd = SearchBack(conditionBracket.Data, -1, (x) => IsWordUnit(x, "in") || IsWordUnit(x, "of"));
if (defineEnd === -1) {
  throw SyntaxException.FromMessage(conditionBracket.SourceRange, "foreach/for(...){...} 的`(...)`中语句不满足格式要求：`(... in/of ...)`");
}
// **那个词是 `in` 还是 `of`，当场记进字段**（第 631 轮）：投影从前是拿
// `source.slice(定义段末尾, 枚举对象开头)` 做 `/\bin\b/` 正则——注释里写个 `in`
// （`for (const a /* in */ of [1])`）就把它判成 `ForInStatement`。词在这一刻就在手上。
result.IsForIn = IsWordUnit(conditionBracket.Data[defineEnd], "in");
const define = result.CreateDefine();
define.SignIn(conditionBracket.Data[0].SourceRange.Start!);
define.SignOut(conditionBracket.Data[defineEnd].SourceRange.End!);
define.AddRange(TakeRange(conditionBracket.Data, 0, defineEnd));
define.TryToClose();
const enumableEnd = conditionBracket.Data.length - 1;
const enumable = result.CreateEnumable();
if (defineEnd + 1 < conditionBracket.Data.length) {
  enumable.SignIn(conditionBracket.Data[defineEnd + 1].SourceRange.Start!);
  enumable.SignOut(conditionBracket.Data[enumableEnd].SourceRange.End!);
  enumable.AddRange(TakeRange(conditionBracket.Data, defineEnd + 1, enumableEnd - (defineEnd + 1) + 1));
} else {
  throw SyntaxException.FromMessage(conditionBracket.SourceRange, "foreach/for(...){...} 的`(...)`中语句不满足格式要求：`(... in/of ...)`");
}
enumable.TryToClose();
const startIndex = index;
let endIndex = currentIndex;
// **体是那条空语句（`foreach/for (…);`）**（第 590 轮）：判出来之后记在单元上（见 `EmptyBodyAt`）。
let emptyBody = false;
// **体起点跳过 trivia**（第 662 轮，与 `while.xl.md` / `for.xl.md` 同一条）：
// `for (const x of xs)/* c */;` 与 `… /* c */ {}` 都是合法排法，只跳软换行时体起点落在注释上
// ⇒ `EmptyBodyAt` / `BodyBrace` 两格都记不下。
const headerEnd = currentIndex;
currentIndex = SkipNextTrivia(units, currentIndex);
const forBody = result.CreateBody();
// **头与体之间那些注释不能丢**（第 662 轮）：它们落在被替掉的那一段里，而体段从跳过 trivia
// 之后的 `currentIndex` 起收 ⇒ 不收就整个消失。
const bodyComments = CommentsIn(units, headerEnd + 1, currentIndex);
if (bodyComments.length > 0) {
  forBody.AddRange(bodyComments);
}
// **体那一格的右端**（与 `for` / `while` 同一处口径）：两个分支各自赋值。
let tailEnd = current.SourceRange.End!;
const statementCandidate = Get(units, currentIndex);
if (statementCandidate instanceof Bracket && statementCandidate.startBracket === "{") {
  const statementBracket = statementCandidate;
  // **体那一对花括号当场记进 `BodyBrace`**（第 619 轮那一格，第 641 轮带上整段，
  // 与 `For` / `While` 同一条口径）：
  // `for (const x of xs) {}` 的空块在 `ToList` 里**整个摊掉**了，
  // 而 TS 那边 `ForOfStatement.statement` 仍有一个**空 `Block`**——
  // 投影原来靠「配对头部 `)` + `indexOf("{")` + `MatchingBrace`」**回原文重扫**。
  result.BodyBrace.Set(statementBracket.SourceRange.Start!.Index, statementBracket.SourceRange);
  statementBracket.MoveDataTo(forBody);
  forBody.SignIn(statementBracket.SourceRange.Start!);
  forBody.SignOut(statementBracket.SourceRange.End!);
  tailEnd = statementBracket.SourceRange.End!;
  endIndex = currentIndex;
} else {
  // **表尾之后没有实义单元 ⇒ 体就是触发本规则的那个 `;`**（第 662 轮，与 `while.xl.md` 同一条）。
  if (currentIndex >= units.length) {
    endIndex = currentIndex - 1;
    emptyBody = true;
  } else {
    endIndex = Statement.SearchStatementEnd(units, currentIndex - 1);
    if (endIndex === -1) {
      // **体一直写到输入末尾**（第 63 轮补）：没有 `;`、文件又正好在这里结束时，
      // `SearchStatementEnd` 给不出结尾——那是语句写完了，不是语法错误。
      endIndex = Statement.LastMeaningfulIndex(units, currentIndex);
    }
    // **空体：`foreach/for (…);`**（第 589 轮，与 `for.xl.md` 那一处一字不差）：
    // 规则由 `;` 触发，而那一刻 `;` 还没进 `units` ⇒ 两个找尾的都给 `-1`。
    // 体为空、`endIndex` 退到 `)` 那一格；`;` 由投影侧读 `EmptyBodyAt` 补成 `EmptyStatement`。
    if (endIndex === -1) {
      endIndex = currentIndex - 1;
      emptyBody = true;
    }
  }
  if (endIndex >= currentIndex) {
    forBody.AddRange(units.slice(currentIndex, endIndex + 1));
    forBody.SignIn(Get(units, currentIndex)!.SourceRange.Start!);
  } else {
    forBody.SignIn(Get(units, endIndex)!.SourceRange.End!);
  }
  // **体是单语句时，尾分号要算进来**（与 `for` 第 572 轮那一处同一条口径）：
  // `;` 被 `Statement.FormFrom` **切进壳体的区间**、却不放进 `Data`
  // ⇒ `Get(units, endIndex).SourceRange.End` 比 TS 少一格。
  tailEnd = Get(units, endIndex)!.SourceRange.End!;
  const owner = current.Parent;
  const ownerEnd = owner !== null && owner.constructor.name === "Statement" ? owner.SourceRange.End : null;
  if (ownerEnd !== null && endIndex === units.length - 1 && ownerEnd.Index > tailEnd.Index) {
    tailEnd = ownerEnd;
  }
  forBody.SignOut(tailEnd);
  // **空体那一格：把那个 `;` 的位置记在单元上**（第 590 轮，与 `for.xl.md` 同一条）。
  if (emptyBody) {
    result.EmptyBodyAt = tailEnd.Index;
  }
}
forBody.TryToClose();
result.SignOut(tailEnd);
result.TryToClose();
ReplaceCountAt(units, index, endIndex - startIndex + 1, result);
return index;
```

# class Foreach extends IndependentToken

`foreach` / `for...in` 语句单元。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<Foreach>` 里依次是 Define、Enumable、Body 三段的 XML。

## method SegmentNames:()=>Map<string, Map<string, string>>

**本单元的段，投成目标语言形状时叫什么**：每个节点名各一张表，产物那边的分段名 → 目标语言的字段名。

**为什么要分两份**：这个 token 依上下文投成不同的节点（`ForOfStatement`（for…of（`Foreach` 的默认那一支）） 与 `ForInStatement`（for…in（`Foreach` 的 `in` 那一支））），而字段名未必相同——所以按节点名分档。

段名是**本单元自己的事实**（见 `Token.SegmentNames`）：这些段是这一个 token 切开来的，叫 `define` / `enumable` / `body` 的名字只有在这一页才成立——所以它住在这一页，而不是投影层那张按 kind 分几十档的中央表里。**投影只读这一格**：`structuralProps` 拿它给字段名，查不到才落到那张还没搬完的表。

**形态与基类一致**（`## method` 而不是 `## property`）：基类那一格是 `## method` + 空表，写成属性会在派生类里报「类型不兼容」——两者只能同一形态。

```ts
return new Map([["ForOfStatement", new Map([["define", "initializer"], ["enumable", "expression"], ["body", "statement"]])], ["ForInStatement", new Map([["define", "initializer"], ["enumable", "expression"], ["body", "statement"]])]]);
```

## field EmptyBodyAt:int = -1

**体是那条空语句（`foreach/for (…);`）时，那个 `;` 的下标**；不是这一档就是 `-1`。

与 `For.EmptyBodyAt` / `While.EmptyBodyAt` 同一个来由：判据只在收尾规则那一处算得起，
投影只读一次（见 `PrintDirectAst`），不再拿 `MatchingParen` + `BodyBlockOf` 重扫原文。

## field BodyBrace:TokenField<number> = new TokenField<number>(-1)

**体那一对花括号的整段区间**（值取 `{` 的下标）；体不是花括号块时**没记过**（`IsSet` 为假）。

与 `For.BodyBrace` / `While.BodyBrace` **同一个来由、同一份形状**：
`for (const x of xs) {}` 的空块在 `ToList` 时**整个摊掉**了，
而 TS 那边 `ForOfStatement.statement` 仍有一个空 `Block`。
**两端都在手上**（第 641 轮换成了 `TokenField`）⇒ 投影不必回原文配对。

## field HeaderCloseAt:int = -1

**头部那个 `)` 的下标**（第 634 轮，与 `For.HeaderCloseAt` / `While.HeaderCloseAt` 同一条）。

**为什么要有它**：`Process` 里那个括号**就在手上**（`conditionBracket`），
而投影原来拿 `ctx.MatchingParen(ctx.source, v.start)` **从 `for` 往后扫原文**——
同一件事的第二份近似（括号里的字符串与注释它一样会数）。
**只在「体段一个可见子单元都没有、也不是空块 / 空语句」那条兜底支里用它**。

## field IsForIn:bool = false

**声明与枚举对象之间那个词是 `in`**（`for (const k in o)`）时为 `true`，是 `of` 时为 `false`。

`Process` 切 Define / Enumable 时手里就有那个词（`conditionBracket.Data[defineEnd]`），
当场记下来；投影据此分 `ForInStatement` / `ForOfStatement`，不再回原文做正则
（见 `PrintDirectAst` 那段说明）。

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 995 轮）：与上面的 `PrintDirectAst` 出**同一个答案**，但只许用**这个 token 自己**的东西——
属性、子单元与 `Parent`（见 `core/syntax/token.xl.md` 的 `PrintDirectAst`）。

**换了什么**：三处 `ctx.TextOf` 换 `ctx.ValueOf`（声明词那四格与 `await` 都只读
那一格自己记的 `value`）。

**唯一让开的一处**：头部那个 `)` 的位置（`HeaderCloseAt`，收尾规则当场记的）**不在这一格上**时，
`PrintDirectAst` 会 `ctx.MatchingParen(ctx.source, v.start)` **回原文里配一次括号**——那正是直出版
不许有的第二份近似 ⇒ 答 `undefined`，交回它走那一条。

```ts
  const props: any = {};
  const define = ctx.KidsOf(v, "define").filter((k: any) => !ctx.Invisible.has(k.Tag()));
  if (define.length > 0) {
    if (define[0].Tag() === "Let") {
      props.initializer = ctx.LetFrom(define, v).list;
    }
    // **判据是段里有没有那个声明词**（第 982 轮）：直出版读那一格自己记的值。
    const isDeclareWordKid = (k: any) => {
      const text = ctx.ValueOf(k);
      return text === "const" || text === "let" || text === "var" || text === "using";
    };
    if (props.initializer === undefined) {
      if (define.some(isDeclareWordKid)) {
        const head = ctx.HeadDeclare(define, v);
        if (head !== undefined) props.initializer = head;
      } else {
        const asExpression = ctx.Expression(define);
        if (asExpression !== undefined) props.initializer = asExpression;
      }
    }
  }
  const enumable = ctx.KidsOf(v, "enumable").filter((k: any) => !ctx.Invisible.has(k.Tag()));
  if (enumable.length > 0) props.expression = ctx.Expression(enumable);
  const kind = v.isForIn === true ? "ForInStatement" : "ForOfStatement";
  const body = ctx.KidsOf(v, "body").filter((k: any) => !ctx.Invisible.has(k.Tag()));
  const rawEmpty = v.emptyBodyAt;
  const emptyAt = typeof rawEmpty === "number" ? rawEmpty : -1;
  let statement;
  if (emptyAt >= 0) {
    statement = { kind: "EmptyStatement", pos: emptyAt, end: emptyAt + 1 };
  } else {
    const rawHeader = v.headerCloseAt;
    const headerAt = typeof rawHeader === "number" ? rawHeader : -1;
    // **头部那个 `)` 的位置不在这一格上** ⇒ 交回 `PrintDirectAst`（它回原文里配一次括号）。
    if (headerAt < 0) {
      return undefined;
    }
    statement = ctx.BodyBlockOf(headerAt + 1, body, v.bodyBraceRange);
  }
  if (statement !== undefined) props.statement = statement;
  const awaitUnit = ctx.Kids(v).find(
    (k: any) => k.Tag() === "Keyword" && ctx.ValueOf(k) === "await",
  );
  if (kind === "ForOfStatement" && awaitUnit !== undefined) {
    props.awaitModifier = ctx.Project(awaitUnit);
  }
  return ctx.NodeHead(kind, props, v);
```

## constructor:(template:Template)=>void

转调基类构造器，**并且把它自己的队列装上**。

`for await (… of …)` 里的 `await` 是作为子单元留在 `Foreach` 里的（见 `Process`），
而本单元是重组造出来的——关闭时通用队列早跑完了（`KeywordCloseRule` 排在**最后**），
不补这一趟那个 `await` 就停在 `Identifier` 上（`st-for-await` 那条用例要的 `Keyword` 就是它）。

装的是一条精简队列（`KeywordCloseRule` + `WrapSymbolCloseRule`，
见 `../parse-pipeline.xl.md` 的 `InitialKeywordCloseRuleQueue`）——本单元的内容都是
已经收好的语句段，不该再跑一遍表达式 / 语句规则。

```ts
super(template);
ParsePipeline.InitialKeywordCloseRuleQueue(this);
```

## method CreateDefine:()=>ForeachDefine

新建 Define 段并挂到自己名下，返回新单元。

```ts
return this.Add(new ForeachDefine(this.Template));
```

## property Define:ForeachDefine

Define 段（`in` / `of` 左边那截）。

### get

```ts
return this.Data.find((x) => x instanceof ForeachDefine) as ForeachDefine;
```

## method CreateEnumable:()=>ForeachEnumable

新建 Enumable 段并挂到自己名下，返回新单元。

```ts
return this.Add(new ForeachEnumable(this.Template));
```

## property Enumable:ForeachEnumable

Enumable 段（`in` / `of` 右边那截）。

### get

```ts
return this.Data.find((x) => x instanceof ForeachEnumable) as ForeachEnumable;
```

## method CreateBody:()=>ForeachBody

新建 Body 段并挂到自己名下，返回新单元。

```ts
return this.Add(new ForeachBody(this.Template));
```

## property Body:ForeachBody

Body 段（循环体）。

### get

```ts
return this.Data.find((x) => x instanceof ForeachBody) as ForeachBody;
```

## property define:Array<any>

`ToDictionary` 的 `define` 键**由这一页自己承担**（第 1018 轮）：值取那一批子单元的节点数据。

### get

```ts
return this.ChildrenOf(this.Define);
```

## property enumable:Array<any>

`ToDictionary` 的 `enumable` 键**由这一页自己承担**（第 1018 轮）：值取那一批子单元的节点数据。

### get

```ts
return this.ChildrenOf(this.Enumable);
```

## property body:Array<any>

`ToDictionary` 的 `body` 键**由这一页自己承担**（第 1018 轮）：值取那一批子单元的节点数据。

### get

```ts
return this.ChildrenOf(this.Body);
```

## property emptyBodyAt:any

`ToDictionary` 的 `emptyBodyAt` 键**由这一页自己承担**（第 1018 轮）：值取这一页自己那一格事实。

### get

```ts
return this.EmptyBodyAt;
```

## property bodyBraceAt:any

`ToDictionary` 的 `bodyBraceAt` 键**由这一页自己承担**（第 1018 轮）：值取这一页自己那一格事实。

### get

```ts
return this.BodyBrace.File();
```

## property isForIn:any

`ToDictionary` 的 `isForIn` 键**由这一页自己承担**（第 1018 轮）：值取这一页自己那一格事实。

### get

```ts
return this.IsForIn;
```

## property headerCloseAt:any

`ToDictionary` 的 `headerCloseAt` 键**由这一页自己承担**（第 1018 轮）：值取这一页自己那一格事实。

### get

```ts
return this.HeaderCloseAt;
```

## property children:Array<any>

`ToDictionary` 的 `children` 键**由这一页自己承担**（第 1018 轮）：这一格是**按类型从子单元里筛出来的一批**，所以在这里逐项取节点数据。

### get

```ts
const result: Array<any> = [];
for (const item of this.Data) {
  if (item instanceof ForeachDefine || item instanceof ForeachEnumable || item instanceof ForeachBody) {
    continue;
  }
  result.push(item);
}
return result;
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 抄 `IsForIn` / `EmptyBodyAt` / `BodyBrace` / `HeaderCloseAt` → 克隆全部子单元 → `TryToClose()`。

```ts
const result = new Foreach(this.Template);
result.Sign(this);
result.IsForIn = this.IsForIn;
result.EmptyBodyAt = this.EmptyBodyAt;
result.BodyBrace = this.BodyBrace;
result.HeaderCloseAt = this.HeaderCloseAt;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
