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

`if` / `else` 的花括号体：`<IfBody>…</IfBody>`。

**它与 `Bracket` 同款** ✓（用户口径：「增加 `ifbody`，类似 `bracket`，处理 `{}`」✓）：

- **开头由创建它的那一方消费** ✓（`{` 那一刻由 `IfSet` / `IfSegment` 消费并 `SignIn` ✓，
  与 `BracketBranch.Success` 对 `Bracket` 的做法**一模一样** ✓）⇒ `{` 不是子单元 ✓；
- **结尾由它自己认** ✓（`ExitOrPre` 比 `}` ✓，含地 ✓）⇒ `}` 也不是子单元 ✓；
- **嵌套靠挂载链** ✓：体里再出现 `{` 时，由通用队列另挂一个 `Bracket` ✓，期间本单元**根本没被调用** ✓
  ⇒ 见到的 `}` 必定是自己那一层的 ✓——**不数深度** ✗。

**它挂在哪一格** ✓：`IfSegment` 名下 ✓（`Parent` = 那一段 ✓），
而字符由段**转**过去 ✓（`Parent` 与 `MountedUnit` 是两件事 ✓）⇒
它之后任何时候跑重组，爬 `Parent` / 看兄弟看到的都是对的 ✓。

# class IfBody extends UnitToken

花括号体单元。

## constructor:(template:Template)=>void

创建体单元，并挂上**收尾规则队列** ✓——体里那些单元要收成一条条 `Statement` ✓
（与 `IfStatement` 的单语句体同款 ✓）。

**两种写法现在等价** ✓（第 564 轮 ✓）：`ParsePipeline.InitialCloseRuleQueue(this)` ✓ 与
`template.CloseRuleTemplate.Get(this.constructor)` ✓ 拿到的是**同一份**通用队列 ✓ ——
从前前者会额外插两条语句规则 ✗，那两条规则随后被证明**一次都没跑到** ✓（第 564 轮量的账 ✓）
⇒ 插入连同规则一起删掉 ✓，这里保留 `InitialCloseRuleQueue` 只是与其它体单元写法一致 ✓。

实测症状（当年量到的 ✓，那时两种写法**不等价** ✓）：`if (a) { return x; }` 的 `<IfBody>`
里是一串**散的** `Keyword` / `Identifier` / `SymbolToken` ✓ ⇒ 投影侧 `Block.statements` 是**空的** ✗
⇒ 整个 `ReturnStatement` 连同它的子树一起从产物里消失 ✓
（全语料 7.6 万个节点挂在这一条上 ✓）。

```ts
super(template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor);
ParsePipeline.InitialCloseRuleQueue(this);
```

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

遇到配对的 `}` 就退出：签出到该字符 ✓、尝试关闭（关自己并跑重组 ✓）、从父单元卸载自己 ✓。

**与 `Bracket.ExitOrPre` 一字不差** ✓（那边比的是 `endBracket` ✓，这里写死 `}` ✓）。

```ts
if (source.Value === "}") {
  this.SignOut(source);
  this.TryToClose();
  this.Quit();
  this.QuitOuter();
  return BranchStates.Done;
}
return BranchStates.Undo;
```

## method Owns:(source:Source)=>bool

当前字符是不是本单元**配对的 `}`**。

判据与 `ExitOrPre` 那一句**一字不差** —— 两处说的是同一件事，写成两份只是为了不必让子单元去调
`ExitOrPre`（那是「处理」不是「询问」）。**这是给挂在本单元下面的解析期单元用的**：
`IfBody` 一旦有了挂载单元，它自己就**再也看不到字符**了，连 `ExitOrPre` 都不会跑
（`UnitToken.Process` 第一句就转给挂载单元）⇒ `if (a) { if (b) f() }` 里那个内层单语句体
必须能问出「外层这个 `}` 归不归它」——不然它会把 `}` 当成体里的一个符号吃掉。

**以上**（`Bracket`）**与以下**（`IfBody`）**是同一个契约的两份实现**：`Bracket` 比的是它自己的
`endBracket`，这里写死 `}`。

```ts
return source.Value === "}";
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

兜底处理：**空实现** ✓（与 `Bracket.Default` 同款 ✓）。不写方法体，打印器产出空方法。

## method QuitOuter:()=>void

体收尾时把**段**也退掉（连续 quit），并顺手给段自签终点（不签的话它被关时会抛）。

于是尾巴的**第一个字符**直接落到 IfSet 手里，整词（else 之类）在那边正常词法化。

```ts
const outer = this.Parent;
if (outer !== null && outer.constructor.name === "IfSegment") {
  const tail = outer.Data[outer.Data.length - 1];
  if (tail !== undefined && tail.SourceRange.End !== null && outer.SourceRange.End === null) {
    outer.SignOut(tail.SourceRange.End);
  }
  outer.Quit();
}
```

## method Clone:()=>Token

克隆自身。

新建一个、`Sign(this)`、把子单元逐个克隆后 `AddRange`、最后 `TryToClose()`。

```ts
const result = new IfBody(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
