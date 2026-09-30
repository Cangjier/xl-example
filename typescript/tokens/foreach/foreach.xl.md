# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { SyntaxException } from "../../../core/exceptions/syntax-exception.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get } from "../../../core/extensions/list-extension.xl.md"
import { SearchBack } from "../../../core/extensions/list-extension.xl.md"
import { GetSkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { GetSkipNext } from "../../../core/extensions/list-extension.xl.md"
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

重组规则类 `ForeachReorganization` **不进 `Data`、不进 XML**，所以它的类名随便取。反过来，`Foreach` 本体的类名**就是** XML 标签名（取自 `this.constructor.name`），不能改。

# class ForeachReorganization extends Reorganization

重组规则：`foreach` / `for` 加一对括号，括号里带 `in` 或 `of`，就整段换成一个 `Foreach`。

它是 `for` 的重组规则的**补集**：`ForReorganization` 只在括号里**没有** `in` / `of` 时命中，这里只在**有** `in` / `of` 时命中——两者靠这一点区分「C 风格 for」与「for-in / foreach」。

## static readonly field Instance:ForeachReorganization = new ForeachReorganization()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是本次重组的起点：一个内容为 `for` 或 `foreach` 的 `Identifier`，
**可选的一个 `await`**，紧跟（跳过 `LineWrap` 软换行）一个 `(` 开头的 `Bracket`，
且括号里至少有一个内容为 `in` 或 `of` 的 `Identifier`。

`await` 那一跳是给 `for await (const v of xs)` 的：异步迭代的 `await` 夹在 `for` 与括号之间，
不跳的话判定在这一步就断了、整条 `Foreach` 认不出来（`st-for-await` / `stmt-for-await` 两条用例）。
注意 `for` 与 `(` 之间只有 `await` 需要跳——`for (…)` 本身不能多跳。

```ts
const unit = Get(units, index);
if (!(unit instanceof Identifier)) {
  return false;
}
if (!(unit.Is("for") || unit.Is("foreach"))) {
  return false;
}
let next = GetSkipNextWrapSymbol(units, index);
if (next instanceof Identifier && next.Is("await")) {
  next = GetSkipNext(units, index, (item) => item instanceof LineWrap || (item instanceof Identifier && item.Is("await")));
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
currentIndex = SkipNextWrapSymbol(units, currentIndex);
const headUnit = Get(units, currentIndex);
let awaitUnit: Token | null = null;
if (headUnit instanceof Identifier && headUnit.Is("await")) {
  awaitUnit = headUnit;
  currentIndex = SkipNextWrapSymbol(units, currentIndex);
}
if (awaitUnit !== null) {
  result.AddAndCloseLast(awaitUnit);
}
const conditionBracket = Get(units, currentIndex) as Bracket;
const defineEnd = SearchBack(conditionBracket.Data, -1, (x) => IsWordUnit(x, "in") || IsWordUnit(x, "of"));
if (defineEnd === -1) {
  throw SyntaxException.FromMessage(conditionBracket.SourceRange, "foreach/for(...){...} 的`(...)`中语句不满足格式要求：`(... in/of ...)`");
}
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
currentIndex = SkipNextWrapSymbol(units, currentIndex);
const forBody = result.CreateBody();
const statementCandidate = Get(units, currentIndex);
if (statementCandidate instanceof Bracket && statementCandidate.startBracket === "{") {
  const statementBracket = statementCandidate;
  statementBracket.MoveDataTo(forBody);
  forBody.SignIn(statementBracket.SourceRange.Start!);
  forBody.SignOut(statementBracket.SourceRange.End!);
  endIndex = currentIndex;
} else {
  endIndex = Statement.SearchStatementEnd(units, currentIndex - 1);
  if (endIndex === -1) {
    throw SyntaxException.FromMessage(conditionBracket.SourceRange, "`foreach/for(...)` 后需要跟语句，如` foreach/for(...){...}` 或 `foreach/for(...)...;` ");
  }
  forBody.AddRange(units.slice(currentIndex, endIndex + 1));
  forBody.SignIn(Get(units, currentIndex)!.SourceRange.Start!);
  forBody.SignOut(Get(units, endIndex)!.SourceRange.End!);
}
forBody.TryToClose();
result.SignOut(Get(units, endIndex)!.SourceRange.End!);
result.TryToClose();
ReplaceCountAt(units, index, endIndex - startIndex + 1, result);
return index;
```

# class Foreach extends IndependentToken

`foreach` / `for...in` 语句单元。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<Foreach>` 里依次是 Define、Enumable、Body 三段的 XML。

## constructor:(template:Template)=>void

转调基类构造器，**并且把它自己的队列装上**。

`for await (… of …)` 里的 `await` 是作为子单元留在 `Foreach` 里的（见 `Process`），
而本单元是重组造出来的——关闭时通用队列早跑完了（`KeywordReorganization` 排在**最后**），
不补这一趟那个 `await` 就停在 `Identifier` 上（`st-for-await` 那条用例要的 `Keyword` 就是它）。

装的是一条精简队列（`KeywordReorganization` + `WrapSymbolReorganization`，
见 `../parse-pipeline.xl.md` 的 `InitialKeywordReorganizationQueue`）——本单元的内容都是
已经收好的语句段，不该再跑一遍表达式 / 语句规则。

```ts
super(template);
ParsePipeline.InitialKeywordReorganizationQueue(this);
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

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 克隆全部子单元 → `TryToClose()`。

```ts
const result = new Foreach(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
