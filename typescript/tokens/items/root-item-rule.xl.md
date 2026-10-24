# dependencies
```xl
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { BasicTokenBatch } from "../../../core/syntax/batch/basic-token-batch.xl.md"
import { BatchPolicy } from "../../../core/syntax/batch/batch-policy.xl.md"
import { BatchStates } from "../../../core/syntax/batch/batch-states.xl.md"
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { IBatchHost } from "../../../core/syntax/batch/i-batch-host.xl.md"
import { ItemListEngine, ItemRule } from "../../../core/syntax/batch/item-list.xl.md"
import { ItemScanState } from "../../../core/syntax/batch/item-scan-state.xl.md"
import { RawFallback } from "../../../core/syntax/batch/raw-fallback.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ClassDeclarationShape } from "../declarations/class-declaration-shape.xl.md"
import { EnumDeclarationShape } from "../declarations/enum-declaration-shape.xl.md"
import { ExportAssignmentShape } from "../declarations/export-assignment-shape.xl.md"
import { ExportDeclarationShape } from "../declarations/export-declaration-shape.xl.md"
import { FunctionDeclarationShape } from "../declarations/function-declaration-shape.xl.md"
import { ImportDeclarationShape } from "../declarations/import-declaration-shape.xl.md"
import { ImportEqualsDeclarationShape } from "../declarations/import-equals-declaration-shape.xl.md"
import { InterfaceDeclarationShape } from "../declarations/interface-declaration-shape.xl.md"
import { ModuleDeclarationShape } from "../declarations/module-declaration-shape.xl.md"
import { NamespaceExportDeclarationShape } from "../declarations/namespace-export-declaration-shape.xl.md"
import { TypeAliasDeclarationShape } from "../declarations/type-alias-declaration-shape.xl.md"
import { StatementBuilder } from "../statements/statement-builder.xl.md"
import { SourceFileTailBuilder } from "./source-file-tail-builder.xl.md"
import { StatementItemScan } from "./statement-item-scan.xl.md"
```

# namespace cangjie

根级（`SourceFileShape` 的 `Data`）item 表：`RootItemRule`（判定 + 建造）+ `SourceFileBodyItemHost`（把引擎接到根上）。

引擎与状态全部来自 `core/syntax/batch`（契约冻结，本文件只消费、不修改）。

判定不是本文件自己写的：**13 个根候选在同一张表里竞争**（`CatalogGuide` 的语义），
语句族的判据在 `StatementPossibleShape` 里（`StatementScanner`），声明族的判据在各自的
`XxxDeclarationPossibleShape` 里。本文件只做「谁赢了 → 用哪个静态建造入口」的映射，
**不复制任何判据**（INV-2）。

`End` 一律是**宿主下标**：候选给出的收口点是 `Code` 下标，这里经 `state.CodeAt` 映射。

# class RootItemRule implements ItemRule

根级唯一的一族 item：**一条根单元**（import / export / 各类声明 / 语句）。
`Classify` 恒认领（root 拥有全部 item），判定交给 13 个候选在前缀上逐个淘汰。

候选表由构造器注入（`SourceFileShape.CreatePossibleShapes()`），本文件**不 import** `SourceFileShape`：
根形状反过来要 import 本文件的 host，双向 import 会成环。

## static field Item:int = 1

本族唯一的 kind 号（`ItemRule.Classify` 的返回值）。

## field Guide:CatalogGuide

候选目录：13 个根候选 + 判定缓存。**终结候选为 `null`**：尾巴（EOF / 硬边界）由容器的
`FinishBody` 收（`SourceFileTailBuilder.BuildTrailingItems`），不走 item 表。

## field Alive:Set<int> = new Set()

还活着的候选下标。每建完一条就由 `Reseed` 重新填满。

## field Watermark:int = 0

已经判过的 `Code` 下标水位线：`Analyze` 每次从上一格继续推进（候选的 `ComputeByIndex` 必须在递增下标上顺序调用）。

## field Winner:int = -1

最近一次 `Analyze` 判出的唯一候选下标；`Build` 用它决定建造入口，建完复位。

## field Context:SyntaxContext | null = null

判定上下文。`ItemRule.Analyze(state)` 没有 context 形参，而候选的 `IsBuildable(units, index, cache, context)`
需要它，所以由宿主 `SourceFileBodyItemHost.OnBasicTokens` **每批注入**。

## constructor:(shapes:Array<PossibleShape>)=>void

以候选表（`SourceFileShape.CreatePossibleShapes()`）创建，初始即复位。

```ts
this.Guide = new CatalogGuide(shapes, null);
this.Reseed();
```

## private method Reseed:()=>void

