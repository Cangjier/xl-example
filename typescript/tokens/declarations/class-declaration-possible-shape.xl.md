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
import { ClassDeclarationShape } from "./class-declaration-shape.xl.md"
import { AngleJudge } from "../types/angle-judge.xl.md"
```

# namespace cangjie

# class ClassDeclarationScan

判定状态。`Stage` 是这条声明已经走到哪一格：0 = 等 `declare` / `class`，1 = 等 `class`，2 = 等名字，
3 = 等类体，4 = 已经完整（见到空类体）；`DoneAt` 记类体那一格的下标。

## field Start:int = -1

## field Checked:int = 0

## field Stage:int = 0

## field AngleDepth:int = 0

## field PendingModifier:bool = false

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

## private static method HasLineBreakBefore:(units:Array<Token>, at:int)=>bool

`at` 这个代码单元与它前面第一个代码单元之间有没有换行（中间的 trivia 逐格看，块注释里的换行也算）。
扫描到 `at` 时只能往回看：用它判「修饰词后面换行，修饰词按 ASI 自成一条表达式语句」。

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
  state.AngleDepth = 0;
  state.PendingModifier = false;
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
      // 其它声明族的关键字（非成员名位置）说明这不是 class 声明：退出，避免与
      // Interface / TypeAlias / ModuleDeclaration 候选在装饰器前缀后共存。
      let previous = at - 1;
      while (previous >= 0 && units[previous].IsTriviaToken) {
        previous--;
      }
      let afterDot = false;
      if (previous >= 0 && units[previous] instanceof Symbol) {
        const previousText = (units[previous] as Symbol).TempToString();
        afterDot = previousText === "." || previousText === "?.";
      }
      if (!afterDot && (text === "interface" || text === "type" || text === "namespace"
        || text === "module" || text === "enum" || text === "function"
        || text === "const" || text === "let" || text === "var" || text === "global")) {
        state.Rejected = true;
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
        // 修饰词先挂起：`abstract` ⏎ `class A {}` 在 TS 里是两条（修饰词自成一条表达式语句）。
        // 换行与否要等 `class` 那一格才能判（ComputeByIndex 只看得到已到达的单元）。
        state.PendingModifier = true;
        continue;
      }
      if (text === "class") {
        // 修饰词与 `class` 之间换行：TS 的 ASI 把修饰词收成独立 ExpressionStatement，
        // `class` 另起一条声明。本候选退出，交给根级边界收尾。
        if (state.PendingModifier && ClassDeclarationPossibleShape.HasLineBreakBefore(units, at)) {
          state.Rejected = true;
          continue;
        }
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
      // 名字（`class C {}`）；`extends` / `implements` 也走这里——TS 对
      // `class extends B {}` / `class implements I {}` 的恢复形就是无名 ClassDeclaration。
      state.Stage = 3;
      continue;
    }
    if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{") {
      // 匿名类声明（TS 的静默恢复，`class {}`）：名字缺失不是错误，直接到类体。
      state.Stage = 4;
      state.Done = true;
      state.DoneAt = at;
      continue;
    }
    if (unit instanceof Symbol && (unit as Symbol).Is("<")) {
      // 匿名泛型类 `class<T> {}`：先过类型参数表，再等 heritage / 类体。
      state.AngleDepth = 1;
      state.Stage = 8;
      continue;
    }
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 8) {
    // 类名之后的类型参数表 `<...>`：宽松数角一律交 AngleJudge.Shift（与函数候选同款）。
    if (unit instanceof Symbol) {
      state.AngleDepth = AngleJudge.Shift(unit, state.AngleDepth);
      if (state.AngleDepth <= 0) {
        state.Stage = 3;
      }
      continue;
    }
    continue;
  }
  if (state.Stage === 3) {
    // 类型形参 / 泛型实参里的 `{ a: A }`（类型字面量）不是类/接口体：用尖括号深度区分。
    if (unit instanceof Symbol) {
      state.AngleDepth = AngleJudge.Guard(unit, state.AngleDepth);
      continue;
    }
    if (state.AngleDepth === 0 && unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{") {
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
const built = ClassDeclarationShape.FromUnitsAllowAnonymous(host, start, tokenIndex, context);
host.Data.splice(start, tokenIndex - start + 1, built);
built.Parent = host;
return built;
```
