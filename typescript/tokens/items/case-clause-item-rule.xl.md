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
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
```

# namespace cangjie

**case block item 表**：`switch (x) { … }` 的**花括号内层**（case / default 子句列表）的 item 表。

一条 item 就是一个**子句**：`case <expr> : <statements…>` 或 `default : <statements…>`，
从 `case` / `default` 关键字起到下一条子句关键字之前（含子句自己的体）。

**边界判据与建造器同一份**（`StatementBuilder.BuildCaseClause`）：

1. 标签（`case` 的表达式 / `default`）以**三元深度 0 的 `:`** 收尾——`case a ? b : c:` 的第一个
   `?` 加深度、配对的 `:` 减深度，只有深度 0 的 `:` 才是标签结束（括号是原子单元，藏不住 `:`）；
2. 标签之后进入**体**；体里出现 `case` / `default` 代码单元 ⇒ 下一条 item 从这里开始；
3. 最后一条子句没有后继关键字，靠「已读到的最后一个代码单元 == 宿主 `Data` 的最后一个代码单元」
   收口（**不是** `AtEof`：整批喂的时候 `AtEof` 在每个 unit 上都是 `true`）。

标签里出现的 `case` / `default` **不算**边界（它们可能只是表达式的一部分，例如 `a.default`）；
这一点与 `BuildCaseBlock` 的标签扫描（只看 `?` / `:`）一致。

建造**不复制**子句逻辑：交给 `CaseClauseBuild`（由 `StatementBuilder` 注入，复用 `BuildCaseClause`
的现成分派），本接口只用来**避免循环依赖**：item 表不 import 语句建造器。

接管方式是**全有或全无**（与 `ClauseItemDrive` / `ModuleBlockShape.DriveBodyItems` 同一套）：
`CaseClauseDrive.Drive` 在**克隆括号**上驱动整段 case block，全部 item 建出且无 raw 残留、
且每条子句都过了建造器自己的右端安全阀才返回子句表，否则返回 `null`，
调用方（`StatementBuilder.BuildCaseBlock`）逐字走原来的逐子句循环。容器 `bracket.Data` 一个字节都不动。

# interface CaseClauseBuild

case 子句的**一子句建造器**：把宿主 `Data` 的一段（`[start, end]`，两端都是宿主下标、含 `end`）
建成一个 `CaseClauseShape` / `DefaultClauseShape` 并返回；建不出返回 `null`（调用方走 raw 回退）。

## method BuildAt:(host:Token, start:int, end:int, context:SyntaxContext)=>Token | null

# class CaseClauseItemRule implements ItemRule

```txt
switch (a) { case 1: break; default: break; }
switch (a) { case a ? b : c: f(); case x.default: g(); }
```

子句里唯一的族：**一个 case / default 子句**。判型只看首单元（`case` / `default` 关键字），
收口靠标签的 `:` + 体里的下一个子句关键字，或「读到宿主最后一个代码单元」。

## static field Clause:int = 1

本族唯一的 kind 号。

## field ClauseBuilder:CaseClauseBuild | null = null

一子句建造器（由语句建造器在驱动时注入）。为 `null` 时 `Build` 返回 `null`（raw 回退）。

## field Host:Token | null = null

本段的宿主（由驱动方注入，见 `CaseClauseDrive`）。`Analyze` 用它判「是不是读到段末了」。

## private field InBody:bool = false

标签是否已经收尾（见 `Extend`）。`false` = 还在标签里（`case` 的表达式 / `default` 的冒号之前）。

## private field TernaryDepth:int = 0

标签里的三元深度：`?` 加一、配对的 `:` 减一。只有深度 0 的 `:` 才是标签结束。

## private field BodyFrom:int = 0

体的第一个代码单元在 `state.Code` 里的下标（= 标签 `:` 的下标 + 1）。体的边界扫描从这里起，
标签里的 `case` / `default` 不参与。

## private method IsClauseKeywordUnit:(unit:Token)=>bool

一个单元是不是子句关键字（`case` / `default`）。与 `StatementBuilder.IsClauseKeyword` 同一判据。

```ts
if (!(unit instanceof Common)) {
  return false;
}
const common = unit as Common;
return common.Is("case") || common.Is("default");
```

## private method HostLastCode:()=>int

宿主 `Data` 里**最后一个非 trivia 单元**的下标（没有代码单元返回 `-1`）。

用下标而**不是** `ItemScanState.AtEof` 判「最后一条子句」：case block 是整批喂的，
`AtEof` 在这批的**每一个** unit 上都是 `true`，拿它当证据会在第一条子句的第一个单元处就收口。
每次现算（而不是预存一个下标）是为了**分批喂**：前一批的 item 会 splice 宿主 `Data`，预存的下标会失效；
`state.LastCode` 是引擎在 splice 后重定位过的当前坐标，只有「现算的段末」与它同坐标。

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

首单元判型：空 / trivia 不认领；`case` / `default` 认成本族；其余一律不认领（case block 里
除了子句没有别的东西，剩下的形态留给 raw 回退）。判型同时把标签状态复位——引擎只在 item 起点
调一次 `Classify`（`CurrentRule < 0` 时），所以这里就是「每条子句的初始化」。

```ts
this.InBody = false;
this.TernaryDepth = 0;
this.BodyFrom = 0;
if (code.length === 0) {
  return [];
}
const first = code[0];
if (first.IsTriviaToken) {
  return [];
}
if (!this.IsClauseKeywordUnit(first)) {
  return [];
}
return [CaseClauseItemRule.Clause];
```

## method Extend:(state:ItemScanState, units:Array<Token>, tokenIndex:int)=>void

标签状态机：`?` 加深，配对的 `:` 减浅，深度 0 的 `:` 结束标签并把 `BodyFrom` 定在它的下一个代码单元。
体里不再有状态（体边界在 `Analyze` 里扫）。

```ts
if (units.length === 0) {
  return;
}
if (this.InBody) {
  return;
}
const unit = units[0];
if (!(unit instanceof Symbol)) {
  return;
}
const symbol = unit as Symbol;
if (symbol.Is("?")) {
  this.TernaryDepth = this.TernaryDepth + 1;
  return;
}
if (!symbol.Is(":")) {
  return;
}
if (this.TernaryDepth > 0) {
  this.TernaryDepth = this.TernaryDepth - 1;
  return;
}
this.InBody = true;
this.BodyFrom = state.Code.length;
```

## method Analyze:(state:ItemScanState)=>void

收口判定，两条证据按优先级：

1. **下一条子句的关键字**：标签收尾之后，体里第一个 `case` / `default` 代码单元的前一个单元
   就是本子句末尾（标签还没收尾时也从下标 1 起扫：那只可能是畸形输入，收口后建造器会以 `null`
   兜底，整段回退 legacy）；
2. **段末**：当前已读到的最后一个代码单元就是宿主 `Data` 的最后一个代码单元（`HostLastCode`）。

两条都不成立时不置 `Complete`：本子句还没读完，继续 `Feed`。
不设第三条证据（`}` 不在 `Data` 里，括号自己的字符不进 `Data`）。

```ts
state.Complete = false;
state.End = -1;
const code = state.Code;
if (code.length === 0) {
  return;
}
let endAt = -1;
let from = 1;
if (this.InBody) {
  from = this.BodyFrom;
}
for (let at = from; at < code.length; at++) {
  if (this.IsClauseKeywordUnit(code[at])) {
    endAt = at - 1;
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

把本 item 的区间 `[state.Start, state.End]`（宿主下标，含两端）交给注入的建造器。
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

子句**没有** `;` / `,` 分隔符：分隔符就是下一条子句的关键字（不属于本 item 的区间）。

```ts
return false;
```

# class CaseClauseItemHost implements IBatchHost

case block 括号的批次宿主。驱动方式与 `ClauseItemHost` / `ModuleBodyItemHost` 逐行同构：
整段 case block 一次喂完，`CloseBatch → Engine.Flush` 兜最后一条。

## field Host:Token | null = null

宿主（case block 括号）。`CloseBatch` 没有 batch 参数，所以引擎 flush 需要的宿主在这里记一份。

## field Engine:ItemListEngine = new ItemListEngine()

item 表引擎（core 契约实现）。

## field Fallback:RawFallback = new RawFallback(-1, -1, "")

建不出 item 的区间口袋。

## field BatchPolicy:BatchPolicy | null = CaseClauseItemHost.CreatePolicy()

## static method CreatePolicy:()=>BatchPolicy

case block 的软边界策略：只有段末收口。子句的边界靠规则自己的 `Analyze`，
`;` / `,` / `}` 都不是批边界——尤其 `FlushOnSemicolon` 会把一条子句从中间切开。

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

嵌套括号的创建与 case 子句 item 表无关（子句体里的块 / 括号都在子句形状内部建）。

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

# class CaseClauseDrive

case block item 表的**统一接管点**：**全有或全无**。

1. 在**克隆括号**上驱动（`Data` 浅拷贝，token 是同一批对象）：容器 `bracket.Data` 一个字节都不动；
2. 驱动过程抛异常（子句建造器对切片形态有断言）⇒ `null`；
3. 克隆里还有 raw 残留（非 trivia 单元仍是 basic）⇒ `null`；
4. 子句建造器自己的安全阀已逐条校验过右端（`StatementBuilder.BuildCaseClauseAt`：子句的
   `SourceRange.EndIndex` 必须**恰好等于** item 末单元的 `EndIndex`，多了少了都返回 `null`）。

判定通过时返回 item 建出的子句表（源码顺序），调用方把这些形状当 `CaseBlockShape` 的子节点。

## static method Drive:(bracket:Bracket, context:SyntaxContext, builder:CaseClauseBuild)=>Array<Token> | null

```ts
const clone = new Bracket(bracket.Template);
clone.Data = bracket.Data.slice();
clone.SourceRange = bracket.SourceRange.Clone();
clone.StartBracketChar = bracket.StartBracketChar;
clone.EndBracketChar = bracket.EndBracketChar;
const rule = new CaseClauseItemRule();
rule.ClauseBuilder = builder;
rule.Host = clone;
let ok = true;
try {
  const host = new CaseClauseItemHost(clone, [rule]);
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
