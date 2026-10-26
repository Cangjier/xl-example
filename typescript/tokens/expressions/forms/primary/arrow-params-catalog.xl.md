# dependencies
```xl
import { Bracket } from "../../../../../core/syntax/basic-tokens/bracket.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { BracketRole } from "../../../statements/bracket-role-resolver.xl.md"
import { BracketRoleCatalog } from "../../../statements/bracket-role-resolver.xl.md"
import { BracketRoleResolver } from "../../../statements/bracket-role-resolver.xl.md"
import { DeferredBracketCatalog } from "../../../statements/deferred-bracket-catalog.xl.md"
import { ParameterListPossibleShape } from "../../../types/parameter-list-possible-shape.xl.md"
import { ParameterShape } from "../../../types/parameter-shape.xl.md"
```

# namespace cangjie

# class ArrowParamsCatalog

**箭头形参 `(` 的候选目录（B4d，A2 §3 #5 的 Deferred replay 落点）。**

三件事，只做这三件：

1. **登记角色目录**：`ArrowParams` 角色挂的候选就是 B1 的 `ParameterPossibleShape`
   （`ParameterListPossibleShape.Shapes()`，进程内一份）。它已经会「按 `ParameterScan` 逐字建一步」，
   本文件不写第二份建树判据（B1 §5 第 3 条）。
2. **在 `=>` 确定时绑定**：`ArrowFunctionShape.BindParameterBracket` 调本类的 `BindArrowParen`，
   后者调 `DeferredBracketCatalog.Bind("ArrowFunctionShape", bracket)` —— **带括号身份的定向 Bind**，
   一次 replay 把 `(` 里攒下的 raw 单元喂给目录。不带身份的通配 Bind 会误领同文件里别的
   `=` 位置的分组括号（`let a = (x), b = (y) => y`），所以定向是正确性要求，不是优化。
3. **收口**：replay 之后把还没收口的参数壳补完（`FinalizeBracket`），并交给 legacy
   `ExpressionBuilder.ParseFunctionParameters` **消费已建的 `ParameterShape`**（那一处新增一条
   「已经是 `ParameterShape` 就直接收下」的分支，见 `expression-builder.xl.md`）。
   本类 replayed 的参数**不改父单元 `Data`**：箭头形状仍由 legacy 在收口格整棵建出
   （B4b §5.2 第 3 条说 `BuildParameters` 与建树是同一拍，这里不抢那一拍）。

**为什么 replay 只在「简单形参表」上做**：`ParameterListPossibleShape.IsSimpleList` 是
`[ '...' ] name [ ':' type ]` 的整份判据（B1 §2）。判否的括号一个字节都不建 ⇒ **不 replay**、
`RejectCount += 1`，整段照 B4b 的现状交给 legacy —— 这样绝不会出现「建了一半的形参表」
（`?` 可选、解构、装饰器、泛型类型都在这条出口上，见报告 §6）。

**[B4f] 默认值参数（`(a: number, b = 1) =>`）不再走这条出口**：`IsArrowable` 补了 B1 的第二份
单元级判据 `IsSimpleArrowList`（语法面相同，额外接受 `= <默认值>`），`Probe` 补了动作 9 把
`=` + 默认值整段建成一个子节点。默认值内部的括号 / 对象 / 数组在 `Data` 里是**一个单元**，
结构上不可能被误当形参表的分隔。建不出来（干跑 `CanBuildDefaults` 判否）仍然整份不 replay。

**默认打开**：`Enabled = true`。关掉 ⇒ `BindArrowParen` 直接返回 `false`，括号回到 B4b 的现状
（Deferred 条目留在 `Pending`，legacy 收口），产物逐字节不变。

## static field Enabled:bool = true

功能开关（B4d）。

## static field MountCount:int = 0

给箭头形参括号登记 `ParameterScan` 状态（= 允许逐字建）的次数。

## static field BindCount:int = 0

真正发起 `DeferredBracketCatalog.Bind` 的次数（不论 replay 成功与否）。

## static field ReplayedCount:int = 0

`Bind` 返回命中（replay 成功）的次数。

## static field RejectCount:int = 0

`IsSimpleList` 判否、整段不 replay 的次数（**显式计数，不静默**）。

## static field HalfBuildCount:int = 0

replay 之后收出来的 `ParameterShape` 仍带残留 raw 单元的次数（构造上不该发生；非 0 即缺陷）。

## static field BuiltParameterCount:int = 0

按括号累计建出的 `ParameterShape` 个数（逐字建造的读数）。

