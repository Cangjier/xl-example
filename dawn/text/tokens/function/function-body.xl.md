# dependencies
```xl
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`function` 的函数体段：`FunctionReorganization.Process` 把 `{ ... }` 那对括号的内容搬进来，
之后这一段自己再跑一遍**语句**重组，把函数体啃成语句树。

与 `ClassBody` / `ForBody` / `TryBody` 是同一族：`{ }` 括号没有重组队列（见 `../bracket.xl.md` 的 `Use`），
语句队列必须挂在搬完内容的那一段上。

语句重组队列的装配在 `../../parse-pipeline.xl.md`，调用形态是 `ParsePipeline.InitialStatementReorganizationQueue(this)`。

# class FunctionBody extends IndependentToken

函数体。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<FunctionBody>` 里是各条语句的 XML。

## constructor:(template:Template)=>void

创建后立刻把语句重组规则挂上自己的重组队列——函数体里是一串语句。

```ts
super(template);
ParsePipeline.InitialStatementReorganizationQueue(this);
```

## method Clone:()=>Token

克隆自身。

顺序与 `ForBody.Clone` 一致。

```ts
const result = new FunctionBody(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
