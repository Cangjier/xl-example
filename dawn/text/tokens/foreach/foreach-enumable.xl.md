# dependencies
```xl
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`foreach` / `for...in` 的可枚举段：`in` / `of` 右边那截（`xs`、`GetItems()` 之类），`ForeachReorganization.Process` 把括号内该位置之后的内容搬进来。

# class ForeachEnumable extends IndependentToken

`foreach` / `for...in` 的被遍历对象。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<ForeachEnumable>` 里是表达式与可能的调用括号。

## constructor:(template:Template)=>void

创建时把本类型的重组规则挂上来。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 克隆全部子单元 → `TryToClose()`。

```ts
const result = new ForeachEnumable(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
