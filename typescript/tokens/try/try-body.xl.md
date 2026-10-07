# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`try` 的语句体：`try` 后面那对花括号里的内容。

# class TryBody extends IndependentToken

`try` 的语句体。

它自己**不消费任何字符**（独立单元，`Process` 由基类留空），构造时把语句层级的规则队列挂上，之后靠 `TryCloseRule` 把整个 `try` 结构打包成一个 `Try`。

## constructor:(template:Template)=>void

创建时先把语句规则队列挂上——花括号里的内容是一串语句。

`InitialStatementCloseRuleQueue` 负责把「语句级重组」那一串 `CloseRule` 取出来赋给 `CloseRuleQueue`；它读的是通用规则队列，所以装配在 `../../parse-pipeline.xl.md`，调用形态是 `ParsePipeline.InitialStatementCloseRuleQueue(this)`。

```ts
super(template);
ParsePipeline.InitialStatementCloseRuleQueue(this);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 克隆全部子单元 → `TryToClose()`。

```ts
const result = new TryBody(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