复位：候选下标填满、缓存清空、水位线与胜者归零。**每建完一条都必须调**——
不复位就再也建不出第二条（`CatalogGuide.Reset` 的注释）。

```ts
this.Alive.clear();
for (let index = 0; index < this.Guide.PossibleShapes.length; index++) {
  this.Alive.add(index);
}
this.Watermark = 0;
this.Winner = -1;
this.Guide.PossibleShapesComputeCache.Clear();
```

## method Classify:(code:Array<Token>)=>Array<int>

恒认领：root 拥有全部 item，语句 / 声明由 13 个候选在 `Analyze` 里竞争，不需要先缩表。

```ts
if (code.length === 0) {
  return [];
}
const kinds: Array<number> = [];
kinds.push(RootItemRule.Item);
return kinds;
```

## method Extend:(state:ItemScanState, units:Array<Token>, tokenIndex:int)=>void

不维护增量状态：`Analyze` 用水位线自己推进。

```ts
// 不需要族内增量状态。
```

## method Analyze:(state:ItemScanState)=>void

= 不带 context 形参的 `CatalogGuide` 选表循环：逐个 `Code` 下标淘汰候选，只剩一个且
`IsBuildable` 成立时收口。

`Alive` 空 = 本段没有形状可建 → 立刻收口并交 raw（引擎 `RawFallback`），EOF 时由 `FinishBody` 兜底。

```ts
state.Complete = false;
state.End = -1;
if (this.Winner >= 0) {
  return;
}
const code: Array<Token> = state.Code;
if (code.length === 0) {
  return;
}
const cache: PossibleShapeCache = this.Guide.PossibleShapesComputeCache;
let at: number = this.Watermark;
while (at < code.length) {
  for (const index of this.Alive) {
    if (this.Guide.PossibleShapes[index].ComputeByIndex(code, at, cache) === ShapeStates.Reject) {
      this.Alive.delete(index);
    }
  }
  if (this.Alive.size === 0) {
    state.Complete = true;
    state.End = state.CodeAt[at];
    this.Winner = -1;
    this.Watermark = at + 1;
    return;
  }
  if (this.Alive.size === 1) {
    const only: number = RootItemRule.FirstOf(this.Alive);
    const shape: PossibleShape = this.Guide.PossibleShapes[only];
    if (this.Context !== null && shape.IsBuildable(code, at, cache, this.Context)) {
      state.Complete = true;
      state.End = state.CodeAt[at];
      this.Winner = only;
      this.Watermark = at + 1;
      return;
    }
  }
  at = at + 1;
}
this.Watermark = at;
if (state.AtEof) {
  // 到 EOF 还有候选没被淘汰、但谁都建不出（`IsBuildable` 恒 false）：**无条件收口**。
  // 不收口的话引擎一条 item 都不建，`Flush` 既走不了「能建就建」也走不了「raw 回退」。
  // 收口后 `Winner = -1` → `Build` 返回 `null` → 引擎记 raw 回退，
  // 由容器的 `FinishBody` 用 `BuildTrailingItems` 把这段尾巴整段建对（legacy 里是「终结候选」干的事）。
  state.Complete = true;
  state.End = state.CodeAt[code.length - 1];
  this.Winner = -1;
}
```

## static method FirstOf:(set:Set<int>)=>int

取集合里唯一的下标（没有就 `-1`）。

```ts
for (const value of set) {
  return value;
}
return -1;
```

## method Build:(host:Token, state:ItemScanState, context:SyntaxContext)=>Token | null

按 `KindOf` 走候选对应的**静态建造入口**。**绝不改 `host.Data`**：splice 由引擎 `ApplyBuilds` 整批做。

建造器抛错（缺 `;` / 缺关键字等）→ 返回 `null` 走 raw 回退，不吞异常语义（INV-7）。

```ts
if (state.Start < 0 || state.Start >= host.Data.length) {
  return null;
}
if (this.Winner < 0) {
  this.ResetAfterBuild();
  return null;
}
const start: number = state.Start;
const end: number = state.End;
if (end < start || end >= host.Data.length) {
  this.ResetAfterBuild();
  return null;
}
const kind: number = this.KindOf(state.Code);
const built: Token | null = this.BuildByKind(kind, host, start, end, context);
this.ResetAfterBuild();
if (built === null) {
  return null;
}
built.Parent = host;
return built;
```

## private method ResetAfterBuild:()=>void

建完复位：`Candidates`/缓存/水位线都回到 0，否则下一条会拿上一条的状态。

```ts
this.Reseed();
```

## private method TextOf:(unit:Token)=>string

取单元文本（只对关键字类 `Common` 有意义，其余返回空串）。

```ts
if (unit instanceof Common) {
  return (unit as Common).TempToString();
}
return "";
```

