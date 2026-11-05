# dependencies
```xl
import { Token } from "../../../core/syntax/token.xl.md"
import { TypeConditionalScan } from "./type-conditional-scan-util.xl.md"
import { TypeParameterListShape } from "./type-parameter-list-shape.xl.md"
import { TypeParameterShape } from "./type-node-shapes.xl.md"
import { TypeParserApi } from "./type-parser-api.xl.md"
import { TypeShape } from "./type-shape.xl.md"
```

# namespace cangjie

# class TypeAliasGrow

## static method Fold:(alias:Token)=>void

```ts
const units = alias.Data;
const equals = TypeConditionalScan.TopLevelEquals(units, units.length);
const from = equals < 0 ? 0 : equals + 1;
let bodyIndex = -1;
for (let at = from; at < units.length; at++) {
  const item = units[at];
  if (item instanceof TypeShape
      && !(item instanceof TypeParameterShape)
      && !(item instanceof TypeParameterListShape)) {
    bodyIndex = at;
    break;
  }
}
if (bodyIndex < 0) {
  return;
}
let last = units.length - 1;
while (last > bodyIndex && units[last].IsTriviaToken) {
  last--;
}
if (last <= bodyIndex) {
  return;
}
const node = TypeParserApi.ParseCompleteType(units.slice(bodyIndex, last + 1), last + 1 - bodyIndex, alias.Template);
units.splice(bodyIndex, last + 1 - bodyIndex, node);
node.Parent = alias;
```
