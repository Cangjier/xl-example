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
import { StatementBuilder } from "../statements/statement-builder.xl.md"
import { StatementScanResult, StatementScanner } from "../statements/statement-scanner.xl.md"
import { StatementItemScan } from "./statement-item-scan.xl.md"
```

# namespace cangjie

语句族（块 / 根层）的 item 表：`StatementItemRule`（判定 + 建造）与 `StatementBodyItemHost`
（把引擎接到语句容器的括号上）。

引擎与状态全部来自 `core/syntax/batch`（契约冻结，本文件只消费、不修改）。判据全部来自
`StatementScanner`（Q3：**共享纯谓词留在 scanner，不复制**），本文件只做「前缀 → 收口点」的映射
与「收口点 → 一条语句」的建造。

`End` 一律是**宿主下标**：扫描状态机给出的 `PendingEnd` 是 `Code` 下标，这里经 `state.CodeAt`
映射；`Build` 再按 `state.Code` 建造（引擎已 `TrimTo(End + 1)`，看不到下一条语句的 unit）。

# class StatementItemRule implements ItemRule

语句族唯一的一族 item：**一条语句**。判定 = `StatementItemScan.Run`；建造 = 既有
`StatementBuilder`（`Load` + `BuildStatement`），不复制任何建造逻辑。

`Classify` 只用首单元判「这是不是本族的语句头」：`Mismatch` 的头（`import` / 表达式起头等）
返回空数组，让别的规则接；`NeedMore` 的头（`let` / `await` 等）仍然认领——它们后面会判出收口点。

## static field Statement:int = 1

本族唯一的 kind 号（`ItemRule.Classify` 的返回值）。

## method Classify:(code:Array<Token>)=>Array<int>

首单元判型。`AtEof` 故意置 `false`：判型只看「这个头是不是本族的」，
EOF 只影响**收口**（`Analyze` 才带 `AtEof`），否则文件末尾的 `let` / `using` 会在判型阶段就被判死。

```ts
if (code.length === 0) {
  return [];
}
const scan = new StatementItemScan();
scan.AtEof = false;
const result = scan.Run(code);
if (result.Status === 2) {
  return [];
}
return [StatementItemRule.Statement];
```

## method Extend:(state:ItemScanState, units:Array<Token>, tokenIndex:int)=>void

不需要族内增量状态：`Run` 每次在前缀上重算（`Watermark` 命中也只是复用结果），
`state.Checked` / `state.Code` / `state.CodeAt` 由引擎维护，本方法不改任何已算过的结论。

```ts
if (units.length === 0) {
  return;
}
const unit = units[0];
if (unit === null) {
  return;
}
```

## method Analyze:(state:ItemScanState)=>void

收口判定：把 `Run(state.Code)` 的 `Status/End` 翻译成 `ItemScanState.Complete/End`（宿主下标）。
`Mismatch` 不置 `Complete`：整条留 raw（引擎在硬边界处 `Flush` → `RawFallback`）。

```ts
state.Complete = false;
state.End = -1;
const scan = new StatementItemScan();
scan.AtEof = state.AtEof;
const result = scan.Run(state.Code);
if (result.Status !== 1) {
  return;
}
const endAt = result.End;
if (endAt < 0 || endAt >= state.CodeAt.length) {
  return;
}
state.Complete = true;
state.End = state.CodeAt[endAt];
```

## method Build:(host:Token, state:ItemScanState, context:SyntaxContext)=>Token | null

用**既有**的 `StatementBuilder` 建这一条语句：把本 item 的代码单元（引擎已裁到 `[Start, End + 1)`）
与位置基准交给 `Load`，然后 `BuildStatement`。建造器抛错时返回 `null`（走 raw 回退，不吞异常语义：
raw 会让容器按重构前的口径恢复，见 INV-7）。

**不改 `host.Data`**：splice 由引擎在整批消费完后统一做。

```ts
const units = state.Code;
if (units.length === 0) {
  return null;
}
if (state.Start < 0 || state.Start >= host.Data.length) {
  return null;
}
const basePos = StatementItemScan.BasePos(host, state.Start);
const builder = new StatementBuilder(host.Template, context);
builder.Load(units, basePos);
let built: Token | null = null;
try {
  built = builder.BuildStatement();
} catch {
  built = null;
}
return built;
```

## method IncludesSeparator:()=>bool

语句把结尾的 `;` 计入本 item 区间（`ScanToSemicolon` / `ScanSimpleSemicolon` 的收口点就是 `;` 那一格，
`BuildStatement` 也按「带 `;`」建造）。

```ts
return true;
```

# class StatementBodyItemHost implements IBatchHost

语句容器（块 / 根）的批次宿主：`Bracket.BatchAdapter` 指向本对象时，括号里每个 basic token 关闭时由
`UnitToken.OnBasicTokenClosed` 交给 `Engine.Feed`；容器收口时由容器的收尾路径调
`FlushBatch → CloseBatch → Engine.Flush`，把最后一条没来得及建的语句建掉。

> **本阶段未接线**：`{` 的创建点在 basic-token 模板里（`block-shape.xl.md` 只有 constructor，
> 建造发生在 `StatementBuilder.BuildBlock`），没有按语句形态区分的创建钩子；接法见
> `HANDOFF.wp2-2.md` §未完成项 3。本类因此只被单测（`tests/body-drive/item-oracle.mjs`）驱动，
> 不进解析路径——AST 因此不受影响。

## field Host:Token | null = null

宿主（语句容器）。`CloseBatch` 没有 batch 参数，所以引擎 flush 需要的宿主在这里记一份。

## field Engine:ItemListEngine = new ItemListEngine()

item 表引擎（core 契约实现）。

## field Fallback:RawFallback = new RawFallback(-1, -1, "")

建不出 item 的区间口袋；收口时引擎用它记 raw 回退。

## field BatchPolicy:BatchPolicy | null = null

软边界策略：语句容器不需要（每个 basic token 关闭就消费一批），只留 `null` 满足契约。

## constructor:(host:Token, rules:Array<ItemRule>)=>void

以宿主与规则表创建。

```ts
this.Host = host;
this.Engine.Rules = rules;
```

## method OnBasicTokens:(batch:BasicTokenBatch, context:SyntaxContext)=>BatchStates

消费一个批次：`Feed` 自己消费 `[batch.Cursor, batch.To)` 的全部 unit（契约修正 G1/G2），
本方法只按 `Engine.Built` 的增量回答 `Done` / `NeedMore`（契约 §3：用 `Built` 判，不读 `host.Data`）。

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

嵌套括号的创建与语句 item 表无关：`(` / `[` / `{`（对象字面量、函数体）整体是一个 unit。

```ts
// 不需要给嵌套括号挂任何东西。
```

## method OnBasicTokenClosed:(token:Token, context:SyntaxContext)=>CloseStates

宿主侧回调由容器自己的 `UnitToken.OnBasicTokenClosed` 承担；本对象只是适配器，不重复实现。

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

## static method CreateRules:()=>Array<ItemRule>

容器的规则表：语句族只占 1 条规则，实例无状态（`StatementItemScan` 每次 `Analyze` 新建），
所以所有语句容器共用一份。

```ts
const rules: Array<ItemRule> = [];
rules.push(new StatementItemRule());
return rules;
```
