# dependencies
```xl
import { IOwner } from "../../../../owners/i-owner.xl.md"
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

Lambda 的**体**：`Lamda` 的第二个子单元，装着 `=>` 右边的东西——要么是花括号体里搬过来的单元，要么是一条语句。

# class LamdaBody extends IndependentToken

Lambda 的体。

原 C# 侧是 `public class LamdaBody : IndependentToken<char>`。按 M31，C# 的 `char` 在规范里一律写 `string`。

它**没有**覆写 `ToXmlString`，XML 由基类产出：`<LamdaBody>子单元</LamdaBody>`。

## constructor:(owner:IOwner, Template:Template)=>void

转调基类构造器，然后把「语句体」那一组默认重组规则装进自己的重组队列。

原 C# 构造体只有一句 `this.InitialStatementReorganizationQueue()`——那是 `Dawn/Text/TextCommonUtil.cs` 里的扩展方法（`Token<char>` 上的），它读的是通用重组队列，所以并到了 `../../parse-pipeline.xl.md`，ts 侧写成 `ParsePipeline.InitialStatementReorganizationQueue(this)`。

```ts
super(owner, Template);
ParsePipeline.InitialStatementReorganizationQueue(this);
```

## field IsStatement:bool = false

这个体是「语句形态」（`=>` 右边没有花括号，靠 `Process` 截断出来的）还是「块形态」（`{}` 搬家过来的）。原 C# 是 `public bool IsStatement { get; set; } = false;`，按 M12 落成字段。

## method Clone:()=>Token

克隆自身。

原 C# 的顺序是 `Sign(this)` → `Add(Data.Select(item => item.Clone()))` → `TryToClose()`；`Add` 收到的是一批克隆出来的子单元，所以 ts 侧用 `AddRange`（M14(c)）。注意**不拷 `IsStatement`**——这是原实现的行为，照抄。

```ts
const result = new LamdaBody(this.Owner, this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
