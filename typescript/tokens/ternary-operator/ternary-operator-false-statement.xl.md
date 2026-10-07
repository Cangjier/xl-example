# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

三元运算符的假值段：`:` 之后、到语句边界为止的那一段。

# class TernaryOperatorFalseStatement extends IndependentToken

三元运算符的假值表达式。

它不消费字符：整段内容由 `TernaryOperatorReorganization.Process` 用 `TakeRange` 切出来后塞进 `Data`。

## constructor:(template:Template)=>void

创建后立刻挂上**通用重组队列**，理由与 `TernaryOperatorCondition` 完全相同：
内容是从外层搬进来的，那时外层那一趟重组已经过去，不装队列的话内部一趟重组都不跑
（`a ? b : c + d` 里的 `+` 就留在 `Data` 里——这一支是三元里最常见的一处）。
要用通用队列而非语句队列——后者会把这段表达式包进一层 `<Statement>`。

```ts
super(template);
this.CloseRuleQueue = template.CloseRuleTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 克隆全部子单元 → `TryToClose()`。

```ts
const result = new TernaryOperatorFalseStatement(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
