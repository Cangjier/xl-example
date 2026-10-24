# dependencies
```xl
import { BasicTokenBatch } from "../../../core/syntax/batch/basic-token-batch.xl.md"
import { BatchPolicy } from "../../../core/syntax/batch/batch-policy.xl.md"
import { BatchStates } from "../../../core/syntax/batch/batch-states.xl.md"
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { IBatchHost } from "../../../core/syntax/batch/i-batch-host.xl.md"
import { ItemListEngine, ItemRule } from "../../../core/syntax/batch/item-list.xl.md"
import { ItemScanState } from "../../../core/syntax/batch/item-scan-state.xl.md"
import { RawFallback } from "../../../core/syntax/batch/raw-fallback.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
```

# namespace cangjie

**子句 item 表**：`import { … }` / `export { … }` 的**花括号内层**（specifier 列表）的 item 表。

一条 item 就是一个 specifier，**连它的 `,` 分隔符一起**（`{ a as b, type c }` → 两条 item：
`a as b,` 与 `type c`）。这与 `ModuleItemRule` 的「成员含 `;`」同一口径：分隔符必须属于某条 item，
否则分隔符会以「首单元不认领」的形态落在两次 item 之间，`ItemListEngine.CurrentRule` 一直停在 `-1`，
后面整段都进 raw（`ModuleItemRule.Classify` 对首单元是 `;` 的注释里记着同一个坑）。

建造**不复制** specifier 逻辑：交给 `ClauseBuild`（各子句形状自己注入，`ImportSpecifierShape.FromTokens`
/ `ExportSpecifierShape.FromTokens` 的现成入口），本接口只用来**避免循环依赖**：item 表不 import 形状。

接管方式是**全有或全无**（与 `ModuleBlockShape.DriveBodyItems` 同一套）：`ClauseItemDrive.Drive` 在
**克隆括号**上驱动整段子句，全部 item 建出且无 raw 残留才返回成员表，否则返回 `null`，
调用方逐字走原来的分组循环。容器 `bracket.Data` 一个字节都不动。

# interface ClauseBuild

子句的**一 specifier 建造器**：把宿主 `Data` 的一段（`[start, end]`，两端都是宿主下标、含 `end`，
`end` 通常是那个 `,`）建成一个 specifier 形状并返回；建不出返回 `null`（调用方走 raw 回退）。

## method BuildAt:(host:Token, start:int, end:int, context:SyntaxContext)=>Token | null

# class ClauseItemRule implements ItemRule

```txt
import { a as b, type c } from "m";
export { x as "y", z };
```

子句里唯一的族：**一个 specifier（含尾随 `,`）**。判型只读首单元；收口只看 `,`——
最后一条没有 `,`，靠 `AtEof`（子句是一整批喂进来的，`Sealed` 批次自己就是终点）。

## static field Clause:int = 1

本族唯一的 kind 号。

## field ClauseBuilder:ClauseBuild | null = null

一 specifier 建造器（由子句形状在驱动时注入）。为 `null` 时 `Build` 返回 `null`（raw 回退）。

## field Host:Token | null = null

本段的宿主（由驱动方注入，见 `ClauseItemDrive`）。`Analyze` 用它判「是不是读到段末了」。

## private method HostLastCode:()=>int

宿主 `Data` 里**最后一个非 trivia 单元**的下标（没有代码单元返回 `-1`）。

用下标而**不是** `ItemScanState.AtEof` 判「最后一条 specifier」：子句是一整批喂进来的，
`AtEof` 在这批的**每一个** unit 上都是 `true`，拿它当证据会在每条 specifier 的第一个单元处就收口
（`export { dnsPromises as promises }` 会被切成 3 条）。

每次现算（而不是预存一个下标）是为了**分批喂**：前一批的 item 会 splice 宿主 `Data`，预存的
下标会失效；`state.LastCode` 是引擎在 splice 后重定位过的当前坐标，只有「现算的段末」与它同坐标。
子句只有几个单元，这点重复扫描可以忽略。

