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
import { EnumDeclarationShape } from "../declarations/enum-declaration-shape.xl.md"
import { EnumMemberItemUtil } from "./enum-member-item-util.xl.md"
import { EnumMemberShape } from "../members/enum-member-shape.xl.md"
```

# namespace cangjie

枚举体成员族的 item 表：`EnumItemRule`（判定 + 建造）与 `EnumBodyItemHost`（把引擎接到 body 括号上）。
引擎与状态全部来自 `core/syntax/batch`（契约冻结，本文件只消费、不修改）。

# class EnumItemRule implements ItemRule

```txt
enum E { A }
enum E { A, B }
enum E { A = 1, B = 2 }
enum E { [k] = 1 }
enum E { "a" = 1 }
enum E { 1 = 1 }
```

枚举体里唯一的一族 item：`名字 [= 初始化器]`。判定只读 `EnumMemberItemUtil.Analyze` 的结论；
建造只调 `EnumDeclarationShape.BuildMember`（与 raw 兜底的 `BuildMembers` 是同一个建造器，不复制建造逻辑）。
恢复形（`enum E { A B }` / 初始化器读不完）不建：返回 `null`，引擎不 splice，raw 代码原样留给收口时的
`CollectBodyMembers → BuildMembers` 按重构前口径恢复。

## static field Member:int = 1

本族唯一的 kind 号（`ItemRule.Classify` 的返回值；号段按族分配，枚举族只占 1）。

## method Classify:(code:Array<Token>)=>Array<int>

读代码前缀判型：跳过前导分隔符后的第一个单元能当成员名就是 `Member`；否则空数组（未知，不抛）。

```ts
const nameAt = EnumMemberItemUtil.NameAt(code);
if (nameAt < 0) {
  return [];
}
if (!EnumMemberItemUtil.IsNameToken(code[nameAt])) {
  return [];
}
return [EnumItemRule.Member];
```

## method Extend:(state:ItemScanState, units:Array<Token>, tokenIndex:int)=>void

没有需要增量推进的族内状态：括号 / 字符串 / 模板都是**单个 unit**，没有角深度；收口证据（顶层逗号、
最后单元之后的 `}` / EOF）全部由 `Analyze` 从 `state.Code` 前缀一次算出。

唯一要动的是**分隔符的消费边界**：`IncludesSeparator` 为 `false`，所以顶层逗号不进 item 区间——
把 `Checked` 退到逗号那一格，引擎 splice 时就会把逗号留在宿主 `Data` 里（与旧路径逐字一致）。
逗号必须留下：它是下一个成员 `Pos` 的锚点（`BuildMembers` 的 `memberPos = 逗号 EndIndex`）。

```ts
if (units.length === 0) {
  return;
}
const unit = units[0];
if (EnumMemberItemUtil.IsSeparator(unit)) {
  state.Checked = tokenIndex;
  return;
}
state.LastCode = tokenIndex;
```

## method Analyze:(state:ItemScanState)=>void

收口判定：顶层逗号（逗号前一个单元收住）或最后单元之后是 `}` / EOF。

```ts
EnumMemberItemUtil.Analyze(state.Code, state.CodeAt, state);
```

## method Build:(host:Token, state:ItemScanState, context:SyntaxContext)=>Token | null

切出成员自己的代码单元组（`NameAt..EndAt`，**不含**成员后的逗号与 trivia），用
`EnumDeclarationShape.BuildMember` 这一个建造器建；读不完 / 结构不对（建造器抛错）时返回 `null`，
让 raw 代码原样留给收口时的 `BuildMembers`。整段读完后才断言产出类型，不对直接抛错（真 bug，不吞）。

```ts
const code = state.Code;
const nameAt = EnumMemberItemUtil.NameAt(code);
if (nameAt < 0) {
  return null;
}
const endAt = EnumMemberItemUtil.EndAt(code, nameAt);
if (endAt < nameAt || endAt >= code.length) {
  return null;
}
const group:Array<Token> = [];
for (let at = nameAt; at <= endAt; at++) {
  group.push(code[at]);
}
const basePos = EnumMemberItemUtil.BasePos(host, state.CodeAt[nameAt]);
let built:Token | null = null;
try {
  built = EnumDeclarationShape.BuildMember(host, group, basePos, context);
} catch {
  // 成员没被完整解析（恢复形）：不建、不 splice，raw 留给 CollectBodyMembers 兜底。
  built = null;
}
if (built === null) {
  return null;
}
if (!(built instanceof EnumMemberShape)) {
  throw new Error("EnumItemRule.Build: 产出不是 EnumMemberShape");
}
return built;
```

## method IncludesSeparator:()=>bool

`;` / `,` 不进 item 区间：成员区间在逗号前一个代码单元收住，与 `BuildMembers` 的顶层逗号切分同口径。

```ts
return false;
```

# class EnumBodyItemHost implements IBatchHost

枚举体括号的批次宿主：`Bracket.BatchAdapter` 指向本对象，括号里每个 basic token 关闭时由
`UnitToken.OnBasicTokenClosed` 交给 `Engine.Feed`；括号闭合时 `EnumDeclarationShape.FinishBody` 调
`FlushBatch → CloseBatch → Engine.Flush`，把最后一条没来得及建的成员建掉。

规则表由壳（`EnumDeclarationShape.CreateBodyItemRules`）传入：规则实例无状态，所有枚举体括号共用一份。

## field Host:Token | null = null

宿主（枚举体括号）。`CloseBatch` 没有 batch 参数，所以引擎 flush 需要的宿主在这里记一份。

## field Engine:ItemListEngine = new ItemListEngine()

item 表引擎（core 契约实现）。

## field Fallback:RawFallback = new RawFallback(-1, -1, "")

建不出 item 的区间口袋；收口时引擎用它记 raw 回退。

## field BatchPolicy:BatchPolicy | null = null

软边界策略：枚举体不需要（每个 basic token 关闭就消费一批），只留 `null` 满足契约。

## constructor:(host:Token, rules:Array<ItemRule>)=>void

以宿主与规则表创建。

```ts
this.Host = host;
this.Engine.Rules = rules;
```

## method OnBasicTokens:(batch:BasicTokenBatch, context:SyntaxContext)=>BatchStates

消费一个批次：只做「追加 + 判收 + 建完整 item」，O(本批 unit)。批次永远已消费完（`Done`），
不需要 `NeedMore`：没判完的 item 留在引擎状态里，下一个批次继续。

```ts
const host = batch.Host;
if (host === null) {
  return BatchStates.NeedMore;
}
this.Engine.Feed(host, batch, context);
return BatchStates.Done;
```

## method OnChildCreated:(child:Token, context:SyntaxContext)=>void

嵌套括号的创建与枚举体 item 表无关：括号里的字符归括号自己，item 表只把整个括号当一个 unit。

```ts
// 不需要给嵌套括号挂任何东西。
```

## method OnBasicTokenClosed:(token:Token, context:SyntaxContext)=>CloseStates

宿主侧回调由括号自己的 `UnitToken.OnBasicTokenClosed` 承担；本对象只是适配器，不重复实现。

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
