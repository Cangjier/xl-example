# buffer-core API（T1 交付，feat/buffer-core）

本文件是 `feat/buffer-core` 分支的**最终 API 清单**，给 Wave1 其余成员（T3–T9）当移植基准。
权威来源仍是 `C:\Users\Admin\Documents\GitHub\xl-example-set\BUFFER-CONTRACT.md`；本文件只记录
「实现落地后的真实形状」以及契约没写死、由本分支确定下来的细节。

源文件：`core/syntax/**`、`core/exceptions/source-exception.xl.md`。
`core/syntax/source.xl.md`、`core/syntax/process-source.xl.md` 已删除；`Source` 类不再存在。

---

## 0. 先看三条（会卡住每个人的构建）

1. **`xl_build` 是整批失败的**：一次调用里只要有一个被计划的文件报 `E1006`（依赖读不到），
   整次调用 `0 written`。所以 T3 落地之前，**全仓 `paths:[core,typescript]` 的构建必然失败**
   （basic-tokens 里还有 17 个文件 `import { Source } from ".../source.xl.md"`）。
   过渡期做法：`xl_build` 只传**自己拥有的文件清单**（可以逐个文件列，xl 会自己读依赖闭包）；
   自己的文件闭包里不碰 `source.xl.md` 就能生成。
2. `dist/` 是 gitignore 的生成物。谁在删文件之前构建过，本地 `dist/ts/core/syntax/source.ts` /
   `process-source.ts` 会变成孤儿（`E2004`，warning 不是 error）。跑一次
   `xl_orphans`（`prune:true`）清掉即可；新 clone 没有 `dist`，不受影响。
3. `SyntaxContext.Process` 的 EOF 阶段由**根单元**处理（空窗口 `[count,count)`，`buffer.IsEof()`）；
   根之下其它单元收不到 EOF。`Root.SignOut(count)` 由 `SyntaxContext` 做，`SourceFileShape.Process`
   只补「没签过时才签」。

---

## 1. Document

```ts
class Document {
  GetValue: (index: number) => string;
  GetCount: () => number;
  Parent: SourceRange | null = null;
  constructor(getValue: (index: number) => string, getCount: () => number, parent?: SourceRange | null);
  // ✗ At(index): Source —— 已删除，全仓不得再出现
  GetRaw(start: number, end: number): string;   // 半开 [start, end)
  GetLine(index: number): number;
  GetLineOffset(index: number): number;
  GetLineInfo(index: number): number[];
  GetRangeString(range: SourceRange): string;
  GetRangeLines(range: SourceRange): string;
  GetScriptPath(): string;
}
```

- `TextDocument.GetRaw` 必须是 `Content.substring(start, end)`（T4 改）。
- `TextDocument.GetRangeString/GetRangeLines` 的 `^`：`index >= StartIndex && index < EndIndex`（T4 改）。
- `GetLine(count)`（EOF 下标）不要求能查行号；诊断路径只用已设置的范围。

## 2. SourceRange（半开）

```ts
class SourceRange {
  static CurrentDocument: Document | null = null;   // T1b：驱动层登记，SignIn/SignOut 兜底用
  Document: Document | null = null;
  Start: number = -1;                 // -1 = 未设置
  End: number = -1;                   // 开区间终点；-1 = 未设置
  constructor(document?: Document | null, start?: number, end?: number);
  static Of(document: Document, start: number, end: number): SourceRange;
  static Whole(document: Document): SourceRange;      // [0, GetCount())
  At(index: number): string;          // 合法 iff Start<=index<End，否则抛 SourceException.SourceRangeIndexOutOfRange
  Has(index: number): boolean;        // 同上，不抛
  Length(): number;                   // max(0, End-Start)
  IsEmpty(): boolean;                 // End <= Start
  IsInRange(index: number): boolean;  // Start<=index<End
  IsEof(): boolean;                   // Document!==null && Start===End && Start>=GetCount()
  get StartIndex(): number;           // = Start
  get EndIndex(): number;             // = End
  Clone(): SourceRange;
  Equals(other: any): boolean;
  static Same(left: SourceRange | null, right: SourceRange | null): boolean;
  static Different(left: SourceRange | null, right: SourceRange | null): boolean;
  GetHashCode(): number;
  ToString(): string;
  GetRangeString(): string;
  GetRangLines(): string;
  GetRaw(): string;                   // [Start, End)
  GetRawRange(start: number, end: number): string;    // [start, end)
  GetLineRange(): number[];
  GetStartLine(): number; GetEndLine(): number;
  GetStartLineInfo(): number[]; GetEndLineInfo(): number[];
  static FromRanges(start: SourceRange, end: SourceRange): SourceRange;   // [start.Start, end.End)
}
```

