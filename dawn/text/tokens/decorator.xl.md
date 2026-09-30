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

`index` 处是不是一个装饰器的开头：一个内容为 `@` 的 `Symbol`，紧跟（**不跨软换行**）一个 `Common` 名字。

这里刻意不跳软换行：`@A\nclass B {}` 里 `A` 后面的 `class` 也是 `Common`，
一跳软换行就会把 `class` 当成装饰器表达式的一部分读进去。

```ts
const current = Get(units, index);
if (!(current instanceof Symbol) || !current.Is("@")) {
  return false;
}
return Get(units, index + 1) instanceof Common;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把一段装饰器收成一个 `Decorator`，**返回新的下标**。

扫描只用「相邻下一个单元」的下标（`index + 1`、`index + 2`…），不跨软换行：
可以接下去的形状只有四种——名字（`Common`）、点号（`.`，用于 `@ns.Name`）、泛型实参段（`GenericType`，防御性）、
以及调用括号（`(`，收下它之后立刻收尾）。其余任何单元（包括 `WrapSymbol`）都表示装饰器到此结束。

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
let i = index + 1;
while (i < units.length) {
  const item = Get(units, i);
  if (item instanceof Common) {
    names.push(item.TempToString());
    endIndex = i;
    i++;
    continue;
  }
  if (item instanceof Symbol && item.Is(".")) {
    endIndex = i;
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
