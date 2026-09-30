# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`if (...)` / `else (...)` 后面的语句体：括号里的子单元整体搬进来，最终产出 `<IfStatement>…</IfStatement>`。

# class IfStatement extends IndependentToken

`if` / `else if` / `else` 的语句体单元。

它与 `ForBody` / `ForeachBody` / `WhileBody` / `TryBody` / `LamdaBody` / `CatchBody` / `FinallyBody` / `Root` 是同一族：构造时都要挂上「语句重组」队列。

只覆写了 `Clone`；`Process` / `Close` / `Default` 沿用 `IndependentToken` 的空实现。

## constructor:(template:Template)=>void

创建语句体单元，并挂上语句重组队列。

`InitialStatementReorganizationQueue` 读的是通用重组队列，所以装配在 `../../parse-pipeline.xl.md`，写成 `ParsePipeline.InitialStatementReorganizationQueue(this)` 并 import 该类。

```ts
super(template);
ParsePipeline.InitialStatementReorganizationQueue(this);
```

## method Clone:()=>Token

克隆自身。

新建一个、`Sign(this)`、把子单元逐个克隆后 `AddRange`、最后 `TryToClose()`。

```ts
const result = new IfStatement(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
