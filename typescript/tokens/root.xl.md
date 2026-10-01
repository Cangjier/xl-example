# dependencies
```xl
import { Branch } from "../../core/syntax/branch.xl.md"
import { BranchStates } from "../../core/syntax/branch-states.xl.md"
import { Reorganization } from "../../core/syntax/reorganization.xl.md"
import { Source } from "../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../core/syntax/syntax-context.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { UnitToken } from "../../core/syntax/unit-token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../parse-pipeline.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

根单元：整棵语法树的顶点。**`textContext.Root.ToString()` 就是验收用的那份 XML。**

它只做顶点该做的事：关闭子单元、给出兜底与不退出行为、产出 XML、克隆。
**装配职责已经摘走**（见 `../parse-pipeline.xl.md`）——它不再 import 任何具体 token，
也不再持有 `GeneralQueue` / `GeneralReorganize`。原先它俩是 `Root` 的静态成员，
逼着 `Root` 认识整个 token 层，而 token 层又反过来依赖 `Root`（循环依赖）。

**JSON 出口的入口也在这里**：`Root.ToList()`（继承自基类）返回子单元的 AST JSON 数组，
每个元素另带 `range`——上游 Cangjie 的 `code.analyse` 取的正是同一个方法，
所以 `cjcli --ast-json` 一行都不需要另写遍历。`Root` 因此**不覆写** `ToDictionary` / `ToList`：
覆写只会把基类那段一模一样的遍历抄第二遍。

构造器里保留一条契约检查：装配是**调用方**的责任，漏了必须当场炸，而不是等到 XML 里
少一堆节点才发现。检查必须在取到 `ProcessQueue` 之后立刻做——`BranchTemplate.Get` 在没装配时给
`null`，那正是「模板没装过流水线」的判据。

检查**只能放在 `super` 之后**：取队列要写 `this.constructor`，而派生类构造器里访问 `this` 必须在
`super` 之后。所以顺序是 `super` → 取队列 → 判空 → 赋值。

`Root` 的构造器**不再往模板上写任何东西**：模板归调用方，根单元只读。
这也顺带说明了为什么 `Root` 能安全地保持无状态——队列那份「每次新建」的语义现在由
`ParsePipeline.Install` 负责。

# class Root extends UnitToken

根单元。

单元值类型是单字符的 `string`。

## constructor:(template:Template)=>void

以模板创建；模板必须已经装配过通用队列。

装配（装默认队列、装语句重组队列）都归 `ParsePipeline`（`Install` / `InitialStatementReorganizationQueue`），
这里只剩取 `ProcessQueue` 与那条契约检查。

```ts
super(template);
const processQueue = template.BranchTemplate.Get(this.constructor);
if (processQueue === null) {
  throw new Error(
    "Root: the template is not installed. Call new Template().Initialize(ParsePipeline.Install) first.",
  );
}
this.ProcessQueue = processQueue;
ParsePipeline.InitialStatementReorganizationQueue(this);
```

## protected method Close:()=>void

关闭根单元：打个标记，然后把最后一个子单元也关掉。

最后一个子单元可能不存在，所以先判空再关。

```ts
this.Closed = true;
const last = this.Last();
if (last !== null) {
  last.TryToClose();
}
```

## protected method Default:(Context:SyntaxContext, Src:Source)=>void

所有跳转都不接手时的兜底。

对 `\r` / `\n` / 空格 / `\t` 直接返回，其余什么都不做——**注意这意味着未知字符被静默忽略**
（不产生 token，也不报错）。

```ts
switch (Src.Value) {
  case "\r":
  case "\n":
  case " ":
  case "\t":
    return;
  default:
    break;
}
```

## protected method ExitOrPre:(Context:SyntaxContext, Src:Source)=>BranchStates

根单元永远不「退出」，一律交给跳转队列。

```ts
return BranchStates.Undo;
```

## method ToXmlString:()=>string

产出 XML：标签名是运行时类型名，内容是子单元的 XML 串接。

与基类逻辑一致：先取运行时类名，再无分隔拼接 `Data` 里每个子单元的 XML。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name}>${temp.join("")}</${name}>`;
```

## method Process:(Context:SyntaxContext, Src:Source)=>void

处理一个字符：第一次处理时把范围起点钉在第一个字符上，然后走基类的调度。

覆写里只多了一件事——`SourceRange.Start` 为空就地赋值；注意它**直接改字段**，
不走 `SignIn`（`SignIn` 只能设一次，而这里要允许后续再设）。

```ts
if (this.SourceRange.Start === null) {
  this.SourceRange.Start = Src;
}
super.Process(Context, Src);
```

## method Clone:()=>Token

克隆整棵树。

先建一个 `Root`，再把每个子单元克隆后加进去；注意它**没有**调 `TryToClose`，
也没有签入签出范围——与其它 token 的 `Clone` 不同。

克隆出来的根单元共用同一个模板，所以模板上已经装好的队列照旧可用；契约检查也照旧通过。

```ts
const root = new Root(this.Template);
for (const item of this.Data) {
  root.Add(item.Clone());
}
return root;
```