## private static field CatalogRegistered:bool = false

## private static field CreatePossibleShapesCache:Array<PossibleShape> | null = null

## static method Shapes:()=>Array<PossibleShape>

目录里的**唯一**候选：直接复用 B1 的 `ParameterPossibleShape`（进程内一份，与
`ParameterListPossibleShape.Shapes()` 同一个数组，不另建实例）。

```ts
if (ArrowParamsCatalog.CreatePossibleShapesCache === null) {
  ArrowParamsCatalog.CreatePossibleShapesCache = ParameterListPossibleShape.Shapes();
}
return ArrowParamsCatalog.CreatePossibleShapesCache;
```

## static method EnsureRegistered:()=>void

把 `ArrowParams` 角色目录注册进 `BracketRoleResolver`，幂等（只注册一次）。

`End` 传 `null`：终结候选由 `BracketCatalogInstaller.BuildGuide` 统一补
`WaitingEndPossible`（A2 §4.4 的承重件），本目录不自带会 `Accept` 的终结候选。

```ts
if (ArrowParamsCatalog.CatalogRegistered) {
  return;
}
ArrowParamsCatalog.CatalogRegistered = true;
BracketRoleResolver.RegisterCatalog(
  new BracketRoleCatalog(BracketRole.ArrowParams, ArrowParamsCatalog.Shapes(), null));
```

## static method IsArrowable:(bracket:Token)=>bool

这只括号的形参表能不能整份逐字建：`(` 且形参表判真。

两条判据，都是 B1 的（不写第三份）：

1. `ParameterListPossibleShape.IsSimpleList` —— **源码文本**判据（B1 原版，`[ '...' ] name [ ':' type ]`）。
   它遇到 `(` / `{` / `}` / `;` 就整段放弃，所以默认值里带对象 / 数组 / 括号的形参表在它手上判否。
2. `ParameterListPossibleShape.IsSimpleArrowList` —— **[B4f] 单元级**判据，语法面与 ① 相同，额外接受
   `= <默认值表达式>`（默认值内部的对象 / 数组 / 括号是**一个单元**，不会被当成形参表的分隔）。

判据只读结构位与源码文本（不建任何东西），因此跨步稳定：
`(` 格、`)` 格、`=>` 格的结论一致（A2 R7 的「Reject 永久」要求判据跨步稳定）。

```ts
if (bracket === null || !(bracket instanceof Bracket)) {
  return false;
}
const shape = bracket as Bracket;
if (shape.StartBracketChar !== "(") {
  return false;
}
if (ParameterListPossibleShape.IsSimpleList(shape)) {
  return true;
}
return ParameterListPossibleShape.IsSimpleArrowList(shape);
```

## static method IsPendingArrowParen:(bracket:Token)=>bool

`bracket` 是不是**已经登记为 Deferred `ArrowParams`、可以 replay 的箭头形参括号**。

`ArrowPossibleShape` 用它决定「在 `(` 格不 `Reject`」（`Reject` 永久，提前拒掉就再也等不到 `=>`）。
三条判据：`(`、`DeferredBracketCatalog` 里还留着它的条目且角色是 `ArrowParams`、形参表可整份建。

```ts
if (bracket === null || !(bracket instanceof Bracket)) {
  return false;
}
const shape = bracket as Bracket;
if (shape.StartBracketChar !== "(") {
  return false;
}
if (shape.ReplayCount > 0) {
  return false;
}
const entry = DeferredBracketCatalog.Find(shape);
if (entry === null || entry.Plan === null) {
  return false;
}
if (entry.Plan.Role !== BracketRole.ArrowParams) {
  return false;
}
return ArrowParamsCatalog.IsArrowable(shape);
```

## static method FinalizeBracket:(bracket:Bracket, context:SyntaxContext)=>bool

replay 之后把参数表推到「没有下一步」：连做 `Step`，再把还开着的参数壳按 B1 的口径收口
（终点取最后一个已建子单元的终点）。

与 B1 的 `ParameterListPossibleShape.Finalize` 的差别只有**入口**：那个方法按宿主 `Data` 的
最后一个单元找闭括号，箭头场景里 `)` 之后还有 `=>`，所以这里直接按括号身份推。

```ts
const state = ParameterListPossibleShape.FindState(bracket.Data);
if (state === null) {
  return false;
}
state.Bracket = bracket;
let guard = 0;
while (guard < 64 && ParameterListPossibleShape.Step(state, bracket, context)) {
  guard++;
}
if (state.Open !== null && state.Open instanceof ParameterShape) {
  const open = state.Open as ParameterShape;
  ParameterListPossibleShape.CloseShell(state, open, context);
}
return state.Finalized;
```

