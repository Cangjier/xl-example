# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../core/syntax/close-rule.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Identifier } from "./identifier.xl.md"
import { GenericType } from "./generic-type.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

装饰器：把 `@Name` / `@ns.Name` / `@Name(实参)` 这一串单元收成一个 `Decorator`。

它必须排在通用规则队列的**最前面**（见 `../parse-pipeline.xl.md`）：`@Component({...})` 里的 `Component({...})`
本身是一个合法的方法调用形状，只要 `MethodCloseRule` 先跑一步，它就会先变成 `Method`，
`@` 后面就再也凑不出「`@` + 名字」了。装饰器先跑，`Method` 那条规则在装饰器内部就再也轮不到——
括号里的内容此刻已经归 `Decorator` 所有。

`DecoratorCloseRule` 写在 `Decorator` **之前**。

# class DecoratorCloseRule extends CloseRule

## static readonly field Instance:DecoratorCloseRule = new DecoratorCloseRule()

唯一的实例，注册进通用规则队列时用。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个装饰器的开头：一个内容为 `@` 的 `SymbolToken`，紧跟（**不跨软换行**）一个 `Identifier` 名字
**或者一个 `(` 括号**。

这里刻意不跳软换行：`@A\nclass B {}` 里 `A` 后面的 `class` 也是 `Identifier`，
一跳软换行就会把 `class` 当成装饰器表达式的一部分读进去。

**`(` 那一支是给 `@(expr)` 的**（实测补的）：TypeScript 允许装饰器直接接一个**括号表达式**
（`@(expr)`），而括号形意味着**括号之前没有名字**。原来只认 `Identifier`，于是
`@(expr)` 完全不成装饰器——产物是散开的 `<SymbolToken>@</SymbolToken><Bracket>(…)</Bracket>`。
名字与括号不会同时出现（`@dec()` 的 `@` 后面是 `dec`，不是 `(`），所以两支可以并列。

**`@'字面量'` 不是装饰器，别往这里加**：本项目的字符串词法把 `@` 当作**逐字字符串前缀**
（`StringGuideBranch.Success` 会 `Undo` 掉引号前的 `@` 并置 `verbatim`，见
`string/string-guide.xl.md`），所以 `@'a'` 在词法阶段就已经是**一个 String 单元**，
到不了本规则；`@` 也不会以独立 `SymbolToken` 的身份留在列表里。
真接下去会出事的是 `@dec @'a' class C {}`：装饰器扫描一旦多认一个 `String`，
那个逐字字符串就会被**收进 `dec` 这个装饰器里**（实测）。

