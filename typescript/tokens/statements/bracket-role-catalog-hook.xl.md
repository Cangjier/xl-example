# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { BracketRoleHook } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ControlHeadPossibleShape } from "./control-head-possible-shape.xl.md"
import { ExpressionBracketPossibleShape } from "../expressions/forms/shared/expression-bracket-possible-shape.xl.md"
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

[T2b] 触发曾经也由本类的 `OnBracketCreated` 承担。[T7b] **已搬走**：`PossibleSource.BracketCreate` 的
两次判定现在由 `Bracket.Transit` 在本钩子**之后**直接对 `IComputePossibleShapes` 发起
（`TriggerBracketCreatePossible` 与让位用的 `HandlesBracketCreatePossible` 均已删除）。于是本类只剩
角色目录装配一条职责，两个开关的语义也随之收窄：

- `EnableBracketRoleCatalog` 为假 ⇒ 不解析角色、不装目录、不登记延迟括号（与 B0 之前一致）；
- `EnableBracketCreatePossible` **不再控制触发**（触发在 core 的 `Transit` 里无条件执行；默认关时角色目录
  没装、`CatalogGuide` 为 `null`，两次判定都自然落空）。它现在只剩两处含义：
  `EnsureInstalled` 的装配条件之一，以及候选侧的判据开关（`ControlHeadPossibleShape.IsMemberName`，T3 的 026 修法）。

[!] 计数残留：`StatementRouteUtil.BracketCreatePossibleCount / BracketCreateSelfCount / BracketCreateParentCount`
原先只在被删掉的 `TriggerBracketCreatePossible` 里递增，现在**无人递增**（恒为 0）。搬出/删除这三个
探针计数留给 T7c/T7e（本任务不改 `statement-route-util.xl.md`）。

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

## method OnBracketCreated:(host:Token, bracket:Token, context:SyntaxContext)=>void

`Bracket.Transit` 在 `OnBracketCreatedEvent`（族收尾）**之后**调用一次。

先做 B0 的角色装配（只在 `EnableBracketRoleCatalog` 为真时）——但 [T7c] 起，**装什么、装不装由候选决定**：
本方法只按固定顺序把 `(host, bracket, context)` 交给四线的 `InstallAtBracketCreated`，
第一个返回 `true` 的候选负责这一格，后续不再问。

1. `ControlHeadPossibleShape`（控制头的 `(`，角色 `ControlHead`）；
2. `ExpressionBracketPossibleShape`（表达式括号，四个表达式角色）；
3. `ParameterListPossibleShape`（参数表 `(`，角色 `ParameterList`；`[` 只推进 Probe）。

[T7f] **成员外壳线已从这里删除**：`MemberShellCatalog` 的 `(` / `{` 由各成员形状自己的
`OnBracketCreatedEvent` → `MemberShellCatalog.OnBracketCreated` 安装，而 `Bracket.Transit` 在调用本钩子
**之前**已经走过那一跳（`OnBracketCreatedEvent` 在 `[B0:ROLE]` 之前）。两处传的 `host` 是同一个单元、
`InstallIfSimple` 与 `OpenMemberBody` 又各自幂等，所以本类这一支是**纯重复**：删掉它，
`MemberShell` 的目录安装数、时机与参数逐字节不变（30 target 与 BuildCount 实测见 `_reports/T7f.md`）。
剩下的两条线没有等价的实例入口（它们的宿主是 `StatementShape` / 各类表达式壳，
不是「认得这只括号」的那个对象），因此仍留在这里，原因同样记在 `_reports/T7f.md`。

`Resolve` / `Install` / `Register` 与 `RoleState` / `Role` 的写入都已从这里删除：它们分别落在
四条线的 `InstallAtBracketCreated` 里，`BracketCatalogInstaller.Install` 仍是唯一的安装动作（幂等）。

**[T7c] 本方法已是纯分派外壳**：不再自己 `Resolve` / `Install` / `Register`，也不再写
`RoleState` / `Role`。剩余三条线的判据与安装动作全部在候选自己的 `InstallAtBracketCreated` 里，
顺序 = ControlHead → ExprBracket → ParameterList；每个候选返回 `true` 表示「这只括号归我，已处理」，
分派即停。

```ts
if (bracket === null || !(bracket instanceof Bracket)) {
  return;
}
const shape = bracket as Bracket;
if (!StatementRouteUtil.EnableBracketRoleCatalog) {
  return;
}
// 三条线按「最窄 → 最宽」分派：控制头 / 表达式括号 / 参数表。
// 每条线只在自己认得这只括号与它的角色时返回 true 并完成（幂等的）安装。
if (ControlHeadPossibleShape.InstallAtBracketCreated(host, shape, context)) {
  return;
}
if (ExpressionBracketPossibleShape.InstallAtBracketCreated(host, shape, context)) {
  return;
}
ParameterListPossibleShape.InstallAtBracketCreated(host, shape, context);
```

