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

## method SegmentNames:()=>Map<string, Map<string, string>>

**本单元的段，投成目标语言形状时叫什么**：产物那边的分段名 → 目标语言的字段名。

段名是**本单元自己的事实**（见 `Token.SegmentNames`）：这些段是这一个 token 切开来的，叫 `children` 的名字只有在这一页才成立——所以它住在这一页，而不是投影层那张按 kind 分几十档的中央表里。**投影只读这一格**：`structuralProps` 拿它给字段名，查不到才落到那张还没搬完的表。

**形态与基类一致**（`## method` 而不是 `## property`）：基类那一格是 `## method` + 空表，写成属性会在派生类里报「类型不兼容」——两者只能同一形态。

```ts
return new Map([["Block", new Map([["children", "statements"]])]]);
```

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
