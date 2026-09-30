# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

接口体：`InterfaceReorganization.Process` 把 `{ ... }` 那对括号的内容搬进来，
之后这一段自己再跑一遍**语句**重组，把成员（字段声明、方法签名）逐个收成成员级的节点。

`{ }` 括号本身**没有**重组队列（见 `../bracket.xl.md` 的 `Use`），
所以接口体在括号关闭时是散着的 `Identifier` / `SymbolToken`；把语句队列挂在这一段上，成员才有成形的时机。
`ClassBody` 走的是同一条路。

语句重组队列的装配在 `../../parse-pipeline.xl.md`，调用形态是 `ParsePipeline.InitialStatementReorganizationQueue(this)`。

# class InterfaceBody extends IndependentToken

接口体。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<InterfaceBody>` 里是各成员的 XML。

## constructor:(template:Template)=>void

创建后立刻把语句重组规则挂上自己的重组队列——接口体里是一串成员。

```ts
super(template);
ParsePipeline.InitialStatementReorganizationQueue(this);
```

## method Clone:()=>Token

克隆自身。

顺序与 `ClassBody.Clone` 一致。

```ts
const result = new InterfaceBody(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
