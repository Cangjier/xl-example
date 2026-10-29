# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class ForHeadShape extends ShapeToken

`for ( … )` 括号里的头部。它只是解析期的临时容器：`)` 收口时按 Mode 拆成
ForStatement / ForOfStatement / ForInStatement，绝不进最终 AST。

- Mode 为空：经典 `for (;;)`（当前只接空子句）；
- Mode `of` / `in`：`for (<target> of <expr>)` / `for (<target> in <expr>)`。

## field Segment:int = 0

## field Mode:string = ""

## field Init:Token | null = null

## field Condition:Token | null = null

## field Incrementor:Token | null = null

## field Right:Token | null = null

## method DropTriviaBefore:(tokenIndex:int)=>int
```ts
// 吃掉分隔记号（`(` / `of` / `in` / `;`）的同时，把它左边那串 trivia 一起丢掉：
// 它们属于这个记号，不属于后面的节点。否则 PositionOf 会把「上一个代码之后的第一段 trivia」
// 当成下一个节点的 pos（`for (v of xs)` 的 xs 会错拿 `of` 前的空格）。
let at = tokenIndex - 1;
while (at >= 0 && this.Data[at].IsTriviaToken) {
  at--;
}
const start = at + 1;
this.Data.splice(start, tokenIndex - start);
return start;
```

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
for (const item of this.Data) {
  if (!item.Closed) {
    item.TryToClose(context);
  }
}
this.Data = this.Data.filter((item) => !item.IsTriviaToken && !item.IsBasicToken);
this.Closed = true;
return CloseStates.Nothing;
```

## static method IsWordAhead:(from:int, word:string)=>bool

```ts
// ComputeByIndex 拿不到 SyntaxContext，但当前文档在 SourceRange 上有全局指针；
// 这里按文档前瞻一个上下文关键字（`of` / `in`），用来区分 `for (v of xs)` 与经典 `for (i = 0; …)`。
const document = SourceRange.CurrentDocument;
if (document === null) {
  return false;
}
const length = word.length;
const count = document.GetCount();
let at = from;
while (at < count) {
  const ch = document.GetValue(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f") {
    at++;
    continue;
  }
  break;
}
if (at + length > count) {
  return false;
}
if (document.GetRaw(at, at + length) !== word) {
  return false;
}
if (at + length >= count) {
  return true;
}
return !/[$_\p{ID_Continue}]/u.test(document.GetValue(at + length));
```
