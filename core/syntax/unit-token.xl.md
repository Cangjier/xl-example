# dependencies
```xl
import { SyntaxException } from "../exceptions/syntax-exception.xl.md"
import { BranchStates } from "./branch-states.xl.md"
import { ReloadMessage } from "./messages/reload-message.xl.md"
import { Source } from "./source.xl.md"
import { SourceRange } from "./source-range.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { Token } from "./token.xl.md"
import { Template } from "./templates/template.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

单元：能够「挂载」子单元的 token。它是 `Root` / `Statement` / `BlockToken` 这一族的共同父类，负责把「先问退出条件、再跑跳转队列、最后兜底」这套调度固定下来。

# class UnitToken extends Token

单元。

## constructor:(template:Template)=>void

以模板创建。挂载与退出这套调度不需要额外状态，构造器里只有转调。

```ts
super(template);
```

## field ReloadOwner:Token | null = null

`EndExclusive` 交回的那个字符**交给谁**；`null` 表示交给 `Quit()` 返回的父单元。

**为什么需要它**：字符是**经 `MountedUnit` 送来的**，而 `Parent` 是**树上那一格**，两者可以不是同一个。
于是「交回给某个特定的处理者」这件事在 `Quit()` 的返回里表达不出来，得显式指一下。

## protected method Close:()=>void

关闭：只把自己标记为已关闭。

**这是单元最通用的一次收尾**——`Bracket` / `GuideToken` / 第 390 轮那个 `PendingUnit` 原先各写了一份
一模一样的，第 399 轮收进本类。真的要多做点什么的单元自己覆写（`Root.Close` 会往下递归）。

```ts
this.Closed = true;
```

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

判断当前字符是让本单元「退出」还是「前移」。

**抽象方法，由各单元自己实现**（第 405 轮把 `PendingStates` 与那份共用机件一起删掉了——
那是本分支自己造的词汇，上游没有，用户口径：「删了，不要。」）。
回到上游的形状：**谁收尾谁自己写**——
`Bracket` 直接比配对的结束括号、`RegexToken` 比 `/`、`String` 比引号、
`IfCondition` 比 `)`、`IfStatement` 看自己的形态。

「收尾但**不吃**当前字符、要交回」那一档只有一处用得上——`IfStatement` 的单语句体（ASI 那条边界）。
要用时**自己写那几行**：`SignOut(previous)` → `TryToClose()` → `Quit()` → 插一条 `ReloadMessage`；
交回给谁看 `ReloadOwner`（`null` 就是 `Quit()` 返回的父单元）。

```ts
throw new Error("abstract member: ExitOrPre");
```
## method Process:(context:SyntaxContext, source:Source)=>void

处理一个字符。

处理顺序：有挂载单元就转给它；否则先问 `ExitOrPre`，`Done` 就记下 `LastSource` 返回；再依次跑 `ProcessQueue` 里的跳转，哪个返回 `Done` 就返回；都不接手才走 `Default`；无论走哪条路都把 `LastSource` 设为当前字符。

整个流程包在 `try/catch` 里：任何异常都被包成 `SyntaxException`，范围取「前一个位置到当前位置」。注意用 `source.Pre()` 建范围时取出来的是前一个 `Source` 本身，不是字符。

```ts
try {
  if (this.MountedUnit !== null) {
    this.MountedUnit.Process(context, source);
    return;
  }
  if (this.ExitOrPre(context, source) === BranchStates.Done) {
    this.LastSource = source;
    return;
  }
  if (this.ProcessQueue !== null) {
    for (const item of this.ProcessQueue.Data) {
      if (item.Transit(context, this, source) === BranchStates.Done) {
        this.LastSource = source;
        return;
      }
    }
  }
  this.Default(context, source);
  this.LastSource = source;
} catch (e) {
  const previous = source.Pre();
  const range = new SourceRange(previous, source);
  throw SyntaxException.FromInner(range, e);
}
```
