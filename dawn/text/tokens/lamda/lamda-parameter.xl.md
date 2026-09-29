# dependencies
```xl
import { IOwner } from "../../../../owners/i-owner.xl.md"
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { Symbol } from "../symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

Lambda 的**一个形参**：`LamdaParameters` 的每个子单元就是一个 `LamdaParameter`，它自己的子单元是「名字 + 可选的 `?` + 可选的类型标注」那一串。

# class LamdaParameter extends IndependentToken

Lambda 的一个形参。

原 C# 侧是 `public class LamdaParameter : IndependentToken<char>`。按 M31，C# 的 `char` 在规范里一律写 `string`。

它**没有**覆写 `ToXmlString`，XML 由基类产出：`<LamdaParameter>子单元</LamdaParameter>`。

## constructor:(owner:IOwner, Template:Template)=>void

转调基类构造器，然后从重组模板里取出「本类」对应的一组重组规则。

原 C# 参数名是小写 `template`，构造体只有一句 `ReorganizationQueue = template.ReorganizationTemplate.Get(GetType())`；`GetType()` 按 M17 落成 `this.constructor`（`SequenceTemplate` 以类的构造器对象为键）。

```ts
super(owner, Template);
this.ReorganizationQueue = Template.ReorganizationTemplate.Get(this.constructor);
```

## property IsOptional:bool

这个形参是不是可选的：有两个以上子单元，且第二个是 `?` 符号。

### get

原 C# 是 `public bool IsOptional => Data.Count >= 2 && Data[1] is Symbol symbol && symbol.TempToString() == "?";`。这里把长度检查提成提前返回，避免 ts 侧在短列表上先取下标（语义等价，`&&` 的短路本就会挡住越界）。

`Dawn/Steper` 的 `LamdaStep` 用它算出「哪些形参可以不传」，执行层不在此次移植范围。

```ts
if (this.Data.length < 2) {
  return false;
}
const second = this.Data[1];
return second instanceof Symbol && second.TempToString() === "?";
```

## method Clone:()=>Token

克隆自身。

原 C# 的顺序是 `Sign(this)` → `Add(Data.Select(item => item.Clone()))` → `TryToClose()`；`Add` 收到的是一批克隆出来的子单元，所以 ts 侧用 `AddRange`（M14(c)）。

```ts
const result = new LamdaParameter(this.Owner, this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
