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

`finally` 的语句体：`finally` 后面的那一对花括号。

# class FinallyBody extends IndependentToken

`finally` 的语句体。

原 C# 侧是 `public class FinallyBody : IndependentToken<char>`。按 M31，`char` 在规范里写 `string`。

与 `TryBody` / `CatchBody` 同构，但它在 `Try` 里是**单数**的：`Try.FinallyBody` 只取第一个，`Try.ToDictionary()` 把它放在 `finally` 键下（`try` / `catch` / `finally` 三段里唯一不带数组语义的一段）。

## constructor:(owner:IOwner, template:Template<string>)=>void

创建时先把语句重组队列挂上。

原 C# 签名是 `FinallyBody(IOwner owner, Template<char> template) : base(owner, template)`，体里只调 `this.InitialStatementReorganizationQueue()`——那是 `IndependentToken` 上的扩展方法，本次任务范围内没有它的移植版本，所以这里只保留基类构造这一层。

```ts
super(owner, template);
    InitialStatementReorganizationQueue(this);
```

## method Clone:()=>Token<string>

克隆自身。

原 C# 的顺序是 `Sign(this)` → `Add(Data.Select(item => item.Clone()))` → `TryToClose()`；按 M14(c) 用 `AddRange`。

```ts
const result = new FinallyBody(this.Owner, this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
