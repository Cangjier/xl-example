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
import { StatementScanner } from "../statements/statement-scanner.xl.md"
```

# namespace cangjie

模块 / 声明族的 item 表与**直接建造切片**。

本文件装两件事：

1. `DeclarationSpan` —— 声明族（module / import / export / import-equals / export-assignment /
   namespace-export）的**直接建造入口**共用的切片工具：把宿主 `Data` 上的一段下标区间变成
   「非 trivia 单元 + 每个单元的 `Pos`」，**只读宿主、从不改写 `host.Data`**。
2. `ModuleItemRule` / `ModuleBodyItemHost` —— 模块体（`namespace N { … }` / `declare module "m" { … }`）
   的 item 表：一条 item 就是一个成员（语句 / 声明 / export 修饰的声明）。

模块体 item 表的**接线点**还缺一个洞：模块体括号的创建发生在模块声明候选（`ModuleDeclarationPossibleShape`）
一次性建整棵声明的时候，括号已经闭合，没有「按模块形态区分的创建钩子」可以挂 `BatchAdapter`
（与 WP-2 的 `{` 同一类阻塞，见 `statement-item-rule.xl.md` 的说明）。所以 `ModuleItemRule` /
`ModuleBodyItemHost` 目前只被隔离测试驱动（`tests/body-drive/batch-split.mjs --family=module`），
**不进解析路径**，AST 因此不受影响。接线所需的另一半（模块体括号的创建钩子）留给 WP-3 的
`SourceFileTailBuilder` 与 WP-7 的候选退役一起做：那时 `ModuleBlockShape.BuildMemberAt` 已经是现成的一成员建造入口。

# class DeclarationSpan

声明族的切片工具。区间一律是**宿主 `Data` 的 `[start, end)`**（`end` 不含），与
`ItemScanState.CodeAt[End] + 1` 的口径一致，所以 item 表给出的 `Start` / `End` 可以直接喂进来。

「只读宿主」是硬约束：`host.Data` 是容器（`Bracket` / 根壳 / 已建形状）正在用的数组，建造过程里
splice 它会让上游游标错位（INV-3：splice 只由引擎在整批消费完后做）。所以缺失的 `;` **不补单元**，
而是由各入口的 `hasSemicolon` 参数表达「ASI 收口」，区间终点直接取最后一个代码单元。

## static method Slice:(host:Token, start:int, end:int)=>Array<Token>

取 `host.Data[start, end)` 里的**代码单元**（跳过 trivia）。下标先夹到合法范围，
所以调用方不必先做边界检查。

```ts
const code:Array<Token> = [];
let from = start;
let to = end;
if (from < 0) {
  from = 0;
}
if (to > host.Data.length) {
  to = host.Data.length;
}
for (let at = from; at < to; at++) {
  const unit = host.Data[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  code.push(unit);
}
return code;
```

## static method PosBefore:(host:Token, start:int)=>int

`start` 之前**最后一个非 trivia 单元**的 `EndIndex`，就是这一片的 `Pos`（含前导 trivia 的半开区间起点，
与 TS 的 `node.pos` 同口径）。前面没有代码单元时返回 0。

```ts
let pos = 0;
for (let at = start - 1; at >= 0; at--) {
  const unit = host.Data[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  const end = unit.SourceRange.EndIndex;
  if (end >= 0) {
    pos = end;
  }
  break;
}
return pos;
```

## static method Positions:(code:Array<Token>, base:int)=>Array<int>

给每个代码单元算 `Pos`：第一个单元用 `base`，之后每格用**前一个代码单元的 `EndIndex`**。
这条口径与 `StatementBuilder.Load` / `ExpressionBuilder.Load` 逐字相同（模块声明的
`FromUnits(code, positions, …)` 要的正是这个数组）。

```ts
const positions:Array<number> = [];
let pos = base;
for (const unit of code) {
  positions.push(pos);
  const end = unit.SourceRange.EndIndex;
  if (end >= 0) {
    pos = end;
  }
}
return positions;
```

## static method EndsWithSemicolon:(code:Array<Token>)=>bool

这一片是否以显式 `;` 收口。`false` 表示 ASI（EOF / 换行 / `}`）收口，各入口按「无分号口径」建造。

```ts
if (code.length === 0) {
  return false;
}
const last = code[code.length - 1];
return last instanceof Symbol && (last as Symbol).Is(";");
```

# interface ModuleMemberBuild

模块体成员的**一成员建造器**：把宿主 `Data` 的一段（`[start, end]`，两端都是宿主下标、含 `end`）
建成一个成员形状并返回；建不出返回 `null`（调用方走 raw 回退）。实现方是 `ModuleBlockShape`
（它持有成员分派与各声明形状的入口），本接口只用来**避免循环依赖**：模块体规则不 import 模块体形状。

## method BuildAt:(host:Token, start:int, end:int, context:SyntaxContext)=>Token | null

# class ModuleItemRule implements ItemRule

```txt
namespace N { let a = 1; }
declare module "m" { export let x: number; class C {} }
namespace N { function f(): void; }
```

模块体里唯一的一族 item：**一个成员**（普通语句 / 带体声明 / `export` 修饰的成员 / `export as namespace` /
`import-equals` / `import … from` / `export … from` / `export =`）。判型只读首单元；收口只看三件事：
显式 `;`、换行处的下一个成员首词、已闭合的 `{ … }` 体括号。

建造**不复制**成员分派：交给 `ModuleMemberBuild`（`ModuleBlockShape.BuildMember` 的现成分派）。

## static field Member:int = 1

本族唯一的 kind 号。

## field MemberBuilder:ModuleMemberBuild | null = null

一成员建造器（由 `ModuleBlockShape` 在挂表时注入）。为 `null` 时 `Build` 返回 `null`（raw 回退）。

## method Classify:(code:Array<Token>)=>Array<int>

首单元判型：空 / trivia / 单独的 `;` / 收尾的 `}` 都不认领（`;` 是空语句，属语句族）。

```ts
if (code.length === 0) {
  return [];
}
const first = code[0];
if (first.IsTriviaToken) {
  return [];
}
if (first instanceof Symbol && (first as Symbol).Is(";")) {
  return [];
}
return [ModuleItemRule.Member];
```

## method Extend:(state:ItemScanState, units:Array<Token>, tokenIndex:int)=>void

模块体成员没有族内增量状态：成员体里的 `{ … }` / `( … )` 都是**已闭合的括号单元**，
深度天然为 0，边界证据全在 `Analyze` 一次算完。

```ts
if (units.length === 0) {
  return;
}
```

## method Analyze:(state:ItemScanState)=>void

收口判定，三条证据按优先级：

1. **显式 `;`**：第一条 `;` 就是本成员末尾（含 `;`）；
2. **换行处的下一个成员首词**：ambient 模块体常态（`function f(): void` ⏎ `function g(): void`），
   判据与 `ModuleBlockShape.BuildMember` 的无分号路径同一份（`IsMemberStartWord` + `NoLineBreakBetween`）；
3. **已闭合的 `{ … }` 体括号**：`class C {}` / `namespace N {}` 这类带体成员，体闭合即成员末尾
   （`}` 之后的 `;` 属空语句，不进本成员）。

三条都不成立时不置 `Complete`：整段留 raw，收口时由 `ModuleBlockShape.FromBracket` 按重构前口径恢复。

```ts
state.Complete = false;
state.End = -1;
const code = state.Code;
if (code.length === 0) {
  return;
}
let endAt = -1;
for (let at = 1; at < code.length; at++) {
  const unit = code[at];
  if (unit instanceof Symbol && (unit as Symbol).Is(";")) {
    endAt = at;
    break;
  }
}
if (endAt < 0) {
  for (let at = 1; at < code.length; at++) {
    const unit = code[at];
    if (!(unit instanceof Common)) {
      continue;
    }
    if (!ModuleItemRule.IsMemberStartWord((unit as Common).TempToString())) {
      continue;
    }
    if (StatementScanner.NoLineBreakBetween(code[at - 1], unit)) {
      continue;
    }
    endAt = at - 1;
    break;
  }
}
if (endAt < 0) {
  const last = code[code.length - 1];
  if (last instanceof Bracket && (last as Bracket).StartBracketChar === "{") {
    endAt = code.length - 1;
  }
}
if (endAt < 0) {
  return;
}
if (endAt >= state.CodeAt.length) {
  return;
}
state.Complete = true;
state.End = state.CodeAt[endAt];
```

## method Build:(host:Token, state:ItemScanState, context:SyntaxContext)=>Token | null

把本 item 的区间 `[state.Start, state.End]`（宿主下标，含 `;`）交给注入的一成员建造器。
建造器返回 `null`（这一片不是它能建的形态）时本方法也返回 `null`，引擎不 splice，raw 留给收口路径。

**不改 `host.Data`**：splice 由引擎在整批消费完后统一做。

```ts
const builder = this.MemberBuilder;
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

