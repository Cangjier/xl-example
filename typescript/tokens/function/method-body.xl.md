# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

方法声明的**函数体**段：`MethodDeclarationCloseRule.Process` 把 `{ ... }` 那对括号的内容搬进来，
之后这一段自己再跑一遍**语句**重组，把方法体啃成语句树。

与 `ClassBody` / `FunctionBody` / `ForBody` / `IfStatement` 是同一族。

**为什么方法体要单独一段、不能沿用 `Method` 的括号内容**：`Method` 是**调用**节点
（名字 + 实参括号），它的内容就是实参；方法声明的 `{ ... }` 是**语句块**，两者不是一回事。
`MethodDeclaration` 因此把参数括号与方法体分成两个子单元。

收尾规则队列的装配在 `../../parse-pipeline.xl.md`，调用形态是 `ParsePipeline.InitialCloseRuleQueue(this)`。

# class MethodBody extends IndependentToken

方法声明的函数体。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<MethodBody>` 里是各条语句的 XML。

## method SegmentNames:()=>Map<string, Map<string, string>>

**本单元的段，投成目标语言形状时叫什么**：产物那边的分段名 → 目标语言的字段名。

段名是**本单元自己的事实**（见 `Token.SegmentNames`）：这些段是这一个 token 切开来的，叫 `children` 的名字只有在这一页才成立——所以它住在这一页，而不是投影层那张按 kind 分几十档的中央表里。**投影只读这一格**：`structuralProps` 拿它给字段名，查不到才落到那张还没搬完的表。

**形态与基类一致**（`## method` 而不是 `## property`）：基类那一格是 `## method` + 空表，写成属性会在派生类里报「类型不兼容」——两者只能同一形态。

```ts
return new Map([["Block", new Map([["children", "statements"]])]]);
```

## constructor:(template:Template)=>void

创建后立刻把语句收尾规则挂上自己的规则队列——方法体里是一串语句。

```ts
super(template);
ParsePipeline.InitialCloseRuleQueue(this);
```

## method Clone:()=>Token

克隆自身。

顺序与 `ForBody.Clone` 一致。

```ts
const result = new MethodBody(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
