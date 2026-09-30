# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { IsDeclarationModifier } from "./declaration-common.xl.md"
import { SkipNextWrapSymbol } from "../text-common-util.xl.md"
import { Common } from "./common.xl.md"
import { Symbol } from "./symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

标签：把 `outer:` 这个「名字 + 冒号」的前缀收成一个 `Label` 单元，名字记进 `LabelName`。

**为什么只收前缀、不收它标的语句。** TypeScript 的 `name:` 与类型标注共用同一个冒号，
而 `TypeDefineReorganization` 在通用队列里排得很前——它会把 `name: while (...) {...}` 里的
`: while (...) {...}` 整段当成一个类型标注收走。所以标签必须在**它之前**跑，那时后面那条语句
（`while` + 条件括号 + 循环体）还散着，认不出边界。等 `WhileReorganization` 把语句收好时，
这一轮重组已经过去了。

于是这里的产物是「标签 + 语句」两个平级单元：`<Label LabelName="outer" /><While>…</While>`。
`Statement.IsStatementUnit` 把 `Label` 也算作语句级结构，所以两者不会被折进同一个 `Statement`。

形状限制：只认**循环/分支类**的标签（冒号后面是 `for` / `foreach` / `while` / `do` / `switch` / `try` / `if`）。
放宽到「任意语句」会把对象字面量里的 `default:` 之类也当成标签，而那里没有重组队列兜底。

`LabelReorganization` 写在 `Label` **之前**。

# class LabelReorganization extends Reorganization

## static readonly field Instance:LabelReorganization = new LabelReorganization()

唯一的实例，注册进通用重组队列时用。

## private method IsLabeledStatement:(units:Array<Token>, index:int)=>bool

`index` 处是不是一条「可以带标签的语句」的开头。

判定只看**关键字 `Common`**：`for` / `foreach` / `while` / `do` / `switch` / `try` / `if`。
不必也不该去认已经成形的语句单元——本规则排在 `Try` / `IfSet` / `For` / `Foreach` / `While`
**之前**（见 `../parse-pipeline.xl.md`），轮到它时后面那条语句一定还是散着的 `Common`。
只认关键字还顺带避开了一圈循环 import（`while.xl.md` → `statement.xl.md` 已经反向依赖本文件）。

```ts
const item = Get(units, index);
if (!(item instanceof Common)) {
  return false;
}
return item.IsAny(["for", "foreach", "while", "do", "switch", "try", "if"]);
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个标签：一个 `Common` 名字，紧跟（跨过软换行）一个 `:` 符号，
再往后（跨过软换行）是一条可以带标签的语句。

名字不能是修饰词——`default:` / `case:` 那类前缀在 `../declaration-common.xl.md` 里有各自的归宿，
这里用 `IsDeclarationModifier` 把它们排掉（`default` 正在那张表里）。

```ts
const current = Get(units, index);
if (!(current instanceof Common) || IsDeclarationModifier(current)) {
  return false;
}
const colonIndex = SkipNextWrapSymbol(units, index);
const colon = Get(units, colonIndex);
if (!(colon instanceof Symbol) || !colon.Is(":")) {
  return false;
}
const statementIndex = SkipNextWrapSymbol(units, colonIndex);
return this.IsLabeledStatement(units, statementIndex);
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把「名字 + 冒号」换成一个 `Label`，**返回新的下标**。

两个单元（名字与冒号）都被这个单元吸收掉，所以产物是自闭合的 `<Label LabelName="outer" />`——
与 `Let` 吸收掉 `let` 与字段名是同一种做法。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("current 为空");
}
const colonIndex = SkipNextWrapSymbol(units, index);
const result = new Label(template);
result.Parent = current.Parent;
result.LabelName = (current as Common).TempToString();
result.SignIn(current.SourceRange.Start!);
result.SignOut(Get(units, colonIndex)!.SourceRange.End!);
result.TryToClose();
return ReplaceCountAt(units, index, colonIndex - index + 1, result);
```

# class Label extends IndependentToken

标签前缀。

它由重组造出来、自己不消费字符，所以只继承 `IndependentToken` 的空 `Process`。

## field LabelName:string = ""

标签名。

## method ToXmlString:()=>string

产出**自闭合**标签：`<Label LabelName="outer" />`。

自闭合与 `Let` / `WrapSymbol` 同款：内容全进了属性，没有子单元。

```ts
const name = this.constructor.name;
return `<${name} LabelName="${this.LabelName}" />`;
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new Label(this.Template);
result.Sign(this);
result.LabelName = this.LabelName;
result.TryToClose();
return result;
```
