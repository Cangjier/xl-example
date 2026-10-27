# dependencies
```xl
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { ExpressionStatementPossibleShape } from "../statements/expression-statement-possible-shape.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { InterfaceDeclarationShape } from "./interface-declaration-shape.xl.md"
import { StatementRoute } from "../statements/statement-route-util.xl.md"
import { StatementRouteUtil } from "../statements/statement-route-util.xl.md"
```

# namespace cangjie

# class InterfaceDeclarationScan

## field Start:int = -1

## field Checked:int = 0

## field Stage:int = 0

## field Done:bool = false

## field DoneAt:int = -1

## field Rejected:bool = false

## field PendingModifier:bool = false

# class InterfaceDeclarationPossibleShape extends PossibleShape

```txt
interface I {}
declare interface I {}
@dec interface I {}
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

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (StatementRouteUtil.ShouldYieldToDeclarationShell(units, tokenIndex)) {
  // Stage 4x：与壳的晚建守卫同一判据（route 命中 && 壳这一格不会建壳）才让位。
  // 只看 route 会让「上一条语句已收口」的格子（`}` ⏎ `export`）两边都退 → 文件级 fallback。
  return ShapeStates.Reject;
}
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.Slot();
let state = cache.GetState<InterfaceDeclarationScan>(name);
if (state === null) {
  state = new InterfaceDeclarationScan();
  state.Start = ItemUtil.ItemStartCached(units, cache);
  state.Checked = state.Start;
  cache.SetState(name, state);
}
if (state.Checked > tokenIndex + 1) {
  state.Start = ItemUtil.ItemStartCached(units, cache);
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
  if (state.Done) {
    // 已经认下 `interface`：后面的名字 / 类型参数 / heritage / 接口体都归壳，不再判。
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
        // 修饰词先挂起：`declare` 与 `interface` 之间换行时 TS 按 ASI 把 declare 收成独立
        // ExpressionStatement（接口声明不带 DeclareKeyword），换行与否要等 `interface` 那一格才能判。
        state.PendingModifier = true;
        continue;
      }
      if (text === "interface") {
        // `declare` ⏎ `interface`：ASI 拆成两条语句，本候选退出，`declare` 交给表达式语句候选收口。
        if (state.PendingModifier && InterfaceDeclarationPossibleShape.HasLineBreakBefore(units, at)) {
          state.Rejected = true;
          continue;
        }
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
    // 装饰器前缀（只读扫描）：@dec / @ns.dec / @dec(…)。看到本族关键字才推进，
    // 看到其它声明族的关键字就退出（避免与 class / type / module 候选共存）。
    if (unit instanceof Common) {
      const text = (unit as Common).TempToString();
      if (text === "interface") {
        state.Done = true;
        state.DoneAt = at;
        continue;
      }
      if (text === "declare") {
        state.Stage = 1;
        continue;
      }
      if (text === "export") {
        state.Stage = 7;
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
      if (!afterDot && (text === "class" || text === "type" || text === "namespace"
        || text === "module" || text === "enum" || text === "function"
        || text === "const" || text === "let" || text === "var" || text === "global")) {
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
  if (state.Stage === 7) {
    if (unit instanceof Common && (unit as Common).Is("declare")) {
      state.Stage = 1;
      continue;
    }
    if (unit instanceof Common && (unit as Common).Is("interface")) {
      state.Done = true;
      state.DoneAt = at;
      continue;
    }
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 1) {
    if (unit instanceof Common && (unit as Common).Is("interface")) {
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
const state = cache.GetState<InterfaceDeclarationScan>(this.Slot());
return state !== null && state.Done && !state.Rejected;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const state = catalog.PossibleShapesComputeCache.GetState<InterfaceDeclarationScan>(this.Slot());
const start = state === null ? ItemUtil.ItemStart(host.Data) : state.Start;
if (start < 0 || start > tokenIndex) {
  return host;
}
const consumed:Array<Token> = host.Data.slice(start, tokenIndex + 1);
const shell = new InterfaceDeclarationShape(host.Template);
for (const unit of consumed) {
  shell.Add(unit);
}
const begin = consumed[0].SourceRange.StartIndex;
if (begin >= 0) {
  shell.SignIn(begin);
}
let pos = 0;
for (let at = start - 1; at >= 0; at--) {
  if (!host.Data[at].IsTriviaToken) {
    const previousEnd = host.Data[at].SourceRange.EndIndex;
    if (previousEnd >= 0) {
      pos = previousEnd;
    }
    break;
  }
}
shell.Pos = pos;
host.Data.splice(start, consumed.length, shell);
shell.Parent = host;
host.MountedUnit = shell;
return shell;
```
