# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { BracketCatalogInstaller } from "./bracket-catalog-installer.xl.md"
import { BracketRoleResult } from "./bracket-role-resolver.xl.md"
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

[B0] 注册表默认是空的（没有角色目录 ⇒ 没有 `Known` ⇒ 没有 replay），所以本文件在默认开关下
一分钱也不花；计数全为 0。

## static field Pending:Array<DeferredBracketEntry> = []

按登记顺序（= 括号创建顺序）。

## static field ReplayCount:int = 0

成功 replay 的**括号**数（同一括号最多 +1，R1）。

## static field ReplayFailureCount:int = 0

replay 被拒绝 / 中途失败的次数（R2 / R4 / R5 / R6 各一条，见上表）。

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
本方法只动登记表。

```ts
if (bracket === null) {
  return;
}
for (let at = 0; at < DeferredBracketCatalog.Pending.length; at++) {
  if (DeferredBracketCatalog.Pending[at].Bracket === bracket) {
    DeferredBracketCatalog.Pending.splice(at, 1);
    return;
  }
}
```

## static method Bind:(owner:Token)=>Array<Token>

**壳被建出来的那一刻调用**：返回本次被唤醒（并已 replay）的括号。

匹配规则：`Owner === owner`（同一 token）**或** `OwnerKey === owner.constructor.name`
**或** `OwnerKey === ""`（通配，声明族用）。命中的条目**先从 `Pending` 摘除再 replay**：
replay 期间新登记的括号因此不会被本次 `Bind` 二次命中（R7）。

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
const key = owner.constructor.name;
const claimed:Array<DeferredBracketEntry> = [];
for (const entry of DeferredBracketCatalog.Pending) {
  if (entry.Bracket === null) {
    continue;
  }
  const byToken = entry.Owner === owner;
  const byKey = entry.OwnerKey === key;
  const wildcard = entry.OwnerKey === "";
  if (byToken || byKey || wildcard) {
    claimed.push(entry);
  }
}
if (claimed.length === 0) {
  return matched;
}
for (const entry of claimed) {
  DeferredBracketCatalog.Drop(entry.Bracket);
}
DeferredBracketCatalog.BindCount += 1;
for (const entry of claimed) {
  const bracket = entry.Bracket;
  if (bracket === null) {
    continue;
  }
  const context = entry.Context;
  if (context === null) {
    // R5：登记时没留 context（不该发生），replay 无从进行 ⇒ 计数并放弃这一个。
    DeferredBracketCatalog.ReplayFailureCount += 1;
    continue;
  }
  const replayed = DeferredBracketCatalog.Replay(bracket, context);
  if (replayed >= 0) {
    matched.push(bracket);
  }
}
return matched;
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

## static method Replay:(bracket:Token, context:SyntaxContext)=>int

**一次升序 replay**：把 `bracket.Data` 里已经攒下的单元逐个喂给括号自己的目录向导，
返回喂了几格（`0` = 没做/拒绝；`-1` = 失败）。

- **不重放字符、不推 `ReloadMessage`、不调 `Bracket.Close`**：它和 `Reload`（字符级重放）
  是两条互不干扰的通道（A2 R3）；
- 每格只调 `ComputePossibleShapesByIndex(at, context)`：`Candidates.size > 1` 时它返回 `Waiting`
  什么也不建，`size === 1` 且 `IsBuildable` 时才建并 `Reset`。replay 因此天然是「逐格推进目录」，
  不需要第二套判据。

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
const entry = DeferredBracketCatalog.Find(shape);
const plan = entry === null ? null : entry.Plan;
const guide = BracketCatalogInstaller.BuildGuide(plan);
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
DeferredBracketCatalog.BindCount = 0;
DeferredBracketCatalog.Replaying = false;
```

## static method Report:()=>string

一行可读读数，供 B0/B3 的探针与 `tmp/` 下的只读脚本用。

```ts
return "pending=" + DeferredBracketCatalog.Pending.length
  + " binds=" + DeferredBracketCatalog.BindCount
  + " replayed=" + DeferredBracketCatalog.ReplayCount
  + " failed=" + DeferredBracketCatalog.ReplayFailureCount;
```
