# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Common } from "./common.xl.md"
import { GenericType } from "./generic-type.xl.md"
import { Symbol } from "./symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

装饰器：把 `@Name` / `@ns.Name` / `@Name(实参)` 这一串单元收成一个 `Decorator`。

它必须排在通用重组队列的**最前面**（见 `../parse-pipeline.xl.md`）：`@Component({...})` 里的 `Component({...})`
本身是一个合法的方法调用形状，只要 `MethodReorganization` 先跑一步，它就会先变成 `Method`，
`@` 后面就再也凑不出「`@` + 名字」了。装饰器先跑，`Method` 那条规则在装饰器内部就再也轮不到——
括号里的内容此刻已经归 `Decorator` 所有。

`DecoratorReorganization` 写在 `Decorator` **之前**。

# class DecoratorReorganization extends Reorganization

## static readonly field Instance:DecoratorReorganization = new DecoratorReorganization()

唯一的实例，注册进通用重组队列时用。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个装饰器的开头：一个内容为 `@` 的 `Symbol`，紧跟（**不跨软换行**）一个 `Common` 名字
**或者一个 `(` 括号**。

这里刻意不跳软换行：`@A\nclass B {}` 里 `A` 后面的 `class` 也是 `Common`，
一跳软换行就会把 `class` 当成装饰器表达式的一部分读进去。

**`(` 那一支是给 `@(expr)` 的**（实测补的）：TypeScript 允许装饰器直接接一个**括号表达式**
（`@(expr)`），而括号形意味着**括号之前没有名字**。原来只认 `Common`，于是
`@(expr)` 完全不成装饰器——产物是散开的 `<Symbol>@</Symbol><Bracket>(…)</Bracket>`。
名字与括号不会同时出现（`@dec()` 的 `@` 后面是 `dec`，不是 `(`），所以两支可以并列。

**`@'字面量'` 不是装饰器，别往这里加**：本项目的字符串词法把 `@` 当作**逐字字符串前缀**
（`StringGuideBranch.Success` 会 `Undo` 掉引号前的 `@` 并置 `IsSupportVerbatim`，见
`string/string-guide.xl.md`），所以 `@'a'` 在词法阶段就已经是**一个 String 单元**，
到不了本规则；`@` 也不会以独立 `Symbol` 的身份留在列表里。
真接下去会出事的是 `@dec @'a' class C {}`：装饰器扫描一旦多认一个 `String`，
那个逐字字符串就会被**收进 `dec` 这个装饰器里**（实测）。

