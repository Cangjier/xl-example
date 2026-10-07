# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`switch (...)` 的判别段：那对括号连同里面的内容。

`SwitchReorganization.Process` 把整个条件括号的内容搬进这一段；搬完这一段自己再跑一遍模板里给它准备的重组队列，
把条件继续啃小。

与 `WhileCompare` 是同一种东西（`while (...)` 的条件段），只是归属的语句不同。

# class SwitchCompare extends IndependentToken

`switch` 的判别段。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<SwitchCompare>` 里是判别表达式的 XML。

## constructor:(template:Template)=>void

以模板创建，并把模板里按本单元类型准备的重组队列挂上。

```ts
super(template);
this.CloseRuleQueue = template.CloseRuleTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

顺序与 `WhileCompare.Clone` 一致。

```ts
const result = new SwitchCompare(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