实现细节（契约未写死，照此使用）：

- `At` **不分配对象**：`Has(index)` 校验后直接 `Document.GetValue(index)`。越界抛 `SourceRangeIndexOutOfRange`。
- `Equals` 的 `Document` 按**引用**比较。
- `GetStartLine/GetEndLine/GetLineRange/Get*LineInfo`：半开口径下「终点所在行」是最后一个字符
  （`End - 1`，空范围退回 `Start`）；EOF/越界索引被夹到 `count - 1` 再查行（旧版对 EOF 会抛，
  诊断路径实际不会拿 EOF 范围查行）。
- `GetRaw/GetRawRange` 在 `Document === null` 或任一端 `< 0` 时抛 `SourceException.SourceRangeContainsNull`。
- `IsEof()` 对空文档的 `[0,0)` 也返回 true（空文件 EOF 就是 0）。
- **`Document` 自动补（T1b）**：新模型里 token 只拿 int，旧模型靠 `Source` 自带文档。现在
  `SyntaxContext.Process` / `ProcessRange` 把当前文档登记到 `SourceRange.CurrentDocument`，
  `Token.SignIn` / `SignOut` / `TrySignOut` 与 `BlockToken.SignOut` 在范围**没有**文档时用它兜底
  （只覆盖 `null`，已有值不覆盖）。所以 `token.SourceRange.Document` 在解析期间恒非 null，
  T4/T8 的 `NextChar` / `HasBetween` / `HasLineBreakBetween` 可以直接用。
  单线程顺序解析：`CurrentDocument` 跨文件保留、不必清空。

## 3. Token 家族（调度）

```ts
type BranchTransiter = (context: SyntaxContext, unit: Token, buffer: SourceRange, index: number) => BranchStates;

class Token {
  Template: Template;
  ProcessQueue: Sequence<BranchTransiter> | null = null;
  Parent: Token | null = null;
  Data: Token[] = [];
  MountedUnit: Token | null = null;
  SourceRange: SourceRange = new SourceRange();
  LastIndex: number = -1;             // 最近消费的字符下标（不是 end）；形状补终点用 LastIndex+1
  Closed: boolean = false;
  IsBasicToken/IsAnnotationToken/IsTriviaToken: boolean = false;
  constructor(template: Template);
  Last(index?: number): Token | null;
  protected Default(context: SyntaxContext, buffer: SourceRange, index: number): void;
  protected Close(context: SyntaxContext): CloseStates;
  TryToClose(context: SyntaxContext): CloseStates;       // Start<0 || End<0 → SourceException
  MoveDataTo/Add/AddRange/Quit；
  Process(context: SyntaxContext, buffer: SourceRange, index: number): void;
  SignIn(index: number): Token;                          // 只设 Start + 补 Document，重复设抛 SourceRangeStartIsSetted
  SignInToken(token: Token): Token;
  SignOut(endIndex: number): void;                       // 只设 End（+补 Document），并递归 TrySignOut(endIndex)
  private TrySignOut(endIndex: number): void;            // 同样补 Document
  SignOutToken(token: Token): void;
  Sign(token: Token): void;
  Undo(index: number): void;                             // 回退 index 位置之前刚消费的字符
  IsUndo(index: number): boolean;
  WhichUnitRangeContains(index: number): Token | null;   // 从后往前第一个 IsInRange
  Replace/RemoveSelf/ToXmlString/ToString；
}
```

