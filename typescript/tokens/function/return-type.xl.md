# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

返回类型段：`function f(): T { … }` / `m(): T { … }` 里 `:` 到方法体之前的那一截。

**为什么要单独成段。** 这一段的内容由 `TypeDefineReorganization` 成形，而那条规则是**贪婪**的：
它从 `:` 起一路收，直到 `;` / `,` / 赋值符号为止。函数体（`FunctionBody` / `MethodBody`）不是这三种终止符，
所以只要返回类型与方法体是**兄弟**，`TypeDefine` 就会把整个函数体吞进去——
产物会变成 `<TypeDefine><Identifier>number</Identifier><FunctionBody>…</FunctionBody></TypeDefine>`。

把这一截圈成一段就解决了：段内的单元列表到段边界为止，贪婪的 `TypeDefine` 顶多收完这一段。
这与 `For` / `While` / `Try` 把条件括号的内容搬进 `ForCompare` / `WhileCompare` / `TryBody` 是同一种做法。

它取**通用**重组队列（模板里没有专门注册）：这一段要的正是 `TypeDefine` 与软换行处理。

# class ReturnType extends IndependentToken

返回类型段。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<ReturnType>` 里是返回类型的 XML。

## constructor:(template:Template)=>void

以模板创建，并把模板里按本单元类型准备的重组队列挂上。

取的就是通用队列——`: T` 要在这里凑成 `TypeDefine`。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

顺序与 `WhileCompare.Clone` 一致。

```ts
const result = new ReturnType(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
