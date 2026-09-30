# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`new` 表达式的类型段：`NewReorganization.Process` 把 `new` 关键字之后、实参括号之前的所有单元（命名空间限定名、泛型实参、可能的嵌套括号）都收进来。

# class NewType extends IndependentToken

`new` 表达式里被构造的类型。

与 `NewArguments` / `ForeachDefine` 不同，它**没有**在构造器里挂重组队列——类型段的内部结构由搬进来的单元自己做。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<NewType>` 里是类型名各部分的 XML。

## constructor:(template:Template)=>void

转调基类构造器。

```ts
super(template);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 克隆全部子单元 → `TryToClose()`。

```ts
const result = new NewType(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
