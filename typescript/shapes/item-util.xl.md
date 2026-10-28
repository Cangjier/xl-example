# dependencies
```xl
import { Token } from "../../core/syntax/token.xl.md"
```

# namespace cangjie

# class ItemUtil

## static method PreviousCode:(units:Array<Token>, fromIndex:int)=>int

```ts
let at = fromIndex;
while (at >= 0 && units[at].IsTriviaToken) {
  at--;
}
return at;
```

## static method PositionOf:(units:Array<Token>, index:int)=>int

```ts
// 形状的 pos 取「把它与前一个代码隔开的那个 trivia 的起点」；没有 trivia 就取它自己的起点。
const unit = units[index];
let at = index - 1;
while (at >= 0 && units[at].IsTriviaToken) {
  at--;
}
if (at < index - 1) {
  return units[at + 1].SourceRange.Start;
}
return unit.SourceRange.Start;
```
