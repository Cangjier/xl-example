# dependencies
```xl
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
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

## field Bracket:Token | null = null

## field Owner:Token | null = null

## field OwnerKey:string = ""

## field Plan:BracketRoleResult | null = null

## field Context:SyntaxContext | null = null

# class DeferredBracketCatalog

## static field Pending:Array<DeferredBracketEntry> = []

## static field ReplayCount:int = 0

## static field ReplayFailureCount:int = 0

## static field ReplayDropCount:int = 0

## static field BindCount:int = 0

## static field Replaying:bool = false

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
    shape.ComputePossibleShapesByIndex(at, context, PossibleSource.Close);
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

```ts
DeferredBracketCatalog.Pending = [];
DeferredBracketCatalog.ReplayCount = 0;
DeferredBracketCatalog.ReplayFailureCount = 0;
DeferredBracketCatalog.ReplayDropCount = 0;
DeferredBracketCatalog.BindCount = 0;
DeferredBracketCatalog.Replaying = false;
```

## static method Report:()=>string

```ts
return "pending=" + DeferredBracketCatalog.Pending.length
  + " binds=" + DeferredBracketCatalog.BindCount
  + " replayed=" + DeferredBracketCatalog.ReplayCount
  + " failed=" + DeferredBracketCatalog.ReplayFailureCount
  + " dropped=" + DeferredBracketCatalog.ReplayDropCount;
```
