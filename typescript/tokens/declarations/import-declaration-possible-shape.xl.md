# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { ImportDeclarationShape } from "./import-declaration-shape.xl.md"
```

# namespace cangjie

# class ImportDeclarationScan

## field Start:int = -1

## field At:int = -1

## field Stage:int = 0

# class ImportDeclarationPossibleShape extends PossibleShape

```txt
import a from "m";
import { a, b as c } from "m";
import * as ns from "m";
import "m";
import type { T } from "m";
import a, { b } from "m";
import a from "m" with { type: "json" };
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.constructor.name;
let state = cache.GetState<ImportDeclarationScan>(name);
if (state === null) {
  state = new ImportDeclarationScan();
  state.Start = ItemUtil.ItemStart(units);
  state.At = state.Start - 1;
  cache.SetState(name, state);
} else if (state.At > tokenIndex) {
  state.At = state.Start - 1;
  state.Stage = 0;
}
for (let index = state.At + 1; index <= tokenIndex; index++) {
  state.At = index;
  const unit = units[index];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (state.Stage === 0) {
    state.Stage = unit instanceof Common && unit.Is("import") ? 1 : 3;
    continue;
  }
  if (state.Stage === 1) {
    if (unit instanceof Bracket && unit.Is("(", ")")) {
      state.Stage = 3;
    } else if (unit instanceof Bracket && unit.Is("{", "}")) {
      state.Stage = 2;
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

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide)=>Token

```ts
const state = catalog.PossibleShapesComputeCache.GetState<ImportDeclarationScan>(this.constructor.name);
const start = state === null ? ItemUtil.ItemStart(host.Data) : state.Start;
if (start > tokenIndex) {
  return host;
}
const consumed:Array<Token> = host.Data.slice(start, tokenIndex + 1);
const built = new ImportDeclarationShape(host.Template);
for (const item of consumed) {
  built.Add(item);
}
const begin = consumed[0].SourceRange.Start;
if (begin !== null) {
  built.SignIn(begin);
}
host.Data.splice(start, consumed.length, built);
built.Parent = host;
host.MountedUnit = built;
return built;
```
