# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { NamedExportsShape } from "./named-exports-shape.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ExportDeclarationShape } from "./export-declaration-shape.xl.md"
```

# namespace cangjie

# class ExportDeclarationScan

## field Start:int = -1

## field At:int = -1

## field Head:int = -1

## field Second:int = -1

## field Stage:int = 0

# class ExportDeclarationPossibleShape extends PossibleShape

```txt
export { a };
export { a, b as c } from "m";
export * from "m";
export * as ns from "m";
export type { T };
export type * from "m";
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.constructor.name;
let state = cache.GetState<ExportDeclarationScan>(name);
if (state === null) {
  state = new ExportDeclarationScan();
  state.Start = ItemUtil.ItemStart(units);
  state.At = state.Start - 1;
  cache.SetState(name, state);
}
if (state.At > tokenIndex) {
  state.At = state.Start - 1;
  state.Head = -1;
  state.Second = -1;
  state.Stage = 0;
}
for (let index = state.At + 1; index <= tokenIndex; index++) {
  state.At = index;
  const unit = units[index];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (state.Head < 0) {
    state.Head = index;
    state.Stage = unit instanceof Common && (unit as Common).Is("export") ? 0 : 3;
    continue;
  }
  if (state.Second < 0) {
    state.Second = index;
    if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{") {
      state.Stage = 2;
    } else if (unit instanceof Symbol && (unit as Symbol).Is("*")) {
      state.Stage = 2;
    } else if (unit instanceof Common && (unit as Common).Is("type")) {
      state.Stage = 1;
    } else {
      state.Stage = 3;
    }
    continue;
  }
  if (state.Stage === 1) {
    if ((unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{") || (unit instanceof Symbol && (unit as Symbol).Is("*"))) {
      state.Stage = 2;
    } else {
      state.Stage = 3;
    }
  }
}
if (state.Stage === 3) {
  return ShapeStates.Reject;
}
if (state.Stage === 2) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const state = catalog.PossibleShapesComputeCache.GetState<ExportDeclarationScan>(this.constructor.name);
const start = state === null ? ItemUtil.ItemStart(host.Data) : state.Start;
if (start < 0 || start > tokenIndex) {
  return host;
}
const consumed:Array<Token> = host.Data.slice(start, tokenIndex + 1);
const built = new ExportDeclarationShape(host.Template);
for (const unit of consumed) {
  built.Add(unit);
}
for (let at = 0; at < built.Data.length; at++) {
  const unit = built.Data[at];
  if (!(unit instanceof Bracket) || (unit as Bracket).StartBracketChar !== "{" || !(unit as Bracket).Closed) {
    continue;
  }
  let previous = -1;
  for (let back = at - 1; back >= 0; back--) {
    if (!built.Data[back].IsTriviaToken) {
      previous = back;
      break;
    }
  }
  if (previous >= 0) {
    const before = built.Data[previous];
    if (before instanceof Common && ((before as Common).Is("with") || (before as Common).Is("assert"))) {
      continue;
    }
  }
  const named = NamedExportsShape.FromBracket(unit as Bracket, context);
  if (previous >= 0) {
    const previousEnd = built.Data[previous].SourceRange.End;
    if (previousEnd !== null) {
      named.Pos = previousEnd.Index + 1;
    }
  } else if (unit.SourceRange.Start !== null) {
    named.Pos = unit.SourceRange.Start.Index;
  }
  built.Data.splice(at, 1, named);
  named.Parent = built;
}
const begin = consumed[0].SourceRange.Start;
if (begin !== null) {
  built.SignIn(begin);
}
let previousCode = -1;
for (let at = start - 1; at >= 0; at--) {
  if (!host.Data[at].IsTriviaToken) {
    previousCode = at;
    break;
  }
}
built.Pos = begin !== null ? begin.Index : -1;
if (previousCode >= 0) {
  const previousUnit = host.Data[previousCode];
  if (previousUnit.SourceRange.End !== null) {
    built.Pos = previousUnit.SourceRange.End.Index + 1;
  }
}
host.Data.splice(start, consumed.length, built);
built.Parent = host;
host.MountedUnit = built;
return built;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>bool

```ts
const state = cache.GetState<ExportDeclarationScan>(this.constructor.name);
return state !== null && state.Stage === 2;
```
