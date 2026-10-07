# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

命名空间体：`NamespaceReorganization.Process` 把 `namespace N { ... }` 那对花括号的内容搬进来，
之后这一段自己再跑一遍**通用 + 语句**重组，把体内的声明（`interface` / `class` / `function` / `const` / `enum` / 嵌套 `namespace`）逐个收成节点。

`{ }` 括号本身**没有**重组队列（见 `../bracket.xl.md` 的 `Use`：`Use("{")` 不设 `CloseRuleQueue`），
所以命名空间体在括号关闭时是散着的 `Identifier` / `SymbolToken`。把语句队列挂在这一段上，体内的声明才有成形的时机——
这正是 `InterfaceBody` / `ClassBody` 走的那条路。

**这一处是本工程最大的一处「静默丢失」的来源**：`@types/node` 把绝大部分内容包在
`declare namespace NodeJS { … }` 里，体不跑重组，体内所有 interface / class / function 就都不成节点
（审计：真实语料 4538 个 interface 声明只产出 2856 个节点，其中 1456 个正是被这一条连累的）。

语句重组队列的装配在 `../../parse-pipeline.xl.md`，调用形态是 `ParsePipeline.InitialStatementReorganizationQueue(this)`。

# class NamespaceBody extends IndependentToken

命名空间体。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<NamespaceBody>` 里是各成员的 XML。

## constructor:(template:Template)=>void

创建后立刻把语句重组规则挂上自己的重组队列——命名空间体里是一串声明。

```ts
super(template);
ParsePipeline.InitialStatementReorganizationQueue(this);
```

## method Clone:()=>Token

克隆自身。

顺序与 `ClassBody.Clone` 一致。

```ts
const result = new NamespaceBody(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
