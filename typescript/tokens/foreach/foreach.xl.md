# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../../core/syntax/close-rule.xl.md"
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

收尾规则类 `ForeachCloseRule` **不进 `Data`、不进 XML**，所以它的类名随便取。反过来，`Foreach` 本体的类名**就是** XML 标签名（取自 `this.constructor.name`），不能改。

# class ForeachCloseRule extends CloseRule

收尾规则：`foreach` / `for` 加一对括号，括号里带 `in` 或 `of`，就整段换成一个 `Foreach`。

它是 `for` 的收尾规则的**补集**：`ForCloseRule` 只在括号里**没有** `in` / `of` 时命中，这里只在**有** `in` / `of` 时命中——两者靠这一点区分「C 风格 for」与「for-in / foreach」。

## static readonly field Instance:ForeachCloseRule = new ForeachCloseRule()

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
// **体是那条空语句（`foreach/for (…);`）**（第 590 轮）：判出来之后记在单元上（见 `EmptyBodyAt`）。
let emptyBody = false;
currentIndex = SkipNextWrapSymbol(units, currentIndex);
const forBody = result.CreateBody();
// **体那一格的右端**（与 `for` / `while` 同一处口径 ✓）：两个分支各自赋值 ✓。
let tailEnd = current.SourceRange.End!;
const statementCandidate = Get(units, currentIndex);
if (statementCandidate instanceof Bracket && statementCandidate.startBracket === "{") {
  const statementBracket = statementCandidate;
  statementBracket.MoveDataTo(forBody);
  forBody.SignIn(statementBracket.SourceRange.Start!);
  forBody.SignOut(statementBracket.SourceRange.End!);
  tailEnd = statementBracket.SourceRange.End!;
  endIndex = currentIndex;
} else {
  endIndex = Statement.SearchStatementEnd(units, currentIndex - 1);
  if (endIndex === -1) {
    // **体一直写到输入末尾**（第 63 轮补）：没有 `;`、文件又正好在这里结束时，
    // `SearchStatementEnd` 给不出结尾——那是语句写完了，不是语法错误。
    endIndex = Statement.LastMeaningfulIndex(units, currentIndex);
  }
  // **空体：`foreach/for (…);`**（第 589 轮 ✓，与 `for.xl.md` 那一处一字不差 ✓）：
  // 规则由 `;` 触发，而那一刻 `;` 还没进 `units` ⇒ 两个找尾的都给 `-1`。
  // 体为空、`endIndex` 退到 `)` 那一格；`;` 由投影侧按原文补成 `EmptyStatement`。
  if (endIndex === -1) {
    endIndex = currentIndex - 1;
    emptyBody = true;
  }
  if (endIndex >= currentIndex) {
    forBody.AddRange(units.slice(currentIndex, endIndex + 1));
    forBody.SignIn(Get(units, currentIndex)!.SourceRange.Start!);
  } else {
    forBody.SignIn(Get(units, endIndex)!.SourceRange.End!);
  }
  // **体是单语句时，尾分号要算进来** ✓（与 `for` 第 572 轮那一处同一条口径 ✓）：
  // `;` 被 `Statement.FormFrom` **切进壳体的区间**、却不放进 `Data` ✗
  // ⇒ `Get(units, endIndex).SourceRange.End` 比 TS 少一格 ✓。
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

## field EmptyBodyAt:int = -1

**体是那条空语句（`foreach/for (…);`）时，那个 `;` 的下标**；不是这一档就是 `-1`。

与 `For.EmptyBodyAt` / `While.EmptyBodyAt` 同一个来由：判据只在收尾规则那一处算得起，
投影只读一次（见 `PrintAst`），不再拿 `MatchingParen` + `BodyBlockOf` 重扫原文。

## method PrintAst:(ctx:any, v:any)=>any

`for (const x of xs) { … }` / `for (const k in o) { … }` → `ForOfStatement` / `ForInStatement`
（**从 `ts-ast.xl.md` 的 `projectForeach` 搬来**，第 185 轮）。

**`of` 与 `in` 产物里没有记号**（`Foreach` 只有 `define` / `enumable` / `body` 三个段），
所以按**原文**分辨：声明与枚举对象之间那一截里有 `in` 就是 `ForInStatement`。

**`for await (… of …)` 的 `awaitModifier`**（第 174 轮）：TS 的 `ForOfStatement` 在
`for` 与 `(` 之间有一个 `AwaitKeyword` 子节点（`awaitModifier`），而产物把它记成一个
平级的 `Keyword(await)`（见上面构造器那段说明）。判据用**子单元**而不是原文：
`header` 拿到的是配对的 `)`，从它切不出 `for` 与 `(` 之间那一段。

```ts
  const props: any = {};
  const define = ctx.KidsOf(v, "define").filter((k: any) => !ctx.Invisible.has(k.get("type")));
  if (define.length > 0) {
    // **没有 `Let` 的那一档**（第 545 轮 ✓）：`for (const v of xs)` 的声明段在产物里是
    // `[Keyword(const), Identifier(v)]` 两格平铺 ✗ —— 解析期的 `LetBranch` 只在
    // `=` / `:` / `;` / `,` / 换行那几格进门 ✓，`of` / `in` 不在其中 ✗。
    // TS 那边 `initializer` 同样是 `VariableDeclarationList` ✓（不套 `VariableStatement` ✓），
    // 所以现造一个 ✓（见 `print-ast-common.xl.md` 的 `projectHeadDeclare` ✓）。
    if (define[0].get("type") === "Let") {
      props.initializer = ctx.LetFrom(define, v).list;
    } else {
      const head = ctx.HeadDeclare(define, v);
      if (head !== undefined) props.initializer = head;
    }
  }
  const enumable = ctx.KidsOf(v, "enumable").filter((k: any) => !ctx.Invisible.has(k.get("type")));
  if (enumable.length > 0) props.expression = ctx.Expression(enumable);
  const from = define.length > 0 ? ctx.EndOf(define[define.length - 1]) : v.start;
  const to = enumable.length > 0 ? ctx.StartOf(enumable[0]) : v.end;
  const kind = /\bin\b/.test(ctx.source.slice(from, to)) ? "ForInStatement" : "ForOfStatement";
  const body = ctx.KidsOf(v, "body").filter((k: any) => !ctx.Invisible.has(k.get("type")));
  // **空体那一格先读 token 上的字段**（第 590 轮，与 `for` / `while` 同一条）：
  // 有它就不必配对括号 + 扫原文。
  const rawEmpty = v.attrs !== undefined && typeof v.attrs.get === "function"
    ? v.attrs.get("emptyBodyAt")
    : undefined;
  const emptyAt = typeof rawEmpty === "number" ? rawEmpty : -1;
  let statement;
  if (emptyAt >= 0) {
    statement = { kind: "EmptyStatement", pos: emptyAt, end: emptyAt + 1 };
  } else {
    const header = ctx.MatchingParen(ctx.source, v.start);
    statement = ctx.BodyBlockOf(header < 0 ? v.start : header + 1, body);
  }
  if (statement !== undefined) props.statement = statement;
  const awaitUnit = ctx.Kids(v).find(
    (k: any) => k.get("type") === "Keyword" && ctx.TextOf(k) === "await",
  );
  if (kind === "ForOfStatement" && awaitUnit !== undefined) {
    props.awaitModifier = ctx.Project(awaitUnit);
  }
  // **坐标在前**（第 199 轮）：搬家前这里是 `{ kind, pos: v.start, end: v.end, ...props }`
  // （两种 kind 一个写法），键序是 `samples` 逐字节比的那一项。
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

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + `define` / `enumable` / `body` 三个**具名分段** + 余下的子单元。

`Foreach` 在 XML 里不写属性（`<Foreach>` 只有子单元的串接），但它的子单元是三条各有名字的段：
`define` 是 `in` / `of` 左边那截、`enumable` 是右边那截、`body` 是循环体。JSON 侧显式写出段名。

三段的值都取 `ToList()` 而不是 `ToDictionary()`：段是**一批子单元**的容器，
而 `ToDictionary()` 是给**单个**节点用的。摊成扁平的 `children` 会让左值与可枚举对象之间的
边界消失——那正好就是 `define` 与 `enumable` 的分别。

**`children` 装的是三条段之外的子单元**，`await` 就是其中之一：`for await (x of xs)` 里那个
`await` 是直接挂在 `Foreach` 上的（见 `Process` 里 `result.AddAndCloseLast(awaitUnit)`），
不属于任何一条段。**不收它 JSON 就会比 XML 少一个节点**——这类「段没覆盖到的子单元」
是分段写法唯一的漏点，所以这里按「不属于三条段的那些」兜底收一遍。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
result.set("define", this.Define.ToList());
result.set("enumable", this.Enumable.ToList());
result.set("body", this.Body.ToList());
result.set("emptyBodyAt", this.EmptyBodyAt);
const children: Array<any> = [];
for (const item of this.Data) {
  if (item instanceof ForeachDefine || item instanceof ForeachEnumable || item instanceof ForeachBody) {
    continue;
  }
  children.push(item.ToDictionary());
}
if (children.length !== 0) {
  result.set("children", children);
}
return result;
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
