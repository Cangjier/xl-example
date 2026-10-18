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

# class ImportClausePossibleShape extends PossibleShape

```txt
import a from "m";
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
for (const unit of units) {
  if (unit instanceof ImportClauseShape) {
    return ShapeStates.Reject;
  }
}
const start = ItemUtil.ItemStart(units);
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
const identifier = IdentifierShape.FromToken(common);
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
