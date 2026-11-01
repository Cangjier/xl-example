# dependencies
```xl
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class TypeBalanceUtil

## static method IsBalanced:(units:Array<Token>, limit:int)=>bool

```ts
let braces = 0;
let parens = 0;
let brackets = 0;
let angles = 0;
for (let at = 0; at < limit; at++) {
  const unit = units[at];
  if (!(unit instanceof Symbol)) {
    continue;
  }
  const text = unit.TempToString();
  if (text === "{") {
    braces++;
  } else if (text === "}") {
    braces--;
  } else if (text === "(") {
    parens++;
  } else if (text === ")") {
    parens--;
  } else if (text === "[") {
    brackets++;
  } else if (text === "]") {
    brackets--;
  } else if (text === "<") {
    angles++;
  } else if (text === ">") {
    angles--;
  } else if (text === ">>") {
    angles -= 2;
  } else if (text === ">>>") {
    angles -= 3;
  }
  if (braces < 0 || parens < 0 || brackets < 0 || angles < 0) {
    return false;
  }
}
return braces === 0 && parens === 0 && brackets === 0 && angles === 0;
```
