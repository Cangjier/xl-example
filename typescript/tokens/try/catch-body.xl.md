# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`catch` 的语句体：`catch` 后面的那一对花括号。

# class CatchBody extends IndependentToken

`catch` 的语句体。

与 `TryBody` 同构：不消费字符，只作为 `TryCloseRule` 打包出来的一个子单元，挂在 `Try` 下（可以有多个，`Try.Catches` 按源码顺序取）。

## method SegmentNames:()=>Map<string, Map<string, string>>

**本单元的段，投成目标语言形状时叫什么**：产物那边的分段名 → 目标语言的字段名。

段名是**本单元自己的事实**（见 `Token.SegmentNames`）：这些段是这一个 token 切开来的，叫 `children` 的名字只有在这一页才成立——所以它住在这一页，而不是投影层那张按 kind 分几十档的中央表里。**投影只读这一格**：`structuralProps` 拿它给字段名，查不到才落到那张还没搬完的表。

**形态与基类一致**（`## method` 而不是 `## property`）：基类那一格是 `## method` + 空表，写成属性会在派生类里报「类型不兼容」——两者只能同一形态。

```ts
return new Map([["Block", new Map([["children", "statements"]])]]);
```

## method PrintAst:(ctx:any, v:any)=>any

**直出**：`catch` 的语句体在目标语言那边就是一个 `Block`，`children` 那一格叫 `statements`
（见上面 `SegmentNames`）——所以这一页自己出这个节点，不再绕回投影层的通用支。

**它没有 `BodyField`**：`catch` 那一段的字段名由 `Try` 自己排（一条 `CatchClause` 里
`block` 那一格的位置只有 `Try` 知道，见 `try.xl.md` 的 `PrintAst`），
所以这一页只答「我投成什么」，不答「我在父亲里叫什么」。

`ctx.Each` 与通用支那一支**是同一份实现**（`projectEachIn`，父 kind 照传 `Block`），
空体返回 `undefined`——于是「空 `catch` 体」与通用支的产物逐字节相同（空段不写这一格）。

```ts
return ctx.Node("Block", { statements: ctx.Each(v, "Block") }, v);
```

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 992 轮）：与上面的 `PrintAst` 出**同一个答案**，
但只许用这个 token 自己的属性、子单元与 `Parent`（不回原文查）——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintDirectAst`。

```ts
return ctx.Node("Block", { statements: ctx.Each(v, "Block") }, v);
```


## constructor:(template:Template)=>void

创建时先把收尾规则队列挂上。

`InitialCloseRuleQueue` 读的是通用规则队列，所以装配在 `../../parse-pipeline.xl.md`，调用形态是 `ParsePipeline.InitialCloseRuleQueue(this)`。

```ts
super(template);
ParsePipeline.InitialCloseRuleQueue(this);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 克隆全部子单元 → `TryToClose()`。

```ts
const result = new CatchBody(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
