# dependencies
```xl
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../../core/syntax/reorganization.xl.md"
import { SyntaxException } from "../../../../core/exceptions/syntax-exception.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { Get } from "../../../../core/extensions/list-extension.xl.md"
import { SearchBack } from "../../../../core/extensions/list-extension.xl.md"
import { GetSkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { SkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { ReplaceCountAt } from "../../../../core/extensions/list-extension.xl.md"
import { TakeRange } from "../../../../core/extensions/list-extension.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Common } from "../common.xl.md"
import { Statement } from "../statement.xl.md"
import { ForeachBody } from "./foreach-body.xl.md"
import { ForeachDefine } from "./foreach-define.xl.md"
import { ForeachEnumable } from "./foreach-enumable.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`foreach` / `for...in` 语句：把 `foreach (x in xs) { ... }` 这一串单元重组成一个 `Foreach`，里面分成 Define（`x`）、Enumable（`xs`）、Body（`{ ... }` 或单条语句）三段。

重组规则类 `ForeachReorganization` **不进 `Data`、不进 XML**，所以它的类名随便取。反过来，`Foreach` 本体的类名**就是** XML 标签名（取自 `this.constructor.name`），不能改。

# class ForeachReorganization extends Reorganization

重组规则：`foreach` / `for` 加一对括号，括号里带 `in` 或 `of`，就整段换成一个 `Foreach`。

它是 `for` 的重组规则的**补集**：`ForReorganization` 只在括号里**没有** `in` / `of` 时命中，这里只在**有** `in` / `of` 时命中——两者靠这一点区分「C 风格 for」与「for-in / foreach」。

## static readonly field Instance:ForeachReorganization = new ForeachReorganization()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是本次重组的起点：一个内容为 `for` 或 `foreach` 的 `Common`，紧跟（跳过 `WrapSymbol` 软换行）一个 `(` 开头的 `Bracket`，且括号里至少有一个内容为 `in` 或 `of` 的 `Common`。

```ts
const unit = Get(units, index);
if (!(unit instanceof Common)) {
  return false;
}
if (!(unit.Is("for") || unit.Is("foreach"))) {
  return false;
}
const next = GetSkipNextWrapSymbol(units, index);
if (!(next instanceof Bracket)) {
  return false;
}
const bracket = next;
return bracket.StartBracketChar === "(" && bracket.Data.some((item) => item instanceof Common && ((item as Common).Is("in") || (item as Common).Is("of")));
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

执行重组：把 `foreach` / `for` 头连同条件括号与语句体收进一个 `Foreach`，**返回新的下标**。

重组把多个子单元换成一个，下标必须跟着走。末尾 `ReplaceCountAt` 把从 `index` 起的这一整段单元换成一个 `Foreach`。

三分段的取法：

1. **Define**（`x`）：括号内**最后一个** `in` / `of` 所在位置之前的内容。找不到就抛 `SyntaxException`。
2. **Enumable**（`xs`）：上述位置之后到括号末尾。位置后面没有内容时同样抛 `SyntaxException`。
3. **Body**：括号后面若是 `{` 开头的 `Bracket`，把它整块搬进来；否则从当前位置起找语句结尾（`Statement.SearchStatementEnd`）。找不到结尾时抛 `SyntaxException`。

顺序取前面一段用 `TakeRange`（取出不移除）：`Take(n)` 即 `TakeRange(self, 0, n)`。注意 `defineEnd == -1` 这条路径上会切出空数组、不抛错。

三处抛错走静态工厂 `SyntaxException.FromMessage`，把范围与消息一起带上。

```ts
const current = Get(units, index)!;
const result = new Foreach(template);
result.Parent = current.Parent;
result.SignIn(current.SourceRange.Start!);
let currentIndex = index;
currentIndex = SkipNextWrapSymbol(units, currentIndex);
const conditionBracket = Get(units, currentIndex) as Bracket;
const defineEnd = SearchBack(conditionBracket.Data, -1, (x) => x instanceof Common && ((x as Common).Is("in") || (x as Common).Is("of")));
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
if (statementCandidate instanceof Bracket && statementCandidate.StartBracketChar === "{") {
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

转调基类构造器。

```ts
super(template);
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
