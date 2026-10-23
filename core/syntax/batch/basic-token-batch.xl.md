# dependencies
```xl
import { Document } from "../document.xl.md"
import { Token } from "../token.xl.md"
```

# namespace cangjie

批次层：一批已关闭 basic token 在宿主 `Data` 上的**零拷贝视图**，半开区间 `[From, To)`。

宿主只记录起止下标与几个一次算出的元信息，不复制 token；item 引擎按这段区间增量消费。
批可以切在 item、装饰器、case 中间，结果必须与逐 token 处理相同（INV-6 批次无关性）。

# class BasicTokenBatch

## field Host:Token | null = null

宿主（`Data` 的所有者）。批次只是它的视图，不持有任何 token。

## field From:int = -1

批首在 `Host.Data` 的下标（含）。`-1` 表示当前没有活动批次。

## field To:int = -1

批尾（不含）。封批时等于 `Host.Data.length`。

## field Cursor:int = -1

已消费到的宿主下标（半开，G1/G2）：引擎在 `Feed` 里维护，宿主**只读**。
`Done` 时若 `Cursor < To`，宿主保留未消费尾巴（`From = Cursor`）；否则清批。
`NeedMore` 时宿主保留批次，下一批从 `Cursor` 续喂（不得回退到 `From`，否则同一 unit 被重复追加）。

## field AtEof:bool = false

创建本批时文档是否已到末尾（替代旧的 `StatementScanner.AtEOF` 静态字段）。

## field FirstStart:int = -1

批内第一个非 trivia 单元的 `SourceRange.Start`。

## field LastEnd:int = -1

批内最后一个非 trivia 单元的 `SourceRange.End`。

## field HasCode:bool = false

批内是否至少有一个非 trivia 单元。

## field HasLineBreak:bool = false

批内代码区间是否含有换行（由本类的元信息一次算出，item 引擎不再逐字符扫）。

## field Sealed:bool = false

本批是否已经封闭（封闭后不再追加 token）。

## private field CodeIndex:Array<int> = []

惰性下标表：`CodeIndex[i]` 是第 `i` 个非 trivia 单元的 `Host.Data` 下标。`Recompute` 时清空、`EnsureCode` 时建一次。

## method Count:()=>int

批内单元数（含 trivia）。

```ts
if (this.To <= this.From) {
  return 0;
}
return this.To - this.From;
```

## method IsEmpty:()=>bool

批内是否没有单元。

```ts
return this.To <= this.From;
```

## method CodeCount:()=>int

批内非 trivia 单元数。

```ts
this.EnsureCode();
return this.CodeIndex.length;
```

## method CodeAt:(index:int)=>Token

第 `index` 个非 trivia 单元。越界是调用方的缺陷，直接抛。

```ts
this.EnsureCode();
const at = this.CodeIndex[index];
const host = this.Host;
if (host === null || at === undefined) {
  throw new Error(`BasicTokenBatch: 代码单元下标越界（index ${index}，共 ${this.CodeIndex.length} 个）`);
}
return host.Data[at];
```

## method Text:()=>string

批内代码区间的原始文本 `[FirstStart, LastEnd)`。

```ts
const document = this.GetDocument();
if (document === null || this.FirstStart < 0 || this.LastEnd < this.FirstStart) {
  return "";
}
return document.GetRaw(this.FirstStart, this.LastEnd);
```

## method HasMoreChars:(after:int)=>bool

`after` 之后还有没有字符——用来区分「本窗口末尾」与「文件末尾」。

```ts
const document = this.GetDocument();
if (document === null) {
  return false;
}
return after + 1 < document.GetCount();
```

## method Reset:(host:Token, from:int, atEof:bool)=>void

以宿主、批首下标与 EOF 标记重置本视图，并重算元信息。

```ts
this.Host = host;
this.From = from;
this.To = host.Data.length;
this.AtEof = atEof;
this.Cursor = from;
this.Sealed = false;
this.Recompute();
```

## method Recompute:()=>void

重算 `FirstStart / LastEnd / HasCode / HasLineBreak` 与惰性下标表。`To` 变化后调用。

```ts
this.CodeIndex = [];
this.FirstStart = -1;
this.LastEnd = -1;
this.HasCode = false;
this.HasLineBreak = false;
const host = this.Host;
if (host === null) {
  return;
}
for (let i = this.From; i < this.To; i++) {
  const unit = host.Data[i];
  if (unit === undefined) {
    continue;
  }
  if (unit.IsTriviaToken) {
    continue;
  }
  this.HasCode = true;
  if (this.FirstStart < 0) {
    this.FirstStart = unit.SourceRange.Start;
  }
  this.LastEnd = unit.SourceRange.End;
}
const document = this.GetDocument();
if (document !== null && this.FirstStart >= 0 && this.LastEnd > this.FirstStart) {
  this.HasLineBreak = document.GetRaw(this.FirstStart, this.LastEnd).indexOf("\n") >= 0;
}
```

## private method EnsureCode:()=>void

惰性建造 `CodeIndex`：只扫一次 `[From, To)`，并且只在 `HasCode` 为真时扫。

```ts
if (!this.HasCode || this.CodeIndex.length > 0) {
  return;
}
const host = this.Host;
if (host === null) {
  return;
}
for (let i = this.From; i < this.To; i++) {
  const unit = host.Data[i];
  if (unit === undefined) {
    continue;
  }
  if (!unit.IsTriviaToken) {
    this.CodeIndex.push(i);
  }
}
```

## private method GetDocument:()=>Document | null

批内单元所在文档；宿主没有范围文档时返回 `null`。

```ts
const host = this.Host;
if (host === null) {
  return null;
}
return host.SourceRange.Document;
```
