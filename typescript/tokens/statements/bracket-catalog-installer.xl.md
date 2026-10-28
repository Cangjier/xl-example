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

## static field Installed:int = 0

## static field AlreadyInstalled:int = 1

## static field RefusedConflict:int = 2

## static field RefusedFallback:int = 3

# class BracketCatalogInstaller

## static field InstallCount:int = 0

## static field AlreadyInstalledCount:int = 0

## static field RefusedConflictCount:int = 0

## static field RefusedFallbackCount:int = 0

## static field DoubleAcceptGuardCount:int = 0

## static field KeptExistingEndCount:int = 0

## static field RefusedEmptyCount:int = 0

## static method IsInstalled:(bracket:Bracket)=>bool

```ts
if (bracket === null) {
  return false;
}
return bracket.CatalogGuide !== null;
```

## static method BuildGuide:(plan:BracketRoleResult | null)=>CatalogGuide | null

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
const guide = new CatalogGuide(plan.Shapes, end);
// [B3:FLUSH] 角色目录声明了「宿主关闭时补判最后一格」时，把标记带到向导上
// （`CatalogGuide.FlushOnClose` → `Bracket.Close`）。默认 `false` ⇒ 既有目录逐字节不变。
guide.FlushOnClose = plan.FlushOnClose;
return guide;
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