```ts
const current = Get(units, index);
if (!(current instanceof Symbol) || !current.Is("@")) {
  return false;
}
const next = Get(units, index + 1);
if (next instanceof Common) {
  return true;
}
return next instanceof Bracket && next.StartBracketChar === "(";
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把一段装饰器收成一个 `Decorator`，**返回新的下标**。

扫描只用「相邻下一个单元」的下标（`index + 1`、`index + 2`…），不跨软换行：
可以接下去的形状只有四种——名字（`Common`）、点号（`.`，用于 `@ns.Name`）、泛型实参段（`GenericType`，防御性）、
以及调用括号（`(`，收下它之后立刻收尾）。其余任何单元（包括 `WrapSymbol`）都表示装饰器到此结束。

**`Common` 那一支还要挡关键字**：`@sealed class C {}` 里 `sealed`、`class`、`C` 是三个挨着的 `Common`，
不挡的话装饰器名会拼成 `sealed.class.C`，**整条类声明被吞进装饰器**（产物里只剩
`<Decorator DecoratorName="sealed.class.C">` 加一个空对象）。
关键字表就在这个 `Common` 自己的模板上（`item.Template.KeywordTemplate`），直接查即可——
不必等 `KeywordReorganization`（它排在通用队列最后，此刻还没跑）。

**名字段之间必须有一个 `.`**：`@dec x = 1` 是一个装饰器加一个**字段**，
但 `dec` 与 `x` 都是 `Common`、`x` 也不在关键字表里，于是原来会把名字拼成 `dec.x`——
**字段名被吞进装饰器**，产物退化成
`<Decorator DecoratorName="dec.x"><Symbol>@</Symbol><Common>dec</Common><Common>x</Common></Decorator><Symbol>=</Symbol><Common>1</Common>`（实测）。

判据不能看「有没有空白」：`@dec x` 与 `@ns.dec` 在单元列表里都有东西夹在中间，
而单元此刻的 `SourceRange.End` 并不可靠（未关闭的单元还没定下终点）。
真正稳的事实是：**装饰器名里两个 `Common` 之间一定夹着一个 `.`**
（`@ns.Name` 才需要多段名字）。所以记住「上一个吃进来的名字是怎么进来的」——
是点号进来的才允许再接一个名字，直接挨着进来的名字到此为止。

`DecoratorName` 是名字段按 `.` 拼起来的文本；实参括号里的内容跟在它后面进 `Data`，所以
`@Component({ size: 1 })` 的产物是 `<Decorator DecoratorName="Component">` 里带一个 `Bracket`。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("current 为空");
}
const decorator = new Decorator(template);
decorator.Parent = current.Parent;
decorator.SignIn(current.SourceRange.Start!);
const names: string[] = [];
let endIndex = index;
let afterDot = false;
let i = index + 1;
while (i < units.length) {
  const item = Get(units, i);
  if (item instanceof Common) {
    if (item.Template.KeywordTemplate.IsKeyword(item.TempToString())) {
      break;
    }
    // 名字之间必须有 `.`：`@dec x = 1` 的 `x` 是字段名，不是装饰器名字的一部分。
    if (names.length > 0 && !afterDot) {
      break;
    }
    names.push(item.TempToString());
    endIndex = i;
    afterDot = false;
    i++;
    continue;
  }
  if (item instanceof Symbol && item.Is(".")) {
    endIndex = i;
    afterDot = true;
    i++;
    continue;
  }
  if (item instanceof GenericType) {
    endIndex = i;
    i++;
    continue;
  }
  if (item instanceof Bracket && item.StartBracketChar === "(") {
    endIndex = i;
    // `@(expr)`：括号之前没有名字，括号本身就是整个装饰器表达式。
    // 名字已经在前面收过（`@dec()`）时，这里就是收尾，`DecoratorName` 不受影响。
    break;
  }
  break;
}
decorator.DecoratorName = names.join(".");
for (let k = index; k <= endIndex; k++) {
  decorator.AddAndCloseLast(Get(units, k)!);
}
decorator.SignOut(Get(units, endIndex)!.SourceRange.End!);
decorator.TryToClose();
return ReplaceCountAt(units, index, endIndex - index + 1, decorator);
```

# class Decorator extends IndependentToken

一个装饰器。

它由重组造出来、自己不消费字符，所以只继承 `IndependentToken` 的空 `Process`。

它覆写了 `ToXmlString`：标签名是运行时类名，开标签上带 `DecoratorName` 属性。

## field DecoratorName:string = ""

装饰器的名字：`@ns.Name` 记 `ns.Name`，`@Name` 记 `Name`。

## method ToXmlString:()=>string

产出 XML：`<Decorator DecoratorName="名字">子单元的 XML 串接</Decorator>`。

与 `Method` / `Bracket` 同一种写法：标签名取 `this.constructor.name`，属性值两侧是双引号、不转义，
子单元之间没有任何分隔符。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} DecoratorName="${this.DecoratorName}">${temp.join("")}</${name}>`;
```

## method Clone:()=>Token

克隆自身。

顺序与 `Method.Clone` 一致：`Sign(this)` → 抄 `DecoratorName` →
整批加入子单元克隆 → `TryToClose()`。

```ts
const result = new Decorator(this.Template);
result.Sign(this);
result.DecoratorName = this.DecoratorName;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
