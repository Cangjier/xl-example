# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**映射类型**：把 `{ [K in T]: X }` 收成一个 `MappedType` 单元（TS 那边叫 `MappedTypeNode`）。

第 60 轮之前它**没有专属标签**：产物是 `TypeLiteral` + `TypeLiteralBody` + `Field`——
`{ [K in keyof T]: T[K] }` 与 `{ a: number }` 在树里长得一样（真实语料 36 处，
`cases:align` 一直把它当口径登记着）。两者的成员语法完全不同：前者是**一个映射**，
后者是一串成员声明。

判定放在 `TypeLiteralReorganization.Process` 里（**不新增规则**）：
那对花括号已经在类型位、也已经由 `TypeLiteralReorganization.Previous` 认领，
区别只在这对括号的内容——**第一个实义单元是 `[` 括号、而那个括号里有顶层的 `in`** ⇒ 映射类型。
`{ [key: string]: number }` 那种**索引签名**没有 `in`，仍然收成 `TypeLiteral` ✓。

与 `TypeLiteral` 的另一处不同：映射类型的内容**直接装在自己身上**（它只有一个成员，
再套一层 `TypeLiteralBody` 只是噪声），所以 `MappedType` 自己挂语句队列，成员在这里成形。

# class MappedType extends IndependentToken

映射类型（`{ [K in T]: X }`）。

**类名必须与产物的标签名一致**：`constructor.name` 就是它的 XML 标签名。

它**没有**覆写 `ToXmlString`，XML 由基类产出：`<MappedType>成员的 XML</MappedType>`。

## constructor:(template:Template)=>void

转调基类构造器，然后把**语句队列**装进自己的重组队列——映射类型的内容是散单元
（`{ }` 括号没有队列，见 `../bracket.xl.md` 的 `Use`），要在这里再跑一遍才会收成成员
（`Field` 里的 `[K in T]` 与值类型）。

与 `TypeLiteralBody` / `ClassBody` 同一做法。

```ts
super(template);
ParsePipeline.InitialStatementReorganizationQueue(this);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 子单元逐个克隆后整批加入 → `TryToClose()`；批量加入用 `AddRange`。

```ts
const result = new MappedType(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
