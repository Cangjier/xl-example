# dependencies
```xl
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

类型字面量体：`TypeLiteralReorganization.Process` 把**类型位**那对 `{ }` 的内容搬进来，
之后这一段自己再跑一遍**通用 + 语句**重组，把成员（属性签名、方法签名、调用 / 构造签名）逐个收成节点。

**为什么要与 `JsonObject` 分开**：`{ a: number }` 在**类型位**是一组成员声明，在**值位**是一个对象字面量。
同一对花括号，语义完全不同：前者该有 `Field` / `Signature` 成员，后者不该。
所以类型位的那一对在 `JsonObjectReorganization` **之前**就被 `TypeLiteralReorganization` 认走，
值位的仍然落成 `JsonObject`（成员保持平铺，行为不变）。

`{ }` 括号本身**没有**重组队列（见 `../bracket.xl.md` 的 `Use`），
所以类型字面量体在括号关闭时是散着的 `Common` / `Symbol`；把语句队列挂在这一段上，成员才有成形的时机——
这正是 `InterfaceBody` / `ClassBody` / `NamespaceBody` 走的那条路。

语句重组队列的装配在 `../../parse-pipeline.xl.md`，调用形态是 `ParsePipeline.InitialStatementReorganizationQueue(this)`。

# class TypeLiteralBody extends IndependentToken

类型字面量体。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<TypeLiteralBody>` 里是各成员的 XML。

## constructor:(template:Template)=>void

创建后立刻把语句重组规则挂上自己的重组队列——类型字面量体里是一串成员。

```ts
super(template);
ParsePipeline.InitialStatementReorganizationQueue(this);
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new TypeLiteralBody(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
