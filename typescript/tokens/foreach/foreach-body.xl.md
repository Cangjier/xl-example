# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`foreach` / `for...in` 的循环体段：`ForeachCloseRule.Process` 把 `{ ... }` 那对括号的内容搬进来，或直接把单条语句收进来，之后这一段自己再跑一遍语句重组把里面啃成语句树。

收尾规则队列的装配在 `../../parse-pipeline.xl.md`，调用形态是 `ParsePipeline.InitialCloseRuleQueue(this)`。

# class ForeachBody extends IndependentToken

`foreach` / `for...in` 的循环体。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<ForeachBody>` 里是语句的 XML。

## constructor:(template:Template)=>void

创建后立刻把语句收尾规则挂上自己的规则队列——循环体里是一串语句。

```ts
super(template);
ParsePipeline.InitialCloseRuleQueue(this);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 克隆全部子单元 → `TryToClose()`。

```ts
const result = new ForeachBody(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
