# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { ImportClauseEndPossibleShape } from "./import-clause-end-possible-shape.xl.md"
import { NamedImportsPossibleShape } from "./named-imports-possible-shape.xl.md"
import { NamespaceImportPossibleShape } from "./namespace-import-possible-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { NamedImportsShape } from "./named-imports-shape.xl.md"
import { NamespaceImportShape } from "./namespace-import-shape.xl.md"
```

# namespace cangjie

# class ImportClauseShape extends ShapeToken

```txt
import a from "m";
```

## field IsTypeOnly:bool = false

## field PhaseModifier:string = ""

## field Name:IdentifierShape | null = null

## field NamedBindings:NamespaceImportShape | NamedImportsShape | null = null

## constructor:(template:Template)=>void

```ts
super(template);
  this.CatalogGuide = new CatalogGuide([new NamedImportsPossibleShape(), new NamespaceImportPossibleShape()], new ImportClauseEndPossibleShape());
```

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
this.Closed = true;
const kept:Array<Token> = [];
for (const item of this.Data) {
  if (item instanceof IdentifierShape) {
    this.Name = item as IdentifierShape;
    kept.push(item);
  } else if (item instanceof NamedImportsShape) {
    this.NamedBindings = item as NamedImportsShape;
    kept.push(item);
  } else if (item instanceof NamespaceImportShape) {
    this.NamedBindings = item as NamespaceImportShape;
    kept.push(item);
  }
}
this.Data = kept;
for (const item of this.Data) {
  if (item.IsBasicToken) {
    throw new Error("ImportClauseShape.Close: Data 里还有 basic token");
  }
}
return CloseStates.Nothing;
```
