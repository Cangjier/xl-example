# dependencies
```xl
import { Common } from "../basic-tokens/common.xl.md"
import { RegexToken } from "../basic-tokens/regex-token.xl.md"
import { String } from "../basic-tokens/string/string.xl.md"
import { Symbol } from "../basic-tokens/symbol.xl.md"
import { Token } from "../token.xl.md"
```

# namespace cangjie

# class RegexTemplate

## field Flags:Array<string> = ["g", "i", "m", "s", "u", "y"]

## field ExpressionKeywords:Array<string> = []

## method IsFlag:(value:string)=>bool

```ts
return this.Flags.includes(value);
```

## method IsOperandEnd:(unit:Token | null)=>bool

```ts
if (unit === null) {
  return false;
}
if (unit instanceof String || unit instanceof RegexToken || (unit instanceof Symbol && unit.IsCloseBracket())) {
  return true;
}
if (unit instanceof Common) {
  return !this.ExpressionKeywords.includes((unit as Common).TempToString());
}
return false;
```

## method CanStart:(lastCode:Token | null, previousCode:Token | null)=>bool

```ts
if (lastCode === null) {
  return true;
}
if (!lastCode.IsBasicToken) {
  return true;
}
if (lastCode instanceof String || lastCode instanceof RegexToken) {
  return false;
}
if (lastCode instanceof Symbol && lastCode.IsCloseBracket()) {
  return false;
}
if (lastCode instanceof Common) {
  return this.ExpressionKeywords.includes((lastCode as Common).TempToString());
}
if (lastCode instanceof Symbol) {
  const text = (lastCode as Symbol).TempToString();
  if (text === "!" || text === "++" || text === "--") {
    return !this.IsOperandEnd(previousCode);
  }
  return true;
}
return false;
```

## method CanStartAt:(units:Array<Token>, index:int)=>bool

```ts
let at = index - 1;
while (at >= 0 && units[at].IsTriviaToken) {
  at--;
}
if (at >= 0 && units[at] instanceof Symbol && (units[at] as Symbol).Is("/")) {
  at--;
}
while (at >= 0 && units[at].IsTriviaToken) {
  at--;
}
const lastCode:Token | null = at >= 0 ? units[at] : null;
at--;
while (at >= 0 && units[at].IsTriviaToken) {
  at--;
}
const previousCode:Token | null = at >= 0 ? units[at] : null;
return this.CanStart(lastCode, previousCode);
```