```ts
const host = this.Host;
if (host === null) {
  return -1;
}
for (let at = host.Data.length - 1; at >= 0; at--) {
  if (!host.Data[at].IsTriviaToken) {
    return at;
  }
}
return -1;
```

## method Classify:(code:Array<Token>)=>Array<int>

首单元判型：空 / trivia 不认领；其余一律认成本族（子句里除了 specifier 只有 `,` 与空白，
而 `,` 只会出现在 item 的末尾——见文件头）。

```ts
if (code.length === 0) {
  return [];
}
const first = code[0];
if (first.IsTriviaToken) {
  return [];
}
return [ClauseItemRule.Clause];
```

## method Extend:(state:ItemScanState, units:Array<Token>, tokenIndex:int)=>void

specifier 没有族内增量状态：`as` / `type` / 字符串名都是平铺单元，边界证据全在 `Analyze`。

```ts
if (units.length === 0) {
  return;
}
```

## method Analyze:(state:ItemScanState)=>void

收口判定，两条证据按优先级：

1. **显式 `,`**：第一条 `,` 就是本 specifier 末尾（含 `,`）；
2. **段末**：当前已读到的最后一个代码单元就是宿主 `Data` 的最后一个代码单元（`HostLastCode`）——
   最后一条 specifier 没有 `,`，段末即 item 末尾。

两条都不成立时不置 `Complete`：本 specifier 还没读完，继续 `Feed`。
不设第三条证据（`}` 不在 `Data` 里，括号自己的字符不进 `Data`）。

```ts
state.Complete = false;
state.End = -1;
const code = state.Code;
if (code.length === 0) {
  return;
}
let endAt = -1;
for (let at = 0; at < code.length; at++) {
  const unit = code[at];
  if (unit instanceof Symbol && (unit as Symbol).Is(",")) {
    endAt = at;
    break;
  }
}
if (endAt < 0) {
  if (this.Host === null || state.LastCode !== this.HostLastCode()) {
    return;
  }
  endAt = code.length - 1;
}
if (endAt < 0 || endAt >= state.CodeAt.length) {
  return;
}
state.Complete = true;
state.End = state.CodeAt[endAt];
```

## method Build:(host:Token, state:ItemScanState, context:SyntaxContext)=>Token | null

把本 item 的区间 `[state.Start, state.End]`（宿主下标，含 `,`）交给注入的建造器。
建造器返回 `null` 时本方法也返回 `null`，引擎不 splice，raw 留给收口路径。

**不改 `host.Data`**：splice 由引擎在整批消费完后统一做。

```ts
const builder = this.ClauseBuilder;
if (builder === null) {
  return null;
}
if (state.Start < 0 || state.End < state.Start) {
  return null;
}
if (state.End >= host.Data.length) {
  return null;
}
return builder.BuildAt(host, state.Start, state.End, context);
```

## method IncludesSeparator:()=>bool

item 的区间**含** `,`（与 `ModuleItemRule` 含 `;` 同一口径）。

```ts
return true;
```

# class ClauseItemHost implements IBatchHost

子句括号的批次宿主。驱动方式与 `ModuleBodyItemHost` 逐行同构：整段子句一次喂完，
`CloseBatch → Engine.Flush` 兜最后一条。

## field Host:Token | null = null

宿主（子句括号）。`CloseBatch` 没有 batch 参数，所以引擎 flush 需要的宿主在这里记一份。

## field Engine:ItemListEngine = new ItemListEngine()

item 表引擎（core 契约实现）。

## field Fallback:RawFallback = new RawFallback(-1, -1, "")

建不出 item 的区间口袋。

## field BatchPolicy:BatchPolicy | null = ClauseItemHost.CreatePolicy()

## static method CreatePolicy:()=>BatchPolicy

