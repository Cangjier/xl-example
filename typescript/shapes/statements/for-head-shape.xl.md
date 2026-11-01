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

## static method IsWordAhead:(from:int, word:string)=>bool

```ts
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
