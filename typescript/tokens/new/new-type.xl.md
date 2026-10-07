# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`new` 表达式的类型段：`NewReorganization.Process` 把 `new` 关键字之后、实参括号之前的所有单元（命名空间限定名、泛型实参、可能的嵌套括号）都收进来。

# class NewType extends IndependentToken

`new` 表达式里被构造的类型。

与 `NewArguments` / `ForeachDefine` 不同，它**没有**在构造器里挂重组队列——类型段的内部结构由搬进来的单元自己做。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<NewType>` 里是类型名各部分的 XML。

## constructor:(template:Template)=>void

转调基类构造器，并挂**通用队列**。

**为什么 `NewType` 也要有队列**（第 66 轮第六批）：**构造签名**的形参表挂在它里面——

    new(str: string): Buffer  →  <New><NewType><Bracket>(str: string)</Bracket></NewType>…

值位 `new Foo(1, 2)` 的 `NewType` 装的是被调者名字（`Foo`），构造签名装的是**形参括号**。
`ParameterReorganization` 锚在那个括号上、改的是它自己的内容，所以必须有人来扫描
`NewType` 的内容——没有队列时那一趟根本不存在，构造签名的形参永远收不出来
（实测 `cases:align` 的 `Parameter` 缺 934 处全是它）。

```ts
super(template);
this.CloseRuleQueue = template.CloseRuleTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 克隆全部子单元 → `TryToClose()`。

```ts
const result = new NewType(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
