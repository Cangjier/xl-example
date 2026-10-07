# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`switch` 里一个 `case` 的**匹配表达式**：`case a + b:` 里 `case` 与 `:` 之间的那一截。

`default:` 没有这一截，那一段就不造这个单元。

它取通用重组队列：`case` 后面的表达式在 `{ }` 里是散着的（`{` 括号没有队列），
搬进来之后要靠这一段的队列把它啃成形（方法调用、类型标注之类）。

# class SwitchCase extends IndependentToken

一段 `case` 的匹配表达式。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<SwitchCase>` 里是表达式的 XML。

## constructor:(template:Template)=>void

以模板创建，并把模板里按本单元类型准备的重组队列挂上。

```ts
super(template);
this.CloseRuleQueue = template.CloseRuleTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new SwitchCase(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
