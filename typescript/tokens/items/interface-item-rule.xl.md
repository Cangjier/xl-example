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
import { MemberItemUtil, MemberPossibleUtil } from "./member-item-util.xl.md"
import { TypeBuilder } from "../types/type-builder.xl.md"
import { CallSignatureShape } from "../types/call-signature-shape.xl.md"
import { ConstructSignatureShape } from "../types/construct-signature-shape.xl.md"
import { GetAccessorShape } from "../types/get-accessor-shape.xl.md"
import { IndexSignatureShape } from "../types/index-signature-shape.xl.md"
import { MethodSignatureShape } from "../types/method-signature-shape.xl.md"
import { PropertySignatureShape } from "../types/property-signature-shape.xl.md"
import { SetAccessorShape } from "../types/set-accessor-shape.xl.md"
```

# namespace cangjie

接口体成员族的 item 表：`InterfaceItemRule`（判定 + 建造）与 `InterfaceBodyItemHost`（把引擎接到接口体括号上）。
引擎与状态全部来自 `core/syntax/batch`（契约冻结，本文件只消费、不修改）；判据来自
`items/member-item-util.xl.md`（`MemberPossibleUtil` 的算法 + `MemberItemUtil` 的 item 表入口）。

# class InterfaceItemRule implements ItemRule

```txt
interface I {}
interface I { a: number; }
interface I { a?: A; }
interface I { readonly b: B; }
interface I { m(): void; }
interface I { [k: string]: A; }
interface I { (): A; }
interface I { new (): B; }
interface I { get x(): A; set x(v: A); }
```

接口体里唯一的一族 item：一条对象类型成员（属性 / 方法 / 索引 / 调用 / 构造签名 / get / set 访问器）。
判定只读 `MemberItemUtil.Analyze` 的结论；建造只调 `TypeBuilder.ParseTypeMember()`——
与 `InterfaceDeclarationShape.BuildMembers` 是**同一个建造器**，不复制建造逻辑，也不提前建形状。

成员边界与 `TypeBuilder.ParseTypeMember()` 同口径：接口体成员的区间**含它自己的 `;` / `,`**
（`MemberPossibleUtil.BasePos` 的口径由此而来），所以 `state.End` 指到分隔符那一格，
引擎 splice `[Start, End + 1)` 正好把分隔符一起顶替掉——与重构前 possible 路径的
`host.Data.splice(start, consumedLength, built)` 逐字等价。

恢复形（`interface I { a: number b: string }` 这种同一行挤多条、或判型与解析区间不一致）不建：
返回 `null`，引擎不 splice，raw 代码原样留给收口时的 `CollectBodyMembers → BuildMembers`
按重构前口径恢复。

## static field Member:int = 1

本族唯一的 kind 号（`ItemRule.Classify` 的返回值；号段按族分配，接口族只占 1）。

## method Classify:(code:Array<Token>)=>Array<int>

读代码前缀判型：条目开头是 `;` / `,`（恢复形里的空成员）时判「未知」，整段留给收口时的 raw 兜底；
其余一律认领成 `Member`——本族只有一个规则，具体是哪一类成员由 `Build` 里的建造器决定。

```ts
if (code.length === 0) {
  return [];
}
const first = code[0];
if (first.IsTriviaToken) {
  return [];
}
if (MemberPossibleUtil.IsSeparator(first)) {
  return [];
}
return [InterfaceItemRule.Member];
```

## method Extend:(state:ItemScanState, units:Array<Token>, tokenIndex:int)=>void

只推进族内增量状态：角/括号深度（成员自己的 `<...>` 里的 `>` / `,` 不是本层收口证据）。
`Code` / `CodeAt` 由引擎追加，这里不重复维护。

```ts
if (units.length === 0) {
  return;
}
MemberItemUtil.Extend(state);
```

## method Analyze:(state:ItemScanState)=>void

收口判定：三条证据（下一个成员起点 / 显式 `;` `,` / 容器收口字符）由 `MemberItemUtil.Analyze` 一次算出，
把 `Complete` 与 `End`（宿主下标）写进 `state`。

```ts
MemberItemUtil.Analyze(state);
```

## method Build:(host:Token, state:ItemScanState, context:SyntaxContext)=>Token | null

切出成员自己的代码区间（`Start..End`，**含**成员末尾的 `;` / `,`）交给 `TypeBuilder.ParseTypeMember()` 建一次；
读不完 / 消费范围与判定不一致（`MemberParsedWhole` 为假）时返回 `null`，让 raw 代码原样留给收口时的
`BuildMembers`。整段读完后才断言产出类型，不对直接抛错（真 bug，不吞）。

```ts
const start = state.Start;
const end = state.End;
if (start < 0 || end < start) {
  return null;
}
const basePos = MemberPossibleUtil.BasePos(host, start);
const builder = new TypeBuilder(host.Template, context);
const consumed = builder.LoadFrom(host.Data, start, end + 1, basePos);
const built = builder.ParseTypeMember();
if (!MemberPossibleUtil.MemberParsedWhole(builder, consumed)) {
  return null;
}
if (built instanceof PropertySignatureShape
  || built instanceof MethodSignatureShape
  || built instanceof IndexSignatureShape
  || built instanceof CallSignatureShape
  || built instanceof ConstructSignatureShape
  || built instanceof GetAccessorShape
  || built instanceof SetAccessorShape) {
  return built;
}
throw new Error("InterfaceItemRule.Build: 产出不是对象类型成员形状");
```

## method IncludesSeparator:()=>bool

`;` / `,` **进** item 区间：TS 的 `PropertySignature` / `MethodSignature` 等成员区间含自己的分隔符，
`TypeBuilder.SpanTypeMember` 也是这样切的。

```ts
return true;
```

# class InterfaceBodyItemHost implements IBatchHost

接口体括号的批次宿主：`Bracket.BatchAdapter` 指向本对象，括号里每个 basic token 关闭时由
`UnitToken.OnBasicTokenClosed` 交给 `Engine.Feed`；括号闭合时 `InterfaceDeclarationShape.FinishBody` 调
`FlushBatch → CloseBatch → Engine.Flush`，把最后一条没来得及建的成员建掉。

规则表由壳（`InterfaceDeclarationShape.CreateBodyItemRules`）传入：规则实例无状态，所有接口体括号共用一份。

## field Host:Token | null = null

宿主（接口体括号）。`CloseBatch` 没有 batch 参数，所以引擎 flush 需要的宿主在这里记一份。

## field Engine:ItemListEngine = new ItemListEngine()

item 表引擎（core 契约实现）。

## field Fallback:RawFallback = new RawFallback(-1, -1, "")

建不出 item 的区间口袋；收口时引擎用它记 raw 回退。

## field BatchPolicy:BatchPolicy | null = null

软边界策略：接口体不需要（每个 basic token 关闭就消费一批），只留 `null` 满足契约。

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

嵌套括号的创建与接口体 item 表无关：括号里的字符归括号自己，item 表只把整个括号当一个 unit。

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
