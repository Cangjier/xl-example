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

`foreach` / `for...in` 的循环体段：`Foreach.Process` 把 `{ ... }` 那对括号的内容搬进来，或直接把单条语句收进来，之后这一段自己再跑一遍语句重组把里面啃成语句树。

语句重组队列的装配在 `../../parse-pipeline.xl.md`（原 C# 是 `Dawn/Text/TextCommonUtil.cs` 里的扩展方法），调用形态是 `ParsePipeline.InitialStatementReorganizationQueue(this)`。

# class ForeachBody extends IndependentToken

`foreach` / `for...in` 的循环体。

原 C# 侧是 `public class ForeachBody : IndependentToken<char>`。按 M31，`char` 在规范里写 `string`。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<ForeachBody>` 里是语句的 XML。

## constructor:(owner:IOwner, template:Template)=>void

创建后立刻把语句重组规则挂上自己的重组队列——循环体里是一串语句。

原 C# 侧是 `csharp public ForeachBody(IOwner owner, Template<char> template) : base(owner, template) { this.InitialStatementReorganizationQueue(); }`，按 M31 `char` 写 `string`。

```ts
super(owner, template);
ParsePipeline.InitialStatementReorganizationQueue(this);
```

## method Clone:()=>Token

克隆自身。

原 C# 是 `public override Token<char> Clone()`，顺序是 `Sign(this)` → `Add(Data.Select(item => item.Clone()))` → `TryToClose()`。`Add` 传的是**一批**克隆出来的子单元，按 M14(c) 用 `AddRange`（C# 的 `Add<T>(IEnumerable<T>)` 重载改名）。

```ts
const result = new ForeachBody(this.Owner, this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
