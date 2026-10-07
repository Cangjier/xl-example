# dependencies
```xl
import { BranchStates } from "./branch-states.xl.md"
import { PendingStates } from "./pending-states.xl.md"
import { ReloadMessage } from "./messages/reload-message.xl.md"
import { Source } from "./source.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { Token } from "./token.xl.md"
import { Template } from "./templates/template.xl.md"
import { UnitToken } from "./unit-token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

暂存单元：一个**终止条件由外面给**的单元。

它是 `Bracket` 的泛化。`Bracket.ExitOrPre` 判的是「当前字符等不等于我配对的结束括号」——那是一句写死的比较；而有些构造的结束**不是一个字符**：

    if (a) g();  else h();
           ↑ 体的结束在 `;`，而 `else` 只是「下一个单元开始了」

这种构造今天靠**事后重组**处理：先把整段平列表啃完，关闭时回扫兄弟列表、算下标、切一段出来。暂存单元要做的正是把这件事挪到**读的时候**：先按通用队列照常把子单元造出来，每收一个字符就问一次「到此为止了吗」，答「是」就地收尾。

三条性质让它能当这个角色用：

1. **子单元照通用队列造**：`ProcessQueue` 取的是 `BranchTemplate` 的默认值（一个实参的 `Get`），与挂在 `Root` 下的那一套完全同一份——所以暂存出来的平列表与「直接读进 `Root`」长得一样；
2. **不设 `ReorganizationQueue`**：暂存期间子单元保持**词法阶段的平列表**。这正是 `Statement.IsStatementEnd` / `IsLineBreakBoundary` 那一族判定器要读的形状——它们本来就是拿一张平列表问的（签名就是 `(units: Array<Token>, index: int)`），所以暂存列表可以直接喂进去，**不需要第二份判定逻辑**；
3. **起点自己钉**：覆写 `Process`，第一次收到字符就地设 `SourceRange.Start`（与 `Root.Process` 同一手法）。这样调用方不必记着「挂上去之后还要 `SignIn`」，而 `TryToClose` 那一关不会因为漏签而炸。

`EndExclusive` 那一档是它与 `Bracket` 唯一的语义差别：本单元收尾，但**当前字符不吃**，要交回给外面的处理者。做法是收尾后插一条 `ReloadMessage`——**次序是「先 `Quit` 再插消息」**：`Quit` 会把父单元的 `MountedUnit` 清掉，于是重新处理这个字符时它落到父单元（也就是那个向导）手里，而不是又被自己接走一遍。

**一个字符都没吃过时不许「不含地」结束**：那会留下一个终点为空的范围，而 `TryToClose` 要求两头都签过。所以那一档退回「含地」，把当前字符算进来。

# type PendingTerminator = (context:SyntaxContext, source:Source, unit:PendingUnit)=>PendingStates

「我到此为止了吗」的判定委托。

第二个参数是**当前字符**，第三个是这个暂存单元自己——判定要看「我已经吃了什么」时从 `unit` 上取（`unit.Data` 就是那张平列表）。

# class PendingUnit extends UnitToken

终止条件由外面给的暂存单元。

它是一次性的：收尾之后调用方要把它的子单元搬进真正的节点、再把自己摘掉。所以它**不该出现在产物里**，`Clone` 也直接抛错（与三个字符串向导同一口径）。

## field Terminator:PendingTerminator | null = null

终止判定器。`null` 表示永远不结束（恒 `Continue`）——这是给「还没装上判定器」的中间态留的，正常用法一定要装。

## constructor:(template:Template, terminator:PendingTerminator)=>void

以模板与判定器创建。

`ProcessQueue` 用**一个实参**的 `Get` 取（拿到的是模板的默认值，也就是通用跳转队列）——与 `Bracket` 的取法一字不差。

`ReorganizationQueue` 故意不设：暂存期间要保持平列表（见类正文第 2 条）。

```ts
super(template);
this.Terminator = terminator;
this.ProcessQueue = template.BranchTemplate.Get(this.constructor);
```

## method IsEnd:(context:SyntaxContext, source:Source)=>PendingStates

问一次判定器；没装就恒为 `Continue`。

单独抽出来是为了让判定器之外的人（例如判据、诊断）也能问同一句话，而不必自己再写一遍 `null` 判断。

```ts
if (this.Terminator === null) {
  return PendingStates.Continue;
}
return this.Terminator(context, source, this);
```

## method Process:(context:SyntaxContext, source:Source)=>void

处理一个字符：第一次处理时把范围起点钉在第一个字符上，然后走基类的调度。

与 `Root.Process` 同一手法——`SourceRange.Start` 为空就**直接改字段**（不走 `SignIn`：`SignIn` 只能设一次，而这里要容忍「已经被谁设过」的情形）。

```ts
if (this.SourceRange.Start === null) {
  this.SourceRange.Start = source;
}
super.Process(context, source);
```

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

先问判定器，再决定怎么收尾。

`EndInclusive` 走「签出到当前字符」；`EndExclusive` 走「签出到前一个字符 + 把这个字符插回队列」，前提是**前一个字符存在**——否则退回含地那一档（见类正文）。

**次序**：`SignOut` → `TryToClose` → `Quit`（与 `Bracket.ExitOrPre` 同款），之后**才**插 `ReloadMessage`——插早了会被自己接走。

```ts
const state = this.IsEnd(context, source);
if (state === PendingStates.Continue) {
  return BranchStates.Undo;
}
const previous = source.Pre();
const exclusive = state === PendingStates.EndExclusive && previous !== null;
if (exclusive) {
  this.SignOut(previous!);
} else {
  this.SignOut(source);
}
this.TryToClose();
const owner = this.Quit();
if (exclusive) {
  context.Messages.push(new ReloadMessage(owner, this, source));
}
return BranchStates.Done;
```

## protected method Close:()=>void

关闭：只把自己标记为已关闭。

```ts
this.Closed = true;
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

兜底处理。

**空实现**——字符全交给跳转队列里的各个 `Branch` 去造子单元，与 `Bracket.Default` 同款。不写方法体，打印器产出空方法。

## method Clone:()=>Token

克隆自身——**没有实现**：它是一次性的暂存壳，收尾之后就该被摘掉，不该有人克隆它。

```ts
throw new Error("PendingUnit 是一次性的暂存单元，不应被克隆");
```
