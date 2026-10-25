# dependencies
```xl
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { StatementScanner } from "../statements/statement-scanner.xl.md"
import { VariableDeclarationUtil } from "./variable-declaration-scan-util.xl.md"
```

# namespace cangjie

# class VariableListVerdict

## field State:int = 0

## field Declarations:int = 0

## field KeywordText:string = ""

## field Semicolon:bool = false

# class VariableDeclarationListUtil

## static method Judge:(units:Array<Token>)=>VariableListVerdict

```ts
const verdict = new VariableListVerdict();
let headAt = -1;
for (let at = 0; at < units.length; at++) {
  if (!units[at].IsTriviaToken) {
    headAt = at;
    break;
  }
}
if (headAt < 0) {
  verdict.State = 0;
  return verdict;
}
const head = units[headAt];
if (!(head instanceof Common)) {
  verdict.State = 2;
  return verdict;
}
const headText = (head as Common).TempToString();
if (headText !== "let" && headText !== "const" && headText !== "var") {
  verdict.State = 2;
  return verdict;
}
verdict.KeywordText = headText;
let bindingAt = -1;
for (let at = headAt + 1; at < units.length; at++) {
  if (!units[at].IsTriviaToken) {
    bindingAt = at;
    break;
  }
}
if (bindingAt < 0) {
  verdict.State = 0;
  return verdict;
}
if (!StatementScanner.StartsBinding(units, bindingAt)) {
  verdict.State = 2;
  return verdict;
}
let lastAt = -1;
for (let at = units.length - 1; at >= 0; at--) {
  if (!units[at].IsTriviaToken) {
    lastAt = at;
    break;
  }
}
if (lastAt < bindingAt) {
  verdict.State = 0;
  return verdict;
}
if (units[lastAt] instanceof Symbol && (units[lastAt] as Symbol).TempToString() === ";") {
  verdict.Semicolon = true;
}
const declarations = VariableDeclarationUtil.VerifyItems(units.slice(bindingAt));
if (declarations < 0) {
  verdict.State = 2;
  return verdict;
}
verdict.State = 1;
verdict.Declarations = declarations;
return verdict;
```
