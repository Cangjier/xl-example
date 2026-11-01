# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { TypeAliasParsed } from "./type-parser-result.xl.md"
import { TypeShape } from "./type-shape.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { ConditionalTypeShape } from "./type-node-shapes.xl.md"
import { TypeParameterShape } from "./type-node-shapes.xl.md"
import { TypeReferenceShape } from "./type-node-shapes.xl.md"
import { KeywordTypeShape } from "./keyword-type-shapes.xl.md"
import { TypeParameterListShape } from "./type-parameter-list-shape.xl.md"
import { TypeConditionalGrow } from "./type-conditional-grow-util.xl.md"
import { TypeParserApi } from "./type-parser-api.xl.md"
```


# namespace cangjie

# class TypeAliasDeclarationShape extends TypeShape

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
if (this.HasBuiltType()) {
  for (const item of this.Data) {
    if (item instanceof ConditionalTypeShape) {
      TypeConditionalGrow.Finalize(item, context);
    }
  }
  for (const item of this.Data) {
    if (!item.Closed) {
      item.TryToClose(context);
    }
  }
  this.Data = this.Data.filter((item) => !item.IsTriviaToken && !item.IsBasicToken);
  const last = this.Last();
  if (last !== null && last.SourceRange.End >= 0) {
    this.SourceRange.End = last.SourceRange.End;
  }
  this.Closed = true;
  TypeAliasDeclarationShape.NormalizeRevisions(this);
  return CloseStates.Nothing;
}
const parsed = TypeParserApi.ParseAlias(this.Data, this.Data.length, this.Template);
const type = parsed.Type!;
TypeAliasDeclarationShape.Apply(this, parsed, type.SourceRange.End);
this.Closed = true;
TypeAliasDeclarationShape.NormalizeRevisions(this);
return CloseStates.Nothing;
```

## static method NormalizeRevisions:(node:Token)=>void

```ts
if (node instanceof ShapeToken) {
  if (node.CreatedRevisionAt >= 0 && node.CreatedAt >= 0 && node.CreatedRevisionAt >= node.CreatedAt) {
    node.CreatedRevisionAt = -1;
  }
}
for (const item of node.Data) {
  TypeAliasDeclarationShape.NormalizeRevisions(item);
}
```

## private method HasBuiltType:()=>bool

```ts
for (const item of this.Data) {
  if (item instanceof TypeShape
      && !(item instanceof TypeParameterShape)
      && !(item instanceof TypeParameterListShape)
      && !(item instanceof TypeReferenceShape)
      && !(item instanceof KeywordTypeShape)) {
    return true;
  }
}
return false;
```

## static method Apply:(alias:TypeAliasDeclarationShape, parsed:TypeAliasParsed, end:int)=>void

```ts
const data:Array<Token> = [];
if (parsed.Name !== null) {
  data.push(parsed.Name);
}
for (const parameter of parsed.TypeParameters) {
  data.push(parameter);
}
if (parsed.Type !== null) {
  data.push(parsed.Type);
}
alias.Data = data;
for (const item of data) {
  item.Parent = alias;
}
alias.SourceRange.End = end;
```
