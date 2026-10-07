# dependencies
```xl
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
import { EnumMember } from "./enum-member.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`enum` 的枚举体段：**自己吃掉 `{ … }`**，最终产出 `<EnumBody>…</EnumBody>`。

**它与 `Bracket` / `IfBody` / `ClassBody` 同款**：

- **开头由创建它的那一方消费**（`{` 那一刻由 `EnumBranch` 消费并 `SignIn`）⇒ `{` 不是子单元；
- **结尾由它自己认**（`ExitOrPre` 比 `}`）⇒ `}` 也不是子单元；
- **嵌套靠挂载链**：体里再出现 `{` 时由通用队列另挂一个 `Bracket`，期间本单元根本没被调用
  ⇒ 见到的 `}` 必定是自己那一层的——**不数深度**。

成员列表的跳转队列挂在本单元上（见构造器）：这一步原先在 `EnumReorganization` 里靠
「括号的内容整体搬过来」凑出来，现在 `{` 由本单元自己吃，队列就跟着本单元走。

# class EnumBody extends UnitToken

枚举体。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<EnumBody>` 里是各条语句的 XML。

## constructor:(template:Template)=>void

只挂**枚举体专属的那条跳转队列**（`ParsePipeline.CreateEnumMemberQueue`）：
成员列表队列 + `EnumMemberBranch.JumpIn`（插在 `StringGuide.JumpIn` 之前）。
注释那几条本来就在更前面，所以 `/** doc */` 的第二格由注释分支先认下。

**不再挂语句重组队列**（第 419 轮）：成员由 **`EnumMemberBranch` 在读的时候**一个一个开出来，
体关闭时 `Data` 里已经是成形的东西——再挂一条语句队列等于让「成员什么时候成形」有**两个答案**。

**也不再覆写 `Process`**（第 421 轮，用户口径）：形状判定住在**队列里的分支**上，
体只管「有挂载就转过去」——两边各一句，一个问题的答案只有一处。

```ts
super(template);
this.ProcessQueue = ParsePipeline.CreateEnumMemberQueue();
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

遇到配对的 `}` 就退出：签出到该字符、尝试关闭（关自己并跑那一趟语句重组）、从父单元卸载自己。

**与 `Bracket.ExitOrPre` 一字不差**（那边比的是 `endBracket`，这里写死 `}`）。

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

体收尾时把 **`Enum` 也收掉**（连续 quit），于是下一个字符直接落到宿主手里。

**先签出再关闭**：`Enum` 的终点就是那个 `}`（`SignOut` 会递归签出最后一个子单元，
而 `EnumBody` 自己已经签过了，递归在那里停）。

**终点由调用方传进来**：`UnitToken.Process` 是「先问 `ExitOrPre`、再记 `LastSource`」，
所以 `ExitOrPre` 里读到的 `LastSource` 还是**上一个**字符。

```ts
const outer = this.Parent;
if (outer === null || outer.constructor.name !== "Enum") {
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

顺序与 `ForBody.Clone` 一致。

```ts
const result = new EnumBody(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
