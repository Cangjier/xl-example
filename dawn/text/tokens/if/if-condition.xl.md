# dependencies
```xl
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`if (...)` 的条件部分：`IfSet` 重组时把条件括号里的子单元整体搬进本单元，最终产出 `<IfCondition>…</IfCondition>`。

# class IfCondition extends IndependentToken

`if` / `else if` 的条件单元。

原 C# 侧是 `public class IfCondition : IndependentToken<char>`。按 M31，`char` 在规范里写 `string`。

它只覆写了 `Clone`；`Process` / `Close` / `Default` 都沿用 `IndependentToken` 的空实现。

## constructor:(template:Template)=>void

创建条件单元，并从重组模板里取出本类型的重组队列。

原 C# 侧是 `public IfCondition(IOwner owner, Template<char> template) : base(owner, template)`，体里只有一句 `ReorganizationQueue = template.ReorganizationTemplate.Get(GetType());`。按 M17，`GetType()` 在 ts 里写成 `this.constructor`。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

原 C# 是 `public override Token<char> Clone()`：新建一个、`Sign(this)` 把起止签成同一个范围、把子单元逐个克隆后 `Add`、最后 `TryToClose()`。`Add` 收到的是一批克隆，按 M14(c) 用 `AddRange`（C# 的 `Add<T>(IEnumerable<T>)` 重载在移植里改名）。

```ts
const result = new IfCondition(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
