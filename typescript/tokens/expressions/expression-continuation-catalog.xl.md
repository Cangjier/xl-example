# dependencies
```xl
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ExpressionShapeCatalog } from "./expression-shape-catalog.xl.md"
```

# namespace cangjie

# class ExpressionContinuationCatalog

## static method Claims:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const shapes:Array<PossibleShape> = ExpressionShapeCatalog.CreateDeclarationInitializer();
for (const shape of shapes) {
  if (shape.ContinuationClaim(units, tokenIndex)) {
    return true;
  }
}
return false;
```
