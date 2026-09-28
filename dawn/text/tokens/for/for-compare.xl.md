# dependencies
```xl
import { IOwner } from "../../../../owners/i-owner.xl.md"
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

C 风格 `for` 语句的三段头之一：`for(initial; compare; next)` 里两个 `;` **之间**的那一截。

`For.Reorganization.Process` 把括号里切好的内容搬进这一段；搬完这一段自己再跑一遍模板里给它准备的重组队列，把内容继续啃小。

# class ForCompare extends IndependentToken

`for` 的「比较」段。

原 C# 侧是 `public class ForCompare : IndependentToken<char>`。按 M31，`char` 在规范里写 `string`。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<ForCompare>` 里是内容的 XML。

## constructor:(owner:IOwner, template:Template<string>)=>void

以负责人与模板创建，并把模板里按本单元类型准备的重组队列挂上。

原 C# 是 `public ForCompare(IOwner owner, Template<char> template) : base(owner, template)`，构造体里只有 `ReorganizationQueue = template.ReorganizationTemplate.Get(GetType());`——`GetType()` 按 M17 写成 `this.constructor`，`SequenceTemplate.Get` 按构造器对象派发。

```ts
super(owner, template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## method Clone:()=>Token<string>

克隆自身。

原 C# 是 `public override Token<char> Clone()`，顺序是 `Sign(this)` → `Add(Data.Select(item => item.Clone()))` → `TryToClose()`。`Add` 传的是**一批**克隆出来的子单元，按 M14(c) 用 `AddRange`（C# 的 `Add<T>(IEnumerable<T>)` 重载改名）。

```ts
const result = new ForCompare(this.Owner, this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
