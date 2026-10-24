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
import { ClassDeclarationShape } from "../declarations/class-declaration-shape.xl.md"
import { ClassMemberItemUtil, ClassMemberPossibleScan, ClassMemberPossibleUtil } from "./class-member-item-util.xl.md"
```

# namespace cangjie

类体成员族的 item 表：`ClassItemRule`（判定 + 建造）与 `ClassBodyItemHost`（把引擎接到类体括号上）。
引擎与状态全部来自 `core/syntax/batch`（契约冻结，本文件只消费、不修改）；判据来自
`items/class-member-item-util.xl.md`（`ClassMemberPossibleUtil` 的算法 + `ClassMemberItemUtil` 的 item 表入口）。

# class ClassItemRule implements ItemRule

```txt
class C { a = 1; }
class C { m(a: A): B { return a; } }
class C { constructor() {} }
class C { get x() { return 1; } }
class C { static { this.a = 1; } }
class C { [k: string]: A; }
class C { ; }
```

类体里唯一的一族 item：一条类体成员（属性 / 方法 / 构造 / get / set 访问器 / static 块 / 索引签名 / 孤立 `;`）。
判定只读 `ClassMemberItemUtil.Analyze` 的结论；建造只调 `ClassDeclarationShape.BuildMemberFromCode()`——
与收口的 raw 兜底 `BuildMembers` 是**同一个建造器**，不复制建造逻辑，也不提前建形状。

成员边界与 `ClassDeclarationShape.BuildMembers` 同口径：成员区间**含它自己的 `;`**（`BasePos` 的口径由此而来），
所以 `state.End` 指到最后一个代码单元（`;` / 函数体的 `}`），引擎 splice `[Start, End + 1)` 正好把分隔符一起顶替掉。

恢复形（同一行挤多条成员 / 判型与解析区间不一致 / 建造器读不完）不建：返回 `null`，引擎不 splice，
raw 代码原样留给收口时的 `CollectBodyMembers → BuildMembers` 按重构前口径恢复。

## static field Member:int = 1

本族唯一的 kind 号（`ItemRule.Classify` 的返回值；号段按族分配，类族只占 1）。

## field Scan:ClassMemberPossibleScan = new ClassMemberPossibleScan()

本 item 的增量判定状态（代码数组 / 角深度 / 边界扫描）。**每条规则实例只服务一个类体括号**：
`ClassDeclarationShape.CreateBodyItemRules` 每次返回新实例，因为嵌套类体的引擎会与外层类体交替推进，
共用一份实例会把「下一个成员边界」的增量状态串掉。

## field HasRawPrefix:bool = false

本类体里是否已经有**建不出的 raw 前缀**。一旦为真，后续成员一律不再增量建：引擎按 `End + 1` 前进，
若前面留着 raw 而后面的成员被建成形状，收口时 `CollectBodyMembers` 只能「先收集已建成员、再解析 raw 尾巴」，
顺序会颠倒。所以第一条建不出的成员就把整段尾巴留给 raw 兜底——AST 与重构前逐节点一致，只是慢一点。

## method Classify:(code:Array<Token>)=>Array<int>

读代码前缀判型：本族认领一切代码单元（具体是哪一类成员由 `Build` 里的建造器决定）。前导 `;` 也认领：
它自己就是一个 `SemicolonClassElement` 成员，必须就地建掉，不能当「未知」留在 item 起点上——
否则下一条成员会把 `;` 一起切进自己的区间，`BuildMembers` 会看见两条成员而整段回落 raw。

```ts
if (code.length === 0) {
  return [];
}
if (code[0].IsTriviaToken) {
  return [];
}
return [ClassItemRule.Member];
```

## method Extend:(state:ItemScanState, units:Array<Token>, tokenIndex:int)=>void

只推进族内增量状态：角深度与增量边界扫描（成员自己的 `<...>` 里的 `>` / `,` 不是本层收口证据）。
`Code` / `CodeAt` 由引擎追加，这里不重复维护。

```ts
if (units.length === 0) {
  return;
}
ClassMemberItemUtil.Extend(state, this.Scan);
```

## method Analyze:(state:ItemScanState)=>void

收口判定：三条证据（下一个成员起点 / 显式 `;` / 容器收口字符）由 `ClassMemberItemUtil.Analyze` 一次算出，
把 `Complete` 与 `End`（宿主下标）写进 `state`。

```ts
ClassMemberItemUtil.Analyze(state, this.Scan);
```

## method Build:(host:Token, state:ItemScanState, context:SyntaxContext)=>Token | null

切出成员自己的代码区间（`state.Code`，引擎已裁到 `[Start, End + 1)`，**含**成员末尾的 `;`）交给
`ClassDeclarationShape.BuildMemberFromCode()` 建一次；读不完 / 产出不是恰好一条成员 / `Pos` 或结束下标与区间
不一致（该方法返回 `null`）时返回 `null`，让 raw 代码原样留给收口时的 `BuildMembers`。

`HasRawPrefix` 已经为真时直接返回 `null`：前面还有 raw 前缀，本成员即使能建也不能建（见字段说明）。

```ts
if (this.HasRawPrefix) {
  return null;
}
const start = state.Start;
const code = state.Code;
if (start < 0 || code.length === 0) {
  return null;
}
const basePos = ClassMemberPossibleUtil.BasePos(host, start);
let built:Token | null = null;
try {
  built = ClassDeclarationShape.BuildMemberFromCode(host, code, 0, code.length - 1, basePos, context);
} catch {
  // 成员没被完整解析（恢复形）：不建、不 splice，raw 留给 CollectBodyMembers 兜底。
  built = null;
}
if (built === null) {
  this.HasRawPrefix = true;
  return null;
}
return built;
```

## method IncludesSeparator:()=>bool

`;` **进** item 区间：`BuildMembers` 的属性 / 索引签名区间含自己的 `;`，`BuildMemberFromCode` 也是按
「整段最后一个代码单元」核对结束下标。

```ts
return true;
```

# class ClassBodyItemHost implements IBatchHost

类体括号的批次宿主：`Bracket.BatchAdapter` 指向本对象，括号里每个 basic token 关闭时由
`UnitToken.OnBasicTokenClosed` 交给 `Engine.Feed`；括号闭合时 `ClassDeclarationShape.FinishBody` 调
`FlushBatch → CloseBatch → Engine.Flush`，把最后一条没来得及建的成员建掉。

规则表由壳（`ClassDeclarationShape.CreateBodyItemRules`）传入：规则实例持有本条类体的增量判定状态，
所以每个类体括号一份（嵌套类体不共用）。

## field Host:Token | null = null

宿主（类体括号）。`CloseBatch` 没有 batch 参数，所以引擎 flush 需要的宿主在这里记一份。

## field Engine:ItemListEngine = new ItemListEngine()

item 表引擎（core 契约实现）。

## field Fallback:RawFallback = new RawFallback(-1, -1, "")

建不出 item 的区间口袋；收口时引擎用它记 raw 回退。

## field BatchPolicy:BatchPolicy | null = null

软边界策略：类体不需要（每个 basic token 关闭就消费一批），只留 `null` 满足契约。

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

嵌套括号的创建与类体 item 表无关：括号里的字符归括号自己，item 表只把整个括号当一个 unit。

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