`UnitToken.Process(context, buffer, index)` 的**硬语义**（契约 §1.4 的落地）：

- 一次调用吃**一整个窗口**：`while (index < buffer.End)`，本地 `index` 从进入值开始，
  每次消费后 `index = context.Index` 继续。
- 有 `MountedUnit` 就整个转交；它没让 `context.Index` 前进 = 本单元阻塞，**立刻原样返回**
  （驱动层负责报无进展/重放）。
- `ExitOrPre` / 跳转函数返回 `Done` 而 `context.Index === index` → 统一补 `context.Index = index + 1`
  （basic token 的跳转只签入签出不碰游标）。
- 返回 `Reload` → push `new ReloadMessage(null, index)`（`ProcessOwner = null` = 根）并**原地返回**，
  当前字符不消费。
- 都不接手 → `Default(context, buffer, index)`，再统一补 `+1`。
- 整个窗口包一次 `try/catch`；异常范围 `new SourceRange(buffer.Document, Math.max(0, index-1), index+1)`，
  再 `throw SyntaxException.FromInner(range, e)`。
- 每走一步都更新 `this.LastIndex`。**MountedUnit 路径**上记的是 `context.Index - 1`（被转交单元可能一口气吃多格）。

`BlockToken.Process`：有挂载转交（推进了才记 `LastIndex`），否则 `Default`，若游标没动补 `+1`。
块 token 默认就是「吃当前一个字符」。`AppendAndSignOut(value, index)` / `AppendValueAndSignOut(value, index)`
都是 `SignOut(index + 1); Temp += value`（两个名字保留给不同调用语义，产物相同）。
`BlockToken.SignOut(endIndex)` **只设 End，不递归、不检查重复**；它同样在 `Document === null` 时
用 `SourceRange.CurrentDocument` 兜底（合成 token / 只签出场景，见 T1b）。

`GuideToken.Process`：有挂载转交；否则 `Navigate(context, buffer, index)` 之后分三种收口——
(1) 游标前进了：记 `LastIndex` 返回；(2) 游标没动但这次 `Navigate` 压了消息：**保持阻塞返回**
（当前字符由 `ReloadMessage` 重放）；(3) 游标没动也没有消息：`Navigate` 消费了字符却没推进游标，
统一补 `+1`。→ **T3 移植 `Navigate` 时不必自己碰 `context.Index`**；要压 `ReloadMessage` 的场景
（引号不配对、插值数不够等）也照旧只 push 消息、不推进。

`IndependentToken.Process` 保持空实现（不消费、不推进，阻塞返回）。

`ShapeToken`：`Pos = 前一个非 trivia 单元的 SourceRange.EndIndex`（首个 0）；`Default` 空实现；
`TryToClose` 在 `End < 0` 时：最后一个子单元 `End >= 0` 就用它，否则 `LastIndex >= 0` 就用 `LastIndex + 1`，
两者都没有就留给基类抛；`ExitOrPre` 恒 `Undo`。

## 4. SyntaxContext（驱动）

```ts
class SyntaxContext {
  BufferSize: number = 32;                 // 构造参数可配置
  Index: number = 0;                        // 绝对游标
  CurrentDocument: Document | null = null;
  Messages: Message[] = [];
  VariableMap: Map<string, any>;
  RegexStartAfter: Set<number>;             // 登记 EndIndex（半开邻接）
  Root: Token;
  constructor(root: Token, bufferSize?: number);
  Process(document: Document): void;
  ProcessRange(owner: Token, buffer: SourceRange, index: number): void;   // 替换 ProcessSingle / ProcessAt
  Get/Set/GetDefault/ContainsKey；        // 不变
  protected HandleMessage(message: Message): void;
  private DrainMessages(): void;
}
```

`Process(document)`：

