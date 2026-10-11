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

## field SegmentNames:Map<string, Map<string, string>> = new Map([["Block", new Map([["children", "statements"]])]])

**本单元的段，投成目标语言形状时叫什么**：产物那边的分段名 → 目标语言的字段名。

段名是**本单元自己的事实**（见 `Token.SegmentNames`）：这些段是这一个 token 切开来的，叫 `children` 的名字只有在这一页才成立——所以它住在这一页，而不是投影层那张按 kind 分几十档的中央表里。**投影只读这一格**：`structuralProps` 拿它给字段名，查不到才落到那张还没搬完的表。

**形态与基类一致**（两边都是 `## field` + `new Map()`）：基类那一格是**空表**（第 1041 轮从 `## method` 改成属性），这一页给出自己的表——第 1065 轮基类的 `Segments` 就是照这张表的键排出来的（段的**名单与顺序**都从这里来）。

## field BodyField:string | undefined = "body"

**我在父节点上叫哪个字段**（见 `core/syntax/token.xl.md` 的 `Token.BodyField`）：
方法体在目标语言那边就是 `MethodDeclaration.body`（取值器 / 设值器 / 构造器同样是它）
——**自己仍是一个节点**（`Block`），只是字段换了名字。

只有这一种落法，所以这是一格**常量**：第 1045 轮从 `## method BodyField(parentKind)` 改成
`## field`，构造时就赋好。

## method PrintAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 992 轮）：这一格出哪个节点，只许用这个 token 自己的属性、子单元与 `Parent`，不回原文查——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintAst`。

```ts
return ctx.Node("Block", { statements: ctx.Each(v) }, v);
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

## field AstKind:string | undefined = "Block"

**我这一格投成目标语言形状时叫什么节点**（第 1025 轮）：标签是我的类名（`Tag`），
节点名也是我自己的事实——过去它住在投影层那张按标签查的 `KIND_BY_TAG` 中央表里，
同一份事实于是被声明了两遍（我这一页一次、表里一次）。
基类答 `undefined`＝「这个标签没有对应节点」（原样透传 + 记 `unmapped`）。

## field IsStatementNode:bool = true

**我这一格投出来的是不是一条「语句节点」**（第 1039 轮）——是的话答 `true`。

判据原本写成投影层的一个 `# private const STATEMENT_KINDS:Set<string>`
（`typescript/print-ast-common.xl.md`）：单子单元的语句壳**不再套** `ExpressionStatement`，
而 `Block` 就是**这一页自己的节点名**（`AstKind()` 的一格）——所以那是每一页自己的事实，
被写在投影那一页里。今天需要它的页面各自覆写，投影只问这一格
（口径见 `core/syntax/token.xl.md` 的 `IsStatementNode`）。

## field EndsOnBrace:bool = true

**我这一格在目标语言那边收在 `}`（块尾）上**（第 1040 轮）：Block 收在自己那个 `}` 上、
**不调** `parseSemicolon`，所以紧跟我的那个 `;` 是**新的一条空语句**、不是我的终结符
（口径见 `core/syntax/token.xl.md` 的 `EndsOnBrace`）。

判据原来是投影层那张按 kind 查的 `NO_TRAILING_SEMICOLON` 集合，而 `Block` 就是这一页
自己的节点名——所以由本页答。
