# dependencies
```xl
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

接口体：**自己吃掉 `{ … }`**，最终产出 `<InterfaceBody>…</InterfaceBody>`。

**它与 `Bracket` / `IfBody` / `ClassBody` / `EnumBody` 同款**：

- **开头由创建它的那一方消费**（`{` 那一刻由 `InterfaceBranch` 消费并 `SignIn`）⇒ `{` 不是子单元；
- **结尾由它自己认**（`ExitOrPre` 比 `}`）⇒ `}` 也不是子单元；
- **嵌套靠挂载链**：体里再出现 `{` 时由通用队列另挂一个 `Bracket`，期间本单元根本没被调用
  ⇒ 见到的 `}` 必定是自己那一层的——**不数深度**。

成员列表的跳转队列挂在本单元上（见构造器）：`{ }` 括号本身**没有**规则队列
（见 `../bracket.xl.md` 的 `Use`），所以体在括号关闭时是散着的 `Identifier` / `SymbolToken`；
把语句队列挂在这一段上，成员（字段声明、方法签名）才有成形的时机。

# class InterfaceBody extends UnitToken

接口体。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<InterfaceBody>` 里是各成员的 XML。

## constructor:(template:Template)=>void

创建后立刻做两件事：挂**成员列表**的跳转队列、挂**语句**规则队列。

```ts
super(template);
this.ProcessQueue = ParsePipeline.CreateMemberListQueue();
ParsePipeline.InitialCloseRuleQueue(this);
```

## method Owns:(source:Source)=>bool

当前字符是不是本单元**配对的 `}`**。

判据与 `ExitOrPre` 那一句**一字不差**——写成两份只是为了不必让子单元去调 `ExitOrPre`
（那是「处理」不是「询问」）。它是给**挂在本单元下面的解析期单元**用的：
本单元一旦有了挂载单元，自己就再也看不到字符了。

```ts
return source.Value === "}";
```

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

遇到配对的 `}` 就退出：签出到该字符、尝试关闭（关自己并跑那一趟收尾规则）、
再连续 quit 把 `Interface` 也收掉。

**与 `Bracket.ExitOrPre` 一字不差**（那边比的是 `endBracket`，这里写死 `}`），
多的那一步是 `QuitOuter`。

```ts
if (source.Value === "}") {
  this.SignOut(source);
  this.TryToClose();
  this.Quit();
  this.QuitOuter(source);
  return BranchStates.Done;
}
return BranchStates.Undo;
```

## private method QuitOuter:(source:Source)=>void

体收尾时把 **`Interface` 也收掉**（连续 quit），于是下一个字符直接落到宿主手里。

**先签出再关闭**：`Interface` 的终点就是那个 `}`（`SignOut` 会递归签出最后一个子单元，
而 `InterfaceBody` 自己已经签过了，递归在那里停）。

**终点由调用方传进来**：`UnitToken.Process` 是「先问 `ExitOrPre`、再记 `LastSource`」，
所以 `ExitOrPre` 里读到的 `LastSource` 还是**上一个**字符。

```ts
const outer = this.Parent;
if (outer === null || outer.constructor.name !== "Interface") {
  return;
}
if (outer.SourceRange.End === null) {
  outer.SignOut(source);
}
outer.TryToClose();
outer.Quit();
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

兜底处理：**空实现**（字符全交给挂载的子单元）。

## method Clone:()=>Token

克隆自身。

顺序与 `ClassBody.Clone` 一致。

```ts
const result = new InterfaceBody(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
