# dependencies
```xl
import { IOwner } from "../../../../owners/i-owner.xl.md"
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

三元运算符的条件段：`?` 之前的那一段。

# class TernaryOperatorCondition extends IndependentToken

三元运算符的条件。

原 C# 侧是 `public class TernaryOperatorCondition : IndependentToken<char>`。按 M31，`char` 在规范里写 `string`。

它不消费字符：`TernaryOperatorReorganization.Process` 用 `TakeRange` 从单元列表里切出条件段，再整段塞进它的 `Data`，然后签入签出并关闭。

## constructor:(owner:IOwner, template:Template<string>)=>void

原 C# 只是转调基类构造器。

```ts
super(owner, template);
```

## method Clone:()=>Token<string>

克隆自身。

原 C# 的顺序是 `Sign(this)` → `Add(Data.Select(item => item.Clone()))` → `TryToClose()`；按 M14(c) 用 `AddRange`。

```ts
const result = new TernaryOperatorCondition(this.Owner, this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
