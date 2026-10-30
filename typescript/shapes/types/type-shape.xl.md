# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class TypeShape extends ShapeToken

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
for (const item of this.Data) {
  if (!item.Closed) {
    item.TryToClose(context);
  }
}
this.Data = this.Data.filter((item) => !item.IsTriviaToken && !item.IsBasicToken);
const last = this.Last();
if (last !== null && last.SourceRange.End >= 0) {
  this.SourceRange.End = last.SourceRange.End;
}
this.Closed = true;
return CloseStates.Nothing;
```

## method CanCombine:(context:SyntaxContext, value:string)=>bool

```ts
// 类型里的 `<` / `>` 永远是分界符，一个字符都不多：
// `type A<T>= X` 的 `>=`、`Array<Array<T>>` 的 `>>` 都必须在词法层分开，
// 否则类型文法拿到的是一个已经定型的 token，只能回头去改它的文本。
// 前提由调用方保证：最后一个子单元就是那个还没关闭的符号。
const last = this.Last();
if (!(last instanceof Symbol)) {
  return true;
}
const text = last.TempToString();
return text !== "<" && text !== ">";
```

## static method Finish:(node:ShapeToken, pos:int, start:int, end:int, children:Array<Token>)=>void

```ts
// 类型节点在“类型表达式解析”这一步一次性成形：Pos 取 full start（含前导 trivia），
// SignIn/SignOut 取源码范围，children 按 TS 的 forEachChild 顺序挂上。
node.Pos = pos;
node.SignIn(start);
for (const child of children) {
  node.Add(child);
}
node.SignOut(end);
node.Closed = true;
```

## static method PosOfNode:(node:Token)=>int

```ts
if (node instanceof ShapeToken) {
  return node.Pos;
}
return node.SourceRange.Start >= 0 ? node.SourceRange.Start : 0;
```
