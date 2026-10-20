# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { ImportEqualsDeclarationShape } from "./import-equals-declaration-shape.xl.md"
```

# namespace cangjie

`import x = require("m");` / `import x = A.B;` 的候选：第一条代码单元必须是 `import`，`<名字>` `=` `<require(...) | 实体名>` `;`。
扫描按阶段推进（`Stage`），任何一步不符即 `Reject`；顶层 `;` 到且阶段收束时 `Done`，`IsBuildable` 只在 `;` 那一格为真——与 `TypeAliasDeclarationPossibleShape` 同一套时序。

# class ImportEqualsDeclarationScan

## field Start:int = -1

## field Checked:int = 0

## field Stage:int = 0

## field Done:bool = false

## field DoneAt:int = -1

## field Rejected:bool = false

# class ImportEqualsDeclarationPossibleShape extends PossibleShape

```txt
import x = require("m");
import x = A.B;
```

`Stage`：0 等 `import`，1 等名字，2 等 `=`，3 等引用起点（`require` → 4；标识符 → 6），4 等 `(`，5 等 `;`（require 形），6 实体名部分（`Common` / `.`，`;` 收尾）。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.constructor.name;
let state = cache.GetState<ImportEqualsDeclarationScan>(name);
if (state === null) {
  state = new ImportEqualsDeclarationScan();
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
    // 文件到头了：本条声明不可能再补 `;`。候选退出，把边界收尾交给终结候选。
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 0) {
    state.Stage = unit instanceof Common && (unit as Common).Is("import") ? 1 : -1;
    if (state.Stage < 0) {
      state.Rejected = true;
    }
    continue;
  }
  if (state.Stage === 1) {
    state.Stage = unit instanceof Common ? 2 : -1;
    if (state.Stage < 0) {
      state.Rejected = true;
    }
    continue;
  }
  if (state.Stage === 2) {
    state.Stage = unit instanceof Symbol && (unit as Symbol).Is("=") ? 3 : -1;
    if (state.Stage < 0) {
      state.Rejected = true;
    }
    continue;
  }
  if (state.Stage === 3) {
    if (unit instanceof Common && (unit as Common).Is("require")) {
      state.Stage = 4;
    } else if (unit instanceof Common) {
      state.Stage = 6;
    } else {
      state.Rejected = true;
    }
    continue;
  }
  if (state.Stage === 4) {
    state.Stage = unit instanceof Bracket && (unit as Bracket).StartBracketChar === "(" ? 5 : -1;
    if (state.Stage < 0) {
      state.Rejected = true;
    }
    continue;
  }
  if (state.Stage === 5) {
    if (unit instanceof Symbol && (unit as Symbol).Is(";")) {
      state.Done = true;
      if (state.DoneAt < 0) {
        state.DoneAt = at;
      }
    } else {
      state.Rejected = true;
    }
    continue;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is(";")) {
    state.Done = true;
    if (state.DoneAt < 0) {
      state.DoneAt = at;
    }
    continue;
  }
  if (unit instanceof Common || (unit instanceof Symbol && (unit as Symbol).Is("."))) {
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
const state = cache.GetState<ImportEqualsDeclarationScan>(this.constructor.name);
return state !== null && state.Done && !state.Rejected && state.DoneAt === tokenIndex;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const state = catalog.PossibleShapesComputeCache.GetState<ImportEqualsDeclarationScan>(this.constructor.name);
const start = state === null ? ItemUtil.ItemStart(host.Data) : state.Start;
if (start > tokenIndex) {
  return host;
}
const built = ImportEqualsDeclarationShape.FromUnits(host, start, tokenIndex, context);
host.Data.splice(start, tokenIndex - start + 1, built);
built.Parent = host;
return built;
```
