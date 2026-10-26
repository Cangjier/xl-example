# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { BracketCatalogInstaller } from "./bracket-catalog-installer.xl.md"
import { BracketRoleResult } from "./bracket-role-resolver.xl.md"
import { BracketRoleResolver } from "./bracket-role-resolver.xl.md"
import { StatementRouteUtil } from "./statement-route-util.xl.md"
import { WaitingEndPossible } from "./waiting-end-possible.xl.md"
```

# namespace cangjie

# class DeferredBracketEntry

一条「延迟括号」登记：括号 + 将来会拥有它的壳（或其类名）+ 解析快照。

`Owner` 为 `null` + `OwnerKey` 非空 = 只知道类名（声明族 `Deferred`，壳还不存在）。
`OwnerKey` 为空串 = 通配（任何声明壳来 `Bind` 都可以认领）。

## field Bracket:Token | null = null

## field Owner:Token | null = null

## field OwnerKey:string = ""

## field Plan:BracketRoleResult | null = null

## field Context:SyntaxContext | null = null

# class DeferredBracketCatalog

**延迟括号目录（B0）：登记 → 壳建出来时 `Bind` → 一次升序 replay。**

生命周期（A1 §2.3）：

1. `Bracket.Transit` 解析出 `Deferred` ⇒ `Register`（**只记引用**，不建任何 shape、不改 `Data`、不挂目录）；
2. 拥有它的壳被建出来之后（`BodyGuideUtil.MountShell` / `StatementShellCatalog.Attach` /
   `*PossibleShape.BuildByIndex` 的建壳点）调 `Bind(owner)`；
3. `Bind` 对每个命中的括号执行**一次** `Replay`：装目录 → 对 `bracket.Data` 的每个下标**升序**
   调 `ComputePossibleShapesByIndex` ⇒ 逐格建；
4. owner 收口时仍未 `Bind` ⇒ 条目留在 `Pending` 里（由 `Report` 看得见），legacy 建树照旧。

**Replay 的七条硬规则（R1–R7，A1 §2.3）在本文件里逐条落地，每条都有对应的计数器：**

| 规则 | 落地方式 | 计数 |
|---|---|---|
| R1 一次性 | `bracket.ReplayCount > 0` 直接返回 0；`Register` 对同一括号**覆盖**前值（幂等） | `ReplayCount` |
| R2 只有 raw 才 replay | `IsRaw`：`Data` 里出现 `!IsBasicToken && !IsTriviaToken` 的单元 ⇒ 拒绝 | `ReplayFailureCount` |
| R3 升序、不回头 | `for (let at = 0; at < shape.Data.length; at++)`，replay 里新挂的子括号只进 `Pending`，**不递归** | — |
| R4 终结候选不参与提前建 | `BuildGuide` 保证终结候选是 `WaitingEndPossible`；不是就**拒绝 replay**（构造上不该发生） | `ReplayFailureCount` |
| R5 上下文快照 | `Register` 存 `context` 引用；`Replay` 的 `context` 为 `null` 就拒绝（`CatalogGuide` 会抛，不能吞） | `ReplayFailureCount` |
| R6 失败不半装 | 先 `BuildGuide` 到本地变量；循环内抛错 ⇒ `CatalogGuide` 恢复 `null` + `Drop` | `ReplayFailureCount` |
| R7 不自我重入 | `Replaying` 期间 `Replay` / `Bind` 一律返回空（条目留在 `Pending`，外层结束后可再次 `Bind`） | — |

**所有权顺序（B0c 修）**：`Bind(owner)` 先把命中的条目装进**本次 replay 计划**（一个本地数组），
条目在 replay 期间**仍留在 `Pending`** 里，`plan` 也作为形参显式交给 `Replay`；replay 返回之后才
`Drop`——成功是「一次性消费」（R1），失败是「显式丢弃」（R6 已把向导撤回 `null`，不留半装）。
旧写法「先 `Drop` 再 `Replay`」让 `Replay` 里的 `Find(plan)` 恒为 `null`，`BuildGuide(null)` 永远
返回 `null` ⇒ `ReplayFailureCount += 1`、replay 一次也成功不了（B2 §3 #5）。`ReplayDropCount` 就是
这两条出口的真实读数：`Drop` 每真正摘掉一条 +1，不猜。

**「先 `Drop` 再 `Replay`」是禁式**：`Replay` 的入口**先**取计划（显式形参优先，其次 `Find`），
**再**用计划建向导；本文件里任何「摘条目」都只允许发生在 `Replay` 返回之后（`Bind`）或
`Replay` 的失败分支（R6）。

[B0] 注册表默认是空的（没有角色目录 ⇒ 没有 `Known` ⇒ 没有 replay），所以本文件在默认开关下
一分钱也不花；计数全为 0。

## static field Pending:Array<DeferredBracketEntry> = []

按登记顺序（= 括号创建顺序）。

## static field ReplayCount:int = 0

成功 replay 的**括号**数（同一括号最多 +1，R1）。

## static field ReplayFailureCount:int = 0

replay 被拒绝 / 中途失败的次数（R2 / R4 / R5 / R6 各一条，见上表）。

## static field ReplayDropCount:int = 0

`Drop` **真正摘掉**条目的次数（成功 replay 的一次性消费 + 失败/`Abandon` 的显式丢弃）。
与 `ReplayCount` 的差别正是失败读数：`ReplayCount == 0 && ReplayDropCount > 0` 说明条目全在
失败出口上被消费掉了——不允许把它当绿。

## static field BindCount:int = 0

`Bind` 被调用且**确实有命中**的次数（区分「壳建了但没人等」与「壳建了并唤醒了一批」）。

## static field Replaying:bool = false

R7 的守卫：replay 栈内不允许对任何括号再 `Replay` / `Bind`。

## static method Find:(bracket:Token)=>DeferredBracketEntry | null

```ts
for (const entry of DeferredBracketCatalog.Pending) {
  if (entry.Bracket === bracket) {
    return entry;
  }
}
return null;
```

## static method Register:(bracket:Token, owner:Token | null, context:SyntaxContext, plan:BracketRoleResult)=>void

登记一只延迟括号。**幂等**：同一括号重复登记时覆盖前值（R1），不新增条目。

`ownerKey` 由 `owner` 推出（`null` ⇒ `""` = 通配）；要指定一个**还不存在的壳的类名**用
`RegisterWithKey`。

```ts
if (bracket === null) {
  return;
}
const ownerKey = owner === null ? "" : owner.constructor.name;
DeferredBracketCatalog.RegisterWithKey(bracket, owner, ownerKey, context, plan);
```

## static method RegisterWithKey:(bracket:Token, owner:Token | null, ownerKey:string, context:SyntaxContext, plan:BracketRoleResult)=>void

```ts
if (bracket === null) {
  return;
}
const existing = DeferredBracketCatalog.Find(bracket);
if (existing !== null) {
  existing.Owner = owner;
  existing.OwnerKey = ownerKey;
  existing.Plan = plan;
  existing.Context = context;
  return;
}
const entry = new DeferredBracketEntry();
entry.Bracket = bracket;
entry.Owner = owner;
entry.OwnerKey = ownerKey;
entry.Plan = plan;
entry.Context = context;
DeferredBracketCatalog.Pending.push(entry);
```

## static method PendingCount:()=>int

```ts
return DeferredBracketCatalog.Pending.length;
```

## static method Drop:(bracket:Token | null)=>void

把一个条目从 `Pending` 里摘掉（R6 的 `Abandon` / A2 §3 的失效即丢弃）。**已经建出的形状不受影响**：
本方法只动登记表。每真正摘掉一条 `ReplayDropCount += 1`（找不到条目就不计数，重复 `Drop` 不会虚增）。

```ts
if (bracket === null) {
  return;
}
for (let at = 0; at < DeferredBracketCatalog.Pending.length; at++) {
  if (DeferredBracketCatalog.Pending[at].Bracket === bracket) {
    DeferredBracketCatalog.Pending.splice(at, 1);
    DeferredBracketCatalog.ReplayDropCount += 1;
    StatementRouteUtil.BracketRoleReplayDropCount += 1;
    return;
  }
}
```

## static method Bind:(owner:Token | string, narrow?:Token | null)=>Array<Token>

**壳被建出来的那一刻调用**：返回本次被唤醒（并已 replay）的括号。

匹配规则：`Owner === owner`（同一 token）**或** `OwnerKey === owner.constructor.name`
**或** `OwnerKey === ""`（通配，声明族用）。

**[B4d] 两条扩展（向后兼容：不传第二个形参时逐字节同旧行为）**：

1. **`owner` 可以是角色键字符串**（`"ArrowFunctionShape"`）。箭头形参 `(` 的宿主在 `=>` 那一格
   **还不存在**（整条箭头由 legacy 在收口格建），所以 `ArrowFunctionShape` 只能用键认领自己的括号；
   造一个临时实例来满足 `constructor.name` 匹配是假所有者，这里不这么做。
2. **`narrow` 把本次 `Bind` 限定到一只括号**。不带它时通配条目（声明族 `OwnerKey === ""`）会被
   一并认领——对箭头 site 是错的：同文件里 `let a = (x), b = (y) => y` 的 `(x)` 也是
   `Deferred ArrowParams`，用通配 `Bind` 会把它当形参表 replay（`(x)` 于是被建出参数壳，
   legacy 的分组括号读不到 raw）。所以箭头侧的调用一律带括号身份。

**[B4d] 计划升级（Deferred → Known）见 `UpgradePlan`**：`Classify` 给的 `Deferred` 计划
`Shapes` 为空、`IsKnown() === false`，`BracketCatalogInstaller.BuildGuide` 会拒绝它
（B4b §5.2 第 1 条）。本方法在 replay 之前用**已注册的角色目录**把它升级成合法 `Known` 计划——
不是绕过 `BuildGuide` 的守卫，而是补上它要求的「非空 `Shapes`」。

**所有权（B0c）**：命中的条目先装进 `claimed`（本次 replay 计划），**不**先摘除；`Replay` 拿到
`entry.Plan`（显式形参）并在条目仍在 `Pending` 时按计划建向导。replay 返回后统一 `Drop`：
`>= 0` ⇒ 一次性消费；`< 0` ⇒ 显式丢弃（R6 已在失败分支把 `CatalogGuide` 撤回 `null`）。
因此 replay 期间新登记的括号不会被本次 `Bind` 二次命中（R7），而 replay 之后的重复 `Bind`
再也找不到条目（`ReplayCount` 不涨）。

`Replaying` 期间直接返回空（不自我重入）：条目**留在** `Pending` 里，外层 replay 结束后
再 `Bind` 一次即可命中。

```ts
const matched:Array<Token> = [];
if (owner === null) {
  return matched;
}
if (DeferredBracketCatalog.Replaying) {
  return matched;
}
let tokenOwner:Token | null = null;
let key = "";
if (typeof owner === "string") {
  key = owner;
} else {
  tokenOwner = owner as Token;
  key = tokenOwner.constructor.name;
}
let target:Token | null = null;
if (narrow !== undefined && narrow !== null) {
  target = narrow;
}
const claimed:Array<DeferredBracketEntry> = [];
for (const entry of DeferredBracketCatalog.Pending) {
  if (entry.Bracket === null) {
    continue;
  }
  if (target !== null && entry.Bracket !== target) {
    continue;
  }
  const byToken = tokenOwner !== null && entry.Owner === tokenOwner;
  const byKey = entry.OwnerKey === key;
  const wildcard = entry.OwnerKey === "";
  if (byToken || byKey || wildcard) {
    claimed.push(entry);
  }
}
if (claimed.length === 0) {
  return matched;
}
DeferredBracketCatalog.BindCount += 1;
for (const entry of claimed) {
  const bracket = entry.Bracket;
  if (bracket === null) {
    continue;
  }
  const context = entry.Context;
  if (context === null) {
    // R5：登记时没留 context（不该发生），replay 无从进行 ⇒ 计数并显式丢弃这一个。
    DeferredBracketCatalog.ReplayFailureCount += 1;
    StatementRouteUtil.BracketRoleReplayFailureCount += 1;
    DeferredBracketCatalog.Drop(bracket);
    continue;
  }
  // B0c：plan 随条目一起进 replay，条目**此刻仍在** `Pending` 里（`Find` 也还能找到它）。
  // [B4d] Deferred 计划在这里升级成 Known（补非空 Shapes），否则 `BuildGuide` 会拒绝并丢弃。
  const plan = DeferredBracketCatalog.UpgradePlan(entry);
  const replayed = DeferredBracketCatalog.Replay(bracket, context, plan);
  if (replayed >= 0) {
    matched.push(bracket);
  }
  // 成功 = 一次性消费；失败 = 显式丢弃。两处都在 Replay **返回之后**，不半装、不提前摘。
  DeferredBracketCatalog.Drop(bracket);
}
return matched;
```

## static method UpgradePlan:(entry:DeferredBracketEntry)=>BracketRoleResult | null

**[B4d] 把 `Deferred` 计划升级成可挂的 `Known` 计划。**

`Classify` 给的 `Deferred` 计划只带角色与 `OwnerKey`，`Shapes` 为空——那正是 `B4b` §5.2 说的
「`BuildGuide` 要求 `IsKnown()` 且 `Shapes.length > 0`，Deferred 两条都不满足」。
角色目录（`BracketRoleResolver.Catalogs`）在 replay 这一拍**已经注册**（`*_PossibleShape.EnsureRegistered`），
所以这里用目录把 `Shapes` / `End` / `FlushOnClose` 补齐：`BracketCatalogInstaller.BuildGuide` 于是拿到
一份合法的 `Known` 计划，**守卫一个字没放宽**。

没有注册目录时原样返回 `null`（`Replay` 会按 R4/R6 计数并拒绝——**不静默**）。

```ts
if (entry === null || entry.Plan === null) {
  return null;
}
const plan = entry.Plan;
if (plan.IsKnown()) {
  return plan;
}
const catalog = BracketRoleResolver.FindCatalog(plan.Role);
if (catalog === null) {
  return null;
}
const upgraded = BracketRoleResult.Known(catalog, null, plan.Role, entry.Owner, plan.OwnerKey);
upgraded.Reason = "deferred-catalog-upgrade";
return upgraded;
```

## static method IsRaw:(bracket:Bracket)=>bool

R2：`bracket.Data` 里只允许 trivia 与 basic token。出现任何已建节点（`!IsBasicToken` 且非 trivia）
就说明这只括号的内容已经被别处消费过，再 replay 会二次消费。

```ts
for (const unit of bracket.Data) {
  if (unit.IsTriviaToken) {
    continue;
  }
  if (!unit.IsBasicToken) {
    return false;
  }
}
return true;
```

## static method Replay:(bracket:Token, context:SyntaxContext, plan?:BracketRoleResult | null)=>int

**一次升序 replay**：把 `bracket.Data` 里已经攒下的单元逐个喂给括号自己的目录向导，
返回喂了几格（`0` = 没做/拒绝；`-1` = 失败）。

- **不重放字符、不推 `ReloadMessage`、不调 `Bracket.Close`**：它和 `Reload`（字符级重放）
  是两条互不干扰的通道（A2 R3）；
- 每格只调 `ComputePossibleShapesByIndex(at, context)`：`Candidates.size > 1` 时它返回 `Waiting`
  什么也不建，`size === 1` 且 `IsBuildable` 时才建并 `Reset`。replay 因此天然是「逐格推进目录」，
  不需要第二套判据；
- **计划来源（B0c）**：`plan` 形参优先（`Bind` 从命中条目带过来，这就是「所有权」）；没给才回落到
  `Find(bracket)`。**先取计划、后建向导、最后才允许摘条目**——旧写法在调用方先 `Drop`，`Find`
  恒为 `null`，本方法因此永远返回 `-1`。
- **不 `Drop`**：条目由 `Bind` 在本次 replay 返回之后摘除（成功）或失败分支显式摘除（R6）。
  单独调用本方法不会消费条目，但 `shape.ReplayCount > 0` 会让下一次调用直接返回 0（R1）。

```ts
if (bracket === null || context === null) {
  return -1;
}
if (!(bracket instanceof Bracket)) {
  return -1;
}
const shape = bracket as Bracket;
if (DeferredBracketCatalog.Replaying) {
  // R7：replay 栈内再 replay = 重入，拒绝（不计数：这是设计上的拒绝，不是失败）。
  return 0;
}
if (shape.ReplayCount > 0) {
  // R1：一次性。
  return 0;
}
if (!DeferredBracketCatalog.IsRaw(shape)) {
  // R2：已经有建好的节点，二次消费会污染 legacy 读参。
  DeferredBracketCatalog.ReplayFailureCount += 1;
  StatementRouteUtil.BracketRoleReplayFailureCount += 1;
  return -1;
}
// B0c：先定计划（显式形参 = 所有权；回落 Find 只给直接调用者）。
let effective:BracketRoleResult | null = plan === undefined ? null : plan;
if (effective === null) {
  const entry = DeferredBracketCatalog.Find(shape);
  effective = entry === null ? null : entry.Plan;
}
const guide = BracketCatalogInstaller.BuildGuide(effective);
if (guide === null) {
  DeferredBracketCatalog.ReplayFailureCount += 1;
  StatementRouteUtil.BracketRoleReplayFailureCount += 1;
  return -1;
}
if (guide.EndPossible === null || !(guide.EndPossible instanceof WaitingEndPossible)) {
  // R4：终结候选项能 Accept ⇒ replay 在中间格就可能提前收口。构造上不该发生，拒绝而不是猜。
  DeferredBracketCatalog.ReplayFailureCount += 1;
  StatementRouteUtil.BracketRoleReplayFailureCount += 1;
  return -1;
}
shape.CatalogGuide = guide;
DeferredBracketCatalog.Replaying = true;
let replayed = 0;
try {
  const total = shape.Data.length;
  for (let at = 0; at < total; at++) {
    shape.ComputePossibleShapesByIndex(at, context);
    replayed += 1;
  }
  shape.ReplayCount += 1;
  DeferredBracketCatalog.ReplayCount += 1;
  StatementRouteUtil.BracketRoleReplayCount += 1;
} catch (error) {
  // R6：失败不半装——把向导撤回 `null`，条目摘掉，计数。
  shape.CatalogGuide = null;
  shape.RoleState = 0;
  shape.Role = "";
  replayed = -1;
  DeferredBracketCatalog.ReplayFailureCount += 1;
  StatementRouteUtil.BracketRoleReplayFailureCount += 1;
  DeferredBracketCatalog.Drop(shape);
} finally {
  DeferredBracketCatalog.Replaying = false;
}
return replayed;
```

## static method Reset:()=>void

清空登记表与计数。只给同一进程里两种模式交替的 harness / 单元测试用；正常解析不调。

```ts
DeferredBracketCatalog.Pending = [];
DeferredBracketCatalog.ReplayCount = 0;
DeferredBracketCatalog.ReplayFailureCount = 0;
DeferredBracketCatalog.ReplayDropCount = 0;
DeferredBracketCatalog.BindCount = 0;
DeferredBracketCatalog.Replaying = false;
```

## static method Report:()=>string

一行可读读数，供 B0/B3 的探针与 `tmp/` 下的只读脚本用。

```ts
return "pending=" + DeferredBracketCatalog.Pending.length
  + " binds=" + DeferredBracketCatalog.BindCount
  + " replayed=" + DeferredBracketCatalog.ReplayCount
  + " failed=" + DeferredBracketCatalog.ReplayFailureCount
  + " dropped=" + DeferredBracketCatalog.ReplayDropCount;
```
