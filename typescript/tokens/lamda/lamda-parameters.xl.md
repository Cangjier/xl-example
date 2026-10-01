# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Parameter } from "./lamda-parameter.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

Lambda 的**形参列表**：`Lamda` 的第一个子单元，装着若干个 `Parameter`。

# class LamdaParameters extends IndependentToken

Lambda 的形参列表。

`IEnumerable<Parameter>` 不在规范内，所以**不写进 `implements`**，只在这里标注；它带来的两个 `GetEnumerator` 成员本身照常声明，见下。

它**没有**覆写 `ToXmlString`，XML 由基类产出：`<LamdaParameters>各个形参的 XML</LamdaParameters>`。

## constructor:(Template:Template)=>void

转调基类构造器（体是空的）。

```ts
super(Template);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 克隆全部子单元 → `TryToClose()`。

```ts
const result = new LamdaParameters(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```

## method GetEnumerator:()=>Generator<Parameter>

按顺序吐出每一个形参。

体内对 `Data` 逐项 `yield`；写法是 `item as Parameter`（逐项向下转换）。按语法 §8，体内出现 `yield` 即生成器成员。

返回类型取中立等价物，写成 `Generator<Parameter>`。

```ts
for (const item of this.Data) {
  yield item as Parameter;
}
```

## method GetEnumeratorObject:()=>any

给 `IEnumerable` 这条非泛型路径用的版本，只转调泛型版。

它与 `GetEnumerator` **同名同参**，所以在规范里改名 `GetEnumeratorObject`（本来就不能直接调用，改名不影响调用点）。返回类型写 `any`。

```ts
return this.GetEnumerator();
```
