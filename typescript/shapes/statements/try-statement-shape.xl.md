# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class TryStatementShape extends ShapeToken

`try { … } catch (e) { … } finally { … }`：三段各自是普通 Block，按源码顺序挂在 children 下。
catch 子句是独立节点（CatchClause），finally 的块直接是 TryStatement 的 child。

## field TryBlock:Token | null = null

## field CatchClause:Token | null = null

## field Finalizer:Token | null = null

## static method Finish:(statement:Token, context:SyntaxContext)=>void

```ts
statement.TryToClose(context);
statement.Quit();
```

## method DropTriviaBefore:(tokenIndex:int)=>int

```ts
// 吃掉 `finally` 关键字的同时，把它左边那串 trivia 一起丢掉：它属于关键字，不属于后面的块。
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
if (this.SourceRange.End < 0) {
  for (let at = this.Data.length - 1; at >= 0; at--) {
    const unit = this.Data[at];
    if (unit.IsTriviaToken || unit.IsBasicToken) {
      continue;
    }
    if (unit.SourceRange.End >= 0) {
      this.SourceRange.End = unit.SourceRange.End;
    }
    break;
  }
}
this.Data = this.Data.filter((item) => !item.IsTriviaToken && !item.IsBasicToken);
this.Closed = true;
return CloseStates.Nothing;
```
