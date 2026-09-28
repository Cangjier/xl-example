# dependencies
```xl
import { IOwner } from "../../../../owners/i-owner.xl.md"
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`new` 表达式的类型段：`New.Process` 把 `new` 关键字之后、实参括号之前的所有单元（命名空间限定名、泛型实参、可能的嵌套括号）都收进来。

# class NewType extends IndependentToken

`new` 表达式里被构造的类型。

原 C# 侧是 `public class NewType : IndependentToken<char>`。按 M31，`char` 在规范里写 `string`。

与 `NewArguments` / `ForeachDefine` 不同，它**没有**在构造器里挂重组队列——类型段的内部结构由搬进来的单元自己做（原 C# 同样如此）。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<NewType>` 里是类型名各部分的 XML。

## constructor:(owner:IOwner, template:Template<string>)=>void

原 C# 只是转调基类构造器。

```ts
super(owner, template);
```

## method Clone:()=>Token<string>

克隆自身。

原 C# 是 `public override Token<char> Clone()`，顺序是 `Sign(this)` → `Add(Data.Select(item => item.Clone()))` → `TryToClose()`。`Add` 传的是**一批**克隆出来的子单元，按 M14(c) 用 `AddRange`（C# 的 `Add<T>(IEnumerable<T>)` 重载改名）。

```ts
const result = new NewType(this.Owner, this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