## private method IsSymbolAt:(code:Array<Token>, at:int, text:string)=>bool

`code[at]` 是不是指定的符号（越界 / 非 `Symbol` 一律 false）。

```ts
if (at < 0 || at >= code.length) {
  return false;
}
const unit: Token = code[at];
if (unit instanceof Symbol) {
  return (unit as Symbol).Is(text);
}
return false;
```

## private method KindOf:(code:Array<Token>)=>int

只按首格文本判族，顺序与候选表一致。跳过 `export` / `declare` / `abstract` / `async` 修饰词后看主关键字；
`const enum` 归 enum。不确定的一律 `9`（通用语句，走 `StatementBuilder` 兜底）。

1 = import 声明，2 = export 子句，3 = class，4 = interface，5 = enum，6 = function，7 = module，
8 = type alias，9 = 语句，10 = export 赋值（`export = …`），11 = import equals（`import x = …`）。

```ts
if (code.length === 0) {
  return 9;
}
const hadExport: boolean = this.IsTextAt(code, 0, "export");
let at: number = 0;
while (at < code.length) {
  const text: string = this.TextOf(code[at]);
  if (text === "export" || text === "declare" || text === "abstract" || text === "async") {
    at = at + 1;
    continue;
  }
  if (text === "const" && at + 1 < code.length && this.TextOf(code[at + 1]) === "enum") {
    return 5;
  }
  break;
}
if (at >= code.length) {
  return 9;
}
const head: string = this.TextOf(code[at]);
if (head === "import") {
  if (this.IsSymbolAt(code, at + 1, "(") || this.IsSymbolAt(code, at + 1, ".")) {
    return 9;
  }
  let probe: number = at + 2;
  if (at + 1 < code.length && this.TextOf(code[at + 1]) === "type") {
    probe = at + 3;
  }
  if (this.IsSymbolAt(code, probe, "=")) {
    return 11;
  }
  return 1;
}
if (head === "class") {
  return 3;
}
if (head === "interface") {
  return 4;
}
if (head === "enum") {
  return 5;
}
if (head === "function") {
  return 6;
}
if (head === "namespace" || head === "module") {
  return 7;
}
if (head === "type") {
  let probe: number = at + 2;
  while (probe < code.length && this.TextOf(code[probe]) !== "=" && !this.IsSymbolAt(code, probe, ";")) {
    probe = probe + 1;
  }
  if (probe < code.length && this.TextOf(code[probe]) === "=") {
    return 8;
  }
  return 9;
}
if (this.IsSymbolAt(code, at, "=") && hadExport) {
  return 10;
}
if (hadExport) {
  return 2;
}
return 9;
```

## private method IsTextAt:(code:Array<Token>, at:int, text:string)=>bool

`code[at]` 的文本是不是 `text`（越界 false）。

```ts
if (at < 0 || at >= code.length) {
  return false;
}
return this.TextOf(code[at]) === text;
```

## private method BuildByKind:(kind:int, host:Token, start:int, end:int, context:SyntaxContext)=>Token | null

按族分派到候选的静态建造入口（**不是** `BuildByIndex`：class/interface/enum 的 `BuildByIndex` 走
`BodyGuideUtil.MountShell`，会改 `host.MountedUnit` 并替换 `host.Data`）。

```ts
try {
  if (kind === 1) {
    return ImportDeclarationShape.FromUnits(host, start, end, context);
  }
  if (kind === 2) {
    return ExportDeclarationShape.FromUnits(host, start, end, context);
  }
  if (kind === 3) {
    return ClassDeclarationShape.FromUnits(host, start, end, context);
  }
  if (kind === 4) {
    return InterfaceDeclarationShape.FromUnits(host, start, end, context);
  }
  if (kind === 5) {
    return EnumDeclarationShape.FromUnits(host, start, end, context);
  }
  if (kind === 6) {
    return FunctionDeclarationShape.FromUnits(host, start, end, context, false, false);
  }
  if (kind === 7) {
    return SourceFileTailBuilder.BuildModuleItem(host, start, end, context);
  }
  if (kind === 8) {
    return TypeAliasDeclarationShape.FromUnits(host, start, end, context);
  }
  if (kind === 10) {
    return ExportAssignmentShape.FromUnits(host, start, end, context, true);
  }
  if (kind === 11) {
    return ImportEqualsDeclarationShape.FromUnits(host, start, end, context);
  }
  return this.BuildStatement(host, start, end, context);
} catch (error) {
  return null;
}
```

## private method BuildStatement:(host:Token, start:int, end:int, context:SyntaxContext)=>Token | null

通用语句：与 `StatementItemRule.Build` 同形，用既有 `StatementBuilder`（不复制建造逻辑）。

