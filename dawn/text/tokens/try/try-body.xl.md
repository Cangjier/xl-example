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

`try` 的语句体：`try` 后面那对花括号里的内容。

# class TryBody extends IndependentToken

`try` 的语句体。

原 C# 侧是 `public class TryBody : IndependentToken<char>`。按 M31，`char` 在规范里写 `string`。

它自己**不消费任何字符**（独立单元，`Process` 由基类留空），构造时把语句层级的重组队列挂上，之后靠 `TryReorganization` 把整个 `try` 结构打包成一个 `Try`。

## constructor:(owner:IOwner, template:Template)=>void

创建时先把语句重组队列挂上——花括号里的内容是一串语句。

原 C# 签名是 `TryBody(IOwner owner, Template<char> template) : base(owner, template)`，体里只调 `this.InitialStatementReorganizationQueue()`。

`InitialStatementReorganizationQueue` 是原 C# 里挂在 `IndependentToken` 上的扩展方法，负责把「语句级重组」那一串 `Reorganization` 取出来赋给 `ReorganizationQueue`。本次任务范围内没有它的移植版本，所以这里只保留基类构造这一层。

```ts
super(owner, template);
    InitialStatementReorganizationQueue(this);
```

## method Clone:()=>Token

克隆自身。

原 C# 的顺序是 `Sign(this)` → `Add(Data.Select(item => item.Clone()))` → `TryToClose()`。`Add` 传的是**一批克隆出来的子单元**，按 M14(c) 用改过名的 `AddRange`。

```ts
const result = new TryBody(this.Owner, this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
