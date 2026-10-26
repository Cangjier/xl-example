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
import { BodyGuideUtil } from "./body-guide-util.xl.md"
import { ClassDeclarationShape } from "./class-declaration-shape.xl.md"
import { StatementRoute } from "../statements/statement-route-util.xl.md"
import { StatementRouteUtil } from "../statements/statement-route-util.xl.md"
import { DeclarationIncrementalRoute } from "./declaration-incremental-route.xl.md"
```

# namespace cangjie

# class ClassDeclarationScan

## field Start:int = -1

## field Checked:int = 0

## field Stage:int = 0

## field PendingModifier:bool = false

## field Done:bool = false

## field DoneAt:int = -1

## field Rejected:bool = false

# class ClassDeclarationPossibleShape extends PossibleShape

```txt
class C {}
declare class C {}
@dec class C {}
```

## private static method HasLineBreakBefore:(units:Array<Token>, at:int)=>bool

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
// [E-DECL:ROUTE] 增量模式：让根层声明壳让出路由，由本族候选提前挂壳（开关 false 时恢复原路由）。
DeclarationIncrementalRoute.Arm();
if (StatementRouteUtil.ShouldYieldToDeclarationShell(units, tokenIndex)) {
  // Stage 4x：与壳的晚建守卫同一判据（route 命中 && 壳这一格不会建壳）才让位。
  // 只看 route 会让「上一条语句已收口」的格子（`}` ⏎ `export`）两边都退 → 文件级 fallback。
  return ShapeStates.Reject;
}
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.Slot();
let state = cache.GetState<ClassDeclarationScan>(name);
if (state === null) {
  state = new ClassDeclarationScan();
  state.Start = ItemUtil.ItemStartCached(units, cache);
  state.Checked = state.Start;
  cache.SetState(name, state);
}
if (state.Checked > tokenIndex + 1) {
  state.Start = ItemUtil.ItemStartCached(units, cache);
  state.Checked = state.Start;
  state.Stage = 0;
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
  if (state.Done) {
    // 已经认下 `class`：后面的名字 / 类型参数 / heritage / 类体都归壳，不再判。
    continue;
  }
  if (unit instanceof EndOfFileTokenShape) {
    // 文件到头了：`class` 关键字还没出现，这条声明不可能再成立。
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
        state.Stage = 4;
        state.Done = true;
        state.DoneAt = at;
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
  if (state.Stage === 6) {
    if (unit instanceof Common) {
      const text = (unit as Common).TempToString();
      if (text === "class") {
        state.Stage = 4;
        state.Done = true;
        state.DoneAt = at;
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
  if (state.Stage === 1) {
    if (unit instanceof Common && (unit as Common).Is("class")) {
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
DeclarationIncrementalRoute.Arm();
const state = cache.GetState<ClassDeclarationScan>(this.Slot());
return state !== null && state.Done && !state.Rejected;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const state = catalog.PossibleShapesComputeCache.GetState<ClassDeclarationScan>(this.Slot());
const start = state === null ? ItemUtil.ItemStart(host.Data) : state.Start;
if (start < 0 || start > tokenIndex) {
  return host;
}
const shell = new ClassDeclarationShape(host.Template);
return BodyGuideUtil.MountShell(host, start, tokenIndex, shell, context);
```
