# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { BracketRoleHook } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { IComputePossibleShapes } from "../../../core/syntax/i-compute-possible-shapes.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
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

**默认不装**：`EnsureInstalled` 只在 `StatementRouteUtil.EnableBracketRoleCatalog` 或
`StatementRouteUtil.EnableBracketCreatePossible` 为真时才把本类挂到 `BracketRoleHook.Current` 上；
两个开关都为假时 `Current` 恒为 `null`，`Bracket.Transit` 里那一行调用是一次 `null` 比较，
**不产生任何形状、不改任何 `Data`**（零行为变化）。

[B1/B2] 接线方式（两行，不碰本文件）：

```text
BracketRoleResolver.RegisterCatalog(new BracketRoleCatalog("ParameterList", [ ...候选... ], null));
StatementRouteUtil.EnableBracketRoleCatalog = true;   // 由 B1 的探针 / harness 打开
```

之后 `(` 在 `FunctionDeclarationShape` 宿主上的那一格自动变 `Known` 并被装上目录；
`StatementBlock` / `FunctionBody` 这类**族已装**的括号走 `AlreadyInstalled` 分支（只补终结候选）。

[T2b] **同一个实例路径承担 `PossibleSource.BracketCreate` 触发。** T2 的静态辅助工具
（静态接口 + 静态槽 + 静态 `EnsureInstalled` 装配点）已删除：触发逻辑落在本类的
`OnBracketCreated` 里，在角色目录 `Install` / `Register` 之后执行。两个开关相互独立：

- `EnableBracketRoleCatalog` 为假 ⇒ 不解析角色、不装目录、不登记延迟括号（与 B0 之前一致）；
- `EnableBracketCreatePossible` 为假 ⇒ 两次 `BracketCreate` 判定都不发生，旧窄触发（`Close`）保持原行为；
- 两个都开 ⇒ 角色目录装完后再按 T2 的两步问一次（新括号自己 + 父宿主窄域），来源 `BracketCreate`。

## static field Installed:bool = false

本类是否已经挂到 `BracketRoleHook.Current` 上（只用于探针断言；`Current !== null` 才是权威）。

## static method EnsureInstalled:()=>void

**幂等装配点**。任一开关为真且还没装时才装一次；两个都为假时**什么都不做**（不建实例、不动静态字段）。

调用点：`SourceFileShape` 的构造器（每次解析都会经过，早于任何一只括号）。B1/B2 也可以在
自己的建壳点再调一次（幂等，无副作用）。

```ts
if (!StatementRouteUtil.EnableBracketRoleCatalog && !StatementRouteUtil.EnableBracketCreatePossible) {
  return;
}
if (BracketRoleHook.Current !== null) {
  return;
}
BracketRoleHook.Current = new BracketRoleCatalogHook();
BracketRoleCatalogHook.Installed = true;
```

## method HandlesBracketCreatePossible:()=>bool

[T2b] 本实例是否接管 `Bracket.OnBracketCreatedEvent` 里那条旧窄触发。**每次括号创建时现读开关**，
不缓存：开关打开且本钩子已装上 ⇒ `true`，core 的旧触发让位，同一格只由
`TriggerBracketCreatePossible` 用 `BracketCreate` 问一次。

```ts
return StatementRouteUtil.EnableBracketCreatePossible;
```

## method OnBracketCreated:(host:Token, bracket:Token, context:SyntaxContext)=>void

`Bracket.Transit` 在 `OnBracketCreatedEvent`（族收尾）**之后**调用一次。

先做 B0 的角色装配（只在 `EnableBracketRoleCatalog` 为真时）——三路分派，只按 `Resolve` 的 `State`：

1. `Known` ⇒ `BracketCatalogInstaller.Install`（幂等；族已装时只 `SetEndPossible`）；
2. `Deferred` ⇒ 打 `RoleState` 标记 + `DeferredBracketCatalog.Register`（**不装任何目录**）；
3. `Fallback` ⇒ 只打 `RoleState` 标记（计数已经在 `Resolve` 里做过），交 legacy 收口。

