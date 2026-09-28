# dependencies
```xl
import { IOwner } from "../../../../owners/i-owner.xl.md"
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`catch` 的形参段：`catch` 后面那对圆括号，例如 `catch (Exception exception)`。

# class CatchDefine extends IndependentToken

`catch` 的形参定义。

原 C# 侧是 `public class CatchDefine : IndependentToken<char>`。按 M31，`char` 在规范里写 `string`。

注意它与 `TryBody` / `CatchBody` / `FinallyBody` 的差别：它构造时挂的**不是**语句重组队列，而是从 `ReorganizationTemplate` 里按自己的运行时类型取队列——圆括号里是「类型 + 变量名」，走的是另一套重组规则。

## constructor:(owner:IOwner, template:Template<string>)=>void

创建时按自己的运行时类型取重组队列。

原 C# 签名是 `CatchDefine(IOwner owner, Template<char> template) : base(owner, template)`，体里是 `ReorganizationQueue = template.ReorganizationTemplate.Get(GetType());`。

按 M17，C# 的 `GetType()` 在 ts 侧写成 `this.constructor`（`SequenceTemplate` 以类的构造器对象为键派发）。

```ts
super(owner, template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## method Clone:()=>Token<string>

克隆自身。

原 C# 的顺序是 `Sign(this)` → `Add(Data.Select(item => item.Clone()))` → `TryToClose()`；按 M14(c) 用 `AddRange`。

```ts
const result = new CatchDefine(this.Owner, this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
