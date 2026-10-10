# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

Lambda 的**体**：`Lamda` 的第二个子单元，装着 `=>` 右边的东西——要么是花括号体里搬过来的单元，要么是一条语句。

# class LamdaBody extends IndependentToken

Lambda 的体。

它**没有**覆写 `ToXmlString`，XML 由基类产出：`<LamdaBody>子单元</LamdaBody>`。

## method SegmentNames:()=>Map<string, Map<string, string>>

**本单元的段，投成目标语言形状时叫什么**：产物那边的分段名 → 目标语言的字段名。

段名是**本单元自己的事实**（见 `Token.SegmentNames`）：这些段是这一个 token 切开来的，叫 `children` 的名字只有在这一页才成立——所以它住在这一页，而不是投影层那张按 kind 分几十档的中央表里。**投影只读这一格**：`structuralProps` 拿它给字段名，查不到才落到那张还没搬完的表。

**形态与基类一致**（`## method` 而不是 `## property`）：基类那一格是 `## method` + 空表，写成属性会在派生类里报「类型不兼容」——两者只能同一形态。

```ts
return new Map([["Block", new Map([["children", "statements"]])]]);
```

## method BodyField:(parentKind:string)=>string | undefined

**我在父节点上叫哪个字段**（见 `core/syntax/token.xl.md` 的 `Token.BodyField`）：
lambda 的体在目标语言那边就是 `ArrowFunction.body`——**自己仍是一个节点**
（块形态是 `Block`；语句形态由 `Lamda` 那一页按表达式位投），只是字段换了名字。

```ts
return "body";
```

## constructor:(Template:Template)=>void

转调基类构造器，然后把「语句体」那一组默认收尾规则装进自己的规则队列。

`InitialCloseRuleQueue` 读的是通用规则队列，所以装配在 `../../parse-pipeline.xl.md`，写成 `ParsePipeline.InitialCloseRuleQueue(this)`。

```ts
super(Template);
ParsePipeline.InitialCloseRuleQueue(this);
```

## field IsStatement:bool = false

这个体是「语句形态」（`=>` 右边没有花括号，靠 `Process` 截断出来的）还是「块形态」（`{}` 搬家过来的）。纯数据字段。

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 克隆全部子单元 → `TryToClose()`。注意**不拷 `IsStatement`**。

```ts
const result = new LamdaBody(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
