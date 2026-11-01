# dependencies
```xl
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { KeywordTypeShape } from "./keyword-type-shapes.xl.md"
import { StringKeywordShape } from "./keyword-type-shapes.xl.md"
import { NumberKeywordShape } from "./keyword-type-shapes.xl.md"
import { BooleanKeywordShape } from "./keyword-type-shapes.xl.md"
import { AnyKeywordShape } from "./keyword-type-shapes.xl.md"
import { UnknownKeywordShape } from "./keyword-type-shapes.xl.md"
import { NeverKeywordShape } from "./keyword-type-shapes.xl.md"
import { VoidKeywordShape } from "./keyword-type-shapes.xl.md"
import { ObjectKeywordShape } from "./keyword-type-shapes.xl.md"
import { SymbolKeywordShape } from "./keyword-type-shapes.xl.md"
import { BigIntKeywordShape } from "./keyword-type-shapes.xl.md"
import { UndefinedKeywordShape } from "./keyword-type-shapes.xl.md"
```

# namespace cangjie

# class TypeKeywordUtil

## static method KeywordTypeOf:(common:Common, pos:int)=>KeywordTypeShape | null

```ts
switch (common.TempToString()) {
  case "string":
    return TypeKeywordUtil.KeywordRevision(StringKeywordShape.FromCommon(common, pos), common);
  case "number":
    return TypeKeywordUtil.KeywordRevision(NumberKeywordShape.FromCommon(common, pos), common);
  case "boolean":
    return TypeKeywordUtil.KeywordRevision(BooleanKeywordShape.FromCommon(common, pos), common);
  case "any":
    return TypeKeywordUtil.KeywordRevision(AnyKeywordShape.FromCommon(common, pos), common);
  case "unknown":
    return TypeKeywordUtil.KeywordRevision(UnknownKeywordShape.FromCommon(common, pos), common);
  case "never":
    return TypeKeywordUtil.KeywordRevision(NeverKeywordShape.FromCommon(common, pos), common);
  case "void":
    return TypeKeywordUtil.KeywordRevision(VoidKeywordShape.FromCommon(common, pos), common);
  case "object":
    return TypeKeywordUtil.KeywordRevision(ObjectKeywordShape.FromCommon(common, pos), common);
  case "symbol":
    return TypeKeywordUtil.KeywordRevision(SymbolKeywordShape.FromCommon(common, pos), common);
  case "bigint":
    return TypeKeywordUtil.KeywordRevision(BigIntKeywordShape.FromCommon(common, pos), common);
  case "undefined":
    return TypeKeywordUtil.KeywordRevision(UndefinedKeywordShape.FromCommon(common, pos), common);
  default:
    return null;
}
```


## static method KeywordRevision:(shape:KeywordTypeShape, common:Common)=>KeywordTypeShape

```ts
shape.CreatedRevisionAt = common.SourceRange.End;
return shape;
```
