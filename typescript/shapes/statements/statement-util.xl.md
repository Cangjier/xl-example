# dependencies
```xl
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class StatementUtil

## static method StartIndex:(units:Array<Token>)=>int

```ts
// 已经建好的语句形状是 source 的「已归档前缀」；它们之后的第一个代码单元才是当前语句的起点。
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
