# dependencies
```xl
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { StatementBoundaryUtil } from "./statement-boundary-util.xl.md"
import { StatementRouteUtil } from "./statement-route-util.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

**WP-S2 · 卡死壳检测 + 受控恢复 + EOF 残留只读计数。**

**这一段治的是什么。** 增量路径的语句族是「早建壳 + 收口时补子树」：壳在自己的判定格建出来，之后
**只有壳的终结候选**（`statement-end-possible-shape` / 各族的 endPossible）能让它收口。于是有一类终态缺陷：

> 壳建出来了，但它的终结候选在**本应收口的那一格**没有回答 `Accept`（族判据漏了一条、宿主判据不认、
> 或类型面把基类的候选整个跳过）→ 壳一直张着口 → 后面的语句全部作为 basic 子单元落进它的 `Data`
> → 到 EOF 被「清剩余 basic」静默清掉 → **终态树缺节点，且 `error` 全程为 null**。

`class-inheritance` 的 66 个字符（step 568–635）就是这样消失的。本轮把**根因**修在了
`variable-declaration-shape.xl.md` 的 `[S2:CLOSE-TYPED]`（类型面在收口格交回基类问一次终结候选），
所以本类的恢复路径在当前语料上**一次都不该触发**；它存在的意义是让**同一类**缺陷（壳开了口、下一条
语句的起始词已经到达）不再静默变成「终态树少一段」，而是可计数、可恢复、可追责。

**两条纪律。**

1. **判据不新写**：换行 / 声明跟随边界的词法只有一份，在 `StatementBoundaryUtil`
   （`IsDeclarationFollowBoundary` / `CanEndStatement`）与 `StatementScanner` 里。本类只**调**它们，
   不新建第二份关键字表、不新建第二份 ASI 词法。
2. **先计数、后翻行为**：`ForceClose` 默认 `false`。恢复的**检测**与计数（`StuckShellRecoveryCount`）
   默认开启（`EnableStuckShellRecovery`），强制执行收口必须显式打开——与 EOF 那条
   「先只加计数、计数稳定后再翻成抛错」是同一条风控纪律（`_reports/S1-structural.md` §WP-S2 风险 1）。

# class IncrementalStuckShellRecovery

## static field RecoveryCells:int = 2

「连续 N 格 `Uncertain`」里的 **N**。取 **2** 的依据：范本 `expected-token-time-shapes.md` 的 char 11
把闭合点定在「下一个 token 的**首字符**」，也就是 1 格容差；壳的终结候选在收口格上通常要等到
**下一格**才被求值（`CatalogGuide.ComputePossibleShapes` 用的是 `host.Data.length - 1`，
新单元要下一格才关闭）。因此「已经等过 2 格而终止词已经到达」是**确定卡死**而不是「还在等」。
比 2 小会把跨行的表达式切开，比 2 大等于没修（这一点 WP 规格已定，见 §风险 3）。

```ts
2
```

## static field ForceClose:bool = false

是否**真的**执行强制收口。默认 `false`：本轮只做检测 + 计数（主修已经把根因修掉，恢复路径在语料上
0 次触发）。翻成 `true` 是一个**独立的、必须带 `ts-all` 读数**的提交，不与其他改动混在一起。

```ts
false
```

## static method IsStatementStartWord:(text:string)=>bool

语句起始词（含声明关键字）：残留里出现这些词而没有被任何形状收下，说明「一条语句被整段吞掉」。

```ts
if (text.length === 0) {
  return false;
}
return text === "for" || text === "if" || text === "switch" || text === "while"
  || text === "do" || text === "try" || text === "function" || text === "class"
  || text === "const" || text === "let" || text === "var" || text === "return"
  || text === "throw" || text === "break" || text === "continue" || text === "debugger"
  || text === "import" || text === "export" || text === "interface" || text === "enum"
  || text === "type" || text === "namespace" || text === "declare" || text === "using";
