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
import { ReplaceCountAt } from "../../../../core/extensions/list-extension.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Common } from "../common.xl.md"
import { NewArguments } from "./new-arguments.xl.md"
import { NewType } from "./new-type.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`new` 表达式：把 `new Foo(a, b)` 这一串单元重组成一个 `New`，里面分成 Type（`Foo`）与 Arguments（`(a, b)` 的内容）两段。

**注意 C# 侧的名字**：命名空间是 `Cangjie.Dawn.Text.Tokens.New`、类名也叫 `New`，所以别处会写成 `New.New.Reorganization`——那是「命名空间段 + 类名」，**不是嵌套类**。本文件里的顶层类就叫 `New`，展平出来的重组规则类叫 `NewReorganization`。

原 C# 侧的嵌套类 `New.Reorganization` 按 M32 展平成顶层 `NewReorganization`；它**不进 `Data`、不进 XML**，所以 ts 类名与 C# 的 `Type.Name` 不一致无害。反过来，`New` 本体的类名必须与 C# 完全一致，因为 XML 标签名取自 `this.constructor.name`（M17）。

# class NewReorganization extends Reorganization

重组规则：一个内容为 `new` 的 `Common`，连同它后面第一个 `Bracket` 之前的所有类型信息、以及那个括号，整段换成一个 `New`。

原 C# 是嵌套类 `New.Reorganization`（M32 展平改名）。

## static readonly field Instance:NewReorganization = new NewReorganization()

唯一的实例。原 C# 是静态属性 `public static Reorganization Instance { get; } = new();`，按 M19 落成静态只读字段，调用点形态不变。

## method Previous:(owner:IOwner, template:Template<string>, units:Array<Token<string>>, index:int)=>bool

`index` 处是不是本次重组的起点：一个内容为 `new` 的 `Common`。后面有没有括号由 `Process` 负责检查。

原 C# 是 `public override bool Previous(IOwner owner, Template<char> template, List<Token<char>> units, int index)`。按 M31，`char` 一律写 `string`；`units.Get` 是扩展方法，按 M11 改成模块级函数调用。

```ts
return Get(units, index) instanceof Common && (Get(units, index) as Common).Is("new");
```

## method Process:(owner:IOwner, template:Template<string>, units:Array<Token<string>>, index:int)=>int

执行重组：从 `index` 起向后找第一个 `Bracket`，把它之前的内容收进 Type 段、把括号内容搬进 Arguments 段，整段换成一个 `New`，**返回新的下标**。

原 C# 是 `public override void Process(IOwner owner, Template<char> template, List<Token<char>> units, ref int index)`，按 M15 改成返回值。

几处照抄的行为：

- 找不到括号时抛 `SyntaxException`（「new 后面没有找到括号」）；标签与内容都照抄原文。C# 用的是两参构造器 `new SyntaxException<char>(current.SourceRange, "…")`；按 M14(b) 该重载在 `SyntaxException` 里落成静态工厂 `SyntaxException.FromMessage`，所以 ts 侧走工厂（调用点形态变了，异常内容不变）。
- 括号本身也在这段范围内，`result` 的 `SignOut` 取的是**括号的终点**，所以 `new Foo(a)` 的 XML 范围覆盖到 `)`。
- `bracket.MoveDataTo(newArguments)` 把括号内容整体搬走，括号随后就不在单元列表里了（它被 `ReplaceAt` 换掉）。

```ts
const current = Get(units, index) as Common;
const bracketIndex = SearchBack(units, index + 1, (item) => item instanceof Bracket);
if (bracketIndex === -1) {
  throw SyntaxException.FromMessage(current.SourceRange, "new 后面没有找到括号");
}
const bracket = Get(units, bracketIndex) as Bracket;
const result = new New(owner, template);
result.Parent = current.Parent;
result.SignIn(current.SourceRange.Start!);
result.SignOut(bracket.SourceRange.End!);
const newType = result.CreateType();
newType.SignIn(current.SourceRange.Start!);
newType.SignOut(current.SourceRange.End!);
for (let i = index + 1; i < bracketIndex; i++) {
  newType.Add(Get(units, i)!);
}
const newArguments = result.CreateArguments();
newArguments.SignIn(bracket.SourceRange.Start!);
newArguments.SignOut(bracket.SourceRange.End!);
bracket.MoveDataTo(newArguments);
newType.TryToClose();
newArguments.TryToClose();
result.TryToClose();
return ReplaceCountAt(units, index, bracketIndex - index + 1, result);
```

# class New extends IndependentToken

`new` 表达式单元。

原 C# 侧是 `public class New : IndependentToken<char>`。按 M31，`char` 在规范里写 `string`。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<New>` 里依次是 Type 与 Arguments 两段的 XML。

## constructor:(owner:IOwner, template:Template<string>)=>void

原 C# 只是转调基类构造器。

```ts
super(owner, template);
```

## method CreateType:()=>NewType

新建 Type 段并挂到自己名下，返回新单元。

原 C# 是 `public NewType CreateType()`。

```ts
return this.Add(new NewType(this.Owner, this.Template));
```

## property Type:NewType

Type 段（被 `new` 的类型名，含命名空间与泛型实参）。

**注意与 ts 的 `constructor` 区分**：这里 `Type` 就是 C# 的属性名，与 M17 里 `GetType()` → `this.constructor` 的改写无关。

原 C# 是 `public NewType Type => (Data.Find(x => x is NewType) as NewType)!;`。

### get

```ts
return this.Data.find((x) => x instanceof NewType) as NewType;
```

## method CreateArguments:()=>NewArguments

新建 Arguments 段并挂到自己名下，返回新单元。

原 C# 是 `public NewArguments CreateArguments()`。

```ts
return this.Add(new NewArguments(this.Owner, this.Template));
```

## property Arguments:NewArguments

Arguments 段（括号里的实参）。

原 C# 是 `public NewArguments Arguments => (Data.Find(x => x is NewArguments) as NewArguments)!;`。

### get

```ts
return this.Data.find((x) => x instanceof NewArguments) as NewArguments;
```

## method ToDictionary:()=>Map<string, any>

转成字典：`type` 是运行时类型名，另外记下两段各自的 `ToList()`。

原 C# 是 `public override Dictionary<string, object> ToDictionary()`，键名是 `name`（不是 `type` 之外的第二层 `type`）与 `arguments`；`GetType().Name` 按 M17 写成 `this.constructor.name`。它**不走**基类版本，所以没有 `children` 键。

```ts
const result = new Map<string, any>();
result.set("type", this.constructor.name);
result.set("name", this.Type.ToList());
result.set("arguments", this.Arguments.ToList());
return result;
```

## method Clone:()=>Token<string>

克隆自身。

原 C# 是 `public override Token<char> Clone()`，顺序是 `Sign(this)` → `Add(Data.Select(item => item.Clone()))` → `TryToClose()`。`Add` 传的是**一批**克隆出来的子单元，按 M14(c) 用 `AddRange`（C# 的 `Add<T>(IEnumerable<T>)` 重载改名）。

```ts
const result = new New(this.Owner, this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
