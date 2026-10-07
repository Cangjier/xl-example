# dependencies
```xl
import { SyntaxException } from "../exceptions/syntax-exception.xl.md"
import { BranchStates } from "./branch-states.xl.md"
import { PendingStates } from "./pending-states.xl.md"
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

**为什么需要它** ✗：字符是**经 `MountedUnit` 送来的**，而 `Parent` 是**树上那一格** ✓，两者可以不是同一个 ✓。
于是「交回给某个特定的处理者」这件事在 `Quit()` 的返回里表达不出来 ✗，得显式指一下 ✓。

## protected method Close:()=>void

关闭：只把自己标记为已关闭。

**这是单元最通用的一次收尾** ✓——`Bracket` / `GuideToken` / 第 390 轮那个 `PendingUnit` 原先各写了一份
一模一样的 ✓，第 399 轮收进本类 ✓。真的要多做点什么的单元自己覆写 ✓（`Root.Close` 会往下递归 ✓）。

```ts
this.Closed = true;
```

## protected method EndState:(context:SyntaxContext, source:Source)=>PendingStates

**「我到此为止了吗」——本单元自己的判断** ✓。

抽象方法，由各单元实现；忘了覆写会当场抛 ✓，**不会静默「恒 `Continue`」而永远不收尾** ✗。

三档的语义见 `pending-states.xl.md` ✓：
`Continue` 放行、`EndInclusive` 含地收尾、`EndExclusive` 不含地收尾并把当前字符交回 ✓。

**为什么收在这里** ✓：这是**每个单元都要回答的一句话** ✓——`Bracket` 拿它跟配对的结束括号比 ✓、
`RegexToken` 跟 `/` 比 ✓、`String` 跟引号比 ✓、`IfStatement` 拿自己的状态判 ✓。
第 390 轮立的 `PendingUnit` 原本承担这一格 ✓，但它同时把这句话写成了**外面传进来的委托** ✗
（第 398 轮推翻 ✓）；那层壳撤掉之后，剩下的就是**收尾机件本身** ✓——它属于单元这一层 ✓，
不属于某一类单元 ✓。所以 `PendingUnit` 整个并入本类 ✓。

```ts
throw new Error("abstract member: EndState");
```

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

判断当前字符是让本单元「退出」还是「前移」——**收尾机件，本类只有这一份** ✓。

先问 `EndState` ✓：`Continue` 就返回 `Undo`，让这个字符继续往下走 ✓；
否则就地收尾：`SignOut` → `TryToClose` → `Quit` ✓（与 `Bracket` 那一份手写件同一次序 ✓）。

`EndInclusive` 签出到**当前字符** ✓；`EndExclusive` 签出到**前一个字符** ✓并把当前字符插回队列 ✓
——**次序是「先 `Quit` 再插消息」** ✓：`Quit` 会把父单元的 `MountedUnit` 清掉 ✓，
于是重新处理这个字符时它落到该落的地方 ✓，而不是又被自己接走一遍 ✓。
交回的对象取 `ReloadOwner` ✓，没设才用 `Quit()` 返回的父单元 ✓。

**一个字符都没吃过时不许「不含地」结束** ✓：那会留下一个终点为空的范围 ✓，而 `TryToClose` 要求两头都签过 ✓
⇒ 那一档退回含地 ✓（把当前字符算进来 ✓）。

**子类当然可以覆写本方法** ✓——有些单元的退出不只是「收尾」✓（例如 `String` 要处理转义 ✓、
`GenericType` 要判尖括号 ✓）。覆写之后就不必再回答 `EndState` ✓；**但同一件事不要写两份** ✗。

```ts
const state = this.EndState(context, source);
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
const parent = this.Quit();
if (exclusive) {
  context.Messages.push(new ReloadMessage(this.ReloadOwner ?? parent, this, source));
}
return BranchStates.Done;
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
