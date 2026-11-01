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
const last = this.Last();
if (!(last instanceof Symbol)) {
  return true;
}
const text = last.TempToString();
return text !== "<" && text !== ">";
```

## method CanContinueSymbol:(context:SyntaxContext, prefix:string)=>bool

```ts
return prefix !== "<" && prefix !== ">";
```

## static method Finish:(node:ShapeToken, pos:int, start:int, end:int, children:Array<Token>)=>void

```ts
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
