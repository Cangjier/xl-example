# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
```

# namespace cangjie

# class ImportDeclarationEndPossibleShape extends PossibleShape

```txt
import a from "m";
                 ^ 声明在这里结束
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const trimmed = ItemUtil.LastCodeInItem(units);
if (trimmed < 0) {
  return ShapeStates.Uncertain;
}
const tail = units[trimmed];
if (tail instanceof Symbol && (tail as Symbol).Is(";")) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide)=>Token

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
unit.TryToClose();
unit.Quit();
return host;
```
