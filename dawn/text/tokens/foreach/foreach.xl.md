# dependencies
```xl
import { IOwner } from "../../../../owners/i-owner.xl.md"
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

原 C# 侧的嵌套类 `Foreach.Reorganization` 按 M32 展平成顶层 `ForeachReorganization`；它**不进 `Data`、不进 XML**，所以 ts 类名与 C# 的 `Type.Name` 不一致无害。反过来，`Foreach` 本体的类名必须与 C# 完全一致，因为 XML 标签名取自 `this.constructor.name`（M17）。

# class ForeachReorganization extends Reorganization

重组规则：`foreach` / `for` 加一对括号，括号里带 `in` 或 `of`，就整段换成一个 `Foreach`。

原 C# 是嵌套类 `Foreach.Reorganization`（M32 展平改名）。

它是 `for` 的重组规则的**补集**：`Dawn/Text/Tokens/For/For.cs` 里的 `For.Reorganization` 只在括号里**没有** `in` / `of` 时命中，这里只在**有** `in` / `of` 时命中——两者靠这一点区分「C 风格 for」与「for-in / foreach」。

## static readonly field Instance:ForeachReorganization = new ForeachReorganization()

唯一的实例。原 C# 是静态属性 `public static Reorganization Instance { get; } = new();`，按 M19 落成静态只读字段，调用点形态不变。

## method Previous:(owner:IOwner, template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是本次重组的起点：一个内容为 `for` 或 `foreach` 的 `Common`，紧跟（跳过 `WrapSymbol` 软换行）一个 `(` 开头的 `Bracket`，且括号里至少有一个内容为 `in` 或 `of` 的 `Common`。

原 C# 是 `public override bool Previous(IOwner owner, Template<char> template, List<Token<char>> units, int index)`。按 M31，`char` 一律写 `string`；`units.Get` / `units.GetSkipNextWrapSymbol` 是扩展方法，按 M11 改成模块级函数调用。

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

## method Process:(owner:IOwner, template:Template, units:Array<Token>, index:int)=>int

执行重组：把 `foreach` / `for` 头连同条件括号与语句体收进一个 `Foreach`，**返回新的下标**。

原 C# 是 `public override void Process(IOwner owner, Template<char> template, List<Token<char>> units, ref int index)`：它既改写 `units`，又通过 `ref` 推进外层循环的下标，按 M15 改成返回值；方法体末尾的 `units.ReplaceAt(index, bracketIndex - index + 1, result)` 会把这批单元换成一个 `Foreach`。

`conditionBracket.Release()` 按 M23 只保留真正有副作用的清理（原 C# 在这里还清空 `Data` 并把若干字段置 `null`，置空交 GC 的部分不写）。

三分段的取法照抄原实现：

1. **Define**（`x`）：括号内**最后一个** `in` / `of` 所在位置之前的内容。找不到就抛 `SyntaxException`。
2. **Enumable**（`xs`）：上述位置之后到括号末尾。位置后面没有内容时同样抛 `SyntaxException`。
3. **Body**：括号后面若是 `{` 开头的 `Bracket`，把它整块搬进来；否则从当前位置起找语句结尾（`Statement.SearchStatementEnd`）。找不到结尾时抛 `SyntaxException`。

原 C# 的 `define.Add(conditionBracket.Data.Take(defineEnd))` 与 `for` 的重组逻辑一致；顺序取前面一段用 `TakeRange`（按 M14(a)，C# 的 `Skip(...).Take(...)` 与 `Take(...)` 在 ts 侧都落成区间取值，`Take(n)` 即 `TakeRange(self, 0, n)`）。注意 `defineEnd == -1` 这条路径上 `Take(-1)` 会返回空数组、不抛错——与 C# 的 `Take(-1)`（同样返回空序列）行为一致。

三处抛错在 C# 里用的是两参构造器 `new SyntaxException<char>(conditionBracket.SourceRange, "…")`；按 M14(b) 该重载在 `SyntaxException` 里落成静态工厂 `SyntaxException.FromMessage`，所以 ts 侧走工厂（调用点形态变了，异常内容不变）。

```ts
const current = Get(units, index)!;
const result = new Foreach(owner, template);
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
conditionBracket.Release();
return index;
```

# class Foreach extends IndependentToken

`foreach` / `for...in` 语句单元。

原 C# 侧是 `public class Foreach : IndependentToken<char>`。按 M31，`char` 在规范里写 `string`。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<Foreach>` 里依次是 Define、Enumable、Body 三段的 XML。

## constructor:(owner:IOwner, template:Template)=>void

原 C# 只是转调基类构造器。

```ts
super(owner, template);
```

## method CreateDefine:()=>ForeachDefine

新建 Define 段并挂到自己名下，返回新单元。

原 C# 是 `public ForeachDefine CreateDefine()`。

```ts
return this.Add(new ForeachDefine(this.Owner, this.Template));
```

## property Define:ForeachDefine

Define 段（`in` / `of` 左边那截）。

原 C# 是 `public ForeachDefine Define => (Data.Find(x => x is ForeachDefine) as ForeachDefine)!;`——用 LINQ 的第一处类型匹配，按 M18 换成 `instanceof` 判定。

### get

```ts
return this.Data.find((x) => x instanceof ForeachDefine) as ForeachDefine;
```

## method CreateEnumable:()=>ForeachEnumable

新建 Enumable 段并挂到自己名下，返回新单元。

原 C# 是 `public ForeachEnumable CreateEnumable()`。

```ts
return this.Add(new ForeachEnumable(this.Owner, this.Template));
```

## property Enumable:ForeachEnumable

Enumable 段（`in` / `of` 右边那截）。

### get

```ts
return this.Data.find((x) => x instanceof ForeachEnumable) as ForeachEnumable;
```

## method CreateBody:()=>ForeachBody

新建 Body 段并挂到自己名下，返回新单元。

原 C# 是 `public ForeachBody CreateBody()`。

```ts
return this.Add(new ForeachBody(this.Owner, this.Template));
```

## property Body:ForeachBody

Body 段（循环体）。

### get

```ts
return this.Data.find((x) => x instanceof ForeachBody) as ForeachBody;
```

## method ToDictionary:()=>Map<string, any>

转成字典：`type` 是运行时类型名，另外记下三段各自的 `ToList()`。

原 C# 是 `public override Dictionary<string, object> ToDictionary()`；`GetType().Name` 按 M17 写成 `this.constructor.name`。它**不走**基类版本，所以没有 `children` 键。

```ts
const result = new Map<string, any>();
result.set("type", this.constructor.name);
result.set("define", this.Define.ToList());
result.set("enumable", this.Enumable.ToList());
result.set("body", this.Body.ToList());
return result;
```

## method Clone:()=>Token

克隆自身。

原 C# 是 `public override Token<char> Clone()`，顺序是 `Sign(this)` → `Add(Data.Select(item => item.Clone()))` → `TryToClose()`。`Add` 传的是**一批**克隆出来的子单元，按 M14(c) 用 `AddRange`（C# 的 `Add<T>(IEnumerable<T>)` 重载改名）。

```ts
const result = new Foreach(this.Owner, this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