1. `CurrentDocument = document; SourceRange.CurrentDocument = document; Index = 0`（T1b 的文档登记）。
2. 窗口主循环：`[Index, min(Index+BufferSize, count))` 交给 `Root.Process(this, buffer, Index)`；
   `Index` 被拉回就夹回 `forwardFrom`；`DrainMessages()`；
   若 `Index <= forwardFrom` → 抛 `SyntaxException`（文本含 `no progress at index N`），**绝不原地重试**。
3. `Index = count; Root.SignOut(count); Root.Process(this, new SourceRange(document, count, count), count); DrainMessages();`

`DrainMessages()`：FIFO 弹消息。`ReloadMessage` → `owner = ProcessOwner ?? Root`，
对 `StartIndex`（`EndIndex < 0` 时一个点；否则 `[StartIndex, EndIndex)` 升序）逐点：
存 `saved = Index`；`Index = at`；`owner.Process(this, new SourceRange(document, at, at + 1), at)`；
重放后 `Index === at` → 抛 `SyntaxException`（`reload made no progress at index N`）；
`Index = Math.max(Index, saved)`。其它消息交 `HandleMessage`。

> **与契约的差异（第二处，已实测）**：契约写重放窗口用 `min(at + BufferSize, count)`。
> 但 `owner.Process` 会把窗口一直处理到 `buffer.End`，于是重放第一个点就把 `at+1 .. at+BufferSize`
> 也处理了一遍，外层的升序循环随后把游标压回 `at+1` 再处理一次——区间里每个位置被处理多遍
> （实测重放 `[2,5)` 会把 `2..9` 各处理三遍）。重放要复刻的是旧队列「一次一个位置」的语义，
> 因此窗口固定成 `[at, at + 1)`。跨格消费靠 token 自己推进 `context.Index`，与窗口大小无关。
> 工具：本地回归脚本（`tmp/driver-test.cjs`，`tmp/` 被 gitignore、未提交）里的用例 6 就是这个回归检查。

`ProcessRange(owner, buffer, index)` = `登记 CurrentDocument（buffer.Document 非 null 时）；Index = index; owner.Process(...); DrainMessages()`。
**没有任何内部代码再调用它**（旧 `ProcessSingle/ProcessAt` 的调用点都随 `SourceQueue` 消失），
它是给外部/工具用的入口。

## 5. ReloadMessage / Message

```ts
enum MessageTypes { None = 0 }

class Message {                          // ← 与契约的差异见下
  Target: Token | null = null;           // 原本是必填 Token
  ProcessOwner: Token | null = null;
  constructor(target?: Token | null);
  get Type(): MessageTypes;              // 抽象
}

class ReloadMessage extends Message {
  StartIndex: number;
  EndIndex: number = -1;                 // -1 = 单点
  constructor(processOwner: Token | null, startIndex: number, endIndex?: number);
  static WithoutProcessOwner(target: Token, index: number): ReloadMessage;
  static FromRange(target: Token, startIndex: number, endIndexExclusive: number): ReloadMessage;
  get Type(): MessageTypes;              // None
}
```

**与契约的差异（唯一一处）**：契约 §1.4 的 `ReloadMessage` 构造器 `(processOwner, startIndex, endIndex?)`
不带 `target`，而基类 `Message` 的构造器要求 `Target: Token`，`WithoutProcessOwner` / `FromRange`
又都收 `target`。落地方式：`Message.Target` 放宽成 `Token | null`、构造器参数改成可选，
`ReloadMessage` 构造器 `super(processOwner)`（把处理者同时当作 target），两个静态工厂构造后显式
`message.Target = target`。`Target` 全仓没有任何读取方，语义零影响；`Message` 本就是 T1 文件清单里
标注「如需」的文件。

## 6. SourceException

常量名全部保留，文本改成新语义；新增一个：

