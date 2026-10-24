# dependencies
```xl
import { BasicTokenBatch } from "./basic-token-batch.xl.md"
import { Token } from "../token.xl.md"
```

# namespace cangjie

软边界策略：哪些 token 关闭后值得立刻把批次交给宿主。硬边界（窗口结束、`Reload` 前、
`Quit` 前、`MountedUnit` 变化前、文件末尾）由驱动强制 flush，不在这里判。

**这是每 token 都会走一次的热路径**（`UnitToken.OnBasicTokenClosed`），所以判定顺序按代价从低到高：
`Sealed`（一个布尔）→ `MaxTokens`（`To - From`）→ `AtEof`（宿主已算好的布尔）→ 只有确实要读文本时才
`Recompute` 一次（增量，O(新增单元)）并读**1 个字符**。没开任何文本判据的策略一次文本都不读；
trivia（空白 / 注释）连字符都不读。

# class BatchPolicy

## field FlushOnSemicolon:bool = false

遇到 `;` 关闭就 flush。

## field FlushOnComma:bool = false

遇到 `,` 关闭就 flush。

## field FlushOnBracketClose:bool = false

遇到闭括号 `)` `]` `}` 关闭就 flush（按**首字符**判）。

## field FlushOnBracketOpen:bool = false

遇到开括号 `(` `[` `{` 关闭就 flush（按**首字符**判；括号单元的首字符就是它自己那个括号）。

## field FlushOnLineBreak:bool = false

批内出现换行就 flush（按批元信息 `HasLineBreak` 判，读的是批而不是 token 文本）。

## field FlushOnBraceClose:bool = false

遇到**以 `}` 收尾的多字符单元**就 flush。`{` / `}` 在语法层是括号单元而不是单个符号，所以「以 `}` 收尾」
只有一种含义：一个块体 / 对象字面量刚刚闭合。语句族用它把「没有 `;` 的语句」（`if (…) { … }`、嵌套块）
在上层块关掉之前就建出来，而在 `()` `[]` 上不多花一次 flush。

与 `FlushOnBracketClose` 的区别：那条按首字符判，会连带 `(` / `)` / `[` / `]`；这条只看最后一个字符，
且只认大括号。单字符单元直接跳过（`}` 不可能是单字符单元），所以常见的 `x` `;` `,` 都只付一次读取。

## field FlushOnKeyword:bool = false

遇到关键字就 flush。**本层不判**：关键字表属于语言侧（`core` 里不出现语言关键字），
要判这条的调用方应在自己的适配器里覆写 `ShouldFlush`；留这个字段是为了让策略配置自解释。

## field FlushOnEof:bool = true

到达文件末尾就 flush（判 `batch.AtEof`，宿主在每次关闭时已经更新，不额外读文档）。

## field MaxTokens:int = 64

批内单元数上限（`<= 0` 表示不限）。这是**最便宜的**一条：只比 `To - From`，不读任何文本。

## field MaxChars:int = 512

批内代码字符数上限（`<= 0` 表示不限）。按批的代码区间长度算（`LastEnd - FirstStart`），
读的是元信息而不是把整批文本切出来比。

## method ShouldFlush:(host:Token, batch:BasicTokenBatch, token:Token)=>bool

软边界判定：**先比数字，再看要不要读文本**。

`batch` 是当前活动批次；调用点保证 `batch.To` 已经算上刚关闭的这个 token（`AtEof` 也已更新），
但元信息（`FirstStart` / `LastEnd` / `HasLineBreak`）可能是**上一批**算到的——所以只在真要用它时
才 `Recompute`（增量，见 `BasicTokenBatch.Recompute`）。

```ts
if (batch.Sealed) {
  return true;
}
if (this.MaxTokens > 0 && batch.Count() >= this.MaxTokens) {
  return true;
}
if (this.FlushOnEof && batch.AtEof) {
  return true;
}
if (this.MaxChars > 0) {
  batch.Recompute();
  if (batch.HasCode && batch.LastEnd - batch.FirstStart >= this.MaxChars) {
    return true;
  }
}
if (!this.FlushOnSemicolon && !this.FlushOnComma && !this.FlushOnBracketClose && !this.FlushOnBracketOpen && !this.FlushOnBraceClose && !this.FlushOnLineBreak) {
  return false;
}
if (!token.Closed) {
  return false;
}
if (this.FlushOnLineBreak) {
  batch.Recompute();
  if (batch.HasLineBreak) {
    return true;
  }
}
// trivia（空白 / 注释）不可能是任何一条字符软边界，跳过它们省掉一半的 1 字符读取。
// `FlushOnLineBreak` 已经在上面按批元信息判过，所以这不是漏判。
if (token.IsTriviaToken) {
  return false;
}
// 单字符单元不可能是「以 `}` 收尾的括号」：`{ }` 在语法层是括号单元，至少 `{}` 两个字符。
if (this.FlushOnBraceClose && token.SourceRange.End - token.SourceRange.Start > 1 && this.LastCharOf(token) === "}") {
  return true;
}
const first = this.FirstCharOf(token);
if (this.FlushOnSemicolon && first === ";") {
  return true;
}
if (this.FlushOnComma && first === ",") {
  return true;
}
if (this.FlushOnBracketClose && (first === ")" || first === "]" || first === "}")) {
  return true;
}
if (this.FlushOnBracketOpen && (first === "(" || first === "[" || first === "{")) {
  return true;
}
return false;
```

> `ShouldFlush` 的 `host` 当前不参与判定（批次自己带着 `Host` / `AtEof` / 元信息）；保留这个参数是为了让
> 语言侧覆写时能拿到「批是谁的」——`IBatchHost.BatchPolicy` 是契约的一部分，签名不随实现漂移。

## private method FirstCharOf:(token:Token)=>string

token 首字符。**只切 1 个字符**：策略每 token 走一次，切整段 token 文本（`BasicKind.TextOf`）会把
一个 `(` 或 `;` 也变成一次整段分配。

```ts
const document = token.SourceRange.Document;
if (document === null) {
  return "";
}
const start = token.SourceRange.Start;
if (start < 0 || start >= token.SourceRange.End) {
  return "";
}
return document.GetRaw(start, start + 1);
```

## private method LastCharOf:(token:Token)=>string

token 末字符（口径同 `FirstCharOf`：只切 1 个字符）。判「这个单元是不是以 `}` 收尾」用。

```ts
const document = token.SourceRange.Document;
if (document === null) {
  return "";
}
const end = token.SourceRange.End;
if (end <= 0 || end <= token.SourceRange.Start) {
  return "";
}
return document.GetRaw(end - 1, end);
```
