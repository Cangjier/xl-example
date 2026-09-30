# dependencies
```xl
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

C 风格 `for` 语句的三段头之一：`for(initial; compare; next)` 里第二个 `;` **之后**、右括号之前的那一截。

`ForReorganization.Process` 把括号里切好的内容搬进这一段；搬完这一段自己再跑一遍模板里给它准备的重组队列，把内容继续啃小。

# class ForNext extends IndependentToken

`for` 的「步进」段。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<ForNext>` 里是内容的 XML。

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
const result = new ForNext(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
