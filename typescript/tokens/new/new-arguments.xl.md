# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`new` 表达式的实参段：`NewReorganization.Process` 把 `new Foo(a, b)` 里那对括号的内容整体搬进来；括号本身随后被换掉，只剩内容留在这里。

# class NewArguments extends IndependentToken

`new` 表达式的实参。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<NewArguments>` 里是各实参的 XML。

## constructor:(template:Template)=>void

创建时把本类型的重组规则挂上来——实参之间靠逗号切分成表达式。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 克隆全部子单元 → `TryToClose()`。

```ts
const result = new NewArguments(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