```ts
const current = Get(units, index);
if (!(current instanceof SymbolToken) || !current.Is("@")) {
  return false;
}
// **`@` 已经在装饰器里时不再收**：`Decorator` 挂了通用队列（见它的构造器），
// 而本规则也在通用队列里——不挡的话，装饰器自己那一趟会把自己的 `@` 又包一层，
// 两趟下来套两层空壳。
if (current.Parent instanceof Decorator) {
  return false;
}
const next = Get(units, index + 1);
if (next instanceof Identifier) {
  return true;
}
return next instanceof Bracket && next.startBracket === "(";
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把一段装饰器收成一个 `Decorator`，**返回新的下标**。

扫描只用「相邻下一个单元」的下标（`index + 1`、`index + 2`…），不跨软换行：
可以接下去的形状只有四种——名字（`Identifier`）、点号（`.`，用于 `@ns.Name`）、泛型实参段（`GenericType`，防御性）、
以及调用括号（`(`，收下它之后立刻收尾）。其余任何单元（包括 `LineWrap`）都表示装饰器到此结束。

**`Identifier` 那一支还要挡关键字——但只挡第二个名字起**：`@sealed class C {}` 里 `sealed`、`class`、`C`
是三个挨着的 `Identifier`，不挡的话装饰器名会拼成 `sealed.class.C`，**整条类声明被吞进装饰器**（产物里只剩
`<Decorator name="sealed.class.C">` 加一个空对象）。
关键字表就在这个 `Identifier` 自己的模板上（`item.Template.KeywordTemplate`），直接查即可——
不必等 `KeywordCloseRule`（它排在通用队列最后，此刻还没跑）。

**第一个名字即使是关键字也要收**：`@readonly readonly x = 1` 里那个 `readonly` 在关键字表里
（上下文关键字），可 `@` 后面这一格没有别的解释——`Previous` 认的就是「`@` + 任意 `Identifier`」。
不收它就只剩一个空名字的装饰器，后面那个词被当成字段名：实测这一行被切成**两个 `Field`**
（第一个叫 `readonly`），投影那边是「漂移 2 + 多出 3」。
装饰器名是上下文关键字时**在装饰器里也不再升级成 `Keyword`**（见 `keyword.xl.md` 的 `IsUpgradable`），
否则 `expression` 会投成 `ReadonlyKeyword`。

**名字段之间必须有一个 `.`**：`@dec x = 1` 是一个装饰器加一个**字段**，
但 `dec` 与 `x` 都是 `Identifier`、`x` 也不在关键字表里，于是原来会把名字拼成 `dec.x`——
**字段名被吞进装饰器**，产物退化成
`<Decorator name="dec.x"><SymbolToken>@</SymbolToken><Identifier>dec</Identifier><Identifier>x</Identifier></Decorator><SymbolToken>=</SymbolToken><Identifier>1</Identifier>`（实测）。

判据不能看「有没有空白」：`@dec x` 与 `@ns.dec` 在单元列表里都有东西夹在中间，
而单元此刻的 `SourceRange.End` 并不可靠（未关闭的单元还没定下终点）。
真正稳的事实是：**装饰器名里两个 `Identifier` 之间一定夹着一个 `.`**
（`@ns.Name` 才需要多段名字）。所以记住「上一个吃进来的名字是怎么进来的」——
是点号进来的才允许再接一个名字，直接挨着进来的名字到此为止。

`name` 是名字段按 `.` 拼起来的文本；实参括号里的内容跟在它后面进 `Data`，所以
`@Component({ size: 1 })` 的产物是 `<Decorator name="Component">` 里带一个 `Bracket`。

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
  if (item instanceof Identifier) {
    // **第一个名字即使是关键字也收**：`@readonly readonly x = 1` 里那个 `readonly` 在关键字表里
    // （上下文关键字），但 `@` 后面这一格没有别的解释——`Previous` 认的就是「`@` + 任意 `Identifier`」，
    // 不收它就只剩一个空名字的装饰器 + 后面那个词被当成字段名（实测：`@readonly readonly x = 1`
    // 被切成两个 `Field`，第一个叫 `readonly`）。
    // 第二个名字起才挡：`@sealed class C {}` 里 `class` 不能拼进装饰器名（那会把整条类声明吞掉）。
    if (names.length > 0 && item.Template.KeywordTemplate.IsKeyword(item.TempToString())) {
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
  if (item instanceof SymbolToken && item.Is(".")) {
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
  if (item instanceof Bracket && item.startBracket === "(") {
    endIndex = i;
    // `@(expr)`：括号之前没有名字，括号本身就是整个装饰器表达式。
    // 名字已经在前面收过（`@dec()`）时，这里就是收尾，`name` 不受影响。
    break;
  }
  break;
}
decorator.name = names.join(".");
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

它覆写了 `ToXmlString`：标签名是运行时类名，开标签上带 `name` 属性。

## method PrintAst:(ctx:any, v:any)=>any

`@Component({ … })` / `@plain` → `Decorator`（**只有 `expression`**；
**从 `ts-ast.xl.md` 的 `projectDecorator` 搬来**，第 182 轮）。

TS 那边 `@Component({…})` 的 `expression` 是一个 `CallExpression`（被调用者是那个 `Identifier`），
`@plain` 的 `expression` 就是那个 `Identifier`；`@` 这个符号**不是节点**。
产物那边给的是 `name` + `children`（`@` 也在里面）——照通用投影会多出一个 `@` 节点。

**装饰器名可能是一条链**（第 170 轮）：`@ns.dec` 的产物是
`[Identifier(ns), SymbolToken(.), Identifier(dec)]` 三格平级，而 TS 的
`Decorator.expression` 是一个 `PropertyAccessExpression`。只投第一格会只剩 `Identifier(ns)`
（实测 `cls-decorator-qualified-name.ts`：缺 `PropertyAccessExpression` + `Identifier`）。
整段交给 `ctx.Expression` 折。

```ts
  const kids = ctx.Kids(v).filter(
    (k: any) => !(k.get("type") === "SymbolToken" && ctx.TextOf(k) === "@"),
  );
  const props: any = {};
  if (kids.length > 0) {
    const inner = ctx.Expression(kids);
    if (inner !== undefined) props.expression = inner;
  }
  return ctx.NodeHead("Decorator", props, v);
```

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 992 轮）：与上面的 `PrintAst` 出**同一个答案**，
但只许用这个 token 自己的属性、子单元与 `Parent`（不回原文查）——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintDirectAst`。

```ts
  // **第 993 轮**：`ctx.TextOf` → `ctx.ValueOf` —— 只读那一格**自己记的**值，
  // 不回原文兜底（见 `core/syntax/token.xl.md` 的 `PrintDirectAst`）。
  const kids = ctx.Kids(v).filter(
    (k: any) => !(k.get("type") === "SymbolToken" && ctx.ValueOf(k) === "@"),
  );
  const props: any = {};
  if (kids.length > 0) {
    const inner = ctx.Expression(kids);
    if (inner !== undefined) props.expression = inner;
  }
  return ctx.NodeHead("Decorator", props, v);
```


## field name:string = ""

装饰器的名字：`@ns.Name` 记 `ns.Name`，`@Name` 记 `Name`。

## constructor:(template:Template)=>void

转调基类构造器，并把**通用规则队列**挂上来。

**为什么装饰器里要跑重组**（第 66 轮补）：装饰器的表达式在 TypeScript 那边就是**普通表达式**——
`@Component({ size: 1 })` 是 `Decorator > CallExpression`，`@(a || b)` 是 `Decorator > ParenthesizedExpression > BinaryExpression`。
原来这个节点没有任何队列，`Data` 收进来就不再动，于是 `Component(...)` 停在
「`Identifier` + `Bracket`」两个散单元上、**没有调用节点**（当时那把对齐尺子的
`CallExpression` 缺 13 处全是装饰器）。挂上通用队列之后，`MethodCloseRule` 会把
「名字 + 括号」收成 `<Method>`，与 TS 的 `CallExpression` 一对一。

挂的是**通用队列**（`CloseRuleTemplate.Get(this.constructor)` 的默认值），不是类型队列：
装饰器里是值表达式，类型队列那几条（方括号 / 运算符 / 字面量）都不该在这里跑。

```ts
super(template);
this.CloseRuleQueue = template.CloseRuleTemplate.Get(this.constructor);
```

## method ToXmlString:()=>string

产出 XML：`<Decorator name="名字">子单元的 XML 串接</Decorator>`。

与 `Method` / `Bracket` 同一种写法：标签名取 `this.constructor.name`，属性值两侧是双引号、不转义，
子单元之间没有任何分隔符。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} range="${this.RangeOf()}" name="${this.name}">${temp.join("")}</${name}>`;
```

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + `name`，外加子单元。

键名与 `ToXmlString` 开标签上的 `name` 属性同名、值同源（都是 `@ns.Name` 那种点号名字）。
实参括号、`@` 符号与名字单元都在子单元里，非空时才写 `children`（空节点只留 `type`）。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
result.set("name", this.name);
if (this.Data.length !== 0) {
  const children: Array<any> = [];
  for (const item of this.Data) {
    children.push(item.ToDictionary());
  }
  result.set("children", children);
}
return result;
```

## method Clone:()=>Token

克隆自身。

顺序与 `Method.Clone` 一致：`Sign(this)` → 抄 `name` →
整批加入子单元克隆 → `TryToClose()`。

```ts
const result = new Decorator(this.Template);
result.Sign(this);
result.name = this.name;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
