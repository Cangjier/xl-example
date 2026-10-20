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
import { FunctionDeclarationShape } from "./function-declaration-shape.xl.md"
import { ItemUtil } from "../item-util.xl.md"
```

# namespace cangjie

# class FunctionDeclarationScan

判定状态。`Stage`：0 = 等 `function`，1 = 等名字，2 = 等参数表 `(`，3 = 参数表之后（等 `:` 或函数体 `{`），
4 = 返回类型里（等函数体 `{`），5 = 已经完整（见到函数体）；`DoneAt` 记函数体那一格。

## field Start:int = -1

## field Checked:int = 0

## field Stage:int = 0

## field Done:bool = false

## field DoneAt:int = -1

## field Rejected:bool = false

# class FunctionDeclarationPossibleShape extends PossibleShape

```txt
function f() {}
function f(a) {}
function f(a: A): B { return a; }
```

根候选：条目必须从 `function` 起，名字、参数表 `(…)` 之后可以跟 `: 类型`，最后一块是函数体 `{…}` 的 `Bracket`。
函数体内容不在这里判定（`StatementBuilder` 负责建里面的语句），所以只要见到函数体括号就 `Accept`。
`function*` / `async function` / 泛型函数不在本批范围：`*` 或 `async` 会让扫描在对应 Stage 直接 `Reject`。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.constructor.name;
let state = cache.GetState<FunctionDeclarationScan>(name);
if (state === null) {
  state = new FunctionDeclarationScan();
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
    if (unit instanceof Common && (unit as Common).Is("function")) {
      state.Stage = 1;
      continue;
    }
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 1) {
    if (unit instanceof Common) {
      state.Stage = 2;
      continue;
    }
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 2) {
    if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "(") {
      state.Stage = 3;
      continue;
    }
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 3) {
    if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{") {
      state.Stage = 5;
      state.Done = true;
      state.DoneAt = at;
      continue;
    }
    if (unit instanceof Symbol && (unit as Symbol).Is(":")) {
      state.Stage = 4;
      continue;
    }
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 4) {
    if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{") {
      state.Stage = 5;
      state.Done = true;
      state.DoneAt = at;
      continue;
    }
    // 返回类型里的普通单元（名字 / 关键字 / `|` `&` `<` `>` 等符号 / 其它括号）都只当类型内容。
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
const state = cache.GetState<FunctionDeclarationScan>(this.constructor.name);
return state !== null && state.Done && !state.Rejected && state.DoneAt === tokenIndex;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const state = catalog.PossibleShapesComputeCache.GetState<FunctionDeclarationScan>(this.constructor.name);
const start = state === null ? ItemUtil.ItemStart(host.Data) : state.Start;
if (start > tokenIndex) {
  return host;
}
const built = FunctionDeclarationShape.FromUnits(host, start, tokenIndex, context);
host.Data.splice(start, tokenIndex - start + 1, built);
built.Parent = host;
return built;
```
