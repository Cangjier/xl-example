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
import { ClassDeclarationShape } from "./class-declaration-shape.xl.md"
```

# namespace cangjie

# class ClassDeclarationScan

判定状态。`Stage` 是这条声明已经走到哪一格：0 = 等 `declare` / `class`，1 = 等 `class`，2 = 等名字，
3 = 等类体，4 = 已经完整（见到空类体）；`DoneAt` 记类体那一格的下标。

## field Start:int = -1

## field Checked:int = 0

## field Stage:int = 0

## field Done:bool = false

## field DoneAt:int = -1

## field Rejected:bool = false

# class ClassDeclarationPossibleShape extends PossibleShape

```txt
class C {}
declare class C {}
```

第一个代码单元必须是 `class`（或修饰符 `declare` 后跟 `class`），最后一块是空类体 `{…}` 那个 `Bracket`。
每格只推进 `Stage`，所以既满足 cache 口径（IMPORTANCE 3.4），也不会每轮从头重扫。
类体非空时本候选主动 `Reject`——类成员还没实现，宁可让「没有候选」炸出来，也不静默丢成员。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.constructor.name;
let state = cache.GetState<ClassDeclarationScan>(name);
if (state === null) {
  state = new ClassDeclarationScan();
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
    // 文件到头了：还没见到类体，这条声明不可能再补完。
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 6) {
    if (unit instanceof Common) {
      const text = (unit as Common).TempToString();
      if (text === "class") {
        state.Stage = 2;
        continue;
      }
      if (text === "declare" || text === "abstract") {
        state.Stage = 1;
        continue;
      }
      continue;
    }
    if (unit instanceof Symbol || unit instanceof Bracket) {
      continue;
    }
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 0) {
    if (unit instanceof Common) {
      const text = (unit as Common).TempToString();
      if (text === "declare" || text === "abstract") {
        // 修饰符可以连续出现（`abstract declare class`），所以停在 Stage 0 继续等 `class`。
        continue;
      }
      if (text === "class") {
        state.Stage = 2;
        continue;
      }
    }
    if (unit instanceof Symbol && (unit as Symbol).Is("@")) {
      state.Stage = 6;
      continue;
    }
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 1) {
    if (unit instanceof Common && (unit as Common).Is("class")) {
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
      // 非空类体不再 Reject：成员由 ClassDeclarationShape.BuildMembers 逐个建。
      state.Stage = 4;
      state.Done = true;
      state.DoneAt = at;
      continue;
    }
    // 名字与类体之间的 heritage：`extends` / `implements` 关键字与类型内容都是 Common / Symbol
    //（泛型实参用 `<` `>` `,` 这些 Symbol），具体解析交给 ClassDeclarationShape.FromUnits。
    if (unit instanceof Common || unit instanceof Symbol) {
      continue;
    }
    state.Rejected = true;
    continue;
  }
  // 已经完整，后面又冒出单元（`class C {};` 这类）：本候选不认，交给别人。
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
const state = cache.GetState<ClassDeclarationScan>(this.constructor.name);
return state !== null && state.Done && !state.Rejected && state.DoneAt === tokenIndex;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const state = catalog.PossibleShapesComputeCache.GetState<ClassDeclarationScan>(this.constructor.name);
const start = state === null ? ItemUtil.ItemStart(host.Data) : state.Start;
if (start > tokenIndex) {
  return host;
}
const built = ClassDeclarationShape.FromUnits(host, start, tokenIndex, context);
host.Data.splice(start, tokenIndex - start + 1, built);
built.Parent = host;
return built;
```
