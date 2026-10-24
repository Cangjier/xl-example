# dependencies
```xl
import { HandoffRequest } from "./batch/handoff-request.xl.md"
import { Document } from "./document.xl.md"
import { Message } from "./message.xl.md"
import { ReloadMessage } from "./messages/reload-message.xl.md"
import { SourceRange } from "./source-range.xl.md"
import { SyntaxException } from "../exceptions/syntax-exception.xl.md"
import { Token } from "./token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

语法上下文：持有根单元、**绝对游标**与消息队列，是驱动整个解析的引擎。`TextContext` 是它唯一的实现。

它一次处理**一个 buffer 窗口** `[Index, Index + BufferSize)`：把窗口交给根单元跑完，再消费消息队列；`ReloadMessage` 会把下标区间按升序重放（可能把游标拉回再前进）。

变量表的键是 `string`、值是 `any`——ts 的 `object` 只表示「非原始值」，装不下 `string` / `number`。

# class SyntaxContext

语法上下文。

## field BufferSize:int = 32

一个窗口最多覆盖多少个字符。窗口大小只影响调度粒度，不影响解析结果；构造时可配置。

## field Index:int = 0

绝对游标：下一个待处理的字符下标。token 消费字符时必须推进它；`Process` 返回时它不得小于进入时的值（回退只允许发生在 `ReloadMessage` 的重放路径里）。

## field CurrentDocument:Document | null = null

正在处理的文档；`Process` 开始时设置，消息重放要用它构造窗口。

## field Messages:Array<Message> = []

待消费的消息队列。

## field Replaying:bool = false

`DrainMessages` 正在重放一个位置时为 `true`。重放的窗口固定 `[at, at+1)`，此时队列里可能还压着**更后面**的消息（它们按 FIFO 排在重放消息之后），单元不能因为「队列非空」就把这一个位置也让出去，否则重放原地无进展。

## field BatchEpoch:int = 0

批次纪元：宿主挂载/切换适配器时递增，用来判定已有批次视图是否失效。

## field Handoff:HandoffRequest | null = null

活动中的 shell handoff 请求（递归深度上限见 `HandoffRequest.MaxDepth = 8`）。

## field BracketHook:any = null

括号创建钩子：`Bracket.Transit` 建出新括号、**通知完父单元之后**调用一次（`bracket` 是新括号，`host` 是它的父单元）。

签名是 `(bracket:Token, host:Token, context:SyntaxContext)=>void`。**故意声明成 `any`**：xl 的类型打印器会把
函数类型外层的括号去掉，`((…)=>void) | null` 会变成「返回 `void | null` 的函数」，`= null` 直接不合法（实测 TS2322）；
可空函数指针在 xl 里没有别的写法，所以用 `any` 装它，装配方按上面的签名赋值。

默认 `null` 表示语言侧没有装配钩子——`Transit` 只多一次判空，行为与基线逐字节一致。

钩子只准「挂载」：不建 token、不改 `BranchStates`、不碰游标，所以它不可能制造 `Reload`，`Transit` 的返回路径不动。
它存在的理由是**时序**：语句块 `{` 的父单元是 core 的 `Root` / 外层 `Bracket`，两者都不认「语句块」，
除了这条钩子，语言侧拿不到「这个 `{` 刚建出来」的时刻（见 `docs/refactor/stream-mount-feasibility.md` §1）。

## field VariableMap:Map<string, any> = new Map()

上下文变量表。

## field RegexStartAfter:Set<int> = new Set()

**位置登记**：这些源码下标之后紧邻的下一个代码单元可以起表达式 / 语句（控制头 `)`、裸块 `}`、`else` / `do` / `case … :` 这类语句关键字之后）。

它登记的是**不可变的历史事实**，不是「下一次判据用我」的待消费开关：

- 没有消费这一步，也就没有「谁消费、消费几次、撤销后如何恢复」的问题；`Reload` 重放不会丢，`Undo` 不需要恢复任何东西。
- 能不能生效取决于**可判定的邻接关系**：查的人先跳过 trivia 取到 `/` 之前最后一个代码单元 `last`，只有 `last.SourceRange.EndIndex` 恰好等于登记下标时才成立。中间只要插进任何别的代码单元，条件**永久**失效，不可能隔一段距离被消费。
- 只增不减也不会误伤（失效条件是邻接关系，不是时间顺序）；规模是 O(控制结构数)，随上下文一起丢。

**谁登记**：知道自己上下文的形状，在关闭那个边界 token 时登记它的 `EndIndex`（半开终点）。对象字面量的 `}` 不登记——后面该是除号；登记与否就是语法层的表态，不需要 `false` 值。

**谁判定**：`RegexToken.Transit`。

## field Root:Token

根单元。整个解析从它开始，所有 token 最终都挂在它的 `Data` 下。

## constructor:(root:Token, bufferSize?:int)=>void

以根单元与窗口大小创建上下文；窗口大小省略时用 `32`。

```ts
this.Root = root;
this.BufferSize = bufferSize ?? 32;
```

## method GetDefault:<Item>(key:string, defaultValue?:Item | null)=>Item | null

取变量；不存在时给默认值。

变量存在但值是 `null` 时也返回默认值。

```ts
if (this.VariableMap.has(key)) {
  const value = this.VariableMap.get(key);
  if (value === null || value === undefined) {
    return null;
  }
  return value as Item;
}
return defaultValue ?? null;
```

## method Get:(key:string)=>any

取变量；不存在返回 `null`。

```ts
if (this.VariableMap.has(key)) {
  return this.VariableMap.get(key);
}
return null;
```

## method ContainsKey:(key:string)=>bool

变量是否存在。

```ts
return this.VariableMap.has(key);
```

## method Set:(key:string, value:any)=>SyntaxContext

设变量，返回自身便于链式调用。

```ts
this.VariableMap.set(key, value);
return this;
```

## method Process:(document:Document)=>void

处理整个文档。

主循环：每次拿 `[Index, min(Index + BufferSize, count))` 这个窗口交给根单元，然后消费消息队列（Reload 可能把 `Index` 拉回再前进）；一轮下来游标没超过进入时的位置就是**无进展**，直接抛 `SyntaxException`，绝不原地死循环。

主循环结束后：游标压到 `count`、给根签出到 `count`（半开终点 = 文件末尾），再把**空窗口** `[count, count)`（`IsEof`）交给根——根单元的关闭由这条 EOF 路径驱动。最后再抽一次消息队列。

开头的 `SourceRange.CurrentDocument = document` 是**文档登记**：新模型里 token 只拿 int 下标，
`Token.SignIn` / `SignOut` 在范围没有文档时靠它兜底，所以驱动层一开始就要把它设好。
解析是单线程、顺序的，处理结束不清空。

```ts
this.CurrentDocument = document;
SourceRange.CurrentDocument = document;
this.Index = 0;
const count = document.GetCount();
while (this.Index < count) {
  const end = Math.min(this.Index + this.BufferSize, count);
  const buffer = new SourceRange(document, this.Index, end);
  const forwardFrom = this.Index;
  this.Root.Process(this, buffer, this.Index);
  if (this.Index < forwardFrom) {
    this.Index = forwardFrom;
  }
  this.DrainMessages();
  if (this.Index <= forwardFrom) {
    throw SyntaxException.FromMessage(
      new SourceRange(document, forwardFrom, Math.min(forwardFrom + 1, count)),
      `SyntaxContext.Process: no progress at index ${forwardFrom}, the owner blocked without consuming any character`,
    );
  }
}
this.Index = count;
this.Root.SignOut(count);
this.Root.Process(this, new SourceRange(document, count, count), count);
this.DrainMessages();
```

## method ProcessRange:(owner:Token, buffer:SourceRange, index:int)=>void

让指定单元处理一个窗口（从 `index` 起），然后消费消息队列。

它是旧的单点处理入口的替代：不再有「位置对象 + 队列项」，调用方自己给出窗口。
窗口带着文档时一并登记为 `CurrentDocument`（`SourceRange.CurrentDocument` 同步更新），
否则沿用上一次登记的那个。

```ts
if (buffer.Document !== null) {
  this.CurrentDocument = buffer.Document;
  SourceRange.CurrentDocument = buffer.Document;
}
this.Index = index;
owner.Process(this, buffer, index);
this.DrainMessages();
```

## protected method HandleMessage:(message:Message)=>void

消费一条非重放消息的钩子。

默认空实现，`TextContext` 也覆写成空，所以不写 ts 体，打印器产出空方法。

## private method DrainMessages:()=>void

把消息队列抽干：`ReloadMessage` 按位置**升序**逐点重放，其余交给 `HandleMessage`。

重放一个位置时：先存下当前游标，把游标压到 `at`，用**只覆盖这一个位置**的窗口 `[at, at + 1)` 把该位置交给 `ProcessOwner ?? Root` 重放；重放必须让游标离开 `at`，否则抛 `SyntaxException`（防挂死）；处理完把游标恢复到 `max(当前, 存下的)`。区间消息从 `StartIndex` 到 `EndIndex`（不含）逐个升序重放；`EndIndex < 0` 表示单点。

**窗口只放一个位置**（契约写的 `min(at+BufferSize, count)` 在这里是矛盾的）：`owner.Process` 会把这个窗口一直吃到 `buffer.End`，用 `BufferSize` 的窗口重放第一个点就会把 `at+1 .. at+BufferSize` 一起重放一遍，而外围的升序循环随后又把游标压回 `at+1` 再重放一次——区间里每个位置会被处理多遍（实测 `[2,5)` 重放成 `2..9` 三遍）。重放要复刻的是旧队列「一次一个位置」的语义，所以窗口必须 `[at, at+1)`；真要一口气吃多格的 token 由它自己的 `Process` 推进 `context.Index`，不受窗口大小限制。

```ts
while (this.Messages.length > 0) {
  const item = this.Messages[0];
  this.Messages.splice(0, 1);
  if (item instanceof ReloadMessage) {
    const document = this.CurrentDocument!;
    const count = document.GetCount();
    const owner = item.ProcessOwner ?? this.Root;
    const start = item.StartIndex;
    const endExclusive = item.EndIndex < 0 ? start + 1 : item.EndIndex;
    this.Replaying = true;
    for (let at = start; at < endExclusive; at++) {
      const saved = this.Index;
      const windowEnd = Math.min(at + 1, count);
      let attempts = 0;
      while (true) {
        this.Index = at;
        owner.Process(this, new SourceRange(document, at, windowEnd), at);
        if (this.Index !== at) {
          break;
        }
        // 旧队列语义：一次重放没有推进、只压了新消息（典型是「先建形状、再把当前字符交回来」），
        // 这个位置会被重新排队再处理一遍。这里就地重试，模拟那条回路；换不出推进才算挂死。
        attempts++;
        if (attempts > 8) {
          throw SyntaxException.FromMessage(
            new SourceRange(document, at, Math.min(at + 1, count)),
            `SyntaxContext.DrainMessages: reload made no progress at index ${at}`,
          );
        }
      }
      this.Index = Math.max(this.Index, saved);
    }
    this.Replaying = false;
  } else {
    this.HandleMessage(item);
  }
}
```
