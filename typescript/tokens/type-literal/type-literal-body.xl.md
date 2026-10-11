# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

类型字面量体：`TypeLiteralCloseRule.Process` 把**类型位**那对 `{ }` 的内容搬进来，
之后这一段自己再跑一遍**通用 + 语句**重组，把成员（属性签名、方法签名、调用 / 构造签名）逐个收成节点。

**为什么要与 `ObjectLiteral` 分开**：`{ a: number }` 在**类型位**是一组成员声明，在**值位**是一个对象字面量。
同一对花括号，语义完全不同：前者该有 `Field` / `Signature` 成员，后者不该。
所以类型位的那一对在 `JsonObjectCloseRule` **之前**就被 `TypeLiteralCloseRule` 认走，
值位的仍然落成 `ObjectLiteral`（成员保持平铺，行为不变）。

`{ }` 括号本身**没有**规则队列（见 `../bracket.xl.md` 的 `Use`），
所以类型字面量体在括号关闭时是散着的 `Identifier` / `SymbolToken`；把语句队列挂在这一段上，成员才有成形的时机——
这正是 `InterfaceBody` / `ClassBody` / `NamespaceBody` 走的那条路。

收尾规则队列的装配在 `../../parse-pipeline.xl.md`，调用形态是 `ParsePipeline.InitialCloseRuleQueue(this)`。

# class TypeLiteralBody extends IndependentToken

类型字面量体。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<TypeLiteralBody>` 里是各成员的 XML。

## field WrapperField:string | null | undefined = "members"

**投成目标语言形状时，我这一层是不是「包装」**：是的话给出「内容提到哪个字段」，不是的话是 `undefined`（见 `core/syntax/token.xl.md` 那一节——`null` 与 `undefined` 是两件事）。

类型字面量的成员表（`TypeLiteral.members`）。只有这一种落法，所以这是一格**常量**：
第 1045 轮从 `## method WrapperField()` 改成 `## field`，构造时就赋好，投影只读属性。

## field IsSignatureList:bool = true

**我这一层装的是「成员签名表」**（第 1055 轮）：类型字面量的成员在目标语言那边叫
`PropertySignature` / `MethodSignature` / `CallSignature` / `ConstructSignature`，
与类体里的同名成员（`PropertyDeclaration` / `MethodDeclaration`）是**两种 kind**。

过去这件事由投影层的一个上下文标记（`ctx.signature`）记着，而它设值的依据是**父单元的 kind 名**
——也就是说：「这一格的父单元是不是签名表」本来就是我这一层自己的身份。所以改由本页答，
成员那一侧读自己的父单元（`v.Parent.IsSignatureList`，见 `field.xl.md` 与
`method-declaration.xl.md`），投影不再为它维护一份会漂的状态。

只有这一种落法，所以这是一格**常量**：构造时就赋好，与 `WrapperField` 同一形态、同一理由。

## constructor:(template:Template)=>void

创建后立刻把语句收尾规则挂上自己的规则队列——类型字面量体里是一串成员。

```ts
super(template);
ParsePipeline.InitialCloseRuleQueue(this);
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