```ts
SourceException.SourceRangeContainsNull     // "SourceRange is not set: Start < 0 || End < 0"
SourceException.SourceRangeStartIsNull      // "SourceRange.Start < 0 (Start is not set)"
SourceException.SourceRangeStartIsSetted
SourceException.SourceRangeEndIsNull
SourceException.SourceRangeEndIsSetted
SourceException.SourceRangeIndexOutOfRange  // ← 新增：At 越界
```

---

## 7. 给 Wave1 成员的移植清单（逐条对照）

- **字符**：`source.Value` → `buffer.At(index)`。前探 `index + k` 必须先保证 `index + k < buffer.End`，
  否则 `buffer.At` 会抛；要跨窗口扫描就 `const whole = SourceRange.Whole(buffer.Document!); whole.At(i)`。
- **位置**：`source.Index` → `index`；`source.Pre()` → `index - 1`（`index > 0` 时，越界按旧语义返回 null/0）；
  `Source.EOF` / `index === -1` → `index === count` / `buffer.IsEof()`。
- **签入签出**：`SignIn(source)` → `SignIn(index)`；`SignOut(source)`（旧闭区间最后字符）→ `SignOut(index + 1)`；
  `SignOut(previous)`（旧「退到前一个字符」）→ `SignOut(index)`。所有「收尾签出」都要 +1。
- **读位置**：`End.Index` → `EndIndex`；`End.Index + 1`（下一个位置）→ `EndIndex`；
  `End.Index - Start.Index + 1` → `EndIndex - StartIndex`；`Pos = End.Index + 1` → `Pos = EndIndex`。
- **判范围**：`IsInRange(source)` → `IsInRange(index)`（半开）。
- **文档取值**：`document.At(i).Value` → `SourceRange.Whole(document).At(i)`（或调用处已有的 range）；
  `document.GetRaw(a, b)`（闭）→ `GetRaw(a, b + 1)`。
- **Append**：`x.AppendAndSignOut(source)` → `x.AppendAndSignOut(buffer.At(index), index)`；
  `AppendValueAndSignOut(value, source)` → `AppendValueAndSignOut(value, index)`。
- **Undo**：`Undo(source)` → `Undo(index)`；`IsUndo(source)` → `IsUndo(index)`。
- **Reload**：`ReloadMessage.WithoutProcessOwner(unit, source)` → `(unit, index)`；
  `ReloadMessage.FromRange(unit, start, end)` → `(unit, startIndex, endExclusive)`（旧闭区间终点要 +1）。
- **Process 签名**：`Process(context, source)` → `Process(context, buffer, index)`；
  `Default/ExitOrPre/IsAppend/Transit/Navigate/Consume/ForceExit` 全部同形。
- **`Document.At`、`Source`、`ProcessSource`、`SourceQueue`、`ProcessSingle/ProcessAt`、`LastSource`、
  `SourceRange.Start/End === null` 判定**：全部不存在/不再成立。用 `Start < 0` / `End < 0`。
- **`LastIndex`**：最近消费的字符下标；`Shape.TryToClose` 的兜底是 `LastIndex + 1`。
- **`SourceRange.Document`（T1b）**：不要再用「位置自带文档」，也不要在调用点手动赋值——
  `SyntaxContext.Process` 登记 `SourceRange.CurrentDocument`，token 的 `SignIn`/`SignOut`/
  `TrySignOut`/`BlockToken.SignOut` 自动补。`token.SourceRange.Document!` 在解析期间可以直接信任；
  只有**解析上下文之外**新造的裸 `SourceRange` 才是 `null`。
- **构建过渡期**：`xl_build` 只列自己的文件；`xl_check` 也列自己的文件。等 T3 删掉 basic-tokens 里
  对 `source.xl.md` 的 import 之后，全仓 `paths:[core,typescript]` 才会恢复 0 error。

---

## 8. T1 自测读数（commit 1f677bf4，feat/buffer-core）

- `xl_check`（本任务 13 个文件）：**0 error**；2 warning 都是本机 `dist/` 里已删源文件的孤儿产物
  `E2004`（新 clone / `xl orphans --prune` 之后为 0）。
