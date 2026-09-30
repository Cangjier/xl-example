# dependencies
```xl
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

三元运算符的条件段：`?` 之前的那一段。

# class TernaryOperatorCondition extends IndependentToken

三元运算符的条件。

它不消费字符：`TernaryOperatorReorganization.Process` 用 `TakeRange` 从单元列表里切出条件段，再整段塞进它的 `Data`，然后签入签出并关闭。

## constructor:(template:Template)=>void

创建后立刻挂上**通用重组队列**。

**为什么必须挂**：这一段的单元是从外面 `TakeRange` 搬进来的，搬进来时外层那一趟重组**已经过去了**；
不给自己装队列的话 `Reorganize` 第一句 `if (this.ReorganizationQueue === null) return;`
（见 `core/syntax/token.xl.md`）就让内部**一趟重组都不跑**——于是
`const x = a === b ? c : d;` 里的 `===`、`(a ? b + c : d)` 里的 `+`
全都留在这一段的 `Data` 里拿不到节点。实测量化：这一类占二元缺口的 29 个节点 / 17 个文件。

**要的是通用队列，不是语句队列**（实测踩过）：

- `InitialKeywordReorganizationQueue` 不行——它只有 `Keyword` + `WrapSymbol` 两条，不含算符折算；
- `InitialStatementReorganizationQueue` 也不行——它额外插了 `StatementReorganization2/3`，
  会把这一段表达式**包进一个 `<Statement>`**（实测 `const y = c ? index + 1 : 0` 的真值段里
  多出一层 `<Statement>`）。三元的分支是表达式，不是语句列表。

取法与 `BinaryOperator` / `UnaryOperator` / `Class` / `MethodDeclaration` 的构造器相同
（`template.ReorganizationTemplate.Get(this.constructor)`，模板没专门注册就是通用队列）。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 克隆全部子单元 → `TryToClose()`。

```ts
const result = new TernaryOperatorCondition(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
