# dependencies
```xl
import { IOwner } from "../../../../owners/i-owner.xl.md"
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`new` 表达式的实参段：`New.Process` 把 `new Foo(a, b)` 里那对括号的内容整体搬进来；括号本身随后被换掉，只剩内容留在这里。

# class NewArguments extends IndependentToken

`new` 表达式的实参。

原 C# 侧是 `public class NewArguments : IndependentToken<char>`。按 M31，`char` 在规范里写 `string`。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<NewArguments>` 里是各实参的 XML。

## constructor:(owner:IOwner, template:Template)=>void

创建时把本类型的重组规则挂上来——实参之间靠逗号切分成表达式。

原 C# 侧是 `public NewArguments(IOwner owner, Template<char> template) : base(owner, template) { ReorganizationQueue = template.ReorganizationTemplate.Get(GetType()); }`。`GetType()` 按 M17 写成 `this.constructor`，`ReorganizationTemplate.Get` 原样照抄。

```ts
super(owner, template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

原 C# 是 `public override Token<char> Clone()`，顺序是 `Sign(this)` → `Add(Data.Select(item => item.Clone()))` → `TryToClose()`。`Add` 传的是**一批**克隆出来的子单元，按 M14(c) 用 `AddRange`（C# 的 `Add<T>(IEnumerable<T>)` 重载改名）。

```ts
const result = new NewArguments(this.Owner, this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
