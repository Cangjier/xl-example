# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { ExpressionStatementPossibleShape } from "../statements/expression-statement-possible-shape.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { EnumDeclarationShape } from "./enum-declaration-shape.xl.md"
```

# namespace cangjie

# class EnumDeclarationScan

判定状态。`Stage`：0 = 等 `declare` / `enum`，1 = 等 `enum`，2 = 等名字，3 = 等枚举体，
4 = 已经完整（见到枚举体）；`DoneAt` 记枚举体那一格。

## field Start:int = -1

## field Checked:int = 0

## field Stage:int = 0

## field Done:bool = false

## field DoneAt:int = -1

## field Rejected:bool = false

## field PendingModifier:bool = false

# class EnumDeclarationPossibleShape extends PossibleShape

```txt
enum E {}
enum E { A }
enum E { A = 1, B = 2 }
declare enum E { A }
```

与 ClassDeclarationPossibleShape 同构，但枚举体**可以非空**：成员由 `EnumDeclarationShape.FromUnits` 逐个建。
第一个代码单元 `enum`（或 `declare` + `enum`），最后一块是枚举体 `{…}` 的 `Bracket`。

## private static method HasLineBreakBefore:(units:Array<Token>, at:int)=>bool

`at` 这个代码单元与它前面第一个代码单元之间有没有换行（中间的 trivia 逐格看，块注释里的换行也算）。
`declare` 与 `enum` 之间换行时 TS 的 ASI 把 `declare` 收成独立的 ExpressionStatement、枚举声明
不带 DeclareKeyword，本候选必须退出（与 `class-declaration-possible-shape.xl.md` 的同款守卫一致）。

```ts
for (let index = at - 1; index >= 0; index--) {
  const unit = units[index];
  if (!unit.IsTriviaToken) {
    return false;
  }
  if (ExpressionStatementPossibleShape.HasLineBreak(unit)) {
    return true;
  }
}
return false;
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.constructor.name;
let state = cache.GetState<EnumDeclarationScan>(name);
if (state === null) {
  state = new EnumDeclarationScan();
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
  state.PendingModifier = false;
}
for (let at = state.Checked; at <= tokenIndex; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof EndOfFileTokenShape) {
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 0) {
    if (unit instanceof Common) {
      const text = (unit as Common).TempToString();
      if (text === "declare") {
        // 修饰词先挂起：`declare` 与 `enum` 之间换行时 TS 按 ASI 把 declare 收成独立
        // ExpressionStatement（枚举声明不带 DeclareKeyword），换行与否要等 `enum` 那一格才能判。
        state.PendingModifier = true;
        continue;
      }
      if (text === "const") {
        // `const enum E {…}`: the statement candidate yields on `const` + `enum` (raw lookahead),
        // so this candidate is the only one left for that form.
        // `declare` ⏎ `const enum` 同 `declare` ⏎ `enum`：ASI 把 declare 拆成独立的
        // ExpressionStatement，`const enum` 声明不带 DeclareKeyword（与上面 enum 分支同一判据）。
        if (state.PendingModifier && EnumDeclarationPossibleShape.HasLineBreakBefore(units, at)) {
          state.Rejected = true;
          continue;
        }
        state.Stage = 5;
        continue;
      }
      if (text === "enum") {
        // `declare` ⏎ `enum`：ASI 拆成两条语句，本候选退出，`declare` 交给表达式语句候选收口。
        if (state.PendingModifier && EnumDeclarationPossibleShape.HasLineBreakBefore(units, at)) {
          state.Rejected = true;
          continue;
        }
        state.Stage = 2;
        continue;
      }
    }
    if (unit instanceof Symbol && (unit as Symbol).Is("@")) {
      // 装饰器前缀（`@dec enum E { A }`）：TS 的 Decorator 是 EnumDeclaration children 的第一项。
      state.Stage = 6;
      continue;
    }
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 6) {
    // 装饰器前缀（只读扫描）：@dec / @ns.dec / @dec(…)。看到本族关键字才推进，
    // 看到其它声明族的关键字就退出（避免与 class / interface / function 候选共存）。
    if (unit instanceof Common) {
      const text = (unit as Common).TempToString();
      if (text === "enum") {
        state.Stage = 2;
        continue;
      }
      if (text === "declare") {
        state.Stage = 1;
        continue;
      }
      if (text === "const") {
        state.Stage = 5;
        continue;
      }
      let previous = at - 1;
      while (previous >= 0 && units[previous].IsTriviaToken) {
        previous--;
      }
      let afterDot = false;
      if (previous >= 0 && units[previous] instanceof Symbol) {
        const previousText = (units[previous] as Symbol).TempToString();
        afterDot = previousText === "." || previousText === "?.";
      }
      if (!afterDot && (text === "class" || text === "interface" || text === "type"
        || text === "namespace" || text === "module" || text === "function"
        || text === "let" || text === "var" || text === "global")) {
        state.Rejected = true;
        continue;
      }
      continue;
    }
    if (unit instanceof Symbol || unit instanceof Bracket || unit instanceof String) {
      continue;
    }
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 1) {
    if (unit instanceof Common) {
      const text = (unit as Common).TempToString();
      if (text === "const") {
        // `declare const enum E {…}`.
        state.Stage = 5;
        continue;
      }
      if (text === "enum") {
        state.Stage = 2;
        continue;
      }
    }
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 5) {
    // `const` / `declare const` must be followed by `enum`.
    if (unit instanceof Common && (unit as Common).Is("enum")) {
      state.Stage = 2;
      continue;
    }
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 2) {
    if (unit instanceof Common) {
      state.Stage = 3;
      continue;
    }
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 3) {
    if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{") {
      state.Stage = 4;
      state.Done = true;
      state.DoneAt = at;
      continue;
    }
    state.Rejected = true;
    continue;
  }
  state.Rejected = true;
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

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const state = cache.GetState<EnumDeclarationScan>(this.constructor.name);
return state !== null && state.Done && !state.Rejected && state.DoneAt === tokenIndex;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const state = catalog.PossibleShapesComputeCache.GetState<EnumDeclarationScan>(this.constructor.name);
const start = state === null ? ItemUtil.ItemStart(host.Data) : state.Start;
if (start > tokenIndex) {
  return host;
}
const built = EnumDeclarationShape.FromUnits(host, start, tokenIndex, context);
host.Data.splice(start, tokenIndex - start + 1, built);
built.Parent = host;
return built;
```
