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

# class EnumDeclarationPossibleShape extends PossibleShape

```txt
enum E {}
enum E { A }
enum E { A = 1, B = 2 }
declare enum E { A }
```

与 ClassDeclarationPossibleShape 同构，但枚举体**可以非空**：成员由 `EnumDeclarationShape.FromUnits` 逐个建。
第一个代码单元 `enum`（或 `declare` + `enum`），最后一块是枚举体 `{…}` 的 `Bracket`。

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
        state.Stage = 1;
        continue;
      }
      if (text === "const") {
        // `const enum E {…}`: the statement candidate yields on `const` + `enum` (raw lookahead),
        // so this candidate is the only one left for that form.
        state.Stage = 5;
        continue;
      }
      if (text === "enum") {
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