角色目录装完之后，再按 `TriggerBracketCreatePossible` 做 T2 的 `BracketCreate` 触发。两步分开的
原因：新括号自己的 `CatalogGuide` 要等 `Install` 才非空，排在 `Resolve` 之前问只能问到父层。

```ts
if (bracket === null || !(bracket instanceof Bracket)) {
  return;
}
const shape = bracket as Bracket;
if (StatementRouteUtil.EnableBracketRoleCatalog) {
  // [B1b] 参数表里的 `[`（`A[]` 的数组括号）在**创建格**推进一步参数表 Probe：
  // core 的「安全重算」只对 `{` 生效，`[` 本来要等 `]` 那一格才包出 `ArrayTypeShape`。
  // 只认已经登记过参数表状态的括号（`FindState`），其余 `[` 一个字节都不碰。
  if (host instanceof Bracket) {
    ParameterListPossibleShape.StepAtBracketCreated(host as Bracket, bracket as Bracket, context);
  }
  const plan = BracketRoleResolver.Resolve(host, bracket, context);
  if (plan.IsKnown()) {
    BracketCatalogInstaller.Install(shape, plan, context);
  } else if (plan.IsDeferred()) {
    shape.RoleState = BracketRoleState.Deferred;
    shape.Role = plan.Role;
    DeferredBracketCatalog.RegisterWithKey(bracket, plan.Owner, plan.OwnerKey, context, plan);
  } else {
    shape.RoleState = BracketRoleState.Fallback;
    shape.Role = plan.Role;
  }
}
this.TriggerBracketCreatePossible(host, bracket, context);
```

## private method TriggerBracketCreatePossible:(host:Token, bracket:Token, context:SyntaxContext)=>void

[T2b] `BracketCreate` 触发的两步，原样搬自 T2 的实现：

1. **新括号自己**：`CatalogGuide !== null`（角色机制刚装上的成员 / 块体目录）时问一次。
   此刻 `Data` 还是空的，`CatalogGuide.ComputePossibleShapes` 取 `Data.length - 1 = -1` 直接 `Nothing`，
   不建任何形状；**不替它装目录**（角色机制没装就跳过）。
2. **父宿主**：实现了 `IComputePossibleShapes` 且挂着**带终结候选**（`EndPossible !== null`）的向导时问一次。
   `EndPossible` 这个前置与 `Bracket.OnBracketCreatedEvent` 里那条旧窄触发同一条安全判据：候选全灭时
   向导返回 `Waiting` 而不是抛「没有候选形状可以构成」；`BracketCatalogInstaller` 装的向导一律配
   `WaitingEndPossible`（永不 `Accept`），所以也不会踩「终结候选与其它候选同时成立」。

两次都显式传 `PossibleSource.BracketCreate`。字符集 / 宿主类型**不放宽**：只对 `{` + 括号宿主
（与旧窄触发同域）。放宽到 `(` / `[` 或非括号宿主会提前建出宿主形状（T2 实测 18 条
`SourceRange is not set` / `括号内没有表达式`），那是候选按来源收紧之后的事。

```ts
if (!StatementRouteUtil.EnableBracketCreatePossible) {
  return;
}
const mounted = bracket as Bracket;
const bracketStart = mounted.StartBracketChar;
StatementRouteUtil.BracketCreatePossibleCount += 1;
// 1) 新括号自己：有目录才问，绝不替它装目录。Data 为空 ⇒ ComputePossibleShapes 直接 Nothing。
if (mounted.CatalogGuide !== null) {
  StatementRouteUtil.BracketCreateSelfCount += 1;
  mounted.ComputePossibleShapes(context, PossibleSource.BracketCreate);
}
// 2) 父宿主：严格沿用 `Bracket.OnBracketCreatedEvent` 旧窄触发的安全判据（`{` + EndPossible 非空）。
if (bracketStart === "{" && host instanceof Bracket) {
  const parent = host as unknown as IComputePossibleShapes;
  if (parent.CatalogGuide !== null && parent.CatalogGuide.EndPossible !== null) {
    StatementRouteUtil.BracketCreateParentCount += 1;
    parent.ComputePossibleShapes(context, PossibleSource.BracketCreate);
  }
}
```
