# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class ImportDeclarationEndScan

## field Checked:int = 0

## field LastCode:int = -1

# class ImportDeclarationEndPossibleShape extends PossibleShape

```txt
import a from "m";
                 ^ 声明在这里结束
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.constructor.name;
const state = cache.GetOrComputeState<ImportDeclarationEndScan>(name, "Checked", units, tokenIndex, context, (units, tokenIndex, context, state) => {
  state.Checked = 0;
  state.LastCode = -1;
});
if (state === null) {
  return ShapeStates.Uncertain;
}
if (state.Checked > tokenIndex + 1) {
  state.Checked = 0;
  state.LastCode = -1;
}
for (let at = state.Checked; at <= tokenIndex; at++) {
  if (!units[at].IsTriviaToken) {
    state.LastCode = at;
  }
}
state.Checked = tokenIndex + 1;
const trimmed = state.LastCode;
if (trimmed < 0) {
  return ShapeStates.Uncertain;
}
const tail = units[trimmed];
if (tail instanceof Symbol && (tail as Symbol).Is(";")) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const unit = host as UnitToken;
let at = tokenIndex;
while (at >= 0 && host.Data[at].IsTriviaToken) {
  at--;
}
if (at >= 0) {
  const last = host.Data[at];
  if (last.SourceRange.End !== null) {
    unit.SignOut(last.SourceRange.End);
  }
}
unit.TryToClose(context);
unit.Quit();
return host;
```
