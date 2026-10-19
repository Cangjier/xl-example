# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ExportDeclarationEndPossibleShape } from "./export-declaration-end-possible-shape.xl.md"
import { ImportAttributesPossibleShape } from "./import-attributes-possible-shape.xl.md"
import { NamedExportsPossibleShape } from "./named-exports-possible-shape.xl.md"
import { NamespaceExportPossibleShape } from "./namespace-export-possible-shape.xl.md"
import { StringLiteralPossibleShape } from "../literals/string-literal-possible-shape.xl.md"
import { ImportAttributesShape } from "../members/import-attributes-shape.xl.md"
import { StringLiteralShape } from "../literals/string-literal-shape.xl.md"
import { NamedExportsShape } from "./named-exports-shape.xl.md"
import { NamespaceExportShape } from "./namespace-export-shape.xl.md"
```

# namespace cangjie

# class ExportDeclarationShape extends ShapeToken

```txt
export { a };
export { a as b };
export { a } from "m";
export * from "m";
export * as ns from "m";
export type { T };
```

## field IsTypeOnly:bool = false

## field ExportClause:NamedExportsShape | NamespaceExportShape | null = null

## field ModuleSpecifier:StringLiteralShape | null = null

## field AssertClause:ImportAttributesShape | null = null

## field Attributes:ImportAttributesShape | null = null

## constructor:(template:Template)=>void

```ts
super(template);
this.CatalogGuide = new CatalogGuide(ExportDeclarationShape.CreatePossibleShapes(), new ExportDeclarationEndPossibleShape());
```

## private static field CreatePossibleShapesCache:Array<PossibleShape> | null = null

## static method CreatePossibleShapes:()=>Array<PossibleShape>

```ts
if (ExportDeclarationShape.CreatePossibleShapesCache === null) {
  ExportDeclarationShape.CreatePossibleShapesCache = [
    new NamedExportsPossibleShape(),
    new NamespaceExportPossibleShape(),
    new StringLiteralPossibleShape(),
    new ImportAttributesPossibleShape(),
  ];
}
return ExportDeclarationShape.CreatePossibleShapesCache;
```

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
this.Closed = true;
const kept:Array<Token> = [];
for (const item of this.Data) {
  if (item instanceof NamedExportsShape) {
    this.ExportClause = item as NamedExportsShape;
    kept.push(item);
  } else if (item instanceof NamespaceExportShape) {
    this.ExportClause = item as NamespaceExportShape;
    kept.push(item);
  } else if (item instanceof StringLiteralShape) {
    this.ModuleSpecifier = item as StringLiteralShape;
    kept.push(item);
  } else if (item instanceof ImportAttributesShape) {
    if ((item as ImportAttributesShape).Token === "assert" && this.AssertClause === null) {
      this.AssertClause = item as ImportAttributesShape;
    } else {
      this.Attributes = item as ImportAttributesShape;
    }
    kept.push(item);
  } else if (item instanceof Common && (item as Common).Is("type")) {
    this.IsTypeOnly = true;
  }
}
this.Data = kept;
for (const item of this.Data) {
  if (item.IsBasicToken) {
    throw new Error("ExportDeclarationShape.Close: Data 里还有 basic token");
  }
}
return CloseStates.Nothing;
```