子句的软边界策略：只有段末收口。`,` 在 item 内部（`IncludesSeparator`），所以**不能**
`FlushOnComma`——那会把一条 specifier 从中间切开。

```ts
const policy = new BatchPolicy();
policy.FlushOnSemicolon = false;
policy.FlushOnComma = false;
policy.FlushOnBraceClose = false;
policy.FlushOnEof = true;
return policy;
```

## constructor:(host:Token, rules:Array<ItemRule>)=>void

以宿主与规则表创建。

```ts
this.Host = host;
this.Engine.Rules = rules;
```

## method OnBasicTokens:(batch:BasicTokenBatch, context:SyntaxContext)=>BatchStates

消费一个批次：`Feed` 自己消费 `[batch.From, batch.To)` 的全部 unit，本方法只按 `Engine.Built`
的增量回答 `Done` / `NeedMore`。

```ts
const host = batch.Host;
if (host === null) {
  return BatchStates.NeedMore;
}
const before = this.Engine.Built;
this.Engine.Feed(host, batch, context);
if (this.Engine.Built > before) {
  return BatchStates.Done;
}
return BatchStates.NeedMore;
```

## method OnChildCreated:(child:Token, context:SyntaxContext)=>void

嵌套括号的创建与子句 item 表无关（specifier 里没有括号）。

```ts
// 不需要给嵌套括号挂任何东西。
```

## method OnBasicTokenClosed:(token:Token, context:SyntaxContext)=>CloseStates

宿主侧回调由括号自己的 `UnitToken.OnBasicTokenClosed` 承担；本对象只是适配器。

```ts
return CloseStates.Nothing;
```

## method CloseBatch:(context:SyntaxContext)=>BatchStates

硬边界收口：把引擎里没建完的 item 交给 `Flush`（能建就建，建不出记 raw 回退），然后复位。

```ts
const host = this.Host;
if (host === null) {
  return BatchStates.Done;
}
this.Engine.Flush(host, context, this.Fallback);
this.Fallback.Reset();
return BatchStates.Done;
```

## method Reset:()=>void

卸载 / 重建宿主时清空引擎与回退口袋。

```ts
this.Engine.Reset();
this.Fallback.Reset();
```

# class ClauseItemDrive

子句 item 表的**统一接管点**（`import { … }` 与 `export { … }` 共用）：**全有或全无**。

1. 在**克隆括号**上驱动（`Data` 浅拷贝，token 是同一批对象）：容器 `bracket.Data` 一个字节都不动；
2. 驱动过程抛异常（specifier 建造器对切片形态有断言）⇒ `null`；
3. 克隆里还有 raw 残留（非 trivia 单元仍是 basic）⇒ `null`。

判定通过时返回 item 建出的 specifier 表（源码顺序），调用方把这些形状当子节点。

## static method Drive:(bracket:Bracket, context:SyntaxContext, builder:ClauseBuild)=>Array<Token> | null

```ts
const clone = new Bracket(bracket.Template);
clone.Data = bracket.Data.slice();
clone.SourceRange = bracket.SourceRange.Clone();
clone.StartBracketChar = bracket.StartBracketChar;
clone.EndBracketChar = bracket.EndBracketChar;
let lastCodeAt = -1;
const rule = new ClauseItemRule();
rule.ClauseBuilder = builder;
rule.Host = clone;
let ok = true;
try {
  const host = new ClauseItemHost(clone, [rule]);
  const batch = new BasicTokenBatch();
  batch.Reset(clone, 0, true);
  batch.Sealed = true;
  batch.Recompute();
  host.OnBasicTokens(batch, context);
  host.CloseBatch(context);
} catch (e) {
  ok = false;
}
if (!ok) {
  return null;
}
const built:Array<Token> = [];
for (const unit of clone.Data) {
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit.IsBasicToken) {
    return null;
  }
  built.push(unit);
}
return built;
```