```ts
const units: Array<Token> = [];
for (let at = start; at <= end; at++) {
  units.push(host.Data[at]);
}
if (units.length === 0) {
  return null;
}
const basePos: number = StatementItemScan.BasePos(host, start);
const builder: StatementBuilder = new StatementBuilder(host.Template, context);
builder.Load(units, basePos);
return builder.BuildStatement();
```

## method IncludesSeparator:()=>bool

根的 item 区间已由候选给出（含 `;` 的那一格就是收口点），不再额外吞分隔符。

```ts
return false;
```

# class SourceFileBodyItemHost implements IBatchHost

根单元（`SourceFileShape`）的批次宿主：`SourceFileShape.BatchAdapter` 指向本对象时，
根上每个 basic token 关闭时由 `UnitToken.OnBasicTokenClosed` 交给 `Engine.Feed`；
容器收口（`FinishBody`）时由 `CloseBatch → Engine.Flush` 把最后一条没建完的 item 建掉。

与 `StatementBodyItemHost` 的唯一差别：`OnBasicTokens` 每批把 `context` 注入 `RootItemRule`
（`Analyze` 没有 context 形参），以及多一条 `RawRange` 让容器读 raw 区间。

## field Host:Token | null = null

宿主（根）。`CloseBatch` 没有 batch 参数，所以引擎 flush 需要的宿主在这里记一份。

## field Engine:ItemListEngine = new ItemListEngine()

item 表引擎（core 契约实现）。

## field Fallback:RawFallback = new RawFallback(-1, -1, "")

建不出 item 的区间口袋；容器 `FinishBody` 读它，再把这段交给 `SourceFileTailBuilder.BuildTrailingItems`。

## field BatchPolicy:BatchPolicy | null = null

软边界策略：根不需要（每个 basic token 关闭就消费一批），只留 `null` 满足契约。

## constructor:(host:Token, rules:Array<ItemRule>)=>void

以宿主与规则表创建。

```ts
this.Host = host;
this.Engine.Rules = rules;
```

## method RawRange:()=>RawFallback

raw 回退口袋（`From` / `To` / `Reason`）。容器收口时按它决定要重建哪一段。

```ts
return this.Fallback;
```

## method OnBasicTokens:(batch:BasicTokenBatch, context:SyntaxContext)=>BatchStates

消费一个批次：先给根规则注入 `context`，再 `Feed` 整批，最后按 `Engine.Built` 的增量回答
`Done` / `NeedMore`（契约 §3：用 `Built` 判，不读 `host.Data`）。

```ts
const host = batch.Host;
if (host === null) {
  return BatchStates.NeedMore;
}
for (const rule of this.Engine.Rules) {
  if (rule instanceof RootItemRule) {
    (rule as RootItemRule).Context = context;
  }
}
const before: number = this.Engine.Built;
this.Engine.Feed(host, batch, context);
if (this.Engine.Built > before) {
  return BatchStates.Done;
}
return BatchStates.NeedMore;
```

## method OnChildCreated:(child:Token, context:SyntaxContext)=>void

嵌套括号的创建与根 item 表无关（`(` / `[` / `{` 整体是一个 unit）。

```ts
// 不需要给嵌套括号挂任何东西。
```

## method OnBasicTokenClosed:(token:Token, context:SyntaxContext)=>CloseStates

根侧回调由 `SourceFileShape` 自己的 `UnitToken.OnBasicTokenClosed` 承担，本对象不重复实现。

```ts
return CloseStates.Nothing;
```

## method CloseBatch:(context:SyntaxContext)=>BatchStates

硬边界收口：把引擎里没建完的 item 交给 `Flush`（能建就建，建不出记 raw 回退）。

**不在这里 `Fallback.Reset()`**：raw 口袋是给容器读的，容器 `FinishBody` 读完并 splice 之后才清零
（`SourceFileShape.FinishBody` 里有那句 `raw.Reset()`）。在这里擦掉，容器永远读到 `{From:-1,To:-1}`。

```ts
const host = this.Host;
if (host === null) {
  return BatchStates.Done;
}
this.Engine.Flush(host, context, this.Fallback);
return BatchStates.Done;
```

## method Reset:()=>void

卸载 / 重建宿主时清空引擎与回退口袋。

```ts
this.Engine.Reset();
this.Fallback.Reset();
```

## static method CreateRules:(shapes:Array<PossibleShape>)=>Array<ItemRule>

根的规则表：只占 1 条规则；候选表由调用方给（`SourceFileShape.CreatePossibleShapes()`），
本文件因此不必 import 根形状，双向 import 不成环。

```ts
const rules: Array<ItemRule> = [];
rules.push(new RootItemRule(shapes));
return rules;
```
