# dependencies
```xl
import { BasicTokenBatch } from "./batch/basic-token-batch.xl.md"
import { BatchStates } from "./batch/batch-states.xl.md"
import { IBatchHost } from "./batch/i-batch-host.xl.md"
import { CloseStates } from "./close-states.xl.md"
import { ItemComputeStates } from "./item-compute-states.xl.md"
import { SyntaxException } from "../exceptions/syntax-exception.xl.md"
import { BranchStates } from "./branch-states.xl.md"
import { CatalogGuide } from "./catalog-guide.xl.md"
import { IItemCompute } from "./i-item-compute.xl.md"
import { ReloadMessage } from "./messages/reload-message.xl.md"
import { SourceRange } from "./source-range.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { Token } from "./token.xl.md"
import { Template } from "./templates/template.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

单元：能够「挂载」子单元的 token。它是 `Root` / `Statement` / `BlockToken` 这一族的共同父类，负责把「一次处理一整个 buffer 窗口」这套调度固定下来：窗口里逐字符前进，每消费一个字符就推进 `context.Index`。

它同时实现 `IItemCompute`：`CatalogGuide` 指向**宿主在自己名下的**目录向导（默认 `null`）。basic token 关闭时**只问自己的父单元**，所以要被命中，本单元必须是那批 basic token 的直接父单元。

向导本身不继承任何东西、不在树里，所以它是一个**普通引用**，不是挂载的子单元：本单元的 `Data` 里装的仍是那批 basic token。

# class UnitToken extends Token implements IItemCompute

单元。

## field CatalogGuide:CatalogGuide | null = null

宿主在本单元名下的目录向导；`null` 表示没有。

它是普通引用而不是子单元——向导不进 `Data`、不进 XML。

普通单元默认没有，所以父单元不是宿主时，basic token 关闭不触发任何判定。

## field BatchFrom:int = -1

当前活动批次的批首在 `Data` 中的下标；`-1` 表示没有批次（legacy 路径）。

## field BatchSink:BasicTokenBatch | null = null

当前活动批次的零拷贝视图；`null` 表示没有批次。

## field BatchAdapter:IBatchHost | null = null

本宿主挂载的批次消费者：`ItemListEngine`（新引擎）或 `LegacyBatchAdapter`（旧目录）二选一。
`null` 表示本宿主未迁移；`BatchMode=0` 时全部宿主都是 `null`。

## private field BatchGated:bool = false

本批的 flush 时机是否**由 `BatchPolicy` 决定**（即适配器给了非 `null` 的策略）。

为 `true` 时 `OnBasicTokenClosed` 只在 `ShouldFlush` 为真时才把批次交出去，未 flush 的 token 只推进
`batch.To` / `batch.AtEof`；`FlushBatch`（硬边界）负责先把尚未交出去的尾巴喂一遍再收口。
为 `false`（策略为 `null` 的宿主，如枚举体）时逐字保持改动前的「每个 basic token 关闭就交一批」。

## method OnBasicTokenClosed:(token:Token, context:SyntaxContext)=>CloseStates

basic token 关闭的唯一回调入口（11 个 basic 单元都调它，不再各自问目录）。

- `BatchMode=0` 或未挂适配器 → 逐字走 `Token.OnBasicTokenClosed` 的 legacy 实现；
- 挂了适配器且有 `BatchPolicy` → 只入批，**软边界为真才**把批交给适配器（否则只推进批尾，不 `Recompute`、
  不 `Feed`）；`Done`/`Reload` 时清批，`Reload` 映射成 `CloseStates.Built`；
- 挂了适配器但策略是 `null` → 每个 token 关闭就交一批（改动前的路径，逐字不变）。

```ts
if (context.BatchMode === 0 || this.BatchAdapter === null) {
  return super.OnBasicTokenClosed(token, context);
}
const last = this.Data.length - 1;
if (last < 0) {
  return CloseStates.Nothing;
}
let batch = this.BatchSink;
if (batch === null) {
  batch = new BasicTokenBatch();
  batch.Reset(this, last, this.IsAtEof());
  this.BatchSink = batch;
  this.BatchFrom = last;
}
batch.To = last + 1;
batch.AtEof = this.IsAtEof();
batch.Sealed = false;
const policy = this.BatchAdapter.BatchPolicy;
if (policy !== null) {
  this.BatchGated = true;
  if (!policy.ShouldFlush(this, batch, token)) {
    return CloseStates.Nothing;
  }
}
batch.Recompute();
const state = this.BatchAdapter.OnBasicTokens(batch, context);
if (state === BatchStates.Done || state === BatchStates.Reload) {
  this.AdvanceBatch(batch);
  if (state === BatchStates.Reload) {
    return CloseStates.Built;
  }
}
return CloseStates.Nothing;
```

## method FlushBatch:(context:SyntaxContext)=>BatchStates

硬边界 flush：先把「软边界策略攒下来的尾巴」交出去，再封批、把尚未收口的批次交给适配器，然后清批。

**这一步是软边界的配平**：`OnBasicTokenClosed` 攒了多少没交出去的 token，这里一次性喂进去
（`Feed` 自己消费 `[Cursor, To)` 的全部 unit），所以「攒批」不改变 item 的最终结论，只改变它被建出的时刻。
未开软边界的宿主（策略 `null`）在每次关闭时已经喂完（`Cursor === To`），这里什么都不做。

```ts
const batch = this.BatchSink;
if (batch === null || this.BatchAdapter === null) {
  this.ClearBatch();
  return BatchStates.Done;
}
batch.To = this.Data.length;
batch.AtEof = this.IsAtEof();
if (this.BatchGated && batch.Cursor < batch.To) {
  batch.Recompute();
  this.BatchAdapter.OnBasicTokens(batch, context);
}
batch.Sealed = true;
batch.To = this.Data.length;
batch.Recompute();
const state = this.BatchAdapter.CloseBatch(context);
this.ClearBatch();
return state;
```

## private method ClearBatch:()=>void

清掉活动批次（`BatchFrom` 回到 `-1`）。

```ts
this.BatchFrom = -1;
this.BatchSink = null;
this.BatchGated = false;
```

## private method AdvanceBatch:(batch:BasicTokenBatch)=>void

按引擎给出的 `batch.Cursor` 决定「保留未消费尾巴」还是「清批」（G1/G2 的宿主侧半条契约）。
引擎已经 splices 并把 `batch.From/To/Cursor` 重定位到 splice 之后，宿主只需要跟随 `Cursor`。

```ts
if (batch.Cursor < 0 || batch.Cursor >= batch.To) {
  this.ClearBatch();
  return;
}
batch.From = batch.Cursor;
batch.Sealed = false;
batch.Recompute();
this.BatchFrom = batch.Cursor;
```

## private method IsAtEof:()=>bool

本单元的范围是否已到文档末尾。

```ts
const document = this.SourceRange.Document;
if (document === null) {
  return true;
}
return this.SourceRange.End >= document.GetCount();
```

## method ComputeItems:(context:SyntaxContext)=>ItemComputeStates

重算宿主在本单元名下的目录向导的候选，把自己作为宿主转交给它。

没向导时返回 `Nothing`——被问到就答「什么都没做」。

```ts
if (this.CatalogGuide !== null) {
  return this.CatalogGuide.ComputeItems(this, context);
}
return ItemComputeStates.Nothing;
```

## method ComputeItemsByIndex:(tokenIndex:int, context:SyntaxContext)=>ItemComputeStates

按下标重算候选，把**自己（宿主）与下标**一起转交给向导的同名方法。

向导的方法要两个参数（宿主 + 下标），而接口这里是单参——两者的差由本方法补上。

```ts
if (this.CatalogGuide !== null) {
  return this.CatalogGuide.ComputeItemsByIndex(this, tokenIndex, context);
}
return ItemComputeStates.Nothing;
```

## method OnBracketCreatedEvent:(bracket:Token, context:SyntaxContext)=>void

括号创建事件的默认实现：什么都不做。

普通单元不关心括号创建；只有把自己当前正在吃的内容当作「括号里的东西」的壳形状（如 `InterfaceDeclarationShape`）才覆写它，在括号刚建出来时决定要不要给那个括号初始化目录向导。

## method OnChildCreated:(child:Token, context:SyntaxContext)=>void

括号创建事件的新名字（`OnBracketCreatedEvent` 改名，签名不变）：默认转调旧方法。

```ts
this.OnBracketCreatedEvent(child, context);
```

## constructor:(template:Template)=>void

以模板创建。挂载与退出这套调度不需要额外状态，构造器里只有转调。

```ts
super(template);
```

## protected method ExitOrPre:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>BranchStates

判断当前字符是让本单元「退出」还是「前移」。

`value` 是 `Process` 已经读好的当前字符（`buffer.ValueAt(index)`，界内自证）：实现直接用它，不要再为同一个字符读一次 `buffer.At(index)`。

抽象方法，由各单元实现（如 `Root` 恒返回 `Undo`）。

```ts
throw new Error("abstract member: ExitOrPre");
```

## method Process:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

处理一个 buffer 窗口：从 `index` 起逐字符推进，**一次调用吃一个窗口**。

`index` 是本地游标（初值 = `context.Index` = `buffer.Start`）；`context.Index` 是全局下一个待处理位置。每消费一个字符都必须让它前进，返回时它不得小于进入时的 `index`。

处理顺序（每个位置）：

1. 有挂载单元就整个交给它；它没推进 `context.Index` 就没有进展，本单元**原样返回**（不许死循环）。
2. 否则先读出当前字符（`buffer.ValueAt(index)`）——`index` 在本次窗口内由循环条件自证界内，所以走无校验的 `ValueAt`，而且**只读这一次**：同一份 `value` 交给 `ExitOrPre`，再顺链传给每条跳转和 `Default`。`ExitOrPre` 返 `Reload` 就把当前下标压进消息队列并返回（当前字符没被消费）；返 `Done` 就记 `LastIndex` 并前进。
3. 再依次跑 `ProcessQueue` 里的跳转，哪个 `Done` 就前进并进入下一个位置，哪个 `Reload` 就压消息并返回。跳转函数用第 5 个参数 `value`，不再各自读当前字符。
4. 都不接手才走 `Default` 兜底；兜底默认消费一个字符。

**`Done` 的统一 `+1`**：处理者可能只做了签入签出、没有自己碰 `context.Index`（basic token 的跳转就是这样）。所以只要 `context.Index === index`，就补 `context.Index = index + 1`。这条是「默认单字符消费」的唯一出口。

**`LastIndex` 记 `context.Index - 1`**：跳转函数可以把 `context.Index` 一次推进多格（basic token 的整段收——注释正文、空白段、Common 正文），
此时最后被消费的字符是 `context.Index - 1`，不是进入本帧时的 `index`。单字符消费时两者相等，所以这是同一口径的推广。

**`Reload` 是这套调度的转折点**：一次关闭可能触发形状建造，分支只能把结果报上来。拿到 `Reload` 就**停止整个窗口**、把当前位置压进消息队列，`context.Index` 留在原地（阻塞返回），由驱动层重放。`ProcessOwner` 用 `null`（= 根）：新形状已经 mount，重放时自然落到正确那一层。

**窗口里的两个提前返回（关闭/重放的安全阀）**：
- 本单元在本次窗口里已经 `Quit`（`Parent.MountedUnit` 已经不是自己）→ **立刻返回**，把本窗口剩余字符交回父单元。关闭发生在窗口中间时，已卸载的单元不许再吃后面的字符。
- `context.Messages` 非空 → **立刻返回**，把尚未消费的消息交回驱动层先 `DrainMessages()` 重放。否则父单元会先把重放位置之后的字符处理掉，重放就变成乱序。**驱动层自己重放一个位置时（`context.Replaying`）不适用**：重放窗口固定一格，队列里可能还排着更后面的消息。

整个窗口包在**一次** `try/catch` 里：任何异常都被包成 `SyntaxException`，范围取「前一个字符到当前字符」`[max(0, index-1), index+1)`。已经是 `SyntaxException` 的异常原样上抛，不再套一层窗口范围。

**每字符帧的瘦身**（本方法是 profile 里的第一热点：self ≈ 19.5%，约 520 ns/帧、68 ns/字符）：`this` 在单元族里是多态的（`Root` / `Statement` / `BlockToken` …），逐字符重复的 `this.X` 属性读是本方法最贵的一笔，而其中大多数在**整段窗口内都不变**。所以：

- 窗口终点 `buffer.End`、消息队列 `context.Messages`（引用）、`context.Replaying`、跳转队列 `this.ProcessQueue` 各自只在进入循环前读**一次**——这四样在本次窗口内都不会被改写（`Messages` 只 push/splice、不换引用；`Replaying` 由驱动层在调用前后翻，窗口内恒定；`ProcessQueue` 构造时定下）。
- 两段提前返回的守卫里，`this.Parent` 每帧只读**一次**再复用（原来读两次）。它是字段而不是 getter，同一次求值里两次读必然同值，因此这一改**不改变**守卫语义。
- 挂载单元 `this.MountedUnit` 每帧读**一次**（原来 null 判定 + 调用各读一次）。
- 跳转队列由 `for…of` 换成下标循环：`for…of` 每帧都要建一次数组迭代器，而这里只想要「按下标取一项再调用」。

`Quit` 守卫仍然**逐帧**判定 `parent.MountedUnit !== this`（而不是在循环外判一次）：关闭可能发生在窗口中间，已卸载的单元不许再吃后面的字符。

```ts
try {
  // 这四样在本次窗口内恒定，逐字符重复读只是多态属性读的开销。
  const end = buffer.End;
  const messages = context.Messages;
  const replaying = context.Replaying;
  const queue = this.ProcessQueue;
  while (index < end) {
    // 本单元已在本次窗口里 Quit（关闭后卸载）：交回父单元处理剩余字符。
    const parent = this.Parent;
    if (parent !== null && parent.MountedUnit !== this) {
      return;
    }
    // 还有未消费的消息（Reload）：先交回驱动层 DrainMessages 重放，保证重放先于后续字符。
    // 重放本身（窗口只有一个位置）不受这条约束：队列里可能还有排在它后面的消息。
    if (!replaying && messages.length > 0) {
      return;
    }
    const mountedUnit = this.MountedUnit;
    if (mountedUnit !== null) {
      mountedUnit.Process(context, buffer, index);
      if (context.Index === index) {
        return;
      }
      this.LastIndex = context.Index - 1;
      index = context.Index;
      continue;
    }
    const value = buffer.ValueAt(index);
    const exitState = this.ExitOrPre(context, buffer, index, value);
    if (exitState === BranchStates.Reload) {
      context.Messages.push(new ReloadMessage(null, index));
      return;
    }
    if (exitState === BranchStates.Done) {
      if (context.Index === index) {
        context.Index = index + 1;
      }
      this.LastIndex = index;
      index = context.Index;
      continue;
    }
    let transited = false;
    if (queue !== null) {
      // 当前字符只读一次，顺链传给每条跳转（basic token 的 Transit 不再各自 `buffer.At(index)`）。
      const branches = queue.Data;
      for (let branch = 0; branch < branches.length; branch++) {
        const state = branches[branch](context, this, buffer, index, value);
        if (state === BranchStates.Reload) {
          context.Messages.push(new ReloadMessage(null, index));
          return;
        }
        if (state === BranchStates.Done) {
          if (context.Index === index) {
            context.Index = index + 1;
          }
          this.LastIndex = context.Index - 1;
          index = context.Index;
          transited = true;
          break;
        }
      }
    }
    if (!transited) {
      this.Default(context, buffer, index, value);
      if (context.Index === index) {
        context.Index = index + 1;
      }
      this.LastIndex = index;
      index = context.Index;
    }
  }
} catch (e) {
  if (e instanceof SyntaxException) {
    throw e;
  }
  const start = Math.max(0, index - 1);
  const range = new SourceRange(buffer.Document, start, index + 1);
  throw SyntaxException.FromInner(range, e);
}
```
