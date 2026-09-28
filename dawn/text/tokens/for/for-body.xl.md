# dependencies
```xl
import { IOwner } from "../../../../owners/i-owner.xl.md"
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { InitialStatementReorganizationQueue } from "../../text-common-util.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

C 风格 `for` 语句的循环体段：`for(...)` 后面那对 `{ }` 的内容（或那条单语句）搬进来之后，这一段自己再跑一遍语句重组，把里面啃成语句树。

`InitialStatementReorganizationQueue` 是 `Dawn/Text/TextCommonUtil.cs` 里的扩展方法，按 M11 改成模块级函数调用。

# class ForBody extends IndependentToken

`for` 的循环体。

原 C# 侧是 `public class ForBody : IndependentToken<char>`。按 M31，`char` 在规范里写 `string`。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<ForBody>` 里是循环体的 XML。

## constructor:(owner:IOwner, template:Template<string>)=>void

创建后立刻把语句重组规则挂上自己的重组队列——循环体里是一串语句。

原 C# 侧是 `public ForBody(IOwner owner, Template<char> template) : base(owner, template)`，构造体里只有一句 `this.InitialStatementReorganizationQueue()`。

```ts
super(owner, template);
InitialStatementReorganizationQueue(this);
```

## method Clone:()=>Token<string>

克隆自身。

原 C# 是 `public override Token<char> Clone()`，顺序是 `Sign(this)` → `Add(Data.Select(item => item.Clone()))` → `TryToClose()`。`Add` 传的是**一批**克隆出来的子单元，按 M14(c) 用 `AddRange`（C# 的 `Add<T>(IEnumerable<T>)` 重载改名）。

```ts
const result = new ForBody(this.Owner, this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
