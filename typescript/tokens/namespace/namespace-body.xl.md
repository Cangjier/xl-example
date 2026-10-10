# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

命名空间体：`NamespaceCloseRule.Process` 把 `namespace N { ... }` 那对花括号的内容搬进来，
之后这一段自己再跑一遍**通用 + 语句**重组，把体内的声明（`interface` / `class` / `function` / `const` / `enum` / 嵌套 `namespace`）逐个收成节点。

`{ }` 括号本身**没有**规则队列（见 `../bracket.xl.md` 的 `Use`：`Use("{")` 不设 `CloseRuleQueue`），
所以命名空间体在括号关闭时是散着的 `Identifier` / `SymbolToken`。把语句队列挂在这一段上，体内的声明才有成形的时机——
这正是 `InterfaceBody` / `ClassBody` 走的那条路。

**这一处是本工程最大的一处「静默丢失」的来源**：`@types/node` 把绝大部分内容包在
`declare namespace NodeJS { … }` 里，体不跑重组，体内所有 interface / class / function 就都不成节点
（审计：真实语料 4538 个 interface 声明只产出 2856 个节点，其中 1456 个正是被这一条连累的）。

收尾规则队列的装配在 `../../parse-pipeline.xl.md`，调用形态是 `ParsePipeline.InitialCloseRuleQueue(this)`。

# class NamespaceBody extends IndependentToken

命名空间体。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<NamespaceBody>` 里是各成员的 XML。

## method SegmentNames:()=>Map<string, Map<string, string>>

**本单元的段，投成目标语言形状时叫什么**：每个节点名各一张表，产物那边的分段名 → 目标语言的字段名。

**为什么要分两份**：这个 token 依上下文投成不同的节点（`ModuleBlock`（同一个 token 的另一种形状） 与 `NamespaceBody`（同一个 token 的另一种形状）），而字段名未必相同——所以按节点名分档。

段名是**本单元自己的事实**（见 `Token.SegmentNames`）：这些段是这一个 token 切开来的，叫 `children` 的名字只有在这一页才成立——所以它住在这一页，而不是投影层那张按 kind 分几十档的中央表里。**投影只读这一格**：`structuralProps` 拿它给字段名，查不到才落到那张还没搬完的表。

**形态与基类一致**（`## method` 而不是 `## property`）：基类那一格是 `## method` + 空表，写成属性会在派生类里报「类型不兼容」——两者只能同一形态。

```ts
return new Map([["ModuleBlock", new Map([["children", "statements"]])], ["NamespaceBody", new Map([["children", "body"]])]]);
```

## method BodyField:(parentKind:string)=>string | undefined

**我在父节点上叫哪个字段**（见 `core/syntax/token.xl.md` 的 `Token.BodyField`）：
命名空间体在目标语言那边就是 `ModuleDeclaration.body`——**自己仍是一个节点**（`ModuleBlock`），
只是字段换了名字。

命名空间体只有这一种落法（它自己不可能是「体里的一条语句」——那说的是 `Namespace`，
见 `namespace.xl.md`），所以不看 `parentKind`。

```ts
return "body";
```

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 992 轮）：与上面的 `PrintDirectAst` 出**同一个答案**，
但只许用这个 token 自己的属性、子单元与 `Parent`（不回原文查）——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintDirectAst`。

```ts
return ctx.Node("ModuleBlock", { statements: ctx.Each(v, "ModuleBlock") }, v);
```


## constructor:(template:Template)=>void

创建后立刻把语句收尾规则挂上自己的规则队列——命名空间体里是一串声明。

```ts
super(template);
ParsePipeline.InitialCloseRuleQueue(this);
```

## method Clone:()=>Token

克隆自身。

顺序与 `ClassBody.Clone` 一致。

```ts
const result = new NamespaceBody(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
