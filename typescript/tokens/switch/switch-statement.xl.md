# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

一个 `switch` 段的**语句体**：`case x:` / `default:` 的冒号之后、下一个 `case` / `default` / `}` 之前的那一串单元。

它自己再跑一遍**语句**重组，把这一串啃成语句树——与 `IfStatement` / `ForBody` 是同一族。

收尾规则队列的装配在 `../../parse-pipeline.xl.md`，调用形态是 `ParsePipeline.InitialCloseRuleQueue(this)`。

# class SwitchStatement extends IndependentToken

一个 `switch` 段的语句体。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<SwitchStatement>` 里是各条语句的 XML。

## constructor:(template:Template)=>void

创建后立刻把语句收尾规则挂上自己的规则队列。

```ts
super(template);
ParsePipeline.InitialCloseRuleQueue(this);
```

## method Clone:()=>Token

克隆自身。

顺序与 `IfStatement.Clone` 一致。

```ts
const result = new SwitchStatement(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
