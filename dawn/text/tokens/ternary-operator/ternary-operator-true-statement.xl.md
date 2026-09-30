# dependencies
```xl
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

三元运算符的真值段：`?` 与 `:` 之间的那一段。

# class TernaryOperatorTrueStatement extends IndependentToken

三元运算符的真值表达式。

它不消费字符：整段内容由 `TernaryOperatorReorganization.Process` 用 `TakeRange` 切出来后塞进 `Data`。

## constructor:(template:Template)=>void

创建后立刻挂上**语句重组队列**，理由与 `TernaryOperatorCondition` 完全相同：
内容是从外层搬进来的，那时外层那一趟重组已经过去，不装队列的话内部一趟重组都不跑
（`(a ? b + c : d)` 里的 `+` 就留在 `Data` 里）。

```ts
super(template);
ParsePipeline.InitialStatementReorganizationQueue(this);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 克隆全部子单元 → `TryToClose()`。

```ts
const result = new TernaryOperatorTrueStatement(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
