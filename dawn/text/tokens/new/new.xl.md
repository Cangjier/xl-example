# dependencies
```xl
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../../core/syntax/reorganization.xl.md"
import { SyntaxException } from "../../../../core/exceptions/syntax-exception.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { Get } from "../../../../core/extensions/list-extension.xl.md"
import { SearchBack } from "../../../../core/extensions/list-extension.xl.md"
import { ReplaceCountAt } from "../../../../core/extensions/list-extension.xl.md"
import { GetSkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Common } from "../common.xl.md"
import { NewArguments } from "./new-arguments.xl.md"
import { NewType } from "./new-type.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`new` 表达式：把 `new Foo(a, b)` 这一串单元重组成一个 `New`，里面分成 Type（`Foo`）与 Arguments（`(a, b)` 的内容）两段。

重组规则类 `NewReorganization` **不进 `Data`、不进 XML**，所以它的类名随便取。反过来，`New` 本体的类名**就是** XML 标签名（取自 `this.constructor.name`），不能改。

# class NewReorganization extends Reorganization

重组规则：一个内容为 `new` 的 `Common`，连同它后面第一个 `Bracket` 之前的所有类型信息、以及那个括号，整段换成一个 `New`。

## static readonly field Instance:NewReorganization = new NewReorganization()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是本次重组的起点：一个内容为 `new` 的 `Common`，**并且后面紧跟一个类型名**（`Common`）。
后面有没有括号由 `Process` 负责检查。

判定里多加了「后面紧跟类型名」这一条。原因：TypeScript 的类型位置里有
**构造签名** `new () => T`（`lib.es5.d.ts` 的 `Function.apply` / `CallableFunction` 里就有），
那里 `new` 后面直接跟括号，没有类型名。只认 `new` 这个词会一口认下，随后 `Process` 找不到「类型名」
就抛 `SyntaxException`——整个文件解析失败。加上这一条，`new () => T` 不再进这条规则，
`new` 与那对括号原样留在树里（它们属于类型层，等类型层那一轮再处理）。
合法的 `new Foo(a)` / `new ns.Foo<T>(a)` 都仍然命中：类型名分别是 `Foo` / `ns`。

```ts
const current = Get(units, index);
if (!(current instanceof Common) || !current.Is("new")) {
  return false;
}
return GetSkipNextWrapSymbol(units, index) instanceof Common;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

执行重组：从 `index` 起向后找第一个 `Bracket`，把它之前的内容收进 Type 段、把括号内容搬进 Arguments 段，整段换成一个 `New`，**返回新的下标**。

重组把多个子单元换成一个，下标必须跟着走。

几处行为：

- 找不到括号时抛 `SyntaxException`（「new 后面没有找到括号」），走静态工厂 `SyntaxException.FromMessage`，把范围与消息一起带上。
- 括号本身也在这段范围内，`result` 的 `SignOut` 取的是**括号的终点**，所以 `new Foo(a)` 的 XML 范围覆盖到 `)`。
- `bracket.MoveDataTo(newArguments)` 把括号内容整体搬走，括号随后就不在单元列表里了（它被 `ReplaceCountAt` 换掉）。

```ts
const current = Get(units, index) as Common;
const bracketIndex = SearchBack(units, index + 1, (item) => item instanceof Bracket);
if (bracketIndex === -1) {
  throw SyntaxException.FromMessage(current.SourceRange, "new 后面没有找到括号");
}
const bracket = Get(units, bracketIndex) as Bracket;
const result = new New(template);
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

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<New>` 里依次是 Type 与 Arguments 两段的 XML。

## constructor:(template:Template)=>void

转调基类构造器。

```ts
super(template);
```

## method CreateType:()=>NewType

新建 Type 段并挂到自己名下，返回新单元。

```ts
return this.Add(new NewType(this.Template));
```

## property Type:NewType

Type 段（被 `new` 的类型名，含命名空间与泛型实参）。

**注意与 `constructor` 区分**：这里的 `Type` 是成员名，与 `this.constructor` 无关。

### get

```ts
return this.Data.find((x) => x instanceof NewType) as NewType;
```

## method CreateArguments:()=>NewArguments

新建 Arguments 段并挂到自己名下，返回新单元。

```ts
return this.Add(new NewArguments(this.Template));
```

## property Arguments:NewArguments

Arguments 段（括号里的实参）。

### get

```ts
return this.Data.find((x) => x instanceof NewArguments) as NewArguments;
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 克隆全部子单元 → `TryToClose()`。

```ts
const result = new New(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
