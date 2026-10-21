# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { ExpressionStatementPossibleShape } from "../statements/expression-statement-possible-shape.xl.md"
import { TypeAliasDeclarationShape } from "./type-alias-declaration-shape.xl.md"
```

# namespace cangjie

# class TypeAliasDeclarationScan

判定状态。`Stage`：0 = 等 `[export|declare] type`，1 = 刚见过 `type`（下一格决定是不是别名），
2 = 别名正文（顶层 `;` 或行末 ASI 边界）；`Done` = 已见到收口点。

括号是整块单元（`Bracket` 把 `(…)` / `[…]` / `{…}` 收在 `Data` 里），所以顶层扫描不必数括号深度。

`type` 之后紧跟 `{` / `*` 的是 **export 声明**（`export type { T }` / `export type * from "m"`），不是别名，
Stage 1 直接 `Reject`，把位置留给 export 候选。

行末 ASI：`=` 之后已有类型单元、下一个非 trivia 单元在换行之后、又不是类型续接符时，
别名在**上一个代码单元**收口（`AsiEnd=true`，`DoneAt` 记边界 token 下标）：
`BuildByIndex` 只取到边界前一格，边界 token 原样留给下一条语句（`type T = A` ⏎ `["k"];` /
`type X = number` ⏎ `export type { X }` / `type T11 = A//c` ⏎ `[];`）。

## field Start:int = -1

## field Checked:int = 0

## field Stage:int = 0

## field Done:bool = false

## field DoneAt:int = -1

## field Rejected:bool = false

## field SeenEqual:bool = false

## field LastCode:int = -1

## field AsiEnd:bool = false

# class TypeAliasDeclarationPossibleShape extends PossibleShape

```txt
type T = number;
type T = A | B;
type T = A<B>;
declare type T = A;
export declare type T = A;
type T = A
["k"];
type X = number
export type { X }
```

条目可以带 `export` / `declare` 修饰（`[export] [declare] type …`，顺序与 TS 一致；`export type T = A` 也合法），
所以 Stage 0 先吞修饰词，见到 `type` 才进 Stage 1。扫描到顶层 `;` 时 `Accept`；
扫描到行末 ASI 边界时也在边界 token 上 `Accept`（build 时排除该 token：它属于下一条语句）。
`IsBuildable` 只在收口那一格为真——与 `ExpressionStatementPossibleShape` 同一套时机。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.constructor.name;
let state = cache.GetState<TypeAliasDeclarationScan>(name);
if (state === null) {
  state = new TypeAliasDeclarationScan();
  state.Start = ItemUtil.ItemStart(units);
  state.Checked = state.Start;
  cache.SetState(name, state);
}
if (state.Checked > tokenIndex + 1) {
  state.Start = ItemUtil.ItemStart(units);
  state.Checked = state.Start;
  state.Stage = 0;
  state.Done = false;
  state.DoneAt = -1;
  state.Rejected = false;
  state.SeenEqual = false;
  state.LastCode = -1;
  state.AsiEnd = false;
}
for (let at = state.Checked; at <= tokenIndex; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (state.Rejected || state.Done) {
    continue;
  }
  if (unit instanceof EndOfFileTokenShape) {
    // 文件到头了：这条声明不可能再补 `;`。候选退出，把边界收尾交给终结候选。
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 0) {
    if (unit instanceof Common && (unit as Common).Is("declare")) {
      continue;
    }
    if (unit instanceof Common && (unit as Common).Is("export")) {
      state.Stage = 3;
      continue;
    }
    if (unit instanceof Common && (unit as Common).Is("type")) {
      state.Stage = 1;
      continue;
    }
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 3) {
    if (unit instanceof Common && (unit as Common).Is("type")) {
      state.Stage = 1;
      continue;
    }
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 1) {
    if ((unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{")
      || (unit instanceof Symbol && (unit as Symbol).Is("*"))) {
      state.Rejected = true;
      continue;
    }
    state.Stage = 2;
    continue;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is(";")) {
    state.Done = true;
    if (state.DoneAt < 0) {
      state.DoneAt = at;
    }
    state.LastCode = at;
    continue;
  }
  if (state.SeenEqual && state.LastCode >= 0
    && TypeAliasDeclarationPossibleShape.HasLineBreakBetween(units, state.LastCode, at)
    && TypeAliasDeclarationPossibleShape.CanEndTypeAt(units[state.LastCode])
    && TypeAliasDeclarationPossibleShape.IsAsiBoundary(unit)) {
    state.Done = true;
    state.AsiEnd = true;
    if (state.DoneAt < 0) {
      state.DoneAt = at;
    }
    state.LastCode = at;
    continue;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is("=")) {
    state.SeenEqual = true;
  }
  state.LastCode = at;
}
state.Checked = tokenIndex + 1;
if (state.Rejected) {
  return ShapeStates.Reject;
}
if (state.Done) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## static method HasLineBreakBetween:(units:Array<Token>, from:int, to:int)=>bool

`from` 与 `to` 之间（不含两端）的 trivia 里有没有换行；行注释把换行吃进 trivia 也算（`HasLineBreak` 能认）。

```ts
for (let at = from + 1; at < to; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken && ExpressionStatementPossibleShape.HasLineBreak(unit)) {
    return true;
  }
}
return false;
```

## static method IsAsiBoundary:(unit:Token)=>bool

只在**明确的语句边界**上收口，避免把跨行还能续接的类型切断：
- `[` 开的新语句（TS 的 `parsePostfixTypeOrHigher` 只在同一行吃下标访问，换行后的 `[` 是新语句）；
- 常见语句首词（`export` / `import` / `declare` / `type` / `const` / `let` / `var` / `function` /
  `class` / `interface` / `enum` / `namespace` / `module` / `abstract` / `async` / `if` / `for` /
  `while` / `do` / `switch` / `try` / `return` / `throw` / `break` / `continue`）。

其它单元（运算符、`(`、`,`、标识符续行、`extends`/`infer`/`keyof` 等类型续接）一律**不收口**。

```ts
if (unit instanceof Bracket) {
  return (unit as Bracket).StartBracketChar === "[";
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  return text === "export" || text === "import" || text === "declare" || text === "type"
    || text === "const" || text === "let" || text === "var" || text === "function"
    || text === "class" || text === "interface" || text === "enum" || text === "namespace"
    || text === "module" || text === "abstract" || text === "async" || text === "if"
    || text === "for" || text === "while" || text === "do" || text === "switch"
    || text === "try" || text === "return" || text === "throw" || text === "break"
    || text === "continue";
}
return false;
```

## static method CanEndTypeAt:(unit:Token)=>bool

上一个代码单元能不能收住一个类型：普通标识符 / 字面量 / 括号单元都可以；
只有「还等着操作数」的运算符（`=`、`|`、`&`、`<`、`?`、`:`、`=>`、`.`、`,`）不行。

```ts
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  return !(text === "=" || text === "|" || text === "&" || text === "<"
    || text === "?" || text === ":" || text === "=>" || text === "." || text === ",");
}
return true;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const state = cache.GetState<TypeAliasDeclarationScan>(this.constructor.name);
return state !== null && state.Done && !state.Rejected && state.DoneAt === tokenIndex;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

行末 ASI 收口时 `tokenIndex` 是下一条语句的首 token：先把它排除，只把声明本体的单元切出来；
`host.Data.splice` 也少吞一格，边界 token 留在原处由下一条语句重新处理。

```ts
const state = catalog.PossibleShapesComputeCache.GetState<TypeAliasDeclarationScan>(this.constructor.name);
const start = state === null ? ItemUtil.ItemStart(host.Data) : state.Start;
let end = tokenIndex;
if (state !== null && state.AsiEnd) {
  end = tokenIndex - 1;
}
while (end >= start && host.Data[end].IsTriviaToken) {
  end--;
}
if (end < start) {
  return host;
}
const built = TypeAliasDeclarationShape.FromUnits(host, start, end, context);
host.Data.splice(start, end - start + 1, built);
built.Parent = host;
return built;
```
