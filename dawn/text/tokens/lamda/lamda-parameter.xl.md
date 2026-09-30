# dependencies
```xl
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

它**没有**覆写 `ToXmlString`，XML 由基类产出：`<LamdaParameter>子单元</LamdaParameter>`。

## constructor:(Template:Template)=>void

转调基类构造器，然后从重组模板里取出「本类」对应的一组重组规则。

`ReorganizationTemplate` 以类的构造器对象为键，所以这里写 `this.constructor`。

```ts
super(Template);
this.ReorganizationQueue = Template.ReorganizationTemplate.Get(this.constructor);
```

## property IsOptional:bool

这个形参是不是可选的：有两个以上子单元，且第二个是 `?` 符号。

### get

长度检查提成提前返回，避免在短列表上先取下标。

`Dawn/Steper` 的 `LamdaStep` 用它算出「哪些形参可以不传」；执行层不在本规范范围内。

```ts
if (this.Data.length < 2) {
  return false;
}
const second = this.Data[1];
return second instanceof Symbol && second.TempToString() === "?";
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 克隆全部子单元 → `TryToClose()`。

```ts
const result = new LamdaParameter(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
