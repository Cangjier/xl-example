# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`if (...)` 的条件部分：`IfSet` 重组时把条件括号里的子单元整体搬进本单元，最终产出 `<IfCondition>…</IfCondition>`。

# class IfCondition extends IndependentToken

`if` / `else if` 的条件单元。

它只覆写了 `Clone`；`Process` / `Close` / `Default` 都沿用 `IndependentToken` 的空实现。

## constructor:(template:Template)=>void

创建条件单元，并从重组模板里取出本类型的重组队列。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

新建一个、`Sign(this)` 把起止签成同一个范围、把子单元逐个克隆后 `AddRange`、最后 `TryToClose()`。

```ts
const result = new IfCondition(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
