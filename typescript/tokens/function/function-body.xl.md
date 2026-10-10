# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`function` 的函数体段：`FunctionCloseRule.Process` 把 `{ ... }` 那对括号的内容搬进来，
之后这一段自己再跑一遍**语句**重组，把函数体啃成语句树。

与 `ClassBody` / `ForBody` / `TryBody` 是同一族：`{ }` 括号没有规则队列（见 `../bracket.xl.md` 的 `Use`），
语句队列必须挂在搬完内容的那一段上。

收尾规则队列的装配在 `../../parse-pipeline.xl.md`，调用形态是 `ParsePipeline.InitialCloseRuleQueue(this)`。

# class FunctionBody extends IndependentToken

函数体。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<FunctionBody>` 里是各条语句的 XML。

## method SegmentNames:()=>Map<string, Map<string, string>>

**本单元的段，投成目标语言形状时叫什么**：产物那边的分段名 → 目标语言的字段名。

段名是**本单元自己的事实**（见 `Token.SegmentNames`）：这些段是这一个 token 切开来的，叫 `children` 的名字只有在这一页才成立——所以它住在这一页，而不是投影层那张按 kind 分几十档的中央表里。**投影只读这一格**：`structuralProps` 拿它给字段名，查不到才落到那张还没搬完的表。

**形态与基类一致**（`## method` 而不是 `## property`）：基类那一格是 `## method` + 空表，写成属性会在派生类里报「类型不兼容」——两者只能同一形态。

```ts
return new Map([["Block", new Map([["children", "statements"]])]]);
```

## method BodyField:(parentKind:string)=>string | undefined

**我在父节点上叫哪个字段**（见 `core/syntax/token.xl.md` 的 `Token.BodyField`）：
函数体在目标语言那边就是 `FunctionDeclaration.body`——**自己仍是一个节点**（`Block`），
只是字段换了名字。

函数的体只有这一种落法（无论 `function` / `declare function` / 生成器），所以不看 `parentKind`。

```ts
return "body";
```

## method PrintAst:(ctx:any, v:any)=>any

**直出**：函数体在目标语言那边就是一个 `Block`，`children` 那一格叫 `statements`
（同一件事上面那一格 `SegmentNames` 已经说过）——所以这一页自己出这个节点，
不再绕回投影层的通用支（换名 + 段循环 + 字段名三道工序这里一步都用不上）。

`ctx.Each` 与通用支那一支**是同一份实现**（`projectEachIn`，父 kind 也照传 `Block`），
空体返回 `undefined`——于是「空函数体」与通用支的产物逐字节相同（空段不写这一格）。

```ts
return ctx.Node("Block", { statements: ctx.Each(v, "Block") }, v);
```

## constructor:(template:Template)=>void

创建后立刻把语句收尾规则挂上自己的规则队列——函数体里是一串语句。

```ts
super(template);
ParsePipeline.InitialCloseRuleQueue(this);
```

## method Clone:()=>Token

克隆自身。

顺序与 `ForBody.Clone` 一致。

```ts
const result = new FunctionBody(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