- `xl_build`（本任务 13 个文件，显式文件清单）：13 written，0 error。
- `tsc -p tsconfig.json`：全仓 745 error，**本任务文件 0 error**；全部来自未适配的
  `basic-tokens`（162）、`typescript/**`（约 573）与 `templates/template.ts` 引用的旧 `Transit` 签名（10）。
  这些是 T3–T8 的移植面，按契约不应由 T1 修。
- 驱动层语义回归（用生成的 `build/ts` + 假文档跑，本地 `tmp/driver-test.cjs`，26 项全过）：
  - 窗口循环每字符恰好一次、`Index → count`、`Root.End = count`；
  - 跳转 `Done` 不推进 → 统一 `+1`；多字符消费（`Index = index + 2`）按 0,2,4 前进；
  - `ExitOrPre`/`Navigate` 的 `Reload` 原地阻塞并重放（`0,1,2,2,3,4,5`），不抢跑；
  - `FromRange` 区间升序重放且**不重复处理范围之后**的字符；
  - `IndependentToken` 不消费 → 抛 `SyntaxException`（文本含 `no progress`）；
  - Block/Guide 的“消费即推进”与阻塞；
  - `SourceRange`：`Whole/Of/At/Has/GetRaw/IsEof/FromRanges` 半开语义、`At` 越界抛 `SourceRangeIndexOutOfRange`；
  - EOF 空窗口交给根覆写；`SignOut(count)` 递归到最后一个子单元；`TryToClose` 的范围前置条件。

---

## 9. T1b：`SourceRange.Document` 兜底（branch `feat/buffer-core-doc`）

**缺口**：旧模型每个 `Source` 自带 `Document`；新模型 token 只拿 int，`Token.SourceRange.Document`
全仓无人赋值。T4/T8 的 `NextChar`、`LineTerminator.HasBetween`、`MemberBoundary.HasLineBreakBetween`
会因此静默退化为 `""` / `false`。

**修法**（core 统一，避免改 1000+ 调用点）：

1. `SourceRange` 新增 `static CurrentDocument: Document | null = null`。
2. `Token.SignIn(index)` 设 Start 前、`Token.SignOut(endIndex)` 与私有 `TrySignOut(endIndex)` 设 End 前、
   `BlockToken.SignOut(endIndex)` 设 End 前：`if (SourceRange.Document === null) { Document = SourceRange.CurrentDocument; }`。
   只覆盖 `null`，已有值不覆盖。
3. `SyntaxContext.Process(document)` 开头登记 `SourceRange.CurrentDocument = document`；
   `ProcessRange` 在 `buffer.Document !== null` 时同步登记。处理结束不清空（单线程顺序解析）。

**边界说明**：`UnitToken.Process` 的两段守卫（Quit 后交回父单元、有未消费消息先返回）由 **T3a**
在 `feat/buffer-basic` 提交，T1b **没有改** `unit-token.xl.md`。

**验证**（`feat/buffer-core-doc`，base = `feat/buffer-bootstrap`）：

- `xl_build`（`paths:[core,typescript]`）：**871 个文件全部就绪（32 written + 839 skipped），0 error**。
- `xl_check`（T1b 3 个文件）：0 error。
- `tsc`：本任务 core 文件 **0 error**（其余误差全是未移植完的 basic-tokens/typescript 面）。
- 驱动回归（`tmp/driver-test.cjs`，32 项，含 T1b 新增 12a–12f）全过；并在**打上 T3a 两段守卫的产物**上复跑同样全过：
  - `12b` 根单元 `SourceRange.Document` 是当前文档；
  - `12c` 解析期间 `SignIn` 的 token `range.Document` 是当前文档；
  - `12d` **只 `SignOut`** 的合成 token 也有文档（`BlockToken.SignOut` 兜底）；
  - `12e` 用 `range.Document.GetValue(range.EndIndex)` 能取到下一个字符（`NextChar` 场景）；
  - `12f` `ProcessRange` 也登记 `CurrentDocument`。
