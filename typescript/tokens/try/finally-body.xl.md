# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`finally` 的语句体：`finally` 后面的那一对花括号。

# class FinallyBody extends IndependentToken

`finally` 的语句体。

与 `TryBody` / `CatchBody` 同构，但它在 `Try` 里是**单数**的：`Try.FinallyBody` 只取第一个——`try` / `catch` / `finally` 三段里唯一不带数组语义的一段。

## constructor:(template:Template)=>void

创建时先把语句规则队列挂上。

`InitialStatementCloseRuleQueue` 读的是通用规则队列，所以装配在 `../../parse-pipeline.xl.md`，调用形态是 `ParsePipeline.InitialStatementCloseRuleQueue(this)`。

```ts
super(template);
ParsePipeline.InitialStatementCloseRuleQueue(this);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 克隆全部子单元 → `TryToClose()`。

```ts
const result = new FinallyBody(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
