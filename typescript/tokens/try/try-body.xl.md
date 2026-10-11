# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`try` 的语句体：`try` 后面那对花括号里的内容。

# class TryBody extends IndependentToken

`try` 的语句体。

它自己**不消费任何字符**（独立单元，`Process` 由基类留空），构造时把语句层级的规则队列挂上，之后靠 `TryCloseRule` 把整个 `try` 结构打包成一个 `Try`。

## field SegmentNames:Map<string, Map<string, string>> = new Map([["Block", new Map([["children", "statements"]])]])

**本单元的段，投成目标语言形状时叫什么**：产物那边的分段名 → 目标语言的字段名。

段名是**本单元自己的事实**（见 `Token.SegmentNames`）：这些段是这一个 token 切开来的，叫 `children` 的名字只有在这一页才成立——所以它住在这一页，而不是投影层那张按 kind 分几十档的中央表里。**投影只读这一格**：`structuralProps` 拿它给字段名，查不到才落到那张还没搬完的表。

**形态与基类一致**（`## method` 而不是 `## property`）：基类那一格是 `## method` + 空表，写成属性会在派生类里报「类型不兼容」——两者只能同一形态。

## constructor:(template:Template)=>void

创建时先把收尾规则队列挂上——花括号里的内容是一串语句。

`InitialCloseRuleQueue` 负责把「语句级重组」那一串 `CloseRule` 取出来赋给 `CloseRuleQueue`；它读的是通用规则队列，所以装配在 `../../parse-pipeline.xl.md`，调用形态是 `ParsePipeline.InitialCloseRuleQueue(this)`。

```ts
super(template);
ParsePipeline.InitialCloseRuleQueue(this);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 克隆全部子单元 → `TryToClose()`。

```ts
const result = new TryBody(this.Template);
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
