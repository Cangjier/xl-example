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
import { InterfaceDeclarationShape } from "./interface-declaration-shape.xl.md"
import { AngleJudge } from "../types/angle-judge.xl.md"
```

# namespace cangjie

# class InterfaceDeclarationScan

判定状态。`Stage`：0 = 等 `declare` / `interface`，1 = 等 `interface`，2 = 等名字，3 = 等接口体，
4 = 已经完整（见到空接口体）；`DoneAt` 记接口体那一格。

## field Start:int = -1

## field Checked:int = 0

## field Stage:int = 0

## field AngleDepth:int = 0

## field Done:bool = false

## field DoneAt:int = -1

## field Rejected:bool = false

# class InterfaceDeclarationPossibleShape extends PossibleShape

```txt
interface I {}
declare interface I {}
```

与 ClassDeclarationPossibleShape 同构：第一个代码单元 `interface`（或 `declare` + `interface`），
最后一块是空接口体 `{…}` 的 `Bracket`。`interface I extends J {}` 在本批 `Reject`（`extends` 不是 `{`。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.constructor.name;
let state = cache.GetState<InterfaceDeclarationScan>(name);
if (state === null) {
  state = new InterfaceDeclarationScan();
  state.Start = ItemUtil.ItemStart(units);
  state.Checked = state.Start;
  cache.SetState(name, state);
}
if (state.Checked > tokenIndex + 1) {
  state.Start = ItemUtil.ItemStart(units);
  state.Checked = state.Start;
  state.Stage = 0;
  state.AngleDepth = 0;
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
      if (text === "interface") {
        state.Stage = 2;
        continue;
      }
    }
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 1) {
    if (unit instanceof Common && (unit as Common).Is("interface")) {
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
    // 类型形参 / 泛型实参里的 `{ a: A }`（类型字面量）不是类/接口体：用尖括号深度区分。
    if (unit instanceof Symbol) {
      state.AngleDepth = AngleJudge.Guard(unit, state.AngleDepth);
      continue;
    }
    if (state.AngleDepth === 0 && unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{") {
      // 非空接口体不再 Reject：成员由 InterfaceDeclarationShape.BuildMembers 逐个建。
      state.Stage = 4;
      state.Done = true;
      state.DoneAt = at;
      continue;
    }
    // 名字与接口体之间的 heritage（`extends J` / `extends J<K>, L`）：
    // 关键字与类型内容都是 Common / Symbol，具体解析交给 InterfaceDeclarationShape.FromUnits。
    if (unit instanceof Common || unit instanceof Symbol) {
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
const state = cache.GetState<InterfaceDeclarationScan>(this.constructor.name);
return state !== null && state.Done && !state.Rejected && state.DoneAt === tokenIndex;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const state = catalog.PossibleShapesComputeCache.GetState<InterfaceDeclarationScan>(this.constructor.name);
const start = state === null ? ItemUtil.ItemStart(host.Data) : state.Start;
if (start > tokenIndex) {
  return host;
}
const built = InterfaceDeclarationShape.FromUnits(host, start, tokenIndex, context);
host.Data.splice(start, tokenIndex - start + 1, built);
built.Parent = host;
return built;
```
