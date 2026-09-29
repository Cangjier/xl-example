# dependencies
```xl
import { IOwner } from "../../../../owners/i-owner.xl.md"
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`catch` 的语句体：`catch` 后面的那一对花括号。

# class CatchBody extends IndependentToken

`catch` 的语句体。

原 C# 侧是 `public class CatchBody : IndependentToken<char>`。按 M31，`char` 在规范里写 `string`。

与 `TryBody` 同构：不消费字符，只作为 `TryReorganization` 打包出来的一个子单元，挂在 `Try` 下并进 `Try.ToDictionary()` 的 `catches` 数组。

## constructor:(owner:IOwner, template:Template)=>void

创建时先把语句重组队列挂上。

原 C# 签名是 `CatchBody(IOwner owner, Template<char> template) : base(owner, template)`，体里只调 `this.InitialStatementReorganizationQueue()`——那是 `IndependentToken` 上的扩展方法；它读的是通用重组队列，所以已经并到 `../../parse-pipeline.xl.md`，调用形态是 `ParsePipeline.InitialStatementReorganizationQueue(this)`。

```ts
super(owner, template);
ParsePipeline.InitialStatementReorganizationQueue(this);
```

## method Clone:()=>Token

克隆自身。

原 C# 的顺序是 `Sign(this)` → `Add(Data.Select(item => item.Clone()))` → `TryToClose()`；按 M14(c) 用 `AddRange`。

```ts
const result = new CatchBody(this.Owner, this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
