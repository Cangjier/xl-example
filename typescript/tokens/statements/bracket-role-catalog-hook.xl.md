# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { BracketRoleHook } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { BracketCatalogInstaller } from "./bracket-catalog-installer.xl.md"
import { BracketRoleResolver } from "./bracket-role-resolver.xl.md"
import { BracketRoleState } from "./bracket-role-resolver.xl.md"
import { DeferredBracketCatalog } from "./deferred-bracket-catalog.xl.md"
import { ParameterListPossibleShape } from "../types/parameter-list-possible-shape.xl.md"
import { StatementRouteUtil } from "./statement-route-util.xl.md"
```

# namespace cangjie

# class BracketRoleCatalogHook extends BracketRoleHook

`Bracket.RoleHook` 的**唯一实现**：把「括号创建」这件事接到
`Resolve` → `Install` / `Register` 上（B0）。

**为什么 core 只留接口、实现在 typescript 侧**：`Bracket` 在 `core`，角色判据要问语句族
（`StatementRouteUtil`）、要认识声明族宿主（按类名），全在 `typescript`。core 反向依赖 typescript
会成环；`BracketChildCreatedHook` 当初就是为这件事只留接口的（`bracket.xl.md:23-31`，
`i-compute-possible-shapes.xl.md:47` 的形参写 `Token` 也是同一原因）。

**默认不装**：`EnsureInstalled` 只在 `StatementRouteUtil.EnableBracketRoleCatalog` 为真时才把本类
挂到 `BracketRoleHook.Current` 上；开关为假时 `Current` 恒为 `null`，`Bracket.Transit` 里那一行
调用是一次 `null` 比较，**不产生任何形状、不改任何 `Data`**（零行为变化）。

[B1/B2] 接线方式（两行，不碰本文件）：

```text
BracketRoleResolver.RegisterCatalog(new BracketRoleCatalog("ParameterList", [ ...候选... ], null));
StatementRouteUtil.EnableBracketRoleCatalog = true;   // 由 B1 的探针 / harness 打开
```

之后 `(` 在 `FunctionDeclarationShape` 宿主上的那一格自动变 `Known` 并被装上目录；
`StatementBlock` / `FunctionBody` 这类**族已装**的括号走 `AlreadyInstalled` 分支（只补终结候选）。

## static field Installed:bool = false

本类是否已经挂到 `BracketRoleHook.Current` 上（只用于探针断言；`Current !== null` 才是权威）。

## static method EnsureInstalled:()=>void

**幂等装配点**。开关为真且还没装时才装一次；开关为假时**什么都不做**（不建实例、不动静态字段）。

调用点：`SourceFileShape` 的构造器（每次解析都会经过，早于任何一只括号）。B1/B2 也可以在
自己的建壳点再调一次（幂等，无副作用）。

```ts
if (!StatementRouteUtil.EnableBracketRoleCatalog) {
  return;
}
if (BracketRoleHook.Current !== null) {
  return;
}
BracketRoleHook.Current = new BracketRoleCatalogHook();
BracketRoleCatalogHook.Installed = true;
```

## method OnBracketCreated:(host:Token, bracket:Token, context:SyntaxContext)=>void

`Bracket.Transit` 在 `OnBracketCreatedEvent`（族收尾）**之后**调用一次。

三路分派，只按 `Resolve` 的 `State`：

1. `Known` ⇒ `BracketCatalogInstaller.Install`（幂等；族已装时只 `SetEndPossible`）；
2. `Deferred` ⇒ 打 `RoleState` 标记 + `DeferredBracketCatalog.Register`（**不装任何目录**）；
3. `Fallback` ⇒ 只打 `RoleState` 标记（计数已经在 `Resolve` 里做过），交 legacy 收口。

```ts
if (!StatementRouteUtil.EnableBracketRoleCatalog) {
  return;
}
if (bracket === null || !(bracket instanceof Bracket)) {
  return;
}
// [B1b] 参数表里的 `[`（`A[]` 的数组括号）在**创建格**推进一步参数表 Probe：
// core 的「安全重算」只对 `{` 生效，`[` 本来要等 `]` 那一格才包出 `ArrayTypeShape`。
// 只认已经登记过参数表状态的括号（`FindState`），其余 `[` 一个字节都不碰。
if (host instanceof Bracket) {
  ParameterListPossibleShape.StepAtBracketCreated(host as Bracket, bracket as Bracket, context);
}
const shape = bracket as Bracket;
const plan = BracketRoleResolver.Resolve(host, bracket, context);
if (plan.IsKnown()) {
  BracketCatalogInstaller.Install(shape, plan, context);
  return;
}
if (plan.IsDeferred()) {
  shape.RoleState = BracketRoleState.Deferred;
  shape.Role = plan.Role;
  DeferredBracketCatalog.RegisterWithKey(bracket, plan.Owner, plan.OwnerKey, context, plan);
  return;
}
shape.RoleState = BracketRoleState.Fallback;
shape.Role = plan.Role;
```
