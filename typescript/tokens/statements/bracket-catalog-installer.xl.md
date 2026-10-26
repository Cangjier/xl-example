# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { BracketRole } from "./bracket-role-resolver.xl.md"
import { BracketRoleResult } from "./bracket-role-resolver.xl.md"
import { BracketRoleState } from "./bracket-role-resolver.xl.md"
import { StatementRouteUtil } from "./statement-route-util.xl.md"
import { WaitingEndPossible } from "./waiting-end-possible.xl.md"
```

# namespace cangjie

# class BracketInstallResult

`BracketCatalogInstaller.Install` 的返回值（B0）。

## static field Installed:int = 0

目录已经装到括号上（`bracket.CatalogGuide` 从 `null` 变成我们建的那份）。

## static field AlreadyInstalled:int = 1

括号上**已经有目录**（宿主族的 hook 先装的）。这时**绝不覆盖** `PossibleShapes`，只调
`SetEndPossible` 补终结候选——这是 class/interface/enum 现有 hook 那个
`this.CatalogGuide = new CatalogGuide([], End)`（`class-declaration-shape.xl.md:109`）的通用替代形态：
它会清空已装的成员目录，而 `SetEndPossible` 不会。

## static field RefusedConflict:int = 2

同一括号出现**第二个不同角色的 plan**（例如 class 成员目录 vs 块体目录抢同一个 `{`）。
记 `RefusedConflictCount`，保留先装者，不静默覆盖。

## static field RefusedFallback:int = 3

`plan` 不是 `Known`（`Deferred` / `Fallback`）：安装器**什么都不做**，只计数。
Deferred 的登记由 `DeferredBracketCatalog.Register` 负责，不在这里。

# class BracketCatalogInstaller

**括号目录安装器（B0）：幂等安装、只补终结候选、冲突显式计数。**

四条规则（A1 §2.2）：

1. **幂等**：`bracket.CatalogGuide !== null` ⇒ `AlreadyInstalled`，`PossibleShapes` **一个字都不改**；
2. **只补终结候选用 `SetEndPossible`**：已有终结候选时保留原值（`KeptExistingEndCount`），不替换；
3. **冲突必须显式**：同一括号已装 A 角色又来了 B 角色 ⇒ `RefusedConflict` + 计数，保留先装者；
4. **Known 一律配 `WaitingEndPossible`**：传入的 `End` 只要能 `Accept` 就被替换成永不 Accept 的
   `WaitingEndPossible`，并计 `DoubleAcceptGuardCount`——这是 `CatalogGuide` 两条抛错出口都不触发的**前提**
   （A1 §5 R1「同格双 Accept」）。

计数全部是静态只读计数，B0 报告里按它们对账；默认开关关时全部为 0。

## static field InstallCount:int = 0

真正装上去的次数（`CatalogGuide` 由本安装器建出来的次数）。

## static field AlreadyInstalledCount:int = 0

`AlreadyInstalled` 的次数。A1 的验收口径 `BracketRoleKnown == 既有 MountCount 之和` 与它对账：
Known 里绝大多数是这一条（族已经装好，本机制只做族收尾）。

## static field RefusedConflictCount:int = 0

## static field RefusedFallbackCount:int = 0

## static field DoubleAcceptGuardCount:int = 0

「本该带一个会 `Accept` 的终结候选」的次数：每次命中都把终结候选换成 `WaitingEndPossible`。
**它必须永远不导致抛错**，只作为「谁还想着自带终结候选」的审计读数。

## static field KeptExistingEndCount:int = 0

`SetEndPossible` 发现括号已有终结候选而**没有替换**的次数（发布期口径：保留族自己装的那份）。

## static field RefusedEmptyCount:int = 0

`plan.Shapes` 为空的次数（只有 `Known` 且 `catalog === null`，即「族已装」那条短路会走到，
但那时前面已经 `AlreadyInstalled` 返回了；真到这里说明有人给了空目录，拒绝装空向导）。

## static method IsInstalled:(bracket:Bracket)=>bool

```ts
if (bracket === null) {
  return false;
}
return bracket.CatalogGuide !== null;
```

## static method BuildGuide:(plan:BracketRoleResult | null)=>CatalogGuide | null

把 `plan` 变成一个**可以直接挂**的向导；不能挂时返回 `null`（不抛错、不改任何东西）。

**终结候选在这里统一收口**：只要 `plan.End` 不是 `WaitingEndPossible`（含 `null`），就换成
`new WaitingEndPossible()` 并计 `DoubleAcceptGuardCount`。所以本方法返回的向导**一定**不会因为
终结候选而抛「终结候选与其它候选同时成立」，也一定不会因为候选全灭而抛「没有候选形状可以构成」。

`DeferredBracketCatalog.Replay` 也用这一条（R6：先建到本地变量，全部成功才写 `bracket.CatalogGuide`）。

```ts
if (plan === null) {
  return null;
}
if (!plan.IsKnown()) {
  return null;
}
if (plan.Shapes.length === 0) {
  BracketCatalogInstaller.RefusedEmptyCount += 1;
  return null;
}
let end:PossibleShape | null = plan.End;
if (end === null || !(end instanceof WaitingEndPossible)) {
  BracketCatalogInstaller.DoubleAcceptGuardCount += 1;
  end = new WaitingEndPossible();
}
return new CatalogGuide(plan.Shapes, end);
```

## static method Install:(bracket:Bracket, plan:BracketRoleResult, context:SyntaxContext)=>int

```ts
if (bracket === null || plan === null) {
  BracketCatalogInstaller.RefusedFallbackCount += 1;
  return BracketInstallResult.RefusedFallback;
}
if (!plan.IsKnown()) {
  BracketCatalogInstaller.RefusedFallbackCount += 1;
  return BracketInstallResult.RefusedFallback;
}
// 冲突：同一括号已经装了**另一个角色**。保留先装者，显式计数（A1 §5 R3 的报警点）。
if (bracket.RoleState === BracketRoleState.Known && bracket.Role !== ""
  && bracket.Role !== plan.Role) {
  BracketCatalogInstaller.RefusedConflictCount += 1;
  return BracketInstallResult.RefusedConflict;
}
// 幂等：族已经装过目录 ⇒ 只补终结候选，**不替换 PossibleShapes**。
if (bracket.CatalogGuide !== null) {
  BracketCatalogInstaller.AlreadyInstalledCount += 1;
  BracketCatalogInstaller.SetEndPossible(bracket, plan.End);
  return BracketInstallResult.AlreadyInstalled;
}
const guide = BracketCatalogInstaller.BuildGuide(plan);
if (guide === null) {
  BracketCatalogInstaller.RefusedFallbackCount += 1;
  return BracketInstallResult.RefusedFallback;
}
bracket.CatalogGuide = guide;
bracket.Role = plan.Role;
bracket.RoleState = BracketRoleState.Known;
BracketCatalogInstaller.InstallCount += 1;
return BracketInstallResult.Installed;
```

## static method SetEndPossible:(bracket:Bracket, end:PossibleShape | null)=>bool

**只补终结候选，不动 `PossibleShapes`**（A1 §2.2 的硬规则；R5 的直接对策）。

三种返回：

- `false`：括号没有目录 / `end` 为空 / 括号**已有**终结候选（保留原值，计 `KeptExistingEndCount`）；
- `true`：终结候选刚刚被补上。

补上的那个**一定是** `WaitingEndPossible`：能 `Accept` 的终结候选一律替换并计
`DoubleAcceptGuardCount`。

```ts
if (bracket === null || end === null) {
  return false;
}
const guide = bracket.CatalogGuide;
if (guide === null) {
  return false;
}
if (guide.EndPossible !== null) {
  // 族自己已经装了终结候选（例如块体的 `BlockBodyWaitingPossibleShape`）：保留，绝不替换。
  BracketCatalogInstaller.KeptExistingEndCount += 1;
  return false;
}
let waiting:PossibleShape = end;
if (!(end instanceof WaitingEndPossible)) {
  BracketCatalogInstaller.DoubleAcceptGuardCount += 1;
  waiting = new WaitingEndPossible();
}
guide.EndPossible = waiting;
return true;
```
