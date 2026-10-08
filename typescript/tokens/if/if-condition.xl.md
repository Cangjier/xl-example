# dependencies
```xl
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`if (...)` 的条件部分：**自己吃掉 `( … )`**，最终产出 `<IfCondition>…</IfCondition>`。

# class IfCondition extends UnitToken

`if` / `else if` 的条件单元——**吃字符的单元**，不是一个等着被填的空壳。

**起点由创建它的那一方消费**（`(`）：`IfSet` 在 `(` 那一格建出本单元、给它 `SignIn`、
**不把这个字符再喂进来**——与 `BracketBranch.Success` 对 `Bracket` 的做法**一模一样**。

**终点由本单元自己认**（`ExitOrPre` 比 `)`）；`(` 与 `)` **都不是子单元**
（它们是本单元自己的跨度），所以产出的内容就是原本那一批子单元。

**不数深度**：嵌套的圆括号由**挂载链**处理——里面那一层 `(` 会被 `Bracket.JumpIn` 另挂一个 `Bracket`，

## constructor:(template:Template)=>void

创建条件单元。


现在本单元的落点——`IfSegment`——在它**关之前**就已经是最终那一格了
（`IfSet` 在 `(` 那一刻就把它 `Add` 进段里），所以**关的时候就跑重组**，父亲已经是对的，
「一个单元只建一次、重组只跑一次」）。

```ts
super(template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor);
this.CloseRuleQueue = template.CloseRuleTemplate.Get(this.constructor);
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

兜底处理：**空实现**——字符全交给跳转队列里的各个 `Branch` 去造子单元
（与 `Bracket.Default` 同款）。不写方法体，打印器产出空方法。

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

**结束符就是它自己的 `)`**，含地退出——这个括号属于本单元的范围。

与 `Bracket` 那四行**同一个形状**，只是比较的对象写死成 `)`。

```ts
if (source.Value === ")") {
  this.SignOut(source);
  this.TryToClose();
  this.Quit();
  return BranchStates.Done;
}
return BranchStates.Undo;
```
## method Clone:()=>Token

克隆自身。

新建一个、`Sign(this)` 把起止签成同一个范围、把子单元逐个克隆后 `AddRange`、最后 `TryToClose()`。

```ts
const result = new IfCondition(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
