# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { RootRule, RootRuleTable } from "../items/root-rule-contract.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { NamespaceExportDeclarationShape } from "./namespace-export-declaration-shape.xl.md"
```

# namespace cangjie

`export as namespace N;` 的候选：`export` `as` `namespace` `<名字>` `;` 五格。
`ExportDeclarationPossibleShape` 在第二格见到 `as` 就 `Reject`，`ExportAssignmentRule` 在第二格要求 `=` 也会 `Reject`。
时序与 `TypeAliasDeclarationPossibleShape` 相同：`;` 那一格 `Done`，`IsBuildable` 只在那一格为真。

# class NamespaceExportDeclarationScan

## field Start:int = -1

## field Checked:int = 0

## field Stage:int = 0

## field Done:bool = false

## field DoneAt:int = -1

## field Rejected:bool = false

# class NamespaceExportDeclarationRule extends RootRule

```txt
export as namespace NS;
```

`Stage`：0 等 `export`，1 等 `as`，2 等 `namespace`，3 等名字，4 等 `;`。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.Slot();
let state = cache.GetState<NamespaceExportDeclarationScan>(name);
if (state === null) {
  state = new NamespaceExportDeclarationScan();
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
    // 文件到头了：本条声明不可能再补 `;`。
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 0) {
    state.Stage = unit instanceof Common && (unit as Common).Is("export") ? 1 : -1;
    if (state.Stage < 0) {
      state.Rejected = true;
    }
    continue;
  }
  if (state.Stage === 1) {
    state.Stage = unit instanceof Common && (unit as Common).Is("as") ? 2 : -1;
    if (state.Stage < 0) {
      state.Rejected = true;
    }
    continue;
  }
  if (state.Stage === 2) {
    state.Stage = unit instanceof Common && (unit as Common).Is("namespace") ? 3 : -1;
    if (state.Stage < 0) {
      state.Rejected = true;
    }
    continue;
  }
  if (state.Stage === 3) {
    state.Stage = unit instanceof Common ? 4 : -1;
    if (state.Stage < 0) {
      state.Rejected = true;
    }
    continue;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is(";")) {
    state.Done = true;
    if (state.DoneAt < 0) {
      state.DoneAt = at;
    }
  } else {
    state.Rejected = true;
  }
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
const state = cache.GetState<NamespaceExportDeclarationScan>(this.Slot());
return state !== null && state.Done && !state.Rejected && state.DoneAt === tokenIndex;
```

## method BuildByIndex:(host:Token, tokenIndex:int, table:RootRuleTable, context:SyntaxContext)=>Token

```ts
const state = table.Cache.GetState<NamespaceExportDeclarationScan>(this.Slot());
const start = state === null ? ItemUtil.ItemStart(host.Data) : state.Start;
if (start > tokenIndex) {
  return host;
}
const built = NamespaceExportDeclarationShape.FromUnits(host, start, tokenIndex, context);
host.Data.splice(start, tokenIndex - start + 1, built);
built.Parent = host;
return built;
```
