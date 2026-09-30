# dependencies
```xl
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`enum` 的枚举体段：`EnumReorganization.Process` 把 `{ ... }` 那对括号的内容搬进来，
之后这一段自己再跑一遍**语句**重组，把每个成员收成一条 `Statement`。

`{ }` 括号本身**没有**重组队列（见 `../bracket.xl.md` 的 `Use`），所以括号里的内容被搬过来时还是散着的
`Common` / `Symbol`；把语句队列挂在这一段上，正是让它们成形的唯一时机——`ForBody` / `IfStatement` 那一族走的是同一条路。

语句重组队列的装配在 `../../parse-pipeline.xl.md`，调用形态是 `ParsePipeline.InitialStatementReorganizationQueue(this)`。

# class EnumBody extends IndependentToken

枚举体。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<EnumBody>` 里是各条语句的 XML。

## constructor:(template:Template)=>void

创建后立刻把语句重组规则挂上自己的重组队列——枚举体里是一串成员，每个成员一条语句。

```ts
super(template);
ParsePipeline.InitialStatementReorganizationQueue(this);
```

## method Clone:()=>Token

克隆自身。

顺序与 `ForBody.Clone` 一致。

```ts
const result = new EnumBody(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
