# dependencies
```xl
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

三元运算符的真值段：`?` 与 `:` 之间的那一段。

# class TernaryOperatorTrueStatement extends IndependentToken

三元运算符的真值表达式。

原 C# 侧是 `public class TernaryOperatorTrueStatement : IndependentToken<char>`。按 M31，`char` 在规范里写 `string`。

它不消费字符：整段内容由 `TernaryOperatorReorganization.Process` 用 `TakeRange` 切出来后塞进 `Data`。

## constructor:(template:Template)=>void

原 C# 只是转调基类构造器。

```ts
super(template);
```

## method Clone:()=>Token

克隆自身。

原 C# 的顺序是 `Sign(this)` → `Add(Data.Select(item => item.Clone()))` → `TryToClose()`；按 M14(c) 用 `AddRange`。

```ts
const result = new TernaryOperatorTrueStatement(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
