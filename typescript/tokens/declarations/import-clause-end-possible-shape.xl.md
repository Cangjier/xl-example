# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
import { ReloadMessage } from "../../../core/syntax/messages/reload-message.xl.md"
```

# namespace cangjie

# class ImportClauseEndScan

## field Checked:int = 0

## field LastCode:int = -1

# class ImportClauseEndPossibleShape extends PossibleShape

```txt
import a from "m";
         ^^^^ 子句在这里结束
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.Slot();
let state = cache.GetState<ImportClauseEndScan>(name);
if (state === null) {
  state = new ImportClauseEndScan();
  cache.SetState(name, state);
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
if (tail instanceof Common && (tail as Common).Is("from")) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const unit = host as UnitToken;
const fromUnit = host.Data[tokenIndex];
if (fromUnit.SourceRange.Start !== null && fromUnit.SourceRange.End !== null) {
  context.Messages.push(ReloadMessage.FromRange(host, fromUnit.SourceRange.Start, fromUnit.SourceRange.End));
}
let at = tokenIndex - 1;
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
if (unit.Parent !== null) {
  (unit.Parent as any).MountedUnit = null;
}
return host;
```
