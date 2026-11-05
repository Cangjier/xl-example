# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class ForHeadShape extends ShapeToken



## field Segment:int = 0

## field Mode:string = ""

## field Init:Token | null = null

## field Condition:Token | null = null

## field Incrementor:Token | null = null

## field Right:Token | null = null

## method DropTriviaBefore:(tokenIndex:int)=>int
```ts
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
