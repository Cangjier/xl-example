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
  this.ProcessChar(context, source);
} catch (e) {
  const previous = source.Pre();
  const range = new SourceRange(previous, source);
  throw SyntaxException.FromInner(range, e);
}
```

## private method ProcessChar:(context:SyntaxContext, source:Source)=>void

**处理一个字符的本体**（第 1203 轮，用户口径 1.2「提升 parse 效率」）。

**为什么把它从 `Process` 里分出来**：`Process` 是**每个字符**都要走一次的那一格
（`node --cpu-prof` 量 `node_modules/typescript/lib/typescript.d.ts`：self time **11.6%**，
解析期第一名，见 `tmp/r1203-prof3`），而它整个身子原来**包在 `try/catch` 里**——
于是那趟 `ProcessQueue` 的循环、`ExitOrPre`、`Default` 的**每一次调用**都落在异常处理区间内。
分出来之后 `try/catch` 只剩「调本方法 + 建异常」这一层壳，
**判据、次序、`LastSource` 的写法一个字没改**（逐字搬过来）。

**第 1232 轮把「挂载委派」那一支的账量到底了（如实记在这里）**：插桩数过（`tmp/r1232-runcount.mjs`），
一份 `typescript.d.ts` 上 `Process` 与 `ProcessChar` 各 **2119425** 次，其中
`this.MountedUnit !== null` 那一支占 **1528421** 次（**72.1%**）——也就是说这七成
只是「转给挂载单元」。两个改法都量过，都**不留**：

| 改法（只改 `build/`，`tmp/abparse.mjs` 12 对 × 每批 2 轮） | 配对差 | 胜负 |
| --- | --- | --- |
| 一路走到链尾再一次 `Process`（省掉中间每一层的 `Process` + `ProcessChar`） | mean **+35.08ms/轮**（sd 53.57、se 15.46） | 4:8 ⇒ **反而更慢** |
| 把委派提到 `try` 之前（这一层不建 `try/catch`，调用点多态形状一字不变） | mean **−9.96ms/轮**（sd 56.01、se 16.17） | 8:4 ⇒ 与 0 不可分辨 |

⇒ 那一层 `try/catch` **不是**这七成的账（提前算出来也量不出来），而「走链尾」更慢：
走到链尾那一次 `Process` 的调用点上看到的接收者类型比原来杂得多。**两条都整笔撤掉**。

```ts
if (this.MountedUnit !== null) {
  this.MountedUnit.Process(context, source);
  return;
}
if (this.ExitOrPre(context, source) === BranchStates.Done) {
  this.LastSource = source;
  return;
}
// **这一趟用下标走、不用 `for…of`**（第 1204 轮，用户口径 1.2「提升 parse 效率」）：
// 本方法是**每个字符**都要走一次的那一格，实测 `typescript.d.ts` 一份上被调 **2119425** 次
//（`tmp/r1204-count.mjs`）——`for…of` 每次调用都要造一个数组迭代器对象，
// 那 211 万次分配一分钱都不产出（这里只需要按下标走一遍、命中就早退）。
// **判据、次序、早退的写法一个字没改**：走的还是同一个队列、同一个顺序、同一条 `Done` 就 `return`。
const queue = this.ProcessQueue;
if (queue !== null) {
  const branches = queue.Data;
  // **队列入口先按「当前字符」挡一次**（第 1217 轮，用户口径 1.2「提升 parse 效率」）：
  // 这一趟里 **95.0% 的 `Transit` 答否**（第 1205 轮实测：6935798 次里成立 346351 次），
  // 而其中一大批的前提就是**当前字符必须是某一格**——`Class` / `Enum` / `Interface` /
  // `StaticBlock` 四支的第一句都是 `!== "{"`、`LineAnnotation` 是 `!== "/"`、
  // `Statement` / `WrapSymbol` 是 `!== "\n"`……那一句现在就写在 `Branch.TriggerChars` 上，
  // **在这里先比一次**：对不上就不进这一格（省掉一次多态调用 + `Condition` + 往 `Result` 上写一格）。
  // 判据与次序一个字没改：被挡掉的原来就是「第一句答否、立刻 `return`」的那一批；
  // 空串（绝大多数分支）= 任何字符都要问。单字那一档直接比 `!==`（最常见的那一档少一次调用）。
  //
  // **`HasFailedHook` 那一问是这一格的安全阀**（第 1235 轮，用户口径 1.2「提升 parse 效率」）：
  // `Transit` 在答否时还会调一次 `Failed`，而**有的 `Failed` 有副作用**
  // （`SymbolBranch.Failed` 把上一个断开的 `SymbolToken` 关掉）——那时候「按字符跳过这一支」
  // 就等于「那一趟 `Failed` 也不跑」：实测 `- -x` 当场折成 `--`（1697 份语料里 2 份不同）。
  // 所以带钩子的分支**一律不吃 `TriggerChars`**。当时声明的四支都没有钩子 ⇒ 这一句零影响
  //（读数与现场写在 `core/syntax/branch.xl.md` 的 `TriggerChars` 那一节）。
  const value = source.Value;
  for (let i = 0; i < branches.length; i++) {
    const branch = branches[i];
    const trigger = branch.TriggerChars;
    if (branch.HasFailedHook === false && trigger !== "" && (trigger.length === 1 ? trigger !== value : trigger.includes(value) === false)) {
      continue;
    }
    if (branch.Transit(context, this, source) === BranchStates.Done) {
      this.LastSource = source;
      return;
    }
  }
}
this.Default(context, source);
this.LastSource = source;
```
