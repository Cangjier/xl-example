# dependencies
```xl
import { TypeShape } from "./type-shape.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class ArrayTypeShape extends TypeShape

# class UnionTypeShape extends TypeShape

# class IntersectionTypeShape extends TypeShape

# class ConditionalTypeShape extends TypeShape

## field Stage:int = 0

## field SegmentStart:int = 1

# class InferTypeShape extends TypeShape

# class TypeOperatorShape extends TypeShape

# class TypeQueryShape extends TypeShape

# class IndexedAccessTypeShape extends TypeShape

# class ParenthesizedTypeShape extends TypeShape

# class TupleTypeShape extends TypeShape

# class NamedTupleMemberShape extends TypeShape

# class OptionalTypeShape extends TypeShape

# class RestTypeShape extends TypeShape

# class TypeLiteralShape extends TypeShape

# class PropertySignatureShape extends TypeShape

# class MethodSignatureShape extends TypeShape

# class CallSignatureShape extends TypeShape

# class ConstructSignatureShape extends TypeShape

# class IndexSignatureShape extends TypeShape

# class ParameterShape extends TypeShape

# class FunctionTypeShape extends TypeShape

# class ConstructorTypeShape extends TypeShape

# class TypePredicateShape extends TypeShape

# class MappedTypeShape extends TypeShape

# class LiteralTypeShape extends TypeShape

# class ImportTypeShape extends TypeShape

# class TypeReferenceShape extends TypeShape

# class QualifiedNameShape extends TypeShape

# class TypeParameterShape extends TypeShape

# class ThisTypeShape extends TypeShape

## static method FromCommon:(common:Common, pos:int)=>ThisTypeShape

```ts
const shape = new ThisTypeShape(common.Template);
shape.Pos = pos;
shape.SignIn(common.SourceRange.Start);
shape.SignOut(common.SourceRange.End);
shape.Closed = true;
return shape;
```

# class TemplateLiteralTypeShape extends TypeShape

# class TemplateLiteralTypeSpanShape extends TypeShape

# class TemplateHeadShape extends TypeShape

# class TemplateMiddleShape extends TypeShape

# class TemplateTailShape extends TypeShape
