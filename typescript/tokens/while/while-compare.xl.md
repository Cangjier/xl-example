# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`while` 语句的条件段：`while(...)` 那对括号连同里面的内容。

`WhileReorganization.Process` 把整个条件括号的内容搬进这一段；搬完这一段自己再跑一遍模板里给它准备的重组队列，把条件继续啃小。

# class WhileCompare extends IndependentToken

`while` 的条件段。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<WhileCompare>` 里是条件的 XML。

## constructor:(template:Template)=>void

以模板创建，并把模板里按本单元类型准备的重组队列挂上。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 克隆全部子单元 → `TryToClose()`。

```ts
const result = new WhileCompare(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
