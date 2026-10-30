# dependencies
```xl
import { TypeShape } from "./type-shape.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class KeywordTypeShape extends TypeShape

## field Text:string = ""

## static method Fill:(node:KeywordTypeShape, common:Common, pos:int)=>void

```ts
node.Pos = pos;
node.Text = common.TempToString();
node.SignIn(common.SourceRange.Start);
node.SignOut(common.SourceRange.End);
node.Closed = true;
```

# class StringKeywordShape extends KeywordTypeShape

## static method FromCommon:(common:Common, pos:int)=>StringKeywordShape

```ts
const shape = new StringKeywordShape(common.Template);
KeywordTypeShape.Fill(shape, common, pos);
return shape;
```

# class NumberKeywordShape extends KeywordTypeShape

## static method FromCommon:(common:Common, pos:int)=>NumberKeywordShape

```ts
const shape = new NumberKeywordShape(common.Template);
KeywordTypeShape.Fill(shape, common, pos);
return shape;
```

# class BooleanKeywordShape extends KeywordTypeShape

## static method FromCommon:(common:Common, pos:int)=>BooleanKeywordShape

```ts
const shape = new BooleanKeywordShape(common.Template);
KeywordTypeShape.Fill(shape, common, pos);
return shape;
```

# class AnyKeywordShape extends KeywordTypeShape

## static method FromCommon:(common:Common, pos:int)=>AnyKeywordShape

```ts
const shape = new AnyKeywordShape(common.Template);
KeywordTypeShape.Fill(shape, common, pos);
return shape;
```

# class UnknownKeywordShape extends KeywordTypeShape

## static method FromCommon:(common:Common, pos:int)=>UnknownKeywordShape

```ts
const shape = new UnknownKeywordShape(common.Template);
KeywordTypeShape.Fill(shape, common, pos);
return shape;
```

# class NeverKeywordShape extends KeywordTypeShape

## static method FromCommon:(common:Common, pos:int)=>NeverKeywordShape

```ts
const shape = new NeverKeywordShape(common.Template);
KeywordTypeShape.Fill(shape, common, pos);
return shape;
```

# class VoidKeywordShape extends KeywordTypeShape

## static method FromCommon:(common:Common, pos:int)=>VoidKeywordShape

```ts
const shape = new VoidKeywordShape(common.Template);
KeywordTypeShape.Fill(shape, common, pos);
return shape;
```

# class ObjectKeywordShape extends KeywordTypeShape

## static method FromCommon:(common:Common, pos:int)=>ObjectKeywordShape

```ts
const shape = new ObjectKeywordShape(common.Template);
KeywordTypeShape.Fill(shape, common, pos);
return shape;
```

# class SymbolKeywordShape extends KeywordTypeShape

## static method FromCommon:(common:Common, pos:int)=>SymbolKeywordShape

```ts
const shape = new SymbolKeywordShape(common.Template);
KeywordTypeShape.Fill(shape, common, pos);
return shape;
```

# class BigIntKeywordShape extends KeywordTypeShape

## static method FromCommon:(common:Common, pos:int)=>BigIntKeywordShape

```ts
const shape = new BigIntKeywordShape(common.Template);
KeywordTypeShape.Fill(shape, common, pos);
return shape;
```

# class UndefinedKeywordShape extends KeywordTypeShape

## static method FromCommon:(common:Common, pos:int)=>UndefinedKeywordShape

```ts
const shape = new UndefinedKeywordShape(common.Template);
KeywordTypeShape.Fill(shape, common, pos);
return shape;
```

# class NullKeywordShape extends KeywordTypeShape

## static method FromCommon:(common:Common, pos:int)=>NullKeywordShape

```ts
const shape = new NullKeywordShape(common.Template);
KeywordTypeShape.Fill(shape, common, pos);
return shape;
```

# class TrueKeywordShape extends KeywordTypeShape

## static method FromCommon:(common:Common, pos:int)=>TrueKeywordShape

```ts
const shape = new TrueKeywordShape(common.Template);
KeywordTypeShape.Fill(shape, common, pos);
return shape;
```

# class FalseKeywordShape extends KeywordTypeShape

## static method FromCommon:(common:Common, pos:int)=>FalseKeywordShape

```ts
const shape = new FalseKeywordShape(common.Template);
KeywordTypeShape.Fill(shape, common, pos);
return shape;
```
