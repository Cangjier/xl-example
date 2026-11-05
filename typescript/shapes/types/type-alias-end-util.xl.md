# dependencies
```xl
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { TypeConditionalScan } from "./type-conditional-scan-util.xl.md"
import { TypeBalanceUtil } from "./type-balance-util.xl.md"
```


# namespace cangjie

# class TypeAliasEndUtil

## static method IsStatementStart:(unit:Common)=>bool

```ts
const text = unit.TempToString();
switch (text) {
  case "let":
  case "const":
  case "var":
  case "function":
  case "class":
  case "interface":
  case "type":
  case "enum":
  case "namespace":
  case "module":
  case "declare":
  case "import":
  case "export":
  case "if":
  case "for":
  case "while":
  case "do":
  case "switch":
  case "try":
  case "return":
  case "throw":
  case "break":
  case "continue":
  case "debugger":
  case "with":
  case "async":
  case "abstract":
    return true;
  default:
    return false;
}
```


## static method HasLineTerminator:(units:Array<Token>, prevIndex:int, tokenIndex:int)=>bool

```ts
for (let at = prevIndex + 1; at < tokenIndex; at++) {
  const item = units[at];
  if (!item.IsTriviaToken) {
    continue;
  }
  const text = item.AstText();
  if (text.indexOf("\n") >= 0 || text.indexOf("\r") >= 0 || text.indexOf("\u2028") >= 0 || text.indexOf("\u2029") >= 0) {
    return true;
  }
}
return false;
```


## static method IsEndToken:(units:Array<Token>, tokenIndex:int, stage:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
const start = TypeConditionalScan.RunStart(units);
if (!TypeConditionalScan.Balanced(units, start, tokenIndex)) {
  return false;
}
if (stage === 0) {
  return unit instanceof Symbol && unit.Closed && unit.Is("?");
}
if (stage === 1) {
  if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is(":")) {
    return false;
  }
  let questions = 0;
  let colons = 0;
  for (let at = start; at < tokenIndex; at++) {
    const item = units[at];
    if (!(item instanceof Symbol) || !item.Closed) {
      continue;
    }
    if (item.Is("?")) {
      questions++;
    } else if (item.Is(":")) {
      colons++;
    }
  }
  return questions <= colons;
}
if (unit instanceof Symbol && unit.Closed && unit.Is(";")) {
  return true;
}
if (unit instanceof Common && unit.Closed && TypeAliasEndUtil.IsStatementStart(unit)) {
  const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
  return previous >= 0 && TypeAliasEndUtil.HasLineTerminator(units, previous, tokenIndex);
}
return false;
```


## static method IsAliasEnd:(units:Array<Token>, tokenIndex:int)=>bool

```ts
const unit = units[tokenIndex];
if (unit instanceof Symbol && unit.Closed && unit.Is(";")) {
  return TypeBalanceUtil.IsBalanced(units, tokenIndex);
}
if (unit instanceof Common && unit.Closed && TypeAliasEndUtil.IsStatementStart(unit)) {
  if (!TypeBalanceUtil.IsBalanced(units, tokenIndex)) {
    return false;
  }
  const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
  return previous >= 0 && TypeAliasEndUtil.HasLineTerminator(units, previous, tokenIndex);
}
return false;
```
