# dependencies
```xl
import { Get } from "../../../../core/extensions/list-extension.xl.md"
import { ReplaceCountAt } from "../../../../core/extensions/list-extension.xl.md"
import { SearchBack } from "../../../../core/extensions/list-extension.xl.md"
import { TakeRange } from "../../../../core/extensions/list-extension.xl.md"
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { GetSkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { SkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Common } from "../common.xl.md"
import { Statement } from "../statement.xl.md"
import { Symbol } from "../symbol.xl.md"
import { ForBody } from "./for-body.xl.md"
import { ForCompare } from "./for-compare.xl.md"
import { ForInitial } from "./for-initial.xl.md"
import { ForNext } from "./for-next.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

C 风格 `for` 语句：把 `for` `(` … `)` `{` … `}` 这一串单元重组成一个 `For`，里面分成 Initial（第一个 `;` 之前）、Compare（两个 `;` 之间）、Next（第二个 `;` 之后到右括号）、Body（后面那对 `{ }` 或单条语句）四段。

它和 `Foreach` 的重组规则互为补集：这里只在括号里**没有** `in` / `of` 时命中，`foreach` / `for...in` 那边只在**有**时命中——两者靠这一点区分「C 风格 for」与「for-in」。

原 C# 侧的嵌套类 `For.Reorganization` 按 M32 展平成顶层 `ForReorganization`；它**不进 `Data`、不进 XML**，所以 ts 类名与 C# 的 `Type.Name` 不一致无害。按 M33，它写在 `For` **之前**：`Instance` 这个静态字段在类定义时就会 `new ForReorganization()`，被引用的类排在后面会命中 ts 的暂时性死区（TDZ）。

反过来，`For` 本体的类名必须与 C# 完全一致，因为 XML 标签名取自 `this.constructor.name`（M17）。

# class ForReorganization extends Reorganization

重组规则：`for` 加一个 `(` 开头、且里面**没有** `in` / `of` 的括号，就把这整段换成一个 `For`。

原 C# 是嵌套类 `For.Reorganization`（M32 展平改名）。

## static readonly field Instance:ForReorganization = new ForReorganization()

唯一的实例。

原 C# 是静态属性 `public static Reorganization Instance { get; } = new();`——这里的 `Reorganization` 指的是嵌套的那个类本身，按「静态属性 → 静态只读字段」落成字段，调用点 `ForReorganization.Instance` 的形态不变。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是本次重组的起点。

三段判定照抄 C#：`Get(index)` 是内容为 `for` 的 `Common`；`GetSkipNextWrapSymbol(index)` 是 `StartBracketChar` 为 `(` 的 `Bracket`；且括号里**没有**任何内容为 `in` / `of` 的 `Common`。任一条不成立就返回 `false`。

原 C# 是 `public override bool Previous(IOwner owner, Template<char> template, List<Token<char>> units, int index)`。按 M31，`char` 一律写 `string`；`units.Get` / `units.GetSkipNextWrapSymbol` 是扩展方法，按 M11 改成模块级函数调用。

```ts
const common = Get(units, index);
if (common instanceof Common && common.Is("for")) {
  const bracket = GetSkipNextWrapSymbol(units, index);
  if (bracket instanceof Bracket && bracket.StartBracketChar === "(") {
    return bracket.Data.some((item) => item instanceof Common && (item.Is("in") || item.Is("of"))) === false;
  }
}
return false;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

执行重组：把 `for` 头、条件括号、循环体收进一个 `For`，**返回新的下标**。

原 C# 是 `public override void Process(IOwner owner, Template<char> template, List<Token<char>> units, ref int index)`：它既改写 `units`，又通过 `ref` 推进外层循环的下标，按 M15 改成返回值。注意 C# 的方法体**从不给 `index` 赋值**，所以 ts 侧原样返回收到的 `index`——外层 `Token.Reorganize` 拿到它之后继续 `i++`，正好复现 C# 的循环步进。

四段的取法照抄原实现：

1. **Initial**：括号内**第一个** `;` 之前。用 `SearchBack(-1, …)` 从括号开头向后找；找不到就抛错。
2. **Compare**：第一个 `;` 之后到**第二个** `;` 之前。第二个 `;` 用 `SearchBack(initialEnd, …)` 接着找；找不到就抛错。
3. **Next**：第二个 `;` 之后到最后一个单元。`compareEnd + 1 < Data.length` 时连签入签出带搬内容；否则**只签入签出、不搬内容**（括号里以 `;` 收尾的那种写法）。
4. **Body**：括号后面若是 `{` 开头的 `Bracket`，先把它整块搬进来再签入签出；否则从当前位置起用 `Statement.SearchStatementEnd` 找语句结尾（找不到就抛错），把那一段搬进来。

三处 `throw new Exception(...)` 抛的是 BCL 的 `System.Exception`，按 M20 不进规范类型位，ts 侧落成 `throw new Error(...)`，语义（不被 `catch (SyntaxException)` 单独接住）保持一致。

原 C# 的 `Data.Take(n)` / `Data.Skip(a).Take(n)` 是 LINQ，ts 侧统一落成 `TakeRange(self, a, n)`（对应 `Core/Extensions/ListExtension.cs` 的同名扩展方法；`Take(n)` 即 `TakeRange(self, 0, n)`）。

有一处**原实现的疑似遗漏**照抄不补：`next` 段在 C# 里**没有**调 `TryToClose()`（Initial / Compare / Body 都调了），这里保持不调。

```ts
const unit = Get(units, index)!;
const result = new For(template);
result.Parent = unit.Parent;
result.SignIn(unit.SourceRange.Start!);
let currentIndex = index;
currentIndex = SkipNextWrapSymbol(units, currentIndex);
const conditionBracket = Get(units, currentIndex) as Bracket;
const initialEnd = SearchBack(conditionBracket.Data, -1, (x) => x instanceof Symbol && x.Is(";"));
if (initialEnd === -1) {
  throw new Error("for(...){...} 的`(...)`中语句不满足格式要求：`(initial...;compare...;step...)`");
}
const initial = result.CreateInitial();
initial.SignIn(conditionBracket.Data[0].SourceRange.Start!);
initial.SignOut(conditionBracket.Data[initialEnd].SourceRange.End!);
initial.AddRange(TakeRange(conditionBracket.Data, 0, initialEnd));
initial.TryToClose();
const compareEnd = SearchBack(conditionBracket.Data, initialEnd, (x) => x instanceof Symbol && x.Is(";"));
if (compareEnd === -1) {
  throw new Error("for(...){...} 的`(...)`中语句不满足格式要求：`(initial...;compare...;step...)`");
}
const compare = result.CreateCompare();
compare.SignIn(conditionBracket.Data[initialEnd + 1].SourceRange.Start!);
compare.SignOut(conditionBracket.Data[compareEnd].SourceRange.End!);
compare.AddRange(TakeRange(conditionBracket.Data, initialEnd + 1, compareEnd - (initialEnd + 1)));
compare.TryToClose();
const nextEnd = conditionBracket.Data.length - 1;
const next = result.CreateNext();
if (compareEnd + 1 < conditionBracket.Data.length) {
  next.SignIn(conditionBracket.Data[compareEnd + 1].SourceRange.Start!);
  next.SignOut(conditionBracket.Data[nextEnd].SourceRange.End!);
  next.AddRange(TakeRange(conditionBracket.Data, compareEnd + 1, nextEnd - (compareEnd + 1) + 1));
} else {
  next.SignIn(conditionBracket.Data[nextEnd].SourceRange.Start!);
  next.SignOut(conditionBracket.Data[nextEnd].SourceRange.End!);
}
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
    throw new Error("`for(...)` 后需要跟语句，如` for(...){...}` 或 `for(...)...;` ");
  }
  forBody.AddRange(TakeRange(units, currentIndex, endIndex - currentIndex + 1));
  forBody.SignIn(Get(units, currentIndex)!.SourceRange.Start!);
  forBody.SignOut(Get(units, endIndex)!.SourceRange.End!);
}
forBody.TryToClose();
result.SignOut(Get(units, endIndex)!.SourceRange.End!);
result.TryToClose();
ReplaceCountAt(units, index, endIndex - startIndex + 1, result);
return index;
```

# class For extends IndependentToken

C 风格 `for` 语句单元。

原 C# 侧是 `public class For : IndependentToken<char>`。按 M31，`char` 在规范里写 `string`。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<For>` 里依次是 Initial、Compare、Next、Body 四段的 XML。

## constructor:(template:Template)=>void

原 C# 只是转调基类构造器（`base(owner, template)`），没有自己的字段要初始化。

```ts
super(template);
```

## method CreateInitial:()=>ForInitial

新建 Initial 段并挂到自己名下，返回新单元。

原 C# 是 `public ForInitial CreateInitial()`，体里是 `Add(new ForInitial(Owner, Template))`。

```ts
return this.Add(new ForInitial(this.Template));
```

## property Initial:ForInitial

Initial 段（第一个 `;` 之前那截）。

原 C# 是 `public ForInitial Initial => (Data.Find(x => x is ForInitial) as ForInitial)!;`——用 LINQ 的第一处类型匹配加强制转换，按 M18 换成 `instanceof` 判定。

### get

```ts
return this.Data.find((x) => x instanceof ForInitial) as ForInitial;
```

## method CreateCompare:()=>ForCompare

新建 Compare 段并挂到自己名下，返回新单元。

原 C# 是 `public ForCompare CreateCompare()`，体里是 `Add(new ForCompare(Owner, Template))`。

```ts
return this.Add(new ForCompare(this.Template));
```

## property Compare:ForCompare

Compare 段（两个 `;` 之间那截）。

原 C# 是 `public ForCompare Compare => (Data.Find(x => x is ForCompare) as ForCompare)!;`。

### get

```ts
return this.Data.find((x) => x instanceof ForCompare) as ForCompare;
```

## method CreateBody:()=>ForBody

新建 Body 段并挂到自己名下，返回新单元。

原 C# 是 `public ForBody CreateBody()`，体里是 `Add(new ForBody(Owner, Template))`。

```ts
return this.Add(new ForBody(this.Template));
```

## property Body:ForBody

Body 段（循环体）。

原 C# 是 `public ForBody Body => (Data.Find(x => x is ForBody) as ForBody)!;`。

### get

```ts
return this.Data.find((x) => x instanceof ForBody) as ForBody;
```

## method CreateNext:()=>ForNext

新建 Next 段并挂到自己名下，返回新单元。

原 C# 是 `public ForNext CreateNext()`，体里是 `Add(new ForNext(Owner, Template))`。

```ts
return this.Add(new ForNext(this.Template));
```

## property Next:ForNext

Next 段（第二个 `;` 之后那截）。

原 C# 是 `public ForNext Next => (Data.Find(x => x is ForNext) as ForNext)!;`。

### get

```ts
return this.Data.find((x) => x instanceof ForNext) as ForNext;
```

## method ToDictionary:()=>Map<string, any>

转成字典：`type` 是运行时类型名，另外记下四段各自的 `ToList()`。

原 C# 是 `public override Dictionary<string, object> ToDictionary()`，键的顺序是 `type` / `initial` / `compare` / `next` / `body`；`GetType().Name` 按 M17 写成 `this.constructor.name`。它**不走**基类版本，所以没有 `children` 键。

```ts
const result = new Map<string, any>();
result.set("type", this.constructor.name);
result.set("initial", this.Initial.ToList());
result.set("compare", this.Compare.ToList());
result.set("next", this.Next.ToList());
result.set("body", this.Body.ToList());
return result;
```

## method Clone:()=>Token

克隆自身。

原 C# 是 `public override Token<char> Clone()`，顺序是 `Sign(this)` → `Add(Data.Select(x => x.Clone()))` → `TryToClose()`。`Add` 传的是**一批**克隆出来的子单元，按 M14(c) 用 `AddRange`（C# 的 `Add<T>(IEnumerable<T>)` 重载改名）。

```ts
const result = new For(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((x) => x.Clone()));
result.TryToClose();
return result;
```
