# dependencies
```xl
import { IOwner } from "../../../../owners/i-owner.xl.md"
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { LamdaParameter } from "./lamda-parameter.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

Lambda 的**形参列表**：`Lamda` 的第一个子单元，装着若干个 `LamdaParameter`。

# class LamdaParameters extends IndependentToken

Lambda 的形参列表。

原 C# 侧是 `public class LamdaParameters : IndependentToken<char>, IEnumerable<LamdaParameter>`。按 M31，C# 的 `char` 在规范里一律写 `string`。

`IEnumerable<LamdaParameter>` 是 BCL 接口，按 M20 **不写进 `implements`**（`implements` 的目标必须在规范内声明过），只在这里标注；它带来的两个 `GetEnumerator` 成员本身照常声明，见下。

它**没有**覆写 `ToXmlString`，XML 由基类产出：`<LamdaParameters>各个形参的 XML</LamdaParameters>`。

## constructor:(owner:IOwner, Template:Template)=>void

原 C# 构造体是空的，只是转调基类构造器。

```ts
super(owner, Template);
```

## method Clone:()=>Token

克隆自身。

原 C# 的顺序是 `Sign(this)` → `Add(Data.Select(item => item.Clone()))` → `TryToClose()`；`Add` 收到的是一批克隆出来的子单元，所以 ts 侧用 `AddRange`（M14(c)）。

```ts
const result = new LamdaParameters(this.Owner, this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```

## method GetEnumerator:()=>Generator<LamdaParameter>

按顺序吐出每一个形参。

原 C# 是 `public IEnumerator<LamdaParameter> GetEnumerator()`，体内是 `foreach (LamdaParameter item in Data) yield return item;`——`foreach` 的显式元素类型相当于一次向下转换，ts 侧写成 `item as LamdaParameter`。按语法 §8，体内出现 `yield` 即生成器成员，直接直译。

返回类型是 BCL 的 `IEnumerator<LamdaParameter>`；按 M20 取中立等价物，ts 侧写成 `Generator<LamdaParameter>`。

```ts
for (const item of this.Data) {
  yield item as LamdaParameter;
}
```

## method GetEnumeratorObject:()=>any

原 C# 是显式接口实现 `IEnumerator IEnumerable.GetEnumerator()`——只转调泛型版，给 `IEnumerable` 这条非泛型路径用。

它与 `GetEnumerator` **同名同参**，按 M14(c) 改名 `GetEnumeratorObject`（它是显式接口实现，C# 里本来就不能直接调用，改名不影响调用点）。返回类型是 BCL 的 `IEnumerator`，按 M20 写 `any`。

```ts
return this.GetEnumerator();
```
