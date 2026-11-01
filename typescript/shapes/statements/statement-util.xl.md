# dependencies
```xl
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class StatementUtil

## static method StartIndex:(units:Array<Token>)=>int

```ts
let start = 0;
for (let at = 0; at < units.length; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (!unit.IsBasicToken) {
    start = at + 1;
    continue;
  }
  break;
}
while (start < units.length && units[start].IsTriviaToken) {
  start++;
}
return start;
```

## static method NextCode:(units:Array<Token>, from:int)=>int

```ts
let at = from;
while (at < units.length && units[at].IsTriviaToken) {
  at++;
}
return at < units.length ? at : -1;
```
