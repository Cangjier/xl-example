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

三层 possible 的**列表级**判定结果。`State` 三态：`0` 还不知道（不接管）、`1` 成立（可接管）、
`2` 不是变量声明列表（永久放弃，走 legacy）。

## field State:int = 0

## field Declarations:int = 0

成立的条目数（由声明级给出，列表级不自己数第二条规则）。

## field KeywordText:string = ""

`let` / `const` / `var`。

## field Semicolon:bool = false

是否见到 `;` 收口；`false` 表示按段末（ASI / 文件末尾）收口。

# class VariableDeclarationListUtil

列表级只做三件事，全部**只判不建**（不碰 `CatalogGuide`、不碰 `StatementBuilder`、不写 `Parent`）：

1. 关键字白名单：只认 `let` / `const` / `var`（`using` / `await using` / `declare` / `export` / `for (let …)` 仍走 legacy）；
2. 族判型：`StatementScanner.StartsBinding` 回答「`let` 后面能不能起绑定」，与表达式候选 / 终结候选读同一份判据；
3. 收口：最后一个代码单元要么是 `;`，要么整条列表正好落在段末（ASI）。

条目怎么切、每条成不成立属于声明级（`VariableDeclarationUtil.VerifyItems`），这里只消费它的条数。

## static method Judge:(units:Array<Token>)=>VariableListVerdict

对「本条语句的整段 raw 单元」给出三态判定。纯函数、无缓存、零副作用：入参就是
`StatementShape.BuildFromShell` 里那份 `consumed`，判完原样交回去。

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
