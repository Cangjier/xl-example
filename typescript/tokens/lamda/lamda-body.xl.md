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
