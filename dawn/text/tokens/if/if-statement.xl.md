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

`if (...)` / `else (...)` 后面的语句体：括号里的子单元整体搬进来，最终产出 `<IfStatement>…</IfStatement>`。

# class IfStatement extends IndependentToken

`if` / `else if` / `else` 的语句体单元。

原 C# 侧是 `public class IfStatement : IndependentToken<char>`。按 M31，`char` 在规范里写 `string`。

它与 `ForBody` / `ForeachBody` / `WhileBody` / `TryBody` / `LamdaBody` / `CatchBody` / `FinallyBody` / `Root` 是同一族：构造时都要挂上「语句重组」队列。

只覆写了 `Clone`；`Process` / `Close` / `Default` 沿用 `IndependentToken` 的空实现。

## constructor:(owner:IOwner, template:Template)=>void

创建语句体单元，并挂上语句重组队列。

原 C# 是 `public IfStatement(IOwner owner, Template<char> template) : base(owner, template)`，体里只有 `this.InitialStatementReorganizationQueue();`。

`InitialStatementReorganizationQueue` 在 C# 里是 `Dawn/Text/TextCommonUtil.cs` 上的扩展方法；它读的是通用重组队列，所以并到了 `../../parse-pipeline.xl.md`，ts 侧写成 `ParsePipeline.InitialStatementReorganizationQueue(this)` 并 import 该类。

```ts
super(owner, template);
ParsePipeline.InitialStatementReorganizationQueue(this);
```

## method Clone:()=>Token

克隆自身。

原 C# 是 `public override Token<char> Clone()`：新建一个、`Sign(this)`、把子单元逐个克隆后 `Add`（ts 侧 `AddRange`，M14(c)）、最后 `TryToClose()`。

```ts
const result = new IfStatement(this.Owner, this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