## static method BindArrowParen:(bracket:Token, context:SyntaxContext)=>bool

**`=>` 确定那一格的唯一入口**（由 `ArrowFunctionShape.BindParameterBracket` 调）：

1. `IsArrowable` 判否 ⇒ `RejectCount += 1`，返回 `false`（不 replay，不建任何东西）；
2. **[B4f]** `ParameterListPossibleShape.CanBuildDefaults` 干跑判否 ⇒ 同样 `RejectCount += 1`、不 replay。
   默认值这一段的建造器是 legacy 的 `ExpressionBuilder.ParseAssign`，干跑就是「先整份建一遍再把结果丢掉」：
   通过之后 `Probe` 的动作 9 一定建得出来，所以**不会出现「名字已建、`=` 还留在 `Data` 里」的半建括号**；
3. `EnsureRegistered` + 给这只括号 `EnsureState`（`ParameterPossibleShape` 的 `IsBuildable` 靠它）；
4. `DeferredBracketCatalog.Bind("ArrowFunctionShape", bracket)` —— **定向、一次**；
5. replay 成功 ⇒ `FinalizeBracket`，再按残留判一次（`HalfBuildCount`）；
6. 返回是否真的建出了参数。

`Bind` 的返回值是「本次被唤醒并已 replay 的括号」；空 ⇒ 没命中（条目已不在 / replay 失败，
失败已在 `DeferredBracketCatalog.ReplayFailureCount` 计数）⇒ 本方法返回 `false`，**不静默**。

**[B4f] 「已经 replay 过」不算拒绝**：`=>` 之后同一只括号会被问第二次（`ParseFunctionParameters`
里一次、收口一次）。replay 之后 `Data` 里已经是 `ParameterShape`，`IsArrowable` 自然判否——
那是 R1 的一次性，返回 `false` 但**不涨 `RejectCount`**（否则 `RejectCount` 会把成功也算成拒绝）。

```ts
if (!ArrowParamsCatalog.Enabled) {
  return false;
}
// [B4f] 已经 replay 过的括号不再算「拒绝」：`=>` 之后同一只括号可能被问第二次
// （`ParseFunctionParameters` 与收口各一次）。replay 之后 `Data` 里已是 `ParameterShape`，
// `IsArrowable` 自然判否——那是 R1 的一次性，不是 reject，不能记成 `RejectCount`。
if (bracket !== null && bracket instanceof Bracket && (bracket as Bracket).ReplayCount > 0) {
  return false;
}
if (!ArrowParamsCatalog.IsArrowable(bracket)) {
  ArrowParamsCatalog.RejectCount += 1;
  return false;
}
const shape = bracket as Bracket;
// [B4f] 默认值干跑闸：建不出来就整份不 replay（一只括号都不动），整段照 B4d 的现状交 legacy。
if (!ParameterListPossibleShape.CanBuildDefaults(shape, context)) {
  ArrowParamsCatalog.RejectCount += 1;
  return false;
}
ArrowParamsCatalog.EnsureRegistered();
const state = ParameterListPossibleShape.EnsureState(shape.Data);
state.Bracket = shape;
ArrowParamsCatalog.MountCount += 1;
ArrowParamsCatalog.BindCount += 1;
const bound = DeferredBracketCatalog.Bind("ArrowFunctionShape", shape);
if (bound.length === 0) {
  return false;
}
ArrowParamsCatalog.ReplayedCount += 1;
ArrowParamsCatalog.FinalizeBracket(shape, context);
const parameters = ParameterListPossibleShape.CollectBuiltParameters(shape);
if (parameters === null) {
  ArrowParamsCatalog.HalfBuildCount += 1;
  return false;
}
ArrowParamsCatalog.BuiltParameterCount += parameters.length;
return parameters.length > 0;
```

## static method Report:()=>string

一行可读读数，供探针与 `tmp/` 下的只读脚本用。

```ts
return "arrowParamsMount=" + ArrowParamsCatalog.MountCount
  + " bind=" + ArrowParamsCatalog.BindCount
  + " replayed=" + ArrowParamsCatalog.ReplayedCount
  + " rejected=" + ArrowParamsCatalog.RejectCount
  + " half=" + ArrowParamsCatalog.HalfBuildCount
  + " built=" + ArrowParamsCatalog.BuiltParameterCount;
```
