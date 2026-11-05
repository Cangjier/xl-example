# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { TokenIndex } from "../../../core/syntax/token-index.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { CaseSectionShape } from "./case-section-shape.xl.md"
```

# namespace cangjie

# class CaseSectionEndPossibleShape extends PossibleShape


## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const host = index.Host;
const units = host.Data;
const tokenIndex = index.Index;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const unit = index.At(tokenIndex);
if (unit instanceof Symbol && unit.Closed && unit.Is("}")) {
  return ShapeStates.Accept;
}
if (unit instanceof Common && unit.Closed && (unit.Is("case") || unit.Is("default"))) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const units = index.Host.Data;
const tokenIndex = index.Index;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = index.At(tokenIndex);
if (unit instanceof Symbol && unit.Closed && unit.Is("}")) {
  return true;
}
return unit instanceof Common && unit.Closed && (unit.Is("case") || unit.Is("default"));
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const host = index.Host;
const tokenIndex = index.Index;
const token = index.At(tokenIndex);
CaseSectionShape.HandBack(host, tokenIndex, context);
return this.StampCreated(token, context);
```
