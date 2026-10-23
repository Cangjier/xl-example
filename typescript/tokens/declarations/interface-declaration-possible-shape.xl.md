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
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { ExpressionStatementPossibleShape } from "../statements/expression-statement-possible-shape.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { InterfaceDeclarationShape } from "./interface-declaration-shape.xl.md"
```

# namespace cangjie

# class InterfaceDeclarationScan

判定状态。`Stage`：0 = 等修饰词 / `interface`，1 = 已见 `declare`、等 `interface`，6 = 装饰器前缀，7 = 装饰器后已见 `export`。

`Done` 表示**已经确认是接口声明**（看到 `interface` 关键字），接口体与名字交给建出来的壳自己吃——本候选不再等接口体括号闭合。

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

根层的接口声明是**提前挂载的壳**：本候选一眼认下 `interface`（连同前面的装饰器 / `declare` 前缀）就 `Accept` 并被 `CatalogGuide` 建出 `InterfaceDeclarationShape` 壳，壳随后吃名字 / 类型参数 / heritage / 接口体，接口体括号闭合时由壳的终结候选收口。

所以本候选**不再扫描到接口体**：`extends` / 类型参数 / 括号里的内容全是壳的事，`interface I` 之后出现什么都不影响本候选的判定。

`declare` 与 `interface` 之间换行时 TS 的 ASI 把 `declare` 收成独立的 ExpressionStatement、接口声明不带 DeclareKeyword，本候选必须退出。

## private static method HasLineBreakBefore:(units:Array<Token>, at:int)=>bool

`at` 这个代码单元与它前面第一个代码单元之间有没有换行（中间的 trivia 逐格看，块注释里的换行也算）。

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
const name = this.Slot();
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

只要已经认下 `interface` 就能建壳：建壳时机由 `CatalogGuide` 的唯一候选决定（`@dec interface I` 这类前缀要等其它候选都退出，可能晚一两格），壳从 `state.Start` 起把已经攒下的代码单元全收进去。

```ts
const state = cache.GetState<InterfaceDeclarationScan>(this.Slot());
return state !== null && state.Done && !state.Rejected;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

把 `interface` 关键字的这一格变成**挂载的壳**：把 `state.Start..tokenIndex` 的单元原样搬进壳的 `Data`、签入，然后让壳挂到宿主上接管后续字符。

壳的 `Pos` 在这里算：`state.Start` 前面最近一个非 trivia 单元的 `EndIndex`（没有就是 `0`）——与 `FromUnits` 的口径一致。

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