模块体成员的区间**含** `;`（`BuildMember` 的各入口也是按「带 `;`」建造的）。

```ts
return true;
```

## static method IsMemberStartWord:(text:string)=>bool

成员首词集合，与 `ModuleBlockShape.IsMemberStartWord` 同一份（模块体的无分号成员靠它在换行处收口）。

```ts
return text === "export" || text === "declare" || text === "function" || text === "class"
  || text === "interface" || text === "enum" || text === "const" || text === "let"
  || text === "var" || text === "type" || text === "namespace" || text === "module"
  || text === "import" || text === "using" || text === "abstract";
```

# class ModuleBodyItemHost implements IBatchHost

模块体括号的批次宿主（**本阶段未接线**，见文件头）。接上之后：`Bracket.BatchAdapter` 指向本对象，
括号里每个 basic token 关闭时由 `UnitToken.OnBasicTokenClosed` 交给 `Engine.Feed`；括号闭合时由
模块声明形状的收口路径调 `FlushBatch → CloseBatch → Engine.Flush`，把最后一个成员建掉。

## field Host:Token | null = null

宿主（模块体括号）。`CloseBatch` 没有 batch 参数，所以引擎 flush 需要的宿主在这里记一份。

## field Engine:ItemListEngine = new ItemListEngine()

item 表引擎（core 契约实现）。

## field Fallback:RawFallback = new RawFallback(-1, -1, "")

建不出 item 的区间口袋。

## field BatchPolicy:BatchPolicy | null = ModuleBodyItemHost.CreatePolicy()

## static method CreatePolicy:()=>BatchPolicy

软边界策略：`;` 收尾一批、`}` 收尾一批、每 8 个单元兜一批（ambient 模块体的成员短、无分号常见）。

```ts
const policy = new BatchPolicy();
policy.FlushOnSemicolon = true;
policy.FlushOnBraceClose = true;
policy.MaxTokens = 8;
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

消费一个批次：`Feed` 自己消费 `[batch.From, batch.To)` 的全部 unit，本方法只按 `Engine.Built` 的增量
回答 `Done` / `NeedMore`。

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

嵌套括号的创建与模块体 item 表无关：括号里的字符归括号自己，item 表把整个括号当一个 unit。

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
