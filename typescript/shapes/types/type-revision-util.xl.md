# dependencies
```xl
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { TypeShape } from "./type-shape.xl.md"
import { TypeLiteralShape } from "./type-node-shapes.xl.md"
import { MappedTypeShape } from "./type-node-shapes.xl.md"
import { TupleTypeShape } from "./type-node-shapes.xl.md"
import { ParenthesizedTypeShape } from "./type-node-shapes.xl.md"
import { TemplateLiteralTypeShape } from "./type-node-shapes.xl.md"
import { TemplateHeadShape } from "./type-node-shapes.xl.md"
import { TemplateLiteralTypeSpanShape } from "./type-node-shapes.xl.md"
import { TemplateTailShape } from "./type-node-shapes.xl.md"
import { IndexedAccessTypeShape } from "./type-node-shapes.xl.md"
import { ArrayTypeShape } from "./type-node-shapes.xl.md"
import { LiteralTypeShape } from "./type-node-shapes.xl.md"
import { FunctionTypeShape } from "./type-node-shapes.xl.md"
import { TypeReferenceShape } from "./type-node-shapes.xl.md"
import { QualifiedNameShape } from "./type-node-shapes.xl.md"
import { PropertySignatureShape } from "./type-node-shapes.xl.md"
import { MethodSignatureShape } from "./type-node-shapes.xl.md"
import { ParameterShape } from "./type-node-shapes.xl.md"
import { TypePredicateShape } from "./type-node-shapes.xl.md"
import { NamedTupleMemberShape } from "./type-node-shapes.xl.md"
import { OptionalTypeShape } from "./type-node-shapes.xl.md"
import { RestTypeShape } from "./type-node-shapes.xl.md"
import { CallSignatureShape } from "./type-node-shapes.xl.md"
import { ConstructSignatureShape } from "./type-node-shapes.xl.md"
import { IndexSignatureShape } from "./type-node-shapes.xl.md"
import { TypeParameterShape } from "./type-node-shapes.xl.md"
import { UnionTypeShape } from "./type-node-shapes.xl.md"
import { IntersectionTypeShape } from "./type-node-shapes.xl.md"
import { ConstructorTypeShape } from "./type-node-shapes.xl.md"
import { TypeOperatorShape } from "./type-node-shapes.xl.md"
import { TypeQueryShape } from "./type-node-shapes.xl.md"
import { ImportTypeShape } from "./type-node-shapes.xl.md"
```

# namespace cangjie

# class TypeRevisionUtil

## static method SetRevision:(node:ShapeToken, at:int)=>void

```ts
if (at < 0) {
  return;
}
if (node.CreatedAt >= 0 && at >= node.CreatedAt) {
  return;
}
node.CreatedRevisionAt = at;
```

## static method MarkRevision:(node:TypeShape, start:int, end:int)=>void

```ts
if (node.CreatedAt >= 0) {
  return;
}
let at = -1;
if (node instanceof TypeLiteralShape || node instanceof MappedTypeShape) {
  at = start + 1;
} else if (node instanceof TupleTypeShape
    || node instanceof ParenthesizedTypeShape
    || node instanceof TemplateLiteralTypeShape) {
  at = start;
} else if (node instanceof TemplateHeadShape) {
  at = start + 1;
} else if (node instanceof TemplateLiteralTypeSpanShape) {
  at = node.Data.length > 0 ? node.Data[0].SourceRange.End : start;
} else if (node instanceof TemplateTailShape) {
  at = end;
} else if (node instanceof IndexedAccessTypeShape) {
  at = node.Data.length > 0 ? node.Data[0].SourceRange.End : start;
} else if (node instanceof ArrayTypeShape || node instanceof LiteralTypeShape) {
  at = end;
} else if (node instanceof FunctionTypeShape) {
  at = end > 0 ? end - 1 : start;
} else if (node instanceof TypeReferenceShape || node instanceof QualifiedNameShape) {
  at = node.Data.length > 0 ? node.Data[0].SourceRange.End : start;
} else if (node instanceof PropertySignatureShape
    || node instanceof MethodSignatureShape
    || node instanceof ParameterShape
    || node instanceof TypePredicateShape
    || node instanceof NamedTupleMemberShape) {
  let nameEnd = -1;
  for (const item of node.Data) {
    if (item instanceof IdentifierShape) {
      nameEnd = item.SourceRange.End;
      break;
    }
  }
  at = nameEnd >= 0 ? nameEnd : start;
} else if (node instanceof OptionalTypeShape || node instanceof RestTypeShape) {
  at = node.Data.length > 0 ? node.Data[0].SourceRange.End : start;
} else if (node instanceof CallSignatureShape) {
  at = start + 1;
} else if (node instanceof ConstructSignatureShape || node instanceof IndexSignatureShape) {
  at = node.Data.length > 0 ? node.Data[0].SourceRange.End : start;
} else if (node instanceof TypeParameterShape
    || node instanceof UnionTypeShape
    || node instanceof IntersectionTypeShape
    || node instanceof ConstructorTypeShape) {
  at = node.Data.length > 0 ? node.Data[0].SourceRange.End : start;
} else if (node instanceof TypeOperatorShape || node instanceof TypeQueryShape) {
  const operand = node.Data.length > 0 ? node.Data[0] : null;
  const document = node.SourceRange.Document;
  if (operand !== null && document !== null) {
    const keyword = document.GetRaw(start, operand.SourceRange.Start).trimEnd();
    at = start + keyword.length;
  }
} else if (node instanceof ImportTypeShape) {
  at = node.Data.length > 0 ? node.Data[0].SourceRange.Start : start;
}
if (at < 0) {
  return;
}
if (node.CreatedAt >= 0 && at >= node.CreatedAt) {
  return;
}
node.CreatedRevisionAt = at;
```