```

## static method StartsStatement:(unit:Token)=>bool

单个单元是否是语句起始词。`Common` 之外（`Symbol` / `Bracket` / 已建形状）一律 `false`
——恢复只针对「语句的起始词被当 basic 吞掉」这一种形态。

```ts
if (unit === null || unit === undefined) {
  return false;
}
if (!(unit instanceof Common)) {
  return false;
}
return IncrementalStuckShellRecovery.IsStatementStartWord((unit as Common).TempToString());
```

## static method ShouldRecover:(units:Array<Token>, waitingCells:int)=>bool

壳卡死的判据，**三个条件同时成立**才算：

1. `EnableStuckShellRecovery` 开着；
2. 连续 `waitingCells >= RecoveryCells` 格都是 `Uncertain`（壳一直没答「可以收口」）；
3. 当前末单元处是一个**声明跟随边界**（`StatementBoundaryUtil.IsDeclarationFollowBoundary`）
   ——下一条语句的起始词已经到了、而上一格的表达式已经可以收住。

条件 3 是**唯一**的边界判据（不新写词法），它保证「强制收口」落在 legacy 也会收口的那一格上。

```ts
if (!StatementRouteUtil.EnableStuckShellRecovery) {
  return false;
}
if (waitingCells < IncrementalStuckShellRecovery.RecoveryCells) {
  return false;
}
if (units.length === 0) {
  return false;
}
return StatementBoundaryUtil.IsDeclarationFollowBoundary(units, units.length - 1);
```

## static method NoteRecovery:()=>void

记一次「检测到卡死壳」。只读计数，不改任何形状。

```ts
StatementRouteUtil.StuckShellRecoveryCount += 1;
```

## static method CanForceClose:()=>bool

检测通过之后**是否允许真的收口**：只有 `ForceClose` 打开时才允许。默认 `false` ⇒ 本方法恒 `false`
⇒ 调用方（`StatementShape.ComputePossibleShapes`）拿到 `false` 时**一个字节都不改**。

```ts
return StatementRouteUtil.EnableStuckShellRecovery && IncrementalStuckShellRecovery.ForceClose;
```

## static method CountEofLeftover:(units:Array<Token>)=>bool

**EOF 兜底只读计数**（`EofDiscardedStatementCount`）。EOF 收口时把整个 `host.Data` 交给这里：

- 跳过 trivia 与 EOF 哨兵，找**第一个**仍然是 basic 的代码单元；
- 它的文本是语句起始词（`IsStatementStartWord`）⇒ 这是一条**被整段吞掉**的语句，计数 +1；
- 返回 `true` 表示「有残留语句」，调用方**当前只把这个事实记进计数**，不抛错、不改树。

**为什么不在这里抛错**：`ts-all` 里 195 条的基线是「仅 `src` 末尾 +1」，它们靠「EOF 静默收尾」成立；
把这里翻成抛错会同时翻转「增量路径 0 抛错」这个全局卖点（`_reports/S1-structural.md` §WP-S2 风险 1）。
计数先落地、读数稳定之后再单独提交「显式抛错」（C10）。

```ts
let firstBasic = -1;
for (let at = 0; at < units.length; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (!unit.IsBasicToken) {
    continue;
  }
  firstBasic = at;
  break;
}
if (firstBasic < 0) {
  return false;
}
if (!IncrementalStuckShellRecovery.StartsStatement(units[firstBasic])) {
  return false;
}
StatementRouteUtil.EofDiscardedStatementCount += 1;
return true;
```

## static method LeftoverText:(units:Array<Token>)=>string

诊断用：把 EOF 残留的 basic 代码单元按顺序拼成一行（只取前 24 个，避免长语句把日志撑爆）。
**只读**，不参与任何判定。

```ts
const parts:Array<string> = [];
let count = 0;
for (const unit of units) {
  if (unit.IsTriviaToken) {
    continue;
  }
  if (!unit.IsBasicToken) {
    continue;
  }
  if (unit instanceof Common) {
    let text = (unit as Common).TempToString();
    if (text.length > 0) {
      parts.push(text);
    }
  }
  count += 1;
  if (count >= 24) {
    break;
  }
}
return parts.join(" ");
```
