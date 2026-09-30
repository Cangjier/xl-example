# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

C 风格 `for` 语句的循环体段：`for(...)` 后面那对 `{ }` 的内容（或那条单语句）搬进来之后，这一段自己再跑一遍语句重组，把里面啃成语句树。

语句重组队列的装配在 `../../parse-pipeline.xl.md`，调用形态是 `ParsePipeline.InitialStatementReorganizationQueue(this)`。

# class ForBody extends IndependentToken

`for` 的循环体。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<ForBody>` 里是循环体的 XML。

## constructor:(template:Template)=>void

创建后立刻把语句重组规则挂上自己的重组队列——循环体里是一串语句。

```ts
super(template);
ParsePipeline.InitialStatementReorganizationQueue(this);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 克隆全部子单元 → `TryToClose()`。

```ts
const result = new ForBody(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
