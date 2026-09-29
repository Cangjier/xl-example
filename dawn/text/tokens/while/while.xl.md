# dependencies
```xl
import { IOwner } from "../../../../owners/i-owner.xl.md"
import { Get } from "../../../../core/extensions/list-extension.xl.md"
import { ReplaceCountAt } from "../../../../core/extensions/list-extension.xl.md"
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
import { WhileBody } from "./while-body.xl.md"
import { WhileCompare } from "./while-compare.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`while` 语句：把 `while` `(` … `)` `{` … `}` 这一串单元重组成一个 `While`，里面分成 Compare（条件括号整段）与 Body（后面那对 `{ }` 或单条语句）两段。

原 C# 侧的嵌套类 `While.Reorganization` 按 M32 展平成顶层 `WhileReorganization`；它**不进 `Data`、不进 XML**，所以 ts 类名与 C# 的 `Type.Name` 不一致无害。按 M33，它写在 `While` **之前**：`Instance` 这个静态字段在类定义时就会 `new WhileReorganization()`，被引用的类排在后面会命中 ts 的暂时性死区（TDZ）。

反过来，`While` 本体的类名必须与 C# 完全一致，因为 XML 标签名取自 `this.constructor.name`（M17）。

# class WhileReorganization extends Reorganization

重组规则：`while` 加一个 `(` 开头的括号，就整段换成一个 `While`。

原 C# 是嵌套类 `While.Reorganization`（M32 展平改名）。

## static readonly field Instance:WhileReorganization = new WhileReorganization()

唯一的实例。

原 C# 是静态属性 `public static Reorganization Instance { get; } = new();`——这里的 `Reorganization` 指的是嵌套的那个类本身，按「静态属性 → 静态只读字段」落成字段，调用点 `WhileReorganization.Instance` 的形态不变。

## method Previous:(owner:IOwner, template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是本次重组的起点。

判定照抄 C#：`Get(index)` 是内容为 `while` 的 `Common`，且 `GetSkipNextWrapSymbol(index)` 是 `StartBracketChar` 为 `(` 的 `Bracket`。C# 写成一句短路求值的合取，ts 侧保持同样的形态。

原 C# 是 `public override bool Previous(IOwner owner, Template<char> template, List<Token<char>> units, int index)`。按 M31，`char` 一律写 `string`；`units.Get` / `units.GetSkipNextWrapSymbol` 是扩展方法，按 M11 改成模块级函数调用。

```ts
const common = Get(units, index);
const bracket = GetSkipNextWrapSymbol(units, index);
return common instanceof Common && common.Is("while") && bracket instanceof Bracket && bracket.StartBracketChar === "(";
```

## method Process:(owner:IOwner, template:Template, units:Array<Token>, index:int)=>int

执行重组：把 `while` 头、条件括号、循环体收进一个 `While`，**返回新的下标**。

原 C# 是 `public override void Process(IOwner owner, Template<char> template, List<Token<char>> units, ref int index)`：它既改写 `units`，又通过 `ref` 推进外层循环的下标，按 M15 改成返回值。注意 C# 的方法体**从不给 `index` 赋值**，所以 ts 侧原样返回收到的 `index`——外层 `Token.Reorganize` 拿到它之后继续 `i++`，正好复现 C# 的循环步进。

两段的取法照抄原实现：

1. **Compare**：`while` 后面那个括号**整段**。先按括号自己的范围给 `compare` 签入签出，再 `MoveDataTo` 把括号的子单元全搬过来（C# 的顺序是签入 → 签出 → 搬内容 → `TryToClose`，照抄）。
2. **Body**：括号后面若是 `{` 开头的 `Bracket`，先搬内容再签入签出；否则从当前位置起用 `Statement.SearchStatementEnd` 找语句结尾（找不到就抛错），把那一段搬进来。

`throw new Exception(...)` 抛的是 BCL 的 `System.Exception`，按 M20 不进规范类型位，ts 侧落成 `throw new Error(...)`，语义（不被 `catch (SyntaxException)` 单独接住）保持一致。

`conditionBracket.Release()` 按 M23 只保留真正有副作用的清理（原 C# 在这里还清空 `Data` 并把若干字段置 `null`，置空交 GC 的部分不写）。

原 C# 的 `units.Skip(a).Take(n)` 是 LINQ，ts 侧落成 `TakeRange(self, a, n)`（对应 `Core/Extensions/ListExtension.cs` 的同名扩展方法），所以 `Skip(currentIndex).Take(endIndex - currentIndex + 1)` 写成 `TakeRange(units, currentIndex, endIndex - currentIndex + 1)`。

两处**照抄不补**的原实现痕迹：

- C# 里的局部变量 `keyIndex`（`var keyIndex = index;`）从头到尾没被用过，是死代码，ts 侧不声明它。
- 循环体那个局部变量在 C# 里叫 `forStatement`（`While.Process` 显然是从 `For.Process` 复制出来的），这里照抄这个名字。

```ts
const unit = Get(units, index)!;
const result = new While(owner, template);
result.Parent = unit.Parent;
result.SignIn(unit.SourceRange.Start!);
let endIndex = index;
endIndex = SkipNextWrapSymbol(units, endIndex);
const conditionBracket = Get(units, endIndex) as Bracket;
const compare = result.CreateCompare();
compare.SignIn(conditionBracket.SourceRange.Start!);
compare.SignOut(conditionBracket.SourceRange.End!);
conditionBracket.MoveDataTo(compare);
compare.TryToClose();
const startIndex = index;
endIndex = SkipNextWrapSymbol(units, endIndex);
const forStatement = result.CreateBody();
const statementCandidate = Get(units, endIndex);
if (statementCandidate instanceof Bracket && statementCandidate.StartBracketChar === "{") {
  const statementBracket = statementCandidate;
  statementBracket.MoveDataTo(forStatement);
  forStatement.SignIn(statementBracket.SourceRange.Start!);
  forStatement.SignOut(statementBracket.SourceRange.End!);
} else {
  const statementStart = endIndex;
  endIndex = Statement.SearchStatementEnd(units, endIndex - 1);
  if (endIndex === -1) {
    throw new Error("`while(...)` 后需要跟语句，如` while(...){...}` 或 `while(...)...;` ");
  }
  forStatement.AddRange(TakeRange(units, statementStart, endIndex - statementStart + 1));
  forStatement.SignIn(Get(units, statementStart)!.SourceRange.Start!);
  forStatement.SignOut(Get(units, endIndex)!.SourceRange.End!);
}
forStatement.TryToClose();
result.SignOut(Get(units, endIndex)!.SourceRange.End!);
result.TryToClose();
ReplaceCountAt(units, index, endIndex - startIndex + 1, result);
conditionBracket.Release();
return index;
```

# class While extends IndependentToken

`while` 语句单元。

原 C# 侧是 `public class While : IndependentToken<char>`。按 M31，`char` 在规范里写 `string`。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<While>` 里依次是 Compare、Body 两段的 XML。

## constructor:(owner:IOwner, template:Template)=>void

原 C# 只是转调基类构造器（`base(owner, template)`），没有自己的字段要初始化。注意 C# 的构造器参数名写成 `Template`（与字段同名），ts 侧按惯例用小写 `template`。

```ts
super(owner, template);
```

## method CreateCompare:()=>WhileCompare

新建 Compare 段并挂到自己名下，返回新单元。

原 C# 是 `public WhileCompare CreateCompare()`，体里是 `Add(new WhileCompare(Owner, Template))`。

```ts
return this.Add(new WhileCompare(this.Owner, this.Template));
```

## property Compare:WhileCompare

Compare 段（条件括号整段）。

原 C# 是 `public WhileCompare Compare => (Data.Find(x => x is WhileCompare) as WhileCompare)!;`——用 LINQ 的第一处类型匹配加强制转换，按 M18 换成 `instanceof` 判定。

### get

```ts
return this.Data.find((x) => x instanceof WhileCompare) as WhileCompare;
```

## method CreateBody:()=>WhileBody

新建 Body 段并挂到自己名下，返回新单元。

原 C# 是 `public WhileBody CreateBody()`，体里是 `Add(new WhileBody(Owner, Template))`。

```ts
return this.Add(new WhileBody(this.Owner, this.Template));
```

## property Body:WhileBody

Body 段（循环体）。

原 C# 是 `public WhileBody Body => (Data.Find(x => x is WhileBody) as WhileBody)!;`。

### get

```ts
return this.Data.find((x) => x instanceof WhileBody) as WhileBody;
```

## method ToDictionary:()=>Map<string, any>

转成字典：`type` 是运行时类型名，另外记下两段各自的 `ToList()`。

原 C# 是 `public override Dictionary<string, object> ToDictionary()`，键的顺序是 `type` / `compare` / `body`；`GetType().Name` 按 M17 写成 `this.constructor.name`。它**不走**基类版本，所以没有 `children` 键。

```ts
const result = new Map<string, any>();
result.set("type", this.constructor.name);
result.set("compare", this.Compare.ToList());
result.set("body", this.Body.ToList());
return result;
```

## method Clone:()=>Token

克隆自身。

原 C# 是 `public override Token<char> Clone()`，顺序是 `Sign(this)` → `Add(Data.Select(x => x.Clone()))` → `TryToClose()`。`Add` 传的是**一批**克隆出来的子单元，按 M14(c) 用 `AddRange`（C# 的 `Add<T>(IEnumerable<T>)` 重载改名）。

```ts
const result = new While(this.Owner, this.Template);
result.Sign(this);
result.AddRange(this.Data.map((x) => x.Clone()));
result.TryToClose();
return result;
```
