# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { ImportClauseShape } from "./import-clause-shape.xl.md"
```

# namespace cangjie

# class ImportClauseScan

## field Start:int = 0

## field Checked:int = 0

## field HasClause:bool = false

# class ImportClausePossibleShape extends PossibleShape

```txt
import a from "m";
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.constructor.name;
let state = cache.GetState<ImportClauseScan>(name);
if (state === null) {
  state = new ImportClauseScan();
  state.Start = ItemUtil.ItemStart(units);
  cache.SetState(name, state);
}
if (state.Checked > tokenIndex + 1) {
  state.Checked = 0;
  state.HasClause = false;
}
for (let at = state.Checked; at <= tokenIndex; at++) {
  if (units[at] instanceof ImportClauseShape) {
    state.HasClause = true;
  }
}
state.Checked = tokenIndex + 1;
if (state.HasClause) {
  return ShapeStates.Reject;
}
const start = ItemUtil.NextCode(units, state.Start);
if (start >= units.length) {
  return ShapeStates.Uncertain;
}
const head = units[start];
if (!(head instanceof Common) || !(head as Common).Is("import")) {
  return ShapeStates.Reject;
}
const last = ItemUtil.LastCodeInItem(units);
if (last < 0) {
  return ShapeStates.Uncertain;
}
const tail = units[last];
if (!(tail instanceof Common)) {
  return ShapeStates.Reject;
}
if ((tail as Common).Is("import") || (tail as Common).Is("from")) {
  return ShapeStates.Uncertain;
}
return ShapeStates.Accept;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide)=>Token

```ts
let index = tokenIndex;
while (index >= 0 && host.Data[index].IsTriviaToken) {
  index--;
}
if (index < 0 || !(host.Data[index] instanceof Common)) {
  return host;
}
const common = host.Data[index] as Common;
const identifier = IdentifierShape.FromBasicToken(common);
const clause = new ImportClauseShape(host.Template);
if (common.SourceRange.Start !== null) {
  clause.SignIn(common.SourceRange.Start);
}
if (common.SourceRange.End !== null) {
  clause.SignOut(common.SourceRange.End);
}
clause.Name = identifier;
clause.Data.push(identifier);
identifier.Parent = clause;
clause.TryToClose();
host.Data.splice(index, 1, clause);
clause.Parent = host;
return clause;
```
